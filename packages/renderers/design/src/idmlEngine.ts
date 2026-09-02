import type { IdmlSafetyLimits } from './idmlLimits.js'
import {
  inspectIdmlPageBounds,
  projectIdmlPageRender,
  type IdmlPageBounds
} from './idmlPageGeometry.js'
import { decodeIdmlInspectorPng } from './idmlPng.js'
import { inspectIdmlZip } from './idmlPreflight.js'
import type { IdmlOpenResult, IdmlRenderedPage } from './idmlProtocol.js'
import { parseIdmlInspectorTree } from './idmlTree.js'

export interface IdmlInspectorLike {
  free(): void
  tree(): string
  renderPage(pageIndex: number, dpi: number): Uint8Array
}

export interface IdmlInspectorRuntime {
  Inspector: new (idml: Uint8Array) => IdmlInspectorLike
}

export type IdmlInspectorRuntimeLoader = (wasmUrl?: string) => Promise<IdmlInspectorRuntime>

interface IntrospectWasmModule extends IdmlInspectorRuntime {
  default(input?: { module_or_path: string | URL }): Promise<unknown>
}

export interface IdmlEngineOptions {
  wasmUrl?: string
  runtimeLoader?: IdmlInspectorRuntimeLoader
  signal?: AbortSignal
}

export class IdmlEngineError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'IdmlEngineError'
  }
}

let defaultRuntimePromise: Promise<IdmlInspectorRuntime> | undefined
let defaultRuntimeWasmUrl: string | undefined

const loadDefaultRuntime: IdmlInspectorRuntimeLoader = async (wasmUrl) => {
  if (defaultRuntimePromise) {
    if (wasmUrl && wasmUrl !== defaultRuntimeWasmUrl) {
      throw new IdmlEngineError(
        'IDML_WASM_URL_CHANGED',
        'The IDML Worker cannot switch introspect-wasm binaries after initialization.'
      )
    }
    return defaultRuntimePromise
  }
  defaultRuntimeWasmUrl = wasmUrl
  defaultRuntimePromise = (async () => {
    const imported = (await import('@paged-media/introspect-wasm')) as IntrospectWasmModule
    await imported.default(wasmUrl ? { module_or_path: wasmUrl } : undefined)
    if (typeof imported.Inspector !== 'function') {
      throw new IdmlEngineError('IDML_ENGINE_API', 'introspect-wasm did not export Inspector.')
    }
    return { Inspector: imported.Inspector }
  })()
  try {
    return await defaultRuntimePromise
  } catch (error) {
    defaultRuntimePromise = undefined
    defaultRuntimeWasmUrl = undefined
    throw error
  }
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) return
  if (signal.reason instanceof Error) throw signal.reason
  throw new DOMException('IDML operation was aborted.', 'AbortError')
}

const asOwnedBytes = (source: ArrayBuffer | Uint8Array) => {
  if (source instanceof Uint8Array) return new Uint8Array(source)
  return new Uint8Array(source)
}

export class IdmlDocumentSession {
  private destroyed = false

  private constructor(
    private inspector: IdmlInspectorLike | undefined,
    private readonly limits: IdmlSafetyLimits,
    private readonly pageBounds: readonly IdmlPageBounds[],
    public readonly opened: IdmlOpenResult
  ) {}

  static async open(
    source: ArrayBuffer | Uint8Array,
    limits: IdmlSafetyLimits,
    options: IdmlEngineOptions = {}
  ) {
    throwIfAborted(options.signal)
    const bytes = asOwnedBytes(source)
    const archive = inspectIdmlZip(bytes, limits)
    const sourceBounds = await inspectIdmlPageBounds(bytes, archive, limits, options.signal)
    throwIfAborted(options.signal)
    const runtime = await (options.runtimeLoader ?? loadDefaultRuntime)(options.wasmUrl)
    throwIfAborted(options.signal)
    let inspector: IdmlInspectorLike | undefined
    try {
      inspector = new runtime.Inspector(bytes)
      throwIfAborted(options.signal)
      const tree = parseIdmlInspectorTree(inspector.tree(), limits)
      if (tree.spreads.length !== sourceBounds.length) {
        throw new IdmlEngineError(
          'IDML_PAGE_GEOMETRY_MISMATCH',
          'Inspector spread count does not match the preflighted IDML page geometry.'
        )
      }
      for (let spreadIndex = 0; spreadIndex < tree.spreads.length; spreadIndex += 1) {
        if (tree.spreads[spreadIndex].pages.length !== sourceBounds[spreadIndex].length) {
          throw new IdmlEngineError(
            'IDML_PAGE_GEOMETRY_MISMATCH',
            `Inspector page count for spread ${spreadIndex} does not match the preflighted IDML page geometry.`
          )
        }
      }
      const pageBounds = sourceBounds.flat()
      if (pageBounds.length !== tree.pageCount) {
        throw new IdmlEngineError(
          'IDML_PAGE_GEOMETRY_MISMATCH',
          'Inspector page count does not match the preflighted IDML page geometry.'
        )
      }
      const opened: IdmlOpenResult = {
        engine: '@paged-media/introspect-wasm',
        engineVersion: '0.62.0',
        renderBackend: 'cpu-tiny-skia',
        tree,
        archive: {
          entryCount: archive.entryCount,
          compressedBytes: archive.compressedBytes,
          uncompressedBytes: archive.uncompressedBytes,
          compressionRatio: archive.compressionRatio
        }
      }
      return new IdmlDocumentSession(inspector, limits, pageBounds, opened)
    } catch (error) {
      inspector?.free()
      throw error
    }
  }

  async renderPage(
    pageIndex: number,
    dpi: number,
    signal?: AbortSignal
  ): Promise<IdmlRenderedPage> {
    const inspector = this.inspector
    if (this.destroyed || !inspector) {
      throw new IdmlEngineError('IDML_SESSION_DESTROYED', 'IDML document session was destroyed.')
    }
    if (
      !Number.isSafeInteger(pageIndex) ||
      pageIndex < 0 ||
      pageIndex >= this.opened.tree.pageCount
    ) {
      throw new IdmlEngineError(
        'IDML_PAGE_RANGE',
        `IDML page index ${pageIndex} is outside 0..${this.opened.tree.pageCount - 1}.`
      )
    }
    if (!Number.isFinite(dpi) || dpi < this.limits.minDpi || dpi > this.limits.maxDpi) {
      throw new IdmlEngineError(
        'IDML_DPI_RANGE',
        `IDML render DPI must be between ${this.limits.minDpi} and ${this.limits.maxDpi}.`
      )
    }
    throwIfAborted(signal)
    const projection = projectIdmlPageRender(this.pageBounds[pageIndex], dpi, this.limits)
    throwIfAborted(signal)
    const png = inspector.renderPage(pageIndex, dpi)
    throwIfAborted(signal)
    const decoded = await decodeIdmlInspectorPng(png, this.limits, signal)
    throwIfAborted(signal)
    if (decoded.width > projection.width || decoded.height > projection.height) {
      throw new IdmlEngineError(
        'IDML_RENDER_GEOMETRY_MISMATCH',
        `Inspector rendered ${decoded.width} x ${decoded.height} pixels beyond the preflighted ${projection.width} x ${projection.height} page bounds.`
      )
    }
    return { pageIndex, dpi, ...decoded }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.inspector?.free()
    this.inspector = undefined
  }
}
