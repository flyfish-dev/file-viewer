import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm, symlink, unlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  configureCopyPlugin,
  createAssetFixture,
  snapshotAssets,
  workerBytes,
  write
} from './asset-copy-fixtures.mjs'

for (const profile of ['legacy', 'full', 'capability', 'cad']) {
  for (const mode of ['dev', 'build']) {
    test(`${profile}/${mode}: repeated copies preserve unchanged asset bytes and filesystem metadata`, async () => {
      const root = await mkdtemp(join(tmpdir(), 'file-viewer-copy-noop-'))
      const previous = process.cwd(),
        log = console.log
      try {
        const fixture = await createAssetFixture(root, profile)
        process.chdir(root)
        const module = await import(pathToFileURL(join(root, 'plugin.mjs')).href)
        const { target, copy } = configureCopyPlugin(module, fixture, mode)
        console.log = () => {}
        await copy()
        const before = await snapshotAssets(target, true)
        await copy()
        assert.deepEqual(
          await snapshotAssets(target),
          before,
          'A no-op copy must not rewrite files or regenerate manifests'
        )
        const manifest = JSON.parse(await readFile(join(target, 'flyfish-viewer-assets.json')))
        assert.equal(
          manifest.copiedAt,
          undefined,
          'Runtime manifests must not contain a volatile copy timestamp'
        )
        if (profile === 'cad') {
          assert.equal(
            await readFile(join(target, 'wasm/cad/0.8.0/LICENSE'), 'utf8'),
            'Synthetic original license bytes\n'
          )
          assert.equal(
            await readFile(join(target, 'wasm/cad/0.8.0/NOTICE'), 'utf8'),
            'Synthetic original notice bytes\n'
          )
        }
      } finally {
        console.log = log
        process.chdir(previous)
        await rm(root, { recursive: true, force: true })
      }
    })
  }
}

test('legacy copy updates changed resources and prunes only its owned directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-copy-update-'))
  const previous = process.cwd(),
    log = console.log
  try {
    const fixture = await createAssetFixture(root, 'legacy')
    process.chdir(root)
    const module = await import(pathToFileURL(join(root, 'plugin.mjs')).href)
    const { target, copy } = configureCopyPlugin(module, fixture, 'dev')
    console.log = () => {}
    await copy()
    const before = await snapshotAssets(target, true)
    await write(join(target, 'vendor/pdf/cmaps/stale.bcmap'), 'old owned asset')
    await write(join(target, 'business.txt'), 'unrelated consumer file')
    await writeFile(fixture.sourceFile, workerBytes.replace('+ 1', '+ 2'))
    await utimes(fixture.sourceFile, new Date(1000), new Date(1000))
    await copy()
    const after = await snapshotAssets(target)
    assert.equal(after['vendor/pdf/cmaps/stale.bcmap'], undefined)
    assert.equal(await readFile(join(target, 'business.txt'), 'utf8'), 'unrelated consumer file')
    assert.notEqual(
      after['vendor/pdf/pdf.worker.mjs'].sha256,
      before['vendor/pdf/pdf.worker.mjs'].sha256
    )
    for (const name of Object.keys(before).filter((name) => name !== 'vendor/pdf/pdf.worker.mjs')) {
      assert.deepEqual(after[name], before[name], `Unchanged ${name} must not be rewritten`)
    }
  } finally {
    console.log = log
    process.chdir(previous)
    await rm(root, { recursive: true, force: true })
  }
})

test('Full copying rejects symbolic-link destinations without changing the outside file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-copy-symlink-'))
  const previous = process.cwd(),
    log = console.log
  try {
    const fixture = await createAssetFixture(root, 'full')
    process.chdir(root)
    const module = await import(pathToFileURL(join(root, 'plugin.mjs')).href)
    const { target, copy } = configureCopyPlugin(module, fixture, 'dev')
    console.log = () => {}
    await copy()
    const outside = join(root, 'consumer-secret.txt')
    await write(outside, 'must not be overwritten')
    const worker = join(target, 'vendor/pdf/pdf.worker.mjs')
    await unlink(worker)
    await symlink(outside, worker)
    await assert.rejects(copy(), /Unsafe asset file/)
    assert.equal(await readFile(outside, 'utf8'), 'must not be overwritten')
  } finally {
    console.log = log
    process.chdir(previous)
    await rm(root, { recursive: true, force: true })
  }
})

test('Full copies leave consumer files intact and migrate old copiedAt metadata only once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-full-copy-migration-'))
  const previous = process.cwd(),
    log = console.log
  try {
    const fixture = await createAssetFixture(root, 'full')
    process.chdir(root)
    const module = await import(pathToFileURL(join(root, 'plugin.mjs')).href)
    const { target, copy } = configureCopyPlugin(module, fixture, 'dev')
    console.log = () => {}
    await copy()
    const manifestPath = join(target, 'flyfish-viewer-assets.json')
    const manifest = JSON.parse(await readFile(manifestPath))
    await write(manifestPath, JSON.stringify({ ...manifest, copiedAt: '2000-01-01T00:00:00Z' }))
    await write(join(target, 'business.txt'), 'consumer-owned')
    await copy()
    assert.equal(JSON.parse(await readFile(manifestPath)).copiedAt, undefined)
    const before = await snapshotAssets(target, true)
    await copy()
    assert.deepEqual(await snapshotAssets(target), before)
    assert.equal(await readFile(join(target, 'business.txt'), 'utf8'), 'consumer-owned')
  } finally {
    console.log = log
    process.chdir(previous)
    await rm(root, { recursive: true, force: true })
  }
})
