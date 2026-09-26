/** Read-only original acceptance for placeholder text position and picture overlap. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'../../../..'),pkg=path.join(root,'packages/renderers/pptx');
const require=createRequire(path.join(pkg,'package.json'));
const {build}=require('esbuild'),JSZip=require('jszip');
const {JSDOM}=createRequire(path.join(root,'packages/renderers/word/package.json'))('jsdom');
const corpus=process.env.PPTX_ORIGINAL_CORPUS_DIR;
assert.ok(corpus,'PPTX_ORIGINAL_CORPUS_DIR is required; missing originals cannot pass.');
const out=path.resolve(process.env.PPTX_ORIGINAL_OUTPUT||path.join(root,'output/pptx-original-text-overlays'));
await fs.mkdir(out,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<0.6,`${label}: ${a} vs ${b}`);
const A='http://schemas.openxmlformats.org/drawingml/2006/main',P='http://schemas.openxmlformats.org/presentationml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const all=(e,ns,n)=>[...e.getElementsByTagNameNS(ns,n)];
const child=(e,ns,n)=>[...(e?.children||[])].find(e=>e.namespaceURI===ns&&e.localName===n);
const xml=s=>new JSDOM(s,{contentType:'application/xml'});
async function reference(bytes){
  const zip=await JSZip.loadAsync(bytes),opened=[];
  const read=async p=>{const d=xml(await zip.file(p).async('string'));opened.push(d);return d.window.document;};
  try{
    const pres=await read('ppt/presentation.xml'),size=all(pres,P,'sldSz')[0];
    const slide=await read('ppt/slides/slide1.xml'),rels=await read('ppt/slides/_rels/slide1.xml.rels');
    const relation=id=>[...rels.documentElement.children].find(e=>e.getAttribute('Id')===id);
    const layoutRel=[...rels.documentElement.children].find(e=>e.getAttribute('Type').endsWith('/slideLayout'));
    const layout=await read(path.posix.normalize('ppt/slides/'+layoutRel.getAttribute('Target')));
    const shapes=[];
    for(const sp of [...all(slide,P,'spTree')[0].children].filter(e=>e.localName==='sp')){
      const body=child(sp,P,'txBody');if(!body)continue;
      const text=all(body,A,'t').map(e=>e.textContent).join('');if(!text.trim())continue;
      const xfrm=all(child(sp,P,'spPr'),A,'xfrm')[0],off=child(xfrm,A,'off'),ext=child(xfrm,A,'ext');
      assert.ok(off&&ext,'This group requires authored shape transforms.');
      const ph=all(sp,P,'ph')[0],match=all(layout,P,'sp').find(s=>all(s,P,'ph').some(p=>p.getAttribute('idx')===ph?.getAttribute('idx')&&p.getAttribute('type')===ph?.getAttribute('type')));
      const bodyPr=child(body,A,'bodyPr'),list=child(body,A,'lstStyle'),inheritedList=child(child(match,P,'txBody'),A,'lstStyle');
      const paragraphs=[...body.children].filter(e=>e.localName==='p').map(p=>{
        const prop=child(p,A,'pPr'),level=Number(prop?.getAttribute('lvl')||0)+1;
        const defaults=child(list,A,`lvl${level}pPr`)||child(inheritedList,A,`lvl${level}pPr`);
        const spacing=name=>{const group=child(prop,A,name)||child(defaults,A,name);const value=group?.firstElementChild;if(!value)return null;return {kind:value.localName,value:Number(value.getAttribute('val'))};};
        const runs=all(p,A,'r').map(r=>{const pr=child(r,A,'rPr');const sz=pr?.getAttribute('sz')||child(prop,A,'defRPr')?.getAttribute('sz')||child(defaults,A,'defRPr')?.getAttribute('sz');return {text:all(r,A,'t').map(e=>e.textContent).join(''),fontSize:sz?Number(sz)/75:null};});
        return {text:runs.map(r=>r.text).join(''),runs,line:spacing('lnSpc'),before:spacing('spcBef'),after:spacing('spcAft')};
      });
      shapes.push({x:Number(off.getAttribute('x'))/9525,y:Number(off.getAttribute('y'))/9525,width:Number(ext.getAttribute('cx'))/9525,height:Number(ext.getAttribute('cy'))/9525,text,paragraphs,insets:['tIns','rIns','bIns','lIns'].map((n,i)=>Number(bodyPr?.getAttribute(n)??([45720,91440,45720,91440][i]))/9525)});
    }
    const pictures=[];
    for(const pic of [...all(slide,P,'spTree')[0].children].filter(e=>e.localName==='pic')){
      const xfrm=all(pic,A,'xfrm')[0],off=child(xfrm,A,'off'),ext=child(xfrm,A,'ext'),blip=all(pic,A,'blip')[0];
      const r=relation(blip.getAttributeNS(R,'embed'));assert.ok(r&&r.getAttribute('TargetMode')!=='External');
      const data=await zip.file(path.posix.normalize('ppt/slides/'+r.getAttribute('Target'))).async('nodebuffer');
      pictures.push({x:Number(off.getAttribute('x'))/9525,y:Number(off.getAttribute('y'))/9525,width:Number(ext.getAttribute('cx'))/9525,height:Number(ext.getAttribute('cy'))/9525,sha256:sha(data)});
    }
    return {width:Number(size.getAttribute('cx'))/9525,height:Number(size.getAttribute('cy'))/9525,shapes,pictures};
  }finally{for(const d of opened)d.window.close();}
}
const pins=JSON.parse(await fs.readFile(path.join(root,'test/remaining-originals/identities.json'),'utf8')).filter(p=>['C015','C035'].includes(p.id));
assert.equal(pins.length,2);
const bundle=await build({stdin:{resolveDir:pkg,contents:"import {PptxViewer} from './src/viewer.ts';window.review={PptxViewer};"},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'warning'});
const production=path.join(pkg,'dist/worker/pptx.worker.js'),worker=await fs.readFile(production,'utf8');
assert.equal(sha(worker),sha(await fs.readFile(path.join(root,'apps/viewer-demo/public/vendor/pptx/pptx.worker.js'))),'The static Worker must match the owning package build.');
const checks=[],originals=[],errors=[],network=[];let completed=false;
async function check(name,fn){try{await fn();checks.push({name,status:'pass'});console.log('PASS',name);}catch(e){checks.push({name,status:'fail',error:e.message});throw e;}}
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
try{
  for(const pin of pins){
    const bytes=await fs.readFile(path.join(corpus,pin.id+pin.extension));assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);
    const expected=await reference(bytes);
    for(const dpr of [1,2]){
      const page=await browser.newPage({viewport:{width:1440,height:980},deviceScaleFactor:dpr});page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
      try{
        await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1440px;height:960px}</style><div id="host"></div>');
        await page.addScriptTag({content:bundle.outputFiles[0].text});
        await page.evaluate(async({data,worker})=>{
          window.workerUrl=URL.createObjectURL(new Blob([worker],{type:'application/javascript'}));window.messages=[];window.activeWorkers=0;
          const NativeWorker=Worker;
          let done,fail;const complete=new Promise((r,j)=>{done=r;fail=j});
          window.viewer=await review.PptxViewer.open(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,host,{fitMode:'none',lazySlides:false,workerFactory:()=>{const w=new NativeWorker(workerUrl),terminate=w.terminate.bind(w);activeWorkers++;w.addEventListener('message',e=>messages.push(e.data?.type));w.terminate=()=>{if(!w.stopped){w.stopped=true;activeWorkers--;}terminate();};return w;},onRenderComplete:done,onError:fail,onSlideError:(_,e)=>fail(e)});
          await complete;await document.fonts.ready;await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));
          window.measure=async()=>{
            const slide=host.querySelector('.slide'),s=slide.getBoundingClientRect(),scale=s.width/slide.offsetWidth;
            const box=e=>{const b=e.getBoundingClientRect();return{x:(b.x-s.x)/scale,y:(b.y-s.y)/scale,width:b.width/scale,height:b.height/scale};};
            const shapes=[...slide.querySelectorAll(':scope>.block.content')].filter(e=>e.textContent.trim()).map(e=>({box:box(e),paragraphs:[...e.querySelectorAll('.slide-prgrph')].map(p=>({box:box(p),text:[...p.querySelectorAll('.text-block')].map(e=>e.textContent).join(''),runs:[...p.querySelectorAll('.text-block')].map(r=>({text:r.textContent,fontSize:parseFloat(getComputedStyle(r).fontSize),glyphs:[...(()=>{const range=document.createRange();range.selectNodeContents(r);return range.getClientRects();})()].map(b=>({x:(b.x-s.x)/scale,y:(b.y-s.y)/scale,width:b.width/scale,height:b.height/scale}))}))}))}));
            const images=await Promise.all([...slide.querySelectorAll(':scope>.block>img')].map(async i=>({box:box(i),bytes:[...new Uint8Array(await(await fetch(i.src)).arrayBuffer())],decoded:i.naturalWidth>0&&i.naturalHeight>0,zIndex:Number(getComputedStyle(i.parentElement).zIndex)})));
            return{width:slide.offsetWidth,height:slide.offsetHeight,scale,shapes,images,messages};
          };
        },{data:bytes.toString('base64'),worker});
        await check(`${pin.id} DPR ${dpr}: authored transforms, run fonts and content survive production Worker`,async()=>{
          const actual=await page.evaluate(()=>measure());assert.equal(actual.shapes.length,expected.shapes.length);assert.ok(actual.messages.length>0&&actual.messages.some(t=>String(t).includes('slide')));
          near(actual.width,expected.width,'paper width');near(actual.height,expected.height,'paper height');
          actual.shapes.forEach((s,i)=>{for(const key of ['x','y','width','height'])near(s.box[key],expected.shapes[i][key],'shape '+key);assert.equal(s.paragraphs.length,expected.shapes[i].paragraphs.length);s.paragraphs.forEach((p,j)=>{const exp=expected.shapes[i].paragraphs[j];assert.equal(sha(p.text),sha(exp.text),'paragraph text hash');assert.equal(p.runs.length,exp.runs.length);p.runs.forEach((r,k)=>{if(exp.runs[k].fontSize!==null)near(r.fontSize,exp.runs[k].fontSize,'authored run size');});});});
        });
        const geometry=[];
        for(const zoom of [100,50,200,88,100]){
          await page.evaluate(async z=>{await viewer.setZoom(z);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},zoom);
          const actual=await page.evaluate(()=>measure());
          await check(`${pin.id} DPR ${dpr} zoom ${zoom}: original text and image placement have no unintended overlap`,()=>{
            near(actual.scale,zoom/100,'zoom');assert.equal(actual.shapes.length,expected.shapes.length);
            actual.shapes.forEach((s,i)=>{for(const key of ['x','y','width','height'])near(s.box[key],expected.shapes[i][key],'unscaled shape '+key);s.paragraphs.forEach((p,j)=>assert.equal(sha(p.text),sha(expected.shapes[i].paragraphs[j].text),'zoom text integrity'));});
            if(pin.id==='C015'){
              const source=expected.shapes[1],placed=actual.shapes[1];assert.equal(source.paragraphs.length,3);
              let y=source.y+source.insets[0];
              for(let i=0;i<source.paragraphs.length;i++){
                const p=source.paragraphs[i],got=placed.paragraphs[i],font=Math.max(...p.runs.map(r=>r.fontSize));
                assert.equal(p.line.kind,'spcPct');assert.equal(p.after.kind,'spcPts');assert.equal(p.before.value,0);
                const line=font*p.line.value/100000;
                near(got.box.x,source.x+source.insets[3],'placeholder content origin');near(got.box.y,y,'paragraph baseline region');near(got.box.height,line,'line box');
                for(const r of got.runs)for(const glyph of r.glyphs)assert.ok(glyph.y>=0&&glyph.y+glyph.height<actual.height,'Date and all placeholder glyphs stay on the slide.');
                y+=line+p.after.value/75;
              }
            }else{
              assert.equal(actual.images.length,expected.pictures.length);assert.equal(actual.images.length,1);
              const image=actual.images[0],source=expected.pictures[0];assert.ok(image.decoded);assert.equal(sha(Uint8Array.from(image.bytes)),source.sha256);
              for(const key of ['x','y','width','height'])near(image.box[key],source[key],'picture '+key);
              const body=actual.shapes[1];
              for(const p of body.paragraphs)for(const r of p.runs)for(const g of r.glyphs){
                const overlap=Math.min(g.x+g.width,image.box.x+image.box.width)>Math.max(g.x,image.box.x)&&Math.min(g.y+g.height,image.box.y+image.box.height)>Math.max(g.y,image.box.y);
                assert.equal(overlap,false,'The actual body glyph rectangle must not be obscured by the picture.');
              }
            }
          });
          geometry.push({zoom,shapes:actual.shapes.map(s=>({box:s.box,paragraphs:s.paragraphs.map(p=>({box:p.box,textSha256:sha(p.text)}))})),pictures:actual.images.map(i=>({box:i.box,sha256:sha(Uint8Array.from(i.bytes))}))});
        }
        await check(`${pin.id} DPR ${dpr}: destroy releases the actual Worker and slide DOM`,async()=>{const result=await page.evaluate(()=>{viewer.destroy();URL.revokeObjectURL(workerUrl);return{workers:activeWorkers,children:host.childElementCount};});assert.deepEqual(result,{workers:0,children:0});});
        originals.push({id:pin.id,sha256:pin.sha256,dpr,pages:1,geometry});
      }finally{await page.close();}
    }
  }
  await check('No external loads or unhandled browser errors',()=>{assert.deepEqual(network,[]);assert.deepEqual(errors,[]);});completed=true;
}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,externalRequestCount:network.length,errors},null,2)+'\n');}
