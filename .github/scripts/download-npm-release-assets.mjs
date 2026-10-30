import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const supplementalManifest = 'npm-legacy-web-release-manifest.json'
export const legacyWebPackage = '@flyfish-group/file-viewer-web'

export function releaseAssetSelection({
  releaseTag,
  manifestAsset = 'npm-release-manifest.json',
  ref,
  expectedSha,
  head,
  manifest
}) {
  assert.match(releaseTag || '', /^v\d+\.\d+\.\d+$/, 'A stable release tag is required')
  assert.ok(
    ['npm-release-manifest.json', supplementalManifest].includes(manifestAsset),
    'Unrecognized release manifest'
  )
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.version, releaseTag.slice(1), 'Manifest version must match the Release')
  assert.ok(Array.isArray(manifest.packages) && manifest.packages.length > 0)
  assert.equal(manifest.packageCount, manifest.packages.length)
  if (manifestAsset === supplementalManifest) {
    assert.equal(
      ref,
      `refs/tags/${releaseTag}-legacy-web`,
      'Supplemental publishing needs its own tag'
    )
    assert.match(expectedSha || '', /^[a-f0-9]{40}$/, 'Supplemental publishing needs an exact SHA')
    assert.equal(head, expectedSha, 'Supplemental tag and expected commit differ')
    assert.equal(manifest.mode, 'runtime-only')
    assert.equal(manifest.releaseScope, 'package-patch')
    assert.equal(manifest.packageCount, 1)
    assert.equal(manifest.packages[0].packageName, legacyWebPackage)
    assert.equal(manifest.packages[0].version, manifest.version)
    assert.notEqual(manifest.packages[0].releaseArtifact?.includeTarball, false)
  }
  const archives = [],
    names = new Set(),
    packages = new Set()
  for (const entry of manifest.packages) {
    assert.ok(entry.packageName && !packages.has(entry.packageName), 'Duplicate package')
    packages.add(entry.packageName)
    if (entry.releaseArtifact?.includeTarball === false) continue
    assert.match(entry.tarball || '', /^[A-Za-z0-9][A-Za-z0-9._-]*\.tgz$/, 'Unsafe archive name')
    assert.ok(!names.has(entry.tarball), 'Duplicate archive')
    assert.match(entry.sha256 || '', /^[a-f0-9]{64}$/, 'Archive SHA-256 is required')
    assert.ok(Number.isSafeInteger(entry.tarballSize) && entry.tarballSize > 0)
    names.add(entry.tarball)
    archives.push(entry.tarball)
  }
  assert.ok(archives.length > 0, 'No archives selected')
  return { manifestAsset, archives }
}

export function downloadReleaseAssets({
  env = process.env,
  root = resolve(import.meta.dirname, '../..'),
  command = (args) => execFileSync('gh', args, { encoding: 'utf8' }),
  head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
} = {}) {
  const manifestAsset = env.FILE_VIEWER_RELEASE_MANIFEST || 'npm-release-manifest.json'
  assert.ok(['npm-release-manifest.json', supplementalManifest].includes(manifestAsset))
  const sourceBytes = readFileSync(join(root, 'artifacts', manifestAsset))
  const selected = releaseAssetSelection({
    releaseTag: env.FILE_VIEWER_RELEASE_TAG,
    manifestAsset,
    ref: env.GITHUB_REF,
    expectedSha: env.EXPECTED_SHA,
    head,
    manifest: JSON.parse(sourceBytes)
  })
  assert.match(env.GITHUB_REPOSITORY || '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
  assert.ok(env.RUNNER_TEMP && resolve(env.RUNNER_TEMP) !== '/')
  if (manifestAsset === supplementalManifest) {
    const tag = JSON.parse(
      command([
        'api',
        `repos/${env.GITHUB_REPOSITORY}/git/ref/tags/${env.FILE_VIEWER_RELEASE_TAG}-legacy-web`
      ])
    )
    assert.equal(tag.object?.type, 'commit')
    assert.equal(tag.object.sha, head, 'Remote supplemental tag changed')
  }
  const directory = join(env.RUNNER_TEMP, 'file-viewer-release')
  mkdirSync(directory, { recursive: true })
  assert.deepEqual(readdirSync(directory), [], 'Release download directory must be empty')
  const download = (patterns) =>
    command([
      'release',
      'download',
      env.FILE_VIEWER_RELEASE_TAG,
      '--repo',
      env.GITHUB_REPOSITORY,
      ...patterns.flatMap((name) => ['--pattern', name]),
      '--dir',
      directory
    ])
  download([selected.manifestAsset])
  assert.ok(
    sourceBytes.equals(readFileSync(join(directory, selected.manifestAsset))),
    'Release manifest differs from the immutable source manifest'
  )
  download(selected.archives)
  if (selected.manifestAsset !== 'npm-release-manifest.json')
    renameSync(
      join(directory, selected.manifestAsset),
      join(directory, 'npm-release-manifest.json')
    )
  const receipt = {
    releaseTag: env.FILE_VIEWER_RELEASE_TAG,
    sourceRef: env.GITHUB_REF,
    sourceCommit: head,
    manifestAsset,
    manifestSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    archives: selected.archives
  }
  console.log(JSON.stringify(receipt))
  return receipt
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  downloadReleaseAssets()
