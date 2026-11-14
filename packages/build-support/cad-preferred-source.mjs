import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const fixedInputs = [
  'packages/core/package.json', 'packages/core/tsconfig.json',
  'packages/renderers/cad/package.json', 'packages/renderers/cad/tsconfig.json',
  'packages/core/scripts/fix-core-esm-extensions.mjs',
  'packages/components/web/scripts/amd-entry.mjs',
  'packages/components/web-full/scripts/offline-asset-sanitize.mjs'
]
const jsonInputs = new Set(fixedInputs.filter(path => path.endsWith('.json')))
const sortedJson = value => Array.isArray(value) ? value.map(sortedJson)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedJson(value[key])]))
    : value

export const cadPreferredSourceHashMode = path => jsonInputs.has(path) ? 'json' : 'bytes'
export const cadSourceSnapshotIdentifier = (version, revision) => {
  assert.match(version, /^\d+\.\d+\.\d+$/, 'An explicit source version is required')
  if (revision === undefined || revision === '') return version
  assert.ok(typeof revision === 'string' && revision.length <= 48 &&
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(revision), 'An explicit safe CAD source revision is required')
  return `${version}-${revision}`
}
export const cadPreferredSourceDigest = (path, bytes) => createHash('sha256').update(
  jsonInputs.has(path) ? Buffer.from(JSON.stringify(sortedJson(JSON.parse(bytes.toString('utf8'))))) : bytes
).digest('hex')

/** The producer and verifier must own exactly the same input membership. */
export async function listCadPreferredSourcePaths(root) {
  const paths = [...fixedInputs]
  async function walk(relative) {
    const info = await lstat(join(root, relative))
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Unsafe CAD preferred-source directory')
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
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
