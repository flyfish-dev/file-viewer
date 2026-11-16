// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViewerController, ViewerMountOptions } from '../packages/components/web/src'
import { createRendererRegistry } from '../packages/core/src'
import type { RendererLoadContext } from '../packages/core/src'
import { mountViewer as mountCoreViewer } from '../packages/core/src/browser'
import { withFullControllerOptions } from '../packages/components/web-full/src/controller-options'

const base = vi.hoisted(() => ({ mount: vi.fn(), load: vi.fn(), update: vi.fn() }))
vi.mock('../packages/components/web/dist/index.js', () => ({
  default: {},
  FileViewerElement: class {},
  FILE_VIEWER_ELEMENT_TAG: 'flyfish-file-viewer',
  createViewerControllerHandle: vi.fn(),
  mountViewer: base.mount,
}))
vi.mock('../packages/presets/all/dist/index.js', async () => ({
  ...await import('../packages/presets/all/src/fullAssets'),
  default: { id: 'all', renderers: [] },
}))

import * as esm from '../packages/components/web-full/src/index'
import * as iife from '../packages/components/web-full/src/iife'

describe.each([['ESM', esm], ['IIFE', iife]] as const)('Full %s imperative options', (_entry, full) => {
  let original: ViewerController
  beforeEach(() => {
    vi.resetAllMocks()
    base.load.mockReturnValue(Promise.resolve())
    base.update.mockReturnValue(Promise.resolve())
    original = { load: base.load, update: base.update } as unknown as ViewerController
    base.mount.mockReturnValue(original)
    full.setDefaultFullAssetBaseUrl('/tenant/file-viewer/')
  })

  it.each(['load', 'update'] as const)('completes partial PPT options on %s with the TypeScript engine assets', async method => {
    const controller = full.mountViewer({} as HTMLElement)
    const input = { url: '/files/slides.ppt', filename: 'slides.ppt',
      options: { presentation: Object.freeze({ pptWorker: true as const, pptCache: false }) } }
    await controller[method](input)
    const forwarded = base[method].mock.calls[0][0] as ViewerMountOptions
    expect(forwarded).toMatchObject(input)
    expect(forwarded.options?.presentation?.pptModuleUrl).toContain('/tenant/file-viewer/vendor/ppt/dist/pptjs.mjs?file-viewer-ppt=1.0.2')
    expect(forwarded.options?.presentation?.pptWorkerUrl).toContain('/tenant/file-viewer/vendor/ppt/dist/pptjs.worker.js?file-viewer-ppt=1.0.2')
    expect(forwarded.options?.presentation?.pptWasmUrl).toBeUndefined()
    expect(forwarded.options?.presentation?.pptFontUrl).toBeUndefined()
    expect(Object.keys(forwarded.options!)).toEqual(['presentation'])
    expect(input.options.presentation).toEqual({ pptWorker: true, pptCache: false })
  })

  it.each(['load', 'update'] as const)('completes partial PDF options on %s without discarding request data or callbacks', async method => {
    const controller = full.mountViewer({} as HTMLElement)
    const headers = Object.freeze({ Authorization: 'fixture-only', 'X-Viewer': 'test' })
    const onEvent = vi.fn(), onStateChange = vi.fn()
    const input = { url: '/download?id=42', filename: 'document.pdf', headers, onEvent, onStateChange,
      options: { pdf: { streaming: true, disableStream: true, disableAutoFetch: true, withCredentials: true } } }
    await controller[method](input)
    const forwarded = base[method].mock.calls[0][0]
    expect(forwarded).toMatchObject(input)
    expect(forwarded.headers).toBe(headers)
    expect(forwarded.onEvent).toBe(onEvent)
    expect(forwarded.onStateChange).toBe(onStateChange)
    expect(forwarded.options.pdf.workerUrl).toContain('/tenant/file-viewer/vendor/pdf/pdf.worker.mjs')
    expect(forwarded.options.pdf.cMapUrl).toContain('/tenant/file-viewer/vendor/pdf/cmaps/')
    expect(Object.keys(forwarded.options)).toEqual(['pdf'])
  })

  it('preserves explicit URLs and the PDF asset-base umbrella', async () => {
    const controller = full.mountViewer({} as HTMLElement)
    await controller.update({ options: { presentation: {
      pptModuleUrl: '/custom/ppt.mjs', pptWorkerUrl: '/custom/ppt.worker.js', workerUrl: '/custom/pptx.worker.js',
    } } })
    expect(base.update.mock.calls[0][0].options.presentation).toEqual({
      pptModuleUrl: '/custom/ppt.mjs', pptWorkerUrl: '/custom/ppt.worker.js', workerUrl: '/custom/pptx.worker.js',
    })
    await controller.update({ options: { pdf: { assetBaseUrl: '/custom/pdf/', streaming: true } } })
    expect(base.update.mock.calls[1][0].options).toEqual({ pdf: { assetBaseUrl: '/custom/pdf/', streaming: true } })
  })

  it('delegates source-only inputs and omitted update arguments unchanged', async () => {
    const controller = full.mountViewer({} as HTMLElement)
    const source = { buffer: new Uint8Array([1, 2]).buffer, filename: 'replacement.ppt' }
    await controller.load(source)
    await controller.update(source)
    await controller.update()
    expect(base.load.mock.calls[0][0]).toBe(source)
    expect(base.update.mock.calls[0][0]).toBe(source)
    expect(base.update.mock.calls[1][0]).toBeUndefined()
  })

  it('keeps unrelated groups omitted and preserves explicit language-clearing fields', async () => {
    const controller = full.mountViewer({} as HTMLElement, {
      options: { presentation: { pptModuleUrl: '/custom/previous.mjs' }, locale: 'ru-RU' },
    })
    await controller.update({ options: { theme: 'dark' } })
    expect(base.update.mock.calls[0][0].options).toEqual({ theme: 'dark' })
    const clear = { locale: undefined, messages: undefined, i18n: undefined }
    await controller.update({ options: clear })
    expect(base.update.mock.calls[1][0].options).toEqual(clear)
    expect(Object.keys(base.update.mock.calls[1][0].options)).toEqual(Object.keys(clear))
    await controller.load({ url: '/reset.pdf', options: {} })
    expect(base.load.mock.calls[0][0].options).toEqual({})
  })

  it.each(['load', 'update'] as const)('retains controller identity, this, the original promise and raw %s rejection', async method => {
    const controller = full.mountViewer({} as HTMLElement)
    expect(controller).toBe(original)
    const reason = { original: method }
    const promise = Promise.reject(reason)
    base[method].mockReturnValueOnce(promise)
    const result = controller[method]({ options: { presentation: { pptWorker: 'auto' } } })
    expect(result).toBe(promise)
    await expect(result).rejects.toBe(reason)
    expect(base[method].mock.contexts[0]).toBe(original)
  })
})

describe.each([false, true])('actual Core nullish JS compatibility, Full adapter=%s', adapted => {
  const cleanup: Array<() => void> = []
  afterEach(() => {
    cleanup.splice(0).reverse().forEach(destroy => destroy())
    document.body.replaceChildren()
  })
  const mount = () => {
    const host = document.createElement('div')
    document.body.append(host)
    const render = vi.fn(async (_context: RendererLoadContext) => ({}))
    const registry = createRendererRegistry([{
      id: 'full-nullish', label: 'Full nullish input', category: 'document', extensions: ['nullish'], load: render,
    }])
    const controller = mountCoreViewer(host, { options: {
      autoRenderers: false, styleIsolation: 'none', locale: 'ru-RU',
      messages: { 'toolbar.print': 'Retained print' }, presentation: { pptModuleUrl: '/kept/ppt.mjs' },
    } }, { registry })
    cleanup.push(() => controller.destroy())
    const normalize = vi.fn(esm.withFullMountOptions)
    return { controller: adapted ? withFullControllerOptions(controller, normalize) : controller, render, normalize }
  }

  it('keeps the real load(options:null) retention path instead of normalizing it', async () => {
    const { controller, render, normalize } = mount()
    // Null is a supported JS load fallback, though ViewerMountOptions only types undefined.
    await controller.load({ buffer: new Uint8Array([1]).buffer, filename: 'fixture.nullish', options: null } as unknown as ViewerMountOptions)
    expect(render).toHaveBeenCalledOnce()
    const context = render.mock.calls[0][0]
    expect(context.options.presentation).toEqual({ pptModuleUrl: '/kept/ppt.mjs' })
    expect(context.renderContext.i18n.locale).toBe('ru-RU')
    expect(context.renderContext.i18n.t('toolbar.print')).toBe('Retained print')
    expect(normalize).not.toHaveBeenCalled()
    await expect(controller.update()).resolves.toBeUndefined()
  })

  it.each([
    ['load', undefined], ['load', null], ['update', null], ['update', { options: null }],
  ] as const)('keeps unsupported %s(%s) as the original async rejection', async (method, input) => {
    const { controller, normalize } = mount()
    const runtime = controller as unknown as { load(input?: unknown): Promise<void>; update(input?: unknown): Promise<void> }
    let result!: Promise<void>
    expect(() => { result = runtime[method](input) }).not.toThrow()
    await expect(result).rejects.toBeInstanceOf(TypeError)
    expect(normalize).not.toHaveBeenCalled()
  })

  it.each([
    ['load', 'options'], ['load', 'headers'], ['update', 'options'], ['update', 'headers'],
  ] as const)('keeps %s input %s getter failures asynchronous with the original reason', async (method, field) => {
    const { controller } = mount()
    const reason = { original: `${method}.${field}` }
    const input = { options: { presentation: { pptWorker: 'auto' as const } } }
    Object.defineProperty(input, field, { enumerable: true, get() { throw reason } })
    let result!: Promise<void>
    expect(() => { result = controller[method](input) }).not.toThrow()
    await expect(result).rejects.toBe(reason)
  })
})

describe('Full configured asset directories', () => {
  const browserHost = window as unknown as Record<string, unknown>
  let previousBucket: unknown
  beforeEach(() => {
    const base = document.createElement('base')
    base.dataset.fullBaseTest = 'true'
    base.href = 'https://app.example/tenant/page/'
    document.head.prepend(base)
    previousBucket = browserHost.FlyfishFileViewerWebFullRenderers
    browserHost.FlyfishFileViewerWebFullRenderers = {}
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.querySelectorAll('[data-full-base-test]').forEach(node => node.remove())
    browserHost.FlyfishFileViewerWebFullRenderers = previousBucket
    esm.resetDefaultFullAssetBaseUrl()
    iife.resetDefaultFullAssetBaseUrl()
  })

  const directories = [
    ['/full', '/full/', 'https://app.example/full/renderers/spreadsheet.iife.js'],
    [' /full/ ', '/full/', 'https://app.example/full/renderers/spreadsheet.iife.js'],
    ['assets/full', 'assets/full/', 'https://app.example/tenant/page/assets/full/renderers/spreadsheet.iife.js'],
    ['./full/', './full/', 'https://app.example/tenant/page/full/renderers/spreadsheet.iife.js'],
    ['../shared/', '../shared/', 'https://app.example/tenant/shared/renderers/spreadsheet.iife.js'],
    ['//assets.example/full', '//assets.example/full/', 'https://assets.example/full/renderers/spreadsheet.iife.js'],
    ['https://cdn.example/pkg/full', 'https://cdn.example/pkg/full/', 'https://cdn.example/pkg/full/renderers/spreadsheet.iife.js'],
    [new URL('https://assets.example/url-object/'), 'https://assets.example/url-object/', 'https://assets.example/url-object/renderers/spreadsheet.iife.js'],
  ] as const

  it.each(directories)('resolves IIFE renderer scripts against the document base for %s', (input, stored, expected) => {
    iife.setDefaultFullAssetBaseUrl(input)
    expect(iife.getDefaultFullAssetBaseUrl()).toBe(stored)
    for (const selector of ['spreadsheet', 'spreadsheet-openxml', '.xlsx']) {
      expect(iife.getFullRendererScriptUrl(selector)).toBe(expected)
    }
  })

  it.each([['ESM', esm], ['IIFE', iife]] as const)('keeps %s setter/getter and explicit resource overrides compatible', (_name, full) => {
    for (const [input, stored] of directories) {
      full.setDefaultFullAssetBaseUrl(input)
      expect(full.getDefaultFullAssetBaseUrl()).toBe(stored)
      expect(full.withFullViewerOptions().spreadsheet?.workerUrl).toBe(`${stored}vendor/xlsx/sheet.worker.js`)
      expect(full.withFullViewerOptions({ spreadsheet: { workerUrl: '/custom/sheet.js' } }).spreadsheet?.workerUrl).toBe('/custom/sheet.js')
    }
  })

  it.each([null, undefined, '', ' \t '])('keeps clear distinct from reset for %s', clear => {
    const initialAsset = iife.getDefaultFullAssetBaseUrl()
    const initialRenderer = iife.getFullRendererScriptUrl('spreadsheet')
    for (const full of [esm, iife]) {
      full.setDefaultFullAssetBaseUrl('/custom/')
      full.setDefaultFullAssetBaseUrl(clear)
      expect(full.getDefaultFullAssetBaseUrl()).toBeUndefined()
      expect(full.withFullViewerOptions().spreadsheet?.workerUrl).toBeUndefined()
    }
    expect(iife.getFullRendererScriptUrl('spreadsheet')).toBe('https://app.example/tenant/page/renderers/spreadsheet.iife.js')
    iife.resetDefaultFullAssetBaseUrl()
    expect(iife.getDefaultFullAssetBaseUrl()).toBe(initialAsset)
    expect(iife.getFullRendererScriptUrl('spreadsheet')).toBe(initialRenderer)
  })

  it('keeps explicit per-call bases and invalid URL errors visible', () => {
    iife.setDefaultFullAssetBaseUrl('/configured/')
    expect(iife.getFullRendererScriptUrl('xlsx', '/one-off/')).toBe('https://app.example/one-off/renderers/spreadsheet.iife.js')
    expect(iife.getDefaultFullAssetBaseUrl()).toBe('/configured/')
    expect(() => iife.getFullRendererScriptUrl('xlsx', 'http://[')).toThrow(TypeError)
    expect(() => iife.getFullRendererScriptUrl('xlsx', 'data:text/plain,opaque')).toThrow(TypeError)
    expect(iife.getFullRendererScriptUrl('unknown-renderer', 'http://[')).toBeUndefined()
  })

  it('uses the document for configured relative directories and restores separate inferred initial bases', async () => {
    const entry = document.createElement('script')
    entry.dataset.fullBaseTest = 'true'
    entry.src = 'https://cdn.example/bundle/assets/app-a1b2.js'
    entry.type = 'module'
    document.head.append(entry)
    vi.spyOn(document, 'currentScript', 'get').mockReturnValue(entry)
    vi.resetModules()
    const fresh = await import('../packages/components/web-full/src/iife')
    const initialAsset = fresh.getDefaultFullAssetBaseUrl()
    const initialRenderer = fresh.getFullRendererScriptUrl('xlsx')
    expect(initialAsset).toBe('https://app.example/tenant/page/')
    expect(initialRenderer).toBe('https://cdn.example/bundle/assets/renderers/spreadsheet.iife.js')
    fresh.setDefaultFullAssetBaseUrl('/configured/')
    expect(fresh.getFullRendererScriptUrl('xlsx')).toBe('https://app.example/configured/renderers/spreadsheet.iife.js')
    fresh.resetDefaultFullAssetBaseUrl()
    expect(fresh.getDefaultFullAssetBaseUrl()).toBe(initialAsset)
    expect(fresh.getFullRendererScriptUrl('xlsx')).toBe(initialRenderer)
  })

  it('loads the resolved renderer script once and keeps the existing renderer cache across setter calls', async () => {
    iife.setDefaultFullAssetBaseUrl('/full/')
    const plugin = { id: 'fixture-spreadsheet', handlers: [] }
    const scripts: HTMLScriptElement[] = []
    vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
      expect(node).toBeInstanceOf(HTMLScriptElement)
      const script = node as HTMLScriptElement
      scripts.push(script)
      queueMicrotask(() => {
        const bucket = browserHost.FlyfishFileViewerWebFullRenderers as Record<string, unknown>
        bucket.spreadsheet = plugin
        script.dispatchEvent(new Event('load'))
      })
      return node
    })
    const loaded = await Promise.all([iife.preloadFullRenderer('xlsx'), iife.preloadFullRenderer('spreadsheet')])
    expect(loaded).toEqual([plugin, plugin])
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe('https://app.example/full/renderers/spreadsheet.iife.js')
    iife.setDefaultFullAssetBaseUrl('/other/')
    expect(await iife.preloadFullRenderer('xlsx')).toBe(plugin)
    expect(scripts).toHaveLength(1)
  })
})
