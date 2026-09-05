import type { PhotoshopParseLimits } from './limits.js'

export type AdobeBrushResourceFormat = 'abr' | 'csh'

export interface AdobeBrushShapeSummary {
  type: 'computed' | 'sampled' | 'tips' | 'dynamic'
  size: number
  angle: number
  roundness?: number
  hardness?: number
  spacing?: number
  sampledDataId?: string
}

export interface AdobeBrushPresetSummary {
  name: string
  shape: AdobeBrushShapeSummary
  hasDynamics: boolean
  hasTexture: boolean
  hasDualBrush: boolean
  toolType?: 'brush' | 'mixer brush' | 'smudge brush'
}

export interface AdobeBrushSamplePreview {
  id: string
  x: number
  y: number
  width: number
  height: number
  alpha: Uint8Array
}

export interface AdobePatternPreview {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rgba: Uint8Array
}

export interface AdobeBrushLibraryDocument {
  format: 'abr'
  version: string
  engine: 'ag-psd'
  fidelity: 'decoded-tip-and-metadata-preview'
  brushes: AdobeBrushPresetSummary[]
  samples: AdobeBrushSamplePreview[]
  patterns: AdobePatternPreview[]
  limitations: string[]
}

export interface AdobeCustomShapePathPreview {
  d: string
  fillRule: 'even-odd' | 'non-zero'
  operation?: 'exclude' | 'combine' | 'subtract' | 'intersect'
}

export interface AdobeCustomShapePreview {
  id: string
  name: string
  width: number
  height: number
  paths: AdobeCustomShapePathPreview[]
  hasUnsupportedBooleanComposition: boolean
}

export interface AdobeCustomShapeLibraryDocument {
  format: 'csh'
  version: '2'
  engine: 'ag-psd'
  fidelity: 'vector-path-preview'
  shapes: AdobeCustomShapePreview[]
  limitations: string[]
}

export type AdobeBrushResourceDocument = AdobeBrushLibraryDocument | AdobeCustomShapeLibraryDocument

export type AdobeBrushResourceWorkerRequest = {
  id: number
  type: 'parse'
  format: AdobeBrushResourceFormat
  buffer: ArrayBuffer
  limits: PhotoshopParseLimits
}

export type AdobeBrushResourceWorkerResponse =
  | { id: number; ok: true; result: AdobeBrushResourceDocument }
  | { id: number; ok: false; error: { name: string; message: string } }
