import type { PhotoshopParseLimits } from './limits.js'

export interface AdobeAbrPreflight {
  format: 'abr'
  majorVersion: 6 | 7 | 9 | 10
  minorVersion: 1 | 2
  sections: number
  samples: number
  patterns: number
  previewPixels: number
  decodedBytes: number
}

export interface AdobeCshPreflight {
  format: 'csh'
  version: 2
  shapes: number
  pathRecords: number
  previewPixels: number
}

class Reader {
  readonly view: DataView
  offset = 0

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
  }

  get length() { return this.view.byteLength }

  ensure(length: number, end = this.length, label = 'Adobe resource') {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > end || end > this.length) {
      throw new Error(`${label} is truncated or has an invalid length.`)
    }
  }

  u8(end?: number, label?: string) { this.ensure(1, end, label); return this.view.getUint8(this.offset++) }
  i16(end?: number, label?: string) { this.ensure(2, end, label); const value = this.view.getInt16(this.offset, false); this.offset += 2; return value }
  u16(end?: number, label?: string) { this.ensure(2, end, label); const value = this.view.getUint16(this.offset, false); this.offset += 2; return value }
  i32(end?: number, label?: string) { this.ensure(4, end, label); const value = this.view.getInt32(this.offset, false); this.offset += 4; return value }
  u32(end?: number, label?: string) { this.ensure(4, end, label); const value = this.view.getUint32(this.offset, false); this.offset += 4; return value }
  i32le(end?: number, label?: string) { this.ensure(4, end, label); const value = this.view.getInt32(this.offset, true); this.offset += 4; return value }
  ascii(length: number, end?: number, label?: string) {
    this.ensure(length, end, label)
    let value = ''
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(this.view.getUint8(this.offset++))
    return value
  }
  skip(length: number, end?: number, label?: string) { this.ensure(length, end, label); this.offset += length }
}

interface InspectionBudget {
  descriptorItems: number
  previewPixels: number
  decodedBytes: number
}

const align4 = (value: number) => {
  const aligned = (value + 3) & ~3
  if (!Number.isSafeInteger(aligned) || aligned < value) throw new Error('Adobe resource alignment overflowed.')
  return aligned
}

const multiply = (left: number, right: number, label: string) => {
  const value = left * right
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} overflows the safe integer range.`)
  return value
}

const assertSource = (buffer: ArrayBuffer, limits: PhotoshopParseLimits, format: string) => {
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`${format.toUpperCase()} source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  }
}

const consumeResourceItems = (count: number, limits: PhotoshopParseLimits, label: string) => {
  if (!Number.isSafeInteger(count) || count < 0 || count > limits.maxResourceItems) {
    throw new Error(`${label} exceeds the ${limits.maxResourceItems}-item safety limit.`)
  }
}

const consumeDescriptorItems = (budget: InspectionBudget, count: number, limits: PhotoshopParseLimits, label: string) => {
  consumeResourceItems(count, limits, label)
  budget.descriptorItems += count
  const maximum = Math.min(1_000_000, limits.maxResourceItems * 64)
  if (budget.descriptorItems > maximum) throw new Error(`Adobe descriptor complexity exceeds the ${maximum}-record safety limit.`)
}

const consumePreview = (
  budget: InspectionBudget,
  pixels: number,
  decodedBytes: number,
  limits: PhotoshopParseLimits,
  label: string
) => {
  if (pixels <= 0 || pixels > limits.maxResourcePreviewPixels) {
    throw new Error(`${label} exceeds the ${limits.maxResourcePreviewPixels}-pixel preview limit.`)
  }
  budget.previewPixels += pixels
  budget.decodedBytes += decodedBytes
  if (budget.previewPixels > limits.maxResourcePreviewPixels) {
    throw new Error(`Adobe resource previews exceed the ${limits.maxResourcePreviewPixels}-pixel collection limit.`)
  }
  if (budget.decodedBytes > limits.maxDecodedBytes) {
    throw new Error(`Adobe resource decoding exceeds the ${limits.maxDecodedBytes}-byte safety limit.`)
  }
}

const readUnicode = (reader: Reader, end: number, limits: PhotoshopParseLimits, label: string) => {
  const length = reader.u32(end, label)
  if (length > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-code-unit name limit.`)
  }
  reader.skip(multiply(length, 2, `${label} length`), end, label)
}

const readPascal = (reader: Reader, end: number, limits: PhotoshopParseLimits, label: string) => {
  const length = reader.u8(end, label)
  if (length > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-code-unit name limit.`)
  }
  reader.skip(length, end, label)
}

const readAsciiId = (reader: Reader, end: number, limits: PhotoshopParseLimits, label: string) => {
  const length = reader.i32(end, label)
  if (length < 0) throw new Error(`${label} has a negative string length.`)
  const actualLength = length || 4
  if (actualLength > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-character identifier limit.`)
  }
  reader.skip(actualLength, end, label)
}

const readClass = (reader: Reader, end: number, limits: PhotoshopParseLimits, label: string) => {
  readUnicode(reader, end, limits, `${label} name`)
  readAsciiId(reader, end, limits, `${label} class id`)
}

const readCount = (reader: Reader, end: number, budget: InspectionBudget, limits: PhotoshopParseLimits, label: string) => {
  const count = reader.i32(end, label)
  if (count < 0) throw new Error(`${label} has a negative item count.`)
  consumeDescriptorItems(budget, count, limits, label)
  return count
}

const skipDescriptorValue = (
  reader: Reader,
  end: number,
  type: string,
  depth: number,
  budget: InspectionBudget,
  limits: PhotoshopParseLimits
): void => {
  if (depth > limits.maxNestingDepth) {
    throw new Error(`Adobe descriptor nesting exceeds the ${limits.maxNestingDepth}-level safety limit.`)
  }
  switch (type) {
    case 'obj ': {
      const count = readCount(reader, end, budget, limits, 'Adobe descriptor reference')
      for (let index = 0; index < count; index += 1) {
        const referenceType = reader.ascii(4, end, 'Adobe descriptor reference type')
        if (referenceType === 'prop') {
          readClass(reader, end, limits, 'Adobe property reference')
          readAsciiId(reader, end, limits, 'Adobe property key')
        } else if (referenceType === 'Clss') {
          readClass(reader, end, limits, 'Adobe class reference')
        } else if (referenceType === 'Enmr') {
          readClass(reader, end, limits, 'Adobe enum reference')
          readAsciiId(reader, end, limits, 'Adobe enum type')
          readAsciiId(reader, end, limits, 'Adobe enum value')
        } else if (referenceType === 'rele') {
          readClass(reader, end, limits, 'Adobe offset reference')
          reader.skip(4, end, 'Adobe offset reference')
        } else if (referenceType === 'Idnt' || referenceType === 'indx') {
          reader.skip(4, end, 'Adobe integer reference')
        } else if (referenceType === 'name') {
          readClass(reader, end, limits, 'Adobe name reference')
          readUnicode(reader, end, limits, 'Adobe reference name')
        } else {
          throw new Error(`Unsupported Adobe descriptor reference type ${JSON.stringify(referenceType)}.`)
        }
      }
      return
    }
    case 'Objc':
    case 'GlbO':
      skipDescriptorStructure(reader, end, depth + 1, budget, limits)
      return
    case 'VlLs': {
      const count = readCount(reader, end, budget, limits, 'Adobe descriptor list')
      for (let index = 0; index < count; index += 1) {
        const itemType = reader.ascii(4, end, 'Adobe descriptor list type')
        skipDescriptorValue(reader, end, itemType, depth + 1, budget, limits)
      }
      return
    }
    case 'doub': reader.skip(8, end, 'Adobe double'); return
    case 'UntF': reader.skip(12, end, 'Adobe unit double'); return
    case 'UnFl': reader.skip(8, end, 'Adobe unit float'); return
    case 'TEXT': readUnicode(reader, end, limits, 'Adobe descriptor text'); return
    case 'enum':
      readAsciiId(reader, end, limits, 'Adobe enum type')
      readAsciiId(reader, end, limits, 'Adobe enum value')
      return
    case 'long': reader.skip(4, end, 'Adobe integer'); return
    case 'comp': reader.skip(8, end, 'Adobe large integer'); return
    case 'bool': reader.skip(1, end, 'Adobe boolean'); return
    case 'type':
    case 'GlbC': readClass(reader, end, limits, 'Adobe descriptor class'); return
    case 'alis':
    case 'tdta': {
      const length = reader.i32(end, 'Adobe descriptor data length')
      if (length < 0 || length > limits.maxDecodedBytes) {
        throw new Error(`Adobe descriptor data exceeds the ${limits.maxDecodedBytes}-byte safety limit.`)
      }
      reader.skip(length, end, 'Adobe descriptor data')
      return
    }
    case 'ObAr': {
      reader.skip(4, end, 'Adobe object-array version')
      readUnicode(reader, end, limits, 'Adobe object-array name')
      readAsciiId(reader, end, limits, 'Adobe object-array class')
      const count = readCount(reader, end, budget, limits, 'Adobe object array')
      for (let index = 0; index < count; index += 1) {
        readAsciiId(reader, end, limits, 'Adobe object-array item type')
        const valueType = reader.ascii(4, end, 'Adobe object-array value type')
        if (valueType !== 'UnFl') throw new Error(`Unsupported Adobe object-array value type ${JSON.stringify(valueType)}.`)
        reader.skip(4, end, 'Adobe object-array units')
        const valueCount = readCount(reader, end, budget, limits, 'Adobe object-array values')
        reader.skip(multiply(valueCount, 8, 'Adobe object-array values'), end, 'Adobe object-array values')
      }
      return
    }
    case 'Pth ': {
      const totalLength = reader.i32(end, 'Adobe path length')
      if (totalLength < 0 || totalLength > limits.maxDecodedBytes) throw new Error('Adobe descriptor path length is invalid.')
      reader.skip(4, end, 'Adobe path signature')
      const pathSize = reader.i32le(end, 'Adobe path size')
      const characters = reader.i32le(end, 'Adobe path character count')
      if (pathSize < 0 || characters < 0 || characters > limits.maxResourceNameCodeUnits) {
        throw new Error('Adobe descriptor path exceeds its bounded string limits.')
      }
      reader.skip(multiply(characters, 2, 'Adobe path characters'), end, 'Adobe descriptor path')
      return
    }
    default:
      throw new Error(`Unsupported Adobe descriptor value type ${JSON.stringify(type)}.`)
  }
}

const skipDescriptorStructure = (
  reader: Reader,
  end: number,
  depth: number,
  budget: InspectionBudget,
  limits: PhotoshopParseLimits
) => {
  if (depth > limits.maxNestingDepth) {
    throw new Error(`Adobe descriptor nesting exceeds the ${limits.maxNestingDepth}-level safety limit.`)
  }
  readClass(reader, end, limits, 'Adobe descriptor')
  const count = reader.u32(end, 'Adobe descriptor item count')
  consumeDescriptorItems(budget, count, limits, 'Adobe descriptor item count')
  for (let index = 0; index < count; index += 1) {
    readAsciiId(reader, end, limits, 'Adobe descriptor key')
    const type = reader.ascii(4, end, 'Adobe descriptor value type')
    skipDescriptorValue(reader, end, type, depth + 1, budget, limits)
  }
}

const skipVersionedDescriptor = (
  reader: Reader,
  end: number,
  budget: InspectionBudget,
  limits: PhotoshopParseLimits
) => {
  const version = reader.u32(end, 'Adobe descriptor version')
  if (version !== 16) throw new Error(`Unsupported Adobe descriptor version ${version}.`)
  skipDescriptorStructure(reader, end, 0, budget, limits)
}

const inspectRleRows = (reader: Reader, end: number, width: number, height: number, label: string) => {
  const tableBytes = multiply(height, 2, `${label} row table`)
  reader.ensure(tableBytes, end, label)
  const rowLengths = Array.from({ length: height }, () => reader.u16(end, `${label} row length`))
  for (let row = 0; row < height; row += 1) {
    const rowEnd = reader.offset + rowLengths[row]
    if (rowEnd > end) throw new Error(`${label} compressed row ${row} is truncated.`)
    let decoded = 0
    while (reader.offset < rowEnd) {
      const header = reader.u8(rowEnd, `${label} PackBits header`)
      if (header <= 127) {
        const count = header + 1
        reader.skip(count, rowEnd, `${label} PackBits literal`)
        decoded += count
      } else if (header >= 129) {
        reader.skip(1, rowEnd, `${label} PackBits repeat value`)
        decoded += 257 - header
      }
      if (decoded > width) throw new Error(`${label} PackBits row ${row} expands beyond its declared width.`)
    }
    if (decoded !== width) throw new Error(`${label} PackBits row ${row} does not expand to its declared width.`)
  }
}

const inspectAbrSamples = (
  reader: Reader,
  end: number,
  minorVersion: 1 | 2,
  budget: InspectionBudget,
  limits: PhotoshopParseLimits
) => {
  let count = 0
  while (reader.offset < end) {
    consumeResourceItems(++count, limits, 'ABR sample count')
    const rawLength = reader.u32(end, 'ABR sample length')
    const recordStart = reader.offset
    const rawEnd = recordStart + rawLength
    const paddedEnd = recordStart + align4(rawLength)
    if (rawEnd > end || paddedEnd > end) throw new Error('ABR sample record is truncated.')
    readPascal(reader, rawEnd, limits, 'ABR sample id')
    reader.skip(minorVersion === 1 ? 10 : 264, rawEnd, 'ABR sample header')
    const top = reader.i32(rawEnd, 'ABR sample top')
    const left = reader.i32(rawEnd, 'ABR sample left')
    const bottom = reader.i32(rawEnd, 'ABR sample bottom')
    const right = reader.i32(rawEnd, 'ABR sample right')
    const width = right - left
    const height = bottom - top
    if (width <= 0 || height <= 0 || width > limits.maxCanvasDimension || height > limits.maxCanvasDimension) {
      throw new Error(`ABR sample dimensions exceed the ${limits.maxCanvasDimension}-pixel side limit.`)
    }
    const pixels = multiply(width, height, 'ABR sample pixels')
    const depth = reader.i16(rawEnd, 'ABR sample depth')
    const compression = reader.u8(rawEnd, 'ABR sample compression')
    if (depth !== 8 && depth !== 16) throw new Error(`Unsupported ABR sample depth ${depth}.`)
    if (compression !== 0 && compression !== 1) throw new Error(`Unsupported ABR sample compression ${compression}.`)
    if (depth === 16 && compression === 1) throw new Error('ABR 16-bit RLE samples are not supported by the decoding engine.')
    consumePreview(budget, pixels, pixels, limits, 'ABR sample')
    if (compression === 0) {
      reader.skip(multiply(pixels, depth / 8, 'ABR raw sample bytes'), rawEnd, 'ABR raw sample')
    } else {
      inspectRleRows(reader, rawEnd, width, height, 'ABR sample')
    }
    // Modern ABR minor-version 2 records can retain bounded opaque preset-key
    // bytes after the decoded sample payload. ag-psd deliberately advances to
    // the declared record end, so the preflight mirrors that behavior only
    // after validating the allocation-driving bounds, depth, and RLE lengths.
    if (reader.offset > rawEnd) throw new Error('ABR sample payload exceeded its declared record boundary.')
    reader.offset = rawEnd
    reader.offset = paddedEnd
  }
  return count
}

const inspectPatternRecord = (
  reader: Reader,
  sectionEnd: number,
  budget: InspectionBudget,
  limits: PhotoshopParseLimits
) => {
  const rawLength = reader.u32(sectionEnd, 'ABR pattern length')
  const start = reader.offset
  const end = start + align4(rawLength)
  if (end > sectionEnd) throw new Error('ABR pattern record is truncated.')
  if (reader.u32(end, 'ABR pattern version') !== 1) throw new Error('Unsupported ABR pattern version.')
  const colorMode = reader.u32(end, 'ABR pattern color mode')
  if (colorMode !== 1 && colorMode !== 2 && colorMode !== 3) throw new Error(`Unsupported ABR pattern color mode ${colorMode}.`)
  reader.skip(4, end, 'ABR pattern origin')
  readUnicode(reader, end, limits, 'ABR pattern name')
  readPascal(reader, end, limits, 'ABR pattern id')
  if (colorMode === 2) reader.skip(772, end, 'ABR indexed palette')
  if (reader.u32(end, 'ABR pattern VMAL version') !== 3) throw new Error('Unsupported ABR pattern VMAL version.')
  reader.u32(end, 'ABR pattern VMAL length')
  const top = reader.u32(end, 'ABR pattern top')
  const left = reader.u32(end, 'ABR pattern left')
  const bottom = reader.u32(end, 'ABR pattern bottom')
  const right = reader.u32(end, 'ABR pattern right')
  const channels = reader.u32(end, 'ABR pattern channel count')
  if (bottom <= top || right <= left || channels > 16) throw new Error('ABR pattern bounds or channel count is invalid.')
  const width = right - left
  const height = bottom - top
  if (width > limits.maxCanvasDimension || height > limits.maxCanvasDimension) {
    throw new Error(`ABR pattern dimensions exceed the ${limits.maxCanvasDimension}-pixel side limit.`)
  }
  const pixels = multiply(width, height, 'ABR pattern pixels')
  consumePreview(budget, pixels, multiply(pixels, 4, 'ABR pattern RGBA bytes'), limits, 'ABR pattern')
  for (let index = 0; index < channels + 2; index += 1) {
    const present = reader.u32(end, 'ABR pattern channel presence')
    if (!present) continue
    const length = reader.u32(end, 'ABR pattern channel length')
    if (length < 23) throw new Error('ABR pattern channel length is invalid.')
    const channelEnd = reader.offset + length
    if (channelEnd > end) throw new Error('ABR pattern channel is truncated.')
    const depth = reader.u32(channelEnd, 'ABR pattern channel depth')
    const channelTop = reader.u32(channelEnd, 'ABR pattern channel top')
    const channelLeft = reader.u32(channelEnd, 'ABR pattern channel left')
    const channelBottom = reader.u32(channelEnd, 'ABR pattern channel bottom')
    const channelRight = reader.u32(channelEnd, 'ABR pattern channel right')
    const depth2 = reader.u16(channelEnd, 'ABR pattern channel depth duplicate')
    const compression = reader.u8(channelEnd, 'ABR pattern channel compression')
    if (depth !== 8 || depth2 !== 8 || (compression !== 0 && compression !== 1)) {
      throw new Error('ABR pattern channel uses an unsupported depth or compression mode.')
    }
    if (channelBottom < channelTop || channelRight < channelLeft || channelTop < top || channelLeft < left || channelBottom > bottom || channelRight > right) {
      throw new Error('ABR pattern channel bounds are invalid.')
    }
    const channelWidth = channelRight - channelLeft
    const channelHeight = channelBottom - channelTop
    const channelPixels = multiply(channelWidth, channelHeight, 'ABR pattern channel pixels')
    if (compression === 0) {
      if (channelEnd - reader.offset !== channelPixels) throw new Error('ABR raw pattern channel length does not match its dimensions.')
      reader.skip(channelPixels, channelEnd, 'ABR raw pattern channel')
    } else {
      inspectRleRows(reader, channelEnd, channelWidth, channelHeight, 'ABR pattern channel')
      if (reader.offset !== channelEnd) throw new Error('ABR RLE pattern channel has trailing bytes.')
    }
  }
  reader.offset = end
}

export const inspectAdobeBrushLibrary = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobeAbrPreflight => {
  assertSource(buffer, limits, 'ABR')
  const reader = new Reader(buffer)
  const major = reader.i16(undefined, 'ABR version')
  if (major !== 6 && major !== 7 && major !== 9 && major !== 10) {
    throw new Error(`Unsupported ABR version ${major}; the browser engine supports modern ABR versions 6, 7, 9, and 10.`)
  }
  const minor = reader.i16(undefined, 'ABR minor version')
  if (minor !== 1 && minor !== 2) throw new Error(`Unsupported ABR minor version ${minor}.`)
  const budget: InspectionBudget = { descriptorItems: 0, previewPixels: 0, decodedBytes: 0 }
  let sections = 0
  let samples = 0
  let patterns = 0
  while (reader.offset < reader.length) {
    consumeResourceItems(++sections, limits, 'ABR section count')
    if (reader.ascii(4, undefined, 'ABR section signature') !== '8BIM') throw new Error('Invalid ABR section signature.')
    const type = reader.ascii(4, undefined, 'ABR section type')
    const rawLength = reader.u32(undefined, 'ABR section length')
    const start = reader.offset
    const end = start + rawLength
    const paddedEnd = start + align4(rawLength)
    if (end > reader.length || paddedEnd > reader.length) throw new Error('ABR section is truncated.')
    if (type === 'samp') samples += inspectAbrSamples(reader, end, minor, budget, limits)
    else if (type === 'desc' || type === 'phry') {
      skipVersionedDescriptor(reader, end, budget, limits)
      if (reader.offset !== end) throw new Error(`ABR ${type} descriptor does not consume its declared section.`)
    }
    else if (type === 'patt') {
      while (reader.offset < end) {
        consumeResourceItems(++patterns, limits, 'ABR pattern count')
        inspectPatternRecord(reader, end, budget, limits)
      }
    } else throw new Error(`Unsupported ABR section type ${JSON.stringify(type)}.`)
    if (reader.offset > end) throw new Error(`ABR ${type} section exceeded its declared boundary.`)
    reader.offset = paddedEnd
  }
  consumeResourceItems(samples + patterns, limits, 'ABR decoded resource count')
  return {
    format: 'abr',
    majorVersion: major,
    minorVersion: minor,
    sections,
    samples,
    patterns,
    previewPixels: budget.previewPixels,
    decodedBytes: budget.decodedBytes,
  }
}

export const inspectAdobeCustomShapeLibrary = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobeCshPreflight => {
  assertSource(buffer, limits, 'CSH')
  const reader = new Reader(buffer)
  if (reader.ascii(4, undefined, 'CSH signature') !== 'cush') throw new Error('Invalid CSH signature.')
  const version = reader.u32(undefined, 'CSH version')
  if (version !== 2) throw new Error(`Unsupported CSH version ${version}; version 2 is required.`)
  const shapes = reader.u32(undefined, 'CSH shape count')
  consumeResourceItems(shapes, limits, 'CSH shape count')
  let pathRecords = 0
  let previewPixels = 0
  const maximumPathRecords = Math.min(1_000_000, limits.maxResourceItems * 64)
  for (let shapeIndex = 0; shapeIndex < shapes; shapeIndex += 1) {
    readUnicode(reader, reader.length, limits, `CSH shape ${shapeIndex} name`)
    while (reader.offset % 4) reader.skip(1, reader.length, 'CSH name padding')
    if (reader.u32(undefined, 'CSH shape version') !== 1) throw new Error('Unsupported CSH shape record version.')
    const size = reader.u32(undefined, 'CSH shape record length')
    const end = reader.offset + size
    if (end > reader.length) throw new Error('CSH shape record is truncated.')
    readPascal(reader, end, limits, `CSH shape ${shapeIndex} id`)
    const top = reader.u32(end, 'CSH shape top')
    const left = reader.u32(end, 'CSH shape left')
    const bottom = reader.u32(end, 'CSH shape bottom')
    const right = reader.u32(end, 'CSH shape right')
    if (bottom <= top || right <= left) throw new Error('CSH shape bounds are invalid.')
    const width = right - left
    const height = bottom - top
    if (width > limits.maxCanvasDimension || height > limits.maxCanvasDimension) {
      throw new Error(`CSH shape dimensions exceed the ${limits.maxCanvasDimension}-pixel side limit.`)
    }
    const pixels = multiply(width, height, 'CSH shape preview pixels')
    previewPixels += pixels
    if (previewPixels > limits.maxResourcePreviewPixels) {
      throw new Error(`CSH previews exceed the ${limits.maxResourcePreviewPixels}-pixel collection limit.`)
    }
    if ((end - reader.offset) % 26 !== 0) throw new Error('CSH vector record section is not aligned to 26-byte path records.')
    let expectedKnots = 0
    let actualKnots = 0
    let hasPath = false
    while (reader.offset < end) {
      pathRecords += 1
      if (pathRecords > maximumPathRecords) throw new Error(`CSH path complexity exceeds the ${maximumPathRecords}-record safety limit.`)
      const selector = reader.u16(end, 'CSH vector selector')
      if (selector === 0 || selector === 3) {
        if (hasPath && actualKnots !== expectedKnots) throw new Error('CSH path knot count does not match its declared count.')
        expectedKnots = reader.u16(end, 'CSH path knot count')
        consumeResourceItems(expectedKnots, limits, 'CSH path knot count')
        const operation = reader.i16(end, 'CSH path boolean operation')
        if (operation < -1 || operation > 3) throw new Error('CSH path boolean operation is invalid.')
        reader.skip(20, end, 'CSH path header')
        actualKnots = 0
        hasPath = true
      } else if (selector === 1 || selector === 2 || selector === 4 || selector === 5) {
        if (!hasPath) throw new Error('CSH knot appears before a path header.')
        reader.skip(24, end, 'CSH Bezier knot')
        actualKnots += 1
        if (actualKnots > expectedKnots) throw new Error('CSH path contains more knots than declared.')
      } else if (selector === 6 || selector === 7 || selector === 8) {
        reader.skip(24, end, 'CSH vector metadata record')
      } else throw new Error(`Unsupported CSH vector selector ${selector}.`)
    }
    if (hasPath && actualKnots !== expectedKnots) throw new Error('CSH path knot count does not match its declared count.')
  }
  if (reader.offset !== reader.length) throw new Error('CSH file has trailing bytes outside its declared shapes.')
  return { format: 'csh', version: 2, shapes, pathRecords, previewPixels }
}
