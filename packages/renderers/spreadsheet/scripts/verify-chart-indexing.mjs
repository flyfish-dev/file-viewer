import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { chartFixture, series, points } from '../test/chart-index-fixtures.mjs'
import { parseSpreadsheetCharts } from '../dist/spreadsheet/worker/sheetjs/chartParser.js'
import { renderSpreadsheetChart } from '../dist/spreadsheet/chartRenderer.js'
import { extremaPointIndexes, MAX_TRANSFERRED_LINE_CHART_POINTS } from '../dist/spreadsheet/chartSampling.js'
const root = path.resolve(import.meta.dirname, '../../../..')
const require = createRequire(path.join(root, 'package.json'))
const localRequire = createRequire(path.join(root, 'packages/renderers/spreadsheet/package.json'))
const { JSDOM } = require('jsdom')
const { build } = localRequire('esbuild')
const { chromium } = require('playwright')
const JSZip = localRequire('jszip')
const output = path.resolve(process.env.SPREADSHEET_CHART_OUTPUT || path.join(root, 'output/spreadsheet-chart-indexing'))
await fs.mkdir(output, {recursive:true})
const checks = [], originals = [], errors = [], requests = []
// Explicit local fallback for environments that deny loopback navigation.
// CI leaves this unset and requires both real module-Worker and in-thread UI.
const memoryOnly = process.env.SPREADSHEET_CHART_MEMORY_TEST === '1'
async function check(name, fn) {try {await fn();checks.push({name,status:'pass'});console.log('PASS '+name)}catch(e){checks.push({name,status:'fail',error:e.message.slice(0,1200)});console.error('FAIL '+name+': '+e.message)}}
const doc = new JSDOM('<!doctype html>').window.document
const bytes = await chartFixture()
async function parse(bytes, workbook) {const c=(await parseSpreadsheetCharts(bytes,workbook)).Sheet1?.[0];assert.ok(c,'chart must exist');return c}
function render(chart) {return renderSpreadsheetChart(doc,{...chart,left:0,top:0,width:640,height:360,row:0,col:0})}
const moves = element => (element.querySelector('.excel-chart-series-line')?.getAttribute('d') || '').match(/M/g)?.length || 0
await fs.writeFile(path.join(output,'sparse-indexed.xlsx'),bytes)
await check('Sparse caches retain declared count, absent categories and source indices',async()=>{
 const c=await parse(bytes);assert.equal(c.series[0].values.length,6);assert.deepEqual(c.series[0].categories,['甲','','丙','','戊','']);assert.equal(c.series[0].values[2],30);assert.ok(Number.isNaN(c.series[0].values[1]));assert.ok(Number.isNaN(c.series[0].values[5]))
})
await check('Line gaps do not connect unrelated categories or create zero values',async()=>{assert.equal(moves(render(await parse(bytes))),3)})
await check('Labels keep the full logical domain, including trailing empty categories',async()=>{
 const labels=[...render(await parse(bytes)).querySelectorAll('.excel-chart-category-label')];assert.deepEqual(labels.map(x=>x.textContent),['甲','丙','戊']);assert.deepEqual(labels.map(x=>+x.dataset.categoryIndex),[0,2,4]);assert.ok(Math.abs(+labels[2].getAttribute('x')-(58+554*4/5))<.00001)
})
await check('Blank cells honour explicit zero policy without converting error values to zero',async()=>{
 const c=await parse(await chartFixture({blankMode:'zero',content:series([[0,10],[2,'#N/A'],[3,40]],[[0,'A'],[3,'D']],5)}));assert.deepEqual(c.series[0].values.map(v=>Number.isNaN(v)?'error':v),[10,0,'error',40,0]);assert.equal(moves(render(c)),2)
})
await check('Span policy connects blanks but not malformed numeric points',async()=>{
 const c=await parse(await chartFixture({blankMode:'span',content:series([[0,10],[2,30],[3,'#N/A'],[4,50]],[[0,'A'],[4,'E']],5)}));assert.equal(moves(render(c)),2);assert.match(render(c).querySelector('.excel-chart-series-line').getAttribute('d'),/L/)
})
await check('Unordered cache entries are indexed and malformed index tokens are ignored',async()=>{
 const c=await parse(await chartFixture({content:series([[4,50],[0,10],[-1,99],['1.5',99],['no',99],[2,30],['4294967295',99]],[[0,'A'],[4,'E']],6)}));assert.equal(c.series[0].values.length,6);assert.equal(c.series[0].values[0],10);assert.equal(c.series[0].values[2],30);assert.equal(c.series[0].values[4],50)
})
await check('Empty numeric text is absent; genuine zero stays a data point',async()=>{
 const c=await parse(await chartFixture({content:series([[0,0],[1,''],[2,'   '],[3,5]],[[0,'Zero'],[3,'Five']],4)}));assert.equal(c.series[0].values[0],0);assert.ok(Number.isNaN(c.series[0].values[1]));assert.ok(Number.isNaN(c.series[0].values[2]))
})
await check('Omitted ptCount uses highest valid index without compressing the data',async()=>{
 const content=series([[1,7],[3,11]],[[0,'A'],[3,'D']],4).replaceAll('<c:ptCount val="4"/>','');const c=await parse(await chartFixture({content}));assert.equal(c.series[0].values.length,4);assert.ok(Number.isNaN(c.series[0].values[0]));assert.equal(c.series[0].values[3],11)
})
await check('Formula fallback preserves empty cell positions',async()=>{
 const content='<c:ser><c:cat><c:strRef><c:f>Sheet1!A1:A4</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>Sheet1!B1:B4</c:f></c:numRef></c:val></c:ser>'
 const c=await parse(await chartFixture({content}),{SheetNames:['Sheet1'],Sheets:{Sheet1:{A1:{v:'A'},A3:{v:'C'},B1:{v:5},B3:{v:9}}}})
 assert.equal(c.series[0].values.length,4);assert.ok(Number.isNaN(c.series[0].values[1]));assert.equal(c.series[0].values[2],9)
})
await check('Explicit empty cache is not replaced by unrelated formula cells',async()=>{
 const content='<c:ser><c:cat><c:strLit>'+points([[0,'A']],1)+'</c:strLit></c:cat><c:val><c:numRef><c:f>Sheet1!B1</c:f><c:numCache><c:ptCount val="1"/></c:numCache></c:numRef></c:val></c:ser>'
 const c=await parse(await chartFixture({content}),{Sheets:{Sheet1:{B1:{v:999}}}});assert.ok(Number.isNaN(c.series[0].values[0]))
})
await check('All-empty category strings stay empty instead of inventing numbered labels',async()=>{const c=await parse(await chartFixture({content:series([[0,5]],[],3)}));assert.deepEqual(c.series[0].categories,['','','']);assert.equal(render(c).querySelectorAll('.excel-chart-category-label').length,0)})
await check('Multiple series use the same category extent for axis labels and geometry',async()=>{
 const c=await parse(await chartFixture({content:series([[0,5],[2,15]],[[0,'A'],[2,'C']],3)+series([[0,7],[4,12]],[[0,'A'],[4,'E']],5,'Other')}));const labels=[...render(c).querySelectorAll('.excel-chart-category-label')];const last=labels.find(e=>e.textContent==='C');if(last)assert.equal(+last.getAttribute('x'),58+554*2/4)
})
await check('Column charts omit absent points without producing non-finite SVG attributes',async()=>{
 const c=await parse(await chartFixture({type:'bar'}));const el=render(c);assert.doesNotMatch(el.outerHTML,/NaN|Infinity/);const bars=[...el.querySelectorAll('rect')].filter(r=>r.querySelector('title'));assert.equal(bars.length,3);assert.ok(+bars[2].getAttribute('x')>400)
})
await check('Area fill closes each contiguous run separately',async()=>{
 const content=series([[0,10],[1,20],[3,30],[4,20]],[[0,'A'],[4,'E']],5);const el=render(await parse(await chartFixture({type:'area',content})));assert.equal(el.querySelectorAll('.excel-chart-area').length,2);assert.equal(moves(el),2)
})
await check('Single nonzero pie and doughnut values form a complete circle',async()=>{
 for(const type of ['pie','doughnut']) {const c=await parse(await chartFixture({type,content:series([[0,0],[2,10]],[[0,'None'],[2,'All']],3)}));const paths=[...render(c).querySelectorAll('path')];assert.equal(paths.length,1);assert.ok((paths[0].getAttribute('d').match(/A/g)||[]).length >= 2);assert.doesNotMatch(paths[0].getAttribute('d'),/NaN/)}
})
await check('Bounded extrema sampling preserves an explicit separator for every skipped gap',()=>{
 const values=Array.from({length:20000},(_,i)=>i%51===0?NaN:Math.sin(i));const indexes=extremaPointIndexes(values,512);assert.ok(indexes.length<=512);for(let i=1;i<indexes.length;i++){const left=indexes[i-1],right=indexes[i];if(Number.isFinite(values[left])&&Number.isFinite(values[right]))assert.ok(values.slice(left+1,right).every(Number.isFinite))}
})
await check('Small sampling budgets remain bounded without joining hard gaps',()=>{
 const values=[1,2,NaN,3,4,NaN,5,6,7,8,NaN,9,10,11,12,13,14,15,16,17];
 for(let limit=2;limit<18;limit++){
  const indexes=extremaPointIndexes(values,limit);assert.ok(indexes.length<=limit);assert.deepEqual([...new Set(indexes)].sort((a,b)=>a-b),indexes);
  for(let i=1;i<indexes.length;i++)if(Number.isFinite(values[indexes[i-1]])&&Number.isFinite(values[indexes[i]]))assert.ok(values.slice(indexes[i-1]+1,indexes[i]).every(Number.isFinite));
 }
})
await check('Worker transfer sampling preserves source extent and gap metadata',async()=>{
 const count=15000;const vals=Array.from({length:count},(_,i)=>[i,i>=6500&&i<=6505?'':Math.sin(i)]);const c=await parse(await chartFixture({content:series(vals,[[0,'Start'],[14999,'End']],count)}));const s=c.series[0];assert.equal(s.sourcePointCount,count);assert.ok(s.values.length<=MAX_TRANSFERRED_LINE_CHART_POINTS);assert.ok(s.values.some(Number.isNaN));assert.ok(s.sourcePointIndexes.at(-1)===count-1);assert.doesNotMatch(render(c).outerHTML,/NaN|Infinity/);assert.equal(moves(render(c)),2)
})
await check('Sampling never hides numeric errors behind spanned blank separators',async()=>{
 const count=18000, values=Array.from({length:count},(_,i)=>[i, i===10?'':i===12?'#N/A':Math.sin(i)]);
 const c=await parse(await chartFixture({blankMode:'span',content:series(values,[[0,'A'],[count-1,'Z']],count)}));
 assert.equal(moves(render(c)),2)
})
await check('Unreasonable ptCount cannot expand a short malformed cache',async()=>{
 const c=await parse(await chartFixture({content:series([[0,7]],[[0,'A']],4294967295)}));assert.equal(c.series[0].values.length,1)
})
await check('Invalid worksheet ranges do not expand or read unrelated cells',async()=>{
 const content='<c:ser><c:cat><c:strLit>'+points([[0,'A']],1)+'</c:strLit></c:cat><c:val><c:numRef><c:f>Sheet1!XFE1:XFE2</c:f></c:numRef></c:val></c:ser>';
 const c=await parse(await chartFixture({content}),{Sheets:{Sheet1:{XFE1:{v:777}}}});assert.equal(c.series[0].values.length,1);assert.ok(Number.isNaN(c.series[0].values[0]))
})
await check('Axis font sizes retain hundredth-point precision and chart-level inheritance',async()=>{
 const zip=await JSZip.loadAsync(bytes);let text=await zip.file('xl/charts/chart1.xml').async('string');
 const props=(size)=>`<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}"/></a:pPr></a:p></c:txPr>`;
 text=text.replace('</c:catAx>',props(925)+'</c:catAx>').replace('</c:chartSpace>',props(1000)+'</c:chartSpace>');zip.file('xl/charts/chart1.xml',text);
 const c=await parse(await zip.generateAsync({type:'nodebuffer'}));assert.equal(c.categoryAxisFontSize,925/75);assert.equal(c.valueAxisFontSize,1000/75)
})
const bundle=await build({stdin:{contents:`import {parseSpreadsheetCharts} from './packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/chartParser.ts';import {renderSpreadsheetChart} from './packages/renderers/spreadsheet/src/spreadsheet/chartRenderer.ts';import render from './packages/renderers/spreadsheet/src/spreadsheet.ts';Object.assign(window,{parseSpreadsheetCharts,renderSpreadsheetChart,renderSheet:render});`,resolveDir:root},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'warning'})
const workerBytes=await fs.readFile(process.env.SPREADSHEET_CHART_WORKER_FILE||path.join(root,'packages/renderers/spreadsheet/dist/worker/sheet.worker.js'))
const server=createServer((req,res)=>{
  if(req.url==='/worker.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(workerBytes)}
  else if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><title>Chart regression</title>')}
  else {res.writeHead(404);res.end()}
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
const origin=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined})
async function newPage(options={}) {
  const page=await browser.newPage(options)
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>{
    const url=route.request().url()
    if(/^https?:/.test(url)&&!url.startsWith(origin+'/')){requests.push(url);return route.abort()}
    return route.continue()
  })
  return page
}
try {
 for(const workerMode of (memoryOnly ? [false] : [false,true])) for(const dpr of [1,2]) for(const width of [320,1000]) {
  await check(`Real renderer preserves vector labels and authored 9pt size at width ${width}, DPR ${dpr}, Worker ${workerMode}`,async()=>{
   const page=await newPage({viewport:{width:1100,height:820},deviceScaleFactor:dpr})
   try{
    if(!memoryOnly)await page.goto(origin+'/');await page.setContent(`<div id="host" style="width:${width}px;height:700px"></div>`);await page.addScriptTag({content:bundle.outputFiles[0].text})
    let input=process.env.SPREADSHEET_CHART_ORIGINAL?await fs.readFile(process.env.SPREADSHEET_CHART_ORIGINAL):await chartFixture({type:'bar',content:series([[0,10],[1,58]],[[0,'分类甲'],[1,'分类乙']],2)})
    if(process.env.SPREADSHEET_CHART_ORIGINAL)assert.equal(createHash('sha256').update(input).digest('hex'),'7ac5548a55dbeb6a97025a3af3d84d9752baea8f2745630907b604e53c0ee863')
    if(!process.env.SPREADSHEET_CHART_ORIGINAL) {
      const z=await JSZip.loadAsync(input);const c=await z.file('xl/charts/chart1.xml').async('string');
      const font='<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr>';
      z.file('xl/charts/chart1.xml',c.replace('</c:catAx>',font+'</c:catAx>').replace('</c:valAx>',font+'</c:valAx>'));
      input=await z.generateAsync({type:'nodebuffer'});
    }
    // Independent XML DOM reads the authored cache and font, not parser output.
    const inputZip=await JSZip.loadAsync(input);
    const xmlDom=new JSDOM(await inputZip.file('xl/charts/chart1.xml').async('string'),{contentType:'application/xml'});
    const first=(el,name)=>el.getElementsByTagNameNS('*',name)[0];
    const axis=first(xmlDom.window.document,'catAx');
    const expectedFont=Number(first(axis,'defRPr').getAttribute('sz'))/75;
    assert.equal(expectedFont,12);
    const sourceSeries=first(xmlDom.window.document,'ser');
    const sourceValues=[...first(sourceSeries,'val').getElementsByTagNameNS('*','v')].map(el=>+el.textContent);
    const sourceCategories=[...first(sourceSeries,'cat').getElementsByTagNameNS('*','v')].map(el=>el.textContent);
    assert.deepEqual(sourceValues,[10,58]);xmlDom.window.close();
    await page.evaluate(async({base,workerMode})=>{
      const bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));window.workerReplies=[];window.workerErrors=[];window.workersTerminated=0;
      if(workerMode){window.chartWorkerUrl=new URL('/worker.js',location.href).href;const Native=Worker;window.Worker=class extends Native{constructor(...args){super(...args);this.addEventListener('message',e=>workerReplies.push(e.data.type));this.addEventListener('error',e=>workerErrors.push(e.message));}terminate(){window.workersTerminated++;super.terminate()}};}
      window.handle=await renderSheet(bytes.buffer,document.querySelector('#host'),'xlsx',{filename:'chart.xlsx',options:{spreadsheet:{worker:workerMode,workerUrl:window.chartWorkerUrl}}});
    },{base:input.toString('base64'),workerMode})
    await page.waitForSelector('.excel-chart .excel-chart-category-label',{timeout:10000}).catch(async error=>{throw Error(error.message+JSON.stringify(await page.evaluate(()=>({replies:workerReplies,errors:workerErrors,body:document.body.innerText.slice(0,200)}))))});await page.evaluate(()=>document.fonts.ready)
    const inspect=()=>page.evaluate(()=>[...document.querySelectorAll('.excel-chart-category-label')].map(e=>({text:e.textContent,w:e.getBBox().width,h:e.getBBox().height,svg:e.closest('svg').viewBox.baseVal.width,tag:e.tagName,x:+e.getAttribute('x'),screenSize:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a})));
    const v=await inspect()
    assert.equal(v.length,2);assert.ok(v.every(x=>x.w>0&&x.h>0&&x.tag==='text'&&x.x>0&&x.x<x.svg));
    assert.deepEqual(v.map(x=>x.text),sourceCategories);
    if(dpr===2&&width===1000&&!workerMode)await page.screenshot({path:path.join(output,'original-chart-initial.png')});
    const zoomSizes=[];
    for(const zoom of [.5,1,2]){
      await page.evaluate(z=>document.querySelector('.excel-wrapper').__flyfishViewerZoomProvider.setZoom(z),zoom);
      // The original chart is anchored several columns to the right. Keep it
      // inside the real virtual viewport by scrolling, never disable culling.
      if(width===320&&process.env.SPREADSHEET_CHART_ORIGINAL){await page.mouse.move(150,200);await page.mouse.wheel(800*zoom,0)}
      await page.waitForFunction(()=>document.querySelectorAll('.excel-chart-category-label').length===2&&document.querySelectorAll('.excel-chart svg > text[text-anchor="end"]').length===6,null,{timeout:8000});
      const labels=await inspect();assert.equal(labels.length,2);
for(const label of labels)assert.ok(Math.abs(label.screenSize-expectedFont*zoom)<.15,'Authored category axis font size must match sheet zoom');
      const valueSizes=await page.evaluate(()=>[...document.querySelectorAll('.excel-chart svg > text[text-anchor="end"]')].map(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a));
      assert.equal(valueSizes.length,6);for(const size of valueSizes)assert.ok(Math.abs(size-expectedFont*zoom)<.15,'Authored value axis font size must match sheet zoom');
      zoomSizes.push({zoom,sizes:labels.map(label=>label.screenSize),valueSizes});
    }
    await page.evaluate(()=>document.querySelector('.excel-wrapper').__flyfishViewerZoomProvider.setZoom(1));await page.waitForTimeout(50);
    const barHeights=await page.evaluate(()=>[...document.querySelectorAll('.excel-chart svg rect')].filter(e=>e.getAttribute('rx')==='1').map(e=>+e.getAttribute('height')));
    assert.equal(barHeights.length,2);assert.ok(Math.abs(barHeights[0]/barHeights[1]-sourceValues[0]/sourceValues[1])<1e-6);
    if(workerMode)assert.ok(await page.evaluate(()=>workerReplies.includes('parseSheet')),'Actual renderer must receive a Worker chart, not fall back');
    if(dpr===2&&width===1000)await page.screenshot({path:path.join(output,workerMode?'original-chart-worker.png':'original-chart.png')})
    originals.push({id:process.env.SPREADSHEET_CHART_ORIGINAL?'C013':'generated',worker:workerMode,dpr,width,labels:2,barHeights,zoomSizes,sha256:createHash('sha256').update(input).digest('hex')});
    await page.evaluate(()=>window.handle.unmount());
    assert.equal(await page.evaluate(()=>document.querySelector('.excel-wrapper').__flyfishViewerZoomProvider),undefined);
    if(workerMode)assert.equal(await page.evaluate(()=>workersTerminated),1)
   }finally{await page.close()}
  })
 }
 await check('Actual SVG pixels preserve sparse islands and a complete single-value doughnut',async()=>{
  const page=await newPage({viewport:{width:660,height:760}});try{
   await page.setContent('<style>body{margin:0}.excel-chart{width:640px;height:360px}svg{width:100%;height:100%}</style><div id="host"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
   const pair=[await chartFixture({content:series([[0,10],[1,20],[3,20],[4,10]],[[0,'A'],[1,'B'],[3,'D'],[4,'E']],5)}),await chartFixture({type:'doughnut',content:series([[1,7]],[[1,'All']],3)})];
   const pixels=await page.evaluate(async inputs=>{const result=[];for(const base of inputs){const chart=(await parseSpreadsheetCharts(Uint8Array.from(atob(base),c=>c.charCodeAt(0)).buffer)).Sheet1[0];const el=renderSpreadsheetChart(document,{...chart,width:640,height:360});document.querySelector('#host').append(el);const svg=el.querySelector('svg');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,640,360);result.push({ring:[...ctx.getImageData(420,170,1,1).data],hole:[...ctx.getImageData(320,170,1,1).data],moves:(svg.querySelector('.excel-chart-series-line')?.getAttribute('d').match(/M/g)||[]).length})}finally{URL.revokeObjectURL(url)}}return result},pair.map(b=>b.toString('base64')));
   await page.screenshot({path:path.join(output,'generated.png')});assert.equal(pixels[0].moves,2);assert.ok(pixels[1].ring[0]<250||pixels[1].ring[1]<250||pixels[1].ring[2]<250);assert.deepEqual(pixels[1].hole,[255,255,255,255]);
  }finally{await page.close()}
 })
 await check('Actual classic Worker and structured clone retain missing source positions',async()=>{
  const page=await newPage();try{await page.goto('about:blank');const worker=await fs.readFile(process.env.SPREADSHEET_CHART_WORKER_FILE||path.join(root,'packages/renderers/spreadsheet/dist/worker/sheet.worker.js'),'utf8');const v=await page.evaluate(async({worker,bytes})=>{
   const url=URL.createObjectURL(new Blob([worker],{type:'text/javascript'}));const w=new Worker(url);try{return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Worker timeout')),15000);w.onerror=e=>{clearTimeout(timer);reject(Error(e.message))};w.onmessage=e=>{const m=e.data;if(m.type==='sheets')w.postMessage({type:'parseSheet',payload:{sheet:m.payload.sheets[0].id,startRow:0,pageSize:100,sessionId:1}});if(m.type==='parseSheet'){clearTimeout(timer);resolve(m.payload.sheetData)}};w.postMessage({type:'parseWorkbook',payload:{workbook:Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,filename:'sparse.xlsx'}})
   })}finally{w.terminate();URL.revokeObjectURL(url)}
  },{worker,bytes:bytes.toString('base64')});const chart=(v.structure?.charts||v.charts)?.[0];assert.ok(chart,'Worker chart result');assert.equal(chart.series[0].values.length,6);assert.equal(chart.series[0].values[2],30);assert.ok(Number.isNaN(chart.series[0].values[1]))}finally{await page.close()}
 })
 await check('Browser rendering has no external requests or uncaught exceptions',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[])})
}finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,errors,requests,moduleWorkerUiSkipped:memoryOnly,workerSha256:createHash('sha256').update(workerBytes).digest('hex')},null,2)+'\n')
if(checks.some(c=>c.status==='fail'))process.exitCode=1
