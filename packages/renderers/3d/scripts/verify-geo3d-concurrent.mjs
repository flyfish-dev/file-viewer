import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { respondGeo3dFixtureError, verifyGeo3dFixtureErrors } from './geo3d-fixture-http.mjs'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  copyGeo3dAssets,
  browserOutput,
  rendererFile,
  engineFile,
  runtimeGraphPlugin
} from './geo3d-browser-package.mjs'

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..')
const output = browserOutput,
  work = join(output, 'concurrent-source'),
  site = join(output, 'concurrent-site')
const fixtures = resolve(here, '../test/fixtures/geo3d'),
  vendor = join(site, 'vendor')
const report = {
  status: 'running',
  cases: [],
  notRun: [],
  limitations: [
    'Complete simultaneous viewers and pending source initialization are separate phases; COPC metadata decoding precedes Instance construction.',
    'Worker startup is held by the local HTTP server, not replaced by mock decoders.',
    'Abort covers pending dispatched work and asynchronous hooks; it is not a CPU-instruction-level codec interruption benchmark.',
    'Renderer memory counters are observations, not a production-scale heap or cache benchmark.'
  ]
}
let server,
  browser,
  holdWorkers = false,
  onGate
const held = [],
  transfers = []
function releaseWorkers() {
  holdWorkers = false
  onGate = undefined
  for (const release of held.splice(0)) release()
}
function beginHold() {
  holdWorkers = true
  return new Promise((resolve) => {
    onGate = resolve
  })
}
function deadline(promise) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Worker request did not reach the controlled server')),
        45000
      )
    })
  ]).finally(() => clearTimeout(timer))
}
const datasets = {
  copc: '/datasets/streaming.copc.laz',
  geotiff: '/datasets/striped.geotiff',
  cog: '/datasets/streaming.cog'
}
async function ready(page, id) {
  await page.waitForFunction(
    (id) => {
      const state = window.concurrent.state(id)
      if (state?.status === 'rejected') throw new Error(JSON.stringify(state.error))
      return (
        state?.status === 'fulfilled' &&
        state.canvas > 0 &&
        !state.loading &&
        (state.render?.points > 0 || state.render?.triangles > 0)
      )
    },
    id,
    { timeout: 45000 }
  )
  return page.evaluate((id) => window.concurrent.state(id), id)
}
async function redraw(page, id) {
  const frame = await page.evaluate((id) => window.concurrent.notify(id), id)
  await page.waitForFunction(
    ({ id, frame }) => window.concurrent.state(id).render.frame > frame,
    { id, frame },
    { timeout: 45000 }
  )
}
function closed(state) {
  assert.equal(state.canvas, 0)
  assert.equal(state.sameUnmountPromise, true)
  assert.deepEqual(state.cleanup, ['configure', 'instance'])
}
async function pending(page, id, known) {
  await page.waitForFunction(
    ({ id, known }) => {
      const state = window.concurrent.state(id)
      if (state?.status === 'rejected') throw new Error(JSON.stringify(state.error))
      // COPC must decode initial metadata before constructing its Instance.
      // Require actual dispatched work, not an Instance that depends on it.
      return (
        Boolean(state) &&
        window.concurrent
          .workers()
          .some((worker) => worker.live && !known.includes(worker.id) && worker.pending > 0)
      )
    },
    { id, known },
    { timeout: 45000 }
  )
  return page.evaluate(
    (known) =>
      window.concurrent.workers().filter((worker) => worker.live && !known.includes(worker.id)),
    known
  )
}
try {
  await mkdir(work, { recursive: true })
  const require = createRequire(join(root, 'package.json'))
  const { chromium } = require('playwright')
  const viteRequire = createRequire(join(root, 'apps/viewer-demo/package.json'))
  const { build } = await import(pathToFileURL(viteRequire.resolve('vite')).href)
  await writeFile(
    join(work, 'index.html'),
    '<!doctype html><meta charset="utf-8"><title>Geo3D concurrent owners</title><style>html,body{margin:0;width:100%;height:100%}</style><script type="module" src="./main.js"></script>'
  )
  const modules = [
    'core/Instance',
    'controls/FirstPersonControls',
    'sources/COPCSource',
    'sources/LASSource',
    'sources/GeoTIFFSource',
    'entities/PointCloud',
    'entities/Tiles3D',
    'entities/Map',
    'core/layer/ColorLayer'
  ]
  await writeFile(
    join(work, 'main.js'),
    `
import { renderFileViewerGeo3d } from ${JSON.stringify(rendererFile('dist/geo3d.js'))};
import { installConcurrentViewerHarness } from ${JSON.stringify(join(here, 'geo3d-concurrent-client.mjs'))};
installConcurrentViewerHarness(renderFileViewerGeo3d);
window.prepareEngine = async () => {
  await Promise.all([${modules.map((path) => `import(${JSON.stringify(engineFile(path + '.js'))})`).join(',\n')}]);
  return window.concurrent.freezeModuleState();
};
window.entryReady = true;
`
  )
  await build({
    configFile: false,
    root: work,
    base: '/nested/app/',
    logLevel: 'warn',
    plugins: [runtimeGraphPlugin('concurrent')],
    build: { outDir: site, emptyOutDir: true, target: 'es2022' }
  })
  await copyGeo3dAssets(vendor)
  const data = new Map([
    [
      datasets.copc,
      await readFile(join(fixtures, 'samples-mit/original-deliveries/streaming-16384.copc.laz'))
    ],
    [datasets.geotiff, await readFile(join(fixtures, 'samples-mit/geotiff-striped.tif'))],
    // Generated and validated by the ordinary dataset suite immediately before this suite.
    [datasets.cog, await readFile(join(output, 'streaming-generated.cog.tif'))]
  ])
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local.invalid'),
        path = decodeURIComponent(url.pathname)
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'"
      )
      if (path === '/favicon.ico') {
        res.writeHead(204)
        res.end()
        return
      }
      if (data.has(path)) {
        const bytes = data.get(path),
          range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || '')
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Content-Type', 'application/octet-stream')
        let begin = 0,
          end = bytes.length - 1,
          status = 200
        if (req.headers.range) {
          if (
            !range ||
            !Number.isSafeInteger(Number(range[1])) ||
            !Number.isSafeInteger(Number(range[2]))
          ) {
            res.writeHead(416)
            res.end()
            return
          }
          begin = Number(range[1])
          end = Math.min(Number(range[2]), end)
          if (begin > end) {
            res.writeHead(416)
            res.end()
            return
          }
          status = 206
          res.setHeader('Content-Range', `bytes ${begin}-${end}/${bytes.length}`)
        }
        const body = bytes.subarray(begin, end + 1)
        transfers.push({
          path,
          owner: url.searchParams.get('owner'),
          status,
          bytes: req.method === 'HEAD' ? 0 : body.length
        })
        res.writeHead(status, { 'Content-Length': body.length })
        res.end(req.method === 'HEAD' ? undefined : body)
        return
      }
      let folder, relative
      if (path.startsWith('/nested/assets/geo3d/')) {
        folder = vendor
        relative = path.slice('/nested/assets/geo3d/'.length)
      } else if (path.startsWith('/nested/app/')) {
        folder = site
        relative = path.slice('/nested/app/'.length) || 'index.html'
      } else {
        res.writeHead(404)
        res.end()
        return
      }
      const file = resolve(folder, relative)
      if (!file.startsWith(folder + sep)) {
        res.writeHead(403)
        res.end()
        return
      }
      if (holdWorkers && /\/workers\/[^/]+\.js$/.test(path)) {
        await new Promise((resolve) => {
          held.push(resolve)
          onGate?.()
        })
        if (res.destroyed) return
      }
      const bytes = await readFile(file)
      const mime =
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.wasm': 'application/wasm'
        }[extname(file)] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': mime, 'Content-Length': bytes.length })
      res.end(bytes)
    } catch {
      respondGeo3dFixtureError(res)
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]
  })
  report.fixtureErrors = await verifyGeo3dFixtureErrors(browser, origin)
  const cases = [
    { name: 'concurrent-copc-copc', a: 'copc', b: 'copc' },
    { name: 'concurrent-geotiff-cog', a: 'geotiff', b: 'cog' },
    { name: 'concurrent-copc-cog', a: 'copc', b: 'cog' },
    { name: 'concurrent-cog-copc', a: 'cog', b: 'copc' },
    ...['copc', 'cog'].flatMap((format) => [
      { name: `abort-${format}-instance-hook`, a: format, b: format, pauseHook: 'instance' },
      { name: `abort-${format}-configure-hook`, a: format, b: format, pauseHook: 'configure' },
      { name: `abort-${format}-pending-worker`, a: format, b: format, abortPending: true }
    ])
  ]
  for (const [caseIndex, item] of cases.entries()) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } }),
      errors = [],
      requests = []
    const result = { name: item.name, status: 'running', cycles: [] },
      transferStart = transfers.length
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('request', (request) => requests.push(request.url()))
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:'))
        return route.continue()
      errors.push('External request: ' + url)
      return route.abort()
    })
    const start = (id, format, cycle, extra = {}) =>
      page.evaluate((args) => window.concurrent.start(args), {
        id,
        format,
        url: `${origin}${datasets[format]}?owner=${item.name}-${cycle}-${id}`,
        ...extra
      })
    try {
      await page.goto(origin + '/nested/app/')
      await page.waitForFunction(() => window.entryReady === true)
      const baseline = await page.evaluate(() => window.prepareEngine())
      assert.equal(baseline.liveWorkers, 0)
      assert.equal(baseline.canvas, 0)
      result.baseline = baseline
      if (item.pauseHook || item.abortPending) {
        await start('B', item.b, 0)
        result.survivorBefore = await ready(page, 'B')
        const survivorResources = await page.evaluate(() => window.concurrent.resources())
        const survivorIds = await page.evaluate(() =>
          window.concurrent
            .workers()
            .filter((worker) => worker.live)
            .map((worker) => worker.id)
        )
        const gate = item.abortPending ? beginHold() : null
        await start('A', item.a, 0, {
          pauseHook: item.pauseHook,
          throwCleanup: item.pauseHook === 'configure'
        })
        if (item.abortPending) {
          result.pending = await pending(page, 'A', survivorIds)
          result.pendingViewer = await page.evaluate(() => window.concurrent.state('A'))
          await deadline(gate)
        } else {
          await page.waitForFunction(
            (stage) => window.concurrent.state('A')?.stage === stage,
            item.pauseHook,
            { timeout: 45000 }
          )
        }
        result.aborted = await page.evaluate(() => window.concurrent.abort('A'))
        if (item.pauseHook) {
          assert.equal(result.aborted.status, 'rejected')
          assert.equal(result.aborted.error.name, 'AbortError')
          assert.deepEqual(
            result.aborted.cleanup,
            item.pauseHook === 'instance' ? ['instance'] : ['configure', 'instance']
          )
        }
        assert.equal(result.aborted.canvas, 0)
        assert.deepEqual(
          await page.evaluate(() => window.concurrent.resources()),
          survivorResources
        )
        assert.ok(
          (await page.evaluate(() => window.concurrent.workers()))
            .filter((worker) => survivorIds.includes(worker.id))
            .every((worker) => worker.live)
        )
        releaseWorkers()
        await redraw(page, 'B')
        result.survivorAfter = await ready(page, 'B')
        closed(await page.evaluate(() => window.concurrent.stop('B')))
        assert.deepEqual(await page.evaluate(() => window.concurrent.resources()), baseline)
        await start('C', item.a, 1)
        result.fresh = await ready(page, 'C')
        closed(await page.evaluate(() => window.concurrent.stop('C')))
      } else {
        for (let cycle = 0; cycle < 2; cycle++) {
          for (const phase of ['complete-viewers', 'pending-source']) {
            const label = `${cycle}-${phase}`
            await start('A', item.a, label)
            const a = await ready(page, 'A')
            const aIds = await page.evaluate(() =>
              window.concurrent
                .workers()
                .filter((worker) => worker.live)
                .map((worker) => worker.id)
            )
            assert.ok(aIds.length > 0, 'Viewer A did not use real Workers')
            const gate = phase === 'pending-source' ? beginHold() : null
            await start('B', item.b, label)
            let beforeB, bWorkers
            if (gate) {
              bWorkers = await pending(page, 'B', aIds)
              beforeB = await page.evaluate(() => window.concurrent.state('B'))
              await deadline(gate)
            } else {
              beforeB = await ready(page, 'B')
              bWorkers = await page.evaluate(
                (known) =>
                  window.concurrent
                    .workers()
                    .filter((worker) => worker.live && !known.includes(worker.id)),
                aIds
              )
              assert.equal(beforeB.hasInstance, true)
              assert.equal(
                await page.evaluate(() => window.concurrent.resources().canvas),
                2,
                'Both complete viewers must coexist'
              )
              await redraw(page, 'A')
              await redraw(page, 'B')
              await page.screenshot({ path: join(output, `${item.name}-${label}-both.png`) })
            }
            assert.ok(bWorkers.length > 0, 'Viewer B did not use its own real Workers')
            const stoppedA = await page.evaluate(() => window.concurrent.stop('A'))
            closed(stoppedA)
            const afterA = await page.evaluate(() => window.concurrent.workers())
            assert.ok(
              afterA.filter((worker) => aIds.includes(worker.id)).every((worker) => !worker.live),
              'A retained a Worker'
            )
            for (const worker of bWorkers) {
              const current = afterA.find((entry) => entry.id === worker.id)
              assert.ok(current?.live, 'Closing A terminated a B Worker')
              if (gate && worker.pending > 0)
                assert.ok(current.pending > 0, 'Closing A invalidated B pending decoder')
            }
            releaseWorkers()
            const b = await ready(page, 'B')
            if (gate) {
              const decoded = await page.evaluate(() => window.concurrent.workers())
              assert.ok(
                bWorkers.some(
                  (worker) =>
                    decoded.find((entry) => entry.id === worker.id)?.received > worker.received
                ),
                'B did not decode after A closed'
              )
            }
            await redraw(page, 'B')
            const stoppedB = await page.evaluate(() => window.concurrent.stop('B'))
            closed(stoppedB)
            assert.deepEqual(await page.evaluate(() => window.concurrent.resources()), baseline)
            await start('C', item.a, label)
            const fresh = await ready(page, 'C')
            const stoppedC = await page.evaluate(() => window.concurrent.stop('C'))
            closed(stoppedC)
            assert.deepEqual(await page.evaluate(() => window.concurrent.resources()), baseline)
            result.cycles.push({
              cycle,
              phase,
              a,
              beforeB,
              bWorkers,
              stoppedA,
              b,
              stoppedB,
              fresh,
              stoppedC
            })
          }
        }
      }
      result.cleanup = await page.evaluate(() => window.concurrent.resources())
      assert.deepEqual(result.cleanup, baseline)
      assert.ok(requests.some((url) => /\/nested\/assets\/geo3d\/workers\/[^/]+\.js$/.test(url)))
      assert.deepEqual(errors, [])
      result.status = 'passed'
    } catch (error) {
      result.status = 'failed'
      result.failure = String(error)
      result.resources = await page.evaluate(() => window.concurrent?.resources()).catch(() => null)
      result.workers = await page.evaluate(() => window.concurrent?.workers()).catch(() => null)
      result.viewers = await page
        .evaluate(() =>
          Object.fromEntries(['A', 'B', 'C'].map((id) => [id, window.concurrent?.state(id)]))
        )
        .catch(() => null)
      result.layout = await page
        .evaluate(() =>
          [...document.querySelectorAll('canvas, [id^="viewer-"]')].map((element) => ({
            tag: element.tagName,
            id: element.id,
            width: element.clientWidth,
            height: element.clientHeight,
            rect: element.getBoundingClientRect().toJSON(),
            pixelWidth: element.width,
            pixelHeight: element.height
          }))
        )
        .catch(() => null)
      await page.screenshot({ path: join(output, `${item.name}-failed.png`) }).catch(() => {})
    } finally {
      releaseWorkers()
      result.errors = errors
      result.requests = requests
      result.transfers = transfers.slice(transferStart)
      report.cases.push(result)
      const { requests: requestDetails, transfers: transferDetails, ...summary } = result
      console.log(
        'GEO3D_CONCURRENT_CASE',
        JSON.stringify({
          ...summary,
          requestCount: requestDetails.length,
          transferCount: transferDetails.length
        })
      )
      await page.close()
    }
    if (result.status !== 'passed') {
      report.notRun = cases.slice(caseIndex + 1).map((item) => item.name)
      throw new Error(
        `Geo3D concurrent regression failed: ${item.name}; ${report.notRun.length} later cases not run`
      )
    }
  }
  if (report.cases.some((item) => item.status !== 'passed'))
    throw new Error('Geo3D concurrent owner or cancellation regression failed')
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  throw error
} finally {
  releaseWorkers()
  try {
    const existing = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'))
    existing.concurrency = report
    if (report.status !== 'passed') existing.status = 'failed'
    await writeFile(join(output, 'report.json'), JSON.stringify(existing, null, 2))
  } finally {
    await browser?.close()
    if (server) {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }
}
console.log(
  `Geo3D concurrent browser validation passed: ${report.cases.length} cases, same-realm viewers, real decoding, nested self-hosted assets and strict CSP.`
)
// Also runs from the isolated tarball consumer, using the site built above.
await import('./verify-geo3d-hooks-browser.mjs')
