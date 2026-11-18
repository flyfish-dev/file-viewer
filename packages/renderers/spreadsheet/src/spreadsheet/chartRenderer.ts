import type { SheetChart, SheetChartSeries, SheetChartValueAxis } from './worker/type.js'
import { extremaPointIndexes } from './chartSampling.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const DEFAULT_COLORS = ['#4472c4', '#ed7d31', '#70ad47', '#ffc000', '#5b9bd5', '#a5a5a5']
const MAX_LEGEND_ITEMS = 8
const MAX_LINE_POINTS_PER_PIXEL = 2

type Plot = {
  left: number
  top: number
  width: number
  height: number
  bottom: number
}
type IndexedSeries = { series: SheetChartSeries; index: number }

const svgElement = <K extends keyof SVGElementTagNameMap>(
  documentRef: Document,
  name: K,
  attributes: Record<string, string | number> = {}
) => {
  const element = documentRef.createElementNS(SVG_NAMESPACE, name)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

const svgText = (
  documentRef: Document,
  value: string,
  x: number,
  y: number,
  options: {
    anchor?: 'start' | 'middle' | 'end'
    size?: number
    weight?: string
    fill?: string
    rotate?: number
  } = {}
) => {
  const text = svgElement(documentRef, 'text', {
    x,
    y,
    'text-anchor': options.anchor || 'start',
    'font-family': "Aptos, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    'font-size': options.size || 11,
    'font-weight': options.weight || '400',
    fill: options.fill || '#5f6368'
  })
  if (options.rotate) {
    text.setAttribute('transform', `rotate(${options.rotate} ${x} ${y})`)
  }
  text.textContent = value
  return text
}

// The fixed plot coordinate system is letterboxed into the authored chart box.
// Compensate font units once for that intrinsic scale; sheet zoom is still
// applied by the containing renderer, so user zoom never gets cancelled out.
const axisFontSize = (chart: SheetChart, size: number | undefined, fallback: number) => {
  const scale = Math.min(chart.width / 640, chart.height / 360)
  return size !== undefined && Number.isFinite(size) && size > 0 && Number.isFinite(scale) && scale > 0
    ? size / scale : fallback
}

const seriesColor = (series: SheetChartSeries, index: number) => {
  return series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

const seriesStrokeWidth = (series: SheetChartSeries) => {
  return Math.min(8, Math.max(0.5, series.lineWidth || 2.5))
}

const seriesDashArray = (series: SheetChartSeries) => {
  switch (series.lineDash) {
    case 'dash':
    case 'sysDash':
      return '8 4'
    case 'dashDot':
    case 'sysDashDot':
      return '8 4 2 4'
    case 'dot':
    case 'sysDot':
      return '2 3'
    case 'lgDash':
      return '12 5'
    case 'lgDashDot':
      return '12 5 2 5'
    case 'lgDashDotDot':
      return '12 5 2 5 2 5'
    default:
      return undefined
  }
}

const showsSeriesLine = (chart: SheetChart, series: SheetChartSeries) => {
  if (series.lineVisible === false) {
    return false
  }
  return (series.type || chart.type) !== 'scatter' || chart.scatterStyle?.toLowerCase() !== 'marker'
}

const showsSeriesMarker = (chart: SheetChart, series: SheetChartSeries) => {
  if (series.marker) {
    return series.marker.symbol.toLowerCase() !== 'none'
  }
  if ((series.type || chart.type) !== 'scatter') {
    return false
  }
  const scatterStyle = (chart.scatterStyle || 'lineMarker').toLowerCase()
  return scatterStyle === 'marker' || scatterStyle.endsWith('marker')
}

const categoryLabelIndexes = (count: number, plotWidth: number, labelWidth = 28) => {
  const limit = Math.max(2, Math.floor(plotWidth / labelWidth))
  if (count <= limit) {
    return Array.from({ length: count }, (_, index) => index)
  }
  return Array.from(
    new Set(
      Array.from({ length: limit }, (_, index) => Math.round((index * (count - 1)) / (limit - 1)))
    )
  )
}

const drawSeriesMarker = (
  documentRef: Document,
  svg: SVGSVGElement,
  series: SheetChartSeries,
  color: string,
  x: number,
  y: number
) => {
  const symbol = series.marker?.symbol.toLowerCase() || 'circle'
  const radius = Math.min(10, Math.max(1.5, ((series.marker?.size || 5) * 4) / 6))
  const common = {
    class: 'excel-chart-marker',
    'data-marker-symbol': symbol
  }

  switch (symbol) {
    case 'square':
      svg.appendChild(
        svgElement(documentRef, 'rect', {
          ...common,
          x: x - radius,
          y: y - radius,
          width: radius * 2,
          height: radius * 2,
          fill: color
        })
      )
      break
    case 'diamond':
      svg.appendChild(
        svgElement(documentRef, 'polygon', {
          ...common,
          points: `${x},${y - radius} ${x + radius},${y} ${x},${y + radius} ${x - radius},${y}`,
          fill: color
        })
      )
      break
    case 'triangle':
      svg.appendChild(
        svgElement(documentRef, 'polygon', {
          ...common,
          points: `${x},${y - radius} ${x + radius},${y + radius} ${x - radius},${y + radius}`,
          fill: color
        })
      )
      break
    case 'dash':
      svg.appendChild(
        svgElement(documentRef, 'line', {
          ...common,
          x1: x - radius,
          y1: y,
          x2: x + radius,
          y2: y,
          stroke: color,
          'stroke-width': 2
        })
      )
      break
    case 'plus':
      svg.appendChild(
        svgElement(documentRef, 'path', {
          ...common,
          d: `M${x - radius},${y} L${x + radius},${y} M${x},${y - radius} L${x},${y + radius}`,
          fill: 'none',
          stroke: color,
          'stroke-width': 1.5
        })
      )
      break
    case 'x':
      svg.appendChild(
        svgElement(documentRef, 'path', {
          ...common,
          d: `M${x - radius},${y - radius} L${x + radius},${y + radius} M${x + radius},${y - radius} L${x - radius},${y + radius}`,
          fill: 'none',
          stroke: color,
          'stroke-width': 1.5
        })
      )
      break
    case 'dot':
    case 'circle':
    case 'auto':
    default:
      svg.appendChild(
        svgElement(documentRef, 'circle', {
          ...common,
          cx: x,
          cy: y,
          r: symbol === 'dot' ? Math.max(1, radius / 2) : radius,
          fill: color
        })
      )
      break
  }
}

const categoryLabels = (chart: SheetChart) => {
  const matching = chart.categoryAxisId
    ? chart.series.filter(series => series.categoryAxisId === chart.categoryAxisId)
    : []
  const candidates = matching.some(series => series.categories.length) ? matching : chart.series
  const labels = candidates.reduce<string[]>((longest, series) =>
    series.categories.length > longest.length ? series.categories : longest, [])
  const valueCount = chart.series.reduce(
    (count, series) => Math.max(count, series.values.length),
    0
  )
  return labels.length ? labels : Array.from({ length: valueCount }, (_, index) => `${index + 1}`)
}

const valueDomain = (seriesList: SheetChartSeries[]) => {
  let min = 0
  let max = 0
  seriesList.forEach((series) => {
    series.values.forEach((value) => {
      if (!Number.isFinite(value)) {
        return
      }
      min = Math.min(min, value)
      max = Math.max(max, value)
    })
  })
  if (min === max) {
    return { min: 0, max: Math.max(1, max), span: Math.max(1, max) }
  }
  return { min, max, span: max - min }
}

const createPlot = (chart: SheetChart, rightAxis = false): Plot => {
  const hasTitle = !!chart.title
  const hasLegend = !!chart.legendPosition
  const rightLegend = chart.legendPosition === 'right'
  const topLegend = chart.legendPosition === 'top'
  const legendRows = Math.ceil(Math.min(chart.series.length, MAX_LEGEND_ITEMS) / 4)
  const top = (hasTitle ? 48 : 24) + (topLegend ? legendRows * 20 : 0)
  const bottom = hasLegend && !rightLegend && !topLegend ? 302 : 326
  const left = chart.valueAxisTitle ? 76 : 58
  const right = (rightLegend ? 492 : 612) - (rightAxis ? 42 : 0)
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    bottom
  }
}

const drawValueGrid = (
  documentRef: Document,
  svg: SVGSVGElement,
  plot: Plot,
  domain: ReturnType<typeof valueDomain>,
  fontSize = 10,
  axis?: SheetChartValueAxis
) => {
  const right = axis?.position === 'right'
  const edge = right ? plot.left + plot.width : plot.left
  if (right) {
    svg.appendChild(svgElement(documentRef, 'line', {
      x1: edge, x2: edge, y1: plot.top, y2: plot.bottom, stroke: '#9ca3af'
    }))
  }
  const tickCount = 5
  for (let index = 0; index <= tickCount; index += 1) {
    const ratio = index / tickCount
    const y = plot.bottom - ratio * plot.height
    const value = domain.min + ratio * domain.span
    if (!right) svg.appendChild(
      svgElement(documentRef, 'line', {
        x1: plot.left,
        y1: y,
        x2: plot.left + plot.width,
        y2: y,
        stroke: index === 0 ? '#9ca3af' : '#e5e7eb',
        'stroke-width': 1
      })
    )
    if (!axis?.hidden) {
      const label = svgText(
        documentRef,
        Number.isInteger(value) ? `${value}` : value.toFixed(1),
        edge + (right ? 8 : -8),
        y + fontSize / 3,
        {
          anchor: right ? 'start' : 'end',
          size: fontSize
        }
      )
      if (axis) {
        label.classList.add('excel-chart-value-label')
        label.dataset.axisId = axis.id
        label.dataset.axisSide = axis.position
      }
      svg.appendChild(label)
    }
  }
}

const drawCategoryLabels = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot,
  pointAxis = false,
  bandCount?: number
) => {
  const categories = categoryLabels(chart)
  if (!categories.length) {
    return
  }
  const categorySeries = chart.series.find(series => series.categories === categories)
  const sourcePointCount = Math.max(
    ...chart.series.map(series => series.sourcePointCount || Math.max(series.values.length, series.categories.length)),
    categories.length
  )
  const step = plot.width / (bandCount || categories.length)
  const visible = categories.flatMap((label, i) => label ? [i] : [])
  const fontSize = axisFontSize(chart, chart.categoryAxisFontSize, 10)
  const dateLabelWidth = chart.categoryAxisDate ? categories.reduce((width, label) =>
    Math.max(width, label.length * fontSize * (/[^\x00-\x7f]/.test(label) ? 0.8 : 0.55) + 8), 28) : 28
  categoryLabelIndexes(visible.length, plot.width, dateLabelWidth).forEach((visibleIndex) => {
    const index = visible[visibleIndex]
    const category = categories[index]
    const maxLength = categories.length > 8 ? 8 : 14
    const label = !chart.categoryAxisDate && category.length > maxLength ? `${category.slice(0, maxLength - 1)}…` : category
    const sourceIndex = categorySeries?.sourcePointIndexes?.[index] ?? index
    const x =
      pointAxis && categories.length > 1
        ? plot.left + (sourceIndex / Math.max(sourcePointCount - 1, 1)) * plot.width
        : plot.left + ((bandCount ? sourceIndex : index) + 0.5) * step
    const labelElement = svgText(documentRef, label, x, plot.bottom + 17, {
      anchor: 'middle',
      size: fontSize
    })
    labelElement.classList.add('excel-chart-category-label')
    labelElement.dataset.categoryIndex = `${sourceIndex}`
    svg.appendChild(labelElement)
  })
}

const drawColumnSeries = (
  documentRef: Document,
  svg: SVGSVGElement,
  plot: Plot,
  entries: IndexedSeries[],
  categoryCount: number,
  domainFor: (series: SheetChartSeries) => ReturnType<typeof valueDomain>
) => {
  const groupWidth = plot.width / categoryCount
  const slotWidth = (groupWidth * 0.76) / Math.max(entries.length, 1)

  entries.forEach(({series, index}, slot) => {
    const domain = domainFor(series)
    const zeroY = plot.bottom - ((0 - domain.min) / domain.span) * plot.height
    series.values.forEach((value, valueIndex) => {
      if (!Number.isFinite(value)) return
      const valueY = plot.bottom - ((value - domain.min) / domain.span) * plot.height
      const x = plot.left + valueIndex * groupWidth + groupWidth * 0.12 + slot * slotWidth
      const y = Math.min(zeroY, valueY)
      const rect = svgElement(documentRef, 'rect', {
        x,
        y,
        width: Math.max(1, slotWidth - 2),
        height: Math.max(1, Math.abs(zeroY - valueY)),
        fill: seriesColor(series, index),
        rx: 1
      })
      const title = svgElement(documentRef, 'title')
      title.textContent = `${series.name}: ${value}`
      rect.appendChild(title)
      svg.appendChild(rect)
    })
  })
}

const drawColumnChart = (documentRef: Document, svg: SVGSVGElement, chart: SheetChart, plot: Plot) => {
  const domain = valueDomain(chart.series)
  const categoryCount = chart.series.reduce(
    (count, series) => Math.max(count, series.values.length, series.categories.length), 1
  )
  drawValueGrid(documentRef, svg, plot, domain, axisFontSize(chart, chart.valueAxisFontSize, 10))
  drawColumnSeries(documentRef, svg, plot, chart.series.map((series, index) => ({series, index})),
    categoryCount, () => domain)
  drawCategoryLabels(documentRef, svg, chart, plot)
}

const drawHorizontalBarChart = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot
) => {
  const domain = valueDomain(chart.series)
  const categories = categoryLabels(chart)
  const categoryCount = Math.max(
    categories.length,
    chart.series.reduce((count, series) => Math.max(count, series.values.length), 0),
    1
  )
  const groupHeight = plot.height / categoryCount
  const seriesCount = Math.max(chart.series.length, 1)
  const slotHeight = (groupHeight * 0.76) / seriesCount
  const zeroX = plot.left + ((0 - domain.min) / domain.span) * plot.width

  for (let index = 0; index <= 5; index += 1) {
    const ratio = index / 5
    const x = plot.left + ratio * plot.width
    svg.appendChild(
      svgElement(documentRef, 'line', {
        x1: x,
        y1: plot.top,
        x2: x,
        y2: plot.bottom,
        stroke: '#e5e7eb',
        'stroke-width': 1
      })
    )
  }

  chart.series.forEach((series, seriesIndex) => {
    series.values.forEach((value, valueIndex) => {
      if (!Number.isFinite(value)) return
      const valueX = plot.left + ((value - domain.min) / domain.span) * plot.width
      const y = plot.top + valueIndex * groupHeight + groupHeight * 0.12 + seriesIndex * slotHeight
      svg.appendChild(
        svgElement(documentRef, 'rect', {
          x: Math.min(zeroX, valueX),
          y,
          width: Math.max(1, Math.abs(valueX - zeroX)),
          height: Math.max(1, slotHeight - 2),
          fill: seriesColor(series, seriesIndex),
          rx: 1
        })
      )
    })
  })

  categories.forEach((category, index) => {
    svg.appendChild(
      svgText(documentRef, category, plot.left - 8, plot.top + (index + 0.5) * groupHeight + 4, {
        anchor: 'end',
        size: axisFontSize(chart, chart.categoryAxisFontSize, 10)
      })
    )
  })
}

const drawLineSeries = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot,
  entry: IndexedSeries,
  domain: ReturnType<typeof valueDomain>,
  xAt: (sourceIndex: number) => number,
  fillArea = false
) => {
  const { series, index: seriesIndex } = entry
  const pointIndexes = extremaPointIndexes(
    series.values,
    Math.max(64, Math.floor(plot.width * MAX_LINE_POINTS_PER_PIXEL)),
    series.spanBlankIndexes
  )
  const spanning = new Set(series.spanBlankIndexes || [])
  type Point = {x: number; y: number}
  const segments: Point[][] = []
  let segment: Point[] = []
  for (const index of pointIndexes) {
    const value = series.values[index]
    if (!Number.isFinite(value)) {
      if (spanning.has(index)) continue
      if (segment.length) segments.push(segment)
      segment = []
      continue
    }
    const sourceIndex = series.sourcePointIndexes?.[index] ?? index
    segment.push({
      x: xAt(sourceIndex),
      y: plot.bottom - ((value - domain.min) / domain.span) * plot.height
    })
  }
  if (segment.length) segments.push(segment)
  const points = segments.flat()
  if (!points.length) return
  const pathFor = (points: Point[]) => points
    .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')
  const pathData = segments.map(pathFor).join(' ')
  if (fillArea) {
    const zeroY = plot.bottom - ((0 - domain.min) / domain.span) * plot.height
    for (const points of segments) {
      if (points.length < 2) continue
      svg.appendChild(svgElement(documentRef, 'path', {
        class: 'excel-chart-area',
        d: `${pathFor(points)} L${points[points.length - 1].x},${zeroY} L${points[0].x},${zeroY} Z`,
        fill: seriesColor(series, seriesIndex), opacity: 0.2
      }))
    }
  }
  const color = seriesColor(series, seriesIndex)
  const dashArray = seriesDashArray(series)
  if (showsSeriesLine(chart, series)) {
    svg.appendChild(
      svgElement(documentRef, 'path', {
        class: 'excel-chart-series-line',
        ...(series.valueAxisId ? { 'data-axis-id': series.valueAxisId } : {}),
        'data-source-point-count': series.sourcePointCount || series.values.length,
        'data-transferred-point-count': series.values.length,
        'data-rendered-point-count': points.length,
        d: pathData,
        fill: 'none',
        stroke: color,
        'stroke-width': seriesStrokeWidth(series),
        ...(dashArray ? { 'stroke-dasharray': dashArray } : {}),
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round'
      })
    )
  }
  if (showsSeriesMarker(chart, series)) {
    points.forEach((point) => drawSeriesMarker(documentRef, svg, series, color, point.x, point.y))
  }
}

const drawLineChart = (
  documentRef: Document, svg: SVGSVGElement, chart: SheetChart, plot: Plot, fillArea: boolean
) => {
  const domain = valueDomain(chart.series)
  const count = chart.series.reduce(
    (pointCount, series) => Math.max(pointCount, series.sourcePointCount || series.values.length), 1
  )
  const xAt = (index: number) => plot.left + plot.width * (count > 1 ? index / (count - 1) : 0.5)
  drawValueGrid(documentRef, svg, plot, domain, axisFontSize(chart, chart.valueAxisFontSize, 10))
  chart.series.forEach((series, index) =>
    drawLineSeries(documentRef, svg, chart, plot, {series, index}, domain, xAt, fillArea))
  drawCategoryLabels(documentRef, svg, chart, plot, true)
}

const drawCombinationChart = (documentRef: Document, svg: SVGSVGElement, chart: SheetChart, plot: Plot) => {
  const byAxis = new Map<string | undefined, SheetChartSeries[]>()
  const entries = chart.series.map((series, index) => {
    const group = byAxis.get(series.valueAxisId)
    if (group) group.push(series)
    else byAxis.set(series.valueAxisId, [series])
    return {series, index}
  })
  const domains = new Map([...byAxis].map(([id, series]) => [id, valueDomain(series)]))
  const fallback = valueDomain(chart.series)
  const domainFor = (series: SheetChartSeries) => domains.get(series.valueAxisId) || fallback
  const left = chart.valueAxes?.find(axis => axis.position === 'left')
  const right = chart.valueAxes?.find(axis => axis.position === 'right' && !axis.hidden)
  drawValueGrid(documentRef, svg, plot, domains.get(left?.id) || fallback,
    axisFontSize(chart, left?.fontSize || chart.valueAxisFontSize, 10), left)
  if (right) {
    drawValueGrid(documentRef, svg, plot, domains.get(right.id) || fallback,
      axisFontSize(chart, right.fontSize, 10), right)
    if (right.title) {
      svg.appendChild(svgText(documentRef, right.title, plot.left + plot.width + 62, plot.top + plot.height / 2,
        { anchor: 'middle', size: 11, rotate: 90 }))
    }
  }
  const count = chart.series.reduce((length, series) => Math.max(
    length, series.sourcePointCount || series.values.length, series.categories.length
  ), 1)
  drawColumnSeries(documentRef, svg, plot, entries.filter(({series}) => series.type === 'bar'), count, domainFor)
  for (const entry of entries) {
    if (entry.series.type === 'line') {
      drawLineSeries(documentRef, svg, chart, plot, entry, domainFor(entry.series),
        index => plot.left + (index + 0.5) * plot.width / count)
    }
  }
  drawCategoryLabels(documentRef, svg, chart, plot, false, count)
}

const polarPoint = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  }
}

const pieSlicePath = (
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  // A single SVG arc with identical endpoints is empty, not a full circle.
  if (endAngle - startAngle >= 360 - 1e-7) {
    const a = polarPoint(cx, cy, outerRadius, startAngle)
    const b = polarPoint(cx, cy, outerRadius, startAngle + 180)
    const outer = `M${a.x},${a.y} A${outerRadius},${outerRadius} 0 1,0 ${b.x},${b.y} A${outerRadius},${outerRadius} 0 1,0 ${a.x},${a.y} Z`
    if (!innerRadius) return outer
    const c = polarPoint(cx, cy, innerRadius, startAngle)
    const d = polarPoint(cx, cy, innerRadius, startAngle + 180)
    return `${outer} M${c.x},${c.y} A${innerRadius},${innerRadius} 0 1,1 ${d.x},${d.y} A${innerRadius},${innerRadius} 0 1,1 ${c.x},${c.y} Z`
  }
  const outerStart = polarPoint(cx, cy, outerRadius, endAngle)
  const outerEnd = polarPoint(cx, cy, outerRadius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  if (!innerRadius) {
    return `M${cx},${cy} L${outerStart.x},${outerStart.y} A${outerRadius},${outerRadius} 0 ${largeArc},0 ${outerEnd.x},${outerEnd.y} Z`
  }
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle)
  const innerEnd = polarPoint(cx, cy, innerRadius, endAngle)
  return `M${outerStart.x},${outerStart.y} A${outerRadius},${outerRadius} 0 ${largeArc},0 ${outerEnd.x},${outerEnd.y} L${innerStart.x},${innerStart.y} A${innerRadius},${innerRadius} 0 ${largeArc},1 ${innerEnd.x},${innerEnd.y} Z`
}

const drawPieChart = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  doughnut: boolean
) => {
  const series = chart.series[0]
  const values = series?.values || []
  const categories = series?.categories || []
  const max = values.reduce((m, v) => Number.isFinite(v) ? Math.max(m, v) : m, 0) || 1
  const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? Math.max(0, value) / max : 0), 0) || 1
  const cx = chart.legendPosition === 'right' ? 260 : 320
  const cy = chart.title ? 180 : 170
  const radius = 120
  let angle = 0

  values.forEach((value, index) => {
    if (!Number.isFinite(value) || value <= 0) return
    const nextAngle = angle + (value / max / total) * 360
    const color = DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    const path = svgElement(documentRef, 'path', {
      d: pieSlicePath(cx, cy, radius, doughnut ? 62 : 0, angle, nextAngle),
      fill: color,
      stroke: '#ffffff',
      'stroke-width': 1.5
    })
    const title = svgElement(documentRef, 'title')
    title.textContent = `${categories[index] || index + 1}: ${value}`
    path.appendChild(title)
    svg.appendChild(path)
    angle = nextAngle
  })
}

const drawLegend = (documentRef: Document, svg: SVGSVGElement, chart: SheetChart) => {
  if (!chart.legendPosition) {
    return
  }
  const right = chart.legendPosition === 'right'
  const top = chart.legendPosition === 'top'
  const categorySeries = chart.type === 'pie' || chart.type === 'doughnut' ? chart.series[0] : undefined
  // Build only visible entries when a pie has a large category cache.
  const entries = chart.type === 'pie' || chart.type === 'doughnut'
    ? (categorySeries?.values || []).slice(0, MAX_LEGEND_ITEMS).map((_, index) => ({
        ...categorySeries!,
        name: categorySeries!.categories[index] || `${index + 1}`,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      }))
    : chart.series
  entries.slice(0, MAX_LEGEND_ITEMS).forEach((series, index) => {
    const x = right ? 510 : 76 + (index % 4) * 136
    const y = right ? 72 + index * 28 : top
      ? (chart.title ? 48 : 24) + Math.floor(index / 4) * 20
      : 342 - Math.floor(index / 4) * 20
    const color = seriesColor(series, index)
    const seriesType = series.type || chart.type
    const lineLike = seriesType === 'line' || seriesType === 'scatter' || seriesType === 'radar'
    if (lineLike) {
      if (showsSeriesLine(chart, series)) {
        const dashArray = seriesDashArray(series)
        svg.appendChild(
          svgElement(documentRef, 'line', {
            x1: x,
            y1: y - 5,
            x2: x + 12,
            y2: y - 5,
            stroke: color,
            'stroke-width': seriesStrokeWidth(series),
            ...(dashArray ? { 'stroke-dasharray': dashArray } : {})
          })
        )
      }
      if (showsSeriesMarker(chart, series)) {
        drawSeriesMarker(documentRef, svg, series, color, x + 6, y - 5)
      }
    } else {
      svg.appendChild(
        svgElement(documentRef, 'rect', {
          x,
          y: y - 10,
          width: 10,
          height: 10,
          fill: color
        })
      )
    }
    const label = series.name.length > 16 ? `${series.name.slice(0, 15)}…` : series.name
    svg.appendChild(svgText(documentRef, label, x + 18, y, { size: 10 }))
  })
}

export const renderSpreadsheetChart = (documentRef: Document, chart: SheetChart) => {
  const container = documentRef.createElement('div')
  container.className = 'excel-chart'
  container.dataset.chartId = chart.id
  container.dataset.chartType = chart.type
  container.dataset.seriesNames = JSON.stringify(chart.series.map((series) => series.name))
  container.dataset.seriesMarkers = JSON.stringify(
    chart.series.map((series) => series.marker?.symbol || null)
  )
  container.setAttribute('role', 'img')
  container.setAttribute('aria-label', chart.title || chart.id || 'Spreadsheet chart')

  const svg = svgElement(documentRef, 'svg', {
    viewBox: '0 0 640 360',
    preserveAspectRatio: 'xMidYMid meet',
    focusable: 'false',
    'aria-hidden': 'true'
  })
  svg.appendChild(
    svgElement(documentRef, 'rect', {
      x: 0.5,
      y: 0.5,
      width: 639,
      height: 359,
      fill: '#ffffff',
      stroke: '#d1d5db'
    })
  )

  if (chart.title) {
    svg.appendChild(
      svgText(documentRef, chart.title, 320, 28, {
        anchor: 'middle',
        size: 16,
        weight: '600',
        fill: '#1f2937'
      })
    )
  }

  const rightAxis = chart.valueAxes?.find(axis => axis.position === 'right' && !axis.hidden)
  const plot = createPlot(chart, !!rightAxis)
  if (chart.series.some(series => series.type === 'bar') && chart.series.some(series => series.type === 'line')) {
    drawCombinationChart(documentRef, svg, chart, plot)
  } else switch (chart.type) {
    case 'pie':
      drawPieChart(documentRef, svg, chart, false)
      break
    case 'doughnut':
      drawPieChart(documentRef, svg, chart, true)
      break
    case 'line':
    case 'scatter':
    case 'radar':
      drawLineChart(documentRef, svg, chart, plot, false)
      break
    case 'area':
      drawLineChart(documentRef, svg, chart, plot, true)
      break
    case 'bar':
    default:
      if (chart.barDirection === 'bar') {
        drawHorizontalBarChart(documentRef, svg, chart, plot)
      } else {
        drawColumnChart(documentRef, svg, chart, plot)
      }
      break
  }

  if (chart.categoryAxisTitle && chart.type !== 'pie' && chart.type !== 'doughnut') {
    svg.appendChild(
      svgText(documentRef, chart.categoryAxisTitle, plot.left + plot.width / 2, 324, {
        anchor: 'middle',
        size: 11,
        fill: '#374151'
      })
    )
  }
  if (chart.valueAxisTitle && chart.type !== 'pie' && chart.type !== 'doughnut') {
    svg.appendChild(
      svgText(documentRef, chart.valueAxisTitle, 18, plot.top + plot.height / 2, {
        anchor: 'middle',
        size: 11,
        fill: '#374151',
        rotate: -90
      })
    )
  }
  drawLegend(documentRef, svg, chart)
  container.appendChild(svg)
  return container
}
