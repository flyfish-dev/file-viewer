import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildPackedIssueConsumer } from './build-packed-issue-consumer.mjs'

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const project = process.env.PACKED_ANGULAR_CONSUMER_DIR
  ? resolve(process.env.PACKED_ANGULAR_CONSUMER_DIR)
  : await buildPackedIssueConsumer(process.env.PACKED_ISSUE_PACKAGE_DIR, {
      fixture: 'angular-pptx',
      required: [
        '@file-viewer/core',
        '@file-viewer/web',
        '@file-viewer/pptx',
        '@file-viewer/preset-office'
      ],
      renderers: 'office-presentation'
    })
const output = resolve(project, 'angular-regression-evidence')
await mkdir(output, { recursive: true })
const require = createRequire(import.meta.url)
const JSZip = createRequire(resolve(project, 'package.json'))('jszip')
const archive = await JSZip.loadAsync(await readFile(resolve(project, 'public/sample.pptx')))
const presentation = await archive.file('ppt/presentation.xml').async('string')
const expectedSlides = (presentation.match(/<p:sldId\b/g) || []).length
assert.ok(expectedSlides > 0, 'Fixture has no presentation slide relationships')
let playwright
for (const path of [
  source,
  ...(process.env.PATH || '')
    .split(delimiter)
    .filter((p) => p.endsWith(`${sep}node_modules${sep}.bin`))
    .map((p) => resolve(p, '..'))
]) {
  try {
    playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [path] })).href)
    break
  } catch {}
}
assert.ok(playwright, 'Run with npm exec --package playwright')
const browser = await (playwright.chromium || playwright.default.chromium).launch({
  headless: true
})
const report = {
  project,
  angular: '22.0.7',
  baseHref: '/ui/',
  expectedSlides,
  cases: [],
  passed: false
}
let dev,
  server,
  page,
  devLog = ''

async function bind(server) {
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  return server.address().port
}
async function verify(mode, port) {
  page = await browser.newPage({ viewport: { width: 1200, height: 820 } })
  page.setDefaultTimeout(90_000)
  const workers = [],
    errors = [],
    responses = [],
    failures = []
  page.on('worker', (worker) => workers.push(worker.url()))
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) =>
    responses.push({
      url: response.url(),
      status: response.status(),
      mime: response.headers()['content-type'] || ''
    })
  )
  page.on('requestfailed', (request) =>
    failures.push({ url: request.url(), failure: request.failure() })
  )
  const result = {
    mode,
    url: `http://127.0.0.1:${port}/ui/`,
    workers,
    errors,
    responses,
    failures,
    passed: false
  }
  report.cases.push(result)
  await page.goto(result.url)
  const first = page.locator('.flyfish-pptx-slide-slot').first()
  await first.waitFor({ state: 'visible' })
  await page.locator('.flyfish-pptx-content[data-render-state="ready"]').waitFor()
  await page.waitForFunction(() => {
    const query = (root) =>
      [...root.querySelectorAll('*')].some(
        (el) =>
          (el.matches('.flyfish-pptx-slide-slot') && el.textContent.trim().length > 5) ||
          (el.shadowRoot && query(el.shadowRoot))
      )
    return query(document)
  })
  result.slides = await page.locator('.flyfish-pptx-slide-slot').count()
  assert.equal(result.slides, expectedSlides, `${mode}: the Worker did not process every slide`)
  result.text = (await first.innerText()).slice(0, 200)
  await page.screenshot({ path: resolve(output, `${mode}-first.png`) })
  const last = page.locator('.flyfish-pptx-slide-slot').last()
  await last.scrollIntoViewIfNeeded()
  await last.locator('.slide').waitFor({ state: 'visible' })
  assert.equal(
    await page.locator('.flyfish-pptx-slide-error').count(),
    0,
    `${mode}: slide parsing/rendering failed`
  )
  assert.ok(workers.length > 0, `${mode}: PPTX silently fell back to main-thread parsing`)
  assert.deepEqual(errors, [], `${mode}: browser runtime errors`)
  assert.deepEqual(failures, [], `${mode}: failed application/Worker requests`)
  for (const url of workers) {
    assert.ok(
      !url.includes('/vite/deps/worker/'),
      `${mode}: optimized cache path leaked into Worker URL`
    )
    const response = responses.find((response) => response.url === url)
    assert.ok(
      response && response.status === 200 && /javascript/.test(response.mime),
      `${mode}: Worker did not load executable JavaScript: ${url}`
    )
  }
  assert.ok(
    !responses.some((response) => response.status >= 400),
    `${mode}: application returned failed resource responses`
  )
  await page.screenshot({ path: resolve(output, `${mode}.png`) })
  result.passed = true
  await page.close()
}

try {
  const probe = createServer()
  const port = await bind(probe)
  await new Promise((done) => probe.close(done))
  dev = spawn(
    process.execPath,
    [
      resolve(project, 'node_modules/@angular/cli/bin/ng.js'),
      'serve',
      '--host',
      '127.0.0.1',
      '--port',
      String(port)
    ],
    {
      cwd: project,
      env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )
  dev.stdout.on('data', (bytes) => {
    devLog += bytes
  })
  dev.stderr.on('data', (bytes) => {
    devLog += bytes
  })
  const deadline = Date.now() + 120_000
  while (true) {
    assert.equal(dev.exitCode, null, `ng serve exited: ${devLog}`)
    try {
      if ((await fetch(`http://127.0.0.1:${port}/ui/`, { signal: AbortSignal.timeout(1000) })).ok)
        break
    } catch {}
    assert.ok(Date.now() < deadline, `ng serve did not start: ${devLog}`)
    await new Promise((done) => setTimeout(done, 200))
  }
  await verify('development', port)
  const manifest = resolve(project, 'public/file-viewer/flyfish-viewer-assets.json')
  await rename(manifest, `${manifest}.held`)
  try {
    await verify('development-package-worker', port)
  } finally {
    await rename(`${manifest}.held`, manifest)
  }

  const root = resolve(project, 'dist/browser')
  server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    const name = url.pathname.startsWith('/ui/') ? url.pathname.slice(4) || 'index.html' : ''
    const file = resolve(root, name)
    if (!name || !file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end('Not found')
      return
    }
    const mime =
      {
        '.html': 'text/html',
        '.json': 'application/json',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.wasm': 'application/wasm'
      }[extname(file)] || 'application/octet-stream'
    response.writeHead(200, { 'content-type': mime })
    createReadStream(file).pipe(response)
  })
  await verify('production', await bind(server))
  report.candidates = JSON.parse(
    await readFile(resolve(project, 'candidate-packages.json'), 'utf8')
  )
  report.passed = true
} catch (error) {
  report.error = String(error)
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png') })
  throw error
} finally {
  dev?.kill('SIGTERM')
  if (dev && dev.exitCode === null) await new Promise((done) => dev.once('exit', done))
  await browser.close()
  if (server) await new Promise((done) => server.close(done))
  await writeFile(resolve(output, 'ng-serve.log'), devLog)
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(`Angular 22 ng serve and production /ui/ PPTX Worker passed: ${output}`)
