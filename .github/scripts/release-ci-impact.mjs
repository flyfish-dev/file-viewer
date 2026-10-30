import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { releaseAssetSelection, supplementalManifest } from './download-npm-release-assets.mjs'

const publisherControlPaths = new Set([
  '.github/workflows/npm-publish.yml',
  '.github/scripts/download-npm-release-assets.mjs',
  '.github/scripts/download-npm-release-assets.test.mjs',
  '.github/scripts/npm-publish-workflow.test.mjs',
  '.github/scripts/release-ci-impact.mjs',
  '.github/scripts/release-ci-impact.test.mjs',
  `artifacts/${supplementalManifest}`
])

export function releaseCiImpact(paths, baselinePassed) {
  const metadataOnly =
    baselinePassed &&
    paths.length > 0 &&
    paths.every((path) => path === 'artifacts/release-status.json')
  const publisherOnly =
    baselinePassed &&
    paths.includes('.github/workflows/npm-publish.yml') &&
    paths.includes(`artifacts/${supplementalManifest}`) &&
    paths.every((path) => publisherControlPaths.has(path))
  return {
    runtime: !(metadataOnly || publisherOnly),
    kind: metadataOnly ? 'release-status' : publisherOnly ? 'publisher-controls' : 'runtime',
    reason: metadataOnly
      ? 'status-only change on verified baseline'
      : publisherOnly
        ? 'publisher controls only on verified baseline; control tests still required'
        : 'runtime, unknown path or unverified baseline'
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let impact = releaseCiImpact([], false)
  const base = process.env.FILE_VIEWER_CI_BASE || ''
  if (/^[a-f0-9]{40}$/.test(base) && !/^0+$/.test(base)) {
    try {
      const paths = execFileSync('git', ['diff', '--name-only', '-z', base, 'HEAD'], {
        encoding: 'utf8'
      })
        .split('\0')
        .filter(Boolean)
      const checks = JSON.parse(
        execFileSync(
          'gh',
          ['api', `repos/${process.env.GITHUB_REPOSITORY}/commits/${base}/check-runs?per_page=100`],
          { encoding: 'utf8' }
        )
      )
      const baselinePassed = checks.check_runs.some(
        (check) =>
          check.name === 'Install, type-check, test, build and smoke' &&
          check.app?.slug === 'github-actions' &&
          check.conclusion === 'success'
      )
      impact = releaseCiImpact(paths, baselinePassed)
    } catch (error) {
      console.log(`No reusable base proof: ${error.message}`)
    }
  }
  if (impact.kind === 'publisher-controls') {
    execFileSync(
      process.execPath,
      [
        '--test',
        '.github/scripts/npm-release-batch.test.mjs',
        '.github/scripts/publish-release-assets.test.mjs',
        '.github/scripts/npm-publish-workflow.test.mjs'
      ],
      { stdio: 'inherit' }
    )
    const manifest = JSON.parse(readFileSync(`artifacts/${supplementalManifest}`, 'utf8'))
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    releaseAssetSelection({
      releaseTag: `v${manifest.version}`,
      manifestAsset: supplementalManifest,
      ref: `refs/tags/v${manifest.version}-legacy-web`,
      expectedSha: head,
      head,
      manifest
    })
    execFileSync(process.execPath, ['.github/scripts/verify-source-layout.mjs'], {
      stdio: 'inherit'
    })
  }
  if (impact.kind === 'release-status') {
    const status = JSON.parse(readFileSync('artifacts/release-status.json', 'utf8'))
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    if (
      status.schemaVersion !== 1 ||
      status.version !== pkg.version ||
      !/^[a-f0-9]{40}$/.test(status.sourceBaseline?.authoritativeCommit || '')
    )
      throw new Error('Invalid release status metadata')
  }
  console.log(JSON.stringify(impact))
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `runtime=${impact.runtime}\n`)
}
