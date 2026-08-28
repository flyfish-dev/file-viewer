import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  installFileViewerStandardAssets,
  verifyFileViewerStandardAssetReceipt
} from '../dist/index.js'
import {
  installFileViewerCapabilityAssetPack,
  uninstallFileViewerCapabilityAssetPack
} from '@file-viewer/asset-installer'

const packageVersion = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
).version

test('installs only the frozen standard asset manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-assets-standard-'))
  try {
    await writeFile(join(root, 'optional-dicom.bin'), 'keep-me')
    const result = await installFileViewerStandardAssets({ targetDir: root })
    const manifest = JSON.parse(await readFile(join(root, 'flyfish-viewer-assets.json'), 'utf8'))
    const ids = manifest.rendererAssetManifests.map((item) => item.rendererId).sort()
    assert.deepEqual(ids, [
      'archive',
      'office-presentation',
      'office-word-openxml',
      'pdf',
      'spreadsheet-openxml'
    ])
    assert.equal(ids.includes('cad'), false)
    assert.equal(ids.includes('office-presentation-binary'), false)
    assert.equal(ids.includes('typst'), false)
    assert.equal(result.rendererIds.length, ids.length)
    assert.equal(await readFile(join(root, 'optional-dicom.bin'), 'utf8'), 'keep-me')
    const receiptBefore = await readFile(result.receiptPath, 'utf8')
    const second = await installFileViewerStandardAssets({ targetDir: root })
    assert.equal(second.changed, false)
    assert.equal(await readFile(result.receiptPath, 'utf8'), receiptBefore)
    assert.equal((await verifyFileViewerStandardAssetReceipt(root)).ok, true)
    const receipt = JSON.parse(receiptBefore)
    assert.equal(receipt.packageVersion, packageVersion)
    assert.match(receipt.profileManifestSha256, /^[a-f0-9]{64}$/)
    assert.equal(
      receipt.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)),
      true
    )
    await writeFile(join(root, receipt.files[0].path), 'tampered')
    assert.equal((await verifyFileViewerStandardAssetReceipt(root)).ok, false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('explicit confirmed cleanup is contained to a dedicated file-viewer target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-assets-parent-'))
  const targetDir = join(root, 'public', 'file-viewer')
  try {
    await installFileViewerStandardAssets({ targetDir, clean: true, confirmClean: true })
    assert.equal((await verifyFileViewerStandardAssetReceipt(targetDir)).ok, true)
    await assert.rejects(
      installFileViewerStandardAssets({
        targetDir: join(root, 'public'),
        clean: true,
        confirmClean: true
      }),
      /unsafe target/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('refuses destructive cleanup without both explicit flags', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-assets-standard-'))
  try {
    await assert.rejects(
      installFileViewerStandardAssets({ targetDir: root, clean: true }),
      /requires both --clean and --confirm/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('standard and specialist owners compose in either order and uninstall independently', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-standard-specialist-'))
  try {
    const packRoot = join(root, 'specialist-pack')
    const viewer = join(packRoot, 'viewer')
    await mkdir(viewer, { recursive: true })
    const shared = await readFile(
      new URL('../viewer/flyfish-viewer-manifest.json', import.meta.url)
    )
    await writeFile(join(viewer, 'flyfish-viewer-manifest.json'), shared)
    await writeFile(join(viewer, 'specialist.bin'), 'specialist')
    await writeFile(
      join(viewer, 'file-viewer-asset-pack.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          packageName: '@file-viewer/assets-specialist-test',
          packageVersion: '1.0.0',
          copyGroups: ['specialist-test'],
          rendererAssetManifests: [{ rendererId: 'specialist-test', assets: [] }]
        },
        null,
        2
      )}\n`
    )
    const metadata = {
      packageName: '@file-viewer/assets-specialist-test',
      packageVersion: '1.0.0',
      packRoot,
      receiptFilename: 'file-viewer-assets-specialist-test.receipt.json'
    }
    const standardFirst = join(root, 'standard-first')
    const specialistFirst = join(root, 'specialist-first')
    await installFileViewerStandardAssets({ targetDir: standardFirst })
    await installFileViewerCapabilityAssetPack(metadata, { targetDir: standardFirst })
    await installFileViewerCapabilityAssetPack(metadata, { targetDir: specialistFirst })
    await installFileViewerStandardAssets({ targetDir: specialistFirst })
    assert.equal(
      await readFile(join(standardFirst, 'file-viewer-assets.ledger.json'), 'utf8'),
      await readFile(join(specialistFirst, 'file-viewer-assets.ledger.json'), 'utf8')
    )
    assert.equal(
      await readFile(join(standardFirst, 'flyfish-viewer-assets.json'), 'utf8'),
      await readFile(join(specialistFirst, 'flyfish-viewer-assets.json'), 'utf8')
    )
    await uninstallFileViewerCapabilityAssetPack(
      standardFirst,
      '@file-viewer/assets-standard',
      'file-viewer-assets-standard.receipt.json'
    )
    assert.equal(
      await readFile(join(standardFirst, 'flyfish-viewer-manifest.json'), 'utf8'),
      shared.toString('utf8')
    )
    assert.equal(await readFile(join(standardFirst, 'specialist.bin'), 'utf8'), 'specialist')
    const runtime = JSON.parse(
      await readFile(join(standardFirst, 'flyfish-viewer-assets.json'), 'utf8')
    )
    assert.deepEqual(
      runtime.rendererAssetManifests.map((item) => item.rendererId),
      ['specialist-test']
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
