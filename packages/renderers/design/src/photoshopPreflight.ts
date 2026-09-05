import type { PhotoshopHeader } from './photoshopProtocol.js'

export interface PhotoshopContainerPreflight {
  compositeCompression: 0 | 1 | 2 | 3
  compositeDataOffset: number
  iccProfilePresent: boolean
  signedLayerCount: number | null
  mergedTransparencyPresent: boolean
}

const requireRange = (offset: number, length: number, total: number, label: string) => {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > total) {
    throw new Error(`${label} points outside the Photoshop file.`)
  }
}

const readUint64 = (view: DataView, offset: number, label: string) => {
  requireRange(offset, 8, view.byteLength, label)
  const upper = view.getUint32(offset, false)
  const lower = view.getUint32(offset + 4, false)
  if (upper >= 0x20_0000) throw new Error(`${label} exceeds JavaScript's safe integer range.`)
  return upper * 0x1_0000_0000 + lower
}

const skipUint32Section = (view: DataView, offset: number, label: string) => {
  requireRange(offset, 4, view.byteLength, `${label} length`)
  const length = view.getUint32(offset, false)
  requireRange(offset + 4, length, view.byteLength, label)
  return { start: offset + 4, end: offset + 4 + length }
}

const inspectImageResources = (view: DataView, start: number, end: number) => {
  let offset = start
  let iccProfilePresent = false
  while (offset < end) {
    requireRange(offset, 7, end, 'Photoshop image resource header')
    const signature = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    )
    if (signature !== '8BIM' && signature !== 'MeSa') {
      throw new Error(`Invalid Photoshop image resource signature ${JSON.stringify(signature)}.`)
    }
    const resourceId = view.getUint16(offset + 4, false)
    const nameLength = view.getUint8(offset + 6)
    const paddedNameBytes = (1 + nameLength + 1) & ~1
    const sizeOffset = offset + 6 + paddedNameBytes
    requireRange(sizeOffset, 4, end, 'Photoshop image resource size')
    const dataLength = view.getUint32(sizeOffset, false)
    const paddedDataLength = (dataLength + 1) & ~1
    const next = sizeOffset + 4 + paddedDataLength
    requireRange(sizeOffset + 4, paddedDataLength, end, 'Photoshop image resource data')
    if (resourceId === 1039 && dataLength > 0) iccProfilePresent = true
    offset = next
  }
  if (offset !== end) throw new Error('Photoshop image resources are not aligned to their declared boundary.')
  return iccProfilePresent
}

export const inspectPhotoshopContainer = (
  buffer: ArrayBuffer,
  header: PhotoshopHeader
): PhotoshopContainerPreflight => {
  const view = new DataView(buffer)
  let offset = 26
  const colorModeData = skipUint32Section(view, offset, 'Photoshop color mode data')
  offset = colorModeData.end
  const imageResources = skipUint32Section(view, offset, 'Photoshop image resources')
  const iccProfilePresent = inspectImageResources(view, imageResources.start, imageResources.end)
  offset = imageResources.end

  const lengthBytes = header.version === 1 ? 4 : 8
  requireRange(offset, lengthBytes, view.byteLength, 'Photoshop layer and mask length')
  const layerAndMaskLength = header.version === 1
    ? view.getUint32(offset, false)
    : readUint64(view, offset, 'Photoshop layer and mask length')
  offset += lengthBytes
  const layerAndMaskStart = offset
  requireRange(offset, layerAndMaskLength, view.byteLength, 'Photoshop layer and mask data')
  let signedLayerCount: number | null = null
  if (layerAndMaskLength > 0) {
    requireRange(layerAndMaskStart, lengthBytes, layerAndMaskStart + layerAndMaskLength, 'Photoshop layer info length')
    const layerInfoLength = header.version === 1
      ? view.getUint32(layerAndMaskStart, false)
      : readUint64(view, layerAndMaskStart, 'Photoshop layer info length')
    if (layerInfoLength > layerAndMaskLength - lengthBytes) {
      throw new Error('Photoshop layer info exceeds its layer and mask section.')
    }
    if (layerInfoLength > 0) {
      const layerInfoStart = layerAndMaskStart + lengthBytes
      requireRange(layerInfoStart, 2, layerInfoStart + layerInfoLength, 'Photoshop signed layer count')
      signedLayerCount = view.getInt16(layerInfoStart, false)
    }
  }
  offset += layerAndMaskLength
  requireRange(offset, 2, view.byteLength, 'Photoshop composite compression')
  const compression = view.getUint16(offset, false)
  if (compression < 0 || compression > 3) {
    throw new Error(`Invalid Photoshop composite compression method ${compression}.`)
  }
  return {
    compositeCompression: compression as 0 | 1 | 2 | 3,
    compositeDataOffset: offset + 2,
    iccProfilePresent,
    signedLayerCount,
    mergedTransparencyPresent: signedLayerCount != null && signedLayerCount < 0,
  }
}
