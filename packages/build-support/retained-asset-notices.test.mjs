import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'
import { resolveRetainedAssetNoticeSource, stageBuiltRetainedWorkers, stageRetainedAssetNotices, withRetainedAssetNoticeManifests, withRetainedAssetNoticeValidation } from './retained-asset-notices.mjs'

test('retained host legal sources require an exact declared runtime and notice pair', () => {
  const runtime = { id: 'postscript-design-wasm', rendererId: 'postscript-design',
    kind: 'wasm', target: 'public', required: true, defaultPath: 'vendor/design/stet_wasm_bg.wasm' }
  const assets = withRetainedAssetNoticeManifests([{ rendererId: runtime.rendererId, assets: [runtime] }])[0].assets
  const notice = assets[1]
  const sourceRoot = join(tmpdir(), 'file-viewer-legal-source')
  assert.equal(resolveRetainedAssetNoticeSource(notice, assets, { sourceRoot }),
    join(sourceRoot, 'packages/renderers/design/LICENSES/Stet_NATIVE_THIRD_PARTY_LICENSES.json'))
  assert.equal(resolveRetainedAssetNoticeSource({ ...notice, defaultPath: 'vendor/design/unknown.json' }, assets), undefined)
  assert.throws(() => resolveRetainedAssetNoticeSource(notice, [notice]), /no declared runtime/)
  for (const invalid of [{ id: 'forged' }, { rendererId: 'unrelated' }, { kind: 'license' },
    { target: 'private' }, { required: false }]) {
    assert.throws(() => resolveRetainedAssetNoticeSource({ ...notice, ...invalid }, assets))
  }
  assert.throws(() => resolveRetainedAssetNoticeSource(notice, [{ ...runtime, kind: 'file' }, notice]), /not WebAssembly/)
})

async function seedMaterialSources(sourceRoot) {
  const registry = JSON.parse(await readFile(new URL('./licenses/asset-family-materials.json', import.meta.url)))
  for (const entry of registry.materials) {
    const target = join(sourceRoot, entry.sourcePath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await readFile(new URL('../../' + entry.sourcePath, import.meta.url)))
  }
}

test('copied Workers keep their complete original grants and reject a stale build before writing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-grants-'))
  try {
    const sourceRoot = join(root, 'source')
    await seedMaterialSources(sourceRoot)
    const viewer = join(root, 'viewer')
    const source = join(sourceRoot, 'packages/renderers/iwork/dist/iwork.worker.js')
    const target = join(viewer, 'vendor/iwork/iwork.worker.js')
    const grantSource = join(dirname(source), 'workers.THIRD_PARTY_LICENSES.txt')
    const grantTarget = join(dirname(target), 'licenses/THIRD_PARTY_LICENSES.txt')
    await mkdir(dirname(source), { recursive: true })
    await mkdir(dirname(target), { recursive: true })
    const worker = 'export const worker = true\n'
    const grant = await readFile(new URL('../renderers/doc/LICENSE', import.meta.url))
    await writeFile(source, worker)
    await writeFile(target, worker)
    await writeFile(grantSource, grant)
    await stageRetainedAssetNotices(viewer, { sourceRoot })
    assert.deepEqual(await readFile(grantTarget), grant)
    await writeFile(grantTarget, 'previous grant remains')
    await writeFile(target, 'different runtime')
    await assert.rejects(() => stageRetainedAssetNotices(viewer, { sourceRoot }), /differs from its original notice build/)
    assert.equal(await readFile(grantTarget, 'utf8'), 'previous grant remains')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('source builds stage the rebuilt spreadsheet Worker before the unchanged notice gate', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-built-worker-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceRoot = join(root, 'source')
  await seedMaterialSources(sourceRoot)
  const viewer = join(root, 'viewer')
  const source = join(sourceRoot, 'packages/renderers/spreadsheet/dist/worker/sheet.worker.js')
  const grantSource = join(sourceRoot, 'packages/renderers/spreadsheet/dist/worker.THIRD_PARTY_LICENSES.txt')
  const target = join(viewer, 'vendor/xlsx/sheet.worker.js')
  await mkdir(dirname(source), { recursive: true })
  await mkdir(dirname(target), { recursive: true })
  await writeFile(source, 'export const currentSourceBuild = true\n')
  // Use the reviewed complete original grants seeded for this canonical build.
  const grant = await readFile(grantSource)
  await writeFile(target, 'stale bootstrap Worker\n')
  await assert.rejects(() => stageRetainedAssetNotices(viewer, { sourceRoot }), /differs from its original notice build/)
  await stageBuiltRetainedWorkers(viewer, { sourceRoot })
  assert.deepEqual(await readFile(target), await readFile(source))
  await stageRetainedAssetNotices(viewer, { sourceRoot })
  assert.deepEqual(await readFile(join(dirname(target), 'licenses/THIRD_PARTY_LICENSES.txt')), grant)
  const receipt = JSON.parse(await readFile(join(viewer, 'THIRD_PARTY_LICENSES.assets.json')))
  assert.ok(receipt.materials.some(entry => entry.path === 'vendor/xlsx/licenses/THIRD_PARTY_LICENSES.txt'
    && entry.runtimePaths.includes('vendor/xlsx/sheet.worker.js')))
  assert.ok(receipt.runtimeFiles.some(entry => entry.path === 'vendor/xlsx/sheet.worker.js'))
  await writeFile(target, 'tampered Worker\n')
  await assert.rejects(() => stageRetainedAssetNotices(viewer, { sourceRoot }), /differs from its original notice build/)
})

test('asset manifests deploy legal directories alongside exactly their declared payloads', () => {
  const original = [{ rendererId: 'apple-pages', assets: [{ id: 'apple-pages-iwork-worker', rendererId: 'apple-pages',
    kind: 'worker', target: 'public', required: true, defaultPath: 'vendor/iwork/iwork.worker.js' }] }]
  const result = withRetainedAssetNoticeManifests(original)
  assert.equal(original[0].assets.length, 1)
  assert.equal(result[0].assets[1].defaultPath, 'vendor/iwork/licenses/')
  assert.equal(result[0].assets[1].required, true)
  assert.deepEqual(withRetainedAssetNoticeManifests(result), result)
  assert.deepEqual(withRetainedAssetNoticeManifests([{ rendererId: 'unrelated', assets: [] }]), [{ rendererId: 'unrelated', assets: [] }])
})

test('asset validation checks every retained legal directory and rejects a missing required directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-grant-validation-'))
  try {
    const manifests = [{ rendererId: 'apple-pages', assets: [{ id: 'apple-pages-iwork-worker',
      rendererId: 'apple-pages', kind: 'worker', target: 'public', required: true,
      defaultPath: 'vendor/iwork/iwork.worker.js' }] }]
    const validation = { sourceDir: root, valid: true, assets: [{ id: 'apple-pages-iwork-worker',
      rendererId: 'apple-pages', kind: 'worker', target: 'public', required: true,
      relativePath: 'vendor/iwork/iwork.worker.js', exists: true }], missingRequired: [], missingOptional: [] }
    const missing = await withRetainedAssetNoticeValidation(validation, manifests)
    assert.equal(missing.valid, false)
    assert.equal(missing.missingRequired[0].id, 'apple-pages-iwork-worker-licenses')
    assert.equal(validation.assets.length, 1)
    assert.deepEqual(validation.missingRequired, [])
    await mkdir(join(root, 'vendor/iwork/licenses'), { recursive: true })
    const present = await withRetainedAssetNoticeValidation(validation, manifests)
    assert.equal(present.valid, true)
    assert.equal(present.assets.length, 2)
    assert.equal(present.assets[1].relativePath, 'vendor/iwork/licenses/')
    assert.equal(present.assets[1].exists, true)
    assert.deepEqual((await withRetainedAssetNoticeValidation(present, manifests)).assets, present.assets)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('SQL grants resolve the exported WASM and reject changed bytes before replacing a grant', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-sql-grants-'))
  try {
    const sourceRoot = join(root, 'source')
    await seedMaterialSources(sourceRoot)
    const dataRoot = join(sourceRoot, 'packages/renderers/data')
    const packageRoot = join(dataRoot, 'node_modules/sql.js')
    const viewer = join(root, 'viewer')
    const target = join(viewer, 'wasm/data/sql-wasm.wasm')
    const grantTarget = join(dirname(target), 'licenses/LICENSE.sql-js.txt')
    await mkdir(join(packageRoot, 'dist'), { recursive: true })
    await mkdir(dirname(target), { recursive: true })
    await writeFile(join(dataRoot, 'package.json'), '{}')
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: 'sql.js', version: '1.15.2',
      license: 'MIT', exports: { './dist/*': './dist/*' } }))
    const wasm = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])
    const grant = await readFile(new URL('../renderers/doc/LICENSE', import.meta.url))
    await writeFile(join(packageRoot, 'dist/sql-wasm.wasm'), wasm)
    await writeFile(join(packageRoot, 'LICENSE'), grant)
    await writeFile(target, wasm)
    await stageRetainedAssetNotices(viewer, { sourceRoot })
    assert.deepEqual(await readFile(grantTarget), grant)
    await writeFile(grantTarget, 'previous grant remains')
    await writeFile(target, Buffer.from([0]))
    await assert.rejects(() => stageRetainedAssetNotices(viewer, { sourceRoot }), /differs from its exact installed package/)
    assert.equal(await readFile(grantTarget, 'utf8'), 'previous grant remains')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('QCMS stages the actual PDF.js grant and rejects a mismatched runtime before writing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-qcms-grants-'))
  try {
    const sourceRoot = join(root, 'source')
    await seedMaterialSources(sourceRoot)
    const renderer = join(sourceRoot, 'packages/renderers/pdf')
    const module = join(renderer, 'node_modules/pdfjs-dist')
    const viewer = join(root, 'viewer')
    const target = join(viewer, 'vendor/pdf/wasm')
    await mkdir(join(module, 'wasm'), { recursive: true }); await mkdir(target, { recursive: true })
    await writeFile(join(renderer, 'package.json'), '{}')
    await writeFile(join(module, 'package.json'), JSON.stringify({ name: 'pdfjs-dist', version: '5.4.624' }))
    const require = createRequire(new URL('../renderers/pdf/package.json', import.meta.url))
    const original = await readFile(join(dirname(require.resolve('pdfjs-dist/package.json')), 'wasm/LICENSE_QCMS'))
    const wasm = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])
    await writeFile(join(module, 'wasm/qcms_bg.wasm'), wasm)
    await writeFile(join(module, 'wasm/LICENSE_QCMS'), original)
    await writeFile(join(target, 'qcms_bg.wasm'), wasm)
    await stageRetainedAssetNotices(viewer, { sourceRoot })
    assert.deepEqual(await readFile(join(target, 'LICENSE_QCMS')), original)
    await writeFile(join(target, 'qcms_bg.wasm'), Buffer.from([1]))
    await assert.rejects(() => stageRetainedAssetNotices(viewer, { sourceRoot }), /Copied QCMS differs/)
    assert.deepEqual(await readFile(join(target, 'LICENSE_QCMS')), original)
  } finally { await rm(root, { recursive: true, force: true }) }
})
