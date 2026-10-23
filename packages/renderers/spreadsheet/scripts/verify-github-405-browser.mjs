import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import JSZip from 'jszip'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = await mkdtemp(join(tmpdir(), 'spreadsheet-405-browser-'))
const output = resolve(process.env.FILE_VIEWER_ISSUE_405_EVIDENCE || join(packageDir, '../../../output/issue-405'))
await mkdir(output, { recursive: true })
const fixture = await readFile(join(packageDir, 'test/fixtures/github-405-ghost-corner-cells.xlsx'))
await writeFile(join(root, 'ghost.xlsx'), fixture)
const zip = await JSZip.loadAsync(fixture)
const xml = await zip.file('xl/worksheets/sheet1.xml').async('string')
zip.file('xl/worksheets/sheet1.xml', xml
  .replace(/<dimension\b[^>]*\/>/, '<dimension ref="A1:A2000"/>')
  .replace(/<sheetData>[\s\S]*?<\/sheetData>/, '<sheetData><row r="1"><c r="A1"><v>42</v></c></row><row r="2000"><c r="A2000"><v>72</v></c></row></sheetData>'))
await writeFile(join(root, 'remote.xlsx'), await zip.generateAsync({ type: 'nodebuffer' }))
await copyFile(join(packageDir, 'dist/worker/sheet.worker.js'), join(root, 'sheet.worker.js'))
await writeFile(join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body,#app{height:100%;margin:0}#app{height:650px}</style><div id="app"></div><script type="module" src="/main.js"></script>')
await build({
  stdin: { contents: `
import { renderFileViewerSpreadsheet } from ${JSON.stringify(join(packageDir, 'dist/index.js'))};
import { findFileViewerViewStateProvider } from '@file-viewer/core';
const NativeWorker = window.Worker;
window.messages = [];
window.painted = new Set();
const fillText = CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { window.painted.add(String(text)); return fillText.call(this, text, ...args); };
window.Worker = class extends NativeWorker {
  constructor(...args) { super(...args); this.addEventListener('message', ({data}) => {
    if (data.type === 'sheets') window.messages.push(data);
    if (data.type === 'parseSheet') window.messages.push({type:data.type, startRow:data.payload.sheetData.meta.startRow, values:data.payload.sheetData.data.map(r=>r.slice(0,3))});
  }); }
};
window.openSample = async (name, worker) => {
  window.viewer?.unmount(); window.messages = []; window.painted.clear();
  const host = document.getElementById('app'); host.replaceChildren();
  const bytes = await (await fetch('/'+name+'.xlsx')).arrayBuffer();
  window.viewer = await renderFileViewerSpreadsheet(bytes, host, 'xlsx', {filename:name+'.xlsx',options:{theme:'light',spreadsheet:{worker,workerUrl:'/sheet.worker.js'}}});
  window.provider = findFileViewerViewStateProvider(window.viewer.$el);
};
window.jump = row => window.provider.applyState({spreadsheet:{range:{sheetId:0,startRow:row,startCol:0,endRow:row,endCol:0}}});
window.ready = true;
`, resolveDir: packageDir },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  outfile: join(root, 'main.js'), logLevel: 'warning'
})
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path.includes('..')) throw new Error('Invalid path')
    const file = path === '/' ? 'index.html' : path.slice(1)
    const bytes = await readFile(join(root, file))
    response.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})[extname(file)] || 'application/octet-stream')
    response.end(bytes)
  } catch { response.writeHead(404); response.end() }
})
let browser
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try { browser = await chromium.launch({ headless: true }) }
  catch { browser = await chromium.launch({ channel: 'chrome', headless: true }) }
  const results = []
  for (const worker of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
    const errors = [], external = [], workers = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) external.push(request.url()) })
    page.on('response', response => { if (response.url().endsWith('/sheet.worker.js')) workers.push({status:response.status(),mime:response.headers()['content-type']}) })
    await page.goto(base)
    await page.waitForFunction(() => window.ready)
    for (const sample of ['ghost', 'remote']) {
      const started = Date.now()
      await page.evaluate(({sample,worker}) => window.openSample(sample, worker), {sample,worker})
      await page.waitForFunction(() => !!document.querySelector('.excel-wrapper .loading.hidden') && !document.querySelector('.excel-wrapper .error:not(.hidden)'), undefined, { timeout: 15000 })
      if (sample === 'ghost') await page.waitForFunction(() => window.painted.has('r1c1') && window.painted.has('r10c3'), undefined, { timeout: 15000 })
      if (sample === 'remote') {
        const state = await page.evaluate(() => window.jump(1999))
        assert.equal(state.spreadsheet.status, 'applied')
        assert.equal(state.spreadsheet.range.startRow, 1999)
        const rapid = await page.evaluate(async () => { const a=window.jump(1999);const b=window.jump(0);await Promise.all([a,b]);return window.provider.getState() })
        assert.equal(rapid.spreadsheet.range.startRow, 0)
        await page.evaluate(() => window.jump(1999))
      }
      const messages = await page.evaluate(() => window.messages)
      if (worker) {
        const sheet = messages.find(m => m.type === 'sheets').payload.sheets[0]
        assert.equal(sheet.rowCount, sample === 'ghost' ? 10 : 2000)
        assert.equal(sheet.colCount, sample === 'ghost' ? 3 : 1)
        if (sample === 'remote') assert.ok(messages.some(m => m.type === 'parseSheet' && m.values.some(r => r[0] === '72')))
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await page.screenshot({ path: join(output, `${sample}-${worker?'worker':'main'}.png`) })
      // The page still services actions after parse, navigation and a paint.
      assert.equal(await page.evaluate(() => 6*7), 42)
      results.push({sample,worker,elapsedMs:Date.now()-started,passed:true})
    }
    const cancelled = await page.evaluate(async () => { const pending=window.jump(0);window.viewer.unmount();return pending })
    assert.ok(['disposed','applied'].includes(cancelled.spreadsheet.status))
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
    if (worker) assert.ok(workers.every(r=>r.status===200&&r.mime.includes('javascript')) && workers.length>0)
    await page.close()
  }
  await writeFile(join(output, 'report.json'), JSON.stringify({browser:await browser.version(),workerSha256:(await import('node:crypto')).createHash('sha256').update(await readFile(join(root,'sheet.worker.js'))).digest('hex'),results},null,2)+'\n')
  console.log('[spreadsheet] #405 browser responsiveness, real Worker/MIME, distant navigation, rapid navigation and unmount passed in both execution modes.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
  await rm(root, { recursive: true, force: true })
}
