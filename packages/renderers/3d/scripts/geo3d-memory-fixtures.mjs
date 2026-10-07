// Deterministic larger workloads; delivered test/fixtures files are never changed.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {elevationTiff} from './geo3d-residual-fixtures.mjs'
export const ORIGINAL_LAS_SHA256='4c535093b94f60922ad807f4ba72a1a534e702655434026c54b807db9d6f2b17'
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')
export function largerLas(original){
  assert.equal(sha256(original),ORIGINAL_LAS_SHA256,'Original LAS must remain byte-identical')
  const count=Number(original.readBigUInt64LE(247)),offset=original.readUInt32LE(96),stride=original.readUInt16LE(105),copies=64
  assert.equal(count,4096);assert.equal(stride,36);assert.equal(original[104],7)
  assert.equal(offset+count*stride,original.length);assert.equal(original.readBigUInt64LE(235),0n)
  const result=Buffer.alloc(offset+count*copies*stride);original.copy(result,0,0,offset)
  for(let tile=0;tile<copies;tile++){
    const tx=tile%8,ty=Math.floor(tile/8),begin=offset+tile*count*stride
    original.copy(result,begin,offset)
    for(let i=0;i<count;i++){
      const at=begin+i*stride
      result.writeInt32LE(result.readInt32LE(at)+tx*6400,at)
      result.writeInt32LE(result.readInt32LE(at+4)+ty*6400,at+4)
    }
  }
  result.writeBigUInt64LE(BigInt(count*copies),247)
  for(let i=0;i<15;i++)result.writeBigUInt64LE(original.readBigUInt64LE(255+i*8)*BigInt(copies),255+i*8)
  result.writeDoubleLE(original.readDoubleLE(179)+448,179)
  result.writeDoubleLE(original.readDoubleLE(195)+448,195)
  assert.equal(sha256(original),ORIGINAL_LAS_SHA256)
  return result
}
export function largerElevationTiff(){
  const template=elevationTiff(),fields=new Map(),ifd=template.readUInt32LE(4)
  for(let i=0;i<template.readUInt16LE(ifd);i++){const at=ifd+2+12*i;fields.set(template.readUInt16LE(at),at)}
  const offset=template.readUInt32LE(fields.get(273)+8),size=1024
  const bytes=Buffer.alloc(offset+size*size*4);template.copy(bytes,0,0,offset)
  for(const tag of [256,257,278])bytes.writeUInt32LE(size,fields.get(tag)+8)
  bytes.writeUInt32LE(size*size*4,fields.get(279)+8)
  const tiepoint=bytes.readUInt32LE(fields.get(33922)+8)
  bytes.writeDoubleLE(5100000+size,tiepoint+4*8)
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)bytes.writeFloatLE(x<256&&y<256?-9999:100,offset+(y*size+x)*4)
  return bytes
}
