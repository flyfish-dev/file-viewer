import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  copyGeo3dAssets,
  browserOutput,
  coreEntry,
  rendererFile,
  engineFile,
  runtimeGraphPlugin,
  verifyRuntimeModules
} from './geo3d-browser-package.mjs'
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..'),
  output = browserOutput
const fixtures = resolve(here, '../test/fixtures/geo3d'),
  work = join(output, 'fixture'),
  site = join(output, 'site')
await mkdir(work, { recursive: true })
const require = createRequire(resolve(root, 'package.json')),
  { chromium } = require('playwright')
const { build: esbuild } = createRequire(resolve(here, '../package.json'))('esbuild')
const lightweight = await esbuild({
  entryPoints: [rendererFile('dist/geo3d.js')],
  outdir: join(output, 'entry-check'),
  splitting: true,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  metafile: true,
  minify: true,
  write: false,
  logLevel: 'silent'
})
verifyRuntimeModules(Object.keys(lightweight.metafile.inputs).map((path) => resolve(path)))
const entry = Object.entries(lightweight.metafile.outputs).find(
  ([, v]) => v.entryPoint && resolve(v.entryPoint) === rendererFile('dist/geo3d.js')
)
assert.ok(entry && entry[1].bytes < 20000, 'Optional Geo3D entry is not lazy')
const viteRequire = createRequire(resolve(root, 'apps/viewer-demo/package.json'))
const { build } = await import(pathToFileURL(viteRequire.resolve('vite')).href)
await writeFile(
  join(work, 'index.html'),
  '<!doctype html><meta charset="utf-8"><style>html,body,#viewer{margin:0;width:100%;height:100%}html,body{height:100%}</style><div id="viewer"></div><script type="module" src="./main.js"></script>'
)
await writeFile(
  join(work, 'main.js'),
  `
import {renderFileViewerGeo3d,createGeo3dRenderer,resolveGeo3dSourceType} from ${JSON.stringify(rendererFile('dist/geo3d.js'))}
import {createViewer} from ${JSON.stringify(coreEntry)}
// Observe module allocation separately, before any viewer or Worker is created.
window.ownedUrls=new Map();window.moduleUrls=new Set();window.liveWorkers=new Set();window.decodedBitmaps=new Set()
const nativeBitmap=window.createImageBitmap.bind(window)
window.createImageBitmap=async(...args)=>{const bitmap=await nativeBitmap(...args);const close=bitmap.close.bind(bitmap);decodedBitmaps.add(bitmap);bitmap.close=()=>{decodedBitmaps.delete(bitmap);close()};return bitmap}
const createUrl=URL.createObjectURL.bind(URL),revokeUrl=URL.revokeObjectURL.bind(URL)
URL.createObjectURL=blob=>{const url=createUrl(blob);ownedUrls.set(url,{type:blob.type,bytes:blob.size,phase:window.resourcePhase||'module'});return url}
URL.revokeObjectURL=url=>{ownedUrls.delete(url);revokeUrl(url)}
const NativeWorker=window.Worker
window.Worker=class extends NativeWorker {
  constructor(...args){super(...args);liveWorkers.add(this)}
  terminate(){liveWorkers.delete(this);super.terminate()}
}
window.prepareEngine=async()=>{
  window.resourcePhase='module'
  await Promise.all([
    import(${JSON.stringify(engineFile('core/Instance.js'))}),
    import(${JSON.stringify(engineFile('controls/FirstPersonControls.js'))}),
    import(${JSON.stringify(engineFile('sources/COPCSource.js'))}),
    import(${JSON.stringify(engineFile('sources/LASSource.js'))}),
    import(${JSON.stringify(engineFile('sources/GeoTIFFSource.js'))}),
    import(${JSON.stringify(engineFile('entities/PointCloud.js'))}),
    import(${JSON.stringify(engineFile('entities/Tiles3D.js'))}),
    import(${JSON.stringify(engineFile('entities/Map.js'))}),
    import(${JSON.stringify(engineFile('core/layer/ColorLayer.js'))}),
  ])
  if(liveWorkers.size)throw new Error('Engine import unexpectedly created a Worker')
  moduleUrls=new Set(ownedUrls.keys());window.resourcePhase='viewer'
  return {moduleUrls:[...ownedUrls.values()],workersBeforeViewer:liveWorkers.size}
}
window.resourceState=()=>({
  instanceObjectUrls:[...ownedUrls].filter(([url])=>!moduleUrls.has(url)).map(([,data])=>data),
  moduleObjectUrls:[...ownedUrls].filter(([url])=>moduleUrls.has(url)).length,
  liveWorkers:liveWorkers.size,
  decodedBitmaps:decodedBitmaps.size,
})
window.openDataset=async ({url,filename,format,local,controls=false,hostApi='renderer'})=>{
  const controller=new AbortController();window.abortDataset=()=>controller.abort()
  let file
  if(local){const bytes=await(await fetch(url)).arrayBuffer();file=hostApi==='headless'?new Blob([bytes]):new File([bytes],filename);if(format==='copc')file.arrayBuffer=()=>{throw new Error('Local COPC attempted a whole-file read')}}
  window.hooks={before:0,after:0,cleanup:0}
  let configured
  const rendererOptions={assetBaseUrl:'/vendor/geo3d/',giro3d:{view:{controls,fitToDataset:true},sources:{copc:{enableWorkers:true,pointSize:5},las:{enableWorkers:true,pointSize:5},geotiff:{enableWorkers:true},cog:{enableWorkers:true}}},
      configureInstance(){hooks.before++;return()=>hooks.cleanup++},configure(context){configured=context;hooks.after++;return()=>hooks.cleanup++}}
  if(hostApi==='headless'){
    const viewer=createViewer(document.getElementById('viewer'),{options:{locale:'en-US',autoRenderers:false,rendererMode:'replace',renderers:[createGeo3dRenderer(rendererOptions)]}})
    const session=await viewer.load({file,filename},{signal:controller.signal})
    if(!session)throw new Error('Public createViewer unexpectedly canceled a Blob dataset')
    if(configured.source.file!==file||configured.source.file instanceof File)throw new Error('Public createViewer discarded or replaced its Blob source')
    window.instance={instance:configured.instance,entity:configured.entity,unmount:()=>viewer.destroy()}
  }else{
    window.instance=await renderFileViewerGeo3d(new ArrayBuffer(0),document.getElementById('viewer'),format,
      {filename,streamUrl:local?undefined:url,sourceFile:file,signal:controller.signal,options:{locale:'en-US'}},rendererOptions)
  }
  return {hostApi,blobSource:hostApi==='headless',canvas:document.querySelectorAll('canvas').length,before:hooks.before,after:hooks.after}
}
window.routeOrdinary=async url=>resolveGeo3dSourceType({filename:'ordinary.tiff',extension:'tiff',url})
window.checkCrs=async()=>{
  const {resolveGeo3dCrs}=await import(${JSON.stringify(rendererFile('dist/geo3dCrs.js'))})
  const north=await resolveGeo3dCrs('EPSG:32632'),south=await resolveGeo3dCrs('EPSG:32732')
  let unknownRejected=false
  try{await resolveGeo3dCrs('EPSG:999999999')}catch(error){unknownRejected=/Unknown Geo3D CRS/.test(String(error))}
  return {north:north.id,south:south.id,unknownRejected}
}
window.entryReady=true
`
)
await build({
  configFile: false,
  root: work,
  base: './',
  logLevel: 'warn',
  plugins: [runtimeGraphPlugin('datasets')],
  build: { outDir: site, emptyOutDir: true, target: 'es2022' }
})
await copyGeo3dAssets(join(site, 'vendor/geo3d'))
// Deterministic tiled RGB GeoTIFF with native overviews: enough bytes to prove
// real progressive raster access without padding or a remote data dependency.
function createStreamingCog() {
  const levels = [2048, 1024, 512, 256, 128],
    block = 128,
    tagCount = 15,
    ifdLength = 2 + tagCount * 12 + 4
  let cursor = 8 + levels.length * ifdLength
  const dirs = levels.map((size, i) => {
    const tiles = Math.ceil(size / block) ** 2,
      factor = 2048 / size
    const tags = [
      [254, 4, [i ? 1 : 0]],
      [256, 4, [size]],
      [257, 4, [size]],
      [258, 3, [8, 8, 8]],
      [259, 3, [1]],
      [262, 3, [2]],
      [277, 3, [3]],
      [284, 3, [1]],
      [322, 4, [block]],
      [323, 4, [block]],
      [324, 4, Array(tiles).fill(0)],
      [325, 4, Array(tiles).fill(block * block * 3)],
      [33550, 12, [factor, factor, 0]],
      [33922, 12, [0, 0, 0, 500000, 5102048, 0]],
      [34735, 3, [1, 1, 0, 3, 1024, 0, 1, 1, 1025, 0, 1, 1, 3072, 0, 1, 32632]]
    ]
    const fields = tags.map(([tag, type, values]) => {
      const n = type === 12 ? 8 : type === 4 ? 4 : 2
      let offset
      if (n * values.length > 4) {
        offset = cursor
        cursor += n * values.length
      }
      return { tag, type, values, offset }
    })
    return { size, tiles, fields, offset: 8 + i * ifdLength }
  })
  for (const d of [...dirs].reverse())
    for (let i = 0; i < d.tiles; i++) {
      d.fields.find((f) => f.tag === 324).values[i] = cursor
      cursor += block * block * 3
    }
  const out = new Uint8Array(cursor),
    v = new DataView(out.buffer)
  out.set([73, 73, 42, 0])
  v.setUint32(4, 8, true)
  for (const [i, d] of dirs.entries()) {
    v.setUint16(d.offset, tagCount, true)
    for (const [j, f] of d.fields.entries()) {
      const p = d.offset + 2 + j * 12
      v.setUint16(p, f.tag, true)
      v.setUint16(p + 2, f.type, true)
      v.setUint32(p + 4, f.values.length, true)
      if (f.offset !== undefined) v.setUint32(p + 8, f.offset, true)
      const start = f.offset ?? p + 8,
        size = f.type === 12 ? 8 : f.type === 4 ? 4 : 2
      f.values.forEach((value, k) => {
        if (f.type === 12) v.setFloat64(start + k * size, value, true)
        else if (f.type === 4) v.setUint32(start + k * size, value, true)
        else v.setUint16(start + k * size, value, true)
      })
    }
    v.setUint32(d.offset + 2 + tagCount * 12, dirs[i + 1]?.offset || 0, true)
    for (const [tile, start] of d.fields.find((f) => f.tag === 324).values.entries())
      for (let p = 0; p < block * block; p++) {
        const tilesAcross = d.size / block,
          factor = 2048 / d.size,
          x = ((tile % tilesAcross) * block + (p % block)) * factor,
          y = (Math.floor(tile / tilesAcross) * block + Math.floor(p / block)) * factor
        out[start + p * 3] = x % 256
        out[start + p * 3 + 1] = y % 256
        out[start + p * 3 + 2] = ((Math.floor(x / 32) + Math.floor(y / 32)) % 2) * 180 + 40
      }
  }
  return out
}
const cog = createStreamingCog()
await writeFile(join(output, 'streaming-generated.cog.tif'), cog)
const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff'
}
const serverRequests = []
const dataServer = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname)
    const path = resolve(fixtures, '.' + pathname)
    if (!path.startsWith(fixtures + sep)) {
      res.writeHead(403).end()
      return
    }
    const bytes = pathname === '/streaming-generated.cog.tif' ? cog : await readFile(path)
    const common = {
      'Content-Type': contentTypes[extname(path)] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
    }
    const range = req.headers.range
    if (range) {
      const match = /^bytes=(\d+)-(\d+)$/.exec(range)
      if (!match || Number(match[1]) >= bytes.length || Number(match[2]) < Number(match[1])) {
        res.writeHead(416, { ...common, 'Content-Range': `bytes */${bytes.length}` }).end()
        return
      }
      const begin = Number(match[1]),
        end = Math.min(Number(match[2]) + 1, bytes.length)
      serverRequests.push({ path: pathname, range, status: 206, bytes: end - begin })
      res
        .writeHead(206, {
          ...common,
          'Content-Range': `bytes ${begin}-${end - 1}/${bytes.length}`,
          'Content-Length': end - begin
        })
        .end(bytes.subarray(begin, end))
    } else {
      serverRequests.push({ path: pathname, range: null, status: 200, bytes: bytes.length })
      res.writeHead(200, { ...common, 'Content-Length': bytes.length }).end(bytes)
    }
  } catch {
    res.writeHead(404).end('Not found')
  }
})
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/favicon.ico') {
      res.writeHead(204).end()
      return
    }
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname),
      path = resolve(site, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!path.startsWith(site + sep)) {
      res.writeHead(403).end()
      return
    }
    res
      .writeHead(200, {
        'Content-Type': contentTypes[extname(path)] || 'application/octet-stream',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob: http://127.0.0.1:*; connect-src 'self' blob: http://127.0.0.1:*"
      })
      .end(await readFile(path))
  } catch {
    res.writeHead(404).end('Not found')
  }
})
await Promise.all([
  new Promise((r) => server.listen(0, '127.0.0.1', r)),
  new Promise((r) => dataServer.listen(0, '127.0.0.1', r))
])
const origin = `http://127.0.0.1:${server.address().port}`,
  dataOrigin = `http://127.0.0.1:${dataServer.address().port}`
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--enable-unsafe-swiftshader']
})
// Decode the real browser screenshot, not the source texture or a mocked canvas.
function checkerPixels(png) {
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20),
    channels = png[25] === 6 ? 4 : png[25] === 2 ? 3 : 0
  assert.equal(png[24], 8)
  assert.ok(channels)
  assert.equal(png[28], 0)
  const chunks = []
  for (let p = 8; p + 12 <= png.length;) {
    const length = png.readUInt32BE(p)
    if (png.toString('ascii', p + 4, p + 8) === 'IDAT')
      chunks.push(png.subarray(p + 8, p + 8 + length))
    p += 12 + length
  }
  const stride = width * channels,
    raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height })
  assert.equal(raw.length, (stride + 1) * height)
  let previous = Buffer.alloc(stride),
    blue = 0,
    gold = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)],
      row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    assert.ok(filter <= 4)
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0,
        b = previous[x],
        c = x >= channels ? previous[x - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = a
      else if (filter === 2) predictor = b
      else if (filter === 3) predictor = Math.floor((a + b) / 2)
      else if (filter === 4) {
        const p = a + b - c,
          pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c)
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      row[x] = (row[x] + predictor) & 255
    }
    for (let x = 0; x < stride; x += channels) {
      const r = row[x],
        g = row[x + 1],
        b = row[x + 2]
      if (b > r + 40 && b > g + 20) blue++
      if (r > b + 50 && g > b + 35) gold++
    }
    previous = row
  }
  return { blue, gold, width, height }
}
const report = {
  entryBytes: entry[1].bytes,
  cases: [],
  errors: [],
  limitations: ['Shared engine Worker/Blob lifetime is checked strictly; failures remain failures.']
}
const cases = [
  ['cityjson', 'upstream/cityjson-cjio-cube.json', 'cityjson', false],
  ['cityjson-projected', 'samples-mit/building.city.json', 'cityjson', false],
  ['cityjson-textured', 'samples-mit/building-textured.city.json', 'cityjson', false],
  ['copc-original', 'samples-mit/original-deliveries/streaming-16384.copc.laz', 'copc', false],
  ['las', 'samples-mit/terrain.las', 'las', false],
  ['laz', 'samples-mit/terrain.laz', 'laz', false],
  ['copc', 'samples-mit/streaming.copc.laz', 'copc', false],
  ['copc-local', 'samples-mit/terrain.copc.laz', 'copc', true],
  ['geotiff', 'samples-mit/geotiff-striped.tif', 'geotiff', false],
  ['cog', 'streaming-generated.cog.tif', 'cog', false],
  ['tiles3d', 'samples-mit/tiles3d/tileset.json', '3dtiles', false],
  ['3tz', 'samples-mit/building-indexed.3tz', '3tz', true],
  ['3dtiles-zip', 'samples-mit/building.3dtiles.zip', '3tz', true],
  ['headless-blob-las', 'samples-mit/terrain.las', 'las', true, 'headless'],
  ['headless-blob-copc', 'samples-mit/terrain.copc.laz', 'copc', true, 'headless']
]
try {
  for (const [name, path, format, local, hostApi] of cases) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } }),
      requests = [],
      errors = [],
      start = serverRequests.length
    page.on('request', (r) => requests.push({ method: r.method(), url: r.url() }))
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (
        url.startsWith(origin + '/') ||
        url.startsWith(dataOrigin + '/') ||
        url.startsWith('blob:') ||
        url.startsWith('data:')
      )
        return route.continue()
      errors.push('External request: ' + url)
      return route.abort()
    })
    let loaded, rendered, cleanup, moduleResources, screenshot, textureEvidence
    try {
      await page.goto(origin)
      await page.waitForFunction(() => window.entryReady === true)
      assert.ok(
        !requests.some((r) => r.url.includes('geo3dRuntime')),
        'Heavy runtime loaded before use'
      )
      moduleResources = await page.evaluate(() => window.prepareEngine())
      if (name === 'cityjson') {
        assert.equal(
          await page.evaluate(
            (url) => window.routeOrdinary(url),
            dataOrigin + '/samples-mit/ordinary.tiff'
          ),
          false
        )
        report.crs = await page.evaluate(() => window.checkCrs())
        assert.deepEqual(report.crs, {
          north: 'EPSG:32632',
          south: 'EPSG:32732',
          unknownRejected: true
        })
      }
      loaded = await page.evaluate((args) => window.openDataset(args), {
        url: dataOrigin + '/' + path,
        filename: path.split('/').pop(),
        format,
        local,
        hostApi,
        controls: name === 'las'
      })
      assert.equal(loaded.before, 1)
      assert.equal(loaded.after, 1)
      assert.ok(loaded.canvas > 0)
      await page.waitForFunction(
        () => {
          const r = window.instance?.instance?.renderer?.info?.render
          return r && (r.triangles > 0 || r.points > 0)
        },
        null,
        { timeout: 45000 }
      )
      await page.waitForFunction(() => !window.instance.instance.loading, null, { timeout: 45000 })
      rendered = await page.evaluate(() => ({
        triangles: instance.instance.renderer.info.render.triangles,
        points: instance.instance.renderer.info.render.points
      }))
      screenshot = (await page.screenshot({ path: join(output, `${name}.png`) })).toString('base64')
      if (name === 'cityjson-textured') {
        textureEvidence = await page.evaluate(() => {
          const mesh = instance.entity.children.find((child) => child.material?.map)
          if (!mesh) return null
          const map = mesh.material.map,
            uv = mesh.geometry.getAttribute('uv')
          return {
            isTexture: map.isTexture,
            imageWidth: map.image.width,
            imageHeight: map.image.height,
            uvCount: uv?.count,
            decodedBitmaps: decodedBitmaps.size
          }
        })
        assert.ok(textureEvidence?.isTexture, 'CityJSON did not bind its external texture')
        assert.equal(textureEvidence.imageWidth, 16)
        assert.equal(textureEvidence.imageHeight, 16)
        assert.equal(textureEvidence.uvCount, 36)
        textureEvidence.pixels = checkerPixels(Buffer.from(screenshot, 'base64'))
        assert.ok(
          textureEvidence.pixels.blue > 50 && textureEvidence.pixels.gold > 50,
          'CityJSON screenshot does not show both checker colors'
        )
      }
      const transfers = serverRequests.slice(start)
      if (name === 'cityjson-textured')
        assert.ok(
          transfers.some((r) => r.path.endsWith('/textures/checker.png') && r.status === 200),
          'CityJSON relative texture was not requested'
        )
      if (name === 'copc')
        assert.ok(
          transfers
            .filter((r) => r.path.endsWith('streaming.copc.laz'))
            .every((r) => r.status === 206),
          'COPC performed a whole-file GET'
        )
      if (name === 'cog') {
        const raster = transfers.filter((r) => r.path === '/streaming-generated.cog.tif')
        assert.ok(
          raster.length > 0 && raster.every((r) => r.status === 206),
          'COG lost byte-range semantics'
        )
        assert.ok(
          raster.reduce((n, r) => n + r.bytes, 0) < cog.length,
          'COG did not exercise progressive raster access'
        )
      }
      cleanup = await page.evaluate(async () => {
        await instance.unmount()
        await instance.unmount()
        return {
          canvas: document.querySelectorAll('canvas').length,
          cleanup: hooks.cleanup,
          ...resourceState()
        }
      })
      assert.equal(cleanup.canvas, 0)
      assert.equal(cleanup.cleanup, 2)
      if (name === 'cityjson-textured')
        assert.equal(cleanup.decodedBitmaps, 0, 'CityJSON decoded image was not released')
      assert.deepEqual(cleanup.instanceObjectUrls, [], 'Per-viewer Blob URLs were not released')
      assert.equal(cleanup.liveWorkers, 0, 'Per-viewer Workers were not terminated')
      assert.equal(
        cleanup.moduleObjectUrls,
        moduleResources.moduleUrls.length,
        'Module cache identity changed during viewer lifetime'
      )
      assert.deepEqual(errors, [])
      // Repeat in the same module graph: a warm render must not grow resources.
      await page.evaluate((args) => window.openDataset(args), {
        url: dataOrigin + '/' + path,
        filename: path.split('/').pop(),
        format,
        local,
        hostApi
      })
      await page.waitForFunction(
        () => {
          const r = instance.instance.renderer.info.render
          return r.triangles > 0 || r.points > 0
        },
        null,
        { timeout: 45000 }
      )
      const repeated = await page.evaluate(async () => {
        await instance.unmount()
        return {
          canvas: document.querySelectorAll('canvas').length,
          cleanup: hooks.cleanup,
          ...resourceState()
        }
      })
      assert.deepEqual(repeated, cleanup, 'Repeated mount/unmount changed retained resources')
      assert.deepEqual(errors, [], 'Repeated mount/unmount emitted a browser error')
      report.cases.push({
        name,
        status: 'passed',
        loaded,
        rendered,
        textureEvidence,
        cleanup,
        repeated,
        moduleResources,
        screenshotPngBase64: screenshot,
        requests,
        transfers
      })
    } catch (error) {
      report.cases.push({
        name,
        status: 'failed',
        failure: String(error),
        loaded,
        rendered,
        textureEvidence,
        cleanup,
        moduleResources,
        screenshotPngBase64: screenshot,
        errors,
        requests,
        transfers: serverRequests.slice(start),
        resources: await page.evaluate(() => window.resourceState?.()).catch(() => null)
      })
      await page.screenshot({ path: join(output, `${name}-failed.png`) }).catch(() => {})
    } finally {
      await page.close()
    }
  }
  if (report.cases.some((c) => c.status === 'failed'))
    throw new Error('Geo3D browser acceptance has failed dataset cases; see report.json')
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  throw error
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
  await Promise.all([new Promise((r) => server.close(r)), new Promise((r) => dataServer.close(r))])
}
console.log(
  `Geo3D browser acceptance passed: ${report.cases.length} dataset cases, self-hosted Workers/WASM, CORS ranges and teardown.`
)
