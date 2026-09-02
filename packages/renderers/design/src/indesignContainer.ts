import { inspectEmbeddedRaster, type EmbeddedRasterInfo } from './xdImage.js'

export interface InDesignContainerLimits {
  maxFileBytes: number
  maxDatabasePages: number
  maxContiguousObjects: number
  maxObjectBytes: number
  maxXmpBytes: number
  maxPreviewCandidates: number
  maxPreviewBytes: number
  maxPreviewDimension: number
  maxPreviewPixels: number
}

export const DEFAULT_INDESIGN_CONTAINER_LIMITS: Readonly<InDesignContainerLimits> = Object.freeze({
  maxFileBytes: 256 * 1024 * 1024,
  maxDatabasePages: 65_536,
  maxContiguousObjects: 8_192,
  maxObjectBytes: 64 * 1024 * 1024,
  maxXmpBytes: 12 * 1024 * 1024,
  maxPreviewCandidates: 64,
  maxPreviewBytes: 24 * 1024 * 1024,
  maxPreviewDimension: 16_384,
  maxPreviewPixels: 64_000_000,
})

export interface InDesignContainerHeader {
  kind: 'indd' | 'indt'
  formatVersion: number
  streamByteOrder: 'little-endian' | 'big-endian'
  activeMasterPage: 1 | 2
  activeSequence: string
  databasePages: number
  contiguousObjectOffset: number
  fileBytes: number
}

export interface InDesignEmbeddedPreview extends EmbeddedRasterInfo {
  source: 'xmp-thumbnail'
  bytes: Uint8Array
  declaredFormat?: string
}

export interface InDesignDocumentPreview {
  format: 'indd' | 'indt'
  status: 'preview' | 'metadata-only' | 'structure-only' | 'unsupported-structure'
  header: InDesignContainerHeader
  contiguousObjectCount: number
  xmpPacketCount: number
  xmp?: string
  preview?: InDesignEmbeddedPreview
  unsupportedReason?: string
  warnings: readonly string[]
}

const MASTER_PAGE_BYTES = 4_096
const MASTER_PAGE_GUID = Uint8Array.from([
  0x06, 0x06, 0xed, 0xf5, 0xd8, 0x1d, 0x46, 0xe5, 0xbd, 0x31, 0xef, 0xe7, 0xfe, 0x74, 0xb7, 0x1d,
])
const OBJECT_HEADER_GUID = Uint8Array.from([
  0xde, 0x39, 0x39, 0x79, 0x51, 0x88, 0x4b, 0x6c, 0x8e, 0x63, 0xee, 0xf8, 0xae, 0xe0, 0xdd, 0x38,
])
const OBJECT_TRAILER_GUID = Uint8Array.from([
  0xfd, 0xce, 0xdb, 0x70, 0xf7, 0x86, 0x4b, 0x4f, 0xa4, 0xd3, 0xc7, 0x28, 0xb3, 0x41, 0x71, 0x06,
])
const DOCUMENT_ASCII = 'DOCUMENT'
const XPACKET_ID = 'W5M0MpCehiHzreSzNTczkc9d'
const XMP_GRAPHICS_IMAGE_NAMESPACE = 'http://ns.adobe.com/xap/1.0/g/img/'
const RDF_NAMESPACE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

const positiveInteger = (value: number | undefined, fallback: number) => {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

export const resolveInDesignContainerLimits = (
  overrides?: Partial<InDesignContainerLimits>
): InDesignContainerLimits => ({
  maxFileBytes: positiveInteger(overrides?.maxFileBytes, DEFAULT_INDESIGN_CONTAINER_LIMITS.maxFileBytes),
  maxDatabasePages: positiveInteger(overrides?.maxDatabasePages, DEFAULT_INDESIGN_CONTAINER_LIMITS.maxDatabasePages),
  maxContiguousObjects: positiveInteger(
    overrides?.maxContiguousObjects,
    DEFAULT_INDESIGN_CONTAINER_LIMITS.maxContiguousObjects
  ),
  maxObjectBytes: positiveInteger(overrides?.maxObjectBytes, DEFAULT_INDESIGN_CONTAINER_LIMITS.maxObjectBytes),
  maxXmpBytes: positiveInteger(overrides?.maxXmpBytes, DEFAULT_INDESIGN_CONTAINER_LIMITS.maxXmpBytes),
  maxPreviewCandidates: positiveInteger(
    overrides?.maxPreviewCandidates,
    DEFAULT_INDESIGN_CONTAINER_LIMITS.maxPreviewCandidates
  ),
  maxPreviewBytes: positiveInteger(overrides?.maxPreviewBytes, DEFAULT_INDESIGN_CONTAINER_LIMITS.maxPreviewBytes),
  maxPreviewDimension: positiveInteger(
    overrides?.maxPreviewDimension,
    DEFAULT_INDESIGN_CONTAINER_LIMITS.maxPreviewDimension
  ),
  maxPreviewPixels: positiveInteger(
    overrides?.maxPreviewPixels,
    DEFAULT_INDESIGN_CONTAINER_LIMITS.maxPreviewPixels
  ),
})

const bytesEqual = (bytes: Uint8Array, offset: number, expected: Uint8Array) => {
  if (offset < 0 || offset > bytes.byteLength - expected.byteLength) return false
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false
  }
  return true
}

const asciiAt = (bytes: Uint8Array, offset: number, value: string) => {
  if (offset < 0 || offset > bytes.byteLength - value.length) return false
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false
  }
  return true
}

const requireRange = (offset: number, length: number, total: number, label: string) => {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > total - length
  ) {
    throw new Error(`${label} points outside the InDesign container.`)
  }
}

const readSequence = (view: DataView, offset: number) => {
  const low = view.getUint32(offset, true)
  const high = view.getUint32(offset + 4, true)
  return (BigInt(high) << 32n) | BigInt(low)
}

const inspectMasterPage = (bytes: Uint8Array, view: DataView, offset: number, label: string) => {
  requireRange(offset, MASTER_PAGE_BYTES, bytes.byteLength, label)
  if (!bytesEqual(bytes, offset, MASTER_PAGE_GUID) || !asciiAt(bytes, offset + 16, DOCUMENT_ASCII)) {
    throw new Error(`${label} has an invalid InDesign DOCUMENT signature.`)
  }
  return {
    streamByteOrderByte: bytes[offset + 24],
    sequence: readSequence(view, offset + 264),
    databasePages: view.getUint32(offset + 280, true),
  }
}

export const inspectInDesignContainer = (
  buffer: ArrayBuffer,
  kind: 'indd' | 'indt' = 'indd',
  overrides?: Partial<InDesignContainerLimits>
): InDesignContainerHeader => {
  const limits = resolveInDesignContainerLimits(overrides)
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`InDesign file is ${buffer.byteLength} bytes, exceeding the ${limits.maxFileBytes}-byte limit.`)
  }
  if (buffer.byteLength < MASTER_PAGE_BYTES * 2) throw new Error('InDesign file does not contain both master pages.')
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  if (!bytesEqual(bytes, 0, MASTER_PAGE_GUID) && asciiAt(bytes, 92, DOCUMENT_ASCII)) {
    throw new Error('Legacy InDesign 1.x DOCUMENT container recognized; the GUID/master-page reader supports InDesign 2 and later.')
  }
  const first = inspectMasterPage(bytes, view, 0, 'InDesign master page 1')
  const second = inspectMasterPage(bytes, view, MASTER_PAGE_BYTES, 'InDesign master page 2')
  const activeMasterPage = second.sequence > first.sequence ? 2 : 1
  const active = activeMasterPage === 2 ? second : first
  if (active.streamByteOrderByte !== 1 && active.streamByteOrderByte !== 2) {
    throw new Error(`InDesign active master page declares invalid stream byte order ${active.streamByteOrderByte}.`)
  }
  if (active.databasePages < 2 || active.databasePages > limits.maxDatabasePages) {
    throw new Error(`InDesign database page count ${active.databasePages} is outside the safety range.`)
  }
  const contiguousObjectOffset = active.databasePages * MASTER_PAGE_BYTES
  if (!Number.isSafeInteger(contiguousObjectOffset) || contiguousObjectOffset > buffer.byteLength) {
    throw new Error('InDesign database page count points beyond the file.')
  }
  const littleEndian = active.streamByteOrderByte === 1
  return {
    kind,
    formatVersion: view.getUint32((activeMasterPage - 1) * MASTER_PAGE_BYTES + 29, littleEndian),
    streamByteOrder: littleEndian ? 'little-endian' : 'big-endian',
    activeMasterPage,
    activeSequence: active.sequence.toString(),
    databasePages: active.databasePages,
    contiguousObjectOffset,
    fileBytes: buffer.byteLength,
  }
}

const isZeroPadding = (bytes: Uint8Array, offset: number) => {
  const end = Math.min(bytes.byteLength, offset + 32)
  if (end === offset) return true
  for (let index = offset; index < end; index += 1) if (bytes[index] !== 0) return false
  return true
}

const decodeXmpPacket = (bytes: Uint8Array) => {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return
  }
  const start = new RegExp(`^<\\?xpacket begin=(["'])\\uFEFF\\1 id=(["'])${XPACKET_ID}\\2`).test(text)
  if (!start || !/<\?xpacket end=(["'])[rw]\1\s*\?>\s*$/.test(text)) return
  return text
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const collectNamespaces = (xmp: string) => {
  const namespaces = new Map<string, string>()
  const pattern = /xmlns:([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(["'])([^"']+)\2/g
  for (const match of xmp.matchAll(pattern)) namespaces.set(match[1], match[3])
  return namespaces
}

const extractElementText = (xml: string, prefix: string, localName: string) => {
  const qualifiedName = `${escapeRegExp(prefix)}:${escapeRegExp(localName)}`
  const match = new RegExp(`<${qualifiedName}\\b[^>]*>([\\s\\S]*?)<\\/${qualifiedName}\\s*>`, 'i').exec(xml)
  return match?.[1]?.trim()
}

const decodeBase64Bounded = (value: string, maxBytes: number) => {
  const xmlWhitespaceDecoded = value.replace(/&#(?:x0*(?:9|a|d|20)|0*(?:9|10|13|32));/gi, ' ')
  if (xmlWhitespaceDecoded.includes('&')) return
  const compact = xmlWhitespaceDecoded.replace(/[\t\n\r ]+/g, '')
  if (
    compact.length === 0 ||
    compact.length > Math.ceil(maxBytes / 3) * 4 + 4 ||
    compact.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)
  ) return
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0
  const decodedLength = (compact.length / 4) * 3 - padding
  if (decodedLength <= 0 || decodedLength > maxBytes) return
  const output = new Uint8Array(decodedLength)
  let written = 0
  for (let offset = 0; offset < compact.length; offset += 4) {
    const a = alphabet.indexOf(compact[offset])
    const b = alphabet.indexOf(compact[offset + 1])
    const c = compact[offset + 2] === '=' ? 0 : alphabet.indexOf(compact[offset + 2])
    const d = compact[offset + 3] === '=' ? 0 : alphabet.indexOf(compact[offset + 3])
    const packed = (a << 18) | (b << 12) | (c << 6) | d
    if (written < decodedLength) output[written++] = (packed >>> 16) & 0xff
    if (written < decodedLength) output[written++] = (packed >>> 8) & 0xff
    if (written < decodedLength) output[written++] = packed & 0xff
  }
  return output
}

const extractXmpPreviews = (
  xmp: string,
  limits: InDesignContainerLimits,
  warnings: string[]
) => {
  const namespaces = collectNamespaces(xmp)
  const imagePrefix = [...namespaces.entries()].find(([, uri]) => uri === XMP_GRAPHICS_IMAGE_NAMESPACE)?.[0]
  const rdfPrefix = [...namespaces.entries()].find(([, uri]) => uri === RDF_NAMESPACE)?.[0]
  if (!imagePrefix || !rdfPrefix) return
  const liPattern = new RegExp(
    `<${escapeRegExp(rdfPrefix)}:li\\b[^>]*>[\\s\\S]*?<\\/${escapeRegExp(rdfPrefix)}:li\\s*>`,
    'gi'
  )
  let selected: InDesignEmbeddedPreview | undefined
  let candidates = 0
  for (const match of xmp.matchAll(liPattern)) {
    if (candidates >= limits.maxPreviewCandidates) {
      warnings.push(`Stopped reading XMP thumbnails at the ${limits.maxPreviewCandidates}-candidate limit.`)
      break
    }
    const imageText = extractElementText(match[0], imagePrefix, 'image')
    if (!imageText) continue
    candidates += 1
    const declaredFormat = extractElementText(match[0], imagePrefix, 'format')
    const expectedMime = declaredFormat?.toLowerCase() === 'png'
      ? 'image/png'
      : declaredFormat?.toLowerCase() === 'jpeg' || declaredFormat?.toLowerCase() === 'jpg'
        ? 'image/jpeg'
        : undefined
    if (!expectedMime) {
      warnings.push(`Skipped XMP thumbnail with unsupported declared format ${JSON.stringify(declaredFormat || 'missing')}.`)
      continue
    }
    const bytes = decodeBase64Bounded(imageText, limits.maxPreviewBytes)
    if (!bytes) {
      warnings.push('Skipped an invalid or oversized XMP thumbnail payload.')
      continue
    }
    try {
      const info = inspectEmbeddedRaster(bytes, expectedMime, {
        maxBytes: limits.maxPreviewBytes,
        maxDimension: limits.maxPreviewDimension,
        maxPixels: limits.maxPreviewPixels,
      })
      const declaredWidth = Number(extractElementText(match[0], imagePrefix, 'width'))
      const declaredHeight = Number(extractElementText(match[0], imagePrefix, 'height'))
      if (
        (Number.isFinite(declaredWidth) && declaredWidth > 0 && declaredWidth !== info.width) ||
        (Number.isFinite(declaredHeight) && declaredHeight > 0 && declaredHeight !== info.height)
      ) warnings.push('An XMP thumbnail declared dimensions that did not match its raster header; the raster header was used.')
      if (!selected || info.width * info.height > selected.width * selected.height) {
        selected = { ...info, source: 'xmp-thumbnail', bytes, declaredFormat }
      }
    } catch (error) {
      warnings.push(`Skipped malformed XMP thumbnail: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return selected
}

export const readInDesignContainer = (
  buffer: ArrayBuffer,
  kind: 'indd' | 'indt' = 'indd',
  overrides?: Partial<InDesignContainerLimits>
): InDesignDocumentPreview => {
  const limits = resolveInDesignContainerLimits(overrides)
  const header = inspectInDesignContainer(buffer, kind, limits)
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const streamLittleEndian = header.streamByteOrder === 'little-endian'
  const warnings: string[] = []
  let offset = header.contiguousObjectOffset
  let contiguousObjectCount = 0
  let xmpPacketCount = 0
  let selectedXmp: string | undefined
  let unsupportedReason: string | undefined
  while (offset < bytes.byteLength) {
    if (isZeroPadding(bytes, offset)) break
    if (bytes.byteLength - offset < 32) {
      unsupportedReason = `InDesign contiguous data at offset ${offset} has a truncated object header.`
      break
    }
    if (!bytesEqual(bytes, offset, OBJECT_HEADER_GUID)) {
      unsupportedReason = `InDesign contiguous data at offset ${offset} is not a supported object header.`
      break
    }
    contiguousObjectCount += 1
    if (contiguousObjectCount > limits.maxContiguousObjects) {
      throw new Error(`InDesign exceeds the ${limits.maxContiguousObjects}-object contiguous-stream limit.`)
    }
    const objectBytes = view.getUint32(offset + 24, true)
    if (objectBytes > limits.maxObjectBytes) {
      throw new Error(`InDesign contiguous object ${contiguousObjectCount} exceeds ${limits.maxObjectBytes} bytes.`)
    }
    const dataOffset = offset + 32
    const trailerOffset = dataOffset + objectBytes
    requireRange(dataOffset, objectBytes + 32, bytes.byteLength, `InDesign contiguous object ${contiguousObjectCount}`)
    if (!bytesEqual(bytes, trailerOffset, OBJECT_TRAILER_GUID)) {
      unsupportedReason = `InDesign contiguous object ${contiguousObjectCount} has an invalid trailer.`
      break
    }
    for (let index = 0; index < 8; index += 1) {
      if (bytes[offset + 16 + index] !== bytes[trailerOffset + 16 + index]) {
        unsupportedReason = `InDesign contiguous object ${contiguousObjectCount} header/trailer identity does not match.`
        break
      }
    }
    if (unsupportedReason) break
    if (objectBytes > 56) {
      const declaredXmpBytes = view.getUint32(dataOffset, streamLittleEndian)
      if (declaredXmpBytes > limits.maxXmpBytes) {
        warnings.push(`Ignored an InDesign XMP candidate larger than ${limits.maxXmpBytes} bytes.`)
      } else if (declaredXmpBytes > 0 && declaredXmpBytes <= objectBytes - 4) {
        const xmp = decodeXmpPacket(bytes.subarray(dataOffset + 4, dataOffset + 4 + declaredXmpBytes))
        if (xmp) {
          xmpPacketCount += 1
          selectedXmp = xmp
        }
      }
    }
    offset = trailerOffset + 32
  }

  const preview = selectedXmp ? extractXmpPreviews(selectedXmp, limits, warnings) : undefined
  if (selectedXmp && !preview) {
    warnings.push('The verified InDesign XMP object contains no valid bounded JPEG/PNG thumbnail.')
  }
  if (!selectedXmp) {
    warnings.push(
      'No XMP packet was found through the declared database-page and contiguous-object structure; binary image signatures were not scanned.'
    )
  }
  const status: InDesignDocumentPreview['status'] = unsupportedReason
    ? 'unsupported-structure'
    : preview
      ? 'preview'
      : selectedXmp
        ? 'metadata-only'
        : 'structure-only'
  return {
    format: kind,
    status,
    header,
    contiguousObjectCount,
    xmpPacketCount,
    xmp: selectedXmp,
    preview,
    unsupportedReason,
    warnings,
  }
}
