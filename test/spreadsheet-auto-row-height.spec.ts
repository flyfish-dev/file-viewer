import SheetJsModel from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/SheetJsModel'
import { parseSpreadsheetCharts } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/chartParser'
import { afterEach, describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import {
  createRowSizingScanner,
  readStoredRowSizing,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/rowSizing'
import {
  createDrawingRowAnchor,
  readImageRowAnchors,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/drawingRowAnchor'
import { applyAutoRowDrawingGeometry } from '../packages/renderers/spreadsheet/src/spreadsheet/drawingAutoHeight'
import {
  canAutoSizeRow,
  createAutoRowHeight,
} from '../packages/renderers/spreadsheet/src/spreadsheet/autoRowHeight'
import { createEmptyVirtualState } from '../packages/renderers/spreadsheet/src/spreadsheet/state'
import {
  createSpreadsheetParserContext,
  handleSpreadsheetWorkerRequest,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'

describe('source sizing provenance', () => {
  it('reads split namespaced row tags but ignores comments and CDATA', () => {
    const xml =
      '<s:worksheet><s:sheetData><!-- <row r="99" customHeight="1"/> --><![CDATA[<row r="98" customHeight="1"/>]]><s:row r="1" customHeight="1"/><s:row r="2" customHeight="0"/><s:row r="3" customHeight="true" ht="15"/><s:row r="4" ht="bad"/><s:row r="5" customHeight="&#49;"/></s:sheetData></s:worksheet>'
    const scanner = createRowSizingScanner()
    for (const char of xml) scanner.push(char)
    expect(scanner.finish()).toEqual({ fixedRows: [0, 3, 4] })
  })
  it('bounds malformed tags, row indices and incomplete comments', () => {
    expect(() =>
      createRowSizingScanner().push('<row x="' + 'a'.repeat(65537)),
    ).toThrow()
    expect(() => createRowSizingScanner().push('<row r="1048577"/>')).toThrow()
    const scanner = createRowSizingScanner()
    scanner.push('<!-- unfinished')
    expect(() => scanner.finish()).toThrow()
  })
  it('does not infer customHeight from text inside an unrelated attribute', () => {
    const scanner = createRowSizingScanner()
    scanner.push('<row r="1" note="customHeight=\'1\'"/>')
    expect(scanner.finish().fixedRows).toEqual([])
  })
  it('retains the original generator source and adds row hints without changing text or stored heights', async () => {
    const bytes = await readFile(
      new URL(
        './fixtures/spreadsheet-auto-row-height/original-454.xlsx',
        import.meta.url,
      ),
    )
    const zip = await JSZip.loadAsync(bytes)
    let sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    sheet = sheet
      .replace('<row r="1">', '<row r="1" customHeight="1">')
      .replace('<row r="2">', '<row r="2" ht="15" customHeight="0">')
    zip.file('xl/worksheets/sheet1.xml', sheet)
    expect(await readStoredRowSizing(zip, 'xl/worksheets/sheet1.xml')).toEqual({
      fixedRows: [0],
    })
    const context = createSpreadsheetParserContext(),
      data = await zip.generateAsync({ type: 'arraybuffer' })
    await handleSpreadsheetWorkerRequest(context, {
      type: 'parseWorkbook',
      payload: { workbook: data, filename: 'custom.xlsx' },
    })
    const response = await handleSpreadsheetWorkerRequest(context, {
      type: 'parseSheet',
      payload: { sheet: 0, startRow: 0, pageSize: 500 },
    })
    const model = (
      response.find((item) => item.type === 'parseSheet')?.payload as any
    )?.sheetData
    expect(model?.structure?.rowSizing?.fixedRows).toEqual([0])
    expect(model?.structure?.rowHeights?.[1]).toBe(20)
  })
  it('keeps explicit, hidden, unknown-provenance and manual rows out of automatic sizing', () => {
    const state = createEmptyVirtualState()
    expect(canAutoSizeRow(state, 0)).toBe(true)
    state.fixedHeightRows.add(0)
    expect(canAutoSizeRow(state, 0)).toBe(false)
    state.sourceRowHeights.set(1, 0.1)
    expect(canAutoSizeRow(state, 1)).toBe(false)
    state.rowHeightOverrides.set(2, 22)
    expect(canAutoSizeRow(state, 2)).toBe(false)
    state.autoHeightDisabled = true
    expect(canAutoSizeRow(state, 3)).toBe(false)
  })
})

describe('drawing source anchors and auto-only offsets', () => {
  it('retains real OOXML chart anchors through the parser and model', async () => {
    const buffer = await readFile(
      new URL(
        './fixtures/spreadsheet-auto-row-height/autoheight-drawings.xlsx',
        import.meta.url,
      ),
    )
    const charts = await parseSpreadsheetCharts(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
    )
    const chart = Object.values(charts).flat()[0]
    expect(chart.rowAnchor).toMatchObject({
      mode: 'twoCell',
      fromRow: 0,
      toRow: 2,
      fromOffset: 19050,
      toOffset: 19050,
    })
    const model = SheetJsModel.create({ '!ref': 'A1:J3' } as any, {
      charts: [chart],
    })
    expect(model.structure.charts[0].rowAnchor).toEqual(chart.rowAnchor)
  })
  it('marks model cell images with their real source row across windows', () => {
    const model = SheetJsModel.create({ '!ref': 'A1:B651' } as any, {
      startRow: 500,
      cellImages: [
        {
          id: 'cell-control',
          src: 'data:image/png;base64,AA==',
          row: 650,
          col: 1,
        },
      ],
    })
    const image = model.structure.images[0]
    expect(image.rowAnchor).toEqual({
      mode: 'cell',
      fromRow: 650,
      fromOffset: 0,
    })
    const state = createEmptyVirtualState()
    state.autoRowHeights.set(0, 80)
    state.autoRowHeights.set(650, 90)
    state.autoHeightRevision++
    expect(applyAutoRowDrawingGeometry(image, state)).toMatchObject({
      top: image.top + 60,
      height: 90,
    })
  })
  const from = { row: 0, col: 2, rowOff: 19050, colOff: 0 },
    to = { row: 2, col: 3, rowOff: 38100, colOff: 0 }
  it('respects editAs and rejects unverified modes', () => {
    expect(
      createDrawingRowAnchor('twoCellAnchor', 'oneCell', from, to)?.mode,
    ).toBe('oneCell')
    expect(
      createDrawingRowAnchor('twoCellAnchor', 'absolute', from, to)?.mode,
    ).toBe('absolute')
    expect(createDrawingRowAnchor('twoCellAnchor', null, from, to)?.mode).toBe(
      'twoCell',
    )
    expect(
      createDrawingRowAnchor('twoCellAnchor', 'unknown', from, to),
    ).toBeUndefined()
  })
  it('moves one-cell, resizes two-cell/cell images, and preserves absolute and old metadata-free geometry', () => {
    const state = createEmptyVirtualState()
    state.autoRowHeights.set(0, 80)
    state.autoRowHeights.set(1, 100)
    state.autoHeightRevision++
    const one = {
      top: 42,
      height: 30,
      rowAnchor: createDrawingRowAnchor('oneCellAnchor', null, {
        ...from,
        row: 2,
      }),
    }
    const two = {
      top: 2,
      height: 42,
      rowAnchor: createDrawingRowAnchor('twoCellAnchor', null, from, to),
    }
    expect(applyAutoRowDrawingGeometry(one, state)).toMatchObject({
      top: 182,
      height: 30,
    })
    expect(applyAutoRowDrawingGeometry(two, state)).toMatchObject({
      top: 2,
      height: 182,
    })
    const cell = {
      top: 0,
      height: 20,
      rowAnchor: { mode: 'cell' as const, fromRow: 0, fromOffset: 0 },
    }
    expect(applyAutoRowDrawingGeometry(cell, state).height).toBe(80)
    const absolute = {
      top: 42,
      height: 30,
      rowAnchor: createDrawingRowAnchor('twoCellAnchor', 'absolute', from, to),
    }
    expect(applyAutoRowDrawingGeometry(absolute, state)).toBe(absolute)
    const legacy = { top: 42, height: 30 }
    expect(applyAutoRowDrawingGeometry(legacy, state)).toBe(legacy)
    expect(applyAutoRowDrawingGeometry(one, state)).toEqual(
      applyAutoRowDrawingGeometry(one, state),
    )
    state.rowHeightOverrides.set(0, 25)
    state.autoHeightRevision++
    expect(applyAutoRowDrawingGeometry(one, state).top).toBe(122)
  })
  it('only recovers image metadata from matching original relationship and marker coordinates', () => {
    const xml =
      '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:twoCellAnchor editAs="absolute"><xdr:from><xdr:row>0</xdr:row><xdr:col>2</xdr:col><xdr:rowOff>19050</xdr:rowOff><xdr:colOff>0</xdr:colOff></xdr:from><xdr:to><xdr:row>2</xdr:row><xdr:col>3</xdr:col><xdr:rowOff>38100</xdr:rowOff><xdr:colOff>0</xdr:colOff></xdr:to><xdr:pic><a:blip r:embed="rId1"/></xdr:pic></xdr:twoCellAnchor></xdr:wsDr>'
    const image = { id: 'rId1', anchor: { type: 'twoCellAnchor', from, to } }
    expect(readImageRowAnchors(xml, [image]).get(image)?.mode).toBe('absolute')
    const wrong = { ...image, id: 'rId2' }
    expect(readImageRowAnchors(xml, [wrong]).size).toBe(0)
    expect(readImageRowAnchors(undefined, [image]).size).toBe(0)
  })
})

describe('bounded measurement lifecycle', () => {
  const cleanups: Array<() => void> = []
  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn())
  })
  it('batches DOM nodes, drops old-sheet work, and removes the measurement host on destroy', async () => {
    const dom = new JSDOM('<div id="host"></div>', { pretendToBeVisual: true })
    let state = createEmptyVirtualState(),
      maxNodes = 0,
      commits = 0
    const makeState = () => {
      const next = createEmptyVirtualState()
      next.columns = [{ key: 'c0', width: 90 }] as any
      for (let row = 0; row < 100; row++) {
        next.rows[row] = { __k: `${row}`, __s: 2, c0: 'Long text ' + row }
        next.autoHeightCells.set(row, new Set([0]))
        next.cellCache.set(`${row}-1`, { wrapText: true, font: '14px Arial' })
      }
      return next
    }
    state = makeState()
    const original = dom.window.HTMLElement.prototype.getBoundingClientRect
    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
      maxNodes = Math.max(
        maxNodes,
        dom.window.document.querySelector('[data-spreadsheet-auto-height]')
          ?.childElementCount || 0,
      )
      return {
        width: 90,
        height: 70,
        x: 0,
        y: 0,
        top: 0,
        bottom: 70,
        left: 0,
        right: 90,
        toJSON() {},
      }
    }
    const controller = createAutoRowHeight({
      host: dom.window.document.getElementById('host')!,
      getState: () => state,
      getZoom: () => 1,
      getFirstVisibleRow: () => 0,
      commit: () => {
        commits++
      },
    })
    cleanups.push(() => {
      controller.destroy()
      dom.window.HTMLElement.prototype.getBoundingClientRect = original
      dom.window.close()
    })
    controller.enqueue(state.autoHeightCells.keys())
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(commits).toBeGreaterThan(1)
    expect(maxNodes).toBeLessThanOrEqual(32)
    const before = commits
    controller.enqueue(state.autoHeightCells.keys())
    state = makeState()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(commits).toBe(before)
    controller.destroy()
    expect(
      dom.window.document.querySelector('[data-spreadsheet-auto-height]'),
    ).toBeNull()
  })
})
