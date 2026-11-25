import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import {
  createSpreadsheetParserContext,
  parseSpreadsheetSheet,
  parseSpreadsheetWorkbook
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import { readStoredSheetLayout } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sheetLayout'

const require = createRequire(new URL('../packages/renderers/spreadsheet/package.json', import.meta.url))
const { utils, write } = require('styled-exceljs')
const JSZip = require('jszip')

const workbookWithPanes = async (views: string[]) => {
  const book = utils.book_new()
  views.forEach((_, index) => {
    utils.book_append_sheet(book, utils.aoa_to_sheet([
      ['Team', 'Sprint', 'Status'],
      ['A', 'W01', 'Done'],
      ['B', 'W02', 'Draft'],
      ['C', 'W03', 'Review']
    ]), `Sheet ${index + 1}`)
  })
  const zip = await JSZip.loadAsync(write(book, { type: 'array', bookType: 'xlsx' }))
  for (const [index, view] of views.entries()) {
    const part = `xl/worksheets/sheet${index + 1}.xml`
    const xml = await zip.file(part).async('string')
    zip.file(part, xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, view)
      .replace(/<sheetFormatPr\b[^>]*\/>/, ''))
  }
  return zip.generateAsync({ type: 'arraybuffer' })
}

const primaryView = (pane: string) =>
  `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`

describe('stored frozen panes', () => {
  it('preserves each sheet’s frozen rows and columns on the first worker window', async () => {
    const context = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(context, await workbookWithPanes([
      '<sheetViews><sheetView workbookViewId="1"><pane xSplit="2" state="frozen"/></sheetView>'
        + '<sheetView workbookViewId="0"><pane xSplit="1" ySplit="2.0" topLeftCell="D7" state="frozen"/></sheetView></sheetViews>',
      primaryView('<pane ySplit="1" state="frozen"/>'),
      primaryView('<pane xSplit="2E0" state="frozenSplit"/>'),
      primaryView('<pane xSplit="4800" ySplit="1600" state="split"/>'),
      primaryView('')
    ]))
    expect(context.sheets).toHaveLength(5)
    const freeze = (sheet: number) =>
      parseSpreadsheetSheet(context, { sheet })[0]?.payload?.sheetData?.structure?.freeze
    expect(freeze(0)).toEqual({ rows: 2, columns: 1 })
    expect(freeze(1)).toEqual({ rows: 1, columns: 0 })
    expect(freeze(2)).toEqual({ rows: 0, columns: 2 })
    expect(freeze(3)).toBeUndefined()
    expect(freeze(4)).toBeUndefined()
    expect(parseSpreadsheetSheet(context, { sheet: 0, startRow: 1 })[0]?.payload?.sheetData?.structure).toBeUndefined()
  })

  it('ignores invalid splits and clamps valid counts to the available sheet', async () => {
    const context = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(context, await workbookWithPanes([
      primaryView('<pane xSplit="1000000000" ySplit="3.5" state="frozen"/>'),
      primaryView('<pane xSplit="0x2" ySplit="-3" state="frozen"/>')
    ]))
    expect(parseSpreadsheetSheet(context, { sheet: 0 })[0]?.payload?.sheetData?.structure?.freeze)
      .toEqual({ rows: 0, columns: 3 })
    expect(parseSpreadsheetSheet(context, { sheet: 1 })[0]?.payload?.sheetData?.structure?.freeze)
      .toBeUndefined()
  })

  it('reads namespaced pane and size metadata without reading all cell XML', async () => {
    const zip = new JSZip()
    zip.file('sheet.xml', '<s:worksheet xmlns:s="urn:sheet">'
      + '<s:sheetViews><s:sheetView workbookViewId="0"><s:pane xSplit="1" ySplit="2" state="frozen"/>'
      + '</s:sheetView></s:sheetViews><s:sheetFormatPr defaultRowHeight="24"/>'
      + '<s:sheetData>' + 'x'.repeat(2_000_000) + '</s:sheetData></s:worksheet>')
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))
    loaded.file('sheet.xml').async = () => { throw new Error('Full-sheet text read is forbidden') }
    expect(await readStoredSheetLayout(loaded, 'sheet.xml'))
      .toMatchObject({ rowHeightPt: 24, freeze: { rows: 2, columns: 1 } })
  })
})
