import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runUnits } from '../test/compatibility-review/unit.mjs'
import { markdownFixture, makeDocument } from '../test/compatibility-review/fixtures.mjs'

const root = path.resolve(import.meta.dirname, '..')
const rootRequire = createRequire(path.join(root, 'package.json'))
const pptxRequire = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))
const { build } = pptxRequire('esbuild')
const { JSDOM } = rootRequire('jsdom')
const JSZip = pptxRequire('jszip')
const output = path.resolve(
  process.env.COMPATIBILITY_EVIDENCE_DIR || path.join(root, 'output/compatibility-review')
)
await mkdir(output, { recursive: true })
const temporary = await mkdtemp(path.join(output, 'work-'))
const checks = []
async function check(name, run) {
  try {
    await run()
    checks.push({ name, status: 'pass' })
    console.log('PASS ' + name)
  } catch (error) {
    checks.push({ name, status: 'fail', error: String(error) })
    throw error
  }
}
const previousSelf = globalThis.self,
  previousPostMessage = globalThis.postMessage
let browser
try {
  globalThis.self = globalThis
  globalThis.postMessage = () => {}
  await build({
    entryPoints: [path.join(root, 'test/compatibility-review/entry.ts')],
    outfile: path.join(temporary, 'unit.mjs'),
    bundle: true,
    plugins: [
      {
        name: 'node-fixture-package-ownership',
        setup(builder) {
          builder.onResolve({ filter: /^[^./]/ }, async (args) => {
            if (args.pluginData?.resolvedByOwner) return
            // Keep packages external, but resolve them from their original importer.
            // Moving the bundle to output/ must not change which package owns a dependency.
            const resolved = await builder.resolve(args.path, {
              resolveDir: args.resolveDir,
              kind: args.kind,
              pluginData: { resolvedByOwner: true }
            })
            if (resolved.errors.length) return { errors: resolved.errors }
            return {
              path: path.isAbsolute(resolved.path)
                ? pathToFileURL(resolved.path).href
                : resolved.path,
              external: true
            }
          })
        }
      }
    ],
    platform: 'node',
    format: 'esm',
    logLevel: 'silent'
  })
  const api = await import(pathToFileURL(path.join(temporary, 'unit.mjs')))
  const units = await runUnits(api, JSDOM, JSZip, check)
  if (!process.argv.includes('--unit')) {
    const { chromium } = rootRequire('playwright')
    await build({
      entryPoints: [path.join(root, 'test/compatibility-review/browser.ts')],
      outfile: path.join(temporary, 'browser.js'),
      bundle: true,
      platform: 'browser',
      format: 'iife',
      nodePaths: [path.join(root, 'packages/renderers/pptx/node_modules')],
      logLevel: 'warning'
    })
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
    })
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
    page.setDefaultTimeout(8000)
    const errors = [],
      requests = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url())
    })
    await page.setContent(
      '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;font-family:Arial}#host{width:100%;height:100%;overflow:auto}</style></head><body><div id="host"></div></body></html>'
    )
    await page.addScriptTag({ content: await readFile(path.join(temporary, 'browser.js'), 'utf8') })

    await check(
      'Chromium: real PPTX parser output and chart library keep slide frames',
      async () => {
        await page.evaluate(async (messages) => {
          const host = document.getElementById('host')
          host.className = 'flyfish-pptx-content'
          const style = document.createElement('style')
          style.textContent =
            review.pptxViewerCss + '\n' + messages.find((m) => m.type === 'globalCSS').data
          document.head.append(style)
          host.innerHTML = messages
            .filter((m) => m.type === 'slide')
            .map((m) => m.data)
            .join('')
          window.chartHandle = await review.renderPptxPostProcessing(
            messages.find((m) => m.type === 'ExecutionTime').charts,
            host
          )
        }, units.presentations.standard.messages)
        await page.waitForFunction(() => document.querySelectorAll('.bb-line').length > 0, null, {
          timeout: 10000
        })
        const geometry = await page.evaluate(() => ({
          slides: document.querySelectorAll('#host > .slide').length,
          nested: document.querySelectorAll('.slide .slide').length,
          charts: [...document.querySelectorAll('.slide [id^="chart"]')].map((c) => ({
            position: getComputedStyle(c).position,
            top: c.offsetTop,
            left: c.offsetLeft,
            expectedTop: parseFloat(c.style.top),
            expectedLeft: parseFloat(c.style.left),
            surface: c.querySelector('.pptx-chart-surface') !== null
          })),
          fills: [...document.querySelectorAll('.bb-line')].map((p) => getComputedStyle(p).fill),
          border: getComputedStyle(document.querySelector('td')).borderTopWidth,
          cells: [...document.querySelectorAll('#host > .slide:first-child td')].map((cell) => {
            const text = cell.querySelector('span') || cell
            const style = getComputedStyle(cell)
            const rowStyle = getComputedStyle(cell.parentElement)
            const background =
              style.backgroundColor === 'rgba(0, 0, 0, 0)'
                ? rowStyle.backgroundColor
                : style.backgroundColor
            return {
              background,
              color: getComputedStyle(text).color,
              text: cell.textContent.trim()
            }
          })
        }))
        assert.equal(geometry.slides, 3)
        assert.equal(geometry.nested, 0)
        assert.equal(geometry.charts.length, 2)
        for (const c of geometry.charts) {
          assert.equal(c.position, 'absolute')
          assert.equal(c.surface, true)
          assert.ok(Math.abs(c.top - c.expectedTop) < 1)
          assert.ok(Math.abs(c.left - c.expectedLeft) < 1)
        }
        assert.deepEqual(geometry.fills, ['none'])
        assert.ok(parseFloat(geometry.border) > 0)
        assert.equal(geometry.cells.length, 6)
        for (const cell of geometry.cells) {
          assert.ok(cell.text.length > 0)
          assert.notEqual(cell.background, cell.color, 'table text must remain readable')
        }
        assert.notEqual(
          geometry.cells[2].background,
          geometry.cells[3].background,
          'first-column styling must not leak into the second column'
        )
        await writeFile(path.join(output, 'chart-geometry.json'), JSON.stringify(geometry, null, 2))
        await page
          .locator('#host > .slide')
          .nth(1)
          .screenshot({ path: path.join(output, 'pptx-charts.png') })
        await page
          .locator('#host > .slide')
          .nth(0)
          .screenshot({ path: path.join(output, 'pptx-table.png') })
        await page.evaluate(() => {
          chartHandle.destroy()
          chartHandle.destroy()
        })
        assert.equal(await page.locator('.pptx-chart-surface').count(), 0)
      }
    )

    await check(
      'Chromium: Markdown rendering, Unicode TOC and independent host scrolling',
      async () => {
        await page.evaluate(async (content) => {
          const host = document.getElementById('host')
          host.className = ''
          host.scrollTop = 0
          host.innerHTML =
            '<div id="md-one" style="height:280px"></div><div id="md-two" style="height:280px"></div>'
          window.md1 = await review.renderMarkdown(
            new TextEncoder().encode(content).buffer,
            document.getElementById('md-one')
          )
          window.md2 = await review.renderMarkdown(
            new TextEncoder().encode(content).buffer,
            document.getElementById('md-two')
          )
        }, markdownFixture)
        const link = page.locator('#md-one').getByRole('link', { name: 'Unicode heading' })
        await link.click()
        const scrolled = await page.evaluate(() => ({
          first: document.querySelector('#md-one .markdown-viewer').scrollTop,
          second: document.querySelector('#md-two .markdown-viewer').scrollTop,
          hash: location.hash,
          focus: document.activeElement.id
        }))
        assert.ok(scrolled.first > 100)
        assert.equal(scrolled.second, 0)
        assert.equal(scrolled.hash, '')
        assert.equal(scrolled.focus, '章节-一')
        await page.screenshot({ path: path.join(output, 'markdown-anchors.png') })
        await page.evaluate(() => {
          md1.unmount()
          md2.unmount()
        })
      }
    )

    await page.evaluate(() => {
      const host = document.getElementById('host')
      host.innerHTML =
        '<div id="pan" style="width:600px;height:280px;overflow:auto;cursor:crosshair;user-select:text"><div style="width:1800px;height:1400px;position:relative;background:linear-gradient(#edf4fa,#d2e2ef)"><button id="control" style="position:absolute;left:10px;top:10px">Control</button><input id="field" style="position:absolute;left:10px;top:70px" aria-label="Form field"></div></div>'
      window.pan = document.getElementById('pan')
      window.stopPan = review.installPdfHandTool(pan)
      window.clicks = 0
      document.getElementById('control').onclick = () => clicks++
    })
    await check(
      'Chromium: PDF hand tool moves scroll position using real mouse input',
      async () => {
        await page.mouse.move(400, 200)
        await page.mouse.down()
        await page.mouse.move(260, 100, { steps: 6 })
        await page.mouse.up()
        const state = await page.evaluate(() => ({
          x: pan.scrollLeft,
          y: pan.scrollTop,
          cursor: pan.style.cursor,
          selection: pan.style.userSelect
        }))
        assert.ok(state.x >= 130 && state.y >= 90)
        assert.equal(state.cursor, 'grab')
        assert.equal(state.selection, 'text')
      }
    )
    await check(
      'Chromium: PDF hand tool preserves controls, touch and modifier gestures',
      async () => {
        await page.evaluate(() => {
          pan.scrollTop = 0
          pan.scrollLeft = 0
        })
        await page.locator('#control').click()
        assert.equal(await page.evaluate(() => clicks), 1)
        await page.locator('#field').fill('Native field')
        assert.equal(await page.locator('#field').inputValue(), 'Native field')
        const allowed = await page.evaluate(() =>
          ['touch', 'pen'].map((pointerType) => {
            const e = new PointerEvent('pointerdown', {
              pointerType,
              button: 0,
              isPrimary: true,
              bubbles: true,
              cancelable: true,
              clientX: 100,
              clientY: 100
            })
            pan.dispatchEvent(e)
            return !e.defaultPrevented
          })
        )
        assert.deepEqual(allowed, [true, true])
        await page.keyboard.down('Shift')
        await page.mouse.move(400, 200)
        await page.mouse.down()
        await page.mouse.move(280, 140)
        await page.mouse.up()
        await page.keyboard.up('Shift')
        assert.equal(await page.evaluate(() => pan.scrollTop), 0)
      }
    )
    await check('Chromium: PDF hand tool cancels active drag on disposal', async () => {
      await page.mouse.move(400, 200)
      await page.mouse.down()
      await page.mouse.move(350, 170)
      const before = await page.evaluate(() => {
        stopPan()
        return { x: pan.scrollLeft, y: pan.scrollTop }
      })
      await page.mouse.move(270, 100)
      await page.mouse.up()
      assert.deepEqual(await page.evaluate(() => ({ x: pan.scrollLeft, y: pan.scrollTop })), before)
      assert.equal(await page.evaluate(() => pan.style.cursor), 'crosshair')
      assert.equal(await page.evaluate(() => pan.style.userSelect), 'text')
    })

    await check(
      'Chromium: DOC layout keeps asymmetric grid, middle alignment and vertical glyphs',
      async () => {
        await page.evaluate(
          ({ html, css }) => {
            const host = document.getElementById('host')
            host.innerHTML = '<style>' + css + '</style>' + html
            host.scrollTop = 0
          },
          { html: units.tableHtml, css: units.tableCss }
        )
        const layout = await page.evaluate(() => {
          const table = document.querySelector('.msdoc-table')
          const r = table.rows[1]
          const rect = table.getBoundingClientRect()
          return {
            widths: [...r.cells].map((c) => c.getBoundingClientRect().width),
            alignment: getComputedStyle(r.cells[0]).verticalAlign,
            writing: getComputedStyle(table.querySelector('.msdoc-cell-vertical')).writingMode,
            left: rect.left,
            right: rect.right,
            viewport: document.getElementById('host').clientWidth
          }
        })
        assert.equal(layout.alignment, 'middle')
        assert.equal(layout.writing, 'vertical-rl')
        assert.ok(layout.widths[1] < layout.widths[2])
        assert.ok(Math.abs(layout.left - (layout.viewport - layout.right)) < 2)
        await page.screenshot({ path: path.join(output, 'doc-table.png') })
      }
    )

    await check('Chromium: actual DOCX pagination completes before page framing', async () => {
      const bytes = await makeDocument(JSZip)
      await page.evaluate(async (base64) => {
        const host = document.getElementById('host')
        host.innerHTML = ''
        host.scrollTop = 0
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        window.docxInstance = await review.renderDocx(bytes.buffer, host, {
          filename: 'pagination.docx',
          options: {
            docx: {
              useWorker: false,
              visualPagination: true,
              awaitLayout: false,
              maxDynamicPaginationPasses: 64
            }
          }
        })
      }, Buffer.from(bytes).toString('base64'))
      await page.waitForFunction(
        () => {
          const w = document.querySelector('.docx-wrapper')
          return (
            w?.dataset.docxPaginated === 'true' &&
            !w.dataset.docxPaginating &&
            !w.dataset.docxPaginationScheduled &&
            w.querySelectorAll(':scope > .docx-page-frame').length > 1
          )
        },
        null,
        { timeout: 20000 }
      )
      const state = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('.docx-page-frame')]
        return {
          pages: document.querySelectorAll('section.docx').length,
          frames: frames.length,
          children: frames.map((f) => f.querySelectorAll('section.docx').length),
          positions: frames.map((f) => {
            const r = f.firstElementChild.getBoundingClientRect()
            return [r.top, r.bottom]
          }),
          text: document.getElementById('host').textContent
        }
      })
      assert.ok(state.pages > 1)
      assert.equal(state.pages, state.frames)
      assert.ok(state.children.every((n) => n === 1))
      for (let i = 1; i < state.positions.length; i++)
        assert.ok(state.positions[i][0] >= state.positions[i - 1][1])
      assert.ok(state.text.includes('Paragraph 1:'))
      assert.ok(state.text.includes('Paragraph 65:'))
      await writeFile(
        path.join(output, 'docx-pagination.json'),
        JSON.stringify(
          { pages: state.pages, frames: state.frames, positions: state.positions },
          null,
          2
        )
      )
      await page.screenshot({ path: path.join(output, 'docx-pagination.png') })
      await page.evaluate(() => docxInstance.unmount())
      assert.equal(await page.locator('.docx-page-frame').count(), 0)
    })
    await check('Chromium: no unhandled browser errors or external HTTP requests', () => {
      assert.deepEqual(errors, [])
      assert.deepEqual(requests, [])
    })
  }
  await writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(
      {
        mode: process.argv.includes('--unit') ? 'unit' : 'unit-and-browser',
        checks,
        passed: checks.length
      },
      null,
      2
    )
  )
  console.log(`Compatibility review: ${checks.length} checks passed.`)
} catch (error) {
  await writeFile(
    path.join(output, 'report.json'),
    JSON.stringify({ checks, error: String(error) }, null, 2)
  )
  throw error
} finally {
  await browser?.close()
  globalThis.self = previousSelf
  globalThis.postMessage = previousPostMessage
  await rm(temporary, { recursive: true, force: true })
}
