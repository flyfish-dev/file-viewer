import assert from 'node:assert/strict';
import {establishWordBrowserOrigin} from '../test/browser-origin.mjs';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { makeParagraphFlowFixture, spacingCases } from '../test/paragraph-flow-fixtures.mjs';
import {readPublishedDocxEntry,verifyDocxDistribution} from '../../../../.github/scripts/verify-docx-distribution.mjs';
const root=path.resolve(import.meta.dirname,'../../../..');
const require=createRequire(path.join(root,'packages/renderers/pptx/package.json'));
const {build}=require('esbuild');const {chromium}=createRequire(path.join(root,'package.json'))('playwright');
const wordRequire=createRequire(path.join(root,'packages/renderers/word/package.json'));
const engine=path.dirname(wordRequire.resolve('@file-viewer/docx/package.json'));
const output=path.resolve(process.env.DOCX_FLOW_OUTPUT||path.join(root,'output/docx-paragraph-flow'));
await mkdir(output,{recursive:true});
const baseline=process.env.DOCX_FLOW_BASE_DIR
 ? {text:await readFile(path.resolve(process.env.DOCX_FLOW_BASE_DIR,'docx-preview.mjs'),'utf8'),provenance:{mode:'explicit-local-test-baseline'}}
 : await readPublishedDocxEntry('0.3.33','dist/docx-preview.mjs');
const baseSource=baseline.text;
const baselineProvenance={...baseline.provenance,sha256:createHash('sha256').update(baseSource).digest('hex')};
const installed=await readFile(path.join(engine,'dist/docx-preview.mjs'),'utf8');
const provenance=await verifyDocxDistribution(root);
const entryHashes=provenance.mode==='published'?provenance.sha256:Object.fromEntries(Object.entries(provenance.sha256).map(([name,sha])=>['dist/'+name,sha]));
assert.equal(createHash('sha256').update(installed).digest('hex'),entryHashes['dist/docx-preview.mjs'],'The tested engine must match the verified distribution');
let control;
{
 // Test-only negative control: disable the safe bulk-transfer optimization in
 // an output-directory copy. Production always uses the verified installed bytes.
 // Section inheritance, grid metrics and chart axes stay identical on both sides.
 const file=ts.createSourceFile('control.mjs',installed,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const calls=[];
 const visit=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='moveOverflowingTail')calls.push(node);ts.forEachChild(node,visit);};
 visit(file);assert.equal(calls.length,1,'Exactly one owning-source bulk-transfer call');
 const call=calls[0];control=installed.slice(0,call.getStart(file))+'false'+installed.slice(call.end);
}
const entries={base:baseSource,control,optimized:installed};
const bundles={};
for(const [name,source] of Object.entries(entries)) {
 const target=path.join(output,`${name}.mjs`);await writeFile(target,source);
 const compiled=await build({stdin:{contents:`import * as engine from '@file-viewer/docx';import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';Object.assign(window,{engine,renderFileViewerWordDoc});`,resolveDir:root,loader:'ts'},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'warning',plugins:[{name:'owned-engine',setup(b){b.onResolve({filter:/^@file-viewer\/docx$/},()=>({path:target}));}}]});
 bundles[name]=compiled.outputFiles[0].text;
}
const checks=[],observations=[],errors=[],external=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
async function check(name,fn){await fn();checks.push({name,status:'pass'});console.log('PASS '+name);}
async function pageFor(name) {
 const page=await browser.newPage({viewport:{width:1100,height:1000}});
 await establishWordBrowserOrigin(page);
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{external.push(r.request().url());return r.abort();});
 await page.setContent('<style>html,body{margin:0}#host{width:1000px;height:950px;overflow:auto}</style><div id="host"></div>');
 await page.addScriptTag({content:bundles[name]});return page;
}
async function inspectDocument(page,bytes,worker=false) {
 const session=await page.context().newCDPSession(page);await session.send('Performance.enable');const before=(await session.send('Performance.getMetrics')).metrics;
 const start=Date.now();
 await page.evaluate(async({base,worker})=>{
  window.handle?.unmount();const b=Uint8Array.from(atob(base),c=>c.charCodeAt(0));
  window.handle=await renderFileViewerWordDoc(b.buffer,document.getElementById('host'),'docx',{filename:'document.docx',options:{docx:{worker,workerUrl:worker?window.workerUrl:undefined,workerJsZipUrl:worker?window.zipUrl:undefined,visualPagination:true}}});
 },{base:bytes.toString('base64'),worker});
 await page.waitForFunction(()=>{const w=document.querySelector('.docx-wrapper');return w?.dataset.docxPaginated==='true'&&w.dataset.docxPaginating!=='true'&&document.querySelectorAll('.docx-page-frame').length>0;},null,{timeout:120000});
 const durationMs=Date.now()-start;await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(40);
 const geometry=await page.evaluate(()=>[...document.querySelectorAll('section.docx')].map(s=>{
  const box=s.getBoundingClientRect();return {
   width:s.offsetWidth,height:s.offsetHeight,text:[...s.querySelectorAll(':scope>article')].map(a=>a.textContent).join(''),
   header:s.querySelector('header')?.textContent,footer:s.querySelector('footer')?.textContent,
   tables:s.querySelectorAll('table').length,images:[...s.querySelectorAll('img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.width,height:i.height})),
   elements:[...s.querySelectorAll('article p,article table,article td')].map(el=>{const b=el.getBoundingClientRect();return {tag:el.tagName,text:el.textContent,x:Math.round((b.x-box.x)*100)/100,y:Math.round((b.y-box.y)*100)/100,w:Math.round(b.width*100)/100,h:Math.round(b.height*100)/100};})};
 }));
 const after=(await session.send('Performance.getMetrics')).metrics;
 const metrics=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','TaskDuration'].map(n=>[n,(after.find(m=>m.name===n)?.value||0)-(before.find(m=>m.name===n)?.value||0)]));
 await session.detach();return {durationMs,metrics,geometry};
}
try {
 const bytes=await makeParagraphFlowFixture('spacing');
 const b=await pageFor('base');
 await check('Baseline reproduces the invalid signed line-gap regression',async()=>{
  const v=await b.evaluate(async base=>{const d=await engine.parseAsync(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer);return d.documentPart.body.children[0].cssStyle['margin-top'];},bytes.toString('base64'));
  assert.equal(v,'-21474836.48em');
 });await b.close();
 const p=await pageFor('optimized');
 let expected;
 await check('Eight real OOXML spacing cases preserve precedence and signed indentation',async()=>{
  expected=await p.evaluate(async base=>{const d=await engine.parseAsync(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer);return d.documentPart.body.children.filter(x=>x.type==='paragraph').map(x=>({before:x.cssStyle['margin-top']??null,after:x.cssStyle['margin-bottom']??null,indent:x.cssStyle['text-indent']}));},bytes.toString('base64'));
  assert.deepEqual(expected,spacingCases.map(([,before,after])=>({before,after,indent:'-18.00pt'})));
 });
 await check('Actual classic Worker parses the same spacing model without fallback',async()=>{
  const worker=await readFile(path.join(engine,'dist/docx-preview.worker.js'),'utf8'),zip=await readFile(wordRequire.resolve('jszip/dist/jszip.min.js'),'utf8');
  await p.evaluate(({worker,zip})=>{window.workerUrl=URL.createObjectURL(new Blob([worker],{type:'text/javascript'}));window.zipUrl=URL.createObjectURL(new Blob([zip],{type:'text/javascript'}));window.messages=[];const Native=Worker;window.Worker=class extends Native{constructor(...a){super(...a);this.addEventListener('message',e=>messages.push(e.data?.type));}};},{worker,zip});
  const model=await p.evaluate(async base=>{const d=await engine.parseAsync(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer,{useWorker:true,workerUrl,workerJsZipUrl:zipUrl});return d.documentPart.body.children.filter(x=>x.type==='paragraph').map(x=>({before:x.cssStyle['margin-top']??null,after:x.cssStyle['margin-bottom']??null,indent:x.cssStyle['text-indent']}));},bytes.toString('base64'));
  assert.deepEqual(model,expected);assert.ok(await p.evaluate(()=>messages.includes('parsed')));
 });
 await p.close();
 for(const kind of ['flow','keep','table','breaks','columns','explicit-column']) {
  const fixture=await makeParagraphFlowFixture(kind);await writeFile(path.join(output,kind+'.docx'),fixture);
  await check(`${kind}: optimized pagination matches the corrected reference on every page`,async()=>{
   const cp=await pageFor('control'),op=await pageFor('optimized');
   try {
    const reference=await inspectDocument(cp,fixture),actual=await inspectDocument(op,fixture);
    assert.deepEqual(actual.geometry,reference.geometry,'page boundaries, body order, tables, headers, footers and element geometry');
    assert.ok(actual.geometry.every(s=>s.header?.includes('FLOW HEADER')&&s.footer?.includes('FLOW FOOTER')));
    const count=await op.evaluate(()=>getComputedStyle(document.querySelector('article')).columnCount);
    if(kind==='columns')assert.equal(count,'2');else if(kind==='explicit-column')assert.equal(count,'1');else assert.equal(count,'auto');
    if(kind==='flow'){
     assert.ok(actual.metrics.LayoutCount<reference.metrics.LayoutCount/3,'safe tail transfer must reduce repeated layouts');
     await op.screenshot({path:path.join(output,'generated.png')});
    }
    observations.push({id:kind,pages:actual.geometry.length,control:{ms:reference.durationMs,...reference.metrics},optimized:{ms:actual.durationMs,...actual.metrics},geometryMatches:true});
   }finally{await cp.close();await op.close();}
  });
 }
 const originals=process.env.DOCX_FLOW_CORPUS_DIR;
 if(originals)for(const id of (process.env.DOCX_FLOW_IDS||'C022').split(',')) {
  await check(`${id}: original bytes preserve corrected pagination, every page and rendered element`,async()=>{
   const data=await readFile(path.join(originals,id+'.docx'));
   const cp=await pageFor('control'),op=await pageFor('optimized');
   try {
    const reference=await inspectDocument(cp,data),actual=await inspectDocument(op,data);
    assert.deepEqual(actual.geometry,reference.geometry,'original page-by-page correctness control');
    const result={id,sha256:createHash('sha256').update(data).digest('hex'),pages:actual.geometry.length,control:{ms:reference.durationMs,...reference.metrics},optimized:{ms:actual.durationMs,...actual.metrics},geometryMatches:true};
    observations.push(result);
    await writeFile(path.join(output,id+'-geometry.json'),JSON.stringify(actual.geometry,null,2));
    if(id==='C022')await op.screenshot({path:path.join(output,id+'.png')});
   }finally{await cp.close();await op.close();}
  });
 }
 await check('All installed engine entries still match verified distribution bytes',async()=>{
  for(const [name,sha]of Object.entries(entryHashes))assert.equal(createHash('sha256').update(await readFile(path.join(engine,name))).digest('hex'),sha,name);
 });
 await check('No unexpected browser exceptions or external network requests',()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
}finally {
 await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({passed:checks.length,checks,observations,errors,external,provenance,baseline:baselineProvenance,scope:'Spacing parser/Worker and corrected-control pagination parity; not complete desktop document fidelity.'},null,2)+'\n');
}
