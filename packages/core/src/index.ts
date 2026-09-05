// Public browser-facing entrypoint.
//
// Keep this file as a compatibility barrel only: framework packages import from
// here, while implementation details live in the domain folders below
// (`source`, `rendering`, `viewer`, `features`, `lifecycle`, `platform`).
import type {
  FileRenderContext,
  FileViewerRenderedInstance,
} from './contracts/types';

export {
  DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH,
  DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH,
  DEFAULT_FILE_VIEWER_CHM_WORKER_PATH,
  DEFAULT_FILE_VIEWER_CHM_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_CHM_WASM_MODULE_PATH,
  DEFAULT_FILE_VIEWER_CHM_WASM_MODULE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_CHM_WASM_PATH,
  DEFAULT_FILE_VIEWER_CHM_WASM_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_LIBREDWG_SCRIPT_PATH,
  DEFAULT_FILE_VIEWER_CAD_LIBREDWG_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION,
  DEFAULT_FILE_VIEWER_CAD_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PATH,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_ZSTD_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_ZSTD_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_DESIGN_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DESIGN_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PATH,
  DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_APACHE_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_APACHE_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_MIT_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_MIT_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_CARLITO_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_CARLITO_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_TINOS_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_TINOS_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_COUSINE_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_COUSINE_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_NOTO_SYMBOLS_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_NOTO_SYMBOLS_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_IDML_WORKER_PATH,
  DEFAULT_FILE_VIEWER_IDML_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_IDML_WASM_PATH,
  DEFAULT_FILE_VIEWER_IDML_WASM_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_IDML_LICENSE_PATH,
  DEFAULT_FILE_VIEWER_IDML_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_MODEL_RUNTIME_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_MODEL_RUNTIME_URL,
  DEFAULT_FILE_VIEWER_MODEL_IMPORT_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_MODEL_IMPORT_LICENSE_URL,
  DEFAULT_FILE_VIEWER_MODEL_OCCT_LICENSE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_MODEL_OCCT_LICENSE_URL,
  DEFAULT_FILE_VIEWER_MODEL_WASM_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_MODEL_WASM_URL,
  DEFAULT_FILE_VIEWER_MODEL_WORKER_URL,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION,
  DEFAULT_FILE_VIEWER_PDF_CMAP_PATH,
  DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH,
  DEFAULT_FILE_VIEWER_PDF_WASM_PATH,
  DEFAULT_FILE_VIEWER_PDF_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PPT_FONT_PATH,
  DEFAULT_FILE_VIEWER_PPT_FRAME_CACHE_PATH,
  DEFAULT_FILE_VIEWER_PPT_MODULE_PATH,
  DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH,
  DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION,
  DEFAULT_FILE_VIEWER_PPT_WASM_PATH,
  DEFAULT_FILE_VIEWER_PPT_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH,
  DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS,
  DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH,
  DEFAULT_FILE_VIEWER_IWORK_WORKER_PATH,
  DEFAULT_FILE_VIEWER_IWORK_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_HANGUL_WORKER_PATH,
  DEFAULT_FILE_VIEWER_HANGUL_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PATH,
  DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PATH,
  DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_WORDPERFECT_MODULE_PATH,
  DEFAULT_FILE_VIEWER_WORDPERFECT_MODULE_PACKAGE_PATH,
  DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL,
  DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL,
  DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_PACKAGE_PATH,
  getDefaultFileViewerAssetBaseUrl,
  getFileViewerRendererAssetManifest,
  listFileViewerRendererAssetManifests,
  normalizeFileViewerAssetBaseUrl,
  resetDefaultFileViewerAssetBaseUrl,
  resolveFileViewerArchiveWasmUrl,
  resolveFileViewerArchiveWorkerUrl,
  resolveFileViewerChmWorkerUrl,
  resolveFileViewerChmWasmModuleUrl,
  resolveFileViewerChmWasmUrl,
  resolveFileViewerAssetUrl,
  resolveFileViewerCadAssetUrls,
  resolveFileViewerDataSqlWasmUrl,
  resolveFileViewerIllustratorWorkerUrl,
  resolveFileViewerDesignWorkerUrl,
  resolveFileViewerDesignContainerWorkerUrl,
  resolveFileViewerAdobeResourceWorkerUrl,
  resolveFileViewerPostscriptWorkerUrl,
  resolveFileViewerPostscriptWasmUrl,
  resolveFileViewerIdmlWorkerUrl,
  resolveFileViewerIdmlWasmUrl,
  resolveFileViewerDocxWorkerJsZipUrl,
  resolveFileViewerDocxWorkerUrl,
  resolveFileViewerDrawioViewerScriptUrl,
  resolveFileViewerModelAssetUrls,
  resolveFileViewerPdfAssetUrls,
  resolveFileViewerPresentationWorkerUrl,
  resolveFileViewerRendererAssets,
  resolveFileViewerRuntimeAssetBaseUrl,
  resolveFileViewerSpreadsheetWorkerUrl,
  resolveFileViewerIworkWorkerUrl,
  resolveFileViewerHangulWorkerUrl,
  resolveFileViewerWordPerfectWorkerUrl,
  resolveFileViewerWordPerfectWasmUrl,
  resolveFileViewerTypstCompilerWasmUrl,
  resolveFileViewerTypstRendererWasmUrl,
  setDefaultFileViewerAssetBaseUrl,
} from './assets';
export {
  ARCHIVE_EXTENSIONS,
  DEFAULT_REGISTERED_EXTENSIONS,
  DEFAULT_RENDERER_DEFINITIONS,
  DEFAULT_STABLE_SUPPORTED_EXTENSIONS,
  DEFAULT_SUPPORTED_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MODEL_EXTENSIONS,
  TEXT_EXTENSIONS,
} from './registry/formats';
export { precheckFileViewerSource } from './source/precheck';
export type {
  FileViewerPrecheckOptions,
  FileViewerPrecheckReason,
  FileViewerPrecheckResult,
  FileViewerPrecheckStatus,
} from './source/precheck';
export {
  DEFAULT_FILE_VIEWER_TEXT_CHUNK_OVERLAP,
  DEFAULT_FILE_VIEWER_TEXT_CHUNK_SIZE,
  DEFAULT_FILE_VIEWER_ZOOM_SCALE,
  buildFileViewerDocumentTextChunks,
  createEmptyFileViewerSearchState,
  createFileViewerZoomState,
  normalizeFileViewerAiOptions,
  normalizeFileViewerSearchOptions,
} from './features/document/model';
export {
  DEFAULT_FILE_VIEWER_SEARCH_ACTIVE_CLASS,
  DEFAULT_FILE_VIEWER_SEARCH_MATCH_CLASS,
  DEFAULT_FILE_VIEWER_SEARCH_MAX_MATCHES,
  applyFileViewerSearchState,
  cloneFileViewerSearchState,
  createFileViewerDomSearchController,
  createFileViewerDomSearchControllerActionHandlers,
  destroyFileViewerDomSearchController,
  observeFileViewerDomSearchController,
  runFileViewerDomSearchControllerAction,
  syncFileViewerDomSearchControllerState,
} from './features/document/search';
export type {
  FileViewerDocumentAnchorsTarget,
  FileViewerDomSearchController,
  FileViewerDomSearchControllerActionHandlers,
  FileViewerDomSearchControllerStateTarget,
  MutableFileViewerSearchState,
} from './features/document/search';
export {
  createFileViewerDocumentFeatureActions,
  createFileViewerDocumentFeatureControllerActionHandlers,
  createFileViewerDocumentChangeSnapshot,
  createFileViewerSearchChangeState,
  dispatchFileViewerLocationChange,
  dispatchFileViewerSearchChange,
  resolveFileViewerLocationChangeAnchor,
} from './features/document/events';
export type {
  CreateFileViewerDocumentChangeSnapshotInput,
  FileViewerDocumentFeatureActionOptions,
  DispatchFileViewerLocationChangeInput,
  DispatchFileViewerSearchChangeInput,
  FileViewerDocumentChangeSnapshot,
  FileViewerDocumentFeatureActions,
  FileViewerDocumentFeatureControllerActionHandlers,
  FileViewerDocumentFeatureSearchController,
  CreateFileViewerDocumentFeatureActionsInput,
  CreateFileViewerDocumentFeatureControllerActionHandlersInput,
  ResolveFileViewerLocationChangeAnchorInput,
} from './features/document/events';
export {
  applyFileViewerZoomState,
  clearFileViewerZoomControllerProvider,
  createFileViewerZoomChangeEmitter,
  createFileViewerZoomChangeState,
  cloneFileViewerZoomState,
  createFileViewerZoomController,
  createFileViewerZoomControllerActionHandlers,
  destroyFileViewerZoomController,
  observeFileViewerZoomController,
  refreshFileViewerZoomControllerProvider,
  runFileViewerZoomControllerAction,
  syncFileViewerZoomControllerState,
} from './features/document/zoom';
export type {
  FileViewerZoomController,
  FileViewerZoomControllerActionHandlers,
  MutableFileViewerZoomState,
} from './features/document/zoom';
export {
  FILE_VIEWER_FIT_MODES,
  FILE_VIEWER_FIT_RESIZE_MODES,
  createFileViewerFitController,
  hasFileViewerExplicitInitialViewState,
  isFileViewerFitMode,
  isFileViewerFitResize,
  normalizeFileViewerFitOptions,
  resolveFileViewerFitScale,
} from './features/document/fit';
export type {
  ApplyInitialFileViewerFitOptions,
  CreateFileViewerFitControllerOptions,
  FileViewerFitController,
  NormalizedFileViewerFitOptions,
  ResolveFileViewerFitScaleInput,
  RunFileViewerFitOptions,
} from './features/document/fit';
export {
  cloneFileViewerViewState,
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerViewStateController,
  createFileViewerViewStateControllerActionHandlers,
  registerFileViewerGenericViewStateProvider,
} from './features/document/viewState';
export type {
  CreateFileViewerViewStateControllerOptions,
  FileViewerGenericViewStateProviderRegistration,
  FileViewerViewStateController,
  FileViewerViewStateControllerActionHandlers,
  RegisterFileViewerGenericViewStateProviderOptions,
} from './features/document/viewState';
export {
  DEFAULT_FILE_VIEWER_ANCHOR_EXCLUDE_SELECTOR,
  DEFAULT_FILE_VIEWER_ANCHOR_SELECTOR,
  DEFAULT_FILE_VIEWER_SCROLL_CONTAINER_CANDIDATE_SELECTOR,
  DEFAULT_FILE_VIEWER_SCROLL_CONTAINER_SELECTOR,
  DEFAULT_FILE_VIEWER_SCROLLABLE_OVERFLOW_VALUES,
  collectFileViewerDocumentAnchors,
  findFileViewerAnchorForElement,
  findFileViewerSearchProvider,
  findFileViewerViewStateProvider,
  findFileViewerZoomProvider,
  getCurrentFileViewerDocumentAnchor,
  getFileViewerScrollableRange,
  isFileViewerScrollableElement,
  registerFileViewerSearchProvider,
  registerFileViewerViewStateProvider,
  registerFileViewerZoomProvider,
  resolveFileViewerScrollContainer,
  scrollToFileViewerDocumentAnchor,
  unregisterFileViewerSearchProvider,
  unregisterFileViewerViewStateProvider,
  unregisterFileViewerZoomProvider,
} from './features/document/dom';
export {
  prepareFileViewerRenderedContentForSnapshot,
  inlineFileViewerBlobUrlsInHtml,
  replaceFileViewerCanvasWithImages,
  resolveFileViewerPrintStyle,
  triggerFileViewerBlobDownload,
  triggerFileViewerUrlDownload,
  waitForFileViewerImages,
  waitForFileViewerNextPaint,
  waitForFileViewerPrintWindowReady,
} from './output/export';
export {
  applyPrintPageSize,
  buildPrintPageStyle,
  formatCssPixels,
  getElementPrintPageSize,
} from './output/printLayout';
export {
  assertFileViewerMermaidSourceHasNoExternalResources,
  sanitizeFileViewerSvgCss,
  sanitizeFileViewerSvgResources,
} from './security/svgResources';
export type {
  ApplyPrintPageSizeOptions,
  BuildPrintPageStyleOptions,
  PrintPageSize,
} from './output/printLayout';
export {
  DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
  DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
  DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
  FILE_VIEWER_OPERATION_ACTION_ERROR_PREFIXES,
  createFileViewerOperationActionHandlers,
  createFileViewerOriginalSourceState,
  createFileViewerOriginalSourceStateFromNormalizedSource,
  createFileViewerPublicOperationActionHandlers,
  executeFileViewerDownloadOperation,
  executeFileViewerExportHtmlOperation,
  executeFileViewerPrintOperation,
  hasFileViewerOriginalSource,
  resolveFileViewerDisplayFilename,
  resolveFileViewerOperationActionErrorMessage,
  resolveFileViewerOperationFilename,
  resolveFileViewerOriginalFilename,
} from './viewer/operations';
export {
  FILE_VIEWER_BUILTIN_MESSAGES,
  FILE_VIEWER_DEFAULT_LOCALE,
  FILE_VIEWER_FALLBACK_LOCALE,
  FILE_VIEWER_SUPPORTED_LOCALES,
  createFileViewerTranslator,
  formatFileViewerMessage,
  normalizeFileViewerLocale,
  resolveFileViewerLocale,
  translateFileViewerMessage,
} from './i18n/messages';
export type {
  FileViewerI18nInput,
  FileViewerResolvedLocale,
  ResolveFileViewerI18nInput,
} from './i18n/messages';
export type {
  CreateFileViewerOperationActionHandlersInput,
  FileViewerOperationActionErrorFormatter,
  FileViewerFileOperationType,
  FileViewerOperationActionErrorContext,
  FileViewerOperationActionErrorPrefixes,
  FileViewerOperationActionHandlers,
  FileViewerPublicOperationActionHandlers,
  ResolveFileViewerOperationActionErrorMessageInput,
} from './viewer/operations';
export {
  clearFileViewerAutoRendererPresets,
  collectFileViewerRendererPlugins,
  createRendererRegistry,
  findFileViewerAutoRendererPreset,
  getFileViewerAutoRendererPresetVersion,
  hasFileViewerRendererPresetName,
  installFileViewerRendererPlugins,
  listFileViewerAutoRendererPresetEntries,
  listFileViewerAutoRendererPresets,
  registerFileViewerAutoRendererPreset,
  resolveFileViewerRendererPresetInputs,
  unregisterFileViewerAutoRendererPreset,
} from './registry/registry';
export type {
  FileViewerAutoRendererPresetEntry,
  RegisterFileViewerAutoRendererPresetOptions,
} from './registry/registry';
export {
  CORE_LITE_RENDERER_IDS,
  coreBrowserRendererHandlers,
  coreLiteBrowserRendererHandlers,
  coreLiteRendererDefinitions,
  createFileViewerCoreRendererRegistry,
  fileViewerCoreRendererDispatcher,
  fileViewerCoreRendererRegistry,
  fileViewerCoreRendererRegistryBridge,
  missingFileViewerCoreRendererHandlers,
} from './renderers/index';
export type {
  CreateFileViewerCoreRendererRegistryOptions,
} from './renderers/index';
export const renderFileViewerAudio = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  throw new Error(
    'Audio and MIDI rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-media, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerArchive = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Archive rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-archive, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerCad = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'CAD rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-cad, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerCode = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  throw new Error(
    'Code and text rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-text, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerDataAsset = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Data asset rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-data, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerDrawing = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Draw.io and Excalidraw rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-drawing, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerEda = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'EDA rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-eda, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerEmail = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Email rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-email, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerEpub = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  throw new Error(
    'EPUB rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-epub, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerGeo = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  throw new Error(
    'Geospatial rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-geo, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerImage = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string
): Promise<FileViewerRenderedInstance> => {
  const { default: renderImage } = await import('./renderers/image');
  return renderImage(buffer, target, type);
};
export const renderFileViewerMarkdown = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  throw new Error(
    'Markdown rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-text, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerModel = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    '3D model rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-3d, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerOfd = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void context;
  throw new Error(
    'OFD rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-ofd, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerOpenDocument = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  throw new Error(
    'OpenDocument/RTF rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-word, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerPdf = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void context;
  throw new Error(
    'PDF rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-pdf, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerPptx = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'PPTX rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-presentation, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerTypst = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Typst rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-typst, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerUmd = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  throw new Error(
    'UMD ebook rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-epub, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerVideo = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Video and HLS rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-media, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerWordDoc = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void context;
  throw new Error(
    'DOC rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-word, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerWordDocx = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void context;
  throw new Error(
    'DOCX rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-word, or use @file-viewer/preset-all.'
  );
};
export const renderFileViewerSpreadsheet = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  void buffer;
  void target;
  void type;
  void context;
  throw new Error(
    'Spreadsheet rendering has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-spreadsheet, or use @file-viewer/preset-all.'
  );
};
export const parseEdaFile = async (
  buffer: ArrayBuffer,
  type?: string
): Promise<never> => {
  void buffer;
  void type;
  throw new Error(
    'EDA parsing has moved out of @file-viewer/core. Import parseEdaFile from @file-viewer/renderer-eda instead.'
  );
};
export {
  ADAPTER_PRINT_REQUIRED_EXTENSIONS,
  applyFileViewerZoomAvailability,
  createUnsupportedAvailability,
  DEFAULT_OPERATION_AVAILABILITY,
  DOM_PRINTABLE_EXTENSIONS,
  getRendererAvailability,
  isDomPrintableExtension,
  isKnownNonPrintableExtension,
  needsDedicatedPrintAdapter,
  NON_PRINTABLE_EXTENSIONS,
  resolvePrintAvailability,
} from './registry/capabilities';
export {
  FILE_VIEWER_LIFECYCLE_HOOKS,
  FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX,
  DEFAULT_FILE_VIEWER_TOOLBAR_ORDER,
  FILE_VIEWER_LIFECYCLE_HOOK_ERROR_MESSAGE_PREFIX,
  FILE_VIEWER_OPERATION_LABELS,
  buildFileViewerLifecycleContext,
  buildFileViewerLifecycleContextFromNormalizedSource,
  buildFileViewerOperationContext,
  buildFileViewerOperationContextFromLifecycleState,
  cloneFileViewerOperationAvailability,
  createFileViewerLifecycleActions,
  createFileViewerLifecycleStateController,
  createFileViewerPublicApi,
  createFileViewerToolbarActions,
  createFileViewerToolbarControllerActionHandlers,
  createFileViewerToolbarZoomSyncSnapshot,
  DEFAULT_FILE_VIEWER_LIFECYCLE_HOOK_ERROR_LOGGER,
  DEFAULT_FILE_VIEWER_OPERATION_ERROR_LOGGER,
  dispatchFileViewerLifecycleEvent,
  dispatchFileViewerOperationContextEvent,
  dispatchFileViewerOperationAvailabilityChange,
  dispatchFileViewerZoomChange,
  emitFileViewerComponentLifecycleEvent,
  getFileViewerBeforeOperationHooks,
  getFileViewerLifecycleHookName,
  hasVisibleFileViewerToolbarActions,
  isFileViewerToolbarOperationPermitted,
  isFileViewerZoomButtonDisabled,
  normalizeFileViewerToolbar,
  reportFileViewerLifecycleHookError,
  reportFileViewerOperationError,
  resolveFileViewerLifecycleFallbackSource,
  resolveFileViewerLifecycleHookErrorMessage,
  resolveFileViewerBeforeOperationErrorMessage,
  resolveFileViewerOperationAvailability,
  resolveFileViewerToolbarOrder,
  resolveFileViewerToolbarState,
  resolveFileViewerToolbarPosition,
  resolveVisibleFileViewerToolbar,
  runFileViewerActiveUnloadComplete,
  runFileViewerActiveUnloadStart,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook,
  runFileViewerToolbarAvailabilitySync,
  runFileViewerToolbarZoomSync,
  serializeFileViewerContext,
} from './lifecycle/operations';
export type {
  BuildFileViewerOperationContextFromLifecycleStateInput,
  CreateFileViewerLifecycleActionsInput,
  DispatchFileViewerLifecycleEventInput,
  DispatchFileViewerOperationContextEventInput,
  DispatchFileViewerOperationAvailabilityChangeInput,
  DispatchFileViewerZoomChangeInput,
  FileViewerActiveUnloadState,
  FileViewerLifecycleActions,
  FileViewerLifecycleComponentEmit,
  FileViewerToolbarActions,
  FileViewerToolbarControllerActionHandlers,
  FileViewerToolbarZoomSyncSnapshot,
  FileViewerZoomButtonAction,
  FileViewerToolbarState,
  CreateFileViewerPublicApiInput,
  CreateFileViewerToolbarActionsInput,
  CreateFileViewerToolbarControllerActionHandlersInput,
  BuildFileViewerLifecycleContextFromNormalizedSourceInput,
  ResolveFileViewerBeforeOperationErrorMessageInput,
  ResolveFileViewerToolbarStateInput,
  RunFileViewerActiveUnloadCompleteInput,
  RunFileViewerActiveUnloadStartInput,
  RunFileViewerToolbarAvailabilitySyncInput,
  RunFileViewerToolbarZoomSyncInput,
} from './lifecycle/operations';
export {
  FALLBACK_FILE_VIEWER_LOADING_THEME,
  FILE_VIEWER_LOADING_THEME_MAP,
  applyFileViewerLoadingState,
  cloneFileViewerLoadingState,
  createFileViewerLoadingController,
  createFileViewerLoadingControllerActionHandlers,
  createFileViewerLoadingState,
  createFileViewerLoadingStyleVars,
  runFileViewerLoadingControllerAction,
  runFileViewerLoadingExtensionSync,
  resolveFileViewerLoadingTheme,
  syncFileViewerLoadingControllerState,
} from './viewer/loading';
export type {
  FileViewerLoadingController,
  FileViewerLoadingControllerActionHandlers,
  RunFileViewerLoadingExtensionSyncInput,
} from './viewer/loading';
export {
  createFileViewerLifecycleFacade,
} from './lifecycle/facade';
export type {
  BuildFileViewerLifecycleFacadeLoadStartStateInput,
  BuildFileViewerLifecycleFacadeRenderCompleteStateInput,
  CreateFileViewerLifecycleFacadeInput,
  FileViewerLifecycleFacade,
} from './lifecycle/facade';
export {
  getFileViewerOptionsSearchParam,
  normalizeFileViewerUiDensity,
  normalizeFileViewerTheme,
  parseFileViewerOptions,
  resolveFileViewerColorScheme,
  resolveFileViewerUiDensity,
  sanitizeFileViewerOptions,
  serializeFileViewerOptions,
  setFileViewerOptionsSearchParam,
  toggleFileViewerColorScheme,
} from './config/options';
export {
  resolveFileViewerPresentationState,
} from './presentation/state';
export type {
  FileViewerPresentationState,
  ResolveFileViewerPresentationStateInput,
} from './presentation/state';
export {
  createFileViewerRendererDispatcher,
} from './rendering/dispatcher';
export {
  appendFileViewerStyle,
  buildFileRenderContextFromLoadContext,
  applyFileViewerRenderSurfaceState,
  clearFileViewerRenderSurface,
  createFileRenderHandlerRendererSession,
  createFileRenderHandlerRegistry,
  createFileRenderHandlerLoader,
  createFileViewerRenderSurfaceActionHandlers,
  createFileViewerRenderReadinessTarget,
  createFileViewerRenderSurface,
  createFileViewerRenderSurfaceState,
  createFileViewerRenderSurfaceStateTarget,
  createFileViewerRenderTarget,
  DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS,
  FILE_VIEWER_RENDER_SURFACE_BACKGROUND_PROPERTY,
  DEFAULT_FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_LOGGER,
  FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_MESSAGE,
  disposeActiveFileViewerRendererSession,
  disposeFileViewerRendered,
  disposeFileViewerRendererSession,
  getFileViewerShadowRootForNode,
  isFileViewerShadowRoot,
  normalizeFileViewerStyleIsolation,
  normalizeFileViewerRenderSurfaceBackground,
  removeFileViewerRenderTarget,
  reportFileViewerRenderSessionDisposeError,
  resetFileViewerRenderSurface,
  resolveFileViewerStyleIsolation,
  resolveFileViewerRenderSessionDisposeErrorMessage,
  runFileViewerRenderSurfaceClear,
  runFileViewerRenderSurfaceMount,
  syncFileViewerRenderSurfaceBackground,
  renderFileViewerHandler,
} from './rendering/handler';
export type {
  AppendFileViewerStyleOptions,
  CreateFileViewerRenderSurfaceOptions,
  CreateFileViewerRenderSurfaceActionHandlersInput,
  CreateFileViewerRenderReadinessTargetInput,
  CreateFileViewerRenderSurfaceStateTargetInput,
  FileViewerStyleHandle,
  FileViewerRenderSurfaceActionHandlers,
  FileViewerRenderSurfaceClearState,
  FileViewerRenderSurfaceState,
  FileViewerRenderSurfaceMountContext,
  FileViewerRenderSessionDisposeErrorLogger,
  MutableFileViewerRenderSurfaceState,
  ReportFileViewerRenderSessionDisposeErrorInput,
  ResolvedFileViewerStyleIsolation,
  ResetFileViewerRenderSurfaceInput,
  ResolveFileViewerRenderSessionDisposeErrorMessageInput,
  RunFileViewerRenderSurfaceClearInput,
  RunFileViewerRenderSurfaceMountInput,
} from './rendering/handler';
export {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  createFileViewerTextDecoder,
  decodeFileViewerTextBuffer,
  decodeFilename,
  getExtension,
  normalizeFileExtension,
  normalizeFilename,
  isValidFileViewerUtf8,
  resolveFileViewerTextEncoding,
  resolveFileViewerSourceFilename,
  normalizeSource,
  readFileViewerBuffer,
  readFileViewerDataUrl,
  readFileViewerText,
  wrapFileViewerFileRef,
} from './source';
export type {
  DecodedFileViewerText,
  FileViewerReadResult,
  FileViewerTextEncoding,
  ResolvedFileViewerTextEncoding,
  ResolvedFileViewerTextSource,
} from './source';
export {
  DEFAULT_FILE_VIEWER_STATE_THEME,
  DEFAULT_FILE_VIEWER_UNSUPPORTED_DESCRIPTION,
  FILE_VIEWER_PREVIEW_MESSAGES,
  createFileViewerEmptyState,
  createFileViewerErrorState,
  createFileViewerPreviewLoadingState,
  createFileViewerReadyState,
  createFileViewerUnsupportedState,
  formatFileViewerErrorMessage,
  normalizeFileViewerErrorMessage,
  resolveFileViewerRendererInstallHint,
} from './viewer/state';
export type {
  FileViewerErrorMessageFormatter,
  FileViewerRendererInstallHint,
} from './viewer/state';
export {
  buildFileViewerWatermarkBackgroundImage,
  buildFileViewerWatermarkInlineStyle,
  buildFileViewerWatermarkStyle,
  buildFileViewerWatermarkSvg,
  normalizeFileViewerWatermark,
  resolveFileViewerWatermarkPresentationState,
} from './features/watermark';
export type {
  FileViewerWatermarkPresentationState,
  FileViewerWatermarkStyle,
} from './features/watermark';
export {
  buildFileViewerPrintMaskOverlayHtml,
  applyFileViewerPagePrintMasksToHtml,
  normalizeFileViewerPrintMaskOptions,
  normalizeFileViewerPrintMaskRegion,
  normalizeFileViewerPrintStamp,
  FILE_VIEWER_PRINT_MASK_STYLE,
} from './features/printMask';
export {
  openFileViewerPrintMaskDesignerAsync,
} from './features/printMaskLoader';
export type {
  FileViewerPrintMaskDesignerResult,
  OpenFileViewerPrintMaskDesignerOptions,
} from './features/printMaskDesigner';
export {
  cancelFileViewerPreviewRequest,
  DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME,
  DEFAULT_FILE_VIEWER_PREVIEW_LOAD_ERROR_LOGGER,
  DEFAULT_PDF_RANGE_CHUNK_SIZE,
  FILE_VIEWER_PREVIEW_LOAD_ERROR_PREFIXES,
  FILE_VIEWER_REMOTE_MISSING_DATA_ERROR_MESSAGE,
  applyFileViewerEmptyPreviewState,
  applyFileViewerPreviewFilenameState,
  applyFileViewerPreviewSourceUrlState,
  applyFileViewerReadPreviewState,
  applyFileViewerRenderReadinessState,
  applyFileViewerPreviewRequestResetState,
  commitFileViewerEmptyPreviewResetState,
  commitFileViewerLoadStartState,
  commitFileViewerPreviewRequestStartState,
  commitFileViewerRenderCompleteState,
  commitFileViewerRemoteDownloadState,
  createFileViewerEmptyPreviewState,
  createFileViewerLoadStartState,
  createFileViewerPreviewStateTarget,
  createFileViewerSourceLoadingActionHandlers,
  createFileViewerReadPreviewState,
  createFileViewerPreviewRequestResetState,
  createFileViewerRenderCompleteState,
  createFileViewerRequestController,
  createFileViewerRequestScope,
  createFileViewerStreamingPdfPlaceholderFile,
  finalizeFileViewerPreviewLoadState,
  hasFileViewerPreviewSource,
  isFileViewerAbortError,
  isSameOriginUrl,
  normalizeFileViewerSourceUrl,
  normalizePdfStreamingMode,
  resolveFileViewerFileRefSourcePlan,
  resolveFileViewerLoadStartMessage,
  resolveFileViewerMissingRemoteDataErrorMessage,
  resolveFileViewerPreviewLoadErrorMessage,
  resolveFileViewerPreviewRequestReason,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerPageHref,
  reportFileViewerMissingRemoteData,
  reportFileViewerPreviewLoadError,
  runFileViewerLocalFilePreview,
  runFileViewerPreviewComponentUnmount,
  runFileViewerPreviewRequest,
  runFileViewerPreviewSourceChange,
  runFileViewerRemoteFilePreview,
  runFileViewerReadAndRenderFile,
  runFileViewerStreamingPdfPreview,
  shouldStreamPdfUrl,
} from './source/loading';
export type {
  CreateFileViewerPreviewStateTargetInput,
  CreateFileViewerSourceLoadingActionHandlersInput,
  CreateFileViewerLoadStartStateInput,
  CreateFileViewerReadPreviewStateInput,
  CreateFileViewerRenderCompleteStateInput,
  CommitFileViewerEmptyPreviewResetStateInput,
  CancelFileViewerPreviewRequestInput,
  CommitFileViewerLoadStartStateInput,
  CommitFileViewerPreviewRequestStartStateInput,
  CommitFileViewerRenderCompleteStateInput,
  CommitFileViewerRemoteDownloadStateInput,
  FileViewerEmptyPreviewState,
  FileViewerMutableAccessor,
  FileViewerLocationLike,
  FileViewerFileRefSourcePlan,
  FileViewerLocalFilePreviewState,
  FileViewerLoadStartState,
  FileViewerPreviewLoadErrorKind,
  FileViewerPreviewLoadErrorPrefixes,
  FileViewerPreviewLoadErrorLogger,
  FileViewerPreviewComponentUnmountState,
  FileViewerPreviewRequestResetState,
  FileViewerSourceLoadingActionHandlers,
  FileViewerReadAndRenderFileState,
  FileViewerRenderCompleteState,
  FileViewerRenderReadinessState,
  FileViewerRemoteDownloadState,
  FileViewerRemoteFilePreviewErrorKind,
  FileViewerRemoteFilePreviewState,
  FileViewerRemoteFileDownloadInput,
  FileViewerReadPreviewState,
  FileViewerPreviewRequestRunState,
  FileViewerRemoteSourcePlan,
  FileViewerRequestController,
  FileViewerRequestScope,
  FileViewerStreamingPdfPreviewState,
  FinalizeFileViewerPreviewLoadStateInput,
  MutableFileViewerPreviewFilenameState,
  MutableFileViewerPreviewSourceUrlState,
  MutableFileViewerPreviewRequestState,
  MutableFileViewerPreviewState,
  MutableFileViewerRenderReadinessState,
  MutableFileViewerReadPreviewState,
  RunFileViewerLocalFilePreviewInput,
  RunFileViewerPreviewComponentUnmountInput,
  RunFileViewerPreviewRequestInput,
  RunFileViewerPreviewSourceChangeInput,
  RunFileViewerRemoteFilePreviewInput,
  RunFileViewerReadAndRenderFileInput,
  RunFileViewerStreamingPdfPreviewInput,
  ResolveFileViewerFileRefSourcePlanInput,
  ResolveFileViewerMissingRemoteDataErrorMessageInput,
  ResolveFileViewerPreviewLoadErrorMessageInput,
  ResolveFileViewerPreviewRequestReasonInput,
  ReportFileViewerMissingRemoteDataInput,
  ReportFileViewerPreviewLoadErrorInput,
} from './source/loading';
export { createViewer } from './viewer/createViewer';
export {
  WorkerRefImpl,
  createFileViewerWorkerController,
  refWorker,
} from './platform/worker';
export type {
  FileViewerRendererAssetDefinition,
  FileViewerRendererAssetKind,
  FileViewerRendererAssetManifest,
  FileViewerRendererAssetOptionPath,
  FileViewerRendererAssetTarget,
  ResolveFileViewerAssetUrlOptions,
  ResolveFileViewerRendererAssetsOptions,
  ResolvedFileViewerRendererAsset,
  ResolvedFileViewerCadAssetUrls,
} from './assets';
export type {
  BuildFileViewerLifecycleContextInput,
  BuiltFileViewerLifecycleContext,
  BuiltFileViewerOperationContext,
  FileViewerLifecycleStateController,
  FileViewerLifecycleHookErrorLogger,
  FileViewerOperationErrorLogger,
  ResolveFileViewerOperationAvailabilityInput,
  ReportFileViewerLifecycleHookErrorInput,
  ReportFileViewerOperationErrorInput,
  RunFileViewerBeforeOperationInput,
  SerializedFileViewerContext,
  ResolveFileViewerLifecycleHookErrorMessageInput,
} from './lifecycle/operations';
export type {
  FileViewerLoadingState,
  FileViewerLoadingTheme,
  MutableFileViewerLoadingState,
} from './viewer/loading';
export type {
  ExecuteFileViewerDownloadOperationInput,
  ExecuteFileViewerExportHtmlOperationInput,
  ExecuteFileViewerPrintOperationInput,
  FileViewerOperationExecutorBase,
  FileViewerOriginalSourceState,
  ResolveFileViewerOperationFilenameInput,
} from './viewer/operations';
export type {
  FileViewerSerializableCadOptions,
  FileViewerSerializableOptions,
  FileViewerSerializableToolbarOptions,
} from './config/options';
export type {
  InstallFileViewerRendererPluginsOptions,
} from './registry/registry';
export type {
  CreateFileViewerRendererDispatcherOptions,
  FileViewerRendererDispatcher,
  FileViewerRendererHandlerEntry,
} from './rendering/dispatcher';
export type {
  CreateFileViewerRenderTargetOptions,
  CreateFileRenderHandlerRegistryOptions,
  CreateFileRenderHandlerLoaderOptions,
  DisposeFileViewerRendererSessionOptions,
  FileRenderHandlerRegistryResult,
  FileRenderHandlerRendererSession,
  RenderFileViewerHandlerInput,
} from './rendering/handler';
export type {
  FileViewerSearchProviderHost,
  ResolveFileViewerScrollContainerOptions,
  FileViewerViewStateProviderHost,
  FileViewerZoomProviderHost,
} from './features/document/dom';
export type {
  CreateFileViewerDomSearchControllerOptions,
  FileViewerInternalSearchMatch,
} from './features/document/search';
export type {
  CreateFileViewerZoomControllerOptions,
  FileViewerZoomOperation,
} from './features/document/zoom';
export type { CreateViewerOptions } from './viewer/createViewer';
export type {
  BuildExportHtmlDocumentOptions,
  BuildFileViewerRenderedHtmlDocumentOptions,
} from './exportDocument';
export type {
  CreateFileViewerWorkerControllerOptions,
  FileViewerWorkerContext,
  FileViewerWorkerController,
  FileViewerWorkerErrorHook,
  FileViewerWorkerEventHandler,
  FileViewerWorkerFactory,
  FileViewerWorkerMessageHook,
  WorkerProvider,
  WorkerRef,
} from './platform/worker';
export type {
  FileViewerAiOptions,
  FileViewerArchiveEntryActionContext,
  FileViewerArchiveEntryActionPolicy,
  FileViewerArchiveEntryActionsOptions,
  FileViewerArchivePasswordRequestContext,
  FileViewerArchivePasswordRequestReason,
  FileViewerArchiveOptions,
  FileViewerChmOptions,
  FileViewerApplyViewStateOptions,
  FileViewerBeforeOperation,
  FileViewerCadColorMode,
  FileViewerCadDwfLineWeightMode,
  FileViewerCadOptions,
  FileViewerCadRenderer,
  FileViewerModelLinearUnit,
  FileViewerModelOptions,
  FileViewerComponentEmits,
  FileViewerComponentEventMap,
  FileViewerComponentProps,
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerDownloadOptions,
  FileViewerDocxOptions,
  FileViewerDrawingOptions,
  FileViewerEvent,
  FileViewerEventHandler,
  FileViewerEventType,
  FileViewerExportHtmlOptions,
  FileViewerFileRef,
  FileViewerFitMode,
  FileViewerFitOptions,
  FileViewerFitRequest,
  FileViewerFitResize,
  FileViewerFitResult,
  FileViewerFormatStatus,
  FileViewerFormatSupportLevel,
  FileViewerGeoBasemapOptions,
  FileViewerGeoBasemapPreset,
  FileViewerGeoOptions,
  FileViewerTiandituMapStyle,
  FileRenderContext,
  FileRenderExportAdapter,
  FileRenderThumbnailAdapter,
  FileRenderExportMode,
  FileRenderExportOptions,
  FileRenderHandler,
  FileRenderHandlerComposite,
  FileViewerBuiltinRendererPreset,
  FileViewerInstance,
  FileViewerLoadOptions,
  FileViewerLifecycleContext,
  FileViewerLifecycleHooks,
  FileViewerLifecyclePhase,
  FileViewerI18nOptions,
  FileViewerIworkEmbeddedPreviewMode,
  FileViewerIworkOptions,
  FileViewerHangulOptions,
  FileViewerDiagnostic,
  FileViewerDesignOptions,
  FileViewerLocale,
  FileViewerMessageKey,
  FileViewerMessageParams,
  FileViewerMessageResolver,
  FileViewerMessages,
  FileViewerNavigationState,
  FileViewerOperationAvailability,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerPdfBoundingBox,
  FileViewerPdfBoundingBoxOrigin,
  FileViewerPdfBoundingBoxUnit,
  FileViewerPdfOptions,
  FileViewerPresentationOptions,
  FileViewerPrintOptions,
  FileViewerPrintMaskOptions,
  FileViewerPrintMaskRegion,
  FileViewerPrintStamp,
  FileViewerPublicApi,
  FileViewerRenderedInstance,
  FileViewerRendererMode,
  FileViewerRendererPluginAssetKind,
  FileViewerRendererPluginAssetManifest,
  FileViewerRendererPluginAssetEntry,
  FileViewerRenderStateKind,
  FileViewerRenderPurpose,
  FileViewerRendererCategory,
  FileViewerRendererHandlerRegistration,
  FileViewerRendererInstallContext,
  FileViewerRendererPlugin,
  FileViewerRendererPluginInput,
  FileViewerRendererPresetInput,
  FileViewerRendererPresetName,
  FileViewerRendererPreset,
  FileViewerSearchMatch,
  FileViewerSearchOptions,
  FileViewerSearchProvider,
  FileViewerSearchState,
  FileViewerSource,
  FileViewerSourceKind,
  FileViewerThumbnailCaptureOptions,
  FileViewerThumbnailFit,
  FileViewerThumbnailFormat,
  FileViewerSpreadsheetOptions,
  FileViewerStateDescriptor,
  FileViewerStateTheme,
  FileViewerStyleIsolation,
  FileViewerTextOptions,
  FileViewerResolvedThemeMode,
  FileViewerThemeMode,
  FileViewerToolbarActionMap,
  FileViewerToolbarItem,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  FileViewerResolvedToolbarItem,
  FileViewerUiDensity,
  FileViewerUiOptions,
  FileViewerTypstOptions,
  FileViewerViewScrollState,
  FileViewerViewState,
  FileViewerViewStateChange,
  FileViewerViewStateChangeAction,
  FileViewerViewStateChangeSource,
  FileViewerViewStateProvider,
  FileViewerWatermarkOptions,
  FileViewerWordPerfectOptions,
  FileViewerZoomProvider,
  FileViewerZoomState,
  NormalizedFileViewerSource,
  RendererCapability,
  RendererDefinition,
  RendererPlugin,
  RendererLoadContext,
  RendererLoader,
  RendererRegistry,
  RendererSession,
  RenderSurface,
  ViewerCapabilityState,
  ViewerLifecycleContext,
  ViewerOperationContext,
} from './contracts/types';
