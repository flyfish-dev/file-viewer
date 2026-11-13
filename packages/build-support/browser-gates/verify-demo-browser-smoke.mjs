// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion } from './lib/import-playwright.mjs'
let completedSampleMatrix
// END PREPACK COMPLETION OBSERVATION
import {
  createReadStream,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { installBrowserScrollContainerResolver } from './lib/browser-scroll-container.mjs'
import { collectDemoSampleFiles } from './lib/demo-sample-files.mjs'
import {
  createSyntheticPdfIdentityFontRepair,
  syntheticPdfIdentityFontRepairSample,
  syntheticPdfIdentityFontRepairText
} from './lib/pdf-smoke-fixtures.mjs'

const outputDir = resolve(
  process.env.DEMO_BROWSER_SMOKE_OUTPUT_DIR ||
  process.env.DEMO_OUTPUT_DIR ||
  'apps/viewer-demo/dist'
)
const externalUrl = process.env.DEMO_BROWSER_SMOKE_URL
const browserName = (process.env.DEMO_BROWSER_SMOKE_BROWSER || 'chromium').trim().toLowerCase()
const formatOnly = process.env.DEMO_BROWSER_SMOKE_FORMAT_ONLY === '1'
if (!['chromium', 'firefox', 'webkit'].includes(browserName)) {
  throw new Error(`DEMO_BROWSER_SMOKE_BROWSER must be chromium, firefox, or webkit; received ${browserName}.`)
}
const timeout = Number(process.env.DEMO_BROWSER_SMOKE_TIMEOUT || 45000)
const sampleTimeout = Number(process.env.DEMO_BROWSER_SMOKE_SAMPLE_TIMEOUT || Math.max(timeout, 60000))
const requestedSamples = (process.env.DEMO_BROWSER_SMOKE_SAMPLES || '')
  .split(',')
  .map(sample => sample.trim())
  .filter(Boolean)
const readyOnlySampleExclusions = new Map([
  [
    'animate-uncompressed-folder.xfl',
    'expected uncompressed-XFL folder rejection; covered by verify:adobe-animate-parser and verify:adobe-animate-browser'
  ]
])
const sourceExamplesRoot = resolve('apps/viewer-demo/public/example')
const examplesRoot = resolve(
  process.env.DEMO_BROWSER_SMOKE_EXAMPLE_DIR ||
  (externalUrl && existsSync(sourceExamplesRoot)
    ? sourceExamplesRoot
    : existsSync(join(outputDir, 'example'))
      ? join(outputDir, 'example')
      : sourceExamplesRoot)
)
const require = createRequire(import.meta.url)
const syntheticPdfCjkFontFallbackSample = 'pdf-cjk-font-fallback.pdf'
const syntheticPdfCjkFontFallbackText = 'PDF 字体回退：警告信息，微软雅黑粗体显示完整。'
const syntheticMarkdownMermaidSample = 'markdown-mermaid-state.md'
const syntheticMarkdownMermaidText = `# Mermaid state diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> INIT
    INIT --> REQUIREMENT_ANALYSIS
    REQUIREMENT_ANALYSIS --> SOLUTION_DESIGN
    SOLUTION_DESIGN --> GATE_REVIEW
    GATE_REVIEW --> DEVELOPMENT: Pass
    GATE_REVIEW --> REQUIREMENT_ANALYSIS: Requirement gap
    GATE_REVIEW --> SOLUTION_DESIGN: Design gap
    DEVELOPMENT --> CODE_REVIEW: Build and self-check pass
    DEVELOPMENT --> SOLUTION_DESIGN: Design impossible
    CODE_REVIEW --> QA_TEST: No Major or Blocker
    CODE_REVIEW --> DEVELOPMENT: Major or Blocker
    CODE_REVIEW --> SOLUTION_DESIGN: Design mismatch
    QA_TEST --> DELIVERY: Verification pass
    QA_TEST --> DEVELOPMENT: Blocking defect
    QA_TEST --> REQUIREMENT_ANALYSIS: Requirement gap
    DELIVERY --> DONE: Accepted
    DELIVERY --> REQUIREMENT_ANALYSIS: Acceptance failed
    DONE --> [*]
\`\`\`
`
let syntheticPdfCjkFontFallbackPath = ''
let syntheticPdfIdentityFontRepairPath = ''
let syntheticMarkdownMermaidPath = ''
const pageRequestUrls = new WeakMap()
const binaryDemoFixtureTemplates = Object.freeze({
  'binary-raw.bin': 'raw',
  'binary-png-signature.hex': 'png',
  'binary-wasm-signature.hex': 'wasm',
  'binary-elf.elf': 'elf',
  'binary-pe.exe': 'pe',
  'binary-pe.dll': 'pe',
  'binary-macho.macho': 'macho',
  'binary-zip-signature.hex': 'zip',
  'binary-java.class': 'java-class'
})

const installDeepQueryHelpers = () => {
  const collectOpenRoots = () => {
    const roots = [document]
    for (let index = 0; index < roots.length; index += 1) {
      roots[index].querySelectorAll('*').forEach(node => {
        if (node.shadowRoot && !roots.includes(node.shadowRoot)) {
          roots.push(node.shadowRoot)
        }
      })
    }
    return roots
  }
  const queryAll = selector => {
    const matches = []
    collectOpenRoots().forEach(root => {
      matches.push(...root.querySelectorAll(selector))
    })
    return matches
  }
  Object.defineProperties(window, {
    __fileViewerSmokeQueryAll: {
      configurable: true,
      value: queryAll
    },
    __fileViewerSmokeQuery: {
      configurable: true,
      value: selector => queryAll(selector)[0] || null
    },
    __fileViewerSmokeText: {
      configurable: true,
      get: () => collectOpenRoots()
        .map(root => root === document ? document.body?.innerText || '' : root.textContent || '')
        .join('\n')
    }
  })
}

const createSyntheticPdfCjkFontFallback = () => {
  const characters = [...syntheticPdfCjkFontFallbackText]
  const encodedText = characters
    .map((_character, index) => (index + 1).toString(16).padStart(4, '0'))
    .join('')
  const unicodeMappings = characters
    .map((character, index) => {
      const code = (index + 1).toString(16).padStart(4, '0')
      const unicode = character.codePointAt(0).toString(16).padStart(4, '0')
      return `<${code}> <${unicode}>`
    })
    .join('\n')
  const toUnicode = [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <ffff>',
    'endcodespacerange',
    `${characters.length} beginbfchar`,
    unicodeMappings,
    'endbfchar',
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end'
  ].join('\n')
  const pageContent = `BT /F1 24 Tf 54 420 Td <${encodedText}> Tj ET`
  const stream = data => `<< /Length ${Buffer.byteLength(data, 'binary')} >>\nstream\n${data}\nendstream`
  const widths = characters.map(() => '1000').join(' ')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 540] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 540] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    stream(pageContent),
    stream(pageContent),
    '<< /Type /Font /Subtype /Type0 /BaseFont /MicrosoftYaHei-Bold /Encoding /Identity-H /DescendantFonts [8 0 R] /ToUnicode 10 0 R >>',
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /MicrosoftYaHei-Bold /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 9 0 R /DW 1000 /W [1 [${widths}]] /CIDToGIDMap /Identity >>`,
    '<< /Type /FontDescriptor /FontName /MicrosoftYaHei-Bold /Flags 4 /FontBBox [0 -250 1000 1000] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 80 >>',
    stream(toUnicode)
  ]
  let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf, 'binary')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'binary')
}

const prepareSyntheticPdfCjkFontFallback = () => {
  if (!requestedSamples.includes(syntheticPdfCjkFontFallbackSample)) {
    return
  }
  syntheticPdfCjkFontFallbackPath = join(examplesRoot, syntheticPdfCjkFontFallbackSample)
  mkdirSync(examplesRoot, { recursive: true })
  writeFileSync(syntheticPdfCjkFontFallbackPath, createSyntheticPdfCjkFontFallback())
}

const prepareSyntheticPdfIdentityFontRepair = () => {
  if (!requestedSamples.includes(syntheticPdfIdentityFontRepairSample)) {
    return
  }
  syntheticPdfIdentityFontRepairPath = join(examplesRoot, syntheticPdfIdentityFontRepairSample)
  mkdirSync(examplesRoot, { recursive: true })
  writeFileSync(
    syntheticPdfIdentityFontRepairPath,
    createSyntheticPdfIdentityFontRepair()
  )
}

const prepareSyntheticMarkdownMermaid = () => {
  if (!requestedSamples.includes(syntheticMarkdownMermaidSample)) {
    return
  }
  syntheticMarkdownMermaidPath = join(examplesRoot, syntheticMarkdownMermaidSample)
  mkdirSync(examplesRoot, { recursive: true })
  writeFileSync(syntheticMarkdownMermaidPath, syntheticMarkdownMermaidText)
}

const cleanupSyntheticPdfCjkFontFallback = () => {
  if (syntheticPdfCjkFontFallbackPath) {
    rmSync(syntheticPdfCjkFontFallbackPath, { force: true })
  }
}

const cleanupSyntheticPdfIdentityFontRepair = () => {
  if (syntheticPdfIdentityFontRepairPath) {
    rmSync(syntheticPdfIdentityFontRepairPath, { force: true })
  }
}

const cleanupSyntheticMarkdownMermaid = () => {
  if (syntheticMarkdownMermaidPath) {
    rmSync(syntheticMarkdownMermaidPath, { force: true })
  }
}

const sampleSmokeConfig = {
  hiddenStateSelectors: [
    '.cad-state[hidden]',
    '.drawing-state[hidden]',
    '.epub-state[hidden]',
    '.model-state[hidden]',
    '.ofd-state[hidden]',
    '.pdf-nav-pane[hidden]',
    '.pdf-state[hidden]',
    '.pptx-error[hidden]',
    '.pptx-loading[hidden]',
    '.umd-state[hidden]',
    '.xmind-state[hidden]'
  ],
  loadingSelectors: [
    '.archive-state:not(.archive-hidden)',
    '.cad-state:not(.error):not([hidden])',
    '.drawing-state:not(.error):not([hidden])',
    '.eda-state',
    '.email-state',
    '.epub-state:not(.error):not([hidden])',
    '.excel-wrapper .loading:not(.hidden)',
    '.fv-ifc[data-ifc-status="loading"]',
    '.model-state:not(.error):not([hidden])',
    '.ofd-state:not(.error):not([hidden])',
    '.pdf-state:not(.pdf-state--error):not([hidden])',
    '.pptx-loading:not([hidden])',
    '.sheet-loading:not(.hidden)',
    '.state-panel.loading-panel:not(.hidden)',
    '.typst-loading',
    '.umd-state:not(.error):not([hidden])',
    '.xmind-state:not(.error):not([hidden])'
  ],
  errorSelectors: [
    '.archive-error:not(.archive-hidden)',
    '.cad-state.error:not([hidden])',
    '.drawing-state.error:not([hidden])',
    '.epub-state.error:not([hidden])',
    '.fv-ifc[data-ifc-status="error"]',
    '.model-state.error:not([hidden])',
    '.ofd-state.error:not([hidden])',
    '.pdf-state.pdf-state--error:not([hidden])',
    '.pptx-error:not([hidden])',
    '.state-panel.error-panel:not(.hidden)',
    '.typst-error',
    '.umd-state.error:not([hidden])',
    '.xmind-state.error:not([hidden])'
  ],
  meaningfulSelectors: [
    '.file-viewer .content .archive-entry',
    '.file-viewer .content .archive-nested-target > *',
    '.file-viewer .content .cad-shell',
    '.file-viewer .content .docx-wrapper',
    '.file-viewer .content .drawing-viewer svg',
    '.file-viewer .content .email-viewer',
    '.file-viewer .content .epub-viewer iframe',
    '.file-viewer .content .excel-wrapper',
    '.file-viewer .content .fv-binary[data-binary-inspector-ready="true"] [data-binary-tree-node]',
    '.file-viewer .content .fv-ifc[data-ifc-status="ready"] .fv-ifc-stage canvas',
    '.file-viewer .content .flyfish-pptx-slide-slot',
    '.file-viewer .content .flyfish-rtf-paper',
    '.file-viewer .content .geo-viewer',
    '.file-viewer .content .hangul-page',
    '.file-viewer .content .indesign-exchange-viewer',
    '.file-viewer .content .iwork-scene',
    '.file-viewer .content .markdown-body',
    '.file-viewer .content .model-viewer canvas',
    '.file-viewer .content .msdoc-zoom-viewer',
    '.file-viewer .content .odf-page',
    '.file-viewer .content .ofd-viewer canvas',
    '.file-viewer .content .pdfViewer .page',
    '.file-viewer .content .typst-page-shell',
    '.file-viewer .content .umd-viewer',
    '.file-viewer .content .wpd-page',
    '.file-viewer .content .fb2-paper',
    '.file-viewer .content .xmind-node',
    '.file-viewer .content audio',
    '.file-viewer .content canvas',
    '.file-viewer .content code',
    '.file-viewer .content iframe',
    '.file-viewer .content img',
    '.file-viewer .content pre',
    '.file-viewer .content svg',
    '.file-viewer .content table',
    '.file-viewer .content video'
  ],
  allowedNotices: []
}

const verifyXMindPanInteraction = async (page, samplePath) => {
  const result = await page.evaluate(async () => {
    const stage = window.__fileViewerSmokeQuery('.xmind-stage')
    const zoomBox = window.__fileViewerSmokeQuery('.xmind-zoom-box')
    const nodeCount = window.__fileViewerSmokeQueryAll('.xmind-node').length
    if (!(stage instanceof HTMLElement) || !(zoomBox instanceof HTMLElement)) {
      return {
        ok: false,
        reason: 'missing XMind stage or zoom box',
        nodeCount
      }
    }

    const readTransform = () => window.getComputedStyle(zoomBox).transform || zoomBox.style.transform
    const readFirstNodeRect = () => {
      const node = window.__fileViewerSmokeQuery('.xmind-node')
      if (!(node instanceof HTMLElement)) {
        return null
      }
      const rect = node.getBoundingClientRect()
      return {
        left: Number(rect.left.toFixed(2)),
        top: Number(rect.top.toFixed(2))
      }
    }
    const rectChanged = (beforeRect, afterRect) => Boolean(
      beforeRect &&
      afterRect &&
      (Math.abs(beforeRect.left - afterRect.left) > 8 || Math.abs(beforeRect.top - afterRect.top) > 8)
    )
    const rect = stage.getBoundingClientRect()
    const startX = rect.left + rect.width * 0.52
    const startY = rect.top + rect.height * 0.48
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    const resetView = async () => {
      stage.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true,
        button: 0,
        buttons: 0,
        cancelable: true,
        clientX: startX,
        clientY: startY
      }))
      await waitFrame()
      await waitFrame()
    }
    const dispatchPointer = (target, type, clientX, clientY, buttons, pointerId, pointerType = 'mouse') => {
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        composed: true,
        button: 0,
        buttons,
        cancelable: true,
        clientX,
        clientY,
        pointerId,
        pointerType
      }))
    }
    const pointerDrag = async (pointerId, moveButtons = 1, startTarget = stage) => {
      await resetView()
      const before = readTransform()
      const beforeNodeRect = readFirstNodeRect()

      stage.focus({ preventScroll: true })
      dispatchPointer(startTarget, 'pointerdown', startX, startY, 1, pointerId)
      dispatchPointer(stage, 'pointermove', startX + 180, startY + 96, moveButtons, pointerId)
      await waitFrame()
      dispatchPointer(stage, 'pointermove', startX + 220, startY + 118, moveButtons, pointerId)
      await waitFrame()
      dispatchPointer(stage, 'pointerup', startX + 220, startY + 118, 0, pointerId)
      await waitFrame()
      const afterNodeRect = readFirstNodeRect()

      return {
        before,
        after: readTransform(),
        beforeNodeRect,
        afterNodeRect,
        nodeMoved: rectChanged(beforeNodeRect, afterNodeRect)
      }
    }

    const wheelPan = async () => {
      await resetView()
      const before = readTransform()
      const beforeNodeRect = readFirstNodeRect()
      stage.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: 96,
        deltaY: 48,
        clientX: startX,
        clientY: startY
      }))
      await waitFrame()
      const afterNodeRect = readFirstNodeRect()
      return {
        before,
        after: readTransform(),
        beforeNodeRect,
        afterNodeRect,
        nodeMoved: rectChanged(beforeNodeRect, afterNodeRect)
      }
    }

    const normalDrag = await pointerDrag(2319, 1)
    const zeroButtonsDrag = await pointerDrag(2320, 0)
    const nodeStartDrag = await pointerDrag(2323, 1, window.__fileViewerSmokeQuery('.xmind-node') || stage)
    const wheelFallbackPan = await wheelPan()
    return {
      ok: nodeCount > 0 &&
        normalDrag.before !== normalDrag.after &&
        normalDrag.nodeMoved &&
        zeroButtonsDrag.before !== zeroButtonsDrag.after &&
        zeroButtonsDrag.nodeMoved &&
        nodeStartDrag.before !== nodeStartDrag.after &&
        nodeStartDrag.nodeMoved &&
        wheelFallbackPan.before !== wheelFallbackPan.after &&
        wheelFallbackPan.nodeMoved,
      before: normalDrag.before,
      after: wheelFallbackPan.after,
      normalDrag,
      zeroButtonsDrag,
      nodeStartDrag,
      wheelFallbackPan,
      nodeCount,
      reason: normalDrag.before === normalDrag.after
        ? 'XMind transform did not change after normal pointer drag'
        : !normalDrag.nodeMoved
          ? 'XMind node position did not change after normal pointer drag'
        : zeroButtonsDrag.before === zeroButtonsDrag.after
            ? 'XMind transform did not change after WebView-style zero-buttons pointer drag'
          : !zeroButtonsDrag.nodeMoved
            ? 'XMind node position did not change after WebView-style zero-buttons pointer drag'
          : nodeStartDrag.before === nodeStartDrag.after
            ? 'XMind transform did not change after node-start pointer drag'
          : !nodeStartDrag.nodeMoved
            ? 'XMind node position did not change after node-start pointer drag'
            : wheelFallbackPan.before === wheelFallbackPan.after
              ? 'XMind transform did not change after wheel pan'
              : !wheelFallbackPan.nodeMoved
                ? 'XMind node position did not change after wheel pan'
                : ''
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed XMind pan smoke: ${JSON.stringify(result, null, 2)}`)
  }

  const outlineDensity = await page.evaluate(() => {
    const sidebar = window.__fileViewerSmokeQuery('.xmind-sidebar')
    const outline = window.__fileViewerSmokeQuery('.xmind-outline')
    const row = window.__fileViewerSmokeQuery('.xmind-outline button')
    if (!(sidebar instanceof HTMLElement) || !(outline instanceof HTMLElement) || !(row instanceof HTMLButtonElement)) {
      return { ok: false, reason: 'missing XMind outline controls' }
    }
    const px = value => Number.parseFloat(String(value || '0')) || 0
    const rowStyle = window.getComputedStyle(row)
    const outlineStyle = window.getComputedStyle(outline)
    const rowRect = row.getBoundingClientRect()
    const titledRows = [...outline.querySelectorAll('button')].every(item => item.title === item.textContent)
    return {
      ok: px(rowStyle.fontSize) <= 13 &&
        px(rowStyle.lineHeight) <= 18 &&
        rowRect.height <= 30 &&
        px(outlineStyle.gap) <= 3 &&
        sidebar.scrollWidth <= sidebar.clientWidth + 1 &&
        titledRows,
      fontSize: rowStyle.fontSize,
      lineHeight: rowStyle.lineHeight,
      rowHeight: rowRect.height,
      gap: outlineStyle.gap,
      sidebarScrollWidth: sidebar.scrollWidth,
      sidebarClientWidth: sidebar.clientWidth,
      titledRows
    }
  })

  if (!outlineDensity.ok) {
    throw new Error(`Sample ${samplePath} failed XMind outline density smoke: ${JSON.stringify(outlineDensity, null, 2)}`)
  }

  const dragTarget = await page.evaluate(async () => {
    const stage = window.__fileViewerSmokeQuery('.xmind-stage')
    const zoomBox = window.__fileViewerSmokeQuery('.xmind-zoom-box')
    if (!(stage instanceof HTMLElement) || !(zoomBox instanceof HTMLElement)) {
      return null
    }
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    const rect = stage.getBoundingClientRect()
    const startX = rect.left + rect.width * 0.52
    const startY = rect.top + rect.height * 0.48
    stage.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      button: 0,
      buttons: 0,
      cancelable: true,
      clientX: startX,
      clientY: startY
    }))
    await waitFrame()
    await waitFrame()
    return {
      before: window.getComputedStyle(zoomBox).transform || zoomBox.style.transform,
      startX,
      startY
    }
  })

  if (!dragTarget) {
    throw new Error(`Sample ${samplePath} failed XMind real mouse smoke: missing drag target`)
  }

  await page.mouse.move(dragTarget.startX, dragTarget.startY)
  await page.mouse.down()
  await page.mouse.move(dragTarget.startX + 160, dragTarget.startY + 86, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(80)

  const realMouse = await page.evaluate(before => {
    const zoomBox = window.__fileViewerSmokeQuery('.xmind-zoom-box')
    const after = zoomBox instanceof HTMLElement
      ? window.getComputedStyle(zoomBox).transform || zoomBox.style.transform
      : ''
    return {
      ok: Boolean(after) && before !== after,
      before,
      after
    }
  }, dragTarget.before)

  if (!realMouse.ok) {
    throw new Error(`Sample ${samplePath} failed XMind real mouse smoke: ${JSON.stringify(realMouse, null, 2)}`)
  }
}

const verifyTypstRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(() => {
    const pageShells = [...window.__fileViewerSmokeQueryAll('.typst-page-shell')]
    const svgs = [...window.__fileViewerSmokeQueryAll('.typst-page-shell svg')]
    const firstPage = pageShells[0]
    const firstSvg = svgs[0]
    const pageRect = firstPage?.getBoundingClientRect()
    const svgRect = firstSvg?.getBoundingClientRect()
    const statusText = window.__fileViewerSmokeQuery('.typst-toolbar em')?.textContent || ''
    const hasVectorContent = svgs.some(svg => svg.querySelector('path,text,use,g,rect,circle,ellipse,line,polyline,polygon'))

    return {
      ok: pageShells.length > 0 &&
        svgs.length > 0 &&
        Boolean(pageRect && pageRect.width > 80 && pageRect.height > 80) &&
        Boolean(svgRect && svgRect.width > 80 && svgRect.height > 80) &&
        (/已渲染|Rendered/i).test(statusText) &&
        hasVectorContent,
      pageCount: pageShells.length,
      svgCount: svgs.length,
      pageRect: pageRect ? {
        width: Number(pageRect.width.toFixed(2)),
        height: Number(pageRect.height.toFixed(2))
      } : null,
      svgRect: svgRect ? {
        width: Number(svgRect.width.toFixed(2)),
        height: Number(svgRect.height.toFixed(2))
      } : null,
      statusText,
      hasVectorContent
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed Typst WASM render smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyDrawingRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(async () => {
    const canvas = window.__fileViewerSmokeQuery('.drawing-canvas')
    if (!(canvas instanceof HTMLElement)) {
      return { ok: false, reason: 'missing drawing canvas' }
    }

    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    await waitFrame()
    await waitFrame()

    const renderedMode = canvas.dataset.drawingRendered || ''
    const svg = canvas.querySelector('svg')
    const mxgraph = canvas.querySelector('.drawing-mxgraph')
    const svgRect = svg?.getBoundingClientRect()
    const mxRect = mxgraph?.getBoundingClientRect()
    const visibleSvg = Boolean(svgRect && svgRect.width > 80 && svgRect.height > 80)
    const visibleMxGraph = Boolean(mxRect && mxRect.width > 80 && mxRect.height > 80)
    const hasShapes = Boolean(svg?.querySelector('path,text,rect,circle,ellipse,line,polyline,polygon,use,g')) ||
      Boolean(
        renderedMode === 'official' &&
        mxgraph instanceof HTMLIFrameElement &&
        mxgraph.srcdoc.includes('data-mxgraph=')
      )
    const zoomLabel = window.__fileViewerSmokeQuery('.drawing-actions span')?.textContent || ''

    return {
      ok: Boolean(renderedMode) &&
        (visibleSvg || visibleMxGraph) &&
        hasShapes &&
        /%$/.test(zoomLabel.trim()),
      renderedMode,
      visibleSvg,
      visibleMxGraph,
      hasShapes,
      zoomLabel,
      svgRect: svgRect ? {
        width: Number(svgRect.width.toFixed(2)),
        height: Number(svgRect.height.toFixed(2))
      } : null,
      mxRect: mxRect ? {
        width: Number(mxRect.width.toFixed(2)),
        height: Number(mxRect.height.toFixed(2))
      } : null
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed drawing render smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyCadRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(async () => {
    const stage = window.__fileViewerSmokeQuery('.cad-stage')
    const zoomText = window.__fileViewerSmokeQuery('.cad-zoom')
    const zoomInButton = [...window.__fileViewerSmokeQueryAll('.cad-tools button')]
      .find(button => {
        const label = `${button.getAttribute('title') || ''} ${button.textContent || ''}`.trim().toLowerCase()
        return label.includes('放大') || label.includes('zoom in') || label.endsWith('+')
      })
    if (!(stage instanceof HTMLElement) || !(zoomText instanceof HTMLElement) || !(zoomInButton instanceof HTMLButtonElement)) {
      return {
        ok: false,
        reason: 'missing CAD stage, zoom label, or zoom button',
        hasStage: stage instanceof HTMLElement,
        hasZoomText: zoomText instanceof HTMLElement,
        hasZoomInButton: zoomInButton instanceof HTMLButtonElement
      }
    }

    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    const readCanvases = () => [...stage.querySelectorAll('canvas')]
      .map(canvas => {
        const rect = canvas.getBoundingClientRect()
        return {
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
          backingWidth: canvas.width,
          backingHeight: canvas.height
        }
      })
      .filter(rect => rect.width > 80 && rect.height > 80)
    const beforeZoom = zoomText.textContent || ''
    const beforeCanvases = readCanvases()
    zoomInButton.click()
    await waitFrame()
    await waitFrame()
    const afterZoom = zoomText.textContent || ''
    const afterCanvases = readCanvases()
    const nativeStageActive = Boolean(window.__fileViewerSmokeQuery('.cad-native-stage.is-active,.cad-viewer-native-host.is-active,.dwfv-root'))
    const hasVisibleCanvas = beforeCanvases.length > 0 || afterCanvases.length > 0
    const zoomChanged = beforeZoom !== afterZoom

    return {
      ok: hasVisibleCanvas &&
        beforeZoom.trim() !== '' &&
        afterZoom.trim() !== '' &&
        zoomChanged,
      beforeZoom,
      afterZoom,
      beforeCanvases,
      afterCanvases,
      nativeStageActive,
      zoomChanged
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed CAD render/zoom smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyGdsLayoutRenderInteraction = async (page, samplePath) => {
  const expectedLabel = samplePath.toLowerCase().endsWith('.gds') ? 'GDSII' : 'OASIS'
  const result = await page.evaluate(() => {
    const layoutSvg = window.__fileViewerSmokeQuery('.eda-layout-svg')
    const tree = window.__fileViewerSmokeQuery('.eda-tree')
    if (!(layoutSvg instanceof SVGSVGElement) || !(tree instanceof HTMLElement)) {
      return {
        ok: false,
        reason: 'missing GDSII layout SVG or EDA tree',
        hasLayoutSvg: layoutSvg instanceof SVGSVGElement,
        hasTree: tree instanceof HTMLElement
      }
    }

    const rect = layoutSvg.getBoundingClientRect()
    const geometryCount = layoutSvg.querySelectorAll('polygon,polyline,circle,text').length
    const treeRowCount = tree.querySelectorAll('button').length
    const ariaLabel = layoutSvg.getAttribute('aria-label') || ''

    return {
      ok: rect.width > 100 &&
        rect.height > 100 &&
        geometryCount > 0 &&
        treeRowCount > 0 &&
        ariaLabel.includes(window.__fileViewerExpectedEdaLayoutLabel || 'GDSII'),
      rect: {
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2))
      },
      geometryCount,
      treeRowCount,
      ariaLabel
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed ${expectedLabel} layout render smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyPdfCjkFontFallbackInteraction = async (page, samplePath) => {
  if (samplePath !== syntheticPdfCjkFontFallbackSample) {
    return
  }
  await page.waitForFunction(
    ({ family, text }) => (
      document.fonts.check(`normal 700 16px "${family}"`, text) &&
      performance.getEntriesByType('resource')
        .some(entry => entry.name.includes('/vendor/pdf/fonts/files/') && entry.name.endsWith('.woff2'))
    ),
    {
      family: 'MicrosoftYaHei',
      text: syntheticPdfCjkFontFallbackText
    },
    { timeout: sampleTimeout }
  )

  const state = await page.evaluate(({ family, expectedText }) => {
    const canvas = window.__fileViewerSmokeQuery('.pdfViewer .page canvas')
    const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null
    let darkPixels = 0
    if (canvas instanceof HTMLCanvasElement && context) {
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] > 0 && data[index] < 180 && data[index + 1] < 180 && data[index + 2] < 180) {
          darkPixels += 1
        }
      }
    }
    return {
      aliasFamilies: [...window.__fileViewerSmokeQueryAll('style[data-file-viewer-pdf-cjk-fallback-family]')]
        .map(style => style.getAttribute('data-file-viewer-pdf-cjk-fallback-family')),
      darkPixels,
      fallbackCssRequested: performance.getEntriesByType('resource')
        .some(entry => entry.name.endsWith('/vendor/pdf/fonts/noto-sans-sc.css')),
      fallbackFontRequests: performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/vendor/pdf/fonts/files/') && entry.name.endsWith('.woff2'))
        .map(entry => entry.name),
      fontReady: document.fonts.check(`normal 700 16px "${family}"`, expectedText),
      identityRepairChunkRequested: performance.getEntriesByType('resource')
        .some(entry => /\/assets\/pdfIdentityFontRepair-[^/]+\.js$/.test(entry.name)),
      text: [...window.__fileViewerSmokeQueryAll('.pdfViewer .textLayer')]
        .map(layer => layer.textContent || '')
        .join(' ')
    }
  }, {
    family: 'MicrosoftYaHei',
    expectedText: syntheticPdfCjkFontFallbackText
  })

  if (
    !state.aliasFamilies.includes('MicrosoftYaHei') ||
    !state.fallbackCssRequested ||
    state.fallbackFontRequests.length < 1 ||
    !state.fontReady ||
    state.identityRepairChunkRequested ||
    !state.text.includes('微软雅黑粗体显示完整') ||
    state.darkPixels < 200
  ) {
    throw new Error(`Sample ${samplePath} failed CJK font fallback smoke: ${JSON.stringify(state, null, 2)}`)
  }
  console.log(
    `[demo-browser-smoke] ${samplePath}: MicrosoftYaHei-Bold loaded through ${state.fallbackFontRequests.length} local Noto Sans SC shard(s).`
  )
}

const verifyPdfIdentityFontRepairInteraction = async (page, samplePath) => {
  if (samplePath !== syntheticPdfIdentityFontRepairSample) {
    return
  }
  await page.waitForFunction(
    expectedText => [...window.__fileViewerSmokeQueryAll('.pdfViewer .textLayer')]
      .some(layer => (layer.textContent || '').includes(expectedText)),
    syntheticPdfIdentityFontRepairText,
    { timeout: sampleTimeout }
  )

  const state = await page.evaluate(expectedText => {
    const text = [...window.__fileViewerSmokeQueryAll('.pdfViewer .textLayer')]
      .map(layer => layer.textContent || '')
      .join(' ')
    const canvas = window.__fileViewerSmokeQuery('.pdfViewer .page canvas')
    return {
      canvasHeight: canvas instanceof HTMLCanvasElement ? canvas.height : 0,
      canvasWidth: canvas instanceof HTMLCanvasElement ? canvas.width : 0,
      controlCharacters: (text.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g) || []).length,
      repairChunkRequested: performance.getEntriesByType('resource')
        .some(entry => /\/assets\/pdfIdentityFontRepair-[^/]+\.js$/.test(entry.name)),
      repairedTextPresent: text.includes(expectedText)
    }
  }, syntheticPdfIdentityFontRepairText)

  if (
    !state.repairedTextPresent ||
    state.controlCharacters !== 0 ||
    !state.repairChunkRequested ||
    state.canvasWidth < 1 ||
    state.canvasHeight < 1
  ) {
    throw new Error(`Sample ${samplePath} failed Identity-H font repair smoke: ${JSON.stringify(state, null, 2)}`)
  }
  console.log(
    `[demo-browser-smoke] ${samplePath}: restored ${syntheticPdfIdentityFontRepairText} from an embedded same-family cmap.`
  )
}

const verifyPdfRenderInteraction = async (page, samplePath) => {
  await page.waitForSelector('.pdfViewer .textLayer span', { timeout: sampleTimeout })
  await page.waitForFunction(
    () => {
      const canvas = window.__fileViewerSmokeQuery('.pdfViewer .page canvas')
      return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0
    },
    undefined,
    { timeout: sampleTimeout }
  )
  const initial = await page.evaluate(() => {
    const pageNodes = [...window.__fileViewerSmokeQueryAll('.pdfViewer .page')]
    const firstCanvas = window.__fileViewerSmokeQuery('.pdfViewer .page canvas')
    return {
      pageCount: pageNodes.length,
      currentPage: Number(window.__fileViewerSmokeQuery('.pdf-page-meter strong')?.textContent || 0),
      scale: window.__fileViewerSmokeQuery('.pdf-scale-button')?.textContent?.trim() || '',
      rotation: window.__fileViewerSmokeQuery('.pdf-rotation-meter')?.textContent?.trim() || '',
      renderedCanvas: firstCanvas instanceof HTMLCanvasElement && firstCanvas.width > 0 && firstCanvas.height > 0,
      textLayerItems: window.__fileViewerSmokeQueryAll('.pdfViewer .textLayer span').length
    }
  })
  if (
    initial.pageCount < 2 ||
    initial.currentPage !== 1 ||
    !/%$/.test(initial.scale) ||
    initial.rotation !== '0°' ||
    !initial.renderedCanvas ||
    initial.textLayerItems < 1
  ) {
    throw new Error(`Sample ${samplePath} failed initial PDF render smoke: ${JSON.stringify(initial, null, 2)}`)
  }

  await page.locator('.pdf-toolbar-group').first().locator('button').last().click()
  await page.waitForFunction(
    () => Number(window.__fileViewerSmokeQuery('.pdf-page-meter strong')?.textContent || 0) === 2,
    undefined,
    { timeout }
  )

  await page.locator('.pdf-toolbar-group--zoom .pdf-icon-button').last().click()
  await page.waitForFunction(
    previous => window.__fileViewerSmokeQuery('.pdf-scale-button')?.textContent?.trim() !== previous,
    initial.scale,
    { timeout }
  )

  await page.locator('.pdf-toolbar-group--rotate .pdf-icon-button').last().click()
  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.pdf-rotation-meter')?.textContent?.trim() === '90°',
    undefined,
    { timeout }
  )

  const navToggle = page.locator('.pdf-toolbar > .pdf-icon-button').first()
  if (await navToggle.count()) {
    const navWasHidden = await page.locator('.pdf-nav-pane').evaluate(node => node.hidden)
    await navToggle.click()
    await page.waitForFunction(
      previous => window.__fileViewerSmokeQuery('.pdf-nav-pane')?.hidden !== previous,
      navWasHidden,
      { timeout }
    )
    if (!navWasHidden) {
      await navToggle.click()
      await page.waitForFunction(() => window.__fileViewerSmokeQuery('.pdf-nav-pane')?.hidden === false, undefined, { timeout })
    }

    await page.locator('.pdf-nav-tabs button').nth(1).click()
    await page.waitForFunction(
      () => window.__fileViewerSmokeQuery('.pdf-nav-tabs button:nth-child(2)')?.getAttribute('aria-selected') === 'true',
      undefined,
      { timeout }
    )
    await page.locator('.pdf-nav-tabs button').first().click()
    await page.waitForFunction(
      expected => window.__fileViewerSmokeQueryAll('.pdf-page-button').length === expected,
      initial.pageCount,
      { timeout }
    )
  }

  await page.keyboard.press('Control+f')
  await page.waitForSelector('.viewer-search-popover input[type="search"]', { timeout })
  const query = samplePath.toLowerCase().includes('prince') ? 'Prince' : 'PDF'
  await page.fill('.viewer-search-popover input[type="search"]', query)
  await page.press('.viewer-search-popover input[type="search"]', 'Enter')
  await page.waitForFunction(
    () => {
      const summary = window.__fileViewerSmokeQuery('.viewer-search-summary')?.textContent?.trim() || '0/0'
      const [, total = '0'] = summary.split('/')
      return Number(total) > 0
    },
    undefined,
    { timeout: sampleTimeout }
  )
  const searchSummary = await page.locator('.viewer-search-summary').textContent()
  await page.locator('.viewer-search-close').click()

  await page.locator('.pdf-toolbar-group--rotate .pdf-icon-button').first().click()
  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.pdf-rotation-meter')?.textContent?.trim() === '0°',
    undefined,
    { timeout }
  )
  await page.locator('.pdf-scale-button').click()

  await page.setViewportSize({ width: 390, height: 844 })
  try {
    await page.waitForTimeout(120)
    const mobile = await page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const toolbar = window.__fileViewerSmokeQuery('.pdf-toolbar')
      const wrapper = window.__fileViewerSmokeQuery('.pdf-wrapper')
      const pageNode = window.__fileViewerSmokeQuery('.pdfViewer .page')
      const toolbarRect = toolbar?.getBoundingClientRect()
      const wrapperRect = wrapper?.getBoundingClientRect()
      const pageRect = pageNode?.getBoundingClientRect()
      return {
        viewportWidth: window.innerWidth,
        bodyScrollWidth: document.documentElement.scrollWidth,
        toolbarHeight: toolbarRect?.height || 0,
        toolbarWidth: toolbarRect?.width || 0,
        wrapperWidth: wrapperRect?.width || 0,
        pageWidth: pageRect?.width || 0,
        pageFitsWrapper: Boolean(wrapperRect && pageRect && pageRect.width <= wrapperRect.width + 2),
        visibleToolbarButtons: [...window.__fileViewerSmokeQueryAll('.pdf-toolbar button')]
          .filter(button => {
            const rect = button.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          }).length
      }
    })
    if (
      mobile.bodyScrollWidth > mobile.viewportWidth + 2 ||
      mobile.toolbarHeight < 32 ||
      mobile.toolbarHeight > 50 ||
      mobile.toolbarWidth < 300 ||
      mobile.wrapperWidth < 300 ||
      !mobile.pageFitsWrapper ||
      mobile.visibleToolbarButtons < 7
    ) {
      throw new Error(`Sample ${samplePath} failed mobile PDF layout smoke: ${JSON.stringify(mobile, null, 2)}`)
    }
  } finally {
    await page.setViewportSize({ width: 1440, height: 960 })
  }

  await verifyPdfCjkFontFallbackInteraction(page, samplePath)
  await verifyPdfIdentityFontRepairInteraction(page, samplePath)
  console.log(`[demo-browser-smoke] ${samplePath}: PDF pages/search/zoom/rotation/navigation/mobile verified (${searchSummary?.trim()}).`)
}

const verifyArchiveNestedPreviewInteraction = async (page, samplePath) => {
  const requests = pageRequestUrls.get(page) || []
  const fileAssetRequests = requests.filter(url => url.startsWith('file:'))
  if (fileAssetRequests.length) {
    throw new Error(`Sample ${samplePath} resolved runtime assets through file://: ${fileAssetRequests.join(', ')}`)
  }
  if (samplePath.endsWith('encrypted.zip')) {
    const archiveAssetRequests = requests.filter(url => /\/vendor\/libarchive\/(?:worker-bundle\.js|libarchive\.wasm)(?:\?|$)/.test(url))
    const workerRequest = archiveAssetRequests.find(url => /\/worker-bundle\.js(?:\?|$)/.test(url))
    const wasmRequest = archiveAssetRequests.find(url => /\/libarchive\.wasm(?:\?|$)/.test(url))
    if (!workerRequest || !wasmRequest || archiveAssetRequests.some(url => !/^https?:/i.test(url))) {
      throw new Error(`Sample ${samplePath} did not load libarchive Worker/WASM through HTTP(S): ${JSON.stringify(archiveAssetRequests)}`)
    }
  }

  const densityLayout = await page.evaluate(() => {
    const px = value => Number.parseFloat(String(value || '0')) || 0
    const read = selector => {
      const element = window.__fileViewerSmokeQuery(selector)
      if (!(element instanceof HTMLElement)) {
        return null
      }
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        dataset: { ...element.dataset },
        gap: px(style.gap || style.columnGap),
        fontSize: px(style.fontSize),
        lineHeight: px(style.lineHeight),
        paddingTop: px(style.paddingTop),
        paddingRight: px(style.paddingRight),
        paddingBottom: px(style.paddingBottom),
        paddingLeft: px(style.paddingLeft),
        height: rect.height,
        minHeight: px(style.minHeight),
        overflowX: style.overflowX,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth
      }
    }
    const demo = read('.demo-shell')
    const viewer = read('[part~="shell"]')
    const archive = read('.archive-shell, .archive-viewer')
    const toolbar = read('.archive-preview-toolbar')
    const list = read('.archive-list')
    const entry = read('.archive-entry')

    return {
      ok: demo?.dataset.demoDensity === 'compact' &&
        viewer?.dataset.viewerDensity === 'compact' &&
        archive?.dataset.viewerDensity === 'compact' &&
        toolbar &&
        toolbar.gap <= 5 &&
        toolbar.paddingTop <= 5 &&
        toolbar.paddingRight <= 5 &&
        toolbar.height <= 48 &&
        list &&
        list.gap <= 5 &&
        list.paddingRight <= 3 &&
        list.overflowX === 'hidden' &&
        list.scrollWidth <= list.clientWidth + 1 &&
        entry &&
        entry.gap <= 5 &&
        entry.paddingTop <= 5 &&
        entry.height <= 52 &&
        entry.fontSize <= 13 &&
        entry.lineHeight <= 18,
      demo,
      viewer,
      archive,
      toolbar,
      list,
      entry
    }
  })

  if (!densityLayout.ok) {
    throw new Error(`Sample ${samplePath} failed compact density smoke: ${JSON.stringify(densityLayout, null, 2)}`)
  }

  await page.locator('.archive-sidebar .archive-sidebar-toggle').click()
  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.archive-shell.archive-sidebar-collapsed, .archive-viewer.archive-sidebar-collapsed'),
    undefined,
    { timeout }
  )

  const collapsedLayout = await page.evaluate(() => {
    const readRect = selector => {
      const element = window.__fileViewerSmokeQuery(selector)
      if (!(element instanceof HTMLElement)) {
        return null
      }
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    }
    const shell = readRect('.archive-shell, .archive-viewer')
    const preview = readRect('.archive-preview')
    const toolbar = readRect('.archive-preview-toolbar')
    const nestedTarget = readRect('.archive-nested-target')
    const titleLabel = readRect('.archive-preview-toolbar span')
    const expectedWidth = Math.max(320, (shell?.width || 0) * 0.9)

    return {
      ok: Boolean(shell && preview && toolbar && nestedTarget) &&
        preview.width >= expectedWidth &&
        toolbar.width >= expectedWidth &&
        nestedTarget.width >= expectedWidth &&
        Math.abs(preview.left - shell.left) <= 2 &&
        (!titleLabel || titleLabel.height < 40),
      shell,
      preview,
      toolbar,
      nestedTarget,
      titleLabel
    }
  })

  if (!collapsedLayout.ok) {
    throw new Error(`Sample ${samplePath} archive sidebar collapse collapsed the preview layout: ${JSON.stringify(collapsedLayout, null, 2)}`)
  }

  await page.locator('.archive-preview-toolbar .archive-sidebar-toggle').click()
  await page.waitForFunction(
    () => !window.__fileViewerSmokeQuery('.archive-shell.archive-sidebar-collapsed, .archive-viewer.archive-sidebar-collapsed'),
    undefined,
    { timeout }
  )

  const nestedChecks = [
    {
      labels: ['code.ts'],
      selector: '.archive-nested-target .code-viewer pre code.hljs'
    },
    {
      labels: ['sample.pdf', 'prince-sample.pdf'],
      selector: '.archive-nested-target .pdfViewer .page, .archive-nested-target .pdf-page, .archive-nested-target canvas'
    },
    {
      labels: ['sample.docx', 'calibre-demo.docx'],
      selector: '.archive-nested-target .docx-wrapper, .archive-nested-target .docx-document, .archive-nested-target [data-docx-root]'
    }
  ]

  for (const check of nestedChecks) {
    const clicked = await page.evaluate(labels => {
      const entries = [...window.__fileViewerSmokeQueryAll('.archive-entry')]
      const labelSet = new Set(labels)
      const target = entries.find(entry => labelSet.has(entry.querySelector('.entry-copy strong')?.textContent?.trim() || ''))
      if (!(target instanceof HTMLButtonElement)) {
        return null
      }
      target.click()
      return target.querySelector('.entry-copy strong')?.textContent?.trim() || null
    }, check.labels)

    if (!clicked) {
      throw new Error(`Sample ${samplePath} archive smoke is missing nested entry ${check.labels.join(' or ')}.`)
    }

    await page.waitForSelector(check.selector, { timeout: sampleTimeout })
    await page.waitForFunction(
      () => {
        const state = window.__fileViewerSmokeQuery('.archive-state:not(.archive-hidden)')
        if (!(state instanceof HTMLElement)) {
          return true
        }
        const style = window.getComputedStyle(state)
        const rect = state.getBoundingClientRect()
        return state.hidden ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0 ||
          rect.width === 0 ||
          rect.height === 0
      },
      undefined,
      { timeout: sampleTimeout }
    ).catch(error => {
      throw new Error(`Sample ${samplePath} archive nested preview did not finish loading for ${clicked}.\n${error.message}`)
    })
    if (check.expectedText) {
      await page.waitForFunction(
        ({ expectedText }) => {
          const target = window.__fileViewerSmokeQuery('.archive-nested-target')
          return Boolean(target?.textContent?.includes(expectedText))
        },
        check,
        { timeout: sampleTimeout }
      )
    }

    const result = await page.evaluate(({ selector, expectedText }) => {
      const nestedTarget = window.__fileViewerSmokeQuery('.archive-nested-target')
      const text = (nestedTarget?.textContent || '').replace(/\s+/g, ' ').trim()
      const visibleError = window.__fileViewerSmokeQuery('.archive-error:not(.archive-hidden)')
      const selected = window.__fileViewerSmokeQuery('.archive-entry.active')
      return {
        ok: Boolean(window.__fileViewerSmokeQuery(selector)) &&
          !visibleError &&
          !text.includes('不支持.') &&
          (!expectedText || text.includes(expectedText)),
        selected: selected?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160),
        text: text.slice(0, 360),
        visibleError: visibleError?.textContent?.replace(/\s+/g, ' ').trim()
      }
    }, check)

    if (!result.ok) {
      throw new Error(`Sample ${samplePath} failed archive nested preview smoke for ${clicked}: ${JSON.stringify(result, null, 2)}`)
    }
  }
}

const verifyPptxRenderInteraction = async (page, samplePath) => {
  await page.waitForSelector('.flyfish-pptx-slide-slot', { timeout: sampleTimeout })
  const state = await page.evaluate(() => {
    const slots = [...window.__fileViewerSmokeQueryAll('.flyfish-pptx-slide-slot')]
    const visibleSlots = slots.filter(slot => {
      const rect = slot.getBoundingClientRect()
      const style = window.getComputedStyle(slot)
      return rect.width > 160 && rect.height > 100 && style.display !== 'none' && style.visibility !== 'hidden'
    })
    const firstVisible = visibleSlots[0]
    const firstRect = firstVisible?.getBoundingClientRect()
    const hasRenderedContent = visibleSlots.some(slot =>
      Boolean(slot.querySelector('svg, canvas, img, [data-slide-index], .slide')) ||
      (slot.textContent || '').replace(/\s+/g, ' ').trim().length > 20
    )
    return {
      activeRenderRoots: window.__fileViewerSmokeQueryAll('.file-viewer .content > .file-render').length,
      firstRect: firstRect ? {
        width: Number(firstRect.width.toFixed(2)),
        height: Number(firstRect.height.toFixed(2))
      } : null,
      hasRenderedContent,
      slotCount: slots.length,
      visibleSlotCount: visibleSlots.length
    }
  })
  const workerRequests = (pageRequestUrls.get(page) || [])
    .filter(url => /pptx[^/]*worker|worker[^/]*pptx/i.test(url))

  if (
    state.activeRenderRoots !== 1 ||
    state.slotCount < 2 ||
    state.visibleSlotCount < 1 ||
    !state.hasRenderedContent ||
    !workerRequests.length
  ) {
    throw new Error(`Sample ${samplePath} failed PPTX slide/worker smoke: ${JSON.stringify({
      ...state,
      workerRequests
    }, null, 2)}`)
  }
}

const verifyIworkRenderInteraction = async (page, samplePath) => {
  await page.waitForSelector('.iwork-scene', { timeout: sampleTimeout })
  const normalized = samplePath.toLowerCase()
  const expectedKind = normalized.endsWith('.pages')
    ? 'pages'
    : normalized.endsWith('.numbers')
      ? 'numbers'
      : 'keynote'
  const historicalGeneration = normalized.includes('-09-experimental.')
    ? 'iwork-09'
    : normalized.includes('-2015-experimental.')
      ? 'iwork-2013-plus'
      : ''
  const expectedMarker = historicalGeneration
    ? ''
    : expectedKind === 'pages'
    ? 'PAGES-CURRENT-15-3-1'
    : expectedKind === 'numbers'
      ? 'NUMBERS-CURRENT-15-3-1'
      : 'KEYNOTE-CURRENT-15-3-1'
  const navCount = await page.locator('.iwork-nav button').count()
  const snapshots = []

  for (let index = 0; index < navCount; index += 1) {
    if (expectedKind !== 'pages') {
      await page.locator('.iwork-nav button').nth(index).click()
      await page.waitForFunction(
        sceneIndex => window.__fileViewerSmokeQuery('.iwork-nav button.active') ===
          window.__fileViewerSmokeQueryAll('.iwork-nav button')[sceneIndex],
        index,
        { timeout: sampleTimeout }
      )
    }
    snapshots.push(await page.evaluate(async () => {
      const scenes = [...window.__fileViewerSmokeQueryAll('.iwork-scene')]
      const images = [...window.__fileViewerSmokeQueryAll('.iwork-object-image')]
      const cloneableImages = (await Promise.all(images.map(async image => {
        const clone = image.cloneNode()
        Object.assign(clone.style, { position: 'fixed', left: '-10000px', top: '0', width: '1px', height: '1px' })
        image.parentElement?.appendChild(clone)
        try {
          await clone.decode()
          return clone.naturalWidth > 0 && clone.naturalHeight > 0
        } catch {
          return false
        } finally {
          clone.remove()
        }
      }))).every(Boolean)
      return {
        charts: window.__fileViewerSmokeQueryAll('.iwork-object-chart').length,
        cloneableImages,
        images: images.length,
        notes: window.__fileViewerSmokeQueryAll('.iwork-notes').length,
        previews: window.__fileViewerSmokeQueryAll('.iwork-preview').length,
        rows: window.__fileViewerSmokeQueryAll('.iwork-table tr').length,
        sceneSizes: scenes.map(scene => ({
          height: Number.parseFloat(scene.style.height),
          width: Number.parseFloat(scene.style.width),
        })),
        shapes: window.__fileViewerSmokeQueryAll('.iwork-object-shape').length,
        tableWidths: [...window.__fileViewerSmokeQueryAll('.iwork-table')]
          .map(table => Number(table.getBoundingClientRect().width.toFixed(2))),
        tables: window.__fileViewerSmokeQueryAll('.iwork-table').length,
        text: scenes.map(scene => scene.textContent || '').join(' ').replace(/\s+/g, ' ').trim(),
      }
    }))
    if (expectedKind === 'pages') break
  }

  const workerRequests = (pageRequestUrls.get(page) || [])
    .filter(url => /\/iwork(?:\.worker)?\.js(?:$|[?#])|iwork[^/]*worker/i.test(url))
  const allText = snapshots.map(snapshot => snapshot.text).join(' ')
  const closeTo = (actual, expected, tolerance = 0.1) => Math.abs(Number(actual) - expected) <= tolerance
  const historicalFixture = historicalGeneration && expectedKind === 'pages'
    ? navCount === 1 && snapshots[0]?.sceneSizes.length === 1 &&
      closeTo(snapshots[0]?.sceneSizes[0]?.width, historicalGeneration === 'iwork-09' ? 595 : 595.28) &&
      closeTo(snapshots[0]?.sceneSizes[0]?.height, historicalGeneration === 'iwork-09' ? 842 : 841.89) &&
      (historicalGeneration === 'iwork-09'
        ? allText.trim() === ''
        : allText.includes('My hovercraft is full of eels'))
    : historicalGeneration && expectedKind === 'numbers'
      ? navCount === 1 && snapshots[0]?.sceneSizes.length === 1 && snapshots[0]?.tables === 1 &&
        snapshots[0]?.rows === (historicalGeneration === 'iwork-09' ? 45 : 3) &&
        (historicalGeneration === 'iwork-09' || ['automatic', '3400000', 'TRUE'].every(value => allText.includes(value)))
      : historicalGeneration && expectedKind === 'keynote'
        ? navCount === (historicalGeneration === 'iwork-09' ? 2 : 1) &&
          snapshots.every(snapshot => snapshot.sceneSizes.length === 1 &&
            closeTo(snapshot.sceneSizes[0]?.width, historicalGeneration === 'iwork-09' ? 800 : 1024) &&
            closeTo(snapshot.sceneSizes[0]?.height, historicalGeneration === 'iwork-09' ? 600 : 768)) &&
          (historicalGeneration === 'iwork-09' ? allText.includes('Title slide') : allText.length === 0)
        : false
  const hasExpectedStructure = historicalGeneration
    ? historicalFixture
    : expectedKind === 'pages'
      ? navCount === 2 && snapshots[0]?.sceneSizes.length === 2 && snapshots[0]?.rows === 5 &&
        snapshots[0]?.tableWidths.some(width => width >= 400) &&
        snapshots[0]?.shapes >= 1 && snapshots[0]?.charts >= 1 && snapshots[0]?.images >= 1
      : expectedKind === 'numbers'
        ? navCount === 2 && snapshots.every(snapshot => snapshot.sceneSizes.length === 1 && snapshot.tables === 1) &&
          snapshots[0]?.rows === 22 && snapshots[1]?.rows === 10 &&
          snapshots.some(snapshot => snapshot.charts >= 1) && allText.includes('30')
        : navCount === 2 && snapshots.every(snapshot => snapshot.sceneSizes.length === 1) &&
          snapshots.some(snapshot => snapshot.rows === 3 && snapshot.tableWidths.some(width => width >= 1000)) &&
          snapshots.some(snapshot => snapshot.notes >= 1) &&
          snapshots.some(snapshot => snapshot.shapes >= 1 && snapshot.charts >= 1 && snapshot.images >= 1)

  const state = await page.evaluate(() => ({
    injectedChrome: window.__fileViewerSmokeQueryAll('.iwork-brand, .iwork-badge, .iwork-diagnostics').length,
    roots: window.__fileViewerSmokeQueryAll('.iwork-viewer').length,
  }))

  if (
    state.roots !== 1 ||
    state.injectedChrome !== 0 ||
    !workerRequests.length ||
    (!historicalGeneration && !allText.includes(expectedMarker)) ||
    snapshots.some(snapshot => !snapshot.cloneableImages) ||
    snapshots.some(snapshot => snapshot.previews !== 0) ||
    !hasExpectedStructure
  ) {
    throw new Error(`Sample ${samplePath} failed native iWork Worker/scene smoke: ${JSON.stringify({
      ...state,
      expectedKind,
      historicalGeneration,
      expectedMarker,
      navCount,
      snapshots,
      workerRequests,
    }, null, 2)}`)
  }

  console.log(`[demo-browser-smoke] ${samplePath}: native ${expectedKind} Worker, scene geometry, text and objects verified.`)
}

const verifyHangulRenderInteraction = async (page, samplePath) => {
  await page.waitForSelector('.hangul-page', { timeout: sampleTimeout })
  const normalized = samplePath.toLowerCase()
  const state = await page.evaluate(async () => {
    const images = [...window.__fileViewerSmokeQueryAll('.hangul-page-media')]
    const decodedImages = await Promise.all(images.map(async image => {
      try {
        await image.decode()
        return image.naturalWidth > 0 && image.naturalHeight > 0
      } catch {
        return false
      }
    }))
    return {
      decodedImages,
      footers: [...window.__fileViewerSmokeQueryAll('.hangul-footer')].map(node => node.textContent?.trim() || ''),
      headers: [...window.__fileViewerSmokeQueryAll('.hangul-header')].map(node => node.textContent?.trim() || ''),
      images: images.length,
      imagesInsidePages: images.every(image => Boolean(image.closest('.hangul-page'))),
      injectedChrome: window.__fileViewerSmokeQueryAll('.hangul-meta, .hangul-warning').length,
      pageRect: (() => {
        const rect = window.__fileViewerSmokeQuery('.hangul-page')?.getBoundingClientRect()
        return rect ? { width: rect.width, height: rect.height } : null
      })(),
      pages: window.__fileViewerSmokeQueryAll('.hangul-page').length,
      rowCounts: [...window.__fileViewerSmokeQueryAll('.hangul-page table')]
        .map(table => table.querySelectorAll('tr').length),
      spans: [...window.__fileViewerSmokeQueryAll('.hangul-page td')]
        .map(cell => ({ colSpan: cell.colSpan, rowSpan: cell.rowSpan, text: cell.textContent?.trim() || '' })),
      styled: [...window.__fileViewerSmokeQueryAll('.hangul-structured-html span')]
        .map(node => {
          const style = getComputedStyle(node)
          return { color: style.color, fontSize: style.fontSize, fontStyle: style.fontStyle, text: node.textContent || '' }
        }),
      tables: window.__fileViewerSmokeQueryAll('.hangul-page table').length,
      tableWidths: [...window.__fileViewerSmokeQueryAll('.hangul-page table')]
        .map(table => table.getBoundingClientRect().width),
      text: [...window.__fileViewerSmokeQueryAll('.hangul-page')]
        .map(page => page.textContent || '').join(' ').replace(/\s+/g, ' ').trim(),
    }
  })
  const workerRequests = (pageRequestUrls.get(page) || [])
    .filter(url => /\/hangul(?:\.worker)?\.js(?:$|[?#])|hangul[^/]*worker/i.test(url))
  const expected = normalized.endsWith('hwplib-table.hwp')
    ? state.pages === 1 && state.tables === 2 && JSON.stringify(state.rowCounts) === JSON.stringify([3, 1])
    : normalized.endsWith('hwplib-image.hwp')
      ? state.pages === 1 && state.images === 4 && state.imagesInsidePages && state.decodedImages.every(Boolean)
      : normalized.endsWith('hwpxlib-sample1.hwpx')
        ? state.pages === 1 && state.text.includes('우리는 수학 이다.더') &&
          Math.abs((state.pageRect?.width || 0) - 793.7067) <= 1 && Math.abs((state.pageRect?.height || 0) - 1122.5067) <= 1 &&
          state.styled.some(item => item.text.includes('수학') && item.fontStyle === 'italic' && item.color === 'rgb(255, 0, 0)')
        : normalized.endsWith('hwpxlib-header-footer.hwpx')
          ? state.pages === 1 && state.headers.includes('머리말 테스트') && state.footers.includes('꼬리말')
          : normalized.endsWith('hwpxlib-simple-table.hwpx')
            ? state.pages === 1 && state.tables === 1 && JSON.stringify(state.rowCounts) === JSON.stringify([3]) &&
              state.spans.some(item => item.text === '1' && item.colSpan === 2 && item.rowSpan === 2) &&
              state.spans.some(item => item.text === '4' && item.colSpan === 2 && item.rowSpan === 1) &&
              Math.abs((state.tableWidths[0] || 0) - 253.72) <= 1
            : normalized.endsWith('hwpxlib-simple-picture.hwpx')
              ? state.pages === 1 && state.images === 1 && state.imagesInsidePages && state.decodedImages.every(Boolean)
      : normalized.endsWith('.hwpx')
        ? state.pages >= 1 && state.tables >= 1 && state.images >= 1 && state.imagesInsidePages && state.decodedImages.every(Boolean)
        : state.pages >= 1 && state.text.length > 0

  if (!expected || state.injectedChrome !== 0 || !workerRequests.length) {
    throw new Error(`Sample ${samplePath} failed Hangul real-file/Worker smoke: ${JSON.stringify({
      ...state,
      workerRequests,
    }, null, 2)}`)
  }

  console.log(`[demo-browser-smoke] ${samplePath}: Hangul Worker and declared document structure verified.`)
}

const verifyWordPerfectRenderInteraction = async (page, samplePath) => {
  await page.waitForSelector('.wpd-page', { timeout: sampleTimeout })
  const normalized = samplePath.toLowerCase()
  const state = await page.evaluate(() => ({
    footers: window.__fileViewerSmokeQueryAll('.wpd-footer').length,
    injectedChrome: window.__fileViewerSmokeQueryAll('.wpd-meta, .wpd-warning').length,
    notes: window.__fileViewerSmokeQueryAll('.wpd-notes').length,
    paragraphs: window.__fileViewerSmokeQueryAll('.wpd-page > p, .wpd-page > h1, .wpd-page > h2, .wpd-page > h3, .wpd-page > h4, .wpd-page > h5, .wpd-page > h6').length,
    rowCounts: [...window.__fileViewerSmokeQueryAll('.wpd-table')].map(table => table.querySelectorAll('tr').length),
    styled: [...window.__fileViewerSmokeQueryAll('.wpd-page span')].map(node => {
      const style = getComputedStyle(node)
      return { fontStyle: style.fontStyle, fontWeight: style.fontWeight, text: node.textContent || '', verticalAlign: style.verticalAlign }
    }),
    tables: window.__fileViewerSmokeQueryAll('.wpd-table').length,
    text: window.__fileViewerSmokeQuery('.wpd-page')?.textContent?.replace(/\s+/g, ' ').trim() || '',
  }))
  const requestUrls = pageRequestUrls.get(page) || []
  const workerRequests = requestUrls.filter(url => /wordperfect(?:\.worker)?\.js(?:$|[?#])|wordperfect[^/]*worker/i.test(url))
  const wasmRequests = requestUrls.filter(url => /libwpd\.wasm(?:$|[?#])/i.test(url))
  const moduleRequests = requestUrls.filter(url => /libwpd\.mjs(?:$|[?#])/i.test(url))
  const expected = normalized.endsWith('wordperfect-wp50.wp')
    ? state.paragraphs === 35 && state.text.includes('President')
    : normalized.endsWith('wordperfect-wp6.wpd')
      ? state.paragraphs === 3 && state.text.includes('APPENDIX')
      : normalized.endsWith('wordperfect-corel-wp6.wpd')
        ? state.paragraphs === 43 && state.tables === 3 && JSON.stringify(state.rowCounts) === JSON.stringify([4, 9, 14]) &&
          state.footers === 1 && state.notes === 1 && state.styled.some(item => item.fontWeight === '700') &&
          state.styled.some(item => item.fontStyle === 'italic') && state.styled.some(item => item.verticalAlign === 'super')
        : state.text.length > 0
  const moduleRequestObservable = browserName !== 'chromium' || moduleRequests.length > 0
  if (!expected || state.injectedChrome !== 0 || !workerRequests.length || !wasmRequests.length || !moduleRequestObservable) {
    throw new Error(`Sample ${samplePath} failed WordPerfect real-file/WASM smoke: ${JSON.stringify({
      ...state,
      moduleRequests,
      wasmRequests,
      workerRequests,
    }, null, 2)}`)
  }
  console.log(`[demo-browser-smoke] ${samplePath}: WordPerfect Worker, libwpd WebAssembly and declared structure verified.`)
}

const verifyStepRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(() => {
    const root = window.__fileViewerSmokeQuery('.model-viewer')
    const state = root?.querySelector('.model-state')
    const canvas = root?.querySelector('.model-stage canvas')
    const summary = root?.querySelector('.model-meta span')
    const type = root?.querySelector('.model-meta strong')
    if (
      !(root instanceof HTMLElement) ||
      !(state instanceof HTMLElement) ||
      !(canvas instanceof HTMLCanvasElement) ||
      !(summary instanceof HTMLElement) ||
      !(type instanceof HTMLElement)
    ) {
      return {
        ok: false,
        reason: 'missing STEP model root, state, canvas, or metadata'
      }
    }

    const canvasRect = canvas.getBoundingClientRect()
    const meshCount = Number(root.dataset.modelMeshCount || 0)
    const provider = root.getAttribute('data-viewer-zoom-provider') || ''
    const modelStatus = root.dataset.modelStatus || ''
    const modelFormat = root.dataset.modelFormat || ''

    return {
      ok: modelStatus === 'ready' &&
        /^(?:step|stp)$/i.test(modelFormat) &&
        meshCount > 0 &&
        state.hidden &&
        !state.classList.contains('error') &&
        canvasRect.width > 100 &&
        canvasRect.height > 100 &&
        canvas.width > 0 &&
        canvas.height > 0 &&
        Boolean(provider) &&
        /^(?:step|stp)$/i.test(type.textContent?.trim() || ''),
      canvas: {
        backingHeight: canvas.height,
        backingWidth: canvas.width,
        height: Number(canvasRect.height.toFixed(2)),
        width: Number(canvasRect.width.toFixed(2))
      },
      meshCount,
      modelFormat,
      modelStatus,
      provider,
      stateClass: state.className,
      stateHidden: state.hidden,
      summary: summary.textContent?.replace(/\s+/g, ' ').trim() || '',
      type: type.textContent?.trim() || ''
    }
  })
  const pageOrigin = new URL(page.url()).origin
  const wasmRequests = (pageRequestUrls.get(page) || []).filter(requestUrl => {
    try {
      const parsed = new URL(requestUrl)
      return parsed.origin === pageOrigin && /\/occt(?:-import-js)?[^/]*\.wasm(?:$|[?#])/i.test(parsed.href)
    } catch {
      return false
    }
  })

  if (!result.ok || !wasmRequests.length) {
    throw new Error(`Sample ${samplePath} failed STEP geometry/zoom-provider smoke: ${JSON.stringify({
      ...result,
      wasmRequests
    }, null, 2)}`)
  }
}

const verifyOpenDocumentContentOnly = async (page, samplePath) => {
  const normalized = samplePath.toLowerCase()
  const contentSelector = normalized.endsWith('.rtf') ? '.flyfish-rtf-paper' : '.odf-page'
  await page.waitForSelector(contentSelector, { timeout: sampleTimeout })
  const state = await page.evaluate(() => ({
    injectedChrome: window.__fileViewerSmokeQueryAll('.flyfish-rtf-header, .odf-shell > header, .odf-page > h3').length,
    text: window.__fileViewerSmokeQuery('.flyfish-rtf-viewer, .odf-viewer')?.textContent?.replace(/\s+/g, ' ').trim() || '',
  }))
  const forbiddenText = [
    'RTF 文档预览',
    'RTF document preview',
    'OpenDocument 文档预览',
    'OpenDocument document preview',
    'OpenDocument 演示文稿预览',
    'OpenDocument presentation preview',
  ]
  if (state.injectedChrome !== 0 || forbiddenText.some(value => state.text.includes(value))) {
    throw new Error(`Sample ${samplePath} injected renderer chrome into document content: ${JSON.stringify(state, null, 2)}`)
  }
}

const verifySpreadsheetColumnResizeInteraction = async (page, samplePath) => {
  const stage = page.locator('.e-virt-table-stage')
  await stage.waitFor({ state: 'visible', timeout: sampleTimeout })
  const box = await stage.boundingBox()
  if (!box) {
    throw new Error(`Sample ${samplePath} has no measurable spreadsheet stage.`)
  }

  // Initial fit can reduce a 34px Excel header to about 9px. Probe close to
  // the top edge so the resize smoke remains inside the scaled header.
  const headerY = box.y + 4
  const hits = []
  for (let offset = 8; offset < box.width - 8; offset += 4) {
    await page.mouse.move(box.x + offset, headerY)
    const cursor = await stage.evaluate(element => element.style.cursor)
    if (cursor === 'col-resize') {
      hits.push(offset)
    }
  }

  const groups = []
  for (const offset of hits) {
    const group = groups.at(-1)
    if (!group || offset - group.at(-1) > 4) {
      groups.push([offset])
    } else {
      group.push(offset)
    }
  }
  const boundaries = groups.map(group => (group[0] + group.at(-1)) / 2)
  if (boundaries.length < 2) {
    throw new Error(`Sample ${samplePath} exposed no resizable data-column boundary: ${JSON.stringify(boundaries)}`)
  }

  // The first boundary belongs to the fixed row-number column. Drag the next
  // one so the smoke verifies a real workbook column and its renderer state.
  const boundary = boundaries[1]
  const dragDelta = 48
  await page.mouse.move(box.x + boundary, headerY)
  const cursorBeforeDrag = await stage.evaluate(element => element.style.cursor)
  await page.mouse.down()
  await page.mouse.move(box.x + boundary + dragDelta, headerY, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(150)

  await page.mouse.move(box.x + boundary + dragDelta, headerY)
  const cursorAtMovedBoundary = await stage.evaluate(element => element.style.cursor)
  await page.mouse.move(box.x + boundary, headerY)
  const cursorAtOldBoundary = await stage.evaluate(element => element.style.cursor)
  const result = {
    boundaries,
    boundary,
    cursorAtMovedBoundary,
    cursorAtOldBoundary,
    cursorBeforeDrag,
    dragDelta,
  }
  if (
    cursorBeforeDrag !== 'col-resize' ||
    cursorAtMovedBoundary !== 'col-resize' ||
    cursorAtOldBoundary === 'col-resize'
  ) {
    throw new Error(`Sample ${samplePath} failed Excel column-resize smoke: ${JSON.stringify(result, null, 2)}`)
  }
  console.log(`[demo-browser-smoke] ${samplePath}: Excel column resize verified (${boundary}px -> ${boundary + dragDelta}px).`)
}

const verifyTiffRenderInteraction = async (page, samplePath) => {
  const viewer = page.locator('.tiff-viewer[data-tiff-page-count="2"]')
  await viewer.waitFor({ state: 'visible', timeout: sampleTimeout })
  const frames = viewer.locator('.tiff-frame')
  const images = frames.locator('img')
  if (await frames.count() !== 2 || await images.count() !== 2) {
    throw new Error(`Sample ${samplePath} did not render both TIFF pages.`)
  }

  const decoded = await images.evaluateAll(elements => elements.map(image => ({
    complete: image.complete,
    height: image.naturalHeight,
    src: image.src,
    width: image.naturalWidth,
  })))
  if (decoded.some(pageState => (
    !pageState.complete ||
    pageState.width !== 2480 ||
    pageState.height !== 3507 ||
    !pageState.src.startsWith('blob:')
  ))) {
    throw new Error(`Sample ${samplePath} returned unexpected TIFF page geometry: ${JSON.stringify(decoded, null, 2)}`)
  }

  const initialWidth = await frames.first().evaluate(element => element.getBoundingClientRect().width)
  const zoomState = await viewer.evaluate(element => {
    const provider = element.__flyfishViewerZoomProvider
    if (!provider) return null
    return provider.zoomIn()
  })
  await page.waitForTimeout(180)
  const zoomedWidth = await frames.first().evaluate(element => element.getBoundingClientRect().width)
  if (!zoomState || !(zoomedWidth > initialWidth)) {
    throw new Error(`Sample ${samplePath} did not respond to its registered zoom provider (${initialWidth} -> ${zoomedWidth}).`)
  }

  await viewer.locator('.tiff-toolbar button').last().click()
  const rotation = await viewer.locator('.tiff-rotation-meter').textContent()
  const rotatedGeometry = await frames.first().evaluate(element => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, width: rect.width }
  })
  if (rotation?.trim() !== '90°' || !(rotatedGeometry.width > rotatedGeometry.height)) {
    throw new Error(`Sample ${samplePath} failed group rotation: ${JSON.stringify({ rotation, rotatedGeometry })}`)
  }

  await images.first().dblclick()
  const lightbox = page.locator('.tiff-lightbox[data-open="true"]')
  await lightbox.waitFor({ state: 'visible', timeout: sampleTimeout })
  const lightboxSource = await lightbox.locator('img').getAttribute('src')
  if (lightboxSource !== decoded[0].src) {
    throw new Error(`Sample ${samplePath} opened the wrong TIFF page in the lightbox.`)
  }
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => window.__fileViewerSmokeQuery('.tiff-lightbox')?.getAttribute('data-open') === 'false')
  await images.nth(1).focus()
  await page.keyboard.press('Enter')
  await lightbox.waitFor({ state: 'visible', timeout: sampleTimeout })
  await lightbox.locator('button').click()

  await viewer.evaluate(async element => {
    const provider = element.__flyfishViewerViewStateProvider
    if (!provider) throw new Error('TIFF view-state provider is missing.')
    await provider.applyState({ page: 1 }, { notify: false })
  })
  await page.waitForTimeout(180)
  const meterBeforeScroll = (await viewer.locator('.tiff-page-meter').textContent())?.trim()
  await frames.nth(1).scrollIntoViewIfNeeded()
  await page.waitForTimeout(180)
  const meterAfterScroll = (await viewer.locator('.tiff-page-meter').textContent())?.trim()
  if (meterBeforeScroll !== '1 / 2' || meterAfterScroll !== '2 / 2') {
    throw new Error(`Sample ${samplePath} failed multipage state tracking: ${meterBeforeScroll} -> ${meterAfterScroll}.`)
  }

  console.log(`[demo-browser-smoke] ${samplePath}: two-page TIFF decode, zoom, rotation, page state, and lightbox verified.`)
}

const verifyBinaryInspectorInteraction = async (page, samplePath) => {
  const expectedTemplate = binaryDemoFixtureTemplates[samplePath]
  if (!expectedTemplate) {
    return
  }

  const root = page.locator('.fv-binary[data-binary-inspector-ready="true"]').first()
  await root.waitFor({ state: 'visible', timeout: sampleTimeout })
  const firstByte = root.locator('[data-binary-byte-offset="0"]').first()
  await firstByte.waitFor({ state: 'visible', timeout: sampleTimeout })
  await firstByte.click()
  const state = await root.evaluate((element) => ({
    byteCount: element.querySelectorAll('[data-binary-byte-offset]').length,
    selectedStart: element.getAttribute('data-binary-selected-start'),
    template: element.getAttribute('data-binary-template'),
    treeNodeCount: element.querySelectorAll('[data-binary-tree-node]').length
  }))
  if (
    state.template !== expectedTemplate ||
    state.treeNodeCount < 1 ||
    state.byteCount < 1 ||
    state.selectedStart !== '0'
  ) {
    throw new Error(
      `Sample ${samplePath} did not expose its read-only binary structure: ${JSON.stringify(state)}`
    )
  }
}

const verifyIfcRenderInteraction = async (page, samplePath) => {
  if (!samplePath.toLowerCase().endsWith('.ifc')) {
    return
  }

  const root = page.locator('.fv-ifc[data-ifc-status="ready"]').first()
  await root.waitFor({ state: 'visible', timeout: sampleTimeout })
  const canvas = root.locator('.fv-ifc-stage canvas').first()
  const properties = root.locator('.fv-ifc-properties').first()
  const controls = root.locator('.fv-ifc-toolbar button')
  await canvas.waitFor({ state: 'visible', timeout: sampleTimeout })
  await properties.waitFor({ state: 'visible', timeout: sampleTimeout })
  if (await controls.count() !== 3) {
    throw new Error(`Sample ${samplePath} did not expose its three IFC controls.`)
  }
  await controls.nth(2).click()
  await properties.waitFor({ state: 'hidden', timeout: sampleTimeout })
  await controls.nth(2).click()
  await properties.waitFor({ state: 'visible', timeout: sampleTimeout })
  const state = await root.evaluate((element) => {
    const canvasElement = element.querySelector('.fv-ifc-stage canvas')
    return {
      elementCount: Number(element.getAttribute('data-ifc-element-count') || 0),
      height: canvasElement instanceof HTMLCanvasElement ? canvasElement.height : 0,
      status: element.getAttribute('data-ifc-status'),
      width: canvasElement instanceof HTMLCanvasElement ? canvasElement.width : 0
    }
  })
  if (
    state.status !== 'ready' ||
    state.elementCount < 1 ||
    state.width < 11 ||
    state.height < 11
  ) {
    throw new Error(`Sample ${samplePath} did not render an IFC scene: ${JSON.stringify(state)}`)
  }
}

const verifyFormatSpecificInteraction = async (page, samplePath) => {
  const normalized = samplePath.toLowerCase()
  if (normalized === syntheticMarkdownMermaidSample) {
    await page.waitForSelector('.markdown-mermaid[data-markdown-mermaid="rendered"] svg', { timeout: sampleTimeout })
    const mermaidState = await page.evaluate(() => ({
      diagrams: window.__fileViewerSmokeQueryAll('.markdown-mermaid[data-markdown-mermaid="rendered"] svg').length,
      sourceBlocks: window.__fileViewerSmokeQueryAll('pre > code.language-mermaid, pre > code.lang-mermaid').length,
      text: window.__fileViewerSmokeQuery('.markdown-mermaid')?.textContent?.replace(/\s+/g, ' ').trim() || ''
    }))
    if (
      mermaidState.diagrams !== 1 ||
      mermaidState.sourceBlocks !== 0 ||
      !mermaidState.text.includes('REQUIREMENT_ANALYSIS') ||
      !mermaidState.text.includes('DONE')
    ) {
      throw new Error(`Embedded Mermaid state diagram did not render: ${JSON.stringify(mermaidState, null, 2)}`)
    }
  }
  if (normalized.endsWith('.pdf')) {
    await verifyPdfRenderInteraction(page, samplePath)
  }
  await verifyBinaryInspectorInteraction(page, samplePath)
  await verifyIfcRenderInteraction(page, samplePath)
  if (normalized === 'excel.xlsx') {
    await verifySpreadsheetColumnResizeInteraction(page, samplePath)
  }
  if (normalized === 'multipage-ccitt-g4.tif') {
    await verifyTiffRenderInteraction(page, samplePath)
  }
  if (normalized.endsWith('.xmind')) {
    await verifyXMindPanInteraction(page, samplePath)
  }
  if (normalized.endsWith('.typ') || normalized.endsWith('.typst')) {
    await verifyTypstRenderInteraction(page, samplePath)
  }
  if (normalized.endsWith('.drawio') || normalized.endsWith('.dio')) {
    await verifyDrawingRenderInteraction(page, samplePath)
  }
  if (/\.(?:dwg|dxf|dwf|dwfx|xps)$/.test(normalized)) {
    await verifyCadRenderInteraction(page, samplePath)
  }
  if (/\.(?:gds|oas|oasis)$/.test(normalized)) {
    await page.evaluate(label => {
      window.__fileViewerExpectedEdaLayoutLabel = label
    }, normalized.endsWith('.gds') ? 'GDSII' : 'OASIS')
    await verifyGdsLayoutRenderInteraction(page, samplePath)
  }
  if (/archive\.(?:zip|tar\.gz)$/.test(normalized)) {
    await verifyArchiveNestedPreviewInteraction(page, samplePath)
  }
  if (/\.pptx$/.test(normalized)) {
    await verifyPptxRenderInteraction(page, samplePath)
  }
  if (/\.(?:rtf|odt|odp)$/.test(normalized)) {
    await verifyOpenDocumentContentOnly(page, samplePath)
  }
  if (/\.(?:pages|numbers|key)$/.test(normalized)) {
    await verifyIworkRenderInteraction(page, samplePath)
  }
  if (/\.(?:hwp|hwpx)$/.test(normalized)) {
    await verifyHangulRenderInteraction(page, samplePath)
  }
  if (/\.(?:wpd|wp|wp5|wp6)$/.test(normalized)) {
    await verifyWordPerfectRenderInteraction(page, samplePath)
  }
  if (/\.(?:step|stp)$/.test(normalized)) {
    await verifyStepRenderInteraction(page, samplePath)
  }
}

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.wasm', 'application/wasm'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
])

const fail = message => {
  console.error(`[demo-browser-smoke] ${message}`)
  process.exit(1)
}

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths = process.env.PATH
      ?.split(delimiter)
      .filter(pathEntry => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map(binDir => resolve(binDir, '..'))
      .filter(pathEntry => existsSync(pathEntry)) || []

    for (const candidatePath of candidatePaths) {
      try {
        const playwrightEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(playwrightEntry).href)
      } catch {
        // Keep probing package roots injected by npm exec / npx.
      }
    }

    fail([
      'Missing playwright module.',
      'Run with: npm exec --yes --package playwright -- node scripts/verify-demo-browser-smoke.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const assertBuildOutput = () => {
  for (const file of ['index.html', 'iframe.html', 'compare.html']) {
    const filePath = join(outputDir, file)
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      fail(`Missing demo build output ${filePath}. Run pnpm build-only first.`)
    }
  }
}

const startStaticServer = async () => {
  assertBuildOutput()

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
    const decodedPath = decodeURIComponent(requestUrl.pathname)
    const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '')
    const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.replace(/^[/\\]+/, '')
    const filePath = resolve(outputDir, relativePath)

    if (!filePath.startsWith(outputDir) || relative(outputDir, filePath).startsWith('..')) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404)
      response.end('Not Found')
      return
    }

    const info = statSync(filePath)
    const contentType = mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream'
    const rangeHeader = request.headers.range
    const rangeMatch = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader || '')
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const requestedEnd = rangeMatch[2] ? Number(rangeMatch[2]) : info.size - 1
      const end = Math.min(requestedEnd, info.size - 1)
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
        response.writeHead(416, {
          'Content-Range': `bytes */${info.size}`,
          'Cache-Control': 'no-cache'
        })
        response.end()
        return
      }
      response.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Content-Type': contentType
      })
      createReadStream(filePath, { start, end }).pipe(response)
      return
    }

    response.writeHead(200, {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Content-Length': String(info.size),
      'Content-Type': contentType
    })
    createReadStream(filePath).pipe(response)
  })

  await new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer)
    server.listen(0, '127.0.0.1', resolveServer)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    fail('Unable to resolve demo smoke server address.')
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`
  }
}

const launchBrowser = async browserType => {
  try {
    return await browserType.launch({ headless: true })
  } catch (error) {
    if (browserName === 'chromium') {
      try {
        return await browserType.launch({ channel: 'chrome', headless: true })
      } catch {
        // Preserve the bundled-browser error because it carries the install command.
      }
    }
    throw error
  }
}

const createFailureRecorder = (page, baseUrl) => {
  const failures = []
  const requests = []
  const baseOrigin = new URL(baseUrl).origin

  pageRequestUrls.set(page, requests)
  page.on('request', request => {
    requests.push(request.url())
  })

  page.on('pageerror', error => {
    failures.push(`pageerror: ${error.stack || error.message}`)
  })
  page.on('console', message => {
    const text = message.text()
    if (message.type() === 'error' || text.includes('Cannot load system font:')) {
      failures.push(`console.${message.type()}: ${text}`)
    }
  })
  page.on('response', response => {
    const responseUrl = new URL(response.url())
    if (responseUrl.origin === baseOrigin && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`)
    }
  })

  return failures
}

const assertNoBrowserFailures = (failures, context) => {
  if (failures.length) {
    fail([context, ...failures].join('\n'))
  }
}

const waitForBodyText = async (page, requiredTexts, context) => {
  await page.waitForFunction(
    texts => texts.every(text => window.__fileViewerSmokeText.includes(text)),
    requiredTexts,
    { timeout }
  ).catch(error => {
    throw new Error(`${context} did not render expected text: ${requiredTexts.join(', ')}\n${error.message}`)
  })
}

const waitForAnyBodyText = async (page, acceptedTexts, context) => {
  await page.waitForFunction(
    texts => texts.some(text => window.__fileViewerSmokeText.includes(text)),
    acceptedTexts,
    { timeout }
  ).catch(error => {
    throw new Error(`${context} did not render any expected text: ${acceptedTexts.join(', ')}\n${error.message}`)
  })
}

const evaluateSampleSmokeState = async (page, samplePath) => page.evaluate(
  ({ config, sample }) => {
    const readElement = element => {
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim()
      return {
        selector: element.dataset.smokeSelector || element.className || element.tagName.toLowerCase(),
        text: text.slice(0, 180)
      }
    }
    const isVisible = element => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement) || element.hidden) {
        return false
      }
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false
      }
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    const collectVisible = selectors => selectors.flatMap(selector =>
      [...window.__fileViewerSmokeQueryAll(selector)].filter(isVisible).map(element => ({
        ...readElement(element),
        selector
      }))
    )
    const hiddenLeaks = config.hiddenStateSelectors.flatMap(selector =>
      [...window.__fileViewerSmokeQueryAll(selector)]
        .filter(element => window.getComputedStyle(element).display !== 'none')
        .map(element => ({
          ...readElement(element),
          selector
        }))
    )
    const visibleLoading = collectVisible(config.loadingSelectors)
    const visibleErrors = collectVisible(config.errorSelectors)
    const hasContent = Boolean(window.__fileViewerSmokeQuery('.file-viewer .content:not(.hidden)'))
    const hasMeaningful = config.meaningfulSelectors.some(selector =>
      [...window.__fileViewerSmokeQueryAll(selector)].some(isVisible)
    )
    const allowedNotice = config.allowedNotices.some(notice =>
      sample.endsWith(notice.sample) &&
      visibleErrors.some(error => error.text.includes(notice.includes))
    )

    return {
      allowedNotice,
      bodyText: window.__fileViewerSmokeText.replace(/\s+/g, ' ').trim().slice(0, 360),
      hasContent,
      hasMeaningful,
      hiddenLeaks,
      ready: hasContent &&
        hasMeaningful &&
        hiddenLeaks.length === 0 &&
        visibleLoading.length === 0 &&
        (visibleErrors.length === 0 || allowedNotice),
      visibleErrors,
      visibleLoading
    }
  },
  {
    config: sampleSmokeConfig,
    sample: samplePath
  }
)

const waitForSampleReady = async (page, samplePath) => {
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout: sampleTimeout })
  await page.waitForFunction(
    ({ config, sample }) => {
      const isVisible = element => {
        if (!(element instanceof HTMLElement || element instanceof SVGElement) || element.hidden) {
          return false
        }
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return false
        }
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }
      const hiddenLeaks = config.hiddenStateSelectors.some(selector =>
        [...window.__fileViewerSmokeQueryAll(selector)]
          .some(element => window.getComputedStyle(element).display !== 'none')
      )
      const visibleLoading = config.loadingSelectors.some(selector =>
        [...window.__fileViewerSmokeQueryAll(selector)].some(isVisible)
      )
      const visibleErrors = config.errorSelectors.flatMap(selector =>
        [...window.__fileViewerSmokeQueryAll(selector)].filter(isVisible)
      )
      const allowedNotice = config.allowedNotices.some(notice =>
        sample.endsWith(notice.sample) &&
        visibleErrors.some(error => (error.textContent || '').includes(notice.includes))
      )
      const hasContent = Boolean(window.__fileViewerSmokeQuery('.file-viewer .content:not(.hidden)'))
      const hasMeaningful = config.meaningfulSelectors.some(selector =>
        [...window.__fileViewerSmokeQueryAll(selector)].some(isVisible)
      )

      return hasContent &&
        hasMeaningful &&
        !hiddenLeaks &&
        !visibleLoading &&
        (visibleErrors.length === 0 || allowedNotice)
    },
    {
      config: sampleSmokeConfig,
      sample: samplePath
    },
    { timeout: sampleTimeout }
  )
}

const unlockKnownPasswordSample = async (page, samplePath) => {
  if (!samplePath.endsWith('encrypted.zip')) {
    return
  }

  const dialogSelector = '.archive-password-dialog:not(.archive-hidden)'
  await page.waitForSelector(`${dialogSelector} input[type="password"]`, { timeout: sampleTimeout })
  await page.fill(`${dialogSelector} input[type="password"]`, 'flyfish')
  await page.click(`${dialogSelector} .archive-password-submit`)
  await page.waitForFunction(
    selector => !window.__fileViewerSmokeQuery(selector),
    dialogSelector,
    { timeout: sampleTimeout }
  )
}

const verifySamplePickerLayering = async page => {
  const previousViewport = page.viewportSize()
  await page.setViewportSize({ width: 1440, height: 700 })
  try {
    await page.locator('.rail-navigation .rail-nav-button--samples').click()
    await page.waitForSelector('.control-panel[data-source-mode="samples"] .sample-picker.open .sample-menu', { timeout })
    const layering = await page.evaluate(() => {
      const samplePicker = window.__fileViewerSmokeQuery('.sample-picker.open')
      const menu = window.__fileViewerSmokeQuery('.sample-menu')
      const sourcePanel = window.__fileViewerSmokeQuery('.panel-body')
      const viewerPanel = window.__fileViewerSmokeQuery('.viewer-panel')
      if (
        !(samplePicker instanceof HTMLElement) ||
        !(menu instanceof HTMLElement) ||
        !(sourcePanel instanceof HTMLElement) ||
        !(viewerPanel instanceof HTMLElement)
      ) {
        return null
      }

      const menuRect = menu.getBoundingClientRect()
      const sourceRect = sourcePanel.getBoundingClientRect()
      const viewerRect = viewerPanel.getBoundingClientRect()
      const sampleLayer = Number.parseInt(window.getComputedStyle(menu).zIndex, 10) || 0
      const sourceLayer = Number.parseInt(window.getComputedStyle(sourcePanel).zIndex, 10) || 0
      const x = Math.min(menuRect.right - 2, menuRect.left + Math.max(2, menuRect.width / 2))
      const y = Math.min(menuRect.bottom - 2, menuRect.top + Math.max(2, menuRect.height / 2))
      const topElement = document.elementFromPoint(x, y)

      return {
        sampleLayer,
        sourceLayer,
        menuIsOnTop: Boolean(topElement && menu.contains(topElement)),
        menuWidth: menuRect.width,
        menuHeight: menuRect.height,
        menuWithinViewport: menuRect.left >= 0 &&
          menuRect.top >= 0 &&
          menuRect.right <= window.innerWidth + 1 &&
          menuRect.bottom <= window.innerHeight + 1,
        sourcePanelVisible: sourceRect.width > 0 && sourceRect.height > 0,
        viewerStillVisible: viewerRect.width > 0 && viewerRect.height > 0
      }
    })
    if (
      !layering ||
      layering.sampleLayer < 1 ||
      layering.sourceLayer < 1 ||
      !layering.menuIsOnTop ||
      !layering.menuWithinViewport ||
      !layering.sourcePanelVisible ||
      !layering.viewerStillVisible ||
      layering.menuWidth < 440 ||
      layering.menuHeight < 180
    ) {
      throw new Error(`Desktop sample library is not a visible, layered workspace panel: ${JSON.stringify(layering, null, 2)}`)
    }
    await page.keyboard.press('Escape')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForFunction(() => window.innerWidth === 390 && window.innerHeight === 844, { timeout })
    await page.evaluate(() => new Promise(resolveFrame => {
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame))
    }))
    const mobileFileCapsuleLayout = await page.evaluate(() => {
      const shell = window.__fileViewerSmokeQuery('.demo-shell')
      const toolbar = window.__fileViewerSmokeQuery('.viewer-toolbar')
      if (!(shell instanceof HTMLElement) || !(toolbar instanceof HTMLElement)) {
        return null
      }
      const toolbarRect = toolbar.getBoundingClientRect()
      const viewportCenter = window.innerWidth / 2
      const toolbarCenter = toolbarRect.left + toolbarRect.width / 2
      return {
        demoMode: shell.dataset.demoMode || '',
        viewportWidth: window.innerWidth,
        toolbarWidth: toolbarRect.width,
        toolbarHeight: toolbarRect.height,
        toolbarCenter,
        viewportCenter,
        centerOffset: Math.abs(toolbarCenter - viewportCenter),
        visible: toolbar.getClientRects().length > 0 && window.getComputedStyle(toolbar).visibility !== 'hidden'
      }
    })
    if (
      !mobileFileCapsuleLayout ||
      mobileFileCapsuleLayout.demoMode !== 'product' ||
      !mobileFileCapsuleLayout.visible ||
      mobileFileCapsuleLayout.toolbarWidth < 1 ||
      mobileFileCapsuleLayout.toolbarHeight < 1 ||
      mobileFileCapsuleLayout.centerOffset > 1
    ) {
      throw new Error(`Mobile product file capsule is not centered on the viewport: ${JSON.stringify(mobileFileCapsuleLayout, null, 2)}`)
    }
    await page.locator('.mobile-more-trigger').click()
    await page.waitForSelector('.mobile-action-panel', { timeout })
    await page.locator('.mobile-action-source-grid button').nth(2).click()
    await page.waitForSelector('.mobile-controls-open .sample-picker.open .sample-menu', { timeout })
    await page.waitForTimeout(300)
    const mobileLayout = await page.evaluate(() => {
      const panel = window.__fileViewerSmokeQuery('.control-panel')
      const menu = window.__fileViewerSmokeQuery('.sample-menu')
      if (!(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return null
      }
      const panelRect = panel.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const isHidden = selector => {
        const element = window.__fileViewerSmokeQuery(selector)
        return !(element instanceof HTMLElement) || window.getComputedStyle(element).display === 'none'
      }
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bodyScrollWidth: document.documentElement.scrollWidth,
        panel: {
          top: panelRect.top,
          right: panelRect.right,
          bottom: panelRect.bottom,
          left: panelRect.left
        },
        menu: {
          top: menuRect.top,
          right: menuRect.right,
          bottom: menuRect.bottom,
          left: menuRect.left,
          clientHeight: menu.clientHeight,
          scrollHeight: menu.scrollHeight
        },
        unrelatedControlsHidden: [
          '.panel-sticky-controls',
          '.scenario-picker',
          '.snippet-launch',
          '.mobile-action-panel'
        ].every(isHidden)
      }
    })
    if (
      !mobileLayout ||
      mobileLayout.bodyScrollWidth > mobileLayout.viewportWidth + 2 ||
      mobileLayout.panel.top < -1 ||
      mobileLayout.panel.left < -1 ||
      mobileLayout.panel.right > mobileLayout.viewportWidth + 1 ||
      mobileLayout.panel.bottom > mobileLayout.viewportHeight + 1 ||
      mobileLayout.menu.top < mobileLayout.panel.top - 1 ||
      mobileLayout.menu.left < mobileLayout.panel.left - 1 ||
      mobileLayout.menu.right > mobileLayout.panel.right + 1 ||
      mobileLayout.menu.bottom > mobileLayout.panel.bottom + 1 ||
      mobileLayout.menu.clientHeight < 180 ||
      mobileLayout.menu.scrollHeight <= mobileLayout.menu.clientHeight ||
      !mobileLayout.unrelatedControlsHidden
    ) {
      throw new Error(`Mobile sample picker is not a focused, contained sheet: ${JSON.stringify(mobileLayout, null, 2)}`)
    }
    await page.keyboard.press('Escape')
  } finally {
    if (previousViewport) {
      await page.setViewportSize(previousViewport)
    }
  }
}

const verifyFileCapsuleMotion = async (page) => {
  const readCapsuleFrame = () =>
    page.evaluate(() => {
      const shell = window.__fileViewerSmokeQuery('.demo-shell')
      const rail = window.__fileViewerSmokeQuery('.rail-navigation')
      const toolbar = window.__fileViewerSmokeQuery('.viewer-toolbar')
      const scrollRoot = window.__fileViewerSmokeQuery('[data-viewer-scroll-root="true"]')
      const render = window.__fileViewerSmokeQuery('.file-render')
      if (
        !(shell instanceof HTMLElement) ||
        !(rail instanceof HTMLElement) ||
        !(toolbar instanceof HTMLElement) ||
        !(scrollRoot instanceof HTMLElement) ||
        !(render instanceof HTMLElement)
      ) {
        return null
      }
      const readRect = (element) => {
        const rect = element.getBoundingClientRect()
        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
      }
      const legacyVariables = [
        '--demo-file-capsule-fusion',
        '--demo-file-capsule-fusion-soft',
        '--demo-file-capsule-fusion-length',
        '--demo-file-capsule-fusion-angle'
      ].filter((name) => window.getComputedStyle(shell).getPropertyValue(name).trim())
      const legacyAnimations =
        typeof document.getAnimations === 'function'
          ? document
              .getAnimations()
              .map((animation) => animation.animationName || '')
              .filter((name) => /bridge|droplet|fusion/i.test(name))
          : []
      const scrollRootStyle = window.getComputedStyle(scrollRoot)
      const renderStyle = window.getComputedStyle(render)
      const activeScrollStyle =
        render.scrollHeight > render.clientHeight + 2 ? renderStyle : scrollRootStyle
      return {
        state: shell.dataset.fileCapsuleState || '',
        viewportWidth: window.innerWidth,
        rail: readRect(rail),
        toolbar: readRect(toolbar),
        scrollRoot: readRect(scrollRoot),
        render: readRect(render),
        scrollRootPadding: Number.parseFloat(scrollRootStyle.paddingBlockStart) || 0,
        contentInset: Number.parseFloat(renderStyle.paddingBlockStart) || 0,
        scrollbarWidth: activeScrollStyle.scrollbarWidth,
        scrollbarTrack: activeScrollStyle.getPropertyValue('--file-viewer-scrollbar-track').trim(),
        scrollbarThumb: activeScrollStyle.getPropertyValue('--file-viewer-scrollbar-thumb').trim(),
        collapsedBottom:
          Number.parseFloat(
            window.getComputedStyle(shell).getPropertyValue('--demo-file-capsule-collapsed-bottom')
          ) || 0,
        documentStartGap:
          Number.parseFloat(
            window.getComputedStyle(shell).getPropertyValue('--demo-document-start-gap')
          ) || 0,
        legacyNodes: window.__fileViewerSmokeQueryAll('.file-capsule-fusion, .file-capsule-droplet')
          .length,
        legacyVariables,
        legacyAnimations
      }
    })
  const assertNoLegacyBridge = (frame, label) => {
    if (
      !frame ||
      frame.legacyNodes !== 0 ||
      frame.legacyVariables.length ||
      frame.legacyAnimations.length
    ) {
      throw new Error(
        `${label} file capsule retained a bridge artifact: ${JSON.stringify(frame, null, 2)}`
      )
    }
  }
  const maxRectDelta = (first, second) =>
    Math.max(
      Math.abs(first.top - second.top),
      Math.abs(first.right - second.right),
      Math.abs(first.bottom - second.bottom),
      Math.abs(first.left - second.left),
      Math.abs(first.width - second.width),
      Math.abs(first.height - second.height)
    )

  const initial = await readCapsuleFrame()
  assertNoLegacyBridge(initial, 'Initial merged')
  if (!initial || initial.state !== 'merged') {
    throw new Error(`File capsule did not start merged: ${JSON.stringify(initial, null, 2)}`)
  }
  if (
    Math.abs(initial.collapsedBottom - initial.toolbar.bottom) > 1 ||
    initial.scrollRootPadding > 1 ||
    Math.abs(
      initial.contentInset -
        (initial.collapsedBottom - initial.scrollRoot.top + initial.documentStartGap)
    ) > 1 ||
    initial.render.top + initial.contentInset < initial.toolbar.bottom + 8 ||
    initial.scrollbarWidth !== 'thin' ||
    initial.scrollbarTrack !== 'transparent' ||
    !initial.scrollbarThumb
  ) {
    throw new Error(
      `Document did not start safely below the capsule with its immersive scrollbar intact: ${JSON.stringify(initial, null, 2)}`
    )
  }

  const immersiveScroll = await page.evaluate(async () => {
    const toolbar = window.__fileViewerSmokeQuery('.viewer-toolbar')
    const scrollRoot = window.__fileViewerSmokeQuery('[data-viewer-scroll-root="true"]')
    const render = window.__fileViewerSmokeQuery('.file-render')
    if (
      !(toolbar instanceof HTMLElement) ||
      !(scrollRoot instanceof HTMLElement) ||
      !(render instanceof HTMLElement)
    ) {
      return null
    }
    const contentInset =
      Number.parseFloat(window.getComputedStyle(render).paddingBlockStart) || 0
    const activeScroll =
      render.scrollHeight > render.clientHeight + 2 ? render : scrollRoot
    const maxScroll = Math.max(0, activeScroll.scrollHeight - activeScroll.clientHeight)
    const targetScroll = Math.min(maxScroll, Math.max(96, contentInset + 24))
    const previousScrollBehavior = activeScroll.style.getPropertyValue('scroll-behavior')
    const previousScrollBehaviorPriority =
      activeScroll.style.getPropertyPriority('scroll-behavior')
    activeScroll.style.setProperty('scroll-behavior', 'auto', 'important')
    const scrollDeadline = performance.now() + 1_500
    do {
      activeScroll.scrollTop = targetScroll
      await new Promise((resolve) => setTimeout(resolve, 50))
    } while (
      Math.abs(activeScroll.scrollTop - targetScroll) > 2 &&
      performance.now() < scrollDeadline
    )
    const frame = {
      maxScroll,
      targetScroll,
      scrollTop: activeScroll.scrollTop,
      toolbarBottom: toolbar.getBoundingClientRect().bottom,
      renderTop: render.getBoundingClientRect().top,
      contentStart: render.getBoundingClientRect().top + contentInset - activeScroll.scrollTop
    }
    activeScroll.scrollTop = 0
    await new Promise((resolve) => requestAnimationFrame(resolve))
    if (previousScrollBehavior) {
      activeScroll.style.setProperty(
        'scroll-behavior',
        previousScrollBehavior,
        previousScrollBehaviorPriority
      )
    } else {
      activeScroll.style.removeProperty('scroll-behavior')
    }
    return frame
  })
  if (
    !immersiveScroll ||
    immersiveScroll.maxScroll < 96 ||
    Math.abs(immersiveScroll.scrollTop - immersiveScroll.targetScroll) > 2 ||
    immersiveScroll.contentStart >= immersiveScroll.toolbarBottom
  ) {
    throw new Error(
      `Document content did not scroll naturally behind the file capsule: ${JSON.stringify(immersiveScroll, null, 2)}`
    )
  }

  await page.locator('.rail-navigation').hover()
  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.demo-shell')?.dataset.fileCapsuleState === 'expanded',
    undefined,
    { timeout: 2_000 }
  )
  const expanded = await readCapsuleFrame()
  assertNoLegacyBridge(expanded, 'Expanded')
  const expandedCenter = expanded.toolbar.left + expanded.toolbar.width / 2
  if (
    expanded.state !== 'expanded' ||
    expanded.toolbar.top < expanded.rail.bottom + 16 ||
    Math.abs(expandedCenter - expanded.viewportWidth / 2) > 1
  ) {
    throw new Error(`File capsule expansion is misaligned: ${JSON.stringify(expanded, null, 2)}`)
  }

  const leaveStartedAt = Date.now()
  await page.mouse.move(24, 920)
  await page.waitForTimeout(900)
  const beforeIdleDelay = await readCapsuleFrame()
  assertNoLegacyBridge(beforeIdleDelay, 'Idle delay')
  if (beforeIdleDelay.state !== 'expanded') {
    throw new Error(
      `File capsule merged before its one-second delay: ${JSON.stringify(beforeIdleDelay, null, 2)}`
    )
  }
  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.demo-shell')?.dataset.fileCapsuleState === 'compacting',
    undefined,
    { timeout: 500 }
  )
  const compactStartedAfter = Date.now() - leaveStartedAt
  if (compactStartedAfter < 950 || compactStartedAfter > 1_300) {
    throw new Error(`File capsule compact timing drifted to ${compactStartedAfter}ms.`)
  }
  const compacting = await readCapsuleFrame()
  assertNoLegacyBridge(compacting, 'Compacting')

  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.demo-shell')?.dataset.fileCapsuleState === 'merging',
    undefined,
    { timeout: 500 }
  )
  const merging = await readCapsuleFrame()
  assertNoLegacyBridge(merging, 'Merging')
  await page.waitForFunction(
    () => window.__fileViewerSmokeQuery('.demo-shell')?.dataset.fileCapsuleState === 'merged',
    undefined,
    { timeout: 700 }
  )
  const merged = await readCapsuleFrame()
  assertNoLegacyBridge(merged, 'Final merged')
  if (maxRectDelta(initial.toolbar, merged.toolbar) > 1) {
    throw new Error(
      `File capsule did not settle on its original rect: ${JSON.stringify({ initial, merged }, null, 2)}`
    )
  }
}

const verifyMainDemo = async (page, baseUrl, failures) => {
  // The shell/capsule assertions below were written against the DOCX sample.
  // The English default is now the PPTX deck, so pin DOCX through the
  // shareable `?sample=` link (which also keeps the full product shell).
  await page.goto(`${baseUrl}/index.html?smoke=demo-browser-chrome&sample=docx`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.demo-shell .rail-brand', { timeout })
  await page.waitForSelector('.viewer-github-link img', { timeout })
  await page.waitForSelector('.viewer-status-dock .viewer-zoom-controls', { timeout })
  await page.waitForFunction(() => {
    const image = window.__fileViewerSmokeQuery('.viewer-github-link img')
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  }, { timeout })
  await waitForSampleReady(page, 'calibre-demo.docx')
  const productChrome = await page.evaluate(() => {
    const shell = window.__fileViewerSmokeQuery('.demo-shell')
    const controlPanel = window.__fileViewerSmokeQuery('.control-panel')
    const rail = window.__fileViewerSmokeQuery('.rail-navigation')
    const toolbar = window.__fileViewerSmokeQuery('.viewer-toolbar')
    const viewport = window.__fileViewerSmokeQuery('.viewport')
    const zoomDock = window.__fileViewerSmokeQuery('.viewer-status-dock')
    const zoomControls = zoomDock?.querySelector('.viewer-zoom-controls')
    const link = window.__fileViewerSmokeQuery('.viewer-github-link')
    const image = link?.querySelector('img')
    if (
      !(shell instanceof HTMLElement) ||
      !(controlPanel instanceof HTMLElement) ||
      !(rail instanceof HTMLElement) ||
      !(toolbar instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      !(zoomDock instanceof HTMLElement) ||
      !(zoomControls instanceof HTMLElement) ||
      !(link instanceof HTMLAnchorElement) ||
      !(image instanceof HTMLImageElement)
    ) {
      return null
    }
    const shellRect = shell.getBoundingClientRect()
    const railRect = rail.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const zoomRect = zoomDock.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    const imageRect = image.getBoundingClientRect()
    return {
      demoMode: shell.dataset.demoMode || '',
      href: link.href,
      label: link.getAttribute('aria-label'),
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
      shellHeight: shellRect.height,
      railWidth: railRect.width,
      railHeight: railRect.height,
      sourcePanelCount: window.__fileViewerSmokeQueryAll('.panel-body').length,
      sourcePanelOpen: controlPanel.classList.contains('desktop-source-open'),
      capsuleState: shell.dataset.fileCapsuleState || '',
      railTop: railRect.top,
      toolbarHeight: toolbarRect.height,
      toolbarTop: toolbarRect.top,
      viewportWidthPx: viewportRect.width,
      viewportHeight: viewportRect.height,
      zoomDockWidth: zoomRect.width,
      zoomDockHeight: zoomRect.height,
      zoomControlCount: zoomControls.querySelectorAll('[data-demo-zoom-action]').length,
      zoomLabel: zoomControls.querySelector('[data-demo-zoom-action="reset"]')?.textContent?.trim() || '',
      linkWidth: linkRect.width,
      linkHeight: linkRect.height,
      imageWidth: imageRect.width,
      imageHeight: imageRect.height,
      imageNaturalWidth: image.naturalWidth,
      imageNaturalHeight: image.naturalHeight
    }
  })
  if (
    !productChrome ||
    productChrome.demoMode !== 'product' ||
    productChrome.href !== 'https://github.com/flyfish-dev/file-viewer' ||
    !productChrome.label?.includes('GitHub') ||
    productChrome.bodyScrollWidth > productChrome.viewportWidth + 2 ||
    productChrome.shellHeight < 680 ||
    productChrome.railWidth < 480 ||
    productChrome.railWidth > 560 ||
    productChrome.railHeight < 56 ||
    productChrome.railHeight > 84 ||
    productChrome.sourcePanelCount !== 0 ||
    productChrome.sourcePanelOpen ||
    productChrome.capsuleState !== 'merged' ||
    productChrome.toolbarHeight < 46 ||
    productChrome.toolbarHeight > 54 ||
    productChrome.toolbarTop < productChrome.railTop ||
    productChrome.toolbarTop + productChrome.toolbarHeight > productChrome.railTop + productChrome.railHeight ||
    productChrome.viewportWidthPx < 900 ||
    productChrome.viewportHeight < 500 ||
    productChrome.zoomDockWidth < 120 ||
    productChrome.zoomDockHeight < 42 ||
    productChrome.zoomControlCount !== 4 ||
    (!/%$/.test(productChrome.zoomLabel) && productChrome.zoomLabel !== '—') ||
    productChrome.linkWidth < 38 ||
    productChrome.linkWidth > 48 ||
    productChrome.linkHeight < 38 ||
    productChrome.imageWidth < 18 ||
    productChrome.imageHeight < 18 ||
    productChrome.imageNaturalWidth < 1 ||
    productChrome.imageNaturalHeight < 1
  ) {
    throw new Error(`Main demo product chrome is incomplete or overflowing: ${JSON.stringify(productChrome, null, 2)}`)
  }
  const requests = pageRequestUrls.get(page) || []
  const githubApiRequests = requests.filter(requestUrl => {
    try {
      return new URL(requestUrl).hostname === 'api.github.com'
    } catch {
      return false
    }
  })
  if (githubApiRequests.length) {
    throw new Error(`Main demo made forbidden GitHub API requests: ${githubApiRequests.join(', ')}`)
  }
  await verifyFileCapsuleMotion(page)
  await verifySamplePickerLayering(page)
  assertNoBrowserFailures(failures, 'Main demo chrome emitted browser errors.')
  failures.length = 0

  await page.goto(`${baseUrl}/index.html?url=/example/markdown.md&smoke=demo-browser`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await waitForBodyText(page, [
    'markdown.md',
    'File Viewer Markdown Demo',
    'Release Checklist'
  ], 'Main demo')
  const defaultDensity = await page.evaluate(() => ({
    demo: window.__fileViewerSmokeQuery('.demo-shell')?.dataset.demoDensity,
    viewer: window.__fileViewerSmokeQuery('[part~="shell"]')?.dataset.viewerDensity
  }))
  if (defaultDensity.demo !== 'comfortable' || defaultDensity.viewer !== 'comfortable') {
    throw new Error(`Main demo should default to comfortable density: ${JSON.stringify(defaultDensity, null, 2)}`)
  }
  assertNoBrowserFailures(failures, 'Main demo explicit-URL Markdown emitted browser errors.')
  failures.length = 0

  // The tracked example README is deliberately long enough to overflow both
  // desktop and mobile viewports while still using the shared viewer scroll root.
  const immersiveScrollSample = 'README.md'
  await page.goto(`${baseUrl}/index.html?url=/example/${immersiveScrollSample}&smoke=demo-browser-immersive-scroll`, {
    waitUntil: 'domcontentloaded',
    timeout: sampleTimeout
  })
  await waitForSampleReady(page, immersiveScrollSample)
  const disposeScrollResolver = await installBrowserScrollContainerResolver(page, baseUrl)

  const readImmersiveLayout = () => page.evaluate(() => {
    const shell = window.__fileViewerSmokeQuery('.demo-shell')
    const panel = window.__fileViewerSmokeQuery('.viewer-panel.standalone')
    const viewport = panel?.querySelector('.viewport')
    const viewer = window.__fileViewerSmokeQuery('.file-viewer')
    const toolbar = window.__fileViewerSmokeQuery('.viewer-actions')
    if (
      !(shell instanceof HTMLElement) ||
      !(panel instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      !(viewer instanceof HTMLElement) ||
      !(toolbar instanceof HTMLElement)
    ) {
      return null
    }
    const panelRect = panel.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const viewerRect = viewer.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    const hiddenDemoChrome = [
      '.layout-shell',
      '.top-capsule-cluster',
      '.control-panel',
      '.viewer-global-actions',
      '.immersive-right-toolbar',
      '.viewer-status-dock',
      '.demo-recent-files',
      '.recent-history-fab',
      '.mobile-action-dock'
    ].every(selector => !window.__fileViewerSmokeQuery(selector))
    return {
      demoMode: shell.dataset.demoMode || '',
      hiddenDemoChrome,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      panel: {
        top: panelRect.top,
        right: panelRect.right,
        bottom: panelRect.bottom,
        left: panelRect.left
      },
      viewport: {
        top: viewportRect.top,
        right: viewportRect.right,
        bottom: viewportRect.bottom,
        left: viewportRect.left
      },
      viewer: {
        top: viewerRect.top,
        right: viewerRect.right,
        bottom: viewerRect.bottom,
        left: viewerRect.left
      },
      toolbar: {
        top: toolbarRect.top,
        right: toolbarRect.right,
        bottom: toolbarRect.bottom,
        left: toolbarRect.left,
        visibleButtons: [...toolbar.querySelectorAll('button')]
          .filter(button => button.getClientRects().length > 0).length
      }
    }
  })

  const assertImmersiveLayout = (layout, label) => {
    const fillsViewport = rect => (
      rect.top >= -1 &&
      rect.left >= -1 &&
      rect.right >= layout.viewportWidth - 1 &&
      rect.bottom >= layout.viewportHeight - 1
    )
    if (
      !layout ||
      layout.demoMode !== 'immersive' ||
      !layout.hiddenDemoChrome ||
      layout.documentWidth > layout.viewportWidth + 1 ||
      layout.documentHeight > layout.viewportHeight + 1 ||
      !fillsViewport(layout.panel) ||
      !fillsViewport(layout.viewport) ||
      !fillsViewport(layout.viewer) ||
      layout.toolbar.top < -1 ||
      layout.toolbar.left < -1 ||
      layout.toolbar.right > layout.viewportWidth + 1 ||
      layout.toolbar.bottom > layout.viewportHeight + 1 ||
      layout.toolbar.visibleButtons < 1
    ) {
      throw new Error(`${label} explicit-URL view is not immersive with only the viewer toolbar: ${JSON.stringify(layout, null, 2)}`)
    }
  }

  const exerciseImmersiveScroll = async label => {
    const scrollState = await page.evaluate(async () => {
      const contentShell = window.__fileViewerSmokeQuery('[data-viewer-scroll-root="true"]')
      const scrollRoot = window.__fileViewerSmokeResolveScrollContainer(contentShell)
      const toolbar = window.__fileViewerSmokeQuery('.file-viewer .viewer-actions')
      if (
        !(contentShell instanceof HTMLElement) ||
        !(scrollRoot instanceof HTMLElement) ||
        !contentShell.contains(scrollRoot) ||
        !(toolbar instanceof HTMLElement)
      ) {
        return null
      }

      const nextFrame = () => new Promise(resolveFrame => requestAnimationFrame(resolveFrame))
      const readRect = element => {
        const rect = element.getBoundingClientRect()
        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left
        }
      }
      const readDocumentScroll = () => ({
        window: window.scrollY,
        html: document.documentElement.scrollTop,
        body: document.body.scrollTop
      })

      scrollRoot.scrollTop = 0
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      await nextFrame()
      await nextFrame()

      const maxScrollTop = scrollRoot.scrollHeight - scrollRoot.clientHeight
      const targetScrollTop = Math.min(320, maxScrollTop)
      const before = {
        rootScrollTop: scrollRoot.scrollTop,
        documentScroll: readDocumentScroll(),
        toolbar: readRect(toolbar)
      }

      scrollRoot.scrollTop = targetScrollTop
      await nextFrame()
      await nextFrame()

      return {
        scrollContainer: scrollRoot.className,
        clientHeight: scrollRoot.clientHeight,
        scrollHeight: scrollRoot.scrollHeight,
        targetScrollTop,
        before,
        after: {
          rootScrollTop: scrollRoot.scrollTop,
          documentScroll: readDocumentScroll(),
          toolbar: readRect(toolbar)
        }
      }
    })

    const documentStayedStill = positions => positions &&
      Math.abs(positions.window) <= 0.5 &&
      Math.abs(positions.html) <= 0.5 &&
      Math.abs(positions.body) <= 0.5
    const toolbarStayedStill = scrollState && Math.max(
      Math.abs(scrollState.after.toolbar.top - scrollState.before.toolbar.top),
      Math.abs(scrollState.after.toolbar.right - scrollState.before.toolbar.right),
      Math.abs(scrollState.after.toolbar.bottom - scrollState.before.toolbar.bottom),
      Math.abs(scrollState.after.toolbar.left - scrollState.before.toolbar.left)
    ) <= 1

    if (
      !scrollState ||
      scrollState.scrollHeight <= scrollState.clientHeight + 1 ||
      scrollState.targetScrollTop <= 0 ||
      Math.abs(scrollState.before.rootScrollTop) > 0.5 ||
      scrollState.after.rootScrollTop <= 0 ||
      Math.abs(scrollState.after.rootScrollTop - scrollState.targetScrollTop) > 1 ||
      !documentStayedStill(scrollState.before.documentScroll) ||
      !documentStayedStill(scrollState.after.documentScroll) ||
      !toolbarStayedStill
    ) {
      throw new Error(`${label} explicit-URL view did not keep scrolling inside the document with a fixed toolbar: ${JSON.stringify(scrollState, null, 2)}`)
    }
  }

  try {
    assertImmersiveLayout(await readImmersiveLayout(), 'Desktop')
    await exerciseImmersiveScroll('Desktop')
    const desktopViewport = page.viewportSize()
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForFunction(() => window.innerWidth === 390 && window.innerHeight === 844, { timeout })
      assertImmersiveLayout(await readImmersiveLayout(), 'Mobile')
      await exerciseImmersiveScroll('Mobile')
    } finally {
      if (desktopViewport) {
        await page.setViewportSize(desktopViewport)
      }
    }
  } finally {
    await disposeScrollResolver()
  }
  assertNoBrowserFailures(failures, 'Main demo emitted browser errors.')
  failures.length = 0
}

const verifyOfdPdfPrototypeIsolation = async (page, baseUrl, failures) => {
  const openLinkPanel = async () => {
    const input = page.locator('#preview-url')
    if (!await input.isVisible()) {
      await page.locator('.rail-navigation .rail-nav-button--link').click()
    }
    await input.waitFor({ state: 'visible', timeout: sampleTimeout })
  }

  const openPreview = async (samplePath, selector) => {
    await openLinkPanel()
    await page.locator('#preview-url').fill(`/example/${samplePath}`)
    await page.locator('.source-command .primary-button').click()
    await page.waitForSelector(selector, { timeout: sampleTimeout })
    // A renderer can insert its first page before its loading task and cleanup
    // have fully settled. Wait for the shared viewer-ready contract before the
    // next same-realm switch so the repeat-order test does not create accidental
    // overlap; the explicit cancellation case below still switches immediately.
    await waitForSampleReady(page, samplePath)
    await page.waitForFunction(
      expectedSelector => {
        const visibleError = Array.from(window.__fileViewerSmokeQueryAll(
          '.ofd-state.error:not([hidden]), .pdf-state.pdf-state--error:not([hidden])'
        )).some(element => {
          const style = window.getComputedStyle(element)
          return style.display !== 'none' && style.visibility !== 'hidden'
        })
        return !visibleError && Boolean(window.__fileViewerSmokeQuery(expectedSelector))
      },
      selector,
      { timeout: sampleTimeout }
    )
  }

  await page.goto(`${baseUrl}/index.html?smoke=ofd-pdf-prototype-isolation`, {
    waitUntil: 'domcontentloaded',
    timeout: sampleTimeout
  })
  await openPreview('ofd.ofd', '.ofd-page-frame')

  for (const target of [
    ['pdf.pdf', '.pdfViewer .page'],
    ['ofd.ofd', '.ofd-page-frame'],
    ['pdf.pdf', '.pdfViewer .page']
  ]) {
    await openPreview(target[0], target[1])
  }

  // Exercise cancellation as well as the fully completed load order. The
  // final PDF must still render after an OFD task was started in the same JS realm.
  await openLinkPanel()
  await page.locator('#preview-url').fill('/example/ofd.ofd')
  await page.locator('.source-command .primary-button').click()
  await openLinkPanel()
  await page.locator('#preview-url').fill('/example/pdf.pdf')
  await page.locator('.source-command .primary-button').click()
  await page.waitForSelector('.pdfViewer .page', { timeout: sampleTimeout })

  const prototypeState = await page.evaluate(() => ({
    hasOwnPipeline: Object.prototype.hasOwnProperty.call(Array.prototype, 'pipeline'),
    pipelineType: typeof Array.prototype.pipeline,
    pdfPages: window.__fileViewerSmokeQueryAll('.pdfViewer .page').length,
    visiblePdfError: Array.from(window.__fileViewerSmokeQueryAll('.pdf-state.pdf-state--error:not([hidden])'))
      .some(element => window.getComputedStyle(element).display !== 'none')
  }))
  if (
    prototypeState.hasOwnPipeline ||
    prototypeState.pipelineType !== 'undefined' ||
    prototypeState.pdfPages < 1 ||
    prototypeState.visiblePdfError
  ) {
    throw new Error(`OFD/PDF prototype isolation failed: ${JSON.stringify(prototypeState, null, 2)}`)
  }
  assertNoBrowserFailures(failures, 'OFD/PDF same-session switching emitted browser errors.')
  failures.length = 0
  console.log('[demo-browser-smoke] OFD/PDF same-session order, repeat switching, and cancellation verified.')
}

const verifyCompareDemo = async (page, baseUrl, failures) => {
  const url = new URL(`${baseUrl}/compare.html`)
  url.searchParams.set('left', '/example/markdown.md')
  url.searchParams.set('right', '/example/text.txt')
  url.searchParams.set('smoke', 'demo-browser')

  await page.goto(url.href, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.compare-panel', { timeout })
  await page.waitForFunction(
    () => window.__fileViewerSmokeQueryAll('.compare-panel').length === 2 &&
      window.__fileViewerSmokeQueryAll('.compare-viewer .file-viewer').length === 2,
    undefined,
    { timeout }
  )
  await waitForAnyBodyText(page, [
    '文档比对',
    'Document Compare'
  ], 'Compare demo title')
  await waitForBodyText(page, [
    'File Viewer Markdown Demo',
    'File Viewer text sample'
  ], 'Compare demo')

  const searchPopoverCount = await page.locator('.compare-search-popover').count()
  if (searchPopoverCount !== 0) {
    fail('Compare search popover should be hidden before the keyboard shortcut is pressed.')
  }
  await page.keyboard.press('Control+F')
  await page.waitForSelector('.compare-search-popover input[type="search"]', { timeout })
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !window.__fileViewerSmokeQuery('.compare-search-popover'),
    undefined,
    { timeout }
  )

  assertNoBrowserFailures(failures, 'Compare demo emitted browser errors.')
  failures.length = 0
}

const verifyBlobPostMessageEntry = async (page, baseUrl, entry, text, failures) => {
  await page.goto(`${baseUrl}/index.html?url=/example/text.txt&smoke=${entry.replace(/[^a-z0-9]+/gi, '-')}-parent`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.evaluate(({ origin, entryPath }) => {
    const frameUrl = new URL(`/${entryPath}`, origin)
    if (entryPath === 'iframe.html') {
      frameUrl.searchParams.set('embed', '1')
    }
    frameUrl.searchParams.set('from', origin)
    frameUrl.searchParams.set('name', 'posted.md')
    document.body.innerHTML = [
      '<iframe',
      'id="blob-frame"',
      `src="${frameUrl.href}"`,
      'style="width:960px;height:640px;border:0"',
      '></iframe>'
    ].join(' ')
  }, { origin: baseUrl, entryPath: entry })
  const frameElement = await page.waitForSelector('#blob-frame', { timeout })
  const frame = await frameElement.contentFrame()
  if (!frame) {
    fail(`Could not resolve iframe content frame for ${entry} Blob postMessage smoke.`)
  }
  await frame.waitForSelector('.file-viewer', { timeout })
  await page.evaluate(message => {
    const blob = new Blob([
      `# Posted Markdown\n\n${message}`
    ], { type: 'text/markdown' })
    window.__fileViewerSmokeQuery('#blob-frame')?.contentWindow?.postMessage(blob, window.location.origin)
  }, text)
  await frame.waitForSelector('.markdown-body', { timeout })
  await frame.waitForFunction(
    message => window.__fileViewerSmokeText.includes(message),
    text,
    { timeout }
  )
  const controlPanelCount = await frame.locator('.control-panel').count()
  if (controlPanelCount !== 0) {
    fail(`${entry} Blob postMessage demo should not render the full demo control panel.`)
  }
  assertNoBrowserFailures(failures, `${entry} Blob postMessage demo emitted browser errors.`)
  failures.length = 0
}

const verifyIframeDemo = async (page, baseUrl, failures) => {
  await page.goto(`${baseUrl}/iframe.html?url=/example/markdown.md&smoke=demo-browser`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await waitForBodyText(page, [
    'File Viewer Markdown Demo',
    'Release Checklist'
  ], 'iframe URL demo')
  const controlPanelCount = await page.locator('.control-panel').count()
  if (controlPanelCount !== 0) {
    fail('iframe URL demo should not render the full demo control panel.')
  }
  assertNoBrowserFailures(failures, 'iframe URL demo emitted browser errors.')
  failures.length = 0

  await verifyBlobPostMessageEntry(page, baseUrl, 'iframe.html', 'Blob handoff works from the iframe entry.', failures)
  await verifyBlobPostMessageEntry(page, baseUrl, 'index.html', 'Blob handoff still works from the original demo entry.', failures)
}

const verifySampleFile = async (page, baseUrl, samplePath, failures) => {
  const url = new URL(`${baseUrl}/index.html`)
  url.searchParams.set('url', `/example/${samplePath}`)
  url.searchParams.set('smoke', `demo-browser-sample-${samplePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
  if (/\.(?:zip|tar|tgz|gz|7z|rar)$/i.test(samplePath)) {
    url.searchParams.set('density', 'compact')
  }

  await page.goto(url.href, {
    waitUntil: 'domcontentloaded',
    timeout: sampleTimeout
  })

  await unlockKnownPasswordSample(page, samplePath)

  try {
    await waitForSampleReady(page, samplePath)
  } catch (error) {
    const state = await evaluateSampleSmokeState(page, samplePath).catch(() => null)
    const workerRequests = (pageRequestUrls.get(page) || [])
      .filter(url => /worker|pptx/i.test(url))
    throw new Error([
      `Sample ${samplePath} did not become ready.`,
      error instanceof Error ? error.message : String(error),
      state ? `State: ${JSON.stringify(state, null, 2)}` : '',
      workerRequests.length ? `Worker requests: ${JSON.stringify(workerRequests, null, 2)}` : '',
      failures.length ? `Browser failures: ${failures.join('\n')}` : ''
    ].filter(Boolean).join('\n'))
  }

  const state = await evaluateSampleSmokeState(page, samplePath)
  if (!state.ready) {
    throw new Error(`Sample ${samplePath} has visible renderer issues: ${JSON.stringify(state, null, 2)}`)
  }

  assertNoBrowserFailures(failures, `Sample ${samplePath} emitted browser errors.`)
  failures.length = 0
  await verifyFormatSpecificInteraction(page, samplePath)
  return state
}

const verifyPageAwarePrintMaskAdapter = async (
  page,
  baseUrl,
  failures,
  samplePath,
  pageSelector
) => {
  await verifySampleFile(page, baseUrl, samplePath, failures)
  await page.locator(pageSelector).first().waitFor({ state: 'visible', timeout: sampleTimeout })
  await page.locator('.viewer-print-menu').first().waitFor({ state: 'visible', timeout: sampleTimeout })
  await page.evaluate(() => {
    globalThis.__printedMaskHtml = ''
    const captureDocument = new DOMParser().parseFromString(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>',
      'text/html'
    )
    const captureWindow = {
      document: captureDocument,
      addEventListener: window.addEventListener.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      focus() {},
      print() {
        globalThis.__printedMaskHtml = `<!doctype html>${captureDocument.documentElement.outerHTML}`
      },
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      setTimeout: window.setTimeout.bind(window),
    }
    window.open = () => captureWindow
  })

  const printMenu = page.locator('.viewer-print-menu:visible').first()
  if (await printMenu.count() !== 1) {
    const menuState = await page.evaluate(selector => ({
      allMenus: [...window.__fileViewerSmokeQueryAll('.viewer-print-menu')].map(menu => ({
        display: getComputedStyle(menu).display,
        visibility: getComputedStyle(menu).visibility,
        rect: menu.getBoundingClientRect().toJSON(),
        text: menu.textContent?.replace(/\s+/g, ' ').trim() || '',
      })),
      toolbarText: [...window.__fileViewerSmokeQueryAll('.viewer-toolbar, .mobile-viewer-actions')]
        .map(toolbar => toolbar.textContent?.replace(/\s+/g, ' ').trim() || ''),
      adapterPages: window.__fileViewerSmokeQueryAll(selector).length,
      bodyText: window.__fileViewerSmokeText.replace(/\s+/g, ' ').trim().slice(0, 500),
    }), pageSelector)
    const locatorState = {
      url: page.url(),
      demoShells: await page.locator('.demo-shell').count(),
      toolbars: await page.locator('.viewer-toolbar').count(),
      menus: await page.locator('.viewer-print-menu').count(),
      adapterPages: await page.locator(pageSelector).count(),
    }
    throw new Error(
      `${samplePath} did not expose the print menu: ${JSON.stringify({ menuState, locatorState })}`
    )
  }
  await printMenu.locator('button[aria-haspopup="true"]').click()
  await printMenu.locator('[role="menuitem"]:visible').last().click()
  await page.waitForSelector('.fv-print-mask-toolbar', { timeout: sampleTimeout })

  const browseState = await page.evaluate(selector => {
    const canvases = [...window.__fileViewerSmokeQueryAll('.fv-print-mask-canvas')]
    return {
      canvases: canvases.length,
      matchingPages: canvases.filter(canvas => canvas.parentElement?.matches(selector)).length,
      pointerEvents: canvases.map(canvas => getComputedStyle(canvas).pointerEvents),
    }
  }, pageSelector)
  if (
    browseState.canvases < 1 ||
    browseState.matchingPages !== browseState.canvases ||
    browseState.pointerEvents.some(value => value !== 'none')
  ) {
    throw new Error(`${samplePath} print-mask pages are not adapter-scoped: ${JSON.stringify(browseState)}`)
  }

  await page.locator('.fv-print-mask-toolbar button').first().click()
  const armed = page.locator('.fv-print-mask-canvas.is-armed')
  await armed.waitFor({ state: 'visible', timeout: sampleTimeout })
  const bounds = await armed.boundingBox()
  if (!bounds || bounds.width < 40 || bounds.height < 40) {
    throw new Error(`${samplePath} did not expose a drawable print page.`)
  }
  const viewport = page.viewportSize()
  const visibleBounds = {
    left: Math.max(0, bounds.x),
    top: Math.max(0, bounds.y),
    right: Math.min(viewport?.width || bounds.x + bounds.width, bounds.x + bounds.width),
    bottom: Math.min(viewport?.height || bounds.y + bounds.height, bounds.y + bounds.height),
  }
  const visibleWidth = visibleBounds.right - visibleBounds.left
  const visibleHeight = visibleBounds.bottom - visibleBounds.top
  if (visibleWidth < 40 || visibleHeight < 40) {
    throw new Error(`${samplePath} active print page is outside the viewport.`)
  }
  const startPoint = {
    x: visibleBounds.left + visibleWidth * 0.15,
    y: visibleBounds.top + visibleHeight * 0.18,
  }
  const endPoint = {
    x: visibleBounds.left + visibleWidth * 0.36,
    y: visibleBounds.top + visibleHeight * 0.32,
  }
  await page.mouse.move(startPoint.x, startPoint.y)
  await page.mouse.down()
  await page.mouse.move(endPoint.x, endPoint.y, { steps: 4 })
  await page.mouse.up()
  const drawnState = await page.evaluate(() => ({
    armed: window.__fileViewerSmokeQueryAll('.fv-print-mask-canvas.is-armed').length,
    blocks: window.__fileViewerSmokeQueryAll('.fv-print-mask-block').length,
  }))
  if (drawnState.armed !== 0 || drawnState.blocks !== 1) {
    const hitState = await page.evaluate(({ start, end }) => {
      const read = point => {
        const target = document.elementFromPoint(point.x, point.y)
        return {
          className: target?.className || '',
          tagName: target?.tagName || '',
        }
      }
      return { start: read(start), end: read(end) }
    }, { start: startPoint, end: endPoint })
    throw new Error(
      `${samplePath} did not commit one page mask: ${JSON.stringify({ drawnState, hitState, bounds })}`
    )
  }
  await page.locator('.fv-print-mask-toolbar button.primary').click()
  await page.waitForFunction(
    () => typeof globalThis.__printedMaskHtml === 'string' &&
      globalThis.__printedMaskHtml.includes('viewer-export-print-mask'),
    undefined,
    { timeout: sampleTimeout }
  )

  const exportState = await page.evaluate(() => {
    const documentRef = new DOMParser().parseFromString(globalThis.__printedMaskHtml, 'text/html')
    const pageMasks = [...documentRef.querySelectorAll(
      '[data-viewer-print-page-index] > .viewer-export-print-mask'
    )]
    return {
      indexedPages: documentRef.querySelectorAll('[data-viewer-print-page-index]').length,
      pageMasks: pageMasks.length,
      maskPageIndices: pageMasks.map(mask => mask.parentElement?.getAttribute(
        'data-viewer-print-page-index'
      )),
      globalMasks: documentRef.querySelectorAll(
        '.viewer-export-shell > .viewer-export-print-mask'
      ).length,
    }
  })
  if (
    exportState.indexedPages < 1 ||
    exportState.pageMasks !== 1 ||
    exportState.maskPageIndices.some(value => value === null) ||
    exportState.globalMasks !== 0
  ) {
    throw new Error(`${samplePath} exported its mask outside the selected page: ${JSON.stringify(exportState)}`)
  }
  assertNoBrowserFailures(failures, `${samplePath} print-mask adapter emitted browser errors.`)
  failures.length = 0
}

const verifyPageAwarePrintMaskAdapters = async (page, baseUrl, failures) => {
  const cases = [
    ['ppt.pptx', '.flyfish-pptx-slide-slot'],
    ['word.docx', '.docx-page-frame, .docx-flow-frame'],
    ['ofd.ofd', '.ofd-page-frame'],
  ]
  for (const [samplePath, pageSelector] of cases) {
    await verifyPageAwarePrintMaskAdapter(page, baseUrl, failures, samplePath, pageSelector)
  }
  console.log('[issue-112] DOCX/OFD/PPTX page-aware print-mask adapters verified in a real browser.')
}

const verifySampleMatrix = async (page, baseUrl, failures) => {
  const allSamples = collectDemoSampleFiles(examplesRoot, {
    includeSupportingMaterials: requestedSamples.length > 0
  })
  const requestedExpectedRejections = requestedSamples.filter(sample => readyOnlySampleExclusions.has(sample))
  if (requestedExpectedRejections.length) {
    fail(
      `Requested demo smoke sample(s) are expected-rejection fixtures, not ready-only samples: ` +
      requestedExpectedRejections
        .map(sample => `${sample} (${readyOnlySampleExclusions.get(sample)})`)
        .join(', ')
    )
  }
  const readyOnlySamples = allSamples.filter(sample => !readyOnlySampleExclusions.has(sample))
  const excludedExpectedRejections = allSamples.filter(sample => readyOnlySampleExclusions.has(sample))
  const samples = requestedSamples.length
    ? readyOnlySamples.filter(sample => requestedSamples.includes(sample))
    : readyOnlySamples
  const missingSamples = requestedSamples.filter(sample => !allSamples.includes(sample))
  if (missingSamples.length) {
    fail(`Requested demo smoke sample(s) not found: ${missingSamples.join(', ')}`)
  }
  let allowedNotices = 0

  for (const sample of samples) {
    const state = await verifySampleFile(page, baseUrl, sample, failures)
    if (state.allowedNotice) {
      allowedNotices += 1
    }
  }

  console.log(
    `[demo-browser-smoke] Verified ${samples.length} demo sample files from ${examplesRoot}` +
      (allowedNotices ? ` (${allowedNotices} documented notices)` : '') +
      (excludedExpectedRejections.length
        ? `; excluded ${excludedExpectedRejections.length} expected-rejection fixture(s) from the ready-only matrix.`
        : '.')
  )
  // BEGIN PREPACK COMPLETION OBSERVATION
  completedSampleMatrix = { sampleIds: samples, excludedExpectedRejections, allowedNotices }
  // END PREPACK COMPLETION OBSERVATION
}

const run = async () => {
  prepareSyntheticPdfCjkFontFallback()
  prepareSyntheticPdfIdentityFontRepair()
  prepareSyntheticMarkdownMermaid()
  let serverHandle
  let browser

  try {
    const playwrightModule = await importPlaywright()
    const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
    const browserType = playwright[browserName]
    if (!browserType) throw new Error(`Playwright does not expose the requested ${browserName} browser type.`)
    serverHandle = externalUrl
      ? { server: null, url: externalUrl.replace(/\/$/, '') }
      : await startStaticServer()
    browser = await launchBrowser(browserType)
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 960
      }
    })
    await page.addInitScript(installDeepQueryHelpers)
    const failures = createFailureRecorder(page, serverHandle.url)
    if (!formatOnly) {
      await verifyMainDemo(page, serverHandle.url, failures)
      await verifyOfdPdfPrototypeIsolation(page, serverHandle.url, failures)
      await verifyIframeDemo(page, serverHandle.url, failures)
      await verifyCompareDemo(page, serverHandle.url, failures)
    }
    await verifySampleMatrix(page, serverHandle.url, failures)
    if (!formatOnly) await verifyPageAwarePrintMaskAdapters(page, serverHandle.url, failures)
  } finally {
    await browser?.close()
    await new Promise(resolveClose => serverHandle?.server?.close(resolveClose) ?? resolveClose())
    cleanupSyntheticPdfCjkFontFallback()
    cleanupSyntheticPdfIdentityFontRepair()
    cleanupSyntheticMarkdownMermaid()
  }

  console.log(formatOnly
    ? `[demo-browser-smoke] Verified ${browserName} format sample matrix at ${serverHandle.url}`
    : `[demo-browser-smoke] Verified main demo, iframe entry, compare page, and sample matrix in ${browserName} at ${serverHandle.url}`)
  // BEGIN PREPACK COMPLETION OBSERVATION
  await recordBrowserGateCompletion({ gateId: 'demo-browser-smoke', engine: browserName,
    phase: formatOnly ? 'format-only' : requestedSamples.length ? 'selected-samples' : 'full',
    caseIds: [...(formatOnly ? [] : ['main-demo', 'ofd-pdf-isolation', 'iframe-entry', 'compare-page', 'page-aware-print-mask']), ...completedSampleMatrix.sampleIds.map(name => `sample:${name}`)],
    fixtures: completedSampleMatrix.sampleIds,
    summary: { formatOnly, requestedSamples, excludedExpectedRejections: completedSampleMatrix.excludedExpectedRejections, allowedNotices: completedSampleMatrix.allowedNotices } })
  // END PREPACK COMPLETION OBSERVATION
}

run().catch(error => {
  const hint = String(error?.message || error)
  if (hint.includes('Executable doesn') || hint.includes('browserType.launch')) {
    console.error(
      [
        '[demo-browser-smoke] Playwright browser is not installed.',
        `Run: npm exec --yes --package playwright -- playwright install ${browserName}`,
        `Original error: ${hint}`
      ].join('\n')
    )
    process.exit(1)
  }
  fail(error instanceof Error ? error.stack || error.message : String(error))
})
