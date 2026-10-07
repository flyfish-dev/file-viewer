/**
 * WordML byte decoding and document defaults through the real Word renderer.
 * Local original paths only; evidence contains neutral IDs, hashes and counts.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'../../../..'), output=path.resolve(process.env.WORDML_REVIEW_OUTPUT||path.join(root,'output/wordml-encoding-defaults'));
await mkdir(output,{recursive:true});
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild');
const bundle=await build({stdin:{contents:`import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';import {convertWordMlToDocx} from './packages/renderers/word/src/wordMl.ts';import {findFileViewerZoomProvider} from './packages/core/src/index.ts';window.api={renderFileViewerWordDoc,convertWordMlToDocx,findFileViewerZoomProvider};`,resolveDir:root,loader:'ts'},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'silent'});
const W='http://schemas.microsoft.com/office/word/2003/wordml';
const O='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const sha=b=>createHash('sha256').update(b).digest('hex');
const doc=(body,extra='')=>`<w:wordDocument xmlns:w="${W}">${extra}<w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="720" w:right="720" w:top="720" w:bottom="720"/></w:sectPr></w:body></w:wordDocument>`;
const p=text=>`<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const defaults='<w:fonts><w:defaultFonts w:ascii="Courier New" w:h-ansi="Courier New" w:fareast="SimSun" w:cs="Tahoma"/></w:fonts>';
const typography=doc(p('Default text')+'<w:p><w:pPr><w:pStyle w:val="Override"/></w:pPr><w:r><w:t>Named style</w:t></w:r></w:p>'+'<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:h-ansi="Times New Roman"/></w:rPr><w:t>Direct run</w:t></w:r></w:p>',
 defaults+'<w:styles><w:style w:type="paragraph" w:styleId="Override"><w:rPr><w:rFonts w:ascii="Arial" w:h-ansi="Arial"/></w:rPr></w:style></w:styles>');
const cases=[
 ['UTF-8',Buffer.from('中文 é €'),'中文 é €'],
 ['GBK',Buffer.from([0xd6,0xd0,0xce,0xc4]),'中文'],
 ['windows-1252',Buffer.from([0x63,0x61,0x66,0xe9,0x20,0x80]),'café €'],
 ['Shift_JIS',Buffer.from([0x93,0xfa,0x96,0x7b]),'日本'],
];
const checks=[],originals=[],errors=[],requests=[];
let completed=false;
async function check(name,fn){try{const details=await fn();checks.push({name,status:'pass',...details});console.log('PASS',name)}catch(e){checks.push({name,status:'fail',error:e.message.slice(0,400)});console.error('FAIL',name,e.message)}}
async function mount(page,data){
 await page.evaluate(async base=>{
  if(window.handle)handle.unmount();
  const bytes=Uint8Array.from(atob(base),x=>x.charCodeAt(0));
  window.handle=await api.renderFileViewerWordDoc(bytes.buffer,host,'doc',{filename:'document.doc',options:{docx:{worker:false,visualPagination:false}}});
  await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1000))]);
  await api.findFileViewerZoomProvider(host).setZoom(1);
  await new Promise(r=>setTimeout(r,50));
 },data.toString('base64'));
}
try{
 for(const dpr of [1,2]){
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:process.env.WORDML_REVIEW_CHROME_ARGS?JSON.parse(process.env.WORDML_REVIEW_CHROME_ARGS):[]});
  try{
   const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:dpr});
   page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
   await page.setContent('<!doctype html><div id="host" style="width:1000px;height:850px"></div>');
   await page.addScriptTag({content:bundle.outputFiles[0].text});
   for(const [encoding,data,text] of cases){
    const [left,right]=doc(p('MARKER'),defaults).split('MARKER');
    const input=Buffer.concat([Buffer.from(`<?xml version="1.0" encoding="${encoding}"?>`+left),data,Buffer.from(right)]);
    await check(`DPR ${dpr}: ${encoding} original bytes reach the visible text without replacement`,async()=>{
     await mount(page,input);
     const observed=await page.locator('article').allTextContents();assert.equal(observed.join(''),text);
     return {characters:text.length,expectedTextSha256:sha(text)};
    });
   }
   await mount(page,Buffer.from(typography));
   await check(`DPR ${dpr}: default, named style and direct run font precedence is rendered`,async()=>{
    const families=await page.locator('article p').evaluateAll(ps=>ps.map(p=>getComputedStyle(p.querySelector('span')||p).fontFamily));
    assert.equal(families.length,3);
    assert.match(families[0],/^"?Courier New"?/);assert.match(families[1],/^Arial/);assert.match(families[2],/^"?Times New Roman"?/);
    return {families};
   });
   await check(`DPR ${dpr}: font defaults remain stable through zoom and disposal`,async()=>{
    const metrics=await page.evaluate(async()=>{
     const z=api.findFileViewerZoomProvider(host),out=[];
     for(const s of [.5,1,2,1]){await z.setZoom(s);await new Promise(r=>setTimeout(r,50));const el=host.querySelector('article p span'),b=el.getBoundingClientRect();out.push({scale:z.getState().scale,width:b.width,family:getComputedStyle(el).fontFamily})}
     return out;
    });
    for(const m of metrics){assert.equal(m.family,metrics[0].family);assert.ok(Math.abs(m.width/metrics[1].width-m.scale)<.001)}
   });
   if(dpr===1&&!process.env.WORDML_REVIEW_SKIP_SCREENSHOT)await page.screenshot({path:path.join(output,'generated.png'),fullPage:true});
   if(process.env.WORDML_REVIEW_ORIGINAL){
    const bytes=await readFile(process.env.WORDML_REVIEW_ORIGINAL);
    assert.equal(sha(bytes),'7b9380a4c80eb4c17b8f3c7d2b69b4c012d2c2ff1e1d58125ee7cb8bfc07e35d');
    const expected=await page.evaluate(source=>{
     const W='http://schemas.microsoft.com/office/word/2003/wordml',doc=new DOMParser().parseFromString(source,'application/xml');
     const body=doc.getElementsByTagNameNS(W,'body')[0];
     const text=[...body.getElementsByTagNameNS(W,'t')].filter(t=>{for(let a=t.parentElement;a&&a!==body;a=a.parentElement)if(a.namespaceURI===W&&['hdr','ftr'].includes(a.localName))return false;return true}).map(t=>t.textContent).join('');
     return {text,tables:body.getElementsByTagNameNS(W,'tbl').length,headers:body.getElementsByTagNameNS(W,'hdr').length,footers:body.getElementsByTagNameNS(W,'ftr').length};
    },bytes.toString('utf8'));
    await check(`C070 DPR ${dpr}: conversion creates default fonts in styles and preserves section relationships`,async()=>{
     const buffer=await page.evaluate(async base=>Array.from(new Uint8Array(await api.convertWordMlToDocx(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer,host))),bytes.toString('base64'));
     const z=await JSZip.loadAsync(Uint8Array.from(buffer));
     const styles=await z.file('word/styles.xml').async('string'),settings=await z.file('word/settings.xml').async('string');
     assert.ok(/w:docDefaults/.test(styles),'Original document defaults');assert.ok(/w:rPrDefault/.test(styles),'Original run defaults');assert.ok(/w:eastAsia="宋体"/.test(styles),'Original CJK default font');assert.ok(!settings.includes('defaultFonts'));
     assert.ok(z.file('word/footer1.xml'));assert.match(await z.file('word/_rels/document.xml.rels').async('string'),/footer1.xml/);
    });
    await mount(page,bytes);
    await check(`C070 DPR ${dpr}: unchanged original body, tables and footer remain visible`,async()=>{
     const observed=await page.evaluate(()=>({text:[...host.querySelectorAll('article')].map(n=>n.textContent).join(''),tables:host.querySelectorAll('article table').length,footers:host.querySelectorAll('footer').length,invalidImages:[...host.querySelectorAll('img')].filter(i=>!i.naturalWidth).length}));
     assert.equal(sha(observed.text),sha(expected.text),'Original body text sequence');assert.equal(observed.tables,expected.tables);assert.equal(observed.footers,expected.footers);assert.equal(observed.invalidImages,0);
     originals.push({id:'C070',sha256:sha(bytes),dpr,bodyCharacters:expected.text.length,textSha256:sha(expected.text),tables:observed.tables,footers:observed.footers});
    });
   }
   await page.evaluate(()=>{handle.unmount();window.handle=null});
   await check(`DPR ${dpr}: all generated and original previews clean up their host`,async()=>assert.equal(await page.locator('#host').evaluate(n=>n.children.length),0));
  }finally{await browser.close()}
 }
 await check('No external requests or unhandled browser errors',()=>{assert.deepEqual(requests,[]);assert.deepEqual(errors,[])});
 completed=true;
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify({completed,passed:checks.filter(x=>x.status==='pass').length,failed:checks.filter(x=>x.status==='fail').length,screenshots:!process.env.WORDML_REVIEW_SKIP_SCREENSHOT,originalSupplied:!!process.env.WORDML_REVIEW_ORIGINAL,checks,originals},null,2)+'\n')}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
