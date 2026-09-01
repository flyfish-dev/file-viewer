import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  writeFile
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  readFileViewerAssetLedger,
  uninstallFileViewerCapabilityAssetPack,
  verifyFileViewerCapabilityAssetReceipt,
  verifyFileViewerAssetState
} from '@file-viewer/asset-installer'
import type {
  FileViewerCapabilityCatalogEntry,
  FileViewerCapabilityList,
  FileViewerCliCatalog,
  FileViewerDoctorResult,
  FileViewerFramework,
  FileViewerInstallPlan,
  FileViewerCommandStep,
  FileViewerProfile,
  FileViewerProjectConfig,
  FileViewerInstallSource,
  PackageManager
} from './types.js'
import { normalizeFileViewerAssetBaseUrl, normalizeFileViewerRegistryUrl } from './url-security.js'
import { detectYarnGeneration } from './carrier-command.js'

export type * from './types.js'
export * from './offline.js'
export { normalizeFileViewerRegistryUrl } from './url-security.js'

export const DEFAULT_FILE_VIEWER_CONFIG = 'file-viewer.config.json'

const allowedFrameworks = new Set<FileViewerFramework>([
  'web',
  'vue3',
  'vue2.7',
  'vue2.6',
  'react',
  'react-legacy',
  'svelte',
  'jquery'
])
const allowedProfiles = new Set<FileViewerProfile>([
  'standard',
  'lite',
  'office',
  'engineering',
  'all',
  'full',
  'custom'
])
const allowedPackageManagers = new Set<PackageManager>(['pnpm', 'npm', 'yarn', 'bun'])

const normalizeList = (values: readonly string[] = []) =>
  [
    ...new Set(
      values
        .flatMap((value) => value.split(','))
        .map((value) => value.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
    )
  ].sort()

const normalizeProjectRelativePath = (value: string, label: string) => {
  const normalized = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
  if (!normalized || isAbsolute(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`${label} must be a contained project-relative path.`)
  }
  return normalized
}

export const inferFileViewerLocalAssetBaseUrl = (
  assetTarget: string,
  publicDirectory?: string
) => {
  const target = normalizeProjectRelativePath(assetTarget, 'assetTarget')
  const roots = publicDirectory
    ? [normalizeProjectRelativePath(publicDirectory, 'publicDirectory')]
    : ['public', 'static']
  for (const root of roots) {
    if (!target.startsWith(`${root}/`)) continue
    const publicPath = target.slice(root.length + 1)
    if (!publicPath) return undefined
    return normalizeFileViewerAssetBaseUrl(`/${publicPath}/`)
  }
  return undefined
}

const normalizeInstallSource = (
  source?: FileViewerInstallSource
): FileViewerInstallSource | undefined => {
  if (!source) return undefined
  if (
    source.concurrency !== undefined &&
    (!Number.isInteger(source.concurrency) || source.concurrency < 1 || source.concurrency > 32)
  ) {
    throw new Error('Install concurrency must be an integer from 1 to 32.')
  }
  const cacheDir = source.cacheDir?.trim()
  // eslint-disable-next-line no-control-regex -- reject controls before resolving a local path
  if (cacheDir && /[\u0000-\u001f\u007f]/.test(cacheDir))
    throw new Error('Invalid cache directory.')
  if (source.kind === 'registry') {
    return {
      kind: 'registry',
      ...(source.registry ? { registry: normalizeFileViewerRegistryUrl(source.registry) } : {}),
      ...(cacheDir ? { cacheDir } : {}),
      ...(source.concurrency ? { concurrency: source.concurrency } : {})
    }
  }
  const directory = source.directory?.trim()
  // eslint-disable-next-line no-control-regex -- reject controls before resolving a local path
  if (!directory || /[\u0000-\u001f\u007f]/.test(directory))
    throw new Error('Invalid offline directory.')
  return {
    kind: 'offline-directory',
    directory,
    ...(cacheDir ? { cacheDir } : {}),
    ...(source.concurrency ? { concurrency: source.concurrency } : {})
  }
}

const resolveContainedProjectFile = (projectRoot: string, value: string, label: string) =>
  resolve(projectRoot, normalizeProjectRelativePath(value, label))

const stableConfig = (config: FileViewerProjectConfig): FileViewerProjectConfig => ({
  schemaVersion: 1,
  framework: config.framework,
  profile: config.profile,
  formats: normalizeList(config.formats),
  capabilities: normalizeList(config.capabilities),
  assetTarget: normalizeProjectRelativePath(config.assetTarget, 'assetTarget'),
  generatedModule: normalizeProjectRelativePath(config.generatedModule, 'generatedModule'),
  ...(config.entry ? { entry: normalizeProjectRelativePath(config.entry, 'entry') } : {}),
  ...(config.packageManager ? { packageManager: config.packageManager } : {}),
  ...(config.packageManagerVersion ? { packageManagerVersion: config.packageManagerVersion } : {}),
  ...(config.managedPackages?.length
    ? { managedPackages: normalizeList(config.managedPackages) }
    : {}),
  ...(config.locale ? { locale: config.locale } : {}),
  ...(config.source ? { source: normalizeInstallSource(config.source) } : {}),
  ...(config.frameworkVersion ? { frameworkVersion: config.frameworkVersion } : {}),
  ...(config.assetBaseUrl
    ? { assetBaseUrl: normalizeFileViewerAssetBaseUrl(config.assetBaseUrl) }
    : {})
})

export async function loadFileViewerCliCatalog(): Promise<FileViewerCliCatalog> {
  const raw = await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8')
  const catalog = JSON.parse(raw) as FileViewerCliCatalog
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.capabilities)) {
    throw new Error('The bundled File Viewer capability catalog is invalid.')
  }
  return catalog
}

export async function listFileViewerCapabilities(): Promise<FileViewerCapabilityList> {
  const catalog = await loadFileViewerCliCatalog()
  return {
    schemaVersion: 1,
    coreVersion: catalog.core.version,
    capabilities: [...catalog.capabilities]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((capability) => ({
        id: capability.id,
        packageSpec: `${capability.packageName}@${capability.version}`,
        formats: [...capability.formats].sort(),
        rendererIds: [...capability.rendererIds].sort(),
        weight: capability.weight,
        license: capability.license,
        profiles: [...capability.profiles].sort(),
        availability: capability.profiles.length
          ? capability.profiles.slice().sort().join(',')
          : 'explicit opt-in',
        assetPackageSpec:
          capability.assets.packageName && capability.assets.packageVersion
            ? `${capability.assets.packageName}@${capability.assets.packageVersion}`
            : null
      }))
  }
}

export function renderFileViewerCapabilityList(value: FileViewerCapabilityList) {
  const lines = [`File Viewer capabilities (catalog ${value.coreVersion})`]
  for (const capability of value.capabilities) {
    lines.push(
      [
        capability.id,
        `formats=${capability.formats.join(',') || '-'}`,
        `weight=${capability.weight}`,
        `license=${capability.license.spdx}/${capability.license.policy}`,
        `profile=${capability.availability}`,
        `assets=${capability.assetPackageSpec ?? 'none'}`
      ].join(' | ')
    )
  }
  return lines.join('\n')
}

export function normalizeFileViewerConfig(
  input: Partial<FileViewerProjectConfig> = {}
): FileViewerProjectConfig {
  const framework = input.framework ?? 'web'
  const profile = input.profile ?? 'standard'
  if (!allowedFrameworks.has(framework)) {
    throw new Error(`Unknown framework "${framework}".`)
  }
  if (!allowedProfiles.has(profile)) {
    throw new Error(`Unknown profile "${profile}".`)
  }
  if (input.packageManager && !allowedPackageManagers.has(input.packageManager)) {
    throw new Error(`Unknown package manager "${input.packageManager}".`)
  }
  if (
    input.packageManagerVersion !== undefined &&
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(input.packageManagerVersion)
  ) {
    throw new Error('packageManagerVersion must be an exact semantic version.')
  }
  return stableConfig({
    schemaVersion: 1,
    framework,
    profile,
    formats: input.formats ?? [],
    capabilities: input.capabilities ?? [],
    assetTarget: input.assetTarget ?? 'public/file-viewer',
    generatedModule: input.generatedModule ?? 'file-viewer.generated.mjs',
    entry: input.entry,
    packageManager: input.packageManager,
    packageManagerVersion: input.packageManagerVersion,
    managedPackages: input.managedPackages,
    locale: input.locale,
    source: input.source,
    frameworkVersion: input.frameworkVersion,
    assetBaseUrl: input.assetBaseUrl
  })
}

export async function readFileViewerProjectConfig(
  projectRoot: string,
  configFile = DEFAULT_FILE_VIEWER_CONFIG,
  optional = false
): Promise<FileViewerProjectConfig | null> {
  const configPath = resolveContainedProjectFile(projectRoot, configFile, 'configFile')
  try {
    const raw = await readFile(configPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<FileViewerProjectConfig>
    if (parsed.schemaVersion !== 1) {
      throw new Error(
        `Unsupported File Viewer config schemaVersion ${String(parsed.schemaVersion)}.`
      )
    }
    return normalizeFileViewerConfig(parsed)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (optional && code === 'ENOENT') return null
    throw error
  }
}

function capabilityForToken(
  token: string,
  catalog: FileViewerCliCatalog
): FileViewerCapabilityCatalogEntry | null {
  const exactId = catalog.capabilities.find((capability) => capability.id === token)
  if (exactId) return exactId
  const matches = catalog.capabilities.filter(
    (capability) => capability.rendererIds.includes(token) || capability.formats.includes(token)
  )
  if (matches.length > 1) {
    throw new Error(
      `"${token}" matches multiple capabilities: ${matches.map((item) => item.id).join(', ')}.`
    )
  }
  return matches[0] ?? null
}

export function detectPackageManager(projectRoot: string): PackageManager {
  try {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
      packageManager?: string
    }
    const declared = packageJson.packageManager
      ?.match(/^(pnpm|npm|yarn|bun)@/i)?.[1]
      ?.toLowerCase() as PackageManager | undefined
    if (declared && allowedPackageManagers.has(declared)) return declared
  } catch {
    // Lockfile detection below remains the compatibility fallback.
  }
  const candidates: [string, PackageManager][] = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['bun.lock', 'bun'],
    ['package-lock.json', 'npm']
  ]
  const detected = candidates.filter(([filename]) => existsSync(join(projectRoot, filename)))
  const managers = [...new Set(detected.map(([, manager]) => manager))]
  if (managers.length > 1) {
    throw new Error(
      `Multiple package-manager lockfiles were found (${detected.map(([filename]) => filename).join(', ')}). Pass --package-manager explicitly or set an exact packageManager field in package.json.`
    )
  }
  if (managers[0]) return managers[0]
  return 'npm'
}

function installStep(
  manager: PackageManager,
  packages: readonly string[],
  cwd: string,
  source?: FileViewerInstallSource,
  packageManagerVersion?: string
) {
  const concurrency =
    source?.concurrency && source.concurrency > 0 ? String(source.concurrency) : null
  const cacheDir = source?.cacheDir ? resolve(cwd, source.cacheDir) : null
  const registry = source?.kind === 'registry' ? source.registry : undefined
  const extra: string[] = []
  const env: Record<string, string> = {}
  if (source?.kind === 'offline-directory' && (manager === 'pnpm' || manager === 'npm'))
    extra.push('--offline')
  if (registry && manager !== 'yarn') extra.push('--registry', registry)
  if (registry && manager === 'yarn') {
    // Berry only accepts registry configuration through its environment. Keep
    // these values for both generations, then add Classic's explicit flag once
    // the project generation is known below.
    env.npm_config_registry = registry
    env.YARN_NPM_REGISTRY_SERVER = registry
  }
  if (manager === 'pnpm') {
    if (cacheDir) extra.push('--store-dir', cacheDir)
    if (concurrency) extra.push('--network-concurrency', concurrency)
    return {
      id: 'install',
      kind: 'install' as const,
      command: 'pnpm',
      args: ['add', '--save-exact', '--ignore-scripts', ...extra, ...packages],
      cwd,
      ...(Object.keys(env).length ? { env } : {})
    }
  }
  if (manager === 'yarn') {
    const effectiveYarnVersion = packageManagerVersion ?? configuredYarnVersion(cwd)
    const declaredMajor = Number(effectiveYarnVersion?.match(/^(\d+)/)?.[1] ?? Number.NaN)
    const generation = Number.isFinite(declaredMajor)
      ? declaredMajor >= 2
        ? 'berry'
        : 'classic'
      : detectYarnGeneration(cwd)
    if (generation === 'berry') {
      if (!effectiveYarnVersion) {
        throw new Error(
          'Yarn Berry was detected but its exact version could not be determined. Add packageManager: "yarn@<exact-version>", configure a versioned .yarn/releases/yarn-<version>.cjs yarnPath, or pass --package-manager-version.'
        )
      }
      env.YARN_ENABLE_SCRIPTS = 'false'
      if (cacheDir) {
        env.YARN_ENABLE_GLOBAL_CACHE = 'true'
        env.YARN_GLOBAL_FOLDER = cacheDir
      }
      if (concurrency) {
        env.YARN_NETWORK_CONCURRENCY = concurrency
      }
      if (source?.kind === 'offline-directory') env.YARN_ENABLE_NETWORK = 'false'
    } else {
      // Yarn Classic does not reliably honor the Berry environment setting and
      // can otherwise fall back to a user's global registry or proxy.
      if (registry) {
        extra.push('--registry', registry)
        const registryHost = new URL(registry).hostname
        const isLoopbackRegistry =
          registryHost === 'localhost' ||
          registryHost === '[::1]' ||
          /^127(?:\.\d{1,3}){3}$/.test(registryHost)
        if (isLoopbackRegistry) {
          // Yarn Classic treats npm_config_proxy as authoritative even when
          // NO_PROXY contains the loopback host. A loopback registry must never
          // leave the machine, so bypass inherited proxies for this child only.
          for (const name of [
            'npm_config_proxy',
            'npm_config_https_proxy',
            'HTTP_PROXY',
            'HTTPS_PROXY',
            'ALL_PROXY',
            'http_proxy',
            'https_proxy',
            'all_proxy'
          ])
            env[name] = ''
          const noProxy = [registryHost.replace(/^\[|\]$/g, ''), '127.0.0.1', 'localhost', '::1']
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(',')
          env.NO_PROXY = noProxy
          env.no_proxy = noProxy
        }
      }
      extra.push('--ignore-scripts')
      if (cacheDir) env.YARN_CACHE_FOLDER = cacheDir
      if (concurrency) extra.push('--network-concurrency', concurrency)
      if (source?.kind === 'offline-directory') extra.push('--offline')
    }
    return {
      id: 'install',
      kind: 'install' as const,
      command: 'yarn',
      args: ['add', '--exact', ...extra, ...packages],
      cwd,
      ...(effectiveYarnVersion ? { expectedExecutableVersion: effectiveYarnVersion } : {}),
      ...(Object.keys(env).length ? { env } : {})
    }
  }
  if (manager === 'bun') {
    if (cacheDir) extra.push('--cache-dir', cacheDir)
    if (concurrency)
      extra.push('--network-concurrency', concurrency, '--concurrent-scripts', concurrency)
    return {
      id: 'install',
      kind: 'install' as const,
      command: 'bun',
      args: ['add', '--exact', '--ignore-scripts', ...extra, ...packages],
      cwd
    }
  }
  if (cacheDir) extra.push('--cache', cacheDir)
  if (concurrency) extra.push('--maxsockets', concurrency)
  return {
    id: 'install',
    kind: 'install' as const,
    command: 'npm',
    args: ['install', '--save-exact', '--ignore-scripts', ...extra, ...packages],
    cwd
  }
}

export async function resolveFileViewerOfflinePackages(
  required: readonly { packageName: string; version: string }[],
  directoryInput: string,
  projectRoot: string
) {
  const directory = resolve(projectRoot, directoryInput)
  const directoryDetails = await lstat(directory)
  if (!directoryDetails.isDirectory() || directoryDetails.isSymbolicLink())
    throw new Error(`Offline directory is not a regular directory: ${directory}.`)
  const physicalDirectory = await realpath(directory)
  const archives = (await readdir(physicalDirectory)).filter((file) => file.endsWith('.tgz')).sort()
  const integrityPath = join(physicalDirectory, 'file-viewer-offline-manifest.json')
  const integrityDetails = await lstat(integrityPath)
  if (!integrityDetails.isFile() || integrityDetails.isSymbolicLink())
    throw new Error(`Offline manifest is not a regular file: ${integrityPath}.`)
  const integrityManifest = JSON.parse(
    await readFile(integrityPath, 'utf8').catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new Error(
          `Offline directory requires ${integrityPath} with sha512 integrity for every tarball.`
        )
      throw error
    })
  ) as {
    schemaVersion?: number
    files?: Record<
      string,
      {
        integrity?: string
        packageName?: string
        version?: string
        dependencies?: Record<string, string>
      }
    >
  }
  if (
    integrityManifest.schemaVersion !== 1 ||
    !integrityManifest.files ||
    Array.isArray(integrityManifest.files)
  ) {
    throw new Error(`Invalid offline integrity manifest ${integrityPath}.`)
  }
  const byPackage = new Map<
    string,
    { version: string; path: string; dependencies: Record<string, string> }
  >()
  const isContained = (root: string, path: string) => {
    const relation = relative(root, path)
    return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation))
  }
  const inspectTarballManifest = (path: string) => {
    const result = spawnSync('tar', ['-xOf', path, 'package/package.json'], {
      encoding: 'utf8',
      shell: false,
      maxBuffer: 2 * 1024 * 1024
    })
    if (result.status !== 0)
      throw new Error(
        `Could not inspect offline tarball ${basename(path)}: ${String(result.stderr || result.error?.message || '').trim()}`
      )
    try {
      return JSON.parse(result.stdout) as {
        name?: string
        version?: string
        dependencies?: Record<string, string>
        optionalDependencies?: Record<string, string>
      }
    } catch (error) {
      throw new Error(
        `Offline tarball ${basename(path)} has invalid package/package.json: ${(error as Error).message}`,
        { cause: error }
      )
    }
  }
  const stableDependencies = (value: Record<string, string> = {}) =>
    Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
  const satisfiesOfflineSpec = (version: string, rawSpec: string) => {
    const spec = rawSpec.replace(/^workspace:/, '')
    if (version === spec) return true
    const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
    const rangeMatch = spec.match(/^\^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
    if (!versionMatch || !rangeMatch) return false
    const actual = versionMatch.slice(1, 4).map(Number)
    const minimum = rangeMatch.slice(1, 4).map(Number)
    const atLeastMinimum =
      actual[0] > minimum[0] ||
      (actual[0] === minimum[0] &&
        (actual[1] > minimum[1] || (actual[1] === minimum[1] && actual[2] >= minimum[2])))
    if (!atLeastMinimum) return false
    if (minimum[0] > 0) return actual[0] === minimum[0]
    if (minimum[1] > 0) return actual[0] === 0 && actual[1] === minimum[1]
    return actual[0] === 0 && actual[1] === 0 && actual[2] === minimum[2]
  }
  for (const archive of archives) {
    const unresolvedPath = join(physicalDirectory, archive)
    const details = await lstat(unresolvedPath)
    if (!details.isFile() || details.isSymbolicLink())
      throw new Error(`Offline tarball is not a regular file: ${archive}.`)
    const path = await realpath(unresolvedPath)
    if (!isContained(physicalDirectory, path))
      throw new Error(`Offline tarball escapes its manifest directory: ${archive}.`)
    const declared = integrityManifest.files[archive]
    const expectedIntegrity = declared?.integrity
    const actualIntegrity = `sha512-${createHash('sha512')
      .update(await readFile(path))
      .digest('base64')}`
    if (!expectedIntegrity || expectedIntegrity !== actualIntegrity)
      throw new Error(`Offline tarball integrity mismatch: ${archive}.`)
    if (
      !declared?.packageName ||
      !declared.version ||
      !declared.dependencies ||
      Array.isArray(declared.dependencies)
    ) {
      throw new Error(
        `Offline manifest metadata is incomplete for ${archive}. Regenerate it with file-viewer prepare.`
      )
    }
    const packed = inspectTarballManifest(path)
    if (packed.name !== declared.packageName || packed.version !== declared.version) {
      throw new Error(
        `Offline tarball identity mismatch: ${archive} contains ${String(packed.name)}@${String(packed.version)}, manifest declares ${declared.packageName}@${declared.version}.`
      )
    }
    const packedDependencies = stableDependencies({
      ...packed.dependencies,
      ...packed.optionalDependencies
    })
    if (
      JSON.stringify(packedDependencies) !==
      JSON.stringify(stableDependencies(declared.dependencies))
    ) {
      throw new Error(`Offline tarball dependency metadata mismatch: ${archive}.`)
    }
    if (byPackage.has(declared.packageName))
      throw new Error(`Offline directory has duplicate package ${declared.packageName}.`)
    byPackage.set(declared.packageName, {
      version: declared.version,
      path,
      dependencies: declared.dependencies
    })
  }
  const queue = [...required]
  const closure = new Map<
    string,
    { version: string; path: string; dependencies: Record<string, string> }
  >()
  while (queue.length) {
    const item = queue.shift()!
    if (closure.has(item.packageName)) {
      if (!satisfiesOfflineSpec(closure.get(item.packageName)!.version, item.version))
        throw new Error(`Offline closure has conflicting versions for ${item.packageName}.`)
      continue
    }
    const archive = byPackage.get(item.packageName)
    if (!archive)
      throw new Error(`Offline directory is missing ${item.packageName}@${item.version}.`)
    if (!satisfiesOfflineSpec(archive.version, item.version))
      throw new Error(
        `Offline ${item.packageName} is ${archive.version}; expected ${item.version}.`
      )
    closure.set(item.packageName, archive)
    for (const [packageName, rawVersion] of Object.entries(archive.dependencies)) {
      if (
        !packageName.startsWith('@file-viewer/') &&
        !['file-viewer-copy-assets', 'msdoc-viewer', 'styled-exceljs'].includes(packageName)
      )
        continue
      const version = rawVersion.replace(/^workspace:/, '')
      if (!/^\^?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error(
          `Offline dependency ${item.packageName} -> ${packageName} must use an exact or compatible caret version; found ${rawVersion}.`
        )
      }
      queue.push({ packageName, version })
    }
  }
  return [...closure.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packageName, item]) => ({ packageName, ...item }))
}

async function resolvePackageSpecs(
  required: readonly { packageName: string; version: string }[],
  source: FileViewerInstallSource | undefined,
  projectRoot: string
) {
  if (source?.kind !== 'offline-directory')
    return required.map((item) => `${item.packageName}@${item.version}`)
  return (await resolveFileViewerOfflinePackages(required, source.directory, projectRoot)).map(
    (item) => item.path
  )
}

function packageBinaryStep(
  bin: string,
  args: string[],
  cwd: string,
  packageName: string,
  packageVersion: string
) {
  return {
    command: bin,
    args,
    cwd,
    executableOwner: { packageName, packageVersion, bin }
  }
}

const shellQuote = (value: string) =>
  /^[a-zA-Z0-9_@./,:+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`

const displayCommand = (command: string, args: readonly string[]) =>
  [command, ...args.map(shellQuote)].join(' ')

const configuredYarnVersion = (projectRoot: string) => {
  const collect = (value: string) => {
    const matches = new Set<string>()
    for (const match of value.matchAll(/yarn-(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\.cjs/g))
      matches.add(match[1])
    return matches
  }
  const yarnConfig = join(projectRoot, '.yarnrc.yml')
  if (existsSync(yarnConfig)) {
    const yarnPath = readFileSync(yarnConfig, 'utf8').match(
      /^\s*yarnPath\s*:\s*["']?([^"'#\r\n]+)["']?\s*(?:#.*)?$/m
    )?.[1]
    if (yarnPath) {
      const configured = collect(yarnPath.trim())
      return configured.size === 1 ? [...configured][0] : undefined
    }
  }
  const releases = join(projectRoot, '.yarn', 'releases')
  const matches = new Set<string>()
  if (existsSync(releases)) {
    for (const filename of readdirSync(releases)) {
      for (const version of collect(filename)) matches.add(version)
    }
  }
  return matches.size === 1 ? [...matches][0] : undefined
}

const applicationImportStatement = (
  projectRoot: string,
  generatedModule: string,
  entry?: string
) => {
  if (!entry) return `Import ${generatedModule} from your application entry.`
  const entryPath = resolve(projectRoot, normalizeProjectRelativePath(entry, 'entry'))
  const generatedPath = resolve(
    projectRoot,
    normalizeProjectRelativePath(generatedModule, 'generatedModule')
  )
  let relation = relative(dirname(entryPath), generatedPath).replace(/\\/g, '/')
  if (!relation.startsWith('.')) relation = `./${relation}`
  return `import ${JSON.stringify(relation)};`
}

export async function createFileViewerInstallPlan(
  configInput: Partial<FileViewerProjectConfig>,
  options: { packageManager?: PackageManager; projectRoot?: string; assetTarget?: string } = {}
): Promise<FileViewerInstallPlan> {
  const config = normalizeFileViewerConfig(configInput)
  const catalog = await loadFileViewerCliCatalog()
  const effectiveAssetTarget = normalizeProjectRelativePath(
    options.assetTarget ?? config.assetTarget,
    'assetTarget'
  )
  const frameworkEntry =
    catalog.frameworkOverrides?.[config.profile]?.[config.framework] ??
    catalog.frameworks[config.framework]
  if (!frameworkEntry)
    throw new Error(`No component package is registered for ${config.framework}.`)
  const profile =
    config.profile === 'custom' || config.profile === 'full'
      ? null
      : catalog.profiles.find((candidate) => candidate.id === config.profile)
  if (config.profile !== 'custom' && config.profile !== 'full' && !profile) {
    throw new Error(`Profile ${config.profile} is not available in this CLI catalog.`)
  }

  const requested = normalizeList([...config.formats, ...config.capabilities])
  if (config.profile === 'custom' && requested.length === 0) {
    throw new Error(
      'The custom profile requires at least one --format or --capability. No files were written.'
    )
  }
  const explicitlySelectedCapabilities = requested.map((token) => {
    const capability = capabilityForToken(token, catalog)
    if (!capability) {
      const candidates = catalog.capabilities
        .flatMap((item) => [item.id, ...item.rendererIds, ...item.formats])
        .filter((candidate) => candidate.includes(token) || token.includes(candidate))
        .slice(0, 5)
      const suggestion = candidates.length ? ` Did you mean ${candidates.join(', ')}?` : ''
      throw new Error(
        `No File Viewer capability provides "${token}".${suggestion} Run file-viewer list to inspect valid tokens.`
      )
    }
    return capability
  })
  const selectedCapabilities =
    config.profile === 'full'
      ? [
          ...new Map(
            [
              ...catalog.capabilities.filter((capability) =>
                (catalog.legacyFull?.excludedFutureCapabilities ?? []).includes(capability.id)
              ),
              ...explicitlySelectedCapabilities.filter((capability) =>
                (catalog.legacyFull?.excludedFutureCapabilities ?? []).includes(capability.id)
              )
            ].map((capability) => [capability.packageName, capability])
          ).values()
        ]
      : explicitlySelectedCapabilities
  const profilePackages = new Set(profile?.capabilityPackages ?? [])
  const capabilityPackages = [
    ...new Set(
      selectedCapabilities
        .map((capability) => capability.packageName)
        .filter((packageName) => !profilePackages.has(packageName))
    )
  ].sort()
  const projectRoot = options.projectRoot ?? process.cwd()
  const manager =
    options.packageManager ?? config.packageManager ?? detectPackageManager(projectRoot)
  if (!allowedPackageManagers.has(manager)) {
    throw new Error(`Unknown package manager "${manager}".`)
  }
  const profileCapabilities = profile
    ? catalog.capabilities.filter((capability) => profilePackages.has(capability.packageName))
    : []
  const activeCapabilities = [
    ...new Map(
      [...profileCapabilities, ...selectedCapabilities].map((capability) => [
        capability.packageName,
        capability
      ])
    ).values()
  ]
  const legacyFullCapabilities =
    config.profile === 'full'
      ? catalog.capabilities.filter(
          (capability) =>
            !(catalog.legacyFull?.excludedFutureCapabilities ?? []).includes(capability.id)
        )
      : []
  const reportingCapabilities = [
    ...new Map(
      [...legacyFullCapabilities, ...activeCapabilities].map((capability) => [
        capability.packageName,
        capability
      ])
    ).values()
  ]
  const assetGroups = new Map<
    string,
    {
      packageName: string
      packageVersion: string
      installerPackageName: string
      installerPackageVersion: string
      bin: string
      target: string
      copyMode: 'profile-pack' | 'capability-pack' | 'renderer-groups'
      receiptFilename: string
      copyGroups: Set<string>
      rendererIds: Set<string>
    }
  >()
  const missingAssetRendererIds: string[] = []
  for (const capability of activeCapabilities) {
    const assets = capability.assets
    if (!assets.rendererIds.length) continue
    if (
      !assets.packageName ||
      !assets.bin ||
      !assets.target ||
      !assets.copyMode ||
      !assets.copyGroups ||
      !assets.receiptFilename
    ) {
      missingAssetRendererIds.push(...assets.rendererIds)
      continue
    }
    if (assets.packageName === 'file-viewer-copy-assets' || assets.copyMode === 'renderer-groups') {
      throw new Error(
        `Capability ${capability.id} still uses the legacy aggregate asset carrier; v3 requires an independent owner.`
      )
    }
    const target = effectiveAssetTarget
    if (!assets.packageVersion || !assets.installerPackageVersion) {
      throw new Error(`Capability ${capability.id} is missing frozen asset package versions.`)
    }
    const key = `${assets.packageName}\u0000${target}\u0000${assets.copyMode}`
    const group = assetGroups.get(key) ?? {
      packageName: assets.packageName,
      packageVersion: assets.packageVersion,
      installerPackageName: assets.installerPackageName ?? assets.packageName,
      installerPackageVersion: assets.installerPackageVersion,
      bin: assets.bin,
      target,
      copyMode: assets.copyMode,
      receiptFilename: assets.receiptFilename,
      copyGroups: new Set<string>(),
      rendererIds: new Set<string>()
    }
    assets.copyGroups.forEach((item) => group.copyGroups.add(item))
    assets.rendererIds.forEach((item) => group.rendererIds.add(item))
    assetGroups.set(key, group)
  }
  const assetPackages = [
    ...new Set([...assetGroups.values()].map((group) => group.packageName))
  ].sort()
  const versionByPackage = new Map<string, string>()
  const requirePackage = (packageName: string, version: string) => {
    const existing = versionByPackage.get(packageName)
    if (existing && existing !== version)
      throw new Error(`Catalog version conflict for ${packageName}: ${existing} vs ${version}.`)
    versionByPackage.set(packageName, version)
  }
  requirePackage(catalog.core.packageName, catalog.core.version)
  requirePackage(frameworkEntry.packageName, frameworkEntry.version)
  if (profile) requirePackage(profile.packageName, profile.version)
  for (const capability of selectedCapabilities)
    requirePackage(capability.packageName, capability.version)
  for (const group of assetGroups.values()) {
    requirePackage(group.packageName, group.packageVersion)
    requirePackage(group.installerPackageName, group.installerPackageVersion)
  }
  const packages = [...versionByPackage.keys()]
  const requiredPackages = packages.map((packageName) => ({
    packageName,
    version: versionByPackage.get(packageName)!
  }))
  const packageSpecs = await resolvePackageSpecs(requiredPackages, config.source, projectRoot)
  const assetRendererIds = [
    ...new Set([...assetGroups.values()].flatMap((group) => [...group.rendererIds]))
  ].sort()
  const install = installStep(
    manager,
    packageSpecs,
    projectRoot,
    config.source,
    config.packageManagerVersion
  )
  const assetSteps: FileViewerCommandStep[] = [...assetGroups.values()]
    .sort((left, right) => left.packageName.localeCompare(right.packageName))
    .map((group) => {
      const copyGroups = [...group.copyGroups].sort()
      const binArgs = [group.target]
      const binary = packageBinaryStep(
        group.bin,
        binArgs,
        projectRoot,
        group.installerPackageName,
        group.installerPackageVersion
      )
      return {
        id: `assets:${group.packageName}`,
        kind: 'assets' as const,
        ...binary,
        assetOwner: {
          packageName: group.packageName,
          packageVersion: group.packageVersion,
          target: group.target,
          copyGroups,
          receiptFilename: group.receiptFilename,
          expectedProfileManifestSha256:
            group.packageName === profile?.assetPackageName
              ? profile?.profileManifestSha256
              : undefined
        }
      }
    })
  if (config.profile === 'full') {
    const binary = packageBinaryStep(
      'file-viewer-copy-assets',
      [effectiveAssetTarget],
      projectRoot,
      config.framework === 'web' ? frameworkEntry.packageName : 'file-viewer-copy-assets',
      config.framework === 'web' ? frameworkEntry.version : catalog.core.version
    )
    assetSteps.push({ id: 'assets:file-viewer-copy-assets', kind: 'assets' as const, ...binary })
  }
  const licenseNotices = new Map<string, { packageName: string; spdx: string; policy: string }>()
  for (const capability of reportingCapabilities) {
    licenseNotices.set(capability.packageName, {
      packageName: capability.packageName,
      spdx: capability.license.spdx,
      policy: capability.license.policy
    })
    for (const notice of capability.license.notices ?? []) {
      licenseNotices.set(notice.packageName, {
        packageName: notice.packageName,
        spdx: notice.spdx,
        policy: 'transitive-notice'
      })
    }
  }
  const assetCommands = assetSteps.map((step) => displayCommand(step.command, step.args))
  return {
    schemaVersion: 1,
    framework: config.framework,
    profile: config.profile,
    packageManager: manager,
    ...(config.packageManagerVersion
      ? { packageManagerVersion: config.packageManagerVersion }
      : {}),
    packages,
    packageSpecs,
    requiredPackages,
    capabilityPackages,
    heavyCapabilities: [
      ...new Set(
        reportingCapabilities
          .filter((capability) => capability.weight === 'heavy')
          .map((capability) => capability.id)
      )
    ].sort(),
    licenseNotices: [...licenseNotices.values()].sort((left, right) =>
      left.packageName.localeCompare(right.packageName)
    ),
    assetPackages:
      config.profile === 'full'
        ? [config.framework === 'web' ? frameworkEntry.packageName : 'file-viewer-copy-assets']
        : assetPackages,
    assetRendererIds,
    missingAssetRendererIds: [...new Set(missingAssetRendererIds)].sort(),
    estimates: requested.length ? null : (profile?.estimates ?? null),
    ...(config.profile === 'full' && catalog.legacyFull?.referenceColdInstall
      ? { legacyFullEstimate: catalog.legacyFull.referenceColdInstall }
      : {}),
    steps: [install, ...assetSteps],
    command: displayCommand(install.command, install.args),
    assetCommands,
    assetCommand: assetCommands.join('\n'),
    assetTarget: effectiveAssetTarget,
    generatedModule: config.generatedModule,
    integrationImport: applicationImportStatement(projectRoot, config.generatedModule, config.entry)
  }
}

export function executeFileViewerPlanStep(
  step: import('./types.js').FileViewerCommandStep,
  options: {
    confirmed?: boolean
    runner?: typeof spawnSync
  } = {}
): import('./types.js').FileViewerCommandExecutionResult {
  if (!options.confirmed) return { executed: false, step, status: null }
  const runner = options.runner ?? spawnSync
  let command = step.command
  let commandArgs = step.args
  const environment = step.env ? { ...process.env, ...step.env } : process.env
  if (step.expectedExecutableVersion) {
    const probe = runner(command, ['--version'], {
      cwd: step.cwd,
      encoding: 'utf8',
      shell: false,
      env: environment
    })
    if (probe.error) throw probe.error
    const actual = String(probe.stdout ?? '').trim()
    if (probe.status !== 0 || actual !== step.expectedExecutableVersion) {
      throw new Error(
        `${command} resolved to ${actual || `status ${String(probe.status)}`}; expected exact ${step.expectedExecutableVersion}. Activate that package-manager version (for example with Corepack) before continuing.`
      )
    }
  }
  if (step.executableOwner) {
    const require = createRequire(resolve(step.cwd, 'package.json'))
    let packagePath: string
    try {
      packagePath = require.resolve(`${step.executableOwner.packageName}/package.json`)
    } catch (error) {
      throw new Error(
        `Required local asset executable ${step.executableOwner.packageName}@${step.executableOwner.packageVersion} is not installed; refusing registry fallback. ${(error as Error).message}`,
        { cause: error }
      )
    }
    const manifest = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      version?: string
      bin?: string | Record<string, string>
    }
    if (manifest.version !== step.executableOwner.packageVersion) {
      throw new Error(
        `Local asset executable ${step.executableOwner.packageName} is ${String(manifest.version)}; expected ${step.executableOwner.packageVersion}.`
      )
    }
    const relativeBin =
      typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[step.executableOwner.bin]
    if (!relativeBin) {
      throw new Error(
        `${step.executableOwner.packageName}@${step.executableOwner.packageVersion} does not declare ${step.executableOwner.bin}.`
      )
    }
    const packageRoot = realpathSync(dirname(packagePath))
    const executable = realpathSync(resolve(packageRoot, relativeBin))
    const relation = relative(packageRoot, executable)
    if (!relation || relation.startsWith('..') || isAbsolute(relation))
      throw new Error(
        `Local asset executable ${step.executableOwner.bin} escapes its owner package.`
      )
    if (!statSync(executable).isFile())
      throw new Error(`Local asset executable ${step.executableOwner.bin} is not a regular file.`)
    command = process.execPath
    commandArgs = [executable, ...step.args]
  }
  const result = runner(command, commandArgs, {
    cwd: step.cwd,
    stdio: 'inherit',
    shell: false,
    env: environment
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${displayCommand(command, commandArgs)} exited with status ${String(result.status)}.`
    )
  }
  return { executed: true, step, status: result.status }
}

export async function reconcileFileViewerAssetOwners(
  projectRoot: string,
  plan: FileViewerInstallPlan
) {
  const targets = new Map<string, Set<string>>()
  for (const step of plan.steps.filter((step) => step.kind === 'assets' && step.assetOwner)) {
    const target = step.assetOwner!.target
    const owners = targets.get(target) ?? new Set<string>()
    owners.add(step.assetOwner!.packageName)
    targets.set(target, owners)
  }
  if (!targets.size) targets.set(plan.assetTarget, new Set())
  const removed: Array<{ packageName: string; receiptFilename: string; removedFiles: string[] }> =
    []
  for (const [target, plannedOwners] of targets) {
    const targetDir = resolve(projectRoot, target)
    const ledger = await readFileViewerAssetLedger(targetDir)
    const installedOwners = new Map<string, string>()
    for (const entry of ledger.entries)
      installedOwners.set(entry.ownerPackage, entry.receiptFilename)
    for (const path of ledger.paths) {
      for (const owner of path.owners) installedOwners.set(owner.packageName, owner.receiptFilename)
    }
    for (const [packageName, receiptFilename] of installedOwners) {
      if (plannedOwners.has(packageName)) continue
      if (packageName === 'file-viewer-copy-assets') {
        continue
      }
      if (!packageName.startsWith('@file-viewer/assets-')) continue
      const result = await uninstallFileViewerCapabilityAssetPack(
        targetDir,
        packageName,
        receiptFilename
      )
      if (result.changed)
        removed.push({ packageName, receiptFilename, removedFiles: result.removedFiles })
    }
  }
  return removed
}

export async function reconcileFileViewerManagedDependencies(
  projectRoot: string,
  configInput: Partial<FileViewerProjectConfig>,
  plan: FileViewerInstallPlan,
  options: { write?: boolean } = {}
) {
  const config = normalizeFileViewerConfig(configInput)
  const manifestPath = resolve(projectRoot, 'package.json')
  const previousText = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(previousText) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
  }
  const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies'] as const
  const declaredBefore = new Set(
    dependencyFields.flatMap((field) => Object.keys(manifest[field] ?? {}))
  )
  const required = new Set(plan.requiredPackages.map((item) => item.packageName))
  const catalog = await loadFileViewerCliCatalog()
  const heavyPackages = new Set(
    catalog.capabilities
      .filter((capability) => capability.weight === 'heavy')
      .flatMap((capability) => [
        capability.packageName,
        capability.assets.packageName,
        capability.assets.installerPackageName
      ])
      .filter((packageName): packageName is string => Boolean(packageName))
  )
  const previousManaged = new Set(config.managedPackages ?? [])
  const obsoleteHeavyPackages = [...previousManaged]
    .filter((packageName) => heavyPackages.has(packageName) && !required.has(packageName))
    .sort()
  const removedDeclarations: string[] = []
  for (const packageName of obsoleteHeavyPackages) {
    for (const field of dependencyFields) {
      if (!manifest[field]?.[packageName]) continue
      delete manifest[field]![packageName]
      removedDeclarations.push(packageName)
    }
  }
  const managedPackages = [
    ...new Set([
      ...[...previousManaged].filter(
        (packageName) => required.has(packageName) && !obsoleteHeavyPackages.includes(packageName)
      ),
      ...[...required].filter((packageName) => !declaredBefore.has(packageName))
    ])
  ].sort()
  const indent = previousText.match(/\n([ \t]+)"/)?.[1] ?? '  '
  const newline = previousText.includes('\r\n') ? '\r\n' : '\n'
  const nextText = `${JSON.stringify(manifest, null, indent).replace(/\n/g, newline)}${newline}`
  const manifestChanged = removedDeclarations.length > 0 && previousText !== nextText
  if (options.write && manifestChanged) await atomicWriteText(manifestPath, nextText)
  return {
    obsoleteHeavyPackages,
    removedDeclarations: [...new Set(removedDeclarations)].sort(),
    managedPackages,
    manifestChanged,
    manifestWritten: Boolean(options.write && manifestChanged),
    config: stableConfig({ ...config, managedPackages })
  }
}

const atomicWriteText = async (path: string, content: string) => {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

export async function initializeFileViewerProject(
  projectRoot: string,
  input: Partial<FileViewerProjectConfig>,
  options: { configFile?: string; write?: boolean; force?: boolean } = {}
) {
  const config = normalizeFileViewerConfig(input)
  const configPath = resolveContainedProjectFile(
    projectRoot,
    options.configFile ?? DEFAULT_FILE_VIEWER_CONFIG,
    'configFile'
  )
  const content = `${JSON.stringify(config, null, 2)}\n`
  let existing: string | null = null
  try {
    existing = await readFile(configPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  if (existing !== null && existing !== content && !options.force) {
    throw new Error(
      `${basename(configPath)} already exists with different settings; use --force to replace it.`
    )
  }
  const changed = existing !== content
  if (options.write && changed) {
    await mkdir(dirname(configPath), { recursive: true })
    await atomicWriteText(configPath, content)
  }
  return { changed, written: Boolean(options.write && changed), configPath, config }
}

function createQuickstartSamplePdf() {
  const stream = 'BT\n/F1 24 Tf\n72 720 Td\n(File Viewer quickstart) Tj\nET\n'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`
  ]
  let pdf = '%PDF-1.4\n% File Viewer quickstart\n'
  const offsets: number[] = []
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii')
  const entries = offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')
  return `${pdf}xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
}

type QuickstartSample = {
  filename: string
  content: string
  rendererId: string
  picker?: {
    capabilityId: string
    accept: string
  }
}

const quickstartSamples: Record<string, () => QuickstartSample> = {
  pdf: () => ({ filename: 'sample.pdf', content: createQuickstartSamplePdf(), rendererId: 'pdf' }),
  image: () => ({
    filename: 'sample.svg',
    rendererId: 'image',
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs><rect width="960" height="540" rx="32" fill="url(#g)"/><circle cx="160" cy="270" r="82" fill="white" opacity=".9"/><path d="M125 270h70M160 235v70" stroke="#2563eb" stroke-width="18" stroke-linecap="round"/><text x="280" y="250" fill="white" font-family="system-ui,sans-serif" font-size="58" font-weight="700">File Viewer</text><text x="282" y="315" fill="white" opacity=".86" font-family="system-ui,sans-serif" font-size="28">Lightweight quickstart</text></svg>\n'
  }),
  text: () => ({
    filename: 'sample.md',
    rendererId: 'code',
    content:
      '# File Viewer quickstart\n\nThis Markdown file is rendered by the lightweight text renderer.\n'
  }),
  model: () => ({
    filename: 'sample.obj',
    rendererId: 'model',
    content:
      '# File Viewer quickstart triangle\no Quickstart\nv -1 -0.7 0\nv 1 -0.7 0\nv 0 1 0\nf 1 2 3\n'
  }),
  geo: () => ({
    filename: 'sample.geojson',
    rendererId: 'geo',
    content:
      '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"File Viewer"},"geometry":{"type":"Polygon","coordinates":[[[116.30,39.85],[116.50,39.85],[116.50,40.00],[116.30,40.00],[116.30,39.85]]]}}]}\n'
  }),
  cad: () => ({
    filename: 'sample.dxf',
    rendererId: 'cad',
    content:
      '0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n30\n0\n11\n100\n21\n100\n31\n0\n0\nCIRCLE\n8\n0\n10\n50\n20\n50\n30\n0\n40\n25\n0\nENDSEC\n0\nEOF\n'
  }),
  drawing: () => ({
    filename: 'sample.mmd',
    rendererId: 'drawing',
    content:
      'graph LR\n  Upload[Choose a file] --> Preview[Preview locally]\n  Preview --> Done[Keep data private]\n'
  }),
  email: () => ({
    filename: 'sample.eml',
    rendererId: 'email',
    content:
      'From: admin@flyfish.dev\r\nTo: developer@example.test\r\nSubject: File Viewer quickstart\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nThis message is rendered locally by File Viewer.\r\n'
  }),
  spreadsheet: () => ({
    filename: 'sample.csv',
    rendererId: 'spreadsheet-openxml',
    content: 'Feature,Status\nBrowser-native,Ready\nOffline assets,Ready\n'
  }),
  rtf: () => ({
    filename: 'sample.rtf',
    rendererId: 'office-word-binary',
    content:
      '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Arial;}}\\f0\\fs36 File Viewer quickstart\\par\\fs24 Rendered locally.}\n'
  })
}

const sampleKindForCapability = (capability: FileViewerCapabilityCatalogEntry) => {
  const byId: Record<string, string> = {
    pdf: 'pdf',
    'pdf-identity-font-repair': 'pdf',
    image: 'image',
    text: 'text',
    'text-tools': 'text',
    model: 'model',
    geo: 'geo',
    cad: 'cad',
    drawing: 'drawing',
    'mermaid-markdown': 'drawing',
    'drawio-official': 'drawing',
    email: 'email',
    spreadsheet: 'spreadsheet',
    rtf: 'rtf'
  }
  return byId[capability.id] ?? null
}

function selectQuickstartSample(
  config: FileViewerProjectConfig,
  catalog: FileViewerCliCatalog
): QuickstartSample {
  if (['standard', 'office', 'all', 'full'].includes(config.profile)) return quickstartSamples.pdf()
  if (config.profile === 'lite') return quickstartSamples.image()
  if (config.profile === 'engineering') return quickstartSamples.model()
  const tokens = normalizeList([...config.formats, ...config.capabilities])
  if (!tokens.length) {
    throw new Error(
      'The custom profile requires at least one --format or --capability. No files were written.'
    )
  }
  const capabilities = tokens
    .map((token) => capabilityForToken(token, catalog))
    .filter(Boolean) as FileViewerCapabilityCatalogEntry[]
  for (const capability of capabilities) {
    const kind = sampleKindForCapability(capability)
    if (kind && quickstartSamples[kind]) {
      const sample = quickstartSamples[kind]()
      const sampleExtension = sample.filename.split('.').at(-1) ?? ''
      if (tokens.includes(capability.id) || tokens.includes(sampleExtension)) return sample
    }
  }
  const capability = capabilities[0]
  if (!capability) throw new Error(`No File Viewer capability provides "${tokens[0]}".`)
  return {
    filename: '',
    content: '',
    rendererId: capability.rendererIds[0] ?? capability.id,
    picker: {
      capabilityId: capability.id,
      accept: capability.formats.map((format) => `.${format}`).join(',')
    }
  }
}

const quickstartNodeEngine = '^20.19.0 || >=22.12.0'
const quickstartNodeGuard = `const [major, minor] = process.versions.node.split('.').map(Number)
const supported =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 12) ||
  major > 22
if (!supported) {
  console.error(
    'File Viewer quickstart uses Vite 8 and requires Node ${quickstartNodeEngine}; current ' +
      process.version +
      '. Upgrade Node, remove node_modules, and reinstall dependencies.'
  )
  process.exit(1)
}
`

export async function scaffoldFileViewerQuickstart(
  projectRoot: string,
  input: Partial<FileViewerProjectConfig>,
  options: { write?: boolean; force?: boolean } = {}
) {
  const config = normalizeFileViewerConfig(input)
  const catalog = await loadFileViewerCliCatalog()
  const frameworkPackage = (
    config.profile === 'full'
      ? catalog.frameworkOverrides?.full?.[config.framework]
      : catalog.frameworks[config.framework]
  )?.packageName
  if (!frameworkPackage)
    throw new Error(`No package is available for ${config.framework}/${config.profile}.`)
  const generatedRelation = relative('src', config.generatedModule).replace(/\\/g, '/')
  const generatedImport = generatedRelation.startsWith('.')
    ? generatedRelation
    : `./${generatedRelation}`
  const template = catalog.frameworkTemplates?.[config.framework]
  if (!template)
    throw new Error(`The CLI catalog has no validated ${config.framework} project template.`)
  const frameworkVersion = config.frameworkVersion ?? template.defaultVersion
  const selectedTemplate = template.validatedVersions[frameworkVersion]
  if (!selectedTemplate)
    throw new Error(
      `Unsupported ${config.framework} version ${frameworkVersion}. Validated versions: ${Object.keys(template.validatedVersions).join(', ')}.`
    )
  const sample = selectQuickstartSample(config, catalog)
  const sampleUrl = `/${sample.filename}`
  const fixtureModuleByFramework: Record<FileViewerFramework, string> = {
    web: `import ${JSON.stringify(generatedImport)};\nimport { defineFileViewerElement } from ${JSON.stringify(frameworkPackage)};\ndefineFileViewerElement();\nconst viewer = document.createElement('flyfish-file-viewer');\nviewer.setAttribute('src', ${JSON.stringify(sampleUrl)});\nviewer.setAttribute('filename', ${JSON.stringify(sample.filename)});\nviewer.style.cssText = 'display:block;height:100vh';\ndocument.querySelector('#app').append(viewer);\n`,
    vue3: `import ${JSON.stringify(generatedImport)};\nimport { createApp, h } from 'vue';\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\ncreateApp({ render: () => h(FileViewer, { url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} }) }).mount('#app');\n`,
    'vue2.7': `import Vue from 'vue';\nimport ${JSON.stringify(generatedImport)};\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\nnew Vue({ render: h => h(FileViewer, { props: { url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} } }) }).$mount('#app');\n`,
    'vue2.6': `import Vue from 'vue';\nimport ${JSON.stringify(generatedImport)};\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\nnew Vue({ render: h => h(FileViewer, { props: { url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} } }) }).$mount('#app');\n`,
    react: `import ${JSON.stringify(generatedImport)};\nimport React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\ncreateRoot(document.querySelector('#app')).render(React.createElement(FileViewer, { url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} }));\n`,
    'react-legacy': `import ${JSON.stringify(generatedImport)};\nimport React from 'react';\nimport ReactDOM from 'react-dom';\nimport { FileViewerLegacy } from ${JSON.stringify(frameworkPackage)};\nReactDOM.render(React.createElement(FileViewerLegacy, { url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} }), document.querySelector('#app'));\n`,
    svelte:
      selectedTemplate.templateVariant === 'svelte-classic'
        ? `import ${JSON.stringify(generatedImport)};\nimport App from './App.svelte';\nnew App({ target: document.querySelector('#app') });\n`
        : `import ${JSON.stringify(generatedImport)};\nimport { mount } from 'svelte';\nimport App from './App.svelte';\nmount(App, { target: document.querySelector('#app') });\n`,
    jquery: `import ${JSON.stringify(generatedImport)};\nimport $ from 'jquery';\nimport installFileViewer from ${JSON.stringify(frameworkPackage)};\ninstallFileViewer($);\n$('#app').fileViewer({ url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} });\n`
  }
  const pickerLabel = `Choose a ${sample.picker?.capabilityId ?? 'supported'} file`
  const pickerAccept = sample.picker?.accept ?? ''
  const pickerModuleByFramework: Record<FileViewerFramework, string> = {
    web: `import ${JSON.stringify(generatedImport)};\nimport { defineFileViewerElement } from ${JSON.stringify(frameworkPackage)};\ndefineFileViewerElement();\nconst root = document.querySelector('#app');\nconst input = document.createElement('input');\ninput.type = 'file';\ninput.accept = ${JSON.stringify(pickerAccept)};\ninput.setAttribute('aria-label', ${JSON.stringify(pickerLabel)});\nconst viewer = document.createElement('flyfish-file-viewer');\nviewer.style.cssText = 'display:block;height:calc(100vh - 44px)';\ninput.addEventListener('change', () => { const file = input.files?.[0]; if (file) { viewer.file = file; viewer.filename = file.name; } });\nroot.append(input, viewer);\n`,
    vue3: `import ${JSON.stringify(generatedImport)};\nimport { createApp, h, ref } from 'vue';\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\ncreateApp({ setup() { const file = ref(null); return () => h('div', { style: 'height:100vh' }, [h('input', { type: 'file', accept: ${JSON.stringify(pickerAccept)}, 'aria-label': ${JSON.stringify(pickerLabel)}, onChange: event => { file.value = event.target.files?.[0] || null; } }), h(FileViewer, { file: file.value, filename: file.value?.name, style: { height: 'calc(100vh - 44px)' } })]); } }).mount('#app');\n`,
    'vue2.7': `import Vue from 'vue';\nimport ${JSON.stringify(generatedImport)};\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\nnew Vue({ data: () => ({ selectedFile: null }), render(h) { return h('div', { style: { height: '100vh' } }, [h('input', { attrs: { type: 'file', accept: ${JSON.stringify(pickerAccept)}, 'aria-label': ${JSON.stringify(pickerLabel)} }, on: { change: event => { this.selectedFile = event.target.files?.[0] || null; } } }), h(FileViewer, { props: { file: this.selectedFile, filename: this.selectedFile?.name }, style: { height: 'calc(100vh - 44px)' } })]); } }).$mount('#app');\n`,
    'vue2.6': `import Vue from 'vue';\nimport ${JSON.stringify(generatedImport)};\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\nnew Vue({ data: () => ({ selectedFile: null }), render(h) { return h('div', { style: { height: '100vh' } }, [h('input', { attrs: { type: 'file', accept: ${JSON.stringify(pickerAccept)}, 'aria-label': ${JSON.stringify(pickerLabel)} }, on: { change: event => { this.selectedFile = event.target.files?.[0] || null; } } }), h(FileViewer, { props: { file: this.selectedFile, filename: this.selectedFile?.name }, style: { height: 'calc(100vh - 44px)' } })]); } }).$mount('#app');\n`,
    react: `import ${JSON.stringify(generatedImport)};\nimport React, { useState } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { FileViewer } from ${JSON.stringify(frameworkPackage)};\nfunction App() { const [file, setFile] = useState(null); return React.createElement('div', { style: { height: '100vh' } }, React.createElement('input', { type: 'file', accept: ${JSON.stringify(pickerAccept)}, 'aria-label': ${JSON.stringify(pickerLabel)}, onChange: event => setFile(event.target.files?.[0] || null) }), React.createElement(FileViewer, { file, filename: file?.name, style: { height: 'calc(100vh - 44px)' } })); }\ncreateRoot(document.querySelector('#app')).render(React.createElement(App));\n`,
    'react-legacy': `import ${JSON.stringify(generatedImport)};\nimport React, { useState } from 'react';\nimport ReactDOM from 'react-dom';\nimport { FileViewerLegacy } from ${JSON.stringify(frameworkPackage)};\nfunction App() { const [file, setFile] = useState(null); return React.createElement('div', { style: { height: '100vh' } }, React.createElement('input', { type: 'file', accept: ${JSON.stringify(pickerAccept)}, 'aria-label': ${JSON.stringify(pickerLabel)}, onChange: event => setFile(event.target.files?.[0] || null) }), React.createElement(FileViewerLegacy, { file, filename: file?.name, style: { height: 'calc(100vh - 44px)' } })); }\nReactDOM.render(React.createElement(App), document.querySelector('#app'));\n`,
    svelte: fixtureModuleByFramework.svelte,
    jquery: `import ${JSON.stringify(generatedImport)};\nimport $ from 'jquery';\nimport installFileViewer from ${JSON.stringify(frameworkPackage)};\ninstallFileViewer($);\nconst input = $('<input>', { type: 'file', accept: ${JSON.stringify(pickerAccept)}, 'aria-label': ${JSON.stringify(pickerLabel)} });\ninput.on('change', event => { const file = event.target.files?.[0]; if (file) $('#app').fileViewer({ file, filename: file.name }); });\n$('body').prepend(input);\n`
  }
  const moduleByFramework = sample.picker ? pickerModuleByFramework : fixtureModuleByFramework
  const devDependencies = {
    vite: selectedTemplate.viteVersion,
    ...(selectedTemplate.vitePluginSvelteVersion
      ? { '@sveltejs/vite-plugin-svelte': selectedTemplate.vitePluginSvelteVersion }
      : {})
  }
  const files = new Map<string, string>([
    [
      'package.json',
      `${JSON.stringify(
        {
          private: true,
          type: 'module',
          ...(config.packageManager && config.packageManagerVersion
            ? { packageManager: `${config.packageManager}@${config.packageManagerVersion}` }
            : {}),
          scripts: {
            dev: 'node ./scripts/check-node.mjs && vite',
            build: 'node ./scripts/check-node.mjs && vite build'
          },
          engines: { node: quickstartNodeEngine },
          dependencies: selectedTemplate.runtimeDependencies,
          devDependencies
        },
        null,
        2
      )}\n`
    ],
    ['scripts/check-node.mjs', quickstartNodeGuard],
    [
      'index.html',
      '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>File Viewer</title></head><body style="margin:0"><div id="app" style="height:100vh"></div><script type="module" src="/src/main.mjs"></script></body></html>\n'
    ],
    ...(sample.picker ? [] : [[`public/${sample.filename}`, sample.content] as const]),
    ['src/main.mjs', moduleByFramework[config.framework]],
    ...(config.framework === 'svelte'
      ? [
          [
            'src/App.svelte',
            sample.picker
              ? `<script>\n  import { fileViewer } from ${JSON.stringify(`${frameworkPackage}/action`)};\n  let selectedFile = null;\n</script>\n\n<input type="file" accept=${JSON.stringify(pickerAccept)} aria-label=${JSON.stringify(pickerLabel)} on:change={event => selectedFile = event.currentTarget.files?.[0] || null} />\n<div use:fileViewer={{ file: selectedFile, filename: selectedFile?.name }}></div>\n\n<style>\n  div { height: calc(100vh - 44px); }\n</style>\n`
              : `<script>\n  import { fileViewer } from ${JSON.stringify(`${frameworkPackage}/action`)};\n</script>\n\n<div use:fileViewer={{ url: ${JSON.stringify(sampleUrl)}, filename: ${JSON.stringify(sample.filename)} }}></div>\n\n<style>\n  div { height: 100vh; }\n</style>\n`
          ] as const
        ]
      : []),
    ...(config.framework === 'svelte'
      ? [
          [
            'vite.config.mjs',
            `import { defineConfig } from 'vite';\nimport { svelte } from '@sveltejs/vite-plugin-svelte';\nexport default defineConfig({ plugins: [svelte()] });\n`
          ] as const
        ]
      : []),
    ...(config.packageManager === 'yarn' &&
    Number(config.packageManagerVersion?.match(/^(\d+)/)?.[1] ?? 0) >= 2
      ? [['.yarnrc.yml', 'nodeLinker: node-modules\nenableGlobalCache: true\n'] as const]
      : [])
  ])
  const conflicts: string[] = []
  for (const [relativePath, content] of files) {
    const previous = await readFile(resolve(projectRoot, relativePath), 'utf8').catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    })
    if (previous !== null && previous !== content && !options.force) conflicts.push(relativePath)
  }
  if (conflicts.length) {
    throw new Error(
      `Scaffold conflicts with existing files: ${conflicts.join(', ')}. No files were written; use --force to replace only these scaffold-owned files.`
    )
  }
  const results: Array<{ path: string; changed: boolean; written: boolean }> = []
  for (const [relativePath, content] of files) {
    const path = resolve(projectRoot, relativePath)
    const previous = await readFile(path, 'utf8').catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    })
    const changed = previous !== content
    if (options.write && changed) {
      await mkdir(dirname(path), { recursive: true })
      await atomicWriteText(path, content)
    }
    results.push({ path, changed, written: Boolean(options.write && changed) })
  }
  return { frameworkPackage, frameworkVersion, sample, files: results }
}

const applicationEntryCandidates = [
  'src/main.ts',
  'src/main.tsx',
  'src/main.js',
  'src/main.jsx',
  'src/main.mjs',
  'src/index.ts',
  'src/index.tsx',
  'src/index.js',
  'src/index.jsx'
]

export const listFileViewerApplicationEntries = (projectRoot: string) =>
  applicationEntryCandidates.filter((candidate) => existsSync(resolve(projectRoot, candidate)))

const managedEntryMarker = '// file-viewer:generated-integration'

function removeManagedEntryBlock(content: string) {
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim() !== managedEntryMarker) continue
    lines.splice(index, 1)
    const following = lines[index] ?? ''
    const managedImport = following.match(/^\s*import\s+(['"])([^'"]+)\1\s*;?\s*$/)
    if (managedImport && /(?:file-viewer|generated)/i.test(managedImport[2])) lines.splice(index, 1)
  }
  return lines.join(newline)
}

function applicationPrologueOffset(content: string) {
  let offset = content.charCodeAt(0) === 0xfeff ? 1 : 0
  if (content.startsWith('#!', offset)) {
    const newline = content.indexOf('\n', offset)
    offset = newline === -1 ? content.length : newline + 1
  }
  const skipTrivia = (start: number) => {
    let cursor = start
    while (cursor < content.length) {
      if (/\s/.test(content[cursor])) {
        cursor += 1
        continue
      }
      if (content.startsWith('//', cursor)) {
        const newline = content.indexOf('\n', cursor + 2)
        cursor = newline === -1 ? content.length : newline + 1
        continue
      }
      if (content.startsWith('/*', cursor)) {
        const close = content.indexOf('*/', cursor + 2)
        cursor = close === -1 ? content.length : close + 2
        continue
      }
      break
    }
    return cursor
  }
  let cursor = skipTrivia(offset)
  let insertionOffset = cursor
  while (cursor < content.length) {
    const lineEnd = content.indexOf('\n', cursor)
    const end = lineEnd === -1 ? content.length : lineEnd + 1
    const line = content.slice(cursor, lineEnd === -1 ? content.length : lineEnd).replace(/\r$/, '')
    if (!/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*;?\s*(?:\/\/.*)?$/.test(line)) break
    cursor = skipTrivia(end)
    insertionOffset = cursor
  }
  return insertionOffset
}

export async function patchFileViewerApplicationEntry(
  projectRoot: string,
  generatedModule: string,
  options: { write?: boolean; entry?: string } = {}
) {
  const availableEntries = listFileViewerApplicationEntries(projectRoot)
  const entry = options.entry
    ? normalizeProjectRelativePath(options.entry, 'entry')
    : availableEntries.length === 1
      ? availableEntries[0]
      : null
  if (!options.entry && availableEntries.length > 1) {
    throw new Error(
      `Multiple application entries were found (${availableEntries.join(', ')}). Pass --entry explicitly.`
    )
  }
  if (!entry)
    return {
      entry: null,
      availableEntries,
      changed: false,
      written: false,
      warning: `No supported application entry was found. Import ./${generatedModule} from your application entry.`
    }
  const entryPath = resolve(projectRoot, entry)
  if (!existsSync(entryPath)) throw new Error(`Application entry ${entry} does not exist.`)
  const generatedPath = resolve(
    projectRoot,
    normalizeProjectRelativePath(generatedModule, 'generatedModule')
  )
  let relation = relative(dirname(entryPath), generatedPath).replace(/\\/g, '/')
  if (!relation.startsWith('.')) relation = `./${relation}`
  const statement = `import ${JSON.stringify(relation)};`
  const previous = await readFile(entryPath, 'utf8')
  const withoutManagedBlock = removeManagedEntryBlock(previous)
  let content = withoutManagedBlock
  if (!withoutManagedBlock.includes(statement)) {
    const newline = previous.includes('\r\n') ? '\r\n' : '\n'
    const offset = applicationPrologueOffset(withoutManagedBlock)
    const separator = offset > 0 && withoutManagedBlock[offset - 1] !== '\n' ? newline : ''
    const block = `${managedEntryMarker}${newline}${statement}${newline}`
    content = `${withoutManagedBlock.slice(0, offset)}${separator}${block}${withoutManagedBlock.slice(offset)}`
  }
  const changed = content !== previous
  if (options.write && changed) await atomicWriteText(entryPath, content)
  return {
    entry,
    availableEntries,
    entryPath,
    generatedModule,
    statement,
    changed,
    written: Boolean(options.write && changed),
    content
  }
}

export async function generateFileViewerIntegrationModule(
  projectRoot: string,
  input: Partial<FileViewerProjectConfig>,
  options: { write?: boolean; output?: string; force?: boolean } = {}
) {
  const config = normalizeFileViewerConfig(input)
  const catalog = await loadFileViewerCliCatalog()
  const profile =
    config.profile === 'custom' || config.profile === 'full'
      ? null
      : (catalog.profiles.find((candidate) => candidate.id === config.profile) ?? null)
  if (config.profile !== 'custom' && config.profile !== 'full' && !profile)
    throw new Error(`Unknown generated profile ${config.profile}.`)
  const explicit = normalizeList([...config.formats, ...config.capabilities]).map((token) => {
    const capability = capabilityForToken(token, catalog)
    if (!capability) throw new Error(`No File Viewer capability provides "${token}".`)
    return capability
  })
  const selectedSource =
    config.profile === 'full'
      ? [
          ...catalog.capabilities.filter((capability) =>
            (catalog.legacyFull?.excludedFutureCapabilities ?? []).includes(capability.id)
          ),
          ...explicit.filter((capability) =>
            (catalog.legacyFull?.excludedFutureCapabilities ?? []).includes(capability.id)
          )
        ]
      : explicit
  const selected = [
    ...new Map(selectedSource.map((capability) => [capability.packageName, capability])).values()
  ].filter((capability) => !profile?.capabilityPackages.includes(capability.packageName))
  const imports = [
    "import { registerFileViewerAutoRendererPreset, setDefaultFileViewerAssetBaseUrl } from '@file-viewer/core';"
  ]
  const rendererNames: string[] = []
  if (profile) {
    imports.push(`import fileViewerProfilePreset from ${JSON.stringify(profile.packageName)};`)
  } else if (config.profile === 'full') {
    const fullPackage = catalog.frameworkOverrides?.full?.[config.framework]
    if (!fullPackage)
      throw new Error(`No legacy-compatible full package exists for ${config.framework}.`)
    const presetEntry =
      config.framework === 'svelte' ? `${fullPackage.packageName}/action` : fullPackage.packageName
    imports.push(
      `import { fileViewerFullPreset as fileViewerProfilePreset } from ${JSON.stringify(presetEntry)};`
    )
  }
  let rendererIndex = 0
  for (const capability of selected) {
    const activation = capability.activation
    if (!activation) throw new Error(`Capability ${capability.id} has no activation contract.`)
    if (activation.kind === 'renderer-export') {
      if (!activation.export)
        throw new Error(`Renderer capability ${capability.id} has no activation export.`)
      const local = `fileViewerRenderer${rendererIndex++}`
      imports.push(
        `import { ${activation.export} as ${local} } from ${JSON.stringify(activation.import)};`
      )
      rendererNames.push(local)
    } else {
      imports.push(`import ${JSON.stringify(activation.import)};`)
    }
  }
  const profileRenderers =
    profile || config.profile === 'full' ? '...fileViewerProfilePreset.renderers,' : ''
  const generatedAssetBaseUrl =
    config.assetBaseUrl ?? inferFileViewerLocalAssetBaseUrl(config.assetTarget)
  const content = `${[
    '// Generated by @file-viewer/cli. Edit file-viewer.config.json and regenerate instead of editing this file.',
    ...imports,
    ...(generatedAssetBaseUrl
      ? [`setDefaultFileViewerAssetBaseUrl(${JSON.stringify(generatedAssetBaseUrl)});`]
      : []),
    '',
    'export const fileViewerGeneratedPreset = {',
    "  id: 'file-viewer-generated',",
    "  label: 'Generated File Viewer integration',",
    `  renderers: [${profileRenderers}${rendererNames.join(',')}],`,
    '};',
    "registerFileViewerAutoRendererPreset(fileViewerGeneratedPreset, { id: 'generated', packageName: '@file-viewer/cli' });",
    'export default fileViewerGeneratedPreset;',
    ''
  ].join('\n')}`
  const relativeOutput = normalizeProjectRelativePath(
    options.output ?? config.generatedModule,
    'generatedModule'
  )
  const outputPath = resolve(projectRoot, relativeOutput)
  const relation = relative(resolve(projectRoot), outputPath)
  if (!relation || relation.startsWith('..'))
    throw new Error('generatedModule escapes the project root.')
  const previous = await readFile(outputPath, 'utf8').catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  })
  const generatedMarker = '// Generated by @file-viewer/cli.'
  if (
    previous !== null &&
    previous !== content &&
    !previous.startsWith(generatedMarker) &&
    !options.force
  ) {
    throw new Error(
      `Refusing to overwrite user-owned generatedModule ${relativeOutput}; choose another --output or use --force.`
    )
  }
  const changed = previous !== content
  if (options.write && changed) {
    await mkdir(dirname(outputPath), { recursive: true })
    await atomicWriteText(outputPath, content)
  }
  return {
    outputPath,
    generatedModule: relativeOutput,
    content,
    changed,
    written: Boolean(options.write && changed),
    importStatement: applicationImportStatement(projectRoot, relativeOutput, config.entry),
    selectedCapabilities: selected.map((capability) => capability.id)
  }
}

export async function updateFileViewerProjectSelection(
  projectRoot: string,
  tokenInput: string,
  action: 'add' | 'remove',
  options: { configFile?: string; write?: boolean } = {}
) {
  const configFile = options.configFile ?? DEFAULT_FILE_VIEWER_CONFIG
  const configPath = resolveContainedProjectFile(projectRoot, configFile, 'configFile')
  const config = await readFileViewerProjectConfig(projectRoot, configFile)
  const catalog = await loadFileViewerCliCatalog()
  const token = normalizeList([tokenInput])[0]
  if (!token) throw new Error('A format or capability token is required.')
  const capability = capabilityForToken(token, catalog)
  if (!capability) {
    const candidates = catalog.capabilities
      .flatMap((item) => [item.id, ...item.formats, ...item.rendererIds])
      .filter((candidate) => candidate.includes(token) || token.includes(candidate))
      .slice(0, 5)
    throw new Error(
      `Unknown File Viewer token "${token}".${candidates.length ? ` Try ${candidates.join(', ')}.` : ''} Run file-viewer list to inspect valid tokens.`
    )
  }
  const profile =
    config!.profile === 'custom' || config!.profile === 'full'
      ? null
      : (catalog.profiles.find((item) => item.id === config!.profile) ?? null)
  const isCapabilityId = capability.id === token || capability.rendererIds.includes(token)
  const field = isCapabilityId ? 'capabilities' : 'formats'
  const values = new Set(config![field])
  const providedByProfile = Boolean(
    profile?.capabilityPackages.includes(capability.packageName) ||
    (config!.profile === 'full' &&
      !(catalog.legacyFull?.excludedFutureCapabilities ?? []).includes(capability.id))
  )
  if (action === 'remove' && !values.has(token) && providedByProfile) {
    throw new Error(
      `Cannot remove "${token}" from the fixed ${config!.profile} profile; choose custom or another profile.`
    )
  }
  if (action === 'add') {
    if (!providedByProfile) values.add(token)
  } else {
    values.delete(token)
  }
  const next = stableConfig({ ...config!, [field]: [...values] })
  const content = `${JSON.stringify(next, null, 2)}\n`
  const existing = await readFile(configPath, 'utf8')
  const changed = existing !== content
  if (options.write && changed) await atomicWriteText(configPath, content)
  return {
    action,
    token,
    capability: capability.id,
    field,
    providedByProfile,
    changed,
    written: Boolean(options.write && changed),
    configPath,
    config: next
  }
}

const verifyAssetReceipt = async (
  projectRoot: string,
  owner: NonNullable<import('./types.js').FileViewerCommandStep['assetOwner']>
) => {
  const targetDir = resolve(projectRoot, owner.target)
  const receiptPath = resolve(targetDir, owner.receiptFilename)
  const verification = await verifyFileViewerCapabilityAssetReceipt(
    targetDir,
    owner.receiptFilename
  )
  const errors = [...verification.errors]
  const receipt = verification.receipt
  if (!receipt) return errors.length ? errors : [`Missing asset receipt ${receiptPath}.`]
  if (
    receipt.packageName !== owner.packageName ||
    receipt.packageVersion !== owner.packageVersion
  ) {
    errors.push(
      `Asset receipt version is stale: expected ${owner.packageName}@${owner.packageVersion}.`
    )
  }
  if (
    owner.expectedProfileManifestSha256 &&
    receipt.profileManifestSha256 !== owner.expectedProfileManifestSha256
  ) {
    errors.push(`Asset receipt profile manifest hash is stale: ${owner.packageName}.`)
  }
  if (receipt.copyGroups) {
    const installedGroups = new Set(receipt.copyGroups)
    const missing = owner.copyGroups.filter((group) => !installedGroups.has(group))
    if (missing.length)
      errors.push(`Receipt ${owner.receiptFilename} is missing groups: ${missing.join(', ')}.`)
  }
  try {
    const require = createRequire(resolve(projectRoot, 'package.json'))
    const packageJsonPath = require.resolve(`${owner.packageName}/package.json`)
    const packageRoot = dirname(packageJsonPath)
    const manifestCandidates = [
      resolve(packageRoot, 'viewer/file-viewer-asset-pack.json'),
      resolve(packageRoot, 'viewer/flyfish-viewer-assets.json')
    ]
    const found: Array<{ path: string; content: Buffer }> = []
    for (const path of manifestCandidates) {
      try {
        found.push({ path, content: await readFile(path) })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
    if (found.length !== 1) {
      errors.push(
        `Expected one installed asset manifest for ${owner.packageName}; found ${found.length}.`
      )
    } else {
      const installedManifestSha256 = createHash('sha256').update(found[0].content).digest('hex')
      if (installedManifestSha256 !== receipt.assetManifestSha256) {
        errors.push(`Asset receipt manifest hash is stale or forged: ${owner.packageName}.`)
      }
      const installedManifest = JSON.parse(found[0].content.toString('utf8')) as {
        packageName?: string
        packageVersion?: string
      }
      if (
        installedManifest.packageName !== owner.packageName ||
        installedManifest.packageVersion !== owner.packageVersion
      ) {
        errors.push(
          `Installed asset manifest version is stale: expected ${owner.packageName}@${owner.packageVersion}.`
        )
      }
    }
  } catch (error) {
    errors.push(
      `Could not verify installed asset manifest for ${owner.packageName}: ${(error as Error).message}`
    )
  }
  const ledger = await readFileViewerAssetLedger(targetDir)
  for (const file of receipt.files) {
    const ledgerPath = ledger.paths.find(
      (item) => item.path === file.path && item.sha256 === file.sha256 && item.size === file.size
    )
    if (
      !ledgerPath?.owners.some(
        (candidate) =>
          candidate.packageName === owner.packageName &&
          candidate.receiptFilename === owner.receiptFilename
      )
    ) {
      errors.push(`Asset ledger ownership is missing or stale: ${owner.packageName}:${file.path}.`)
    }
  }
  return errors
}

export async function doctorFileViewerProject(
  projectRoot: string,
  configFile = DEFAULT_FILE_VIEWER_CONFIG,
  packageManager?: PackageManager
): Promise<FileViewerDoctorResult> {
  const configPath = resolveContainedProjectFile(projectRoot, configFile, 'configFile')
  const config = await readFileViewerProjectConfig(projectRoot, configFile)
  const plan = await createFileViewerInstallPlan(config!, { projectRoot, packageManager })
  const errors: string[] = []
  const warnings: string[] = []
  let projectPackage: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  } = {}
  try {
    projectPackage = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'))
  } catch (error) {
    errors.push(
      `Could not read ${resolve(projectRoot, 'package.json')}: ${(error as Error).message}`
    )
  }
  const installed = { ...projectPackage.dependencies, ...projectPackage.devDependencies }
  const require = createRequire(resolve(projectRoot, 'package.json'))
  const verifiedOfflinePackages =
    config?.source?.kind === 'offline-directory'
      ? new Map(
          (
            await resolveFileViewerOfflinePackages(
              plan.requiredPackages,
              config.source.directory,
              projectRoot
            )
          ).map((item) => [item.packageName, item])
        )
      : null
  for (const required of plan.requiredPackages) {
    const declared = installed[required.packageName]
    if (!declared) {
      errors.push(`Missing dependency ${required.packageName}@${required.version}.`)
      continue
    }
    const verifiedOfflinePackage = verifiedOfflinePackages?.get(required.packageName)
    if (verifiedOfflinePackage) {
      try {
        if (!declared.startsWith('file:')) throw new Error('the declaration is not a file reference')
        const rawPath = declared.startsWith('file://')
          ? fileURLToPath(declared)
          : declared.slice('file:'.length)
        const declaredPath = await realpath(resolve(projectRoot, rawPath))
        if (declaredPath !== verifiedOfflinePackage.path) {
          throw new Error(`it resolves to ${declaredPath}`)
        }
      } catch (error) {
        errors.push(
          `Dependency ${required.packageName} must reference its verified offline tarball for ${required.version}; found ${declared} (${(error as Error).message}).`
        )
      }
    } else if (declared !== required.version) {
      errors.push(
        `Dependency ${required.packageName} must be pinned to ${required.version}; found ${declared}.`
      )
    }
    try {
      const resolvedPackageJson = require.resolve(`${required.packageName}/package.json`)
      const resolved = JSON.parse(await readFile(resolvedPackageJson, 'utf8')) as {
        version?: string
      }
      if (resolved.version !== required.version) {
        errors.push(
          `Resolved ${required.packageName}@${String(resolved.version)}; catalog requires ${required.version}.`
        )
      }
    } catch (error) {
      errors.push(
        `Could not resolve installed ${required.packageName}@${required.version}: ${(error as Error).message}`
      )
    }
  }
  if (plan.heavyCapabilities.length) {
    warnings.push(
      `Heavy capabilities are enabled explicitly: ${plan.heavyCapabilities.join(', ')}.`
    )
  }
  if (plan.missingAssetRendererIds.length) {
    errors.push(
      `Selected capabilities need separately owned assets: ${plan.missingAssetRendererIds.join(', ')}.`
    )
  }
  for (const step of plan.steps.filter((step) => step.kind === 'assets')) {
    if (!step.assetOwner) {
      if (plan.profile === 'full' && step.id === 'assets:file-viewer-copy-assets') {
        try {
          const receipt = JSON.parse(
            await readFile(
              resolve(projectRoot, plan.assetTarget, 'file-viewer-copy-assets.receipt.json'),
              'utf8'
            )
          ) as { packageName?: string; files?: unknown[] }
          if (receipt.packageName !== 'file-viewer-copy-assets' || !Array.isArray(receipt.files))
            errors.push('Legacy full asset receipt is invalid.')
        } catch (error) {
          errors.push(`Missing legacy full asset receipt: ${(error as Error).message}`)
        }
      } else errors.push(`Asset step ${step.id} is missing owner metadata.`)
      continue
    }
    errors.push(...(await verifyAssetReceipt(projectRoot, step.assetOwner)))
  }
  for (const target of [
    ...new Set(
      plan.steps
        .filter((step) => step.kind === 'assets' && step.assetOwner)
        .map((step) => step.assetOwner!.target)
    )
  ]) {
    const state = await verifyFileViewerAssetState(resolve(projectRoot, target))
    errors.push(...state.errors)
  }
  try {
    await access(configPath)
  } catch {
    errors.push(`Missing ${configPath}.`)
  }
  try {
    const expectedGenerated = await generateFileViewerIntegrationModule(projectRoot, config!, {
      output: plan.generatedModule,
      force: true
    })
    const actualGenerated = await readFile(expectedGenerated.outputPath, 'utf8').catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    })
    if (actualGenerated === null) {
      errors.push(`Missing generated integration module ${plan.generatedModule}.`)
    } else if (actualGenerated !== expectedGenerated.content) {
      errors.push(
        `Generated integration module ${plan.generatedModule} does not match file-viewer.config.json.`
      )
    }
  } catch (error) {
    errors.push(`Could not verify generated integration module: ${(error as Error).message}`)
  }
  try {
    const entryIntegration = await patchFileViewerApplicationEntry(
      projectRoot,
      plan.generatedModule,
      { entry: config!.entry }
    )
    if (entryIntegration.warning) errors.push(entryIntegration.warning)
    else if (entryIntegration.changed)
      errors.push(
        `Application entry ${entryIntegration.entry} does not import ${plan.generatedModule}.`
      )
  } catch (error) {
    errors.push(`Could not verify application entry integration: ${(error as Error).message}`)
  }
  return { ok: errors.length === 0, configPath, errors, warnings, plan }
}
