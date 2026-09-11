import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { extractChartData } from '../src/engine/support/chart-data.js'

const point = (idx, value) => ({ attrs: { idx }, 'c:v': value })
const literal = (kind, points) => ({ [`c:${kind}Lit`]: { 'c:pt': points } })
const cached = (kind, points) => ({ [`c:${kind}Ref`]: { [`c:${kind}Cache`]: { 'c:pt': points } } })
const series = (cat, val, tx = { 'c:v': 'Orders' }) => ({ 'c:cat': cat, 'c:val': val, 'c:tx': tx })
const literalSeries = series(literal('str', [point('0', 'A'), point('1', 'B')]), literal('num', [point('0', '0'), point('1', '42')]))
const expected = [{ key: 'Orders', xlabels: { 0: 'A', 1: 'B' }, values: [{ x: '0', y: 0 }, { x: '1', y: 42 }] }]
assert.deepEqual(extractChartData(literalSeries), expected)
assert.deepEqual(extractChartData(series(cached('str', [point(0, 'A'), point(1, 'B')]), cached('num', [point(0, '0'), point(1, '42')]), cached('str', point(0, 'Orders')))), expected)
assert.deepEqual(extractChartData(series(literal('num', point(0, '0')), literal('num', point(0, '-2.5')))), [{ key: 'Orders', xlabels: { 0: '0' }, values: [{ x: '0', y: -2.5 }] }])
const sparse = extractChartData([
  series(literal('str', [point(2, 'C'), point(0, 'A')]), literal('num', [point(2, '3'), point(0, '#N/A')])),
  series(literal('str', point(1, 'B')), literal('num', [point(1, '0'), point(2, 'Infinity')])),
])
assert.deepEqual(sparse[0].xlabels, { 0: 'A', 1: 'B', 2: 'C' })
assert.deepEqual(sparse.map(row => row.values.map(item => item.y)), [[null, null, 3], [null, 0, null]])
assert.deepEqual(extractChartData({ 'c:xVal': literal('num', [point(1, '20'), point(0, '10')]), 'c:yVal': cached('num', [point(0, '0'), point(1, '30')]) }), [[10, 20], [0, 30]])
const hostile = extractChartData(series(literal('str', [point('__proto__', 'bad'), point(-1, 'bad'), point(1e12, 'far')]), literal('num', point(1e12, '7'))))
assert.equal(hostile[0].values.length, 1, 'Sparse indices must not allocate index-sized arrays')
assert.deepEqual(hostile[0].values, [{ x: '1000000000000', y: 7 }])
assert.deepEqual(extractChartData(undefined), [])
assert.deepEqual(extractChartData(series(literal('str', point(0, '')), literal('num', point(0, ''))))[0].values, [{ x: '0', y: null }])

const temp = await mkdtemp(path.join(tmpdir(), 'file-viewer-chart-268-'))
try {
  const entry = path.resolve(import.meta.dirname, '../src/chart.ts')
  const out = path.join(temp, 'chart.mjs')
  await build({ entryPoints: [entry], outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' })
  const { registerPptxChartLibraryLoader, renderPptxPostProcessing } = await import(pathToFileURL(out).href)
  const calls = []
  let destroyed = 0
  registerPptxChartLibraryLoader(async () => ({ billboard: { bar: () => "bar", default: { generate: options => { calls.push(options); return { destroy() { destroyed++ } } } } }, d3Format: { format: () => value => String(value) } }))
  const target = { id: 'chart-test' }
  const root = { querySelectorAll: selector => selector === '[id]' ? [target] : [] }
  const data = extractChartData(series(literal('num', point(0, 0)), literal('num', point(0, '3'))))
  const charts = { MsgQueue: [{ type: 'createChart', data: { chartID: 'chart-test', chartType: 'barChart', barDirection: 'bar', chartData: data } }] }
  const handle = await renderPptxPostProcessing(charts, root)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].axis.rotated, true)
  assert.equal(calls[0].axis.x.tick.format(0), 0, 'A numeric zero category must not fall back to its index')
  assert.deepEqual(calls[0].data.columns, [['Orders', 3]])
  handle.destroy()
  assert.equal(destroyed, 1)
} finally { await rm(temp, { recursive: true, force: true }) }
console.log('[pptx] #268 literal/cache/sparse/zero/invalid chart data and horizontal rendering regression passed.')
