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
const browser = await chromium.launch({
  headless: true,
  channel: process.env.OFFICIAL_SITE_BROWSER_CHANNEL
})
const qrPattern = /\/(?:wecom|updates|community)-[\w-]+\.webp(?:\?|$)/
const contactAlts = ['企业微信二维码', '微信公众号二维码', '用户交流群二维码']

async function openFooter(context, locale) {
  const page = await context.newPage()
  const url = new URL(locale === 'zh-CN' ? '/' : '/en/', baseUrl)
  url.searchParams.set('lang', locale)
  url.hash = 'support'
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' })
  return page
}

async function assertSponsorLinks(footer, shopLabel) {
  for (const [label, url] of [
    ['GitHub Sponsors', 'https://github.com/sponsors/wybaby168'],
    [shopLabel, 'https://dev.flyfish.group/sponsor?source=github']
  ]) {
    const link = footer.getByRole('link', { name: label, exact: true })
    assert.ok(await link.isVisible())
    assert.equal(await link.getAttribute('href'), url)
  }
}

try {
  const chinese = await browser.newContext({ locale: 'zh-CN' })
  let release
  const held = new Promise((resolve) => { release = resolve })
  const sources = new Set()
  await chinese.route(qrPattern, async (route) => {
    sources.add(new URL(route.request().url()).pathname)
    await held
    await route.continue()
  })
  const page = await openFooter(chinese, 'zh-CN')
  const footer = page.locator('#support')
  const images = footer.locator('.support-qr-frame img')
  try {
    for (const alt of contactAlts) {
      await footer.getByRole('img', { name: alt, exact: true }).waitFor({ state: 'visible' })
    }
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('.support-qr-frame img')]
      return images.length === 3 && images.every((image) => image.getBoundingClientRect().width >= 96)
    })
    await assertSponsorLinks(footer, '飞鱼小铺')
  } finally {
    release()
  }
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.support-qr-frame img')]
    return images.length === 3 && images.every((image) => image.complete && image.naturalWidth > 0)
  })
  assert.equal(sources.size, 3)
  assert.deepEqual(await images.evaluateAll((elements) => elements.map((image) => image.alt)), contactAlts)
  await chinese.close()

  const retry = await browser.newContext({ locale: 'zh-CN' })
  let failCommunity = true
  await retry.route(/\/community-[\w-]+\.webp(?:\?|$)/, (route) =>
    failCommunity ? route.abort() : route.continue()
  )
  const retryPage = await openFooter(retry, 'zh-CN')
  const retryButton = retryPage.getByRole('button', { name: '重新加载用户交流群二维码', exact: true })
  await retryButton.waitFor()
  failCommunity = false
  await retryButton.click()
  await retryPage.waitForFunction(() => {
    const image = document.querySelector('img[alt="用户交流群二维码"]')
    return image?.complete && image.naturalWidth > 0
  })
  await retry.close()

  const international = await browser.newContext({ locale: 'en-US' })
  const englishPage = await openFooter(international, 'en-US')
  const englishFooter = englishPage.locator('#support')
  await assertSponsorLinks(englishFooter, 'Flyfish Shop')
  for (const [label, originAndFirstSegment] of [
    ['WhatsApp', 'https://wa.me/qr/'],
    ['Telegram', 'https://t.me/']
  ]) {
    const link = englishFooter.getByRole('link', { name: label, exact: true })
    assert.ok(await link.isVisible())
    assert.ok((await link.getAttribute('href')).startsWith(originAndFirstSegment))
  }
  const email = englishFooter.getByRole('link', { name: 'admin@flyfish.dev', exact: true })
  assert.ok(await email.isVisible())
  assert.equal(await email.getAttribute('href'), 'mailto:admin@flyfish.dev')
  assert.equal(await englishFooter.locator('.support-qr-frame').count(), 0)
  await international.close()

  console.log('[contact-qr] Direct links, automatic QR loading and per-card retry passed.')
} finally {
  await browser.close()
  await server?.httpServer.close()
}
