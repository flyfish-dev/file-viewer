import { clampWordScale, isPositiveFinite, readWordFitViewport } from './wordViewport.js'
import { readDocxFlowPaperHeight } from './docxExport.js'
import type { DocxProgressEvent, Options, renderAsync, disposeRenderedDocument } from '@file-viewer/docx'
import { observeDocxFrames } from './docxFrames.js'
import {
  DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION,
  resolveFileViewerDocxWorkerJsZipUrl,
  resolveFileViewerDocxWorkerUrl,
  resolveFileViewerRuntimeAssetBaseUrl
} from '@file-viewer/core/assets'

import {
  applyPrintPageSize,
  buildPrintPageStyle,
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  formatCssPixels,
  getElementPrintPageSize,
  normalizeFileViewerTheme,
  replaceFileViewerCanvasWithImages,
  registerFileViewerZoomProvider,
  resolveFileViewerFitScale,
  unregisterFileViewerZoomProvider,
  waitForFileViewerNextPaint,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerDocxOptions,
  type FileViewerRenderedInstance as AppWrapper,
  type FileViewerZoomState,
  type PrintPageSize
} from '@file-viewer/core'

const DOCX_DEFAULT_PAGE_SIZE: PrintPageSize = {
  width: 794,
  height: 1123
}

const DOCX_WORKER_UNSAFE_PROTOCOLS = new Set(['file:', 'about:', 'data:'])
const DOCX_MIN_SCALE = 0.24
const DOCX_MAX_SCALE = 3
const DOCX_ZOOM_STEP = 0.15
const ZIP_SIGNATURE_PK = 0x504b

type DocxLibrary = {
  defaultOptions: Options
  renderAsync: typeof renderAsync
  disposeRenderedDocument: typeof disposeRenderedDocument
}

type DocxLibraryImport = DocxLibrary & {
  default?: DocxLibrary
}

type DocxExternalLinkPolicy = NonNullable<FileViewerDocxOptions['externalLinkPolicy']>
type DocxExternalResourcePolicy = NonNullable<FileViewerDocxOptions['externalResourcePolicy']>
type DocxRenderOptions = Partial<Options> & {
  externalLinkPolicy: DocxExternalLinkPolicy
  externalResourcePolicy: DocxExternalResourcePolicy
}

// Modern bundlers expose the ESM named exports, while some legacy webpack
// configurations wrap the CommonJS browser API in `default`.
const resolveDocxLibrary = (module: DocxLibraryImport): DocxLibrary => {
  const library = typeof module.renderAsync === 'function' ? module : module.default
  if (!library || typeof library.renderAsync !== 'function') {
    throw new TypeError('@file-viewer/docx did not expose a compatible renderAsync function.')
  }
  return library
}

const loadLibrary = (() => {
  const loader = {
    module: null as null | Promise<DocxLibraryImport>,
    async load() {
      if (!this.module) {
        this.module = import('@file-viewer/docx') as Promise<DocxLibraryImport>
      }
      return this.module
    }
  }
  return async () => {
    return resolveDocxLibrary(await loader.load())
  }
})()

/**
 * DOCX / DOCM / DOTX / DOTM are OOXML packages, so a valid file must start
 * with a ZIP signature. This catches common enterprise download failures where
 * an object-storage XML error page is saved with a `.docx` extension.
 */
const assertValidDocxPackage = (buffer: ArrayBuffer, context?: FileRenderContext) => {
  const signature = buffer.byteLength >= 4 ? new DataView(buffer).getUint16(0, false) : 0
  if (signature === ZIP_SIGNATURE_PK) {
    return
  }

  throw new Error(createFileViewerTranslator(context?.options)('word.error.invalidDocx'))
}

const getTargetWindow = (target: HTMLDivElement) => {
  return target.ownerDocument.defaultView
}

const getTargetProtocol = (target: HTMLDivElement) => {
  const candidates = [
    target.ownerDocument.URL,
    getTargetWindow(target)?.location?.href,
    globalThis.location?.href
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      return new URL(candidate).protocol
    } catch {
      // Ignore synthetic document URLs created by tests or embedded hosts.
    }
  }

  return ''
}

const shouldUseDocxWorker = (
  target: HTMLDivElement,
  docxOptions: FileViewerDocxOptions | undefined
) => {
  if (docxOptions?.worker === false) {
    return false
  }
  if (docxOptions?.worker === true) {
    return true
  }

  // Auto mode is asset-aware. A browser can expose Worker even when a host has
  // not copied the optional DOCX vendor files; probing that missing URL often
  // returns an SPA HTML fallback and emits a SyntaxError before main-thread
  // rendering recovers. Full packages inject workerUrl, so they still use it.
  const WorkerCtor = getTargetWindow(target)?.Worker ?? globalThis.Worker
  return Boolean(
    WorkerCtor &&
    docxOptions?.workerUrl &&
    !DOCX_WORKER_UNSAFE_PROTOCOLS.has(getTargetProtocol(target))
  )
}

const prefersDarkColorScheme = (target: HTMLDivElement) => {
  const view = getTargetWindow(target)
  const matchMedia = view?.matchMedia ?? globalThis.matchMedia
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

const resolveDocxDarkMode = (
  target: HTMLDivElement,
  context: FileRenderContext | undefined,
  docxOptions: FileViewerDocxOptions | undefined
) => {
  if (docxOptions?.darkMode !== undefined) {
    return docxOptions.darkMode
  }

  const theme = normalizeFileViewerTheme(context?.options?.theme)
  if (theme === 'dark') {
    return true
  }
  if (theme === 'light') {
    return false
  }
  return prefersDarkColorScheme(target)
}

const appendDocxVendorAssetVersion = (url: string | undefined, explicitUrl: boolean) => {
  if (!url || explicitUrl) {
    return url
  }

  if (/[?&]file-viewer-docx=[^&#]*/.test(url)) {
    return url.replace(
      /([?&])file-viewer-docx=[^&#]*/,
      `$1file-viewer-docx=${DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION}`
    )
  }

  return `${url}${url.includes('?') ? '&' : '?'}file-viewer-docx=${DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION}`
}

export const createDocxOptions = (
  target: HTMLDivElement,
  context: FileRenderContext | undefined,
  notifyProgressiveRender: () => void
): DocxRenderOptions => {
  const docxOptions = context?.options?.docx
  const documentBaseUrl = resolveFileViewerRuntimeAssetBaseUrl(target.ownerDocument)
  const useWorker = shouldUseDocxWorker(target, docxOptions)
  const usePagedLayout = docxOptions?.visualPagination === true
  const darkMode = resolveDocxDarkMode(target, context, docxOptions)
  const progress = (event: DocxProgressEvent) => {
    if (event.phase === 'render' || event.phase === 'layout' || event.phase === 'done') {
      notifyProgressiveRender()
    }
  }

  const externalLinkPolicy = docxOptions?.externalLinkPolicy ?? 'block'
  const externalResourcePolicy = docxOptions?.externalResourcePolicy ?? 'block'
  const options: DocxRenderOptions = {
    useWorker,
    // 仅传递原生身份开关，不介入 DOCX 解析、分页或文档写回。
    exposeDisplayTargets: docxOptions?.exposeDisplayTargets === true,
    reviewMode: docxOptions?.reviewMode ?? 'all',
    // Authored page breaks define separate anchor coordinate spaces even in
    // flow mode. Only measured/fixed-height pagination remains opt-in.
    breakPages: true,
    fixedPageHeight: usePagedLayout,
    ignoreLastRenderedPageBreak: docxOptions?.ignoreLastRenderedPageBreak ?? !usePagedLayout,
    externalLinkPolicy,
    externalResourcePolicy,
    darkMode,
    reviewPresentation: 'inline',
    progress
  }

  if (useWorker) {
    options.workerUrl = appendDocxVendorAssetVersion(
      resolveFileViewerDocxWorkerUrl(docxOptions, documentBaseUrl),
      !!docxOptions?.workerUrl
    )
    options.workerJsZipUrl = appendDocxVendorAssetVersion(
      resolveFileViewerDocxWorkerJsZipUrl(docxOptions, documentBaseUrl),
      !!docxOptions?.workerJsZipUrl
    )
  }
  if (docxOptions?.workerTimeout !== undefined) {
    options.workerTimeout = docxOptions.workerTimeout
  }
  if (docxOptions?.renderPageBatchSize !== undefined) {
    options.renderPageBatchSize = docxOptions.renderPageBatchSize
  } else if (docxOptions?.progressive === false) {
    options.renderPageBatchSize = Number.MAX_SAFE_INTEGER
  }
  if (docxOptions?.renderYieldEveryMs !== undefined) {
    options.renderYieldEveryMs = docxOptions.renderYieldEveryMs
  }
  if (docxOptions?.strictWordCompatibility !== undefined) {
    options.strictWordCompatibility = docxOptions.strictWordCompatibility
  }
  if (docxOptions?.paginationTolerance !== undefined) {
    options.paginationTolerance = docxOptions.paginationTolerance
  }
  if (docxOptions?.maxDynamicPaginationPasses !== undefined) {
    options.maxDynamicPaginationPasses = docxOptions.maxDynamicPaginationPasses
  }
  if (docxOptions?.awaitLayout !== undefined) {
    options.awaitLayout = docxOptions.awaitLayout
  }
  if (docxOptions?.preserveComplexFieldResults !== undefined) {
    options.preserveComplexFieldResults = docxOptions.preserveComplexFieldResults
  }
  if (docxOptions?.updatePageReferences !== undefined) {
    options.updatePageReferences = docxOptions.updatePageReferences
  }
  if (docxOptions?.hideWebHiddenContent !== undefined) {
    options.hideWebHiddenContent = docxOptions.hideWebHiddenContent
  }
  if (docxOptions?.renderAltChunks !== undefined) {
    options.renderAltChunks = docxOptions.renderAltChunks
  }

  return options
}

const isTargetHTMLElement = (value: unknown, target: HTMLDivElement): value is HTMLElement => {
  const HTMLElementCtor = getTargetWindow(target)?.HTMLElement
  return HTMLElementCtor ? value instanceof HTMLElementCtor : value instanceof HTMLElement
}

const DOCX_RESPONSIVE_CSS = `
.docx-fit-viewer {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  background: var(--file-viewer-render-surface-background, #ececec);
  color-scheme: light;
}
.docx-fit-viewer[data-docx-dark-mode='true'] {
  background: var(--file-viewer-render-surface-background, #242424);
  color-scheme: dark;
}
.docx-fit-viewer .docx-wrapper {
  box-sizing: border-box;
  min-width: 0 !important;
  width: 100% !important;
  padding: 24px 14px 40px !important;
  background: var(--file-viewer-render-surface-background, #e7e9ec) !important;
}
.docx-fit-viewer[data-docx-dark-mode='true'] .docx-wrapper {
  background: var(--file-viewer-render-surface-background, #242424) !important;
}
.docx-fit-viewer .docx-page-frame {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0 auto 24px;
  overflow: visible;
}
.docx-fit-viewer .docx-flow-frame {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0 auto 28px;
  overflow: visible;
}
.docx-fit-viewer .docx-page-frame > section.docx,
.docx-fit-viewer .docx-flow-frame > section.docx {
  position: absolute;
  top: 0;
  left: 50%;
  margin: 0 !important;
  box-shadow: 0 2px 14px rgba(25, 35, 48, 0.18);
  box-sizing: border-box;
  overflow: hidden;
  transform-origin: top center;
}
.docx-fit-viewer[data-docx-dark-mode='true'] .docx-page-frame > section.docx,
.docx-fit-viewer[data-docx-dark-mode='true'] .docx-flow-frame > section.docx {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
  outline: 1px solid rgba(255, 255, 255, 0.15);
  outline-offset: -1px;
}
.docx-fit-viewer .docx-flow-frame > section.docx {
  height: auto !important;
  min-height: var(--docx-page-height, auto) !important;
  overflow: visible !important;
}
.docx-fit-viewer .docx-page-frame > section.docx > article,
.docx-fit-viewer .docx-flow-frame > section.docx > article {
  position: relative;
  z-index: 1;
}
`

function installResponsiveStyle(target: HTMLDivElement) {
  const style = target.ownerDocument.createElement('style')
  style.textContent = DOCX_RESPONSIVE_CSS
  target.prepend(style)
  return style
}

function makeDocxResponsive(target: HTMLDivElement, context?: FileRenderContext) {
  target.classList.add('docx-fit-viewer')
  const style = installResponsiveStyle(target)
  const pagedLayout = context?.options?.docx?.visualPagination === true
  let frames: HTMLElement[] = []
  const view = getTargetWindow(target)
  const ResizeObserverCtor = view?.ResizeObserver
  let resizeFrame = 0
  let userZoom = 1
  let currentScale = 1
  let currentFitScale = 1
  const zoomEmitter = createZoomChangeEmitter()

  const clampScale = (scale: number) => {
    return clampWordScale(scale, DOCX_MIN_SCALE, DOCX_MAX_SCALE)
  }

  const applyResponsiveLayout = () => {
    let firstScale = currentScale
    let firstFitScale = currentFitScale
    let measured = false

    frames.forEach((frame) => {
      const page = frame.firstElementChild
      if (!isTargetHTMLElement(page, target)) {
        return
      }

      page.style.transform = 'translateX(-50%)'

      const pageWidth = page.offsetWidth
      const contentHeight = pagedLayout
        ? page.offsetHeight
        : Math.max(page.scrollHeight, page.offsetHeight)
      if (!pageWidth || !contentHeight) {
        return
      }
      const availableWidth = Math.max(target.clientWidth - 28, 120)
      const fitScale = Math.min(1, Math.max(DOCX_MIN_SCALE, availableWidth / pageWidth))
      const scale = clampScale(fitScale * userZoom)
      if (!measured) {
        firstScale = scale
        firstFitScale = fitScale
        measured = true
      }

      page.style.transform = `translateX(-50%) scale(${scale})`
      frame.style.width = `${Math.ceil(Math.max(pageWidth * scale, target.clientWidth - 28, 120))}px`
      frame.style.maxWidth = 'none'
      frame.style.height = `${Math.ceil(contentHeight * scale)}px`
    })

    if (!measured) {
      return
    }

    currentScale = firstScale
    currentFitScale = firstFitScale
    zoomEmitter.emit()
  }

  const resize = () => {
    if (!view) {
      applyResponsiveLayout()
      return
    }

    view.cancelAnimationFrame(resizeFrame)
    resizeFrame = view.requestAnimationFrame(() => {
      applyResponsiveLayout()
    })
  }

  const getZoomState = (): FileViewerZoomState => ({
    scale: currentScale,
    label: `${Math.round(currentScale * 100)}%`,
    canZoomIn: currentScale < DOCX_MAX_SCALE,
    canZoomOut: currentScale > DOCX_MIN_SCALE,
    canReset: userZoom !== 1,
    minScale: DOCX_MIN_SCALE,
    maxScale: DOCX_MAX_SCALE
  })

  const setUserZoom = (nextZoom: number) => {
    if (!isPositiveFinite(nextZoom)) return getZoomState()
    // A narrow viewport may require a multiplier greater than six to reach
    // the advertised 300% scale. Only the final rendered scale is bounded.
    userZoom = nextZoom
    view?.cancelAnimationFrame(resizeFrame)
    applyResponsiveLayout()
    return getZoomState()
  }

  const setAbsoluteScale = (scale: number) => {
    if (!isPositiveFinite(scale)) return getZoomState()
    return setUserZoom(clampScale(scale) / currentFitScale)
  }

  const readFitPageSize = (): PrintPageSize | null => {
    for (const frame of frames) {
      const page = getDocxPageElement(frame)
      if (!page) {
        continue
      }
      if (!page.offsetWidth || !page.offsetHeight) continue
      return {
        width: page.offsetWidth,
        // Fit the visible flow, not an invented A4 page. Paper height is a
        // separate concern handled by the export adapter.
        height: isDocxFlowFrame(frame)
          ? Math.max(page.scrollHeight, page.offsetHeight)
          : page.offsetHeight
      }
    }
    return null
  }

  const fitDocx = (request: FileViewerFitRequest): FileViewerFitResult => {
    const pageSize = readFitPageSize()
    const viewport = readWordFitViewport(target, request)
    if (!pageSize || !viewport) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'unmeasurable',
        provider: 'zoom'
      }
    }

    const mode = request.mode === 'auto' ? 'width' : request.mode
    const scale = resolveFileViewerFitScale({
      mode,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      contentWidth: pageSize.width,
      contentHeight: pageSize.height,
      currentScale,
      minScale: request.minScale ?? DOCX_MIN_SCALE,
      maxScale: request.maxScale ?? DOCX_MAX_SCALE
    })

    if (!scale || !isPositiveFinite(scale)) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'unmeasurable',
        provider: 'zoom'
      }
    }

    const state = setAbsoluteScale(scale)
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'zoom'
    }
  }

  target.dataset.viewerZoomProvider = 'docx'
  registerFileViewerZoomProvider(target, {
    zoomIn: () => setUserZoom((currentScale + DOCX_ZOOM_STEP) / Math.max(currentFitScale, 0.01)),
    zoomOut: () => setUserZoom((currentScale - DOCX_ZOOM_STEP) / Math.max(currentFitScale, 0.01)),
    resetZoom: () => setUserZoom(1),
    setZoom: setAbsoluteScale,
    fit: fitDocx,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })

  const observer = ResizeObserverCtor ? new ResizeObserverCtor(resize) : null
  observer?.observe(target)
  const disposeFrames = observeDocxFrames(target, pagedLayout, nextFrames => {
    observer?.disconnect()
    observer?.observe(target)
    frames = nextFrames
    frames.forEach(frame => {
      const page = getDocxPageElement(frame)
      if (page) observer?.observe(page)
    })
    resize()
  })
  applyResponsiveLayout()

  return () => {
    view?.cancelAnimationFrame(resizeFrame)
    observer?.disconnect()
    disposeFrames()
    unregisterFileViewerZoomProvider(target)
    style.remove()
    target.classList.remove('docx-fit-viewer')
  }
}

function getDocxPageElement(frame: HTMLElement) {
  const page = frame.firstElementChild
  const HTMLElementCtor = frame.ownerDocument.defaultView?.HTMLElement
  return HTMLElementCtor && page instanceof HTMLElementCtor ? page : null
}

function isDocxFlowFrame(frame: HTMLElement | undefined) {
  return !!frame?.classList.contains('docx-flow-frame')
}

function isDocxCanvasSheet(frame: HTMLElement | undefined) {
  return !!frame?.classList.contains('docx-canvas-sheet')
}

function getDocxFramePrintSize(frame: HTMLElement | undefined) {
  const page = frame ? getDocxPageElement(frame) : null
  if (!page) {
    return DOCX_DEFAULT_PAGE_SIZE
  }

  const size = getElementPrintPageSize(page, DOCX_DEFAULT_PAGE_SIZE)
  if (!isDocxFlowFrame(frame)) {
    return size
  }

  return {
    width: size.width,
    height: Math.max(page.scrollHeight || 0, page.offsetHeight || 0, readDocxFlowPaperHeight(page, DOCX_DEFAULT_PAGE_SIZE.height))
  }
}

function normalizeDocxPageForPrint(frame: HTMLElement, pageSize: PrintPageSize) {
  if (isDocxCanvasSheet(frame)) {
    applyPrintPageSize(frame, pageSize)
    frame.dataset.viewerPrintPageIndex ||= '0'
    frame.classList.remove('docx-canvas-sheet-pending', 'docx-canvas-sheet-virtualized')
    frame.style.position = 'relative'
    frame.style.contain = 'none'
    frame.style.margin = '0 auto 18px'
    frame.style.boxShadow = 'none'
    return
  }

  const flowLayout = isDocxFlowFrame(frame)
  const pageWidth = formatCssPixels(pageSize.width)
  const pageHeight = formatCssPixels(pageSize.height)

  applyPrintPageSize(frame, pageSize, { heightMode: flowLayout ? 'min' : 'fixed' })
  frame.style.margin = '0 auto 18px'

  const page = getDocxPageElement(frame)
  if (!page) {
    return
  }

  page.style.position = 'relative'
  page.style.top = 'auto'
  page.style.left = 'auto'
  page.style.width = pageWidth
  page.style.maxWidth = 'none'
  page.style.minHeight = flowLayout ? '0' : pageHeight
  page.style.height = flowLayout ? 'auto' : pageHeight
  page.style.margin = '0 auto'
  page.style.transform = 'none'
  page.style.transformOrigin = 'top left'
  page.style.overflow = flowLayout ? 'visible' : 'hidden'
  page.style.boxShadow = 'none'
}

function buildDocxPrintStyle(target: HTMLDivElement) {
  const frames = Array.from(target.querySelectorAll<HTMLElement>(
    '.docx-page-frame, .docx-flow-frame, .docx-canvas-sheet'
  ))
  const firstFrame = frames[0]
  const pageSize = getDocxFramePrintSize(firstFrame)
  const selector = isDocxCanvasSheet(firstFrame)
    ? '.viewer-export-content .docx-canvas-sheet'
    : isDocxFlowFrame(firstFrame)
      ? '.viewer-export-content .docx-flow-frame'
      : '.viewer-export-content .docx-page-frame'
  return buildPrintPageStyle({
    selector,
    width: pageSize.width,
    height: isDocxFlowFrame(firstFrame)
      ? readDocxFlowPaperHeight(getDocxPageElement(firstFrame), DOCX_DEFAULT_PAGE_SIZE.height)
      : pageSize.height,
    heightMode: isDocxFlowFrame(firstFrame) ? 'min' : 'fixed',
    // Flow sections are browser-paginated rather than fixed authored pages.
    pages: frames.some(isDocxFlowFrame) ? undefined : frames.map(getDocxFramePrintSize)
  })
}

type DocxCanvasRuntimeWindow = Window & {
  __docxCanvasMaterializeAllPages?: (reason?: string) => Promise<unknown> | unknown
}

async function prepareDocxCloneForExport(target: HTMLDivElement) {
  const view = getTargetWindow(target) as DocxCanvasRuntimeWindow | undefined
  const usesVirtualCanvas = !!target.querySelector('.docx-canvas-sheet')
  const materializeAllPages = view?.__docxCanvasMaterializeAllPages
  let materializedForSnapshot = false

  if (usesVirtualCanvas && typeof materializeAllPages === 'function') {
    await materializeAllPages.call(view, 'file-viewer-print-snapshot')
    await waitForFileViewerNextPaint(view)
    materializedForSnapshot = true
  }

  try {
    const selector = '.docx-page-frame, .docx-flow-frame, .docx-canvas-sheet'
    const liveFrames = Array.from(target.querySelectorAll<HTMLElement>(selector))
    const clone = target.cloneNode(true) as HTMLElement
    replaceFileViewerCanvasWithImages(target, clone)
    // The engine wrapper carries document theme variables and review metadata.
    // Preserve that context while replacing only the viewer's zoom/scroll frames.
    const engineWrapper = clone.querySelector<HTMLElement>('.docx-wrapper')
    const printDocument = engineWrapper
      ? engineWrapper.cloneNode(false) as HTMLElement
      : target.ownerDocument.createElement('div')
    printDocument.classList.add('docx-print-document')
    printDocument.style.padding = '0'
    printDocument.style.background = 'transparent'
    const scopedStyles = Array.from(clone.querySelectorAll('style'))
      .filter((style) => !style.textContent?.includes('.docx-fit-viewer'))
      .map((style) => style.outerHTML)
      .join('')

    clone.querySelectorAll<HTMLElement>(selector).forEach((frame, index) => {
      frame.dataset.viewerPrintPageIndex = String(index)
      normalizeDocxPageForPrint(frame, getDocxFramePrintSize(liveFrames[index]))
      printDocument.appendChild(frame.cloneNode(true))
    })

    return printDocument.childElementCount
      ? `${scopedStyles}${printDocument.outerHTML}`
      : clone.innerHTML
  } finally {
    if (materializedForSnapshot && view) {
      const afterPrint = target.ownerDocument.createEvent('Event')
      afterPrint.initEvent('afterprint', false, false)
      view.dispatchEvent(afterPrint)
    }
  }
}

/**
 * 渲染docx文件
 */
export default async function (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<AppWrapper> {
  assertValidDocxPackage(buffer, context)
  target.replaceChildren()

  let hasNotifiedProgressiveRender = false
  const notifyProgressiveRender = () => {
    if (hasNotifiedProgressiveRender) {
      return
    }
    hasNotifiedProgressiveRender = true
    context?.onProgressiveRender?.()
  }
  const docxOptions = createDocxOptions(target, context, notifyProgressiveRender)
  const { defaultOptions, renderAsync, disposeRenderedDocument } = await loadLibrary()

  target.dataset.docxWorker = docxOptions.useWorker ? 'self' : 'false'
  target.dataset.docxDarkMode = docxOptions.darkMode ? 'true' : 'false'
  await renderAsync(buffer, target, undefined, { ...defaultOptions, ...docxOptions })
  notifyProgressiveRender()

  const disposeResponsive = makeDocxResponsive(target, context)
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    getPrintMaskPages: () =>
      Array.from(
        target.querySelectorAll<HTMLElement>(
          '.docx-page-frame, .docx-flow-frame, .docx-canvas-sheet'
        )
      ),
    beforeSnapshot: () => {
      const view = getTargetWindow(target)
      if (view) {
        view.dispatchEvent(new view.Event('resize'))
      }
    },
    printStyle: () => buildDocxPrintStyle(target),
    toHtml: () => prepareDocxCloneForExport(target)
  })
  context?.registerThumbnailAdapter?.({
    getTarget: () =>
      target.querySelector('.docx-page-frame, .docx-flow-frame, .docx-canvas-sheet') || target
  })

  return {
    $el: target,
    unmount() {
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      disposeResponsive()
      disposeRenderedDocument(target)
      delete target.dataset.docxWorker
      delete target.dataset.docxDarkMode
      target.replaceChildren()
    }
  }
}
