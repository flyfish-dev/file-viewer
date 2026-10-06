import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { once } from 'node:events'
import test from 'node:test'
import {
  inspectGeoTiffBuffer,
  inspectGeoTiffRangeSource,
  resolveGeo3dSourceType
} from '../dist/geo3dInspect.js'
import {
  byteLimit,
  checkAbort,
  createRangeGetter,
  readBoundedResponse
} from '../dist/geo3dRange.js'
import { resolveGeo3dDatasetUrl } from '../dist/geo3dUrl.js'

const fixture = async (name) => {
  const bytes = await readFile(new URL(`../test/fixtures/geo3d/${name}`, import.meta.url))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

// Metadata-only synthetic TIFF. Each page has a full, untruncated tile-offset
// array; pixel data is deliberately absent and must never be requested.
function largeTiledMetadata(pages = 16, tiles = 16384) {
  const tags = 7,
    directoryLength = 2 + tags * 12 + 4
  const metadataSize = 8 + pages * directoryLength + pages * tiles * 4 + 8
  const bytes = new Uint8Array(metadataSize),
    view = new DataView(bytes.buffer)
  bytes.set([73, 73, 42, 0])
  view.setUint32(4, 8, true)
  for (let page = 0; page < pages; page++) {
    const at = 8 + page * directoryLength
    const offsets = 8 + pages * directoryLength + page * tiles * 4
    const fields = [
      [256, 4, 1, 4096],
      [257, 4, 1, 4096],
      [322, 4, 1, 32],
      [323, 4, 1, 32],
      [324, 4, tiles, offsets],
      [277, 3, 1, 1],
      [34735, 3, 4, metadataSize - 8]
    ]
    view.setUint16(at, tags, true)
    for (const [i, [tag, type, count, value]] of fields.entries()) {
      const p = at + 2 + i * 12
      view.setUint16(p, tag, true)
      view.setUint16(p + 2, type, true)
      view.setUint32(p + 4, count, true)
      view.setUint32(p + 8, value, true)
    }
    view.setUint32(at + 2 + tags * 12, page + 1 < pages ? at + directoryLength : 0, true)
    for (let i = 0; i < tiles; i++)
      view.setUint32(offsets + i * 4, metadataSize + (page * tiles + i) * 1024, true)
  }
  for (const [i, value] of [1, 1, 0, 0].entries())
    view.setUint16(metadataSize - 8 + i * 2, value, true)
  return bytes
}

test('262144 TIFF tile offsets do not overflow the call stack or request pixel data', async () => {
  const bytes = largeTiledMetadata()
  let requested = 0
  const result = await inspectGeoTiffRangeSource(async (begin, end) => {
    assert.ok(end <= bytes.length, 'metadata inspection must not read absent pixel data')
    requested += end - begin
    return bytes.slice(begin, end)
  })
  assert.equal(result.type, 'geotiff')
  assert.equal(result.tiled, true)
  assert.equal(result.width, 4096)
  assert.equal(result.isCog, 'unknown')
  assert.ok(requested < 4 * 1024 * 1024, 'the existing metadata budget is preserved')
  assert.equal(
    await resolveGeo3dSourceType({
      filename: 'multipage.tif',
      extension: 'tif',
      buffer: bytes.buffer
    }),
    'geotiff'
  )
})

test('truncated tile-offset arrays remain GeoTIFF without claiming proven COG layout', async () => {
  const result = await inspectGeoTiffBuffer(largeTiledMetadata(1, 32768).buffer)
  assert.equal(result.type, 'geotiff')
  assert.equal(result.isCog, 'unknown')
})

test('existing TIFF, GeoTIFF and COG fixture routing is unchanged', async () => {
  for (const [name, expected] of [
    ['regular.tif', false],
    ['geotiff-noncog.tif', 'geotiff'],
    ['sample-cog.tif', 'cog']
  ]) {
    assert.equal(
      await resolveGeo3dSourceType({
        filename: name,
        extension: 'tif',
        buffer: await fixture(name)
      }),
      expected
    )
  }
  const metadata = await inspectGeoTiffBuffer(await fixture('geotiff-noncog.tif'))
  assert.equal(metadata.crs, 'EPSG:4326')
  assert.deepEqual(metadata.bbox, [12, 45.68, 12.32, 46])
})

for (const [value, base, expected] of [
  [
    '/datasets/city/building.city.json',
    'https://viewer.example/nested/app/',
    'https://viewer.example/datasets/city/building.city.json'
  ],
  [
    'datasets/city/building.city.json',
    'https://viewer.example/nested/app/',
    'https://viewer.example/nested/app/datasets/city/building.city.json'
  ],
  [
    '../tiles/tileset.json?token=abc%2Fdef',
    'https://viewer.example/nested/app/',
    'https://viewer.example/nested/tiles/tileset.json?token=abc%2Fdef'
  ],
  [
    'https://data.example/city/building.city.json',
    'https://viewer.example/app/',
    'https://data.example/city/building.city.json'
  ],
  [
    '//data.example/tiles/tileset.json',
    'https://viewer.example/app/',
    'https://data.example/tiles/tileset.json'
  ],
  [
    'data/tileset.json',
    'https://assets.example/custom-base/',
    'https://assets.example/custom-base/data/tileset.json'
  ],
  [
    'blob:https://viewer.example/1234',
    'https://viewer.example/app/',
    'blob:https://viewer.example/1234'
  ]
])
  test(`dataset URL resolution: ${value}`, () => {
    assert.equal(resolveGeo3dDatasetUrl(value, base), expected)
  })

test('relative CityJSON textures and nested tile references use the normalized dataset URL', () => {
  const city = resolveGeo3dDatasetUrl(
    '/data/city/building.city.json',
    'https://viewer.example/app/'
  )
  assert.equal(
    new URL('textures/wall.png', city).href,
    'https://viewer.example/data/city/textures/wall.png'
  )
  const tiles = resolveGeo3dDatasetUrl('data/tileset.json', 'https://viewer.example/app/')
  assert.equal(
    new URL('lod/tileset.json', tiles).href,
    'https://viewer.example/app/data/lod/tileset.json'
  )
})

test('URL normalization keeps local File/buffer inputs without a fabricated URL', () => {
  assert.equal(resolveGeo3dDatasetUrl(undefined, 'about:blank'), undefined)
  assert.equal(resolveGeo3dDatasetUrl('', 'about:blank'), undefined)
})

test('the runtime normalizes streamUrl against the owning document before constructing the source', async () => {
  const source = (
    await readFile(new URL('../src/geo3dRuntime.ts', import.meta.url), 'utf8')
  ).replace(/\s+/g, '')
  assert.match(
    source,
    /resolveGeo3dDatasetUrl\(context\?\.streamUrl\|\|context\?\.url,target\.ownerDocument\.baseURI\)/
  )
  assert.match(source, /newURL\(reference,originalUrl\)/)
})

for (const reason of [new Error('host cancelled'), 'host-navigation', false, 0, null, undefined]) {
  test(`range cancellation preserves the exact reason: ${String(reason)}`, async () => {
    const controller = new AbortController()
    controller.abort(reason)
    let caught = false
    try {
      checkAbort(controller.signal)
    } catch (error) {
      caught = true
      assert.equal(error, controller.signal.reason)
    }
    assert.equal(caught, true)
    await assert.rejects(
      createRangeGetter({ buffer: new ArrayBuffer(4), signal: controller.signal })(0, 4),
      (error) => error === controller.signal.reason
    )
    await assert.rejects(
      readBoundedResponse(new Response('abc'), 16, controller.signal),
      (error) => error === controller.signal.reason
    )
  })
}

test('pending bounded reads are cancelled and preserve non-Error reasons', async () => {
  const controller = new AbortController()
  let cancelled = false
  const response = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true
      }
    })
  )
  const pending = readBoundedResponse(response, 16, controller.signal)
  const rejected = assert.rejects(pending, (error) => error === 'navigation')
  controller.abort('navigation')
  await rejected
  assert.equal(cancelled, true)
})

test('whole responses enforce declared and observed byte limits', async () => {
  await assert.rejects(
    readBoundedResponse(new Response('abcd', { headers: { 'Content-Length': '4' } }), 3),
    /byte limit/
  )
  await assert.rejects(readBoundedResponse(new Response('abcd'), 3), /byte limit/)
  assert.deepEqual(
    await readBoundedResponse(new Response('abc'), 3),
    new TextEncoder().encode('abc')
  )
  for (const limit of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => byteLimit(limit), /Invalid/)
})

async function serve(t, handler) {
  const server = createServer(handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
        server.closeAllConnections()
      })
  )
  return `http://127.0.0.1:${server.address().port}`
}

test('real local HTTP requests preserve Range and validate Content-Range through EOF', async (t) => {
  const bytes = Buffer.from('0123456789abcdefghijklmnop'),
    ranges = []
  const url = await serve(t, (request, response) => {
    ranges.push(request.headers.range)
    const match = /^bytes=(\d+)-(\d+)$/.exec(request.headers.range || '')
    if (!match) {
      response.writeHead(400)
      response.end()
      return
    }
    const start = Number(match[1]),
      end = Math.min(Number(match[2]), bytes.length - 1)
    response.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1
    })
    response.end(bytes.subarray(start, end + 1))
  })
  const getter = createRangeGetter({ url })
  assert.deepEqual(await getter(10, 14), new Uint8Array(bytes.subarray(10, 14)))
  assert.deepEqual(await getter(24, 40), new Uint8Array(bytes.subarray(24)))
  assert.deepEqual(ranges, ['bytes=10-13', 'bytes=24-39'])
})

test('a server ignoring Range is accepted for bounded probing, not native streaming', async (t) => {
  const url = await serve(t, (_request, response) => {
    response.writeHead(200)
    response.end('0123456789')
  })
  await assert.rejects(createRangeGetter({ url })(0, 4), /expected HTTP 206/)
  assert.deepEqual(await createRangeGetter({ url }, true)(2, 5), new TextEncoder().encode('234'))
})

test('malformed or inconsistent Content-Range is rejected over local HTTP', async (t) => {
  const url = await serve(t, (_request, response) => {
    response.writeHead(206, { 'Content-Range': 'bytes 9-12/100', 'Accept-Ranges': 'bytes' })
    response.end('abcd')
  })
  await assert.rejects(createRangeGetter({ url })(10, 14), /does not match/)
})
