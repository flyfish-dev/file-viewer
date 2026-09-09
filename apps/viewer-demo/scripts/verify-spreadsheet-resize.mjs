import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startRegressionDemo } from './regression-demo-server.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const require = createRequire(import.meta.url)
const XLSX = createRequire(resolve(root, 'packages/renderers/spreadsheet/package.json'))('styled-exceljs')
let playwright
for (const path of [root, ...(process.env.PATH || '').split(delimiter).filter(p => p.endsWith(`${sep}node_modules${sep}.bin`)).map(p => resolve(p, '..'))]) {
  try { playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [path] })).href); break } catch {}
}
assert.ok(playwright, 'Run with npm exec --package playwright')
const output = resolve(root, 'output/spreadsheet-resize')
await mkdir(output, { recursive: true })
const demo = await startRegressionDemo(root)
const browser = await (playwright.chromium || playwright.default.chromium).launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
page.setDefaultTimeout(60_000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
const report = { origin: demo.origin, cases: [], errors }

async function hitRect() {
  const hit = page.locator('[data-spreadsheet-search="active"]').first()
  await hit.waitFor({ state: 'visible' })
  let previous
  let stable = 0
  for (let attempt = 0; attempt < 100; attempt++) {
    const rect = await hit.boundingBox()
    if (rect && previous && ['x', 'y', 'width', 'height'].every(key => Math.abs(rect[key] - previous[key]) < 0.5)) {
      if (++stable === 3) return rect
    } else stable = 0
    previous = rect
    await page.waitForTimeout(50)
  }
  throw new Error('Search highlight did not settle after the table redraw')
}

async function findMarker() {
  await page.keyboard.press('Control+f')
  const input = page.locator('.viewer-search-popover input')
  await input.fill('RESIZE_NEEDLE')
  await input.press('Enter')
  return hitRect()
}

async function dragBoundary(rect, delta, enabled = true) {
  const canvas = await page.locator('.e-virt-table-canvas').boundingBox()
  // Empty header overlay containers can be hidden: the header is canvas-painted.
  const headerHeight = await page.locator('.e-virt-table-overlayer-header').evaluate(el => parseFloat(el.style.height))
  assert.ok(canvas && headerHeight > 0)
  const x = rect.x + rect.width
  const y = canvas.y + headerHeight / 2
  await page.mouse.move(x, y)
  const cursor = await page.locator('.e-virt-table-stage').evaluate(el => el.style.cursor)
  if (enabled) assert.equal(cursor, 'col-resize', 'The actual column boundary is not draggable')
  else assert.notEqual(cursor, 'col-resize', 'Disabled column resizing remains active')
  await page.mouse.down()
  await page.mouse.move(x + delta, y, { steps: 12 })
  await page.mouse.up()
}

try {
  const book = XLSX.utils.book_new()
  for (const name of ['First', 'Second']) {
    const sheet = XLSX.utils.aoa_to_sheet([['A', 'B', 'C'], [name === 'First' ? 'RESIZE_NEEDLE' : 'Second sheet', 'Adjacent cell', 'Last cell']])
    sheet['!cols'] = [{ wpx: 240 }, { wpx: 240 }, { wpx: 240 }]
    XLSX.utils.book_append_sheet(book, sheet, name)
  }
  const bytes = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })
  await page.goto(`${demo.origin}/?locale=en-US`)
  await page.locator('.viewer-file-identity').hover()
  await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click()
  await page.locator('.desktop-upload-dropzone input[type="file"]').setInputFiles({ name: 'resize.xlsx', mimeType: 'application/octet-stream', buffer: bytes })
  await page.locator('.e-virt-table-canvas').waitFor({ state: 'visible' })
  assert.equal(await page.locator('.demo-recent-files').count(), 0, 'History opens over worksheet tabs without a user request')
  await page.getByRole('button', { name: 'Show recently opened', exact: true }).click()
  await page.locator('.demo-recent-files').waitFor({ state: 'visible' })
  await page.locator('.demo-recent-files__close').click()
  const before = await findMarker()
  await dragBoundary(before, 80)
  // Clicking the header dismisses search. Query again to measure the new cell,
  // rather than waiting for the dismissed highlight to remain attached.
  const after = await findMarker()
  assert.ok(after.width > before.width + 60, 'Column width did not retain the pointer drag')
  await page.locator('.sheet-tab').filter({ hasText: /^Second$/ }).click()
  await page.locator('.sheet-tab').filter({ hasText: /^First$/ }).click()
  const restored = await findMarker()
  assert.ok(Math.abs(restored.width - after.width) < 2, 'Column width reverted after changing sheets')
  const zoomBefore = parseFloat(await page.locator('[data-demo-zoom-action="reset"]').innerText())
  await page.locator('[data-demo-zoom-action="in"]').click()
  const zoomed = await findMarker()
  const zoomAfter = parseFloat(await page.locator('[data-demo-zoom-action="reset"]').innerText())
  report.measurements = { before, after, restored, zoomed, zoomBefore, zoomAfter }
  console.log(JSON.stringify(report.measurements))
  assert.ok(zoomAfter > zoomBefore)
  assert.ok(Math.abs(zoomed.width / restored.width - zoomAfter / zoomBefore) < 0.02, 'Zoom did not retain the resized base width')
  await dragBoundary(zoomed, 66)
  const zoomedDrag = await findMarker()
  assert.ok(Math.abs(zoomedDrag.width - zoomed.width - 66) < 2, 'Dragging at a non-unit zoom used the wrong coordinate scale')
  await page.locator('[data-demo-zoom-action="out"]').click()
  const roundTrip = await findMarker()
  assert.ok(Math.abs(roundTrip.width - zoomedDrag.width * zoomBefore / zoomAfter) < 2, 'Zoom round trip reverted the column width')
  await page.locator('.sheet-tab').filter({ hasText: /^Second$/ }).click()
  await page.locator('.sheet-tab').filter({ hasText: /^First$/ }).click()
  const restoredAfterZoom = await findMarker()
  assert.ok(Math.abs(restoredAfterZoom.width - roundTrip.width) < 2, 'Sheet switching lost the width dragged at a non-unit zoom')
  await page.screenshot({ path: resolve(output, 'resized.png') })
  report.cases.push({ name: 'drag-sheet-and-zoom-restore', before, after, restored, zoomed, zoomedDrag, roundTrip, restoredAfterZoom, zoomBefore, zoomAfter, passed: true })

  await page.locator('[data-viewer-action="more"]').click()
  await page.locator('[data-viewer-action="settings"]').click()
  await page.locator('#viewer-settings-tab-formats').click()
  await page.locator('.settings-panel select').first().selectOption('sheet')
  const toggle = page.getByRole('button', { name: 'Resizable columns', exact: true })
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true')
  await toggle.click()
  await page.locator('.settings-apply').click()
  await page.locator('.e-virt-table-canvas').waitFor({ state: 'visible' })
  const disabledBefore = await findMarker()
  await dragBoundary(disabledBefore, 80, false)
  const disabledAfter = await findMarker()
  assert.ok(Math.abs(disabledBefore.width - disabledAfter.width) < 2, 'Disabled resizing changed the column')
  report.cases.push({ name: 'disabled-option', before: disabledBefore, after: disabledAfter, passed: true })
  assert.deepEqual(errors, [])
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') })
  throw error
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  await browser.close()
  await demo.close()
}
console.log('Spreadsheet column drag, sheet-state persistence and disabled option passed.')
