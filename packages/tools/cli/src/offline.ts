import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { normalizeFileViewerRegistryUrl } from './url-security.js'

export interface PrepareFileViewerOfflineOptions {
  projectRoot: string
  directory: string
  registry: string
  concurrency?: number
}

export interface FileViewerOfflineManifestFile {
  packageName: string
  version: string
  dependencies: Record<string, string>
  size: number
  integrity: string
}

export interface FileViewerOfflineManifest {
  schemaVersion: 1
  release: string
  createdAt: string
  registry: string
  roots: Array<{ packageName: string; version: string }>
  files: Record<string, FileViewerOfflineManifestFile>
  boundary: {
    included: string
    excluded: string
  }
}

const internalUnscopedPackages = new Set([
  'create-file-viewer',
  'file-viewer-cli',
  'file-viewer-copy-assets',
  'msdoc-viewer',
  'styled-exceljs',
])

export const isFileViewerOfflinePackage = (packageName: string) =>
  packageName.startsWith('@file-viewer/') || internalUnscopedPackages.has(packageName)

const hasUnsafeOfflineFilenameCharacter = (value: string) => {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f || character === '\\') return true
  }
  return false
}

export const fileViewerOfflineTarballFilename = (packageName: string, version: string) => {
  if (!packageName || !version || hasUnsafeOfflineFilenameCharacter(`${packageName}${version}`)) {
    throw new Error('Offline package name and version must be safe non-empty values.')
  }
  return `${encodeURIComponent(packageName)}-${encodeURIComponent(version)}.tgz`
}

const runNpmView = (spec: string, registry: string) => new Promise<{
  name: string
  version: string
  dependencies: Record<string, string>
}>((resolvePromise, reject) => {
  const args = ['view', spec, 'name', 'version', 'dependencies', 'optionalDependencies', '--json']
  const child = spawn('npm', args, {
    shell: false,
    env: {
      ...process.env,
      npm_config_registry: registry,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_loglevel: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk })
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk })
  child.once('error', reject)
  child.once('close', status => {
    if (status !== 0) {
      reject(new Error(`npm view ${spec} failed with status ${String(status)}: ${stderr || stdout}`))
      return
    }
    try {
      const parsed = JSON.parse(stdout) as {
        name?: string
        version?: string
        dependencies?: Record<string, string>
        optionalDependencies?: Record<string, string>
      }
      if (!parsed.name || !parsed.version) throw new Error('registry metadata has no name/version.')
      resolvePromise({
        name: parsed.name,
        version: parsed.version,
        dependencies: { ...parsed.dependencies, ...parsed.optionalDependencies },
      })
    } catch (error) {
      reject(new Error(`npm view ${spec} returned invalid JSON: ${(error as Error).message}`))
    }
  })
})

const runNpmPack = (spec: string, destination: string, registry: string) => new Promise<{
  filename: string
  name: string
  version: string
}>((resolvePromise, reject) => {
  const args = ['pack', '--json', '--ignore-scripts', '--pack-destination', destination, spec]
  const child = spawn('npm', args, {
    shell: false,
    env: {
      ...process.env,
      npm_config_registry: registry,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_loglevel: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk })
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk })
  child.once('error', reject)
  child.once('close', status => {
    if (status !== 0) {
      reject(new Error(`npm pack ${spec} failed with status ${String(status)}: ${stderr || stdout}`))
      return
    }
    try {
      const result = JSON.parse(stdout) as Array<{ filename?: string; name?: string; version?: string }>
      const packed = result.at(-1)
      const filename = packed?.filename
      if (!filename || filename.includes('/') || filename.includes('\\')) throw new Error('npm pack returned an unsafe filename.')
      if (!packed?.name || !packed.version) throw new Error('npm pack returned no package name/version.')
      resolvePromise({ filename, name: packed.name, version: packed.version })
    } catch (error) {
      reject(new Error(`npm pack ${spec} returned invalid JSON: ${(error as Error).message}`))
    }
  })
})

const normalizeDependencySpec = (value: string) => value.replace(/^workspace:/, '')

const satisfiesRequestedVersion = (version: string, rawSpec: string) => {
  const spec = normalizeDependencySpec(rawSpec)
  if (version === spec) return true
  const actualMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  const rangeMatch = spec.match(/^\^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  if (!actualMatch || !rangeMatch) return false
  const actual = actualMatch.slice(1, 4).map(Number)
  const minimum = rangeMatch.slice(1, 4).map(Number)
  const atLeastMinimum = actual[0] > minimum[0] ||
    (actual[0] === minimum[0] && (actual[1] > minimum[1] ||
      (actual[1] === minimum[1] && actual[2] >= minimum[2])))
  if (!atLeastMinimum) return false
  if (minimum[0] > 0) return actual[0] === minimum[0]
  if (minimum[1] > 0) return actual[0] === 0 && actual[1] === minimum[1]
  return actual[0] === 0 && actual[1] === 0 && actual[2] === minimum[2]
}

const verifyExistingDirectory = async (
  directory: string,
  roots: Array<{ packageName: string; version: string }>,
  registry: string,
) => {
  const path = join(directory, 'file-viewer-offline-manifest.json')
  try {
    const manifest = JSON.parse(await readFile(path, 'utf8')) as FileViewerOfflineManifest
    if (manifest.schemaVersion !== 1 || manifest.registry !== registry || !manifest.files || !Array.isArray(manifest.roots)) return null
    if (JSON.stringify(manifest.roots) !== JSON.stringify(roots)) return null
    const expectedEntries = new Set(['file-viewer-offline-manifest.json', ...Object.keys(manifest.files)])
    const actualEntries = await readdir(directory)
    if (actualEntries.some(entry => !expectedEntries.has(entry)) || expectedEntries.size !== actualEntries.length) return null
    for (const [filename, item] of Object.entries(manifest.files)) {
      if (!filename.endsWith('.tgz') || filename.includes('/') || filename.includes('\\')) return null
      if (!item.packageName || !item.version || !item.dependencies || Array.isArray(item.dependencies)) return null
      const content = await readFile(join(directory, filename))
      if (content.byteLength !== item.size || `sha512-${createHash('sha512').update(content).digest('base64')}` !== item.integrity) return null
    }
    return manifest
  } catch {
    return null
  }
}

export async function prepareFileViewerOfflineDirectory(
  requiredPackages: readonly { packageName: string; version: string }[],
  options: PrepareFileViewerOfflineOptions,
) {
  const registry = normalizeFileViewerRegistryUrl(options.registry)
  const concurrency = options.concurrency ?? 4
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('prepare concurrency must be an integer from 1 to 8.')
  const roots = [...requiredPackages]
    .sort((left, right) => left.packageName.localeCompare(right.packageName))
    .map(item => ({ packageName: item.packageName, version: item.version }))
  const directory = resolve(options.projectRoot, options.directory)
  if (existsSync(directory)) {
    const existing = await verifyExistingDirectory(directory, roots, registry)
    if (existing) return { directory, reused: true, manifest: existing }
    throw new Error(`Refusing to replace non-matching offline directory ${directory}. Choose an empty path.`)
  }
  await mkdir(dirname(directory), { recursive: true })
  const staging = await mkdtemp(join(dirname(directory), '.file-viewer-offline-'))
  const queued = new Map<string, string>()
  const requestedSpecs = new Map<string, Set<string>>()
  const completed = new Map<string, { filename: string; manifest: Awaited<ReturnType<typeof runNpmView>> }>()
  for (const item of roots) {
    queued.set(item.packageName, item.version)
    requestedSpecs.set(item.packageName, new Set([item.version]))
  }
  try {
    while (queued.size) {
      const batch = [...queued.entries()].slice(0, concurrency)
      batch.forEach(([packageName]) => queued.delete(packageName))
      const results = await Promise.all(batch.map(async ([packageName, requested]) => {
        const manifest = await runNpmView(`${packageName}@${normalizeDependencySpec(requested)}`, registry)
        if (manifest.name !== packageName) throw new Error(`Registry returned ${manifest.name} for ${packageName}.`)
        const packDirectory = await mkdtemp(join(staging, '.file-viewer-pack-'))
        try {
          const packed = await runNpmPack(
            `${packageName}@${manifest.version}`,
            packDirectory,
            registry,
          )
          if (packed.name !== manifest.name || packed.version !== manifest.version) {
            throw new Error(`Registry packed ${packed.name}@${packed.version}; expected ${manifest.name}@${manifest.version}.`)
          }
          const filename = fileViewerOfflineTarballFilename(packed.name, packed.version)
          const destination = join(staging, filename)
          if (existsSync(destination)) {
            throw new Error(`Offline tarball filename collision for ${packed.name}@${packed.version}.`)
          }
          await rename(join(packDirectory, packed.filename), destination)
          return { packageName, filename, manifest }
        } finally {
          await rm(packDirectory, { recursive: true, force: true })
        }
      }))
      for (const result of results) {
        const requests = requestedSpecs.get(result.packageName) ?? new Set<string>()
        const incompatible = [...requests].filter(spec => !satisfiesRequestedVersion(result.manifest.version, spec))
        if (incompatible.length) {
          throw new Error(`Offline closure resolved ${result.packageName}@${result.manifest.version}, which does not satisfy ${incompatible.join(', ')}.`)
        }
        const previous = completed.get(result.packageName)
        if (previous && previous.manifest.version !== result.manifest.version) {
          throw new Error(`Offline closure resolved conflicting versions for ${result.packageName}.`)
        }
        completed.set(result.packageName, { filename: result.filename, manifest: result.manifest })
      }
      for (const result of results) {
        for (const [dependencyName, dependencySpec] of Object.entries(result.manifest.dependencies)) {
          if (!isFileViewerOfflinePackage(dependencyName)) continue
          const requests = requestedSpecs.get(dependencyName) ?? new Set<string>()
          requests.add(dependencySpec)
          requestedSpecs.set(dependencyName, requests)
          const completedDependency = completed.get(dependencyName)
          if (completedDependency && !satisfiesRequestedVersion(completedDependency.manifest.version, dependencySpec)) {
            throw new Error(`Offline closure has conflicting version requirements for ${dependencyName}: ${[...requests].join(', ')}.`)
          }
          if (!completedDependency && !queued.has(dependencyName)) queued.set(dependencyName, dependencySpec)
        }
      }
    }

    const files: Record<string, FileViewerOfflineManifestFile> = {}
    for (const { filename, manifest } of [...completed.values()].sort((left, right) => left.manifest.name.localeCompare(right.manifest.name))) {
      const content = await readFile(join(staging, filename))
      files[filename] = {
        packageName: manifest.name,
        version: manifest.version,
        dependencies: manifest.dependencies,
        size: content.byteLength,
        integrity: `sha512-${createHash('sha512').update(content).digest('base64')}`,
      }
    }
    const release = roots.find(item => item.packageName === '@file-viewer/core')?.version ?? roots[0]?.version ?? 'unknown'
    const offlineManifest: FileViewerOfflineManifest = {
      schemaVersion: 1,
      release,
      createdAt: new Date().toISOString(),
      registry,
      roots,
      files,
      boundary: {
        included: 'Exact File Viewer-owned runtime package closure selected by this profile.',
        excluded: 'Third-party framework and renderer dependencies; use a package-manager cache for an air-gapped install.',
      },
    }
    await writeFile(join(staging, 'file-viewer-offline-manifest.json'), `${JSON.stringify(offlineManifest, null, 2)}\n`, 'utf8')
    await rename(staging, directory)
    return { directory, reused: false, manifest: offlineManifest }
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}
