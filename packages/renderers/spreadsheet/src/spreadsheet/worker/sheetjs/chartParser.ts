import {
  DOMParser,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode
} from '@xmldom/xmldom'
import JSZip from 'jszip'
import type {
  SheetChartDefinition,
  SheetChartSeries,
  SheetChartType,
  SheetDrawingMarker
} from '../type.js'

const CHART_RELATIONSHIP_SUFFIX = '/chart'
const DRAWING_RELATIONSHIP_SUFFIX = '/drawing'
const WORKSHEET_RELATIONSHIP_SUFFIX = '/worksheet'

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

export const loadXml = async (zip: JSZip, path: string) => {
  const file = zip.file(path)
  if (!file) {
    return null
  }
  return parseXml(await file.async('text'))
}

export const loadRelationships = async (zip: JSZip, sourcePart: string) => {
  const document = await loadXml(zip, relationshipPartPath(sourcePart))
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

const parsePointValues = (element: XmlElement | undefined) => {
  if (!element) {
    return []
  }

  return elementsByLocal(element, 'pt')
    .map((point) => ({
      index: Number(point.getAttribute('idx')) || 0,
      value: textContent(firstChildByLocal(point, 'v')) || textContent(firstByLocal(point, 'v'))
    }))
    .sort((left, right) => left.index - right.index)
    .map((point) => point.value)
}

const chartText = (element: XmlElement | undefined) => {
  if (!element) {
    return ''
  }

  const points = parsePointValues(element)
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

const parseSeries = (chartNode: XmlElement) => {
  return childrenByLocal(chartNode, 'ser').map((series, index): SheetChartSeries => {
    const tx = firstChildByLocal(series, 'tx')
    const category = firstChildByLocal(series, 'cat') || firstChildByLocal(series, 'xVal')
    const value = firstChildByLocal(series, 'val') || firstChildByLocal(series, 'yVal')
    const categories = parsePointValues(category)
    const values = parsePointValues(value).map(Number).filter(Number.isFinite)

    return {
      name: chartText(tx) || `Series ${index + 1}`,
      categories: categories.length
        ? categories
        : values.map((_, valueIndex) => `${valueIndex + 1}`),
      values,
      color: parseSeriesColor(series)
    }
  })
}

type ParsedChart = Omit<SheetChartDefinition, 'id' | 'from' | 'to' | 'ext'>

const parseChart = (document: XmlDocument): ParsedChart | null => {
  const root = document.documentElement
  const chart = firstByLocal(root, 'chart')
  const plotArea = firstChildByLocal(chart, 'plotArea') || firstByLocal(chart, 'plotArea')
  const chartEntry = childElements(plotArea)
    .map((element) => ({ element, type: CHART_TYPE_MAP[localName(element)] }))
    .find((entry) => entry.type)
  if (!chartEntry) {
    return null
  }

  const legend = firstChildByLocal(chart, 'legend')
  const legendPositionValue = firstChildByLocal(legend, 'legendPos')?.getAttribute('val') || ''
  const categoryAxis = firstChildByLocal(plotArea, 'catAx')
  const valueAxis = firstChildByLocal(plotArea, 'valAx')
  const barDirection: SheetChartDefinition['barDirection'] =
    firstChildByLocal(chartEntry.element, 'barDir')?.getAttribute('val') === 'bar'
      ? 'bar'
      : 'column'

  return {
    type: chartEntry.type,
    title: chartText(firstChildByLocal(chart, 'title')) || undefined,
    categoryAxisTitle: chartText(firstChildByLocal(categoryAxis, 'title')) || undefined,
    valueAxisTitle: chartText(firstChildByLocal(valueAxis, 'title')) || undefined,
    barDirection,
    grouping: firstChildByLocal(chartEntry.element, 'grouping')?.getAttribute('val') || undefined,
    legendPosition: legend ? LEGEND_POSITION_MAP[legendPositionValue] || 'bottom' : undefined,
    series: parseSeries(chartEntry.element)
  }
}

const parseDrawingCharts = async (
  zip: JSZip,
  drawingPart: string
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
      const chart = chartDocument ? parseChart(chartDocument) : null
      if (!chart || !chart.series.length || chart.series.every((series) => !series.values.length)) {
        return null
      }

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

export const parseSpreadsheetCharts = async (data: ArrayBuffer) => {
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

  for (const sheet of elementsByLocal(workbookDocument.documentElement, 'sheet')) {
    const name = sheet.getAttribute('name') || ''
    const worksheetRelationship = relationById(workbookRelationships, relationshipId(sheet))
    if (!name || !worksheetRelationship?.type.endsWith(WORKSHEET_RELATIONSHIP_SUFFIX)) {
      continue
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
      await Promise.all(drawingParts.map((part) => parseDrawingCharts(zip, part)))
    ).flat()
    if (charts.length) {
      result[name] = charts
    }
  }

  return result
}
