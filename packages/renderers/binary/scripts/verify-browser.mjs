import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import { browserCorePlugin } from '../../../build-support/browser-runtime-options.mjs'
import { launchBrowserForTest } from '../../../build-support/browser-test-launch.mjs'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const evidenceRoot = resolve(
  process.env.BINARY_INSPECTOR_EVIDENCE_DIR || '/tmp/file-viewer-binary-inspector'
)
await mkdir(evidenceRoot, { recursive: true })
const bundle = await build({
  absWorkingDir: packageRoot,
  entryPoints: [resolve(packageRoot, 'dist/binary.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  metafile: true,
  plugins: [browserCorePlugin(resolve(packageRoot, '../../..'), { built: true })]
})
const binaryBundle = bundle.outputFiles[0].contents
await writeFile(
  resolve(evidenceRoot, 'bundle-inputs.json'),
  JSON.stringify(bundle.metafile, null, 2) + '\n'
)
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.bin': 'application/octet-stream'
}
const html = `<!doctype html><meta charset="utf-8"><div id="viewer" style="width:1100px;height:760px"></div><script type="module">
import renderBinary from '/dist/binary.js';
window.mountBinary = async (name, options = {}) => {
  const response = await fetch('/fixtures/' + name);
  if (!response.ok) throw new Error('fixture fetch failed: ' + response.status);
  window.binaryInstance = await renderBinary(await response.arrayBuffer(), document.getElementById('viewer'), 'bin', { options: { binary: options } });
  return document.querySelector('[data-binary-inspector-ready]')?.dataset.binaryTemplate;
};
window.binaryReady = true;
</script>`
const diagnostics = { console: [], pageErrors: [], responses: [], requestFailures: [], http: [] }
const server = createServer(async (request, response) => {
  response.once('finish', () =>
    diagnostics.http.push({ path: request.url, status: response.statusCode })
  )
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://local').pathname)
    if (pathname === '/' || pathname === '/index.html') {
      response
        .writeHead(200, {
          'Content-Type': mime['.html'],
          'Content-Security-Policy':
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src 'self'"
        })
        .end(html)
      return
    }
    if (pathname === '/dist/binary.js') {
      response.writeHead(200, { 'Content-Type': mime['.js'] }).end(binaryBundle)
      return
    }
    const file = resolve(packageRoot, `.${pathname}`)
    if (!file.startsWith(packageRoot + sep)) {
      response.writeHead(403).end()
      return
    }
    const bytes = await readFile(file)
    response
      .writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
      .end(bytes)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await launchBrowserForTest(chromium, 'chromium', { headless: true })
const report = { origin, workers: null, virtualRows: 0, externalRequests: [] }
let page
try {
  page = await browser.newPage({ viewport: { width: 1160, height: 820 } })
  page.on('console', (message) =>
    diagnostics.console.push({ type: message.type(), text: message.text() })
  )
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
  page.on('response', (response) =>
    diagnostics.responses.push({ url: response.url(), status: response.status() })
  )
  page.on('requestfailed', (request) =>
    diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText })
  )
  const requests = []
  page.on('request', (request) => requests.push(request.url()))
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker
    window.binaryWorkers = { created: 0, active: 0 }
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args)
        window.binaryWorkers.created += 1
        window.binaryWorkers.active += 1
        this.binaryStopped = false
      }
      terminate() {
        if (!this.binaryStopped) {
          this.binaryStopped = true
          window.binaryWorkers.active -= 1
        }
        return super.terminate()
      }
    }
  })
  await page.goto(origin)
  await page.waitForFunction(() => window.binaryReady === true)
  assert.equal(await page.evaluate(() => mountBinary('pe32.bin')), 'pe')
  await page.waitForSelector('[data-binary-inspector-ready="true"]')
  assert.equal(await page.locator('[data-binary-template="pe"]').count(), 1)
  await page.getByRole('button', { name: /PE signature/u }).click()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-binary-inspector-ready]')?.dataset.binarySelectedStart === '128'
  )
  await page.locator('[data-binary-byte-offset="0"]').click()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-binary-inspector-ready]')?.dataset.binarySelectedStart === '0'
  )
  assert.match(await page.locator('.fv-binary-inspector').innerText(), /GUID LE/u)
  await page.evaluate(() => binaryInstance.unmount())
  assert.equal(await page.evaluate(() => mountBinary('large.bin')), 'raw')
  await page.waitForSelector('[data-binary-template="raw"]')
  report.virtualRows = await page.locator('[data-binary-row]').count()
  assert.ok(report.virtualRows < 100, `Expected virtualized rows, received ${report.virtualRows}.`)
  assert.equal(
    await page.evaluate(() => binaryWorkers.active),
    0,
    'The parsing Worker must terminate after its single result.'
  )
  const tooSmall = await page.evaluate(async () => {
    try {
      await mountBinary('pe32.bin', { maxFileBytes: 8 })
      return null
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })
  assert.match(tooSmall || '', /configured 8 byte limit/u)
  await page.screenshot({ path: resolve(evidenceRoot, 'binary-inspector.png') })
  report.workers = await page.evaluate(() => ({ ...binaryWorkers }))
  report.externalRequests = requests.filter((url) => new URL(url).origin !== origin)
  assert.deepEqual(report.externalRequests, [])
  await writeFile(
    resolve(evidenceRoot, 'browser-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  )
  await writeFile(
    resolve(evidenceRoot, 'browser-diagnostics.json'),
    JSON.stringify({ browser: browser.version(), ...diagnostics }, null, 2) + '\n'
  )
  console.log(JSON.stringify({ status: 'passed', ...report }, null, 2))
} catch (error) {
  const readiness = await page
    ?.evaluate(() => ({
      binaryReady: window.binaryReady ?? null,
      readyError: window.binaryReadyError ?? window.readyError ?? null,
      documentReadyState: document.readyState
    }))
    .catch(() => null)
  await writeFile(
    resolve(evidenceRoot, 'browser-failure.json'),
    JSON.stringify(
      {
        error: { message: error.message, stack: error.stack },
        browser: browser.version(),
        readiness,
        ...diagnostics
      },
      null,
      2
    ) + '\n'
  )
  throw error
} finally {
  await browser.close()
  await new Promise((resolveServer) => server.close(resolveServer))
}
