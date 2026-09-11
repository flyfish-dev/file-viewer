import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(packageDir, 'viewer/wasm/model')
const required = [
  'web-ifc.wasm',
  'web-ifc-mt.wasm',
  'LICENSE.web-ifc-MPL-2.0.md',
  'fragments-worker.mjs',
  'LICENSE.thatopen-fragments-MIT.txt',
]
for (const filename of required) {
  const info = await stat(resolve(root, filename))
  if (!info.isFile() || info.size <= 0) throw new Error(`Invalid staged IFC asset: ${filename}`)
}

const manifest = JSON.parse(await readFile(resolve(packageDir, 'viewer/file-viewer-asset-pack.json'), 'utf8'))
const group = manifest.rendererAssetManifests.find(entry => entry.rendererId === 'model')
if (!group) throw new Error('IFC asset pack is missing the model renderer group')
const ids = new Set(group.assets.map(asset => asset.id))
for (const id of [
  'model-web-ifc-wasm',
  'model-web-ifc-mt-wasm',
  'model-web-ifc-license',
  'model-thatopen-fragments-worker',
  'model-thatopen-fragments-license',
]) {
  if (!ids.has(id)) throw new Error(`IFC asset pack is missing ${id}`)
}

const webIfcLicense = await readFile(resolve(root, 'LICENSE.web-ifc-MPL-2.0.md'), 'utf8')
if (!webIfcLicense.includes('Mozilla Public License')) throw new Error('Staged web-ifc license is not MPL-2.0 text')
const fragmentsLicense = await readFile(resolve(root, 'LICENSE.thatopen-fragments-MIT.txt'), 'utf8')
if (!fragmentsLicense.includes('MIT License') || !fragmentsLicense.includes('That Open Company')) {
  throw new Error('Staged That Open Fragments worker is missing its MIT attribution notice')
}

console.log('[assets-ifc] verified self-hosted web-ifc 0.0.77 and @thatopen/fragments 3.4.7 worker assets/licenses')
