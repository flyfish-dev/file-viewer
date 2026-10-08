import assert from 'node:assert/strict';
import test from 'node:test';
import { msDocFontFallbacks } from '../dist/render/fonts.js';
import { renderMsDoc } from '../dist/render/html.js';
import { charPropsToState, paraPropsToState, tablePropsToState } from '../dist/msdoc/properties.js';

test('native DOC uses the font table alternate and FFID family without replacing the authored face', () => {
  for (const [ffid, generic] of [[16, 'serif'], [32, 'sans-serif'], [48, 'monospace'], [64, 'cursive'], [80, 'fantasy']]) {
    assert.deepEqual(msDocFontFallbacks('Missing face', { altName: 'Installed alternate', ffid }), ['Installed alternate', generic]);
  }
  assert.deepEqual(msDocFontFallbacks('Same face', { altName: 'Same face', ffid: 16 }), ['serif']);
})

test('native DOC consults Latin PANOSE only after an unspecified FFID family', () => {
  for (const [panose, generic] of [
    [[2, 2, 6, 3], 'serif'], [[2, 10, 6, 3], 'serif'],
    [[2, 11, 6, 3], 'sans-serif'], [[2, 15, 6, 3], 'sans-serif'],
    [[2, 2, 6, 9], 'monospace'], [[3, 2, 6, 9], 'sans-serif'],
  ]) assert.equal(msDocFontFallbacks('Missing face', { ffid: 0, panose }).at(-1), generic);
  assert.equal(msDocFontFallbacks('Missing face', { ffid: 16, panose: [2, 11, 6, 9] }).at(-1), 'serif');
})

test('existing authored CJK aliases retain their order and override fixed-pitch metadata', () => {
  for (const [name, expected] of [
    ['新宋体', ['SimSun', 'Songti SC', 'Noto Serif CJK SC', 'serif']],
    ['仿宋_GB2312', ['FangSong', 'STFangsong', 'Songti SC', 'Noto Serif CJK SC', 'serif']],
    ['楷体_GB2312', ['KaiTi', 'STKaiti', 'Kaiti SC', 'Songti SC', 'serif']],
    ['黑体', ['SimHei', 'Heiti SC', 'Noto Sans CJK SC', 'sans-serif']],
    ['微软雅黑', ['Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'sans-serif']],
  ]) assert.deepEqual(msDocFontFallbacks(name, { ffid: 52 }), expected);
})

test('Japanese and traditional CJK names retain serif or sans-serif substitutes', () => {
  for (const name of ['ＭＳ 明朝', 'Yu Mincho', 'MingLiU', '宋體', 'Songti TC', '楷體']) {
    assert.equal(msDocFontFallbacks(name, { ffid: 52 }).at(-1), 'serif', name);
    assert.ok(msDocFontFallbacks(name).length > 1, name);
  }
  for (const name of ['黑體', 'Heiti TC', 'DengXian', '等線']) {
    assert.equal(msDocFontFallbacks(name, { ffid: 52 }).at(-1), 'sans-serif', name);
    assert.ok(msDocFontFallbacks(name).length > 1, name);
  }
})

const paragraph = (text, fontFamily = 'Missing serif') => ({
  type: 'paragraph', id: text, text, paraState: paraPropsToState([]),
  inlines: [{ type: 'text', text, style: { ...charPropsToState([]), fontFamily } }],
});

test('HTML font fallback uses font-table metadata for authored and script-specific runs', () => {
  const block = paragraph('Latin字');
  block.inlines[0].style.fontFamilyEastAsia = 'Missing CJK';
  const result = renderMsDoc({ blocks: [block], fonts: [
    { name: 'Missing serif', altName: 'Alternate serif', ffid: 16 },
    { name: 'Missing CJK', altName: 'Alternate CJK', ffid: 32 },
  ], assets: [], warnings: [], meta: {} });
  assert.match(result.html, /font-family:&#39;Missing serif&#39;,&#39;Alternate serif&#39;,serif/);
  assert.match(result.html, /font-family:&#39;Missing CJK&#39;,&#39;Alternate CJK&#39;,sans-serif/);
  const alias = renderMsDoc({ blocks: [paragraph('Alias', 'Alternate serif')], fonts: [
    { name: 'Missing serif', altName: 'Alternate serif', ffid: 16 },
  ], assets: [], warnings: [], meta: {} });
  assert.match(alias.html, /font-family:&#39;Alternate serif&#39;,serif/);
})

test('vertical text has intrinsic logical dimensions while nested tables keep their own grid', () => {
  const state = tablePropsToState([]);
  const table = (depth, blocks, meta = {}) => ({
    type: 'table', id: `table-${depth}`, depth, state, gridWidthTwips: 2400,
    rows: [{ id: 'row', state, cells: [{ id: 'cell', colIndex: 0, meta, blocks, paragraphs: [] }] }],
  });
  const nested = table(2, [paragraph('Nested')]);
  const result = renderMsDoc({ blocks: [table(1, [paragraph('Before'), nested, paragraph('After')], { textFlow: 5 })], fonts: [], assets: [], warnings: [], meta: {} });
  assert.match(result.html, /msdoc-cell-vertical[^>]*inline-size:max-content;block-size:max-content/);
  assert.match(result.html, /Before<\/span><\/div><\/div><table/);
  assert.match(result.html, /<\/table><div class="msdoc-cell-vertical"/);
  assert.equal((result.html.match(/msdoc-cell-vertical/g) || []).length, 2);
});
