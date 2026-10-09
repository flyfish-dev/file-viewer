import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { buildBrowserRuntime } from '../../../build-support/build-browser-runtime.mjs'
import { verifyCodecArtifact, verifyCodecLockIntegrity } from '../../../../.github/scripts/lib/verified-codec-artifacts.mjs'

const packageDir = resolve(import.meta.dirname, '..')
const root = resolve(packageDir, '../../..')
const require = createRequire(join(packageDir, 'package.json'))
const loaderRequire = createRequire(require.resolve('@cornerstonejs/dicom-image-loader'))
const provenance = JSON.parse(await readFile(join(packageDir, 'third-party/native-codecs/PROVENANCE.json'), 'utf8'))
const lockfile = await readFile(join(root, 'pnpm-lock.yaml'), 'utf8')
const wasmHashes = []
for (const artifact of provenance.wrapperArtifacts) {
  let directory = dirname(loaderRequire.resolve(artifact.name))
  while (JSON.parse(await readFile(join(directory, 'package.json'), 'utf8').catch(() => '{}')).name !== artifact.name) {
    if (dirname(directory) === directory) throw new Error(`Missing codec package: ${artifact.name}`)
    directory = dirname(directory)
  }
  verifyCodecArtifact(directory, artifact)
  verifyCodecLockIntegrity(lockfile, artifact)
  const wasm = artifact.files.filter(file => /(?:_decode|openjphjs)\.wasm$/.test(file.path))
  if (wasm.length !== 1) throw new Error(`Expected one reviewed decoder WASM: ${artifact.name}`)
  wasmHashes.push(wasm[0].sha256)
}
await buildBrowserRuntime({ packageDir, entries: ['index', 'inspect', 'dicom', 'decode-worker'], requiredVersions: { fflate: '0.7.5' }, readmeLicensePackages: ['seedrandom'], wasmHashes })
