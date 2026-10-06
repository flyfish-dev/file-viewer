import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  browserOutput,
  copyGeo3dAssets,
  coreEntry,
  engineFile,
  rendererFile,
  repositoryRoot,
  runtimeGraphPlugin
} from './geo3d-browser-package.mjs'

const output = join(browserOutput, 'host-integration')
const work = join(output, 'fixture')
const site = join(output, 'site')
await mkdir(work, { recursive: true })
const rootRequire = createRequire(join(repositoryRoot, 'package.json'))
const { chromium } = rootRequire('playwright')
const demoRequire = createRequire(join(repositoryRoot, 'apps/viewer-demo/package.json'))
const { build } = await import(pathToFileURL(demoRequire.resolve('vite')).href)
const engineImports = [
  'core/Instance.js',
  'controls/FirstPersonControls.js',
  'sources/COPCSource.js',
  'sources/LASSource.js',
  'sources/GeoTIFFSource.js',
  'entities/PointCloud.js',
  'entities/Tiles3D.js',
  'entities/Map.js',
  'core/layer/ColorLayer.js'
]
await writeFile(
  join(work, 'index.html'),
  '<!doctype html><meta charset="utf-8"><style>html,body{margin:0}#viewer{width:900px;height:650px}</style><div id="viewer"></div><script type="module" src="./main.js"></script>'
)
await writeFile(
  join(work, 'main.js'),
  `
import {createApp,h,nextTick,reactive} from 'vue'
import {FileViewer} from ${JSON.stringify(join(repositoryRoot, 'packages/components/vue3/dist/index.mjs'))}
import ${JSON.stringify(join(repositoryRoot, 'packages/components/vue3/dist/file-viewer3.css'))}
import {createViewer} from ${JSON.stringify(coreEntry)}
import {createGeo3dRenderer} from ${JSON.stringify(rendererFile('dist/geo3d.js'))}
window.errors=[];window.completed=[];window.hooks={before:0,after:0,cleanup:0}
window.liveWorkers=new Set();window.ownedUrls=new Set()
const NativeWorker=window.Worker,createUrl=URL.createObjectURL.bind(URL),revokeUrl=URL.revokeObjectURL.bind(URL)
window.Worker=class extends NativeWorker{constructor(...args){super(...args);liveWorkers.add(this)}terminate(){liveWorkers.delete(this);super.terminate()}}
URL.createObjectURL=blob=>{const url=createUrl(blob);ownedUrls.add(url);return url}
URL.revokeObjectURL=url=>{ownedUrls.delete(url);revokeUrl(url)}
await Promise.all(${JSON.stringify(engineImports.map(engineFile))}.map(path=>import(/* @vite-ignore */path)))
const moduleUrls=new Set(ownedUrls)
window.resources=()=>({workers:liveWorkers.size,instanceUrls:[...ownedUrls].filter(url=>!moduleUrls.has(url)),canvases:document.querySelectorAll('canvas').length})
const renderer=createGeo3dRenderer({assetBaseUrl:'/vendor/geo3d/',giro3d:{view:{controls:false},sources:{las:{enableWorkers:true,pointSize:5}}},
 configureInstance(){hooks.before++;return()=>hooks.cleanup++},
 configure(context){window.configured=context;hooks.after++;return()=>hooks.cleanup++}})
const options={autoRenderers:false,rendererMode:'replace',renderers:[renderer],locale:'en-US'}
window.mountVue=url=>{
 window.props=reactive({url,file:undefined,filename:'slow.tiff'})
 window.app=createApp({render:()=>h(FileViewer,{...props,options,onError:error=>errors.push(String(error)),onLoadComplete:context=>completed.push(context.filename)})})
 app.mount('#viewer')
}
window.replaceVueWithBlob=async()=>{
 const bytes=await(await fetch('/terrain.las')).arrayBuffer()
 props.url=undefined;props.filename='terrain.las';props.file=new Blob([bytes]);await nextTick()
}
window.destroyVue=async()=>{app.unmount();await nextTick()}
window.mountHeadless=url=>{
 window.viewer=createViewer(document.querySelector('#viewer'),{options})
 window.abortController=new AbortController()
 window.pendingStatus='pending'
 window.pending=viewer.load({url,filename:'slow.tiff'},{signal:abortController.signal}).then(result=>{pendingStatus=result===null?'canceled':'ready'},error=>{pendingStatus='error';errors.push(String(error))})
}
window.cancelHeadless=async()=>{abortController.abort();await pending;await viewer.destroy()}
window.entryReady=true
`
)
// Keep engine imports visible to the production bundler; @vite-ignore is used
// only as a template marker and removed together with the runtime path array.
let client = await readFile(join(work, 'main.js'), 'utf8')
client = client.replace(
  /await Promise\.all\([^\n]+\.map\(path=>import\(\/\* @vite-ignore \*\/path\)\)\)/,
  `await Promise.all([${engineImports.map((path) => `import(${JSON.stringify(engineFile(path))})`).join(',')}])`
)
await writeFile(join(work, 'main.js'), client)
await build({
  configFile: false,
  root: work,
  base: './',
  logLevel: 'warn',
  plugins: [runtimeGraphPlugin('host-integration')],
  build: { outDir: site, emptyOutDir: true, target: 'es2022' }
})
await copyGeo3dAssets(join(site, 'vendor/geo3d'))
const las = await readFile(rendererFile('test/fixtures/geo3d/samples-mit/terrain.las'))
const probes = new Map()
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://local').pathname
  if (/^\/slow-/.test(pathname)) {
    const probe = { pathname, range: request.headers.range, canceled: false }
    probes.set(pathname, probe)
    response.on('close', () => {
      probe.canceled = !response.writableEnded
    })
    // Deliberately hold the actual TIFF header request until its owner cancels.
    return
  }
  if (pathname === '/terrain.las')
    return response.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(las)
  const path = resolve(site, '.' + (pathname === '/' ? '/index.html' : pathname))
  if (!path.startsWith(site + sep)) return response.writeHead(403).end()
  try {
    const types = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.wasm': 'application/wasm'
    }
    response
      .writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' })
      .end(await readFile(path))
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
async function waitFor(predicate, message) {
  const deadline = Date.now() + 10000
  while (!predicate()) {
    assert.ok(Date.now() < deadline, message)
    await new Promise((r) => setTimeout(r, 20))
  }
}
const browser = await chromium.launch({ headless: true })
const report = { cases: [], status: 'in_progress' }
try {
  for (const name of [
    'vue-replace-probe-with-real-blob',
    'vue-destroy-during-probe',
    'headless-abort-during-probe'
  ]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
    const errors = [],
      externalRequests = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (url.startsWith(origin + '/') || /^(?:blob:|data:)/.test(url)) return route.continue()
      externalRequests.push(url)
      return route.abort()
    })
    const pathname = `/slow-${name}.tiff`
    try {
      await page.goto(origin)
      await page.waitForFunction(() => window.entryReady)
      await page.evaluate(
        ([url, headless]) => (headless ? window.mountHeadless(url) : window.mountVue(url)),
        [origin + pathname, name.startsWith('headless')]
      )
      await waitFor(
        () => probes.has(pathname),
        'The component did not make a real TIFF metadata request'
      )
      let rendered = null
      if (name.startsWith('headless')) {
        await page.evaluate(() => window.cancelHeadless())
        assert.equal(await page.evaluate(() => window.pendingStatus), 'canceled')
      } else if (name.includes('replace')) {
        await page.evaluate(() => window.replaceVueWithBlob())
        await page.waitForFunction(
          () =>
            window.configured?.instance.renderer.info.render.points > 0 &&
            window.completed.length === 1,
          null,
          { timeout: 45000 }
        )
        rendered = await page.evaluate(() => ({
          points: configured.instance.renderer.info.render.points,
          format: configured.format,
          blob: configured.source.file instanceof Blob
        }))
        assert.ok(rendered.points > 0)
        assert.equal(rendered.format, 'las')
        assert.equal(rendered.blob, true)
        await page.screenshot({ path: join(output, name + '.png') })
        await page.evaluate(() => window.destroyVue())
      } else {
        await page.evaluate(() => window.destroyVue())
        assert.deepEqual(await page.evaluate(() => window.completed), [])
      }
      await waitFor(
        () => probes.get(pathname).canceled,
        'Metadata request stayed live after its owner canceled'
      )
      await page.waitForFunction(
        () => window.resources().workers === 0 && window.resources().instanceUrls.length === 0
      )
      const resources = await page.evaluate(() => window.resources())
      assert.equal(resources.canvases, 0)
      assert.deepEqual(await page.evaluate(() => window.errors), [])
      assert.deepEqual(errors, [])
      assert.deepEqual(externalRequests, [])
      report.cases.push({
        name,
        status: 'passed',
        probe: probes.get(pathname),
        rendered,
        resources
      })
    } catch (error) {
      report.cases.push({
        name,
        status: 'failed',
        failure: String(error),
        errors,
        externalRequests,
        probe: probes.get(pathname)
      })
      throw error
    } finally {
      await page.close()
    }
  }
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  throw error
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  await browser.close()
  server.closeAllConnections()
  await new Promise((r) => server.close(r))
}
console.log(
  'Geo3D host integration passed: real Vue/core metadata cancellation, Blob LAS rendering and resource cleanup.'
)
