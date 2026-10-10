// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  FileRenderContext,
  FileViewerRenderedInstance,
  FileViewerViewStateProvider,
  FileViewerZoomProvider
} from '@file-viewer/core'

const providers = vi.hoisted(() => ({
  view: new Map<HTMLElement, FileViewerViewStateProvider>(),
  zoom: new Map<HTMLElement, FileViewerZoomProvider>()
}))

// Real renderer code and jsdom are used. Core registration/emission and browser
// image decoding are test doubles: this suite tests controls, not pixel fidelity.
vi.mock('@file-viewer/core', () => {
  const emitter = () => ({ emit: () => {}, subscribe: () => () => {} })
  return {
    createFileViewerTranslator: () => (key: string) => key,
    createFileViewerViewStateChange: (state: unknown, options: object) => ({
      state, ...options, timestamp: Date.now()
    }),
    createFileViewerViewStateChangeEmitter: emitter,
    createFileViewerZoomChangeEmitter: emitter,
    registerFileViewerViewStateProvider: (root: HTMLElement, provider: FileViewerViewStateProvider) => {
      providers.view.set(root, provider)
    },
    registerFileViewerZoomProvider: (root: HTMLElement, provider: FileViewerZoomProvider) => {
      providers.zoom.set(root, provider)
    },
    unregisterFileViewerViewStateProvider: (root: HTMLElement) => providers.view.delete(root),
    unregisterFileViewerZoomProvider: (root: HTMLElement) => providers.zoom.delete(root),
    resolveFileViewerFitScale: () => 0.5
  }
})

import renderImage from '../packages/renderers/image/src/image'
import renderCoreImage from '../packages/core/src/renderers/image'
import { renderTiffWithDecoder } from '../packages/renderers/image/src/tiff'

const instances: FileViewerRenderedInstance[] = []
const descriptors: Array<[object, string, PropertyDescriptor | undefined]> = []
const property = (target: object, key: string, value: unknown) => {
  descriptors.push([target, key, Object.getOwnPropertyDescriptor(target, key)])
  Object.defineProperty(target, key, { configurable: true, writable: true, value })
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(40)
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(20)
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(800)
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(600)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {}
  }) as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
    callback(new Blob(['mock-png'], { type: 'image/png' }))
  })
  let nextUrl = 0
  property(window.URL, 'createObjectURL', vi.fn(() => `blob:issue-298-${++nextUrl}`))
  property(window.URL, 'revokeObjectURL', vi.fn())
  property(Element.prototype, 'scrollIntoView', vi.fn())
})

afterEach(() => {
  for (const instance of instances.splice(0)) instance.unmount?.()
  for (const [target, key, descriptor] of descriptors.splice(0).reverse()) {
    if (descriptor) Object.defineProperty(target, key, descriptor)
    else Reflect.deleteProperty(target, key)
  }
  providers.view.clear()
  providers.zoom.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

const context = (rotation?: boolean) => ({
  options: rotation === undefined ? {} : { image: { rotation } }
}) as FileRenderContext

const mount = async (rotation?: boolean, tiff = false) => {
  const target = document.createElement('div')
  document.body.append(target)
  const instance = tiff
    ? await renderTiffWithDecoder(new ArrayBuffer(8), target, {
        decode: () => [
          { t256: [2], t257: [1] }, { t256: [2], t257: [1] }
        ],
        decodeImage: () => {},
        toRGBA8: () => new Uint8Array(8)
      }, context(rotation))
    : await renderImage(new Uint8Array([1, 2, 3]).buffer, target, 'png', context(rotation))
  instances.push(instance)
  const root = target.querySelector<HTMLElement>('.image-viewer')!
  const view = providers.view.get(root)!
  const zoom = providers.zoom.get(root)!
  return { target, root, view, zoom }
}

describe('per-viewer image rotation option (#298)', () => {
  it('preserves the default controls and user rotation', async () => {
    const { root, view } = await mount()
    expect(root.querySelectorAll('.image-toolbar button')).toHaveLength(2)
    root.querySelector<HTMLButtonElement>('[title="image.toolbar.rotateRight"]')!.click()
    expect(view.getState().rotation).toBe(90)
  })
  it('preserves explicitly enabled view-state rotation', async () => {
    const { view } = await mount(true)
    await view.applyState!({ rotation: -90 })
    expect(view.getState().rotation).toBe(270)
  })
  it('omits rotation controls when disabled, without hiding the preview', async () => {
    const { root } = await mount(false)
    expect(root.querySelector('.image-toolbar')).toBeNull()
    expect(root.querySelector('.image-stage img')).not.toBeNull()
  })
  it('ignores rotation restore while retaining zoom', async () => {
    const { view, zoom } = await mount(false)
    await view.applyState!({ rotation: 90, scale: 0.5 })
    expect(view.getState().rotation).toBe(0)
    expect(view.getState().scale).toBe(0.5)
    expect((await zoom.zoomIn()).scale).toBeGreaterThan(0.5)
  })
  it('does not leak the switch between viewer instances', async () => {
    const disabled = await mount(false)
    const enabled = await mount()
    expect(disabled.root.querySelector('.image-toolbar')).toBeNull()
    expect(enabled.root.querySelector('.image-toolbar')).not.toBeNull()
  })
})

describe('multipage TIFF rotation option (#298)', () => {
  it('preserves default TIFF rotation controls', async () => {
    const { root, view } = await mount(undefined, true)
    expect(root.querySelectorAll('.tiff-toolbar button')).toHaveLength(2)
    root.querySelector<HTMLButtonElement>('[title="image.toolbar.rotateRight"]')!.click()
    expect(view.getState().rotation).toBe(90)
  })
  it('retains accessible page status without rotation controls', async () => {
    const { root } = await mount(false, true)
    expect(root.querySelectorAll('.tiff-toolbar button')).toHaveLength(0)
    expect(root.querySelector('.tiff-rotation-meter')).toBeNull()
    const meter = root.querySelector<HTMLElement>('.tiff-page-meter')!
    expect(meter.textContent).toBe('1 / 2')
    expect(meter.getAttribute('aria-live')).toBe('polite')
    expect(root.querySelector('.tiff-toolbar')!.hasAttribute('role')).toBe(false)
  })
  it('ignores rotation while retaining zoom and page restoration', async () => {
    const { root, view } = await mount(false, true)
    await view.applyState!({ rotation: 270, scale: 0.5, page: 2 })
    expect(view.getState().rotation).toBe(0)
    expect(view.getState().scale).toBe(0.5)
    expect(view.getState().page).toBe(2)
    expect(root.querySelector('.tiff-page-meter')!.textContent).toBe('2 / 2')
    for (const image of root.querySelectorAll<HTMLElement>('.tiff-frame img')) {
      expect(image.style.getPropertyValue('--image-rotation')).toBe('0deg')
    }
  })
})

it('includes image options in the Vue3 renderer-reload dependencies', () => {
  // jsdom rewrites import.meta.url to a non-file scheme; resolve from the repo root.
  const source = readFileSync(join(
    process.cwd(), 'packages/components/vue3/src/package/components/FileViewer/FileViewer.vue'
  ), 'utf8')
  expect(source).toMatch(/getRenderOptions:\s*\(\)\s*=>\s*\[[\s\S]*?effectiveOptions\.value\?\.image[\s\S]*?\]/)
})

describe.each([
  ['standalone image', renderImage],
  ['core image', renderCoreImage]
] as const)('%s ResizeObserver lifecycle', (_name, renderer) => {
  const setup = async () => {
    const frames = new Map<number, FrameRequestCallback>()
    let sequence = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++sequence
      frames.set(id, callback)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id)
    })
    let deliver!: () => void
    let observing = false
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          deliver = () => callback([], this as unknown as ResizeObserver)
        }
        observe() {
          observing = true
        }
        disconnect() {
          observing = false
        }
      }
    )
    const target = document.createElement('div')
    document.body.append(target)
    const instance = await renderer(new Uint8Array([1, 2, 3]).buffer, target, 'png')
    instances.push(instance)
    const root = target.querySelector<HTMLElement>('.image-viewer')!
    const image = root.querySelector('img')!
    let width = 800
    let height = 600
    Object.defineProperties(root, {
      clientWidth: { configurable: true, get: () => width },
      clientHeight: { configurable: true, get: () => height }
    })
    const frame = () => {
      const pending = [...frames]
      frames.clear()
      for (const [, callback] of pending) callback(performance.now())
    }
    frame()
    return {
      target,
      instance,
      image,
      frames,
      frame,
      deliver,
      observing: () => observing,
      resize: (nextWidth: number, nextHeight: number) => {
        width = nextWidth
        height = nextHeight
        deliver()
      }
    }
  }

  it('keeps geometry writes outside observer delivery and coalesces to the latest viewport', async () => {
    const view = await setup()
    expect(view.image.style.width).toBe('40px')
    view.resize(80, 80)
    view.resize(70, 80)
    expect(view.image.style.width).toBe('40px')
    expect(view.frames.size).toBe(1)
    view.frame()
    expect(view.image.style.width).toBe('22px')
    expect(view.frames.size).toBe(0)
    expect(view.observing()).toBe(true)
  })

  it('disconnects and cancels pending geometry writes on destroy, including stale delivery', async () => {
    const view = await setup()
    view.resize(70, 80)
    view.instance.unmount?.()
    const removedStyle = view.image.style.cssText
    expect(view.observing()).toBe(false)
    expect(view.frames.size).toBe(0)
    expect(view.target.childElementCount).toBe(0)
    view.resize(88, 80)
    view.frame()
    expect(view.image.style.cssText).toBe(removedStyle)
    expect(view.frames.size).toBe(0)
  })
})
