import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { las14EvlrWkt } from '../test/fixtures/las14-evlr-wkt.mjs'
import { lasWithCitation } from '../test/fixtures/las-citation.mjs'
import { browserOutput, copyGeo3dAssets, engineFile, rendererFile, repositoryRoot, runtimeGraphPlugin } from './geo3d-browser-package.mjs'

const output = join(browserOutput, 'las-crs')
const work = join(output, 'fixture'), site = join(output, 'site')
await mkdir(work, { recursive: true })
const require = createRequire(join(repositoryRoot, 'apps/viewer-demo/package.json'))
const { build } = await import(pathToFileURL(require.resolve('vite')).href)
const { chromium } = createRequire(join(repositoryRoot, 'package.json'))('playwright')
const files = {}
// Test inputs belong to the harness; runtime bytes still resolve exclusively
// through rendererFile(), including in the physical installed consumer.
for (const name of ['crs-geokeys-only', 'crs-wkt']) files[name] = await readFile(new URL(`../test/fixtures/github-406-${name}.las`, import.meta.url))
if (process.env.GEO3D_CITATION_SAMPLE) files['original-citation'] = await readFile(process.env.GEO3D_CITATION_SAMPLE)
files['citation-only'] = lasWithCitation(files['crs-geokeys-only'], 'WGS84, WGS84, ETRS89 / Poland CS2000 zone 6')
files['citation-ambiguous'] = lasWithCitation(files['crs-geokeys-only'], 'EPSG:2177, EPSG:2154')
files['citation-unit-conflict'] = lasWithCitation(files['crs-geokeys-only'], 'EPSG:2177', {units: 9002})
const wktFile = files['crs-wkt']
files['evlr-wkt'] = las14EvlrWkt(wktFile)
files['evlr-wkt-final'] = las14EvlrWkt(wktFile, true)
files['evlr-unresolved'] = Buffer.from(files['evlr-wkt'])
const invalidWktStart = Number(files['evlr-unresolved'].readBigUInt64LE(235)) + 60
files['evlr-unresolved'].fill(0, invalidWktStart)
files['evlr-unresolved'].write('UNRESOLVED_CRS', invalidWktStart)
const wktStart = wktFile.readUInt16LE(94) + 54
const wkt = wktFile.subarray(wktStart, wktStart + wktFile.readUInt16LE(wktStart - 34)).toString('utf8').replace(/\0/g, '')
const unresolved = Buffer.from(files['crs-geokeys-only'])
const directoryStart = unresolved.readUInt16LE(94) + 54
for (let i = 0; i < unresolved.readUInt16LE(directoryStart + 6); i++) {
  const p = directoryStart + 8 + i * 8
  if (unresolved.readUInt16LE(p) === 3072) unresolved.writeUInt16LE(32767, p + 6)
}
files.unresolved = unresolved
await writeFile(join(work, 'index.html'), '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{font:16px system-ui}#viewer{width:800px;height:500px}</style><h1>LAS CRS regression</h1><p>Real production runtime, engine and offline codecs. Rejection cases create no scene.</p><pre id="report"></pre><div id="viewer"></div><script type="module" src="./main.js"></script>')
await writeFile(join(work, 'main.js'), `
import { renderFileViewerGeo3d } from ${JSON.stringify(rendererFile('dist/geo3d.js'))};
import LASSource from ${JSON.stringify(engineFile('sources/LASSource.js'))};
import {setLazPerfPath} from ${JSON.stringify(engineFile('sources/las/config.js'))};
import {resolveGeo3dCrs,resolveLasSourceCrs} from ${JSON.stringify(rendererFile('dist/geo3dCrs.js'))};
import proj4 from ${JSON.stringify(createRequire(engineFile('core/Instance.js')).resolve('proj4/lib/index.js'))};
const project=(coordinates,from,to)=>proj4(from,to,coordinates);
setLazPerfPath('/vendor/geo3d/laz-perf/');
const wkt = ${JSON.stringify(wkt)};
window.results=[];window.hooks=0;
const data = async name => (await fetch('/'+name+'.las')).arrayBuffer();
window.baseline = async name => { const buffer=await data(name);const source=new LASSource({url:()=>Promise.resolve(buffer),enableWorkers:false});let stage='initialize';try{await source.initialize();stage='metadata';const metadata=await source.getMetadata();return {crs:metadata.crs?.id,points:metadata.pointCount}}catch(error){return {stage,error:String(error)}}finally{source.dispose()} };
window.sourceCrsContracts = async () => {
 const checks=[];const rejected=async(fn,pattern)=>{try{await fn();return false}catch(e){return pattern.test(String(e))}};
 const native=await resolveGeo3dCrs('EPSG:4326'), before=project([15,0],'EPSG:4326','EPSG:3857');
 const authority=await resolveLasSourceCrs(undefined,{crs:'EPSG:32633',hasCrsMetadata:true},{id:'EPSG:32633',definition:'+proj=merc +datum=WGS84 +units=m'});
 const authorityXY=project([15,0],'EPSG:4326',authority.id);
 window.sourceCrsObservations={authorityId:authority.id,authorityXY,registeredProjection:proj4.defs(authority.id).projName,expectedUTM:[500000,0]};
 checks.push(authority.id==='EPSG:32633' && Math.abs(authorityXY[0]-500000)<.001 && Math.abs(authorityXY[1])<.001);
 const fallback=await resolveLasSourceCrs(undefined,{hasCrsMetadata:true},{id:'EPSG:32634',definition:'+proj=merc +datum=WGS84 +units=m'});
 const fallbackXY=project([21,0],'EPSG:4326',fallback.id);
 checks.push(fallback.id==='EPSG:32634' && Math.abs(fallbackXY[0]-500000)<.001 && Math.abs(fallbackXY[1])<.001);
 checks.push(await rejected(()=>resolveLasSourceCrs(undefined,{hasCrsMetadata:true}),/authoritative EPSG/));
 checks.push((await resolveLasSourceCrs(undefined,{hasCrsMetadata:true},'EPSG:32632')).id==='EPSG:32632');
 checks.push(await resolveLasSourceCrs(undefined,{hasCrsMetadata:false})===undefined);
 checks.push(await rejected(()=>resolveLasSourceCrs(native,{hasCrsMetadata:true},'EPSG:3857'),/conflicts/));
 checks.push(await rejected(()=>resolveLasSourceCrs(undefined,{crs:'EPSG:32632',hasCrsMetadata:true},'EPSG:3857'),/conflicts/));
 checks.push(await rejected(()=>resolveLasSourceCrs(native,{crs:'EPSG:32632',hasCrsMetadata:true},'EPSG:4326'),/conflicts/));
 checks.push(await resolveLasSourceCrs(native,{crs:'EPSG:4326',hasCrsMetadata:true},'EPSG:4326')===native);
 checks.push(await resolveLasSourceCrs(native,{hasCrsMetadata:true},{id:'EPSG:4326',definition:'+proj=merc +datum=WGS84 +units=m'})===native && JSON.stringify(project([15,0],'EPSG:4326','EPSG:3857'))===JSON.stringify(before));
 const explicit={id:'LOCAL:source-crs-test',definition:'+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs'};
 checks.push((await resolveLasSourceCrs(undefined,{hasCrsMetadata:true},explicit)).id===explicit.id);
 for(const input of ['',null,{id:'',definition:explicit.definition},'EPSG:999999999'])checks.push(await rejected(()=>resolveLasSourceCrs(undefined,{hasCrsMetadata:true},input),/Invalid explicit|Unknown Geo3D/));
 return checks;
};
window.check = async (name,worker,matching=false,remote=false,sourceCrs,automatic=false) => {
 window.hooks=0;
 const buffer=remote?new ArrayBuffer(0):await data(name);let app;let observed;let instance;let datasetPoints;
 try {
  app=await renderFileViewerGeo3d(buffer,document.getElementById('viewer'),'las',{filename:name+'.las',url:remote?'/'+name+'.las':undefined},
   {assetBaseUrl:'/vendor/geo3d/',...(automatic?{}:{crsDefinitions:{'EPSG:2177':wkt}}),giro3d:{instance:automatic?{}:{crs:matching?(name.startsWith('evlr-wkt')?{id:'ETRS89 / Poland CS2000 zone 6',definition:wkt}:'EPSG:2177'):'EPSG:3857'},view:{controls:false},sources:{las:{enableWorkers:worker,sourceCrs}}},
    configureInstance(context){hooks++;observed=context.metadata?.crs?.id;datasetPoints=context.metadata?.pointCount;instance=context.instance}});
  if(automatic){const deadline=performance.now()+120000;while(instance.renderer.info.render.points===0){if(performance.now()>deadline)throw Error('No decoded points reached the real WebGL renderer');await new Promise(r=>requestAnimationFrame(r))}}
  return {name,worker,matching,automatic,status:'rendered',crs:observed,datasetPoints,gpuPoints:instance?.renderer.info.render.points,canvases:document.querySelectorAll('canvas').length};
 }catch(error){return {name,worker,matching,status:'rejected',error:String(error),hooks}}
 finally{await app?.unmount();}
};
window.ready=true;
window.startSlow = () => {
 window.slowController=new AbortController();window.slowStatus='pending';
 window.slowPending=renderFileViewerGeo3d(new ArrayBuffer(0),document.getElementById('viewer'),'las',
  {filename:'slow-crs.las',url:'/slow-crs.las',signal:slowController.signal},
  {assetBaseUrl:'/vendor/geo3d/',giro3d:{instance:{crs:'EPSG:3857'},sources:{las:{enableWorkers:false,sourceCrs:'EPSG:2177'}}}})
  .then(app=>{app.unmount();slowStatus='rendered'},error=>{slowStatus=String(error)});
};
`)
await build({configFile:false,root:work,base:'./',logLevel:'warn',plugins:[runtimeGraphPlugin('las-crs')],build:{outDir:site,emptyOutDir:true,target:'es2022'}})
await copyGeo3dAssets(join(site, 'vendor/geo3d'))
const sampleRequests = []
let slowDownload
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://local').pathname
  if (name === '/slow-crs.las') {
    if (request.headers.range) return response.writeHead(200, {'Content-Type':'application/octet-stream'}).end(files['crs-geokeys-only'])
    slowDownload = { closed: false }
    response.on('close', () => { slowDownload.closed = true })
    return
  }
  if (files[name.slice(1,-4)] && name.endsWith('.las')) {
    sampleRequests.push({name,range:request.headers.range||null})
    return response.writeHead(200, {'Content-Type':'application/octet-stream'}).end(files[name.slice(1,-4)])
  }
  const path = resolve(site, '.' + (name === '/' ? '/index.html' : name))
  if (!path.startsWith(site+sep)) return response.writeHead(403).end()
  try { response.writeHead(200, {'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[extname(path)] || 'application/octet-stream'}).end(await readFile(path)) }
  catch {response.writeHead(404).end()}
})
let browser
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const origin=`http://127.0.0.1:${server.address().port}`
  browser=await chromium.launch({headless:true,channel:process.env.GEO3D_TEST_BROWSER_CHANNEL || undefined})
  const page=await browser.newPage({viewport:{width:1050,height:800}})
  const errors=[],external=[],wasm=[]
  page.on('pageerror', error=>errors.push(String(error)))
  page.on('response', response=>{if(response.url().endsWith('.wasm'))wasm.push({url:response.url(),status:response.status(),mime:response.headers()['content-type']})})
  await page.route('**/*',route=>{if(route.request().url().startsWith(origin+'/')||/^(?:blob:|data:)/.test(route.request().url()))return route.continue();external.push(route.request().url());return route.abort()})
  await page.goto(origin)
  await page.waitForFunction(()=>window.ready)
  const originalResults=[]
  for(const name of ['citation-only', ...(files['original-citation']?['original-citation']:[])])for(const worker of [false,true]){
    // A reload clears the engine's CRS registry: no definition from another
    // case may accidentally make this automatic-resolution assertion pass.
    await page.reload();await page.waitForFunction(()=>window.ready)
    const result=await page.evaluate(({name,worker})=>window.check(name,worker,false,false,undefined,true),{name,worker})
    assert.equal(result.status,'rendered',JSON.stringify(result));assert.equal(result.crs,'EPSG:2177');assert.equal(result.datasetPoints,files[name].readUInt32LE(107));assert.ok(result.gpuPoints>0)
    originalResults.push(result);console.log('[geo3d] '+name+': automatic CRS and actual GPU points passed, Worker='+worker)
  }
  for(const name of ['citation-ambiguous','citation-unit-conflict']){
    const result=await page.evaluate(name=>window.check(name,false),name)
    assert.equal(result.status,'rejected');assert.match(result.error,/ambiguous|linear units/);assert.equal(result.hooks,0)
    originalResults.push(result)
  }
  const sourceCrsContracts=await page.evaluate(()=>window.sourceCrsContracts())
  const sourceCrsObservations=await page.evaluate(()=>window.sourceCrsObservations)
  await writeFile(join(output,'source-crs-contracts.json'),JSON.stringify({sourceCrsContracts,sourceCrsObservations},null,2)+'\n')
  assert.equal(sourceCrsContracts.length,15)
  assert.ok(sourceCrsContracts.every(Boolean),'Explicit source CRS contracts must all pass in the actual engine')
  const baseline={}
  for(const name of ['crs-geokeys-only','crs-wkt','evlr-wkt','evlr-wkt-final']) baseline[name]=await page.evaluate(name=>window.baseline(name),name)
  assert.equal(baseline['crs-geokeys-only'].crs,undefined,'Pinned engine ignores GeoKey CRS before the viewer correction')
  // The reporter's WKT has no AUTHORITY node. The pinned engine identifies it
  // by its WKT name, which still correctly differs from the EPSG:3857 scene.
  assert.equal(baseline['crs-wkt'].crs,'ETRS89 / Poland CS2000 zone 6')
  for(const name of ['evlr-wkt','evlr-wkt-final']) assert.deepEqual(baseline[name],{stage:'metadata',error:'Error'},'Unmodified pinned SDK rejects a complete WKT ending exactly at EOF')
  const results=[]
  for(const worker of [false,true]) {
    const explicit=await page.evaluate(worker=>window.check('unresolved',worker,true,false,'EPSG:2177'),worker)
    assert.equal(explicit.status,'rendered',JSON.stringify(explicit));assert.equal(explicit.crs,'EPSG:2177');assert.ok(explicit.canvases>0)
    results.push({...explicit,explicitSource:true})
    for(const name of ['crs-geokeys-only','crs-wkt','evlr-wkt']) {
      const conflict=await page.evaluate(({name,worker})=>window.check(name,worker,false,false,'EPSG:3857'),{name,worker})
      assert.equal(conflict.status,'rejected');assert.match(conflict.error,/source CRS conflicts/);assert.equal(conflict.hooks,0)
      results.push({...conflict,explicitSourceConflict:true})
    }
    const mismatch=await page.evaluate(worker=>window.check('unresolved',worker,false,false,'EPSG:2177'),worker)
    assert.equal(mismatch.status,'rejected');assert.match(mismatch.error,/instance CRS must match/);assert.equal(mismatch.hooks,0)
    results.push({...mismatch,explicitSceneMismatch:true})
  }
  for(const worker of [false,true]) for(const name of ['crs-geokeys-only','crs-wkt','evlr-wkt','evlr-wkt-final','unresolved','evlr-unresolved']) {
    const result=await page.evaluate(({name,worker})=>window.check(name,worker),{name,worker})
    assert.equal(result.status,'rejected',JSON.stringify(result))
    assert.match(result.error,name.includes('unresolved')?/authoritative EPSG GeoKey or WKT/:/instance CRS must match its dataset CRS/)
    assert.equal(result.hooks,0,'No application scene hook may see mislabelled points')
    results.push(result)
  }
  const before = sampleRequests.length
  const remote = await page.evaluate(()=>window.check('crs-geokeys-only',false,false,true))
  assert.equal(remote.status,'rejected');assert.match(remote.error,/instance CRS must match its dataset CRS/)
  const rawReads = sampleRequests.slice(before)
  assert.equal(rawReads.filter(read=>!read.range).length,1,'Raw LAS metadata and decoder must share one bounded whole-file download')
  assert.equal(rawReads.length,2,'Only the existing COPC header sniff may precede the shared whole-file download')
  results.push({...remote,remote:true,requests:rawReads})
  await page.evaluate(()=>window.startSlow())
  const deadline = Date.now()+10000
  while (!slowDownload) { assert.ok(Date.now()<deadline,'Raw LAS did not start its bounded read');await new Promise(resolve=>setTimeout(resolve,10)) }
  const aborted = await page.evaluate(async()=>{slowController.abort(new DOMException('CRS load cancelled','AbortError'));await slowPending;return {status:slowStatus,canvases:document.querySelectorAll('canvas').length}})
  assert.match(aborted.status,/AbortError/);assert.equal(aborted.canvases,0)
  while (!slowDownload.closed) { assert.ok(Date.now()<deadline,'Cancelled raw LAS download remained open');await new Promise(resolve=>setTimeout(resolve,10)) }
  results.push({name:'raw-LAS-abort-during-metadata',...aborted,requestClosed:true})
  for(const name of ['crs-geokeys-only','evlr-wkt','evlr-wkt-final']) {
    const result=await page.evaluate(name=>window.check(name,false,true),name)
    assert.equal(result.status,'rendered',JSON.stringify(result));assert.equal(result.crs,name.startsWith('evlr-wkt')?'ETRS89 / Poland CS2000 zone 6':'EPSG:2177');assert.ok(result.canvases>0)
    results.push(result)
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[])
  assert.ok(wasm.length>0&&wasm.every(r=>r.status===200&&r.mime==='application/wasm'))
  const report={browser:await browser.version(),baseline,sourceCrsContracts,sourceCrsObservations,originalResults,results,wasm,externalRequests:external,pageErrors:errors}
  await page.evaluate(report=>{document.getElementById('report').textContent=JSON.stringify(report,null,2)},report)
  await page.screenshot({path:join(output,'crs-decisions.png'),fullPage:true})
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n')
  console.log('[geo3d] #406 original GeoKey omission reproduced; paired LAS mismatch guards, unresolved GeoKeys, matching-CRS rendering and offline codecs passed.')
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
