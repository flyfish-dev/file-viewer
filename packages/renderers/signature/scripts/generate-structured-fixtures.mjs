import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contributed = join(packageDir, 'test/fixtures/github-206-contributed')
const outputDir = join(packageDir, 'test/fixtures/structured')
const fixtureDate = new Date('2026-08-24T00:00:00.000Z')
await mkdir(outputDir, { recursive: true })

const derLength = (length) => {
  if (length < 0x80) return Uint8Array.of(length)
  const bytes = []
  for (let value = length; value > 0; value >>>= 8) bytes.unshift(value & 0xff)
  return Uint8Array.of(0x80 | bytes.length, ...bytes)
}
const concat = (...parts) => {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}
const der = (tag, ...parts) => {
  const body = concat(...parts)
  return concat(Uint8Array.of(tag), derLength(body.byteLength), body)
}

const invoice = new Uint8Array(await readFile(join(contributed, 'originals/invoice.pdf')))
const sampleXml = new Uint8Array(await readFile(join(contributed, 'originals/sample.xml')))
const detachedCms = new Uint8Array(
  await readFile(join(contributed, 'cms/invoice-detached.pdf.p7s'))
)
const timestampToken = new Uint8Array(
  await readFile(join(contributed, 'timestamps/invoice-sha256.tst'))
)

const buildAsic = async ({ kind, documents, includeXmlSignature }) => {
  const zip = new JSZip()
  const mediaType =
    kind === 'ASiC-S' ? 'application/vnd.etsi.asic-s+zip' : 'application/vnd.etsi.asic-e+zip'
  zip.file('mimetype', mediaType, { compression: 'STORE', createFolders: false, date: fixtureDate })
  for (const [name, data] of documents)
    zip.file(name, data, {
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      createFolders: false,
      date: fixtureDate
    })
  zip.file('META-INF/signatures.p7s', detachedCms, {
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    createFolders: false,
    date: fixtureDate
  })
  if (includeXmlSignature) {
    zip.file(
      'META-INF/signatures.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n<asic:XAdESSignatures xmlns:asic="http://uri.etsi.org/02918/v1.2.1#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:Signature Id="synthetic"><ds:SignedInfo><ds:Reference URI="sample.xml"/></ds:SignedInfo><ds:SignatureValue>AA==</ds:SignatureValue></ds:Signature></asic:XAdESSignatures>`,
      { compression: 'DEFLATE', createFolders: false, date: fixtureDate }
    )
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', platform: 'UNIX' })
}

const sha256Algorithm = Uint8Array.of(
  0x30,
  0x0d,
  0x06,
  0x09,
  0x60,
  0x86,
  0x48,
  0x01,
  0x65,
  0x03,
  0x04,
  0x02,
  0x01,
  0x05,
  0x00
)
const evidenceRecord = der(
  0x30,
  Uint8Array.of(0x02, 0x01, 0x01),
  der(0x30, sha256Algorithm),
  der(0x30, der(0x30, der(0x30, timestampToken)))
)

const outputs = new Map([
  [
    'issue-206-single.asics',
    await buildAsic({
      kind: 'ASiC-S',
      documents: [['invoice.pdf', invoice]],
      includeXmlSignature: false
    })
  ],
  [
    'issue-206-multi.asice',
    await buildAsic({
      kind: 'ASiC-E',
      documents: [
        ['invoice.pdf', invoice],
        ['sample.xml', sampleXml]
      ],
      includeXmlSignature: true
    })
  ],
  ['issue-206-invoice.ers', evidenceRecord],
  ['issue-206-truncated.ers', evidenceRecord.subarray(0, evidenceRecord.byteLength - 17)]
])

const hashes = []
for (const [name, data] of outputs) {
  await writeFile(join(outputDir, name), data)
  hashes.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`)
}
await writeFile(join(outputDir, 'SHA256SUMS'), `${hashes.sort().join('\n')}\n`)
console.log(`Generated ${outputs.size} deterministic issue #206 structured fixtures.`)
