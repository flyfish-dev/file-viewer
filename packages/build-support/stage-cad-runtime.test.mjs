import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { sanitizeOfflineViewerAssetTree } from '../components/web-full/scripts/offline-asset-sanitize.mjs'
import { stageCadRuntimeFiles, stageInstalledCadRuntime } from './stage-cad-runtime.mjs'
import { CAD_INTEGRATION_SOURCE } from './cad-source-offer.mjs'

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cad-stage-'))
  try { await run(root) } finally { await rm(root, { recursive: true, force: true }) }
}

test('current and compatibility paths use one owner runtime and retire known generated versions', () => fixture(async root => {
  for (const version of ['0.8.0', '0.8.1']) {
    await mkdir(join(root, version))
    await writeFile(join(root, version, 'dwg-worker.js'), 'old runtime')
  }
  await writeFile(join(root, 'dwg-worker-retired.js'), 'old generated chunk')
  await writeFile(join(root, 'dwg-worker-retired.js.map'), 'old generated source map')
  await writeFile(join(root, 'host-notes.txt'), 'host data')
  const files = new Map([['dwg-worker.js', Buffer.from('current runtime')], ['GPL-3.0.txt', Buffer.from('original GPL')]])
  const result = await stageCadRuntimeFiles(root, files, ['0.8.3', '0.8.0'])
  assert.deepEqual(result.retiredVersions, ['0.8.1'])
  for (const version of ['', '0.8.3', '0.8.0']) {
    assert.equal(await readFile(join(root, version, 'dwg-worker.js'), 'utf8'), 'current runtime')
    assert.equal(await readFile(join(root, version, 'GPL-3.0.txt'), 'utf8'), 'original GPL')
  }
  await assert.rejects(readFile(join(root, '0.8.1/dwg-worker.js')), { code: 'ENOENT' })
  await assert.rejects(readFile(join(root, 'dwg-worker-retired.js')), { code: 'ENOENT' })
  await assert.rejects(readFile(join(root, 'dwg-worker-retired.js.map')), { code: 'ENOENT' })
  assert.equal(await readFile(join(root, 'host-notes.txt'), 'utf8'), 'host data')
}))

test('an unexpected user file aborts before changing any existing runtime bytes', () => fixture(async root => {
  await mkdir(join(root, '0.8.0'))
  await writeFile(join(root, '0.8.0/dwg-worker.js'), 'old runtime')
  await writeFile(join(root, '0.8.0/user-notes.txt'), 'user data')
  await assert.rejects(stageCadRuntimeFiles(root, new Map([['dwg-worker.js', Buffer.from('current')]]), ['0.8.3', '0.8.0']), /unrecognized CAD output/)
  assert.equal(await readFile(join(root, '0.8.0/dwg-worker.js'), 'utf8'), 'old runtime')
  assert.equal(await readFile(join(root, '0.8.0/user-notes.txt'), 'utf8'), 'user data')
}))

test('a symlink in a generated version is retained and rejected before mutation', () => fixture(async root => {
  await mkdir(join(root, '0.8.0'))
  await writeFile(join(root, 'user-file.txt'), 'user data')
  await symlink(join(root, 'user-file.txt'), join(root, '0.8.0/dwg-worker.js'))
  await assert.rejects(stageCadRuntimeFiles(root, new Map([['dwg-worker.js', Buffer.from('current')]]), ['0.8.3', '0.8.0']), /unrecognized CAD output/)
  assert.equal(await readFile(join(root, 'user-file.txt'), 'utf8'), 'user data')
}))

test('installed runtime retains every CAD path promised by the public copy-assets contract', () => fixture(async root => {
  const contract = JSON.parse(await readFile(new URL('../../ecosystem/copy-assets-backward-compat.json', import.meta.url), 'utf8'))
  const expectedVersions = [...new Set(contract.legacyFullAssetRoots
    .map(path => path.match(/^wasm\/cad\/([^/]+)\/$/)?.[1])
    .filter(Boolean))]
  const cadRoot = join(root, 'wasm/cad')
  const hostNotes = 'Host-owned deployment notes: http://localhost/\n'
  await mkdir(cadRoot, { recursive: true })
  await writeFile(join(cadRoot, 'host-notes.txt'), hostNotes)
  const result = await stageInstalledCadRuntime(root)
  const worker = await readFile(join(cadRoot, 'dwg-worker.js'))
  const sourceArchive = await readFile(join(cadRoot, 'CORRESPONDING_SOURCE.zip'))
  assert.equal(sourceArchive.length, CAD_INTEGRATION_SOURCE.bytes)
  const notice = await readFile(join(cadRoot, 'CORRESPONDING_SOURCE_NOTICE.txt'), 'utf8')
  assert.ok(notice.includes(CAD_INTEGRATION_SOURCE.url))
  assert.ok(notice.includes(CAD_INTEGRATION_SOURCE.sha256))
  for (const version of expectedVersions) {
    assert.ok(result.versions.includes(version), `Missing promised CAD path: ${version}`)
    assert.deepEqual(await readFile(join(cadRoot, version, 'dwg-worker.js')), worker)
    assert.deepEqual(await readFile(join(cadRoot, version, 'CORRESPONDING_SOURCE.zip')), sourceArchive)
    assert.ok(notice.includes(version), `Source notice omits compatibility path: ${version}`)
    assert.equal(await readFile(join(cadRoot, version, 'CORRESPONDING_SOURCE_NOTICE.txt'), 'utf8'), notice)
  }
  assert.equal(await readFile(join(cadRoot, 'host-notes.txt'), 'utf8'), hostNotes)
  const normalized = await sanitizeOfflineViewerAssetTree(join(cadRoot, result.sourceVersion))
  assert.equal(normalized.replacementCount, 0, 'Staged runtime must already match the normal offline-copy pipeline')
}))
