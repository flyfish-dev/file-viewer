import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const workerBytes =
  'self.onmessage = event => self.postMessage({ answer: event.data + 1 });\n'
export const wasmBytes = Buffer.from([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1, 0, 7, 7, 1, 3, 97, 100,
  100, 0, 0, 10, 9, 1, 7, 0, 32, 0, 32, 1, 106, 11
])
export const version = '3.2.2'
export const write = async (path, bytes) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, bytes)
}
const json = (path, value) => write(path, JSON.stringify(value, null, 2) + '\n')

export async function createAssetFixture(root, profile) {
  const dependencies = {}
  const pkg = async (name, values = {}) => {
    const path = join(root, 'node_modules', name)
    dependencies[name] = version
    await json(join(path, 'package.json'), { name, version, main: 'index.js', ...values })
    await write(join(path, 'index.js'), 'export const pdfRenderer = {}; export default {};\n')
    return path
  }
  const assets = [
    {
      id: 'pdf-worker',
      rendererId: 'pdf',
      kind: 'script',
      target: 'public',
      required: true,
      defaultPath: 'vendor/pdf/pdf.worker.mjs'
    },
    {
      id: 'pdf-wasm',
      rendererId: 'pdf',
      kind: 'wasm',
      target: 'public',
      required: true,
      defaultPath: 'vendor/pdf/wasm/add.wasm'
    }
  ]
  let sourceFile
  if (profile === 'full' || profile === 'full-default') {
    await pkg('@file-viewer/renderer-pdf')
    const full = await pkg('@file-viewer/web-full')
    await json(join(full, 'dist/flyfish-viewer-manifest.json'), { schemaVersion: 1, version })
    await json(join(full, 'dist/flyfish-viewer-assets.json'), {
      schemaVersion: 1,
      rendererAssetManifests: [{ rendererId: 'pdf', assets }]
    })
    sourceFile = join(full, 'dist/vendor/pdf/pdf.worker.mjs')
    await write(sourceFile, workerBytes)
    await write(join(full, 'dist/vendor/pdf/wasm/add.wasm'), wasmBytes)
    if (profile === 'full-default') {
      const core = await pkg('@file-viewer/core', {
        type: 'module',
        exports: {
          '.': './index.js',
          './assets': './assets.js',
          './package.json': './package.json'
        }
      })
      await write(
        join(core, 'index.js'),
        'export function registerFileViewerAutoRendererPreset() {}\n'
      )
      await write(
        join(core, 'assets.js'),
        'export function setDefaultFileViewerAssetBaseUrl(value) { globalThis.assetBase = value; }\n'
      )
      const preset = await pkg('@file-viewer/preset-all', { type: 'module' })
      await write(
        join(preset, 'index.js'),
        'export const allRenderers = []; export function setDefaultFullAssetBaseUrl(value) { globalThis.fullAssetBase = value; }\n'
      )
    }
  } else if (profile === 'capability') {
    await pkg('@file-viewer/renderer-pdf')
    const owner = await pkg('@file-viewer/assets-standard')
    await json(join(owner, 'viewer/file-viewer-asset-pack.json'), {
      schemaVersion: 1,
      packageName: '@file-viewer/assets-standard',
      packageVersion: version,
      rendererAssetManifests: [{ rendererId: 'pdf', assets }]
    })
    sourceFile = join(owner, 'viewer/vendor/pdf/pdf.worker.mjs')
    await write(sourceFile, workerBytes)
    await write(join(owner, 'viewer/vendor/pdf/wasm/add.wasm'), wasmBytes)
  } else if (profile === 'cad') {
    await pkg('@file-viewer/renderer-cad', { dependencies: { '@flyfish-dev/cad-viewer': '0.8.0' } })
    const owner = await pkg('@flyfish-dev/cad-viewer', { version: '0.8.0' })
    sourceFile = join(owner, 'dist/wasm/runtime.wasm')
    await write(sourceFile, wasmBytes)
    await write(join(owner, 'LICENSE'), 'Synthetic original license bytes\n')
    await write(join(owner, 'NOTICE'), 'Synthetic original notice bytes\n')
  } else {
    const renderer = await pkg('@file-viewer/renderer-pdf')
    const staged = join(renderer, 'dist/vendor/pdfjs')
    await json(join(staged, 'provenance.json'), { packageName: 'pdfjs-dist', version: '5.9.116' })
    sourceFile = join(staged, 'legacy/build/pdf.worker.mjs')
    await write(sourceFile, workerBytes)
    await write(join(staged, 'cmaps/example.bcmap'), 'synthetic cmap')
    await write(join(staged, 'wasm/add.wasm'), wasmBytes)
    await write(join(staged, 'standard_fonts/example.pfb'), 'synthetic standard font')
    await write(
      join(renderer, 'dist/vendor/noto-sans-sc/files/example.woff2'),
      'synthetic CJK font'
    )
    await write(
      join(renderer, 'dist/vendor/noto-sans-sc/wght.css'),
      '@font-face { font-family: fixture; }'
    )
    await write(
      join(renderer, 'dist/vendor/noto-sans-sc/LICENSE'),
      'Synthetic original font license\n'
    )
  }
  await json(join(root, 'package.json'), {
    name: 'asset-copy-consumer-fixture',
    private: true,
    type: 'module',
    dependencies
  })
  await copyFile(new URL('../dist/index.js', import.meta.url), join(root, 'plugin.mjs'))
  return { root, profile, sourceFile, formats: [profile === 'cad' ? 'dwg' : 'pdf'] }
}

export function configureCopyPlugin(module, fixture, mode) {
  const plugin = module.fileViewerRenderers({
    formats: fixture.formats,
    autoPresets: false,
    scan: false,
    missingRenderer: 'error',
    copyAssets: { mode, baseDir: 'viewer' }
  })
  plugin.configResolved({
    command: mode === 'dev' ? 'serve' : 'build',
    root: fixture.root,
    publicDir: join(fixture.root, 'dummy-non-existing-dir'),
    base: '/',
    build: { outDir: 'dist' }
  })
  const target = join(fixture.root, mode === 'dev' ? 'dummy-non-existing-dir' : 'dist', 'viewer')
  return {
    plugin,
    target,
    copy: () => (mode === 'dev' ? plugin.configureServer({}) : plugin.closeBundle())
  }
}

export async function snapshotAssets(root, ageFiles = false) {
  const result = {}
  const walk = async (dir, prefix = '') => {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const path = join(dir, entry.name),
        relative = prefix + entry.name
      if (entry.isDirectory()) await walk(path, relative + '/')
      else {
        if (ageFiles) await utimes(path, new Date(1000), new Date(1000))
        const info = await stat(path, { bigint: true }),
          bytes = await readFile(path)
        result[relative] = {
          sha256: createHash('sha256').update(bytes).digest('hex'),
          mtime: String(info.mtimeNs),
          ctime: String(info.ctimeNs),
          inode: String(info.ino)
        }
      }
    }
  }
  await walk(root)
  return result
}
