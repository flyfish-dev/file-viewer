import type { SheetImage } from './worker/type.js'

type Bounds = Pick<SheetImage, 'left' | 'top' | 'width' | 'height'>

export interface DrawingPlacement<T> extends Bounds {
  drawing: T
  clip?: { left: number; top: number; right: number; bottom: number }
}

export function getDrawingPlacements<T>(
  drawing: T,
  bounds: Bounds,
  viewport: { width: number; height: number; scrollX: number; scrollY: number },
  frozenWidth: number,
  frozenHeight: number
): DrawingPlacement<T>[] {
  if (!frozenWidth && !frozenHeight) {
    const left = bounds.left - viewport.scrollX
    const top = bounds.top - viewport.scrollY
    const margin = 240
    return left + bounds.width >= -margin && left <= viewport.width + margin &&
      top + bounds.height >= -margin && top <= viewport.height + margin
      ? [{ drawing, ...bounds, left, top }]
      : []
  }

  const horizontal = frozenWidth > 0
    ? [[0, frozenWidth, 0], [frozenWidth, viewport.width, viewport.scrollX]]
    : [[0, viewport.width, viewport.scrollX]]
  const vertical = frozenHeight > 0
    ? [[0, frozenHeight, 0], [frozenHeight, viewport.height, viewport.scrollY]]
    : [[0, viewport.height, viewport.scrollY]]

  return horizontal.flatMap(([minX, maxX, x]) => vertical.flatMap(([minY, maxY, y]) => {
    const left = bounds.left - x
    const top = bounds.top - y
    const clip = {
      left: Math.max(left, minX),
      top: Math.max(top, minY),
      right: Math.min(left + bounds.width, maxX),
      bottom: Math.min(top + bounds.height, maxY),
    }
    return clip.right > clip.left && clip.bottom > clip.top
      ? [{ drawing, ...bounds, left, top, clip }]
      : []
  }))
}

export function getDrawingPlacementStyle(placement: DrawingPlacement<unknown>) {
  const { left, top, width, height, clip } = placement
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    clipPath: clip
      ? `inset(${clip.top - top}px ${left + width - clip.right}px ${top + height - clip.bottom}px ${clip.left - left}px)`
      : '',
  }
}

export function drawingContainsPoint(placement: DrawingPlacement<unknown>, x: number, y: number) {
  const { left, top, width, height, clip } = placement
  return x >= (clip?.left ?? left) && x <= (clip?.right ?? left + width) &&
    y >= (clip?.top ?? top) && y <= (clip?.bottom ?? top + height)
}
