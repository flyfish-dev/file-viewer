import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launchBrowserForTest } from '../../../build-support/browser-test-launch.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const prepared = resolve(process.env.FILE_VIEWER_ISSUE474_PREPARED || resolve(root, 'output/issue474-browser'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const browserEntry = `
import { PptxViewer, createPptxWorker } from './packages/renderers/pptx/src/index.ts';
const NativeWorker = window.Worker;
const urls = new Set(), workers = new Set();
let workersCreated = 0;
const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = blob => { const url = create(blob); urls.add(url); return url; };
URL.revokeObjectURL = url => { urls.delete(url); revoke(url); };
window.Worker = class extends NativeWorker {
  constructor(...args) { super(...args); workers.add(this); workersCreated++; }
  terminate() { workers.delete(this); return super.terminate(); }
};
const input = await (await fetch('/sample.pptx')).arrayBuffer();
let viewer;
window.resources = () => ({ workers: workers.size, objectUrls: urls.size });
window.closePresentation = () => { viewer?.destroy(); viewer = undefined; document.querySelector('#surface').replaceChildren(); return window.resources(); };
window.openPresentation = async (workerUrl, original = false) => {
  const createdBefore = workersCreated;
  let complete, reject;
  const ready = new Promise((yes, no) => { complete = yes; reject = no; });
  void ready.catch(() => {});
  const timeout = setTimeout(() => reject(new Error('PPTX completion timeout')), 15000);
  try {
    viewer = await PptxViewer.open(input.slice(0), document.querySelector('#surface'), {
      workerUrl, lazySlides: false, lazyMedia: false,
      ...(original ? { workerFactory: () => new Worker(workerUrl, { type: 'module' }) } : {}),
      onRenderComplete: complete, onError: reject
    });
    await ready;
    return { status: 'ready', slides: viewer.slideCount,
      domSlides: document.querySelectorAll('.flyfish-pptx-content > .slide').length,
      workersCreated: workersCreated - createdBefore,
      text: document.querySelector('#surface').textContent, resources: window.resources() };
  } catch (error) {
    window.closePresentation();
    return { status: 'error', message: typeof error?.message === 'string' ? error.message : JSON.stringify(error), detail: error?.detail, stage: error?.stage, code: error?.code, resources: window.resources() };
  } finally { clearTimeout(timeout); }
};
window.probeWorker = async (workerUrl, cancel = false) => {
  let worker;
  try {
    const result = await new Promise((yes, no) => {
      const timeout = setTimeout(() => no(new Error('Worker probe timed out')), 8000);
      try {
        worker = createPptxWorker({ workerUrl });
        worker.addEventListener('message', event => { clearTimeout(timeout); yes({ status: 'ready', value: event.data }); }, { once: true });
        worker.addEventListener('error', event => { clearTimeout(timeout); event.preventDefault(); yes({ status: 'error', message: event.message || 'Worker load rejected' }); }, { once: true });
        if (cancel) { clearTimeout(timeout); worker.terminate(); yes({ status: 'cancelled' }); }
      } catch (error) { clearTimeout(timeout); yes({ status: 'error', message: String(error) }); }
    });
    return result;
  } finally { worker?.terminate(); }
};
window.issue474Ready = true;
`

async function prepare() {
  await mkdir(prepared, { recursive: true })
  const { build } = await import('esbuild')
  const result = await build({
    stdin: { contents: browserEntry, resolveDir: root, sourcefile: 'issue474-browser-entry.mjs' },
    outfile: resolve(prepared, 'consumer.js'), bundle: true, format: 'esm', platform: 'browser',
    target: 'es2022', metafile: true,
  })
  const worker = await readFile(resolve(root, 'packages/renderers/pptx/dist/worker/pptx.worker.js'))
  const workerInputsBytes = await readFile(resolve(root, 'packages/renderers/pptx/.build/worker-inputs.json'))
  const workerInputs = JSON.parse(workerInputsBytes)
  assert(workerInputs.files.some(file => file.path === 'packages/renderers/pptx/src/worker-entry.ts'))
  const owner = '@file-viewer/pptx@' + JSON.parse(await readFile(resolve(root, 'packages/renderers/pptx/package.json'), 'utf8')).version
  for (const file of workerInputs.files) {
    const bytes = await readFile(resolve(root, file.path))
    assert.equal(bytes.length, file.bytes)
    assert.equal(sha(bytes), file.sha256)
    if (file.owner === owner)
      assert(file.path.startsWith('packages/renderers/pptx/'), 'PPTX source resolved outside the candidate')
  }
  const fixture = await readFile(resolve(root, 'test/fixtures/issue-200/layout.pptx'))
  await writeFile(resolve(prepared, 'worker.js'), worker)
  await writeFile(resolve(prepared, 'sample.pptx'), fixture)
  await writeFile(resolve(prepared, 'worker-inputs.json'), workerInputsBytes)
  const JSZip = createRequire(import.meta.url)('jszip')
  const archive = await JSZip.loadAsync(fixture)
  const expectedSlides = ((await archive.file('ppt/presentation.xml').async('string')).match(/<p:sldId\b/g) || []).length
  assert(expectedSlides > 0)
  const inputs = []
  for (const name of Object.keys(result.metafile.inputs)) {
    if (name === 'issue474-browser-entry.mjs') continue
    const file = resolve(root, name)
    const bytes = await readFile(file)
    inputs.push({ path: name, bytes: bytes.length, sha256: sha(bytes) })
  }
  const files = []
  for (const name of ['consumer.js', 'worker.js', 'sample.pptx', 'worker-inputs.json']) {
    const bytes = await readFile(resolve(prepared, name))
    files.push({ name, bytes: bytes.length, sha256: sha(bytes) })
  }
  await writeFile(resolve(prepared, 'inputs.json'), JSON.stringify({ expectedSlides, inputs, files,
    producer: { node: process.version, esbuild: (await import('esbuild')).version },
  }, null, 2) + '\n')
}

if (!process.env.FILE_VIEWER_ISSUE474_PREPARED || process.argv.includes('--prepare-only')) await prepare()
if (process.argv.includes('--prepare-only')) process.exit(0)
const manifest = JSON.parse(await readFile(resolve(prepared, 'inputs.json'), 'utf8'))
for (const file of manifest.files) {
  const bytes = await readFile(resolve(prepared, file.name))
  assert.equal(bytes.length, file.bytes)
  assert.equal(sha(bytes), file.sha256)
}
const consumer = await readFile(resolve(prepared, 'consumer.js'))
const worker = await readFile(resolve(prepared, 'worker.js'))
const fixture = await readFile(resolve(prepared, 'sample.pptx'))
const wasm = Uint8Array.from([0,97,115,109,1,0,0,0,1,5,1,96,0,1,127,3,2,1,0,7,10,1,6,97,110,115,119,101,114,0,0,10,6,1,4,0,65,42,11])
assert.equal(new WebAssembly.Instance(new WebAssembly.Module(wasm)).exports.answer(), 42)
const httpRecords = []
const assetServer = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://local').pathname
  if (pathname !== '/no-cors.js') res.setHeader('access-control-allow-origin', '*')
  let body, mime = 'text/javascript'
  if (pathname.endsWith('/worker.js')) body = worker
  else if (pathname === '/dep.js') body = 'export const relativeImportValue = 7;'
  else if (pathname === '/answer.wasm') { body = wasm; mime = 'application/wasm' }
  else if (pathname === '/probe.js' || pathname === '/no-cors.js') body = `
    import {relativeImportValue} from './dep.js';
    const url = new URL('./answer.wasm', import.meta.url);
    const response = await fetch(url);
    const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
    self.postMessage({ relativeImportValue, moduleUrl: import.meta.url, wasmUrl: url.href,
      wasmMime: response.headers.get('content-type'), answer: instance.exports.answer() });`
  else if (pathname === '/slow.js') {
    const timer = setTimeout(() => { if (!res.destroyed) res.end('self.postMessage("late");') }, 500)
    res.once('close', () => clearTimeout(timer))
    res.setHeader('content-type', mime)
    return
  } else { res.writeHead(404).end(); return }
  res.setHeader('content-type', mime)
  httpRecords.push({ path: req.url, status: 200, mime, cors: res.getHeader('access-control-allow-origin') || null, bytes: Buffer.byteLength(body), sha256: sha(body) })
  res.end(body)
})
const listen = async server => {
  await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes) })
  return `http://127.0.0.1:${server.address().port}`
}
const assets = await listen(assetServer)
const pageServer = createServer((req, res) => {
  const path = new URL(req.url, 'http://local').pathname
  if (path === '/consumer.js') { res.setHeader('content-type', 'text/javascript'); res.end(consumer); return }
  if (path === '/sample.pptx') { res.end(fixture); return }
  if (path === '/worker.js') { res.setHeader('content-type', 'text/javascript'); res.end(worker); return }
  const workers = path === '/block-worker' ? "'self'" : path === '/block-import' ? "'self' blob:" : `'self' blob: ${assets}`
  const scripts = `'self' ${assets}${path === '/block-wasm' ? '' : " 'wasm-unsafe-eval'"}`
  if (path !== '/unrestricted') res.setHeader('content-security-policy', `default-src 'none'; script-src ${scripts}; worker-src ${workers}; connect-src 'self' ${assets}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;`)
  res.setHeader('content-type', 'text/html')
  res.end('<!doctype html><html><head><title>PPTX Worker acceptance</title></head><body><div id="surface" style="width:960px;min-height:600px"></div><script type="module" src="/consumer.js"></script></body></html>')
})
const origin = await listen(pageServer)
const playwright = process.env.FILE_VIEWER_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(resolve(process.env.FILE_VIEWER_PLAYWRIGHT_MODULE)).href)
  : await import('playwright')
const engines = (process.env.FILE_VIEWER_ISSUE474_ENGINES || 'chromium').split(',')
const report = { passed: false, mode: 'focused-source-browser-qualification', fixture: manifest.files.find(x => x.name === 'sample.pptx'), sourceInputs: manifest.inputs, cases: [], httpRecords, consoleErrors: [] }
try {
  for (const engine of engines) {
    assert(['chromium', 'firefox', 'webkit'].includes(engine))
    const browser = await launchBrowserForTest(playwright[engine], engine, { headless: true })
    const context = await browser.newContext({ viewport: { width: 1200, height: 820 } })
    try {
      const page = await context.newPage()
      const errors = [], external = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ engine, text: message.text() }) })
      await page.route('**/*', route => {
        const url = route.request().url()
        if (url.startsWith(origin + '/') || url.startsWith(assets + '/') || /^(?:blob|data):/.test(url)) return route.continue()
        external.push(url); return route.abort()
      })
      const load = async path => { await page.goto(origin + path); await page.waitForFunction(() => window.issue474Ready === true) }
      const record = (name, value) => { report.cases.push({ engine, browser: browser.version(), name, value }) }
      await load('/')
      await load('/unrestricted')
      const moduleProbe = await page.evaluate(url => window.probeWorker(url), assets + '/probe.js?initial=1')
      record('unrestricted-module-loader-diagnostic', moduleProbe)
      assert.equal(moduleProbe.status, 'ready', JSON.stringify(moduleProbe))
      await load('/')
      const baseline = await page.evaluate(url => window.openPresentation(url, true), assets + '/nested/worker.js')
      assert.equal(baseline.status, 'error'); assert.match(baseline.message, /Worker|origin|access|Security/i)
      assert.deepEqual(baseline.resources, { workers: 0, objectUrls: 0 }); record('original-direct-cross-origin-rejection', baseline)
      for (const [name, url] of [['same-origin', origin + '/worker.js'], ['automatic-cross-origin', assets + '/nested/worker.js?revision=1#entry']]) {
        const result = await page.evaluate(url => window.openPresentation(url), url)
        assert.equal(result.status, 'ready', JSON.stringify({ name, result, consoleErrors: report.consoleErrors })); assert.equal(result.slides, manifest.expectedSlides); assert.equal(result.domSlides, manifest.expectedSlides); assert(result.text.trim().length > 20)
        assert.equal(result.workersCreated, 1, 'Presentation must use one actual Worker; completed Workers may already be released')
        await page.screenshot({ path: resolve(prepared, `${engine}-${name}.png`) })
        assert.deepEqual(await page.evaluate(() => window.closePresentation()), { workers: 0, objectUrls: 0 }); record(name, result)
      }
      const probe = await page.evaluate(url => window.probeWorker(url), assets + '/probe.js?revision=1')
      assert.equal(probe.status, 'ready'); assert.equal(probe.value.relativeImportValue, 7); assert.equal(probe.value.answer, 42)
      assert.equal(probe.value.moduleUrl, assets + '/probe.js?revision=1'); assert.equal(probe.value.wasmUrl, assets + '/answer.wasm'); assert.equal(probe.value.wasmMime, 'application/wasm')
      assert.deepEqual(await page.evaluate(() => window.resources()), { workers: 0, objectUrls: 0 }); record('relative-import-and-original-module-wasm-base', probe)
      const cancelled = await page.evaluate(url => window.probeWorker(url, true), assets + '/slow.js')
      assert.equal(cancelled.status, 'cancelled'); assert.deepEqual(await page.evaluate(() => window.resources()), { workers: 0, objectUrls: 0 }); record('cancel-during-load', cancelled)
      for (let repeat = 0; repeat < 3; repeat++) {
        assert.equal((await page.evaluate(url => window.openPresentation(url), assets + '/nested/worker.js')).status, 'ready')
        assert.deepEqual(await page.evaluate(() => window.closePresentation()), { workers: 0, objectUrls: 0 })
      }
      record('three-repeated-open-destroy-cycles', { workers: 0, objectUrls: 0 })
      assert.deepEqual(errors, []); assert.deepEqual(external, [])
      for (const [path, url, name] of [['/block-worker', assets + '/probe.js', 'worker-src-blob-blocked'], ['/block-import', assets + '/probe.js?forbidden-import=1', 'worker-src-remote-import-blocked'], ['/', assets + '/no-cors.js', 'cors-blocked']]) {
        await load(path)
        const result = await page.evaluate(url => window.probeWorker(url), url)
        assert.equal(result.status, 'error'); assert.deepEqual(await page.evaluate(() => window.resources()), { workers: 0, objectUrls: 0 }); record(name, result)
      }
      assert(httpRecords.some(record => record.path === '/no-cors.js' && record.cors === null), 'CORS negative must reach the actual HTTP server, not fail at the CSP layer')
      await load('/block-wasm')
      const wasmBlocked = await page.evaluate(url => window.probeWorker(url), assets + '/probe.js?blocked-wasm=1')
      assert.equal(wasmBlocked.status, 'error'); assert.deepEqual(await page.evaluate(() => window.resources()), { workers: 0, objectUrls: 0 }); record('wasm-compilation-csp-blocked', wasmBlocked)
      await load('/')
      await context.setOffline(true)
      const offline = await page.evaluate(url => window.probeWorker(url), assets + '/probe.js?cold-offline=1')
      assert.equal(offline.status, 'error'); assert.deepEqual(await page.evaluate(() => window.resources()), { workers: 0, objectUrls: 0 }); record('uncached-offline-rejects-and-cleans-up', offline)
      await context.setOffline(false)
      assert.deepEqual(external, [])
    } finally { await context.close(); await browser.close() }
  }
  assert(httpRecords.some(x => x.path.startsWith('/nested/worker.js') && x.cors === '*' && x.mime === 'text/javascript' && x.sha256 === manifest.files.find(x => x.name === 'worker.js').sha256))
  report.passed = true
} finally {
  await Promise.all([new Promise(done => pageServer.close(done)), new Promise(done => assetServer.close(done))])
  await writeFile(resolve(prepared, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, report: resolve(prepared, 'report.json') }))
