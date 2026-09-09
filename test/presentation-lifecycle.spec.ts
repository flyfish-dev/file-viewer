import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import renderPptx from '../packages/renderers/presentation-pptx/src/index'
import {
  resetDefaultFileViewerAssetBaseUrl,
  setDefaultFileViewerAssetBaseUrl
} from '../packages/core/src/platform/assets'

const { resolvePackageWorker } = vi.hoisted(() => ({ resolvePackageWorker: vi.fn() }))
vi.mock('../packages/renderers/pptx/dist/index.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../packages/renderers/pptx/dist/index.js')>(),
  resolvePptxPackageWorkerUrl: resolvePackageWorker
}))

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

class FakeWorker {
  static instances: FakeWorker[] = []
  static constructorError: Error | null = null
  private listeners = new Map<string, Array<(event: any) => void>>()
  terminated = false
  url: string

  constructor(url: string | URL) {
    if (FakeWorker.constructorError) {
      throw FakeWorker.constructorError
    }
    this.url = String(url)
    FakeWorker.instances.push(this)
  }

  addEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.listeners.get(type) || []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  postMessage() {}

  terminate() {
    this.terminated = true
  }

  emitMessage(data: unknown) {
    this.listeners.get('message')?.forEach(listener => listener({ data }))
  }
}

const createTarget = () => {
  const { window } = new JSDOM('<div id="target"></div>', { url: 'http://localhost' })
  const { document } = window
  const requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  }
  Object.assign(window, {
    Worker: FakeWorker,
    ResizeObserver: FakeResizeObserver,
    requestAnimationFrame,
    cancelAnimationFrame: () => {},
    getComputedStyle: () => ({ overflow: 'visible', overflowY: 'visible' }),
  })
  Object.assign(globalThis, {
    Document: window.Document,
    HTMLElement: window.HTMLElement,
    ShadowRoot: window.ShadowRoot,
    Worker: FakeWorker,
    ResizeObserver: FakeResizeObserver,
  })
  return document.getElementById('target') as HTMLDivElement
}

describe('@file-viewer/renderer-presentation lifecycle', () => {
  beforeEach(() => {
    FakeWorker.instances = []
    FakeWorker.constructorError = null
    resolvePackageWorker.mockReset()
    resetDefaultFileViewerAssetBaseUrl()
    // Resource discovery is tested separately; lifecycle units must not depend
    // on a real service (or proxy) bound to the fake document's localhost URL.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
  })
  afterEach(() => {
    resetDefaultFileViewerAssetBaseUrl()
    vi.unstubAllGlobals()
  })

  it('does not probe copied assets when an explicit Worker URL is configured', async () => {
    const target = createTarget()
    const workerUrl = 'https://example.test/private/pptx.worker.js'
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      options: { presentation: { workerUrl } },
    })
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    expect(FakeWorker.instances[0]!.url).toBe(workerUrl)
    expect(fetch).not.toHaveBeenCalled()
    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })
    const rendered = await renderPromise
    rendered.unmount()
  })

  it('uses the package-emitted Worker without fetching absent copy manifests', async () => {
    const target = createTarget()
    const workerUrl = 'https://example.test/ui/assets/pptx.worker-hash.js'
    resolvePackageWorker.mockReturnValue(workerUrl)
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx')
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    expect(FakeWorker.instances[0]!.url).toBe(workerUrl)
    expect(fetch).not.toHaveBeenCalled()
    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })
    const rendered = await renderPromise
    rendered.unmount()
  })

  it('keeps an explicitly configured shared asset root ahead of the package asset', async () => {
    const target = createTarget()
    setDefaultFileViewerAssetBaseUrl('https://example.test/private/file-viewer/')
    resolvePackageWorker.mockReturnValue('https://example.test/ui/assets/pptx.worker-hash.js')
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx')
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    const workerUrl = FakeWorker.instances[0]!.url
    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })
    const rendered = await renderPromise
    rendered.unmount()
    expect(workerUrl).toBe('https://example.test/private/file-viewer/vendor/pptx/pptx.worker.js')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('cancels during copied-asset discovery without starting a stale Worker', async () => {
    const target = createTarget()
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })))
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      signal: controller.signal,
    })
    const rejected = expect(renderPromise).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    controller.abort(new DOMException('source switched', 'AbortError'))
    await rejected
    expect(FakeWorker.instances).toHaveLength(0)
    expect(target.textContent).toBe('')
  })

  it('does not resolve the renderer before PPTX render completion', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    let settled = false
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      registerExportAdapter,
    }).then(result => {
      settled = true
      return result
    })

    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(registerExportAdapter).not.toHaveBeenCalledWith(expect.objectContaining({ print: true }))

    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })
    const rendered = await renderPromise
    expect(settled).toBe(true)
    expect(registerExportAdapter).toHaveBeenCalledWith(expect.objectContaining({
      print: true,
      exportHtml: true,
    }))
    rendered.unmount()
  })

  it('rejects fatal PPTX errors instead of completing the load', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      registerExportAdapter,
    })

    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    const failure = new Error('invalid pptx package')
    FakeWorker.instances[0]!.emitMessage({ type: 'ERROR', data: failure })

    await expect(renderPromise).rejects.toBe(failure)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)
    expect(registerExportAdapter).toHaveBeenLastCalledWith(null)
    expect(target.textContent).toBe('')
  })

  it('keeps a single failed slide as a warning and completes the remaining presentation', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      registerExportAdapter,
    })

    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    FakeWorker.instances[0]!.emitMessage({
      type: 'slide-error',
      slide_num: 1,
      data: { code: 'PPTX_SLIDE_RENDER_FAILED', message: 'broken relationship on slide 1' },
    })
    FakeWorker.instances[0]!.emitMessage({
      type: 'slide',
      slide_num: 2,
      data: '<section class="slide" data-slide-index="2">SLIDE_TWO_OK</section>',
    })
    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })

    const rendered = await renderPromise
    expect(target.textContent).toContain('broken relationship on slide 1')
    expect(target.textContent).toContain('SLIDE_TWO_OK')
    expect(registerExportAdapter).toHaveBeenCalledWith(expect.objectContaining({ print: true }))
    expect(warning).toHaveBeenCalledWith(
      'PPTX slide render warning:',
      expect.objectContaining({ code: 'PPTX_SLIDE_RENDER_FAILED' })
    )
    rendered.unmount()
    warning.mockRestore()
  })

  it('materializes every lazy slide in exported HTML before restoring the live window', async () => {
    const target = createTarget()
    let exportAdapter: { toHtml?: (options: any) => Promise<string> | string } | null = null
    const registerExportAdapter = vi.fn(adapter => {
      if (adapter?.toHtml) exportAdapter = adapter
    })
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      registerExportAdapter,
    })

    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    for (let slide = 1; slide <= 20; slide += 1) {
      FakeWorker.instances[0]!.emitMessage({
        type: 'slide',
        slide_num: slide,
        data: `<section class="slide" data-slide-index="${slide}">ISSUE112_SLIDE_${slide}</section>`,
      })
    }
    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })

    const rendered = await renderPromise
    expect(exportAdapter).not.toBeNull()
    const html = await exportAdapter!.toHtml!({ mode: 'print', title: 'twenty-slides.pptx' })
    expect((html.match(/ISSUE112_SLIDE_/g) || [])).toHaveLength(20)
    expect((html.match(/data-viewer-print-page-index=/g) || [])).toHaveLength(20)
    expect(html).toContain('data-viewer-print-page-index="19"')
    rendered.unmount()
  })

  it('rejects worker startup failures such as a CSP block', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    const failure = new Error('Refused to create a worker because of Content Security Policy')
    FakeWorker.constructorError = failure

    await expect(renderPptx(new ArrayBuffer(16), target, 'pptx', {
      registerExportAdapter,
    })).rejects.toMatchObject({ code: 'PPTX_WORKER_FAILED' })

    expect(registerExportAdapter).toHaveBeenLastCalledWith(null)
    expect(target.textContent).toBe('')
  })

  it('cancels the active viewer and ignores late completion after a source switch', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    const controller = new AbortController()
    const renderPromise = renderPptx(new ArrayBuffer(16), target, 'pptx', {
      registerExportAdapter,
      signal: controller.signal,
    })

    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
    controller.abort(new DOMException('source switched', 'AbortError'))
    await expect(renderPromise).rejects.toMatchObject({ name: 'AbortError' })
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    FakeWorker.instances[0]!.emitMessage({ type: 'Done', charts: null })
    await Promise.resolve()
    expect(registerExportAdapter).not.toHaveBeenCalledWith(expect.objectContaining({ print: true }))
  })
})
