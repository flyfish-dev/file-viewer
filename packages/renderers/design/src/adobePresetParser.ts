import {
  AdobeBinaryReader,
  createAdobeDescriptorBudget,
  descriptorBoolean,
  descriptorEnum,
  descriptorNumber,
  descriptorObject,
  descriptorText,
  descriptorValue,
  readAdobeDescriptor,
  readAdobeUnicode,
  type AdobeDescriptor,
  type AdobeDescriptorValue,
} from './adobeDescriptor.js'
import type { PhotoshopParseLimits } from './limits.js'
import type {
  AdobeGradientAlphaStop,
  AdobeGradientColorStop,
  AdobeGradientLibraryDocument,
  AdobeGradientPreset,
  AdobeLayerEffectKind,
  AdobeLayerEffectSummary,
  AdobeLayerStyleLibraryDocument,
  AdobeLayerStylePreset,
  AdobePatternLibraryDocument,
  AdobePatternTile,
  AdobePresetDocument,
  AdobePresetFormat,
} from './adobePresetProtocol.js'

interface DecodeBudget {
  previewPixels: number
  decodedBytes: number
}

const limitKeys: ReadonlyArray<keyof PhotoshopParseLimits> = [
  'maxFileBytes',
  'maxCanvasPixels',
  'maxCanvasDimension',
  'maxLayers',
  'maxNestingDepth',
  'maxLayerPixels',
  'maxDecodedBytes',
  'maxLayerCacheBytes',
  'maxResourceItems',
  'maxResourceNameCodeUnits',
  'maxResourcePreviewPixels',
]

const assertLimits = (limits: PhotoshopParseLimits) => {
  for (const key of limitKeys) {
    const value = limits[key]
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid Adobe preset safety limit ${key}.`)
  }
}

const align4 = (value: number) => (value + 3) & ~3

const add = (left: number, right: number, label: string) => {
  const result = left + right
  if (!Number.isSafeInteger(result) || result < 0) throw new Error(`${label} exceeds the safe integer range.`)
  return result
}

const multiply = (left: number, right: number, label: string) => {
  const result = left * right
  if (!Number.isSafeInteger(result) || result < 0) throw new Error(`${label} exceeds the safe integer range.`)
  return result
}

const assertSource = (buffer: ArrayBuffer, limits: PhotoshopParseLimits, format: string) => {
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`${format} source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  }
  if (!buffer.byteLength) throw new Error(`${format} source is empty.`)
}

const usePreviewBudget = (
  budget: DecodeBudget,
  pixels: number,
  bytes: number,
  limits: PhotoshopParseLimits,
  label: string
) => {
  budget.previewPixels = add(budget.previewPixels, pixels, `${label} preview pixels`)
  budget.decodedBytes = add(budget.decodedBytes, bytes, `${label} decoded bytes`)
  if (budget.previewPixels > limits.maxResourcePreviewPixels) {
    throw new Error(`${label} exceeds the ${limits.maxResourcePreviewPixels}-pixel preview safety limit.`)
  }
  if (budget.decodedBytes > limits.maxDecodedBytes) {
    throw new Error(`${label} exceeds the ${limits.maxDecodedBytes}-byte decoded-data safety limit.`)
  }
}

const readPascal = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  label: string
) => {
  const length = reader.u8(end, `${label} length`)
  if (length > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-byte safety limit.`)
  }
  return reader.ascii(length, end, label).replace(/\0+$/u, '')
}

const decodePackBits = (
  reader: AdobeBinaryReader,
  end: number,
  width: number,
  height: number,
  collect: boolean,
  label: string
) => {
  const rowLengths = Array.from({ length: height }, (_, row) => reader.u16(end, `${label} row ${row} length`))
  const output = collect ? new Uint8Array(multiply(width, height, `${label} pixels`)) : undefined
  for (let row = 0; row < height; row += 1) {
    const rowEnd = add(reader.offset, rowLengths[row], `${label} row ${row} end`)
    if (rowEnd > end) throw new Error(`${label} compressed row ${row} is truncated.`)
    let decoded = 0
    while (reader.offset < rowEnd) {
      const header = reader.u8(rowEnd, `${label} PackBits header`)
      if (header <= 127) {
        const count = header + 1
        const values = reader.slice(count, rowEnd, `${label} PackBits literal`)
        if (decoded + count > width) throw new Error(`${label} row ${row} expands beyond its declared width.`)
        if (output) output.set(values, row * width + decoded)
        decoded += count
      } else if (header >= 129) {
        const count = 257 - header
        const value = reader.u8(rowEnd, `${label} PackBits repeat value`)
        if (decoded + count > width) throw new Error(`${label} row ${row} expands beyond its declared width.`)
        output?.fill(value, row * width + decoded, row * width + decoded + count)
        decoded += count
      }
      // Header 128 is the PackBits no-op token.
    }
    if (decoded !== width) throw new Error(`${label} row ${row} expands to ${decoded} instead of ${width} pixels.`)
  }
  if (reader.offset !== end) throw new Error(`${label} has trailing compressed bytes.`)
  return output
}

const decodePlane = (
  reader: AdobeBinaryReader,
  end: number,
  width: number,
  height: number,
  compression: number,
  collect: boolean,
  label: string
) => {
  const pixels = multiply(width, height, `${label} pixels`)
  if (compression === 0) {
    if (reader.offset + pixels !== end) throw new Error(`${label} raw byte length does not match its dimensions.`)
    return collect ? Uint8Array.from(reader.slice(pixels, end, label)) : (reader.skip(pixels, end, label), undefined)
  }
  if (compression === 1) return decodePackBits(reader, end, width, height, collect, label)
  throw new Error(`${label} uses unsupported compression mode ${compression}.`)
}

const putPlane = (
  rgba: Uint8Array,
  canvas: { top: number; left: number; width: number; height: number },
  plane: Uint8Array,
  rectangle: { top: number; left: number; width: number; height: number },
  channel: 0 | 1 | 2 | 3,
  colorMode: number,
  palette?: Uint8Array,
  indices?: Uint8Array
) => {
  for (let y = 0; y < rectangle.height; y += 1) {
    for (let x = 0; x < rectangle.width; x += 1) {
      const source = y * rectangle.width + x
      const destination = ((rectangle.top - canvas.top + y) * canvas.width + rectangle.left - canvas.left + x) * 4
      const value = plane[source]
      if (colorMode === 1 && channel === 0) {
        rgba[destination] = value
        rgba[destination + 1] = value
        rgba[destination + 2] = value
      } else if (colorMode === 2 && channel === 0 && palette) {
        rgba[destination] = palette[value * 3]
        rgba[destination + 1] = palette[value * 3 + 1]
        rgba[destination + 2] = palette[value * 3 + 2]
        if (indices) indices[(rectangle.top - canvas.top + y) * canvas.width + rectangle.left - canvas.left + x] = value
      } else {
        rgba[destination + channel] = value
      }
    }
  }
}

const parsePatternRecord = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  budget: DecodeBudget,
  standalone: boolean,
  index: number
): AdobePatternTile => {
  if (reader.u32(end, `PAT pattern ${index} version`) !== 1) throw new Error(`PAT pattern ${index} uses an unsupported record version.`)
  const colorMode = reader.u32(end, `PAT pattern ${index} color mode`)
  if (colorMode !== 1 && colorMode !== 2 && colorMode !== 3) {
    throw new Error(`PAT pattern ${index} uses unsupported color mode ${colorMode}; only 8-bit grayscale, indexed, and RGB tiles are decoded.`)
  }
  const headerVertical = reader.i16(end, `PAT pattern ${index} vertical value`)
  const headerHorizontal = reader.i16(end, `PAT pattern ${index} horizontal value`)
  const name = readAdobeUnicode(reader, end, limits, `PAT pattern ${index} name`)
  const id = readPascal(reader, end, limits, `PAT pattern ${index} id`)
  if (!id) throw new Error(`PAT pattern ${index} has an empty unique id.`)
  let palette: Uint8Array | undefined
  let transparentIndex = 0xffff
  if (colorMode === 2) {
    palette = Uint8Array.from(reader.slice(768, end, `PAT pattern ${index} indexed palette`))
    if (standalone) {
      reader.u16(end, `PAT pattern ${index} indexed color count`)
      transparentIndex = reader.u16(end, `PAT pattern ${index} transparent palette index`)
    } else {
      reader.skip(4, end, `PAT pattern ${index} indexed footer`)
    }
  }
  if (reader.u32(end, `PAT pattern ${index} VMAL version`) !== 3) throw new Error(`PAT pattern ${index} uses an unsupported VMAL version.`)
  const vmaLength = reader.u32(end, `PAT pattern ${index} VMAL length`)
  const vmaEnd = add(reader.offset, vmaLength, `PAT pattern ${index} VMAL end`)
  if (vmaEnd > end) throw new Error(`PAT pattern ${index} VMAL is truncated.`)
  const top = reader.i32(vmaEnd, `PAT pattern ${index} top`)
  const left = reader.i32(vmaEnd, `PAT pattern ${index} left`)
  const bottom = reader.i32(vmaEnd, `PAT pattern ${index} bottom`)
  const right = reader.i32(vmaEnd, `PAT pattern ${index} right`)
  const width = right - left
  const height = bottom - top
  const declaredChannels = reader.u32(vmaEnd, `PAT pattern ${index} channel count`)
  if (width <= 0 || height <= 0 || width > limits.maxCanvasDimension || height > limits.maxCanvasDimension) {
    throw new Error(`PAT pattern ${index} dimensions exceed the ${limits.maxCanvasDimension}-pixel side safety limit.`)
  }
  if (standalone && (headerHorizontal !== width || headerVertical !== height)) {
    throw new Error(`PAT pattern ${index} header dimensions disagree with its decoded VMAL bounds.`)
  }
  if (declaredChannels > 64) throw new Error(`PAT pattern ${index} channel count exceeds the 64-channel safety limit.`)
  const pixels = multiply(width, height, `PAT pattern ${index} pixels`)
  usePreviewBudget(budget, pixels, multiply(pixels, 4, `PAT pattern ${index} RGBA bytes`), limits, `PAT pattern ${index}`)
  const rgba = new Uint8Array(pixels * 4)
  for (let offset = 3; offset < rgba.length; offset += 4) rgba[offset] = 255
  const indices = colorMode === 2 ? new Uint8Array(pixels) : undefined
  const requiredColorPlanes = colorMode === 3 ? 3 : 1
  const seenColorPlanes = new Set<number>()
  let hasAlphaPlane = false
  const canvas = { top, left, width, height }
  for (let slot = 0; slot < declaredChannels + 2; slot += 1) {
    const present = reader.u32(vmaEnd, `PAT pattern ${index} channel ${slot} presence`)
    if (!present) continue
    if (present !== 1) throw new Error(`PAT pattern ${index} channel ${slot} has an invalid presence marker.`)
    const length = reader.u32(vmaEnd, `PAT pattern ${index} channel ${slot} length`)
    if (length < 23) throw new Error(`PAT pattern ${index} channel ${slot} is shorter than its header.`)
    const channelEnd = add(reader.offset, length, `PAT pattern ${index} channel ${slot} end`)
    if (channelEnd > vmaEnd) throw new Error(`PAT pattern ${index} channel ${slot} is truncated.`)
    const depth = reader.u32(channelEnd, `PAT pattern ${index} channel ${slot} depth`)
    const channelTop = reader.i32(channelEnd, `PAT pattern ${index} channel ${slot} top`)
    const channelLeft = reader.i32(channelEnd, `PAT pattern ${index} channel ${slot} left`)
    const channelBottom = reader.i32(channelEnd, `PAT pattern ${index} channel ${slot} bottom`)
    const channelRight = reader.i32(channelEnd, `PAT pattern ${index} channel ${slot} right`)
    const depthCopy = reader.u16(channelEnd, `PAT pattern ${index} channel ${slot} depth copy`)
    const compression = reader.u8(channelEnd, `PAT pattern ${index} channel ${slot} compression`)
    if (depth !== 8 || depthCopy !== 8) throw new Error(`PAT pattern ${index} channel ${slot} is not 8-bit.`)
    if (channelTop < top || channelLeft < left || channelBottom > bottom || channelRight > right || channelBottom <= channelTop || channelRight <= channelLeft) {
      throw new Error(`PAT pattern ${index} channel ${slot} bounds are outside the tile.`)
    }
    const channelWidth = channelRight - channelLeft
    const channelHeight = channelBottom - channelTop
    const isColor = slot < requiredColorPlanes
    const isAlpha = slot === declaredChannels + 1
    const plane = decodePlane(
      reader,
      channelEnd,
      channelWidth,
      channelHeight,
      compression,
      isColor || isAlpha,
      `PAT pattern ${index} channel ${slot}`
    )
    if (plane && isColor) {
      seenColorPlanes.add(slot)
      putPlane(rgba, canvas, plane, { top: channelTop, left: channelLeft, width: channelWidth, height: channelHeight }, slot as 0 | 1 | 2, colorMode, palette, indices)
    } else if (plane && isAlpha) {
      hasAlphaPlane = true
      putPlane(rgba, canvas, plane, { top: channelTop, left: channelLeft, width: channelWidth, height: channelHeight }, 3, colorMode)
    }
  }
  if (reader.offset !== vmaEnd) throw new Error(`PAT pattern ${index} VMAL has trailing or unparsed bytes.`)
  if (seenColorPlanes.size !== requiredColorPlanes) {
    throw new Error(`PAT pattern ${index} is missing one or more required color planes.`)
  }
  if (colorMode === 2 && !hasAlphaPlane && transparentIndex < 256 && indices) {
    for (let pixel = 0; pixel < indices.length; pixel += 1) if (indices[pixel] === transparentIndex) rgba[pixel * 4 + 3] = 0
  }
  let hasTransparency = false
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (rgba[pixel * 4 + 3] !== 255) {
      hasTransparency = true
      break
    }
  }
  return {
    name: name || `Pattern ${index}`,
    id,
    width,
    height,
    colorMode: colorMode === 1 ? 'grayscale' : colorMode === 2 ? 'indexed' : 'rgb',
    rgba,
    hasTransparency,
  }
}

const parsePatternBlock = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  budget: DecodeBudget
) => {
  const patterns: AdobePatternTile[] = []
  while (reader.offset < end) {
    if (patterns.length >= limits.maxResourceItems) throw new Error(`Embedded pattern count exceeds the ${limits.maxResourceItems}-item safety limit.`)
    const length = reader.u32(end, 'Embedded PAT record length')
    const recordEnd = add(reader.offset, length, 'Embedded PAT record end')
    const paddedEnd = add(reader.offset, align4(length), 'Embedded PAT padded end')
    if (!length || recordEnd > end || paddedEnd > end) throw new Error('Embedded PAT record is truncated.')
    patterns.push(parsePatternRecord(reader, recordEnd, limits, budget, false, patterns.length + 1))
    if (reader.offset !== recordEnd) throw new Error(`Embedded PAT pattern ${patterns.length} length does not match its decoded payload.`)
    for (const value of reader.slice(paddedEnd - recordEnd, paddedEnd, 'Embedded PAT padding')) {
      if (value !== 0) throw new Error(`Embedded PAT pattern ${patterns.length} has non-zero alignment bytes.`)
    }
  }
  if (reader.offset !== end) throw new Error('Embedded PAT block length is invalid.')
  return patterns
}

const parsePat = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobePatternLibraryDocument => {
  assertSource(buffer, limits, 'PAT')
  const reader = new AdobeBinaryReader(buffer)
  if (reader.ascii(4, reader.length, 'PAT signature') !== '8BPT') throw new Error('Invalid Photoshop PAT signature.')
  if (reader.u16(reader.length, 'PAT version') !== 1) throw new Error('Unsupported Photoshop PAT version; expected version 1.')
  const count = reader.u32(reader.length, 'PAT pattern count')
  if (!count || count > limits.maxResourceItems) throw new Error(`PAT pattern count must be between 1 and ${limits.maxResourceItems}.`)
  const budget: DecodeBudget = { previewPixels: 0, decodedBytes: 0 }
  const patterns = Array.from({ length: count }, (_, index) => parsePatternRecord(reader, reader.length, limits, budget, true, index + 1))
  parseOptionalHierarchy(reader, limits, createAdobeDescriptorBudget(limits), patterns.length)
  return {
    format: 'pat',
    version: '1',
    engine: 'file-viewer-native',
    fidelity: 'decoded-pattern-tile',
    patterns,
    limitations: [
      'The renderer decodes Photoshop PAT v1 grayscale, indexed, and RGB tiles with 8-bit raw or PackBits planes; CMYK, Lab, multichannel, 16-bit, and 32-bit pattern records are rejected.',
      'Tile pixels and transparency are preserved. Photoshop pattern transforms, fills, layer blending, and color-management behavior are outside a standalone PAT library.',
    ],
  }
}

const clamp = (value: number, minimum: number, maximum: number, label: string) => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`${label} is outside ${minimum}…${maximum}.`)
  return value
}

const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const hsvToRgb = (hue: number, saturation: number, brightness: number): [number, number, number] => {
  const h = ((hue % 360) + 360) % 360 / 60
  const s = Math.max(0, Math.min(1, saturation / 100))
  const v = Math.max(0, Math.min(1, brightness / 100))
  const chroma = v * s
  const x = chroma * (1 - Math.abs(h % 2 - 1))
  const m = v - chroma
  const rgb = h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0] : h < 3 ? [0, chroma, x] : h < 4 ? [0, x, chroma] : h < 5 ? [x, 0, chroma] : [chroma, 0, x]
  return rgb.map(value => byte((value + m) * 255)) as [number, number, number]
}

const labToRgb = (lightness: number, a: number, b: number): [number, number, number] => {
  const delta = 6 / 29
  const inverse = (value: number) => value > delta ? value ** 3 : 3 * delta * delta * (value - 4 / 29)
  const fy = (lightness + 16) / 116
  const d50X = 0.96422 * inverse(fy + a / 500)
  const d50Y = inverse(fy)
  const d50Z = 0.82521 * inverse(fy - b / 200)
  const x = 0.9555766 * d50X - 0.0230393 * d50Y + 0.0631636 * d50Z
  const y = -0.0282895 * d50X + 1.0099416 * d50Y + 0.0210077 * d50Z
  const z = 0.0122982 * d50X - 0.020483 * d50Y + 1.3299098 * d50Z
  const linear = [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ]
  return linear.map(component => byte((component <= 0.0031308 ? 12.92 * component : 1.055 * Math.max(0, component) ** (1 / 2.4) - 0.055) * 255)) as [number, number, number]
}

const parseGradientColor = (descriptor: AdobeDescriptor | undefined): { rgb: [number, number, number]; colorSpace: AdobeGradientColorStop['colorSpace'] } => {
  if (!descriptor) return { rgb: [0, 0, 0], colorSpace: 'unknown' }
  if (descriptor.classId === 'RGBC') return {
    rgb: [byte(descriptorNumber(descriptor, 'Rd  ')), byte(descriptorNumber(descriptor, 'Grn ')), byte(descriptorNumber(descriptor, 'Bl  '))],
    colorSpace: 'rgb',
  }
  if (descriptor.classId === 'Grsc') {
    const gray = byte(clamp(descriptorNumber(descriptor, 'Gry '), 0, 100, 'GRD gray') * 2.55)
    return { rgb: [gray, gray, gray], colorSpace: 'gray' }
  }
  if (descriptor.classId === 'HSBC' || descriptor.classId === 'HSBl') return {
    rgb: hsvToRgb(descriptorNumber(descriptor, 'H   '), descriptorNumber(descriptor, 'Strt'), descriptorNumber(descriptor, 'Brgh')),
    colorSpace: 'hsb',
  }
  if (descriptor.classId === 'LbCl') return {
    rgb: labToRgb(descriptorNumber(descriptor, 'Lmnc'), descriptorNumber(descriptor, 'A   '), descriptorNumber(descriptor, 'B   ')),
    colorSpace: 'lab',
  }
  if (descriptor.classId === 'CMYC') {
    const c = clamp(descriptorNumber(descriptor, 'Cyn '), 0, 100, 'GRD cyan') / 100
    const m = clamp(descriptorNumber(descriptor, 'Mgnt'), 0, 100, 'GRD magenta') / 100
    const y = clamp(descriptorNumber(descriptor, 'Ylw '), 0, 100, 'GRD yellow') / 100
    const k = clamp(descriptorNumber(descriptor, 'Blck'), 0, 100, 'GRD black') / 100
    return { rgb: [byte((1 - c) * (1 - k) * 255), byte((1 - m) * (1 - k) * 255), byte((1 - y) * (1 - k) * 255)], colorSpace: 'cmyk' }
  }
  return { rgb: [0, 0, 0], colorSpace: 'unknown' }
}

const listObjects = (value: AdobeDescriptorValue | undefined, label: string, maximum: number) => {
  if (!value || value.type !== 'list') throw new Error(`${label} list is missing.`)
  if (value.value.length > maximum) throw new Error(`${label} exceeds the ${maximum}-item safety limit.`)
  return value.value.map((item, index) => {
    if (item.type !== 'object') throw new Error(`${label} item ${index + 1} is not an object.`)
    return item.value
  })
}

const midpointCurve = (value: number, midpoint: number) => value <= midpoint
  ? midpoint <= 0 ? .5 : .5 * value / midpoint
  : midpoint >= 1 ? .5 : .5 + .5 * (value - midpoint) / (1 - midpoint)

const interpolate = (stops: Array<{ location: number; midpoint: number; value: number[] }>, position: number, channels: number) => {
  if (position <= stops[0].location) return stops[0].value
  if (position >= stops.at(-1)!.location) return stops.at(-1)!.value
  const rightIndex = stops.findIndex(stop => stop.location >= position)
  const left = stops[rightIndex - 1]
  const right = stops[rightIndex]
  const span = Math.max(1e-9, right.location - left.location)
  const progress = midpointCurve((position - left.location) / span, Math.max(.001, Math.min(.999, left.midpoint)))
  return Array.from({ length: channels }, (_, channel) => left.value[channel] + (right.value[channel] - left.value[channel]) * progress)
}

const renderSolidGradient = (colorStops: AdobeGradientColorStop[], alphaStops: AdobeGradientAlphaStop[]) => {
  const output = new Uint8Array(256 * 4)
  const colors = colorStops.map(stop => ({ location: stop.location, midpoint: stop.midpoint, value: stop.rgb }))
  const alphas = alphaStops.map(stop => ({ location: stop.location, midpoint: stop.midpoint, value: [stop.opacity] }))
  for (let pixel = 0; pixel < 256; pixel += 1) {
    const position = pixel / 255
    const rgb = interpolate(colors, position, 3)
    const alpha = interpolate(alphas, position, 1)[0]
    output.set([byte(rgb[0]), byte(rgb[1]), byte(rgb[2]), byte(alpha * 255)], pixel * 4)
  }
  return output
}

const readIntegerRange = (descriptor: AdobeDescriptor, key: string, fallback: number): [number, number, number, number] => {
  const value = descriptorValue(descriptor, key)
  const values = value?.type === 'list' ? value.value : []
  return [0, 1, 2, 3].map(index => {
    const item = values[index]
    return item?.type === 'integer' ? clamp(item.value, 0, 100, `GRD ${key} range`) : fallback
  }) as [number, number, number, number]
}

const renderNoiseGradient = (seed: number, minimum: number[], maximum: number[], addTransparency: boolean) => {
  const output = new Uint8Array(256 * 4)
  let state = seed >>> 0 || 0x9e3779b9
  const random = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0xffffffff
  }
  for (let pixel = 0; pixel < 256; pixel += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      output[pixel * 4 + channel] = byte((minimum[channel] + random() * (maximum[channel] - minimum[channel])) * 2.55)
    }
    output[pixel * 4 + 3] = addTransparency ? byte((minimum[3] + random() * (maximum[3] - minimum[3])) * 2.55) : 255
  }
  return output
}

const resolveZString = (value: string) => {
  if (!value.startsWith('$$$/')) return value
  const equals = value.lastIndexOf('=')
  if (equals >= 0 && equals + 1 < value.length) return value.slice(equals + 1)
  const slash = value.lastIndexOf('/')
  return slash >= 0 ? value.slice(slash + 1) : value
}

const parseGradient = (
  wrapper: AdobeDescriptor,
  index: number,
  limits: PhotoshopParseLimits,
  previewBudget: DecodeBudget
): AdobeGradientPreset => {
  usePreviewBudget(previewBudget, 256, 1024, limits, `GRD gradient ${index}`)
  const source = descriptorObject(wrapper, 'Grad') || wrapper
  const name = resolveZString(descriptorText(source, 'Nm  ') || `Gradient ${index}`)
  const form = descriptorEnum(source, 'GrdF') || 'CstS'
  if (form === 'ClNs') {
    const minimum = readIntegerRange(source, 'Mnm ', 0)
    const maximum = readIntegerRange(source, 'Mxm ', 100)
    maximum.forEach((value, channel) => { if (value < minimum[channel]) throw new Error(`${name}: noise maximum is below its minimum.`) })
    const seed = clamp(descriptorNumber(source, 'RndS', 0), 0, 0xffffffff, `${name} random seed`)
    const roughness = clamp(descriptorNumber(source, 'Smth', 2048), 0, 4096, `${name} roughness`)
    const colorModelValue = descriptorEnum(source, 'ClrS') || 'RGBC'
    const colorModel = colorModelValue === 'HSBl' || colorModelValue === 'HSBC' ? 'hsb' : colorModelValue === 'LbCl' || colorModelValue === 'LABC' ? 'lab' : 'rgb'
    const addTransparency = descriptorBoolean(source, 'ShTr', false)
    return {
      name,
      definition: {
        form: 'noise', seed, roughness, colorModel,
        restrictColors: descriptorBoolean(source, 'VctC', true), addTransparency,
        minimum, maximum,
      },
      previewRgba: renderNoiseGradient(seed, minimum, maximum, addTransparency),
    }
  }
  if (form !== 'CstS') throw new Error(`${name}: unsupported GRD gradient form ${JSON.stringify(form)}.`)
  const colorObjects = listObjects(descriptorValue(source, 'Clrs'), `${name} color stops`, Math.min(256, limits.maxResourceItems))
  const colorStops = colorObjects.map((stop, stopIndex): AdobeGradientColorStop => {
    const location = clamp(descriptorNumber(stop, 'Lctn') / 4096, 0, 1, `${name} color stop ${stopIndex + 1} location`)
    const midpoint = clamp(descriptorNumber(stop, 'Mdpn', 50) / 100, 0, 1, `${name} color stop ${stopIndex + 1} midpoint`)
    const type = descriptorEnum(stop, 'Type') || 'UsrS'
    const kind = type === 'FrgC' ? 'foreground' : type === 'BckC' ? 'background' : 'user'
    const converted = kind === 'foreground' ? { rgb: [0, 0, 0] as [number, number, number], colorSpace: 'unknown' as const }
      : kind === 'background' ? { rgb: [255, 255, 255] as [number, number, number], colorSpace: 'unknown' as const }
        : parseGradientColor(descriptorObject(stop, 'Clr '))
    if (kind === 'user' && converted.colorSpace === 'unknown') throw new Error(`${name} color stop ${stopIndex + 1} uses an unsupported color object.`)
    return { location, midpoint, kind, ...converted }
  }).sort((left, right) => left.location - right.location)
  if (colorStops.length < 2) throw new Error(`${name} has fewer than two usable color stops.`)
  const transparency = descriptorValue(source, 'Trns')
  const alphaStops = transparency ? listObjects(transparency, `${name} transparency stops`, Math.min(256, limits.maxResourceItems)).map((stop, stopIndex): AdobeGradientAlphaStop => ({
    location: clamp(descriptorNumber(stop, 'Lctn') / 4096, 0, 1, `${name} alpha stop ${stopIndex + 1} location`),
    midpoint: clamp(descriptorNumber(stop, 'Mdpn', 50) / 100, 0, 1, `${name} alpha stop ${stopIndex + 1} midpoint`),
    opacity: clamp(descriptorNumber(stop, 'Opct', 100) / 100, 0, 1, `${name} alpha stop ${stopIndex + 1} opacity`),
  })).sort((left, right) => left.location - right.location) : [
    { location: 0, midpoint: .5, opacity: 1 },
    { location: 1, midpoint: .5, opacity: 1 },
  ]
  if (!alphaStops.length) throw new Error(`${name} declares an empty transparency-stop list.`)
  return {
    name,
    definition: { form: 'solid', smoothness: clamp(descriptorNumber(source, 'Intr', 4096), 0, 4096, `${name} smoothness`), colorStops, alphaStops },
    previewRgba: renderSolidGradient(colorStops, alphaStops),
  }
}

const hierarchyFolders = (descriptor: AdobeDescriptor, count: number) => {
  const value = descriptorValue(descriptor, 'hierarchy')
  if (!value || value.type !== 'list') return Array.from({ length: count }, () => '')
  const folders = Array.from({ length: count }, () => '')
  const stack: string[] = []
  let preset = 0
  for (const item of value.value) {
    if (item.type !== 'object') continue
    if (item.value.classId === 'Grup') stack.push(resolveZString(descriptorText(item.value, 'Nm  ') || ''))
    else if (item.value.classId === 'groupEnd') stack.pop()
    else if (item.value.classId === 'preset' && preset < folders.length) folders[preset++] = stack.filter(Boolean).join(' / ')
  }
  return folders
}

const parseOptionalHierarchy = (
  reader: AdobeBinaryReader,
  limits: PhotoshopParseLimits,
  descriptorBudget: ReturnType<typeof createAdobeDescriptorBudget>,
  count: number
) => {
  if (!reader.remaining) return Array.from({ length: count }, () => '')
  if (reader.remaining < 12 || reader.ascii(4, reader.length, 'Adobe hierarchy signature') !== '8BIM' || reader.ascii(4, reader.length, 'Adobe hierarchy key') !== 'phry') {
    throw new Error('Adobe preset file has unrecognized trailing data.')
  }
  const length = reader.u32(reader.length, 'Adobe hierarchy length')
  const end = add(reader.offset, length, 'Adobe hierarchy end')
  if (end > reader.length) throw new Error('Adobe hierarchy data is truncated.')
  if (reader.u32(end, 'Adobe hierarchy descriptor version') !== 16) throw new Error('Unsupported Adobe hierarchy descriptor version.')
  const descriptor = readAdobeDescriptor(reader, end, limits, descriptorBudget)
  if (reader.offset !== end) throw new Error('Adobe hierarchy descriptor has trailing bytes.')
  if (reader.remaining) throw new Error('Adobe preset file has bytes after its hierarchy data.')
  return hierarchyFolders(descriptor, count)
}

const parseGrd = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobeGradientLibraryDocument => {
  assertSource(buffer, limits, 'GRD')
  const reader = new AdobeBinaryReader(buffer)
  if (reader.ascii(4, reader.length, 'GRD signature') !== '8BGR') throw new Error('Invalid Photoshop GRD signature.')
  if (reader.u16(reader.length, 'GRD version') !== 5) throw new Error('Unsupported Photoshop GRD version; only descriptor-based version 5 is decoded.')
  if (reader.u32(reader.length, 'GRD descriptor version') !== 16) throw new Error('Unsupported GRD Action Descriptor version.')
  const descriptorBudget = createAdobeDescriptorBudget(limits)
  const root = readAdobeDescriptor(reader, reader.length, limits, descriptorBudget)
  const previewBudget: DecodeBudget = { previewPixels: 0, decodedBytes: 0 }
  const gradients = listObjects(descriptorValue(root, 'GrdL'), 'GRD gradients', limits.maxResourceItems).map((gradient, index) => parseGradient(gradient, index + 1, limits, previewBudget))
  if (!gradients.length) throw new Error('GRD file contains no gradients.')
  const folders = parseOptionalHierarchy(reader, limits, descriptorBudget, gradients.length)
  gradients.forEach((gradient, index) => { if (folders[index]) gradient.folder = folders[index] })
  return {
    format: 'grd',
    version: '5',
    engine: 'file-viewer-native',
    fidelity: 'solid-stop-preview-noise-approximation',
    gradients,
    limitations: [
      'Solid-gradient stops, midpoint positions, transparency, names, and folders are preserved. Foreground/background stops use black/white because their final colors depend on Photoshop application state.',
      'Noise-gradient metadata is preserved, but the thumbnail is a deterministic approximation; Photoshop does not publish its exact noise synthesis and color-management pipeline.',
    ],
  }
}

const effectKeys: ReadonlyArray<{ single: string; multi: string; kind: AdobeLayerEffectKind }> = [
  { single: 'DrSh', multi: 'dropShadowMulti', kind: 'drop-shadow' },
  { single: 'IrSh', multi: 'innerShadowMulti', kind: 'inner-shadow' },
  { single: 'OrGl', multi: 'outerGlowMulti', kind: 'outer-glow' },
  { single: 'IrGl', multi: 'innerGlowMulti', kind: 'inner-glow' },
  { single: 'ChFX', multi: 'chromeFXMulti', kind: 'satin' },
  { single: 'ebbl', multi: 'bevelEmbossMulti', kind: 'bevel-emboss' },
  { single: 'SoFi', multi: 'solidFillMulti', kind: 'color-overlay' },
  { single: 'GrFl', multi: 'gradientFillMulti', kind: 'gradient-overlay' },
  { single: 'patternFill', multi: 'patternFillMulti', kind: 'pattern-overlay' },
  { single: 'FrFX', multi: 'frameFXMulti', kind: 'stroke' },
]

const summarizeEffects = (effects: AdobeDescriptor | undefined): AdobeLayerEffectSummary[] => {
  if (!effects) return []
  const output: AdobeLayerEffectSummary[] = []
  for (const mapping of effectKeys) {
    const single = descriptorValue(effects, mapping.single)
    const multi = descriptorValue(effects, mapping.multi)
    const objects: AdobeDescriptor[] = []
    if (single?.type === 'object') objects.push(single.value)
    if (multi?.type === 'list') for (const item of multi.value) if (item.type === 'object') objects.push(item.value)
    if (objects.length) output.push({ kind: mapping.kind, enabled: objects.some(object => descriptorBoolean(object, 'enab', true)), instances: objects.length })
  }
  return output
}

const visitObjects = (value: AdobeDescriptorValue, callback: (descriptor: AdobeDescriptor) => void) => {
  if (value.type === 'object') {
    callback(value.value)
    for (const nested of value.value.entries.values()) visitObjects(nested, callback)
  } else if (value.type === 'list') {
    value.value.forEach(nested => visitObjects(nested, callback))
  } else if (value.type === 'object-array') {
    callback(value.value)
    for (const nested of value.value.entries.values()) visitObjects(nested, callback)
  }
}

const referencedPatterns = (effects: AdobeDescriptor | undefined) => {
  const patterns = new Map<string, { name: string; id: string }>()
  if (!effects) return []
  const collect = (descriptor: AdobeDescriptor) => {
    if (descriptor.classId !== 'Ptrn' && !descriptor.entries.has('Idnt')) return
    const id = descriptorText(descriptor, 'Idnt') || ''
    const name = descriptorText(descriptor, 'Nm  ') || ''
    if (id) patterns.set(id, { name, id })
  }
  collect(effects)
  for (const value of effects.entries.values()) visitObjects(value, collect)
  return [...patterns.values()]
}

const parseStyleRecord = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  descriptorBudget: ReturnType<typeof createAdobeDescriptorBudget>,
  index: number
): AdobeLayerStylePreset => {
  if (reader.u32(end, `ASL style ${index} identity descriptor version`) !== 16) throw new Error(`ASL style ${index} uses an unsupported identity descriptor version.`)
  const identity = readAdobeDescriptor(reader, end, limits, descriptorBudget)
  const name = resolveZString(descriptorText(identity, 'Nm  ') || '')
  const id = descriptorText(identity, 'Idnt') || ''
  if (!name || !id) throw new Error(`ASL style ${index} is missing its name or unique id.`)
  if (reader.u32(end, `ASL style ${index} effect descriptor version`) !== 16) throw new Error(`ASL style ${index} uses an unsupported effect descriptor version.`)
  const style = readAdobeDescriptor(reader, end, limits, descriptorBudget)
  const effects = descriptorObject(style, 'Lefx')
  const blendOptions = descriptorObject(style, 'blendOptions')
  const blendRanges = descriptorValue(blendOptions, 'Blnd')
  const result: AdobeLayerStylePreset = {
    name,
    id,
    effectsVisible: descriptorBoolean(effects, 'masterFXSwitch', true),
    effects: summarizeEffects(effects),
    blendIfChannels: blendRanges?.type === 'list' ? blendRanges.value.length : 0,
    referencedPatterns: referencedPatterns(effects),
  }
  const blendMode = descriptorEnum(blendOptions, 'Md  ')
  if (blendMode) result.blendMode = blendMode
  const opacity = descriptorValue(blendOptions, 'Opct')
  if (opacity?.type === 'unit-double' || opacity?.type === 'double' || opacity?.type === 'integer') result.opacity = clamp(opacity.value, 0, 100, `${name} opacity`)
  const fillOpacity = descriptorValue(blendOptions, 'fillOpacity')
  if (fillOpacity?.type === 'unit-double' || fillOpacity?.type === 'double' || fillOpacity?.type === 'integer') result.fillOpacity = clamp(fillOpacity.value, 0, 100, `${name} fill opacity`)
  if (!result.effects.length && !blendOptions) throw new Error(`${name} contains no supported effect graph or blending options.`)
  return result
}

const parseAsl = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobeLayerStyleLibraryDocument => {
  assertSource(buffer, limits, 'ASL')
  const reader = new AdobeBinaryReader(buffer)
  if (reader.u16(reader.length, 'ASL version') !== 2) throw new Error('Unsupported Photoshop ASL version; expected version 2.')
  if (reader.ascii(4, reader.length, 'ASL signature') !== '8BSL') throw new Error('Invalid Photoshop ASL signature.')
  if (reader.u16(reader.length, 'ASL pattern section version') !== 3) throw new Error('Unsupported ASL embedded-pattern section version.')
  const patternLength = reader.u32(reader.length, 'ASL embedded-pattern section length')
  const patternEnd = add(reader.offset, patternLength, 'ASL embedded-pattern section end')
  if (patternEnd > reader.length) throw new Error('ASL embedded-pattern section is truncated.')
  const decodeBudget: DecodeBudget = { previewPixels: 0, decodedBytes: 0 }
  const patterns = patternLength ? parsePatternBlock(reader, patternEnd, limits, decodeBudget) : []
  const count = reader.u32(reader.length, 'ASL style count')
  if (!count || count > limits.maxResourceItems) throw new Error(`ASL style count must be between 1 and ${limits.maxResourceItems}.`)
  const descriptorBudget = createAdobeDescriptorBudget(limits)
  const styles: AdobeLayerStylePreset[] = []
  for (let index = 0; index < count; index += 1) {
    const length = reader.u32(reader.length, `ASL style ${index + 1} length`)
    const recordEnd = add(reader.offset, length, `ASL style ${index + 1} end`)
    const paddedEnd = add(reader.offset, align4(length), `ASL style ${index + 1} padded end`)
    if (!length || recordEnd > reader.length || paddedEnd > reader.length) throw new Error(`ASL style ${index + 1} record is truncated.`)
    styles.push(parseStyleRecord(reader, recordEnd, limits, descriptorBudget, index + 1))
    for (const value of reader.slice(recordEnd - reader.offset, recordEnd, `ASL style ${index + 1} padding`)) {
      if (value !== 0) throw new Error(`ASL style ${index + 1} has unparsed non-zero bytes.`)
    }
    for (const value of reader.slice(paddedEnd - recordEnd, paddedEnd, `ASL style ${index + 1} alignment`)) {
      if (value !== 0) throw new Error(`ASL style ${index + 1} has non-zero alignment bytes.`)
    }
  }
  parseOptionalHierarchy(reader, limits, descriptorBudget, styles.length)
  return {
    format: 'asl',
    version: '2',
    engine: 'file-viewer-native',
    fidelity: 'effect-graph-metadata-preview',
    styles,
    patterns,
    limitations: [
      'Names, ids, effect graph presence, multi-effect counts, blending options, pattern references, and embedded pattern tiles are decoded. The preview does not claim Photoshop layer rasterization.',
      'Exact layer-style appearance depends on Photoshop contours, blend modes, global light, color management, target-layer pixels, and undocumented renderer behavior; unsupported descriptor value types are rejected rather than ignored.',
    ],
  }
}

export const parseAdobePresetResource = (
  buffer: ArrayBuffer,
  format: AdobePresetFormat,
  limits: PhotoshopParseLimits
): AdobePresetDocument => {
  assertLimits(limits)
  if (format === 'pat') return parsePat(buffer, limits)
  if (format === 'grd') return parseGrd(buffer, limits)
  if (format === 'asl') return parseAsl(buffer, limits)
  throw new Error(`Unsupported Adobe preset format ${JSON.stringify(format)}.`)
}
