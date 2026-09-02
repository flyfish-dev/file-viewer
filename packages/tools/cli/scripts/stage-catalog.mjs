import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const sourceRoot = resolve(packageRoot, '../../..')
const check = process.argv.includes('--check')
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const formatCatalog = await readJson(join(sourceRoot, 'ecosystem/format-catalog.json'))
const profileBudgets = await readJson(join(sourceRoot, 'ecosystem/profile-budgets.json'))
const wrappers = await readJson(join(sourceRoot, 'ecosystem/wrappers.json'))
const webViewerManifest = join(sourceRoot, 'packages/components/web/viewer/flyfish-viewer-assets.json')
const copyAssetsManifest = join(sourceRoot, 'packages/tools/copy-assets/viewer/flyfish-viewer-assets.json')
const assetManifest = await readJson(existsSync(webViewerManifest) ? webViewerManifest : copyAssetsManifest)
const assetRendererIds = new Set(assetManifest.rendererAssetManifests.map(entry => entry.rendererId))
const packageEntries = [
  ...(wrappers.renderers || []),
  ...(wrappers.utilityPackages || []).filter(entry => entry.packageName.startsWith('@file-viewer/capability-')),
]
const allPackageEntries = [
  { ...wrappers.corePackage, packageDir: 'packages/core' },
  ...(wrappers.wrappers || []),
  ...(wrappers.renderers || []),
  ...(wrappers.presets || []),
  ...(wrappers.utilityPackages || []),
  ...(wrappers.compatibilityPackages || []),
]
const packageDirByName = new Map(allPackageEntries.map(entry => [entry.packageName, entry.packageDir]))
const packageInfoCache = new Map()
const packageInfo = async packageName => {
  if (packageInfoCache.has(packageName)) return packageInfoCache.get(packageName)
  const packageDir = packageDirByName.get(packageName)
  if (!packageDir) throw new Error(`Package ${packageName} is missing from ecosystem/wrappers.json`)
  const value = await readJson(join(sourceRoot, packageDir, 'package.json'))
  if (value.name !== packageName || !value.version) throw new Error(`Package metadata drifted for ${packageName}`)
  packageInfoCache.set(packageName, value)
  return value
}
const rendererExportOverrides = new Map([
  ['@file-viewer/renderer-3d', 'modelRenderer'],
  ['@file-viewer/renderer-epub', 'ebookRenderer'],
  ['@file-viewer/renderer-ppt', 'pptRenderer'],
  ['@file-viewer/renderer-pptx', 'pptxRenderer'],
  ['@file-viewer/renderer-wordperfect', 'wordPerfectRenderer'],
])
const rendererExportName = packageName => rendererExportOverrides.get(packageName) ||
  `${packageName.replace(/^@file-viewer\/renderer-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Renderer`
const enrichCapability = async (manifest, packageJson) => {
  const assets = { ...manifest.assets }
  if (assets.packageName) {
    assets.packageVersion = (await packageInfo(assets.packageName)).version
    const installerName = assets.installerPackageName || assets.packageName
    assets.installerPackageName = installerName
    assets.installerPackageVersion = (await packageInfo(installerName)).version
  }
  return {
    ...manifest,
    version: packageJson.version,
    activation: manifest.activation || {
      kind: 'renderer-export',
      import: manifest.packageName,
      export: rendererExportName(manifest.packageName),
    },
    assets,
  }
}

const heavyPackages = new Set([
  '@file-viewer/renderer-3d',
  '@file-viewer/renderer-cad',
  '@file-viewer/renderer-dicom',
  '@file-viewer/renderer-signature',
  '@file-viewer/renderer-drawing',
  '@file-viewer/renderer-eda',
  '@file-viewer/renderer-geo',
  '@file-viewer/renderer-hangul',
  '@file-viewer/renderer-iwork',
  '@file-viewer/renderer-ppt',
  '@file-viewer/renderer-typst',
  '@file-viewer/renderer-wordperfect'
])
const assetPackByRendererId = new Map(Object.entries({
  cad: 'cad',
  typst: 'typst',
  model: 'model',
  drawing: 'drawing',
  'apple-pages': 'iwork',
  'apple-numbers': 'iwork',
  'apple-keynote': 'iwork',
  'office-presentation-binary': 'ppt',
  'office-hangul': 'hangul',
  'office-wordperfect': 'wordperfect',
  chm: 'chm',
  'data-asset': 'data'
}))

const rowsByPackage = new Map()
for (const row of formatCatalog.renderers) {
  const rows = rowsByPackage.get(row.packageName) || []
  rows.push(row)
  rowsByPackage.set(row.packageName, rows)
}

const capabilities = []
for (const [packageName, rows] of [...rowsByPackage].sort(([left], [right]) => left.localeCompare(right))) {
  const packageDir = packageDirByName.get(packageName)
  if (!packageDir) throw new Error(`Format catalog package ${packageName} is missing from ecosystem/wrappers.json`)
  const packageJson = await readJson(join(sourceRoot, packageDir, 'package.json'))
  const declaredPath = packageJson.fileViewer?.capabilityManifest
  if (declaredPath) {
    const manifest = await readJson(join(sourceRoot, packageDir, declaredPath))
    if (manifest.packageName !== packageName) {
      throw new Error(`${packageName} capability manifest declares ${manifest.packageName}`)
    }
    const catalogFormats = new Set(rows.flatMap(row => row.extensions))
    const unknownFormats = manifest.formats.filter(format => !catalogFormats.has(format))
    if (unknownFormats.length) throw new Error(`${packageName} capability has unknown formats: ${unknownFormats.join(', ')}`)
    capabilities.push(await enrichCapability(manifest, packageJson))
    continue
  }
  const ownedRendererIds = [...new Set(rows.map(row => row.id).filter(rendererId => assetRendererIds.has(rendererId)))].sort()
  const assetPackIds = [...new Set(ownedRendererIds.map(rendererId => assetPackByRendererId.get(rendererId)))]
  if (assetPackIds.includes(undefined) || assetPackIds.length > 1) {
    throw new Error(`${packageName} must declare one independent asset pack for: ${ownedRendererIds.join(', ')}`)
  }
  const assetPackId = assetPackIds[0]
  capabilities.push(await enrichCapability({
    schemaVersion: 1,
    id: rows.length === 1 ? rows[0].id : packageName.replace(/^@file-viewer\/renderer-/, ''),
    packageName,
    rendererIds: [...new Set(rows.map(row => row.id))],
    formats: [...new Set(rows.flatMap(row => row.extensions))],
    assets: ownedRendererIds.length ? {
      rendererIds: ownedRendererIds,
      packageName: `@file-viewer/assets-${assetPackId}`,
      installerPackageName: `@file-viewer/assets-${assetPackId}`,
      bin: `file-viewer-assets-${assetPackId}`,
      apiExport: 'installFileViewerCapabilityAssetPack',
      target: 'public/file-viewer',
      copyGroups: ownedRendererIds,
      copyMode: 'capability-pack',
      receiptFilename: `file-viewer-assets-${assetPackId}.receipt.json`,
      notice: `Independent ${assetPackId} capability asset pack.`
    } : { rendererIds: [] },
    license: {
      spdx: packageJson.license || 'NOASSERTION',
      policy: heavyPackages.has(packageName) ? 'review-required' : 'permissive'
    },
    weight: heavyPackages.has(packageName) ? 'heavy' : 'standard',
    profiles: [...new Set(rows.flatMap(row => row.preset))]
  }, packageJson))
}

for (const entry of packageEntries.filter(candidate => candidate.packageName.startsWith('@file-viewer/capability-'))) {
  const packageJson = await readJson(join(sourceRoot, entry.packageDir, 'package.json'))
  const manifest = await readJson(join(sourceRoot, entry.packageDir, packageJson.fileViewer.capabilityManifest))
  const rows = rowsByPackage.get(manifest.enhancesPackage) || []
  const catalogFormats = new Set(rows.flatMap(row => row.extensions))
  const unknownFormats = manifest.formats.filter(format => !catalogFormats.has(format))
  if (unknownFormats.length) throw new Error(`${entry.packageName} enhancement has unknown formats: ${unknownFormats.join(', ')}`)
  capabilities.push(await enrichCapability(manifest, packageJson))
}

const standardProfilePath = join(sourceRoot, 'packages/presets/standard/file-viewer.profile.json')
const standardProfileSource = await readFile(standardProfilePath)
const standardProfile = JSON.parse(standardProfileSource.toString('utf8'))
const standardProfileManifestSha256 = createHash('sha256').update(standardProfileSource).digest('hex')
const legacyFullBaseline = await readJson(join(sourceRoot, 'packages/presets/all/compatibility-baseline.json'))
const legacyRows = formatCatalog.renderers.filter(row => row.preset.includes('all'))
const hashList = values => createHash('sha256').update(JSON.stringify([...new Set(values)].sort())).digest('hex')
const legacyMeasurements = {
  rendererIds: [...new Set(legacyRows.map(row => row.id))],
  extensions: [...new Set(legacyRows.flatMap(row => row.extensions))],
  rendererPackages: [...new Set(legacyRows.map(row => row.packageName))],
  presetDependencies: Object.keys((await packageInfo('@file-viewer/preset-all')).dependencies || {}),
}
const publishedMinimum = legacyFullBaseline.publishedMinimum.dependencyNames
if (legacyFullBaseline.publishedMinimum.dependencyNamesSha256 !== hashList(publishedMinimum)) {
  throw new Error('preset-all published 2.4 dependency evidence is internally inconsistent')
}
const candidateDependencies = new Set(legacyMeasurements.presetDependencies)
for (const packageName of publishedMinimum) {
  if (!candidateDependencies.has(packageName)) throw new Error(`preset-all removed published 2.4 dependency ${packageName}`)
}
for (const [key, values] of Object.entries(legacyMeasurements)) {
  if (legacyFullBaseline.candidateContract[key].count !== values.length || legacyFullBaseline.candidateContract[key].sha256 !== hashList(values)) {
    throw new Error(`preset-all compatibility baseline drifted for ${key}; existing full packages are frozen at the published 2.4 matrix`)
  }
}
const presetEntries = wrappers.presets || []
const profiles = presetEntries
  .filter(entry => ['all', 'lite', 'standard', 'office', 'engineering'].includes(entry.id))
  .map(entry => {
    const profileCapabilities = entry.id === 'standard'
      ? standardProfile.capabilityPackages
      : [...new Set([
          ...formatCatalog.renderers
            .filter(row => row.preset.includes(entry.id))
            .map(row => row.packageName),
          ...capabilities
            .filter(capability => capability.profiles.includes(entry.id))
            .map(capability => capability.packageName),
        ])]
    return {
    id: entry.id,
    packageName: entry.packageName,
    version: entry.releaseVersion,
    capabilityPackages: profileCapabilities,
    ...(entry.id === 'standard' ? {
      assetPackageName: standardProfile.assetPackageName,
      profileManifestSha256: standardProfileManifestSha256,
      estimates: {
        packedClosureBytes: profileBudgets.profiles.standard.maxPackedClosureBytes,
        unpackedClosureBytes: profileBudgets.profiles.standard.maxUnpackedClosureBytes,
        staticAssetBytes: profileBudgets.profiles.standard.maxStaticAssetBytes,
      },
    } : {}),
  }})

const vitePluginSource = await readFile(join(sourceRoot, 'packages/presets/vite-plugin/src/index.ts'), 'utf8')
if (!vitePluginSource.includes("'standard'") || !vitePluginSource.includes("'@file-viewer/renderer-pptx'")) {
  throw new Error('Vite plugin descriptors are not aligned with the standard/PPTX capability split')
}

const catalog = {
  schemaVersion: 1,
  core: {
    packageName: '@file-viewer/core',
    version: (await packageInfo('@file-viewer/core')).version,
  },
  frameworks: Object.fromEntries(await Promise.all([
    ['web', '@file-viewer/web'],
    ['vue3', '@file-viewer/vue3'],
    ['vue2.7', '@file-viewer/vue2.7'],
    ['vue2.6', '@file-viewer/vue2.6'],
    ['react', '@file-viewer/react'],
    ['react-legacy', '@file-viewer/react-legacy'],
    ['svelte', '@file-viewer/svelte'],
    ['jquery', '@file-viewer/jquery'],
  ].map(async ([id, packageName]) => [id, { packageName, version: (await packageInfo(packageName)).version }]))),
  frameworkOverrides: {
    full: Object.fromEntries(await Promise.all([
      ['web', '@file-viewer/web-full'],
      ['vue3', '@file-viewer/vue3-full'],
      ['vue2.7', '@file-viewer/vue2.7-full'],
      ['vue2.6', '@file-viewer/vue2.6-full'],
      ['react', '@file-viewer/react-full'],
      ['react-legacy', '@file-viewer/react-legacy-full'],
      ['svelte', '@file-viewer/svelte-full'],
      ['jquery', '@file-viewer/jquery-full'],
    ].map(async ([id, packageName]) => [id, { packageName, version: (await packageInfo(packageName)).version }]))),
  },
  frameworkTemplates: {
    web: { defaultVersion: 'browser', runtimeDependencies: {}, viteVersion: '8.0.16', validatedVersions: { browser: { runtimeDependencies: {}, viteVersion: '8.0.16' } } },
    vue3: { defaultVersion: '3.5.35', runtimeDependencies: { vue: '3.5.35' }, viteVersion: '8.0.16', validatedVersions: { '3.5.35': { runtimeDependencies: { vue: '3.5.35' }, viteVersion: '8.0.16' } } },
    'vue2.7': { defaultVersion: '2.7.16', runtimeDependencies: { vue: '2.7.16' }, viteVersion: '7.1.7', validatedVersions: { '2.7.16': { runtimeDependencies: { vue: '2.7.16' }, viteVersion: '7.1.7' } } },
    'vue2.6': { defaultVersion: '2.6.14', runtimeDependencies: { vue: '2.6.14' }, viteVersion: '6.1.6', validatedVersions: { '2.6.14': { runtimeDependencies: { vue: '2.6.14' }, viteVersion: '6.1.6' } } },
    react: { defaultVersion: '19.2.7', runtimeDependencies: { react: '19.2.7', 'react-dom': '19.2.7' }, viteVersion: '8.0.16', validatedVersions: {
      '18.3.1': { runtimeDependencies: { react: '18.3.1', 'react-dom': '18.3.1' }, viteVersion: '8.0.16', templateVariant: 'react-modern' },
      '19.2.7': { runtimeDependencies: { react: '19.2.7', 'react-dom': '19.2.7' }, viteVersion: '8.0.16', templateVariant: 'react-modern' },
    } },
    'react-legacy': { defaultVersion: '17.0.2', runtimeDependencies: { react: '17.0.2', 'react-dom': '17.0.2' }, viteVersion: '7.1.7', validatedVersions: { '17.0.2': { runtimeDependencies: { react: '17.0.2', 'react-dom': '17.0.2' }, viteVersion: '7.1.7', templateVariant: 'react-legacy' } } },
    svelte: { defaultVersion: '5.56.3', runtimeDependencies: { svelte: '5.56.3' }, viteVersion: '8.0.16', validatedVersions: {
      '3.59.2': { runtimeDependencies: { svelte: '3.59.2' }, viteVersion: '4.5.14', vitePluginSvelteVersion: '2.5.3', templateVariant: 'svelte-classic' },
      '4.2.20': { runtimeDependencies: { svelte: '4.2.20' }, viteVersion: '5.4.21', vitePluginSvelteVersion: '3.1.2', templateVariant: 'svelte-classic' },
      '5.56.3': { runtimeDependencies: { svelte: '5.56.3' }, viteVersion: '8.0.16', vitePluginSvelteVersion: '7.0.0', templateVariant: 'svelte-modern' },
    } },
    jquery: { defaultVersion: '3.7.1', runtimeDependencies: { jquery: '3.7.1' }, viteVersion: '8.0.16', validatedVersions: { '3.7.1': { runtimeDependencies: { jquery: '3.7.1' }, viteVersion: '8.0.16' } } },
  },
  profiles,
  legacyFull: {
    release: legacyFullBaseline.release,
    policy: legacyFullBaseline.policy,
    baselineSha256: createHash('sha256').update(await readFile(join(sourceRoot, 'packages/presets/all/compatibility-baseline.json'))).digest('hex'),
    excludedFutureCapabilities: legacyFullBaseline.excludedFutureCapabilities,
    referenceColdInstall: {
      measuredAt: '2026-08-26',
      packageCountRange: [274, 299],
      packedBytesRange: [254803968, 326107136],
      unpackedBytesRange: [800063488, 1004535808],
      registry: 'https://registry.npmjs.org/',
    },
  },
  capabilities,
  assetTool: (() => {
    const entry = (wrappers.utilityPackages || []).find(candidate => candidate.packageName === '@file-viewer/assets-standard')
    if (!entry) throw new Error('Missing @file-viewer/assets-standard utility entry')
    return { packageName: entry.packageName, version: entry.releaseVersion }
  })()
}
const output = `${JSON.stringify(catalog, null, 2)}\n`
const outputPath = join(packageRoot, 'catalog/catalog.json')
if (check) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current !== output) throw new Error('CLI catalog is stale; run pnpm --filter @file-viewer/cli stage-catalog')
  console.log('[file-viewer-cli] Bundled capability catalog is current.')
} else {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, output, 'utf8')
  console.log(`[file-viewer-cli] Staged ${capabilities.length} capabilities.`)
}
