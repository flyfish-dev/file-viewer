import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../../..'), pkg = path.join(root, 'packages/renderers/pptx')
const require = createRequire(path.join(pkg, 'package.json'))
const { build } = require('esbuild'), JSZip = require('jszip')
const { chromium, webkit } = createRequire(path.join(root, 'package.json'))('playwright')
const { JSDOM } = createRequire(path.join(root, 'packages/renderers/word/package.json'))('jsdom')
const corpus = process.env.PPTX_REPORTED_CORPUS_DIR
assert.ok(corpus, 'PPTX_REPORTED_CORPUS_DIR is required')
const output = path.join(root, 'output/pptx-reported-layout')
await mkdir(output, { recursive: true })
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const norm = text => text.replace(/\s/g, '')
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.7, `${label}: ${actual} vs ${expected}`)
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main', P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const all = (element, ns, name) => Array.from(element.getElementsByTagNameNS(ns, name))
const refs = new Map()
for (const name of ['I312-01.pptx', 'C046.pptx']) {
  const bytes = await readFile(path.join(corpus, name)), zip = await JSZip.loadAsync(bytes), slides = []
  for (let index = 1; zip.file(`ppt/slides/slide${index}.xml`); index++) {
    const dom = new JSDOM(await zip.file(`ppt/slides/slide${index}.xml`).async('string'), { contentType: 'application/xml' })
    try {
      const doc = dom.window.document, tables = [], charts = []
      for (const frame of all(doc, P, 'graphicFrame')) {
        const transform = all(frame, P, 'xfrm')[0], off = all(transform, A, 'off')[0], ext = all(transform, A, 'ext')[0]
        const box = { x: Number(off.getAttribute('x')) / 9525, y: Number(off.getAttribute('y')) / 9525,
          width: Number(ext.getAttribute('cx')) / 9525, height: Number(ext.getAttribute('cy')) / 9525 }
        const table = all(frame, A, 'tbl')[0]
        if (table) {
          const widths = all(table, A, 'gridCol').map(column => Number(column.getAttribute('w')) / 9525)
          const rows = all(table, A, 'tr').map(row => ({ height: Number(row.getAttribute('h')) / 9525,
            cells: all(row, A, 'tc').map(cell => norm(all(cell, A, 't').map(text => text.textContent).join(''))) }))
          tables.push({ ...box, width: widths.reduce((sum, width) => sum + width, 0), widths, rows })
        } else charts.push(box)
      }
      slides.push({ tables, charts, paragraphs: all(doc, P, 'sp').flatMap(shape => {
        const body = all(shape, P, 'txBody')[0]
        return body ? all(body, A, 'p').map(paragraph => norm(all(paragraph, A, 't').map(text => text.textContent).join(''))).filter(Boolean) : []
      }) })
    } finally { dom.window.close() }
  }
  refs.set(name, { bytes, sha256: sha(bytes), slides })
}
assert.equal(refs.get('I312-01.pptx').sha256, 'f627c719d90fd734c4de07552ba8b49b3e923680d671cf0e2f1aa74d42d97ddc')
assert.equal(refs.get('C046.pptx').sha256, 'a7afc41664bec43e6e4f6bce03af2dbf20f34ce9886dbe2945ccece53214019d')
const bundle = await build({ stdin: { resolveDir: root, contents: `
import {PptxViewer} from './packages/renderers/pptx/src/viewer.ts';
import {registerPptxChartLibraryLoader} from './packages/renderers/pptx/src/chart.ts';
import * as billboard from './packages/renderers/pptx/node_modules/billboard.js';
import * as d3Format from './packages/renderers/pptx/node_modules/d3-format';
registerPptxChartLibraryLoader(async()=>({billboard,d3Format}));window.PptxViewer=PptxViewer;` }, bundle: true, format: 'iife', write: false, logLevel: 'warning' })
const worker = await readFile(path.join(pkg, 'dist/worker/pptx.worker.js'))
assert.equal(sha(worker), sha(await readFile(path.join(root, 'apps/viewer-demo/public/vendor/pptx/pptx.worker.js'))))
const checks = [], errors = [], external = []
try {
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true })
    try {
      for (const width of [780, 1440]) for (const dpr of [1, 2]) for (const [name, expected] of refs) {
        const page = await browser.newPage({ viewport: { width, height: 980 }, deviceScaleFactor: dpr })
        page.on('pageerror', error => errors.push(error.message))
        await page.route(/^https?:/, route => { external.push(route.request().url()); return route.abort() })
        try {
          await page.setContent(`<meta charset="utf-8"><style>body{margin:0}#host{width:${width}px;height:960px}</style><div id="host"></div>`)
          await page.addScriptTag({ content: bundle.outputFiles[0].text })
          const actual = await page.evaluate(async ({ bytes, worker }) => {
            const host = document.getElementById('host'), url = URL.createObjectURL(new Blob([worker], { type: 'text/javascript' }))
            let done, fail; const ready = new Promise((resolve, reject) => { done = resolve; fail = reject })
            globalThis.layoutWorkerCount = 0
            globalThis.layoutViewer = await PptxViewer.open(Uint8Array.from(atob(bytes), char => char.charCodeAt(0)).buffer, host,
              { fitMode: 'width', lazySlides: false, workerFactory: () => {
                const worker = new Worker(url), terminate = worker.terminate.bind(worker); layoutWorkerCount++
                worker.terminate = () => { if (!worker.stopped) { worker.stopped = true; layoutWorkerCount--; terminate() } }
                return worker
              }, onRenderComplete: done, onError: fail, onSlideError: (_, error) => fail(error) })
            await ready; await document.fonts.ready
            await Promise.all(Array.from(host.querySelectorAll('img'), image => image.decode()))
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
            globalThis.layoutWorkerUrl = url
            return Array.from(host.querySelectorAll('.slide'), slide => {
              const paper = slide.getBoundingClientRect(), scale = paper.width / slide.offsetWidth
              const box = element => { const rect = element.getBoundingClientRect(); return { x: (rect.x - paper.x) / scale, y: (rect.y - paper.y) / scale, width: rect.width / scale, height: rect.height / scale } }
              const tables = Array.from(slide.querySelectorAll('table'), table => ({ box: box(table), rows: Array.from(table.rows, row => ({ box: box(row), cells: Array.from(row.cells, cell => {
                const style = getComputedStyle(cell)
                return { text: cell.textContent.replace(/\s/g, ''), box: box(cell), borders: ['Top', 'Right', 'Bottom', 'Left'].map(side => ({ width: parseFloat(style[`border${side}Width`]), style: style[`border${side}Style`] })) }
              }) })) }))
              const charts = Array.from(slide.querySelectorAll(':scope>.block'), block => ({ box: box(block), svg: block.querySelectorAll('.bb svg').length,
                lines: Array.from(block.querySelectorAll('.bb-line'), line => ({ path: line.getAttribute('d'), stroke: getComputedStyle(line).stroke, width: parseFloat(getComputedStyle(line).strokeWidth) })) })).filter(block => block.svg)
              const glyphs = Array.from(slide.querySelectorAll('.numeric-bullet-style'), bullet => { const range = document.createRange(); range.selectNodeContents(bullet); return { text: bullet.textContent, rects: range.getClientRects().length, box: box(bullet) } })
              return { tables, charts, glyphs, text: slide.textContent.replace(/\s/g, '') }
            })
          }, { bytes: expected.bytes.toString('base64'), worker: worker.toString('utf8') })
          await writeFile(path.join(output, 'last-layout.json'), JSON.stringify({ name, engine, width, dpr, actual }, null, 2))
          assert.equal(actual.length, expected.slides.length)
          actual.forEach((slide, index) => {
            const source = expected.slides[index]
            for (const paragraph of source.paragraphs) assert.ok(slide.text.includes(paragraph), `${name} slide ${index + 1}: original paragraph missing`)
            assert.equal(slide.tables.length, source.tables.length)
            slide.tables.forEach((table, ti) => {
              const sourceTable = source.tables[ti]
              for (const key of ['x', 'y']) near(table.box[key], sourceTable[key], `table ${key}`)
              const first = table.rows[0].cells[0], last = table.rows[0].cells.at(-1)
              // Collapsed borders can contribute half a stroke outside each
              // authored outer edge; retain a bound tied to the actual strokes.
              const borderExtent = (first.borders[3].width + last.borders[1].width) / 2
              assert.ok(Math.abs(table.box.width - sourceTable.width) < borderExtent + 0.7, 'Table grid exceeds authored width and collapsed border extent')
              assert.equal(table.rows.length, sourceTable.rows.length)
              table.rows.forEach((row, ri) => {
                assert.equal(row.cells.length, sourceTable.rows[ri].cells.length)
                assert.ok(row.box.height >= sourceTable.rows[ri].height - 0.7, 'Authored row minimum is lost')
                row.cells.forEach((cell, ci) => { assert.equal(cell.text, sourceTable.rows[ri].cells[ci]); near(cell.box.width, sourceTable.widths[ci], 'source table column width')
                  assert.ok(cell.borders.some(border => border.width > 0 && border.style !== 'none'), 'Reported table lost visible border rules') })
              })
            })
            assert.equal(slide.charts.length, source.charts.length)
            slide.charts.forEach((chart, ci) => { for (const key of ['x', 'y', 'width', 'height']) near(chart.box[key], source.charts[ci][key], `chart ${key}`) })
            for (let left = 0; left < slide.charts.length; left++) for (let right = left + 1; right < slide.charts.length; right++) {
              const a = slide.charts[left].box, b = slide.charts[right].box
              assert.ok(Math.min(a.x + a.width, b.x + b.width) <= Math.max(a.x, b.x) || Math.min(a.y + a.height, b.y + b.height) <= Math.max(a.y, b.y), 'Original independent charts overlap')
            }
          })
          if (name.startsWith('I312')) {
            const lines = actual[2].charts.flatMap(chart => chart.lines)
            assert.ok(lines.length > 0, 'Reported line chart has no rendered series')
            for (const line of lines) { assert.ok(line.path && /[ML]/.test(line.path) && !/NaN|Infinity/.test(line.path)); assert.notEqual(line.stroke, 'none'); assert.ok(line.width > 0) }
          } else assert.deepEqual(actual[0].glyphs.map(glyph => glyph.text), ['一． ', '二． ', '三． ', '四． ', '五． '])
          await page.locator('.slide').nth(name.startsWith('I312') ? 1 : 0).screenshot({ path: path.join(output, `${name}-${engine}-${width}-dpr${dpr}.png`) })
          assert.deepEqual(await page.evaluate(() => { layoutViewer.destroy(); URL.revokeObjectURL(layoutWorkerUrl); return { workers: layoutWorkerCount, children: document.getElementById('host').childElementCount } }), { workers: 0, children: 0 })
          checks.push({ name, sha256: expected.sha256, engine, width, dpr, status: 'pass', slides: actual.length, geometry: actual })
          console.log('PASS', name, engine, width, `DPR${dpr}`)
        } finally { await page.close() }
      }
    } finally { await browser.close() }
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, [])
} finally { await writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, errors, external }, null, 2)) }
