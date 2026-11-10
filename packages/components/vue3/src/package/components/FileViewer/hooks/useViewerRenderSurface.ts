import { nextTick, ref, shallowRef, type Ref } from 'vue'
import {
  createFileViewerRenderReadinessTarget,
  createFileViewerRenderSurfaceActionHandlers,
  createFileViewerRenderSurfaceStateTarget,
  createFileViewerSnapshotDownload,
  createFileViewerI18n,
} from '@file-viewer/core'
import type {
  FileRenderExportAdapter,
  FileViewerLifecycleContext,
  FileViewerOptions,
  FileViewerI18nContext
} from '@file-viewer/core'
import { createVueRenderSession, type FileViewerVueRenderSession } from '../rendererBridge'
import { renderNestedBuffer } from '../../../vendors/nestedRender'

interface UseViewerRenderSurfaceOptions {
  i18n?: FileViewerI18nContext;
  output: Ref<HTMLDivElement | null>;
  getOptions: () => FileViewerOptions | undefined;
  beforeDownload: () => Promise<boolean>;
  isCurrentRequest: (version: number) => boolean;
  notifyActiveUnloadStart: (
    reason?: FileViewerLifecycleContext['reason']
  ) => FileViewerLifecycleContext | null;
  notifyActiveUnloadComplete: (
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason']
  ) => void;
  clearActiveDocumentContext: () => void;
  clearDocumentState: () => void;
  refreshDocumentIndex: () => Promise<unknown> | unknown;
  startZoomObserver: () => void;
  stopZoomObserver: () => void;
  clearZoomProvider: () => void;
  refreshZoomProvider: () => void;
  startFitObserver: () => void;
  stopFitObserver: () => void;
  applyInitialFit: () => Promise<unknown> | unknown;
  startViewStateObserver: () => void;
  stopViewStateObserver: () => void;
  clearViewStateProvider: () => void;
  refreshViewStateProvider: () => void;
}

/**
 * FileViewer 组件层的渲染面板门面。
 *
 * 它只管理 Vue component package 的 DOM surface、渲染 session 和 export adapter；
 * 具体格式派发仍由 core registry + Vue renderer bridge 完成。
 */
export const useViewerRenderSurface = ({
  i18n,
  output,
  getOptions,
  beforeDownload,
  isCurrentRequest,
  notifyActiveUnloadStart,
  notifyActiveUnloadComplete,
  clearActiveDocumentContext,
  clearDocumentState,
  refreshDocumentIndex,
  startZoomObserver,
  stopZoomObserver,
  clearZoomProvider,
  refreshZoomProvider,
  startFitObserver,
  stopFitObserver,
  applyInitialFit,
  startViewStateObserver,
  stopViewStateObserver,
  clearViewStateProvider,
  refreshViewStateProvider
}: UseViewerRenderSurfaceOptions) => {
  const activeExportAdapter = shallowRef<FileRenderExportAdapter | null>(null)
  const rendererSearchAvailable = ref(false)
  const renderedReady = ref(false)
  const progressiveReady = ref(false)
  const renderReadinessTarget = createFileViewerRenderReadinessTarget({
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
  let activeRenderSession: FileViewerVueRenderSession | null = null
  const renderSurfaceStateTarget = createFileViewerRenderSurfaceStateTarget<FileViewerVueRenderSession>({
    session: {
      get: () => activeRenderSession,
      set: value => {
        activeRenderSession = value
      }
    },
    exportAdapter: {
      get: () => activeExportAdapter.value,
      set: value => {
        activeExportAdapter.value = value
      }
    }
  })

  const actions = createFileViewerRenderSurfaceActionHandlers<FileViewerVueRenderSession>({
    getContainer: () => output.value,
    surfaceState: renderSurfaceStateTarget,
    readinessState: renderReadinessTarget,
    isCurrent: isCurrentRequest,
    waitForContainer: nextTick,
    onUnloadStart: notifyActiveUnloadStart,
    onUnloadComplete: (context, nextReason) => {
      notifyActiveUnloadComplete(context ?? null, nextReason)
    },
    onClearActiveDocumentContext: clearActiveDocumentContext,
    onClearDocumentState: () => {
      rendererSearchAvailable.value = false
      clearDocumentState()
    },
    onStartZoomObserver: startZoomObserver,
    onStopZoomObserver: stopZoomObserver,
    onClearZoomProvider: clearZoomProvider,
    onStartFitObserver: startFitObserver,
    onStopFitObserver: stopFitObserver,
    onApplyInitialFit: applyInitialFit,
    onStartViewStateObserver: startViewStateObserver,
    onStopViewStateObserver: stopViewStateObserver,
    onClearViewStateProvider: clearViewStateProvider,
    onRefreshDocumentIndex: refreshDocumentIndex,
    onRefreshZoomProvider: refreshZoomProvider,
    onRefreshViewStateProvider: refreshViewStateProvider,
    render: async ({
      buffer: nextBuffer,
      file: sourceFile,
      type,
      target,
      filename,
      sourceUrl: nextSourceUrl,
      streamUrl: nextStreamUrl,
      signal: nextSignal,
      registerExportAdapter,
      onProgressiveRender,
      version
    }) => {
      const languageScope = createFileViewerI18n(getOptions(), { parent: i18n, signal: nextSignal })
      try {
        const session = await createVueRenderSession(nextBuffer, type, target as HTMLDivElement, {
          filename,
          url: nextSourceUrl,
          streamUrl: nextStreamUrl,
          signal: nextSignal,
          // Streaming URL placeholders are component state only; expose sourceFile
          // exclusively for real local File-backed random access.
          sourceFile: nextStreamUrl ? undefined : sourceFile,
          options: languageScope.options,
          i18n: languageScope,
          requestSnapshotDownload: createFileViewerSnapshotDownload({
            getOptions,
            beforeDownload,
            isCurrent: () => isCurrentRequest(version),
          }),
          registerExportAdapter,
          onProgressiveRender,
          renderNestedBuffer: async (nestedBuffer, nestedType, nestedTarget, nestedContext) => {
            return await renderNestedBuffer(nestedBuffer, nestedType, nestedTarget, {
              ...nestedContext,
              i18n: nestedContext?.i18n || languageScope,
              options: nestedContext?.options || languageScope.options
            })
          }
        }, available => {
          if (isCurrentRequest(version)) {
            rendererSearchAvailable.value = available
          }
        })
        const destroy = session.destroy
        return { ...session, destroy: async () => { languageScope.destroy(); await destroy?.() } }
      } catch (error) {
        languageScope.destroy()
        throw error
      }
    }
  })

  return {
    activeExportAdapter,
    rendererSearchAvailable,
    renderedReady,
    progressiveReady,
    ...actions
  }
}
