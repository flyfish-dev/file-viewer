import {
  createFileViewerZoomChangeEmitter,
  registerFileViewerZoomProvider,
  resolveFileViewerPostscriptWasmUrl,
  resolveFileViewerPostscriptWorkerUrl,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState,
} from '@file-viewer/core'
import { resolvePostscriptSafetyLimits } from './postscriptLimits.js'
import type { PostscriptOpenResult } from './postscriptProtocol.js'
import { createPostscriptRenderSession } from './postscriptWorkerClient.js'

const postscriptStyle = `
.postscript-viewer{display:grid;height:100%;min-height:460px;grid-template-rows:auto minmax(0,1fr);background:#e8ebef;color:#172033;--ps-border:rgba(15,23,42,.13);--ps-surface:#fff;--ps-muted:#64748b;--ps-accent:#e34b32;box-sizing:border-box}.postscript-toolbar{position:relative;z-index:4;display:flex;min-height:54px;align-items:center;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px solid var(--ps-border);background:rgba(255,255,255,.94);backdrop-filter:blur(12px);box-sizing:border-box}.postscript-title{min-width:0}.postscript-title strong,.postscript-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.postscript-title strong{font-size:14px}.postscript-title span{margin-top:3px;color:var(--ps-muted);font-size:10px;font-weight:700}.postscript-actions{display:flex;flex-shrink:0;align-items:center;gap:5px}.postscript-actions button{height:34px;min-width:36px;padding:0 9px;border:1px solid rgba(100,116,139,.3);border-radius:7px;background:var(--ps-surface);color:inherit;cursor:pointer;font-size:12px;font-weight:800}.postscript-actions button:disabled{cursor:not-allowed;opacity:.42}.postscript-actions button:focus-visible{border-color:var(--ps-accent);outline:2px solid rgba(227,75,50,.18)}.postscript-actions span{min-width:48px;color:var(--ps-muted);font-size:11px;font-weight:800;text-align:center}.postscript-layout{display:grid;min-height:0;grid-template-columns:210px minmax(0,1fr)}.postscript-sidebar{min-height:0;overflow:auto;border-right:1px solid var(--ps-border);background:rgba(248,250,252,.92)}.postscript-page-list{display:grid;gap:7px;margin:0;padding:10px;list-style:none}.postscript-page-button{display:grid;width:100%;min-height:48px;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:8px;padding:6px 8px;border:1px solid transparent;border-radius:8px;background:var(--ps-surface);color:inherit;cursor:pointer;text-align:left}.postscript-page-button[data-active='true']{border-color:rgba(227,75,50,.44);box-shadow:0 0 0 2px rgba(227,75,50,.08)}.postscript-page-number{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:6px;background:#fff0ed;color:var(--ps-accent);font-size:11px;font-weight:900}.postscript-page-copy{min-width:0}.postscript-page-copy strong,.postscript-page-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.postscript-page-copy strong{font-size:11px}.postscript-page-copy span{margin-top:3px;color:var(--ps-muted);font-size:9px}.postscript-stage{position:relative;min-width:0;min-height:0;overflow:auto;padding:28px;overscroll-behavior:contain}.postscript-canvas-wrap{position:relative;display:block;transform-origin:top left}.postscript-page-shell{position:absolute;top:0;left:0;display:inline-block;padding:14px;background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.18);transform-origin:top left}.postscript-page-shell canvas{display:block;background:#fff}.postscript-status{position:sticky;left:12px;bottom:12px;z-index:2;display:inline-flex;max-width:calc(100% - 24px);padding:5px 9px;border:1px solid var(--ps-border);border-radius:999px;background:rgba(255,255,255,.92);color:var(--ps-muted);font-size:10px;font-weight:800;backdrop-filter:blur(8px)}.postscript-print-pages{position:fixed;left:-100000px;top:0;width:max-content}.postscript-print-page{margin:0 0 16px;background:#fff}.postscript-print-page canvas{display:block}
[data-viewer-theme='dark'] .postscript-viewer{background:#0d1117;color:#e6edf3;--ps-border:rgba(139,148,158,.24);--ps-surface:#161b22;--ps-muted:#8b949e}[data-viewer-theme='dark'] .postscript-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='dark'] .postscript-sidebar{background:rgba(22,27,34,.94)}[data-viewer-theme='dark'] .postscript-page-number{background:#40231f}
@media(prefers-color-scheme:dark){[data-viewer-theme='system'] .postscript-viewer{background:#0d1117;color:#e6edf3;--ps-border:rgba(139,148,158,.24);--ps-surface:#161b22;--ps-muted:#8b949e}[data-viewer-theme='system'] .postscript-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='system'] .postscript-sidebar{background:rgba(22,27,34,.94)}}
@media(max-width:760px){.postscript-viewer{min-height:360px}.postscript-toolbar{align-items:flex-start;padding:8px}.postscript-title span{max-width:148px}.postscript-actions{flex-wrap:wrap;justify-content:flex-end}.postscript-actions button{height:32px;min-width:34px;padding:0 7px}.postscript-layout{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.postscript-sidebar{max-width:100%;border-right:0;border-bottom:1px solid var(--ps-border);overflow-x:auto;overflow-y:hidden}.postscript-page-list{display:flex;width:max-content;max-width:none;padding:7px}.postscript-page-button{width:145px;min-height:44px}.postscript-stage{padding:14px}.postscript-status{bottom:calc(12px + var(--file-viewer-mobile-overlay-bottom,0px))}}
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
  dpi: number
}

export default async function renderPostscript(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'eps',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('PostScript rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const design = context?.options?.design
  const limits = resolvePostscriptSafetyLimits({
    maxFileBytes: design?.maxFileBytes,
    maxPages: design?.postscriptMaxPages,
    maxSourceDimension: design?.postscriptMaxSourceDimension,
    maxCanvasDimension: design?.maxCanvasDimension,
    maxRenderedPixels: design?.maxCanvasPixels,
    maxVmBytes: design?.postscriptMaxVmBytes,
    workerTimeoutMs: design?.workerTimeoutMs,
  })
  const requestedDpi = Number(design?.postscriptRenderDpi ?? 96)
  const baseDpi = Math.min(
    limits.maxDpi,
    Math.max(limits.minDpi, Number.isFinite(requestedDpi) ? requestedDpi : 96)
  )
  const cacheLimit = Math.max(1, design?.maxLayerCacheBytes || 64 * 1024 * 1024)
  const printLimit = Math.max(1, design?.postscriptMaxPrintBytes || design?.maxDecodedBytes || 128 * 1024 * 1024)
  const session = createPostscriptRenderSession({
    workerUrl: resolveFileViewerPostscriptWorkerUrl(design, documentRef.baseURI),
    wasmUrl: resolveFileViewerPostscriptWasmUrl(design, documentRef.baseURI),
    limits,
  })
  let opened: PostscriptOpenResult
  try {
    opened = await session.open(
      buffer,
      context?.filename || `postscript.${type.toLowerCase()}`,
      context?.signal
    )
  } catch (error) {
    session.destroy()
    throw error
  }
  if (context?.signal?.aborted) {
    session.destroy()
    throw new DOMException('PostScript rendering was aborted.', 'AbortError')
  }

  const chinese = (context?.options?.locale || documentRef.documentElement.lang || '')
    .toLowerCase()
    .startsWith('zh')
  const copy = chinese
    ? {
        title: type.toLowerCase() === 'eps' ? 'Adobe EPS' : 'Adobe PostScript',
        page: '页',
        fit: '适合窗口',
        loading: '正在格式化页面',
        ready: 'Stet CPU WASM · OFL 替代字体 · PLRM CMYK',
      }
    : {
        title: type.toLowerCase() === 'eps' ? 'Adobe EPS' : 'Adobe PostScript',
        page: 'Page',
        fit: 'Fit',
        loading: 'Rasterizing page',
        ready: 'Stet CPU WASM · OFL substitute fonts · PLRM CMYK',
      }

  const style = element(documentRef, 'style')
  style.textContent = postscriptStyle
  const root = element(documentRef, 'section', 'postscript-viewer')
  root.dataset.postscriptEngine = opened.engine
  root.dataset.postscriptBackend = opened.renderBackend
  root.dataset.pageCount = String(opened.pages.length)
  root.dataset.colorFallback = opened.colorFallback
  const toolbar = element(documentRef, 'header', 'postscript-toolbar')
  const title = element(documentRef, 'div', 'postscript-title')
  title.append(
    element(documentRef, 'strong', undefined, copy.title),
    element(
      documentRef,
      'span',
      undefined,
      `${opened.pages.length} ${copy.page.toLowerCase()} · ${opened.engineVersion}`
    )
  )
  const actions = element(documentRef, 'div', 'postscript-actions')
  const previous = element(documentRef, 'button', undefined, '‹')
  const next = element(documentRef, 'button', undefined, '›')
  const zoomOut = element(documentRef, 'button', undefined, '−')
  const zoomLabel = element(documentRef, 'span', undefined, '100%')
  const zoomIn = element(documentRef, 'button', undefined, '+')
  const fit = element(documentRef, 'button', undefined, copy.fit)
  ;[previous, next, zoomOut, zoomIn, fit].forEach(button => {
    button.type = 'button'
  })
  previous.dataset.postscriptAction = 'previous'
  next.dataset.postscriptAction = 'next'
  zoomOut.dataset.postscriptAction = 'zoom-out'
  zoomIn.dataset.postscriptAction = 'zoom-in'
  fit.dataset.postscriptAction = 'fit'
  actions.append(previous, next, zoomOut, zoomLabel, zoomIn, fit)
  toolbar.append(title, actions)

  const layout = element(documentRef, 'div', 'postscript-layout')
  const sidebar = element(documentRef, 'nav', 'postscript-sidebar')
  sidebar.setAttribute('aria-label', 'PostScript pages')
  const pageList = element(documentRef, 'ol', 'postscript-page-list')
  sidebar.appendChild(pageList)
  const stage = element(documentRef, 'main', 'postscript-stage')
  const wrap = element(documentRef, 'div', 'postscript-canvas-wrap')
  const shell = element(documentRef, 'div', 'postscript-page-shell')
  const canvas = element(documentRef, 'canvas')
  const status = element(documentRef, 'span', 'postscript-status', copy.loading)
  shell.appendChild(canvas)
  wrap.appendChild(shell)
  stage.append(wrap, status)
  layout.append(sidebar, stage)
  const printContainer = element(documentRef, 'div', 'postscript-print-pages')
  root.append(toolbar, layout, printContainer)
  target.replaceChildren(style, root)

  const buttons: HTMLButtonElement[] = []
  opened.pages.forEach(page => {
    const item = element(documentRef, 'li')
    const button = element(documentRef, 'button', 'postscript-page-button')
    button.type = 'button'
    button.dataset.pageIndex = String(page.index)
    const number = element(documentRef, 'span', 'postscript-page-number', String(page.index + 1))
    const text = element(documentRef, 'span', 'postscript-page-copy')
    text.append(
      element(documentRef, 'strong', undefined, `${copy.page} ${page.index + 1}`),
      element(documentRef, 'span', undefined, `${Math.round(page.width)}×${Math.round(page.height)} @ ${Math.round(page.referenceDpi)} DPI`)
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
  let currentRasterDpi = baseDpi
  let cacheBytes = 0
  let rerenderTimer: ReturnType<typeof setTimeout> | undefined
  const cache = new Map<string, CachedPage>()
  const zoomEmitter = createFileViewerZoomChangeEmitter()

  const disposePage = (entry: CachedPage) => {
    cacheBytes = Math.max(0, cacheBytes - entry.bytes)
    entry.canvas.width = 0
    entry.canvas.height = 0
  }
  const trimCache = (retainKey: string) => {
    for (const [key, entry] of cache) {
      if (cacheBytes <= cacheLimit) break
      if (key === retainKey) continue
      cache.delete(key)
      disposePage(entry)
    }
  }
  const clearCache = () => {
    for (const entry of cache.values()) disposePage(entry)
    cache.clear()
  }
  const safeDpiForPage = (pageIndex: number, desiredDpi: number) => {
    const page = opened.pages[pageIndex]
    const dimensionDpi = Math.min(
      (limits.maxCanvasDimension * page.referenceDpi) / page.width,
      (limits.maxCanvasDimension * page.referenceDpi) / page.height
    )
    const pixelDpi = Math.sqrt(
      (limits.maxRenderedPixels * page.referenceDpi * page.referenceDpi) / (page.width * page.height)
    )
    return Math.max(
      limits.minDpi,
      Math.min(limits.maxDpi, dimensionDpi, pixelDpi, Math.round(desiredDpi))
    )
  }
  const createCanvas = (width: number, height: number, rgba: Uint8ClampedArray) => {
    const pageCanvas = element(documentRef, 'canvas')
    pageCanvas.width = width
    pageCanvas.height = height
    const context2d = pageCanvas.getContext('2d')
    if (!context2d) throw new Error('Canvas 2D is unavailable for PostScript page staging.')
    const ImageDataConstructor = documentRef.defaultView?.ImageData || ImageData
    const owned = rgba.buffer instanceof ArrayBuffer
      ? new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength)
      : new Uint8ClampedArray(rgba)
    context2d.putImageData(new ImageDataConstructor(owned, width, height), 0, 0)
    return pageCanvas
  }
  const getPage = async (pageIndex: number, desiredDpi: number) => {
    const dpi = safeDpiForPage(pageIndex, desiredDpi)
    const key = `${pageIndex}:${dpi}`
    const existing = cache.get(key)
    if (existing) {
      cache.delete(key)
      cache.set(key, existing)
      return existing
    }
    const rendered = await session.renderPage(pageIndex, dpi, context?.signal)
    if (destroyed) throw new DOMException('PostScript rendering was aborted.', 'AbortError')
    const entry = {
      canvas: createCanvas(rendered.width, rendered.height, rendered.rgba),
      bytes: rendered.width * rendered.height * 4,
      dpi,
    }
    cache.set(key, entry)
    cacheBytes += entry.bytes
    trimCache(key)
    return entry
  }
  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 4,
    canZoomOut: zoom > 0.05,
    canReset: true,
    minScale: 0.05,
    maxScale: 4,
  })
  const updateDisplayedSize = () => {
    const densityScale = (zoom * baseDpi) / currentRasterDpi
    shell.style.transform = `scale(${densityScale})`
    wrap.style.width = `${Math.ceil((canvas.width + 28) * densityScale)}px`
    wrap.style.height = `${Math.ceil((canvas.height + 28) * densityScale)}px`
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`
  }
  const displayPage = (entry: CachedPage) => {
    canvas.width = entry.canvas.width
    canvas.height = entry.canvas.height
    const context2d = canvas.getContext('2d')
    if (!context2d) throw new Error('Canvas 2D is unavailable for PostScript preview.')
    context2d.drawImage(entry.canvas, 0, 0)
    currentRasterDpi = entry.dpi
    updateDisplayedSize()
  }
  const drawPage = (pageIndex: number, desiredDpi = baseDpi) => {
    const revision = ++renderRevision
    currentPage = pageIndex
    buttons.forEach((button, buttonIndex) => {
      button.dataset.active = String(buttonIndex === pageIndex)
      button.setAttribute('aria-current', buttonIndex === pageIndex ? 'page' : 'false')
    })
    previous.disabled = pageIndex === 0
    next.disabled = pageIndex === opened.pages.length - 1
    status.textContent = `${copy.loading} ${pageIndex + 1}…`
    const task = pageRenderQueue
      .catch(() => undefined)
      .then(async () => {
        if (destroyed || revision !== renderRevision) return
        const entry = await getPage(pageIndex, desiredDpi)
        if (destroyed || revision !== renderRevision) return
        displayPage(entry)
        status.textContent = `${copy.ready} · ${pageIndex + 1}/${opened.pages.length} · ${Math.round(entry.dpi)} DPI`
        context?.onProgressiveRender?.()
        context?.registerThumbnailAdapter?.({ getTarget: () => canvas })
      })
    pageRenderQueue = task
    return task
  }
  const scheduleSharpRender = () => {
    if (rerenderTimer) clearTimeout(rerenderTimer)
    rerenderTimer = setTimeout(() => {
      const dpr = Math.min(2, Math.max(1, documentRef.defaultView?.devicePixelRatio || 1))
      void drawPage(currentPage, baseDpi * Math.max(1, zoom) * dpr).catch(reportRenderError)
    }, 120)
  }
  const setZoom = (value: number, source: 'user' | 'fit' = 'user') => {
    zoom = clampZoom(value)
    if (source === 'user') userAdjustedZoom = true
    updateDisplayedSize()
    zoomEmitter.emit()
    scheduleSharpRender()
    return getZoomState()
  }
  const fitPage = () => {
    const page = opened.pages[currentPage]
    const logicalWidth = (page.width * baseDpi) / page.referenceDpi + 28
    const logicalHeight = (page.height * baseDpi) / page.referenceDpi + 28
    const width = Math.max(1, stage.clientWidth - 56)
    const height = Math.max(1, stage.clientHeight - 56)
    return setZoom(Math.min(1, width / logicalWidth, height / logicalHeight), 'fit')
  }
  const reportRenderError = (error: unknown) => {
    if (destroyed) return
    status.textContent = error instanceof Error ? error.message : String(error)
    context?.options?.onDiagnostic?.({
      code: 'postscript-page-render-failed',
      level: 'error',
      message: status.textContent,
      detail: { pageIndex: currentPage },
    })
  }

  buttons.forEach((button, index) =>
    button.addEventListener('click', () => void drawPage(index).catch(reportRenderError))
  )
  previous.addEventListener('click', () => {
    if (currentPage > 0) void drawPage(currentPage - 1).catch(reportRenderError)
  })
  next.addEventListener('click', () => {
    if (currentPage + 1 < opened.pages.length) void drawPage(currentPage + 1).catch(reportRenderError)
  })
  zoomOut.addEventListener('click', () => setZoom(zoom / 1.15))
  zoomIn.addEventListener('click', () => setZoom(zoom * 1.15))
  fit.addEventListener('click', () => {
    userAdjustedZoom = false
    fitPage()
  })

  const clearPrintPages = () => {
    printContainer.querySelectorAll('canvas').forEach(pageCanvas => {
      pageCanvas.width = 0
      pageCanvas.height = 0
    })
    printContainer.replaceChildren()
  }
  const ensurePrintPages = async () => {
    clearPrintPages()
    renderRevision += 1
    await pageRenderQueue.catch(() => undefined)
    clearCache()
    let total = 0
    const visibleBytes = canvas.width * canvas.height * 4
    for (const page of opened.pages) {
      const cached = await getPage(page.index, baseDpi)
      const projectedWorkingSet = visibleBytes + cacheBytes + total + cached.bytes * 2
      if (projectedWorkingSet > printLimit) {
        clearPrintPages()
        clearCache()
        throw new Error(`PostScript print working set exceeds the ${printLimit}-byte decoded safety limit.`)
      }
      const printPage = element(documentRef, 'section', 'postscript-print-page')
      printPage.dataset.viewerPrintPageIndex = String(page.index)
      const printCanvas = element(documentRef, 'canvas')
      printCanvas.width = cached.canvas.width
      printCanvas.height = cached.canvas.height
      printCanvas.getContext('2d')?.drawImage(cached.canvas, 0, 0)
      printPage.appendChild(printCanvas)
      printContainer.appendChild(printPage)
      total += cached.bytes
      clearCache()
    }
  }
  context?.registerExportAdapter?.({
    print: true,
    exportHtml: false,
    includeDocumentStyles: false,
    beforeSnapshot: ensurePrintPages,
    getPrintMaskPages: () =>
      Array.from(printContainer.querySelectorAll<HTMLElement>('.postscript-print-page')),
    printStyle: `${postscriptStyle}\n.viewer-export-content .postscript-toolbar,.viewer-export-content .postscript-layout{display:none!important}.viewer-export-content .postscript-print-pages{position:static!important;left:auto!important;top:auto!important;width:auto!important}.viewer-export-content .postscript-print-page{break-after:page;page-break-after:always}.viewer-export-content .postscript-print-page:last-child{break-after:auto;page-break-after:auto}`,
  })
  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom * 1.15),
    zoomOut: () => setZoom(zoom / 1.15),
    resetZoom: fitPage,
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
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

  context?.options?.onDiagnostic?.({
    code: 'postscript-wasm-bounded-preview',
    level: 'info',
    message:
      'EPS/PS preview runs in a terminating Worker with a VM cap, OFL substitute fonts, and PLRM DeviceCMYK fallback; it is not claimed to match every Adobe PostScript Level 3 extension.',
    detail: {
      engine: opened.engineVersion,
      pages: opened.pages.length,
      maxVmBytes: limits.maxVmBytes,
      fontSubstitutes: opened.fontSubstitutes,
    },
  })

  try {
    await drawPage(0)
    if (!userAdjustedZoom) fitPage()
  } catch (error) {
    session.destroy()
    unregisterFileViewerZoomProvider(root)
    throw error
  }

  return {
    $el: root,
    destroy() {
      if (cleaned) return
      cleaned = true
      destroyed = true
      renderRevision += 1
      if (rerenderTimer) clearTimeout(rerenderTimer)
      resizeObserver?.disconnect()
      context?.signal?.removeEventListener('abort', abort)
      unregisterFileViewerZoomProvider(root)
      zoomEmitter.clear()
      session.destroy()
      clearPrintPages()
      clearCache()
      canvas.width = 0
      canvas.height = 0
      target.replaceChildren()
    },
  }
}
