import {
  decodeFileViewerTextBuffer,
  isValidFileViewerUtf8,
  resolveFileViewerTextEncoding,
  type ResolvedFileViewerTextEncoding,
} from '@file-viewer/core';

export type SpreadsheetTextEncoding = 'auto' | 'utf-8' | 'gbk' | 'gb18030';

export interface SpreadsheetTextSource {
  fileType?: string;
  filename?: string;
  textEncoding?: SpreadsheetTextEncoding;
}

export interface DecodedSpreadsheetText {
  text: string;
  encoding: ResolvedFileViewerTextEncoding;
}

export type PreparedSpreadsheetReadInput =
  | {
      kind: 'binary';
      data: ArrayBuffer;
    }
  | {
      kind: 'text';
      data: string;
      encoding: DecodedSpreadsheetText['encoding'];
    };

const TEXT_SPREADSHEET_EXTENSIONS = new Set(['csv', 'tsv']);
const TEXT_SPREADSHEET_MIME_TYPES = new Set([
  'text/csv',
  'text/tab-separated-values',
]);

const normalizeFileType = (value?: string) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
    .split(/[?#;]/, 1)[0];
};

const getFilenameExtension = (filename?: string) => {
  const clean = String(filename || '').trim().toLowerCase().split(/[?#]/, 1)[0];
  const slash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
  const dot = clean.lastIndexOf('.');
  return dot > slash ? clean.slice(dot + 1) : '';
};

export const isTextSpreadsheetSource = ({
  fileType,
  filename,
}: Pick<SpreadsheetTextSource, 'fileType' | 'filename'>) => {
  const normalizedType = normalizeFileType(fileType);
  if (normalizedType) {
    return TEXT_SPREADSHEET_EXTENSIONS.has(normalizedType) ||
      TEXT_SPREADSHEET_MIME_TYPES.has(normalizedType);
  }
  return TEXT_SPREADSHEET_EXTENSIONS.has(getFilenameExtension(filename));
};

export const isValidUtf8 = isValidFileViewerUtf8;

export const decodeSpreadsheetText = (
  data: ArrayBuffer,
  encoding: SpreadsheetTextEncoding = 'auto'
): DecodedSpreadsheetText => decodeFileViewerTextBuffer(data, encoding);

const LEGACY_SPREADSHEET_TYPES = new Set([
  'xls', 'xlt', 'xla', 'application/vnd.ms-excel',
]);
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const TEXT_PROBE_BYTES = 65536;

/**
 * Legacy Excel exports can contain delimited text or HTML rather than BIFF.
 * Passing those bytes directly to the workbook reader selects its single-byte
 * fallback and corrupts UTF-8/GBK values. Sniff only legacy spreadsheet inputs;
 * preserve real binary signatures and let the shared decoder select encoding.
 */
const isTextBackedLegacySpreadsheet = (
  data: ArrayBuffer,
  source: SpreadsheetTextSource
): boolean => {
  const type = normalizeFileType(source.fileType) || getFilenameExtension(source.filename);
  if (!LEGACY_SPREADSHEET_TYPES.has(type) || !data.byteLength) return false;
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, TEXT_PROBE_BYTES));
  if (OLE_SIGNATURE.every((byte, index) => bytes[index] === byte)) return false;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return false;
  // Raw BIFF2/3/4/5/8 BOF records need not be wrapped in an OLE container.
  if (bytes[0] === 0x09 && [0x00, 0x02, 0x04, 0x08].includes(bytes[1])) return false;
  const encoding = resolveFileViewerTextEncoding(bytes).encoding;
  if (encoding.startsWith('utf-16') && data.byteLength % 2 !== 0) return false;
  try {
    const text = decodeSpreadsheetText(data.slice(0, bytes.length), source.textEncoding).text;
    if (/^[\s\uFEFF]*(?:%PDF-|%!PS|\{\\rtf)/i.test(text)) return false;
    if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text)) return false;
    const replacements = (text.match(/\uFFFD/g) || []).length;
    return replacements <= Math.max(1, text.length * 0.01);
  } catch {
    return false;
  }
};

export const prepareSpreadsheetReadInput = (
  data: ArrayBuffer,
  source: SpreadsheetTextSource = {}
): PreparedSpreadsheetReadInput => {
  if (!isTextSpreadsheetSource(source) && !isTextBackedLegacySpreadsheet(data, source)) {
    return { kind: 'binary', data };
  }

  const decoded = decodeSpreadsheetText(data, source.textEncoding);
  return {
    kind: 'text',
    data: decoded.text,
    encoding: decoded.encoding,
  };
};
