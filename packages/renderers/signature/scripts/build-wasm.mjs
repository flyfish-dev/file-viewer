import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { resolveWasmOpt } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rustDir = resolve(packageDir, 'rust')
const targetDir = resolve(rustDir, 'target/wasm32-unknown-unknown/release')
const outDir = resolve(packageDir, 'dist/rpgp-wasm')
const wasmInput = resolve(targetDir, 'file_viewer_rpgp_wrapper.wasm')

const run = (command, args, options = {}) => {
  try {
    execFileSync(command, args, { cwd: rustDir, stdio: 'inherit', ...options })
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${command} is required to build the optional rPGP WASM backend.`, {
        cause: error
      })
    }
    throw error
  }
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
try {
  await access(resolve(rustDir, 'Cargo.lock'))
} catch {
  console.warn('[renderer-signature] Cargo.lock is missing; generating it before the locked build.')
  run('cargo', ['generate-lockfile'])
}
const buildEnvironment = { ...process.env }
// Verification and developer builds can overwrite the release output. Keep
// host paths out of every build, including strings in the WASM data section.
{
  const existing = process.env.CARGO_ENCODED_RUSTFLAGS ?? process.env.RUSTFLAGS?.trim().split(/\s+/).join('\x1f') ?? ''
  const prefixes = new Set([homedir(), packageDir,
    resolve(process.env.CARGO_HOME || resolve(homedir(), '.cargo')),
    execFileSync('rustc', ['--print', 'sysroot'], { encoding: 'utf8' }).trim()])
  buildEnvironment.CARGO_ENCODED_RUSTFLAGS = [existing,
    ...[...prefixes].map(prefix => `--remap-path-prefix=${prefix}=/file-viewer-rpgp-build`)]
    .filter(Boolean).join('\x1f')
}
run('cargo', ['build', '--release', '--locked', '--target', 'wasm32-unknown-unknown'], { env: buildEnvironment })
run('wasm-bindgen', [
  wasmInput,
  '--target',
  'web',
  '--out-dir',
  outDir,
  '--out-name',
  'rpgp_wrapper'
])

const wasmOutput = resolve(outDir, 'rpgp_wrapper_bg.wasm')
const wasmOpt = process.env.FILE_VIEWER_WASM_OPT || resolveWasmOpt()
if (wasmOpt) {
  console.log(`[renderer-signature] Optimizing rPGP WASM with ${wasmOpt}.`)
  execFileSync(wasmOpt, [
    '-Oz',
    // Only the post-MVP features rustc emits for wasm32-unknown-unknown.
    // --all-features rewrites the module with WasmGC encodings that Node 18
    // and older browsers cannot parse.
    '--enable-bulk-memory',
    '--enable-sign-ext',
    '--enable-nontrapping-float-to-int',
    '--enable-mutable-globals',
    '--enable-reference-types',
    '--enable-multivalue',
    wasmOutput,
    '-o',
    wasmOutput
  ], {
    stdio: 'inherit'
  })
} else {
  console.warn('[renderer-signature] wasm-opt not found; keeping the release wasm-bindgen output.')
}

const raw = await readFile(wasmOutput)
const brotli = brotliCompressSync(raw, {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 }
})
console.log(
  `[renderer-signature] rPGP WASM: ${raw.byteLength} bytes raw, ${brotli.byteLength} bytes Brotli.`
)
