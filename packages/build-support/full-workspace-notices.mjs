import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// These physically bundled public workspace dependencies carry their own
// original grants or contributor notices, independently of the host grant.
export const fullWorkspaceLicensePackages = Object.freeze([
  { packageName: '@file-viewer/doc', directory: 'packages/renderers/doc' },
  { packageName: '@file-viewer/renderer-3d', directory: 'packages/renderers/3d', noticeFiles: ['GEO3D_THIRD_PARTY_NOTICES.md'] },
  { packageName: '@file-viewer/renderer-hangul', directory: 'packages/renderers/hangul' },
  { packageName: '@file-viewer/renderer-iwork', directory: 'packages/renderers/iwork' },
  { packageName: '@file-viewer/renderer-wordperfect', directory: 'packages/renderers/wordperfect' }
])

export async function verifyFullWorkspaceNotices(root) {
  const full = join(root, 'packages/components/web-full')
  const inputs = JSON.parse(await readFile(join(full, '.build/iife-inputs.json'), 'utf8'))
  assert.equal(inputs.purpose, 'private-actual-bundle-input-evidence')
  const notices = await readFile(join(full, 'dist/THIRD_PARTY_LICENSES.txt'))
  const sections = notices
    .toString('utf8')
    .split('\n\n========================================\n\n')
  const checked = []
  for (const owner of fullWorkspaceLicensePackages) {
    if (!inputs.packages.some((pkg) => pkg.name === owner.packageName)) continue
    const metadata = JSON.parse(await readFile(join(root, owner.directory, 'package.json'), 'utf8'))
    assert.equal(metadata.name, owner.packageName)
    const id = `${metadata.name}@${metadata.version}`
    const matches = sections.filter((section) => section.startsWith(id + '\n\n'))
    assert.equal(matches.length, 1, `Full must associate exactly one original grant with ${id}`)
    const original = await readFile(join(root, owner.directory, 'LICENSE'))
    assert.ok(
      Buffer.from(matches[0]).includes(original),
      `Full must retain every original LICENSE byte for ${id}`
    )
    for (const filename of owner.noticeFiles || []) {
      assert.ok(Buffer.from(matches[0]).includes(await readFile(join(root, owner.directory, filename))),
        `Full must retain every original ${filename} byte for ${id}`)
    }
    checked.push({
      packageName: metadata.name,
      version: metadata.version,
      bytes: original.length,
      sha256: createHash('sha256').update(original).digest('hex')
    })
  }
  assert.ok(checked.length > 0, 'Full bundle input evidence has no reviewed workspace contributors')
  return { checked, noticeSha256: createHash('sha256').update(notices).digest('hex') }
}
