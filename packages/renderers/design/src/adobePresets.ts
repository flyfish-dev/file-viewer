import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { parseAdobePresetInWorker } from './adobePresetClient.js'
import { resolvePhotoshopParseLimits } from './limits.js'
import type {
  AdobeGradientPreset,
  AdobeLayerStylePreset,
  AdobePatternTile,
  AdobePresetFormat,
} from './adobePresetProtocol.js'

const styles = `
.adobe-preset-resource{height:100%;min-height:360px;overflow:auto;box-sizing:border-box;background:#eef2f7;color:#172235;--preset-surface:#fff;--preset-border:rgba(15,23,42,.13);--preset-muted:#64748b;--preset-accent:#8b5cf6}.adobe-preset-toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:10px 18px;border-bottom:1px solid var(--preset-border);box-sizing:border-box;background:rgba(255,255,255,.94);backdrop-filter:blur(12px)}.adobe-preset-title{min-width:0}.adobe-preset-title strong,.adobe-preset-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adobe-preset-title strong{font-size:15px}.adobe-preset-title span{margin-top:3px;color:var(--preset-muted);font-size:11px;font-weight:700}.adobe-preset-search{width:min(280px,42vw);height:34px;padding:0 11px;border:1px solid rgba(100,116,139,.35);border-radius:8px;box-sizing:border-box;background:var(--preset-surface);color:inherit;font:inherit}.adobe-preset-search:focus{border-color:var(--preset-accent);outline:2px solid rgba(139,92,246,.15);outline-offset:1px}.adobe-preset-content{max-width:1280px;margin:0 auto;padding:20px}.adobe-preset-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:1px;overflow:hidden;margin-bottom:16px;border:1px solid var(--preset-border);border-radius:10px;background:var(--preset-border)}.adobe-preset-summary div{padding:12px 14px;background:var(--preset-surface)}.adobe-preset-summary span{display:block;color:var(--preset-muted);font-size:10px;font-weight:800;text-transform:uppercase}.adobe-preset-summary strong{display:block;margin-top:4px;font-size:14px}.adobe-preset-note{margin:0 0 16px;padding:10px 12px;border:1px solid rgba(139,92,246,.2);border-radius:8px;background:rgba(139,92,246,.07);color:var(--preset-muted);font-size:11px;line-height:1.5}.adobe-preset-section{margin:0 0 22px}.adobe-preset-section h3{margin:0 0 10px;font-size:13px}.adobe-preset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.adobe-preset-card{min-width:0;overflow:hidden;border:1px solid var(--preset-border);border-radius:10px;background:var(--preset-surface);box-shadow:0 6px 18px rgba(15,23,42,.06)}.adobe-preset-preview{display:grid;height:142px;place-items:center;overflow:hidden;background-color:#e8ecf1;background-image:linear-gradient(45deg,#d9dee6 25%,transparent 25%),linear-gradient(-45deg,#d9dee6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d9dee6 75%),linear-gradient(-45deg,transparent 75%,#d9dee6 75%);background-position:0 0,0 8px,8px -8px,-8px 0;background-size:16px 16px}.adobe-preset-preview canvas{display:block;width:100%;height:100%;object-fit:contain}.adobe-preset-copy{padding:11px}.adobe-preset-copy strong,.adobe-preset-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adobe-preset-copy strong{font-size:12px}.adobe-preset-copy span{margin-top:4px;color:var(--preset-muted);font-size:10px}.adobe-preset-copy code{display:block;margin-top:7px;color:var(--preset-accent);font:800 10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:normal}.adobe-style-preview{display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:6px;padding:16px}.adobe-style-chip{padding:6px 8px;border:1px solid rgba(139,92,246,.25);border-radius:999px;background:rgba(139,92,246,.1);color:#6d28d9;font-size:10px;font-weight:800}.adobe-style-chip-off{opacity:.55;text-decoration:line-through}.adobe-preset-empty{padding:48px 20px;color:var(--preset-muted);text-align:center;font-weight:700}.adobe-preset-resource [hidden]{display:none!important}
[data-viewer-theme='dark'] .adobe-preset-resource{background:#0d1117;color:#e6edf3;--preset-surface:#161b22;--preset-border:rgba(139,148,158,.24);--preset-muted:#8b949e;--preset-accent:#c4b5fd}[data-viewer-theme='dark'] .adobe-preset-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='dark'] .adobe-preset-preview{background-color:#20262e;background-image:linear-gradient(45deg,#2d333b 25%,transparent 25%),linear-gradient(-45deg,#2d333b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2d333b 75%),linear-gradient(-45deg,transparent 75%,#2d333b 75%)}[data-viewer-theme='dark'] .adobe-style-chip{color:#ddd6fe}
@media(max-width:600px){.adobe-preset-toolbar{align-items:flex-start;flex-direction:column;gap:8px;padding:9px 12px}.adobe-preset-search{width:100%}.adobe-preset-content{padding:12px}.adobe-preset-grid{grid-template-columns:1fr 1fr;gap:8px}.adobe-preset-preview{height:116px}.adobe-preset-copy{padding:9px}.adobe-preset-summary{grid-template-columns:1fr 1fr}}@media(max-width:390px){.adobe-preset-grid{grid-template-columns:1fr}}
`

const element = <K extends keyof HTMLElementTagNameMap>(documentRef: Document, tag: K, className?: string, text?: string) => {
  const value = documentRef.createElement(tag)
  if (className) value.className = className
  if (text !== undefined) value.textContent = text
  return value
}

const renderPattern = (canvas: HTMLCanvasElement, pattern: AdobePatternTile) => {
  const width = 256
  const height = 142
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is required for PAT preview.')
  const tile = canvas.ownerDocument.createElement('canvas')
  tile.width = pattern.width
  tile.height = pattern.height
  const tileContext = tile.getContext('2d')
  if (!tileContext) throw new Error('Canvas 2D is required for PAT tile decoding.')
  tileContext.putImageData(new ImageData(new Uint8ClampedArray(pattern.rgba), pattern.width, pattern.height), 0, 0)
  const scale = Math.max(1, Math.min(8, Math.floor(48 / Math.max(pattern.width, pattern.height))))
  context.imageSmoothingEnabled = scale === 1
  for (let y = 0; y < height; y += pattern.height * scale) {
    for (let x = 0; x < width; x += pattern.width * scale) {
      context.drawImage(tile, x, y, pattern.width * scale, pattern.height * scale)
    }
  }
}

const renderGradient = (canvas: HTMLCanvasElement, gradient: AdobeGradientPreset) => {
  canvas.width = 256
  canvas.height = 72
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is required for GRD preview.')
  const image = context.createImageData(256, 72)
  for (let row = 0; row < 72; row += 1) image.data.set(gradient.previewRgba, row * 256 * 4)
  context.putImageData(image, 0, 0)
}

interface CardBinding { card: HTMLElement; searchText: string }

export default async function renderAdobePreset(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  format: AdobePresetFormat,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const parsed = await parseAdobePresetInWorker(buffer, format, context?.options?.design, context?.signal)
  if (context?.signal?.aborted) throw new DOMException('Adobe preset rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const chinese = (context?.options?.locale || documentRef.documentElement.lang || '').toLowerCase().startsWith('zh')
  const labels = chinese ? {
    pat: 'Photoshop 图案库', grd: 'Photoshop 渐变库', asl: 'Photoshop 图层样式库', search: '筛选名称、ID 或效果', empty: '没有匹配的预设',
    version: '版本', size: '文件大小', engine: '解析引擎', resources: '资源数', patterns: '图案', gradients: '渐变', styles: '图层样式', embedded: '内嵌图案',
  } : {
    pat: 'Photoshop Pattern Library', grd: 'Photoshop Gradient Library', asl: 'Photoshop Layer Style Library', search: 'Filter names, IDs, or effects', empty: 'No matching presets',
    version: 'Version', size: 'File size', engine: 'Parser', resources: 'Resources', patterns: 'Patterns', gradients: 'Gradients', styles: 'Layer styles', embedded: 'Embedded patterns',
  }
  const style = element(documentRef, 'style')
  style.textContent = styles
  const root = element(documentRef, 'section', 'adobe-preset-resource')
  root.dataset.adobePresetResource = parsed.format
  root.dataset.engine = parsed.engine
  const total = parsed.format === 'pat' ? parsed.patterns.length : parsed.format === 'grd' ? parsed.gradients.length : parsed.styles.length + parsed.patterns.length
  const title = element(documentRef, 'div', 'adobe-preset-title')
  title.append(element(documentRef, 'strong', undefined, labels[parsed.format]), element(documentRef, 'span', undefined, `${total} resources · ${parsed.format.toUpperCase()} ${parsed.version}`))
  const search = element(documentRef, 'input', 'adobe-preset-search')
  search.type = 'search'
  search.placeholder = labels.search
  search.setAttribute('aria-label', labels.search)
  const toolbar = element(documentRef, 'header', 'adobe-preset-toolbar')
  toolbar.append(title, search)
  const content = element(documentRef, 'div', 'adobe-preset-content')
  const summary = element(documentRef, 'div', 'adobe-preset-summary')
  const byteText = buffer.byteLength < 1024 ? `${buffer.byteLength} B` : `${(buffer.byteLength / 1024).toFixed(1)} KiB`
  ;[[labels.version, parsed.version], [labels.size, byteText], [labels.engine, parsed.engine], [labels.resources, String(total)]].forEach(([label, value]) => {
    const cell = element(documentRef, 'div')
    cell.append(element(documentRef, 'span', undefined, label), element(documentRef, 'strong', undefined, value))
    summary.appendChild(cell)
  })
  content.append(summary, element(documentRef, 'p', 'adobe-preset-note', parsed.limitations.join(' ')))
  const cards: CardBinding[] = []
  const previewBindings = new Map<Element, { draw: () => void; release: () => void }>()
  const Observer = documentRef.defaultView?.IntersectionObserver
  const observer = Observer ? new Observer(entries => entries.forEach(entry => {
    const binding = previewBindings.get(entry.target)
    if (!binding) return
    const preview = entry.target as HTMLElement
    if (entry.isIntersecting && preview.dataset.previewRendered !== 'true') {
      binding.draw()
      preview.dataset.previewRendered = 'true'
    } else if (!entry.isIntersecting && preview.dataset.previewRendered === 'true') {
      binding.release()
      delete preview.dataset.previewRendered
    }
  }), { root, rootMargin: '240px' }) : undefined
  const defer = (preview: HTMLElement, draw: () => void, release: () => void) => {
    previewBindings.set(preview, { draw, release })
    if (!observer) {
      draw()
      preview.dataset.previewRendered = 'true'
    } else observer.observe(preview)
  }
  const previewSurfacePixels = parsed.format === 'pat'
    ? parsed.patterns.length * 256 * 142
    : parsed.format === 'grd'
      ? parsed.gradients.length * 256 * 72
      : parsed.patterns.length * 256 * 142
  const previewLimits = resolvePhotoshopParseLimits(context?.options?.design)
  const maxMaterializedPixels = Math.min(previewLimits.maxResourcePreviewPixels, Math.floor(previewLimits.maxDecodedBytes / 4))
  const materializeAll = () => {
    if (previewSurfacePixels > maxMaterializedPixels) {
      throw new Error(`Preset export would materialize ${previewSurfacePixels} preview pixels, above the ${maxMaterializedPixels}-pixel safety limit.`)
    }
    observer?.disconnect()
    for (const [element, binding] of previewBindings) {
      const preview = element as HTMLElement
      if (preview.dataset.previewRendered === 'true') continue
      binding.draw()
      preview.dataset.previewRendered = 'true'
    }
  }
  const section = (heading: string) => {
    const wrapper = element(documentRef, 'section', 'adobe-preset-section')
    wrapper.appendChild(element(documentRef, 'h3', undefined, heading))
    const grid = element(documentRef, 'div', 'adobe-preset-grid')
    wrapper.appendChild(grid)
    content.appendChild(wrapper)
    return grid
  }
  const bind = (grid: HTMLElement, card: HTMLElement, text: string) => { grid.appendChild(card); cards.push({ card, searchText: text.toLocaleLowerCase() }) }
  const addPatternCards = (patterns: AdobePatternTile[], heading: string) => {
    if (!patterns.length) return
    const grid = section(heading)
    patterns.forEach(pattern => {
      const card = element(documentRef, 'article', 'adobe-preset-card')
      const preview = element(documentRef, 'div', 'adobe-preset-preview')
      const canvas = element(documentRef, 'canvas')
      preview.appendChild(canvas)
      defer(preview, () => renderPattern(canvas, pattern), () => { canvas.width = 1; canvas.height = 1 })
      const copy = element(documentRef, 'div', 'adobe-preset-copy')
      copy.append(element(documentRef, 'strong', undefined, pattern.name), element(documentRef, 'span', undefined, `${pattern.width} × ${pattern.height} · ${pattern.colorMode}`), element(documentRef, 'code', undefined, pattern.id))
      card.append(preview, copy)
      bind(grid, card, `${pattern.name} ${pattern.id} ${pattern.colorMode}`)
    })
  }
  if (parsed.format === 'pat') addPatternCards(parsed.patterns, labels.patterns)
  else if (parsed.format === 'grd') {
    const grid = section(labels.gradients)
    parsed.gradients.forEach(gradient => {
      const card = element(documentRef, 'article', 'adobe-preset-card')
      const preview = element(documentRef, 'div', 'adobe-preset-preview')
      const canvas = element(documentRef, 'canvas')
      preview.appendChild(canvas)
      defer(preview, () => renderGradient(canvas, gradient), () => { canvas.width = 1; canvas.height = 1 })
      const copy = element(documentRef, 'div', 'adobe-preset-copy')
      const definition = gradient.definition.form === 'solid' ? `${gradient.definition.colorStops.length} colors · ${gradient.definition.alphaStops.length} alpha stops` : `${gradient.definition.colorModel} noise · seed ${gradient.definition.seed}`
      copy.append(element(documentRef, 'strong', undefined, gradient.name), element(documentRef, 'span', undefined, gradient.folder || gradient.definition.form), element(documentRef, 'code', undefined, definition))
      card.append(preview, copy)
      bind(grid, card, `${gradient.name} ${gradient.folder || ''} ${definition}`)
    })
  } else {
    const grid = section(labels.styles)
    parsed.styles.forEach((preset: AdobeLayerStylePreset) => {
      const card = element(documentRef, 'article', 'adobe-preset-card')
      const preview = element(documentRef, 'div', 'adobe-preset-preview adobe-style-preview')
      preset.effects.forEach(effect => preview.appendChild(element(
        documentRef,
        'span',
        `adobe-style-chip${effect.enabled ? '' : ' adobe-style-chip-off'}`,
        `${effect.kind}${effect.instances > 1 ? ` ×${effect.instances}` : ''}${effect.enabled ? '' : ' · off'}`
      )))
      if (!preset.effects.length) preview.appendChild(element(documentRef, 'span', 'adobe-style-chip', 'blend options'))
      preview.dataset.previewRendered = 'true'
      const copy = element(documentRef, 'div', 'adobe-preset-copy')
      const details = [
        `${preset.effects.length} effect types`,
        `${preset.blendIfChannels} Blend If channels`,
        preset.blendMode ? `blend ${preset.blendMode}` : '',
        preset.opacity === undefined ? '' : `opacity ${preset.opacity}%`,
        preset.fillOpacity === undefined ? '' : `fill ${preset.fillOpacity}%`,
      ].filter(Boolean).join(' · ')
      copy.append(element(documentRef, 'strong', undefined, preset.name), element(documentRef, 'span', undefined, details), element(documentRef, 'code', undefined, preset.id))
      card.append(preview, copy)
      bind(grid, card, `${preset.name} ${preset.id} ${preset.effects.map(effect => effect.kind).join(' ')} ${preset.referencedPatterns.map(pattern => pattern.name).join(' ')}`)
    })
    addPatternCards(parsed.patterns, labels.embedded)
  }
  const empty = element(documentRef, 'div', 'adobe-preset-empty', labels.empty)
  empty.hidden = true
  content.appendChild(empty)
  root.append(toolbar, content)
  target.replaceChildren(style, root)
  const sections = Array.from(content.querySelectorAll<HTMLElement>('.adobe-preset-section'))
  const applyFilter = () => {
    const query = search.value.trim().toLocaleLowerCase()
    let visible = 0
    cards.forEach(binding => { const match = !query || binding.searchText.includes(query); binding.card.hidden = !match; if (match) visible += 1 })
    sections.forEach(value => { value.hidden = !value.querySelector('.adobe-preset-card:not([hidden])') })
    empty.hidden = visible !== 0
  }
  search.addEventListener('input', applyFilter)
  parsed.limitations.forEach((message, index) => context?.options?.onDiagnostic?.({ code: `${parsed.format}-preview-boundary-${index + 1}`, level: 'info', message }))
  context?.registerExportAdapter?.({ includeDocumentStyles: false, getPrintMaskPages: () => { materializeAll(); return [content] }, printStyle: styles, toHtml: () => { materializeAll(); return root.outerHTML } })
  context?.registerThumbnailAdapter?.({ getTarget: () => { materializeAll(); return content } })
  return {
    $el: root,
    unmount() {
      search.removeEventListener('input', applyFilter)
      observer?.disconnect()
      previewBindings.clear()
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      target.replaceChildren()
    },
  }
}
