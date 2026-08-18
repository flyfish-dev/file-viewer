import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const boundaryRoot = join(packageRoot, 'vendor/aosp-mp4v')
const sourceRoot = join(packageRoot, 'src/vendor/mp4v')
const distRoot = join(packageRoot, 'dist/vendor/mp4v')
const metadata = JSON.parse(await readFile(join(boundaryRoot, 'SOURCE.json'), 'utf8'))

const sha256 = (input) => createHash('sha256').update(input).digest('hex')
const forbiddenCode = /(?:GNU (?:LESSER )?GENERAL PUBLIC LICENSE|\b(?:LGPL|AGPL)\b|\bGPL(?:v[23])?\b|\bFFmpeg\b|\blibav\b)/i

assert.equal(metadata.license, 'Apache-2.0')
assert.equal(metadata.toolchainLicense, 'MIT OR NCSA')
assert.deepEqual(metadata.forbiddenLicenses, ['LGPL', 'GPL', 'AGPL'])

const loader = await readFile(join(sourceRoot, 'mp4v-decoder.mjs'))
const wasm = await readFile(join(sourceRoot, 'mp4v-decoder.wasm'))
const compressedWasm = gzipSync(wasm, { level: 9 })
assert.equal((await stat(join(sourceRoot, 'mp4v-decoder.wasm'))).mode & 0o777, 0o644)

assert.equal(loader.length, metadata.artifacts.loaderBytes)
assert.equal(sha256(loader), metadata.artifacts.loaderSha256)
assert.equal(wasm.length, metadata.artifacts.wasmBytes)
assert.equal(compressedWasm.length, metadata.artifacts.wasmGzipBytes)
assert.equal(sha256(wasm), metadata.artifacts.wasmSha256)
assert(loader.length <= 12 * 1024, `MP4V loader exceeded 12 KiB: ${loader.length}`)
assert(wasm.length <= 128 * 1024, `MP4V WASM exceeded 128 KiB: ${wasm.length}`)
assert(compressedWasm.length <= 40 * 1024, `MP4V WASM gzip exceeded 40 KiB: ${compressedWasm.length}`)
assert.doesNotMatch(loader.toString('utf8'), forbiddenCode)

for (const name of [
  'mp4v-decoder.mjs',
  'mp4v-decoder.wasm',
  'AOSP-NOTICE.txt',
  'EMSCRIPTEN-LICENSE.txt'
]) {
  const [sourceBytes, distBytes] = await Promise.all([
    readFile(join(sourceRoot, name)),
    readFile(join(distRoot, name))
  ])
  assert(sourceBytes.equals(distBytes), `dist/vendor/mp4v/${name} is stale.`)
}

const aospNotice = await readFile(join(sourceRoot, 'AOSP-NOTICE.txt'), 'utf8')
const emscriptenLicense = await readFile(join(sourceRoot, 'EMSCRIPTEN-LICENSE.txt'), 'utf8')
assert.match(aospNotice, /Apache License\s+Version 2\.0/)
assert.match(aospNotice, /The Android Open Source Project/)
assert.match(emscriptenLicense, /MIT license and the\s+University of Illinois\/NCSA Open Source License/)

for (const path of [
  join(packageRoot, 'src/mp4.ts'),
  join(packageRoot, 'src/mp4v.worker.ts'),
  join(packageRoot, 'src/mp4vPlayer.ts'),
  join(boundaryRoot, 'wrapper.cpp'),
  join(boundaryRoot, 'log/log.h')
]) {
  assert.doesNotMatch(await readFile(path, 'utf8'), forbiddenCode, `Forbidden decoder source reference: ${path}`)
}

const imports = WebAssembly.Module.imports(new WebAssembly.Module(wasm))
assert(
  imports.every(({ module, name }) => !forbiddenCode.test(`${module}/${name}`)),
  'The MP4V WASM imports a forbidden decoder library.'
)

const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
assert.equal(packageJson.license, 'Apache-2.0')
assert(packageJson.files.includes('dist'), 'The published package must include dist decoder notices.')

console.log(JSON.stringify({
  ok: true,
  decoder: metadata.name,
  source: `${metadata.commit}/${metadata.path}`,
  license: metadata.license,
  toolchainLicense: metadata.toolchainLicense,
  loader: { bytes: loader.length, sha256: sha256(loader) },
  wasm: {
    bytes: wasm.length,
    gzipBytes: compressedWasm.length,
    sha256: sha256(wasm),
    imports
  }
}, null, 2))
