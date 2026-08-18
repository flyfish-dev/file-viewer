export interface Mp4VideoTrackInfo {
  codec: string
  label: string
  contentType: string
}

export interface Mp4VideoSample {
  offset: number
  size: number
  dts: number
  cts: number
  duration: number
  isSync: boolean
}

export interface Mp4vSoftwareTrack extends Mp4VideoTrackInfo {
  width: number
  height: number
  timescale: number
  duration: number
  decoderConfig: Uint8Array
  samples: Mp4VideoSample[]
}

interface IsoBmffBox {
  type: string
  start: number
  payloadStart: number
  end: number
}

const MAX_MP4_VIDEO_SAMPLES = 1_000_000
const MAX_MP4V_DIMENSION = 8192
const MAX_MP4V_PIXELS = 35_000_000
const MAX_MP4V_DECODER_CONFIG_BYTES = 64 * 1024
const MAX_MP4V_SAMPLE_BYTES = 64 * 1024 * 1024

const VIDEO_CODEC_LABELS: Record<string, string> = {
  av01: 'AV1 (av01)',
  avc1: 'H.264/AVC (avc1)',
  avc3: 'H.264/AVC (avc3)',
  hev1: 'HEVC (hev1)',
  hvc1: 'HEVC (hvc1)',
  mp4v: 'MPEG-4 Part 2 (mp4v)',
  vp09: 'VP9 (vp09)'
}

const readFourCc = (view: DataView, offset: number) => {
  if (offset < 0 || offset + 4 > view.byteLength) return ''
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  )
}

const readBox = (view: DataView, offset: number, limit: number): IsoBmffBox | undefined => {
  if (offset < 0 || offset + 8 > limit || limit > view.byteLength) return undefined

  const size32 = view.getUint32(offset)
  const type = readFourCc(view, offset + 4)
  let headerSize = 8
  let size = size32

  if (size32 === 1) {
    if (offset + 16 > limit) return undefined
    const high = view.getUint32(offset + 8)
    const low = view.getUint32(offset + 12)
    size = high * 0x100000000 + low
    headerSize = 16
  } else if (size32 === 0) {
    size = limit - offset
  }

  if (!type || !Number.isSafeInteger(size) || size < headerSize || offset + size > limit) {
    return undefined
  }

  return {
    type,
    start: offset,
    payloadStart: offset + headerSize,
    end: offset + size
  }
}

const readChildren = (view: DataView, start: number, end: number) => {
  const boxes: IsoBmffBox[] = []
  let offset = start
  while (offset + 8 <= end) {
    const box = readBox(view, offset, end)
    if (!box) break
    boxes.push(box)
    if (box.end <= offset) break
    offset = box.end
  }
  return boxes
}

const findChild = (
  view: DataView,
  parent: IsoBmffBox,
  type: string
) => readChildren(view, parent.payloadStart, parent.end).find(box => box.type === type)

const readUint64 = (view: DataView, offset: number) => {
  const high = view.getUint32(offset)
  const low = view.getUint32(offset + 4)
  const value = high * 0x100000000 + low
  return Number.isSafeInteger(value) ? value : 0
}

const getHandlerType = (view: DataView, mediaBox: IsoBmffBox) => {
  const handlerBox = findChild(view, mediaBox, 'hdlr')
  if (!handlerBox || handlerBox.payloadStart + 12 > handlerBox.end) return ''
  return readFourCc(view, handlerBox.payloadStart + 8)
}

const getVideoSampleEntry = (view: DataView, mediaBox: IsoBmffBox) => {
  const mediaInformationBox = findChild(view, mediaBox, 'minf')
  const sampleTableBox = mediaInformationBox
    ? findChild(view, mediaInformationBox, 'stbl')
    : undefined
  const sampleDescriptionBox = sampleTableBox
    ? findChild(view, sampleTableBox, 'stsd')
    : undefined
  if (!sampleDescriptionBox || sampleDescriptionBox.payloadStart + 8 > sampleDescriptionBox.end) {
    return undefined
  }

  const entryCount = view.getUint32(sampleDescriptionBox.payloadStart + 4)
  const offset = sampleDescriptionBox.payloadStart + 8
  for (let index = 0; index < entryCount && offset + 8 <= sampleDescriptionBox.end; index += 1) {
    const entry = readBox(view, offset, sampleDescriptionBox.end)
    if (!entry) break
    return entry.type
  }
  return undefined
}

const getSampleDescription = (view: DataView, mediaBox: IsoBmffBox) => {
  const mediaInformationBox = findChild(view, mediaBox, 'minf')
  const sampleTableBox = mediaInformationBox
    ? findChild(view, mediaInformationBox, 'stbl')
    : undefined
  const sampleDescriptionBox = sampleTableBox
    ? findChild(view, sampleTableBox, 'stsd')
    : undefined
  if (!sampleDescriptionBox || sampleDescriptionBox.payloadStart + 16 > sampleDescriptionBox.end) {
    return undefined
  }
  return readBox(view, sampleDescriptionBox.payloadStart + 8, sampleDescriptionBox.end)
}

interface Mpeg4Descriptor {
  tag: number
  payloadStart: number
  end: number
}

const readMpeg4Descriptor = (
  view: DataView,
  offset: number,
  limit: number
): Mpeg4Descriptor | undefined => {
  if (offset + 2 > limit) return undefined
  const tag = view.getUint8(offset)
  let cursor = offset + 1
  let length = 0
  for (let index = 0; index < 4 && cursor < limit; index += 1) {
    const value = view.getUint8(cursor)
    cursor += 1
    length = (length << 7) | (value & 0x7f)
    if ((value & 0x80) === 0) {
      const end = cursor + length
      if (end > limit) return undefined
      return { tag, payloadStart: cursor, end }
    }
  }
  return undefined
}

const readDecoderSpecificInfo = (view: DataView, sampleEntry: IsoBmffBox) => {
  const visualSampleEntryHeaderSize = 78
  if (sampleEntry.payloadStart + visualSampleEntryHeaderSize > sampleEntry.end) {
    return undefined
  }
  const esdsBox = readChildren(
    view,
    sampleEntry.payloadStart + visualSampleEntryHeaderSize,
    sampleEntry.end
  ).find(box => box.type === 'esds')
  if (!esdsBox || esdsBox.payloadStart + 4 >= esdsBox.end) return undefined

  const esDescriptor = readMpeg4Descriptor(view, esdsBox.payloadStart + 4, esdsBox.end)
  if (!esDescriptor || esDescriptor.tag !== 0x03 || esDescriptor.payloadStart + 3 > esDescriptor.end) {
    return undefined
  }

  const flags = view.getUint8(esDescriptor.payloadStart + 2)
  let cursor = esDescriptor.payloadStart + 3
  if (flags & 0x80) cursor += 2
  if (flags & 0x40) {
    if (cursor >= esDescriptor.end) return undefined
    cursor += 1 + view.getUint8(cursor)
  }
  if (flags & 0x20) cursor += 2

  const decoderConfig = readMpeg4Descriptor(view, cursor, esDescriptor.end)
  if (!decoderConfig || decoderConfig.tag !== 0x04) return undefined
  cursor = decoderConfig.payloadStart + 13
  while (cursor < decoderConfig.end) {
    const descriptor = readMpeg4Descriptor(view, cursor, decoderConfig.end)
    if (!descriptor) return undefined
    if (descriptor.tag === 0x05) {
      const configSize = descriptor.end - descriptor.payloadStart
      if (configSize <= 0 || configSize > MAX_MP4V_DECODER_CONFIG_BYTES) {
        return undefined
      }
      return new Uint8Array(
        view.buffer.slice(descriptor.payloadStart, descriptor.end)
      )
    }
    cursor = descriptor.end
  }
  return undefined
}

const getMediaTimescaleAndDuration = (view: DataView, mediaBox: IsoBmffBox) => {
  const mediaHeader = findChild(view, mediaBox, 'mdhd')
  if (!mediaHeader || mediaHeader.payloadStart + 20 > mediaHeader.end) return undefined
  const version = view.getUint8(mediaHeader.payloadStart)
  if (version === 1) {
    if (mediaHeader.payloadStart + 32 > mediaHeader.end) return undefined
    return {
      timescale: view.getUint32(mediaHeader.payloadStart + 20),
      duration: readUint64(view, mediaHeader.payloadStart + 24)
    }
  }
  return {
    timescale: view.getUint32(mediaHeader.payloadStart + 12),
    duration: view.getUint32(mediaHeader.payloadStart + 16)
  }
}

const getSampleTable = (view: DataView, mediaBox: IsoBmffBox) => {
  const mediaInformationBox = findChild(view, mediaBox, 'minf')
  return mediaInformationBox ? findChild(view, mediaInformationBox, 'stbl') : undefined
}

const readTimeToSample = (
  view: DataView,
  box: IsoBmffBox,
  expectedSamples: number
) => {
  if (box.payloadStart + 8 > box.end) return []
  const count = view.getUint32(box.payloadStart + 4)
  const durations: number[] = []
  let cursor = box.payloadStart + 8
  for (let index = 0; index < count && cursor + 8 <= box.end; index += 1) {
    const sampleCount = view.getUint32(cursor)
    const sampleDelta = view.getUint32(cursor + 4)
    if (
      sampleCount === 0 ||
      sampleDelta === 0 ||
      durations.length + sampleCount > expectedSamples
    ) return []
    for (let sample = 0; sample < sampleCount; sample += 1) durations.push(sampleDelta)
    cursor += 8
  }
  return durations.length === expectedSamples ? durations : []
}

const readCompositionOffsets = (
  view: DataView,
  box: IsoBmffBox | undefined,
  expectedSamples: number
) => {
  if (!box || box.payloadStart + 8 > box.end) return []
  const version = view.getUint8(box.payloadStart)
  const count = view.getUint32(box.payloadStart + 4)
  const offsets: number[] = []
  let cursor = box.payloadStart + 8
  for (let index = 0; index < count && cursor + 8 <= box.end; index += 1) {
    const sampleCount = view.getUint32(cursor)
    const sampleOffset = version === 1
      ? view.getInt32(cursor + 4)
      : view.getUint32(cursor + 4)
    if (sampleCount === 0 || offsets.length + sampleCount > expectedSamples) return []
    for (let sample = 0; sample < sampleCount; sample += 1) offsets.push(sampleOffset)
    cursor += 8
  }
  return offsets.length === expectedSamples ? offsets : []
}

const readSampleSizes = (view: DataView, box: IsoBmffBox) => {
  if (box.payloadStart + 12 > box.end) return []
  const fixedSize = view.getUint32(box.payloadStart + 4)
  const count = view.getUint32(box.payloadStart + 8)
  if (count === 0 || count > MAX_MP4_VIDEO_SAMPLES) return []
  if (fixedSize) {
    if (fixedSize > MAX_MP4V_SAMPLE_BYTES) return []
    return Array.from({ length: count }, () => fixedSize)
  }
  const sizes: number[] = []
  let cursor = box.payloadStart + 12
  for (let index = 0; index < count && cursor + 4 <= box.end; index += 1) {
    const size = view.getUint32(cursor)
    if (size === 0 || size > MAX_MP4V_SAMPLE_BYTES) return []
    sizes.push(size)
    cursor += 4
  }
  return sizes.length === count ? sizes : []
}

const readChunkOffsets = (view: DataView, box: IsoBmffBox) => {
  if (box.payloadStart + 8 > box.end) return []
  const count = view.getUint32(box.payloadStart + 4)
  const entrySize = box.type === 'co64' ? 8 : 4
  const offsets: number[] = []
  let cursor = box.payloadStart + 8
  for (let index = 0; index < count && cursor + entrySize <= box.end; index += 1) {
    offsets.push(entrySize === 8 ? readUint64(view, cursor) : view.getUint32(cursor))
    cursor += entrySize
  }
  return offsets
}

interface SampleToChunkEntry {
  firstChunk: number
  samplesPerChunk: number
}

const readSampleToChunk = (view: DataView, box: IsoBmffBox) => {
  if (box.payloadStart + 8 > box.end) return []
  const count = view.getUint32(box.payloadStart + 4)
  const entries: SampleToChunkEntry[] = []
  let cursor = box.payloadStart + 8
  for (let index = 0; index < count && cursor + 12 <= box.end; index += 1) {
    const firstChunk = view.getUint32(cursor)
    const samplesPerChunk = view.getUint32(cursor + 4)
    if (
      firstChunk === 0 ||
      samplesPerChunk === 0 ||
      (entries.length === 0 && firstChunk !== 1) ||
      (entries.length > 0 && firstChunk <= entries[entries.length - 1].firstChunk)
    ) return []
    entries.push({ firstChunk, samplesPerChunk })
    cursor += 12
  }
  return entries
}

const readSyncSamples = (
  view: DataView,
  box: IsoBmffBox | undefined,
  sampleCount: number
) => {
  if (!box) return undefined
  if (box.payloadStart + 8 > box.end) return null
  const count = view.getUint32(box.payloadStart + 4)
  if (count > sampleCount) return null
  const samples = new Set<number>()
  let cursor = box.payloadStart + 8
  for (let index = 0; index < count && cursor + 4 <= box.end; index += 1) {
    const sample = view.getUint32(cursor)
    if (sample === 0 || sample > sampleCount) return null
    samples.add(sample - 1)
    cursor += 4
  }
  return samples
}

const buildSamples = (view: DataView, sampleTable: IsoBmffBox) => {
  const timeToSampleBox = findChild(view, sampleTable, 'stts')
  const sampleSizeBox = findChild(view, sampleTable, 'stsz')
  const sampleToChunkBox = findChild(view, sampleTable, 'stsc')
  const chunkOffsetBox = findChild(view, sampleTable, 'stco') || findChild(view, sampleTable, 'co64')
  if (!timeToSampleBox || !sampleSizeBox || !sampleToChunkBox || !chunkOffsetBox) return []

  const sizes = readSampleSizes(view, sampleSizeBox)
  if (!sizes.length) return []
  const durations = readTimeToSample(view, timeToSampleBox, sizes.length)
  if (!durations.length) return []
  const compositionOffsets = readCompositionOffsets(
    view,
    findChild(view, sampleTable, 'ctts'),
    sizes.length
  )
  const sampleToChunk = readSampleToChunk(view, sampleToChunkBox)
  const chunkOffsets = readChunkOffsets(view, chunkOffsetBox)
  const syncSamples = readSyncSamples(view, findChild(view, sampleTable, 'stss'), sizes.length)
  if (syncSamples === null) return []
  if (!sampleToChunk.length || !chunkOffsets.length) return []

  const offsets: number[] = []
  let sampleIndex = 0
  let tableIndex = 0
  for (let chunkIndex = 1; chunkIndex <= chunkOffsets.length && sampleIndex < sizes.length; chunkIndex += 1) {
    while (
      tableIndex + 1 < sampleToChunk.length &&
      sampleToChunk[tableIndex + 1].firstChunk <= chunkIndex
    ) tableIndex += 1
    let offset = chunkOffsets[chunkIndex - 1]
    for (
      let sampleInChunk = 0;
      sampleInChunk < sampleToChunk[tableIndex].samplesPerChunk && sampleIndex < sizes.length;
      sampleInChunk += 1
    ) {
      offsets.push(offset)
      offset += sizes[sampleIndex]
      sampleIndex += 1
    }
  }
  if (offsets.length !== sizes.length) return []

  let dts = 0
  return sizes.map((size, index): Mp4VideoSample => {
    const duration = durations[index] || durations[durations.length - 1] || 0
    const sample = {
      offset: offsets[index],
      size,
      dts,
      cts: dts + (compositionOffsets[index] || 0),
      duration,
      isSync: syncSamples ? syncSamples.has(index) : true
    }
    dts += duration
    return sample
  })
}

const getCodecContentType = (codec: string) => {
  const mimeCodec = codec === 'mp4v' ? 'mp4v.20' : codec
  return `video/mp4; codecs="${mimeCodec}"`
}

/**
 * Reads the declared video sample entry from an ISO BMFF/MP4 file.
 *
 * Browsers can accept the generic `video/mp4` container while silently
 * ignoring an unsupported video track. Inspecting `stsd` lets the renderer
 * distinguish that audio-only success from a genuinely decodable video.
 */
export const inspectMp4VideoTrack = (buffer: ArrayBuffer): Mp4VideoTrackInfo | undefined => {
  const view = new DataView(buffer)
  const movieBox = readChildren(view, 0, view.byteLength).find(box => box.type === 'moov')
  if (!movieBox) return undefined

  for (const trackBox of readChildren(view, movieBox.payloadStart, movieBox.end)) {
    if (trackBox.type !== 'trak') continue
    const mediaBox = findChild(view, trackBox, 'mdia')
    if (!mediaBox || getHandlerType(view, mediaBox) !== 'vide') continue
    const codec = getVideoSampleEntry(view, mediaBox)
    if (!codec) return undefined
    return {
      codec,
      label: VIDEO_CODEC_LABELS[codec] || codec,
      contentType: getCodecContentType(codec)
    }
  }

  return undefined
}

/**
 * Extracts the minimal MP4V decode timeline needed by the Apache-2.0
 * PacketVideo software decoder. This intentionally avoids a general-purpose
 * media framework so the fallback stays small and offline-friendly.
 */
export const extractMp4vSoftwareTrack = (buffer: ArrayBuffer): Mp4vSoftwareTrack | undefined => {
  const view = new DataView(buffer)
  const movieBox = readChildren(view, 0, view.byteLength).find(box => box.type === 'moov')
  if (!movieBox) return undefined

  for (const trackBox of readChildren(view, movieBox.payloadStart, movieBox.end)) {
    if (trackBox.type !== 'trak') continue
    const mediaBox = findChild(view, trackBox, 'mdia')
    if (!mediaBox || getHandlerType(view, mediaBox) !== 'vide') continue
    const sampleEntry = getSampleDescription(view, mediaBox)
    if (!sampleEntry || sampleEntry.type !== 'mp4v') return undefined
    const dimensionsOffset = sampleEntry.payloadStart + 24
    if (dimensionsOffset + 4 > sampleEntry.end) return undefined
    const decoderConfig = readDecoderSpecificInfo(view, sampleEntry)
    const timing = getMediaTimescaleAndDuration(view, mediaBox)
    const sampleTable = getSampleTable(view, mediaBox)
    const width = view.getUint16(dimensionsOffset)
    const height = view.getUint16(dimensionsOffset + 2)
    if (
      !width ||
      !height ||
      width > MAX_MP4V_DIMENSION ||
      height > MAX_MP4V_DIMENSION ||
      width * height > MAX_MP4V_PIXELS ||
      !decoderConfig?.length ||
      decoderConfig.length > MAX_MP4V_DECODER_CONFIG_BYTES ||
      !timing?.timescale ||
      !timing.duration ||
      !sampleTable
    ) return undefined
    const samples = buildSamples(view, sampleTable)
    if (!samples.length || samples.some(sample => (
      sample.offset < 0 ||
      sample.size <= 0 ||
      !Number.isSafeInteger(sample.offset + sample.size) ||
      sample.offset + sample.size > buffer.byteLength
    ))) return undefined
    return {
      codec: 'mp4v',
      label: VIDEO_CODEC_LABELS.mp4v,
      contentType: getCodecContentType('mp4v'),
      width,
      height,
      timescale: timing.timescale,
      duration: timing.duration,
      decoderConfig,
      samples
    }
  }
  return undefined
}
