import { checkAbort } from './geo3dRange.js'
const utf8 = new TextDecoder('utf-8', { fatal: true })
export interface Geo3d3tzLimits {
  maxEntries?: number
  maxExpandedBytes?: number
  maxEntryBytes?: number
  maxCompressionRatio?: number
}
export interface Geo3d3tzPreparedDataset {
  rootUrl: string
  /** Local Responses for native TilesRenderer; no network or service worker. */
  fetchData(url: string, options?: { signal?: AbortSignal }): Promise<Response> | null
  dispose(): void
}
interface Entry {
  name: string
  compressedSize: number
  uncompressedSize: number
  crc: number
}
const DEFAULTS = {
  maxEntries: 4096,
  maxExpandedBytes: 512 * 1024 * 1024,
  maxEntryBytes: 128 * 1024 * 1024,
  maxCompressionRatio: 200
}
function limitsFor(options: Geo3d3tzLimits) {
  const limits = { ...DEFAULTS }
  for (const key of Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>) {
    const value = options[key] ?? DEFAULTS[key]
    if (!Number.isSafeInteger(value) || value < 0 || value > DEFAULTS[key])
      throw new Error(`Invalid 3TZ ${key}; limits cannot exceed the browser safety ceiling.`)
    limits[key] = value
  }
  return limits
}
function normalizeArchivePath(raw: string): string {
  if (!raw || raw.length > 1024 || /[\0-\x1f]/.test(raw))
    throw new Error('3TZ contains an invalid empty/NUL path.')
  if (/^[\\/]|^[a-z][a-z0-9+.-]*:/i.test(raw)) throw new Error('3TZ contains an absolute path.')
  const value = raw.replace(/\\/g, '/')
  const parts = value.split('/').filter(Boolean)
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    throw new Error('3TZ contains invalid path encoding.')
  }
  if (
    parts.some((p) => p === '.' || p === '..') ||
    decoded.split(/[\\/]/).some((p) => p === '.' || p === '..') ||
    /^[\\/]|^[a-z][a-z0-9+.-]*:/i.test(decoded)
  )
    throw new Error('3TZ contains path traversal.')
  return parts.join('/') + (value.endsWith('/') ? '/' : '')
}
export function inspect3tzCentralDirectory(bytes: Uint8Array, options: Geo3d3tzLimits = {}) {
  const limits = limitsFor(options),
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (p: number) => view.getUint16(p, true),
    u32 = (p: number) => view.getUint32(p, true)
  let eocd = -1
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 22 - 65535); p--) {
    if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.length) {
      eocd = p
      break
    }
  }
  if (eocd < 0) throw new Error('3TZ is missing the ZIP end-of-central-directory record.')
  const count = u16(eocd + 10),
    size = u32(eocd + 12),
    start = u32(eocd + 16)
  if (u16(eocd + 4) || u16(eocd + 6) || u16(eocd + 8) !== count)
    throw new Error('3TZ multi-disk ZIP archives are not supported.')
  if (count === 65535 || size === 0xffffffff || start === 0xffffffff)
    throw new Error('3TZ ZIP64 archives are not supported by the bounded browser extractor.')
  if (count > limits.maxEntries) throw new Error('3TZ entry count exceeds maxEntries.')
  if (start + size !== eocd) throw new Error('3TZ central directory bounds are invalid.')
  const entries: Entry[] = [],
    seen = new Set<string>(),
    regions: Array<[number, number]> = []
  let cursor = start,
    total = 0
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > eocd || u32(cursor) !== 0x02014b50)
      throw new Error('3TZ central directory is truncated or malformed.')
    const flags = u16(cursor + 8),
      method = u16(cursor + 10),
      crc = u32(cursor + 16),
      compressedSize = u32(cursor + 20),
      uncompressedSize = u32(cursor + 24)
    const nameLength = u16(cursor + 28),
      extraLength = u16(cursor + 30),
      commentLength = u16(cursor + 32),
      local = u32(cursor + 42)
    const nameEnd = cursor + 46 + nameLength,
      next = nameEnd + extraLength + commentLength
    if (next > eocd) throw new Error('3TZ central directory entry exceeds its bounds.')
    if (flags & 1) throw new Error('Encrypted 3TZ entries are not supported.')
    if (flags & 8)
      throw new Error(
        '3TZ local headers must include sizes and CRC; data descriptors are unsupported.'
      )
    if (method !== 0 && method !== 8)
      throw new Error('Unsupported 3TZ compression; only stored and DEFLATE entries are supported.')
    if ([compressedSize, uncompressedSize, local].includes(0xffffffff))
      throw new Error('3TZ ZIP64 entry is not supported.')
    if (u16(cursor + 34) !== 0 || ((u32(cursor + 38) >>> 16) & 0xf000) === 0xa000)
      throw new Error('3TZ disk/symlink entry is not supported.')
    for (let p = nameEnd; p < nameEnd + extraLength;) {
      if (p + 4 > nameEnd + extraLength || p + 4 + u16(p + 2) > nameEnd + extraLength)
        throw new Error('Truncated 3TZ extra field.')
      if ([0x0001, 0x7075].includes(u16(p)))
        throw new Error('3TZ ZIP64 or alternate Unicode paths are unsupported.')
      p += 4 + u16(p + 2)
    }
    const raw = utf8.decode(bytes.subarray(cursor + 46, nameEnd)),
      name = normalizeArchivePath(raw)
    if (seen.has(name.toLowerCase())) throw new Error(`3TZ contains duplicate path: ${name}`)
    seen.add(name.toLowerCase())
    if (local + 30 > start || u32(local) !== 0x04034b50)
      throw new Error('Invalid 3TZ local file header.')
    const localName = u16(local + 26),
      localExtra = u16(local + 28),
      dataStart = local + 30 + localName + localExtra,
      dataEnd = dataStart + compressedSize
    if (
      dataEnd > start ||
      flags !== u16(local + 6) ||
      method !== u16(local + 8) ||
      crc !== u32(local + 14) ||
      compressedSize !== u32(local + 18) ||
      uncompressedSize !== u32(local + 22) ||
      utf8.decode(bytes.subarray(local + 30, local + 30 + localName)) !== raw
    )
      throw new Error('3TZ local and central headers disagree.')
    regions.push([local, dataEnd])
    if (method === 0 && compressedSize !== uncompressedSize)
      throw new Error('Invalid stored 3TZ entry size.')
    if (uncompressedSize > limits.maxEntryBytes) throw new Error('3TZ entry exceeds maxEntryBytes.')
    total += uncompressedSize
    if (total > limits.maxExpandedBytes)
      throw new Error('3TZ expanded size exceeds maxExpandedBytes.')
    if (uncompressedSize / Math.max(1, compressedSize) > limits.maxCompressionRatio)
      throw new Error('3TZ entry exceeds maxCompressionRatio.')
    if (!name.endsWith('/')) entries.push({ name, compressedSize, uncompressedSize, crc })
    else if (uncompressedSize !== 0)
      throw new Error('3TZ directory contains an unexpected payload.')
    cursor = next
  }
  if (cursor !== eocd) throw new Error('3TZ central directory size/count mismatch.')
  regions.sort((a, b) => a[0] - b[0])
  if (regions.some((r, i) => i > 0 && r[0] < regions[i - 1][1]))
    throw new Error('3TZ local entries overlap.')
  if (!entries.some((e) => e.name === 'tileset.json'))
    throw new Error('3TZ must contain tileset.json at the archive root.')
  return { entries, totalExpandedBytes: total }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
interface ZipStream {
  on(event: 'data', callback: (chunk: Uint8Array) => void): ZipStream
  on(event: 'error', callback: (error: Error) => void): ZipStream
  on(event: 'end', callback: () => void): ZipStream
  pause(): ZipStream
  resume(): ZipStream
}
interface ZipFile {
  internalStream(type: 'uint8array'): ZipStream
}
function boundedExtract(file: ZipFile, entry: Entry, signal?: AbortSignal): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    checkAbort(signal)
    const stream = file.internalStream('uint8array'),
      result = new Uint8Array(entry.uncompressedSize)
    let offset = 0,
      crc = 0xffffffff,
      settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      stream.pause()
      signal?.removeEventListener('abort', abort)
      reject(error)
    }
    const abort = () =>
      fail(signal?.reason || new DOMException('3TZ extraction aborted.', 'AbortError'))
    signal?.addEventListener('abort', abort, { once: true })
    stream
      .on('data', (chunk) => {
        if (settled) return
        if (offset + chunk.length > result.length) {
          fail(new Error('3TZ actual expanded size exceeds declared size.'))
          return
        }
        result.set(chunk, offset)
        offset += chunk.length
        for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
      })
      .on('error', fail)
      .on('end', () => {
        if (settled) return
        if (offset !== result.length || (crc ^ 0xffffffff) >>> 0 !== entry.crc) {
          fail(new Error('3TZ expanded size or CRC32 mismatch.'))
          return
        }
        settled = true
        signal?.removeEventListener('abort', abort)
        resolve(result)
      })
      .resume()
  })
}
const mimeFor = (name: string) =>
  /\.gltf$/i.test(name)
    ? 'model/gltf+json'
    : /\.glb$/i.test(name)
      ? 'model/gltf-binary'
      : /\.json$/i.test(name)
        ? 'application/json'
        : /\.png$/i.test(name)
          ? 'image/png'
          : /\.jpe?g$/i.test(name)
            ? 'image/jpeg'
            : /\.webp$/i.test(name)
              ? 'image/webp'
              : /\.ktx2$/i.test(name)
                ? 'image/ktx2'
                : 'application/octet-stream'
function resolveEntryName(base: string, reference: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:|^[\\/]|[\0-\x1f]/i.test(reference))
    throw new Error('3TZ external/absolute resource is not allowed.')
  const path = decodeURIComponent(reference.split(/[?#]/)[0]).replace(/\\/g, '/')
  const parts = base.split('/').slice(0, -1)
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!parts.length) throw new Error('3TZ relative path traversal escapes the archive.')
      parts.pop()
    } else parts.push(part)
  }
  return normalizeArchivePath(parts.join('/'))
}
async function rewriteUris(
  value: unknown,
  name: string,
  getUrl: (name: string, depth: number, asBlob?: boolean) => Promise<string>,
  depth: number
): Promise<void> {
  // Only glTF buffers/images may embed data. An inline tile/model can contain
  // more resource URLs and would bypass validation of archive-owned entries.
  const inlineResources = new Set<object>()
  if (value && typeof value === 'object') {
    const root = value as Record<string, unknown>
    const asset = root.asset as { version?: unknown } | undefined
    if (asset?.version === '2.0') {
      for (const key of ['buffers', 'images']) {
        if (Array.isArray(root[key])) {
          for (const resource of root[key]) {
            if (resource && typeof resource === 'object') inlineResources.add(resource)
          }
        }
      }
    }
  }
  const stack: Array<[unknown, number]> = [[value, 0]]
  let nodes = 0
  while (stack.length) {
    const [v, nesting] = stack.pop()!
    if (!v || typeof v !== 'object') continue
    if (nesting > 128 || ++nodes > 1000000)
      throw new Error('3TZ JSON exceeds its structural limit.')
    if (Array.isArray(v)) {
      for (const child of v) stack.push([child, nesting + 1])
      continue
    }
    const record = v as Record<string, unknown>
    for (const [key, child] of Object.entries(record)) {
      if ((key === 'uri' || key === 'url' || key === 'schemaUri') && typeof child === 'string') {
        if (/^data:/i.test(child)) {
          if (!inlineResources.has(record))
            throw new Error('3TZ inline tile/model resources are unsupported.')
          continue
        }
        const target = resolveEntryName(name, child)
        // The enabled structural-metadata plugin loads schemaUri directly
        // with Three's FileLoader, outside TilesRenderer.fetchData. Give it an
        // owned Blob URL instead of a virtual tileset URL or an external URL.
        if (target) record[key] = await getUrl(target, depth + 1, key === 'schemaUri')
      } else stack.push([child, nesting + 1])
    }
  }
}
async function rewriteGlbUris(
  data: Uint8Array,
  name: string,
  getUrl: (name: string, depth: number, asBlob?: boolean) => Promise<string>,
  depth: number
): Promise<Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (
    data.length < 20 ||
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== data.length
  )
    throw new Error('Invalid 3TZ GLB.')
  const chunks: Array<{ type: number; bytes: Uint8Array }> = []
  let offset = 12
  while (offset < data.length) {
    if (offset + 8 > data.length) throw new Error('Truncated GLB chunk.')
    const length = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true)
    if (length % 4 || offset + 8 + length > data.length)
      throw new Error('Invalid GLB chunk bounds.')
    let bytes = data.slice(offset + 8, offset + 8 + length)
    if (chunks.length === 0) {
      if (type !== 0x4e4f534a) throw new Error('GLB JSON must be the first chunk.')
      // Strip only trailing GLB padding. An unanchored greedy regexp can scan
      // every leading whitespace suffix before finding no trailing match.
      let end = bytes.length
      while (end > 0 && (bytes[end - 1] === 0 || bytes[end - 1] === 32)) end--
      const json = JSON.parse(utf8.decode(bytes.subarray(0, end)))
      await rewriteUris(json, name, getUrl, depth)
      const encoded = new TextEncoder().encode(JSON.stringify(json)),
        padded = new Uint8Array(Math.ceil(encoded.length / 4) * 4).fill(32)
      padded.set(encoded)
      bytes = padded
    }
    chunks.push({ type, bytes })
    offset += 8 + length
  }
  const length = 12 + chunks.reduce((n, c) => n + 8 + c.bytes.length, 0),
    out = new Uint8Array(length),
    v = new DataView(out.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, length, true)
  offset = 12
  for (const c of chunks) {
    v.setUint32(offset, c.bytes.length, true)
    v.setUint32(offset + 4, c.type, true)
    out.set(c.bytes, offset + 8)
    offset += 8 + c.bytes.length
  }
  return out
}
export async function prepare3tzDataset(
  bytes: Uint8Array,
  options: Geo3d3tzLimits = {},
  signal?: AbortSignal
): Promise<Geo3d3tzPreparedDataset> {
  checkAbort(signal)
  const { entries } = inspect3tzCentralDirectory(bytes, options)
  const imported = await import('jszip'),
    JSZip = imported.default || imported
  // CRC is checked incrementally by boundedExtract. JSZip's eager CRC option
  // would inflate all entries concurrently before enforcing actual byte limits.
  const zip = await JSZip.loadAsync(bytes, { createFolders: false, checkCRC32: false })
  const extracted = new Map<string, Uint8Array>(),
    urls = new Map<string, string>(),
    creating = new Set<string>()
  const responses = new Map<string, { bytes: Uint8Array; mime: string }>()
  const archiveBase = `file-viewer-archive://${crypto.randomUUID()}/`
  let disposed = false
  const dispose = () => {
    disposed = true
    for (const url of urls.values()) if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    urls.clear()
    extracted.clear()
    responses.clear()
  }
  const fetchData = (url: string, options?: { signal?: AbortSignal }): Promise<Response> | null => {
    if (!url.startsWith(archiveBase)) return null
    return Promise.resolve().then(() => {
      checkAbort(signal)
      checkAbort(options?.signal)
      if (disposed) throw new Error('3TZ dataset has been disposed.')
      const item = responses.get(url)
      if (!item) throw new Error('Unknown 3TZ virtual resource.')
      return new Response(item.bytes.slice().buffer as ArrayBuffer, {
        headers: { 'Content-Type': item.mime }
      })
    })
  }
  try {
    for (const entry of entries) {
      checkAbort(signal)
      const file = zip.file(entry.name)
      if (!file) throw new Error(`3TZ entry missing after ZIP parse: ${entry.name}`)
      const data = await boundedExtract(file as unknown as ZipFile, entry, signal)
      const magic = String.fromCharCode(...data.subarray(0, 4)).toLowerCase()
      const container =
        /\.(b3dm|i3dm|cmpt)$/i.exec(entry.name)?.[1].toLowerCase() ||
        (['b3dm', 'i3dm', 'cmpt'].includes(magic) ? magic : null)
      // Native legacy tile loaders can fetch nested glTF/GLB resources without
      // invoking TilesRenderer.fetchData. Fail before any URL is exposed until
      // those containers have a bounded recursive resource validator.
      if (container)
        throw new Error(
          `3TZ unsupported ${container.toUpperCase()} container; use archive-local glTF/GLB tiles.`
        )
      if (magic === 'gltf' && !/\.glb$/i.test(entry.name))
        throw new Error('3TZ GLB content must use the .glb extension.')
      extracted.set(entry.name, data)
    }
    const root = JSON.parse(utf8.decode(extracted.get('tileset.json')!))
    if (typeof root?.asset?.version !== 'string' || !root.root || typeof root.root !== 'object')
      throw new Error('3TZ root tileset.json is not a 3D Tiles dataset.')
    const getUrl = async (name: string, depth = 0, asBlob = false): Promise<string> => {
      checkAbort(signal)
      const cacheKey = asBlob ? `schema:${name}` : name
      if (depth > 64 || creating.has(cacheKey)) throw new Error('3TZ cyclic/deep resource reference.')
      const existing = urls.get(cacheKey)
      if (existing) return existing
      const data = extracted.get(name)
      if (!data) throw new Error(`Missing 3TZ relative resource: ${name}`)
      creating.add(cacheKey)
      try {
        let payload: Uint8Array = data
        if (/\.(json|gltf)$/i.test(name)) {
          const value = JSON.parse(utf8.decode(data))
          await rewriteUris(value, name, getUrl, depth)
          payload = new TextEncoder().encode(JSON.stringify(value))
        } else if (/\.glb$/i.test(name)) payload = await rewriteGlbUris(data, name, getUrl, depth)
        checkAbort(signal)
        // TilesRenderer classifies nested tilesets and models by path extension.
        // An extensionless Blob URL (or a fake suffix in its fragment) is not
        // sufficient. Its documented fetchData plugin serves these local URLs.
        const nativeTile = !asBlob && /\.(json|gltf|glb|b3dm|i3dm|pnts|cmpt)$/i.test(name)
        const url = nativeTile
          ? archiveBase + name.split('/').map(encodeURIComponent).join('/')
          : URL.createObjectURL(
              new Blob([payload.slice().buffer as ArrayBuffer], { type: mimeFor(name) })
            )
        if (nativeTile) responses.set(url, { bytes: payload, mime: mimeFor(name) })
        urls.set(cacheKey, url)
        return url
      } finally {
        creating.delete(cacheKey)
      }
    }
    const rootUrl = await getUrl('tileset.json')
    return { rootUrl, fetchData, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}
