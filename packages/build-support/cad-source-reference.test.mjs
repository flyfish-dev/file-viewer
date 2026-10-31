import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  CAD_INTEGRATION_SOURCE,
  CAD_PUBLIC_CORRESPONDING_SOURCE,
  cadIntegrationSourceNotice
} from './cad-source-offer.mjs'
import { assertCadSourceReference, readCadRemoteSource } from './cad-source-reference.mjs'
const bytes = Buffer.from('Synthetic source used only by byte-verification tests.')
const proof = {
  sourceCommit: 'a'.repeat(40),
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  url: 'https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/' + 'a'.repeat(40)
}
test('the npm offer identifies the existing source instead of promising a bundled ZIP', () => {
  const notice = cadIntegrationSourceNotice(CAD_INTEGRATION_SOURCE.releaseVersion)
  assert.ok(notice.includes(CAD_PUBLIC_CORRESPONDING_SOURCE.url))
  assert.ok(notice.includes(CAD_PUBLIC_CORRESPONDING_SOURCE.sha256))
  assert.ok(notice.includes(CAD_INTEGRATION_SOURCE.sha256))
  assert.ok(notice.includes(CAD_PUBLIC_CORRESPONDING_SOURCE.buildDirectory))
  assert.ok(notice.includes('Runtime-only npm archives do not include source ZIPs'))
  assert.equal(CAD_PUBLIC_CORRESPONDING_SOURCE.runtimeSha256, CAD_INTEGRATION_SOURCE.runtimeSha256)
})
test('HTTPS read uses the immutable commit and checks all returned bytes', () => {
  const result = readCadRemoteSource(proof, {
    frozenArchive: '',
    run(command, args, options) {
      assert.equal(command, 'gh')
      assert.equal(args[1], proof.url)
      assert.ok(args.includes('GET'))
      assert.equal(options.shell, false)
      return { status: 0, stdout: bytes }
    }
  })
  assert.deepEqual(result.bytes, bytes)
  assert.equal(result.proof.sha256, proof.sha256)
})
test('unreachable, corrupt, truncated and mutable source references fail closed', () => {
  assert.throws(
    () => readCadRemoteSource(proof, { frozenArchive: '', run: () => ({ status: 1, stderr: 'HTTP404' }) }),
    /HTTPS read failed/
  )
  assert.throws(() => assertCadSourceReference(bytes.subarray(1), proof), /size differs/)
  const corrupt = Buffer.from(bytes)
  corrupt[0] ^= 1
  assert.throws(() => assertCadSourceReference(corrupt, proof), /differs from/)
  for (const url of [
    proof.url.replace(/a{40}$/, 'b'.repeat(40)),
    'https://example.invalid/future.zip'
  ])
    assert.throws(() => assertCadSourceReference(bytes, { ...proof, url }), /exact immutable/)
})

test('a frozen public archive reuses only the exact immutable source bytes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cad-public-source-copy-'))
  const path = join(directory, 'source.tar.gz')
  const run = () => { throw new Error('An exact frozen archive must not trigger another download') }
  try {
    writeFileSync(path, bytes)
    const result = readCadRemoteSource(proof, { run, frozenArchive: path })
    assert.deepEqual(result.bytes, bytes)
    assert.equal(result.retrieval, 'frozen-public-source-copy')
    assert.throws(() => readCadRemoteSource({ ...proof, sha256: '0'.repeat(64) }, { run, frozenArchive: path }), /differs/)
    writeFileSync(path, bytes.subarray(1))
    assert.throws(() => readCadRemoteSource(proof, { run, frozenArchive: path }), /size differs/)
    assert.throws(() => readCadRemoteSource(proof, { run, frozenArchive: directory }), /regular archive/)
    const link = join(directory, 'source-link.tar.gz')
    symlinkSync(path, link)
    assert.throws(() => readCadRemoteSource(proof, { run, frozenArchive: link }), /regular archive/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
