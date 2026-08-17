export interface HangulTableCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
  widthPx?: number;
  heightPx?: number;
  padding?: {
    topPx: number;
    rightPx: number;
    bottomPx: number;
    leftPx: number;
  };
}

export interface HangulTable {
  rows: string[][];
  cells?: HangulTableCell[][];
  widthPx?: number;
  heightPx?: number;
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
  placedMedia?: HangulMediaPlacement[];
}

export interface HangulMediaPlacement {
  mediaId: string;
  alt?: string;
  widthPx?: number;
  heightPx?: number;
  xPx?: number;
  yPx?: number;
  position: 'flow' | 'page';
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
