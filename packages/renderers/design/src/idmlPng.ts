import type { IdmlSafetyLimits } from './idmlLimits.js'

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
const BYTES_PER_PIXEL = 4
const MAX_PNG_CHUNKS = 100_000

export class IdmlPngError extends Error {
  readonly code = 'IDML_PNG_INVALID'

  constructor(message: string) {
    super(message)
    this.name = 'IdmlPngError'
  }
}

const requireRange = (offset: number, length: number, total: number, label: string) => {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > total ||
    length > total - offset
  ) {
    throw new IdmlPngError(`${label} points outside the Inspector PNG.`)
  }
}

let crcTable: Uint32Array | undefined

const getCrcTable = () => {
  if (crcTable) return crcTable
  crcTable = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb8_8320 ^ (value >>> 1) : value >>> 1
    }
    crcTable[index] = value >>> 0
  }
  return crcTable
}

const crc32 = (type: Uint8Array, payload: Uint8Array) => {
  const table = getCrcTable()
  let crc = 0xffff_ffff
  for (const bytes of [type, payload]) {
    for (let index = 0; index < bytes.byteLength; index += 1) {
      crc = table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
    }
  }
  return (crc ^ 0xffff_ffff) >>> 0
}

const ascii = (bytes: Uint8Array) => String.fromCharCode(...bytes)

interface ParsedInspectorPng {
  width: number
  height: number
  expectedInflatedBytes: number
  idat: Uint8Array
}

const parseInspectorPng = (png: Uint8Array, limits: IdmlSafetyLimits): ParsedInspectorPng => {
  if (png.byteLength > limits.maxRenderedPngBytes) {
    throw new IdmlPngError(
      `Inspector PNG exceeds the ${limits.maxRenderedPngBytes}-byte safety limit.`
    )
  }
  requireRange(0, PNG_SIGNATURE.byteLength, png.byteLength, 'PNG signature')
  for (let index = 0; index < PNG_SIGNATURE.byteLength; index += 1) {
    if (png[index] !== PNG_SIGNATURE[index])
      throw new IdmlPngError('Inspector render did not return a PNG image.')
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const idatChunks: Uint8Array[] = []
  let idatBytes = 0
  let width = 0
  let height = 0
  let sawHeader = false
  let sawEnd = false
  let offset = PNG_SIGNATURE.byteLength
  let chunkCount = 0
  while (offset < png.byteLength) {
    chunkCount += 1
    if (chunkCount > MAX_PNG_CHUNKS)
      throw new IdmlPngError('Inspector PNG contains too many chunks.')
    requireRange(offset, 12, png.byteLength, 'PNG chunk header')
    const length = view.getUint32(offset, false)
    const typeBytes = png.subarray(offset + 4, offset + 8)
    const type = ascii(typeBytes)
    const dataOffset = offset + 8
    requireRange(dataOffset, length + 4, png.byteLength, `PNG ${type} chunk`)
    const payload = png.subarray(dataOffset, dataOffset + length)
    const declaredCrc = view.getUint32(dataOffset + length, false)
    if (crc32(typeBytes, payload) !== declaredCrc)
      throw new IdmlPngError(`Inspector PNG ${type} CRC is invalid.`)
    if (chunkCount === 1 && type !== 'IHDR')
      throw new IdmlPngError('Inspector PNG does not start with IHDR.')
    if (type === 'IHDR') {
      if (sawHeader || length !== 13)
        throw new IdmlPngError('Inspector PNG has an invalid IHDR chunk.')
      width = view.getUint32(dataOffset, false)
      height = view.getUint32(dataOffset + 4, false)
      const bitDepth = view.getUint8(dataOffset + 8)
      const colorType = view.getUint8(dataOffset + 9)
      const compression = view.getUint8(dataOffset + 10)
      const filter = view.getUint8(dataOffset + 11)
      const interlace = view.getUint8(dataOffset + 12)
      if (
        width === 0 ||
        height === 0 ||
        bitDepth !== 8 ||
        colorType !== 6 ||
        compression !== 0 ||
        filter !== 0 ||
        interlace !== 0
      ) {
        throw new IdmlPngError('Inspector PNG must be non-interlaced 8-bit RGBA.')
      }
      const pixels = width * height
      if (!Number.isSafeInteger(pixels) || pixels > limits.maxRenderedPixels) {
        throw new IdmlPngError(
          `Inspector PNG exceeds the ${limits.maxRenderedPixels}-pixel safety limit.`
        )
      }
      sawHeader = true
    } else if (type === 'IDAT') {
      if (!sawHeader || sawEnd)
        throw new IdmlPngError('Inspector PNG has IDAT chunks in an invalid position.')
      idatBytes += payload.byteLength
      if (idatBytes > limits.maxRenderedPngBytes)
        throw new IdmlPngError('Inspector PNG IDAT data is oversized.')
      idatChunks.push(payload)
    } else if (type === 'IEND') {
      if (length !== 0 || sawEnd) throw new IdmlPngError('Inspector PNG has an invalid IEND chunk.')
      sawEnd = true
      offset = dataOffset + length + 4
      if (offset !== png.byteLength)
        throw new IdmlPngError('Inspector PNG has trailing bytes after IEND.')
      break
    } else if ((typeBytes[0] & 0x20) === 0) {
      throw new IdmlPngError(`Inspector PNG contains unsupported critical chunk ${type}.`)
    }
    offset = dataOffset + length + 4
  }
  if (!sawHeader || !sawEnd || idatChunks.length === 0) {
    throw new IdmlPngError('Inspector PNG is missing IHDR, IDAT, or IEND.')
  }
  const rowBytes = width * BYTES_PER_PIXEL
  const expectedInflatedBytes = (rowBytes + 1) * height
  if (!Number.isSafeInteger(expectedInflatedBytes))
    throw new IdmlPngError('Inspector PNG dimensions overflow.')
  const rgbaBytes = rowBytes * height
  const projectedWorkingSet = png.byteLength + idatBytes + rgbaBytes * 3 + (rowBytes + 1) * 2
  if (
    !Number.isSafeInteger(projectedWorkingSet) ||
    projectedWorkingSet > limits.maxRenderWorkingSetBytes
  ) {
    throw new IdmlPngError(
      `Inspector PNG projected working set exceeds the ${limits.maxRenderWorkingSetBytes}-byte safety limit.`
    )
  }
  const idat = new Uint8Array(idatBytes)
  let idatOffset = 0
  for (const chunk of idatChunks) {
    idat.set(chunk, idatOffset)
    idatOffset += chunk.byteLength
  }
  return { width, height, expectedInflatedBytes, idat }
}

const abortError = (signal: AbortSignal) => {
  if (signal.reason instanceof Error) return signal.reason
  return new DOMException('IDML page decoding was aborted.', 'AbortError')
}

const inflateRowsBounded = async (
  compressed: Uint8Array,
  width: number,
  height: number,
  signal?: AbortSignal
) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new IdmlPngError(
      'This browser does not provide the deflate decoder required for Inspector PNG output.'
    )
  }
  if (signal?.aborted) throw abortError(signal)
  const stream = new DecompressionStream('deflate')
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()
  const compressedChunk: Uint8Array<ArrayBuffer> =
    compressed.buffer instanceof ArrayBuffer
      ? new Uint8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength)
      : Uint8Array.from(compressed)
  const rowBytes = width * BYTES_PER_PIXEL
  const expectedBytes = (rowBytes + 1) * height
  const rgba = new Uint8ClampedArray(rowBytes * height)
  let total = 0
  let row = 0
  let rowPosition = 0
  let filter = 0
  const onAbort = () => {
    void reader.cancel(abortError(signal as AbortSignal)).catch(() => undefined)
    void writer.abort(abortError(signal as AbortSignal)).catch(() => undefined)
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  const read = (async () => {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      const chunk = next.value
      for (let index = 0; index < chunk.byteLength; index += 1) {
        if (total >= expectedBytes) {
          await reader.cancel('Inspector PNG expands beyond its declared dimensions.')
          throw new IdmlPngError('Inspector PNG expands beyond its declared dimensions.')
        }
        const source = chunk[index]
        if (rowPosition === 0) {
          filter = source
          if (filter > 4) {
            await reader.cancel(`Inspector PNG uses unknown row filter ${filter}.`)
            throw new IdmlPngError(`Inspector PNG uses unknown row filter ${filter}.`)
          }
        } else {
          const column = rowPosition - 1
          const rowOffset = row * rowBytes
          const previousOffset = rowOffset - rowBytes
          const left = column >= BYTES_PER_PIXEL ? rgba[rowOffset + column - BYTES_PER_PIXEL] : 0
          const up = row > 0 ? rgba[previousOffset + column] : 0
          const upLeft =
            row > 0 && column >= BYTES_PER_PIXEL
              ? rgba[previousOffset + column - BYTES_PER_PIXEL]
              : 0
          let value = source
          if (filter === 1) value += left
          else if (filter === 2) value += up
          else if (filter === 3) value += Math.floor((left + up) / 2)
          else if (filter === 4) value += paeth(left, up, upLeft)
          rgba[rowOffset + column] = value & 0xff
        }
        total += 1
        rowPosition += 1
        if (rowPosition === rowBytes + 1) {
          row += 1
          rowPosition = 0
        }
      }
    }
  })()
  try {
    await Promise.all([
      (async () => {
        await writer.write(compressedChunk)
        await writer.close()
      })(),
      read
    ])
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
  if (total !== expectedBytes)
    throw new IdmlPngError('Inspector PNG decompressed byte count is invalid.')
  return rgba
}

const paeth = (left: number, up: number, upLeft: number) => {
  const prediction = left + up - upLeft
  const leftDistance = Math.abs(prediction - left)
  const upDistance = Math.abs(prediction - up)
  const diagonalDistance = Math.abs(prediction - upLeft)
  if (leftDistance <= upDistance && leftDistance <= diagonalDistance) return left
  if (upDistance <= diagonalDistance) return up
  return upLeft
}

export const decodeIdmlInspectorPng = async (
  png: Uint8Array,
  limits: IdmlSafetyLimits,
  signal?: AbortSignal
) => {
  const parsed = parseInspectorPng(png, limits)
  const rgba = await inflateRowsBounded(parsed.idat, parsed.width, parsed.height, signal)
  if (signal?.aborted) throw abortError(signal)
  return { width: parsed.width, height: parsed.height, rgba }
}
