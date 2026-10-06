import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import dicomParser from 'dicom-parser'
import { inspectDicomPart10 } from '../dist/inspect.js'

const root = resolve(import.meta.dirname, '../../../..')
const source = readFileSync(resolve(root, 'apps/viewer-demo/public/example/ct-small.dcm'))
const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)
const inspected = inspectDicomPart10(buffer)
assert.equal(inspected.rows, 128)
assert.equal(inspected.columns, 128)
assert.equal(inspected.frameCount, 1)
assert.equal(inspected.modality, 'CT')

// Change only the Part 10 transfer-syntax header. These controls prove rejection
// before decoding; they do not pretend to contain compressed JPEG XL pixels.
const dataSet = dicomParser.parseDicom(new Uint8Array(buffer), { untilTag: 'x7fe00010' })
const syntax = dataSet.elements.x00020010
const groupLength = dataSet.elements.x00020000
for (const uid of [
  '1.2.840.10008.1.2.4.110',
  '1.2.840.10008.1.2.4.111',
  '1.2.840.10008.1.2.4.112',
  '1.2.840.10008.1.2.4.201'
]) {
  const value = new TextEncoder().encode(uid + '\0')
  const difference = value.byteLength - syntax.length
  const changed = new Uint8Array(source.byteLength + difference)
  changed.set(source.subarray(0, syntax.dataOffset))
  changed.set(value, syntax.dataOffset)
  changed.set(source.subarray(syntax.dataOffset + syntax.length), syntax.dataOffset + value.byteLength)
  const view = new DataView(changed.buffer)
  view.setUint16(syntax.dataOffset - 2, value.byteLength, true)
  view.setUint32(groupLength.dataOffset, dataSet.uint32('x00020000') + difference, true)
  assert.throws(
    () => inspectDicomPart10(changed.buffer),
    { message: `DICOM transfer syntax ${uid} is not supported by this preview renderer.` }
  )
}
console.log('Native Node ESM inspection passed: original CT header and four unsupported codec syntax boundaries')
