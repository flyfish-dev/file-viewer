import type { DocxProgressEvent, Options, renderAsync } from '@file-viewer/docx'
import JSZip from 'jszip'
import {
  resolveFileViewerDocxWorkerJsZipUrl,
  resolveFileViewerDocxWorkerUrl,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets'

import {
  applyPrintPageSize,
  buildPrintPageStyle,
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  formatCssPixels,
  getElementPrintPageSize,
  normalizeFileViewerTheme,
  registerFileViewerZoomProvider,
  resolveFileViewerFitScale,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerDocxOptions,
  type FileViewerRenderedInstance as AppWrapper,
  type FileViewerZoomState,
  type PrintPageSize,
} from '@file-viewer/core'

const DOCX_DEFAULT_PAGE_SIZE: PrintPageSize = {
  width: 794,
  height: 1123
}

const DOCX_WORKER_UNSAFE_PROTOCOLS = new Set(['file:', 'about:', 'data:'])
const DOCX_MIN_SCALE = 0.24
const DOCX_MAX_SCALE = 3
const DOCX_ZOOM_STEP = 0.15
const DOCX_VENDOR_ASSET_VERSION = '0.3.28'
const ZIP_SIGNATURE_PK = 0x504b
const WORDPROCESSINGML_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const OFFICE_RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PACKAGE_RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/package/2006/relationships'
const VML_NAMESPACE = 'urn:schemas-microsoft-com:vml'
const DOCX_DOCUMENT_PART = 'word/document.xml'
const DOCX_DOCUMENT_RELATIONSHIPS_PART = 'word/_rels/document.xml.rels'
const DOCX_PAGE_BACKGROUND_CLASS = 'docx-page-background'
const DOCX_BACKGROUND_MIME_TYPES: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp'
}

type DocxLibrary = {
  defaultOptions: Options
  renderAsync: typeof renderAsync
}

type DocxLibraryImport = DocxLibrary & {
  default?: DocxLibrary
}

type DocxRenderAsync = typeof renderAsync
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
      return this.module;
    }
  }
  return async () => {
    return resolveDocxLibrary(await loader.load())
  }
})()

export const isMissingDocxHeaderFooterRootError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  return /(?:undefined|null).*children|children.*(?:undefined|null)/i.test(error.message) &&
    /renderHeaderFooter/i.test(error.stack || '')
}

/**
 * Some malformed or partially generated DOCX files reference a header/footer
 * part whose parsed root is missing. @file-viewer/docx 0.3.21 skips that part;
 * this retry keeps older installed engines usable while the dependency update
 * rolls through lockfiles and private registries.
 */
export const renderDocxWithHeaderFooterFallback = async (
  render: DocxRenderAsync,
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  options: Options
) => {
  try {
    await render(buffer, target, undefined, options)
    return false
  } catch (error) {
    if (!isMissingDocxHeaderFooterRootError(error)) {
      throw error
    }

    target.replaceChildren()
    await render(buffer, target, undefined, {
      ...options,
      renderHeaders: false,
      renderFooters: false
    })
    return true
  }
}

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

const createTargetXmlParser = (target: HTMLDivElement) => {
  const DOMParserCtor = getTargetWindow(target)?.DOMParser ?? globalThis.DOMParser
  return new DOMParserCtor()
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

type DocxXmlSearchRoot = Pick<XMLDocument, 'getElementsByTagName' | 'getElementsByTagNameNS'>

const getElementsByLocalName = (root: DocxXmlSearchRoot, namespace: string, localName: string) => {
  const namespaced = Array.from(root.getElementsByTagNameNS(namespace, localName))
  if (namespaced.length) {
    return namespaced
  }

  return Array.from(root.getElementsByTagName('*')).filter(
    element => element.localName === localName
  )
}

const parseDocxXml = (source: string, parser: Pick<DOMParser, 'parseFromString'>) => {
  const xml = parser.parseFromString(source, 'application/xml')
  return getElementsByLocalName(
    xml,
    'http://www.mozilla.org/newlayout/xml/parsererror.xml',
    'parsererror'
  ).length
    ? null
    : xml
}

const resolvePackagePartPath = (basePart: string, relationshipTarget: string) => {
  const segments = relationshipTarget.startsWith('/') ? [] : basePart.split('/').slice(0, -1)

  relationshipTarget
    .replace(/^\/+/, '')
    .split('/')
    .forEach(segment => {
      if (!segment || segment === '.') {
        return
      }
      if (segment === '..') {
        segments.pop()
        return
      }
      segments.push(segment)
    })

  return segments.join('/')
}

const resolveDocxImageMimeType = (partName: string) => {
  const extension = partName.split('.').pop()?.toLowerCase() || ''
  return DOCX_BACKGROUND_MIME_TYPES[extension]
}

/**
 * WPS and Word can store a page background as a document-level VML fill. The
 * DOCX engine intentionally ignores that legacy drawing node, so resolve only
 * its package-local image relationship here and leave all body layout to it.
 */
export const resolveDocxPageBackgroundImage = async (
  buffer: ArrayBuffer,
  createXmlParser: () => Pick<DOMParser, 'parseFromString'> = () => new DOMParser()
) => {
  try {
    const archive = await JSZip.loadAsync(buffer)
    const documentEntry = archive.file(DOCX_DOCUMENT_PART)
    const relationshipsEntry = archive.file(DOCX_DOCUMENT_RELATIONSHIPS_PART)
    if (!documentEntry || !relationshipsEntry) {
      return undefined
    }

    const parser = createXmlParser()
    const documentXml = parseDocxXml(await documentEntry.async('string'), parser)
    const relationshipsXml = parseDocxXml(await relationshipsEntry.async('string'), parser)
    if (!documentXml || !relationshipsXml) {
      return undefined
    }

    const background = getElementsByLocalName(
      documentXml,
      WORDPROCESSINGML_NAMESPACE,
      'background'
    )[0]
    const fill = background && getElementsByLocalName(background, VML_NAMESPACE, 'fill')[0]
    const relationshipId =
      fill?.getAttributeNS(OFFICE_RELATIONSHIP_NAMESPACE, 'id') || fill?.getAttribute('r:id')
    if (!relationshipId) {
      return undefined
    }

    const relationship = getElementsByLocalName(
      relationshipsXml,
      PACKAGE_RELATIONSHIP_NAMESPACE,
      'Relationship'
    ).find(candidate => candidate.getAttribute('Id') === relationshipId)
    const target = relationship?.getAttribute('Target')
    if (!target || relationship?.getAttribute('TargetMode') === 'External') {
      return undefined
    }

    const partName = resolvePackagePartPath(DOCX_DOCUMENT_PART, target)
    const mimeType = resolveDocxImageMimeType(partName)
    const imageEntry = archive.file(partName) || archive.file(decodeURIComponent(partName))
    if (!mimeType || !imageEntry) {
      return undefined
    }

    return `data:${mimeType};base64,${await imageEntry.async('base64')}`
  } catch {
    // A page background is optional and must never make an otherwise readable
    // document fail. The DOCX engine remains responsible for package errors.
    return undefined
  }
}

export const applyDocxPageBackgroundImage = (
  target: HTMLDivElement,
  imageUrl: string | undefined
) => {
  if (!imageUrl) {
    return 0
  }

  let applied = 0
  target.querySelectorAll<HTMLElement>('section.docx').forEach(page => {
    const existing = Array.from(page.children).find(child =>
      child.classList.contains(DOCX_PAGE_BACKGROUND_CLASS)
    ) as HTMLElement | undefined
    const background = existing || target.ownerDocument.createElement('div')
    background.className = DOCX_PAGE_BACKGROUND_CLASS
    background.setAttribute('aria-hidden', 'true')
    background.style.backgroundImage = `url("${imageUrl}")`
    if (!existing) {
      page.prepend(background)
    }
    applied += 1
  })

  return applied
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
      `$1file-viewer-docx=${DOCX_VENDOR_ASSET_VERSION}`
    )
  }

  return `${url}${url.includes('?') ? '&' : '?'}file-viewer-docx=${DOCX_VENDOR_ASSET_VERSION}`
}

export const applyDocxExternalLinkPolicy = (
  target: Pick<ParentNode, 'querySelectorAll'>,
  policy: DocxExternalLinkPolicy
) => {
  if (policy === 'allow') {
    return 0
  }

  let blocked = 0
  target.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#')) {
      return
    }

    if (!anchor.hasAttribute('data-docx-external-href')) {
      anchor.setAttribute('data-docx-external-href', href)
    }
    anchor.removeAttribute('href')
    anchor.setAttribute('aria-disabled', 'true')
    blocked += 1
  })
  return blocked
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
    breakPages: usePagedLayout,
    ignoreLastRenderedPageBreak: docxOptions?.ignoreLastRenderedPageBreak ?? !usePagedLayout,
    externalLinkPolicy,
    externalResourcePolicy,
    darkMode,
    progress: event => {
      if (event.phase === 'render' || event.phase === 'layout' || event.phase === 'done') {
        applyDocxExternalLinkPolicy(target, externalLinkPolicy)
      }
      progress(event)
    }
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
  background: #ffffff !important;
  box-shadow: 0 2px 14px rgba(25, 35, 48, 0.18);
  box-sizing: border-box;
  overflow: hidden;
  transform-origin: top center;
}
.docx-fit-viewer .docx-page-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
.docx-fit-viewer[data-docx-dark-mode='true'] .docx-page-frame > section.docx,
.docx-fit-viewer[data-docx-dark-mode='true'] .docx-flow-frame > section.docx {
  background: rgb(51, 51, 51) !important;
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

function wrapDocxSections(target: HTMLDivElement, pagedLayout: boolean) {
  const wrapper = target.querySelector('.docx-wrapper')
  if (!wrapper) {
    return []
  }

  return Array.from(wrapper.children).flatMap(child => {
    if (!isTargetHTMLElement(child, target) || !child.matches('section.docx')) {
      return []
    }

    const frame = target.ownerDocument.createElement('div')
    frame.className = pagedLayout ? 'docx-page-frame' : 'docx-flow-frame'
    child.before(frame)
    frame.appendChild(child)
    return [frame]
  })
}

function makeDocxResponsive(target: HTMLDivElement, context?: FileRenderContext) {
  target.classList.add('docx-fit-viewer')
  const style = installResponsiveStyle(target)
  const pagedLayout = context?.options?.docx?.visualPagination === true
  const frames = wrapDocxSections(target, pagedLayout)
  const view = getTargetWindow(target)
  const ResizeObserverCtor = view?.ResizeObserver
  let resizeFrame = 0
  let userZoom = 1
  let currentScale = 1
  let currentFitScale = 1
  const zoomEmitter = createZoomChangeEmitter()

  const clampScale = (scale: number) => {
    return Math.min(DOCX_MAX_SCALE, Math.max(DOCX_MIN_SCALE, Number(scale.toFixed(2))))
  }

  const applyResponsiveLayout = () => {
    let firstScale = currentScale
    let firstFitScale = currentFitScale
    let measured = false

    frames.forEach(frame => {
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
    userZoom = Math.min(6, Math.max(0.2, Number(nextZoom.toFixed(2))))
    view?.cancelAnimationFrame(resizeFrame)
    applyResponsiveLayout()
    return getZoomState()
  }

  const setAbsoluteScale = (scale: number) => {
    return setUserZoom(scale / Math.max(currentFitScale, 0.01))
  }

  const readFitPageSize = (): PrintPageSize | null => {
    for (const frame of frames) {
      const page = getDocxPageElement(frame)
      if (!page) {
        continue
      }
      const pageSize = getElementPrintPageSize(page, DOCX_DEFAULT_PAGE_SIZE)
      return {
        width: page.offsetWidth || pageSize.width || DOCX_DEFAULT_PAGE_SIZE.width,
        height: isDocxFlowFrame(frame)
          ? DOCX_DEFAULT_PAGE_SIZE.height
          : page.offsetHeight || pageSize.height || DOCX_DEFAULT_PAGE_SIZE.height
      }
    }
    return null
  }

  const fitDocx = (request: FileViewerFitRequest): FileViewerFitResult => {
    const pageSize = readFitPageSize()
    if (!pageSize) {
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
      viewportWidth: Math.max(1, request.viewportWidth || target.clientWidth || 0),
      viewportHeight: Math.max(1, request.viewportHeight || target.clientHeight || 0),
      contentWidth: pageSize.width,
      contentHeight: pageSize.height,
      currentScale,
      minScale: request.minScale ?? DOCX_MIN_SCALE,
      maxScale: request.maxScale ?? DOCX_MAX_SCALE
    })

    if (!scale) {
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
  frames.forEach(frame => {
    const page = getDocxPageElement(frame)
    if (page) {
      observer?.observe(page)
    }
  })
  applyResponsiveLayout()

  return () => {
    view?.cancelAnimationFrame(resizeFrame)
    observer?.disconnect()
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
    height: Math.max(page.scrollHeight || 0, page.offsetHeight || 0, DOCX_DEFAULT_PAGE_SIZE.height)
  }
}

function normalizeDocxPageForPrint(frame: HTMLElement, pageSize: PrintPageSize) {
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
  const firstFrame = target.querySelector<HTMLElement>('.docx-page-frame, .docx-flow-frame')
  const pageSize = getDocxFramePrintSize(firstFrame || undefined)
  const selector = firstFrame?.classList.contains('docx-flow-frame')
    ? '.viewer-export-content .docx-flow-frame'
    : '.viewer-export-content .docx-page-frame'

  return buildPrintPageStyle({
    selector,
    width: pageSize.width,
    height: firstFrame?.classList.contains('docx-flow-frame')
      ? DOCX_DEFAULT_PAGE_SIZE.height
      : pageSize.height,
    heightMode: firstFrame?.classList.contains('docx-flow-frame') ? 'min' : 'fixed'
  })
}

function prepareDocxCloneForExport(target: HTMLDivElement) {
  const liveFrames = Array.from(target.querySelectorAll<HTMLElement>('.docx-page-frame, .docx-flow-frame'))
  const clone = target.cloneNode(true) as HTMLElement
  const printDocument = target.ownerDocument.createElement('div')
  printDocument.className = 'docx-print-document'
  const scopedStyles = Array.from(clone.querySelectorAll('style'))
    .filter(style => !style.textContent?.includes('.docx-fit-viewer'))
    .map(style => style.outerHTML)
    .join('')

  clone.querySelectorAll<HTMLElement>('.docx-page-frame, .docx-flow-frame').forEach((frame, index) => {
    frame.dataset.viewerPrintPageIndex = String(index)
    normalizeDocxPageForPrint(frame, getDocxFramePrintSize(liveFrames[index]))
    printDocument.appendChild(frame.cloneNode(true))
  })

  return printDocument.childElementCount ? `${scopedStyles}${printDocument.outerHTML}` : clone.innerHTML
}

/**
 * 渲染docx文件
 */
export default async function(buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext): Promise<AppWrapper> {
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
  const [{ defaultOptions, renderAsync }, pageBackgroundImage] = await Promise.all([
    loadLibrary(),
    resolveDocxPageBackgroundImage(buffer, () => createTargetXmlParser(target))
  ])

  target.dataset.docxWorker = docxOptions.useWorker ? 'self' : 'false'
  target.dataset.docxDarkMode = docxOptions.darkMode ? 'true' : 'false'
  const usedHeaderFooterFallback = await renderDocxWithHeaderFooterFallback(renderAsync, buffer, target, {
    ...defaultOptions,
    ...docxOptions
  })
  applyDocxExternalLinkPolicy(target, docxOptions.externalLinkPolicy)
  target.dataset.docxHeaderFooterFallback = usedHeaderFooterFallback ? 'true' : 'false'
  target.dataset.docxPageBackground =
    applyDocxPageBackgroundImage(target, pageBackgroundImage) > 0 ? 'true' : 'false'
  notifyProgressiveRender()

  const disposeResponsive = makeDocxResponsive(target, context)
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    getPrintMaskPages: () => Array.from(
      target.querySelectorAll<HTMLElement>('.docx-page-frame, .docx-flow-frame')
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
    getTarget: () => target.querySelector('.docx-page-frame, .docx-flow-frame') || target
  })

  return {
    $el: target,
    unmount() {
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      disposeResponsive()
      delete target.dataset.docxWorker
      delete target.dataset.docxDarkMode
      delete target.dataset.docxHeaderFooterFallback
      delete target.dataset.docxPageBackground
      target.replaceChildren()
    }
  }
}
