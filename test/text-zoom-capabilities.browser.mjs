import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium, firefox, webkit } from 'playwright'
import { launchBrowserForTest } from '../packages/build-support/browser-test-launch.mjs'

const root = resolve(
  process.env.FILE_VIEWER_TEXT_ZOOM_SOURCE_ROOT || join(import.meta.dirname, '..')
)
const output = resolve(process.env.FILE_VIEWER_TEXT_ZOOM_EVIDENCE || join(root, 'output/issue-483'))
const engines = (process.env.FILE_VIEWER_TEXT_ZOOM_BROWSERS || 'chromium,firefox,webkit').split(',')
assert(engines.length && engines.every((name) => ['chromium', 'firefox', 'webkit'].includes(name)))
assert.equal(new Set(engines).size, engines.length)
const scratch = await mkdtemp(join(tmpdir(), 'file-viewer-text-zoom-'))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
await mkdir(output, { recursive: true })
let server
const report = { status: 'running', sourceRoot: root, engines, inputs: [], cases: [] }

try {
  const result = await build({
    stdin: {
      resolveDir: root,
      loader: 'ts',
      contents: `
import { mountViewer } from ${JSON.stringify(join(root, 'packages/core/src/browser.ts'))};
import text from ${JSON.stringify(join(root, 'packages/renderers/text/src/index.ts'))};
window.openText = async (extension, isolation) => {
  window.controller?.destroy();
  const buffer = new TextEncoder().encode(extension === 'md' ? '# Zoom heading\\n\\nReadable text.' : 'Readable code text\\nSecond line').buffer;
  window.controller = mountViewer(document.getElementById('host'), {
    buffer, filename: 'document.' + extension,
    options: { preset: { renderers: [text] }, locale: 'en-US', styleIsolation: isolation,
      toolbar: { download: false, print: false, exportHtml: false, search: false, theme: false } }
  });
};`
    },
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outdir: scratch,
    entryNames: 'entry',
    chunkNames: 'chunks/[name]-[hash]',
    write: false,
    metafile: true,
    logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'current-core',
        setup(builder) {
          builder.onResolve({ filter: /^@file-viewer\/core(?:\/.*)?$/ }, (args) => ({
            path:
              join(
                root,
                'packages/core/src',
                args.path.slice('@file-viewer/core'.length).replace(/^\//, '') || 'index'
              ) + '.ts'
          }))
        }
      }
    ]
  })
  for (const input of Object.keys(result.metafile.inputs)) {
    if (input === '<stdin>') continue
    const file = resolve(root, input)
    report.inputs.push({ path: file, sha256: digest(await readFile(file)) })
  }
  const routes = new Map(
    result.outputFiles.map((file) => [
      '/' + relative(scratch, file.path).replaceAll('\\', '/'),
      file.contents
    ])
  )
  assert(routes.has('/entry.js'))
  server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname
    if (routes.has(path)) {
      response.setHeader('Content-Type', 'text/javascript')
      response.end(routes.get(path))
    } else if (path === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end(
        '<!doctype html><style>#host{width:850px;height:600px}</style><main id="host"></main><script type="module" src="/entry.js"></script>'
      )
    } else {
      response.writeHead(404)
      response.end()
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = 'http://127.0.0.1:' + server.address().port
  for (const engine of engines) {
    const browser = await launchBrowserForTest({ chromium, firefox, webkit }[engine], engine)
    try {
      for (const extension of ['txt', 'md'])
        for (const isolation of ['none', 'shadow']) {
          const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
          const errors = [],
            externalRequests = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.route('**/*', (route) => {
            if (
              route
                .request()
                .url()
                .startsWith(base + '/')
            )
              return route.continue()
            externalRequests.push(route.request().url())
            return route.abort()
          })
          try {
            await page.goto(base)
            await page.waitForFunction(() => typeof window.openText === 'function')
            await page.evaluate(([ext, mode]) => window.openText(ext, mode), [extension, isolation])
            await page.waitForFunction(() => window.controller?.getState().ready)
            const state = () => page.evaluate(() => window.controller.getState())
            assert.equal((await state()).availability.zoom, true)
            const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true })
            const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true })
            assert.equal(await zoomIn.isEnabled(), true)
            assert.equal(await zoomOut.isEnabled(), true)
            const initial = (await state()).zoom.scale
            await zoomIn.click()
            await page.waitForFunction(
              (scale) => window.controller.getZoomState().scale > scale,
              initial
            )
            await page.evaluate(() => window.controller.resetZoom())
            assert.equal((await state()).zoom.scale, initial)
            await page.evaluate(async () => {
              for (
                let index = 0;
                index < 100 && window.controller.getState().availability.zoomIn;
                index++
              )
                await window.controller.zoomIn()
            })
            assert.equal((await state()).availability.zoomIn, false)
            assert.equal(await zoomIn.isDisabled(), true)
            assert.equal(await zoomOut.isEnabled(), true)
            await page.evaluate(async () => {
              for (
                let index = 0;
                index < 100 && window.controller.getState().availability.zoomOut;
                index++
              )
                await window.controller.zoomOut()
            })
            assert.equal((await state()).availability.zoomOut, false)
            assert.equal(await zoomOut.isDisabled(), true)
            assert.equal(await zoomIn.isEnabled(), true)
            await page.evaluate(() => window.controller.resetZoom())
            assert.equal((await state()).zoom.scale, initial)
            assert.equal((await state()).availability.zoomReset, false)
            assert.deepEqual(errors, [])
            assert.deepEqual(externalRequests, [])
            await page.screenshot({ path: join(output, `${engine}-${extension}-${isolation}.png`) })
            report.cases.push({
              engine,
              browserVersion: browser.version(),
              extension,
              isolation,
              status: 'passed',
              initialScale: initial,
              minAndMaxActionsBoundToProvider: true,
              externalRequests
            })
            await page.evaluate(() => window.controller.destroy())
          } finally {
            await page.close()
          }
        }
    } finally {
      await browser.close()
    }
  }
  for (const input of report.inputs) assert.equal(digest(await readFile(input.path)), input.sha256)
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.error = error.stack
  throw error
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  if (server) await new Promise((resolve) => server.close(resolve))
  await rm(scratch, { recursive: true, force: true })
}
