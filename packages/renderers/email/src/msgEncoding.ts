export const msgCodepageLabel = (codepage?: number): string | undefined => {
  if (codepage && codepage >= 28591 && codepage <= 28606) return `iso-8859-${codepage - 28590}`;
  if (codepage && codepage >= 1250 && codepage <= 1258) return `windows-${codepage}`;
  return ({
    866: 'ibm866', 10000: 'macintosh', 10007: 'x-mac-cyrillic', 38598: 'iso-8859-8-i',
    50221: 'iso-2022-jp', 50222: 'iso-2022-jp',
    65001: 'utf-8', 1200: 'utf-16le', 1201: 'utf-16be', 20127: 'windows-1252',
    932: 'shift_jis', 936: 'gbk', 949: 'euc-kr', 950: 'big5', 54936: 'gb18030',
    28591: 'windows-1252', 28592: 'iso-8859-2', 28605: 'iso-8859-15',
    20866: 'koi8-r', 21866: 'koi8-u', 874: 'windows-874', 50220: 'iso-2022-jp',
    51932: 'euc-jp', 51949: 'euc-kr',
  } as Record<number, string>)[codepage || 0];
};


/** PR_HTML is PtypBinary, whereas 1013001F (bodyHtml) is already Unicode. */
export function decodeEmailHtmlBytes(value: string | Uint8Array | ArrayBuffer, internetCodepage?: number, messageCodepage?: number): string {
  if (typeof value === 'string') {
    if (value.length > 32 * 1024 * 1024) throw new Error('MSG HTML size limit exceeded.');
    return value.replace(/\0+$/, '');
  }
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
  if (!(bytes instanceof Uint8Array) || bytes.length > 32 * 1024 * 1024) throw new Error('Invalid or oversized MSG HTML body.');
  let label: string | undefined;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) label = 'utf-16le';
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) label = 'utf-16be';
  else if (bytes[0] === 0x3c && bytes[1] === 0 && bytes[3] === 0) label = 'utf-16le';
  else if (bytes[0] === 0 && bytes[1] === 0x3c && bytes[2] === 0) label = 'utf-16be';
  else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) label = 'utf-8';
  const prefix = new TextDecoder('windows-1252').decode(bytes.subarray(0, 4096));
  const declared = /<meta\b[^>]*\bcharset\s*=\s*["']?\s*([a-z0-9._-]+)/i.exec(prefix)?.[1];
  const candidates = [label, msgCodepageLabel(internetCodepage), declared, msgCodepageLabel(messageCodepage)].filter((item): item is string => !!item);
  for (const candidate of candidates) {
    try { return new TextDecoder(candidate).decode(bytes).replace(/\0+$/, ''); } catch { /* Unsupported charset label: try the next source. */ }
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\0+$/, ''); }
  catch { return new TextDecoder('windows-1252').decode(bytes).replace(/\0+$/, ''); }
}
