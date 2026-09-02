export interface IdmlSafetyLimits {
  maxFileBytes: number
  maxEntries: number
  maxEntryCompressedBytes: number
  maxEntryUncompressedBytes: number
  maxTotalUncompressedBytes: number
  maxCompressionRatio: number
  maxTreeJsonBytes: number
  maxPages: number
  maxFrames: number
  minDpi: number
  maxDpi: number
  maxRenderedDimension: number
  maxRenderedPixels: number
  maxRenderedPngBytes: number
  maxRenderWorkingSetBytes: number
  workerTimeoutMs: number
}

export const HARD_MAX_IDML_RENDERED_PIXELS = 16_000_000
export const HARD_MAX_IDML_RENDERED_DIMENSION = 16_384
export const HARD_MAX_IDML_RENDERED_PNG_BYTES = 64 * 1024 * 1024
export const HARD_MAX_IDML_RENDER_WORKING_SET_BYTES = 256 * 1024 * 1024

export const DEFAULT_IDML_SAFETY_LIMITS: Readonly<IdmlSafetyLimits> = Object.freeze({
  maxFileBytes: 128 * 1024 * 1024,
  maxEntries: 20_000,
  maxEntryCompressedBytes: 128 * 1024 * 1024,
  maxEntryUncompressedBytes: 128 * 1024 * 1024,
  maxTotalUncompressedBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxTreeJsonBytes: 16 * 1024 * 1024,
  maxPages: 500,
  maxFrames: 100_000,
  minDpi: 12,
  maxDpi: 300,
  maxRenderedDimension: HARD_MAX_IDML_RENDERED_DIMENSION,
  maxRenderedPixels: HARD_MAX_IDML_RENDERED_PIXELS,
  maxRenderedPngBytes: HARD_MAX_IDML_RENDERED_PNG_BYTES,
  maxRenderWorkingSetBytes: HARD_MAX_IDML_RENDER_WORKING_SET_BYTES,
  workerTimeoutMs: 120_000
})

const positiveInteger = (value: number | undefined, fallback: number) => {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

const positiveFinite = (value: number | undefined, fallback: number) => {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback
}

const boundedPositiveInteger = (value: number | undefined, fallback: number, hardMaximum: number) =>
  Math.min(hardMaximum, positiveInteger(value, fallback))

export const resolveIdmlSafetyLimits = (
  overrides?: Partial<IdmlSafetyLimits>
): IdmlSafetyLimits => {
  const minDpi = positiveFinite(overrides?.minDpi, DEFAULT_IDML_SAFETY_LIMITS.minDpi)
  const requestedMaxDpi = positiveFinite(overrides?.maxDpi, DEFAULT_IDML_SAFETY_LIMITS.maxDpi)
  return {
    maxFileBytes: positiveInteger(overrides?.maxFileBytes, DEFAULT_IDML_SAFETY_LIMITS.maxFileBytes),
    maxEntries: positiveInteger(overrides?.maxEntries, DEFAULT_IDML_SAFETY_LIMITS.maxEntries),
    maxEntryCompressedBytes: positiveInteger(
      overrides?.maxEntryCompressedBytes,
      DEFAULT_IDML_SAFETY_LIMITS.maxEntryCompressedBytes
    ),
    maxEntryUncompressedBytes: positiveInteger(
      overrides?.maxEntryUncompressedBytes,
      DEFAULT_IDML_SAFETY_LIMITS.maxEntryUncompressedBytes
    ),
    maxTotalUncompressedBytes: positiveInteger(
      overrides?.maxTotalUncompressedBytes,
      DEFAULT_IDML_SAFETY_LIMITS.maxTotalUncompressedBytes
    ),
    maxCompressionRatio: positiveFinite(
      overrides?.maxCompressionRatio,
      DEFAULT_IDML_SAFETY_LIMITS.maxCompressionRatio
    ),
    maxTreeJsonBytes: positiveInteger(
      overrides?.maxTreeJsonBytes,
      DEFAULT_IDML_SAFETY_LIMITS.maxTreeJsonBytes
    ),
    maxPages: positiveInteger(overrides?.maxPages, DEFAULT_IDML_SAFETY_LIMITS.maxPages),
    maxFrames: positiveInteger(overrides?.maxFrames, DEFAULT_IDML_SAFETY_LIMITS.maxFrames),
    minDpi,
    maxDpi: Math.max(minDpi, requestedMaxDpi),
    maxRenderedDimension: boundedPositiveInteger(
      overrides?.maxRenderedDimension,
      DEFAULT_IDML_SAFETY_LIMITS.maxRenderedDimension,
      HARD_MAX_IDML_RENDERED_DIMENSION
    ),
    maxRenderedPixels: boundedPositiveInteger(
      overrides?.maxRenderedPixels,
      DEFAULT_IDML_SAFETY_LIMITS.maxRenderedPixels,
      HARD_MAX_IDML_RENDERED_PIXELS
    ),
    maxRenderedPngBytes: boundedPositiveInteger(
      overrides?.maxRenderedPngBytes,
      DEFAULT_IDML_SAFETY_LIMITS.maxRenderedPngBytes,
      HARD_MAX_IDML_RENDERED_PNG_BYTES
    ),
    maxRenderWorkingSetBytes: boundedPositiveInteger(
      overrides?.maxRenderWorkingSetBytes,
      DEFAULT_IDML_SAFETY_LIMITS.maxRenderWorkingSetBytes,
      HARD_MAX_IDML_RENDER_WORKING_SET_BYTES
    ),
    workerTimeoutMs: positiveInteger(
      overrides?.workerTimeoutMs,
      DEFAULT_IDML_SAFETY_LIMITS.workerTimeoutMs
    )
  }
}
