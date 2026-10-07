import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {makeEngineDocument} from '../test/docx-engine-compatibility/fixtures.mjs';
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.join(root,'packages/renderers/word/package.json'));
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild');
const JSZip=require('jszip');
const engine=path.dirname(require.resolve('@file-viewer/docx/package.json'));
const output=path.resolve(process.env.DOCX_ENGINE_EVIDENCE_DIR||path.join(root,'output/docx-engine-compatibility'));
await mkdir(output,{recursive:true});
const checks=[];
async function check(name,fn){await fn();checks.push({name,status:'pass'});console.log('PASS '+name);}
const buffer=await makeEngineDocument(JSZip);
await writeFile(path.join(output,'generated.docx'),buffer);
await build({entryPoints:[path.join(root,'test/docx-engine-compatibility/browser.ts')],outfile:path.join(output,'browser.js'),bundle:true,format:'iife',platform:'browser',logLevel:'warning'});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const failures=[],requests=[];
try {
 const page=await browser.newPage({viewport:{width:1100,height:900}});
 page.on('pageerror',e=>failures.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.route('**/*',route=>/^https?:/.test(route.request().url())?route.abort():route.continue());
 await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1000px;height:850px;overflow:auto}</style><div id="host"></div>');
 await page.addScriptTag({content:await readFile(path.join(output,'browser.js'),'utf8')});
 const base=Buffer.from(buffer).toString('base64');
 async function mount(worker=false){
  return page.evaluate(async({base,worker})=>{
   window.handle?.unmount();const host=document.getElementById('host');
   const bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));
   window.handle=await docxCompatibility.renderFileViewerWordDoc(bytes.buffer,host,'docx',{filename:'generated.docx',options:{docx:{worker,workerUrl:worker?window.workerUrl:undefined,workerJsZipUrl:worker?window.zipUrl:undefined,visualPagination:false}}});
   return {charts:host.querySelectorAll('.docx-chart svg').length,images:host.querySelectorAll('img').length};
  },{base,worker});
 }
 async function inspect(){return page.evaluate(()=>{
  const charts=[...document.querySelectorAll('.docx-chart svg')];
  return charts.map(s=>({labels:[...s.querySelectorAll('[data-docx-chart-category-index]')].map(t=>({index:Number(t.getAttribute('data-docx-chart-category-index')),x:Number(t.getAttribute('x')),text:t.textContent})),points:[...s.querySelectorAll('[data-docx-chart-point-index]')].map(p=>({tag:p.tagName,index:Number(p.getAttribute('data-docx-chart-point-index')),height:p.getAttribute('height')})),paths:[...s.querySelectorAll('path')].map(p=>p.getAttribute('d')),invalid:/NaN|Infinity/.test(s.outerHTML)}));
 });}
 await check('Real DOCX ZIP/XML loads all generated charts',async()=>{assert.equal((await mount()).charts,4)});
 const esm=await inspect();
 await check('Sparse labels keep full category domain and source coordinates',async()=>{
  assert.equal(esm[0].labels.length,16);
  esm[0].labels.forEach((p,i)=>{assert.equal(p.index,i*2);assert.equal(p.text,`${i*2+1}日`);assert.ok(Math.abs(p.x-(60+540*i*2/31))<1e-6)});
  assert.equal(esm[0].points.length,32);
 });
 await check('Missing numeric indices form gaps, not zeroes or joined paths',async()=>{
  assert.deepEqual(esm[1].points.map(p=>p.index),[0,2]);assert.equal(esm[1].paths.length,2);assert.ok(esm[1].paths.every(p=>!p.includes('L')));
 });
 await check('Signed columns keep finite positive geometry and original indices',async()=>{
  assert.deepEqual(esm[2].points.map(p=>p.index),[0,2]);assert.ok(esm[2].points.every(p=>p.tag==='rect'&&Number(p.height)>0));
 });
 await check('Single positive pie category remains a visible complete circle',async()=>{
  assert.deepEqual(esm[3].points.map(p=>[p.tag,p.index]),[['circle',2]]);assert.ok(esm.every(s=>!s.invalid));
 });
 await check('Floating column drawing keeps authored offset and paragraph origin',async()=>{
  const actual=await page.evaluate(()=>{
   const el=document.querySelector('[style*="--docx-float-column-position"]');if(!el)return null;
   return {offset:el.style.getPropertyValue('--docx-float-column-position'),marginLeft:getComputedStyle(el).marginLeft,marginTop:getComputedStyle(el).marginTop,float:getComputedStyle(el).float};
  });assert.ok(actual,'floating drawing must survive the real parser');assert.match(actual.offset,/^72(?:\.0+)?pt$/);assert.equal(actual.float,'left');assert.equal(actual.marginLeft,'96px');assert.ok(Math.abs(parseFloat(actual.marginTop)-13.3333)<0.02);
 });
 await page.screenshot({path:path.join(output,'charts.png')});
 // The browser really executes the bundled worker in a Blob. No parser stub or
 // network access is involved; receipt of a result distinguishes worker success
 // from a silent main-thread fallback.
 const workerText=await readFile(path.join(engine,'dist/docx-preview.worker.js'),'utf8');
 const zipText=await readFile(require.resolve('jszip/dist/jszip.min.js'),'utf8');
 await page.evaluate(({text,zip})=>{
  window.zipUrl=URL.createObjectURL(new Blob([zip],{type:'application/javascript'}));
  window.workerMessages=[];window.workerCreated=0;
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker {constructor(...args){super(...args);window.workerCreated++;this.addEventListener('message',e=>window.workerMessages.push({type:e.data?.type,error:e.data?.error}));}};
  window.workerUrl=URL.createObjectURL(new Blob([text],{type:'application/javascript'}));
 },{text:workerText,zip:zipText});
 await check('Actual Worker parser returns charts without a fallback',async()=>{
  assert.equal((await mount(true)).charts,4);
  const worker=await page.evaluate(()=>({created:workerCreated,messages:workerMessages}));
  await writeFile(path.join(output,'worker.json'),JSON.stringify(worker,null,2)+'\n');
  assert.ok(worker.created>0);assert.ok(worker.messages.some(m=>m.type==='parsed'),JSON.stringify(worker));
  assert.deepEqual(await inspect(),esm);
 });
 await check('Default worker cache key identifies the patched distribution',async()=>{
  const url=await page.evaluate(()=>docxCompatibility.resolveFileViewerDocxWorkerUrl(null,'https://viewer.invalid/app/'));
  const pin=JSON.parse(await readFile(path.join(root,'patches/docx-engine-compatibility.json'),'utf8'));
  assert.equal(new URL(url).searchParams.get('file-viewer-docx'),pin.runtimeVersion||'0.3.32+compat.20260922');
 });
 await check('CommonJS bundle retains browser chart parity',async()=>{
  await page.evaluate(()=>{handle.unmount();});
  await page.addScriptTag({content:await readFile(require.resolve('jszip/dist/jszip.min.js'),'utf8')});
  await page.addScriptTag({content:await readFile(path.join(engine,'dist/docx-preview.js'),'utf8')});
  await page.evaluate(async base=>{await window.docx.renderAsync(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer,document.getElementById('host'),null,{worker:false,className:'docx',breakPages:false,ignoreLastRenderedPageBreak:true});},base);
  assert.deepEqual(await inspect(),esm);
 });
 await check('ESM, browser, minified and Worker entries match the engine pin',async()=>{
  const pin=JSON.parse(await readFile(path.join(root,'patches/docx-engine-compatibility.json'),'utf8'));
  for(const [name,sha]of Object.entries(pin.sha256))assert.equal(createHash('sha256').update(await readFile(path.join(engine,'dist',name))).digest('hex'),sha,name);
 });
 await check('No unhandled browser errors or external requests',async()=>{assert.deepEqual(failures,[]);assert.deepEqual(requests,[])});
 await writeFile(path.join(output,'geometry.json'),JSON.stringify(esm,null,2)+'\n');
} finally {
 await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({checks,passed:checks.length},null,2)+'\n');
}
