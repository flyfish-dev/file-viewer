import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { adaptGeoTIFFSource } from './build-geo3d-raster-adapters.mjs'

const require = createRequire(import.meta.url)
const source = adaptGeoTIFFSource(await readFile(require.resolve('@giro3d/giro3d/sources/GeoTIFFSource.js'), 'utf8'))
const cachePath = require.resolve('@giro3d/giro3d/core/Cache.js')
const cacheSource = await readFile(cachePath, 'utf8')
assert.equal(createHash('sha256').update(cacheSource).digest('hex'), '3082f6d1ee112c2677f61890dcacf49b2b236098183b1c4419680a331e830fc6')
const { LRUCache } = createRequire(cachePath)('lru-cache')
// Execute the exact installed cache with its real LRU dependency. Only its
// unrelated memory-inspection predicate is stubbed; no singleton is modified.
const Cache = new Function('LRUCache', 'isMemoryUsage', cacheSource.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '') + '\nreturn Cache;')(LRUCache, () => false)
function method(name, workers) {
  const matches = [...source.matchAll(new RegExp('^  (?:async )?' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?^  \\}', 'gm'))]
  assert.equal(matches.length, 1, 'Expected one reviewed method: ' + name)
  return new Function('workers', 'return ({\n' + matches[0][0] + '\n}).' + name)(workers)
}
function owner(cache) {
  const controller = new AbortController()
  const workers = {
    signal: controller.signal,
    combineSignal(signal) { return signal ? AbortSignal.any([controller.signal, signal]) : controller.signal },
    dispose() { controller.abort(new DOMException('Source disposed.', 'AbortError')) },
  }
  const internal = new Map([['block', new Uint8Array(4)]])
  const value = {
    _cache: cache, _cacheId: randomUUID(), _regionCacheKeys: new Set(), reads: 0,
    makeWindowFromExtent() { return [0, 0, 2, 2] },
    async fetchBuffer() { this.reads++; return [new Uint8Array([1, 2, 3, 4])] },
    getInternalCache() { return internal },
    getRegionBuffers: method('getRegionBuffers', workers),
    dispose: method('dispose', workers),
  }
  return value
}
const region = (value, id = 'tile', signal) => value.getRegionBuffers({}, { resolution: [1, -1], image: {} }, [0], signal, id)

test('region disposal releases only its owner while another source keeps cache hits', async () => {
  const cache = new Cache({ byteCapacity: 1024, maxNumberOfEntries: 8 })
  const host = {}; cache.set('host', host, { size: 8 })
  const a = owner(cache), b = owner(cache)
  const first = await region(a), second = await region(b)
  assert.equal(await region(a), first); assert.equal(a.reads, 1)
  assert.equal(cache.size, 16); assert.equal(cache.count, 3)
  a.dispose(); a.dispose()
  assert.equal(a.getInternalCache().size, 0); assert.equal(a._regionCacheKeys.size, 0)
  assert.equal(cache.size, 12); assert.equal(cache.count, 2); assert.equal(cache.get('host'), host)
  assert.equal(await region(b), second); assert.equal(b.reads, 1)
  b.dispose(); assert.equal(cache.size, 8); assert.equal(cache.count, 1)
  const c = owner(cache); await region(c); c.dispose()
  assert.equal(cache.size, 8); assert.equal(cache.get('host'), host)
  await assert.rejects(region(a), { name: 'AbortError' })
})

test('late region read cannot repopulate cache after source disposal', async () => {
  const cache = new Cache(), a = owner(cache)
  let finish
  a.fetchBuffer = () => new Promise(resolve => { finish = resolve })
  const pending = region(a)
  const rejected = assert.rejects(pending, { name: 'AbortError' })
  a.dispose(); finish([new Uint8Array(4)]); await rejected
  assert.equal(cache.count, 0); assert.equal(cache.size, 0); assert.equal(a._regionCacheKeys.size, 0)
})

test('aborted request cannot cache a late result or read an existing cached region', async () => {
  const cache = new Cache(), a = owner(cache), controller = new AbortController()
  const normalRead = a.fetchBuffer
  let finish
  a.fetchBuffer = () => new Promise(resolve => { finish = resolve })
  const rejected = assert.rejects(region(a, 'aborted', controller.signal), { name: 'AbortError' })
  controller.abort(); finish([new Uint8Array(4)]); await rejected
  assert.equal(cache.count, 0); a.fetchBuffer = normalRead
  await region(a, 'live'); assert.equal(cache.count, 1)
  await assert.rejects(region(a, 'live', controller.signal), { name: 'AbortError' })
  assert.equal(cache.count, 1); a.dispose(); assert.equal(cache.count, 0)
})

test('cache eviction bounds ownership tracking and disabled or oversized writes retain nothing', async () => {
  const cache = new Cache({ byteCapacity: 8, maxNumberOfEntries: 2 }), a = owner(cache)
  for (let i = 0; i < 20; i++) {
    await region(a, String(i))
    assert.equal(a._regionCacheKeys.size, cache.count)
    assert.ok(a._regionCacheKeys.size <= 2)
  }
  a.dispose(); assert.equal(cache.count, 0); assert.equal(cache.size, 0)
  const b = owner(cache); cache.enabled = false
  for (let i = 0; i < 20; i++) await region(b, String(i))
  assert.equal(b._regionCacheKeys.size, 0); assert.equal(cache.count, 0)
  cache.enabled = true; b.fetchBuffer = async () => [new Uint8Array(16)]
  await region(b); assert.equal(cache.count, 0); assert.equal(b._regionCacheKeys.size, 0)
  // The exact engine cache must not retain an onDelete closure for rejected data.
  assert.equal(cache._deleteHandlers.size, 0); b.dispose()
})

test('source disposal also releases stale regions omitted by the public entry iterator', async () => {
  // Keep the entry live until this fixture explicitly expires it. A real 1 ms
  // TTL can expire during insertion, before the source records its ownership.
  const cache = new Cache({ byteCapacity: 1024, maxNumberOfEntries: 8, ttl: 0 }), a = owner(cache)
  await region(a); assert.equal(cache.count, 1)
  assert.equal(a._regionCacheKeys.size, 1)
  // Expire deterministically without sleeps. This is test-local LRU state, not
  // an application or engine singleton; production code uses only Cache APIs.
  for (const [key, entry] of cache._lru.dump()) cache._lru.set(key, entry.value, { size: entry.size, ttl: 1, start: performance.now() - 5000 })
  // Rewriting the same value retains its ownership and deletion callback.
  assert.equal(a._regionCacheKeys.size, 1)
  assert.equal(cache.entries().length, 0); assert.equal(cache.count, 1)
  a.dispose(); assert.equal(cache.count, 0); assert.equal(cache.size, 0); assert.equal(a._regionCacheKeys.size, 0)
})
