import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {makeFlowDocument,spacingCases} from '../test/docx-paragraph-flow/fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'packages/renderers/word/package.json'));
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild');
const JSZip=require('jszip');
const ts=require('typescript');
const engine=path.dirname(require.resolve('@file-viewer/docx/package.json'));
const output=path.resolve(process.env.DOCX_FLOW_OUTPUT||path.join(root,'output/docx-paragraph-flow'));
await mkdir(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const checks=[],errors=[],external=[];
async function check(name,fn){try{await fn();checks.push({name,status:'pass'});console.log('PASS '+name)}catch(e){checks.push({name,status:'fail',error:String(e)});throw e}}
// Expose the actual owned renderer class for direct guard checks. This change
// exists only in the in-memory test bundle; installed files remain hash checked.
await build({entryPoints:[path.join(root,'test/docx-paragraph-flow/browser.ts')],outfile:path.join(output,'browser.js'),bundle:true,format:'iife',platform:'browser',logLevel:'warning',alias:{'@file-viewer/docx':path.join(engine,'dist/docx-preview.mjs')},plugins:[{name:'observe-owned-renderer',setup(b){
 b.onLoad({filter:/docx-preview\.mjs$/},async args=>{
  const source=await readFile(args.path,'utf8'),sf=ts.createSourceFile(args.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const found=[];
  function visit(n){if(ts.isClassExpression(n)&&n.members.some(m=>m.name?.getText(sf)==='performDynamicPagination'))found.push(n);ts.forEachChild(n,visit)}visit(sf);
  assert.equal(found.length,1,'Exactly one owned pagination class');const at=found[0].getStart(sf);
  return {contents:source.slice(0,at)+'globalThis.__flowReviewClass='+source.slice(at),loader:'js',resolveDir:path.dirname(args.path)};
 });
}}]});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
let original=null;
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
 await page.route('**/*',route=>/^https?:/.test(route.request().url())?route.abort():route.continue());
 await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1000px;height:900px;overflow:auto}#unit{position:absolute;top:0;left:0}</style><div id="host"></div><div id="unit"></div>');
 await page.addScriptTag({content:await readFile(path.join(output,'browser.js'),'utf8')});
 async function mount(bytes,{worker=false,paged=true}={}){
  await page.evaluate(async({data,worker,paged})=>{
   window.flowHandle?.unmount();document.getElementById('unit').replaceChildren();
   window.flowHandle=await paragraphFlow.renderFileViewerWordDoc(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,document.getElementById('host'),'docx',{filename:'neutral.docx',options:{docx:{worker,visualPagination:paged,workerUrl:worker?window.flowWorkerUrl:undefined,workerJsZipUrl:worker?window.flowZipUrl:undefined}}});
  },{data:Buffer.from(bytes).toString('base64'),worker,paged});
  if(paged)await page.waitForFunction(()=>document.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:120000});
 }
 async function inspect(){return page.evaluate(()=>({
  pageTexts:[...document.querySelectorAll('section.docx')].map(p=>[...p.querySelectorAll(':scope > article')].map(a=>a.textContent).join('')),
  pageBoxes:[...document.querySelectorAll('section.docx')].map(p=>{const b=p.getBoundingClientRect();return [b.width,b.height]}),
  footerTexts:[...document.querySelectorAll('section.docx > footer')].map(f=>f.textContent),
  rows:[...document.querySelectorAll('section.docx article tr')].map(r=>r.textContent),
  columns:[...document.querySelectorAll('section.docx > article')].map(a=>[a.style.columnCount,a.style.columnWidth]),
  negativeMargins:[...document.querySelectorAll('section.docx article p')].filter(p=>parseFloat(getComputedStyle(p).marginTop)<-1000||parseFloat(getComputedStyle(p).marginBottom)<-1000).length,
  images:[...document.querySelectorAll('section.docx article img')].map(i=>i.complete&&i.naturalWidth>0),
  frames:document.querySelectorAll('.docx-page-frame').length,
 }))}
 const gaps=await makeFlowDocument(JSZip,{kind:'spacing'});
 await mount(gaps,{paged:false});
 for(let i=0;i<spacingCases.length;i++)await check(`Real XML paragraph spacing precedence case ${i}`,async()=>{
  const actual=await page.evaluate(i=>{const p=[...document.querySelectorAll('article p')].find(p=>p.textContent==='GAP-'+i);return [p?.style.marginTop,p?.style.marginBottom]},i);
  const expected=await page.evaluate(values=>values.map((v,i)=>{const e=document.createElement('p');e.style[i?'marginBottom':'marginTop']=v;return e.style[i?'marginBottom':'marginTop']}),spacingCases[i].slice(1));
  assert.deepEqual(actual,expected);
 });
 const flow=await makeFlowDocument(JSZip);
 await mount(flow);const esm=await inspect();
 await check('Generated document retains all ordered paragraphs, cells and repeated footers',()=>{
  assert.ok(esm.pageTexts.length>1);assert.equal(esm.frames,esm.pageTexts.length);assert.equal(esm.negativeMargins,0);
  const text=esm.pageTexts.join('');assert.deepEqual([...text.matchAll(/FLOW-(\d{3})/g)].map(m=>Number(m[1])),Array.from({length:60},(_,i)=>i));
  assert.equal(esm.rows.length,8);for(let i=0;i<8;i++)assert.equal(esm.rows[i],`CELL-${i}-ACELL-${i}-B`);
  assert.equal(esm.footerTexts.length,esm.pageTexts.length);assert.ok(esm.footerTexts.every(t=>t==='NEUTRAL FOOTER'));
 });
 await check('Ordinary one-column sections do not introduce CSS column fragmentation',()=>assert.ok(esm.columns.every(c=>c[0]===''&&c[1]==='')));
 await page.locator('section.docx').first().screenshot({path:path.join(output,'generated.png')});
 for(const [name,columns,expected]of [
  ['multiple columns','<w:cols w:num="2" w:space="720"/>','2'],
  ['explicit single-column width','<w:cols w:num="1" w:equalWidth="0"><w:col w:w="4000" w:space="360"/></w:cols>','1'],
 ])await check(`Preserve authored ${name}`,async()=>{await mount(await makeFlowDocument(JSZip,{columns,count:2}),{paged:false});const r=await inspect();assert.equal(r.columns[0][0],expected);if(expected==='1')assert.ok(r.columns[0][1])});
 await page.evaluate(({worker,zip})=>{
  window.flowZipUrl=URL.createObjectURL(new Blob([zip],{type:'application/javascript'}));
  window.flowWorkerUrl=URL.createObjectURL(new Blob([worker],{type:'application/javascript'}));
  window.flowWorkerMessages=[];const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker {constructor(...args){super(...args);this.addEventListener('message',e=>flowWorkerMessages.push({type:e.data?.type,error:e.data?.error}))}};
 },{worker:await readFile(path.join(engine,'dist/docx-preview.worker.js'),'utf8'),zip:await readFile(require.resolve('jszip/dist/jszip.min.js'),'utf8')});
 await check('Actual Worker returns parsed and keeps main-thread pagination parity',async()=>{
  await mount(flow,{worker:true});const actual=await inspect();assert.deepEqual(actual,esm);
  const messages=await page.evaluate(()=>flowWorkerMessages);assert.ok(messages.some(m=>m.type==='parsed'));assert.ok(!messages.some(m=>m.error));
 });
 await check('Worker paragraph spacing matches the main-thread corrected result',async()=>{
  await mount(gaps,{worker:true,paged:false});
  const bad=await page.evaluate(()=>[...document.querySelectorAll('article p')].some(p=>/NaN|Infinity|-21474836/.test(p.style.cssText)));assert.equal(bad,false);
 });
 await check('CommonJS distribution retains corrected pagination content and boxes',async()=>{
  await page.evaluate(()=>{flowHandle.unmount();document.getElementById('host').replaceChildren()});
  await page.addScriptTag({content:await readFile(require.resolve('jszip/dist/jszip.min.js'),'utf8')});
  await page.addScriptTag({content:await readFile(path.join(engine,'dist/docx-preview.js'),'utf8')});
  await page.evaluate(async data=>{await window.docx.renderAsync(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,document.getElementById('host'),null,{useWorker:false,breakPages:true,fixedPageHeight:true,ignoreLastRenderedPageBreak:false});},Buffer.from(flow).toString('base64'));
  await page.waitForFunction(()=>document.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:30000});
  const actual=await inspect();assert.deepEqual(actual.pageTexts,esm.pageTexts);assert.deepEqual(actual.pageBoxes,esm.pageBoxes);assert.deepEqual(actual.rows,esm.rows);
 });
 const helper=await page.evaluate(()=>{
  const cases=[];const ok=(name,test)=>{if(!test)throw Error(name);cases.push(name)};
  const h=paragraphFlow.createHelper();h.options={};h.className='docx';
  function setup(){const unit=document.getElementById('unit');unit.innerHTML='<section id="source" style="height:100px;width:400px"><header><b>header</b></header><article data-kept="yes" style="display:block"><p style="height:180px;margin:0">FIRST</p><p style="height:20px;margin:0">SECOND</p><p style="height:20px;margin:0">THIRD</p></article><footer><i>footer</i></footer></section>';const p=unit.firstElementChild,a=p.querySelector('article'),n=h.createContinuationPage(p,false);return {p,a,n,next:n.querySelector('article')}}
  {const {p,a,n,next}=setup();ok('Shallow body clone retains shell and deeply copies header/footer',!n.isConnected&&next.childNodes.length===0&&next.dataset.kept==='yes'&&n.querySelector('header b').textContent==='header'&&n.querySelector('footer i').textContent==='footer'&&a.children.length===3);ok('Page clone removes ID and keeps dynamic marker',!n.id&&n.dataset.docxDynamicPage==='true');ok('Batch preserves order while retaining first block',h.moveOverflowingTail(a,p,next)&&a.textContent==='FIRST'&&next.textContent==='SECONDTHIRD')}
  {const {p,a,next}=setup();a.children[0].dataset.docxKeepNext='true';ok('Keep-next chain crossing page boundary cannot be batched',!h.moveOverflowingTail(a,p,next)&&a.children.length===3)}
  {const {p,a,next}=setup();a.children[1].dataset.docxKeepNext='true';ok('Wholly overflowing keep-next group moves together',h.moveOverflowingTail(a,p,next)&&next.children.length===2)}
  for(const [name,style]of [['negative margins','margin-top:-5px'],['positioned blocks','position:relative'],['floated blocks','float:left'],['transformed blocks','transform:translateX(2px)'],['cleared blocks','clear:both'],['vertical writing','writing-mode:vertical-rl']]){const {p,a,next}=setup();a.lastElementChild.style.cssText+=';'+style;ok('Unsafe '+name+' uses existing fallback',!h.moveOverflowingTail(a,p,next))}
  {const {p,a,next}=setup();a.style.columnCount='2';ok('Column fragmentation uses existing fallback',!h.moveOverflowingTail(a,p,next))}
  {const {p,a,next}=setup();a.lastElementChild.innerHTML='<span data-docx-float="true">THIRD</span>';ok('Embedded floating drawing uses existing fallback',!h.moveOverflowingTail(a,p,next))}
  {const {p,a,next}=setup();a.removeChild(a.lastElementChild);ok('Single-tail transfer uses existing fallback',!h.moveOverflowingTail(a,p,next))}
  document.getElementById('unit').replaceChildren();return cases;
 });
 for(const name of helper)await check(name,()=>{});
 await check('All five shipped entries match content-addressed distribution outputs',async()=>{
  const pins=JSON.parse(await readFile(path.join(root,'patches/docx-engine-compatibility.json'),'utf8'));
  for(const [name,expected]of Object.entries(pins.sha256))assert.equal(hash(await readFile(path.join(engine,'dist',name))),expected,name);
 });
 if(process.env.DOCX_FLOW_ORIGINAL){
  const bytes=await readFile(process.env.DOCX_FLOW_ORIGINAL);assert.equal(hash(bytes),'74c3da195b8afaa638124e4fef5440193a811aa2180820411c1cb4b2ebbc6d61');
  const originalZip=await JSZip.loadAsync(bytes);
  const sourceXml=await originalZip.file('word/document.xml').async('string');
  const expectedBody=await page.evaluate(xml=>{const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';const d=new DOMParser().parseFromString(xml,'application/xml');return [...d.getElementsByTagNameNS(ns,'body')[0].getElementsByTagNameNS(ns,'t')].map(t=>t.textContent).join('')},sourceXml);
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const before=await cdp.send('Performance.getMetrics');const start=performance.now();
  await mount(bytes);const r=await inspect();const ms=performance.now()-start;const after=await cdp.send('Performance.getMetrics');
  const counters=Object.fromEntries(after.metrics.filter(m=>/Layout|RecalcStyle|TaskDuration/.test(m.name)).map(m=>[m.name,m.value-(before.metrics.find(b=>b.name===m.name)?.value||0)]));
  await check('C022 original has finite paragraph gaps and all 87 table rows',()=>{assert.equal(r.negativeMargins,0);assert.equal(r.rows.length,87);assert.equal(expectedBody.length,30769);assert.ok(r.pageTexts.join('')===expectedBody,'Exact original body content, without whitespace normalization');assert.ok(r.pageTexts.length>1);assert.equal(r.frames,r.pageTexts.length);assert.equal(r.footerTexts.length,r.pageTexts.length);assert.ok(r.images.every(Boolean))});
  original={id:'C022',sha256:hash(bytes),sourceCharacters:expectedBody.length,exactOriginalBody:true,pages:r.pageTexts.length,tableRows:r.rows.length,footerCount:r.footerTexts.length,bodySha256:hash(r.pageTexts.join('')),pageSha256:r.pageTexts.map(hash),pageBoxes:r.pageBoxes,elapsedMs:ms,performance:counters};
 }
 await check('Disposal and offline rendering produce no unhandled errors or remote requests',async()=>{
  await page.evaluate(()=>{window.flowHandle?.unmount();URL.revokeObjectURL(flowZipUrl);URL.revokeObjectURL(flowWorkerUrl)});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 });
}finally{
 await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({checks,passed:checks.filter(c=>c.status==='pass').length,original,errors,external,scope:'Pinned parser and actual browser/Worker behavior; optional original bytes. No Office page-count or universal performance claim.'},null,2)+'\n');
}
