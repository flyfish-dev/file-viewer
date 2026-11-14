import { afterEach, expect, it, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import { createFileViewerI18n } from '../packages/core/src'
import renderAudio from '../packages/renderers/media/src/audio'
import renderUmd from '../packages/renderers/ebook/src/umd'
import { registerFileViewerMidiLoader } from '../packages/renderers/media/src/optionalCapabilities'

afterEach(() => {
  registerFileViewerMidiLoader(null)
  vi.unstubAllGlobals()
})

it('refreshes a missing MIDI capability hint and retires its language binding on unmount', async () => {
  const { document } = parseHTML('<main></main>')
  vi.stubGlobal('document', document)
  registerFileViewerMidiLoader(null)
  const i18n = createFileViewerI18n({ locale: 'en-US' })
  const target = document.querySelector('main')! as unknown as HTMLDivElement
  const instance = await renderAudio(new ArrayBuffer(0), target, 'midi', { options: i18n.options, i18n })
  const label = target.querySelector('.fv-midi-error')!
  try {
    for (const locale of ['zh-TW', 'zh-HK', 'ru-RU', 'ja-JP'] as const) {
      i18n.update({ locale })
      expect(label.textContent).toBe(i18n.t('media.midi.install'))
    }
    const previous = label.textContent
    instance.unmount?.()
    i18n.update({ locale: 'en-US' })
    expect(label.textContent).toBe(previous)
  } finally {
    instance.unmount?.()
    i18n.destroy()
  }
})

it.each([true, false])('preserves authored UMD titles and localizes only declared fallbacks (authored=%s)', async authored => {
  const { document } = parseHTML('<main></main>')
  vi.stubGlobal('document', document)
  const title = 'UMD 电子书'
  const bytes = new Uint8Array(authored ? 9 + title.length * 2 : 4)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0xde9a9b89, true)
  if (authored) {
    bytes[4] = 0x23
    view.setUint16(5, 2, true)
    bytes[8] = 5 + title.length * 2
    for (let index = 0; index < title.length; index++) view.setUint16(9 + index * 2, title.charCodeAt(index), true)
  }
  const i18n = createFileViewerI18n({ locale: 'en-US' })
  const target = document.querySelector('main')! as unknown as HTMLDivElement
  const instance = await renderUmd(bytes.buffer, target, { options: i18n.options, i18n })
  const heading = target.querySelector('h1')
  try {
    for (const locale of ['zh-TW', 'de-DE', 'zh-HK', 'ru-RU', 'ja-JP'] as const) {
      i18n.update({ locale })
      expect(target.querySelector('.umd-title strong')?.textContent).toBe(authored ? title : i18n.t('umd.title'))
      expect(target.querySelector('h1')).toBe(heading)
      expect(heading?.textContent).toBe(authored ? title : i18n.t('umd.title'))
      expect(target.querySelector('.umd-actions button')?.textContent).toBe(i18n.t('umd.previousChapter'))
    }
  } finally {
    instance.unmount?.()
    i18n.destroy()
  }
})

it('keeps the parsed MIDI title and refreshes table copy after an asynchronous language change', async () => {
  const { document } = parseHTML('<main></main>')
  vi.stubGlobal('document', document)
  const i18n = createFileViewerI18n({ locale: 'en-US' })
  let finish!: (value: unknown) => void
  const parsed = vi.fn()
  class Midi {
    name = '原稿 Download.mid'
    duration = 60
    header = { ppq: 480 }
    tracks = [{ name: '', instrument: { name: '' }, channel: 0, notes: [], duration: 60 }]
    constructor() { parsed() }
  }
  registerFileViewerMidiLoader((() => new Promise(resolve => { finish = resolve })) as Parameters<typeof registerFileViewerMidiLoader>[0])
  const target = document.querySelector('main')! as unknown as HTMLDivElement
  const instance = await renderAudio(new ArrayBuffer(0), target, 'midi', { options: i18n.options, i18n })
  try {
    i18n.update({ locale: 'ru-RU' })
    expect(target.textContent).toContain(i18n.t('media.midi.loading'))
    finish({ Midi })
    await vi.waitFor(() => expect(target.querySelector('header strong')?.textContent).toBe('原稿 Download.mid'))
    for (const locale of ['zh-TW', 'de-DE', 'zh-HK', 'ja-JP'] as const) {
      i18n.update({ locale })
      expect(target.querySelector('header strong')?.textContent).toBe('原稿 Download.mid')
      expect(target.querySelector('th')?.textContent).toBe(i18n.t('media.midi.trackHeader'))
      expect(target.querySelector('tbody td')?.textContent).toBe(i18n.t('media.midi.trackFallback', { index: 1 }))
    }
    expect(parsed).toHaveBeenCalledTimes(1)
  } finally {
    instance.unmount?.()
    i18n.destroy()
  }
})
