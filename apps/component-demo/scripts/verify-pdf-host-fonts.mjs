import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { basename, delimiter, dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
assert.ok(
  process.env.PACKED_ISSUE_CONSUMER_DIR,
  'Set PACKED_ISSUE_CONSUMER_DIR to the cold Vue CLI/React fixture'
)
const fixtures = JSON.parse(process.env.PDF_HOST_FONT_FIXTURES || '[]')
assert.ok(
  fixtures.length,
  'Set PDF_HOST_FONT_FIXTURES to a JSON array of local PDF paths; original attachments are not redistributed'
)
const root = resolve(process.env.PACKED_ISSUE_CONSUMER_DIR, 'dist')
const output = resolve(process.env.PACKED_ISSUE_CONSUMER_DIR, 'pdf-host-font-evidence')
await mkdir(output, { recursive: true })
const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const server = createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, `.${name === '/' ? '/index.html' : name}`)
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end()
    return
  }
  const mime =
    {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.wasm': 'application/wasm'
    }[extname(file)] || 'application/octet-stream'
  response.writeHead(200, { 'content-type': mime })
  createReadStream(file).pipe(response)
})
await new Promise((done, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', done)
})
const require = createRequire(import.meta.url)
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
const engines = playwright.chromium ? playwright : playwright.default
const report = { cases: [], passed: false }
let browser, page
try {
  for (const engine of ['chromium', 'webkit']) {
    browser = await engines[engine].launch({ headless: true })
    for (const path of fixtures) {
      const bytes = await readFile(path)
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'Fixture is not a PDF')
      const filename = basename(path)
      const result = {
        engine,
        filename,
        sha256: sha256(bytes),
        bytes: bytes.length,
        snapshots: [],
        errors: [],
        passed: false
      }
      report.cases.push(result)
      page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
      page.setDefaultTimeout(90_000)
      page.on('pageerror', (error) => result.errors.push(error.message))
      await page.goto(`http://127.0.0.1:${server.address().port}/`)
      for (const mode of ['baseline', 'hostile-fonts']) {
        if (mode === 'hostile-fonts') {
          await page.getByRole('button', { name: 'Clear file', exact: true }).click()
          await page.locator('.pdfViewer canvas').first().waitFor({ state: 'hidden' })
          await page.addStyleTag({
            content:
              'body{font-family:v-sans,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;-webkit-text-size-adjust:100%}body div,body span{font-family:monospace!important;letter-spacing:2px!important}'
          })
        }
        await page
          .locator('#file')
          .setInputFiles({ name: filename, mimeType: 'application/pdf', buffer: bytes })
        const canvas = page.locator('.pdfViewer .page[data-page-number="1"] canvas').first()
        await canvas.waitFor({ state: 'visible' })
        await page
          .locator('.pdfViewer .page[data-page-number="1"] .textLayer span')
          .first()
          .waitFor()
        await canvas.evaluate(async (canvas) => {
          await canvas.ownerDocument.fonts.ready
          const deadline = performance.now() + 30_000
          while (true) {
            const pixels = canvas
              .getContext('2d')
              .getImageData(0, 0, canvas.width, canvas.height).data
            let ink = 0
            for (let i = 0; i < pixels.length; i += 4) {
              if (pixels[i + 3] > 200 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 200)
                ink++
            }
            if (ink > 1000) return
            if (performance.now() >= deadline)
              throw new Error('First PDF page never painted readable content')
            await new Promise((resolve) => requestAnimationFrame(resolve))
          }
        })
        const raster = await canvas.evaluate((canvas) => ({
          width: canvas.width,
          height: canvas.height,
          data: canvas.toDataURL('image/png')
        }))
        const png = Buffer.from(raster.data.split(',')[1], 'base64')
        const text = await page
          .locator('.pdfViewer .page[data-page-number="1"] .textLayer')
          .innerText()
        assert.ok(text.trim().length > 20, 'PDF text layer is empty')
        const fonts = await page
          .locator('.pdfViewer')
          .evaluate((el) =>
            [...el.getRootNode().querySelectorAll('.textLayer span')]
              .slice(0, 20)
              .map((span) => getComputedStyle(span).fontFamily)
          )
        assert.ok(
          fonts.every((font) => !font.startsWith('monospace')),
          'Host CSS replaced document font families'
        )
        result.snapshots.push({
          mode,
          width: raster.width,
          height: raster.height,
          pngSha256: sha256(png),
          textLength: text.length,
          fonts
        })
        await writeFile(resolve(output, `${engine}-${filename}-${mode}.png`), png)
        await page
          .locator('.pdfViewer .page[data-page-number="1"]')
          .screenshot({ path: resolve(output, `${engine}-${filename}-${mode}-page.png`) })
      }
      assert.deepEqual(
        result.snapshots.map((image) => [image.width, image.height, image.pngSha256])[0],
        result.snapshots.map((image) => [image.width, image.height, image.pngSha256])[1],
        'Host font rules changed rendered PDF pixels'
      )
      assert.deepEqual(result.errors, [])
      result.passed = true
      await page.close()
    }
    await browser.close()
  }
  report.passed = true
} catch (error) {
  report.error = String(error)
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png') })
  throw error
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(
  `Original PDF first-page pixels unchanged by hostile host fonts in Chromium and WebKit: ${output}`
)
