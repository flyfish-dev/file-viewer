import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startRegressionDemo } from './regression-demo-server.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const require = createRequire(import.meta.url)
let playwright
for (const path of [
  root,
  ...(process.env.PATH || '')
    .split(delimiter)
    .filter((p) => p.endsWith(`${sep}node_modules${sep}.bin`))
    .map((p) => resolve(p, '..'))
]) {
  try {
    playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [path] })).href)
    break
  } catch {}
}
assert.ok(playwright, 'Run with npm exec --package playwright')
const output = resolve(root, 'output/mobile-toolbar', new Date().toISOString().replaceAll(':', '-'))
await mkdir(output, { recursive: true })
const demo = await startRegressionDemo(root)
const browser = await (playwright.chromium || playwright.default.chromium).launch({
  headless: true
})
const report = { origin: demo.origin, cases: [], passed: false }
let page
try {
  for (const [name, viewportWidth, hostWidth, locale] of [
    ['phone-zh', 390, 390, 'zh-CN'],
    ['phone-en', 320, 320, 'en-US'],
    ['narrow-desktop-host', 1280, 340, 'en-US']
  ]) {
    page = await browser.newPage({ viewport: { width: viewportWidth, height: 820 } })
    page.setDefaultTimeout(30_000)
    await page.goto(`${demo.origin}/?url=%2Fexample%2Fpdf.pdf&locale=${locale}`)
    await page.locator('.pdfViewer canvas').first().waitFor({ state: 'visible' })
    if (hostWidth !== viewportWidth) {
      await page.locator('.viewer-panel.standalone').evaluate((el, width) => {
        el.style.width = `${width}px`
      }, hostWidth)
    }
    const toolbar = page.locator('.viewer-actions').first()
    await toolbar.evaluate(
      (el) =>
        new Promise((resolve, reject) => {
          const started = performance.now()
          const check = () => {
            if (el.classList.contains('viewer-actions--compact')) return resolve()
            if (performance.now() - started > 5000)
              return reject(new Error('Narrow host never entered compact toolbar mode'))
            requestAnimationFrame(check)
          }
          check()
        })
    )
    const measurements = []
    async function assertLayout(state) {
      const host = await page.locator('.viewer-panel.standalone').boundingBox()
      assert.ok(host, `${name}/${state}: viewer host is missing`)
      const layout = await toolbar.evaluate((el) => {
        const elements = [...el.querySelectorAll('button,input')].filter((item) => {
          const rect = item.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0 && getComputedStyle(item).visibility !== 'hidden'
        })
        return elements.map((item) => {
          const rect = item.getBoundingClientRect()
          return {
            part: item.getAttribute('part'),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            clipped: item.scrollWidth > item.clientWidth + 1
          }
        })
      })
      measurements.push({ state, controls: layout })
      for (const item of layout) {
        assert.ok(
          item.x >= -1 && item.x + item.width <= viewportWidth + 1,
          `${name}/${state}: ${item.part} leaves the viewport`
        )
        assert.ok(
          item.x >= host.x - 1 && item.x + item.width <= host.x + host.width + 1,
          `${name}/${state}: ${item.part} leaves its host`
        )
        assert.ok(
          item.width >= 40 && item.height >= 40,
          `${name}/${state}: ${item.part} has a compressed touch target`
        )
        assert.ok(!item.clipped, `${name}/${state}: ${item.part} clips its content`)
      }
      for (let i = 0; i < layout.length; i++)
        for (let j = i + 1; j < layout.length; j++) {
          const a = layout[i],
            b = layout[j]
          const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
          const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
          assert.ok(x < 1 || y < 1, `${name}/${state}: ${a.part} overlaps ${b.part}`)
        }
    }
    await assertLayout('collapsed')
    await page.screenshot({ path: resolve(output, `${name}-collapsed.png`) })
    const toggle = toolbar.locator('[part~="search-toggle-button"]')
    await toggle.click()
    const input = toolbar.locator('.viewer-search-input')
    await input.waitFor({ state: 'visible' })
    assert.ok(
      (await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 16,
      'Small input text can trigger Safari auto-zoom'
    )
    await input.fill('PDF')
    await input.press('Enter')
    await toolbar
      .locator('.viewer-search-count')
      .filter({ hasText: /^1\/[1-9]\d*$/ })
      .waitFor()
    await assertLayout('search')
    await page.screenshot({ path: resolve(output, `${name}-search.png`) })
    await toolbar.locator('[part~="search-close-button"]').click()
    assert.equal(
      await toggle.evaluate((el) => el.getRootNode().activeElement === el),
      true,
      'Closing search must return keyboard focus to its toggle'
    )
    await toolbar.locator('[part~="more-button"]').click()
    await toolbar.locator('[part~="download-button"]').waitFor({ state: 'visible' })
    await assertLayout('expanded')
    await page.screenshot({ path: resolve(output, `${name}.png`) })
    await toolbar.locator('[part~="more-button"]').click()
    await assertLayout('restored')
    report.cases.push({ name, measurements, passed: true })
    await page.close()
  }
  page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  await page.goto(`${demo.origin}/?url=%2Fexample%2Fpdf.pdf&locale=en-US`)
  await page.locator('.viewer-search-input').waitFor({ state: 'visible' })
  assert.equal(
    await page.locator('[part~="search-toggle-button"]').isVisible(),
    false,
    'Wide hosts lost their inline search field'
  )
  report.cases.push({ name: 'wide-host-inline-search', passed: true })
  report.passed = true
} catch (error) {
  report.error = String(error)
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png') })
  throw error
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  await browser.close()
  await demo.close()
}
console.log(`Native toolbar geometry, mobile search and narrow-host controls passed: ${output}`)
