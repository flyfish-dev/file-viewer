import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createPdfReviewHarness } from './pdf-review-harness.mjs'

const root = path.resolve(import.meta.dirname, '../../../..')
const require = createRequire(import.meta.url)
const { PDFDocument, StandardFonts } = require('pdf-lib')
const { PNG } = createRequire(path.join(root, 'package.json'))('pngjs')
const pdf = await PDFDocument.create()
const font = await pdf.embedFont(StandardFonts.Helvetica)
const first = pdf.addPage([600, 500])
first.drawText('SELECTABLE PDF TEXT 416', { x: 40, y: 400, size: 22, font })
first.drawText('SECOND SELECTABLE LINE', { x: 40, y: 340, size: 22, font })
const generated = Buffer.from(await pdf.save())
globalThis.__fileViewerPrepackObserveNodeFixture?.('generated/pdf-selection.pdf', generated)
const installedRoot = process.env.PDF_SELECTION_INSTALLED_ROOT
const output = path.resolve(process.env.PDF_SELECTION_OUTPUT || path.join(root, 'output/pdf-text-selection', installedRoot ? 'installed' : 'source'))
await mkdir(output, { recursive: true })
await writeFile(path.join(output, 'selection.pdf'), generated)
const fixtures = new Map([
  ['selection.pdf', generated],
  ['demo.pdf', await readFile(path.join(root, 'apps/viewer-demo/public/example/pdf.pdf'))]
])
const report = { passed: false, installedRoot: installedRoot || null, cases: [], limitations: [
  'ClipboardEvent exercises the real PDF.js copy handler with in-page ClipboardData; no system clipboard is read or overwritten.',
  'Iframe postMessage is a controlled integration harness, not a reconstruction of the reporter\'s unpublished React application.',
  'Desktop Chromium/WebKit only; no iOS or annotation-editor toolbar claim.'
] }
try {
  for (const browserName of ['chromium', 'webkit']) {
    const h = await createPdfReviewHarness({ output: path.join(output, browserName), fixtures, browserName, installedRoot })
    try {
      for (const config of [
        { mode: 'light', id: 'selection.pdf' },
        { mode: 'shadow', id: 'selection.pdf' },
        { mode: 'iframe-shadow', id: 'selection.pdf' },
        { mode: 'shadow', id: 'demo.pdf' }
      ]) {
        const page = await h.newPage({ width: 1200, height: 1000 })
        let scope = page
        if (config.mode === 'iframe-shadow') {
          await page.evaluate(origin => { const frame = document.createElement('iframe'); frame.src = origin; frame.style.cssText = 'width:1100px;height:900px;border:0'; document.body.replaceChildren(frame) }, h.origin)
          const handle = await page.waitForSelector('iframe')
          scope = await handle.contentFrame()
          await scope.waitForFunction(() => Boolean(window.pdfReview))
        }
        const input = { ...config, assets: h.assets }
        await scope.evaluate(() => {
          window.mountSelection = async config => {
            await window.instance?.unmount()
            const host = document.getElementById('host')
            host.style.cssText = 'width:1000px;height:800px'
            const owner = config.mode === 'light' ? host : host.shadowRoot || host.attachShadow({ mode: 'open' })
            const target = document.createElement('div')
            target.style.cssText = 'width:100%;height:100%'
            owner.replaceChildren(target)
            window.selectionHost = target
            window.instance = await pdfReview.renderPdf(await (await fetch('/fixtures/' + config.id)).arrayBuffer(), target,
              { filename: config.id, options: { pdf: { ...config.assets, navigation: false, handTool: false } } })
          }
          window.addEventListener('message', async event => {
            if (event.origin === location.origin && event.data?.type === 'selection-fixture') {
              try { await mountSelection(event.data.config); window.messageMounted = true }
              catch (error) { window.messageFailure = String(error) }
            }
          })
        })
        const mount = async () => {
          if (config.mode === 'iframe-shadow') {
            await scope.evaluate(() => { window.messageMounted = false; window.messageFailure = null })
            await page.evaluate(input => document.querySelector('iframe').contentWindow.postMessage({ type: 'selection-fixture', config: input }, location.origin), input)
            await scope.waitForFunction(() => window.messageMounted || window.messageFailure)
            assert.equal(await scope.evaluate(() => window.messageFailure), null)
          } else await scope.evaluate(config => window.mountSelection(config), input)
          await scope.waitForFunction(() => selectionHost.querySelector('.textLayer .endOfContent') &&
            selectionHost.querySelector('.textLayer span[role="presentation"]')?.textContent.trim())
          await scope.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) })
        }
        await mount()
        let text
        // Marked-content groups use display:contents and are not text targets.
        const spans = scope.locator('.textLayer span[role="presentation"]:not(.markedContent)')
        for (let i = 0; i < Math.min(await spans.count(), 100); i++) {
          const candidate = spans.nth(i), box = await candidate.boundingBox(), content = await candidate.textContent()
          if (box && box.width > 100 && box.y > 0 && box.y + box.height < 850 && content.trim().length > 6) { text = candidate; break }
        }
        assert.ok(text, 'Expected actual visible selectable PDF text')
        await text.click({ trial: true })
        const originalPixels = PNG.sync.read(await text.screenshot())
        const box = await text.boundingBox()
        // A half-pixel span edge can hit a shadow-tree caret boundary in Linux
        // WebKit. Read glyph geometry only; Selection is changed by real mouse
        // events, never by a programmatically installed range.
        const glyphs = await text.evaluate(element => {
          const node = element.firstChild
          if (node?.nodeType !== Node.TEXT_NODE || !node.textContent.length) throw Error('Expected a real text leaf')
          const rect = element.getBoundingClientRect(), range = document.createRange()
          range.setStart(node, 0); range.setEnd(node, 1)
          const first = range.getBoundingClientRect()
          range.setStart(node, node.textContent.length - 1); range.setEnd(node, node.textContent.length)
          const last = range.getBoundingClientRect()
          if (!first.width || !last.width || !rect.width) throw Error('Expected laid-out text glyphs')
          return { first: first.x - rect.x + first.width / 4, last: last.x - rect.x + last.width * 3 / 4,
            y: first.y - rect.y + first.height / 2, text: node.textContent }
        })
        const drag = async () => {
          await page.mouse.move(box.x + glyphs.first, box.y + glyphs.y)
          await page.mouse.down()
          await page.mouse.move(box.x + glyphs.last, box.y + glyphs.y, { steps: 12 })
        }
        await drag()
        const during = await scope.evaluate(() => getSelection().toString())
        await page.mouse.up()
        await scope.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
        const after = await scope.evaluate(() => getSelection().toString())
        const copied = await text.evaluate(node => {
          const data = new DataTransfer()
          const event = new ClipboardEvent('copy', { clipboardData: data, bubbles: true, composed: true, cancelable: true })
          node.dispatchEvent(event)
          return { text: data.getData('text/plain'), handled: event.defaultPrevented, selectionColor: getComputedStyle(node, '::selection').backgroundColor }
        })
        const key = `${browserName}-${config.mode}-${config.id}`
        const selectedPixels = PNG.sync.read(await text.screenshot({ path: path.join(output, key + '.png') }))
        assert.equal(selectedPixels.width, originalPixels.width)
        assert.equal(selectedPixels.height, originalPixels.height)
        let changedPixels = 0
        for (let i = 0; i < selectedPixels.data.length; i += 4)
          if ([0, 1, 2].some(c => Math.abs(selectedPixels.data[i + c] - originalPixels.data[i + c]) > 8)) changedPixels++
        const row = { browser: browserName, version: h.browser.version(), ...config, during, after, copied, changedPixels, glyphs }
        report.cases.push(row)
        assert.ok(glyphs.text.includes(during.trim()), key + ' must select the targeted text leaf')
        assert.ok(during.trim(), key + ' must actually select text')
        assert.equal(after, during, key + ' mouseup must preserve native selection')
        assert.ok(copied.handled && copied.text.trim(), key + ' actual PDF copy handler')
        assert.equal(copied.text, after, key + ' copy handler preserves selected text')
        assert.ok(changedPixels > 30, key + ' native selection must remain visibly painted after mouseup')
        assert.notEqual(copied.selectionColor, 'rgba(0, 0, 0, 0)')
        // Repeat, clear, interrupt and remount: a previous selection must not
        // own the replacement viewer or survive an ordinary outside click.
        await page.mouse.click(box.x - 15, box.y + box.height / 2)
        assert.equal(await scope.evaluate(() => getSelection().toString()), '')
        await drag(); await page.mouse.up()
        assert.equal(await scope.evaluate(() => getSelection().toString()), after)
        await page.mouse.click(box.x - 15, box.y + box.height / 2)
        await drag(); await scope.evaluate(() => instance.unmount()); await page.mouse.up()
        assert.equal(await scope.locator('.textLayer').count(), 0)
        await mount()
        assert.ok(await scope.locator('.textLayer span').count())
        await scope.evaluate(() => instance.unmount())
        row.passed = true
        await page.close()
      }
      assert.deepEqual(h.errors, [])
      assert.deepEqual(h.external, [])
      assert.ok(h.workers.some(url => url.includes('pdf.worker.mjs')), 'Real HTTP PDF Worker must execute')
    } finally { await h.close() }
  }
  report.passed = true
  console.log('PDF native selection passed:8 Chromium/WebKit light/ShadowDOM/iframe-postMessage/demo cases; mouseup paint, actual copy handler, repeated selection and interrupted teardown.')
} finally { await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n') }
