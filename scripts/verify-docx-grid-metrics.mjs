/** Real Word renderer/Worker regression. Originals are read-only and optional. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const req=createRequire(path.join(root,'packages/renderers/word/package.json'));
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild');
const dist=path.join(path.dirname(req.resolve('@file-viewer/docx/package.json')),'dist');
const worker=await readFile(path.resolve(process.env.DOCX_GRID_WORKER||path.join(dist,'docx-preview.worker.js')),'utf8');
const zipWorker=await readFile(req.resolve('jszip/dist/jszip.min.js'),'utf8');
const out=path.resolve(process.env.DOCX_GRID_OUTPUT||'output/docx-grid-metrics');await mkdir(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const run=(text,size=44,vertical='')=>`<w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial"/><w:sz w:val="${size}"/>${vertical?`<w:vertAlign w:val="${vertical}"/>`:''}</w:rPr><w:t>${text}</w:t></w:r>`;
const para=(runs,props='',font=44)=>`<w:p><w:pPr><w:spacing w:line="15" w:lineRule="auto"/>${props}<w:rPr><w:sz w:val="${font}"/></w:rPr></w:pPr>${runs}</w:p>`;
const br='<w:r><w:br/></w:r>';
const z=new JSZip();z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
z.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
z.file('word/document.xml',`<w:document xmlns:w="${W}"><w:body>
${para(run('GRID SUB first',44,'subscript')+br+run('GRID SUB next',44,'subscript'))}
${para(run('GRID SUP first',44,'superscript')+br+run('GRID SUP next',44,'superscript'))}
${para(run('GRID MIX large',72)+br+run('GRID MIX next',72),'',18)}
${para(run('EXACT first')+br+run('EXACT next'),'<w:spacing w:line="90" w:lineRule="exact"/>')}
${para(run('OFF first')+br+run('OFF next'),'<w:snapToGrid w:val="false"/>')}
${para('', '', 40)}
<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="7200"/></w:tblGrid><w:tr><w:tc><w:tcPr/><w:p><w:pPr><w:spacing w:line="15" w:lineRule="auto"/></w:pPr>${run('CELL no grid',44)}</w:p></w:tc></w:tr></w:tbl>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:bottom="720" w:left="720" w:right="720"/><w:docGrid w:type="lines" w:linePitch="312"/></w:sectPr></w:body></w:document>`);
const entries=[['generated',await z.generateAsync({type:'nodebuffer'})]];
if(process.env.DOCX_GRID_ORIGINAL){const bytes=await readFile(process.env.DOCX_GRID_ORIGINAL);assert.equal(sha(bytes),'0b6a601d5c98fb9d543a0baf4afce712f79831710ca6de4a383a1f69c89428a8');entries.push(['C005',bytes]);}
await writeFile(path.join(out,'generated.docx'),entries[0][1]);
const bundle=await build({stdin:{contents:`import{renderFileViewerWordDoc}from'./packages/renderers/word/src/index.ts';import{findFileViewerZoomProvider}from'./packages/core/src/index.ts';window.review={renderFileViewerWordDoc,findFileViewerZoomProvider};`,loader:'ts',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
const checks=[],samples=[],errors=[],requests=[];
const check=async(name,fn)=>{try{await fn();checks.push({name,status:'pass'});console.log('PASS',name);}catch(e){checks.push({name,status:'fail',error:e.message});console.error(name,e.message);}};
let completed=false;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
try{
 for(const dpr of [1,2])for(const [id,bytes]of entries){
  const page=await browser.newPage({viewport:{width:1150,height:1100},deviceScaleFactor:dpr});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});
  try{
   await page.setContent('<!doctype html><style>body{margin:0}</style><div id="host" style="width:1050px;height:1050px"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
   const xml=await (await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
   const expected=await page.evaluate(({xml,W})=>{const d=new DOMParser().parseFromString(xml,'application/xml');return [...d.getElementsByTagName('*')].filter(e=>e.namespaceURI===W&&(e.localName==='t'||e.localName==='tab'&&e.parentElement?.localName==='r')).map(e=>e.localName==='t'?e.textContent:'\u00a0').join('');},{xml,W});
   async function mount(useWorker,paged){console.log('MOUNT',id,dpr,useWorker,paged);
    const messages=await page.evaluate(async({bytes,worker,zipWorker,useWorker,paged})=>{
     window.handle?.unmount();for(const url of window.urls||[])URL.revokeObjectURL(url);window.urls=[URL.createObjectURL(new Blob([worker],{type:'application/javascript'})),URL.createObjectURL(new Blob([zipWorker],{type:'application/javascript'}))];window.messages=[];
     const Native=window.Worker;if(useWorker)window.Worker=class extends Native{constructor(...args){super(...args);this.addEventListener('message',e=>messages.push(e.data?.type));}};
     try{window.handle=await review.renderFileViewerWordDoc(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,host,'docx',{filename:'document.docx',registerExportAdapter:a=>window.exportAdapter=a,options:{docx:{worker:useWorker,workerUrl:urls[0],workerJsZipUrl:urls[1],visualPagination:paged}}});}finally{window.Worker=Native;}return messages;
    },{bytes:bytes.toString('base64'),worker,zipWorker,useWorker,paged});
    if(paged)await page.waitForFunction(()=>host.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:90000});
    await page.evaluate(async()=>{await document.fonts.ready;review.findFileViewerZoomProvider(host).setZoom(1);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});return messages;
   }
   const measure=()=>page.evaluate(()=>{
    const root=window.measureRoot||host,sections=[...root.querySelectorAll('section.docx')];
    const boxes=p=>{const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),rects=[];let n;while(n=walker.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width>0&&b.height>0)rects.push({top:b.top,bottom:b.bottom,height:b.height,left:b.left,right:b.right});}return rects;};
    const find=s=>[...root.querySelectorAll('article p')].find(p=>p.textContent.startsWith(s));
    const group=s=>{const p=find(s);if(!p)return null;const c=getComputedStyle(p),r=boxes(p);return{line:c.lineHeight,inline:p.querySelector('span')?.style.lineHeight,gap:r.length>1?r[1].top-r[0].bottom:null,rects:r};};
    const inlineGaps=[];for(const p of root.querySelectorAll('article p')){const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){const range=document.createRange();range.selectNodeContents(n);const rs=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);const sec=p.closest('section.docx');const scale=sec.getBoundingClientRect().width/parseFloat(getComputedStyle(sec).width);for(let i=1;i<rs.length;i++)if(rs[i].top-rs[i-1].top>1)inlineGaps.push((rs[i].top-rs[i-1].bottom)/scale);}}
    const paintGaps=[];for(const section of sections){const ps=[...section.querySelectorAll('article>p')],scale=section.getBoundingClientRect().width/parseFloat(getComputedStyle(section).width);for(let i=1;i<ps.length;i++){const prev=boxes(ps[i-1]);for(const span of ps[i].querySelectorAll('span')){const bg=getComputedStyle(span).backgroundColor;if(bg==='transparent'||bg==='rgba(0, 0, 0, 0)')continue;for(const b of span.getClientRects())for(const ink of prev)if(Math.min(b.right,ink.right)>Math.max(b.left,ink.left)&&b.bottom>ink.top)paintGaps.push((b.top-ink.bottom)/scale);}}}
    const gaps=[];for(const section of sections){const rect=section.getBoundingClientRect(),css=getComputedStyle(section);const scale=rect.width/parseFloat(css.width);const ps=[...section.querySelectorAll('article>p')].map(boxes).filter(b=>b.length);for(let i=1;i<ps.length;i++)gaps.push((Math.min(...ps[i].map(r=>r.top))-Math.max(...ps[i-1].map(r=>r.bottom)))/scale);}
    const empty=[...root.querySelectorAll('article>p')].find(p=>!p.textContent),cell=find('CELL');
    return{text:sections.map(s=>s.querySelector('article')?.textContent||'').join(''),pages:sections.length,gaps,inlineGaps,paintGaps,sub:group('GRID SUB'),sup:group('GRID SUP'),mix:group('GRID MIX'),exact:group('EXACT'),off:group('OFF'),emptyMin:empty?getComputedStyle(empty).minHeight:null,cellInline:cell?.querySelector('span')?.style.lineHeight};
   });
   for(const paged of [false,true]){
    await mount(false,paged);const start=await measure();const tag=`${id} DPR ${dpr} ${paged?'paged':'flow'}`;
    await check(`${tag}: source text including literal tabs is preserved`,()=>assert.equal(sha(start.text),sha(expected)));
    if(id==='generated'){
     await check(`${tag}: font metrics keep subscript and superscript lines separate`,()=>{assert.equal(start.sub.inline,'normal');assert.equal(start.sup.inline,'normal');assert.ok(start.sub.gap>=-.5);assert.ok(start.sup.gap>=-.5);});
     await check(`${tag}: a larger inline font enlarges its line without a size threshold`,()=>{assert.equal(start.mix.inline,'normal');assert.ok(start.mix.gap>=-.5);});
     await check(`${tag}: exact, disabled-grid and ordinary table-cell line rules are preserved`,()=>{assert.equal(start.exact.line,'6px');assert.equal(start.exact.inline,'');assert.equal(start.off.inline,'');assert.equal(start.cellInline,'');});
     await check(`${tag}: mixed pt/px paragraph minimum cannot shrink`,()=>assert.ok(Math.abs(parseFloat(start.emptyMin)-80/3)<.02));
    }else await check(`${tag}: original line glyphs are not occluded by subsequent paragraph shading`,()=>{assert.ok(start.paintGaps.length>0);assert.ok(Math.min(...start.paintGaps)>=-.5,`paint overlaps previous glyph bounds: ${Math.min(...start.paintGaps)}`);assert.ok(start.inlineGaps.length>10);assert.ok(Math.min(...start.inlineGaps)>=-.5,`minimum wrapped line gap ${Math.min(...start.inlineGaps)}`);assert.ok(start.gaps.length>50);assert.ok(Math.min(...start.gaps)>=-.5,`minimum gap ${Math.min(...start.gaps)}`);});
    await check(`${tag}: five zoom round trips preserve text, page count and geometry`,async()=>{for(const z of [1,.5,2,.88,1]){await page.evaluate(async z=>{review.findFileViewerZoomProvider(host).setZoom(z);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},z);const next=await measure();assert.equal(sha(next.text),sha(expected));assert.equal(next.pages,start.pages);if(id==='C005'){assert.ok(Math.min(...next.paintGaps)>=-.5);assert.ok(Math.min(...next.gaps)>=-.5);assert.ok(Math.min(...next.inlineGaps)>=-.5);}else assert.equal(next.sub.inline,'normal');}});
    samples.push({id,dpr,paged,sha256:sha(bytes),characters:expected.length,textSha256:sha(expected),pages:start.pages,minimumShadingGap:id==='C005'?Math.min(...start.paintGaps):undefined,minimumWrappedLineGap:id==='C005'?Math.min(...start.inlineGaps):undefined,minimumParagraphGap:id==='C005'?Math.min(...start.gaps):undefined});
   }
   await check(`${id} DPR ${dpr}: actual Worker parsing agrees with the direct path`,async()=>{const messages=await mount(true,true);assert.ok(messages.includes('parsed'));const value=await measure();assert.equal(sha(value.text),sha(expected));if(id==='C005'){assert.ok(Math.min(...value.paintGaps)>=-.5);assert.ok(Math.min(...value.gaps)>=-.5);assert.ok(Math.min(...value.inlineGaps)>=-.5);}else assert.equal(value.sub.inline,'normal');});
   await check(`${id} DPR ${dpr}: export adapter retains inline metrics and exact original content`,async()=>{const before=await page.evaluate(()=>host.innerHTML);const result=await page.evaluate(async()=>{const html=await exportAdapter.toHtml();const div=document.createElement('div');div.innerHTML=html;const content=[...div.querySelectorAll('section.docx>article')].map(e=>e.textContent).join('');return{content,natural:div.querySelectorAll('span[style*="line-height: normal"]').length};});assert.equal(sha(result.content),sha(expected));assert.ok(result.natural>0);assert.equal(await page.evaluate(()=>host.innerHTML),before);});
   if(id==='generated'&&dpr===1)await page.screenshot({path:path.join(out,'generated.png')});
   await check(`${id} DPR ${dpr}: unmount clears the document and adapters`,async()=>{await page.evaluate(()=>{handle.unmount();for(const u of urls)URL.revokeObjectURL(u);});assert.equal(await page.locator('#host>*').count(),0);assert.equal(await page.evaluate(()=>exportAdapter),null);});
  }finally{await page.close();}
 }
 await check('No unhandled browser errors or external requests',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});completed=true;
}finally{await browser.close();await writeFile(path.join(out,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,samples,errors,requests},null,2)+'\n');}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
