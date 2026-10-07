/** Check source-defined diagram text rectangles; optional originals remain read-only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {resolveDiagramTextFrames,effectiveTextTransform} from '../src/engine/support/diagram-text.js';
import {makePresentation} from '../../../../test/compatibility-review/fixtures.mjs';
const root=path.resolve(import.meta.dirname,'../../../..'),pkg=path.join(root,'packages/renderers/pptx');
const out=path.resolve(process.env.PPTX_DIAGRAM_OUTPUT||'output/pptx-diagram-text');await fs.mkdir(out,{recursive:true});
const checks=[],originals=[],errors=[];let completed=false;
const check=async(name,fn)=>{try{await fn();checks.push({name,status:'pass'});console.log('PASS',name)}catch(e){checks.push({name,status:'fail',error:e.message});console.log('FAIL',name,e.message)}};
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.12,`${a} != ${b}`);
const attrs=x=>({attrs:x}),arr=x=>x==null?[]:Array.isArray(x)?x:[x];
const tr=(x,y,w,h)=>({'a:off':attrs({x:String(x),y:String(y)}),'a:ext':attrs({cx:String(w),cy:String(h)})});
function model(){
 const points=[attrs({modelId:'root',type:'doc'}),attrs({modelId:'real'})];
 const pres=(id,name)=>({attrs:{modelId:id,type:'pres'},'dgm:prSet':attrs({presName:name})});
 points.push(pres('v','visual'),pres('t','words'));
 const data={'dgm:dataModel':{'dgm:ptLst':{'dgm:pt':points},'dgm:cxnLst':{'dgm:cxn':[attrs({srcId:'root',destId:'real'}),attrs({srcId:'real',destId:'v',type:'presOf'}),attrs({srcId:'real',destId:'t',type:'presOf'})]}}};
 const constr=(n,k,f,ref=k==='t'||k==='h'?'h':'w')=>attrs({type:k,for:'ch',forName:n,refType:ref,fact:String(f)});
 const c=[constr('visual','l',.1),constr('visual','t',.1),constr('visual','w',.8),constr('visual','h',.8),constr('words','l',.2),constr('words','t',.3),constr('words','w',.2),constr('words','h',.1)];
 const layout={'dgm:layoutDef':{'dgm:layoutNode':{'dgm:alg':attrs({type:'composite'}),'dgm:choose':{'dgm:if':{attrs:{axis:'ch',ptType:'node',func:'cnt',op:'equ',val:'1'},'dgm:constrLst':{'dgm:constr':c}}},'dgm:layoutNode':{attrs:{name:'words',moveWith:'visual'},'dgm:alg':attrs({type:'tx'}),'dgm:shape':attrs({type:'rect',hideGeom:'1'})}}}};
 const shapes=[{attrs:{modelId:'v'},'p:spPr':{'a:xfrm':tr(100,200,800,400)},'p:txXfrm':tr(100,200,800,400)}];return{data,layout,shapes,c};
}
await check('Composite constraints resolve coordinates and independent axis scales',()=>{const m=model();assert.deepEqual(resolveDiagramTextFrames(m.shapes,m.data,m.layout).get('v'),tr(200,300,200,50))});
await check('moveWith retains authored drag offset',()=>{const m=model();m.shapes[0]['p:spPr']['a:xfrm']=tr(140,270,800,400);m.shapes[0]['p:txXfrm']=tr(140,270,800,400);assert.deepEqual(resolveDiagramTextFrames(m.shapes,m.data,m.layout).get('v'),tr(240,370,200,50))});
await check('Already independent cached text transform wins',()=>{const m=model();m.shapes[0]['p:txXfrm']=tr(500,500,200,50);assert.equal(resolveDiagramTextFrames(m.shapes,m.data,m.layout).size,0)});
await check('Presentation relationships, not names alone, establish text ownership',()=>{const m=model();m.data['dgm:dataModel']['dgm:cxnLst']['dgm:cxn'][2].attrs.srcId='other';assert.equal(resolveDiagramTextFrames(m.shapes,m.data,m.layout).size,0)});
await check('Unsupported algorithms and conditions retain the original drawing',()=>{const m=model();m.layout['dgm:layoutDef']['dgm:layoutNode']['dgm:alg'].attrs.type='cycle';assert.equal(resolveDiagramTextFrames(m.shapes,m.data,m.layout).size,0);m.layout['dgm:layoutDef']['dgm:layoutNode']['dgm:alg'].attrs.type='composite';m.layout['dgm:layoutDef']['dgm:layoutNode']['dgm:choose']['dgm:if'].attrs.func='var';assert.equal(resolveDiagramTextFrames(m.shapes,m.data,m.layout).size,0)});
await check('Ambiguous constraints, zero sizes and indirect references are not guessed',()=>{for(const change of [m=>m.c.push(m.c[4]),m=>m.c[6].attrs.fact='0',m=>m.c[6].attrs.refForName='other']){const m=model();change(m);assert.equal(resolveDiagramTextFrames(m.shapes,m.data,m.layout).size,0)}});
await check('Rotated and flipped shapes keep their cached diagram layout',()=>{for(const a of [{rot:'1200000'},{flipH:'1'},{flipV:'true'}]){const m=model();m.shapes[0]['p:spPr']['a:xfrm'].attrs=a;assert.equal(resolveDiagramTextFrames(m.shapes,m.data,m.layout).size,0)}});
await check('Partial explicit text transforms inherit only missing geometry',()=>{assert.deepEqual(effectiveTextTransform({'a:ext':attrs({cx:'300',cy:'50'})},tr(10,20,500,100)),tr(10,20,300,50));assert.deepEqual(effectiveTextTransform({'a:off':attrs({x:'30',y:'40'})},tr(10,20,500,100)),tr(30,40,500,100))});
await check('Invalid and nonfinite text rectangles keep the painted shape geometry',()=>{const shape=tr(10,20,500,100);for(const t of [tr(0,0,-1,2),tr('NaN',0,2,3),tr(0,0,'1e300',5)])assert.equal(effectiveTextTransform(t,shape),shape)});
await check('Constraint evaluation does not mutate cached source objects',()=>{const m=model(),before=JSON.stringify(m);resolveDiagramTextFrames(m.shapes,m.data,m.layout);assert.equal(JSON.stringify(m),before)});
const A='http://schemas.openxmlformats.org/drawingml/2006/main',P='http://schemas.openxmlformats.org/presentationml/2006/main',D='http://schemas.openxmlformats.org/drawingml/2006/diagram',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',DSP='http://schemas.microsoft.com/office/drawing/2008/diagram';
const xmlTr=(x,y,w,h,tag='a:xfrm')=>`<${tag}><a:off x="${x*9525}" y="${y*9525}"/><a:ext cx="${w*9525}" cy="${h*9525}"/></${tag}>`;
const sp=(id,model,text,tx)=>`<dsp:sp modelId="${model}"><dsp:nvSpPr><dsp:cNvPr id="${id}" name="Fixture"/><dsp:cNvSpPr/><dsp:nvPr/></dsp:nvSpPr><dsp:spPr>${xmlTr(20,20,400,200)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:solidFill><a:srgbClr val="102B40"/></a:solidFill></a:ln></dsp:spPr>${xmlTr(...tx,'dsp:txXfrm')}<dsp:txBody><a:bodyPr anchor="ctr" lIns="0" rIns="0" tIns="0" bIns="0"><a:noAutofit/></a:bodyPr><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="1400"/><a:t>${text}</a:t></a:r></a:p></dsp:txBody></dsp:sp>`;
const z=await JSZip.loadAsync(await makePresentation(JSZip));
for(let page=1;page<=3;page++){
 const shapes=page===1?[sp(2,'v0','Independent left',[20,20,400,200]),sp(3,'v1','Independent right',[20,20,400,200])]:[sp(2,'v0','Cached text viewport',[60,80,120,45])];
 z.file(`ppt/slides/slide${page}.xml`,`<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" xmlns:dgm="${D}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="2" name="Diagram"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>${xmlTr(50,40,450,260,'p:xfrm')}<a:graphic><a:graphicData uri="${D}"><dgm:relIds r:dm="dm" r:lo="lo" r:cs="cs" r:qs="qs"/></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>`);
 z.file(`ppt/slides/_rels/slide${page}.xml.rels`,`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="layout" Type="${R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="dm" Type="${R}/diagramData" Target="../diagrams/data${page}.xml"/><Relationship Id="lo" Type="${R}/diagramLayout" Target="../diagrams/layout${page}.xml"/><Relationship Id="cs" Type="${R}/diagramColors" Target="../diagrams/colors${page}.xml"/><Relationship Id="qs" Type="${R}/diagramQuickStyle" Target="../diagrams/quickStyle${page}.xml"/><Relationship Id="dr" Type="http://schemas.microsoft.com/office/2007/relationships/diagramDrawing" Target="../diagrams/drawing${page}.xml"/></Relationships>`);
 z.file(`ppt/diagrams/drawing${page}.xml`,`<dsp:drawing xmlns:dsp="${DSP}" xmlns:a="${A}"><dsp:spTree><dsp:nvGrpSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvGrpSpPr/><dsp:nvPr/></dsp:nvGrpSpPr><dsp:grpSpPr/>${shapes.join('')}</dsp:spTree></dsp:drawing>`);
 z.file(`ppt/diagrams/data${page}.xml`,`<dgm:dataModel xmlns:dgm="${D}"><dgm:ptLst><dgm:pt modelId="root" type="doc"/>${[0,1].map(i=>`<dgm:pt modelId="real${i}"/><dgm:pt modelId="v${i}" type="pres"><dgm:prSet presName="visual${i}"/></dgm:pt><dgm:pt modelId="t${i}" type="pres"><dgm:prSet presName="words${i}"/></dgm:pt>`).join('')}</dgm:ptLst><dgm:cxnLst>${[0,1].map(i=>`<dgm:cxn srcId="root" destId="real${i}"/><dgm:cxn type="presOf" srcId="real${i}" destId="v${i}"/><dgm:cxn type="presOf" srcId="real${i}" destId="t${i}"/>`).join('')}</dgm:cxnLst></dgm:dataModel>`);
 z.file(`ppt/diagrams/colors${page}.xml`,`<dgm:colorsDef xmlns:dgm="${D}"/>`);z.file(`ppt/diagrams/quickStyle${page}.xml`,`<dgm:styleDef xmlns:dgm="${D}"/>`);
 const cs=(name,k,f,ref=k==='t'||k==='h'?'h':'w')=>`<dgm:constr type="${k}" for="ch" forName="${name}" refType="${ref}" fact="${f}"/>`;
 z.file(`ppt/diagrams/layout${page}.xml`,`<dgm:layoutDef xmlns:dgm="${D}"><dgm:layoutNode name="parent"><dgm:alg type="composite"/><dgm:choose><dgm:if axis="ch" ptType="node" func="cnt" op="equ" val="2"><dgm:constrLst>${[0,1].map(i=>cs('visual'+i,'l',.04)+cs('visual'+i,'t',.08)+cs('visual'+i,'w',.8)+cs('visual'+i,'h',.8)+cs('words'+i,'l',.08+i*.44)+cs('words'+i,'t',.24)+cs('words'+i,'w',.28)+cs('words'+i,'h',.3)).join('')}</dgm:constrLst></dgm:if></dgm:choose>${[0,1].map(i=>`<dgm:layoutNode name="words${i}" moveWith="visual${i}"><dgm:alg type="tx"/><dgm:shape type="rect" hideGeom="1"/></dgm:layoutNode>`).join('')}</dgm:layoutNode></dgm:layoutDef>`);
}
const fixture=await z.generateAsync({type:'nodebuffer'});await fs.writeFile(path.join(out,'generated.pptx'),fixture);
const bundle=await build({stdin:{resolveDir:pkg,contents:`import {PptxViewer} from './src/viewer.ts';window.review={PptxViewer};`},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'warning'});
const worker=await fs.readFile(process.env.PPTX_DIAGRAM_WORKER||path.join(pkg,'dist/worker/pptx.worker.js'),'utf8');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
try{for(const dpr of [1,2]){
 const page=await browser.newPage({viewport:{width:1300,height:850},deviceScaleFactor:dpr});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.setContent('<!doctype html><style>body{margin:0}#root{width:1200px;height:800px}</style><div id="root"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 const mount=bytes=>page.evaluate(async({data,worker})=>{window.viewer?.destroy();root.replaceChildren();if(window.workerURL)URL.revokeObjectURL(window.workerURL);window.workerURL=URL.createObjectURL(new Blob([worker],{type:'text/javascript'}));let done,fail,timer;const complete=new Promise((a,b)=>{done=a;fail=b});try{window.viewer=await review.PptxViewer.open(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,root,{fitMode:'none',lazySlides:false,workerFactory:()=>new Worker(window.workerURL),onError:e=>fail(Error(JSON.stringify(e))),onSlideError:(_,e)=>fail(Error(JSON.stringify(e))),onRenderComplete:done});await Promise.race([complete,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Viewer timeout')),60000)})]);await document.fonts.ready;return viewer.slideCount;}finally{clearTimeout(timer)}},{data:bytes.toString('base64'),worker});
 await mount(fixture);
 const generated=await page.evaluate(()=>[...root.querySelectorAll('.slide')].map(s=>[...s.querySelectorAll('.diagram-content .block')].filter(b=>b.querySelector('.text-block')).map(b=>{const r=b.getBoundingClientRect(),p=b.closest('.diagram-content').getBoundingClientRect(),text=b.querySelector('.text-block').getBoundingClientRect();return{x:r.x-p.x,y:r.y-p.y,w:r.width,h:r.height,tx:text.x-r.x,ty:text.y-r.y,tw:text.width,th:text.height}})));
 await check(`DPR ${dpr}: source constraints position independent text boxes in the real Worker/viewer`,()=>{assert.equal(generated[0].length,2);for(let i=0;i<2;i++){const b=generated[0][i];near(b.x,40+220*i);near(b.y,60);near(b.w,140);near(b.h,75);assert.ok(b.tx>=-.1 && b.tx+b.tw<=b.w+.1)}});
 await check(`DPR ${dpr}: single cached shape and explicit text viewport remain visible`,()=>{for(const idx of [1,2]){assert.equal(generated[idx].length,1);const b=generated[idx][0];near(b.x,60);near(b.y,80);near(b.w,120);near(b.h,45)}});
 await check(`DPR ${dpr}: paragraph wrapping uses the text viewport instead of painted shape size`,()=>{for(const row of generated)for(const b of row){assert.ok(b.th<=b.h+.1);assert.ok(b.ty>=-.1)}});
 if(dpr===1)await page.locator('.slide').first().screenshot({path:path.join(out,'generated.png')});
 if(process.env.PPTX_DIAGRAM_ORIGINAL){
  const bytes=await fs.readFile(process.env.PPTX_DIAGRAM_ORIGINAL),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,'ff4ac0df803b5d07603e8b44c7759e275d1502506f72e2ef33e1f4de4b9ee5c3');
  const oz=await JSZip.loadAsync(bytes),xmls=await Promise.all(['drawing2','data2','layout2'].map(n=>oz.file(`ppt/diagrams/${n}.xml`).async('string')));await mount(bytes);
  const original=await page.evaluate(({drawing,data,layout})=>{
   const parse=s=>new DOMParser().parseFromString(s,'application/xml'),dg='http://schemas.openxmlformats.org/drawingml/2006/diagram',ds='http://schemas.microsoft.com/office/drawing/2008/diagram',a='http://schemas.openxmlformats.org/drawingml/2006/main';
   const draw=parse(drawing),model=parse(data),def=parse(layout);const pts=[...model.getElementsByTagNameNS(dg,'pt')],edges=[...model.getElementsByTagNameNS(dg,'cxn')],doc=pts.find(p=>p.getAttribute('type')==='doc'),byId=new Map(pts.map(p=>[p.getAttribute('modelId'),p]));
   const count=edges.filter(c=>c.getAttribute('srcId')===doc.getAttribute('modelId')&&(!c.getAttribute('type')||c.getAttribute('type')==='parOf')&&!byId.get(c.getAttribute('destId'))?.getAttribute('type')).length;
   const branch=[...def.getElementsByTagNameNS(dg,'if')].find(n=>n.getAttribute('func')==='cnt'&&n.getAttribute('val')===String(count)&&n.getElementsByTagNameNS(dg,'constr').length);
   const constraints=[...branch.getElementsByTagNameNS(dg,'constr')];const factor=(name,kind)=>Number(constraints.find(n=>n.getAttribute('forName')===name&&n.getAttribute('type')===kind)?.getAttribute('fact'));
   const slide=root.querySelectorAll('.slide')[9],rows=[];
   for(const shape of draw.getElementsByTagNameNS(ds,'sp')){
    const id=shape.getAttribute('modelId'),pres=byId.get(id),name=pres?.getElementsByTagNameNS(dg,'prSet')[0]?.getAttribute('presName');
    const tx=[...def.getElementsByTagNameNS(dg,'layoutNode')].find(n=>n.getAttribute('moveWith')===name&&n.getElementsByTagNameNS(dg,'alg')[0]?.getAttribute('type')==='tx');if(!tx)continue;
    const target=tx.getAttribute('name'),geom=shape.getElementsByTagNameNS(ds,'spPr')[0]?.getElementsByTagNameNS(a,'xfrm')[0],off=geom?.getElementsByTagNameNS(a,'off')[0],ext=geom?.getElementsByTagNameNS(a,'ext')[0];if(!off||!ext)continue;
    const pw=Number(ext.getAttribute('cx'))/factor(name,'w'),ph=Number(ext.getAttribute('cy'))/factor(name,'h');
    const coords=n=>{const found={};for(const c of constraints.filter(c=>c.getAttribute('forName')===n)){found[c.getAttribute('type')]=Number(c.getAttribute('fact'))*(c.getAttribute('refType')==='w'?pw:ph)}return{x:found.l??found.r-found.w,y:found.t??found.b-found.h,w:found.w,h:found.h}};
    const vb=coords(name),tb=coords(target),x=(Number(off.getAttribute('x'))+tb.x-vb.x)/9525,y=(Number(off.getAttribute('y'))+tb.y-vb.y)/9525,w=tb.w/9525,h=tb.h/9525;
    const text=[...shape.getElementsByTagNameNS(ds,'txBody')[0].getElementsByTagNameNS(a,'t')].map(t=>t.textContent).join(''),candidates=[...slide.querySelectorAll('.diagram-content .block')].filter(b=>b.querySelector('.text-block')&&b.textContent.replace(/\u00a0/g,' ').trim()===text.trim());if(candidates.length!==1){rows.push({matches:candidates.length});continue;}
    const el=candidates[0],r=el.getBoundingClientRect(),parent=el.closest('.diagram-content').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const textRects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
    rows.push({expected:{x,y,w,h},actual:{x:r.x-parent.x,y:r.y-parent.y,w:r.width,h:r.height},characters:el.textContent.length,visible:!!textRects.length,invalid:[...el.querySelectorAll('[style]')].some(e=>/NaN|Infinity/.test(e.getAttribute('style')))});
   }return{count,rows,slides:root.querySelectorAll('.slide').length};
  },{drawing:xmls[0],data:xmls[1],layout:xmls[2]});
  await check(`C016 DPR ${dpr}: all six labels match independently read layout equations`,()=>{assert.equal(original.count,6);assert.equal(original.rows.length,6);for(const r of original.rows){assert.ok(r.expected,'one matching label');for(const k of ['x','y','w','h'])near(r.actual[k],r.expected[k]);assert.ok(r.visible);assert.equal(r.invalid,false)}});
  await check(`C016 DPR ${dpr}: recovered label rectangles do not overlap`,()=>{const rows=original.rows;for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i].actual,b=rows[j].actual;assert.ok(a&&b);assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<.1||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<.1)}});
  if(process.env.PPTX_DIAGRAM_SCREENSHOT_ORIGINAL&&dpr===1)await page.locator('.slide').nth(9).screenshot({path:path.join(out,'C016-local.png')});
  originals.push({id:'C016',sha256:sha,dpr,...original});
 }
 await check(`DPR ${dpr}: destroy releases viewer and repeated open remains valid`,async()=>{await mount(fixture);assert.equal(await page.locator('.slide').count(),3);await page.evaluate(()=>{viewer.destroy();URL.revokeObjectURL(workerURL)});assert.equal(await page.locator('#root .slide').count(),0)});
 await page.close();
}await check('No unhandled browser exceptions',()=>assert.deepEqual(errors,[]));completed=true;
}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors},null,2)+'\n')}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
