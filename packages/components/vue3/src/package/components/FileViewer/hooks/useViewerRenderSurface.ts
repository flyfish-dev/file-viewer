import { nextTick, ref, shallowRef, type Ref } from 'vue'
import {
  createFileViewerI18n,
  createFileViewerRenderReadinessTarget,
  createFileViewerRenderSurfaceActionHandlers,
  createFileViewerRenderSurfaceStateTarget,
  createFileViewerSnapshotDownload,
} from '@file-viewer/core'
import type {
  FileRenderExportAdapter,
  FileRenderContext,
  FileViewerI18nContext,
  FileViewerLifecycleContext,
  FileViewerOptions
} from '@file-viewer/core'
import { createVueRenderSession, type FileViewerVueRenderSession } from '../rendererBridge'
import { renderNestedBuffer } from '../../../vendors/nestedRender'

interface UseViewerRenderSurfaceOptions {
  output: Ref<HTMLDivElement | null>;
  getOptions: () => FileViewerOptions | undefined;
  i18n?: FileViewerI18nContext;
  onI18nError?: (error: unknown) => void;
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
  output,
  getOptions,
  i18n,
  onI18nError,
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
      const renderOptions = getOptions();
      const languageScope = createFileViewerI18n(i18n ? { ...renderOptions, locale: undefined, messages: undefined, i18n: undefined } : renderOptions, {
        parent: i18n, signal: nextSignal, ownerDocument: target.ownerDocument, onError: onI18nError,
      });
      const nestedRender: NonNullable<FileRenderContext['renderNestedBuffer']> = async (buffer, type, target, nestedContext) => {
        const nextContext = {
          ...nestedContext,
          options: nestedContext?.options,
          // Rebind our default recursion to the child scope, while preserving an explicit custom delegate.
          renderNestedBuffer: nestedContext?.renderNestedBuffer === nestedRender ? undefined : nestedContext?.renderNestedBuffer,
        };
        return renderNestedBuffer(buffer, type, target, nextContext, languageScope, renderOptions, onI18nError);
      };
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
          renderNestedBuffer: nestedRender
        }, available => {
          if (isCurrentRequest(version)) {
            rendererSearchAvailable.value = available
          }
        })
        return {
          get rendered() { return session.rendered },
          getAvailability: session.getAvailability?.bind(session),
          destroy: () => {
            languageScope.destroy();
            return session.destroy?.();
          },
        };
      } catch (error) {
        languageScope.destroy();
        throw error;
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
