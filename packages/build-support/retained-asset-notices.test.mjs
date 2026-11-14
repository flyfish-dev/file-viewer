import assert from 'node:assert/strict'
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
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

const chmRuntime = { id: 'chm-wasm', rendererId: 'chm', kind: 'wasm', target: 'public',
  required: true, defaultPath: 'vendor/chm/chm_wasm_bg.wasm' }
const chmLegalSources = [
  ['LICENSE', 'LICENSE'],
  ['RUST_NOTICE.md', 'rust/NOTICE.md'],
  ['RUST_THIRD_PARTY_LICENSES.md', 'rust/THIRD_PARTY_LICENSES.md'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md']
]

test('CHM declares four real legal files and rejects missing or forged runtime declarations', () => {
  const manifests = withRetainedAssetNoticeManifests([{ rendererId: 'chm', assets: [chmRuntime] }])
  assert.deepEqual(withRetainedAssetNoticeManifests(manifests), manifests)
  const assets = manifests[0].assets
  assert.equal(assets.length, 5)
  for (const [filename, source] of chmLegalSources) {
    const notice = assets.find(asset => asset.defaultPath === 'vendor/chm/' + filename)
    assert.ok(notice, filename)
    const sourceRoot = join(tmpdir(), 'file-viewer-chm-legal-source')
    assert.equal(resolveRetainedAssetNoticeSource(notice, assets, { sourceRoot }),
      join(sourceRoot, 'packages/renderers/chm', source))
    assert.throws(() => resolveRetainedAssetNoticeSource(notice, [notice]), /no declared runtime/)
    for (const invalid of [{ id: 'forged' }, { rendererId: 'unrelated' }, { kind: 'directory' },
      { target: 'private' }, { required: false }]) {
      assert.throws(() => resolveRetainedAssetNoticeSource({ ...notice, ...invalid }, assets))
    }
    assert.throws(() => resolveRetainedAssetNoticeSource(notice, [{ ...chmRuntime, kind: 'file' }, notice]), /not WebAssembly/)
  }
})

async function seedMaterialSources(sourceRoot) {
  const registry = JSON.parse(await readFile(new URL('./licenses/asset-family-materials.json', import.meta.url)))
  for (const entry of registry.materials) {
    const target = join(sourceRoot, entry.sourcePath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await readFile(new URL('../../' + entry.sourcePath, import.meta.url)))
  }
}

test('libarchive declares one complete source-bound collection and rejects incomplete or altered runtime/materials before writing', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-libarchive-grants-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceRoot = join(root, 'source')
  const viewer = join(root, 'viewer')
  await seedMaterialSources(sourceRoot)
  const legalRelative = 'packages/build-support/licenses/libarchive'
  await cp(new URL('./licenses/libarchive/', import.meta.url), join(sourceRoot, legalRelative), { recursive: true })
  const require = createRequire(new URL('../renderers/archive/package.json', import.meta.url))
  const installed = dirname(require.resolve('libarchive.js/package.json'))
  const fixtureInstalled = join(sourceRoot, 'node_modules/libarchive.js')
  await mkdir(join(fixtureInstalled, 'dist'), { recursive: true })
  await cp(join(installed, 'package.json'), join(fixtureInstalled, 'package.json'))
  await cp(join(installed, 'LICENSE'), join(fixtureInstalled, 'LICENSE'))
  const wasm = await readFile(join(installed, 'dist/libarchive.wasm'))
  const worker = await readFile(join(installed, 'dist/worker-bundle.js'))
  for (const [filename, bytes] of [['libarchive.wasm', wasm], ['worker-bundle.js', worker]]) {
    await writeFile(join(fixtureInstalled, 'dist', filename), bytes)
    const canonical = join(sourceRoot, 'apps/viewer-demo/public/vendor/libarchive', filename)
    const target = join(viewer, 'vendor/libarchive', filename)
    await mkdir(dirname(canonical), { recursive: true })
    await mkdir(dirname(target), { recursive: true })
    await writeFile(canonical, bytes)
    await writeFile(target, bytes)
  }
  const noticePath = 'vendor/libarchive/licenses/THIRD_PARTY_NOTICES.txt'
  const target = join(viewer, noticePath)
  const canonicalNotice = join(sourceRoot, legalRelative, 'THIRD_PARTY_NOTICES.txt')
  const original = await readFile(canonicalNotice)
  const written = await stageRetainedAssetNotices(viewer, { sourceRoot })
  assert.ok(written.includes(target), 'The normal archive owner must retain the native original grants')
  assert.deepEqual(await readFile(target), original)
  const attribution = JSON.parse(await readFile(join(viewer, 'THIRD_PARTY_LICENSES.assets.json')))
  const material = attribution.materials.find(entry => entry.path === noticePath)
  assert.equal(material.kind, 'generated-original-notice-collection')
  assert.equal(material.declaredLicense, null)
  assert.deepEqual(material.runtimePaths, ['vendor/libarchive/libarchive.wasm', 'vendor/libarchive/worker-bundle.js'])
  const runtime = { id: 'libarchive-wasm', rendererId: 'archive', kind: 'wasm', target: 'public',
    required: true, defaultPath: 'vendor/libarchive/libarchive.wasm' }
  const manifests = withRetainedAssetNoticeManifests([{ rendererId: 'archive', assets: [runtime] }])
  assert.deepEqual(withRetainedAssetNoticeManifests(manifests), manifests)
  assert.equal(manifests[0].assets.length, 2, 'Publish a single complete collection, not duplicate individual source books')
  const declared = manifests[0].assets[1]
  assert.equal(declared.defaultPath, noticePath)
  assert.equal(resolveRetainedAssetNoticeSource(declared, manifests[0].assets, { sourceRoot }), canonicalNotice)
  assert.throws(() => resolveRetainedAssetNoticeSource(declared, [declared]), /no declared runtime/)
  const previous = Buffer.from('Existing retained evidence is preserved.\n')
  await writeFile(target, previous)
  for (const [filename, good] of [['libarchive.wasm', wasm], ['worker-bundle.js', worker]]) {
    const changed = Buffer.from(good)
    changed[changed.length - 1] ^= 1
    await writeFile(join(viewer, 'vendor/libarchive', filename), changed)
    await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /libarchive/)
    assert.deepEqual(await readFile(target), previous)
    await writeFile(join(viewer, 'vendor/libarchive', filename), good)
  }
  const manifestPath = join(sourceRoot, legalRelative, 'SOURCE-MANIFEST.json')
  const manifestBytes = await readFile(manifestPath)
  const manifest = JSON.parse(manifestBytes)
  for (const entry of manifest.originalMaterials) {
    const path = join(sourceRoot, legalRelative, entry.path)
    const bytes = await readFile(path)
    await rm(path)
    await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), { code: 'ENOENT' })
    assert.deepEqual(await readFile(target), previous)
    const changed = Buffer.from(bytes)
    changed[changed.length - 1] ^= 1
    await writeFile(path, changed)
    await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /original libarchive material/)
    assert.deepEqual(await readFile(target), previous)
    await rm(path)
    const alternative = join(root, 'linked-original.txt')
    await writeFile(alternative, bytes)
    await symlink(alternative, path)
    await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /regular|symlink/)
    assert.deepEqual(await readFile(target), previous)
    await rm(path)
    await writeFile(path, bytes)
  }
  await writeFile(manifestPath, Buffer.concat([manifestBytes, Buffer.from(' ')]))
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /libarchive source manifest/)
  await writeFile(manifestPath, manifestBytes)
  await writeFile(canonicalNotice, Buffer.concat([original, Buffer.from('altered')]))
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /libarchive collection/)
  assert.deepEqual(await readFile(target), previous)
  await writeFile(canonicalNotice, original)
  const packageJsonPath = join(fixtureInstalled, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath))
  await writeFile(packageJsonPath, JSON.stringify({ ...packageJson, version: '2.0.3' }))
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /libarchive.*version/)
  assert.deepEqual(await readFile(target), previous)
  await writeFile(packageJsonPath, JSON.stringify(packageJson))
  await rm(join(viewer, 'vendor/libarchive/worker-bundle.js'))
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /libarchive.*Worker/)
  assert.deepEqual(await readFile(target), previous)
})

test('CHM normal retained staging copies all original legal bytes and refuses stale or incomplete sources before writing', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-chm-grants-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceRoot = join(root, 'source')
  await seedMaterialSources(sourceRoot)
  const renderer = join(sourceRoot, 'packages/renderers/chm')
  const viewer = join(root, 'viewer')
  const canonical = join(renderer, 'dist/chm_wasm_bg.wasm')
  const target = join(viewer, chmRuntime.defaultPath)
  const wasm = await readFile(new URL('../renderers/chm/dist/chm_wasm_bg.wasm', import.meta.url))
  await mkdir(dirname(canonical), { recursive: true })
  await mkdir(dirname(target), { recursive: true })
  await writeFile(canonical, wasm)
  await writeFile(target, wasm)
  const originals = await Promise.all(chmLegalSources.map(async ([filename, source]) => ({ filename,
    source: join(renderer, source), target: join(dirname(target), filename), bytes: await readFile(join(renderer, source)) })))
  const written = await stageRetainedAssetNotices(viewer, { sourceRoot })
  for (const original of originals) {
    assert.ok(written.includes(original.target))
    assert.deepEqual(await readFile(original.target), original.bytes)
  }
  const manifests = [{ rendererId: 'chm', assets: [chmRuntime] }]
  const validation = { sourceDir: viewer, valid: true, assets: [{ ...chmRuntime,
    relativePath: chmRuntime.defaultPath, exists: true }], missingRequired: [], missingOptional: [] }
  assert.equal((await withRetainedAssetNoticeValidation(validation, manifests)).valid, true)
  for (const original of originals) {
    await rm(original.target)
    const missing = await withRetainedAssetNoticeValidation(validation, manifests)
    assert.equal(missing.valid, false)
    assert.deepEqual(missing.missingRequired.map(asset => asset.relativePath), ['vendor/chm/' + original.filename])
    await writeFile(original.target, original.bytes)
  }
  const previous = Buffer.from('Previously retained material remains unchanged.\n')
  for (const original of originals) await writeFile(original.target, previous)
  await writeFile(target, Buffer.from([0]))
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /Copied CHM WASM changed/)
  for (const original of originals) assert.deepEqual(await readFile(original.target), previous)
  await writeFile(target, wasm)
  for (const original of originals) {
    await rm(original.source)
    await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), { code: 'ENOENT' })
    for (const retained of originals) assert.deepEqual(await readFile(retained.target), previous)
    await writeFile(original.source, Buffer.alloc(0))
    await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /Missing complete retained legal material/)
    for (const retained of originals) assert.deepEqual(await readFile(retained.target), previous)
    await writeFile(original.source, original.bytes)
  }
  assert.deepEqual(await readFile(canonical), wasm)
})

test('PPTX retained staging pairs the normal Worker with its complete grant and rejects stale or missing inputs before writing', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-pptx-worker-grants-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceRoot = join(root, 'source')
  await seedMaterialSources(sourceRoot)
  const viewer = join(root, 'viewer')
  const source = join(sourceRoot, 'packages/renderers/pptx/dist/worker/pptx.worker.js')
  const grantSource = join(sourceRoot, 'packages/renderers/pptx/dist/worker.THIRD_PARTY_LICENSES.txt')
  const target = join(viewer, 'vendor/pptx/pptx.worker.js')
  const grantTarget = join(dirname(target), 'licenses/THIRD_PARTY_LICENSES.txt')
  const worker = await readFile(new URL('../renderers/pptx/dist/worker/pptx.worker.js', import.meta.url))
  const grant = await readFile(new URL('../renderers/pptx/dist/worker.THIRD_PARTY_LICENSES.txt', import.meta.url))
  assert.ok(grant.length > 0)
  await mkdir(dirname(source), { recursive: true })
  await mkdir(dirname(target), { recursive: true })
  await writeFile(source, worker)
  await writeFile(grantSource, grant)
  await writeFile(target, worker)
  await stageRetainedAssetNotices(viewer, { sourceRoot })
  assert.deepEqual(await readFile(grantTarget), grant)
  const manifests = withRetainedAssetNoticeManifests([{ rendererId: 'pptx', assets: [{
    id: 'pptx-worker', rendererId: 'pptx', kind: 'worker', target: 'public', required: true,
    defaultPath: 'vendor/pptx/pptx.worker.js' }] }])
  assert.ok(manifests[0].assets.some(asset => asset.defaultPath === 'vendor/pptx/licenses/' && asset.required))
  const previous = Buffer.from('Previously retained grant remains unchanged.\n')
  await writeFile(grantTarget, previous)
  await writeFile(target, 'Stale Worker')
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /differs from its original notice build/)
  assert.deepEqual(await readFile(grantTarget), previous)
  await stageBuiltRetainedWorkers(viewer, { sourceRoot })
  assert.deepEqual(await readFile(target), worker)
  await stageRetainedAssetNotices(viewer, { sourceRoot })
  assert.deepEqual(await readFile(grantTarget), grant)
  await writeFile(grantTarget, previous)
  await writeFile(target, 'Previous Worker remains unchanged')
  await writeFile(grantSource, Buffer.alloc(0))
  await assert.rejects(stageBuiltRetainedWorkers(viewer, { sourceRoot }), /Missing complete grants/)
  assert.equal(await readFile(target, 'utf8'), 'Previous Worker remains unchanged')
  await rm(grantSource)
  await assert.rejects(stageBuiltRetainedWorkers(viewer, { sourceRoot }), { code: 'ENOENT' })
  assert.equal(await readFile(target, 'utf8'), 'Previous Worker remains unchanged')
  await writeFile(target, worker)
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), { code: 'ENOENT' })
  assert.deepEqual(await readFile(grantTarget), previous)
})

test('PDF bootstrap assets retain the owner-prepared compatibility Worker and reject raw or stale copies', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-owned-pdf-worker-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceRoot = join(root, 'source')
  await seedMaterialSources(sourceRoot)
  const viewer = join(root, 'viewer')
  const source = join(sourceRoot, 'packages/renderers/pdf/dist/vendor/pdfjs/legacy/build/pdf.worker.mjs')
  const target = join(viewer, 'vendor/pdf/pdf.worker.mjs')
  await mkdir(dirname(source), { recursive: true })
  await mkdir(dirname(target), { recursive: true })
  const owned = 'var __pdfjs_webpack_require__ = {}; // prepared compatibility Worker\n'
  await writeFile(source, owned)
  await writeFile(target, 'var __webpack_require__ = {}; // unprepared upstream copy\n')
  await assert.rejects(stageRetainedAssetNotices(viewer, { sourceRoot }), /differs from its original notice build/)
  await stageBuiltRetainedWorkers(viewer, { sourceRoot })
  assert.equal(await readFile(target, 'utf8'), owned)
  await stageRetainedAssetNotices(viewer, { sourceRoot })
})

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
