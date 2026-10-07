/** Derive source-owned raster factories without modifying the installed engine. */
import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RASTER_SOURCE_HASHES = {
  GeoTIFFSource: '4344dba6071c32342341abbf3ac2f9dd19e6c950248aaf52711a2bbbbd12d07c',
  TextureGenerator: '1f4a094ed1f49736208abe1e4031d8447f7777d6a0a3ba6b78484f93cb605542',
  geotiffPool: '6b8cdc6a98f9f443dbb5ddfb516a7ce01ae40ca776ba6a1e9cc2a9667a148ae3',
  geotiffWorker: '4453d3dca492eedca5e4d78d66e1153569f0af5d0d2bd178f7bab400b1d581e8',
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
function reviewed(name, text) {
  if (hash(text) !== RASTER_SOURCE_HASHES[name]) throw new Error(`Unreviewed raster source: ${name}`)
}
function replaceOnce(text, search, replacement) {
  if (!text.includes(search) || text.indexOf(search) !== text.lastIndexOf(search)) throw new Error(`Unexpected raster adapter boundary: ${search.slice(0, 80)}`)
  return text.replace(search, replacement)
}
export function adaptTextureGenerator(text) {
  reviewed('TextureGenerator', text)
  const imports = []
  let body = text.replace(/^import [\s\S]*?;\r?\n/gm, statement => {
    if (!statement.includes("from './WorkerPool'")) imports.push(statement)
    return ''
  })
  const start = body.indexOf('let decoderWorkerPool = null;')
  const end = body.indexOf('async function createImageBitmapUsingWorker', start)
  if (start < 0 || end < start) throw new Error('Texture pool boundary is missing.')
  body = body.slice(0, start) + 'function getDecoderPool() { return pool; }\n' + body.slice(end)
  body = body.replace(/^export (?=(?:const|function) )/gm, '')
  body = replaceOnce(body, 'export default {', 'return {')
  if (/^export /m.test(body)) throw new Error('Unexpected texture generator export.')
  return `${imports.join('')}\n// Derived from reviewed Giro3D 2.0.4, MIT.\nexport function createTextureGenerator(pool) {\n${body}\n}\n`
}
export function adaptGeoTIFFSource(text) {
  reviewed('GeoTIFFSource', text)
  const imports = []
  let body = text.replace(/^import [\s\S]*?;\r?\n/gm, statement => {
    if (statement.includes("from '../utils/TextureGenerator'")) return ''
    if (statement.includes("from 'geotiff'")) statement = replaceOnce(statement, ', Pool }', ' }')
    imports.push(statement)
    return ''
  })
  // Keep the shared cache's capacity and eviction policy, but retain ownership
  // of each accepted region. Eviction releases the tracking key as well. Track
  // stale entries too: Cache.entries() omits them before their storage is freed.
  body = replaceOnce(body, '  _cache = GlobalCache;', '  _cache = GlobalCache;\n  _regionCacheKeys = new Set();')
  body = replaceOnce(body, '  dispose() {\n    this.getInternalCache()?.clear();', `  dispose() {
    workers.dispose();
    for (const key of this._regionCacheKeys) this._cache.delete(key);
    this._regionCacheKeys.clear();
    this.getInternalCache()?.clear();`)
  body = replaceOnce(body, '  async getRegionBuffers(extent, imageInfo, channels, signal, id) {', '  async getRegionBuffers(extent, imageInfo, channels, signal, id) {\n    signal = workers.combineSignal(signal);\n    signal.throwIfAborted();')
  body = replaceOnce(body, '    const buf = await this.fetchBuffer(imageInfo.image, window, channels, signal);', '    const buf = await this.fetchBuffer(imageInfo.image, window, channels, signal);\n    signal.throwIfAborted();')
  body = replaceOnce(body, '    this._cache.set(cacheKey, result, {\n      size\n    });', `    const cacheOptions = { size };
    // Do not register deletion handlers for disabled or oversized entries.
    if (this._cache.enabled && size <= this._cache.maxSize) {
      cacheOptions.onDelete = () => this._regionCacheKeys.delete(cacheKey);
    }
    this._cache.set(cacheKey, result, cacheOptions);
    // Add after set(): replacement may invoke the previous deletion handler.
    if (cacheOptions.onDelete && this._cache.get(cacheKey) === result) {
      this._regionCacheKeys.add(cacheKey);
    }`)
  body = replaceOnce(body, '  async readWindow(image, window, channels, signal) {', '  async readWindow(image, window, channels, signal) {\n    signal = workers.combineSignal(signal);')
  body = replaceOnce(body, '    }, dataType, ...buffers);', '    }, dataType, ...buffers);\n    if (workers.signal.aborted) { texture.dispose(); throw workers.signal.reason; }')
  body = body.replace(/^export (?=(?:class|function) )/gm, '')
  body = replaceOnce(body, 'export default GeoTIFFSource;', 'return new GeoTIFFSource(options);')
  if (/^export /m.test(body)) throw new Error('Unexpected GeoTIFF source export.')
  return `${imports.join('')}\nimport { createTextureGenerator } from 'geo3d-owned-raster:TextureGenerator';\n// Derived from reviewed Giro3D 2.0.4, MIT. All pool state is inside this factory.\nexport function createGeoTIFFSource(workers, options) {\nconst TextureGenerator = createTextureGenerator(workers.texture);\nconst Pool = class { constructor() { return workers.decoder; } };\n${body}\n}\n`
}
export function extractTextureWorker(text) {
  reviewed('TextureGenerator', text)
  const match = text.match(/atob\('([A-Za-z0-9+/=]+)'\)/g)
  if (match?.length !== 1) throw new Error('Unexpected embedded texture Worker.')
  const encoded = /atob\('([^']+)'\)/.exec(match[0])[1]
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.toString('base64') !== encoded) throw new Error('Invalid embedded texture Worker encoding.')
  return bytes.toString('utf8')
}
async function packageRoot(path) {
  let folder = dirname(path)
  for (;;) {
    try { const metadata = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8')); if (metadata.name) return { folder, metadata } } catch { /* Walk to metadata. */ }
    const parent = dirname(folder)
    if (parent === folder) throw new Error(`Cannot locate package root: ${path}`)
    folder = parent
  }
}
// Lerc's npm package is published from OtherLanguages/js, without these root
// legal files. Pin the exact upstream Git blobs; do not fetch during a build.
const LERC_LICENSE_BLOBS = {
  'lerc-LICENSE': '863d15091ebca6473a211f9d99a0051502f63d8b',
  'lerc-NOTICE': '826163b3f97fc3c5c417ae72440e263927e99163',
}
export async function copyRasterPackageLicenses({ folder, metadata }, output,
  retainedRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../licenses')) {
  const legal = new Map()
  let hasLicense = false
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (!entry.isFile() || !/^(?:licen[sc]e|copying|notice)(?:[.-]|$)/i.test(entry.name)) continue
    const bytes = await readFile(join(folder, entry.name))
    if (!bytes.length) throw new Error(`Empty raster decoder legal file: ${metadata.name}/${entry.name}`)
    const name = `${metadata.name.replace(/[@/]/g, '_')}-${entry.name}`
    legal.set(name, bytes)
    if (/^(?:licen[sc]e|copying)(?:[.-]|$)/i.test(entry.name)) hasLicense = true
  }
  if (!hasLicense) {
    if (metadata.name !== 'lerc' || metadata.version !== '3.0.0' || metadata.license !== 'Apache-2.0') {
      throw new Error(`Missing raster decoder license: ${metadata.name}@${metadata.version}`)
    }
    // Restore upstream line endings after Git checkout conversion, then verify
    // the exact original bytes before copying. All other changes remain fatal.
    for (const [name, expected] of Object.entries(LERC_LICENSE_BLOBS)) {
      const text = (await readFile(join(retainedRoot, name), 'utf8')).replace(/\r\n/g, '\n')
      const bytes = Buffer.from(name === 'lerc-NOTICE' ? text.replace(/\n/g, '\r\n') : text)
      const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
      if (blob !== expected) throw new Error(`Unreviewed raster decoder legal file: ${name}`)
      legal.set(name, bytes)
    }
  }
  await mkdir(output, { recursive: true })
  const files = [...legal.keys()].sort(), sha256 = {}
  for (const name of files) {
    const bytes = legal.get(name)
    await writeFile(join(output, name), bytes)
    sha256[name] = hash(bytes)
  }
  return { name: metadata.name, version: metadata.version, license: metadata.license, files, sha256 }
}
export async function buildRasterAdapters() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const require = createRequire(join(root, 'package.json'))
  const { build } = require('esbuild')
  const giro = await packageRoot(require.resolve('@giro3d/giro3d/sources/GeoTIFFSource.js'))
  if (giro.metadata.version !== '2.0.4') throw new Error('Owned raster adapters require Giro3D 2.0.4.')
  const giroRequire = createRequire(join(giro.folder, 'package.json'))
  const geotiff = await packageRoot(giroRequire.resolve('geotiff'))
  const paths = { GeoTIFFSource: join(giro.folder, 'sources/GeoTIFFSource.js'), TextureGenerator: join(giro.folder, 'utils/TextureGenerator.js') }
  const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => [name, await readFile(path, 'utf8')])))
  const adapted = { GeoTIFFSource: adaptGeoTIFFSource(sources.GeoTIFFSource), TextureGenerator: adaptTextureGenerator(sources.TextureGenerator) }
  reviewed('geotiffPool', await readFile(join(geotiff.folder, 'dist-module/pool.js')))
  reviewed('geotiffWorker', await readFile(join(geotiff.folder, 'dist-module/worker/decoder.js')))
  const out = join(root, 'dist'), workers = join(out, 'geo3d-workers')
  await mkdir(workers, { recursive: true })
  const common = { bundle: true, platform: 'browser', format: 'esm', target: 'es2022', minify: false, metafile: true, logLevel: 'warning' }
  const factories = await build({ ...common,
    stdin: { contents: "export { createGeoTIFFSource } from 'geo3d-owned-raster:GeoTIFFSource';", resolveDir: giro.folder },
    outfile: join(out, 'geo3dRasterFactories.js'),
    plugins: [{ name: 'owned-raster-sources', setup(builder) {
      builder.onResolve({ filter: /^geo3d-owned-raster:/ }, args => {
        const name = args.path.slice('geo3d-owned-raster:'.length)
        if (!paths[name]) throw new Error('Unknown owned raster source.')
        return { path: paths[name], namespace: 'owned-raster' }
      })
      builder.onLoad({ filter: /.*/, namespace: 'owned-raster' }, args => {
        const name = Object.keys(paths).find(key => paths[key] === args.path)
        return { contents: adapted[name], loader: 'js', resolveDir: dirname(args.path) }
      })
      builder.onResolve({ filter: /^\./, namespace: 'owned-raster' }, args => {
        const path = resolve(args.resolveDir, args.path)
        if (!path.startsWith(giro.folder + sep)) throw new Error('Raster adapter import escaped engine root.')
        return { path: '@giro3d/giro3d/' + relative(giro.folder, path).split(sep).join('/') + '.js', external: true }
      })
      builder.onResolve({ filter: /^three$/, namespace: 'owned-raster' }, args => ({ path: args.path, external: true }))
      // geotiff is a Giro3D transitive dependency, not a direct consumer dependency.
      // Bundle its reviewed ESM implementation instead of emitting a broken bare import.
      builder.onResolve({ filter: /^geotiff$/, namespace: 'owned-raster' }, () => ({ path: join(geotiff.folder, 'dist-module/geotiff.js') }))
    } }],
  })
  const workerSource = `import { getDecoder } from './compression/index.js';\nself.addEventListener('message', async ({data}) => {\n const {id,type,payload} = data;\n try {\n  if(type !== 'DecodeRaster') throw new Error('Unsupported raster decoder request.');\n  const decoder = await getDecoder(payload.compression, payload.decoderParameters);\n  const decoded = await decoder.decode(payload.buffer);\n  self.postMessage({requestId:id,payload:decoded},[decoded]);\n } catch(error) { self.postMessage({requestId:id,error:error instanceof Error ? error.message : String(error)}); }\n});\n`
  const decoder = await build({ ...common, stdin: { contents: workerSource, resolveDir: join(geotiff.folder, 'dist-module') }, outfile: join(workers, 'geotiff-worker.js') })
  // The embedded engine worker is part of the SHA-256-reviewed TextureGenerator.
  // Emit its exact program as a static local file, not a runtime Blob URL.
  await writeFile(join(workers, 'texture-worker.js'), extractTextureWorker(sources.TextureGenerator))
  const packages = new Map([[giro.folder, giro], [geotiff.folder, geotiff]])
  for (const input of [...Object.keys(factories.metafile.inputs), ...Object.keys(decoder.metafile.inputs)]) {
    if (!input.includes('node_modules') || input.startsWith('owned-raster:')) continue
    const pkg = await packageRoot(resolve(input)); packages.set(pkg.folder, pkg)
  }
  const licenses = []
  for (const pkg of packages.values()) {
    licenses.push(await copyRasterPackageLicenses(pkg, join(workers, 'raster-licenses')))
  }
  const manifest = JSON.parse(await readFile(join(workers, 'manifest.json'), 'utf8'))
  manifest.raster = { sourceHashes: RASTER_SOURCE_HASHES, factorySha256: hash(await readFile(join(out, 'geo3dRasterFactories.js'))),
    files: Object.fromEntries(await Promise.all(['geotiff-worker.js', 'texture-worker.js'].map(async name => [name, hash(await readFile(join(workers, name)))]))), packages: licenses }
  await writeFile(join(workers, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log('Built source-owned GeoTIFF and texture decoder Workers; installed engine and shared pools unchanged.')
}
let isEntry = false
try { isEntry = Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) } catch { /* Import only. */ }
if (isEntry) await buildRasterAdapters()
