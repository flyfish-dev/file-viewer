export type IworkKind = 'pages' | 'numbers' | 'keynote';
export type IworkGeneration = 'iwork-09' | 'iwork-2013-plus';

export interface IworkTextBlock {
  id: string;
  text: string;
  zIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  letterSpacing?: number;
  lineHeight?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  paragraphs?: IworkTextParagraph[];
}

export interface IworkTextRun {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface IworkTextParagraph {
  runs: IworkTextRun[];
  bullet?: boolean;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  spaceBefore?: number;
  spaceAfter?: number;
}

export interface IworkTable {
  id: string;
  zIndex?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rows: string[][];
  columnWidths?: number[];
  rowHeights?: number[];
  merges?: Array<{ row: number; col: number; rowspan: number; colspan: number }>;
  headerRows?: number;
  headerColumns?: number;
  fontSize?: number;
  fontFamily?: string;
  headerRowBackground?: string;
  headerColumnBackground?: string;
  borderColor?: string;
}

export interface IworkChartSeries {
  name: string;
  values: number[];
}

export interface IworkChartData {
  type: 'bar' | 'line';
  categories: string[];
  series: IworkChartSeries[];
}

export interface IworkVisualObject {
  id: string;
  kind: 'shape' | 'image' | 'chart' | 'table' | 'media';
  zIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  text?: string;
  mimeType?: string;
  bytes?: Uint8Array;
  chart?: IworkChartData;
}

export interface IworkScene {
  id: string;
  name: string;
  width: number;
  height: number;
  blocks: IworkTextBlock[];
  tables: IworkTable[];
  objects: IworkVisualObject[];
  notes: string[];
}

export interface IworkEmbeddedPreview {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface IworkDocument {
  kind: IworkKind;
  generation: IworkGeneration;
  title: string;
  scenes: IworkScene[];
  preview?: IworkEmbeddedPreview;
  diagnostics: string[];
  limits: string[];
  objectCount: number;
  limitedPreview: boolean;
}

export interface IworkParseLimits {
  maxUncompressedBytes: number;
  maxCompressionRatio: number;
  maxObjects: number;
  maxImagePixels: number;
  maxNestingDepth: number;
}
