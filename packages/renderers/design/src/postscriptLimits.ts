export interface PostscriptSafetyLimits {
  maxFileBytes: number
  maxPages: number
  maxSourceDimension: number
  maxCanvasDimension: number
  maxRenderedPixels: number
  maxVmBytes: number
  minDpi: number
  maxDpi: number
  workerTimeoutMs: number
}

export const DEFAULT_POSTSCRIPT_SAFETY_LIMITS: PostscriptSafetyLimits = Object.freeze({
  maxFileBytes: 32 * 1024 * 1024,
  maxPages: 100,
  maxSourceDimension: 100_000,
  maxCanvasDimension: 8_192,
  maxRenderedPixels: 16 * 1024 * 1024,
  maxVmBytes: 256 * 1024 * 1024,
  minDpi: 36,
  maxDpi: 300,
  workerTimeoutMs: 30_000,
})

const finiteInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

export const resolvePostscriptSafetyLimits = (
  value: Partial<PostscriptSafetyLimits> = {}
): PostscriptSafetyLimits => {
  const minDpi = finiteInteger(value.minDpi, DEFAULT_POSTSCRIPT_SAFETY_LIMITS.minDpi, 18, 300)
  const maxDpi = Math.max(
    minDpi,
    finiteInteger(value.maxDpi, DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxDpi, 36, 600)
  )
  return {
    maxFileBytes: finiteInteger(value.maxFileBytes, DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxFileBytes, 1, 64 * 1024 * 1024),
    maxPages: finiteInteger(value.maxPages, DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxPages, 1, 500),
    maxSourceDimension: finiteInteger(
    value.maxSourceDimension,
    DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxSourceDimension,
    1,
    1_000_000
    ),
    maxCanvasDimension: finiteInteger(
    value.maxCanvasDimension,
    DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxCanvasDimension,
    1,
    16_384
    ),
    maxRenderedPixels: finiteInteger(
    value.maxRenderedPixels,
    DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxRenderedPixels,
    1,
    64 * 1024 * 1024
    ),
    maxVmBytes: finiteInteger(
    value.maxVmBytes,
    DEFAULT_POSTSCRIPT_SAFETY_LIMITS.maxVmBytes,
    16 * 1024 * 1024,
    512 * 1024 * 1024
    ),
    minDpi,
    maxDpi,
    workerTimeoutMs: finiteInteger(
    value.workerTimeoutMs,
    DEFAULT_POSTSCRIPT_SAFETY_LIMITS.workerTimeoutMs,
    1_000,
    120_000
    ),
  }
}
