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

export interface SheetImage {
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
  values: number[];
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

export interface SheetChartDefinition {
  id: string;
  type: SheetChartType;
  title?: string;
  categoryAxisTitle?: string;
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

export interface SheetStructure {
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

export interface SheetDefinition {
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
