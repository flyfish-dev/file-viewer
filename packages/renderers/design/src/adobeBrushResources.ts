import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { parseAdobeBrushResourceInWorker } from './adobeBrushResourceClient.js'
import type {
  AdobeBrushLibraryDocument,
  AdobeBrushResourceFormat,
  AdobeBrushSamplePreview,
  AdobeBrushShapeSummary,
  AdobePatternPreview,
} from './adobeBrushResourceProtocol.js'

const styles = `
.adobe-brush-resource{height:100%;min-height:360px;overflow:auto;box-sizing:border-box;background:#edf1f5;color:#172235;--abr-surface:#fff;--abr-border:rgba(15,23,42,.12);--abr-muted:#64748b;--abr-accent:#7c3aed}
.adobe-brush-toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:10px 18px;border-bottom:1px solid var(--abr-border);box-sizing:border-box;background:rgba(255,255,255,.94);backdrop-filter:blur(12px)}.adobe-brush-title{min-width:0}.adobe-brush-title strong,.adobe-brush-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adobe-brush-title strong{font-size:15px}.adobe-brush-title span{margin-top:3px;color:var(--abr-muted);font-size:11px;font-weight:700}.adobe-brush-search{width:min(280px,42vw);height:34px;padding:0 11px;border:1px solid rgba(100,116,139,.35);border-radius:8px;box-sizing:border-box;background:var(--abr-surface);color:inherit;font:inherit}.adobe-brush-search:focus{border-color:var(--abr-accent);outline:2px solid rgba(124,58,237,.15);outline-offset:1px}
.adobe-brush-content{max-width:1280px;margin:0 auto;padding:20px}.adobe-brush-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:1px;overflow:hidden;margin-bottom:18px;border:1px solid var(--abr-border);border-radius:10px;background:var(--abr-border)}.adobe-brush-summary div{padding:12px 14px;background:var(--abr-surface)}.adobe-brush-summary span{display:block;color:var(--abr-muted);font-size:10px;font-weight:800;text-transform:uppercase}.adobe-brush-summary strong{display:block;margin-top:4px;font-size:14px}.adobe-brush-section{margin:0 0 22px}.adobe-brush-section h3{margin:0 0 10px;font-size:13px}.adobe-brush-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.adobe-brush-card{min-width:0;overflow:hidden;border:1px solid var(--abr-border);border-radius:10px;background:var(--abr-surface);box-shadow:0 6px 18px rgba(15,23,42,.06)}.adobe-brush-preview{display:grid;height:150px;place-items:center;overflow:hidden;background:linear-gradient(45deg,#e9edf2 25%,transparent 25%),linear-gradient(-45deg,#e9edf2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9edf2 75%),linear-gradient(-45deg,transparent 75%,#e9edf2 75%);background-position:0 0,0 8px,8px -8px,-8px 0;background-size:16px 16px}.adobe-brush-preview canvas{display:block;max-width:132px;max-height:132px;image-rendering:auto}.adobe-brush-preview svg{display:block;width:128px;height:128px;overflow:visible;color:#17131f}.adobe-brush-copy{padding:11px}.adobe-brush-copy strong,.adobe-brush-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adobe-brush-copy strong{font-size:12px}.adobe-brush-copy span{margin-top:4px;color:var(--abr-muted);font-size:10px}.adobe-brush-copy code{display:block;margin-top:7px;color:var(--abr-accent);font:800 10px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:normal}.adobe-brush-empty{padding:48px 20px;color:var(--abr-muted);text-align:center;font-weight:700}.adobe-brush-note{margin:0 0 16px;padding:10px 12px;border:1px solid rgba(124,58,237,.2);border-radius:8px;background:rgba(124,58,237,.07);color:var(--abr-muted);font-size:11px;line-height:1.5}
[data-viewer-theme='dark'] .adobe-brush-resource{background:#0d1117;color:#e6edf3;--abr-surface:#161b22;--abr-border:rgba(139,148,158,.24);--abr-muted:#8b949e;--abr-accent:#c4b5fd}[data-viewer-theme='dark'] .adobe-brush-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='dark'] .adobe-brush-preview{background-color:#20262e;background-image:linear-gradient(45deg,#2d333b 25%,transparent 25%),linear-gradient(-45deg,#2d333b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2d333b 75%),linear-gradient(-45deg,transparent 75%,#2d333b 75%)}[data-viewer-theme='dark'] .adobe-brush-preview svg{color:#f0f3f6}
@media(prefers-color-scheme:dark){[data-viewer-theme='system'] .adobe-brush-resource{background:#0d1117;color:#e6edf3;--abr-surface:#161b22;--abr-border:rgba(139,148,158,.24);--abr-muted:#8b949e;--abr-accent:#c4b5fd}[data-viewer-theme='system'] .adobe-brush-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='system'] .adobe-brush-preview{background-color:#20262e;background-image:linear-gradient(45deg,#2d333b 25%,transparent 25%),linear-gradient(-45deg,#2d333b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2d333b 75%),linear-gradient(-45deg,transparent 75%,#2d333b 75%)}[data-viewer-theme='system'] .adobe-brush-preview svg{color:#f0f3f6}}
@media(max-width:600px){.adobe-brush-toolbar{align-items:flex-start;flex-direction:column;gap:8px;padding:9px 12px}.adobe-brush-search{width:100%}.adobe-brush-content{padding:12px}.adobe-brush-grid{grid-template-columns:1fr 1fr;gap:8px}.adobe-brush-preview{height:116px}.adobe-brush-preview canvas,.adobe-brush-preview svg{max-width:100px;max-height:100px}.adobe-brush-copy{padding:9px}.adobe-brush-summary{grid-template-columns:1fr 1fr}}
@media(max-width:390px){.adobe-brush-grid{grid-template-columns:1fr}}
`

const element = <K extends keyof HTMLElementTagNameMap>(documentRef: Document, tag: K, className?: string, text?: string) => {
  const value = documentRef.createElement(tag)
  if (className) value.className = className
  if (text !== undefined) value.textContent = text
  return value
}

const byteSize = (value: number) => value < 1024
  ? `${value} B`
  : value < 1024 * 1024
    ? `${(value / 1024).toFixed(1)} KiB`
    : `${(value / 1024 / 1024).toFixed(1)} MiB`

const fitCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
  const maximum = 132
  const scale = Math.min(1, maximum / Math.max(width, height))
  canvas.style.width = `${Math.max(1, Math.round(width * scale))}px`
  canvas.style.height = `${Math.max(1, Math.round(height * scale))}px`
}

const renderAlpha = (canvas: HTMLCanvasElement, sample: AdobeBrushSamplePreview) => {
  canvas.width = sample.width
  canvas.height = sample.height
  fitCanvas(canvas, sample.width, sample.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is required for ABR brush-tip preview.')
  const rgba = new Uint8ClampedArray(sample.alpha.byteLength * 4)
  for (let index = 0; index < sample.alpha.byteLength; index += 1) {
    const offset = index * 4
    rgba[offset] = 20
    rgba[offset + 1] = 17
    rgba[offset + 2] = 28
    rgba[offset + 3] = sample.alpha[index]
  }
  context.putImageData(new ImageData(rgba, sample.width, sample.height), 0, 0)
}

const renderPattern = (canvas: HTMLCanvasElement, pattern: AdobePatternPreview) => {
  canvas.width = pattern.width
  canvas.height = pattern.height
  fitCanvas(canvas, pattern.width, pattern.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is required for ABR pattern preview.')
  context.putImageData(new ImageData(new Uint8ClampedArray(pattern.rgba), pattern.width, pattern.height), 0, 0)
}

const renderComputedTip = (canvas: HTMLCanvasElement, shape: AdobeBrushShapeSummary) => {
  const size = 132
  canvas.width = size
  canvas.height = size
  canvas.style.width = `${size}px`
  canvas.style.height = `${size}px`
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is required for ABR computed-tip preview.')
  context.save()
  context.translate(size / 2, size / 2)
  context.rotate((shape.angle || 0) * Math.PI / 180)
  context.scale(1, Math.max(.05, (shape.roundness ?? 100) / 100))
  const radius = size * .36
  const hardness = Math.max(0, Math.min(1, (shape.hardness ?? 100) / 100))
  const gradient = context.createRadialGradient(0, 0, radius * hardness, 0, 0, radius)
  gradient.addColorStop(0, 'rgba(20,17,28,1)')
  gradient.addColorStop(Math.max(hardness, .001), 'rgba(20,17,28,1)')
  gradient.addColorStop(1, 'rgba(20,17,28,0)')
  context.fillStyle = gradient
  context.beginPath()
  context.arc(0, 0, radius, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

interface CardBinding { card: HTMLElement; searchText: string }

export default async function renderAdobeBrushResource(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  format: AdobeBrushResourceFormat,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const parsed = await parseAdobeBrushResourceInWorker(buffer, format, context?.options?.design, context?.signal)
  if (context?.signal?.aborted) throw new DOMException('Adobe resource rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const isChinese = (context?.options?.locale || documentRef.documentElement.lang || '').toLowerCase().startsWith('zh')
  const copy = isChinese ? {
    abr: 'Photoshop 笔刷库', csh: 'Photoshop 自定形状', search: '筛选名称、ID 或类型', empty: '没有匹配的资源',
    version: '版本', size: '文件大小', engine: '解析引擎', brushes: '笔刷预设', samples: '笔尖像素', patterns: '图案', shapes: '形状',
    metadata: '元数据', noPreview: '无像素预览', vectorBoundary: '路径几何已解析；减去、相交、排除等 Photoshop 布尔运算仅保留元数据，不冒充最终栅格效果。',
    brushBoundary: '展示文件中实际解码的笔尖/图案及预设参数，不模拟 Photoshop 笔触引擎。',
  } : {
    abr: 'Photoshop Brush Library', csh: 'Photoshop Custom Shapes', search: 'Filter names, IDs, or types', empty: 'No matching resources',
    version: 'Version', size: 'File size', engine: 'Parser', brushes: 'Brush presets', samples: 'Decoded tips', patterns: 'Patterns', shapes: 'Shapes',
    metadata: 'Metadata', noPreview: 'No pixel preview', vectorBoundary: 'Path geometry is decoded. Photoshop subtract/intersect/exclude composition is exposed as metadata, not presented as final raster output.',
    brushBoundary: 'Decoded tip/pattern pixels and preset parameters are shown; Photoshop stroke simulation is outside this preview.',
  }
  const style = element(documentRef, 'style')
  style.textContent = styles
  const root = element(documentRef, 'section', 'adobe-brush-resource')
  root.dataset.adobeBrushResource = parsed.format
  root.dataset.engine = parsed.engine
  const title = element(documentRef, 'div', 'adobe-brush-title')
  const total = parsed.format === 'abr'
    ? parsed.brushes.length + parsed.samples.length + parsed.patterns.length
    : parsed.shapes.length
  title.append(
    element(documentRef, 'strong', undefined, parsed.format === 'abr' ? copy.abr : copy.csh),
    element(documentRef, 'span', undefined, `${total} resources · ${parsed.format.toUpperCase()} ${parsed.version}`)
  )
  const search = element(documentRef, 'input', 'adobe-brush-search')
  search.type = 'search'
  search.placeholder = copy.search
  search.setAttribute('aria-label', copy.search)
  const toolbar = element(documentRef, 'header', 'adobe-brush-toolbar')
  toolbar.append(title, search)
  const content = element(documentRef, 'div', 'adobe-brush-content')
  const summary = element(documentRef, 'div', 'adobe-brush-summary')
  const summaryValues: Array<[string, string]> = parsed.format === 'abr'
    ? [[copy.brushes, String(parsed.brushes.length)], [copy.samples, String(parsed.samples.length)], [copy.patterns, String(parsed.patterns.length)], [copy.size, byteSize(buffer.byteLength)]]
    : [[copy.shapes, String(parsed.shapes.length)], [copy.version, parsed.version], [copy.engine, parsed.engine], [copy.size, byteSize(buffer.byteLength)]]
  summaryValues.forEach(([label, value]) => {
    const cell = element(documentRef, 'div')
    cell.append(element(documentRef, 'span', undefined, label), element(documentRef, 'strong', undefined, value))
    summary.appendChild(cell)
  })
  content.append(summary, element(documentRef, 'p', 'adobe-brush-note', parsed.format === 'abr' ? copy.brushBoundary : copy.vectorBoundary))
  const cards: CardBinding[] = []
  const deferredDraws = new Map<Element, () => void>()
  const observerConstructor = documentRef.defaultView?.IntersectionObserver
  const previewObserver = observerConstructor ? new observerConstructor(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const draw = deferredDraws.get(entry.target)
      if (!draw) return
      deferredDraws.delete(entry.target)
      previewObserver?.unobserve(entry.target)
      draw()
    })
  }, { root: root, rootMargin: '240px' }) : undefined
  let previewsAttached = false
  const deferPreview = (preview: HTMLElement, draw: () => void) => {
    const render = () => {
      draw()
      preview.dataset.previewRendered = 'true'
    }
    if (!previewObserver) {
      render()
      return
    }
    deferredDraws.set(preview, render)
    if (previewsAttached) previewObserver.observe(preview)
  }
  const materializeAll = () => {
    for (const [preview, draw] of deferredDraws) {
      previewObserver?.unobserve(preview)
      draw()
    }
    deferredDraws.clear()
  }
  const addSection = (heading: string) => {
    const section = element(documentRef, 'section', 'adobe-brush-section')
    section.appendChild(element(documentRef, 'h3', undefined, heading))
    const grid = element(documentRef, 'div', 'adobe-brush-grid')
    section.appendChild(grid)
    content.appendChild(section)
    return { section, grid }
  }
  const bindCard = (grid: HTMLElement, card: HTMLElement, searchText: string) => {
    grid.appendChild(card)
    cards.push({ card, searchText: searchText.toLocaleLowerCase() })
  }
  if (parsed.format === 'abr') {
    if (parsed.brushes.length) {
      const { grid } = addSection(copy.brushes)
      const sampleById = new Map(parsed.samples.map(sample => [sample.id, sample]))
      parsed.brushes.forEach(brush => {
        const card = element(documentRef, 'article', 'adobe-brush-card')
        const preview = element(documentRef, 'div', 'adobe-brush-preview')
        const sample = brush.shape.sampledDataId ? sampleById.get(brush.shape.sampledDataId) : undefined
        if (sample) {
          const canvas = element(documentRef, 'canvas')
          preview.appendChild(canvas)
          deferPreview(preview, () => renderAlpha(canvas, sample))
        } else if (brush.shape.type === 'computed') {
          const canvas = element(documentRef, 'canvas')
          preview.appendChild(canvas)
          deferPreview(preview, () => renderComputedTip(canvas, brush.shape))
        } else preview.appendChild(element(documentRef, 'span', undefined, copy.noPreview))
        const details = element(documentRef, 'div', 'adobe-brush-copy')
        details.append(
          element(documentRef, 'strong', undefined, brush.name || '(unnamed brush)'),
          element(documentRef, 'span', undefined, `${brush.shape.type} · ${brush.shape.size.toFixed(1)} px · ${brush.shape.angle.toFixed(1)}°`),
          element(documentRef, 'code', undefined, [brush.hasDynamics && 'dynamics', brush.hasTexture && 'texture', brush.hasDualBrush && 'dual', brush.toolType].filter(Boolean).join(' · ') || copy.metadata)
        )
        card.append(preview, details)
        bindCard(grid, card, `${brush.name} ${brush.shape.type} ${brush.shape.sampledDataId || ''} ${brush.toolType || ''}`)
      })
    }
    if (parsed.samples.length) {
      const { grid } = addSection(copy.samples)
      parsed.samples.forEach(sample => {
        const card = element(documentRef, 'article', 'adobe-brush-card')
        const preview = element(documentRef, 'div', 'adobe-brush-preview')
        const canvas = element(documentRef, 'canvas')
        preview.appendChild(canvas)
        deferPreview(preview, () => renderAlpha(canvas, sample))
        const details = element(documentRef, 'div', 'adobe-brush-copy')
        details.append(element(documentRef, 'strong', undefined, sample.id || '(unnamed tip)'), element(documentRef, 'span', undefined, `${sample.width} × ${sample.height}`))
        card.append(preview, details)
        bindCard(grid, card, `${sample.id} tip ${sample.width} ${sample.height}`)
      })
    }
    if (parsed.patterns.length) {
      const { grid } = addSection(copy.patterns)
      parsed.patterns.forEach(pattern => {
        const card = element(documentRef, 'article', 'adobe-brush-card')
        const preview = element(documentRef, 'div', 'adobe-brush-preview')
        const canvas = element(documentRef, 'canvas')
        preview.appendChild(canvas)
        deferPreview(preview, () => renderPattern(canvas, pattern))
        const details = element(documentRef, 'div', 'adobe-brush-copy')
        details.append(element(documentRef, 'strong', undefined, pattern.name || pattern.id), element(documentRef, 'span', undefined, `${pattern.width} × ${pattern.height}`), element(documentRef, 'code', undefined, pattern.id))
        card.append(preview, details)
        bindCard(grid, card, `${pattern.name} ${pattern.id} pattern`)
      })
    }
  } else {
    const { grid } = addSection(copy.shapes)
    parsed.shapes.forEach(shape => {
      const card = element(documentRef, 'article', 'adobe-brush-card')
      const preview = element(documentRef, 'div', 'adobe-brush-preview')
      const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', `0 0 ${shape.width} ${shape.height}`)
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', shape.name || shape.id)
      preview.appendChild(svg)
      deferPreview(preview, () => shape.paths.forEach(path => {
        if (!path.d) return
        const node = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path')
        node.setAttribute('d', path.d)
        node.setAttribute('fill', 'currentColor')
        node.setAttribute('fill-rule', path.fillRule === 'even-odd' ? 'evenodd' : 'nonzero')
        if (path.operation) node.dataset.operation = path.operation
        svg.appendChild(node)
      }))
      const operations = [...new Set(shape.paths.map(path => path.operation).filter(Boolean))]
      const details = element(documentRef, 'div', 'adobe-brush-copy')
      details.append(
        element(documentRef, 'strong', undefined, shape.name || '(unnamed shape)'),
        element(documentRef, 'span', undefined, `${shape.width} × ${shape.height} · ${shape.paths.length} paths`),
        element(documentRef, 'code', undefined, operations.join(' · ') || shape.id)
      )
      card.append(preview, details)
      bindCard(grid, card, `${shape.name} ${shape.id} ${operations.join(' ')}`)
    })
  }
  const empty = element(documentRef, 'div', 'adobe-brush-empty', copy.empty)
  empty.hidden = true
  content.appendChild(empty)
  root.append(toolbar, content)
  target.replaceChildren(style, root)
  previewsAttached = true
  deferredDraws.forEach((_draw, preview) => previewObserver?.observe(preview))

  const sections = Array.from(content.querySelectorAll<HTMLElement>('.adobe-brush-section'))
  const applyFilter = () => {
    const query = search.value.trim().toLocaleLowerCase()
    let visible = 0
    cards.forEach(binding => {
      const match = !query || binding.searchText.includes(query)
      binding.card.hidden = !match
      if (match) visible += 1
    })
    sections.forEach(section => { section.hidden = !section.querySelector('.adobe-brush-card:not([hidden])') })
    empty.hidden = visible !== 0
  }
  search.addEventListener('input', applyFilter)
  parsed.limitations.forEach((message, index) => context?.options?.onDiagnostic?.({
    code: `${parsed.format}-preview-boundary-${index + 1}`,
    level: 'info',
    message,
  }))
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    getPrintMaskPages: () => { materializeAll(); return [content] },
    printStyle: styles,
    toHtml: () => { materializeAll(); return root.outerHTML },
  })
  context?.registerThumbnailAdapter?.({ getTarget: () => { materializeAll(); return content } })
  return {
    $el: root,
    unmount() {
      search.removeEventListener('input', applyFilter)
      previewObserver?.disconnect()
      deferredDraws.clear()
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      target.replaceChildren()
    },
  }
}
