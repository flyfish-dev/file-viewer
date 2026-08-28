import {
  DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION,
  DEFAULT_RENDERER_DEFINITIONS,
  DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION,
  resolveFileViewerRuntimeAssetBaseUrl,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type FileViewerRendererPreset,
  type RendererDefinition
} from '@file-viewer/core'
import FlyfishFileViewerWeb, {
  createViewerControllerHandle,
  FileViewerElement,
  FILE_VIEWER_ELEMENT_TAG,
  mountViewer as mountBaseViewer
} from '@file-viewer/web'
import type {
  ViewerController,
  ViewerCoreOptions,
  FileViewerElementSource,
  ViewerMountOptions,
  ViewerOptions
} from '@file-viewer/web'

export * from '@file-viewer/web'
export { createViewerControllerHandle, FileViewerElement, FILE_VIEWER_ELEMENT_TAG }

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>

interface LazyRendererLine {
  key: string
  label: string
  scriptName: string
  rendererIds: readonly string[]
}

const rendererGlobalKey = 'FlyfishFileViewerWebFullRenderers'

const lazyRendererLines = [
  { key: 'word', label: 'Word renderer', scriptName: 'word.iife.js', rendererIds: ['office-word-openxml', 'office-word-binary', 'open-document'] },
  { key: 'pdf', label: 'PDF renderer', scriptName: 'pdf.iife.js', rendererIds: ['pdf'] },
  { key: 'ofd', label: 'OFD renderer', scriptName: 'ofd.iife.js', rendererIds: ['ofd'] },
  { key: 'presentation', label: 'Presentation renderer', scriptName: 'presentation.iife.js', rendererIds: ['office-presentation-binary', 'office-presentation'] },
  { key: 'spreadsheet', label: 'Spreadsheet renderer', scriptName: 'spreadsheet.iife.js', rendererIds: ['spreadsheet-openxml', 'spreadsheet-dbf'] },
  { key: 'iwork', label: 'Apple iWork renderer', scriptName: 'iwork.iife.js', rendererIds: ['apple-pages', 'apple-numbers', 'apple-keynote'] },
  { key: 'wordperfect', label: 'WordPerfect renderer', scriptName: 'wordperfect.iife.js', rendererIds: ['office-wordperfect'] },
  { key: 'hangul', label: 'HWP/HWPX renderer', scriptName: 'hangul.iife.js', rendererIds: ['office-hangul'] },
  { key: 'cad', label: 'CAD renderer', scriptName: 'cad.iife.js', rendererIds: ['cad'] },
  { key: 'typst', label: 'Typst renderer', scriptName: 'typst.iife.js', rendererIds: ['typst'] },
  { key: 'drawing', label: 'Drawing renderer', scriptName: 'drawing.iife.js', rendererIds: ['drawing'] },
  { key: 'model', label: '3D model renderer', scriptName: 'model.iife.js', rendererIds: ['model'] },
  { key: 'archive', label: 'Archive renderer', scriptName: 'archive.iife.js', rendererIds: ['archive'] },
  { key: 'email', label: 'Email renderer', scriptName: 'email.iife.js', rendererIds: ['email'] },
  { key: 'ebook', label: 'Ebook renderer', scriptName: 'ebook.iife.js', rendererIds: ['epub', 'ebook-fb2', 'umd'] },
  { key: 'text', label: 'Text renderer', scriptName: 'text.iife.js', rendererIds: ['code', 'markdown'] },
  { key: 'image', label: 'Image renderer', scriptName: 'image.iife.js', rendererIds: ['image'] },
  { key: 'media', label: 'Media renderer', scriptName: 'media.iife.js', rendererIds: ['audio', 'video'] },
  { key: 'mindmap', label: 'Mind map renderer', scriptName: 'mindmap.iife.js', rendererIds: ['mindmap'] },
  { key: 'geo', label: 'Geo renderer', scriptName: 'geo.iife.js', rendererIds: ['geo'] },
  { key: 'data', label: 'Data asset renderer', scriptName: 'data.iife.js', rendererIds: ['data-asset'] },
  { key: 'eda', label: 'EDA renderer', scriptName: 'eda.iife.js', rendererIds: ['eda'] }
] as const satisfies readonly LazyRendererLine[]

const lazyRendererById = new Map<string, LazyRendererLine>()
const lazyRendererByExtension = new Map<string, LazyRendererLine>()
const rendererScriptPromises = new Map<string, Promise<FileViewerRendererPlugin<BrowserRendererHandler>>>()

for (const line of lazyRendererLines) {
  for (const rendererId of line.rendererIds) {
    lazyRendererById.set(rendererId, line)
  }
}

for (const definition of DEFAULT_RENDERER_DEFINITIONS) {
  const line = lazyRendererById.get(definition.id)
  if (!line) {
    continue
  }
  for (const extension of definition.extensions) {
    lazyRendererByExtension.set(extension, line)
  }
}

const DEFAULT_FULL_ASSET_BASE_URL = '/file-viewer/'
const WEB_FULL_DOCX_RUNTIME_VERSION = '0.3.28'
const webFullScriptPattern = /(?:@file-viewer\/web-full|flyfish-file-viewer-web-full)/
const initialFullScriptUrl = detectCurrentScriptUrl()
const initialFullRendererBaseUrl = resolveScriptBaseUrl(initialFullScriptUrl) || DEFAULT_FULL_ASSET_BASE_URL
const initialFullAssetBaseUrl = detectInitialFullAssetBaseUrl(
  initialFullScriptUrl,
  initialFullRendererBaseUrl
)
let defaultFullAssetBaseUrl: string | undefined = initialFullAssetBaseUrl
let defaultFullRendererBaseUrl: string | undefined = initialFullRendererBaseUrl

function normalizeAssetBaseUrl(baseUrl?: string | URL | null) {
  if (!baseUrl) {
    return undefined
  }
  const value = String(baseUrl).trim()
  if (!value) {
    return undefined
  }
  return value.endsWith('/') ? value : `${value}/`
}

function detectCurrentScriptUrl() {
  if (typeof document === 'undefined') {
    return undefined
  }
  const currentScript = document.currentScript as HTMLScriptElement | null
  const scripts = Array.from(document.scripts)
  const script = currentScript?.src
    ? currentScript
    : scripts.reverse().find(item =>
        webFullScriptPattern.test(item.src)
      )
  return script?.src || undefined
}

function resolveScriptBaseUrl(scriptUrl?: string) {
  if (!scriptUrl) {
    return undefined
  }
  try {
    return new URL('./', scriptUrl).href
  } catch {
    return undefined
  }
}

function detectInitialFullAssetBaseUrl(
  scriptUrl: string | undefined,
  rendererBaseUrl: string
) {
  if (typeof document === 'undefined' || !scriptUrl || webFullScriptPattern.test(scriptUrl)) {
    return rendererBaseUrl
  }
  return normalizeAssetBaseUrl(resolveFileViewerRuntimeAssetBaseUrl(document)) || rendererBaseUrl
}

function createFullAssetOptions(assetBaseUrl?: string | URL | null): ViewerOptions {
  const baseUrl = normalizeAssetBaseUrl(assetBaseUrl)
  if (!baseUrl) {
    return {}
  }
  const pptAssetUrl = (path: string) => (
    `${baseUrl}${path}?file-viewer-ppt=${encodeURIComponent(DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION)}`
  )
  const docxAssetUrl = (path: string) => (
    `${baseUrl}${path}?file-viewer-docx=${encodeURIComponent(WEB_FULL_DOCX_RUNTIME_VERSION)}`
  )
  const cadAssetUrl = (path: string) => (
    `${baseUrl}${path}?file-viewer-cad=${encodeURIComponent(DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION)}`
  )
  return {
    archive: {
      workerUrl: `${baseUrl}vendor/libarchive/worker-bundle.js`,
      wasmUrl: `${baseUrl}vendor/libarchive/libarchive.wasm`
    },
    cad: {
      wasmPath: `${baseUrl}wasm/cad/${DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION}/`,
      workerUrl: cadAssetUrl(`wasm/cad/${DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION}/dwg-worker.js`),
      dwfWasmUrl: cadAssetUrl(`wasm/cad/${DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION}/dwfv-render.wasm`)
    },
    data: {
      sqlWasmUrl: `${baseUrl}wasm/data/sql-wasm.wasm`
    },
    docx: {
      workerUrl: docxAssetUrl('vendor/docx/docx.worker.js'),
      workerJsZipUrl: docxAssetUrl('vendor/docx/jszip.min.js')
    },
    drawing: {
      viewerScriptUrl: `${baseUrl}vendor/drawio/viewer-static.min.js`
    },
    iwork: {
      workerUrl: `${baseUrl}vendor/iwork/iwork.worker.js`
    },
    hangul: {
      workerUrl: `${baseUrl}vendor/hangul/hangul.worker.js`
    },
    wordPerfect: {
      workerUrl: `${baseUrl}vendor/wordperfect/wordperfect.worker.js`,
      wasmUrl: `${baseUrl}vendor/wordperfect/libwpd.wasm`
    },
    model: {
      workerUrl: `${baseUrl}wasm/model/occt-worker.js`,
      runtimeUrl: `${baseUrl}wasm/model/occt-import-js.js`,
      wasmUrl: `${baseUrl}wasm/model/occt-import-js.wasm`
    },
    pdf: {
      workerUrl: `${baseUrl}vendor/pdf/pdf.worker.mjs`,
      cMapUrl: `${baseUrl}vendor/pdf/cmaps/`,
      wasmUrl: `${baseUrl}vendor/pdf/wasm/`,
      standardFontDataUrl: `${baseUrl}vendor/pdf/standard_fonts/`,
      cjkFontFallbackPath: `${baseUrl}vendor/pdf/fonts/`
    },
    presentation: {
      pptModuleUrl: pptAssetUrl('vendor/ppt/index.mjs'),
      pptWorkerUrl: pptAssetUrl('vendor/ppt/worker.mjs'),
      pptWasmUrl: pptAssetUrl('vendor/ppt/ppt-native.wasm'),
      pptFontUrl: pptAssetUrl('vendor/ppt/ppt-font-cjk.otf'),
      workerUrl: `${baseUrl}vendor/pptx/pptx.worker.js`
    },
    spreadsheet: {
      workerUrl: `${baseUrl}vendor/xlsx/sheet.worker.js`
    },
    typst: {
      compilerWasmUrl: `${baseUrl}wasm/typst/typst_ts_web_compiler_bg.wasm`,
      rendererWasmUrl: `${baseUrl}wasm/typst/typst_ts_renderer_bg.wasm`,
      fontAssetsUrl: `${baseUrl}wasm/typst/fonts/`
    }
  }
}

function mergeNestedOptions<Options extends object>(
  defaults: Options | undefined,
  overrides: Options | undefined
): Options {
  if (!defaults) {
    return overrides as Options
  }
  if (!overrides) {
    return defaults
  }
  const definedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as Partial<Options>
  return {
    ...defaults,
    ...definedOverrides
  } as Options
}

function getRendererBucket() {
  const host = globalThis as typeof globalThis & {
    [rendererGlobalKey]?: Record<string, FileViewerRendererPlugin<BrowserRendererHandler>>
  }
  if (!host[rendererGlobalKey]) {
    host[rendererGlobalKey] = {}
  }
  return host[rendererGlobalKey]
}

function resolveFullRendererLine(input: string) {
  const normalized = input.trim().toLowerCase().replace(/^\./, '')
  return lazyRendererLines.find(line => line.key === normalized) ||
    lazyRendererById.get(normalized) ||
    lazyRendererByExtension.get(normalized)
}

export function getDefaultFullAssetBaseUrl() {
  return defaultFullAssetBaseUrl
}

export function setDefaultFullAssetBaseUrl(assetBaseUrl?: string | URL | null) {
  const normalizedBaseUrl = normalizeAssetBaseUrl(assetBaseUrl)
  defaultFullAssetBaseUrl = normalizedBaseUrl
  defaultFullRendererBaseUrl = normalizedBaseUrl
}

export function resetDefaultFullAssetBaseUrl() {
  defaultFullAssetBaseUrl = initialFullAssetBaseUrl
  defaultFullRendererBaseUrl = initialFullRendererBaseUrl
}

export function getFullRendererScriptUrl(
  rendererOrExtension: string,
  assetBaseUrl: string | URL | null | undefined = defaultFullRendererBaseUrl
) {
  const line = resolveFullRendererLine(rendererOrExtension)
  if (!line) {
    return undefined
  }
  const baseUrl = normalizeAssetBaseUrl(assetBaseUrl) || './'
  return new URL(`renderers/${line.scriptName}`, baseUrl).href
}

async function loadFullRendererLine(line: LazyRendererLine) {
  const existing = getRendererBucket()[line.key]
  if (existing) {
    return existing
  }

  const cached = rendererScriptPromises.get(line.key)
  if (cached) {
    return cached
  }

  const promise = new Promise<FileViewerRendererPlugin<BrowserRendererHandler>>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error(`Cannot load ${line.label} outside a browser document.`))
      return
    }

    const scriptUrl = getFullRendererScriptUrl(line.key)
    if (!scriptUrl) {
      reject(new Error(`Cannot resolve script URL for ${line.label}.`))
      return
    }

    const previous = document.querySelector<HTMLScriptElement>(
      `script[data-file-viewer-full-renderer="${line.key}"]`
    )

    const onReady = () => {
      const plugin = getRendererBucket()[line.key]
      if (plugin) {
        resolve(plugin)
      } else {
        reject(new Error(`${line.label} script loaded but did not register a renderer plugin.`))
      }
    }

    if (previous) {
      previous.addEventListener('load', onReady, { once: true })
      previous.addEventListener('error', () => reject(new Error(`Failed to load ${line.label} from ${scriptUrl}.`)), { once: true })
      if (getRendererBucket()[line.key]) {
        onReady()
      }
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.src = scriptUrl
    script.dataset.fileViewerFullRenderer = line.key
    script.onload = onReady
    script.onerror = () => reject(new Error(`Failed to load ${line.label} from ${scriptUrl}.`))
    document.head.appendChild(script)
  })

  rendererScriptPromises.set(line.key, promise)
  try {
    return await promise
  } catch (error) {
    rendererScriptPromises.delete(line.key)
    throw error
  }
}

function createLazyHandler(
  line: LazyRendererLine,
  rendererId: string
): BrowserRendererHandler {
  return async (buffer, target, type, context) => {
    const plugin = await loadFullRendererLine(line)
    const registration = plugin.handlers?.find(item => item.rendererId === rendererId)
    if (!registration) {
      throw new Error(`${line.label} did not provide handler "${rendererId}".`)
    }
    return registration.handler(buffer, target, type, context)
  }
}

const createLazyRendererPlugin = (line: LazyRendererLine): FileViewerRendererPlugin<BrowserRendererHandler> => ({
  id: `file-viewer-iife-${line.key}-renderer`,
  label: `Lazy ${line.label}`,
  definitions: DEFAULT_RENDERER_DEFINITIONS.filter(definition =>
    line.rendererIds.includes(definition.id)
  ) as RendererDefinition[],
  handlers: line.rendererIds.map(rendererId => ({
    rendererId,
    handler: createLazyHandler(line, rendererId)
  }))
})

export const fileViewerFullPreset: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-iife-preset-all',
  label: 'Flyfish File Viewer lazy full IIFE preset',
  renderers: lazyRendererLines.map(createLazyRendererPlugin)
}

export function preloadFullRenderer(rendererOrExtension: string) {
  const line = resolveFullRendererLine(rendererOrExtension)
  if (!line) {
    return Promise.reject(new Error(`Unknown File Viewer renderer or extension: ${rendererOrExtension}`))
  }
  return loadFullRendererLine(line)
}

export function withFullViewerOptions(
  options: ViewerOptions = {},
  assetBaseUrl: string | URL | null | undefined = defaultFullAssetBaseUrl
): ViewerOptions {
  const { preset = fileViewerFullPreset, rendererMode = 'replace', ...rest } = options
  const assetOptions = createFullAssetOptions(assetBaseUrl)
  const pdfDefaults = normalizeAssetBaseUrl(rest.pdf?.assetBaseUrl)
    ? undefined
    : assetOptions.pdf
  return {
    ...rest,
    preset,
    rendererMode,
    autoRenderers: rest.autoRenderers ?? true,
    archive: mergeNestedOptions(assetOptions.archive, rest.archive),
    cad: mergeNestedOptions(assetOptions.cad, rest.cad),
    data: mergeNestedOptions(assetOptions.data, rest.data),
    docx: mergeNestedOptions(assetOptions.docx, rest.docx),
    drawing: mergeNestedOptions(assetOptions.drawing, rest.drawing),
    hangul: mergeNestedOptions(assetOptions.hangul, rest.hangul),
    iwork: mergeNestedOptions(assetOptions.iwork, rest.iwork),
    pdf: mergeNestedOptions(pdfDefaults, rest.pdf),
    presentation: mergeNestedOptions(assetOptions.presentation, rest.presentation),
    spreadsheet: mergeNestedOptions(assetOptions.spreadsheet, rest.spreadsheet),
    wordPerfect: mergeNestedOptions(assetOptions.wordPerfect, rest.wordPerfect),
    typst: mergeNestedOptions(assetOptions.typst, rest.typst),
    model: mergeNestedOptions(assetOptions.model, rest.model)
  }
}

export function withFullMountOptions(
  options: ViewerMountOptions = {},
  assetBaseUrl: string | URL | null | undefined = defaultFullAssetBaseUrl
): ViewerMountOptions {
  return {
    ...options,
    options: withFullViewerOptions(options.options, assetBaseUrl)
  }
}

export function mountViewer(
  container: HTMLElement,
  initialOptions: ViewerMountOptions = {},
  coreOptions: ViewerCoreOptions = {}
): ViewerController {
  return mountBaseViewer(container, withFullMountOptions(initialOptions), coreOptions)
}

export class FileViewerFullElement extends FileViewerElement {
  get options(): ViewerOptions | undefined {
    return super.options
  }

  set options(value: ViewerOptions | undefined) {
    super.options = withFullViewerOptions(value)
  }

  connectedCallback(): void {
    this.options = super.options
    super.connectedCallback()
  }

  async load(options: ViewerMountOptions): Promise<void> {
    await super.load(withFullMountOptions(options))
  }

  async update(options: ViewerMountOptions = {}): Promise<void> {
    await super.update(withFullMountOptions(options))
  }

  get source(): FileViewerElementSource {
    return super.source
  }

  set source(value: FileViewerElementSource | undefined) {
    if (!value) {
      super.source = value
      return
    }
    const { coreOptions, ...mountOptions } = value
    super.source = {
      ...withFullMountOptions(mountOptions),
      coreOptions
    }
  }
}

export function defineFileViewerElement(
  tagName = FILE_VIEWER_ELEMENT_TAG
): CustomElementConstructor | undefined {
  if (typeof window === 'undefined' || !window.customElements) {
    return undefined
  }
  const existing = window.customElements.get(tagName)
  if (existing) {
    return existing
  }
  window.customElements.define(tagName, FileViewerFullElement)
  return FileViewerFullElement
}

const FlyfishFileViewerWebFull = {
  ...FlyfishFileViewerWeb,
  fileViewerFullPreset,
  getDefaultFullAssetBaseUrl,
  getFullRendererScriptUrl,
  preloadFullRenderer,
  resetDefaultFullAssetBaseUrl,
  setDefaultFullAssetBaseUrl,
  withFullViewerOptions,
  withFullMountOptions,
  defineFileViewerElement,
  FileViewerElement: FileViewerFullElement,
  FileViewerFullElement,
  mountViewer
}

export default FlyfishFileViewerWebFull
