import type { FileViewerWatermarkOptions } from '../contracts/types'
import { buildFileViewerWatermarkSvg, normalizeFileViewerWatermark } from '../features/watermark'

const loadImage = (document: Document, source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement('img')
    const timer = setTimeout(() => finish(new Error('Image export resource timed out.')), 30_000)
    const finish = (error?: Error) => {
      clearTimeout(timer)
      image.onload = image.onerror = null
      if (error) reject(error)
      else resolve(image)
    }
    image.crossOrigin = 'anonymous'
    image.onload = () => finish()
    image.onerror = () => finish(new Error('Unable to render the export watermark.'))
    image.src = source
  })

/** Encodes a detached snapshot without mutating the renderer or omitting its watermark. */
export async function createFileViewerCanvasImageBlob(
  snapshot: HTMLCanvasElement,
  format: 'png' | 'jpeg',
  watermark?: boolean | FileViewerWatermarkOptions,
  pixelRatio = 1
): Promise<Blob> {
  if (!['png', 'jpeg'].includes(format)) throw new Error('Unsupported image export format.')
  if (
    !(snapshot.width > 0 && snapshot.height > 0) ||
    snapshot.width * snapshot.height > 64_000_000
  ) {
    throw new Error('The image export size is empty or exceeds 64 million pixels.')
  }
  const document = snapshot.ownerDocument
  const canvas = document.createElement('canvas')
  canvas.width = snapshot.width
  canvas.height = snapshot.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A Canvas 2D context is required for image export.')
  if (format === 'jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(snapshot, 0, 0)
  let normalized = normalizeFileViewerWatermark(watermark)
  if (normalized) {
    if (normalized.image) {
      // SVG image documents do not load nested remote images. Inline the configured
      // watermark first; an unreadable/tainted image must fail, never disappear.
      const image = await loadImage(document, normalized.image)
      const tile = document.createElement('canvas')
      tile.width = image.naturalWidth
      tile.height = image.naturalHeight
      if (!tile.width || !tile.height || tile.width * tile.height > 16_000_000) {
        throw new Error('The watermark image size is invalid.')
      }
      const tileContext = tile.getContext('2d')
      if (!tileContext) throw new Error('Unable to render the export watermark.')
      tileContext.drawImage(image, 0, 0)
      normalized = { ...normalized, image: tile.toDataURL('image/png') }
    }
    const tile = await loadImage(
      document,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildFileViewerWatermarkSvg(normalized))}`
    )
    const pattern = context.createPattern(tile, 'repeat')
    if (!pattern) throw new Error('Unable to render the export watermark.')
    const scale = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1
    context.save()
    context.scale(scale, scale)
    context.fillStyle = pattern
    context.fillRect(0, 0, canvas.width / scale, canvas.height / scale)
    context.restore()
  }
  const mime = `image/${format}`
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob?.type === mime && blob.size > 0) resolve(blob)
        else reject(new Error(`Unable to encode ${format.toUpperCase()} output.`))
      },
      mime,
      0.92
    )
  })
}
