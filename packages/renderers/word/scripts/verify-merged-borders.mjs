/** Real parser/renderer/Worker checks with an optional read-only original. */
import assert from 'node:assert/strict'
import path from 'node:path'
import {createRequire} from 'node:module'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import JSZip from 'jszip'
import {chromium} from 'playwright'
const root=path.resolve(import.meta.dirname,'../../../..'),word=path.join(root,'packages/renderers/word')
const {build}=createRequire(path.join(root,'packages/renderers/pptx/package.json'))('esbuild')
const req=createRequire(path.join(word,'package.json')),engine=path.dirname(req.resolve('@file-viewer/docx/package.json'))
const worker=await readFile(path.join(engine,'dist/docx-preview.worker.js'),'utf8'),zipWorker=await readFile(req.resolve('jszip/dist/jszip.min.js'),'utf8')
const out=path.resolve(process.env.WORD_MERGE_OUTPUT||'output/word-merged-borders');await mkdir(out,{recursive:true})
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const cell=(text,merge='',bottom='',colspan=1)=>`<w:tc><w:tcPr><w:tcW w:w="${1800*colspan}" w:type="dxa"/>${colspan>1?`<w:gridSpan w:val="${colspan}"/>`:''}${merge?`<w:vMerge w:val="${merge}"/>`:''}${bottom?`<w:tcBorders><w:bottom ${bottom}/></w:tcBorders>`:''}</w:tcPr><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`
const table=rows=>`<w:tbl><w:tblPr><w:tblW w:w="5400" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(k=>`<w:${k} w:val="single" w:sz="4" w:color="000000"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/></w:tblGrid>${rows.map(r=>`<w:tr>${r}</w:tr>`).join('')}</w:tbl>`
const z=new JSZip();z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');z.file('_rels/.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="doc" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`)
z.file('word/document.xml',`<w:document xmlns:w="${W}"><w:body><w:p><w:r><w:t>Visible merge bottom edges</w:t></w:r></w:p>${table([cell('Three rows','restart','w:val="nil"')+cell('A')+cell('B'),cell('','continue','w:val="double" w:sz="16" w:color="FF0000"')+cell('C')+cell('D'),cell('','continue','w:val="single" w:sz="8" w:color="2244BB"')+cell('E')+cell('F')])}<w:p/><w:p/><w:p/>${table([cell('Merged columns','restart','w:val="nil"',2)+cell('Right','restart','w:val="nil"'),cell('','continue','w:val="single" w:sz="12" w:color="229944"',2)+cell('','continue','w:val="nil"')])}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="0" w:footer="0"/></w:sectPr></w:body></w:document>`)
const fixture=await z.generateAsync({type:'nodebuffer'});await writeFile(path.join(out,'generated.docx'),fixture)
const bundle=await build({stdin:{resolveDir:root,loader:'ts',contents:`import{renderFileViewerWordDoc}from'./packages/renderers/word/src/index.ts';import{findFileViewerZoomProvider}from'./packages/core/src/index.ts';window.review={renderFileViewerWordDoc,findFileViewerZoomProvider};`},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'silent'})
const sha=b=>createHash('sha256').update(b).digest('hex'),checks=[],originals=[],errors=[],requests=[];let completed=false
const check=async(name,f)=>{try{await f();checks.push({name,status:'pass'});console.log('PASS',name)}catch(e){checks.push({name,status:'fail',error:e.message});console.error('FAIL',name,e.message)}}
const entries=[['generated',fixture]];if(process.env.WORD_MERGE_ORIGINAL){const b=await readFile(process.env.WORD_MERGE_ORIGINAL);assert.equal(sha(b),'d5a60516f06b7f116c629fdbc834b81ae8a0d7ac70e64006483d2a4c44ff89ab');entries.push(['C037',b])}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,headless:true})
try{for(const dpr of [1,2])for(const [id,bytes]of entries){
 const page=await browser.newPage({viewport:{width:1150,height:1050},deviceScaleFactor:dpr});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
 try{
  await page.setContent('<!doctype html><style>body{margin:0}</style><div id="host" style="width:1050px;height:1000px"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  const zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
  const expected=await page.evaluate(({xml,W})=>{
   const doc=new DOMParser().parseFromString(xml,'application/xml'),attr=(e,n)=>e?.getAttributeNS(W,n),direct=(e,n)=>[...(e?.children||[])].filter(e=>e.namespaceURI===W&&e.localName===n);
   for(const f of [...doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/markup-compatibility/2006','Fallback')])f.remove();
   const tables=[...doc.getElementsByTagNameNS(W,'tbl')],merges=[];
   tables.forEach((t,ti)=>{const rows=direct(t,'tr'),grid=rows.map(r=>{let c=Number(attr(direct(r,'trPr')[0]?.getElementsByTagNameNS(W,'gridBefore')[0],'val')||0);return direct(r,'tc').map(tc=>{const p=direct(tc,'tcPr')[0],span=Number(attr(direct(p,'gridSpan')[0],'val')||1),m=direct(p,'vMerge')[0],entry={c,span,tc,merge:m?(attr(m,'val')||'continue'):null};c+=span;return entry})});
    for(let ri=0;ri<grid.length;ri++)for(const origin of grid[ri]){if(origin.merge!=='restart')continue;let end=ri,last=origin;while(end+1<grid.length){const n=grid[end+1].find(c=>c.c===origin.c&&c.span===origin.span);if(n?.merge!=='continue')break;end++;last=n}if(end===ri)continue;
     const p=direct(last.tc,'tcPr')[0],tcBorder=direct(direct(p,'tcBorders')[0],'bottom')[0],tblPr=direct(t,'tblPr')[0],tableBorders=direct(tblPr,'tblBorders')[0],fallback=direct(tableBorders,end===rows.length-1?'bottom':'insideH')[0],b=tcBorder||fallback;
     merges.push({table:ti,row:ri,column:origin.c,columns:origin.span,rows:end-ri+1,border:{val:attr(b,'val'),size:Number(attr(b,'sz')||0)/8,color:attr(b,'color')||'auto'}})
    }
   });return{text:[...doc.getElementsByTagNameNS(W,'t')].map(e=>e.textContent).join(''),tables:tables.length,rowCounts:tables.map(t=>direct(t,'tr').length),cellCounts:tables.map(t=>direct(t,'tr').reduce((a,r)=>a+direct(r,'tc').length,0)),merges}
  },{xml,W});
  const mount=async useWorker=>{
   const result=await page.evaluate(async({base,worker,zip,useWorker})=>{
    window.handle?.unmount();window.workerMessages=[];if(window.workerURL)URL.revokeObjectURL(workerURL);if(window.zipURL)URL.revokeObjectURL(zipURL);window.workerURL=URL.createObjectURL(new Blob([worker],{type:'application/javascript'}));window.zipURL=URL.createObjectURL(new Blob([zip],{type:'application/javascript'}));const NativeWorker=window.Worker;
    if(useWorker)window.Worker=class extends NativeWorker{constructor(...a){super(...a);this.addEventListener('message',e=>workerMessages.push(e.data?.type))}};
    try{window.handle=await review.renderFileViewerWordDoc(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer,host,'docx',{filename:'document.docx',registerExportAdapter:a=>window.exportAdapter=a,options:{docx:{worker:useWorker,workerUrl:workerURL,workerJsZipUrl:zipURL,visualPagination:true}}});return workerMessages}finally{window.Worker=NativeWorker}
   },{base:bytes.toString('base64'),worker,zip:zipWorker,useWorker});
   await page.waitForFunction(()=>host.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:60000});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));review.findFileViewerZoomProvider(host).setZoom(1);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});return result
  };
  const geometry=()=>page.evaluate(spec=>{
   const text=[...host.querySelectorAll('section.docx>article')].map(e=>e.textContent).join(''),tables=[...host.querySelectorAll('article table')];
   const actual=spec.map(m=>{const row=tables[m.table]?.rows[m.row];let grid=0,cell;for(const c of row?.cells||[]){if(grid===m.column){cell=c;break}grid+=c.colSpan}if(!cell)return{missing:true};const s=cell.style,g=getComputedStyle(cell);return{rows:cell.rowSpan,columns:cell.colSpan,hidden:g.display==='none',bottom:{style:s.borderBottomStyle,width:s.borderBottomWidth,color:s.borderBottomColor},computed:{style:g.borderBottomStyle,width:g.borderBottomWidth,color:g.borderBottomColor}}});
   return{text,pages:host.querySelectorAll('section.docx').length,rowCounts:tables.map(t=>t.rows.length),cellCounts:tables.map(t=>[...t.rows].reduce((a,r)=>a+r.cells.length,0)),actual,images:[...host.querySelectorAll('article img')].map(i=>({w:i.naturalWidth,h:i.naturalHeight}))}
  },expected.merges);
  function assertBorders(g){assert.equal(g.actual.length,expected.merges.length);for(let i=0;i<g.actual.length;i++){const a=g.actual[i],e=expected.merges[i];assert.equal(a.rows,e.rows);assert.equal(a.columns,e.columns);assert.equal(a.hidden,false);if(['nil','none'].includes(e.border.val)){assert.equal(a.computed.style,'none',`edge ${i}`)}else{assert.equal(a.computed.style,'solid',`edge ${i}`);assert.ok(a.bottom.width.endsWith('pt'));assert.ok(Math.abs(parseFloat(a.bottom.width)-e.border.size)<.001);const c=e.border.color==='auto'?'000000':e.border.color,expectedColor=`rgb(${parseInt(c.slice(0,2),16)}, ${parseInt(c.slice(2,4),16)}, ${parseInt(c.slice(4,6),16)})`;assert.equal(a.computed.color,expectedColor)}}}
  await mount(false);const initial=await geometry();
  await check(`${id} DPR ${dpr}: original text, cell grid and image decoding remain complete`,()=>{assert.equal(sha(initial.text),sha(expected.text));assert.deepEqual(initial.rowCounts,expected.rowCounts);assert.deepEqual(initial.cellCounts,expected.cellCounts);assert.ok(initial.images.every(i=>i.w>0&&i.h>0));if(id==='C037'){assert.equal(expected.merges.length,19);assert.equal(initial.text.length,6034);assert.equal(initial.images.length,5)}else assert.equal(expected.merges.length,3)});
  await check(`${id} DPR ${dpr}: every merged bottom matches independent XML through five zooms`,async()=>{for(const zoom of [1,.5,2,.88,1]){await page.evaluate(async z=>{review.findFileViewerZoomProvider(host).setZoom(z);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))},zoom);const g=await geometry();assertBorders(g);assert.equal(sha(g.text),sha(expected.text));assert.equal(g.pages,initial.pages)}});
  if(id==='generated'&&dpr===1)await page.screenshot({path:path.join(out,'generated.png')});
  await check(`${id} DPR ${dpr}: actual export keeps visible bottom borders and source contents`,async()=>{
   const old=await page.evaluate(()=>host.innerHTML);await page.evaluate(async()=>{const html=await exportAdapter.toHtml();window.exportRoot=document.createElement('div');exportRoot.innerHTML=html;exportRoot.style.cssText='position:absolute;left:1200px;top:0';document.body.append(exportRoot);window.originalHost=host;originalHost.id='old-host';exportRoot.id='host'});
   try{const g=await geometry();assertBorders(g);assert.equal(sha(g.text),sha(expected.text))}finally{await page.evaluate(()=>{exportRoot.remove();originalHost.id='host'})}assert.equal(await page.evaluate(()=>host.innerHTML),old)
  });
  await check(`${id} DPR ${dpr}: real Worker returns parsed model with correct merged edges`,async()=>{const messages=await mount(true);assert.ok(messages.includes('parsed'),'Worker must parse, not silently fall back');const g=await geometry();assertBorders(g);assert.equal(sha(g.text),sha(expected.text));assert.deepEqual(g.rowCounts,expected.rowCounts)});
  originals.push({id,sha256:sha(bytes),dpr,characters:initial.text.length,bodySha256:sha(initial.text),pages:initial.pages,rowCounts:initial.rowCounts,cellCounts:initial.cellCounts,mergedRegions:expected.merges.length,expected:expected.merges,actual:(await geometry()).actual});
  await check(`${id} DPR ${dpr}: unmount removes preview and resources`,async()=>{await page.evaluate(()=>{handle.unmount();URL.revokeObjectURL(workerURL);URL.revokeObjectURL(zipURL)});assert.equal(await page.locator('#host>*').count(),0)})
 }finally{await page.close()}
}await check('No browser errors or external resource requests',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[])});completed=true;
}finally{await browser.close();await writeFile(path.join(out,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors,requests},null,2)+'\n')}
if(checks.some(c=>c.status==='fail'))process.exitCode=1
