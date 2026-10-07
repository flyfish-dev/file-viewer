import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRangeGetter, readBoundedResponse } from '../dist/geo3dRange.js'
import { createGeo3dProbeRangeGetter, inspectGeoTiffBuffer, resolveGeo3dSourceType, inspectGeo3dDataset } from '../dist/geo3dInspect.js'
import { inspect3tzCentralDirectory, prepare3tzDataset } from '../dist/geo3dArchive.js'
import { parseCityJson, renderCityJsonDocument, disposeCityJsonGroup } from '../dist/geo3dCityJson.js'
import JSZip from 'jszip'
const fixture=async name=>new Uint8Array(await readFile(new URL(`../test/fixtures/geo3d/${name}`,import.meta.url)))
const buffer=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)
let checks=0
async function check(name,fn){await fn();checks++;console.log(`Geo3D acceptance: ${name}`)}
const originalFetch=globalThis.fetch
async function withFetch(fn,run){globalThis.fetch=fn;try{await run()}finally{globalThis.fetch=originalFetch}}
const remote=()=>createRangeGetter({url:'https://dataset.invalid/cloud.laz'})
await check('HTTP byte range verifies interval and payload',()=>withFetch(async()=>new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{'Content-Range':'bytes 10-13/100','Accept-Ranges':'bytes'}}),async()=>assert.deepEqual(await remote()(10,14),new Uint8Array([1,2,3,4]))))
for(const [name,headers,body]of[
  ['wrong offset',{'Content-Range':'bytes 9-12/100'},new Uint8Array(4)],
  ['missing Content-Range',{},new Uint8Array(4)],
  ['truncated payload',{'Content-Range':'bytes 10-13/100'},new Uint8Array(3)],
  ['excessive payload',{'Content-Range':'bytes 10-13/100'},new Uint8Array(5)],
  ['encoded representation',{'Content-Range':'bytes 10-13/100','Content-Encoding':'gzip'},new Uint8Array(4)],
  ['unsupported Accept-Ranges',{'Content-Range':'bytes 10-13/100','Accept-Ranges':'none'},new Uint8Array(4)],
  ['unsafe integer',{'Content-Range':'bytes 10-13/9007199254740993'},new Uint8Array(4)],
])await check(`rejects ${name}`,()=>withFetch(async()=>new Response(body,{status:206,headers}),async()=>assert.rejects(()=>remote()(10,14))))
await check('EOF range is clipped only to the declared object length',()=>withFetch(async()=>new Response(new Uint8Array(3),{status:206,headers:{'Content-Range':'bytes 10-12/13'}}),async()=>assert.equal((await remote()(10,20)).length,3)))
await check('native ranges never silently accept HTTP 200',()=>withFetch(async()=>new Response(new Uint8Array(4)),async()=>assert.rejects(()=>remote()(0,4),/206/)))
await check('non-range probes stop at a bounded prefix',async()=>{
  let cancelled=false
  await withFetch(async()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(65536))},cancel(){cancelled=true}})),async()=>{
    const get=createGeo3dProbeRangeGetter({url:'https://dataset.invalid/ordinary.tif'})
    assert.equal((await get(0,16)).length,16);assert.ok(cancelled)
    await assert.rejects(()=>get(1024*1024,1024*1024+16),/bounded/)
  })
})
await check('invalid limits and aborted local reads fail',async()=>{
  for(const n of [NaN,Infinity,-1,0])await assert.rejects(()=>readBoundedResponse(new Response('x'),n))
  const c=new AbortController();c.abort()
  await assert.rejects(()=>createRangeGetter({buffer:new ArrayBuffer(4),signal:c.signal})(0,4),{name:'AbortError'})
  await assert.rejects(()=>resolveGeo3dSourceType({filename:'x.tif',extension:'tif',buffer:new ArrayBuffer(4),signal:c.signal}),{name:'AbortError'})
})
await check('LAS and LAZ are detected from header without an extension',async()=>{
  for(const [name,kind]of [['terrain.las','las'],['terrain.laz','laz'],['terrain.copc.laz','copc']]){
    const bytes=buffer(await fixture('samples-mit/'+name))
    assert.equal(await resolveGeo3dSourceType({filename:'download.bin',extension:'bin',buffer:bytes}),kind)
    assert.equal(inspectGeo3dDataset({buffer:bytes})?.format,kind)
  }
})
await check('regular TIFF, GeoTIFF and COG preserve distinct routing',async()=>{
  for(const [name,kind]of [['ordinary.tiff',false],['geotiff-striped.tif','geotiff'],['imagery-overviews.cog.tif','cog']]){
    const bytes=buffer(await fixture('samples-mit/'+name))
    assert.equal(await resolveGeo3dSourceType({filename:name,extension:'tif',buffer:bytes}),kind)
    if(kind)assert.equal((await inspectGeoTiffBuffer(bytes))?.crs,'EPSG:32632')
  }
})
function crsTiff(big,le){
  const a=new ArrayBuffer(512),v=new DataView(a),b=new Uint8Array(a)
  b.set(le?[73,73]:[77,77]);v.setUint16(2,big?43:42,le)
  if(big){v.setUint16(4,8,le);v.setBigUint64(8,16n,le)}else v.setUint32(4,8,le)
  const start=big?16:8,countSize=big?8:2,entrySize=big?20:12
  if(big)v.setBigUint64(start,3n,le);else v.setUint16(start,3,le)
  for(const [i,tag]of[256,257,34735].entries()){
    const p=start+countSize+i*entrySize;v.setUint16(p,tag,le);v.setUint16(p+2,tag===34735?3:4,le)
    if(big)v.setBigUint64(p+4,BigInt(tag===34735?12:1),le);else v.setUint32(p+4,tag===34735?12:1,le)
    const value=tag===34735?256:512
    if(big&&tag===34735)v.setBigUint64(p+12,BigInt(value),le);else v.setUint32(p+(big?12:8),value,le)
  }
  [1,1,0,2,2048,0,1,4326,3072,0,1,32632].forEach((n,i)=>v.setUint16(256+i*2,n,le))
  return a
}
await check('BigTIFF and both byte orders prefer projected CRS',async()=>{
  for(const big of[false,true])for(const le of[false,true])assert.equal((await inspectGeoTiffBuffer(crsTiff(big,le)))?.crs,'EPSG:32632')
})
// The real Giro3D CRS module is browser/bundler-only (proj4 extensionless
// imports). Its north/south UTM and unknown-CRS checks run in the browser suite.
const zipBytes=async files=>{const z=new JSZip();for(const[name,body]of Object.entries(files))z.file(name,body,{date:new Date('2026-01-01')});return z.generateAsync({type:'uint8array',compression:'STORE'})}
const root=JSON.stringify({asset:{version:'1.1'},root:{boundingVolume:{sphere:[0,0,0,1]},geometricError:0,content:{uri:'model.gltf'}}})
const validFiles={'tileset.json':root,'model.gltf':JSON.stringify({asset:{version:'2.0'},buffers:[{uri:'buffer.bin',byteLength:4}]}),'buffer.bin':new Uint8Array(4)}
await check('indexed 3TZ and nested relative resources extract safely',async()=>{
  const prepared=await prepare3tzDataset(await fixture('samples-mit/building-indexed.3tz'))
  assert.match(prepared.rootUrl,/^file-viewer-archive:.*\/tileset\.json$/)
  const response=await prepared.fetchData(prepared.rootUrl)
  const root=await response.json()
  assert.match(root.root.content.uri,/\/nested\/tileset\.json$/)
  const nested=await(await prepared.fetchData(root.root.content.uri)).json()
  assert.match(nested.root.content.uri,/\/models\/building\.gltf$/)
  const model=await(await prepared.fetchData(nested.root.content.uri)).json()
  assert.match(model.buffers[0].uri,/^blob:/)
  assert.equal(prepared.fetchData('https://outside.invalid/file.json'),null)
  const controller=new AbortController();controller.abort()
  await assert.rejects(()=>prepared.fetchData(prepared.rootUrl,{signal:controller.signal}),{name:'AbortError'})
  prepared.dispose();prepared.dispose()
  await assert.rejects(()=>prepared.fetchData(prepared.rootUrl),/disposed/)

})
await check('3TZ limits cannot be disabled with non-finite values',async()=>{
  const bytes=await zipBytes(validFiles)
  for(const n of[NaN,Infinity,-1])assert.throws(()=>inspect3tzCentralDirectory(bytes,{maxExpandedBytes:n}),/Invalid 3TZ/)
})
await check('3TZ local-central size disagreements fail before extraction',async()=>{
  const bytes=await zipBytes(validFiles);new DataView(bytes.buffer).setUint32(18,1,true)
  assert.throws(()=>inspect3tzCentralDirectory(bytes),/headers disagree/)
})
await check('3TZ CRC32 is checked against actual expanded bytes',async()=>{
  const bytes=await zipBytes(validFiles),v=new DataView(bytes.buffer),dataStart=30+v.getUint16(26,true)+v.getUint16(28,true)
  bytes[dataStart]^=1
  await assert.rejects(()=>prepare3tzDataset(bytes),/CRC32/)
})
await check('3TZ rejects absolute and encoded traversal resources',async()=>{
  for(const uri of['/absolute.bin','https://external.invalid/data.bin','%2e%2e/escape.bin']){
    const files={...validFiles,'model.gltf':JSON.stringify({buffers:[{uri}]})}
    const bytes=await zipBytes(files);await assert.rejects(()=>prepare3tzDataset(bytes))
  }
})
await check('3TZ failure revokes already-created object URLs',async()=>{
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,owned=new Set()
  URL.createObjectURL=blob=>{const url=originalCreate(blob);owned.add(url);return url}
  URL.revokeObjectURL=url=>{owned.delete(url);originalRevoke(url)}
  try{
    const files={...validFiles,'model.gltf':JSON.stringify({buffers:[{uri:'buffer.bin'},{uri:'missing.bin'}]})}
    const bytes=await zipBytes(files);await assert.rejects(()=>prepare3tzDataset(bytes),/Missing/);assert.equal(owned.size,0)
  }finally{URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke}
})
await check('CityJSON external resource URLs remain relative to the dataset',async()=>{
  const document=parseCityJson(new TextDecoder().decode(await fixture('samples-mit/building-textured.city.json')))
  const result=renderCityJsonDocument(document,uri=>new URL(uri,'https://dataset.invalid/city/model.city.json').href)
  assert.equal(result.triangleCount,12)
  assert.match(result.externalResources[0].url,/\/city\/textures\/checker.png$/)
  disposeCityJsonGroup(result.group)
})
console.log(`Geo3D acceptance contract passed: ${checks} checks.`)
