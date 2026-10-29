import type { PptxChartAxis, PptxChartLabels, PptxChartModel } from './chart-types';

/** Common authored numeric formats; unsupported Excel formats remain in the model. */
export const formatPptxChartNumber = (value: number, format = 'General') => {
  if (!Number.isFinite(value)) return '';
  const match = /^([$€£]?)[#0,]+(?:\.([0#]+))?(%)?$/.exec(format);
  if (!match) return String(value);
  const decimal = (match[2] || '').slice(0, 20);
  return match[1] + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: (decimal.match(/0/g) || []).length,
    maximumFractionDigits: decimal.length,
    useGrouping: format.includes(','),
    style: match[3] ? 'percent' : 'decimal',
  }).format(value);
};

const axisOptions = (axis?: PptxChartAxis) => {
  if (!axis) return {};
  const bounds = axis.min === undefined || axis.max === undefined || axis.min < axis.max
    ? { min: axis.min, max: axis.max } : {};
  return {
    ...bounds,
    ...(axis.min !== undefined || axis.max !== undefined ? { padding: { top: 0, bottom: 0 } } : {}),
    show: !axis.deleted,
    inverted: axis.reversed,
    ...(axis.logBase ? { type: 'log' } : {}),
    ...(axis.title ? { label: { text: axis.title, position: 'outer-middle' } } : {}),
    ...(axis.numberFormat ? { tick: { format: (value: number) => formatPptxChartNumber(value, axis.numberFormat!.code) } } : {}),
  };
};

const defined = (labels?: PptxChartLabels) => Object.fromEntries(
  Object.entries(labels || {}).filter(([, value]) => value !== undefined),
);

export const resolvePptxChartAxes = (model: PptxChartModel) => {
  const axesFor = (group?: typeof model.groups[number]) => model.axes.filter(axis => group?.axisIds.includes(axis.id));
  const primary = axesFor(model.groups[0]).find(axis => axis.kind === 'value') ?? model.axes.find(axis => axis.kind === 'value');
  const secondary = model.groups.filter(group => group.series.length > 0).flatMap(axesFor).find(axis => axis.kind === 'value' && axis.id !== primary?.id);
  const category = axesFor(model.groups[0]).find(axis => axis.kind === 'category' || axis.kind === 'date') ?? model.axes.find(axis => axis.kind === 'category' || axis.kind === 'date');
  return { category, primary, secondary };
};

/** One category coordinate system, with every authored bar/line/area group. */
export const createPptxCartesianChart = (model: PptxChartModel, library: Record<string, any>) => {
  if (!model.groups.length || model.groups.some(group => !['lineChart', 'barChart', 'areaChart'].includes(group.chartType))) return null;
  const rows = model.groups.flatMap((group, groupIndex) => group.series.map((series, index) => ({
    group, groupIndex, series, index, id: `pptx-series-${groupIndex}-${index}`,
  })));
  const coordinates = new Set<string>();
  const labels = new Map<string, string>();
  for (const { series } of rows) for (const [position, point] of series.values.entries()) {
    const coordinate = String(point.x);
    coordinates.add(coordinate);
    if (!labels.has(coordinate)) labels.set(coordinate, String(series.xlabels[position] ?? coordinate));
  }
  const indices = [...coordinates].sort((a, b) => Number(a) - Number(b));
  const categories = indices.map(index => labels.get(index)!);
  const valueFor = (series: typeof rows[number]['series']) => {
    const points = new Map(series.values.map(point => [String(point.x), point.y]));
    return indices.map(index => points.get(index) ?? null);
  };
  const { primary, secondary, category } = resolvePptxChartAxes(model);
  const factory = { barChart: library.bar, lineChart: library.line, areaChart: library.area };
  if (rows.some(row => typeof factory[row.group.chartType as keyof typeof factory] !== 'function')) return null;
  const originalValues = rows.map(row => valueFor(row.series));
  const columns = rows.map(({ id }, index) => [id, ...originalValues[index]]);
  const types = Object.fromEntries(rows.map(row => [row.id, factory[row.group.chartType as keyof typeof factory]() ]));
  const dataAxes = Object.fromEntries(rows.map(row => [row.id,
    secondary && row.group.axisIds.includes(secondary.id) ? 'y2' : 'y',
  ]));
  const groups = model.groups.flatMap((group, groupIndex) =>
    group.options.grouping === 'stacked' || group.options.grouping === 'percentStacked'
      ? [rows.filter(row => row.groupIndex === groupIndex).map(row => row.id)] : [],
  );
  const normalizeAll = model.groups.length === 1 && model.groups[0].options.grouping === 'percentStacked';
  // Normalize only this stacked group, preserving an unrelated line/secondary axis.
  const totals = new Map<number, number[]>();
  rows.forEach((row, rowIndex) => {
    if (normalizeAll || row.group.options.grouping !== 'percentStacked') return;
    let total = totals.get(row.groupIndex);
    if (!total) { total = indices.map(() => 0); totals.set(row.groupIndex, total); }
    originalValues[rowIndex].forEach((value, index) => { total![index] += Math.abs(value || 0); });
  });
  rows.forEach((row, rowIndex) => {
    if (normalizeAll || row.group.options.grouping !== 'percentStacked') return;
    for (let i = 1; i < columns[rowIndex].length; i++) {
      const total = totals.get(row.groupIndex)![i - 1];
      if (typeof columns[rowIndex][i] === 'number' && total) columns[rowIndex][i] = Number(columns[rowIndex][i]) / total * 100;
    }
  });
  const colors = Object.fromEntries(rows.flatMap(row => {
    const color = row.group.options.series?.[row.index]?.color;
    return color && /^(?:#[\da-f]{6}(?:[\da-f]{2})?|transparent)$/i.test(color) ? [[row.id, color]] : [];
  }));
  const gap = model.groups.find(group => group.chartType === 'barChart')?.options.gapWidth;
  const hasLabels = rows.some(row => row.group.options.labels || row.group.options.series?.[row.index]?.labels);
  const byId = new Map(rows.map(row => [row.id, row]));
  const labelFormat = (value: number, id: string, position: number) => {
    const row = byId.get(id);
    if (!row) return '';
    const properties = { ...defined(row.group.options.labels), ...defined(row.group.options.series?.[row.index]?.labels) } as PptxChartLabels;
    const originalIndex = indices[position];
    const point = properties.points?.[originalIndex];
    Object.assign(properties, defined(point));
    if (properties.deleted) return '';
    const result: string[] = [];
    if (properties.showSeries) result.push(String(row.series.key));
    if (properties.showCategory) result.push(categories[position] || '');
    if (properties.showValue) result.push(formatPptxChartNumber(value, properties.formatCode));
    return result.join(' ');
  };
  return {
    data: {
      columns, types, type: types[rows[0]?.id], axes: dataAxes,
      names: Object.fromEntries(rows.map(row => [row.id, String(row.series.key)])),
      ...(Object.keys(colors).length ? { colors } : {}),
      ...(groups.length ? { groups, order: null } : {}),
      ...(normalizeAll ? { stack: { normalize: true } } : {}),
      ...(hasLabels ? { labels: { format: labelFormat } } : {}),
    },
    axis: {
      rotated: model.groups.some(group => group.barDirection === 'bar'),
      x: { ...axisOptions(category), type: 'category', categories, tick: model.groups.some(group => group.barDirection === 'bar')
        ? { multiline: true }
        : { multiline: false, culling: false, rotate: category?.labelRotation ?? 60, autorotate: category?.labelRotation === undefined } },
      y: axisOptions(primary),
      ...(secondary ? { y2: axisOptions(secondary) } : {}),
    },
    grid: { x: { show: category?.majorGridlines === true }, y: { show: primary?.majorGridlines === true } },
    ...(gap !== undefined ? { bar: { width: { ratio: 100 / (100 + gap) } } } : {}),
    ...(model.title ? { title: { text: model.title } } : {}),
    interaction: { enabled: true },
  };
};
