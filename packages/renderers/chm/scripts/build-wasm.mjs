import { execFileSync } from 'node:child_process'
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rustDir = resolve(packageDir, 'rust')
const targetDir = resolve(rustDir, 'target/wasm32-unknown-unknown/release')
const wasmInput = resolve(targetDir, 'file_viewer_chm_wasm.wasm')
const outputDir = resolve(packageDir, 'src/wasm')
const wasmOutput = resolve(outputDir, 'chm_wasm_bg.wasm')

const run = (command, args, options = {}) => {
  try {
    execFileSync(command, args, { cwd: rustDir, stdio: 'inherit', ...options })
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${command} is required to build the CHM Rust/WASM parser.`, { cause: error })
    }
    throw error
  }
}

const version = execFileSync('wasm-bindgen', ['--version'], { encoding: 'utf8' }).trim()
if (version !== 'wasm-bindgen 0.2.127') {
  throw new Error(`CHM builds require wasm-bindgen 0.2.127; found ${version}.`)
}

await access(resolve(rustDir, 'Cargo.lock'))
await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })

run('cargo', ['build', '--release', '--locked', '--target', 'wasm32-unknown-unknown'])
run('wasm-bindgen', [
  wasmInput,
  '--target',
  'web',
  '--out-dir',
  outputDir,
  '--out-name',
  'chm_wasm',
])
try {
  execFileSync('wasm-opt', ['-Oz', '--all-features', wasmOutput, '-o', wasmOutput], {
    cwd: packageDir,
    stdio: 'inherit',
  })
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.warn('[renderer-chm] wasm-opt is unavailable; keeping the release wasm-bindgen output.')
  } else {
    throw error
  }
}

const wasm = await readFile(wasmOutput)
if (wasm.byteLength > 4 * 1024 * 1024) {
  throw new Error(`CHM WASM is unexpectedly large: ${wasm.byteLength} bytes.`)
}
const brotli = brotliCompressSync(wasm, {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
})
console.log(`[renderer-chm] Rust/WASM: ${wasm.byteLength} bytes raw, ${brotli.byteLength} bytes Brotli.`)
