import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import {
  installFileViewerCapabilityAssetPack,
  mergeFileViewerAssetManifestOwner,
  readFileViewerAssetLedger,
  uninstallFileViewerCapabilityAssetPack,
  verifyFileViewerCapabilityAssetReceipt,
  verifyFileViewerAssetState,
} from '../dist/index.js'

const makePack = async (root, { name, version = '1.0.0', rendererId, marker = name, files }) => {
  const viewer = join(root, 'viewer')
  await mkdir(viewer, { recursive: true })
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(viewer, path)), { recursive: true })
    await writeFile(join(viewer, path), content)
  }
  await writeFile(join(viewer, 'file-viewer-asset-pack.json'), `${JSON.stringify({
    schemaVersion: 1,
    packageName: name,
    packageVersion: version,
    copyGroups: [rendererId],
    rendererAssetManifests: [{ rendererId, marker, assets: [] }],
  }, null, 2)}\n`)
  return {
    packageName: name,
    packageVersion: version,
    packRoot: root,
    receiptFilename: `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.receipt.json`,
  }
}

test('asset owners compose deterministically and shared managed files survive either install order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-owner-matrix-'))
  try {
    const packA = await makePack(join(root, 'pack-a'), {
      name: '@file-viewer/assets-a', rendererId: 'a', files: { 'a.bin': 'a', 'shared.bin': 'same' },
    })
    const packB = await makePack(join(root, 'pack-b'), {
      name: '@file-viewer/assets-b', rendererId: 'b', files: { 'b.bin': 'b', 'shared.bin': 'same' },
    })
    const targetAB = join(root, 'target-ab')
    const targetBA = join(root, 'target-ba')
    const first = await installFileViewerCapabilityAssetPack(packA, { targetDir: targetAB })
    await installFileViewerCapabilityAssetPack(packB, { targetDir: targetAB })
    const repeat = await installFileViewerCapabilityAssetPack(packA, { targetDir: targetAB })
    assert.equal(first.changed, true)
    assert.equal(repeat.changed, false)
    await installFileViewerCapabilityAssetPack(packB, { targetDir: targetBA })
    await installFileViewerCapabilityAssetPack(packA, { targetDir: targetBA })

    assert.equal(
      await readFile(join(targetAB, 'file-viewer-assets.ledger.json'), 'utf8'),
      await readFile(join(targetBA, 'file-viewer-assets.ledger.json'), 'utf8'),
    )
    assert.equal(
      await readFile(join(targetAB, 'flyfish-viewer-assets.json'), 'utf8'),
      await readFile(join(targetBA, 'flyfish-viewer-assets.json'), 'utf8'),
    )
    const ledger = JSON.parse(await readFile(join(targetAB, 'file-viewer-assets.ledger.json'), 'utf8'))
    const shared = ledger.paths.find(item => item.path === 'shared.bin')
    assert.deepEqual(shared.owners.map(owner => owner.packageName), ['@file-viewer/assets-a', '@file-viewer/assets-b'])
    assert.equal(shared.owners.every(owner => owner.ownership === 'managed'), true)

    await uninstallFileViewerCapabilityAssetPack(targetAB, packA.packageName, packA.receiptFilename)
    assert.equal(existsSync(join(targetAB, 'a.bin')), false)
    assert.equal(await readFile(join(targetAB, 'shared.bin'), 'utf8'), 'same')
    assert.equal(await readFile(join(targetAB, 'b.bin'), 'utf8'), 'b')
    assert.equal((await verifyFileViewerCapabilityAssetReceipt(targetAB, packB.receiptFilename)).ok, true)
    const after = JSON.parse(await readFile(join(targetAB, 'flyfish-viewer-assets.json'), 'utf8'))
    assert.deepEqual(after.rendererAssetManifests.map(item => item.rendererId), ['b'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('manifest conflict rolls files, receipt, ledger, and runtime manifest back together', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-rollback-'))
  try {
    const packA = await makePack(join(root, 'pack-a'), {
      name: '@file-viewer/assets-a', rendererId: 'same-renderer', marker: 'a', files: { 'a.bin': 'a' },
    })
    const packConflict = await makePack(join(root, 'pack-conflict'), {
      name: '@file-viewer/assets-conflict', rendererId: 'same-renderer', marker: 'different', files: { 'written-before-merge.bin': 'rollback-me' },
    })
    const target = join(root, 'target')
    await installFileViewerCapabilityAssetPack(packA, { targetDir: target })
    const ledgerBefore = await readFile(join(target, 'file-viewer-assets.ledger.json'), 'utf8')
    const manifestBefore = await readFile(join(target, 'flyfish-viewer-assets.json'), 'utf8')
    await assert.rejects(
      installFileViewerCapabilityAssetPack(packConflict, { targetDir: target }),
      /conflicts with @file-viewer\/assets-a/,
    )
    assert.equal(existsSync(join(target, 'written-before-merge.bin')), false)
    assert.equal(existsSync(join(target, packConflict.receiptFilename)), false)
    assert.equal(await readFile(join(target, 'file-viewer-assets.ledger.json'), 'utf8'), ledgerBefore)
    assert.equal(await readFile(join(target, 'flyfish-viewer-assets.json'), 'utf8'), manifestBefore)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('fails closed for target symlinks, symlink ancestors, and modified managed files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-symlink-'))
  try {
    const pack = await makePack(join(root, 'pack'), {
      name: '@file-viewer/assets-safe', rendererId: 'safe', files: { 'nested/asset.bin': 'safe' },
    })
    const outside = join(root, 'outside')
    const target = join(root, 'target')
    await mkdir(outside)
    await mkdir(target)
    await symlink(outside, join(target, 'nested'))
    await assert.rejects(installFileViewerCapabilityAssetPack(pack, { targetDir: target }), /symbolic link/)
    assert.equal(existsSync(join(outside, 'asset.bin')), false)

    const linkedTarget = join(root, 'linked-target')
    await symlink(outside, linkedTarget)
    await assert.rejects(installFileViewerCapabilityAssetPack(pack, { targetDir: linkedTarget }), /symbolic-link asset path/)

    const cleanTarget = join(root, 'clean-target')
    await installFileViewerCapabilityAssetPack(pack, { targetDir: cleanTarget })
    await writeFile(join(cleanTarget, 'nested/asset.bin'), 'tampered')
    await assert.rejects(
      uninstallFileViewerCapabilityAssetPack(cleanTarget, pack.packageName, pack.receiptFilename),
      /modified managed asset/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('supports a same-owner upgrade and rolls the whole upgrade back when its new manifest conflicts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-upgrade-'))
  try {
    const target = join(root, 'target')
    const packV1 = await makePack(join(root, 'pack-v1'), {
      name: '@file-viewer/assets-upgrade', version: '1.0.0', rendererId: 'upgrade', marker: 'v1', files: { 'upgrade.bin': 'v1' },
    })
    const packV2 = await makePack(join(root, 'pack-v2'), {
      name: '@file-viewer/assets-upgrade', version: '2.0.0', rendererId: 'upgrade', marker: 'v2', files: { 'upgrade.bin': 'v2' },
    })
    await installFileViewerCapabilityAssetPack(packV1, { targetDir: target })
    await installFileViewerCapabilityAssetPack(packV2, { targetDir: target })
    assert.equal(await readFile(join(target, 'upgrade.bin'), 'utf8'), 'v2')
    assert.equal(JSON.parse(await readFile(join(target, packV2.receiptFilename), 'utf8')).packageVersion, '2.0.0')

    const packOther = await makePack(join(root, 'pack-other'), {
      name: '@file-viewer/assets-other', rendererId: 'other', marker: 'other', files: { 'other.bin': 'other' },
    })
    await installFileViewerCapabilityAssetPack(packOther, { targetDir: target })
    const conflictingUpgrade = await makePack(join(root, 'pack-v3'), {
      name: '@file-viewer/assets-upgrade', version: '3.0.0', rendererId: 'other', marker: 'conflict', files: { 'upgrade.bin': 'v3' },
    })
    const ledgerBefore = await readFile(join(target, 'file-viewer-assets.ledger.json'), 'utf8')
    const manifestBefore = await readFile(join(target, 'flyfish-viewer-assets.json'), 'utf8')
    const receiptBefore = await readFile(join(target, packV2.receiptFilename), 'utf8')
    await assert.rejects(
      installFileViewerCapabilityAssetPack(conflictingUpgrade, { targetDir: target }),
      /conflicts with @file-viewer\/assets-other/,
    )
    assert.equal(await readFile(join(target, 'upgrade.bin'), 'utf8'), 'v2')
    assert.equal(await readFile(join(target, packV2.receiptFilename), 'utf8'), receiptBefore)
    assert.equal(await readFile(join(target, 'file-viewer-assets.ledger.json'), 'utf8'), ledgerBefore)
    assert.equal(await readFile(join(target, 'flyfish-viewer-assets.json'), 'utf8'), manifestBefore)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('serializes concurrent owners and never loses either ledger update', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-concurrent-'))
  try {
    const target = join(root, 'target')
    const packA = await makePack(join(root, 'pack-a'), {
      name: '@file-viewer/assets-concurrent-a', rendererId: 'concurrent-a', files: { 'a.bin': 'a' },
    })
    const packB = await makePack(join(root, 'pack-b'), {
      name: '@file-viewer/assets-concurrent-b', rendererId: 'concurrent-b', files: { 'b.bin': 'b' },
    })
    await Promise.all([
      installFileViewerCapabilityAssetPack(packA, { targetDir: target }),
      installFileViewerCapabilityAssetPack(packB, { targetDir: target }),
    ])
    const ledger = JSON.parse(await readFile(join(target, 'file-viewer-assets.ledger.json'), 'utf8'))
    assert.deepEqual(ledger.entries.map(entry => entry.rendererId), ['concurrent-a', 'concurrent-b'])
    assert.deepEqual(ledger.paths.map(path => path.path), ['a.bin', 'b.bin'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('serializes concurrent direct manifest API calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-direct-merge-'))
  try {
    const targetDir = join(root, 'target')
    const owner = (suffix) => ({
      targetDir,
      ownerPackage: `@file-viewer/assets-direct-${suffix}`,
      ownerVersion: '1.0.0',
      receiptFilename: `direct-${suffix}.receipt.json`,
      rendererAssetManifests: [{ rendererId: `direct-${suffix}`, assets: [] }],
      files: [],
    })
    await Promise.all([
      mergeFileViewerAssetManifestOwner(owner('a')),
      mergeFileViewerAssetManifestOwner(owner('b')),
    ])
    const ledger = await readFileViewerAssetLedger(targetDir)
    assert.deepEqual(ledger.entries.map(entry => entry.rendererId), ['direct-a', 'direct-b'])
    assert.equal((await verifyFileViewerAssetState(targetDir)).ok, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('recovers stale main and reaper locks after a crashed process', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-stale-reaper-'))
  try {
    const target = join(root, 'target')
    await mkdir(target)
    const stale = `${JSON.stringify({
      schemaVersion: 1,
      pid: 99999999,
      createdAt: '2000-01-01T00:00:00.000Z',
      token: 'crashed-process',
    })}\n`
    const mainLock = join(target, '.file-viewer-assets.lock')
    const reaperLock = join(target, '.file-viewer-assets.lock.reaper')
    await writeFile(mainLock, stale)
    await writeFile(reaperLock, stale)
    const old = new Date('2000-01-01T00:00:00.000Z')
    await utimes(mainLock, old, old)
    await utimes(reaperLock, old, old)

    const pack = await makePack(join(root, 'pack'), {
      name: '@file-viewer/assets-stale-reaper', rendererId: 'stale-reaper', files: { 'asset.bin': 'asset' },
    })
    await installFileViewerCapabilityAssetPack(pack, { targetDir: target })
    assert.equal((await verifyFileViewerAssetState(target)).ok, true)
    assert.deepEqual((await readdir(target)).filter(name => name.startsWith('.file-viewer-assets.lock')), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects malformed receipt and ledger fields and detects a forged runtime manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-schema-'))
  try {
    const pack = await makePack(join(root, 'pack'), {
      name: '@file-viewer/assets-schema', rendererId: 'schema', files: { 'asset.bin': 'asset' },
    })
    const target = join(root, 'target')
    await installFileViewerCapabilityAssetPack(pack, { targetDir: target })
    const receiptPath = join(target, pack.receiptFilename)
    const receiptSource = await readFile(receiptPath, 'utf8')
    const receipt = JSON.parse(receiptSource)
    receipt.files[0].path = '../escape'
    await writeFile(receiptPath, JSON.stringify(receipt))
    await assert.rejects(verifyFileViewerCapabilityAssetReceipt(target, pack.receiptFilename), /Unsafe capability asset path/)
    await writeFile(receiptPath, receiptSource)

    const ledgerPath = join(target, 'file-viewer-assets.ledger.json')
    const ledgerSource = await readFile(ledgerPath, 'utf8')
    const ledger = JSON.parse(ledgerSource)
    ledger.entries[0].manifest.marker = 'forged-without-matching-hash'
    await writeFile(ledgerPath, JSON.stringify(ledger))
    await assert.rejects(readFileViewerAssetLedger(target), /Invalid File Viewer asset ledger entry/)
    await writeFile(ledgerPath, ledgerSource)

    await writeFile(join(target, 'flyfish-viewer-assets.json'), JSON.stringify({ schemaVersion: 1, rendererAssetManifests: [] }))
    const state = await verifyFileViewerAssetState(target)
    assert.equal(state.ok, false)
    assert.equal(state.errors.some(error => error.includes('does not match the signed owner ledger')), true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('read-only verification does not create a missing target and invalid receipts fail closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-readonly-'))
  try {
    const missing = join(root, 'does-not-exist')
    assert.equal((await verifyFileViewerCapabilityAssetReceipt(missing, 'missing.receipt.json')).ok, false)
    assert.equal(existsSync(missing), false)
    const pack = await makePack(join(root, 'pack'), {
      name: '@file-viewer/assets-invalid-receipt', rendererId: 'invalid-receipt', files: { 'asset.bin': 'asset' },
    })
    const target = join(root, 'target')
    await mkdir(target)
    await writeFile(join(target, pack.receiptFilename), '{not-json')
    await assert.rejects(installFileViewerCapabilityAssetPack(pack, { targetDir: target }), /Unexpected token|JSON/)
    assert.equal(await readFile(join(target, pack.receiptFilename), 'utf8'), '{not-json')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
