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
    return { dark, white, colored, black, visible, width: canvas.width, height: canvas.height, total: canvas.width * canvas.height }
  }, bytes.toString('base64'))
}

async function snapshot(name) {
  const surface = await page.locator('.cad-native-stage.is-active').count()
    ? page.locator('.cad-native-stage.is-active .dwfv-stage')
    : page.locator('.cad-stage')
  // Engine-ready precedes the host's initial fit and ResizeObserver work. Compare
  // color modes only after both the live surface and backing canvases settle.
  await surface.evaluate(async element => {
    await element.ownerDocument.fonts.ready
    let previous, stable = 0
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve))
      const rect = element.getBoundingClientRect()
      const dimensions = JSON.stringify([rect.width, rect.height,
        ...[...element.querySelectorAll('canvas')].map(canvas => [canvas.width, canvas.height])])
      stable = dimensions === previous ? stable + 1 : 0
      previous = dimensions
      if (stable >= 8) return
    }
    throw new Error('CAD geometry never settled after layout/fit')
  })
  const data = await surface.screenshot({
    animations: 'disabled',
    style: '.viewer-toolbar, .viewer-status-dock, .settings-notice, .demo-recent-files { visibility: hidden !important; }',
  })
  const layout = await page.locator('.cad-shell').evaluate(shell => ['.cad-toolbar', '.cad-tools', '.cad-body', '.cad-stage', '.dwfv-toolbar', '.dwfv-stage'].map(selector => {
    const element = shell.querySelector(selector)
    if (!element) return null
    const rect = element.getBoundingClientRect(), css = getComputedStyle(element)
    return { selector, top: rect.top, width: rect.width, height: rect.height, flex: css.flex, minHeight: css.minHeight }
  }))
  if (process.env.CAD_GEOMETRY_TRACE === '1') {
    console.log('geometry-trace', name, await page.locator('.cad-shell').evaluate(shell => {
      const ancestors = []
      for (let element = shell; element; element = element.parentElement || element.getRootNode().host) {
        const rect = element.getBoundingClientRect(), css = getComputedStyle(element)
        ancestors.push({ tag: element.tagName, className: element.className,
          top: rect.top, height: rect.height, scrollTop: element.scrollTop,
          transform: css.transform, padding: css.padding, border: css.borderWidth })
      }
      return { scrollY, innerHeight, active: document.activeElement?.tagName, ancestors }
    }))
  }
  await writeFile(resolve(output, `${name}.png`), data)
  const visual = await pixels(data)
  const downloading = page.waitForEvent('download')
  await page.locator('.cad-export-png').click()
  const download = await downloading
  const capture = resolve(output, `${name}-capture.png`)
  await download.saveAs(capture)
  // Compare the actual downloaded raster, not a screen crop affected by browser
  // layout/clip rounding. The live surface is retained and checked independently.
  return { ...await pixels(await readFile(capture)), visual, layout }
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
    assert.ok(source.visual.dark > source.visual.total * 0.6, 'Live source background is not dark')
    // The actual house FixedPage is black-and-white, unlike the colored DWF
    // and synthetic DXF. Require readable source vectors, not invented hues.
    if (backend === 'dwfx-native') assert.ok(source.visible > 1500, `Black XPS vectors disappeared on the dark background: ${JSON.stringify(source)}`)
    else assert.ok(source.colored > 500, `Authored colored lines were lost: ${JSON.stringify(source)}`)
    await page.locator('.cad-color-mode').click()
    const monochrome = await snapshot(`${backend}-monochrome`)
    console.log(backend, 'monochrome', monochrome)
    assert.ok(monochrome.white > monochrome.total * 0.6 && monochrome.black > 100 && monochrome.colored === 0, `Expected white paper and black vectors: ${JSON.stringify(monochrome)}`)
    assert.ok(monochrome.visual.white > monochrome.visual.total * 0.6 && monochrome.visual.black > 100 && monochrome.visual.colored === 0, 'Live monochrome view lost its white paper/black lines')
    const imageExports = []
    for (const format of ['png', 'jpeg']) {
      const button = page.locator(`.cad-export-${format}`)
      assert.equal(await button.count(), 1, `CAD ${format.toUpperCase()} download is missing`)
      const downloadPromise = page.waitForEvent('download')
      await button.click()
      const download = await downloadPromise
      assert.ok(download.suggestedFilename().endsWith(format === 'png' ? '.png' : '.jpg'))
      const path = resolve(output, `${backend}-monochrome.${format === 'png' ? 'png' : 'jpg'}`)
      await download.saveAs(path)
      const bytes = await readFile(path)
      if (format === 'png') assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      else assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff')
      const image = await pixels(bytes)
      assert.ok(image.white > image.total * 0.6 && image.black > 100 && image.colored < image.total * 0.001, `Downloaded ${format} lost the monochrome drawing`)
      imageExports.push({ format, bytes: bytes.length, pixels: image })
    }
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
    assert.deepEqual([restored.width, restored.height], [source.width, source.height], 'Mode comparison requires identical settled view geometry')
    assert.ok(restored.visual.dark > restored.visual.total * 0.6, 'Live restored source background is not dark')
    assert.ok(restored.dark > restored.total * 0.6 && restored.colored >= source.colored * 0.95 && restored.visible >= source.visible * 0.95, 'Returning to source mode lost authored colors or contrast')
    report.push({ backend, filename: name, sha256: createHash('sha256').update(bytes).digest('hex'), source, monochrome, restored, exportedPixels, imageExports, printPixels, pdfBytes: pdf.length, passed: true })
  }
  const imageWatermark = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const context = canvas.getContext('2d')
    context.fillStyle = '#00aa00'
    context.fillRect(0, 0, 32, 32)
    return canvas.toDataURL('image/png')
  })
  for (const [name, watermark] of [
    ['text-watermark', { text: 'CONFIDENTIAL', color: '#ff0000', opacity: 0.8 }],
    ['image-watermark', { image: imageWatermark, opacity: 0.8 }],
  ]) {
    const options = { cad: { colorMode: 'monochrome' }, watermark }
    await page.goto(`${origin}/?url=/example/drawing.dxf&locale=en-US&options=${encodeURIComponent(JSON.stringify(options))}`)
    await page.locator('.cad-export-png:not([disabled])').waitFor({ state: 'visible' })
    assert.equal(await page.locator('.cad-color-mode').getAttribute('aria-pressed'), 'true', `${name}: drawing must be monochrome before the watermark check`)
    const downloading = page.waitForEvent('download')
    await page.locator('.cad-export-png').click()
    const download = await downloading
    const path = resolve(output, `${name}.png`)
    await download.saveAs(path)
    const image = await pixels(await readFile(path))
    assert.ok(image.colored > 500, `${name}: required watermark pixels were omitted`)
    report.push({ name, pixels: image, passed: true })
  }
  for (const permission of ['download', 'export-html']) {
    const options = { toolbar: { permissions: { [permission]: false } } }
    await page.goto(`${origin}/?url=/example/drawing.dxf&options=${encodeURIComponent(JSON.stringify(options))}`)
    await page.locator('.cad-color-mode:not([disabled])').waitFor({ state: 'visible' })
    assert.equal(await page.locator('.cad-export-image:visible').count(), 0, `${permission}: denied image download was exposed`)
    report.push({ name: `permission-${permission}`, passed: true })
  }
  const deniedDownloads = []
  const onUnexpectedDownload = download => deniedDownloads.push(download.suggestedFilename())
  page.on('download', onUnexpectedDownload)
  const options = { watermark: { image: `${origin}/missing-watermark-regression.png` } }
  await page.goto(`${origin}/?url=/example/drawing.dxf&options=${encodeURIComponent(JSON.stringify(options))}`)
  await page.locator('.cad-export-png:not([disabled])').waitFor({ state: 'visible' })
  await page.locator('.cad-export-png').click()
  await page.locator('.cad-export-error').waitFor({ state: 'visible' })
  assert.deepEqual(deniedDownloads, [], 'A missing watermark must not yield an unmarked download')
  assert.equal(await page.locator('.cad-color-mode').isEnabled(), true, 'Export failure broke the live preview')
  page.off('download', onUnexpectedDownload)
  report.push({ name: 'missing-watermark-refused', passed: true })
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 820 })
    await page.goto(`${origin}/?url=/example/drawing.dxf&locale=zh-CN`)
    await page.locator('.cad-export-png:not([disabled])').waitFor({ state: 'visible' })
    const controls = await page.locator('.cad-toolbar').evaluate(toolbar => [...toolbar.querySelectorAll('button')].map(button => {
      const rect = button.getBoundingClientRect()
      return { label: button.textContent, x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }))
    assert.equal(await page.locator('.cad-meta').isVisible(), false, 'Informational badges squeeze narrow CAD controls')
    assert.ok(new Set(controls.map(control => control.y)).size <= 2, 'Narrow CAD toolbar exceeds two control rows')
    for (const control of controls) {
      assert.ok(control.width >= 44 && control.height >= 40, 'CAD control lost its touch target')
      assert.ok(control.x >= 0 && control.x + control.width <= width, 'CAD control leaves the phone viewport')
    }
    await page.screenshot({ path: resolve(output, `mobile-${width}.png`) })
    report.push({ name: `mobile-${width}`, controls, passed: true })
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
console.log(`CAD background, monochrome, PNG/JPEG/HTML/print pixels verified in ${report.filter(item => item.backend).length} backends, plus ${report.filter(item => item.name).length} watermark/permission/mobile cases.`)
