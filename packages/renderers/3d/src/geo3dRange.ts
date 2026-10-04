/** Bounded byte access shared by format probes and the COPC runtime. */
export type RangeGetter = (begin: number, end: number) => Promise<Uint8Array>
export interface RangeSource {
  url?: string
  file?: Blob
  buffer?: ArrayBuffer
  signal?: AbortSignal
}
const MAX_RANGE = 128 * 1024 * 1024
const MAX_PREFIX = 1024 * 1024
export const checkAbort = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw signal.reason instanceof Error
    ? signal.reason : new DOMException('Geo3D rendering aborted.', 'AbortError')
}
export const byteLimit = (value: number, name = 'byte limit'): number => {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid Geo3D ${name}.`)
  return value
}
export async function readBoundedResponse(response: Response, limit: number, signal?: AbortSignal): Promise<Uint8Array> {
  byteLimit(limit)
  checkAbort(signal)
  const length = response.headers.get('Content-Length')
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) || Number(length) > limit)) {
    await response.body?.cancel()
    throw new Error('Geo3D response exceeds its byte limit or has an invalid Content-Length.')
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    checkAbort(signal)
    if (bytes.length > limit) throw new Error('Geo3D response exceeds its byte limit.')
    return bytes
  }
  const reader = response.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  const abort = () => { void reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', abort, { once: true })
  try {
    for (;;) {
      checkAbort(signal)
      const { value, done } = await reader.read()
      checkAbort(signal)
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error('Geo3D response exceeds its byte limit while streaming.')
      parts.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    signal?.removeEventListener('abort', abort)
    reader.releaseLock()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}
async function prefix(response: Response, signal?: AbortSignal): Promise<{ bytes: Uint8Array; complete: boolean }> {
  // A non-range server is tolerated for probes only, never for native COPC reads.
  if (!response.body) return { bytes: await readBoundedResponse(response, MAX_PREFIX, signal), complete: true }
  const reader = response.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0, complete = false
  try {
    while (size < MAX_PREFIX) {
      checkAbort(signal)
      const { value, done } = await reader.read()
      checkAbort(signal)
      if (done) { complete = true; break }
      const part = value.subarray(0, MAX_PREFIX - size)
      parts.push(part); size += part.length
      if (part.length !== value.length) break
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  return { bytes, complete }
}
export function createRangeGetter(input: RangeSource, probe = false): RangeGetter {
  let cached: { bytes: Uint8Array; complete: boolean } | undefined
  let total: number | undefined
  return async (begin, end) => {
    checkAbort(input.signal)
    if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(end) || begin < 0 || end < begin || end - begin > MAX_RANGE)
      throw new Error('Invalid bounded range request.')
    if (begin === end) return new Uint8Array()
    if (input.file) {
      const bytes = new Uint8Array(await input.file.slice(begin, end).arrayBuffer())
      checkAbort(input.signal)
      return bytes
    }
    if (input.buffer) return new Uint8Array(input.buffer.slice(begin, end))
    if (!input.url) throw new Error('Geo3D source has no range-readable input.')
    if (cached && (cached.complete || end <= cached.bytes.length)) return cached.bytes.slice(begin, end)
    const response = await fetch(input.url, { headers: { Range: `bytes=${begin}-${end - 1}` }, signal: input.signal })
    const reject = async (message: string): Promise<never> => {
      await response.body?.cancel().catch(() => {})
      throw new Error(message)
    }
    if (probe && response.status === 200) {
      cached = await prefix(response, input.signal)
      if (!cached.complete && end > cached.bytes.length) throw new Error('TIFF metadata is outside the bounded non-range probe prefix.')
      return cached.bytes.slice(begin, end)
    }
    if (response.status !== 206) return reject(`Geo3D range request expected HTTP 206, received ${response.status}.`)
    const range = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(response.headers.get('Content-Range') || '')
    if (!range) return reject('Geo3D source did not expose a valid Content-Range. Configure CORS or a same-origin range-aware proxy.')
    const first = Number(range[1]), last = Number(range[2])
    const size = range[3] === '*' ? undefined : Number(range[3])
    if (![first, last, ...(size === undefined ? [] : [size])].every(Number.isSafeInteger) || first !== begin || last < first ||
        (size !== undefined && (size <= last || (total !== undefined && total !== size))) ||
        last + 1 !== (size === undefined ? end : Math.min(end, size))) return reject('Geo3D Content-Range does not match the requested byte interval.')
    if (size !== undefined) total = size
    const encoding = response.headers.get('Content-Encoding')
    if (encoding && encoding.toLowerCase() !== 'identity') return reject('Geo3D byte ranges require identity Content-Encoding.')
    const accept = response.headers.get('Accept-Ranges')
    if (accept && accept.trim().toLowerCase() !== 'bytes') return reject('Geo3D source reported unsupported Accept-Ranges.')
    const expected = last - first + 1
    const bytes = await readBoundedResponse(response, expected, input.signal)
    if (bytes.length !== expected) throw new Error('Geo3D range body length does not match Content-Range.')
    return bytes
  }
}
