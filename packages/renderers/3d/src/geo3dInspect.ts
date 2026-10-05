import type { RendererSourceTypeProbeInput } from '@file-viewer/core'
import { checkAbort, createRangeGetter } from './geo3dRange.js'
export type Geo3dDatasetFormat = 'copc' | 'las' | 'laz' | 'geotiff' | 'cog' | 'cityjson' | '3d-tiles' | '3tz'
export interface Geo3dDatasetInspection { format: Geo3dDatasetFormat; confidence: 'high' | 'medium'; reason: string }
export interface GeoTiffInspection {
  type: 'geotiff'; isCog: boolean | 'unknown'; crs?: string
  bbox?: [number, number, number, number]; width?: number; height?: number; bands?: number
  tiled: boolean; overviewCount: number; geoTags: readonly number[]
}
export type Geo3dRangeGetter = (begin: number, end: number) => Promise<Uint8Array>
const decoder = new TextDecoder()
const GEO_TAGS = [33550, 33922, 34264, 34735, 34736, 34737]
const INTERESTING = new Set([254, 256, 257, 273, 277, 322, 323, 324, 325, 330, ...GEO_TAGS])
const MAX_IFDS = 16, MAX_ENTRIES = 4096, MAX_VALUE_BYTES = 65536, MAX_PROBE_BYTES = 4 * 1024 * 1024
const basename = (value = '') => value.split(/[?#]/)[0].split(/[\\/]/).pop()!.toLowerCase()
const ascii = (bytes: Uint8Array, offset = 0, length = bytes.length) => decoder.decode(bytes.subarray(offset, offset + length)).replace(/\0+$/g, '').trim()
const viewOf = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
export const createGeo3dProbeRangeGetter = (input: Pick<RendererSourceTypeProbeInput, 'url' | 'file' | 'buffer' | 'signal'>): Geo3dRangeGetter => createRangeGetter(input, true)
function u64(view: DataView, offset: number, le: boolean): number {
  const value = view.getBigUint64(offset, le)
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('TIFF offset exceeds the browser safe integer range.')
  return Number(value)
}
function lasKind(bytes: Uint8Array): 'las' | 'laz' | false {
  if (bytes.length < 227 || ascii(bytes, 0, 4) !== 'LASF' || bytes[24] !== 1 || bytes[25] > 4) return false
  const v = viewOf(bytes), header = v.getUint16(94, true)
  if (header < 227 || v.getUint32(96, true) < header || (bytes[104] & 63) > 10) return false
  return (bytes[104] & 128) !== 0 ? 'laz' : 'las'
}
export function isCopcLasBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer)
  if (!lasKind(bytes)) return false
  const v = viewOf(bytes), end = v.getUint32(96, true)
  let offset = v.getUint16(94, true)
  for (let i = 0; i < Math.min(v.getUint32(100, true), 4096) && offset + 54 <= Math.min(end, bytes.length); i++) {
    const length = v.getUint16(offset + 20, true)
    if (offset + 54 + length > end) return false
    if (ascii(bytes, offset + 2, 16).toLowerCase() === 'copc' && v.getUint16(offset + 18, true) === 1) return true
    offset += 54 + length
  }
  return false
}
export async function isCopcRangeSource(getter: Geo3dRangeGetter): Promise<boolean> {
  const bytes = await getter(0, 227)
  if (!lasKind(bytes)) return false
  const v = viewOf(bytes), end = v.getUint32(96, true)
  let offset = v.getUint16(94, true)
  for (let i = 0; i < Math.min(v.getUint32(100, true), 4096) && offset + 54 <= end; i++) {
    const b = await getter(offset, offset + 54)
    if (b.length !== 54) return false
    const h = viewOf(b), length = h.getUint16(20, true)
    if (offset + 54 + length > end) return false
    if (ascii(b, 2, 16).toLowerCase() === 'copc' && h.getUint16(18, true) === 1) return true
    offset += 54 + length
  }
  return false
}
interface Ifd { offset: number; end: number; next: number; truncated: boolean; tags: Map<number, number[] | string> }
const sizes: Record<number, number> = { 1:1, 2:1, 3:2, 4:4, 5:8, 6:1, 7:1, 8:2, 9:4, 10:8, 11:4, 12:8, 13:4, 16:8, 17:8, 18:8 }
function numeric(bytes: Uint8Array, type: number, le: boolean): number[] {
  const v = viewOf(bytes), result: number[] = [], size = sizes[type]
  for (let offset = 0; size && offset + size <= bytes.length; offset += size) {
    let n: number
    switch (type) {
      case 1: case 7: n = v.getUint8(offset); break
      case 6: n = v.getInt8(offset); break
      case 3: n = v.getUint16(offset, le); break
      case 8: n = v.getInt16(offset, le); break
      case 4: case 13: n = v.getUint32(offset, le); break
      case 9: n = v.getInt32(offset, le); break
      case 11: n = v.getFloat32(offset, le); break
      case 12: n = v.getFloat64(offset, le); break
      case 16: case 18: n = u64(v, offset, le); break
      default: return result
    }
    if (!Number.isFinite(n)) throw new Error('Non-finite TIFF metadata.')
    result.push(n)
  }
  return result
}
const numbers = (d: Ifd, tag: number): number[] => { const a = d.tags.get(tag); return Array.isArray(a) ? a : [] }
const first = (d: Ifd, tag: number) => numbers(d, tag)[0]
// TIFF offset arrays are bounded per tag, but up to MAX_IFDS arrays can be
// inspected together. Never spread dataset-controlled arrays into Math.min/max:
// a valid metadata-only probe can exceed the engine's argument-count limit.
const minimum = (values: number[]): number => values.reduce((result, value) => Math.min(result, value), Infinity)
const maximum = (values: number[]): number => values.reduce((result, value) => Math.max(result, value), -Infinity)
async function readIfd(get: Geo3dRangeGetter, offset: number, big: boolean, le: boolean): Promise<Ifd> {
  const countSize = big ? 8 : 2, entrySize = big ? 20 : 12, pointerSize = big ? 8 : 4
  const countBytes = await get(offset, offset + countSize)
  if (countBytes.length !== countSize) throw new Error('Truncated TIFF IFD entry count.')
  const countView = viewOf(countBytes), count = big ? u64(countView, 0, le) : countView.getUint16(0, le)
  if (count > MAX_ENTRIES) throw new Error('TIFF IFD exceeds the bounded entry limit.')
  const length = countSize + count * entrySize + pointerSize
  const bytes = await get(offset, offset + length)
  if (bytes.length !== length) throw new Error('Truncated TIFF IFD.')
  const view = viewOf(bytes), tags = new Map<number, number[] | string>()
  let end = offset + length, truncated = false
  for (let i = 0; i < count; i++) {
    const base = countSize + i * entrySize, tag = view.getUint16(base, le)
    if (!INTERESTING.has(tag)) continue
    if (tags.has(tag)) throw new Error('Duplicate TIFF metadata tag.')
    const type = view.getUint16(base + 2, le), n = big ? u64(view, base + 4, le) : view.getUint32(base + 4, le)
    const size = sizes[type]
    if (!size || !n) continue
    const full = size * n
    if (!Number.isSafeInteger(full)) throw new Error('TIFF metadata length exceeds the browser safe integer range.')
    const requested = Math.min(full, MAX_VALUE_BYTES), field = base + (big ? 12 : 8)
    let value: Uint8Array
    if (full <= pointerSize) value = bytes.slice(field, field + full)
    else {
      const p = big ? u64(view, field, le) : view.getUint32(field, le)
      if (!Number.isSafeInteger(p + full)) throw new Error('Invalid TIFF value offset.')
      value = await get(p, p + requested)
      if (value.length !== requested) throw new Error('Truncated TIFF tag value.')
      end = Math.max(end, p + full)
    }
    truncated ||= full > requested
    tags.set(tag, type === 2 ? ascii(value) : numeric(value, type, le))
  }
  const p = countSize + count * entrySize
  return { offset, end, next: big ? u64(view, p, le) : view.getUint32(p, le), truncated, tags }
}
function crs(primary: Ifd): string | undefined {
  const keys = numbers(primary, 34735), found = new Map<number, number>()
  for (let i = 0; i < Math.min(keys[3] || 0, 1024); i++) {
    const p = 4 + 4 * i
    if (p + 3 >= keys.length) break
    if (keys[p+1] === 0 && keys[p+2] === 1 && keys[p+3] > 0 && keys[p+3] !== 32767) found.set(keys[p], keys[p+3])
  }
  // Projected CRS wins over its underlying geographic CRS regardless of key order.
  const code = found.get(3072) ?? found.get(2048)
  return code ? `EPSG:${code}` : undefined
}
function bbox(d: Ifd): GeoTiffInspection['bbox'] {
  const w = first(d, 256), h = first(d, 257)
  if (!w || !h) return undefined
  const m = numbers(d, 34264), scale = numbers(d, 33550), tie = numbers(d, 33922)
  let project: ((x: number, y: number) => number[]) | undefined
  if (m.length >= 16) project = (x, y) => [m[0]*x + m[1]*y + m[3], m[4]*x + m[5]*y + m[7]]
  else if (scale.length >= 2 && tie.length >= 6) project = (x, y) => [tie[3] + (x-tie[0])*scale[0], tie[4] - (y-tie[1])*scale[1]]
  if (!project) return undefined
  const corners = [project(0,0), project(w,0), project(0,h), project(w,h)]
  const result: GeoTiffInspection['bbox'] = [Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1])), Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1]))]
  return result.every(Number.isFinite) ? result : undefined
}
export async function inspectGeoTiffRangeSource(getter: Geo3dRangeGetter): Promise<GeoTiffInspection | null> {
  let consumed = 0
  const get: Geo3dRangeGetter = async (begin, end) => {
    if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin < 0 || end < begin) throw new Error('Invalid TIFF metadata range.')
    consumed += end - begin
    if (consumed > MAX_PROBE_BYTES) throw new Error('TIFF metadata exceeds the bounded probe budget.')
    return getter(begin, end)
  }
  const header = await get(0, 16)
  if (header.length < 8) return null
  const signature = ascii(header, 0, 2)
  if (signature !== 'II' && signature !== 'MM') return null
  const le = signature === 'II', view = viewOf(header), magic = view.getUint16(2, le), big = magic === 43
  if (magic !== 42 && !big) return null
  if (big && (header.length < 16 || view.getUint16(4, le) !== 8 || view.getUint16(6, le) !== 0)) return null
  const start = big ? u64(view, 8, le) : view.getUint32(4, le)
  if (!start) return null
  // GDAL structural metadata is in the header gap, not arbitrary pixel data.
  const headerSize = big ? 16 : 8
  const preamble = start > headerSize ? ascii(await get(headerSize, Math.min(start, 65536))) : ''
  const structural = /GDAL_STRUCTURAL_METADATA_SIZE=/.test(preamble) && /LAYOUT=IFDS_BEFORE_DATA/.test(preamble) && !/KNOWN_INCOMPATIBLE_EDITION=YES/.test(preamble)
  const ifds: Ifd[] = [], seen = new Set<number>(), queue = [start]
  while (queue.length && ifds.length < MAX_IFDS) {
    const offset = queue.shift()!
    if (seen.has(offset)) throw new Error('Cyclic or repeated TIFF IFD.')
    seen.add(offset)
    const d = await readIfd(get, offset, big, le)
    ifds.push(d)
    if (d.next) queue.push(d.next)
    queue.push(...numbers(d, 330).filter(Boolean))
  }
  const primary = ifds[0], geoTags = GEO_TAGS.filter(tag => primary.tags.has(tag))
  if (!geoTags.length) return null
  const width = first(primary,256), height = first(primary,257), tiled = !!first(primary,322) && !!first(primary,323) && numbers(primary,324).length > 0
  const overviews = ifds.slice(1).filter(d => first(d,256) > 0 && first(d,257) > 0 && first(d,256) < width! && first(d,257) < height! && !(first(d,254) & 4))
  const firstTileOffset = ifds.reduce((result, d) => Math.min(result, minimum(numbers(d,324))), Infinity)
  const sorted = (a: number[]) => a.every((n, i) => n > 0 && (i === 0 || n >= a[i-1]))
  const complete = queue.length === 0 && ifds.every(d => !d.truncated)
  const validLayout = tiled && complete && ifds.every(d => numbers(d,324).length > 0 && sorted(numbers(d,324))) &&
    sorted(ifds.map(d => d.offset)) && Number.isFinite(firstTileOffset) && ifds.every(d => d.end <= firstTileOffset)
  const overviewLayout = overviews.every((d, i) => {
    const higher = i === 0 ? primary : overviews[i-1]
    return first(d,256) < first(higher,256) && first(d,257) < first(higher,257) &&
      maximum(numbers(d,324)) < minimum(numbers(higher,324))
  })
  let isCog: GeoTiffInspection['isCog'] = 'unknown'
  if (!tiled && numbers(primary,273).length) isCog = false
  else if (validLayout && overviewLayout && (structural || overviews.length > 0)) isCog = true
  return { type:'geotiff', isCog, crs:crs(primary), bbox:bbox(primary), width, height, bands:first(primary,277), tiled, overviewCount:overviews.length, geoTags }
}
export const inspectGeoTiffBuffer = (buffer: ArrayBuffer) => inspectGeoTiffRangeSource(createGeo3dProbeRangeGetter({ buffer }))
export function isCityJsonBuffer(buffer: ArrayBuffer): boolean {
  const text = decoder.decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 256*1024)))
  return /"type"\s*:\s*"CityJSON"/.test(text) && /"CityObjects"\s*:/.test(text) && /"vertices"\s*:/.test(text)
}
export function is3dTilesJsonBuffer(buffer: ArrayBuffer): boolean {
  try {
    const v = JSON.parse(decoder.decode(new Uint8Array(buffer)))
    return typeof v?.asset?.version === 'string' && v.root !== null && typeof v.root === 'object' && !Array.isArray(v.root)
  } catch { return false }
}
export async function resolveGeo3dSourceType(input: RendererSourceTypeProbeInput): Promise<string | false> {
  checkAbort(input.signal)
  const name = basename(input.filename), extension = input.extension.toLowerCase(), mime = (input.mimeType || input.file?.type || '').split(';')[0].trim().toLowerCase()
  let hint = ''
  try { hint = new URL(input.url || '', 'https://file-viewer.invalid/').searchParams.get('format')?.toLowerCase() || '' } catch { /* Invalid URL is not a format hint. */ }
  if (['geotiff','cog','3tz'].includes(hint)) return hint
  if (name.endsWith('.copc.laz') || extension === 'copc') return 'copc'
  if (extension === 'las' || extension === 'laz') return extension
  if (extension === '3tz' || name.endsWith('.3dtiles.zip')) return '3tz'
  if (extension === 'cityjson' || name.endsWith('.city.json') || mime === 'application/city+json') return 'cityjson'
  if (name === 'tileset.json' || extension === '3dtiles') return '3dtiles'
  if (extension === 'geotiff' || extension === 'cog') return extension
  const readable = !!(input.buffer || input.file || input.url)
  if (!readable) return false
  try {
    const get = createGeo3dProbeRangeGetter(input)
    if (['tif','tiff'].includes(extension) || ['image/tiff','image/x-geotiff'].includes(mime)) {
      const tiff = await inspectGeoTiffRangeSource(get)
      return tiff ? (tiff.isCog === true ? 'cog' : 'geotiff') : false
    }
    if (['json','','bin'].includes(extension) || mime === 'application/octet-stream') {
      const head = await get(0,227), kind = lasKind(head)
      if (kind) return await isCopcRangeSource(get) ? 'copc' : kind
      if (['II','MM'].includes(ascii(head,0,2))) {
        const tiff = await inspectGeoTiffRangeSource(get)
        return tiff ? (tiff.isCog === true ? 'cog' : 'geotiff') : false
      }
      const bytes = await get(0,256*1024), buffer = bytes.slice().buffer as ArrayBuffer
      if (isCityJsonBuffer(buffer)) return 'cityjson'
      if (is3dTilesJsonBuffer(buffer)) return '3dtiles'
    }
  } catch (error) {
    checkAbort(input.signal)
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // An inconclusive probe must not steal an ordinary image/JSON renderer.
  }
  return false
}
export function inspectGeo3dDataset(input: { filename?: string; buffer?: ArrayBuffer }): Geo3dDatasetInspection | null {
  const name = basename(input.filename)
  if (input.buffer) {
    const kind = lasKind(new Uint8Array(input.buffer))
    if (kind) return { format:isCopcLasBuffer(input.buffer) ? 'copc' : kind, confidence:'high', reason:'LAS header and COPC VLR inspection' }
  }
  const format: Geo3dDatasetFormat | undefined = name === 'tileset.json' ? '3d-tiles' :
    /\.(copc|copc\.laz)$/.test(name) ? 'copc' : /\.las$/.test(name) ? 'las' : /\.laz$/.test(name) ? 'laz' :
    /\.(city\.json|cityjson)$/.test(name) ? 'cityjson' : /\.(3tz|3dtiles\.zip)$/.test(name) ? '3tz' :
    input.buffer && isCityJsonBuffer(input.buffer) ? 'cityjson' : input.buffer && is3dTilesJsonBuffer(input.buffer) ? '3d-tiles' : undefined
  return format ? { format, confidence:format === 'las' || format === 'laz' ? 'medium' : 'high', reason:'Dataset name or JSON metadata' } : null
}
