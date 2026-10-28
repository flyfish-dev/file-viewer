import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from '../test/fixtures/msg-fixture.mjs'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(process.env.MSG_TEST_DIST || join(packageRoot, 'dist'))
const output = resolve(
  process.env.MSG_BROWSER_OUTPUT || join(packageRoot, 'output/msg-browser'),
  'inline-images'
)
const playwright = await import(
  process.env.FILE_VIEWER_PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.FILE_VIEWER_PLAYWRIGHT_MODULE)).href
    : 'playwright'
)
const helper =
  'data:text/javascript;base64,' +
  Buffer.from(await readFile(join(dist, 'emailHtml.js'), 'utf8')).toString('base64')
const requested = []
const server = http.createServer((request, response) => {
  if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' })
    response.end('<!doctype html><meta charset="utf-8"><div id="host"></div>')
  } else {
    requested.push(request.url)
    response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' })
    response.end(PNG)
  }
})
await mkdir(output, { recursive: true })
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const cases = []
try {
  for (const engine of ['chromium', 'webkit']) {
    const browser = await playwright[engine].launch({
      headless: true,
      ...(engine === 'chromium' && process.env.CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
        : {})
    })
    try {
      for (const host of ['http', 'opaque']) {
        const page = await browser.newPage(),
          errors = [],
          attempts = []
        page.on('pageerror', (error) => errors.push(error.message))
        try {
          if (host === 'http') await page.goto(base)
          else {
            await page.goto('about:blank')
            await page.setContent('<div id="host"></div>')
          }
          await page.route(/^https?:\/\//, (route) => {
            attempts.push(route.request().url())
            return new URL(route.request().url()).origin === base ? route.continue() : route.abort()
          })
          await page.evaluate(
            async ({ helper, bytes, base }) => {
              const { createEmailImageResource, createEmailHtmlDocument } = await import(helper)
              const url = createEmailImageResource(Uint8Array.from(bytes).buffer, 'image/png', [])
              const html = `<h1>Local email 中文</h1><table><tr><td>Preserved</td></tr></table><img src="cid:local" alt="Embedded image"><img src="${base}/blocked/pixel.png"><style>@im\\70 ort url("${base}/blocked/style.css");</style>`
              const iframe = document.createElement('iframe')
              iframe.setAttribute('sandbox', '')
              iframe.srcdoc = createEmailHtmlDocument(html, new Map([['local', url]]))
              document.querySelector('#host').append(iframe)
            },
            { helper, bytes: [...PNG], base }
          )
          const frame = page.frameLocator('iframe')
          await frame.locator('h1').waitFor({ state: 'visible' })
          const image = await frame.locator('img[alt="Embedded image"]').evaluate(async (image) => {
            await image.decode()
            return {
              width: image.naturalWidth,
              height: image.naturalHeight,
              src: image.getAttribute('src')
            }
          })
          assert.equal(image.width, 24)
          assert.equal(image.height, 24)
          assert.match(image.src, /^data:image\/png;base64,/)
          assert.equal(await frame.locator('h1').innerText(), 'Local email 中文')
          assert.equal(await frame.locator('td').innerText(), 'Preserved')
          assert.equal(await page.locator('iframe').getAttribute('sandbox'), '')
          assert.equal(await frame.locator('meta[http-equiv="Content-Security-Policy"]').count(), 1)
          await page.waitForTimeout(200)
          assert.deepEqual(attempts, [])
          assert.deepEqual(errors, [])
          await page.screenshot({ path: join(output, `${engine}-${host}.png`) })
          await page.locator('iframe').evaluate((frame) => frame.remove())
          assert.equal(await page.locator('#host').evaluate((host) => host.childNodes.length), 0)
          cases.push({
            engine,
            host,
            width: image.width,
            height: image.height,
            attempts,
            errors,
            emptySandbox: true
          })
        } finally {
          await page.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
  assert.deepEqual(
    requested.filter((path) => path.startsWith('/blocked/')),
    []
  )
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify({ passed: cases.length, cases }, null, 2) + '\n'
  )
  console.log(`Email inline image browser checks passed: ${cases.length}`)
} finally {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}
