import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import renderSpreadsheet from '../packages/renderers/spreadsheet/src/spreadsheet'
import { findFileViewerSearchProvider, findFileViewerViewStateProvider } from '../packages/core/src/features/document/dom/providers'
import type { FileViewerSpreadsheetOptions } from '../packages/core/src/contracts/types'
import { getDataKey } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import {
  createSpreadsheetParserContext,
  parseSpreadsheetWorkbook,
  parseSpreadsheetSheet,
  searchSpreadsheetWorkbook,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'

const captured = vi.hoisted(() => ({ tables: [] as any[] }))
const spreadsheetRequire = createRequire(new URL('../packages/renderers/spreadsheet/package.json', import.meta.url))
const { utils, write } = spreadsheetRequire('styled-exceljs')
const tableModulePath = spreadsheetRequire.resolve('e-virt-table/dist/index.es.js')

// The renderer, parser worker and search provider are real.
// JSDOM uses a substitute only for the vendor's canvas drawing and layout.
vi.doMock(tableModulePath, async () => {
  await vi.importActual(tableModulePath)
  return {
    'module.exports': undefined,
    EVirtTable: undefined,
    default: class TableDrawingStub {
      data: any[]
      config: any
      columns: any[]
      ctx: any
      scrolls: number[][] = []
      constructor(host: HTMLElement, options: any) {
        this.data = options.data
        this.config = options.config
        this.columns = options.columns
        this.ctx = {
          containerElement: host, isTarget: () => true,
          body: { headIndex: 0, tailIndex: 3 }, scrollX: 0, scrollY: 0,
        }
        captured.tables.push(this)
      }
      on() {}
      loadConfig(config: any) { this.config = config }
      loadColumns(columns: any[]) { this.columns = columns }
      loadData(rows: any[]) { this.data = rows }
      draw() {}
      doLayout() {}
      destroy() {}
      setCustomHeader() {}
      scrollTo(x: number, y: number) {
        this.ctx.scrollX = x
        this.ctx.scrollY = y
        this.scrolls.push([x, y])
      }
    },
  }
})

const rows = [
  ['Month', 'Product A', 'Product B', 'Product C', 'Total'],
  ['Jan', 10, 20, 30, 60], ['Feb', 12, 22, 32, 66], ['Mar', 14, 24, 34, 72],
]
const cases = [
  { name: 'text-header XLSX', csv: false },
  { name: 'text-header CSV', csv: true },
  { name: 'numeric first row', csv: false, numeric: true },
  { name: 'merged first row', csv: false, merge: true },
  { name: 'hidden middle row', csv: false, hidden: true },
  { name: 'merged header and hidden middle row', csv: false, merge: true, hidden: true },
  { name: 'only the first row hidden', csv: false, hiddenFirst: true },
]

let instance: Awaited<ReturnType<typeof renderSpreadsheet>> | undefined
let dom: JSDOM | undefined
const mount = async (buffer: ArrayBuffer, extension: string, options: FileViewerSpreadsheetOptions = {}, height = 20) => {
  dom = new JSDOM('<!doctype html><html><body><div id="target"></div></body></html>', { url: 'http://localhost/' })
  const window = dom.window
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Document',
    'DocumentFragment', 'ShadowRoot', 'MessageEvent', 'ErrorEvent'] as const) {
    vi.stubGlobal(key, key === 'window' ? window : window[key])
  }
  const raf = (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0)
  vi.stubGlobal('requestAnimationFrame', raf)
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  window.requestAnimationFrame = raf as any
  window.cancelAnimationFrame = clearTimeout as any
  window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get: () => 800 })
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get: () => height })
  instance = await renderSpreadsheet(
    buffer, window.document.getElementById('target') as HTMLDivElement, extension,
    { filename: 'row-offset.' + extension, options: { spreadsheet: { worker: false, ...options } } } as any,
  )
  return captured.tables.at(-1)
}
const label = (table: any, rowIndex: number) => table.config.BODY_CELL_FORMATTER_METHOD({
  row: table.data[rowIndex], rowIndex, colIndex: 0, column: { key: '__index' },
})
const workbookBytes = (data: unknown[][], extension = 'xlsx', configure?: (sheet: any, workbook: any) => void) => {
  const workbook = utils.book_new()
  const sheet = utils.aoa_to_sheet(data)
  utils.book_append_sheet(workbook, sheet, 'Sales')
  configure?.(sheet, workbook)
  return extension === 'csv' || extension === 'tsv'
    ? new TextEncoder().encode(utils.sheet_to_csv(sheet, { FS: extension === 'tsv' ? '\t' : ',' })).buffer
    : write(workbook, { type: 'array', bookType: extension }) as ArrayBuffer
}
afterEach(() => {
  instance?.unmount()
  instance = undefined
  dom?.window.close()
  dom = undefined
  captured.tables.length = 0
  vi.unstubAllGlobals()
})

describe('spreadsheet source row coordinates (#447)', () => {
  it('keeps a lone first-row height sparse except in a genuinely single-row window', async () => {
    const sheet = utils.aoa_to_sheet(rows)
    sheet['!rows'] = [{ hidden: true }]
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, sheet, 'Sales')
    const parser = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(parser, write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
    const sheetId = parser.sheets[0].id
    const full = parseSpreadsheetSheet(parser, { sheet: sheetId, pageSize: 4 })[0]
    expect(full.payload?.sheetData.rowHeights).toEqual([0])
    const single = parseSpreadsheetSheet(parser, { sheet: sheetId, pageSize: 1 })[0]
    expect(single.payload?.sheetData.rowHeights).toBe(0)
  })
  it.each([
    { name: 'nonzero multi-row window', hiddenRow: 2, startRow: 2, pageSize: 2, expected: [0] },
    { name: 'tail single-row window', hiddenRow: 3, startRow: 3, pageSize: 500, expected: 0 },
  ])('preserves sparse row heights in a $name', async ({ hiddenRow, startRow, pageSize, expected }) => {
    const sheet = utils.aoa_to_sheet(rows)
    sheet['!rows'] = []
    sheet['!rows'][hiddenRow] = { hidden: true }
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, sheet, 'Sales')
    const parser = createSpreadsheetParserContext()
    await parseSpreadsheetWorkbook(parser, write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
    const window = parseSpreadsheetSheet(parser, { sheet: parser.sheets[0].id, startRow, pageSize })[0]
    expect(window.payload?.sheetData.rowHeights).toEqual(expected)
    expect(window.payload?.sheetData.meta.startRow).toBe(startRow)
    expect(window.payload?.sheetData.meta.endRow).toBe(4)
  })
  for (const sample of cases) {
    it('aligns parser, renderer and search navigation: ' + sample.name, async () => {
      const data = sample.numeric ? [['1', '2', '3', '4', '5'], ...rows.slice(1)] : rows
      const sheet = utils.aoa_to_sheet(data)
      if (sample.merge) sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
      if (sample.hidden) sheet['!rows'] = [{}, { hidden: true }]
      if (sample.hiddenFirst) sheet['!rows'] = [{ hidden: true }]
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, sheet, 'Sales')
      const buffer = sample.csv
        ? new TextEncoder().encode(utils.sheet_to_csv(sheet)).buffer
        : write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const extension = sample.csv ? 'csv' : 'xlsx'

      const parser = createSpreadsheetParserContext()
      const responses = await parseSpreadsheetWorkbook(parser, buffer, { fileType: extension })
      expect(responses.some(response => response.type === 'parseError')).toBe(false)
      const parsed = parseSpreadsheetSheet(parser, { sheet: parser.sheets[0].id })[0]
      expect(parsed.payload?.sheetData.meta).toMatchObject({ totalRows: 4, totalCols: 5 })
      expect(searchSpreadsheetWorkbook(parser, 'Jan')[0]).toMatchObject({ row: 1, col: 0 })

      const table = await mount(buffer, extension, { fillViewport: false })
      await vi.waitFor(() => expect(table.data.filter((row: any) => row.__s === 2)).toHaveLength(4))
      const labels = table.data.map((row: any, rowIndex: number) =>
        table.config.BODY_CELL_FORMATTER_METHOD({
          row, rowIndex, colIndex: 0, column: { key: '__index' },
        }))
      expect(labels).toEqual(sample.hiddenFirst ? ['', '2', '3', '4']
        : sample.hidden ? ['1', '', '3', '4'] : ['1', '2', '3', '4'])

      const provider = findFileViewerSearchProvider(instance.$el)!
      expect(provider).toBeTruthy()
      const before = table.scrolls.length
      const search = await provider.search('Jan')
      expect(search.current?.anchor?.label).toBe((sample.csv ? 'Sheet1' : 'Sales') + '!A2')
      expect(search.current?.anchor?.line).toBe(2)
      expect((search.current?.anchor as any)?.spreadsheet).toMatchObject({ row: 1, col: 0 })
      await vi.waitFor(() => expect(table.scrolls.length).toBeGreaterThan(before))
      // Header 34px + first row (20px, or 0.1px when hidden) - 35% of a 20px viewport.
      expect(table.scrolls.at(-1)[1]).toBeCloseTo(sample.hiddenFirst ? 27.1 : 47)
    })
  }
})

for (const mode of ['source', 'legacy-records'] as const) {
  describe('source coordinates with ' + mode + ' gutter', () => {
    it.each(['xlsx', 'csv', 'tsv', 'dbf', 'xls', 'ods'])('preserves real %s data, search and zero-based ranges with default viewport fill', async extension => {
      const buffer = workbookBytes(rows, extension)
      const parser = createSpreadsheetParserContext()
      await parseSpreadsheetWorkbook(parser, buffer, { fileType: extension })
      const model = parseSpreadsheetSheet(parser, { sheet: parser.sheets[0].id })[0].payload!.sheetData
      expect(model.meta).toMatchObject({ totalRows: 4, totalCols: 5 })
      expect(model.data[0]).toEqual(rows[0])
      expect(searchSpreadsheetWorkbook(parser, 'Jan')[0]).toMatchObject({ row: 1, col: 0 })
      const table = await mount(buffer, extension, { rowNumberMode: mode }, 400)
      await vi.waitFor(() => {
        expect(table.data.length).toBeGreaterThan(4)
        expect(table.data.slice(0, 4).every((row: any) => row.__s === 2)).toBe(true)
      })
      expect(table.columns[0].title).toBe(mode === 'source' ? '' : '#')
      expect([0, 1, 2, 3].map(index => label(table, index))).toEqual(mode === 'source' ? ['1', '2', '3', '4'] : ['', '1', '2', '3'])
      expect(table.data[0][getDataKey(0)]).toBe('Month')
      const provider = findFileViewerSearchProvider(instance!.$el)!
      const header = await provider.search('Month')
      expect(header.current?.anchor?.label).toBe(parser.sheets[0].name + '!A1')
      expect((header.current?.anchor as any).spreadsheet).toMatchObject({ row: 0, col: 0 })
      const before = table.scrolls.length
      const result = await provider.search('Jan')
      expect(result.total).toBe(1)
      expect(result.current?.anchor?.label).toBe(parser.sheets[0].name + '!A2')
      expect(result.current?.anchor?.line).toBe(2)
      expect((result.current?.anchor as any).spreadsheet).toMatchObject({ row: 1, col: 0 })
      await vi.waitFor(() => expect(table.scrolls.length).toBeGreaterThan(before))
      const range = { sheetId: parser.sheets[0].id, startRow: 1, startCol: 0, endRow: 1, endCol: 0 }
      const view = findFileViewerViewStateProvider(instance!.$el)!
      expect((await view.applyState({ spreadsheet: { range } })).spreadsheet).toMatchObject({ range, status: 'applied' })
      expect(table.data[range.startRow][getDataKey(range.startCol)]).toBe('Jan')
      expect((await provider.search('NoSuchPaddingValue')).total).toBe(0)
    })

    it('keeps an empty sheet as display-only padding without inventing search hits', async () => {
      const buffer = workbookBytes([])
      const parser = createSpreadsheetParserContext()
      await parseSpreadsheetWorkbook(parser, buffer, { includeEmptySheets: true })
      const model = parseSpreadsheetSheet(parser, { sheet: 0 })[0].payload!.sheetData
      expect(model.meta).toMatchObject({ totalRows: 0, totalCols: 0 })
      expect(model.data).toEqual([])
      const table = await mount(buffer, 'xlsx', { rowNumberMode: mode }, 400)
      await vi.waitFor(() => expect(table.data.length).toBeGreaterThan(0))
      expect(label(table, 0)).toBe('1')
      expect(table.columns[0].title).toBe(mode === 'source' ? '' : '#')
      const provider = findFileViewerSearchProvider(instance!.$el)!
      expect((await provider.search('Month')).total).toBe(0)
    })

    it.each([
      { name: 'leading blank row', data: [[], ...rows], targetRow: 2, offset: 0 },
      { name: 'interior blank row', data: [rows[0], rows[1], [], ...rows.slice(2)], targetRow: 1, offset: 1 },
      { name: 'ordinary text data', data: [['Alice', 'West', 'Active'], ['Jan', 'East', 'Ready']], targetRow: 1, offset: 1 },
      { name: 'negative numbers stored as text', data: [['-1', '-2', '-3'], ['Jan', 10, 20]], targetRow: 1, offset: 1 },
      { name: 'single row', data: [rows[1]], targetRow: 0, offset: 0 },
      { name: 'merged header', data: rows, targetRow: 1, offset: 0, merge: true },
      { name: 'hidden first row', data: rows, targetRow: 1, offset: 1, hidden: 0 },
      { name: 'hidden middle row', data: rows, targetRow: 1, offset: 1, hidden: 1 },
    ])('keeps $name data and source navigation', async sample => {
      const buffer = workbookBytes(sample.data, 'xlsx', sheet => {
        if (sample.merge) sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
        if (sample.hidden !== undefined) { sheet['!rows'] = []; sheet['!rows'][sample.hidden] = { hidden: true } }
      })
      const table = await mount(buffer, 'xlsx', { rowNumberMode: mode, fillViewport: false })
      await vi.waitFor(() => {
        expect(table.data).toHaveLength(sample.data.length)
        expect(table.data.every((row: any) => row.__s === 2)).toBe(true)
      })
      const expectedOffset = mode === 'legacy-records' ? sample.offset : 0
      expect(table.data.map((_: any, index: number) => label(table, index))).toEqual(sample.data.map((_, index) => {
        if (index === sample.hidden || index + 1 <= expectedOffset) return ''
        return String(index + 1 - expectedOffset)
      }))
      const provider = findFileViewerSearchProvider(instance!.$el)!
      const before = table.scrolls.length
      const result = await provider.search('Jan')
      expect(result.current?.anchor?.label).toBe(`Sales!A${sample.targetRow + 1}`)
      expect((result.current?.anchor as any).spreadsheet).toMatchObject({ row: sample.targetRow, col: 0 })
      await vi.waitFor(() => expect(table.scrolls.length).toBeGreaterThan(before))
      expect(table.data[sample.targetRow][getDataKey(0)]).toBe('Jan')
    })

    it('keeps numbering through 500-row windows, later merges and cached sheet returns', async () => {
      const data = [rows[0], ...Array.from({ length: 600 }, (_, index) => [`Record-${index + 1}`, index + 1, 20, 30, 60])]
      const buffer = workbookBytes(data, 'xlsx', (sheet, workbook) => {
        sheet['!merges'] = [{ s: { r: 550, c: 3 }, e: { r: 550, c: 4 } }]
        utils.book_append_sheet(workbook, utils.aoa_to_sheet([[1, 2, 3], ['OtherTarget', 4, 5]]), 'Numeric')
      })
      const table = await mount(buffer, 'xlsx', { rowNumberMode: mode, fillViewport: false })
      await vi.waitFor(() => expect(table.data[1][getDataKey(0)]).toBe('Record-1'))
      const provider = findFileViewerSearchProvider(instance!.$el)!
      const jump = async (query: string, sheetName: string, sourceRow: number, expectedLabel: string) => {
        const before = table.scrolls.length
        const result = await provider.search(query, { wholeWord: true })
        expect(result.total).toBe(1)
        expect(result.current?.anchor?.label).toBe(`${sheetName}!A${sourceRow + 1}`)
        expect((result.current?.anchor as any).spreadsheet).toMatchObject({ row: sourceRow, col: 0 })
        await vi.waitFor(() => {
          expect(table.scrolls.length).toBeGreaterThan(before)
          expect(table.data[sourceRow][getDataKey(0)]).toBe(query)
          expect(label(table, sourceRow)).toBe(expectedLabel)
        })
      }
      const ordinal = (row: number) => String(row + (mode === 'source' ? 1 : 0))
      await jump('Record-499', 'Sales', 499, ordinal(499))
      await jump('Record-500', 'Sales', 500, ordinal(500))
      await jump('Record-550', 'Sales', 550, ordinal(550))
      await jump('Record-600', 'Sales', 600, ordinal(600))
      await jump('OtherTarget', 'Numeric', 1, '2')
      await jump('Record-550', 'Sales', 550, ordinal(550))
      await jump('Record-1', 'Sales', 1, ordinal(1))
      const range = { sheetId: 0, startRow: 600, startCol: 0, endRow: 600, endCol: 0 }
      const view = findFileViewerViewStateProvider(instance!.$el)!
      expect((await view.applyState({ spreadsheet: { range } })).spreadsheet).toMatchObject({ range, status: 'applied' })
      expect(table.data[600][getDataKey(0)]).toBe('Record-600')
      expect(label(table, 600)).toBe(ordinal(600))
    })
  })
}
