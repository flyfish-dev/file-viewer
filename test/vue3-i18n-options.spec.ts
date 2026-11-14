import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, ref } from 'vue'
import {
  DEFAULT_FILE_VIEWER_STATE_THEME,
  FILE_VIEWER_SUPPORTED_LOCALES,
  createFileViewerErrorState,
  createFileViewerEmptyPreviewState,
  createFileViewerLoadStartState,
  createFileViewerLoadingController,
  commitFileViewerLoadStartState,
  createFileViewerRenderCompleteState,
  createFileViewerRequestController,
  formatFileViewerErrorMessage,
  translateFileViewerMessage,
  runFileViewerRemoteFilePreview,
  runFileViewerStreamingPdfPreview,
  type FileViewerOptions
} from '../packages/core/src'
import { useViewerI18n } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerI18n'
import { useViewerErrorState, useViewerPresentation } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerPresentation'
import { useViewerSourceLoading } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerSourceLoading'
import { useLoading } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useLoading'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.unstubAllGlobals()
})
const setup = (initial: FileViewerOptions, onError?: (message: string) => void) => {
  const scope = effectScope()
  scopes.push(scope)
  const input = ref<FileViewerOptions>(initial)
  const state = scope.run(() => {
    const i18n = useViewerI18n(() => input.value)
    const error = useViewerErrorState({
      currentExtend: computed(() => 'pdf'),
      error: computed(() => 'NETWORK_DIAGNOSTIC'),
      loadingTheme: computed(() => DEFAULT_FILE_VIEWER_STATE_THEME),
      getOptions: i18n.getOptions
    })
    const presentation = useViewerPresentation({
      filename: ref('report.pdf'),
      getFile: () => undefined,
      getUrl: () => undefined,
      getOptions: i18n.getOptions
    })
    const loadingState = useLoading('pdf', i18n.getOptions, onError)
    return { ...i18n, error, loadingState, ...presentation }
  })!
  return { ...state, input, scope }
}

describe('Vue instance options reactivity', () => {
  it('retains explicit legacy loading keys and error resolvers alongside captured metadata', () => {
    const controller = createFileViewerLoadingController('pdf', { locale: 'en-US' })
    controller.startLoading('old', 'preview.reading')
    controller.setI18n({ locale: 'ru-RU' })
    expect(controller.getState().message).toBe(translateFileViewerMessage({ locale: 'ru-RU' }, 'preview.reading'))
    const loadStart = createFileViewerLoadStartState({ version: 1, source: 'file', loadingMessage: 'old explicit copy', loadingMessageKey: 'preview.streamingPdf' })
    expect(loadStart.loadingMessageKey).toBe('preview.streamingPdf')
    commitFileViewerLoadStartState({ version: 1, buildState: () => loadStart, onStartLoading: controller.startLoading })
    expect(controller.getState().message).toBe(translateFileViewerMessage({ locale: 'ru-RU' }, 'preview.streamingPdf'))
    controller.showError('initial', input => `${input?.locale}: HTTP 503`)
    controller.setI18n({ locale: 'zh-HK' })
    expect(controller.getState().error).toBe('zh-HK: HTTP 503')
    controller.showError('literal')
    controller.setI18n({ locale: 'ja-JP' })
    expect(controller.getState().error).toBe('literal')
  })
  it('retranslates source-error prefixes and preserves HTTP diagnostics without retrying or renotifying', async () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/' } })
    const onError = vi.fn()
    const state = setup({ locale: 'en-US' }, onError)
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchFile = vi.fn(async () => new Response('upstream fault', { status: 503 }))
    vi.stubGlobal('fetch', fetchFile)
    const source = useViewerSourceLoading({
      getFile: () => undefined,
      getUrl: () => 'https://example.test/report.txt',
      getOptions: state.getOptions,
      filename: ref('report.txt'),
      currentFile: ref(null), currentBuffer: ref(null), currentSourceUrl: ref(null),
      renderedReady: ref(false), progressiveReady: ref(false),
      requestController: createFileViewerRequestController(),
      clearRenderedContent: vi.fn(),
      mountRenderedContent: vi.fn(async () => ({})),
      destroyRenderSession: vi.fn(), setActiveRenderSession: vi.fn(),
      buildLoadStartState: input => createFileViewerLoadStartState({ ...input, i18n: state.getOptions() }),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      notifyLifecycle: vi.fn(), setActiveDocumentContext: vi.fn(),
      markLoadStarted: vi.fn(), clearLoadStarted: vi.fn(),
      startLoading: state.loadingState.startLoading,
      setLoadingMessage: state.loadingState.setLoadingMessage,
      stopLoading: state.loadingState.stopLoading,
      showError: state.loadingState.showError,
      clearError: state.loadingState.clearError,
      resetLoading: state.loadingState.resetLoading,
      formatErrorMessage: formatFileViewerErrorMessage
    })
    try {
      await source.refreshPreview()
      const detail = `${state.viewerI18n.t('error.remoteDownload')}: HTTP 503`
      expect(logger.mock.calls[0]).toEqual([
        formatFileViewerErrorMessage(state.viewerI18n.t('error.load'), detail, state.getOptions())
      ])
      for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
        state.input.value.locale = locale
        await nextTick()
        expect(state.loadingState.error.value).toBe(formatFileViewerErrorMessage(state.viewerI18n.t('error.load'), detail, state.getOptions()))
        expect(state.loadingState.error.value).toContain('HTTP 503')
      }
      expect(fetchFile).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(logger).toHaveBeenCalledTimes(1)
      expect(logger.mock.calls[0].every(value => typeof value === 'string')).toBe(true)
    } finally {
      logger.mockRestore()
    }
  })
  it('updates a pending streaming PDF label without replacing its render request', async () => {
    const state = setup({ locale: 'en-US' })
    let complete!: (session: object) => void
    const mountRenderedContent = vi.fn(() => new Promise<object>(resolve => { complete = resolve }))
    const pending = runFileViewerStreamingPdfPreview({
      url: 'https://example.test/streaming.pdf',
      filename: 'streaming.pdf',
      version: 1,
      previewTarget: createFileViewerEmptyPreviewState(),
      isCurrent: () => true,
      mountRenderedContent,
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      i18n: state.getOptions(),
      onStartLoading: state.loadingState.startLoading,
      onStopLoading: state.loadingState.stopLoading
    })
    expect(state.loadingState.message.value).toBe(state.viewerI18n.t('preview.streamingPdf'))
    state.input.value.locale = 'ru-RU'
    await nextTick()
    expect(state.loadingState.message.value).toBe(state.viewerI18n.t('preview.streamingPdf'))
    expect(mountRenderedContent).toHaveBeenCalledTimes(1)
    complete({})
    expect((await pending).status).toBe('ready')
    expect(state.loadingState.loading.value).toBe(false)
    expect(state.loadingState.message.value).toBe('')
  })
  it.each(['explicit', 'auto'] as const)('refreshes pending download and render messages without restarting the source (%s)', async mode => {
    const browser = Object.assign(new EventTarget(), { navigator: { language: 'en-US', languages: ['en-US'] } })
    vi.stubGlobal('window', browser)
    const state = setup({ locale: mode === 'auto' ? 'auto' : 'en-US' })
    let finishDownload!: (file: File) => void
    let finishRender!: (session: object) => void
    const downloadFile = vi.fn(() => new Promise<File>(resolve => { finishDownload = resolve }))
    const mountRenderedContent = vi.fn(() => new Promise<object>(resolve => { finishRender = resolve }))
    const requestController = createFileViewerRequestController()
    const pending = runFileViewerRemoteFilePreview({
      url: 'https://example.test/hello.txt',
      pageHref: 'https://example.test/',
      filename: 'hello.txt',
      version: 1,
      streaming: false,
      previewTarget: createFileViewerEmptyPreviewState(),
      requestController,
      isCurrent: () => true,
      downloadFile,
      mountRenderedContent,
      buildLoadStartState: input => createFileViewerLoadStartState({ ...input, i18n: state.getOptions() }),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      i18n: state.getOptions(),
      onStartLoading: state.loadingState.startLoading,
      onSetLoadingMessage: state.loadingState.setLoadingMessage,
      onStopLoading: state.loadingState.stopLoading
    })
    const checkPhase = async (key: 'preview.downloading' | 'preview.reading') => {
      for (const locale of mode === 'auto' ? ['ru-RU', 'zh-HK'] as const : FILE_VIEWER_SUPPORTED_LOCALES) {
        if (mode === 'auto') {
          browser.navigator.languages = [locale]
          browser.navigator.language = locale
          browser.dispatchEvent(new Event('languagechange'))
        } else state.input.value.locale = locale
        await nextTick()
        expect(state.loadingState.loading.value).toBe(true)
        expect(state.loadingState.message.value).toBe(state.viewerI18n.t(key))
        expect(downloadFile).toHaveBeenCalledTimes(1)
      }
    }
    await vi.waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1))
    await checkPhase('preview.downloading')
    finishDownload(new File(['hello'], 'hello.txt'))
    await vi.waitFor(() => expect(mountRenderedContent).toHaveBeenCalledTimes(1))
    await checkPhase('preview.reading')
    finishRender({})
    expect((await pending).status).toBe('ready')
    expect(mountRenderedContent).toHaveBeenCalledTimes(1)
    state.loadingState.startLoading('Host supplied progress')
    state.input.value.locale = 'ja-JP'
    await nextTick()
    expect(state.loadingState.message.value).toBe('Host supplied progress')
  })
  it('refreshes an existing error for every locale while retaining renderer options identity', async () => {
    const state = setup({ locale: 'en-US' })
    const retainedOptions = state.getOptions()
    expect(state.error.value.title).toBe('Preview failed')
    for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
      state.input.value = { locale }
      await nextTick()
      expect(state.error.value.title).toBe(createFileViewerErrorState('pdf', 'NETWORK_DIAGNOSTIC', DEFAULT_FILE_VIEWER_STATE_THEME, { locale }).title)
      expect(state.getOptions()).toBe(retainedOptions)
      expect(state.error.value.message).toContain('NETWORK_DIAGNOSTIC')
    }
  })

  it('refreshes theme, density and toolbar consumers for ordinary option changes', async () => {
    const state = setup({ locale: 'en-US', theme: 'light', ui: { density: 'comfortable' }, toolbar: { download: true } })
    const retainedOptions = state.getOptions()
    expect(state.viewerTheme.value).toBe('light')
    expect(state.viewerDensity.value).toBe('comfortable')
    expect(state.normalizedToolbar.value.download).toBe(true)
    state.input.value.theme = 'dark'
    state.input.value.ui = { density: 'compact' }
    state.input.value.toolbar = { download: false }
    await nextTick()
    expect(state.viewerTheme.value).toBe('dark')
    expect(state.viewerDensity.value).toBe('compact')
    expect(state.normalizedToolbar.value.download).toBe(false)
    expect(state.getOptions()).toBe(retainedOptions)
    state.scope.stop()
    state.input.value.locale = 'ru-RU'
    expect(state.viewerI18n.locale).toBe('en-US')
  })
})
