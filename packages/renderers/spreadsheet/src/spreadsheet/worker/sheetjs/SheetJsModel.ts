import type {
  AlignmentStyle,
  CellObject,
  CellStyle,
  ColInfo,
  DrawingImage,
  DrawingMarker,
  Range,
  RowInfo,
  StyleColor,
  WorkSheet
} from 'styled-exceljs'
import { utils } from 'styled-exceljs'
import type {
  CellMerge,
  SheetChart,
  SheetChartDefinition,
  SheetCellImage,
  SheetCellMetadata,
  SheetColumn,
  SheetImage,
  SheetModel,
  SheetStructure,
  SheetWindow
} from '../type.js'
import { getTintColor, indexedColors } from './color.js'
import { parseCellRichText, richTextToPlainText } from './richText.js'

const EXCEL_DEFAULT_COLUMN_WIDTH = 8.43
const EXCEL_DEFAULT_ROW_HEIGHT_PT = 15
const EXCEL_DEFAULT_TEXT_COLOR = '#202124'
const EMU_PER_PIXEL = 9525
const DEFAULT_IMAGE_WIDTH = 480
const DEFAULT_IMAGE_HEIGHT = 288
const AUTO_FIT_MIN_WIDTH = 24
const AUTO_FIT_PADDING = 8
const AUTO_FIT_MAX_SAMPLE_CELLS = 100_000
const AUTO_FIT_MAX_SAMPLE_WINDOWS = 8
const AUTO_FIT_MAX_ROWS_PER_WINDOW = 128

export const createAutoFitSampleRanges = (totalRowCount: number, totalColCount: number): Range[] => {
  const totalRows = Math.max(totalRowCount, 1)
  const totalCols = Math.max(totalColCount, 1)
  const endColumn = totalCols - 1
  const totalCells = totalRows * totalCols

  if (totalCells <= AUTO_FIT_MAX_SAMPLE_CELLS) {
    return [{
      s: { r: 0, c: 0 },
      e: { r: totalRows - 1, c: endColumn }
    }]
  }

  const rowsPerWindow = Math.max(1, Math.min(
    AUTO_FIT_MAX_ROWS_PER_WINDOW,
    Math.floor(AUTO_FIT_MAX_SAMPLE_CELLS / totalCols / AUTO_FIT_MAX_SAMPLE_WINDOWS)
  ))
  const maxStartRow = Math.max(totalRows - rowsPerWindow, 0)
  const maxWindowsWithinBudget = Math.max(
    1,
    Math.floor(AUTO_FIT_MAX_SAMPLE_CELLS / totalCols / rowsPerWindow)
  )
  const windowCount = Math.min(
    AUTO_FIT_MAX_SAMPLE_WINDOWS,
    maxWindowsWithinBudget,
    Math.ceil(totalRows / rowsPerWindow)
  )
  const starts = new Set<number>()

  for (let index = 0; index < windowCount; index += 1) {
    const startRow = windowCount === 1
      ? 0
      : Math.round(maxStartRow * index / (windowCount - 1))
    starts.add(startRow)
  }

  return Array.from(starts, startRow => ({
    s: { r: startRow, c: 0 },
    e: { r: Math.min(startRow + rowsPerWindow - 1, totalRows - 1), c: endColumn }
  }))
}

const toFiniteNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

const getDefaultColumnWidth = () => {
  const converter = (utils as any).col_width_to_px
  const value = typeof converter === 'function' ? converter(EXCEL_DEFAULT_COLUMN_WIDTH) : undefined
  return Math.ceil(toFiniteNumber(value) ?? 64)
}

const getDefaultRowHeight = () => {
  const converter = (utils as any).row_height_to_px
  const value = typeof converter === 'function' ? converter(EXCEL_DEFAULT_ROW_HEIGHT_PT) : undefined
  return Math.ceil(toFiniteNumber(value) ?? 20)
}

export const defaults = {
  rowHeight: getDefaultRowHeight(),
  colWidth: getDefaultColumnWidth()
}

interface SheetSliceOptions {
  startRow?: number
  pageSize?: number
  totalRows?: number
  totalCols?: number
  charts?: SheetChartDefinition[]
  cellImages?: SheetCellImage[]
}

interface SheetObjectOptions {
  includeLayout?: boolean
}

type SheetColumnMeta = ColInfo & {
  s?: CellStyle | any
}

type SheetRowMeta = RowInfo & {
  s?: CellStyle | any
}

const cellKey = (row: number, col: number) => {
  return `${row}-${col}`
}

const formatCellValue = (cell?: CellObject) => {
  if (!cell) {
    return ''
  }
  const richText = parseCellRichText(cell)
  if (richText?.length) {
    return richTextToPlainText(richText)
  }
  if (cell.w !== undefined && cell.w !== null) {
    return `${cell.w}`
  }
  if (cell.v === undefined || cell.v === null) {
    return ''
  }
  if (cell.t === 'd' && cell.v instanceof Date) {
    return cell.v.toLocaleDateString()
  }
  return `${cell.v}`
}

const getColumnPixelWidth = (column?: SheetColumnMeta) => {
  if (!column) {
    return undefined
  }
  if (column.hidden) {
    return 0
  }

  // styled-exceljs 在 browserPixels 模式下会优先输出 wpx，这是最接近浏览器渲染的列宽。
  const wpx = toFiniteNumber(column.wpx)
  if (wpx !== undefined && wpx >= 0) {
    return Math.ceil(wpx)
  }

  const width = toFiniteNumber(column.width)
  if (width === 0) {
    return 0
  }
  if (width !== undefined && width > 0) {
    const converter = (utils as any).col_width_to_px
    const converted = typeof converter === 'function' ? toFiniteNumber(converter(width)) : undefined
    if (converted !== undefined) {
      return Math.ceil(converted)
    }
    return Math.ceil(width * (column.MDW || 7))
  }

  const wch = toFiniteNumber(column.wch)
  if (wch === 0) {
    return 0
  }
  if (wch !== undefined && wch > 0) {
    return Math.ceil(wch * (column.MDW || 7) + 5)
  }

  return undefined
}

const getVectorSize = (
  sizes: number | number[] | undefined,
  index: number,
  fallback: number
) => {
  if (typeof sizes === 'number') {
    return sizes
  }
  return sizes?.[index] ?? fallback
}

const emuToPixels = (value: number | undefined) => {
  return (value || 0) / EMU_PER_PIXEL
}

const hasColumnWidth = (column?: SheetColumnMeta) => {
  if (!column) {
    return false
  }
  if (column.hidden) {
    return true
  }

  return (
    (toFiniteNumber(column.wpx) ?? -1) >= 0 ||
    (toFiniteNumber(column.width) ?? -1) >= 0 ||
    (toFiniteNumber(column.wch) ?? -1) >= 0
  )
}

const getRowPixelHeight = (rowMeta?: SheetRowMeta) => {
  if (!rowMeta) {
    return undefined
  }
  if (rowMeta.hidden) {
    return 0
  }
  const hpx = toFiniteNumber(rowMeta.hpx)
  if (hpx !== undefined && hpx >= 0) {
    return Math.ceil(hpx)
  }

  const hpt = toFiniteNumber(rowMeta.hpt)
  if (hpt !== undefined && hpt >= 0) {
    const converter = (utils as any).row_height_to_px
    const converted = typeof converter === 'function' ? toFiniteNumber(converter(hpt)) : undefined
    return Math.ceil(converted ?? hpt * 96 / 72)
  }
  return undefined
}

const normalizeHorizontalAlign = (value?: string) => {
  switch (`${value || ''}`) {
    case 'left':
      return 'Left'
    case 'center':
    case 'centerContinuous':
    case 'distributed':
    case 'justify':
      return 'Center'
    case 'right':
      return 'Right'
    default:
      return undefined
  }
}

const normalizeVerticalAlign = (value?: string) => {
  switch (`${value || ''}`) {
    case 'top':
      return 'Top'
    case 'center':
    case 'middle':
    case 'distributed':
    case 'justify':
      return 'Middle'
    case 'bottom':
      return 'Bottom'
    default:
      return undefined
  }
}

const alignToClassName = (alignment?: AlignmentStyle) => {
  if (!alignment) {
    return ''
  }

  const classNames = [
    normalizeHorizontalAlign(alignment.horizontal),
    normalizeVerticalAlign(alignment.vertical)
  ].filter(Boolean).map(value => `ht${value}`)

  if (alignment.wrapText) {
    classNames.push('htWrap')
  }
  if (alignment.shrinkToFit) {
    classNames.push('htShrink')
  }

  return classNames.join(' ')
}

const normalizeColor = (color?: StyleColor) => {
  if (!color) {
    return undefined
  }

  const tintedRgb = color.raw_rgb && typeof color.tint === 'number'
    ? getTintColor(color.raw_rgb, color.tint)
    : undefined
  const rgb = color.rgb || tintedRgb || color.raw_rgb
  if (typeof rgb === 'string' && rgb) {
    const clean = rgb.startsWith('#') ? rgb.slice(1) : rgb
    const value = clean.length > 6 ? clean.slice(-6) : clean
    return `#${value}`
  }

  const indexed = typeof color.indexed === 'number' ? color.indexed : color.index
  if (typeof indexed === 'number') {
    const value = indexedColors[indexed]
    if (value) {
      return `#${value.slice(-6)}`
    }
  }
  return undefined
}

const isAutomaticPaletteColor = (color?: StyleColor) => {
  if (!color) {
    return false
  }
  const indexed = typeof color.indexed === 'number' ? color.indexed : color.index
  return indexed === 32767
}

const normalizeFontColor = (color?: StyleColor) => {
  // BIFF/XLS 会把“自动字体色”解析成 indexed 32767，部分文件还会附带
  // FFFFFF 的 rgb 值。Excel 实际显示为默认黑色，不能当成显式白色。
  if (isAutomaticPaletteColor(color)) {
    return EXCEL_DEFAULT_TEXT_COLOR
  }
  return normalizeColor(color)
}

const borderWidthFromStyle = (borderStyle?: string) => {
  switch (borderStyle) {
    case 'hair':
      return '0.5px'
    case 'medium':
    case 'mediumDashed':
    case 'mediumDashDot':
    case 'mediumDashDotDot':
      return '2px'
    case 'thick':
    case 'double':
      return '3px'
    default:
      return '1px'
  }
}

const borderStyleToCss = (borderStyle?: string) => {
  switch (borderStyle) {
    case 'dashed':
    case 'mediumDashed':
    case 'dashDot':
    case 'mediumDashDot':
    case 'dashDotDot':
    case 'mediumDashDotDot':
    case 'slantDashDot':
      return 'dashed'
    case 'dotted':
      return 'dotted'
    case 'double':
      return 'double'
    default:
      return 'solid'
  }
}

const mergeStyle = (...styles: Array<CellStyle | Record<string, any> | undefined>) => {
  const result: Record<string, any> = {}
  styles.forEach((style) => {
    if (!style) {
      return
    }
    Object.entries(style).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = {
          ...(result[key] && typeof result[key] === 'object' ? result[key] : {}),
          ...value
        }
        return
      }
      result[key] = value
    })
  })
  return Object.keys(result).length ? result : undefined
}

const resolveTableCellStyle = (
  worksheet: WorkSheet,
  rowIndex: number,
  colIndex: number,
  baseStyle?: CellStyle | Record<string, any>
) => {
  const resolver = (utils as any).resolve_table_cell_style
  return typeof resolver === 'function'
    ? resolver(worksheet, rowIndex, colIndex, baseStyle)
    : baseStyle
}

const getCellStyle = (cellStyle?: Record<string, any>) => {
  const style: Record<string, string> = {}
  const fill = cellStyle?.fill || {}
  const fillColor = normalizeColor(fill.fgColor || cellStyle?.fgColor || fill.bgColor || cellStyle?.bgColor)
  const patternType = fill.patternType || cellStyle?.patternType
  if (fillColor && patternType !== 'none') {
    style.backgroundColor = fillColor
  }

  const font = cellStyle?.font || {}
  const fontColor = normalizeFontColor(font.color || cellStyle?.color)
  if (fontColor) {
    style.color = fontColor
  }
  if (font.italic || cellStyle?.italic) {
    style.fontStyle = 'italic'
  }
  if (font.bold || cellStyle?.bold) {
    style.fontWeight = 'bold'
  }
  const fontSize = font.sz || cellStyle?.sz
  if (fontSize) {
    style.fontSize = `${fontSize}px`
  }
  const fontName = font.name || cellStyle?.name
  if (fontName) {
    style.fontFamily = fontName
  }

  const border = cellStyle?.border as CellStyle['border'] | undefined
  if (border) {
    ;(['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
      const borderItem = border[side]
      if (!borderItem?.style || borderItem.style === 'none') {
        return
      }
      const prefix = `border${side.charAt(0).toUpperCase()}${side.slice(1)}`
      style[`${prefix}Width`] = borderWidthFromStyle(borderItem.style)
      style[`${prefix}Style`] = borderStyleToCss(borderItem.style)
      style[`${prefix}Color`] = normalizeColor(borderItem.color) || '#000000'
    })
  }
  return Object.keys(style).length ? style : undefined
}

const fixMatrix = (data: string[][], colLen: number) => {
  for (const row of data) {
    for (let index = 0; index < colLen; index += 1) {
      if (row[index] === undefined || row[index] === null) {
        row[index] = ''
      }
    }
  }
  return data
}

export default class SheetJsModel implements SheetModel {

  private readonly _ws: WorkSheet

  private readonly _startRow: number

  private readonly _pageSize: number

  private readonly _totalRows?: number

  private readonly _totalCols?: number

  private readonly _charts: SheetChartDefinition[]

  private readonly _cellImages: SheetCellImage[]

  private readonly _cellImageKeys: Set<string>

  private static readonly defaults = defaults

  private _data: undefined | string[][]

  private _cell: undefined | Record<string, SheetCellMetadata>

  private _merge: undefined | Array<CellMerge>

  private _rowHeights: undefined | number | number[]

  private _colWidths: undefined | number | number[]

  private _autoFitColumns: undefined | null | SheetColumnMeta[]

  private _columns: undefined | Array<SheetColumn>

  private _structure: undefined | SheetStructure

  private _meta: undefined | SheetWindow

  private readonly range: Range

  public static create(ws: WorkSheet, options: SheetSliceOptions = {}) {
    return new SheetJsModel(ws, options)
  }

  private constructor(ws: WorkSheet, options: SheetSliceOptions) {
    this._ws = ws
    this._startRow = Math.max(options.startRow || 0, 0)
    this._pageSize = Math.max(options.pageSize || 500, 1)
    this._totalRows = options.totalRows
    this._totalCols = options.totalCols
    this._charts = options.charts || []
    this._cellImages = options.cellImages || []
    this._cellImageKeys = new Set(
      this._cellImages.map((image) => cellKey(image.row, image.col))
    )
    const { '!ref': refs } = ws
    this.range = utils.decode_range(refs || 'A1')
  }

  private get ws() {
    return this._ws
  }

  public get defaults() {
    return SheetJsModel.defaults
  }

  public get data() {
    return this._data ?? (this._data = this.getData())
  }

  public get cell() {
    return this._cell ?? (this._cell = this.getCell())
  }

  public get merge() {
    return this._merge ?? (this._merge = this.getMerge())
  }

  public get columns() {
    return this._columns ?? (this._columns = this.getColumns())
  }

  public get structure() {
    return this._structure ?? (this._structure = this.getStructure())
  }

  public get rowHeights() {
    return this._rowHeights ?? (this._rowHeights = this.getRowHeights())
  }

  public get colWidths() {
    return this._colWidths ?? (this._colWidths = this.getColWidths())
  }

  public get meta() {
    return this._meta ?? (this._meta = {
      startRow: this.startRow,
      endRow: this.endRow,
      pageSize: this._pageSize,
      totalRows: this.totalRows,
      totalCols: this.totalCols
    })
  }

  private get totalRows() {
    return this._totalRows ?? this.range.e.r + 1
  }

  private get totalCols() {
    return this._totalCols ?? this.range.e.c + 1
  }

  private get startRow() {
    return Math.min(this._startRow, Math.max(this.totalRows - 1, 0))
  }

  private get endRow() {
    return Math.min(this.startRow + this._pageSize, this.totalRows)
  }

  private get denseRows() {
    const worksheet = this.ws as WorkSheet & { '!data'?: Array<Array<CellObject | undefined>> }
    if (Array.isArray(worksheet)) {
      return worksheet as Array<Array<CellObject | undefined>>
    }
    return Array.isArray(worksheet['!data']) ? worksheet['!data'] : undefined
  }

  private getCellAt(row: number, col: number) {
    const rows = this.denseRows
    if (rows) {
      return rows[row]?.[col]
    }
    return this.ws[utils.encode_cell({ r: row, c: col })] as CellObject | undefined
  }

  private getAxisOffset(
    index: number,
    sizes: number | number[] | undefined,
    fallback: number
  ) {
    let offset = 0
    for (let current = 0; current < index; current += 1) {
      offset += getVectorSize(sizes, current, fallback)
    }
    return offset
  }

  private getMarkerLeft(marker?: DrawingMarker) {
    if (!marker) {
      return 0
    }
    return this.getAxisOffset(marker.col || 0, this.getColWidths(), this.defaults.colWidth) + emuToPixels(marker.colOff)
  }

  private getMarkerTop(marker?: DrawingMarker) {
    if (!marker) {
      return 0
    }
    return this.getAxisOffset(marker.row || 0, this.getAllRowHeights(), this.defaults.rowHeight) + emuToPixels(marker.rowOff)
  }

  private getImages(): SheetImage[] | undefined {
    const drawings = (this.ws as WorkSheet & { '!drawings'?: { images?: DrawingImage[] } })['!drawings']
    const images = drawings?.images || []
    if (!images.length && !this._cellImages.length) {
      return undefined
    }

    const drawingImages = images.flatMap((image, index): SheetImage[] => {
      const anchor = image.anchor
      if (!image.dataURI || !anchor) {
        return []
      }

      const from = anchor.from
      const left = from ? this.getMarkerLeft(from) : emuToPixels(anchor.pos?.x)
      const top = from ? this.getMarkerTop(from) : emuToPixels(anchor.pos?.y)
      const right = anchor.to ? this.getMarkerLeft(anchor.to) : left + emuToPixels(anchor.ext?.cx)
      const bottom = anchor.to ? this.getMarkerTop(anchor.to) : top + emuToPixels(anchor.ext?.cy)

      return [{
        id: image.id || image.objectId?.toString() || image.target || `image-${index + 1}`,
        src: image.dataURI,
        contentType: image.contentType,
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: Math.max(1, right > left ? right - left : DEFAULT_IMAGE_WIDTH),
        height: Math.max(1, bottom > top ? bottom - top : DEFAULT_IMAGE_HEIGHT),
        row: from?.row || 0,
        col: from?.col || 0
      }]
    })

    const cellImages = this._cellImages.flatMap((image): SheetImage[] => {
      const width = getVectorSize(this.getColWidths(), image.col, this.defaults.colWidth)
      const height = getVectorSize(this.getAllRowHeights(), image.row, this.defaults.rowHeight)
      if (width <= 0 || height <= 0) {
        return []
      }
      return [{
        ...image,
        left: this.getAxisOffset(image.col, this.getColWidths(), this.defaults.colWidth),
        top: this.getAxisOffset(image.row, this.getAllRowHeights(), this.defaults.rowHeight),
        width,
        height
      }]
    })

    const result = [...drawingImages, ...cellImages]

    return result.length ? result : undefined
  }

  private getCharts(): SheetChart[] | undefined {
    const result = this._charts.map((chart): SheetChart => {
      const left = this.getMarkerLeft(chart.from)
      const top = this.getMarkerTop(chart.from)
      const right = chart.to
        ? this.getMarkerLeft(chart.to)
        : left + emuToPixels(chart.ext?.width)
      const bottom = chart.to
        ? this.getMarkerTop(chart.to)
        : top + emuToPixels(chart.ext?.height)

      return {
        id: chart.id,
        type: chart.type,
        title: chart.title,
        categoryAxisTitle: chart.categoryAxisTitle,
        valueAxisTitle: chart.valueAxisTitle,
        barDirection: chart.barDirection,
        grouping: chart.grouping,
        scatterStyle: chart.scatterStyle,
        legendPosition: chart.legendPosition,
        series: chart.series,
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: Math.max(1, right > left ? right - left : DEFAULT_IMAGE_WIDTH),
        height: Math.max(1, bottom > top ? bottom - top : DEFAULT_IMAGE_HEIGHT),
        row: chart.from.row,
        col: chart.from.col
      }
    })

    return result.length ? result : undefined
  }

  private getAllMerge(): Array<CellMerge> {
    const sheet: WorkSheet = this.ws
    const { '!merges': merges = [] } = sheet

    return merges.map((merge) => {
      const { r: top, c: left } = merge.s
      const { r: bottom, c: right } = merge.e
      return {
        row: top,
        col: left,
        rowspan: bottom - top + 1,
        colspan: right - left + 1
      }
    })
  }

  private getData(): string[][] {
    const result: string[][] = []
    const rows = this.denseRows
    for (let rowIndex = this.startRow; rowIndex < this.endRow; rowIndex += 1) {
      const row = rows?.[rowIndex]
      const values = row
        ? row.slice(0, this.totalCols).map((cell, colIndex) => (
            this._cellImageKeys.has(cellKey(rowIndex, colIndex)) ? '' : formatCellValue(cell)
          ))
        : Array.from({ length: this.totalCols }, (_, colIndex) => (
            this._cellImageKeys.has(cellKey(rowIndex, colIndex))
              ? ''
              : formatCellValue(this.getCellAt(rowIndex, colIndex))
          ))
      result.push(values)
    }
    return fixMatrix(result, this.totalCols)
  }

  private getCell() {
    const result: Record<string, SheetCellMetadata> = {}
    const { '!cols': cols = [], '!rows': rows = [] } = this.ws as WorkSheet & {
      '!cols'?: SheetColumnMeta[],
      '!rows'?: SheetRowMeta[]
    }

    for (let rowIndex = this.startRow; rowIndex < this.endRow; rowIndex += 1) {
      for (let colIndex = 0; colIndex < this.totalCols; colIndex += 1) {
        const cell = this.getCellAt(rowIndex, colIndex)
        const inheritedStyle = mergeStyle(cols[colIndex]?.s, rows[rowIndex]?.s, cell?.s as CellStyle | undefined)
        const rawStyle = resolveTableCellStyle(this.ws, rowIndex, colIndex, inheritedStyle)
        const className = alignToClassName(rawStyle?.alignment)
        const style = getCellStyle(rawStyle)
        const richText = parseCellRichText(cell)
        if (!className && !style && !richText?.length) {
          continue
        }
        result[cellKey(rowIndex - this.startRow, colIndex)] = {
          ...(className ? { className } : {}),
          style: style || {},
          ...(richText?.length ? { richText } : {})
        }
      }
    }
    return result
  }

  private getMerge(): Array<CellMerge> {
    return this.getAllMerge().flatMap((merge) => {
      const bottom = merge.row + merge.rowspan - 1
      if (bottom < this.startRow || merge.row >= this.endRow || merge.row < this.startRow) {
        return []
      }
      return {
        ...merge,
        row: merge.row - this.startRow
      }
    })
  }

  private getRowHeights() {
    const { rowHeight } = this.defaults
    const { '!rows': rows = [] } = this.ws as WorkSheet & { '!rows'?: SheetRowMeta[] }
    const heights: number[] = []
    if (rows.length && this.endRow > this.startRow) {
      for (let absoluteRow = this.startRow; absoluteRow < this.endRow; absoluteRow += 1) {
        const height = getRowPixelHeight(rows[absoluteRow])
        if (height !== undefined) {
          heights[absoluteRow - this.startRow] = height
        }
      }
    }
    if (heights.length === 1) {
      return heights[0]
    }
    return heights.length ? heights : rowHeight
  }

  // 整表行高必须按绝对行号下发，否则拖动滚动条时隐藏行和特殊行高会造成高度跳变。
  private getAllRowHeights() {
    const { '!rows': rows = [] } = this.ws as WorkSheet & { '!rows'?: SheetRowMeta[] }
    const heights: number[] = []
    if (rows.length) {
      for (let absoluteRow = 0; absoluteRow < this.totalRows; absoluteRow += 1) {
        const height = getRowPixelHeight(rows[absoluteRow])
        if (height !== undefined) {
          heights[absoluteRow] = height
        }
      }
    }
    return heights.length ? heights : undefined
  }

  private getAutoFitColumns() {
    const autoFitColumns = (utils as any).auto_fit_columns || (utils as any).autofit_columns
    if (typeof autoFitColumns !== 'function') {
      return undefined
    }

    try {
      const sampleRanges = this.getAutoFitSampleRanges()
      const fittedColumns: SheetColumnMeta[] = []

      for (const range of sampleRanges) {
        // 自动列宽只作为缺失列宽的兜底。合并标题和 Excel 溢出文本不应该反向撑开基础列宽。
        // 大表只抽样固定数量的单元格，避免为了首屏列宽扫描整张工作表。
        const measuredColumns = autoFitColumns(this.ws, {
          range,
          set: false,
          skipHidden: true,
          includeMerged: false,
          minPx: AUTO_FIT_MIN_WIDTH,
          padding: AUTO_FIT_PADDING
        }) as SheetColumnMeta[]

        for (let colIndex = 0; colIndex < this.totalCols; colIndex += 1) {
          const measured = measuredColumns?.[colIndex]
          if (!measured) {
            continue
          }
          const currentWidth = getColumnPixelWidth(fittedColumns[colIndex]) ?? -1
          const measuredWidth = getColumnPixelWidth(measured) ?? -1
          if (!fittedColumns[colIndex] || measuredWidth > currentWidth) {
            fittedColumns[colIndex] = measured
          }
        }
      }

      return fittedColumns.length ? fittedColumns : undefined
    } catch (error) {
      console.warn('[file-viewer] Excel 自动列宽计算失败，已回退到原始列宽。', error)
      return undefined
    }
  }

  private getAutoFitSampleRanges(): Range[] {
    return createAutoFitSampleRanges(this.totalRows, this.totalCols)
  }

  private get autoFitColumns() {
    if (this._autoFitColumns === undefined) {
      this._autoFitColumns = this.getAutoFitColumns() || null
    }
    return this._autoFitColumns || undefined
  }

  private getColumnMeta(sourceCols: SheetColumnMeta[], colIndex: number) {
    const sourceColumn = sourceCols[colIndex]
    if (hasColumnWidth(sourceColumn)) {
      return sourceColumn
    }

    // A drawing anchor is measured against the workbook's stored/default
    // column geometry. Auto-fitting blank columns to 24px changes that
    // coordinate system and makes two-cell images visibly smaller than Excel.
    if (this.hasAnchoredObjects) {
      return sourceColumn
    }

    // 没有显式列宽时，再使用 styled-exceljs 的内容测量兜底，避免报表类标题污染原始宽度。
    return this.autoFitColumns?.[colIndex] || sourceColumn
  }

  private get hasAnchoredObjects() {
    const drawings = (this.ws as WorkSheet & { '!drawings'?: { images?: DrawingImage[] } })['!drawings']
    return !!drawings?.images?.length || !!this._charts.length || !!this._cellImages.length
  }

  private getColWidths() {
    const { colWidth } = this.defaults
    const { '!cols': sourceCols = [] } = this.ws as WorkSheet & { '!cols'?: SheetColumnMeta[] }
    const widths: number[] = []
    for (let colIndex = 0; colIndex < this.totalCols; colIndex += 1) {
      const width = getColumnPixelWidth(this.getColumnMeta(sourceCols, colIndex))
      if (width !== undefined) {
        widths[colIndex] = width
      }
    }
    return widths.length ? widths : colWidth
  }

  private getColumns(): Array<SheetColumn> {
    const { '!cols': sourceCols = [] } = this.ws as WorkSheet & { '!cols'?: SheetColumnMeta[] }
    return Array.from({ length: this.totalCols }, (_, index) => {
      const column = this.getColumnMeta(sourceCols, index)
      return {
        key: index + 1,
        title: utils.encode_col(index),
        hidden: !!column?.hidden,
        editor: false,
        className: alignToClassName(column?.s?.alignment),
        renderer: 'styleRender'
      }
    })
  }

  private getStructure(): SheetStructure {
    return {
      merge: this.getAllMerge(),
      colWidths: this.getColWidths(),
      rowHeights: this.getAllRowHeights(),
      columns: this.getColumns(),
      images: this.getImages(),
      charts: this.getCharts()
    }
  }

  public toObject(options: SheetObjectOptions = {}): object {
    const { defaults, data, cell, merge, rowHeights, meta } = this
    return {
      defaults,
      data,
      cell,
      merge,
      rowHeights,
      ...(options.includeLayout === false ? {} : {
        colWidths: this.colWidths,
        columns: this.columns
      }),
      meta
    }
  }
}
