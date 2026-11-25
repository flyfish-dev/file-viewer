import type { Align, Column, VerticalAlign } from 'e-virt-table'
import { ORDINARY_GRID_BUDGET } from './sourceRegion.js'
import type { CellMerge, SheetFreezePane, SheetRichTextRun } from './worker/type.js'

export const WINDOW_SIZE = 500
export const PREFETCH_AHEAD = 3
export const PREFETCH_BEHIND = 1
export const INDEX_COLUMN_KEY = '__index'
export const ROW_KEY_FIELD = '__k'
export const ROW_STATE_FIELD = '__s'

export const getOrdinaryWindowSize = (columns: number) =>
  Math.min(WINDOW_SIZE, Math.max(1, Math.floor(ORDINARY_GRID_BUDGET.windowCells / Math.max(1, columns))))

export interface SheetDefaults {
  rowHeight: number
  colWidth: number
}

export const DEFAULT_SHEET_DEFAULTS: SheetDefaults = {
  rowHeight: 20,
  colWidth: 64
}

export const RowState = {
  Placeholder: 0,
  Loading: 1,
  Loaded: 2
} as const

export type RowStateValue = (typeof RowState)[keyof typeof RowState]

export interface VirtualRow extends Record<string, any> {
  __k: string
  __s: RowStateValue
  __baseHeight?: number
  _height?: number
}

export interface CellBorderCache {
  width: number
  style: string
  color: string
}

export interface CellStyleCache {
  richText?: SheetRichTextRun[]
  backgroundColor?: string
  color?: string
  font?: string
  horizontalAlign?: Align
  verticalAlign?: VerticalAlign
  wrapText?: boolean
  shrinkToFit?: boolean
  borderTop?: CellBorderCache
  borderRight?: CellBorderCache
  borderBottom?: CellBorderCache
  borderLeft?: CellBorderCache
}

export interface VirtualSheetState {
  active: boolean
  totalRows: number
  totalCols: number
  windowSize: number
  indexOffset: number
  freeze?: SheetFreezePane
  /** Data columns still frozen after accounting for the display width. */
  visibleFrozenColumns?: number
  defaults: SheetDefaults
  dataKeys: string[]
  rows: VirtualRow[]
  columns: Column[]
  cellCache: Map<string, CellStyleCache>
  mergeStartMap: Map<string, CellMerge>
  /** Covered display cell -> original merge anchor, without copying cell data. */
  mergeCoveredMap: Map<string, string>
  rowHeightCache: Map<number, number>
  sourceRowHeights: Map<number, number>
  fixedHeightRows: Set<number>
  autoHeightDisabled: boolean
  autoHeightCells: Map<number, Set<number>>
  autoRowHeights: Map<number, number>
  autoHeightRevision: number
  /** Unscaled user sizes take precedence over asynchronously loaded metrics. */
  rowHeightOverrides: Map<number, number>
  windowRows: Map<number, number[]>
  windowCells: Map<number, string[]>
  loadedWindows: Set<number>
  loadingWindows: Set<number>
}

export type ScrollDirection = 1 | -1

interface CollectWindowStartsOptions {
  direction: ScrollDirection
  endRow: number
  far?: boolean
  startRow: number
  totalRows: number
  windowSize?: number
}

export const createEmptyVirtualState = (windowSize = WINDOW_SIZE): VirtualSheetState => ({
  active: false,
  totalRows: 0,
  totalCols: 0,
  windowSize,
  indexOffset: 0,
  defaults: { ...DEFAULT_SHEET_DEFAULTS },
  dataKeys: [],
  rows: [],
  columns: [],
  cellCache: new Map(),
  mergeStartMap: new Map(),
  mergeCoveredMap: new Map(),
  rowHeightCache: new Map(),
  sourceRowHeights: new Map(),
  fixedHeightRows: new Set(),
  autoHeightDisabled: false,
  autoHeightCells: new Map(),
  autoRowHeights: new Map(),
  autoHeightRevision: 0,
  rowHeightOverrides: new Map(),
  windowRows: new Map(),
  windowCells: new Map(),
  loadedWindows: new Set(),
  loadingWindows: new Set()
})

export const displayCellKey = (row: number, col: number) => {
  return `${row}-${col}`
}

export const getDataKey = (index: number) => {
  return `c${index}`
}

export const getRowState = (row?: VirtualRow | null) => {
  return row?.[ROW_STATE_FIELD] ?? RowState.Placeholder
}

export const buildRows = (count: number) => {
  const rows = new Array<VirtualRow>(count)
  for (let index = 0; index < count; index += 1) {
    rows[index] = {
      [ROW_KEY_FIELD]: `${index}`,
      [ROW_STATE_FIELD]: RowState.Placeholder
    }
  }
  return rows
}

export const getMaxWindowStart = (totalRows: number, windowSize = WINDOW_SIZE) => {
  if (!totalRows) {
    return 0
  }
  return Math.floor(Math.max(totalRows - 1, 0) / windowSize) * windowSize
}

export const clampWindowStart = (startRow = 0, totalRows = 0, windowSize = WINDOW_SIZE) => {
  return Math.min(Math.max(startRow, 0), getMaxWindowStart(totalRows, windowSize))
}

export const getWindowStart = (row = 0, totalRows = 0, windowSize = WINDOW_SIZE) => {
  const start = Math.floor(Math.max(row, 0) / windowSize) * windowSize
  return clampWindowStart(start, totalRows, windowSize)
}

// 视口周边始终保留一小圈热窗口，滚轮滚动和拖动滚动条都可以直接命中缓存，
// 避免每次跳转都同步等待 worker 回包。
export const collectWindowStarts = ({
  startRow,
  endRow,
  direction,
  totalRows,
  windowSize = WINDOW_SIZE,
  far = false
}: CollectWindowStartsOptions) => {
  const starts = new Set<number>()
  const firstWindow = getWindowStart(startRow, totalRows, windowSize)
  const lastWindow = getWindowStart(endRow, totalRows, windowSize)

  for (let current = firstWindow; current <= lastWindow; current += windowSize) {
    starts.add(current)
  }

  const ahead = far ? PREFETCH_AHEAD + 1 : PREFETCH_AHEAD
  const behind = far ? PREFETCH_BEHIND + 1 : PREFETCH_BEHIND
  const anchor = direction > 0 ? lastWindow : firstWindow

  for (let step = 1; step <= ahead; step += 1) {
    starts.add(clampWindowStart(anchor + direction * step * windowSize, totalRows, windowSize))
  }

  for (let step = 1; step <= behind; step += 1) {
    starts.add(clampWindowStart(anchor - direction * step * windowSize, totalRows, windowSize))
  }

  return Array.from(starts)
}

export const markWindowState = (
  rows: VirtualRow[],
  totalRows: number,
  windowStart: number,
  nextState: RowStateValue,
  windowSize = WINDOW_SIZE
) => {
  const endRow = Math.min(windowStart + windowSize, totalRows)
  for (let rowIndex = windowStart; rowIndex < endRow; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row) {
      continue
    }
    row[ROW_STATE_FIELD] = nextState
  }
}
