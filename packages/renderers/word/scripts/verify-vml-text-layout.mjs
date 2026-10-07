/** Actual Word renderer checks. Original documents remain outside Git and are hash-validated. */
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { chromium } from 'playwright'
const root = path.resolve(import.meta.dirname, '../../../..')
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild')
const wordRequire = createRequire(path.join(root, 'packages/renderers/word/package.json'))
const engine = path.dirname(wordRequire.resolve('@file-viewer/docx/package.json'))
const workerText = await readFile(path.join(engine,'dist/docx-preview.worker.js'),'utf8')
const zipText = await readFile(wordRequire.resolve('jszip/dist/jszip.min.js'),'utf8')
const output = path.resolve(process.env.WORD_VML_OUTPUT || path.join(root, 'output/word-vml-text'))
await mkdir(output, { recursive: true })
const original = process.env.WORD_VML_ORIGINAL
const digest = 'd5a60516f06b7f116c629fdbc834b81ae8a0d7ac70e64006483d2a4c44ff89ab'
const sha = data => createHash('sha256').update(data).digest('hex')
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const V = 'urn:schemas-microsoft-com:vml'
const XMLNS = `xmlns:w="${W}" xmlns:v="${V}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`
const vml = (name, left, top, color, width = 210, text = 'Full textbox label') => `<w:pict><v:shape id="${name}" type="#_x0000_t202" style="position:absolute;margin-left:${left}pt;margin-top:${top}pt;mso-position-horizontal-relative:text;mso-position-vertical-relative:text;width:${width}pt;height:36pt;z-index:4" fillcolor="${color}" stroked="false"><v:textbox inset="0,0,0,0"><w:txbxContent><w:p><w:pPr><w:pStyle w:val="Inner"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape></w:pict>`
const p = (name,left,indent,top,color,text) => `<w:p><w:pPr><w:ind w:left="${indent*20}"/><w:spacing w:before="800" w:after="800"/></w:pPr><w:r><w:t>Anchor text </w:t></w:r><w:r>${vml(name,left,top,color,210,text)}</w:r></w:p>`
async function makeFixture() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`)
  zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/_rels/document.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="head" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>')
  zip.file('word/styles.xml',`<w:styles ${XMLNS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Inner"><w:name w:val="Inner"/><w:pPr><w:spacing w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`)
  zip.file('word/header1.xml',`<w:hdr ${XMLNS}>${p('header',20,100,-8,'#d7e9ff','Header textbox')}</w:hdr>`)
  zip.file('word/document.xml',`<w:document ${XMLNS}><w:body>${p('right',40,150,20,'#eff3f7','No font enlargement or clipping')}${p('left',12,0,20,'#d5f5e3','Second anchor')}${p('negative',45,-18,-8,'#fae2e0','Negative indent and top')}<w:sectPr><w:headerReference w:type="default" r:id="head"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="2160" w:right="1440" w:bottom="1440" w:left="1440" w:header="400" w:footer="400"/></w:sectPr></w:body></w:document>`)
  return zip.generateAsync({ type:'nodebuffer' })
}
const bundle = await build({stdin:{contents:`import{renderFileViewerWordDoc}from './packages/renderers/word/src/index.ts';import{findFileViewerZoomProvider}from './packages/core/src/index.ts';window.review={renderFileViewerWordDoc,findFileViewerZoomProvider};`,resolveDir:root,loader:'ts'},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'silent'})
const checks=[], originals=[], errors=[], requests=[]
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined})
let completed=false
async function check(name,fn){try{await fn();checks.push({name,status:'pass'});console.log('PASS '+name)}catch(error){checks.push({name,status:'fail',message:error.message});console.error('FAIL '+name+': '+error.message)}}
async function expectations(page,data){const zip=await JSZip.loadAsync(data);const parts={};for(const name of Object.keys(zip.files))if(/^word\/(?:document|header\d+|footer\d+)\.xml$/.test(name))parts[name]=await zip.file(name).async('string');return page.evaluate(({parts,W,V})=>{
  const result={shapes:[],text:'',drawingImages:0,tables:0,rows:0,cells:0}
  for(const [part,xml]of Object.entries(parts)){
    const doc=new DOMParser().parseFromString(xml,'application/xml')
    for(const fallback of [...doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/markup-compatibility/2006','Fallback')])fallback.remove()
    if(part==='word/document.xml'){
      result.text=[...doc.getElementsByTagNameNS(W,'t')].map(x=>x.textContent).join('')
      result.tables=doc.getElementsByTagNameNS(W,'tbl').length;result.rows=doc.getElementsByTagNameNS(W,'tr').length;result.cells=doc.getElementsByTagNameNS(W,'tc').length
    }
    for(const shape of doc.getElementsByTagNameNS(V,'shape')){
      const styles=Object.fromEntries((shape.getAttribute('style')||'').split(';').filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return[x.slice(0,i).trim(),x.slice(i+1).trim()]}))
      if(styles['mso-position-horizontal-relative']!=='text'||styles['mso-position-vertical-relative']!=='text')continue
      const pt=x=>{if(!/^-?[\d.]+pt$/.test(x))throw Error('Unexpected original length');return parseFloat(x)*4/3}
      result.shapes.push({part,left:pt(styles['margin-left']),top:pt(styles['margin-top']),width:pt(styles.width),height:pt(styles.height),text:[...shape.getElementsByTagNameNS(W,'t')].map(t=>t.textContent).join('')})
    }
  }return result
},{parts,W,V})}
async function geometry(page){return page.evaluate(()=>{
 const n=v=>parseFloat(v)||0
 const text=[...host.querySelectorAll('section.docx>article')].map(x=>x.textContent).join('')
 return {text,pages:host.querySelectorAll('section.docx').length,tables:host.querySelectorAll('article table').length,rows:host.querySelectorAll('article tr').length,cells:host.querySelectorAll('article td').length,
 images:[...host.querySelectorAll('article img')].map(i=>({w:i.naturalWidth,h:i.naturalHeight})),
 shapes:[...host.querySelectorAll('svg[data-docx-anchor-horizontal="text"][data-docx-anchor-vertical="text"]')].filter(s=>!s.ownerSVGElement).map(svg=>{
  const section=svg.closest('section.docx'),story=svg.closest('article,header,footer'),p=svg.closest('p'),s=getComputedStyle(story),r=svg.getBoundingClientRect(),pr=p.getBoundingClientRect(),sr=story.getBoundingClientRect(),sc=section.getBoundingClientRect().width/section.offsetWidth
  const fo=svg.querySelector('foreignObject'),mr=fo?.getScreenCTM(),fr=fo?.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(fo?.firstElementChild||svg);const tr=range.getBoundingClientRect();
  return {part:story.localName==='article'?'word/document.xml':story.localName==='header'?'word/header1.xml':'word/footer1.xml',left:(r.left-sr.left)/sc-n(s.borderLeftWidth)-n(s.paddingLeft),top:(r.top-pr.top)/sc-n(getComputedStyle(p).borderTopWidth),width:r.width/sc,height:r.height/sc,text:fo?.textContent||'',fontScale:mr?[Math.hypot(mr.a,mr.b)/sc,Math.hypot(mr.c,mr.d)/sc]:null,textFits:!fo||(tr.right<=fr.right+.2*sc&&tr.bottom<=fr.bottom+.2*sc),style:svg.getAttribute('style'),viewport:fo?{width:fo.getAttribute('width'),transform:fo.getAttribute('transform')}:null}
 })}
})}
try{
 const generated=await makeFixture();await writeFile(path.join(output,'generated.docx'),generated)
 const entries=[['generated',generated]];if(original){const data=await readFile(original);assert.equal(sha(data),digest,'C037 original identity');entries.push(['C037',data])}
 for(const dpr of [1,2])for(const [id,data]of entries){
  const page=await browser.newPage({viewport:{width:1150,height:1100},deviceScaleFactor:dpr});page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort()})
  try{
   await page.setContent('<!doctype html><style>body{margin:0}</style><div id="host" style="width:1050px;height:1000px"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text})
   const expected=await expectations(page,data)
   await page.evaluate(async base=>{const b=Uint8Array.from(atob(base),c=>c.charCodeAt(0));window.handle=await review.renderFileViewerWordDoc(b.buffer,host,'docx',{filename:'document.docx',registerExportAdapter:adapter=>window.exportAdapter=adapter,options:{docx:{worker:false,visualPagination:true}}})},data.toString('base64'))
   await page.waitForFunction(()=>host.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:60000})
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()))})
   const initial=await geometry(page)
   const expectedShapes=[...expected.shapes].sort((a,b)=>(a.part.includes('header')?0:1)-(b.part.includes('header')?0:1))
   await check(`${id} DPR ${dpr}: original text and VML shapes are retained without invented content`,()=>{assert.equal(sha(initial.text),sha(expected.text),'Body text identity');assert.equal(initial.shapes.length,expectedShapes.length);assert.ok(initial.images.every(i=>i.w>0&&i.h>0));if(id==='C037'){assert.equal(initial.text.length,6034);assert.equal(initial.images.length,5);assert.equal(expectedShapes.length,3)}})
   for(const [step,zoom]of [1,.5,2,.88,1].entries()){
    await page.evaluate(async z=>{review.findFileViewerZoomProvider(host).setZoom(z);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))},zoom)
    const g=await geometry(page)
    await check(`${id} DPR ${dpr} step ${step} zoom ${zoom}: text-relative origins and shape extents match XML`,()=>{assert.equal(g.shapes.length,expectedShapes.length);for(let i=0;i<g.shapes.length;i++){for(const prop of ['left','top','width','height'])assert.ok(Math.abs(g.shapes[i][prop]-expectedShapes[i][prop])<.4,`${i} ${prop}: ${g.shapes[i][prop]} vs ${expectedShapes[i][prop]}`)}})
    await check(`${id} DPR ${dpr} step ${step} zoom ${zoom}: physical font sizes do not get a second SVG scale`,()=>{for(const shape of g.shapes)if(shape.fontScale){assert.ok(shape.fontScale.every(s=>Math.abs(s-1)<.002));assert.ok(shape.textFits,'Authored textbox text must fit the original viewport')}assert.equal(sha(g.text),sha(expected.text),'Body text identity');assert.equal(g.pages,initial.pages)})
   }
   if(id==='generated'&&dpr===1)await page.screenshot({path:path.join(output,'generated.png')})
   await check(`${id} DPR ${dpr}: export preserves resolved origins, viewport units and content`,async()=>{
    const result=await page.evaluate(async()=>{
     const html=await exportAdapter.toHtml();const clone=document.createElement('div');clone.innerHTML=html;clone.style.cssText='position:absolute;left:1200px;top:0';document.body.append(clone);const svg=clone.querySelector('svg[data-docx-anchor-horizontal="text"]');const box=svg?.querySelector('foreignObject');const text=[...clone.querySelectorAll('section.docx>article')].map(x=>x.textContent).join('');const result={text,left:svg?.style.left,top:svg?.style.top,transform:box?.getAttribute('transform'),fontScale:box?Math.hypot(box.getScreenCTM().a,box.getScreenCTM().b):null};clone.remove();return result
    });assert.equal(sha(result.text),sha(expected.text),'Export text identity');assert.ok(result.left);assert.ok(result.top);assert.match(result.transform||'',/^scale\(/);assert.ok(Math.abs(result.fontScale-1)<.002,'Unscaled export preserves physical font units')
   })
   await check(`${id} DPR ${dpr}: actual Worker returns parsed data and preserves repaired VML geometry`,async()=>{
    const messages=await page.evaluate(async({base,worker,zip})=>{
     handle.unmount();window.workerMessages=[];
     window.zipUrl=URL.createObjectURL(new Blob([zip],{type:'application/javascript'}));
     window.workerUrl=URL.createObjectURL(new Blob([worker],{type:'application/javascript'}));
     const NativeWorker=window.Worker;
     window.Worker=class extends NativeWorker { constructor(...args){super(...args);this.addEventListener('message',e=>workerMessages.push({type:e.data?.type,error:e.data?.error}))} };
     try{const bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));window.handle=await review.renderFileViewerWordDoc(bytes.buffer,host,'docx',{filename:'document.docx',options:{docx:{worker:true,workerUrl,workerJsZipUrl:zipUrl,visualPagination:true}}});return workerMessages}
     finally{window.Worker=NativeWorker}
    },{base:data.toString('base64'),worker:workerText,zip:zipText})
    assert.ok(messages.some(m=>m.type==='parsed'),'Worker must return a model, not silently fall back')
    await page.waitForFunction(()=>host.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:60000})
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));review.findFileViewerZoomProvider(host).setZoom(1);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
    const g=await geometry(page);assert.equal(sha(g.text),sha(expected.text),'Body text identity');assert.equal(g.shapes.length,expectedShapes.length)
    for(let i=0;i<g.shapes.length;i++){for(const prop of ['left','top','width','height'])assert.ok(Math.abs(g.shapes[i][prop]-expectedShapes[i][prop])<.4,`${i} ${prop}`);if(g.shapes[i].fontScale)assert.ok(g.shapes[i].fontScale.every(s=>Math.abs(s-1)<.002))}
   })
   originals.push({id,sha256:sha(data),dpr,characters:initial.text.length,bodySha256:sha(initial.text),pages:initial.pages,shapes:initial.shapes.map(({text,...shape})=>({...shape,textCharacters:text.length})),images:initial.images.length})
   await page.evaluate(()=>{handle.unmount();if(window.workerUrl)URL.revokeObjectURL(workerUrl);if(window.zipUrl)URL.revokeObjectURL(zipUrl)});await check(`${id} DPR ${dpr}: unmount removes the preview`,async()=>assert.equal(await page.locator('#host > *').count(),0))
  }finally{await page.close()}
 }
 await check('No browser exceptions or external resource requests',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[])})
 completed=true
}finally{await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors,requests,scope:'Anchored VML text-relative positioning and physical text units only; not full-page typography, stamp authentication or all group/cell positioning policies.'},null,2)+'\n')}
if(checks.some(c=>c.status==='fail'))process.exitCode=1
