import {
  createFileViewerZoomChangeEmitter,
  registerFileViewerZoomProvider,
  resolveFileViewerIdmlWasmUrl,
  resolveFileViewerIdmlWorkerUrl,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState
} from '@file-viewer/core'
import { resolveIdmlSafetyLimits } from './idmlLimits.js'
import type { IdmlOpenResult } from './idmlProtocol.js'
import { createIdmlRenderSession } from './idmlWorkerClient.js'

const idmlStyle = `
.idml-viewer{display:grid;height:100%;min-height:460px;grid-template-rows:auto minmax(0,1fr);background:#e8ebef;color:#172033;--idml-border:rgba(15,23,42,.12);--idml-surface:#fff;--idml-muted:#64748b;--idml-accent:#b3265e;box-sizing:border-box}.idml-toolbar{position:relative;z-index:4;display:flex;min-height:54px;align-items:center;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px solid var(--idml-border);background:rgba(255,255,255,.94);backdrop-filter:blur(12px);box-sizing:border-box}.idml-title{min-width:0}.idml-title strong,.idml-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.idml-title strong{font-size:14px}.idml-title span{margin-top:3px;color:var(--idml-muted);font-size:10px;font-weight:700}.idml-actions{display:flex;flex-shrink:0;align-items:center;gap:5px}.idml-actions button{height:34px;min-width:36px;padding:0 9px;border:1px solid rgba(100,116,139,.3);border-radius:7px;background:var(--idml-surface);color:inherit;cursor:pointer;font-size:12px;font-weight:800}.idml-actions button:disabled{cursor:not-allowed;opacity:.42}.idml-actions button:focus-visible{border-color:var(--idml-accent);outline:2px solid rgba(179,38,94,.16)}.idml-actions span{min-width:48px;color:var(--idml-muted);font-size:11px;font-weight:800;text-align:center}.idml-layout{display:grid;min-height:0;grid-template-columns:230px minmax(0,1fr)}.idml-sidebar{min-height:0;overflow:auto;border-right:1px solid var(--idml-border);background:rgba(248,250,252,.92)}.idml-page-list{display:grid;gap:7px;margin:0;padding:10px;list-style:none}.idml-page-button{display:grid;width:100%;min-height:48px;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:8px;padding:6px 8px;border:1px solid transparent;border-radius:8px;background:var(--idml-surface);color:inherit;cursor:pointer;text-align:left}.idml-page-button[data-active='true']{border-color:rgba(179,38,94,.42);box-shadow:0 0 0 2px rgba(179,38,94,.08)}.idml-page-number{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:6px;background:#f2e8ee;color:var(--idml-accent);font-size:11px;font-weight:900}.idml-page-copy{min-width:0}.idml-page-copy strong,.idml-page-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.idml-page-copy strong{font-size:11px}.idml-page-copy span{margin-top:3px;color:var(--idml-muted);font-size:9px}.idml-stage{position:relative;min-width:0;min-height:0;overflow:auto;padding:28px;overscroll-behavior:contain}.idml-canvas-wrap{position:relative;display:block;transform-origin:top left}.idml-page-shell{position:absolute;top:0;left:0;display:inline-block;padding:14px;background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.18);transform-origin:top left}.idml-page-shell canvas{display:block;background:#fff}.idml-status{position:sticky;left:12px;bottom:12px;z-index:2;display:inline-flex;padding:5px 9px;border:1px solid var(--idml-border);border-radius:999px;background:rgba(255,255,255,.9);color:var(--idml-muted);font-size:10px;font-weight:800;backdrop-filter:blur(8px)}.idml-print-pages{position:fixed;left:-100000px;top:0;width:max-content}.idml-print-page{margin:0 0 16px;padding:0;background:#fff}.idml-print-page canvas{display:block}.idml-print-label{padding:5px 8px;color:#475569;font-size:10px}
[data-viewer-theme='dark'] .idml-viewer{background:#0d1117;color:#e6edf3;--idml-border:rgba(139,148,158,.24);--idml-surface:#161b22;--idml-muted:#8b949e}[data-viewer-theme='dark'] .idml-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='dark'] .idml-sidebar{background:rgba(22,27,34,.94)}[data-viewer-theme='dark'] .idml-page-number{background:#39202e}
@media(prefers-color-scheme:dark){[data-viewer-theme='system'] .idml-viewer{background:#0d1117;color:#e6edf3;--idml-border:rgba(139,148,158,.24);--idml-surface:#161b22;--idml-muted:#8b949e}[data-viewer-theme='system'] .idml-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='system'] .idml-sidebar{background:rgba(22,27,34,.94)}}
@media(max-width:760px){.idml-viewer{min-height:360px}.idml-toolbar{align-items:flex-start;padding:8px}.idml-title span{max-width:140px}.idml-actions{flex-wrap:wrap;justify-content:flex-end}.idml-actions button{height:32px;min-width:34px;padding:0 7px}.idml-layout{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.idml-sidebar{max-width:100%;border-right:0;border-bottom:1px solid var(--idml-border);overflow-x:auto;overflow-y:hidden}.idml-page-list{display:flex;width:max-content;max-width:none;padding:7px}.idml-page-button{width:150px;min-height:44px}.idml-stage{padding:14px}.idml-status{bottom:calc(12px + var(--file-viewer-mobile-overlay-bottom,0px))}}
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

const clampZoom = (value: number) => Math.min(4, Math.max(0.05, Number(value.toFixed(3))))

interface CachedPage {
  canvas: HTMLCanvasElement
  bytes: number
}

export default async function renderIdml(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('IDML rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const design = context?.options?.design
  const isChinese = (context?.options?.locale || documentRef.documentElement.lang || '')
    .toLowerCase()
    .startsWith('zh')
  const copy = isChinese
    ? {
        title: 'Adobe InDesign IDML',
        page: '页',
        frames: '个对象',
        fit: '适合窗口',
        loading: '正在渲染页面',
        ready: 'CPU WASM 页面渲染'
      }
    : {
        title: 'Adobe InDesign IDML',
        page: 'Page',
        frames: 'frames',
        fit: 'Fit',
        loading: 'Rendering page',
        ready: 'CPU WASM page render'
      }
  const limits = resolveIdmlSafetyLimits({
    maxFileBytes: design?.maxFileBytes,
    maxEntries: design?.idmlMaxEntries,
    maxTotalUncompressedBytes: design?.idmlMaxExpandedBytes,
    maxPages: design?.idmlMaxPages,
    maxFrames: design?.idmlMaxFrames,
    maxRenderedDimension: design?.maxCanvasDimension,
    maxRenderedPixels: design?.maxCanvasPixels,
    workerTimeoutMs: design?.workerTimeoutMs
  })
  const requestedDpi = Number(design?.idmlRenderDpi ?? 96)
  const dpi = Math.min(
    limits.maxDpi,
    Math.max(limits.minDpi, Number.isFinite(requestedDpi) ? requestedDpi : 96)
  )
  const maxCacheBytes = Math.min(
    limits.maxRenderWorkingSetBytes,
    Math.max(1, design?.maxLayerCacheBytes || 64 * 1024 * 1024)
  )
  const maxPrintBytes = Math.min(
    limits.maxRenderWorkingSetBytes,
    Math.max(1, design?.idmlMaxPrintBytes || design?.maxDecodedBytes || 128 * 1024 * 1024)
  )
  const session = createIdmlRenderSession({
    workerUrl: resolveFileViewerIdmlWorkerUrl(design, documentRef.baseURI),
    wasmUrl: resolveFileViewerIdmlWasmUrl(design, documentRef.baseURI),
    limits,
    workerTimeoutMs: design?.workerTimeoutMs
  })
  let opened: IdmlOpenResult
  try {
    opened = await session.open(buffer, context?.signal)
  } catch (error) {
    session.destroy()
    throw error
  }
  if (context?.signal?.aborted) {
    session.destroy()
    throw new DOMException('IDML rendering was aborted.', 'AbortError')
  }

  const style = element(documentRef, 'style')
  style.textContent = idmlStyle
  const root = element(documentRef, 'section', 'idml-viewer')
  root.dataset.idmlEngine = opened.engine
  root.dataset.idmlBackend = opened.renderBackend
  root.dataset.pageCount = String(opened.tree.pageCount)
  root.dataset.idmlPixelLimit = String(limits.maxRenderedPixels)
  root.dataset.idmlWorkingSetLimit = String(limits.maxRenderWorkingSetBytes)
  const toolbar = element(documentRef, 'header', 'idml-toolbar')
  const title = element(documentRef, 'div', 'idml-title')
  title.append(
    element(documentRef, 'strong', undefined, copy.title),
    element(
      documentRef,
      'span',
      undefined,
      `${opened.tree.pageCount} ${copy.page.toLowerCase()} · ${opened.tree.frameCount} ${copy.frames} · ${opened.engineVersion}`
    )
  )
  const actions = element(documentRef, 'div', 'idml-actions')
  const previous = element(documentRef, 'button', undefined, '‹')
  const next = element(documentRef, 'button', undefined, '›')
  const zoomOut = element(documentRef, 'button', undefined, '−')
  const zoomLabel = element(documentRef, 'span', undefined, '100%')
  const zoomIn = element(documentRef, 'button', undefined, '+')
  const fit = element(documentRef, 'button', undefined, copy.fit)
  ;[previous, next, zoomOut, zoomIn, fit].forEach((button) => {
    button.type = 'button'
  })
  previous.dataset.idmlAction = 'previous'
  next.dataset.idmlAction = 'next'
  zoomOut.dataset.idmlAction = 'zoom-out'
  zoomIn.dataset.idmlAction = 'zoom-in'
  fit.dataset.idmlAction = 'fit'
  previous.setAttribute('aria-label', 'Previous IDML page')
  next.setAttribute('aria-label', 'Next IDML page')
  actions.append(previous, next, zoomOut, zoomLabel, zoomIn, fit)
  toolbar.append(title, actions)

  const layout = element(documentRef, 'div', 'idml-layout')
  const sidebar = element(documentRef, 'nav', 'idml-sidebar')
  sidebar.setAttribute('aria-label', 'IDML pages')
  const pageList = element(documentRef, 'ol', 'idml-page-list')
  sidebar.appendChild(pageList)
  const stage = element(documentRef, 'main', 'idml-stage')
  const wrap = element(documentRef, 'div', 'idml-canvas-wrap')
  const shell = element(documentRef, 'div', 'idml-page-shell')
  let canvas = element(documentRef, 'canvas')
  const status = element(documentRef, 'span', 'idml-status', copy.loading)
  shell.appendChild(canvas)
  wrap.appendChild(shell)
  stage.append(wrap, status)
  layout.append(sidebar, stage)
  root.append(toolbar, layout)
  target.replaceChildren(style, root)

  const pages = opened.tree.spreads.flatMap((spread) => spread.pages)
  const buttons: HTMLButtonElement[] = []
  pages.forEach((page) => {
    const item = element(documentRef, 'li')
    const button = element(documentRef, 'button', 'idml-page-button')
    button.type = 'button'
    button.dataset.pageIndex = String(page.index)
    const number = element(documentRef, 'span', 'idml-page-number', String(page.index + 1))
    const text = element(documentRef, 'span', 'idml-page-copy')
    text.append(
      element(documentRef, 'strong', undefined, page.label || `${copy.page} ${page.index + 1}`),
      element(documentRef, 'span', undefined, `${page.frames.length} ${copy.frames}`)
    )
    button.append(number, text)
    item.appendChild(button)
    pageList.appendChild(item)
    buttons.push(button)
  })

  let destroyed = false
  let cleaned = false
  let currentPage = 0
  let renderRevision = 0
  let pageRenderQueue = Promise.resolve()
  let zoom = 1
  let userAdjustedZoom = false
  let cacheBytes = 0
  const cache = new Map<number, CachedPage>()
  const zoomEmitter = createFileViewerZoomChangeEmitter()
  const printContainer = element(documentRef, 'div', 'idml-print-pages')
  root.appendChild(printContainer)

  const disposePage = (entry: CachedPage) => {
    cacheBytes = Math.max(0, cacheBytes - entry.bytes)
    entry.canvas.width = 0
    entry.canvas.height = 0
  }
  const trimCache = (retainPage = currentPage) => {
    for (const [index, entry] of cache) {
      if (cacheBytes <= maxCacheBytes) break
      if (index === retainPage) continue
      cache.delete(index)
      disposePage(entry)
    }
  }
  const clearCache = () => {
    for (const entry of cache.values()) disposePage(entry)
    cache.clear()
  }
  const createCanvas = (width: number, height: number, rgba: Uint8ClampedArray) => {
    const pageCanvas = element(documentRef, 'canvas')
    pageCanvas.width = width
    pageCanvas.height = height
    const context2d = pageCanvas.getContext('2d')
    if (!context2d) throw new Error('Canvas 2D is unavailable for IDML page staging.')
    const ImageDataConstructor = documentRef.defaultView?.ImageData || ImageData
    const owned =
      rgba.buffer instanceof ArrayBuffer
        ? new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength)
        : new Uint8ClampedArray(rgba)
    context2d.putImageData(new ImageDataConstructor(owned, width, height), 0, 0)
    return pageCanvas
  }
  const getPage = async (index: number) => {
    const existing = cache.get(index)
    if (existing) {
      cache.delete(index)
      cache.set(index, existing)
      return existing
    }
    const rendered = await session.renderPage(index, dpi, context?.signal)
    if (destroyed) throw new DOMException('IDML rendering was aborted.', 'AbortError')
    const entry = {
      canvas: createCanvas(rendered.width, rendered.height, rendered.rgba),
      bytes: rendered.width * rendered.height * 4
    }
    cache.set(index, entry)
    cacheBytes += entry.bytes
    trimCache(index)
    return entry
  }
  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 4,
    canZoomOut: zoom > 0.05,
    canReset: true,
    minScale: 0.05,
    maxScale: 4
  })
  const setZoom = (value: number, source: 'user' | 'fit' = 'user') => {
    zoom = clampZoom(value)
    if (source === 'user') userAdjustedZoom = true
    shell.style.transform = `scale(${zoom})`
    wrap.style.width = `${Math.ceil((canvas.width + 28) * zoom)}px`
    wrap.style.height = `${Math.ceil((canvas.height + 28) * zoom)}px`
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`
    zoomEmitter.emit()
    return getZoomState()
  }
  const fitPage = () => {
    const width = Math.max(1, stage.clientWidth - 28 - 28)
    const height = Math.max(1, stage.clientHeight - 28 - 28)
    return setZoom(
      Math.min(1, width / Math.max(1, canvas.width), height / Math.max(1, canvas.height)),
      'fit'
    )
  }
  const drawPage = (index: number) => {
    const revision = ++renderRevision
    currentPage = index
    buttons.forEach((button, buttonIndex) => {
      button.dataset.active = String(buttonIndex === index)
      button.setAttribute('aria-current', buttonIndex === index ? 'page' : 'false')
    })
    previous.disabled = index === 0
    next.disabled = index === pages.length - 1
    status.textContent = `${copy.loading} ${index + 1}…`
    const task = pageRenderQueue
      .catch(() => undefined)
      .then(async () => {
        if (destroyed || revision !== renderRevision) return
        const page = await getPage(index)
        if (destroyed || revision !== renderRevision) return
        if (canvas !== page.canvas) {
          shell.replaceChildren(page.canvas)
          canvas = page.canvas
        }
        status.textContent = `${copy.ready} · ${index + 1}/${pages.length} · ${Math.round(dpi)} DPI`
        if (!userAdjustedZoom) fitPage()
        context?.onProgressiveRender?.()
        context?.registerThumbnailAdapter?.({ getTarget: () => canvas })
      })
    pageRenderQueue = task
    return task
  }
  const reportRenderError = (error: unknown) => {
    if (destroyed) return
    status.textContent = error instanceof Error ? error.message : String(error)
    context?.options?.onDiagnostic?.({
      code: 'idml-page-render-failed',
      level: 'error',
      message: status.textContent,
      detail: { pageIndex: currentPage }
    })
  }
  buttons.forEach((button, index) =>
    button.addEventListener('click', () => {
      void drawPage(index).catch(reportRenderError)
    })
  )
  previous.addEventListener('click', () => {
    if (currentPage > 0) void drawPage(currentPage - 1).catch(reportRenderError)
  })
  next.addEventListener('click', () => {
    if (currentPage + 1 < pages.length) void drawPage(currentPage + 1).catch(reportRenderError)
  })
  zoomOut.addEventListener('click', () => setZoom(zoom / 1.15))
  zoomIn.addEventListener('click', () => setZoom(zoom * 1.15))
  fit.addEventListener('click', () => {
    userAdjustedZoom = false
    fitPage()
  })

  const clearPrintPages = () => {
    printContainer.querySelectorAll('canvas').forEach((pageCanvas) => {
      pageCanvas.width = 0
      pageCanvas.height = 0
    })
    printContainer.replaceChildren()
  }
  const ensurePrintPages = async () => {
    clearPrintPages()
    renderRevision += 1
    await pageRenderQueue.catch(() => undefined)
    const visibleCanvas = canvas
    const visibleEntry = cache.get(currentPage)
    if (visibleEntry?.canvas === visibleCanvas) {
      cache.delete(currentPage)
      cacheBytes = Math.max(0, cacheBytes - visibleEntry.bytes)
    }
    clearCache()
    let total = 0
    const visibleBytes = visibleCanvas.width * visibleCanvas.height * 4
    for (const [index, page] of pages.entries()) {
      const cached = await getPage(index)
      const projectedWorkingSet = visibleBytes + cacheBytes + total + cached.bytes * 2
      if (projectedWorkingSet > maxPrintBytes) {
        clearPrintPages()
        clearCache()
        throw new Error(
          `IDML print working set exceeds the ${maxPrintBytes}-byte decoded safety limit.`
        )
      }
      const printPage = element(documentRef, 'section', 'idml-print-page')
      printPage.dataset.viewerPrintPageIndex = String(index)
      const printCanvas = element(documentRef, 'canvas')
      printCanvas.width = cached.canvas.width
      printCanvas.height = cached.canvas.height
      printCanvas.getContext('2d')?.drawImage(cached.canvas, 0, 0)
      printPage.append(
        printCanvas,
        element(documentRef, 'div', 'idml-print-label', page.label || `${copy.page} ${index + 1}`)
      )
      printContainer.appendChild(printPage)
      total += cached.bytes
      cache.delete(index)
      disposePage(cached)
    }
  }
  context?.registerExportAdapter?.({
    print: true,
    exportHtml: false,
    includeDocumentStyles: false,
    beforeSnapshot: ensurePrintPages,
    getPrintMaskPages: () =>
      Array.from(printContainer.querySelectorAll<HTMLElement>('.idml-print-page')),
    printStyle: `${idmlStyle}\n.viewer-export-content .idml-toolbar,.viewer-export-content .idml-layout{display:none!important}.viewer-export-content .idml-print-pages{position:static!important;left:auto!important;top:auto!important;width:auto!important}.viewer-export-content .idml-print-page{break-after:page;page-break-after:always}.viewer-export-content .idml-print-page:last-child{break-after:auto;page-break-after:auto}`
  })
  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom * 1.15),
    zoomOut: () => setZoom(zoom / 1.15),
    resetZoom: fitPage,
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })
  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => {
          if (!destroyed && !userAdjustedZoom && canvas.width) fitPage()
        })
  resizeObserver?.observe(stage)
  const abort = () => {
    destroyed = true
    renderRevision += 1
    session.abort(context?.signal?.reason)
  }
  context?.signal?.addEventListener('abort', abort, { once: true })
  try {
    await drawPage(0)
  } catch (error) {
    resizeObserver?.disconnect()
    context?.signal?.removeEventListener('abort', abort)
    context?.registerExportAdapter?.(null)
    context?.registerThumbnailAdapter?.(null)
    unregisterFileViewerZoomProvider(root)
    session.destroy()
    target.replaceChildren()
    throw error
  }

  return {
    $el: root,
    unmount() {
      if (cleaned) return
      cleaned = true
      destroyed = true
      renderRevision += 1
      resizeObserver?.disconnect()
      context?.signal?.removeEventListener('abort', abort)
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      unregisterFileViewerZoomProvider(root)
      clearPrintPages()
      clearCache()
      canvas.width = 0
      canvas.height = 0
      session.destroy()
      target.replaceChildren()
    }
  }
}
