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
