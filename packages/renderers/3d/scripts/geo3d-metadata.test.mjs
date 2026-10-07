import assert from 'node:assert/strict'
import test from 'node:test'
import { Worker } from 'node:worker_threads'

function inspectInWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./geo3d-metadata-worker.mjs', import.meta.url), {
      workerData
    })
    let settled = false
    let timer = setTimeout(() => finish(new Error('Metadata worker did not load')), 30000)
    function finish(error, result) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.terminate().then(() => (error ? reject(error) : resolve(result)), reject)
    }
    worker.on('message', (message) => {
      if (message.phase === 'ready') {
        clearTimeout(timer)
        // Start the budget after imports; a hung parser is safely terminated.
        timer = setTimeout(
          () => finish(new Error('Metadata exceeded its 2 second CPU budget')),
          2000
        )
      } else if (message.phase === 'done') finish(null, message.results)
      else finish(new Error(message.message))
    })
    worker.on('error', (error) => finish(error))
    worker.on('exit', (code) => {
      if (!settled) finish(new Error(`Metadata worker exited before returning a result: ${code}`))
    })
  })
}

test('CityJSON keeps CRS forms and completes repeated-marker metadata', async () => {
  const values = [
    'EPSG:4326',
    'urn:ogc:def:crs:EPSG::4978',
    'https://www.opengis.net/def/crs/EPSG/0/32632',
    'prefix epsg custom code 3857 suffix',
    'epsg'.repeat(65536),
    'epsg'.repeat(65536) + ' 4978',
    'other reference system'
  ]
  const results = await inspectInWorker({ kind: 'cityjson', values })
  assert.deepEqual(
    results.map((value) => value.crs),
    ['EPSG:4326', 'EPSG:4978', 'EPSG:32632', 'EPSG:3857', undefined, 'EPSG:4978', undefined]
  )
  assert.ok(results.every((value) => value.triangles === 12))
})

test('GeoTIFF probes embedded NULs and trailing ASCII terminators within the budget', async () => {
  const results = await inspectInWorker({ kind: 'tiff' })
  assert.equal(results.length, 5)
  for (const result of results) {
    assert.equal(result.type, 'geotiff')
    assert.equal(result.width, 1)
    assert.deepEqual(result.geoTags, [34737])
  }
})

test('3TZ parses legally padded GLB JSON within the CPU budget', async () => {
  const results = await inspectInWorker({ kind: 'glb' })
  assert.deepEqual(
    results,
    [65536, 131072, 262144].map((padding) => ({
      padding,
      version: '2.0',
      scene: 0
    }))
  )
})
