import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { preview } from 'vite'
import { fileURLToPath } from 'node:url'

const externalUrl = process.env.OFFICIAL_SITE_CONTACT_BASE_URL
const server = externalUrl
  ? null
  : await preview({
      root: fileURLToPath(new URL('..', import.meta.url)),
      configFile: false,
      preview: { host: '127.0.0.1', port: 0 }
    })
const baseUrl = externalUrl || `http://127.0.0.1:${server.httpServer.address().port}`
const browser = await chromium.launch({ headless: true })
const expectedAlts = ['客服企业微信二维码', '微信公众号二维码', '用户交流群二维码']
const qrPattern = /\/(?:wecom|updates|community)-[\w-]+\.webp(?:\?|$)/

try {
  // Hold the first requests to reproduce a cold, slow connection deterministically.
  const context = await browser.newContext({ locale: 'zh-CN' })
  const page = await context.newPage()
  const pending = []
  const requested = new Set()
  let hold = true
  await context.route(qrPattern, async (route) => {
    requested.add(new URL(route.request().url()).pathname)
    if (hold) await new Promise((resolve) => pending.push(resolve))
    await route.continue()
  })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '联系我们', exact: true }).click()
  await page.waitForFunction(
    () => document.querySelectorAll('.support-contact-preview-image').length === 3
  )
  const buttons = page.locator('.support-contact-list > button')
  const panels = page.locator('.support-contact-preview-image')
  for (const index of [1, 2, 0, 2]) {
    await buttons.nth(index).click()
    await page.evaluate(() => new Promise(requestAnimationFrame))
    assert.equal(await buttons.nth(index).getAttribute('aria-pressed'), 'true')
    assert.equal(await panels.nth(index).isVisible(), true)
    assert.equal(
      await page.locator('.support-contact-preview img:visible').count(),
      0,
      'A slow tab must hide the previous QR instead of displaying it under a new label'
    )
    assert.match(await panels.nth(index).innerText(), /正在加载/)
  }
  assert.equal(requested.size, 3, 'All contact QRs must start loading together')
  hold = false
  pending.splice(0).forEach((resolve) => resolve())
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.support-contact-preview img')].every(
      (image) => image.complete && image.naturalWidth > 0
    )
  )

  for (const index of [0, 1, 2, 1, 0, 2]) {
    await buttons.nth(index).evaluate((button) => button.click())
    await page.evaluate(() => new Promise(requestAnimationFrame))
    const visible = page.locator('.support-contact-preview img:visible')
    assert.equal(await visible.count(), 1)
    const state = await visible.evaluate((image) => ({
      alt: image.alt,
      complete: image.complete,
      currentSrc: image.currentSrc,
      src: image.src
    }))
    assert.equal(state.alt, expectedAlts[index])
    assert.ok(
      state.complete && state.currentSrc === state.src,
      'The selected QR must be decoded within one frame'
    )
  }

  // An individual download failure must be recoverable without reopening the dialog.
  await context.close()
  const retryContext = await browser.newContext({ locale: 'zh-CN' })
  let failCommunity = true
  await retryContext.route(/\/community-[\w-]+\.webp(?:\?|$)/, (route) =>
    failCommunity ? route.abort() : route.continue()
  )
  const retryPage = await retryContext.newPage()
  await retryPage.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await retryPage.getByRole('button', { name: '联系我们', exact: true }).click()
  await retryPage.locator('.support-contact-list > button').nth(2).click()
  await retryPage.getByRole('button', { name: '重新加载', exact: true }).waitFor()
  failCommunity = false
  await retryPage.getByRole('button', { name: '重新加载', exact: true }).click()
  await retryPage.waitForFunction(() => {
    const image = [...document.querySelectorAll('.support-contact-preview img')].find(
      (image) => image.alt === '用户交流群二维码'
    )
    return image?.complete && image.naturalWidth > 0
  })
  await retryContext.close()
  console.log(
    '[contact-qr] Cold loading, one-frame switching, rapid clicks and error recovery passed.'
  )
} finally {
  await browser.close()
  await server?.httpServer.close()
}
