import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { readXdContainerInWorker } from './adobeContainerWorkerClient.js'
import type { XdContainerLimits } from './xdContainer.js'

const xdStyle = `
.xd-viewer{display:grid;height:100%;min-height:440px;grid-template-rows:auto minmax(0,1fr);background:#eef2f7;color:#152033;font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}
.xd-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border-bottom:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.94)}.xd-header strong{display:block;font-size:14px}.xd-header span{display:block;margin-top:2px;color:#64748b;font-size:11px}
.xd-badge{flex:0 0 auto;padding:5px 9px;border-radius:999px;background:#5b21b6;color:#fff;font-size:10px;font-weight:800;letter-spacing:.04em}
.xd-layout{display:grid;min-height:0;grid-template-columns:minmax(0,1fr) 310px}.xd-stage{display:flex;min-width:0;min-height:0;align-items:center;justify-content:center;overflow:auto;padding:26px;background:linear-gradient(135deg,#eef2ff,#f8fafc 48%,#fdf2f8)}
.xd-stage img{display:block;max-width:100%;max-height:100%;object-fit:contain;border:1px solid rgba(15,23,42,.12);border-radius:10px;background:#fff;box-shadow:0 22px 60px rgba(30,41,59,.18)}.xd-empty{max-width:560px;padding:24px;border:1px dashed rgba(100,116,139,.45);border-radius:12px;background:rgba(255,255,255,.72);color:#475569;text-align:center}
.xd-sidebar{min-height:0;overflow:auto;border-left:1px solid rgba(15,23,42,.1);background:rgba(255,255,255,.9)}.xd-section{padding:14px;border-bottom:1px solid rgba(15,23,42,.08)}.xd-section h3{margin:0 0 9px;font-size:12px}.xd-list{display:grid;gap:7px;margin:0;padding:0;list-style:none}.xd-item{padding:8px 9px;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:#fff}.xd-item strong,.xd-item span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xd-item strong{font-size:11px}.xd-item span{margin-top:2px;color:#64748b;font-size:10px}.xd-warning{margin:0 0 7px;color:#92400e;font-size:10px}.xd-muted{color:#64748b;font-size:11px}
[data-viewer-theme='dark'] .xd-viewer{background:#0d1117;color:#e6edf3}[data-viewer-theme='dark'] .xd-header,[data-viewer-theme='dark'] .xd-sidebar{background:rgba(22,27,34,.94);border-color:rgba(139,148,158,.22)}[data-viewer-theme='dark'] .xd-stage{background:linear-gradient(135deg,#111827,#0d1117 55%,#1f1525)}[data-viewer-theme='dark'] .xd-item,[data-viewer-theme='dark'] .xd-empty{background:#161b22;border-color:rgba(139,148,158,.25);color:#c9d1d9}
@media(max-width:760px){.xd-viewer{min-height:360px}.xd-layout{grid-template-columns:1fr;grid-template-rows:minmax(260px,1fr) auto}.xd-sidebar{max-height:220px;border-top:1px solid rgba(15,23,42,.1);border-left:0}.xd-stage{padding:12px}}
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

export default async function renderAdobeXd(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type = 'xd',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('Adobe XD rendering was aborted.', 'AbortError')
  const limits: Partial<XdContainerLimits> | undefined = context?.options?.design
    ? {
        maxFileBytes: context.options.design.maxFileBytes,
        ...context.options.design.xd,
      }
    : undefined
  const parsed = await readXdContainerInWorker(
    buffer,
    limits,
    context?.options?.design,
    context?.signal
  )
  if (context?.signal?.aborted) throw new DOMException('Adobe XD rendering was aborted.', 'AbortError')
  context?.options?.onDiagnostic?.({
    code: parsed.preview ? 'xd-embedded-preview' : 'xd-structure-only',
    level: 'info',
    message: parsed.preview
      ? 'Adobe XD is showing a saved embedded raster preview; native AGC vector reconstruction is not claimed.'
      : 'Adobe XD has no valid embedded raster preview; only bounded package structure is available.',
    detail: {
      entryCount: parsed.entryCount,
      artboardCount: parsed.artboards.length,
      structureFileCount: parsed.structureFiles.length,
      previewPath: parsed.preview?.path,
    },
  })
  const documentRef = target.ownerDocument || document
  const root = element(documentRef, 'div', 'xd-viewer')
  root.dataset.xdPreview = parsed.preview ? 'embedded-raster' : 'structure-only'
  const style = element(documentRef, 'style')
  style.textContent = xdStyle
  const header = element(documentRef, 'header', 'xd-header')
  const heading = element(documentRef, 'div')
  heading.append(
    element(documentRef, 'strong', undefined, parsed.name),
    element(
      documentRef,
      'span',
      undefined,
      `${parsed.entryCount} entries · ${formatBytes(parsed.expandedBytes)} expanded · manifest ${parsed.manifestVersion}`
    )
  )
  header.append(heading, element(documentRef, 'span', 'xd-badge', parsed.preview ? 'EMBEDDED PREVIEW' : 'STRUCTURE ONLY'))

  const layout = element(documentRef, 'div', 'xd-layout')
  const stage = element(documentRef, 'main', 'xd-stage')
  let previewUrl: string | undefined
  let previewBlob: Blob | undefined
  const urlApi = documentRef.defaultView?.URL || URL
  if (parsed.preview) {
    const previewBuffer = parsed.preview.bytes.slice().buffer as ArrayBuffer
    previewBlob = new Blob([previewBuffer], { type: parsed.preview.mimeType })
    previewUrl = urlApi.createObjectURL(previewBlob)
    const image = element(documentRef, 'img')
    image.alt = `${parsed.name} embedded preview`
    image.src = previewUrl
    image.dataset.previewPath = parsed.preview.path
    stage.appendChild(image)
    context?.registerThumbnailAdapter?.({ capture: async () => previewBlob! })
  } else {
    stage.appendChild(
      element(
        documentRef,
        'div',
        'xd-empty',
        'This XD package has no valid bounded PNG/JPEG rendition. Its manifest, artboard structure, and resource inventory are still available.'
      )
    )
  }

  const sidebar = element(documentRef, 'aside', 'xd-sidebar')
  const artboardSection = element(documentRef, 'section', 'xd-section')
  artboardSection.appendChild(element(documentRef, 'h3', undefined, `Artboards (${parsed.artboards.length})`))
  if (parsed.artboards.length === 0) {
    artboardSection.appendChild(element(documentRef, 'div', 'xd-muted', 'No artboard metadata was present in the bounded AGC structure.'))
  } else {
    const list = element(documentRef, 'ul', 'xd-list')
    for (const artboard of parsed.artboards) {
      const item = element(documentRef, 'li', 'xd-item')
      const dimensions = artboard.width && artboard.height ? `${artboard.width} × ${artboard.height}` : 'size not declared'
      item.append(
        element(documentRef, 'strong', undefined, artboard.name),
        element(documentRef, 'span', undefined, `${dimensions}${artboard.nodeCount === undefined ? '' : ` · ${artboard.nodeCount} nodes`}`)
      )
      list.appendChild(item)
    }
    artboardSection.appendChild(list)
  }

  const resourceSection = element(documentRef, 'section', 'xd-section')
  resourceSection.appendChild(element(documentRef, 'h3', undefined, `Resources (${parsed.resources.length})`))
  if (parsed.resources.length === 0) {
    resourceSection.appendChild(element(documentRef, 'div', 'xd-muted', 'No additional packaged resources.'))
  } else {
    const list = element(documentRef, 'ul', 'xd-list')
    for (const resource of parsed.resources) {
      const item = element(documentRef, 'li', 'xd-item')
      item.append(
        element(documentRef, 'strong', undefined, resource.path),
        element(documentRef, 'span', undefined, `${resource.kind} · ${formatBytes(resource.byteLength)}`)
      )
      list.appendChild(item)
    }
    resourceSection.appendChild(list)
  }

  if (parsed.warnings.length > 0) {
    const warningSection = element(documentRef, 'section', 'xd-section')
    warningSection.appendChild(element(documentRef, 'h3', undefined, 'Read limits'))
    for (const warning of parsed.warnings) warningSection.appendChild(element(documentRef, 'p', 'xd-warning', warning))
    sidebar.append(artboardSection, resourceSection, warningSection)
  } else {
    sidebar.append(artboardSection, resourceSection)
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
