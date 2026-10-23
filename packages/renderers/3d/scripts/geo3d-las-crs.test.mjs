import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { las14EvlrWkt } from '../test/fixtures/las14-evlr-wkt.mjs'
import { inspectLasCrsRangeSource, parseLasGeoKeys } from '../dist/geo3dLasCrs.js'

function directory(entries) {
  const bytes = Buffer.alloc(8 + entries.length * 8)
  ;[1, 1, 0, entries.length, ...entries.flat()].forEach((value, i) => bytes.writeUInt16LE(value, i * 2))
  return bytes
}
const inline = (key, code) => [key, 0, 1, code]

test('projected GeoKey EPSG wins over its underlying geographic CRS in any key order', () => {
  for (const entries of [
    [inline(1024, 1), inline(2048, 4258), inline(3072, 2177)],
    [inline(3072, 2177), inline(2048, 4258), inline(1024, 1)]
  ]) assert.equal(parseLasGeoKeys(directory(entries)), 'EPSG:2177')
})
test('geographic/geocentric models retain their explicit CRS; projected citations are not guessed', () => {
  assert.equal(parseLasGeoKeys(directory([inline(1024, 2), inline(2048, 4326)])), 'EPSG:4326')
  assert.equal(parseLasGeoKeys(directory([inline(1024, 3), inline(2048, 4978)])), 'EPSG:4978')
  assert.equal(parseLasGeoKeys(directory([inline(1024, 1), inline(2048, 4258)])), undefined)
  assert.equal(parseLasGeoKeys(directory([inline(1024, 1), inline(3072, 32767)])), undefined)
})
test('malformed, conflicting and indirect GeoKeys fail explicitly', () => {
  assert.throws(() => parseLasGeoKeys(Buffer.alloc(4)), /header/)
  const truncated = directory([inline(3072, 2177)])
  truncated.writeUInt16LE(2, 6)
  assert.throws(() => parseLasGeoKeys(truncated), /Truncated/)
  assert.throws(() => parseLasGeoKeys(directory([inline(3072, 2177), inline(3072, 3857)])), /Conflicting/)
  assert.throws(() => parseLasGeoKeys(directory([[3072, 34735, 1, 8]])), /encoding/)
})
test('reporter LAS twins expose matching declared-CRS decisions without reading points', async () => {
  for (const name of ['crs-geokeys-only', 'crs-wkt']) {
    const bytes = await readFile(new URL(`../test/fixtures/github-406-${name}.las`, import.meta.url))
    const end = bytes.readUInt32LE(96)
    const reads = []
    const result = await inspectLasCrsRangeSource(async (a, b) => {
      reads.push([a, b]); return bytes.subarray(a, b)
    })
    assert.equal(result.hasCrsMetadata, true)
    assert.equal(result.crs, name === 'crs-geokeys-only' ? 'EPSG:2177' : undefined)
    assert.ok(reads.every(([a, b]) => a >= 0 && b <= end))
  }
})
test('LAS 1.4 sole/final EVLR metadata is detected without reading point data', async () => {
  const source = await readFile(new URL('../test/fixtures/github-406-crs-wkt.las', import.meta.url))
  for (const preceding of [false, true]) {
    const bytes = las14EvlrWkt(source, preceding)
    assert.equal(bytes.readUInt32LE(100), 0)
    const count = bytes.readUInt32LE(243)
    assert.equal(count, preceding ? 2 : 1)
    let offset = Number(bytes.readBigUInt64LE(235))
    for (let i = 0; i < count; i++) {
      if (i === count - 1) assert.equal(bytes.readUInt16LE(offset + 18), 2112)
      offset += 60 + Number(bytes.readBigUInt64LE(offset + 20))
    }
    assert.equal(offset, bytes.length, 'Final WKT must end at EOF without trailing dummy bytes or records')
    const reads = []
    assert.deepEqual(await inspectLasCrsRangeSource(async (a, b) => {
      reads.push([a, b]); return bytes.subarray(a, b)
    }), { crs: undefined, hasCrsMetadata: true })
    const evlrOffset = Number(bytes.readBigUInt64LE(235))
    assert.ok(reads.every(([a, b]) => b <= 375 || a >= evlrOffset))
  }
})
test('EVLR headers and CRS payloads retain strict range and allocation bounds', async () => {
  const source = await readFile(new URL('../test/fixtures/github-406-crs-wkt.las', import.meta.url))
  const bytes = las14EvlrWkt(source)
  const evlr = Number(bytes.readBigUInt64LE(235))
  bytes.writeBigUInt64LE(5n * 1024n * 1024n, evlr + 20)
  await assert.rejects(() => inspectLasCrsRangeSource(async (a, b) => bytes.subarray(a, b)), /inspection budget/)
  bytes.writeBigUInt64LE(2n ** 63n, 235)
  await assert.rejects(() => inspectLasCrsRangeSource(async (a, b) => bytes.subarray(a, b)), /EVLR metadata bounds/)
})
test('truncated VLRs fail closed instead of treating the cloud as unreferenced', async () => {
  const bytes = await readFile(new URL('../test/fixtures/github-406-crs-geokeys-only.las', import.meta.url))
  await assert.rejects(() => inspectLasCrsRangeSource(async (a, b) => bytes.subarray(a, b - 1)), /Truncated/)
  bytes.writeUInt32LE(228, 96)
  await assert.rejects(() => inspectLasCrsRangeSource(async (a, b) => bytes.subarray(a, b)), /exceeds/)
})
