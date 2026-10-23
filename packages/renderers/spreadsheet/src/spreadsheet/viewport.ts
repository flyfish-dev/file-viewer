import type { Column } from 'e-virt-table'
import { getDataKey, ROW_KEY_FIELD, ROW_STATE_FIELD, RowState, type VirtualRow, type VirtualSheetState } from './state.js'
import { getDisplayColumns, HEADER_HEIGHT, normalizeRowHeight } from './view.js'

const GRID_FORMATS = new Set(['xlsx', 'xltx', 'xlsm', 'xltm', 'xlsb', 'xls', 'xlt', 'xla', 'xlam', 'csv', 'tsv', 'ods', 'fods', 'numbers', 'et', 'ett', 'dbf'])

export const shouldFillSpreadsheetViewport = (enabled: boolean | undefined, type = '') => (
  enabled !== false && GRID_FORMATS.has(type.toLowerCase().replace(/^\./, ''))
)

const columnLabel = (index: number) => {
  let value = index + 1
  let label = ''
  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + value % 26) + label
    value = Math.floor(value / 26)
  }
  return label
}

/** Display-only padding. The parser's dimensions, rows and columns stay authoritative. */
export class SpreadsheetViewportFill {
  private sourceRows?: VirtualRow[]
  private rows: VirtualRow[] = []
  private sourceColumns?: Column[]
  private columns: Column[] = []

  build(state: VirtualSheetState, width: number, height: number, zoom: number) {
    const scale = (value: number) => Math.max(1, Math.round(value * zoom))
    const rowHeight = scale(normalizeRowHeight(state.defaults.rowHeight, state.defaults.rowHeight))
    const columnWidth = Math.max(1, Math.ceil(state.defaults.colWidth))
    let contentHeight = scale(HEADER_HEIGHT) + state.totalRows * rowHeight
    state.rowHeightCache.forEach((value, index) => {
      if (index < state.totalRows) contentHeight += Math.max(0.1, Math.round(value * zoom)) - rowHeight
    })
    const contentWidth = getDisplayColumns(state.columns, zoom).reduce((sum, column) => (
      sum + (column.hide ? 0 : Number(column.width) || 0)
    ), 0)
    const extraRows = Math.min(
      Math.max(0, 1_048_576 - state.totalRows),
      Math.max(0, Math.ceil((height - contentHeight) / rowHeight))
    )
    const extraColumns = Math.min(
      Math.max(0, 16_384 - state.totalCols),
      Math.max(0, Math.ceil((width - contentWidth) / scale(columnWidth)))
    )

    if (this.sourceRows !== state.rows || this.rows.length !== state.rows.length + extraRows) {
      this.sourceRows = state.rows
      this.rows = extraRows ? state.rows.concat(Array.from({ length: extraRows }, (_, offset) => ({
        [ROW_KEY_FIELD]: `viewport-${state.totalRows + offset}`,
        [ROW_STATE_FIELD]: RowState.Loaded,
      }))) : state.rows
    }
    if (this.sourceColumns !== state.columns || this.columns.length !== state.columns.length + extraColumns) {
      this.sourceColumns = state.columns
      this.columns = extraColumns ? state.columns.concat(Array.from({ length: extraColumns }, (_, offset): Column => ({
        key: getDataKey(state.totalCols + offset),
        title: columnLabel(state.totalCols + offset),
        width: columnWidth,
        minWidth: columnWidth,
        maxWidth: columnWidth,
        widthFillDisable: true,
        headerAlign: 'center',
        headerVerticalAlign: 'middle',
        align: 'left',
        verticalAlign: 'middle',
      }))) : state.columns
    }
    // Blank rows use default metrics even when the host allows resizing data rows.
    for (let index = state.totalRows; index < this.rows.length; index += 1) this.rows[index]!._height = rowHeight
    return { rows: this.rows, columns: this.columns }
  }
}
