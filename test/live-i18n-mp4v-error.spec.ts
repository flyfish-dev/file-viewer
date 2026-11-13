// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createFileViewerI18n } from '@file-viewer/core'
import { mountMp4vSoftwarePlayer } from '../packages/renderers/media/src/mp4vPlayer'

const locales = ['en-US', 'zh-CN', 'ja-JP', 'de-DE', 'zh-TW', 'zh-HK', 'ru-RU'] as const
const key = 'media.video.softwareWorkerFailed' as const
const workers: TestWorker[] = []
const disposers: Array<() => void> = []
let autoReady = true
class TestWorker {
  onmessage?: (event: any) => void
  onerror?: (event: any) => void
  terminate = vi.fn()
  postMessage = vi.fn((message: { type: string }) => {
    if (message.type === 'init' && autoReady) queueMicrotask(() => this.onmessage?.({ data: { type: 'ready', duration: 2 } }))
  })
  constructor() { workers.push(this) }
}
beforeEach(() => {
  workers.length = 0
  autoReady = true
  vi.stubGlobal('Worker', TestWorker)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', { configurable: true, value: () => ({}) })
})
afterEach(() => {
  disposers.splice(0).reverse().forEach(dispose => dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (HTMLCanvasElement.prototype as any).transferControlToOffscreen
  document.body.replaceChildren()
})
const setup = async (locale: typeof locales[number] = 'en-US') => {
  const host = document.createElement('div'), video = document.createElement('video')
  host.append(video); document.body.append(host)
  const scope = createFileViewerI18n({ locale }, { ownerDocument: document })
  disposers.push(() => scope.destroy())
  const instance = await mountMp4vSoftwarePlayer(new ArrayBuffer(0), video, { width: 2, height: 2, duration: 2, timescale: 1 } as any, { i18n: scope })
  disposers.push(instance.cleanup)
  return { host, video, scope, instance, worker: workers.at(-1)!, label: host.querySelector<HTMLElement>('.fv-video-software-loading')! }
}
it.each(locales)('localizes an empty Worker detail from %s and preserves player identity', async locale => {
  const x = await setup(locale), player = x.host.firstElementChild, canvas = x.host.querySelector('canvas')
  x.worker.onerror?.({ message: '' })
  for (const next of locales) {
    x.scope.update({ locale: next })
    expect(x.label.textContent).toBe(x.scope.t(key))
    expect(x.host.firstElementChild).toBe(player)
    expect(x.host.querySelector('canvas')).toBe(canvas)
  }
  expect(x.worker.postMessage).toHaveBeenCalledTimes(1)
})
it.each(['RAW decoder detail 原文', ' ', '\t\n', 'The MP4V decoder Worker failed.'])('preserves nonempty original message %j', async message => {
  const x = await setup('zh-TW'); let reads = 0
  x.worker.onerror?.({ get message() { reads++; return message } })
  for (const locale of locales) { x.scope.update({ locale }); expect(x.label.textContent).toBe(message) }
  expect(reads).toBe(1)
})
it('replaces owned/raw bindings only for actual errors and honors changed/deleted message overrides', async () => {
  const x = await setup('zh-TW')
  x.scope.update({ locale: 'zh-TW', messages: { [key]: '<b>User-owned</b>' } })
  x.worker.onerror?.({ message: '' }); expect(x.label.textContent).toBe('<b>User-owned</b>'); expect(x.label.querySelector('b')).toBeNull()
  x.scope.update({ locale: 'ja-JP', messages: { [key]: 'Other override' } }); expect(x.label.textContent).toBe('Other override')
  x.worker.onerror?.({ message: 'RAW' }); x.scope.update({ locale: 'en-US' }); expect(x.label.textContent).toBe('RAW')
  x.worker.onerror?.({ message: '' }); x.worker.onerror?.({ message: '' }); expect(x.label.textContent).toBe(x.scope.t(key))
  x.worker.onmessage?.({ data: { type: 'error', message: 'Worker protocol 原文' } }); x.scope.update({ locale: 'zh-HK' }); expect(x.label.textContent).toBe('Worker protocol 原文')
})
it('ignores late retained Worker callbacks after repeated cleanup and leaves a replacement player independent', async () => {
  const old = await setup('zh-TW'); old.worker.onerror?.({ message: '' })
  const text = old.label.textContent, state = old.host.firstElementChild?.getAttribute('data-state'), error = old.worker.onerror, message = old.worker.onmessage
  old.instance.cleanup(); old.instance.cleanup()
  const fresh = await setup('ja-JP'); fresh.worker.onerror?.({ message: '' })
  error?.({ message: 'LATE RAW' }); message?.({ data: { type: 'ready', duration: 3 } }); message?.({ data: { type: 'error', message: 'late protocol' } })
  old.scope.update({ locale: 'en-US' }); expect(old.label.textContent).toBe(text); expect(old.host.firstElementChild?.getAttribute('data-state')).toBe(state)
  expect(fresh.label.textContent).toBe(fresh.scope.t(key)); expect(old.worker.terminate).toHaveBeenCalledTimes(1); expect(fresh.worker.terminate).not.toHaveBeenCalled()
})
it('does not mutate retired UI when reading the error detail synchronously triggers cleanup', async () => {
  const x = await setup(); const text = x.label.textContent, state = x.host.firstElementChild?.getAttribute('data-state'); let reads = 0
  x.worker.onerror?.({ get message() { reads++; x.instance.cleanup(); return '' } })
  expect(reads).toBe(1); expect(x.label.textContent).toBe(text); expect(x.host.firstElementChild?.getAttribute('data-state')).toBe(state)
})
it('rejects an initial empty-detail failure, cleans once, and permits a new mount retry', async () => {
  autoReady = false
  const host = document.createElement('div'), video = document.createElement('video'); host.append(video); document.body.append(host)
  const scope = createFileViewerI18n({ locale: 'zh-TW' }, { ownerDocument: document }); disposers.push(() => scope.destroy())
  const pending = mountMp4vSoftwarePlayer(new ArrayBuffer(0), video, { width: 2, height: 2, duration: 2, timescale: 1 } as any, { i18n: scope })
  const assertion = expect(pending).rejects.toThrow(scope.t(key))
  workers[0].onerror?.({ message: '' }); await assertion; expect(workers[0].terminate).toHaveBeenCalledTimes(1)
  autoReady = true; const fresh = await setup('zh-HK'); fresh.worker.onerror?.({ message: '' }); expect(fresh.label.textContent).toBe(fresh.scope.t(key))
})
