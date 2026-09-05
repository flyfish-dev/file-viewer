import type { FileViewerDesignOptions } from '@file-viewer/core'

export interface PhotoshopParseLimits {
  maxFileBytes: number
  maxCanvasPixels: number
  maxCanvasDimension: number
  maxLayers: number
  maxNestingDepth: number
  maxLayerPixels: number
  maxDecodedBytes: number
  maxLayerCacheBytes: number
  maxResourceItems: number
  maxResourceNameCodeUnits: number
  maxResourcePreviewPixels: number
}

export const DEFAULT_PHOTOSHOP_PARSE_LIMITS: Readonly<PhotoshopParseLimits> = Object.freeze({
  maxFileBytes: 128 * 1024 * 1024,
  maxCanvasPixels: 16_000_000,
  maxCanvasDimension: 16_384,
  maxLayers: 2_000,
  maxNestingDepth: 64,
  maxLayerPixels: 16_000_000,
  maxDecodedBytes: 128 * 1024 * 1024,
  maxLayerCacheBytes: 64 * 1024 * 1024,
  maxResourceItems: 4_096,
  maxResourceNameCodeUnits: 4_096,
  maxResourcePreviewPixels: 16_000_000,
})

const positiveInteger = (value: number | undefined, fallback: number) => {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

export const resolvePhotoshopParseLimits = (
  options?: FileViewerDesignOptions | Partial<PhotoshopParseLimits>
): PhotoshopParseLimits => ({
  maxFileBytes: positiveInteger(options?.maxFileBytes, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxFileBytes),
  maxCanvasPixels: positiveInteger(options?.maxCanvasPixels, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxCanvasPixels),
  maxCanvasDimension: positiveInteger(options?.maxCanvasDimension, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxCanvasDimension),
  maxLayers: positiveInteger(options?.maxLayers, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxLayers),
  maxNestingDepth: positiveInteger(options?.maxNestingDepth, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxNestingDepth),
  maxLayerPixels: positiveInteger(options?.maxLayerPixels, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxLayerPixels),
  maxDecodedBytes: positiveInteger(options?.maxDecodedBytes, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxDecodedBytes),
  maxLayerCacheBytes: positiveInteger(options?.maxLayerCacheBytes, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxLayerCacheBytes),
  maxResourceItems: positiveInteger(options?.maxResourceItems, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxResourceItems),
  maxResourceNameCodeUnits: positiveInteger(options?.maxResourceNameCodeUnits, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxResourceNameCodeUnits),
  maxResourcePreviewPixels: positiveInteger(options?.maxResourcePreviewPixels, DEFAULT_PHOTOSHOP_PARSE_LIMITS.maxResourcePreviewPixels),
})
