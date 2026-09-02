import type { PhotoshopParseLimits } from './limits.js'

export interface PhotoshopHeader {
  version: 1 | 2
  channels: number
  width: number
  height: number
  depth: number
  colorMode: number
}

export interface PhotoshopLayerInfo {
  id: string
  parentId?: string
  kind: 'group' | 'layer'
  name: string
  depth: number
  left: number
  top: number
  width: number
  height: number
  opacity: number
  hidden: boolean
  blendMode: string
  clipping: number
  text?: string
  drawable: boolean
  stackIndex: number
}

export interface PhotoshopOpenResult {
  header: PhotoshopHeader
  layers: PhotoshopLayerInfo[]
  composite: Uint8ClampedArray
  engine: 'ag-psd' | 'webtoon-psd'
  fidelity: 'stored-composite'
  compositeCompression: 'raw' | 'rle'
  colorProfile: 'none-or-srgb-assumed' | 'embedded-unconverted'
  layerInteraction: 'basic' | 'structure-only'
  layerInteractionLimits: string[]
}

export type PhotoshopWorkerRequest =
  | { id: number; type: 'open'; buffer: ArrayBuffer; limits: PhotoshopParseLimits }
  | { id: number; type: 'layer'; layerId: string }

export type PhotoshopWorkerResponse =
  | { id: number; ok: true; type: 'open'; result: PhotoshopOpenResult }
  | { id: number; ok: true; type: 'layer'; layerId: string; width: number; height: number; rgba: Uint8ClampedArray }
  | { id: number; ok: false; error: { name: string; message: string; fatal: boolean } }
