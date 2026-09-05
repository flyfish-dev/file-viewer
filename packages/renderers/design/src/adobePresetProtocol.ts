import type { PhotoshopParseLimits } from './limits.js'

export type AdobePresetFormat = 'pat' | 'grd' | 'asl'

export interface AdobePatternTile {
  name: string
  id: string
  width: number
  height: number
  colorMode: 'grayscale' | 'indexed' | 'rgb'
  rgba: Uint8Array
  hasTransparency: boolean
}

export interface AdobePatternLibraryDocument {
  format: 'pat'
  version: '1'
  engine: 'file-viewer-native'
  fidelity: 'decoded-pattern-tile'
  patterns: AdobePatternTile[]
  limitations: string[]
}

export interface AdobeGradientColorStop {
  location: number
  midpoint: number
  kind: 'user' | 'foreground' | 'background'
  rgb: [number, number, number]
  colorSpace: 'rgb' | 'gray' | 'hsb' | 'lab' | 'cmyk' | 'unknown'
}

export interface AdobeGradientAlphaStop {
  location: number
  midpoint: number
  opacity: number
}

export interface AdobeSolidGradientPreview {
  form: 'solid'
  smoothness: number
  colorStops: AdobeGradientColorStop[]
  alphaStops: AdobeGradientAlphaStop[]
}

export interface AdobeNoiseGradientPreview {
  form: 'noise'
  seed: number
  roughness: number
  colorModel: 'rgb' | 'hsb' | 'lab'
  restrictColors: boolean
  addTransparency: boolean
  minimum: [number, number, number, number]
  maximum: [number, number, number, number]
}

export interface AdobeGradientPreset {
  name: string
  folder?: string
  definition: AdobeSolidGradientPreview | AdobeNoiseGradientPreview
  previewRgba: Uint8Array
}

export interface AdobeGradientLibraryDocument {
  format: 'grd'
  version: '5'
  engine: 'file-viewer-native'
  fidelity: 'solid-stop-preview-noise-approximation'
  gradients: AdobeGradientPreset[]
  limitations: string[]
}

export type AdobeLayerEffectKind =
  | 'drop-shadow'
  | 'inner-shadow'
  | 'outer-glow'
  | 'inner-glow'
  | 'satin'
  | 'bevel-emboss'
  | 'color-overlay'
  | 'gradient-overlay'
  | 'pattern-overlay'
  | 'stroke'

export interface AdobeLayerEffectSummary {
  kind: AdobeLayerEffectKind
  enabled: boolean
  instances: number
}

export interface AdobeLayerStylePreset {
  name: string
  id: string
  effectsVisible: boolean
  effects: AdobeLayerEffectSummary[]
  blendMode?: string
  opacity?: number
  fillOpacity?: number
  blendIfChannels: number
  referencedPatterns: Array<{ name: string; id: string }>
}

export interface AdobeLayerStyleLibraryDocument {
  format: 'asl'
  version: '2'
  engine: 'file-viewer-native'
  fidelity: 'effect-graph-metadata-preview'
  styles: AdobeLayerStylePreset[]
  patterns: AdobePatternTile[]
  limitations: string[]
}

export type AdobePresetDocument =
  | AdobePatternLibraryDocument
  | AdobeGradientLibraryDocument
  | AdobeLayerStyleLibraryDocument

export type AdobePresetWorkerRequest = {
  id: number
  type: 'parse-preset'
  format: AdobePresetFormat
  buffer: ArrayBuffer
  limits: PhotoshopParseLimits
}

export type AdobePresetWorkerResponse =
  | { id: number; ok: true; result: AdobePresetDocument }
  | { id: number; ok: false; error: { name: string; message: string } }
