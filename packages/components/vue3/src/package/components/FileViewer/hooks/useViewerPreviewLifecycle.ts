import { onBeforeUnmount, watch } from 'vue'
import {
  runFileViewerPreviewComponentUnmount,
  runFileViewerPreviewSourceChange,
  type FileViewerLifecycleContext
} from '@file-viewer/core'

interface UseViewerPreviewLifecycleOptions {
  getFile: () => unknown;
  getUrl: () => unknown;
  getSourceFilename?: () => unknown;
  getRenderOptions?: () => unknown;
  refreshPreview: () => Promise<void> | void;
  cancelPreview: (reason: FileViewerLifecycleContext['reason']) => void;
  clearRenderedContent: (reason: FileViewerLifecycleContext['reason']) => void;
  resetLoading: () => void;
  stopZoomObserver: () => void;
  stopFitObserver: () => void;
  stopViewStateObserver: () => void;
}

/**
 * FileViewer 入口组件的预览生命周期绑定。
 *
 * 组件只负责传入当前 source getter 和清理动作；实际加载、取消和缩放状态
 * 仍由各自 hooks/core controller 负责，避免入口继续散落 watch/unmount 细节。
 */
export const useViewerPreviewLifecycle = ({
  getFile,
  getUrl,
  getSourceFilename,
  getRenderOptions,
  refreshPreview,
  cancelPreview,
  clearRenderedContent,
  resetLoading,
  stopZoomObserver,
  stopFitObserver,
  stopViewStateObserver
}: UseViewerPreviewLifecycleOptions) => {
  watch([getFile, getUrl, getSourceFilename || (() => undefined), getRenderOptions || (() => undefined)], () => {
    void runFileViewerPreviewSourceChange({
      onRefreshPreview: refreshPreview
    })
  }, { immediate: true, deep: true })

  onBeforeUnmount(() => {
    runFileViewerPreviewComponentUnmount({
      onCancelPreview: cancelPreview,
      onClearRenderedContent: clearRenderedContent,
      onResetLoading: resetLoading,
      onStopZoomObserver: stopZoomObserver,
      onStopFitObserver: stopFitObserver,
      onStopViewStateObserver: stopViewStateObserver
    })
  })
}
