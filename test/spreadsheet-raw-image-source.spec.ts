import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { imageSources } from './helpers/spreadsheet-source-anchors'
import { readImageSourceProvenance, readImageSourceAnchors } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sourceAnchor'
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest, discoverSpreadsheetSource } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
const fixture=(name:string)=>readFile(new URL(`./fixtures/spreadsheet-raw-image-source/${name}.xlsx`,import.meta.url))
const root=(body='')=>`<x:wsDr xmlns:x="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${body}</x:wsDr>`
const source=imageSources([{id:'ref',anchor:{type:'twoCellAnchor',from:{row:2,col:3},to:{row:4,col:5}}}])
const alias=source.raw.replaceAll('xdr:','sheet:').replaceAll('xmlns:xdr=','xmlns:sheet=').replaceAll('a:','draw:').replaceAll('xmlns:a=','xmlns:draw=').replaceAll('r:','rel:').replaceAll('xmlns:r=','xmlns:rel=')
const bounded=(summary:any)=>{expect(JSON.stringify(summary).length).toBeLessThan(2048);expect(summary.reasons.length).toBeLessThanOrEqual(8);expect(summary.reasons.every((x:string)=>/^[a-z-]+$/.test(x))).toBe(true)}
describe('R1e raw-source coverage survives zero vendor objects',()=>{
  it.each(['xml-image-valid','xml-image-prefix-alias','xml-image-default-namespace','xml-chart-prefix-alias','xml-chart-default-namespace'])('audits exact actual XLSX %s without requiring an object',async name=>{
    const bytes=await fixture(name),ctx=createSpreadsheetParserContext()
    const replies=await handleSpreadsheetWorkerRequest(ctx,{type:'parseWorkbook',payload:{workbook:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}})
    expect(replies[0]?.type).toBe('sheets')
    const meta=ctx.sheets.find(s=>(ctx.workbook!.Sheets[s.name] as any)['!drawings']?.raw)!
    expect(meta).toBeDefined();const drawing=(ctx.workbook!.Sheets[meta.name] as any)['!drawings'],before=JSON.stringify(drawing),summary=meta.sourceDiscovery!.imageSource!
    bounded(summary)
    if(name==='xml-image-prefix-alias'){
      expect(meta.name).toBe('Release plan');expect(drawing.images).toHaveLength(0);expect(meta.sourceDiscovery!.objects).toHaveLength(0)
      expect(summary).toMatchObject({status:'partial',observedReferences:1,representedReferences:0,unrepresentedReferences:1,countsComplete:true})
      expect(meta.sourceDiscovery).toMatchObject({status:'partial',coverage:{images:'partial'}})
      expect(meta.sourceDiscovery!.diagnostics).toContainEqual({code:'RAW_IMAGE_SOURCE:unrepresented-raw-image-source',kind:'images'})
    }else{expect(summary.status).toBe('complete');expect(meta.sourceDiscovery!.coverage.images).toBe('complete')}
    await handleSpreadsheetWorkerRequest(ctx,{type:'parseRegion',payload:{sheet:meta.id,sessionId:1,requestId:1,region:{id:1,startRow:0,startCol:0,rowCount:1,colCount:1}}})
    expect(JSON.stringify(drawing)).toBe(before)
  })
  it('only certifies absent when the caller proves no drawing metadata',()=>{
    expect(readImageSourceProvenance(undefined,[],false).summary.status).toBe('absent')
    expect(discoverSpreadsheetSource({}).sourceDiscovery).toMatchObject({status:'complete',imageSource:{status:'absent'}})
    for(const raw of [undefined,null,'',42]){
      const summary=readImageSourceProvenance(raw,[]).summary
      expect(summary).toMatchObject({status:'partial',countsComplete:false});bounded(summary)
      expect(discoverSpreadsheetSource({'!drawings':{raw,images:[]}} as any).sourceDiscovery.coverage.images).toBe('partial')
    }
    expect(readImageSourceProvenance(alias,[],false).summary.status).toBe('partial')
    expect(discoverSpreadsheetSource({'!drawel':{Target:'missing.xml'}} as any).sourceDiscovery.imageSource).toMatchObject({status:'partial',countsComplete:false})
  })
  it('keeps verified empty and chart-only source complete',async()=>{
    for(const raw of [root(),await (await JSZip.loadAsync(await fixture('xml-chart-prefix-alias'))).file('xl/drawings/drawing1.xml')!.async('string')]){
      const summary=readImageSourceProvenance(raw,[]).summary
      expect(summary).toMatchObject({status:'complete',observedReferences:0,countsComplete:true,reasons:[]});bounded(summary)
    }
  })
  it('counts evidence but does not synthesize unrepresented image objects or coordinates',()=>{
    const summary=readImageSourceProvenance(alias,[]).summary
    expect(summary).toMatchObject({status:'partial',observedReferences:1,representedReferences:0,unrepresentedReferences:1,countsComplete:true})
    const discovered=discoverSpreadsheetSource({'!drawings':{raw:alias,images:[]}} as any)
    expect(discovered.extent).toEqual({rows:0,cols:0});expect(discovered.sourceDiscovery.objects).toEqual([])
    expect(discovered.sourceDiscovery.imageSource).toEqual(summary)
  })
  it.each([
    ['bad-xml','<broken','unreadable-raw-source'],
    ['foreign-root',root().replace('drawingml/2006/spreadsheetDrawing','foreign/drawing'),'unknown-drawing-root'],
    ['DTD','<!DOCTYPE x [<!ENTITY y "payload">]>'+root(),'unsupported-xml-declaration'],
    ['characters','x'.repeat(8*1024*1024+1),'raw-source-budget'],
    ['bytes','界'.repeat(3*1024*1024),'raw-source-byte-budget'],
    ['markup','<a/>'.repeat(65537),'raw-markup-budget'],
    ['anchors',root('<x:oneCellAnchor/>'.repeat(8193)),'source-anchor-budget'],
    ['references',root('<x:absoluteAnchor>'+ '<a:blip r:embed="ref"/>'.repeat(8193) +'</x:absoluteAnchor>'),'source-reference-budget'],
    ['relationship-field',source.raw.replace('r:embed="ref"','r:embed="'+'x'.repeat(257)+'"'),'source-relationship-field-budget'],
  ])('zero objects still reports %s uncertainty',(name,raw,reason)=>{
    const summary=readImageSourceProvenance(raw,[]).summary
    expect(summary).toMatchObject({status:'partial',countsComplete:false});expect(summary.reasons).toContain(reason);bounded(summary)
    const discovery=discoverSpreadsheetSource({'!drawings':{raw,images:[]}} as any).sourceDiscovery
    expect(discovery.status).toBe('partial');expect(discovery.coverage.images).toBe('partial')
    expect(discovery.diagnostics.length).toBeLessThanOrEqual(32)
  })
  it('distinguishes exact duplicate references from reused IDs at distinct endpoints',()=>{
    const duplicate=imageSources([source.images[0],source.images[0]])
    const summary=readImageSourceProvenance(duplicate.raw,[]).summary
    expect(summary).toMatchObject({status:'partial',observedReferences:2,representedReferences:0,unrepresentedReferences:2,countsComplete:true})
    expect(summary.reasons).toContain('ambiguous-image-source')
    const distinct=imageSources([source.images[0],{...source.images[0],anchor:{type:'twoCellAnchor',from:{row:6,col:3},to:{row:7,col:5}}}])
    expect(readImageSourceProvenance(distinct.raw,distinct.images as any).summary).toMatchObject({status:'complete',observedReferences:2,representedReferences:2,unrepresentedReferences:0})
  })
  it.each([
    ['missing-relationship',source.raw.replace(' r:embed="ref"','')],
    ['external-link',source.raw.replace('r:embed=','r:link=')],
    ['foreign-namespace',source.raw.replace('drawingml/2006/main','foreign/main')],
    ['missing-container',root('<x:absoluteAnchor><x:pic/></x:absoluteAnchor>')],
  ])('does not certify %s empty',(name,raw)=>{
    const summary=readImageSourceProvenance(raw,[]).summary;expect(summary.status).toBe('partial');expect(summary.countsComplete).toBe(false);bounded(summary)
  })
  it('retains vendor objects and raw bytes when source cannot be read or mapped',()=>{
    const images=source.images,raw='<broken',before=JSON.stringify(images),audit=readImageSourceProvenance(raw,images as any)
    expect(audit.anchors.size).toBe(1);expect(audit.summary.status).toBe('partial')
    const out=discoverSpreadsheetSource({'!drawings':{raw,images}} as any).sourceDiscovery
    expect(out.objects).toHaveLength(1);expect(out.objects[0].id).toBe('ref');expect(out.status).toBe('partial');expect(JSON.stringify(images)).toBe(before)
    expect([...readImageSourceAnchors(source.raw,images as any)]).toEqual([...readImageSourceProvenance(source.raw,images as any).anchors])
  })
  it('respects existing image and reason/diagnostic budgets',()=>{
    const images=Array.from({length:4097},()=>({...source.images[0]})),audit=readImageSourceProvenance(source.raw,images as any)
    expect(audit.anchors.size).toBe(4096);expect(audit.summary).toMatchObject({status:'partial',countsComplete:false});expect(audit.summary.reasons).toContain('image-source-budget')
    const external={...source.images[0],rel:{TargetMode:'External'}},unresolved={...source.images[0],id:'other',rel:{}},missing={...source.images[0],id:'missing'}
    const mix=source.raw.replace('<xdr:twoCellAnchor>','<xdr:futureAnchor>').replace('</xdr:twoCellAnchor>','<xdr:pic/><a:blip/><a:blip r:embed="ref"/></xdr:futureAnchor>')
    const many=readImageSourceProvenance(mix,[external,unresolved,missing] as any).summary
    expect(many.reasons).toHaveLength(8);expect(many.reasonsTruncated).toBe(true);bounded(many)
    const discovery=discoverSpreadsheetSource({'!drawings':{raw:mix,images:[external,unresolved,missing]}} as any,{}, {diagnostics:1}).sourceDiscovery
    expect(discovery.diagnostics).toHaveLength(1);expect(discovery.diagnosticsTruncated).toBe(true)
  })
})
