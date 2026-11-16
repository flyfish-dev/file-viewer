import { browserCorePlugin } from '../../../build-support/browser-runtime-options.mjs'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'

const root = resolve(import.meta.dirname, '../../../..')
const output = resolve(root, process.env.PDFJS_NETWORK_OUTPUT_DIR || '.release/pdf-worker-network')
const assets = resolve(root, process.env.PDFJS_NETWORK_STATIC_DIR || 'apps/viewer-demo/dist')
const built = process.argv.includes('--built')
assert.ok(process.argv.slice(2).every(arg => arg === '--built'))
mkdirSync(output, { recursive: true })
await build({
  stdin: {
    contents: `import { createViewer } from '@file-viewer/core';
import { pdfRenderer } from '${join(root, 'packages/renderers/pdf', built ? 'dist/index.js' : 'src/index.ts')}';
window.reloadPdf = async () => {
  const buffer = await fetch('/example/pdf.pdf').then(response => response.arrayBuffer());
  return window.viewer.load({buffer, filename:'pdf.pdf'});
};
window.viewer = createViewer(document.querySelector('main'), {options:{rendererMode:'replace',renderers:[pdfRenderer]}});
window.reloadPdf().then(() => window.probeLoaded = true).catch(error => window.probeError = String(error));`,
    resolveDir: root, loader: 'ts', sourcefile: 'pdf-network-probe.ts'
  },
  outdir: output, entryNames: 'probe', outExtension: { '.js': '.mjs' },
  bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022',
  legalComments: 'inline', sourcemap: false,
  plugins: [browserCorePlugin(root, { built })]
})

const scenarios = [
  { name: 'single-worker-request' },
  { name: 'worker-slow-headers', delay: 1600 },
  { name: 'worker-slow-body', tailDelay: 2000 },
  { name: 'worker-slow-headers-and-body', delay: 1600, tailDelay: 1600 },
  { name: 'native-worker-unavailable', noWorker: true },
  { name: 'mismatched-version', mismatch: true },
  { name: 'late-mismatched-version', delay: 1600, lateMismatch: true },
  { name: 'destroy-during-worker-startup', delay: 1600, cancel: true }
]
const mime = { '.mjs': 'application/javascript', '.js': 'application/javascript', '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.css': 'text/css' }
const results = []
const report = { status: 'running', builtRuntime: built, sourceCommit: process.env.FILE_VIEWER_SOURCE_COMMIT || null, results }
const save = () => writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
try {
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    for (const scenario of scenarios) {
      let probes = 0
      const server = createServer((request, response) => {
        const path = new URL(request.url, 'http://localhost').pathname
        if (path === '/') {
          response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><style>html,body,main{height:100%;margin:0}</style><main></main><script type="module" src="/probe.mjs"></script>')
          return
        }
        const directory = path.endsWith('.mjs') && !path.startsWith('/vendor/') ? output : assets
        const file = resolve(directory, '.' + path)
        if (!file.startsWith(directory + sep) || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404).end(); return }
        if (path.endsWith('/pdf.worker.mjs')) {
          probes++
          assert.equal(request.headers.range, undefined, 'Worker loading must not issue a separate Range probe')
          setTimeout(() => {
            const bytes = scenario.mismatch || scenario.lateMismatch
              ? Buffer.from(readFileSync(file, 'utf8').replace('const workerVersion = "5.4.624";', 'const workerVersion = "3.11.174";'))
              : readFileSync(file)
            if (scenario.tailDelay) {
              response.writeHead(200, { 'Content-Type': 'application/javascript', 'Content-Length': bytes.length })
              response.write(bytes.subarray(0, 4096))
              setTimeout(() => response.end(bytes.subarray(4096)), scenario.tailDelay)
              return
            }
            response.writeHead(200, { 'Content-Type': 'application/javascript', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' }).end(bytes)
          }, scenario.delay || 0)
          return
        }
        if (scenario.lateMismatch && path.endsWith('/pdf.worker.mjs')) {
          const bytes = readFileSync(file, 'utf8').replace('const workerVersion = "5.4.624";', 'const workerVersion = "3.11.174";')
          assert.notEqual(bytes, readFileSync(file, 'utf8'))
          response.writeHead(200, { 'Content-Type': 'application/javascript' }).end(bytes)
          return
        }
        response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': statSync(file).size })
        createReadStream(file).pipe(response)
      })
      await new Promise(done => server.listen(0, '127.0.0.1', done))
      const browser = await browserType.launch()
      const page = await browser.newPage()
      const errors = [], failures = [], workers = [], externalRequests = []
      const origin = `http://127.0.0.1:${server.address().port}`
      const result = { engine, scenario: scenario.name, status: 'running', errors, failures, workers, externalRequests }
      results.push(result)
      page.on('pageerror', error => errors.push(error.message))
      page.on('worker', worker => workers.push(worker.url()))
      page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure() }))
      page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) externalRequests.push(request.url()) })
      await page.addInitScript(({ noWorker }) => {
        const NativeWorker = window.Worker
        window.workerLifecycle = { created: 0, terminated: 0 }
        if (noWorker) { window.Worker = undefined; return }
        window.Worker = class extends NativeWorker {
          constructor(...args) { super(...args); window.workerLifecycle.created++ }
          terminate() { window.workerLifecycle.terminated++; return super.terminate() }
        }
      }, { noWorker: !!scenario.noWorker })
      try {
        await page.goto(origin, { waitUntil: 'domcontentloaded' })
        if (scenario.cancel) {
          while (!probes) await page.waitForTimeout(10)
          await page.evaluate(() => window.viewer.unload())
          await page.waitForTimeout(3500)
          await page.evaluate(() => window.reloadPdf())
        }
        await page.waitForFunction(() => window.probeLoaded || window.probeError, undefined, { timeout: 60000 })
        assert.equal(await page.evaluate(() => window.probeError || null), null)
        await page.waitForFunction(() => [...document.querySelectorAll('canvas')].some(canvas => canvas.width > 0 && canvas.height > 0), undefined, { timeout: 60000 })
        await page.waitForTimeout(3500)
        result.canvases = await page.locator('canvas').count()
        result.ink = await page.locator('canvas').first().evaluate(canvas => {
          const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
          let ink = 0
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && pixels[i] < 160 && pixels[i + 1] < 160 && pixels[i + 2] < 160) ink++
          return ink
        })
        assert.ok(result.ink > 100, 'PDF must have meaningful rendered pixels')
        assert.equal(workers.length > 0, !scenario.noWorker)
        assert.equal(probes, scenario.noWorker ? 0 : scenario.cancel ? 2 : 1)
        result.workerRequests = probes
        await page.screenshot({ path: join(output, `${engine}-${scenario.name}.png`) })
        await page.evaluate(() => window.viewer.destroy())
        await page.waitForFunction(() => window.workerLifecycle.created === window.workerLifecycle.terminated)
        await page.waitForTimeout(100)
        result.lifecycle = await page.evaluate(() => window.workerLifecycle)
        assert.deepEqual(errors, [])
        assert.deepEqual(failures, [])
        assert.deepEqual(externalRequests, [])
        result.status = 'passed'
        console.log(`${engine}/${scenario.name}: passed`)
      } finally {
        save()
        await browser.close()
        server.closeAllConnections()
        await new Promise(done => server.close(done))
      }
    }
  }
  report.status = 'passed-pdf-worker-network-regression'
} catch (error) {
  report.status = 'failed-pdf-worker-network-regression'
  report.error = error.stack || String(error)
  throw error
} finally { save() }
