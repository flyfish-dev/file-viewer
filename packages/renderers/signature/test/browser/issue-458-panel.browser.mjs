import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
import { createPdfReviewHarness } from '../../../pdf/scripts/pdf-review-harness.mjs'

const root = path.resolve(import.meta.dirname, '../../../../..')
const output = path.resolve(
  process.env.SIGNATURE_PANEL_OUTPUT || path.join(root, 'output/signature-panel')
)
const installedRoot =
  process.env.SIGNATURE_PANEL_INSTALLED_ROOT &&
  (await realpath(process.env.SIGNATURE_PANEL_INSTALLED_ROOT))
const require = createRequire(path.join(installedRoot || root, 'package.json'))
const source = path.join(root, 'packages/renderers/signature/src/signature.ts')
const imports = installedRoot
  ? `import { renderFileViewerSignature as renderSignature } from ${JSON.stringify(require.resolve('@file-viewer/renderer-signature'))};
     import { renderFileViewerCode as renderCode } from ${JSON.stringify(require.resolve('@file-viewer/renderer-text'))};`
  : `import renderSignature from ${JSON.stringify(source)};
     import renderCode from ${JSON.stringify(path.join(root, 'packages/renderers/text/src/code.ts'))};`
const bundle = await build({
  absWorkingDir: installedRoot || root,
  stdin: {
    resolveDir: installedRoot || path.join(root, 'packages/renderers/signature'),
    contents: `
${imports}
import { disposeFileViewerRendered, findFileViewerViewStateProvider, findFileViewerZoomProvider, resolveFileViewerScrollContainer } from '@file-viewer/core';
window.panelReview = { renderSignature, renderCode, disposeFileViewerRendered, findFileViewerViewStateProvider, findFileViewerZoomProvider, resolveFileViewerScrollContainer };
`
  },
  bundle: true,
  format: 'esm',
  write: false,
  metafile: true,
  logLevel: 'warning'
})
const inputs = Object.keys(bundle.metafile.inputs).filter((p) => p !== '<stdin>')
if (installedRoot)
  for (const name of inputs)
    assert.ok(
      (await realpath(path.resolve(installedRoot, name))).startsWith(
        installedRoot + '/node_modules/'
      ),
      `Consumer dependency escaped: ${name}`
    )
await mkdir(output, { recursive: true })
const fixtureRoot = process.env.SIGNATURE_PANEL_DEEP_FIXTURES
  ? path.resolve(process.env.SIGNATURE_PANEL_DEEP_FIXTURES)
  : path.join(root, 'packages/renderers/signature/test/fixtures/github-206-contributed')
const fixtures = await Promise.all(
  (process.env.SIGNATURE_PANEL_DEEP_FIXTURES
    ? [
        ['pdf', 'reading.pdf.p7m', 'reading.pdf'],
        ['xml', 'reading.xml.p7m', 'reading.xml']
      ]
    : [
        ['pdf', 'cms/invoice-encapsulated.pdf.p7m', 'originals/invoice.pdf'],
        ['xml', 'cms/xml-encapsulated-but-named.p7s', 'originals/sample.xml']
      ]
  ).map(async ([format, container, content]) => {
    const bytes = await readFile(path.join(fixtureRoot, container))
    globalThis.__fileViewerPrepackObserveNodeFixture?.(process.env.SIGNATURE_PANEL_DEEP_FIXTURES
      ? `generated/signature-panel/${container}` : `packages/renderers/signature/test/fixtures/github-206-contributed/${container}`, bytes)
    return {
      format,
      container,
      bytes: bytes.toString('base64'),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      contentSha256: createHash('sha256')
        .update(await readFile(path.join(fixtureRoot, content)))
        .digest('hex')
    }
  })
)
const report = {
  passed: false,
  node: process.version,
  installedRoot: installedRoot || null,
  fixtures,
  bundleInputs: inputs,
  cases: [],
  narrow: []
}
const configs = [
  { position: 'top', initialState: 'expanded' },
  { position: 'top', initialState: 'collapsed' },
  ...['overlay', 'push'].flatMap((openingBehavior) =>
    ['expanded', 'collapsed'].map((initialState) => ({
      position: 'left',
      openingBehavior,
      initialState
    }))
  )
]
try {
  for (const browserName of (process.env.SIGNATURE_PANEL_BROWSERS || 'chromium,webkit').split(
    ','
  )) {
    const h = await createPdfReviewHarness({
      output: path.join(output, browserName),
      browserName,
      installedRoot
    })
    try {
      for (const fixture of fixtures.filter(
        (f) =>
          !process.env.SIGNATURE_PANEL_FORMATS ||
          process.env.SIGNATURE_PANEL_FORMATS.split(',').includes(f.format)
      ))
        for (const shadow of process.env.SIGNATURE_PANEL_DOM === 'light' ? [false] : [false, true])
          for (const config of configs.filter(
            (c) =>
              !process.env.SIGNATURE_PANEL_POSITION ||
              c.position === process.env.SIGNATURE_PANEL_POSITION
          )) {
            const key = `${browserName}-${fixture.format}-${shadow ? 'shadow' : 'light'}-${config.position}-${config.openingBehavior || 'flow'}-${config.initialState}`
            const page = await h.newPage({
              width: Number(process.env.SIGNATURE_PANEL_VIEWPORT_WIDTH || 1400),
              height: 1000
            })
            const row = {
              key,
              config,
              browser: h.browser.version(),
              format: fixture.format,
              shadow,
              passed: false
            }
            report.cases.push(row)
            try {
              await page.addScriptTag({
                type: 'module',
                content: bundle.outputFiles[0].text
              })
              await page.waitForFunction(() => !!window.panelReview)
              await page.evaluate(
                async (input) => {
                  const host = document.getElementById('host')
                  host.style.cssText = `width:${input.width}px;height:900px`
                  const owner = input.shadow ? host.attachShadow({ mode: 'open' }) : host
                  const target = document.createElement('div')
                  target.style.cssText = 'width:100%;height:100%'
                  owner.append(target)
                  window.signatureTarget = target
                  window.signatureCounts = {
                    nested: 0,
                    unmount: 0,
                    verify: 0,
                    digest: 0,
                    importKey: 0
                  }
                  for (const method of ['verify', 'digest', 'importKey']) {
                    const original = crypto.subtle[method].bind(crypto.subtle)
                    crypto.subtle[method] = (...args) => {
                      signatureCounts[method]++
                      return original(...args)
                    }
                  }
                  window.panelEvents = []
                  host.addEventListener('file-viewer-signature-panel-change', (event) =>
                    panelEvents.push(event.detail)
                  )
                  window.signatureInstance = await panelReview.renderSignature(
                    Uint8Array.from(atob(input.bytes), (c) => c.charCodeAt(0)).buffer,
                    target,
                    'p7m',
                    {
                      filename: input.format === 'pdf' ? 'document.pdf.p7m' : 'document.p7s',
                      options: {
                        locale: 'en-US',
                        signature: { detailsPanel: input.config },
                        pdf: { ...input.assets, navigation: false },
                        text: { wrapLongLines: true, lineNumbers: true }
                      },
                      renderNestedBuffer: async (bytes, type, target, context) => {
                        signatureCounts.nested++
                        window.nestedType = type
                        window.nestedSha256 = Array.from(
                          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
                          (value) => value.toString(16).padStart(2, '0')
                        ).join('')
                        const instance =
                          type === 'pdf'
                            ? await pdfReview.renderPdf(bytes, target, context)
                            : await panelReview.renderCode(bytes, target, type, context)
                        return {
                          $el: instance.$el,
                          async unmount() {
                            signatureCounts.unmount++
                            await panelReview.disposeFileViewerRendered(instance)
                          }
                        }
                      }
                    }
                  )
                  if (input.largeText) {
                    const style = document.createElement('style')
                    style.textContent =
                      '.signature-panel-button,.signature-card p,.signature-grid dt,.signature-grid dd,.signature-card code,.signature-item-head strong,.signature-item-head span{font-size:18px!important}'
                    owner.append(style)
                  }
                  window.originalPreview = target.querySelector('.signature-preview-target')
                  window.originalNested = originalPreview.firstElementChild
                  window.readingLandmark = null
                  window.panelState = () => {
                    const target = signatureTarget
                    const preview = target.querySelector('.signature-preview-target')
                    const panel = target.querySelector('.signature-details-panel')
                    const scroller = panelReview.resolveFileViewerScrollContainer(preview)
                    const zoom = panelReview.findFileViewerZoomProvider(preview)
                    const state = panelReview.findFileViewerViewStateProvider(preview)?.getState()
                    const point =
                      scroller.getBoundingClientRect().top + scroller.clientHeight * 0.42
                    const landmarks = [
                      ...preview.querySelectorAll('.pdfViewer .page,.code-source-line')
                    ]
                    const landmark = landmarks.find((node) => {
                      const box = node.getBoundingClientRect()
                      return box.top <= point && box.bottom > point
                    })
                    const landmarkRect = landmark?.getBoundingClientRect()
                    return {
                      sameReadingLandmark:
                        !window.readingLandmark || landmark === window.readingLandmark,
                      landmark: landmark
                        ? {
                            id: landmark.dataset.pageNumber || landmark.dataset.line,
                            fraction: (point - landmarkRect.top) / landmarkRect.height,
                            height: landmarkRect.height
                          }
                        : null,
                      hidden: panel.hidden,
                      width: preview.clientWidth,
                      height: preview.clientHeight,
                      panelHeight: panel.getBoundingClientRect().height,
                      mainHeight: target.querySelector('.signature-main').getBoundingClientRect()
                        .height,
                      scale: zoom?.getState().scale,
                      page: state?.page,
                      top: scroller.scrollTop,
                      left: scroller.scrollLeft,
                      sameScroller:
                        !window.originalScroller || scroller === window.originalScroller,
                      samePreview: preview === originalPreview,
                      sameNested: preview.firstElementChild === originalNested,
                      counts: { ...signatureCounts },
                      events: panelEvents.length,
                      type: nestedType,
                      contentSha256: nestedSha256,
                      warnings: [
                        ...target.querySelectorAll('.signature-sidebar .signature-warning')
                      ].map((node) => ({
                        text: node.textContent,
                        hidden: !!node.closest('[hidden]')
                      })),
                      details: [...panel.querySelectorAll('.signature-card h3')].map(
                        (node) => node.textContent
                      )
                    }
                  }
                  window.togglePanel = () =>
                    signatureTarget.querySelector('.signature-header [aria-controls]').click()
                },
                {
                  ...fixture,
                  shadow,
                  config,
                  assets: h.assets,
                  width: Number(process.env.SIGNATURE_PANEL_HOST_WIDTH || 1280),
                  largeText: process.env.SIGNATURE_PANEL_LARGE_TEXT === '1'
                }
              )
              if (fixture.format === 'pdf')
                await page.waitForFunction(
                  () =>
                    signatureTarget.querySelector('.signature-preview .page')?.dataset.loaded ===
                    'true'
                )
              else
                await page.waitForFunction(() =>
                  signatureTarget.querySelector('.code-viewer code')?.textContent.includes('<')
                )
              await page.waitForTimeout(350)
              await page.evaluate(() => {
                window.originalScroller =
                  panelReview.resolveFileViewerScrollContainer(originalPreview)
              })
              row.initial = await page.evaluate(() => panelState())
              assert.equal(row.initial.type, fixture.format, key + ' actual nested route')
              assert.equal(
                row.initial.contentSha256,
                fixture.contentSha256,
                key + ' extracted original bytes'
              )
              assert.equal(row.initial.hidden, config.initialState === 'collapsed')
              assert.equal(row.initial.counts.nested, 1)
              assert.equal(row.initial.events, 0)
              assert.ok(
                row.initial.warnings.length && row.initial.warnings.every((item) => !item.hidden)
              )
              if (
                fixture.format === 'pdf' &&
                config.position === 'top' &&
                config.initialState === 'expanded' &&
                !shadow
              ) {
                const trigger = page.locator('.signature-header [aria-controls]')
                await trigger.press('Enter')
                assert.equal((await page.evaluate(() => panelState())).hidden, true)
                await trigger.press('Space')
                assert.equal((await page.evaluate(() => panelState())).hidden, false)
                const close = page.locator('.signature-details-heading button')
                await close.focus()
                await close.press('Escape')
                assert.equal((await page.evaluate(() => panelState())).hidden, true)
                assert.equal(
                  await trigger.evaluate((node) => node === document.activeElement),
                  true
                )
                await trigger.press('Enter')
              }
              if (
                fixture.format === 'pdf' &&
                config.position === 'left' &&
                config.openingBehavior === 'push'
              ) {
                if (process.env.SIGNATURE_PANEL_DEEP_FIXTURES) {
                  await page.evaluate(() => {
                    const scroller = panelReview.resolveFileViewerScrollContainer(originalPreview)
                    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * 0.53
                  })
                  await page.waitForTimeout(300)
                }
                row.autoFit = { before: await page.evaluate(() => panelState()) }
                await page.evaluate(() => togglePanel())
                await page.waitForTimeout(350)
                row.autoFit.toggled = await page.evaluate(() => panelState())
                await page.evaluate(() => togglePanel())
                await page.waitForTimeout(350)
                row.autoFit.restored = await page.evaluate(() => panelState())
                const closed = row.autoFit.before.hidden ? row.autoFit.before : row.autoFit.toggled
                const opened = row.autoFit.before.hidden ? row.autoFit.toggled : row.autoFit.before
                assert.ok(
                  closed.scale > opened.scale,
                  key + ' existing auto-fit follows the available width'
                )
                assert.ok(
                  Math.abs(row.autoFit.restored.scale - row.autoFit.before.scale) < 0.001,
                  key + ' automatic fit remains enabled after closing'
                )
                if (process.env.SIGNATURE_PANEL_DEEP_FIXTURES) {
                  for (const state of [row.autoFit.toggled, row.autoFit.restored]) {
                    assert.equal(
                      state.landmark?.id,
                      row.autoFit.before.landmark?.id,
                      key + ' auto-fit keeps current page'
                    )
                    assert.ok(
                      Math.abs(state.landmark.fraction - row.autoFit.before.landmark.fraction) *
                        state.landmark.height <=
                        21,
                      key + ' auto-fit keeps reading offset within one authored line'
                    )
                  }
                }
              }
              if (
                fixture.format === 'pdf' &&
                config.position === 'left' &&
                config.openingBehavior === 'push' &&
                !process.env.SIGNATURE_PANEL_HOST_WIDTH
              ) {
                const viewport = page.viewportSize()
                await page.evaluate(() => {
                  document.getElementById('host').style.width = 'calc(100% - 120px)'
                })
                const beforeResize = await page.evaluate(() => panelState())
                await page.setViewportSize({ ...viewport, width: viewport.width + 160 })
                await page.waitForTimeout(350)
                row.windowResize = {
                  before: beforeResize,
                  wider: await page.evaluate(() => panelState())
                }
                assert.ok(
                  row.windowResize.wider.scale > beforeResize.scale,
                  key + ' auto-fit still responds to a later window resize'
                )
                await page.setViewportSize(viewport)
                await page.waitForTimeout(350)
                row.windowResize.restored = await page.evaluate(() => panelState())
                assert.ok(
                  Math.abs(row.windowResize.restored.scale - beforeResize.scale) < 0.001,
                  key + ' resize restores original auto-fit scale'
                )
              }
              // A manual scale is intentionally distinct from auto-fit. Toggle must not reset it.
              await page.evaluate(async () => {
                await panelReview.findFileViewerZoomProvider(originalPreview)?.setZoom?.(0.8)
              })
              await page.waitForTimeout(250)
              if (process.env.SIGNATURE_PANEL_DEEP_FIXTURES) {
                await page.evaluate(() => {
                  const scroller = panelReview.resolveFileViewerScrollContainer(originalPreview)
                  scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * 0.53
                })
                await page.waitForTimeout(300)
              }
              row.before = await page.evaluate(() => {
                const scroller = panelReview.resolveFileViewerScrollContainer(originalPreview)
                const point = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.42
                window.readingLandmark = [
                  ...originalPreview.querySelectorAll('.pdfViewer .page,.code-source-line')
                ].find((node) => {
                  const box = node.getBoundingClientRect()
                  return box.top <= point && box.bottom > point
                })
                return panelState()
              })
              await page.evaluate(() => togglePanel())
              await page.waitForTimeout(350)
              row.toggled = await page.evaluate(() => panelState())
              await page.evaluate(() => togglePanel())
              await page.waitForTimeout(350)
              row.restored = await page.evaluate(() => panelState())
              for (const state of [row.toggled, row.restored]) {
                assert.equal(state.samePreview, true)
                assert.equal(state.sameNested, true)
                assert.equal(state.sameScroller, true, key + ' preserve scroll container identity')
                assert.deepEqual(
                  state.counts,
                  row.before.counts,
                  key + ' no nested reload or verification'
                )
                assert.equal(state.scale, row.before.scale, key + ' preserve manual zoom')
                assert.ok(state.warnings.every((item) => !item.hidden))
              }
              if (process.env.SIGNATURE_PANEL_DEEP_FIXTURES) {
                assert.ok(row.before.top > 100, key + ' deep input really scrolls')
                assert.ok(row.before.landmark, key + ' actual visible page/line oracle')
                for (const state of [row.toggled, row.restored]) {
                  assert.equal(
                    state.landmark?.id,
                    row.before.landmark.id,
                    key + ' preserve current page/line'
                  )
                  assert.equal(
                    state.sameReadingLandmark,
                    true,
                    key + ' preserve same semantic DOM node'
                  )
                  const pixels =
                    Math.abs(state.landmark.fraction - row.before.landmark.fraction) *
                    state.landmark.height
                  assert.ok(
                    pixels <= (fixture.format === 'pdf' ? 2 : state.landmark.height),
                    key + ' preserve within-page/line reading offset: ' + pixels
                  )
                }
              }
              assert.equal(row.restored.hidden, row.before.hidden)
              assert.ok(Math.abs(row.restored.width - row.before.width) <= 1)
              assert.ok(Math.abs(row.restored.height - row.before.height) <= 1)
              if (config.position === 'left' && config.openingBehavior === 'overlay') {
                assert.ok(
                  Math.abs(row.toggled.width - row.before.width) <= 1,
                  key + ' overlay width'
                )
                assert.equal(row.toggled.height, row.before.height)
                assert.equal(row.toggled.top, row.before.top)
                assert.equal(row.toggled.left, row.before.left)
              } else if (config.position === 'left') {
                const closed = row.before.hidden ? row.before : row.toggled
                const opened = row.before.hidden ? row.toggled : row.before
                assert.ok(closed.width > opened.width + 20, key + ' push changes available width')
              } else {
                const closed = row.before.hidden ? row.before : row.toggled
                const opened = row.before.hidden ? row.toggled : row.before
                assert.equal(closed.panelHeight, 0)
                assert.ok(
                  opened.mainHeight > closed.mainHeight + 100,
                  key + ' collapse releases occupied detail space'
                )
              }
              for (let i = 0; i < 10; i++) await page.evaluate(() => togglePanel())
              await page.waitForTimeout(300)
              row.repeated = await page.evaluate(() => panelState())
              assert.deepEqual(row.repeated.counts, row.before.counts)
              assert.equal(
                row.repeated.sameScroller,
                true,
                key + ' rapid toggles preserve scroll container identity'
              )
              if (process.env.SIGNATURE_PANEL_DEEP_FIXTURES) {
                assert.equal(
                  row.repeated.landmark?.id,
                  row.before.landmark.id,
                  key + ' rapid toggles preserve reading line/page'
                )
                row.interrupted = await page.evaluate(async () => {
                  togglePanel()
                  const scroller = panelReview.resolveFileViewerScrollContainer(originalPreview)
                  originalPreview.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
                  scroller.scrollTop += 120
                  const desired = scroller.scrollTop
                  await new Promise((resolve) => setTimeout(resolve, 300))
                  return {
                    desired,
                    actual: scroller.scrollTop,
                    state: panelState()
                  }
                })
                assert.ok(
                  Math.abs(row.interrupted.actual - row.interrupted.desired) <= 2,
                  key + ' new user scrolling cancels stale restore'
                )
              }

              if (Number(process.env.SIGNATURE_PANEL_HOST_WIDTH) === 320) {
                if (await page.evaluate(() => panelState().hidden))
                  await page.evaluate(() => togglePanel())
                await page.waitForTimeout(300)
                row.narrow = await page.evaluate(() => {
                  const root = signatureTarget.querySelector('.signature-shell')
                  const panel = root.querySelector('.signature-details-panel')
                  const body = panel.querySelector('.signature-details-body')
                  const cards = [...body.querySelectorAll('.signature-card')]
                  return {
                    rootWidth: root.clientWidth,
                    rootScrollWidth: root.scrollWidth,
                    columns: getComputedStyle(root.querySelector('.signature-content'))
                      .gridTemplateColumns,
                    panelWidth: panel.clientWidth,
                    panelScrollWidth: panel.scrollWidth,
                    minCardWidth: Math.min(...cards.map((card) => card.clientWidth)),
                    text: [...body.querySelectorAll('dt,dd')].map((node) => ({
                      width: node.clientWidth,
                      scroll: node.scrollWidth,
                      font: parseFloat(getComputedStyle(node).fontSize)
                    })),
                    controls: [...panel.querySelectorAll('button')].map((node) => ({
                      text: node.textContent,
                      width: node.clientWidth,
                      scroll: node.scrollWidth,
                      height: node.clientHeight
                    }))
                  }
                })
                await page.locator('.signature-details-heading').scrollIntoViewIfNeeded()
                await page.screenshot({
                  path: path.join(output, key + '-narrow-observation.png')
                })
                assert.ok(
                  row.narrow.rootScrollWidth <= row.narrow.rootWidth + 1,
                  key + ' narrow shell does not overflow'
                )
                assert.equal(
                  row.narrow.columns.trim().split(/\s+/).length,
                  1,
                  key + ' actual narrow host has one metadata column'
                )
                assert.ok(
                  row.narrow.panelScrollWidth <= row.narrow.panelWidth + 1,
                  key + ' readable detail rail without horizontal clipping'
                )
                assert.ok(
                  row.narrow.text.every(
                    (item) => item.width >= item.font * 4 && item.scroll <= item.width + 1
                  ),
                  key + ' detail fields have at least four readable glyph widths and wrap'
                )
                assert.ok(
                  row.narrow.controls.every(
                    (item) => item.height >= 24 && item.scroll <= item.width + 1
                  ),
                  key + ' controls wrap without clipping'
                )
                await page.locator('.signature-details-heading').scrollIntoViewIfNeeded()
                await page.screenshot({
                  path: path.join(output, key + '-narrow.png')
                })
              }
              await page.locator('.signature-preview').scrollIntoViewIfNeeded()
              if (config.initialState === 'expanded' && !shadow)
                await page.screenshot({
                  path: path.join(output, key + '.png')
                })
              await page.evaluate(() => signatureInstance.unmount())
              row.teardown = await page.evaluate(() => ({
                counts: signatureCounts,
                children: signatureTarget.childElementCount
              }))
              assert.equal(row.teardown.counts.unmount, 1)
              assert.equal(row.teardown.children, 0)
              row.passed = true
            } catch (error) {
              row.error = error.stack
              await page
                .screenshot({ path: path.join(output, key + '-failure.png') })
                .catch(() => {})
              throw error
            } finally {
              await page.close()
              await writeFile(
                path.join(output, 'report.json'),
                JSON.stringify(report, null, 2) + '\n'
              )
            }
          }
      assert.deepEqual(h.errors, [])
      assert.deepEqual(h.external, [])
      assert.ok(h.workers.some((url) => url.includes('pdf.worker.mjs')))
    } finally {
      await h.close()
    }
  }
  report.passed = true
  console.log(
    `Signature panel actual PDF/XML: ${report.cases.length} cases passed (${installedRoot ? 'installed' : 'source'}).`
  )
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
