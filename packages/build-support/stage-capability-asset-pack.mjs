import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageDirFlag = process.argv.indexOf('--package-dir')
const packageDirInput = packageDirFlag >= 0 ? process.argv[packageDirFlag + 1] : undefined
if (!packageDirInput || packageDirInput.startsWith('/') || packageDirInput.includes('..')) {
  throw new Error('stage-capability-asset-pack requires a repository-relative --package-dir')
}
const packageDir = resolve(sourceRoot, packageDirInput)
if (!packageDir.startsWith(`${sourceRoot}/packages/tools/assets-`)) {
  throw new Error(`Refusing to stage an unregistered asset package path: ${packageDirInput}`)
}
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
const config = JSON.parse(await readFile(resolve(packageDir, 'file-viewer.asset-pack.json'), 'utf8'))
const webViewerDir = resolve(sourceRoot, 'packages/components/web/viewer')
const copyAssetsViewerDir = resolve(sourceRoot, 'packages/tools/copy-assets/viewer')
const sourceDir = existsSync(resolve(webViewerDir, 'flyfish-viewer-assets.json'))
  ? webViewerDir
  : copyAssetsViewerDir
const targetDir = resolve(packageDir, 'viewer')
const sourceManifest = JSON.parse(await readFile(resolve(sourceDir, 'flyfish-viewer-assets.json'), 'utf8'))
const groups = new Set(config.copyGroups)
const selected = sourceManifest.rendererAssetManifests.filter(entry => groups.has(entry.rendererId))
const missing = [...groups].filter(group => !selected.some(entry => entry.rendererId === group))
if (missing.length) throw new Error(`${packageJson.name} references missing asset groups: ${missing.join(', ')}`)

await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })
for (const asset of selected.flatMap(entry => entry.assets)) {
  if (asset.target !== 'public' || !asset.defaultPath) continue
  const sourcePath = resolve(sourceDir, asset.defaultPath)
  if (!existsSync(sourcePath)) {
    if (asset.required) throw new Error(`Missing required capability asset: ${sourcePath}`)
    continue
  }
  const targetPath = resolve(targetDir, asset.defaultPath)
  await mkdir(dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath, { recursive: true, force: true })
  const info = await stat(targetPath)
  if (!info.isFile() && !info.isDirectory()) throw new Error(`Invalid capability asset: ${targetPath}`)
}
await writeFile(resolve(targetDir, 'file-viewer-asset-pack.json'), `${JSON.stringify({
  schemaVersion: 1,
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  copyGroups: [...groups].sort(),
  receiptFilename: config.receiptFilename,
  rendererAssetManifests: selected,
}, null, 2)}\n`, 'utf8')
console.log(`[capability-assets] staged ${selected.length} group(s) for ${packageJson.name}`)
