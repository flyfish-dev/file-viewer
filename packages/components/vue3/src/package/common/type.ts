import type {
  FileViewerAiOptions as CoreFileViewerAiOptions,
  FileViewerArchiveOptions as CoreFileViewerArchiveOptions,
  FileViewerBeforeOperation as CoreFileViewerBeforeOperation,
  FileViewerCadColorMode as CoreFileViewerCadColorMode,
  FileViewerCadDwfLineWeightMode as CoreFileViewerCadDwfLineWeightMode,
  FileViewerCadOptions as CoreFileViewerCadOptions,
  FileViewerCadRenderer as CoreFileViewerCadRenderer,
  FileViewerComponentEmits as CoreFileViewerComponentEmits,
  FileViewerComponentEventMap as CoreFileViewerComponentEventMap,
  FileViewerComponentProps as CoreFileViewerComponentProps,
  FileViewerDocxOptions as CoreFileViewerDocxOptions,
  FileViewerDocumentAnchor as CoreFileViewerDocumentAnchor,
  FileViewerDocumentChunk as CoreFileViewerDocumentChunk,
  FileViewerFileRef,
  FileViewerFitMode as CoreFileViewerFitMode,
  FileViewerFitOptions as CoreFileViewerFitOptions,
  FileViewerFitResize as CoreFileViewerFitResize,
  FileViewerFitResult as CoreFileViewerFitResult,
  FileViewerLifecycleContext as CoreFileViewerLifecycleContext,
  FileViewerLifecycleHooks as CoreFileViewerLifecycleHooks,
  FileViewerLifecyclePhase as CoreFileViewerLifecyclePhase,
  FileViewerOperationAvailability as CoreFileViewerOperationAvailability,
  FileViewerOperationContext as CoreFileViewerOperationContext,
  FileViewerOperationType as CoreFileViewerOperationType,
  FileViewerOptions as CoreFileViewerOptions,
  FileViewerPdfOptions as CoreFileViewerPdfOptions,
  FileViewerSpreadsheetOptions as CoreFileViewerSpreadsheetOptions,
  FileViewerPublicApi as CoreFileViewerPublicApi,
  FileViewerRenderedInstance as CoreFileViewerRenderedInstance,
  FileRenderContext as CoreFileRenderContext,
  FileRenderExportAdapter as CoreFileRenderExportAdapter,
  FileRenderExportMode as CoreFileRenderExportMode,
  FileRenderExportOptions as CoreFileRenderExportOptions,
  FileRenderHandler,
  FileRenderHandlerComposite,
  FileViewerSearchMatch as CoreFileViewerSearchMatch,
  FileViewerSearchOptions as CoreFileViewerSearchOptions,
  FileViewerSearchProvider as CoreFileViewerSearchProvider,
  FileViewerSearchState as CoreFileViewerSearchState,
  FileViewerSourceKind as CoreFileViewerSourceKind,
  FileViewerThemeMode as CoreFileViewerThemeMode,
  FileViewerToolbarOptions as CoreFileViewerToolbarOptions,
  FileViewerToolbarPosition as CoreFileViewerToolbarPosition,
  FileViewerTypstOptions as CoreFileViewerTypstOptions,
  FileViewerApplyViewStateOptions as CoreFileViewerApplyViewStateOptions,
  FileViewerViewScrollState as CoreFileViewerViewScrollState,
  FileViewerViewState as CoreFileViewerViewState,
  FileViewerViewStateChange as CoreFileViewerViewStateChange,
  FileViewerViewStateChangeAction as CoreFileViewerViewStateChangeAction,
  FileViewerViewStateChangeSource as CoreFileViewerViewStateChangeSource,
  FileViewerViewStateProvider as CoreFileViewerViewStateProvider,
  FileViewerWatermarkOptions as CoreFileViewerWatermarkOptions,
  FileViewerZoomProvider as CoreFileViewerZoomProvider,
  FileViewerZoomState as CoreFileViewerZoomState
} from '@file-viewer/core'

/**
 * 任意渲染器挂载完成后返回的可卸载实例。
 */
export type Rendered = CoreFileViewerRenderedInstance;

/**
 * 组件可接受的本地二进制来源。
 *
 * 对外接入时最推荐传入带正确文件名的 `File`。如果业务侧拿到的是
 * `Blob` 或 `ArrayBuffer`，请先包装成 `new File([...], 'demo.pdf')`，
 * 这样渲染器才能通过扩展名选择正确的预览链路。
 */
export type FileRef = FileViewerFileRef;

/**
 * 水印配置。
 *
 * `text` 与 `image` 至少设置一个；同时传入时优先使用图片水印。
 * 图片水印可以是 http(s) URL、相对路径或 data URL。
 */
export type FileViewerWatermarkOptions = CoreFileViewerWatermarkOptions;

/**
 * 预览器内置操作栏位置。
 *
 * `auto` 是默认策略: PDF 这类有独立阅读工具栏的格式会自动悬浮到右下角，
 * 其他格式继续使用顶部操作栏；也可以显式传 `top`、`top-center` 或 `bottom-right`。
 */
export type FileViewerToolbarPosition = CoreFileViewerToolbarPosition;

/**
 * 预览器内置操作栏配置。
 */
export type FileViewerToolbarOptions = CoreFileViewerToolbarOptions;

/**
 * 压缩包预览配置。
 */
export type FileViewerArchiveOptions = CoreFileViewerArchiveOptions;

/**
 * PDF 预览配置。
 */
export type FileViewerPdfOptions = CoreFileViewerPdfOptions;

/**
 * 表格预览配置。
 */
export type FileViewerSpreadsheetOptions = CoreFileViewerSpreadsheetOptions;

/**
 * Typst 预览配置。
 */
export type FileViewerTypstOptions = CoreFileViewerTypstOptions;

export type FileViewerCadRenderer = CoreFileViewerCadRenderer;
export type FileViewerCadColorMode = CoreFileViewerCadColorMode;
export type FileViewerCadDwfLineWeightMode = CoreFileViewerCadDwfLineWeightMode;

/**
 * CAD 预览配置。
 *
 * 独立 CAD renderer 会从静态资源目录下的 `wasm/cad/`
 * 按需加载 LibreDWG WASM、DWF raster WASM 与 DWG Worker。
 * 私有化部署或静态资源路径不同的场景，可以显式覆盖对应 URL。
 */
export type FileViewerCadOptions = CoreFileViewerCadOptions;

/**
 * 文档定位锚点。
 *
 * 预览器会尽量把当前渲染结果中的页面、段落、表格行、代码块等内容
 * 抽象成稳定锚点。不同格式的“行”粒度不完全相同：文本类文档通常可到
 * 段落/行块，PDF 这类画布型文档会优先回退到页与可用文本层。
 */
export type FileViewerDocumentAnchor = CoreFileViewerDocumentAnchor;

/**
 * AI / 搜索可复用的文档文本切片。
 *
 * 这里不直接绑定任何云端能力，只提供溯源、向量化和高亮所需的稳定结构。
 */
export type FileViewerDocumentChunk = CoreFileViewerDocumentChunk;

/**
 * 文档搜索配置。
 */
export type FileViewerSearchOptions = CoreFileViewerSearchOptions;

/**
 * 单条搜索命中。
 */
export type FileViewerSearchMatch = CoreFileViewerSearchMatch;

/**
 * 当前搜索状态。
 */
export type FileViewerSearchState = CoreFileViewerSearchState;

/**
 * 渲染器自定义搜索提供器。
 *
 * PDF.js、EPUB 阅读器、虚拟表格等格式拥有自己的文本层或虚拟滚动结构，
 * 不能总是由通用 DOM 高亮直接改写内部节点。渲染器可以在根节点上注册
 * 该提供器，让 FileViewer 的搜索 API 继续保持统一入口。
 */
export type FileViewerSearchProvider = CoreFileViewerSearchProvider;

/**
 * 当前预览内容的缩放状态。
 *
 * `scale` 使用 1 = 100% 的语义。部分格式会先按容器宽度自动适配，再在此
 * 基础上放大缩小；对外仍返回最终有效比例，便于业务工具栏同步显示。
 */
export type FileViewerZoomState = CoreFileViewerZoomState;

/**
 * 渲染器自定义缩放提供器。
 *
 * PDF、CAD、图片、Office 文档等格式拥有不同的内部缩放/重排逻辑；
 * 统一工具栏只调用该协议，不对外层 DOM 做粗暴 CSS transform，避免表格、
 * canvas、CAD 交互出现坐标偏移。
 */
export type FileViewerZoomProvider = CoreFileViewerZoomProvider;

export type FileViewerFitMode = CoreFileViewerFitMode;

export type FileViewerFitResize = CoreFileViewerFitResize;

export type FileViewerFitOptions = CoreFileViewerFitOptions;

export type FileViewerFitResult = CoreFileViewerFitResult;

/**
 * 可同步/可恢复的预览视图状态。
 *
 * 目前 PDF renderer 会填充页码、页数、缩放、旋转、滚动和导航状态；投屏、
 * 双端同步或阅读进度恢复可以监听 `view-state-change` 并将快照传给
 * `applyViewState()`。
 */
export type FileViewerViewState = CoreFileViewerViewState;

export type FileViewerViewScrollState = CoreFileViewerViewScrollState;

export type FileViewerViewStateChange = CoreFileViewerViewStateChange;

export type FileViewerViewStateChangeAction = CoreFileViewerViewStateChangeAction;

export type FileViewerViewStateChangeSource = CoreFileViewerViewStateChangeSource;

export type FileViewerApplyViewStateOptions = CoreFileViewerApplyViewStateOptions;

export type FileViewerViewStateProvider = CoreFileViewerViewStateProvider;

/**
 * AI 友好能力配置。
 *
 * 预览器本身不内置云端模型调用；这里提供可选文本切片结构，业务侧可以
 * 基于 `getDocumentTextChunks()` 做向量化、溯源、AI 摘要和命中高亮。
 */
export type FileViewerAiOptions = CoreFileViewerAiOptions;

/**
 * 预览器主题模式。
 *
 * `system` 是默认值，会继续跟随浏览器 `prefers-color-scheme`；
 * 浅色业务系统即使运行在深色操作系统中，也可以显式传 `light`
 * 锁定预览区、工具栏和支持主题切换的渲染器为浅色。
 */
export type FileViewerThemeMode = CoreFileViewerThemeMode;

export type FileViewerSourceType = CoreFileViewerSourceKind;

export type FileViewerLifecyclePhase = CoreFileViewerLifecyclePhase;

export type FileViewerLifecycleContext = CoreFileViewerLifecycleContext;

export type FileViewerLifecycleHooks = CoreFileViewerLifecycleHooks;

export type FileViewerOperationType = CoreFileViewerOperationType;

/**
 * 当前文档对内置操作的真实可用性。
 *
 * `toolbar` 只表达宿主想不想展示某个按钮；这里表达当前文件类型和渲染器
 * 是否真的能稳定完成该操作。尤其是打印，虚拟表格、播放器、3D 画布、
 * EPUB 阅读器等链路无法保证完整分页输出时会主动关闭。
 */
export type FileViewerOperationAvailability = CoreFileViewerOperationAvailability;

export type FileViewerOperationContext = CoreFileViewerOperationContext;

export type FileViewerBeforeOperation = CoreFileViewerBeforeOperation;

export type FileViewerProps = CoreFileViewerComponentProps;

export type FileViewerEventMap = CoreFileViewerComponentEventMap;

/**
 * `<file-viewer>` 组件的标准事件契约。
 */
export type FileViewerEmits = CoreFileViewerComponentEmits;

/**
 * `<file-viewer>` 组件实例对外暴露的统一方法集。
 *
 * Vue 模板 ref、文档比对页面、纯 JS 和后续 React / Svelte standard component package
 * 都应围绕这组能力保持同名同语义，避免不同生态出现 API 漂移。
 */
export type FileViewerExpose = CoreFileViewerPublicApi;

/**
 * Vue 3 原生工具栏扩展插槽的响应式属性。
 *
 * `api` 是组件实例方法门面；其余状态会随当前文件、缩放和搜索结果更新。
 */
export interface FileViewerToolbarSlotProps {
  readonly api: CoreFileViewerPublicApi;
  readonly availability: CoreFileViewerOperationAvailability;
  readonly zoomState: CoreFileViewerZoomState;
  readonly searchState: CoreFileViewerSearchState;
}

/**
 * 预览器通用配置。
 */
export type FileViewerOptions = CoreFileViewerOptions;

/**
 * DOCX 渲染配置。
 *
 * 继承共享 DOCX 配置；完整 Word 预览由 `@file-viewer/renderer-word`
 * 使用 `@file-viewer/docx` Worker 完成 ZIP/XML 解析，并在主线程按连续流式阅读渲染真实页面 DOM。
 * 如业务确实需要页式预览，可显式开启 `visualPagination`。
 * 组件层继续负责挂载、缩放、打印和导出适配，保证生态体验一致。
 */
export type FileViewerDocxOptions = CoreFileViewerDocxOptions;

/**
 * 导出/打印模式。
 */
export type FileRenderExportMode = CoreFileRenderExportMode;

/**
 * 渲染器自定义导出上下文。
 *
 * 大多数格式可以直接克隆当前 DOM；PDF 这类虚拟滚动或按需渲染格式
 * 需要在打印前重新生成完整页面，因此允许渲染器注册专属适配器。
 */
export type FileRenderExportOptions = CoreFileRenderExportOptions;

/**
 * 渲染器专属导出适配器。
 */
export type FileRenderExportAdapter = CoreFileRenderExportAdapter;

/**
 * 渲染器可选上下文。
 *
 * 部分格式需要知道原始 URL 的目录，例如 glTF / DAE / FBX 会继续加载
 * 同目录的贴图、bin 或材质文件。没有这些上下文时，渲染器仍应尽力预览
 * 单文件内容，并在资源缺失时给出明确错误。
 */
export type FileRenderContext = CoreFileRenderContext;

/**
 * 文件处理逻辑，用于声明具体格式的异步渲染器。
 *
 * 渲染器只在命中文件扩展名时被按需加载，避免 PDF、OFD、Typst、压缩包、
 * 邮件、CAD、3D、Office 等重型依赖进入无关格式的首屏路径。
 *
 * @param buffer 二进制缓存
 * @param target 目标dom
 * @param type 目标扩展名。部分渲染器会用它选择语言、容错策略或格式提示。
 * @param context 原始文件名、远端 URL 等补充上下文。
 */
export type FileHandler = FileRenderHandler<Rendered, HTMLDivElement>;

/**
 * 文件处理器组合。
 */
export type FileHandlerComposite = FileRenderHandlerComposite<Rendered, HTMLDivElement>;
