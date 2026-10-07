import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root=path.resolve(import.meta.dirname,'../../../..');
const require=createRequire(path.join(root,'package.json'));
const {build}=require('esbuild'),{chromium}=require('playwright'),JSZip=require('jszip');
const {DOMParser}=require('@xmldom/xmldom');
const output=path.join(root,'output/ofd-original-layout');await fs.mkdir(output,{recursive:true});
const samples={C002:'59eb2d321eedf6b3feaedd52af8f57fee70bbd9c920cd8182eadb6cbffb7f597',C003:'afd2fe0ca524f7a981f0581e77809c8f0ac4b38515971e35df44b6813a88c928',C004:'4d2476dce9e54b29a3a16ff0beef268ad230b9a36ee2aef34889e5a0fdc3b139',C062:'d2f0c8f76f83b9a49de0df7c663742fff625daed5edc4cee6cc6d58df63719cd',C063:'1868aec4acb9a8767e99b14f3e914e19d7fce7d61cbdfbb69d35926e69750629',C065:'f97fa3593cdabd2aaf34864325f800bb6b7523e04e27aa7c15f246f5c69f8e38'};
const found=new Map();
async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await scan(p);else if(e.isFile()&&/\.ofd$/i.test(e.name)){const stat=await fs.stat(p);if(stat.size>2*1024*1024)continue;const data=await fs.readFile(p),hash=createHash('sha256').update(data).digest('hex');if(Object.values(samples).includes(hash))found.set(hash,data)}}}
if(!process.env.OFD_SAMPLE_DIRECTORY)throw Error('Set OFD_SAMPLE_DIRECTORY to the extracted acceptance package. Original files are required, not substituted.');
await scan(process.env.OFD_SAMPLE_DIRECTORY);
assert.equal(found.size,6,'All six hash-identified originals are required');
const ns='http://www.ofdspec.org/2016';
const descendants=(node,name)=>Array.from(node.getElementsByTagNameNS(ns,name));
const numbers=s=>String(s||'').trim().split(/\s+/).map(Number);
const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const resolve=(base,relative)=>path.posix.normalize(relative.startsWith('/')?relative.slice(1):path.posix.join(path.posix.dirname(base),relative));
async function sourceModel(bytes){
  const zip=await JSZip.loadAsync(bytes),read=async p=>xml(await zip.file(p).async('string'));
  const main=await read('OFD.xml'),docPath=descendants(main,'DocRoot')[0].textContent.trim().replace(/^\/+/,''),doc=await read(docPath);
  const commonBox=numbers(descendants(doc,'PhysicalBox')[0].textContent);
  const templates=new Map(descendants(doc,'TemplatePage').map(t=>[t.getAttribute('ID'),resolve(docPath,t.getAttribute('BaseLoc'))]));
  const models=[];
  for(const declaration of descendants(doc,'Pages')[0].childNodes){
    if(declaration.nodeType!==1)continue;
    const page=await read(resolve(docPath,declaration.getAttribute('BaseLoc'))),boxNode=descendants(page,'PhysicalBox')[0];
    const all=[page];for(const t of descendants(page,'Template'))all.push(await read(templates.get(t.getAttribute('TemplateID'))));
    const objects=all.flatMap(p=>descendants(p,'TextObject')).flatMap(o=>descendants(o,'TextCode').map(t=>({text:t.textContent,x:t.getAttribute('X')||'0',y:t.getAttribute('Y')||'0',dx:t.getAttribute('DeltaX'),dy:t.getAttribute('DeltaY'),box:numbers(o.getAttribute('Boundary')),ctm:o.getAttribute('CTM')})));
    const paths=all.flatMap(p=>descendants(p,'PathObject')).map(e=>descendants(e,'AbbreviatedData')[0]?.textContent||'');
    models.push({id:declaration.getAttribute('ID'),box:boxNode?numbers(boxNode.textContent):commonBox,objects,pathCount:paths.length,quadratics:paths.reduce((n,s)=>n+(s.match(/\bQ\b/g)||[]).length,0)});
  }
  return models;
}
const bundled=await build({stdin:{contents:`import * as ofd from './packages/renderers/ofd/vendor/dltech/ofd/ofd.js';globalThis.originalOfd=ofd;`,resolveDir:root},bundle:true,format:'iife',write:false,logLevel:'silent'});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const report={samples:[],completed:false,scope:'Original page order, exact text/advances/CTM, glyph pixels, image loading and geometry. Stamp appearance is not cryptographic verification.'};
try{for(const [id,hash] of Object.entries(samples)){
  const bytes=found.get(hash),source=await sourceModel(bytes),runs=[];
  for(const width of [850,320]){
    const page=await browser.newPage({viewport:{width:1000,height:1350},deviceScaleFactor:2}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
    await page.route('**/*',r=>/^https?:/.test(r.request().url())?r.abort():r.continue());
    await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#root{width:max-content}</style><div id="root"></div>');await page.addScriptTag({content:bundled.outputFiles[0].text});
    await page.evaluate(async({bytes,width})=>{const buffer=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer;const docs=await new Promise((success,fail)=>originalOfd.parseOfdDocument({ofd:buffer,success,fail}));document.querySelector('#root').replaceChildren(...docs.flatMap(d=>originalOfd.renderOfd(width,d)));await document.fonts.ready;await Promise.all(Array.from(document.images,i=>i.decode()));}, {bytes:bytes.toString('base64'),width});
    const pages=page.locator('#root > div');assert.equal(await pages.count(),source.length,id);
    const result=await pages.evaluateAll((pages,{source,width})=>{
      const positions=(start,delta,count,scale)=>{let n=Number(start),v=[n*scale],tokens=String(delta||'').trim().split(/\s+/).filter(Boolean);for(let i=0;i<tokens.length;){let count=1;if(tokens[i]==='g'){count=Number(tokens[i+1]);i+=2;}const d=Number(tokens[i++]);if(!Number.isFinite(d)||count<0||count>100000)throw Error('Invalid original delta');while(count-->0){n+=d;v.push(n*scale)}}return v.slice(0,count)};
      const near=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<.002);
      return pages.map((p,index)=>{
        const model=source[index],scale=Math.min(5,(width-10)/model.box[2]);
        if(p.id!==model.id)throw Error('Original page order mismatch');
        if(Math.abs(parseFloat(p.style.width)-(model.box[2]*scale))>.02||Math.abs(parseFloat(p.style.height)-(model.box[3]*scale))>.02)throw Error('Page fit differs from original aspect ratio or available width');
        const nodes=Array.from(p.querySelectorAll('text')),used=new Set();let dots=0,dates=0;
        for(const o of model.objects){
          const node=nodes.find(t=>!used.has(t)&&t.textContent===o.text&&Math.abs(parseFloat(t.parentElement.style.left)-o.box[0]*scale)<.02&&Math.abs(parseFloat(t.parentElement.style.top)-o.box[1]*scale)<.02);
          if(!node)throw Error('Missing or displaced original text object');used.add(node);
          const read=k=>node.getAttribute(k).trim().split(/\s+/).map(Number);
          if(!near(read('x'),positions(o.x,o.dx,Array.from(o.text).length,scale))||!near(read('y'),positions(o.y,o.dy,Array.from(o.text).length,scale)))throw Error('Original text advance mismatch');
          if(o.ctm){const c=o.ctm.trim().split(/\s+/).map(Number),m=node.transform.baseVal.consolidate().matrix;if(!near([m.a,m.b,m.c,m.d,m.e,m.f],[...c.slice(0,4),c[4]*scale,c[5]*scale]))throw Error('Original CTM mismatch');}
          if(node.textContent==='·')dots++;
          if(/^\s{2,}2025$/.test(o.text)){dates++;if(node.getAttribute('xml:space')!=='preserve')throw Error('Date whitespace not retained');}
        }
        const invalid=Array.from(p.querySelectorAll('*')).some(e=>Array.from(e.attributes).some(a=>['d','x','y','width','height','transform','style'].includes(a.name)&&/\b(?:NaN|Infinity)\b/.test(a.value)));
        if(invalid)throw Error('Invalid rendered geometry');
        const paths=Array.from(p.querySelectorAll('path'));if(paths.length<model.pathCount)throw Error(`Missing original paths: ${paths.length}/${model.pathCount}`);
        const quadraticCount=paths.reduce((n,e)=>n+(e.getAttribute('d').match(/Q/g)||[]).length,0);if(quadraticCount<model.quadratics)throw Error('Missing quadratic glyph outlines');
        const images=Array.from(p.querySelectorAll('img'));if(images.some(i=>!i.complete||i.naturalWidth===0))throw Error('Broken original image');
        return {pageId:p.id,textRuns:used.size,dots,dates,images:images.length,seals:p.querySelectorAll('[name="seal_img_div"]').length,quadraticCount,width:parseFloat(p.style.width),height:parseFloat(p.style.height)};
      });
    },{source,width});
    if(width===850){
      let visibleDots=0;
      for(let i=0;i<source.length;i++){
        const element=pages.nth(i),png=await element.screenshot();
        if(process.env.OFD_CAPTURE_PAGES==='1')await fs.writeFile(path.join(output,`${id}-${i+1}.png`),png);
        const pixelResult=await element.evaluate(async(p,b64)=>{
          const rect=p.getBoundingClientRect(),dots=Array.from(p.querySelectorAll('text')).filter(t=>t.textContent==='·');
          const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();
          const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const scale=canvas.width/rect.width;
          return dots.map(t=>{const r=t.getBoundingClientRect(),x=Math.max(0,Math.floor((r.x-rect.x)*scale)),y=Math.max(0,Math.floor((r.y-rect.y)*scale)),w=Math.min(canvas.width-x,Math.ceil(r.width*scale)),h=Math.min(canvas.height-y,Math.ceil(r.height*scale));if(w<=0||h<=0)return 0;const data=ctx.getImageData(x,y,w,h).data;let ink=0;for(let k=0;k<data.length;k+=4)if(data[k+3]>0&&Math.min(data[k],data[k+1],data[k+2])<160)ink++;return ink;});
        },png.toString('base64'));
        assert.ok(pixelResult.every(n=>n>0),`${id} missing actual middle-dot pixels`);visibleDots+=pixelResult.length;
      }
      assert.equal(visibleDots,result.reduce((n,p)=>n+p.dots,0));
    }
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);runs.push({width,pages:result});await page.close();
  }
  report.samples.push({id,sha256:hash,runs});console.log('PASS',id,source.length,'pages; two widths; original text, outlines and pixels');
}report.completed=true;}finally{await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n')}
