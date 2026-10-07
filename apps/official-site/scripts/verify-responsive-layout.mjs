import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, webkit } from 'playwright'
import { preview } from 'vite'

const siteRoot = fileURLToPath(new URL('..', import.meta.url))
const externalUrl = process.env.OFFICIAL_SITE_LAYOUT_BASE_URL
const screenshotDir = process.env.OFFICIAL_SITE_LAYOUT_SCREENSHOTS
const widths = [320, 390, 768, 1024, 1280, 1920, 2560, 3440]
const server = externalUrl
  ? null
  : await preview({
      root: siteRoot,
      configFile: false,
      preview: { host: '127.0.0.1', port: 0 }
    })
const baseUrl = externalUrl || `http://127.0.0.1:${server.httpServer.address().port}`
if (screenshotDir) await mkdir(screenshotDir, { recursive: true })

async function assertLayout(page, label) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)))
  const result = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect()
    const shell = box('.site-shell')
    const solutions = box('#solutions')
    const ecosystem = box('#ecosystem')
    const headerCopy = box('.quickstart-header > div')
    const headerTitle = box('.quickstart-header strong')
    const contained = [
      ...document.querySelectorAll(
        '.workflow-grid, #solutions, #ecosystem, .quickstart-workbench, .quickstart-tab, .format-family, #resources'
      )
    ]
      .filter((element) => {
        const bounds = element.getBoundingClientRect()
        return bounds.left < shell.left - 1 || bounds.right > shell.right + 1
      })
      .map((element) => element.className)
    return {
      contained,
      headerEmptySpace: headerCopy.bottom - headerTitle.bottom,
      separated: solutions.right <= ecosystem.left - 16 || solutions.bottom <= ecosystem.top - 16,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      tabs: [...document.querySelectorAll('.quickstart-tab')].map((element) => ({
        visible: getComputedStyle(element).opacity === '1',
        height: element.getBoundingClientRect().height
      })),
      visiblePanels: document.querySelectorAll('.quickstart-panel:not([aria-hidden="true"])').length
    }
  })
  assert.deepEqual(result.contained, [], `${label}: content escapes its page column`)
  assert.ok(result.headerEmptySpace <= 2, `${label}: example header has artificial empty space`)
  assert.ok(result.separated, `${label}: use cases and code examples overlap`)
  assert.ok(!result.pageOverflow, `${label}: page scrolls horizontally`)
  assert.equal(result.tabs.length, 10, `${label}: all framework examples remain available`)
  assert.ok(
    result.tabs.every((tab) => tab.visible && tab.height >= 44),
    `${label}: tabs must stay visible and usable`
  )
  assert.equal(result.visiblePanels, 1, `${label}: exactly one example is displayed`)
}

try {
  for (const [engineName, engine] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    const browser = await engine.launch({ headless: true })
    try {
      for (const locale of ['en-US', 'zh-CN']) {
        const context = await browser.newContext({ locale, reducedMotion: 'reduce' })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        // Embedded products have their own gates; keep host scripts intact, including SRI.
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url())
          if (
            url.origin === new URL(baseUrl).origin ||
            route.request().resourceType() !== 'document'
          ) {
            return route.continue()
          }
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<!doctype html><title>Embed</title>'
          })
        })
        await page.goto(new URL(locale === 'en-US' ? '/en/' : '/', baseUrl).href)
        await page.locator('#ecosystem').waitFor()
        for (const width of widths) {
          await page.setViewportSize({ width, height: width < 600 ? 844 : 1200 })
          await page.locator('#ecosystem').scrollIntoViewIfNeeded()
          const label = `${engineName}/${locale}/${width}`
          await assertLayout(page, label)
          if (width === 390 || width === 2560) {
            for (const tab of await page.locator('.quickstart-tab').all()) {
              await tab.click()
              const panelId = await tab.getAttribute('aria-controls')
              assert.equal(
                await page.locator(`#${panelId}`).isVisible(),
                true,
                `${label}: selected example is hidden`
              )
              await assertLayout(page, label)
            }
            await page.locator('.quickstart-tab').first().focus()
            await page.keyboard.press('End')
            assert.equal(
              await page
                .locator('.quickstart-tab')
                .last()
                .evaluate((element) => element === document.activeElement),
              true
            )
            await page.keyboard.press('Home')
            assert.equal(
              await page.locator('.quickstart-tab').first().getAttribute('aria-selected'),
              'true'
            )
            if (screenshotDir) {
              await page.locator('.workflow-grid').screenshot({
                path: resolve(screenshotDir, `${engineName}-${locale}-${width}.png`)
              })
            }
          }
        }
        await page.setViewportSize({ width: 1280, height: 1200 })
        await page.locator('.theme-toggle').click()
        await assertLayout(page, `${engineName}/${locale}/dark`)
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%'
        })
        await assertLayout(page, `${engineName}/${locale}/200-percent-text`)
        assert.deepEqual(errors, [], `${engineName}/${locale}: page errors`)
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }
  console.log(
    '[site-responsive] Chromium/WebKit passed at 320-3440px, both languages, dark theme, 200% text, and all 10 examples.'
  )
} finally {
  if (server) await new Promise((done) => server.httpServer.close(done))
}
