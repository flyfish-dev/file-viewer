import { imageSources } from './helpers/spreadsheet-source-anchors'
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest, discoverSpreadsheetSource, getWorksheetDisplayBounds } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
const fixture = (name: string) => readFile(new URL(`./fixtures/spreadsheet-region-review/${name}.xlsx`, import.meta.url))
const parse = async (bytes: Uint8Array) => {
  const context = createSpreadsheetParserContext()
  const reply = await handleSpreadsheetWorkerRequest(context, { type: 'parseWorkbook', payload: {
    workbook: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), filename: 'regression.xlsx',
  } })
  expect(reply[0]?.type).toBe('sheets')
  return context
}
const from = { row: 20, col: 8 }, to = { row: 40, col: 12 }
describe('review R1 strict source anchor discovery', () => {
  it.each([
    { type: 'futureVendorAnchor', from, to }, { from, to },
    { type: 'twoCellAnchor', from }, { type: 'twoCellAnchor', from, to: { row: 1048576, col: 1 } },
    { type: 'twoCellAnchor', from: to, to: from },
    { type: 'twoCellAnchor', from, to: { row: 30, col: 2 } },
    { type: 'oneCellAnchor', from, editAs: 'future' },
    { type: 'oneCellAnchor', from: { row: -1, col: 0 } },
  ])('preserves invalid or unknown image %j and marks partial', anchor => {
    const raw: any = { '!drawings': { images: [{ id: 'bad', anchor }] } }, before = JSON.stringify(raw)
    const found = discoverSpreadsheetSource(raw)
    expect(found.sourceDiscovery).toMatchObject({ status: 'partial', coverage: { images: 'partial' } })
    expect(found.sourceDiscovery.objects).toHaveLength(1)
    expect(found.sourceDiscovery.diagnostics.length).toBeGreaterThan(0)
    expect(JSON.stringify(raw)).toBe(before)
  })
  it('keeps valid oneCell/twoCell and mixed-mode objects distinct without requiring oneCell.to', () => {
    const raw: any = { '!drawings': imageSources([
      { anchor: { type: 'oneCellAnchor', from } }, { anchor: { type: 'twoCellAnchor', from, to, editAs: 'oneCell' } },
      { anchor: { type: 'absoluteAnchor', pos: { x: 12, y: 34 } } }, { anchor: { type: 'future', from } },
    ]) }
    const before = JSON.stringify(raw), found = discoverSpreadsheetSource(raw)
    expect(found.sourceDiscovery.objects.map(x => x.coordinateSpace)).toEqual(['cell', 'cell', 'absolute', 'unknown'])
    expect(found.sourceDiscovery.status).toBe('partial'); expect(JSON.stringify(raw)).toBe(before)
    expect(discoverSpreadsheetSource({ '!drawings': imageSources(raw['!drawings'].images.slice(0, 2)) } as any).sourceDiscovery.status).toBe('complete')
  })
  it.each([
    { from, to: { row: -1, col: 2 } }, { from, to: { row: 1, col: 2 } },
    { from, rowAnchor: { mode: 'absolute' } }, { from, rowAnchor: { mode: 'twoCell' } },
    { from, rowAnchor: { mode: 'future' } },
  ])('preserves invalid chart %j as partial', chart => {
    const charts = [{ id: 'bad', type: 'bar', series: [], ...chart }] as any
    const before = JSON.stringify(charts), result = discoverSpreadsheetSource({} as any, { charts })
    expect(result.sourceDiscovery.status).toBe('partial'); expect(result.sourceDiscovery.objects).toHaveLength(1)
    expect(JSON.stringify(charts)).toBe(before)
  })
  it('does not accept a malformed raw chart collection', () => {
    expect(discoverSpreadsheetSource({ '!drawings': { charts: { id: 'unknown' } } } as any).sourceDiscovery)
      .toMatchObject({ status: 'partial', coverage: { charts: 'partial' } })
  })
})
describe('review R2 malformed objects do not abort valid workbook content', () => {
  it.each(['adversarial-missing-to', 'adversarial-reversed-to', 'adversarial-invalid-to'])('retains reviewer bytes and near data: %s', async name => {
    const context = await parse(await fixture(name)), meta = context.sheets.find(x => x.name === 'Release plan')!
    expect(meta.sourceDiscovery?.status).toBe('partial')
    expect(meta.initialRegion!.startRow + meta.initialRegion!.rowCount).toBeLessThanOrEqual(1048576)
    expect(meta.initialRegion!.startCol + meta.initialRegion!.colCount).toBeLessThanOrEqual(16384)
    const raw = context.workbook!.Sheets['Release plan'] as any, before = JSON.stringify(raw['!drawings'])
    const result = await handleSpreadsheetWorkerRequest(context, { type: 'parseRegion', payload: { sheet: meta.id, sessionId: 1, requestId: 2,
      region: { id: 3, startRow: 0, startCol: 0, rowCount: 1, colCount: 1 } } })
    expect(result[0].payload!.regionData.data[0][0]).toBe('Near')
    expect(JSON.stringify(raw['!drawings'])).toBe(before)
    if (name.endsWith('invalid-to')) expect(raw['!drawings'].images[0].anchor.to.row).toBe(1048576)
  })
  it('keeps a new valid sheet and its value/formula readable beside malformed geometry', async () => {
    const zip = await JSZip.loadAsync(await fixture('adversarial-invalid-to'))
    zip.file('xl/workbook.xml', (await zip.file('xl/workbook.xml')!.async('string')).replace('</sheets>', '<sheet name="Legal" sheetId="99" r:id="rIdLegal"/></sheets>'))
    zip.file('xl/_rels/workbook.xml.rels', (await zip.file('xl/_rels/workbook.xml.rels')!.async('string')).replace('</Relationships>', '<Relationship Id="rIdLegal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/legal.xml"/></Relationships>'))
    zip.file('xl/worksheets/legal.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B1"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Keep me</t></is></c><c r="B1"><f>2+3</f><v>5</v></c></row></sheetData></worksheet>')
    zip.file('[Content_Types].xml', (await zip.file('[Content_Types].xml')!.async('string')).replace('</Types>', '<Override PartName="/xl/worksheets/legal.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'))
    const context = await parse(await zip.generateAsync({ type: 'uint8array' })), legal = context.sheets.find(x => x.name === 'Legal')!
    expect(legal).toBeDefined(); expect(context.sheets.find(x => x.name === 'Release plan')!.sourceDiscovery?.status).toBe('partial')
    const reply = await handleSpreadsheetWorkerRequest(context, { type: 'parseSheet', payload: { sheet: legal.id, pageSize: 1 } })
    expect(reply[0].payload!.sheetData.data[0]).toEqual(['Keep me', '5'])
  })
})
describe('review R3 proven default notes use the same bounds classification', () => {
  it.each([1, 1000, 1048576])('implicit/explicit notes at A%d are extent-equivalent', async row => {
    for (const style of [false, true]) {
      const context = await parse(await fixture(`clean-note-${row}-${style}`)), meta = context.sheets[0]!
      expect(meta.dataExtent).toEqual({ rows: 0, cols: 0 }); expect(meta.visualExtent).toEqual({ rows: 0, cols: 0 })
      expect(meta.comments).toHaveLength(1); expect(meta.comments![0].row).toBe(row - 1)
      expect(meta.sourceDiscovery?.cellRegions).toEqual([])
    }
  })
  it.each([false, true])('keeps far-column note-only extent empty, explicit=%s', async style => {
    const zip = await JSZip.loadAsync(await fixture(`clean-note-1-${style}`))
    for (const path of ['xl/worksheets/sheet1.xml', 'xl/comments1.xml']) zip.file(path, (await zip.file(path)!.async('string')).replaceAll('A1', 'XFD1'))
    const context = await parse(await zip.generateAsync({ type: 'uint8array' })), meta = context.sheets[0]!
    expect(meta.dataExtent).toEqual({ rows: 0, cols: 0 }); expect(meta.visualExtent).toEqual({ rows: 0, cols: 0 }); expect(meta.comments![0].col).toBe(16383)
  })
  it.each([{ v: 'Value' }, { f: '1+2' }, { l: { Target: '#A1' } }])('does not alter actual far content bounds %j', content => {
    expect(getWorksheetDisplayBounds({ '!ref': 'A1:A1048576', A1048576: content } as any, [], [], { defaultFont: { name: 'Calibri', sz: 11 } }).rowCount).toBe(1048576)
  })
  it.each([{ font: { name: 'Other', sz: 13 } }, { fill: { patternType: 'solid' } }, { border: { bottom: { style: 'thin' } } }, 0, { future: true }])('preserves nondefault/unknown note formatting %j', style => {
    const raw: any = { A1000: { t: 'z', c: [{ t: 'note' }], s: style }, '!ref': 'A1000' }
    expect(getWorksheetDisplayBounds(raw, [], [], { defaultFont: { name: 'Calibri', sz: 11 } }).observedRowCount).toBe(1000)
    expect(discoverSpreadsheetSource(raw, { defaultFont: { name: 'Calibri', sz: 11 } }).sourceDiscovery.cellRegions).toHaveLength(1)
  })
})
