import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { pdfRenderer } from '../packages/renderers/pdf/src/index'
import {
  FILE_VIEWER_PREVIEW_MESSAGES,
  createFileViewerLoadStartState,
  createFileViewerRenderCompleteState,
  createFileViewerRequestController
} from '../packages/core/src'
import { useViewerSourceLoading } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerSourceLoading'
import type { FileViewerLifecycleContext } from '../packages/components/vue3/src/package/common/type'

describe('Vue FileViewer source loading hook', () => {
  it('keeps local file loading state and lifecycle events aligned with the legacy component flow', async () => {
    const file = new File(['hello file viewer'], 'hello.txt', { type: 'text/plain' })
    const filename = ref('')
    const currentFile = ref<File | null>(null)
    const currentBuffer = ref<ArrayBuffer | null>(null)
    const currentSourceUrl = ref<string | null>(null)
    const renderedReady = ref(false)
    const progressiveReady = ref(true)
    const lifecycleEvents: FileViewerLifecycleContext[] = []
    const renderSession = { destroy: vi.fn() }
    const clearRenderedContent = vi.fn()
    const mountRenderedContent = vi.fn(async () => renderSession)
    const setActiveRenderSession = vi.fn()
    const startLoading = vi.fn()
    const stopLoading = vi.fn()

    const startedAt = new Map<number, number>()
    const sourceLoading = useViewerSourceLoading({
      getFile: () => file,
      getUrl: () => undefined,
      getOptions: () => undefined,
      filename,
      currentFile,
      currentBuffer,
      currentSourceUrl,
      renderedReady,
      progressiveReady,
      requestController: createFileViewerRequestController(),
      clearRenderedContent,
      mountRenderedContent,
      destroyRenderSession: vi.fn(),
      setActiveRenderSession,
      buildLoadStartState: input => createFileViewerLoadStartState({
        ...input,
        filename: filename.value,
        bufferSize: currentBuffer.value?.byteLength,
        loadingMessage: input.source === 'url'
          ? FILE_VIEWER_PREVIEW_MESSAGES.downloading
          : FILE_VIEWER_PREVIEW_MESSAGES.reading
      }),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState({
        ...input,
        filename: filename.value,
        bufferSize: currentBuffer.value?.byteLength,
        startedAt: startedAt.get(input.version)
      }),
      notifyLifecycle: context => {
        lifecycleEvents.push(context)
      },
      setActiveDocumentContext: vi.fn(),
      markLoadStarted: version => {
        startedAt.set(version, Date.now())
      },
      clearLoadStarted: version => {
        startedAt.delete(version)
      },
      startLoading,
      setLoadingMessage: vi.fn(),
      stopLoading,
      showError: vi.fn(),
      clearError: vi.fn(),
      resetLoading: vi.fn(),
      formatErrorMessage: (prefix, nextError) => `${prefix}: ${String(nextError)}`
    })

    await sourceLoading.refreshPreview()

    expect(clearRenderedContent).toHaveBeenCalledWith('replace')
    expect(startLoading).toHaveBeenCalledWith(FILE_VIEWER_PREVIEW_MESSAGES.reading)
    expect(stopLoading).toHaveBeenCalledTimes(1)
    expect(filename.value).toBe('hello.txt')
    expect(currentFile.value).toBe(file)
    expect(currentSourceUrl.value).toBeNull()
    expect(currentBuffer.value?.byteLength).toBe(file.size)
    expect(renderedReady.value).toBe(true)
    expect(progressiveReady.value).toBe(false)
    expect(mountRenderedContent).toHaveBeenCalledWith(
      currentBuffer.value,
      file,
      1,
      undefined,
      undefined,
      expect.any(AbortSignal)
    )
    expect(setActiveRenderSession).toHaveBeenCalledWith(renderSession)
    expect(lifecycleEvents.map(item => item.phase)).toEqual(['load-start', 'load-complete'])
    expect(lifecycleEvents[1]).toMatchObject({
      filename: 'hello.txt',
      source: 'file',
      size: file.size
    })
  })

  it('delegates local preview load errors to the core reporting helper', async () => {
    const file = new File(['broken file viewer'], 'broken.txt', { type: 'text/plain' })
    const filename = ref('')
    const currentFile = ref<File | null>(null)
    const currentBuffer = ref<ArrayBuffer | null>(null)
    const currentSourceUrl = ref<string | null>(null)
    const renderedReady = ref(false)
    const progressiveReady = ref(false)
    const renderError = new Error('render failed')
    const showError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const sourceLoading = useViewerSourceLoading({
      getFile: () => file,
      getUrl: () => undefined,
      getOptions: () => undefined,
      filename,
      currentFile,
      currentBuffer,
      currentSourceUrl,
      renderedReady,
      progressiveReady,
      requestController: createFileViewerRequestController(),
      clearRenderedContent: vi.fn(),
      mountRenderedContent: vi.fn(async () => {
        throw renderError
      }),
      destroyRenderSession: vi.fn(),
      setActiveRenderSession: vi.fn(),
      buildLoadStartState: input => createFileViewerLoadStartState({
        ...input,
        filename: filename.value,
        loadingMessage: FILE_VIEWER_PREVIEW_MESSAGES.reading
      }),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState({
        ...input,
        filename: filename.value
      }),
      notifyLifecycle: vi.fn(),
      setActiveDocumentContext: vi.fn(),
      markLoadStarted: vi.fn(),
      clearLoadStarted: vi.fn(),
      startLoading: vi.fn(),
      setLoadingMessage: vi.fn(),
      stopLoading: vi.fn(),
      showError,
      clearError: vi.fn(),
      resetLoading: vi.fn(),
      formatErrorMessage: (prefix, nextError) => `${prefix}: ${nextError instanceof Error ? nextError.message : String(nextError)}`
    })

    try {
      await sourceLoading.refreshPreview()

      expect(consoleError).toHaveBeenCalledWith('读取文件异常: render failed')
      // Custom formatters retain their single-string callback and raw diagnostic.
      expect(showError).toHaveBeenCalledWith('读取文件异常: render failed')
      expect(renderError.message).toBe('render failed')
    } finally {
      consoleError.mockRestore()
    }
  })
})


describe('GitHub #418 Vue signed PDF acquisition policy', () => {
  it('keeps local bytes, respects explicit buffering, and does not reuse a previous display filename', async () => {
    const original = new File(['%PDF-local'], 'local.pdf', { type: 'application/pdf' })
    let file: File | undefined = original
    let url: string | undefined
    let type: string | undefined = 'pdf'
    let streaming = true
    const filename = ref('')
    const currentBuffer = ref<ArrayBuffer | null>(null)
    const mountRenderedContent = vi.fn(async () => ({ destroy: vi.fn() }))
    const fetchFile = vi.fn(async () => new Response(new Blob(['%PDF-remote'])))
    vi.stubGlobal('window', { location: { href: 'https://app.example.test/' } })
    vi.stubGlobal('fetch', fetchFile)
    const hook = useViewerSourceLoading({
      getFile: () => file, getUrl: () => url, getSourceType: () => type,
      getOptions: () => ({ autoRenderers: false, rendererMode: 'replace', renderers: [pdfRenderer], pdf: { streaming } }),
      filename, currentFile: ref<File | null>(null), currentBuffer,
      currentSourceUrl: ref<string | null>(null), renderedReady: ref(false), progressiveReady: ref(false),
      requestController: createFileViewerRequestController(), clearRenderedContent: vi.fn(),
      mountRenderedContent, destroyRenderSession: vi.fn(), setActiveRenderSession: vi.fn(),
      buildLoadStartState: input => createFileViewerLoadStartState({ ...input, filename: filename.value }),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState({ ...input, filename: filename.value }),
      notifyLifecycle: vi.fn(), setActiveDocumentContext: vi.fn(), markLoadStarted: vi.fn(), clearLoadStarted: vi.fn(),
      startLoading: vi.fn(), setLoadingMessage: vi.fn(), stopLoading: vi.fn(), showError: vi.fn(), clearError: vi.fn(), resetLoading: vi.fn(),
      formatErrorMessage: (prefix, error) => `${prefix}: ${String(error)}`,
    })
    try {
      await hook.refreshPreview()
      expect(mountRenderedContent.mock.calls[0][0].byteLength).toBe(original.size)
      expect(fetchFile).not.toHaveBeenCalled()
      file = undefined
      url = 'https://storage.example.test/download?token=1'
      await hook.refreshPreview()
      expect(mountRenderedContent.mock.calls[1][0].byteLength).toBe(0)
      expect(mountRenderedContent.mock.calls[1][4]).toBe(url)
      expect(mountRenderedContent.mock.calls[1][6]).toBe('pdf')
      streaming = false
      await hook.refreshPreview()
      expect(mountRenderedContent.mock.calls[2][0].byteLength).toBe(11)
      expect(mountRenderedContent.mock.calls[2][4]).toBeUndefined()
      expect(fetchFile).toHaveBeenCalledTimes(1)
      type = undefined
      url = 'https://storage.example.test/next.txt'
      streaming = true
      await hook.refreshPreview()
      expect(fetchFile).toHaveBeenCalledTimes(2)
      expect(filename.value).toBe('next.txt')
      expect(mountRenderedContent.mock.calls[3][4]).toBeUndefined()
    } finally { vi.unstubAllGlobals() }
  })
})
