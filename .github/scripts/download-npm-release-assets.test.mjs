import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  downloadReleaseAssets,
  legacyWebPackage,
  releaseAssetSelection,
  supplementalManifest
} from './download-npm-release-assets.mjs'

const head = 'a'.repeat(40)
const entry = {
  packageName: legacyWebPackage,
  version: '3.3.2',
  tarball: 'flyfish-group-file-viewer-web-3.3.2.tgz',
  tarballSize: 123,
  sha256: 'b'.repeat(64)
}
const manifest = {
  schemaVersion: 1,
  mode: 'runtime-only',
  releaseScope: 'package-patch',
  version: '3.3.2',
  packageCount: 1,
  packages: [entry]
}
const request = {
  releaseTag: 'v3.3.2',
  manifestAsset: supplementalManifest,
  ref: 'refs/tags/v3.3.2-legacy-web',
  expectedSha: head,
  head,
  manifest
}

test('supplemental selection pins the original version, package, source tag and SHA', () => {
  assert.deepEqual(releaseAssetSelection(request).archives, [entry.tarball])
  for (const mutation of [
    { manifestAsset: '../npm-release-manifest.json' },
    { releaseTag: 'v3.3.2-extra' },
    { ref: 'refs/heads/main' },
    { ref: 'refs/tags/v3.3.2' },
    { expectedSha: '' },
    { head: 'c'.repeat(40) },
    { manifest: { ...manifest, version: '3.3.3' } },
    { manifest: { ...manifest, packages: [{ ...entry, packageName: '@file-viewer/core' }] } },
    { manifest: { ...manifest, packages: [{ ...entry, version: '3.3.1' }] } },
    {
      manifest: {
        ...manifest,
        packages: [{ ...entry, releaseArtifact: { includeTarball: false } }]
      }
    },
    {
      manifest: {
        ...manifest,
        packageCount: 2,
        packages: [entry, { ...entry, packageName: 'other' }]
      }
    }
  ])
    assert.throws(() => releaseAssetSelection({ ...request, ...mutation }))
})

test('archive selection rejects globs, options, traversal, missing hashes and duplicates', () => {
  const normal = { ...request, manifestAsset: 'npm-release-manifest.json' }
  for (const tarball of ['*.tgz', '../a.tgz', '-a.tgz', 'a/b.tgz', 'a?.tgz', 'a[1].tgz'])
    assert.throws(() =>
      releaseAssetSelection({
        ...normal,
        manifest: { ...manifest, packages: [{ ...entry, tarball }] }
      })
    )
  assert.throws(() =>
    releaseAssetSelection({
      ...normal,
      manifest: { ...manifest, packages: [{ ...entry, sha256: '' }] }
    })
  )
  assert.throws(() =>
    releaseAssetSelection({
      ...normal,
      manifest: {
        ...manifest,
        packageCount: 2,
        packages: [entry, { ...entry, packageName: 'other' }]
      }
    })
  )
})

test('download checks the immutable manifest before requesting exact archives', () => {
  const root = mkdtempSync(join(tmpdir(), 'file-viewer-release-select-'))
  try {
    mkdirSync(join(root, 'artifacts'))
    const bytes = JSON.stringify(manifest)
    writeFileSync(join(root, 'artifacts', supplementalManifest), bytes)
    const commands = []
    const env = {
      FILE_VIEWER_RELEASE_TAG: request.releaseTag,
      FILE_VIEWER_RELEASE_MANIFEST: supplementalManifest,
      GITHUB_REF: request.ref,
      EXPECTED_SHA: head,
      GITHUB_REPOSITORY: 'flyfish-dev/file-viewer',
      RUNNER_TEMP: join(root, 'runner')
    }
    const command = (args) => {
      commands.push(args)
      if (args[0] === 'api') return JSON.stringify({ object: { type: 'commit', sha: head } })
      if (args.includes(supplementalManifest))
        writeFileSync(join(env.RUNNER_TEMP, 'file-viewer-release', supplementalManifest), bytes)
      return ''
    }
    const receipt = downloadReleaseAssets({ root, head, env, command })
    assert.deepEqual(receipt.archives, [entry.tarball])
    assert.equal(commands.length, 3)
    assert.deepEqual(
      commands[2].filter((_, i) => commands[2][i - 1] === '--pattern'),
      [entry.tarball]
    )
    assert.ok(commands.every((args) => !args.includes('*.tgz') && !args.includes('--clobber')))
    rmSync(join(root, 'runner'), { recursive: true })
    commands.length = 0
    assert.throws(
      () =>
        downloadReleaseAssets({
          root,
          head,
          env,
          command: (args) => {
            commands.push(args)
            if (args[0] === 'api') return JSON.stringify({ object: { type: 'commit', sha: head } })
            writeFileSync(join(env.RUNNER_TEMP, 'file-viewer-release', supplementalManifest), '{}')
            return ''
          }
        }),
      /differs/
    )
    assert.equal(commands.length, 2, 'A substituted manifest must stop before archive downloads')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
