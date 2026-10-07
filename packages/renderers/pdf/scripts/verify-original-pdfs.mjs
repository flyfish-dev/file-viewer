import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createPdfReviewHarness } from './pdf-review-harness.mjs';

// Byte identities and expected page counts, not filenames, control acceptance.
const corpus = [
 ['C020','d4fbb2af8f4635b7c573195ea7270ab825bb60f8828aa517198a0ecbe79030ab',3],
 ['C021','a2f4535c6e092e984ab96641938b7d710d2f9dc151eea529eddd01f25c353cca',7],
 ['C023','9c4f76d09fadc48d0ee21137de4f42e5b4dc2706e9b78eed8e4adae0261235e4',1],
 ['C026','3e6749434d0fbb8ba5d646bf24abc1bdeba8319437e76883474a7399f0c34c0f',1],
 ['C028','2f253d5a1064e5ca97bc70ce1e38caa84c649aa09b999cf1a1f1a055b33eeae4',50],
 ['C047','b158fee6494e550b1df8367776700aaee16683a8d3abaf5bd53ee238b61d0dde',1],
];
assert.ok(process.env.PDF_CORPUS_DIR,'Set PDF_CORPUS_DIR to a local directory containing neutral Cxxx.pdf originals.');
assert.notEqual(process.env.PDF_REVIEW_IN_MEMORY,'1','Original HTTP/Worker acceptance requires server mode.');
const fixtures=new Map();
for(const [id,sha] of corpus){const bytes=await readFile(path.join(process.env.PDF_CORPUS_DIR,id+'.pdf'));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,id);fixtures.set(id+'.pdf',bytes);}
const output=path.resolve(process.env.PDF_ORIGINAL_EVIDENCE_DIR||'output/pdf-original-review');
const h=await createPdfReviewHarness({output,fixtures});
const checks=[],documents=[];
async function check(name,fn){try{await fn();checks.push({name,status:'pass'});console.log('PASS '+name);}catch(e){checks.push({name,status:'fail',error:String(e)});throw e;}}
try{
 for(const dpr of [1,2]){
  const p=await h.newPage({width:1100,height:820,dpr});
  for(const [id,sha,count] of corpus){
   await check(`${id} DPR ${dpr}: all ${count} pages render with native geometry and a single content scroller`,async()=>{
    await h.mount(p,{id:id+'.pdf',width:920,height:720});
    assert.equal(await p.evaluate(()=>provider.getState().pageCount),count);
    await p.evaluate(async({id,assets})=>{
      const bytes=await(await fetch('/fixtures/'+id+'.pdf')).arrayBuffer();
      const task=pdfReview.getDocument({data:bytes,cMapUrl:assets.cMapUrl,cMapPacked:true,wasmUrl:assets.wasmUrl,standardFontDataUrl:assets.standardFontDataUrl});
      window.referenceDocument=await task.promise;
    },{id,assets:h.assets});
    const pages=[];
    for(let n=1;n<=count;n++){
     await p.evaluate(n=>provider.applyState({page:n}),n);
     await p.waitForFunction(n=>{
      const el=document.querySelector(`.pdfViewer .page[data-page-number="${n}"]`),c=el?.querySelector('canvas');
      // Completion is a lifecycle condition, not an ink requirement: a valid
      // authored blank page must remain blank rather than time out.
      return c?.width>10&&el.dataset.loaded==='true'&&!el.classList.contains('loadingIcon');
     },n,{timeout:30000});
     await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     const metrics=await p.evaluate(async n=>{
      const el=document.querySelector(`.pdfViewer .page[data-page-number="${n}"]`),canvas=el.querySelector('canvas');
      const page=await referenceDocument.getPage(n),state=provider.getState();
      const viewport=page.getViewport({scale:state.scale*pdfReview.PixelsPerInch.PDF_TO_CSS_UNITS,rotation:(page.rotate+state.rotation)%360});
      const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
      await page.render({canvasContext:reference.getContext('2d'),viewport,transform:[canvas.width/viewport.width,0,0,canvas.height/viewport.height,0,0]}).promise;
      function thumbnail(source){const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,160,160);x.drawImage(source,0,0,160,160);return x.getImageData(0,0,160,160).data;}
      const a=thumbnail(canvas),b=thumbnail(reference);let delta=0,ink=0,referenceInk=0;
      for(let i=0;i<a.length;i+=4){for(let j=0;j<3;j++)delta+=Math.abs(a[i+j]-b[i+j]);if(Math.min(a[i],a[i+1],a[i+2])<220)ink++;if(Math.min(b[i],b[i+1],b[i+2])<220)referenceInk++;}
      const rect=canvas.getBoundingClientRect(),host=document.getElementById('host'),shell=host.querySelector('.pdf-shell'),wrap=host.querySelector('.pdf-wrapper');
      return {page:n,rotation:page.rotate,sourceBox:page.view,viewport:[viewport.width,viewport.height],canvas:[canvas.width,canvas.height],css:[rect.width,rect.height],inkPixels:ink,referenceInkPixels:referenceInk,thumbnailMeanError:delta/(160*160*3*255),hostOverflow:host.scrollHeight-host.clientHeight,shellOverflow:shell.scrollHeight-shell.clientHeight,wrapperWidth:wrap.clientWidth,pageWidth:el.getBoundingClientRect().width};
     },n);
     if(metrics.referenceInkPixels>5)assert.ok(metrics.inkPixels>5,`${id} page ${n}: missing authored ink`);
     else assert.ok(Math.abs(metrics.inkPixels-metrics.referenceInkPixels)<=5,`${id} page ${n}: authored blank page changed`);
     assert.ok(Math.abs(metrics.css[0]/metrics.css[1]-metrics.viewport[0]/metrics.viewport[1])<.006,`${id} page ${n}: stretched page`);
     assert.ok(metrics.canvas[0]>=metrics.css[0]*dpr-3,`${id} page ${n}: insufficient horizontal backing resolution`);
     assert.ok(metrics.canvas[1]>=metrics.css[1]*dpr-3,`${id} page ${n}: insufficient vertical backing resolution`);
     assert.ok(metrics.thumbnailMeanError<.025,`${id} page ${n}: rendering differs from native PDF.js ${metrics.thumbnailMeanError}`);
     assert.ok(metrics.hostOverflow<=1&&metrics.shellOverflow<=1,`${id} page ${n}: duplicate vertical content scroller`);
     pages.push(metrics);
     if(n===1&&dpr===2)await p.screenshot({path:path.join(output,id+'.png')});
    }
    await p.evaluate(async()=>{await referenceDocument.destroy();window.referenceDocument=null;instance.unmount();});
    documents.push({id,sha256:sha,dpr,pageCount:count,pages});
   });
  }
  await p.close();
 }
 const p=await h.newPage();
 await check('C026 original: hidden initial fit completes after dialog reveal',async()=>{
  await h.mount(p,{id:'C026.pdf',hidden:true,width:620,height:520});
  const result=await p.evaluate(()=>provider.fit({mode:'width',resize:'initial',source:'api',viewportWidth:1100,viewportHeight:820}));
  assert.equal(result.applied,false);assert.equal(result.reason,'pending');
  await p.evaluate(()=>document.getElementById('host').style.display='block');
  await p.waitForFunction(()=>{const wrap=document.querySelector('.pdf-wrapper'),page=wrap.querySelector('.page');return page?.getBoundingClientRect().width<wrap.clientWidth&&provider.getState().scale<1;},null,{timeout:10000});
  await p.screenshot({path:path.join(output,'C026-dialog.png')});
 });
 await check('Protected same-origin PDF URL preserves browser Referer',async()=>{
  await h.mount(p,{id:'C026.pdf?protected=1',stream:true});
  const sent=h.requests.filter(r=>r.path==='/fixtures/C026.pdf');
  assert.ok(sent.some(r=>r.referer===h.origin+'/'&&r.status===200));
  assert.equal(await p.evaluate(()=>provider.getState().pageCount),1);
 });
 await check('Host no-referrer policy remains authoritative and 403 is not bypassed',async()=>{
  const q=await h.newPage({route:'/no-referrer'});
  await q.evaluate(async assets=>{window.instance=await pdfReview.renderPdf(new ArrayBuffer(0),document.getElementById('host'),{filename:'C026.pdf',streamUrl:'/fixtures/C026.pdf?protected=1',options:{pdf:{...assets,navigation:false}}});},h.assets);
  await q.waitForFunction(()=>document.querySelector('.pdf-state')?.textContent.includes('403'),null,{timeout:10000});
  assert.ok(h.requests.some(r=>r.path==='/fixtures/C026.pdf'&&r.status===403&&r.referer===''));
  await q.evaluate(()=>instance.unmount());await q.close();
 });
 await p.close();
 await check('All originals use local PDF runtime without missing assets or unhandled browser errors',()=>{
  assert.ok(h.workers.some(u=>u.endsWith('pdf.worker.mjs')));assert.deepEqual(h.external,[]);assert.deepEqual(h.errors,[]);
  assert.deepEqual(h.requests.filter(r=>r.status>=400&&r.status!==403),[]);
 });
}finally{
 await h.close();
 await writeFile(path.join(output,'report.json'),JSON.stringify({passed:checks.filter(c=>c.status==='pass').length,checks,documents,workerCount:h.workers.length,errors:h.errors,external:h.external,requests:h.requests.map(({path,status,referer,range})=>({path,status,hasReferer:!!referer,range})),scope:'Six hash-pinned PDFs; all pages at DPR 1/2, native thumbnail raster comparison, hidden initial fit and controlled same-origin Referer. Not iOS/App WebView acceptance.'},null,2)+'\n');
}
