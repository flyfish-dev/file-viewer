import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'

export const CAD_SOURCE_ARCHIVE_NAME = 'CORRESPONDING_SOURCE.zip'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const fixedInputs = [
  'packages/core/package.json', 'packages/core/tsconfig.json',
  'packages/renderers/cad/package.json', 'packages/renderers/cad/tsconfig.json',
  'packages/core/scripts/fix-core-esm-extensions.mjs',
  'packages/components/web/scripts/amd-entry.mjs',
  'packages/components/web-full/scripts/offline-asset-sanitize.mjs'
]
const jsonInputs = new Set(fixedInputs.filter(path => path.endsWith('.json')))
function sortedJson(value) {
  if (Array.isArray(value)) return value.map(sortedJson)
  return value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedJson(value[key])]))
    : value
}
const inputDigest = (path, bytes) => sha256(jsonInputs.has(path)
  ? Buffer.from(JSON.stringify(sortedJson(JSON.parse(bytes.toString('utf8'))))) : bytes)

async function preferredInputs(root) {
  const paths = [...fixedInputs]
  async function walk(relative) {
    const path = join(root, relative)
    const info = await lstat(path)
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Unsafe CAD preferred-source directory')
    for (const entry of await readdir(path, { withFileTypes: true })) {
      assert.ok(!entry.isSymbolicLink(), 'Unsafe CAD preferred-source symlink')
      const next = `${relative}/${entry.name}`
      if (entry.isDirectory()) await walk(next)
      else { assert.ok(entry.isFile(), 'Unsafe CAD preferred-source input'); paths.push(next) }
    }
  }
  await walk('packages/core/src')
  await walk('packages/renderers/cad/src')
  return paths.sort()
}

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
    await preferredInputs(root), 'CAD source archive omits or adds preferred source inputs')
  for (const entry of manifest.preferredSourceInputs) {
    const path = join(root, entry.path)
    const info = await lstat(path)
    assert.ok(info.isFile() && !info.isSymbolicLink(), 'Unsafe CAD preferred-source input')
    assert.equal(entry.hashMode, jsonInputs.has(entry.path) ? 'json' : 'bytes')
    assert.equal(inputDigest(entry.path, await readFile(path)), entry.sha256,
      `CAD corresponding source is stale: ${entry.path}`)
  }
}
