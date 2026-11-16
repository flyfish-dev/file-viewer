import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { resolveWasmOpt } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rustDir = resolve(packageDir, 'rust')
let targetDir = resolve(rustDir, 'target/wasm32-unknown-unknown/release')
const outDir = resolve(packageDir, 'dist/rpgp-wasm')
let wasmInput = resolve(targetDir, 'file_viewer_rpgp_wrapper.wasm')
const buildDiagnostics = process.env.FILE_VIEWER_RPGP_BUILD_DIAGNOSTICS === '1'
let canonicalBuild
let canonicalMetadata
if (process.env.FILE_VIEWER_RPGP_CANONICAL_METADATA === '1') {
  canonicalMetadata = await import('./canonical-crate-metadata.mjs')
  canonicalBuild = await canonicalMetadata.prepareCanonicalMetadata({ rustDir, environment: process.env })
  targetDir = resolve(canonicalBuild.targetDirectory, 'wasm32-unknown-unknown/release')
  wasmInput = resolve(targetDir, 'file_viewer_rpgp_wrapper.wasm')
}

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
const cargoBuildArgs = ['build', '--release', '--locked', '--target', 'wasm32-unknown-unknown']
if (buildDiagnostics) cargoBuildArgs.push('--verbose')
if (canonicalBuild) Object.assign(buildEnvironment, canonicalBuild.environment)
run('cargo', cargoBuildArgs, { env: buildEnvironment })
if (buildDiagnostics)
  await copyFile(wasmInput, resolve(rustDir, 'target/file-viewer-rpgp-raw-input.wasm'))
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

if (buildDiagnostics) {
  const inspect = (command, args) => execFileSync(command, args, {
    cwd: rustDir,
    env: buildEnvironment,
    encoding: 'utf8'
  }).trim()
  const identity = async (directory, name) => {
    const bytes = await readFile(resolve(directory, name))
    return { path: name, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') }
  }
  const fingerprints = async (directory) => {
    try {
      await access(directory)
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
    const result = []
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue
      const entryDir = resolve(directory, entry.name)
      for (const name of (await readdir(entryDir)).filter(name => name.endsWith('.json')).sort()) {
        const bytes = await readFile(resolve(entryDir, name))
        // Cargo's opaque u64 identities exceed JavaScript's integer precision.
        const parsed = JSON.parse(bytes.toString('utf8'), (_key, value, context) =>
          typeof value === 'number' && !Number.isSafeInteger(value) ? context.source : value)
        const fields = {}
        for (const key of ['rustc', 'profile', 'features', 'declared_features', 'deps', 'rustflags']) {
          if (Object.hasOwn(parsed, key)) fields[key] = parsed[key]
        }
        result.push({
          ...await identity(directory, `${entry.name}/${name}`),
          fields
        })
      }
    }
    return result
  }
  const sysroot = inspect('rustc', ['--print', 'sysroot'])
  const stdlibDir = resolve(sysroot, 'lib/rustlib/wasm32-unknown-unknown/lib')
  const stdlibFiles = (await readdir(stdlibDir)).filter(name => /\.(rlib|rmeta)$/.test(name)).sort()
  const sourceFiles = ['Cargo.lock', 'Cargo.toml',
    ...(await readdir(resolve(rustDir, 'src'))).filter(name => name.endsWith('.rs')).sort().map(name => `src/${name}`)]
  const diagnostics = {
    schemaVersion: 1,
    purpose: 'file-viewer-rpgp-build-diagnostics',
    releaseApproval: false,
    cwd: rustDir,
    rustc: inspect('rustc', ['--version', '--verbose']),
    cargo: inspect('cargo', ['--version', '--verbose']),
    sysroot,
    cargoBuildArgs,
    cargoEncodedRustflags: buildEnvironment.CARGO_ENCODED_RUSTFLAGS,
    stdlibDirectory: stdlibDir,
    stdlib: await Promise.all(stdlibFiles.map(name => identity(stdlibDir, name))),
    sources: await Promise.all(sourceFiles.map(name => identity(rustDir, name))),
    fingerprints: {
      target: await fingerprints(resolve(targetDir, '.fingerprint')),
      host: await fingerprints(resolve(canonicalBuild?.targetDirectory || resolve(rustDir, 'target'), 'release/.fingerprint'))
    },
    outputs: {
      rust: await identity(targetDir, 'file_viewer_rpgp_wrapper.wasm'),
      optimized: await identity(outDir, 'rpgp_wrapper_bg.wasm')
    },
    ...(canonicalBuild ? { canonicalMetadata: await canonicalMetadata.canonicalMetadataDiagnostics(canonicalBuild) } : {})
  }
  await writeFile(resolve(rustDir, 'target/file-viewer-rpgp-build-identity.json'), `${JSON.stringify(diagnostics, null, 2)}\n`)
}
