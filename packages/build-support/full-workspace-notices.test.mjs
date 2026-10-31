import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { verifyFullWorkspaceNotices } from './full-workspace-notices.mjs'

test('the associated workspace grant and every required contributor notice remain byte-exact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fv-full-notices-'))
  try {
    const full = join(root, 'packages/components/web-full')
    const owner = join(root, 'packages/renderers/3d')
    await mkdir(join(full, '.build'), { recursive: true })
    await mkdir(join(full, 'dist'))
    await mkdir(owner, { recursive: true })
    await writeFile(join(owner, 'package.json'), JSON.stringify({ name: '@file-viewer/renderer-3d', version: '1.0.0' }))
    await writeFile(join(owner, 'LICENSE'), 'Original host grant\r\n')
    await writeFile(join(owner, 'GEO3D_THIRD_PARTY_NOTICES.md'), 'Original contributor notice\r\n')
    await writeFile(join(full, '.build/iife-inputs.json'), JSON.stringify({
      purpose: 'private-actual-bundle-input-evidence', packages: [{ name: '@file-viewer/renderer-3d' }]
    }))
    const notice = join(full, 'dist/THIRD_PARTY_LICENSES.txt')
    const section = '@file-viewer/renderer-3d@1.0.0\n\nOriginal host grant\r\n'
    await writeFile(notice, section)
    await assert.rejects(verifyFullWorkspaceNotices(root), /GEO3D_THIRD_PARTY_NOTICES/)
    await writeFile(notice, section + '\nOriginal contributor notice\r\n')
    assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, 1)
    await writeFile(notice, section + '\nOriginal contributor notice\n')
    await assert.rejects(verifyFullWorkspaceNotices(root), /GEO3D_THIRD_PARTY_NOTICES/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
