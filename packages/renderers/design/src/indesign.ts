import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { readInDesignContainerInWorker } from './adobeContainerWorkerClient.js'
import {
  type InDesignContainerLimits,
  type InDesignDocumentPreview,
} from './indesignContainer.js'

const inDesignStyle = `
.indd-viewer{display:grid;height:100%;min-height:430px;grid-template-rows:auto minmax(0,1fr);background:#f1f3f6;color:#172033;font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}.indd-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-bottom:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.94)}.indd-title strong,.indd-title span{display:block}.indd-title strong{font-size:14px}.indd-title span{margin-top:2px;color:#64748b;font-size:11px}.indd-badge{flex:0 0 auto;padding:5px 9px;border-radius:999px;background:#c026d3;color:#fff;font-size:10px;font-weight:800;letter-spacing:.04em}.indd-badge[data-status='structure-only'],.indd-badge[data-status='unsupported-structure']{background:#475569}.indd-layout{display:grid;min-height:0;grid-template-columns:minmax(0,1fr) 330px}.indd-stage{display:flex;min-width:0;min-height:0;align-items:center;justify-content:center;overflow:auto;padding:26px;background:linear-gradient(145deg,#fdf4ff,#f8fafc 55%,#eef2ff)}.indd-stage img{display:block;max-width:100%;max-height:100%;object-fit:contain;border:1px solid rgba(15,23,42,.14);border-radius:8px;background:#fff;box-shadow:0 20px 58px rgba(30,41,59,.18)}.indd-empty{max-width:620px;padding:24px;border:1px dashed rgba(100,116,139,.45);border-radius:12px;background:rgba(255,255,255,.76);color:#475569}.indd-empty strong{display:block;margin-bottom:7px;color:#1e293b}.indd-sidebar{min-height:0;overflow:auto;border-left:1px solid rgba(15,23,42,.1);background:rgba(255,255,255,.92)}.indd-section{padding:14px;border-bottom:1px solid rgba(15,23,42,.08)}.indd-section h3{margin:0 0 10px;font-size:12px}.indd-facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;margin:0}.indd-facts dt{color:#64748b;font-size:10px}.indd-facts dd{min-width:0;margin:0;overflow-wrap:anywhere;font-size:11px;font-weight:700}.indd-warning{margin:0 0 7px;color:#92400e;font-size:10px}.indd-note{margin:0;color:#64748b;font-size:10px}
[data-viewer-theme='dark'] .indd-viewer{background:#0d1117;color:#e6edf3}[data-viewer-theme='dark'] .indd-header,[data-viewer-theme='dark'] .indd-sidebar{background:rgba(22,27,34,.94);border-color:rgba(139,148,158,.22)}[data-viewer-theme='dark'] .indd-stage{background:linear-gradient(145deg,#221225,#0d1117 55%,#111827)}[data-viewer-theme='dark'] .indd-empty{background:#161b22;border-color:rgba(139,148,158,.25);color:#c9d1d9}[data-viewer-theme='dark'] .indd-empty strong{color:#e6edf3}
@media(max-width:760px){.indd-viewer{min-height:360px}.indd-layout{grid-template-columns:1fr;grid-template-rows:minmax(260px,1fr) auto}.indd-sidebar{max-height:230px;border-top:1px solid rgba(15,23,42,.1);border-left:0}.indd-stage{padding:12px}}
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

const appendFact = (documentRef: Document, list: HTMLDListElement, label: string, value: string) => {
  list.append(element(documentRef, 'dt', undefined, label), element(documentRef, 'dd', undefined, value))
}

const statusLabel = (parsed: InDesignDocumentPreview) => {
  if (parsed.status === 'preview') return 'EMBEDDED PREVIEW'
  if (parsed.status === 'metadata-only') return 'XMP ONLY'
  if (parsed.status === 'unsupported-structure') return 'UNSUPPORTED STRUCTURE'
  return 'STRUCTURE ONLY'
}

export default async function renderAdobeInDesign(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'indd',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('InDesign rendering was aborted.', 'AbortError')
  const kind = type.toLowerCase() === 'indt' ? 'indt' : 'indd'
  const limits: Partial<InDesignContainerLimits> | undefined = context?.options?.design
    ? {
        maxFileBytes: context.options.design.maxFileBytes,
        ...context.options.design.inDesign,
      }
    : undefined
  const parsed = await readInDesignContainerInWorker(
    buffer,
    kind,
    limits,
    context?.options?.design,
    context?.signal
  )
  context?.options?.onDiagnostic?.({
    code: parsed.preview ? 'indesign-embedded-xmp-preview' : 'indesign-structure-only',
    level: 'info',
    message: parsed.preview
      ? 'InDesign is showing a saved PNG/JPEG thumbnail from a structurally verified XMP object; native layout reconstruction is not claimed.'
      : 'The native InDesign layout database was not rendered; only bounded structure and metadata are available.',
    detail: {
      kind,
      status: parsed.status,
      formatVersion: parsed.header.formatVersion,
      xmpPacketCount: parsed.xmpPacketCount,
    },
  })
  const documentRef = target.ownerDocument || document
  const root = element(documentRef, 'div', 'indd-viewer')
  root.dataset.indesignStatus = parsed.status
  const style = element(documentRef, 'style')
  style.textContent = inDesignStyle
  const header = element(documentRef, 'header', 'indd-header')
  const title = element(documentRef, 'div', 'indd-title')
  title.append(
    element(documentRef, 'strong', undefined, `Adobe InDesign ${kind === 'indt' ? 'template' : 'document'}`),
    element(
      documentRef,
      'span',
      undefined,
      `Format ${parsed.header.formatVersion} · ${parsed.header.streamByteOrder} · ${parsed.header.databasePages} database pages`
    )
  )
  const badge = element(documentRef, 'span', 'indd-badge', statusLabel(parsed))
  badge.dataset.status = parsed.status
  header.append(title, badge)

  const layout = element(documentRef, 'div', 'indd-layout')
  const stage = element(documentRef, 'main', 'indd-stage')
  const urlApi = documentRef.defaultView?.URL || URL
  let previewUrl: string | undefined
  let previewBlob: Blob | undefined
  if (parsed.preview) {
    const previewBuffer = parsed.preview.bytes.slice().buffer as ArrayBuffer
    previewBlob = new Blob([previewBuffer], { type: parsed.preview.mimeType })
    previewUrl = urlApi.createObjectURL(previewBlob)
    const image = element(documentRef, 'img')
    image.alt = `InDesign embedded ${parsed.preview.width} by ${parsed.preview.height} preview`
    image.src = previewUrl
    stage.appendChild(image)
    context?.registerThumbnailAdapter?.({ capture: async () => previewBlob! })
  } else {
    const empty = element(documentRef, 'div', 'indd-empty')
    empty.append(
      element(
        documentRef,
        'strong',
        undefined,
        parsed.status === 'unsupported-structure' ? 'This native structure is not safely addressable.' : 'No saved document preview is embedded.'
      ),
      element(
        documentRef,
        'span',
        undefined,
        parsed.unsupportedReason ||
          'The native INDD/INDT layout database is proprietary. This browser reader only follows declared master pages and contiguous XMP objects; it never scans arbitrary binary bytes for coincidental JPEG or PNG signatures.'
      )
    )
    stage.appendChild(empty)
  }

  const sidebar = element(documentRef, 'aside', 'indd-sidebar')
  const structure = element(documentRef, 'section', 'indd-section')
  structure.appendChild(element(documentRef, 'h3', undefined, 'Verified structure'))
  const facts = element(documentRef, 'dl', 'indd-facts')
  appendFact(documentRef, facts, 'Active master', `${parsed.header.activeMasterPage} (sequence ${parsed.header.activeSequence})`)
  appendFact(documentRef, facts, 'Database boundary', `${parsed.header.contiguousObjectOffset} bytes`)
  appendFact(documentRef, facts, 'Contiguous objects', String(parsed.contiguousObjectCount))
  appendFact(documentRef, facts, 'Verified XMP packets', String(parsed.xmpPacketCount))
  appendFact(documentRef, facts, 'XMP bytes', parsed.xmp ? String(new TextEncoder().encode(parsed.xmp).byteLength) : 'none')
  if (parsed.preview) appendFact(documentRef, facts, 'Preview raster', `${parsed.preview.width} × ${parsed.preview.height} ${parsed.preview.mimeType}`)
  structure.appendChild(facts)

  const boundary = element(documentRef, 'section', 'indd-section')
  boundary.append(
    element(documentRef, 'h3', undefined, 'Preview boundary'),
    element(
      documentRef,
      'p',
      'indd-note',
      'A preview exists only when InDesign saved a JPEG/PNG thumbnail inside a structurally verified XMP packet. Full page layout rendering still requires InDesign/IDML conversion.'
    )
  )
  sidebar.append(structure, boundary)
  if (parsed.warnings.length > 0) {
    const warnings = element(documentRef, 'section', 'indd-section')
    warnings.appendChild(element(documentRef, 'h3', undefined, 'Read notes'))
    for (const warning of parsed.warnings) warnings.appendChild(element(documentRef, 'p', 'indd-warning', warning))
    sidebar.appendChild(warnings)
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
    if (previewUrl) urlApi.revokeObjectURL(previewUrl)
    target.replaceChildren()
  }
  context?.signal?.addEventListener('abort', unmount, { once: true })
  return { $el: root, unmount }
}
