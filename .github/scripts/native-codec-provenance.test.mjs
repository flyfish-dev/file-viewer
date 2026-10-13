import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import {
  verifyCodecArtifact,
  verifyCodecLockIntegrity,
  verifyCodecSourceLicenses,
  verifyDicomSourceLicenses
} from './lib/verified-codec-artifacts.mjs'

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

test('all five installed codec artifacts and official lockfile integrities match', () => {
  assert.equal(provenance.wrapperArtifacts.length, 5)
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
    const originalManifest = readFileSync(manifestPath)
    const manifest = JSON.parse(originalManifest)
    assert.equal(
      createHash('sha256').update(originalManifest).digest('hex'),
      artifact.files.find((file) => file.path === 'package.json').sha256
    )
    if (manifest.gitHead !== undefined) assert.equal(manifest.gitHead, artifact.gitHead)
    manifest.gitHead = '0'.repeat(40)
    writeFileSync(manifestPath, JSON.stringify(manifest))
    assert.throws(() => verifyCodecArtifact(directory, artifact), /gitHead drifted/)
    writeFileSync(manifestPath, originalManifest)
    const changedMetadata = { ...JSON.parse(originalManifest), license: 'UNLICENSED' }
    writeFileSync(manifestPath, JSON.stringify(changedMetadata))
    assert.throws(
      () => verifyCodecArtifact(directory, artifact),
      /artifact bytes drifted: package.json/
    )
    const changedVersion = { ...JSON.parse(originalManifest), version: '0.0.0' }
    writeFileSync(manifestPath, JSON.stringify(changedVersion))
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

test('retained wrapper license requires the exact source text and reviewed source records', () => {
  const records = verifyCodecSourceLicenses(packageRoot, provenance)
  assert.equal(records.length, 3)
  const directory = mkdtempSync(join(tmpdir(), 'file-viewer-codec-license-'))
  try {
    const path = provenance.wrapperSourceLicenses[0].path
    cpSync(join(packageRoot, 'third-party'), join(directory, 'third-party'), { recursive: true })
    const original = readFileSync(join(directory, path))
    const changed = Buffer.from(original)
    changed[changed.length - 1] ^= 1
    writeFileSync(join(directory, path), changed)
    assert.throws(
      () => verifyCodecSourceLicenses(directory, provenance),
      /source-license hash drifted/
    )
    writeFileSync(join(directory, path), original)
    const altered = structuredClone(provenance)
    altered.wrapperSourceLicenses[0].gitCommit = '0'.repeat(40)
    assert.throws(
      () => verifyCodecSourceLicenses(directory, altered),
      /source-license records drifted/
    )
    rmSync(join(directory, path))
    assert.throws(() => verifyCodecSourceLicenses(directory, provenance), /ENOENT/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('all SDK inputs match official artifacts and require their complete exact-source license', () => {
  assert.equal(provenance.sdkArtifacts.length, 3)
  const coreRequire = createRequire(dicomRequire.resolve('@cornerstonejs/core'))
  for (const artifact of provenance.sdkArtifacts) {
    let directory = dirname(coreRequire.resolve(artifact.name))
    while (
      !existsSync(join(directory, 'package.json')) ||
      JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).name !== artifact.name
    ) {
      assert.notEqual(directory, dirname(directory), `Missing SDK ${artifact.name}`)
      directory = dirname(directory)
    }
    verifyCodecArtifact(directory, artifact)
    verifyCodecLockIntegrity(lockfile, artifact)
  }
  assert.equal(verifyDicomSourceLicenses(packageRoot, provenance).length, 6)
  const directory = mkdtempSync(join(tmpdir(), 'file-viewer-sdk-license-'))
  try {
    cpSync(join(packageRoot, 'third-party'), join(directory, 'third-party'), { recursive: true })
    const path = join(directory, provenance.sdkSourceLicenses[0].path)
    writeFileSync(path, 'MIT')
    assert.throws(
      () => verifyDicomSourceLicenses(directory, provenance),
      /SDK source-license size drifted/
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('SDK installation boundary rejects unknown files and changed generated shims or published bytes', () => {
  const artifact = provenance.sdkArtifacts.find((entry) => entry.name === '@cornerstonejs/core')
  const original = dirname(dicomRequire.resolve('@cornerstonejs/core/package.json'))
  const provider = dirname(
    createRequire(join(original, 'package.json')).resolve('@kitware/vtk.js/package.json')
  )
  const temp = mkdtempSync(join(tmpdir(), 'file-viewer-sdk-boundary-'))
  const directory = join(temp, 'sdk')
  try {
    cpSync(original, directory, { recursive: true })
    // Resolve the verified provider through the fixture's ancestor. Its symlink
    // stays outside the SDK boundary; every entry inside that boundary is checked.
    mkdirSync(join(temp, 'node_modules/@kitware'), { recursive: true })
    symlinkSync(provider, join(temp, 'node_modules/@kitware/vtk.js'), 'dir')
    for (const record of artifact.installationGeneratedBinShims) {
      const sourceShim = join(original, record.path)
      const shim = join(directory, record.path)
      const target = join(provider, record.providerBin.path)
      let relocated = readFileSync(sourceShim, 'utf8')
      const alias = join(dirname(dirname(original)), record.provider, record.providerBin.path)
      for (const spelling of new Set([alias, target])) {
        relocated = relocated
          .replaceAll(
            relative(dirname(sourceShim), spelling).split(sep).join('/'),
            relative(dirname(shim), target).split(sep).join('/')
          )
          .replaceAll(spelling, target)
      }
      writeFileSync(shim, relocated)
    }
    verifyCodecArtifact(directory, artifact)
    const unknown = join(directory, 'node_modules/.bin/unreviewed')
    writeFileSync(unknown, '#!/bin/sh\nexit 0\n')
    assert.throws(() => verifyCodecArtifact(directory, artifact), /file inventory drifted/)
    rmSync(unknown)
    const shim = join(directory, artifact.installationGeneratedBinShims[0].path)
    const shimBytes = readFileSync(shim)
    writeFileSync(shim, Buffer.concat([shimBytes, Buffer.from('\n# unreviewed change\n')]))
    assert.throws(() => verifyCodecArtifact(directory, artifact), /shim bytes drifted/)
    writeFileSync(shim, shimBytes)
    const published = join(directory, 'dist/esm/index.js')
    const bytes = readFileSync(published)
    const changed = Buffer.from(bytes)
    changed[changed.length - 1] ^= 1
    writeFileSync(published, changed)
    assert.throws(() => verifyCodecArtifact(directory, artifact), /artifact bytes drifted/)
    writeFileSync(published, bytes)
    const altered = structuredClone(artifact)
    altered.installationGeneratedBinShims.pop()
    assert.throws(() => verifyCodecArtifact(directory, altered), /bin records drifted/)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})

test('SDK bin aliases must still point to the verified provider', () => {
  const artifact = provenance.sdkArtifacts.find((entry) => entry.name === '@cornerstonejs/core')
  const original = dirname(dicomRequire.resolve('@cornerstonejs/core/package.json'))
  const provider = dirname(
    createRequire(join(original, 'package.json')).resolve('@kitware/vtk.js/package.json')
  )
  const temp = mkdtempSync(join(tmpdir(), 'file-viewer-sdk-alias-'))
  const directory = join(temp, 'node_modules/@cornerstonejs/core')
  const alias = join(temp, 'node_modules/@kitware/vtk.js')
  try {
    cpSync(original, directory, { recursive: true })
    mkdirSync(dirname(alias), { recursive: true })
    symlinkSync(provider, alias, 'dir')
    for (const record of artifact.installationGeneratedBinShims) {
      const sourceShim = join(original, record.path)
      const target = join(provider, record.providerBin.path)
      const originalAlias = join(
        dirname(dirname(original)),
        record.provider,
        record.providerBin.path
      )
      let relocated = readFileSync(sourceShim, 'utf8')
      for (const spelling of new Set([originalAlias, target])) {
        relocated = relocated
          .replaceAll(
            relative(dirname(sourceShim), spelling).split(sep).join('/'),
            relative(dirname(join(directory, record.path)), target)
              .split(sep)
              .join('/')
          )
          .replaceAll(spelling, target)
      }
      writeFileSync(join(directory, record.path), relocated)
    }
    verifyCodecArtifact(directory, artifact)
    const replacement = join(temp, 'replacement')
    cpSync(provider, replacement, { recursive: true })
    rmSync(alias)
    symlinkSync(replacement, alias, 'dir')
    assert.throws(
      () => verifyCodecArtifact(directory, artifact),
      /alias must resolve to the verified provider/
    )
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})
