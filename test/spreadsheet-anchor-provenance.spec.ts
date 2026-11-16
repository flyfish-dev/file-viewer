import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { imageSources, sourceAnchor } from './helpers/spreadsheet-source-anchors'
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest, discoverSpreadsheetSource } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import { loadRelationships } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/chartParser'
import { readImageSourceAnchors } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sourceAnchor'
const cases = [
  ['chart','valid','complete'], ['chart','missing-to','partial'], ['chart','unknown-mode','partial'], ['chart','unknown-edit','partial'],
  ['chart','missing-from','partial'], ['chart','absolute','partial'],
  ['image','valid','complete'], ['image','unknown-edit','partial'], ['image','absolute-edit','partial'], ['image','oneCell-edit','complete'],
]
describe('R1 production anchor provenance, original reviewer OOXML', () => {
  it.each(cases)('%s %s remains source-truth %s after normalization', async (kind, variant, status) => {
    const bytes=await readFile(new URL(`./fixtures/spreadsheet-anchor-provenance/new-${kind}-${variant}.xlsx`, import.meta.url))
    const context=createSpreadsheetParserContext()
    const replies=await handleSpreadsheetWorkerRequest(context,{type:'parseWorkbook',payload:{workbook:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),filename:'source.xlsx'}})
    expect(replies[0]?.type).toBe('sheets')
    const meta=context.sheets.find(s=>context.charts[s.name]?.length || (context.workbook!.Sheets[s.name] as any)['!drawings']?.images?.length)!
    expect(meta.sourceDiscovery?.status).toBe(status)
    expect(meta.sourceDiscovery?.coverage[kind==='chart'?'charts':'images']).toBe(status)
    const entry=meta.sourceDiscovery!.objects.find(x=>x.kind===kind)!
    expect(entry).toBeDefined(); expect(entry.sourceAnchor).toBeDefined()
    if(variant==='unknown-mode') expect(entry.sourceAnchor).toMatchObject({status:'unknown',type:'futureVendorAnchor'})
    if(variant==='unknown-edit') expect(entry.sourceAnchor).toMatchObject({status:'unknown',editAs:'futureVendorMode'})
    if(variant==='missing-to') expect(entry.sourceAnchor?.toPresent).toBe(false)
    if(variant==='missing-from') {
      expect(entry.sourceAnchor?.fromPresent).toBe(false); expect(entry.from).toBeUndefined()
      expect(context.charts[meta.name]![0]!.from).toMatchObject({row:0,col:0}) // Preserved old display fallback, never canonical discovery.
    }
    if(variant==='absolute-edit'||variant==='absolute') expect(entry.coordinateSpace).toBe('absolute')
    if(kind==='image') {
      const raw=(context.workbook!.Sheets[meta.name] as any)['!drawings'],before=JSON.stringify(raw)
      const reply=await handleSpreadsheetWorkerRequest(context,{type:'parseRegion',payload:{sheet:meta.id,sessionId:1,requestId:2,region:{id:3,startRow:0,startCol:0,rowCount:1,colCount:1}}})
      const image=reply[0].payload!.regionData.sourceObjects.images[0]
      if(variant==='absolute-edit') expect(image.rowAnchor.mode).toBe('absolute')
      if(variant==='oneCell-edit') {expect(image.rowAnchor.mode).toBe('oneCell'); expect(entry.editAs).toBe('oneCell')}
      expect(JSON.stringify(raw)).toBe(before)
    }
  })
  const images=imageSources([{id:'rId1',anchor:{type:'twoCellAnchor',from:{row:3,col:2},to:{row:4,col:3}}}])
  it.each([undefined,'<not-xml','<!DOCTYPE x [<!ENTITY y "test">]><x/>','x'.repeat(8*1024*1024+1),'<a/>'.repeat(65537)])('keeps unavailable/unreadable/budgeted raw source unknown', raw=>{
    const source=readImageSourceAnchors(raw,images.images as any).get(images.images[0])!
    expect(source.status).toBe('unknown'); expect(source.reason).toBeTruthy(); expect(source.fromPresent).toBeUndefined()
    const result=discoverSpreadsheetSource({'!drawings':{images:images.images,raw}} as any)
    expect(result.sourceDiscovery.status).toBe('partial'); expect(result.sourceDiscovery.objects).toHaveLength(1)
  })
  it('uses relationship identity plus endpoints for repeated IDs and refuses external links',async()=>{
    const pair=imageSources([images.images[0], {...images.images[0],anchor:{type:'twoCellAnchor',from:{row:20,col:2},to:{row:21,col:3}}}])
    const matched=readImageSourceAnchors(pair.raw,pair.images as any)
    expect([...matched.values()].every(x=>x.status==='valid')).toBe(true)
    const external=readImageSourceAnchors(images.raw.replace('r:embed=', 'r:link='),images.images as any)
    expect(external.get(images.images[0])).toMatchObject({status:'unknown',reason:'unmatched-source-anchor'})
    const externalEmbed={...images.images[0],rel:{TargetMode:'External',Target:'https://example.invalid/image.png'}}
    expect(readImageSourceAnchors(images.raw,[externalEmbed] as any).get(externalEmbed)).toMatchObject({status:'unknown',reason:'external-relationship'})
    const zip=new JSZip();zip.file('xl/drawings/_rels/drawing1.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" TargetMode="External" Target="https://example.invalid/chart.xml"/></Relationships>')
    expect(await loadRelationships(zip,'xl/drawings/drawing1.xml')).toEqual([])

    const longId=imageSources([{...images.images[0],id:'x'.repeat(257)}])
    expect(readImageSourceAnchors(longId.raw,longId.images as any).get(longId.images[0]))
      .toMatchObject({status:'unknown',reason:'source-relationship-field-budget'})
    const excessive=Array.from({length:4097},()=>({...images.images[0]}))
    const bounded=readImageSourceAnchors(images.raw,excessive as any)
    expect(bounded.size).toBe(4096); expect(bounded.get(excessive[0])).toMatchObject({status:'unknown',reason:'image-source-budget'})

  })
  it('rejects raw UTF-8 byte overage before XML parsing',()=>{
    expect(readImageSourceAnchors('界'.repeat(3*1024*1024),images.images as any).get(images.images[0]))
      .toMatchObject({status:'unknown',reason:'raw-source-byte-budget'})
  })
  it.each([['source-anchor-budget', '<xdr:oneCellAnchor/>'.repeat(8193)],
    ['source-reference-budget', '<xdr:oneCellAnchor>'+ '<a:blip r:embed="rId1"/>'.repeat(8193) +'</xdr:oneCellAnchor>']])('bounds raw source records: %s',(reason,body)=>{
    const raw='<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+body+'</xdr:wsDr>'
    expect(readImageSourceAnchors(raw,images.images as any).get(images.images[0])).toMatchObject({status:'unknown',reason})
  })
  it('bounds transported provenance text and reports the incomplete source fields',async()=>{
    const source=sourceAnchor({type:'twoCellAnchor',editAs:'x'.repeat(1000),from:{row:3,col:2},to:{row:4,col:3}})
    expect(source).toMatchObject({status:'unknown',reason:'source-field-budget',truncatedFields:['editAs']})
    expect(source.editAs).toHaveLength(128)
    const wide=sourceAnchor({type:'future'+'x'.repeat(1000),from:{row:'0'.repeat(1000),col:2}})
    expect(wide.status).toBe('unknown'); expect(wide.type!.length).toBe(128); expect(wide.fromRaw!.row!.length).toBe(64)
    const bytes=await readFile(new URL('./fixtures/spreadsheet-anchor-provenance/new-image-valid.xlsx',import.meta.url))
    const zip=await JSZip.loadAsync(bytes),part='xl/drawings/far.xml',value='x'.repeat(1000)
    zip.file(part,(await zip.file(part)!.async('string')).replace('<xdr:twoCellAnchor>','<xdr:twoCellAnchor editAs="'+value+'">'))
    const data=await zip.generateAsync({type:'uint8array'}),context=createSpreadsheetParserContext()
    await handleSpreadsheetWorkerRequest(context,{type:'parseWorkbook',payload:{workbook:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}})
    const meta=context.sheets.find(sheet=>sheet.sourceDiscovery?.objects.some(object=>object.kind==='image'))!
    const entry=meta.sourceDiscovery!.objects.find(object=>object.kind==='image')!
    expect(meta.sourceDiscovery!.status).toBe('partial'); expect(entry.sourceAnchor!.truncatedFields).toContain('editAs')
    expect(entry.sourceAnchor!.editAs).toHaveLength(128); expect(JSON.stringify(entry.sourceAnchor).length).toBeLessThan(4096)
    expect((context.workbook!.Sheets[meta.name] as any)['!drawings'].raw).toContain(value)

  })
  it('does not treat unknown raw anchor elements as validated geometry',()=>{
    const unknown=imageSources([{id:'rId1',anchor:{type:'futureVendorAnchor',from:{row:3,col:2},to:{row:4,col:3}}}])
    expect(readImageSourceAnchors(unknown.raw,unknown.images as any).get(unknown.images[0]))
      .toMatchObject({status:'unknown',reason:'unknown-anchor-mode'})
  })
  it('does not select the first of ambiguous matches or guess absent raw provenance',()=>{
    const duplicate=imageSources([images.images[0],images.images[0]])
    const result=readImageSourceAnchors(duplicate.raw,images.images as any)
    expect(result.get(images.images[0])).toMatchObject({status:'unknown',reason:'ambiguous-source-match'})
    const repeated=[{...images.images[0]},{...images.images[0]}]
    expect([...readImageSourceAnchors(images.raw,repeated as any).values()])
      .toEqual([expect.objectContaining({status:'unknown',reason:'ambiguous-vendor-match'}),expect.objectContaining({status:'unknown',reason:'ambiguous-vendor-match'})])

    expect(discoverSpreadsheetSource({'!drawings':{images:images.images}} as any).sourceDiscovery.status).toBe('partial')
  })
})
