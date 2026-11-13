// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { importPlaywright } from './lib/import-playwright.mjs'
import { startLocalStaticServer } from './lib/local-static-server.mjs'

const timeout = Number(process.env.FILE_VIEWER_REACT_EMAIL_SMOKE_TIMEOUT || 60_000)
const browserNames = (
  process.env.FILE_VIEWER_REACT_EMAIL_SMOKE_BROWSERS || 'chromium,firefox,webkit'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const maliciousFilename = 'evil"><img src=x onerror=globalThis.__reactEmailInjected=1>.txt'
const caseIds = ['react-standard', 'react-full', 'react-legacy-standard', 'react-legacy-full']
const externalBase = process.env.FILE_VIEWER_COMPONENT_EMAIL_DEMO_URL
let localServer
const baseUrl =
  externalBase ||
  (localServer = await startLocalStaticServer(
    resolve(process.env.WRAPPER_DEMO_OUTPUT_DIR || 'apps/component-demo/dist')
  )).origin
const pageUrl = new URL('react-email.html', `${baseUrl.replace(/\/?$/u, '/')}`).href

const playwrightModule = await importPlaywright()
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
const reports = []

const installDeepHelpers = () => {
  const collectRoots = (root) => {
    const roots = [root]
    for (const node of root.querySelectorAll('*')) {
      if (node.shadowRoot) roots.push(...collectRoots(node.shadowRoot))
    }
    return roots
  }
  window.__reactEmailFindAll = (caseId, selector) => {
    const host = document.querySelector(`#${caseId}`)
    return host ? collectRoots(host).flatMap((root) => [...root.querySelectorAll(selector)]) : []
  }
  window.__reactEmailFindAttachment = (caseId, filename) =>
    window
      .__reactEmailFindAll(caseId, '.attachment-item')
      .find((button) => button.textContent.includes(filename))
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
        : await browserType.launch({ headless: true })
    try {
      const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } })
      page.setDefaultTimeout(timeout)
      const failures = []
      const consoleDiagnostics = []
      page.on('pageerror', (error) => failures.push(`pageerror: ${error.stack || error.message}`))
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        consoleDiagnostics.push(
          Promise.all(
            message.args().map((argument) =>
              argument
                .evaluate((value) => {
                  if (value instanceof Error)
                    return { name: value.name, message: value.message, stack: value.stack }
                  return typeof value === 'string' ? value : String(value)
                })
                .catch(() => '<unavailable>')
            )
          ).then((values) => {
            failures.push(`console: ${message.text()} args=${JSON.stringify(values)}`)
          })
        )
      })
      page.on('requestfailed', (request) =>
        failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`)
      )
      page.on('response', (response) => {
        if (response.status() >= 400)
          failures.push(`response: ${response.status()} ${response.url()}`)
      })

      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout })
      await page.evaluate(installDeepHelpers)
      await page.waitForFunction(
        () => document.body.dataset.reactEmailStatus === 'ready',
        undefined,
        { timeout }
      )

      const cases = []
      for (const caseId of caseIds) {
        try {
          await page.waitForFunction(
            ({ id, filename }) =>
              Boolean(
                window.__reactEmailFindAttachment(id, 'contract.pdf') &&
                window.__reactEmailFindAttachment(id, filename)
              ),
            { id: caseId, filename: maliciousFilename },
            { timeout }
          )
        } catch (error) {
          const diagnostic = await page.evaluate(
            (ids) => ({
              api: window.__FILE_VIEWER_REACT_EMAIL_DEMO__?.snapshot(),
              bodyStatus: document.body.dataset.reactEmailStatus,
              cases: ids.map((id) => ({
                attachments: window
                  .__reactEmailFindAll(id, '.attachment-item')
                  .map((node) => node.textContent),
                errors: window
                  .__reactEmailFindAll(id, '[data-viewer-state="error"], .file-viewer-error')
                  .map((node) => node.textContent),
                text: window
                  .__reactEmailFindAll(id, '.email-viewer, .file-viewer-empty-state')
                  .map((node) => node.textContent)
              }))
            }),
            caseIds
          )
          throw new Error(
            `${browserName}/${caseId} did not expose both fixed attachments: ${JSON.stringify(diagnostic)}`,
            { cause: error }
          )
        }
        await page.evaluate(
          (id) => window.__reactEmailFindAttachment(id, 'contract.pdf').click(),
          caseId
        )
        await page.waitForFunction(
          (id) =>
            window
              .__reactEmailFindAll(id, '.attachment-target canvas')
              .some((canvas) => canvas.width > 10 && canvas.height > 10),
          caseId,
          { timeout }
        )
        const pdfCanvas = await page.evaluate((id) => {
          const canvas = window
            .__reactEmailFindAll(id, '.attachment-target canvas')
            .find((node) => node.width > 10 && node.height > 10)
          return { width: canvas.width, height: canvas.height }
        }, caseId)
        await page.evaluate(
          ({ id, filename }) => window.__reactEmailFindAttachment(id, filename).click(),
          { id: caseId, filename: maliciousFilename }
        )
        await page.waitForFunction(
          (id) =>
            window
              .__reactEmailFindAll(id, '.attachment-target .code-viewer')
              .some((node) => node.textContent.includes('safe text attachment')),
          caseId,
          { timeout }
        )
        const security = await page.evaluate(
          ({ id, filename }) => ({
            filenameVisible: window
              .__reactEmailFindAll(id, '.attachment-preview-head strong')
              .some((node) => node.textContent === filename),
            injectedImages: window.__reactEmailFindAll(id, 'img[src="x"]').length,
            sentinel: window.__reactEmailInjected
          }),
          { id: caseId, filename: maliciousFilename }
        )
        assert.equal(
          security.filenameVisible,
          true,
          `${browserName}/${caseId} lost the hostile filename text`
        )
        assert.equal(
          security.injectedImages,
          0,
          `${browserName}/${caseId} created markup from the filename`
        )
        assert.equal(
          security.sentinel,
          undefined,
          `${browserName}/${caseId} executed the filename payload`
        )
        cases.push({ caseId, pdfCanvas, security, textPreview: true })
      }

      await page.evaluate(() => window.__FILE_VIEWER_REACT_EMAIL_DEMO__.switchFixture())
      await page.waitForFunction(
        (ids) =>
          ids.every((id) => {
            const attachments = window.__reactEmailFindAll(id, '.attachment-item')
            return (
              attachments.length === 1 && attachments[0]?.textContent.includes('replacement.txt')
            )
          }),
        caseIds,
        { timeout }
      )
      for (const caseId of caseIds) {
        await page.evaluate(
          (id) => window.__reactEmailFindAttachment(id, 'replacement.txt').click(),
          caseId
        )
        await page.waitForFunction(
          (id) =>
            window
              .__reactEmailFindAll(id, '.attachment-target .code-viewer')
              .some((node) => node.textContent.includes('replacement attachment')),
          caseId,
          { timeout }
        )
        const replacement = await page.evaluate(
          ({ id, oldNames }) => ({
            names: window
              .__reactEmailFindAll(id, '.attachment-item strong')
              .map((node) => node.textContent.trim()),
            oldAttachmentCount: oldNames.reduce(
              (count, name) => count + Number(Boolean(window.__reactEmailFindAttachment(id, name))),
              0
            ),
            replacementVisible: window
              .__reactEmailFindAll(id, '.attachment-target .code-viewer')
              .some((node) => node.textContent.includes('replacement attachment'))
          }),
          { id: caseId, oldNames: ['contract.pdf', maliciousFilename] }
        )
        assert.deepEqual(
          replacement.names,
          ['replacement.txt'],
          `${browserName}/${caseId} did not replace the attachment list`
        )
        assert.equal(
          replacement.oldAttachmentCount,
          0,
          `${browserName}/${caseId} retained an attachment from the initial fixture`
        )
        assert.equal(
          replacement.replacementVisible,
          true,
          `${browserName}/${caseId} did not render the replacement attachment`
        )
      }
      await page.evaluate(() => window.__FILE_VIEWER_REACT_EMAIL_DEMO__.unmount())
      await page.waitForFunction(
        () => document.querySelectorAll('.react-email-case').length === 0,
        undefined,
        { timeout }
      )
      await page.waitForFunction(
        () => {
          const snapshot = window.__FILE_VIEWER_REACT_EMAIL_DEMO__.snapshot()
          return snapshot.activeObjectUrls === 0 && snapshot.activeWorkers === 0
        },
        undefined,
        { timeout }
      )
      const cleanup = await page.evaluate(() => window.__FILE_VIEWER_REACT_EMAIL_DEMO__.snapshot())
      await Promise.all(consoleDiagnostics)
      assert.equal(cleanup.fixture, 'replacement', `${browserName} did not switch the EML fixture`)
      assert.equal(cleanup.status, 'unmounted', `${browserName} did not unmount all viewers`)
      assert.equal(cleanup.activeObjectUrls, 0, `${browserName} leaked email object URLs`)
      assert.equal(cleanup.activeWorkers, 0, `${browserName} leaked nested PDF workers`)
      assert.deepEqual(cleanup.errors, [], `${browserName} reported application errors`)
      assert.deepEqual(failures, [], `${browserName} reported browser failures`)
      const { events, ...cleanupSummary } = cleanup
      reports.push({
        browser: browserName,
        cases,
        cleanup: { ...cleanupSummary, eventCount: events.length }
      })
      // BEGIN PREPACK COMPLETION OBSERVATION
      await recordBrowserGateCompletion({ gateId: 'react-email-component-demo', engine: browserName, phase: 'full',
        caseIds: [...cases.map(item => item.caseId), 'replacement-and-unmount-cleanup'], fixtures: ['react-email.html'],
        summary: { caseCount: cases.length, cleanup: { ...cleanupSummary, eventCount: events.length } } })
      // END PREPACK COMPLETION OBSERVATION
    } finally {
      await browser.close()
    }
  }
  console.log(JSON.stringify({ status: 'passed', browsers: reports }, null, 2))
} finally {
  await localServer?.close()
}
