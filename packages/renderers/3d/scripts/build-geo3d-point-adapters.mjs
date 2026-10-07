/** Build source-local adapters; never edits the installed engine or its singletons. */
import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SOURCE_HASHES = {
  LASSource: '0e4ffbe09b1dace31702f36749b1b30583ccabfdbbb6eac9a4b90c414cc71dcf',
  COPCSource: '28fc207def582b22760a1f1194dc5812989dafd70deca9eaf38635cf8daf2e9d',
  PointCloud: 'fdbbf4f5d4047cf945a90612d28f9ad3efa2b1830502eeaff2e4accfd8faaa71',
  PointCloudSource: '882f470513f76ce024fe2284d73e7c235530654655894c5efc8e67a81d087552',
  worker: 'cd2fb4cf51d66175b21dcdc70229a6f256c83b923e5ed5cd6445a65cf8bf130b'
}
const hash = text => createHash('sha256').update(text).digest('hex')

/** Keep cancellation attached to the requesting node, including queued and late work. */
export function createPointSourceWithCancellation(Source, options) {
  return new class extends Source {
    initialize() {
      if (!this._initializePromise) {
        // The pinned base class discards its readiness .then() promise. A failed
        // initialization therefore escapes as an unhandled rejection even when
        // the caller handles initialize(). Own and return the complete chain.
        // Latch it before invoking callbacks, including synchronous/reentrant ones.
        this._initializePromise = Promise.resolve().then(() => this.initializeOnce()).then(value => {
          this._ready = true
          this.dispatchEvent({ type: 'initialized' })
          return value
        })
      }
      return this._initializePromise
    }
    async getNodeData(params) {
      params.signal?.throwIfAborted()
      try {
        const data = await super.getNodeData(params)
        params.signal?.throwIfAborted()
        return data
      } catch (error) {
        // Preserve the node's cancellation instead of a secondary decoder/pool error.
        params.signal?.throwIfAborted()
        throw error
      }
    }
  }(options)
}

/** The initialization override relies on these reviewed protected base fields. */
export function verifyPointSourceInitialization(text) {
  if (hash(text) !== SOURCE_HASHES.PointCloudSource) {
    throw new Error('Unreviewed Giro3D PointCloudSource initialization.')
  }
}

/** The private loading-method extension is reviewed against this exact engine. */
export function verifyPointCloudSource(text) {
  if (hash(text) !== SOURCE_HASHES.PointCloud ||
      !text.includes('  async loadNodeData(info, signal, attributesAndSlots) {')) {
    throw new Error('Unreviewed Giro3D PointCloud lifecycle.')
  }
}

/**
 * Preserve the real PointCloud class and all its public APIs. Only link the
 * loading method's signal to this entity's lifetime. Never patch a prototype,
 * call clear() to stop work (it reloads!), or dispose a shared request queue.
 * Giro3D 2.0.4 consumes Error('aborted') at this internal boundary. The public
 * viewer/hook signal and its original cancellation reason remain untouched.
 */
export function createPointCloudWithCancellation(PointCloud, options) {
  if (typeof PointCloud.prototype.loadNodeData !== 'function') {
    throw new Error('Missing reviewed PointCloud loading method.')
  }
  const owner = new AbortController()
  let entity
  const stop = () => {
    if (owner.signal.aborted) return
    // Latch cancellation before the public frozen setter can notify host code.
    owner.abort(new Error('aborted'))
    if (entity) entity.frozen = true
  }
  entity = new class extends PointCloud {
    async loadNodeData(info, signal, attributesAndSlots) {
      // Queued tasks may run after disposal. They must not touch the source.
      if (owner.signal.aborted || signal?.aborted) return
      const request = new AbortController()
      const abort = () => request.abort(new Error('aborted'))
      owner.signal.addEventListener('abort', abort, { once: true })
      signal?.addEventListener('abort', abort, { once: true })
      try {
        if (owner.signal.aborted || signal?.aborted) abort()
        // The real method checks this same signal both before reading and after
        // awaiting data, closing the fulfilled-promise/late-geometry race too.
        return await super.loadNodeData(info, request.signal, attributesAndSlots)
      } finally {
        owner.signal.removeEventListener('abort', abort)
        signal?.removeEventListener('abort', abort)
      }
    }
    clear() {
      if (!owner.signal.aborted) super.clear()
    }
    dispose() {
      try { stop() } finally { super.dispose() }
    }
  }(options)
  return { entity, stop }
}

/** Isolate pool ownership/disposal and preserve per-request cancellation. */
export function adaptPointSource(name, text) {
  if (!['LASSource', 'COPCSource'].includes(name) || hash(text) !== SOURCE_HASHES[name]) {
    throw new Error(`Unreviewed Giro3D source: ${name}`)
  }
  const imports = []
  let body = text.replace(/^import [\s\S]*?;\r?\n/gm, statement => {
    if (!statement.includes("from './las/LASWorkerPool'")) imports.push(statement)
    return ''
  })
  if (!text.includes("import LASWorkerPool from './las/LASWorkerPool';") ||
      imports.some(statement => statement.includes('LASWorkerPool'))) {
    throw new Error(`Cannot isolate ${name} pool import.`)
  }
  body = body.replace(`export default class ${name}`, `class ${name}`)
  if (name === 'COPCSource') body = body.replace('export function isCOPCSource', 'function isCOPCSource')
  const original = name === 'LASSource' ? '  dispose() {\n    // Nothing to do\n  }' : '  dispose() {\n    // Nothing to dispose.\n  }'
  if (!body.includes(original)) throw new Error(`Unexpected ${name} disposal method.`)
  const release = name === 'LASSource'
    ? 'this._buffer = null; this._header = null; this._volume = null; this._filters.length = 0;'
    : 'this._data = undefined; this._nodeMap.clear(); this._filters.length = 0;'
  body = body.replace(original, `  dispose() {\n    LASWorkerPool.dispose();\n    ${release}\n  }`)
  if (/^export /m.test(body)) throw new Error(`Unexpected export in ${name}.`)
  // Emit the same self-contained helper exercised by the regression tests.
  // This is build-time source generation, not runtime evaluation or patching.
  return `${imports.join('')}\n// Derived from pinned Giro3D 2.0.4, MIT; see geo3d-workers/licenses/.\nexport function create${name}(LASWorkerPool, options) {\n${body}\n${createPointSourceWithCancellation.toString()}\nreturn createPointSourceWithCancellation(${name}, options);\n}\n`
}

async function packageRoot(path) {
  let folder = dirname(path)
  for (;;) {
    try { const metadata = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8')); if (metadata.name) return { folder, metadata } } catch { /* Walk toward package root. */ }
    const parent = dirname(folder)
    if (parent === folder) throw new Error(`Cannot locate package metadata for ${path}`)
    folder = parent
  }
}

export async function buildPointAdapters() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const require = createRequire(join(root, 'package.json'))
  const { build } = require('esbuild')
  const las = require.resolve('@giro3d/giro3d/sources/LASSource.js')
  const giro = await packageRoot(las)
  if (giro.metadata.version !== '2.0.4') throw new Error('Owned point adapters require Giro3D 2.0.4.')
  verifyPointCloudSource(await readFile(join(giro.folder, 'entities/PointCloud.js'), 'utf8'))
  verifyPointSourceInitialization(await readFile(join(giro.folder, 'sources/PointCloudSource.js'), 'utf8'))
  const paths = Object.fromEntries(['LASSource', 'COPCSource'].map(name => [name, join(giro.folder, 'sources', `${name}.js`)]))
  const adapted = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => [path, adaptPointSource(name, await readFile(path, 'utf8'))])))
  const worker = join(giro.folder, 'sources/las/worker.js')
  if (hash(await readFile(worker)) !== SOURCE_HASHES.worker) throw new Error('Unreviewed LAS worker source.')
  const out = join(root, 'dist'), workers = join(out, 'geo3d-workers')
  await mkdir(workers, { recursive: true })
  const options = { bundle: true, platform: 'browser', format: 'esm', target: 'es2022', minify: false, metafile: true, logLevel: 'warning' }
  const entry = [
    "import PointCloud from '@giro3d/giro3d/entities/PointCloud.js';",
    createPointCloudWithCancellation.toString(),
    'export function createOwnedPointCloud(options) { return createPointCloudWithCancellation(PointCloud, options); }',
    ...Object.keys(paths).map(name => `export { create${name} } from 'geo3d-owned:${name}';`),
  ].join('\n')
  const factories = await build({ ...options,
    stdin: { contents: entry, resolveDir: giro.folder },
    external: ['@giro3d/giro3d/*'],
    outfile: join(out, 'geo3dPointFactories.js'),
    plugins: [{ name: 'source-local-giro3d-pools', setup(builder) {
      builder.onResolve({ filter: /^geo3d-owned:/ }, args => {
        const path = paths[args.path.slice('geo3d-owned:'.length)]
        if (!path) throw new Error('Unknown owned point adapter.')
        return { path, namespace: 'owned-point-source' }
      })
      builder.onLoad({ filter: /.*/, namespace: 'owned-point-source' }, args => ({ contents: adapted[args.path], loader: 'js', resolveDir: dirname(args.path) }))
      // Keep the host's actual engine classes, CRS registry and cache identity.
      // Only the two reviewed sources are copied. No engine prototype is patched.
      builder.onResolve({ filter: /^\./, namespace: 'owned-point-source' }, args => {
        const path = resolve(args.resolveDir, args.path)
        if (!path.startsWith(giro.folder + sep)) throw new Error('Adapter import escaped engine root.')
        return { path: '@giro3d/giro3d/' + relative(giro.folder, path).split(sep).join('/') + '.js', external: true }
      })
    } }]
  })
  const decoder = await build({ ...options, entryPoints: [worker], outfile: join(workers, 'las-worker.js') })
  const packages = new Map([[giro.folder, giro]])
  for (const input of [...Object.keys(factories.metafile.inputs), ...Object.keys(decoder.metafile.inputs)]) {
    if (!input.includes('node_modules') || input.startsWith('owned-point-source:')) continue
    const pkg = await packageRoot(resolve(input))
    packages.set(pkg.folder, pkg)
  }
  const licensing = []
  await mkdir(join(workers, 'licenses'), { recursive: true })
  for (const { folder, metadata } of packages.values()) {
    const files = []
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (!entry.isFile() || !/^(?:licen[sc]e|copying)(?:[.-]|$)/i.test(entry.name)) continue
      const name = `${metadata.name.replace(/[@/]/g, '_')}-${entry.name}`
      await copyFile(join(folder, entry.name), join(workers, 'licenses', name)); files.push(name)
    }
    // The laz-perf 0.0.7 npm tarball declares Apache-2.0 but omits COPYING.
    // Preserve the upstream license locally, with no build-time fetch.
    if (!files.length && metadata.name === 'laz-perf' && metadata.version === '0.0.7' && metadata.license === 'Apache-2.0') {
      const source = join(root, 'licenses/laz-perf-COPYING.txt')
      const bytes = await readFile(source)
      if (hash(bytes) !== '94b3c7e58be58920c5e87a3d9e21f7eef27fc0dea833075ae4547ebae3ce7d51') throw new Error('Retained laz-perf license changed without review.')
      await copyFile(source, join(workers, 'licenses/laz-perf-COPYING.txt'))
      files.push('laz-perf-COPYING.txt')
    }
    if (!files.length) throw new Error(`No redistribution license found for bundled ${metadata.name}.`)
    licensing.push({ name: metadata.name, version: metadata.version, license: metadata.license, files })
  }
  await writeFile(join(workers, 'manifest.json'), JSON.stringify({ schema: 1, engine: '2.0.4', sourceHashes: SOURCE_HASHES,
    adapterSha256: hash(await readFile(join(out, 'geo3dPointFactories.js'))),
    workerSha256: hash(await readFile(join(workers, 'las-worker.js'))), packages: licensing }, null, 2) + '\n')
  console.log('Built source-owned LAS/COPC adapters and a self-hosted module Worker; installed packages unchanged.')
}

let isEntry = false
try { isEntry = Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) } catch { /* stdin/import has no entry path */ }
if (isEntry) await buildPointAdapters()
