import { msgCodepageLabel } from './msgEncoding.js';

/** MS-OXRTFCP decompression and MS-OXRTFEX body extraction.
 * Rich RTF layout is delegated to the installed RTF renderer; this tokenizer
 * provides readable text and extracts HTML encapsulated by Outlook.
 */
export const MAX_MSG_RTF_BYTES = 32 * 1024 * 1024;
const SEED = '{\\rtf1\\ansi\\mac\\deff0\\deftab720{\\fonttbl;}{\\f0\\fnil \\froman \\fswiss \\fmodern \\fscript \\fdecor MS Sans SerifSymbolArialTimes New RomanCourier{\\colortbl\\red0\\green0\\blue0\r\n\\par \\pard\\plain\\f0\\fs20\\b\\i\\u\\tab\\tx';

export function rtfCrc32(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return crc >>> 0;
}

export function decompressMsgRtf(input: Uint8Array): Uint8Array {
  const fail = (reason: string): never => { throw new Error(`Invalid Outlook RTF: ${reason}`); };
  if (input.byteLength < 16 || input.byteLength > MAX_MSG_RTF_BYTES + 16) fail('compressed size limit');
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const compressedSize = view.getUint32(0, true);
  const rawSize = view.getUint32(4, true);
  const magic = view.getUint32(8, true);
  if (compressedSize + 4 !== input.length || rawSize > MAX_MSG_RTF_BYTES) fail('size mismatch or expansion limit');
  const payload = input.subarray(16);
  if (magic === 0x414c454d) {
    if (payload.length !== rawSize) fail('truncated uncompressed body');
    return payload.slice();
  }
  if (magic !== 0x75465a4c) fail('unknown compression type');
  if (rtfCrc32(payload) !== view.getUint32(12, true)) fail('CRC mismatch');
  const dictionary = new Uint8Array(4096);
  const initialized = new Uint8Array(4096);
  dictionary.set(new TextEncoder().encode(SEED));
  initialized.fill(1, 0, SEED.length);
  const output = new Uint8Array(rawSize);
  let write = SEED.length;
  let position = 0;
  let cursor = 0;
  let terminated = false;
  const put = (value: number) => {
    if (position >= rawSize) fail('decompressed size mismatch');
    output[position++] = value;
    dictionary[write] = value;
    initialized[write] = 1;
    write = (write + 1) & 4095;
  };
  while (cursor < payload.length && !terminated) {
    const flags = payload[cursor++];
    for (let bit = 0; bit < 8 && !terminated; bit++) {
      if (flags & (1 << bit)) {
        if (cursor + 2 > payload.length) fail('truncated reference');
        const first = payload[cursor++];
        const second = payload[cursor++];
        let reference = (first << 4) | (second >>> 4);
        if (reference === write) { terminated = true; break; }
        const length = (second & 15) + 2;
        for (let index = 0; index < length; index++) {
          if (!initialized[reference]) fail('uninitialized dictionary reference');
          put(dictionary[reference]);
          reference = (reference + 1) & 4095;
        }
      } else {
        if (cursor >= payload.length) fail('truncated literal');
        put(payload[cursor++]);
      }
    }
  }
  if (!terminated || position !== rawSize) fail('missing terminator or incomplete body');
  return output;
}


const SKIPPED = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'objdata',
  'header', 'headerl', 'headerr', 'footer', 'footerl', 'footerr', 'filetbl',
  'listtable', 'listoverridetable', 'listtext', 'pntext', 'fldinst',
  'datastore', 'themedata', 'colorschememapping', 'xmlnstbl', 'generator',
]);
interface GroupState {
  skip: boolean;
  htmlTag: boolean;
  htmlRtf: boolean;
  uc: number;
  encoding: string;
  starred: boolean;
}

export function extractMsgRtf(bytes: Uint8Array, codepage?: number): { text: string; html?: string } {
  if (bytes.length > MAX_MSG_RTF_BYTES) throw new Error('Outlook RTF exceeds the body limit.');
  // Latin-1 byte identity, NOT TextDecoder("latin1") (which maps to Windows-1252).
  let source = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) source += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  if (!/^\{\\rtf[1-9]/.test(source)) throw new Error('Invalid Outlook RTF document.');
  let state: GroupState = { skip: false, htmlTag: false, htmlRtf: false, uc: 1, encoding: msgCodepageLabel(codepage) || 'windows-1252', starred: false };
  const stack: GroupState[] = [];
  const text: string[] = [];
  const html: string[] = [];
  const pending: number[] = [];
  let fallback = 0;
  let fromHtml = false;
  const emit = (value: string) => {
    if (state.skip) return;
    if (!state.htmlTag) text.push(value);
    if (!state.htmlRtf) html.push(value);
  };
  const flush = () => {
    if (!pending.length) return;
    emit(new TextDecoder(state.encoding).decode(new Uint8Array(pending)));
    pending.length = 0;
  };
  const byte = (value: number) => {
    if (fallback > 0) { fallback--; return; }
    pending.push(value);

  };
  let rootClosed = false;
  for (let cursor = 0; cursor < source.length;) {
    const char = source[cursor++];
    if (rootClosed) {
      if (!/[\s\0]/.test(char)) throw new Error('Unexpected content after Outlook RTF document.');
      continue;
    }
    if (char === '{') {
      flush();
      if (stack.length >= 128) throw new Error('Outlook RTF nesting limit exceeded.');
      stack.push({ ...state });
      state = { ...state, starred: false };
      fallback = 0;
      continue;
    }
    if (char === '}') {
      flush();
      if (!stack.length) throw new Error('Unbalanced Outlook RTF document.');
      state = stack.pop()!;
      fallback = 0;
      rootClosed = stack.length === 0;
      continue;
    }
    if (char === '\r' || char === '\n') continue;
    if (char !== '\\') { byte(char.charCodeAt(0)); continue; }
    const control = source[cursor++];
    if (control === '\\' || control === '{' || control === '}') { byte(control.charCodeAt(0)); continue; }
    if (control === "'") {
      const hex = source.slice(cursor, cursor + 2);
      if (!/^[0-9a-f]{2}$/i.test(hex)) throw new Error('Invalid Outlook RTF hex escape.');
      byte(Number.parseInt(hex, 16)); cursor += 2; continue;
    }
    flush();
    if (control === '*') { state.starred = true; continue; }
    if (control === '~' || control === '_' || control === '-') {
      if (fallback) fallback--; else emit(control === '~' ? '\u00a0' : control === '_' ? '\u2011' : '\u00ad');
      continue;
    }
    if (!control || !/[a-z]/i.test(control)) continue;
    let word = control;
    while (cursor < source.length && /[a-z]/i.test(source[cursor])) word += source[cursor++];
    const start = cursor;
    if (source[cursor] === '-') cursor++;
    while (cursor < source.length && /[0-9]/.test(source[cursor])) cursor++;
    const raw = source.slice(start, cursor);
    const value = raw && raw !== '-' ? Number(raw) : undefined;
    if (source[cursor] === ' ') cursor++;
    if (state.starred) {
      if (word !== 'htmltag' && word !== 'mhtmltag') state.skip = true;
      state.starred = false;
    }
    if (SKIPPED.has(word)) state.skip = true;
    if (word === 'htmltag' || word === 'mhtmltag') state.htmlTag = true;
    if (word === 'htmlrtf') state.htmlRtf = value !== 0;
    if (word === 'fromhtml' && value === 1) fromHtml = true;
    if (word === 'ansicpg' && value !== undefined) {
      state.encoding = msgCodepageLabel(value) || state.encoding;
    }
    if (word === 'uc' && value !== undefined) state.uc = Math.max(0, Math.min(16, value));
    if (word === 'u' && value !== undefined) {
      emit(String.fromCharCode(value & 0xffff));
      fallback = state.uc;
    }
    if (word === 'bin') {
      if (value === undefined || !Number.isSafeInteger(value) || value < 0 || cursor + value > source.length) throw new Error('Invalid Outlook RTF binary block.');
      cursor += value;
    }
    const special = ({ par: '\n', line: '\n', tab: '\t', cell: '\t', row: '\n', emdash: '\u2014', endash: '\u2013', bullet: '\u2022', lquote: '\u2018', rquote: '\u2019', ldblquote: '\u201c', rdblquote: '\u201d' } as Record<string, string>)[word];
    if (special) {
      if (fallback) fallback--; else emit(special);
    }
  }
  flush();
  if (stack.length || !rootClosed) throw new Error('Truncated Outlook RTF document.');
  return { text: text.join('').trim(), html: fromHtml ? html.join('').trim() : undefined };
}
