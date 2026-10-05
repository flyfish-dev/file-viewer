import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Native browser input tests. No renderer/codec substitutes and no HTTP origin.
// Module URLs are remapped, but the compiled production implementation is intact.
const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const output = resolve(process.env.GEO3D_NATIVE_BROWSER_OUTPUT || join(root, 'output/geo3d-native-browser'))
const require = createRequire(join(root, 'package.json'))
const { chromium } = require('playwright')
const names = ['geo3dRange', 'geo3dInspect', 'geo3dUrl', 'geo3dArchive', 'geo3dOwnedWorkerPool']
const modules = {}
for (const name of names) {
  let source = await readFile(resolve(here, '../dist', `${name}.js`), 'utf8')
  if (name !== 'geo3dRange') source = source.replace(/(['"])\.\/geo3dRange\.js\1/g, JSON.stringify(modules.geo3dRange))
  modules[name] = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
}
const fixtureNames = ['samples-mit/ordinary.tiff', 'samples-mit/geotiff-striped.tif',
  'samples-mit/imagery-overviews.cog.tif', 'samples-mit/streaming.copc.laz',
  'samples-mit/building-textured.city.json', 'samples-mit/tiles3d/tileset.json',
  'samples-mit/building-indexed.3tz', 'invalid-traversal.3tz', 'duplicate.3tz']
const fixtures = Object.fromEntries(await Promise.all(fixtureNames.map(async name =>
  [name, (await readFile(resolve(here, '../test/fixtures/geo3d', name))).toString('base64')])))
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<base href="https://geo3d.test/private/app/"><title>Geo3D native browser input checks</title>
<style>body{font:16px system-ui,sans-serif;max-width:1060px;margin:32px auto;padding:0 24px;line-height:1.5}h1{font-size:28px;margin-bottom:12px}li{padding:4px 0}#scope{border:2px solid;padding:14px}#status{font-size:20px}iframe{display:none}</style>
</head><body><h1>Geo3D · native browser input checks</h1>
<p id="scope"><strong>Diagnostic screenshot — NOT renderer output.</strong><br>
Real Chromium, production input helpers, native File/stream/Worker APIs. No Giro3D scene,
LAZ decompression, HTTP/CORS, WASM decoder or full deployment validation is exercised.</p>
<p id="status">Running…</p><p id="environment"></p><ol id="cases"></ol></body></html>`

async function runBrowserChecks({ modules, fixtures }) {
  const { resolveGeo3dSourceType, inspectGeoTiffBuffer } = await import(modules.geo3dInspect)
  const { createRangeGetter, readBoundedResponse, checkAbort } = await import(modules.geo3dRange)
  const { resolveGeo3dDatasetUrl } = await import(modules.geo3dUrl)
  const { inspect3tzCentralDirectory } = await import(modules.geo3dArchive)
  const { Geo3dOwnedWorkerPool } = await import(modules.geo3dOwnedWorkerPool)
  const cases = []
  const bytes = name => Uint8Array.from(atob(fixtures[name]), character => character.charCodeAt(0))
  const file = (name, filename = name.split('/').pop()) => new File([bytes(name)], filename)
  const equal = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) }
  const rejects = async (action, pattern) => {
    try { await action() } catch (error) { if (pattern.test(String(error))) return; throw error }
    throw new Error('Expected rejection')
  }
  const check = async (name, action) => {
    const start = performance.now()
    try { await action(); cases.push({ name, status: 'passed', ms: performance.now() - start }) }
    catch (error) { cases.push({ name, status: 'failed', error: String(error), ms: performance.now() - start }) }
    const result = cases.at(-1), line = document.createElement('li')
    line.textContent = `${result.status === 'passed' ? 'PASS' : 'FAIL'} — ${name}${result.error ? ': ' + result.error : ''}`
    document.querySelector('#cases').append(line)
  }
  await check('Native File slices preserve bytes without a whole-file read', async () => {
    const source = file('samples-mit/streaming.copc.laz')
    source.arrayBuffer = () => { throw new Error('Whole-file read attempted') }
    const get = createRangeGetter({ file: source })
    equal(Array.from(await get(13, 90)), Array.from(bytes('samples-mit/streaming.copc.laz').slice(13, 90)))
    equal((await get(source.size - 2, source.size + 10)).length, 2)
  })
  await check('Invalid ranges fail before reading a native File', async () => {
    const source = new File([new Uint8Array(32)], 'local.bin')
    source.slice = () => { throw new Error('Invalid range reached the File API') }
    const get = createRangeGetter({ file: source })
    await rejects(() => get(-1, 8), /Invalid bounded range/)
    await rejects(() => get(8, 2), /Invalid bounded range/)
    await rejects(() => get(0, 128 * 1024 * 1024 + 1), /Invalid bounded range/)
  })
  await check('AbortSignal preserves primitive and object reasons exactly', async () => {
    for (const reason of ['stop', 0, false, null, { stop: true }]) {
      const controller = new AbortController(); controller.abort(reason)
      let caught = false
      try { checkAbort(controller.signal) } catch (error) { caught = Object.is(error, reason) }
      equal(caught, true)
    }
  })
  await check('Cancellation releases a pending native ReadableStream', async () => {
    let cancelled = false
    const controller = new AbortController()
    const response = new Response(new ReadableStream({ cancel() { cancelled = true } }))
    const pending = readBoundedResponse(response, 1024, controller.signal)
    controller.abort('stream stopped')
    await rejects(() => pending, /stream stopped/); equal(cancelled, true)
  })
  await check('Native Response streaming enforces the byte budget', async () => {
    let cancelled = false
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(17)) },
      cancel() { cancelled = true },
    }))
    await rejects(() => readBoundedResponse(response, 16), /exceeds its byte limit/)
    equal(cancelled, true)
    equal(Array.from(await readBoundedResponse(new Response(new Uint8Array([1, 2, 3])), 3)), [1, 2, 3])
  })
  for (const [name, expected] of [['ordinary.tiff', false], ['geotiff-striped.tif', 'geotiff'], ['imagery-overviews.cog.tif', 'cog']]) {
    await check(`Actual ${name} bytes route to ${String(expected)}`, async () => {
      equal(await resolveGeo3dSourceType({ filename: name, extension: name.endsWith('tiff') ? 'tiff' : 'tif', file: file(`samples-mit/${name}`) }), expected)
    })
  }
  await check('GeoTIFF and COG remain separate metadata classifications', async () => {
    const striped = await inspectGeoTiffBuffer(bytes('samples-mit/geotiff-striped.tif').buffer)
    const cog = await inspectGeoTiffBuffer(bytes('samples-mit/imagery-overviews.cog.tif').buffer)
    equal(striped.type, 'geotiff'); equal(cog.type, 'geotiff')
    equal(striped.isCog, false); equal(cog.isCog, true)
  })
  await check('COPC VLR sniffing uses native File slices, without decoding', async () => {
    const source = file('samples-mit/streaming.copc.laz', 'unknown.bin')
    source.arrayBuffer = () => { throw new Error('Whole-file COPC read attempted') }
    equal(await resolveGeo3dSourceType({ filename: 'unknown.bin', extension: 'bin', file: source }), 'copc')
  })
  for (const [path, expected] of [['building-textured.city.json', 'cityjson'], ['tiles3d/tileset.json', '3dtiles']]) {
    await check(`Generic JSON content sniffing recognizes ${expected}`, async () => {
      equal(await resolveGeo3dSourceType({ filename: 'unknown.json', extension: 'json', file: file(`samples-mit/${path}`, 'unknown.json') }), expected)
    })
  }
  await check('Dataset and texture URLs respect a real document <base>', async () => {
    const url = resolveGeo3dDatasetUrl('datasets/building.city.json?token=local', document.baseURI)
    equal(url, 'https://geo3d.test/private/app/datasets/building.city.json?token=local')
    equal(new URL('textures/checker.png', url).href, 'https://geo3d.test/private/app/datasets/textures/checker.png')
    equal(resolveGeo3dDatasetUrl('/data/tileset.json', document.baseURI), 'https://geo3d.test/data/tileset.json')
  })
  await check('An owning iframe supplies its own document URL base', async () => {
    const frame = document.createElement('iframe')
    frame.srcdoc = '<!doctype html><base href="https://geo3d.test/tenant/nested/"><div id="viewer"></div>'
    const loaded = new Promise(ok => { frame.onload = ok })
    document.body.append(frame); await loaded
    try {
      const target = frame.contentDocument.querySelector('#viewer')
      equal(resolveGeo3dDatasetUrl('tiles/tileset.json', target.ownerDocument.baseURI), 'https://geo3d.test/tenant/nested/tiles/tileset.json')
    } finally { frame.remove() }
  })
  await check('3TZ central-directory inspection accepts the indexed fixture', async () => {
    const { entries } = inspect3tzCentralDirectory(bytes('samples-mit/building-indexed.3tz'))
    equal(entries.some(entry => entry.name === 'tileset.json'), true)
  })
  for (const name of ['invalid-traversal.3tz', 'duplicate.3tz']) {
    await check(`3TZ central-directory inspection rejects ${name}`, () =>
      rejects(() => inspect3tzCentralDirectory(bytes(name)), /traversal|duplicate/i))
  }
  await check('Owned pool transfers buffers through a native Worker and cleans up', async () => {
    let created = 0, released = 0, terminated = 0
    const workerSource = `self.onmessage=({data})=>{if(data.type==='hold')return;const v=new Uint8Array(data.payload);self.postMessage({requestId:data.id,payload:Array.from(v).reduce((a,b)=>a+b,0)})}`
    const pool = new Geo3dOwnedWorkerPool({ concurrency: 1, maxQueued: 4, timeoutMs: 4000, createWorker() {
      created++
      const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))
      const worker = new Worker(url), terminate = worker.terminate.bind(worker)
      worker.terminate = () => { terminated++; terminate() }
      return { worker, release() { URL.revokeObjectURL(url); released++ } }
    } })
    try {
      const input = new Uint8Array([1, 2, 3, 4])
      const sum = pool.queue('sum', input.buffer, [input.buffer])
      equal(input.byteLength, 0); equal(await sum, 10)
      const controller = new AbortController()
      const held = pool.queue('hold', new ArrayBuffer(0), [], controller.signal)
      controller.abort(new Error('cancel worker job'))
      await rejects(() => held, /cancel worker job/)
      equal(await pool.queue('sum', new Uint8Array([5, 6]).buffer), 11)
      equal(created, 2); equal(released, 1)
    } finally { pool.dispose(); pool.dispose() }
    equal(released, created); equal(terminated, created)
  })
  const gl = document.createElement('canvas').getContext('webgl2')
  const debug = gl?.getExtension('WEBGL_debug_renderer_info')
  const environment = { webgl2: Boolean(gl), graphics: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null }
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  const passed = cases.filter(item => item.status === 'passed').length
  document.querySelector('#status').textContent = `${passed}/${cases.length} native input checks passed · full renderer validation remains separate`
  document.querySelector('#environment').textContent = `Real Chromium browser · WebGL2 ${environment.webgl2 ? 'available' : 'unavailable'} · ${environment.graphics || 'no GPU context'}`
  return { cases, environment }
}

let browser
const report = { status: 'failed', scope: 'Native browser input helpers only. NOT renderer output, LAZ decompression, HTTP/CORS, WASM, or full offline deployment verification.' }
try {
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1250 } })
  const errors = [], networkRequests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route(/^https?:\/\//, route => { networkRequests.push(route.request().url()); return route.abort() })
  await page.setContent(html)
  const checks = page.evaluate(runBrowserChecks, { modules, fixtures })
  let timer
  try {
    Object.assign(report, await Promise.race([checks, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Native browser checks timed out')), 30000) })]))
  } finally { clearTimeout(timer) }
  Object.assign(report, { chromium: browser.version(), playwright: require('playwright/package.json').version, errors, networkRequests })
  await page.screenshot({ path: join(output, 'native-input-checks-diagnostic.png'), fullPage: true })
  assert.deepEqual(errors, [])
  assert.deepEqual(networkRequests, [])
  assert.ok(report.cases.every(item => item.status === 'passed'), 'A native browser input check failed')
  report.status = 'passed'
} catch (error) {
  report.error = String(error)
  process.exitCode = 1
} finally {
  await browser?.close()
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
