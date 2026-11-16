import type { SheetRegion, SheetSourceExtent, SheetSourcePoint } from './worker/type.js'

export const EXCEL_SOURCE_EXTENT: SheetSourceExtent = { rows: 1_048_576, cols: 16_384 }
export const REGION_LIMIT = { rows: 500, cols: 64 } as const
const integer = (value: number, max: number, minimum = 0) =>
  Number.isSafeInteger(value) && value >= minimum && value <= max

export const assertSourcePoint = (point: SheetSourcePoint) => {
  if (!integer(point.row, EXCEL_SOURCE_EXTENT.rows - 1) || !integer(point.col, EXCEL_SOURCE_EXTENT.cols - 1)) {
    throw new RangeError('Invalid spreadsheet source address')
  }
}

export const assertSheetRegion = (region: SheetRegion) => {
  if (!region || !integer(region.id, Number.MAX_SAFE_INTEGER)
    || !integer(region.rowCount, REGION_LIMIT.rows, 1)
    || !integer(region.colCount, REGION_LIMIT.cols, 1)) {
    throw new RangeError('Invalid or oversized spreadsheet region')
  }
  assertSourcePoint({ row: region.startRow, col: region.startCol })
  assertSourcePoint({ row: region.startRow + region.rowCount - 1, col: region.startCol + region.colCount - 1 })
}

/** The target address never changes. Only a bounded surrounding viewport is chosen. */
export const createSheetRegion = (target: SheetSourcePoint, id: number, extent: SheetSourceExtent = EXCEL_SOURCE_EXTENT): SheetRegion => {
  assertSourcePoint(target)
  if (!integer(extent.rows, EXCEL_SOURCE_EXTENT.rows, 1) || !integer(extent.cols, EXCEL_SOURCE_EXTENT.cols, 1)
    || target.row >= extent.rows || target.col >= extent.cols) throw new RangeError('Address outside source extent')
  const rowCount = Math.min(extent.rows, REGION_LIMIT.rows), colCount = Math.min(extent.cols, REGION_LIMIT.cols)
  const region = {
    id,
    startRow: Math.min(Math.max(0, target.row - Math.floor(rowCount / 2)), extent.rows - rowCount),
    startCol: Math.min(Math.max(0, target.col - Math.floor(colCount / 2)), extent.cols - colCount),
    rowCount, colCount,
  }
  assertSheetRegion(region)
  return region
}

export const sourceToRegion = (region: SheetRegion, point: SheetSourcePoint): SheetSourcePoint | null => {
  const row = point.row - region.startRow, col = point.col - region.startCol
  return integer(row, region.rowCount - 1) && integer(col, region.colCount - 1) ? { row, col } : null
}

export const regionToSource = (region: SheetRegion, point: SheetSourcePoint): SheetSourcePoint => {
  if (!integer(point.row, region.rowCount - 1) || !integer(point.col, region.colCount - 1)) throw new RangeError('Address outside local region')
  return { row: region.startRow + point.row, col: region.startCol + point.col }
}

/** Half-open source rectangles. Intersection does not rewrite the original range. */
export const regionIntersects = (region: SheetRegion, range: { row: number; col: number; rowspan: number; colspan: number }) =>
  range.row < region.startRow + region.rowCount && range.row + range.rowspan > region.startRow
  && range.col < region.startCol + region.colCount && range.col + range.colspan > region.startCol

/** Explicit compatibility budget for the existing dense table path, not an input truncation. */
export const ORDINARY_GRID_BUDGET = { rows: 50_000, cols: 1_024, windowCells: 128_000 } as const
export const getSheetMaterialization = (extent: SheetSourceExtent) => {
  const windowCells = Math.min(extent.rows, REGION_LIMIT.rows) * extent.cols
  const reasons = [
    ...(extent.rows > ORDINARY_GRID_BUDGET.rows ? ['row-count'] : []),
    ...(extent.cols > ORDINARY_GRID_BUDGET.cols ? ['column-count'] : []),
    ...(windowCells > ORDINARY_GRID_BUDGET.windowCells ? ['window-cells'] : []),
  ]
  return { scope: 'default-renderer' as const, kind: reasons.length ? 'region-required' as const : 'ordinary' as const, reasons, windowCells, limits: { ...ORDINARY_GRID_BUDGET } }
}

export const OCCUPIED_INDEX_BUDGET = { tiles: 4_096, visitedCells: 2_000_000 } as const
