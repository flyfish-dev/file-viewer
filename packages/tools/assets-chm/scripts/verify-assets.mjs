import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const rendererDir = resolve(sourceRoot, 'packages/renderers/chm')
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))

const notices = [
  ['LICENSE', 'LICENSE'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
  ['rust/NOTICE.md', 'RUST_NOTICE.md'],
  ['rust/THIRD_PARTY_LICENSES.md', 'RUST_THIRD_PARTY_LICENSES.md'],
]
for (const [source, target] of notices) {
  assert(packageJson.files.includes(target), `${target} is missing from the assets-chm npm files allowlist`)
  const expected = await readFile(resolve(rendererDir, source))
  assert.deepEqual(await readFile(resolve(packageDir, target)), expected, `${target} drifted from renderer source`)
  assert.deepEqual(
    await readFile(resolve(packageDir, 'viewer/vendor/chm', target)),
    expected,
    `installed vendor/chm/${target} drifted from renderer source`
  )
}

for (const filename of ['chm.worker.js', 'chm_wasm.js', 'chm_wasm_bg.wasm']) {
  const info = await stat(resolve(packageDir, 'viewer/vendor/chm', filename))
  assert(info.isFile() && info.size > 0, `${filename} is missing from the assets-chm payload`)
}
const wasm = await readFile(resolve(packageDir, 'viewer/vendor/chm/chm_wasm_bg.wasm'))
assert.deepEqual([...wasm.subarray(0, 4)], [0, 97, 115, 109], 'assets-chm payload is not WebAssembly')

console.log('[assets-chm] Worker/WASM payload and four license documents verified')
