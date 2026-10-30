import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const assetPackages = ['@file-viewer/assets-cad', '@file-viewer/assets-drawing', '@file-viewer/assets-design']

export async function assertFullAssetDependencies(manifest, packageJsonPath) {
  const require = createRequire(packageJsonPath)
  for (const name of assetPackages) {
    const spec = manifest.dependencies?.[name]
    if (typeof spec !== 'string' || (spec.replace(/^workspace:/, '') !== manifest.version && !spec.startsWith('file:'))) {
      throw new Error(`[web-full-iife] ${name} must match the full package version`)
    }
    const installed = JSON.parse(await readFile(require.resolve(`${name}/package.json`), 'utf8'))
    if (installed.name !== name || installed.version !== manifest.version) {
      throw new Error(`[web-full-iife] ${name}@${installed.version} must match the full package version ${manifest.version}`)
    }
  }
}

export async function resolveFullAssetSources(manifest, packageJsonPath) {
  await assertFullAssetDependencies(manifest, packageJsonPath)
  const require = createRequire(packageJsonPath)
  const sources = new Map()
  for (const name of assetPackages) {
    const packPath = require.resolve(`${name}/asset-pack`)
    const pack = JSON.parse(await readFile(packPath, 'utf8'))
    assert.equal(pack.schemaVersion, 1, `Invalid asset pack: ${name}`)
    assert.equal(pack.packageName, name, `Asset pack identity mismatch: ${name}`)
    assert.equal(pack.packageVersion, manifest.version, `Asset pack version mismatch: ${name}`)
    assert.ok(Array.isArray(pack.rendererAssetManifests) && pack.rendererAssetManifests.length > 0, `Empty asset pack: ${name}`)
    const groups = pack.rendererAssetManifests.map(group => group.rendererId)
    assert.deepEqual([...groups].sort(), [...pack.copyGroups].sort(), `Asset pack groups mismatch: ${name}`)
    for (const group of groups) {
      assert.ok(typeof group === 'string' && group.length > 0 && !sources.has(group), `Duplicate or invalid asset group: ${group}`)
      sources.set(group, resolve(dirname(packPath)))
    }
  }
  return Object.fromEntries(sources)
}
