// Residual acceptance uses real installed public objects, not mocked renderers.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { createServer } from 'node:http'
import { respondGeo3dFixtureError, verifyGeo3dFixtureErrors } from './geo3d-fixture-http.mjs'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  browserOutput as output,
  copyGeo3dAssets,
  rendererFile,
  engineFile,
  runtimeGraphPlugin
} from './geo3d-browser-package.mjs'
import { elevationTiff, classifiedPnts } from './geo3d-residual-fixtures.mjs'
import { largerLas, largerElevationTiff } from './geo3d-memory-fixtures.mjs'
import { verifyMemoryCases } from './geo3d-memory-cases.mjs'
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..')
const work = join(output, 'residual-source'),
  site = join(output, 'residual-site'),
  fixtures = resolve(here, '../test/fixtures/geo3d')
const report = {
  status: 'running',
  cases: [],
  limitations: ['Fixed synthetic datasets; this is not a production-scale performance guarantee.']
}
let server, browser
const transfers = []
const generated = new Map([['elevation.tif', elevationTiff()]])
const pnts = classifiedPnts()
generated.set('classified.pnts', pnts.bytes)
generated.set('classified-tileset.json', pnts.tileset)
generated.set(
  'memory-262144.las',
  largerLas(await readFile(join(fixtures, 'samples-mit/original-deliveries/terrain-4096.las')))
)
generated.set('memory-1048576.tif', largerElevationTiff())
report.generatedFixtures = [...generated].map(([name, bytes]) => ({
  name,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex')
}))
for (const [name, bytes] of generated) {
  await mkdir(join(output, 'generated'), { recursive: true })
  await writeFile(join(output, 'generated', name), bytes)
}
await mkdir(work, { recursive: true })
const peerRoot = dirname(dirname(createRequire(engineFile('core/Instance.js')).resolve('three')))
const threeMeta = JSON.parse(await readFile(join(peerRoot, 'package.json'), 'utf8'))
const three = join(peerRoot, threeMeta.exports['.'].import)
// Count actual screenshot pixels, not fixture colors or shader uniform values.
function classificationPixels(png) {
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20),
    channels = png[25] === 6 ? 4 : png[25] === 2 ? 3 : 0
  assert.equal(png[24], 8)
  assert.ok(channels)
  assert.equal(png[28], 0)
  const chunks = []
  for (let p = 8; p + 12 <= png.length;) {
    const n = png.readUInt32BE(p)
    if (png.toString('ascii', p + 4, p + 8) === 'IDAT') chunks.push(png.subarray(p + 8, p + 8 + n))
    p += n + 12
  }
  const stride = width * channels,
    raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height })
  assert.equal(raw.length, (stride + 1) * height)
  let previous = Buffer.alloc(stride),
    red = 0,
    green = 0
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
      if (r > 100 && r > g + 50 && r > b + 50) red++
      if (g > 100 && g > r + 50 && g > b + 50) green++
    }
    previous = row
  }
  return { red, green, width, height }
}
const imports = {
  Instance: 'core/Instance.js',
  PointCloud: 'entities/PointCloud.js',
  Map: 'entities/Map.js',
  Tiles3D: 'entities/Tiles3D.js',
  CRS: 'core/geographic/CoordinateSystem.js',
  Coordinates: 'core/geographic/Coordinates.js',
  ElevationLayer: 'core/layer/ElevationLayer.js'
}
try {
  await writeFile(
    join(work, 'index.html'),
    '<!doctype html><meta charset="utf-8"><style>html,body,#viewer{margin:0;width:100%;height:100%}</style><div id="viewer"></div><script type="module" src="./main.js"></script>'
  )
  await writeFile(
    join(work, 'main.js'),
    `
import {renderFileViewerGeo3d} from ${JSON.stringify(rendererFile('dist/geo3d.js'))};
const workers=new Set(),urls=new Set(),bitmaps=new Set();let viewer,context,moduleUrls;
const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);workers.add(this)}terminate(){workers.delete(this);super.terminate()}};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=b=>{const u=create(b);urls.add(u);return u};URL.revokeObjectURL=u=>{urls.delete(u);revoke(u)};
const bitmap=window.createImageBitmap.bind(window);window.createImageBitmap=async(...args)=>{const b=await bitmap(...args),close=b.close.bind(b);bitmaps.add(b);b.close=()=>{bitmaps.delete(b);close()};return b};
const engine={};
window.prepare=async()=>{${Object.entries(imports)
      .map(
        ([name, path]) =>
          `engine.${name}=(await import(${JSON.stringify(engineFile(path))})).default;`
      )
      .join('\n')}
engine.three=await import(${JSON.stringify(three)});engine.mode=(await import(${JSON.stringify(engineFile('renderer/PointCloudMaterial.js'))})).MODE;engine.cache=(await import(${JSON.stringify(engineFile('core/Cache.js'))})).GlobalCache;
moduleUrls=new Set(urls);return api.resources()};
const diagnostics=[];
function inspectPnts(c){
 const seen=new WeakSet(),renderer=c.instance.renderer,canvas=renderer.domElement;
 const record=value=>{diagnostics.push(value);console.log('GEO3D_PNTS_DIAGNOSTIC '+JSON.stringify(value))};
 const lost=event=>record({phase:'context-lost',message:event.statusMessage});
 canvas.addEventListener('webglcontextlost',lost);
 const inspect=()=>c.entity.object3d.traverse(object=>{
  if(!object.isPoints||seen.has(object))return;seen.add(object);
  const material=object.material,camera=c.instance.view.camera,gl=renderer.getContext();
  record({phase:'before-first-draw',attributes:Object.fromEntries(Object.entries(object.geometry.attributes).map(([name,a])=>[name,{type:a.array.constructor.name,count:a.count,itemSize:a.itemSize,normalized:a.normalized,gpuType:a.gpuType,first:Array.from(a.array.slice(0,6))}])),defines:material.defines,size:material.size,mode:material.mode,drawRange:object.geometry.drawRange,matrix:object.matrixWorld.toArray(),camera:{position:camera.position.toArray(),near:camera.near,far:camera.far,projection:camera.projectionMatrix.toArray()},glVersion:gl.getParameter(gl.VERSION),maxAttributes:gl.getParameter(gl.MAX_VERTEX_ATTRIBS),classification:material.attributesState?.classifications?.map(slot=>({weight:slot.weight,count:slot.classifications?.length}))});
 });
 c.instance.addEventListener('before-render',inspect);
 return()=>{c.instance.removeEventListener('before-render',inspect);canvas.removeEventListener('webglcontextlost',lost)};
}
window.api={
 diagnostics(){return diagnostics},
 resources(){return {workers:workers.size,urls:[...urls].filter(u=>!moduleUrls?.has(u)),bitmaps:bitmaps.size,canvas:document.querySelectorAll('canvas').length}},
 async open({format,file,crs}){let hookCount=0;try{viewer=await renderFileViewerGeo3d(new ArrayBuffer(0),document.getElementById('viewer'),format,{filename:file,streamUrl:location.origin+'/datasets/'+file},{assetBaseUrl:'/nested/assets/geo3d/',giro3d:{instance:{crs},view:{controls:false},sources:{copc:{enableWorkers:true,pointSize:5},las:{enableWorkers:true,pointSize:5},geotiff:{enableWorkers:true},cog:{enableWorkers:true}}},configureInstance(){hookCount++},configure(c){context=c;const stop=c.format==='3d-tiles'?inspectPnts(c):undefined;return()=>{stop?.();context=undefined}}});return {ok:true,hookCount,scene:viewer.instance.coordinateSystem.id}}catch(error){return {ok:false,hookCount,error:String(error),resources:this.resources()}}},
 state(){if(viewer?.instance.renderer.getContext().isContextLost())throw new Error('WebGL context lost');return viewer?{loading:viewer.instance.loading,render:{...viewer.instance.renderer.info.render}}:null},
 measure(){return {pointCount:context.metadata?.pointCount,extent:{width:context.metadata?.width,height:context.metadata?.height},resources:this.resources()}},
 async close(){if(viewer){const current=viewer;viewer=undefined;const a=current.unmount(),b=current.unmount();if(a!==b)throw new Error('Unmount Promise identity changed');await a}context=undefined;return this.resources()},
 bounds(){const box=viewer.entity.getBoundingBox();return {min:box.min.toArray(),max:box.max.toArray(),native:context.metadata?.crs?.id??context.metadata?.crs}},
 async addElevation(){
   const source=context.nativeSource,map=context.entity;
   const images=source.getImages({id:'nodata-proof',extent:source.getExtent(),width:128,height:128,signal:context.signal});
   let transparent=0,valid=0,length=0;
   for(const image of images){const result=await image.request();const data=result.texture.image.data;length+=data.length;for(let i=0;i<data.length;i+=2){if(data[i+1]===0)transparent++;else if(data[i]===100)valid++}result.texture.dispose()}
   // addLayer transfers layer lifetime to this map; no host-side source dispose.
   const layer=new engine.ElevationLayer({name:'host-elevation',source,minmax:{min:100,max:100}});await map.addLayer(layer);viewer.fitToDataset();viewer.instance.notifyChange(map);
   return {transparent,valid,length,sourcePreserved:layer.source===context.nativeSource};
 },
 elevations(){const source=context.nativeSource,map=context.entity;return [map.getElevation({coordinates:new engine.Coordinates(source.getCrs(),500064,5100064)}),map.getElevation({coordinates:new engine.Coordinates(source.getCrs(),500016,5100112)})].map(r=>r.samples.map(s=>({elevation:s.elevation,resolution:s.resolution})))},
 async classify(hide=false){
   const entity=context.entity,camera=viewer.instance.view.camera;
   camera.position.set(15.5,15.5,70);camera.up.set(0,1,0);camera.lookAt(15.5,15.5,0);
   entity.pointSize=12;entity.pointCloudMode=engine.mode.CLASSIFICATION;
   entity.pointCloudClassifications[2].color.setRGB(1,0,0);
   entity.pointCloudClassifications[5].color.setRGB(0,1,0);
   entity.pointCloudClassifications[2].visible=true;
   entity.pointCloudClassifications[5].visible=!hide;
   await new Promise(resolve=>{const done=()=>{viewer.instance.removeEventListener('after-render',done);resolve()};viewer.instance.addEventListener('after-render',done);viewer.instance.notifyChange([entity,camera])});
   if(viewer.instance.renderer.getContext().isContextLost())throw new Error('WebGL context lost while styling PNTS');
   return {mode:entity.pointCloudMode,class2:entity.pointCloudClassifications[2].visible,class5:entity.pointCloudClassifications[5].visible};
 },
 cache(){return {count:engine.cache.count,size:engine.cache.size,capacity:engine.cache.capacity,maxSize:engine.cache.maxSize}},
};window.entryReady=true;
`
  )
  const { build } = await import(
    pathToFileURL(createRequire(join(root, 'apps/viewer-demo/package.json')).resolve('vite')).href
  )
  await build({
    configFile: false,
    root: work,
    base: '/nested/app/',
    logLevel: 'warn',
    plugins: [runtimeGraphPlugin('residual')],
    build: { outDir: site, emptyOutDir: true, target: 'es2022' }
  })
  await copyGeo3dAssets(join(site, 'vendor'))
  server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://local.invalid').pathname)
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'"
      )
      res.setHeader('Cache-Control', 'no-store')
      if (path === '/favicon.ico') {
        res.writeHead(204).end()
        return
      }
      let directory, relative
      if (path.startsWith('/datasets/')) {
        directory = fixtures
        relative = path.slice(10)
      } else if (path.startsWith('/nested/assets/geo3d/')) {
        directory = join(site, 'vendor')
        relative = path.slice('/nested/assets/geo3d/'.length)
      } else if (path.startsWith('/nested/app/')) {
        directory = site
        relative = path.slice(12) || 'index.html'
      } else {
        res.writeHead(404).end()
        return
      }
      const file = resolve(directory, relative)
      if (!file.startsWith(directory + sep)) {
        res.writeHead(403).end()
        return
      }
      const bytes =
          path.startsWith('/datasets/') && generated.has(relative)
            ? generated.get(relative)
            : await readFile(file),
        mime =
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.wasm': 'application/wasm',
            '.png': 'image/png',
            '.pnts': 'application/octet-stream'
          }[extname(file)] || 'application/octet-stream'
      let begin = 0,
        end = bytes.length,
        status = 200
      if (req.headers.range) {
        const m = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range)
        if (!m) {
          res.writeHead(416).end()
          return
        }
        begin = Number(m[1])
        end = Math.min(bytes.length, Number(m[2]) + 1)
        if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin >= end) {
          res.writeHead(416).end()
          return
        }
        status = 206
        res.setHeader('Content-Range', `bytes ${begin}-${end - 1}/${bytes.length}`)
      }
      transfers.push({ path, status, bytes: end - begin })
      res.writeHead(status, {
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - begin
      })
      res.end(bytes.subarray(begin, end))
    } catch {
      respondGeo3dFixtureError(res)
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const { chromium } = createRequire(join(root, 'package.json'))('playwright')
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]
  })
  report.fixtureErrors = await verifyGeo3dFixtureErrors(browser, origin)
  for (const format of ['copc', 'las', 'laz']) {
    const file =
      format === 'copc'
        ? 'samples-mit/original-deliveries/streaming-16384.copc.laz'
        : 'samples-mit/terrain.' + format
    for (const mismatch of [false, true]) {
      const name = `crs-${format}-${mismatch ? 'mismatch' : 'native'}`,
        page = await browser.newPage({ viewport: { width: 640, height: 480 } }),
        errors = [],
        result = { name, status: 'running' }
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      await page.route('**/*', (route) => {
        const u = route.request().url()
        if (u.startsWith(origin + '/') || u.startsWith('blob:') || u.startsWith('data:'))
          return route.continue()
        errors.push('External request ' + u)
        return route.abort()
      })
      try {
        await page.goto(origin + '/nested/app/')
        await page.waitForFunction(() => window.entryReady)
        const baseline = await page.evaluate(() => window.prepare())
        const opened = await page.evaluate((args) => api.open(args), {
          format,
          file,
          crs: mismatch ? 'EPSG:3857' : 'EPSG:32632'
        })
        result.opened = opened
        if (mismatch) {
          assert.equal(opened.ok, false, 'Incompatible point-cloud CRS was silently accepted')
          assert.match(opened.error, /Point.cloud.*CRS|point.cloud.*CRS/)
          assert.equal(opened.hookCount, 0)
        } else {
          assert.equal(opened.ok, true, opened.error)
          await page.waitForFunction(
            () => {
              const s = api.state()
              return s && !s.loading && s.render.points > 0
            },
            null,
            { timeout: 45000 }
          )
          assert.equal(opened.scene, 'EPSG:32632')
          result.bounds = await page.evaluate(() => api.bounds())
          assert.ok(result.bounds.min[0] > 400000 && result.bounds.min[0] < 600000)
          await page.screenshot({ path: join(output, name + '.png') })
        }
        result.cleanup = await page.evaluate(() => api.close())
        assert.deepEqual(result.cleanup, baseline)
        assert.deepEqual(errors, [])
        result.status = 'passed'
      } catch (error) {
        result.status = 'failed'
        result.failure = String(error)
        await page.evaluate(() => api.close()).catch(() => {})
        throw error
      } finally {
        result.errors = errors
        report.cases.push(result)
        console.log('GEO3D_RESIDUAL_CASE', JSON.stringify(result))
        await page.close()
      }
    }
  }
  await verifyMemoryCases({ browser, origin, output, report, transfers })
  for (const item of [
    { name: 'elevation-nodata', format: 'geotiff', file: 'elevation.tif' },
    { name: 'pnts-classification', format: '3d-tiles', file: 'classified-tileset.json' }
  ]) {
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } }),
      errors = [],
      result = { name: item.name, status: 'running' }
    page.setDefaultTimeout(45000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.route('**/*', (route) => {
      const u = route.request().url()
      if (u.startsWith(origin + '/') || u.startsWith('blob:') || u.startsWith('data:'))
        return route.continue()
      errors.push('External request ' + u)
      return route.abort()
    })
    try {
      await page.goto(origin + '/nested/app/')
      await page.waitForFunction(() => window.entryReady)
      const baseline = await page.evaluate(() => window.prepare())
      const opened = await page.evaluate((args) => api.open(args), { ...item, crs: 'EPSG:32632' })
      assert.equal(opened.ok, true, opened.error)
      await page.waitForFunction(
        () => {
          const s = api.state()
          return s && !s.loading && (s.render.points > 0 || s.render.triangles > 0)
        },
        null,
        { timeout: 45000 }
      )
      if (item.format === 'geotiff') {
        result.texture = await page.evaluate(() => api.addElevation())
        assert.ok(result.texture.transparent === 1024 && result.texture.valid === 15360)
        assert.equal(result.texture.sourcePreserved, true)
        await page.waitForFunction(
          () =>
            !api.state().loading &&
            api.elevations()[0].some((s) => Math.abs(s.elevation - 100) < 1),
          null,
          { timeout: 45000 }
        )
        result.elevations = await page.evaluate(() => api.elevations())
        assert.deepEqual(result.elevations[1], [], 'No-data must not become a false terrain height')
        await page.screenshot({ path: join(output, 'elevation-nodata.png') })
      } else {
        result.classification = []
        for (const [label, hide] of [
          ['both', false],
          ['hidden', true],
          ['restored', false]
        ]) {
          const state = await page.evaluate((hide) => api.classify(hide), hide)
          const pixels = classificationPixels(
            await page.screenshot({ path: join(output, `pnts-${label}.png`) })
          )
          assert.ok(pixels.red > 100, 'Class 2 was not visibly rendered red')
          if (hide) assert.equal(pixels.green, 0, 'Hidden class 5 is still visible')
          else assert.ok(pixels.green > 100, 'Class 5 was not visibly rendered green')
          result.classification.push({ label, state, pixels })
        }
      }
      result.cleanup = await page.evaluate(() => api.close())
      assert.deepEqual(result.cleanup, baseline)
      assert.deepEqual(errors, [])
      result.status = 'passed'
    } catch (error) {
      result.status = 'failed'
      result.failure = String(error)
      result.diagnostics = await page.evaluate(() => api.diagnostics()).catch(() => [])
      await page.screenshot({ path: join(output, item.name + '-failed.png') }).catch(() => {})
      throw error
    } finally {
      result.errors = errors
      report.cases.push(result)
      console.log('GEO3D_RESIDUAL_CASE', JSON.stringify(result))
      await page.close()
    }
  }
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  throw error
} finally {
  await writeFile(join(output, 'residual-report.json'), JSON.stringify(report, null, 2) + '\n')
  let combined
  try {
    combined = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'))
  } catch {
    combined = {}
  }
  combined.residual = report
  if (report.status !== 'passed') combined.status = 'failed'
  await writeFile(join(output, 'report.json'), JSON.stringify(combined, null, 2) + '\n')
  await browser?.close()
  if (server) {
    server.closeAllConnections()
    await new Promise((r) => server.close(r))
  }
}
