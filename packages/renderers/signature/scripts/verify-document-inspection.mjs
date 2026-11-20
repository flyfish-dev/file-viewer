import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Uses an existing Playwright installation/browser. It never installs a browser.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const require = createRequire(import.meta.url)
const preparedArg = process.argv.indexOf('--prepared')
const prepared = preparedArg === -1 ? undefined : path.resolve(process.argv[preparedArg + 1] || '')
const preparedManifest = prepared ? JSON.parse(await readFile(path.join(prepared, 'MANIFEST.json'), 'utf8')) : undefined
if (prepared) assert.equal(preparedManifest.kind, 'file-viewer-document-inspection-prepared-v1')
const browsers = process.env.DOCUMENT_INSPECTION_PLAYWRIGHT ? await import(process.env.DOCUMENT_INSPECTION_PLAYWRIGHT) : require('playwright')
const browserName = process.env.DOCUMENT_INSPECTION_BROWSER || 'chromium'
const outputArg = process.argv.indexOf('--output')
assert.ok(outputArg !== -1 && process.argv[outputArg + 1], '--output is required')
const output = path.resolve(process.argv[outputArg + 1])
const before = process.argv.includes('--before')
assert.ok(!prepared || !before, 'Prepared execution cannot substitute a before build')
await mkdir(output, { recursive: true })
const fixtureRoot = prepared ? path.join(prepared, 'fixtures') : path.join(root, 'packages/renderers/signature/test/fixtures/document-inspection')
const runtime = prepared ? path.join(prepared, 'pdfjs') : path.dirname(createRequire(path.join(root, 'packages/renderers/pdf/package.json')).resolve('pdfjs-dist/package.json'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const sourcePaths = [
  'packages/core/src/features/document/inspection.ts', 'packages/core/src/contracts/signature.ts', 'packages/core/src/index.ts',
  'packages/renderers/pdf/src/index.ts', 'packages/renderers/pdf/src/pdfSignatureInspection.ts',
  'packages/renderers/text/src/index.ts', 'packages/renderers/signature/src/index.ts',
  'packages/renderers/signature/src/documentInspection.ts', 'packages/renderers/signature/src/documentMetadata.ts',
  'packages/renderers/signature/src/signatureAsn1.ts', 'packages/renderers/signature/src/structured/jws.ts',
  'packages/renderers/signature/src/structured/types.ts', 'packages/renderers/signature/scripts/verify-document-inspection.mjs'
]
const sourceHashes = preparedManifest?.sourceHashes || Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, sha(await readFile(path.join(root, file)))])))
const checkPayload = async () => {
  const expected = ['browser.mjs', 'verify-document-inspection.mjs', 'fixtures/demo-pades-self-signed.pdf', 'fixtures/demo-xades-self-signed.xml', 'fixtures/demo-jades-self-signed.json', 'pdfjs/legacy/build/pdf.mjs', 'pdfjs/legacy/build/pdf.worker.mjs', 'pdfjs/legacy/web/pdf_viewer.mjs']
  assert.deepEqual(Object.keys(preparedManifest.files).sort(), expected.sort())
  for (const file of expected) assert.equal(sha(await readFile(path.join(prepared, file))), preparedManifest.files[file], 'Prepared payload drift: ' + file)
}
if (prepared) await checkPayload()
const baseline = {}
const plugins = [{ name: 'local-sources-and-pdf-runtime', setup(b) {
  b.onResolve({ filter: /^@file-viewer\/core(?:\/(?:assets|browser|headless))?$/ }, args => {
    const entry = args.path.split('/')[2] || 'index'
    return { path: path.join(root, 'packages/core/src', entry + '.ts') }
  })
  b.onResolve({ filter: /^pdfjs-dist\// }, args => ({ path: '/pdfjs/' + args.path.slice('pdfjs-dist/'.length), external: true }))
  if (before) b.onLoad({ filter: /packages\/renderers\/(?:signature|text|pdf)\/src\/index\.ts$/ }, args => {
    const relative = path.relative(root, args.path)
    const contents = execFileSync('git', ['show', 'HEAD:' + relative], { cwd: root, encoding: 'utf8' })
    baseline[relative] = sha(contents)
    return { contents, loader: 'ts', resolveDir: path.dirname(args.path) }
  })
} }]
const entry = `
import { signatureRenderer } from './packages/renderers/signature/src/index.ts';
import { renderFileViewerPdf } from './packages/renderers/pdf/src/index.ts';
import { renderFileViewerCode } from './packages/renderers/text/src/index.ts';
import { enableFileViewerPdfSignatureInspection } from './packages/renderers/pdf/src/pdfSignatureInspection.ts';
import { findFileViewerViewStateProvider } from './packages/core/src/index.ts';
enableFileViewerPdfSignatureInspection();
window.documentInspectionReview = { signatureRenderer, renderFileViewerPdf, renderFileViewerCode, findFileViewerViewStateProvider };`
const bundle = prepared ? path.join(prepared, 'browser.mjs') : path.join(output, 'browser.mjs')
if (!prepared) await require('esbuild').build({ absWorkingDir: root, stdin: { contents: entry, resolveDir: root, loader: 'ts' }, outfile: bundle, bundle: true, format: 'esm', platform: 'browser', plugins, logLevel: 'warning', treeShaking: true })
const requests = [], external = [], errors = [], consoleErrors = [], cases = []
let origin
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  requests.push(pathname)
  try {
    if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;width:100%}#host{height:760px;width:1100px;overflow:auto}</style><div id="host"></div><script type="module" src="/browser.mjs"></script>'); return }
    if (pathname === '/favicon.ico') { res.writeHead(204).end(); return }
    let file
    if (pathname === '/browser.mjs') file = bundle
    else if (pathname.startsWith('/pdfjs/')) { file = path.resolve(runtime, pathname.slice(7)); assert.ok(file.startsWith(runtime + path.sep)) }
    else if (pathname.startsWith('/fixtures/')) { file = path.resolve(fixtureRoot, pathname.slice(10)); assert.ok(file.startsWith(fixtureRoot + path.sep)) }
    else throw Error('Unknown resource')
    res.setHeader('Content-Type', /\.m?js$/.test(file) ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream')
    res.end(await readFile(file))
  } catch (error) { res.writeHead(404).end(String(error)) }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
origin = `http://127.0.0.1:${server.address().port}`
let browser, failure
try {
  browser = await browsers[browserName].launch({ headless: true, ...(process.env.DOCUMENT_INSPECTION_EXECUTABLE ? { executablePath: process.env.DOCUMENT_INSPECTION_EXECUTABLE } : {}), ...(browserName === 'chromium' ? { args: ['--no-sandbox'] } : {}) })
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.route('**/*', route => {
    const url = route.request().url()
    if (/^https?:/.test(url) && !url.startsWith(origin + '/')) { external.push(url); return route.abort() }
    return route.continue()
  })
  await page.goto(origin)
  await page.waitForFunction(() => Boolean(window.documentInspectionReview))
  await page.evaluate(() => {
    window.cryptoCalls = { verify: 0, importKey: 0 }
    for (const name of ['verify', 'importKey']) crypto.subtle[name] = () => { window.cryptoCalls[name]++; throw Error('Metadata must not verify or import keys') }
    window.diagnostics = []
  })
  const mount = async (name, type, options = {}, inline, sourceMode = 'buffer') => {
    await page.evaluate(async ({ name, type, options, inline, sourceMode }) => {
      if (window.instance) await window.instance.unmount()
      const target = document.getElementById('host'); target.replaceChildren()
      const bytes = inline === undefined ? await (await fetch('/fixtures/' + name)).arrayBuffer() : new TextEncoder().encode(inline).buffer
      const context = { filename: name, ...(sourceMode !== 'buffer' ? { streamUrl: '/fixtures/' + name } : {}), ...(sourceMode === 'file' ? { sourceFile: new File([bytes], name) } : {}), options: { locale: 'en-US', onDiagnostic: value => window.diagnostics.push(value), pdf: { workerUrl: '/pdfjs/legacy/build/pdf.worker.mjs', cMapUrl: '/pdfjs/cmaps/', wasmUrl: '/pdfjs/wasm/', standardFontDataUrl: '/pdfjs/standard_fonts/', cjkFontFallback: false, identityFontRepair: false, navigation: false }, ...options } }
      window.instance = await (type === 'pdf' ? window.documentInspectionReview.renderFileViewerPdf : window.documentInspectionReview.renderFileViewerCode)(sourceMode === 'buffer' ? bytes : new ArrayBuffer(0), target, type, context)
    }, { name, type, options, inline, sourceMode })
  }
  for (const [name, type] of [['demo-pades-self-signed.pdf', 'pdf'], ['demo-xades-self-signed.xml', 'xml'], ['demo-jades-self-signed.json', 'json']]) {
    await mount(name, type)
    if (type === 'pdf') await page.waitForFunction(() => Boolean(document.querySelector('.page canvas')))
    else await page.waitForFunction(() => Boolean(document.querySelector('.code-container,pre,.large-text-container')))
    // The pre-fix renderer is expected to fail here, preserving its real browser evidence.
    await page.waitForSelector('.signature-document-inspection', { timeout: before ? 2000 : 15000 })
    const details = await page.evaluate(() => {
      const shell = document.querySelector('.signature-document-inspection'), preview = shell.querySelector('.signature-preview')
      window.samePreview = preview.firstChild
      return { cards: shell.querySelectorAll('.signature-card').length, text: shell.textContent, canvas: Boolean(preview.querySelector('canvas')), source: preview.textContent, verification: shell.dataset.verification }
    })
    assert.equal(details.cards, 1); assert.equal(details.verification, 'not-checked'); assert.match(details.text, /Not checked/)
    assert.match(details.text, /(?:[a-f0-9]{2}:){31}[a-f0-9]{2}/i)
    if (type === 'pdf') assert.equal(details.canvas, true)
    else assert.ok(details.source.length > 100)
    const toggle = page.locator('.signature-header button[aria-controls]')
    await toggle.click()
    assert.equal(await page.locator('.signature-details-panel').isVisible(), false)
    await toggle.focus(); await page.keyboard.press('Enter')
    assert.equal(await page.locator('.signature-details-panel').isVisible(), true)
    assert.equal(await page.evaluate(() => document.querySelector('.signature-preview').firstChild === window.samePreview), true)
    await page.screenshot({ path: path.join(output, name + '.png') })
    cases.push({ name, originalPreviewRetained: true, pointerAndKeyboardToggle: true, cards: details.cards, canvas: details.canvas, notChecked: true })
  }
  await mount('external.xml', 'xml', { signature: { detailsPanel: { position: 'left', openingBehavior: 'overlay' } } }, '<r xmlns:d="http://www.w3.org/2000/09/xmldsig#"><d:Signature><d:SignedInfo><d:SignatureMethod Algorithm="urn:unknown"/><d:Reference URI="https://metadata-trap.invalid/payload"><d:Transforms><d:Transform Algorithm="http://www.w3.org/TR/1999/REC-xslt-19991116"/></d:Transforms></d:Reference></d:SignedInfo><d:KeyInfo><d:RetrievalMethod URI="https://metadata-trap.invalid/certificate"/></d:KeyInfo></d:Signature></r>')
  await page.waitForSelector('.signature-document-inspection')
  assert.match(await page.locator('.signature-document-inspection').textContent(), /missing/)
  assert.equal(await page.locator('.signature-main').getAttribute('data-panel-position'), 'left')
  cases.push({ name: 'external-xml-reference-and-key', noFetch: true, unsupportedAlgorithm: true, missingCertificate: true, leftPanel: true })
  for (const [name, type, source] of [['unsigned.json', 'json', '{"ordinary":"source"}'], ['unsigned.xml', 'xml', '<ordinary>source</ordinary>']]) {
    await mount(name, type, {}, source)
    await page.waitForTimeout(100)
    assert.equal(await page.locator('.signature-document-inspection').count(), 0)
    assert.match(await page.locator('#host').textContent(), /ordinary/)
    cases.push({ name, originalPreviewUnchanged: true })
  }
  const earlierConsoleErrors = consoleErrors.length
  const earlierDiagnostics = await page.evaluate(() => window.diagnostics.length)
  const vueSource = '<script setup lang="ts">const text = "Vue source";</script><template><button @click="text">ordinary</button></template>'
  await mount('component.vue', 'vue', {}, vueSource)
  await page.waitForFunction(() => document.querySelector('#host').textContent.includes('Vue source'))
  assert.equal(await page.locator('.signature-document-inspection').count(), 0)
  assert.equal(await page.evaluate(() => window.diagnostics.length), earlierDiagnostics)
  assert.deepEqual(consoleErrors.slice(earlierConsoleErrors), [])
  cases.push({ name: 'component.vue', previewRetained: true, noXmlParserDiagnostic: true })
  const signedMarkup = '<r xmlns:s="http://www.w3.org/2000/09/xmldsig&#35;"><s:Signature><s:SignedInfo><s:SignatureMethod Algorithm="urn:sample"/></s:SignedInfo></s:Signature></r>'
  await mount('renamed-signature.txt', 'txt', {}, signedMarkup)
  await page.waitForSelector('.signature-document-inspection')
  assert.equal(await page.locator('.signature-card').count(), 1)
  assert.match(await page.locator('.signature-document-inspection').textContent(), /urn:sample/)
  cases.push({ name: 'renamed-signature.txt', signedMetadataVisible: true })
  await mount('demo-jades-self-signed.json', 'json', { signature: { documentInspection: false } })
  await page.waitForTimeout(100); assert.equal(await page.locator('.signature-document-inspection').count(), 0)
  cases.push({ name: 'explicit-opt-out', originalPreviewUnchanged: true })
  await mount('demo-pades-self-signed.pdf', 'pdf', {}, undefined, 'stream')
  await page.waitForFunction(() => Boolean(document.querySelector('.page canvas')) && window.diagnostics.some(value => value.code === 'document-inspection-unavailable' && /original PDF bytes/.test(value.message)))
  assert.equal(await page.locator('.signature-document-inspection').count(), 0)
  cases.push({ name: 'streamed-url-no-original-source', previewRetained: true, explicitlyUnavailable: true, noUnsignedConclusion: true })
  await mount('demo-pades-self-signed.pdf', 'pdf', {}, undefined, 'file')
  await page.waitForSelector('.signature-document-inspection')
  assert.equal(await page.locator('.signature-card').count(), 1)
  cases.push({ name: 'caller-owned-original-file', signedMetadataVisible: true })
  await page.evaluate(async () => { await window.instance.unmount(); await window.instance.unmount() })
  const cryptoCalls = await page.evaluate(() => window.cryptoCalls)
  assert.deepEqual(cryptoCalls, { verify: 0, importKey: 0 }); assert.deepEqual(external, []); assert.deepEqual(errors, [])
  cases.push({ name: 'cleanup-and-zero-verification', cryptoCalls, externalRequests: 0, pageErrors: 0 })
} catch (error) { failure = error; console.error(error.stack || error) }
finally {
  const drift = []
  if (prepared) { try { await checkPayload() } catch (error) { drift.push(error.message) } }
  else for (const [file, expected] of Object.entries(sourceHashes)) if (sha(await readFile(path.join(root, file))) !== expected) drift.push(file)
  const report = { mode: before ? 'before-original-renderer-entrypoints' : 'metadata-only-document-inspection', head: preparedManifest?.head || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), prepared: Boolean(prepared), preparedManifestSha256: prepared ? sha(await readFile(path.join(prepared, 'MANIFEST.json'))) : undefined, sourceHashes, baseline, bundleSha256: sha(await readFile(bundle)), browser: browserName, browserVersion: browser?.version(), cases, requests, external, errors, consoleErrors, drift, pass: !failure && drift.length === 0, failure: failure?.message }
  await writeFile(path.join(output, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n')
  await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve))
  if (failure || drift.length) process.exitCode = 1
}
