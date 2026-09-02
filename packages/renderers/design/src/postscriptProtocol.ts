import type { PostscriptSafetyLimits } from './postscriptLimits.js'

export interface PostscriptPageInfo {
  index: number
  width: number
  height: number
  referenceDpi: number
}

export interface PostscriptOpenResult {
  engine: 'stet-wasm'
  engineVersion: '0.7.0+file-viewer-safe.1'
  renderBackend: 'cpu-tiny-skia'
  colorFallback: 'plrm-device-cmyk'
  fontSubstitutes: readonly ['Carlito', 'Tinos', 'Cousine', 'Noto Sans Symbols 2']
  pages: PostscriptPageInfo[]
}

export interface PostscriptRenderedPage {
  pageIndex: number
  dpi: number
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export type PostscriptWorkerRequest =
  | {
      id: number
      type: 'open'
      buffer: ArrayBuffer
      filename: string
      wasmUrl: string
      limits: PostscriptSafetyLimits
    }
  | { id: number; type: 'renderPage'; pageIndex: number; dpi: number }
  | { id: number; type: 'destroy' }

export type PostscriptWorkerResponse =
  | { id: number; ok: true; type: 'open'; result: PostscriptOpenResult }
  | { id: number; ok: true; type: 'renderPage'; result: PostscriptRenderedPage }
  | { id: number; ok: true; type: 'destroy' }
  | {
      id: number
      ok: false
      error: { name: string; code: string; message: string; fatal: boolean }
    }
