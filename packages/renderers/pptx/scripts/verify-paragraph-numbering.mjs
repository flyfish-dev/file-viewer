import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import JSZip from 'jszip';
import { makePresentation } from '../../../../test/compatibility-review/fixtures.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const output = path.resolve(process.env.PPTX_PARAGRAPH_EVIDENCE_DIR || 'output/pptx-paragraph-numbering');
await mkdir(output, { recursive: true });
const temp = await mkdtemp(path.join(output, 'runtime-'));
const bundle = path.join(temp, 'browser.js');
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const run = (text, sz = 2000) => `<a:r><a:rPr sz="${sz}" lang="en-US"/><a:t>${esc(text)}</a:t></a:r>`;
const spacing = (side, val, kind = 'Pct') => `<a:spc${side}><a:spc${kind} val="${val}"/></a:spc${side}>`;
const paragraph = (text, props = '', runs = '') => `<a:p><a:pPr algn="l">${props}</a:pPr>${runs || run(text)}</a:p>`;
const numbered = (text, type = 'romanUcPeriod', start) => paragraph(text,
  `${spacing('Bef', 50000)}${spacing('Aft', 50000)}<a:buAutoNum type="${type}"${start === undefined ? '' : ` startAt="${start}"`}/>`);
const shape = (id, x, y, text, listStyle = '', placeholder = '') => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr>${placeholder}</p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x*9525}" y="${y*9525}"/><a:ext cx="${490*9525}" cy="${600*9525}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle>${listStyle}</a:lstStyle>${text}</p:txBody></p:sp>`;
const slide = body => `<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${body}</p:spTree></p:cSld></p:sld>`;
async function fixture() {
  const zip = await JSZip.loadAsync(await makePresentation(JSZip));
  zip.file('ppt/slides/slide1.xml', slide(
    shape(2, 30, 25, Array.from({length:5}, (_,i) => numbered(`Section ${i+1}`)).join('')) +
    shape(3, 630, 25,
      paragraph('Mixed run sizes', spacing('Bef',50000)+spacing('Aft',50000),run('Small ',1200)+run('Large',2725))+
      paragraph('Percent string', spacing('Bef','50%')+spacing('Aft','25%')+'<a:lnSpc><a:spcPct val="130%"/></a:lnSpc>')+
      paragraph('Point spacing', spacing('Bef',600,'Pts')+spacing('Aft',900,'Pts'))+
      paragraph('Zero spacing', spacing('Bef',0)+spacing('Aft',0))+
      paragraph('Malformed spacing', spacing('Bef','Infinity')+spacing('Aft','-50000')))));
  zip.file('ppt/slides/slide2.xml', slide(
    shape(2,30,25, numbered('Restart IV','romanUcPeriod',4)+numbered('Continue V')+
      numbered('Restart AA','alphaUcPeriod',27)+numbered('Continue AB','alphaUcPeriod'))+
    shape(3,630,25,paragraph('Inherited spacing')+paragraph('Explicit zero',spacing('Bef',0))+
      paragraph('Explicit points',spacing('Bef',600,'Pts')),`<a:lvl1pPr>${spacing('Bef',50000)}${spacing('Aft',25000)}</a:lvl1pPr>`)));
  zip.file('ppt/slides/slide3.xml', slide(
    shape(2,30,25,paragraph('Master spacing'),'','<p:ph type="body" idx="1"/>')+
    shape(3,630,25,paragraph('Layout spacing'),'','<p:ph type="body" idx="2"/>')));
  // Scope layout inheritance to the selected placeholder; the single a:p form
  // is as valid as an array and must not be silently discarded.
  let master=await zip.file('ppt/slideMasters/slideMaster1.xml').async('string');
  master=master.replace('<p:bodyStyle/>',`<p:bodyStyle><a:lvl1pPr>${spacing('Bef',12500)}${spacing('Aft',25000)}<a:lnSpc><a:spcPts val="2400"/></a:lnSpc></a:lvl1pPr></p:bodyStyle>`);
  zip.file('ppt/slideMasters/slideMaster1.xml',master);
  let layout=await zip.file('ppt/slideLayouts/slideLayout1.xml').async('string');
  layout=layout.replace('</p:spTree>',shape(4,0,0,paragraph('Layout',spacing('Bef',50000)+spacing('Aft',75000)),'','<p:ph type="body" idx="2"/>')+'</p:spTree>');
  zip.file('ppt/slideLayouts/slideLayout1.xml',layout);
  return zip.generateAsync({type:'nodebuffer'});
}
await build({stdin:{contents:`
 import process from './packages/renderers/pptx/src/engine/process.js';
 import {createDefaultPptxOptions} from './packages/renderers/pptx/src/options.ts';
 import {pptxViewerCss,scopePptxContentStyleText} from './packages/renderers/pptx/src/styles.ts';
 import * as charts from './packages/renderers/pptx/src/chart.ts';
 window.review={process,createDefaultPptxOptions,pptxViewerCss,scopePptxContentStyleText,charts};
 `,resolveDir:root,loader:'ts'},outfile:bundle,bundle:true,platform:'browser',format:'iife',logLevel:'warning'});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox']});
const checks=[],originals=[],errors=[],external=[];
async function check(name, fn) { try { await fn();checks.push({name,status:'pass'});console.log('PASS '+name); } catch(e) {checks.push({name,status:'fail',error:String(e)});throw e;} }
try {
 const page=await browser.newPage({viewport:{width:1300,height:850},deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 await page.setContent('<!doctype html><style>body{margin:0}</style><div id="root"></div>');
 await page.addScriptTag({content:await readFile(bundle,'utf8')});
 async function mount(bytes) {
  return page.evaluate(async data=>{
   window.handle?.destroy();let callback;const messages=[];
   review.process(fn=>callback=fn,m=>messages.push(m));
   await callback({type:'processPPTX',data:Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,options:review.createDefaultPptxOptions()});
   const failures=messages.filter(m=>m.type==='error');if(failures.length)throw Error(JSON.stringify(failures));
   root.innerHTML='<style>'+review.pptxViewerCss+review.scopePptxContentStyleText(messages.find(m=>m.type==='globalCSS')?.data||'')+'</style><div class="flyfish-pptx-content">'+messages.filter(m=>m.type==='slide').map(m=>m.data).join('')+'</div>';
   await document.fonts.ready;window.handle=await review.charts.renderPptxPostProcessing(null,root);
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return [...root.querySelectorAll('.slide-prgrph')].map(p=>{const c=getComputedStyle(p);return {text:p.textContent,before:parseFloat(c.marginTop),after:parseFloat(c.marginBottom),line:c.lineHeight,bullet:p.querySelector('.numeric-bullet-style')?.textContent,maxFont:Math.max(0,...[...p.querySelectorAll('.text-block')].map(s=>parseFloat(getComputedStyle(s).fontSize)))}});
  },bytes.toString('base64'));
 }
 const generated=await fixture();await writeFile(path.join(output,'generated.pptx'),generated);
 const rows=await mount(generated);const find=text=>{const row=rows.find(p=>p.text.includes(text));assert.ok(row,text);return row;};
 const near=(a,b)=>assert.ok(Math.abs(a-b)<.002,`${a} != ${b}`);
 await check('Authored Roman numbering and punctuation survive parser and post-processing',()=>assert.deepEqual(rows.filter(p=>/Section \d/.test(p.text)).map(p=>p.bullet),['I. ','II. ','III. ','IV. ','V. ']));
 await check('Percent paragraph spacing preserves fractional largest-run metrics',()=>{const r=find('Small Large');near(r.maxFont,2725/100*4/3);near(r.before,r.maxFont/2);near(r.after,r.maxFont/2);});
 await check('Percentage strings use font-relative, not container-relative dimensions',()=>{const r=find('Percent string');near(r.before,r.maxFont/2);near(r.after,r.maxFont/4);});
 await check('Point-based before/after spacing remains unchanged',()=>{const r=find('Point spacing');near(r.before,8);near(r.after,12);});
 await check('Explicit zero remains zero and malformed percentages are not applied',()=>{for(const text of ['Zero spacing','Malformed spacing']){near(find(text).before,0);near(find(text).after,0);}});
 await check('List-level percent inheritance respects explicit zero and point overrides',()=>{near(find('Inherited spacing').before,40/3);near(find('Inherited spacing').after,20/3);near(find('Explicit zero').before,0);near(find('Explicit points').before,8);});
 await check('Placeholder layout and master paragraph spacing remain distinct',()=>{near(find('Master spacing').before,10/3);near(find('Master spacing').after,20/3);near(find('Layout spacing').before,40/3);near(find('Layout spacing').after,20);});
 await check('Numbering restarts and continues after Roman/extended alphabetic start values',()=>assert.deepEqual(rows.filter(p=>/Restart|Continue/.test(p.text)).map(p=>p.bullet),['IV. ','V. ','AA. ','AB. ']));
 await check('Roman subtractive notation, case, suffixes and alphabetic rollover are bounded',async()=>{
  const cases=[['romanUcPeriod',1994,'MCMXCIV. '],['romanLcParenR',49,'xlix) '],['romanUcParenBoth',9,'(IX) '],['arabicParenBoth',3,'(3) '],['alphaLcPeriod',703,'aaa. '],['alphaUcParenR',52,'AZ) '],['unknown',7,'7'],['romanUcPeriod',0,'0']];
  const labels=await page.evaluate(cases=>cases.map(([t,n])=>review.charts.getNumericBulletText(t,n)),cases);assert.deepEqual(labels,cases.map(c=>c[2]));
 });
 await check('Repeated post-processing produces the same numbering',async()=>{const labels=await page.evaluate(async()=>{handle.destroy();handle=await review.charts.renderPptxPostProcessing(null,root);return [...root.querySelectorAll('.numeric-bullet-style')].map(e=>e.textContent);});assert.deepEqual(labels,rows.filter(r=>r.bullet!==undefined).map(r=>r.bullet));});
 await page.screenshot({path:path.join(output,'generated.png')});
 const pinned=[['C050','5a178b6c5dc63976ae4a133eaff14927ac40320609073b6e836ee7b814b1e685']];
 if(process.env.PPTX_PARAGRAPH_CORPUS_DIR)for(const [id,sha] of pinned)await check(`${id}: original bytes preserve all five Roman labels and explicit paragraph spacing`,async()=>{
  const bytes=await readFile(path.join(process.env.PPTX_PARAGRAPH_CORPUS_DIR,id+'.pptx'));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
  const r=await mount(bytes),numberedRows=r.filter(p=>p.bullet!==undefined);assert.equal(numberedRows.length,5);assert.deepEqual(numberedRows.map(p=>p.bullet),['I. ','II. ','III. ','IV. ','V. ']);
  for(const p of numberedRows){near(p.before,p.maxFont/2);near(p.after,p.maxFont/2);}
  originals.push({id,sha256:sha,paragraphs:numberedRows.map(({bullet,before,after,maxFont})=>({bullet,before,after,maxFont})),scope:'Roman labels and percent margins only; not all fonts, alignment or slide pixel fidelity'});
  await page.screenshot({path:path.join(output,id+'.png')});
 });
 await check('Offline parsing and disposal produce no external requests or browser errors',async()=>{await page.evaluate(()=>{handle.destroy();root.replaceChildren()});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
 await writeFile(path.join(output,'geometry.json'),JSON.stringify(rows,null,2)+'\n');
} finally {
 await browser.close();await rm(temp,{recursive:true,force:true});
 await writeFile(path.join(output,'report.json'),JSON.stringify({passed:checks.filter(c=>c.status==='pass').length,checks,originals,errors,external},null,2)+'\n');
}
