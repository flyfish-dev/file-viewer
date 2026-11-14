import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchBrowserForTest } from '../packages/build-support/browser-test-launch.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const scratch=await mkdtemp(join(tmpdir(),'image-pan-browser-'))
const output=resolve(process.env.FILE_VIEWER_IMAGE_PAN_EVIDENCE||join(root,'output/issue-392'))
await mkdir(output,{recursive:true})
const tiff=await readFile(join(root,'packages/renderers/3d/test/fixtures/geo3d/samples-mit/ordinary.tiff'))
await build({stdin:{contents:`
import coreImage from './packages/core/src/renderers/image.ts';
import image from './packages/renderers/image/src/image.ts';
import {findFileViewerZoomProvider,createViewer} from '@file-viewer/core';
window.openImage=async(mode,enabled)=>{
  window.events=[];
  await window.viewer?.unmount();
  const host=document.getElementById('app');host.replaceChildren();
  const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1400;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#237cbd';ctx.fillRect(0,0,2000,1400);ctx.fillStyle='#e6194b';ctx.fillRect(0,0,300,300);ctx.fillStyle='#ffe119';ctx.fillRect(1700,1100,300,300);
  const bytes=mode==='tiff'?await(await fetch('/image.tiff')).arrayBuffer():await(await new Promise(resolve=>canvas.toBlob(resolve))).arrayBuffer();
  if(mode!=='tiff'&&window.__fileViewerPrepackObserveFixture)await window.__fileViewerPrepackObserveFixture({path:'generated/image-pan.png',bytes:[...new Uint8Array(bytes)]});
  window.abort=new AbortController();
  if(mode==='vanilla'){
    window.publicViewer=createViewer(host,{options:{styleIsolation:'none',image:enabled===undefined?{}:{handTool:enabled}}});
    const nativeRead=FileReader.prototype.readAsDataURL;
    let lateRead,started;
    const blocked=new Promise(resolve=>{started=resolve;});
    FileReader.prototype.readAsDataURL=function(blob){if(!lateRead){lateRead=()=>nativeRead.call(this,blob);started();}else nativeRead.call(this,blob);};
    try{
      const older=window.publicViewer.load({buffer:bytes.slice(0),filename:'superseded.png'});
      await blocked;
      const current=window.publicViewer.load({buffer:bytes.slice(0),filename:'current.png'});
      setTimeout(()=>lateRead(),50);
      await Promise.all([older,current]);
      if(window.publicViewer.getSource()?.filename!=='current.png')throw Error('Late image decode replaced the current source');
    }finally{FileReader.prototype.readAsDataURL=nativeRead;}
    window.viewer={$el:host,unmount:()=>window.publicViewer.destroy()};
  }else window.viewer=await(mode==='core'?coreImage:image)(bytes,host,mode==='tiff'?'tiff':'png',{signal:window.abort.signal,options:{image:enabled===undefined?{}:{handTool:enabled}}});
  window.root=host.querySelector('.image-viewer');
  window.img=window.root.querySelector('img');
  await window.img.decode();
  window.root.addEventListener('pointerdown',event=>{window.pointerId=event.pointerId;});
  findFileViewerZoomProvider(window.viewer.$el).setZoom(2);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  window.root.scrollLeft=200;window.root.scrollTop=150;
};
window.state=()=>({left:root.scrollLeft,top:root.scrollTop,width:root.scrollWidth,clientWidth:root.clientWidth,cursor:root.style.cursor,panning:root.dataset.viewerImagePanning,open:!!document.querySelector('[data-open="true"]')});
window.ready=true;
for(const name of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','dragstart'])window.addEventListener(name,event=>window.events.push({type:name,pointerType:event.pointerType,buttons:event.buttons,id:event.pointerId,prevented:event.defaultPrevented,target:event.target.className,x:event.clientX,y:event.clientY}));
`,resolveDir:root},bundle:true,format:'esm',platform:'browser',target:'es2022',alias:{'@file-viewer/core':join(root,'packages/core/src/index.ts')},outfile:join(scratch,'main.js'),logLevel:'warning'})
const script=await readFile(join(scratch,'main.js'))
const server=createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname
  if(path==='/main.js'){response.setHeader('Content-Type','text/javascript');response.end(script)}
  else if(path==='/image.tiff'){response.setHeader('Content-Type','image/tiff');response.end(tiff)}
  else if(path==='/'){response.setHeader('Content-Type','text/html');response.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:0}#app{width:700px;height:500px}</style><div id="app"></div><script type="module" src="/main.js"></script>')}
  else{response.writeHead(404);response.end()}
})
const report={results:[]}
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const base=`http://127.0.0.1:${server.address().port}`
  for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await launchBrowserForTest(browserType,engine,{headless:true})
    try{
      for(const mode of ['core','standalone','tiff','vanilla']){
        const errors=[],external=[]
        const createPage=async()=>{
          const next=await browser.newPage({viewport:{width:1000,height:800}})
          next.on('pageerror',error=>errors.push(error.message))
          next.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url())})
          await next.goto(base);await next.waitForFunction(()=>window.ready);return next
        }
        let page=await createPage()
        const drag=async()=>{await page.mouse.move(350,260);await page.mouse.down();await page.mouse.move(250,180,{steps:6})}
        await page.evaluate(mode=>window.openImage(mode),mode)
        const defaultState=await page.evaluate(()=>window.state());await drag();await page.mouse.up()
        const afterDefault=await page.evaluate(()=>window.state())
        assert.equal(afterDefault.left,defaultState.left);assert.equal(afterDefault.top,defaultState.top)
        // Isolate the native drag-and-drop default from the separate opted-in
        // pointer gesture. WebKit retains native drag state across DOM swaps.
        await page.close();page=await createPage()
        await page.evaluate(mode=>window.openImage(mode,true),mode)
        const before=await page.evaluate(()=>window.state());assert.ok(before.width>before.clientWidth)
        await drag();await page.mouse.up()
        const after=await page.evaluate(()=>window.state())
        if(Math.abs(after.left-before.left-100)>1){await writeFile(join(output,'failure.json'),JSON.stringify({engine,mode,before,after,events:await page.evaluate(()=>window.events)},null,2)+'\n');await page.screenshot({path:join(output,'failure.png')})}
        assert.ok(Math.abs(after.left-before.left-100)<=1,JSON.stringify({engine,mode,before,after}))
        assert.ok(Math.abs(after.top-before.top-80)<=1);assert.equal(after.open,false)
        // A fresh click/keyboard action must not inherit drag suppression.
        if(mode==='tiff'){await page.locator('.tiff-frame img').first().focus();await page.keyboard.press('Enter')}
        else await page.mouse.click(350,260)
        await page.waitForFunction(()=>window.state().open);await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>window.state())).open,false)
        for(const interrupt of ['pointercancel','lostpointercapture','blur',...(mode==='vanilla'?[]:['abort'])]){
          await page.evaluate(mode=>window.openImage(mode,true),mode);await drag()
          await page.evaluate(interrupt=>{
            if(interrupt==='abort')window.abort.abort();
            else if(interrupt==='blur')window.dispatchEvent(new Event('blur'));
            else window.root.dispatchEvent(new PointerEvent(interrupt,{pointerId:window.pointerId,bubbles:true}));
          },interrupt)
          const stopped=await page.evaluate(()=>window.state());await page.mouse.move(200,130,{steps:3});await page.mouse.up()
          const settled=await page.evaluate(()=>window.state());assert.equal(settled.left,stopped.left);assert.equal(settled.top,stopped.top);assert.equal(settled.panning,undefined)
        }
        await page.evaluate(mode=>window.openImage(mode,true),mode);await drag();await page.evaluate(()=>window.viewer.unmount());await page.mouse.move(100,100);await page.mouse.up()
        await page.evaluate(mode=>window.openImage(mode,true),mode)
        // At the left edge the image itself is reachable, not centered outside
        // the scrollable area. The opposite edge remains reachable too.
        const bounds=await page.evaluate(()=>{root.scrollLeft=0;const left=img.getBoundingClientRect().left-root.getBoundingClientRect().left;root.scrollLeft=root.scrollWidth;return{left,right:img.getBoundingClientRect().right-root.getBoundingClientRect().right}})
        assert.ok(bounds.left>=0&&bounds.left<100,JSON.stringify(bounds));assert.ok(bounds.right<=1&&bounds.right>-100,JSON.stringify(bounds))
        await page.screenshot({path:join(output,`${engine}-${mode}.png`)})
        await page.evaluate(()=>window.viewer.unmount());assert.deepEqual(errors,[]);assert.deepEqual(external,[])
        report.results.push({engine,browser:browser.version(),mode,checks:['default-off','real-mouse-pan-both-axes','drag-click-suppression','lightbox','pointercancel','lostcapture','blur',mode==='vanilla'?'superseded-async-image-return':'abort','unmount-and-remount','both-image-edges'],passed:true})
        await page.close()
      }
    }finally{await browser.close()}
  }
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n')
  console.log('[image] #392 actual mouse panning, default/keyboard/lightbox behavior, interruption cleanup and full image bounds passed across core/image/TIFF in Chromium/WebKit.')
}finally{await new Promise(resolve=>server.close(resolve));await rm(scratch,{recursive:true,force:true})}
