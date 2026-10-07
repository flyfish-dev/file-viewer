import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseMsDoc } from '@file-viewer/doc'

const root = path.resolve(import.meta.dirname, '../../../..')
const require = createRequire(path.join(root, 'package.json'))
const { build } = require('esbuild'), { chromium, webkit } = require('playwright')
assert.ok(process.env.NATIVE_REPORTED_SAMPLE, 'NATIVE_REPORTED_SAMPLE is required')
const bytes = await readFile(process.env.NATIVE_REPORTED_SAMPLE)
const sha256 = createHash('sha256').update(bytes).digest('hex')
assert.equal(sha256, 'ec49e00cfb3b0961b99e598e67a50e6082c82f7ea46f74492df28b5ed6c98129')
const model = parseMsDoc(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
const table = model.blocks.find(block => block.type === 'table')
assert.ok(table)
const expected = table.rows.map(row => row.cells.filter(cell => !cell.hidden).map(cell => ({
  width: (cell.meta.rightBoundary - cell.meta.leftBoundary) / 15,
  colspan: cell.colspan || 1, rowspan: cell.rowspan || 1,
  text: cell.paragraphs.map(paragraph => paragraph.text).join('').replace(/\s/g, ''),
  vertical: cell.meta.vertAlign === 1 ? 'middle' : cell.meta.vertAlign === 2 ? 'bottom' : 'top',
  textFlow: cell.meta.textFlow
})))
const output = path.join(root, 'output/native-doc-reported-table')
await mkdir(output, { recursive: true })
const bundle = await build({ stdin: { resolveDir: root, contents: `import render from './packages/renderers/word/src/wordDoc.ts';window.nativeTableRender=render;` },
  bundle: true, format: 'iife', write: false, logLevel: 'warning' })
const checks = [], errors = [], external = []
try {
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true })
    try {
      for (const dpr of [1, 2]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: dpr })
        page.on('pageerror', error => errors.push(error.message))
        await page.route(/^https?:/, route => { external.push(route.request().url()); return route.abort() })
        try {
          await page.setContent('<meta charset="utf-8"><div id="host" style="width:1100px;height:900px"></div>')
          await page.addScriptTag({ content: bundle.outputFiles[0].text })
          await page.evaluate(async data => {
            globalThis.nativeTableHandle = await nativeTableRender(Uint8Array.from(atob(data), char => char.charCodeAt(0)).buffer, document.getElementById('host'))
            await document.fonts.ready
          }, bytes.toString('base64'))
          for (const zoom of [1, 0.5, 2]) {
            const actual = await page.evaluate(async zoom => {
              const host = document.getElementById('host')
              await host.__flyfishViewerZoomProvider.setZoom(zoom)
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
              const table = host.querySelector('.msdoc-table')
              return Array.from(table.rows, row => Array.from(row.cells, cell => {
                // Font runs on one baseline can have different ascenders. Count
                // overlapping glyph bands, excluding ancestor element boxes.
                const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT), rects = []
                let node
                while ((node = walker.nextNode())) {
                  if (!node.textContent.trim()) continue
                  const range = document.createRange(); range.selectNodeContents(node)
                  rects.push(...Array.from(range.getClientRects(), rect => ({ top: rect.top, bottom: rect.bottom, width: rect.width })).filter(rect => rect.width > 0))
                }
                const bands = []
                for (const rect of rects.sort((a, b) => a.top - b.top)) {
                  const band = bands.find(band => Math.min(band.bottom, rect.bottom) - Math.max(band.top, rect.top) > Math.min(band.bottom - band.top, rect.bottom - rect.top) / 2)
                  if (band) { band.top = Math.max(band.top, rect.top); band.bottom = Math.min(band.bottom, rect.bottom) }
                  else bands.push({ top: rect.top, bottom: rect.bottom })
                }
                const lineTops = bands.map(band => band.top)
                return { width: cell.getBoundingClientRect().width / zoom, text: cell.textContent.replace(/\s/g, ''),
                  colspan: cell.colSpan, rowspan: cell.rowSpan, vertical: getComputedStyle(cell).verticalAlign,
                  writingMode: cell.querySelector('.msdoc-cell-vertical') ? getComputedStyle(cell.querySelector('.msdoc-cell-vertical')).writingMode : null,
                  lineTops, families: Array.from(cell.querySelectorAll('span'), span => getComputedStyle(span).fontFamily) }
              }))
            }, zoom)
            assert.equal(actual.length, expected.length)
            actual.forEach((row, ri) => { assert.equal(row.length, expected[ri].length); row.forEach((cell, ci) => {
              const source = expected[ri][ci]
              assert.ok(Math.abs(cell.width - source.width) < 1.2, 'Union-grid column width changed')
              assert.equal(cell.text, source.text); assert.equal(cell.colspan, source.colspan); assert.equal(cell.rowspan, source.rowspan); assert.equal(cell.vertical, source.vertical)
              if (source.textFlow === 5) assert.equal(cell.writingMode, 'vertical-rl')
            }) })
            const time = actual[1].find(cell => /17[:：]15/.test(cell.text))
            assert.ok(time); assert.equal(time.lineTops.length, 1, 'Reported time field wraps onto a second line')
            assert.ok(actual.flat().some(cell => cell.families.some(family => family.includes('FangSong') && family.includes('serif'))), 'CJK serif fallback disappeared')
            checks.push({ engine, dpr, zoom, status: 'pass', geometry: actual })
          }
          await page.screenshot({ path: path.join(output, `${engine}-dpr${dpr}.png`) })
          assert.equal(await page.evaluate(() => { nativeTableHandle.unmount(); return document.getElementById('host').childElementCount }), 0)
        } finally { await page.close() }
      }
    } finally { await browser.close() }
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, [])
} finally { await writeFile(path.join(output, 'report.json'), JSON.stringify({ sha256, checks, errors, external }, null, 2)) }
console.log(`Reported native DOC: ${checks.length} real renderer table, font and time-field checks passed.`)
