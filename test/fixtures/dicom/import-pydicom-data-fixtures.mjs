import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

const fixtureRoot = dirname(fileURLToPath(import.meta.url))
const packageRequire = createRequire(join(fixtureRoot, '../../../packages/renderers/dicom/package.json'))
const dicomParser = packageRequire('dicom-parser')
const sourceCommit = 'abc42b90985fb6cf385aa4af766d2c9c94a257a4'
const fixtures = [
  {
    name: 'pydicom-693-explicit-vr-le.dcm',
    source: 'data_store/data/693_UNCI.dcm',
    sha256: '42d6c33d6666bf569a53951211be6fca2ab04956db43c3f75a9720d976ab128c',
    outputSha256: 'e91ec617ca41ee532e34365812b6a990e078739c1e9aa05c8bbbf9cf2458a760', transferSyntax: '1.2.840.10008.1.2.1', uidSuffix: '101',
  },
  {
    name: 'pydicom-693-jpeg2000-lossless.dcm',
    source: 'data_store/data/693_J2KR.dcm',
    sha256: 'c392d8bd1f952ed2d9387d5143d34c5a29ac9d74566688169731a50ac6a82aa2',
    outputSha256: '47981395a55e3234fe45ed25984aaf34438109c0fa1be6ef1511d28000435d23', transferSyntax: '1.2.840.10008.1.2.4.90', uidSuffix: '102',
  },
  {
    name: 'pydicom-jpegls-lossless.dcm',
    source: 'data_store/data/JLSL_08_07_0_1F.dcm',
    sha256: '308fb028c8fbdd1e9a93e731978ea4da6b15cb55b40451cf6f21e7c9ba35dd8a',
    outputSha256: 'f9960f842c15fef5e4d9a45a494b1026698cf0f2e981d3b883f69391fdf7dbb6', transferSyntax: '1.2.840.10008.1.2.4.80', uidSuffix: '103',
  },
]
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const commonPhiReplacements = [
  ['x00080020', '20000101'], ['x00080021', '20000101'], ['x00080022', '20000101'], ['x00080023', '20000101'],
  ['x00080030', '000000'], ['x00080031', '000000'], ['x00080032', '000000'], ['x00080033', '000000'],
  ['x00080050', ''], ['x00080080', 'TEST'], ['x00080081', 'TEST'], ['x00080090', 'SYNTHETIC'],
  ['x00081010', 'TEST'], ['x00081030', 'TEST'], ['x0008103e', 'TEST'], ['x00081040', 'TEST'],
  ['x00081048', 'SYNTHETIC'], ['x00081050', 'SYNTHETIC'], ['x00081060', 'SYNTHETIC'], ['x00081070', 'SYNTHETIC'],
  ['x00100010', 'SYNTHETIC'], ['x00100020', 'TEST'], ['x00100030', '20000101'], ['x00100032', '000000'],
  ['x00100040', ''], ['x00101000', ''], ['x00101001', ''], ['x00102160', ''], ['x00104000', ''],
  ['x00200010', 'TEST'], ['x00321032', 'SYNTHETIC'], ['x00400244', '20000101'], ['x00400245', '000000'],
]

const scrubTextElement = (output, dataSet, tag, replacement, nullPad = false) => {
  const element = dataSet.elements[tag]
  if (!element || element.length === 0) return
  const encoded = Buffer.from(replacement, 'ascii')
  if (encoded.byteLength > element.length) throw new Error(`${tag} replacement exceeds encoded element length`)
  output.fill(nullPad ? 0 : 0x20, element.dataOffset, element.dataOffset + element.length)
  encoded.copy(output, element.dataOffset)
}

for (const fixture of fixtures) {
  const url = `https://raw.githubusercontent.com/pydicom/pydicom-data/${sourceCommit}/${fixture.source}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to download ${url}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const actualHash = digest(bytes)
  if (actualHash !== fixture.sha256) {
    throw new Error(`${fixture.name} SHA-256 mismatch: expected ${fixture.sha256}, received ${actualHash}`)
  }
  const output = Buffer.from(bytes)
  const dataSet = dicomParser.parseDicom(new Uint8Array(output.buffer, output.byteOffset, output.byteLength))
  scrubTextElement(output, dataSet, 'x00080018', `2.25.2400${fixture.uidSuffix}1`, true)
  scrubTextElement(output, dataSet, 'x0020000d', `2.25.2400${fixture.uidSuffix}2`, true)
  scrubTextElement(output, dataSet, 'x0020000e', `2.25.2400${fixture.uidSuffix}3`, true)
  for (const [tag, replacement] of commonPhiReplacements) scrubTextElement(output, dataSet, tag, replacement)

  const reparsed = dicomParser.parseDicom(new Uint8Array(output.buffer, output.byteOffset, output.byteLength))
  if (reparsed.string('x00020010') !== fixture.transferSyntax) {
    throw new Error(`${fixture.name} transfer syntax changed during anonymization`)
  }
  for (const [tag, replacement] of commonPhiReplacements) {
    const element = reparsed.elements[tag]
    if (!element || element.length === 0) continue
    if ((reparsed.string(tag) || '').trim() !== replacement) throw new Error(`${fixture.name} PHI scrub failed for ${tag}`)
  }
  const outputHash = digest(output)
  if (fixture.outputSha256 && outputHash !== fixture.outputSha256) {
    throw new Error(`${fixture.name} sanitized SHA-256 mismatch: expected ${fixture.outputSha256}, received ${outputHash}`)
  }
  await writeFile(join(fixtureRoot, fixture.name), output)
  console.log(`${fixture.name} ${output.byteLength} bytes upstream=${actualHash} sanitized=${outputHash}`)
}
