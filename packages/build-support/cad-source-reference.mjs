import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'

const prefix = 'https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/'
export function assertCadSourceReference(bytes, proof) {
  assert.equal(bytes.length, proof.bytes, 'HTTPS CAD source size differs from the reviewed archive')
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    proof.sha256,
    'HTTPS CAD source differs from the reviewed archive'
  )
  assert.match(
    proof.sourceCommit,
    /^[a-f0-9]{40}$/,
    'CAD source must identify an immutable public commit'
  )
  assert.equal(
    proof.url,
    prefix + proof.sourceCommit,
    'CAD source URL must identify its exact immutable public commit'
  )
  return {
    url: proof.url,
    bytes: bytes.length,
    sha256: proof.sha256,
    sourceCommit: proof.sourceCommit
  }
}

export function readCadRemoteSource(proof, {
  run = spawnSync,
  frozenArchive = process.env.FILE_VIEWER_CAD_SOURCE_ARCHIVE
} = {}) {
  assert.match(
    proof.url,
    /^https:\/\/codeload\.github\.com\/flyfish-dev\/file-viewer\/tar\.gz\/[a-f0-9]{40}$/,
    'CAD source URL must be an immutable public source commit'
  )
  assert.equal(
    proof.url,
    prefix + proof.sourceCommit,
    'CAD source URL must identify its exact immutable public commit'
  )
  if (frozenArchive) {
    const info = lstatSync(frozenArchive)
    assert.ok(info.isFile() && !info.isSymbolicLink(), 'Frozen public CAD source must be a regular archive')
    const bytes = readFileSync(frozenArchive)
    return { bytes, proof: assertCadSourceReference(bytes, proof), retrieval: 'frozen-public-source-copy' }
  }
  const result = run('gh', ['api', proof.url, '--method', 'GET'], {
    shell: false,
    encoding: null,
    timeout: 600_000,
    maxBuffer: 256_000_000
  })
  if (result.error) throw result.error
  assert.equal(
    result.status,
    0,
    'CAD corresponding source HTTPS read failed: ' + (result.stderr || '').toString()
  )
  const bytes = Buffer.from(result.stdout)
  return { bytes, proof: assertCadSourceReference(bytes, proof), retrieval: 'github-https' }
}
