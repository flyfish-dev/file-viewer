#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

async function packageDir(name, resolver = require) {
  // Giro3D 2.0.4 exposes subpath modules but has no index.js at its bare
  // package entry. Resolve metadata first; packages with restrictive exports
  // (such as Three.js) can still be located by walking from their real entry.
  let entry
  for (const candidate of [
    `${name}/package.json`,
    name === '@giro3d/giro3d' ? `${name}/core/Instance.js` : name,
  ]) {
    try { entry = resolver.resolve(candidate); break } catch { /* Try the documented module entry. */ }
  }
  if (!entry) throw new Error(`Cannot resolve installed ${name} package metadata or module entry`)
  let current = dirname(entry)
  for (;;) {
    try {
      const metadata = JSON.parse(await readFile(join(current, 'package.json'), 'utf8'))
      if (metadata.name === name) return { path: current, metadata }
    } catch { /* Continue walking toward the package root. */ }
    const parent = dirname(current)
    if (parent === current) throw new Error(`Cannot locate ${name} package root`)
    current = parent
  }
}

async function copyDirectory(source, destination) {
  await mkdir(destination, { recursive: true })
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name), to = join(destination, entry.name)
    if (entry.isDirectory()) await copyDirectory(from, to)
    else if (entry.isFile()) await copyFile(from, to)
  }
}
async function findNamedFile(root, filename, depth = 0) {
  if (depth > 6) return null
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name)
    if (entry.isFile() && entry.name === filename) return full
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const nested = await findNamedFile(full, filename, depth + 1)
      if (nested) return nested
    }
  }
  return null
}
async function copyLicenses(packages, destination) {
  await mkdir(destination, { recursive: true })
  for (const pkg of packages) {
    const names = (await readdir(pkg.path)).filter(name => /^licen[cs]e(?:[.-]|$)/i.test(name))
    for (const name of names) await copyFile(join(pkg.path, name), join(destination, `${pkg.metadata.name.replace(/[@/]/g, '_')}-${name}`))
  }
}
async function collectFiles(root, prefix = '') {
  const result = {}
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === 'licenses' || entry.name === 'manifest.json') continue
    const full = join(root, entry.name), relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(result, await collectFiles(full, relative))
    else if (entry.isFile()) {
      const bytes = await readFile(full)
      result[relative] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
    }
  }
  return result
}
export async function copyGeo3dAssets(destination) {
  const giro = await packageDir('@giro3d/giro3d')
  if (giro.metadata.version !== '2.0.4') throw new Error(`Geo3D assets require tested @giro3d/giro3d@2.0.4, found ${giro.metadata.version}`)
  const giroRequire = createRequire(join(giro.path, 'package.json'))
  const [lazPerf, three] = await Promise.all([
    packageDir('laz-perf', giroRequire),
    packageDir('three', giroRequire),
  ])
  const lazWasm = await findNamedFile(lazPerf.path, 'laz-perf.wasm')
  if (!lazWasm) throw new Error('Cannot locate laz-perf.wasm in the installed laz-perf package')
  const draco = join(three.path, 'examples/jsm/libs/draco/gltf'), basis = join(three.path, 'examples/jsm/libs/basis')
  await Promise.all([access(draco), access(basis)])
  destination = resolve(destination)
  await mkdir(dirname(destination), { recursive: true })
  const stage = await mkdtemp(join(dirname(destination), '.geo3d-assets-'))
  try {
    await mkdir(join(stage, 'laz-perf'), { recursive: true })
    await copyFile(lazWasm, join(stage, 'laz-perf', 'laz-perf.wasm'))
    await copyDirectory(draco, join(stage, 'three', 'draco'))
    await copyDirectory(basis, join(stage, 'three', 'basis'))
    const workerDir = fileURLToPath(new URL('../dist/geo3d-workers/', import.meta.url))
    const workerManifest = JSON.parse(await readFile(join(workerDir, 'manifest.json'), 'utf8'))
    const workerBytes = await readFile(join(workerDir, 'las-worker.js'))
    if (workerManifest.engine !== giro.metadata.version ||
        createHash('sha256').update(workerBytes).digest('hex') !== workerManifest.workerSha256) {
      throw new Error('Geo3D point Worker assets do not match the built package.')
    }
    for (const name of ['geotiff-worker.js', 'texture-worker.js']) {
      const bytes = await readFile(join(workerDir, name))
      if (createHash('sha256').update(bytes).digest('hex') !== workerManifest.raster?.files?.[name]) {
        throw new Error(`Geo3D raster Worker asset does not match the built package: ${name}`)
      }
    }
    await copyDirectory(workerDir, join(stage, 'workers'))
    await copyLicenses([giro, lazPerf, three], join(stage, 'licenses'))
    const notice = [
      'Optional Geo3D runtime assets for File Viewer.',
      'These assets are loaded only by @file-viewer/renderer-3d/geo3d.',
      `@giro3d/giro3d@${giro.metadata.version}: ${giro.metadata.license || 'See package license'}`,
      `laz-perf@${lazPerf.metadata.version}: ${lazPerf.metadata.license || 'See package license'}`,
      `three@${three.metadata.version}: ${three.metadata.license || 'See package license'}`,
      'laz-perf.wasm is served locally for COPC and LAZ decoding.',
      'workers/las-worker.js, geotiff-worker.js and texture-worker.js are source-owned.',
      'Preserve workers/licenses/, workers/raster-licenses/ and workers/manifest.json.',
      'Three.js DRACO and KTX2/Basis decoder assets are served locally for compressed 3D Tiles content.',
      'Preserve licenses/, NOTICE.txt and manifest.json when redistributing these copied assets.', '',
    ].join('\n')
    await writeFile(join(stage, 'NOTICE.txt'), notice)
    const files = await collectFiles(stage)
    await writeFile(join(stage, 'manifest.json'), JSON.stringify({
      schema: 1,
      packages: [giro, lazPerf, three].map(pkg => ({ name: pkg.metadata.name, version: pkg.metadata.version, license: pkg.metadata.license })),
      files,
    }, null, 2) + '\n')
    await copyDirectory(stage, destination)
    return { destination, files }
  } finally { await rm(stage, { recursive: true, force: true }) }
}
function isEntryPoint() {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) }
  catch { return false }
}
if (isEntryPoint()) {
  if (process.argv.includes('--help')) { console.log('Usage: file-viewer-geo3d-assets [destination-directory]'); process.exit(0) }
  if (process.argv.length > 3 || process.argv[2]?.startsWith('-')) { console.error('Expected one destination directory'); process.exit(1) }
  copyGeo3dAssets(process.argv[2] || 'public/file-viewer/vendor/geo3d')
    .then(result => console.log(`Geo3D assets installed: ${result.destination}`))
    .catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
