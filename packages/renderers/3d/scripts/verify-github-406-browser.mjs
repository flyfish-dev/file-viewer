import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { las14EvlrWkt } from '../test/fixtures/las14-evlr-wkt.mjs'
import { browserOutput, copyGeo3dAssets, engineFile, rendererFile, repositoryRoot, runtimeGraphPlugin } from './geo3d-browser-package.mjs'

const output = join(browserOutput, 'las-crs')
const work = join(output, 'fixture'), site = join(output, 'site')
await mkdir(work, { recursive: true })
const require = createRequire(join(repositoryRoot, 'apps/viewer-demo/package.json'))
const { build } = await import(pathToFileURL(require.resolve('vite')).href)
const { chromium } = createRequire(join(repositoryRoot, 'package.json'))('playwright')
const files = {}
for (const name of ['crs-geokeys-only', 'crs-wkt']) files[name] = await readFile(rendererFile(`test/fixtures/github-406-${name}.las`))
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
setLazPerfPath('/vendor/geo3d/laz-perf/');
const wkt = ${JSON.stringify(wkt)};
window.results=[];window.hooks=0;
const data = async name => (await fetch('/'+name+'.las')).arrayBuffer();
window.baseline = async name => { const buffer=await data(name);const source=new LASSource({url:()=>Promise.resolve(buffer),enableWorkers:false});let stage='initialize';try{await source.initialize();stage='metadata';const metadata=await source.getMetadata();return {crs:metadata.crs?.id,points:metadata.pointCount}}catch(error){return {stage,error:String(error)}}finally{source.dispose()} };
window.check = async (name,worker,matching=false,remote=false) => {
 const buffer=remote?new ArrayBuffer(0):await data(name);let app;let observed;
 try {
  app=await renderFileViewerGeo3d(buffer,document.getElementById('viewer'),'las',{filename:name+'.las',url:remote?'/'+name+'.las':undefined},
   {assetBaseUrl:'/vendor/geo3d/',crsDefinitions:{'EPSG:2177':wkt},giro3d:{instance:{crs:matching?(name.startsWith('evlr-wkt')?{id:'ETRS89 / Poland CS2000 zone 6',definition:wkt}:'EPSG:2177'):'EPSG:3857'},view:{controls:false},sources:{las:{enableWorkers:worker}}},
    configureInstance(context){hooks++;observed=context.metadata?.crs?.id}});
  return {name,worker,matching,status:'rendered',crs:observed,canvases:document.querySelectorAll('canvas').length};
 }catch(error){return {name,worker,matching,status:'rejected',error:String(error),hooks}}
 finally{await app?.unmount();}
};
window.ready=true;
window.startSlow = () => {
 window.slowController=new AbortController();window.slowStatus='pending';
 window.slowPending=renderFileViewerGeo3d(new ArrayBuffer(0),document.getElementById('viewer'),'las',
  {filename:'slow-crs.las',url:'/slow-crs.las',signal:slowController.signal},
  {assetBaseUrl:'/vendor/geo3d/',giro3d:{instance:{crs:'EPSG:3857'},sources:{las:{enableWorkers:false}}}})
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
  const baseline={}
  for(const name of ['crs-geokeys-only','crs-wkt','evlr-wkt','evlr-wkt-final']) baseline[name]=await page.evaluate(name=>window.baseline(name),name)
  assert.equal(baseline['crs-geokeys-only'].crs,undefined,'Pinned engine ignores GeoKey CRS before the viewer correction')
  // The reporter's WKT has no AUTHORITY node. The pinned engine identifies it
  // by its WKT name, which still correctly differs from the EPSG:3857 scene.
  assert.equal(baseline['crs-wkt'].crs,'ETRS89 / Poland CS2000 zone 6')
  for(const name of ['evlr-wkt','evlr-wkt-final']) assert.deepEqual(baseline[name],{stage:'metadata',error:'Error'},'Unmodified pinned SDK rejects a complete WKT ending exactly at EOF')
  const results=[]
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
  const report={browser:await browser.version(),baseline,results,wasm,externalRequests:external,pageErrors:errors}
  await page.evaluate(report=>{document.getElementById('report').textContent=JSON.stringify(report,null,2)},report)
  await page.screenshot({path:join(output,'crs-decisions.png'),fullPage:true})
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n')
  console.log('[geo3d] #406 original GeoKey omission reproduced; paired LAS mismatch guards, unresolved GeoKeys, matching-CRS rendering and offline codecs passed.')
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
