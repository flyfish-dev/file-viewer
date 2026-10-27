import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkSheet } from 'styled-exceljs'
import SheetJsModel from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/SheetJsModel'
import { parseCellRichText } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/richText'
import { createEmptyVirtualState, DEFAULT_SHEET_DEFAULTS, RowState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { buildFont, createTableConfig, normalizeCellStyle } from '../packages/renderers/spreadsheet/src/spreadsheet/view'

describe('spreadsheet font point sizes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('converts cell and inherited font sizes to CSS pixels without changing parser values', () => {
    const sheet = {
      '!ref': 'A1:C1',
      '!cols': [{}, {}, { s: { font: { sz: 10.5, name: 'Arial' } } }],
      A1: { t: 's', v: 'Alpha', s: { font: { sz: 9, name: 'Arial' } } },
      B1: { t: 's', v: 'Beta', s: { font: { sz: 11, name: 'Arial' } } },
      C1: { t: 's', v: 'Gamma' }
    } as unknown as WorkSheet
    const model = SheetJsModel.create(sheet).toObject()

    expect(model.cell?.['0-0']?.style.fontSize).toBe('12px')
    expect(model.cell?.['0-1']?.style.fontSize).toBe(`${11 * 96 / 72}px`)
    expect(model.cell?.['0-2']?.style.fontSize).toBe('14px')
    expect(sheet.A1.s.font.sz).toBe(9)
    expect(buildFont(model.cell!['0-1']!.style)).toBe(`normal normal ${11 * 96 / 72}px "Arial"`)
  })

  it('converts rich-text run sizes once and applies view zoom to both font paths', () => {
    const cell = {
      t: 's' as const,
      v: 'AlphaBeta',
      r: '<r><rPr><sz val="9"/></rPr><t>Alpha</t></r><r><rPr><sz val="11"/></rPr><t>Beta</t></r>',
      s: { font: { sz: 9, name: 'Arial' } }
    }
    const sheet = { '!ref': 'A1', A1: cell } as unknown as WorkSheet
    const model = SheetJsModel.create(sheet).toObject()
    const metadata = model.cell!['0-0']!
    expect(parseCellRichText(cell)?.map(run => run.fontSize)).toEqual([12, 11 * 96 / 72])
    const state = createEmptyVirtualState()
    state.cellCache.set('0-1', normalizeCellStyle(metadata)!)
    const config = createTableConfig({
      hostHeight: 400,
      sheetDefaults: DEFAULT_SHEET_DEFAULTS,
      virtualState: state,
      zoomScale: 1.5
    })
    const styleMethod = config.BODY_CELL_STYLE_METHOD as (params: unknown) => Record<string, any>
    const style = styleMethod({ row: { __s: RowState.Loaded }, rowIndex: 0, colIndex: 1, column: { key: 'c0' } })
    expect(style.font).toBe('normal normal 18px "Arial"')
    expect(style.richText.map((run: { fontSize: number }) => run.fontSize)).toEqual([18, 22])
    expect(metadata.richText?.map(run => run.fontSize)).toEqual([12, 11 * 96 / 72])
  })

  it('uses the rendered font size when measuring overflow at a non-default zoom', () => {
    const measuredFonts: string[] = []
    const context = {
      font: '',
      measureText(text: string) {
        measuredFonts.push(this.font)
        return { width: text.length * Number(this.font.match(/([\d.]+)px/)?.[1]) }
      }
    }
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) })
    const state = createEmptyVirtualState()
    state.totalCols = 2
    state.columns = [{ key: '__index', width: 68 }, { key: 'c0', width: 60 }, { key: 'c1', width: 120 }]
    const config = createTableConfig({
      hostHeight: 400,
      sheetDefaults: DEFAULT_SHEET_DEFAULTS,
      virtualState: state,
      zoomScale: 2
    })
    const renderMethod = config.BODY_CELL_RENDER_METHOD as (params: unknown) => unknown
    renderMethod({
      row: { __s: RowState.Loaded, c0: 'Text sample', c1: '' },
      rowIndex: 0,
      colIndex: 1,
      column: state.columns[1],
      value: 'Text sample'
    })
    expect(measuredFonts).toEqual([config.BODY_FONT])
    expect(measuredFonts[0]).toMatch(/^22px /)
  })
})
