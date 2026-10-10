import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const packageRoot = resolve(import.meta.dirname, '..')
const root = resolve(packageRoot, '../../..')
const require = createRequire(resolve(root, 'package.json'))
const geoRequire = createRequire(resolve(packageRoot, 'package.json'))
const { build } = geoRequire('esbuild')
const { chromium, webkit } = require('playwright')
const output = resolve(process.env.GEO_EVIDENCE_DIR || resolve(root, 'output/maplibre-browser'))
const entry = resolve(packageRoot, 'dist/geo.js')
const original = await readFile(entry, 'utf8')
const upstream = JSON.parse(await readFile(geoRequire.resolve('maplibre-gl/package.json'), 'utf8'))
const owned = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'))
assert.equal(upstream.version, owned.dependencies['maplibre-gl'])
await mkdir(output, { recursive: true })

// Observe the normal compiled module without replacing its parser, MapLibre,
// Worker, styles or interaction handlers. Both points must remain unique.
const observationPoints = [
  [
    '    configureMapLibreWorker(maplibre);',
    '    globalThis.__geoEngineVersion = maplibre.getVersion();'
  ],
  [
    '    const mounted = await mountMapLibre(shell.mapHost, shell.root, parsed, options, basemap, t);',
    '    globalThis.__geoObservedMap = mounted.map; globalThis.__geoObservedDispatcher = mounted.map.style.dispatcher;'
  ]
]
for (const [marker] of observationPoints) assert.equal(original.split(marker).length, 2)
const bundle = await build({
  stdin: {
    contents: `import render from ${JSON.stringify(entry)};
import {findFileViewerZoomProvider,findFileViewerViewStateProvider} from ${JSON.stringify(resolve(root, 'packages/core/dist/index.js'))};
globalThis.geoBrowserApi={render,findFileViewerZoomProvider,findFileViewerViewStateProvider};`,
    resolveDir: root,
    sourcefile: 'geo-browser-entry.js'
  },
  outdir: resolve(output, 'app'),
  entryNames: 'entry',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  metafile: true,
  logLevel: 'warning',
  plugins: [
    {
      name: 'observe-compiled-map',
      setup(builder) {
        builder.onLoad({ filter: /\/renderers\/geo\/dist\/geo\.js$/ }, async () => {
          let contents = original
          for (const [marker, observer] of observationPoints)
            contents = contents.replace(marker, `${marker}\n${observer}`)
          return { contents, loader: 'js' }
        })
      }
    }
  ]
})
assert.ok(
  Object.keys(bundle.metafile.inputs).some((path) =>
    /maplibre-gl\/dist\/maplibre-gl\.(?:m?js)$/.test(path)
  )
)
await writeFile(resolve(output, 'metafile.json'), JSON.stringify(bundle.metafile, null, 2) + '\n')

const fixtures = [
  {
    name: 'ordinary.geojson',
    type: 'geojson',
    types: ['LineString', 'Point', 'Polygon'],
    text: JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Marker' },
          geometry: { type: 'Point', coordinates: [1, 1] }
        },
        {
          type: 'Feature',
          properties: { name: 'Route' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-0.3, 0.6],
              [2.3, 1.6]
            ]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Area' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0]
              ]
            ]
          }
        }
      ]
    })
  },
  {
    name: 'ordinary.kml',
    type: 'kml',
    types: ['LineString', 'Point', 'Polygon'],
    text: '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Marker</name><Point><coordinates>1,1</coordinates></Point></Placemark><Placemark><name>Route</name><LineString><coordinates>-.3,.6 2.3,1.6</coordinates></LineString></Placemark><Placemark><name>Area</name><Polygon><outerBoundaryIs><LinearRing><coordinates>0,0 2,0 2,2 0,2 0,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>'
  },
  {
    name: 'ordinary.gpx',
    type: 'gpx',
    types: ['LineString', 'Point'],
    text: '<gpx version="1.1" creator="File Viewer browser gate" xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="1" lon="1"><name>Marker</name></wpt><trk><name>Route</name><trkseg><trkpt lat=".6" lon="-.3"/><trkpt lat="1.6" lon="2.3"/></trkseg></trk></gpx>'
  }
]
const html =
  '<!doctype html><meta charset="utf-8"><style>html,body{margin:0}#host{width:1080px;height:700px}</style><div id="host"></div><script type="module" src="/app/entry.js"></script>'
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname)
  try {
    if (pathname === '/') {
      response
        .writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Security-Policy':
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob:"
        })
        .end(html)
      return
    }
    if (pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    const file = resolve(output, '.' + pathname)
    assert.ok(file.startsWith(output + sep))
    response
      .writeHead(200, {
        'Content-Type': extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream'
      })
      .end(await readFile(file))
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const report = {
  maplibre: upstream.version,
  originalModuleSha256: createHash('sha256').update(original).digest('hex'),
  cases: [],
  passed: false
}
try {
  for (const [engine, browserType] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    const browser = await browserType.launch({
      headless: true,
      ...(engine === 'chromium'
        ? {
            args: ['--enable-unsafe-swiftshader'],
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
          }
        : {})
    })
    try {
      const page = await browser.newPage({ viewport: { width: 1120, height: 760 } })
      const errors = [],
        externalRequests = [],
        warnings = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
        if (message.type() === 'warning') warnings.push(message.text())
      })
      await page.route('**/*', (route) => {
        const url = route.request().url()
        if (/^https?:/.test(url) && !url.startsWith(origin + '/')) {
          externalRequests.push(url)
          return route.abort()
        }
        return route.continue()
      })
      await page.addInitScript(() => {
        const Original = window.Worker
        window.geoWorkerCounts = { created: 0, active: 0, received: 0 }
        window.Worker = class extends Original {
          constructor(...args) {
            super(...args)
            geoWorkerCounts.created++
            geoWorkerCounts.active++
            this.addEventListener('message', () => geoWorkerCounts.received++)
            this.addEventListener('error', (error) => {
              throw Error(error.message)
            })
            this.__geoLive = true
          }
          terminate() {
            if (this.__geoLive) {
              this.__geoLive = false
              geoWorkerCounts.active--
            }
            return super.terminate()
          }
        }
      })
      await page.goto(origin)
      await page.waitForFunction(() => !!globalThis.geoBrowserApi, null, { polling: 50 })
      let retainedPoolCreatedCount
      for (const fixture of fixtures) {
        await page.evaluate(async (fixture) => {
          globalThis.__geoObservedMap = undefined
          globalThis.geoInstance = await geoBrowserApi.render(
            new TextEncoder().encode(fixture.text).buffer,
            document.querySelector('#host'),
            fixture.type,
            { options: { locale: 'en-US', geo: { preferMapEngine: true } } }
          )
        }, fixture)
        assert.equal(
          await page.locator('.geo-map-svg').count(),
          0,
          'MapLibre must not silently fall back to SVG'
        )
        assert.equal(await page.locator('.maplibregl-canvas').count(), 1)
        await page.waitForFunction(
          () =>
            __geoObservedMap?.loaded() &&
            __geoObservedMap.queryRenderedFeatures({
              layers: ['geo-fill', 'geo-line', 'geo-point']
            }).length > 0,
          null,
          { polling: 50, timeout: 15_000 }
        )
        const visible = await page.evaluate(() => {
          const map = __geoObservedMap,
            canvas = map.getCanvas(),
            gl = canvas.getContext('webgl2')
          return {
            version: __geoEngineVersion,
            featureTypes: [
              ...new Set(
                map
                  .queryRenderedFeatures({ layers: ['geo-fill', 'geo-line', 'geo-point'] })
                  .map((feature) => feature.geometry.type)
              )
            ].sort(),
            workers: { ...geoWorkerCounts },
            glVersion: gl?.getParameter(gl.VERSION),
            glError: gl?.getError(),
            width: canvas.width,
            height: canvas.height,
            zoom: map.getZoom()
          }
        })
        assert.equal(visible.version, upstream.version)
        assert.deepEqual(visible.featureTypes, fixture.types)
        assert.ok(visible.glVersion && visible.width > 0 && visible.height > 0)
        assert.equal(visible.glError, 0)
        assert.ok(
          visible.workers.created > 0 && visible.workers.active > 0 && visible.workers.received > 0
        )
        await page.locator('.maplibregl-ctrl-zoom-in').click()
        await page.waitForFunction(
          (before) => !__geoObservedMap.isMoving() && __geoObservedMap.getZoom() > before + 0.9,
          visible.zoom,
          { polling: 50 }
        )
        const dragged = await page.locator('.maplibregl-canvas').boundingBox()
        assert.ok(dragged)
        const centerBefore = await page.evaluate(() => __geoObservedMap.getCenter().toArray())
        await page.mouse.move(dragged.x + dragged.width * 0.65, dragged.y + dragged.height * 0.65)
        await page.mouse.down()
        await page.mouse.move(
          dragged.x + dragged.width * 0.65 + 50,
          dragged.y + dragged.height * 0.65 + 25,
          { steps: 6 }
        )
        await page.mouse.up()
        await page.waitForFunction(
          (before) =>
            !__geoObservedMap.isMoving() &&
            Math.abs(__geoObservedMap.getCenter().lng - before[0]) > 0.001,
          centerBefore,
          { polling: 50 }
        )
        await page.evaluate(async () => {
          const provider = geoBrowserApi.findFileViewerViewStateProvider(
            document.querySelector('#host')
          )
          if (!provider) throw Error('Missing real view-state provider')
          const saved = provider.getState()
          await provider.applyState({
            ...saved,
            extra: { ...saved.extra, center: [1, 1] },
            scale: 7
          })
          if (__geoObservedMap.getZoom() !== 7) throw Error('View-state zoom restore failed')
          if (Math.abs(__geoObservedMap.getCenter().lng - 1) > 0.00001)
            throw Error('View-state center restore failed')
        })
        await page.locator('[data-geo-action="fit"]').click()
        await page.waitForFunction(
          () => __geoObservedMap.loaded() && Math.abs(__geoObservedMap.getZoom() - 7) > 0.01,
          null,
          { polling: 50 }
        )
        assert.deepEqual(
          await page.evaluate(() =>
            [
              ...new Set(
                __geoObservedMap
                  .queryRenderedFeatures({ layers: ['geo-fill', 'geo-line', 'geo-point'] })
                  .map((feature) => feature.geometry.type)
              )
            ].sort()
          ),
          fixture.types
        )
        await page.screenshot({ path: resolve(output, `${engine}-${fixture.type}.png`) })
        const cleanup = await page.evaluate(() => {
          const element = geoInstance.$el
          const map = __geoObservedMap,
            dispatcher = __geoObservedDispatcher,
            pool = dispatcher.workerPool
          const expectedPoolOwners = Object.keys(pool.active)
            .filter((owner) => owner !== String(dispatcher.id))
            .sort()
          const canvas = map.getCanvas()
          geoInstance.unmount()
          return {
            children: element.childElementCount,
            provider: !!geoBrowserApi.findFileViewerViewStateProvider(element),
            zoomProvider: !!geoBrowserApi.findFileViewerZoomProvider(element),
            mapRemoved: map._removed,
            canvasDetached: !canvas.isConnected,
            actorCount: dispatcher.actors.length,
            expectedPoolOwners,
            remainingPoolOwners: Object.keys(pool.active).sort(),
            expectedActiveWorkers: expectedPoolOwners.length ? geoWorkerCounts.active : 0
          }
        })
        // MapLibre6 keeps a global dispatcher in the shared pool. Assert the
        // removed map's native actors and ownership are gone, then require
        // exact pool reuse across subsequent maps rather than stopping a pool
        // that another owner still uses.
        await page.waitForFunction(
          (expected) => geoWorkerCounts.active === expected,
          cleanup.expectedActiveWorkers,
          { polling: 50 }
        )
        assert.equal(cleanup.children, 0)
        assert.equal(cleanup.provider, false)
        assert.equal(cleanup.zoomProvider, false)
        assert.equal(cleanup.mapRemoved, true)
        assert.equal(cleanup.canvasDetached, true)
        assert.equal(cleanup.actorCount, 0)
        assert.deepEqual(cleanup.remainingPoolOwners, cleanup.expectedPoolOwners)
        const workersAfterUnmount = await page.evaluate(() => ({ ...geoWorkerCounts }))
        if (retainedPoolCreatedCount !== undefined)
          assert.equal(
            workersAfterUnmount.created,
            retainedPoolCreatedCount,
            'The shared pool must not grow on repeated map disposal/recreation'
          )
        if (cleanup.remainingPoolOwners.length)
          retainedPoolCreatedCount = workersAfterUnmount.created
        assert.deepEqual(errors, [])
        assert.deepEqual(externalRequests, [])
        assert.ok(!warnings.some((message) => /fallback|failed|timeout/i.test(message)))
        report.cases.push({
          engine,
          browserVersion: browser.version(),
          fixture: fixture.name,
          visible,
          cleanup,
          workersAfterUnmount,
          externalRequests: [],
          errors: [],
          warnings
        })
        console.log(
          `[maplibre-browser] ${engine}/${fixture.type}: actual rendered features, real zoom/drag, view-state restore, fit and Worker cleanup passed`
        )
      }
    } finally {
      await browser.close()
    }
  }
  report.passed = true
} catch (error) {
  report.error = error.stack || error.message
  throw error
} finally {
  await new Promise((resolve) => server.close(resolve))
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
