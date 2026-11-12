import { describe, expect, it } from 'vitest'
import { createEmptyVirtualState, DEFAULT_SHEET_DEFAULTS, RowState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import { createTableConfig, detectIndexOffset } from '../packages/renderers/spreadsheet/src/spreadsheet/view'
import { sanitizeFileViewerOptions } from '../packages/core/src/config/options'

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

  it.each([
    { name: 'field header', first: ['Name', 'Product', 'Total'], offset: 1 },
    { name: 'ordinary all-text data', first: ['Alice', 'West', 'Active'], offset: 1 },
    { name: 'negative numeric text', first: ['-1', '-2', '-3'], offset: 1 },
    { name: 'numeric first row', first: ['1', '2', '3'], offset: 0 },
    { name: 'date first row', first: ['2026-01-01', '2026/02/01', '2026.03.01'], offset: 0 },
    { name: 'sparse first row', first: ['Name', '', 'Total'], offset: 0 },
    { name: 'merged header', first: ['Name', 'Product', 'Total'], merge: [{}], offset: 0 },
    { name: 'single row', first: ['Name', 'Product', 'Total'], single: true, offset: 0 },
    { name: 'sparse second row', first: ['Name', 'Product', 'Total'], second: ['Alice'], offset: 0 },
  ])('restores only the explicit legacy heuristic: $name', ({ first, offset, merge, single, second }) => {
    const ws = { meta: { totalCols: 3 }, merge: merge || [], data: single ? [first] : [first, second || ['Jan', 10, 20]] } as any
    expect(detectIndexOffset(ws)).toBe(0)
    expect(detectIndexOffset(ws, 'source')).toBe(0)
    expect(detectIndexOffset(ws, 'legacy-records')).toBe(offset)
    // Invalid JavaScript input must not accidentally enable the old display.
    expect(detectIndexOffset(ws, 'auto' as any)).toBe(0)
  })

  it('keeps the public row-number option through configuration serialization', () => {
    for (const mode of ['source', 'legacy-records'] as const) {
      const serialized = sanitizeFileViewerOptions({ spreadsheet: { rowNumberMode: mode } })
      expect(serialized?.spreadsheet?.rowNumberMode).toBe(mode)
    }
  })
})
