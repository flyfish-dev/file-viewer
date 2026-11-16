import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { lstat, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export const libarchiveNoticeSource = 'packages/build-support/licenses/libarchive/THIRD_PARTY_NOTICES.txt'
const sourceDirectory = dirname(libarchiveNoticeSource)
const sourceManifestSha256 = '78a6a0fbf695242e24e8a640710aa5c30a5d7d9eda5119b99605044210e7c250'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

async function readRegular(path, root) {
  const local = relative(root, path)
  assert.ok(local && !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep),
    'Retained libarchive source must remain in its canonical directory')
  let cursor = root
  for (const part of local.split(sep)) {
    cursor = join(cursor, part)
    const info = await lstat(cursor)
    assert.ok(!info.isSymbolicLink(), 'Retained libarchive sources cannot be symlinks')
    if (cursor === path) assert.ok(info.isFile(), 'Retained libarchive source must be a regular file')
    else assert.ok(info.isDirectory(), 'Retained libarchive source parent must be a directory')
  }
  return readFile(path)
}

function assertIdentity(bytes, expected, label) {
  assert.equal(bytes.length, expected.bytes, `${label} size changed`)
  assert.equal(hash(bytes), expected.sha256, `${label} bytes changed`)
}

/** Exact official runtime identity and complete original materials only.
 * This does not qualify the floating toolchain, corresponding source or release.
 */
export async function readLibarchiveRetainedNotice(sourceRoot, { wasm, worker }) {
  assert.ok(wasm && worker, 'Copied libarchive WASM and Worker must both be present')
  const root = resolve(sourceRoot, sourceDirectory)
  const manifestBytes = await readRegular(join(root, 'SOURCE-MANIFEST.json'), root)
  assert.equal(hash(manifestBytes), sourceManifestSha256, 'Retained libarchive source manifest changed')
  const manifest = JSON.parse(manifestBytes)
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.purpose, 'fixed-libarchive-original-notice-retention')
  assert.equal(manifest.releaseApproval, false)
  const require = createRequire(join(sourceRoot, 'packages/renderers/archive/package.json'))
  const packageRoot = dirname(require.resolve('libarchive.js/package.json'))
  const metadata = JSON.parse(await readRegular(join(packageRoot, 'package.json'), packageRoot))
  assert.equal(metadata.name, manifest.packageName, 'Unreviewed libarchive package name')
  assert.equal(metadata.version, manifest.packageVersion, 'Unreviewed libarchive package version')
  assert.equal(metadata.license, 'MIT', 'Original libarchive wrapper declaration changed')
  assertIdentity(wasm, manifest.runtime, 'Copied libarchive WASM')
  assertIdentity(worker, manifest.worker, 'Copied libarchive Worker')
  assert.ok(wasm.equals(await readRegular(join(packageRoot, manifest.runtime.path), packageRoot)),
    'Copied libarchive WASM differs from the exact installed distribution')
  assert.ok(worker.equals(await readRegular(join(packageRoot, manifest.worker.path), packageRoot)),
    'Copied libarchive Worker differs from the exact installed distribution')
  const parts = [Buffer.from(manifest.header)]
  assert.equal(manifest.originalMaterials.length, 6, 'Retain the wrapper and all five native source profiles')
  for (const entry of manifest.originalMaterials) {
    const bytes = await readRegular(resolve(root, entry.path), root)
    assertIdentity(bytes, entry, 'Retained original libarchive material')
    if (entry.component === 'libarchive.js wrapper') {
      assert.ok(bytes.equals(await readRegular(join(packageRoot, 'LICENSE'), packageRoot)),
        'Original libarchive wrapper LICENSE changed')
    }
    parts.push(Buffer.from(`\n===== ${entry.component} ${entry.version} original bytes =====\n`), bytes, Buffer.from('\n'))
  }
  const collection = await readRegular(join(root, manifest.collection.path), root)
  assertIdentity(collection, manifest.collection, 'Retained libarchive collection')
  assert.ok(collection.equals(Buffer.concat(parts)), 'Retained libarchive collection omits or alters original bytes')
  return collection
}
