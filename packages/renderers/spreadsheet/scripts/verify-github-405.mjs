import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSpreadsheetParserContext,
  getWorksheetDisplayBounds,
  handleSpreadsheetWorkerRequest
} from '../dist/spreadsheet/worker/sheetjs/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturePath = join(packageDir, 'test', 'fixtures', 'github-405-ghost-corner-cells.xlsx')
const bytes = await readFile(fixturePath)
const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const context = createSpreadsheetParserContext()
const workbookResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseWorkbook',
  payload: { workbook: data, filename: 'github-405-ghost-corner-cells.xlsx' }
})
const sheets = workbookResponses.find(response => response.type === 'sheets')?.payload?.sheets || []
const sheet = sheets[0]

if (!sheet) {
  throw new Error('Expected the reported workbook to expose one visible worksheet')
}
if (sheet.rowCount !== 10 || sheet.colCount !== 3) {
  throw new Error(
    `Expected sparse ghost-corner cells to collapse to 10x3, found ${sheet.rowCount}x${sheet.colCount}`
  )
}
if (sheet.rowCount > 1_000 || sheet.colCount > 64) {
  throw new Error(`Display bounds still pathological: ${sheet.rowCount}x${sheet.colCount}`)
}

const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseSheet',
  payload: { sheet: sheet.id, startRow: 0, pageSize: 500, sessionId: 1 }
})
const parsed = sheetResponses.find(response => response.type === 'parseSheet')?.payload?.sheetData
if (!parsed) {
  throw new Error('Expected the compacted worksheet to parse successfully')
}
if (parsed.meta?.totalRows !== 10 || parsed.data?.length !== 10) {
  throw new Error(`Expected a 10-row virtual model, found ${parsed.meta?.totalRows}/${parsed.data?.length}`)
}
if (parsed.data?.[0]?.[0] !== 'r1c1' || parsed.data?.[9]?.[2] !== 'r10c3') {
  throw new Error('Expected the dense A1:C10 content to remain intact after outlier compaction')
}
if (Array.isArray(parsed.structure?.rowHeights) && parsed.structure.rowHeights.length > 10) {
  throw new Error(`Row height vector still expanded to ${parsed.structure.rowHeights.length} entries`)
}

console.log('[spreadsheet] GitHub #405 ghost corner cells compacted to the actual 10x3 worksheet.')

// Exercise real OOXML through the public parser, including virtual windows at
// distant content. A bounds-only check cannot prove that the cell is returned.
const zip = await JSZip.loadAsync(bytes)
const originalXml = await zip.file('xl/worksheets/sheet1.xml').async('string')
const makeWorkbook = async (ref, rows) => {
  zip.file('xl/worksheets/sheet1.xml', originalXml
    .replace(/<dimension\b[^>]*\/>/, `<dimension ref="${ref}"/>`)
    .replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${rows}</sheetData>`))
  return zip.generateAsync({ type: 'arraybuffer' })
}
const rowXml = (row, cells) => `<row r="${row}">${cells}</row>`
const numberCell = (address, value = 42) => `<c r="${address}"><v>${value}</v></c>`
const cases = [
  { name: 'distant real value', ref: 'A1:A2000', rows: rowXml(1, numberCell('A1')) + rowXml(2000, numberCell('A2000', 72)), row: 1999, col: 0, value: '72' },
  { name: 'far-origin data', ref: 'A2000:A2000', rows: rowXml(2000, numberCell('A2000', 73)), row: 1999, col: 0, value: '73' },
  { name: 'distant cached formula', ref: 'A1:A2000', rows: rowXml(1, numberCell('A1')) + rowXml(2000, '<c r="A2000"><f>A1+1</f><v>43</v></c>'), row: 1999, col: 0, value: '43' },
  { name: 'distant uncached formula', ref: 'A1:A2000', rows: rowXml(1, numberCell('A1')) + rowXml(2000, '<c r="A2000"><f>A1+1</f></c>'), row: 1999, col: 0 },
  { name: 'remote column', ref: 'A1:IX1', rows: rowXml(1, numberCell('A1') + numberCell('IX1', 74)), row: 0, col: 257, value: '74' },
  { name: 'large legal row count', ref: 'A1:A100001', rows: Array.from({ length: 100001 }, (_, i) => rowXml(i + 1, numberCell(`A${i + 1}`, i))).join(''), row: 100000, col: 0, value: '100000' },
  { name: 'large legal column count', ref: 'A1:AMK1', rows: rowXml(1, numberCell('A1') + numberCell('AMK1', 75)), row: 0, col: 1024, value: '75' },
  { name: 'false is content', ref: 'A1:A2000', rows: rowXml(1, numberCell('A1')) + rowXml(2000, '<c r="A2000" t="b"><v>0</v></c>'), row: 1999, col: 0, value: 'FALSE' },
  { name: 'zero is content', ref: 'A1:A2000', rows: rowXml(1, numberCell('A1')) + rowXml(2000, numberCell('A2000', 0)), row: 1999, col: 0, value: '0' }
]
for (const entry of cases) {
  const candidate = createSpreadsheetParserContext()
  const responses = await handleSpreadsheetWorkerRequest(candidate, {
    type: 'parseWorkbook', payload: { workbook: await makeWorkbook(entry.ref, entry.rows), filename: 'content-bounds.xlsx' }
  })
  assert.equal(responses.find(r => r.type === 'parseError'), undefined, entry.name)
  const definition = responses.find(r => r.type === 'sheets')?.payload?.sheets?.[0]
  assert.ok(definition?.rowCount > entry.row && definition?.colCount > entry.col, `${entry.name}: content excluded from display bounds`)
  const window = await handleSpreadsheetWorkerRequest(candidate, {
    type: 'parseSheet', payload: { sheet: definition.id, startRow: entry.row, pageSize: 1 }
  })
  const data = window.find(r => r.type === 'parseSheet')?.payload?.sheetData
  assert.ok(data, `${entry.name}: missing virtual window`)
  if (entry.value !== undefined) assert.equal(data.data[0]?.[entry.col], entry.value, entry.name)
}
for (const shape of ['sparse', 'array', 'data']) {
  const content = { t: 'n', v: 0 }
  const formula = { t: 'n', f: '1+1' }
  const style = { t: 'z', s: { border: {} } }
  const rows = []
  rows[1999] = [content]
  rows[2999] = [formula]
  rows[1048533] = []
  rows[1048533][16376] = style
  const input = shape === 'sparse' ? { A2000: content, A3000: formula, XEW1048534: style } : shape === 'array' ? rows : { '!data': rows }
  input['!ref'] = 'A1:XEW1048534'
  assert.equal(getWorksheetDisplayBounds(input).rowCount, 3000, `${shape}: distant formula preserved`)
  assert.equal(getWorksheetDisplayBounds(input).colCount, 1, `${shape}: ghost style excluded`)
}
console.log(`[spreadsheet] #405 preserved distant values, formulas, far origins and legal large sheets (${cases.length} XLSX cases; 3 worksheet storage shapes).`)
