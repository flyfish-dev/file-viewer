import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vendorDir = resolve(packageDir, 'vendor/libwpd-src')
const outputDir = resolve(packageDir, 'dist')
const workDir = mkdtempSync(join(tmpdir(), 'file-viewer-libwpd-wasm-'))

const inputs = [
  ['librevenge-0.0.6.tar.gz', '686cc36be3196a0a808761cfd3951a46ff809cb0e028b0902c787261a1389d0f'],
  ['libwpd-0.10.3.tar.gz', 'ca3575282acff8c952c12160433ad7e73e803ff3f070b8442c7ffa1f3a19f9ae'],
  ['boost-subset.tar.gz', '802ee17c5e380efbcbb696468ee3c7090aa409db89c2063b4c9b8d3e3aff1e08'],
]

try {
  for (const [filename, expected] of inputs) {
    const path = resolve(vendorDir, filename)
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex')
    if (actual !== expected) throw new Error(`${filename} checksum mismatch: ${actual}`)
    execFileSync('tar', ['-xzf', path, '-C', workDir], { stdio: 'inherit' })
  }

const revenge = resolve(workDir, 'librevenge-0.0.6')
const wpd = resolve(workDir, 'libwpd-0.10.3')
const cppFiles = directory => readdirSync(directory)
  .filter(filename => filename.endsWith('.cpp'))
  .sort()
  .map(filename => resolve(directory, filename))

const args = [
  '-std=c++17', '-O3', '-DNDEBUG', '-fexceptions',
  `-I${resolve(revenge, 'inc')}`,
  `-I${resolve(revenge, 'src/lib')}`,
  `-I${resolve(wpd, 'inc')}`,
  `-I${resolve(wpd, 'src/lib')}`,
  `-I${resolve(workDir, 'boost')}`,
  resolve(vendorDir, 'shim.cpp'),
  ...cppFiles(resolve(revenge, 'src/lib')),
  ...cppFiles(resolve(wpd, 'src/lib')),
  '-s', 'MODULARIZE=1',
  '-s', 'EXPORT_ES6=1',
  '-s', 'EXPORT_NAME=createFileViewerLibWpd',
  '-s', 'ENVIRONMENT=web,worker,node',
  '-s', 'ALLOW_MEMORY_GROWTH=1',
  '-s', 'FILESYSTEM=0',
  '-s', 'USE_ZLIB=1',
  '-s', 'ASSERTIONS=0',
  '-s', 'INCOMING_MODULE_JS_API=["locateFile","wasmBinary","print","printErr"]',
  '-s', 'EXPORTED_FUNCTIONS=["_malloc","_free","_xberg_wpd_is_supported","_xberg_wpd_extract_document","_xberg_wpd_free_string"]',
  '-s', 'EXPORTED_RUNTIME_METHODS=["HEAPU8","HEAPU32"]',
  '-o', resolve(outputDir, 'libwpd.mjs'),
]

  execFileSync(process.env.EMXX || 'em++', args, { stdio: 'inherit' })
  copyFileSync(resolve(outputDir, 'libwpd.mjs'), resolve(packageDir, 'vendor/libwpd.mjs'))
  console.log(`[renderer-wordperfect] Built checksum-pinned libwpd/librevenge WebAssembly in ${outputDir}`)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
