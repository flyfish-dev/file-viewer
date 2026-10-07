/** Original files are optional, read-only and never copied into evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import JSZip from 'jszip';
import {makePresentation} from '../../../../test/compatibility-review/fixtures.mjs';
import {getTextBodyMetrics} from '../src/engine/support/text-body.js';
const root=path.resolve(import.meta.dirname,'../../../..');
const pkg=path.join(root,'packages/renderers/pptx');
const out=path.resolve(process.env.PPTX_TEXT_OUTPUT||'output/pptx-text-body');
await fs.mkdir(out,{recursive:true});
const checks=[],originals=[],errors=[];
const check=async(name,f)=>{try{await f();checks.push({name,status:'pass'});console.log('PASS',name)}catch(e){checks.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message)}};
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<0.02,`${a} != ${b}`);
const body=(attrs={},mode)=>({'a:bodyPr':{attrs,...(mode||{})}});
await check('Default and explicit-zero inset values',()=>{const a=getTextBodyMetrics();assert.equal(a.left,91440);assert.equal(a.top,45720);assert.equal(getTextBodyMetrics(body({lIns:'0'})).left,0)});
await check('Per-attribute body inheritance and invalid coordinate protection',()=>{const a=getTextBodyMetrics(body({lIns:'0'}),body({rIns:'190500'}));assert.equal(a.right,190500);assert.equal(a.left,0);assert.equal(getTextBodyMetrics(body({lIns:'NaN',rIns:'1e300'})).left,91440)});
await check('AutoFit modes, percentages and malformed factors',()=>{assert.equal(getTextBodyMetrics(body({}, {'a:spAutoFit':{}})).autofit,'shape');near(getTextBodyMetrics(body({}, {'a:normAutofit':{attrs:{fontScale:'87500'}}})).fontScale,.875);near(getTextBodyMetrics(body({}, {'a:normAutofit':{attrs:{fontScale:'87.5%'}}})).fontScale,.875);assert.equal(getTextBodyMetrics(body({}, {'a:noAutofit':{}}),body({}, {'a:normAutofit':{}})).autofit,'none');assert.equal(getTextBodyMetrics(body({}, {'a:normAutofit':{attrs:{fontScale:'Infinity'}}})).fontScale,1)});
const A='http://schemas.openxmlformats.org/drawingml/2006/main',P='http://schemas.openxmlformats.org/presentationml/2006/main';
const r=t=>`<a:r><a:rPr sz="900" baseline="0"/><a:t>${t}</a:t></a:r>`;
const shape=(id,x,y,w,h,attrs,mode,text)=>`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Fixture ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x*9525}" y="${y*9525}"/><a:ext cx="${w*9525}" cy="${h*9525}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr ${attrs}>${mode}</a:bodyPr><a:lstStyle/><a:p>${r(text)}</a:p></p:txBody></p:sp>`;
const zip=await JSZip.loadAsync(await makePresentation(JSZip));
zip.file('ppt/slides/slide1.xml',`<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
${shape(2,30,30,250,90,'lIns="190500" rIns="95250" tIns="47625" bIns="0" wrap="square"','<a:noAutofit/>','Text inset geometry')}
${shape(3,30,150,100,14,'lIns="0" rIns="0" tIns="0" bIns="0" wrap="square"','<a:spAutoFit/>','Preserve authored nine point text despite constrained height')}
${shape(4,30,210,250,60,'lIns="0" rIns="0" tIns="0" bIns="0"','<a:normAutofit fontScale="87500"/>','Fractional normal AutoFit')}
${shape(5,30,290,90,50,'lIns="0" rIns="0" tIns="0" bIns="0" wrap="none"','<a:noAutofit/>','No wrap keeps a single authored text line')}
</p:spTree></p:cSld></p:sld>`);
const fixture=await zip.generateAsync({type:'nodebuffer'});await fs.writeFile(path.join(out,'generated.pptx'),fixture);
const bundle=await build({stdin:{resolveDir:pkg,contents:`
import process from './src/engine/process.js';
import {createDefaultPptxOptions} from './src/options.ts';
import {pptxViewerCss} from './src/styles.ts';
import {renderPptxPostProcessing} from './src/chart.ts';
import {sanitizePptxMarkup,sanitizePptxCss} from './src/sanitize.ts';
import {PptxViewer} from './src/viewer.ts';
window.review={process,createDefaultPptxOptions,pptxViewerCss,renderPptxPostProcessing,sanitizePptxMarkup,sanitizePptxCss,PptxViewer};
`},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'warning'});
const worker=await fs.readFile(process.env.PPTX_TEXT_WORKER||path.join(pkg,'dist/worker/pptx.worker.js'),'utf8');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox']});
try{
for(const dpr of [1,2]){
 const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:dpr});page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,route=>route.abort());
 await page.setContent('<!doctype html><style>body{margin:0}</style><div id="root" class="flyfish-pptx-content"></div>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 async function mount(bytes){return page.evaluate(async({data,worker})=>{
  window.handle?.destroy();root.replaceChildren();document.querySelectorAll('style[data-runtime]').forEach(s=>s.remove());
  const messages=[],wurl=URL.createObjectURL(new Blob([worker],{type:'text/javascript'})),w=new Worker(wurl);let timer;
  try{await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Worker timeout')),45000);w.onmessage=e=>{messages.push(e.data);if(e.data.type==='ExecutionTime')resolve();if(/error/i.test(e.data.type))reject(Error(JSON.stringify(e.data)))};w.onerror=e=>reject(Error(e.message));w.postMessage({type:'processPPTX',data:Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,options:review.createDefaultPptxOptions()})})}finally{clearTimeout(timer);w.terminate();URL.revokeObjectURL(wurl)}
  const st=document.createElement('style');st.dataset.runtime='true';st.textContent=review.pptxViewerCss+review.sanitizePptxCss(document,messages.find(m=>m.type==='globalCSS')?.data||'');document.head.append(st);
  messages.filter(m=>m.type==='slide').forEach(m=>root.append(review.sanitizePptxMarkup(document,m.data)));
  await document.fonts.ready;window.handle=await review.renderPptxPostProcessing(null,root);await new Promise(r=>requestAnimationFrame(r));
  return root.querySelectorAll('.slide').length;
 },{data:bytes.toString('base64'),worker})}
 await mount(fixture);if(dpr===1)await fs.writeFile(path.join(out,'generated.html'),await page.locator('#root').innerHTML());
 const geom=await page.evaluate(()=>[...root.querySelectorAll('.slide:first-child div.block[data-pptx-autofit]')].filter(b=>b.querySelector('.text-block')).map(b=>{const s=getComputedStyle(b),p=b.querySelector('.slide-prgrph');return{id:b.textContent.startsWith('Text inset')?'2':b.textContent.startsWith('Preserve authored')?'3':b.textContent.startsWith('Fractional')?'4':b.textContent.startsWith('No wrap')?'5':'other',font:parseFloat(getComputedStyle(b.querySelector('.text-block')).fontSize),padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].map(parseFloat),width:b.clientWidth,pWidth:p?.getBoundingClientRect().width,wrap:getComputedStyle(p.firstElementChild).whiteSpace,mode:b.dataset.pptxAutofit,scale:b.dataset.pptxTextFitScale}}));
 const get=id=>geom.find(g=>g.id===String(id));
 await check(`DPR ${dpr}: Insets reduce the paragraph's effective width without resizing its shape`,()=>{assert.deepEqual(get(2).padding,[5,10,0,20]);near(get(2).pWidth,220);near(get(2).width,250)});
 await check(`DPR ${dpr}: Shape AutoFit cannot silently shrink authored 9pt text`,()=>{near(get(3).font,12);assert.equal(get(3).scale,undefined)});
 await check(`DPR ${dpr}: Normal AutoFit preserves fractional fontScale and baseline zero`,()=>near(get(4).font,10.5));
 await check(`DPR ${dpr}: Explicit no-wrap survives sanitizer and layout`,()=>assert.equal(get(5).wrap,'nowrap'));
 await check(`DPR ${dpr}: Repeated postprocessing is idempotent`,async()=>{const old=await page.locator('#root').textContent();await page.evaluate(async()=>{handle.destroy();handle=await review.renderPptxPostProcessing(null,root)});assert.equal(await page.locator('#root').textContent(),old);near(await page.locator('[data-pptx-autofit="shape"] .text-block').filter({hasText:'Preserve authored'}).first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),12)});
 if(dpr===1) await page.screenshot({path:path.join(out,'generated.png')});
 for(const [id,digest] of [['C049','49f14b34e7d5b1ce7c29de55dd64a726acdea3d6dcb4b10489fb973a8446c34b'],['C050','5a178b6c5dc63976ae4a133eaff14927ac40320609073b6e836ee7b814b1e685']]){
  if(!process.env.PPTX_TEXT_ORIGINALS)continue;
  const bytes=await fs.readFile(path.join(process.env.PPTX_TEXT_ORIGINALS,id+'.pptx'));assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);
  const z=await JSZip.loadAsync(bytes),xml=await z.file('ppt/slides/slide1.xml').async('string');await mount(bytes);
  const result=await page.evaluate(xml=>{const doc=new DOMParser().parseFromString(xml,'application/xml'),P='http://schemas.openxmlformats.org/presentationml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main';const report=[],insets=[];let declared9ptRuns=0;
   for(const sp of doc.getElementsByTagNameNS(P,'sp')){const id=sp.getElementsByTagNameNS(P,'cNvPr')[0]?.getAttribute('id');const b=[...root.querySelectorAll('.slide')][0]?.querySelector('div.block');if(!b)continue;const text=sp.getElementsByTagNameNS(P,'txBody')[0];if(!text)continue;const pr=text.getElementsByTagNameNS(A,'bodyPr')[0];if(!pr?.getElementsByTagNameNS(A,'spAutoFit').length)continue;
   const sampleRun=text.getElementsByTagNameNS(A,'t')[0]?.textContent;const measured=[...root.querySelectorAll('.slide')][0]?.querySelectorAll('.text-block');const match=[...measured].find(e=>e.textContent===sampleRun)?.closest('div.block');if(match){const st=getComputedStyle(match),factor=1/9525;insets.push({expected:['tIns','rIns','bIns','lIns'].map((n,i)=>Number(pr.getAttribute(n)??(i%2?91440:45720))*factor),actual:[st.paddingTop,st.paddingRight,st.paddingBottom,st.paddingLeft].map(parseFloat),paragraphWidth:match.querySelector('.slide-prgrph')?.getBoundingClientRect().width,contentWidth:parseFloat(st.width)-parseFloat(st.paddingLeft)-parseFloat(st.paddingRight)});}
   const orig=[...text.getElementsByTagNameNS(A,'r')].filter(r=>r.getElementsByTagNameNS(A,'rPr')[0]?.getAttribute('sz')==='900');declared9ptRuns+=orig.length; const actual=[...root.querySelectorAll('.slide')][0].querySelectorAll('.text-block');
   for(const r of orig){const t=r.getElementsByTagNameNS(A,'t')[0]?.textContent;const candidates=[...actual].filter(e=>e.textContent===t);if(candidates.length)for(const el of candidates)report.push({size:parseFloat(getComputedStyle(el).fontSize),mode:el.closest('[data-pptx-autofit]')?.dataset.pptxAutofit});}
  }return {fonts:report,declared9ptRuns,insets,slides:root.querySelectorAll('.slide').length,invalid:[...root.querySelectorAll('[style]')].filter(e=>/NaN|Infinity/.test(e.getAttribute('style'))).length};},xml);
  await check(`DPR ${dpr}: ${id} original typography remains authored after postprocessing`,()=>{if(id==='C049'){assert.equal(result.declared9ptRuns,9);assert.equal(result.fonts.length,result.declared9ptRuns);result.fonts.forEach(f=>near(f.size,12))}if(id==='C050'){assert.equal(result.insets.length,2);for(const box of result.insets){box.expected.forEach((v,i)=>near(box.actual[i],v));near(box.paragraphWidth,box.contentWidth)}}assert.ok(result.slides>0);assert.equal(result.invalid,0)});
  originals.push({id,sha256:digest,dpr,matched9ptRuns:result.fonts.length,insets:result.insets,slides:result.slides});
 }
 await check(`DPR ${dpr}: Public viewer retains metrics using the production Worker and releases its DOM`,async()=>{
  const result=await page.evaluate(async({bytes,worker})=>{
   window.handle?.destroy();root.replaceChildren();const url=URL.createObjectURL(new Blob([worker],{type:'text/javascript'}));let viewer,timer;
   try{let done,fail;const complete=new Promise((resolve,reject)=>{done=resolve;fail=reject});
    viewer=await review.PptxViewer.open(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,root,{fitMode:'none',lazySlides:false,workerFactory:()=>new Worker(url),onError:fail,onSlideError:(_,e)=>fail(e),onRenderComplete:done});
    await Promise.race([complete,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Public viewer timeout')),30000)})]);
    const t=[...root.querySelectorAll('.text-block')].find(e=>e.textContent.startsWith('Preserve authored'));
    const box=[...root.querySelectorAll('div.block')].find(e=>e.textContent==='Text inset geometry');
    return {font:parseFloat(getComputedStyle(t).fontSize),left:parseFloat(getComputedStyle(box).paddingLeft),count:viewer.slideCount};
   }finally{clearTimeout(timer);viewer?.destroy();URL.revokeObjectURL(url)}
  },{bytes:fixture.toString('base64'),worker});near(result.font,12);near(result.left,20);assert.equal(result.count,3);assert.equal(await page.locator('#root .flyfish-pptx-content').count(),0);
 });
 await page.close();
}
await check('No unhandled browser exceptions',()=>assert.deepEqual(errors,[]));
}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors},null,2)+'\n')}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
