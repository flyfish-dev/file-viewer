import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import initializeRpgp, {
  inspect_openpgp as inspectOpenPgp,
  verify_detached_signature as verifyDetachedSignature
} from '../dist/rpgp-wasm/rpgp_wrapper.js'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtures = resolve(packageDir, 'test/fixtures')
const read = async (relative) => new Uint8Array(await readFile(resolve(fixtures, relative)))
const limits = {
  maxInputBytes: 32 * 1024 * 1024,
  maxOutputBytes: 16 * 1024 * 1024,
  maxPacketCount: 4096,
  maxNestingDepth: 16,
  maxUserIds: 128,
  maxSubkeys: 128,
  maxSignatures: 256
}

await initializeRpgp({
  module_or_path: await readFile(resolve(packageDir, 'dist/rpgp-wasm/rpgp_wrapper_bg.wasm'))
})

const publicKey = await read('openpgp-synthetic/public-key.asc')
const publicInspection = inspectOpenPgp(publicKey, [], limits)
assert.equal(publicInspection.classification, 'public-key')
assert.equal(publicInspection.keys.length, 1)
assert.equal(publicInspection.keys[0].kind, 'public')
assert.match(publicInspection.keys[0].fingerprint || '', /^[A-F0-9]{40,64}$/i)

const original = await read('github-206-contributed/originals/hello.txt')
const signature = await read('openpgp-synthetic/hello.sig')
const signatureInspection = inspectOpenPgp(signature, [], limits)
assert.equal(signatureInspection.classification, 'detached-signature')
assert.equal(signatureInspection.signatures.length, 1)
assert.ok(signatureInspection.signatures[0].createdAt)
assert.ok(signatureInspection.signatures[0].hashAlgorithm)
const verified = verifyDetachedSignature(original, signature, [publicKey], limits)
assert.equal(verified.status, 'signature-valid')
assert.equal(verified.valid, true)

const tampered = await read('github-206-contributed/originals/hello-tampered.txt')
const invalid = verifyDetachedSignature(tampered, signature, [publicKey], limits)
assert.equal(invalid.status, 'signature-invalid')
assert.equal(invalid.valid, false)

const armoredSignature = await read('openpgp-synthetic/hello.asc.sig')
assert.equal(inspectOpenPgp(armoredSignature, [], limits).classification, 'detached-signature')
const cleartext = await read('openpgp-synthetic/hello.cleartext.asc')
const cleartextInspection = inspectOpenPgp(cleartext, [publicKey], limits)
assert.equal(cleartextInspection.classification, 'cleartext-signed-message')
assert.equal(cleartextInspection.signatures.length, 1)
assert.equal(cleartextInspection.signatures[0].cryptographicValid, true)
assert.match(
  new TextDecoder().decode(Uint8Array.from(cleartextInspection.literalData.data)),
  /File Viewer issue 206 synthetic fixture/i
)

const multiPublicKeys = await read('openpgp-synthetic/multi-public-keys.asc')
const multiCleartext = await read('openpgp-synthetic/hello.multi-cleartext.asc')
const multiCleartextInspection = inspectOpenPgp(multiCleartext, [multiPublicKeys], limits)
assert.equal(multiCleartextInspection.classification, 'cleartext-signed-message')
assert.equal(multiCleartextInspection.signatures.length, 2)
assert.deepEqual(
  multiCleartextInspection.signatures.map((item) => item.cryptographicValid),
  [true, true]
)
assert.match(
  new TextDecoder().decode(Uint8Array.from(multiCleartextInspection.literalData.data)),
  /File Viewer issue 206 synthetic fixture/i
)

const multiSigned = await read('openpgp-synthetic/hello.multi-signed.pgp')
const multiSignedInspection = inspectOpenPgp(multiSigned, [multiPublicKeys], limits)
assert.equal(multiSignedInspection.classification, 'signed-message')
assert.equal(multiSignedInspection.compressed, true)
assert.equal(multiSignedInspection.signatures.length, 2)
assert.deepEqual(
  multiSignedInspection.signatures.map((item) => item.cryptographicValid),
  [true, true]
)
assert.deepEqual(
  Uint8Array.from(multiSignedInspection.literalData.data),
  original,
  'The exact signed literal bytes must be preserved for nested preview.'
)
const encrypted = await read('openpgp-synthetic/hello.encrypted.pgp')
const encryptedInspection = inspectOpenPgp(encrypted, [], limits)
assert.equal(encryptedInspection.classification, 'encrypted-message')
assert.equal(encryptedInspection.encrypted, true)
assert.equal(encryptedInspection.integrityProtected, true)
assert.equal(encryptedInspection.recipients.length, 1)
assert.match(encryptedInspection.recipients[0], /^[A-F0-9]{16,64}$/i)
assert.ok(encryptedInspection.packetCount >= 2)

assert.throws(
  () => inspectOpenPgp(publicKey, [], { ...limits, maxInputBytes: Number.MAX_SAFE_INTEGER }),
  (error) =>
    error?.code === 'invalid-input' &&
    /maxInputBytes|Invalid parse limits|between 1/i.test(error?.message || '')
)

assert.throws(
  () => inspectOpenPgp(cleartext, [publicKey], { ...limits, maxPacketCount: 1 }),
  (error) => error?.code === 'packet-limit-exceeded' && /packet count/i.test(error?.message || '')
)
assert.throws(
  () => inspectOpenPgp(cleartext, [publicKey], { ...limits, maxOutputBytes: 8 }),
  (error) => error?.code === 'output-too-large' && /cleartext/i.test(error?.message || '')
)
assert.throws(
  () => inspectOpenPgp(multiSigned, [multiPublicKeys], { ...limits, maxNestingDepth: 1 }),
  (error) => error?.code === 'nesting-limit-exceeded' && /nesting/i.test(error?.message || '')
)
assert.throws(
  () => inspectOpenPgp(multiSigned, [multiPublicKeys], { ...limits, maxSignatures: 1 }),
  (error) =>
    error?.code === 'packet-limit-exceeded' && /signature count/i.test(error?.message || '')
)
assert.throws(
  () => inspectOpenPgp(multiSigned, [multiPublicKeys], { ...limits, maxPacketCount: 5 }),
  (error) => error?.code === 'packet-limit-exceeded' && /packet count/i.test(error?.message || '')
)
assert.throws(
  () => inspectOpenPgp(multiCleartext, [multiPublicKeys], { ...limits, maxSubkeys: 1 }),
  (error) =>
    error?.code === 'packet-limit-exceeded' &&
    /(?:public|verification) key count/i.test(error?.message || '')
)

console.log(
  'Issue #206 rPGP WASM runtime, metadata, cleartext/detached verification and parser budgets passed.'
)
