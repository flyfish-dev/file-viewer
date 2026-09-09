import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import {
  captureCommand,
  mapLimit,
  positiveInteger,
  publicationLayers,
  registryMetadata,
  verifyRegistryIntegrity,
  waitForRegistry
} from './npm-release-batch.mjs'

const registry = 'https://registry.npmjs.org/'
const assetsDirValue = process.env.FILE_VIEWER_RELEASE_ASSETS_DIR || ''
const releaseTag = process.env.FILE_VIEWER_RELEASE_TAG || ''
const dryRun = process.env.FILE_VIEWER_RELEASE_DRY_RUN === 'true'
const normalizeRepositoryUrl = (value) =>
  String(value || '')
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
const trustedRepositoryUrl = normalizeRepositoryUrl(
  process.env.FILE_VIEWER_TRUSTED_REPOSITORY ||
    (process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : '')
)
const publishConcurrency = positiveInteger(
  process.env.FILE_VIEWER_PUBLISH_CONCURRENCY || 3,
  'FILE_VIEWER_PUBLISH_CONCURRENCY',
  8
)
const checkConcurrency = positiveInteger(
  process.env.FILE_VIEWER_REGISTRY_CONCURRENCY || 6,
  'FILE_VIEWER_REGISTRY_CONCURRENCY',
  8
)
const visibilityAttempts = positiveInteger(
  process.env.FILE_VIEWER_PUBLISH_VISIBILITY_ATTEMPTS || 90,
  'FILE_VIEWER_PUBLISH_VISIBILITY_ATTEMPTS',
  360
)
const visibilityDelayMs = positiveInteger(
  process.env.FILE_VIEWER_PUBLISH_VISIBILITY_DELAY_MS || 10_000,
  'FILE_VIEWER_PUBLISH_VISIBILITY_DELAY_MS',
  60_000
)
if (!assetsDirValue || resolve(assetsDirValue) === resolve('/')) {
  throw new Error('FILE_VIEWER_RELEASE_ASSETS_DIR must name a release asset directory')
}
if (!/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
  throw new Error('FILE_VIEWER_RELEASE_TAG must be a stable release tag')
}
if (!dryRun && process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Non-dry-run npm publishing is restricted to GitHub Actions trusted publishing')
}
if (!trustedRepositoryUrl) throw new Error('A trusted repository URL is required')

const assetsDir = resolve(assetsDirValue)
const reportPath = join(assetsDir, 'npm-publish-report.json')
const manifest = JSON.parse(await readFile(join(assetsDir, 'npm-release-manifest.json'), 'utf8'))
if (manifest.version !== releaseTag.slice(1)) {
  throw new Error(`Release manifest version ${manifest.version} does not match ${releaseTag}`)
}
if (!Array.isArray(manifest.packages) || manifest.packages.length !== manifest.packageCount) {
  throw new Error('Release manifest package count is inconsistent')
}
const report = {
  releaseTag,
  dryRun,
  startedAt: new Date().toISOString(),
  publishConcurrency,
  checkConcurrency,
  status: 'validating',
  packages: []
}
const log = (message) => console.log(`[npm-trusted-publish] ${message}`)
const saveReport = () => writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)

async function verifyAsset(entry) {
  const { packageName, version } = entry
  if (!packageName || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('Release entry must have a package name and stable version')
  }
  const record = { packageName, version, status: 'validated' }
  report.packages.push(record)
  if (entry.releaseArtifact?.includeTarball === false) return record
  const name = entry.tarball
  if (!name || basename(name) !== name || !name.endsWith('.tgz')) {
    throw new Error(`Invalid release tarball for ${packageName}`)
  }
  const tarball = join(assetsDir, name)
  const info = await lstat(tarball)
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Invalid release file: ${name}`)
  const sha256 = createHash('sha256')
  const sha512 = createHash('sha512')
  for await (const chunk of createReadStream(tarball)) {
    sha256.update(chunk)
    sha512.update(chunk)
  }
  if (sha256.digest('hex') !== entry.sha256) throw new Error(`${name} manifest SHA-256 mismatch`)
  const result = await captureCommand('tar', ['-xOzf', tarball, 'package/package.json'])
  if (result.status !== 0) throw new Error(`Cannot read ${name}: ${result.stderr}`)
  const packageJson = JSON.parse(result.stdout)
  if (packageJson.name !== packageName || packageJson.version !== version) {
    throw new Error(`${name} metadata does not match ${packageName}@${version}`)
  }
  if (
    packageJson.repository?.type !== 'git' ||
    normalizeRepositoryUrl(packageJson.repository?.url) !== trustedRepositoryUrl
  ) {
    throw new Error(`${name} repository.url must point to ${trustedRepositoryUrl}`)
  }
  if (packageJson.private === true) throw new Error(`${name} is private`)
  if (version !== manifest.version) throw new Error(`${name} must use release ${manifest.version}`)
  return Object.assign(record, {
    tarball,
    packageJson,
    integrity: `sha512-${sha512.digest('base64')}`
  })
}

async function publish(record) {
  if (record.status === 'verified-existing') return
  const args = [
    'publish',
    record.tarball,
    '--access',
    'public',
    '--tag',
    'latest',
    '--ignore-scripts',
    '--registry',
    registry,
    dryRun ? '--dry-run' : '--provenance'
  ]
  log(`${dryRun ? 'dry-run' : 'publish'} ${record.packageName}@${record.version}`)
  record.status = 'submitting'
  const result = await captureCommand('npm', args, { timeout: 15 * 60_000 })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (
    result.status !== 0 &&
    (dryRun ||
      !/E409|EPUBLISHCONFLICT|cannot publish over existing version/i.test(
        `${result.stdout}\n${result.stderr}`
      ))
  ) {
    record.status = 'submission-failed-or-uncertain'
    throw new Error(
      `npm publish failed for ${record.packageName}@${record.version}; resume the same frozen release`
    )
  }
  record.status = dryRun ? 'dry-run-validated' : 'pending-visibility'
}

try {
  // Check every byte, identity, duplicate and registry collision before the first write.
  const records = await mapLimit(manifest.packages, checkConcurrency, verifyAsset)
  const tarballNames = records.filter((r) => r.tarball).map((r) => r.tarball)
  if (new Set(tarballNames).size !== tarballNames.length)
    throw new Error('Duplicate release tarball')
  const layers = publicationLayers(records)
  log(
    `${records.length} packages in ${layers.length} dependency layers; ${publishConcurrency} uploads / ${checkConcurrency} checks`
  )
  await mapLimit(records, checkConcurrency, async (record) => {
    const metadata = await registryMetadata(record)
    if (metadata) {
      verifyRegistryIntegrity(record, metadata)
      record.status = 'verified-existing'
      log(`verified existing ${record.packageName}@${record.version}`)
    } else if (!record.tarball) {
      throw new Error(
        `${record.packageName}@${record.version} has no Release tarball and is not on npm`
      )
    }
  })
  report.status = 'publishing'
  await saveReport()
  for (const [index, layer] of layers.entries()) {
    log(`layer ${index + 1}/${layers.length}: ${layer.length} packages`)
    await mapLimit(layer, publishConcurrency, publish)
    if (!dryRun) {
      await mapLimit(layer, checkConcurrency, async (record) => {
        if (record.status === 'verified-existing') return
        await waitForRegistry(record, { attempts: visibilityAttempts, delayMs: visibilityDelayMs })
        record.status = 'verified-published'
      })
    }
    await saveReport()
  }
  report.status = dryRun ? 'dry-run-passed' : 'verified'
  log(
    `${report.status}: ${records.length} packages; ${records.filter((r) => r.status === 'verified-published').length} published, ${records.filter((r) => r.status === 'verified-existing').length} verified existing`
  )
} catch (error) {
  report.status = 'failed'
  report.error = error.message
  throw error
} finally {
  report.finishedAt = new Date().toISOString()
  // Keep the readback small and free of package scripts or environment data.
  report.packages = report.packages.map(({ packageJson, ...record }) => record)
  await saveReport()
}
