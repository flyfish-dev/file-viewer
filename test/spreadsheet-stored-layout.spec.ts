import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createSpreadsheetParserContext, parseSpreadsheetWorkbook, parseSpreadsheetSheet } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import { readStoredSheetLayout, readWorkbookDigitWidth } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sheetLayout'

const require = createRequire(new URL('../packages/renderers/spreadsheet/package.json', import.meta.url))
const { utils, write } = require('styled-exceljs')
const JSZip = require('jszip')
const fixture = async (format = '<sheetFormatPr defaultColWidth="9" defaultRowHeight="18"/>') => {
  const book = utils.book_new()
  const sheet = utils.aoa_to_sheet([
    ['标题', '数量', '备注'], ['合并后的长注释'.repeat(20), '', ''], ['短', 2, '短']
  ])
  sheet['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }]
  sheet['!cols'] = [undefined, { wpx: 98 }]
  sheet['!rows'] = [{ hpt: 44.7 }]
  utils.book_append_sheet(book, sheet, 'Layout')
  const zip = await JSZip.loadAsync(write(book, { type: 'array', bookType: 'xlsx' }))
  const part = 'xl/worksheets/sheet1.xml'
  const xml = await zip.file(part).async('string')
  zip.file(part, xml.replace(/<sheetFormatPr\b[^>]*\/>/, '').replace('<sheetData>', `${format}<sheetData>`))
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('stored worksheet geometry', () => {
  it('keeps default widths and row heights, explicit column widths and merged notes independent of content', async () => {
    const context = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(context, await fixture())
    const data = parseSpreadsheetSheet(context, { sheet: 0 })[0]?.payload?.sheetData
    expect(data.defaults).toEqual({ colWidth: 63, rowHeight: 24 })
    expect(data.structure.colWidths[0]).toBeUndefined()
    expect(data.structure.colWidths[1]).toBe(98)
    expect(data.structure.colWidths[2]).toBeUndefined()
    expect(data.structure.rowHeights[0]).toBe(60)
    expect(data.structure.merge).toEqual([{ row: 1, col: 0, rowspan: 1, colspan: 3 }])
    expect(data.data[1][0]).toBe('合并后的长注释'.repeat(20))
  })
  it('uses fixed worksheet defaults when sheetFormatPr is missing or invalid', async () => {
    for (const format of ['', '<sheetFormatPr defaultColWidth="NaN" defaultRowHeight="100000"/>']) {
      const context = createSpreadsheetParserContext()
      await parseSpreadsheetWorkbook(context, await fixture(format))
      const data = parseSpreadsheetSheet(context, { sheet: 0 })[0]?.payload?.sheetData
      expect(data.defaults.colWidth).toBe(64)
      expect(data.defaults.rowHeight).toBe(20)
      expect(data.structure.colWidths[0]).toBeUndefined()
    }
  })
  it('retains auto-fit for plain text CSV', async () => {
    const context = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(context, new TextEncoder().encode('列A,列B\n很长的普通文本数据,短\n').buffer, { fileType: 'csv' })
    const data = parseSpreadsheetSheet(context, { sheet: 0 })[0]?.payload?.sheetData
    expect(data.structure.colWidths[0]).toBeGreaterThan(data.structure.colWidths[1])
  })
  it('uses the Normal font digit grid for stored defaults and explicit widths', async () => {
    // Office SimSun/NSimSun use 128-unit digit advances at 256 units/em.
    for (const [name, size, mdw] of [
      ['SimSun', 10.5, 7], ['SimSun', 11, 8], ['SimSun', 12, 8], ['NSimSun', 22, 15]
    ] as const) {
      const zip = await JSZip.loadAsync(await fixture())
      const styles = await zip.file('xl/styles.xml').async('string')
      zip.file('xl/styles.xml', styles.replace(/<name val="[^"]*"\/>/, `<name val="${name}"/>`).replace(/<sz val="[^"]*"\/>/, `<sz val="${size}"/>`))
      const part = 'xl/worksheets/sheet1.xml'
      const xml = await zip.file(part).async('string')
      zip.file(part, xml.replace(/<cols>[\s\S]*?<\/cols>/, '<cols><col min="2" max="2" width="12" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/></cols>'))
      const context = createSpreadsheetParserContext()
      await parseSpreadsheetWorkbook(context, await zip.generateAsync({ type: 'arraybuffer' }))
      const data = parseSpreadsheetSheet(context, { sheet: 0 })[0]?.payload?.sheetData
      expect(data.defaults.colWidth).toBe(9 * mdw)
      expect(data.structure.colWidths).toEqual([undefined, 12 * mdw, 20 * mdw])
    }
  })
  it('resolves a Normal style that references a nonzero font and bounds invalid metrics', () => {
    const book = (name: string, sz: number) => ({ Styles: {
      CellStyles: [{ builtinId: 0, xfId: 1 }], CellStyleXf: [{ fontId: 0 }, { fontId: 1 }],
      Fonts: [{ name: 'Calibri', sz: 11 }, { name, sz }]
    } })
    expect(readWorkbookDigitWidth(book('SimSun', 11) as any)).toBe(8)
    expect(readWorkbookDigitWidth(book('NSimSun', 22) as any)).toBe(15)
    expect(readWorkbookDigitWidth(book('Unmeasured CJK family', 11) as any)).toBe(7)
    expect(readWorkbookDigitWidth(book('SimSun', -1) as any)).toBe(7)
    expect(readWorkbookDigitWidth(book('SimSun', Infinity) as any)).toBe(7)
  })
  it('stops streaming after the header, without inflating the complete worksheet XML as text', async () => {
    const zip = new JSZip()
    zip.file('sheet.xml', '<worksheet><sheetFormatPr defaultColWidth="12"/><sheetData>' + 'x'.repeat(2_000_000) + '</sheetData></worksheet>')
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))
    loaded.file('sheet.xml').async = () => { throw new Error('Full-sheet text read is forbidden') }
    expect(await readStoredSheetLayout(loaded, 'sheet.xml')).toMatchObject({ columnWidth: 12 })
  })
  it('retains root namespace declarations for prefixed format attributes', async () => {
    const zip = new JSZip()
    zip.file('sheet.xml', '<s:worksheet xmlns:s="urn:sheet" xmlns:x="urn:extension"><s:sheetFormatPr defaultColWidth="9" x:dyDescent="0.25"/><s:sheetData/></s:worksheet>')
    expect(await readStoredSheetLayout(zip, 'sheet.xml')).toMatchObject({ columnWidth: 9 })
  })
})
