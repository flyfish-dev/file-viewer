import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import { readImageSourceProvenance } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sourceAnchor'
import { imageSources } from './helpers/spreadsheet-source-anchors'
const fixture=(count:number)=>readFile(new URL(`./fixtures/spreadsheet-incomplete-counts/reviewer-vendor-present-anchors-${count}.xlsx`,import.meta.url))
const original=()=>readFile(new URL('./fixtures/spreadsheet-source-xml/xml-image-valid.xlsx',import.meta.url))
const empty='<xdr:absoluteAnchor><xdr:pos x="0" y="0"/><xdr:ext cx="1" cy="1"/><xdr:clientData/></xdr:absoluteAnchor>'
const parse=async(bytes:Uint8Array)=>{
 const ctx=createSpreadsheetParserContext(),replies=await handleSpreadsheetWorkerRequest(ctx,{type:'parseWorkbook',payload:{workbook:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer}})
 expect(replies[0].type).toBe('sheets');const sheet=ctx.sheets.find(s=>s.name==='Release plan')!,drawing=(ctx.workbook!.Sheets[sheet.name] as any)['!drawings'],before=JSON.stringify(drawing)
 await handleSpreadsheetWorkerRequest(ctx,{type:'parseRegion',payload:{sheet:sheet.id,sessionId:1,requestId:1,region:{id:1,startRow:0,startCol:0,rowCount:1,colCount:1}}})
 expect(JSON.stringify(drawing)).toBe(before)
 return {summary:sheet.sourceDiscovery!.imageSource!,discovery:sheet.sourceDiscovery!,drawing}
}
const incomplete=(result:Awaited<ReturnType<typeof parse>>)=>{
 expect(result.summary).toMatchObject({status:'partial',countsComplete:false,representedReferences:0,unrepresentedReferences:0})
 expect(result.summary.reasons).toContain('source-anchor-budget');expect(result.summary.reasons).not.toContain('unrepresented-raw-image-source')
 expect(result.discovery.diagnostics.some(d=>d.code==='RAW_IMAGE_SOURCE:unrepresented-raw-image-source')).toBe(false)
 expect(result.discovery.objects.filter(o=>o.kind==='image')).toHaveLength(result.drawing.images.length)
 expect(JSON.stringify(result.summary).length).toBeLessThan(2048)
}
describe('R1f incomplete matching cannot establish omitted references',()=>{
 it.each([8191,8192,8193])('retains exact reviewer %i-anchor source and honest counts',async count=>{
  const result=await parse(await fixture(count));expect(result.drawing.images).toHaveLength(1)
  if(count<=8192)expect(result.summary).toMatchObject({status:'complete',countsComplete:true,observedReferences:1,representedReferences:1,unrepresentedReferences:0})
  else {incomplete(result);expect(result.summary.observedReferences).toBe(1)}
 })
 it.each(['zero-vendor','tail-duplicate','late-vendor'])('does not infer full-source matching from a scanned prefix: %s',async variant=>{
  const zip=await JSZip.loadAsync(await original()),part='xl/drawings/far.xml',raw=await zip.file(part)!.async('string'),a=raw.indexOf('<xdr:twoCellAnchor>'),b=raw.indexOf('</xdr:wsDr>'),anchor=raw.slice(a,b)
  let body=variant==='late-vendor'?empty.repeat(8192)+anchor:anchor+empty.repeat(8191)+(variant==='tail-duplicate'?anchor:empty)
  if(variant==='zero-vendor')body=body.replaceAll('a:blip','alias:blip').replace('<alias:blip ','<alias:blip xmlns:alias="http://schemas.openxmlformats.org/drawingml/2006/main" ')
  zip.file(part,raw.slice(0,a)+body+raw.slice(b))
  const result=await parse(await zip.generateAsync({type:'uint8array'}));incomplete(result)
  expect(result.drawing.images.length).toBe(variant==='zero-vendor'?0:variant==='tail-duplicate'?2:1)
  expect(result.summary.observedReferences).toBe(variant==='late-vendor'?0:1)
  for(const entry of result.discovery.objects) if(entry.kind==='image') expect(entry.sourceAnchor?.status).toBe('unknown')
 })
 it('shared early-return path does not label pending relationships omitted',()=>{
  const source=imageSources([{id:'image',anchor:{type:'twoCellAnchor',from:{row:1,col:1},to:{row:2,col:2}}}])
  const raw=source.raw.replace('</xdr:wsDr>','<xdr:absoluteAnchor><a:blip r:embed="'+'x'.repeat(257)+'"/></xdr:absoluteAnchor></xdr:wsDr>')
  const result=readImageSourceProvenance(raw,source.images as any)
  expect(result.summary).toMatchObject({status:'partial',countsComplete:false,observedReferences:2,representedReferences:0,unrepresentedReferences:0})
  expect(result.summary.reasons).toContain('source-relationship-field-budget');expect(result.summary.reasons).not.toContain('unrepresented-raw-image-source')
  expect(result.anchors.size).toBe(1);expect(result.anchors.get(source.images[0])?.status).toBe('unknown')
 })
})
