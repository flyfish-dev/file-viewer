import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'
import { read } from 'styled-exceljs'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFormulaWorkbook } from '../test/formulaWorkbook.mjs'
import { launchBrowserForTest } from '../../../build-support/browser-test-launch.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = await mkdtemp(join(tmpdir(), 'spreadsheet-414-browser-'))
const output = resolve(process.env.FILE_VIEWER_ISSUE_414_EVIDENCE || join(packageDir, '../../../output/issue-414'))
await mkdir(output, { recursive: true })
const original = process.env.FILE_VIEWER_414_SAMPLE
const fixture = original ? await readFile(original) : Buffer.from(await createFormulaWorkbook())
globalThis.__fileViewerPrepackObserveNodeFixture?.('generated/issue-414-formulas.xlsx', fixture)
const sheetNames = read(fixture, { type: 'buffer', bookSheets: true }).SheetNames
await writeFile(join(root, 'formulas.xlsx'), fixture)
await copyFile(join(packageDir, 'dist/worker/sheet.worker.js'), join(root, 'sheet.worker.js'))
await writeFile(join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body,#app{height:100%;margin:0}#app{height:650px}</style><div id="app"></div><script type="module" src="/main.js"></script>')
await build({
  stdin: { contents: `
import { renderFileViewerSpreadsheet } from ${JSON.stringify(join(packageDir, 'dist/index.js'))};
import { findFileViewerViewStateProvider } from '@file-viewer/core';
const NativeWorker = window.Worker;
window.messages=[]; window.painted=new Set();
const fillText=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(text,...args){ window.painted.add(String(text));return fillText.call(this,text,...args); };
window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('message',({data})=>window.messages.push(data));}};
window.openSample=async worker=>{
  window.viewer?.unmount();window.painted.clear();window.messages=[];
  const host=document.getElementById('app');host.replaceChildren();
  const bytes=await(await fetch('/formulas.xlsx')).arrayBuffer();
  window.viewer=await renderFileViewerSpreadsheet(bytes,host,'xlsx',{filename:'formulas.xlsx',options:{theme:'light',spreadsheet:{worker,workerUrl:'/sheet.worker.js'}}});
  window.provider=findFileViewerViewStateProvider(window.viewer.$el);
};
window.jump=(sheet,row=1)=>window.provider.applyState({spreadsheet:{range:{sheetId:${JSON.stringify(sheetNames)}.indexOf(sheet),startRow:row,startCol:2,endRow:row,endCol:2}}});
window.ready=true;
`, resolveDir: packageDir }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: join(root, 'main.js'), logLevel: 'warning'
})
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path.includes('..')) throw new Error('Invalid path')
    const bytes = await readFile(join(root, path === '/' ? 'index.html' : path.slice(1)))
    response.setHeader('Content-Type', ({ '.html':'text/html', '.js':'text/javascript', '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })[extname(path)] || (path === '/' ? 'text/html' : 'application/octet-stream'))
    response.end(bytes)
  } catch { response.writeHead(404); response.end() }
})
const report = { sample: original ? 'reported-original-local-only' : 'synthetic', sampleSha256: createHash('sha256').update(fixture).digest('hex'), workerSha256: createHash('sha256').update(await readFile(join(root, 'sheet.worker.js'))).digest('hex'), results: [] }
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  for (const [engine, type] of [['chromium',chromium],['webkit',webkit]]) {
    const browser = await launchBrowserForTest(type, engine, { headless:true })
    try {
      for (const worker of [false,true]) {
        const page = await browser.newPage({ viewport:{width:1000,height:700} })
        const errors=[],external=[],workerResponses=[]
        page.on('pageerror', error=>errors.push(error.message))
        page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:'))external.push(request.url())})
        page.on('response',response=>{if(response.url().endsWith('/sheet.worker.js'))workerResponses.push({status:response.status(),mime:response.headers()['content-type']})})
        await page.goto(base);await page.waitForFunction(()=>window.ready)
        await page.evaluate(worker=>window.openSample(worker),worker)
        await page.waitForFunction(()=>!!document.querySelector('.excel-wrapper .loading.hidden'),undefined,{timeout:20000})
        const selected=await page.evaluate(()=>window.jump('费用测算表'))
        assert.equal(selected.spreadsheet.status,'applied')
        await page.waitForFunction(()=>[...window.painted].some(value=>Number(value)===1123)||[...document.querySelectorAll('.excel-wrapper span,.excel-wrapper div')].some(element=>element.children.length===0&&Number(element.textContent?.trim())===1123&&element.getBoundingClientRect().width>0&&element.getBoundingClientRect().height>0&&getComputedStyle(element).visibility==='visible'),undefined,{timeout:15000}).catch(async error=>{
          await page.screenshot({path:join(output,`${engine}-${worker?'worker':'main'}-failure.png`)})
          await writeFile(join(output,'failure.json'),JSON.stringify(await page.evaluate(()=>({painted:[...window.painted],messages:window.messages,state:window.provider.getState(),text:document.body.innerText})),null,2)+'\n')
          throw error
        })
        if(!original) {
          for(const expected of ['ATRUE','TRUE:ATRUE','authored','authored:FALSE']) {
            await page.waitForFunction(expected=>window.painted.has(expected)||[...document.querySelectorAll('.excel-wrapper span,.excel-wrapper div')].some(element=>element.children.length===0&&element.textContent?.trim()===expected&&element.getBoundingClientRect().width>0&&element.getBoundingClientRect().height>0&&getComputedStyle(element).visibility==='visible'),expected,{timeout:15000})
          }
        }
        if(worker){
          const values=await page.evaluate(()=>window.messages.filter(m=>m.type==='parseSheet').flatMap(m=>m.payload.sheetData.data).flat())
          assert.ok(values.some(value=>Number(value)===1123),'real Worker must return the recovered cross-sheet value')
          if(!original) for(const expected of ['ATRUE','TRUE:ATRUE','authored','authored:FALSE'])
            assert.ok(values.includes(expected),'Real Worker must preserve logical text and authored cache: '+expected)
          assert.ok(workerResponses.length>0&&workerResponses.every(r=>r.status===200&&r.mime.includes('javascript')))
        }
        const rapid=await page.evaluate(async()=>{await Promise.all([window.jump('费用测算表'),window.jump('功能点计数表',1)]);return window.provider.getState()})
        assert.equal(rapid.spreadsheet.status,'applied');assert.equal(rapid.spreadsheet.range.sheetId,sheetNames.indexOf('功能点计数表'))
        await page.evaluate(()=>window.jump('费用测算表'))
        await page.screenshot({path:join(output,`${engine}-${worker?'worker':'main'}.png`)})
        const cancelled=await page.evaluate(async()=>{const pending=window.jump('功能点计数表',210);window.viewer.unmount();return pending})
        assert.ok(['disposed','applied'].includes(cancelled.spreadsheet.status))
        assert.deepEqual(errors,[]);assert.deepEqual(external,[])
        report.results.push({engine,browser:browser.version(),worker,passed:true,errors,external,workerResponses})
        await page.close()
      }
    } finally { await browser.close() }
  }
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n')
  console.log('[spreadsheet] #414 uncached cross-sheet value, real Worker/MIME, rapid navigation and pending-request unmount passed in Chromium/WebKit.')
} finally { await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true}) }
