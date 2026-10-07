import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest } from '../dist/spreadsheet/worker/sheetjs/index.js'

const root = path.resolve(import.meta.dirname, '../../../..')
const require = createRequire(path.join(root, 'package.json'))
const { build } = require('esbuild')
const { chromium } = require('playwright')
const JSZip = require('jszip')
const { DOMParser } = createRequire(path.join(root, 'packages/renderers/ofd/package.json'))('@xmldom/xmldom')
const sample = process.env.SPREADSHEET_COLUMN_SAMPLE
assert.ok(sample, 'Set SPREADSHEET_COLUMN_SAMPLE to the original workbook')
const bytes = await readFile(sample)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const zip = await JSZip.loadAsync(bytes)
const xml = async name => new DOMParser().parseFromString((await zip.file(name).async('string')).replace(/^\uFEFF/, ''), 'text/xml')
const elements = (doc, name) => Array.from(doc.getElementsByTagNameNS('*', name))
const workbook = await xml('xl/workbook.xml')
const relations = new Map(elements(await xml('xl/_rels/workbook.xml.rels'), 'Relationship')
  .map(node => [node.getAttribute('Id'), node.getAttribute('Target')]))
const context = createSpreadsheetParserContext()
const responses = await handleSpreadsheetWorkerRequest(context, { type: 'parseWorkbook',
  payload: { workbook: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), filename: 'columns.xlsx' } })
const sheets = responses.find(response => response.type === 'sheets').payload.sheets
const authored = elements(workbook, 'sheet').filter(node => node.getAttribute('state') !== 'veryHidden' && node.getAttribute('state') !== 'hidden')
assert.equal(sheets.length, authored.length)
const checks = [], expectedSheets = []
for (let index = 0; index < sheets.length; index++) {
  const node = authored[index]
  const relationship = node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
  const target = relations.get(relationship)
  const part = target.startsWith('/') ? target.slice(1) : path.posix.normalize('xl/' + target)
  const columns = elements(await xml(part), 'col')
  const parsed = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet',
    payload: { sheet: sheets[index].id, startRow: 0, pageSize: 32, sessionId: index + 1 } })
  const widths = parsed.find(response => response.type === 'parseSheet').payload.sheetData.structure.colWidths
  const expected = []
  for (const column of columns) {
    const width = Number(column.getAttribute('width'))
    if (!Number.isFinite(width) || !column.hasAttribute('width')) continue
    // ISO/IEC 29500 column width -> pixels, with a 7 px maximum digit width.
    // This oracle reads the package XML independently of the renderer parser.
    const pixels = Math.trunc(((256 * width + Math.trunc(128 / 7)) / 256) * 7)
    for (let col = Number(column.getAttribute('min')) - 1; col < Math.min(Number(column.getAttribute('max')), widths.length); col++) {
      assert.equal(widths[col], pixels, `Sheet ${index + 1}, column ${col + 1}`)
      expected.push({ col, pixels })
    }
  }
  assert.ok(expected.length, `Sheet ${index + 1} has no independently checked widths`)
  expectedSheets.push({ name: sheets[index].name, expected })
  checks.push({ sheet: index + 1, stage: 'parser', columns: expected.length, status: 'pass' })
}

const entry = path.join(root, 'packages/renderers/spreadsheet/src/spreadsheet.ts')
const bundle = await build({ stdin: { contents: `import render from ${JSON.stringify(entry)};globalThis.columnTestRender=render;`, resolveDir: root },
  bundle: true, format: 'iife', write: false, logLevel: 'warning', plugins: [{
    name: 'observe-real-column-layout', setup(builder) {
      builder.onLoad({ filter: /\/spreadsheet\/src\/spreadsheet\.ts$/ }, async ({ path: sourcePath }) => {
        const source = await readFile(sourcePath, 'utf8')
        const marker = '  emitParseWorkbook();\n\n  return {'
        assert.equal(source.split(marker).length, 2)
        return { contents: source.replace(marker, `  globalThis.columnTestTable = () => table;\n${marker}`), loader: 'ts' }
      })
    }
  }] })
const output = path.join(root, 'output/spreadsheet-original-columns')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = [], external = []
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 850 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.route(/^https?:/, route => { external.push(route.request().url()); return route.abort() })
  await page.setContent('<!doctype html><meta charset="utf-8"><div id="host" style="width:1050px;height:750px"></div>')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(async base64 => {
    globalThis.columnHandle = await columnTestRender(Uint8Array.from(atob(base64), char => char.charCodeAt(0)).buffer,
      document.getElementById('host'), 'xlsx', { filename: 'columns.xlsx', options: { spreadsheet: { worker: false } } })
  }, bytes.toString('base64'))
  await page.waitForFunction(() => typeof columnTestTable === 'function' && !!columnTestTable())
  const paint = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  for (let index = 0; index < expectedSheets.length; index++) {
    if (index) await page.getByRole('button', { name: expectedSheets[index].name, exact: true }).click()
    await page.waitForTimeout(750)
    for (const zoom of [1, 0.5, 2]) {
      await page.evaluate(zoom => document.querySelector('.excel-wrapper').__flyfishViewerZoomProvider.setZoom(zoom), zoom)
      await paint()
      const columns = await page.evaluate(() => columnTestTable().ctx.header.leafCellHeaders.map(column => ({ key: column.key, width: column.width })))
      for (const { col, pixels } of expectedSheets[index].expected) {
        const actual = columns.find(column => column.key === `c${col}`)
        assert.ok(actual, `Sheet ${index + 1}, column ${col + 1} is missing from the real table`)
        assert.equal(actual.width, Math.round(pixels * zoom), `Sheet ${index + 1}, column ${col + 1}, zoom ${zoom}`)
      }
      checks.push({ sheet: index + 1, stage: 'browser', zoom, columns: expectedSheets[index].expected.length, status: 'pass' })
    }
    if (!index) await page.screenshot({ path: path.join(output, 'first-sheet.png') })
  }
  await page.evaluate(() => columnHandle.unmount())
  assert.deepEqual(errors, [])
  assert.deepEqual(external, [])
  assert.equal(createHash('sha256').update(await readFile(sample)).digest('hex'), sha256)
} finally {
  await browser.close()
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ sha256, sheets: sheets.length,
    checkedColumns: expectedSheets.reduce((sum, sheet) => sum + sheet.expected.length, 0), checks, errors, external }, null, 2))
}
console.log(`Original workbook: ${sheets.length} sheets, ${checks.length} independent parser and browser width checks passed.`)
