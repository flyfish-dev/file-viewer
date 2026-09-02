import type { IdmlSafetyLimits } from './idmlLimits.js'

export interface IdmlNodeAddress {
  kind: string
  id: string
}

export interface IdmlFrameTreeNode {
  id: IdmlNodeAddress
  label: string
}

export interface IdmlPageTreeNode {
  index: number
  indexInSpread: number
  spreadIndex: number
  label: string
  frames: IdmlFrameTreeNode[]
}

export interface IdmlSpreadTreeNode {
  index: number
  label: string
  pages: IdmlPageTreeNode[]
}

export interface IdmlPageTree {
  spreads: IdmlSpreadTreeNode[]
  pageCount: number
  frameCount: number
}

export interface IdmlArchiveSummary {
  entryCount: number
  compressedBytes: number
  uncompressedBytes: number
  compressionRatio: number
}

export interface IdmlOpenResult {
  engine: '@paged-media/introspect-wasm'
  engineVersion: '0.62.0'
  renderBackend: 'cpu-tiny-skia'
  tree: IdmlPageTree
  archive: IdmlArchiveSummary
}

export interface IdmlRenderedPage {
  pageIndex: number
  dpi: number
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export type IdmlWorkerRequest =
  | {
      id: number
      type: 'open'
      buffer: ArrayBuffer
      limits: IdmlSafetyLimits
      wasmUrl?: string
    }
  | { id: number; type: 'renderPage'; pageIndex: number; dpi: number }
  | { id: number; type: 'destroy' }

export type IdmlWorkerResponse =
  | { id: number; ok: true; type: 'open'; result: IdmlOpenResult }
  | { id: number; ok: true; type: 'renderPage'; result: IdmlRenderedPage }
  | { id: number; ok: true; type: 'destroy' }
  | {
      id: number
      ok: false
      error: { name: string; code: string; message: string; fatal: boolean }
    }
