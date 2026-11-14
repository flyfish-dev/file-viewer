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
const output = join(root, '.release/i18n-20261110/nested-email')
await mkdir(output, { recursive: true })
try {
  const page = await browser.newPage()
  await page.goto((process.env.I18N_COMPONENT_DEMO_URL || 'http://127.0.0.1:5183') + '/react-email.html?locale=en-US')
  for (const id of ['react-standard', 'react-full', 'react-legacy-standard', 'react-legacy-full']) {
    const card = page.locator('#' + id)
    await card.locator('.attachment-item').filter({ hasText: 'contract.pdf' }).click()
    await card.locator('.pdfViewer canvas').first().waitFor({ timeout: 60000 })
    await card.locator('.pdfViewer').evaluate(node => { node.dataset.retainedNestedPdf = 'true' })
  }
  const snapshot = () => page.evaluate(() => window.__FILE_VIEWER_REACT_EMAIL_DEMO__.snapshot())
  const before = await snapshot()
  await page.context().setOffline(true)
  const report = []
  for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
    await page.locator('[data-demo-language]').selectOption(locale)
    await page.waitForTimeout(100)
    const labels = await page.locator('.pdf-scale-button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
    assert.deepEqual(labels, Array(4).fill(FILE_VIEWER_BUILTIN_MESSAGES[locale]['pdf.toolbar.fitWidth']))
    assert.equal(await page.locator('[data-retained-nested-pdf]').count(), 4)
    const after = await snapshot()
    assert.equal(after.activeWorkers, before.activeWorkers)
    assert.equal(after.activeObjectUrls, before.activeObjectUrls)
    assert.deepEqual(after.events, before.events)
    assert.deepEqual(after.errors, [])
    report.push({ locale, labels, workers: after.activeWorkers, objectUrls: after.activeObjectUrls })
  }
  await page.evaluate(() => window.__FILE_VIEWER_REACT_EMAIL_DEMO__.unmount())
  await page.waitForTimeout(200)
  const disposed = await snapshot()
  assert.equal(disposed.activeWorkers, 0)
  assert.equal(disposed.activeObjectUrls, 0)
  await writeFile(join(output, 'CURRENT.json'), JSON.stringify({ report, disposed }, null, 2) + '\n')
  console.log('[i18n-nested] PASS four React email integrations; retained nested PDFs and clean disposal')
} finally {
  await browser.close()
}
