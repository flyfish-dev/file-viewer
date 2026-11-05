import { describe, expect, it } from 'vitest'
import { createEmptyVirtualState, DEFAULT_SHEET_DEFAULTS, RowState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { createTableConfig, detectIndexOffset } from '../packages/renderers/spreadsheet/src/spreadsheet/view'

describe('spreadsheet row index offset', () => {
  it('keeps the first row numbered 1 when it looks like a text header', () => {
    const ws = {
      meta: { totalCols: 5 },
      merge: [],
      data: [
        ['Month', 'Product A', 'Product B', 'Product C', 'Total'],
        ['Jan', 10, 20, 30, 60],
        ['Feb', 12, 22, 32, 66],
        ['Mar', 14, 24, 34, 72],
      ],
    } as any

    expect(detectIndexOffset(ws)).toBe(0)

    // The rendered index column is what users compare against Excel, so check the formatter output too.
    const config = createTableConfig({
      hostHeight: 400,
      sheetDefaults: DEFAULT_SHEET_DEFAULTS,
      virtualState: { ...createEmptyVirtualState(), indexOffset: detectIndexOffset(ws) },
    })
    const formatter = config.BODY_CELL_FORMATTER_METHOD as (params: unknown) => string
    const indexLabel = (rowIndex: number) => formatter({
      row: { __s: RowState.Loaded },
      rowIndex,
      colIndex: 0,
      column: { key: '__index' },
      value: undefined,
    })

    expect(indexLabel(0)).toBe('1')
    expect(indexLabel(1)).toBe('2')
    expect(indexLabel(3)).toBe('4')
  })
})
