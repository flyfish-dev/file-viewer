import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { verifyCodecArtifact, verifyCodecLockIntegrity } from './lib/verified-codec-artifacts.mjs'

const root = resolve(import.meta.dirname, '../..')
const packageRoot = join(root, 'packages/renderers/dicom')
const provenance = JSON.parse(
  readFileSync(join(packageRoot, 'third-party/native-codecs/PROVENANCE.json'), 'utf8')
)
const dicomRequire = createRequire(join(packageRoot, 'package.json'))
const loaderRequire = createRequire(dicomRequire.resolve('@cornerstonejs/dicom-image-loader'))
const codecRoot = (artifact) => {
  let directory = dirname(loaderRequire.resolve(artifact.name))
  while (directory !== dirname(directory)) {
    const manifest = join(directory, 'package.json')
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === artifact.name) {
      return directory
    }
    directory = dirname(directory)
  }
  throw new Error(`Unable to locate the installed native codec ${artifact.name}`)
}
const lockfile = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8')

test('all four installed codec artifacts and official lockfile integrities match', () => {
  assert.equal(provenance.wrapperArtifacts.length, 4)
  for (const artifact of provenance.wrapperArtifacts) {
    verifyCodecArtifact(codecRoot(artifact), artifact)
    verifyCodecLockIntegrity(lockfile, artifact)
  }
})

test('changed WASM, additional files, package versions and gitHead are rejected', () => {
  const artifact = provenance.wrapperArtifacts.find(
    (entry) => entry.name === '@cornerstonejs/codec-charls'
  )
  const directory = mkdtempSync(join(tmpdir(), 'file-viewer-codec-tamper-'))
  try {
    cpSync(codecRoot(artifact), directory, { recursive: true })
    const wasm = join(directory, artifact.files.find((file) => file.path.endsWith('.wasm')).path)
    const original = readFileSync(wasm)
    const changed = Buffer.from(original)
    changed[changed.length - 1] ^= 1
    writeFileSync(wasm, changed)
    assert.throws(() => verifyCodecArtifact(directory, artifact), /artifact bytes drifted/)
    writeFileSync(wasm, original)
    const additional = join(directory, 'unreviewed.wasm')
    writeFileSync(additional, original)
    assert.throws(() => verifyCodecArtifact(directory, artifact), /file inventory drifted/)
    rmSync(additional)
    const manifestPath = join(directory, 'package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.equal(manifest.gitHead, artifact.gitHead)
    manifest.gitHead = '0'.repeat(40)
    writeFileSync(manifestPath, JSON.stringify(manifest))
    assert.throws(() => verifyCodecArtifact(directory, artifact), /gitHead drifted/)
    manifest.gitHead = artifact.gitHead
    manifest.version = '0.0.0'
    writeFileSync(manifestPath, JSON.stringify(manifest))
    assert.throws(() => verifyCodecArtifact(directory, artifact), /version drifted/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('stale or changed codec lockfile resolutions are rejected', () => {
  const artifact = provenance.wrapperArtifacts[0]
  assert.throws(
    () =>
      verifyCodecLockIntegrity(lockfile.replace(artifact.integrity, 'sha512-changed'), artifact),
    /lockfile integrity drifted/
  )
  assert.throws(
    () =>
      verifyCodecLockIntegrity(lockfile, { ...artifact, package: artifact.package + '-missing' }),
    /Missing reviewed lockfile codec/
  )
})
