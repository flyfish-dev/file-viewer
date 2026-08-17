export interface HangulTableCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
}

export interface HangulTable {
  rows: string[][];
  cells?: HangulTableCell[][];
}

export interface HangulPageGeometry {
  widthPx: number;
  heightPx: number;
  margins?: {
    topPx: number;
    rightPx: number;
    bottomPx: number;
    leftPx: number;
  };
}

export interface HangulSection {
  id: string;
  paragraphs: string[];
  tables: HangulTable[];
  html?: string;
  headers?: string[];
  footers?: string[];
  notes?: string[];
  page?: HangulPageGeometry;
}

export interface HangulMedia {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface HangulDocument {
  format: 'hwp' | 'hwpx';
  version?: string;
  sections: HangulSection[];
  media: HangulMedia[];
  warnings: string[];
}

export interface HangulParseLimits {
  maxUncompressedBytes: number;
  maxCompressionRatio: number;
  maxEntries: number;
  maxRecords: number;
}
