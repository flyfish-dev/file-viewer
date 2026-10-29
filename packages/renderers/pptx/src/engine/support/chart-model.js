import { extractChartData, extractScatterSeries } from './chart-data.js';
import { extractChartOptions, extractChartLabels } from './chart-options.js';
import { extractChartFont } from './chart-font.js';

const many = value => value == null ? [] : Array.isArray(value) ? value : [value];
const valueOf = (node, key) => node?.[key]?.attrs?.val;
const number = value => {
  if (value == null || String(value).trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const id = value => /^\d{1,10}$/.test(String(value)) && Number(value) <= 4294967295 ? String(Number(value)) : undefined;
const flag = value => value === true || value === 1 || value === '1' || value === 'true';
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, 4096) : '';
const titleOf = title => {
  const tx = title?.['c:tx'];
  if (tx?.['c:rich']) {
    return many(tx['c:rich']['a:p']).map(paragraph =>
      [...many(paragraph?.['a:r']), ...many(paragraph?.['a:fld'])].map(run => text(run?.['a:t'])).join('')
    ).join('\n').slice(0, 4096) || undefined;
  }
  const cached = many(tx?.['c:strRef']?.['c:strCache']?.['c:pt']);
  return cached.map(point => text(point?.['c:v'])).join(' ').slice(0, 4096) || undefined;
};

/** Preserve each plot group and its explicit axis relationships. */
export function extractChartModel(content, resolveColor, resolveFont) {
  const space = content?.['c:chartSpace'];
  const chart = space?.['c:chart'];
  const plot = chart?.['c:plotArea'];
  const families = new Set(['lineChart', 'barChart', 'areaChart', 'scatterChart', 'pieChart', 'pie3DChart', 'doughnutChart']);
  const groups = [];
  for (const [name, nodes] of Object.entries(plot || {})) {
    const chartType = name.slice(2);
    if (!name.startsWith('c:') || !families.has(chartType)) continue;
    for (const node of many(nodes)) {
      const options = extractChartOptions(node, chart, resolveColor, resolveFont);
      options.labels = extractChartLabels(node?.['c:dLbls'], resolveColor, resolveFont);
      groups.push({
        chartType,
        barDirection: ['bar', 'col'].includes(valueOf(node, 'c:barDir')) ? valueOf(node, 'c:barDir') : undefined,
        axisIds: many(node?.['c:axId']).map(axis => id(axis?.attrs?.val)).filter(value => value !== undefined),
        series: chartType === 'scatterChart' ? extractScatterSeries(node?.['c:ser']) : extractChartData(node?.['c:ser']),
        options,
      });
    }
  }
  const axes = [];
  for (const [nodeName, kind] of [['c:catAx', 'category'], ['c:valAx', 'value'], ['c:dateAx', 'date'], ['c:serAx', 'series']]) {
    for (const node of many(plot?.[nodeName])) {
      const axisId = id(valueOf(node, 'c:axId'));
      if (axisId === undefined) continue;
      const scaling = node?.['c:scaling'];
      const position = valueOf(node, 'c:axPos');
      const format = node?.['c:numFmt']?.attrs;
      const logBase = number(valueOf(scaling, 'c:logBase'));
      const crosses = valueOf(node, 'c:crosses');
      const rotation = number(node?.['c:txPr']?.['a:bodyPr']?.attrs?.rot);
      axes.push({
        id: axisId, kind,
        position: ['l', 'r', 't', 'b'].includes(position) ? position : undefined,
        deleted: flag(valueOf(node, 'c:delete')),
        reversed: valueOf(scaling, 'c:orientation') === 'maxMin',
        min: number(valueOf(scaling, 'c:min')),
        max: number(valueOf(scaling, 'c:max')),
        logBase: logBase >= 2 && logBase <= 1000 ? logBase : undefined,
        crossAxisId: id(valueOf(node, 'c:crossAx')),
        crosses: ['autoZero', 'min', 'max'].includes(crosses) ? crosses : undefined,
        crossesAt: number(valueOf(node, 'c:crossesAt')),
        numberFormat: format ? { code: text(format.formatCode).slice(0, 512), sourceLinked: format.sourceLinked == null ? undefined : flag(format.sourceLinked) } : undefined,
        title: titleOf(node?.['c:title']),
        majorGridlines: node?.['c:majorGridlines'] != null,
        labelRotation: rotation !== undefined && Math.abs(rotation) <= 5400000 ? rotation / 60000 : undefined,
        font: extractChartFont(node?.['c:txPr'], resolveColor, resolveFont),
      });
    }
  }
  return { schemaVersion: 1, groups, axes, title: titleOf(chart?.['c:title']), font: extractChartFont(space?.['c:txPr'], resolveColor, resolveFont) };
}
