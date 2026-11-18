import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { CAD_INTEGRATION_SOURCE } from './cad-source-offer.mjs'

test('the normal Demo CAD copier retains the complete source offer and grants in every alias', async t => {
  const root = resolve(import.meta.dirname, '../..')
  const target = await mkdtemp(join(tmpdir(), 'file-viewer-cad-copy-'))
  t.after(() => rm(target, { recursive: true, force: true }))
  const cad = join(target, 'wasm/cad')
  await mkdir(cad, { recursive: true })
  await writeFile(join(cad, 'host-owned.json'), '{"retained":true}\n')
  const result = spawnSync(process.execPath, [
    'scripts/copy-cad-wasm.mjs', '--cad-only', '--public-root', target
  ], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readFile(join(cad, 'host-owned.json'), 'utf8'), '{"retained":true}\n')
  const registry = JSON.parse(await readFile(join(root, 'packages/build-support/licenses/asset-family-materials.json')))
  const material = registry.materials.find(item => item.component === 'CAD runtime@0.8.4')
  for (const alias of ['', '0.8.0', '0.8.1', '0.8.3', '0.8.4']) {
    const directory = join(cad, alias)
    const notice = await readFile(join(directory, 'CORRESPONDING_SOURCE_NOTICE.txt'))
    assert.ok(notice.toString().includes(CAD_INTEGRATION_SOURCE.url), alias)
    assert.ok(notice.toString().includes(CAD_INTEGRATION_SOURCE.sha256), alias)
    assert.equal(createHash('sha256').update(notice).digest('hex'), material.sha256)
    assert.equal(notice.length, material.bytes)
    for (const file of ['LICENSE', 'NOTICE', 'GPL-3.0.txt']) {
      assert.deepEqual(await readFile(join(directory, file)), await readFile(join(cad, file)))
    }
  }
})
