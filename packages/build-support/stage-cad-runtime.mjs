import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sanitizeOfflineViewerAssetTree } from '../components/web-full/scripts/offline-asset-sanitize.mjs'
import { CAD_INTEGRATION_SOURCE, cadIntegrationSourceNotice } from './cad-source-offer.mjs'
import { CAD_SOURCE_ARCHIVE_NAME, readCadCorrespondingSource } from './cad-corresponding-source.mjs'

const workspaceRoot = resolve(import.meta.dirname, '../..')
const ownerManifestPath = resolve(workspaceRoot, 'packages/renderers/cad/package.json')
const ownerRequire = createRequire(ownerManifestPath)
const requiredFiles = ['dwg-worker.js', 'dwfv-render.wasm', 'libredwg-web.js', 'libredwg-web.wasm']
const notices = ['LICENSE', 'NOTICE']
const retainedGpl = new URL('./licenses/libredwg-web-0.7.9-GPL-3.0.txt', import.meta.url)
const retainedGplSha256 = '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903'
const generatedFilename = filename => [...requiredFiles, ...notices, 'GPL-3.0.txt',
  'CORRESPONDING_SOURCE_NOTICE.txt', CAD_SOURCE_ARCHIVE_NAME].includes(filename) || /^dwg-worker(?:-.+)?\.js(?:\.map)?$/.test(filename)

// These directories are generated outputs. Validate all replaced entries before
// changing any bytes, so an unexpected user file or symlink is never removed.
export async function stageCadRuntimeFiles(target, files, versions) {
  assert.ok(versions.length && versions.every(version => /^\d+\.\d+\.\d+$/.test(version)))
  const existing = await lstat(target).catch(error => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  assert.ok(!existing || existing.isDirectory(), 'Unsafe CAD asset destination')
  const directories = new Set(versions)
  const retiredVersions = []
  const retiredFiles = []
  if (existing) {
    for (const entry of await readdir(target, { withFileTypes: true })) {
      if (generatedFilename(entry.name) && !files.has(entry.name)) {
        assert.ok(entry.isFile(), `Unsafe generated CAD file: ${entry.name}`)
        retiredFiles.push(entry.name)
      }
      if (!/^\d+\.\d+\.\d+$/.test(entry.name)) continue
      assert.ok(entry.isDirectory(), 'Unsafe generated CAD version directory')
      directories.add(entry.name)
      if (!versions.includes(entry.name)) retiredVersions.push(entry.name)
    }
    for (const version of directories) {
      const directory = join(target, version)
      const info = await lstat(directory).catch(error => {
        if (error.code === 'ENOENT') return undefined
        throw error
      })
      assert.ok(!info || info.isDirectory(), 'Unsafe generated CAD version directory')
      if (!info) continue
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        assert.ok(entry.isFile() && generatedFilename(entry.name),
          `Refusing to replace an unrecognized CAD output: ${version}/${entry.name}`)
      }
    }
    for (const filename of files.keys()) {
      const info = await lstat(join(target, filename)).catch(error => {
        if (error.code === 'ENOENT') return undefined
        throw error
      })
      assert.ok(!info || info.isFile(), `Unsafe CAD asset destination: ${filename}`)
    }
  }
  for (const filename of retiredFiles) await rm(join(target, filename))
  for (const version of directories) await rm(join(target, version), { recursive: true, force: true })
  for (const directory of [target, ...versions.map(version => join(target, version))]) {
    await mkdir(directory, { recursive: true })
    for (const [filename, bytes] of files) {
      await writeFile(join(directory, filename), bytes)
      assert.ok(bytes.equals(await readFile(join(directory, filename))))
    }
  }
  return { versions, retiredVersions: retiredVersions.sort() }
}

/** Stage the ordinary installed CAD package, including its redistribution notices. */
export async function stageInstalledCadRuntime(targetRoot) {
  return stageInstalledCadRuntimeDirectory(resolve(targetRoot, 'wasm/cad'))
}

/** Reuse the same verified inputs inside an owner's transactional staging directory. */
export async function stageInstalledCadRuntimeDirectory(targetDirectory) {
  const target = resolve(targetDirectory)
  const owner = JSON.parse(await readFile(ownerManifestPath, 'utf8'))
  const manifestPath = ownerRequire.resolve('@flyfish-dev/cad-viewer/package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const coreAssets = await import(
    pathToFileURL(ownerRequire.resolve('@file-viewer/core/assets')).href
  )
  const version = coreAssets.DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION
  const compatibilityVersion = coreAssets.COMPATIBILITY_FILE_VIEWER_CAD_RUNTIME_VERSION
  assert.equal(manifest.name, '@flyfish-dev/cad-viewer')
  assert.equal(
    manifest.version,
    owner.dependencies[manifest.name],
    'Installed CAD version differs from its owner'
  )
  assert.equal(manifest.version, version, 'Installed CAD version differs from the asset contract')
  assert.match(version, /^\d+\.\d+\.\d+$/)
  assert.equal(manifest.version, '0.8.3', 'Retained CAD source notices require review for a new owner version')
  assert.equal(manifest.dependencies['@mlightcad/libredwg-web'], '0.7.9', 'Retained GPL text belongs to another LibreDWG release')
  const compatibilityContract = JSON.parse(await readFile(
    resolve(workspaceRoot, 'ecosystem/copy-assets-backward-compat.json'), 'utf8'
  ))
  assert.ok(Array.isArray(compatibilityContract.legacyFullAssetRoots), 'Invalid CAD compatibility contract')
  const aliases = [...new Set([
    version,
    compatibilityVersion,
    ...compatibilityContract.legacyFullAssetRoots
      .map(path => path.match(/^wasm\/cad\/([^/]+)\/$/)?.[1])
      .filter(Boolean)
  ])]
  const packageRoot = await realpath(dirname(manifestPath))
  const sourceRoot = join(packageRoot, 'dist/wasm')
  const sourceWithinTarget = relative(target, packageRoot)
  assert.ok(
    sourceWithinTarget.startsWith('..') || isAbsolute(sourceWithinTarget),
    'Refusing to stage over the installed CAD package'
  )
  const chunks = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^dwg-worker-.+\.js$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
  // Validate every owner file before writing. Bootstrap bytes cannot replace a
  // missing installed Worker, WASM or notice.
  const files = new Map()
  for (const filename of [...requiredFiles, ...chunks, ...notices]) {
    const source = join(notices.includes(filename) ? packageRoot : sourceRoot, filename)
    const info = await lstat(source)
    assert.ok(info.isFile() && info.size > 0, `Invalid installed CAD asset: ${filename}`)
    const bytes = await readFile(source)
    files.set(
      filename,
      filename.endsWith('.js')
        ? Buffer.from(
            bytes
              .toString('utf8')
              .replace(/^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm, '')
              .trimEnd() + '\n'
          )
        : bytes
    )
  }
  // Match the ordinary offline-copy pipeline before touching a destination.
  // Restrict normalization to installed JavaScript so host-owned files survive.
  const normalizationRoot = await mkdtemp(join(tmpdir(), 'file-viewer-cad-normalize-'))
  let offlineFallbackMarkersLocalized
  try {
    const javascriptFiles = [...files].filter(([filename]) => filename.endsWith('.js'))
    for (const [filename, bytes] of javascriptFiles) await writeFile(join(normalizationRoot, filename), bytes)
    const normalization = await sanitizeOfflineViewerAssetTree(normalizationRoot)
    offlineFallbackMarkersLocalized = normalization.replacementCount
    for (const [filename] of javascriptFiles) files.set(filename, await readFile(join(normalizationRoot, filename)))
  } finally {
    await rm(normalizationRoot, { recursive: true, force: true })
  }
  const sourceArchive = await readCadCorrespondingSource(workspaceRoot, CAD_INTEGRATION_SOURCE)
  files.set(CAD_SOURCE_ARCHIVE_NAME, sourceArchive.bytes)
  const gpl = await readFile(retainedGpl)
  assert.equal(createHash('sha256').update(gpl).digest('hex'), retainedGplSha256, 'Retained original GPL text changed')
  files.set('GPL-3.0.txt', gpl)
  files.set('CORRESPONDING_SOURCE_NOTICE.txt', Buffer.from([
    'CAD runtime corresponding source',
    '',
    `The current (${version}), unversioned and compatibility (${aliases.filter(alias => alias !== version).join(', ')}) paths contain the same installed CAD ${version} runtime.`,
    'The compatibility paths are aliases for existing deployments; they do not distribute older binaries.',
    'JavaScript source-map reference comments are omitted and the normal public offline sanitizer localizes fallback markers. WebAssembly bytes are unchanged.',
    'The exact offline sanitizer is included in the integration source at the immutable HTTPS reference below.',
    '',
    '@flyfish-dev/cad-viewer 0.8.3 (AGPL-3.0-only), including its Worker and asset build scripts:',
    'https://codeload.github.com/flyfish-dev/cad-viewer/tar.gz/6366d2f7b1013cd5c300008c3c3fbf017ca9aace',
    'SHA-256: 65d00f07230553734262d671abf45be94d83d3068318c0f25f8665494ec82bcb',
    '',
    'dwf-viewer 0.6.7 (AGPL-3.0-only), including C source and scripts/build-wasm.sh:',
    'https://codeload.github.com/flyfish-dev/dwf-viewer/tar.gz/72783571e2cd744862d8eb32f7d3455906c76226',
    'SHA-256: d246d61b914475412fdc33ea250646710c4a3431bfecad9c9a7700602923afb1',
    '',
    '@mlightcad/libredwg-web 0.7.9 (GPL-3.0-only), including JavaScript bindings and their build scripts:',
    'https://codeload.github.com/mlightcad/libredwg-web/tar.gz/b70b5573a6bf2345e5fb10f2adff7fb74a8123c5',
    'SHA-256: af350d628535a2842262af5b49d50568b6dae62854667e13bb9f161b26c00431',
    '',
    'Redistributors must retain LICENSE (AGPL-3.0), GPL-3.0.txt, NOTICE and this source notice.',
    'The asset sources above cover the native owner runtimes. The File Viewer integration source offer follows.',
    '',
    cadIntegrationSourceNotice(owner.version),
  ].join('\n')))
  const output = await stageCadRuntimeFiles(target, files, aliases)
  const receipts = [...files].map(([filename, bytes]) => ({
      filename,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    }))
  return { sourcePackage: manifest.name, sourceVersion: manifest.version, ...output, offlineFallbackMarkersLocalized, files: receipts }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Pass the asset output directory')
  console.log(JSON.stringify(await stageInstalledCadRuntime(resolve(process.argv[2])), null, 2))
}
