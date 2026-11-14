// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { deflateRawSync, gzipSync } from 'node:zlib'
import { delimiter, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { buildPart10 } from '../../../test/fixtures/dicom/generate-fixtures.mjs'
import { browserLibraryDefines } from '../browser-runtime-options.mjs'
import { browserTestLaunchOptions } from '../browser-test-launch.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../../..')
const packageRoot = join(sourceRoot, 'packages/renderers/dicom')
const fixtureRoot = join(sourceRoot, 'test/fixtures/dicom')
const officialCtSample = join(sourceRoot, 'apps/viewer-demo/public/example/ct-small.dcm')
const outputRoot = resolve(process.env.DICOM_BROWSER_OUTPUT || join(sourceRoot, 'output/playwright/dicom-renderer'))
const requestedBrowsers = (process.env.DICOM_SMOKE_BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
const harnessRoot = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-dicom-browser-')))
const distRoot = join(harnessRoot, 'dist')
const sha256 = value => createHash('sha256').update(value).digest('hex')
const localCorpusRoots = (process.env.DICOM_LOCAL_CORPUS || '')
  .split(delimiter)
  .map(value => value.trim())
  .filter(Boolean)
  .map(value => resolve(value))
const localCorpusFiles = localCorpusRoots
  .flatMap(root => walkFiles(root))
  .filter(file => ['.dcm', '.dicom'].includes(extname(file).toLowerCase()))
  .sort((left, right) => left.localeCompare(right))
const localCorpusRoutes = new Map(localCorpusFiles.map((file, index) => [
  `__local_dicom__/${String(index + 1).padStart(4, '0')}.dcm`,
  file,
]))

const buildDeflatedPart10 = () => {
  const source = buildPart10({ frames: 1, instanceSuffix: 98, transferSyntax: '1.2.840.10008.1.2.1.99' })
  const metaLength = new DataView(source.buffer, source.byteOffset, source.byteLength).getUint32(140, true)
  const dataSetOffset = 144 + metaLength
  const deflated = deflateRawSync(source.subarray(dataSetOffset))
  const output = new Uint8Array(dataSetOffset + deflated.byteLength)
  output.set(source.subarray(0, dataSetOffset), 0)
  output.set(deflated, dataSetOffset)
  return output
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function importPlaywright() {
  return import('playwright').catch(async () => {
    const require = createRequire(import.meta.url)
    for (const pathEntry of (process.env.PATH || '').split(delimiter)) {
      if (!pathEntry) continue
      const candidate = resolve(pathEntry, '..', 'playwright')
      try {
        return await import(pathToFileURL(require.resolve(candidate)).href)
      } catch {
        // Keep searching npm exec's temporary node_modules directories.
      }
    }
    throw new Error('Missing Playwright. Run with: npm exec --yes --package=playwright@1.61.1 -- node scripts/verify-dicom-renderer.mjs')
  })
}

const harnessSource = String.raw`
const renderFileViewerDicom = window.__renderFileViewerDicom

const preloaded = new Map()
const sessions = new Map()
const records = new Map()
const runtimeNetwork = []
let recordRuntimeNetwork = false
let host = null
let hostTerminationCount = 0

const nativeFetch = window.fetch.bind(window)
window.fetch = (...args) => {
  if (recordRuntimeNetwork) runtimeNetwork.push({ kind: 'fetch', url: String(args[0]) })
  return nativeFetch(...args)
}
const nativeXhrOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  if (recordRuntimeNetwork) runtimeNetwork.push({ kind: 'xhr', method: String(method), url: String(url) })
  return nativeXhrOpen.call(this, method, url, ...rest)
}

const targetFor = id => document.getElementById(id)
const loadModules = async () => Promise.all([
  import('@cornerstonejs/core'),
  import('@cornerstonejs/dicom-image-loader'),
  import('@cornerstonejs/metadata'),
])
const loadFileViewerCore = () => import('@file-viewer/core')
const captureCanvas = id => {
  const source = targetFor(id)?.querySelector('canvas')
  if (!source || !source.width || !source.height) return null
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(source, 0, 0)
  return canvas
}
const signatureForCanvas = canvas => {
  if (!canvas || !canvas.width || !canvas.height) return { hash: '', length: 0, width: 0, height: 0 }
  const value = canvas.toDataURL('image/png')
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return { hash: (hash >>> 0).toString(16), length: value.length, width: canvas.width, height: canvas.height }
}
const pixelStatsForCanvas = canvas => {
  if (!canvas || !canvas.width || !canvas.height) return null
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let count = 0
  let bright = 0
  let maximum = 0
  let minimum = 255
  let sum = 0
  let squaredSum = 0
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = (pixels[index] * 54 + pixels[index + 1] * 183 + pixels[index + 2] * 19) / 256
    count += 1
    if (luminance > 16) bright += 1
    minimum = Math.min(minimum, luminance)
    maximum = Math.max(maximum, luminance)
    sum += luminance
    squaredSum += luminance * luminance
  }
  const mean = sum / count
  return {
    brightRatio: bright / count,
    maximum,
    mean,
    minimum,
    standardDeviation: Math.sqrt(Math.max(0, squaredSum / count - mean * mean)),
  }
}
const canvasSignature = id => signatureForCanvas(captureCanvas(id))
const canvasPixelStats = id => pixelStatsForCanvas(captureCanvas(id))
const canvasEvidence = id => {
  const canvas = captureCanvas(id)
  return { ...signatureForCanvas(canvas), pixels: pixelStatsForCanvas(canvas) }
}
const hasPixelContent = stats => Boolean(stats && stats.maximum > stats.minimum && stats.standardDeviation > 1 && stats.brightRatio > 0)
const hasCanvasPixelContent = id => hasPixelContent(canvasPixelStats(id))
const observeBaseImageId = target => {
  let observer
  return {
    promise: new Promise(resolve => {
      const inspect = () => {
        const value = target.querySelector('[data-dicom-image-id]')?.dataset.dicomImageId
        if (value) {
          observer?.disconnect()
          resolve(value)
        }
      }
      observer = new MutationObserver(inspect)
      observer.observe(target, { attributes: true, childList: true, subtree: true })
      inspect()
    }),
    disconnect: () => observer?.disconnect(),
  }
}

window.__dicomTest = {
  canvasEvidence,
  hasPixelContent,
  hasCanvasPixelContent,
  async preload(name) {
    const response = await nativeFetch('/' + name)
    if (!response.ok) throw new Error('Unable to preload ' + name)
    preloaded.set(name, await response.arrayBuffer())
    return preloaded.get(name).byteLength
  },
  release(name) {
    preloaded.delete(name)
  },
  async seedHostCache() {
    const [core] = await loadModules()
    if (!core.isCornerstoneInitialized()) core.init()
    const imageId = 'host-sentinel:independent-image'
    const pixels = new Uint8Array([73])
    await core.cache.putImageLoadObject(imageId, {
      promise: Promise.resolve({
        imageId, sizeInBytes: pixels.byteLength, width: 1, height: 1, rows: 1, columns: 1,
        color: false, rgba: false, invert: false, minPixelValue: 73, maxPixelValue: 73,
        columnPixelSpacing: 1, rowPixelSpacing: 1, numberOfComponents: 1,
        getPixelData: () => pixels,
      }),
    })
    return Boolean(core.cache.getImageLoadObject(imageId))
  },
  async hostCachePresent() {
    const [core] = await loadModules()
    return Boolean(core.cache.getImageLoadObject('host-sentinel:independent-image'))
  },
  async render(id, name) {
    const target = targetFor(id)
    const source = preloaded.get(name)
    if (!source) throw new Error('Fixture was not preloaded: ' + name)
    const controller = new AbortController()
    runtimeNetwork.length = 0
    recordRuntimeNetwork = true
    try {
      const instance = await renderFileViewerDicom(source.slice(0), target, 'dcm', {
        filename: name,
        signal: controller.signal,
        options: { locale: 'en-US' },
      })
      const root = target.querySelector('.dicom-viewer')
      const record = {
        baseImageId: root.dataset.dicomImageId,
        frameCount: Number(root.dataset.frameCount),
        renderingEngineId: root.dataset.renderingEngineId,
        name,
      }
      const [core] = await loadModules()
      if (!core.getRenderingEngine(record.renderingEngineId)) {
        throw new Error('The source ownership probe is not observing the renderer SDK instance')
      }
      sessions.set(id, { instance, controller })
      records.set(id, record)
      return { ...record, network: [...runtimeNetwork] }
    } finally {
      recordRuntimeNetwork = false
    }
  },
  async failFirstFrame(id, name) {
    const target = targetFor(id)
    const source = preloaded.get(name)
    const sourceBytes = new Uint8Array(source)
    let pixelTagOffset = -1
    for (let index = 132; index <= sourceBytes.length - 4; index += 1) {
      if (sourceBytes[index] === 0xe0 && sourceBytes[index + 1] === 0x7f && sourceBytes[index + 2] === 0x10 && sourceBytes[index + 3] === 0x00) {
        pixelTagOffset = index
        break
      }
    }
    if (pixelTagOffset < 0) throw new Error('Unable to locate synthetic Pixel Data element')
    const truncated = source.slice(0, pixelTagOffset + 13)
    const observed = observeBaseImageId(target)
    runtimeNetwork.length = 0
    recordRuntimeNetwork = true
    try {
      const instance = await renderFileViewerDicom(truncated, target, 'dcm', { filename: name, options: { locale: 'en-US' } })
      instance.destroy()
      throw new Error('Truncated DICOM unexpectedly rendered')
    } catch (error) {
      const baseImageId = await Promise.race([observed.promise, new Promise(resolve => setTimeout(() => resolve(''), 500))])
      records.set(id, { baseImageId, frameCount: 1, name })
      return { baseImageId, message: String(error?.message || error), network: [...runtimeNetwork] }
    } finally {
      observed.disconnect()
      recordRuntimeNetwork = false
    }
  },
  async abortDuringFirstFrame(id, name) {
    const target = targetFor(id)
    const source = preloaded.get(name)
    const controller = new AbortController()
    const observed = observeBaseImageId(target)
    runtimeNetwork.length = 0
    recordRuntimeNetwork = true
    const rendering = renderFileViewerDicom(source.slice(0), target, 'dcm', {
      filename: name,
      signal: controller.signal,
      options: { locale: 'en-US' },
    })
    const baseImageId = await observed.promise
    controller.abort(new DOMException('Regression abort', 'AbortError'))
    try {
      await rendering
      throw new Error('Aborted DICOM unexpectedly rendered')
    } catch (error) {
      records.set(id, { baseImageId, frameCount: 1, name })
      return { baseImageId, message: String(error?.message || error), network: [...runtimeNetwork] }
    } finally {
      observed.disconnect()
      recordRuntimeNetwork = false
    }
  },
  destroy(id) {
    sessions.get(id)?.instance.destroy()
    sessions.delete(id)
  },
  canvasSignature,
  canvasPixelStats,
  rootState(id) {
    const root = targetFor(id)?.querySelector('.dicom-viewer')
    return root ? { ...root.dataset } : null
  },
  async viewState(id) {
    const core = await loadFileViewerCore()
    return core.findFileViewerViewStateProvider(targetFor(id))?.getState() || null
  },
  async applyViewState(id, state) {
    const core = await loadFileViewerCore()
    const provider = core.findFileViewerViewStateProvider(targetFor(id))
    if (!provider?.applyState) throw new Error('Missing DICOM view-state provider')
    return provider.applyState(state, { action: 'restore', source: 'api' })
  },
  async fitView(id) {
    const core = await loadFileViewerCore()
    const provider = core.findFileViewerViewStateProvider(targetFor(id))
    if (!provider?.fit) throw new Error('Missing DICOM fit provider')
    return provider.fit({ mode: 'contain', resize: 'manual', source: 'api' })
  },
  runtimeNetwork: () => [...runtimeNetwork],
  async probe(id) {
    const [core, loader, metadata] = await loadModules()
    const fileViewerCore = await loadFileViewerCore()
    const record = records.get(id)
    const baseImageId = record?.baseImageId || ''
    const imageIds = Array.from({ length: record?.frameCount || 1 }, (_, index) => baseImageId + '?frame=' + (index + 1))
    const fileIndex = Number((/^dicomfile:(\d+)$/.exec(baseImageId) || [])[1])
    const queries = [baseImageId, ...imageIds]
    const metadataHits = []
    for (const type of Object.values(metadata.Enums.MetadataModules)) {
      for (const query of queries) {
        if (metadata.utilities.hasCacheData(type, query)) metadataHits.push(type + ':' + query)
      }
    }
    return {
      baseImageId,
      cacheHits: imageIds.filter(imageId => core.cache.getImageLoadObject(imageId) || core.cache.getImage(imageId)),
      dataSetLoaded: loader.wadouri.dataSetCacheManager.isLoaded(baseImageId) || loader.wadouri.dataSetCacheManager.isLoaded(String(fileIndex)),
      enginePresent: Boolean(record?.renderingEngineId && core.getRenderingEngine(record.renderingEngineId)),
      fileViewerEngineIds: (core.getRenderingEngines() || []).map(engine => engine.id).filter(engineId => engineId.startsWith('file-viewer-dicom-engine-')),
      filePresent: Number.isInteger(fileIndex) && Boolean(loader.wadouri.fileManager.get(fileIndex)),
      metadataHits,
      providerPresent: Boolean(fileViewerCore.findFileViewerViewStateProvider(targetFor(id))),
      targetChildren: targetFor(id).childElementCount,
    }
  },
  async startHost(name) {
    const [core, loader] = await loadModules()
    if (!core.isCornerstoneInitialized()) core.init()
    const workerManager = core.getWebWorkerManager()
    if (!workerManager.workerRegistry.dicomImageLoader) loader.init({ maxWebWorkers: 1 })
    for (const worker of workerManager.workerRegistry.dicomImageLoader.nativeWorkers) {
      if (worker.__fileViewerTerminateWrapped) continue
      const terminate = worker.terminate.bind(worker)
      Object.defineProperty(worker, '__fileViewerTerminateWrapped', { value: true })
      worker.terminate = () => { hostTerminationCount += 1; return terminate() }
    }
    const source = preloaded.get(name)
    const baseImageId = loader.wadouri.fileManager.add(new File([source], name, { type: 'application/dicom' }))
    const imageId = baseImageId + '?frame=1'
    const engine = new core.RenderingEngine('external-host-engine')
    engine.enableElement({ element: targetFor('host'), viewportId: 'external-host-stack', type: core.Enums.ViewportType.STACK })
    const viewport = engine.getViewport('external-host-stack')
    await viewport.setStack([imageId], 0)
    viewport.render()
    host = { baseImageIds: [baseImageId], engine, imageIds: [imageId], viewport }
    return { baseImageId, signature: canvasSignature('host') }
  },
  async continueHost(name) {
    const [core, loader] = await loadModules()
    const source = preloaded.get(name)
    const baseImageId = loader.wadouri.fileManager.add(new File([source], name, { type: 'application/dicom' }))
    const imageId = baseImageId + '?frame=1'
    host.baseImageIds.push(baseImageId)
    host.imageIds.push(imageId)
    await host.viewport.setStack([imageId], 0)
    host.viewport.render()
    return {
      signature: canvasSignature('host'),
      terminateCount: hostTerminationCount,
      workerInstances: core.getWebWorkerManager().workerRegistry.dicomImageLoader.nativeWorkers.length,
    }
  },
  async hostStatus() {
    const [core] = await loadModules()
    return {
      cachePresent: host?.imageIds.some(imageId => Boolean(core.cache.getImageLoadObject(imageId) || core.cache.getImage(imageId))),
      terminateCount: hostTerminationCount,
    }
  },
}
`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#101827;color:#fff;font-family:system-ui}main{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;height:100%;padding:8px;box-sizing:border-box}.target{min-width:0;min-height:0;border:1px solid #334155;background:#05080d}#host{grid-column:1/-1}
</style></head><body><main><div id="viewer-a" class="target"></div><div id="viewer-b" class="target"></div><div id="host" class="target"></div></main><script type="module" src="/bootstrap.ts"></script></body></html>`

writeFileSync(join(harnessRoot, 'index.html'), html)
writeFileSync(join(harnessRoot, 'bootstrap.ts'), String.raw`
import { renderFileViewerDicom } from '@file-viewer/renderer-dicom'
window.__renderFileViewerDicom = renderFileViewerDicom
import('./main.ts')
`)
writeFileSync(join(harnessRoot, 'main.ts'), harnessSource)
mkdirSync(join(harnessRoot, 'public'), { recursive: true })
for (const fixture of [
  'single-frame.dcm', 'multiframe.dcm', 'implicit-vr-little-endian.dcm',
  'jpeg-lossless-process-14-sv1.dcm', 'pydicom-693-explicit-vr-le.dcm',
  'pydicom-693-jpeg2000-lossless.dcm', 'pydicom-jpegls-lossless.dcm',
]) {
  cpSync(join(fixtureRoot, fixture), join(harnessRoot, 'public', fixture))
}
cpSync(officialCtSample, join(harnessRoot, 'public', 'ct-small.dcm'))
writeFileSync(join(harnessRoot, 'public', 'deflated-explicit-vr-le.dcm'), buildDeflatedPart10())
writeFileSync(join(harnessRoot, 'public', 'legacy-utf8-alias.dcm'), buildPart10({
  frames: 1,
  instanceSuffix: 97,
  specificCharacterSet: 'ISO_IR 196',
}))

const viteRequire = createRequire(join(sourceRoot, 'apps/viewer-demo/package.json'))
const dicomRequire = createRequire(join(packageRoot, 'package.json'))
// Ownership probes require the same SDK as the renderer, not a second copy
// beside the self-contained published bundle. The installed bundle gate below
// separately executes ordinary packed artifacts without source aliases.
const sourceRuntimeRoot = join(harnessRoot, 'source-runtime')
const compiledSource = spawnSync(process.execPath, [
  dicomRequire.resolve('typescript/bin/tsc'), '-p', join(packageRoot, 'tsconfig.json'),
  '--outDir', sourceRuntimeRoot, '--tsBuildInfoFile', join(harnessRoot, 'source-runtime.tsbuildinfo'),
], { cwd: sourceRoot, encoding: 'utf8' })
assert(compiledSource.status === 0, `DICOM source harness compilation failed:\n${compiledSource.stderr || compiledSource.stdout}`)
const viteEntry = viteRequire.resolve('vite')
const { build } = await import(pathToFileURL(viteEntry).href)
await build({
  root: harnessRoot,
  publicDir: join(harnessRoot, 'public'),
  logLevel: 'warn',
  define: browserLibraryDefines(),
  resolve: {
    alias: [
      { find: '@file-viewer/renderer-dicom', replacement: join(sourceRuntimeRoot, 'index.js') },
      { find: '@file-viewer/core', replacement: join(sourceRoot, 'packages/core/dist/index.js') },
      { find: '@cornerstonejs/core', replacement: dicomRequire.resolve('@cornerstonejs/core') },
      { find: '@cornerstonejs/dicom-image-loader', replacement: dicomRequire.resolve('@cornerstonejs/dicom-image-loader') },
      { find: '@cornerstonejs/metadata', replacement: dicomRequire.resolve('@cornerstonejs/metadata') },
      ...['dicom-parser', 'pako', 'events'].map(name => ({ find: name, replacement: dicomRequire.resolve(name) })),
    ],
  },
  build: {
    manifest: true,
    outDir: distRoot,
    emptyOutDir: true,
    target: 'es2020',
  },
})

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walkFiles(path) : [path]
  })
}

const manifest = JSON.parse(readFileSync(join(distRoot, '.vite/manifest.json'), 'utf8'))
const entry = manifest['index.html']
assert(entry?.isEntry && entry.file, 'Vite manifest has no index entry')
const initialFiles = new Set()
const visitManifest = key => {
  const item = manifest[key]
  if (!item || initialFiles.has(item.file)) return
  initialFiles.add(item.file)
  for (const imported of item.imports || []) visitManifest(imported)
}
visitManifest('index.html')
const initialBytes = [...initialFiles].reduce((total, file) => total + readFileSync(join(distRoot, file)).byteLength, 0)
const initialGzip = [...initialFiles].reduce((total, file) => total + gzipSync(readFileSync(join(distRoot, file))).byteLength, 0)
assert(initialGzip <= 20 * 1024, `DICOM opt-in initial business chunk exceeds 20 KiB gzip: ${initialGzip}`)
for (const file of initialFiles) {
  const source = readFileSync(join(distRoot, file), 'utf8')
  assert(!source.includes('@cornerstonejs/') && !source.includes('decodeImageFrame') && !source.includes('vtk.js'), `Heavy DICOM runtime leaked into initial chunk ${file}`)
}

const businessFiles = walkFiles(distRoot).filter(file => ['.js', '.css', '.wasm'].includes(extname(file)))
const businessBytes = businessFiles.reduce((total, file) => total + statSync(file).size, 0)
const businessGzip = businessFiles.reduce((total, file) => total + gzipSync(readFileSync(file)).byteLength, 0)
const assetInventory = businessFiles.map(file => ({
  file: relative(distRoot, file),
  bytes: statSync(file).size,
  gzipBytes: gzipSync(readFileSync(file)).byteLength,
  sha256: sha256(readFileSync(file)),
})).sort((left, right) => left.file.localeCompare(right.file))
const workerAssets = assetInventory.filter(entry => /worker/i.test(entry.file) || readFileSync(join(distRoot, entry.file), 'utf8').includes('decodeTask'))
const codecAssets = assetInventory.filter(entry => /(?:charls|jpeg|jph|codec|wasm)/i.test(entry.file) || extname(entry.file) === '.wasm')
assert(workerAssets.length > 0, 'Vite output contains no DICOM decode worker asset')

const mimeTypes = {
  '.css': 'text/css', '.dcm': 'application/dicom', '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm',
}
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const localCorpusPath = localCorpusRoutes.get(requested)
  if (localCorpusPath) {
    response.writeHead(200, { 'Content-Type': 'application/dicom', 'Cache-Control': 'no-store' })
    response.end(readFileSync(localCorpusPath))
    return
  }
  const path = resolve(distRoot, requested)
  if (!path.startsWith(distRoot + sep) || !statSafe(path)) {
    response.writeHead(404).end('Not found')
    return
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  response.end(readFileSync(path))
})
function statSafe(path) {
  try { return statSync(path).isFile() } catch { return false }
}
await new Promise((resolvePromise, rejectPromise) => {
  server.once('error', rejectPromise)
  server.listen(0, '127.0.0.1', resolvePromise)
})
const address = server.address()
const url = `http://127.0.0.1:${address.port}`
const playwrightModule = await importPlaywright()
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
mkdirSync(outputRoot, { recursive: true })
const browserResults = []
const localCorpusResults = []

async function launch(name) {
  const browserType = playwright[name]
  assert(browserType, `Unknown Playwright browser ${name}`)
  try {
    return await browserType.launch(browserTestLaunchOptions(name))
  } catch (error) {
    if (name === 'chromium') return browserType.launch({ channel: 'chrome', headless: true })
    throw error
  }
}

async function waitForCanvas(page, id, previousHash = '') {
  try {
    const proof = await page.waitForFunction(({ targetId, previousHash }) => {
      // PNG compression varies by browser. Require actual nonuniform pixels,
      // so a short valid image passes and a large blank encoding still fails.
      // Preserve this same readback: a later WebGL buffer can already be cleared.
      const evidence = window.__dicomTest.canvasEvidence(targetId)
      return window.__dicomTest.hasPixelContent(evidence.pixels) && (!previousHash || evidence.hash !== previousHash) ? evidence : false
    }, { targetId: id, previousHash }, { timeout: 30_000 })
    return await proof.jsonValue()
  } catch (error) {
    const browserName = page.context().browser()?.browserType().name() || 'unknown'
    const state = await page.evaluate(targetId => ({
      signature: window.__dicomTest.canvasSignature(targetId),
      pixels: window.__dicomTest.canvasPixelStats(targetId),
      root: window.__dicomTest.rootState(targetId)
    }), id).catch(() => null)
    console.error('[dicom-browser] pixel wait failed', JSON.stringify({ browserName, id, state }))
    await page.screenshot({ path: join(outputRoot, `${browserName}-pixel-failure.png`), timeout: 10_000 }).catch(() => {})
    throw error
  }
}

function attachPageDiagnostics(page, errors, knownDiagnostics) {
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() !== 'error') return
    if (message.text() === 'Invalid vr type ox - using OW') knownDiagnostics.push(message.text())
    else errors.push(`console: ${message.text()}`)
  })
}

function assertCleanProbe(probe, message, expectedFileViewerEngines = 0) {
  assert(
    !probe.filePresent &&
    !probe.dataSetLoaded &&
    !probe.enginePresent &&
    probe.cacheHits.length === 0 &&
    probe.metadataHits.length === 0 &&
    !probe.providerPresent &&
    probe.targetChildren === 0 &&
    probe.fileViewerEngineIds.length === expectedFileViewerEngines,
    `${message}: ${JSON.stringify(probe)}`,
  )
}

async function runIsolatedFixture(browser, browserName, fixture) {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } })
  const errors = []
  const knownDiagnostics = []
  attachPageDiagnostics(page, errors, knownDiagnostics)
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => Boolean(window.__dicomTest))
    await page.evaluate(name => window.__dicomTest.preload(name), fixture)
    const rendered = await page.evaluate(name => window.__dicomTest.render('viewer-a', name), fixture)
    assert(rendered.network.length === 0, `${browserName}: ${fixture} issued network I/O`)
    if (fixture === 'jpeg-lossless-process-14-sv1.dcm') {
      assert(rendered.frameCount === 12, `${browserName}: JPEG lossless multiframe count mismatch`)
    }
    const signature = await waitForCanvas(page, 'viewer-a')
    assert(signature.pixels.standardDeviation > 1, `${browserName}: ${fixture} canvas lacks pixel evidence`)
    await page.evaluate(() => window.__dicomTest.destroy('viewer-a'))
    const probe = await page.evaluate(() => window.__dicomTest.probe('viewer-a'))
    assertCleanProbe(probe, `${browserName}: cleanup leak after ${fixture}`)
    assert(errors.length === 0, `${browserName}: browser errors during ${fixture}:\n${errors.join('\n')}`)
    assert(knownDiagnostics.length <= 2, `${browserName}: unexpected diagnostics during ${fixture}: ${knownDiagnostics.length}`)
    return { signature, knownDiagnostics: knownDiagnostics.length }
  } finally {
    await page.close()
  }
}

async function runLocalCorpus(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } })
  const errors = []
  const knownDiagnostics = []
  const failures = []
  attachPageDiagnostics(page, errors, knownDiagnostics)
  const openHarness = async () => {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => Boolean(window.__dicomTest))
  }
  try {
    await openHarness()
    let passed = 0
    for (const route of localCorpusRoutes.keys()) {
      errors.splice(0)
      knownDiagnostics.splice(0)
      try {
        await page.evaluate(name => window.__dicomTest.preload(name), route)
        const rendered = await page.evaluate(name => window.__dicomTest.render('viewer-a', name), route)
        assert(rendered.network.length === 0, 'local corpus render issued network I/O')
        await page.waitForFunction(() => {
          const root = document.querySelector('#viewer-a .dicom-viewer')
          return root?.dataset.status === 'ready' && window.__dicomTest.hasCanvasPixelContent('viewer-a')
        }, undefined, { timeout: 15_000 })
        await page.evaluate(() => window.__dicomTest.destroy('viewer-a'))
        const probe = await page.evaluate(() => window.__dicomTest.probe('viewer-a'))
        assertCleanProbe(probe, 'local corpus cleanup leak')
        assert(errors.length === 0, errors.join('\n'))
        passed += 1
      } catch (error) {
        failures.push({
          id: route.slice(route.lastIndexOf('/') + 1, -4),
          message: String(error?.message || error).replaceAll(route, '[local-dicom]'),
        })
        await page.evaluate(name => {
          window.__dicomTest.destroy('viewer-a')
          window.__dicomTest.release(name)
        }, route).catch(() => {})
        await openHarness()
        continue
      }
      await page.evaluate(name => window.__dicomTest.release(name), route)
      if (passed % 50 === 0) await openHarness()
    }
    const groupedFailures = Object.values(failures.reduce((groups, failure) => {
      const group = groups[failure.message] || { message: failure.message, count: 0, sampleIds: [] }
      group.count += 1
      if (group.sampleIds.length < 8) group.sampleIds.push(failure.id)
      groups[failure.message] = group
      return groups
    }, {}))
    return { files: localCorpusRoutes.size, passed, failed: failures.length, failures: groupedFailures }
  } finally {
    await page.close()
  }
}

try {
  for (const browserName of requestedBrowsers) {
    console.log('[dicom-browser] starting', browserName)
    const browser = await launch(browserName)
    const errors = []
    const knownDiagnostics = []
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      attachPageDiagnostics(page, errors, knownDiagnostics)
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => Boolean(window.__dicomTest))
      const hasWebGl2 = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2')
        gl?.getExtension('WEBGL_lose_context')?.loseContext()
        return Boolean(gl)
      })
      assert(hasWebGl2, `${browserName}: this browser environment lacks WebGL2; on Linux software hosts use xvfb-run with FILE_VIEWER_HEADFUL_BROWSERS=firefox`)
      const evidenceControls = await page.evaluate(() => {
        const target = document.createElement('div')
        target.id = 'canvas-evidence-control'
        const canvas = document.createElement('canvas')
        canvas.width = 16
        canvas.height = 16
        target.appendChild(canvas)
        document.body.appendChild(target)
        try {
          const context = canvas.getContext('2d')
          const empty = window.__dicomTest.hasCanvasPixelContent(target.id)
          context.fillStyle = '#fff'
          context.fillRect(0, 0, canvas.width, canvas.height)
          const uniform = window.__dicomTest.hasCanvasPixelContent(target.id)
          context.fillStyle = '#000'
          context.fillRect(0, 0, canvas.width / 2, canvas.height)
          return { empty, uniform, patterned: window.__dicomTest.hasCanvasPixelContent(target.id) }
        } finally { target.remove() }
      })
      assert(!evidenceControls.empty && !evidenceControls.uniform && evidenceControls.patterned,
        `${browserName}: pixel evidence controls failed: ${JSON.stringify(evidenceControls)}`)
      for (const fixture of [
        'single-frame.dcm', 'multiframe.dcm', 'implicit-vr-little-endian.dcm',
        'deflated-explicit-vr-le.dcm',
        'jpeg-lossless-process-14-sv1.dcm', 'pydicom-693-explicit-vr-le.dcm',
        'pydicom-693-jpeg2000-lossless.dcm', 'pydicom-jpegls-lossless.dcm', 'ct-small.dcm',
      ]) {
        await page.evaluate(name => window.__dicomTest.preload(name), fixture)
      }
      assert(await page.evaluate(() => window.__dicomTest.seedHostCache()), `${browserName}: failed to seed independent Cornerstone cache`)

      const officialCt = await page.evaluate(() => window.__dicomTest.render('viewer-a', 'ct-small.dcm'))
      assert(officialCt.network.length === 0, `${browserName}: official CT render issued fetch/XHR`)
      await waitForCanvas(page, 'viewer-a')
      await page.waitForFunction(() => {
        const stats = window.__dicomTest.canvasPixelStats('viewer-a')
        return stats && stats.maximum > 64 && stats.standardDeviation > 8 && stats.brightRatio > 0.01
      }, undefined, { timeout: 30_000 })
      const officialCtState = await page.evaluate(() => window.__dicomTest.rootState('viewer-a'))
      const officialCtPixels = await page.evaluate(() => window.__dicomTest.canvasPixelStats('viewer-a'))
      assert(officialCtState.windowSource === 'auto', `${browserName}: missing CT VOI did not use automatic windowing`)
      assert(Number.isFinite(Number(officialCtState.windowWidth)) && Number(officialCtState.windowWidth) < 65536, `${browserName}: official CT retained the fabricated raw window`)
      assert(officialCtPixels.maximum > 64 && officialCtPixels.standardDeviation > 8 && officialCtPixels.brightRatio > 0.01, `${browserName}: official CT remained visually black: ${JSON.stringify(officialCtPixels)}`)
      await page.evaluate(() => window.__dicomTest.destroy('viewer-a'))
      const officialCtProbe = await page.evaluate(() => window.__dicomTest.probe('viewer-a'))
      assertCleanProbe(officialCtProbe, `${browserName}: official CT cleanup leaked resources`)

      const multi = await page.evaluate(() => window.__dicomTest.render('viewer-a', 'multiframe.dcm'))
      assert(multi.network.length === 0, `${browserName}: local multiframe render issued fetch/XHR: ${JSON.stringify(multi.network)}`)
      assert(await page.evaluate(() => window.__dicomTest.hostCachePresent()), `${browserName}: DICOM initialization purged independent host cache`)
      const multiFirst = await waitForCanvas(page, 'viewer-a')
      await page.click('#viewer-a button[aria-label="Next frame"]')
      await page.waitForFunction(() => document.querySelector('#viewer-a .dicom-viewer')?.dataset.currentFrame === '2')
      const multiSecond = await waitForCanvas(page, 'viewer-a', multiFirst.hash)
      assert(multiFirst.hash !== multiSecond.hash, `${browserName}: frame navigation did not change rendered pixels`)
      const initialZoom = Number((await page.evaluate(() => window.__dicomTest.rootState('viewer-a'))).zoom)
      await page.click('#viewer-a button[aria-label="Zoom in"]')
      await page.waitForFunction(previous => Number(document.querySelector('#viewer-a .dicom-viewer')?.dataset.zoom) > previous, initialZoom)
      const stage = page.locator('#viewer-a .dicom-stage')
      const box = await stage.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 18)
      await page.mouse.up()
      await page.waitForFunction(() => Number(document.querySelector('#viewer-a .dicom-viewer')?.dataset.panX) !== 0)
      await page.fill('#viewer-a input[aria-label="Window width"]', '1024')
      await page.locator('#viewer-a input[aria-label="Window width"]').press('Enter')
      await page.locator('#viewer-a input[aria-label="Window width"]').blur()
      await page.waitForFunction(() => document.querySelector('#viewer-a .dicom-viewer')?.dataset.windowWidth === '1024')
      await page.click('#viewer-a button[aria-label="Rotate right"]')
      await page.waitForFunction(() => document.querySelector('#viewer-a .dicom-viewer')?.dataset.rotation === '90')
      await stage.focus()
      await stage.press('Shift+r')
      await page.waitForFunction(() => document.querySelector('#viewer-a .dicom-viewer')?.dataset.rotation === '0')
      const restored = await page.evaluate(() => window.__dicomTest.applyViewState('viewer-a', {
        renderer: 'dicom', page: 2, scale: 1.25, rotation: 270,
        extra: { pan: [9, 11], windowCenter: 42, windowWidth: 850 },
      }))
      assert(restored.page === 2 && restored.rotation === 270 && restored.scale === 1.25, `${browserName}: unified view-state restore failed ${JSON.stringify(restored)}`)
      const fitted = await page.evaluate(() => window.__dicomTest.fitView('viewer-a'))
      assert(fitted.applied && fitted.state.rotation === 270, `${browserName}: fit did not preserve rotation ${JSON.stringify(fitted)}`)

      const implicit = await page.evaluate(() => window.__dicomTest.render('viewer-b', 'implicit-vr-little-endian.dcm'))
      assert(implicit.network.length === 0, `${browserName}: local implicit-VR render issued fetch/XHR`)
      await waitForCanvas(page, 'viewer-b')
      await page.evaluate(() => window.__dicomTest.destroy('viewer-a'))
      const multiProbe = await page.evaluate(() => window.__dicomTest.probe('viewer-a'))
      assertCleanProbe(multiProbe, `${browserName}: multiframe cleanup leaked resources`, 1)
      const remainingState = await page.evaluate(() => window.__dicomTest.rootState('viewer-b'))
      assert(remainingState.status === 'ready' && remainingState.rotation === '0', `${browserName}: destroying/rotating one instance broke the other`)
      await page.evaluate(() => window.__dicomTest.destroy('viewer-b'))
      const implicitProbe = await page.evaluate(() => window.__dicomTest.probe('viewer-b'))
      assertCleanProbe(implicitProbe, `${browserName}: implicit cleanup leaked`)
      assert(errors.length === 0, `${browserName}: browser errors during successful local renders:\n${errors.join('\n')}`)

      const failure = await page.evaluate(() => window.__dicomTest.failFirstFrame('viewer-a', 'single-frame.dcm'))
      assert(failure.baseImageId && failure.network.length === 0, `${browserName}: first-frame failure did not reach owner-scoped cleanup`)
      const failureProbe = await page.evaluate(() => window.__dicomTest.probe('viewer-a'))
      assertCleanProbe(failureProbe, `${browserName}: first-frame failure leaked`)
      const aborted = await page.evaluate(() => window.__dicomTest.abortDuringFirstFrame('viewer-b', 'single-frame.dcm'))
      assert(aborted.baseImageId && aborted.network.length === 0, `${browserName}: abort did not reach owner-scoped cleanup`)
      const abortProbe = await page.evaluate(() => window.__dicomTest.probe('viewer-b'))
      assertCleanProbe(abortProbe, `${browserName}: abort leaked`)
      const expectedFailureErrors = errors.splice(0)
      assert(expectedFailureErrors.length >= 1 && expectedFailureErrors.every(message => /Invalid vr type ox|Stream has insufficient data/.test(message)), `${browserName}: unexpected negative-path browser errors:\n${expectedFailureErrors.join('\n')}`)

      await page.reload({ waitUntil: 'networkidle' })
      for (const fixture of ['single-frame.dcm', 'jpeg-lossless-process-14-sv1.dcm']) await page.evaluate(name => window.__dicomTest.preload(name), fixture)
      const host = await page.evaluate(() => window.__dicomTest.startHost('single-frame.dcm'))
      const hostInitialSignature = await waitForCanvas(page, 'host')
      const hosted = await page.evaluate(() => window.__dicomTest.render('viewer-a', 'single-frame.dcm'))
      assert(hosted.network.length === 0, `${browserName}: renderer issued network I/O in pre-initialized host`)
      await waitForCanvas(page, 'viewer-a')
      const hostBeforeDestroy = await page.evaluate(() => window.__dicomTest.hostStatus())
      assert(hostBeforeDestroy.cachePresent && hostBeforeDestroy.terminateCount === 0, `${browserName}: host cache/worker changed during render`)
      await page.evaluate(() => window.__dicomTest.destroy('viewer-a'))
      const hostAfter = await page.evaluate(() => window.__dicomTest.continueHost('jpeg-lossless-process-14-sv1.dcm'))
      const hostContinuedSignature = await waitForCanvas(page, 'host', hostInitialSignature.hash)
      assert(hostAfter.terminateCount === 0 && hostAfter.workerInstances >= 1, `${browserName}: renderer destroy terminated host-owned worker`)
      await page.screenshot({ path: join(outputRoot, `${browserName}.png`), fullPage: true })
      assert(errors.length === 0, `${browserName}: browser errors:\n${errors.join('\n')}`)
      await page.close()

      const compressedSignatures = {}
      let compressedKnownDiagnostics = 0
      for (const fixture of [
        'deflated-explicit-vr-le.dcm',
        'legacy-utf8-alias.dcm',
        'jpeg-lossless-process-14-sv1.dcm',
        'pydicom-693-explicit-vr-le.dcm',
        'pydicom-693-jpeg2000-lossless.dcm',
        'pydicom-jpegls-lossless.dcm',
      ]) {
        const result = await runIsolatedFixture(browser, browserName, fixture)
        compressedSignatures[fixture] = result.signature
        compressedKnownDiagnostics += result.knownDiagnostics
      }
      const compressedPixelSignatures = new Set(Object.values(compressedSignatures).map(signature => `${signature.hash}:${signature.length}`))
      assert(compressedPixelSignatures.size >= 2, `${browserName}: compressed fixtures produced indistinguishable canvas output`)
      const allKnownDiagnostics = knownDiagnostics.length + compressedKnownDiagnostics
      assert(allKnownDiagnostics <= 8, `${browserName}: unexpected volume of known dcmjs ox-to-OW diagnostics: ${allKnownDiagnostics}`)
      if (browserName === 'chromium' && localCorpusRoutes.size > 0) {
        localCorpusResults.push(await runLocalCorpus(browser))
      }
      browserResults.push({ browser: browserName, compressedCanvas: compressedSignatures, hostCanvas: hostContinuedSignature, hostInitial: hostInitialSignature, hostStartReturn: host.signature, knownDiagnostics: allKnownDiagnostics, officialCt: { pixels: officialCtPixels, state: officialCtState } })
      // BEGIN PREPACK COMPLETION OBSERVATION
      await recordBrowserGateCompletion({ gateId: 'dicom-renderer', engine: browserName, phase: 'source',
        caseIds: ['source-main-flow', 'official-ct', 'source-host-interop', ...Object.keys(compressedSignatures).map(name => `compressed:${name}`)],
        fixtures: ['source-dicom-fixtures', 'ct-small.dcm'], summary: { compressedFixtureCount: Object.keys(compressedSignatures).length, packedPhaseStillRequired: true, optionalLocalCorpusRequested: localCorpusRoutes.size > 0 } })
      // END PREPACK COMPLETION OBSERVATION
    } finally {
      await browser.close()
    }
  }
} finally {
  await new Promise(resolvePromise => server.close(resolvePromise))
  rmSync(harnessRoot, { recursive: true, force: true })
}

console.log(JSON.stringify({
  initialBusinessChunk: { files: [...initialFiles], bytes: initialBytes, gzipBytes: initialGzip },
  dicomBusinessClosure: { files: businessFiles.length, bytes: businessBytes, gzipBytes: businessGzip },
  workerAssets,
  codecAssets,
  browsers: browserResults,
  scope: 'Same-source SDK ownership and external-host interoperability; packed runtime validated separately',
  localCorpus: localCorpusResults,
}, null, 2))
const packedRuntime = spawnSync(process.execPath, [join(packageRoot, 'scripts/verify-packed-browser.mjs')], {
  cwd: sourceRoot, env: process.env, stdio: 'inherit',
})
assert(packedRuntime.status === 0, 'The ordinary installed DICOM runtime browser gate failed')
