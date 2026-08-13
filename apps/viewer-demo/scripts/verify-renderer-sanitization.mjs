import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const require = createRequire(import.meta.url)
const demoRequire = createRequire(join(root, 'apps/viewer-demo/package.json'))
const pptxRequire = createRequire(join(root, 'packages/renderers/pptx/package.json'))
const timeout = Number(process.env.RENDERER_SANITIZATION_TIMEOUT || 90000)
const pptxWorkerPath = join(root, 'packages/renderers/pptx/dist/worker/pptx.worker.js')

const sourceAliases = [
  ['@security/markdown', 'packages/renderers/text/src/markdown.ts'],
  ['@security/pptx', 'packages/renderers/pptx/src/viewer.ts'],
  ['@file-viewer/core/assets', 'packages/core/src/assets.ts'],
  ['@file-viewer/core', 'packages/core/src/index.ts']
].map(([find, relativePath]) => ({ find, replacement: join(root, relativePath) }))

const findInjectedPackage = (packageName) => {
  const packageRoots =
    process.env.PATH?.split(delimiter)
      .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map((binDir) => resolve(binDir, '..'))
      .filter(existsSync) || []

  for (const packageRoot of packageRoots) {
    try {
      return require.resolve(packageName, { paths: [packageRoot] })
    } catch {
      // npm exec injects packages into one of these temporary module roots.
    }
  }
  return null
}

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (originalError) {
    const entry = findInjectedPackage('playwright')
    if (entry) {
      return import(pathToFileURL(entry).href)
    }
    throw new Error(
      [
        'Missing Playwright.',
        'Run with: npm exec --yes --package playwright -- node apps/viewer-demo/scripts/verify-renderer-sanitization.mjs',
        `Original error: ${originalError instanceof Error ? originalError.message : String(originalError)}`
      ].join('\n'),
      { cause: originalError }
    )
  }
}

const launchChromium = async (chromium) => {
  try {
    return await chromium.launch({ headless: true })
  } catch {
    return chromium.launch({ channel: 'chrome', headless: true })
  }
}

const harnessMain = String.raw`
import renderMarkdown from '@security/markdown'
import { PptxViewer } from '@security/pptx'

const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const fence = String.fromCharCode(96).repeat(3)
window.__rendererSentinel = { markdown: 0, pptx: 0 }

const markdown = [
  '# Safe Markdown heading',
  '',
  '<img id="markdown-event" src="' + pixel + '" onload="window.__rendererSentinel.markdown += 1">',
  '<svg id="markdown-raw-svg" onload="window.__rendererSentinel.markdown += 10"></svg>',
  '<math id="markdown-raw-math"><mtext><img src="' + pixel + '" onload="window.__rendererSentinel.markdown += 20"></mtext></math>',
  '<script>window.__rendererSentinel.markdown += 100</script>',
  '<iframe id="markdown-frame" srcdoc="unsafe"></iframe>',
  '<style id="markdown-raw-style">body{display:none}</style>',
  '<a id="markdown-blank" href="https://example.com/docs" target="_blank">safe blank link</a>',
  '',
  '[unsafe link](javascript:window.__rendererSentinel.markdown+=1000)',
  '',
  '| column | value |',
  '| --- | --- |',
  '| safe | table |',
  '',
  fence + 'js',
  'const safe = true',
  fence,
  '',
  fence + 'mermaid',
  'graph TD',
  '  A --> B',
  fence,
].join('\n')

const markdownTarget = document.querySelector('#markdown')
const markdownInstance = await renderMarkdown(
  new TextEncoder().encode(markdown).buffer,
  markdownTarget,
  { options: { theme: 'light' } },
)

class FakeWorker {
  constructor(markup) {
    this.markup = markup
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  emit(data) {
    for (const listener of this.listeners.get('message') || []) {
      listener({ data })
    }
  }

  postMessage() {
    queueMicrotask(() => {
      this.emit({ type: 'slideSize', data: { width: 960, height: 540 } })
      this.emit({ type: 'slide', slide_num: 1, data: this.markup })
      this.emit({ type: 'globalCSS', data: '._css_1{color:rgb(1, 2, 3);background-image:url(https://security.invalid/global.png)}' })
      this.emit({ type: 'globalCSS', data: '._css_2{font-family:Arial;}body{display:none}' })
      this.emit({ type: 'ExecutionTime', charts: null })
    })
  }

  terminate() {}
}

const pptxMarkup = [
  '<section class="slide" data-security-slide="true">',
  '<a id="pptx-event" title="unsafe" onmouseover="window.__rendererSentinel.pptx += 1" href="javascript:window.__rendererSentinel.pptx+=10" target="_blank">unsafe</a>',
  '<a id="pptx-safe" title="Quarterly review" href="https://example.com/deck" target="_blank">safe</a>',
  '<img id="pptx-image" src="' + pixel + '" onload="window.__rendererSentinel.pptx += 100">',
  '<img id="pptx-external-image" src="https://security.invalid/pptx.png" srcset="https://security.invalid/pptx-2x.png 2x">',
  '<svg id="pptx-svg" viewBox="0 0 10 10" onload="window.__rendererSentinel.pptx += 1000" fill="url(https://security.invalid/root-paint.svg#x)" filter="url(https://security.invalid/root-filter.svg#x)"><circle id="pptx-svg-safe-paint" cx="5" cy="5" r="4" fill="url(#pptx-safe-gradient)"></circle><rect id="pptx-svg-external-paint" fill="url(https://security.invalid/paint.svg#x)" filter="url(https://security.invalid/filter.svg#x)"></rect></svg>',
  '<svg><image id="pptx-external-svg-image" href="https://security.invalid/pptx.svg"></image></svg>',
  '<iframe id="pptx-frame" srcdoc="unsafe"></iframe>',
  '<style id="pptx-raw-style">body{display:none}</style>',
  '<span id="pptx-css" class="_css_1" style="position:fixed;background-image:url(https://security.invalid/inline.png)">safe CSS</span>',
  '<video id="pptx-video" data-pptx-media-id="missing" poster="https://security.invalid/poster.png" controls></video>',
  '</section>',
].join('')

const renderPptx = async (target, windowed) => {
  let viewer
  await new Promise((resolve, reject) => {
    PptxViewer.open(new Uint8Array(32).buffer, target, {
      workerFactory: () => new FakeWorker(pptxMarkup),
      lazySlides: windowed,
      listOptions: windowed ? { windowed: true, initialSlides: 1 } : undefined,
      onRenderComplete: resolve,
      onError: reject,
    }).then(instance => {
      viewer = instance
    }, reject)
  })
  return viewer
}

const pptxRegular = document.querySelector('#pptx-regular')
const pptxWindowed = document.querySelector('#pptx-windowed')
const pptxInstances = await Promise.all([
  renderPptx(pptxRegular, false),
  renderPptx(pptxWindowed, true),
])

for (const root of [markdownTarget, pptxRegular, pptxWindowed]) {
  for (const element of root.querySelectorAll('[id$="-event"]')) {
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
}

await new Promise(resolve => setTimeout(resolve, 50))

const inspectPptx = root => {
  const cssTarget = root.querySelector('#pptx-css')
  const computedStyle = getComputedStyle(cssTarget)
  return {
    slides: root.querySelectorAll('.slide').length,
    dangerousAttributes: root.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    unsafeHref: root.querySelector('#pptx-event')?.getAttribute('href') ?? null,
    safeHref: root.querySelector('#pptx-safe')?.getAttribute('href') ?? null,
    safeTarget: root.querySelector('#pptx-safe')?.getAttribute('target') ?? null,
    safeRel: root.querySelector('#pptx-safe')?.getAttribute('rel') ?? null,
    frames: root.querySelectorAll('iframe').length,
    rawStyles: root.querySelectorAll('#pptx-raw-style').length,
    svg: root.querySelectorAll('#pptx-svg circle').length,
    externalRootSvgFill: root.querySelector('#pptx-svg')?.getAttribute('fill') ?? null,
    externalRootSvgFilter: root.querySelector('#pptx-svg')?.getAttribute('filter') ?? null,
    safeSvgFill: root.querySelector('#pptx-svg-safe-paint')?.getAttribute('fill') ?? null,
    externalSvgFill: root.querySelector('#pptx-svg-external-paint')?.getAttribute('fill') ?? null,
    externalSvgFilter: root.querySelector('#pptx-svg-external-paint')?.getAttribute('filter') ?? null,
    externalImageSrc: root.querySelector('#pptx-external-image')?.getAttribute('src') ?? null,
    externalImageSrcset: root.querySelector('#pptx-external-image')?.getAttribute('srcset') ?? null,
    externalSvgHref: root.querySelector('#pptx-external-svg-image')?.getAttribute('href') ?? null,
    video: root.querySelectorAll('#pptx-video[data-pptx-media-id]').length,
    videoPoster: root.querySelector('#pptx-video')?.getAttribute('poster') ?? null,
    cssColor: computedStyle.color,
    cssBackgroundImage: computedStyle.backgroundImage,
    cssPosition: computedStyle.position,
  }
}

window.__rendererSanitizationResult = {
  sentinel: { ...window.__rendererSentinel },
  markdown: {
    heading: markdownTarget.querySelector('h1')?.textContent || '',
    tables: markdownTarget.querySelectorAll('table').length,
    code: markdownTarget.querySelectorAll('pre > code').length,
    mermaid: markdownTarget.querySelectorAll('.markdown-mermaid svg').length,
    dangerousAttributes: markdownTarget.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    scripts: markdownTarget.querySelectorAll('script').length,
    frames: markdownTarget.querySelectorAll('iframe').length,
    rawStyles: markdownTarget.querySelectorAll('#markdown-raw-style').length,
    rawSvg: markdownTarget.querySelectorAll('#markdown-raw-svg').length,
    rawMath: markdownTarget.querySelectorAll('#markdown-raw-math').length,
    unsafeHref: markdownTarget.querySelector('a[href^="javascript:"]')?.getAttribute('href') ?? null,
    safeHref: markdownTarget.querySelector('#markdown-blank')?.getAttribute('href') ?? null,
    safeTarget: markdownTarget.querySelector('#markdown-blank')?.getAttribute('target') ?? null,
    safeRel: markdownTarget.querySelector('#markdown-blank')?.getAttribute('rel') ?? null,
  },
  pptxRegular: inspectPptx(pptxRegular),
  pptxWindowed: inspectPptx(pptxWindowed),
  bodyDisplay: getComputedStyle(document.body).display,
}

window.__rendererSanitizationCleanup = () => {
  markdownInstance.unmount()
  pptxInstances.forEach(instance => instance?.destroy())
}
`

const verifyVendorHyperlinks = async (tempRoot) => {
  const esbuildEntry = pptxRequire.resolve('esbuild')
  const { build } = await import(pathToFileURL(esbuildEntry).href)
  const bundlePath = join(tempRoot, 'pptx-vendor-security.mjs')
  await build({
    entryPoints: [join(root, 'packages/renderers/pptx/src/engine/support/vendor.js')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
    logLevel: 'silent'
  })
  const previousSelf = globalThis.self
  globalThis.self = { postMessage() {} }
  const vendor = await import(`${pathToFileURL(bundlePath).href}?security=${Date.now()}`)
  if (previousSelf === undefined) {
    delete globalThis.self
  } else {
    globalThis.self = previousSelf
  }
  assert.equal(vendor.sanitizePptxHyperlinkTarget('javascript:alert(1)'), '')
  assert.equal(vendor.sanitizePptxHyperlinkTarget('java\nscript:alert(1)'), '')
  assert.equal(vendor.sanitizePptxHyperlinkTarget('//example.com/path'), '')
  assert.equal(vendor.sanitizePptxHyperlinkTarget('\\\\example.com/path'), '')
  assert.equal(
    vendor.sanitizePptxHyperlinkTarget('https://example.com/path'),
    'https://example.com/path'
  )
  assert.equal(vendor.sanitizePptxHyperlinkTarget('/relative/path'), '/relative/path')
  assert.equal(vendor.sanitizePptxHyperlinkTarget('relative/path'), 'relative/path')
  assert.equal(vendor.sanitizeHexColor('A1b2C3'), 'A1b2C3')
  assert.equal(vendor.sanitizeHexColor('000000;}body{display:none'), '000000')
  assert.equal(
    vendor.sanitizePptxFontName(
      'Safe Font\n;background-image:url(https://security.invalid/font);{}'
    ),
    'Safe Font background-image:url(https://security.invalid/font)'
  )
  assert.equal(vendor.escapeHtml("' onmouseover='unsafe'"), '&#039; onmouseover=&#039;unsafe&#039;')
}

const createPptxSecurityFixture = async (target) => {
  const jszipEntry = pptxRequire.resolve('jszip')
  const JSZip = (await import(pathToFileURL(jszipEntry).href)).default
  const fixturePath = join(root, 'apps/viewer-demo/public/example/ppt.pptx')
  const zip = await JSZip.loadAsync(await readFile(fixturePath))
  const slidePath = 'ppt/slides/slide1.xml'
  const relationshipsPath = 'ppt/slides/_rels/slide1.xml.rels'
  const slide = await zip.file(slidePath)?.async('text')
  const relationships = await zip.file(relationshipsPath)?.async('text')
  assert(slide, `Missing ${slidePath} in the PPTX security fixture source.`)
  assert(relationships, `Missing ${relationshipsPath} in the PPTX security fixture source.`)

  const nonVisualProperties = /<p:cNvPr\b([^>]*)name="TextBox[^"]*"([^>]*)>/.exec(slide)
  assert(nonVisualProperties, 'Could not locate shape metadata for the PPTX security fixture.')
  const injectedShapeName = [
    `<p:cNvPr${nonVisualProperties[1]}${nonVisualProperties[2]}`,
    " name=\"' fill='url(https://security.invalid/worker-root-fill.svg#x)'",
    " filter='url(https://security.invalid/worker-root-filter.svg#x)' data-shape='\">"
  ].join('')

  const runProperties = /<a:r><a:rPr\b([^>]*)\/>/.exec(slide)
  assert(runProperties, 'Could not locate a text run for the PPTX security fixture.')
  const injectedRunProperties = [
    `<a:r><a:rPr${runProperties[1]}>`,
    '<a:solidFill><a:srgbClr val="000000;}body{background-image:url(https://security.invalid/color)}/*"/></a:solidFill>',
    '<a:latin typeface="Safe Font&#10;;background-image:url(https://security.invalid/font);{}"/>',
    '<a:hlinkClick r:id="rIdSecurity" tooltip="\' onmouseover=securitySentinel() x=\'"/>',
    '</a:rPr>'
  ].join('')
  zip.file(
    slidePath,
    slide
      .replace(nonVisualProperties[0], injectedShapeName)
      .replace(runProperties[0], injectedRunProperties)
  )

  const encodedTarget = target
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  const injectedRelationship = [
    '<Relationship Id="rIdSecurity"',
    ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"',
    ` Target="${encodedTarget}" TargetMode="External"/>`
  ].join('')
  zip.file(
    relationshipsPath,
    relationships.replace('</Relationships>', `${injectedRelationship}</Relationships>`)
  )
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

const renderPptxWorkerFixture = async (data) => {
  assert(existsSync(pptxWorkerPath), 'Build @file-viewer/pptx before running the security gate.')
  const messages = []
  let resolveComplete
  let rejectComplete
  const complete = new Promise((resolvePromise, rejectPromise) => {
    resolveComplete = resolvePromise
    rejectComplete = rejectPromise
  })
  const workerTimeout = setTimeout(() => {
    rejectComplete(new Error('Timed out waiting for the PPTX security fixture to render.'))
  }, timeout)

  globalThis.self = {
    addEventListener() {},
    postMessage(message) {
      if (!message || typeof message === 'string') return
      messages.push(message)
      if (message.type === 'ExecutionTime' || message.type === 'ERROR') resolveComplete()
    }
  }

  const workerUrl = pathToFileURL(pptxWorkerPath)
  workerUrl.searchParams.set('renderer-sanitization', String(Date.now() + Math.random()))
  await import(workerUrl.href)
  self.onmessage({
    data: {
      type: 'processPPTX',
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      IE11: false,
      options: {
        themeProcess: true,
        incSlide: {},
        slideMode: false,
        keyBoardShortCut: false,
        mediaProcess: true,
        jsZipV2: false
      }
    }
  })

  try {
    await complete
  } finally {
    clearTimeout(workerTimeout)
  }
  const fatalError = messages.find((message) => message.type === 'ERROR')
  assert(!fatalError, `PPTX security fixture failed: ${JSON.stringify(fatalError?.data)}`)
  const firstSlide = messages.find((message) => message.type === 'slide' && message.slide_num === 1)
  assert(firstSlide?.data, 'PPTX security fixture did not render its first slide.')
  return {
    markup: String(firstSlide.data),
    globalCss: messages
      .filter((message) => message.type === 'globalCSS')
      .map((message) => String(message.data || ''))
      .join('\n')
  }
}

const verifyPptxWorkerHyperlinks = async () => {
  const safeResult = await renderPptxWorkerFixture(
    await createPptxSecurityFixture('https://example.com/security')
  )
  const safeMarkup = safeResult.markup
  assert.match(safeMarkup, /title='&#039; onmouseover=securitySentinel\(\) x=&#039;'/)
  assert.doesNotMatch(safeMarkup, /title='' onmouseover=/)
  assert.match(safeMarkup, /href='https:\/\/example\.com\/security'/)
  assert.match(safeMarkup, /rel='noopener noreferrer'/)
  assert.match(safeMarkup, /filter='url\(https:\/\/security\.invalid\/worker-root-filter\.svg#x\)'/)
  assert.doesNotMatch(safeResult.globalCss, /}body\s*\{/i)
  assert.doesNotMatch(safeResult.globalCss, /[\r\n];background-image/i)

  const unsafeResult = await renderPptxWorkerFixture(
    await createPptxSecurityFixture('javascript:securitySentinel()')
  )
  assert.doesNotMatch(unsafeResult.markup, /href='javascript:/i)
}

const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-renderer-sanitization-'))
let viteServer
let browser

try {
  await verifyVendorHyperlinks(harnessRoot)
  await verifyPptxWorkerHyperlinks()
  await writeFile(join(harnessRoot, 'main.js'), harnessMain)
  await writeFile(
    join(harnessRoot, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="data:,">
    <title>Renderer sanitization verification</title>
  </head>
  <body>
    <div id="markdown"></div>
    <div id="pptx-regular"></div>
    <div id="pptx-windowed"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`
  )

  const viteEntry = demoRequire.resolve('vite')
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  viteServer = await createServer({
    root: harnessRoot,
    configFile: false,
    logLevel: 'error',
    define: { global: 'globalThis' },
    resolve: { alias: sourceAliases },
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      fs: { allow: [root, harnessRoot] }
    }
  })
  await viteServer.listen()
  const address = viteServer.httpServer?.address()
  assert(address && typeof address === 'object', 'Vite did not expose its local address.')

  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  browser = await launchChromium(chromium)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const failures = []
  const unsafeCssRequests = []
  let dialogs = 0
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
  page.on('request', (request) => {
    if (request.url().startsWith('https://security.invalid/')) unsafeCssRequests.push(request.url())
  })
  page.on('dialog', async (dialog) => {
    dialogs += 1
    await dialog.dismiss()
  })

  await page.goto(`http://127.0.0.1:${address.port}/`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForFunction(() => Boolean(window.__rendererSanitizationResult), null, { timeout })
  const result = await page.evaluate(() => window.__rendererSanitizationResult)

  assert.deepEqual(result.sentinel, { markdown: 0, pptx: 0 })
  assert.equal(dialogs, 0)
  assert.deepEqual(unsafeCssRequests, [])
  assert.deepEqual(failures, [])
  assert.equal(result.bodyDisplay, 'block')
  assert.equal(result.markdown.heading, 'Safe Markdown heading')
  assert.equal(result.markdown.tables, 1)
  assert.ok(result.markdown.code >= 1)
  assert.equal(result.markdown.mermaid, 1)
  assert.equal(result.markdown.dangerousAttributes, 0)
  assert.equal(result.markdown.scripts, 0)
  assert.equal(result.markdown.frames, 0)
  assert.equal(result.markdown.rawStyles, 0)
  assert.equal(result.markdown.rawSvg, 0)
  assert.equal(result.markdown.rawMath, 0)
  assert.equal(result.markdown.unsafeHref, null)
  assert.equal(result.markdown.safeHref, 'https://example.com/docs')
  assert.equal(result.markdown.safeTarget, '_blank')
  assert.match(result.markdown.safeRel, /noopener/)

  for (const state of [result.pptxRegular, result.pptxWindowed]) {
    assert.equal(state.slides, 1)
    assert.equal(state.dangerousAttributes, 0)
    assert.equal(state.unsafeHref, null)
    assert.equal(state.safeHref, 'https://example.com/deck')
    assert.equal(state.safeTarget, '_blank')
    assert.match(state.safeRel, /noopener/)
    assert.equal(state.frames, 0)
    assert.equal(state.rawStyles, 0)
    assert.equal(state.svg, 1)
    assert.equal(state.externalRootSvgFill, null)
    assert.equal(state.externalRootSvgFilter, null)
    assert.equal(state.safeSvgFill, 'url(#pptx-safe-gradient)')
    assert.equal(state.externalSvgFill, null)
    assert.equal(state.externalSvgFilter, null)
    assert.equal(state.externalImageSrc, null)
    assert.equal(state.externalImageSrcset, null)
    assert.equal(state.externalSvgHref, null)
    assert.equal(state.video, 1)
    assert.equal(state.videoPoster, null)
    assert.equal(state.cssColor, 'rgb(1, 2, 3)')
    assert.equal(state.cssBackgroundImage, 'none')
    assert.notEqual(state.cssPosition, 'fixed')
  }

  await page.evaluate(() => window.__rendererSanitizationCleanup?.())
  console.log('[renderer-sanitization] Markdown and PPTX markup passed browser isolation checks.')
} finally {
  await browser?.close()
  await viteServer?.close()
  await rm(harnessRoot, { recursive: true, force: true })
}
