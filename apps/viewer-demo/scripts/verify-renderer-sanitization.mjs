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
  ['@security/mermaid-capability', 'packages/capabilities/mermaid/src/index.ts'],
  ['@security/typst-sanitize', 'packages/renderers/typst/src/sanitize.ts'],
  ['@security/drawing', 'packages/renderers/drawing/src/drawing.ts'],
  ['@security/diagram', 'packages/renderers/drawing/src/diagram.ts'],
  ['@security/pptx', 'packages/renderers/pptx/src/viewer.ts'],
  ['@security/doc', 'packages/renderers/doc/src/index.ts'],
  ['@file-viewer/core/assets', 'packages/core/src/assets.ts'],
  ['@file-viewer/core/export', 'packages/core/src/export.ts'],
  ['@file-viewer/renderer-text', 'packages/renderers/text/src/index.ts'],
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
import '@security/mermaid-capability'
import { sanitizeTypstSvgDocument } from '@security/typst-sanitize'
import renderDrawing from '@security/drawing'
import { renderDiagram } from '@security/diagram'
import { PptxViewer } from '@security/pptx'
import { mountMsDoc, renderMsDoc, sanitizeMsDocLinkHref } from '@security/doc'
import { buildExportHtmlDocument, buildFileViewerRenderedHtmlDocument } from '@file-viewer/core/export'

const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const fence = String.fromCharCode(96).repeat(3)
window.__rendererSentinel = { markdown: 0, pptx: 0, doc: 0, export: 0, typst: 0, drawing: 0 }

const maliciousFont = 'Safe Font" onmouseover="window.__rendererSentinel.doc += 1'
const docParagraph = (href, text) => ({
  type: 'paragraph',
  text,
  rawProperties: [],
  styleId: 0,
  styleName: 'Normal',
  paraProps: [],
  paraState: {},
  tableProps: [],
  tableState: {},
  segments: [],
  inlines: [{
    type: 'text',
    text,
    href,
    style: { fontFamily: maliciousFont, underline: 0 },
  }],
})
const docParsed = {
  blocks: [
    docParagraph('javascript:window.__rendererSentinel.doc += 10', 'unsafe'),
    docParagraph('JaVa\nScRiPt:window.__rendererSentinel.doc += 20', 'obfuscated unsafe'),
    docParagraph('vbscript:window.__rendererSentinel.doc += 30', 'vbscript unsafe'),
    docParagraph('data:text/html,<script>window.__rendererSentinel.doc += 40</script>', 'data unsafe'),
    docParagraph('file:///tmp/unsafe', 'file unsafe'),
    docParagraph('blob:https://example.com/unsafe', 'blob unsafe'),
    docParagraph('//example.com/protocol-relative', 'protocol relative unsafe'),
    docParagraph('/relative/doc', 'safe root relative'),
    docParagraph('./relative/doc', 'safe current relative'),
    docParagraph('../relative/doc', 'safe parent relative'),
    docParagraph('relative/doc', 'safe plain relative'),
    docParagraph('https://example.com/doc', 'safe external'),
    docParagraph('http://example.com/doc', 'safe http'),
    docParagraph('mailto:security@example.com', 'safe email'),
    docParagraph('tel:+12025550123', 'safe phone'),
    docParagraph('#bookmark', 'safe bookmark'),
    {
      ...docParagraph(null, 'safe media'),
      inlines: [
        {
          type: 'image',
          href: 'javascript:window.__rendererSentinel.doc += 50',
          asset: { name: 'image', mimeType: 'image/gif', dataUrl: pixel, sourceUrl: pixel },
          style: {},
        },
        {
          type: 'image',
          href: null,
          asset: {
            name: 'linked-image',
            mimeType: 'image/png',
            dataUrl: '',
            sourceUrl: 'https://security.invalid/doc-linked.png',
          },
          style: {},
        },
        {
          type: 'attachment',
          href: 'data:text/html,unsafe',
          asset: {
            name: 'report" onmouseover="window.__rendererSentinel.doc += 60',
            mimeType: 'application/octet-stream',
            dataUrl: 'data:application/octet-stream;base64,AA==',
          },
          style: {},
        },
        {
          type: 'attachment',
          href: null,
          asset: {
            name: 'unsafe-download.html',
            mimeType: 'text/html',
            dataUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
          },
          style: {},
        },
      ],
    },
    {
      type: 'attachments',
      items: [
        { name: 'safe.bin', mimeType: 'application/octet-stream', dataUrl: 'data:application/octet-stream;base64,AA==' },
        { name: 'unsafe.svg', mimeType: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+' },
        { name: 'unsafe-link', mimeType: 'application/octet-stream', dataUrl: 'javascript:window.__rendererSentinel.doc += 70' },
      ],
    },
  ],
  warnings: [],
  assets: [],
  meta: {},
}
const docBlocked = renderMsDoc(docParsed)
const docAllowed = renderMsDoc(docParsed, { externalLinkPolicy: 'allow' })
const docResourcesAllowed = renderMsDoc(docParsed, {
  externalLinkPolicy: 'allow',
  externalResourcePolicy: 'allow',
})
const docDirectTemplate = document.createElement('template')
docDirectTemplate.innerHTML = docAllowed.html
const docResourceTemplate = document.createElement('template')
docResourceTemplate.innerHTML = docResourcesAllowed.html
const docTarget = document.querySelector('#doc')
mountMsDoc(docTarget, {
  ...docAllowed,
  html: docAllowed.html + '<img id="doc-event" src="' + pixel + '" onload="window.__rendererSentinel.doc += 100">',
})

const collectedExportStyle = document.createElement('style')
collectedExportStyle.textContent = '#export-safe{color:rgb(10, 20, 30)}</style><script>parent.__rendererSentinel.export += 1</script>'
document.head.append(collectedExportStyle)
const exportContent = [
  '<article id="export-safe" onclick="parent.__rendererSentinel.export += 10">safe export',
  '<a id="export-unsafe-link" href="java&#10;script:parent.__rendererSentinel.export += 20">unsafe</a>',
  '<a id="export-safe-link" href="https://example.com/export" target="_blank">safe link</a>',
  '<img id="export-remote-image" src="https://security.invalid/export.png" srcset="https://security.invalid/export-2x.png 2x">',
  '<video id="export-remote-video" src="https://security.invalid/export.mp4" poster="https://security.invalid/export-poster.png"><source src="https://security.invalid/export-source.mp4"></video>',
  '<svg><image id="export-remote-svg" href="https://security.invalid/export.svg"></image><use id="export-remote-use" href="https://security.invalid/sprite.svg#icon"></use></svg>',
  '<svg viewBox="0 0 10 10"><circle id="export-safe-svg" cx="5" cy="5" r="4"></circle></svg>',
  '<math><mi id="export-safe-math">x</mi></math>',
  '<script>parent.__rendererSentinel.export += 100</script>',
  '</article>',
].join('')
const directExportHtml = buildExportHtmlDocument({
  contentHtml: exportContent,
  includeDocumentStyles: true,
  printStyle: '#export-safe{font-weight:700}</style><script>parent.__rendererSentinel.export += 1000</script>',
  title: 'safe export',
  watermarkInlineStyle: 'opacity:.2" onmouseover="parent.__rendererSentinel.export += 10000',
  documentRef: document,
})
const adapterSource = document.createElement('div')
const adapterExportHtml = await buildFileViewerRenderedHtmlDocument({
  source: adapterSource,
  title: 'adapter export',
  adapter: {
    includeDocumentStyles: false,
    printStyle: '</style><img src="' + pixel + '" onload="parent.__rendererSentinel.export += 100000">',
    toHtml: () => '<section id="adapter-export-safe"><img src="' + pixel + '" onload="parent.__rendererSentinel.export += 1000000"><p>adapter safe</p></section>',
  },
  watermarkInlineStyle: '"></div><script>parent.__rendererSentinel.export += 10000000</script>',
})
const mountExportDocument = html => new Promise(resolve => {
  const frame = document.createElement('iframe')
  frame.addEventListener('load', () => resolve(frame), { once: true })
  frame.srcdoc = html
  document.querySelector('#exports').append(frame)
})
const [directExportFrame, adapterExportFrame] = await Promise.all([
  mountExportDocument(directExportHtml),
  mountExportDocument(adapterExportHtml),
])
const directExportDocument = directExportFrame.contentDocument
const adapterExportDocument = adapterExportFrame.contentDocument

const typstParsed = new DOMParser().parseFromString([
  '<svg xmlns="http://www.w3.org/2000/svg" onload="window.__rendererSentinel.typst += 1">',
  '<script>window.__rendererSentinel.typst += 10</script>',
  '<defs><linearGradient id="typst-gradient"></linearGradient></defs>',
  '<a id="typst-unsafe" href="java&#10;script:window.__rendererSentinel.typst += 100"><text>unsafe</text></a>',
  '<a id="typst-canonical" href="docs/sa&#10;fe"><text>safe</text></a>',
  '<circle id="typst-safe-shape" cx="5" cy="5" r="4" style="fill:url(#typst-gradient)" onclick="window.__rendererSentinel.typst += 1000"></circle>',
  '<rect id="typst-unsafe-style" style="fill:url(https://security.invalid/typst.svg#x)"></rect>',
  '</svg>',
].join(''), 'image/svg+xml')
sanitizeTypstSvgDocument(typstParsed)
const typstTarget = document.querySelector('#typst')
typstTarget.append(document.importNode(typstParsed.documentElement, true))

const plantumlTarget = document.querySelector('#plantuml')
const maliciousPlantumlSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="window.__rendererSentinel.drawing += 1">',
  '<script>window.__rendererSentinel.drawing += 10</script>',
  '<foreignObject><img xmlns="http://www.w3.org/1999/xhtml" src="https://security.invalid/foreign.png" onerror="window.__rendererSentinel.drawing += 100"></foreignObject>',
  '<a id="drawing-unsafe-link" href="java&#10;script:window.__rendererSentinel.drawing += 1000"><text>unsafe</text></a>',
  '<image id="drawing-external-image" href="https://security.invalid/image.svg"></image>',
  '<style id="drawing-unsafe-style">.x{fill:url(https://security.invalid/style.svg#x)}</style>',
  '<defs><linearGradient id="drawing-safe-gradient"></linearGradient></defs>',
  '<circle id="drawing-safe-circle" cx="5" cy="5" r="4" fill="url(#drawing-safe-gradient)"></circle>',
  '</svg>',
].join('')
const originalFetch = window.fetch.bind(window)
window.fetch = async input => String(input).startsWith('https://plantuml.test/')
  ? new Response(maliciousPlantumlSvg, { status: 200, headers: { 'content-type': 'image/svg+xml' } })
  : originalFetch(input)
const plantumlController = await renderDiagram({
  documentRef: document,
  text: '@startuml\nAlice -> Bob\n@enduml',
  target: plantumlTarget,
  kind: 'plantuml',
  options: { plantumlServerUrl: 'https://plantuml.test/svg/' },
  viewerOptions: {},
})
window.fetch = originalFetch

let blockedMermaidImage = false
try {
  await renderDiagram({
    documentRef: document,
    text: 'graph TD\nA@{ shape: image, img: "https://security.invalid/mermaid-direct.png" }',
    target: document.querySelector('#mermaid-unsafe'),
    kind: 'mermaid',
    viewerOptions: {},
  })
} catch {
  blockedMermaidImage = true
}

const drawioTarget = document.querySelector('#drawio')
const maliciousDrawio = [
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>',
  '<mxCell id="2" parent="1" vertex="1" style="rounded=1;html=1;image=https://security.invalid/drawio.png;"',
  ' value="&lt;img src=&quot;https://security.invalid/drawio-label.png&quot; onerror=&quot;window.__rendererSentinel.drawing += 10000&quot;&gt;safe label">',
  '<mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>',
  '</root></mxGraphModel>',
].join('')
const drawioInstance = await renderDrawing(
  new TextEncoder().encode(maliciousDrawio).buffer,
  drawioTarget,
  'drawio',
  { options: {} },
)
for (let attempt = 0; attempt < 100 && !drawioTarget.querySelector('[data-drawing-rendered]'); attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 10))
}

const drawioOfficialTarget = document.querySelector('#drawio-official')
const maliciousOfficialDrawio = [
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>',
  '<mxCell id="2" parent="1" vertex="1" style="rounded=1;html=1;image=https://security.invalid/official-style.png;"',
  ' value="&lt;a href=&quot;javascript:window.__fileViewerDrawioSentinel += 100&quot;&gt;unsafe link&lt;/a&gt;',
  '&lt;img src=&quot;https://security.invalid/official-label.png&quot; onerror=&quot;window.__fileViewerDrawioSentinel += 1&quot;&gt;safe official label">',
  '<mxGeometry x="0" y="0" width="160" height="70" as="geometry"/></mxCell>',
  '</root></mxGraphModel>',
].join('')
const drawioOfficialInstance = await renderDrawing(
  new TextEncoder().encode(maliciousOfficialDrawio).buffer,
  drawioOfficialTarget,
  'drawio',
  { options: { drawing: { preferOfficial: true, viewerScriptUrl: __DRAWIO_VENDOR_URL__ } } },
)
for (let attempt = 0; attempt < 300 && !drawioOfficialTarget.querySelector('[data-drawing-rendered]'); attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 20))
}

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
  '',
  fence + 'mermaid',
  'graph TD',
  '  A@{ shape: image, img: "https://security.invalid/mermaid-markdown.png" }',
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
  doc: {
    blockedExternal: docBlocked.html.includes('https://example.com/doc'),
    allowedExternal: docAllowed.html.includes('href="https://example.com/doc"'),
    blockedExternalResource: !docDirectTemplate.content.querySelector('img[src*="security.invalid/doc-linked.png"]'),
    allowedExternalResource: Boolean(docResourceTemplate.content.querySelector('img[src*="security.invalid/doc-linked.png"]')),
    dangerousDirectAttributes: docDirectTemplate.content.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    unsafeDirectHrefs: Array.from(docDirectTemplate.content.querySelectorAll('a[href]'))
      .map(link => link.getAttribute('href'))
      .filter(href => /^(?:javascript|vbscript|file|blob):/i.test(href || '') || /^data:(?:text\/html|image\/svg\+xml|application\/(?:javascript|xhtml\+xml|xml))/i.test(href || '') || String(href).startsWith('//')),
    directSafeHrefs: Array.from(docDirectTemplate.content.querySelectorAll('a.msdoc-link[href]'))
      .map(link => link.getAttribute('href'))
      .filter(Boolean),
    safeDownloadHrefs: Array.from(docDirectTemplate.content.querySelectorAll('a.msdoc-attachment[href]'))
      .map(link => link.getAttribute('href'))
      .filter(Boolean),
    injectedAttribute: docTarget.querySelector('[onmouseover],[onload],[onerror],[onclick]') !== null,
    unsafeMountedHref: docTarget.querySelector('a[href^="javascript:"]')?.getAttribute('href') ?? null,
    safeMountedHref: docTarget.querySelector('a[href="https://example.com/doc"]')?.getAttribute('href') ?? null,
    bookmarkHref: docTarget.querySelector('a[href="#bookmark"]')?.getAttribute('href') ?? null,
    sanitizedJavascript: sanitizeMsDocLinkHref('java\nscript:alert(1)', 'allow'),
    sanitizedProtocolRelative: sanitizeMsDocLinkHref('//example.com/path', 'allow'),
  },
  export: {
    dangerousDirectAttributes: directExportDocument.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    scripts: directExportDocument.querySelectorAll('script').length,
    unsafeHref: directExportDocument.querySelector('#export-unsafe-link')?.getAttribute('href') ?? null,
    safeHref: directExportDocument.querySelector('#export-safe-link')?.getAttribute('href') ?? null,
    safeRel: directExportDocument.querySelector('#export-safe-link')?.getAttribute('rel') ?? null,
    remoteResources: directExportDocument.querySelectorAll([
      '#export-remote-image[src]',
      '#export-remote-image[srcset]',
      '#export-remote-video[src]',
      '#export-remote-video[poster]',
      '#export-remote-video source[src]',
      '#export-remote-svg[href]',
      '#export-remote-use[href]',
    ].join(',')).length,
    svg: directExportDocument.querySelectorAll('#export-safe-svg').length,
    math: directExportDocument.querySelectorAll('#export-safe-math').length,
    color: getComputedStyle(directExportDocument.querySelector('#export-safe')).color,
    fontWeight: getComputedStyle(directExportDocument.querySelector('#export-safe')).fontWeight,
    meta: directExportDocument.querySelectorAll('meta[charset],meta[name="viewport"]').length,
    adapterText: adapterExportDocument.querySelector('#adapter-export-safe p')?.textContent ?? null,
    adapterDangerousAttributes: adapterExportDocument.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    adapterScripts: adapterExportDocument.querySelectorAll('script').length,
    stylesheetLinks: directExportDocument.querySelectorAll('link[rel="stylesheet"]').length,
  },
  typst: {
    scripts: typstTarget.querySelectorAll('script').length,
    dangerousAttributes: typstTarget.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    unsafeHref: typstTarget.querySelector('#typst-unsafe')?.getAttribute('href') ?? null,
    canonicalHref: typstTarget.querySelector('#typst-canonical')?.getAttribute('href') ?? null,
    shape: typstTarget.querySelectorAll('#typst-safe-shape').length,
    safeStyle: typstTarget.querySelector('#typst-safe-shape')?.getAttribute('style') ?? null,
    unsafeStyle: typstTarget.querySelector('#typst-unsafe-style')?.getAttribute('style') ?? null,
  },
  drawing: {
    drawioMode: drawioTarget.querySelector('[data-drawing-rendered]')?.getAttribute('data-drawing-rendered') ?? null,
    drawioDangerousAttributes: drawioTarget.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    drawioText: drawioTarget.textContent ?? '',
    plantumlScripts: plantumlTarget.querySelectorAll('script,foreignObject').length,
    plantumlDangerousAttributes: plantumlTarget.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    plantumlUnsafeHref: plantumlTarget.querySelector('#drawing-unsafe-link')?.getAttribute('href') ?? null,
    plantumlExternalImage: plantumlTarget.querySelector('#drawing-external-image')?.getAttribute('href') ?? null,
    plantumlUnsafeStyle: plantumlTarget.querySelector('#drawing-unsafe-style')?.textContent ?? null,
    plantumlSafeFill: plantumlTarget.querySelector('#drawing-safe-circle')?.getAttribute('fill') ?? null,
    drawioOfficialMode: drawioOfficialTarget.querySelector('[data-drawing-rendered]')?.getAttribute('data-drawing-rendered') ?? null,
    drawioOfficialFrames: drawioOfficialTarget.querySelectorAll('iframe.drawing-mxgraph').length,
    drawioOfficialSandbox: drawioOfficialTarget.querySelector('iframe.drawing-mxgraph')?.getAttribute('sandbox') ?? '',
    blockedMermaidImage,
  },
  markdown: {
    heading: markdownTarget.querySelector('h1')?.textContent || '',
    tables: markdownTarget.querySelectorAll('table').length,
    code: markdownTarget.querySelectorAll('pre > code').length,
    mermaid: markdownTarget.querySelectorAll('.markdown-mermaid svg').length,
    mermaidErrors: markdownTarget.querySelectorAll('.markdown-mermaid-source-error').length,
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
  plantumlController.destroy()
  drawioInstance.unmount()
  drawioOfficialInstance.unmount()
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
let exportStylesheetRequests = 0

try {
  await verifyVendorHyperlinks(harnessRoot)
  await verifyPptxWorkerHyperlinks()
  // The optional Drawing asset source is the complete vendored tree. The
  // historical web bundle intentionally omits MathJax files and is not a valid
  // security harness for the opt-in official Draw.io renderer.
  const drawioVendorUrl = `/@fs/${join(root, 'third_party/drawio/viewer-static.min.js')}`
  await writeFile(
    join(harnessRoot, 'main.js'),
    harnessMain.replace('__DRAWIO_VENDOR_URL__', JSON.stringify(drawioVendorUrl))
  )
  await writeFile(
    join(harnessRoot, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="/security-export.css">
    <title>Renderer sanitization verification</title>
  </head>
  <body>
    <div id="markdown"></div>
    <div id="doc"></div>
    <div id="exports"></div>
    <div id="typst"></div>
    <div id="plantuml"></div>
    <div id="mermaid-unsafe"></div>
    <div id="drawio"></div>
    <div id="drawio-official"></div>
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
    plugins: [{
      name: 'file-viewer-export-stylesheet-sentinel',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
          if (pathname !== '/security-export.css') return next()
          exportStylesheetRequests += 1
          response.statusCode = 200
          response.setHeader('content-type', 'text/css; charset=utf-8')
          response.setHeader('cache-control', 'no-store')
          response.end('#export-safe{outline-color:rgb(1,2,3)}')
        })
      }
    }],
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
  const cspBlocks = []
  const unsafeCssRequests = []
  let dialogs = 0
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (/content security policy|violates the following content security policy directive/i.test(message.text())) {
      cspBlocks.push(message.text())
    } else {
      const location = message.location()
      failures.push(`console: ${message.text()}${location.url ? ` (${location.url})` : ''}`)
    }
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
  await page.waitForTimeout(100)
  const officialFrameHandle = await page.locator('iframe.drawing-mxgraph').elementHandle()
  assert(officialFrameHandle, 'The official Draw.io sandbox iframe was not mounted.')
  const officialFrame = await officialFrameHandle.contentFrame()
  assert(officialFrame, 'The official Draw.io sandbox iframe was not available.')
  const officialFrameState = await officialFrame.evaluate(() => ({
    sentinel: window.__fileViewerDrawioSentinel,
    dangerousAttributes: document.querySelectorAll('[onload],[onerror],[onmouseover],[onclick]').length,
    externalImages: Array.from(document.querySelectorAll('img'))
      .map(image => image.getAttribute('src'))
      .filter(source => String(source).includes('security.invalid')),
  }))
  const officialUnsafeLink = officialFrame.locator('a[href^="javascript:"]')
  if (await officialUnsafeLink.count()) {
    await officialUnsafeLink.first().click({ force: true })
    await page.waitForTimeout(50)
  }
  const officialSentinelAfterClick = await officialFrame.evaluate(() => window.__fileViewerDrawioSentinel)

  assert.deepEqual(result.sentinel, { markdown: 0, pptx: 0, doc: 0, export: 0, typst: 0, drawing: 0 })
  assert.equal(dialogs, 0)
  assert.deepEqual(unsafeCssRequests, [])
  assert.equal(exportStylesheetRequests, 1, 'Standalone export must inline or drop the mounted stylesheet without a second request.')
  assert.deepEqual(failures, [])
  assert.equal(officialFrameState.sentinel, 0)
  assert.equal(officialSentinelAfterClick, 0)
  assert.equal(result.bodyDisplay, 'block')
  assert.equal(result.markdown.heading, 'Safe Markdown heading')
  assert.equal(result.markdown.tables, 1)
  assert.ok(result.markdown.code >= 1)
  assert.equal(result.markdown.mermaid, 1)
  assert.equal(result.markdown.mermaidErrors, 1)
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
  assert.equal(result.doc.blockedExternal, false)
  assert.equal(result.doc.allowedExternal, true)
  assert.equal(result.doc.blockedExternalResource, true)
  assert.equal(result.doc.allowedExternalResource, true)
  assert.equal(result.doc.dangerousDirectAttributes, 0)
  assert.deepEqual(result.doc.unsafeDirectHrefs, [])
  assert.ok(result.doc.safeDownloadHrefs.includes('data:application/octet-stream;base64,AA=='))
  for (const href of [
    '/relative/doc',
    './relative/doc',
    '../relative/doc',
    'relative/doc',
    'https://example.com/doc',
    'http://example.com/doc',
    'mailto:security@example.com',
    'tel:+12025550123',
    '#bookmark',
  ]) {
    assert.ok(result.doc.directSafeHrefs.includes(href), `Expected safe DOC href ${href}.`)
  }
  assert.equal(result.doc.injectedAttribute, false)
  assert.equal(result.doc.unsafeMountedHref, null)
  assert.equal(result.doc.safeMountedHref, 'https://example.com/doc')
  assert.equal(result.doc.bookmarkHref, '#bookmark')
  assert.equal(result.doc.sanitizedJavascript, null)
  assert.equal(result.doc.sanitizedProtocolRelative, null)
  assert.equal(result.export.dangerousDirectAttributes, 0)
  assert.equal(result.export.scripts, 0)
  assert.equal(result.export.unsafeHref, null)
  assert.equal(result.export.safeHref, 'https://example.com/export')
  assert.match(result.export.safeRel, /noopener/)
  assert.equal(result.export.remoteResources, 0)
  assert.equal(result.export.svg, 1)
  assert.equal(result.export.math, 1)
  assert.equal(result.export.color, 'rgb(10, 20, 30)')
  assert.equal(result.export.fontWeight, '700')
  assert.equal(result.export.meta, 2)
  assert.equal(result.export.adapterText, 'adapter safe')
  assert.equal(result.export.adapterDangerousAttributes, 0)
  assert.equal(result.export.adapterScripts, 0)
  assert.equal(result.export.stylesheetLinks, 0)
  assert.equal(result.typst.scripts, 0)
  assert.equal(result.typst.dangerousAttributes, 0)
  assert.equal(result.typst.unsafeHref, null)
  assert.equal(result.typst.canonicalHref, 'docs/safe')
  assert.equal(result.typst.shape, 1)
  assert.equal(result.typst.safeStyle, 'fill:url(#typst-gradient)')
  assert.equal(result.typst.unsafeStyle, null)
  assert.equal(result.drawing.drawioMode, 'rough')
  assert.equal(result.drawing.drawioDangerousAttributes, 0)
  assert.match(result.drawing.drawioText, /safe label/)
  assert.equal(result.drawing.plantumlScripts, 0)
  assert.equal(result.drawing.plantumlDangerousAttributes, 0)
  assert.equal(result.drawing.plantumlUnsafeHref, null)
  assert.equal(result.drawing.plantumlExternalImage, null)
  assert.doesNotMatch(result.drawing.plantumlUnsafeStyle || '', /security\.invalid/)
  assert.equal(result.drawing.plantumlSafeFill, 'url(#drawing-safe-gradient)')
  assert.equal(result.drawing.drawioOfficialMode, 'official')
  assert.equal(result.drawing.drawioOfficialFrames, 1)
  assert.match(result.drawing.drawioOfficialSandbox, /allow-scripts/)
  assert.doesNotMatch(result.drawing.drawioOfficialSandbox, /allow-same-origin/)
  assert.equal(result.drawing.blockedMermaidImage, true)

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
  console.log('[renderer-sanitization] DOC, export/print, Markdown/Mermaid, Drawing/PlantUML, Typst SVG, and PPTX markup passed browser isolation checks.')
} finally {
  await browser?.close()
  await viteServer?.close()
  await rm(harnessRoot, { recursive: true, force: true })
}
