import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import * as webNode from '../../web/dist/node.js'
import { assertFullAssetDependencies } from '../scripts/full-asset-dependencies.mjs'
import { PPT_RUNTIME_VERSION } from '../scripts/ppt-runtime-integrity.mjs'
import { stagePptRuntimeFrom } from '../scripts/stage-ppt-runtime.mjs'
import { fullAssetStagers, stageFullViewerAssets } from '../scripts/stage-full-assets.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestFilename = 'flyfish-viewer-assets.json'
const sha256 = data => createHash('sha256').update(data).digest('hex')
const quiet = async run => {
  const log = console.log
  console.log = () => {}
  try { return await run() } finally { console.log = log }
}

// Every path the fixture touches lives inside one fresh temp directory made of
// copied or generated files; nothing is linked back into the workspace, so the
// recursive cleanup cannot reach repository files.
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'web-full-asset-manifest-'))
  t.after(async () => {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep), 'Fixture root must stay in the temp directory')
    assert.ok(!(await lstat(root)).isSymbolicLink())
    await rm(root, { recursive: true, force: true })
  })
  const targetPackage = join(root, 'web-full')
  const source = join(root, 'viewer-assets')
  const dist = join(targetPackage, 'dist')
  const installedPpt = join(root, 'installed/@file-viewer/ppt')
  await mkdir(targetPackage, { recursive: true })
  await cp(join(packageDir, 'package.json'), join(targetPackage, 'package.json'))
  const packageManifest = JSON.parse(await readFile(join(targetPackage, 'package.json'), 'utf8'))
  for (const name of ['@file-viewer/assets-cad', '@file-viewer/assets-drawing']) {
    const directory = join(targetPackage, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name, version: packageManifest.version, exports: { './package.json': './package.json' } }))
  }

  // Demo/source asset tree: one placeholder per declared asset.
  const validation = await webNode.validateViewerAssets({ sourceDir: source })
  for (const asset of validation.assets) {
    const path = join(source, asset.relativePath)
    if (asset.kind === 'directory' || asset.kind === 'wasm-directory') {
      await mkdir(path, { recursive: true })
    } else {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, `asset:${asset.relativePath}\n`)
    }
  }
  // A stale demo copy of the PPT runtime that must be replaced by the installed package.
  await mkdir(join(source, 'vendor/ppt'), { recursive: true })
  await writeFile(join(source, 'vendor/ppt/ppt-native.wasm'), 'stale demo wasm copy')

  // Installed official @file-viewer/ppt package (fixture bytes, real integrity rules).
  const wasm = Buffer.from('unique wasm fixture bytes')
  const font = Buffer.from('unique font fixture bytes, longer than the wasm')
  const writePpt = async version => {
    await mkdir(installedPpt, { recursive: true })
    await writeFile(join(installedPpt, 'ppt-native.wasm'), wasm)
    await writeFile(join(installedPpt, 'ppt-font-cjk.otf'), font)
    await writeFile(join(installedPpt, 'manifest.json'), JSON.stringify({
      packageName: '@file-viewer/ppt', packageVersion: version,
      wasmFile: 'ppt-native.wasm', wasmBytes: wasm.length, wasmSha256: sha256(wasm),
      workerFile: 'worker.mjs',
      fontPack: { file: 'ppt-font-cjk.otf', bytes: font.length, sha256: sha256(font) }
    }))
    await writeFile(join(installedPpt, 'package.json'), JSON.stringify({ name: '@file-viewer/ppt', version }))
    await writeFile(join(installedPpt, 'index.mjs'), '// FV-PPT-PUBLIC-WATERMARKED-V2 createPptViewer ppt-native.wasm ppt-font-cjk.otf worker.mjs\n')
    await writeFile(join(installedPpt, 'worker.mjs'), "import './frame-cache.mjs'; // from './frame-cache.mjs'\n")
    await writeFile(join(installedPpt, 'frame-cache.mjs'), [
      'export function normalizeFrameCacheLimits() {}',
      'export function createFrameCacheKey() {}',
      'export function createFrameCache() {}'
    ].join('\n'))
    await writeFile(join(installedPpt, 'LICENSE'), 'ppt license fixture\n')
    await writeFile(join(installedPpt, 'NOTICE'), 'ppt notice fixture\n')
  }
  await writePpt(PPT_RUNTIME_VERSION)

  // The presentation renderer bundle that must not embed the PPT runtime.
  await mkdir(join(dist, 'renderers'), { recursive: true })
  await writeFile(join(dist, 'renderers/presentation.iife.js'), '/* presentation bundle fixture */\n')

  const calls = []
  const noticeManifest = { rendererId: 'retained-notices-fixture', assets: [] }
  const stagers = {
    ...fullAssetStagers,
    // Real copy + integrity verification, from the fixture package instead of node_modules.
    stagePptRuntime: async target => { calls.push(['ppt', target]); return stagePptRuntimeFrom(installedPpt, target) },
    stageDesignRuntime: async out => {
      calls.push(['design', out])
      await mkdir(join(out, 'vendor/design'), { recursive: true })
      await writeFile(join(out, 'vendor/design/runtime-fixture.txt'), 'design runtime fixture\n')
    },
    stageCadRuntime: async out => {
      calls.push(['cad', out])
      await mkdir(join(out, 'wasm/cad'), { recursive: true })
      await writeFile(join(out, 'wasm/cad/runtime-fixture.txt'), 'cad runtime fixture\n')
    },
    stageBuiltWorkers: async out => { calls.push(['workers', out]) },
    stageRetainedNotices: async (out, options) => {
      calls.push(['notices', out, options])
      await writeFile(join(out, 'THIRD_PARTY_LICENSES.assets.json'), '{"fixture":true}\n')
    },
    withNoticeManifests: manifests => { calls.push(['notice-manifests']); return [...manifests, noticeManifest] },
    withNoticeValidation: async (validation, manifests) => {
      calls.push(['notice-validation', manifests.includes(noticeManifest)])
      return validation
    }
  }
  return {
    root, source, dist, targetPackage, installedPpt, writePpt, calls, stagers,
    stage: () => quiet(() => stageFullViewerAssets({
      packageDir: targetPackage, outDir: dist, packageManifest, webNode,
      assetSourceCandidates: [source], stagers
    }))
  }
}

test('a stale installed PPT package cannot enter the Full asset tree', async t => {
  const f = await fixture(t)
  await f.writePpt('0.3.4')
  await assert.rejects(f.stage(), new RegExp(`version mismatch: manifest=0\\.3\\.4, package=0\\.3\\.4, expected=${PPT_RUNTIME_VERSION.replaceAll('.', '\\.')}`))
  assert.deepEqual(f.calls.map(call => call[0]), ['ppt'])
})

test('bootstrap without a manifest produces valid, portable metadata for the final asset tree', async t => {
  const f = await fixture(t)
  const textAsset = 'vendor/sanitization-fixture.js'
  const originalText = "const fallback = 'https://cdn.jsdelivr.net/example'\n"
  await writeFile(join(f.source, textAsset), originalText)
  await f.stage()
  const manifestText = await readFile(join(f.dist, manifestFilename), 'utf8')
  const manifest = JSON.parse(manifestText)
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.validation.valid, true)
  assert.deepEqual(manifest.validation.missingRequired, [])
  assert.ok(manifest.rendererAssetManifests.length > 0)
  assert.equal(manifestText.includes(f.root), false)
  const current = await webNode.validateViewerAssets({ sourceDir: f.dist })
  assert.deepEqual(manifest.validation.assets, webNode.toViewerAssetManifestValidation(current).assets)
  const packageManifest = JSON.parse(await readFile(join(f.dist, 'flyfish-viewer-manifest.json'), 'utf8'))
  assert.equal(packageManifest.assets, manifestFilename)
  // The installed runtime replaced the stale demo copy byte-for-byte.
  for (const file of ['ppt-native.wasm', 'ppt-font-cjk.otf', 'manifest.json', 'LICENSE', 'NOTICE']) {
    assert.deepEqual(await readFile(join(f.dist, 'vendor/ppt', file)), await readFile(join(f.installedPpt, file)))
  }
  assert.equal(
    await readFile(join(f.dist, textAsset), 'utf8'),
    "const fallback = 'file-viewer-offline-cdn/example'\n"
  )
  assert.equal(await readFile(join(f.source, textAsset), 'utf8'), originalText)
  assert.equal(await readFile(join(f.dist, '.npmignore'), 'utf8'), '/vendor/drawio/\n/wasm/cad/\n')
})

test('runtime and legal stagers run in order and their notices reach the manifest', async t => {
  const f = await fixture(t)
  await f.stage()
  assert.deepEqual(f.calls.map(call => call[0]), ['ppt', 'design', 'cad', 'workers', 'notices', 'notice-manifests', 'notice-validation'])
  assert.equal(f.calls[0][1], join(f.dist, 'vendor/ppt'))
  const [, noticeRoot, noticeOptions] = f.calls[4]
  assert.equal(noticeRoot, f.dist)
  const version = JSON.parse(await readFile(join(f.targetPackage, 'package.json'), 'utf8')).version
  assert.deepEqual(noticeOptions.externalAssetOwners.map(owner => [owner.prefix, owner.packageName, owner.version]), [
    ['vendor/drawio/', '@file-viewer/assets-drawing', version],
    ['wasm/cad/', '@file-viewer/assets-cad', version]
  ])
  assert.equal(f.calls[6][1], true, 'Notice validation must see the notice-extended manifests')
  assert.equal(await readFile(join(f.dist, 'THIRD_PARTY_LICENSES.assets.json'), 'utf8'), '{"fixture":true}\n')
  assert.equal(await readFile(join(f.dist, 'wasm/cad/runtime-fixture.txt'), 'utf8'), 'cad runtime fixture\n')
  assert.equal(await readFile(join(f.dist, 'vendor/design/runtime-fixture.txt'), 'utf8'), 'design runtime fixture\n')
  const manifest = JSON.parse(await readFile(join(f.dist, manifestFilename), 'utf8'))
  assert.ok(manifest.rendererAssetManifests.some(item => item.rendererId === 'retained-notices-fixture'))
  const evidence = JSON.parse(await readFile(join(f.targetPackage, '.build/full-assets-validation.json'), 'utf8'))
  assert.equal(evidence.validation.valid, true)
})

test('source metadata is regenerated from the packaged files', async t => {
  const f = await fixture(t)
  await writeFile(join(f.source, manifestFilename), JSON.stringify({
    schemaVersion: 1, generatedAt: 'stale', rendererAssetManifests: [],
    validation: { valid: false, assets: [], missingRequired: ['stale'] }
  }))
  await f.stage()
  const manifest = JSON.parse(await readFile(join(f.dist, manifestFilename), 'utf8'))
  assert.equal(manifest.validation.valid, true)
  assert.ok(manifest.validation.assets.length > 0)
  assert.notEqual(manifest.generatedAt, 'stale')
})

test('a missing required non-PPT asset fails the build with its path', async t => {
  const f = await fixture(t)
  const asset = (await webNode.validateViewerAssets({ sourceDir: f.source })).assets.find(
    item => item.required && item.rendererId === 'pdf' && item.kind === 'worker'
  )
  assert.ok(asset)
  await rm(join(f.source, asset.relativePath))
  await assert.rejects(f.stage(), error => error.message.includes(asset.relativePath))
})

test('stale dist assets cannot hide a source tree missing required WASM', async t => {
  const f = await fixture(t)
  await cp(join(f.source, 'wasm'), join(f.dist, 'wasm'), { recursive: true })
  await rm(join(f.source, 'wasm'), { recursive: true })
  await assert.rejects(f.stage(), /missing required resources:.*wasm\//)
})

test('a build without a viewer asset source fails explicitly', async t => {
  const f = await fixture(t)
  await rm(f.source, { recursive: true })
  await assert.rejects(f.stage(), /Missing viewer asset source/)
  assert.deepEqual(f.calls, [])
})

test('the build uses the production stagers', () => {
  assert.equal(Object.isFrozen(fullAssetStagers), true)
  assert.deepEqual(Object.keys(fullAssetStagers).sort(), [
    'assertAssetDependencies', 'stageBuiltWorkers', 'stageCadRuntime', 'stageDesignRuntime', 'stagePptRuntime',
    'stageRetainedNotices', 'withNoticeManifests', 'withNoticeValidation'
  ])
})

test('exact installed asset versions work in workspace, exported and local tarball builds', async t => {
  const f = await fixture(t)
  const packageJsonPath = join(f.targetPackage, 'package.json')
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  for (const spec of [`workspace:${manifest.version}`, manifest.version, 'file:./candidate.tgz']) {
    const candidate = { ...manifest, dependencies: { ...manifest.dependencies, '@file-viewer/assets-cad': spec, '@file-viewer/assets-drawing': spec } }
    await assertFullAssetDependencies(candidate, packageJsonPath)
  }
})

test('an open asset range or a mismatched installed tarball cannot weaken version ownership', async t => {
  const f = await fixture(t)
  const packageJsonPath = join(f.targetPackage, 'package.json')
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  await assert.rejects(assertFullAssetDependencies({ ...manifest, dependencies: { ...manifest.dependencies, '@file-viewer/assets-cad': `^${manifest.version}` } }, packageJsonPath), /must match the full package version/)
  manifest.dependencies['@file-viewer/assets-cad'] = 'file:./mismatched.tgz'
  await writeFile(join(f.targetPackage, 'node_modules/@file-viewer/assets-cad/package.json'), JSON.stringify({ name: '@file-viewer/assets-cad', version: '0.0.0', exports: { './package.json': './package.json' } }))
  await assert.rejects(assertFullAssetDependencies(manifest, packageJsonPath), /assets-cad@0.0.0 must match/)
})
