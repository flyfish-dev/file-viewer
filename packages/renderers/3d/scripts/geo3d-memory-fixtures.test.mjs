import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import {largerLas,largerElevationTiff,ORIGINAL_LAS_SHA256,sha256} from './geo3d-memory-fixtures.mjs'
const originalUrl=new URL('../test/fixtures/geo3d/samples-mit/original-deliveries/terrain-4096.las',import.meta.url)
test('larger LAS contains 262144 real records and preserves the original',async()=>{
  const original=await readFile(originalUrl),bytes=largerLas(original),offset=bytes.readUInt32LE(96)
  assert.equal(bytes.readBigUInt64LE(247),262144n)
  assert.equal(bytes.length,offset+262144*36)
  assert.equal(bytes.readDoubleLE(179),500511);assert.equal(bytes.readDoubleLE(195),5100511)
  for(const tile of [0,7,56,63])for(const index of [0,63,4095]){
    const old=offset+index*36,at=offset+(tile*4096+index)*36
    assert.equal(bytes.readInt32LE(at),original.readInt32LE(old)+(tile%8)*6400)
    assert.equal(bytes.readInt32LE(at+4),original.readInt32LE(old+4)+Math.floor(tile/8)*6400)
    assert.deepEqual(bytes.subarray(at+8,at+36),original.subarray(old+8,old+36))
  }
  assert.equal(sha256(original),ORIGINAL_LAS_SHA256)
  assert.equal(sha256(await readFile(originalUrl)),ORIGINAL_LAS_SHA256)
})
test('larger LAS refuses changed input instead of replacing a delivered fixture',async()=>{
  const original=await readFile(originalUrl);original[original.length-1]^=1
  assert.throws(()=>largerLas(original),/Original LAS/)
})
test('larger raster contains 1048576 float samples with exact no-data extent',()=>{
  const bytes=largerElevationTiff(),ifd=bytes.readUInt32LE(4),fields=new Map()
  for(let i=0;i<bytes.readUInt16LE(ifd);i++){const at=ifd+2+12*i;fields.set(bytes.readUInt16LE(at),at)}
  assert.equal(bytes.readUInt32LE(fields.get(256)+8),1024)
  assert.equal(bytes.readUInt32LE(fields.get(257)+8),1024)
  const offset=bytes.readUInt32LE(fields.get(273)+8)
  assert.equal(bytes.length-offset,1048576*4)
  let nodata=0,valid=0
  for(let at=offset;at<bytes.length;at+=4){const value=bytes.readFloatLE(at);if(value===-9999)nodata++;else if(value===100)valid++;else assert.fail('Unexpected raster value')}
  assert.equal(nodata,65536);assert.equal(valid,983040)
  assert.equal(bytes.readDoubleLE(bytes.readUInt32LE(fields.get(33922)+8)+32),5101024)
})
