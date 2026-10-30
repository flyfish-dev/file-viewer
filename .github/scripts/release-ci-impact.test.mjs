import assert from 'node:assert/strict'
import test from 'node:test'
import { releaseCiImpact } from './release-ci-impact.mjs'

test('only a status-only diff with a successful baseline can reuse runtime proof', () => {
  assert.equal(releaseCiImpact(['artifacts/release-status.json'], true).runtime, false)
  assert.equal(releaseCiImpact(['artifacts/release-status.json'], false).runtime, true)
  for (const path of [
    'packages/core/src/index.ts',
    'pnpm-lock.yaml',
    'docs/guide/usage.md',
    '.github/workflows/public-ci.yml',
    '.github/scripts/release-ci-impact.mjs',
    'unknown-file'
  ]) {
    assert.equal(releaseCiImpact(['artifacts/release-status.json', path], true).runtime, true)
  }
  assert.equal(releaseCiImpact([], true).runtime, true)
})

test('a supplemental publisher-only change reuses product proof and rejects any runtime input', () => {
  const paths = [
    '.github/workflows/npm-publish.yml',
    '.github/scripts/download-npm-release-assets.mjs',
    '.github/scripts/download-npm-release-assets.test.mjs',
    '.github/scripts/npm-publish-workflow.test.mjs',
    '.github/scripts/release-ci-impact.mjs',
    '.github/scripts/release-ci-impact.test.mjs',
    'artifacts/npm-legacy-web-release-manifest.json'
  ]
  assert.equal(releaseCiImpact(paths, true).kind, 'publisher-controls')
  assert.equal(releaseCiImpact(paths, true).runtime, false)
  assert.equal(releaseCiImpact(paths, false).runtime, true)
  for (const path of [
    'pnpm-lock.yaml',
    'packages/renderers/pdf/src/pdf.ts',
    '.github/workflows/public-ci.yml',
    'artifacts/npm-release-manifest.json',
    'unknown-file'
  ])
    assert.equal(releaseCiImpact([...paths, path], true).runtime, true)
  assert.equal(
    releaseCiImpact(
      paths.filter((path) => path !== '.github/workflows/npm-publish.yml'),
      true
    ).runtime,
    true
  )
  assert.equal(
    releaseCiImpact(
      paths.filter((path) => path !== 'artifacts/npm-legacy-web-release-manifest.json'),
      true
    ).runtime,
    true
  )
})
