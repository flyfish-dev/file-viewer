import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import * as webNode from '../../web/dist/node.js'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestFilename = 'flyfish-viewer-assets.json'
const sha256 = data => createHash('sha256').update(data).digest('hex')

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'web-full-asset-manifest-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const targetPackage = join(root, 'packages/components/web-full')
  const source = join(root, 'apps/viewer-demo/public')
  const dist = join(targetPackage, 'dist')
  await mkdir(join(targetPackage, 'src'), { recursive: true })
  await writeFile(join(targetPackage, 'src/global.ts'), 'export {}\n')
  await cp(join(packageDir, 'package.json'), join(targetPackage, 'package.json'))
  await cp(join(packageDir, 'scripts'), join(targetPackage, 'scripts'), {
    recursive: true,
    filter: path => !path.endsWith('copy-assets.mjs')
  })
  await mkdir(join(root, 'packages/components/web/scripts'), { recursive: true })
  await cp(
    join(packageDir, '../web/scripts/amd-entry.mjs'),
    join(root, 'packages/components/web/scripts/amd-entry.mjs')
  )
  await mkdir(join(root, 'packages/components/web/dist'), { recursive: true })
  await writeFile(
    join(root, 'packages/components/web/dist/node.js'),
    `export * from ${JSON.stringify(new URL('../../web/dist/node.js', import.meta.url).href)}\n`
  )
  await writeFile(join(root, 'package.json'), '{"type":"module"}\n')

  // Exercise the real asset-copy, sanitation, PPT-integrity and manifest stages.
  // Bundling is deliberately stubbed so this regression needs no browser or
  // hundreds of megabytes of runtime assets; full build/pack checks run separately.
  const vite = join(targetPackage, 'node_modules/vite')
  await mkdir(vite, { recursive: true })
  await writeFile(join(vite, 'package.json'), '{"type":"module","exports":"./index.js"}\n')
  await writeFile(join(vite, 'index.js'), `
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
export async function build(options) {
  const outDir = resolve(options.build.outDir || 'dist')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, options.build.lib.fileName()), '/* bundle fixture */\\n')
}
`)

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
  const ppt = join(source, 'vendor/ppt')
  const wasm = Buffer.from('unique wasm fixture bytes')
  const font = Buffer.from('unique font fixture bytes, longer than the wasm')
  await writeFile(join(ppt, 'ppt-native.wasm'), wasm)
  await writeFile(join(ppt, 'ppt-font-cjk.otf'), font)
  await writeFile(join(ppt, 'manifest.json'), JSON.stringify({
    packageName: '@file-viewer/ppt', packageVersion: '0.3.4',
    wasmFile: 'ppt-native.wasm', wasmBytes: wasm.length, wasmSha256: sha256(wasm),
    workerFile: 'worker.mjs',
    fontPack: { file: 'ppt-font-cjk.otf', bytes: font.length, sha256: sha256(font) }
  }))
  await writeFile(join(ppt, 'package.json'), '{"name":"@file-viewer/ppt","version":"0.3.4"}')
  await writeFile(join(ppt, 'index.mjs'), '// FV-PPT-PUBLIC-WATERMARKED-V2 createPptViewer ppt-native.wasm ppt-font-cjk.otf worker.mjs\n')
  await writeFile(join(ppt, 'worker.mjs'), "import './frame-cache.mjs'; // from './frame-cache.mjs'\n")
  await writeFile(join(ppt, 'frame-cache.mjs'), [
    'export function normalizeFrameCacheLimits() {}',
    'export function createFrameCacheKey() {}',
    'export function createFrameCache() {}'
  ].join('\n'))
  return {
    root, source, dist, targetPackage,
    run: () => {
      const env = { ...process.env }
      delete env.NODE_PATH
      delete env.NODE_OPTIONS
      return spawnSync(process.execPath, ['scripts/build-iife.mjs'], {
        cwd: targetPackage, env, encoding: 'utf8'
      })
    }
  }
}

test('bootstrap without a manifest produces valid, portable metadata for the final asset tree', async t => {
  const f = await fixture(t)
  const textAsset = 'vendor/sanitization-fixture.js'
  const originalText = "const fallback = 'https://cdn.jsdelivr.net/example'\n"
  await writeFile(join(f.source, textAsset), originalText)
  const built = f.run()
  assert.equal(built.status, 0, built.stderr)
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
  assert.deepEqual(
    await readFile(join(f.dist, 'vendor/ppt/ppt-native.wasm')),
    await readFile(join(f.source, 'vendor/ppt/ppt-native.wasm'))
  )
  assert.equal(
    await readFile(join(f.dist, textAsset), 'utf8'),
    "const fallback = 'file-viewer-offline-cdn/example'\n"
  )
  assert.equal(await readFile(join(f.source, textAsset), 'utf8'), originalText)
})

test('source metadata is regenerated from the packaged files', async t => {
  const f = await fixture(t)
  await writeFile(join(f.source, manifestFilename), JSON.stringify({
    schemaVersion: 1, generatedAt: 'stale', rendererAssetManifests: [],
    validation: { valid: false, assets: [], missingRequired: ['stale'] }
  }))
  const built = f.run()
  assert.equal(built.status, 0, built.stderr)
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
  const built = f.run()
  assert.notEqual(built.status, 0)
  assert.ok(built.stderr.includes(asset.relativePath), built.stderr)
})

test('stale dist assets cannot hide a source tree missing required WASM', async t => {
  const f = await fixture(t)
  await mkdir(f.dist, { recursive: true })
  await cp(join(f.source, 'wasm'), join(f.dist, 'wasm'), { recursive: true })
  await rm(join(f.source, 'wasm'), { recursive: true })
  const built = f.run()
  assert.notEqual(built.status, 0)
  assert.match(built.stderr, /missing required resources:.*wasm\//)
})

test('a build without a viewer asset source fails explicitly', async t => {
  const f = await fixture(t)
  await rm(f.source, { recursive: true })
  const built = f.run()
  assert.notEqual(built.status, 0)
  assert.match(built.stderr, /Missing viewer asset source/)
})
