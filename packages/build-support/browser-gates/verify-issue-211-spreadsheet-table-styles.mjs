// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion, recordBrowserGateFixture } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EXPECTED_SAMPLE_SHA256 = '266b000849658668604e44fc321cde9c765cb709eceaf14a7c80bedb2569bceb'
const EXPECTED_COLORS = {
  header: [91, 155, 213],
  firstStripe: [189, 215, 238],
  secondStripe: [222, 235, 247]
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../../..')
const samplePath = resolve(
  process.env.FILE_VIEWER_ISSUE_211_SAMPLE ||
    join(sourceRoot, 'test/fixtures/issue-211/table-style.xlsx')
)
const screenshotTemplatePath = resolve(
  process.env.FILE_VIEWER_ISSUE_211_SCREENSHOT ||
    join(sourceRoot, 'output/playwright/issue-211/vue3-table-style.png')
)
const timeout = Number(process.env.FILE_VIEWER_ISSUE_211_TIMEOUT || 45_000)
const browserNames = String(process.env.FILE_VIEWER_ISSUE_211_BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const require = createRequire(import.meta.url)

assert(existsSync(samplePath), `Issue #211 sample is missing: ${samplePath}`)
assert.equal(
  createHash('sha256')
    .update(await readFile(samplePath))
    .digest('hex'),
  EXPECTED_SAMPLE_SHA256,
  'Issue #211 browser verification must use the immutable reporter attachment.'
)
// BEGIN PREPACK COMPLETION OBSERVATION
if (process.env.FILE_VIEWER_PREPACK_TRACE_DIR) {
  await recordBrowserGateFixture('issue-211-spreadsheet-table-styles', 'test/fixtures/issue-211/table-style.xlsx', await readFile(samplePath))
}
// END PREPACK COMPLETION OBSERVATION

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
        const entry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(entry).href)
      } catch {
        // Continue probing npm-exec injected package roots.
      }
    }

    throw new Error(
      [
        'Missing playwright module.',
        'Run with: npm exec --yes --package playwright@1.61.1 -- node scripts/verify-issue-211-spreadsheet-table-styles.mjs',
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      ].join('\n')
    )
  }
}

const launchBrowser = async (browserType, browserName) => {
  try {
    return await browserType.launch({ headless: true })
  } catch (error) {
    if (browserName === 'chromium') {
      try {
        return await browserType.launch({ channel: 'chrome', headless: true })
      } catch {
        // Preserve the original Playwright error because it points at the missing bundled browser.
      }
    }
    throw error
  }
}

const screenshotPathForBrowser = (browserName) => {
  if (screenshotTemplatePath.includes('{browser}')) {
    return screenshotTemplatePath.replaceAll('{browser}', browserName)
  }
  const configuredExtension = extname(screenshotTemplatePath)
  const stem = configuredExtension
    ? screenshotTemplatePath.slice(0, -configuredExtension.length)
    : screenshotTemplatePath
  return `${stem}-${browserName}${configuredExtension || '.png'}`
}

const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-issue-211-'))
const packageRequire = createRequire(join(sourceRoot, 'packages/components/vue3/package.json'))
const viteEntry = packageRequire.resolve('vite')
const vuePluginEntry = packageRequire.resolve('@vitejs/plugin-vue')
const vueEntry = packageRequire.resolve('vue/dist/vue.esm-bundler.js')
const vue3Entry = join(sourceRoot, 'packages/components/vue3/src/package/index.ts')
const coreEntry = join(sourceRoot, 'packages/core/src/index.ts')
const coreBrowserEntry = join(sourceRoot, 'packages/core/src/browser.ts')
const spreadsheetEntry = join(sourceRoot, 'packages/renderers/spreadsheet/src/index.ts')
const spreadsheetWorkerEntry = join(
  sourceRoot,
  'packages/renderers/spreadsheet/dist/worker/sheet.worker.js'
)
const { build: viteBuild } = await import(pathToFileURL(viteEntry).href)
const { default: vue } = await import(pathToFileURL(vuePluginEntry).href)
const playwrightModule = await importPlaywright()
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default

assert(browserNames.length > 0, 'At least one issue #211 browser engine is required.')
browserNames.forEach((browserName) => {
  assert(
    ['chromium', 'firefox', 'webkit'].includes(browserName),
    `Unsupported issue #211 browser: ${browserName}`
  )
  assert(playwright[browserName], `Playwright did not expose ${browserName}.`)
})
assert(
  existsSync(spreadsheetWorkerEntry),
  'Build the spreadsheet Worker before running issue #211 browser verification.'
)

const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:," />
    <title>Issue 211 spreadsheet table styles</title>
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

const main = `import { createApp, defineComponent, h } from 'vue'
import { FileViewer } from '@issue211/vue3'
import { spreadsheetRenderer } from '@issue211/spreadsheet'

const resources = {
  workersCreated: 0,
  activeWorkers: 0,
  objectUrlsCreated: 0,
  activeObjectUrls: 0
}
const activeObjectUrls = new Set()
const NativeWorker = window.Worker
window.Worker = class Issue211TrackingWorker extends NativeWorker {
  constructor(...args) {
    super(...args)
    resources.workersCreated += 1
    resources.activeWorkers += 1
    this.issue211Terminated = false
  }
  terminate() {
    if (!this.issue211Terminated) {
      this.issue211Terminated = true
      resources.activeWorkers -= 1
    }
    return super.terminate()
  }
}
const nativeCreateObjectURL = URL.createObjectURL.bind(URL)
const nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL)
URL.createObjectURL = value => {
  const url = nativeCreateObjectURL(value)
  resources.objectUrlsCreated += 1
  activeObjectUrls.add(url)
  resources.activeObjectUrls = activeObjectUrls.size
  return url
}
URL.revokeObjectURL = url => {
  activeObjectUrls.delete(String(url))
  resources.activeObjectUrls = activeObjectUrls.size
  return nativeRevokeObjectURL(url)
}

const state = window.__ISSUE_211_STATE__ = { status: 'starting', error: '', resources }
const viewerPreset = {
  id: 'issue-211-table-styles',
  label: 'Issue 211 table styles',
  renderers: [spreadsheetRenderer]
}

try {
  const response = await fetch('/sample.xlsx')
  if (!response.ok) throw new Error('Unable to load the local XLSX sample: ' + response.status)
  const file = new File([await response.arrayBuffer()], 'github-211-table-style.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const App = defineComponent({
    render() {
      return h('div', { class: 'file-preview-page' }, [
        h(FileViewer, {
          file,
          options: {
            preset: viewerPreset,
            rendererMode: 'extend',
            theme: 'light',
            spreadsheet: {
              worker: true,
              workerUrl: '/sheet.worker.js',
              resizableColumns: true
            },
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
  window.__ISSUE_211_DISPOSE__ = () => {
    app.unmount()
    state.status = 'unmounted'
  }
} catch (error) {
  state.status = 'error'
  state.error = error instanceof Error ? error.stack || error.message : String(error)
}
`

const waitForTableColors = (page) =>
  page.waitForFunction(
    (expectedColors) => {
      const host = document.querySelector('.file-viewer-vue3-shadow-host')
      const root = host?.shadowRoot || document
      const canvases = [...root.querySelectorAll('canvas')]
      if (!canvases.length) return false
      const matches = Object.fromEntries(Object.keys(expectedColors).map((key) => [key, 0]))
      for (const canvas of canvases) {
        const context = canvas.getContext('2d')
        if (!context || !canvas.width || !canvas.height) continue
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        for (let offset = 0; offset < pixels.length; offset += 4) {
          for (const [key, [red, green, blue]] of Object.entries(expectedColors)) {
            if (
              pixels[offset] === red &&
              pixels[offset + 1] === green &&
              pixels[offset + 2] === blue
            ) {
              matches[key] += 1
            }
          }
        }
      }
      return Object.values(matches).every((count) => count > 500)
    },
    EXPECTED_COLORS,
    { timeout }
  )

const collectRenderResult = (page) =>
  page.evaluate((expectedColors) => {
    const host = document.querySelector('.file-viewer-vue3-shadow-host')
    const root = host?.shadowRoot || document
    const canvases = [...root.querySelectorAll('canvas')]
    const matches = Object.fromEntries(Object.keys(expectedColors).map((key) => [key, 0]))
    for (const canvas of canvases) {
      const context = canvas.getContext('2d')
      if (!context || !canvas.width || !canvas.height) continue
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      for (let offset = 0; offset < pixels.length; offset += 4) {
        for (const [key, [red, green, blue]] of Object.entries(expectedColors)) {
          if (
            pixels[offset] === red &&
            pixels[offset + 1] === green &&
            pixels[offset + 2] === blue
          ) {
            matches[key] += 1
          }
        }
      }
    }
    return {
      state: window.__ISSUE_211_STATE__,
      hasShadow: !!host?.shadowRoot,
      tabs: [...root.querySelectorAll('.sheet-tab')].map((tab) => tab.textContent?.trim() || ''),
      canvasCount: canvases.length,
      colors: matches
    }
  }, EXPECTED_COLORS)

const findResizeBoundary = async (page, expectedX, radius = 12) => {
  const stage = page.locator('.e-virt-table-stage')
  const box = await stage.boundingBox()
  assert(box, 'Issue #211 spreadsheet stage has no browser layout box.')
  const y = box.y + Math.min(20, Math.max(8, box.height / 2))
  for (let offset = -radius; offset <= radius; offset += 1) {
    const relativeX = expectedX + offset
    await page.mouse.move(box.x + relativeX, y)
    const cursor = await stage.evaluate((element) => element.style.cursor)
    if (cursor === 'col-resize') {
      return { box, relativeX, y }
    }
  }
  return null
}

const assertRenderResult = (result, browserName, stage, pageErrors, consoleErrors) => {
  const diagnostics = JSON.stringify({ result, pageErrors, consoleErrors }, null, 2)
  assert.equal(
    result.state.status,
    'mounted',
    `[${browserName}/${stage}] Issue #211 viewer failed:\n${diagnostics}`
  )
  assert.deepEqual(
    pageErrors,
    [],
    `[${browserName}/${stage}] Issue #211 page errors:\n${diagnostics}`
  )
  assert.deepEqual(
    consoleErrors,
    [],
    `[${browserName}/${stage}] Issue #211 console errors:\n${diagnostics}`
  )
  assert.equal(
    result.hasShadow,
    true,
    `[${browserName}/${stage}] Issue #211 did not exercise Vue 3 ShadowRoot:\n${diagnostics}`
  )
  assert.deepEqual(
    result.tabs,
    ['Sheet1', '试算'],
    `[${browserName}/${stage}] Issue #211 worksheet tabs changed:\n${diagnostics}`
  )
  assert(
    result.canvasCount > 0,
    `[${browserName}/${stage}] Issue #211 spreadsheet canvas is missing:\n${diagnostics}`
  )
  Object.entries(result.colors).forEach(([name, count]) => {
    assert(
      count > 500,
      `[${browserName}/${stage}] Issue #211 ${name} fill was not painted:\n${diagnostics}`
    )
  })
}

await Promise.all([
  writeFile(join(harnessRoot, 'index.html'), html),
  writeFile(join(harnessRoot, 'main.js'), main),
  ...browserNames.map((browserName) =>
    mkdir(dirname(screenshotPathForBrowser(browserName)), { recursive: true })
  )
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
          '@issue211/vue3': vue3Entry,
          '@issue211/spreadsheet': spreadsheetEntry,
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
  await copyFile(samplePath, join(distRoot, 'sample.xlsx'))
  await copyFile(spreadsheetWorkerEntry, join(distRoot, 'sheet.worker.js'))

  const contentTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'application/javascript; charset=utf-8'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  ])
  staticServer = createHttpServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
      const relativePath =
        requestUrl.pathname === '/'
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
  assert(address && typeof address !== 'string', 'Issue #211 harness did not bind a TCP port.')
  for (const browserName of browserNames) {
    browser = await launchBrowser(playwright[browserName], browserName)
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const pageErrors = []
    const consoleErrors = []
    const externalRequests = []
    const localOrigin = `http://127.0.0.1:${address.port}`
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('request', (request) => {
      if (!request.url().startsWith(localOrigin) && !request.url().startsWith('data:')) {
        externalRequests.push(request.url())
      }
    })

    try {
      await page.goto(localOrigin, {
        waitUntil: 'domcontentloaded',
        timeout
      })
      await page.waitForFunction(
        () => ['mounted', 'error'].includes(window.__ISSUE_211_STATE__?.status),
        undefined,
        { timeout }
      )
      await waitForTableColors(page)

      const initialResult = await collectRenderResult(page)
      assertRenderResult(initialResult, browserName, 'initial', pageErrors, consoleErrors)
      assert(
        initialResult.state.resources.workersCreated >= 1,
        `[${browserName}] Issue #211 did not use the real spreadsheet Worker.`
      )
      assert.equal(
        initialResult.state.resources.activeWorkers,
        1,
        `[${browserName}] Issue #211 spreadsheet Worker was not active after render.`
      )

      // Fixture widths are pinned to 68px for the row index and 52px for column A.
      const initialBoundary = await findResizeBoundary(page, 120)
      assert(initialBoundary, `[${browserName}] Issue #211 column-A resize handle is unavailable.`)
      const resizeDelta = 40
      await page.mouse.move(initialBoundary.box.x + initialBoundary.relativeX, initialBoundary.y)
      await page.mouse.down()
      await page.mouse.move(
        initialBoundary.box.x + initialBoundary.relativeX + resizeDelta,
        initialBoundary.y,
        { steps: 8 }
      )
      await page.mouse.up()

      const resizedBoundary = await findResizeBoundary(
        page,
        initialBoundary.relativeX + resizeDelta
      )
      assert(
        resizedBoundary,
        `[${browserName}] Issue #211 column-A resize did not update its handle.`
      )
      assert(
        resizedBoundary.relativeX - initialBoundary.relativeX >= 32,
        `[${browserName}] Issue #211 column-A resize delta was not retained.`
      )
      assert.equal(
        await findResizeBoundary(page, initialBoundary.relativeX, 6),
        null,
        `[${browserName}] Issue #211 column-A old resize boundary remained active.`
      )
      await waitForTableColors(page)
      assertRenderResult(
        await collectRenderResult(page),
        browserName,
        'after-resize',
        pageErrors,
        consoleErrors
      )

      const secondSheet = page.getByRole('button', { name: '试算', exact: true })
      await secondSheet.click()
      await page.waitForFunction(
        () => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          return (
            host?.shadowRoot?.querySelector('.sheet-tab.active')?.textContent?.trim() === '试算'
          )
        },
        undefined,
        { timeout }
      )
      const firstSheet = page.getByRole('button', { name: 'Sheet1', exact: true })
      await firstSheet.click()
      await page.waitForFunction(
        () => {
          const host = document.querySelector('.file-viewer-vue3-shadow-host')
          return (
            host?.shadowRoot?.querySelector('.sheet-tab.active')?.textContent?.trim() === 'Sheet1'
          )
        },
        undefined,
        { timeout }
      )
      await waitForTableColors(page)
      const restoredBoundary = await findResizeBoundary(page, resizedBoundary.relativeX)
      assert(
        restoredBoundary,
        `[${browserName}] Issue #211 column-A width reset after switching sheets.`
      )
      assert(
        Math.abs(restoredBoundary.relativeX - resizedBoundary.relativeX) <= 4,
        `[${browserName}] Issue #211 column-A width changed after restoring the first sheet.`
      )

      const finalResult = await collectRenderResult(page)
      assertRenderResult(finalResult, browserName, 'restored', pageErrors, consoleErrors)
      assert.deepEqual(
        externalRequests,
        [],
        `[${browserName}] Issue #211 issued external requests.`
      )
      const screenshotPath = screenshotPathForBrowser(browserName)
      await page.screenshot({ path: screenshotPath, fullPage: true })

      await page.evaluate(() => window.__ISSUE_211_DISPOSE__?.())
      await page.waitForFunction(
        () => {
          const state = window.__ISSUE_211_STATE__
          return (
            state?.status === 'unmounted' &&
            state.resources.activeWorkers === 0 &&
            state.resources.activeObjectUrls === 0
          )
        },
        undefined,
        { timeout }
      )
      const cleanup = await page.evaluate(() => window.__ISSUE_211_STATE__.resources)
      assert.equal(
        cleanup.activeWorkers,
        0,
        `[${browserName}] Issue #211 leaked a spreadsheet Worker.`
      )
      assert.equal(cleanup.activeObjectUrls, 0, `[${browserName}] Issue #211 leaked an Object URL.`)
      assert.deepEqual(
        pageErrors,
        [],
        `[${browserName}/cleanup] Issue #211 page errors:\n${pageErrors.join('\n')}`
      )
      assert.deepEqual(
        consoleErrors,
        [],
        `[${browserName}/cleanup] Issue #211 console errors:\n${consoleErrors.join('\n')}`
      )

      console.log(
        `[issue-211] ${browserName} rendered ${JSON.stringify(finalResult.colors)}, resized column A by ${resizedBoundary.relativeX - initialBoundary.relativeX}px, and released ${cleanup.workersCreated} Worker(s); screenshot=${screenshotPath}`
      )
      // BEGIN PREPACK COMPLETION OBSERVATION
      await recordBrowserGateCompletion({ gateId: 'issue-211-spreadsheet-table-styles', engine: browserName, phase: 'full',
        caseIds: ['reporter-table-colors-and-layout', 'column-resize', 'worker-and-object-url-cleanup'], fixtures: ['issue-211-reporter-xlsx'],
        summary: { verifiedSampleSha256: EXPECTED_SAMPLE_SHA256, colors: finalResult.colors, resizeDelta: resizedBoundary.relativeX - initialBoundary.relativeX, activeWorkers: cleanup.activeWorkers, activeObjectUrls: cleanup.activeObjectUrls } })
      // END PREPACK COMPLETION OBSERVATION
    } finally {
      await page.close().catch(() => undefined)
      await browser.close().catch(() => undefined)
      browser = undefined
    }
  }
} finally {
  await browser?.close().catch(() => undefined)
  if (staticServer) await new Promise((resolve) => staticServer.close(resolve))
  await rm(harnessRoot, { recursive: true, force: true })
}
