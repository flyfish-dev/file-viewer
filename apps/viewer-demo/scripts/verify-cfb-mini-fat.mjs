import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startRegressionDemo } from './regression-demo-server.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = resolve(root, 'output/cfb-mini-fat')
const require = createRequire(resolve(root, 'packages/renderers/spreadsheet/package.json'))
const XLSX = require('styled-exceljs')
const rows = Array.from({ length: 800 }, (_, index) => [`MINIFAT_ROW_${index}`, index * 7])
const book = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Data')
const original = Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'biff8' }))
const directory = (original.readUInt32LE(48) + 1) * 512
const unused = Buffer.from(original)
unused[directory + 128 + 66] = 0
unused.writeUInt32LE(0, directory + 128 + 120)
unused.writeInt32LE(-2, directory + 116)
unused.writeUInt32LE(0, directory + 120)
unused.writeInt32LE(0x7fffffff, 60)
// Extra unallocated sectors do not change the live Workbook bytes. The larger
// input exercises the same file through the Demo's automatic Worker threshold.
const padded = Buffer.concat([unused, Buffer.alloc(512 * 1024)])
let playwright
for (const path of [root, ...(process.env.PATH || '').split(delimiter).filter(p => p.endsWith(`${sep}node_modules${sep}.bin`)).map(p => resolve(p, '..'))]) {
  try { playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [path] })).href); break } catch {}
}
assert.ok(playwright, 'Run with npm exec --package playwright')
await mkdir(output, { recursive: true })
const browser = await (playwright.chromium || playwright.default.chromium).launch({ headless: true })
const demo = await startRegressionDemo(root)
const { origin } = demo
const report = []
try {
  for (const worker of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
    page.setDefaultTimeout(30000)
    const errors = []
    const workers = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('worker', item => workers.push(item.url()))
    try {
      await page.goto(`${origin}/?locale=en-US`)
      await page.locator('[data-viewer-action="more"]').click()
      await page.locator('[data-viewer-action="settings"]').click()
      await page.locator('#viewer-settings-tab-formats').click()
      await page.locator('.settings-panel select').first().selectOption('sheet')
      await page.locator('.settings-panel input[min="0.25"]').fill(worker ? '0.25' : '64')
      await page.locator('.settings-apply').click()
      await page.locator('.viewer-file-identity').hover()
      await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click()
      const bytes = worker ? padded : unused
      await page.locator('.desktop-upload-dropzone input[type="file"]').setInputFiles({ name: 'unused-minifat.xls', mimeType: 'application/octet-stream', buffer: bytes })
      await page.locator('.e-virt-table-container').waitFor({ state: 'visible' })
      await page.keyboard.press('Control+f')
      const input = page.locator('.viewer-search-popover input')
      for (const index of [0, 799]) {
        const text = `MINIFAT_ROW_${index}`
        await input.fill(text)
        await input.press('Enter')
        await page.locator(`[data-spreadsheet-search="active"][data-spreadsheet-row="${index}"][data-spreadsheet-col="0"]`).waitFor({ state: 'visible' })
        assert.equal(await page.locator('.viewer-search-summary').textContent(), '1/1')
      }
      const sheetWorkers = workers.filter(url => url.includes('sheet.worker'))
      assert.equal(sheetWorkers.length > 0, worker, 'The parser path did not match the selected threshold')
      assert.deepEqual(errors, [])
      await page.screenshot({ path: resolve(output, `${worker ? 'worker' : 'main'}-last-row.png`) })
      report.push({ worker, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), sheetWorkers, lastRow: 799, passed: true })
    } catch (error) {
      await page.screenshot({ path: resolve(output, `${worker ? 'worker' : 'main'}-failure.png`) })
      console.error(await page.locator('body').innerText(), errors)
      throw error
    } finally { await page.close() }
  }
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ origin, synthetic: true, originalIssue227FileAvailable: false, report }, null, 2))
  await browser.close()
  await demo.close()
}
console.log('Unused MiniFAT XLS opens and searches the last row in main-thread and actual Worker modes.')
