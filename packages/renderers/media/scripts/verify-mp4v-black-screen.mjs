import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const sourceRoot = resolve(packageRoot, '../../..')
const mp4vFixture = join(packageRoot, 'test/fixtures/mp4v-aac-black-screen.mp4')
const h264Fixture = join(sourceRoot, 'apps/viewer-demo/public/example/video.mp4')
const privateSample = process.env.FILE_VIEWER_MEDIA_MP4_SAMPLE
  ? resolve(process.env.FILE_VIEWER_MEDIA_MP4_SAMPLE)
  : undefined
const screenshotDir = process.env.FILE_VIEWER_MEDIA_SCREENSHOT_DIR
  ? resolve(process.env.FILE_VIEWER_MEDIA_SCREENSHOT_DIR)
  : join(sourceRoot, 'output/playwright/media-black-screen')
const timeout = Number(process.env.FILE_VIEWER_MEDIA_TIMEOUT || 30_000)

for (const path of [mp4vFixture, h264Fixture, privateSample].filter(Boolean)) {
  assert(existsSync(path), `Video regression sample is missing: ${path}`)
}

const toArrayBuffer = (source) => source.buffer.slice(
  source.byteOffset,
  source.byteOffset + source.byteLength
)

const { extractMp4vSoftwareTrack, inspectMp4VideoTrack } = await import(
  pathToFileURL(join(packageRoot, 'dist/mp4.js')).href
)
const mp4vBytes = await readFile(mp4vFixture)
const mp4vTrack = inspectMp4VideoTrack(toArrayBuffer(mp4vBytes))
assert.equal(mp4vTrack?.codec, 'mp4v', 'Synthetic fixture no longer declares an mp4v video track.')
assert.equal(mp4vTrack?.contentType, 'video/mp4; codecs="mp4v.20"')

const oversizedSampleTable = Buffer.from(mp4vBytes)
const sampleSizeTypeOffset = oversizedSampleTable.indexOf(Buffer.from('stsz'))
assert(sampleSizeTypeOffset > 0, 'Synthetic MP4V fixture is missing stsz.')
oversizedSampleTable.writeUInt32BE(0xffffffff, sampleSizeTypeOffset + 12)
assert.equal(
  extractMp4vSoftwareTrack(toArrayBuffer(oversizedSampleTable)),
  undefined,
  'A forged MP4 sample count bypassed the parser allocation limit.'
)

const oversizedDimensions = Buffer.from(mp4vBytes)
const sampleEntryTypeOffset = oversizedDimensions.indexOf(Buffer.from('mp4v'))
assert(sampleEntryTypeOffset > 0, 'Synthetic MP4V fixture is missing its sample entry.')
oversizedDimensions.writeUInt16BE(0xffff, sampleEntryTypeOffset + 28)
oversizedDimensions.writeUInt16BE(0xffff, sampleEntryTypeOffset + 30)
assert.equal(
  extractMp4vSoftwareTrack(toArrayBuffer(oversizedDimensions)),
  undefined,
  'Forged MP4 dimensions bypassed the decoder pixel limit.'
)

const h264Track = inspectMp4VideoTrack(toArrayBuffer(await readFile(h264Fixture)))
assert.equal(h264Track?.codec, 'avc1', 'Positive control no longer declares an H.264 video track.')

if (privateSample) {
  const privateTrack = inspectMp4VideoTrack(toArrayBuffer(await readFile(privateSample)))
  assert.equal(privateTrack?.codec, 'mp4v', 'The supplied regression sample is no longer MP4V.')
}

const require = createRequire(join(sourceRoot, 'packages/components/vue3/package.json'))
const viteEntry = require.resolve('vite')
const { createServer: createViteServer } = await import(pathToFileURL(viteEntry).href)

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths = process.env.PATH?.split(delimiter)
      .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map((binDir) => resolve(binDir, '..'))
      .filter(existsSync) || []

    for (const candidatePath of candidatePaths) {
      try {
        const entry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(entry).href)
      } catch {
        // Continue probing package roots injected by npm exec / npx.
      }
    }

    throw new Error(
      [
        'Missing playwright module.',
        'Run with: npm exec --yes --package playwright -- node scripts/verify-mp4v-black-screen.mjs',
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      ].join('\n'),
      { cause: error }
    )
  }
}

const launchChromium = async (chromium) => {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    try {
      return await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      throw error
    }
  }
}

const playwrightModule = await importPlaywright()
const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-media-mp4v-'))

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MP4V black-screen regression</title>
    <style>html,body,#target{width:100%;height:100%;margin:0}</style>
  </head>
  <body>
    <main id="target"></main>
    <script type="module" src="/main.js"></script>
  </body>
</html>`

const main = `import { renderFileViewerVideo } from '@media-regression/renderer'

const state = window.__MEDIA_REGRESSION__ = { status: 'starting', error: '' }
const sample = new URLSearchParams(location.search).get('sample') || 'mp4v'
try {
  const response = await fetch('/' + sample + '.mp4')
  if (!response.ok) throw new Error('Unable to load video fixture: ' + response.status)
  const instance = await renderFileViewerVideo(
    await response.arrayBuffer(),
    document.querySelector('#target'),
    'mp4',
    { options: { locale: 'zh-CN' } }
  )
  window.__MEDIA_INSTANCE__ = instance
  state.status = 'mounted'
} catch (error) {
  state.status = 'error'
  state.error = error instanceof Error ? error.stack || error.message : String(error)
}`

await Promise.all([
  writeFile(join(harnessRoot, 'index.html'), html),
  writeFile(join(harnessRoot, 'main.js'), main),
  copyFile(mp4vFixture, join(harnessRoot, 'mp4v.mp4')),
  copyFile(h264Fixture, join(harnessRoot, 'h264.mp4')),
  privateSample ? copyFile(privateSample, join(harnessRoot, 'private.mp4')) : Promise.resolve(),
  mkdir(screenshotDir, { recursive: true })
])

let viteServer
let browser

try {
  viteServer = await createViteServer({
    root: harnessRoot,
    appType: 'spa',
    clearScreen: false,
    logLevel: 'error',
    resolve: {
      alias: {
        '@media-regression/renderer': join(packageRoot, 'dist/index.js'),
        '@file-viewer/core': join(sourceRoot, 'packages/core/dist/index.js')
      }
    },
    optimizeDeps: {
      exclude: ['@media-regression/renderer', '@file-viewer/core'],
      entries: []
    },
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      fs: { allow: [sourceRoot, harnessRoot] }
    }
  })
  await viteServer.listen()
  const address = viteServer.httpServer?.address()
  assert(address && typeof address !== 'string', 'Media harness did not bind a TCP port.')

  browser = await launchChromium(chromium)
  const results = []
  const cases = [
    { sample: 'mp4v', expectedState: 'software-decoder' },
    { sample: 'h264', expectedState: 'ready' },
    ...(privateSample ? [{ sample: 'private', expectedState: 'software-decoder' }] : [])
  ]

  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } })
    const pageErrors = []
    const consoleErrors = []
    const decoderResponses = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('response', (response) => {
      if (/mp4v-decoder\.(?:mjs|wasm)(?:\?|$)/.test(response.url())) {
        decoderResponses.push({ url: response.url(), status: response.status() })
      }
    })
    await page.goto(`http://127.0.0.1:${address.port}/?sample=${testCase.sample}`, {
      waitUntil: 'domcontentloaded',
      timeout
    })
    await page.waitForFunction(
      () => ['mounted', 'error'].includes(window.__MEDIA_REGRESSION__?.status),
      undefined,
      { timeout }
    )
    try {
      await page.waitForFunction(
        (expectedState) => document.querySelector('.fv-video-viewer')?.dataset.videoState === expectedState,
        testCase.expectedState,
        { timeout }
      )
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        runtime: window.__MEDIA_REGRESSION__,
        state: document.querySelector('.fv-video-viewer')?.getAttribute('data-video-state'),
        playerState: document.querySelector('.fv-video-software-player')?.getAttribute('data-state'),
        text: document.body.textContent?.replace(/\s+/g, ' ').trim()
      }))
      throw new Error(
        `Unexpected ${testCase.sample} state: ${JSON.stringify({ diagnostic, pageErrors, consoleErrors })}`,
        { cause: error }
      )
    }
    if (testCase.expectedState === 'ready' || testCase.expectedState === 'software-decoder') {
      await page.evaluate(async () => {
        const video = document.querySelector('video')
        if (!video) throw new Error('Video playback clock is missing.')
        await video.play()
      })
      await page.waitForFunction(
        () => (document.querySelector('video')?.currentTime || 0) > 0.25,
        undefined,
        { timeout }
      )
      if (testCase.expectedState === 'software-decoder') {
        await page.waitForFunction(
          () => Number(document.querySelector('.fv-video-software-player')?.dataset.frame || 0) > 2,
          undefined,
          { timeout }
        )
        await page.waitForFunction(
          () => {
            const video = document.querySelector('video')
            const player = document.querySelector('.fv-video-software-player')
            return Boolean(video && player && Math.abs(
              Number(player.dataset.frameTime) - video.currentTime
            ) < 0.15)
          },
          undefined,
          { timeout }
        )
      }
      await page.evaluate(() => document.querySelector('video')?.pause())
      if (testCase.expectedState === 'software-decoder') {
        const seekTarget = await page.evaluate(() => {
          const video = document.querySelector('video')
          if (!video || !Number.isFinite(video.duration)) throw new Error('Video duration is missing.')
          const target = video.duration * 0.5
          video.currentTime = target
          return target
        })
        await page.waitForFunction(
          (target) => Math.abs(
            Number(document.querySelector('.fv-video-software-player')?.dataset.frameTime) - target
          ) < 0.15,
          seekTarget,
          { timeout }
        )
        const playbackTarget = await page.evaluate(async () => {
          const video = document.querySelector('video')
          if (!video) throw new Error('Video playback clock is missing after seeking.')
          const target = Math.min(
            video.duration - 0.05,
            video.currentTime + Math.min(0.75, video.duration * 0.25)
          )
          await video.play()
          return target
        })
        await page.waitForFunction(
          (target) => (document.querySelector('video')?.currentTime || 0) >= target,
          playbackTarget,
          { timeout }
        )
        await page.waitForFunction(
          () => {
            const video = document.querySelector('video')
            const player = document.querySelector('.fv-video-software-player')
            return Boolean(video && player && Math.abs(
              Number(player.dataset.frameTime) - video.currentTime
            ) < 0.15)
          },
          undefined,
          { timeout }
        )
        await page.evaluate(() => document.querySelector('video')?.pause())
      }
    }

    const wasmResponses = decoderResponses.filter(({ url }) => /mp4v-decoder\.wasm(?:\?|$)/.test(url))
    if (testCase.expectedState === 'software-decoder') {
      assert.equal(wasmResponses.length, 1, `${testCase.sample} did not lazily load one MP4V WASM asset.`)
      assert.equal(wasmResponses[0].status, 200)
    } else {
      assert.equal(wasmResponses.length, 0, `${testCase.sample} unexpectedly loaded the MP4V WASM asset.`)
    }

    const result = await page.evaluate(() => {
      const root = document.querySelector('.fv-video-viewer')
      const video = document.querySelector('video')
      const notice = document.querySelector('.fv-video-compatibility')
      const softwarePlayer = document.querySelector('.fv-video-software-player')
      let decodedPixelRatio = null
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 18
        const context = canvas.getContext('2d')
        context?.drawImage(video, 0, 0, canvas.width, canvas.height)
        const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data
        if (pixels) {
          let decodedPixels = 0
          for (let offset = 0; offset < pixels.length; offset += 4) {
            if (Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]) > 20) {
              decodedPixels += 1
            }
          }
          decodedPixelRatio = decodedPixels / (canvas.width * canvas.height)
        }
      }
      return {
        runtime: window.__MEDIA_REGRESSION__,
        state: root?.dataset.videoState || '',
        video: video
          ? {
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState,
              currentTime: video.currentTime,
              decodedPixelRatio,
              error: video.error?.message || ''
            }
          : null,
        notice: notice
          ? {
              codec: notice.getAttribute('data-codec'),
              role: notice.getAttribute('role'),
              text: notice.textContent?.replace(/\s+/g, ' ').trim() || ''
            }
          : null,
        softwarePlayer: softwarePlayer
          ? {
              state: softwarePlayer.getAttribute('data-state'),
              frame: Number(softwarePlayer.getAttribute('data-frame') || -1),
              frameTime: Number(softwarePlayer.getAttribute('data-frame-time') || -1),
              decodeMs: Number(softwarePlayer.getAttribute('data-decode-ms') || -1),
              canvasWidth: softwarePlayer.querySelector('canvas')?.width || 0,
              canvasHeight: softwarePlayer.querySelector('canvas')?.height || 0
            }
          : null
      }
    })
    result.decoderResponses = decoderResponses

    assert.equal(result.runtime.status, 'mounted', result.runtime.error)
    assert.equal(result.state, testCase.expectedState)
    assert.deepEqual(pageErrors, [], `Browser errors for ${testCase.sample}: ${pageErrors.join('\n')}`)
    assert.deepEqual(consoleErrors, [], `Console errors for ${testCase.sample}: ${consoleErrors.join('\n')}`)
    if (testCase.expectedState === 'software-decoder') {
      assert.equal(result.notice, null, 'MP4V software playback unexpectedly fell back to a warning.')
      assert.equal(result.softwarePlayer?.state, 'ready')
      assert(result.softwarePlayer?.frame > 2, 'MP4V software playback did not advance decoded frames.')
      assert(
        Math.abs(result.softwarePlayer?.frameTime - result.video?.currentTime) < 0.15,
        'MP4V video frame drifted away from the native AAC playback clock.'
      )
      assert(result.softwarePlayer?.decodeMs >= 0, 'MP4V decode timing was not reported.')
      assert(result.softwarePlayer?.canvasWidth > 0, 'MP4V canvas width is empty.')
      assert(result.softwarePlayer?.canvasHeight > 0, 'MP4V canvas height is empty.')
      assert(result.video?.currentTime > 0.25, 'MP4V audio clock did not advance.')
    } else {
      assert.equal(result.notice, null, 'H.264 positive control unexpectedly showed a codec warning.')
      assert.equal(result.softwarePlayer, null, 'H.264 unexpectedly loaded the MP4V software decoder.')
      assert(result.video?.width > 0, 'H.264 video width was not decoded.')
      assert(result.video?.height > 0, 'H.264 video height was not decoded.')
      assert(
        result.video?.decodedPixelRatio > 0.5,
        `H.264 video frame stayed black (${result.video?.decodedPixelRatio || 0} decoded-pixel ratio).`
      )
    }

    await page.screenshot({
      path: join(screenshotDir, `${testCase.sample}.png`),
      fullPage: true
    })
    results.push({ sample: testCase.sample, ...result })
    await page.close()
  }

  console.log(JSON.stringify({
    ok: true,
    parser: { mp4v: mp4vTrack, h264: h264Track, malformedGuards: true },
    browser: results,
    screenshots: screenshotDir
  }, null, 2))
} finally {
  await browser?.close().catch(() => undefined)
  await viteServer?.close().catch(() => undefined)
  await rm(harnessRoot, { recursive: true, force: true })
}
