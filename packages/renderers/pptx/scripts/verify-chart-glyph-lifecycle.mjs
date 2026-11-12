import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const root=path.resolve(import.meta.dirname,'../../../..');
const output=process.env.PPTX_CHART_OUTPUT||path.join(root,'output/pptx-chart-glyph-lifecycle');await mkdir(output,{recursive:true});
const bundle=await build({stdin:{resolveDir:path.join(root,'packages/renderers/pptx'),contents:`
 import bb, {bar} from 'billboard.js'; import css from 'billboard.js/dist/billboard.css';
 const stylesheet=document.createElement('style');stylesheet.textContent=css;document.head.prepend(stylesheet);
 import {createPptxChartTextPlugin} from './src/chart-text.ts';
 window.mount=(o)=>{window.chart?.destroy();host.replaceChildren();const s=document.createElement('div');s.className='pptx-chart-surface';host.append(s);window.surface=s;
 const plugin=createPptxChartTextPlugin(s);window.plugin=plugin;
 window.chart=bb.generate({bindto:s,size:{width:o.width||600,height:o.height||440},resize:{auto:false},
 data:{columns:[['A',1,2,3,4,5,6,7,8],['B',2,3,4,5,6,7,8,9]],type:bar()},
 axis:{evalTextSize:plugin.evalTextSize,x:{type:'category',categories:o.labels,tick:{rotate:o.rotate??60,autorotate:false,multiline:!!o.multiline,culling:false,format:o.multiline?((x)=>o.labels[x].split('|')):undefined},height:o.axisHeight,show:o.showX!==false},y:{min:0,max:10,padding:{top:0,bottom:0}}},
 padding:o.padding,legend:{show:true},plugins:[plugin]});window.flushCount=0;const flush=chart.flush;chart.flush=function(...a){flushCount++;return flush.apply(this,a)};
 };`},bundle:true,write:false,format:'iife',loader:{'.css':'text'},logLevel:'silent',plugins:process.env.REVIEW_EXACT_PR_TEXT?[{name:'baseline',setup(b){b.onLoad({filter:/\/chart-text\.ts$/},async args=>({contents:await readFile(process.env.REVIEW_EXACT_PR_TEXT,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}))}}]:[]});
const checks=[],errors=[],fonts=[],semanticNegativeControls=[];
const record=async(name,fn)=>{try{const result=await fn();checks.push({name,status:'pass',result});}catch(e){checks.push({name,status:'fail',error:e.message});}console.log(checks.at(-1).status,name)};
const labels=Array.from({length:8},(_,i)=>`很长中文 MixedWWW 第${i+1}项`);
const multilineLabels=labels.map(v=>v.replace(' MixedWWW ','|MixedWWW|'));
const multilineStrings=multilineLabels.map(v=>v.replaceAll('|',''));
const assertSemantics=(s,expected=labels)=>{
 assert.deepEqual(s.x,expected,'Every complete category string must match in order');
 assert.deepEqual(s.ticks.filter(t=>t.axis==='x').map(t=>t.text),expected,'Visible category glyphs must match in order');
 for(const tick of s.ticks)assert.ok(tick.clips.length>0,`No active clip for ${tick.text}`);
};
const contained=(s,expected=labels)=>{assertSemantics(s,expected);assert.ok(s.ticks.every(t=>t.inside&&t.clips.every(c=>c.contained)&&!t.overlap),JSON.stringify(s));assert.equal(s.config.min,0);assert.equal(s.config.max,10);};
const verifyRejectedSemanticMutations=s=>{
 const mutations=[
  ['missing category',v=>{v.x.shift();v.ticks.splice(v.ticks.findIndex(t=>t.axis==='x'),1)}],
  ['truncated full string',v=>{v.x[0]=v.x[0].slice(0,-1);v.ticks.find(t=>t.axis==='x').text=v.x[0]}],
  ['empty tick collection',v=>{v.ticks=[]}],
  ['missing active clips',v=>{for(const t of v.ticks)t.clips=[]}],
 ];
 return mutations.map(([name,mutate])=>{const changed=structuredClone(s);mutate(changed);assert.throws(()=>contained(changed),assert.AssertionError,name);return{name,rejected:true}});
};
const browserName=process.env.PPTX_CHART_BROWSER||'chromium';const browser=await({chromium,webkit}[browserName]).launch({headless:true});
try{for(const dpr of[1,2]){
 const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:dpr});
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<div id="host"></div><style>body{margin:0}#host{transform-origin:0 0}.pptx-chart-surface svg{font:22px serif}.bb-axis text{font:inherit}.bb-legend-item text{font:16px serif}</style>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const settle=async()=>{await page.waitForTimeout(650);await page.waitForFunction(()=>surface.dataset.pptxChartLayoutStatus!=='pending',{},{timeout:6000});};
 const state=()=>page.evaluate(()=>{
  const svg=surface.querySelector('svg'),mat=svg.getScreenCTM().inverse();
  const transform=(n,owner=svg)=>{const b=n.getBBox(),m=owner.getScreenCTM().inverse().multiply(n.getScreenCTM());const p=[b.x,b.x+b.width].flatMap(x=>[b.y,b.y+b.height].map(y=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f})));return{left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))}};
  const width=Number(svg.getAttribute('width')),height=Number(svg.getAttribute('height')),l=surface.querySelector('.bb-legend'),legend=l?transform(l):null;
  const nodes=[...surface.querySelectorAll('.bb-axis .tick text')].filter(n=>getComputedStyle(n).visibility!=='hidden');
  const ticks=nodes.map(n=>{const b=transform(n),clips=[];for(let o=n;o&&o!==surface;o=o.parentElement){const id=/#([^"')]+)["']?\)/.exec(getComputedStyle(o).clipPath||'')?.[1];if(!id)continue;const c=svg.querySelector('[id="'+id+'"] rect');if(!c)continue;const cb=c.getBBox(),v=transform(n,o);clips.push({id,contained:v.left>=cb.x-1&&v.right<=cb.x+cb.width+1&&v.top>=cb.y-1&&v.bottom<=cb.y+cb.height+1,box:v,clip:{x:cb.x,y:cb.y,width:cb.width,height:cb.height}})}return{text:n.textContent,axis:n.closest('.bb-axis-x')?'x':n.closest('.bb-axis-y2')?'y2':'y',box:b,font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize,inside:b.left>=-1&&b.right<=width+1&&b.top>=-1&&b.bottom<=height+1,clips,overlap:!!legend&&Math.min(b.right,legend.right)-Math.max(b.left,legend.left)>1&&Math.min(b.bottom,legend.bottom)-Math.max(b.top,legend.top)>1}});
  return{width,height,legend,ticks,status:surface.dataset.pptxChartLayoutStatus,diagnostic:surface.dataset.pptxChartLayoutDiagnostic,flushCount,x:[...surface.querySelectorAll('.bb-axis-x .tick text')].map(n=>n.textContent),config:{min:chart.internal.config.axis_y_min,max:chart.internal.config.axis_y_max,padding:chart.internal.config.padding_right,height:chart.internal.config.axis_x_height}};
 });
 for(const rotate of[60,-60,0]){
  await page.evaluate(o=>mount(o),{labels,rotate,width:900,height:500});await settle();
  for(const scale of[.35,1.25,.5])await record(`${dpr} DPR / ${rotate}deg / ${scale}scale full glyph bounds`,async()=>{await page.evaluate(scale=>{const container=document.getElementById('host');container.style.transform='scale('+scale+')';container.remove();document.body.append(container);chart.flush()},scale);await settle();const s=await state();contained(s);if(rotate===60&&scale===.35)semanticNegativeControls.push({dpr,controls:verifyRejectedSemanticMutations(s)});return s});
 }
 await record(`${dpr} DPR multiline exact strings`,async()=>{await page.evaluate(o=>mount(o),{labels:multilineLabels,rotate:0,multiline:true,width:1000,height:500});await settle();const s=await state();contained(s,multilineStrings);return s});
 await record(`${dpr} DPR automatic public resize`,async()=>{await page.evaluate(()=>chart.resize({width:1120,height:540}));await settle();const s=await state();contained(s,multilineStrings);return s});
 await record(`${dpr} DPR hidden then show`,async()=>{await page.evaluate(o=>{host.style.display='none';mount(o)},{labels,rotate:60});await settle();await page.evaluate(()=>{host.style.display='';chart.flush()});await settle();const s=await state();contained(s);return s});
 await record(`${dpr} DPR impossible explicit space remains bounded and diagnosed`,async()=>{await page.evaluate(o=>mount(o),{labels,rotate:60,width:180,height:90,padding:{right:1,bottom:1},axisHeight:1});await settle();const s=await state();assert.ok(['explicit-space-overflow','insufficient-space','layout-limit'].includes(s.status),JSON.stringify(s));assertSemantics(s);assert.equal(s.config.padding,1);assert.equal(s.config.height,1);assert.ok(s.flushCount<=10);await page.waitForTimeout(700);assert.equal((await state()).flushCount,s.flushCount);return s});
 await record(`${dpr} DPR mathematically insufficient automatic space stops without changing labels`,async()=>{await page.evaluate(o=>mount(o),{labels,rotate:60,width:180,height:90});await settle();const s=await state();assert.ok(['insufficient-space','layout-limit'].includes(s.status),JSON.stringify(s));assertSemantics(s);assert.ok(s.ticks.every(t=>t.size==='22px'));assert.ok(JSON.parse(s.diagnostic).passes<=8);await page.waitForTimeout(700);assert.equal((await state()).flushCount,s.flushCount);return s});
 await record(`${dpr} DPR real delayed local font triggers automatic convergence`,async()=>{
  const fontPath=path.join(root,'test/fixtures/chart-font/noto-sans-sc-latin-wght-normal.woff2'),bytes=await readFile(fontPath);let request;
  await page.route('http://127.0.0.1:45999/delayed-font.woff2',async route=>{request={url:route.request().url(),start:Date.now(),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};await new Promise(r=>setTimeout(r,800));await route.fulfill({status:200,contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'},body:bytes});request.end=Date.now()});
  await page.evaluate(o=>{host.style.transform='';mount(o)}, {labels,rotate:60,width:1000,height:500});await settle();const before=await state();
  await page.evaluate(()=>{const style=document.createElement('style');style.textContent='@font-face{font-family:DelayedChart;src:url(http://127.0.0.1:45999/delayed-font.woff2)}.bb-axis text{font-family:DelayedChart,serif}';document.body.append(style);window.fontEvents=0;document.fonts.addEventListener('loadingdone',()=>fontEvents++);window.loadedFont=document.fonts.load('22px DelayedChart','MixedWWW')});
  await page.evaluate(()=>loadedFont);await settle();const after=await state();
  const events=await page.evaluate(()=>fontEvents);await writeFile(path.join(output,`font-dpr${dpr}.json`),JSON.stringify({before,after,request,events},null,2));
  contained(after);assert.ok(request&&request.end-request.start>=750);assert.equal(await page.evaluate(()=>document.fonts.check('22px DelayedChart')),true);assert.ok(after.flushCount>before.flushCount,'Actual glyph change must trigger layout without a helper flush');assert.notEqual(before.ticks[0].box.right-before.ticks[0].box.left,after.ticks[0].box.right-after.ticks[0].box.left);fonts.push(request);return{before,after,request,events};
 });
 await record(`${dpr} DPR fast font completes before the first RO delivery`,async()=>{
  const bytes=await readFile(path.join(root,'test/fixtures/chart-font/noto-sans-sc-latin-wght-normal.woff2'));
  await page.route('http://127.0.0.1:45999/fast-font.woff2',route=>route.fulfill({status:200,contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'},body:bytes}));
  await page.evaluate(async labels=>{
   const Original=window.ResizeObserver; window.firstRO=null; window.fastFontLoaded=null;
   window.ResizeObserver=class extends Original {constructor(callback){super((entries,observer)=>{if(entries.some(entry=>entry.target.tagName.toLowerCase()==='text'))window.firstRO??=performance.now();callback(entries,observer)})}};
   const style=document.createElement('style');style.textContent='@font-face{font-family:FastChart;src:url(http://127.0.0.1:45999/fast-font.woff2)}.bb-axis text{font-family:FastChart,serif}';document.body.append(style);
   const ready=document.fonts.load('22px FastChart','MixedWWW').then(()=>{window.fastFontLoaded=performance.now()});
   mount({labels,rotate:60,width:1000,height:500});await ready;window.ResizeObserver=Original;
  },labels);
  await settle();const result=await state();contained(result);
  const timing=await page.evaluate(()=>({loaded:fastFontLoaded,firstRO,ready:document.fonts.check('22px FastChart')}));
  assert.ok(timing.ready&&timing.loaded!==null&&timing.firstRO!==null&&timing.loaded<timing.firstRO,JSON.stringify(timing));return{timing,result};
 });
 await record(`${dpr} DPR repeated destroy restores hooks and cancels queued layout`,async()=>{const r=await page.evaluate(()=>{chart.flush();const before=flushCount;chart.destroy();plugin.$willDestroy();return{before,svg:surface.querySelectorAll('svg').length,diagnostic:surface.dataset.pptxChartLayoutStatus}});await page.waitForTimeout(500);r.after=await page.evaluate(()=>flushCount);assert.equal(r.diagnostic,undefined);assert.equal(r.after,r.before);return r});
 await page.screenshot({path:path.join(output,`${browserName}-dpr${dpr}.png`)});await page.close();
}}finally{await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({browser:browserName,checks,errors,fonts,semanticNegativeControls},null,2))}
if(checks.some(c=>c.status==='fail')||errors.length)process.exitCode=1;
