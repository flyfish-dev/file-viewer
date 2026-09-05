export type AdobePaletteFormat = 'ase' | 'aco'
export type AdobeColorModel = 'RGB' | 'HSB' | 'CMYK' | 'LAB' | 'Gray'
export type AdobeColorKind = 'global' | 'spot' | 'normal' | 'unspecified'

export interface AdobePaletteColor {
  id: string
  name: string
  groupPath: string[]
  model: AdobeColorModel
  components: number[]
  componentText: string
  kind: AdobeColorKind
  rgb: [number, number, number]
  hex: string
}

export interface AdobePaletteDocument {
  format: AdobePaletteFormat
  version: string
  colors: AdobePaletteColor[]
  groups: string[]
  unknownBlocks: number
  trailingBytes: number
}

export interface AdobePaletteParseLimits {
  maxFileBytes: number
  maxResourceItems: number
  maxResourceNameCodeUnits: number
}

const fail = (message: string): never => {
  throw new Error(`Adobe palette: ${message}`)
}

class BinaryReader {
  readonly bytes: Uint8Array
  readonly view: DataView
  offset = 0

  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer)
    this.view = new DataView(buffer)
  }

  ensure(length: number, label: string) {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.byteLength) {
      fail(`${label} is truncated at byte ${this.offset}.`)
    }
  }

  u16(label = 'uint16') {
    this.ensure(2, label)
    const value = this.view.getUint16(this.offset, false)
    this.offset += 2
    return value
  }

  i16(label = 'int16') {
    this.ensure(2, label)
    const value = this.view.getInt16(this.offset, false)
    this.offset += 2
    return value
  }

  u32(label = 'uint32') {
    this.ensure(4, label)
    const value = this.view.getUint32(this.offset, false)
    this.offset += 4
    return value
  }

  f32(label = 'float32') {
    this.ensure(4, label)
    const value = this.view.getFloat32(this.offset, false)
    this.offset += 4
    if (!Number.isFinite(value)) fail(`${label} is not finite.`)
    return value
  }

  ascii(length: number, label = 'ASCII value') {
    this.ensure(length, label)
    const value = String.fromCharCode(...this.bytes.subarray(this.offset, this.offset + length))
    this.offset += length
    return value
  }

  skip(length: number, label = 'section') {
    this.ensure(length, label)
    this.offset += length
  }
}

const validateCodeUnits = (units: readonly number[], label: string) => {
  for (let index = 0; index < units.length; index += 1) {
    const value = units[index]
    if (value >= 0xd800 && value <= 0xdbff) {
      const next = units[index + 1]
      if (next === undefined || next < 0xdc00 || next > 0xdfff) fail(`${label} contains an unpaired UTF-16 high surrogate.`)
      index += 1
    } else if (value >= 0xdc00 && value <= 0xdfff) {
      fail(`${label} contains an unpaired UTF-16 low surrogate.`)
    }
  }
}

const fromCodeUnits = (units: readonly number[]) => {
  let value = ''
  for (let index = 0; index < units.length; index += 1024) {
    value += String.fromCharCode(...units.slice(index, index + 1024))
  }
  return value
}

const readUtf16Be = (
  reader: BinaryReader,
  codeUnits: number,
  limits: AdobePaletteParseLimits,
  label: string,
  requireTerminator: boolean
) => {
  if (!Number.isSafeInteger(codeUnits) || codeUnits < (requireTerminator ? 1 : 0)) fail(`${label} has an invalid length.`)
  if (codeUnits > limits.maxResourceNameCodeUnits) {
    fail(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-code-unit safety limit.`)
  }
  reader.ensure(codeUnits * 2, label)
  const units = Array.from({ length: codeUnits }, () => reader.u16(label))
  if (requireTerminator) {
    if (units.at(-1) !== 0) fail(`${label} is missing its UTF-16 terminator.`)
    units.pop()
  } else if (units.at(-1) === 0) {
    units.pop()
  }
  validateCodeUnits(units, label)
  return fromCodeUnits(units)
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const byte = (value: number) => Math.round(clamp01(value) * 255)
const toHex = (rgb: readonly number[]) => `#${rgb.map(value => byte(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`

const hsvToRgb = (hue: number, saturation: number, value: number): [number, number, number] => {
  const normalizedHue = ((hue % 1) + 1) % 1
  const chroma = clamp01(value) * clamp01(saturation)
  const sector = normalizedHue * 6
  const secondary = chroma * (1 - Math.abs(sector % 2 - 1))
  const match = clamp01(value) - chroma
  const values = sector < 1 ? [chroma, secondary, 0]
    : sector < 2 ? [secondary, chroma, 0]
      : sector < 3 ? [0, chroma, secondary]
        : sector < 4 ? [0, secondary, chroma]
          : sector < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  return values.map(component => clamp01(component + match)) as [number, number, number]
}

const labToRgb = (lightness: number, a: number, b: number): [number, number, number] => {
  const delta = 6 / 29
  const inverse = (value: number) => value > delta
    ? value ** 3
    : 3 * delta * delta * (value - 4 / 29)
  const fy = (lightness + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200

  // CIELAB in Adobe palette files uses the D50 reference white. Convert to
  // D65 before the standard sRGB matrix so the browser swatch is meaningful.
  const d50X = 0.96422 * inverse(fx)
  const d50Y = inverse(fy)
  const d50Z = 0.82521 * inverse(fz)
  const x = 0.9555766 * d50X - 0.0230393 * d50Y + 0.0631636 * d50Z
  const y = -0.0282895 * d50X + 1.0099416 * d50Y + 0.0210077 * d50Z
  const z = 0.0122982 * d50X - 0.020483 * d50Y + 1.3299098 * d50Z
  const linear = [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ]
  return linear.map(component => clamp01(component <= 0.0031308
    ? 12.92 * component
    : 1.055 * component ** (1 / 2.4) - 0.055)) as [number, number, number]
}

const normalizeColor = (
  id: string,
  name: string,
  groupPath: string[],
  model: AdobeColorModel,
  components: number[],
  kind: AdobeColorKind
): AdobePaletteColor => {
  let rgb: [number, number, number]
  switch (model) {
    case 'RGB': rgb = components.slice(0, 3).map(clamp01) as [number, number, number]; break
    case 'HSB': rgb = hsvToRgb(components[0], components[1], components[2]); break
    case 'CMYK': {
      const [c, m, y, k] = components.map(clamp01)
      rgb = [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)]
      break
    }
    case 'LAB': rgb = labToRgb(components[0], components[1], components[2]); break
    case 'Gray': rgb = [clamp01(components[0]), clamp01(components[0]), clamp01(components[0])]; break
  }
  const componentText = model === 'LAB'
    ? `L ${components[0].toFixed(2)} · a ${components[1].toFixed(2)} · b ${components[2].toFixed(2)}`
    : model === 'CMYK'
      ? `C ${Math.round(components[0] * 100)} · M ${Math.round(components[1] * 100)} · Y ${Math.round(components[2] * 100)} · K ${Math.round(components[3] * 100)}`
      : model === 'HSB'
        ? `H ${Math.round(components[0] * 360)}° · S ${Math.round(components[1] * 100)} · B ${Math.round(components[2] * 100)}`
        : model === 'Gray'
          ? `Gray ${Math.round(components[0] * 100)}%`
          : `R ${byte(components[0])} · G ${byte(components[1])} · B ${byte(components[2])}`
  return { id, name, groupPath, model, components, componentText, kind, rgb, hex: toHex(rgb) }
}

const assertRange = (value: number, minimum: number, maximum: number, label: string) => {
  if (value < minimum || value > maximum) fail(`${label} ${value} is outside ${minimum}…${maximum}.`)
  return value
}

const signed16 = (value: number) => value > 0x7fff ? value - 0x10000 : value

export const parseAdobeSwatchExchange = (
  buffer: ArrayBuffer,
  limits: AdobePaletteParseLimits
): AdobePaletteDocument => {
  if (buffer.byteLength > limits.maxFileBytes) fail(`source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  const reader = new BinaryReader(buffer)
  if (reader.ascii(4, 'ASE signature') !== 'ASEF') fail('invalid ASE signature.')
  const major = reader.u16('ASE major version')
  const minor = reader.u16('ASE minor version')
  if (major !== 1) fail(`unsupported ASE version ${major}.${minor}.`)
  const blockCount = reader.u32('ASE block count')
  if (blockCount > limits.maxResourceItems * 3) {
    fail(`ASE block count exceeds the ${limits.maxResourceItems * 3}-block safety limit.`)
  }

  const colors: AdobePaletteColor[] = []
  const groupStack: string[] = []
  const groups = new Set<string>()
  let unknownBlocks = 0
  const kinds: AdobeColorKind[] = ['global', 'spot', 'normal']
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const blockType = reader.u16(`ASE block ${blockIndex} type`)
    const blockLength = reader.u32(`ASE block ${blockIndex} length`)
    reader.ensure(blockLength, `ASE block ${blockIndex}`)
    const blockEnd = reader.offset + blockLength
    if (blockType === 0xc001) {
      const name = readUtf16Be(reader, reader.u16('ASE group name length'), limits, 'ASE group name', true)
      if (reader.offset !== blockEnd) fail(`ASE group block ${blockIndex} has an invalid length.`)
      groupStack.push(name)
      groups.add(groupStack.join(' / '))
    } else if (blockType === 0xc002) {
      if (blockLength !== 0) fail(`ASE group-end block ${blockIndex} must be empty.`)
      if (!groupStack.length) fail(`ASE group-end block ${blockIndex} has no matching group start.`)
      groupStack.pop()
    } else if (blockType === 0x0001) {
      if (colors.length >= limits.maxResourceItems) {
        fail(`ASE color count exceeds the ${limits.maxResourceItems}-item safety limit.`)
      }
      const name = readUtf16Be(reader, reader.u16('ASE color name length'), limits, 'ASE color name', true)
      const mode = reader.ascii(4, 'ASE color model')
      let model!: AdobeColorModel
      let components!: number[]
      if (mode === 'RGB ') {
        model = 'RGB'
        components = [0, 1, 2].map(index => assertRange(reader.f32(`ASE RGB component ${index}`), 0, 1, 'ASE RGB component'))
      } else if (mode === 'CMYK') {
        model = 'CMYK'
        components = [0, 1, 2, 3].map(index => assertRange(reader.f32(`ASE CMYK component ${index}`), 0, 1, 'ASE CMYK component'))
      } else if (mode === 'Gray') {
        model = 'Gray'
        components = [assertRange(reader.f32('ASE Gray component'), 0, 1, 'ASE Gray component')]
      } else if (mode === 'LAB ') {
        model = 'LAB'
        components = [
          assertRange(reader.f32('ASE Lab L'), 0, 100, 'ASE Lab L'),
          assertRange(reader.f32('ASE Lab a'), -160, 160, 'ASE Lab a'),
          assertRange(reader.f32('ASE Lab b'), -160, 160, 'ASE Lab b'),
        ]
      } else {
        fail(`unsupported ASE color model ${JSON.stringify(mode)}.`)
      }
      const colorKind = kinds[reader.u16('ASE color kind')]
      if (!colorKind) fail('ASE color kind is invalid.')
      if (reader.offset !== blockEnd) fail(`ASE color block ${blockIndex} has an invalid length.`)
      colors.push(normalizeColor(`ase-${colors.length}`, name || `Color ${colors.length + 1}`, [...groupStack], model, components, colorKind))
    } else {
      unknownBlocks += 1
      reader.offset = blockEnd
    }
  }
  if (groupStack.length) fail('ASE file ends before all color groups are closed.')
  return {
    format: 'ase',
    version: `${major}.${minor}`,
    colors,
    groups: [...groups],
    unknownBlocks,
    trailingBytes: buffer.byteLength - reader.offset,
  }
}

interface AcoRecord {
  model: AdobeColorModel
  components: number[]
  name?: string
}

const parseAcoRecord = (
  reader: BinaryReader,
  version: number,
  index: number,
  limits: AdobePaletteParseLimits
): AcoRecord => {
  const colorSpace = reader.u16(`ACO color ${index} color space`)
  const raw = [0, 1, 2, 3].map(component => reader.u16(`ACO color ${index} component ${component}`))
  let model!: AdobeColorModel
  let components!: number[]
  switch (colorSpace) {
    case 0:
      model = 'RGB'
      components = raw.slice(0, 3).map(value => value / 65535)
      break
    case 1:
      model = 'HSB'
      components = raw.slice(0, 3).map(value => value / 65535)
      break
    case 2:
      model = 'CMYK'
      components = raw.map(value => 1 - value / 65535)
      break
    case 7:
      model = 'LAB'
      components = [
        assertRange(raw[0] / 100, 0, 100, 'ACO Lab L'),
        signed16(raw[1]) / 100,
        signed16(raw[2]) / 100,
      ]
      assertRange(components[1], -160, 160, 'ACO Lab a')
      assertRange(components[2], -160, 160, 'ACO Lab b')
      break
    case 8:
      model = 'Gray'
      components = [assertRange(raw[0] / 10_000, 0, 1, 'ACO Gray component')]
      break
    default:
      fail(`unsupported ACO color space ${colorSpace}.`)
  }
  const name = version === 2
    ? readUtf16Be(reader, reader.u32(`ACO color ${index} name length`), limits, `ACO color ${index} name`, false)
    : undefined
  return { model, components, name }
}

export const parseAdobeColorSwatch = (
  buffer: ArrayBuffer,
  limits: AdobePaletteParseLimits
): AdobePaletteDocument => {
  if (buffer.byteLength > limits.maxFileBytes) fail(`source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  const reader = new BinaryReader(buffer)
  const sections = new Map<number, AcoRecord[]>()
  while (buffer.byteLength - reader.offset >= 4) {
    const sectionOffset = reader.offset
    const version = reader.u16('ACO version')
    if (version !== 1 && version !== 2) {
      reader.offset = sectionOffset
      break
    }
    const count = reader.u16(`ACO v${version} color count`)
    if (count > limits.maxResourceItems) {
      fail(`ACO color count exceeds the ${limits.maxResourceItems}-item safety limit.`)
    }
    const records = Array.from({ length: count }, (_, index) => parseAcoRecord(reader, version, index, limits))
    sections.set(version, records)
  }
  const selectedVersion = sections.has(2) ? 2 : sections.has(1) ? 1 : 0
  if (!selectedVersion) fail('invalid ACO version or empty file.')
  const records = sections.get(selectedVersion)!
  return {
    format: 'aco',
    version: String(selectedVersion),
    colors: records.map((record, index) => normalizeColor(
      `aco-${index}`,
      record.name || `Color ${index + 1}`,
      [],
      record.model,
      record.components,
      'unspecified'
    )),
    groups: [],
    unknownBlocks: 0,
    trailingBytes: buffer.byteLength - reader.offset,
  }
}

export const parseAdobePalette = (
  buffer: ArrayBuffer,
  format: AdobePaletteFormat,
  limits: AdobePaletteParseLimits
) => format === 'ase'
  ? parseAdobeSwatchExchange(buffer, limits)
  : parseAdobeColorSwatch(buffer, limits)
