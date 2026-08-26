import type {
  WordPerfectDocument,
  WordPerfectParagraph,
  WordPerfectRun,
  WordPerfectTable,
} from './parser.js';

interface LibWpdModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _xberg_wpd_is_supported(data: number, length: number): number;
  _xberg_wpd_extract_document(data: number, length: number, output: number, outputLength: number, error: number): number;
  _xberg_wpd_free_string(pointer: number): void;
}

type LibWpdModuleFactory = (options: { locateFile: (path: string) => string; wasmBinary?: Uint8Array }) => Promise<LibWpdModule>;

const MAX_WIRE_EVENTS = 1_000_000;
const MAX_WIRE_STRING_BYTES = 128 * 1024 * 1024;

class WireReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get remaining() { return this.bytes.length - this.offset; }

  u8() {
    if (this.remaining < 1) throw new Error('Truncated libwpd event stream.');
    return this.bytes[this.offset++];
  }

  bool() {
    const value = this.u8();
    if (value !== 0 && value !== 1) throw new Error('Invalid boolean in libwpd event stream.');
    return value === 1;
  }

  u32() {
    if (this.remaining < 4) throw new Error('Truncated libwpd event stream.');
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4).getUint32(0, true);
    this.offset += 4;
    return value;
  }

  i32() {
    const value = this.u32();
    return value > 0x7fffffff ? value - 0x1_0000_0000 : value;
  }

  string() {
    const length = this.u32();
    if (length > MAX_WIRE_STRING_BYTES || length > this.remaining) throw new Error('Invalid string length in libwpd event stream.');
    const start = this.offset;
    this.offset += length;
    return new TextDecoder().decode(this.bytes.subarray(start, start + length));
  }
}

const readCString = (heap: Uint8Array, pointer: number) => {
  if (!pointer) return '';
  let end = pointer;
  while (end < heap.length && heap[end] !== 0 && end - pointer < 16_384) end += 1;
  return new TextDecoder().decode(heap.subarray(pointer, end));
};

const generationFromHeader = (bytes: Uint8Array): WordPerfectDocument['generation'] => {
  if (bytes[0] !== 0xff || bytes[1] !== 0x57 || bytes[2] !== 0x50 || bytes[3] !== 0x43) return 'unknown';
  return (bytes[10] || 0) >= 2 ? 'wp6' : 'wp5';
};

const decodeStructuredDocument = (wire: Uint8Array, source: Uint8Array): WordPerfectDocument => {
  const reader = new WireReader(wire);
  if (reader.u8() !== 1) throw new Error('Unsupported libwpd event-stream version.');
  const metadataCount = reader.u32();
  if (metadataCount > MAX_WIRE_EVENTS) throw new Error('libwpd metadata count exceeds the safety limit.');
  const metadata: Record<string, string> = {};
  for (let index = 0; index < metadataCount; index += 1) metadata[reader.string()] = reader.string();
  const eventCount = reader.u32();
  if (eventCount > MAX_WIRE_EVENTS) throw new Error('libwpd event count exceeds the safety limit.');

  const paragraphs: WordPerfectParagraph[] = [];
  const headers: WordPerfectParagraph[] = [];
  const footers: WordPerfectParagraph[] = [];
  const notes: WordPerfectParagraph[] = [];
  const tables: WordPerfectTable[] = [];
  let destination = paragraphs;
  let paragraph: WordPerfectParagraph = { kind: 'paragraph', runs: [] };
  let styles = new Set<WordPerfectRun['styles'][number]>();
  let activeLink: string | undefined;
  let list: WordPerfectParagraph['list'];
  let currentTable: WordPerfectTable | undefined;
  let currentRow: WordPerfectTable['rows'][number] | undefined;
  let currentCell: WordPerfectTable['rows'][number][number] | undefined;

  const addText = (value: string) => {
    if (!value) return;
    if (currentCell) {
      currentCell.text += value;
      return;
    }
    const run: WordPerfectRun = { text: value, styles: [...styles] };
    if (activeLink && /^(?:https?:|mailto:)/i.test(activeLink)) run.href = activeLink;
    paragraph.runs.push(run);
  };
  const flushParagraph = () => {
    const value = paragraph.runs.map(run => run.text).join('').trim();
    if (value) destination.push({ ...paragraph, list, runs: paragraph.runs });
    paragraph = { kind: 'paragraph', runs: [] };
    list = undefined;
  };
  const style = (name: WordPerfectRun['styles'][number], enabled: boolean) => {
    styles = new Set(styles);
    if (enabled) styles.add(name);
    else styles.delete(name);
  };

  for (let index = 0; index < eventCount; index += 1) {
    const tag = reader.u8();
    switch (tag) {
      case 0: addText(reader.string()); break;
      case 1: addText('\t'); break;
      case 2: addText(' '); break;
      case 3: addText('\n'); break;
      case 4: flushParagraph(); break;
      case 5: list = { ordered: reader.bool(), level: reader.u8(), counter: reader.u32() }; break;
      case 6: flushParagraph(); break;
      case 7: paragraph.kind = 'heading'; paragraph.level = reader.u8(); break;
      case 8: style('bold', true); break;
      case 9: style('bold', false); break;
      case 10: style('italic', true); break;
      case 11: style('italic', false); break;
      case 12: style('underline', true); break;
      case 13: style('underline', false); break;
      case 14: style('strikethrough', true); break;
      case 15: style('strikethrough', false); break;
      case 16: style('superscript', true); break;
      case 17: style('superscript', false); break;
      case 18: style('subscript', true); break;
      case 19: style('subscript', false); break;
      case 20: currentTable = { rows: [] }; tables.push(currentTable); break;
      case 21:
        currentRow = [];
        currentTable?.rows.push(currentRow);
        reader.bool();
        break;
      case 22:
        currentCell = { text: '', column: reader.i32(), colSpan: reader.u32(), rowSpan: reader.u32() };
        currentRow?.push(currentCell);
        break;
      case 23:
        currentRow?.push({ text: '', column: reader.i32(), colSpan: 1, rowSpan: 1, covered: true });
        break;
      case 24: currentCell = undefined; break;
      case 25: currentRow = undefined; break;
      case 26: currentTable = undefined; break;
      case 27: flushParagraph(); destination = headers; break;
      case 28: flushParagraph(); destination = paragraphs; break;
      case 29: flushParagraph(); destination = footers; break;
      case 30: flushParagraph(); destination = paragraphs; break;
      case 31: flushParagraph(); destination = notes; reader.bool(); break;
      case 32: flushParagraph(); destination = paragraphs; break;
      case 33: flushParagraph(); destination = notes; reader.string(); break;
      case 34: flushParagraph(); destination = paragraphs; break;
      case 35: activeLink = reader.string(); break;
      case 36: activeLink = undefined; break;
      case 37: addText(`[${reader.string()}]`); break;
      default: throw new Error(`Unknown libwpd event tag ${tag}.`);
    }
  }
  flushParagraph();
  if (reader.remaining !== 0) throw new Error('Unexpected trailing bytes in libwpd event stream.');
  return {
    format: 'wordperfect',
    generation: generationFromHeader(source),
    documentOffset: source.length >= 8 ? new DataView(source.buffer, source.byteOffset + 4, 4).getUint32(0, true) : 0,
    encrypted: false,
    engine: 'libwpd-wasm',
    paragraphs: paragraphs.map(item => item.runs.map(run => run.text).join('')),
    structuredParagraphs: paragraphs,
    tables,
    headers,
    footers,
    notes,
    metadata,
    warnings: [],
  };
};

export const parseWordPerfectWithLibWpd = async (
  buffer: ArrayBuffer,
  moduleUrl: string,
  wasmUrl: string,
  wasmBinary?: Uint8Array
): Promise<WordPerfectDocument> => {
  const imported = await import(/* @vite-ignore */ moduleUrl) as { default: LibWpdModuleFactory };
  let resolvedBinary = wasmBinary;
  if (!resolvedBinary) {
    const response = await fetch(wasmUrl, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`libwpd WebAssembly returned HTTP ${response.status}.`);
    resolvedBinary = new Uint8Array(await response.arrayBuffer());
  }
  const module = await imported.default({ locateFile: path => path.endsWith('.wasm') ? wasmUrl : path, wasmBinary: resolvedBinary });
  const bytes = new Uint8Array(buffer);
  const input = module._malloc(bytes.length);
  const output = module._malloc(4);
  const outputLength = module._malloc(4);
  const error = module._malloc(4);
  module.HEAPU8.set(bytes, input);
  module.HEAPU32[output >>> 2] = 0;
  module.HEAPU32[outputLength >>> 2] = 0;
  module.HEAPU32[error >>> 2] = 0;
  let extracted = 0;
  let errorPointer = 0;
  try {
    if (!module._xberg_wpd_is_supported(input, bytes.length)) throw new Error('libwpd does not recognize this WordPerfect document.');
    const result = module._xberg_wpd_extract_document(input, bytes.length, output, outputLength, error);
    extracted = module.HEAPU32[output >>> 2];
    const length = module.HEAPU32[outputLength >>> 2];
    errorPointer = module.HEAPU32[error >>> 2];
    if (result === 6) throw new Error('Encrypted WordPerfect documents are detected but cannot be decrypted.');
    if (result !== 0 || !extracted || !length) {
      const detail = readCString(module.HEAPU8, errorPointer);
      throw new Error(`libwpd could not parse the document${detail ? `: ${detail}` : ''}.`);
    }
    return decodeStructuredDocument(module.HEAPU8.slice(extracted, extracted + length), bytes);
  } finally {
    if (extracted) module._xberg_wpd_free_string(extracted);
    if (errorPointer) module._xberg_wpd_free_string(errorPointer);
    module._free(input);
    module._free(output);
    module._free(outputLength);
    module._free(error);
  }
};
