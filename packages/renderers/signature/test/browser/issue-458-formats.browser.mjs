import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'

const root = path.resolve(import.meta.dirname, '../../../../..')
const output = path.resolve(
  process.env.SIGNATURE_FORMATS_OUTPUT || path.join(root, 'output/signature-panel-formats')
)
const installedRoot =
  process.env.SIGNATURE_PANEL_INSTALLED_ROOT &&
  (await realpath(process.env.SIGNATURE_PANEL_INSTALLED_ROOT))
const installed = installedRoot && createRequire(path.join(installedRoot, 'package.json'))
const packageRoot = installedRoot
  ? path.dirname(installed.resolve('@file-viewer/renderer-signature/package.json'))
  : path.join(root, 'packages/renderers/signature')
const require = createRequire(path.join(root, 'package.json'))
const { chromium, webkit } = require('playwright')
await mkdir(output, { recursive: true })
let source = await readFile(path.join(import.meta.dirname, 'main.mjs'), 'utf8')
// Extend the existing source fixture driver, never substitute any crypto result.
source = source.replace(
  "import renderSignature from '../../dist/signature.js'",
  installedRoot
    ? `import { renderFileViewerSignature as renderSignature } from ${JSON.stringify(installed.resolve('@file-viewer/renderer-signature'))}`
    : `import renderSignature from ${JSON.stringify(path.join(packageRoot, 'dist/signature.js'))}`
)
source = source.replace(
  'signature: { ...(scenario.options || {}), workerFactory:',
  'signature: { ...(scenario.options || {}), detailsPanel: window.issue458Options, workerFactory:'
)
// Existing driver owns fixture generation/hostile content. Add only negative input variants.
source = source.replace(
  "    case 'timestamp':",
  `    case 'detached-missing': return { buffer: await readFixture('detachedCms'), filename: 'invoice.pdf.p7s', type: 'p7s' }
    case 'detached-tampered': return { buffer: await readFixture('detachedCms'), filename: 'invoice.pdf.p7s', type: 'p7s', options: { originalContent: encoder.encode('Not the signed original').buffer, originalFilename: 'altered.txt' } }
    case 'jws-missing': { const value = await createJws(); return { buffer: value.bytes, filename: 'unknown-key.jws', type: 'jws' } }
    case 'openpgp-missing': return { buffer: await readFixture('openPgpSignature'), filename: 'hello.sig', type: 'sig' }
    case 'ers-missing': return { buffer: await readFixture('evidenceRecord'), filename: 'evidence.ers', type: 'ers' }
    case 'ers-tampered': return { buffer: await readFixture('evidenceRecord'), filename: 'evidence.ers', type: 'ers', options: { originalContent: encoder.encode('Tampered protected content').buffer, originalFilename: 'changed.txt' } }
    case 'jws-tampered': { const value = await createJws(); const segments = decoder.decode(value.bytes).split('.'); segments[1] = b64url(encoder.encode('{"changed":true}')); return { buffer: encoder.encode(segments.join('.')).buffer, filename: 'tampered.jws', type: 'jws', options: value.options } }
    case 'openpgp-tampered': return { buffer: await readFixture('openPgpSignature'), filename: 'hello.sig', type: 'sig', options: { originalContent: encoder.encode('Tampered original').buffer, originalFilename: 'changed.txt', openPgpPublicKeys: [await readFixture('openPgpKey')] } }
    case 'asic-tampered': { const zip = await JSZip.loadAsync(await readFixture('asics')); const document = Object.values(zip.files).find(entry => !entry.dir && entry.name !== 'mimetype' && !entry.name.startsWith('META-INF/')); if (!document) throw new Error('ASiC fixture lacks a document'); zip.file(document.name, encoder.encode('Tampered document')); return { buffer: await zip.generateAsync({type:'arraybuffer'}), filename: 'changed.asics', type: 'asics' } }
    case 'timestamp':`
)
source = source.replace(
  'const scenario = await getScenario(name)',
  'const scenario = await getScenario(name); window.capturedScenario = scenario'
)
const bundles = {}
for (const [name, entry, contents] of [
  ['suite', null, source],
  ['container.worker', path.join(packageRoot, 'dist/container.worker.js')],
  ['signature.worker', path.join(packageRoot, 'dist/signature.worker.js')]
]) {
  const bundle = await build({
    absWorkingDir: installedRoot || root,
    ...(entry
      ? { entryPoints: [entry] }
      : {
          stdin: {
            contents,
            resolveDir: packageRoot,
            sourcefile: 'issue-458-existing-fixture-driver.mjs'
          }
        }),
    bundle: true,
    platform: 'browser',
    format: 'esm',
    write: false,
    metafile: true,
    logLevel: 'warning'
  })
  // JSZip is part of the existing driver, and every installed runtime import must remain installed.
  if (installedRoot)
    for (const file of Object.keys(bundle.metafile.inputs).filter(
      (file) => !file.includes('issue-458-existing-fixture-driver')
    ))
      assert.ok(
        (await realpath(path.resolve(installedRoot, file))).startsWith(
          installedRoot + '/node_modules/'
        ),
        `Consumer escaped: ${file}`
      )
  bundles[name] = bundle.outputFiles[0].text
  await writeFile(path.join(output, name + '.mjs'), bundles[name])
}
const external = [],
  errors = [],
  requests = []
let origin
const server = createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  requests.push(name)
  try {
    if (name === '/') {
      res.setHeader('Content-Type', 'text/html')
      res.end(
        '<!doctype html><meta charset="utf-8"><style>body{margin:0}#target{height:900px;width:1280px}</style><div id="target"></div><script type="module" src="/test/browser/main.mjs"></script>'
      )
      return
    }
    if (name === '/test/browser/main.mjs') {
      res.setHeader('Content-Type', 'text/javascript')
      res.end(bundles.suite)
      return
    }
    if (name === '/dist/container.worker.js' || name === '/dist/signature.worker.js') {
      res.setHeader('Content-Type', 'text/javascript')
      res.end(bundles[path.basename(name, '.js')])
      return
    }
    if (name === '/favicon.ico') {
      res.writeHead(204).end()
      return
    }
    const directory = name.startsWith('/test/fixtures/')
      ? path.join(root, 'packages/renderers/signature/test/fixtures')
      : path.join(packageRoot, 'dist')
    const relative = name.startsWith('/test/fixtures/')
      ? name.slice('/test/fixtures/'.length)
      : name.startsWith('/dist/')
        ? name.slice('/dist/'.length)
        : '..'
    const file = path.resolve(directory, relative)
    if (!file.startsWith(directory + path.sep)) throw Error('Unknown route')
    res.setHeader(
      'Content-Type',
      file.endsWith('.wasm')
        ? 'application/wasm'
        : /\.m?js$/.test(file)
          ? 'text/javascript'
          : 'application/octet-stream'
    )
    res.end(await readFile(file))
  } catch (error) {
    res.writeHead(404).end(String(error))
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
origin = `http://127.0.0.1:${server.address().port}`
const report = {
  passed: false,
  installedRoot: installedRoot || null,
  node: process.version,
  scope:
    'Real signature inspection and real Worker/WASM. Existing issue-206 nested preview is a countable text stub; actual PDF/XML rendering is proven in the separate 48-case suite.',
  cases: [],
  requests,
  errors,
  external,
  wasmSha256: createHash('sha256')
    .update(await readFile(path.join(packageRoot, 'dist/rpgp-wasm/rpgp_wrapper_bg.wasm')))
    .digest('hex')
}
try {
  for (const [browserName, engine] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    const browser = await engine.launch({ headless: true })
    try {
      const page = await browser.newPage({
        viewport: { width: 1400, height: 1000 }
      })
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('request', (request) => {
        if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/'))
          external.push(request.url())
      })
      await page.addInitScript(() => {
        window.cryptoCalls = 0
        window.workerCalls = 0
        const post = Worker.prototype.postMessage
        Worker.prototype.postMessage = function (...args) {
          workerCalls++
          return post.apply(this, args)
        }
        for (const key of ['verify', 'digest']) {
          const fn = crypto.subtle[key].bind(crypto.subtle)
          crypto.subtle[key] = (...args) => {
            cryptoCalls++
            return fn(...args)
          }
        }
      })
      await page.goto(origin)
      await page.waitForFunction(() => window.__issue206Harness?.ready)
      for (const scenario of [
        'cms',
        'detached-cms',
        'detached-missing',
        'detached-tampered',
        'timestamp',
        'timestamped-data',
        'asics',
        'asice',
        'evidence-record',
        'ers-missing',
        'ers-tampered',
        'asic-tampered',
        'jws-tampered',
        'openpgp-tampered',
        'jws',
        'jws-missing',
        'openpgp',
        'openpgp-missing',
        'openpgp-cleartext',
        'openpgp-embedded',
        'openpgp-encrypted',
        'malformed-cms',
        'unsafe-asics',
        'compression-bomb',
        'oversized'
      ]) {
        const row = {
          browserName,
          browser: browser.version(),
          scenario,
          passed: false
        }
        report.cases.push(row)
        try {
          row.before = await page.evaluate(async (name) => {
            window.issue458Options = {
              initialState: 'collapsed',
              position: 'left',
              openingBehavior: 'overlay'
            }
            const value = await __issue206Harness.run(name)
            window.previousPreview = document.querySelector('.signature-preview-target')
            return {
              ...value,
              cryptoCalls,
              workerCalls,
              hidden: document.querySelector('.signature-details-panel')?.hidden,
              summary:
                document.querySelector('.signature-panel-validation')?.dataset.state || 'neutral'
            }
          }, scenario)
          const captured = await page.evaluate(() => {
            const encode = (buffer) => {
              let text = ''
              for (const byte of new Uint8Array(buffer)) text += String.fromCharCode(byte)
              return btoa(text)
            }
            return {
              type: capturedScenario.type,
              filename: capturedScenario.filename,
              buffer: encode(capturedScenario.buffer),
              original: capturedScenario.options?.originalContent
                ? encode(capturedScenario.options.originalContent)
                : undefined,
              publicJwks: capturedScenario.options?.jwsVerificationKeys,
              publicKeys: capturedScenario.options?.openPgpPublicKeys?.map(encode)
            }
          })
          const fixtureDirectory = path.join(output, 'fixtures')
          await mkdir(fixtureDirectory, { recursive: true })
          row.input = {
            filename: captured.filename,
            type: captured.type,
            origin:
              'Existing public synthetic fixture driver; tampered/missing inputs are synthetic controls generated in this test',
            files: {}
          }
          for (const [label, base64] of [
            ['container', captured.buffer],
            ['original', captured.original],
            ...(captured.publicKeys || []).map((v, i) => ['public-key-' + i, v])
          ]) {
            if (!base64) continue
            const bytes = Buffer.from(base64, 'base64'),
              file = `${browserName}-${scenario}-${label}.bin`
            await writeFile(path.join(fixtureDirectory, file), bytes)
            row.input.files[label] = {
              file: 'fixtures/' + file,
              bytes: bytes.length,
              sha256: createHash('sha256').update(bytes).digest('hex')
            }
          }
          if (captured.publicJwks) row.input.publicJwks = captured.publicJwks
          assert.equal(row.before.sentinel, 0)
          assert.equal(row.before.eventAttributeCount, 0)
          assert.equal(row.before.scriptCount, 0)
          if (!row.before.errorCount && !row.before.error) {
            assert.equal(row.before.hidden, true)
            row.after = await page.evaluate(() => {
              const toggle = document.querySelector('.signature-header [aria-controls]')
              for (let i = 0; i < 20; i++) toggle.click()
              return {
                ...__issue206Harness.snapshot(),
                cryptoCalls,
                workerCalls,
                samePreview:
                  previousPreview === document.querySelector('.signature-preview-target'),
                warningsVisible: [
                  ...document.querySelectorAll('.signature-sidebar .signature-warning')
                ].every((node) => !node.closest('[hidden]')),
                summary:
                  document.querySelector('.signature-panel-validation')?.dataset.state || 'neutral'
              }
            })
            assert.deepEqual(row.after.nestedCalls, row.before.nestedCalls)
            assert.equal(row.after.cryptoCalls, row.before.cryptoCalls)
            assert.equal(row.after.workerCalls, row.before.workerCalls)
            assert.equal(row.after.samePreview, true)
            assert.equal(row.after.warningsVisible, true)
            if (
              ['detached-missing', 'jws-missing', 'openpgp-missing', 'ers-missing'].includes(
                scenario
              )
            )
              assert.equal(row.after.summary, 'incomplete')
            if (
              [
                'detached-tampered',
                'ers-tampered',
                'asic-tampered',
                'jws-tampered',
                'openpgp-tampered'
              ].includes(scenario)
            )
              assert.equal(row.after.summary, 'failed')
            assert.equal(row.after.validStatusCount, row.before.validStatusCount)
          } else
            assert.ok(
              ['malformed-cms', 'unsafe-asics', 'compression-bomb', 'oversized'].includes(scenario),
              scenario + ' unexpectedly failed'
            )
          await page.evaluate(() => __issue206Harness.dispose())
          assert.equal(await page.evaluate(() => __issue206Harness.snapshot().activeWorkers), 0)
          row.passed = true
        } catch (error) {
          row.error = error.stack
          await page.screenshot({
            path: path.join(output, `${browserName}-${scenario}-failure.png`)
          })
          throw error
        } finally {
          await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
        }
      }
      await page.close()
    } finally {
      await browser.close()
    }
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(external, [])
  assert.ok(requests.some((name) => name.endsWith('rpgp_wrapper_bg.wasm')))
  report.passed = true
  console.log(
    `Signature formats: ${report.cases.length} actual crypto/Worker/WASM scenarios passed with toggle invariants.`
  )
} finally {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
