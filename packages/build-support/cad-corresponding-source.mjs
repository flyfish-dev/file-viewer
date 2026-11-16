import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { cadPreferredSourceDigest, cadPreferredSourceHashMode, listCadPreferredSourcePaths } from './cad-preferred-source.mjs'

export const CAD_SOURCE_ARCHIVE_NAME = 'CORRESPONDING_SOURCE.zip'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

export async function readCadCorrespondingSource(root, proof) {
  const path = join(root, 'packages/renderers/cad', CAD_SOURCE_ARCHIVE_NAME)
  const info = await lstat(path)
  assert.ok(info.isFile() && !info.isSymbolicLink(), 'CAD source archive must be a regular file')
  assert.ok(info.size > 0 && info.size <= 2_000_000, 'CAD source archive size is invalid')
  const bytes = await readFile(path)
  assert.equal(sha256(bytes), proof.sha256, 'CAD corresponding source archive changed')
  assert.equal(bytes.length, proof.bytes, 'CAD corresponding source archive size changed')
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true })
  const prefix = `file-viewer-cad-corresponding-source-${proof.releaseVersion}/`
  const files = new Map()
  for (const entry of Object.values(zip.files)) {
    assert.ok(!entry.dir && entry.name.startsWith(prefix), 'Unexpected CAD source archive member')
    assert.ok(!entry.unsafeOriginalName || entry.unsafeOriginalName === entry.name, 'Unsafe CAD source archive member')
    const relative = entry.name.slice(prefix.length)
    assert.ok(relative && !relative.includes('\\') && !relative.startsWith('/'), 'Unsafe CAD source archive path')
    assert.ok(relative.split('/').every(part => part && part !== '.' && part !== '..' &&
      !['node_modules', '.git', '.npmrc', '.release', '.agents', '.codex'].includes(part)), 'Private or unsafe CAD source archive path')
    assert.equal((entry.unixPermissions || 0) & 0o170000, 0o100000, 'CAD source archive cannot contain symlinks')
    assert.ok(!files.has(relative), 'Duplicate CAD source archive member')
    files.set(relative, await entry.async('nodebuffer'))
  }
  assert.equal(files.size, proof.files, 'CAD source archive member count changed')
  assert.ok([...files.values()].reduce((total, value) => total + value.length, 0) < 8_000_000,
    'CAD preferred-source payload exceeds its budget')
  const manifest = JSON.parse(files.get('SOURCE_MANIFEST.json').toString('utf8'))
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.releaseVersion, proof.releaseVersion)
  if (proof.sourceRevision !== undefined) {
    assert.ok(proof.sourceRevision, 'CAD source proof requires a source revision')
    assert.equal(manifest.sourceRevision, proof.sourceRevision, 'CAD source revision changed')
  }
  assert.deepEqual(manifest.runtime, { bytes: proof.runtimeBytes, sha256: proof.runtimeSha256 })
  assert.equal(manifest.files.length + 1, files.size)
  assert.deepEqual(manifest.files.map(entry => entry.path).sort(),
    [...files.keys()].filter(path => path !== 'SOURCE_MANIFEST.json').sort())
  for (const entry of manifest.files)
    assert.equal(sha256(files.get(entry.path)), entry.sha256, `CAD archive member changed: ${entry.path}`)
  for (const entry of manifest.preferredSourceInputs)
    assert.equal(sha256(files.get(entry.path)), entry.archiveSha256, `CAD preferred source absent or changed: ${entry.path}`)
  return { bytes, files, manifest }
}

export async function verifyCadPreferredSourceInputs(root, manifest) {
  assert.deepEqual(manifest.preferredSourceInputs.map(entry => entry.path).sort(),
    await listCadPreferredSourcePaths(root), 'CAD source archive omits or adds preferred source inputs')
  for (const entry of manifest.preferredSourceInputs) {
    const path = join(root, entry.path)
    const info = await lstat(path)
    assert.ok(info.isFile() && !info.isSymbolicLink(), 'Unsafe CAD preferred-source input')
    assert.equal(entry.hashMode, cadPreferredSourceHashMode(entry.path))
    assert.equal(cadPreferredSourceDigest(entry.path, await readFile(path)), entry.sha256,
      `CAD corresponding source is stale: ${entry.path}`)
  }
}
