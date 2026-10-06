/** Explicit host opt-out and sandbox/link policy checks on the real renderer. */
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '../../../..')
const wordRequire = createRequire(path.join(root, 'packages/renderers/word/package.json'))
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild')
const engine = path.dirname(wordRequire.resolve('@file-viewer/docx/package.json'))
const worker = await readFile(path.join(engine, 'dist/docx-preview.worker.js'), 'utf8')
const zipWorker = await readFile(wordRequire.resolve('jszip/dist/jszip.min.js'), 'utf8')
const output = path.resolve(process.env.WORD_EMBED_OUTPUT || path.join(root, 'output/word-embedded-content'))
await mkdir(output, { recursive: true })
const sha = value => createHash('sha256').update(value).digest('hex')
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

async function fixture(kind) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="html" ContentType="text/html"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`)
  const alt = kind === 'chunk'
  const content = alt ? '<w:altChunk r:id="chunk"/>' : '<w:p><w:hyperlink r:id="unsafe"><w:r><w:t>Untrusted link</w:t></w:r></w:hyperlink><w:hyperlink r:id="valid"><w:r><w:t>HTTPS control</w:t></w:r></w:hyperlink></w:p>'
  zip.file('word/document.xml', `<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body><w:p><w:r><w:t>Generated embedded-content policy fixture.</w:t></w:r></w:p>${content}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`)
  const rels = alt ? `<Relationship Id="chunk" Type="${R}/aFChunk" Target="chunk.html"/>` : `<Relationship Id="unsafe" Type="${R}/hyperlink" Target="javascript:window.__REVIEW_LINK=1" TargetMode="External"/><Relationship Id="valid" Type="${R}/hyperlink" Target="https://example.com/control" TargetMode="External"/>`
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`)
  if (alt) zip.file('word/chunk.html', '<html><body><p>Generated safe embedded text</p><script>parent.__REVIEW_CHUNK=1</script></body></html>')
  return zip.generateAsync({ type: 'nodebuffer' })
}
const samples = [{ id: 'generated-chunk', kind: 'chunk', bytes: await fixture('chunk') }, { id: 'generated-links', kind: 'links', bytes: await fixture('links') }]
if (process.env.WORD_EMBED_CORPUS_DIR) {
  for (const [id, kind, digest] of [['C053', 'links', '8d9708851337cdd1819b01768507cbbc71c9a0964a464add759bc36779c784eb'], ['C054', 'chunk', '69fabb8f1d78d8c51eba52539b23292b5fae6133778a23a9527d606709a63877']]) {
    const bytes = await readFile(path.join(process.env.WORD_EMBED_CORPUS_DIR, id + '.docx'))
    assert.equal(sha(bytes), digest, `${id}: original hash differs`)
    samples.push({ id, kind, bytes })
  }
}
const bundle = await build({
  stdin: { resolveDir: root, loader: 'ts', contents: `import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';window.renderWord=renderFileViewerWordDoc;` },
  bundle: true, platform: 'browser', format: 'iife', write: false, logLevel: 'warning',
})
const checks = [], originals = [], errors = [], requests = []
async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'pass' }); console.log('PASS', name) }
  catch (error) { checks.push({ name, status: 'fail', error: error.message }); console.error('FAIL', name, error.message) }
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
let completed = false
try {
  for (const useWorker of [false, true]) for (const sample of samples) {
    const zip = await JSZip.loadAsync(sample.bytes)
    const xml = await zip.file('word/document.xml').async('string')
    const variants = sample.kind === 'chunk' ? ['default', 'enabled', 'disabled'] : ['block', 'allow']
    for (const variant of variants) {
      const page = await browser.newPage({ viewport: { width: 1050, height: 800 } })
      const label = `${sample.id} ${useWorker ? 'Worker' : 'main-thread'} ${variant}`
      page.on('pageerror', error => errors.push(error.message))
      await page.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort() })
      try {
        await page.setContent('<!doctype html><style>body{margin:0}#host{width:900px;height:750px}</style><div id="host"></div>')
        await page.addScriptTag({ content: bundle.outputFiles[0].text })
        const result = await page.evaluate(async ({ base64, worker, zipWorker, useWorker, variant, xml, W }) => {
          const urls = [worker, zipWorker].map(code => URL.createObjectURL(new Blob([code], { type: 'application/javascript' })))
          window.messages = []; window.terminated = 0; window.started = 0
          const NativeWorker = window.Worker
          window.Worker = class extends NativeWorker {
            constructor(...args) { super(...args); started++; this.addEventListener('message', event => messages.push(event.data?.type)) }
            terminate() { terminated++; return super.terminate() }
          }
          const docx = { worker: useWorker, workerUrl: urls[0], workerJsZipUrl: urls[1], visualPagination: false }
          if (variant === 'enabled' || variant === 'disabled') docx.renderAltChunks = variant === 'enabled'
          if (variant === 'allow' || variant === 'block') docx.externalLinkPolicy = variant
          try {
            window.handle = await renderWord(Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer, host, 'doc', { filename: 'document.docx', options: { docx } })
          } finally { window.Worker = NativeWorker }
          window.reviewUrls = urls
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          const expected = [...new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagNameNS(W, 't')].map(node => node.textContent).join('')
          const text = [...host.querySelectorAll('article')].map(node => node.textContent).join('')
          return { expected, text, messages, frames: [...host.querySelectorAll('iframe')].map(frame => ({ sandbox: frame.getAttribute('sandbox'), referrer: frame.getAttribute('referrerpolicy'), srcdoc: frame.srcdoc })), links: [...host.querySelectorAll('a')].map(link => ({ href: link.getAttribute('href'), disabled: link.getAttribute('aria-disabled') })) }
        }, { base64: sample.bytes.toString('base64'), worker, zipWorker, useWorker, variant, xml, W })
        await check(`${label}: original body and parsing path are preserved`, () => {
          assert.equal(sha(result.text), sha(result.expected))
          if (useWorker) assert.ok(result.messages.includes('parsed'), 'Actual Worker parsed response is required')
        })
        await check(`${label}: explicit embedded-content or link policy is honored`, async () => {
          if (sample.kind === 'chunk') {
            assert.equal(result.frames.length, variant === 'disabled' ? 0 : 1)
            if (variant !== 'disabled') {
              assert.equal(result.frames[0].sandbox, ''); assert.equal(result.frames[0].referrer, 'no-referrer')
              const expectedText = sample.id === 'C054' ? 'ALTCHUNK-CONTENT' : 'Generated safe embedded text'
              await page.frameLocator('#host iframe').locator('p').filter({ hasText: expectedText }).waitFor()
              assert.ok(result.frames[0].srcdoc.includes(expectedText), 'Safe embedded text remains available')
            }
          } else {
            assert.ok(result.links.length >= 2)
            assert.ok(result.links.every(link => !link.href || !/^(?:javascript|data):/i.test(link.href)))
            if (variant === 'allow') assert.equal(result.links.filter(link => link.href === 'https://example.com/control').length, 1)
            else assert.ok(result.links.every(link => !link.href))
          }
        })
        await check(`${label}: embedded content cannot execute marker scripts`, async () => {
          const result = await page.evaluate(() => [window.__REVIEW_CHUNK, window.__REVIEW_LINK, window.__OFV_ALTCHUNK_SCRIPT, window.__OFV_PROBE_JS, window.__OFV_PROBE_DATA].every(value => value === undefined))
          assert.equal(result, true)
          // Inspect actual child execution, not only whether its parent was protected.
          for (const frame of page.frames().filter(frame => frame !== page.mainFrame())) {
            assert.equal(await frame.evaluate(() => typeof window.__REVIEW_CHUNK === 'undefined' && typeof window.__OFV_ALTCHUNK_SCRIPT === 'undefined'), true)
          }
        })
        originals.push({ id: sample.id, sha256: sha(sample.bytes), useWorker, variant, characters: result.text.length, bodySha256: sha(result.text), frames: result.frames.length })
        await check(`${label}: destroy removes frames and terminates created Workers`, async () => {
          const cleanup = await page.evaluate(() => { handle.unmount(); reviewUrls.forEach(url => URL.revokeObjectURL(url)); return { children: host.childElementCount, started, terminated } })
          assert.equal(cleanup.children, 0); assert.equal(cleanup.terminated, cleanup.started)
        })
      } finally { await page.close() }
    }
  }
  await check('No unhandled browser exceptions or external resource requests', () => { assert.deepEqual(errors, []); assert.deepEqual(requests, []) })
  completed = true
} finally {
  await browser.close()
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ completed, passed: checks.filter(c => c.status === 'pass').length, failed: checks.filter(c => c.status === 'fail').length, checks, originals, errors, requests }, null, 2) + '\n')
}
if (checks.some(c => c.status === 'fail')) process.exitCode = 1
