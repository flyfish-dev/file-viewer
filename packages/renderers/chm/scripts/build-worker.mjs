import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wasmSourceDir = resolve(packageDir, 'src/wasm')
const outputDir = resolve(packageDir, 'dist')
const workerOutput = resolve(outputDir, 'chm.worker.js')

await mkdir(outputDir, { recursive: true })
await build({
  entryPoints: [resolve(packageDir, 'src/chm.worker.ts')],
  outfile: workerOutput,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
})

await Promise.all([
  ['chm_wasm.js', 'chm_wasm.js'],
  ['chm_wasm_bg.wasm', 'chm_wasm_bg.wasm'],
].map(async ([source, output]) => {
  await copyFile(resolve(wasmSourceDir, source), resolve(outputDir, output))
}))

const source = await readFile(workerOutput, 'utf8')
await writeFile(workerOutput, source.replace(/[ \t]+$/gm, ''))
console.log('[renderer-chm] Built the standalone module Worker and copied Rust/WASM runtime assets.')
