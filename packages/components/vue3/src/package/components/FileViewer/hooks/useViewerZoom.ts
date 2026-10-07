import { reactive, type Ref } from 'vue'
import {
  applyFileViewerZoomState,
  createFileViewerZoomController,
  createFileViewerZoomControllerActionHandlers,
  createFileViewerZoomState,
  type FileViewerOperationType,
  type FileViewerOptions,
} from '@file-viewer/core'

interface UseFileViewerZoomOptions {
  output: Ref<HTMLDivElement | null>;
  enabled: () => boolean;
  gestures: () => FileViewerOptions['zoomGestures'];
  runBeforeOperation: (operation: FileViewerOperationType) => Promise<boolean>;
}

/**
 * FileViewer 组件层的缩放门面。
 *
 * provider 注册、状态读取和 MutationObserver 调度由 core controller 负责；
 * 这里只保留 Vue 响应式状态同步、操作前置钩子和组件 ref API。
 */
export const useViewerZoom = ({
  output,
  enabled,
  gestures,
  runBeforeOperation
}: UseFileViewerZoomOptions) => {
  const state = reactive(createFileViewerZoomState())
  const controller = createFileViewerZoomController({
    root: () => output.value,
    enabled,
    gestures,
    beforeZoom: operation => runBeforeOperation(operation),
    onChange: nextState => {
      applyFileViewerZoomState(state, nextState)
    }
  })
  const actions = createFileViewerZoomControllerActionHandlers(state, controller)

  return {
    zoomState: state,
    ...actions
  }
}
