// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { importPlaywright } from './lib/import-playwright.mjs'
import { startLocalStaticServer } from './lib/local-static-server.mjs'
import { browserTestLaunchOptions } from '../browser-test-launch.mjs'

const timeout = Number(process.env.FILE_VIEWER_SPECIALIST_SMOKE_TIMEOUT || 90_000)
const browserNames = (process.env.FILE_VIEWER_SPECIALIST_SMOKE_BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const ifcBrowserNames = (process.env.FILE_VIEWER_SPECIALIST_IFC_BROWSERS || 'chromium')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const externalBase = process.env.FILE_VIEWER_SPECIALIST_DEMO_URL
let localServer
const baseUrl =
  externalBase ||
  (localServer = await startLocalStaticServer(
    resolve(process.env.DEMO_OUTPUT_DIR || 'apps/viewer-demo/dist')
  )).origin
const normalizedBase = `${baseUrl.replace(/\/?$/u, '/')}`
const baseOrigin = new URL(normalizedBase).origin
const mainUrl = new URL('index.html', normalizedBase).href
const platformTelemetryHosts = new Set([
  'static.cloudflareinsights.com',
  'cloudflareinsights.com'
])
const fixtureHashes = {
  'example/ct-small.dcm': '3dd31e5cc835b3f2cdd46c9da1982f59251e78518fefa8163d914631c66437d6',
  'example/signature-invoice-cades-bes.pdf.p7m':
    '747e55a36957af196d38eee2ae7c6d7a966404bcb33714e68523d122916c9fa8',
  'example/binary-raw.bin':
    '8bc465196a5494c8b636fc392034ba8e4b62f14b55ad95da8e4d10d00f953a84',
  'example/buildingSMART-ifc4-building.ifc':
    '8790a1e193e82b8e7e7f337ec2633cd40f2120590317a1443503a25b079e2e80'
}

for (const [path, expected] of Object.entries(fixtureHashes)) {
  const response = await fetch(new URL(path, normalizedBase))
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`)
  const actual = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')
  assert.equal(actual, expected, `${path} production checksum drifted`)
}

const manifestResponse = await fetch(new URL('file-viewer-manifest.json', normalizedBase))
assert.equal(manifestResponse.ok, true, `Vite manifest returned HTTP ${manifestResponse.status}`)
const viteManifest = await manifestResponse.json()
const implementationUrls = new Map(
  [
    ['dicom', '/packages/renderers/dicom/src/dicom.ts'],
    ['signature', '/packages/renderers/signature/src/signature.ts'],
    ['binary', '/packages/renderers/binary/src/binary.ts'],
    ['ifc', '/packages/renderers/3d/src/ifcRuntime.ts']
  ].map(([renderer, suffix]) => {
    const key = Object.keys(viteManifest).find((candidate) =>
      candidate.replace(/\\/gu, '/').endsWith(suffix)
    )
    assert(key, `Vite manifest is missing the lazy ${renderer} implementation chunk`)
    return [renderer, new URL(viteManifest[key].file, normalizedBase).href]
  })
)

const playwrightModule = await importPlaywright()
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
const reports = []

const openSpecialistGroup = async (page, family) => {
  await page.locator('.rail-nav-button--samples').click()
  const group = page.locator('.sample-group[data-family="' + family + '"]')
  await group.waitFor({ state: 'visible', timeout })
  if ((await group.locator('.sample-group-grid').count()) === 0) {
    await group.locator('.sample-group-header').click()
  }
  await group.locator('.sample-group-grid').waitFor({ state: 'visible', timeout })
  return group
}

try {
  for (const browserName of browserNames) {
    const browserType = playwright[browserName]
    assert(browserType, `Unknown Playwright browser: ${browserName}`)
    const browser =
      browserName === 'chromium'
        ? await browserType
            .launch({ headless: true })
            .catch(() => browserType.launch({ channel: 'chrome', headless: true }))
        : await browserType.launch(browserTestLaunchOptions(browserName))
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
      page.setDefaultTimeout(timeout)
      const failures = []
      const requests = []
      page.on('pageerror', (error) => failures.push(`pageerror: ${error.stack || error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') failures.push(`console: ${message.text()}`)
      })
      page.on('request', (request) => requests.push(request.url()))
      page.on('requestfailed', (request) =>
        failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`)
      )
      page.on('response', (response) => {
        if (response.status() >= 400) failures.push(`response: ${response.status()} ${response.url()}`)
      })

      await page.goto(mainUrl, { waitUntil: 'networkidle', timeout })
      await page.locator('.file-viewer').first().waitFor({ state: 'attached', timeout }).catch(
        async (error) => {
          const diagnostics = {
            failures,
            title: await page.title(),
            url: page.url(),
            body: (await page.locator('body').innerText()).slice(0, 1000)
          }
          throw new Error(
            `${browserName} main Viewer did not mount: ${JSON.stringify(diagnostics, null, 2)}`,
            { cause: error }
          )
        }
      )
      const initialRequests = [...requests]
      for (const [renderer, implementationUrl] of implementationUrls) {
        assert(
          !initialRequests.includes(implementationUrl),
          `${browserName} loaded the ${renderer} implementation before selecting its format`
        )
      }

      let group = await openSpecialistGroup(page, 'signature')
      const cards = await group.locator('.sample-card').allTextContents()
      assert.equal(cards.length, 2, `${browserName} unified specialist group must contain two samples`)
      assert.match(cards[0] || '', /DICOM/iu)
      assert.match(cards[1] || '', /CAdES|P7M/iu)

      const dicomStart = requests.length
      await group.locator('.sample-card').filter({ hasText: 'DICOM' }).click()
      const dicom = page.locator('.dicom-viewer').first()
      await dicom.waitFor({ state: 'visible', timeout })
      await page.locator('.dicom-viewer[data-status="ready"]').first().waitFor({
        state: 'visible',
        timeout
      }).catch(async (error) => {
        const snapshot = await dicom.evaluate((root) => ({
          html: root.innerHTML.slice(0, 1200),
          status: root.getAttribute('data-status'),
          text: root.textContent?.replace(/\s+/gu, ' ').trim()
        }))
        const diagnostics = { failures, ...snapshot }
        throw new Error(
          `${browserName} DICOM did not render: ${JSON.stringify(diagnostics, null, 2)}`,
          { cause: error }
        )
      })
      const dicomCanvas = dicom.locator('canvas').first()
      await dicomCanvas.waitFor({ state: 'attached', timeout })
      const dicomSnapshot = await dicom.evaluate((root) => {
        const canvas = root.querySelector('canvas')
        return {
          columns: root.getAttribute('data-columns'),
          rows: root.getAttribute('data-rows'),
          status: root.getAttribute('data-status'),
          text: root.textContent?.replace(/\s+/gu, ' ').trim(),
          canvas: canvas ? { width: canvas.width, height: canvas.height } : null
        }
      })
      assert.equal(dicomSnapshot.status, 'ready', `${browserName} DICOM did not reach ready`)
      assert.equal(dicomSnapshot.columns, '128', `${browserName} DICOM column metadata drifted`)
      assert.equal(dicomSnapshot.rows, '128', `${browserName} DICOM row metadata drifted`)
      assert(dicomSnapshot.canvas?.width > 10 && dicomSnapshot.canvas?.height > 10)
      assert.match(dicomSnapshot.text || '', /128×128|CT/iu)
      assert(
        requests.slice(dicomStart).includes(implementationUrls.get('dicom')),
        `${browserName} did not lazy-load the DICOM implementation after selection`
      )

      group = await openSpecialistGroup(page, 'signature')
      const signatureStart = requests.length
      await group.locator('.sample-card').filter({ hasText: /CAdES|P7M/iu }).click()
      const signature = page.locator('.signature-shell').first()
      await signature.waitFor({ state: 'visible', timeout })
      await signature.locator('.signature-card h3').filter({ hasText: 'Container summary' }).waitFor({
        state: 'visible',
        timeout
      })
      const signatureText = (await signature.innerText()).replace(/\s+/gu, ' ').trim()
      assert.match(signatureText, /CMS|CAdES|SignedData/iu)
      assert.match(signatureText, /Container summary/iu)
      assert(
        requests.slice(signatureStart).includes(implementationUrls.get('signature')),
        `${browserName} did not lazy-load the signature implementation after selection`
      )

      group = await openSpecialistGroup(page, 'binary')
      const binaryStart = requests.length
      await group.locator('.sample-card').filter({ hasText: 'binary-raw.bin' }).click()
      const binary = page.locator('.fv-binary[data-binary-inspector-ready="true"]').first()
      await binary.waitFor({ state: 'visible', timeout })
      await binary.locator('[data-binary-tree-node]').first().waitFor({ state: 'visible', timeout })
      const binaryByte = binary.locator('[data-binary-byte-offset="0"]').first()
      await binaryByte.waitFor({ state: 'visible', timeout })
      await binaryByte.click()
      const binarySnapshot = await binary.evaluate((root) => ({
        byteCount: root.querySelectorAll('[data-binary-byte-offset]').length,
        selectedStart: root.getAttribute('data-binary-selected-start'),
        template: root.getAttribute('data-binary-template'),
        treeNodeCount: root.querySelectorAll('[data-binary-tree-node]').length
      }))
      assert.equal(binarySnapshot.template, 'raw', browserName + ' binary sample used the wrong parser template')
      assert(binarySnapshot.treeNodeCount > 0, browserName + ' binary sample has no structure tree')
      assert(binarySnapshot.byteCount > 0, browserName + ' binary sample has no rendered hex bytes')
      assert.equal(binarySnapshot.selectedStart, '0', browserName + ' binary byte selection did not update')
      assert(
        requests.slice(binaryStart).includes(implementationUrls.get('binary')),
        browserName + ' did not lazy-load the binary implementation after selection'
      )

      let ifcSnapshot = null
      if (ifcBrowserNames.includes(browserName)) {
        group = await openSpecialistGroup(page, 'model')
        const ifcStart = requests.length
        await group.locator('.sample-card').filter({ hasText: 'buildingSMART-ifc4-building.ifc' }).click()
        const ifc = page.locator('.fv-ifc[data-ifc-status="ready"]').first()
        await ifc.waitFor({ state: 'visible', timeout: timeout * 2 })
        const ifcCanvas = ifc.locator('.fv-ifc-stage canvas').first()
        await ifcCanvas.waitFor({ state: 'visible', timeout: timeout * 2 })
        const toolbarButtons = ifc.locator('.fv-ifc-toolbar button')
        assert.equal(await toolbarButtons.count(), 3, browserName + ' IFC toolbar lost a required control')
        const properties = ifc.locator('.fv-ifc-properties')
        await properties.waitFor({ state: 'visible', timeout })
        await toolbarButtons.nth(2).click()
        await properties.waitFor({ state: 'hidden', timeout })
        await toolbarButtons.nth(2).click()
        await properties.waitFor({ state: 'visible', timeout })
        await toolbarButtons.nth(0).click()
        const ifcRequests = requests.slice(ifcStart)
        const ifcAssetRequests = ifcRequests.filter((requested) =>
          new URL(requested).pathname.includes('/file-viewer/vendor/ifc/')
        )
        assert(
          ifcAssetRequests.some((requested) =>
            new URL(requested).pathname.endsWith('/file-viewer/vendor/ifc/ifc-import.worker.js')
          ),
          browserName + ' IFC import worker was not loaded from the Demo origin'
        )
        assert(
          ifcAssetRequests.some((requested) =>
            /\/file-viewer\/vendor\/ifc\/web-ifc(?:-mt)?\.wasm$/u.test(new URL(requested).pathname)
          ),
          browserName + ' IFC WebAssembly was not loaded from the Demo origin'
        )
        ifcSnapshot = await ifc.evaluate((root) => {
          const canvas = root.querySelector('.fv-ifc-stage canvas')
          return {
            canvas: canvas ? { height: canvas.height, width: canvas.width } : null,
            elementCount: Number(root.getAttribute('data-ifc-element-count') || 0),
            status: root.getAttribute('data-ifc-status')
          }
        })
        assert.equal(ifcSnapshot.status, 'ready', browserName + ' IFC did not reach ready')
        assert(ifcSnapshot.elementCount > 0, browserName + ' IFC has no renderable elements')
        assert(ifcSnapshot.canvas?.width > 10 && ifcSnapshot.canvas?.height > 10)
        assert(
          requests.slice(ifcStart).includes(implementationUrls.get('ifc')),
          browserName + ' did not lazy-load the IFC implementation after selection'
        )
      }

      const finalUrl = new URL(page.url())
      assert.equal(finalUrl.origin, baseOrigin, `${browserName} left the Demo origin`)
      assert(!/opt-in/iu.test(finalUrl.pathname), `${browserName} navigated to the removed opt page`)
      const remoteRequests = requests.filter((requested) => {
        const url = new URL(requested)
        return ['http:', 'https:'].includes(url.protocol) && url.origin !== baseOrigin
      })
      const remoteRuntimeRequests = remoteRequests.filter(
        (requested) => !platformTelemetryHosts.has(new URL(requested).hostname)
      )
      assert.deepEqual(
        remoteRuntimeRequests,
        [],
        `${browserName} fetched a third-party renderer runtime: ${remoteRuntimeRequests.join(', ')}`
      )
      assert(
        requests.every((requested) => !/opt-in(?:\.html)?/iu.test(new URL(requested).pathname)),
        `${browserName} requested the removed opt page`
      )
      assert.deepEqual(failures, [], `${browserName} unified specialist Demo browser failures`)
      reports.push({
        browser: browserName,
        initialRequestCount: initialRequests.length,
        requestCount: requests.length,
        platformTelemetryRequests: remoteRequests.length,
        binary: binarySnapshot,
        dicom: dicomSnapshot,
        ifc: ifcSnapshot,
        signatureSummary: signatureText.slice(0, 240)
      })
      // BEGIN PREPACK COMPLETION OBSERVATION
      await recordBrowserGateCompletion({ gateId: 'unified-specialist-demo', engine: browserName, phase: 'full',
        caseIds: ['initial-lazy-boundary', 'dicom', 'signature', 'binary', ...(ifcSnapshot ? ['ifc'] : [])], fixtures: ['unified-specialist-demo-samples'],
        summary: { ifcParticipated: !!ifcSnapshot, requestCount: requests.length, platformTelemetryRequests: remoteRequests.length } })
      // END PREPACK COMPLETION OBSERVATION
    } finally {
      await browser.close()
    }
  }
  console.log(JSON.stringify({ status: 'passed', baseUrl, browsers: reports }, null, 2))
} finally {
  await localServer?.close()
}
