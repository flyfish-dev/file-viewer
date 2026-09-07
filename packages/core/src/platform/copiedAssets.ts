import { getFileViewerRendererAssetManifest, resolveFileViewerRuntimeAssetBaseUrl } from './assets'

interface CopiedAssetManifest {
  schemaVersion?: unknown
  packageName?: unknown
  validation?: {
    assets?: Array<{ id?: unknown; rendererId?: unknown; exists?: unknown; relativePath?: unknown }>
  }
}

const manifests = new WeakMap<Document, Map<string, CopiedAssetManifest | null>>()
const MAX_MANIFEST_BYTES = 1024 * 1024

const readManifest = async (
  url: string,
  signal?: AbortSignal
): Promise<CopiedAssetManifest | null> => {
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' })
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('json') ||
      Number(response.headers.get('content-length')) > MAX_MANIFEST_BYTES
    )
      return null
    const reader = response.body?.getReader()
    if (!reader) return null
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_MANIFEST_BYTES) return null
        chunks.push(value)
      }
    } finally {
      await reader.cancel()
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const manifest: CopiedAssetManifest = JSON.parse(new TextDecoder().decode(bytes))
    return manifest?.schemaVersion === 1 &&
      manifest.packageName === 'file-viewer-copy-assets' &&
      Array.isArray(manifest.validation?.assets)
      ? manifest
      : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

/** Finds assets copied by the standard CLI without trusting a SPA fallback or arbitrary manifest URLs. */
export async function resolveFileViewerCopiedAssetUrl(
  documentRef: Document,
  rendererId: string,
  assetId: string,
  signal?: AbortSignal
): Promise<string | undefined> {
  const asset = getFileViewerRendererAssetManifest(rendererId)?.assets.find(
    (item) => item.id === assetId
  )
  if (!asset?.defaultPath) return undefined
  const base = new URL(resolveFileViewerRuntimeAssetBaseUrl(documentRef))
  if (!['http:', 'https:'].includes(base.protocol)) return undefined
  const bases = base.pathname.endsWith('/file-viewer/')
    ? [base]
    : [new URL('file-viewer/', base), base]
  let cache = manifests.get(documentRef)
  if (!cache) {
    cache = new Map()
    manifests.set(documentRef, cache)
  }
  for (const directory of bases) {
    if (signal?.aborted) return undefined
    const url = new URL('flyfish-viewer-assets.json', directory).href
    const manifest = cache.has(url) ? cache.get(url) : await readManifest(url, signal)
    if (signal?.aborted) return undefined
    cache.set(url, manifest || null)
    const copied = manifest?.validation?.assets?.find(
      (item) =>
        item &&
        item.id === assetId &&
        item.rendererId === rendererId &&
        item.exists === true &&
        item.relativePath === asset.defaultPath
    )
    if (copied) return new URL(asset.defaultPath, directory).href
  }
  return undefined
}
