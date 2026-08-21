import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
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
const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-issue-178-'))

const createTinyRgbTiff = () => {
  const entryCount = 10
  const ifdOffset = 8
  const bitsOffset = ifdOffset + 2 + entryCount * 12 + 4
  const pixelsOffset = bitsOffset + 6
  const bytes = Buffer.alloc(pixelsOffset + 12)
  bytes.write('II', 0, 'ascii')
  bytes.writeUInt16LE(42, 2)
  bytes.writeUInt32LE(ifdOffset, 4)
  bytes.writeUInt16LE(entryCount, ifdOffset)
  const entries = [
    [256, 3, 1, 2],
    [257, 3, 1, 2],
    [258, 3, 3, bitsOffset],
    [259, 3, 1, 1],
    [262, 3, 1, 2],
    [273, 4, 1, pixelsOffset],
    [277, 3, 1, 3],
    [278, 4, 1, 2],
    [279, 4, 1, 12],
    [284, 3, 1, 1]
  ]
  entries.forEach(([tag, type, count, value], index) => {
    const offset = ifdOffset + 2 + index * 12
    bytes.writeUInt16LE(tag, offset)
    bytes.writeUInt16LE(type, offset + 2)
    bytes.writeUInt32LE(count, offset + 4)
    if (type === 3 && count === 1) bytes.writeUInt16LE(value, offset + 8)
    else bytes.writeUInt32LE(value, offset + 8)
  })
  bytes.writeUInt32LE(0, ifdOffset + 2 + entryCount * 12)
  ;[8, 8, 8].forEach((value, index) => bytes.writeUInt16LE(value, bitsOffset + index * 2))
  Buffer.from([
    255, 0, 0, 0, 255, 0,
    0, 0, 255, 255, 255, 255
  ]).copy(bytes, pixelsOffset)
  return bytes
}

if (!sampleOverride) {
  const jsZipEntry = require.resolve('jszip', { paths: [packageRoot] })
  const jsZipModule = await import(pathToFileURL(jsZipEntry).href)
  const JSZip = jsZipModule.default || jsZipModule
  const sourcePath = fixtureCases[1].path
  const zip = await JSZip.loadAsync(await readFile(sourcePath))
  const relationshipPath = 'xl/drawings/_rels/drawing1.xml.rels'
  const relationships = await zip.file(relationshipPath).async('string')
  const contentTypes = await zip.file('[Content_Types].xml').async('string')
  zip.remove('xl/media/image.png')
  zip.file('xl/media/image.tiff', createTinyRgbTiff())
  zip.file(relationshipPath, relationships.replace('/xl/media/image.png', '/xl/media/image.tiff'))
  zip.file(
    '[Content_Types].xml',
    contentTypes.replace('</Types>', '<Default Extension="tiff" ContentType="image/tiff"/></Types>')
  )
  const syntheticPath = join(harnessRoot, 'github-178-embedded-tiff.xlsx')
  await writeFile(syntheticPath, await zip.generateAsync({ type: 'nodebuffer' }))
  fixtureCases[1] = { ...fixtureCases[1], path: syntheticPath, tiffSample: true }
}

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

const verifyParserOutput = async ({ format, path, privateSample, tiffSample }) => {
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
  const sheets = workbookResponses[0]?.payload?.sheets || []
  assert(sheets.length, 'Issue #178 fixture did not expose its worksheets.')
  const parsedSheets = []
  for (const sheet of sheets) {
    const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
      type: 'parseSheet',
      payload: { sheet: sheet.id, startRow: 0, pageSize: 500, sessionId: 178 }
    })
    const sheetData = sheetResponses[0]?.payload?.sheetData
    parsedSheets.push({
      sheet,
      sheetData,
      images: sheetData?.structure?.images || []
    })
  }
  const parsed = privateSample
    ? parsedSheets.find(candidate => candidate.images.length)
    : parsedSheets[0]
  assert(parsed, 'Issue #178 fixture did not expose a worksheet with images.')
  const { sheet, sheetData, images } = parsed
  images.forEach((image) => {
    const tiffImage = tiffSample && !image.id.startsWith('cell-image-')
    assert.match(
      image.src,
      privateSample
        ? /^data:(?:image\/[a-z0-9.+-]+|application\/octet-stream);base64,/
        : tiffImage
        ? /^data:image\/tiff;base64,/
        : /^data:image\/png;base64,/,
      `Embedded image ${image.id} was not emitted as a data URI.`
    )
    if (tiffImage) assert.equal(image.contentType, 'image/tiff')
  })

  if (privateSample) {
    assert(images.length > 0, 'Reporter sample did not expose any embedded image.')
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
    assert.equal(officeCellImage.width, 124, 'Office cell image no longer follows B-column width.')
    assert.equal(officeCellImage.height, 72, 'Office cell image no longer follows row height.')
    assert.equal(wpsCellImage.row, 1, 'WPS cell image row anchor changed.')
    assert.equal(wpsCellImage.col, 2, 'WPS cell image column anchor changed.')
    assert.equal(wpsCellImage.width, 280, 'WPS cell image no longer follows C-column width.')
    assert.equal(wpsCellImage.height, 72, 'WPS cell image no longer follows row height.')
    assert.equal(floatingImage.row, 8, 'Floating image row anchor changed.')
    assert.equal(floatingImage.col, 3, 'Floating image column anchor changed.')
    assert.equal(
      Math.round(floatingImage.width),
      177,
      'Floating image collapsed after blank columns were auto-fitted.'
    )
    assert.equal(Math.round(floatingImage.height), 220, 'Floating image height changed.')
  } else {
    assert.equal(images.length, 1, 'XLS fixture did not preserve its OfficeArt image.')
    const image = images[0]
    assert.equal(image.id, 'xls-image-1', 'Legacy XLS image identity changed.')
    assert.equal(image.row, 8, 'Legacy XLS image row anchor changed.')
    assert.equal(image.col, 3, 'Legacy XLS image column anchor changed.')
    assert.equal(Math.round(image.width), 147, 'Legacy XLS image width changed.')
    assert(image.height >= 180, 'Legacy XLS image height collapsed.')
  }

  return {
    format,
    sheet: sheet.name,
    privateSample,
    tiffSample,
    sheetId: sheet.id,
    images: images.map((image) => ({
      id: image.id,
      contentType: image.contentType,
      sourcePrefix: image.src.slice(0, 40),
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
const packageRequire = createRequire(join(sourceRoot, 'packages/components/vue3/package.json'))
const viteEntry = packageRequire.resolve('vite')
const vuePluginEntry = packageRequire.resolve('@vitejs/plugin-vue')
const vueEntry = packageRequire.resolve('vue/dist/vue.esm-bundler.js')
const vue3Entry = join(sourceRoot, 'packages/components/vue3/src/package/index.ts')
const coreEntry = join(sourceRoot, 'packages/core/src/index.ts')
const coreBrowserEntry = join(sourceRoot, 'packages/core/src/browser.ts')
const spreadsheetEntry = join(packageRoot, 'src/index.ts')
const { build: viteBuild } = await import(pathToFileURL(viteEntry).href)
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
  mkdir(screenshotDir, { recursive: true })
])

const distRoot = join(harnessRoot, 'dist')
let staticServer
let browser

try {
  const previousCwd = process.cwd()
  process.chdir(harnessRoot)
  try {
    await viteBuild({
      root: '.',
      appType: 'spa',
      publicDir: false,
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
      build: {
        outDir: distRoot,
        emptyOutDir: true,
        sourcemap: false
      }
    })
  } finally {
    process.chdir(previousCwd)
  }
  await Promise.all([
    ...fixtureCases.map(({ format, path }) => copyFile(path, join(distRoot, `sample.${format}`))),
    copyFile(workerPath, join(distRoot, 'sheet.worker.js'))
  ])

  const contentTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'application/javascript; charset=utf-8'],
    ['.map', 'application/json; charset=utf-8'],
    ['.xls', 'application/vnd.ms-excel'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  ])
  staticServer = createHttpServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
      const relativePath = requestUrl.pathname === '/'
        ? 'index.html'
        : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
      if (!relativePath || relativePath.split('/').includes('..')) {
        response.writeHead(400).end()
        return
      }
      const body = await readFile(join(distRoot, relativePath))
      response.writeHead(200, {
        'Content-Type': contentTypes.get(extname(relativePath)) || 'application/octet-stream',
        'Cache-Control': 'no-store'
      })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise((resolve, reject) => {
    staticServer.once('error', reject)
    staticServer.listen(0, '127.0.0.1', resolve)
  })

  const address = staticServer.address()
  assert(address && typeof address !== 'string', 'Issue #178 harness did not bind a TCP port.')
  browser = await launchChromium(chromium)
  const results = []

  for (const [fixtureIndex, { format, privateSample, tiffSample }] of fixtureCases.entries()) {
    const parserResult = parserResults[fixtureIndex]
    for (const workerMode of [false, true]) {
      const expectedImageCount = parserResult.images.length
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
      if (parserResult.sheetId !== 0) {
        await page.waitForFunction((sheetName) => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          return !!root.querySelector('.error:not(.hidden)') || [...root.querySelectorAll('.sheet-tab')]
            .some(tab => tab.textContent?.trim() === sheetName)
        }, parserResult.sheet, { timeout })
        const sheetSwitch = await page.evaluate((sheetName) => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          const tab = [...root.querySelectorAll('.sheet-tab')]
            .find(candidate => candidate.textContent?.trim() === sheetName)
          const error = root.querySelector('.error:not(.hidden)')?.textContent?.trim() || ''
          if (tab instanceof HTMLElement) {
            tab.click()
            return { clicked: true, error, tabs: [] }
          }
          return {
            clicked: false,
            error,
            tabs: [...root.querySelectorAll('.sheet-tab')]
              .map(candidate => candidate.textContent?.trim() || '')
          }
        }, parserResult.sheet)
        assert(
          sheetSwitch.clicked,
          `Issue #178 could not select reporter sheet ${parserResult.sheet}: ${JSON.stringify(sheetSwitch)}`
        )
      }
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
        const tiffImage = tiffSample && !image.id.startsWith('cell-image-')
        if (privateSample || tiffImage) {
          assert.match(image.source, /^(?:blob:|data:image\/)/, `Issue #178 image source is invalid:\n${diagnostics}`)
        } else {
          assert.match(image.source, /^data:image\/png;base64,/, `Issue #178 image source is invalid:\n${diagnostics}`)
        }
        assert.equal(image.complete, true, `Issue #178 image did not finish loading:\n${diagnostics}`)
        assert(image.naturalWidth > 0 && image.naturalHeight > 0, `Issue #178 image did not decode:\n${diagnostics}`)
        assert(image.rect.width > 0 && image.rect.height > 0, `Issue #178 image collapsed:\n${diagnostics}`)
      })
      if (!privateSample) {
        result.images.forEach((image) => {
          const tiffImage = tiffSample && !image.id.startsWith('cell-image-')
          assert.equal(image.naturalWidth, tiffImage ? 2 : 16, `Issue #178 source width changed:\n${diagnostics}`)
          assert.equal(image.naturalHeight, tiffImage ? 2 : 16, `Issue #178 source height changed:\n${diagnostics}`)
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
          : { width: 140, height: 120 }
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

      const previewTargetIds = privateSample
        ? result.images.slice(0, 1).map((image) => image.id)
        : tiffSample
        ? result.images.map((image) => image.id)
        : format === 'xlsx'
        ? result.images
          .filter((image) => image.id.startsWith('cell-image-'))
          .map((image) => image.id)
        : result.images.slice(0, 1).map((image) => image.id)
      assert(
        previewTargetIds.length > 0,
        `Issue #178 did not expose an image for double-click preview:\n${diagnostics}`
      )
      const previewResults = []
      for (const [previewIndex, imageId] of previewTargetIds.entries()) {
        const doubleClickPoint = await page.evaluate((targetImageId) => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          const image = [...root.querySelectorAll('.excel-image')]
            .find((candidate) => candidate.getAttribute('alt') === targetImageId)
          const viewport = root.querySelector('.excel-image-viewport')
          if (!(image instanceof HTMLImageElement) || !(viewport instanceof HTMLElement)) {
            return false
          }
          const imageRect = image.getBoundingClientRect()
          const viewportRect = viewport.getBoundingClientRect()
          const visibleLeft = Math.max(imageRect.left, viewportRect.left)
          const visibleTop = Math.max(imageRect.top, viewportRect.top)
          const visibleRight = Math.min(imageRect.right, viewportRect.right)
          const visibleBottom = Math.min(imageRect.bottom, viewportRect.bottom)
          if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
            return false
          }
          return {
            x: (visibleLeft + visibleRight) / 2,
            y: (visibleTop + visibleBottom) / 2
          }
        }, imageId)
        assert(
          doubleClickPoint && typeof doubleClickPoint === 'object',
          `Issue #178 could not double-click image ${imageId}:\n${diagnostics}`
        )
        await page.mouse.dblclick(doubleClickPoint.x, doubleClickPoint.y)
        await page.waitForFunction(
          (targetImageId) => {
            const host = document.querySelector('.file-viewer-vue3-shadow-host')
            const root = host?.shadowRoot || document
            const lightbox = root.querySelector('.excel-image-lightbox')
            const preview = lightbox?.querySelector('img')
            return lightbox?.getAttribute('data-open') === 'true' &&
              lightbox?.getAttribute('data-image-id') === targetImageId &&
              preview instanceof HTMLImageElement &&
              preview.complete &&
              preview.naturalWidth > 0 &&
              preview.naturalHeight > 0
          },
          imageId,
          { timeout }
        )
        await page.waitForFunction(() => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          const lightbox = root.querySelector('.excel-image-lightbox')
          return lightbox instanceof HTMLElement &&
            Number.parseFloat(getComputedStyle(lightbox).opacity) >= 0.99
        }, undefined, { timeout })
        const preview = await page.evaluate((targetImageId) => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          const source = [...root.querySelectorAll('.excel-image')]
            .find((candidate) => candidate.getAttribute('alt') === targetImageId)
          const lightbox = root.querySelector('.excel-image-lightbox')
          const previewImage = lightbox?.querySelector('img')
          const closeButton = lightbox?.querySelector('button')
          const previewRect = previewImage?.getBoundingClientRect()
          const lightboxStyle = lightbox instanceof HTMLElement
            ? getComputedStyle(lightbox)
            : null
          return {
            imageId: lightbox?.getAttribute('data-image-id') || '',
            open: lightbox?.getAttribute('data-open') === 'true',
            ariaHidden: lightbox?.getAttribute('aria-hidden'),
            sourceMatches: source instanceof HTMLImageElement &&
              previewImage instanceof HTMLImageElement &&
              source.src === previewImage.src,
            naturalWidth: previewImage instanceof HTMLImageElement
              ? previewImage.naturalWidth
              : 0,
            naturalHeight: previewImage instanceof HTMLImageElement
              ? previewImage.naturalHeight
              : 0,
            opacity: lightboxStyle?.opacity || '',
            visibility: lightboxStyle?.visibility || '',
            closeLabel: closeButton?.getAttribute('aria-label') || '',
            rect: previewRect
              ? { width: previewRect.width, height: previewRect.height }
              : null
          }
        }, imageId)
        assert.equal(preview.open, true, `Image preview did not open:\n${JSON.stringify(preview)}`)
        assert.equal(preview.ariaHidden, 'false', `Image preview stayed hidden:\n${JSON.stringify(preview)}`)
        assert.equal(preview.imageId, imageId, `Image preview identity changed:\n${JSON.stringify(preview)}`)
        assert.equal(preview.sourceMatches, true, `Image preview source changed:\n${JSON.stringify(preview)}`)
        assert(
          Number.parseFloat(preview.opacity) >= 0.99,
          `Image preview did not finish opening:\n${JSON.stringify(preview)}`
        )
        assert.equal(preview.visibility, 'visible', `Image preview is not visible:\n${JSON.stringify(preview)}`)
        assert(preview.closeLabel, `Image preview close button lost its label:\n${JSON.stringify(preview)}`)
        assert(
          preview.rect?.width > 0 && preview.rect?.height > 0,
          `Image preview collapsed:\n${JSON.stringify(preview)}`
        )
        if (previewIndex === 0) {
          await page.screenshot({
            path: join(
              screenshotDir,
              `${format}-${workerMode ? 'worker' : 'main-thread'}-lightbox.png`
            ),
            fullPage: true
          })
        }
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          const root = host?.shadowRoot || document
          const lightbox = root.querySelector('.excel-image-lightbox')
          return lightbox?.getAttribute('data-open') === 'false' &&
            lightbox?.getAttribute('aria-hidden') === 'true'
        }, undefined, { timeout })
        previewResults.push(preview)
      }

      results.push({
        format,
        privateSample,
        tiffSample,
        mode: workerMode ? 'worker' : 'main-thread',
        images: result.images.map((image) => ({ id: image.id, rect: image.rect })),
        previews: previewResults,
        viewport: result.viewportRect,
        workerRequests: workerRequests.length
      })
      await page.close()
    }
  }

  console.log(
    `[spreadsheet] GitHub #178 embedded images survived XLS/XLSX parser, TIFF decoding, main-thread, and Worker rendering: ${JSON.stringify({ parserResults, results })}`
  )
} finally {
  await browser?.close().catch(() => undefined)
  await new Promise(resolve => staticServer?.close(resolve) || resolve())
  await rm(harnessRoot, { recursive: true, force: true })
}
