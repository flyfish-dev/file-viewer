/** Chart-family metadata, kept separate from the existing cache message contract. */
import { extractChartFont } from './chart-font.js';
const many = value => value == null ? [] : Array.isArray(value) ? value : [value];
const valueOf = (node, key) => node?.[key]?.attrs?.val;
const unsigned = (value, min, max, fallback) => {
  if (!/^\d+$/.test(String(value))) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export function extractChartLabels(node, resolveColor, resolveFont) {
  if (!node) return undefined;
  const boolean = key => {
    const value = valueOf(node, key);
    return value == null ? undefined : value === true || value === 1 || value === '1' || value === 'true';
  };
  const position = valueOf(node, 'c:dLblPos');
  const format = node?.['c:numFmt']?.attrs;
  return {
    ...(node['c:txPr'] ? { font: extractChartFont(node['c:txPr'], resolveColor, resolveFont) } : {}),
    showValue: boolean('c:showVal'), showCategory: boolean('c:showCatName'),
    showSeries: boolean('c:showSerName'), showPercent: boolean('c:showPercent'),
    deleted: boolean('c:delete'),
    position: ['bestFit', 'b', 'ctr', 'inBase', 'inEnd', 'l', 'outEnd', 'r', 't'].includes(position) ? position : undefined,
    formatCode: typeof format?.formatCode === 'string' ? format.formatCode.slice(0, 512) : undefined,
    sourceLinked: format?.sourceLinked == null ? undefined : ['1', 'true'].includes(String(format.sourceLinked)),
    ...(node['c:dLbl'] ? { points: Object.fromEntries(many(node['c:dLbl']).flatMap(point => {
      const index = unsigned(valueOf(point, 'c:idx'), 0, Number.MAX_SAFE_INTEGER, undefined);
      // Do not recursively accept nested per-point label collections.
      return index === undefined ? [] : [[index, extractChartLabels({ ...point, 'c:dLbl': undefined }, resolveColor, resolveFont)]];
    })) } : {}),
  };
}

export function extractChartOptions(group, chart, resolveColor, resolveFont) {
  const grouping = valueOf(group, 'c:grouping');
  const legend = chart?.['c:legend'];
  const position = valueOf(legend, 'c:legendPos');
  const safeColor = properties => {
    if (properties?.['a:noFill'] != null) return 'transparent';
    if (!properties?.['a:solidFill']) return undefined;
    const color = resolveColor?.(properties['a:solidFill']);
    return /^(?:[\da-f]{6}|[\da-f]{8})$/i.test(String(color)) ? `#${color}` : undefined;
  };
  return {
    grouping: ['standard', 'clustered', 'stacked', 'percentStacked'].includes(grouping) ? grouping : undefined,
    holeSize: unsigned(valueOf(group, 'c:holeSize'), 10, 90, 50),
    firstSliceAngle: unsigned(valueOf(group, 'c:firstSliceAng'), 0, 360, 0),
    gapWidth: unsigned(valueOf(group, 'c:gapWidth'), 0, 500, undefined),
    overlap: /^-?\d+$/.test(String(valueOf(group, 'c:overlap'))) && Math.abs(Number(valueOf(group, 'c:overlap'))) <= 100 ? Number(valueOf(group, 'c:overlap')) : undefined,
    legend: {
      show: legend != null, position: ['l', 'r', 't', 'b', 'tr'].includes(position) ? position : 'r',
      ...(legend?.['c:overlay'] ? { overlay: ['1', 'true'].includes(String(valueOf(legend, 'c:overlay'))) } : {}),
      ...(legend?.['c:txPr'] ? { font: extractChartFont(legend['c:txPr'], resolveColor, resolveFont) } : {}),
    },
    // Indexed point fills must not move when labels are repeated or blank.
    series: many(group?.['c:ser']).map(series => ({
      color: safeColor(series?.['c:spPr']),
      ...(series?.['c:dLbls'] ? { labels: extractChartLabels(series['c:dLbls'], resolveColor, resolveFont) } : {}),
      points: Object.fromEntries(many(series?.['c:dPt']).flatMap(point => {
        const index = unsigned(valueOf(point, 'c:idx'), 0, Number.MAX_SAFE_INTEGER, undefined);
        const color = safeColor(point?.['c:spPr']);
        return index == null || !color ? [] : [[index, color]];
      })),
    })),
  };
}
