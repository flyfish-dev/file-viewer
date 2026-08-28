import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const webViewerDir = resolve(sourceRoot, 'packages/components/web/viewer')
const copyAssetsViewerDir = resolve(sourceRoot, 'packages/tools/copy-assets/viewer')
const sourceDir = existsSync(resolve(webViewerDir, 'flyfish-viewer-assets.json'))
  ? webViewerDir
  : copyAssetsViewerDir
const targetDir = resolve(packageDir, 'viewer')
const manifestFilename = 'flyfish-viewer-assets.json'
const profileContent = await readFile(
  resolve(sourceRoot, 'packages/presets/standard/file-viewer.profile.json'),
  'utf8'
)
const profile = JSON.parse(profileContent)
const profileManifestSha256 = createHash('sha256').update(profileContent).digest('hex')
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
const rendererIds = new Set()
for (const packageName of profile.capabilityPackages) {
  if (!packageName.startsWith('@file-viewer/renderer-')) continue
  const packageDirName = packageName === '@file-viewer/renderer-pptx'
    ? 'presentation-pptx'
    : packageName.replace('@file-viewer/renderer-', '')
  const manifestPath = resolve(sourceRoot, 'packages/renderers', packageDirName, 'file-viewer.capability.json')
  if (!existsSync(manifestPath)) continue
  const capability = JSON.parse(await readFile(manifestPath, 'utf8'))
  capability.assets.rendererIds.forEach(id => rendererIds.add(id))
}
const sourceManifest = JSON.parse(await readFile(resolve(sourceDir, manifestFilename), 'utf8'))
const selected = sourceManifest.rendererAssetManifests.filter(item => rendererIds.has(item.rendererId))
const found = new Set(selected.map(item => item.rendererId))
const missing = [...rendererIds].filter(id => !found.has(id))
if (missing.length) throw new Error(`Standard asset manifests are missing renderer ids: ${missing.join(', ')}`)

await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })
for (const asset of selected.flatMap(item => item.assets)) {
  if (asset.target !== 'public' || !asset.defaultPath) continue
  const sourcePath = resolve(sourceDir, asset.defaultPath)
  if (!existsSync(sourcePath)) {
    if (asset.required) throw new Error(`Missing required standard asset: ${sourcePath}`)
    continue
  }
  const targetPath = resolve(targetDir, asset.defaultPath)
  await mkdir(dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath, { recursive: true, force: true })
  const info = await stat(targetPath)
  if (!info.isFile() && !info.isDirectory()) throw new Error(`Invalid standard asset: ${targetPath}`)
}
await writeFile(resolve(targetDir, manifestFilename), `${JSON.stringify({
  schemaVersion: 1,
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  profile: 'standard',
  profileManifestSha256,
  copyGroups: selected.map(item => item.rendererId).sort(),
  rendererAssetManifests: selected,
}, null, 2)}\n`, 'utf8')
await writeFile(resolve(targetDir, 'flyfish-viewer-manifest.json'), `${JSON.stringify({
  name: '@file-viewer/assets-standard',
  version: packageJson.version,
  kind: 'viewer-assets-standard',
  assets: manifestFilename,
}, null, 2)}\n`, 'utf8')
console.log(`[file-viewer-assets-standard] staged ${selected.length} renderer asset groups`)
