/** Same-byte, same-environment comparison. Reports hashes, never original prose. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'packages/renderers/word/package.json'));
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild');
const JSZip=require('jszip');
const hash=b=>createHash('sha256').update(b).digest('hex');
const input=process.env.DOCX_FLOW_ORIGINAL,control=process.env.DOCX_FLOW_CONTROL_DIST;
if(!input||!control)throw Error('Set DOCX_FLOW_ORIGINAL and DOCX_FLOW_CONTROL_DIST (spacing-only control).');
const runs=Number(process.env.DOCX_FLOW_RUNS||3);
assert.ok(Number.isInteger(runs)&&runs>=1&&runs<=5,'Runs must be 1..5');
const bytes=await readFile(input);
assert.equal(hash(bytes),'74c3da195b8afaa638124e4fef5440193a811aa2180820411c1cb4b2ebbc6d61','Expected C022 bytes');
const pins=JSON.parse(await readFile(path.join(root,'patches/docx-engine-compatibility.json'),'utf8'));
const current=path.join(path.dirname(require.resolve('@file-viewer/docx/package.json')),'dist');
const out=path.resolve(process.env.DOCX_FLOW_BENCH_OUTPUT||path.join(root,'output/docx-flow-benchmark'));
await mkdir(out,{recursive:true});
const bundles={};
for(const [name,dir,expected]of [['control',path.resolve(control),{ 'docx-preview.mjs':'7147ac2e53e5ddfbf8ce1733b8b76a6e9ca37368d55155cf439bc967c8ba456e' }],['optimized',current,pins.sha256]]){
 const entry=path.join(dir,'docx-preview.mjs');assert.equal(hash(await readFile(entry)),expected['docx-preview.mjs']);
 const result=await build({entryPoints:[path.join(root,'test/docx-paragraph-flow/browser.ts')],write:false,bundle:true,format:'iife',platform:'browser',alias:{'@file-viewer/docx':entry,jszip:require.resolve('jszip/dist/jszip.min.js')},logLevel:'error'});
 bundles[name]=result.outputFiles[0].text;
}
const xml=await (await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const results=[];let expectedPages;
try{
 for(let run=0;run<runs;run++)for(const variant of run%2?['optimized','control']:['control','optimized']){
  const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:1});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  try{
   await page.route('**/*',r=>r.abort());
   await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1000px;height:900px;overflow:auto}</style><div id="host"></div>');
   await page.addScriptTag({content:bundles[variant]});
   const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
   const before=await cdp.send('Performance.getMetrics');const start=performance.now();
   console.log('BEGIN',run+1,variant);
   await page.evaluate(async b=>{window.handle=await paragraphFlow.renderFileViewerWordDoc(Uint8Array.from(atob(b),c=>c.charCodeAt(0)).buffer,document.getElementById('host'),'docx',{filename:'neutral.docx',options:{docx:{worker:false,visualPagination:true}}});},bytes.toString('base64'));
   await page.waitForFunction(()=>document.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:120000});
   const elapsedMs=performance.now()-start;const after=await cdp.send('Performance.getMetrics');
   const result=await page.evaluate(xml=>{
    const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';const source=new DOMParser().parseFromString(xml,'application/xml');
    const expected=[...source.getElementsByTagNameNS(ns,'body')[0].getElementsByTagNameNS(ns,'t')].map(t=>t.textContent).join('');
    const pages=[...document.querySelectorAll('section.docx')],text=pages.map(p=>[...p.querySelectorAll(':scope > article')].map(a=>a.textContent).join(''));
    const elements=pages.map(p=>{const origin=p.getBoundingClientRect();return [...p.querySelectorAll('article p,article table,article td')].map(e=>{const b=e.getBoundingClientRect();return [e.tagName,...[b.x-origin.x,b.y-origin.y,b.width,b.height].map(v=>Math.round(v*100)/100)]})});
    return {text,elements,pageBoxes:pages.map(p=>{const b=p.getBoundingClientRect();return [b.width,b.height]}),exactSourceText:expected===text.join(''),sourceCharacters:expected.length,tableRows:document.querySelectorAll('article tr').length,footers:document.querySelectorAll('section.docx > footer').length,frames:document.querySelectorAll('.docx-page-frame').length,negativeMargins:[...document.querySelectorAll('article p')].filter(p=>parseFloat(getComputedStyle(p).marginTop)<-1000||parseFloat(getComputedStyle(p).marginBottom)<-1000).length};
   },xml);
   assert.equal(result.exactSourceText,true);assert.equal(result.sourceCharacters,30769);assert.equal(result.tableRows,87);assert.equal(result.negativeMargins,0);assert.equal(result.footers,result.text.length);assert.equal(result.frames,result.text.length);
   const identity={pageSha256:result.text.map(hash),pageBoxes:result.pageBoxes,elementGeometrySha256:result.elements.map(e=>hash(JSON.stringify(e)))};
   if(expectedPages)assert.deepEqual(identity,expectedPages,'Optimization changed a page boundary, box or paragraph/table/cell geometry');else expectedPages=identity;
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   const counters=Object.fromEntries(after.metrics.filter(m=>/Layout|RecalcStyle|TaskDuration/.test(m.name)).map(m=>[m.name,m.value-(before.metrics.find(b=>b.name===m.name)?.value||0)]));
   const record={run:run+1,variant,elapsedMs,pages:result.text.length,bodySha256:hash(result.text.join('')),sourceCharacters:result.sourceCharacters,exactSourceText:true,tableRows:result.tableRows,footers:result.footers,performance:counters};
   results.push(record);console.log(JSON.stringify(record));
   await page.evaluate(()=>handle.unmount());
   console.log('UNMOUNTED',variant);
  }finally{await page.close()}
 }
}finally{
 await browser.close();
 const median=a=>{a.sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2};
 const summary=Object.fromEntries(['control','optimized'].map(variant=>{const r=results.filter(r=>r.variant===variant);return [variant,{runs:r.length,medianMs:median(r.map(r=>r.elapsedMs)),medianLayouts:median(r.map(r=>r.performance.LayoutCount))}]}));
 await writeFile(path.join(out,'report.json'),JSON.stringify({input:{id:'C022',sha256:hash(bytes)},completed:results.length===runs*2,results,summary,identicalPageContentAndGeometry:results.length===runs*2,pageIdentity:expectedPages,scope:'Spacing and single-column corrected control vs optimized, alternating order, actual Word renderer at 1000px/DPR1. Same local browser; not an Office reference or universal SLO.'},null,2)+'\n');
}
