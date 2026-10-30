import type { Geo3dRangeGetter } from './geo3dInspect.js'

export interface LasCrsInspection {
  crs?: string
  hasCrsMetadata: boolean
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes).replace(/\0/g, '').trim()
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

/** Inline GeoTIFF CRS codes only. Citation text is not an authoritative EPSG ID. */
export function parseLasGeoKeys(bytes: Uint8Array): string | undefined {
  const data = view(bytes)
  if (bytes.length < 8 || bytes.length % 2 || data.getUint16(0, true) !== 1
    || data.getUint16(2, true) !== 1 || data.getUint16(4, true) > 1)
    throw new Error('Invalid LAS GeoKeyDirectory header.')
  const count = data.getUint16(6, true)
  if (8 + count * 8 > bytes.length) throw new Error('Truncated LAS GeoKeyDirectory.')
  const keys = new Map<number, number>()
  for (let i = 0; i < count; i++) {
    const offset = 8 + i * 8
    const key = data.getUint16(offset, true)
    if (![1024, 2048, 3072, 3076].includes(key)) continue
    if (data.getUint16(offset + 2, true) !== 0 || data.getUint16(offset + 4, true) !== 1)
      throw new Error('Unsupported LAS GeoKey CRS value encoding.')
    const value = data.getUint16(offset + 6, true)
    if (keys.has(key) && keys.get(key) !== value) throw new Error('Conflicting LAS GeoKey CRS values.')
    keys.set(key, value)
  }
  const model = keys.get(1024)
  // A projected model's geographic base CRS does not describe its XY units.
  const code = model === 1 || keys.has(3072) ? keys.get(3072)
    : model === undefined || model === 2 || model === 3 ? keys.get(2048) : undefined
  return code && code < 32767 ? `EPSG:${code}` : undefined
}

/** Read only bounded LAS VLR metadata; never decode points or fetch a CRS registry. */
export async function inspectLasCrsRangeSource(getter: Geo3dRangeGetter): Promise<LasCrsInspection> {
  let budget = 4 * 1024 * 1024
  const exact = async (begin: number, end: number) => {
    budget -= end - begin
    if (budget < 0) throw new Error('LAS CRS metadata exceeds the inspection budget.')
    const bytes = await getter(begin, end)
    if (bytes.byteLength !== end - begin) throw new Error('Truncated LAS CRS metadata.')
    return bytes
  }
  const header = await exact(0, 227)
  if (text(header.subarray(0, 4)) !== 'LASF' || header[24] !== 1 || header[25]! > 4)
    throw new Error('Invalid LAS header while reading CRS metadata.')
  const data = view(header)
  let offset = data.getUint16(94, true)
  const end = data.getUint32(96, true)
  const count = data.getUint32(100, true)
  if (offset < 227 || end < offset || count > 4096) throw new Error('Invalid LAS VLR metadata bounds.')
  let crs: string | undefined
  let hasCrsMetadata = false
  const directories: Uint8Array[] = []
  let ascii: Uint8Array | undefined
  const inspectPayload = async (userId: string, id: number, begin: number, end: number) => {
    if (userId !== 'LASF_Projection' || ![2112, 34735, 34736, 34737].includes(id) || end === begin) return
    const payload = await exact(begin, end)
    hasCrsMetadata ||= id === 34735 || id === 34736 || !!text(payload)
    if (id === 34735) {
      directories.push(payload)
      const candidate = parseLasGeoKeys(payload)
      if (crs && candidate && crs !== candidate) throw new Error('Conflicting LAS GeoKey CRS directories.')
      crs = candidate ?? crs
    }
    if (id === 34737) {
      if (ascii && (ascii.length !== payload.length || ascii.some((byte, i) => byte !== payload[i])))
        throw new Error('Conflicting LAS GeoASCII CRS metadata.')
      ascii = payload
    }
  }
  for (let i = 0; i < count; i++) {
    if (offset + 54 > end) throw new Error('LAS VLR header exceeds the point-data offset.')
    const vlr = await exact(offset, offset + 54)
    const fields = view(vlr)
    const length = fields.getUint16(20, true)
    const next = offset + 54 + length
    if (next > end) throw new Error('LAS VLR payload exceeds the point-data offset.')
    const id = fields.getUint16(18, true)
    await inspectPayload(text(vlr.subarray(2, 18)), id, offset + 54, next)
    offset = next
  }
  if (header[25] === 4) {
    if (data.getUint16(94, true) < 375) throw new Error('Invalid LAS 1.4 header length.')
    const extended = view(await exact(227, 375))
    offset = Number(extended.getBigUint64(8, true))
    const evlrCount = extended.getUint32(16, true)
    if (evlrCount > 4096 || (evlrCount && (!Number.isSafeInteger(offset) || offset < end)))
      throw new Error('Invalid LAS EVLR metadata bounds.')
    for (let i = 0; i < evlrCount; i++) {
      const evlr = await exact(offset, offset + 60)
      const fields = view(evlr)
      const length = Number(fields.getBigUint64(20, true))
      const next = offset + 60 + length
      if (!Number.isSafeInteger(length) || !Number.isSafeInteger(next)) throw new Error('Invalid LAS EVLR payload length.')
      await inspectPayload(text(evlr.subarray(2, 18)), fields.getUint16(18, true), offset + 60, next)
      offset = next
    }
  }
  if (ascii) {
    for (const directory of directories) {
      const data = view(directory), count = data.getUint16(6, true)
      const inline = new Map<number, number>()
      const citations: Array<{ key: number; value: string }> = []
      for (let i = 0; i < count; i++) {
        const offset = 8 + i * 8, key = data.getUint16(offset, true)
        const location = data.getUint16(offset + 2, true), length = data.getUint16(offset + 4, true), begin = data.getUint16(offset + 6, true)
        if (key === 3076 && (location !== 0 || length !== 1)) throw new Error('Unsupported LAS linear-unit GeoKey encoding.')
        if (location === 0 && length === 1) {
          if (inline.has(key) && inline.get(key) !== begin) throw new Error('Conflicting LAS GeoKey values.')
          inline.set(key, begin)
        }
        if (![1026, 2049, 3073].includes(key)) continue
        if (location !== 34737 || !length || begin + length > ascii.length)
          throw new Error('Invalid LAS CRS citation bounds.')
        citations.push({ key, value: text(ascii.subarray(begin, begin + length)) })
      }
      if (!citations.length) continue
      const { resolveCitedCrs } = await import('./geo3dCrsCatalog.js')
      for (const citation of citations) {
        const model = inline.get(1024)
        // Geographic citations describe a projected CRS's base, not its XY coordinates.
        if (model === 1 && citation.key === 2049) continue
        const candidate = resolveCitedCrs(citation.value, model ?? (citation.key === 3073 ? 1 : citation.key === 2049 ? 2 : undefined), inline.get(3076))
        if (crs && candidate && crs !== candidate) throw new Error('LAS CRS citation conflicts with its authoritative GeoKey.')
        crs = candidate ?? crs
      }
    }
  }
  return { crs, hasCrsMetadata }
}
