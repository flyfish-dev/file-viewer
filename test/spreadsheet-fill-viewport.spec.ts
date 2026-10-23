import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { createEmptyVirtualState, buildRows } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { buildColumns } from '../packages/renderers/spreadsheet/src/spreadsheet/view'
import { shouldFillSpreadsheetViewport, SpreadsheetViewportFill } from '../packages/renderers/spreadsheet/src/spreadsheet/viewport'
import { createSpreadsheetParserContext, parseSpreadsheetWorkbook, parseSpreadsheetSheet, searchSpreadsheetWorkbook } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'

const { read, utils, write } = createRequire(new URL('../packages/renderers/spreadsheet/package.json', import.meta.url))('styled-exceljs')

// Use the actual parser and exporter so display padding cannot silently become data.
const workbookBytes = () => {
  const book = utils.book_new()
  utils.book_append_sheet(book, utils.aoa_to_sheet([['测试附件', ...Array(13).fill('')]]), 'Small')
  utils.book_append_sheet(book, utils.aoa_to_sheet([]), 'Empty')
  return write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('Excel viewport fill data boundaries', () => {
  it('fills all supported spreadsheet formats by default with an explicit opt-out', () => {
    for (const type of ['xlsx', '.XLSX', 'xlsm', 'xlsb', 'xls', 'xlt', 'xltx', 'xltm', 'xla', 'xlam', 'csv', 'tsv', 'ods', 'fods', 'numbers', 'et', 'ett', 'dbf']) {
      expect(shouldFillSpreadsheetViewport(undefined, type)).toBe(true)
      expect(shouldFillSpreadsheetViewport(true, type)).toBe(true)
      expect(shouldFillSpreadsheetViewport(false, type)).toBe(false)
    }
    for (const type of ['', 'pdf', 'txt']) expect(shouldFillSpreadsheetViewport(true, type)).toBe(false)
  })

  it('retains empty sheets with zero dimensions only when requested', async () => {
    const original = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(original, workbookBytes())
    expect(original.sheets.map(sheet => sheet.name)).toEqual(['Small'])
    const padded = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(padded, workbookBytes(), { includeEmptySheets: true })
    expect(padded.sheets.map(sheet => [sheet.name, sheet.rowCount, sheet.colCount])).toEqual([
      ['Small', 1, 14], ['Empty', 0, 0],
    ])
    const empty = parseSpreadsheetSheet(padded, { sheet: 1 })[0]?.payload?.sheetData
    expect(empty.meta).toMatchObject({ totalRows: 0, totalCols: 0, startRow: 0, endRow: 0 })
    expect(empty.data).toEqual([])
  })

  it('preserves used range, actual cell content, search and exported workbook after resize/zoom padding', async () => {
    const context = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(context, workbookBytes(), { includeEmptySheets: true })
    const model = parseSpreadsheetSheet(context, { sheet: 0 })[0]?.payload?.sheetData
    const state = {
      ...createEmptyVirtualState(), ...buildColumns(model), active: true,
      defaults: model.defaults, totalRows: model.meta.totalRows, totalCols: model.meta.totalCols,
      rows: buildRows(model.meta.totalRows),
    }
    const fill = new SpreadsheetViewportFill()
    const sheet = context.workbook!.Sheets.Small!
    const before = utils.sheet_to_csv(sheet)
    for (const [width, height, zoom] of [[1100, 673, 1], [420, 283, 1], [2000, 853, 0.25], [1100, 673, 2.5]]) {
      fill.build(state, width!, height!, zoom!)
      expect(state.totalRows).toBe(1); expect(state.totalCols).toBe(14)
      expect(state.rows).toHaveLength(1); expect(state.columns).toHaveLength(15)
      expect(sheet['!ref']).toBe('A1:N1')
      expect(utils.sheet_to_csv(sheet)).toBe(before)
      expect(searchSpreadsheetWorkbook(context, '测试附件')).toHaveLength(1)
    }
    const exported = read(write(context.workbook!, { type: 'array', bookType: 'xlsx' }), { type: 'array' })
    expect(exported.Sheets.Small!['!ref']).toBe('A1:N1')
    expect(utils.sheet_to_csv(exported.Sheets.Small!)).toBe(before)
    expect(exported.Sheets.Empty!['!ref']).toBeUndefined()
  })

  it('reuses large-sheet rows instead of allocating a full blank worksheet', () => {
    const state = createEmptyVirtualState()
    state.active = true; state.totalRows = 3000; state.totalCols = 40
    state.rows = buildRows(state.totalRows)
    state.columns = Array.from({ length: 41 }, (_, index) => ({ key: `c${index}`, title: `${index}`, width: 64 }))
    const display = new SpreadsheetViewportFill().build(state, 1100, 720, 1)
    expect(display.rows).toBe(state.rows); expect(display.columns).toBe(state.columns)
  })
})
