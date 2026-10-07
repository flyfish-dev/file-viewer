import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createPdfReviewHarness } from './pdf-review-harness.mjs';
const require=createRequire(import.meta.url);
const {PDFDocument,rgb}=require('pdf-lib');
const pdf=await PDFDocument.create();
for(let n=0;n<3;n++){const p=pdf.addPage([600,800]);p.drawRectangle({x:50,y:200,width:300,height:300,color:rgb(.1,.4,.8)});p.drawText(`Viewport regression ${n+1}`,{x:50,y:650});}
const output=path.resolve(process.env.PDF_VIEWPORT_EVIDENCE_DIR||'output/pdf-viewport-lifecycle');
const h=await createPdfReviewHarness({output,fixtures:new Map([['synthetic.pdf',Buffer.from(await pdf.save())]])});
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,status:'pass'});console.log('PASS '+name);}catch(e){checks.push({name,status:'fail',error:String(e)});throw e;}}
try{
 const p=await h.newPage();
 await check('Initial fit stays pending while its actual container is hidden',async()=>{
  await h.mount(p,{hidden:true});
  const result=await p.evaluate(()=>provider.fit({mode:'width',resize:'initial',source:'api',viewportWidth:1100,viewportHeight:800,padding:0}));
  assert.equal(result.applied,false);assert.equal(result.reason,'pending');
 });
 await check('Revealing the container completes pending initial fit using the actual viewport',async()=>{
  await p.evaluate(()=>document.getElementById('host').style.display='block');
  await p.waitForFunction(()=>Math.abs(provider.getState().scale-(document.querySelector('.pdf-wrapper').clientWidth-46)/800)<.006,null,{timeout:5000});
  const metrics=await p.evaluate(()=>({state:provider.getState(),width:document.querySelector('.pdf-wrapper').clientWidth,page:document.querySelector('.pdfViewer .page').getBoundingClientRect().width}));
  assert.ok(metrics.page<=metrics.width+1);assert.ok(metrics.page>metrics.width*.8);
  await writeFile(path.join(output,'revealed.json'),JSON.stringify(metrics,null,2)+'\n');
  await p.screenshot({path:path.join(output,'revealed.png')});
 });
 await check('A completed initial-only fit does not override later user-selected viewport changes',async()=>{
  const scale=await p.evaluate(()=>provider.getState().scale);
  await p.evaluate(()=>document.getElementById('host').style.width='480px');await p.waitForTimeout(150);
  assert.equal(await p.evaluate(()=>provider.getState().scale),scale);
 });
 await check('Manual zoom cancels a pending initial fit before reveal',async()=>{
  await h.mount(p,{hidden:true});
  await p.evaluate(async()=>{await provider.fit({mode:'width',resize:'initial',source:'api',padding:0});await provider.applyState({scale:.8});document.getElementById('host').style.display='block';});
  await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>provider.getState().scale),.8);
 });
 await check('Latest pending fit mode and padding win over an earlier hidden request',async()=>{
  await h.mount(p,{hidden:true});
  await p.evaluate(async()=>{await provider.fit({mode:'width',resize:'initial',source:'api'});await provider.fit({mode:'page',resize:'initial',source:'api',padding:12});document.getElementById('host').style.display='block';});
  await p.waitForFunction(()=>provider.getState().scale<.5,null,{timeout:5000});
  const m=await p.evaluate(()=>({s:provider.getState().scale,h:document.querySelector('.pdf-wrapper').clientHeight}));
  assert.ok(Math.abs(m.s-(m.h-24-18)/(800*4/3))<.006);
 });
 await check('Default width-fit follows narrow and wide dialog layout changes',async()=>{
  await h.mount(p,{hidden:true});
  for(const width of [420,920,620]){
   await p.evaluate(w=>{const host=document.getElementById('host');host.style.width=w+'px';host.style.display='block';},width);
   await p.waitForFunction(w=>Math.abs(provider.getState().scale-(w-46)/800)<.006,width,{timeout:5000});
  }
 });
 await check('Explicit always-fit remains responsive after reveal',async()=>{
  await h.mount(p,{hidden:true});
  await p.evaluate(async()=>{await provider.fit({mode:'width',resize:'always',source:'api'});document.getElementById('host').style.display='block';});
  await p.waitForTimeout(100);
  await p.evaluate(()=>document.getElementById('host').style.width='500px');
  await p.waitForFunction(()=>Math.abs(provider.getState().scale-(500-46)/800)<.006,null,{timeout:5000});
 });
 await check('Disposal cancels deferred fits and releases registered providers',async()=>{
  await h.mount(p,{hidden:true});
  await p.evaluate(async()=>{await provider.fit({mode:'width',resize:'initial',source:'api'});instance.unmount();document.getElementById('host').style.display='block';});
  await p.waitForTimeout(100);
  assert.equal(await p.evaluate(()=>document.querySelectorAll('.pdf-shell').length),0);assert.deepEqual(h.errors,[]);
 });
 if(process.env.PDF_REVIEW_IN_MEMORY!=='1')await check('Server mode uses a real PDF Worker without external requests',()=>{
  assert.ok(h.workers.some(u=>u.endsWith('pdf.worker.mjs')));assert.deepEqual(h.external,[]);
 });
 await p.close();
}finally{
 await h.close();await writeFile(path.join(output,'report.json'),JSON.stringify({transport:process.env.PDF_REVIEW_IN_MEMORY==='1'?'in-memory; HTTP and real Worker not certified':'local-server',passed:checks.filter(x=>x.status==='pass').length,checks,errors:h.errors,external:h.external,workers:h.workers},null,2)+'\n');
}
