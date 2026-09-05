import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const assetsDirValue = process.env.FILE_VIEWER_RELEASE_ASSETS_DIR || ''
const releaseTag = process.env.FILE_VIEWER_RELEASE_TAG || ''
const dryRun = process.env.FILE_VIEWER_RELEASE_DRY_RUN === 'true'
const registry = 'https://registry.npmjs.org/'
const visibilityAttempts = Number(process.env.FILE_VIEWER_PUBLISH_VISIBILITY_ATTEMPTS || 30)
const visibilityDelayMs = Number(process.env.FILE_VIEWER_PUBLISH_VISIBILITY_DELAY_MS || 10_000)

if (!assetsDirValue) {
  throw new Error('FILE_VIEWER_RELEASE_ASSETS_DIR must name a release asset directory')
}
const assetsDir = resolve(assetsDirValue)
if (assetsDir === resolve('/')) {
  throw new Error('FILE_VIEWER_RELEASE_ASSETS_DIR must not resolve to the filesystem root')
}
if (!/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
  throw new Error(
    `FILE_VIEWER_RELEASE_TAG must be a stable release tag, got ${releaseTag || '(empty)'}`
  )
}
if (!Number.isInteger(visibilityAttempts) || visibilityAttempts <= 0) {
  throw new Error('FILE_VIEWER_PUBLISH_VISIBILITY_ATTEMPTS must be a positive integer')
}
if (!Number.isInteger(visibilityDelayMs) || visibilityDelayMs <= 0) {
  throw new Error('FILE_VIEWER_PUBLISH_VISIBILITY_DELAY_MS must be a positive integer')
}
if (!dryRun && process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Non-dry-run npm publishing is restricted to GitHub Actions trusted publishing')
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe'
  })
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}\n${result.stderr || result.stdout || ''}`
    )
  }
  return result.stdout || ''
}

const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')

const readPackageJsonFromTarball = (path) => {
  const text = run('tar', ['-xOzf', path, 'package/package.json'])
  return JSON.parse(text)
}

const registryVersion = (packageName) => {
  const result = spawnSync(
    'npm',
    ['view', `${packageName}@*`, 'version', '--json', '--registry', registry],
    {
      encoding: 'utf8',
      stdio: 'pipe'
    }
  )
  if (result.status === 0) {
    const value = JSON.parse(result.stdout || 'null')
    return Array.isArray(value) ? value.at(-1) : value
  }
  const failure = `${result.stderr || ''}\n${result.stdout || ''}`
  if (/E404|404 Not Found|is not in this registry/i.test(failure)) {
    return null
  }
  throw new Error(`Could not query ${packageName} on npm:\n${failure}`)
}

const hasExactVersion = (packageName, version) => {
  const result = spawnSync(
    'npm',
    ['view', `${packageName}@${version}`, 'version', '--json', '--registry', registry],
    { encoding: 'utf8', stdio: 'pipe' }
  )
  if (result.status === 0) {
    return String(JSON.parse(result.stdout || 'null')) === version
  }
  const failure = `${result.stderr || ''}\n${result.stdout || ''}`
  if (/E404|404 Not Found|is not in this registry/i.test(failure)) {
    return false
  }
  throw new Error(`Could not query ${packageName}@${version} on npm:\n${failure}`)
}

const waitForExactVersion = async (packageName, version) => {
  for (let attempt = 1; attempt <= visibilityAttempts; attempt += 1) {
    if (hasExactVersion(packageName, version)) return
    if (attempt < visibilityAttempts) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, visibilityDelayMs))
    }
  }
  throw new Error(`npm did not expose ${packageName}@${version} after ${visibilityAttempts} checks`)
}

if (!existsSync(assetsDir)) {
  throw new Error(`Release asset directory does not exist: ${assetsDir}`)
}

const manifestPath = join(assetsDir, 'npm-release-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const expectedVersion = releaseTag.slice(1)
if (manifest.version !== expectedVersion) {
  throw new Error(`Release manifest version ${manifest.version} does not match ${releaseTag}`)
}
if (!Array.isArray(manifest.packages) || manifest.packages.length !== manifest.packageCount) {
  throw new Error('Release manifest package count is inconsistent')
}

let published = 0
let skipped = 0
for (const entry of manifest.packages) {
  const packageName = entry.packageName
  const version = entry.version
  const tarballName = entry.releaseArtifact?.includeTarball === false ? null : entry.tarball
  const tarball = tarballName ? join(assetsDir, tarballName) : null

  if (tarball) {
    if (!existsSync(tarball)) {
      throw new Error(`${packageName}@${version} is missing ${tarballName}`)
    }
    const digest = await sha256(tarball)
    if (digest !== entry.sha256) {
      throw new Error(`${tarballName} sha256 ${digest} !== manifest ${entry.sha256}`)
    }
    const packageJson = readPackageJsonFromTarball(tarball)
    if (packageJson.name !== packageName || packageJson.version !== version) {
      throw new Error(`${tarballName} metadata does not match ${packageName}@${version}`)
    }
  }

  if (hasExactVersion(packageName, version)) {
    skipped += 1
    console.log(
      `[npm-trusted-publish] skip ${packageName}@${version}: exact version already exists`
    )
    continue
  }
  if (!tarball) {
    throw new Error(`${packageName}@${version} has no Release tarball and is not on npm`)
  }

  const publishArgs = [
    'publish',
    tarball,
    '--access',
    'public',
    '--tag',
    'latest',
    '--ignore-scripts',
    '--registry',
    registry
  ]
  if (dryRun) {
    publishArgs.push('--dry-run')
  } else {
    publishArgs.push('--provenance')
  }
  console.log(`[npm-trusted-publish] ${dryRun ? 'dry-run' : 'publish'} ${packageName}@${version}`)
  run('npm', publishArgs, { inherit: true })
  if (dryRun) continue
  await waitForExactVersion(packageName, version)
  published += 1
}

const existing = await registryVersion('@file-viewer/core')
console.log(
  `[npm-trusted-publish] ${dryRun ? 'Validated' : 'Published'} ${manifest.packageCount} manifest entries; ` +
    `${published} published, ${skipped} exact versions skipped; @file-viewer/core=${existing || '(unavailable)'}.`
)
