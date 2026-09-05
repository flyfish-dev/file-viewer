import { SaxesParser, type SaxesTagPlain } from 'saxes'
import type { IdmlSafetyLimits } from './idmlLimits.js'
import { streamIdmlZipEntry, type IdmlZipPreflight } from './idmlPreflight.js'

const POINTS_PER_INCH = 72
const BYTES_PER_PIXEL = 4
const IDAT_CHUNK_BYTES = 32 * 1024

export interface IdmlPageBounds {
  top: number
  left: number
  bottom: number
  right: number
  widthPoints: number
  heightPoints: number
  label: string
}

export interface IdmlPageRenderProjection {
  width: number
  height: number
  pixels: number
  rgbaBytes: number
  estimatedPngBytes: number
  projectedWorkingSetBytes: number
}

export class IdmlPageGeometryError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'IdmlPageGeometryError'
  }
}

const fail = (code: string, message: string): never => {
  throw new IdmlPageGeometryError(code, message)
}

const localName = (name: string) => name.split(':').pop() || name

const parseBounds = (value: string | undefined, path: string): IdmlPageBounds => {
  const values = (value || '').trim().split(/\s+/).map(Number)
  if (values.length !== 4 || values.some((entry) => !Number.isFinite(entry))) {
    return fail(
      'IDML_PAGE_GEOMETRY',
      `${path} contains a Page without four finite GeometricBounds coordinates.`
    )
  }
  const [top, left, bottom, right] = values
  const widthPoints = Math.abs(right - left)
  const heightPoints = Math.abs(bottom - top)
  if (!(widthPoints > 0) || !(heightPoints > 0)) {
    return fail('IDML_PAGE_GEOMETRY', `${path} contains an empty Page GeometricBounds rectangle.`)
  }
  return { top, left, bottom, right, widthPoints, heightPoints, label: '' }
}

const parseXmlEntry = async (
  source: Uint8Array,
  archive: IdmlZipPreflight,
  path: string,
  onOpenTag: (tag: SaxesTagPlain) => void,
  signal?: AbortSignal
) => {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const parser = new SaxesParser({ xmlns: false, position: false, fileName: path })
  parser.on('error', (error) => {
    throw error
  })
  parser.on('doctype', () =>
    fail('IDML_PAGE_GEOMETRY_XML', `${path} contains a forbidden DTD or ENTITY declaration.`)
  )
  parser.on('processinginstruction', (instruction) => {
    if (instruction.target.toLowerCase() === 'xml-stylesheet') {
      fail(
        'IDML_PAGE_GEOMETRY_XML',
        `${path} contains an external-capable XML stylesheet instruction.`
      )
    }
  })
  parser.on('opentag', onOpenTag)
  try {
    await streamIdmlZipEntry(
      source,
      archive,
      path,
      (chunk) => parser.write(decoder.decode(chunk, { stream: true })),
      signal
    )
    parser.write(decoder.decode()).close()
  } catch (error) {
    if (error instanceof IdmlPageGeometryError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof Error && 'code' in error) throw error
    throw new IdmlPageGeometryError(
      'IDML_PAGE_GEOMETRY_XML',
      `${path} could not be parsed for page geometry: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Reads the authoritative Page GeometricBounds from the spread XML referenced
 * by designmap.xml. The operation is streaming and completes before the WASM
 * Inspector is constructed, so render budgets do not depend on raster output.
 */
export const inspectIdmlPageBounds = async (
  source: Uint8Array,
  archive: IdmlZipPreflight,
  limits: IdmlSafetyLimits,
  signal?: AbortSignal
) => {
  const spreadPaths: string[] = []
  const seenPaths = new Set<string>()
  await parseXmlEntry(
    source,
    archive,
    'designmap.xml',
    (tag) => {
      if (localName(tag.name) !== 'Spread') return
      const path = tag.attributes.src
      if (!path || !/^Spreads\/[^/]+\.xml$/.test(path)) {
        fail(
          'IDML_PAGE_GEOMETRY',
          'designmap.xml contains an invalid or missing packaged Spread reference.'
        )
      }
      if (seenPaths.has(path)) {
        fail('IDML_PAGE_GEOMETRY', `designmap.xml references ${JSON.stringify(path)} twice.`)
      }
      if (spreadPaths.length >= limits.maxPages) {
        fail(
          'IDML_PAGE_GEOMETRY',
          `designmap.xml exceeds the ${limits.maxPages}-spread page-geometry limit.`
        )
      }
      if (!archive.entries.some((entry) => entry.path === path)) {
        fail('IDML_REQUIRED_ENTRY', `Referenced IDML spread ${JSON.stringify(path)} is missing.`)
      }
      seenPaths.add(path)
      spreadPaths.push(path)
    },
    signal
  )
  if (spreadPaths.length === 0) {
    fail('IDML_PAGE_GEOMETRY', 'designmap.xml does not reference any document spreads.')
  }

  const result: IdmlPageBounds[][] = []
  let pageCount = 0
  for (const path of spreadPaths) {
    const pages: IdmlPageBounds[] = []
    await parseXmlEntry(
      source,
      archive,
      path,
      (tag) => {
        if (localName(tag.name) !== 'Page') return
        pageCount += 1
        if (pageCount > limits.maxPages) {
          fail(
            'IDML_PAGE_GEOMETRY',
            `IDML spread XML exceeds the ${limits.maxPages}-page geometry limit.`
          )
        }
        const bounds = parseBounds(tag.attributes.GeometricBounds, path)
        bounds.label = (tag.attributes.Name || '').slice(0, 512)
        pages.push(bounds)
      },
      signal
    )
    if (pages.length === 0) {
      fail('IDML_PAGE_GEOMETRY', `${path} does not contain any Page geometry.`)
    }
    result.push(pages)
  }
  return result
}

const safeProduct = (left: number, right: number, label: string) => {
  const product = left * right
  if (!Number.isSafeInteger(product)) {
    return fail('IDML_RENDER_DIMENSION_LIMIT', `${label} exceeds JavaScript's safe integer range.`)
  }
  return product
}

// zlib's documented compressBound formula, expressed without 32-bit bitwise
// truncation. PNG encoders may split IDAT, so include one chunk frame per 32 KiB.
const boundedDeflateBytes = (sourceBytes: number) =>
  sourceBytes +
  Math.floor(sourceBytes / 4_096) +
  Math.floor(sourceBytes / 16_384) +
  Math.floor(sourceBytes / 33_554_432) +
  13

export const projectIdmlPageRender = (
  bounds: IdmlPageBounds,
  dpi: number,
  limits: IdmlSafetyLimits
): IdmlPageRenderProjection => {
  const scale = dpi / POINTS_PER_INCH
  const width = Math.ceil(bounds.widthPoints * scale)
  const height = Math.ceil(bounds.heightPoints * scale)
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > limits.maxRenderedDimension ||
    height > limits.maxRenderedDimension
  ) {
    return fail(
      'IDML_RENDER_DIMENSION_LIMIT',
      `IDML page projects to ${width} x ${height} pixels at ${dpi} DPI, exceeding the ${limits.maxRenderedDimension}-pixel width/height safety limit.`
    )
  }
  const pixels = safeProduct(width, height, 'IDML rendered pixel count')
  if (pixels > limits.maxRenderedPixels) {
    return fail(
      'IDML_RENDER_PIXEL_LIMIT',
      `IDML page projects to ${pixels} pixels (${width} x ${height}) at ${dpi} DPI, exceeding the ${limits.maxRenderedPixels}-pixel safety limit.`
    )
  }
  const rowBytes = safeProduct(width, BYTES_PER_PIXEL, 'IDML rendered row byte count')
  const scanlineBytes = safeProduct(rowBytes + 1, height, 'IDML PNG scanline byte count')
  const estimatedIdatBytes = boundedDeflateBytes(scanlineBytes)
  const idatChunks = Math.max(1, Math.ceil(estimatedIdatBytes / IDAT_CHUNK_BYTES))
  const estimatedPngBytes =
    8 + // PNG signature
    25 + // IHDR length, type, payload, and CRC
    estimatedIdatBytes +
    idatChunks * 12 + // IDAT length, type, and CRC per bounded chunk
    12 // IEND
  if (!Number.isSafeInteger(estimatedPngBytes) || estimatedPngBytes > limits.maxRenderedPngBytes) {
    return fail(
      'IDML_RENDER_PNG_LIMIT',
      `IDML page projects to a worst-case ${estimatedPngBytes}-byte PNG, exceeding the ${limits.maxRenderedPngBytes}-byte safety limit.`
    )
  }
  const rgbaBytes = safeProduct(pixels, BYTES_PER_PIXEL, 'IDML rendered RGBA byte count')
  const projectedWorkingSetBytes =
    estimatedPngBytes + estimatedIdatBytes + rgbaBytes * 3 + (rowBytes + 1) * 2
  if (
    !Number.isSafeInteger(projectedWorkingSetBytes) ||
    projectedWorkingSetBytes > limits.maxRenderWorkingSetBytes
  ) {
    return fail(
      'IDML_RENDER_WORKING_SET_LIMIT',
      `IDML page projects to a ${projectedWorkingSetBytes}-byte render/decode working set, exceeding the ${limits.maxRenderWorkingSetBytes}-byte safety limit.`
    )
  }
  return { width, height, pixels, rgbaBytes, estimatedPngBytes, projectedWorkingSetBytes }
}
