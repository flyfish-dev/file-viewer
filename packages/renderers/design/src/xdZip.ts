export interface XdZipLimits {
  maxFileBytes: number
  maxEntries: number
  maxCentralDirectoryBytes: number
  maxEntryNameBytes: number
  maxPathDepth: number
  maxEntryCompressedBytes: number
  maxEntryUncompressedBytes: number
  maxTotalUncompressedBytes: number
  maxCompressionRatio: number
}

export const DEFAULT_XD_ZIP_LIMITS: Readonly<XdZipLimits> = Object.freeze({
  maxFileBytes: 256 * 1024 * 1024,
  maxEntries: 4_096,
  maxCentralDirectoryBytes: 8 * 1024 * 1024,
  maxEntryNameBytes: 1_024,
  maxPathDepth: 24,
  maxEntryCompressedBytes: 64 * 1024 * 1024,
  maxEntryUncompressedBytes: 64 * 1024 * 1024,
  maxTotalUncompressedBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 120,
})

export interface XdZipEntry {
  name: string
  compressedSize: number
  uncompressedSize: number
  crc32: number
  compressionMethod: 0 | 8
  flags: number
  localHeaderOffset: number
  dataOffset: number
  directory: boolean
}

export interface XdZipDirectory {
  entries: readonly XdZipEntry[]
  entryByName: ReadonlyMap<string, XdZipEntry>
  centralDirectoryOffset: number
  centralDirectorySize: number
  totalUncompressedBytes: number
  fileBytes: number
}

const EOCD_SIGNATURE = 0x0605_4b50
const CENTRAL_FILE_SIGNATURE = 0x0201_4b50
const LOCAL_FILE_SIGNATURE = 0x0403_4b50
const DATA_DESCRIPTOR_SIGNATURE = 0x0807_4b50
const DATA_DESCRIPTOR_FLAG = 0x0008
const ZIP64_EXTRA_ID = 0x0001
const AES_EXTRA_ID = 0x9901
const EOCD_MIN_BYTES = 22
const MAX_ZIP_COMMENT_BYTES = 0xffff
const CENTRAL_FILE_FIXED_BYTES = 46
const LOCAL_FILE_FIXED_BYTES = 30
const ALLOWED_GENERAL_PURPOSE_FLAGS = 0x080e // deflate options, data descriptor, UTF-8

const positiveInteger = (value: number | undefined, fallback: number) => {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

export const resolveXdZipLimits = (overrides?: Partial<XdZipLimits>): XdZipLimits => ({
  maxFileBytes: positiveInteger(overrides?.maxFileBytes, DEFAULT_XD_ZIP_LIMITS.maxFileBytes),
  maxEntries: positiveInteger(overrides?.maxEntries, DEFAULT_XD_ZIP_LIMITS.maxEntries),
  maxCentralDirectoryBytes: positiveInteger(
    overrides?.maxCentralDirectoryBytes,
    DEFAULT_XD_ZIP_LIMITS.maxCentralDirectoryBytes
  ),
  maxEntryNameBytes: positiveInteger(overrides?.maxEntryNameBytes, DEFAULT_XD_ZIP_LIMITS.maxEntryNameBytes),
  maxPathDepth: positiveInteger(overrides?.maxPathDepth, DEFAULT_XD_ZIP_LIMITS.maxPathDepth),
  maxEntryCompressedBytes: positiveInteger(
    overrides?.maxEntryCompressedBytes,
    DEFAULT_XD_ZIP_LIMITS.maxEntryCompressedBytes
  ),
  maxEntryUncompressedBytes: positiveInteger(
    overrides?.maxEntryUncompressedBytes,
    DEFAULT_XD_ZIP_LIMITS.maxEntryUncompressedBytes
  ),
  maxTotalUncompressedBytes: positiveInteger(
    overrides?.maxTotalUncompressedBytes,
    DEFAULT_XD_ZIP_LIMITS.maxTotalUncompressedBytes
  ),
  maxCompressionRatio: positiveInteger(
    overrides?.maxCompressionRatio,
    DEFAULT_XD_ZIP_LIMITS.maxCompressionRatio
  ),
})

const requireRange = (offset: number, length: number, total: number, label: string) => {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > total - length
  ) {
    throw new Error(`${label} points outside the XD ZIP container.`)
  }
}

const decodeEntryName = (bytes: Uint8Array, utf8: boolean) => {
  if (!utf8 && bytes.some(byte => byte < 0x20 || byte > 0x7e)) {
    throw new Error('XD ZIP entry names must be UTF-8 or printable ASCII.')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('XD ZIP contains an invalid UTF-8 entry name.')
  }
}

const validateEntryName = (name: string, limits: XdZipLimits) => {
  if (!name || name.includes('\0')) throw new Error('XD ZIP contains an empty or NUL-containing entry name.')
  if (name.includes('\\')) throw new Error(`XD ZIP entry ${JSON.stringify(name)} uses unsafe backslash separators.`)
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name)) {
    throw new Error(`XD ZIP entry ${JSON.stringify(name)} is absolute.`)
  }
  const directory = name.endsWith('/')
  const body = directory ? name.slice(0, -1) : name
  const segments = body.split('/')
  if (!body || segments.length > limits.maxPathDepth || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error(`XD ZIP entry ${JSON.stringify(name)} contains an unsafe path.`)
  }
  return directory
}

const findEocdOffset = (view: DataView) => {
  if (view.byteLength < EOCD_MIN_BYTES) throw new Error('XD file is too short to contain a ZIP directory.')
  const first = Math.max(0, view.byteLength - EOCD_MIN_BYTES - MAX_ZIP_COMMENT_BYTES)
  for (let offset = view.byteLength - EOCD_MIN_BYTES; offset >= first; offset -= 1) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue
    const commentBytes = view.getUint16(offset + 20, true)
    if (offset + EOCD_MIN_BYTES + commentBytes === view.byteLength) return offset
  }
  throw new Error('XD ZIP end-of-central-directory record was not found.')
}

const byteRangesEqual = (
  left: Uint8Array,
  leftOffset: number,
  right: Uint8Array,
  rightOffset: number,
  length: number
) => {
  for (let index = 0; index < length; index += 1) {
    if (left[leftOffset + index] !== right[rightOffset + index]) return false
  }
  return true
}

const inspectExtraFields = (bytes: Uint8Array, label: string) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  while (offset < bytes.byteLength) {
    requireRange(offset, 4, bytes.byteLength, `${label} extra-field header`)
    const id = view.getUint16(offset, true)
    const length = view.getUint16(offset + 2, true)
    requireRange(offset + 4, length, bytes.byteLength, `${label} extra field`)
    if (id === ZIP64_EXTRA_ID) {
      throw new Error('ZIP64 XD entries are not supported by the bounded browser parser.')
    }
    if (id === AES_EXTRA_ID) {
      throw new Error('Encrypted XD ZIP entries are not supported.')
    }
    offset += 4 + length
  }
}

export const inspectXdZipCentralDirectory = (
  buffer: ArrayBuffer,
  overrides?: Partial<XdZipLimits>
): XdZipDirectory => {
  const limits = resolveXdZipLimits(overrides)
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`XD ZIP is ${buffer.byteLength} bytes, exceeding the ${limits.maxFileBytes}-byte file limit.`)
  }
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const eocdOffset = findEocdOffset(view)
  const diskNumber = view.getUint16(eocdOffset + 4, true)
  const centralDirectoryDisk = view.getUint16(eocdOffset + 6, true)
  const diskEntryCount = view.getUint16(eocdOffset + 8, true)
  const entryCount = view.getUint16(eocdOffset + 10, true)
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true)
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true)
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || diskEntryCount !== entryCount) {
    throw new Error('Multi-disk XD ZIP containers are not supported.')
  }
  if (entryCount === 0xffff || centralDirectorySize === 0xffff_ffff || centralDirectoryOffset === 0xffff_ffff) {
    throw new Error('ZIP64 XD containers are not supported by the bounded browser parser.')
  }
  if (entryCount === 0 || entryCount > limits.maxEntries) {
    throw new Error(`XD ZIP entry count ${entryCount} is outside the 1-${limits.maxEntries} safety range.`)
  }
  if (centralDirectorySize > limits.maxCentralDirectoryBytes) {
    throw new Error(`XD ZIP central directory exceeds ${limits.maxCentralDirectoryBytes} bytes.`)
  }
  requireRange(centralDirectoryOffset, centralDirectorySize, eocdOffset, 'XD ZIP central directory')
  if (centralDirectoryOffset + centralDirectorySize !== eocdOffset) {
    throw new Error('XD ZIP central directory has an unsupported gap or trailing record.')
  }

  const entries: XdZipEntry[] = []
  const entryByName = new Map<string, XdZipEntry>()
  const canonicalNames = new Set<string>()
  const localOffsets = new Set<number>()
  const occupiedLocalRanges: Array<{ start: number; end: number; name: string }> = []
  let totalUncompressedBytes = 0
  let offset = centralDirectoryOffset
  for (let index = 0; index < entryCount; index += 1) {
    requireRange(offset, CENTRAL_FILE_FIXED_BYTES, eocdOffset, 'XD ZIP central-directory entry')
    if (view.getUint32(offset, true) !== CENTRAL_FILE_SIGNATURE) {
      throw new Error(`XD ZIP central-directory entry ${index + 1} has an invalid signature.`)
    }
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const crc32 = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameBytes = view.getUint16(offset + 28, true)
    const extraBytes = view.getUint16(offset + 30, true)
    const commentBytes = view.getUint16(offset + 32, true)
    const diskStart = view.getUint16(offset + 34, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const recordBytes = CENTRAL_FILE_FIXED_BYTES + nameBytes + extraBytes + commentBytes
    requireRange(offset, recordBytes, eocdOffset, 'XD ZIP central-directory record')
    if (nameBytes === 0 || nameBytes > limits.maxEntryNameBytes) {
      throw new Error(`XD ZIP entry ${index + 1} has an invalid filename length.`)
    }
    if (diskStart !== 0) throw new Error('XD ZIP entry starts on an unsupported secondary disk.')
    if ((flags & 0x0001) !== 0) throw new Error('Encrypted XD ZIP entries are not supported.')
    if ((flags & ~ALLOWED_GENERAL_PURPOSE_FLAGS) !== 0) {
      throw new Error(`XD ZIP entry ${index + 1} uses unsupported general-purpose flags 0x${flags.toString(16)}.`)
    }
    if (method !== 0 && method !== 8) {
      throw new Error(`XD ZIP entry ${index + 1} uses unsupported compression method ${method}.`)
    }
    if (compressedSize === 0xffff_ffff || uncompressedSize === 0xffff_ffff || localHeaderOffset === 0xffff_ffff) {
      throw new Error('ZIP64 XD entries are not supported by the bounded browser parser.')
    }
    if (compressedSize > limits.maxEntryCompressedBytes || uncompressedSize > limits.maxEntryUncompressedBytes) {
      throw new Error(`XD ZIP entry ${index + 1} exceeds the per-entry size limit.`)
    }
    if (uncompressedSize > 0) {
      if (compressedSize === 0) throw new Error(`XD ZIP entry ${index + 1} has an impossible zero compressed size.`)
      if (uncompressedSize / compressedSize > limits.maxCompressionRatio) {
        throw new Error(`XD ZIP entry ${index + 1} exceeds the ${limits.maxCompressionRatio}:1 compression-ratio limit.`)
      }
    }
    totalUncompressedBytes += uncompressedSize
    if (!Number.isSafeInteger(totalUncompressedBytes) || totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      throw new Error(`XD ZIP expands beyond the ${limits.maxTotalUncompressedBytes}-byte aggregate limit.`)
    }

    const centralNameOffset = offset + CENTRAL_FILE_FIXED_BYTES
    inspectExtraFields(
      bytes.subarray(
        centralNameOffset + nameBytes,
        centralNameOffset + nameBytes + extraBytes
      ),
      `XD ZIP central header for entry ${index + 1}`
    )
    const name = decodeEntryName(bytes.subarray(centralNameOffset, centralNameOffset + nameBytes), (flags & 0x0800) !== 0)
    const directory = validateEntryName(name, limits)
    const canonicalName = name.normalize('NFC').toLocaleLowerCase('en-US')
    if (canonicalNames.has(canonicalName)) {
      throw new Error(`XD ZIP contains an ambiguous duplicate entry ${JSON.stringify(name)}.`)
    }
    canonicalNames.add(canonicalName)
    if (localOffsets.has(localHeaderOffset)) {
      throw new Error(`XD ZIP entries reuse local header offset ${localHeaderOffset}.`)
    }
    localOffsets.add(localHeaderOffset)

    requireRange(localHeaderOffset, LOCAL_FILE_FIXED_BYTES, centralDirectoryOffset, `XD ZIP local header for ${name}`)
    if (view.getUint32(localHeaderOffset, true) !== LOCAL_FILE_SIGNATURE) {
      throw new Error(`XD ZIP local header for ${JSON.stringify(name)} has an invalid signature.`)
    }
    const localFlags = view.getUint16(localHeaderOffset + 6, true)
    const localMethod = view.getUint16(localHeaderOffset + 8, true)
    const localNameBytes = view.getUint16(localHeaderOffset + 26, true)
    const localExtraBytes = view.getUint16(localHeaderOffset + 28, true)
    if (localFlags !== flags || localMethod !== method || localNameBytes !== nameBytes) {
      throw new Error(`XD ZIP local and central headers disagree for ${JSON.stringify(name)}.`)
    }
    const localNameOffset = localHeaderOffset + LOCAL_FILE_FIXED_BYTES
    requireRange(
      localNameOffset,
      localNameBytes + localExtraBytes,
      centralDirectoryOffset,
      `XD ZIP local metadata for ${name}`
    )
    if (!byteRangesEqual(bytes, localNameOffset, bytes, centralNameOffset, nameBytes)) {
      throw new Error(`XD ZIP local and central filenames disagree for ${JSON.stringify(name)}.`)
    }
    inspectExtraFields(
      bytes.subarray(
        localNameOffset + localNameBytes,
        localNameOffset + localNameBytes + localExtraBytes
      ),
      `XD ZIP local header for ${name}`
    )
    if ((flags & DATA_DESCRIPTOR_FLAG) === 0) {
      const localCrc = view.getUint32(localHeaderOffset + 14, true)
      const localCompressedSize = view.getUint32(localHeaderOffset + 18, true)
      const localUncompressedSize = view.getUint32(localHeaderOffset + 22, true)
      if (localCrc !== crc32 || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize) {
        throw new Error(`XD ZIP local sizes or CRC disagree for ${JSON.stringify(name)}.`)
      }
    }
    const dataOffset = localNameOffset + localNameBytes + localExtraBytes
    requireRange(dataOffset, compressedSize, centralDirectoryOffset, `XD ZIP compressed data for ${name}`)
    const dataEnd = dataOffset + compressedSize
    let localEnd = dataEnd
    if ((flags & DATA_DESCRIPTOR_FLAG) !== 0) {
      requireRange(dataEnd, 12, centralDirectoryOffset, `XD ZIP data descriptor for ${name}`)
      const signaturePresent = view.getUint32(dataEnd, true) === DATA_DESCRIPTOR_SIGNATURE
      const descriptorOffset = dataEnd + (signaturePresent ? 4 : 0)
      requireRange(descriptorOffset, 12, centralDirectoryOffset, `XD ZIP data descriptor for ${name}`)
      if (
        view.getUint32(descriptorOffset, true) !== crc32 ||
        view.getUint32(descriptorOffset + 4, true) !== compressedSize ||
        view.getUint32(descriptorOffset + 8, true) !== uncompressedSize
      ) {
        throw new Error(`XD ZIP data descriptor disagrees for ${JSON.stringify(name)}.`)
      }
      localEnd = descriptorOffset + 12
    }
    occupiedLocalRanges.push({ start: localHeaderOffset, end: localEnd, name })

    const entry: XdZipEntry = {
      name,
      compressedSize,
      uncompressedSize,
      crc32,
      compressionMethod: method,
      flags,
      localHeaderOffset,
      dataOffset,
      directory,
    }
    entries.push(entry)
    entryByName.set(name, entry)
    offset += recordBytes
  }
  if (offset !== eocdOffset) throw new Error('XD ZIP central-directory size does not match its entries.')
  occupiedLocalRanges.sort((left, right) => left.start - right.start)
  for (let index = 1; index < occupiedLocalRanges.length; index += 1) {
    const previous = occupiedLocalRanges[index - 1]
    const current = occupiedLocalRanges[index]
    if (current.start < previous.end) {
      throw new Error(
        `XD ZIP local records overlap: ${JSON.stringify(previous.name)} and ${JSON.stringify(current.name)}.`
      )
    }
  }
  return {
    entries,
    entryByName,
    centralDirectoryOffset,
    centralDirectorySize,
    totalUncompressedBytes,
    fileBytes: buffer.byteLength,
  }
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < table.length; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) !== 0 ? 0xedb8_8320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

export const calculateXdZipCrc32 = (bytes: Uint8Array) => {
  let value = 0xffff_ffff
  for (const byte of bytes) value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffff_ffff) >>> 0
}

const inflateRawBounded = async (compressed: ArrayBuffer, expectedBytes: number) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not expose DecompressionStream for XD ZIP deflate entries.')
  }
  let decompressor: DecompressionStream
  try {
    decompressor = new DecompressionStream('deflate-raw')
  } catch {
    throw new Error('This browser does not support raw DEFLATE streams required by the XD ZIP entry.')
  }
  const reader = new Blob([compressed]).stream().pipeThrough(decompressor).getReader()
  const output = new Uint8Array(expectedBytes)
  let written = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      if (written + chunk.value.byteLength > expectedBytes) {
        await reader.cancel()
        throw new Error('XD ZIP entry inflated beyond its declared size.')
      }
      output.set(chunk.value, written)
      written += chunk.value.byteLength
    }
  } finally {
    reader.releaseLock()
  }
  if (written !== expectedBytes) {
    throw new Error(`XD ZIP entry inflated to ${written} bytes instead of its declared ${expectedBytes} bytes.`)
  }
  return output
}

export const extractXdZipEntry = async (
  buffer: ArrayBuffer,
  directory: XdZipDirectory,
  entryName: string,
  maxOutputBytes: number
) => {
  if (directory.fileBytes !== buffer.byteLength) throw new Error('XD ZIP directory belongs to a different buffer.')
  const entry = directory.entryByName.get(entryName)
  if (!entry || entry.directory) throw new Error(`XD ZIP entry ${JSON.stringify(entryName)} was not found.`)
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0 || entry.uncompressedSize > maxOutputBytes) {
    throw new Error(`XD ZIP entry ${JSON.stringify(entryName)} exceeds its extraction limit.`)
  }
  const compressed = buffer.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
  const output = entry.compressionMethod === 0
    ? new Uint8Array(compressed)
    : await inflateRawBounded(compressed, entry.uncompressedSize)
  if (output.byteLength !== entry.uncompressedSize) {
    throw new Error(`XD ZIP stored entry ${JSON.stringify(entryName)} has an inconsistent size.`)
  }
  if (calculateXdZipCrc32(output) !== entry.crc32) {
    throw new Error(`XD ZIP entry ${JSON.stringify(entryName)} failed CRC-32 validation.`)
  }
  return output
}
