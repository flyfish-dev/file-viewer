import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSpreadsheetParserContext,
  handleSpreadsheetWorkerRequest
} from '../dist/spreadsheet/worker/sheetjs/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturePath = join(packageDir, 'test', 'fixtures', 'github-175-pathological-dimension.xlsx')
const bytes = await readFile(fixturePath)
const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const context = createSpreadsheetParserContext()
const workbookResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseWorkbook',
  payload: { workbook: data, filename: 'github-175-pathological-dimension.xlsx' }
})
const sheets = workbookResponses.find(response => response.type === 'sheets')?.payload?.sheets || []
const sheet = sheets[0]

if (!sheet) {
  throw new Error('Expected the reported workbook to expose one visible worksheet')
}
if (sheet.rowCount !== 26 || sheet.colCount !== 18) {
  throw new Error(`Expected effective bounds 26x18, found ${sheet.rowCount}x${sheet.colCount}`)
}

const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseSheet',
  payload: { sheet: sheet.id, startRow: 0, pageSize: 500, sessionId: 1 }
})
const parsed = sheetResponses.find(response => response.type === 'parseSheet')?.payload?.sheetData
if (!parsed) {
  throw new Error('Expected the trimmed worksheet to parse successfully')
}
if (parsed.meta?.totalRows !== 26 || parsed.data?.length !== 26) {
  throw new Error(`Expected a 26-row virtual model, found ${parsed.meta?.totalRows}/${parsed.data?.length}`)
}
if (parsed.data?.[0]?.[0] !== 'PO Create Date' || parsed.data?.[0]?.[17] !== 'Remark') {
  throw new Error('Expected the source header row to remain intact after range trimming')
}
if (Array.isArray(parsed.structure?.rowHeights) && parsed.structure.rowHeights.length > 26) {
  throw new Error(`Row height vector still expanded to ${parsed.structure.rowHeights.length} entries`)
}

console.log('[spreadsheet] GitHub #175 pathological dimensions trimmed to the actual 26x18 worksheet.')
