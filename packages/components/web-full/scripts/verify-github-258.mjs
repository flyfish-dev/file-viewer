import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, delimiter, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { requireJsCases } from './requirejs-cases.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = resolve(packageDir, '../../..')
const inWorkspace = packageDir === resolve(workspaceRoot, 'packages/components/web-full') &&
  existsSync(resolve(workspaceRoot, 'pnpm-workspace.yaml'))
const root = inWorkspace ? workspaceRoot : packageDir
const require = createRequire(import.meta.url)
const modulePaths = (process.env.PATH || '').split(delimiter)
  .filter(entry => entry.endsWith(`${sep}node_modules${sep}.bin`)).map(entry => resolve(entry, '..'))
const playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [root, ...modulePaths] })).href)
const { chromium, webkit } = playwright.default || playwright
const requireJs = process.env.REQUIREJS_SCRIPT || require.resolve('requirejs/require.js', { paths: [resolve(root, 'apps/component-demo'), root, ...modulePaths] })
const output = resolve(root, process.env.REQUIREJS_OUTPUT_DIR || 'output/requirejs-github-258')
const fullDist = resolve(process.env.REQUIREJS_FULL_DIST || resolve(packageDir, 'dist'))
const lightDist = resolve(process.env.REQUIREJS_LIGHT_DIST || (inWorkspace
  ? resolve(packageDir, '../web/dist')
  : resolve(dirname(require.resolve('@file-viewer/web/package.json')), 'dist')))
const sampleDir = inWorkspace ? resolve(root, 'apps/viewer-demo/public/example') : resolve(root, 'test/requirejs-samples')
const demoSourceDir = inWorkspace ? resolve(root, 'apps/component-demo/public') : resolve(root, 'test/requirejs-demo')
const requireJsLicense = inWorkspace ? resolve(root, 'apps/component-demo/licenses/requirejs-2.3.7.txt') : resolve(demoSourceDir, 'requirejs/LICENSE')
const demoDir = process.env.REQUIREJS_DEMO_DIR ? resolve(root, process.env.REQUIREJS_DEMO_DIR) : null
const suffix = process.env.REQUIREJS_ENTRY_SUFFIX || 'amd'
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' }
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}#viewer{height:720px}</style></head>
<body><div id="viewer"></div><script src="/require.js"></script><script>
window.originalDefine = define;
window.amdRequire = requirejs.config({ context: 'file-viewer-test', baseUrl: '/tenant/app/', paths: {
  preview: 'viewer/flyfish-file-viewer-web-full.${suffix}',
  light: 'light/flyfish-file-viewer-web.${suffix}'
} });
window.loadViewer = () => new Promise((resolve, reject) => amdRequire(['preview'], api => {
  if (!api || typeof api.mountViewer !== 'function') { reject(new Error('RequireJS returned no viewer API')); return; }
  window.api = api; resolve(true);
}, reject));
</script></body></html>`
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  if (path === '/tenant/app/requirejs.html') {
    response.setHeader('Content-Type', 'text/html')
    response.end(await readFile(resolve(demoDir || demoSourceDir, 'requirejs.html')))
    return
  }
  if (path === '/tenant/app/' || path === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return }
  if (/^\/tenant\/app\/after-\w+\.js$/.test(path)) { response.setHeader('Content-Type', 'text/javascript'); response.end('define([], function () { return "host-module-ok" })'); return }
  const mounts = [
    ['/tenant/app/viewer/', fullDist],
    ['/tenant/app/file-viewer/', demoDir ? resolve(demoDir, 'file-viewer') : fullDist],
    ['/tenant/app/example/', demoDir ? resolve(demoDir, 'example') : sampleDir],
    ...(demoDir ? [['/tenant/app/requirejs/', resolve(demoDir, 'requirejs')]] : []),
    ['/tenant/app/light/', lightDist],
    ['/files/', sampleDir]
  ]
  let file = path === '/require.js' || path === '/tenant/app/requirejs/require.js' ? requireJs : null
  if (!demoDir && path === '/tenant/app/requirejs/LICENSE') file = requireJsLicense
  for (const [prefix, directory] of mounts) {
    if (!path.startsWith(prefix)) continue
    const candidate = resolve(directory, path.slice(prefix.length))
    if (candidate.startsWith(`${directory}${sep}`)) file = candidate
  }
  try {
    if (!file) throw new Error('Not found')
    const bytes = await readFile(file)
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.end(bytes)
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const reports = []
await mkdir(output, { recursive: true })
try {
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true })
    const page = await browser.newPage()
    const errors = []
    const requests = []
    let phase = 'module-load'
    page.on('pageerror', e => errors.push({ phase, message: e.message, stack: e.stack }))
    page.on('response', r => {
      if (/\.(?:m?js|wasm)(?:\?|$)/.test(r.url())) requests.push({ url: r.url(), status: r.status(), mime: r.headers()['content-type'] })
    })
    page.on('request', r => { if (!r.url().startsWith(origin) && /^https?:/.test(r.url())) errors.push(`External request: ${r.url()}`) })
    try {
      await page.goto(`${origin}/tenant/app/`)
      await page.evaluate(() => window.loadViewer())
      assert.equal(await page.evaluate(() => window.api.getDefaultFullAssetBaseUrl()), `${origin}/tenant/app/viewer/`)
      assert.equal(await page.evaluate(() => define === window.originalDefine), true)
      const cases = requireJsCases
      for (const [sample, selector] of cases) {
        phase = `mount:${sample}`
        await page.evaluate(async sample => {
          window.viewerController?.destroy()
          window.viewerController = window.api.mountViewer(document.getElementById('viewer'))
          await window.viewerController.load({ url: '/files/' + sample, name: sample, options: { theme: 'light' } })
        }, sample)
        await page.locator(selector).first().waitFor({ timeout: 45000 })
        // Loading a host module also flushes stray anonymous definitions made by
        // lazy vendor scripts. Checking just the viewer callback misses those.
        assert.equal(await page.evaluate(sample => new Promise((resolve, reject) => amdRequire(['after-' + sample.replace(/\W/g, '')], resolve, reject)), sample), 'host-module-ok')
        assert.equal(await page.evaluate(() => define === window.originalDefine), true)
        reports.push({ engine, sample, passed: true })
      }
      for (const renderer of ['word', 'pdf', 'ofd', 'presentation', 'spreadsheet', 'iwork', 'wordperfect', 'hangul', 'cad', 'typst', 'drawing', 'model', 'archive', 'email', 'ebook', 'text', 'image', 'media', 'mindmap', 'geo', 'data', 'eda']) {
        phase = `preload:${renderer}`
        await page.evaluate(renderer => window.api.preloadFullRenderer(renderer).then(() => true), renderer)
        assert.equal(await page.evaluate(renderer => new Promise((resolve, reject) => amdRequire(['after-' + renderer], resolve, reject)), renderer), 'host-module-ok')
      }
      assert.equal(await page.evaluate(() => new Promise((resolve, reject) => amdRequire(['light'], value => resolve(typeof value?.mountViewer), reject))), 'function')
      const alternate = await page.evaluate(() => new Promise((resolve, reject) => {
        requirejs.config({ context: 'another-consumer', paths: { arbitraryName: '/tenant/app/viewer/flyfish-file-viewer-web-full.amd' } })(['arbitraryName'], value => resolve(typeof value?.mountViewer), reject)
      }))
      assert.equal(alternate, 'function')
      phase = 'demo-load'
      await page.goto(`${origin}/tenant/app/requirejs.html`)
      const license = await page.request.get(`${origin}/tenant/app/requirejs/LICENSE`)
      assert.equal(license.status(), 200)
      assert.equal(await license.text(), await readFile(requireJsLicense, 'utf8'))
      for (const [sample, selector] of cases) {
        phase = `demo:${sample}`
        await page.locator('#sample:not([disabled])').waitFor()
        await page.locator('#sample').selectOption(sample)
        await page.waitForFunction(sample => document.getElementById('status').textContent === 'Ready: ' + sample, sample, { timeout: 45000 })
        await page.locator(selector).first().waitFor({ timeout: 45000 })
        reports.push({ engine, sample, surface: demoDir ? 'built-component-demo-page' : 'actual-component-demo-page', passed: true })
      }
      assert.deepEqual(errors, [])
      assert.ok(requests.some(r => r.url.includes('pptx.worker.js')), 'Actual PPTX Worker request is required')
      for (const request of requests) {
        assert.equal(request.status, 200, request.url)
        assert.match(request.mime, request.url.split('?')[0].endsWith('.wasm') ? /application\/wasm/ : /javascript/, request.url)
      }
      await page.screenshot({ path: resolve(output, `${engine}.png`) })
      console.log(`[issue-258] ${engine}: real RequireJS, five rendered formats plus actual Demo picker, 22 lazy renderer registrations, two contexts, light/full APIs and local Workers passed`)
    } finally {
      await writeFile(resolve(output, `${engine}.json`), JSON.stringify({ requests, errors, cases: reports.filter(r => r.engine === engine) }, null, 2))
      await browser.close()
    }
  }
} finally {
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ fullDist, lightDist, demoDir, cases: reports }, null, 2))
}
