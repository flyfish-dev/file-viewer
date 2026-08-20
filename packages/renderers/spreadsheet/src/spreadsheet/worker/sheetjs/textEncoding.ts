import {
  decodeFileViewerTextBuffer,
  isValidFileViewerUtf8,
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

export const prepareSpreadsheetReadInput = (
  data: ArrayBuffer,
  source: SpreadsheetTextSource = {}
): PreparedSpreadsheetReadInput => {
  if (!isTextSpreadsheetSource(source)) {
    return { kind: 'binary', data };
  }

  const decoded = decodeSpreadsheetText(data, source.textEncoding);
  return {
    kind: 'text',
    data: decoded.text,
    encoding: decoded.encoding,
  };
};
