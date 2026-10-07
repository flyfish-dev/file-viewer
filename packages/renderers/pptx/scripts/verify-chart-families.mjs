/** Real browser/library checks; optional C048 stays outside the repository. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import JSZip from 'jszip';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { extractChartOptions } from '../src/engine/support/chart-options.js';
import { makePresentation } from '../../../../test/compatibility-review/fixtures.mjs';
const root = path.resolve(import.meta.dirname, '../../../..');
const packageDir = path.join(root, 'packages/renderers/pptx');
const output = path.resolve(process.env.PPTX_CHART_OUTPUT || path.join(root, 'output/pptx-chart-families'));
await mkdir(output, { recursive: true });
const checks = [], originals = [], errors = [], requests = [];
let completed = false;
const check = async (name, fn) => {
  try { await fn(); checks.push({ name, status: 'pass' }); console.log('PASS ' + name); }
  catch (error) { checks.push({ name, status: 'fail', error: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
};
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const C='http://schemas.openxmlformats.org/drawingml/2006/chart';
const P='http://schemas.openxmlformats.org/presentationml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const val = value => ({attrs:{val:String(value)}});
const ser = (idx, values, name='Same', labels=['Repeated','Repeated',''], fills=[]) => `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/><c:tx><c:v>${esc(name)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${idx?'0000FF':'FF0000'}"/></a:solidFill></c:spPr>${fills.map((color,i)=>`<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:dPt>`).join('')}<c:cat><c:strLit><c:ptCount val="${labels.length}"/>${labels.map((s,i)=>`<c:pt idx="${i}"><c:v>${esc(s)}</c:v></c:pt>`).join('')}</c:strLit></c:cat><c:val><c:numLit><c:ptCount val="${values.length}"/>${values.map((v,i)=>`<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numLit></c:val></c:ser>`;
const chart = (kind, children, legend=true) => `<c:chartSpace xmlns:c="${C}" xmlns:a="${A}"><c:chart><c:plotArea><c:layout/><c:${kind}>${children}</c:${kind}></c:plotArea>${legend?'<c:legend><c:legendPos val="b"/></c:legend>':''}</c:chart></c:chartSpace>`;
const frame = i => `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="2" name="Chart ${i}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${40*9525}" y="${30*9525}"/><a:ext cx="${500*9525}" cy="${400*9525}"/></p:xfrm><a:graphic><a:graphicData uri="${C}"><c:chart r:id="rIdChart"/></a:graphicData></a:graphic></p:graphicFrame>`;
async function fixture(values=[3,2,1],hole=75,angle=90) {
  const zip=await JSZip.loadAsync(await makePresentation(JSZip));
  for(let i=1;i<=3;i++) {
    zip.file(`ppt/slides/slide${i}.xml`,`<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:c="${C}" xmlns:r="${R}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${frame(i)}</p:spTree></p:cSld></p:sld>`);
    zip.file(`ppt/slides/_rels/slide${i}.xml.rels`,`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLayout" Type="${R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rIdChart" Type="${R}/chart" Target="../charts/chart${i}.xml"/></Relationships>`);
  }
  zip.file('ppt/charts/chart1.xml',chart('doughnutChart',`<c:varyColors val="1"/>${ser(0,values,'Ring',undefined,['FF0000','00FF00','0000FF'])}<c:firstSliceAng val="${angle}"/><c:holeSize val="${hole}"/>`));
  zip.file('ppt/charts/chart2.xml',chart('barChart',`<c:barDir val="col"/><c:grouping val="stacked"/>${ser(0,[1,2])}${ser(1,[4,3])}<c:overlap val="100"/>`,false));
  zip.file('ppt/charts/chart3.xml',chart('barChart',`<c:barDir val="bar"/><c:grouping val="percentStacked"/>${ser(0,[1,2],'First')}${ser(1,[4,3],'Second')}<c:overlap val="100"/>`));
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
await check('Chart family metadata preserves bounded angles, ratios, grouping and point indices',()=>{
  const options=extractChartOptions({'c:grouping':val('stacked'),'c:holeSize':val(75),'c:firstSliceAng':val(90),'c:ser':{'c:dPt':[{'c:idx':val(4),'c:spPr':{'a:solidFill':{}}}]}},{'c:legend':{'c:legendPos':val('b')}},()=> '123456');
  assert.equal(options.holeSize,75);assert.equal(options.firstSliceAngle,90);assert.equal(options.grouping,'stacked');assert.deepEqual(options.series[0].points,{'4':'#123456'});assert.deepEqual(options.legend,{show:true,position:'b'});
});
await check('Malformed chart metadata cannot create CSS or unbounded point allocations',()=>{
  const result=extractChartOptions({'c:holeSize':val(-1),'c:firstSliceAng':val('NaN'),'c:grouping':val('stacked;bad'),'c:ser':{'c:dPt':{'c:idx':val('__proto__'),'c:spPr':{'a:solidFill':{}}}}},{},()=> 'red;bad');
  assert.equal(result.holeSize,50);assert.equal(result.firstSliceAngle,0);assert.equal(result.grouping,undefined);assert.deepEqual(result.series[0].points,{});assert.equal(result.legend.show,false);
});
const compiled=await build({stdin:{resolveDir:packageDir,contents:`
 import process from './src/engine/process.js';
 import {registerPptxChartLibraryLoader,renderPptxPostProcessing} from './src/chart.ts';
 import {createDefaultPptxOptions} from './src/options.ts';
 import {pptxViewerCss} from './src/styles.ts';
 import {sanitizePptxMarkup,sanitizePptxCss} from './src/sanitize.ts';
 import {PptxViewer} from './src/viewer.ts';
 import * as billboard from 'billboard.js'; import * as d3Format from 'd3-format';
 window.calls=[];
 registerPptxChartLibraryLoader(async()=>({billboard:{...billboard,default:{generate(options){
   const instance=(billboard.default||billboard).generate(options);
   calls.push({options,instance});return instance;
 }}},d3Format}));
 window.review={process,renderPptxPostProcessing,createDefaultPptxOptions,pptxViewerCss,sanitizePptxMarkup,sanitizePptxCss,PptxViewer};
`},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'warning'});
const workerPath=process.env.PPTX_CHART_WORKER_FILE;
const workerSource=workerPath?await readFile(path.resolve(workerPath),'utf8'):(await build({entryPoints:[path.join(packageDir,'src/worker-entry.ts')],bundle:true,format:'iife',write:false,platform:'browser',logLevel:'warning'})).outputFiles[0].text;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,headless:true});
try {
  for(const dpr of [1,2]) {
    const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:dpr});
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')errors.push(m.text());});
    await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});
    await page.setContent('<!doctype html><style>body{margin:0}</style><div id="host"><div class="flyfish-pptx-content" id="root"></div></div>');
    await page.addScriptTag({content:compiled.outputFiles[0].text});
    async function mount(bytes,worker=false) {
      return page.evaluate(async({base64,worker,workerSource})=>{
        window.handle?.destroy();window.calls.length=0;document.querySelectorAll('style[data-runtime]').forEach(s=>s.remove());root.replaceChildren();
        const messages=[],request={type:'processPPTX',data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0)).buffer,options:review.createDefaultPptxOptions()};
        if(worker) {
          const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'})),w=new Worker(url);let timer;
          try {await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Worker timeout')),30000);w.onmessage=e=>{messages.push(e.data);if(e.data.type==='ExecutionTime')resolve();else if(/error/i.test(e.data.type))reject(Error(JSON.stringify(e.data)));};w.onerror=e=>reject(Error(e.message));w.postMessage(request,[request.data]);});}
          finally {clearTimeout(timer);w.terminate();URL.revokeObjectURL(url);}
        } else {let receive;review.process(cb=>receive=cb,m=>messages.push(m));await receive(request);}
        const errors=messages.filter(m=>/error/i.test(m.type));if(errors.length)throw Error(JSON.stringify(errors));
        const style=document.createElement('style');style.dataset.runtime='true';style.textContent=review.pptxViewerCss+review.sanitizePptxCss(document,messages.find(m=>m.type==='globalCSS')?.data||'');document.head.append(style);
        for(const m of messages.filter(m=>m.type==='slide'))root.append(review.sanitizePptxMarkup(document,m.data));
        const queue=messages.find(m=>m.type==='ExecutionTime')?.charts;
        window.handle=await review.renderPptxPostProcessing(queue,root);await document.fonts.ready;await new Promise(r=>setTimeout(r,500));
        return queue.MsgQueue;
      },{base64:bytes.toString('base64'),worker,workerSource});
    }
    const bytes=await fixture();if(dpr===1)await writeFile(path.join(output,'generated.pptx'),bytes);
    const queue=await mount(bytes,dpr===2);
    await check(`DPR ${dpr}: ring type, hole size, start angle and grouping survive actual parser/Worker`,()=>{
      assert.deepEqual(queue.map(m=>m.data.chartType),['doughnutChart','barChart','barChart']);
      assert.equal(queue[0].data.chartOptions.holeSize,75);assert.equal(queue[0].data.chartOptions.firstSliceAngle,90);
      assert.equal(queue[1].data.chartOptions.grouping,'stacked');assert.equal(queue[2].data.chartOptions.grouping,'percentStacked');
    });
    async function geometry() {return page.evaluate(()=>calls.map(({options:o,instance})=>({
      type:o.data.type,groups:o.data.groups,names:o.data.names,columns:o.data.columns,colors:o.data.colors,
      normal:instance.config('data.stack.normalize'),legend:instance.config('legend.show'),
      arcs:[...o.bindto.querySelectorAll('.bb-arc')].map(p=>({d:p.getAttribute('d'),fill:getComputedStyle(p).fill})),
      bars:[...o.bindto.querySelectorAll('.bb-chart-bars .bb-bar')].map(p=>{const b=p.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height};}),
      frame:{position:getComputedStyle(o.bindto.parentElement).position,left:o.bindto.parentElement.style.left,top:o.bindto.parentElement.style.top},
    })));}
    const data=await geometry();
    const ratio=arc=>{const radii=[...(arc.d||'').matchAll(/[Aa]([\d.+eE-]+)[ ,]+([\d.+eE-]+)/g)].map(m=>Number(m[1]));assert.ok(radii.length>=2,'outer and inner arcs');return Math.min(...radii)/Math.max(...radii);};
    await check(`DPR ${dpr}: repeated/blank labels retain three independent sectors and point fills`,()=>{
      assert.equal(data[0].arcs.length,3);assert.deepEqual(data[0].columns.map(c=>c[1]),[3,2,1]);assert.deepEqual(Object.values(data[0].names),['Repeated','Repeated','']);
      assert.deepEqual(data[0].arcs.map(a=>a.fill),['rgb(255, 0, 0)','rgb(0, 255, 0)','rgb(0, 0, 255)']);
    });
    await check(`DPR ${dpr}: real SVG hole ratio and first-slice angle match the document`,()=>{
      for(const arc of data[0].arcs)assert.ok(Math.abs(ratio(arc)-0.75)<0.0001);
      const start=/^M([^,]+),([^A]+)/.exec(data[0].arcs[0].d);assert.ok(Number(start[1])>0);assert.ok(Math.abs(Number(start[2]))<0.001);
    });
    await check(`DPR ${dpr}: duplicate series remain distinct and stack on the same category baseline`,()=>{
      assert.equal(data[1].columns.length,2);assert.notEqual(data[1].columns[0][0],data[1].columns[1][0]);assert.equal(data[1].groups[0].length,2);
      const a=data[1].bars[0],b=data[1].bars[2];assert.ok(Math.abs(a.x-b.x)<0.01);assert.ok(Math.abs(a.w-b.w)<0.01);assert.ok(Math.abs((b.y+b.h)-a.y)<0.01);assert.ok(Math.abs(b.h/a.h-4)<0.01);
      assert.equal(data[1].legend,false);
    });
    await check(`DPR ${dpr}: horizontal percent stacking keeps category totals and ratios`,()=>{
      assert.equal(data[2].normal,true);const a=data[2].bars[0],b=data[2].bars[2],c=data[2].bars[1],d=data[2].bars[3];
      assert.ok(Math.abs(a.y-b.y)<0.01);assert.ok(Math.abs((a.x+a.w)-b.x)<0.01);assert.ok(Math.abs(b.w/a.w-4)<0.01);assert.ok(Math.abs((a.w+b.w)-(c.w+d.w))<0.01);
    });
    await check(`DPR ${dpr}: chart rendering preserves the authored outer positioning`,()=>{
      for(const item of data)assert.deepEqual(item.frame,{position:'absolute',left:'40px',top:'30px'});
    });
    await page.evaluate(()=>{const target=calls[0].options.bindto.parentElement;target.style.width='280px';target.style.height='240px';calls[0].instance.resize({width:280,height:240});});
    await page.waitForTimeout(100);const resized=await geometry();
    await check(`DPR ${dpr}: ring keeps its fractional hole after a narrow-container resize`,()=>{assert.equal(resized[0].arcs.length,3);for(const arc of resized[0].arcs)assert.ok(Math.abs(ratio(arc)-0.75)<0.0001);});
    if(dpr===1)await page.locator('.slide').first().screenshot({path:path.join(output,'generated.png')});
    for(const [hole,values]of [[10,[7,0,0]],[90,[0,0,0]],[50,[-3,'#N/A',2]]]) {
      await mount(await fixture(values,hole,0));const current=(await geometry())[0];
      await check(`DPR ${dpr}: hole ${hole}, full circle, zero/error and negative-value boundaries`,()=>{
        const expected=values.filter(v=>typeof v==='number'&&v!==0).map(Math.abs);assert.equal(current.arcs.length,expected.length);assert.deepEqual(current.columns.map(c=>c[1]),expected);for(const arc of current.arcs)assert.ok(Math.abs(ratio(arc)-hole/100)<0.0001);
      });
    }
    if(process.env.PPTX_CHART_ORIGINAL) {
      const original=await readFile(process.env.PPTX_CHART_ORIGINAL);const sha=createHash('sha256').update(original).digest('hex');assert.equal(sha,'be977ca8c84382b69994866fa0f5606185ff80fdbe86ec68a417e7223801e846');
      const zip=await JSZip.loadAsync(original),xmls=await Promise.all([1,2,3,4,5].map(n=>zip.file(`ppt/charts/chart${n}.xml`).async('string')));
      const originalQueue=await mount(original,true),actual=await geometry();
      const themeXml=await zip.file('ppt/theme/theme1.xml').async('string');
      const independent=await page.evaluate(({xmls,themeXml})=>xmls.map(xml=>{
        const doc=new DOMParser().parseFromString(xml,'application/xml'),ns='http://schemas.openxmlformats.org/drawingml/2006/chart';
        const plot=doc.getElementsByTagNameNS(ns,'plotArea')[0];const group=[...plot.children].find(n=>/Chart$/.test(n.localName));
        const attr=name=>group.getElementsByTagNameNS(ns,name)[0]?.getAttribute('val');
        const drawing='http://schemas.openxmlformats.org/drawingml/2006/main',theme=new DOMParser().parseFromString(themeXml,'application/xml');
        const fills=[...group.getElementsByTagNameNS(ns,'dPt')].map(point=>{const key=point.getElementsByTagNameNS(drawing,'schemeClr')[0]?.getAttribute('val');return key?'#'+theme.getElementsByTagNameNS(drawing,key)[0]?.firstElementChild?.getAttribute('val'):null;});
        return {type:group.localName,fills,hole:Number(attr('holeSize')||50),grouping:attr('grouping'),values:[...group.getElementsByTagNameNS(ns,'ser')].map(s=>{const val=s.getElementsByTagNameNS(ns,'val')[0];return [...val.getElementsByTagNameNS(ns,'pt')].sort((a,b)=>Number(a.getAttribute('idx'))-Number(b.getAttribute('idx'))).map(p=>Number(p.textContent));})};
      }),{xmls,themeXml});
      await check(`C048 DPR ${dpr}: all five original chart families and values reach real SVG`,()=>{
        assert.equal(originalQueue.length,5);assert.equal(actual.length,5);
        for(let i=0;i<5;i++){
          assert.equal(originalQueue[i].data.chartType,independent[i].type);
          if(i===2)assert.deepEqual(actual[i].columns.map(c=>c[1]),independent[i].values[0]);
          else assert.deepEqual(actual[i].columns.map(c=>c.slice(1)),independent[i].values);
        }
        assert.equal(actual[2].arcs.length,3);assert.deepEqual(Object.values(actual[2].colors).map(c=>c.toUpperCase()),independent[2].fills.map(c=>c.toUpperCase()));for(const arc of actual[2].arcs)assert.ok(Math.abs(ratio(arc)-independent[2].hole/100)<0.0001);
        assert.equal(actual[1].groups[0].length,3);assert.equal(actual[4].groups[0].length,3);assert.equal(actual[3].groups,undefined);
      });
      originals.push({id:'C048',sha256:sha,dpr,charts:actual.length,arcs:actual[2].arcs.length,hole:independent[2].hole,chartTypes:independent.map(c=>c.type)});
      if(dpr===1)await page.locator(`#${originalQueue[2].data.chartID}`).screenshot({path:path.join(output,'C048-ring.png')});
    }
    await check(`DPR ${dpr}: public viewer loads the actual Worker and chart capability, then disposes`,async()=>{
      const result=await page.evaluate(async({base,source})=>{
        window.handle?.destroy();root.replaceChildren();const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));let viewer,timer;window.calls.length=0;
        try {let done,fail;const finish=new Promise((r,j)=>{done=r;fail=j;});viewer=await review.PptxViewer.open(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer,host,{fitMode:'none',lazySlides:false,workerFactory:()=>new Worker(url),onError:fail,onSlideError:(_,e)=>fail(e),onRenderComplete:done});await Promise.race([finish,new Promise((_,j)=>timer=setTimeout(()=>j(Error('Public viewer timeout')),30000))]);return {slides:viewer.slideCount,charts:calls.length,arcs:host.querySelectorAll('.bb-arc').length};}
        finally {clearTimeout(timer);viewer?.destroy();URL.revokeObjectURL(url);}
      },{base:bytes.toString('base64'),source:workerSource});
      assert.deepEqual(result,{slides:3,charts:3,arcs:3});assert.equal(await page.locator('.pptx-chart-surface').count(),0);
    });
    await page.close();
  }
  await check('No uncaught browser errors, library warnings or external requests',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});
  completed=true;
} finally {
  await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors,requests,scope:'Single-series doughnuts, stacked chart grouping and corresponding C048 data; not full chart-style fidelity.'},null,2)+'\n');
}
if(checks.some(c=>c.status==='fail'))process.exitCode=1;
