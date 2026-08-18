import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const boundaryRoot = join(packageRoot, 'vendor/aosp-mp4v')
const outputRoot = join(packageRoot, 'src/vendor/mp4v')
const source = JSON.parse(await readFile(join(boundaryRoot, 'SOURCE.json'), 'utf8'))
const archiveUrl = `${source.upstream}/+archive/${source.commit}/${source.path}.tar.gz`
const buildRoot = await mkdtemp(join(tmpdir(), 'file-viewer-aosp-mp4v-'))

const sha256 = (input) => createHash('sha256').update(input).digest('hex')

const hashSourceTree = async (root) => {
  const files = []
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else files.push(path)
    }
  }
  await walk(root)
  files.sort((left, right) => relative(root, left).localeCompare(relative(root, right)))
  const hash = createHash('sha256')
  for (const path of files) {
    hash.update(relative(root, path))
    hash.update('\0')
    hash.update(await readFile(path))
    hash.update('\0')
  }
  return hash.digest('hex')
}

try {
  const response = await fetch(archiveUrl)
  assert(response.ok, `Unable to download pinned AOSP MP4V source: ${response.status}`)
  const archive = Buffer.from(await response.arrayBuffer())

  const archivePath = join(buildRoot, 'aosp-mp4v.tar.gz')
  const sourceRoot = join(buildRoot, 'source')
  await Promise.all([writeFile(archivePath, archive), mkdir(sourceRoot)])
  const extract = spawnSync('tar', ['-xzf', archivePath, '-C', sourceRoot], { encoding: 'utf8' })
  assert.equal(extract.status, 0, extract.stderr || 'Unable to extract pinned AOSP source.')
  assert.equal(
    await hashSourceTree(sourceRoot),
    source.sourceTreeSha256,
    'Pinned AOSP source tree checksum changed.'
  )

  const androidBuild = await readFile(join(sourceRoot, 'Android.bp'), 'utf8')
  assert.match(androidBuild, /SPDX-license-identifier-Apache-2\.0/)
  const sourceFiles = (await readdir(join(sourceRoot, 'src')))
    .filter((name) => name.endsWith('.cpp'))
    .sort()
    .map((name) => join(sourceRoot, 'src', name))
  assert.equal(sourceFiles.length, 23, 'Unexpected AOSP MP4V source file count.')
  for (const path of [
    ...sourceFiles,
    ...((await readdir(join(sourceRoot, 'include')))
      .filter((name) => name.endsWith('.h'))
      .map((name) => join(sourceRoot, 'include', name)))
  ]) {
    const text = await readFile(path, 'utf8')
    assert.match(text, /Licensed under the Apache License, Version 2\.0/)
    assert.doesNotMatch(text, /(?:GNU (?:LESSER )?GENERAL PUBLIC LICENSE|\b(?:LGPL|AGPL)\b)/i)
  }

  const version = spawnSync('em++', ['--version'], { encoding: 'utf8' })
  assert.equal(version.status, 0, version.stderr || 'Emscripten em++ is required.')
  assert.match(version.stdout, new RegExp(`\\b${source.emscriptenVersion.replaceAll('.', '\\.')}\\b`))

  await mkdir(outputRoot, { recursive: true })
  const outputModule = join(outputRoot, 'mp4v-decoder.mjs')
  const compile = spawnSync('em++', [
    '-O3',
    '-flto',
    '-msimd128',
    `-I${boundaryRoot}`,
    `-I${join(sourceRoot, 'include')}`,
    `-I${join(sourceRoot, 'src')}`,
    join(boundaryRoot, 'wrapper.cpp'),
    ...sourceFiles,
    '-sMODULARIZE=1',
    '-sEXPORT_ES6=1',
    '-sENVIRONMENT=web,worker',
    '-sFILESYSTEM=0',
    '-sALLOW_MEMORY_GROWTH=1',
    '-sINITIAL_MEMORY=33554432',
    '-sEXPORTED_FUNCTIONS=["_malloc","_free","_mp4v_create","_mp4v_decode","_mp4v_reset","_mp4v_output","_mp4v_width","_mp4v_height","_mp4v_buffer_width","_mp4v_buffer_height","_mp4v_destroy"]',
    '-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]',
    '-o',
    outputModule
  ], { encoding: 'utf8' })
  assert.equal(compile.status, 0, compile.stderr || 'AOSP MP4V WASM compilation failed.')

  const moduleBytes = await readFile(outputModule)
  const wasmPath = join(outputRoot, 'mp4v-decoder.wasm')
  await Promise.all([chmod(outputModule, 0o644), chmod(wasmPath, 0o644)])
  const wasmBytes = await readFile(wasmPath)
  const compressedWasm = gzipSync(wasmBytes, { level: 9 })
  assert(wasmBytes.length <= 128 * 1024, `MP4V WASM exceeded 128 KiB: ${wasmBytes.length}`)
  assert(compressedWasm.length <= 40 * 1024, 'MP4V WASM gzip size exceeded 40 KiB.')
  assert(moduleBytes.length <= 12 * 1024, `MP4V loader exceeded 12 KiB: ${moduleBytes.length}`)
  assert.equal(moduleBytes.length, source.artifacts.loaderBytes)
  assert.equal(sha256(moduleBytes), source.artifacts.loaderSha256)
  assert.equal(wasmBytes.length, source.artifacts.wasmBytes)
  assert.equal(compressedWasm.length, source.artifacts.wasmGzipBytes)
  assert.equal(sha256(wasmBytes), source.artifacts.wasmSha256)

  console.log(JSON.stringify({
    source: `${source.commit}/${source.path}`,
    license: source.license,
    toolchainLicense: source.toolchainLicense,
    module: { bytes: moduleBytes.length, sha256: sha256(moduleBytes) },
    wasm: {
      bytes: wasmBytes.length,
      gzipBytes: compressedWasm.length,
      sha256: sha256(wasmBytes)
    }
  }, null, 2))
} finally {
  await rm(buildRoot, { recursive: true, force: true })
}
