import assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

test('IFC copier rejects a second physical web-ifc even when its version matches', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ifc-physical-identity-'))
  try {
    await copyFile(
      new URL('../../packages/renderers/3d/bin/copy-ifc-assets.mjs', import.meta.url),
      join(root, 'copy.mjs')
    )
    const makePackage = async (base, name, version) => {
      const directory = join(base, 'node_modules', name)
      await mkdir(directory, { recursive: true })
      await writeFile(
        join(directory, 'package.json'),
        JSON.stringify({ name, version, main: 'index.js' })
      )
      await writeFile(join(directory, 'index.js'), '')
      return directory
    }
    await makePackage(root, 'web-ifc', '0.0.77')
    const fragments = await makePackage(root, '@thatopen/fragments', '3.4.7')
    await makePackage(fragments, 'web-ifc', '0.0.77')
    for (const name of ['three', 'earcut', 'flatbuffers', 'lru-cache', 'pako'])
      await makePackage(root, name, '1.0.0')
    const { copyIfcAssets } = await import(pathToFileURL(join(root, 'copy.mjs')).href)
    await assert.rejects(copyIfcAssets(join(root, 'output')), /assets and importer must share/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
