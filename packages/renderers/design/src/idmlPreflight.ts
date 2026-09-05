import type { IdmlSafetyLimits } from './idmlLimits.js'
import type { IdmlArchiveSummary } from './idmlProtocol.js'

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const DATA_DESCRIPTOR_SIGNATURE = 0x08074b50
const UTF8_FLAG = 1 << 11
const DATA_DESCRIPTOR_FLAG = 1 << 3
const ENCRYPTION_FLAGS = (1 << 0) | (1 << 6) | (1 << 13)
const IDML_MIMETYPE = 'application/vnd.adobe.indesign-idml-package'
const MAX_EOCD_SEARCH_BYTES = 65_557
const MAX_ENTRY_NAME_BYTES = 4_096

export type IdmlZipCompression = 'stored' | 'deflate'

export interface IdmlZipEntry {
  path: string
  compression: IdmlZipCompression
  compressedSize: number
  uncompressedSize: number
  crc32: number
  localHeaderOffset: number
  dataOffset: number
}

export interface IdmlZipPreflight extends IdmlArchiveSummary {
  fileBytes: number
  entries: IdmlZipEntry[]
}

export class IdmlPreflightError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'IdmlPreflightError'
  }
}

const fail = (code: string, message: string): never => {
  throw new IdmlPreflightError(code, message)
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
    fail('IDML_ZIP_RANGE', `${label} points outside the IDML package.`)
  }
}

const addSize = (left: number, right: number, label: string) => {
  const result = left + right
  if (!Number.isSafeInteger(result))
    fail('IDML_ZIP_RANGE', `${label} exceeds JavaScript's safe integer range.`)
  return result
}

const bytesEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.byteLength !== right.byteLength) return false
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

const decodeUtf8Path = (bytes: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return fail('IDML_ZIP_PATH', 'An IDML ZIP entry path is not valid UTF-8.')
  }
}

const decodeEntryPath = (bytes: Uint8Array, flags: number): string => {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_ENTRY_NAME_BYTES) {
    fail('IDML_ZIP_PATH', 'An IDML ZIP entry has an empty or oversized path.')
  }
  if ((flags & UTF8_FLAG) === 0 && bytes.some((byte) => byte > 0x7f)) {
    fail('IDML_ZIP_PATH', 'A non-UTF-8 IDML ZIP entry uses an ambiguous non-ASCII path.')
  }
  const path = decodeUtf8Path(bytes)
  if (
    path.includes('\0') ||
    path.includes('\\') ||
    path.startsWith('/') ||
    /^[A-Za-z]:/.test(path)
  ) {
    fail('IDML_ZIP_PATH', `Unsafe IDML ZIP entry path ${JSON.stringify(path)}.`)
  }
  const directory = path.endsWith('/')
  const segments = path.split('/')
  if (directory) segments.pop()
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail('IDML_ZIP_PATH', `Unsafe IDML ZIP entry path ${JSON.stringify(path)}.`)
  }
  return path
}

const findEndOfCentralDirectory = (view: DataView): number => {
  if (view.byteLength < 22)
    fail('IDML_ZIP_EOCD', 'The IDML package is too short to contain a ZIP directory.')
  const first = Math.max(0, view.byteLength - MAX_EOCD_SEARCH_BYTES)
  for (let offset = view.byteLength - 22; offset >= first; offset -= 1) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue
    const commentLength = view.getUint16(offset + 20, true)
    if (offset + 22 + commentLength === view.byteLength) return offset
  }
  return fail(
    'IDML_ZIP_EOCD',
    'The IDML ZIP end-of-central-directory record is missing or truncated.'
  )
}

const inspectExtraFields = (bytes: Uint8Array, label: string) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  while (offset < bytes.byteLength) {
    requireRange(offset, 4, bytes.byteLength, `${label} extra-field header`)
    const id = view.getUint16(offset, true)
    const length = view.getUint16(offset + 2, true)
    requireRange(offset + 4, length, bytes.byteLength, `${label} extra field`)
    if (id === 0x0001)
      fail(
        'IDML_ZIP64_UNSUPPORTED',
        'ZIP64 IDML packages are not accepted by this bounded renderer.'
      )
    if (id === 0x9901) fail('IDML_ZIP_ENCRYPTED', 'Encrypted IDML ZIP entries are not supported.')
    offset += 4 + length
  }
}

interface ParsedCentralEntry extends IdmlZipEntry {
  centralIndex: number
  flags: number
  method: number
  crc32: number
  rawName: Uint8Array
  localEnd: number
}

const compressionName = (method: number): IdmlZipCompression => {
  if (method === 0) return 'stored'
  if (method === 8) return 'deflate'
  return fail('IDML_ZIP_COMPRESSION', `Unsupported IDML ZIP compression method ${method}.`)
}

const verifyLocalEntry = (
  bytes: Uint8Array,
  view: DataView,
  centralDirectoryOffset: number,
  entry: Omit<ParsedCentralEntry, 'dataOffset' | 'localEnd'>
): Pick<ParsedCentralEntry, 'dataOffset' | 'localEnd'> => {
  requireRange(
    entry.localHeaderOffset,
    30,
    centralDirectoryOffset,
    `Local header for ${entry.path}`
  )
  if (view.getUint32(entry.localHeaderOffset, true) !== LOCAL_SIGNATURE) {
    fail('IDML_ZIP_LOCAL_HEADER', `The local header for ${JSON.stringify(entry.path)} is missing.`)
  }
  const flags = view.getUint16(entry.localHeaderOffset + 6, true)
  const method = view.getUint16(entry.localHeaderOffset + 8, true)
  if (flags !== entry.flags || method !== entry.method) {
    fail(
      'IDML_ZIP_LOCAL_HEADER',
      `The local and central headers disagree for ${JSON.stringify(entry.path)}.`
    )
  }
  const nameLength = view.getUint16(entry.localHeaderOffset + 26, true)
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true)
  const nameOffset = entry.localHeaderOffset + 30
  requireRange(
    nameOffset,
    nameLength + extraLength,
    centralDirectoryOffset,
    `Local path for ${entry.path}`
  )
  const localName = bytes.subarray(nameOffset, nameOffset + nameLength)
  if (!bytesEqual(localName, entry.rawName)) {
    fail(
      'IDML_ZIP_LOCAL_HEADER',
      `The local path does not match the central path for ${JSON.stringify(entry.path)}.`
    )
  }
  inspectExtraFields(
    bytes.subarray(nameOffset + nameLength, nameOffset + nameLength + extraLength),
    `Local header for ${entry.path}`
  )
  const dataOffset = nameOffset + nameLength + extraLength
  const dataEnd = addSize(dataOffset, entry.compressedSize, `Compressed payload for ${entry.path}`)
  requireRange(
    dataOffset,
    entry.compressedSize,
    centralDirectoryOffset,
    `Compressed payload for ${entry.path}`
  )

  let localEnd = dataEnd
  if ((entry.flags & DATA_DESCRIPTOR_FLAG) !== 0) {
    requireRange(dataEnd, 12, centralDirectoryOffset, `Data descriptor for ${entry.path}`)
    const signaturePresent = view.getUint32(dataEnd, true) === DATA_DESCRIPTOR_SIGNATURE
    const descriptorOffset = dataEnd + (signaturePresent ? 4 : 0)
    requireRange(descriptorOffset, 12, centralDirectoryOffset, `Data descriptor for ${entry.path}`)
    if (
      view.getUint32(descriptorOffset, true) !== entry.crc32 ||
      view.getUint32(descriptorOffset + 4, true) !== entry.compressedSize ||
      view.getUint32(descriptorOffset + 8, true) !== entry.uncompressedSize
    ) {
      fail('IDML_ZIP_DATA_DESCRIPTOR', `Invalid data descriptor for ${JSON.stringify(entry.path)}.`)
    }
    localEnd = descriptorOffset + 12
  } else if (
    view.getUint32(entry.localHeaderOffset + 14, true) !== entry.crc32 ||
    view.getUint32(entry.localHeaderOffset + 18, true) !== entry.compressedSize ||
    view.getUint32(entry.localHeaderOffset + 22, true) !== entry.uncompressedSize
  ) {
    fail(
      'IDML_ZIP_LOCAL_HEADER',
      `The local sizes or CRC disagree for ${JSON.stringify(entry.path)}.`
    )
  }
  return { dataOffset, localEnd }
}

export const inspectIdmlZip = (
  source: ArrayBuffer | Uint8Array,
  limits: IdmlSafetyLimits
): IdmlZipPreflight => {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (bytes.byteLength > limits.maxFileBytes) {
    fail('IDML_FILE_LIMIT', `IDML source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findEndOfCentralDirectory(view)
  const diskNumber = view.getUint16(eocdOffset + 4, true)
  const centralDisk = view.getUint16(eocdOffset + 6, true)
  const entriesOnDisk = view.getUint16(eocdOffset + 8, true)
  const entryCount = view.getUint16(eocdOffset + 10, true)
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true)
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true)
  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    fail('IDML_ZIP_MULTIDISK', 'Multi-disk IDML ZIP packages are not supported.')
  }
  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffff_ffff ||
    centralDirectoryOffset === 0xffff_ffff
  ) {
    fail('IDML_ZIP64_UNSUPPORTED', 'ZIP64 IDML packages are not accepted by this bounded renderer.')
  }
  if (entryCount === 0 || entryCount > limits.maxEntries) {
    fail(
      'IDML_ENTRY_LIMIT',
      `IDML ZIP entry count ${entryCount} is outside the configured safety limit.`
    )
  }
  requireRange(centralDirectoryOffset, centralDirectorySize, eocdOffset, 'IDML central directory')
  if (centralDirectoryOffset + centralDirectorySize !== eocdOffset) {
    fail(
      'IDML_ZIP_DIRECTORY',
      'The IDML central directory has an unsupported gap or trailing record.'
    )
  }

  const seenPaths = new Set<string>()
  const entries: ParsedCentralEntry[] = []
  let cursor = centralDirectoryOffset
  let compressedBytes = 0
  let uncompressedBytes = 0
  for (let centralIndex = 0; centralIndex < entryCount; centralIndex += 1) {
    requireRange(cursor, 46, eocdOffset, `IDML central entry ${centralIndex}`)
    if (view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) {
      fail('IDML_ZIP_DIRECTORY', `IDML central entry ${centralIndex} has an invalid signature.`)
    }
    const flags = view.getUint16(cursor + 8, true)
    const method = view.getUint16(cursor + 10, true)
    const crc32 = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const diskStart = view.getUint16(cursor + 34, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    if ((flags & ENCRYPTION_FLAGS) !== 0) {
      fail('IDML_ZIP_ENCRYPTED', 'Encrypted IDML ZIP entries are not supported.')
    }
    if (
      compressedSize === 0xffff_ffff ||
      uncompressedSize === 0xffff_ffff ||
      localHeaderOffset === 0xffff_ffff ||
      diskStart === 0xffff
    ) {
      fail(
        'IDML_ZIP64_UNSUPPORTED',
        'ZIP64 IDML entries are not accepted by this bounded renderer.'
      )
    }
    if (diskStart !== 0) fail('IDML_ZIP_MULTIDISK', 'An IDML entry points to another ZIP disk.')
    const compression = compressionName(method)
    if (compression === 'stored' && compressedSize !== uncompressedSize) {
      fail(
        'IDML_ZIP_SIZE',
        'A stored IDML ZIP entry declares different compressed and uncompressed sizes.'
      )
    }
    if (compressedSize > limits.maxEntryCompressedBytes) {
      fail('IDML_ENTRY_LIMIT', `An IDML ZIP entry exceeds the compressed-byte safety limit.`)
    }
    if (uncompressedSize > limits.maxEntryUncompressedBytes) {
      fail('IDML_ENTRY_LIMIT', `An IDML ZIP entry exceeds the uncompressed-byte safety limit.`)
    }
    const ratio = uncompressedSize === 0 ? 1 : uncompressedSize / Math.max(1, compressedSize)
    if (ratio > limits.maxCompressionRatio) {
      fail('IDML_ZIP_BOMB', `An IDML ZIP entry declares a ${ratio.toFixed(1)}:1 compression ratio.`)
    }
    compressedBytes = addSize(compressedBytes, compressedSize, 'IDML compressed byte total')
    uncompressedBytes = addSize(uncompressedBytes, uncompressedSize, 'IDML uncompressed byte total')
    if (uncompressedBytes > limits.maxTotalUncompressedBytes) {
      fail(
        'IDML_ZIP_BOMB',
        'The IDML ZIP declared uncompressed total exceeds the configured safety limit.'
      )
    }

    const variableLength = nameLength + extraLength + commentLength
    requireRange(
      cursor + 46,
      variableLength,
      eocdOffset,
      `IDML central entry ${centralIndex} metadata`
    )
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameLength)
    const path = decodeEntryPath(rawName, flags)
    if (seenPaths.has(path))
      fail('IDML_ZIP_DUPLICATE', `Duplicate IDML ZIP entry ${JSON.stringify(path)}.`)
    seenPaths.add(path)
    inspectExtraFields(
      bytes.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength),
      `Central header for ${path}`
    )
    const centralEntry = {
      centralIndex,
      path,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      flags,
      method,
      crc32,
      rawName
    }
    const local = verifyLocalEntry(bytes, view, centralDirectoryOffset, centralEntry)
    entries.push({ ...centralEntry, ...local })
    cursor += 46 + variableLength
  }
  if (cursor !== eocdOffset)
    fail('IDML_ZIP_DIRECTORY', 'The IDML central directory size does not match its entries.')

  const ranges = [...entries].sort(
    (left, right) => left.localHeaderOffset - right.localHeaderOffset
  )
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index - 1].localEnd > ranges[index].localHeaderOffset) {
      fail('IDML_ZIP_OVERLAP', 'IDML ZIP local entries overlap.')
    }
  }

  const mimetype = entries.find((entry) => entry.path === 'mimetype')
  const designmap = entries.find((entry) => entry.path === 'designmap.xml')
  if (!mimetype)
    return fail('IDML_REQUIRED_ENTRY', 'IDML package must contain an exact-case mimetype entry.')
  if (!designmap)
    return fail(
      'IDML_REQUIRED_ENTRY',
      'IDML package must contain an exact-case designmap.xml entry.'
    )
  if (mimetype.localHeaderOffset !== 0 || mimetype.compression !== 'stored') {
    fail('IDML_MIMETYPE', 'IDML mimetype must be the first local entry and must be stored.')
  }
  const mimetypeBytes = bytes.subarray(
    mimetype.dataOffset,
    mimetype.dataOffset + mimetype.uncompressedSize
  )
  if (new TextDecoder().decode(mimetypeBytes) !== IDML_MIMETYPE) {
    fail('IDML_MIMETYPE', 'IDML mimetype entry has an unexpected value.')
  }
  if (designmap.uncompressedSize === 0)
    fail('IDML_REQUIRED_ENTRY', 'IDML designmap.xml must not be empty.')

  return {
    fileBytes: bytes.byteLength,
    entryCount,
    compressedBytes,
    uncompressedBytes,
    compressionRatio:
      uncompressedBytes === 0 ? 1 : uncompressedBytes / Math.max(1, compressedBytes),
    entries: entries.map((entry) => ({
      path: entry.path,
      compression: entry.compression,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      crc32: entry.crc32,
      localHeaderOffset: entry.localHeaderOffset,
      dataOffset: entry.dataOffset
    }))
  }
}

let crcTable: Uint32Array | undefined

const getCrcTable = () => {
  if (crcTable) return crcTable
  crcTable = new Uint32Array(256)
  for (let index = 0; index < crcTable.length; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb8_8320 ^ (value >>> 1) : value >>> 1
    }
    crcTable[index] = value >>> 0
  }
  return crcTable
}

const updateCrc32 = (crc: number, bytes: Uint8Array) => {
  const table = getCrcTable()
  let value = crc
  for (const byte of bytes) value = table[(value ^ byte) & 0xff] ^ (value >>> 8)
  return value
}

const abortError = (signal: AbortSignal) => {
  if (signal.reason instanceof Error) return signal.reason
  return new DOMException('IDML ZIP extraction was aborted.', 'AbortError')
}

/**
 * Streams one already-preflighted IDML entry without ever materializing its
 * complete expanded payload. Page-geometry discovery uses this before the
 * WASM renderer is allowed to allocate a pixmap.
 */
export const streamIdmlZipEntry = async (
  source: ArrayBuffer | Uint8Array,
  archive: IdmlZipPreflight,
  path: string,
  onChunk: (chunk: Uint8Array) => void,
  signal?: AbortSignal
) => {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (archive.fileBytes !== bytes.byteLength) {
    fail('IDML_ZIP_RANGE', 'The IDML ZIP directory belongs to a different source buffer.')
  }
  const entry =
    archive.entries.find((candidate) => candidate.path === path) ??
    fail('IDML_REQUIRED_ENTRY', `IDML ZIP entry ${JSON.stringify(path)} is missing.`)
  if (signal?.aborted) throw abortError(signal)

  const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize)
  let expandedBytes = 0
  let crc = 0xffff_ffff
  const accept = (chunk: Uint8Array) => {
    if (signal?.aborted) throw abortError(signal)
    expandedBytes = addSize(expandedBytes, chunk.byteLength, `Expanded payload for ${path}`)
    if (expandedBytes > entry.uncompressedSize) {
      fail(
        'IDML_ZIP_SIZE',
        `IDML ZIP entry ${JSON.stringify(path)} expanded past its declared size.`
      )
    }
    crc = updateCrc32(crc, chunk)
    onChunk(chunk)
  }

  if (entry.compression === 'stored') {
    const chunkBytes = 64 * 1024
    for (let offset = 0; offset < compressed.byteLength; offset += chunkBytes) {
      accept(compressed.subarray(offset, Math.min(compressed.byteLength, offset + chunkBytes)))
    }
  } else {
    if (typeof DecompressionStream === 'undefined') {
      fail(
        'IDML_ZIP_DEFLATE_UNAVAILABLE',
        'This browser does not provide the raw DEFLATE decoder required for IDML metadata.'
      )
    }
    let decompressor: DecompressionStream
    try {
      decompressor = new DecompressionStream('deflate-raw')
    } catch {
      return fail(
        'IDML_ZIP_DEFLATE_UNAVAILABLE',
        'This browser does not support raw DEFLATE streams required by IDML metadata.'
      )
    }
    const ownedCompressed = Uint8Array.from(compressed)
    const reader = new Blob([ownedCompressed]).stream().pipeThrough(decompressor).getReader()
    try {
      for (;;) {
        const result = await reader.read()
        if (result.done) break
        accept(result.value)
      }
    } catch (error) {
      await reader.cancel(error).catch(() => undefined)
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  if (expandedBytes !== entry.uncompressedSize) {
    fail(
      'IDML_ZIP_SIZE',
      `IDML ZIP entry ${JSON.stringify(path)} expanded to ${expandedBytes} bytes instead of ${entry.uncompressedSize}.`
    )
  }
  if ((crc ^ 0xffff_ffff) >>> 0 !== entry.crc32) {
    fail('IDML_ZIP_CRC', `IDML ZIP entry ${JSON.stringify(path)} failed CRC-32 validation.`)
  }
}
