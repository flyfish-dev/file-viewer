import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createEmptyVirtualState, DEFAULT_SHEET_DEFAULTS, displayCellKey, RowState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { createTableConfig, getDisplayColumns } from '../packages/renderers/spreadsheet/src/spreadsheet/view'

interface FixtureOptions {
  rowHeights?: number[]
  colspan?: number
  frozenRows?: number
}

const mixedRowHeights = [16, 28, 40, 15, 23, 39, 27, 19, 36]

const fixture = (zoom = 1, { rowHeights, colspan = 5, frozenRows = 0 }: FixtureOptions = {}) => {
  const state = createEmptyVirtualState()
  const rowspan = rowHeights ? 5 : 2
  state.columns = [{ key: '__index', width: 68 }, ...[70, 80, 110, 90, 120, 100, 130, 140].map((width, index) => ({ key: `c${index}`, width }))]
  state.rows = Array.from({ length: rowHeights?.length ?? 5 }, (_, index) => ({ __k: `row-${index}`, __s: RowState.Loaded, c1: index === 2 ? 'Merged heading' : '' }))
  if (frozenRows) state.freeze = { rows: frozenRows, columns: 0 }
  state.mergeStartMap.set(displayCellKey(2, 2), { row: 2, col: 2, rowspan, colspan })
  for (let row = 2; row < 2 + rowspan; row++) {
    for (let col = 2; col < 2 + colspan; col++) {
      if (row !== 2 || col !== 2) state.mergeCoveredMap.set(displayCellKey(row, col), displayCellKey(2, 2))
    }
  }
  state.cellCache.set(displayCellKey(2, 2), {
    backgroundColor: '#c0d0e0', color: '#123456', horizontalAlign: 'center', font: 'bold 16px serif', wrapText: true,
    ...(rowHeights ? { verticalAlign: 'middle' as const } : {}),
    ...(frozenRows ? {
      borderTop: { color: '#123456', style: 'solid', width: 1 },
      borderBottom: { color: '#123456', style: 'solid', width: 1 }
    } : {})
  })
  let top = 0
  const rowPositions = rowHeights?.map(height => {
    const position = { top, bottom: top + height * zoom }
    top = position.bottom
    return position
  })
  const columns = getDisplayColumns(state.columns, zoom)
  const config = createTableConfig({
    hostHeight: 500, sheetDefaults: DEFAULT_SHEET_DEFAULTS, virtualState: state, zoomScale: zoom,
    ...(rowPositions ? { getRowPosition: (index: number) => rowPositions[index] } : {}),
    ...(frozenRows ? { getFrozenRowCount: () => frozenRows } : {})
  })
  const params = (row: number, col: number, firstVisible: number, headIndex = 0) => ({
    row: state.rows[row], rowIndex: row, colIndex: col, column: columns[col],
    value: state.rows[row]?.[`c${col - 1}`], visibleLeafColumns: columns.slice(firstVisible), headIndex
  })
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

describe('merged spreadsheet cells across vertical virtualization', () => {
  it('keeps the anchor text at its original position as the first row scrolls out and back', () => {
    const f = fixture(1, { rowHeights: mixedRowHeights, colspan: 1 })
    const before = JSON.stringify(f.state.rows)
    const representative = f.params(4, 2, 1, 4)
    const covered = f.params(5, 2, 1, 4)
    expect(f.config.SPAN_METHOD(representative)).toMatchObject({ rowspan: 3, colspan: 1 })
    expect(f.config.SPAN_METHOD(covered)).toMatchObject({ rowspan: 0, colspan: 0 })
    expect(f.config.BODY_CELL_RENDER_METHOD(covered)).toBeUndefined()
    expect(f.config.BODY_CELL_STYLE_METHOD(representative)).toMatchObject({ backgroundColor: '#c0d0e0', color: '#123456' })
    expect(f.config.BODY_CELL_FORMATTER_METHOD(representative)).toBe('')

    const dom = new JSDOM('<div id="cell"></div>')
    try {
      const cell = dom.window.document.querySelector<HTMLDivElement>('#cell')!
      f.config.BODY_CELL_RENDER_METHOD(representative)(cell)
      expect(cell.textContent).toBe('Merged heading')
      expect(cell.style.overflow).toBe('hidden')
      const text = cell.firstElementChild as HTMLElement
      expect(text.style.top).toBe('-55px')
      expect(text.style.height).toBe('144px')
      expect(text.style.alignItems).toBe('center')
      expect(text.style.color).toBe('rgb(18, 52, 86)')

      const restored = f.params(2, 2, 1, 2)
      const formerlyProjected = f.params(4, 2, 1, 2)
      expect(f.config.SPAN_METHOD(restored)).toMatchObject({ rowspan: 5, colspan: 1 })
      expect(f.config.SPAN_METHOD(formerlyProjected)).toMatchObject({ rowspan: 0, colspan: 0 })
      expect(f.config.BODY_CELL_RENDER_METHOD(formerlyProjected)).toBeUndefined()
      f.config.BODY_CELL_RENDER_METHOD(restored)(cell)
      expect(cell.textContent).toBe('Merged heading')
      expect(['', '0px']).toContain((cell.firstElementChild as HTMLElement).style.top)
      expect(JSON.stringify(f.state.rows)).toBe(before)
    } finally { dom.window.close() }
  })

  it('preserves both offsets when rows and columns clip a merge at the same time', () => {
    const f = fixture(1.5, { rowHeights: mixedRowHeights })
    const representative = f.params(4, 4, 4, 4)
    expect(f.config.SPAN_METHOD(representative)).toMatchObject({ rowspan: 3, colspan: 3 })
    expect(f.config.SPAN_METHOD(f.params(4, 5, 4, 4))).toMatchObject({ rowspan: 0, colspan: 0 })
    expect(f.config.SPAN_METHOD(f.params(5, 4, 4, 4))).toMatchObject({ rowspan: 0, colspan: 0 })

    const dom = new JSDOM('<div id="cell"></div>')
    try {
      const cell = dom.window.document.querySelector<HTMLDivElement>('#cell')!
      f.config.BODY_CELL_RENDER_METHOD(representative)(cell)
      expect(cell.textContent).toBe('Merged heading')
      const text = cell.firstElementChild as HTMLElement
      expect(text.style.left).toBe('-285px')
      expect(text.style.width).toBe('750px')
      expect(text.style.top).toBe('-82.5px')
      expect(text.style.height).toBe('216px')
    } finally { dom.window.close() }
  })

  it('uses the first visible covered row when the render head is a hidden anchor', () => {
    const rowHeights = [...mixedRowHeights]
    rowHeights[2] = 0.1
    const f = fixture(1, { rowHeights, colspan: 1 })
    f.state.rows[2]._height = rowHeights[2]
    const hiddenAnchor = f.params(2, 2, 1, 2)
    const representative = f.params(3, 2, 1, 2)
    expect(f.config.SPAN_METHOD(hiddenAnchor)).toMatchObject({ rowspan: 0, colspan: 0 })
    expect(f.config.BODY_CELL_RENDER_METHOD(hiddenAnchor)).toBeUndefined()
    expect(f.config.SPAN_METHOD(representative)).toMatchObject({ rowspan: 4, colspan: 1 })
    expect(f.config.SPAN_METHOD(f.params(4, 2, 1, 2))).toMatchObject({ rowspan: 0, colspan: 0 })

    const dom = new JSDOM('<div id="cell"></div>')
    try {
      const cell = dom.window.document.querySelector<HTMLDivElement>('#cell')!
      f.config.BODY_CELL_RENDER_METHOD(representative)(cell)
      expect(cell.textContent).toBe('Merged heading')
      const text = cell.firstElementChild as HTMLElement
      expect(Number.parseFloat(text.style.top)).toBeCloseTo(-0.1)
      expect(Number.parseFloat(text.style.height)).toBeCloseTo(104.1)
    } finally { dom.window.close() }
  })

  it('splits a merge across frozen rows without drawing a top edge at the scroll cut', () => {
    const f = fixture(1, { rowHeights: mixedRowHeights, colspan: 1, frozenRows: 4 })
    const frozenAnchor = f.params(2, 2, 1, 5)
    const scrollingAnchor = f.params(5, 2, 1, 5)
    expect(f.config.SPAN_METHOD(frozenAnchor)).toMatchObject({ rowspan: 2, colspan: 1 })
    expect(f.config.SPAN_METHOD(scrollingAnchor)).toMatchObject({ rowspan: 2, colspan: 1 })

    const dom = new JSDOM('<div id="cell"></div>')
    try {
      const cell = dom.window.document.querySelector<HTMLDivElement>('#cell')!
      f.config.BODY_CELL_RENDER_METHOD(scrollingAnchor)(cell)
      expect(cell.textContent).toBe('Merged heading')
      expect((cell.firstElementChild as HTMLElement).style.top).toBe('-78px')
      const edges = Array.from(cell.children, element => (element as HTMLElement).style)
        .filter(style => style.borderTop)
      expect(edges).toHaveLength(1)
      expect(edges[0].bottom).toBe('-0.5px')
    } finally { dom.window.close() }
  })
})
