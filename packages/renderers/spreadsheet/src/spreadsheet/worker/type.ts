export interface SheetRichTextRun {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  verticalAlign?: 'sub' | 'super';
}

export interface SheetCellMetadata {
  className?: string;
  style: Record<string, string>;
  richText?: SheetRichTextRun[];
}

export interface CellMerge {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}

export interface SheetRowAnchor {
  mode: 'absolute' | 'oneCell' | 'twoCell' | 'cell';
  fromRow: number;
  fromOffset: number;
  toRow?: number;
  toOffset?: number;
}

export interface SheetImage {
  rowAnchor?: SheetRowAnchor;
  id: string;
  src: string;
  contentType?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

export interface SheetCellImage {
  id: string;
  src: string;
  contentType?: string;
  row: number;
  col: number;
}

export type SheetChartType = 'bar' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'radar';

export interface SheetDrawingMarker {
  row: number;
  col: number;
  rowOff: number;
  colOff: number;
}

export interface SheetChartSeries {
  name: string;
  categories: string[];
  /** Non-finite entries are gaps; structured clone preserves their positions. */
  values: number[];
  /** Transferred-array blank positions to span, excluding numeric errors. */
  spanBlankIndexes?: number[];
  sourcePointCount?: number;
  sourcePointIndexes?: number[];
  color?: string;
  lineWidth?: number;
  lineDash?: string;
  lineVisible?: boolean;
  marker?: {
    symbol: string;
    size?: number;
  };
}

/** Source truth captured before renderer compatibility fallbacks. */
export interface SheetSourceAnchor {
  status: 'valid' | 'unknown';
  reason?: string;
  /** Source text exceeded the transport field budget; original workbook data is unchanged. */
  truncatedFields?: string[];
  type?: string;
  editAs?: string;
  fromPresent?: boolean;
  toPresent?: boolean;
  from?: SheetDrawingMarker;
  to?: SheetDrawingMarker;
  fromRaw?: Record<'row' | 'col' | 'rowOff' | 'colOff', string | null>;
  toRaw?: Record<'row' | 'col' | 'rowOff' | 'colOff', string | null>;
}
export interface SheetChartDefinition {
  sourceAnchor?: SheetSourceAnchor;
  rowAnchor?: SheetRowAnchor;
  id: string;
  type: SheetChartType;
  title?: string;
  categoryAxisTitle?: string;
  /** Unscaled CSS pixels from DrawingML hundredth-point text properties. */
  categoryAxisFontSize?: number;
  valueAxisFontSize?: number;
  valueAxisTitle?: string;
  barDirection?: 'column' | 'bar';
  grouping?: string;
  scatterStyle?: string;
  legendPosition?: 'top' | 'right' | 'bottom' | 'left';
  series: SheetChartSeries[];
  from: SheetDrawingMarker;
  to?: SheetDrawingMarker;
  ext?: {
    width: number;
    height: number;
  };
}

export interface SheetChart extends Omit<SheetChartDefinition, 'from' | 'to' | 'ext'> {
  left: number;
  top: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

export interface SheetRowSizing {
  fixedRows: number[];
  autoHeightDisabled?: boolean;
}

export interface SheetStructure {
  rowSizing?: SheetRowSizing;
  merge?: CellMerge[];
  colWidths?: number | number[];
  rowHeights?: number | number[];
  columns?: SheetColumn[];
  images?: SheetImage[];
  charts?: SheetChart[];
}

export interface SheetColumn {
  key: number;
  title: string;
  hidden?: boolean;
  editor: false;
  className: string;
  renderer: 'styleRender';
}

export interface SheetCommentMessage {
  id: string;
  parentId: string | null;
  author: string;
  text: string;
  createdAt: string | null;
}

export interface SheetCommentLocation {
  address: string;
  row: number;
  col: number;
}

export type SheetComment = SheetCommentLocation & (
  | { kind: 'note'; resolved: false; messages: SheetCommentMessage[] }
  | { kind: 'thread'; resolved: boolean; messages: SheetCommentMessage[] }
);

export interface SheetSourcePoint { row: number; col: number; }
export interface SheetSourceExtent { rows: number; cols: number; }
export interface SheetRegion {
  id: number;
  startRow: number;
  startCol: number;
  rowCount: number;
  colCount: number;
}

export interface SheetOccupiedRegion {
  region: SheetRegion;
  firstCell: SheetSourcePoint;
  cellCount: number;
}
export type SheetDiscoveryCoverage = 'complete' | 'partial' | 'unsupported';
export interface SheetSourceObjectEntry {
  kind: 'merge' | 'image' | 'chart' | 'cellImage';
  sourceIndex: number;
  id?: string;
  coordinateSpace: 'cell' | 'absolute' | 'unknown';
  sourceAnchor?: SheetSourceAnchor;
  from?: SheetSourcePoint;
  to?: SheetSourcePoint;
  anchorType?: string;
  editAs?: string;
}
/** Bounded audit of raw DrawingML image-reference evidence, not all image payloads.
 * Counts cover observed blip references, including unsupported/ambiguous ones.
 * countsComplete=false means these are lower bounds, never total source counts.
 * On scan/match abort, unrepresented stays zero (a conservative lower bound),
 * not an assertion that no references were omitted. Prefix uniqueness is not certified.
 * represented means uniquely paired to a vendor record, not renderable/loaded.
 * No object, canonical coordinate or raw XML is synthesized by this summary. */
export interface SheetImageSourceSummary {
  scope: 'raw-drawing-image-references';
  status: 'absent' | 'complete' | 'partial';
  observedReferences: number;
  representedReferences: number;
  unrepresentedReferences: number;
  countsComplete: boolean;
  /** At most eight fixed codes, never source text. */
  reasons: string[];
  reasonsTruncated: boolean;
}
export interface SheetSourceDiscovery {
  scope: 'parsed-cells-and-source-object-anchors';
  status: 'complete' | 'partial';
  /** Exact cells and known anchor endpoints, not an object's estimated pixel footprint. */
  extentSemantics: 'source-cells-and-anchor-endpoints';
  coverage: Record<'values' | 'styles' | 'merges' | 'images' | 'charts' | 'cellImages' | 'axisStyles' | 'tableStyles' | 'conditionalFormats' | 'otherDrawings', SheetDiscoveryCoverage>;
  imageSource?: SheetImageSourceSummary;
  cellRegions: SheetOccupiedRegion[];
  objects: SheetSourceObjectEntry[];
  visitedCells: number;
  visitedMetadata: number;
  limits: { tiles: number; visitedCells: number; objects: number; metadata: number; diagnostics: number };
  diagnostics: Array<{ code: string; row?: number; col?: number; kind?: string }>;
  diagnosticsTruncated: boolean;
}
export interface SheetDefinition {
  materialization?: { scope: 'default-renderer'; kind: 'ordinary' | 'region-required'; reasons: string[]; windowCells: number; limits: { rows: number; cols: number; windowCells: number } };
  occupiedIndex?: { coverage?: 'value-formula-link-rich-text-cells-only'; status: 'complete' | 'budget-exceeded'; visitedCells: number; indexedTiles: number; limits: { tiles: number; visitedCells: number } };
  /** Legacy value/formula/link/rich-text tiles only. See sourceDiscovery for visual coverage. */
  occupiedRegions?: SheetOccupiedRegion[];
  /** Additive visual discovery does not change legacy #405 display/data bounds. */
  visualExtent?: SheetSourceExtent;
  visualMaterialization?: SheetDefinition['materialization'];
  sourceDiscovery?: SheetSourceDiscovery;
  /** Ordinary grid dimensions exclude annotation-only addresses. */
  dataExtent?: SheetSourceExtent;
  /** Union of legacy data, known visual source and all valid annotations; partial discovery is explicit. */
  logicalExtent?: SheetSourceExtent;
  /** Comments-only sheets need a bounded initial region, not a dense origin rectangle. */
  initialRegion?: SheetRegion;
  comments?: SheetComment[];
  id: number;
  name: string;
  hidden?: boolean;
  rowCount?: number;
  colCount?: number;
}

export interface SheetWindow {
  startRow: number;
  endRow: number;
  pageSize: number;
  totalRows: number;
  totalCols: number;
}

export interface SheetModel {
  get defaults(): any;
  get data(): string[][];
  get cell(): Record<string, SheetCellMetadata>;
  get merge(): CellMerge[];
  get rowHeights(): number | number[];
  get colWidths(): number | number[];
  get columns(): SheetColumn[];
  readonly structure?: SheetStructure;
  readonly meta?: SheetWindow;
}
