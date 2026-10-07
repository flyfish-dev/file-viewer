import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const out=path.join(root,'output/lrc-compatibility');await mkdir(out,{recursive:true});
const source='[ti:Neutral fixture]\n[offset:-120]\n[00:01.00][00:03.00]M:<00:01.00>A <00:01.50>B\n[00:04]continuation\n[00:05]F:多语言 🌊 <not-a-timestamp><img src="https://invalid.test/x" onerror="window.lrcUnsafe=true">\nuntimed\n[00:06]\n';
const bundle=await build({stdin:{contents:`export {renderFileViewerCode} from './packages/renderers/text/src/index.ts';export {parseLrc} from './packages/renderers/text/src/lrcParser.ts';export {findFileViewerZoomProvider} from '@file-viewer/core';`,resolveDir:root},bundle:true,format:'iife',globalName:'subject',write:false});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,headless:true});
const checks=[];let original;
const check=async(name,fn)=>{await fn();checks.push({name,passed:true});console.log('PASS '+name)};
try {
 const page=await browser.newPage({viewport:{width:450,height:700}});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{requests.push(route.request().url());return route.abort()});
 await page.setContent('<!doctype html><div id="host" style="width:360px;height:540px"></div>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 async function mount(value,locale='en-US',shadow=false) {
   await page.evaluate(async({value,locale,shadow})=>{
     if(window.handle)await window.handle.unmount();
     const host=document.getElementById('host');host.replaceChildren();
     const parent=shadow?(host.shadowRoot||host.attachShadow({mode:'open'})):host;parent.replaceChildren();
     const target=document.createElement('div');target.style.cssText='height:100%;width:100%';parent.append(target);
     window.target=target;window.controller=new AbortController();
     window.handle=await subject.renderFileViewerCode(new TextEncoder().encode(value).buffer,target,'lrc',{signal:controller.signal,options:{locale,theme:'dark'}});
   },{value,locale,shadow});
 }
 await mount(source);
 await check('actual renderer preserves repeated line and word clocks with offset',async()=>{
   const clocks=await page.evaluate(()=>[...target.querySelectorAll('[data-time-ms]')].map(x=>[Number(x.dataset.timeMs),[...x.querySelectorAll('[data-word-time-ms]')].map(w=>Number(w.dataset.wordTimeMs))]));
   assert.deepEqual(clocks.slice(0,2),[[1120,[1120,1620]],[3120,[3120,3620]]]);
 });
 await check('recognized speaker persists and unknown markup stays literal',async()=>{
   assert.equal(await page.evaluate(()=>target.querySelector('[data-source-line="4"] .lrc-role').textContent),'M');
   assert.ok(await page.evaluate(()=>target.textContent.includes('<not-a-timestamp><img')));
   assert.equal(await page.evaluate(()=>target.querySelectorAll('img,script,iframe').length),0);
 });
 await check('source mode has exact original text',async()=>{
   await page.locator('[data-lrc-mode="2"]').click();assert.equal(await page.locator('.lrc-source').textContent(),source);
 });
 await check('lyrics mode hides timestamps without losing words',async()=>{
   await page.locator('[data-lrc-mode="1"]').click();assert.equal(await page.locator('rt,.lrc-time').count(),0);
   assert.ok((await page.locator('.lrc-content').textContent()).includes('A B'));
 });
 await check('zoom clamps finite input and ignores NaN',async()=>{
   const states=await page.evaluate(()=>{const p=subject.findFileViewerZoomProvider(target);return[p.setZoom(1.5).scale,p.setZoom(NaN).scale,p.setZoom(900).scale,p.setZoom(.1).scale,p.resetZoom().scale]});
   assert.deepEqual(states,[1.5,1.5,2.6,.6,1]);
 });
 await check('wrap control and narrow layout remain operable',async()=>{
   await page.locator('[data-lrc-mode="0"]').click();
   await page.locator('[data-lrc-wrap]').click();assert.equal(await page.locator('.fv-lrc').getAttribute('data-wrap'),'false');
   await page.locator('[data-lrc-wrap]').click();
   const widths=await page.evaluate(()=>({w:target.clientWidth,scroll:target.scrollWidth}));assert.ok(widths.scroll<=widths.w+1);
   await page.screenshot({path:path.join(out,'annotated.png')});
 });
 await check('four supported locales render controls',async()=>{
   for(const[locale,label]of[['zh-CN','原文'],['en-US','Source'],['ja-JP','原文'],['de-DE','Quelltext']]){await mount(source,locale);assert.equal(await page.locator('[data-lrc-mode="2"]').textContent(),label)}
 });
 await check('UTF-16LE and GBK source use the shared decoder',async()=>{
   const utf16=Buffer.concat([Buffer.from([255,254]),Buffer.from('[00:01]中文','utf16le')]);
   const gbk=Buffer.concat([Buffer.from('[00:01]'),Buffer.from([0xd6,0xd0,0xce,0xc4])]);
   for(const bytes of [utf16,gbk]){
     const text=await page.evaluate(async data=>{await handle.unmount();handle=await subject.renderFileViewerCode(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer,target,'lrc');return target.querySelector('.lrc-phrase').textContent},bytes.toString('base64'));
     assert.equal(text,'中文');
   }
 });
 await check('abort releases the mounted renderer and its zoom provider',async()=>{
   await mount(source);
   const state=await page.evaluate(()=>{const root=target.querySelector('.fv-lrc');controller.abort();return{removed:!root.isConnected,provider:!!subject.findFileViewerZoomProvider(root)}});
   assert.deepEqual(state,{removed:true,provider:false});
 });
 await check('Shadow DOM and idempotent unmount do not clear replacement content',async()=>{
   await mount(source,'en-US',true);assert.equal(await page.evaluate(()=>target.querySelectorAll('.lrc-cue').length),7);
   await page.evaluate(()=>{const old=handle;old.unmount();target.textContent='replacement';old.unmount()});assert.equal(await page.evaluate(()=>target.textContent),'replacement');
 });
 const file=process.env.LRC_ORIGINAL;
 if(file){
   const bytes=await readFile(file);const value=new TextDecoder().decode(bytes);await mount(value,'en-US',true);
   await check('original LRC has complete model, clocks and lossless source view',async()=>{
     original=await page.evaluate(value=>{const m=subject.parseLrc(value);return{metadata:m.metadata.length,cues:m.cues.length,timed:m.cues.filter(c=>c.timeMs!==null).length,words:m.cues.flatMap(c=>c.words).filter(w=>w.timeMs!==null).length,offset:m.offsetMs,domCues:target.querySelectorAll('.lrc-cue').length,containsLiteral:target.textContent.includes('<not-a-timestamp>')}},value);
     assert.equal(original.offset,-120);assert.equal(original.domCues,original.cues);assert.ok(original.words>150);assert.equal(original.containsLiteral,true);
     await page.evaluate(()=>target.querySelector('[data-lrc-mode="2"]').click());assert.equal(await page.evaluate(()=>target.querySelector('.lrc-source').textContent),value);
     original.id='C067';original.sha256=createHash('sha256').update(bytes).digest('hex');original.bytes=bytes.length;
   });
 }
 await check('no script execution, external request or browser exception',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(await page.evaluate(()=>window.lrcUnsafe),undefined)});
 await page.close();
}finally{await browser.close();await writeFile(path.join(out,'report.json'),JSON.stringify({passed:checks.length,checks,original},null,2)+'\n')}
