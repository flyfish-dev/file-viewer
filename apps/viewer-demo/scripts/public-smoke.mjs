import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const distDir = resolve(process.env.FILE_VIEWER_PUBLIC_SMOKE_DIST || 'apps/viewer-demo/dist')
const timeout = Number(process.env.FILE_VIEWER_PUBLIC_SMOKE_TIMEOUT || 45_000)
const entryPath = join(distDir, 'index.html')
const require = createRequire(import.meta.url)

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (originalError) {
    const candidatePaths = process.env.PATH
      ?.split(delimiter)
      .filter(pathEntry => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map(binDir => resolve(binDir, '..'))
      .filter(pathEntry => existsSync(pathEntry)) || []

    for (const candidatePath of candidatePaths) {
      try {
        const playwrightEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(playwrightEntry).href)
      } catch {
        // Keep probing package roots injected by npm exec / npx.
      }
    }

    throw new Error(
      `Missing playwright module. ${
        originalError instanceof Error ? originalError.message : String(originalError)
      }`,
      { cause: originalError }
    )
  }
}

const playwrightModule = await importPlaywright()
const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default

if (!existsSync(entryPath)) {
  throw new Error(`Built demo is missing: ${entryPath}. Run pnpm build first.`)
}

const html = readFileSync(entryPath, 'utf8')
for (const expected of [
  '<html lang="en">',
  '<title>File Viewer Demo — Office, PDF &amp; CAD in Your Browser</title>',
  '<link rel="canonical" href="https://demo.file-viewer.app/">',
  '<meta property="og:locale" content="en_US">',
  '<meta name="twitter:card" content="summary_large_image">'
]) {
  if (!html.includes(expected)) {
    throw new Error(`Built demo metadata is missing ${expected}`)
  }
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  const cleanPath = decodeURIComponent(requestUrl.pathname)
  const candidate = cleanPath === '/'
    ? entryPath
    : join(distDir, normalize(cleanPath).replace(/^[/\\]+/, ''))
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 }, locale: 'en-US' })
  const errors = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  await page.goto(`${baseUrl}/?lang=en&smoke=public-ci-controls`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await page.locator('.rail-nav-button--samples').click()
  await page.waitForSelector('.sample-picker.open .sample-menu', { timeout })

  const desktopPicker = await page.evaluate(() => {
    const picker = document.querySelector('.sample-picker.open')
    const menu = document.querySelector('.sample-menu')
    const panel = document.querySelector('.panel-body')
    const firstCard = menu?.querySelector('.sample-card')
    if (
      !(picker instanceof HTMLElement) ||
      !(menu instanceof HTMLElement) ||
      !(panel instanceof HTMLElement) ||
      !(firstCard instanceof HTMLElement)
    ) return null
    const panelRect = panel.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const cardRect = firstCard.getBoundingClientRect()
    const hitTarget = document.elementFromPoint(
      cardRect.left + Math.min(cardRect.width / 2, 24),
      cardRect.top + Math.min(cardRect.height / 2, 24)
    )
    return {
      visible: menuRect.width > 240 && menuRect.height > 200,
      panelInside: panelRect.left >= -1 && panelRect.right <= innerWidth + 1 && panelRect.top >= -1 && panelRect.bottom <= innerHeight + 1,
      cardInteractive: hitTarget instanceof Node && firstCard.contains(hitTarget)
    }
  })
  if (!desktopPicker?.visible || !desktopPicker.panelInside || !desktopPicker.cardInteractive) {
    throw new Error(`Desktop sample picker interaction failed: ${JSON.stringify(desktopPicker)}`)
  }

  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.mobile-more-trigger').click()
  await page.waitForSelector('.mobile-action-panel', { timeout })
  await page.locator('.mobile-action-source-grid button[aria-label="Open sample files"]').click()
  await page.waitForSelector('.mobile-controls-open .sample-picker.open .sample-menu', { timeout })
  await page.waitForTimeout(400)

  const mobileLayout = await page.evaluate(() => {
    const panel = document.querySelector('.control-panel')
    const menu = document.querySelector('.sample-menu')
    if (!(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) return null
    const panelRect = panel.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      panelRect: { top: panelRect.top, right: panelRect.right, bottom: panelRect.bottom, left: panelRect.left },
      menuRect: { top: menuRect.top, right: menuRect.right, bottom: menuRect.bottom, left: menuRect.left },
      panelInside: panelRect.left >= -1 && panelRect.right <= innerWidth + 1 && panelRect.top >= -1 && panelRect.bottom <= innerHeight + 1,
      menuInside: menuRect.left >= panelRect.left - 1 && menuRect.right <= panelRect.right + 1 && menuRect.top >= panelRect.top - 1 && menuRect.bottom <= panelRect.bottom + 1,
      scrollable: menu.scrollHeight > menu.clientHeight && menu.clientHeight >= 180
    }
  })
  if (!mobileLayout || mobileLayout.documentWidth > mobileLayout.viewportWidth + 2 || !mobileLayout.panelInside || !mobileLayout.menuInside || !mobileLayout.scrollable) {
    throw new Error(`Mobile sample picker layout failed: ${JSON.stringify(mobileLayout)}`)
  }

  await page.keyboard.press('Escape')
  await page.locator('.viewer-locale-trigger').click()
  await page.locator('.viewer-locale-menu').waitFor({ state: 'visible', timeout })
  const mobileLocaleMenu = await page.locator('.viewer-locale-menu').evaluate(element => {
    const rect = element.getBoundingClientRect()
    return {
      optionCount: element.querySelectorAll('.viewer-locale-option').length,
      insideViewport: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1
    }
  })
  if (mobileLocaleMenu.optionCount !== 4 || !mobileLocaleMenu.insideViewport) {
    throw new Error(`Mobile locale menu layout failed: ${JSON.stringify(mobileLocaleMenu)}`)
  }
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto(`${baseUrl}/?lang=en&url=/example/en/markdown.md&smoke=public-ci-markdown`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await page.waitForSelector('.markdown-body', { timeout })
  const nativeSearchInput = page.locator('.viewer-search-input').first()
  await nativeSearchInput.waitFor({ state: 'visible', timeout })
  await nativeSearchInput.fill('Markdown')
  await nativeSearchInput.press('Enter')
  await page.locator('.flyfish-search-match--active').first().waitFor({ state: 'visible', timeout })
  const searchCounter = (await page.locator('.viewer-search-count').first().textContent())?.trim() || ''
  if (!/^[1-9]\d*\/\d+$/.test(searchCounter)) {
    throw new Error(`Native toolbar search did not report matches: ${searchCounter}`)
  }
  await page.locator('[part~="search-next-button"]').first().click()
  await page.locator('[part~="search-previous-button"]').first().click()
  await page.locator('[part~="search-clear-button"]').first().click()
  await page.waitForTimeout(100)
  if (await page.locator('.flyfish-search-match').count()) {
    throw new Error('Native toolbar search did not clear document highlights.')
  }

  await page.goto(`${baseUrl}/?lang=en&smoke=public-ci-locale-menu`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })

  const localeCases = [
    ['zh-CN', 'zh-CN'],
    ['en-US', 'en-US'],
    ['de-DE', 'de-DE'],
    ['ja-JP', 'ja-JP']
  ]
  for (const [locale, documentLocale] of localeCases) {
    await page.locator('.viewer-locale-trigger').click()
    await page.locator('.viewer-locale-menu').waitFor({ state: 'visible', timeout })
    const localeOptionCount = await page.locator('.viewer-locale-option').count()
    if (localeOptionCount !== 4) {
      throw new Error(`Expected four locale options, got ${localeOptionCount}.`)
    }
    await page.locator(`.viewer-locale-option[data-locale="${locale}"]`).click()
    await page.waitForFunction(expected => document.documentElement.lang === expected, documentLocale)
    await page.locator('.viewer-locale-menu').waitFor({ state: 'detached', timeout })
  }

  await page.locator('.viewer-locale-trigger').click()
  await page.locator('.viewer-locale-menu').waitFor({ state: 'visible', timeout })
  const japaneseActive = await page.locator('.viewer-locale-option[data-locale="ja-JP"]')
    .getAttribute('aria-checked')
  await page.locator('.viewer-locale-trigger').click()
  if (japaneseActive !== 'true') {
    throw new Error('Japanese locale option is not marked as selected.')
  }

  await page.locator('.rail-nav-button--samples').click()
  await page.waitForSelector('.sample-picker.open .sample-menu', { timeout })

  const japaneseUi = await page.evaluate(() => {
    const localeGroup = document.querySelector('.viewer-locale-switch')
    const sampleNames = Array.from(document.querySelectorAll('.sample-menu .sample-card strong'))
      .map(element => element.textContent?.trim())
    return {
      documentLocale: document.documentElement.lang,
      pageTitle: document.title,
      triggerLabel: localeGroup?.querySelector('.viewer-locale-trigger')?.getAttribute('aria-label'),
      localizedSample: sampleNames.includes('DOCX リッチ文書')
    }
  })
  if (
    japaneseUi.documentLocale !== 'ja-JP' ||
    japaneseUi.pageTitle !== 'File Viewer Demo — Office・PDF・CADをブラウザで表示' ||
    japaneseUi.triggerLabel !== '言語: 日本語' ||
    !japaneseUi.localizedSample
  ) {
    throw new Error(`Japanese demo UI failed: ${JSON.stringify(japaneseUi)}`)
  }

  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto(`${baseUrl}/compare.html?lang=en&smoke=public-ci-compare-locale-menu`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.compare-page', { timeout })
  await page.locator('.compare-locale-trigger').click()
  await page.locator('.compare-locale-menu').waitFor({ state: 'visible', timeout })

  const compareLocaleMenu = await page.locator('.compare-locale-menu').evaluate(element => {
    const rect = element.getBoundingClientRect()
    const triggerIcon = document.querySelector('.compare-locale-trigger svg')
    return {
      optionCount: element.querySelectorAll('.compare-locale-option').length,
      insideViewport: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1,
      usesGlobeIcon: triggerIcon?.classList.contains('lucide-globe') === true,
      usesEarthIcon: triggerIcon?.classList.contains('lucide-earth') === true
    }
  })
  if (
    compareLocaleMenu.optionCount !== 4 ||
    !compareLocaleMenu.insideViewport ||
    !compareLocaleMenu.usesGlobeIcon ||
    compareLocaleMenu.usesEarthIcon
  ) {
    throw new Error(`Compare locale menu contract failed: ${JSON.stringify(compareLocaleMenu)}`)
  }

  await page.locator('.compare-locale-option[data-locale="ja-JP"]').click()
  await page.waitForFunction(() => document.documentElement.lang === 'ja-JP')
  await page.locator('.compare-locale-menu').waitFor({ state: 'detached', timeout })
  const compareTriggerLabel = await page.locator('.compare-locale-trigger').getAttribute('aria-label')
  if (compareTriggerLabel !== '言語: 日本語') {
    throw new Error(`Compare locale trigger label is not localized: ${compareTriggerLabel}`)
  }

  await page.locator('.compare-locale-trigger').focus()
  await page.keyboard.press('ArrowDown')
  await page.locator('.compare-locale-menu').waitFor({ state: 'visible', timeout })
  await page.keyboard.press('Escape')
  await page.locator('.compare-locale-menu').waitFor({ state: 'detached', timeout })
  if (!(await page.locator('.compare-locale-trigger').evaluate(element => element === document.activeElement))) {
    throw new Error('Compare locale menu did not restore trigger focus after Escape.')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.compare-locale-trigger').click()
  await page.locator('.compare-locale-menu').waitFor({ state: 'visible', timeout })
  const compareMobileLocaleMenu = await page.locator('.compare-locale-menu').evaluate(element => {
    const rect = element.getBoundingClientRect()
    return {
      optionCount: element.querySelectorAll('.compare-locale-option').length,
      insideViewport: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    }
  })
  if (
    compareMobileLocaleMenu.optionCount !== 4 ||
    !compareMobileLocaleMenu.insideViewport ||
    compareMobileLocaleMenu.documentWidth > compareMobileLocaleMenu.viewportWidth + 2
  ) {
    throw new Error(`Mobile compare locale menu layout failed: ${JSON.stringify(compareMobileLocaleMenu)}`)
  }
  await page.keyboard.press('Escape')

  const actionableErrors = errors.filter(message => !/favicon|ResizeObserver loop/i.test(message))
  if (actionableErrors.length) {
    throw new Error(`Browser console errors:\n${actionableErrors.join('\n')}`)
  }

  console.log('[public-browser-smoke] Main and compare four-language globe menus, English Markdown, native toolbar search, Japanese UI, metadata, desktop picker and 390px mobile layout verified.')
} finally {
  await browser?.close()
  await new Promise(resolveClose => server.close(resolveClose))
}
