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
    const lines = await surface.evaluate(element => ['2.4', '5.1', '5.2'].map(prefix => {
      const paragraph = [...element.querySelectorAll('p')].find(node => node.textContent.startsWith(prefix))
      if (!paragraph) throw new Error(`Missing contract paragraph ${prefix}`)
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
      let longest = null
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!longest || node.length > longest.length) longest = node
      }
      const range = document.createRange()
      range.selectNodeContents(longest)
      const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0)
      const style = getComputedStyle(longest.parentElement)
      const context = document.createElement('canvas').getContext('2d')
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText(longest.textContent)
      const scale = element.getBoundingClientRect().width / element.offsetWidth
      const advance = Math.min(...rects.slice(1).map((rect, index) => rect.top - rects[index].top))
      const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
      const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      return {
        prefix, lineHeight: paragraph.style.lineHeight, fontFamily: style.fontFamily,
        count: rects.length, advance, scale, fontHeight, inkHeight,
        minimumFontGap: advance - fontHeight * scale,
        minimumInkGap: advance - inkHeight * scale,
        selectionBoxGap: Math.min(...rects.slice(1).map((rect, index) => rect.top - rects[index].bottom))
      }
    }))
    for (const line of lines) {
      assert(line.count > 1, `${line.prefix}: exercise actual wrapping, not a one-line surrogate`)
      // WebKit selection rectangles include fractional padding beyond the font extents.
      assert(line.minimumFontGap >= -0.25, `${line.prefix}: line advance loses ${-line.minimumFontGap}px of font metrics`)
      assert(line.minimumInkGap >= -0.25, `${line.prefix}: adjacent glyphs overlap by ${-line.minimumInkGap}px`)
      assert.equal(line.lineHeight, 'normal', `${line.prefix}: single spacing must retain font leading`)
      assert.match(line.fontFamily, /宋体/, `${line.prefix}: preserve the document's Chinese font`)
    }
    const name = `issue-236-sales-contract-${width}`
    await page.screenshot({ path: resolve(output, `${name}-first-page.png`) })
    await surface.getByText('60.7', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, `${name}-table.png`) })
    evidence.cases.push({ name, sha256: hash, input: 'native-file-upload', rows: snapshot.tables.map(t => t.rows.length), revisions: 0, lines, passed: true })
    console.log(`[sales-contract] ${width}px: original upload, four tables, non-overlapping body lines and no invented revision marks passed`)
  }
  const sample = await page.request.get(`${origin}/example/word-wps-contract.doc`)
  assert.equal(sample.status(), 200, 'the visible Demo sample must ship with its original file')
  assert.equal(createHash('sha256').update(await sample.body()).digest('hex'), hash)
  for (const locale of ['en', 'zh-CN']) {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${origin}/?lang=${locale}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.viewer-file-identity').hover()
    await page.locator('.rail-nav-button--samples').click()
    const toggle = page.locator('.sample-trigger')
    if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
    const group = page.locator('.sample-group[data-family="word"] .sample-group-header')
    if (await group.getAttribute('aria-expanded') === 'false') await group.click()
    const response = page.waitForResponse(response => new URL(response.url()).pathname === '/example/word-wps-contract.doc')
    await page.locator('.sample-card').filter({ hasText: 'word-wps-contract.doc' }).click()
    assert.equal(createHash('sha256').update(await (await response).body()).digest('hex'), hash)
    await page.locator('.msdoc-root').getByText('60.7', { exact: true }).waitFor({ timeout: 60_000 })
    const name = `issue-236-sample-${locale}`
    await page.screenshot({ path: resolve(output, `${name}.png`) })
    evidence.cases.push({ name, input: 'visible-sample-picker', sha256: hash, passed: true })
  }
}
