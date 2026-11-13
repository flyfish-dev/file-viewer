import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import {
  FILE_VIEWER_BUILTIN_MESSAGES,
  FILE_VIEWER_SUPPORTED_LOCALES,
  FILE_VIEWER_LOCALE_METADATA,
  createFileViewerI18n,
  createFileViewerTranslator,
  normalizeFileViewerLocale,
  createRendererRegistry,
  normalizeFileViewerErrorMessage
} from '../packages/core/src'
import { mountViewer } from '../packages/core/src/browser'

afterEach(() => vi.unstubAllGlobals())

describe('viewer locale negotiation', () => {
  it.each([
    ['zh', 'zh-CN'],
    ['zh_SG', 'zh-CN'],
    ['ZH_hans_HK', 'zh-CN'],
    ['zh-TW', 'zh-TW'],
    ['zh-Hant', 'zh-TW'],
    ['zh-Hant-CN', 'zh-TW'],
    ['zh-HK', 'zh-HK'],
    ['zh-MO', 'zh-HK'],
    ['zh-Hant-MO', 'zh-HK'],
    ['en-GB', 'en-US'],
    ['ja', 'ja-JP'],
    ['de-AT', 'de-DE'],
    ['ru', 'ru-RU'],
    ['ru-RU-u-nu-latn', 'ru-RU'],
    ['fr-FR', 'en-US'],
    ['zh-@broken', 'en-US']
  ])('resolves %s to %s', (input, expected) => {
    expect(normalizeFileViewerLocale(input)).toBe(expected)
  })
  it('uses the first supported browser preference and keeps the SSR default', () => {
    expect(normalizeFileViewerLocale('auto')).toBe('zh-CN')
    vi.stubGlobal('window', {
      navigator: { languages: ['fr-FR', 'zh-Hant-HK', 'de-DE'], language: 'en-US' }
    })
    expect(normalizeFileViewerLocale('auto')).toBe('zh-HK')
  })
  it('ships complete dictionaries with matching interpolation parameters', () => {
    expect(Object.isFrozen(FILE_VIEWER_BUILTIN_MESSAGES)).toBe(true)
    const base = FILE_VIEWER_BUILTIN_MESSAGES['en-US']
    const tokens = (message: string) =>
      [...message.matchAll(/\{([\w.-]+)\}/g)].map((match) => match[1]).sort()
    expect(FILE_VIEWER_SUPPORTED_LOCALES).toEqual(Object.keys(FILE_VIEWER_LOCALE_METADATA))
    for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
      const catalog = FILE_VIEWER_BUILTIN_MESSAGES[locale]
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(base).sort())
      for (const key of Object.keys(base) as (keyof typeof base)[]) {
        expect(catalog[key].trim(), `${locale}/${key}`).not.toBe('')
        expect(tokens(catalog[key]), `${locale}/${key}`).toEqual(tokens(base[key]))
      }
    }
  })
})

describe('instance-local live translations', () => {
  it('releases replaced UI bindings deterministically without WeakRef and permits rebinding', () => {
    vi.stubGlobal('WeakRef', undefined)
    const context = createFileViewerI18n({ locale: 'en-US' })
    const active = new Set<() => void>()
    const disposals: { calls: number }[] = []
    const trackedContext = {
      get locale() { return context.locale },
      options: context.options,
      t: context.t,
      formatNumber: context.formatNumber,
      formatDateTime: context.formatDateTime,
      formatBytes: context.formatBytes,
      subscribe(listener: () => void) {
        active.add(listener)
        const unsubscribe = context.subscribe(listener)
        const record = { calls: 0 }
        const dispose = () => {
          record.calls += 1
          active.delete(listener)
          unsubscribe()
        }
        disposals.push(record)
        return dispose
      }
    }
    const t = createFileViewerTranslator(trackedContext)
    const { document } = parseHTML('<nav></nav>')
    const nav = document.querySelector('nav')!
    let reads = 0
    const params = () => { reads += 1; return { page: 50 } }
    const historicalNodes: HTMLElement[] = []
    for (let index = 0; index < 50; index++) {
      t.release(nav)
      nav.replaceChildren()
      const button = document.createElement('button')
      const label = document.createElement('span')
      t.text(label, 'pdf.nav.pageLabel', params)
      t.attr(button, 'aria-label', 'pdf.nav.pageLabel', params)
      button.append(label)
      nav.append(button)
      historicalNodes.push(label)
      expect(active.size).toBe(2)
    }
    const before = reads
    context.update({ locale: 'ru-RU' })
    expect(reads - before).toBe(2)
    expect(historicalNodes.slice(0, -1).every(node => node.textContent === 'Page 50')).toBe(true)
    expect(historicalNodes.at(-1)?.textContent).toBe(context.t('pdf.nav.pageLabel', { page: 50 }))
    t.release(nav)
    t.release(nav)
    expect(active.size).toBe(0)
    expect(disposals.every(dispose => dispose.calls === 1)).toBe(true)
    const reused = historicalNodes[0]
    t.text(reused, 'toolbar.download')
    expect(active.size).toBe(1)
    context.update({ locale: 'de-DE' })
    expect(reused.textContent).toBe(context.t('toolbar.download'))
    t.release(reused)
    expect(active.size).toBe(0)
    context.destroy()
  })
  it('leaves unrelated bindings alive when releasing one UI subtree', () => {
    const context = createFileViewerI18n({ locale: 'en-US' })
    const t = createFileViewerTranslator(context)
    const { document } = parseHTML('<main><nav></nav><button></button></main>')
    const nav = document.querySelector('nav')!
    const button = document.querySelector('button')!
    const label = document.createElement('span')
    nav.append(label)
    t.text(label, 'toolbar.download')
    t.text(button, 'toolbar.close')
    t.release(nav)
    context.update({ locale: 'zh-TW' })
    expect(label.textContent).toBe('Download')
    expect(button.textContent).toBe(context.t('toolbar.close'))
    const beforeDestroy = button.textContent
    context.destroy()
    context.update({ locale: 'ru-RU' })
    expect(button.textContent).toBe(beforeDestroy)
    t.release(document.querySelector('main'))
    t.release(document.querySelector('main'))
  })
  it('inherits a parent on creation and releases its subscription on destroy', () => {
    const parent = createFileViewerI18n({ locale: 'zh-HK' })
    const child = createFileViewerI18n(undefined, { parent })
    expect(child.locale).toBe('zh-HK')
    parent.update({ locale: 'ru-RU' })
    expect(child.locale).toBe('ru-RU')
    child.destroy()
    parent.update({ locale: 'de-DE' })
    expect(child.locale).toBe('ru-RU')
    parent.destroy()
  })
  it('replaces a loading binding with retained metadata or a current error', () => {
    const context = createFileViewerI18n({ locale: 'en-US' })
    const t = createFileViewerTranslator(context)
    const { document } = parseHTML('<div></div>')
    const node = document.querySelector('div')!
    t.text(node, 'media.midi.loading')
    t.bind(node, element => { element.textContent = '原稿 Download.mid' })
    context.update({ locale: 'ru-RU' })
    expect(node.textContent).toBe('原稿 Download.mid')
    const failure = t.error('media.midi.parseFailed')
    t.bind(node, element => { element.textContent = normalizeFileViewerErrorMessage(failure, context.options) })
    context.update({ locale: 'zh-HK' })
    expect(node.textContent).toBe(context.t('media.midi.parseFailed'))
    expect(node.textContent).not.toBe(context.t('media.midi.loading'))
    context.destroy()
  })
  it('retains an owned error code and raw arguments while translating at display time', () => {
    const t = createFileViewerTranslator({ locale: 'en-US' })
    const failure = t.error('drawing.error.plantumlRenderFailed', { status: 503 })
    const raw = failure.message
    expect(failure.code).toBe('drawing.error.plantumlRenderFailed')
    expect(failure.params.status).toBe(503)
    expect(normalizeFileViewerErrorMessage(failure, { locale: 'ru-RU' })).toContain('503')
    expect(normalizeFileViewerErrorMessage(failure, { locale: 'zh-TW' })).toContain('失敗')
    expect(failure.message).toBe(raw)
  })
  it('accepts an explicit context from an independently bundled renderer', () => {
    const parent = createFileViewerI18n({ locale: 'en-US' })
    const foreignContext = {
      get locale() {
        return parent.locale
      },
      options: { locale: 'en-US' as const },
      t: parent.t,
      subscribe: parent.subscribe,
      formatNumber: parent.formatNumber,
      formatDateTime: parent.formatDateTime,
      formatBytes: parent.formatBytes
    }
    const { document } = parseHTML('<button></button>')
    const button = document.querySelector('button')!
    createFileViewerTranslator(foreignContext).text(button, 'toolbar.download')
    parent.update({ locale: 'ru-RU' })
    expect(button.textContent).toBe('Скачать')
    parent.destroy()
  })
  it('uses the latest locale while a source is pending and after a load failure', async () => {
    const { window, document } = parseHTML('<main id="host"></main>')
    for (const [name, value] of Object.entries({
      window,
      document,
      HTMLElement: window.HTMLElement,
      ShadowRoot: window.ShadowRoot
    }))
      vi.stubGlobal(name, value)
    let fail!: (error: Error) => void
    const fetchFile = vi.fn(
      () =>
        new Promise<Blob>((_resolve, reject) => {
          fail = reject
        })
    )
    const controller = mountViewer(
      document.getElementById('host')! as HTMLElement,
      {
        url: '/pending.pdf',
        options: { locale: 'en-US', styleIsolation: 'none' }
      },
      { fetchFile }
    )
    try {
      await vi.waitFor(() => expect(fetchFile).toHaveBeenCalledTimes(1))
      await controller.update({ options: { locale: 'ja-JP', styleIsolation: 'none' } })
      await controller.update({ options: { locale: 'ru-RU', styleIsolation: 'none' } })
      expect(document.getElementById('host')!.textContent).toContain('Загрузка')
      fail(new Error('NETWORK_DIAGNOSTIC'))
      await vi.waitFor(() => expect(controller.getState().error).toBeTruthy())
      await controller.update({ options: { locale: 'zh-TW', styleIsolation: 'none' } })
      expect(document.getElementById('host')!.textContent).toContain('預覽失敗')
      expect(document.getElementById('host')!.textContent).toContain('NETWORK_DIAGNOSTIC')
      expect(fetchFile).toHaveBeenCalledTimes(1)
    } finally {
      controller.destroy()
    }
  })
  it('changes renderer and toolbar copy without reloading a URL or replacing the document', async () => {
    const { window, document } = parseHTML('<main id="host"></main>')
    for (const [name, value] of Object.entries({
      window,
      document,
      HTMLElement: window.HTMLElement,
      ShadowRoot: window.ShadowRoot
    }))
      vi.stubGlobal(name, value)
    const load = vi.fn(async ({ surface, options }: any) => {
      const paragraph = document.createElement('p')
      createFileViewerTranslator(options).text(paragraph, 'pdf.nav.pageCount', { count: 22 })
      surface.container.append(paragraph)
      return {}
    })
    const fetchFile = vi.fn(async () => new Blob(['fixture']))
    const options = {
      locale: 'en-US',
      toolbar: { download: true },
      autoRenderers: false,
      styleIsolation: 'none'
    } as const
    const controller = mountViewer(
      document.getElementById('host')! as HTMLElement,
      { url: '/sample.fixture', options },
      {
        fetchFile,
        registry: createRendererRegistry([
          {
            id: 'i18n-fixture',
            label: 'Fixture',
            category: 'document',
            extensions: ['fixture'],
            load
          }
        ])
      }
    )
    try {
      await vi.waitFor(() => expect(controller.getState().ready).toBe(true))
      const paragraph = document.querySelector('.file-viewer-web-content p')
      expect(paragraph?.textContent).toBe('22 pages')
      await controller.update({ options: { locale: 'ru-RU' } })
      expect(paragraph?.textContent).toBe('22 страницы')
      expect(document.querySelector('.file-viewer-web-content p')).toBe(paragraph)
      expect(document.querySelector('[data-viewer-toolbar-key="download"]')?.textContent).toContain(
        'Скачать'
      )
      expect(fetchFile).toHaveBeenCalledTimes(1)
      expect(load).toHaveBeenCalledTimes(1)
      expect(document.documentElement.lang).not.toBe('ru-RU')
    } finally {
      controller.destroy()
    }
  })
  it('updates explicit bindings while preserving document text and other viewers', () => {
    const { document } = parseHTML('<main><button></button><article>Download</article></main>')
    const first = createFileViewerI18n({ locale: 'en-US' })
    const second = createFileViewerI18n({ locale: 'de-DE' })
    const button = document.querySelector('button')! as HTMLButtonElement
    const t = createFileViewerTranslator(first.options)
    t.text(button, 'toolbar.download')
    first.update({ locale: 'ru-RU' })
    expect(button.textContent).toBe('Скачать')
    expect(document.querySelector('article')!.textContent).toBe('Download')
    expect(second.locale).toBe('de-DE')
    first.destroy()
    second.destroy()
  })
  it('preserves custom resolver precedence and refreshes bindings when copy changes', () => {
    const i18n = createFileViewerI18n({
      locale: 'zh-TW',
      messages: { 'toolbar.download': 'outer' },
      i18n: { messages: { 'toolbar.download': '下載原檔' } }
    })
    expect(i18n.t('toolbar.download')).toBe('下載原檔')
    i18n.update({
      locale: 'ru-RU',
      messages: (key, params, locale) =>
        key === 'toolbar.download' ? `${locale}:${params.name || 'custom'}` : undefined
    })
    expect(i18n.t('toolbar.download')).toBe('ru-RU:custom')
    expect(i18n.t('toolbar.search')).toBe('Поиск')
    i18n.destroy()
  })
  it('follows languagechange only for auto instances and releases listeners', () => {
    const browser = new EventTarget()
    Object.assign(browser, { navigator: { languages: ['ja-JP'], language: 'ja-JP' } })
    vi.stubGlobal('window', browser)
    const auto = createFileViewerI18n({ locale: 'auto' })
    const fixed = createFileViewerI18n({ locale: 'zh-TW' })
    const listener = vi.fn()
    auto.subscribe(listener)
    browser.navigator.languages = ['ru-RU']
    browser.dispatchEvent(new Event('languagechange'))
    expect(auto.locale).toBe('ru-RU')
    expect(fixed.locale).toBe('zh-TW')
    expect(listener).toHaveBeenCalledTimes(1)
    auto.destroy()
    browser.navigator.languages = ['de-DE']
    browser.dispatchEvent(new Event('languagechange'))
    expect(listener).toHaveBeenCalledTimes(1)
    fixed.destroy()
  })
  it.each([0, 1, 2, 5, 11, 21, 22, 25, 1.5])('formats Russian count %s naturally', (count) => {
    const i18n = createFileViewerI18n({ locale: 'ru-RU' })
    const category = new Intl.PluralRules('ru-RU').select(count)
    const noun = { one: 'страница', few: 'страницы', many: 'страниц', other: 'страницы' }[
      category as 'one' | 'few' | 'many' | 'other'
    ]
    expect(i18n.t('pdf.nav.pageCount', { count })).toBe(`${i18n.formatNumber(count)} ${noun}`)
    i18n.destroy()
  })
  it('has deterministic offline formatting when Intl is unavailable', () => {
    vi.stubGlobal('Intl', undefined)
    const i18n = createFileViewerI18n({ locale: 'ru-RU' })
    expect(i18n.t('pdf.nav.pageCount', { count: 22 })).toBe('22 страницы')
    expect(i18n.formatNumber(1.5)).toBe('1,5')
    expect(i18n.formatDateTime(new Date('2026-11-10T00:00:00Z'), { timeZone: 'UTC' })).toContain(
      '2026'
    )
    i18n.destroy()
  })
  it('uses local fallback rules when Intl lacks the requested locale data', () => {
    vi.stubGlobal('Intl', {
      NumberFormat: class {
        static supportedLocalesOf() {
          return []
        }
      },
      PluralRules: class {
        static supportedLocalesOf() {
          return []
        }
      }
    })
    const i18n = createFileViewerI18n({ locale: 'ru-RU' })
    expect(i18n.formatNumber(1234.5)).toBe('1\u00a0234,5')
    expect(i18n.t('pdf.nav.pageCount', { count: 21 })).toBe('21 страница')
    i18n.destroy()
  })
})
