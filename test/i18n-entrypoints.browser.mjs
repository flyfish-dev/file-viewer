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
const base = process.env.I18N_COMPONENT_DEMO_URL || 'http://127.0.0.1:5183'
const output = join(root, '.release/i18n-20261110/entrypoints')
await mkdir(output, { recursive: true })
const report = []
const browser = await chromium.launch({ headless: true })
try {
  for (const entry of ['manual-js.html', 'manual-iife.html', 'requirejs.html']) {
    const page = await browser.newPage()
    let sourceRequests = 0
    const errors = []
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/example/')) sourceRequests++
    })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/${entry}?locale=en-US&url=/example/pic.png`)
    const surface = page.locator('.image-frame img, .pdfViewer').first()
    await surface.waitFor({ timeout: 60000 })
    await page.waitForFunction(() => document.body.dataset.viewerStatus === 'load-complete')
    if (entry === 'requirejs.html') {
      await page.locator('.pdfViewer canvas').first().waitFor({ timeout: 60000 })
      await page.waitForLoadState('networkidle')
    }
    await surface.evaluate(node => { window.retainedLanguageSurface = node })
    const initialRequests = sourceRequests
    await page.context().setOffline(true)
    for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
      await page.locator('[data-demo-language]').selectOption(locale)
      await page.getByRole('button', {
        name: FILE_VIEWER_BUILTIN_MESSAGES[locale]['toolbar.download'], exact: true
      }).first().waitFor()
      assert.equal(await surface.evaluate(node => node === window.retainedLanguageSurface), true, `${entry}/${locale}: rebuilt document`)
      assert.equal(sourceRequests, initialRequests, `${entry}/${locale}: downloaded source`)
      assert.equal(new URL(page.url()).searchParams.get('locale'), locale)
    }
    assert.deepEqual(errors, [], entry)
    report.push({ entry, locales: FILE_VIEWER_SUPPORTED_LOCALES, sourceRequests, offline: true })
    await page.screenshot({ path: join(output, entry + '.png') })
    await page.close()
    console.log(`[i18n-entrypoints] PASS ${entry}`)
  }
  await writeFile(join(output, 'CURRENT.json'), JSON.stringify(report, null, 2) + '\n')
} finally {
  await browser.close()
}
