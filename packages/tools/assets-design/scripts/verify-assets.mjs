#!/usr/bin/env node
// The design asset pack is the only thing that makes an offline Adobe preview work in an
// installed app: 10 specialist Workers plus two WebAssembly modules and their licence texts.
// Nothing else proves a `stage-assets` run actually produced them, so this gate is the parity
// check for @file-viewer/assets-chm/scripts/verify-assets.mjs and runs in the public CI too.
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const designRoot = 'vendor/design'
const wasmMagic = [0, 97, 115, 109]

const packageJson = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
const declared = JSON.parse(
  await readFile(join(packageDir, 'file-viewer.asset-pack.json'), 'utf8')
)
const packPath = join(packageDir, 'viewer', 'file-viewer-asset-pack.json')
const pack = JSON.parse(await readFile(packPath, 'utf8'))

// A staged payload that survived a version bump is a stale payload.
assert.equal(
  pack.packageName,
  packageJson.name,
  `${packPath} describes ${pack.packageName}, expected ${packageJson.name}`
)
assert.equal(
  pack.packageVersion,
  packageJson.version,
  `${packPath} was staged for ${pack.packageVersion} but the package is now ` +
    `${packageJson.version}; run pnpm stage-assets before publishing.`
)
assert.deepEqual(
  pack.copyGroups,
  declared.copyGroups,
  `${packPath} copy groups drifted from file-viewer.asset-pack.json`
)
assert.equal(
  pack.copyGroups.length,
  10,
  `the design pack should cover ten specialist renderers, found ${pack.copyGroups.length}`
)
assert.deepEqual(
  pack.rendererAssetManifests.map((entry) => entry.rendererId).sort(),
  pack.copyGroups.slice().sort(),
  'every design copy group has to contribute a renderer asset manifest'
)

const assets = pack.rendererAssetManifests.flatMap((entry) =>
  entry.assets.map((asset) => ({ ...asset, rendererId: entry.rendererId }))
)
assert(assets.length > 0, 'the design pack declares no assets')

const seen = new Set()
const counts = { worker: 0, wasm: 0, license: 0 }
for (const asset of assets) {
  assert(asset.required !== false, `${asset.id} must stay required in the design pack`)
  const file = join(packageDir, 'viewer', asset.defaultPath)
  const info = await stat(file).catch(() => null)
  assert(info && info.isFile() && info.size > 0, `${asset.defaultPath} is missing from the pack payload (asset ${asset.id})`)
  const bytes = await readFile(file)
  if (asset.kind === 'wasm') {
    assert.deepEqual(
      [...bytes.subarray(0, wasmMagic.length)],
      wasmMagic,
      `${asset.defaultPath} is not WebAssembly`
    )
  } else {
    assert(
      bytes.toString('utf8').trim().length > 0,
      `${asset.defaultPath} is empty after trimming`
    )
  }
  if (asset.kind === 'license') {
    assert(
      bytes.toString('utf8').trim().length > 60,
      `${asset.defaultPath} is too short to be a licence text`
    )
  }
  counts[asset.kind] = (counts[asset.kind] ?? 0) + 1
  seen.add(relative(packageDir, file))
}
assert.equal(counts.worker, 10, `expected ten design Workers in the pack, counted ${counts.worker}`)
assert.equal(counts.wasm, 2, `expected two design WebAssembly modules in the pack, counted ${counts.wasm}`)

// Undeclared bytes in viewer/ ride along in the npm tarball, so they have to be intentional.
const payloadRoot = join(packageDir, 'viewer', designRoot)
for (const entry of await readdir(payloadRoot)) {
  const rel = relative(packageDir, join(payloadRoot, entry))
  assert(
    seen.has(rel),
    `${designRoot}/${entry} is shipped by the design pack but no renderer asset manifest declares it`
  )
}
assert(
  assets.some((asset) => asset.defaultPath === `${designRoot}/THIRD_PARTY_NOTICES.md`),
  `${designRoot}/THIRD_PARTY_NOTICES.md has to stay declared in the design pack`
)
assert(
  (await stat(join(packageDir, 'LICENSE'))).size > 0,
  'assets-design is missing its own LICENSE'
)
for (const entry of ['bin', 'viewer', 'file-viewer.asset-pack.json', 'README.md', 'README.en.md', 'LICENSE']) {
  assert(
    packageJson.files.includes(entry),
    `${entry} is missing from the assets-design npm files allowlist`
  )
}
console.log(
  `[assets-design] ${assets.length} declared assets verified: ${counts.worker} Workers, ` +
    `${counts.wasm} WebAssembly modules, ${counts.license} licence texts, no undeclared payload`
)
