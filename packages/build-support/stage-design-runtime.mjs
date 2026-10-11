import assert from 'node:assert/strict'
import { copyFile, lstat, mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const workspaceRoot = resolve(import.meta.dirname, '../..')
const ownerManifestPath = resolve(workspaceRoot, 'packages/renderers/design/package.json')
const ownerRequire = createRequire(ownerManifestPath)

/** Stage the declared design runtime from its prepared package exports. */
export async function stagePreparedDesignRuntime(targetRoot) {
  const owner = JSON.parse(await readFile(ownerManifestPath, 'utf8'))
  const introspectEntry = ownerRequire.resolve('@paged-media/introspect-wasm')
  const introspect = JSON.parse(
    await readFile(resolve(dirname(introspectEntry), 'package.json'), 'utf8')
  )
  assert.equal(introspect.version, owner.dependencies['@paged-media/introspect-wasm'])
  const coreAssets = await import(
    pathToFileURL(ownerRequire.resolve('@file-viewer/core/assets')).href
  )
  const assets = new Map()
  for (const manifest of coreAssets.listFileViewerRendererAssetManifests()) {
    for (const asset of manifest.assets) {
      if (
        !asset.packagePath?.startsWith('@file-viewer/renderer-design/') &&
        !asset.packagePath?.startsWith('@paged-media/introspect-wasm/')
      )
        continue
      assert.equal(asset.target, 'public')
      assert.ok(asset.defaultPath.startsWith('vendor/design/'))
      const source = ownerRequire.resolve(asset.packagePath)
      assert.ok((await lstat(source)).isFile(), `Design runtime is not a prepared file: ${source}`)
      const previous = assets.get(asset.defaultPath)
      if (previous) assert.equal(previous, source)
      assets.set(asset.defaultPath, source)
    }
  }
  assert.ok(assets.size > 0, 'No prepared design runtime assets were declared')
  for (const [relativePath, source] of assets) {
    const target = resolve(targetRoot, relativePath)
    await mkdir(dirname(target), { recursive: true })
    const targetInfo = await lstat(target).catch((error) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    assert.ok(!targetInfo || targetInfo.isFile(), `Unsafe design runtime destination: ${target}`)
    await copyFile(source, target)
    assert.ok((await readFile(source)).equals(await readFile(target)))
  }
  console.log(`[design-runtime] staged ${assets.size} declared files from prepared package exports`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Pass the asset output directory')
  await stagePreparedDesignRuntime(resolve(process.argv[2]))
}
