import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import { applyDemoBootstrapCopy } from '../apps/viewer-demo/src/bootstrapCopy'
import { startDemoBootstrap } from '../apps/viewer-demo/src/demoBootstrap'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

function bootEnvironment({ search = '', stored = null, languages = ['en-US'], language = 'en-US', storageDenied = false }: {
  search?: string, stored?: string | null, languages?: string[], language?: string, storageDenied?: boolean
} = {}) {
  const { document } = parseHTML('<html lang="en"><body><div id="app"><main class="app-boot-screen" aria-label="Loading File Viewer"><span class="app-boot-status">Preparing the file preview environment...</span></main></div></body></html>')
  vi.stubGlobal('document', document)
  vi.stubGlobal('location', { search })
  vi.stubGlobal('navigator', { languages, language })
  vi.stubGlobal('localStorage', { getItem: () => {
    if (storageDenied) throw new Error('Storage denied')
    return stored
  } })
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  return {
    document, errors,
    screen: () => document.querySelector('.app-boot-screen')!,
    status: () => document.querySelector('.app-boot-status')!.textContent
  }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Demo asynchronous bootstrap', () => {
  it.each([
    ['zh-CN', '正在准备文件预览环境…', 'File Viewer 启动失败'],
    ['en-US', 'Preparing the file preview environment…', 'File Viewer failed to start'],
    ['ja-JP', 'ファイルのプレビュー環境を準備中…', 'File Viewer を起動できませんでした'],
    ['zh-TW', '正在準備檔案預覽環境…', 'File Viewer 啟動失敗'],
    ['zh-HK', '正在準備檔案預覽環境…', 'File Viewer 啟動失敗'],
    ['de-DE', 'Die Dateivorschau wird vorbereitet…', 'File Viewer konnte nicht starten'],
    ['ru-RU', 'Подготовка среды предпросмотра файлов…', 'Не удалось запустить File Viewer']
  ])('applies %s loading copy without waiting for App and preserves its failure copy', async (locale, loading, failure) => {
    const env = bootEnvironment({ search: `?locale=${locale}` })
    const app = deferred<void>()
    const bootstrap = vi.fn(() => app.promise)
    const loadCopy = vi.fn(async () => ({ applyDemoBootstrapCopy }))
    const run = startDemoBootstrap(bootstrap, loadCopy)
    await run.copyReady
    expect(bootstrap).toHaveBeenCalledOnce()
    expect(loadCopy).toHaveBeenCalledOnce()
    expect(env.document.documentElement.lang).toBe(locale)
    expect(env.status()).toBe(loading)
    expect(env.screen().classList.contains('app-boot-screen--error')).toBe(false)
    app.reject(new Error('App loading failed'))
    await run.appReady
    expect(env.screen().classList.contains('app-boot-screen--error')).toBe(true)
    expect(env.screen().getAttribute('aria-label')).toBe(failure)
    expect(env.status()).not.toBe(loading)
  })

  it('keeps the failed state when the localized copy arrives after App has failed', async () => {
    const env = bootEnvironment({ search: '?locale=de-DE' })
    const copy = deferred<{ applyDemoBootstrapCopy: typeof applyDemoBootstrapCopy }>()
    const apply = vi.fn(applyDemoBootstrapCopy)
    const error = new Error('App failed before language arrived')
    const run = startDemoBootstrap(async () => { throw error }, () => copy.promise)
    await run.appReady
    expect(env.screen().classList.contains('app-boot-screen--error')).toBe(true)
    expect(env.screen().getAttribute('aria-label')).toBe('File Viewer failed to start')
    expect(env.status()).toBe('The preview could not start. Reload the page to try again.')
    copy.resolve({ applyDemoBootstrapCopy: apply })
    await run.copyReady
    expect(apply.mock.calls).toEqual([[true]])
    expect(env.document.documentElement.lang).toBe('de-DE')
    expect(env.screen().getAttribute('aria-label')).toBe('File Viewer konnte nicht starten')
    expect(env.status()).toBe('Die Vorschau konnte nicht starten. Laden Sie die Seite erneut.')
    expect(env.errors).toHaveBeenCalledWith('[file-viewer] Failed to start the demo.', error)
  })

  it.each(['reject', 'throw'])('catches a copy import %s and keeps English loading and failure feedback', async mode => {
    const env = bootEnvironment({ search: '?locale=ja-JP' })
    const app = deferred<void>()
    const error = new Error('Language chunk unavailable')
    const run = startDemoBootstrap(() => app.promise, () => {
      if (mode === 'throw') throw error
      return Promise.reject(error)
    })
    await run.copyReady
    expect(env.document.documentElement.lang).toBe('en-US')
    expect(env.screen().getAttribute('aria-label')).toBe('Loading File Viewer')
    expect(env.status()).toBe('Preparing the file preview environment…')
    expect(env.errors).toHaveBeenCalledWith('[file-viewer] Failed to load the demo language.', error)
    app.reject(new Error('Viewer chunk unavailable'))
    await run.appReady
    expect(env.screen().classList.contains('app-boot-screen--error')).toBe(true)
    expect(env.screen().getAttribute('aria-label')).toBe('File Viewer failed to start')
    expect(env.status()).toBe('The preview could not start. Reload the page to try again.')
  })

  it('keeps English failure feedback when a pending copy import rejects after App failure', async () => {
    const env = bootEnvironment({ search: '?locale=ja-JP' })
    const copy = deferred<{ applyDemoBootstrapCopy: typeof applyDemoBootstrapCopy }>()
    const run = startDemoBootstrap(async () => { throw new Error('App unavailable') }, () => copy.promise)
    await run.appReady
    expect(env.screen().getAttribute('aria-label')).toBe('File Viewer failed to start')
    copy.reject(new Error('Language unavailable after App failure'))
    await run.copyReady
    expect(env.screen().classList.contains('app-boot-screen--error')).toBe(true)
    expect(env.screen().getAttribute('aria-label')).toBe('File Viewer failed to start')
    expect(env.status()).toBe('The preview could not start. Reload the page to try again.')
  })

  it('does not let a late copy module overwrite the mounted App language', async () => {
    const env = bootEnvironment()
    const copy = deferred<{ applyDemoBootstrapCopy: typeof applyDemoBootstrapCopy }>()
    const apply = vi.fn(applyDemoBootstrapCopy)
    const run = startDemoBootstrap(async () => {
      env.document.querySelector('#app')!.textContent = 'Mounted App'
      env.document.documentElement.lang = 'ru-RU'
    }, () => copy.promise)
    await run.appReady
    copy.resolve({ applyDemoBootstrapCopy: apply })
    await run.copyReady
    expect(apply).not.toHaveBeenCalled()
    expect(env.document.documentElement.lang).toBe('ru-RU')
  })

  it.each([
    [{ search: '?locale=zh_Hant_MO&lang=ja-JP', stored: 'de-DE', languages: ['ru-RU'] }, 'zh-HK'],
    [{ search: '?lang=ja-JP', stored: 'de-DE', languages: ['ru-RU'] }, 'ja-JP'],
    [{ search: '?locale=&lang=ja-JP', stored: 'de-DE' }, 'ja-JP'],
    [{ search: '?locale=auto', stored: 'ja-JP', languages: ['de-DE'] }, 'de-DE'],
    [{ stored: 'ja-JP', languages: ['de-DE'] }, 'ja-JP'],
    [{ stored: 'auto', languages: ['unsupported', 'de-DE'] }, 'de-DE'],
    [{ languages: ['unsupported'], language: 'ru-RU' }, 'ru-RU'],
    [{ search: '?locale=unsupported', languages: ['ja-JP'] }, 'en-US'],
    [{ search: '?locale=invalid!', languages: ['ja-JP'] }, 'en-US'],
    [{ storageDenied: true, languages: ['zh-TW'] }, 'zh-TW']
  ])('preserves locale preference precedence: %j resolves to %s', async (options, expected) => {
    const env = bootEnvironment(options)
    const app = deferred<void>()
    const run = startDemoBootstrap(() => app.promise, async () => ({ applyDemoBootstrapCopy }))
    await run.copyReady
    expect(env.document.documentElement.lang).toBe(expected)
    app.resolve()
    await run.appReady
  })
})
