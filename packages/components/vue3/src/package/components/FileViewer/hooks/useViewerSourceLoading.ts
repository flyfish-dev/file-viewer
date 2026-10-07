import type { Ref } from 'vue'
import {
  collectFileViewerRendererPlugins,
  createFileViewerPreviewStateTarget,
  createFileViewerSourceLoadingActionHandlers,
  getExtension,
  listFileViewerAutoRendererPresets,
  matchesFileViewerRendererFilename,
  normalizeFileViewerSourceUrl,
  resolveFileViewerRendererPresetInputs,
  translateFileViewerMessage,
} from '@file-viewer/core'
import type { FileViewerErrorMessageFormatter, FileViewerRequestController } from '@file-viewer/core'
import type {
  FileViewerFileRef as FileRef,
  FileViewerLifecycleContext,
  FileViewerLoadStartState,
  FileViewerOptions,
  FileViewerRenderCompleteState
} from '@file-viewer/core'
import type { FileViewerVueRenderSession } from '../rendererBridge'

interface UseViewerSourceLoadingOptions {
  getFile: () => FileRef | undefined;
  getUrl: () => string | undefined;
  getSourceFilename?: () => string | undefined;
  getOptions: () => FileViewerOptions | undefined;
  filename: Ref<string>;
  currentFile: Ref<File | null>;
  currentBuffer: Ref<ArrayBuffer | null>;
  currentSourceUrl: Ref<string | null>;
  renderedReady: Ref<boolean>;
  progressiveReady: Ref<boolean>;
  requestController: FileViewerRequestController;
  clearRenderedContent: (reason?: FileViewerLifecycleContext['reason']) => void;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string
  ) => Promise<FileViewerVueRenderSession | undefined>;
  destroyRenderSession: (session?: FileViewerVueRenderSession | null) => void;
  setActiveRenderSession: (session: FileViewerVueRenderSession | null) => void;
  buildLoadStartState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerLoadStartState;
  buildRenderCompleteState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerRenderCompleteState;
  notifyLifecycle: (context: FileViewerLifecycleContext) => void;
  setActiveDocumentContext: (context: FileViewerLifecycleContext) => void;
  markLoadStarted: (version: number) => void;
  clearLoadStarted: (version: number) => void;
  startLoading: (message: string) => void;
  setLoadingMessage: (message: string) => void;
  stopLoading: () => void;
  showError: (message: string) => void;
  clearError: () => void;
  resetLoading: () => void;
  formatErrorMessage: FileViewerErrorMessageFormatter;
}

/**
 * FileViewer 组件层的来源加载门面。
 *
 * 请求版本、取消错误、文件包装、PDF URL 流式判断等通用能力来自
 * `@file-viewer/core`；这里只把 Vue 状态、加载态和渲染挂载回调串起来。
 */
export const useViewerSourceLoading = ({
  getFile,
  getUrl,
  getSourceFilename,
  getOptions,
  filename,
  currentFile,
  currentBuffer,
  currentSourceUrl,
  renderedReady,
  progressiveReady,
  requestController,
  clearRenderedContent,
  mountRenderedContent,
  destroyRenderSession,
  setActiveRenderSession,
  buildLoadStartState,
  buildRenderCompleteState,
  notifyLifecycle,
  setActiveDocumentContext,
  markLoadStarted,
  clearLoadStarted,
  startLoading,
  setLoadingMessage,
  stopLoading,
  showError,
  clearError,
  resetLoading,
  formatErrorMessage
}: UseViewerSourceLoadingOptions) => {
  const previewStateTarget = createFileViewerPreviewStateTarget({
    filename: {
      get: () => filename.value,
      set: value => {
        filename.value = value
      }
    },
    file: {
      get: () => currentFile.value,
      set: value => {
        currentFile.value = value
      }
    },
    buffer: {
      get: () => currentBuffer.value,
      set: value => {
        currentBuffer.value = value
      }
    },
    sourceUrl: {
      get: () => currentSourceUrl.value,
      set: value => {
        currentSourceUrl.value = value
      }
    },
    renderedReady: {
      get: () => renderedReady.value,
      set: value => {
        renderedReady.value = value
      }
    },
    progressiveReady: {
      get: () => progressiveReady.value,
      set: value => {
        progressiveReady.value = value
      }
    }
  })

  const resolveStreamPreferredSource = async ({
    sourceFilename,
    extension,
    file,
    url,
    signal
  }: {
    sourceFilename: string;
    extension: string;
    file?: File;
    url?: string;
    signal?: AbortSignal;
  }) => {
    const options = getOptions() || {}
    const autoSetting = options.autoRenderers
    const autoRenderersEnabled = typeof autoSetting === 'boolean'
      ? autoSetting
      : autoSetting?.enabled !== undefined
        ? autoSetting.enabled
        : (options.rendererMode || 'extend') !== 'replace'
    const rendererInputs = [
      ...(autoRenderersEnabled ? listFileViewerAutoRendererPresets() : []),
      ...resolveFileViewerRendererPresetInputs(options.preset),
      ...resolveFileViewerRendererPresetInputs(options.presets),
      ...(options.renderers ? [options.renderers] : [])
    ]
    const definitions = collectFileViewerRendererPlugins(rendererInputs)
      .flatMap(plugin => [...(plugin.definitions || [])])

    for (const definition of definitions) {
      if (definition.sourceAccess !== 'stream-preferred') continue

      const detected = await definition.resolveSourceType?.({
        filename: sourceFilename,
        extension,
        file,
        url,
        mimeType: file?.type,
        signal
      })
      if (typeof detected === 'string' && detected.trim()) {
        return detected.trim()
      }
      if (detected) {
        return true
      }

      if (matchesFileViewerRendererFilename(definition, sourceFilename)) {
        return true
      }
      if (
        definition.extensions.some(
          item => item.toLowerCase() === extension.toLowerCase()
        )
      ) {
        return true
      }
    }

    return false
  }

  const shouldStreamRemoteUrl = ({
    url,
    filename: sourceFilename,
    extension,
    signal
  }: {
    url: string;
    filename: string;
    extension: string;
    pageHref?: string;
    signal?: AbortSignal;
  }) => resolveStreamPreferredSource({
    sourceFilename,
    extension,
    url,
    signal
  })

  const shouldStreamLocalFile = ({
    file,
    filename: sourceFilename,
    extension,
    signal
  }: {
    file: File;
    filename: string;
    extension: string;
    signal?: AbortSignal;
  }) => resolveStreamPreferredSource({
    sourceFilename,
    extension: extension || getExtension(sourceFilename),
    file,
    signal
  })

  const actions = createFileViewerSourceLoadingActionHandlers<FileViewerVueRenderSession>({
    getFile,
    getUrl,
    getCurrentFilename: () => getSourceFilename?.() || filename.value,
    shouldStreamLocalFile,
    getPdfStreaming: () => getOptions()?.pdf?.streaming,
    shouldStreamRemoteUrl,
    getI18n: getOptions,
    getPageHref: () => window.location.href,
    previewTarget: previewStateTarget,
    requestController,
    downloadFile: async ({ url: downloadUrl, signal }) => {
      const requestUrl = normalizeFileViewerSourceUrl(downloadUrl) || downloadUrl
      const response = await fetch(requestUrl, { signal })
      if (!response.ok) {
        throw new Error(`${translateFileViewerMessage(getOptions(), 'error.remoteDownload')}: HTTP ${response.status}`)
      }
      return response.blob()
    },
    mountRenderedContent,
    destroyRenderSession,
    buildLoadStartState,
    buildRenderCompleteState,
    onMarkLoadStarted: markLoadStarted,
    onClearLoadStarted: clearLoadStarted,
    onStartLoading: startLoading,
    onSetLoadingMessage: setLoadingMessage,
    onStopLoading: stopLoading,
    onShowError: showError,
    onClearError: clearError,
    onResetLoading: resetLoading,
    onClearRenderedContent: clearRenderedContent,
    onSession: setActiveRenderSession,
    onActiveDocumentContext: setActiveDocumentContext,
    onLifecycle: notifyLifecycle,
    formatErrorMessage
  })

  return {
    ...actions,
    cancelPreview: (reason: FileViewerLifecycleContext['reason'] = 'component-unmount') => {
      actions.cancelPreview(reason)
    },
    refreshPreview: async () => {
      await actions.refreshPreview()
    },
    resetViewer: (reason?: FileViewerLifecycleContext['reason']) => {
      actions.resetViewer(reason)
    }
  }
}
