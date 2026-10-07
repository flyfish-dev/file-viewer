/**
 * Explicit tabs: numeric geometry plus the actual Word renderer/OOXML parser.
 * Inputs are local and hash-pinned. Reports never include original body text.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { chromium } from 'playwright';
const root=path.resolve(import.meta.dirname,'../../../..');
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild');
const output=path.resolve(process.env.WORD_TABS_OUTPUT||path.join(root,'output/word-explicit-tabs'));
await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`
import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';
import {layoutDocxExplicitTabs} from './packages/renderers/word/src/docxTabs.ts';
import {findFileViewerZoomProvider} from './packages/core/src/index.ts';
window.review={renderFileViewerWordDoc,layoutDocxExplicitTabs,findFileViewerZoomProvider};`,resolveDir:root,loader:'ts'},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'silent'});
const sha=b=>createHash('sha256').update(b).digest('hex'), checks=[], originals=[], errors=[], requests=[];
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const run=s=>`<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`, tab='<w:r><w:tab/></w:r>';
function para(label,align='right',tail='Suffix',stop=6000,props=''){
 return `<w:p><w:pPr><w:tabs><w:tab w:val="${align}" w:pos="${stop}"/></w:tabs>${props}</w:pPr>${run(label)}${tab}${run(tail)}</w:p>`;
}
async function generated(){
 const z=new JSZip(), types='http://schemas.openxmlformats.org/package/2006/content-types', rel='http://schemas.openxmlformats.org/package/2006/relationships';
 z.file('[Content_Types].xml',`<Types xmlns="${types}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
 z.file('_rels/.rels',`<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
 z.file('word/_rels/document.xml.rels',`<Relationships xmlns="${rel}"><Relationship Id="s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
 z.file('word/styles.xml',`<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`);
 let body=para('right','right')+para('left','left')+para('center','center')+
 para('break','right','Before') .replace('</w:p>',`<w:r><w:br/></w:r>${run('After line break must not participate')}</w:p>`)+
 para('trailing','right','')+
 `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="2400"/><w:tab w:val="right" w:pos="6000"/></w:tabs></w:pPr>${run('multiple')}${tab}${run('Middle')}${tab}${run('End')}</w:p>`+
 para('framed','right','End',8500,'<w:framePr w:w="8500" w:h="0" w:hAnchor="margin" w:xAlign="center"/>')+
 `<w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="9000"/><w:tblCellMar><w:left w:type="dxa" w:w="200"/><w:right w:type="dxa" w:w="200"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="9000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:type="dxa" w:w="9000"/></w:tcPr>${para('cell','right','CellEnd')}</w:tc></w:tr></w:tbl>`;
 z.file('word/document.xml',`<w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:bottom="720" w:left="720" w:right="720"/></w:sectPr></w:body></w:document>`);
 return z.generateAsync({type:'nodebuffer'});
}
async function check(name,fn){try{const detail=await fn();checks.push({name,status:'pass',...detail});console.log('PASS',name)}catch(e){checks.push({name,status:'fail',error:e.message.slice(0,500)});console.log('FAIL',name,e.message)}}
function launch(){return chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.WORD_TABS_CHROME_ARGS?JSON.parse(process.env.WORD_TABS_CHROME_ARGS):[]})}
async function measure(page){return page.evaluate(()=>{
 const px=s=>parseFloat(s)||0;
 return [...host.querySelectorAll('[data-docx-tab][data-docx-tab-pos]')].map(t=>{
  const p=t.closest('p'),st=getComputedStyle(p),b=p.getBoundingClientRect(),width=px(st.width)+(st.boxSizing==='border-box'?0:px(st.paddingLeft)+px(st.paddingRight)+px(st.borderLeftWidth)+px(st.borderRightWidth)),scale=b.width/width;
  const r=document.createRange();r.setStartAfter(t);let end=t.nextElementSibling;while(end&&end.tagName!=='BR'&&!end.matches('[data-docx-tab]'))end=end.nextElementSibling;if(end)r.setEndBefore(end);else r.setEnd(p,p.childNodes.length);
  const rs=[...r.getClientRects()].filter(b=>b.width>0);const left=rs.length?Math.min(...rs.map(b=>b.left)):t.getBoundingClientRect().right,right=rs.length?Math.max(...rs.map(b=>b.right)):left;
  const at=t.dataset.docxTabAlign==='right'?right:t.dataset.docxTabAlign==='center'?(left+right)/2:left;
  const pos=parseFloat(t.dataset.docxTabPos)*4/3,origin=b.left+(px(st.borderLeftWidth)+px(st.paddingLeft))*scale;
  return {align:t.dataset.docxTabAlign,pos,gap:px(t.style.width),distance:(at-origin)/scale,error:(at-origin)/scale-pos};
 });
})}
async function render(page,data){
 await page.setContent('<!doctype html><style>body{margin:0}</style><div id="host" style="width:1050px;height:950px"></div>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(flag=>window.skipDecode=flag,!!process.env.WORD_TABS_SKIP_IMAGE_DECODE);
 await page.evaluate(async base=>{
  const data=Uint8Array.from(atob(base),x=>x.charCodeAt(0));
  window.handle=await review.renderFileViewerWordDoc(data.buffer,host,'docx',{filename:'document.docx',options:{docx:{worker:false,visualPagination:false}}});
  await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))]);
  const images=[...host.querySelectorAll('img')];for(const i of images)i.loading='eager';
  if (window.skipDecode) { await new Promise(r=>setTimeout(r,1000)); }
  else await Promise.race([Promise.all(images.map(i=>i.decode())),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timed out')),10000))]);
  await review.findFileViewerZoomProvider(host).setZoom(1);
  await new Promise(r=>setTimeout(r,50));
 },data.toString('base64'));
}
let completed=false;
try{
 const input=await generated();await writeFile(path.join(output,'generated.docx'),input);
 for(const dpr of [1,2]){
  const browser=await launch();
  try{
   const page=await browser.newPage({viewport:{width:1150,height:1000},deviceScaleFactor:dpr});
   page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
   await render(page,input);
   for(const scale of [1,.5,2,.88,1]){
    await page.evaluate(async s=>{await review.findFileViewerZoomProvider(host).setZoom(s);await new Promise(r=>setTimeout(r,50));},scale);
    const metrics=await measure(page);
    await check(`DPR ${dpr} zoom ${scale}: generated left/right/center, multiple, break, frame and cell stops`,()=>{
     assert.equal(metrics.length,9);for(const m of metrics)assert.ok(Math.abs(m.error)<1,JSON.stringify(m));return {tabs:metrics.length,maxError:Math.max(...metrics.map(m=>Math.abs(m.error)))};
    });
   }
   await check(`DPR ${dpr}: repeated layout and unchanged input preserve tab widths`,async()=>{
    const before=await measure(page);await page.evaluate(()=>{for(let i=0;i<20;i++)for(const s of host.querySelectorAll('section.docx'))review.layoutDocxExplicitTabs(s)});
    const after=await measure(page);assert.deepEqual(after,before);
   });
   if(!process.env.WORD_TABS_SKIP_SCREENSHOT&&dpr===1)await page.screenshot({path:path.join(output,'generated.png'),fullPage:true});
   await page.evaluate(()=>handle.unmount());
   await check(`DPR ${dpr}: unmount clears the viewer`,async()=>assert.equal(await page.locator('#host').evaluate(e=>e.children.length),0));
  }finally{await browser.close()}
 }
 if(process.env.WORD_TABS_ORIGINAL){
  const original=await readFile(process.env.WORD_TABS_ORIGINAL);
  assert.equal(sha(original),'4b2e9b2519af88f32cec9c4e0622ca7979f5c768c569819d48e26355001cb467');
  const originalXml=await (await JSZip.loadAsync(original)).file('word/document.xml').async('string');
  for(const dpr of [1,2]){
   const browser=await launch();
   try{
    const page=await browser.newPage({viewport:{width:1150,height:1000},deviceScaleFactor:dpr});
    page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
    await render(page,original);
    const expected=await page.evaluate(xml=>{
     const d=new DOMParser().parseFromString(xml,'application/xml'),W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
     return {text:[...d.getElementsByTagNameNS(W,'t')].map(n=>n.textContent).join(''),tables:d.getElementsByTagNameNS(W,'tbl').length};
    },originalXml);
    await check(`C030 DPR ${dpr}: original characters, all images and framed-paragraph structure preserved`,async()=>{
     const v=await page.evaluate(()=>({text:[...host.querySelectorAll('article')].map(a=>a.textContent).join('').replace(/\u00a0/g,''),images:[...host.querySelectorAll('article img')].map(i=>i.naturalWidth),tables:host.querySelectorAll('article table').length}));
     assert.equal(sha(v.text),sha(expected.text),'Original body text sequence');assert.equal(v.text.length,871);assert.equal(expected.tables,0);assert.equal(v.tables,0);assert.equal(v.images.length,5);assert.ok(v.images.every(w=>w>0));
     return {characters:v.text.length,textSha256:sha(v.text),images:v.images.length};
    });
    for(const scale of [1,.5,2,.88,1]){
     await page.evaluate(async s=>{await review.findFileViewerZoomProvider(host).setZoom(s);await new Promise(r=>setTimeout(r,50))},scale);
     const ms=await measure(page);
     await check(`C030 DPR ${dpr} zoom ${scale}: suffix ends at the authored right stop`,()=>{
      assert.equal(ms.length,1);assert.ok(Math.abs(ms[0].error)<1,JSON.stringify(ms));originals.push({id:'C030',dpr,scale,sha256:sha(original),...ms[0]});
     });
    }
    await page.evaluate(()=>handle.unmount());
   }finally{await browser.close()}
  }
 }
 await check('No external network requests or uncaught browser errors',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[])});
 completed=true;
}finally{
 const report={completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,screenshots:!process.env.WORD_TABS_SKIP_SCREENSHOT,imageDecodeAwaited:!process.env.WORD_TABS_SKIP_IMAGE_DECODE,originalSupplied:!!process.env.WORD_TABS_ORIGINAL,checks,originals};
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
