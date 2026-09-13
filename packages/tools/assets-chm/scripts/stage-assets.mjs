import { execFileSync } from 'node:child_process'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const rendererDir = resolve(sourceRoot, 'packages/renderers/chm')
const vendorDir = resolve(packageDir, 'viewer/vendor/chm')

execFileSync(process.execPath, [
  resolve(sourceRoot, 'packages/build-support/stage-capability-asset-pack.mjs'),
  '--package-dir',
  'packages/tools/assets-chm',
], { cwd: sourceRoot, stdio: 'inherit' })

const notices = [
  ['LICENSE', 'LICENSE'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
  ['rust/NOTICE.md', 'RUST_NOTICE.md'],
  ['rust/THIRD_PARTY_LICENSES.md', 'RUST_THIRD_PARTY_LICENSES.md'],
]

await mkdir(vendorDir, { recursive: true })
for (const [source, target] of notices) {
  await Promise.all([
    copyFile(resolve(rendererDir, source), resolve(packageDir, target)),
    copyFile(resolve(rendererDir, source), resolve(vendorDir, target)),
  ])
}

// Renderer output is canonical after a fresh build; the Web viewer snapshot
// may have been produced with a different optional wasm-opt installation.
for (const filename of ['chm.worker.js', 'chm_wasm.js', 'chm_wasm_bg.wasm']) {
  await copyFile(resolve(rendererDir, 'dist', filename), resolve(vendorDir, filename))
}

console.log(`[assets-chm] staged ${notices.length} required license documents with the Worker/WASM payload`)
