import { imageSources, sourceAnchor } from './helpers/spreadsheet-source-anchors'
import { describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  assertSheetRegion, createSheetRegion, EXCEL_SOURCE_EXTENT, regionToSource,
  sourceToRegion, regionIntersects, getSheetMaterialization,
} from '../packages/renderers/spreadsheet/src/spreadsheet/sourceRegion'
import SheetJsModel from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/SheetJsModel'
import {
  createSpreadsheetParserContext, getWorksheetDisplayBounds,
  handleSpreadsheetWorkerRequest, searchSpreadsheetWorkbook, indexOccupiedRegions,
  classifySpreadsheetCell, discoverSpreadsheetSource,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import type { SheetComment } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/type'

const far = { row: 1_048_575, col: 16_383 }
const note = (row = far.row, col = far.col): SheetComment => ({
  row, col, address: row === far.row && col === far.col ? 'XFD1048576' : 'A1',
  kind: 'note', resolved: false, messages: [{ id: 'note', parentId: null, author: 'Author', text: 'Full remote note', createdAt: null }],
})
function contextFor(worksheet: any, comments: SheetComment[] = [note()]) {
  const context = createSpreadsheetParserContext()
  context.workbook = { SheetNames: ['Data'], Sheets: { Data: worksheet } } as any
  const bounds = getWorksheetDisplayBounds(worksheet, [], comments)
  context.sheets = [{ id: 0, name: 'Data', rowCount: bounds.rowCount, colCount: bounds.colCount,
    dataExtent: { rows: bounds.rowCount, cols: bounds.colCount }, logicalExtent: EXCEL_SOURCE_EXTENT, comments }]
  context.comments = { Data: comments }
  return context
}

describe('bounded source region contract', () => {
  it.each([{ row: 0, col: 0 }, { row: 649, col: 3 }, far, { row: 0, col: far.col }, { row: far.row, col: 0 }])(
    'round trips exact source address %j without clamping', target => {
      const region = createSheetRegion(target, 17)
      expect(region.rowCount * region.colCount).toBeLessThanOrEqual(32_000)
      expect(regionToSource(region, sourceToRegion(region, target)!)).toEqual(target)
      expect(region.id).toBe(17)
    },
  )
  it('does not map an outside source address to the nearest local cell', () => {
    const region = createSheetRegion(far, 1)
    expect(sourceToRegion(region, { row: 0, col: 0 })).toBeNull()
    expect(() => regionToSource(region, { row: 500, col: 0 })).toThrow()
    expect(regionIntersects(region, { row: 0, col: 0, rowspan: 1, colspan: 1 })).toBe(false)
  })
  it.each([
    { id: 0, startRow: 0, startCol: 0, rowCount: 501, colCount: 1 },
    { id: 0, startRow: 0, startCol: 0, rowCount: 1, colCount: 65 },
    { id: 0, startRow: far.row, startCol: far.col, rowCount: 2, colCount: 1 },
    { id: -1, startRow: 0, startCol: 0, rowCount: 1, colCount: 1 },
    { id: 0, startRow: NaN, startCol: 0, rowCount: 1, colCount: 1 },
  ])('rejects invalid/oversized region before materialization %j', region => {
    expect(() => assertSheetRegion(region)).toThrow()
  })
  it('separates annotation extent even when vendor added a distant comment-only cell/ref', () => {
    const worksheet = { '!ref': 'A1:XFD1048576', A1: { t: 's', v: 'Real A1' }, XFD1048576: { t: 'z', c: [{ t: 'Note' }] } }
    expect(getWorksheetDisplayBounds(worksheet, [], [note()])).toMatchObject({ rowCount: 1, colCount: 1 })
  })
  it('never discards actual remote cell data to satisfy a grid cap', () => {
    const worksheet = { '!ref': 'A1:XFD1048576', A1: { t: 's', v: 'Near' }, XFD1048576: { t: 's', v: 'Real remote data' } }
    expect(getWorksheetDisplayBounds(worksheet, [], [note()])).toMatchObject({ rowCount: 1_048_576, colCount: 16_384 })
    const context = contextFor(worksheet)
    expect(searchSpreadsheetWorkbook(context, 'Real remote')).toMatchObject([{ row: far.row, col: far.col, text: 'Real remote data' }])
    const model = SheetJsModel.create(worksheet as any).toRegionObject(createSheetRegion(far, 1))
    expect(model.data.at(-1)?.at(-1)).toBe('Real remote data')
  })
})

describe('bounded parser access and source metadata', () => {
  it('blocks the old dense entry before model allocation when real data exceeds the declared budget', async () => {
    const context = contextFor({ '!ref': 'A1:XFD1048576', XFD1048576: { t: 's', v: 'Must stay reachable' } })
    const create = vi.spyOn(SheetJsModel, 'create')
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, sessionId: 8, requireOrdinaryGrid: true } })
    expect(result[0]).toMatchObject({ type: 'parseError', payload: { code: 'REGION_REQUIRED', sheet: 0, sessionId: 8 } })
    expect(create).not.toHaveBeenCalled()
    create.mockRestore()
    expect(getSheetMaterialization({ rows: 650, cols: 130 }).kind).toBe('ordinary')
    expect(getSheetMaterialization({ rows: 50_001, cols: 1 }).kind).toBe('region-required')
    expect(getSheetMaterialization({ rows: 1, cols: 1_025 }).kind).toBe('region-required')
    expect(getSheetMaterialization({ rows: 500, cols: 257 }).kind).toBe('region-required')
  })
  it('performs exactly 32,000 cell reads for the maximal corner, never full-axis getters', () => {
    const model = SheetJsModel.create({ '!ref': 'A1:XFD1048576', XFD1048576: { t: 's', v: 'Corner' } } as any)
    const reads = vi.spyOn(model as any, 'getCellAt')
    for (const method of ['getAllRowHeights', 'getColWidths', 'getImages', 'getCharts', 'getData', 'getCell', 'getAxisOffset']) {
      vi.spyOn(model as any, method).mockImplementation(() => { throw new Error('Unbounded method used: ' + method) })
    }
    const result = model.toRegionObject(createSheetRegion(far, 4))
    expect(reads).toHaveBeenCalledTimes(32_000)
    expect(result.data).toHaveLength(500)
    expect(result.rows).toHaveLength(500)
    expect(result.columns).toHaveLength(64)
    expect(result.data.every(row => row.length === 64)).toBe(true)
    expect(Object.keys(result.cell).length).toBeLessThanOrEqual(32_000)
    expect(result.columns.at(-1)).toMatchObject({ title: 'XFD', sourceCol: far.col })
    expect(result.rows.at(-1)).toMatchObject({ sourceRow: far.row })
  })
  it('bounds dense sparse-array reads at high indices without slicing the whole row', () => {
    const row: any[] = []; row[far.col] = { t: 's', v: 'Dense corner' }
    const source: any[] = []; source[far.row] = row
    const model = SheetJsModel.create({ '!ref': 'A1:XFD1048576', '!data': source } as any)
    const reads = vi.spyOn(model as any, 'getCellAt')
    const result = model.toRegionObject(createSheetRegion(far, 2))
    expect(reads).toHaveBeenCalledTimes(32_000)
    expect(result.data.at(-1)?.at(-1)).toBe('Dense corner')
  })
  it('preserves source merge anchor outside region and all drawing modes without large offset loops', () => {
    const rows: any[] = []; rows[far.row] = { hpt: 24 }; rows[2] = { hidden: true }
    const cols: any[] = []; cols[far.col] = { wpx: 100 }; cols[1] = { hidden: true }
    const anchor = { type: 'twoCellAnchor', from: { row: far.row - 1, col: far.col - 1, rowOff: 19050, colOff: 0 }, to: { ...far, rowOff: 38100, colOff: 0 } }
    const model = SheetJsModel.create({ '!ref': 'A1:XFD1048576', A1: { t: 's', v: 'Merged source text' },
      '!rows': rows, '!cols': cols, '!merges': [{ s: { r: 0, c: 0 }, e: { r: far.row, c: far.col } }],
      '!drawings': { images: [{ id: 'drawing', dataURI: 'data:image/png;base64,AA==', anchor }] },
    } as any, { cellImages: [{ id: 'cell', src: 'data:image/png;base64,AA==', ...far }] })
    const reads = vi.spyOn(model as any, 'getCellAt')
    const result = model.toRegionObject(createSheetRegion(far, 5))
    expect(reads).toHaveBeenCalledTimes(32_001)
    expect(result.merges[0]).toMatchObject({ source: { row: 0, col: 0, rowspan: 1_048_576, colspan: 16_384 }, anchorValue: 'Merged source text', contained: false })
    expect(result.sourceObjects.images[0].anchor).toEqual(anchor)
    expect(result.sourceObjects.cellImages[0]).toMatchObject(far)
    expect(result.sourceGeometry.rows).toHaveLength(2)
    expect(result.sourceGeometry.columns).toHaveLength(2)
    expect(result.rows.at(-1)).toMatchObject({ sourceRow: far.row, height: 32, fixed: true })
  })
  it('echoes identities for valid and rejected requests and preserves exact note coordinates', async () => {
    const context = contextFor({ '!ref': 'A1', A1: { t: 's', v: 'Near' } })
    const region = createSheetRegion(far, 9), identity = { sheet: 0, sessionId: 27, requestId: 42 }
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseRegion', payload: { ...identity, region } })
    expect(result[0]).toMatchObject({ type: 'parseRegion', payload: { ...identity, region, comments: [{ ...far, address: 'XFD1048576' }] } })
    const bad = await handleSpreadsheetWorkerRequest(context, { type: 'parseRegion', payload: { ...identity, region: { ...region, rowCount: 999_999 } } })
    expect(bad[0]).toMatchObject({ type: 'parseError', payload: { ...identity, regionId: 9, operation: 'parseRegion' } })
    expect(context.comments.Data).toHaveLength(1)
  })
  it('rejects an oversized ordinary request before allocating even when its sheet fits the normal budget', async () => {
    const context = contextFor({ '!ref': 'A1:E50000', E50000: { t: 's', v: 'Last' } }, [])
    const create = vi.spyOn(SheetJsModel, 'create')
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, sessionId: 2, pageSize: 50000 } })
    expect(result[0]).toMatchObject({ type: 'parseError', payload: { code: 'WINDOW_BUDGET_EXCEEDED', sessionId: 2, requestedCells: 250000, suggestedPageSize: 25600 } })
    expect(create).not.toHaveBeenCalled()
    create.mockRestore()
  })
  it('allows a small explicit public window when only the default 500-row plan exceeds its cell budget', async () => {
    const context = contextFor({ '!ref': 'A1:IW500', IW500: { t: 's', v: 'Wide tail' } }, [])
    expect(context.sheets[0].colCount).toBe(257)
    const response = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, startRow: 499, pageSize: 1 } })
    expect(response[0].type).toBe('parseSheet')
    expect(response[0].payload!.sheetData.data[0][256]).toBe('Wide tail')
  })
  it('keeps first-row public reads safe at the maximal row index with sparse source heights and drawing offsets', async () => {
    const rows: any[] = []; rows[1048575] = { hpt: 30 }; rows[2] = { hidden: true }
    const context = contextFor({ '!ref': 'A1:A1048576', A1: { t: 's', v: 'First' }, A1048576: { t: 'n', v: 1 }, '!rows': rows }, [])
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, pageSize: 1 } })
    expect(result[0].type).toBe('parseSheet')
    expect(result[0].payload!.sheetData.data[0][0]).toBe('First')
    const heights = result[0].payload!.sheetData.structure.rowHeights
    expect(Object.keys(heights)).toEqual(['2', '1048575'])
    const model = SheetJsModel.create({ '!ref': 'A1:A1048576' } as any)
    expect((model as any).getAxisOffset(1048575, heights, 20)).toBe(1048575 * 20 - 20)
    expect((model as any).getAxisOffset(1048576, heights, 20)).toBe(1048576 * 20)
  })
  it('rejects only excessive actual row-layout entries and preserves a data-only retry', async () => {
    const context = contextFor({ '!ref': 'A1:A100001', A1: { t: 's', v: 'First' }, A100001: { t: 'n', v: 1 }, '!rows': Array.from({length: 50001}, () => ({ hpt: 15 })) }, [])
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, pageSize: 1 } })
    expect(result[0]).toMatchObject({type: 'parseError', payload: {code: 'LAYOUT_BUDGET_EXCEEDED', maxLayoutEntries: 50000}})
    const retry = result[0].payload!.migration
    const data = await handleSpreadsheetWorkerRequest(context, {type: retry.operation, payload: retry.payload})
    expect(data[0].payload!.sheetData.data[0][0]).toBe('First')
  })
  it('preserves the existing #405 large-row tail and 1025-column data-window callers', async () => {
    const rows = contextFor({ '!ref': 'A1:A100001', A100001: { t: 'n', v: 100000 } }, [])
    const tail = await handleSpreadsheetWorkerRequest(rows, { type: 'parseSheet', payload: { sheet: 0, startRow: 100000, pageSize: 1 } })
    expect(tail[0].type).toBe('parseSheet')
    expect(tail[0].payload!.sheetData.data[0][0]).toBe('100000')
    const cols = contextFor({ '!ref': 'A1:AMK1', AMK1: { t: 'n', v: 75 } }, [])
    const wide = await handleSpreadsheetWorkerRequest(cols, { type: 'parseSheet', payload: { sheet: 0, pageSize: 1 } })
    expect(wide[0].type).toBe('parseSheet')
    expect(wide[0].payload!.sheetData.data[0][1024]).toBe('75')
  })
  it('provides an explicit data-only migration without large initial layout arrays', async () => {
    const context = contextFor({ '!ref': 'A1:A100001', A1: { t: 's', v: 'First' }, A100001: { t: 'n', v: 100000 } }, [])
    const rejected = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, pageSize: 1000, sessionId: 4, requireOrdinaryGrid: true } })
    const next = rejected[0].payload!.migration.dataWindow
    expect(next).toMatchObject({ operation: 'parseSheet', payload: { includeLayout: false, pageSize: 1000, sessionId: 4 } })
    const result = await handleSpreadsheetWorkerRequest(context, { type: next.operation, payload: next.payload })
    expect(result[0].type).toBe('parseSheet')
    expect(result[0].payload!.sheetData.data).toHaveLength(1000)
    expect(result[0].payload!.sheetData.data[0][0]).toBe('First')
    expect(result[0].payload!.sheetData.structure).toBeUndefined()
    expect(result[0].payload!.sheetData.columns).toBeUndefined()
  })
  it('preserves legitimate public parseSheet requests larger than 500 within the cell budget', async () => {
    const context = contextFor({ '!ref': 'A1:C1000', C1000: { t: 's', v: 'Public large request' } }, [])
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, sessionId: 2, pageSize: 1000 } })
    expect(result[0].type).toBe('parseSheet')
    expect(result[0].payload!.sheetData.data).toHaveLength(1000)
    expect(result[0].payload!.sheetData.data[999][2]).toBe('Public large request')
  })
  it('bounds the occupied-region index without pretending a partial index is complete or deleting cells', () => {
    const worksheet: any = {}
    const letters = (col: number) => { let text = ''; for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) text = String.fromCharCode(65 + (n - 1) % 26) + text; return text }
    for (let n = 0; n < 4097; n++) worksheet[letters((n % 256) * 64) + (Math.floor(n / 256) * 500 + 1)] = { t: 'n', v: n }
    const result = indexOccupiedRegions(worksheet)
    expect(result.regions).toHaveLength(4096)
    expect(result.index).toMatchObject({ status: 'budget-exceeded', indexedTiles: 4096, visitedCells: 4097 })
    expect(Object.keys(worksheet)).toHaveLength(4097)
    expect(indexOccupiedRegions({ A1: { t: 's', v: 'Near' }, XFD1048576: { t: 's', v: 'Far' } } as any).index.status).toBe('complete')
  })
  it('enforces its own visit budget on populated entries without including inherited cells', () => {
    const worksheet = Object.assign(Object.create({ Z9: { t: 's', v: 'Inherited' } }), {
      A1: { t: 'n', v: 1 }, B1: { t: 'n', v: 2 }, C1: { t: 'n', v: 3 }, D1: { t: 'n', v: 4 },
    })
    expect(indexOccupiedRegions(worksheet, {tiles: 2, visitedCells: 3}).index).toMatchObject({status: 'budget-exceeded', visitedCells: 3, indexedTiles: 1})
    expect(indexOccupiedRegions(worksheet).index).toMatchObject({status: 'complete', visitedCells: 4, indexedTiles: 1})
  })
  it('keeps ordinary wide sheets wider than 64 columns on the existing parseSheet path', async () => {
    const context = contextFor({ '!ref': 'A1:DZ3', DZ3: { t: 's', v: 'Wide data' } }, [])
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: 0, sessionId: 1 } })
    const sheet = result[0].payload!.sheetData
    expect(sheet.meta.totalCols).toBe(130)
    expect(sheet.data[2]).toHaveLength(130)
    expect(sheet.data[2][129]).toBe('Wide data')
  })
  it('preserves author normal 650-row notes, search and metadata across ordinary windows', async () => {
    const bytes = await readFile(new URL('./fixtures/spreadsheet-comments/excel-comments.xlsx', import.meta.url))
    const context = createSpreadsheetParserContext()
    await handleSpreadsheetWorkerRequest(context, { type: 'parseWorkbook', payload: { workbook: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) } })
    const sheet = context.sheets.find(sheet => sheet.name === 'Release plan')!
    expect(sheet.dataExtent).toEqual({ rows: 650, cols: 4 })
    const response = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: sheet.id, startRow: 500, sessionId: 1 } })
    expect(response[0].payload!.sheetData.data[149][3]).toBe('Scroll target')
    expect(searchSpreadsheetWorkbook(context, 'Scroll target')[0]).toMatchObject({ row: 649, col: 3 })
    expect(sheet.comments?.find(c => c.address === 'D650')).toMatchObject({ row: 649, col: 3 })
  })
})


describe('visual source discovery without changing the legacy #405 display contract', () => {
  it.each([undefined, {}, { patternType: 'none' }, { fill: { patternType: 'none' }, border: {}, numFmt: 'General' }])(
    'does not enlarge source extent for a note-only proven default style %j', style => {
      const sheet: any = { '!ref': 'A1:XFD1048576', XFD1048576: { t: 'z', c: [{ t: 'Note' }], s: style } }
      const found = discoverSpreadsheetSource(sheet)
      expect(found.extent).toEqual({ rows: 0, cols: 0 })
      expect(found.sourceDiscovery.cellRegions).toEqual([])
      expect(found.sourceDiscovery.status).toBe('complete')
    },
  )
  it.each([
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFF00' } } },
    { border: { bottom: { style: 'thin', color: { rgb: 'FF0000' } } } },
    { font: { bold: true } },
  ])('preserves authored remote blank formatting %j without rewriting old bounds expectations', style => {
    const sheet: any = { '!ref': 'A1:XFD1048576', A1: { t: 's', v: 'Near' }, XFD1048576: { t: 'z', s: style, c: [{ t: 'Note' }] } }
    expect(getWorksheetDisplayBounds(sheet, [])).toMatchObject({ rowCount: 1, colCount: 1 })
    const found = discoverSpreadsheetSource(sheet)
    expect(found.extent).toEqual(EXCEL_SOURCE_EXTENT)
    expect(found.sourceDiscovery.status).toBe('complete')
    expect(found.sourceDiscovery.cellRegions.at(-1)?.firstCell).toEqual(far)
    expect(indexOccupiedRegions(sheet).index.coverage).toBe('value-formula-link-rich-text-cells-only')
    expect(indexOccupiedRegions(sheet).regions).toHaveLength(1)
  })
  it.each([0, 17, { id: 0 }, { xf: { fontId: 0 } }, 'unresolved-style', { producerSpecificStyle: 'retained' }])('retains unknown style %j and declares partial interpretation', style => {
    const found = discoverSpreadsheetSource({ XFD1048576: { t: 'z', s: style } } as any)
    expect(found.extent).toEqual(EXCEL_SOURCE_EXTENT)
    expect(found.sourceDiscovery).toMatchObject({ status: 'partial', coverage: { values: 'complete', styles: 'partial' } })
    expect(found.sourceDiscovery.cellRegions[0]?.firstCell).toEqual(far)
    expect(found.sourceDiscovery.diagnostics[0]).toMatchObject({ code: 'UNKNOWN_STYLE_PRESERVED', ...far })
  })
  it('excludes an expanded format-zero note font only with exact workbook default provenance', () => {
    const font = { name: 'Custom Normal', sz: 17, color: { rgb: '123456' } }
    const cell = { t: 'z', c: [{ t: 'Note' }], s: { id: 0, font: { ...font },
      xf: { fontId: 0 }, fill: { patternType: 'none' }, border: {}, numFmtId: 0 } }
    const sheet = { XFD1048576: cell } as any
    expect(discoverSpreadsheetSource(sheet, { defaultFont: font }).extent).toEqual({ rows: 0, cols: 0 })
    expect(discoverSpreadsheetSource(sheet).extent).toEqual(EXCEL_SOURCE_EXTENT)
    expect(discoverSpreadsheetSource(sheet, { defaultFont: { ...font, sz: 11 } }).extent).toEqual(EXCEL_SOURCE_EXTENT)
    const filled = { ...cell, s: { ...cell.s, fill: { patternType: 'solid', fgColor: { rgb: 'FFFF00' } } } }
    expect(discoverSpreadsheetSource({ XFD1048576: filled } as any, { defaultFont: font }).extent).toEqual(EXCEL_SOURCE_EXTENT)
  })
  it('retains empty hyperlinks and rich text as values, independent of styles', () => {
    expect(classifySpreadsheetCell({ t: 'z', l: { Target: 'https://example.org' } }).value).toBe(true)
    expect(classifySpreadsheetCell({ r: '<r><t>Rich</t></r>' }).value).toBe(true)
    const found = discoverSpreadsheetSource({ XFD1048576: { t: 'z', l: { Target: '#A1' } } } as any)
    expect(found.extent).toEqual(EXCEL_SOURCE_EXTENT)
    expect(found.sourceDiscovery.status).toBe('complete')
  })
  it('uses one source entry for each huge merge/image/chart/cell image, never every covered tile', () => {
    const found = discoverSpreadsheetSource({
      '!merges': [{ s: { r: 0, c: 0 }, e: { r: far.row, c: far.col } }],
      '!drawings': imageSources([{ id: 'image', anchor: { type: 'twoCellAnchor', from: { row: 0, col: 0 }, to: far } }]),
    } as any, { charts: [{ id: 'chart', type: 'bar', from: far, series: [], sourceAnchor: sourceAnchor({type:'oneCellAnchor',from:far}) }] as any, cellImages: [{ id: 'cell', src: 'data:', ...far }] })
    expect(found.sourceDiscovery).toMatchObject({ status: 'complete', visitedCells: 0, visitedMetadata: 4 })
    expect(found.sourceDiscovery.cellRegions).toHaveLength(0)
    expect(found.sourceDiscovery.objects.map(x => x.kind)).toEqual(['merge', 'image', 'chart', 'cellImage'])
    expect(found.sourceDiscovery.objects[0]).toMatchObject({ from: { row: 0, col: 0 }, to: far })
    expect(found.extent).toEqual(EXCEL_SOURCE_EXTENT)
  })
  it('does not guess an absolute or missing drawing anchor from old row/col fallback', () => {
    const found = discoverSpreadsheetSource({ '!drawings': imageSources([
      { id: 'absolute', row: far.row, col: far.col, anchor: { type: 'absoluteAnchor', pos: { x: 100, y: 200 } } },
      { id: 'unknown', row: far.row, col: far.col },
    ]) } as any)
    expect(found.sourceDiscovery.status).toBe('partial')
    expect(found.extent).toEqual({ rows: 0, cols: 0 })
    expect(found.sourceDiscovery.objects.map(x => x.coordinateSpace)).toEqual(['absolute', 'unknown'])
    expect(found.sourceDiscovery.objects.every(x => x.from === undefined)).toBe(true)
  })
  it('marks unsupported axis/table/conditional formatting explicitly rather than declaring visual completeness', () => {
    const found = discoverSpreadsheetSource({ '!rows': [{ s: { fill: { patternType: 'solid' } } }],
      '!tables': [{}], '!conditionalFormatting': [{}] } as any)
    expect(found.sourceDiscovery).toMatchObject({ status: 'partial', coverage: {
      values: 'complete', styles: 'complete', axisStyles: 'unsupported', tableStyles: 'unsupported', conditionalFormats: 'unsupported',
    } })
  })
  it('bounds visual cell tiles and metadata/object entries independently with explicit partial status', () => {
    const sheet: any = { A1: { s: { fill: { patternType: 'solid' } } }, XFD1048576: { s: { fill: { patternType: 'solid' } } },
      '!merges': [{ s: { r: 1, c: 1 }, e: { r: 2, c: 2 } }, { s: { r: 3, c: 3 }, e: { r: 4, c: 4 } }] }
    const tiles = discoverSpreadsheetSource(sheet, {}, { tiles: 1 })
    expect(tiles.sourceDiscovery.cellRegions).toHaveLength(1)
    expect(tiles.sourceDiscovery.status).toBe('partial')
    expect(tiles.sourceDiscovery.diagnostics.some(x => x.code === 'CELL_TILE_BUDGET')).toBe(true)
    const objects = discoverSpreadsheetSource(sheet, {}, { objects: 1 })
    expect(objects.sourceDiscovery.objects).toHaveLength(1)
    expect(objects.sourceDiscovery.coverage.merges).toBe('partial')
    const visits = discoverSpreadsheetSource(sheet, {}, { metadata: 1, visitedCells: 1 })
    expect(visits.sourceDiscovery).toMatchObject({ status: 'partial', visitedMetadata: 1, visitedCells: 1 })
    expect(Object.keys(sheet)).toHaveLength(3)
  })
  it('reports vendor-exposed shapes, unknown drawing classes and unresolved charts as partial', () => {
    for (const drawings of [{ shapes: [{ id: 'shape' }] }, { futureDrawing: [{}] }]) {
      expect(discoverSpreadsheetSource({ '!drawings': drawings } as any).sourceDiscovery)
        .toMatchObject({ status: 'partial', coverage: { otherDrawings: 'unsupported' } })
    }
    expect(discoverSpreadsheetSource({ '!drawings': { charts: [{ id: 'unresolved' }] } } as any).sourceDiscovery)
      .toMatchObject({ status: 'partial', coverage: { charts: 'partial' } })
  })
  it('bounds diagnostic storage and signals omissions while retaining unknown styled cells', () => {
    const sheet: any = {}
    for (let n = 1; n <= 40; n++) sheet['A' + n] = { s: { unknown: n } }
    const found = discoverSpreadsheetSource(sheet)
    expect(found.sourceDiscovery).toMatchObject({ status: 'partial', diagnosticsTruncated: true })
    expect(found.sourceDiscovery.diagnostics).toHaveLength(32)
    expect(found.sourceDiscovery.cellRegions[0]?.cellCount).toBe(40)
  })
})
