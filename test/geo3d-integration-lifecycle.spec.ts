// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  createFileViewerLoadStartState,
  createFileViewerRenderCompleteState,
  createFileViewerRequestController,
  createViewer,
  registerFileViewerViewStateProvider,
  unregisterFileViewerViewStateProvider,
  runFileViewerLocalFilePreview,
  runFileViewerRemoteFilePreview
} from '../packages/core/src'

describe('streaming renderer integration boundaries', () => {
  it.each(['abort', 'unload', 'replace'] as const)(
    'does not publish load-complete after an initial fit becomes stale on %s',
    async (action) => {
      let entered!: () => void
      let release!: () => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      const fitting = new Promise<void>((resolve) => {
        release = resolve
      })
      const completed = vi.fn()
      const destroy = vi.fn()
      const host = document.createElement('div')
      document.body.append(host)
      const viewer = createViewer(host, {
        onEvent: (event) => {
          if (event.type === 'load-complete') completed(event)
        },
        options: {
          fit: 'contain',
          autoRenderers: false,
          rendererMode: 'replace',
          renderers: [
            {
              id: 'late-fit',
              definitions: [
                { id: 'late-fit', label: 'Late fit', category: 'geo', extensions: ['las'] }
              ],
              handlers: [
                {
                  rendererId: 'late-fit',
                  handler: async (_buffer, target, _type, context) => {
                    // jsdom has no layout. Supply the viewport dimensions, while the
                    // registered provider and public viewer load path remain real.
                    Object.defineProperties(target, {
                      clientWidth: { value: 640 },
                      clientHeight: { value: 480 }
                    })
                    registerFileViewerViewStateProvider(target, {
                      getState: () => ({ scale: 1 }),
                      fit: async (request) => {
                        if (context?.filename !== 'replacement.las') {
                          entered()
                          await fitting
                        }
                        return {
                          applied: true,
                          mode: request.mode,
                          resize: request.resize,
                          source: request.source,
                          provider: 'view-state'
                        }
                      }
                    })
                    return {
                      $el: target,
                      destroy: () => {
                        unregisterFileViewerViewStateProvider(target)
                        destroy()
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      })
      const controller = new AbortController()
      try {
        const pending = viewer.load(
          { buffer: new ArrayBuffer(4), filename: 'cloud.las' },
          { signal: controller.signal }
        )
        await started
        if (action === 'abort') controller.abort()
        else if (action === 'unload') await viewer.unload()
        else await viewer.load({ buffer: new ArrayBuffer(4), filename: 'replacement.las' })
        release()
        await expect(pending).resolves.toBeNull()
        if (action === 'replace') expect(completed).toHaveBeenCalledOnce()
        else expect(completed).not.toHaveBeenCalled()
        expect(destroy).toHaveBeenCalledOnce()
      } finally {
        release()
        await viewer.destroy()
        host.remove()
      }
    }
  )

  it.each([
    { action: 'abort', stream: true },
    { action: 'replace', stream: true },
    { action: 'abort', stream: false },
    { action: 'replace', stream: false }
  ])(
    'disposes a late local-file session on $action (stream=$stream)',
    async ({ action, stream }) => {
      const requests = createFileViewerRequestController()
      const version = requests.createVersion()
      let release!: (session: object) => void
      let entered!: () => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      const session = {}
      const dispose = vi.fn()
      const ready = vi.fn()
      const previewTarget = {
        filename: '',
        file: null,
        buffer: null,
        sourceUrl: null,
        renderedReady: false,
        progressiveReady: false
      }
      const pending = runFileViewerLocalFilePreview({
        source: new File(['LASF'], 'cloud.las'),
        version,
        previewTarget,
        requestController: requests,
        isCurrent: (next) => requests.isCurrent(next),
        shouldStreamLocalFile: async () => stream,
        mountRenderedContent: () =>
          new Promise((resolve) => {
            release = resolve
            entered()
          }),
        destroyRenderSession: dispose,
        buildLoadStartState: (input) => createFileViewerLoadStartState(input),
        buildRenderCompleteState: (input) => createFileViewerRenderCompleteState(input),
        onSession: ready
      })
      await started
      if (action === 'abort') requests.abort()
      else requests.createVersion()
      release(session)
      await expect(pending).resolves.toMatchObject({ status: 'stale', error: null })
      expect(dispose).toHaveBeenCalledWith(session)
      expect(ready).not.toHaveBeenCalled()
      expect(previewTarget.renderedReady).toBe(false)
    }
  )

  it.each(['abort', 'replace'] as const)(
    'does not mount a local file after an ignored probe cancellation on %s',
    async (action) => {
      const requests = createFileViewerRequestController()
      const version = requests.createVersion()
      let entered!: () => void
      let release!: (decision: boolean) => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      const mount = vi.fn()
      const pending = runFileViewerLocalFilePreview({
        source: new File(['II'], 'cloud.tif'),
        version,
        previewTarget: {
          filename: '',
          file: null,
          buffer: null,
          sourceUrl: null,
          renderedReady: false,
          progressiveReady: false
        },
        requestController: requests,
        isCurrent: (next) => requests.isCurrent(next),
        shouldStreamLocalFile: () =>
          new Promise((resolve) => {
            release = resolve
            entered()
          }),
        mountRenderedContent: mount,
        buildLoadStartState: (input) => createFileViewerLoadStartState(input),
        buildRenderCompleteState: (input) => createFileViewerRenderCompleteState(input)
      })
      await started
      if (action === 'abort') requests.abort()
      else requests.createVersion()
      release(true)
      await expect(pending).resolves.toMatchObject({ status: 'stale', error: null })
      expect(mount).not.toHaveBeenCalled()
    }
  )

  it.each(['abort', 'replace'] as const)(
    'finalizes a local-file probe on %s without an error event',
    async (action) => {
      const requests = createFileViewerRequestController()
      const version = requests.createVersion()
      const clear = vi.spyOn(requests, 'clearAbortController')
      const mount = vi.fn()
      const error = vi.fn()
      let entered!: () => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      const pending = runFileViewerLocalFilePreview({
        source: new File(['II'], 'cloud.tif'),
        version,
        previewTarget: {
          filename: '',
          file: null,
          buffer: null,
          sourceUrl: null,
          renderedReady: false,
          progressiveReady: false
        },
        requestController: requests,
        isCurrent: (next) => requests.isCurrent(next),
        shouldStreamLocalFile: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal!.addEventListener('abort', () => reject(signal!.reason), { once: true })
            entered()
          }),
        mountRenderedContent: mount,
        buildLoadStartState: (input) => createFileViewerLoadStartState(input),
        buildRenderCompleteState: (input) => createFileViewerRenderCompleteState(input),
        onError: error
      })
      await started
      if (action === 'abort') requests.abort()
      else requests.createVersion()
      await expect(pending).resolves.toMatchObject({ status: 'stale', error: null })
      expect(clear).toHaveBeenCalledOnce()
      expect(mount).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    }
  )

  it('disposes a late headless session after its owner aborts', async () => {
    let entered!: () => void
    let release!: (session: { $el: HTMLElement; unmount: () => void }) => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const unmount = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const viewer = createViewer(host, {
      options: {
        autoRenderers: false,
        rendererMode: 'replace',
        renderers: [
          {
            id: 'late-stream',
            definitions: [
              {
                id: 'late-stream',
                label: 'Late stream',
                category: 'geo',
                extensions: ['las'],
                sourceAccess: 'stream-preferred'
              }
            ],
            handlers: [
              {
                rendererId: 'late-stream',
                handler: () =>
                  new Promise((resolve) => {
                    release = resolve
                    entered()
                  })
              }
            ]
          }
        ]
      }
    })
    const controller = new AbortController()
    try {
      const loading = viewer.load(
        { file: new Blob(['LASF']), filename: 'late.las' },
        { signal: controller.signal }
      )
      await started
      controller.abort()
      release({ $el: host, unmount })
      await expect(loading).resolves.toBeNull()
      expect(unmount).toHaveBeenCalledOnce()
    } finally {
      await viewer.destroy()
      host.remove()
    }
  })

  it('disposes a late streaming session after its request aborts', async () => {
    const requests = createFileViewerRequestController()
    const version = requests.createVersion()
    let entered!: () => void
    let release!: (session: object) => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const session = {}
    const dispose = vi.fn()
    const ready = vi.fn()
    const previewTarget = {
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    }
    const pending = runFileViewerRemoteFilePreview({
      url: 'http://localhost/cloud.las',
      version,
      previewTarget,
      requestController: requests,
      isCurrent: (next) => requests.isCurrent(next),
      shouldStreamRemoteUrl: async () => true,
      downloadFile: vi.fn(),
      mountRenderedContent: () =>
        new Promise((resolve) => {
          release = resolve
          entered()
        }),
      destroyRenderSession: dispose,
      buildLoadStartState: (input) => createFileViewerLoadStartState(input),
      buildRenderCompleteState: (input) => createFileViewerRenderCompleteState(input),
      onSession: ready
    })
    await started
    requests.abort()
    release(session)
    await expect(pending).resolves.toMatchObject({ status: 'stale', error: null })
    expect(dispose).toHaveBeenCalledWith(session)
    expect(ready).not.toHaveBeenCalled()
    expect(previewTarget.renderedReady).toBe(false)
  })

  it('passes an original Blob through the public headless viewer into its handler', async () => {
    const blob = new Blob(['LASF'], { type: 'application/octet-stream' })
    const handler = vi.fn(async (_buffer, target, _type, context) => {
      target.textContent = 'Local Blob received'
      expect(context.sourceFile).toBe(blob)
      return { $el: target, destroy: vi.fn() }
    })
    const host = document.createElement('div')
    document.body.append(host)
    const viewer = createViewer(host, {
      options: {
        autoRenderers: false,
        rendererMode: 'replace',
        renderers: [
          {
            id: 'blob-stream-test',
            definitions: [
              {
                id: 'blob-stream',
                label: 'Blob stream',
                category: 'geo',
                extensions: ['las'],
                sourceAccess: 'stream-preferred'
              }
            ],
            handlers: [{ rendererId: 'blob-stream', handler }]
          }
        ]
      }
    })
    try {
      await viewer.load({ file: blob, filename: 'cloud.las' })
      expect(handler).toHaveBeenCalledOnce()
    } finally {
      await viewer.destroy()
      host.remove()
    }
  })

  it.each(['abort', 'replace'] as const)(
    'settles a headless source probe on %s',
    async (action) => {
      let entered!: () => void
      const probeEntered = new Promise<void>((resolve) => {
        entered = resolve
      })
      const mount = vi.fn(async (_buffer, target) => ({ $el: target }))
      const host = document.createElement('div')
      document.body.append(host)
      const viewer = createViewer(host, {
        options: {
          autoRenderers: false,
          rendererMode: 'replace',
          renderers: [
            {
              id: 'probe-stream-test',
              definitions: [
                {
                  id: 'probe-stream',
                  label: 'Probe stream',
                  category: 'geo',
                  extensions: ['tif'],
                  sourceAccess: 'stream-preferred',
                  resolveSourceType: ({ signal }) =>
                    new Promise((_resolve, reject) => {
                      signal!.addEventListener('abort', () => reject(signal!.reason), {
                        once: true
                      })
                      entered()
                    })
                }
              ],
              handlers: [{ rendererId: 'probe-stream', handler: mount }]
            }
          ]
        }
      })
      const controller = new AbortController()
      try {
        const pending = viewer.load(
          { url: 'http://localhost/cloud.tif' },
          { signal: controller.signal }
        )
        await probeEntered
        if (action === 'abort') controller.abort()
        else await viewer.unload()
        await expect(pending).resolves.toBeNull()
        expect(mount).not.toHaveBeenCalled()
      } finally {
        await viewer.destroy()
        host.remove()
      }
    }
  )

  it.each(['abort', 'replace'] as const)(
    'finalizes a metadata probe on %s without rendering stale content',
    async (action) => {
      const requests = createFileViewerRequestController()
      const version = requests.createVersion()
      const clear = vi.spyOn(requests, 'clearAbortController')
      const mount = vi.fn()
      const error = vi.fn()
      const clearStarted = vi.fn()
      let entered!: () => void
      const probeEntered = new Promise<void>((resolve) => {
        entered = resolve
      })
      const pending = runFileViewerRemoteFilePreview({
        url: 'http://localhost/cloud.tif',
        version,
        previewTarget: {
          filename: '',
          file: null,
          buffer: null,
          sourceUrl: null,
          renderedReady: false,
          progressiveReady: false
        },
        requestController: requests,
        isCurrent: (next) => requests.isCurrent(next),
        shouldStreamRemoteUrl: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal!.addEventListener('abort', () => reject(signal!.reason), { once: true })
            entered()
          }),
        downloadFile: vi.fn(),
        mountRenderedContent: mount,
        buildLoadStartState: (input) => createFileViewerLoadStartState(input),
        buildRenderCompleteState: (input) => createFileViewerRenderCompleteState(input),
        onClearLoadStarted: clearStarted,
        onError: error
      })
      await probeEntered
      if (action === 'replace') requests.createVersion()
      else requests.abort()
      await expect(pending).resolves.toMatchObject({ status: 'stale', error: null })
      expect(clear).toHaveBeenCalledOnce()
      expect(clearStarted).toHaveBeenCalledWith(version)
      expect(mount).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    }
  )
})
