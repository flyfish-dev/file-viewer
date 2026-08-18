import assert from 'node:assert/strict'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const sourceRoot = resolve(packageRoot, '../../..')
const distRoot = resolve(
  process.env.FILE_VIEWER_MEDIA_DEMO_DIST || join(sourceRoot, 'apps/viewer-demo/dist')
)
const mp4vSample = resolve(
  process.env.FILE_VIEWER_MEDIA_MP4_SAMPLE || join(packageRoot, 'test/fixtures/mp4v-aac-black-screen.mp4')
)
const h264Sample = join(sourceRoot, 'apps/viewer-demo/public/example/video.mp4')
const screenshotRoot = resolve(
  process.env.FILE_VIEWER_MEDIA_SCREENSHOT_DIR || join(sourceRoot, 'output/playwright/media-black-screen')
)
const timeout = Number(process.env.FILE_VIEWER_MEDIA_TIMEOUT || 45_000)

for (const path of [join(distRoot, 'index.html'), mp4vSample, h264Sample]) {
  assert(existsSync(path), `Demo distribution regression input is missing: ${path}`)
}

const require = createRequire(join(sourceRoot, 'packages/components/vue3/package.json'))
const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths = process.env.PATH?.split(delimiter)
      .filter(pathEntry => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map(binDir => resolve(binDir, '..'))
      .filter(existsSync) || []
    for (const candidatePath of candidatePaths) {
      try {
        const entry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(entry).href)
      } catch {
        // Continue probing package roots injected by npm exec.
      }
    }
    throw new Error(
      `Missing playwright module: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  let pathname = decodeURIComponent(requestUrl.pathname)
  if (pathname.endsWith('/')) pathname += 'index.html'
  let path = resolve(distRoot, `.${pathname}`)
  if (!path.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403).end('Forbidden')
    return
  }
  if (!existsSync(path) || !statSync(path).isFile()) path = join(distRoot, 'index.html')
  response.setHeader('Content-Type', contentTypes[extname(path)] || 'application/octet-stream')
  response.setHeader('Cache-Control', 'no-store')
  createReadStream(path).pipe(response)
})

await new Promise((resolvePromise, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolvePromise)
})
const address = server.address()
assert(address && typeof address !== 'string')
const baseUrl = `http://127.0.0.1:${address.port}`

const playwrightModule = await importPlaywright()
const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
let browser

const openLocalFile = async (page, path) => {
  await page.locator('nav[aria-label="Preview actions"]').first().hover()
  await page.waitForTimeout(500)
  await page.locator('button[aria-label="Upload from device"]').click()
  const input = page.locator('input[type="file"]')
  await input.waitFor({ state: 'attached', timeout })
  await input.setInputFiles(path)
}

try {
  await mkdir(screenshotRoot, { recursive: true })
  try {
    browser = await chromium.launch({ headless: true })
  } catch (error) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      throw error
    }
  }

  const cases = [
    { name: 'demo-private', path: mp4vSample, state: 'software-decoder' },
    { name: 'demo-h264', path: h264Sample, state: 'ready' }
  ]
  const results = []
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    const decoderResponses = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('response', response => {
      if (/mp4v-decoder-.*\.wasm(?:\?|$)/.test(response.url())) {
        decoderResponses.push({ url: response.url(), status: response.status() })
      }
    })

    await page.goto(`${baseUrl}/?lang=en-US`, { waitUntil: 'networkidle', timeout })
    await openLocalFile(page, testCase.path)
    const viewer = page.locator(`.fv-video-viewer[data-video-state="${testCase.state}"]`)
    await viewer.waitFor({ state: 'attached', timeout })

    if (testCase.state === 'software-decoder') {
      const player = viewer.locator('.fv-video-software-player[data-state="ready"]')
      await player.waitFor({ state: 'attached', timeout })
      await player.locator('video').evaluate(async video => {
        if (!(video instanceof HTMLVideoElement)) throw new Error('MP4V audio clock is missing.')
        await video.play()
      })
      const playerHandle = await player.elementHandle()
      assert(playerHandle, 'MP4V software player handle is missing.')
      await page.waitForFunction(
        element => Number(element.getAttribute('data-frame')) > 2,
        playerHandle,
        { timeout }
      )
      await player.locator('video').evaluate(video => video.pause())
      assert.equal(decoderResponses.length, 1, 'The built Demo did not request one hashed MP4V WASM asset.')
      assert.equal(decoderResponses[0].status, 200)
    } else {
      const video = viewer.locator('.fv-video-player')
      const videoHandle = await video.elementHandle()
      assert(videoHandle, 'Native H.264 video handle is missing.')
      await page.waitForFunction(
        element => element.videoWidth > 0,
        videoHandle,
        { timeout }
      )
      assert.equal(decoderResponses.length, 0, 'The built Demo loaded MP4V WASM for native H.264.')
    }

    const result = await viewer.evaluate(root => {
      const player = root.querySelector('.fv-video-software-player')
      const video = root.querySelector('video')
      return {
        state: root?.getAttribute('data-video-state'),
        playerState: player?.getAttribute('data-state') || null,
        frame: Number(player?.getAttribute('data-frame') || -1),
        canvas: player
          ? [player.querySelector('canvas')?.width || 0, player.querySelector('canvas')?.height || 0]
          : null,
        nativeVideo: video ? [video.videoWidth, video.videoHeight] : null
      }
    })
    assert.deepEqual(errors, [], errors.join('\n'))
    await page.screenshot({ path: join(screenshotRoot, `${testCase.name}.png`), fullPage: true })
    results.push({ sample: testCase.name, ...result, decoderResponses })
    await page.close()
  }

  console.log(JSON.stringify({ ok: true, baseUrl, results }, null, 2))
} finally {
  await browser?.close()
  await new Promise(resolvePromise => server.close(resolvePromise))
}
