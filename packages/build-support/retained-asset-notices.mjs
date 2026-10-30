import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { stageSharedAssetAttribution } from './shared-asset-attribution.mjs'
import { resolveWorkspaceAsset } from './public-asset-mirror.mjs'

const workspaceRoot = resolve(import.meta.dirname, '../..')
const workerNotices = [
  { runtime: 'vendor/iwork/iwork.worker.js', source: 'packages/renderers/iwork/dist/iwork.worker.js', grant: 'packages/renderers/iwork/dist/workers.THIRD_PARTY_LICENSES.txt' },
  { runtime: 'vendor/hangul/hangul.worker.js', source: 'packages/renderers/hangul/dist/hangul.worker.js', grant: 'packages/renderers/hangul/dist/workers.THIRD_PARTY_LICENSES.txt' },
  { runtime: 'vendor/xlsx/sheet.worker.js', source: 'packages/renderers/spreadsheet/dist/worker/sheet.worker.js', grant: 'packages/renderers/spreadsheet/dist/worker.THIRD_PARTY_LICENSES.txt' }
]
const runtimePaths = new Set([...workerNotices.map(entry => entry.runtime), 'wasm/data/sql-wasm.wasm'])
const noticeDirectories = new Set([...runtimePaths].map(path => `${dirname(path)}/licenses/`))
const extraLegalAssets = [
  { runtime: 'vendor/design/stet_wasm_bg.wasm', path: 'vendor/design/Stet_NATIVE_THIRD_PARTY_LICENSES.json', source: 'packages/renderers/design/LICENSES/Stet_NATIVE_THIRD_PARTY_LICENSES.json' },
  { runtime: 'wasm/model/occt-import-js.wasm', path: 'wasm/model/OCCT_LGPL_EXCEPTION.txt', source: 'packages/build-support/licenses/native/OCCT_LGPL_EXCEPTION.txt' },
  { runtime: 'wasm/model/occt-import-js.wasm', path: 'wasm/model/CORRESPONDING_SOURCE_NOTICE.txt', source: 'packages/renderers/geometry-engine/dist/vendor/occt.NOTICE.txt' },
]

export function resolveRetainedAssetNoticeSource(asset, assets, { sourceRoot = workspaceRoot } = {}) {
  const extra = extraLegalAssets.find(entry => entry.path === asset.defaultPath)
  if (!extra) return undefined
  const runtime = assets.find(entry => entry.defaultPath === extra.runtime && entry.rendererId === asset.rendererId)
  assert.ok(runtime, `Retained legal asset has no declared runtime: ${asset.defaultPath}`)
  assert.equal(runtime.kind, 'wasm', `Retained legal asset runtime is not WebAssembly: ${asset.defaultPath}`)
  assert.equal(runtime.target, 'public')
  assert.equal(asset.id, `${runtime.id}-${extra.path.split('/').at(-1)}`)
  assert.equal(asset.kind, 'file')
  assert.equal(asset.target, 'public')
  assert.equal(asset.required, runtime.required)
  return resolveWorkspaceAsset(sourceRoot, extra.source)
}

export function withRetainedAssetNoticeManifests(manifests) {
  return manifests.map(manifest => {
    const assets = [...manifest.assets]
    for (const asset of manifest.assets) {
      for (const extra of extraLegalAssets.filter(entry => entry.runtime === asset.defaultPath)) {
        if (!assets.some(entry => entry.defaultPath === extra.path)) assets.push({ id: `${asset.id}-${extra.path.split('/').at(-1)}`,
          rendererId: asset.rendererId, kind: 'file', target: 'public', required: asset.required, defaultPath: extra.path,
          description: 'Complete original native license materials and public corresponding source notice.' })
      }
      if (!runtimePaths.has(asset.defaultPath)) continue
      const defaultPath = `${dirname(asset.defaultPath)}/licenses/`
      if (assets.some(entry => entry.defaultPath === defaultPath)) continue
      assets.push({ id: `${asset.id}-licenses`, rendererId: asset.rendererId,
        kind: 'directory', target: 'public', required: asset.required, defaultPath,
        description: 'Complete original third-party licenses distributed with this runtime.' })
    }
    return { ...manifest, assets }
  })
}

export async function withRetainedAssetNoticeValidation(validation, manifests) {
  const assets = new Map(validation.assets.map(asset => [asset.id, asset]))
  for (const asset of withRetainedAssetNoticeManifests(manifests).flatMap(manifest => manifest.assets)) {
    if (asset.target !== 'public' || (!noticeDirectories.has(asset.defaultPath) && !extraLegalAssets.some(entry => entry.path === asset.defaultPath))) continue
    const absolutePath = resolve(validation.sourceDir, asset.defaultPath)
    let exists = false
    try {
      const info = await stat(absolutePath)
      exists = asset.kind === 'directory' ? info.isDirectory() : info.isFile()
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    assets.set(asset.id, { id: asset.id, rendererId: asset.rendererId, kind: asset.kind,
      target: asset.target, required: asset.required, relativePath: asset.defaultPath,
      absolutePath, exists, description: asset.description })
  }
  const checkedAssets = [...assets.values()]
  const missingRequired = checkedAssets.filter(asset => asset.required && !asset.exists)
  const missingOptional = checkedAssets.filter(asset => !asset.required && !asset.exists)
  return { ...validation, assets: checkedAssets, missingRequired, missingOptional,
    valid: missingRequired.length === 0 }
}

// A source build may have rebuilt Workers since the bootstrap viewer tree was
// copied. Stage each retained Worker from the same canonical build as its grants
// before applying the unchanged byte-for-byte notice gate.
export async function stageBuiltRetainedWorkers(viewerRoot, { sourceRoot = workspaceRoot } = {}) {
  const pending = []
  for (const entry of workerNotices) {
    try { await stat(join(viewerRoot, entry.runtime)) } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    const bytes = await readFile(resolveWorkspaceAsset(sourceRoot, entry.source))
    const grant = await readFile(resolveWorkspaceAsset(sourceRoot, entry.grant))
    assert.ok(bytes.length > 0 && grant.length > 0, `Missing built Worker or complete grants: ${entry.runtime}`)
    pending.push({ target: join(viewerRoot, entry.runtime), bytes })
  }
  for (const { target, bytes } of pending) await writeFile(target, bytes)
}

export async function stageRetainedAssetNotices(viewerRoot, { sourceRoot = workspaceRoot, externalAssetOwners = [] } = {}) {
  const writes = []
  const readOptional = async path => readFile(path).catch(error => { if (error.code === 'ENOENT') return null; throw error })
  for (const entry of workerNotices) {
    const runtime = await readOptional(join(viewerRoot, entry.runtime))
    if (!runtime) continue
    const expected = await readFile(resolveWorkspaceAsset(sourceRoot, entry.source))
    assert.ok(runtime.equals(expected), `Copied Worker differs from its original notice build: ${entry.runtime}`)
    const grant = await readFile(resolveWorkspaceAsset(sourceRoot, entry.grant))
    assert.ok(grant.length > 0, `Missing complete original Worker grants: ${entry.runtime}`)
    writes.push({ target: join(viewerRoot, dirname(entry.runtime), 'licenses/THIRD_PARTY_LICENSES.txt'), bytes: grant })
  }
  const sqlRuntime = await readOptional(join(viewerRoot, 'wasm/data/sql-wasm.wasm'))
  if (sqlRuntime) {
    const require = createRequire(join(sourceRoot, 'packages/renderers/data/package.json'))
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
    const packageRoot = resolve(dirname(wasmPath), '..')
    const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json')))
    assert.equal(metadata.name, 'sql.js')
    assert.equal(metadata.version, '1.15.2', 'Unreviewed SQL runtime version')
    assert.equal(metadata.license, 'MIT', 'SQL runtime declaration changed')
    assert.ok(sqlRuntime.equals(await readFile(wasmPath)), 'Copied SQL WASM differs from its exact installed package')
    writes.push({ target: join(viewerRoot, 'wasm/data/licenses/LICENSE.sql-js.txt'), bytes: await readFile(join(packageRoot, 'LICENSE')) })
  }
  const qcmsRuntime = await readOptional(join(viewerRoot, 'vendor/pdf/wasm/qcms_bg.wasm'))
  if (qcmsRuntime) {
    const require = createRequire(join(sourceRoot, 'packages/renderers/pdf/package.json'))
    const packageRoot = dirname(require.resolve('pdfjs-dist/package.json'))
    const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json')))
    assert.equal(metadata.version, '5.4.624', 'Unreviewed PDF.js QCMS version')
    assert.ok(qcmsRuntime.equals(await readFile(join(packageRoot, 'wasm/qcms_bg.wasm'))), 'Copied QCMS differs from its original package')
    const bytes = await readFile(join(packageRoot, 'wasm/LICENSE_QCMS'))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), '36d847ae882f6574ebc72f56a4f354e4f104fde4a584373496482e97d52d31bc', 'Original QCMS grant changed')
    writes.push({ target: join(viewerRoot, 'vendor/pdf/wasm/LICENSE_QCMS'), bytes })
  }
  for (const extra of extraLegalAssets) {
    const runtime = await readOptional(join(viewerRoot, extra.runtime))
    if (!runtime) continue
    if (extra.runtime.includes('/design/')) {
      assert.ok(runtime.equals(await readFile(join(sourceRoot, 'packages/renderers/design/runtime/postscript/stet_wasm_bg.wasm'))), 'Copied Stet WASM changed')
    } else {
      const require = createRequire(join(sourceRoot, 'packages/renderers/geometry-engine/package.json'))
      const expected = join(dirname(require.resolve('occt-import-js')), 'occt-import-js.wasm')
      assert.ok(runtime.equals(await readFile(expected)), 'Copied OCCT WASM changed')
    }
    writes.push({ target: join(viewerRoot, extra.path), bytes: await readFile(resolveWorkspaceAsset(sourceRoot, extra.source)) })
  }
  // Verify every present payload before writing any grant, so a stale Worker
  // cannot be paired with the notices of a different normal build.
  for (const entry of writes) {
    await mkdir(dirname(entry.target), { recursive: true })
    await writeFile(entry.target, entry.bytes)
  }
  await stageSharedAssetAttribution(viewerRoot, { sourceRoot, externalAssetOwners })
  return writes.map(entry => entry.target)
}
