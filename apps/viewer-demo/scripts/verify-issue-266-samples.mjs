import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { chromium } from 'playwright'

// Supply the original public issue ZIP. No document or dependency is downloaded.
const input = process.argv[2]
assert.ok(input && !input.startsWith('--'), 'Pass the original #266 sample ZIP path')
const baseline = process.argv.includes('--baseline')
const root = path.resolve(import.meta.dirname, '../../..')
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild')
const output = path.resolve(process.env.ISSUE_EVIDENCE_DIR || path.join(root, 'output/issue-266'))
const bytes = await readFile(input)
const sha256 = createHash('sha256').update(bytes).digest('hex')
assert.equal(sha256, '57345ed8469bfae8ccb066abb726a551d0c322f5af7527828771035551cff4cb', 'Review any change to the original attachment before updating its hash')
const zip = await JSZip.loadAsync(bytes)
const samples = Object.values(zip.files).filter(file => !file.dir)
assert.equal(samples.length, 4)
const docx = samples.find(file => file.name.endsWith('.docx'))
const doc = samples.find(file => file.name.endsWith('.doc'))
const ofds = samples.filter(file => file.name.endsWith('.ofd'))
assert.ok(docx && doc && ofds.length === 2)
const temp = await mkdtemp(path.join(tmpdir(), 'issue-266-browser-'))
await mkdir(output, { recursive: true })
const report = { sha256, baseline, samples: [] }
let browser
try {
  await build({
    stdin: { resolveDir: root, contents: `
      import renderWord from './packages/renderers/word/src/wordDocx.ts';
      import { renderFileViewerWordDoc } from './packages/renderers/word/src/index.ts';
      import { findFileViewerZoomProvider } from './packages/core/dist/index.js';
      import { parseOfdDocument, renderOfd } from './packages/renderers/ofd/vendor/dltech/ofd/ofd.js';
      window.preview = async (data, format) => {
        const target = document.getElementById('root');
        if (format === 'ofd') {
          const docs = await new Promise((resolve, reject) => parseOfdDocument({ ofd: data, success: resolve, fail: reject }));
          const pages = renderOfd(840, docs[0]);
          target.replaceChildren(...pages);
          return { pages: pages.length };
        }
        window.handle = await (format === 'doc'
          ? renderFileViewerWordDoc(data, target, 'doc', { options: { theme: 'light', docx: { useWorker: false } } })
          : renderWord(data, target, { options: { theme: 'light', docx: { useWorker: false } } }));
        await document.fonts.ready;
        window.zoom = scale => findFileViewerZoomProvider(target).setZoom(scale);
        return { pages: target.querySelectorAll('section.docx').length, text: target.innerText };
      };
    ` },
    bundle: true, platform: 'browser', format: 'iife', outfile: path.join(temp, 'entry.js'), logLevel: 'silent',
  })
  const bundle = await readFile(path.join(temp, 'entry.js'), 'utf8')
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true })
  for (const file of [doc, docx, ...ofds]) {
    const format = file.name.split('.').at(-1)
    const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } })
    const errors = [], warnings = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) warnings.push(message.text()) })
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
    const row = { file: file.name, format }
    report.samples.push(row)
    try {
      await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#root{height:1400px;overflow:auto}</style><div id="root"></div>')
      await page.addScriptTag({ content: bundle })
      const base64 = await file.async('base64')
      Object.assign(row, await page.evaluate(async ({ base64, format }) => {
        try { return await window.preview(Uint8Array.from(atob(base64), char => char.charCodeAt(0)).buffer, format) }
        catch (error) { return { failure: error.message } }
      }, { base64, format }))
      await page.waitForTimeout(500)
      const stage = baseline ? 'before' : 'after'
      if (format === 'doc') {
        if (baseline) assert.match(row.failure, /Compound File Binary/)
        else {
          assert.equal(row.failure, undefined)
          assert.equal(row.pages, 1)
          assert.match(row.text, /213213/)
          assert.match(row.text.replace(/\s/g, ''), /第1页共1页/)
        }
        await page.screenshot({ path: path.join(output, `${stage}-wordml.png`) })
      } else if (format === 'docx') {
        assert.equal(row.failure, undefined)
        assert.equal(row.pages, 13)
        assert.equal(await page.locator('table').count(), 4)
        if (process.argv.includes('--require-diagonals')) assert.equal(await page.locator('[data-docx-diagonal="tl2br"]').count(), 1, 'Packed upstream diagonal fix must reach the actual Word renderer')
        row.borders = await page.locator('table').first().locator('td').first().evaluate(cell =>
          ['Top', 'Right', 'Bottom', 'Left'].map(side => getComputedStyle(cell)[`border${side}Width`]))
        assert.ok(row.borders.every(width => Number.parseFloat(width) > 0), 'Existing ordinary cell borders must be preserved')
        row.zooms = []
        for (const zoom of (baseline ? [1] : [1, 0.6, 1.4, 1])) {
          await page.evaluate(zoom => window.zoom(zoom), zoom)
          await page.waitForTimeout(150)
          const anchors = await page.locator('[data-docx-anchor-horizontal="column"][data-docx-anchor-vertical="paragraph"]').evaluateAll(nodes => nodes.map(node => {
            const article = node.closest('article'), section = node.closest('section.docx')
            const rect = node.getBoundingClientRect(), pageRect = section.getBoundingClientRect()
            const scale = pageRect.width / section.offsetWidth
            return { x: (rect.left - article.getBoundingClientRect().left) / scale, width: rect.width / scale, y: rect.top, outsideRight: rect.right > pageRect.right + 1 }
          }))
          assert.equal(anchors.length, 4)
          row.zooms.push({ zoom, anchors })
          // Authored EMU offsets in this original file, independent of paragraph indent.
          const expected = [1104910, 3162318, 901717, 2870184].map(emu => emu / 9525)
          if (baseline) assert.ok(anchors[1].x - expected[1] > 300, 'Must reproduce the indented paragraph origin error')
          else anchors.forEach((anchor, index) => {
            assert.ok(Math.abs(anchor.x - expected[index]) < 0.5, `Anchor ${index + 1} drifted at zoom ${zoom}: ${anchor.x} vs ${expected[index]}`)
            assert.equal(anchor.outsideRight, false)
          })
        }
        await page.locator('section.docx').first().screenshot({ path: path.join(output, `${stage}-docx-seals.png`) })
      } else {
        assert.equal(row.failure, undefined)
        assert.ok(row.pages === 1 || row.pages === 10)
        if (row.pages === 10) {
          row.date = await page.locator('text').evaluateAll(nodes => {
            const year = nodes.filter(node => node.textContent.trim() === '2025').at(-1)
            const index = year.textContent.indexOf('2')
            const position = year.getStartPositionOfChar(index)
            const transform = year.getScreenCTM()
            const digit = new DOMPoint(position.x, position.y).matrixTransform(transform)
            return { text: year.textContent, index, x: year.getAttribute('x'), digitX: digit.x, leadingAdvance: digit.x - year.getBoundingClientRect().left }
          })
          assert.equal(row.date.index, baseline ? 0 : 22)
          if (baseline) assert.ok(Math.abs(row.date.leadingAdvance) < 1)
          else assert.ok(row.date.leadingAdvance > 200, 'Visible year must follow the 22 authored space advances')
          await page.locator('#root').evaluate(root => { root.scrollTop = root.scrollHeight })
          await page.screenshot({ path: path.join(output, `${stage}-ofd-date.png`) })
        } else await page.screenshot({ path: path.join(output, `${stage}-ofd-invoice.png`) })
      }
      row.errors = errors; row.warnings = warnings; row.networkRequests = requests
      assert.deepEqual(errors, [])
      assert.deepEqual(requests, [], 'In-memory document rendering must not make HTTP requests')
      // Only the unchanged baseline misclassifies the invoice SignedData as SES.
      if (baseline) assert.ok(warnings.every(warning => format === 'ofd' && row.pages === 1 && warning.includes('unsupported SES signature structure')), warnings.join('\n'))
      else assert.deepEqual(warnings, [], 'Patched samples must render without signature warnings')
      console.log(`[issue-266] ${stage} ${format}: ${row.pages ?? 'expected failure'} pages; ${file.name}`)
    } finally { await page.close() }
  }
} finally {
  await writeFile(path.join(output, `${baseline ? 'before' : 'after'}.json`), JSON.stringify(report, null, 2))
  await browser?.close()
  await rm(temp, { recursive: true, force: true })
}
