import type { FileViewerViewState } from '@file-viewer/core'

export type PdfRotation = 0 | 90 | 180 | 270

export const normalizePdfRotation = (rotation: number): PdfRotation => {
  const normalized = (((Math.round(rotation / 90) * 90) % 360) + 360) % 360
  return (
    normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0
  ) as PdfRotation
}

/** PDFViewer rotation is an offset from each page's authored /Rotate value. */
export const resolvePdfPageRotation = (pageRotation: number, viewerRotation: number): PdfRotation =>
  normalizePdfRotation(normalizePdfRotation(pageRotation) + normalizePdfRotation(viewerRotation))

export const clampPdfScale = (scale: number, minScale: number, maxScale: number) => {
  return Number(Math.min(maxScale, Math.max(minScale, scale)).toFixed(2))
}

export const resolvePdfViewStateUpdate = (
  state: FileViewerViewState,
  current: { rotation: number; scale: number; page: number; pageCount: number },
  limits: { minScale: number; maxScale: number }
) => {
  const requestedRotation = Number(state.rotation)
  const requestedScale = Number(state.scale ?? state.zoom?.scale)
  const requestedPage = Number(state.page)
  const rotation = Number.isFinite(requestedRotation)
    ? normalizePdfRotation(requestedRotation)
    : current.rotation
  const scale = Number.isFinite(requestedScale)
    ? clampPdfScale(requestedScale, limits.minScale, limits.maxScale)
    : current.scale
  const page = Number.isFinite(requestedPage)
    ? Math.min(current.pageCount, Math.max(1, Math.round(requestedPage)))
    : current.page

  return {
    rotation: rotation !== current.rotation ? rotation : undefined,
    scale: Math.abs(scale - current.scale) > 0.001 ? scale : undefined,
    page: page !== current.page ? page : undefined
  }
}
