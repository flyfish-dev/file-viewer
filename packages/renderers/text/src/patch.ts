import {
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  decodeFileViewerTextBuffer,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState
} from '@file-viewer/core'
import { getFileViewerDiffToHtml } from './optionalCapabilities.js'
import { sanitizeFileViewerRichHtml } from './sanitizeHtml.js'

const patchStyle = `
.patch-viewer{min-height:100%;--patch-bg:#f6f8fa;--patch-surface:#fff;--patch-border:rgba(31,35,40,.12);--patch-text:#24292f;--patch-muted:#57606a;--patch-add:#dafbe1;--patch-del:#ffebe9;--patch-info:#ddf4ff;--patch-font-size:13px;background:var(--patch-bg);color:var(--patch-text);box-sizing:border-box}
.patch-toolbar{position:sticky;top:0;z-index:2;display:flex;height:46px;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;border-bottom:1px solid var(--patch-border);background:rgba(255,255,255,.92);backdrop-filter:blur(12px);box-sizing:border-box}
.patch-toolbar span,.patch-toolbar strong{color:var(--patch-muted);font-size:12px;font-weight:800;letter-spacing:0}
.patch-body{padding:16px;overflow:auto;font-size:var(--patch-font-size)}
.patch-body .d2h-wrapper{min-width:860px}
.patch-body .d2h-file-wrapper{margin:0 0 16px;overflow:hidden;border:1px solid var(--patch-border);border-radius:8px;background:var(--patch-surface)}
.patch-body .d2h-file-header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--patch-border);background:#f8fafc;color:var(--patch-muted);font-weight:800}
.patch-body .d2h-file-name-wrapper{display:flex;min-width:0;align-items:center;gap:8px}
.patch-body .d2h-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.patch-body .d2h-diff-table{width:100%;border-collapse:collapse;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:1em;line-height:1.58}
.patch-body .d2h-code-side-linenumber,.patch-body .d2h-code-linenumber{width:56px;padding:0 8px;border-right:1px solid var(--patch-border);color:var(--patch-muted);text-align:right;user-select:none}
.patch-body .d2h-code-side-line,.patch-body .d2h-code-line{padding:0 10px;white-space:pre-wrap;word-break:break-word}
.patch-body .d2h-ins{background:var(--patch-add)}
.patch-body .d2h-del{background:var(--patch-del)}
.patch-body .d2h-info{background:var(--patch-info);color:var(--patch-muted)}
.patch-body .d2h-file-list-wrapper{margin:0 0 16px;border:1px solid var(--patch-border);border-radius:8px;background:var(--patch-surface)}
.patch-body .d2h-file-list-header{padding:10px 12px;border-bottom:1px solid var(--patch-border);color:var(--patch-muted);font-weight:800}
.patch-body .d2h-file-list{margin:0;padding:8px 12px;list-style:none}
.patch-body .d2h-file-list-line{display:flex;gap:8px;padding:4px 0;color:var(--patch-text);font-size:.95em}
.patch-fallback{margin:0;padding:18px 20px;overflow:auto;border-radius:8px;background:#0d1117;color:#e6edf3;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:var(--patch-font-size);line-height:1.7;white-space:pre}
[data-viewer-theme='dark'] .patch-viewer{--patch-bg:#0d1117;--patch-surface:#161b22;--patch-border:rgba(139,148,158,.24);--patch-text:#e6edf3;--patch-muted:#8b949e;--patch-add:rgba(46,160,67,.26);--patch-del:rgba(248,81,73,.24);--patch-info:rgba(56,139,253,.18)}
[data-viewer-theme='dark'] .patch-toolbar{background:rgba(13,17,23,.92)}
[data-viewer-theme='dark'] .patch-body .d2h-file-header{background:#161b22}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .patch-viewer{--patch-bg:#0d1117;--patch-surface:#161b22;--patch-border:rgba(139,148,158,.24);--patch-text:#e6edf3;--patch-muted:#8b949e;--patch-add:rgba(46,160,67,.26);--patch-del:rgba(248,81,73,.24);--patch-info:rgba(56,139,253,.18)}[data-viewer-theme='system'] .patch-toolbar{background:rgba(13,17,23,.92)}[data-viewer-theme='system'] .patch-body .d2h-file-header{background:#161b22}}
`

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: TagName,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName)
  if (className) {
    element.className = className
  }
  if (typeof text === 'string') {
    element.textContent = text
  }
  return element
}

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style')
  style.textContent = patchStyle
  return style
}

const clampZoom = (value: number) => {
  return Math.min(2.4, Math.max(0.6, Number(value.toFixed(2))))
}

const countFiles = (text: string) => {
  const matches = text.match(/^diff --git\s+/gm)
  if (matches?.length) {
    return matches.length
  }
  return text.match(/^---\s+/gm)?.length || 1
}

export default async function renderPatch(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'patch',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument || document
  const text = decodeFileViewerTextBuffer(buffer, context?.options?.text?.encoding).text
  let zoom = 1
  const zoomEmitter = createZoomChangeEmitter()

  const root = createElement(documentRef, 'div', 'patch-viewer')
  root.dataset.viewerZoomProvider = 'patch'
  const toolbar = createElement(documentRef, 'div', 'patch-toolbar')
  toolbar.append(
    createElement(documentRef, 'span', undefined, type.toUpperCase()),
    createElement(documentRef, 'strong', undefined, `${countFiles(text)} files · side-by-side`)
  )
  const body = createElement(documentRef, 'div', 'patch-body')

  try {
    const diffToHtml = getFileViewerDiffToHtml()
    if (!diffToHtml) {
      throw new Error('Patch side-by-side rendering is opt-in. Run `npx file-viewer-cli add text-tools --write`, then `npx file-viewer-cli install --yes`.')
    }
    const rendered = diffToHtml(text, {
      drawFileList: true,
      matching: 'lines',
      outputFormat: 'side-by-side',
      renderNothingWhenEmpty: false
    })
    body.replaceChildren(sanitizeFileViewerRichHtml(documentRef, rendered, { allowSvg: true }))
  } catch {
    const fallback = createElement(documentRef, 'pre', 'patch-fallback')
    fallback.textContent = text
    body.replaceChildren(fallback)
  }

  root.append(toolbar, body)
  root.style.setProperty('--patch-font-size', `${13 * zoom}px`)
  target.replaceChildren(createStyle(documentRef), root)

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 2.4,
    canZoomOut: zoom > 0.6,
    canReset: zoom !== 1,
    minScale: 0.6,
    maxScale: 2.4
  })

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale)
    root.style.setProperty('--patch-font-size', `${13 * zoom}px`)
    zoomEmitter.emit()
    return getZoomState()
  }

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })

  return {
    $el: root,
    unmount() {
      unregisterFileViewerZoomProvider(root)
      target.replaceChildren()
    }
  }
}
