// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion, recordBrowserGateFixture } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import assert from 'node:assert/strict'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launchBrowserForTest } from '../browser-test-launch.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../../..')
const require = createRequire(import.meta.url)
const componentRequire = createRequire(join(sourceRoot, 'apps/component-demo/package.json'))
const timeout = Number(process.env.FILE_VIEWER_ISSUE_212_TIMEOUT || 60_000)
const browsers = (process.env.FILE_VIEWER_ISSUE_212_BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-issue-212-react-'))
const maliciousFilename = 'evil"><img src=x onerror=globalThis.__issue212Injected=1>.txt'
const pdfPath = join(sourceRoot, 'apps/viewer-demo/public/example/pdf.pdf')

assert(existsSync(pdfPath), `Issue #212 PDF fixture is missing: ${pdfPath}`)

const encodeEml = async ({ attachments = true } = {}) => {
  const lines = [
    'From: sender@example.com',
    'To: recipient@example.com',
    'Subject: Issue 212 nested attachments',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="issue-212"',
    '',
    '--issue-212',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Issue 212 attachment cleanup fixture.',
    '--issue-212',
    'Content-Type: image/png',
    'Content-ID: <pixel@issue212>',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: inline; filename="pixel.png"',
    '',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  ]
  if (attachments) {
    lines.push(
      '--issue-212',
      'Content-Type: application/pdf',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="contract.pdf"',
      '',
      (await readFile(pdfPath)).toString('base64'),
      '--issue-212',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(maliciousFilename)}`,
      '',
      Buffer.from('safe text attachment for Issue 212').toString('base64')
    )
  }
  lines.push('--issue-212--', '')
  return Buffer.from(lines.join('\r\n')).toString('base64')
}

const initialEml = await encodeEml()
const replacementEml = await encodeEml({ attachments: false })
// BEGIN PREPACK COMPLETION OBSERVATION
if (process.env.FILE_VIEWER_PREPACK_TRACE_DIR) {
  const initialBytes = Buffer.from(initialEml, 'base64')
  const replacementBytes = Buffer.from(replacementEml, 'base64')
  await recordBrowserGateFixture('issue-212-react-email-attachments', 'generated/issue-212-initial.eml', initialBytes)
  await globalThis.__fileViewerPrepackObserveNodeFixture?.('generated/issue-212-initial.eml', initialBytes)
  await recordBrowserGateFixture('issue-212-react-email-attachments', 'generated/issue-212-replacement.eml', replacementBytes)
  await globalThis.__fileViewerPrepackObserveNodeFixture?.('generated/issue-212-replacement.eml', replacementBytes)
}
// END PREPACK COMPLETION OBSERVATION
const viewerCases = [
  ['react-standard', 'React + preset-standard'],
  ['react-full', 'React Full'],
  ['react-legacy-standard', 'React Legacy + preset-standard'],
  ['react-legacy-full', 'React Legacy Full'],
]

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><title>Issue 212 React email attachments</title><style>html,body,#app{margin:0;min-height:100%;font-family:system-ui}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px}.case{height:720px;min-width:0;border:1px solid #dbe3ea}.case h2{height:32px;margin:0;padding:6px 10px;box-sizing:border-box;font-size:14px}.viewer{height:calc(100% - 32px)}@media(max-width:900px){.grid{grid-template-columns:1fr}}</style></head><body><main id="app"></main><script type="module" src="/app.js"></script></body></html>`

const main = `
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FileViewer as ReactViewer } from '@file-viewer/react'
import { FileViewer as ReactFullViewer } from '@file-viewer/react-full'
import { FileViewerLegacy } from '@file-viewer/react-legacy'
import { FileViewerLegacy as ReactLegacyFullViewer } from '@file-viewer/react-legacy-full'
import { fileViewerPresetStandard } from '@file-viewer/preset-standard'

const state = window.__ISSUE_212_STATE__ = {
  status: 'starting', errors: [], objectUrls: new Set(), workers: new Set(), events: []
}
const nativeCreateObjectURL = URL.createObjectURL.bind(URL)
const nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL)
URL.createObjectURL = blob => { const url = nativeCreateObjectURL(blob); state.objectUrls.add(url); return url }
URL.revokeObjectURL = url => { state.objectUrls.delete(url); return nativeRevokeObjectURL(url) }
const NativeWorker = window.Worker
if (NativeWorker) {
  window.Worker = function (...args) {
    const worker = new NativeWorker(...args)
    state.workers.add(worker)
    const terminate = worker.terminate.bind(worker)
    worker.terminate = () => { state.workers.delete(worker); return terminate() }
    return worker
  }
  window.Worker.prototype = NativeWorker.prototype
}
const decode = value => Uint8Array.from(atob(value), character => character.charCodeAt(0)).buffer
const initial = decode(${JSON.stringify(initialEml)})
const replacement = decode(${JSON.stringify(replacementEml)})
const standardOptions = { preset: fileViewerPresetStandard, rendererMode: 'replace', autoRenderers: false, theme: 'light' }
const fullOptions = { theme: 'light' }
const onEvent = event => state.events.push(event.type)

function Case({ id, label, Viewer, options, buffer }) {
  return React.createElement('section', { className: 'case', id },
    React.createElement('h2', null, label),
    React.createElement(Viewer, { className: 'viewer', buffer, filename: 'issue-212.eml', options, onEvent })
  )
}
function App() {
  const [buffer, setBuffer] = useState(initial)
  window.__ISSUE_212_REPLACE__ = () => setBuffer(replacement)
  return React.createElement('div', { className: 'grid' },
    React.createElement(Case, { id: 'react-standard', label: 'React + preset-standard', Viewer: ReactViewer, options: standardOptions, buffer }),
    React.createElement(Case, { id: 'react-full', label: 'React Full', Viewer: ReactFullViewer, options: fullOptions, buffer }),
    React.createElement(Case, { id: 'react-legacy-standard', label: 'React Legacy + preset-standard', Viewer: FileViewerLegacy, options: standardOptions, buffer }),
    React.createElement(Case, { id: 'react-legacy-full', label: 'React Legacy Full', Viewer: ReactLegacyFullViewer, options: fullOptions, buffer })
  )
}
const root = createRoot(document.getElementById('app'))
window.__ISSUE_212_UNMOUNT__ = () => root.unmount()
try { root.render(React.createElement(App)); state.status = 'mounted' } catch (error) { state.status = 'error'; state.errors.push(String(error?.stack || error)) }
window.addEventListener('error', event => state.errors.push(String(event.error?.stack || event.message)))
window.addEventListener('unhandledrejection', event => state.errors.push(String(event.reason?.stack || event.reason)))
`

const mime = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.wasm', 'application/wasm'], ['.json', 'application/json; charset=utf-8'],
  ['.otf', 'font/otf'], ['.ttf', 'font/ttf'], ['.png', 'image/png'],
])

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const roots = process.env.PATH?.split(delimiter)
      .filter(entry => entry.endsWith(`${sep}node_modules${sep}.bin`))
      .map(entry => resolve(entry, '..')) || []
    for (const root of roots) {
      try {
        return await import(pathToFileURL(require.resolve('playwright', { paths: [root] })).href)
      } catch {
        // Continue probing npm-exec package roots.
      }
    }
    throw error
  }
}

const startServer = async root => {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    const normalized = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
    const requested = normalized === '/' ? 'index.html' : normalized.replace(/^[/\\]+/, '')
    const path = resolve(root, requested)
    if (!path.startsWith(root) || relative(root, path).startsWith('..') || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end('Not Found'); return
    }
    response.writeHead(200, { 'Content-Type': mime.get(extname(path).toLowerCase()) || 'application/octet-stream' })
    createReadStream(path).pipe(response)
  })
  await new Promise((resolveServer, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveServer) })
  return { server, url: `http://127.0.0.1:${server.address().port}` }
}

const deepHelpers = () => {
  const roots = root => {
    const values = [root]
    for (const element of root.querySelectorAll('*')) if (element.shadowRoot) values.push(...roots(element.shadowRoot))
    return values
  }
  const within = id => roots(document.querySelector(id))
  window.__issue212FindAll = (id, selector) => within(id).flatMap(root => [...root.querySelectorAll(selector)])
  window.__issue212FindButton = (id, text) => window.__issue212FindAll(id, '.attachment-item').find(button => button.textContent.includes(text))
}

await Promise.all([
  mkdir(join(harnessRoot, 'public'), { recursive: true }),
  writeFile(join(harnessRoot, 'index.html'), html),
  writeFile(join(harnessRoot, 'main.js'), main),
])
await cp(join(sourceRoot, 'apps/component-demo/public/file-viewer'), join(harnessRoot, 'public/file-viewer'), { recursive: true })
await cp(
  join(sourceRoot, 'apps/component-demo/public/file-viewer/vendor/pdf'),
  join(harnessRoot, 'public/vendor/pdf'),
  { recursive: true }
)

const viteEntry = componentRequire.resolve('vite')
const { build } = await import(pathToFileURL(viteEntry).href)
const previousCwd = process.cwd()
process.chdir(harnessRoot)
try {
  await build({
    root: harnessRoot,
    configFile: false,
    publicDir: 'public',
    resolve: {
      alias: [
        { find: /^react-dom\/client$/, replacement: componentRequire.resolve('react-dom/client') },
        { find: /^react\/jsx-runtime$/, replacement: componentRequire.resolve('react/jsx-runtime') },
        { find: /^react$/, replacement: componentRequire.resolve('react') },
        { find: /^@file-viewer\/react-full$/, replacement: join(sourceRoot, 'packages/components/react-full/dist/index.js') },
        { find: /^@file-viewer\/react$/, replacement: join(sourceRoot, 'packages/components/react/dist/index.js') },
        { find: /^@file-viewer\/react-legacy-full$/, replacement: join(sourceRoot, 'packages/components/react-legacy-full/dist/index.js') },
        { find: /^@file-viewer\/react-legacy$/, replacement: join(sourceRoot, 'packages/components/react-legacy/dist/index.js') },
        { find: /^@file-viewer\/preset-standard$/, replacement: join(sourceRoot, 'packages/presets/standard/dist/index.js') },
      ],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: join(harnessRoot, 'main.js'),
        output: { entryFileNames: 'app.js' },
      },
    },
  })
} finally {
  process.chdir(previousCwd)
}
await writeFile(join(harnessRoot, 'dist/index.html'), html)

const { server, url } = await startServer(join(harnessRoot, 'dist'))
const playwrightModule = await importPlaywright()
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
const reports = []

try {
  for (const browserName of browsers) {
    const browserType = playwright[browserName]
    assert(browserType, `Unknown Playwright browser: ${browserName}`)
    const browser = await launchBrowserForTest(browserType, browserName, { headless: true })
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
    const failures = []
    const consoleDiagnostics = []
    page.on('pageerror', error => failures.push(`pageerror: ${error.stack || error.message}`))
    page.on('console', message => {
      if (message.type() !== 'error') return
      const diagnostic = Promise.all(message.args().map(argument => argument.evaluate(value => {
        if (value instanceof Error) {
          return { name: value.name, message: value.message, stack: value.stack }
        }
        return typeof value === 'string' ? value : String(value)
      }).catch(() => '<unavailable>'))).then(values => {
        failures.push(`console: ${message.text()} args=${JSON.stringify(values)}`)
      })
      consoleDiagnostics.push(diagnostic)
    })
    page.on('requestfailed', request => failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`))
    page.on('response', response => { if (response.status() >= 400) failures.push(`response: ${response.status()} ${response.url()}`) })
    await page.goto(url, { waitUntil: 'networkidle', timeout })
    await page.evaluate(deepHelpers)

    const cases = []
    for (const [id, label] of viewerCases) {
      await page.waitForFunction(caseId => window.__issue212FindAll(caseId, '.attachment-item').length === 3, `#${id}`, { timeout })
      await page.evaluate(caseId => window.__issue212FindButton(caseId, 'contract.pdf').click(), `#${id}`)
      await page.waitForFunction(caseId => window.__issue212FindAll(caseId, '.attachment-target canvas').some(canvas => canvas.width > 10 && canvas.height > 10), `#${id}`, { timeout })
      const pdfCanvas = await page.evaluate(caseId => {
        const canvas = window.__issue212FindAll(caseId, '.attachment-target canvas').find(item => item.width > 10 && item.height > 10)
        return { width: canvas.width, height: canvas.height }
      }, `#${id}`)
      await page.evaluate(({ caseId, filename }) => window.__issue212FindButton(caseId, filename).click(), {
        caseId: `#${id}`,
        filename: maliciousFilename,
      })
      await page.waitForFunction(caseId => window.__issue212FindAll(caseId, '.attachment-target .code-viewer').some(node => node.textContent.includes('safe text attachment')), `#${id}`, { timeout })
      const security = await page.evaluate(({ caseId, filename }) => ({
        filenameVisible: window.__issue212FindAll(caseId, '.attachment-preview-head strong').some(node => node.textContent === filename),
        injectedImageCount: window.__issue212FindAll(caseId, 'img[src="x"]').length,
        sentinel: window.__issue212Injected,
      }), { caseId: `#${id}`, filename: maliciousFilename })
      assert.equal(security.filenameVisible, true, `${label} lost the hostile attachment filename text`)
      assert.equal(security.injectedImageCount, 0, `${label} created markup from an attachment filename`)
      assert.equal(security.sentinel, undefined, `${label} executed an attachment filename payload`)
      cases.push({ id, label, attachmentCount: 3, pdfCanvas, textPreview: true, security })
    }

    await page.evaluate(() => window.__ISSUE_212_REPLACE__())
    await page.waitForFunction(() => ['#react-standard', '#react-full', '#react-legacy-standard', '#react-legacy-full'].every(id => window.__issue212FindAll(id, '.attachment-item').length === 1), null, { timeout })
    await page.evaluate(() => window.__ISSUE_212_UNMOUNT__())
    await page.waitForFunction(() => document.querySelector('#app').childElementCount === 0, null, { timeout })
    const cleanup = await page.evaluate(() => ({
      activeObjectUrls: window.__ISSUE_212_STATE__.objectUrls.size,
      activeWorkers: window.__ISSUE_212_STATE__.workers.size,
      errors: window.__ISSUE_212_STATE__.errors,
      unloadCompleteCount: window.__ISSUE_212_STATE__.events.filter(event => event === 'unload-complete').length,
    }))
    await Promise.all(consoleDiagnostics)
    assert.equal(cleanup.activeObjectUrls, 0, `${browserName} leaked email object URLs`)
    assert.equal(cleanup.activeWorkers, 0, `${browserName} leaked PDF workers`)
    assert.deepEqual(cleanup.errors, [], `${browserName} reported application errors`)
    assert.deepEqual(failures, [], `${browserName} reported browser failures`)
    reports.push({ browser: browserName, cases, cleanup })
    await browser.close()
    // BEGIN PREPACK COMPLETION OBSERVATION
    await recordBrowserGateCompletion({ gateId: 'issue-212-react-email-attachments', engine: browserName, phase: 'full',
      caseIds: [...cases.map(item => item.id), 'replacement-and-unmount-cleanup'], fixtures: ['synthetic-email-with-public-pdf-and-hostile-filename'],
      summary: { caseCount: cases.length, cleanup } })
    // END PREPACK COMPLETION OBSERVATION
  }
  console.log(JSON.stringify({ status: 'passed', browsers: reports }, null, 2))
} finally {
  await new Promise(resolveServer => server.close(resolveServer))
  if (process.env.FILE_VIEWER_ISSUE_212_KEEP !== '1') await rm(harnessRoot, { recursive: true, force: true })
}
