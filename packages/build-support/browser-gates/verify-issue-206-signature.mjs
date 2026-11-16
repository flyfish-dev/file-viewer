// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const packageRoot = resolve(sourceRoot, 'packages/renderers/signature')
const harnessPath = resolve(packageRoot, 'test/browser/index.html')
const timeout = Number(process.env.FILE_VIEWER_ISSUE_206_TIMEOUT_MS || 90_000)
const require = createRequire(import.meta.url)

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths =
      process.env.PATH?.split(delimiter)
        .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
        .map((binDir) => resolve(binDir, '..'))
        .filter(existsSync) || []
    for (const candidatePath of candidatePaths) {
      try {
        const entry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(entry).href)
      } catch {
        // Keep probing package roots injected by npm exec.
      }
    }
    throw new Error(
      `Missing playwright module: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const startVite = async () => {
  const appRequire = createRequire(resolve(sourceRoot, 'apps/viewer-demo/package.json'))
  const viteEntry = appRequire.resolve('vite')
  const vite = await import(pathToFileURL(viteEntry).href)
  const server = await vite.createServer({
    root: packageRoot,
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      hmr: false,
      fs: { allow: [sourceRoot, packageRoot] },
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'wasm-unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'none'",
          "require-trusted-types-for 'script'",
          'trusted-types file-viewer-test'
        ].join('; ')
      }
    }
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert(
    address && typeof address !== 'string',
    'Unable to determine the issue #206 Vite server address.'
  )
  return { server, url: `http://127.0.0.1:${address.port}/test/browser/` }
}

const assertSafeDom = (state, browserName, scenario) => {
  const prefix = `[${browserName}/${scenario}]`
  assert.equal(state.sentinel, 0, `${prefix} document-derived markup executed a sentinel`)
  assert.equal(state.imageCount, 0, `${prefix} document-derived markup created an image element`)
  assert.equal(state.scriptCount, 0, `${prefix} document-derived markup created a script element`)
  assert.equal(state.eventAttributeCount, 0, `${prefix} an event-handler attribute reached the DOM`)
}

const runScenario = async (page, browserName, name) => {
  const state = await page.evaluate((scenario) => window.__issue206Harness.run(scenario), name)
  assertSafeDom(state, browserName, name)
  return state
}

const disposeAndAssert = async (page, browserName, label) => {
  await page.evaluate(() => window.__issue206Harness.dispose())
  const state = await page.evaluate(() => window.__issue206Harness.snapshot())
  assert.equal(state.activeWorkers, 0, `[${browserName}/${label}] Worker leaked after unmount`)
}

const verifyBrowser = async (browserType, browserName, url) => {
  const browser =
    browserName === 'chromium'
      ? await browserType
          .launch({ headless: true })
          .catch(() => browserType.launch({ channel: 'chrome', headless: true }))
      : await browserType.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(timeout)
    const failures = []
    const requestedUrls = []
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(`console: ${message.text()}`)
    })
    page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
    page.on('request', (request) => requestedUrls.push(request.url()))
    page.on('requestfailed', (request) =>
      failures.push(
        `requestfailed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`
      )
    )

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForFunction(() => window.__issue206Harness?.ready === true, undefined, {
      timeout
    })

    const cms = await runScenario(page, browserName, 'cms')
    assert.match(cms.text, /CRYPTOGRAPHIC CONTAINER/iu)
    assert.match(cms.text, /CMS SignedData|SignedData/iu)
    assert(
      cms.nestedCalls.some((call) => call.extension === 'pdf'),
      `[${browserName}/cms] embedded PDF was not delegated to the nested renderer`
    )

    const detached = await runScenario(page, browserName, 'detached-cms')
    assert.match(detached.text, /Signature: valid/iu)
    assert.match(detached.text, /Content digest: valid/iu)
    assert(
      detached.nestedCalls.some((call) => call.filename === 'invoice.pdf'),
      `[${browserName}/detached-cms] supplied original was not previewed`
    )

    const timestamp = await runScenario(page, browserName, 'timestamp')
    assert.match(timestamp.text, /RFC 3161 timestamp/iu)
    assert.match(timestamp.text, /Message imprint: valid/iu)

    const timestampedData = await runScenario(page, browserName, 'timestamped-data')
    assert.match(timestampedData.text, /RFC 5544 TimeStampedData/iu)
    assert(
      timestampedData.nestedCalls.length > 0,
      `[${browserName}/timestamped-data] embedded content was not previewed`
    )

    const asics = await runScenario(page, browserName, 'asics')
    assert.match(asics.text, /ASSOCIATED SIGNATURE CONTAINER/iu)
    assert.match(asics.text, /ASiC-S/iu)
    assert.equal(
      asics.activeWorkers,
      1,
      `[${browserName}/asics] expected one bounded container Worker`
    )
    assert(
      asics.nestedCalls.some((call) => call.filename === 'invoice.pdf'),
      `[${browserName}/asics] contained PDF was not previewed`
    )
    await disposeAndAssert(page, browserName, 'asics')

    const asice = await runScenario(page, browserName, 'asice')
    assert.match(asice.text, /ASiC-E/iu)
    assert(
      asice.buttons.includes('invoice.pdf') && asice.buttons.includes('sample.xml'),
      `[${browserName}/asice] multi-document navigation is incomplete`
    )
    const openedXml = await page.evaluate(() =>
      window.__issue206Harness.openContainedDocument('sample.xml')
    )
    assert(
      openedXml.nestedCalls.some(
        (call) => call.filename === 'sample.xml' && call.extension === 'xml'
      ),
      `[${browserName}/asice] XML document navigation did not use the nested renderer`
    )
    await disposeAndAssert(page, browserName, 'asice')

    const evidence = await runScenario(page, browserName, 'evidence-record')
    assert.match(evidence.text, /ARCHIVAL EVIDENCE/iu)
    assert.match(evidence.text, /First evidence digest\s+Matches/iu)
    assert.match(evidence.text, /Full archival validation\s+Not performed/iu)

    const jws = await runScenario(page, browserName, 'jws')
    assert.match(jws.text, /JSON WEB SIGNATURE/iu)
    assert.match(jws.text, /Cryptographic signature: valid/iu)
    assert.match(jws.text, /never fetched automatically/iu)
    assert(
      jws.nestedCalls.some((call) => call.extension === 'json'),
      `[${browserName}/jws] JWS payload was not delegated safely`
    )

    const openPgp = await runScenario(page, browserName, 'openpgp')
    assert.match(openPgp.text, /OPENPGP/iu)
    assert.match(openPgp.text, /Cryptographic signature: valid/iu)
    assert.equal(openPgp.activeWorkers, 1, `[${browserName}/openpgp] expected one rPGP Worker`)
    await disposeAndAssert(page, browserName, 'openpgp')

    for (const scenario of ['openpgp-cleartext', 'openpgp-embedded']) {
      const signedMessage = await runScenario(page, browserName, scenario)
      assert.match(signedMessage.text, /OPENPGP/iu)
      assert.match(signedMessage.text, /Signatures\s+2/iu)
      assert(
        signedMessage.signatureItemCount >= 2,
        `[${browserName}/${scenario}] expected metadata for both signatures`
      )
      assert(
        signedMessage.validStatusCount >= 2,
        `[${browserName}/${scenario}] both signatures were not verified`
      )
      assert(
        signedMessage.nestedCalls.some(
          (call) =>
            call.extension === 'txt' &&
            call.filename === (scenario === 'openpgp-cleartext' ? 'cleartext.txt' : 'hello.txt')
        ),
        `[${browserName}/${scenario}] exact literal text was not delegated to the nested renderer`
      )
      assert.equal(
        signedMessage.activeWorkers,
        1,
        `[${browserName}/${scenario}] expected one rPGP Worker`
      )
      await disposeAndAssert(page, browserName, scenario)
    }

    const encryptedOpenPgp = await runScenario(page, browserName, 'openpgp-encrypted')
    assert.match(encryptedOpenPgp.text, /encrypted-message/iu)
    assert.match(encryptedOpenPgp.text, /Integrity protected\s+Yes/iu)
    assert.match(encryptedOpenPgp.text, /Recipients\s+[A-F0-9]{16,64}/iu)
    assert.match(encryptedOpenPgp.text, /automatic decryption is not exposed/iu)
    assert.equal(
      encryptedOpenPgp.nestedCalls.length,
      0,
      `[${browserName}/openpgp-encrypted] encrypted content escaped into nested preview`
    )
    await disposeAndAssert(page, browserName, 'openpgp-encrypted')

    for (const [scenario, errorPattern] of [
      ['malformed-cms', /ASN\.1|malformed|truncated|length/iu],
      ['unsafe-asics', /path traversal|unsafe ASiC ZIP|unsafe archive/iu],
      ['compression-bomb', /compression ratio|unsafe archive/iu]
    ]) {
      const state = await runScenario(page, browserName, scenario)
      assert.equal(
        state.errorCount,
        1,
        `[${browserName}/${scenario}] unsafe input did not render a bounded error`
      )
      assert.match(state.text, errorPattern)
      await disposeAndAssert(page, browserName, scenario)
    }

    const oversized = await runScenario(page, browserName, 'oversized')
    assert.match(oversized.error, /exceeds the 32 B parsing limit/iu)

    for (let iteration = 0; iteration < 2; iteration += 1) {
      await runScenario(page, browserName, iteration % 2 === 0 ? 'asics' : 'openpgp')
      await disposeAndAssert(page, browserName, `repeat-${iteration + 1}`)
    }

    const externalRequests = requestedUrls.filter((requestUrl) => {
      const parsed = new URL(requestUrl)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? parsed.hostname !== '127.0.0.1'
        : false
    })
    assert.deepEqual(
      externalRequests,
      [],
      `[${browserName}] signature renderer attempted external network requests`
    )
    assert(
      !requestedUrls.some((requestUrl) => requestUrl.includes('example.invalid')),
      `[${browserName}] untrusted jku was fetched`
    )
    assert.deepEqual(failures, [], `[${browserName}] browser failures:\n${failures.join('\n')}`)
    console.log(
      `[issue-206-signature] ${browserName} verified CMS, timestamps, ASiC, ERS, JWS, rPGP/WASM detached/cleartext/embedded signatures, encrypted metadata, CSP/Trusted Types, hostile inputs and Worker cleanup.`
    )
    // BEGIN PREPACK COMPLETION OBSERVATION
    await recordBrowserGateCompletion({ gateId: 'issue-206-signature', engine: browserName, phase: 'full',
      caseIds: ['cms', 'detached-cms', 'timestamp', 'timestamped-data', 'asics', 'asice', 'evidence-record', 'jws', 'openpgp', 'openpgp-cleartext', 'openpgp-embedded', 'openpgp-encrypted', 'malformed-cms', 'unsafe-asics', 'compression-bomb', 'oversized', 'repeat-asics', 'repeat-openpgp'],
      fixtures: ['signature-browser-harness'], summary: { externalRequestCount: externalRequests.length, browserFailureCount: failures.length } })
    // END PREPACK COMPLETION OBSERVATION
  } finally {
    await browser.close()
  }
}

assert(existsSync(harnessPath), `Missing issue #206 browser harness: ${harnessPath}`)
assert(
  existsSync(resolve(packageRoot, 'dist/signature.js')),
  'Build @file-viewer/renderer-signature before running the browser verifier.'
)
assert(existsSync(resolve(packageRoot, 'dist/signature.worker.js')), 'Missing built rPGP Worker.')
assert(existsSync(resolve(packageRoot, 'dist/container.worker.js')), 'Missing built ASiC Worker.')
assert(
  existsSync(resolve(packageRoot, 'dist/rpgp-wasm/rpgp_wrapper_bg.wasm')),
  'Missing built rPGP WASM asset.'
)

const vite = await startVite()
try {
  const playwrightModule = await importPlaywright()
  const playwright = playwrightModule.default || playwrightModule
  const browserNames = String(
    process.env.FILE_VIEWER_ISSUE_206_BROWSERS || 'chromium,firefox,webkit'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  assert(browserNames.length > 0, 'At least one issue #206 browser engine is required.')
  for (const browserName of browserNames) {
    assert(
      ['chromium', 'firefox', 'webkit'].includes(browserName),
      `Unsupported issue #206 browser: ${browserName}`
    )
    assert(playwright[browserName], `Playwright did not expose ${browserName}`)
    await verifyBrowser(playwright[browserName], browserName, vite.url)
  }
} finally {
  await vite.server.close()
}
