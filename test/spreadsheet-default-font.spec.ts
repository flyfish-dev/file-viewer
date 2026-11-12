import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSpreadsheetParserContext, parseSpreadsheetWorkbook, parseSpreadsheetSheet, searchSpreadsheetWorkbook } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import { readWorkbookDefaultFont } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/workbookFont'
import SheetJsModel from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/SheetJsModel'
import { createEmptyVirtualState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { buildFont, createTableConfig, normalizeCellStyle } from '../packages/renderers/spreadsheet/src/spreadsheet/view'

const require = createRequire(new URL('../packages/renderers/spreadsheet/package.json', import.meta.url))
const JSZip = require('jszip')
const original = readFileSync(new URL('./fixtures/spreadsheet-default-font/unstyled-cells.xlsx', import.meta.url))
const fixture = async (fonts: string, styleXfs: string, cellXfs: string, normalXf = 0, sheet?: string) => {
  const zip = await JSZip.loadAsync(original)
  let xml = await zip.file('xl/styles.xml').async('string')
  xml = xml.replace(/<fonts[\s\S]*?<\/fonts>/, `<fonts count="${(fonts.match(/<font>/g) || []).length}">${fonts}</fonts>`)
    .replace(/<cellStyleXfs[\s\S]*?<\/cellStyleXfs>/, `<cellStyleXfs count="${(styleXfs.match(/<xf/g) || []).length}">${styleXfs.replace(/ xfId="\d+"/g, '')}</cellStyleXfs>`)
    .replace(/<cellXfs[\s\S]*?<\/cellXfs>/, `<cellXfs count="${(cellXfs.match(/<xf/g) || []).length}">${cellXfs}</cellXfs>`)
    .replace('<cellStyle name="Normal" xfId="0"', `<cellStyle name="Normal" xfId="${normalXf}"`)
  zip.file('xl/styles.xml', xml)
  if (sheet) zip.file('xl/worksheets/sheet1.xml', sheet)
  return zip.generateAsync({ type: 'arraybuffer' }) as Promise<ArrayBuffer>
}
const font = (name: string, size: number, decoration = '') => `<font><sz val="${size}"/><name val="${name}"/>${decoration}</font>`
const xf = (fontId?: number, parent = 0, flags = '') => `<xf numFmtId="0" fillId="0" borderId="0" xfId="${parent}"${fontId === undefined ? '' : ` fontId="${fontId}"`}${flags}/>`
const parse = async (bytes: Uint8Array | ArrayBuffer) => {
  const context = createSpreadsheetParserContext()
  const buffer = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const responses = await parseSpreadsheetWorkbook(context, buffer)
  expect(responses.some(response => response.type === 'parseError')).toBe(false)
  return { context, data: parseSpreadsheetSheet(context, { sheet: 0 })[0].payload!.sheetData }
}

describe('spreadsheet workbook default fonts (#453)', () => {
  it('uses the actual issue workbook: styled and unstyled cells have the same 11pt font', async () => {
    const { data } = await parse(original)
    for (let row = 0; row < 4; row += 1) {
      expect(data.cell[`${row}-0`].style).toMatchObject({ fontFamily: 'Calibri', fontSize: `${11 * 96 / 72}px` })
    }
  })

  it.each(['', ' applyFont="0"', ' applyFont="1"'])('uses the referenced default font rather than fonts[0], flags=%s', async flags => {
    const bytes = await fixture(font('Unused', 8) + font('Arial', 18) + font('Parent', 10), xf(2), xf(1, 0, flags) + xf(1, 0, ' applyFont="1"'))
    const { data } = await parse(bytes)
    expect(data.cell['0-0'].style).toMatchObject({ fontFamily: 'Arial', fontSize: '24px' })
    expect(data.cell['1-0'].style).toEqual(data.cell['0-0'].style)
  })

  it('follows a nonzero parent XF and does not leak default bold/italic into an explicit normal font', async () => {
    const bytes = await fixture(font('Unused', 8) + font('Arial', 13, '<b/><i/>') + font('Calibri', 10.5), xf(0) + xf(1), xf(undefined, 1) + xf(2, 1, ' applyFont="1"'), 1)
    const { data } = await parse(bytes)
    expect(data.cell['1-0'].style).toMatchObject({ fontFamily: 'Arial', fontSize: `${13 * 96 / 72}px`, fontWeight: 'bold', fontStyle: 'italic' })
    expect(data.cell['0-0'].style).toMatchObject({ fontFamily: 'Calibri', fontSize: '14px' })
    expect(data.cell['0-0'].style.fontWeight).toBeUndefined()
    expect(data.cell['0-0'].style.fontStyle).toBeUndefined()
    expect(buildFont(data.cell['0-0'].style)).toBe('normal normal 14px "Calibri"')
  })

  it('retains column, row and explicit cell precedence when the reader supplies their styles', () => {
    const sheet = { '!ref': 'A1:A3', '!cols': [{ s: { font: { name: 'Arial', sz: 9 } } }],
      '!rows': [undefined, { s: { font: { name: 'Arial', sz: 12 } } }, { s: { font: { name: 'Arial', sz: 12 } } }],
      A1: { t: 's', v: 'Column' }, A2: { t: 's', v: 'Row' }, A3: { t: 's', v: 'Cell', s: { font: { name: 'Arial', sz: 18 } } } } as any
    const data = SheetJsModel.create(sheet, { defaultFont: { name: 'Calibri', sz: 11 } }).toObject()
    expect([0, 1, 2].map(row => data.cell[`${row}-0`].style.fontSize)).toEqual(['12px', '16px', '24px'])
  })

  it('keeps defaults, font metadata, search and source positions across 500-row windows and zoom', async () => {
    const rows = Array.from({ length: 601 }, (_, index) => `<row r="${index + 1}"><c r="A${index + 1}" t="inlineStr"><is><t>Target-${index}</t></is></c></row>`).join('')
    const bytes = await fixture(font('Arial', 18), xf(0), xf(0) + xf(0), 0, `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`)
    const { context, data } = await parse(bytes)
    const second = parseSpreadsheetSheet(context, { sheet: 0, startRow: 500, pageSize: 500 })[0].payload!.sheetData
    expect(data.cell['0-0'].style).toEqual(second.cell['0-0'].style)
    expect(second.cell['100-0'].style).toMatchObject({ fontFamily: 'Arial', fontSize: '24px' })
    expect(searchSpreadsheetWorkbook(context, 'Target-550', { wholeWord: true })[0]).toMatchObject({ row: 550, col: 0 })
    const state = createEmptyVirtualState()
    state.cellCache.set('550-1', normalizeCellStyle(second.cell['50-0'])!)
    const config = createTableConfig({ hostHeight: 400, sheetDefaults: second.defaults, virtualState: state, zoomScale: 1.5 })
    const style = (config.BODY_CELL_STYLE_METHOD as Function)({ row: { __s: 2 }, rowIndex: 550, colIndex: 1, column: { key: 'c0' } })
    expect(style.font).toBe('normal normal 36px "Arial"')
    expect(second.cell['50-0'].style.fontSize).toBe('24px')
  })

  it('keeps sparse empty cells empty and leaves raw workbook fonts unchanged', () => {
    const defaultFont = { name: 'Arial', sz: 18, bold: true }
    const sheet = { '!ref': 'A1:Z500', A1: { t: 's', v: 'Only value' } } as any
    const model = SheetJsModel.create(sheet, { defaultFont }).toObject()
    expect(Object.keys(model.cell || {})).toEqual(['0-0'])
    expect(sheet.A1.s).toBeUndefined()
    expect(sheet.A1.v).toBe('Only value')
    expect(defaultFont).toEqual({ name: 'Arial', sz: 18, bold: true })
  })

  it('preserves table differential fonts on populated and absent cells without losing default decoration', () => {
    const sheet = {
      '!ref': 'A1:C2', A1: { t: 's', v: 'Header' },
      '!tables': [{ range: { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } },
        styleRules: { wholeTable: { font: { color: { rgb: 'FF0000' } } } } }]
    } as any
    const model = SheetJsModel.create(sheet, { defaultFont: { name: 'Arial', sz: 18, bold: true, italic: true } }).toObject()
    expect(Object.keys(model.cell || {})).toHaveLength(4)
    for (const key of ['0-0', '0-1', '1-0', '1-1']) {
      expect(model.cell![key]!.style).toMatchObject({ fontFamily: 'Arial', fontSize: '24px', fontWeight: 'bold', fontStyle: 'italic', color: '#FF0000' })
    }
    expect(model.cell?.['0-2']).toBeUndefined()
  })

  it('bounds missing and malformed default font references without fabricating a font', () => {
    expect(readWorkbookDefaultFont()).toBeUndefined()
    expect(readWorkbookDefaultFont({ Styles: { Fonts: [], CellXf: [{ fontId: 2 }] } } as any)).toBeUndefined()
    expect(readWorkbookDefaultFont({ Styles: { Fonts: [{ name: 'Unused' }], CellXf: [{ fontId: -1 }] } } as any)).toBeUndefined()
  })
})
