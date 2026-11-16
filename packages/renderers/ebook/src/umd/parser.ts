import { inflate, inflateRaw } from 'pako'

const UMD_MAGIC = 0xde9a9b89
const SECTION_MARKER = 0x23
const DATA_MARKER = 0x24
const MAX_SECTION_HEADER_SIZE = 5

const SECTION = {
  VERSION: 0x01,
  TITLE: 0x02,
  AUTHOR: 0x03,
  YEAR: 0x04,
  MONTH: 0x05,
  DAY: 0x06,
  CATEGORY: 0x07,
  PUBLISHER: 0x08,
  VENDOR: 0x09,
  CID: 0x0a,
  CONTENT_LENGTH: 0x0b,
  IMAGE: 0x0e,
  MIXED_IMAGE: 0x0f,
  TEXT_SEGMENT_INDEX: 0x81,
  COVER: 0x82,
  CHAPTER_OFFSETS: 0x83,
  CHAPTER_TITLES: 0x84,
  PAGE_OFFSETS: 0x87,
  SPLASH: 0xf1
} as const

export type UmdBookKind = 'text' | 'comic' | 'mixed' | 'unknown'

export interface UmdImage {
  bytes: Uint8Array
  extension: string
  id: string
  mimeType: string
}

export interface UmdChapter {
  fallbackTitle?: 'chapter' | 'gallery'
  content: string
  end: number
  id: string
  images: UmdImage[]
  start: number
  title: string
}

export interface UmdBook {
  titleIsFallback?: boolean
  warningCodes?: Partial<Record<number, 'UMD_TEXT_TOO_SHORT'>>
  author: string
  category: string
  chapters: UmdChapter[]
  contentLength: number
  cover?: UmdImage
  kind: UmdBookKind
  publishedAt: string
  publisher: string
  rawType: number
  title: string
  vendor: string
  warnings: string[]
}

type UmdMetadata = {
  author: string
  category: string
  day: string
  month: string
  publishedAt: string
  publisher: string
  title: string
  vendor: string
  year: string
}

class UmdCursor {
  private readonly view: DataView

  readonly bytes: Uint8Array
  offset = 0

  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer)
    this.view = new DataView(buffer)
  }

  get remaining() {
    return this.bytes.length - this.offset
  }

  peek() {
    return this.remaining > 0 ? this.bytes[this.offset] : undefined
  }

  readUint8() {
    this.ensure(1)
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  readUint16() {
    this.ensure(2)
    const value = this.view.getUint16(this.offset, true)
    this.offset += 2
    return value
  }

  readUint32() {
    this.ensure(4)
    const value = this.view.getUint32(this.offset, true)
    this.offset += 4
    return value
  }

  readBytes(length: number) {
    const safeLength = Math.max(0, Math.min(length, this.remaining))
    const start = this.offset
    this.offset += safeLength
    return this.bytes.slice(start, start + safeLength)
  }

  private ensure(size: number) {
    if (this.remaining < size) {
      throw Object.assign(new Error('UMD 文件结构不完整，读取时遇到意外结尾'), { code: 'UMD_UNEXPECTED_END' })
    }
  }
}

const readUint32From = (bytes: Uint8Array, offset = 0) => {
  if (bytes.length < offset + 4) {
    return 0
  }
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)
}

const decodeUtf16 = (bytes: Uint8Array) => {
  if (!bytes.length) {
    return ''
  }
  if (typeof TextDecoder === 'function') {
    return new TextDecoder('utf-16le').decode(bytes)
  }

  let output = ''
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    output += String.fromCharCode(bytes[index] | (bytes[index + 1] << 8))
  }
  return output
}

const decodeMetadata = (bytes: Uint8Array) => {
  return decodeUtf16(bytes)
    .replace(/\u0000+$/g, '')
    .trim()
}

const normalizeContent = (value: string) => {
  return value
    .replace(/\u0000+$/g, '')
    .replace(/\u2029/g, '\n')
    .replace(/\r\n?/g, '\n')
}

const joinByteArrays = (parts: Uint8Array[], expectedLength = 0) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const length = expectedLength > 0 ? Math.min(expectedLength, totalLength) : totalLength
  const result = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    if (offset >= length) {
      break
    }
    const next = part.subarray(0, Math.min(part.length, length - offset))
    result.set(next, offset)
    offset += next.length
  }

  return result
}

const inflateSegment = (bytes: Uint8Array) => {
  try {
    return inflate(bytes)
  } catch {
    return inflateRaw(bytes)
  }
}

const parseChapterTitles = (bytes: Uint8Array) => {
  const titles: string[] = []
  let offset = 0

  while (offset < bytes.length) {
    const length = bytes[offset]
    offset += 1
    if (!length || offset + length > bytes.length) {
      break
    }
    titles.push(decodeMetadata(bytes.subarray(offset, offset + length)))
    offset += length
  }

  return titles
}

const parseOffsets = (bytes: Uint8Array) => {
  const offsets: number[] = []
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  for (let offset = 0; offset + 4 <= bytes.length; offset += 4) {
    offsets.push(view.getUint32(offset, true))
  }

  return offsets
}

const detectImage = (bytes: Uint8Array) => {
  if (bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47) {
    return { extension: 'png', mimeType: 'image/png' }
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' }
  }
  if (bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46) {
    return { extension: 'gif', mimeType: 'image/gif' }
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return { extension: 'bmp', mimeType: 'image/bmp' }
  }
  if (bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50) {
    return { extension: 'webp', mimeType: 'image/webp' }
  }
  return { extension: 'bin', mimeType: 'application/octet-stream' }
}

const createImage = (bytes: Uint8Array, prefix: string, index: number): UmdImage => {
  const { extension, mimeType } = detectImage(bytes)
  return {
    bytes,
    extension,
    id: `${prefix}-${index}-${bytes.length}`,
    mimeType
  }
}

const toBookKind = (rawType: number): UmdBookKind => {
  if (rawType === 1) {
    return 'text'
  }
  if (rawType === 2) {
    return 'comic'
  }
  if (rawType === 3) {
    return 'mixed'
  }
  return 'unknown'
}

const formatPublishedAt = ({ day, month, year }: UmdMetadata) => {
  const parts = [year, month, day].filter(Boolean)
  return parts.join('-')
}

const createTextChapters = (textBytes: Uint8Array, chapterOffsets: number[], titles: string[]) => {
  if (!textBytes.length) {
    return []
  }

  const offsets = chapterOffsets.length ? chapterOffsets : [0]
  const safeOffsets = offsets
    .map(offset => Math.max(0, Math.min(offset, textBytes.length)))
    .filter((offset, index, list) => index === 0 || offset > list[index - 1])

  return safeOffsets.map((start, index) => {
    const end = index + 1 < safeOffsets.length ? safeOffsets[index + 1] : textBytes.length
    const alignedStart = start - (start % 2)
    const alignedEnd = end - (end % 2)
    const content = normalizeContent(decodeUtf16(textBytes.subarray(alignedStart, alignedEnd)))

    return {
      content,
      end: alignedEnd,
      id: `chapter-${index}-${alignedStart}`,
      images: [],
      start: alignedStart,
      title: titles[index] || `章节 ${index + 1}`,
      fallbackTitle: titles[index] ? undefined : 'chapter' as const
    }
  })
}

const createImageChapters = (images: UmdImage[], chapterOffsets: number[], titles: string[]) => {
  if (!images.length) {
    return []
  }

  const offsets = chapterOffsets.length ? chapterOffsets : [0]
  const safeOffsets = offsets
    .map(offset => Math.max(0, Math.min(offset, images.length)))
    .filter((offset, index, list) => index === 0 || offset > list[index - 1])

  return safeOffsets.map((start, index) => {
    const end = index + 1 < safeOffsets.length ? safeOffsets[index + 1] : images.length
    return {
      content: '',
      end,
      id: `image-chapter-${index}-${start}`,
      images: images.slice(start, end),
      start,
      title: titles[index] || `图集 ${index + 1}`,
      fallbackTitle: titles[index] ? undefined : 'gallery' as const
    }
  })
}

const createEmptyChapters = (titles: string[]) => {
  return titles.map((title, index) => ({
    content: '',
    end: index,
    id: `empty-chapter-${index}`,
    images: [],
    start: index,
    title: title || `章节 ${index + 1}`,
    fallbackTitle: title ? undefined : 'chapter' as const
  }))
}

export const parseUmdBook = (buffer: ArrayBuffer): UmdBook => {
  const cursor = new UmdCursor(buffer)
  const metadata: UmdMetadata = {
    author: '',
    category: '',
    day: '',
    month: '',
    publishedAt: '',
    publisher: '',
    title: '',
    vendor: '',
    year: ''
  }
  const sectionChecks = new Map<number, number>()
  const warnings: string[] = []
  const warningCodes: NonNullable<UmdBook['warningCodes']> = {}
  const textSegments: Uint8Array[] = []
  const images: UmdImage[] = []
  let activeSection = 0
  let chapterOffsets: number[] = []
  let chapterTitles: string[] = []
  let contentLength = 0
  let cover: UmdImage | undefined
  let rawType = 0

  if (cursor.readUint32() !== UMD_MAGIC) {
    throw Object.assign(new Error('不是有效的 UMD 电子书文件'), { code: 'UMD_INVALID_FILE' })
  }

  while (cursor.remaining > 0) {
    if (cursor.peek() !== SECTION_MARKER) {
      break
    }

    cursor.readUint8()
    const sectionType = cursor.readUint16()
    const sectionFlag = cursor.readUint8()
    const sectionLength = Math.max(0, cursor.readUint8() - MAX_SECTION_HEADER_SIZE)
    const payload = cursor.readBytes(sectionLength)
    const dataSection = sectionType === SECTION.CID || sectionType === SECTION.SPLASH
      ? activeSection
      : sectionType

    switch (sectionType) {
      case SECTION.VERSION:
        rawType = payload[0] || sectionFlag
        break
      case SECTION.TITLE:
        metadata.title = decodeMetadata(payload)
        break
      case SECTION.AUTHOR:
        metadata.author = decodeMetadata(payload)
        break
      case SECTION.YEAR:
        metadata.year = decodeMetadata(payload)
        break
      case SECTION.MONTH:
        metadata.month = decodeMetadata(payload)
        break
      case SECTION.DAY:
        metadata.day = decodeMetadata(payload)
        break
      case SECTION.CATEGORY:
        metadata.category = decodeMetadata(payload)
        break
      case SECTION.PUBLISHER:
        metadata.publisher = decodeMetadata(payload)
        break
      case SECTION.VENDOR:
        metadata.vendor = decodeMetadata(payload)
        break
      case SECTION.CONTENT_LENGTH:
        contentLength = readUint32From(payload)
        break
      case SECTION.TEXT_SEGMENT_INDEX:
      case SECTION.CHAPTER_OFFSETS:
      case SECTION.CHAPTER_TITLES:
      case SECTION.PAGE_OFFSETS:
        sectionChecks.set(sectionType, readUint32From(payload))
        break
      case SECTION.COVER:
        sectionChecks.set(sectionType, readUint32From(payload, 1))
        break
      case SECTION.IMAGE:
      case SECTION.MIXED_IMAGE:
        rawType = rawType || (sectionType === SECTION.MIXED_IMAGE ? 3 : 2)
        break
      default:
        break
    }

    activeSection = dataSection || activeSection

    while (cursor.peek() === DATA_MARKER) {
      cursor.readUint8()
      const check = cursor.readUint32()
      const dataLength = Math.max(0, cursor.readUint32() - 9)
      const data = cursor.readBytes(dataLength)

      switch (dataSection) {
        case SECTION.COVER:
          cover = createImage(data, 'cover', check)
          break
        case SECTION.CHAPTER_OFFSETS:
          chapterOffsets = parseOffsets(data)
          break
        case SECTION.CHAPTER_TITLES:
          if (check === sectionChecks.get(SECTION.CHAPTER_TITLES)) {
            chapterTitles = parseChapterTitles(data)
          } else {
            textSegments.push(data)
          }
          break
        case SECTION.IMAGE:
        case SECTION.MIXED_IMAGE:
          images.push(createImage(data, 'image', images.length))
          break
        default:
          break
      }
    }
  }

  const inflatedText = textSegments.map(segment => {
    try {
      return inflateSegment(segment)
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error))
      return new Uint8Array()
    }
  })
  const joinedText = joinByteArrays(inflatedText, contentLength)

  if (contentLength > joinedText.length && textSegments.length) {
    warningCodes[warnings.length] = 'UMD_TEXT_TOO_SHORT'
    warnings.push('UMD 正文长度小于声明长度，文件可能不完整')
  }

  let chapters: UmdChapter[] = createTextChapters(joinedText, chapterOffsets, chapterTitles)
  if (!chapters.length) {
    chapters = createImageChapters(images, chapterOffsets, chapterTitles)
  } else if (images.length && rawType !== 1) {
    chapters = createImageChapters(images, chapterOffsets, chapterTitles)
  }
  if (!chapters.length && chapterTitles.length) {
    chapters = createEmptyChapters(chapterTitles)
  }

  metadata.publishedAt = formatPublishedAt(metadata)

  return {
    author: metadata.author,
    category: metadata.category,
    chapters,
    contentLength: contentLength || joinedText.length,
    cover,
    kind: toBookKind(rawType),
    publishedAt: metadata.publishedAt,
    publisher: metadata.publisher,
    rawType,
    title: metadata.title || 'UMD 电子书',
    titleIsFallback: !metadata.title,
    vendor: metadata.vendor,
    warnings,
    warningCodes
  }
}
