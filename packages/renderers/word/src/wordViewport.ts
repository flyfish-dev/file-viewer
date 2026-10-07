import type { FileViewerFitRequest } from '@file-viewer/core'

export function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/** Clamp the rendered scale, not its multiplier relative to the responsive fit. */
export function clampWordScale(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

/**
 * Zero/invalid explicit dimensions must not fall back to a plausible viewport.
 * A hidden or detached preview is also unmeasurable, even if its CSS paper size
 * and the caller's requested viewport are known. The host can retry once shown.
 */
export function readWordFitViewport(target: HTMLElement, request: FileViewerFitRequest) {
  const width = request.viewportWidth ?? target.clientWidth
  const height = request.viewportHeight ?? target.clientHeight
  if (![width, height, target.clientWidth, target.clientHeight].every(isPositiveFinite)) {
    return null
  }
  return { width, height }
}
