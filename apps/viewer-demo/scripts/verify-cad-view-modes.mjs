import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { startRegressionDemo } from './regression-demo-server.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = resolve(root, 'output/cad-view-modes')
const require = createRequire(import.meta.url)
let playwright
for (const path of [root, ...(process.env.PATH || '').split(delimiter).filter(p => p.endsWith(`${sep}node_modules${sep}.bin`)).map(p => resolve(p, '..'))]) {
  try { playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [path] })).href); break } catch {}
}
assert.ok(playwright, 'Run this check with npm exec --package playwright')
await mkdir(output, { recursive: true })
const browser = await (playwright.chromium || playwright.default.chromium).launch({ headless: true })
const demo = await startRegressionDemo(root)
const { origin } = demo
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
await page.context().addInitScript(() => {
  window.print = () => { window.__regressionPrintRequested = true }
})
page.setDefaultTimeout(90000)
const report = []
const errors = []
page.on('pageerror', error => errors.push(error.message))

async function pixels(bytes) {
  return page.evaluate(async base64 => {
    const raw = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([raw], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let dark = 0, white = 0, colored = 0, black = 0, visible = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (r < 20 && g < 20 && b < 25) dark++
      if (r > 248 && g > 248 && b > 248) white++
      if (r < 30 && g < 30 && b < 30) black++
      if (Math.max(r, g, b) > 45) visible++
      if (Math.max(r, g, b) - Math.min(r, g, b) > 35) colored++
    }
    return { dark, white, colored, black, visible, total: canvas.width * canvas.height }
  }, bytes.toString('base64'))
}

async function snapshot(name) {
  const surface = await page.locator('.cad-native-stage.is-active').count()
    ? page.locator('.cad-native-stage.is-active .dwfv-stage')
    : page.locator('.cad-stage')
  const data = await surface.screenshot({
    animations: 'disabled',
    style: '.viewer-toolbar, .viewer-status-dock, .settings-notice, .demo-recent-files { visibility: hidden !important; }',
  })
  await writeFile(resolve(output, `${name}.png`), data)
  return pixels(data)
}

async function openFile(name, bytes) {
  await page.goto(`${origin}/?locale=en-US`)
  await page.locator('.viewer-file-identity').hover()
  await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click()
  await page.locator('.desktop-upload-dropzone input[type="file"]').setInputFiles({ name, mimeType: 'application/octet-stream', buffer: bytes })
  await page.locator('.cad-color-mode:not([disabled])').waitFor({ state: 'visible' })
}

try {
  const lines = [0, 'SECTION', 2, 'ENTITIES']
  for (const [color, y] of [[1, 0], [3, 40], [5, 80]]) {
    lines.push(0, 'LINE', 8, '0', 62, color, 10, 0, 20, y, 30, 0, 11, 100, 21, y + 15, 31, 0)
  }
  lines.push(0, 'ENDSEC', 0, 'EOF')
  const drawings = [
    ...['webgl', 'canvas2d'].map(backend => ({ backend, name: 'palette.dxf', bytes: Buffer.from(lines.join('\n') + '\n') })),
    { backend: 'dwf-native', name: 'blocks_and_tables.dwf', bytes: await readFile(resolve(root, 'apps/viewer-demo/public/example/samples/apache/blocks_and_tables.dwf')) },
    { backend: 'dwfx-native', name: 'house.dwfx', bytes: await readFile(resolve(root, 'apps/viewer-demo/public/example/samples/autodesk/house.dwfx')) },
  ]
  for (const { backend, name, bytes } of drawings) {
    if (process.env.CAD_VIEW_MODES && !process.env.CAD_VIEW_MODES.split(',').includes(backend)) continue
    await openFile(name, bytes)
    if (!backend.endsWith('-native')) {
    await page.locator('[data-viewer-action="more"]').click()
    await page.locator('[data-viewer-action="settings"]').click()
    await page.locator('#viewer-settings-tab-formats').click()
    await page.locator('.settings-panel select').first().selectOption('cad')
    await page.locator('.settings-panel select').filter({ has: page.locator('option[value="canvas2d"]') }).selectOption(backend)
    await page.locator('.settings-apply').click()
    await page.locator('.cad-color-mode:not([disabled])').waitFor({ state: 'visible' })
    } else {
      await page.locator('.cad-native-stage.is-active').waitFor({ state: 'visible' })
    }
    const source = await snapshot(`${backend}-source`)
    console.log(backend, 'source', source)
    assert.ok(source.dark > source.total * 0.6, `Expected dark CAD background: ${JSON.stringify(source)}`)
    // The actual house FixedPage is black-and-white, unlike the colored DWF
    // and synthetic DXF. Require readable source vectors, not invented hues.
    if (backend === 'dwfx-native') assert.ok(source.visible > 1500, `Black XPS vectors disappeared on the dark background: ${JSON.stringify(source)}`)
    else assert.ok(source.colored > 500, `Authored colored lines were lost: ${JSON.stringify(source)}`)
    await page.locator('.cad-color-mode').click()
    const monochrome = await snapshot(`${backend}-monochrome`)
    console.log(backend, 'monochrome', monochrome)
    assert.ok(monochrome.white > monochrome.total * 0.6 && monochrome.black > 100 && monochrome.colored === 0, `Expected white paper and black vectors: ${JSON.stringify(monochrome)}`)
    await page.locator('[data-viewer-action="more"]').click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'HTML', exact: true }).click()
    const download = await downloadPromise
    const exported = resolve(output, `${backend}-monochrome.html`)
    await download.saveAs(exported)
    const html = await readFile(exported, 'utf8')
    const images = [...html.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)]
    assert.ok(images.length, 'CAD export omitted the rendered canvas')
    const exportedPixels = await Promise.all(images.map(match => pixels(Buffer.from(match[1], 'base64'))))
    assert.ok(exportedPixels.some(image => image.white > image.total * 0.6 && image.black > 100 && image.colored === 0), 'Export did not preserve the black-on-white drawing')
    await page.locator('[data-viewer-action="more"]').click()
    const popupPromise = page.waitForEvent('popup')
    await page.getByRole('menuitem', { name: 'Print now', exact: true }).click()
    const popup = await popupPromise
    await popup.waitForFunction(() => window.__regressionPrintRequested === true)
    const printed = await popup.content()
    assert.ok(printed.includes('data-viewer-print-page-index="0"'), 'Print lost the drawing page boundary')
    const printImage = await popup.locator('[data-viewer-print-page-index="0"] > img').getAttribute('src')
    const printPixels = await pixels(Buffer.from(printImage.split(',')[1], 'base64'))
    assert.ok(printPixels.white > printPixels.total * 0.6 && printPixels.black > 100 && printPixels.colored === 0, 'Print did not contain black-on-white drawing pixels')
    const pdf = await popup.pdf({ path: resolve(output, `${backend}-monochrome.pdf`), printBackground: true })
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
    assert.ok(pdf.length > 1000)
    await popup.close()
    await page.locator('.cad-color-mode').click()
    const restored = await snapshot(`${backend}-restored`)
    assert.ok(restored.dark > restored.total * 0.6 && restored.colored >= source.colored * 0.95 && restored.visible >= source.visible * 0.95, 'Returning to source mode lost authored colors or contrast')
    report.push({ backend, filename: name, sha256: createHash('sha256').update(bytes).digest('hex'), source, monochrome, restored, exportedPixels, printPixels, pdfBytes: pdf.length, passed: true })
  }
  assert.deepEqual(errors, [])
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') })
  console.error(await page.locator('body').innerText())
  throw error
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ origin, report, errors }, null, 2))
  await browser.close()
  await demo.close()
}
console.log(`CAD background, monochrome, restored source colors and exported raster verified in ${report.length} backends.`)
