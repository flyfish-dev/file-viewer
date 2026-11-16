import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import JSZip from 'jszip'
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'
import { readSourceAnchor, readImageSourceAnchors } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sourceAnchor'
import { imageSources } from './helpers/spreadsheet-source-anchors'
const { DOMParser } = createRequire(new URL('../packages/renderers/spreadsheet/package.json', import.meta.url))('@xmldom/xmldom')
const modes = ['valid','foreign-drawing-namespace','foreign-marker-namespace','foreign-main-namespace','foreign-relationship-namespace','wrong-root','anchor-as-root','empty-editAs']
const fixture = (kind: string, mode: string) => readFile(new URL(`./fixtures/spreadsheet-source-xml/xml-${kind}-${mode}.xlsx`, import.meta.url))
const parse = async (bytes: Uint8Array, kind: string, expected: string) => {
  const context = createSpreadsheetParserContext()
  const result = await handleSpreadsheetWorkerRequest(context,{type:'parseWorkbook',payload:{workbook:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer}})
  expect(result[0]?.type).toBe('sheets')
  const meta = context.sheets.find(s=>s.sourceDiscovery?.objects.some(o=>o.kind===kind))!
  expect(meta).toBeDefined(); expect(meta.sourceDiscovery!.coverage[kind==='image'?'images':'charts']).toBe(expected)
  const entry = meta.sourceDiscovery!.objects.find(o=>o.kind===kind)!
  expect(entry.sourceAnchor?.status).toBe(expected==='complete'?'valid':'unknown')
  const raw = kind==='image' ? (context.workbook!.Sheets[meta.name] as any)['!drawings'] : context.charts[meta.name]
  const before = JSON.stringify(raw)
  await handleSpreadsheetWorkerRequest(context,{type:'parseRegion',payload:{sheet:meta.id,sessionId:1,requestId:1,region:{id:1,startRow:0,startCol:0,rowCount:1,colCount:1}}})
  expect(JSON.stringify(raw)).toBe(before)
  return entry
}
describe('R1c/d source namespaces, structure and explicit attribute presence', () => {
  it.each(['chart','image'].flatMap(kind=>modes.map(mode=>[kind,mode])))('%s original reviewer %s', async(kind,mode)=>{
    const entry=await parse(await fixture(kind,mode),kind,mode==='valid'?'complete':'partial')
    if(mode==='empty-editAs') expect(entry.sourceAnchor?.editAs).toBe('')
  })
  // The vendor image reader has pre-existing literal a:blip/r:embed/xdr:from restrictions.
  // Full alias images are tested at the provenance boundary below, not claimed as end-to-end.
  it.each([['chart','prefix-alias'],['chart','default-namespace'],['image','default-namespace']])('%s accepts legal %s',async(kind,mode)=>{
    const zip=await JSZip.loadAsync(await fixture(kind,'valid')), part=kind==='chart'?'xl/drawings/drawing1.xml':'xl/drawings/far.xml'
    let xml=await zip.file(part)!.async('string')
    xml=mode==='prefix-alias' ? xml.replaceAll('xdr:','sheet:').replaceAll('xmlns:xdr=','xmlns:sheet=').replaceAll('a:','draw:').replaceAll('xmlns:a=','xmlns:draw=').replaceAll('c:','chart:').replaceAll('xmlns:c=','xmlns:chart=') : xml.replaceAll('xdr:','').replaceAll('xmlns:xdr=','xmlns=')
    zip.file(part,xml)
    await parse(await zip.generateAsync({type:'uint8array'}),kind,'complete')
  })
  const original=imageSources([{id:'ref',anchor:{type:'twoCellAnchor',from:{row:1,col:2},to:{row:4,col:5}}}])
  it('accepts all legal namespace prefix aliases at the raw image provenance boundary',()=>{
    const raw=original.raw.replaceAll('xdr:','sheet:').replaceAll('xmlns:xdr=','xmlns:sheet=').replaceAll('a:','draw:').replaceAll('xmlns:a=','xmlns:draw=').replaceAll('r:','rel:').replaceAll('xmlns:r=','xmlns:rel=')
    expect(readImageSourceAnchors(raw,original.images as any).get(original.images[0])?.status).toBe('valid')
  })
  it.each([
    ['foreign-field', (x:string)=>x.replace('<xdr:row>','<xdr:row xmlns:xdr="urn:foreign">')],
    ['nested-field', (x:string)=>x.replace('<xdr:row>1</xdr:row>','<xdr:row><foreign xmlns="urn:foreign">1</foreign></xdr:row>')],
    ['foreign-pic', (x:string)=>x.replace('<xdr:pic>','<xdr:pic xmlns:xdr="urn:foreign">')],
    ['foreign-blipFill', (x:string)=>x.replace('<xdr:blipFill>','<xdr:blipFill xmlns:xdr="urn:foreign">')],
    ['foreign-blip', (x:string)=>x.replace('<a:blip ','<a:blip xmlns:a="urn:foreign" ')],
    ['nested-blip', (x:string)=>x.replace('<a:blip ','<xdr:wrapper><a:blip ').replace('/></xdr:blipFill>','/></xdr:wrapper></xdr:blipFill>')],
    ['foreign-editAs', (x:string)=>x.replace('<xdr:twoCellAnchor>','<xdr:twoCellAnchor xmlns:f="urn:foreign" f:editAs="twoCell">')],
    ['foreign-sibling', (x:string)=>x.replace('</xdr:from>','<f:row xmlns:f="urn:foreign">1</f:row></xdr:from>')],
    ['foreign-reference-attribute', (x:string)=>x.replace('r:embed="ref"','r:embed="ref" xmlns:f="urn:foreign" f:embed="ref"')],
  ] as const)('does not certify %s lookalikes',(_name,mutate)=>{
    const raw=mutate(original.raw), image=original.images[0]
    expect(readImageSourceAnchors(raw,original.images as any).get(image)?.status).toBe('unknown')
  })
  it.each(['graphicFrame','graphic','graphicData','chart','uri','id'])('does not certify foreign chart %s',async(name)=>{
    const zip=await JSZip.loadAsync(await fixture('chart','valid')),xml=await zip.file('xl/drawings/drawing1.xml')!.async('string')
    const changed=name==='uri' ? xml.replace('uri="http://schemas.openxmlformats.org/drawingml/2006/chart"','xmlns:f="urn:foreign" f:uri="http://schemas.openxmlformats.org/drawingml/2006/chart"') : name==='id' ? xml.replace('r:id="rId1"','r:id="rId1" xmlns:f="urn:foreign" f:id="rId1"') : name==='chart' ? xml.replace('xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"','xmlns:c="urn:foreign"') : xml.replace(new RegExp('<(xdr|a|c):'+name+'(?=[ >])'),'<$1:'+name+' xmlns:$1="urn:foreign"')
    const doc=new DOMParser().parseFromString(changed,'application/xml'),anchor=doc.documentElement.firstChild
    const reference=Array.from(doc.getElementsByTagName('*')).find((x:any)=>x.localName==='chart')
    expect(readSourceAnchor(anchor,reference,'chart').status).toBe('unknown')
  })
})
