// The concurrent suite builds this production site before running these cases.
// The installed-consumer run reuses the same tests against installed runtime bytes.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { respondGeo3dFixtureError, verifyGeo3dFixtureErrors } from './geo3d-fixture-http.mjs'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browserOutput as output } from './geo3d-browser-package.mjs'

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..')
const site = join(output, 'concurrent-site'),
  vendor = join(site, 'vendor')
const fixtures = resolve(here, '../test/fixtures/geo3d')
const report = {
  status: 'running',
  cases: [],
  notRun: [],
  limitations: [
    'Cancellation releases adapter resources; JavaScript cannot terminate arbitrary host code. Hooks should still observe AbortSignal.',
    'The independent hook gate is released only after cancellation completes and a replacement viewer renders in the same target.'
  ]
}
const data = new Map([
  [
    '/datasets/cloud.copc.laz',
    await readFile(join(fixtures, 'samples-mit/original-deliveries/streaming-16384.copc.laz'))
  ],
  ['/datasets/imagery.cog', await readFile(join(output, 'streaming-generated.cog.tif'))]
])
const paths = { copc: '/datasets/cloud.copc.laz', cog: '/datasets/imagery.cog' }
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://local.invalid').pathname)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'"
    )
    if (path === '/favicon.ico') {
      res.writeHead(204).end()
      return
    }
    if (data.has(path)) {
      const bytes = data.get(path),
        match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || '')
      let begin = 0,
        end = bytes.length,
        status = 200
      res.setHeader('Accept-Ranges', 'bytes')
      if (req.headers.range) {
        if (
          !match ||
          !Number.isSafeInteger(Number(match[1])) ||
          !Number.isSafeInteger(Number(match[2]))
        ) {
          res.writeHead(416).end()
          return
        }
        begin = Number(match[1])
        end = Math.min(Number(match[2]) + 1, end)
        if (begin >= end) {
          res.writeHead(416).end()
          return
        }
        status = 206
        res.setHeader('Content-Range', `bytes ${begin}-${end - 1}/${bytes.length}`)
      }
      res.writeHead(status, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': end - begin
      })
      res.end(req.method === 'HEAD' ? undefined : bytes.subarray(begin, end))
      return
    }
    let directory, relative
    if (path.startsWith('/nested/assets/geo3d/')) {
      directory = vendor
      relative = path.slice('/nested/assets/geo3d/'.length)
    } else if (path.startsWith('/nested/app/')) {
      directory = site
      relative = path.slice('/nested/app/'.length) || 'index.html'
    } else {
      res.writeHead(404).end()
      return
    }
    const file = resolve(directory, relative)
    if (!file.startsWith(directory + sep)) {
      res.writeHead(403).end()
      return
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
let browser
const cases = ['copc', 'cog'].flatMap((format) =>
  ['instance', 'configure'].flatMap((stage) =>
    ['resolve', 'reject'].map((outcome) => ({
      format,
      stage,
      outcome,
      name: `uncooperative-${format}-${stage}-${outcome}`
    }))
  )
)
function bounded(promise, milliseconds = 3000) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Abort waited for an unresolved application hook')),
        milliseconds
      )
    })
  ]).finally(() => clearTimeout(timer))
}
async function ready(page, id) {
  await page.waitForFunction(
    (id) => {
      const state = window.concurrent.state(id)
      if (state?.status === 'rejected') throw new Error(JSON.stringify(state.error))
      return (
        state?.status === 'fulfilled' &&
        state.canvas === 1 &&
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
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const { chromium } = createRequire(join(root, 'package.json'))('playwright')
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
  for (const [index, item] of cases.entries()) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } }),
      errors = []
    const result = { name: item.name, status: 'running' }
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:'))
        return route.continue()
      errors.push('External request: ' + url)
      return route.abort()
    })
    const start = (id, extra = {}) =>
      page.evaluate((args) => window.concurrent.start(args), {
        id,
        format: item.format,
        url: origin + paths[item.format] + `?owner=${item.name}-${id}-${Math.random()}`,
        controls: true,
        ...extra
      })
    try {
      await page.goto(origin + '/nested/app/')
      await page.waitForFunction(() => window.entryReady === true)
      const baseline = await page.evaluate(() => window.prepareEngine())
      result.baseline = baseline
      await start('B')
      result.survivorBefore = await ready(page, 'B')
      const survivorResources = await page.evaluate(() => window.concurrent.resources())
      const key = await start('A', { pauseHook: item.stage, hookMode: 'deferred' })
      await page.waitForFunction(
        (stage) => window.concurrent.state('A')?.stage === stage,
        item.stage,
        { timeout: 45000 }
      )
      // The server gate controlling application code is still CLOSED here.
      result.aborted = await bounded(page.evaluate(() => window.concurrent.abort('A')))
      assert.equal(result.aborted.status, 'rejected')
      assert.equal(result.aborted.error.name, 'AbortError')
      assert.match(result.aborted.error.message, /Test owner cancelled/)
      assert.equal(result.aborted.closed, true)
      assert.equal(result.aborted.canvas, 0)
      assert.deepEqual(result.aborted.cleanup, item.stage === 'instance' ? [] : ['instance'])
      assert.deepEqual(result.aborted.extensionErrors, [])
      assert.deepEqual(await page.evaluate(() => window.concurrent.resources()), survivorResources)
      await redraw(page, 'B')
      // Reuse the SAME target before the original hook resolves or rejects.
      await start('A')
      result.replacement = await ready(page, 'A')
      const replacementResources = await page.evaluate(() => window.concurrent.resources())
      result.late = await page.evaluate(
        ({ key, reject }) => window.concurrent.releaseHook(key, reject),
        { key, reject: item.outcome === 'reject' }
      )
      const expectedCleanup =
        item.outcome === 'reject'
          ? item.stage === 'instance'
            ? []
            : ['instance']
          : item.stage === 'instance'
            ? ['instance']
            : ['instance', 'configure']
      assert.deepEqual(result.late.cleanup, expectedCleanup)
      assert.deepEqual(
        result.late.extensionErrors,
        item.outcome === 'reject'
          ? [{ name: 'Error', message: 'Deliberate late hook failure' }]
          : []
      )
      assert.deepEqual(
        await page.evaluate(() => window.concurrent.resources()),
        replacementResources
      )
      await redraw(page, 'A')
      await redraw(page, 'B')
      result.survivorAfter = await ready(page, 'B')
      await page.screenshot({ path: join(output, `${item.name}.png`) })
      for (const id of ['A', 'B']) {
        const stopped = await page.evaluate((id) => window.concurrent.stop(id), id)
        assert.equal(stopped.sameUnmountPromise, true)
        assert.equal(stopped.canvas, 0)
        assert.deepEqual(stopped.cleanup, ['configure', 'instance'])
        assert.deepEqual(stopped.extensionErrors, [])
      }
      result.cleanup = await page.evaluate(() => window.concurrent.resources())
      assert.deepEqual(result.cleanup, baseline)
      assert.deepEqual(errors, [])
      result.status = 'passed'
    } catch (error) {
      result.status = 'failed'
      result.failure = String(error)
      result.resources = await page.evaluate(() => window.concurrent?.resources()).catch(() => null)
      await page.screenshot({ path: join(output, `${item.name}-failed.png`) }).catch(() => {})
    } finally {
      result.errors = errors
      report.cases.push(result)
      console.log('GEO3D_HOOK_CASE', JSON.stringify(result))
      await page.close()
    }
    if (result.status !== 'passed') {
      report.notRun = cases.slice(index + 1).map((value) => value.name)
      throw new Error(`Geo3D hook lifecycle regression failed: ${item.name}`)
    }
  }
  assert.equal(report.cases.length, 8)
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  throw error
} finally {
  try {
    const existing = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'))
    existing.hookLifecycle = report
    if (report.status !== 'passed') existing.status = 'failed'
    await writeFile(join(output, 'report.json'), JSON.stringify(existing, null, 2))
  } finally {
    await browser?.close()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}
console.log(
  'Geo3D non-cooperative hook browser validation passed: 8 cases, prompt abort, late cleanup/rejection, same-target replacement and controls enabled.'
)
