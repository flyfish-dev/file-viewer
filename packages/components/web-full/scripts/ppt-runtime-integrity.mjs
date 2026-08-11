// Keep this verifier beside the Web Full build so the exported component
// repository can build and validate its packaged PPT runtime independently.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export const PPT_RUNTIME_VERSION = '0.3.3'
export const PPT_RUNTIME_RELATIVE_ROOT = 'vendor/ppt'
export const PPT_RUNTIME_REQUIRED_FILES = Object.freeze([
  'index.mjs',
  'worker.mjs',
  'frame-cache.mjs',
  'ppt-native.wasm',
  'ppt-font-cjk.otf',
  'manifest.json',
  'package.json',
  'LICENSE',
  'NOTICE'
])

const fail = message => {
  throw new Error(`[ppt-runtime-integrity] ${message}`)
}

const sha256 = async path => createHash('sha256').update(await readFile(path)).digest('hex')

async function requiredFile(root, filename) {
  const path = join(root, filename)
  if (!existsSync(path) || !(await stat(path)).isFile()) {
    fail(`Missing @file-viewer/ppt runtime file ${path}`)
  }
  return path
}

export async function verifyPptRuntimeDirectory(runtimeDir, options = {}) {
  const root = resolve(runtimeDir)
  const expectedVersion = options.expectedVersion || PPT_RUNTIME_VERSION
  const paths = Object.fromEntries(
    await Promise.all(PPT_RUNTIME_REQUIRED_FILES.map(async filename => [
      filename,
      await requiredFile(root, filename)
    ]))
  )
  const [manifest, packageJson, indexSource, workerSource, frameCacheSource] = await Promise.all([
    readFile(paths['manifest.json'], 'utf8').then(JSON.parse),
    readFile(paths['package.json'], 'utf8').then(JSON.parse),
    readFile(paths['index.mjs'], 'utf8'),
    readFile(paths['worker.mjs'], 'utf8'),
    readFile(paths['frame-cache.mjs'], 'utf8')
  ])

  if (manifest.packageName !== '@file-viewer/ppt' || packageJson.name !== '@file-viewer/ppt') {
    fail(`${root} is not an official @file-viewer/ppt runtime directory`)
  }
  if (manifest.packageVersion !== expectedVersion || packageJson.version !== expectedVersion) {
    fail(
      `${root} version mismatch: manifest=${manifest.packageVersion}, package=${packageJson.version}, expected=${expectedVersion}`
    )
  }
  if (
    manifest.wasmFile !== 'ppt-native.wasm' ||
    manifest.fontPack?.file !== 'ppt-font-cjk.otf' ||
    manifest.workerFile !== 'worker.mjs'
  ) {
    fail(`${root}/manifest.json has invalid PPT runtime asset references`)
  }

  const wasmSize = (await stat(paths['ppt-native.wasm'])).size
  const fontSize = (await stat(paths['ppt-font-cjk.otf'])).size
  if (wasmSize !== manifest.wasmBytes || fontSize !== manifest.fontPack.bytes) {
    fail(
      `${root} size mismatch: wasm=${wasmSize}/${manifest.wasmBytes}, font=${fontSize}/${manifest.fontPack.bytes}`
    )
  }
  const [wasmDigest, fontDigest] = await Promise.all([
    sha256(paths['ppt-native.wasm']),
    sha256(paths['ppt-font-cjk.otf'])
  ])
  if (wasmDigest !== manifest.wasmSha256 || fontDigest !== manifest.fontPack.sha256) {
    fail(`${root} native WASM or CJK font integrity hash does not match manifest.json`)
  }

  for (const marker of [
    'FV-PPT-PUBLIC-WATERMARKED-V2',
    'createPptViewer',
    'ppt-native.wasm',
    'ppt-font-cjk.otf',
    'worker.mjs'
  ]) {
    if (!indexSource.includes(marker)) fail(`${root}/index.mjs is missing ${marker}`)
  }
  for (const marker of [
    'export function normalizeFrameCacheLimits(',
    'export function createFrameCacheKey(',
    'export function createFrameCache('
  ]) {
    if (!frameCacheSource.includes(marker)) {
      fail(`${root}/frame-cache.mjs is missing ${marker}`)
    }
  }
  const importsColocatedFrameCache = workerSource.includes("from './frame-cache.mjs'")
  const embedsFrameCache = [
    'function normalizeFrameCacheLimits(',
    'function createFrameCacheKey(',
    'function createFrameCache('
  ].every(marker => workerSource.includes(marker))
  if (!importsColocatedFrameCache && !embedsFrameCache) {
    fail(`${root}/worker.mjs neither imports nor embeds the verified bounded frame cache`)
  }

  return {
    root,
    version: expectedVersion,
    fileCount: PPT_RUNTIME_REQUIRED_FILES.length,
    wasmBytes: wasmSize,
    fontBytes: fontSize,
    wasmSha256: wasmDigest,
    fontSha256: fontDigest
  }
}

export function resolvePptRuntimeDirectory(assetRoot) {
  return resolve(assetRoot, PPT_RUNTIME_RELATIVE_ROOT)
}

export async function verifyPptRuntimeAssetRoot(assetRoot, options = {}) {
  return verifyPptRuntimeDirectory(resolvePptRuntimeDirectory(assetRoot), options)
}

export async function verifyPptRuntimeNotBundledInJavaScript(bundlePath) {
  const path = resolve(bundlePath)
  const source = await readFile(path, 'utf8')
  for (const marker of [
    'FV-PPT-PUBLIC-WATERMARKED-V2',
    'flyfish-classic-ppt-native-engine',
    'ppt_render_slide_rgba'
  ]) {
    if (source.includes(marker)) {
      fail(`${path} contains a duplicate bundled @file-viewer/ppt 0.3 runtime marker ${marker}`)
    }
  }
  return { path, bytes: (await stat(path)).size }
}

async function walkFiles(root) {
  const files = []
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  await visit(root)
  return files
}

/**
 * A packaged distribution must have one authoritative PPT runtime tree. Vite
 * can otherwise emit hashed copies of the 1.5 MiB WASM and 16 MiB CJK font in
 * addition to vendor/ppt, silently doubling every demo/CDN artifact.
 */
export async function verifyPptRuntimeDistributionRoot(distributionRoot, options = {}) {
  const root = resolve(distributionRoot)
  const runtimePrefix = String(options.runtimePrefix || PPT_RUNTIME_RELATIVE_ROOT)
    .replace(/^\.\//, '')
    .replace(/\/$/, '')
  const runtimeRoot = resolve(root, runtimePrefix)
  const runtime = await verifyPptRuntimeDirectory(runtimeRoot, options)
  const files = await walkFiles(root)
  const expected = {
    wasm: join(runtimeRoot, 'ppt-native.wasm'),
    font: join(runtimeRoot, 'ppt-font-cjk.otf')
  }
  const matching = { wasm: [], font: [] }

  for (const path of files) {
    const info = await stat(path)
    if (info.size === runtime.wasmBytes && await sha256(path) === runtime.wasmSha256) {
      matching.wasm.push(path)
    }
    if (info.size === runtime.fontBytes && await sha256(path) === runtime.fontSha256) {
      matching.font.push(path)
    }
  }

  for (const kind of ['wasm', 'font']) {
    const paths = matching[kind]
    if (paths.length !== 1 || resolve(paths[0]) !== resolve(expected[kind])) {
      fail(
        `${root} must contain exactly one official PPT ${kind} asset at ${expected[kind]}; ` +
        `found ${paths.length}: ${paths.join(', ') || '(none)'}`
      )
    }
  }

  if (options.unbundledJavaScriptPath) {
    await verifyPptRuntimeNotBundledInJavaScript(
      resolve(root, options.unbundledJavaScriptPath)
    )
  }
  if (options.forbidBundledJavaScript) {
    const runtimePrefix = `${resolve(runtimeRoot)}/`
    for (const path of files) {
      if (
        resolve(path).startsWith(runtimePrefix) ||
        !/\.(?:m?js)$/i.test(path)
      ) {
        continue
      }
      const source = await readFile(path, 'utf8')
      if (
        source.includes('FV-PPT-PUBLIC-WATERMARKED-V2') ||
        source.includes('ppt_render_slide_rgba')
      ) {
        fail(`${path} contains a duplicate bundled @file-viewer/ppt runtime`)
      }
    }
  }

  return {
    ...runtime,
    distributionRoot: root,
    wasmCopies: matching.wasm.length,
    fontCopies: matching.font.length,
    nativeAssetBytes: runtime.wasmBytes + runtime.fontBytes
  }
}

function listArchive(path) {
  const result = spawnSync('tar', ['-tzf', path], {
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 32 * 1024 * 1024
  })
  if (result.status !== 0) fail(`Unable to list ${path}\n${result.stderr || result.stdout || ''}`)
  return result.stdout.split('\n').map(value => value.replace(/^\.\//, '').trim()).filter(Boolean)
}

export async function verifyPptRuntimeInTarGz(archivePath, options = {}) {
  const path = resolve(archivePath)
  const prefix = `${String(options.prefix || PPT_RUNTIME_RELATIVE_ROOT).replace(/^\.\//, '').replace(/\/$/, '')}/`
  const listing = listArchive(path)
  for (const filename of PPT_RUNTIME_REQUIRED_FILES) {
    if (!listing.includes(`${prefix}${filename}`)) {
      fail(`${basename(path)} is missing ${prefix}${filename}`)
    }
  }
  const tempRoot = await mkdtemp(join(tmpdir(), 'file-viewer-ppt-integrity-'))
  try {
    const result = spawnSync('tar', ['-xzf', path, '-C', tempRoot], {
      encoding: 'utf8',
      stdio: 'pipe'
    })
    if (result.status !== 0) fail(`Unable to extract ${path}\n${result.stderr || result.stdout || ''}`)
    const runtime = await verifyPptRuntimeDistributionRoot(tempRoot, {
      ...options,
      runtimePrefix: prefix,
      unbundledJavaScriptPath: options.unbundledJavaScriptPath
    })
    return runtime
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}
