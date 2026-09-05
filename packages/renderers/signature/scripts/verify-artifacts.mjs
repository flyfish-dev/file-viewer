import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wasmPath = resolve(packageDir, 'dist/rpgp-wasm/rpgp_wrapper_bg.wasm')
const gluePath = resolve(packageDir, 'dist/rpgp-wasm/rpgp_wrapper.js')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const readArtifacts = async () => ({
  wasm: await readFile(wasmPath),
  glue: await readFile(gluePath)
})

const first = await readArtifacts()
// The raw budget reflects the compatibility-safe build: wasm-opt must stay
// scoped to rustc's post-MVP features (no WasmGC) so Node 18 and browsers
// without GC can parse the module. The shipped Brotli payload below stays
// within its own budget.
assert(
  first.wasm.byteLength <= 1_900_000,
  `rPGP WASM raw size ${first.wasm.byteLength} exceeds the 1,900,000-byte opt-in budget.`
)
const brotli = brotliCompressSync(first.wasm, {
  params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 }
})
assert(
  brotli.byteLength <= 450_000,
  `rPGP WASM Brotli size ${brotli.byteLength} exceeds the 450,000-byte opt-in budget.`
)
await WebAssembly.compile(first.wasm)

execFileSync(process.execPath, ['scripts/build-wasm.mjs'], { cwd: packageDir, stdio: 'inherit' })
const second = await readArtifacts()
assert.equal(
  hash(second.wasm),
  hash(first.wasm),
  'Two locked rPGP WASM builds produced different bytes.'
)
assert.equal(
  hash(second.glue),
  hash(first.glue),
  'Two locked wasm-bindgen glue builds produced different bytes.'
)

const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'file-viewer-signature-pack-'))
try {
  const output = execFileSync('pnpm', ['pack', '--pack-destination', temporaryDirectory], {
    cwd: packageDir,
    encoding: 'utf8'
  }).trim()
  const tarballName = output.split(/\r?\n/u).at(-1)
  assert(tarballName, 'pnpm pack did not report a signature-renderer tarball.')
  const tarballPath = resolve(temporaryDirectory, tarballName)
  const entries = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' })
    .split(/\r?\n/u)
    .filter(Boolean)
  const required = [
    'package/dist/index.js',
    'package/dist/index.d.ts',
    'package/dist/signature.worker.js',
    'package/dist/container.worker.js',
    'package/dist/rpgp-wasm/rpgp_wrapper.js',
    'package/dist/rpgp-wasm/rpgp_wrapper_bg.wasm',
    'package/file-viewer.capability.json',
    'package/THIRD_PARTY_NOTICES.md',
    'package/THIRD_PARTY_LICENSES.json'
  ]
  for (const entry of required)
    assert(entries.includes(entry), `Packed signature renderer is missing ${entry}.`)
  assert(
    !entries.some((entry) => /(?:^|\/)rust\/(?:src|target)\//u.test(entry)),
    'Packed signature renderer leaked Rust source or target output.'
  )
  assert(
    !entries.some((entry) => entry.includes('/test/fixtures/')),
    'Packed signature renderer leaked regression fixtures.'
  )
  assert(
    !entries.some((entry) => entry.includes('/scripts/')),
    'Packed signature renderer leaked build scripts.'
  )
  const tarballSize = (await stat(tarballPath)).size
  assert(
    tarballSize <= 1_800_000,
    `Signature renderer tarball ${tarballSize} exceeds the 1,800,000-byte package budget.`
  )
  console.log(
    `Signature renderer artifacts are deterministic and bounded: ${first.wasm.byteLength} B raw, ${brotli.byteLength} B Brotli, ${tarballSize} B tarball.`
  )
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
