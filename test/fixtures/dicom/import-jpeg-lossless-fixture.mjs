import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const packageRequire = createRequire(resolve(fixtureDir, '../../../packages/renderers/dicom/package.json'))
const dicomParser = packageRequire('dicom-parser')
const loaderRequire = createRequire(packageRequire.resolve('@cornerstonejs/dicom-image-loader/package.json'))
const decoderPackageDir = dirname(loaderRequire.resolve('jpeg-lossless-decoder-js/package.json'))
const sourcePath = resolve(decoderPackageDir, 'tests/data/jpeg_lossless_sel1-8bit.dcm')
const outputPath = resolve(fixtureDir, 'jpeg-lossless-process-14-sv1.dcm')
const expectedSourceSha256 = 'abba54b308ef8f606285b744572ab708b125f33acf726b58530879e0dc4edf42'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

const source = readFileSync(sourcePath)
if (digest(source) !== expectedSourceSha256) {
  throw new Error('Pinned jpeg-lossless-decoder-js fixture hash changed; review provenance before importing it.')
}

const output = Buffer.from(source)
const dataSet = dicomParser.parseDicom(new Uint8Array(output.buffer, output.byteOffset, output.byteLength))
const replaceString = (tag, replacement, nullPad = false) => {
  const element = dataSet.elements[tag]
  if (!element) return
  const encoded = Buffer.from(replacement, 'ascii')
  if (encoded.byteLength > element.length) throw new Error(`${tag} replacement exceeds encoded element length`)
  output.fill(nullPad ? 0 : 0x20, element.dataOffset, element.dataOffset + element.length)
  encoded.copy(output, element.dataOffset)
}

// Preserve transfer syntax and image geometry while removing source identifiers.
for (const [tag, replacement, nullPad] of [
  ['x00080018', '2.25.2400001', true],
  ['x00080020', '2000.01.01', false],
  ['x00080023', '2000.01.01', false],
  ['x00080030', '00:00:00', false],
  ['x00080050', '', false],
  ['x00080080', 'SYNTHETIC', false],
  ['x00080081', 'TEST DATA', false],
  ['x00080090', 'SYNTHETIC', false],
  ['x00081030', 'SYNTHETIC TEST', false],
  ['x0008103e', 'JPEG LOSSLESS TEST', false],
  ['x00081050', 'SYNTHETIC', false],
  ['x00081060', 'SYNTHETIC', false],
  ['x00081070', 'SYNTHETIC', false],
  ['x00100010', 'SYNTHETIC', false],
  ['x00100020', 'TEST', false],
  ['x00100030', '2000.01.01', false],
  ['x0020000d', '2.25.2400002', true],
  ['x0020000e', '2.25.2400003', true],
  ['x00200010', 'TEST', false],
]) replaceString(tag, replacement, nullPad)

const reparsed = dicomParser.parseDicom(new Uint8Array(output.buffer, output.byteOffset, output.byteLength))
if (reparsed.string('x00020010') !== '1.2.840.10008.1.2.4.70') {
  throw new Error('Imported fixture is not JPEG Lossless Process 14 Selection Value 1.')
}
if (reparsed.string('x00100010')?.trim() !== 'SYNTHETIC') {
  throw new Error('Imported fixture anonymization failed.')
}

writeFileSync(outputPath, output)
console.log(`${digest(output)}  ${outputPath}`)
