// Actual signed nested XML and independently sized signature hosts.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
import { createPdfReviewHarness } from '../../../pdf/scripts/pdf-review-harness.mjs'
const root = path.resolve(import.meta.dirname, '../../../../..')
const output = path.resolve(process.env.SIGNATURE_HOSTS_OUTPUT || 'output/signature-panel-hosts')
const fixtures = path.resolve(
  process.env.SIGNATURE_PANEL_DEEP_FIXTURES || 'output/signature-panel-fixtures'
)
const installedRoot =
  process.env.SIGNATURE_PANEL_INSTALLED_ROOT &&
  (await realpath(process.env.SIGNATURE_PANEL_INSTALLED_ROOT))
const require = createRequire(path.join(installedRoot || root, 'package.json'))
const source = installedRoot
  ? require.resolve('@file-viewer/renderer-signature')
  : path.join(root, 'packages/renderers/signature/src/signature.ts')
const code = installedRoot
  ? require.resolve('@file-viewer/renderer-text')
  : path.join(root, 'packages/renderers/text/src/code.ts')
const baseline = process.env.SIGNATURE_PANEL_BASELINE_SOURCE
const bundle = await build({
  ...(!installedRoot
    ? { alias: { '@file-viewer/core': path.join(root, 'packages/core/src/index.ts') } }
    : {}),
  absWorkingDir: installedRoot || root,
  stdin: {
    resolveDir: installedRoot || path.join(root, 'packages/renderers/signature'),
    contents: `${installedRoot ? `import {renderFileViewerSignature as signature} from ${JSON.stringify(source)}; import {renderFileViewerCode as code} from ${JSON.stringify(code)};` : `import signature from ${JSON.stringify(source)}; import code from ${JSON.stringify(code)};`} ${baseline ? `import baseline from ${JSON.stringify(path.resolve(baseline))};` : 'const baseline = undefined;'} window.hostReview={signature,code,baseline};`
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
await mkdir(output, { recursive: true })
const bytes = (await readFile(path.join(fixtures, 'reading.xml.p7m'))).toString('base64')
const nested = (await readFile(path.join(fixtures, 'reading.xml.p7m.p7m'))).toString('base64')
const report = {
  passed: false,
  installedRoot: installedRoot || null,
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
      for (const viewport of [1400, 360])
        for (const legacy of baseline ? [true, false] : [false]) {
          const page = await h.newPage({ width: viewport, height: 1000 })
          try {
            await page.addScriptTag({ type: 'module', content: bundle.outputFiles[0].text })
            await page.waitForFunction(() => !!window.hostReview)
            const row = await page.evaluate(
              async ({ bytes, nested, legacy, viewport }) => {
                const host = document.getElementById('host')
                host.style.cssText = 'width:100%;height:100%'
                host.replaceChildren()
                const render = legacy ? hostReview.baseline : hostReview.signature
                const decode = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0)).buffer
                const sizes = viewport === 1400 ? [1280, 320] : [320]
                window.hostInstances = []
                const measures = []
                for (const width of sizes) {
                  const target = document.createElement('div')
                  target.style.cssText = `width:${width}px;height:900px;margin-bottom:20px`
                  host.append(target)
                  let count = 0
                  const context = {
                    filename: 'reading.xml.p7m',
                    options: { locale: 'en-US', text: { wrapLongLines: true, lineNumbers: true } },
                    renderNestedBuffer: async (data, type, target, ctx) => {
                      count++
                      return hostReview.code(data, target, type, ctx)
                    }
                  }
                  const result = await render(decode(bytes), target, 'p7m', context)
                  hostInstances.push(result)
                  const shell = target.querySelector('.signature-shell'),
                    content = shell.querySelector('.signature-content'),
                    preview = shell.querySelector('.signature-preview-target')
                  measures.push({
                    width,
                    shellWidth: shell.clientWidth,
                    shellHeight: shell.clientHeight,
                    scrollWidth: shell.scrollWidth,
                    columns: getComputedStyle(content).gridTemplateColumns,
                    previewWidth: preview.clientWidth,
                    previewHeight: preview.clientHeight,
                    nestedCount: count
                  })
                }
                let nestedMeasure
                if (!legacy && viewport === 1400) {
                  const target = document.createElement('div')
                  target.style.cssText = 'width:1280px;height:900px'
                  host.append(target)
                  let signatureCalls = 0,
                    codeCalls = 0
                  const context = {
                    filename: 'reading.xml.p7m.p7m',
                    options: { locale: 'en-US', text: { wrapLongLines: true, lineNumbers: true } },
                    renderNestedBuffer: async (data, type, target, ctx) => {
                      if (type === 'p7m') {
                        signatureCalls++
                        target.style.width = '320px'
                        return render(data, target, type, ctx)
                      }
                      codeCalls++
                      return hostReview.code(data, target, type, ctx)
                    }
                  }
                  const result = await render(decode(nested), target, 'p7m', context)
                  hostInstances.push(result)
                  const shells = [...target.querySelectorAll('.signature-shell')]
                  nestedMeasure = {
                    signatureCalls,
                    codeCalls,
                    shells: shells.map((shell) => ({
                      width: shell.clientWidth,
                      height: shell.clientHeight,
                      columns: getComputedStyle(shell.querySelector(':scope > .signature-content'))
                        .gridTemplateColumns
                    }))
                  }
                }
                return { legacy, viewport, measures, nestedMeasure }
              },
              { bytes, nested, legacy, viewport }
            )
            report.cases.push({ browserName, ...row })
            for (const m of row.measures) {
              assert.equal(m.nestedCount, 1)
              assert.equal(m.shellHeight, 900)
              assert.equal(
                m.columns.trim().split(/\s+/).length,
                legacy && viewport === 1400 ? 2 : m.width > 860 ? 2 : 1
              )
              if (!legacy) assert.ok(m.scrollWidth <= m.shellWidth + 1)
              if (legacy && viewport === 1400 && m.width === 320)
                assert.ok(
                  m.scrollWidth > m.shellWidth,
                  'captures the old narrow-host overflow defect'
                )
            }
            if (row.nestedMeasure) {
              assert.equal(row.nestedMeasure.signatureCalls, 1)
              assert.equal(row.nestedMeasure.codeCalls, 1)
              assert.equal(row.nestedMeasure.shells.length, 2)
              assert.equal(row.nestedMeasure.shells[0].columns.trim().split(/\s+/).length, 2)
              assert.equal(row.nestedMeasure.shells[1].columns.trim().split(/\s+/).length, 1)
            }
            await page.screenshot({
              path: path.join(
                output,
                `${browserName}-${viewport}-${legacy ? 'baseline' : 'candidate'}.png`
              ),
              fullPage: true
            })
            await page.evaluate(async () => {
              for (const instance of hostInstances) await instance.unmount()
            })
          } finally {
            await page.close()
          }
        }
      if (baseline) {
        const rows = report.cases.filter(
          (x) => x.browserName === browserName && x.viewport === 1400
        )
        const old = rows.find((x) => x.legacy).measures[0],
          next = rows.find((x) => !x.legacy).measures[0]
        for (const key of ['shellWidth', 'shellHeight', 'previewWidth', 'previewHeight'])
          assert.equal(
            next[key],
            old[key],
            `normal host ${key} is unchanged by inline-size containment`
          )
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
console.log(`Signature host-local layout: ${report.cases.length} cases passed`)
