import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { launchBrowserForTest } from '../../../build-support/browser-test-launch.mjs'

const workspace = fileURLToPath(new URL('../../../../', import.meta.url))
const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
const demoRequire = createRequire(new URL('../../../../apps/viewer-demo/package.json', import.meta.url))
const { build } = demoRequire('esbuild')
const baseline = process.env.PATCH_LAYOUT_EXPECT_BROKEN === '1'
const sourceRef = process.env.PATCH_LAYOUT_SOURCE_REF || (baseline ? 'HEAD' : null)
const artifacts = process.env.PATCH_LAYOUT_ARTIFACTS
const synthetic = `diff --git a/config.ts b/config.ts
index 83db48f..bf43abc 100644
--- a/config.ts
+++ b/config.ts
@@ -1,4 +1,5 @@
 export const preview = {
-  mode: "standard",
+  mode: "full",
   locale: "zh-CN",
+  toolbar: false,
 };
`

const makePatch = (name, lines) => {
  const oldCount = lines.filter(line => !line.startsWith('+')).length
  const newCount = lines.filter(line => !line.startsWith('-')).length
  return `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n@@ -1,${oldCount} +1,${newCount} @@\n${lines.join('\n')}\n`
}
const longLine = `\t  const longValue = "${'long content with spaces '.repeat(75)}END";`
const edge = makePatch('alignment.ts', [
  ' export const config = {',
  '-  obsolete: true,',
  '-  stableName: "before",',
  '+  stableName: "after",',
  ' ',
  '+',
  `+${longLine}`,
  ' \t  unchanged: true,',
  '-  removed: true,',
  '-  removedAgain: true,',
  ' };'
])

const near = (actual, expected, message, tolerance = 1) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`)
}

test('issue #304: actual diff2html keeps patch panes and source rows aligned', async t => {
  const patchSource = sourceRef
    ? execFileSync('git', ['show', `${sourceRef}:packages/renderers/text/src/patch.ts`], { cwd: workspace, encoding: 'utf8' })
    : await readFile(new URL('../src/patch.ts', import.meta.url), 'utf8')
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import renderPatch from './src/patch.ts';
        import { registerFileViewerDiffToHtml } from './src/optionalCapabilities.ts';
        import { findFileViewerZoomProvider } from '@file-viewer/core';
        import { html } from 'diff2html';
        registerFileViewerDiffToHtml((input, options) => {
          window.patchOptions = options;
          return html(input, options);
        });
        let instance;
        let target;
        window.mountPatch = async ({ source, isolation, theme, width = 1234 }) => {
          if (instance) await instance.unmount();
          document.body.replaceChildren();
          document.body.style.margin = '0';
          const host = document.createElement('div');
          host.style.width = width + 'px';
          document.body.append(host);
          const scope = isolation === 'shadow' ? host.attachShadow({ mode: 'open' }) : host;
          target = document.createElement('div');
          target.dataset.viewerTheme = theme;
          scope.append(target);
          instance = await renderPatch(new TextEncoder().encode(source).buffer, target);
          window.patchTarget = target;
          window.patchZoom = scale => findFileViewerZoomProvider(target).setZoom(scale);
          window.patchTheme = theme => { target.dataset.viewerTheme = theme; };
          window.patchWidth = width => { host.style.width = width + 'px'; };
          window.unmountPatch = async () => {
            const root = instance.$el;
            await instance.unmount();
            return { children: target.childElementCount, provider: !!findFileViewerZoomProvider(root) };
          };
        };
        window.measurePatch = () => {
          const rect = element => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          };
          const root = target.querySelector('.patch-viewer');
          return {
            options: window.patchOptions,
            theme: { background: getComputedStyle(root).backgroundColor, color: getComputedStyle(root).color },
            viewportOverflow: document.documentElement.scrollWidth > window.innerWidth,
            body: { clientWidth: target.querySelector('.patch-body').clientWidth, scrollWidth: target.querySelector('.patch-body').scrollWidth },
            files: Array.from(target.querySelectorAll('.d2h-files-diff'), file => ({
              panes: Array.from(file.querySelectorAll('.d2h-file-side-diff'), pane => ({
                ...rect(pane), clientWidth: pane.clientWidth, scrollWidth: pane.scrollWidth,
                rows: Array.from(pane.querySelectorAll('tr'), row => {
                  const number = row.querySelector('.d2h-code-side-linenumber');
                  const code = row.querySelector('.d2h-code-side-line');
                  const content = row.querySelector('.d2h-code-line-ctn');
                  const prefix = row.querySelector('.d2h-code-line-prefix');
                  return {
                    ...rect(row),
                    lineHeight: parseFloat(getComputedStyle(row).lineHeight),
                    number: number?.textContent.trim() || '',
                    text: content?.textContent || '',
                    prefix: prefix?.textContent || '',
                    empty: !!row.querySelector('.d2h-emptyplaceholder'),
                    info: !!row.querySelector('.d2h-info'),
                    kind: row.lastElementChild.className,
                    codeWhiteSpace: code && getComputedStyle(code).whiteSpace,
                    contentWhiteSpace: content && getComputedStyle(content).whiteSpace,
                    contentX: content && rect(content).x,
                    numberRight: number && rect(number).x + rect(number).width,
                    numberPadding: number && getComputedStyle(number).paddingRight,
                    background: getComputedStyle(row.lastElementChild).backgroundColor,
                    highlights: Array.from(row.querySelectorAll('ins,del'), element => ({
                      text: element.textContent, color: getComputedStyle(element).color,
                      background: getComputedStyle(element).backgroundColor,
                      decoration: getComputedStyle(element).textDecorationLine
                    }))
                  };
                })
              }))
            }))
          };
        };
      `,
      resolveDir: packageRoot,
      sourcefile: 'issue-304-harness.js'
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    logLevel: 'silent',
    plugins: [{
      name: 'patch-source-snapshot',
      setup(builder) {
        builder.onLoad({ filter: /\/src\/patch\.ts$/ }, () => ({ contents: patchSource, loader: 'ts' }))
      }
    }]
  })
  const browser = await launchBrowserForTest(chromium, 'chromium', { headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  const requests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => requests.push(request.url()))
  const results = []
  const scrollChecks = []
  let completedCases = 0
  try {
    await page.setContent('<!doctype html><html><head></head><body></body></html>')
    await page.addScriptTag({ content: outputFiles[0].text })
    const fixtures = {
      synthetic,
      repository: await readFile(new URL('../../../../apps/viewer-demo/public/example/change.patch', import.meta.url), 'utf8'),
      edge
    }
    if (artifacts) await mkdir(artifacts, { recursive: true })
    for (const isolation of ['light', 'shadow']) {
      for (const [fixture, source] of Object.entries(fixtures)) {
        await t.test(`${isolation} DOM / ${fixture}`, async () => {
          await page.evaluate(options => window.mountPatch(options), { source, isolation, theme: 'light' })
          const initial = await page.evaluate(() => window.measurePatch())
          assert.equal(initial.files.length, fixture === 'repository' ? 2 : 1, 'actual diff markup is rendered')
          if (baseline) {
            for (const { panes: [left, right] } of initial.files) {
              near(left.x, right.x, 'old panes are vertically stacked')
              assert.ok(right.y >= left.y + left.height - 1)
              const row = left.rows.find(row => row.number && row.text)
              assert.ok(row.height > 80, `old ordinary row height: ${row.height}`)
            }
            results.push({ isolation, fixture, scale: 1, themeName: 'light', ...initial })
            if (artifacts && fixture === 'synthetic') {
              await page.screenshot({ path: resolve(artifacts, `${isolation}-before.png`), fullPage: true })
            }
            completedCases++
            return
          }
          assert.equal(initial.options.matching, 'lines')
          assert.equal(initial.options.outputFormat, 'side-by-side')
          for (const scale of [0.6, 1, 1.5, 2.4]) {
            const state = await page.evaluate(scale => window.patchZoom(scale), scale)
            assert.equal(state.scale, scale)
            for (const theme of ['light', 'dark']) {
              await page.evaluate(theme => window.patchTheme(theme), theme)
              const measured = await page.evaluate(() => window.measurePatch())
              results.push({ isolation, fixture, scale, themeName: theme, ...measured })
              assert.equal(measured.theme.background, theme === 'dark' ? 'rgb(13, 17, 23)' : 'rgb(246, 248, 250)')
              assert.equal(measured.theme.color, theme === 'dark' ? 'rgb(230, 237, 243)' : 'rgb(36, 41, 47)')
              assert.equal(measured.viewportOverflow, false)
              for (const { panes: [left, right] } of measured.files) {
                near(left.y, right.y, 'panes share the same top')
                near(right.x, left.x + left.width, 'panes are adjacent')
                near(left.width, right.width, 'panes have equal width')
                assert.equal(left.rows.length, right.rows.length)
                for (let index = 0; index < left.rows.length; index++) {
                  const a = left.rows[index]
                  const b = right.rows[index]
                  near(a.y, b.y, `paired row ${index} top`)
                  near(a.height, b.height, `paired row ${index} height`)
                  for (const row of [a, b]) {
                    near(row.height, row.lineHeight, `row ${index} occupies one visual line`)
                    near(row.lineHeight, 13 * scale * 1.58, 'zoom scales line height')
                    assert.equal(row.numberPadding, '8px', 'line numbers retain their gutter padding')
                    if (row.text) {
                      assert.equal(row.contentWhiteSpace, 'pre')
                      assert.ok(row.contentX > row.numberRight, 'source does not overlap the line number')
                    }
                    if (row.kind.includes('d2h-ins')) {
                      assert.equal(row.background, theme === 'dark' ? 'rgba(46, 160, 67, 0.26)' : 'rgb(218, 251, 225)')
                    }
                    if (row.kind.includes('d2h-del')) {
                      assert.equal(row.background, theme === 'dark' ? 'rgba(248, 81, 73, 0.24)' : 'rgb(255, 235, 233)')
                    }
                  }
                }
              }
              if (fixture === 'edge') {
                const [left, right] = measured.files[0].panes
                const changed = left.rows.findIndex(row => row.text.includes('stableName'))
                assert.match(right.rows[changed].text, /stableName: "after"/)
                assert.ok(left.rows.some(row => row.empty) && right.rows.some(row => row.empty))
                assert.ok(left.rows.some(row => row.number && row.text === ''))
                assert.ok(right.rows.some(row => row.number && row.text === ''))
                assert.ok(right.rows.some(row => row.text === longLine), 'long source text is preserved')
                assert.ok(right.scrollWidth > right.clientWidth, 'long line scrolls within its pane')
              }
              if (artifacts && scale === 1 && (fixture === 'synthetic' || fixture === 'edge')) {
                await page.screenshot({ path: resolve(artifacts, `${isolation}-${fixture}-${theme}-after.png`), fullPage: true })
              }
            }
          }
          if (fixture === 'edge') {
            const scrolled = await page.evaluate(() => {
              const pane = window.patchTarget.querySelectorAll('.d2h-file-side-diff')[1]
              pane.scrollLeft = pane.scrollWidth
              const content = Array.from(pane.querySelectorAll('.d2h-code-line-ctn')).find(element => element.textContent.includes('longValue'))
              const contentRight = content.getBoundingClientRect().right
              const cellRight = content.closest('td').getBoundingClientRect().right
              const paneRight = pane.getBoundingClientRect().right
              return { scrollLeft: pane.scrollLeft, contentRight, cellRight, paneRight }
            })
            assert.ok(scrolled.scrollLeft > 0, 'can actually scroll to the end of the long line')
            assert.ok(scrolled.contentRight <= scrolled.paneRight, 'long-line suffix is reachable')
            assert.ok(scrolled.cellRight >= scrolled.contentRight, 'change background covers the full long line')
            scrollChecks.push({ isolation, ...scrolled })
            if (artifacts) {
              await page.screenshot({ path: resolve(artifacts, `${isolation}-edge-scrolled-after.png`), fullPage: true })
            }
          }
          await page.evaluate(() => { window.patchWidth(390); window.patchZoom(1); window.patchTheme('system') })
          for (const colorScheme of ['light', 'dark']) {
            await page.emulateMedia({ colorScheme })
            const measured = await page.evaluate(() => window.measurePatch())
            results.push({ isolation, fixture, scale: 1, themeName: 'system', colorScheme, width: 390, ...measured })
            assert.equal(measured.theme.background, colorScheme === 'dark' ? 'rgb(13, 17, 23)' : 'rgb(246, 248, 250)')
            assert.ok(measured.body.scrollWidth > measured.body.clientWidth, 'narrow viewer scrolls locally')
            assert.equal(measured.viewportOverflow, false)
            for (const { panes: [left, right] } of measured.files) near(left.y, right.y, 'narrow viewer keeps columns')
          }
          assert.deepEqual(await page.evaluate(() => window.unmountPatch()), { children: 0, provider: false })
          completedCases++
        })
      }
    }
    assert.equal(completedCases, 6, 'all fixture and isolation combinations pass')
    assert.deepEqual(errors, [], 'no browser exceptions')
    assert.deepEqual(requests, [], 'no external requests or CDN styles')
    if (artifacts) {
      await writeFile(resolve(artifacts, baseline ? 'before.json' : 'after.json'), JSON.stringify({
        passed: true,
        baseline,
        sourceRef,
        head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim(),
        patchSourceSha256: createHash('sha256').update(patchSource).digest('hex'),
        bundleSha256: createHash('sha256').update(outputFiles[0].contents).digest('hex'),
        browser: browser.version(),
        diff2html: require('diff2html/package.json').version,
        errors, requests, scrollChecks, results
      }, null, 2))
    }
    t.diagnostic(JSON.stringify({ baseline, browser: browser.version(), scenarios: results.length, diff2html: require('diff2html/package.json').version }))
  } finally {
    await browser.close()
  }
})
