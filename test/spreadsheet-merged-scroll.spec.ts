import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createEmptyVirtualState, DEFAULT_SHEET_DEFAULTS, displayCellKey, RowState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { createTableConfig, getDisplayColumns } from '../packages/renderers/spreadsheet/src/spreadsheet/view'

const fixture = (zoom = 1) => {
  const state = createEmptyVirtualState()
  state.columns = [{ key: '__index', width: 68 }, ...[70, 80, 110, 90, 120, 100, 130, 140].map((width, index) => ({ key: `c${index}`, width }))]
  state.rows = Array.from({ length: 5 }, (_, index) => ({ __k: `row-${index}`, __s: RowState.Loaded, c1: index === 2 ? 'Merged heading' : '' }))
  state.mergeStartMap.set(displayCellKey(2, 2), { row: 2, col: 2, rowspan: 2, colspan: 5 })
  for (let row = 2; row < 4; row++) {
    for (let col = 2; col < 7; col++) {
      if (row !== 2 || col !== 2) state.mergeCoveredMap.set(displayCellKey(row, col), displayCellKey(2, 2))
    }
  }
  state.cellCache.set(displayCellKey(2, 2), { backgroundColor: '#c0d0e0', color: '#123456', horizontalAlign: 'center', font: 'bold 16px serif', wrapText: true })
  const columns = getDisplayColumns(state.columns, zoom)
  const config = createTableConfig({ hostHeight: 500, sheetDefaults: DEFAULT_SHEET_DEFAULTS, virtualState: state, zoomScale: zoom })
  const params = (row: number, col: number, firstVisible: number) => ({ row: state.rows[row], rowIndex: row, colIndex: col, column: columns[col], value: state.rows[row]?.[`c${col - 1}`], visibleLeafColumns: columns.slice(firstVisible) })
  return { state, config: config as any, params }
}

describe('merged spreadsheet cells across horizontal virtualization', () => {
  it('keeps one visible representative when the original anchor leaves the rendered columns', () => {
    const f = fixture()
    expect(f.config.SPAN_METHOD(f.params(2, 4, 4))).toMatchObject({ rowspan: 2, colspan: 3 })
    expect(f.config.SPAN_METHOD(f.params(2, 5, 4))).toMatchObject({ rowspan: 0, colspan: 0 })
    expect(f.config.SPAN_METHOD(f.params(3, 4, 4))).toMatchObject({ rowspan: 0, colspan: 0 })
    expect(f.config.BODY_CELL_STYLE_METHOD(f.params(2, 4, 4))).toMatchObject({ backgroundColor: '#c0d0e0', color: '#123456' })
  })

  it('retains the anchor text, layout and source data instead of recentering text in the clipped remainder', () => {
    const f = fixture(1.5)
    const before = JSON.stringify(f.state.rows)
    f.config.SPAN_METHOD(f.params(2, 4, 4))
    const render = f.config.BODY_CELL_RENDER_METHOD(f.params(2, 4, 4))
    expect(render).toBeTypeOf('function')
    const dom = new JSDOM('<div id="cell"></div>')
    try {
      const cell = dom.window.document.querySelector<HTMLDivElement>('#cell')!
      render(cell)
      expect(cell.textContent).toBe('Merged heading')
      const text = cell.firstElementChild as HTMLElement
      expect(text.style.width).toBe('750px')
      expect(text.style.left).toBe('-285px')
      expect(text.style.justifyContent).toBe('center')
      expect(text.style.whiteSpace).toBe('pre-wrap')
      expect(text.style.color).toBe('rgb(18, 52, 86)')
      expect(cell.style.overflow).toBe('hidden')
      expect(f.config.BODY_CELL_FORMATTER_METHOD(f.params(2, 4, 4))).toBe('')
      expect(JSON.stringify(f.state.rows)).toBe(before)
      expect(f.state.rows[2].c3).toBeUndefined()
    } finally { dom.window.close() }
  })

  it('returns rendering to the original anchor after scrolling left without duplicate covered cells', () => {
    const f = fixture()
    f.config.SPAN_METHOD(f.params(2, 4, 4))
    expect(f.config.SPAN_METHOD(f.params(2, 2, 1))).toMatchObject({ rowspan: 2, colspan: 5 })
    expect(f.config.SPAN_METHOD(f.params(2, 4, 1))).toMatchObject({ rowspan: 0, colspan: 0 })
    expect(f.config.BODY_CELL_RENDER_METHOD(f.params(2, 4, 1))).toBeUndefined()
    expect(f.config.BODY_CELL_RENDER_METHOD(f.params(2, 2, 1))).toBeTypeOf('function')
  })
})
