import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const root=resolve(import.meta.dirname,'..')
const output=resolve(process.env.FILE_VIEWER_TOOLBAR_KEYBOARD_EVIDENCE||join(root,'output/issue-419'))
const cold=process.env.FILE_VIEWER_TOOLBAR_COLD_ROOT
const require=createRequire(join(root,'package.json'))
const consumer=cold?createRequire(join(cold,'package.json')):require
const appRequire=createRequire(join(root,'apps/component-demo/package.json'))
const entry=(name,local)=>JSON.stringify(cold?consumer.resolve(name):join(root,local))
const scratch=await mkdtemp(join(tmpdir(),'fv-toolbar-keyboard-'))
await mkdir(output,{recursive:true})
const result=await build({stdin:{resolveDir:root,loader:'ts',contents:`
import {mountViewer as mountCore} from ${entry('@file-viewer/core/browser','packages/core/src/browser.ts')};
import {mountViewer as mountWeb} from ${entry('@file-viewer/web','packages/components/web/src/index.ts')};
import image from ${entry('@file-viewer/renderer-image','packages/renderers/image/src/index.ts')};
import FileViewerReact from ${entry('@file-viewer/react','packages/components/react/src/index.tsx')};
import svelteAction from ${entry('@file-viewer/svelte/action','packages/components/svelte/src/index.ts')};
import {installJQueryFileViewer,getFileViewerController} from ${entry('@file-viewer/jquery','packages/components/jquery/src/index.ts')};
import React from ${JSON.stringify(appRequire.resolve('react'))};
import {createRoot} from ${JSON.stringify(appRequire.resolve('react-dom/client'))};
import jquery from ${JSON.stringify(appRequire.resolve('jquery'))};
installJQueryFileViewer(jquery);
window.fixture={
 async open(mode,isolation){window.dispose?.();const host=document.getElementById('host');host.replaceChildren();
  const buffer=await(await fetch('/image.png')).arrayBuffer();
  const props={buffer,filename:'social-preview.png',options:{preset:{renderers:[image]},locale:'en-US',styleIsolation:isolation,theme:'light',toolbar:{download:false,print:false,exportHtml:false,search:false,theme:true}}};
  let c;
  if(mode==='react'){const app=createRoot(host);const ref=React.createRef();app.render(React.createElement(FileViewerReact,{...props,ref}));window.dispose=()=>app.unmount();for(let n=0;n<1000&&!ref.current;n++)await new Promise(r=>setTimeout(r,10));if(!ref.current)throw Error('React viewer did not mount');c=ref.current;}
  else if(mode==='svelte'){c=svelteAction(host,props);window.dispose=()=>c.destroy();}
  else if(mode==='jquery'){jquery(host).fileViewer(props);c=getFileViewerController(host);window.dispose=()=>jquery(host).fileViewer('destroy');}
  else{c=(mode==='web'?mountWeb:mountCore)(host,props);window.dispose=()=>c.destroy();}
  window.controller=()=>c.getController?.()||c;
 },
 find(selector){const visit=root=>root.querySelector(selector)||(root.shadowRoot&&visit(root.shadowRoot))||[...root.querySelectorAll('*')].map(e=>e.shadowRoot&&visit(e.shadowRoot)).find(Boolean);return visit(document.getElementById('host'));},
 active(){let a=document.activeElement;while(a?.shadowRoot?.activeElement)a=a.shadowRoot.activeElement;return {tag:a?.tagName,label:a?.getAttribute('aria-label'),theme:a?.classList.contains('file-viewer-web-theme-button'),toolbar:a?.classList.contains('file-viewer-web-toolbar'),inToolbar:!!a?.closest('.file-viewer-web-toolbar'),disabled:!!a?.disabled,id:a?.id};},
 scale(){return window.controller()?.getZoomState()?.scale;},
 ready(){const img=this.find('img');return window.controller()?.getState()?.ready&&img?.complete&&img?.naturalWidth>0;},
 update(){window.loadRevision=(window.loadRevision||0)+1;return window.controller().update({buffer:undefined,url:'/slow.png?load='+window.loadRevision,filename:'replacement.png'});}
};window.ready=true;
`},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'one-core',setup(b){b.onResolve({filter:/^(?:react|react-dom)(?:\/.*)?$/},args=>({path:appRequire.resolve(args.path)}));b.onResolve({filter:/^@file-viewer\/core(?:\/.*)?$/},args=>({path:cold?consumer.resolve(args.path):join(root,'packages/core/src',args.path.slice('@file-viewer/core'.length).replace(/^\//,'')||'index')+'.ts'}))}}],logLevel:'warning'})
const image=await readFile(join(root,'.github/social-preview.png'))
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path==='/entry.js'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].contents)}else if(path==='/image.png'||path==='/slow.png'){res.setHeader('Content-Type','image/png');if(path==='/slow.png')setTimeout(()=>res.end(image),250);else res.end(image)}else if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><style>#host{width:900px;height:650px}</style><button id="before">Before viewer</button><main id="host"></main><button id="after">After viewer</button><script type="module" src="/entry.js"></script>')}else{res.writeHead(404);res.end()}})
const report={status:'running',cases:[],runtime:cold||'current-source',fixture:'Unmodified repository .github/social-preview.png; no reporter-private input.'}
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true});try{
   for(const mode of ['react','core','web','svelte','jquery'])for(const isolation of ['none','shadow']){
    const page=await browser.newPage({viewport:{width:1100,height:850}});const errors=[],slowRequests=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/slow.png')slowRequests.push(r.url())});page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.ready);await page.evaluate(([m,i])=>fixture.open(m,i),[mode,isolation]);await page.waitForFunction(()=>fixture.ready());
    // macOS WebKit uses Option-Tab for all controls when Full Keyboard Access
    // is not enabled. Exercise that native shortcut without changing settings.
    const tabKey=engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab'
    const focusWithTab=async(name)=>{await page.locator('#before').focus();for(let n=0;n<20;n++){await page.keyboard.press(tabKey);if((await page.evaluate(()=>fixture.active())).label===name)return;}assert.fail(tabKey+' must reach '+name)}
    await focusWithTab('Zoom in');let scale=await page.evaluate(()=>fixture.scale());
    for(let n=0;n<3;n++){await page.keyboard.press('Enter');await page.waitForFunction(s=>fixture.scale()>s,scale);scale=await page.evaluate(()=>fixture.scale());assert.equal((await page.evaluate(()=>fixture.active())).label,'Zoom in','Focus must survive each native Enter activation');}
    await focusWithTab('Zoom out');for(let n=0;n<3;n++){await page.keyboard.press('Space');await page.waitForFunction(s=>fixture.scale()<s,scale);scale=await page.evaluate(()=>fixture.scale());assert.equal((await page.evaluate(()=>fixture.active())).label,'Zoom out');}
    await page.getByRole('button',{name:'Switch to dark mode',exact:true}).focus();
    for(const key of ['Enter','Enter','Space','Space']){const before=await page.evaluate(()=>fixture.find('.file-viewer-web-shell').dataset.viewerTheme);await page.keyboard.press(key);await page.waitForFunction(previous=>fixture.ready()&&fixture.find('.file-viewer-web-shell').dataset.viewerTheme!==previous,before);assert.equal((await page.evaluate(()=>fixture.active())).theme,true,'Theme focus must survive reload and changed label');}
    await focusWithTab('Zoom in');for(let n=0;n<80;n++){const disabled=await page.getByRole('button',{name:'Zoom in',exact:true}).isDisabled();if(disabled)break;await page.keyboard.press('Enter');}
    assert.equal(await page.getByRole('button',{name:'Zoom in',exact:true}).isDisabled(),true);const boundaryFocus=await page.evaluate(()=>fixture.active());assert.equal(boundaryFocus.tag,'BUTTON');assert.equal(boundaryFocus.inToolbar,true);assert.equal(boundaryFocus.disabled,false);assert.notEqual(boundaryFocus.label,'Zoom in','Disabled button must hand focus to an enabled control');
    const beforeFallbackAction=await page.evaluate(()=>({scale:fixture.scale(),theme:fixture.find('.file-viewer-web-shell').dataset.viewerTheme}));await page.keyboard.press('Enter');await page.waitForFunction(before=>fixture.ready()&&(fixture.scale()!==before.scale||fixture.find('.file-viewer-web-shell').dataset.viewerTheme!==before.theme),beforeFallbackAction);
    await focusWithTab('Zoom out');let started=page.waitForRequest(r=>new URL(r.url()).pathname==='/slow.png');await page.evaluate(()=>{window.replacement=fixture.update()});await started;assert.equal(await page.evaluate(()=>window.controller().getState().loading),true);await page.evaluate(()=>window.replacement);await page.waitForFunction(()=>fixture.ready());assert.equal((await page.evaluate(()=>fixture.active())).label,'Zoom out','Loading should preserve the logical keyboard target');
    started=page.waitForRequest(r=>new URL(r.url()).pathname==='/slow.png');await page.evaluate(()=>{window.replacement=fixture.update()});await started;assert.equal(await page.evaluate(()=>window.controller().getState().loading),true);await page.locator('#after').focus();await page.evaluate(()=>window.replacement);await page.waitForFunction(()=>fixture.ready());assert.equal((await page.evaluate(()=>fixture.active())).id,'after','A completed async load must not steal focus back');
    await page.screenshot({path:join(output,engine+'-'+mode+'-'+isolation+'.png')});
    started=page.waitForRequest(r=>new URL(r.url()).pathname==='/slow.png');await page.evaluate(()=>{window.replacement=fixture.update()});await started;assert.equal(await page.evaluate(()=>window.controller().getState().loading),true);await page.evaluate(()=>window.dispose());await page.evaluate(()=>window.replacement);assert.equal(new Set(slowRequests).size,3,'Replacement/no-theft/destroy must each start a different real request');await page.waitForTimeout(300);assert.equal(await page.locator('.file-viewer-web-toolbar').count(),0);assert.deepEqual(errors,[]);
    report.cases.push({engine,mode,isolation,status:'passed',tabKey,enter:3,space:3,themeKeys:4,boundaryFocus,fallbackKeyActivated:true,slowRequests,sourceReplacement:true,noFocusTheft:true,destroyPending:true});console.log('[419]',engine,mode,isolation,'passed');await page.close()
   }
  }finally{await browser.close()}
 }
 report.status='passed'
}catch(error){report.status='failed';report.error=error.stack;throw error}finally{await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await new Promise(r=>server.close(r));await rm(scratch,{recursive:true,force:true})}
