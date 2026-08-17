export interface WordPerfectDocument {
  format: 'wordperfect';
  generation: 'wp5' | 'wp6' | 'unknown';
  documentOffset: number;
  encrypted: boolean;
  engine: 'libwpd-wasm' | 'bounded-fallback';
  paragraphs: string[];
  structuredParagraphs: WordPerfectParagraph[];
  tables: WordPerfectTable[];
  headers: WordPerfectParagraph[];
  footers: WordPerfectParagraph[];
  notes: WordPerfectParagraph[];
  metadata: Record<string, string>;
  warnings: string[];
}

export interface WordPerfectRun {
  text: string;
  styles: Array<'bold' | 'italic' | 'underline' | 'strikethrough' | 'superscript' | 'subscript'>;
  href?: string;
}

export interface WordPerfectParagraph {
  kind: 'paragraph' | 'heading';
  level?: number;
  list?: { ordered: boolean; level: number; counter: number };
  runs: WordPerfectRun[];
}

export interface WordPerfectTableCell {
  text: string;
  column: number;
  colSpan: number;
  rowSpan: number;
  covered?: boolean;
}

export interface WordPerfectTable {
  rows: WordPerfectTableCell[][];
}

const SIGNATURE = [0xff, 0x57, 0x50, 0x43] as const;
const MAX_INPUT_BYTES = 128 * 1024 * 1024;
const MAX_PARAGRAPHS = 100_000;

export const isWordPerfectDocument = (bytes: Uint8Array) => SIGNATURE.every((value, index) => bytes[index] === value);

const readDocumentOffset = (bytes: Uint8Array) => {
  if (bytes.length < 8) return 0;
  const value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
  return value >= 16 && value < bytes.length ? value : Math.min(16, bytes.length);
};

const decodeWordPerfectText = (bytes: Uint8Array) => {
  const output: string[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    const value = bytes[index];
    if (value === 0x0a || value === 0x0d) {
      output.push('\n');
      continue;
    }
    if (value === 0x09) {
      output.push('\t');
      continue;
    }
    if (value >= 0x20 && value <= 0x7e) {
      output.push(String.fromCharCode(value));
      continue;
    }
    if (value >= 0x80 && value <= 0xcf) {
      output.push(new TextDecoder('windows-1252').decode(Uint8Array.of(value)));
      continue;
    }
    // 0xd0-0xff are WordPerfect function/group markers. Do not expose their
    // binary payload as text in the bounded fallback.
    if (value >= 0xd0) output.push(' ');
  }
  return output.join('').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
};

export const parseWordPerfectDocument = (buffer: ArrayBuffer): WordPerfectDocument => {
  if (buffer.byteLength > MAX_INPUT_BYTES) throw new Error('WordPerfect file exceeds the 128 MiB safety limit.');
  const bytes = new Uint8Array(buffer);
  if (!isWordPerfectDocument(bytes)) throw new Error('The extension does not match a WordPerfect WPC signature.');
  const documentOffset = readDocumentOffset(bytes);
  const major = bytes[10] || 0;
  const encrypted = bytes[12] !== 0;
  if (encrypted) throw new Error('Encrypted WordPerfect documents are detected but cannot be decrypted.');
  const generation = major >= 6 ? 'wp6' : major > 0 ? 'wp5' : 'unknown';
  const decoded = decodeWordPerfectText(bytes.slice(documentOffset));
  const paragraphs = decoded.split(/\n+/).map(value => value.trim()).filter(Boolean).slice(0, MAX_PARAGRAPHS);
  if (!paragraphs.length) throw new Error('No readable text was produced by the bounded WordPerfect fallback.');
  return {
    format: 'wordperfect',
    generation,
    documentOffset,
    encrypted,
    engine: 'bounded-fallback',
    paragraphs,
    structuredParagraphs: paragraphs.map(value => ({ kind: 'paragraph', runs: [{ text: value, styles: [] }] })),
    tables: [],
    headers: [],
    footers: [],
    notes: [],
    metadata: {},
    warnings: ['Limited text preview: the optional libwpd/librevenge WebAssembly parser is not active.'],
  };
};
