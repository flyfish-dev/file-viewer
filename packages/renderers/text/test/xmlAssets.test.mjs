import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { copyXmlProfileAssets } from '../bin/copy-xml-profile-assets.mjs'

test('XML asset helper copies pinned offline engines and notices without deleting unrelated files', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'file-viewer-xml-assets-'))
  try {
    await writeFile(join(destination, 'host-file.txt'), 'keep')
    const result = await copyXmlProfileAssets(destination)
    for (const [name, item] of Object.entries(result.files)) {
      const bytes = await readFile(join(destination, name))
      assert.equal(bytes.length, item.bytes)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256)
    }
    assert.equal(await readFile(join(destination, 'host-file.txt'), 'utf8'), 'keep')
    assert.ok(result.files['licenses/xslt-polyfill-LICENSE.txt'])
    assert.ok(result.files['licenses/xmllint-wasm-COPYING.txt'])
    assert.deepEqual([...await readFile(join(destination, 'xmllint.wasm'))].slice(0, 4), [0, 97, 115, 109])
    assert.equal(JSON.parse(await readFile(join(destination, 'manifest.json'), 'utf8')).engines[1].version, '1.0.31')
  } finally { await rm(destination, { recursive: true, force: true }) }
})
