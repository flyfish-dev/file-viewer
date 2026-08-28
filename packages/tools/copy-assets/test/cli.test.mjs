import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { copyFileViewerAssets, parseCopyAssetsCliArguments } from '../dist/index.js'

test('uses transactional merge by default', () => {
  assert.deepEqual(parseCopyAssetsCliArguments([]), {
    mode: 'copy',
    targetDir: undefined,
    clean: false,
    confirmClean: false,
    rendererIds: [],
    json: false
  })
})

test('accepts one target directory and --no-clean', () => {
  assert.deepEqual(parseCopyAssetsCliArguments(['./public/viewer', '--no-clean']), {
    mode: 'copy',
    targetDir: './public/viewer',
    clean: false,
    confirmClean: false,
    rendererIds: [],
    json: false
  })
})

test('accepts a deterministic selected renderer set', () => {
  assert.deepEqual(
    parseCopyAssetsCliArguments(['--renderers', 'pdf,archive,pdf', './public/viewer']),
    {
      mode: 'copy',
      targetDir: './public/viewer',
      clean: false,
      confirmClean: false,
      rendererIds: ['archive', 'pdf'],
      json: false
    }
  )
})

test('accepts machine-readable output mode', () => {
  assert.deepEqual(parseCopyAssetsCliArguments(['--json']), {
    mode: 'copy',
    targetDir: undefined,
    clean: false,
    confirmClean: false,
    rendererIds: [],
    json: true
  })
})

test('CLI emits exactly one JSON result object when requested', async () => {
  const targetDir = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-json-'))
  try {
    const cli = new URL('../dist/cli.js', import.meta.url)
    const result = spawnSync(
      process.execPath,
      [cli.pathname, targetDir, '--renderers', 'office-word-openxml', '--json'],
      { encoding: 'utf8', shell: false }
    )
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.mode, 'copy')
    assert.equal(parsed.targetDir, targetDir)
    assert.equal(parsed.validation.valid, true)
    assert.equal(result.stdout.trim().split('\n').length, 1)
  } finally {
    await rm(targetDir, { recursive: true, force: true })
  }
})

test('selected asset groups merge transactionally in any order and keep a hash receipt', async () => {
  const targetDir = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-'))
  try {
    await writeFile(join(targetDir, 'optional-dicom.bin'), 'keep-me')
    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })
    await copyFileViewerAssets({ targetDir, rendererIds: ['office-presentation'] })
    const receiptPath = join(targetDir, 'file-viewer-copy-assets.receipt.json')
    const manifestPath = join(targetDir, 'flyfish-viewer-assets.json')
    const before = await readFile(receiptPath, 'utf8')
    const manifestBefore = await readFile(manifestPath, 'utf8')
    const receipt = JSON.parse(before)
    const manifest = JSON.parse(manifestBefore)
    assert.deepEqual(receipt.copyGroups, ['office-presentation', 'office-word-openxml'])
    assert.equal(receipt.files.length > 0, true)
    assert.equal(
      receipt.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)),
      true
    )
    assert.equal(manifest.validation.valid, true)
    assert.equal(manifest.generatedAt, manifest.validation.checkedAt)
    assert.equal(receipt.installedAt, manifest.generatedAt)
    assert.equal(manifest.validation.assets.length > 0, true)
    assert.deepEqual(
      [...new Set(manifest.validation.assets.map((asset) => asset.rendererId))].sort(),
      receipt.copyGroups
    )
    assert.equal(
      manifest.validation.assets.every((asset) => asset.exists),
      true
    )
    assert.equal(
      createHash('sha256').update(manifestBefore).digest('hex'),
      receipt.assetManifestSha256
    )
    assert.equal(
      await readFile(join(targetDir, 'file-viewer-copy-assets.manifest.json'), 'utf8'),
      manifestBefore
    )
    assert.equal(await readFile(join(targetDir, 'optional-dicom.bin'), 'utf8'), 'keep-me')
    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })
    assert.equal(await readFile(receiptPath, 'utf8'), before)
    assert.equal(await readFile(manifestPath, 'utf8'), manifestBefore)
  } finally {
    await rm(targetDir, { recursive: true, force: true })
  }
})

test('repairs a tampered runtime manifest from the verified copied payload', async () => {
  const targetDir = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-manifest-tamper-'))
  try {
    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })
    const manifestPath = join(targetDir, 'flyfish-viewer-assets.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    await writeFile(manifestPath, `${JSON.stringify({ ...manifest, tampered: true }, null, 2)}\n`)

    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })

    const repaired = await readFile(manifestPath, 'utf8')
    const repairedManifest = JSON.parse(repaired)
    const selected = await readFile(
      join(targetDir, 'file-viewer-copy-assets.manifest.json'),
      'utf8'
    )
    const receipt = JSON.parse(
      await readFile(join(targetDir, 'file-viewer-copy-assets.receipt.json'), 'utf8')
    )
    assert.equal(Object.hasOwn(repairedManifest, 'tampered'), false)
    assert.equal(repairedManifest.validation.valid, true)
    assert.equal(selected, repaired)
    assert.equal(createHash('sha256').update(repaired).digest('hex'), receipt.assetManifestSha256)
  } finally {
    await rm(targetDir, { recursive: true, force: true })
  }
})

test('upgrades an original schema-1 receipt without discarding managed assets', async () => {
  const targetDir = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-legacy-receipt-'))
  try {
    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })
    const receiptPath = join(targetDir, 'file-viewer-copy-assets.receipt.json')
    const legacyReceipt = JSON.parse(await readFile(receiptPath, 'utf8'))
    delete legacyReceipt.assetManifestSha256
    await writeFile(receiptPath, `${JSON.stringify(legacyReceipt, null, 2)}\n`)

    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })
    const upgraded = JSON.parse(await readFile(receiptPath, 'utf8'))
    assert.match(upgraded.assetManifestSha256, /^[a-f0-9]{64}$/)
    assert.deepEqual(upgraded.files, legacyReceipt.files)
  } finally {
    await rm(targetDir, { recursive: true, force: true })
  }
})

test('legacy receipt migration still rejects a modified managed file', async () => {
  const targetDir = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-legacy-tamper-'))
  try {
    await copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] })
    const receiptPath = join(targetDir, 'file-viewer-copy-assets.receipt.json')
    const legacyReceipt = JSON.parse(await readFile(receiptPath, 'utf8'))
    delete legacyReceipt.assetManifestSha256
    await writeFile(receiptPath, `${JSON.stringify(legacyReceipt, null, 2)}\n`)
    await writeFile(join(targetDir, legacyReceipt.files[0].path), 'externally-modified')

    await assert.rejects(
      copyFileViewerAssets({ targetDir, rendererIds: ['office-word-openxml'] }),
      /Managed asset was modified outside File Viewer/
    )
  } finally {
    await rm(targetDir, { recursive: true, force: true })
  }
})

test('rejects a project public-directory symlink before creating or cleaning the target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-parent-link-'))
  const external = await mkdtemp(join(tmpdir(), 'file-viewer-copy-assets-external-'))
  const previousInitCwd = process.env.INIT_CWD
  try {
    await mkdir(join(root, 'project'), { recursive: true })
    await writeFile(join(external, 'keep.txt'), 'keep')
    await symlink(external, join(root, 'project', 'public'), 'dir')
    process.env.INIT_CWD = join(root, 'project')
    const targetDir = join(root, 'project', 'public', 'file-viewer')
    await assert.rejects(copyFileViewerAssets({ targetDir }), /Refusing symbolic-link asset path/)
    await assert.rejects(
      copyFileViewerAssets({ targetDir, clean: true, confirmClean: true }),
      /Refusing symbolic-link asset path/
    )
    assert.equal(await readFile(join(external, 'keep.txt'), 'utf8'), 'keep')
  } finally {
    if (previousInitCwd === undefined) delete process.env.INIT_CWD
    else process.env.INIT_CWD = previousInitCwd
    await rm(root, { recursive: true, force: true })
    await rm(external, { recursive: true, force: true })
  }
})

test('recognizes help and version modes', () => {
  assert.equal(parseCopyAssetsCliArguments(['--help']).mode, 'help')
  assert.equal(parseCopyAssetsCliArguments(['-v']).mode, 'version')
})

test('rejects unknown options and multiple targets', () => {
  assert.throws(() => parseCopyAssetsCliArguments(['--unknown']), /Unknown option/)
  assert.throws(() => parseCopyAssetsCliArguments(['one', 'two']), /Only one target directory/)
})
