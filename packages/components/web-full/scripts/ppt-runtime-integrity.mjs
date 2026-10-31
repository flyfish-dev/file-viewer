// The self-hosted tree preserves the exact public npm package. No source,
// native WASM, font pack or rewritten runtime entry is manufactured here.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { lstat, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import inventory from './ppt-runtime-inventory.json' with { type: 'json' }

export const PPT_RUNTIME_VERSION = inventory.version
export const PPT_RUNTIME_RELATIVE_ROOT = 'vendor/ppt'
export const PPT_RUNTIME_REQUIRED_FILES = Object.freeze(inventory.files.map(file => file.path))

const fail = message => { throw new Error(`[ppt-runtime-integrity] ${message}`) }
const sha256 = async path => createHash('sha256').update(await readFile(path)).digest('hex')

async function walkFiles(root) {
  const files = []
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile()) files.push(path)
      else fail(`Non-regular PPT asset: ${path}`)
    }
  }
  await visit(root)
  return files
}

export async function verifyPptRuntimeDirectory(runtimeDir, options = {}) {
  const root = resolve(runtimeDir)
  const expectedVersion = options.expectedVersion || PPT_RUNTIME_VERSION
  if (expectedVersion !== inventory.version) fail('Expected version has no reviewed package inventory')
  for (const file of inventory.files) {
    const path = join(root, file.path)
    if (!existsSync(path) || !(await lstat(path)).isFile()) fail(`Missing regular PPT runtime file ${path}`)
    if (await sha256(path) !== file.sha256) fail(`PPT runtime bytes differ from the frozen npm package: ${file.path}`)
  }
  const files = await walkFiles(root)
  if (files.length !== inventory.files.length) fail(`Unexpected files in PPT runtime: ${root}`)
  const [manifest, packageJson] = await Promise.all([
    readFile(join(root, 'dist/manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  if (manifest.packageName !== '@file-viewer/ppt' || packageJson.name !== '@file-viewer/ppt' ||
      manifest.packageVersion !== expectedVersion || packageJson.version !== expectedVersion ||
      manifest.kind !== 'flyfish-ppt-typescript-v1' || manifest.wasmRequired !== false ||
      packageJson.license !== 'Apache-2.0' || manifest.sourceRepositoryPrivate !== true ||
      packageJson.exports['./standalone'].import !== './dist/pptjs.mjs' ||
      packageJson.exports['./worker.mjs'] !== './dist/pptjs.worker.js') {
    fail(`${root} is not the reviewed TypeScript PPT runtime`)
  }
  return {
    root, version: expectedVersion, fileCount: files.length,
    moduleSha256: await sha256(join(root, 'dist/pptjs.mjs')),
    workerSha256: await sha256(join(root, 'dist/pptjs.worker.js')),
    // Kept as zero-valued compatibility fields for existing release reports.
    wasmBytes: 0, fontBytes: 0, wasmSha256: '', fontSha256: ''
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
  for (const marker of ['FV-PPT-PUBLIC-WATERMARKED-V2', 'flyfish-classic-ppt-native-engine',
    'ppt_render_slide_rgba', 'const __PPT_MODULE_URL__ = import.meta.url;']) {
    if (source.includes(marker)) fail(`${path} contains a duplicate bundled PPT runtime: ${marker}`)
  }
  return { path, bytes: (await stat(path)).size }
}

/** One canonical self-hosted package; no second hashed standalone/Worker copy. */
export async function verifyPptRuntimeDistributionRoot(distributionRoot, options = {}) {
  const root = resolve(distributionRoot)
  const runtimeRoot = resolve(root, options.runtimePrefix || PPT_RUNTIME_RELATIVE_ROOT)
  const runtime = await verifyPptRuntimeDirectory(runtimeRoot, options)
  const expected = {
    module: join(runtimeRoot, 'dist/pptjs.mjs'),
    worker: join(runtimeRoot, 'dist/pptjs.worker.js')
  }
  const sizes = Object.fromEntries(await Promise.all(Object.entries(expected).map(async ([kind, path]) => [kind, (await stat(path)).size])))
  const matching = { module: [], worker: [] }
  for (const path of await walkFiles(root)) {
    const size = (await stat(path)).size
    for (const kind of ['module', 'worker']) {
      if (size === sizes[kind] && await sha256(path) === runtime[`${kind}Sha256`]) matching[kind].push(path)
    }
    const local = relative(runtimeRoot, path)
    const insideRuntime = local === '' || (local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local))
    if (options.forbidBundledJavaScript && !insideRuntime && (path.endsWith('.js') || path.endsWith('.mjs'))) {
      await verifyPptRuntimeNotBundledInJavaScript(path)
    }
  }
  for (const kind of ['module', 'worker']) {
    if (matching[kind].length !== 1 || resolve(matching[kind][0]) !== resolve(expected[kind])) {
      fail(`${root} must contain exactly one official PPT ${kind} at ${expected[kind]}; found ${matching[kind].length}`)
    }
  }
  if (options.unbundledJavaScriptPath) await verifyPptRuntimeNotBundledInJavaScript(resolve(root, options.unbundledJavaScriptPath))
  return {
    ...runtime, distributionRoot: root, moduleCopies: matching.module.length,
    workerCopies: matching.worker.length, wasmCopies: 0, fontCopies: 0, nativeAssetBytes: 0
  }
}

export async function verifyPptRuntimeInTarGz(archivePath, options = {}) {
  const path = resolve(archivePath)
  const normalizeName = name => name.startsWith('./') ? name.slice(2) : name
  const rawPrefix = normalizeName(String(options.prefix || PPT_RUNTIME_RELATIVE_ROOT))
  const prefix = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix
  const listed = spawnSync('tar', ['-tzf', path], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (listed.status !== 0) fail(`Unable to list ${path}: ${listed.stderr}`)
  const listing = listed.stdout.split(String.fromCharCode(10)).map(value => normalizeName(value.trim()))
  // Reject archive traversal before extraction, including entries outside the PPT tree.
  for (const name of listing.filter(Boolean)) {
    if (name.startsWith('/') || name.split('/').includes('..')) fail(`Unsafe archive member: ${name}`)
  }
  for (const filename of PPT_RUNTIME_REQUIRED_FILES) {
    if (!listing.includes(`${prefix}/${filename}`)) fail(`${basename(path)} is missing ${prefix}/${filename}`)
  }
  const tempRoot = await mkdtemp(join(tmpdir(), 'file-viewer-ppt-integrity-'))
  try {
    const extracted = spawnSync('tar', ['-xzf', path, '-C', tempRoot], { encoding: 'utf8' })
    if (extracted.status !== 0) fail(`Unable to extract ${path}: ${extracted.stderr}`)
    return await verifyPptRuntimeDistributionRoot(tempRoot, { ...options, runtimePrefix: prefix })
  } finally { await rm(tempRoot, { recursive: true, force: true }) }
}
