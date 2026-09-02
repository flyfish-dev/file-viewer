import type {
  FileRenderContext,
  FileViewerDesignOptions,
  FileViewerRenderedInstance,
} from '@file-viewer/core'
import { readFlaContainerInWorker } from './adobeContainerWorkerClient.js'
import type { FlaContainerLimits } from './flaContainer.js'

const flaStyle = `
.fla-viewer{display:grid;height:100%;min-height:440px;grid-template-rows:auto minmax(0,1fr);background:#eef2f7;color:#172033;font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}.fla-viewer *{box-sizing:border-box}.fla-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border-bottom:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.95)}.fla-header strong{display:block;font-size:14px}.fla-header span{display:block;margin-top:2px;color:#64748b;font-size:11px}.fla-badge{flex:0 0 auto;padding:5px 9px;border-radius:999px;background:#be123c!important;color:#fff!important;font-size:10px!important;font-weight:800;letter-spacing:.04em}.fla-layout{display:grid;min-height:0;grid-template-columns:minmax(0,1fr) 330px}.fla-stage{display:flex;min-width:0;min-height:0;align-items:center;justify-content:center;overflow:auto;padding:28px;background:linear-gradient(145deg,#fff1f2,#f8fafc 50%,#eff6ff)}.fla-stage img{display:block;max-width:100%;max-height:100%;object-fit:contain;border:1px solid rgba(15,23,42,.14);border-radius:10px;background:#fff;box-shadow:0 24px 64px rgba(30,41,59,.2)}.fla-sidebar{min-height:0;overflow:auto;border-left:1px solid rgba(15,23,42,.1);background:rgba(255,255,255,.92)}.fla-section{padding:14px;border-bottom:1px solid rgba(15,23,42,.08)}.fla-section h3{margin:0 0 9px;font-size:12px}.fla-list{display:grid;gap:7px;margin:0;padding:0;list-style:none}.fla-item{padding:8px 9px;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:#fff}.fla-item strong,.fla-item span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fla-item strong{font-size:11px}.fla-item span{margin-top:2px;color:#64748b;font-size:10px}.fla-note,.fla-warning{margin:0 0 7px;font-size:10px}.fla-note{color:#64748b}.fla-warning{color:#92400e}.fla-facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;margin:0}.fla-facts dt{color:#64748b;font-size:10px}.fla-facts dd{min-width:0;margin:0;overflow-wrap:anywhere;font-size:11px;font-weight:700}
[data-viewer-theme='dark'] .fla-viewer{background:#0d1117;color:#e6edf3}[data-viewer-theme='dark'] .fla-header,[data-viewer-theme='dark'] .fla-sidebar{background:rgba(22,27,34,.95);border-color:rgba(139,148,158,.22)}[data-viewer-theme='dark'] .fla-stage{background:linear-gradient(145deg,#28121a,#0d1117 55%,#111827)}[data-viewer-theme='dark'] .fla-item{background:#161b22;border-color:rgba(139,148,158,.25)}
@media(max-width:760px){.fla-viewer{min-height:360px}.fla-layout{grid-template-columns:1fr;grid-template-rows:minmax(260px,1fr) auto}.fla-sidebar{max-height:240px;border-top:1px solid rgba(15,23,42,.1);border-left:0}.fla-stage{padding:12px}}
`

const element = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
  text?: string
) => {
  const node = documentRef.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

const appendFact = (documentRef: Document, list: HTMLDListElement, label: string, value: string) => {
  list.append(element(documentRef, 'dt', undefined, label), element(documentRef, 'dd', undefined, value))
}

export default async function renderAdobeAnimate(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'fla',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('Animate rendering was aborted.', 'AbortError')
  const format = type.toLowerCase() === 'xfl' ? 'xfl' : 'fla'
  const design: FileViewerDesignOptions | undefined = context?.options?.design
  const limits: Partial<FlaContainerLimits> | undefined = design
    ? { maxFileBytes: design.maxFileBytes, ...design.fla }
    : undefined
  const parsed = await readFlaContainerInWorker(buffer, format, limits, design, context?.signal)
  if (context?.signal?.aborted) throw new DOMException('Animate rendering was aborted.', 'AbortError')
  context?.options?.onDiagnostic?.({
    code: 'animate-xfl-first-frame',
    level: 'info',
    message:
      'Modern compressed XFL-based FLA is parsed in a terminating Worker. The stage shows a bounded first-frame reconstruction; ActionScript, masks, filters, tweens, audio/video playback, and legacy binary FLA are not claimed.',
    detail: {
      format: parsed.format,
      container: parsed.container,
      timelines: parsed.timelines.length,
      symbols: parsed.symbols.length,
      previewElements: parsed.previewElementCount,
      unsupportedPreviewElements: parsed.unsupportedPreviewElements,
    },
  })

  const documentRef = target.ownerDocument || document
  const root = element(documentRef, 'div', 'fla-viewer')
  root.dataset.flaContainer = parsed.container
  root.dataset.flaPreview = 'first-frame-structure'
  const style = element(documentRef, 'style')
  style.textContent = flaStyle
  const header = element(documentRef, 'header', 'fla-header')
  const heading = element(documentRef, 'div')
  heading.append(
    element(documentRef, 'strong', undefined, parsed.name),
    element(
      documentRef,
      'span',
      undefined,
      `${parsed.stage.width} × ${parsed.stage.height} · ${parsed.stage.frameRate} fps · XFL ${parsed.xflVersion}`
    )
  )
  header.append(heading, element(documentRef, 'span', 'fla-badge', 'FIRST FRAME'))

  const layout = element(documentRef, 'div', 'fla-layout')
  const stage = element(documentRef, 'main', 'fla-stage')
  const svgBlob = new Blob([parsed.previewSvg], { type: 'image/svg+xml' })
  const urlApi = documentRef.defaultView?.URL || URL
  const previewUrl = urlApi.createObjectURL(svgBlob)
  const image = element(documentRef, 'img')
  image.src = previewUrl
  image.alt = `${parsed.name} bounded first-frame preview`
  image.dataset.previewElements = String(parsed.previewElementCount)
  stage.appendChild(image)
  context?.registerThumbnailAdapter?.({ capture: async () => svgBlob })

  const sidebar = element(documentRef, 'aside', 'fla-sidebar')
  const factsSection = element(documentRef, 'section', 'fla-section')
  factsSection.appendChild(element(documentRef, 'h3', undefined, 'Verified XFL document'))
  const facts = element(documentRef, 'dl', 'fla-facts')
  appendFact(documentRef, facts, 'Container', parsed.container)
  appendFact(documentRef, facts, 'Creator', parsed.creatorInfo)
  appendFact(documentRef, facts, 'Package', `${parsed.entryCount} entries · ${formatBytes(parsed.expandedBytes)}`)
  appendFact(documentRef, facts, 'Library', `${parsed.symbols.length} symbols · ${parsed.resources.length} resources`)
  appendFact(
    documentRef,
    facts,
    'Preview',
    `${parsed.previewElementCount} rendered · ${parsed.unsupportedPreviewElements} omitted`
  )
  factsSection.appendChild(facts)
  sidebar.appendChild(factsSection)

  const timelineSection = element(documentRef, 'section', 'fla-section')
  timelineSection.appendChild(element(documentRef, 'h3', undefined, `Timelines (${parsed.timelines.length})`))
  const timelineList = element(documentRef, 'ul', 'fla-list')
  for (const timeline of parsed.timelines.slice(0, 128)) {
    const item = element(documentRef, 'li', 'fla-item')
    item.append(
      element(documentRef, 'strong', undefined, timeline.name),
      element(documentRef, 'span', undefined, `${timeline.frameCount} frames · ${timeline.layers.length} layers`)
    )
    timelineList.appendChild(item)
  }
  timelineSection.appendChild(timelineList)
  sidebar.appendChild(timelineSection)

  const layerSection = element(documentRef, 'section', 'fla-section')
  const selected = parsed.timelines[Math.min(parsed.stage.currentTimeline, parsed.timelines.length - 1)] || parsed.timelines[0]
  layerSection.appendChild(element(documentRef, 'h3', undefined, `Layers (${selected?.layers.length || 0})`))
  const layerList = element(documentRef, 'ul', 'fla-list')
  for (const layer of selected?.layers.slice(0, 256) || []) {
    const item = element(documentRef, 'li', 'fla-item')
    const elementCount = Object.values(layer.elements).reduce((sum, value) => sum + value, 0)
    item.append(
      element(documentRef, 'strong', undefined, layer.name),
      element(
        documentRef,
        'span',
        undefined,
        `${layer.layerType} · ${layer.frameCount} frames · ${elementCount} elements${layer.visible ? '' : ' · hidden'}`
      )
    )
    layerList.appendChild(item)
  }
  layerSection.appendChild(layerList)
  sidebar.appendChild(layerSection)

  const boundary = element(documentRef, 'section', 'fla-section')
  boundary.append(
    element(documentRef, 'h3', undefined, 'Preview boundary'),
    element(
      documentRef,
      'p',
      'fla-note',
      'Only modern ZIP/XFL-based FLA is accepted. The static stage covers bounded first-frame shapes, text, symbols, and PNG/JPEG instances; the timeline and resource inventory remain authoritative when an effect is omitted.'
    )
  )
  sidebar.appendChild(boundary)
  if (parsed.warnings.length > 0) {
    const warningSection = element(documentRef, 'section', 'fla-section')
    warningSection.appendChild(element(documentRef, 'h3', undefined, 'Read notes'))
    for (const warning of parsed.warnings) warningSection.appendChild(element(documentRef, 'p', 'fla-warning', warning))
    sidebar.appendChild(warningSection)
  }

  layout.append(stage, sidebar)
  root.append(header, layout)
  target.replaceChildren(style, root)

  let unmounted = false
  const unmount = () => {
    if (unmounted) return
    unmounted = true
    context?.signal?.removeEventListener('abort', unmount)
    context?.registerThumbnailAdapter?.(null)
    urlApi.revokeObjectURL(previewUrl)
    target.replaceChildren()
  }
  context?.signal?.addEventListener('abort', unmount, { once: true })
  return { $el: root, unmount }
}
