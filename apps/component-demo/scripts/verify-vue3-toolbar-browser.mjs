import assert from 'node:assert/strict'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { verifyZoomToolbarBrowser } from './verify-zoom-toolbar-browser.mjs'

// The verifier runs from the repository root in local and public CI.
const distDir = resolve('apps/component-demo/dist')
const entryPath = join(distDir, 'vue3.html')
const timeout = Number(process.env.FILE_VIEWER_VUE3_TOOLBAR_TIMEOUT || 45_000)
const require = createRequire(import.meta.url)

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (originalError) {
    const candidatePaths =
      process.env.PATH?.split(delimiter)
        .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
        .map((binDir) => resolve(binDir, '..'))
        .filter((pathEntry) => existsSync(pathEntry)) || []

    for (const candidatePath of candidatePaths) {
      try {
        const playwrightEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(playwrightEntry).href)
      } catch {
        // Keep probing package roots injected by npm exec / npx.
      }
    }

    throw new Error(
      `Missing playwright module. Run this verifier through pnpm verify:vue3-toolbar-browser. ${
        originalError instanceof Error ? originalError.message : String(originalError)
      }`,
      { cause: originalError }
    )
  }
}

const playwrightModule = await importPlaywright()
const { chromium, webkit } = playwrightModule.chromium ? playwrightModule : playwrightModule.default

if (!existsSync(entryPath)) {
  throw new Error(
    `Built Vue 3 component demo is missing: ${entryPath}. Run pnpm build:component-demo first.`
  )
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  const cleanPath = decodeURIComponent(requestUrl.pathname)
  const candidate =
    cleanPath === '/' ? entryPath : join(distDir, normalize(cleanPath).replace(/^[/\\]+/, ''))
  const filePath = existsSync(candidate) && statSync(candidate).isFile() ? candidate : entryPath
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  })
  createReadStream(filePath).pipe(response)
})

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen)
  server.listen(0, '127.0.0.1', resolveListen)
})

const address = server.address()
const baseUrl = `http://127.0.0.1:${address.port}`
let browser

try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(`${baseUrl}/vue3.html?smoke=toolbar-slots`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.locator('.markdown-body').waitFor({ state: 'visible', timeout })
  const startSlot = page.getByTestId('vue3-toolbar-start')
  const endSlot = page.getByTestId('vue3-toolbar-end')
  const nativeSearch = page.locator('.viewer-search-input')
  await startSlot.waitFor({ state: 'visible', timeout })
  await endSlot.waitFor({ state: 'visible', timeout })
  await nativeSearch.waitFor({ state: 'visible', timeout })

  const shadowContract = await page.evaluate(() => {
    const host = document.querySelector('#vue3-viewer .file-viewer-vue3-shadow-host')
    const root = host?.shadowRoot
    const toolbar = root?.querySelector('.viewer-actions')
    return {
      hasOpenShadowRoot: !!root,
      childOrder: Array.from(toolbar?.children || []).map((element) => {
        if (element.querySelector('[data-testid="vue3-toolbar-start"]')) return 'start'
        if (element.classList.contains('viewer-search-actions')) return 'search'
        if (element.querySelector('[data-testid="vue3-toolbar-end"]')) return 'end'
        return 'other'
      })
    }
  })
  assert.equal(
    shadowContract.hasOpenShadowRoot,
    true,
    'The default Vue 3 integration must use its open Shadow DOM path.'
  )
  assert.deepEqual(
    shadowContract.childOrder,
    ['start', 'search', 'end'],
    'toolbar-start and toolbar-end must wrap the built-in search group in Shadow DOM.'
  )
  assert.equal(
    await startSlot.getAttribute('data-api-search'),
    'true',
    'toolbar-start did not receive the public API.'
  )
  assert.equal(
    await endSlot.getAttribute('data-api-search'),
    'true',
    'toolbar-end did not receive the public API.'
  )
  assert.equal(
    await startSlot.getAttribute('data-download-available'),
    'true',
    'Slot availability did not update after render.'
  )
  assert.ok(
    Number(await startSlot.getAttribute('data-zoom-scale')) > 0,
    'Slot zoom state is invalid.'
  )

  await startSlot.click()
  await page.locator('.flyfish-search-match--active').first().waitFor({ state: 'visible', timeout })
  await page.waitForFunction(
    () => {
      const button = document
        .querySelector('#vue3-viewer .file-viewer-vue3-shadow-host')
        ?.shadowRoot?.querySelector('[data-testid="vue3-toolbar-start"]')
      return Number(button?.getAttribute('data-search-total') || 0) > 0
    },
    undefined,
    { timeout }
  )
  await endSlot.click()
  assert.equal(
    await page.evaluate(() => document.body.dataset.vue3ToolbarEndClicked),
    'true',
    'toolbar-end did not preserve its event handler through the full and Shadow DOM wrappers.'
  )

  await page.goto(`${baseUrl}/vue3.html?smoke=search-boundary`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.locator('.content img').first().waitFor({ state: 'visible', timeout })
  assert.equal(
    await page.locator('.viewer-search-input').count(),
    0,
    'A renderer with search:false must not expose the native Vue 3 search input.'
  )
  assert.equal(
    await page.locator('.viewer-actions').count(),
    0,
    'A search-only toolbar must be absent when the active renderer cannot search.'
  )

  const actionableErrors = errors.filter((message) => !/favicon|ResizeObserver loop/i.test(message))
  assert.deepEqual(actionableErrors, [], `Browser console errors:\n${actionableErrors.join('\n')}`)
  globalThis.__fileViewerPrepackObserveOwnerComplete?.({ engine: 'chromium', phase: 'original-main-toolbar',
    caseIds: ['main-toolbar-shadow-slots', 'main-toolbar-reactive-slot-api', 'main-toolbar-renderer-bounded-search'] })

  console.log(
    '[verify-vue3-toolbar-browser] Vue 3 full, Shadow DOM slots, reactive slot API and renderer-bounded search verified.'
  )
  await verifyZoomToolbarBrowser({ browser, baseUrl, engine: 'chromium' })
  const webkitBrowser = await webkit.launch({ headless: true })
  try {
    await verifyZoomToolbarBrowser({ browser: webkitBrowser, baseUrl, engine: 'webkit' })
  } finally {
    await webkitBrowser.close()
  }
} finally {
  await browser?.close()
  await new Promise((resolveClose) => server.close(resolveClose))
}
