/** Serializable DrawingML metadata carried by the actual PPTX Worker. */
export type PptxChartType = 'lineChart' | 'barChart' | 'areaChart' | 'scatterChart' |
  'pieChart' | 'pie3DChart' | 'doughnutChart';

export interface PptxChartFont {
  family?: string;
  eastAsianFamily?: string;
  complexScriptFamily?: string;
  sizePt?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface PptxChartLabels {
  font?: PptxChartFont;
  showValue?: boolean;
  showCategory?: boolean;
  showSeries?: boolean;
  showPercent?: boolean;
  deleted?: boolean;
  position?: string;
  formatCode?: string;
  sourceLinked?: boolean;
  points?: Record<string, PptxChartLabels>;
}

export interface PptxChartOptions {
  grouping?: 'standard' | 'clustered' | 'stacked' | 'percentStacked';
  holeSize?: number;
  firstSliceAngle?: number;
  gapWidth?: number;
  overlap?: number;
  legend?: { show?: boolean; position?: string; overlay?: boolean; font?: PptxChartFont };
  labels?: PptxChartLabels;
  series?: Array<{ color?: string; points?: Record<string, string>; labels?: PptxChartLabels }>;
}

export interface PptxChartSeries {
  key: string | number;
  values: Array<{ x: string | number | null; y: number | null }>;
  xlabels: Record<string, string | number>;
  /** Original indexed hierarchy, from innermost to outermost category level. */
  categoryLevels?: Array<Record<string, string>>;
}

export interface PptxChartAxis {
  id: string;
  kind: 'category' | 'value' | 'date' | 'series';
  position?: 'l' | 'r' | 't' | 'b';
  deleted: boolean;
  reversed: boolean;
  min?: number;
  max?: number;
  logBase?: number;
  crossAxisId?: string;
  crosses?: 'autoZero' | 'min' | 'max';
  crossesAt?: number;
  numberFormat?: { code: string; sourceLinked?: boolean };
  title?: string;
  majorGridlines: boolean;
  labelRotation?: number;
  font?: PptxChartFont;
}

export interface PptxChartGroup {
  chartType: PptxChartType;
  barDirection?: 'bar' | 'col';
  axisIds: string[];
  series: PptxChartSeries[];
  options: PptxChartOptions;
}

export interface PptxChartModel {
  schemaVersion: 1;
  groups: PptxChartGroup[];
  axes: PptxChartAxis[];
  title?: string;
  font?: PptxChartFont;
}

export interface PptxChartMessage {
  type?: string;
  data?: {
    chartID?: string;
    chartType?: PptxChartType | 'comboChart';
    barDirection?: string;
    chartData?: any;
    chartOptions?: PptxChartOptions;
    chartModel?: PptxChartModel;
  };
}

export interface PptxChartCollection {
  MsgQueue: PptxChartMessage[];
  isDone?: boolean;
}

export type PptxChartRenderer = (
  model: PptxChartModel,
  target: HTMLElement,
) => { destroy?: () => void } | void | Promise<{ destroy?: () => void } | void>;
