import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

// Run against a local, already built Demo, e.g. Vite preview on port 18780.
// These are actual renderer captures, not decorative format illustrations.
const appRoot = resolve(import.meta.dirname, '..')
const base = new URL(process.env.DEMO_SAMPLE_PREVIEW_URL || 'http://127.0.0.1:18780/')
assert(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname),
  'Preview capture must use a local Demo server')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const samples = [
  { id: 'business-report', sources: ['/example/en/quarterly-operations-report.docx'],
    selector: 'section.docx', ready: 'document' },
  { id: 'drawing', sources: ['/example/sample.dwg'], selector: '.cad-stage', ready: 'cad' },
  { id: 'presentation', sources: ['/example/en/sample-presentation.pptx', '/example/ppt.pptx'],
    selector: '.flyfish-pptx-content[data-render-state="ready"] .slide', ready: 'presentation' },
  { id: 'workbook-en', sources: ['/example/en/financial-sample.xlsx'], selector: '.e-virt-table-stage', ready: 'workbook' },
  { id: 'workbook-zh', sources: ['/example/excel.xlsx'], selector: '.e-virt-table-stage', ready: 'workbook' },
  { id: 'model', sources: ['/example/fox.glb'], selector: '.model-stage', ready: 'model',
    attribution: './example/licenses/fox/NOTICE.txt' }
]
const imageDirectory = resolve(appRoot, 'public/sample-previews')
const manifestPath = resolve(appRoot, 'src/data/demoSamplePreviews.json')
const selectedIds = process.env.DEMO_SAMPLE_PREVIEW_IDS?.split(',').map(id => id.trim()).filter(Boolean)
if (selectedIds) {
  for (const id of selectedIds) assert(samples.some(sample => sample.id === id), `Unknown preview: ${id}`)
}
await mkdir(imageDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })
const previews = selectedIds
  ? JSON.parse(await readFile(manifestPath, 'utf8')).previews.filter(preview => !selectedIds.includes(preview.id))
  : []
try {
  for (const sample of samples.filter(sample => !selectedIds || selectedIds.includes(sample.id))) {
    const source = await readFile(resolve(appRoot, `public${sample.sources[0]}`))
    for (const alias of sample.sources.slice(1)) {
      assert.equal(hash(await readFile(resolve(appRoot, `public${alias}`))), hash(source),
        `A shared preview requires identical source bytes: ${alias}`)
    }
    const page = await browser.newPage({ viewport: { width: sample.ready === 'cad' ? 1280 : 960,
      height: sample.ready === 'document' ? 1300 : 660 },
      colorScheme: 'light', reducedMotion: 'reduce', deviceScaleFactor: 1 })
    try {
      await page.route('**/*', route => new URL(route.request().url()).origin === base.origin
        ? route.continue() : route.abort())
      const address = new URL('iframe.html', base)
      address.searchParams.set('url', new URL(`.${sample.sources[0]}`, base).href)
      address.searchParams.set('lang', sample.id.endsWith('-zh') ? 'zh-CN' : 'en-US')
      await page.goto(address.href)
      const rootSelector = { cad: '.cad-shell', model: '.model-viewer', document: 'section.docx',
        presentation: '.flyfish-pptx-content[data-render-state="ready"]', workbook: '.e-virt-table-stage' }[sample.ready]
      const renderer = page.locator(rootSelector).first()
      await renderer.waitFor({ state: 'visible', timeout: 90000 })
      // Locator evaluation also works when an iframe entry hosts a shadow root.
      const isReady = (root, kind) => {
        if (kind === 'cad') {
          return root.querySelector('.cad-state')?.hidden &&
            root.querySelector('.cad-stage canvas')?.width > 0
        }
        if (kind === 'model') {
          return root.getAttribute('data-model-status') === 'ready' &&
            Number(root.getAttribute('data-model-mesh-count')) > 0 &&
            root.querySelector('.model-state')?.hidden
        }
        if (kind === 'presentation') {
          const slide = root.querySelector('.slide')
          return slide && !slide.closest('.pptx-render-surface')?.classList.contains('is-loading') &&
            [...slide.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0)
        }
        if (kind === 'document') {
          return root.textContent.includes('Quarterly operations and risk review') &&
            root.textContent.includes('Page 1 of 9')
        }
        return (root.textContent || '').trim().length > 10 || Boolean(root.querySelector('canvas'))
      }
      const deadline = Date.now() + 90000
      while (!(await renderer.evaluate(isReady, sample.ready))) {
        assert(Date.now() < deadline, `Renderer did not become ready: ${sample.id}`)
        await new Promise(resolveRetry => setTimeout(resolveRetry, 120))
      }
      await page.evaluate(() => document.fonts.ready)
      const target = page.locator(sample.selector).first()
      await target.waitFor({ state: 'visible' })
      if (sample.ready === 'model') {
        await target.hover()
        await page.mouse.wheel(0, -500)
      }
      // Wait for the renderer's canvas/layout to reach the compositor.
      await target.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))))
      const image = await target.screenshot({ animations: 'disabled' })
      const path = `./sample-previews/${sample.id}.png`
      await writeFile(resolve(imageDirectory, `${sample.id}.png`), image)
      previews.push({ id: sample.id, sources: sample.sources, sourceSha256: hash(source),
        sourceBytes: source.length, path, imageSha256: hash(image),
        width: image.readUInt32BE(16), height: image.readUInt32BE(20),
        ...(sample.attribution ? { attribution: sample.attribution } : {}) })
      console.log(`[sample-previews] ${sample.id}: ${image.length} bytes from ${sample.sources[0]}`)
    } finally { await page.close() }
  }
  await writeFile(manifestPath,
    JSON.stringify({ method: 'local-renderer-screenshot', previews }, null, 2) + '\n')
} finally { await browser.close() }
