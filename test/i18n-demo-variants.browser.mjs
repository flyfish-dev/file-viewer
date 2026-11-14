import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(join(root, 'package.json'))
const { chromium } = require('playwright')
const { FILE_VIEWER_SUPPORTED_LOCALES, FILE_VIEWER_BUILTIN_MESSAGES } = await import(
  pathToFileURL(join(root, 'packages/core/dist/index.js')).href
)
const browser = await chromium.launch({ headless: true })
const report = []
try {
  for (const variant of ['compare', 'pure-web']) {
    const page = await browser.newPage()
    if (variant === 'compare') {
      await page.goto((process.env.I18N_DEMO_URL || 'http://127.0.0.1:5184') + '/compare.html?locale=en-US&left=/example/pic.png&right=/example/pic.png')
      await page.locator('.image-frame img').nth(1).waitFor({ timeout: 60000 })
    } else {
      await page.goto((process.env.I18N_PURE_WEB_URL || 'http://127.0.0.1:5185') + '/?locale=en-US')
      await page.locator('#file-input').setInputFiles(join(root, 'apps/viewer-demo/public/example/pic.png'))
      await page.locator('.image-frame img').waitFor({ timeout: 60000 })
    }
    const images = page.locator('.image-frame img')
    await images.evaluateAll(nodes => { window.retainedVariantImages = nodes.map(node => ({ node, src: node.src })) })
    await page.context().setOffline(true)
    for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
      if (variant === 'compare') {
        await page.locator('.compare-locale-trigger').click()
        await page.locator(`[data-locale="${locale}"]`).click()
      } else await page.locator('#locale-select').selectOption(locale)
      await page.waitForFunction(locale => document.documentElement.lang === locale, locale)
      await page.waitForTimeout(75)
      assert(await images.evaluateAll(nodes => nodes.length === window.retainedVariantImages.length && nodes.every((node, index) => node === window.retainedVariantImages[index].node && node.src === window.retainedVariantImages[index].src)))
      const labels = await page.locator('.image-toolbar button:last-child').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
      assert.deepEqual(labels, Array(variant === 'compare' ? 2 : 1).fill(FILE_VIEWER_BUILTIN_MESSAGES[locale]['image.toolbar.rotateRight']))
    }
    report.push({ variant, languages: FILE_VIEWER_SUPPORTED_LOCALES, retainedImages: await images.count(), offline: true })
    await page.close()
    console.log(`[i18n-demo-variants] PASS ${variant}`)
  }
  const output = join(root, '.release/i18n-20261110/demo-variants')
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'CURRENT.json'), JSON.stringify(report, null, 2) + '\n')
} finally {
  await browser.close()
}
