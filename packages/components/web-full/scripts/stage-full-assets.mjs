import { existsSync } from 'node:fs'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { sanitizeOfflineViewerAssetTree } from './offline-asset-sanitize.mjs'
import { verifyPptRuntimeDistributionRoot } from './ppt-runtime-integrity.mjs'
import { stageInstalledPptRuntime } from './stage-ppt-runtime.mjs'
import { assertFullAssetDependencies } from './full-asset-dependencies.mjs'
import { stagePreparedDesignRuntime } from '../../../build-support/stage-design-runtime.mjs'
import { stageInstalledCadRuntime } from '../../../build-support/stage-cad-runtime.mjs'
import { stageBuiltRetainedWorkers, stageRetainedAssetNotices, withRetainedAssetNoticeManifests, withRetainedAssetNoticeValidation } from '../../../build-support/retained-asset-notices.mjs'
import { stableAssetManifest } from '../../../build-support/stable-asset-manifest.mjs'

// Production stagers. build-iife.mjs always uses these; tests inject stubs for the
// runtime and legal stagers so the asset pipeline can be exercised in a temp tree.
export const fullAssetStagers = Object.freeze({
  stagePptRuntime: stageInstalledPptRuntime,
  stageDesignRuntime: stagePreparedDesignRuntime,
  stageCadRuntime: stageInstalledCadRuntime,
  stageBuiltWorkers: stageBuiltRetainedWorkers,
  stageRetainedNotices: stageRetainedAssetNotices,
  withNoticeManifests: withRetainedAssetNoticeManifests,
  withNoticeValidation: withRetainedAssetNoticeValidation,
  assertAssetDependencies: assertFullAssetDependencies
})

export function fullAssetSourceCandidates(packageDir) {
  return [
    resolve(packageDir, '..', 'web', 'viewer'),
    resolve(packageDir, '..', '..', 'compat', 'web', 'viewer'),
    resolve(packageDir, '..', '..', '..', 'apps', 'viewer-demo', 'dist'),
    // A fresh public-source checkout has no generated viewer/demo dist yet. The
    // tracked offline assets are the canonical bootstrap source for that build.
    resolve(packageDir, '..', '..', '..', 'apps', 'viewer-demo', 'public')
  ]
}

/** Copy, stage, sanitize, verify and describe the Full viewer asset tree in outDir. */
export async function stageFullViewerAssets({
  packageDir, outDir, packageManifest, webNode, previousAssetManifest = null,
  assetSourceCandidates = fullAssetSourceCandidates(packageDir), stagers = fullAssetStagers
}) {
  const assetSource = assetSourceCandidates.find(candidate =>
    existsSync(resolve(candidate, 'flyfish-viewer-assets.json')) ||
    existsSync(resolve(candidate, 'vendor')) ||
    existsSync(resolve(candidate, 'wasm'))
  )

  if (assetSource) {
    for (const entry of ['vendor', 'wasm']) {
      const sourcePath = resolve(assetSource, entry)
      const targetPath = resolve(outDir, entry)
      await rm(targetPath, { recursive: true, force: true })
      if (!existsSync(sourcePath)) {
        continue
      }
      await cp(sourcePath, targetPath, { recursive: true })
    }
    console.log(`[web-full-iife] Copied viewer assets from ${assetSource}`)
  } else {
    throw new Error('[web-full-iife] Missing viewer asset source. Build viewer assets before publishing the full CDN package.')
  }

  await stagers.stagePptRuntime(join(outDir, 'vendor/ppt'))
  await stagers.stageDesignRuntime(outDir)
  await stagers.stageCadRuntime(outDir)
  await stagers.stageBuiltWorkers(outDir)
  const sanitization = await sanitizeOfflineViewerAssetTree(outDir)
  await verifyPptRuntimeDistributionRoot(outDir, {
    unbundledJavaScriptPath: 'renderers/presentation.iife.js'
  })
  await stagers.assertAssetDependencies(packageManifest, resolve(packageDir, 'package.json'))
  await stagers.stageRetainedNotices(outDir, {
    externalAssetOwners: [
      { prefix: 'vendor/drawio/', packageName: '@file-viewer/assets-drawing', version: packageManifest.version, inventoryPath: 'viewer/THIRD_PARTY_LICENSES.assets.json' },
      { prefix: 'wasm/cad/', packageName: '@file-viewer/assets-cad', version: packageManifest.version, inventoryPath: 'viewer/THIRD_PARTY_LICENSES.assets.json' },
      { prefix: 'vendor/design/', packageName: '@file-viewer/assets-design', version: packageManifest.version, inventoryPath: 'viewer/THIRD_PARTY_LICENSES.assets.json' },
    ],
  })
  const initialValidation = await webNode.validateViewerAssets({ sourceDir: outDir })
  const viewerAssetManifest = webNode.buildViewerAssetManifest(initialValidation)
  viewerAssetManifest.rendererAssetManifests = stagers.withNoticeManifests(viewerAssetManifest.rendererAssetManifests)
  const validation = await stagers.withNoticeValidation(initialValidation, viewerAssetManifest.rendererAssetManifests)
  if (!validation.valid) {
    const missing = validation.missingRequired
      .map(asset => `${asset.rendererId}:${asset.relativePath}`)
      .join(', ')
    throw new Error(`[web-full-iife] Viewer static assets are missing required resources: ${missing}`)
  }
  viewerAssetManifest.validation = webNode.toViewerAssetManifestValidation(validation)
  const privateEvidenceDir = join(packageDir, '.build')
  await mkdir(privateEvidenceDir, { recursive: true })
  await writeFile(join(privateEvidenceDir, 'full-assets-validation.json'), `${JSON.stringify({
    checkedAt: validation.checkedAt,
    reusedPublicTimestamps: stableAssetManifest(previousAssetManifest, viewerAssetManifest) === previousAssetManifest,
    validation: viewerAssetManifest.validation
  }, null, 2)}\n`)
  await webNode.writeViewerAssetManifest(outDir, stableAssetManifest(previousAssetManifest, viewerAssetManifest))
  // Keep the complete local dist for self-hosted release assets. The ordinary npm
  // archive carries CAD, drawing and design through exact-version asset dependencies.
  await stagers.assertAssetDependencies(packageManifest, resolve(packageDir, 'package.json'))
  await writeFile(join(outDir, '.npmignore'), '/vendor/drawio/\n/wasm/cad/\n/vendor/design/\n', 'utf8')
  await writeFile(
    resolve(outDir, 'flyfish-viewer-manifest.json'),
    `${JSON.stringify({
      name: packageManifest.name,
      version: packageManifest.version,
      kind: 'viewer-assets',
      assets: webNode.VIEWER_ASSET_MANIFEST_FILENAME
    }, null, 2)}\n`,
    'utf8'
  )
  return { assetSource, sanitization }
}
