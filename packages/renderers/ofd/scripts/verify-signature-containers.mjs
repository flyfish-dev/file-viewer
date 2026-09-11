import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { parseSesSignature } from '../vendor/dltech/ofd/ses_signature_parser.js'

const tlv = (tag, bytes) => {
  const value = Buffer.from(bytes)
  const length = value.length < 128 ? [value.length] : [0x82, value.length >> 8, value.length & 255]
  return Buffer.concat([Buffer.from([tag, ...length]), value])
}
const seq = (...children) => tlv(0x30, Buffer.concat(children))
const integer = value => tlv(2, [value])
const set = (...children) => tlv(0x31, Buffer.concat(children))
const oid = hex => tlv(6, Buffer.from(hex, 'hex'))
const oids = ['2a864886f70d010702', '2a811ccf550601040202']
const contentInfo = (type, content) => seq(oid(type), tlv(0xa0, content))
const signedData = () => seq(integer(3), set(seq(oid('2a811ccf55018311'))), seq(oid('2a864886f70d010701')), set())
async function parse(bytes) {
  const warnings = []
  const warn = console.warn
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  try {
    const zip = new JSZip().file('SignedValue.dat', bytes)
    return { value: await parseSesSignature(zip, 'SignedValue.dat'), warnings }
  } finally { console.warn = warn }
}
for (const [index, type] of oids.entries()) {
  test(`${index ? 'GM/T' : 'PKCS#7'} SignedData is recognized without inventing a seal or claiming verification`, async () => {
    const { value, warnings } = await parse(contentInfo(type, signedData()))
    assert.deepEqual(warnings, [])
    assert.equal(value.type, 'signed-data')
    assert.equal(value.verifyRet, null)
    assert.equal(value.verificationStatus, 'not-verified')
    assert.equal(value.SES_Signature.displayOnly, true)
    assert.equal(value.ofdArray, undefined)
  })
}
test('matching OID with a malformed SignedData envelope is not silently accepted', async () => {
  for (const value of [seq(), seq(integer(3)), seq(integer(3), set(), seq(), set())]) {
    const result = await parse(contentInfo(oids[0], value))
    assert.deepEqual(result.value, {})
    assert.equal(result.warnings.length, 1)
    assert.match(result.warnings[0], /Malformed SignedData/)
  }
})
test('an unknown ContentInfo OID remains a visible unsupported format', async () => {
  const result = await parse(contentInfo('2a864886f70d010703', signedData()))
  assert.deepEqual(result.value, {})
  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /Unsupported signature ContentInfo/)
})
test('truncated DER cannot masquerade as a parsed signature', async () => {
  const valid = contentInfo(oids[1], signedData())
  const result = await parse(valid.subarray(0, valid.length - 2))
  assert.deepEqual(result.value, {})
  assert.equal(result.warnings.length, 1)
})
test('missing SignedValue entry returns no visual stamp', async () => {
  assert.deepEqual(await parseSesSignature(new JSZip(), 'absent'), {})
})
if (process.env.OFD_SIGNATURE_SAMPLE_ZIP) {
  test('original issue #266 invoice SignedData and existing SES seal both parse without warnings', async () => {
    const input = await readFile(process.env.OFD_SIGNATURE_SAMPLE_ZIP)
    assert.equal(createHash('sha256').update(input).digest('hex'), '57345ed8469bfae8ccb066abb726a551d0c322f5af7527828771035551cff4cb')
    const archive = await JSZip.loadAsync(input)
    const seen = []
    for (const file of Object.values(archive.files).filter(file => file.name.endsWith('.ofd'))) {
      const zip = await JSZip.loadAsync(await file.async('uint8array'))
      const result = await parse(await zip.file('Doc_0/Signs/Sign_0/SignedValue.dat').async('uint8array'))
      assert.deepEqual(result.warnings, [])
      assert.equal(result.value.verifyRet, null)
      if (result.value.type === 'signed-data') assert.equal(result.value.ofdArray, undefined)
      else { assert.equal(result.value.type, 'png'); assert.equal(result.value.ofdArray.length, 12884) }
      seen.push(result.value.type)
    }
    assert.deepEqual(seen.sort(), ['png', 'signed-data'])
  })
}
