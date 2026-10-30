import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { verifyTransferPlan } from './recover-frozen-assets.mjs'

const plan = JSON.parse(
  readFileSync(new URL('./frozen-assets-3.3.2-transfer.json', import.meta.url))
)
const manifest = (phase) => ({
  version: '3.3.2',
  packageCount: plan.archives.filter((row) => row.phase === phase).length,
  packages: plan.archives
    .filter((row) => row.phase === phase)
    .map((row) => ({
      packageName: row.packageName,
      version: '3.3.2',
      tarball: row.targetArchive,
      sha256: row.targetSha256,
      tarballSize: row.targetBytes
    }))
})
test('transport is limited to archives pinned by the immutable release manifest', () => {
  assert.equal(verifyTransferPlan(plan, 'main', manifest('main')).length, 2)
  assert.equal(verifyTransferPlan(plan, 'legacy', manifest('legacy')).length, 1)
  assert.throws(() => verifyTransferPlan(plan, '../main', manifest('main')))
  for (const mutation of [
    (p) => {
      p.releaseTag = 'v3.3.3'
    },
    (p) => {
      p.releaseId++
    },
    (p) => {
      p.manifests.main.sourceTag = 'main'
    },
    (p) => {
      p.archives[0].targetArchive = '../a.tgz'
    },
    (p) => {
      p.archives[0].targetSha256 = 'a'.repeat(64)
    },
    (p) => {
      p.archives[0].targetBytes++
    },
    (p) => {
      p.archives[0].deltaAsset = '*.zst'
    },
    (p) => {
      p.archives[0].gzipHeaderHex = '00'
    }
  ]) {
    const altered = structuredClone(plan)
    mutation(altered)
    assert.throws(() => verifyTransferPlan(altered, 'main', manifest('main')))
  }
})
