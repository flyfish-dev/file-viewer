import { parseHTML } from 'linkedom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ofdState = vi.hoisted(() => ({
  document: null as Document | null,
  success: null as ((documents: unknown[]) => void) | null,
  fail: null as ((error: unknown) => void) | null,
  renderCount: 0,
}))

vi.mock('../packages/renderers/ofd/vendor/dltech/ofd/ofd.js', () => ({
  parseOfdDocument: ({ success, fail }: {
    success: (documents: unknown[]) => void
    fail: (error: unknown) => void
  }) => {
    ofdState.success = success
    ofdState.fail = fail
  },
  renderOfd: () => {
    ofdState.renderCount += 1
    const page = ofdState.document!.createElement('div')
    page.textContent = `OFD_PAGE_${ofdState.renderCount}`
    return [page]
  },
}))

import renderOfd from '../packages/renderers/ofd/src/ofd'

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }
  observe() {}
  disconnect() {}
  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const createTarget = () => {
  const { document, window } = parseHTML(
    '<html><head></head><body><div id="target"></div></body></html>'
  )
  Object.assign(window, {
    ResizeObserver: FakeResizeObserver,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    },
    cancelAnimationFrame: () => {},
  })
  Object.assign(globalThis, {
    Document: window.Document,
    HTMLElement: window.HTMLElement,
    ResizeObserver: FakeResizeObserver,
  })
  ofdState.document = document
  return document.getElementById('target') as HTMLDivElement
}

describe('@file-viewer/renderer-ofd lifecycle and page surfaces', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
    ofdState.document = null
    ofdState.success = null
    ofdState.fail = null
    ofdState.renderCount = 0
  })

  it('waits for initial pages before resolving and registering page-aware export', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    let settled = false
    const renderPromise = renderOfd(new ArrayBuffer(16), target, {
      registerExportAdapter,
    }).then(result => {
      settled = true
      return result
    })

    await vi.waitFor(() => expect(ofdState.success).toBeTypeOf('function'))
    expect(settled).toBe(false)
    expect(registerExportAdapter).not.toHaveBeenCalled()

    ofdState.success!([{}])
    const rendered = await renderPromise
    const frame = target.querySelector<HTMLElement>('.ofd-page-frame')
    expect(frame?.textContent).toContain('OFD_PAGE_1')
    const adapter = registerExportAdapter.mock.calls.at(-1)?.[0]
    expect(adapter?.getPrintMaskPages()).toEqual([frame])
    rendered.unmount()
  })

  it('preserves designer canvases and stable page frames across a resize render', async () => {
    const target = createTarget()
    const renderPromise = renderOfd(new ArrayBuffer(16), target, {})
    await vi.waitFor(() => expect(ofdState.success).toBeTypeOf('function'))
    ofdState.success!([{}])
    const rendered = await renderPromise

    const frame = target.querySelector<HTMLElement>('.ofd-page-frame')!
    rendered.$el.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600,
      width: 800, height: 600, toJSON: () => ({}),
    }) as DOMRect
    const canvas = target.ownerDocument.createElement('div')
    canvas.className = 'fv-print-mask-canvas'
    frame.appendChild(canvas)
    FakeResizeObserver.instances[0]!.trigger()
    await vi.waitFor(() => expect(ofdState.renderCount).toBe(2), { timeout: 1_000 })

    expect(target.querySelector('.ofd-page-frame')).toBe(frame)
    expect(canvas.isConnected).toBe(true)
    expect(frame.textContent).toContain('OFD_PAGE_2')
    rendered.unmount()
  })

  it('rejects initial parse failures instead of emitting a completed renderer', async () => {
    const target = createTarget()
    const registerExportAdapter = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const renderPromise = renderOfd(new ArrayBuffer(16), target, { registerExportAdapter })
    await vi.waitFor(() => expect(ofdState.fail).toBeTypeOf('function'))
    const failure = new Error('invalid OFD package')
    ofdState.fail!(failure)

    await expect(renderPromise).rejects.toBe(failure)
    expect(registerExportAdapter).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
