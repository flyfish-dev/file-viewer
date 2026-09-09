import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveFileViewerCopiedAssetUrl } from '../packages/core/src/platform/copiedAssets'

afterEach(() => vi.unstubAllGlobals())
const documentAt = (base = 'https://example.test/ui/') =>
  ({ baseURI: base, querySelector: () => ({}) }) as unknown as Document
const manifest = (relativePath = 'vendor/pptx/pptx.worker.js') => ({
  schemaVersion: 1,
  packageName: 'file-viewer-copy-assets',
  validation: {
    assets: [{ id: 'pptx-worker', rendererId: 'office-presentation', exists: true, relativePath }]
  }
})
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })

describe('Self-hosted copied Worker discovery', () => {
  it('uses the normal CLI directory beneath baseHref and caches per owning document', async () => {
    const fetch = vi.fn(async () => json(manifest()))
    vi.stubGlobal('fetch', fetch)
    const doc = documentAt()
    for (let index = 0; index < 2; index++)
      expect(await resolveFileViewerCopiedAssetUrl(doc, 'office-presentation', 'pptx-worker')).toBe(
        'https://example.test/ui/file-viewer/vendor/pptx/pptx.worker.js'
      )
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://example.test/ui/file-viewer/flyfish-viewer-assets.json',
      expect.objectContaining({ credentials: 'same-origin' })
    )
  })
  it('supports assets copied into the application root without interpreting SPA HTML as a manifest', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } })
        )
        .mockResolvedValueOnce(json(manifest()))
    )
    expect(
      await resolveFileViewerCopiedAssetUrl(documentAt(), 'office-presentation', 'pptx-worker')
    ).toBe('https://example.test/ui/vendor/pptx/pptx.worker.js')
  })
  for (const invalid of [
    manifest('https://attacker.test/worker.js'),
    manifest('../worker.js'),
    { ...manifest(), schemaVersion: 2 },
    { validation: { assets: [] } },
    { ...manifest(), validation: { assets: [null] } }
  ]) {
    it('does not accept arbitrary paths or an unrecognized manifest', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => json(invalid))
      )
      expect(
        await resolveFileViewerCopiedAssetUrl(documentAt(), 'office-presentation', 'pptx-worker')
      ).toBeUndefined()
    })
  }
  it('does not poison the next request when a document switch aborts the fetch', async () => {
    const controller = new AbortController()
    const doc = documentAt()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        controller.abort()
        return json(manifest())
      })
    )
    expect(
      await resolveFileViewerCopiedAssetUrl(
        doc,
        'office-presentation',
        'pptx-worker',
        controller.signal
      )
    ).toBeUndefined()
    const fetch = vi.fn(async () => json(manifest()))
    vi.stubGlobal('fetch', fetch)
    expect(
      await resolveFileViewerCopiedAssetUrl(doc, 'office-presentation', 'pptx-worker')
    ).toContain('/file-viewer/vendor/pptx/')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('bounds manifests and leaves missing assets to the package fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('x'.repeat(1024 * 1024 + 1), {
            headers: { 'content-type': 'application/json' }
          })
      )
    )
    expect(
      await resolveFileViewerCopiedAssetUrl(documentAt(), 'office-presentation', 'pptx-worker')
    ).toBeUndefined()
  })
})
