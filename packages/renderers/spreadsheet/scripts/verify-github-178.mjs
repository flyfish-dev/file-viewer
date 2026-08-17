import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const sourceRoot = resolve(packageRoot, '../../..')
const sampleOverride = process.env.FILE_VIEWER_ISSUE_178_SAMPLE
const fixtureCases = sampleOverride
  ? [
      {
        format: extname(sampleOverride).toLowerCase() === '.xls' ? 'xls' : 'xlsx',
        path: resolve(sampleOverride),
        privateSample: true
      }
    ]
  : [
      {
        format: 'xls',
        path: join(packageRoot, 'test/fixtures/github-178-embedded-image.xls'),
        privateSample: false
      },
      {
        format: 'xlsx',
        path: join(packageRoot, 'test/fixtures/github-178-embedded-image.xlsx'),
        privateSample: false
      }
    ]
const workerPath = join(packageRoot, 'dist/worker/sheet.worker.js')
const screenshotDir = process.env.FILE_VIEWER_ISSUE_178_SCREENSHOT_DIR
  ? resolve(process.env.FILE_VIEWER_ISSUE_178_SCREENSHOT_DIR)
  : join(sourceRoot, 'output/playwright/issue-178')
const timeout = Number(process.env.FILE_VIEWER_ISSUE_178_TIMEOUT || 45_000)
const require = createRequire(import.meta.url)

fixtureCases.forEach(({ path }) => {
  assert(existsSync(path), `Issue #178 fixture is missing: ${path}`)
})
assert(existsSync(workerPath), `Issue #178 worker build is missing: ${workerPath}`)

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths =
      process.env.PATH?.split(delimiter)
        .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
        .map((binDir) => resolve(binDir, '..'))
        .filter(existsSync) || []

    for (const candidatePath of candidatePaths) {
      try {
        const playwrightEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(playwrightEntry).href)
      } catch {
        // Continue probing npm exec / npx injected package roots.
      }
    }

    throw new Error(
      [
        'Missing playwright module.',
        'Run with: npm exec --yes --package playwright -- node scripts/verify-github-178.mjs',
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

const verifyParserOutput = async ({ format, path, privateSample }) => {
  const parserEntry = pathToFileURL(
    join(packageRoot, 'dist/spreadsheet/worker/sheetjs/index.js')
  ).href
  const { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest } = await import(
    parserEntry
  )
  const source = await readFile(path)
  const workbook = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)
  const context = createSpreadsheetParserContext()
  const workbookResponses = await handleSpreadsheetWorkerRequest(context, {
    type: 'parseWorkbook',
    payload: {
      workbook,
      filename: `github-178-embedded-image.${format}`,
      fileType: format
    }
  })
  const sheet = workbookResponses[0]?.payload?.sheets?.[0]
  assert(sheet, 'Issue #178 fixture did not expose its worksheet.')

  const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
    type: 'parseSheet',
    payload: { sheet: sheet.id, startRow: 0, pageSize: 500, sessionId: 178 }
  })
  const sheetData = sheetResponses[0]?.payload?.sheetData
  const images = sheetData?.structure?.images || []
  images.forEach((image) => {
    assert.match(
      image.src,
      /^data:image\/png;base64,/,
      `Embedded PNG ${image.id} was not emitted as a safe data URI.`
    )
  })

  if (privateSample && format === 'xlsx') {
    assert.equal(images.length, 2, 'Private sample did not expose its cell image and model fallback.')
    const cellImage = images.find((image) => image.id.startsWith('cell-image-B2-'))
    const modelFallback = images.find((image) => image.id === 'rId2')
    assert(cellImage, 'Private sample Rich Data image at B2 was not extracted.')
    assert(modelFallback, 'Private sample GLB raster fallback was not extracted.')
    assert.equal(sheetData.data?.[1]?.[1], '', 'Rich Data image cell leaked its #VALUE! placeholder.')

    const jsZipEntry = require.resolve('jszip', { paths: [packageRoot] })
    const jsZipModule = await import(pathToFileURL(jsZipEntry).href)
    const JSZip = jsZipModule.default || jsZipModule
    const zip = await JSZip.loadAsync(source)
    const glb = await zip.file('xl/media/model3d1.glb')?.async('uint8array')
    assert(glb && glb.length > 12, 'Private sample GLB package part is missing.')
    assert.equal(
      new TextDecoder().decode(glb.subarray(0, 4)),
      'glTF',
      'Private sample model part is not a valid binary glTF container.'
    )
  } else if (format === 'xlsx') {
    assert.equal(images.length, 3, 'XLSX fixture did not preserve Office, WPS, and floating images.')
    const officeCellImage = images.find((image) => image.id.startsWith('cell-image-B2-'))
    const wpsCellImage = images.find((image) => image.id.startsWith('cell-image-C2-ID_WPS_'))
    const floatingImage = images.find((image) => !image.id.startsWith('cell-image-'))
    assert(officeCellImage, 'Office 365 Rich Data image at B2 was not extracted.')
    assert(wpsCellImage, 'WPS DISPIMG image at C2 was not extracted.')
    assert(floatingImage, 'XLSX floating image was not extracted.')
    assert.equal(sheetData.data?.[1]?.[1], '', 'Rich Data image cell leaked its #VALUE! placeholder.')
    assert.equal(sheetData.data?.[1]?.[2], '', 'WPS image cell leaked its DISPIMG placeholder.')
    assert.equal(officeCellImage.row, 1, 'Office cell image row anchor changed.')
    assert.equal(officeCellImage.col, 1, 'Office cell image column anchor changed.')
    assert.equal(officeCellImage.width, 107, 'Office cell image no longer follows B-column width.')
    assert.equal(officeCellImage.height, 72, 'Office cell image no longer follows row height.')
    assert.equal(wpsCellImage.row, 1, 'WPS cell image row anchor changed.')
    assert.equal(wpsCellImage.col, 2, 'WPS cell image column anchor changed.')
    assert.equal(wpsCellImage.width, 240, 'WPS cell image no longer follows C-column width.')
    assert.equal(wpsCellImage.height, 72, 'WPS cell image no longer follows row height.')
    assert.equal(floatingImage.row, 8, 'Floating image row anchor changed.')
    assert.equal(floatingImage.col, 3, 'Floating image column anchor changed.')
    assert.equal(
      Math.round(floatingImage.width),
      153,
      'Floating image collapsed after blank columns were auto-fitted.'
    )
    assert.equal(Math.round(floatingImage.height), 220, 'Floating image height changed.')
  } else {
    assert.equal(images.length, 1, 'XLS fixture did not preserve its OfficeArt image.')
    const image = images[0]
    assert.equal(image.id, 'xls-image-1', 'Legacy XLS image identity changed.')
    assert.equal(image.row, 8, 'Legacy XLS image row anchor changed.')
    assert.equal(image.col, 3, 'Legacy XLS image column anchor changed.')
    assert(image.width >= 250, 'Legacy XLS image width collapsed.')
    assert(image.height >= 180, 'Legacy XLS image height collapsed.')
  }

  return {
    format,
    sheet: sheet.name,
    privateSample,
    images: images.map((image) => ({
      id: image.id,
      row: image.row,
      col: image.col,
      left: Math.round(image.left),
      top: Math.round(image.top),
      width: Math.round(image.width),
      height: Math.round(image.height)
    }))
  }
}

const parserResults = []
for (const fixture of fixtureCases) {
  parserResults.push(await verifyParserOutput(fixture))
}
const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-issue-178-'))
const packageRequire = createRequire(join(sourceRoot, 'packages/components/vue3/package.json'))
const viteEntry = packageRequire.resolve('vite')
const vuePluginEntry = packageRequire.resolve('@vitejs/plugin-vue')
const vueEntry = packageRequire.resolve('vue/dist/vue.esm-bundler.js')
const vue3Entry = join(sourceRoot, 'packages/components/vue3/src/package/index.ts')
const coreEntry = join(sourceRoot, 'packages/core/src/index.ts')
const coreBrowserEntry = join(sourceRoot, 'packages/core/src/browser.ts')
const spreadsheetEntry = join(packageRoot, 'src/index.ts')
const { createServer: createViteServer } = await import(pathToFileURL(viteEntry).href)
const { default: vue } = await import(pathToFileURL(vuePluginEntry).href)
const playwrightModule = await importPlaywright()
const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default

const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Issue 178 spreadsheet images</title>
    <style>
      html, body, #app, .file-preview-page { width: 100%; height: 100%; margin: 0; }
      .file-preview-page { height: 100vh; overflow: hidden; }
    </style>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/main.js"></script>
  </body>
</html>
`

const main = `import { createApp, defineComponent, h, ref } from 'vue'
import { FileViewer } from '@issue178/vue3'
import { spreadsheetRenderer } from '@issue178/spreadsheet'

const search = new URLSearchParams(location.search)
const workerMode = search.get('worker') === '1'
const format = search.get('format') === 'xlsx' ? 'xlsx' : 'xls'
const state = window.__ISSUE_178_STATE__ = { status: 'starting', error: '', workerMode, format }
const viewerPreset = {
  id: 'issue-178-office-path',
  label: 'Issue 178 office path',
  renderers: [spreadsheetRenderer]
}

try {
  const response = await fetch('/sample.' + format)
  if (!response.ok) throw new Error('Unable to load the local spreadsheet sample: ' + response.status)
  const file = new File([await response.arrayBuffer()], 'github-178-embedded-image.' + format, {
    type: format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel'
  })
  const viewer = ref(null)
  const App = defineComponent({
    render() {
      return h('div', { class: 'file-preview-page' }, [
        h(FileViewer, {
          ref: viewer,
          file,
          options: {
            preset: viewerPreset,
            rendererMode: 'extend',
            theme: 'light',
            spreadsheet: workerMode
              ? { worker: true, workerUrl: '/sheet.worker.js' }
              : { worker: false },
            toolbar: {
              position: 'bottom-right',
              download: false,
              print: false,
              exportHtml: false,
              zoom: true
            },
            watermark: false
          },
          onLoadComplete: () => { state.status = 'mounted' },
          onLoadError: error => {
            state.status = 'error'
            state.error = error instanceof Error ? error.stack || error.message : String(error)
          }
        })
      ])
    }
  })
  const app = createApp(App)
  app.config.errorHandler = error => {
    state.status = 'error'
    state.error = error instanceof Error ? error.stack || error.message : String(error)
  }
  app.mount('#app')
} catch (error) {
  state.status = 'error'
  state.error = error instanceof Error ? error.stack || error.message : String(error)
}
`

await Promise.all([
  writeFile(join(harnessRoot, 'index.html'), html),
  writeFile(join(harnessRoot, 'main.js'), main),
  ...fixtureCases.map(({ format, path }) => copyFile(path, join(harnessRoot, `sample.${format}`))),
  copyFile(workerPath, join(harnessRoot, 'sheet.worker.js')),
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
    plugins: [vue()],
    resolve: {
      alias: {
        '@issue178/vue3': vue3Entry,
        '@issue178/spreadsheet': spreadsheetEntry,
        '@file-viewer/core/browser': coreBrowserEntry,
        '@file-viewer/core': coreEntry,
        vue: vueEntry
      },
      dedupe: ['vue']
    },
    optimizeDeps: {
      exclude: ['@issue178/vue3', '@issue178/spreadsheet', '@file-viewer/core'],
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
  assert(address && typeof address !== 'string', 'Issue #178 harness did not bind a TCP port.')
  browser = await launchChromium(chromium)
  const results = []

  for (const { format, privateSample } of fixtureCases) {
    for (const workerMode of [false, true]) {
      const expectedImageCount = privateSample ? 2 : format === 'xlsx' ? 3 : 1
      const page = await browser.newPage({ viewport: { width: 1100, height: 760 } })
      const pageErrors = []
      const consoleErrors = []
      const workerRequests = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      page.on('request', (request) => {
        if (request.url().includes('/sheet.worker.js')) workerRequests.push(request.url())
      })

      await page.goto(
        `http://127.0.0.1:${address.port}/?format=${format}&worker=${workerMode ? 1 : 0}`,
        {
          waitUntil: 'domcontentloaded',
          timeout
        }
      )
      await page.waitForFunction(
        () => ['mounted', 'error'].includes(window.__ISSUE_178_STATE__?.status),
        undefined,
        { timeout }
      )
      await page.waitForFunction(
        (imageCount) => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          const images = [...root.querySelectorAll('.excel-image')]
          return images.length === imageCount && images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0 &&
              image.naturalHeight > 0
          )
        },
        expectedImageCount,
        { timeout }
      )
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(
        () => requestAnimationFrame(resolve)
      )))

      const result = await page.evaluate(() => {
        const host = document.querySelector('.file-viewer-vue3-shadow-host')
        const root = host?.shadowRoot || document
        const spreadsheet = root.querySelector('.excel-wrapper')
        const viewport = root.querySelector('.excel-image-viewport')
        const images = [...root.querySelectorAll('.excel-image')]
        const viewportRect = viewport?.getBoundingClientRect()
        const spreadsheetRect = spreadsheet?.getBoundingClientRect()
        return {
          state: window.__ISSUE_178_STATE__,
          hasShadow: !!host?.shadowRoot,
          imageCount: images.length,
          images: images.map((image) => {
            const rect = image.getBoundingClientRect()
            return {
              id: image.getAttribute('alt') || '',
              source: image.getAttribute('src')?.slice(0, 32) || '',
              complete: image instanceof HTMLImageElement ? image.complete : false,
              naturalWidth: image instanceof HTMLImageElement ? image.naturalWidth : 0,
              naturalHeight: image instanceof HTMLImageElement ? image.naturalHeight : 0,
              rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
              },
              style: image instanceof HTMLElement
                ? {
                    left: image.style.left,
                    top: image.style.top,
                    width: image.style.width,
                    height: image.style.height
                  }
                : null
            }
          }),
          viewportHidden: viewport?.classList.contains('hidden') ?? true,
          viewportRect: viewportRect
            ? {
                left: viewportRect.left,
                top: viewportRect.top,
                width: viewportRect.width,
                height: viewportRect.height
              }
            : null,
          spreadsheetRect: spreadsheetRect
            ? {
                left: spreadsheetRect.left,
                top: spreadsheetRect.top,
                width: spreadsheetRect.width,
                height: spreadsheetRect.height
              }
            : null
        }
      })

      await page.screenshot({
        path: join(screenshotDir, `${format}-${workerMode ? 'worker' : 'main-thread'}.png`),
        fullPage: true
      })

      const diagnostics = JSON.stringify(
        { result, pageErrors, consoleErrors, workerRequests },
        null,
        2
      )
      assert.equal(result.state.status, 'mounted', `Issue #178 viewer failed:\n${diagnostics}`)
      assert.deepEqual(pageErrors, [], `Issue #178 page errors:\n${diagnostics}`)
      assert.deepEqual(consoleErrors, [], `Issue #178 console errors:\n${diagnostics}`)
      assert.equal(
        result.hasShadow,
        true,
        `Issue #178 did not exercise Vue 3 ShadowRoot:\n${diagnostics}`
      )
      assert.equal(
        result.imageCount,
        expectedImageCount,
        `Issue #178 image count changed:\n${diagnostics}`
      )
      result.images.forEach((image) => {
        assert.match(
          image.source,
          /^data:image\/png;base64,/,
          `Issue #178 image source is invalid:\n${diagnostics}`
        )
        assert.equal(image.complete, true, `Issue #178 image did not finish loading:\n${diagnostics}`)
        assert(image.rect.width > 0 && image.rect.height > 0, `Issue #178 image collapsed:\n${diagnostics}`)
      })
      if (privateSample && format === 'xlsx') {
        const cellImage = result.images.find((image) => image.id.startsWith('cell-image-B2-'))
        const modelFallback = result.images.find((image) => image.id === 'rId2')
        assert(cellImage, `Private Rich Data image did not render:\n${diagnostics}`)
        assert(modelFallback, `Private GLB fallback did not render:\n${diagnostics}`)
        assert.equal(cellImage.naturalWidth, 1640, `Private cell image width changed:\n${diagnostics}`)
        assert.equal(cellImage.naturalHeight, 2360, `Private cell image height changed:\n${diagnostics}`)
        assert.equal(modelFallback.naturalWidth, 355, `Private model fallback width changed:\n${diagnostics}`)
        assert.equal(modelFallback.naturalHeight, 403, `Private model fallback height changed:\n${diagnostics}`)
      } else {
        result.images.forEach((image) => {
          assert.equal(image.naturalWidth, 16, `Issue #178 source width changed:\n${diagnostics}`)
          assert.equal(image.naturalHeight, 16, `Issue #178 source height changed:\n${diagnostics}`)
        })
        if (format === 'xlsx') {
          assert(
            result.images.some((image) => image.id.startsWith('cell-image-B2-')),
            `Office 365 cell image did not render:\n${diagnostics}`
          )
          assert(
            result.images.some((image) => image.id.startsWith('cell-image-C2-ID_WPS_')),
            `WPS DISPIMG cell image did not render:\n${diagnostics}`
          )
        }
        const floatingImage = result.images.find((image) => !image.id.startsWith('cell-image-'))
        const minimumFloatingSize = format === 'xlsx'
          ? { width: 145, height: 180 }
          : { width: 160, height: 120 }
        assert(
          floatingImage?.rect.width >= minimumFloatingSize.width &&
            floatingImage?.rect.height >= minimumFloatingSize.height,
          `Issue #178 floating image collapsed:\n${diagnostics}`
        )
      }
      assert.equal(
        result.viewportHidden,
        false,
        `Issue #178 image viewport stayed hidden:\n${diagnostics}`
      )
      assert(
        result.viewportRect?.width > 700 && result.viewportRect?.height > 500,
        `Issue #178 image viewport collapsed:\n${diagnostics}`
      )
      assert(
        result.spreadsheetRect?.height > 600,
        `Issue #178 spreadsheet collapsed:\n${diagnostics}`
      )
      assert.equal(
        workerRequests.length > 0,
        workerMode,
        `Issue #178 worker selection did not match the requested mode:\n${diagnostics}`
      )

      results.push({
        format,
        privateSample,
        mode: workerMode ? 'worker' : 'main-thread',
        images: result.images.map((image) => ({ id: image.id, rect: image.rect })),
        viewport: result.viewportRect,
        workerRequests: workerRequests.length
      })
      await page.close()
    }
  }

  console.log(
    `[spreadsheet] GitHub #178 embedded PNG survived XLS/XLSX parser, main-thread, and Worker rendering: ${JSON.stringify({ parserResults, results })}`
  )
} finally {
  await browser?.close().catch(() => undefined)
  await viteServer?.close().catch(() => undefined)
  await rm(harnessRoot, { recursive: true, force: true })
}
