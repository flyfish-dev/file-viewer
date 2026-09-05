import FileViewer from './components/FileViewer'
import type { App, Component } from 'vue'
import type { FileViewerExpose } from './common/type'

/**
 * Flyfish Viewer Vue3 包入口。
 *
 * - Vue3 项目安装 `@flyfish-group/file-viewer3`
 * - Vue2.7 项目安装 `@flyfish-group/file-viewer`
 *
 * 两个包都会注册同名 `<file-viewer>` 组件，并保持 `url` / `file`
 * 这两条输入路径的一致行为。
 */
const components: [[string, Component]] = [
  ['file-viewer', FileViewer]
]

declare interface FileViewerInstaller {

  /**
   * 全局注册 `<file-viewer>` 组件。
   */
  install(app: App, options?: FileViewerVue3PluginOptions): void;
}

export interface FileViewerVue3PluginOptions {
  componentName?: string;
}

export type FileViewerVue3Handle = FileViewerExpose;

/** Vue3 plugin installer. Component styles follow each instance's isolation mode. */
class Installer implements FileViewerInstaller {

  private installed: boolean = false

  public install(app: App, options: FileViewerVue3PluginOptions = {}): void {
    if (this.installed) return
    components.forEach(([name, component]) => app.component(options.componentName || name, component))
    this.installed = true
  }
}

export default new Installer()

export {
  FileViewer
}

export {
  createFlyfishFileViewer,
  mountFlyfishFileViewer
} from './native'

export type {
  CreateFlyfishFileViewerOptions,
  FlyfishFileViewerNativeController,
  FlyfishFileViewerNativeSource
} from './native'

export type {
  FileRef,
  ViewerAiOptions,
  ViewerApplyViewStateOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerController,
  ViewerControllerAccessor,
  ViewerControllerHandle,
  ViewerDocxOptions,
  ViewerEvent,
  ViewerEventHandler,
  ViewerEventType,
  ViewerFetchFile,
  ViewerFetchInput,
  ViewerFitMode,
  ViewerFitOptions,
  ViewerFitResult,
  ViewerMountOptions,
  ViewerOptions,
  ViewerPdfOptions,
  ViewerPresentationOptions,
  ViewerSpreadsheetOptions,
  ViewerCoreOptions,
  ViewerSearchOptions,
  ViewerSourceInput,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition,
  ViewerTypstOptions,
  ViewerUiDensity,
  ViewerUiOptions,
  ViewerViewState,
  ViewerWatermarkOptions,
  ViewerLifecycleContext,
  ViewerOperationContext,
  ViewerState,
  ViewerStateListener,
} from './controller'

export type {
  FileRenderContext,
  FileRenderExportAdapter,
  FileRenderExportMode,
  FileRenderExportOptions,
  FileViewerAiOptions,
  FileViewerApplyViewStateOptions,
  FileViewerArchiveOptions,
  FileViewerBeforeOperation,
  FileViewerCadColorMode,
  FileViewerCadDwfLineWeightMode,
  FileViewerCadOptions,
  FileViewerCadRenderer,
  FileViewerDocxOptions,
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerEmits,
  FileViewerEventMap,
  FileViewerExpose,
  FileViewerLifecycleContext,
  FileViewerLifecycleHooks,
  FileViewerLifecyclePhase,
  FileViewerOperationAvailability,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerPdfOptions,
  FileViewerSpreadsheetOptions,
  FileViewerProps,
  FileViewerSearchMatch,
  FileViewerSearchOptions,
  FileViewerSearchProvider,
  FileViewerSearchState,
  FileViewerSourceType,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  FileViewerToolbarSlotProps,
  FileViewerThemeMode,
  FileViewerTypstOptions,
  FileViewerViewScrollState,
  FileViewerViewState,
  FileViewerViewStateChange,
  FileViewerViewStateChangeAction,
  FileViewerViewStateChangeSource,
  FileViewerViewStateProvider,
  FileViewerWatermarkOptions,
  FileViewerZoomProvider,
  FileViewerZoomState
} from './common/type'
