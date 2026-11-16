import allRenderers, {
  getDefaultFullAssetBaseUrl,
  mergeFullAssetOptions,
  setDefaultFullAssetBaseUrl
} from '@file-viewer/preset-all'
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
import { withFullControllerOptions } from './controller-options.js'

export * from '@file-viewer/web'
export { createViewerControllerHandle, FileViewerElement, FILE_VIEWER_ELEMENT_TAG }
export {
  getDefaultFullAssetBaseUrl,
  resetDefaultFullAssetBaseUrl,
  setDefaultFullAssetBaseUrl
} from '@file-viewer/preset-all'

export const fileViewerFullPreset = allRenderers

function detectCurrentScriptBaseUrl() {
  if (typeof document === 'undefined') {
    return undefined
  }
  const currentScript = document.currentScript as HTMLScriptElement | null
  const scripts = Array.from(document.scripts)
  const script = currentScript?.src
    ? currentScript
    : scripts.reverse().find(item =>
        /(?:@file-viewer\/web-full|flyfish-file-viewer-web-full)/.test(item.src)
      )
  if (!script?.src) {
    return undefined
  }
  try {
    return new URL('./', script.src).href
  } catch {
    return undefined
  }
}

const currentScriptBaseUrl = detectCurrentScriptBaseUrl()
if (currentScriptBaseUrl) {
  setDefaultFullAssetBaseUrl(currentScriptBaseUrl)
}

export function withFullViewerOptions(
  options: ViewerOptions = {},
  assetBaseUrl: string | URL | null | undefined = getDefaultFullAssetBaseUrl()
): ViewerOptions {
  const { preset = allRenderers, rendererMode = 'replace', ...rest } = options
  return {
    ...mergeFullAssetOptions(rest, assetBaseUrl),
    preset,
    rendererMode,
    autoRenderers: rest.autoRenderers ?? true
  }
}

export function withFullMountOptions(
  options: ViewerMountOptions = {},
  assetBaseUrl: string | URL | null | undefined = getDefaultFullAssetBaseUrl()
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
  return withFullControllerOptions(
    mountBaseViewer(container, withFullMountOptions(initialOptions), coreOptions),
    withFullMountOptions
  )
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
  setDefaultFullAssetBaseUrl,
  withFullViewerOptions,
  withFullMountOptions,
  defineFileViewerElement,
  FileViewerElement: FileViewerFullElement,
  mountViewer
}

export default FlyfishFileViewerWebFull
