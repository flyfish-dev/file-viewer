import { parseHTML } from 'linkedom'
import { describe, expect, it } from 'vitest'
import { openFileViewerPrintMaskDesigner } from '../packages/core/src/features/printMaskDesigner'
import { createFileViewerI18n, FILE_VIEWER_BUILTIN_MESSAGES, FILE_VIEWER_SUPPORTED_LOCALES } from '../packages/core/src'

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left,
  y: top,
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
})

const pointerEvent = (
  windowRef: Window,
  type: string,
  values: { clientX: number; clientY: number; pointerId?: number; button?: number }
) => {
  const event = new windowRef.Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  Object.defineProperties(event, {
    clientX: { value: values.clientX },
    clientY: { value: values.clientY },
    pointerId: { value: values.pointerId ?? 1 },
    button: { value: values.button ?? 0 },
  })
  return event
}

describe('print mask designer', () => {
  it('updates the open overlay language without discarding its regions', async () => {
    const { document } = parseHTML('<html><body><main></main></body></html>')
    const root = document.querySelector('main')!
    const i18n = createFileViewerI18n({ locale: 'en-US' })
    const result = openFileViewerPrintMaskDesigner({
      root, i18n: i18n.options,
      initialRegions: [{ left: 10, top: 20, width: 30, height: 15 }]
    })
    const region = root.querySelector('.fv-print-mask-block')
    const cancel = Array.from(root.querySelectorAll('button')).find(button => button.textContent === 'Cancel')!
    for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
      i18n.update({ locale })
      expect(root.querySelector('.fv-print-mask-block')).toBe(region)
      expect(cancel.textContent).toBe(FILE_VIEWER_BUILTIN_MESSAGES[locale]['toolbar.printMaskCancel'])
      expect(root.contains(cancel)).toBe(true)
    }
    cancel.click()
    expect(await result).toBeNull()
    const retiredText = cancel.textContent
    i18n.update({ locale: 'ja-JP' })
    expect(cancel.textContent).toBe(retiredText)
    i18n.destroy()
  })
  it('installs interaction styles in the same ShadowRoot as the designer', async () => {
    const { document } = parseHTML('<html><head></head><body><main id="host"></main></body></html>')
    const host = document.getElementById('host') as HTMLElement
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const root = document.createElement('section')
    shadowRoot.appendChild(root)

    const resultPromise = openFileViewerPrintMaskDesigner({ root })
    expect(shadowRoot.querySelector('#fv-print-mask-designer-style')).not.toBeNull()
    expect(document.head.querySelector('#fv-print-mask-designer-style')).toBeNull()

    const cancelButton = Array.from(root.querySelectorAll('button'))
      .find(button => button.textContent === '取消') as HTMLButtonElement
    cancelButton.click()
    await expect(resultPromise).resolves.toBeNull()
  })

  it('keeps pages browsable until drawing is armed and records the visible page index', async () => {
    const { document, window } = parseHTML(`
      <html><head></head><body>
        <main id="root"><section id="page-1"></section><section id="page-2"></section></main>
      </body></html>
    `)
    const root = document.getElementById('root') as HTMLElement
    const pageOne = document.getElementById('page-1') as HTMLElement
    const pageTwo = document.getElementById('page-2') as HTMLElement
    root.getBoundingClientRect = () => rect(0, 0, 800, 600)
    pageOne.getBoundingClientRect = () => rect(0, 20, 800, 480)
    pageTwo.getBoundingClientRect = () => rect(0, 520, 800, 480)

    const resultPromise = openFileViewerPrintMaskDesigner({
      root,
      pages: [pageOne, pageTwo],
    })
    expect(root.style.position).toBe('relative')
    const canvases = Array.from(root.querySelectorAll<HTMLElement>('.fv-print-mask-canvas'))
    expect(canvases).toHaveLength(2)
    expect(canvases.every(canvas => !canvas.classList.contains('is-armed'))).toBe(true)

    const firstCanvas = canvases[0]!
    firstCanvas.getBoundingClientRect = () => rect(0, 20, 800, 480)
    Object.assign(firstCanvas, {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
    })
    const addButton = Array.from(root.querySelectorAll('button'))
      .find(button => button.textContent === '添加掩膜') as HTMLButtonElement
    addButton.click()
    expect(firstCanvas.classList.contains('is-armed')).toBe(true)
    expect(canvases[1]!.classList.contains('is-armed')).toBe(false)

    firstCanvas.dispatchEvent(pointerEvent(window as unknown as Window, 'pointerdown', {
      clientX: 80,
      clientY: 68,
    }))
    firstCanvas.dispatchEvent(pointerEvent(window as unknown as Window, 'pointermove', {
      clientX: 240,
      clientY: 164,
    }))
    firstCanvas.dispatchEvent(pointerEvent(window as unknown as Window, 'pointerup', {
      clientX: 240,
      clientY: 164,
    }))
    expect(firstCanvas.classList.contains('is-armed')).toBe(false)

    const confirmButton = Array.from(root.querySelectorAll('button'))
      .find(button => button.textContent === '确认打印') as HTMLButtonElement
    confirmButton.click()
    await expect(resultPromise).resolves.toMatchObject({
      mask: {
        regions: [{
          left: 10,
          top: 10,
          width: 20,
          height: 20,
          pageIndex: 0,
        }],
      },
    })
    expect(root.querySelector('[data-viewer-print-mask-designer]')).toBeNull()
    expect(root.querySelector('.fv-print-mask-canvas')).toBeNull()
    expect(root.style.position).toBeFalsy()
  })

  it('uploads a local stamp, then moves and resizes it on the visible page', async () => {
    const { document, window } = parseHTML(`
      <html><head></head><body>
        <main id="root"><section id="page-1"></section><section id="page-2"></section></main>
      </body></html>
    `)
    const root = document.getElementById('root') as HTMLElement
    const pageOne = document.getElementById('page-1') as HTMLElement
    const pageTwo = document.getElementById('page-2') as HTMLElement
    root.getBoundingClientRect = () => rect(0, 0, 800, 600)
    pageOne.getBoundingClientRect = () => rect(0, -500, 800, 480)
    pageTwo.getBoundingClientRect = () => rect(0, 20, 800, 480)

    class FakeFileReader {
      result: string | ArrayBuffer | null = null
      error: DOMException | null = null
      private listeners = new Map<string, EventListener>()
      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, listener)
      }
      readAsDataURL() {
        this.result = 'data:image/png;base64,c2VhbA=='
        this.listeners.get('load')?.call(this as unknown as FileReader, new window.Event('load'))
      }
    }
    Object.defineProperty(window, 'FileReader', { value: FakeFileReader, configurable: true })

    const resultPromise = openFileViewerPrintMaskDesigner({
      root,
      pages: [pageOne, pageTwo],
    })
    const canvases = Array.from(root.querySelectorAll<HTMLElement>('.fv-print-mask-canvas'))
    canvases[1]!.getBoundingClientRect = () => rect(0, 20, 800, 480)
    const uploadButton = Array.from(root.querySelectorAll('button'))
      .find(button => button.textContent === '上传印章') as HTMLButtonElement
    const input = root.querySelector<HTMLInputElement>('[data-viewer-print-stamp-input]')!
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ name: 'approval.png', type: 'image/png', size: 128 }],
    })
    uploadButton.click()
    input.dispatchEvent(new window.Event('change', { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()

    const stamp = root.querySelector<HTMLElement>('[data-viewer-print-stamp]')!
    expect(stamp).not.toBeNull()
    Object.assign(stamp, {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
    })
    stamp.dispatchEvent(pointerEvent(window as unknown as Window, 'pointerdown', {
      clientX: 400,
      clientY: 220,
    }))
    stamp.dispatchEvent(pointerEvent(window as unknown as Window, 'pointermove', {
      clientX: 480,
      clientY: 268,
    }))
    stamp.dispatchEvent(pointerEvent(window as unknown as Window, 'pointerup', {
      clientX: 480,
      clientY: 268,
    }))

    const resize = stamp.querySelector<HTMLElement>('.fv-print-stamp-resize')!
    resize.dispatchEvent(pointerEvent(window as unknown as Window, 'pointerdown', {
      clientX: 480,
      clientY: 268,
    }))
    stamp.dispatchEvent(pointerEvent(window as unknown as Window, 'pointermove', {
      clientX: 560,
      clientY: 316,
    }))
    stamp.dispatchEvent(pointerEvent(window as unknown as Window, 'pointerup', {
      clientX: 560,
      clientY: 316,
    }))

    const confirmButton = Array.from(root.querySelectorAll('button'))
      .find(button => button.textContent === '确认打印') as HTMLButtonElement
    confirmButton.click()
    await expect(resultPromise).resolves.toMatchObject({
      mask: {
        stamps: [{
          src: 'data:image/png;base64,c2VhbA==',
          alt: 'approval.png',
          left: 48,
          top: 48,
          width: 34,
          height: 28,
          pageIndex: 1,
        }],
      },
    })
  })
})
