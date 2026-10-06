/** Browser acceptance for actual Word zoom providers, not copies of their math. */
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '../../../..')
const requireWord = createRequire(path.join(root, 'packages/renderers/word/package.json'))
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild')
const engine = path.dirname(requireWord.resolve('@file-viewer/docx/package.json'))
const worker = await readFile(path.join(engine, 'dist/docx-preview.worker.js'), 'utf8')
const zipWorker = await readFile(requireWord.resolve('jszip/dist/jszip.min.js'), 'utf8')
const output = path.resolve(process.env.WORD_ZOOM_OUTPUT || path.join(root, 'output/word-zoom-fit'))
await mkdir(output, { recursive: true })
const sha = value => createHash('sha256').update(value).digest('hex')
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

async function documentFixture(paragraphs) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`)
  zip.file('word/document.xml', `<w:document xmlns:w="${W}"><w:body>${Array.from({ length: paragraphs }, (_, i) => `<w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>Generated zoom paragraph ${i + 1}: exact scale and visible content.</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:left="1440" w:bottom="1440" w:right="1440"/></w:sectPr></w:body></w:document>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}
const short = await documentFixture(3)
const long = await documentFixture(75)
const html = Buffer.from('<!doctype html><html><body>' + '<p>Generated legacy Word text.</p>'.repeat(90) + '</body></html>')
const samples = [
  { id: 'generated-paged', bytes: short, paged: true, openxml: true },
  { id: 'generated-flow', bytes: long, paged: false, openxml: true },
  { id: 'generated-html', bytes: html, paged: false, openxml: false },
]
if (process.env.WORD_ZOOM_CORPUS_DIR) {
  const pins = [
    ['C053', '.docx', '8d9708851337cdd1819b01768507cbbc71c9a0964a464add759bc36779c784eb'],
    ['C054', '.docx', '69fabb8f1d78d8c51eba52539b23292b5fae6133778a23a9527d606709a63877'],
    ['C069', '.doc', '20d54c7246abc43147c6145abdef283cac113fdbf684387bfdc69b9df9887e94'],
  ]
  for (const [id, extension, hash] of pins) {
    const bytes = await readFile(path.join(process.env.WORD_ZOOM_CORPUS_DIR, id + extension))
    assert.equal(sha(bytes), hash, `${id}: original hash differs`)
    samples.push({ id, bytes, paged: extension === '.docx', openxml: extension === '.docx' })
  }
}
const bundle = await build({
  stdin: { resolveDir: root, loader: 'ts', contents: `import { renderFileViewerWordDoc } from './packages/renderers/word/src/index.ts'; import { findFileViewerZoomProvider } from './packages/core/src/index.ts'; window.review = { renderFileViewerWordDoc, findFileViewerZoomProvider };` },
  bundle: true, platform: 'browser', format: 'iife', write: false, logLevel: 'warning',
})
const checks = [], originals = [], errors = [], requests = []
async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'pass' }); console.log('PASS', name) }
  catch (error) { checks.push({ name, status: 'fail', error: error.message }); console.error('FAIL', name, error.message) }
}
function close(actual, expected, message = '') {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`)
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
let completed = false
try {
  for (const dpr of [1, 2]) for (const sample of samples) {
    const page = await browser.newPage({ viewport: { width: 1150, height: 850 }, deviceScaleFactor: dpr })
    page.on('pageerror', error => errors.push(error.message))
    await page.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort() })
    const label = `${sample.id} DPR ${dpr}`
    try {
      await page.setContent('<!doctype html><style>body{margin:0}#host{width:300px;height:700px}</style><div id="host"></div>')
      await page.addScriptTag({ content: bundle.outputFiles[0].text })
      await page.evaluate(async ({ base64, worker, zipWorker, sample }) => {
        window.messages = []
        window.workerUrl = URL.createObjectURL(new Blob([worker], { type: 'application/javascript' }))
        window.zipUrl = URL.createObjectURL(new Blob([zipWorker], { type: 'application/javascript' }))
        const NativeWorker = window.Worker
        window.Worker = class extends NativeWorker {
          constructor(...args) { super(...args); this.addEventListener('message', event => messages.push(event.data?.type)) }
        }
        try {
          window.handle = await review.renderFileViewerWordDoc(Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer, host, 'doc', {
            filename: sample.openxml ? 'document.docx' : 'document.doc',
            registerExportAdapter: adapter => { window.exportAdapter = adapter },
            options: { docx: { worker: sample.openxml, workerUrl, workerJsZipUrl: zipUrl, visualPagination: sample.paged } },
          })
        } finally { window.Worker = NativeWorker }
        window.provider = review.findFileViewerZoomProvider(host)
        window.settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        window.geometry = () => {
          const node = host.querySelector('section.docx, .msdoc-root')
          const rect = node.getBoundingClientRect()
          return { state: provider.getState(), width: node.offsetWidth, height: node.offsetHeight, scrollHeight: node.scrollHeight, actualWidth: rect.width, transform: node.style.transform, text: [...host.querySelectorAll('article, .msdoc-root')].map(p => p.textContent).join(''), pages: host.querySelectorAll('section.docx, .msdoc-page').length }
        }
        await document.fonts.ready
        await Promise.all([...host.querySelectorAll('img')].map(image => image.decode()))
        await settle()
      }, { base64: sample.bytes.toString('base64'), worker, zipWorker, sample: { openxml: sample.openxml, paged: sample.paged } })
      if (sample.paged) await page.waitForFunction(() => host.querySelector('.docx-wrapper')?.dataset.docxPaginated === 'true', null, { timeout: 60000 })
      await page.evaluate(async () => { await settle(); provider.setZoom(1); await settle() })
      const initial = await page.evaluate(() => geometry())
      await check(`${label}: actual parser/Worker retains content`, async () => {
        assert.ok(initial.width > 0 && initial.height > 0 && initial.text.length > 0)
        if (sample.openxml) {
          assert.ok(await page.evaluate(() => messages.includes('parsed')), 'Worker must return parsed, not silently fall back')
          const zip = await JSZip.loadAsync(sample.bytes)
          const xml = await zip.file('word/document.xml').async('string')
          const expected = await page.evaluate(({ xml, W }) => {
            const parsed = new DOMParser().parseFromString(xml, 'application/xml')
            return [...parsed.getElementsByTagNameNS(W, 't')].map(node => node.textContent).join('')
          }, { xml, W })
          assert.equal(sha(initial.text), sha(expected), 'Original body changed')
        }
      })
      await check(`${label}: narrow host reaches exact fractional zoom and 300 percent`, async () => {
        for (const value of [0.333333333333, 0.24, 3, 0.8812345, 1]) {
          const result = await page.evaluate(async value => { const state = provider.setZoom(value); await settle(); return { state, geometry: geometry() } }, value)
          close(result.state.scale, value, 'Scale')
          assert.ok(Math.abs(result.geometry.actualWidth - initial.actualWidth * value) < 0.002, 'Rendered width must match within 0.002 CSS pixels')
          assert.equal(sha(result.geometry.text), sha(initial.text)); assert.equal(result.geometry.pages, initial.pages)
        }
      })
      await check(`${label}: absolute limits and zoom buttons match advertised bounds`, async () => {
        const result = await page.evaluate(() => {
          const max = provider.setZoom(10), up = provider.zoomIn(), down = provider.zoomOut()
          const min = provider.setZoom(0.01), reset = provider.resetZoom()
          return { max, up, down, min, reset }
        })
        close(result.max.scale, 3); close(result.up.scale, 3); close(result.down.scale, 2.85)
        close(result.min.scale, 0.24); assert.equal(result.max.canZoomIn, false); assert.equal(result.min.canZoomOut, false)
        assert.equal(result.reset.canReset, false)
      })
      await check(`${label}: invalid zoom does not alter state or DOM`, async () => {
        const result = await page.evaluate(() => {
          provider.setZoom(1)
          const before = geometry()
          const states = [NaN, Infinity, -Infinity, 0, -1].map(value => { provider.setZoom(value); return geometry() })
          provider.resetZoom()
          return { before, states }
        })
        for (const state of result.states) { close(state.state.scale, 1); assert.equal(state.transform, result.before.transform) }
      })
      await check(`${label}: invalid explicit viewport is not replaced with a plausible fit`, async () => {
        const results = await page.evaluate(() => {
          const results = []
          for (const value of [0, -1, NaN, Infinity]) for (const key of ['viewportWidth', 'viewportHeight']) {
            provider.setZoom(1)
            const result = provider.fit({ mode: key === 'viewportWidth' ? 'height' : 'width', resize: 'always', padding: 0, source: 'api', reason: 'api', viewportWidth: 600, viewportHeight: 600, [key]: value })
            results.push({ result, state: provider.getState() })
          }
          provider.resetZoom()
          return results
        })
        for (const { result, state } of results) { assert.equal(result.applied, false); assert.equal(result.reason, 'unmeasurable'); close(state.scale, 1) }
      })
      await check(`${label}: height fit measures actual content rather than hard-coded A4`, async () => {
        const result = await page.evaluate(async () => {
          provider.setZoom(1); await settle()
          const before = geometry()
          const result = provider.fit({ mode: 'height', resize: 'always', padding: 0, source: 'api', reason: 'api', viewportWidth: 600, viewportHeight: 600 })
          return { before, result }
        })
        const height = sample.paged ? result.before.height : Math.max(result.before.height, result.before.scrollHeight)
        assert.equal(result.result.applied, true)
        close(result.result.scale, Math.min(3, Math.max(0.24, 600 / height)), 'Height fit')
      })
      await check(`${label}: hidden preview remains unmeasurable and recovers when shown`, async () => {
        const result = await page.evaluate(async () => {
          provider.setZoom(1); host.style.display = 'none'
          const hidden = provider.fit({ mode: 'width', resize: 'always', padding: 0, source: 'api', reason: 'api', viewportWidth: 600, viewportHeight: 600 })
          host.style.display = ''; await settle()
          const visible = provider.fit({ mode: 'width', resize: 'always', padding: 0, source: 'api', reason: 'api', viewportWidth: 600, viewportHeight: 600 })
          return { hidden, visible, geometry: geometry() }
        })
        assert.equal(result.hidden.applied, false); assert.equal(result.hidden.reason, 'unmeasurable')
        assert.equal(result.visible.applied, true); close(result.visible.scale, 600 / result.geometry.width)
      })
      await check(`${label}: reset reflows to host and resize keeps a stable multiplier`, async () => {
        const result = await page.evaluate(async () => {
          host.style.width = '1000px'; await settle(); provider.resetZoom(); await settle()
          const wide = geometry(); host.style.width = '300px'; await settle(); await settle()
          const narrow = geometry(); provider.setZoom(narrow.state.scale * 2)
          host.style.width = '700px'; await settle(); await settle()
          return { wide, narrow, resized: geometry() }
        })
        close(result.wide.state.scale, 1)
        const padding = sample.openxml ? 28 : 48
        const fit = width => Math.min(1, Math.max(0.24, Math.max(width - padding, 120) / result.wide.width))
        close(result.narrow.state.scale, fit(300)); close(result.resized.state.scale, Math.min(3, fit(700) * 2))
        assert.equal(sha(result.resized.text), sha(initial.text)); assert.equal(result.resized.pages, initial.pages)
      })
      if (sample.id === 'generated-paged' && dpr === 1) {
        await page.evaluate(async () => { host.style.width = '1000px'; provider.setZoom(0.8812345); await settle() })
        await page.screenshot({ path: path.join(output, 'generated.png') })
      }
      originals.push({ id: sample.id, sha256: sha(sample.bytes), dpr, characters: initial.text.length, bodySha256: sha(initial.text), pages: initial.pages })
      await check(`${label}: destroy unregisters the provider and clears the preview`, async () => {
        const result = await page.evaluate(async () => {
          handle.unmount(); URL.revokeObjectURL(workerUrl); URL.revokeObjectURL(zipUrl); await settle()
          return { count: host.childElementCount, provider: !!review.findFileViewerZoomProvider(host) }
        })
        assert.deepEqual(result, { count: 0, provider: false })
      })
    } finally { await page.close() }
  }
  await check('No unhandled browser errors or remote resources', () => { assert.deepEqual(errors, []); assert.deepEqual(requests, []) })
  completed = true
} finally {
  await browser.close()
  const report = { completed, passed: checks.filter(c => c.status === 'pass').length, failed: checks.filter(c => c.status === 'fail').length, checks, originals, errors, requests }
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
if (checks.some(c => c.status === 'fail')) process.exitCode = 1
