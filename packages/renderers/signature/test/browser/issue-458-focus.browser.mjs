import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
import { createPdfReviewHarness } from '../../../pdf/scripts/pdf-review-harness.mjs'
const root = path.resolve(import.meta.dirname, '../../../../..')
const output = path.resolve(process.env.SIGNATURE_FOCUS_OUTPUT || 'output/signature-panel-focus')
const installedRoot =
  process.env.SIGNATURE_PANEL_INSTALLED_ROOT &&
  (await realpath(process.env.SIGNATURE_PANEL_INSTALLED_ROOT))
const require = createRequire(path.join(installedRoot || root, 'package.json'))
const signature = installedRoot
  ? require.resolve('@file-viewer/renderer-signature')
  : path.join(root, 'packages/renderers/signature/src/signature.ts')
const text = installedRoot
  ? require.resolve('@file-viewer/renderer-text')
  : path.join(root, 'packages/renderers/text/src/code.ts')
const bundle = await build({
  absWorkingDir: installedRoot || root,
  stdin: {
    resolveDir: installedRoot || path.join(root, 'packages/renderers/signature'),
    contents: `${installedRoot ? `import {renderFileViewerSignature as signature} from ${JSON.stringify(signature)};import {renderFileViewerCode as text} from ${JSON.stringify(text)};` : `import signature from ${JSON.stringify(signature)};import text from ${JSON.stringify(text)};`} import {disposeFileViewerRendered,findFileViewerZoomProvider,resolveFileViewerScrollContainer} from '@file-viewer/core';window.focusApi={signature,text,disposeFileViewerRendered,findFileViewerZoomProvider,resolveFileViewerScrollContainer}`
  },
  bundle: true,
  write: false,
  format: 'esm',
  metafile: true
})
if (installedRoot)
  for (const name of Object.keys(bundle.metafile.inputs).filter((p) => p !== '<stdin>'))
    assert.ok(
      (await realpath(path.resolve(installedRoot, name))).startsWith(
        installedRoot + '/node_modules/'
      )
    )
const fixtures = {}
const fixtureRoot = path.join(
  root,
  'packages/renderers/signature/test/fixtures/github-206-contributed/cms'
)
for (const [kind, name] of Object.entries({
  missing: 'invoice-detached.pdf.p7s',
  certificate: 'certificate-chain.p7b',
  nested: 'invoice-double-signed.p7m',
  xml: 'xml-encapsulated-but-named.p7s'
})) {
  const bytes = await readFile(path.join(fixtureRoot, name))
  fixtures[kind] = {
    name,
    bytes: bytes.toString('base64'),
    sha256: createHash('sha256').update(bytes).digest('hex')
  }
}
const layouts = [
  { position: 'top' },
  { position: 'left', openingBehavior: 'overlay' },
  { position: 'left', openingBehavior: 'push' }
]
const cases = []
for (const iframe of [false, true])
  for (const shadow of [false, true])
    for (const [width, height] of [
      [320, 400],
      [1080, 220]
    ])
      for (const layout of layouts)
        for (const scrolled of [false, true])
          cases.push({ kind: 'missing', iframe, shadow, width, height, layout, scrolled })
for (const layout of layouts) {
  cases.push({
    kind: 'certificate',
    iframe: false,
    shadow: true,
    width: 320,
    height: 400,
    layout,
    scrolled: false
  })
  cases.push({
    kind: 'nested',
    iframe: false,
    shadow: true,
    width: 1280,
    height: 950,
    layout,
    scrolled: true
  })
  cases.push({
    kind: 'xml',
    iframe: true,
    shadow: false,
    width: 1080,
    height: 220,
    layout,
    scrolled: true
  })
}
for (const config of [...cases].filter((config) => ['nested', 'xml'].includes(config.kind)))
  cases.push({ ...config, scrolled: false })
await mkdir(output, { recursive: true })
const report = {
  passed: false,
  installedRoot: installedRoot || null,
  node: process.version,
  fixtures,
  bundleInputs: Object.keys(bundle.metafile.inputs),
  cases: []
}
try {
  for (const browserName of ['chromium', 'webkit']) {
    const h = await createPdfReviewHarness({
      output: path.join(output, browserName),
      browserName,
      installedRoot
    })
    try {
      for (const [index, config] of cases.entries()) {
        const key = `${browserName}-${config.kind}-${config.layout.position}-${config.layout.openingBehavior || 'flow'}-${config.width}x${config.height}-${config.iframe ? 'iframe' : 'document'}-${config.shadow ? 'shadow' : 'none'}-${config.scrolled ? 'scrolled-keyboard' : 'initial-click'}`
        const row = { key, config, passed: false }
        report.cases.push(row)
        const page = await h.newPage({ width: 1400, height: 1100 })
        try {
          await page.addScriptTag({ type: 'module', content: bundle.outputFiles[0].text })
          await page.waitForFunction(() => !!window.focusApi)
          await page.evaluate(
            async ({ config, fixture, missing, assets }) => {
              const host = document.getElementById('host')
              host.style.cssText =
                'width:100%;height:auto;overflow:visible;padding-top:100px;min-height:2500px'
              host.replaceChildren()
              const counts = { verify: 0, nested: 0, workers: 0 }
              const verify = crypto.subtle.verify.bind(crypto.subtle)
              crypto.subtle.verify = (...args) => {
                counts.verify++
                return verify(...args)
              }
              const NativeWorker = window.Worker
              window.Worker = new Proxy(NativeWorker, {
                construct(Target, args) {
                  counts.workers++
                  return Reflect.construct(Target, args, Target)
                }
              })
              const decode = (bytes) => Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0)).buffer
              const other = document.createElement('div')
              other.style.cssText =
                'position:absolute;left:1110px;top:110px;width:260px;height:250px'
              document.body.append(other)
              const otherInstance = await focusApi.signature(decode(missing.bytes), other, 'p7s', {
                filename: 'other.pdf.p7s',
                options: { locale: 'en-US' }
              })
              const otherShell = other.querySelector('.signature-shell')
              otherShell.scrollTop = 170
              let owner = document,
                frame
              if (config.iframe) {
                frame = document.createElement('iframe')
                frame.style.cssText = 'width:1100px;height:700px;border:0'
                host.append(frame)
                owner = frame.contentDocument
                owner.body.style.cssText = 'margin:0;min-height:2200px;padding-top:60px'
              }
              const mount = owner.createElement('div')
              mount.style.cssText = `width:${config.width}px;height:${config.height}px`
              ;(config.iframe ? owner.body : host).append(mount)
              const container = config.shadow ? mount.attachShadow({ mode: 'open' }) : mount
              const target = owner.createElement('div')
              target.style.cssText = 'width:100%;height:100%'
              container.append(target)
              let nestedSignatureTarget
              const options = {
                locale: 'en-US',
                signature: {
                  detailsPanel: {
                    ...config.layout,
                    initialState: config.scrolled ? 'expanded' : 'collapsed'
                  }
                },
                pdf: { ...assets, navigation: false },
                text: { wrapLongLines: true, lineNumbers: true }
              }
              const context = {
                filename:
                  config.kind === 'nested'
                    ? 'invoice.pdf.p7m.p7m'
                    : config.kind === 'xml'
                      ? 'signed.xml.p7s'
                      : config.kind === 'certificate'
                        ? 'certificates.p7b'
                        : 'invoice.pdf.p7s',
                options,
                renderNestedBuffer: async (bytes, type, child, ctx) => {
                  counts.nested++
                  if (type === 'p7m') {
                    nestedSignatureTarget = child
                    child.style.width = '640px'
                    child.style.height = '400px'
                    return focusApi.signature(bytes, child, type, { ...ctx, options })
                  }
                  return type === 'pdf'
                    ? pdfReview.renderPdf(bytes, child, ctx)
                    : focusApi.text(bytes, child, type, ctx)
                }
              }
              if (config.kind === 'nested')
                context.options = {
                  ...options,
                  signature: { detailsPanel: { position: 'top', initialState: 'collapsed' } }
                }
              const instance = await focusApi.signature(
                decode(fixture.bytes),
                target,
                config.kind === 'certificate' ? 'p7b' : 'p7s',
                context
              )
              const current = nestedSignatureTarget || target
              const shell = current.querySelector('.signature-shell'),
                panel = shell.querySelector('.signature-details-panel'),
                header = shell.querySelector(':scope > .signature-header')
              const expected =
                panel.querySelector('[data-state="invalid"],[data-state="pending"]') ||
                panel.querySelector('.signature-details-heading h3')
              const review = header.querySelectorAll('.signature-panel-actions button')[1]
              review.dataset.focusReviewTest = 'true'
              const rootShell = target.querySelector('.signature-shell')
              if (nestedSignatureTarget) rootShell.scrollTop = 30
              if (config.scrolled) {
                shell.scrollTop = 300
                panel.scrollTop = 300
              }
              document.scrollingElement.scrollTop = 80
              if (config.iframe) owner.scrollingElement.scrollTop = 50
              let events = 0
              shell.addEventListener('file-viewer-signature-panel-change', () => events++)
              const preview = shell.querySelector('.signature-preview-target')
              const visibleBounds = (node) => {
                const b = node.getBoundingClientRect()
                return {
                  top: b.top + node.clientTop,
                  left: b.left + node.clientLeft,
                  bottom: b.top + node.clientTop + node.clientHeight,
                  right: b.left + node.clientLeft + node.clientWidth
                }
              }
              const active = () => {
                let value = owner.activeElement
                while (value?.shadowRoot?.activeElement) value = value.shadowRoot.activeElement
                return value
              }
              const state = (node = expected) => {
                const bounds = visibleBounds(shell),
                  hb = header.getBoundingClientRect()
                if (
                  owner.defaultView.getComputedStyle(header).position === 'sticky' &&
                  hb.top <= bounds.top &&
                  hb.bottom > bounds.top
                )
                  bounds.top = Math.min(bounds.bottom, hb.bottom)
                const scroller = preview && focusApi.resolveFileViewerScrollContainer(preview)
                const zoom = preview && focusApi.findFileViewerZoomProvider(preview)
                return {
                  activeIsTarget: active() === node,
                  activeText: active()?.textContent?.slice(0, 240),
                  target: node.getBoundingClientRect().toJSON(),
                  bounds,
                  panelBounds: visibleBounds(panel),
                  panelOverflow: owner.defaultView.getComputedStyle(panel).overflowY,
                  shellTop: shell.scrollTop,
                  panelTop: panel.scrollTop,
                  documentTop: document.scrollingElement.scrollTop,
                  ownerTop: owner.scrollingElement.scrollTop,
                  otherTop: otherShell.scrollTop,
                  outerTop: rootShell === shell ? null : rootShell.scrollTop,
                  counts: { ...counts },
                  events,
                  hidden: panel.hidden,
                  nestedTop: scroller?.scrollTop,
                  nestedLeft: scroller?.scrollLeft,
                  zoom: zoom?.getState().scale,
                  sameNested:
                    !window.focusNested || preview?.firstElementChild === window.focusNested,
                  sameScroller: !window.focusScroller || scroller === window.focusScroller
                }
              }
              window.focusCase = {
                owner,
                review,
                warningButton: header.querySelectorAll('.signature-panel-actions button')[2],
                warning: shell.querySelector('.signature-sidebar .signature-warning'),
                shell,
                panel,
                expected,
                preview,
                state,
                instance,
                otherInstance,
                frame,
                other,
                config
              }
            },
            { config, fixture: fixtures[config.kind], missing: fixtures.missing, assets: h.assets }
          )
          if (config.kind === 'nested')
            await page.waitForFunction(
              () => focusCase.preview?.querySelector('.page')?.dataset.loaded === 'true'
            )
          if (['nested', 'xml'].includes(config.kind)) {
            await page.evaluate(async () => {
              const p = focusCase.preview
              await focusApi.findFileViewerZoomProvider(p)?.setZoom?.(0.8)
              await new Promise((r) => setTimeout(r, 250))
              const s = focusApi.resolveFileViewerScrollContainer(p)
              s.scrollTop = Math.min(120, Math.max(0, s.scrollHeight - s.clientHeight))
              window.focusNested = p.firstElementChild
              window.focusScroller = s
            })
          }
          row.before = await page.evaluate(() => focusCase.state())
          if (config.scrolled) {
            await page.evaluate(() => focusCase.review.focus({ preventScroll: true }))
            await page.keyboard.press('Enter')
          } else await page.evaluate(() => focusCase.review.click())
          await page.waitForTimeout(320)
          row.after = await page.evaluate(() => focusCase.state())
          assert.equal(row.after.activeIsTarget, true, key + ' focuses original finding/title node')
          assert.equal(row.after.hidden, false)
          for (const [lo, hi] of [
            ['top', 'bottom'],
            ['left', 'right']
          ]) {
            assert.ok(
              row.after.target[lo] >= row.after.bounds[lo],
              key + ' target starts within own visible shell'
            )
            assert.ok(
              row.after.target[hi] <= row.after.bounds[hi],
              key + ' target ends within own visible shell'
            )
          }
          if (row.after.panelOverflow === 'auto') {
            assert.ok(row.after.target.top >= row.after.panelBounds.top, key + ' within panel top')
            assert.ok(
              row.after.target.bottom <= row.after.panelBounds.bottom,
              key + ' within panel bottom'
            )
          }
          for (const key of ['documentTop', 'ownerTop', 'otherTop', 'outerTop'])
            assert.equal(row.after[key], row.before[key], row.key + ' keeps ' + key)
          assert.deepEqual(
            row.after.counts,
            row.before.counts,
            key + ' no reverify, Worker start or nested load'
          )
          assert.equal(
            row.after.events,
            config.scrolled ? 0 : 1,
            key + ' only effective expansion emits'
          )
          if (['nested', 'xml'].includes(config.kind)) {
            for (const key of [
              ...(config.scrolled || config.layout.openingBehavior !== 'push' ? ['nestedTop'] : []),
              'nestedLeft',
              'zoom',
              'sameNested',
              'sameScroller'
            ])
              assert.equal(
                row.after[key],
                row.before[key],
                row.key + ' keeps independent preview ' + key
              )
          }
          await page.evaluate(() => focusCase.review.click())
          row.repeated = await page.evaluate(() => focusCase.state())
          for (const key of [
            'shellTop',
            'panelTop',
            'documentTop',
            'ownerTop',
            'otherTop',
            'outerTop',
            'events'
          ])
            assert.equal(
              row.repeated[key],
              row.after[key],
              row.key + ' already-visible review does not scroll ' + key
            )
          if (
            config.kind !== 'missing' ||
            (!config.iframe && !config.shadow && !config.scrolled && config.width === 320)
          )
            await page.screenshot({ path: path.join(output, key + '.png') })
          row.warning = await page.evaluate(() => {
            if (!focusCase.warningButton) return null
            focusCase.warningButton.click()
            return focusCase.state(focusCase.warning)
          })
          if (row.warning) {
            assert.equal(
              row.warning.activeIsTarget,
              true,
              key + ' focuses the existing permanent warning'
            )
            assert.ok(
              row.warning.target.top >= row.warning.bounds.top &&
                row.warning.target.bottom <= row.warning.bounds.bottom,
              key + ' warning is visible in its owned shell'
            )
            for (const field of [
              'documentTop',
              'ownerTop',
              'otherTop',
              'outerTop',
              'events',
              'nestedTop',
              'nestedLeft',
              'zoom'
            ])
              assert.equal(
                row.warning[field],
                row.repeated[field],
                key + ' warning navigation preserves ' + field
              )
            assert.deepEqual(row.warning.counts, row.repeated.counts)
          }
          if (
            ['nested', 'xml'].includes(config.kind) &&
            !config.scrolled &&
            config.layout.openingBehavior === 'push'
          ) {
            // Opening push legitimately invokes the accepted bounded reading
            // adjustment. Compare Review with an ordinary toggle at the exact
            // same original scroll state, rather than imposing a new 0px rule.
            row.toggleOnlyControl = await page.evaluate(async (before) => {
              const toggle = focusCase.shell.querySelector(
                ':scope > .signature-header [aria-controls]'
              )
              toggle.click()
              await new Promise((resolve) => setTimeout(resolve, 320))
              focusCase.shell.scrollTop = before.shellTop
              focusCase.panel.scrollTop = before.panelTop
              const scroller = focusApi.resolveFileViewerScrollContainer(focusCase.preview)
              scroller.scrollTop = before.nestedTop
              scroller.scrollLeft = before.nestedLeft
              toggle.click()
              await new Promise((resolve) => setTimeout(resolve, 320))
              return focusCase.state()
            }, row.before)
            assert.equal(
              row.after.nestedTop,
              row.toggleOnlyControl.nestedTop,
              key + ' Review has the same independent scroll outcome as toggle-only'
            )
            assert.deepEqual(row.toggleOnlyControl.counts, row.after.counts)
            assert.equal(row.toggleOnlyControl.events, row.repeated.events + 2)
          }
          row.passed = true
        } catch (error) {
          row.error = error.stack
          await page.screenshot({ path: path.join(output, key + '-failure.png') })
          throw error
        } finally {
          await page.close()
          await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
        }
      }
      assert.deepEqual(h.errors, [])
      assert.deepEqual(h.external, [])
    } finally {
      await h.close()
    }
  }
  report.passed = true
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(
  `Signature review focus: ${report.cases.length} actual cases passed (${installedRoot ? 'installed' : 'source'}).`
)
