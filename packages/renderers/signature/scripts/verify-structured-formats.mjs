import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { DEFAULT_SIGNATURE_ASN1_LIMITS, inspectEvidenceRecord } from '../dist/signatureAsn1.js'
import { inspectAsicContainer } from '../dist/structured/asic.js'
import { inspectJws } from '../dist/structured/jws.js'
import { normalizeSignatureContainerLimits } from '../dist/structured/limits.js'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtures = resolve(packageDir, 'test/fixtures')
const read = (relative) => readFile(resolve(fixtures, relative))
const bytes = (value) => new Uint8Array(value.buffer, value.byteOffset, value.byteLength)

const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50

const inspectZipLayout = (archive) => {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)
  let endRecordOffset = -1
  for (
    let offset = archive.byteLength - 22;
    offset >= Math.max(0, archive.byteLength - 65_557);
    offset -= 1
  ) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      endRecordOffset = offset
      break
    }
  }
  assert.notEqual(endRecordOffset, -1, 'hostile ZIP fixture must contain an end record')
  const totalEntries = view.getUint16(endRecordOffset + 10, true)
  let cursor = view.getUint32(endRecordOffset + 16, true)
  const entries = []
  for (let index = 0; index < totalEntries; index += 1) {
    assert.equal(
      view.getUint32(cursor, true),
      ZIP_CENTRAL_DIRECTORY_SIGNATURE,
      'hostile ZIP fixture central directory must be well formed before mutation'
    )
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const localNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
    entries.push({
      centralOffset: cursor,
      localHeaderOffset,
      localNameStart: localHeaderOffset + 30,
      dataStart: localHeaderOffset + 30 + localNameLength + localExtraLength,
      flags: view.getUint16(cursor + 8, true),
      compressionMethod: view.getUint16(cursor + 10, true),
      name: archive.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    })
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return { entries, view }
}

const mutateSingleAsic = (mutate) => {
  const archive = Buffer.from(singleAsicFixture)
  const layout = inspectZipLayout(archive)
  mutate(layout, archive)
  return bytes(archive)
}

const singleAsicFixture = Buffer.from(await read('structured/issue-206-single.asics'))
const asics = await inspectAsicContainer(bytes(singleAsicFixture))
assert.equal(asics.kind, 'ASiC-S')
assert.deepEqual(
  asics.documents.map((entry) => entry.name),
  ['invoice.pdf']
)
assert.equal(asics.signatures.length, 1)
assert.equal(asics.signatures[0].kind, 'cades')
assert.ok(asics.documents[0].data?.byteLength)

const localFlagsMismatch = mutateSingleAsic(({ entries, view }) => {
  const invoiceEntry = entries.find((entry) => entry.name === 'invoice.pdf')
  assert.ok(invoiceEntry)
  view.setUint16(invoiceEntry.localHeaderOffset + 6, invoiceEntry.flags ^ 0x0002, true)
})
await assert.rejects(
  () => inspectAsicContainer(localFlagsMismatch),
  /local and central flags differ/i
)

const localMethodMismatch = mutateSingleAsic(({ entries, view }) => {
  const invoiceEntry = entries.find((entry) => entry.name === 'invoice.pdf')
  assert.ok(invoiceEntry)
  view.setUint16(
    invoiceEntry.localHeaderOffset + 8,
    invoiceEntry.compressionMethod === 0 ? 8 : 0,
    true
  )
})
await assert.rejects(
  () => inspectAsicContainer(localMethodMismatch),
  /local and central compression methods differ/i
)

const localNameMismatch = mutateSingleAsic(({ entries }, archive) => {
  const invoiceEntry = entries.find((entry) => entry.name === 'invoice.pdf')
  assert.ok(invoiceEntry)
  archive[invoiceEntry.localNameStart] ^= 0x20
})
await assert.rejects(
  () => inspectAsicContainer(localNameMismatch),
  /local and central entry names differ/i
)

const localCrcMismatch = mutateSingleAsic(({ entries, view }) => {
  const invoiceEntry = entries.find((entry) => entry.name === 'invoice.pdf')
  assert.ok(invoiceEntry)
  const localCrcOffset = invoiceEntry.localHeaderOffset + 14
  view.setUint32(localCrcOffset, view.getUint32(localCrcOffset, true) ^ 1, true)
})
await assert.rejects(
  () => inspectAsicContainer(localCrcMismatch),
  /local CRC or size fields differ/i
)

const localSizeMismatch = mutateSingleAsic(({ entries, view }) => {
  const invoiceEntry = entries.find((entry) => entry.name === 'invoice.pdf')
  assert.ok(invoiceEntry)
  const localCompressedSizeOffset = invoiceEntry.localHeaderOffset + 18
  view.setUint32(
    localCompressedSizeOffset,
    view.getUint32(localCompressedSizeOffset, true) + 1,
    true
  )
})
await assert.rejects(
  () => inspectAsicContainer(localSizeMismatch),
  /local CRC or size fields differ/i
)

const overlappingLocalRecords = mutateSingleAsic(({ entries, view }) => {
  const byLocalOffset = [...entries].sort(
    (left, right) => left.localHeaderOffset - right.localHeaderOffset
  )
  const firstEntry = byLocalOffset[0]
  const secondEntry = byLocalOffset[1]
  assert.ok(firstEntry)
  assert.ok(secondEntry)
  assert.equal(firstEntry.compressionMethod, 0, 'overlap fixture expects a stored first entry')
  const overlappingSize = secondEntry.localHeaderOffset - firstEntry.dataStart + 1
  assert.ok(overlappingSize > 0)
  view.setUint32(firstEntry.centralOffset + 20, overlappingSize, true)
  view.setUint32(firstEntry.centralOffset + 24, overlappingSize, true)
  view.setUint32(firstEntry.localHeaderOffset + 18, overlappingSize, true)
  view.setUint32(firstEntry.localHeaderOffset + 22, overlappingSize, true)
})
await assert.rejects(
  () => inspectAsicContainer(overlappingLocalRecords),
  /local record ranges overlap/i
)

const asice = await inspectAsicContainer(bytes(await read('structured/issue-206-multi.asice')))
assert.equal(asice.kind, 'ASiC-E')
assert.deepEqual(
  asice.documents.map((entry) => entry.name),
  ['invoice.pdf', 'sample.xml']
)
assert.equal(asice.signatures.length, 2)
assert.deepEqual(
  asice.signatures.find((entry) => entry.kind === 'xades-or-xml')?.referencedDocuments,
  ['sample.xml']
)
assert.match(asice.warnings.join(' '), /No .* fetched automatically/i)

const traversalZip = Buffer.from(await read('structured/issue-206-single.asics'))
for (const original of [Buffer.from('invoice.pdf')]) {
  let cursor = 0
  while ((cursor = traversalZip.indexOf(original, cursor)) >= 0) {
    Buffer.from('../evil.pdf').copy(traversalZip, cursor)
    cursor += original.length
  }
}
await assert.rejects(
  () => inspectAsicContainer(bytes(traversalZip)),
  /path traversal|unsafe asic zip/i
)

const bomb = new JSZip()
bomb.file('mimetype', 'application/vnd.etsi.asic-s+zip', {
  compression: 'STORE',
  date: new Date('2026-08-24T00:00:00Z')
})
bomb.file('zeros.bin', new Uint8Array(1024 * 1024), {
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
  date: new Date('2026-08-24T00:00:00Z')
})
const bombBytes = await bomb.generateAsync({
  type: 'uint8array',
  compression: 'DEFLATE',
  platform: 'UNIX'
})
await assert.rejects(
  () => inspectAsicContainer(bombBytes, { maxCompressionRatio: 10 }),
  /compression ratio/i
)

const invoice = bytes(await read('github-206-contributed/originals/invoice.pdf'))
const evidenceBytes = bytes(await read('structured/issue-206-invoice.ers'))
const evidence = await inspectEvidenceRecord(evidenceBytes, { originalContent: invoice })
assert.equal(evidence.version, 1)
assert.equal(evidence.archiveTimestampChains, 1)
assert.equal(evidence.archiveTimestamps.length, 1)
assert.equal(evidence.originalEvidenceMatches, true)
assert.equal(evidence.fullyValidated, false)
await assert.rejects(
  () =>
    inspectEvidenceRecord(evidenceBytes, {
      limits: { maxEvidenceChains: DEFAULT_SIGNATURE_ASN1_LIMITS.maxEvidenceChains + 1 }
    }),
  /maxEvidenceChains must be an integer between/i
)
await assert.rejects(
  () => inspectEvidenceRecord(evidenceBytes, { limits: { maxAsn1Nodes: 1 } }),
  /node count exceeds 1/i
)
await assert.rejects(
  () =>
    inspectEvidenceRecord(evidenceBytes, {
      originalContent: invoice,
      limits: { maxOriginalContentBytes: 16 }
    }),
  /original content exceeds the 16-byte boundary/i
)
await assert.rejects(
  async () => inspectEvidenceRecord(bytes(await read('structured/issue-206-truncated.ers'))),
  /asn\.1|evidencerecord|length|truncated/i
)

const encoder = new TextEncoder()
const b64url = (value) => Buffer.from(value).toString('base64url')
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: Uint8Array.of(1, 0, 1),
    hash: 'SHA-256'
  },
  true,
  ['sign', 'verify']
)
const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
publicJwk.kid = 'issue-206-rsa'
const protectedSegment = b64url(
  encoder.encode(
    JSON.stringify({
      alg: 'RS256',
      kid: publicJwk.kid,
      typ: 'JWT',
      jku: 'https://example.invalid/never-fetch'
    })
  )
)
const payload = encoder.encode(JSON.stringify({ message: 'issue-206-jws' }))
const payloadSegment = b64url(payload)
const signingInput = encoder.encode(`${protectedSegment}.${payloadSegment}`)
const signature = new Uint8Array(
  await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, signingInput)
)
const signatureSegment = b64url(signature)
const compact = `${protectedSegment}.${payloadSegment}.${signatureSegment}`
const verified = await inspectJws(compact, {
  verificationKeys: [{ key: publicJwk, kid: publicJwk.kid }]
})
assert.equal(verified.serialization, 'compact')
assert.deepEqual(verified.payload, payload)
assert.equal(verified.signatures[0].cryptographicValid, true)
assert.match(verified.warnings.join(' '), /never fetched automatically/i)

const detached = `${protectedSegment}..${signatureSegment}`
const detachedPending = await inspectJws(detached, {
  verificationKeys: [{ key: publicJwk, kid: publicJwk.kid }]
})
assert.equal(detachedPending.detached, true)
assert.equal(detachedPending.signatures[0].cryptographicValid, undefined)
assert.match(detachedPending.signatures[0].verificationError || '', /payload is required/i)
const detachedVerified = await inspectJws(detached, {
  detachedPayload: payload,
  verificationKeys: [{ key: publicJwk, kid: publicJwk.kid }]
})
assert.equal(detachedVerified.signatures[0].cryptographicValid, true)

const invalidSignature = `${protectedSegment}.${payloadSegment}.${signatureSegment.startsWith('A') ? `B${signatureSegment.slice(1)}` : `A${signatureSegment.slice(1)}`}`
const invalid = await inspectJws(invalidSignature, {
  verificationKeys: [{ key: publicJwk, kid: publicJwk.kid }]
})
assert.equal(invalid.signatures[0].cryptographicValid, false)

const general = JSON.stringify({
  payload: payloadSegment,
  signatures: [
    { protected: protectedSegment, signature: signatureSegment },
    { protected: protectedSegment, signature: signatureSegment }
  ]
})
const generalInspection = await inspectJws(general, {
  verificationKeys: [{ key: publicJwk, kid: publicJwk.kid }]
})
assert.equal(generalInspection.serialization, 'json-general')
assert.deepEqual(
  generalInspection.signatures.map((item) => item.cryptographicValid),
  [true, true]
)

const noneProtected = b64url(encoder.encode(JSON.stringify({ alg: 'none' })))
const none = await inspectJws(`${noneProtected}.${payloadSegment}.`)
assert.equal(none.signatures[0].cryptographicValid, false)
assert.match(none.signatures[0].verificationError || '', /not accepted|unsupported|unsafe/i)

const normalized = normalizeSignatureContainerLimits({
  maxEntries: Number.POSITIVE_INFINITY,
  maxContainerBytes: Number.MAX_SAFE_INTEGER
})
assert.equal(normalized.maxEntries, 1024)
assert.equal(normalized.maxContainerBytes, 128 * 1024 * 1024)

console.log('Issue #206 ASiC, RFC 4998 and JWS structured-format verification passed.')
