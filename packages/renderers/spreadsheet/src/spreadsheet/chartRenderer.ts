import type { SheetChart, SheetChartSeries } from './worker/type.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const DEFAULT_COLORS = ['#4472c4', '#ed7d31', '#70ad47', '#ffc000', '#5b9bd5', '#a5a5a5']
const MAX_LINE_POINTS_PER_PIXEL = 2

type Plot = {
  left: number
  top: number
  width: number
  height: number
  bottom: number
}

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
  return chart.type !== 'scatter' || chart.scatterStyle?.toLowerCase() !== 'marker'
}

const showsSeriesMarker = (chart: SheetChart, series: SheetChartSeries) => {
  if (series.marker) {
    return series.marker.symbol.toLowerCase() !== 'none'
  }
  if (chart.type !== 'scatter') {
    return false
  }
  const scatterStyle = (chart.scatterStyle || 'lineMarker').toLowerCase()
  return scatterStyle === 'marker' || scatterStyle.endsWith('marker')
}

const linePointIndexes = (values: number[], maxPoints: number) => {
  if (values.length <= maxPoints) {
    return values.map((_, index) => index)
  }

  const bucketCount = Math.max(1, Math.floor((maxPoints - 2) / 2))
  const bucketSize = (values.length - 2) / bucketCount
  const result = [0]
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.max(1, Math.floor(1 + bucket * bucketSize))
    const end = Math.min(values.length - 1, Math.ceil(1 + (bucket + 1) * bucketSize))
    let minIndex = start
    let maxIndex = start
    for (let index = start + 1; index < end; index += 1) {
      if (values[index] < values[minIndex]) {
        minIndex = index
      }
      if (values[index] > values[maxIndex]) {
        maxIndex = index
      }
    }
    if (minIndex <= maxIndex) {
      result.push(minIndex, maxIndex)
    } else {
      result.push(maxIndex, minIndex)
    }
  }
  result.push(values.length - 1)
  return Array.from(new Set(result))
}

const categoryLabelIndexes = (count: number, plotWidth: number) => {
  const limit = Math.max(2, Math.floor(plotWidth / 28))
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
  const labels = chart.series.find((series) => series.categories.length)?.categories || []
  const valueCount = Math.max(0, ...chart.series.map((series) => series.values.length))
  return labels.length ? labels : Array.from({ length: valueCount }, (_, index) => `${index + 1}`)
}

const valueDomain = (chart: SheetChart) => {
  const values = chart.series.flatMap((series) => series.values).filter(Number.isFinite)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  if (min === max) {
    return { min: 0, max: Math.max(1, max), span: Math.max(1, max) }
  }
  return { min, max, span: max - min }
}

const createPlot = (chart: SheetChart): Plot => {
  const hasTitle = !!chart.title
  const hasLegend = !!chart.legendPosition
  const rightLegend = chart.legendPosition === 'right'
  const top = hasTitle ? 48 : 24
  const bottom = hasLegend && !rightLegend ? 302 : 326
  const left = chart.valueAxisTitle ? 76 : 58
  const right = rightLegend ? 492 : 612
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
  domain: ReturnType<typeof valueDomain>
) => {
  const tickCount = 5
  for (let index = 0; index <= tickCount; index += 1) {
    const ratio = index / tickCount
    const y = plot.bottom - ratio * plot.height
    const value = domain.min + ratio * domain.span
    svg.appendChild(
      svgElement(documentRef, 'line', {
        x1: plot.left,
        y1: y,
        x2: plot.left + plot.width,
        y2: y,
        stroke: index === 0 ? '#9ca3af' : '#e5e7eb',
        'stroke-width': 1
      })
    )
    svg.appendChild(
      svgText(
        documentRef,
        Number.isInteger(value) ? `${value}` : value.toFixed(1),
        plot.left - 8,
        y + 4,
        {
          anchor: 'end',
          size: 10
        }
      )
    )
  }
}

const drawCategoryLabels = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot,
  pointAxis = false
) => {
  const categories = categoryLabels(chart)
  if (!categories.length) {
    return
  }
  const step = plot.width / categories.length
  categoryLabelIndexes(categories.length, plot.width).forEach((index) => {
    const category = categories[index]
    const maxLength = categories.length > 8 ? 8 : 14
    const label = category.length > maxLength ? `${category.slice(0, maxLength - 1)}…` : category
    const x =
      pointAxis && categories.length > 1
        ? plot.left + (index / (categories.length - 1)) * plot.width
        : plot.left + (index + 0.5) * step
    const labelElement = svgText(documentRef, label, x, plot.bottom + 17, {
      anchor: 'middle',
      size: 10
    })
    labelElement.classList.add('excel-chart-category-label')
    labelElement.dataset.categoryIndex = `${index}`
    svg.appendChild(labelElement)
  })
}

const drawColumnChart = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot
) => {
  const domain = valueDomain(chart)
  const categories = categoryLabels(chart)
  const categoryCount = Math.max(
    categories.length,
    ...chart.series.map((series) => series.values.length),
    1
  )
  const groupWidth = plot.width / categoryCount
  const seriesCount = Math.max(chart.series.length, 1)
  const slotWidth = (groupWidth * 0.76) / seriesCount
  const zeroY = plot.bottom - ((0 - domain.min) / domain.span) * plot.height

  drawValueGrid(documentRef, svg, plot, domain)
  chart.series.forEach((series, seriesIndex) => {
    series.values.forEach((value, valueIndex) => {
      const valueY = plot.bottom - ((value - domain.min) / domain.span) * plot.height
      const x = plot.left + valueIndex * groupWidth + groupWidth * 0.12 + seriesIndex * slotWidth
      const y = Math.min(zeroY, valueY)
      const rect = svgElement(documentRef, 'rect', {
        x,
        y,
        width: Math.max(1, slotWidth - 2),
        height: Math.max(1, Math.abs(zeroY - valueY)),
        fill: seriesColor(series, seriesIndex),
        rx: 1
      })
      const title = svgElement(documentRef, 'title')
      title.textContent = `${series.name}: ${value}`
      rect.appendChild(title)
      svg.appendChild(rect)
    })
  })
  drawCategoryLabels(documentRef, svg, chart, plot)
}

const drawHorizontalBarChart = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot
) => {
  const domain = valueDomain(chart)
  const categories = categoryLabels(chart)
  const categoryCount = Math.max(
    categories.length,
    ...chart.series.map((series) => series.values.length),
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
        size: 10
      })
    )
  })
}

const drawLineChart = (
  documentRef: Document,
  svg: SVGSVGElement,
  chart: SheetChart,
  plot: Plot,
  fillArea: boolean
) => {
  const domain = valueDomain(chart)
  const count = Math.max(...chart.series.map((series) => series.values.length), 1)
  const step = count > 1 ? plot.width / (count - 1) : plot.width

  drawValueGrid(documentRef, svg, plot, domain)
  chart.series.forEach((series, seriesIndex) => {
    const pointIndexes = linePointIndexes(
      series.values,
      Math.max(64, Math.floor(plot.width * MAX_LINE_POINTS_PER_PIXEL))
    )
    const points = pointIndexes.map((index) => {
      const value = series.values[index]
      return {
        x: plot.left + (count > 1 ? index * step : plot.width / 2),
        y: plot.bottom - ((value - domain.min) / domain.span) * plot.height
      }
    })
    if (!points.length) {
      return
    }
    const pathData = points
      .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`)
      .join(' ')
    if (fillArea && points.length > 1) {
      svg.appendChild(
        svgElement(documentRef, 'path', {
          d: `${pathData} L${points[points.length - 1].x},${plot.bottom} L${points[0].x},${plot.bottom} Z`,
          fill: seriesColor(series, seriesIndex),
          opacity: 0.2
        })
      )
    }
    const color = seriesColor(series, seriesIndex)
    const dashArray = seriesDashArray(series)
    if (showsSeriesLine(chart, series)) {
      svg.appendChild(
        svgElement(documentRef, 'path', {
          class: 'excel-chart-series-line',
          'data-source-point-count': series.values.length,
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
  })
  drawCategoryLabels(documentRef, svg, chart, plot, true)
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
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1
  const cx = chart.legendPosition === 'right' ? 260 : 320
  const cy = chart.title ? 180 : 170
  const radius = 120
  let angle = 0

  values.forEach((value, index) => {
    const nextAngle = angle + (Math.max(0, value) / total) * 360
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
  chart.series.slice(0, 8).forEach((series, index) => {
    const x = right ? 510 : 76 + (index % 4) * 136
    const y = right ? 72 + index * 28 : 342 - Math.floor(index / 4) * 20
    const color = seriesColor(series, index)
    const lineLike = chart.type === 'line' || chart.type === 'scatter' || chart.type === 'radar'
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

  const plot = createPlot(chart)
  switch (chart.type) {
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
