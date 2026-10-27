import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { resolveWorkspaceAsset } from './public-asset-mirror.mjs'
import test from 'node:test'
import { CAD_INTEGRATION_SOURCE, CAD_NATIVE_CORRESPONDING_SOURCES, appendCadIntegrationSourceNotice,
  cadIntegrationSourceNotice, writeCadIntegrationSourceNotice } from './cad-source-offer.mjs'

test('the source offer binds the release version to the reviewed archive', () => {
  const text = cadIntegrationSourceNotice('3.3.0')
  assert.ok(text.includes(CAD_INTEGRATION_SOURCE.url))
  assert.ok(text.includes(CAD_INTEGRATION_SOURCE.sha256))
  assert.throws(() => cadIntegrationSourceNotice('3.3.1'), /different release/)
})

test('appending or reusing the integration offer preserves every original notice byte', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'file-viewer-cad-source-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = join(dir, 'THIRD_PARTY_LICENSES.txt')
  const original = Buffer.from('@flyfish-dev/cad-viewer@0.8.3\r\ndwf-viewer@0.6.7\r\nOriginal grant ©\r\n')
  await writeFile(path, original)
  await appendCadIntegrationSourceNotice(path, '3.3.0')
  const output = await readFile(path)
  assert.ok(output.subarray(0, original.length).equals(original))
  assert.ok(output.toString().includes(CAD_INTEGRATION_SOURCE.url))
  // This synthetic Full notice intentionally has no optional native asset layer.
  for (const source of CAD_NATIVE_CORRESPONDING_SOURCES) {
    assert.ok(output.toString().includes(source.url))
    assert.ok(output.toString().includes(source.sha256))
  }
  await appendCadIntegrationSourceNotice(path, '3.3.0')
  assert.ok((await readFile(path)).equals(output))
})

test('a different runtime or release cannot acquire a stale integration offer', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'file-viewer-cad-source-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = join(dir, 'THIRD_PARTY_LICENSES.txt')
  const original = '@flyfish-dev/cad-viewer@0.8.2\ndwf-viewer@0.6.7\n'
  await writeFile(path, original)
  await assert.rejects(appendCadIntegrationSourceNotice(path, '3.3.0'), /exact normal bundled/)
  assert.equal(await readFile(path, 'utf8'), original)
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    name: '@file-viewer/renderer-cad', version: '3.3.1',
    dependencies: { '@flyfish-dev/cad-viewer': '0.8.3' }
  }))
  await assert.rejects(writeCadIntegrationSourceNotice(dir), /different release/)
  await assert.rejects(readFile(join(dir, 'CORRESPONDING_SOURCE_NOTICE.txt')), { code: 'ENOENT' })
})

test('combined CAD notices append or preserve exactly the reviewed source offer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cad-offer-'))
  try {
    const file = join(root, 'NOTICE')
    const original = '@flyfish-dev/cad-viewer@0.8.3\ndwf-viewer@0.6.7\n'
    await writeFile(file, original)
    await appendCadIntegrationSourceNotice(file, '3.3.0')
    const expected = original + '\n\n' + cadIntegrationSourceNotice('3.3.0')
    assert.equal(await readFile(file, 'utf8'), expected)
    await appendCadIntegrationSourceNotice(file, '3.3.0')
    assert.equal(await readFile(file, 'utf8'), expected)
    for (const bad of [expected + cadIntegrationSourceNotice('3.3.0'),
      expected.replace(CAD_INTEGRATION_SOURCE.sha256, 'invalid'),
      expected.replace('@flyfish-dev/cad-viewer@0.8.3', '@flyfish-dev/cad-viewer@0.8.0')]) {
      assert.notEqual(bad, expected, 'The tamper probe must change the current reviewed offer')
      await writeFile(file, bad)
      await assert.rejects(() => appendCadIntegrationSourceNotice(file, '3.3.0'))
      assert.equal(await readFile(file, 'utf8'), bad)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})


test('the shared asset registry pins the actual generated current source offer', async () => {
  const registry = JSON.parse(await readFile(new URL('./licenses/asset-family-materials.json', import.meta.url), 'utf8'))
  const entry = registry.materials.find(item => item.sourcePath === 'packages/components/web/viewer/wasm/cad/CORRESPONDING_SOURCE_NOTICE.txt')
  assert.equal(entry.kind, 'generated-corresponding-source-offer')
  const bytes = await readFile(resolveWorkspaceAsset(resolve(import.meta.dirname, '../..'), entry.sourcePath))
  assert.ok(bytes.includes(Buffer.from(cadIntegrationSourceNotice('3.3.0'))))
  assert.equal(entry.bytes, bytes.length)
  assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'))
})
