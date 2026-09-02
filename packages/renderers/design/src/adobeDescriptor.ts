import type { PhotoshopParseLimits } from './limits.js'

export type AdobeDescriptorValue =
  | { type: 'boolean'; value: boolean }
  | { type: 'integer'; value: number }
  | { type: 'large-integer'; value: bigint }
  | { type: 'double'; value: number }
  | { type: 'unit-double'; unit: string; value: number }
  | { type: 'text'; value: string }
  | { type: 'enum'; enumType: string; value: string }
  | { type: 'object'; value: AdobeDescriptor }
  | { type: 'list'; value: AdobeDescriptorValue[] }
  | { type: 'raw'; length: number; alias: boolean }
  | { type: 'class'; name: string; classId: string }
  | { type: 'unit-double-array'; unit: string; value: number[] }
  | { type: 'object-array'; count: number; value: AdobeDescriptor }
  | { type: 'reference'; value: AdobeDescriptorReference[] }
  | { type: 'path'; length: number }

export interface AdobeDescriptorReference {
  form: string
  className: string
  classId: string
  property?: string
  enumType?: string
  enumValue?: string
  index?: number
  name?: string
}

export interface AdobeDescriptor {
  name: string
  classId: string
  entries: ReadonlyMap<string, AdobeDescriptorValue>
  keys: readonly string[]
}

export interface AdobeDescriptorBudget {
  values: number
  maximum: number
}

const multiply = (left: number, right: number, label: string) => {
  const result = left * right
  if (!Number.isSafeInteger(result) || result < 0) throw new Error(`${label} exceeds the safe integer range.`)
  return result
}

const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label} is not finite.`)
  return value
}

export class AdobeBinaryReader {
  readonly bytes: Uint8Array
  readonly view: DataView
  offset = 0

  constructor(buffer: ArrayBuffer | Uint8Array) {
    this.bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength)
  }

  get length() { return this.bytes.byteLength }
  get remaining() { return this.length - this.offset }

  ensure(length: number, end = this.length, label = 'Adobe binary data') {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset > end || length > end - this.offset) {
      throw new Error(`${label} is truncated.`)
    }
  }

  u8(end = this.length, label?: string) {
    this.ensure(1, end, label)
    return this.view.getUint8(this.offset++)
  }

  u16(end = this.length, label?: string) {
    this.ensure(2, end, label)
    const value = this.view.getUint16(this.offset, false)
    this.offset += 2
    return value
  }

  i16(end = this.length, label?: string) {
    this.ensure(2, end, label)
    const value = this.view.getInt16(this.offset, false)
    this.offset += 2
    return value
  }

  u32(end = this.length, label?: string) {
    this.ensure(4, end, label)
    const value = this.view.getUint32(this.offset, false)
    this.offset += 4
    return value
  }

  i32(end = this.length, label?: string) {
    this.ensure(4, end, label)
    const value = this.view.getInt32(this.offset, false)
    this.offset += 4
    return value
  }

  i64(end = this.length, label?: string) {
    this.ensure(8, end, label)
    const value = this.view.getBigInt64(this.offset, false)
    this.offset += 8
    return value
  }

  f64(end = this.length, label?: string) {
    this.ensure(8, end, label)
    const value = this.view.getFloat64(this.offset, false)
    this.offset += 8
    return finite(value, label || 'Adobe double')
  }

  ascii(length: number, end = this.length, label = 'Adobe ASCII data') {
    this.ensure(length, end, label)
    let value = ''
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(this.bytes[this.offset + index])
    this.offset += length
    return value
  }

  slice(length: number, end = this.length, label = 'Adobe binary data') {
    this.ensure(length, end, label)
    const value = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    return value
  }

  skip(length: number, end = this.length, label = 'Adobe binary data') {
    this.ensure(length, end, label)
    this.offset += length
  }
}

const readUnicode = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  label: string
) => {
  const count = reader.u32(end, `${label} length`)
  if (count > limits.maxResourceNameCodeUnits + 1) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-code-unit safety limit.`)
  }
  const bytes = reader.slice(multiply(count, 2, `${label} bytes`), end, label)
  let value = ''
  for (let index = 0; index < count; index += 1) {
    const code = (bytes[index * 2] << 8) | bytes[index * 2 + 1]
    if (code === 0 && index === count - 1) continue
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= count) throw new Error(`${label} ends with an unpaired UTF-16 surrogate.`)
      const low = (bytes[(index + 1) * 2] << 8) | bytes[(index + 1) * 2 + 1]
      if (low < 0xdc00 || low > 0xdfff) throw new Error(`${label} contains an invalid UTF-16 surrogate pair.`)
      value += String.fromCodePoint(0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00))
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error(`${label} contains an unpaired UTF-16 surrogate.`)
    } else {
      value += String.fromCharCode(code)
    }
  }
  if (value.length > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-code-unit safety limit.`)
  }
  return value
}

const readId = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  label: string
) => {
  const declared = reader.u32(end, `${label} length`)
  const length = declared === 0 ? 4 : declared
  if (length === 0 || length > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-byte safety limit.`)
  }
  return reader.ascii(length, end, label)
}

const consume = (budget: AdobeDescriptorBudget, count: number, label: string) => {
  if (!Number.isSafeInteger(count) || count < 0 || count > budget.maximum - budget.values) {
    throw new Error(`${label} exceeds the ${budget.maximum}-value descriptor safety limit.`)
  }
  budget.values += count
}

const readClass = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  label: string
) => ({
  name: readUnicode(reader, end, limits, `${label} name`),
  classId: readId(reader, end, limits, `${label} id`),
})

const readReference = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  budget: AdobeDescriptorBudget
): AdobeDescriptorReference[] => {
  const count = reader.u32(end, 'Adobe reference count')
  consume(budget, count, 'Adobe reference count')
  const values: AdobeDescriptorReference[] = []
  for (let index = 0; index < count; index += 1) {
    const form = reader.ascii(4, end, 'Adobe reference form')
    const { name: className, classId } = readClass(reader, end, limits, 'Adobe reference class')
    const value: AdobeDescriptorReference = { form, className, classId }
    if (form === 'prop') value.property = readId(reader, end, limits, 'Adobe reference property')
    else if (form === 'Enmr') {
      value.enumType = readId(reader, end, limits, 'Adobe reference enum type')
      value.enumValue = readId(reader, end, limits, 'Adobe reference enum value')
    } else if (form === 'rele' || form === 'Idnt' || form === 'indx') value.index = reader.i32(end, 'Adobe reference index')
    else if (form === 'name') value.name = readUnicode(reader, end, limits, 'Adobe reference name')
    else if (form !== 'Clss') throw new Error(`Unsupported Adobe reference form ${JSON.stringify(form)}.`)
    values.push(value)
  }
  return values
}

const readPath = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits
): AdobeDescriptorValue => {
  // Pth is undocumented and current interoperable readers preserve it as
  // length-prefixed opaque data. Do not guess an OS-specific path encoding.
  const length = reader.u32(end, 'Adobe descriptor path length')
  if (length > limits.maxDecodedBytes) throw new Error(`Adobe descriptor path exceeds the ${limits.maxDecodedBytes}-byte safety limit.`)
  reader.skip(length, end, 'Adobe descriptor path')
  return { type: 'path', length }
}

const readValue = (
  reader: AdobeBinaryReader,
  end: number,
  type: string,
  limits: PhotoshopParseLimits,
  budget: AdobeDescriptorBudget,
  depth: number
): AdobeDescriptorValue => {
  if (depth > limits.maxNestingDepth) {
    throw new Error(`Adobe descriptor nesting exceeds the ${limits.maxNestingDepth}-level safety limit.`)
  }
  switch (type) {
    case 'bool': return { type: 'boolean', value: reader.u8(end, 'Adobe boolean') !== 0 }
    case 'long': return { type: 'integer', value: reader.i32(end, 'Adobe integer') }
    case 'comp': return { type: 'large-integer', value: reader.i64(end, 'Adobe large integer') }
    case 'doub': return { type: 'double', value: reader.f64(end, 'Adobe double') }
    case 'UntF': return { type: 'unit-double', unit: reader.ascii(4, end, 'Adobe unit'), value: reader.f64(end, 'Adobe unit double') }
    case 'TEXT': return { type: 'text', value: readUnicode(reader, end, limits, 'Adobe descriptor text') }
    case 'enum': return {
      type: 'enum',
      enumType: readId(reader, end, limits, 'Adobe enum type'),
      value: readId(reader, end, limits, 'Adobe enum value'),
    }
    case 'Objc':
    case 'GlbO': return { type: 'object', value: readAdobeDescriptor(reader, end, limits, budget, depth + 1) }
    case 'VlLs': {
      const count = reader.u32(end, 'Adobe list count')
      consume(budget, count, 'Adobe list count')
      const value: AdobeDescriptorValue[] = []
      for (let index = 0; index < count; index += 1) {
        value.push(readValue(reader, end, reader.ascii(4, end, 'Adobe list value type'), limits, budget, depth + 1))
      }
      return { type: 'list', value }
    }
    case 'alis':
    case 'tdta': {
      const length = reader.u32(end, 'Adobe raw data length')
      if (length > limits.maxDecodedBytes) throw new Error(`Adobe raw data exceeds the ${limits.maxDecodedBytes}-byte safety limit.`)
      reader.skip(length, end, 'Adobe raw data')
      return { type: 'raw', length, alias: type === 'alis' }
    }
    case 'type':
    case 'GlbC': {
      const value = readClass(reader, end, limits, 'Adobe class reference')
      return { type: 'class', name: value.name, classId: value.classId }
    }
    case 'UnFl': {
      const unit = reader.ascii(4, end, 'Adobe unit-float-array unit')
      const count = reader.u32(end, 'Adobe unit-float-array count')
      consume(budget, count, 'Adobe unit-float-array count')
      const value = Array.from({ length: count }, () => reader.f64(end, 'Adobe unit-float-array value'))
      return { type: 'unit-double-array', unit, value }
    }
    case 'ObAr': {
      const count = reader.u32(end, 'Adobe object-array count')
      consume(budget, count, 'Adobe object-array count')
      return { type: 'object-array', count, value: readAdobeDescriptor(reader, end, limits, budget, depth + 1) }
    }
    case 'obj ': return { type: 'reference', value: readReference(reader, end, limits, budget) }
    case 'Pth ': return readPath(reader, end, limits)
    default: throw new Error(`Unsupported Adobe descriptor value type ${JSON.stringify(type)}.`)
  }
}

export const createAdobeDescriptorBudget = (limits: PhotoshopParseLimits): AdobeDescriptorBudget => {
  const items = Number.isSafeInteger(limits.maxResourceItems) && limits.maxResourceItems > 0
    ? Math.min(1_000_000, limits.maxResourceItems)
    : 1
  return {
    values: 0,
    maximum: items > 3_906 ? 1_000_000 : items * 256,
  }
}

export const readAdobeDescriptor = (
  reader: AdobeBinaryReader,
  end: number,
  limits: PhotoshopParseLimits,
  budget = createAdobeDescriptorBudget(limits),
  depth = 0
): AdobeDescriptor => {
  if (depth > limits.maxNestingDepth) {
    throw new Error(`Adobe descriptor nesting exceeds the ${limits.maxNestingDepth}-level safety limit.`)
  }
  const name = readUnicode(reader, end, limits, 'Adobe descriptor name')
  const classId = readId(reader, end, limits, 'Adobe descriptor class')
  const count = reader.u32(end, 'Adobe descriptor item count')
  consume(budget, count, 'Adobe descriptor item count')
  const entries = new Map<string, AdobeDescriptorValue>()
  const keys: string[] = []
  for (let index = 0; index < count; index += 1) {
    const key = readId(reader, end, limits, 'Adobe descriptor key')
    if (entries.has(key)) throw new Error(`Adobe descriptor contains duplicate key ${JSON.stringify(key)}.`)
    const type = reader.ascii(4, end, 'Adobe descriptor value type')
    entries.set(key, readValue(reader, end, type, limits, budget, depth + 1))
    keys.push(key)
  }
  return { name, classId, entries, keys }
}

export const descriptorValue = (descriptor: AdobeDescriptor | undefined, key: string) => descriptor?.entries.get(key)

export const descriptorObject = (descriptor: AdobeDescriptor | undefined, key: string) => {
  const value = descriptorValue(descriptor, key)
  return value?.type === 'object' ? value.value : undefined
}

export const descriptorText = (descriptor: AdobeDescriptor | undefined, key: string) => {
  const value = descriptorValue(descriptor, key)
  return value?.type === 'text' ? value.value : undefined
}

export const descriptorEnum = (descriptor: AdobeDescriptor | undefined, key: string) => {
  const value = descriptorValue(descriptor, key)
  return value?.type === 'enum' ? value.value : undefined
}

export const descriptorBoolean = (descriptor: AdobeDescriptor | undefined, key: string, fallback = false) => {
  const value = descriptorValue(descriptor, key)
  return value?.type === 'boolean' ? value.value : fallback
}

export const descriptorNumber = (descriptor: AdobeDescriptor | undefined, key: string, fallback = 0) => {
  const value = descriptorValue(descriptor, key)
  if (!value) return fallback
  if (value.type === 'integer' || value.type === 'double' || value.type === 'unit-double') return value.value
  if (value.type === 'large-integer') return Number(value.value)
  return fallback
}

export const readAdobeUnicode = readUnicode
