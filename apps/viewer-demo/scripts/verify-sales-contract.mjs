import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export async function verifySalesContract({ page, origin, output, evidence }) {
  const bytes = await readFile(resolve(root, 'packages/renderers/doc/test/fixtures/github-236-wps-save.doc'))
  const hash = createHash('sha256').update(bytes).digest('hex')
  assert.equal(hash, 'f32be88d56214c8ceb36e6037c8889f6e70b96ceb9fb56992c80664dad1888ae')
  await mkdir(output, { recursive: true })
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    await page.locator('.viewer-file-identity').hover()
    await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click()
    await page.locator('.desktop-upload-dropzone input[type=file]').setInputFiles({
      name: 'sales-contract.doc', mimeType: 'application/msword', buffer: bytes
    })
    const surface = page.locator('.msdoc-root').first()
    await surface.getByText('60.7', { exact: true }).waitFor({ timeout: 60_000 })
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => document.fonts.ready)
    const snapshot = await surface.evaluate(element => ({
      marks: element.querySelectorAll('del,ins').length,
      tables: [...element.querySelectorAll('table')].map(table => ({
        rows: [...table.rows].map(row => [...row.cells].filter(cell => getComputedStyle(cell).display !== 'none').map(cell => cell.textContent.trim())),
        widths: [...table.rows].flatMap(row => [...row.cells].filter(cell => getComputedStyle(cell).display !== 'none').map(cell => cell.getBoundingClientRect().width)),
        rowspans: [...table.querySelectorAll('[rowspan]')].map(cell => cell.rowSpan)
      }))
    }))
    // Word reports zero revisions in both identical public uploads; do not invent deletion marks.
    assert.equal(snapshot.marks, 0)
    assert.deepEqual(snapshot.tables.map(table => table.rows.length), [3, 8, 6, 8])
    const indicators = snapshot.tables[2]
    assert.deepEqual(indicators.rows, [
      ['化学成分', 'FE', '60.7'], ['SIO2', '4.85'], ['AL2O3', '2.54'],
      ['P', '0.105'], ['S', '0.018'], ['水分', 'H2O', '8.5']
    ])
    assert(indicators.rowspans.includes(5))
    assert(snapshot.tables[1].rows.every(row => row.length === 2))
    assert(snapshot.tables[3].rows.every(row => row.length === 2))
    assert(snapshot.tables.every(table => table.widths.every(value => value > 0)))
    const name = `issue-236-sales-contract-${width}`
    await page.screenshot({ path: resolve(output, `${name}-first-page.png`) })
    await surface.getByText('60.7', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, `${name}-table.png`) })
    evidence.cases.push({ name, sha256: hash, input: 'native-file-upload', rows: snapshot.tables.map(t => t.rows.length), revisions: 0, passed: true })
    console.log(`[sales-contract] ${width}px: original upload, four tables and no invented revision marks passed`)
  }
}
