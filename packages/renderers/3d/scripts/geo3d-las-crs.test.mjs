import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { las14EvlrWkt } from '../test/fixtures/las14-evlr-wkt.mjs'
import { lasWithCitation } from '../test/fixtures/las-citation.mjs'
import { inspectLasCrsRangeSource, parseLasGeoKeys } from '../dist/geo3dLasCrs.js'

function directory(entries) {
  const bytes = Buffer.alloc(8 + entries.length * 8)
  ;[1, 1, 0, entries.length, ...entries.flat()].forEach((value, i) => bytes.writeUInt16LE(value, i * 2))
  return bytes
}
const inline = (key, code) => [key, 0, 1, code]

test('citation-only projected LAS resolves an authority alias without using its WGS84 base', async () => {
  // Metadata-only synthetic probe matching the reported key/units layout.
  // No compressed points are present: this is not original-file decoder evidence.
  for (const explicit of [false, true]) {
    const citation = Buffer.from('WGS84, WGS84, ETRS89 / Poland CS2000 zone 6\0')
    const keys = directory([inline(1024, 1), [1026, 34737, citation.length, 0], inline(2052, 9001), inline(2054, 9102), inline(3076, 9001), ...(explicit ? [inline(3072, 2177)] : [])])
    const vlr = (user, id, payload) => {
      const header = Buffer.alloc(54); header.write(user, 2, 16); header.writeUInt16LE(id, 18); header.writeUInt16LE(payload.length, 20)
      return Buffer.concat([header, payload])
    }
    const records = Buffer.concat([vlr('LASF_Projection', 34735, keys), vlr('LASF_Projection', 34737, citation), vlr('laszip encoded', 22204, Buffer.alloc(2))])
    const header = Buffer.alloc(227); header.write('LASF'); header[24] = 1; header[25] = 2
    header.writeUInt16LE(227, 94); header.writeUInt32LE(227 + records.length, 96); header.writeUInt32LE(3, 100)
    header[104] = 131; header.writeUInt16LE(34, 105); header.writeUInt32LE(5_677_589, 107)
    for (const offset of [131, 139, 147]) header.writeDoubleLE(.00025, offset)
    for (const [index, value] of [6483522, 5589361, 226].entries()) header.writeDoubleLE(value, 155 + index * 8)
    const bytes = Buffer.concat([header, records]), reads = []
    const inspection = await inspectLasCrsRangeSource(async (begin, end) => { reads.push([begin, end]); return bytes.subarray(begin, end) })
    assert.deepEqual(inspection, { hasCrsMetadata: true, crs: 'EPSG:2177' })
    assert.ok(reads.every(([begin, end]) => begin >= 0 && end <= bytes.length))
  }
})

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
  assert.throws(() => parseLasGeoKeys(directory([inline(3076, 9001), inline(3076, 9002)])), /Conflicting/)
  assert.throws(() => parseLasGeoKeys(directory([[3076, 34735, 1, 8]])), /encoding/)
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

test('citation offsets, conflicting authority codes and units fail before point reads', async () => {
  const original = await readFile(new URL('../test/fixtures/github-406-crs-geokeys-only.las', import.meta.url))
  const inspect = bytes => inspectLasCrsRangeSource(async (begin, end) => {
    assert.ok(end <= bytes.readUInt32LE(96), 'CRS inspection must not read points')
    return bytes.subarray(begin, end)
  })
  const name = 'ETRS89 / Poland CS2000 zone 6'
  assert.equal((await inspect(lasWithCitation(original, name))).crs, 'EPSG:2177')
  await assert.rejects(inspect(lasWithCitation(original, name, {code: 2154})), /conflicts/)
  await assert.rejects(inspect(lasWithCitation(original, name, {units: 9002})), /units/)
  await assert.rejects(inspect(lasWithCitation(original, 'EPSG:2177, EPSG:2154')), /ambiguous/)
  const invalid = lasWithCitation(original, name)
  invalid.writeUInt16LE(65535, invalid.readUInt16LE(94) + 54 + 8 + 3 * 8 + 6)
  await assert.rejects(inspect(invalid), /citation bounds/)
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
