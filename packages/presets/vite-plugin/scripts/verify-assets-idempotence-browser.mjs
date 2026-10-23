import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer as createHttpServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  createAssetFixture,
  snapshotAssets,
  wasmBytes,
  workerBytes,
  write
} from './asset-copy-fixtures.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const require = createRequire(new URL('../package.json', import.meta.url))
const { createServer, build } = await import(pathToFileURL(require.resolve('vite')).href)
const { chromium, webkit } = createRequire(join(root, 'package.json'))('playwright')
const reportPath =
  process.env.FILE_VIEWER_ASSET_COPY_REPORT ||
  join(root, 'output/asset-copy-idempotence/report.json')
const temporary = await mkdtemp(join(tmpdir(), 'file-viewer-copy-browser-'))
const previous = process.cwd()
const report = {
  status: 'running',
  syntheticConsumer: true,
  viteVersion: require('vite/package.json').version,
  cases: [],
  startedAt: new Date().toISOString()
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const valueModule = (value) =>
  `export const message = ${JSON.stringify(value)};\nexport const fileViewerFormats = ['pdf'];\n`

async function probeRuntime(page, baseDir) {
  const result = await page.evaluate(async (baseDir) => {
    const workerUrl = `/${baseDir}/vendor/pdf/pdf.worker.mjs`
    const workerResponse = await fetch(workerUrl)
    const wasmResponse = await fetch(`/${baseDir}/vendor/pdf/wasm/add.wasm`)
    const workerBytes = Array.from(new Uint8Array(await workerResponse.arrayBuffer()))
    const wasmBytes = Array.from(new Uint8Array(await wasmResponse.arrayBuffer()))
    const worker = new Worker(workerUrl, { type: 'module' })
    const answer = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Native Worker did not respond')), 10000)
      worker.onmessage = (event) => {
        clearTimeout(timeout)
        resolve(event.data.answer)
      }
      worker.onerror = (event) => {
        clearTimeout(timeout)
        reject(new Error(event.message))
      }
      worker.postMessage(41)
    }).finally(() => worker.terminate())
    const { instance } = await WebAssembly.instantiate(Uint8Array.from(wasmBytes))
    return {
      worker: {
        status: workerResponse.status,
        mime: workerResponse.headers.get('content-type'),
        bytes: workerBytes,
        answer
      },
      wasm: {
        status: wasmResponse.status,
        mime: wasmResponse.headers.get('content-type'),
        bytes: wasmBytes,
        answer: instance.exports.add(20, 22)
      }
    }
  }, baseDir)
  assert.equal(result.worker.status, 200)
  assert.match(result.worker.mime, /javascript/)
  assert.equal(result.worker.answer, 42)
  assert.equal(hash(Buffer.from(result.worker.bytes)), hash(workerBytes))
  assert.equal(result.wasm.status, 200)
  assert.match(result.wasm.mime, /application\/wasm/)
  assert.equal(result.wasm.answer, 42)
  assert.equal(hash(Buffer.from(result.wasm.bytes)), hash(wasmBytes))
  return {
    realWorkerAnswer: result.worker.answer,
    wasmAnswer: result.wasm.answer,
    workerSha256: hash(workerBytes),
    wasmSha256: hash(wasmBytes)
  }
}

try {
  for (const profile of ['legacy', 'full', 'full-default']) {
    const consumerRoot = join(temporary, profile)
    const fixture = await createAssetFixture(consumerRoot, profile)
    await symlink(
      await realpath(require.resolve('vite/package.json').replace(/[/\\]package\.json$/, '')),
      join(consumerRoot, 'node_modules/vite'),
      'dir'
    )
    await write(
      join(consumerRoot, 'index.html'),
      '<!doctype html><div id="message"></div><script type="module" src="/src/main.js"></script>'
    )
    await write(join(consumerRoot, 'src/message.js'), valueModule('initial'))
    await write(
      join(consumerRoot, 'src/main.js'),
      `
import { message } from './message.js';
window.boots = Number(sessionStorage.getItem('boots') || 0) + 1;
sessionStorage.setItem('boots', String(window.boots));
window.hmrUpdates = 0;
document.querySelector('#message').textContent = message;
if (import.meta.hot) import.meta.hot.accept('./message.js', next => {
  document.querySelector('#message').textContent = next.message;
  window.hmrUpdates++;
});
`
    )
    process.chdir(consumerRoot)
    const { fileViewerRenderers } = await import(
      pathToFileURL(join(consumerRoot, 'plugin.mjs')).href
    )
    const defaultOptions = profile === 'full-default'
    const baseDir = defaultOptions ? 'file-viewer' : 'viewer'
    const plugin = () =>
      fileViewerRenderers(
        defaultOptions
          ? { copyAssets: true }
          : {
              formats: fixture.formats,
              autoPresets: false,
              inject: false,
              scan: true,
              copyAssets: { baseDir }
            }
      )
    const common = {
      root: consumerRoot,
      configFile: false,
      publicDir: 'dummy-non-existing-dir',
      logLevel: 'error'
    }
    const target = join(consumerRoot, 'dummy-non-existing-dir', baseDir)
    const server = await createServer({
      ...common,
      plugins: [plugin()],
      server: { host: '127.0.0.1', port: 0 }
    })
    try {
      await server.listen()
      const origin = `http://127.0.0.1:${server.httpServer.address().port}`
      const before = await snapshotAssets(target, true)
      for (const [engine, browserType] of [
        ['chromium', chromium],
        ['webkit', webkit]
      ]) {
        const browser = await browserType.launch()
        try {
          const page = await browser.newPage(),
            errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.goto(origin, { waitUntil: 'networkidle' })
          if (defaultOptions) {
            assert.equal(await page.evaluate(() => globalThis.assetBase), '/file-viewer/')
            assert.equal(await page.evaluate(() => globalThis.fullAssetBase), '/file-viewer/')
          }
          const initialBoots = await page.evaluate(() => window.boots)
          const next = `${profile}-${engine}-updated`
          await writeFile(join(consumerRoot, 'src/message.js'), valueModule(next))
          await page.waitForFunction(
            (expected) => document.querySelector('#message').textContent === expected,
            next,
            { timeout: 30000 }
          )
          const actual = await page.evaluate(() => ({
            boots: window.boots,
            updates: window.hmrUpdates
          }))
          assert.equal(
            actual.boots,
            initialBoots,
            'A business edit must use HMR rather than reloading the page'
          )
          assert(actual.updates > 0)
          assert.deepEqual(
            await snapshotAssets(target),
            before,
            'HMR must not write unchanged runtime assets'
          )
          const runtime = await probeRuntime(page, baseDir)
          assert.deepEqual(errors, [])
          report.cases.push({
            profile,
            engine,
            mode: 'dev-hmr',
            status: 'passed',
            ...actual,
            ...runtime
          })
        } finally {
          await browser.close()
        }
      }
      await server.restart()
      assert.deepEqual(
        await snapshotAssets(target),
        before,
        'Restarting Vite must not rewrite unchanged runtime assets'
      )
      report.cases.push({
        profile,
        mode: 'dev-restart',
        status: 'passed',
        unchangedAssetMetadata: true
      })
    } finally {
      await server.close()
    }

    await build({ ...common, plugins: [plugin()], build: { outDir: 'dist' } })
    const builtTarget = join(consumerRoot, 'dist', baseDir)
    const beforeBuild = await snapshotAssets(builtTarget, true)
    // Vite owns clean-output/public copying; isolate the plugin's retained-output
    // behavior after also verifying a normal clean build above.
    await build({
      ...common,
      plugins: [plugin()],
      build: { outDir: 'dist', emptyOutDir: false, copyPublicDir: false }
    })
    assert.deepEqual(await snapshotAssets(builtTarget), beforeBuild)
    assert.equal(
      JSON.parse(await readFile(join(builtTarget, 'flyfish-viewer-assets.json'))).copiedAt,
      undefined
    )
    const dist = join(consumerRoot, 'dist')
    const production = createHttpServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
        const path = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname))
        if (!path.startsWith(dist + sep)) {
          response.writeHead(403).end()
          return
        }
        const mime =
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.mjs': 'text/javascript',
            '.wasm': 'application/wasm',
            '.json': 'application/json'
          }[extname(path)] || 'application/octet-stream'
        response.writeHead(200, { 'Content-Type': mime }).end(await readFile(path))
      } catch {
        response.writeHead(404).end()
      }
    })
    try {
      await new Promise((done) => production.listen(0, '127.0.0.1', done))
      const origin = `http://127.0.0.1:${production.address().port}`
      for (const [engine, browserType] of [
        ['chromium', chromium],
        ['webkit', webkit]
      ]) {
        const browser = await browserType.launch()
        try {
          const page = await browser.newPage(),
            errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.goto(origin, { waitUntil: 'networkidle' })
          assert.equal(await page.locator('#message').textContent(), `${profile}-webkit-updated`)
          if (defaultOptions) {
            assert.equal(await page.evaluate(() => globalThis.assetBase), '/file-viewer/')
            assert.equal(await page.evaluate(() => globalThis.fullAssetBase), '/file-viewer/')
          }
          const runtime = await probeRuntime(page, baseDir)
          assert.deepEqual(errors, [])
          report.cases.push({
            profile,
            engine,
            mode: 'production',
            status: 'passed',
            cleanBuildPassed: true,
            retainedOutputNoopPassed: true,
            ...runtime
          })
        } finally {
          await browser.close()
        }
      }
    } finally {
      production.closeAllConnections()
      await new Promise((done) => production.close(done))
    }
    process.chdir(previous)
  }
  report.status = 'passed-targeted-asset-copy-hmr-and-build'
} catch (error) {
  report.status = 'failed-targeted-asset-copy-hmr-and-build'
  report.error = error.stack || String(error)
  throw error
} finally {
  process.chdir(previous)
  report.completedAt = new Date().toISOString()
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
  await rm(temporary, { recursive: true, force: true })
}
console.log(
  JSON.stringify({ status: report.status, cases: report.cases.length, vite: report.viteVersion })
)
