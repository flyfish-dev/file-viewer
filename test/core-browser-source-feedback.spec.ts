import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import { createRendererRegistry, type RendererDefinition } from '../packages/core/src'
import {
  mountViewer,
  type ViewerController,
  type ViewerFetchFile
} from '../packages/core/src/browser'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const controllers: ViewerController[] = []
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const textOf = (node: Node): string =>
  node.nodeType === 3
    ? node.textContent || ''
    : Array.from(node.childNodes).map(textOf).join('') +
      ((node as HTMLElement).shadowRoot ? textOf((node as HTMLElement).shadowRoot!) : '')
const file = (value: number) => new Blob([new Uint8Array([value])])
const readyRenderer = (render?: RendererDefinition['load']): RendererDefinition => ({
  id: 'feedback-fixture',
  label: 'Feedback fixture',
  category: 'document',
  extensions: ['fixture'],
  load:
    render ||
    (async ({ source, surface }) => {
      const paragraph = surface.container.ownerDocument.createElement('p')
      paragraph.textContent = `Rendered ${new Uint8Array(source.buffer!)[0]}`
      surface.container.append(paragraph)
      return {}
    })
})
const mount = (
  fetchFile?: ViewerFetchFile,
  options: Record<string, any> = {},
  renderer = readyRenderer()
) => {
  const { window, document } = parseHTML('<main id="host"></main>')
  for (const [name, value] of Object.entries({
    window,
    document,
    HTMLElement: window.HTMLElement,
    ShadowRoot: window.ShadowRoot
  }))
    vi.stubGlobal(name, value)
  const host = document.getElementById('host')! as HTMLElement
  const onError = vi.fn()
  const controller = mountViewer(
    host,
    {
      url: '/first.fixture',
      filename: 'first.fixture',
      ...options,
      options: {
        toolbar: false,
        autoRenderers: false,
        locale: 'en-US',
        styleIsolation: 'none',
        ...options.options
      }
    },
    { fetchFile, onError, registry: createRendererRegistry([renderer]) }
  )
  controllers.push(controller)
  const root = host.shadowRoot || host
  return {
    host,
    root,
    controller,
    onError,
    status: () => root.querySelector('[data-file-viewer-source-state="loading"]'),
    alert: () => root.querySelector('[data-file-viewer-source-state="error"]')
  }
}
const waitReady = async (controller: ViewerController) =>
  vi.waitFor(
    () => {
      expect(controller.getState().error).toBeNull()
      expect(controller.getState().ready).toBe(true)
    },
    { interval: 1, timeout: 1000 }
  )

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  vi.unstubAllGlobals()
})

describe('mountViewer source acquisition feedback (#423)', () => {
  it.each(['none', 'shadow'])(
    'shows downloading before bytes arrive and hands off to real content (%s)',
    async (styleIsolation) => {
      const download = deferred<Blob>()
      const { controller, root, status } = mount(() => download.promise, {
        options: { styleIsolation }
      })
      await tick()
      expect(controller.getState().loading).toBe(true)
      expect(status()?.textContent).toContain('Downloading file resources...')
      expect(status()?.getAttribute('role')).toBe('status')
      download.resolve(file(23))
      await waitReady(controller)
      expect(textOf(root)).toContain('Rendered 23')
      expect(status()).toBeNull()
      expect(root.querySelector('.file-viewer-web-content')?.getAttribute('aria-busy')).toBe(
        'false'
      )
    }
  )

  it('keeps a localized reading state while the renderer is still preparing', async () => {
    const rendering = deferred<void>()
    const started = deferred<void>()
    const renderer = readyRenderer(async ({ surface }) => {
      started.resolve()
      await rendering.promise
      surface.container.textContent = 'Finished parsing'
      return {}
    })
    const { controller, root, status } = mount(
      async () => file(1),
      { options: { locale: 'zh-CN' } },
      renderer
    )
    await started.promise
    expect(controller.getState().loading).toBe(true)
    expect(status()?.textContent).toContain('正在解析文件内容...')
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1)
    rendering.resolve()
    await waitReady(controller)
    expect(status()).toBeNull()
    expect(root.textContent).toContain('Finished parsing')
  })

  it.each(['resolve', 'reject'] as const)(
    'ignores an old download that later %ss while the replacement is pending',
    async (outcome) => {
      const first = deferred<Blob>(),
        second = deferred<Blob>()
      const signals: AbortSignal[] = []
      const { controller, root, status, onError } = mount(({ url, signal }) => {
        signals.push(signal!)
        return url.includes('second') ? second.promise : first.promise
      })
      await tick()
      const replacing = controller.update({ url: '/second.fixture', filename: 'second.fixture' })
      await tick()
      expect(signals[0].aborted).toBe(true)
      if (outcome === 'resolve') first.resolve(file(1))
      else first.reject(new Error('obsolete failure'))
      await tick()
      expect(controller.getState().loading).toBe(true)
      expect(status()?.textContent).toContain('Downloading file resources...')
      expect(controller.getState().error).toBeNull()
      expect(onError).not.toHaveBeenCalled()
      second.resolve(file(2))
      await replacing
      await waitReady(controller)
      expect(root.textContent).toContain('Rendered 2')
      expect(root.textContent).not.toContain('Rendered 1')
    }
  )

  it('aborts and ignores an old renderer while the new URL is still downloading', async () => {
    const firstRender = deferred<void>(),
      firstStarted = deferred<void>(),
      second = deferred<Blob>()
    let firstSignal: AbortSignal | undefined
    const renderer = readyRenderer(async ({ source, surface, signal }) => {
      const value = new Uint8Array(source.buffer!)[0]
      if (value === 1) {
        firstSignal = signal
        firstStarted.resolve()
        await firstRender.promise
      }
      surface.container.textContent = `Rendered ${value}`
      return {}
    })
    const { controller, root, status } = mount(
      () => second.promise,
      { buffer: new Uint8Array([1]).buffer },
      renderer
    )
    await firstStarted.promise
    const replacing = controller.update({ buffer: undefined, url: '/second.fixture' })
    await tick()
    expect(firstSignal?.aborted).toBe(true)
    firstRender.resolve()
    await tick()
    expect(controller.getState().loading).toBe(true)
    expect(controller.getState().ready).toBe(false)
    expect(status()?.textContent).toContain('Downloading file resources...')
    second.resolve(file(2))
    await replacing
    await waitReady(controller)
    expect(root.textContent).toContain('Rendered 2')
    expect(root.textContent).not.toContain('Rendered 1')
  })

  it('cancels a download when the source is cleared and does not revive it', async () => {
    const download = deferred<Blob>()
    let signal: AbortSignal | undefined
    const { controller, root, status } = mount((input) => {
      signal = input.signal
      return download.promise
    })
    await tick()
    await controller.update({ url: undefined })
    expect(signal?.aborted).toBe(true)
    expect(status()).toBeNull()
    download.resolve(file(55))
    await tick()
    expect(root.textContent).not.toContain('Rendered 55')
    expect(controller.getState().loading).toBe(false)
  })

  it('does not revive DOM or callbacks when an uncooperative download rejects after destroy', async () => {
    const download = deferred<Blob>()
    const onStateChange = vi.fn()
    let signal: AbortSignal | undefined
    const { controller, host, onError } = mount(
      (input) => {
        signal = input.signal
        return download.promise
      },
      { onStateChange }
    )
    await tick()
    controller.destroy()
    const count = onStateChange.mock.calls.length
    expect(signal?.aborted).toBe(true)
    download.reject(new Error('late failure'))
    await tick()
    expect(host.childNodes.length).toBe(0)
    expect(onStateChange).toHaveBeenCalledTimes(count)
    expect(onError).not.toHaveBeenCalled()
  })

  it('shows an escaped transport error once and recovers on retry', async () => {
    const download = deferred<Blob>()
    const transport = vi
      .fn()
      .mockImplementationOnce(() => download.promise)
      .mockResolvedValue(file(4))
    const { controller, status, alert, root, onError } = mount(transport)
    await tick()
    download.reject(new Error('<img src=x onerror=alert(1)>'))
    await tick()
    expect(controller.getState().loading).toBe(false)
    expect(controller.getState().ready).toBe(false)
    expect(status()).toBeNull()
    expect(alert()?.getAttribute('role')).toBe('alert')
    expect(alert()?.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(alert()?.querySelector('img')).toBeNull()
    expect(onError).toHaveBeenCalledTimes(1)
    await controller.reload()
    await waitReady(controller)
    expect(alert()).toBeNull()
    expect(root.textContent).toContain('Rendered 4')
  })

  it.each(['buffer', 'file'] as const)(
    'honors %s over URL and does not claim a download',
    async (kind) => {
      const fetching = vi.fn()
      const rendering = deferred<void>(),
        started = deferred<void>()
      const renderer = readyRenderer(async () => {
        started.resolve()
        await rendering.promise
        return {}
      })
      const { controller, status } = mount(
        fetching,
        kind === 'buffer' ? { buffer: new Uint8Array([1]).buffer } : { file: file(1) },
        renderer
      )
      await started.promise
      expect(fetching).not.toHaveBeenCalled()
      expect(status()?.textContent).toContain('Parsing file content...')
      rendering.resolve()
      await waitReady(controller)
    }
  )

  it.each([false, true])(
    'keeps feedback during delayed arrayBuffer reading (remote: %s)',
    async (remote) => {
      const reading = deferred<ArrayBuffer>()
      class SlowFile extends File {
        arrayBuffer() {
          return reading.promise
        }
      }
      const source = new SlowFile([new Uint8Array([9])], 'slow.fixture')
      const fetching = vi.fn().mockResolvedValue(source)
      const { controller, root, status } = mount(fetching, remote ? {} : { file: source })
      await tick()
      expect(fetching).toHaveBeenCalledTimes(remote ? 1 : 0)
      expect(controller.getState().loading).toBe(true)
      expect(status()?.textContent).toContain('Parsing file content...')
      reading.resolve(new Uint8Array([9]).buffer)
      await waitReady(controller)
      expect(textOf(root)).toContain('Rendered 9')
      expect(status()).toBeNull()
    }
  )

  it.each(['none', 'shadow'])(
    'preserves a single renderer-owned failure surface (%s)',
    async (styleIsolation) => {
      const { controller, root, alert, onError } = mount(
        async () => file(1),
        { options: { styleIsolation } },
        readyRenderer(async () => {
          throw new Error('Renderer failed')
        })
      )
      await vi.waitFor(() => expect(controller.getState().error).toBeInstanceOf(Error), {
        interval: 1
      })
      const alerts = (node: ParentNode): Element[] => [
        ...node.querySelectorAll('[role="alert"]'),
        ...Array.from(node.querySelectorAll('*')).flatMap((element) =>
          element.shadowRoot ? alerts(element.shadowRoot) : []
        )
      ]
      expect(alerts(root)).toHaveLength(1)
      expect(alert()).toBeNull()
      expect(onError).toHaveBeenCalledTimes(1)
    }
  )

  it.each([null, undefined])(
    'presents an unknown transport rejection without losing the original callback reason (%s)',
    async (reason) => {
      const { controller, alert, onError } = mount(async () => {
        throw reason
      })
      await vi.waitFor(() => expect(controller.getState().error).toBeInstanceOf(Error), {
        interval: 1
      })
      expect(controller.getState().loading).toBe(false)
      expect(alert()?.textContent).toContain('Unknown error')
      expect(onError).toHaveBeenCalledExactlyOnceWith(
        reason,
        expect.objectContaining({ url: '/first.fixture' })
      )
    }
  )
})
