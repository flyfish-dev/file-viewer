import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFileViewerSnapshotDownload } from '../packages/core/src/output/snapshotDownload'
import { triggerFileViewerBlobDownload } from '../packages/core/src/output/export'
import { createFileViewerCanvasImageBlob } from '../packages/core/src/output/canvasImage'
import type { FileViewerOptions } from '../packages/core/src/contracts/types'

vi.mock('../packages/core/src/output/export', () => ({ triggerFileViewerBlobDownload: vi.fn() }))
afterEach(() => vi.clearAllMocks())

describe('Renderer snapshot downloads', () => {
  for (const operation of ['download', 'export-html'] as const) {
    it(`does not capture or prompt when ${operation} is forbidden`, async () => {
      const beforeDownload = vi.fn(async () => true)
      const capture = vi.fn()
      const request = createFileViewerSnapshotDownload({
        getOptions: () => ({ toolbar: { permissions: { [operation]: false } } }),
        isCurrent: () => true,
        beforeDownload
      })
      expect(await request(capture)).toBe(false)
      expect(beforeDownload).not.toHaveBeenCalled()
      expect(capture).not.toHaveBeenCalled()
    })
  }

  it('honors the owning viewer cancellation hook', async () => {
    const capture = vi.fn()
    const request = createFileViewerSnapshotDownload({
      getOptions: () => ({}),
      isCurrent: () => true,
      beforeDownload: async () => false
    })
    expect(await request(capture)).toBe(false)
    expect(capture).not.toHaveBeenCalled()
    expect(triggerFileViewerBlobDownload).not.toHaveBeenCalled()
  })

  it('passes the current watermark and downloads exactly once', async () => {
    const watermark = { text: 'PRIVATE', opacity: 0.5 }
    const blob = new Blob(['image'])
    const capture = vi.fn(async () => ({ blob, filename: 'drawing.png' }))
    const request = createFileViewerSnapshotDownload({
      getOptions: () => ({ watermark }),
      isCurrent: () => true,
      beforeDownload: async () => true
    })
    expect(await request(capture)).toBe(true)
    expect(capture).toHaveBeenCalledExactlyOnceWith(watermark)
    expect(triggerFileViewerBlobDownload).toHaveBeenCalledExactlyOnceWith(blob, 'drawing.png')
  })

  for (const change of ['file', 'permission', 'watermark'] as const) {
    it(`refuses output if ${change} changes during capture`, async () => {
      let current = true
      let options: FileViewerOptions = {}
      const request = createFileViewerSnapshotDownload({
        getOptions: () => options,
        isCurrent: () => current,
        beforeDownload: async () => true
      })
      expect(
        await request(async () => {
          if (change === 'file') current = false
          if (change === 'permission') options = { toolbar: { permissions: { download: false } } }
          if (change === 'watermark') options = { watermark: true }
          return { blob: new Blob(['image']), filename: 'drawing.png' }
        })
      ).toBe(false)
      expect(triggerFileViewerBlobDownload).not.toHaveBeenCalled()
    })
  }

  it('keeps capture errors visible and never downloads incomplete output', async () => {
    const request = createFileViewerSnapshotDownload({
      getOptions: () => ({}),
      isCurrent: () => true,
      beforeDownload: async () => true
    })
    await expect(
      request(async () => {
        throw new Error('Watermark missing')
      })
    ).rejects.toThrow('Watermark missing')
    expect(triggerFileViewerBlobDownload).not.toHaveBeenCalled()
  })

  it('refuses a watermark edited in place while image capture is pending', async () => {
    const watermark = { text: 'INITIAL' }
    const request = createFileViewerSnapshotDownload({
      getOptions: () => ({ watermark }),
      isCurrent: () => true,
      beforeDownload: async () => true
    })
    expect(
      await request(async (capturedWatermark) => {
        watermark.text = 'UPDATED'
        expect(capturedWatermark).toEqual({ text: 'INITIAL' })
        return { blob: new Blob(['image']), filename: 'drawing.png' }
      })
    ).toBe(false)
    expect(triggerFileViewerBlobDownload).not.toHaveBeenCalled()
  })
})

describe('Canvas image encoding', () => {
  it('rejects unsupported types and unbounded or empty canvases before allocating', async () => {
    for (const [width, height] of [
      [0, 10],
      [10000, 10000]
    ]) {
      await expect(
        createFileViewerCanvasImageBlob({ width, height } as HTMLCanvasElement, 'png')
      ).rejects.toThrow('size')
    }
    await expect(
      createFileViewerCanvasImageBlob({} as HTMLCanvasElement, 'gif' as 'png')
    ).rejects.toThrow('Unsupported')
  })

  for (const format of ['png', 'jpeg'] as const) {
    it(`encodes detached ${format} pixels with a verified MIME type`, async () => {
      const context = { drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: '' }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => context,
        toBlob: (done: (blob: Blob) => void, mime: string) =>
          done(new Blob(['pixels'], { type: mime }))
      }
      const snapshot = {
        width: 800,
        height: 600,
        ownerDocument: { createElement: () => canvas }
      } as unknown as HTMLCanvasElement
      const blob = await createFileViewerCanvasImageBlob(snapshot, format)
      expect(blob.type).toBe(`image/${format}`)
      expect(context.drawImage).toHaveBeenCalledWith(snapshot, 0, 0)
      expect(context.fillRect).toHaveBeenCalledTimes(format === 'jpeg' ? 1 : 0)
    })
  }
})
