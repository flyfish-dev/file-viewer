import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { getDrawingTextRuns, getFirstSlideNumber, getPictureEffects } from '../src/engine/support/drawing-semantics.js';
import { makePresentation } from '../../../../test/compatibility-review/fixtures.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const output = path.resolve(process.env.PPTX_DRAWING_OUTPUT || 'output/pptx-drawing-semantics');
await mkdir(output, { recursive: true });
const temp = await mkdtemp(path.join(output, 'runtime-'));
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const run = text => `<a:r><a:rPr sz="1800" lang="en-US"/><a:t>${esc(text)}</a:t></a:r>`;
const field = (type, text, id) => `<a:fld id="{00000000-0000-0000-0000-${String(id).padStart(12, '0')}}" type="${type}"><a:rPr sz="1800" lang="en-US"/><a:t>${esc(text)}</a:t></a:fld>`;
const xfrm = (x, y, w, h, attrs = '') => `<a:xfrm ${attrs}><a:off x="${x*9525}" y="${y*9525}"/><a:ext cx="${w*9525}" cy="${h*9525}"/></a:xfrm>`;
const rect = (id, x, y, color) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Paint ${id}"/><p:cNvSpPr/><p:nvPr userDrawn="1"/></p:nvSpPr><p:spPr>${xfrm(x,y,100,100)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
const text = (id, y, contents) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(20,y,900,130)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:pPr/>${contents}</a:p></p:txBody></p:sp>`;
const tree = body => `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${body}</p:spTree>`;
const slide = body => `<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld>${tree(body)}</p:cSld></p:sld>`;
const triangle = '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="100" y="0"/></a:lnTo><a:lnTo><a:pt x="0" y="100"/></a:lnTo><a:close/></a:path></a:pathLst></a:custGeom>';
const picture = (id, x, amt, attrs = '', geometry = '', crop = '', y = 430, resource = 'rIdPicture') => `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Picture ${id}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${resource}">${amt == null ? '' : (Array.isArray(amt) ? amt : [amt]).map(a => `<a:alphaModFix amt="${a}"/>`).join('')}</a:blip>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(x,y,100,100,attrs)}${geometry||'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'}</p:spPr></p:pic>`;
async function fixture(first = 0) {
  const zip = await JSZip.loadAsync(await makePresentation(JSZip));
  const presentation = await zip.file('ppt/presentation.xml').async('string');
  zip.file('ppt/presentation.xml', first == null ? presentation : presentation.replace('<p:presentation ', `<p:presentation firstSlideNum="${first}" `));
  const photo = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path fill="red" d="M0 0H50V100H0Z"/><path fill="blue" d="M50 0H100V100H50Z"/></svg>';
  zip.file('ppt/media/picture.svg', photo);
  zip.file('ppt/media/translucent.svg', photo.replaceAll('fill="', 'fill-opacity="0.4" fill="'));
  zip.file('ppt/media/strong.svg', photo.replaceAll('fill="', 'fill-opacity="0.8" fill="'));
  zip.file('[Content_Types].xml',(await zip.file('[Content_Types].xml').async('string')).replace('</Types>','<Default Extension="svg" ContentType="image/svg+xml"/></Types>'));
  for (let i=1;i<=3;i++) {
    zip.file(`ppt/slides/slide${i}.xml`,slide(
      text(2,10,run('Page ')+field('slidenum','93',1)+run(' / saved ')+field('datetime1','2001-02-03',2)+run(' end'))+
      text(3,150,field('slidenum','91',3)+field('slidenum','92',4))+
      text(4,290,run('Before')+'<a:br/><a:br/>'+run('After'))+
      picture(10,20,35000)+picture(11,150,null,'flipH="1"')+picture(12,280,50000,'flipH="true"',triangle)+
      picture(13,410,0)+picture(14,540,'50%')+picture(15,670,null,'flipV="1"',triangle,'<a:srcRect l="50000"/>')+
      picture(16,20,[50000,50000],'','','',570)+picture(17,150,200000,'','','',570,'rIdTranslucent')+
      picture(18,280,[200000,50000],'','','',570,'rIdStrong')+picture(19,410,null,'flipH="1" rot="5400000"','','',570)+
      rect(70,1140,430,'00FF00')
    ));
    const relpath=`ppt/slides/_rels/slide${i}.xml.rels`;
    zip.file(relpath,(await zip.file(relpath).async('string')).replace('</Relationships>',`<Relationship Id="rIdPicture" Type="${R}/image" Target="../media/picture.svg"/><Relationship Id="rIdTranslucent" Type="${R}/image" Target="../media/translucent.svg"/><Relationship Id="rIdStrong" Type="${R}/image" Target="../media/strong.svg"/></Relationships>`));
  }
  let master=await zip.file('ppt/slideMasters/slideMaster1.xml').async('string');
  master=master.replace(/<p:spTree>.*?<\/p:spTree>/s,tree(Array.from({length:8},(_,i)=>rect(40+i,980,430,'FF0000')).join('')));
  zip.file('ppt/slideMasters/slideMaster1.xml',master);
  let layout=await zip.file('ppt/slideLayouts/slideLayout1.xml').async('string');
  layout=layout.replace(/<p:spTree>.*?<\/p:spTree>/s,tree(rect(60,980,430,'0000FF')+rect(61,1140,430,'0000FF')));
  zip.file('ppt/slideLayouts/slideLayout1.xml',layout);
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
const compiled=await build({stdin:{contents:`import process from './packages/renderers/pptx/src/engine/process.js';import {createDefaultPptxOptions} from './packages/renderers/pptx/src/options.ts';import {pptxViewerCss} from './packages/renderers/pptx/src/styles.ts';import {sanitizePptxCss,sanitizePptxMarkup} from './packages/renderers/pptx/src/sanitize.ts';import {PptxViewer} from './packages/renderers/pptx/src/viewer.ts';window.review={process,createDefaultPptxOptions,pptxViewerCss,sanitizePptxCss,sanitizePptxMarkup,PptxViewer};`,resolveDir:root,loader:'ts'},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'warning'});
const workerBundle=await build({entryPoints:[path.join(root,'packages/renderers/pptx/src/worker-entry.ts')],bundle:true,platform:'browser',format:'iife',write:false,logLevel:'warning'});
const workerSource=process.env.PPTX_DRAWING_WORKER_FILE?await readFile(path.resolve(process.env.PPTX_DRAWING_WORKER_FILE),'utf8'):workerBundle.outputFiles[0].text;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const checks=[],originals=[],errors=[],external=[];
const check=async(name,fn)=>{try{await fn();checks.push({name,status:'pass'});console.log('PASS '+name);}catch(e){checks.push({name,status:'fail',error:String(e)});console.log('FAIL '+name+' '+e.message);}};
try {
  const page=await browser.newPage({viewport:{width:1300,height:780},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
  await page.setContent('<!doctype html><style>body{margin:0}</style><div id="root"></div>');
  await page.addScriptTag({content:compiled.outputFiles[0].text});
  async function mount(bytes, useWorker = false) {
    return page.evaluate(async ({bytes,useWorker,workerSource})=>{
      let callback;const messages=[];
      const request={type:'processPPTX',data:Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,options:review.createDefaultPptxOptions()};
      if(useWorker){
        const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));const worker=new Worker(url);
        try {await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('Worker timed out')),30000);
          worker.onmessage=({data})=>{messages.push(data);if(data.type==='ExecutionTime'){clearTimeout(timer);resolve();}else if(data.type==='ERROR'){clearTimeout(timer);reject(Error(JSON.stringify(data)));}};
          worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.postMessage(request,[request.data]);
        });}finally{worker.terminate();URL.revokeObjectURL(url);}
      }else{review.process(fn=>callback=fn,m=>messages.push(m));await callback(request);}
      const failures=messages.filter(m=>['ERROR','error','slide-error'].includes(m.type));if(failures.length)throw Error(JSON.stringify(failures));
      root.replaceChildren();const style=document.createElement('style'),content=document.createElement('div');content.className='flyfish-pptx-content';
      style.textContent=review.pptxViewerCss+review.sanitizePptxCss(document,messages.find(m=>m.type==='globalCSS')?.data||'');
      for(const slide of messages.filter(m=>m.type==='slide'))content.append(review.sanitizePptxMarkup(document,slide.data));root.append(style,content);
      await document.fonts.ready;
      await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode()));
      await new Promise(r=>setTimeout(r,100));
      return messages.filter(m=>m.type==='slide').map(m=>({number:m.slide_num,html:m.data}));
    },{bytes:bytes.toString('base64'),useWorker,workerSource:useWorker?workerSource:''});
  }
  const bytes=await fixture();await writeFile(path.join(output,'generated.pptx'),bytes);
  const slides=await mount(bytes);
  const texts=await page.locator('.slide').evaluateAll(slides=>slides.map(s=>[...s.querySelectorAll('.slide-prgrph')].map(p=>p.textContent)));
  await check('Mixed fields retain XML run order and use display numbering starting at zero',()=>assert.deepEqual(texts.map(t=>t[0]),['Page 0 / saved 2001-02-03 end','Page 1 / saved 2001-02-03 end','Page 2 / saved 2001-02-03 end']));
  await check('Field-only paragraphs preserve every field',()=>assert.deepEqual(texts.map(t=>t[1]),['00','11','22']));
  await check('Display numbering does not change navigation indices',()=>assert.deepEqual(slides.map(s=>s.number),[1,2,3]));
  await check('Two consecutive authored breaks survive',async()=>assert.equal(await page.locator('.slide').first().locator('.line-break-br').count(),2));
  const screenshot=await page.screenshot({path:path.join(output,'generated.png')});
  const pixels=await page.evaluate(async base=>{const i=new Image();i.src='data:image/png;base64,'+base;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return [[30,440],[160,440],[290,480],[370,440],[420,440],[550,440],[1020,470],[720,440],[680,520],[30,580],[160,580],[290,580],[420,580],[420,650],[1180,470]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]);},screenshot.toString('base64'));
  const near=(actual,expected)=>expected.forEach((x,i)=>assert.ok(Math.abs(actual[i]-x)<=3,JSON.stringify({actual,expected})));
  await check('Bitmap alpha scales only image pixels',()=>near(pixels[0],[255,166,166,255]));
  await check('Picture horizontal flip applies around the picture viewport',()=>near(pixels[1],[0,0,255,255]));
  await check('Custom geometry and image flip share a coordinate system',()=>{near(pixels[2],[255,255,255,255]);near(pixels[3],[255,127,127,255]);});
  await check('Zero opacity remains fully transparent',()=>near(pixels[4],[255,255,255,255]));
  await check('Percentage-form image alpha is interpreted as a percentage',()=>near(pixels[5],[255,127,127,255]));
  await check('Layout paint stays above master regardless of part-local order',()=>near(pixels[6],[0,0,255,255]));
  await check('Vertical flip keeps the authored crop inside the transformed custom mask',()=>{near(pixels[7],[255,255,255,255]);near(pixels[8],[0,0,255,255]);});
  await check('Repeated alpha modulation composes without erasing intrinsic image alpha',()=>near(pixels[9],[255,191,191,255]));
  await check('Alpha amplification acts on pixel alpha rather than CSS opacity clamping',()=>near(pixels[10],[255,51,51,255]));
  await check('Amplification then attenuation preserves intermediate alpha saturation',()=>near(pixels[11],[255,127,127,255]));
  await check('Picture rotation composes with its authored local flip',()=>{near(pixels[12],[0,0,255,255]);near(pixels[13],[255,0,0,255]);});
  await check('Slide-local drawing remains above layout and master stacking contexts',()=>near(pixels[14],[0,255,0,255]));
  await check('First-slide metadata accepts the full signed schema range and rejects malformed values',()=>{
    for(const [input,expected]of [[undefined,1],['',1],[0,0],[-1,-1],['+7',7],[-2147483648,-2147483648],[2147483647,2147483647],[2147483648,1],[-2147483649,1],['7.5',1],['NaN',1]])assert.equal(getFirstSlideNumber(input),expected,String(input));
  });
  await check('Mixed XML sequence retains field styling without mutating shared layout nodes',()=>{
    const p={'a:r':[{attrs:{order:1},'a:t':'A'},{attrs:{order:4},'a:t':'B'}],'a:fld':{attrs:{order:2,type:'slidenum'},'a:rPr':{attrs:{b:'1'}}},'a:br':{attrs:{order:3}}};
    const saved=JSON.stringify(p),runs=getDrawingTextRuns(p);assert.equal(JSON.stringify(p),saved);
    assert.deepEqual(runs.map(r=>r.attrs.order),[1,2,3,4]);assert.equal(runs[1]['a:rPr'].attrs.b,'1');assert.equal(runs[2].type,'br');
  });
  await check('Malformed alpha never injects markup or non-finite filter coefficients',()=>{
    const e=getPictureEffects({'a:alphaModFix':[{attrs:{amt:'bad'}},{attrs:{amt:'-100'}},{attrs:{amt:'1e999'}}]},'bad');assert.deepEqual(e,{style:'',definitions:''});
    assert.ok(!getPictureEffects({'a:alphaModFix':{attrs:{amt:200000}}},'bad\"/><script>').definitions.includes('<script>'));
  });
  await check('Actual classic Worker retains display numbers, field order, breaks and picture effects',async()=>{
    const workerSlides=await mount(bytes,true);const workerTexts=await page.locator('.slide').evaluateAll(ss=>ss.map(s=>[...s.querySelectorAll('.slide-prgrph')].map(p=>p.textContent)));
    assert.deepEqual(workerTexts,texts);assert.deepEqual(workerSlides.map(s=>s.number),[1,2,3]);
    assert.equal(await page.locator('.slide').first().locator('.line-break-br').count(),2);
    assert.equal(await page.locator('.slide').first().locator('img').first().evaluate(i=>getComputedStyle(i).opacity),'0.35');
    assert.equal(await page.locator('.pptx-master-layer').count(),3);
  });
  for(const [first,expected]of [[7,7],[-1,-1],[null,1]])await check(`Sequential document load resets display numbering (${first})`,async()=>{
    await mount(await fixture(first));assert.equal(await page.locator('.slide').first().locator('.slide-prgrph').first().textContent(),`Page ${expected} / saved 2001-02-03 end`);
  });
  await check('Master visibility suppression leaves layout paint and slide text intact',async()=>{
    const z=await JSZip.loadAsync(bytes);const n='ppt/slides/slide1.xml';z.file(n,(await z.file(n).async('string')).replace('<p:sld ','<p:sld showMasterSp="0" '));
    await mount(await z.generateAsync({type:'nodebuffer'}));assert.equal(await page.locator('.slide').first().locator('.pptx-master-layer').count(),0);
    assert.equal(await page.locator('.slide').first().locator('.pptx-layout-layer').count(),1);
    assert.equal(await page.locator('.slide').first().locator('.slide-prgrph').first().textContent(),'Page 0 / saved 2001-02-03 end');
  });
  await writeFile(path.join(output,'observed.json'),JSON.stringify({texts,pixels},null,2));

  async function originalPictureFacts(bytes) {
    const zip=await JSZip.loadAsync(bytes), parts={};
    for(const name of Object.keys(zip.files))if(/^ppt\/(presentation\.xml|.*\.rels|slides\/slide\d+\.xml|slideLayouts\/slideLayout\d+\.xml)$/.test(name))parts[name]=await zip.file(name).async('string');
    return page.evaluate(({parts,A,P,R})=>{
      const xml=name=>new DOMParser().parseFromString(parts[name],'application/xml');
      const elements=(el,ns,local)=>[...el.getElementsByTagNameNS(ns,local)];
      const rels=name=>name.replace(/([^/]+)$/,'_rels/$1.rels');
      const normalize=name=>{const pieces=[];for(const s of name.split('/')){if(s==='..')pieces.pop();else if(s!=='.'&&s!=='')pieces.push(s);}return pieces.join('/');};
      const relations=name=>elements(xml(rels(name)),'http://schemas.openxmlformats.org/package/2006/relationships','Relationship');
      const target=(name,rel)=>normalize(name.slice(0,name.lastIndexOf('/')+1)+rel.getAttribute('Target'));
      const slideParts=elements(xml('ppt/presentation.xml'),P,'sldId').map(n=>target('ppt/presentation.xml',relations('ppt/presentation.xml').find(r=>r.getAttribute('Id')===n.getAttributeNS(R,'id'))));
      return slideParts.map(name=>{
        const relationship=relations(name).find(r=>r.getAttribute('Type')===R+'/slideLayout');
        const layout=target(name,relationship);
        return elements(xml(layout),P,'pic').map(pic=>{
          const xf=elements(pic,A,'xfrm')[0],blip=elements(pic,A,'blip')[0];
          const alpha=elements(blip,A,'alphaModFix').reduce((value,e)=>value*Number(e.getAttribute('amt'))/100000,1);
          const h=['1','true'].includes(xf?.getAttribute('flipH'))?-1:1,v=['1','true'].includes(xf?.getAttribute('flipV'))?-1:1;
          const angle=Number(xf?.getAttribute('rot')||0)/60000*Math.PI/180;
          return {alpha,matrix:[Math.cos(angle)*h,Math.sin(angle)*h,-Math.sin(angle)*v,Math.cos(angle)*v,0,0],customMask:elements(pic,A,'custGeom').length>0};
        });
      });
    },{parts,A,P,R});
  }
  if(process.env.PPTX_DRAWING_CORPUS_DIR){
    const manifest=JSON.parse(await readFile(path.join(process.env.PPTX_DRAWING_CORPUS_DIR,'manifest.json'),'utf8'));
    for(const item of manifest){
      const original=await readFile(path.join(process.env.PPTX_DRAWING_CORPUS_DIR,item.id+'.pptx'));
      assert.equal(createHash('sha256').update(original).digest('hex'),item.sha256);
      const rendered=await mount(original);
      const data=await page.locator('.slide').evaluateAll(slides=>slides.map(s=>({text:s.textContent,fields:[...s.querySelectorAll('[data-pptx-field=slidenum]')].map(f=>f.textContent),images:s.querySelectorAll('img,image').length,alphas:[...s.querySelectorAll('img,image')].map(i=>getComputedStyle(i).opacity),transforms:[...s.querySelectorAll('.block.content')].map(i=>getComputedStyle(i).transform).filter(x=>x!=='matrix(1, 0, 0, 1, 0, 0)'),layerCount:s.querySelectorAll('.pptx-master-layer,.pptx-layout-layer').length})));
      if(['C010','C008'].includes(item.id))await check(`${item.id}: authored layout image alpha, local flips and custom masks match original XML`,async()=>{
        const expected=await originalPictureFacts(original);
        const actual=await page.locator('.slide').evaluateAll(ss=>ss.map(s=>[...s.querySelectorAll('.pptx-layout-layer img,.pptx-layout-layer image')].map(img=>{
          const b=img.closest('.block.content'),m=new DOMMatrixReadOnly(getComputedStyle(b).transform);
          return {alpha:Number(getComputedStyle(img).opacity),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],customMask:img.localName==='image'&&img.hasAttribute('clip-path')};
        })));
        assert.equal(actual.length,expected.length);
        expected.forEach((pics,i)=>{assert.equal(actual[i].length,pics.length);pics.forEach((pic,j)=>{
          assert.equal(actual[i][j].alpha,pic.alpha);assert.equal(actual[i][j].customMask,pic.customMask);
          pic.matrix.forEach((n,k)=>assert.ok(Math.abs(actual[i][j].matrix[k]-n)<1e-5));
        });});
      });
      if(['C045','C044','C041','C049'].includes(item.id))await check(`${item.id}: visible page fields retain presentation order`,()=>{
        // Each of these byte-pinned originals has a normal one-based start and at least one visible page field.
        assert.ok(data.some(s=>s.fields.length));data.forEach((s,i)=>s.fields.forEach(n=>assert.equal(n,String(i+1))));
      });
      originals.push({...item,pages:rendered.length,details:data.map(({text,...rest})=>({...rest,textSha256:createHash('sha256').update(text).digest('hex')}))});
      if(['C010','C048','C015','C016'].includes(item.id))await page.screenshot({path:path.join(output,item.id+'.png')});
    }
    await check('Original corpus parses every supplied slide without a slide-error',()=>assert.equal(originals.reduce((n,r)=>n+r.pages,0),60));
  }
  await check('Public PptxViewer resolves the real Worker, sanitizes SVG filters and preserves drawing semantics',async()=>{
    const result=await page.evaluate(async({bytes,workerSource})=>{
      root.replaceChildren();const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));let viewer;
      try{
        let done,fail;const complete=new Promise((r,j)=>{done=r;fail=j;});
        const events=[];viewer=await review.PptxViewer.open(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,root,{fitMode:'none',lazySlides:false,workerFactory:()=>new Worker(url),onSlideRendered:i=>events.push(i),onError:fail,onSlideError:(_,e)=>fail(e),onRenderComplete:done});
        let timer;try{await Promise.race([complete,new Promise((_,j)=>timer=setTimeout(()=>j(Error('Public viewer timed out')),30000))]);}finally{clearTimeout(timer);}
        const first=root.querySelector('.slide'),image=first.querySelector(':scope>.block.content img');
        return {events,count:viewer.slideCount,text:first.querySelector('.slide-prgrph').textContent,opacity:getComputedStyle(image).opacity,alphaStages:first.querySelectorAll('feComponentTransfer feFuncA').length,layers:first.querySelectorAll('.pptx-master-layer,.pptx-layout-layer').length};
      }finally{viewer?.destroy();URL.revokeObjectURL(url);}
    },{bytes:bytes.toString('base64'),workerSource});
    assert.deepEqual(result,{events:[1,2,3],count:3,text:'Page 0 / saved 2001-02-03 end',opacity:'0.35',alphaStages:3,layers:2});
    assert.equal(await page.locator('.flyfish-pptx-content').count(),0);
  });
  await check('No uncaught browser errors or external requests' ,()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
} finally {
  await browser.close();await rm(temp,{recursive:true,force:true});
  await writeFile(path.join(output,'report.json'),JSON.stringify({passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors,external,scope:'Drawing order, picture alpha/flip, dynamic text fields; not full Office pixel equivalence'},null,2)+'\n');
}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
