import type { SignatureContainerLimits } from './limits.js'

const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const DATA_DESCRIPTOR_SIGNATURE = 0x08074b50
const DATA_DESCRIPTOR_FLAG = 0x0008
const ZIP64_SENTINEL_16 = 0xffff
const ZIP64_SENTINEL_32 = 0xffffffff

export interface SafeZipEntry {
  name: string
  compressedSize: number
  uncompressedSize: number
  compressionMethod: 0 | 8
  localHeaderOffset: number
  directory: boolean
}

export interface SafeZipDirectory {
  entries: SafeZipEntry[]
  totalUncompressedBytes: number
}

interface ZipPhysicalRange {
  name: string
  start: number
  end: number
}

const assertZip: (condition: unknown, message: string) => asserts condition = (
  condition,
  message
) => {
  if (!condition) throw new Error(`Unsafe ASiC ZIP: ${message}`)
}

const decodeName = (bytes: Uint8Array, utf8: boolean) => {
  const name = new TextDecoder(utf8 ? 'utf-8' : 'windows-1252', { fatal: true })
    .decode(bytes)
    .normalize('NFC')
  assertZip(
    !Array.from(name).some((character) => {
      const codePoint = character.codePointAt(0)!
      return codePoint === 0x7f || codePoint < 0x20
    }),
    'entry name contains control characters.'
  )
  assertZip(!name.includes('\\'), 'backslash paths are rejected.')
  assertZip(
    !name.startsWith('/') && !/^[A-Za-z]:/u.test(name),
    'absolute entry paths are rejected.'
  )
  const segments = name.split('/').filter(Boolean)
  assertZip(segments.length > 0, 'empty entry name.')
  assertZip(
    segments.every((segment) => segment !== '.' && segment !== '..'),
    'entry path traversal is rejected.'
  )
  return name
}

const locateEndRecord = (view: DataView) => {
  const minimum = Math.max(0, view.byteLength - 65_557)
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset
  }
  throw new Error('Unsafe ASiC ZIP: end-of-central-directory record is missing.')
}

const equalBytes = (left: Uint8Array, right: Uint8Array) => {
  if (left.byteLength !== right.byteLength) return false
  let mismatch = 0
  for (let index = 0; index < left.byteLength; index += 1) {
    mismatch |= left[index]! ^ right[index]!
  }
  return mismatch === 0
}

export const inspectZipCentralDirectory = (
  input: ArrayBuffer | Uint8Array,
  limits: SignatureContainerLimits
): SafeZipDirectory => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  assertZip(
    bytes.byteLength > 0 && bytes.byteLength <= limits.maxContainerBytes,
    `container exceeds ${limits.maxContainerBytes} bytes.`
  )
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = locateEndRecord(view)
  const diskNumber = view.getUint16(eocd + 4, true)
  const centralDisk = view.getUint16(eocd + 6, true)
  const diskEntries = view.getUint16(eocd + 8, true)
  const totalEntries = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  const commentLength = view.getUint16(eocd + 20, true)
  assertZip(
    eocd + 22 + commentLength === bytes.byteLength,
    'trailing bytes after the ZIP end record are rejected.'
  )
  assertZip(
    diskNumber === 0 && centralDisk === 0 && diskEntries === totalEntries,
    'multi-disk ZIP archives are rejected.'
  )
  assertZip(
    totalEntries !== ZIP64_SENTINEL_16 &&
      centralSize !== ZIP64_SENTINEL_32 &&
      centralOffset !== ZIP64_SENTINEL_32,
    'ZIP64 archives are not accepted by this bounded preview path.'
  )
  assertZip(
    totalEntries > 0 && totalEntries <= limits.maxEntries,
    `entry count exceeds ${limits.maxEntries}.`
  )
  assertZip(centralOffset + centralSize === eocd, 'central-directory bounds are inconsistent.')

  const entries: SafeZipEntry[] = []
  const physicalRanges: ZipPhysicalRange[] = []
  const normalizedNames = new Set<string>()
  let totalUncompressedBytes = 0
  let cursor = centralOffset
  for (let index = 0; index < totalEntries; index += 1) {
    assertZip(
      cursor + 46 <= eocd && view.getUint32(cursor, true) === CENTRAL_DIRECTORY_SIGNATURE,
      'central-directory entry is malformed.'
    )
    const flags = view.getUint16(cursor + 8, true)
    const compressionMethod = view.getUint16(cursor + 10, true)
    const crc32 = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const entryCommentLength = view.getUint16(cursor + 32, true)
    const diskStart = view.getUint16(cursor + 34, true)
    const externalAttributes = view.getUint32(cursor + 38, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const next = cursor + 46 + nameLength + extraLength + entryCommentLength
    assertZip(next <= eocd, 'central-directory entry exceeds its boundary.')
    assertZip((flags & 0x0001) === 0, 'encrypted entries are rejected.')
    assertZip(
      compressionMethod === 0 || compressionMethod === 8,
      `compression method ${compressionMethod} is unsupported.`
    )
    assertZip(
      compressedSize !== ZIP64_SENTINEL_32 &&
        uncompressedSize !== ZIP64_SENTINEL_32 &&
        localHeaderOffset !== ZIP64_SENTINEL_32 &&
        diskStart !== ZIP64_SENTINEL_16,
      'ZIP64 entry fields are rejected.'
    )
    assertZip(diskStart === 0, 'multi-disk entries are rejected.')
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength)
    assertZip(
      nameBytes.byteLength <= limits.maxPathBytes,
      `entry path exceeds ${limits.maxPathBytes} bytes.`
    )
    const name = decodeName(nameBytes, (flags & 0x0800) !== 0)
    const collisionKey = name.toLocaleLowerCase('en-US')
    assertZip(!normalizedNames.has(collisionKey), `duplicate or case-colliding entry ${name}.`)
    normalizedNames.add(collisionKey)
    const unixMode = externalAttributes >>> 16
    assertZip((unixMode & 0xf000) !== 0xa000, `symbolic link ${name} is rejected.`)
    const directory = name.endsWith('/') || (externalAttributes & 0x10) !== 0
    if (!directory) {
      assertZip(
        uncompressedSize <= limits.maxEntryBytes,
        `entry ${name} exceeds ${limits.maxEntryBytes} bytes.`
      )
      assertZip(
        compressedSize > 0 || uncompressedSize === 0,
        `entry ${name} has an impossible compressed size.`
      )
      if (compressedSize > 0) {
        assertZip(
          uncompressedSize / compressedSize <= limits.maxCompressionRatio,
          `entry ${name} exceeds compression ratio ${limits.maxCompressionRatio}.`
        )
      }
      totalUncompressedBytes += uncompressedSize
      assertZip(
        Number.isSafeInteger(totalUncompressedBytes) &&
          totalUncompressedBytes <= limits.maxTotalUncompressedBytes,
        `uncompressed total exceeds ${limits.maxTotalUncompressedBytes} bytes.`
      )
    }
    assertZip(
      localHeaderOffset + 30 <= centralOffset &&
        view.getUint32(localHeaderOffset, true) === LOCAL_FILE_HEADER_SIGNATURE,
      `local header for ${name} is invalid.`
    )
    const localFlags = view.getUint16(localHeaderOffset + 6, true)
    const localCompressionMethod = view.getUint16(localHeaderOffset + 8, true)
    const localCrc32 = view.getUint32(localHeaderOffset + 14, true)
    const localCompressedSize = view.getUint32(localHeaderOffset + 18, true)
    const localUncompressedSize = view.getUint32(localHeaderOffset + 22, true)
    const localNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
    assertZip(localFlags === flags, `local and central flags differ for ${name}.`)
    assertZip(
      localCompressionMethod === compressionMethod,
      `local and central compression methods differ for ${name}.`
    )
    assertZip(
      localCompressedSize !== ZIP64_SENTINEL_32 && localUncompressedSize !== ZIP64_SENTINEL_32,
      `local ZIP64 size fields are rejected for ${name}.`
    )
    const localNameStart = localHeaderOffset + 30
    const localNameEnd = localNameStart + localNameLength
    const dataStart = localNameEnd + localExtraLength
    assertZip(
      localNameEnd <= centralOffset && dataStart <= centralOffset,
      `local header fields for ${name} escape the data section.`
    )
    assertZip(
      localNameLength <= limits.maxPathBytes,
      `local entry path for ${name} exceeds ${limits.maxPathBytes} bytes.`
    )
    const localNameBytes = bytes.subarray(localNameStart, localNameEnd)
    assertZip(
      equalBytes(localNameBytes, nameBytes),
      `local and central entry names differ for ${name}.`
    )
    const usesDataDescriptor = (flags & DATA_DESCRIPTOR_FLAG) !== 0
    if (usesDataDescriptor) {
      assertZip(
        (localCrc32 === 0 || localCrc32 === crc32) &&
          (localCompressedSize === 0 || localCompressedSize === compressedSize) &&
          (localUncompressedSize === 0 || localUncompressedSize === uncompressedSize),
        `local placeholder fields conflict with the central directory for ${name}.`
      )
    } else {
      assertZip(
        localCrc32 === crc32 &&
          localCompressedSize === compressedSize &&
          localUncompressedSize === uncompressedSize,
        `local CRC or size fields differ from the central directory for ${name}.`
      )
    }
    const dataEnd = dataStart + compressedSize
    assertZip(dataEnd <= centralOffset, `compressed data for ${name} escapes the data section.`)
    let recordEnd = dataEnd
    if (usesDataDescriptor) {
      let descriptorStart = dataEnd
      assertZip(descriptorStart + 12 <= centralOffset, `data descriptor for ${name} is truncated.`)
      if (view.getUint32(descriptorStart, true) === DATA_DESCRIPTOR_SIGNATURE) {
        descriptorStart += 4
        assertZip(
          descriptorStart + 12 <= centralOffset,
          `signed data descriptor for ${name} is truncated.`
        )
      }
      assertZip(
        view.getUint32(descriptorStart, true) === crc32 &&
          view.getUint32(descriptorStart + 4, true) === compressedSize &&
          view.getUint32(descriptorStart + 8, true) === uncompressedSize,
        `data descriptor differs from the central directory for ${name}.`
      )
      recordEnd = descriptorStart + 12
    }
    physicalRanges.push({ name, start: localHeaderOffset, end: recordEnd })
    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      compressionMethod: compressionMethod as 0 | 8,
      localHeaderOffset,
      directory
    })
    cursor = next
  }
  assertZip(cursor === eocd, 'central-directory size does not match parsed entries.')
  physicalRanges.sort((left, right) => left.start - right.start || left.end - right.end)
  for (let index = 1; index < physicalRanges.length; index += 1) {
    const previous = physicalRanges[index - 1]!
    const current = physicalRanges[index]!
    assertZip(
      previous.end <= current.start,
      `local record ranges overlap between ${previous.name} and ${current.name}.`
    )
  }
  return { entries, totalUncompressedBytes }
}
