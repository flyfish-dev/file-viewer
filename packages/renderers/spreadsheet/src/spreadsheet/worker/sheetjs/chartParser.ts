import { readSourceAnchor } from './sourceAnchor.js'
import { createDrawingRowAnchor } from './drawingRowAnchor.js'
import { readStoredRowSizing } from './rowSizing.js'
import { readBoundedZipText, type XmlReadBudget } from './xmlBudget.js'
import {
  DOMParser,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode
} from '@xmldom/xmldom'
import JSZip from 'jszip'
import { SSF, type WorkBook } from 'styled-exceljs'
import { readStoredSheetLayout, readWorkbookDigitWidth } from './sheetLayout.js'
import type {
  SheetChartDefinition,
  SheetChartSeries,
  SheetChartType,
  SheetChartValueAxis,
  SheetDrawingMarker
} from '../type.js'
import {
  extremaPointIndexes,
  MAX_TRANSFERRED_LINE_CHART_POINTS
} from '../../chartSampling.js'

const CHART_RELATIONSHIP_SUFFIX = '/chart'
const DRAWING_RELATIONSHIP_SUFFIX = '/drawing'
const WORKSHEET_RELATIONSHIP_SUFFIX = '/worksheet'
const EMUS_PER_CSS_PIXEL = 9525
// Bound cache indices and formula expansion before allocating producer-controlled arrays.
const MAX_CHART_POINTS = 1_048_576

const CHART_TYPE_MAP: Record<string, SheetChartType> = {
  areaChart: 'area',
  area3DChart: 'area',
  barChart: 'bar',
  bar3DChart: 'bar',
  doughnutChart: 'doughnut',
  lineChart: 'line',
  line3DChart: 'line',
  pieChart: 'pie',
  pie3DChart: 'pie',
  radarChart: 'radar',
  scatterChart: 'scatter'
}

const LEGEND_POSITION_MAP: Record<string, SheetChartDefinition['legendPosition']> = {
  b: 'bottom',
  l: 'left',
  r: 'right',
  t: 'top',
  tr: 'top'
}

const SCHEME_COLORS: Record<string, string> = {
  accent1: '#4472c4',
  accent2: '#ed7d31',
  accent3: '#a5a5a5',
  accent4: '#ffc000',
  accent5: '#5b9bd5',
  accent6: '#70ad47',
  dk1: '#000000',
  dk2: '#44546a',
  lt1: '#ffffff',
  lt2: '#e7e6e6',
  tx1: '#000000',
  tx2: '#44546a'
}

export type Relationship = {
  id: string
  target: string
  type: string
}

export const localName = (node: XmlNode) => {
  const name = node.localName || node.nodeName
  return name.split(':').pop() || name
}

export const childElements = (node: XmlNode | null | undefined): XmlElement[] => {
  if (!node) {
    return []
  }
  return Array.from(node.childNodes).filter((child): child is XmlElement => child.nodeType === 1)
}

const childrenByLocal = (node: XmlNode | null | undefined, name: string) => {
  return childElements(node).filter((child) => localName(child) === name)
}

const firstChildByLocal = (node: XmlNode | null | undefined, name: string) => {
  return childrenByLocal(node, name)[0]
}

export const elementsByLocal = (node: XmlNode | null | undefined, name: string): XmlElement[] => {
  const result: XmlElement[] = []
  const visit = (current: XmlNode) => {
    childElements(current).forEach((child) => {
      if (localName(child) === name) {
        result.push(child)
      }
      visit(child)
    })
  }
  if (node) {
    visit(node)
  }
  return result
}

const firstByLocal = (node: XmlNode | null | undefined, name: string) => {
  return elementsByLocal(node, name)[0]
}

const numericAttribute = (element: XmlElement | undefined, name = 'val') => {
  const value = Number(element?.getAttribute(name))
  return Number.isFinite(value) ? value : 0
}

const textContent = (element: XmlElement | undefined) => {
  return element?.textContent?.trim() || ''
}

export const relationshipId = (element: XmlElement | undefined) => {
  if (!element) {
    return ''
  }
  return (
    element.getAttribute('r:id') ||
    element.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'id'
    ) ||
    ''
  )
}

const resolvePartPath = (sourcePart: string, target: string) => {
  const sourceDirectory = sourcePart.includes('/')
    ? sourcePart.slice(0, sourcePart.lastIndexOf('/'))
    : ''
  const parts = (target.startsWith('/') ? target.slice(1) : `${sourceDirectory}/${target}`).split(
    '/'
  )
  const normalized: string[] = []

  for (const part of parts) {
    if (!part || part === '.') {
      continue
    }
    if (part === '..') {
      normalized.pop()
      continue
    }
    normalized.push(part)
  }

  return normalized.join('/')
}

const relationshipPartPath = (sourcePart: string) => {
  const slash = sourcePart.lastIndexOf('/')
  const directory = slash >= 0 ? sourcePart.slice(0, slash) : ''
  const filename = slash >= 0 ? sourcePart.slice(slash + 1) : sourcePart
  return `${directory ? `${directory}/` : ''}_rels/${filename}.rels`
}

const parseXml = (xml: string) => {
  // Some valid Office producers prefix relationship parts with a UTF-8 BOM.
  // XML declarations must otherwise be the first character, and xmldom reports
  // the BOM as content outside the root element before aborting chart parsing.
  return new DOMParser().parseFromString(
    xml.replace(/^[\uFEFF\s]+/, ''),
    'application/xml'
  )
}

export const loadXml = async (zip: JSZip, path: string, budget?: XmlReadBudget) => {
  const file = zip.file(path)
  if (!file) {
    return null
  }
  return parseXml(budget ? await readBoundedZipText(file, budget) : await file.async('text'))
}

export const loadRelationships = async (
  zip: JSZip,
  sourcePart: string,
  readPart = (path: string) => loadXml(zip, path)
) => {
  const document = await readPart(relationshipPartPath(sourcePart))
  if (!document) {
    return []
  }

  return elementsByLocal(document.documentElement, 'Relationship').flatMap(
    (element): Relationship[] => {
      const id = element.getAttribute('Id') || ''
      const target = element.getAttribute('Target') || ''
      const type = element.getAttribute('Type') || ''
      if (!id || !target || element.getAttribute('TargetMode') === 'External') {
        return []
      }
      return [{ id, target: resolvePartPath(sourcePart, target), type }]
    }
  )
}

export const relationById = (relationships: Relationship[], id: string) => {
  return relationships.find((relationship) => relationship.id === id)
}

const parseMarker = (element: XmlElement | undefined): SheetDrawingMarker | undefined => {
  if (!element) {
    return undefined
  }
  return {
    row: Number(textContent(firstChildByLocal(element, 'row'))) || 0,
    col: Number(textContent(firstChildByLocal(element, 'col'))) || 0,
    rowOff: Number(textContent(firstChildByLocal(element, 'rowOff'))) || 0,
    colOff: Number(textContent(firstChildByLocal(element, 'colOff'))) || 0
  }
}

type ChartCell = {
  v?: unknown
  w?: unknown
}

type ChartWorksheet = {
  '!data'?: Array<Array<ChartCell | undefined> | undefined>
  [address: string]: unknown
}

const columnIndex = (letters: string) => {
  let result = 0
  for (const letter of letters.toUpperCase()) {
    result = result * 26 + letter.charCodeAt(0) - 64
  }
  return result - 1
}

const parseCellAddress = (address: string) => {
  const match = /^\$?([A-Z]{1,3})\$?(\d+)$/i.exec(address.trim())
  if (!match) {
    return null
  }
  return {
    col: columnIndex(match[1]),
    row: Number(match[2]) - 1
  }
}

const encodeCellAddress = (row: number, col: number) => {
  let value = col + 1
  let letters = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    value = Math.floor((value - 1) / 26)
  }
  return `${letters}${row + 1}`
}

const getWorksheetCell = (worksheet: ChartWorksheet, row: number, col: number) => {
  return worksheet['!data']?.[row]?.[col]
    || worksheet[encodeCellAddress(row, col)] as ChartCell | undefined
}

const parseFormulaRange = (formula: string) => {
  const normalized = formula.trim().replace(/^=/, '')
  const separator = normalized.lastIndexOf('!')
  if (separator <= 0) {
    return null
  }

  const sheetToken = normalized.slice(0, separator).trim()
  const rangeToken = normalized.slice(separator + 1).trim()
  if (!sheetToken || sheetToken.includes('[')) {
    return null
  }
  const sheetName = sheetToken.startsWith("'") && sheetToken.endsWith("'")
    ? sheetToken.slice(1, -1).replace(/''/g, "'")
    : sheetToken
  const tokens = rangeToken.split(':')
  if (tokens.length > 2) return null
  const [startToken, endToken = startToken] = tokens
  const start = parseCellAddress(startToken)
  const end = parseCellAddress(endToken)
  if (!sheetName || !start || !end ||
      start.row < 0 || end.row < 0 ||
      Math.max(start.row, end.row) >= MAX_CHART_POINTS ||
      Math.max(start.col, end.col) >= 16_384 ||
      (Math.abs(end.row - start.row) + 1) * (Math.abs(end.col - start.col) + 1) > MAX_CHART_POINTS) {
    return null
  }

  return {
    sheetName,
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col)
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col)
    }
  }
}

const resolveFormulaValues = (
  formula: string,
  workbook: WorkBook | null | undefined,
  formatted: boolean
) => {
  const range = parseFormulaRange(formula)
  const worksheet = range && workbook?.Sheets?.[range.sheetName] as ChartWorksheet | undefined
  if (!range || !worksheet) {
    return []
  }

  const values: string[] = []
  for (let row = range.start.row; row <= range.end.row; row += 1) {
    for (let col = range.start.col; col <= range.end.col; col += 1) {
      const cell = getWorksheetCell(worksheet, row, col)
      const value = formatted && cell?.w !== undefined ? cell.w : cell?.v
      values.push(value === undefined || value === null ? '' : `${value}`)
    }
  }
  return values
}

const parsePointValues = (
  element: XmlElement | undefined,
  workbook?: WorkBook | null,
  formatted = true
) => {
  if (!element) {
    return []
  }

  // Cache point idx is a logical source position, not the point's XML order.
  // Select one cache/level; flattening nested caches mixes category hierarchies.
  const literal = firstChildByLocal(element, 'strLit') || firstChildByLocal(element, 'numLit')
  const reference = firstChildByLocal(element, 'strRef') || firstChildByLocal(element, 'numRef')
  const multiLevel = firstChildByLocal(firstChildByLocal(element, 'multiLvlStrRef'), 'multiLvlStrCache')
  const cache = literal || firstChildByLocal(reference, 'strCache') ||
    firstChildByLocal(reference, 'numCache') || multiLevel
  if (cache) {
    const unsigned = (token: string | null | undefined) => {
      const text = token?.trim() || ''
      if (!/^\+?\d+$/.test(text)) return undefined
      const value = Number(text)
      return Number.isSafeInteger(value) && value >= 0 && value <= MAX_CHART_POINTS
        ? value : undefined
    }
    const entries = childrenByLocal(multiLevel ? firstChildByLocal(cache, 'lvl') : cache, 'pt')
      .flatMap(point => {
        const index = unsigned(point.getAttribute('idx'))
        return index !== undefined && index < MAX_CHART_POINTS
          ? [{index, value: firstChildByLocal(point, 'v')?.textContent || ''}] : []
      })
    const count = entries.reduce((length, point) => Math.max(length, point.index + 1),
      unsigned(firstChildByLocal(cache, 'ptCount')?.getAttribute('val')) || 0)
    const values = Array<string>(count).fill('')
    for (const point of entries) values[point.index] = point.value
    // A declared domain with missing points is an intentional sparse cache.
    // A zero-length reference cache supplies no domain; Office producers use
    // it as a placeholder until Excel recalculates the worksheet formula.
    if (count || literal || !reference) return values
  }

  const formula = textContent(firstByLocal(element, 'f'))
  return formula ? resolveFormulaValues(formula, workbook, formatted) : []
}

const chartText = (element: XmlElement | undefined, workbook?: WorkBook | null) => {
  if (!element) {
    return ''
  }

  const points = parsePointValues(element, workbook)
  if (points.length) {
    return points.join(' ').trim()
  }

  const richText = elementsByLocal(element, 't').map(textContent).filter(Boolean).join(' ').trim()
  if (richText) {
    return richText
  }

  return textContent(firstByLocal(element, 'v'))
}

const parseSeriesColor = (series: XmlElement) => {
  const shape = firstChildByLocal(series, 'spPr')
  const solidFill = firstByLocal(shape, 'solidFill')
  const rgb = firstByLocal(solidFill, 'srgbClr')?.getAttribute('val')
  if (rgb && /^[0-9a-f]{6}$/i.test(rgb)) {
    return `#${rgb}`
  }
  const scheme = firstByLocal(solidFill, 'schemeClr')?.getAttribute('val') || ''
  return SCHEME_COLORS[scheme]
}

const parseSeriesLine = (series: XmlElement) => {
  const shape = firstChildByLocal(series, 'spPr')
  const line = firstChildByLocal(shape, 'ln')
  const widthEmus = Number(line?.getAttribute('w'))
  return {
    lineWidth:
      Number.isFinite(widthEmus) && widthEmus > 0 ? widthEmus / EMUS_PER_CSS_PIXEL : undefined,
    lineDash: firstChildByLocal(line, 'prstDash')?.getAttribute('val') || undefined,
    lineVisible: line ? !firstChildByLocal(line, 'noFill') : undefined
  }
}

const parseSeriesMarker = (series: XmlElement): SheetChartSeries['marker'] => {
  const marker = firstChildByLocal(series, 'marker')
  if (!marker) {
    return undefined
  }

  const symbol = firstChildByLocal(marker, 'symbol')?.getAttribute('val') || 'auto'
  const sizeValue = Number(firstChildByLocal(marker, 'size')?.getAttribute('val'))
  return {
    symbol,
    size: Number.isFinite(sizeValue) && sizeValue > 0 ? sizeValue : undefined
  }
}

const xmlBoolean = (value: string | null | undefined) => value === '1' || value === 'true'
const excelNumericText = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

const categoryDateFormatter = (format: string | undefined, date1904: boolean) => {
  if (!format || format.length > 255) return undefined
  try {
    if (!SSF.is_date(format)) return undefined
    return (value: string) => {
      if (!excelNumericText.test(value.trim())) return value
      const serial = Number(value)
      try {
        return serial >= 0 && serial < 2_958_466 ? SSF.format(format, serial, { date1904 }) || value : value
      } catch {
        return value
      }
    }
  } catch {
    return undefined
  }
}

const categoryFormat = (category: XmlElement | undefined, axis: XmlElement | undefined) => {
  const numFmt = firstChildByLocal(axis, 'numFmt')
  const axisFormat = numFmt?.getAttribute('formatCode') || undefined
  const sourceLinked = numFmt?.getAttribute('sourceLinked')
  const cache = firstChildByLocal(category, 'numLit') ||
    firstChildByLocal(firstChildByLocal(category, 'numRef'), 'numCache')
  const cacheFormat = textContent(firstChildByLocal(cache, 'formatCode'))
  if (axisFormat && (sourceLinked === '0' || sourceLinked === 'false')) return axisFormat
  if (cacheFormat && cacheFormat !== 'General') return cacheFormat
  if (cache || !category) {
    return axisFormat || (axis && localName(axis) === 'dateAx' ? 'm/d/yyyy' : undefined)
  }
  // Without a numeric cache, prefer the referenced worksheet's formatted
  // value. That preserves cell-level formats in source-linked charts.
  return undefined
}

const parseSeries = (
  chartNode: XmlElement,
  workbook: WorkBook | null | undefined,
  blankMode: string,
  categoryAxis: XmlElement | undefined,
  date1904: boolean,
  seriesOffset: number
) => {
  const chartType = CHART_TYPE_MAP[localName(chartNode)]
  const compactLineSeries = chartType === 'line'
    || chartType === 'area'
    || chartType === 'scatter'
    || chartType === 'radar'

  return childrenByLocal(chartNode, 'ser').map((series, index): SheetChartSeries => {
    const tx = firstChildByLocal(series, 'tx')
    const category = firstChildByLocal(series, 'cat') || firstChildByLocal(series, 'xVal')
    const value = firstChildByLocal(series, 'val') || firstChildByLocal(series, 'yVal')
    const format = categoryFormat(category, categoryAxis)
    const textCategories = firstChildByLocal(category, 'strRef') ||
      firstChildByLocal(category, 'strLit') || firstChildByLocal(category, 'multiLvlStrRef')
    const formatDate = textCategories ? undefined : categoryDateFormatter(format, date1904)
    const rawCategories = parsePointValues(category, workbook, !format || !!textCategories)
    const categories = formatDate ? rawCategories.map(formatDate) : rawCategories
    const rawValues = parsePointValues(value, workbook, false)
    const count = Math.max(categories.length, rawValues.length)
    const spanBlankIndexes: number[] = []
    const values = Array.from({length: count}, (_, pointIndex) => {
      const raw = rawValues[pointIndex]?.trim() || ''
      if (!raw) {
        if (blankMode === 'span') spanBlankIndexes.push(pointIndex)
        return blankMode === 'zero' ? 0 : Number.NaN
      }
      // Empty cells and error values are not zero. Keep an error as a hard gap,
      // even when blank cells are explicitly spanned or plotted as zero.
      const number = excelNumericText.test(raw) ? Number(raw) : NaN
      return Number.isFinite(number) ? number : Number.NaN
    })

    const result: SheetChartSeries = {
      name: chartText(tx, workbook) || `Series ${seriesOffset + index + 1}`,
      categories: categories.length
        ? Array.from({length: count}, (_, i) => categories[i] ?? '')
        : values.map((_, valueIndex) => {
            const label = `${valueIndex + 1}`
            return !category && formatDate ? formatDate(label) : label
          }),
      values,
      ...(spanBlankIndexes.length ? {spanBlankIndexes} : {}),
      color: parseSeriesColor(series),
      ...parseSeriesLine(series),
      marker: parseSeriesMarker(series)
    }

    if (!compactLineSeries || values.length <= MAX_TRANSFERRED_LINE_CHART_POINTS) {
      return result
    }

    const sourcePointIndexes = extremaPointIndexes(values, MAX_TRANSFERRED_LINE_CHART_POINTS, spanBlankIndexes)
    const spanning = new Set(spanBlankIndexes)
    return {
      ...result,
      categories: sourcePointIndexes.map((sourceIndex) => (
        result.categories[sourceIndex] ?? `${sourceIndex + 1}`
      )),
      values: sourcePointIndexes.map((sourceIndex) => values[sourceIndex]),
      ...(spanBlankIndexes.length ? {spanBlankIndexes: sourcePointIndexes.flatMap((sourceIndex, i) => spanning.has(sourceIndex) ? [i] : [])} : {}),
      sourcePointCount: values.length,
      sourcePointIndexes
    }
  })
}

/** DrawingML font sizes are hundredths of a point, not SVG viewport units. */
const parseAxisFontSize = (axis: XmlElement | undefined, chartSpace: XmlElement | null) => {
  const size = (node: XmlElement | null | undefined) => {
    const props = firstByLocal(firstChildByLocal(node, 'txPr'), 'defRPr')
    const raw = props?.getAttribute('sz')?.trim() || ''
    const value = /^\d+$/.test(raw) ? Number(raw) : NaN
    return Number.isFinite(value) && value >= 100 && value <= 400000 ? value / 75 : undefined
  }
  return size(axis) ?? size(chartSpace)
}

type ParsedChart = Omit<SheetChartDefinition, 'id' | 'from' | 'to' | 'ext'>

const axisId = (axis: XmlElement | undefined) => firstChildByLocal(axis, 'axId')?.getAttribute('val') || undefined
const isCategoryAxis = (axis: XmlElement) => ['catAx', 'dateAx'].includes(localName(axis))
const legendPosition = (legend: XmlElement | undefined): SheetChartDefinition['legendPosition'] => {
  if (!legend) return undefined
  const position = firstChildByLocal(legend, 'legendPos')?.getAttribute('val') || ''
  const manual = firstByLocal(firstChildByLocal(legend, 'layout'), 'manualLayout')
  const y = Number(firstChildByLocal(manual, 'y')?.getAttribute('val') ?? NaN)
  if (position === 'b' && firstChildByLocal(manual, 'yMode')?.getAttribute('val') === 'edge' && y >= 0 && y < 0.15) {
    return 'top'
  }
  return LEGEND_POSITION_MAP[position] || 'bottom'
}

const parseChart = (document: XmlDocument, workbook: WorkBook | null | undefined, workbookDate1904: boolean): ParsedChart | null => {
  const root = document.documentElement
  const chart = firstByLocal(root, 'chart')
  const plotArea = firstChildByLocal(chart, 'plotArea') || firstByLocal(chart, 'plotArea')
  const chartEntries = childElements(plotArea)
    .map((element) => ({ element, type: CHART_TYPE_MAP[localName(element)] }))
    .filter((entry) => entry.type)
  const chartEntry = chartEntries[0]
  if (!chartEntry) {
    return null
  }

  const direction = (element: XmlElement) =>
    firstChildByLocal(element, 'barDir')?.getAttribute('val') === 'bar' ? 'bar' : 'column'
  const supportsCombination = chartEntries.every(({element, type}) =>
    type === 'line' || (type === 'bar' && direction(element) === 'column'))
    && chartEntries.some(entry => entry.type === 'line') && chartEntries.some(entry => entry.type === 'bar')
  const axes = childElements(plotArea)
  const categoryAxes = axes.filter(isCategoryAxis)
  const valueAxisElements = axes.filter(axis => localName(axis) === 'valAx')
  const boundAxes = (element: XmlElement) => {
    const ids = childrenByLocal(element, 'axId').map(id => id.getAttribute('val'))
    return {
      category: categoryAxes.find(axis => ids.includes(axisId(axis) || '')),
      value: valueAxisElements.find(axis => ids.includes(axisId(axis) || '')),
    }
  }
  const primaryAxes = boundAxes(chartEntry.element)
  const categoryAxis = primaryAxes.category || categoryAxes[0]
  const valueAxis = primaryAxes.value || valueAxisElements[0]
  const dateEpoch = firstChildByLocal(root, 'date1904')
  const date1904 = dateEpoch ? xmlBoolean(dateEpoch.getAttribute('val') ?? '1') : workbookDate1904
  const blankMode = firstChildByLocal(chart, 'dispBlanksAs')?.getAttribute('val') || 'gap'
  const series: SheetChartSeries[] = []
  for (const entry of supportsCombination ? chartEntries : [chartEntry]) {
    const binding = boundAxes(entry.element)
    const entries = parseSeries(entry.element, workbook, blankMode, binding.category || categoryAxis, date1904, series.length)
    for (const item of entries) {
      if (supportsCombination) {
        item.type = entry.type
        item.categoryAxisId = axisId(binding.category)
        item.valueAxisId = axisId(binding.value || valueAxis)
      }
      series.push(item)
    }
  }

  const valueAxes = supportsCombination ? valueAxisElements.flatMap((axis): SheetChartValueAxis[] => {
    const id = axisId(axis)
    if (!id || !series.some(item => item.valueAxisId === id)) return []
    return [{
      id,
      position: firstChildByLocal(axis, 'axPos')?.getAttribute('val') === 'r' ? 'right' : 'left',
      hidden: xmlBoolean(firstChildByLocal(axis, 'delete')?.getAttribute('val')),
      fontSize: parseAxisFontSize(axis, root),
      title: chartText(firstChildByLocal(axis, 'title'), workbook) || undefined
    }]
  }) : undefined

  return {
    type: chartEntry.type,
    title: chartText(firstChildByLocal(chart, 'title'), workbook) || undefined,
    categoryAxisTitle: chartText(firstChildByLocal(categoryAxis, 'title'), workbook) || undefined,
    categoryAxisId: supportsCombination ? axisId(categoryAxis) : undefined,
    categoryAxisDate: categoryAxis && localName(categoryAxis) === 'dateAx' ? true : undefined,
    valueAxisTitle: chartText(firstChildByLocal(valueAxis, 'title'), workbook) || undefined,
    valueAxes,
    barDirection: direction(chartEntry.element),
    categoryAxisFontSize: parseAxisFontSize(categoryAxis, root),
    valueAxisFontSize: parseAxisFontSize(valueAxis, root),
    grouping: firstChildByLocal(chartEntry.element, 'grouping')?.getAttribute('val') || undefined,
    scatterStyle:
      firstChildByLocal(chartEntry.element, 'scatterStyle')?.getAttribute('val') || undefined,
    legendPosition: legendPosition(firstChildByLocal(chart, 'legend')),
    series
  }
}

const parseDrawingCharts = async (
  zip: JSZip,
  drawingPart: string,
  workbook: WorkBook | null | undefined,
  date1904: boolean
): Promise<SheetChartDefinition[]> => {
  const [document, relationships] = await Promise.all([
    loadXml(zip, drawingPart),
    loadRelationships(zip, drawingPart)
  ])
  if (!document) {
    return []
  }

  const anchors = childElements(document.documentElement).filter((element) =>
    localName(element).endsWith('Anchor')
  )

  const charts = await Promise.all(
    anchors.map(async (anchor, index): Promise<SheetChartDefinition | null> => {
      const chartReference = firstByLocal(anchor, 'chart')
      const chartRelationship = relationById(relationships, relationshipId(chartReference))
      if (!chartRelationship?.type.endsWith(CHART_RELATIONSHIP_SUFFIX)) {
        return null
      }

      const chartDocument = await loadXml(zip, chartRelationship.target)
      const chart = chartDocument ? parseChart(chartDocument, workbook, date1904) : null
      if (!chart || !chart.series.length || chart.series.every((series) => !series.values.length)) {
        return null
      }

      const sourceAnchor = readSourceAnchor(anchor, chartReference, 'chart')
      // Preserve existing display fallback separately; it is never source evidence.
      const from = parseMarker(firstChildByLocal(anchor, 'from')) || {
        row: 0,
        col: 0,
        rowOff: numericAttribute(firstChildByLocal(anchor, 'pos'), 'y'),
        colOff: numericAttribute(firstChildByLocal(anchor, 'pos'), 'x')
      }
      const to = parseMarker(firstChildByLocal(anchor, 'to'))
      const extElement = firstChildByLocal(anchor, 'ext')
      const name = firstByLocal(anchor, 'cNvPr')?.getAttribute('name')

      return {
        ...chart,
        sourceAnchor,
        rowAnchor: createDrawingRowAnchor(localName(anchor), anchor.getAttribute('editAs'), from, to),
        id: name || chartRelationship.target || `chart-${index + 1}`,
        from,
        to,
        ext: extElement
          ? {
              width: numericAttribute(extElement, 'cx'),
              height: numericAttribute(extElement, 'cy')
            }
          : undefined
      }
    })
  )

  return charts.filter((chart): chart is SheetChartDefinition => chart !== null)
}

export const parseSpreadsheetCharts = async (data: ArrayBuffer, workbook?: WorkBook | null) => {
  const zip = await JSZip.loadAsync(data)
  const workbookPart = 'xl/workbook.xml'
  const [workbookDocument, workbookRelationships] = await Promise.all([
    loadXml(zip, workbookPart),
    loadRelationships(zip, workbookPart)
  ])
  const result: Record<string, SheetChartDefinition[]> = {}
  if (!workbookDocument) {
    return result
  }
  const maximumDigitWidth = readWorkbookDigitWidth(workbook)
  const date1904 = xmlBoolean(firstChildByLocal(workbookDocument.documentElement, 'workbookPr')?.getAttribute('date1904'))

  for (const sheet of elementsByLocal(workbookDocument.documentElement, 'sheet')) {
    const name = sheet.getAttribute('name') || ''
    const worksheetRelationship = relationById(workbookRelationships, relationshipId(sheet))
    if (!name || !worksheetRelationship?.type.endsWith(WORKSHEET_RELATIONSHIP_SUFFIX)) {
      continue
    }

    // A missing <col> uses the worksheet's stored/default geometry, rather
    // than content auto-fit. Keep this metadata even when there are no charts.
    const worksheet = workbook?.Sheets?.[name]
    if (worksheet) {
      worksheet['!fileViewerLayout'] = {}
      worksheet['!fileViewerLayout'] = {
        ...await readStoredSheetLayout(zip, worksheetRelationship.target),
        maximumDigitWidth,
        rowSizing: await readStoredRowSizing(zip, worksheetRelationship.target)
      }
    }

    // A worksheet can expand to hundreds of megabytes even when the drawing
    // relationship part is only a few hundred bytes. Loading sheetN.xml as a
    // string here duplicates the cell parser's work and can exceed V8's string
    // limit before chart parsing starts. Drawing relationships already carry
    // the typed targets needed by the chart parser, so discover them directly.
    const worksheetRelationships = await loadRelationships(zip, worksheetRelationship.target)
    const drawingParts = Array.from(new Set(
      worksheetRelationships
        .filter((relationship) => relationship.type.endsWith(DRAWING_RELATIONSHIP_SUFFIX))
        .map((relationship) => relationship.target)
    ))
    const charts = (
      await Promise.all(drawingParts.map((part) => parseDrawingCharts(zip, part, workbook, date1904)))
    ).flat()
    if (charts.length) {
      result[name] = charts
    }
  }

  return result
}
