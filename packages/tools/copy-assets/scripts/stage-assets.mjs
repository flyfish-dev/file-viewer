import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stageInstalledPptRuntime } from '../../../components/web-full/scripts/stage-ppt-runtime.mjs'
import { stagePreparedDesignRuntime } from '../../../build-support/stage-design-runtime.mjs'
import { stageInstalledCadRuntime } from '../../../build-support/stage-cad-runtime.mjs'
import { sanitizeOfflineViewerAssetTree } from '../../../components/web-full/scripts/offline-asset-sanitize.mjs'
import { stageBuiltRetainedWorkers, stageRetainedAssetNotices, withRetainedAssetNoticeManifests } from '../../../build-support/retained-asset-notices.mjs'
import { stableAssetManifest } from '../../../build-support/stable-asset-manifest.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageDir = resolve(scriptDir, '..')
const workspaceRoot = resolve(packageDir, '../../..')
const packageManifest = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
const componentViewerDir = resolve(workspaceRoot, 'packages/components/web/viewer')
const demoDistDir = resolve(workspaceRoot, 'apps/viewer-demo/dist')
const demoPublicDir = resolve(workspaceRoot, 'apps/viewer-demo/public')
const targetDir = resolve(packageDir, 'viewer')
const manifestFilename = 'flyfish-viewer-assets.json'
const previousManifestPath = resolve(targetDir, manifestFilename)
const previousManifest = existsSync(previousManifestPath)
  ? JSON.parse(await readFile(previousManifestPath, 'utf8')) : null

const sourceDir = process.env.FILE_VIEWER_ASSET_SOURCE_DIR
  ? resolve(process.env.FILE_VIEWER_ASSET_SOURCE_DIR)
  : existsSync(resolve(componentViewerDir, manifestFilename))
    ? componentViewerDir
    : existsSync(resolve(demoDistDir, 'index.html'))
      ? demoDistDir
      : demoPublicDir

const manifestPath = resolve(sourceDir, manifestFilename)
let rendererAssetManifests
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  rendererAssetManifests = manifest.rendererAssetManifests
} else {
  const coreAssetsEntry = resolve(workspaceRoot, 'packages/core/dist/assets.js')
  if (!existsSync(coreAssetsEntry)) {
    throw new Error(
      `Missing ${manifestFilename} in ${sourceDir} and ${coreAssetsEntry}. Build @file-viewer/core first.`
    )
  }
  const coreAssets = await import(pathToFileURL(coreAssetsEntry).href)
  rendererAssetManifests = coreAssets.listFileViewerRendererAssetManifests()
}

const declaredAssets = rendererAssetManifests
  .flatMap((renderer) => renderer.assets)
  .filter((asset) => asset.target === 'public' && asset.defaultPath)
const relativePaths = new Set(declaredAssets.map((asset) => asset.defaultPath))

await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })
await stageInstalledCadRuntime(targetDir)

const validationAssets = []
for (const asset of declaredAssets) {
  const relativePath = asset.defaultPath
  const sourcePath = resolve(
    asset.rendererId === 'cad' && !asset.id.startsWith('cad-compat-') ? targetDir : sourceDir,
    relativePath
  )
  if (!existsSync(sourcePath)) {
    validationAssets.push({
      id: asset.id,
      rendererId: asset.rendererId,
      kind: asset.kind,
      target: asset.target,
      required: asset.required,
      relativePath,
      exists: false,
      description: asset.description
    })
    if (!asset.required) {
      continue
    }
    throw new Error(`Missing staged viewer asset: ${sourcePath}`)
  }
  const targetPath = resolve(targetDir, relativePath)
  await mkdir(dirname(targetPath), { recursive: true })
  if (sourcePath !== targetPath) {
    await cp(sourcePath, targetPath, { recursive: true, force: true })
  }
  const pathStat = await stat(targetPath)
  const exists =
    asset.kind === 'directory' || asset.kind === 'wasm-directory'
      ? pathStat.isDirectory()
      : pathStat.isFile()
  validationAssets.push({
    id: asset.id,
    rendererId: asset.rendererId,
    kind: asset.kind,
    target: asset.target,
    required: asset.required,
    relativePath,
    exists,
    description: asset.description
  })
}

await stageBuiltRetainedWorkers(targetDir)
await stageRetainedAssetNotices(targetDir)
rendererAssetManifests = withRetainedAssetNoticeManifests(rendererAssetManifests)
await stageInstalledPptRuntime(resolve(targetDir, 'vendor/ppt'))
await stagePreparedDesignRuntime(targetDir)
await sanitizeOfflineViewerAssetTree(targetDir)
const missingRequired = validationAssets.filter((asset) => asset.required && !asset.exists)
const missingOptional = validationAssets.filter((asset) => !asset.required && !asset.exists)
const generatedAt = new Date().toISOString()
const currentManifest = {
  schemaVersion: 1,
  generatedAt,
  rendererAssetManifests,
  validation: {
    valid: missingRequired.length === 0,
    checkedAt: generatedAt,
    assets: validationAssets,
    missingRequired,
    missingOptional
  }
}
const publicationManifest = stableAssetManifest(previousManifest, currentManifest)
const privateEvidenceDir = resolve(packageDir, '.build')
await mkdir(privateEvidenceDir, { recursive: true })
await writeFile(resolve(privateEvidenceDir, 'staged-asset-validation.json'), JSON.stringify({
  ...currentManifest,
  reusedPublicTimestamps: publicationManifest === previousManifest
}, null, 2) + '\n')
await writeFile(
  resolve(targetDir, manifestFilename),
  JSON.stringify(publicationManifest, null, 2) + '\n',
  'utf8'
)
await writeFile(
  resolve(targetDir, 'flyfish-viewer-manifest.json'),
  `${JSON.stringify(
    {
      name: packageManifest.name,
      version: packageManifest.version,
      kind: 'viewer-assets',
      assets: manifestFilename
    },
    null,
    2
  )}\n`,
  'utf8'
)

console.log(`[file-viewer-copy-assets] staged ${relativePaths.size} asset roots from ${sourceDir}`)
