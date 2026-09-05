export interface EmbeddedRasterLimits {
  maxBytes: number
  maxDimension: number
  maxPixels: number
}

export interface EmbeddedRasterInfo {
  mimeType: 'image/png' | 'image/jpeg'
  width: number
  height: number
  byteLength: number
}

const requireImageBounds = (bytes: Uint8Array, width: number, height: number, limits: EmbeddedRasterLimits) => {
  if (bytes.byteLength === 0 || bytes.byteLength > limits.maxBytes) {
    throw new Error(`Embedded preview is outside the 1-${limits.maxBytes} byte safety range.`)
  }
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > limits.maxDimension ||
    height > limits.maxDimension ||
    width > Math.floor(limits.maxPixels / height)
  ) {
    throw new Error(`Embedded preview dimensions ${width} x ${height} exceed the raster safety limit.`)
  }
}

const isPng = (bytes: Uint8Array) => {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return bytes.byteLength >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

const inspectPng = (bytes: Uint8Array, limits: EmbeddedRasterLimits): EmbeddedRasterInfo => {
  if (bytes.byteLength < 45) throw new Error('Embedded PNG preview is truncated.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  let width = 0
  let height = 0
  let sawIdat = false
  let sawIend = false
  while (offset < bytes.byteLength) {
    if (offset > bytes.byteLength - 12) throw new Error('Embedded PNG chunk header is truncated.')
    const length = view.getUint32(offset, false)
    if (length > bytes.byteLength - offset - 12) throw new Error('Embedded PNG chunk exceeds the preview bytes.')
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) throw new Error('Embedded PNG does not begin with a valid IHDR chunk.')
      width = view.getUint32(offset + 8, false)
      height = view.getUint32(offset + 12, false)
      const bitDepth = bytes[offset + 16]
      const colorType = bytes[offset + 17]
      const allowedDepths: Readonly<Record<number, readonly number[]>> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      }
      if (
        !allowedDepths[colorType]?.includes(bitDepth) ||
        bytes[offset + 18] !== 0 ||
        bytes[offset + 19] !== 0 ||
        (bytes[offset + 20] !== 0 && bytes[offset + 20] !== 1)
      ) {
        throw new Error('Embedded PNG uses an invalid IHDR encoding.')
      }
    } else if (/^[A-Z]/.test(type) && !['PLTE', 'IDAT', 'IEND'].includes(type)) {
      throw new Error(`Embedded PNG uses unknown critical chunk ${JSON.stringify(type)}.`)
    }
    if (type === 'IDAT') sawIdat = true
    if (type === 'IEND') {
      if (length !== 0 || !sawIdat) throw new Error('Embedded PNG has an invalid IEND or no IDAT data.')
      sawIend = true
      offset += 12
      break
    }
    offset += 12 + length
  }
  if (!sawIend || offset !== bytes.byteLength) throw new Error('Embedded PNG has no terminal IEND or contains trailing bytes.')
  requireImageBounds(bytes, width, height, limits)
  return { mimeType: 'image/png', width, height, byteLength: bytes.byteLength }
}

const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

const inspectJpeg = (bytes: Uint8Array, limits: EmbeddedRasterLimits): EmbeddedRasterInfo => {
  if (bytes.byteLength < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Embedded JPEG preview has an invalid SOI marker.')
  }
  if (bytes[bytes.byteLength - 2] !== 0xff || bytes[bytes.byteLength - 1] !== 0xd9) {
    throw new Error('Embedded JPEG preview has no terminal EOI marker or contains trailing bytes.')
  }
  let offset = 2
  let width = 0
  let height = 0
  while (offset < bytes.byteLength - 2) {
    if (bytes[offset] !== 0xff) throw new Error('Embedded JPEG marker stream is malformed.')
    while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1
    if (offset >= bytes.byteLength) throw new Error('Embedded JPEG marker is truncated.')
    const marker = bytes[offset]
    offset += 1
    if (marker === 0xd9) break
    if (marker === 0xda) {
      if (width === 0 || height === 0) throw new Error('Embedded JPEG reached scan data before a supported SOF marker.')
      break
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset > bytes.byteLength - 2) throw new Error('Embedded JPEG segment length is truncated.')
    const length = (bytes[offset] << 8) | bytes[offset + 1]
    if (length < 2 || offset > bytes.byteLength - length) throw new Error('Embedded JPEG segment exceeds the preview bytes.')
    if (SOF_MARKERS.has(marker)) {
      if (length < 8) throw new Error('Embedded JPEG SOF segment is truncated.')
      height = (bytes[offset + 3] << 8) | bytes[offset + 4]
      width = (bytes[offset + 5] << 8) | bytes[offset + 6]
    }
    offset += length
  }
  if (width === 0 || height === 0) throw new Error('Embedded JPEG contains no supported frame header.')
  requireImageBounds(bytes, width, height, limits)
  return { mimeType: 'image/jpeg', width, height, byteLength: bytes.byteLength }
}

export const inspectEmbeddedRaster = (
  bytes: Uint8Array,
  expectedMimeType: string | undefined,
  limits: EmbeddedRasterLimits
): EmbeddedRasterInfo => {
  const info = isPng(bytes) ? inspectPng(bytes, limits) : inspectJpeg(bytes, limits)
  if (expectedMimeType && expectedMimeType.toLowerCase() !== info.mimeType) {
    throw new Error(`Embedded preview declares ${expectedMimeType} but contains ${info.mimeType}.`)
  }
  return info
}
