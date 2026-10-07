// Exercise the public objects obtained from application hooks, with real engine
// rendering. The same file runs against physical installed consumer bytes.
import assert from 'node:assert/strict'
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

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..')
const fixtures = resolve(here, '../test/fixtures/geo3d'),
  work = join(output, 'advanced-source'),
  site = join(output, 'advanced-site'),
  vendor = join(site, 'vendor')
const report = {
  status: 'running',
  cases: [],
  notRun: [],
  limitations: [
    'These are public API and rendering regressions on fixed synthetic fixtures, not production-scale performance or heap/cache benchmarks.',
    'The Tiles3D sample is a mesh tileset. Its point styling accessors are exercised, but PNTS classification/color output is not visually certified.',
    'No-data and elevation constructor contracts are type-checked separately; these RGB raster cases do not certify an elevation dataset.'
  ]
}
const cases = [
  {
    name: 'advanced-copc',
    format: 'copc',
    file: 'samples-mit/original-deliveries/streaming-16384.copc.laz',
    actions: ['point-style', 'point-intensity', 'point-classification', 'point-filter']
  },
  {
    name: 'advanced-las',
    format: 'las',
    file: 'samples-mit/terrain.las',
    actions: ['point-style', 'point-intensity', 'point-classification', 'point-filter']
  },
  {
    name: 'advanced-cog',
    format: 'cog',
    file: 'streaming.cog',
    actions: ['raster-channels', 'raster-layer-cycle']
  },
  {
    name: 'advanced-tiles',
    format: '3d-tiles',
    file: 'samples-mit/tiles3d/tileset.json',
    actions: ['tiles-style']
  }
]
let server, browser
const requests = []
async function ready(page) {
  await page.waitForFunction(
    () => {
      const state = window.concurrent.state('A')
      if (state?.status === 'rejected') throw new Error(JSON.stringify(state.error))
      return (
        state?.status === 'fulfilled' &&
        state.canvas === 1 &&
        !state.loading &&
        (state.render?.points > 0 || state.render?.triangles > 0)
      )
    },
    null,
    { timeout: 45000 }
  )
}
async function redraw(page) {
  const frame = await page.evaluate(() => window.concurrent.notify('A'))
  await page.waitForFunction((frame) => window.concurrent.state('A').render.frame > frame, frame, {
    timeout: 45000
  })
  await ready(page)
}
try {
  await mkdir(work, { recursive: true })
  const { build } = await import(
    pathToFileURL(createRequire(join(root, 'apps/viewer-demo/package.json')).resolve('vite')).href
  )
  // Resolve the same installed peer as Giro3D, but honor its browser ESM export.
  // require.resolve('three') selects the CJS shim; importing that shim into the
  // browser graph can generate invalid named exports before any test executes.
  const peerRequire = createRequire(engineFile('core/Instance.js'))
  const threeRoot = resolve(dirname(peerRequire.resolve('three/src/Three.js')), '..')
  const threePackage = JSON.parse(await readFile(join(threeRoot, 'package.json'), 'utf8'))
  assert.equal(threePackage.name, 'three')
  assert.equal(typeof threePackage.exports?.['.']?.import, 'string')
  const peerThree = resolve(threeRoot, threePackage.exports['.'].import)
  assert.ok(
    peerThree.startsWith(threeRoot + sep) && !peerThree.endsWith('.cjs'),
    'Expected the installed Three.js ESM entry'
  )
  await writeFile(
    join(work, 'index.html'),
    '<!doctype html><meta charset="utf-8"><title>Geo3D public hook API</title><style>html,body{margin:0;width:100%;height:100%}</style><script type="module" src="./main.js"></script>'
  )
  await writeFile(
    join(work, 'main.js'),
    `
import {renderFileViewerGeo3d} from ${JSON.stringify(rendererFile('dist/geo3d.js'))};
import {installConcurrentViewerHarness} from ${JSON.stringify(join(here, 'geo3d-concurrent-client.mjs'))};
const contexts=new Map(), viewers=new Map(), before=new Map();
let engine;
const check=(value,message)=>{if(!value)throw new Error(message)};
installConcurrentViewerHarness((buffer,target,format,context,options)=>{
  const pre=options.configureInstance,post=options.configure;
  return renderFileViewerGeo3d(buffer,target,format,context,{
    ...options,
    giro3d:{...options.giro3d,sources:{...options.giro3d.sources,
      copc:{...options.giro3d.sources.copc,pointSize:0},las:{...options.giro3d.sources.las,pointSize:0}}},
    async configureInstance(c){
      before.set(target.id,c.instance);
      const release=await pre(c);
      return ()=>{before.delete(target.id);return release?.()};
    },
    async configure(c){
      check(c.instance===before.get(target.id),'Pre/post Instance identity changed');
      contexts.set(target.id,c);
      const release=await post(c);
      return ()=>{contexts.delete(target.id);viewers.delete(target.id);return release?.()};
    },
  }).then(viewer=>{viewers.set(target.id,viewer);return viewer});
});
window.prepareEngine=async()=>{
  const [instance,points,map,tiles,layer,three]=await Promise.all([
    import(${JSON.stringify(engineFile('core/Instance.js'))}),
    import(${JSON.stringify(engineFile('entities/PointCloud.js'))}),
    import(${JSON.stringify(engineFile('entities/Map.js'))}),
    import(${JSON.stringify(engineFile('entities/Tiles3D.js'))}),
    import(${JSON.stringify(engineFile('core/layer/ColorLayer.js'))}),
    import(${JSON.stringify(peerThree)}),
  ]);
  engine={Instance:instance.default,PointCloud:points.default,Map:map.default,Tiles3D:tiles.default,ColorLayer:layer.default,...three};
  return window.concurrent.freezeModuleState();
};
const current=()=>{const c=contexts.get('viewer-A');check(c&&!c.signal.aborted,'No live public hook context');return c};
window.api={
  inspect(){
    const c=current(),v=viewers.get('viewer-A');
    check(c.instance instanceof engine.Instance,'Hook does not expose the installed Instance');
    check(c.instance===v.instance&&c.entity===v.entity,'Returned viewer lost engine identity');
    check(c.nativeSource===v.nativeSource&&c.colorLayer===v.colorLayer,'Returned native references differ');
    check(c.source!==c.nativeSource,'Dataset descriptor was replaced by a native source');
    check(c.instance.getEntities().includes(c.entity),'Initial entity is not in the Instance');
    check(c.instance.view.camera.isCamera,'Public camera is unavailable');
    const memory=c.instance.getMemoryUsage();
    check(memory&&typeof memory==='object','Public memory inspection failed');
    if(c.format==='copc'||c.format==='las'){
      check(c.entity instanceof engine.PointCloud,'PointCloud class identity changed');
      check(c.entity.source===c.nativeSource,'Point source identity changed');
      check(c.entity.pointSize===0,'Explicit automatic pointSize was rejected or rewritten');
      check(c.nativeSource.type===(c.format==='copc'?'COPCSource':'LASSource'),'Wrong native point source');
      check(c.colorLayer===null,'Point context has an unexpected raster layer');
    }else if(c.format==='cog'){
      check(c.entity instanceof engine.Map,'Map class identity changed');
      check(c.colorLayer instanceof engine.ColorLayer,'ColorLayer class identity changed');
      check(c.colorLayer.source===c.nativeSource,'Raster source identity changed');
      check(c.nativeSource.isGeoTIFFSource,'Wrong native raster source');
      check(c.entity.getLayers().includes(c.colorLayer),'Initial color layer is unavailable');
    }else{
      check(c.entity instanceof engine.Tiles3D,'Tiles3D class identity changed');
      check(c.nativeSource===null&&c.colorLayer===null,'Tiles context has invented source/layer objects');
    }
    return {format:c.format,sourceType:c.nativeSource?.type??null,loading:c.instance.loading,progress:c.instance.progress,memoryObserved:true};
  },
  async exercise(action){
    const c=current(),e=c.entity;
    let result;
    if(action==='point-style'){
      e.pointSize=4;e.subdivisionThreshold=2;e.pointBudget=5000;
      check(e.pointBudget===5000,'Point budget setter failed');
      e.pointBudget=null;e.decimation=2;e.opacity=0.8;
      e.brightness=0;e.contrast=1;e.saturation=0.9;
      e.clippingPlanes=[new engine.Plane(new engine.Vector3(1,0,0),1e12)];
      c.instance.renderer.localClippingEnabled=true;
      check(e.decimation===2&&e.clippingPlanes.length===1,'Point display settings were lost');
      result={pointSize:e.pointSize,subdivisionThreshold:e.subdivisionThreshold,decimation:e.decimation,opacity:e.opacity,clippingPlanes:e.clippingPlanes.length};
    }else if(action==='point-intensity'){
      const attributes=e.getSupportedAttributes().map(a=>a.name);
      check(attributes.includes('Intensity'),'Fixture does not expose Intensity');
      e.setColoringMode('attribute');e.setActiveAttribute('Intensity');
      const map=e.getAttributeColorMap('Intensity');map.min=0;map.max=65535;
      e.setAttributeColorMap('Intensity',map);
      check(e.getAttributeColorMap('Intensity')===map,'Attribute colormap identity changed');
      result={attributes,active:e.getActiveAttributes().map(a=>a.name),colorMap:{min:map.min,max:map.max}};
    }else if(action==='point-classification'){
      check(e.getSupportedAttributes().some(a=>a.name==='Classification'),'Fixture does not expose Classification');
      e.setActiveAttribute('Classification');
      const classes=e.getAttributeClassifications('Classification');
      check(classes.length===256,'Classification table is unavailable');
      classes[2].visible=true;classes[2].color.setRGB(0.2,0.8,0.3);
      result={classifications:classes.length,groundVisible:classes[2].visible};
    }else if(action==='point-filter'){
      c.nativeSource.filters=[{dimension:'Intensity',operator:'greaterequal',value:0}];
      check(c.nativeSource.filters.length===1,'Native source filters were not applied');
      result={filters:c.nativeSource.filters.map(f=>({...f})),ready:c.nativeSource.ready};
    }else if(action==='raster-channels'){
      c.nativeSource.channels=[2,1,0];c.colorLayer.opacity=0.7;
      c.colorLayer.brightness=0.1;c.colorLayer.contrast=1.1;c.colorLayer.saturation=0.8;
      e.clippingPlanes=[new engine.Plane(new engine.Vector3(1,0,0),1e12)];
      c.instance.renderer.localClippingEnabled=true;
      check(JSON.stringify(c.nativeSource.channels)==='[2,1,0]','Native raster channel setter failed');
      result={channels:[...c.nativeSource.channels],opacity:c.colorLayer.opacity,brightness:c.colorLayer.brightness,contrast:c.colorLayer.contrast,saturation:c.colorLayer.saturation,crs:c.nativeSource.getCrs().id};
    }else if(action==='raster-layer-cycle'){
      const count=e.getLayers().length;
      // Temporarily detach and reattach the owned layer; never dispose its source.
      check(e.removeLayer(c.colorLayer,{disposeLayer:false}),'Layer removal failed');
      check(!e.getLayers().includes(c.colorLayer),'Layer remained attached');
      await e.addLayer(c.colorLayer);
      check(e.getLayers().length===count&&e.getLayers().includes(c.colorLayer),'Layer reattachment failed');
      check(c.colorLayer.source===c.nativeSource,'Layer cycle replaced the owned source');
      result={layerCount:e.getLayers().length,sourcePreserved:true};
    }else if(action==='tiles-style'){
      e.errorTarget=8;e.pointSize=3;e.opacity=0.8;
      e.pointCloudColor='#88aacc';e.pointCloudMode=e.pointCloudMode;
      e.pointCloudColorimetryOptions={brightness:0,contrast:1,saturation:1};
      check(e.pointCloudClassifications.length>=3,'Tiles classification API is unavailable');
      e.pointCloudClassifications[2].visible=true;
      e.clippingPlanes=[new engine.Plane(new engine.Vector3(1,0,0),1e12)];
      check(e.tiles&&Array.isArray(e.getLayers()),'Tiles/layer public API is unavailable');
      result={errorTarget:e.errorTarget,pointSize:e.pointSize,opacity:e.opacity,classifications:e.pointCloudClassifications.length,pointStylingVisualCheck:false};
    }else throw new Error('Unknown API action '+action);
    c.instance.notifyChange(e);
    return result;
  },
  camera(){return current().instance.view.camera.quaternion.toArray()},
  fit(){current().fitToDataset()},
  async pick(){
    const c=current(),rect=document.getElementById('viewer-A').getBoundingClientRect();
    let hits=0,calls=0;
    for(const x of [0.25,0.5,0.75])for(const y of [0.25,0.5,0.75]){
      const event=new MouseEvent('click',{clientX:rect.left+rect.width*x,clientY:rect.top+rect.height*y});
      const result=await c.instance.pickObjectsAt(event,{radius:8,limit:1});
      check(Array.isArray(result),'Picking did not return an array');calls++;hits+=result.length;
    }
    check(hits>0,'Public picking produced no hit on the displayed fixture');
    return {calls,hits};
  },
  retainedContexts(){return contexts.size+viewers.size+before.size},
};
window.entryReady=true;
`
  )
  await build({
    configFile: false,
    root: work,
    base: '/nested/app/',
    logLevel: 'warn',
    plugins: [runtimeGraphPlugin('advanced')],
    build: { outDir: site, emptyOutDir: true, target: 'es2022' }
  })
  await copyGeo3dAssets(vendor)
  const cog = await readFile(join(output, 'streaming-generated.cog.tif'))
  server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://local.invalid').pathname)
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'"
      )
      if (path === '/favicon.ico') {
        res.writeHead(204).end()
        return
      }
      let directory, relative
      if (path.startsWith('/datasets/')) {
        directory = fixtures
        relative = path.slice('/datasets/'.length)
      } else if (path.startsWith('/nested/assets/geo3d/')) {
        directory = vendor
        relative = path.slice('/nested/assets/geo3d/'.length)
      } else if (path.startsWith('/nested/app/')) {
        directory = site
        relative = path.slice('/nested/app/'.length) || 'index.html'
      } else {
        res.writeHead(404).end()
        return
      }
      const file = resolve(directory, relative)
      if (!file.startsWith(directory + sep)) {
        res.writeHead(403).end()
        return
      }
      const bytes = path === '/datasets/streaming.cog' ? cog : await readFile(file)
      const mime =
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.json': 'application/json',
          '.gltf': 'model/gltf+json',
          '.glb': 'model/gltf-binary',
          '.png': 'image/png',
          '.wasm': 'application/wasm'
        }[extname(file)] || 'application/octet-stream'
      let begin = 0,
        end = bytes.length,
        status = 200
      res.setHeader('Accept-Ranges', 'bytes')
      if (req.headers.range) {
        const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range)
        if (
          !range ||
          !Number.isSafeInteger(Number(range[1])) ||
          !Number.isSafeInteger(Number(range[2]))
        ) {
          res.writeHead(416).end()
          return
        }
        begin = Number(range[1])
        end = Math.min(end, Number(range[2]) + 1)
        if (begin >= end) {
          res.writeHead(416).end()
          return
        }
        status = 206
        res.setHeader('Content-Range', `bytes ${begin}-${end - 1}/${bytes.length}`)
      }
      requests.push({ path, status, bytes: req.method === 'HEAD' ? 0 : end - begin })
      res.writeHead(status, { 'Content-Type': mime, 'Content-Length': end - begin })
      res.end(req.method === 'HEAD' ? undefined : bytes.subarray(begin, end))
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
  for (const [index, item] of cases.entries()) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } }),
      errors = [],
      start = requests.length
    const result = { name: item.name, status: 'running', cycles: [] }
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:'))
        return route.continue()
      errors.push('External request: ' + url)
      return route.abort()
    })
    try {
      await page.goto(origin + '/nested/app/')
      await page.waitForFunction(() => window.entryReady === true)
      const baseline = await page.evaluate(() => window.prepareEngine())
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.evaluate((args) => window.concurrent.start(args), {
          id: 'A',
          format: item.format,
          url: origin + '/datasets/' + item.file + '?cycle=' + cycle,
          controls: true
        })
        await ready(page)
        const inspection = await page.evaluate(() => window.api.inspect()),
          actions = []
        for (const action of item.actions) {
          actions.push({
            action,
            result: await page.evaluate((action) => window.api.exercise(action), action)
          })
          await redraw(page)
          await page.screenshot({ path: join(output, `${item.name}-${cycle}-${action}.png`) })
        }
        const camera = await page.evaluate(() => window.api.camera())
        await page.mouse.move(200, 160)
        await page.mouse.down()
        await page.mouse.move(245, 185, { steps: 8 })
        await page.mouse.up()
        await page.waitForFunction(
          (previous) =>
            window.api.camera().some((value, i) => Math.abs(value - previous[i]) > 1e-6),
          camera,
          { timeout: 5000 }
        )
        const moved = await page.evaluate(() => window.api.camera())
        await page.evaluate(() => window.api.fit())
        await redraw(page)
        const picking = await page.evaluate(() => window.api.pick())
        const stopped = await page.evaluate(() => window.concurrent.stop('A'))
        assert.equal(stopped.sameUnmountPromise, true)
        assert.deepEqual(stopped.cleanup, ['configure', 'instance'])
        assert.deepEqual(stopped.extensionErrors, [])
        assert.equal(await page.evaluate(() => window.api.retainedContexts()), 0)
        const resources = await page.evaluate(() => window.concurrent.resources())
        assert.deepEqual(resources, baseline)
        assert.deepEqual(errors, [])
        result.cycles.push({
          inspection,
          actions,
          controls: { before: camera, after: moved },
          picking,
          resources
        })
      }
      if (item.format === 'copc' || item.format === 'cog') {
        const transfers = requests
          .slice(start)
          .filter((request) => request.path === '/datasets/' + item.file)
        assert.ok(
          transfers.length > 0 && transfers.every((request) => request.status === 206),
          'Public API exercise lost native range semantics'
        )
      }
      result.status = 'passed'
    } catch (error) {
      result.status = 'failed'
      result.failure = String(error)
      result.viewer = await page.evaluate(() => window.concurrent?.state('A')).catch(() => null)
      await page.screenshot({ path: join(output, `${item.name}-failed.png`) }).catch(() => {})
    } finally {
      result.errors = errors
      result.requestCount = requests.length - start
      report.cases.push(result)
      console.log('GEO3D_ADVANCED_CASE', JSON.stringify(result))
      await page.close()
    }
    if (result.status !== 'passed') {
      report.notRun = cases.slice(index + 1).map((value) => value.name)
      throw new Error('Geo3D public API browser check failed: ' + item.name)
    }
  }
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  throw error
} finally {
  try {
    const existing = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'))
    existing.advancedApi = report
    if (report.status !== 'passed') existing.status = 'failed'
    await writeFile(join(output, 'report.json'), JSON.stringify(existing, null, 2))
  } finally {
    await browser?.close()
    if (server) {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }
}
console.log(
  'Geo3D advanced API browser checks passed: four dataset families, two interactive cycles each, native source/layer identity, styling, picking and cleanup.'
)
