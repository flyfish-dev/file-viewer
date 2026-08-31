import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { renderSpreadsheetChart } from '../packages/renderers/spreadsheet/src/spreadsheet/chartRenderer'
import { parseSpreadsheetCharts } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/chartParser'
import type { SheetChart } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/type'

type ZipBuilder = {
  file: (path: string, data: string) => ZipBuilder
  generateAsync: (options: { type: 'uint8array'; compression: 'DEFLATE' }) => Promise<Uint8Array>
}

const spreadsheetRequire = createRequire(
  new URL('../packages/renderers/spreadsheet/package.json', import.meta.url)
)
const JSZip = spreadsheetRequire('jszip') as { new (): ZipBuilder }
const { read: readSpreadsheet } = spreadsheetRequire('styled-exceljs') as {
  read: (
    data: ArrayBuffer,
    options: Record<string, unknown>
  ) => NonNullable<Parameters<typeof parseSpreadsheetCharts>[1]>
}

const createLineChartFixture = async () => {
  const zip = new JSZip()
  zip.file(
    'xl/workbook.xml',
    `
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets>
    </workbook>`
  )
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
        Target="worksheets/sheet1.xml"/>
    </Relationships>`
  )
  zip.file(
    'xl/worksheets/_rels/sheet1.xml.rels',
    `
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
        Target="../drawings/drawing1.xml"/>
    </Relationships>`
  )
  zip.file(
    'xl/drawings/drawing1.xml',
    `
    <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
      xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <xdr:twoCellAnchor>
        <xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
        <xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>20</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
        <xdr:graphicFrame>
          <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Line chart"/></xdr:nvGraphicFramePr>
          <a:graphic><a:graphicData><c:chart r:id="rId1"/></a:graphicData></a:graphic>
        </xdr:graphicFrame>
      </xdr:twoCellAnchor>
    </xdr:wsDr>`
  )
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    `
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"
        Target="../charts/chart1.xml"/>
    </Relationships>`
  )
  zip.file(
    'xl/charts/chart1.xml',
    `
    <chartSpace xmlns="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <chart><plotArea><lineChart><grouping val="standard"/><ser>
        <tx><v>Grayscale</v></tx>
        <spPr><a:ln xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" w="4800">
          <a:solidFill><a:srgbClr val="0000FF"/></a:solidFill><a:prstDash val="solid"/>
        </a:ln></spPr>
        <marker><symbol val="none"/></marker>
        <cat><numRef><numCache>
          <pt idx="0"><v>1</v></pt><pt idx="1"><v>2</v></pt><pt idx="2"><v>3</v></pt>
        </numCache></numRef></cat>
        <val><numRef><numCache>
          <pt idx="0"><v>46</v></pt><pt idx="1"><v>64</v></pt><pt idx="2"><v>24</v></pt>
        </numCache></numRef></val>
      </ser></lineChart><catAx/><valAx/></plotArea><legend><legendPos val="r"/></legend></chart>
    </chartSpace>`
  )
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

const render = (chart: SheetChart) => {
  const documentRef = new JSDOM('<!doctype html><body></body>').window.document
  const element = renderSpreadsheetChart(documentRef, chart)
  documentRef.body.appendChild(element)
  return element
}

describe('spreadsheet line-chart fidelity', () => {
  it('parses OOXML line style and explicit marker suppression', async () => {
    const charts = await parseSpreadsheetCharts(await createLineChartFixture())
    expect(charts.Data?.[0]).toMatchObject({
      id: 'Line chart',
      type: 'line',
      grouping: 'standard',
      series: [
        {
          name: 'Grayscale',
          color: '#0000FF',
          lineDash: 'solid',
          lineVisible: true,
          marker: { symbol: 'none' },
          categories: ['1', '2', '3'],
          values: [46, 64, 24]
        }
      ]
    })
    expect(charts.Data?.[0]?.series[0]?.lineWidth).toBeCloseTo(4800 / 9525, 6)
  })

  it('renders a large marker-free line as a bounded SVG path with sampled labels', () => {
    const count = 10_000
    const element = render({
      id: 'large-line',
      type: 'line',
      title: 'Grayscale Value vs Index',
      legendPosition: 'right',
      series: [
        {
          name: 'Grayscale',
          categories: Array.from({ length: count }, (_, index) => `${index + 1}`),
          values: Array.from({ length: count }, (_, index) => 60 + Math.sin(index / 20) * 30),
          color: '#0000FF',
          lineWidth: 4800 / 9525,
          marker: { symbol: 'none' }
        }
      ],
      left: 0,
      top: 0,
      width: 600,
      height: 360,
      row: 1,
      col: 5
    })

    const path = element.querySelector('.excel-chart-series-line')
    expect(path?.getAttribute('data-source-point-count')).toBe(`${count}`)
    expect(Number(path?.getAttribute('data-rendered-point-count'))).toBeLessThanOrEqual(834)
    expect(Number(path?.getAttribute('stroke-width'))).toBeCloseTo(4800 / 9525, 6)
    expect(element.querySelectorAll('.excel-chart-marker')).toHaveLength(0)
    const labels = element.querySelectorAll('.excel-chart-category-label')
    expect(labels.length).toBeGreaterThan(2)
    expect(labels.length).toBeLessThanOrEqual(15)
    expect(labels[0]?.textContent).toBe('1')
    expect(labels[labels.length - 1]?.textContent).toBe('10000')
  })

  it('keeps marker-only scatter charts visually distinct from line charts', () => {
    const element = render({
      id: 'scatter',
      type: 'scatter',
      scatterStyle: 'marker',
      series: [{ name: 'Points', categories: ['1', '2', '3'], values: [2, 5, 3] }],
      left: 0,
      top: 0,
      width: 600,
      height: 360,
      row: 0,
      col: 0
    })

    expect(element.querySelector('.excel-chart-series-line')).toBeNull()
    expect(element.querySelectorAll('.excel-chart-marker')).toHaveLength(3)
  })

  it.runIf(Boolean(process.env.FILE_VIEWER_LINE_CHART_FIXTURE))(
    'retains every line-chart style in an external acceptance workbook',
    async () => {
      const path = process.env.FILE_VIEWER_LINE_CHART_FIXTURE || ''
      const bytes = readFileSync(path)
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      const workbook = readSpreadsheet(data, {
        type: 'array',
        dense: true,
        cellDates: true,
        cellStyles: true,
        browserPixels: true,
        drawings: true
      })
      const charts = await parseSpreadsheetCharts(data, workbook)
      const allCharts = Object.values(charts).flat()

      expect(Object.keys(charts)).toEqual([
        'region_1',
        'region_2',
        'region_3',
        'region_4',
        'region_5',
        'region_6'
      ])
      expect(allCharts).toHaveLength(6)
      allCharts.forEach((chart) => {
        expect(chart.type).toBe('line')
        expect(chart.grouping).toBe('standard')
        expect(chart.series).toHaveLength(1)
        expect(chart.series[0]?.marker).toEqual({ symbol: 'none', size: undefined })
        expect(chart.series[0]?.lineWidth).toBeCloseTo(4800 / 9525, 6)
      })
    }
  )
})
