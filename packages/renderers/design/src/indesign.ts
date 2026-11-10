import { createFileViewerTranslator } from '@file-viewer/core';
import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { readInDesignContainerInWorker } from './adobeContainerWorkerClient.js'
import {
  type InDesignContainerLimits,
} from './indesignContainer.js'

const inDesignStyle = `
.indd-viewer{display:grid;height:100%;min-height:430px;grid-template-rows:auto minmax(0,1fr);background:#f1f3f6;color:#172033;font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}.indd-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-bottom:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.94)}.indd-title strong,.indd-title span{display:block}.indd-title strong{font-size:14px}.indd-title span{margin-top:2px;color:#64748b;font-size:11px}.indd-badge{flex:0 0 auto;padding:5px 9px;border-radius:999px;background:#c026d3;color:#fff;font-size:10px;font-weight:800;letter-spacing:.04em}.indd-badge[data-status='structure-only'],.indd-badge[data-status='unsupported-structure']{background:#475569}.indd-layout{display:grid;min-height:0;grid-template-columns:minmax(0,1fr) 330px}.indd-stage{display:flex;min-width:0;min-height:0;align-items:center;justify-content:center;overflow:auto;padding:26px;background:linear-gradient(145deg,#fdf4ff,#f8fafc 55%,#eef2ff)}.indd-stage img{display:block;max-width:100%;max-height:100%;object-fit:contain;border:1px solid rgba(15,23,42,.14);border-radius:8px;background:#fff;box-shadow:0 20px 58px rgba(30,41,59,.18)}.indd-empty{max-width:620px;padding:24px;border:1px dashed rgba(100,116,139,.45);border-radius:12px;background:rgba(255,255,255,.76);color:#475569}.indd-empty strong{display:block;margin-bottom:7px;color:#1e293b}.indd-sidebar{min-height:0;overflow:auto;border-left:1px solid rgba(15,23,42,.1);background:rgba(255,255,255,.92)}.indd-section{padding:14px;border-bottom:1px solid rgba(15,23,42,.08)}.indd-section h3{margin:0 0 10px;font-size:12px}.indd-facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;margin:0}.indd-facts dt{color:#64748b;font-size:10px}.indd-facts dd{min-width:0;margin:0;overflow-wrap:anywhere;font-size:11px;font-weight:700}.indd-warning{margin:0 0 7px;color:#92400e;font-size:10px}.indd-note{margin:0;color:#64748b;font-size:10px}
[data-viewer-theme='dark'] .indd-viewer{background:#0d1117;color:#e6edf3}[data-viewer-theme='dark'] .indd-header,[data-viewer-theme='dark'] .indd-sidebar{background:rgba(22,27,34,.94);border-color:rgba(139,148,158,.22)}[data-viewer-theme='dark'] .indd-stage{background:linear-gradient(145deg,#221225,#0d1117 55%,#111827)}[data-viewer-theme='dark'] .indd-empty{background:#161b22;border-color:rgba(139,148,158,.25);color:#c9d1d9}[data-viewer-theme='dark'] .indd-empty strong{color:#e6edf3}
@media(max-width:760px){.indd-viewer{min-height:360px}.indd-layout{grid-template-columns:1fr;grid-template-rows:minmax(260px,1fr) auto}.indd-sidebar{max-height:230px;border-top:1px solid rgba(15,23,42,.1);border-left:0}.indd-stage{padding:12px}}
`





export default async function renderAdobeInDesign(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'indd',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.i18n || context?.options)
  const element = t.element
  const appendFact = (documentRef: Document, list: HTMLDListElement, label: string | (() => string), value: string | (() => string)) => {
  list.append(element(documentRef, 'dt', undefined, label), element(documentRef, 'dd', undefined, value))
}

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
    element(documentRef, 'strong', undefined, () => t('design.ui.adobe.indesign.c33112', { p0: kind === 'indt' ? 'template' : 'document' })),
    element(
      documentRef,
      'span',
      undefined,
      () => t('design.ui.format.database.pages.5a4511', { p0: parsed.header.formatVersion, p1: parsed.header.streamByteOrder, p2: parsed.header.databasePages })
    )
  )
  const badge = element(documentRef, 'span', 'indd-badge', () => t(`design.status.${parsed.status}`))
  badge.dataset.status = parsed.status
  header.append(title, badge)

  const layout = element(documentRef, 'div', 'indd-layout')
  const stage = element(documentRef, 'main', 'indd-stage')
  const urlApi = documentRef.defaultView?.URL || URL
  let previewUrl: string | undefined
  let previewBlob: Blob | undefined
  if (parsed.preview) {
    const savedPreview = parsed.preview
    const previewBuffer = parsed.preview.bytes.slice().buffer as ArrayBuffer
    previewBlob = new Blob([previewBuffer], { type: parsed.preview.mimeType })
    previewUrl = urlApi.createObjectURL(previewBlob)
    const image = element(documentRef, 'img')
    t.bind(image, node => { node.alt = t('design.ui.indesign.embedded.by.preview.87f77a', { p0: savedPreview.width, p1: savedPreview.height }); }, 'alt')
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
        () => parsed.status === 'unsupported-structure' ? t('design.ui.this.native.structure.is.not.safely.d55fbd') : t('design.ui.no.saved.document.preview.is.embedded.50f51e')
      ),
      element(
        documentRef,
        'span',
        undefined,
        () => parsed.unsupportedReason || t('design.ui.the.native.indd.indt.layout.database.c5380b')
      )
    )
    stage.appendChild(empty)
  }

  const sidebar = element(documentRef, 'aside', 'indd-sidebar')
  const structure = element(documentRef, 'section', 'indd-section')
  structure.appendChild(element(documentRef, 'h3', undefined, () => t('design.ui.verified.structure.1a23e4')))
  const facts = element(documentRef, 'dl', 'indd-facts')
  appendFact(documentRef, facts, () => t('design.ui.active.master.292374'), () => t('design.ui.sequence.ecfa60', { p0: parsed.header.activeMasterPage, p1: parsed.header.activeSequence }))
  appendFact(documentRef, facts, () => t('design.ui.database.boundary.f40789'), () => t('design.ui.bytes.dda44a', { p0: parsed.header.contiguousObjectOffset }))
  appendFact(documentRef, facts, () => t('design.ui.contiguous.objects.b753e5'), String(parsed.contiguousObjectCount))
  appendFact(documentRef, facts, () => t('design.ui.verified.xmp.packets.7a2b4a'), String(parsed.xmpPacketCount))
  appendFact(documentRef, facts, () => t('design.ui.xmp.bytes.89338f'), () => parsed.xmp ? String(new TextEncoder().encode(parsed.xmp).byteLength) : t('design.ui.none.71f8e7'))
  if (parsed.preview) appendFact(documentRef, facts, () => t('design.ui.preview.raster.1b4dda'), `${parsed.preview.width} × ${parsed.preview.height} ${parsed.preview.mimeType}`)
  structure.appendChild(facts)

  const boundary = element(documentRef, 'section', 'indd-section')
  boundary.append(
    element(documentRef, 'h3', undefined, () => t('design.ui.preview.boundary.8378f0')),
    element(
      documentRef,
      'p',
      'indd-note',
      () => t('design.ui.a.preview.exists.only.when.indesign.28cc31')
    )
  )
  sidebar.append(structure, boundary)
  if (parsed.warnings.length > 0) {
    const warnings = element(documentRef, 'section', 'indd-section')
    warnings.appendChild(element(documentRef, 'h3', undefined, () => t('design.ui.read.notes.fc2bee')))
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
