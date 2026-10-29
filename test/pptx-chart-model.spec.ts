import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { extractChartModel } from '../packages/renderers/pptx/src/engine/support/chart-model.js';
import { createPptxCartesianChart, formatPptxChartNumber } from '../packages/renderers/pptx/src/chart-config';
import { registerPptxChartRenderer, renderPptxPostProcessing } from '../packages/renderers/pptx/src/chart';
import type { PptxChartModel } from '../packages/renderers/pptx/src/chart-types';

const val = (value: unknown) => ({ attrs: { val: String(value) } });
const points = (values: unknown[]) => ({ 'c:pt': values.map((value, idx) => ({ attrs: { idx }, 'c:v': value })) });
const series = (name: string, values: number[]) => ({
  'c:tx': { 'c:v': name },
  'c:cat': { 'c:strLit': points(['四月', '五月']) },
  'c:val': { 'c:numLit': points(values) },
});
const combo = () => ({ 'c:chartSpace': { 'c:chart': { 'c:plotArea': {
  'c:barChart': {
    'c:barDir': val('col'), 'c:ser': [series('收入', [20, 30]), series('支出', [10, 15])],
    'c:axId': [val(1), val(2)], 'c:gapWidth': val(75), 'c:dLbls': { 'c:showVal': val(1) },
  },
  'c:lineChart': { 'c:ser': series('增长率', [0.2, 0.3]), 'c:axId': [val(1), val(3)] },
  'c:catAx': { 'c:axId': val(1), 'c:axPos': val('b'), 'c:crossAx': val(2) },
  'c:valAx': [
    { 'c:axId': val(2), 'c:axPos': val('l'), 'c:scaling': { 'c:min': val(0), 'c:max': val(100) }, 'c:majorGridlines': {} },
    { 'c:axId': val(3), 'c:axPos': val('r'), 'c:scaling': { 'c:min': val(0), 'c:max': val(1), 'c:orientation': val('maxMin') }, 'c:numFmt': { attrs: { formatCode: '0.0%', sourceLinked: '0' } } },
  ],
} } } });
const libraries = { bar: () => 'bar', line: () => 'line', area: () => 'area' };

afterEach(() => registerPptxChartRenderer(null));
describe('DrawingML chart groups and metadata', () => {
  it('carries authored chart, axis, legend and per-point fonts through the serializable model', () => {
    const source = combo() as any;
    const txPr = (size: number) => ({ 'a:p': { 'a:pPr': { 'a:defRPr': {
      attrs: { sz: size, b: '1', i: '0' }, 'a:latin': { attrs: { typeface: 'Arial' } },
      'a:ea': { attrs: { typeface: '宋体' } }, 'a:cs': { attrs: { typeface: 'Tahoma' } },
      'a:solidFill': { 'a:srgbClr': { attrs: { val: '123456' } } },
    } } } });
    const chart = source['c:chartSpace']['c:chart'];
    source['c:chartSpace']['c:txPr'] = txPr(1200);
    chart['c:legend'] = { 'c:legendPos': val('t'), 'c:overlay': val(1), 'c:txPr': txPr(1400) };
    chart['c:plotArea']['c:catAx']['c:txPr'] = txPr(1600);
    chart['c:plotArea']['c:catAx']['c:txPr']['a:bodyPr'] = { attrs: { rot: '-2700000' } };
    chart['c:plotArea']['c:barChart']['c:dLbls']['c:dLbl'] = {
      'c:idx': val(1), 'c:txPr': txPr(1800), 'c:showVal': val(1),
    };
    const model = JSON.parse(JSON.stringify(extractChartModel(source, () => '123456'))) as PptxChartModel;
    expect(model.font).toEqual({ family: 'Arial', eastAsianFamily: '宋体', complexScriptFamily: 'Tahoma',
      sizePt: 12, bold: true, italic: false, color: '#123456' });
    expect(model.axes[0].font?.sizePt).toBe(16);
    expect(model.axes[0].labelRotation).toBe(-45);
    expect(createPptxCartesianChart(model, libraries)!.axis.x.tick).toMatchObject({ rotate: -45, autorotate: false });
    expect(model.groups[0].options.legend).toMatchObject({ position: 't', overlay: true, font: { sizePt: 14 } });
    expect(model.groups[0].options.labels?.points?.[1].font?.sizePt).toBe(18);
    const invalid = txPr(Infinity);
    invalid['a:p']['a:pPr']['a:defRPr']['a:latin'].attrs.typeface = 'x'.repeat(1000);
    source['c:chartSpace']['c:txPr'] = invalid;
    const bounded = extractChartModel(source, () => 'red;position:fixed').font!;
    expect(bounded.sizePt).toBeUndefined();
    expect(bounded.color).toBeUndefined();
    expect(bounded.family?.length).toBe(512);
  });
  it('retains both bar series and the line with explicit primary/secondary axes', () => {
    const model = extractChartModel(combo()) as PptxChartModel;
    expect(model.groups.map(group => [group.chartType, group.series.length])).toEqual([['barChart', 2], ['lineChart', 1]]);
    expect(model.groups[1].axisIds).toEqual(['1', '3']);
    const config = createPptxCartesianChart(model, libraries)!;
    expect(config.data.columns.map((column: unknown[]) => column.slice(1))).toEqual([[20, 30], [10, 15], [0.2, 0.3]]);
    expect(Object.values(config.data.types)).toEqual(['bar', 'bar', 'line']);
    expect(Object.values(config.data.axes)).toEqual(['y', 'y', 'y2']);
    expect(config.axis.y).toMatchObject({ min: 0, max: 100, padding: { top: 0, bottom: 0 } });
    expect(config.axis.y2).toMatchObject({ min: 0, max: 1, inverted: true, show: true });
    expect(config.axis.y2.tick.format(0.25)).toBe('25.0%');
    expect(config.axis.x.categories).toEqual(['四月', '五月']);
    expect(config.grid.y.show).toBe(true);
    expect(config.data.labels.format(20, config.data.columns[0][0], 0)).toBe('20');
    expect(config.data.labels.format(0.2, config.data.columns[2][0], 0)).toBe('');
  });
  it('preserves repeated groups of the same family and duplicate display names', () => {
    const source = combo();
    const plot = source['c:chartSpace']['c:chart']['c:plotArea'];
    (plot as any)['c:barChart'] = [plot['c:barChart'], { 'c:ser': series('__proto__', [4, 5]), 'c:axId': [val(1), val(2)] }];
    const model = extractChartModel(source) as PptxChartModel;
    expect(model.groups).toHaveLength(3);
    const config = createPptxCartesianChart(model, libraries)!;
    expect(config.data.columns).toHaveLength(4);
    expect(new Set(config.data.columns.map((column: unknown[]) => column[0])).size).toBe(4);
    expect(Object.values(config.data.names)).toContain('__proto__');
    expect(({} as any).polluted).toBeUndefined();
  });
  it('retains multi-level categories and does not allocate from untrusted ptCount or sparse indices', () => {
    const source = combo();
    const row = source['c:chartSpace']['c:chart']['c:plotArea']['c:barChart']['c:ser'][0];
    (row as any)['c:cat'] = { 'c:multiLvlStrRef': { 'c:multiLvlStrCache': {
      'c:ptCount': val(4294967295), 'c:lvl': [points(['四月', '五月']), points(['2026'])],
    } } };
    const model = extractChartModel(source) as PptxChartModel;
    expect(model.groups[0].series[0].values).toHaveLength(2);
    expect(model.groups[0].series[0].xlabels).toEqual({ 0: '2026 / 四月', 1: '2026 / 五月' });
    expect(model.groups[0].series[0].categoryLevels).toEqual([{ 0: '四月', 1: '五月' }, { 0: '2026' }]);
  });
  it('keeps every scatter series with its own numeric x values', () => {
    const source = { 'c:chartSpace': { 'c:chart': { 'c:plotArea': { 'c:scatterChart': { 'c:ser': [
      { 'c:tx': { 'c:v': 'A' }, 'c:xVal': { 'c:numLit': points([10, 20]) }, 'c:yVal': { 'c:numLit': points([1, 2]) } },
      { 'c:tx': { 'c:v': 'B' }, 'c:xVal': { 'c:numLit': points([30, 40]) }, 'c:yVal': { 'c:numLit': points([3, 4]) } },
    ] } } } } };
    expect(extractChartModel(source).groups[0].series.map((row: any) => row.values)).toEqual([
      [{ x: 10, y: 1 }, { x: 20, y: 2 }], [{ x: 30, y: 3 }, { x: 40, y: 4 }],
    ]);
  });
  it('bounds malformed metadata and preserves authored axis deletion and labels', () => {
    const source = combo();
    const axis = source['c:chartSpace']['c:chart']['c:plotArea']['c:valAx'][0] as any;
    axis['c:delete'] = val(1); axis['c:scaling']['c:min'] = val('Infinity');
    axis['c:title'] = { 'c:tx': { 'c:rich': { 'a:p': { 'a:r': { 'a:t': '收入（万元）' } } } } };
    const model = extractChartModel(source) as PptxChartModel;
    expect(model.axes.find(axis => axis.id === '2')).toMatchObject({ deleted: true, min: undefined, title: '收入（万元）' });
    expect(createPptxCartesianChart(model, libraries)!.axis.y.show).toBe(false);
  });
  it('does not normalize an unrelated line while rendering percent-stacked bars', () => {
    const model = extractChartModel(combo()) as PptxChartModel;
    model.groups[0].options.grouping = 'percentStacked';
    const config = createPptxCartesianChart(model, libraries)!;
    expect(config.data.columns[0][1]).toBeCloseTo(200 / 3);
    expect(config.data.columns[2].slice(1)).toEqual([0.2, 0.3]);
    expect(model.groups[0].series[0].values[0].y).toBe(20);
  });
  it('formats common numeric codes without interpreting scripts or unsupported codes', () => {
    expect(formatPptxChartNumber(1234.5, '#,##0.00')).toBe('1,234.50');
    expect(formatPptxChartNumber(0.125, '0.0%')).toBe('12.5%');
    expect(formatPptxChartNumber(3, '<script>')).toBe('3');
  });
  it('supplies typed model metadata to a custom renderer without a library or second ZIP parse', async () => {
    const model = extractChartModel(combo()) as PptxChartModel;
    const { document } = parseHTML('<html><body><div id="chart0"></div></body></html>');
    const destroy = vi.fn();
    const renderer = vi.fn(() => ({ destroy }));
    registerPptxChartRenderer(renderer);
    const handle = await renderPptxPostProcessing({ MsgQueue: [{ type: 'createChart', data: {
      chartID: 'chart0', chartType: 'comboChart', chartData: model.groups.flatMap(group => group.series), chartModel: model,
    } }] }, document);
    expect(renderer).toHaveBeenCalledWith(model, document.getElementById('chart0'));
    handle.destroy(); handle.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
