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
const output = join(root, '.release/i18n-20261110/workbook')
await mkdir(output, { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  let sourceRequests = 0
  let workers = 0
  const errors = []
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/example/excel.xlsx') sourceRequests++
  })
  page.on('worker', () => workers++)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto((process.env.I18N_DEMO_URL || 'http://127.0.0.1:5179/') + '?locale=en-US&welcome=0&sample=/example/excel.xlsx')
  const tabs = page.locator('.excel-wrapper .sheet-tab')
  await tabs.nth(1).waitFor({ timeout: 60000 })
  await tabs.nth(1).click()
  const activeName = await page.locator('.sheet-tab.active').textContent()
  const grid = page.locator('.excel-wrapper').first()
  await grid.evaluate(node => { window.retainedWorkbook = node })
  await page.waitForFunction(() => {
    const visit = root => root.querySelector('.excel-wrapper .summary') || [...root.querySelectorAll('*')].map(node => node.shadowRoot && visit(node.shadowRoot)).find(Boolean)
    return Boolean(visit(document)?.textContent)
  })
  const sourceCount = sourceRequests
  const workerCount = workers
  await page.locator('.viewer-file-identity').hover()
  await page.context().setOffline(true)
  for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
    await page.locator('.viewer-locale-trigger').click()
    await page.locator(`[data-locale="${locale}"]`).click()
    await page.waitForFunction(locale => document.documentElement.lang === locale, locale)
    await page.waitForTimeout(50)
    const summary = await page.locator('.excel-wrapper .summary').textContent()
    const template = FILE_VIEWER_BUILTIN_MESSAGES[locale]['spreadsheet.state.rowsAndColumns']
    const expected = new RegExp('^' + template.split(/\{(?:rows|cols)\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\d\\s.,]+') + '$')
    assert.match(summary, expected, `${locale}: stale workbook summary`)
    assert.equal(await page.locator('.sheet-tab.active').textContent(), activeName)
    assert.equal(await grid.evaluate(node => node === window.retainedWorkbook), true)
    assert.equal(sourceRequests, sourceCount)
    assert.equal(workers, workerCount)
    report.push({ locale, activeName, summary, sourceRequests, workers })
  }
  assert.deepEqual(errors, [])
  await writeFile(join(output, 'CURRENT.json'), JSON.stringify(report, null, 2) + '\n')
  console.log('[i18n-workbook] PASS retained sheet, model, Worker and source across seven languages offline')
} finally {
  await browser.close()
}
