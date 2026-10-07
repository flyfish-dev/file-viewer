import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild')
const output = path.resolve(process.env.CONTAINER_EVIDENCE_DIR || path.join(root, 'output/container-compatibility'))
await mkdir(output, {recursive:true})
const unit = spawnSync(process.execPath,['--test','test/container-compatibility/pictures.test.mjs'],{cwd:root,encoding:'utf8'})
process.stdout.write(unit.stdout);process.stderr.write(unit.stderr);assert.equal(unit.status,0)
await build({entryPoints:[path.join(root,'test/container-compatibility/browser.ts')],outfile:path.join(output,'browser.js'),bundle:true,platform:'browser',format:'iife',logLevel:'warning'})
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined})
const report=[]
try{
 const page=await browser.newPage({viewport:{width:1100,height:850}})
 const requests=[],errors=[]
 page.on('request',r=>{if(/^https?:/.test(r.url())) requests.push(r.url())});page.on('pageerror',e=>errors.push(e.message))
 await page.setContent('<!doctype html><html><body style="margin:0"><div id="host" style="width:1000px;height:800px"></div></body></html>')
 await page.addScriptTag({content:await readFile(path.join(output,'browser.js'),'utf8')})
 async function check(name,fn){await fn();report.push({name,status:'pass'});console.log('PASS '+name)}
 await check('Signature dispatch, plain text, HTML and unrelated binary records',async()=>{
  const actual=await page.evaluate(()=>{
   const classify=s=>containerReview.resolveFileViewerWordContainer(new TextEncoder().encode(s).buffer)
   return [classify('Hello 中文'),classify('<html><body>ok</body></html>'),classify('{\\rtf1 text}'),classify('\u0000binary'),containerReview.resolveFileViewerWordContainer(Uint8Array.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]).buffer)]
  });assert.deepEqual(actual,['text','html','binary','binary','binary'])
 })
 await check('UTF-16 HTML keeps tables and author CSS without active markup or external requests',async()=>{
  const value=await page.evaluate(async()=>{
   const text='<html><head><style>.summary{font-size:24px;color:rgb(150,20,10)} @import url(https://blocked.invalid/import.css);</style></head><body><h1 class="summary">中文标题</h1><table border="1"><tr><td>Alpha</td><td>Beta</td></tr></table><img src="https://blocked.invalid/track"><script>top.__executed=1<\/script><span style="background:url(https://blocked.invalid/css)">safe</span></body></html>'
   const bytes=new Uint8Array(2+text.length*2);bytes[0]=255;bytes[1]=254;const view=new DataView(bytes.buffer);for(let i=0;i<text.length;i++)view.setUint16(2+i*2,text.charCodeAt(i),true)
   const host=document.getElementById('host');window.wordHandle=await containerReview.renderFileViewerWordDoc(bytes.buffer,host,'doc')
   return {text:host.textContent,cells:host.querySelectorAll('td').length,font:getComputedStyle(host.querySelector('h1')).fontSize,executed:!!window.__executed,active:host.querySelectorAll('script,iframe,object,img[src^="http"]').length}
  });assert.equal(value.cells,2);assert.match(value.text,/中文标题/);assert.equal(value.font,'24px');assert.equal(value.executed,false);assert.equal(value.active,0)
  await page.screenshot({path:path.join(output,'word-html.png')})
 })
 await check('Repeated Word mount and disposal clears page and export lifecycle',async()=>{
  const value=await page.evaluate(async()=>{wordHandle.unmount();const host=document.getElementById('host');const handle=await containerReview.renderFileViewerWordDoc(new TextEncoder().encode('line one\n中文 plain text').buffer,host,'doc');const text=host.querySelector('pre').textContent;handle.unmount();return {text,children:host.childElementCount}});assert.equal(value.text,'line one\n中文 plain text');assert.equal(value.children,0)
 })
 await check('No browser errors or network side effects',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[])})
 await writeFile(path.join(output,'report.json'),JSON.stringify({checks:report,passed:report.length,pictureUnitTests:6},null,2)+'\n')
} finally {await browser.close()}
