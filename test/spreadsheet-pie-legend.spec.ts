import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { renderSpreadsheetChart } from '../packages/renderers/spreadsheet/src/spreadsheet/chartRenderer'
import type { SheetChart } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/type'

const makeChart = (type: SheetChart['type']): SheetChart => ({
  id: 'synthetic-category-legend', type, left: 0, top: 0, width: 640, height: 360, row: 0, col: 0,
  legendPosition: 'right',
  series: [{ name: 'Revenue', categories: ['Hardware', 'Software', 'Services'], values: [50, 30, 20] }],
})
const render = (chart: SheetChart) => renderSpreadsheetChart(new JSDOM().window.document, chart)
const labels = (svg: HTMLElement) => Array.from(svg.querySelectorAll('text[x="528"]')).map(node => node.textContent)
const colors = (svg: HTMLElement) => Array.from(svg.querySelectorAll('rect[x="510"]')).map(node => node.getAttribute('fill'))

describe('spreadsheet category legends', () => {
  it.each(['pie', 'doughnut'] as const)('%s uses category labels and the same colors as its slices', type => {
    const svg = render(makeChart(type))
    expect(labels(svg)).toEqual(['Hardware', 'Software', 'Services'])
    expect(colors(svg)).toEqual(Array.from(svg.querySelectorAll('path')).map(node => node.getAttribute('fill')))
  })
  it('keeps category indexes for zero/negative values, missing labels, and a partial category cache', () => {
    const chart = makeChart('pie')
    chart.series[0].values = [0, -5, 25]
    chart.series[0].categories = ['']
    const svg = render(chart)
    expect(labels(svg)).toEqual(['1', '2', '3'])
    expect(colors(svg)).toEqual(['#4472c4', '#ed7d31', '#70ad47'])
  })
  it.each([{ series: [] }, { series: [{ name: 'Empty', categories: [], values: [] }] }])('does not manufacture entries for empty series %j', ({ series }) => {
    const chart = makeChart('pie'); chart.series = series
    expect(labels(render(chart))).toEqual([])
  })
  it.each(['bar', 'line'] as const)('%s retains series names', type => {
    const chart = makeChart(type)
    chart.series.push({ name: 'Costs', categories: ['Hardware'], values: [10] })
    expect(labels(render(chart))).toEqual(['Revenue', 'Costs'])
  })
  it('preserves the existing eight-entry cap and disabled-legend behavior', () => {
    const chart = makeChart('pie')
    chart.series[0].values = Array(10).fill(1)
    chart.series[0].categories = []
    expect(labels(render(chart))).toHaveLength(8)
    chart.legendPosition = undefined
    expect(labels(render(chart))).toEqual([])
  })
})
