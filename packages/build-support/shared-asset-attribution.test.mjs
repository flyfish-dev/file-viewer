import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { stageSharedAssetAttribution } from './shared-asset-attribution.mjs'

test('copied PDF CMap grants bind to the actual canonical payload; altered payload fails', async t => {
  const target = await mkdtemp(join(tmpdir(), 'file-viewer-material-binding-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const source = resolve(import.meta.dirname, '../renderers/pdf/dist/vendor/pdfjs/cmaps')
  const cmaps = join(target, 'vendor/pdf/cmaps')
  await mkdir(cmaps, { recursive: true })
  for (const name of ['LICENSE', 'Adobe-GB1-UCS2.bcmap']) await cp(join(source, name), join(cmaps, name))
  const receipt = await stageSharedAssetAttribution(target)
  assert.equal(receipt.materials[0].declaredLicense, 'BSD-3-Clause')
  assert.deepEqual(receipt.materials[0].runtimePaths, ['vendor/pdf/cmaps/Adobe-GB1-UCS2.bcmap'])
  await writeFile(join(cmaps, 'Adobe-GB1-UCS2.bcmap'), 'Different code must not inherit an unrelated original grant')
  await assert.rejects(stageSharedAssetAttribution(target), /differs from its canonical owner/)
})

test('generated provenance remains informational and the original Atlassian restrictions remain explicit', async () => {
  const registry = JSON.parse(await readFile(new URL('./licenses/asset-family-materials.json', import.meta.url)))
  assert.equal(registry.materials.length, 55)
  for (const entry of registry.materials.filter(entry => entry.kind.startsWith('generated-'))) assert.equal(entry.declaredLicense, null)
  const restricted = registry.materials.filter(entry => entry.kind === 'original-restricted-grant')
  assert.equal(restricted.length, 2)
  assert.ok(restricted.every(entry => entry.declaredLicense === 'LicenseRef-Drawio-Atlassian-Restricted'))
})

test('the established Full asset split names exact owners without claiming their files are inside the package', async t => {
  const target = await mkdtemp(join(tmpdir(), 'file-viewer-delegated-materials-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const drawio = join(target, 'vendor/drawio')
  await mkdir(drawio, { recursive: true })
  await cp(resolve(import.meta.dirname, '../../third_party/drawio/LICENSE'), join(drawio, 'LICENSE'))
  await writeFile(join(drawio, 'outside-this-npm-package.js'), 'delegated to the existing asset owner')
  const owner = { prefix: 'vendor/drawio/', packageName: '@file-viewer/assets-drawing', version: '3.2.0', inventoryPath: 'viewer/THIRD_PARTY_LICENSES.assets.json' }
  const receipt = await stageSharedAssetAttribution(target, { externalAssetOwners: [owner] })
  assert.deepEqual(receipt.externalAssetOwners, [owner])
  assert.deepEqual(receipt.materials, [])
  assert.deepEqual(receipt.runtimeFiles, [])
  await assert.rejects(stageSharedAssetAttribution(target, { externalAssetOwners: [{ ...owner, prefix: 'vendor/pdf/' }] }), /established Full asset split/)
  const design = { ...owner, prefix: 'vendor/design/', packageName: '@file-viewer/assets-design' }
  await mkdir(join(target, 'vendor/design'), { recursive: true })
  await writeFile(join(target, 'vendor/design/paged_introspect_wasm_bg.wasm'), 'delegated to the exact-version design owner')
  const withDesign = await stageSharedAssetAttribution(target, { externalAssetOwners: [owner, design] })
  assert.deepEqual(withDesign.externalAssetOwners, [owner, design])
  assert.deepEqual(withDesign.runtimeFiles, [])
  await assert.rejects(stageSharedAssetAttribution(target, { externalAssetOwners: [{ ...design, packageName: '@file-viewer/assets-drawing' }] }), /AssertionError/)
})

test('separate native CAD bindings retain their GPL text and independent AGPL owner grant', async t => {
  const target = await mkdtemp(join(tmpdir(), 'file-viewer-cad-materials-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const cad = join(target, 'wasm/cad')
  await mkdir(cad, { recursive: true })
  for (const file of ['LICENSE', 'NOTICE', 'GPL-3.0.txt', 'libredwg-web.wasm', 'dwfv-render.wasm']) {
    await cp(resolve(import.meta.dirname, '../../apps/viewer-demo/public/wasm/cad', file), join(cad, file))
  }
  const receipt = await stageSharedAssetAttribution(target)
  const gpl = receipt.materials.find(item => item.path.endsWith('/GPL-3.0.txt'))
  assert.equal(gpl.declaredLicense, 'GPL-3.0-only')
  assert.deepEqual(gpl.runtimePaths, ['wasm/cad/libredwg-web.wasm'])
  const owner = receipt.materials.find(item => item.path.endsWith('/LICENSE'))
  assert.equal(owner.declaredLicense, 'AGPL-3.0-only')
  assert.ok(owner.runtimePaths.includes('wasm/cad/dwfv-render.wasm'))
})
