import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const root = resolve(import.meta.dirname, '..')
const require = createRequire(join(root, 'package.json'))
const { chromium } = require('playwright')
const { FILE_VIEWER_SUPPORTED_LOCALES, FILE_VIEWER_BUILTIN_MESSAGES } = await import(
  pathToFileURL(join(root, 'packages/core/dist/index.js')).href
)
const output = join(root, '.release/i18n-20261110/demo')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(
    (process.env.I18N_DEMO_URL || 'http://127.0.0.1:5179/') + '?locale=en-US&welcome=0'
  )
  await page.locator('.viewer-file-identity').hover()
  await page.getByRole('button', { name: 'Upload from device', exact: true }).click()
  await page
    .locator('input[type="file"]')
    .setInputFiles(join(root, 'apps/viewer-demo/public/example/pic.png'))
  const image = page.locator('.image-frame img').first()
  await image.waitFor({ timeout: 60000 })
  await image.evaluate((node) => {
    window.retainedImage = node
    window.retainedSource = node.src
  })
  await page.locator('.image-toolbar button').last().click()
  await page.context().setOffline(true)
  for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
    await page.locator('.viewer-locale-trigger').click()
    await page.locator(`[data-locale="${locale}"]`).click()
    await page.waitForFunction((locale) => document.documentElement.lang === locale, locale)
    await page.waitForFunction((label) => {
      const visit = (root) =>
        root.querySelector('.image-toolbar button:last-child') ||
        (root.shadowRoot && visit(root.shadowRoot)) ||
        [...root.querySelectorAll('*')]
          .filter((node) => node.shadowRoot)
          .map((node) => visit(node.shadowRoot))
          .find(Boolean)
      return visit(document)?.getAttribute('aria-label') === label
    }, FILE_VIEWER_BUILTIN_MESSAGES[locale]['image.toolbar.rotateRight'])
    assert(
      await image.evaluate(
        (node) => node === window.retainedImage && node.src === window.retainedSource
      )
    )
    assert.equal(await page.locator('.image-rotation-meter').textContent(), '90°')
    report.push({ locale, retainedLocalFile: true, rotation: 90 })
  }
  await page.locator('.viewer-locale-trigger').focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.documentElement.lang), FILE_VIEWER_SUPPORTED_LOCALES.at(-1))
  for (const locale of ['de-DE', 'ru-RU', 'zh-TW', 'zh-HK']) {
    await page.locator('.viewer-locale-trigger').click()
    await page.locator(`[data-locale="${locale}"]`).click()
    for (const narrow of [false, true]) {
      await page.setViewportSize(
        narrow ? { width: 390, height: 844 } : { width: 1280, height: 900 }
      )
      await page.emulateMedia({ colorScheme: narrow ? 'dark' : 'light' })
      await page.screenshot({
        path: join(output, `${locale}-${narrow ? 'narrow-dark' : 'wide'}.png`)
      })
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${locale}: page overflow`
      )
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '200%'
  })
  await page.screenshot({ path: join(output, 'zh-HK-200-percent.png') })
  assert.deepEqual(errors, [])
  await writeFile(
    join(output, 'CURRENT.json'),
    JSON.stringify({ browserVersion: browser.version(), report, errors }, null, 2) + '\n'
  )
  console.log(
    `[i18n-demo] PASS ${report.length} languages; local image, rotation, narrow/dark/200% screenshots`
  )
} finally {
  await browser.close()
}
