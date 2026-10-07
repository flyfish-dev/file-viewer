import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runUnits } from '../test/output-compatibility/unit.mjs'
import { makeMixedDocument, makeRotatedPdf, makeJpxPdf } from '../test/output-compatibility/fixtures.mjs'

const root = path.resolve(import.meta.dirname, '..')
const rootRequire = createRequire(path.join(root, 'package.json'))
const pptxRequire = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))
const pdfRequire = createRequire(path.join(root, 'packages/renderers/pdf/package.json'))
const { build } = pptxRequire('esbuild')
const { JSDOM } = rootRequire('jsdom')
const JSZip = pptxRequire('jszip')
const pdfLib = pdfRequire('pdf-lib')
const output = path.resolve(process.env.OUTPUT_COMPATIBILITY_EVIDENCE_DIR || path.join(root, 'output/output-compatibility'))
await mkdir(output, { recursive: true })
const temporary = await mkdtemp(path.join(output, 'work-'))
const checks = []
let browser, server
const errors = [], externalRequests = []
async function check(name, run) {
  try {
    await run()
    checks.push({ name, status: 'pass' })
    console.log('PASS ' + name)
  } catch (error) {
    checks.push({ name, status: 'fail', error: String(error) })
    throw error
  }
}
const near = (actual, expected, message, tolerance = 1) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`)
async function inspectPrint(html, name, expectedSizes) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 920 } })
  try {
    page.on('pageerror', error => errors.push(error.message))
    await page.setContent(html)
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})))
    })
    const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true })
    await writeFile(path.join(output, name + '.pdf'), bytes)
    const printed = await pdfLib.PDFDocument.load(bytes)
    const sizes = printed.getPages().map(p => [p.getWidth(), p.getHeight()])
    await writeFile(path.join(output, name + '.json'), JSON.stringify({ sizes, expectedSizes }, null, 2) + '\n')
    assert.equal(sizes.length, expectedSizes.length, 'Print must not introduce blank pages')
    sizes.forEach((size, i) => size.forEach((value, j) => near(value, expectedSizes[i][j], `Page ${i + 1} dimension ${j}`)))
    return sizes
  } finally { await page.close() }
}
try {
  await build({ entryPoints: [path.join(root, 'test/output-compatibility/entry.ts')], outfile: path.join(temporary, 'unit.mjs'), bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' })
  const api = await import(pathToFileURL(path.join(temporary, 'unit.mjs')))
  await runUnits(api, JSDOM, check)
  if (!process.argv.includes('--unit')) {
    const { chromium } = rootRequire('playwright')
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
    await build({ entryPoints: [path.join(root, 'test/output-compatibility/browser.ts')], outfile: path.join(temporary, 'browser.js'), bundle: true, platform: 'browser', format: 'iife', logLevel: 'warning' })
    const script = await readFile(path.join(temporary, 'browser.js'), 'utf8')
    const page = await browser.newPage({ viewport: { width: 1200, height: 920 } })
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()) })
    await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%}#host{width:100%;height:100%;overflow:auto}</style><div id="host"></div>')
    await page.addScriptTag({ content: script })
    await check('Chromium: retina canvas export preserves CSS box, positioning, classes and bitmap', async () => {
      const result = await page.evaluate(async () => {
        const host = document.getElementById('host')
        host.innerHTML = '<style>canvas.retina{position:absolute;left:37px;top:29px;width:150px;height:60px;transform:rotate(3deg);opacity:.8}</style><div class="source" style="position:relative;width:500px;height:250px"><canvas class="retina" aria-label="Color chart" width="600" height="240"></canvas></div>'
        const source = host.querySelector('.source'), canvas = source.querySelector('canvas')
        canvas.getContext('2d').fillStyle = '#e03030'
        canvas.getContext('2d').fillRect(0, 0, 600, 240)
        const clone = source.cloneNode(true)
        host.append(clone)
        const measure = el => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight, getComputedStyle(el).transform]
        const before = measure(canvas)
        outputReview.replaceFileViewerCanvasWithImages(source, clone)
        const image = clone.querySelector('img')
        await image.decode()
        return { before, after: measure(image), bitmap: [image.naturalWidth, image.naturalHeight], label: image.alt, className: image.className, original: source.contains(canvas) }
      })
      assert.deepEqual(result.before, result.after)
      assert.deepEqual(result.bitmap, [600, 240])
      assert.equal(result.label, 'Color chart')
      assert.equal(result.className, 'retina')
      assert.equal(result.original, true)
      await page.screenshot({ path: path.join(output, 'canvas-export.png') })
    })
    await check('Chromium: iframe print measurement includes padding and ignores preview transforms', async () => {
      const size = await page.evaluate(() => {
        const frame = document.createElement('iframe')
        document.body.append(frame)
        const element = frame.contentDocument.createElement('section')
        element.style.cssText = 'width:400px;height:250px;padding:10px 20px;border:2px solid;box-sizing:content-box;transform:scale(.5)'
        frame.contentDocument.body.append(element)
        const size = outputReview.getElementPrintPageSize(element)
        frame.remove()
        return size
      })
      assert.deepEqual(size, { width: 444, height: 274 })
    })
    await check('Chromium: broken image cannot block snapshot readiness', async () => {
      await page.evaluate(async () => {
        const host = document.getElementById('host')
        host.innerHTML = '<img src="data:image/png;base64,broken">'
        await outputReview.waitForFileViewerImages(host)
      })
    })
    for (const mixed of [true, false]) {
      await check(`Chromium: actual DOCX export preserves ${mixed ? 'portrait, landscape and Letter pages' : 'one A4 page without extra margins'}`, async () => {
        const bytes = await makeMixedDocument(JSZip, mixed)
        await page.evaluate(async bytes => {
          const host = document.getElementById('host')
          window.exportAdapter = null
          window.instance = await outputReview.renderDocx(Uint8Array.from(bytes).buffer, host, {
            filename: 'paper-layout.docx', options: { locale: 'en-US', docx: { useWorker: false, visualPagination: true } },
            registerExportAdapter: adapter => { window.exportAdapter = adapter }
          })
        }, [...bytes])
        await page.waitForFunction(count => document.querySelectorAll('.docx-page-frame').length === count, mixed ? 3 : 1)
        await page.evaluate(() => document.fonts.ready)
        const html = await page.evaluate(async () => {
          // Preview-only scaling must not change physical print dimensions.
          document.querySelector('.docx-page-frame').style.transform = 'scale(.5)'
          return outputReview.buildFileViewerRenderedHtmlDocument({ source: document.getElementById('host'), adapter: window.exportAdapter, mode: 'print', title: 'Paper layout regression' })
        })
        const expected = mixed ? [[595.3, 841.9], [841.9, 595.3], [612, 792]] : [[595.3, 841.9]]
        await inspectPrint(html, mixed ? 'docx-mixed-paper' : 'docx-a4', expected)
        if (mixed) await page.screenshot({ path: path.join(output, 'docx-mixed-paper.png') })
        await page.evaluate(() => window.instance.unmount())
      })
    }
    await page.close()
    // This mode is deliberately explicit: it does not establish PDF.js/Worker coverage.
    if (!process.argv.includes('--dom-browser')) {
      const pdfBundle = path.join(temporary, 'pdf-browser.mjs')
      await build({ entryPoints: [path.join(root, 'test/output-compatibility/pdf-browser.ts')], outfile: pdfBundle, bundle: true, platform: 'browser', format: 'esm', logLevel: 'warning', plugins: [{ name: 'local-pdfjs-runtime', setup(build) {
        build.onResolve({ filter: /^pdfjs-dist\// }, args => ({ path: '/pdfjs/' + args.path.slice('pdfjs-dist/'.length), external: true }))
      } }] })
      const runtime = path.join(root, 'packages/renderers/pdf/dist/vendor/pdfjs')
      const requests = []
      server = createServer(async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost')
          const pathname = decodeURIComponent(url.pathname)
          if (pathname === '/') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end('<!doctype html><meta charset="utf-8"><style>html,body,#host{margin:0;width:100%;height:100%}</style><div id="host"></div><script type="module" src="/browser.mjs"></script>')
            return
          }
          let file
          if (pathname === '/browser.mjs') file = pdfBundle
          else if (pathname.startsWith('/pdfjs/')) {
            file = path.resolve(runtime, pathname.slice('/pdfjs/'.length))
            if (!file.startsWith(runtime + path.sep)) throw Error('Invalid asset path')
          } else throw Error('Unknown asset')
          res.setHeader('Content-Type', /\.m?js$/.test(file) ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream')
          const bytes = await readFile(file)
          requests.push({ path: pathname, status: 200 })
          res.end(bytes)
        } catch {
          requests.push({ path: String(req.url), status: 404 })
          res.writeHead(404).end()
        }
      })
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
      const origin = `http://127.0.0.1:${server.address().port}`
      const pdfPage = await browser.newPage({ viewport: { width: 1100, height: 820 } })
      pdfPage.on('pageerror', error => errors.push(error.message))
      pdfPage.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) externalRequests.push(request.url()) })
      const openPdf = async bytes => {
        await pdfPage.goto(origin)
        await pdfPage.waitForFunction(() => !!window.outputReview)
        await pdfPage.evaluate(async bytes => {
          window.exportAdapter = null
          window.instance = await outputReview.renderPdf(Uint8Array.from(bytes).buffer, document.getElementById('host'), {
            filename: 'rotation.pdf', options: { locale: 'en-US', pdf: {
              thumbnails: true, workerUrl: '/pdfjs/legacy/build/pdf.worker.mjs', cMapUrl: '/pdfjs/cmaps/',
              wasmUrl: '/pdfjs/wasm/', standardFontDataUrl: '/pdfjs/standard_fonts/'
            } },
            registerExportAdapter: adapter => { window.exportAdapter = adapter },
            registerThumbnailAdapter: adapter => { window.thumbnailAdapter = adapter }
          })
        }, [...bytes])
        await pdfPage.waitForFunction(() => !!window.exportAdapter && !!document.querySelector('.pdfViewer .page canvas'), null, { timeout: 30000 })
      }
      await openPdf(await makeRotatedPdf(pdfLib))
      for (const rotation of [0, 90]) {
        await check(`Chromium: real PDF.js thumbnails preserve authored rotation plus ${rotation} degree viewer offset`, async () => {
          if (rotation) {
            await pdfPage.evaluate(async rotation => {
              const provider = outputReview.findFileViewerViewStateProvider(document.getElementById('host'))
              if (!provider) throw Error('Missing PDF view state provider')
              await provider.applyState({ rotation })
            }, rotation)
          }
          const thumbnail = await pdfPage.evaluate(async () => {
            await window.thumbnailAdapter.beforeCapture?.({})
            const blob = await window.thumbnailAdapter.capture({ width: 120, height: 120, format: 'png', fit: 'contain' })
            const image = await createImageBitmap(blob)
            const size = [image.width, image.height]
            const canvas = document.createElement('canvas')
            canvas.width = image.width; canvas.height = image.height
            const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
            const topRight = [...ctx.getImageData(canvas.width - 5, 5, 1, 1).data]
            image.close()
            return { size, topRight }
          })
          assert.deepEqual(thumbnail.size, rotation === 0 ? [72, 120] : [120, 72])
          if (!rotation) assert.ok(thumbnail.topRight[0] > 240 && thumbnail.topRight[1] < 20, 'Native rotation must move the red rectangle to the top right')
          await writeFile(path.join(output, `pdf-thumbnail-${rotation}.json`), JSON.stringify(thumbnail, null, 2) + '\n')
        })
        await check(`Chromium: PDF export and physical print retain every page size at user rotation ${rotation}`, async () => {
          const html = await pdfPage.evaluate(() => outputReview.buildFileViewerRenderedHtmlDocument({ source: document.getElementById('host'), adapter: window.exportAdapter, mode: 'print', title: 'Rotation regression' }))
          await inspectPrint(html, `pdf-rotation-${rotation}`, rotation === 0 ? [[240, 400], [400, 240], [400, 240]] : [[400, 240], [240, 400], [240, 400]])
          await pdfPage.screenshot({ path: path.join(output, `pdf-rotation-${rotation}.png`) })
        })
      }
      await pdfPage.evaluate(() => window.instance.unmount())
      await check('Chromium: JPEG2000 image decodes through packaged OpenJPEG WASM', async () => {
        await openPdf(await makeJpxPdf(pdfLib))
        await pdfPage.waitForFunction(() => {
          const canvas = document.querySelector('.pdfViewer .page canvas')
          if (!canvas) return false
          const p = canvas.getContext('2d').getImageData(Math.floor(canvas.width / 4), Math.floor(canvas.height / 2), 1, 1).data
          return p[0] > 180 && p[1] < 60
        }, null, { timeout: 30000 })
        const pixels = await pdfPage.evaluate(() => {
          const canvas = document.querySelector('.pdfViewer .page canvas'), ctx = canvas.getContext('2d')
          return [1, 3].map(n => [...ctx.getImageData(Math.floor(canvas.width * n / 4), Math.floor(canvas.height / 2), 1, 1).data])
        })
        assert.ok(pixels[0][0] > 180 && pixels[0][1] < 60)
        assert.ok(pixels[1][1] > 180 && pixels[1][0] < 60)
        assert.ok(requests.some(r => /openjpeg\.wasm$/.test(r.path) && r.status === 200), 'Actual WASM asset must load')
        await pdfPage.screenshot({ path: path.join(output, 'pdf-jpx.png') })
        await writeFile(path.join(output, 'pdf-jpx.json'), JSON.stringify({ pixels, wasm: requests.filter(r => r.path.endsWith('.wasm')) }, null, 2) + '\n')
        await pdfPage.evaluate(() => window.instance.unmount())
      })
      await check('Chromium: PDF assets stay local and contain no missing runtime resources', () => {
        assert.deepEqual(requests.filter(r => r.status !== 200 && r.path !== '/favicon.ico'), [])
        assert.deepEqual(externalRequests, [])
      })
      await writeFile(path.join(output, 'pdf-requests.json'), JSON.stringify(requests, null, 2) + '\n')
      await pdfPage.close()
    }
    await check('Chromium: no unhandled page errors or external HTTP requests', () => {
      assert.deepEqual(errors, [])
      assert.deepEqual(externalRequests, [])
    })
  }
} finally {
  await browser?.close()
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  await rm(temporary, { recursive: true, force: true })
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ mode: process.argv.includes('--unit') ? 'unit' : process.argv.includes('--dom-browser') ? 'unit-and-dom-browser-only' : 'full-browser', passed: checks.filter(c => c.status === 'pass').length, checks }, null, 2) + '\n')
}
console.log(`Output compatibility: ${checks.length} checks passed.`)
