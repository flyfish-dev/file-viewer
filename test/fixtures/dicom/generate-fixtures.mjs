import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const SOP_CLASS_UID = '1.2.840.10008.5.1.4.1.1.7'
const TRANSFER_SYNTAX_UID = '1.2.840.10008.1.2.1'
const IMPLEMENTATION_UID = '1.2.826.0.1.3680043.10.543.1'

const concat = (...chunks) => {
  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const output = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}

const u16 = value => new Uint8Array([value & 0xff, (value >>> 8) & 0xff])
const u32 = value => new Uint8Array([
  value & 0xff,
  (value >>> 8) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 24) & 0xff,
])
const ascii = value => new TextEncoder().encode(value)

const paddedValue = (vr, input) => {
  let value
  if (input instanceof Uint8Array) value = input
  else if (vr === 'US') value = u16(Number(input))
  else if (vr === 'UL') value = u32(Number(input))
  else value = ascii(String(input))
  if (value.byteLength % 2 === 0) return value
  return concat(value, new Uint8Array([vr === 'UI' || vr === 'OB' || vr === 'OW' ? 0 : 0x20]))
}

const element = (group, tag, vr, input) => {
  const value = paddedValue(vr, input)
  const longLength = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'UC', 'UR', 'UT', 'UN']).has(vr)
  return concat(
    u16(group),
    u16(tag),
    ascii(vr),
    longLength ? concat(new Uint8Array(2), u32(value.byteLength)) : u16(value.byteLength),
    value,
  )
}

const implicitElement = (group, tag, vr, input) => {
  const value = paddedValue(vr, input)
  return concat(u16(group), u16(tag), u32(value.byteLength), value)
}

const buildPixels = (rows, columns, frames) => {
  const values = new Uint16Array(rows * columns * frames)
  for (let frame = 0; frame < frames; frame += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = frame * rows * columns + row * columns + column
        if (frame % 3 === 0) values[index] = Math.round((column / (columns - 1)) * 4095)
        else if (frame % 3 === 1) values[index] = Math.round((row / (rows - 1)) * 4095)
        else values[index] = ((Math.floor(column / 8) + Math.floor(row / 8)) % 2) * 3584 + 256
      }
    }
  }
  return new Uint8Array(values.buffer)
}

export const buildPart10 = ({ frames, instanceSuffix, transferSyntax = TRANSFER_SYNTAX_UID, specificCharacterSet = '', includeWindowing = true }) => {
  const rows = 64
  const columns = 96
  const sopInstanceUid = `1.2.826.0.1.3680043.10.543.2.${instanceSuffix}`
  const metaBody = concat(
    element(0x0002, 0x0001, 'OB', new Uint8Array([0, 1])),
    element(0x0002, 0x0002, 'UI', SOP_CLASS_UID),
    element(0x0002, 0x0003, 'UI', sopInstanceUid),
    element(0x0002, 0x0010, 'UI', transferSyntax),
    element(0x0002, 0x0012, 'UI', IMPLEMENTATION_UID),
    element(0x0002, 0x0013, 'SH', 'FILEVIEWER_240'),
  )
  const meta = concat(element(0x0002, 0x0000, 'UL', metaBody.byteLength), metaBody)
  const dataElement = transferSyntax === '1.2.840.10008.1.2' ? implicitElement : element
  const dataSet = concat(
    specificCharacterSet ? dataElement(0x0008, 0x0005, 'CS', specificCharacterSet) : new Uint8Array(),
    dataElement(0x0008, 0x0008, 'CS', 'DERIVED\\SECONDARY'),
    dataElement(0x0008, 0x0016, 'UI', SOP_CLASS_UID),
    dataElement(0x0008, 0x0018, 'UI', sopInstanceUid),
    dataElement(0x0008, 0x0060, 'CS', 'OT'),
    dataElement(0x0020, 0x000d, 'UI', '1.2.826.0.1.3680043.10.543.3.1'),
    dataElement(0x0020, 0x000e, 'UI', '1.2.826.0.1.3680043.10.543.4.1'),
    dataElement(0x0020, 0x0011, 'IS', '1'),
    dataElement(0x0020, 0x0013, 'IS', String(instanceSuffix)),
    dataElement(0x0028, 0x0002, 'US', 1),
    dataElement(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
    dataElement(0x0028, 0x0008, 'IS', String(frames)),
    dataElement(0x0028, 0x0010, 'US', rows),
    dataElement(0x0028, 0x0011, 'US', columns),
    dataElement(0x0028, 0x0030, 'DS', '1\\1'),
    dataElement(0x0028, 0x0100, 'US', 16),
    dataElement(0x0028, 0x0101, 'US', 12),
    dataElement(0x0028, 0x0102, 'US', 11),
    dataElement(0x0028, 0x0103, 'US', 0),
    includeWindowing ? dataElement(0x0028, 0x1050, 'DS', '2048') : new Uint8Array(),
    includeWindowing ? dataElement(0x0028, 0x1051, 'DS', '4096') : new Uint8Array(),
    dataElement(0x7fe0, 0x0010, 'OW', buildPixels(rows, columns, frames)),
  )
  return concat(new Uint8Array(128), ascii('DICM'), meta, dataSet)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(fixtureDir, { recursive: true })
  for (const fixture of [
    { file: 'single-frame.dcm', frames: 1, instanceSuffix: 1 },
    { file: 'multiframe.dcm', frames: 3, instanceSuffix: 2 },
    { file: 'implicit-vr-little-endian.dcm', frames: 1, instanceSuffix: 3, transferSyntax: '1.2.840.10008.1.2' },
  ]) {
    writeFileSync(resolve(fixtureDir, fixture.file), buildPart10(fixture))
  }
}
