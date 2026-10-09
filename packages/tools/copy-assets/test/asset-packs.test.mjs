import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import test from 'node:test'
import { copyFileViewerAssets } from '../dist/index.js'

test('merges exact asset packs into one complete offline target and one receipt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'full-asset-packs-'))
  const sourceDir = join(root, 'full')
  const targetDir = join(root, 'file-viewer')
  const rendererSources = { cad: join(root, 'cad'), drawing: join(root, 'drawing') }
  const files = [
    ['pdf', sourceDir, 'vendor/pdf/worker.js', 'pdf-worker'],
    ['cad', rendererSources.cad, 'wasm/cad/runtime.wasm', 'cad-runtime'],
    ['drawing', rendererSources.drawing, 'vendor/drawio/viewer.js', 'drawio-runtime']
  ]
  try {
    await mkdir(targetDir, { recursive: true })
    await writeFile(join(targetDir, 'user-owned.txt'), 'keep')
    for (const [, directory, path, bytes] of files) {
      await mkdir(dirname(join(directory, path)), { recursive: true })
      await writeFile(join(directory, path), bytes)
    }
    await writeFile(join(sourceDir, 'flyfish-viewer-assets.json'), JSON.stringify({
      schemaVersion: 1,
      rendererAssetManifests: files.map(([rendererId, , defaultPath]) => ({
        rendererId, assets: [{ id: rendererId, rendererId, defaultPath, target: 'public', kind: 'file', required: true, description: 'test resource' }]
      }))
    }))
    const options = { sourceDir, targetDir, rendererSources, packageVersion: '3.2.0' }
    const result = await copyFileViewerAssets(options)
    assert.equal(result.validation.valid, true)
    for (const [, , path, bytes] of files) assert.equal(await readFile(join(targetDir, path), 'utf8'), bytes)
    const receipt = await readFile(join(targetDir, 'file-viewer-copy-assets.receipt.json'), 'utf8')
    assert.deepEqual(JSON.parse(receipt).copyGroups, ['cad', 'drawing', 'pdf'])
    assert.equal(JSON.parse(receipt).files.length, 3)
    await copyFileViewerAssets(options)
    assert.equal(await readFile(join(targetDir, 'file-viewer-copy-assets.receipt.json'), 'utf8'), receipt)
    assert.equal(await readFile(join(targetDir, 'user-owned.txt'), 'utf8'), 'keep')
    await writeFile(join(targetDir, 'wasm/cad/runtime.wasm'), 'user-change')
    await assert.rejects(copyFileViewerAssets(options), /Managed asset was modified outside File Viewer/)
    assert.equal(await readFile(join(targetDir, 'wasm/cad/runtime.wasm'), 'utf8'), 'user-change')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('records overlapping directory/file assets once and upgrades old double-slash receipts safely', async () => {
  const root = await mkdtemp(join(tmpdir(), 'full-asset-pack-paths-'))
  const sourceDir = join(root, 'full')
  const targetDir = join(root, 'file-viewer')
  try {
    await mkdir(join(sourceDir, 'wasm/cad'), { recursive: true })
    await writeFile(join(sourceDir, 'wasm/cad/worker.js'), 'bounded worker fixture')
    await writeFile(join(sourceDir, 'flyfish-viewer-assets.json'), JSON.stringify({
      schemaVersion: 1,
      rendererAssetManifests: [{ rendererId: 'cad', assets: [
        { id: 'directory', rendererId: 'cad', defaultPath: 'wasm/cad/', target: 'public', kind: 'directory', required: true },
        { id: 'worker', rendererId: 'cad', defaultPath: 'wasm/cad/worker.js', target: 'public', kind: 'file', required: true }
      ] }]
    }))
    const options = { sourceDir, targetDir, packageVersion: '3.2.0' }
    await copyFileViewerAssets(options)
    const path = join(targetDir, 'file-viewer-copy-assets.receipt.json')
    const receipt = JSON.parse(await readFile(path, 'utf8'))
    assert.deepEqual(receipt.files.map(file => file.path), ['wasm/cad/worker.js'])
    receipt.files.push({ ...receipt.files[0], path: 'wasm/cad//worker.js' })
    await writeFile(path, JSON.stringify(receipt))
    await copyFileViewerAssets(options)
    const upgraded = await readFile(path, 'utf8')
    assert.deepEqual(JSON.parse(upgraded).files.map(file => file.path), ['wasm/cad/worker.js'])
    assert.equal(JSON.parse(upgraded).files[0].ownership, 'managed')
    await copyFileViewerAssets(options)
    assert.equal(await readFile(path, 'utf8'), upgraded)
    await writeFile(join(targetDir, 'wasm/cad/worker.js'), 'host modification')
    await assert.rejects(copyFileViewerAssets(options), /Managed asset was modified outside File Viewer/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
