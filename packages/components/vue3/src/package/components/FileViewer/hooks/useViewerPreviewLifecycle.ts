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

const opaqueOptionIds = new WeakMap<object, number>()
let nextOpaqueOptionId = 1

const opaqueOptionIdentity = (value: object) => {
  const known = opaqueOptionIds.get(value)
  if (known !== undefined) {
    return known
  }
  const next = nextOpaqueOptionId++
  opaqueOptionIds.set(value, next)
  return next
}

const renderOptionsSignature = (value: unknown, ancestors = new WeakSet<object>()): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'boolean') return `boolean:${value}`
  if (typeof value === 'bigint') return `bigint:${value}`
  if (typeof value === 'number') return `number:${Number.isNaN(value) ? 'NaN' : value}`
  if (typeof value === 'string') return `string:${JSON.stringify(value)}`
  if (typeof value === 'symbol') return `symbol:${String(value)}`
  if (typeof value === 'function') return `function:${opaqueOptionIdentity(value)}`

  const object = value as object
  if (ancestors.has(object)) {
    return `cycle:${opaqueOptionIdentity(object)}`
  }
  const prototype = Object.getPrototypeOf(object)
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(object)) {
    return `object:${opaqueOptionIdentity(object)}`
  }

  ancestors.add(object)
  const result = Array.isArray(object)
    ? `array:[${object.map(item => renderOptionsSignature(item, ancestors)).join(',')}]`
    : `record:{${Object.keys(object).sort().map(key => (
      `${JSON.stringify(key)}:${renderOptionsSignature((object as Record<string, unknown>)[key], ancestors)}`
    )).join(',')}}`
  ancestors.delete(object)
  return result
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
  // Parents commonly rebuild their top-level options object for shell state.
  // Reload only when the renderer-owned options actually change.
  const getRenderOptionsSignature = () => renderOptionsSignature(getRenderOptions?.())
  watch([getFile, getUrl, getSourceFilename || (() => undefined), getRenderOptionsSignature], () => {
    void runFileViewerPreviewSourceChange({
      onRefreshPreview: refreshPreview
    })
  }, { immediate: true })

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
