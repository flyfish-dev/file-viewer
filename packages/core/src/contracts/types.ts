// Shared contracts for the whole core package.
//
// Keep this layer declarative: no DOM reads, renderer imports, or async loading
// should be introduced here. Higher layers depend on these contracts, never the
// other way around.
export type FileViewerSourceKind = 'file' | 'url' | 'buffer' | 'empty';

export type FileViewerThemeMode = 'light' | 'dark' | 'system';

export type FileViewerResolvedThemeMode = Exclude<FileViewerThemeMode, 'system'>;

export type FileViewerLocale = 'auto' | 'zh-CN' | 'en-US' | 'ja-JP' | (string & {});

export type FileViewerStyleIsolation = 'auto' | 'shadow' | 'scoped' | 'none';

export type FileViewerMessageKey =
  | 'toolbar.zoomGroup'
  | 'toolbar.zoomOut'
  | 'toolbar.zoomIn'
  | 'toolbar.zoomReset'
  | 'toolbar.download'
  | 'toolbar.downloadTitle'
  | 'toolbar.print'
  | 'toolbar.printTitle'
  | 'toolbar.printDirect'
  | 'toolbar.printMask'
  | 'toolbar.printMaskTitle'
  | 'toolbar.printMaskAdd'
  | 'toolbar.printMaskClear'
  | 'toolbar.printMaskCancel'
  | 'toolbar.printMaskConfirm'
  | 'toolbar.printMaskHint'
  | 'toolbar.printStampUpload'
  | 'toolbar.printStampRemove'
  | 'toolbar.printStampResize'
  | 'toolbar.exportHtml'
  | 'toolbar.exportHtmlTitle'
  | 'toolbar.search'
  | 'toolbar.searchPlaceholder'
  | 'toolbar.searchPrevious'
  | 'toolbar.searchNext'
  | 'toolbar.searchClear'
  | 'toolbar.theme'
  | 'toolbar.themeToLight'
  | 'toolbar.themeToDark'
  | 'state.ready.title'
  | 'state.ready.message'
  | 'state.empty.title'
  | 'state.empty.message'
  | 'state.unsupported.install.title'
  | 'state.unsupported.install.message'
  | 'state.unsupported.install.description'
  | 'state.unsupported.title'
  | 'state.unsupported.message'
  | 'state.unsupported.description'
  | 'state.error.title'
  | 'preview.downloading'
  | 'preview.streamingPdf'
  | 'preview.reading'
  | 'error.download'
  | 'error.print'
  | 'error.exportHtml'
  | 'error.noDownloadSource'
  | 'error.noExportContent'
  | 'error.printUnavailable'
  | 'error.printWindowBlocked'
  | 'error.remoteDownload'
  | 'error.localRead'
  | 'error.load'
  | 'error.stream'
  | 'error.beforeOperation'
  | 'error.unknown'
  | 'error.blobUnavailable'
  | 'error.sourceUnsupported'
  | 'error.fileReadArrayBuffer'
  | 'error.fileReadDataUrl'
  | 'error.fileReadText'
  | 'error.imageDataUrlRead'
  | 'operation.download'
  | 'operation.print'
  | 'operation.exportHtml'
  | 'operation.zoomIn'
  | 'operation.zoomOut'
  | 'operation.zoomReset'
  | 'pdf.toolbar.toggleNavigation'
  | 'pdf.toolbar.previousPage'
  | 'pdf.toolbar.nextPage'
  | 'pdf.toolbar.fitWidth'
  | 'pdf.toolbar.zoomOut'
  | 'pdf.toolbar.zoomIn'
  | 'pdf.toolbar.rotateLeft'
  | 'pdf.toolbar.rotateRight'
  | 'pdf.nav.typeLabel'
  | 'pdf.nav.pagesTab'
  | 'pdf.nav.outlineTab'
  | 'pdf.nav.pagesTitle'
  | 'pdf.nav.outlineTitle'
  | 'pdf.nav.pageCount'
  | 'pdf.nav.itemCount'
  | 'pdf.nav.pageLabel'
  | 'pdf.nav.outlineEmpty'
  | 'pdf.nav.outlineFallbackTitle'
  | 'pdf.thumbnail.alt'
  | 'pdf.state.loading'
  | 'pdf.error.browserWindow'
  | 'pdf.error.missingSource'
  | 'pdf.error.loadFailed'
  | 'pdf.error.notLoaded'
  | 'pdf.error.unloaded'
  | 'pdf.error.canvasUnavailable'
  | 'pdf.export.pageTitle'
  | 'spreadsheet.loading.kicker'
  | 'spreadsheet.loading.title'
  | 'spreadsheet.loading.hint'
  | 'spreadsheet.loading.streaming'
  | 'spreadsheet.tabs.ariaLabel'
  | 'spreadsheet.state.parsingWorkbook'
  | 'spreadsheet.state.preparingSheet'
  | 'spreadsheet.state.preparingSheetNamed'
  | 'spreadsheet.state.cachedRows'
  | 'spreadsheet.state.rows'
  | 'spreadsheet.state.rowsAndColumns'
  | 'spreadsheet.error.parseFailed'
  | 'spreadsheet.error.workerFailed'
  | 'word.error.invalidDocx'
  | 'word.error.missingOdfContent'
  | 'word.error.odfXmlParseFailed'
  | 'word.title.rtf'
  | 'word.title.openDocumentPresentation'
  | 'word.title.openDocumentText'
  | 'word.page.fallback'
  | 'word.page.empty'
  | 'word.body'
  | 'word.body.empty'
  | 'ofd.toolbar.pageNavigation'
  | 'ofd.toolbar.documentPages'
  | 'ofd.toolbar.previousPage'
  | 'ofd.toolbar.nextPage'
  | 'ofd.toolbar.pageStatus'
  | 'ofd.toolbar.noPages'
  | 'ofd.state.loading'
  | 'ofd.error.empty'
  | 'ofd.error.parseFailed'
  | 'presentation.state.loading'
  | 'presentation.error.title'
  | 'presentation.error.parseFailed'
  | 'presentation.ppt.state.loading'
  | 'presentation.ppt.error.title'
  | 'presentation.ppt.error.parseFailed'
  | 'presentation.ppt.error.assetHint'
  | 'archive.error.nestedUnsupported'
  | 'archive.loading.readingDirectory'
  | 'archive.loading.readingDirectoryHint'
  | 'archive.search.placeholder'
  | 'archive.sidebar.hide'
  | 'archive.sidebar.show'
  | 'archive.preview.title'
  | 'archive.preview.chooseFile'
  | 'archive.preview.downloadFile'
  | 'archive.error.title'
  | 'archive.stats.summary'
  | 'archive.warning.encrypted'
  | 'archive.password.title'
  | 'archive.password.description'
  | 'archive.password.placeholder'
  | 'archive.password.invalid'
  | 'archive.password.required'
  | 'archive.password.cancel'
  | 'archive.password.confirm'
  | 'archive.error.passwordRequired'
  | 'archive.error.encryptedRequiresWorker'
  | 'archive.empty.title'
  | 'archive.empty.message'
  | 'archive.loading.initializingCandidate'
  | 'archive.loading.initializingCandidateHint'
  | 'archive.error.candidateInitTimeout'
  | 'archive.error.encryptedCheckTimeout'
  | 'archive.loading.directoryReadyHint'
  | 'archive.error.candidateReadTimeout'
  | 'archive.loading.workerFallback'
  | 'archive.loading.workerFallbackHint'
  | 'archive.notice.workerFallback'
  | 'archive.error.tooLarge'
  | 'archive.loading.initializingWorker'
  | 'archive.loading.initializingWorkerHint'
  | 'archive.error.workerInitFailed'
  | 'archive.error.workerUnsupported'
  | 'archive.error.indexedDbUnavailable'
  | 'archive.error.entryTooLarge'
  | 'archive.loading.extracting'
  | 'archive.loading.rendering'
  | 'archive.loading.exporting'
  | 'media.audio.title'
  | 'media.audio.description'
  | 'media.audio.unsupported'
  | 'media.video.title'
  | 'media.video.unsupported'
  | 'media.video.hlsHint'
  | 'media.midi.title'
  | 'media.midi.loading'
  | 'media.midi.trackHeader'
  | 'media.midi.instrumentHeader'
  | 'media.midi.channelHeader'
  | 'media.midi.noteCountHeader'
  | 'media.midi.durationHeader'
  | 'media.midi.durationStat'
  | 'media.midi.trackStat'
  | 'media.midi.noteStat'
  | 'media.midi.parseFailed'
  | 'email.mbox.subject'
  | 'email.mbox.summary'
  | 'email.error.title'
  | 'email.meta.from'
  | 'email.meta.to'
  | 'email.meta.cc'
  | 'email.meta.date'
  | 'email.tabs.text'
  | 'email.tabs.headers'
  | 'email.attachments.title'
  | 'email.attachments.empty'
  | 'email.attachments.download'
  | 'email.attachments.opening'
  | 'email.attachments.nestedUnavailable'
  | 'email.loading.parsing'
  | 'data.font.sample'
  | 'data.error.fontFaceUnsupported'
  | 'data.title.font'
  | 'data.title.sqlite'
  | 'data.title.parquet'
  | 'data.title.avro'
  | 'data.title.wasm'
  | 'data.title.eps'
  | 'data.title.ai'
  | 'data.title.webarchive'
  | 'data.title.summary'
  | 'data.label.format'
  | 'data.label.size'
  | 'data.label.rendering'
  | 'data.label.objects'
  | 'data.label.sampleTable'
  | 'data.label.rows'
  | 'data.label.columns'
  | 'data.label.sampleRows'
  | 'data.label.imports'
  | 'data.label.exports'
  | 'data.label.magic'
  | 'data.label.note'
  | 'data.label.container'
  | 'data.value.schemaRead'
  | 'data.value.schemaUnread'
  | 'data.note.aiSummary'
  | 'data.note.postscriptSummary'
  | 'data.note.webarchive'
  | 'data.image.alt'
  | 'psd.title'
  | 'psd.action.fit'
  | 'psd.action.showAll'
  | 'psd.action.hideAll'
  | 'psd.layers.title'
  | 'psd.layers.redrawable'
  | 'psd.layers.empty'
  | 'psd.layers.hidden'
  | 'drawing.error.viewerLoadFailed'
  | 'drawing.error.excalidrawEmpty'
  | 'drawing.error.excalidrawTimeout'
  | 'drawing.error.drawioParseFailed'
  | 'drawing.error.drawioNoModel'
  | 'drawing.error.drawioNoElements'
  | 'drawing.error.viewerInitFailed'
  | 'drawing.error.drawioTimeout'
  | 'drawing.error.svgParseFailed'
  | 'drawing.error.plantumlRenderFailed'
  | 'drawing.title.excalidraw'
  | 'drawing.title.mermaid'
  | 'drawing.title.plantuml'
  | 'drawing.title.drawio'
  | 'drawing.toolbar.zoomOut'
  | 'drawing.toolbar.zoomIn'
  | 'drawing.toolbar.fit'
  | 'drawing.toolbar.fitWidth'
  | 'drawing.state.loading'
  | 'text.code.loadingHighlight'
  | 'text.code.indexingLargeFile'
  | 'text.code.virtualized'
  | 'text.code.firstSegment'
  | 'text.code.previousSegment'
  | 'text.code.nextSegment'
  | 'text.code.lastSegment'
  | 'ebook.toc'
  | 'ebook.reading'
  | 'ebook.itemCount'
  | 'epub.title'
  | 'epub.previousPage'
  | 'epub.nextPage'
  | 'epub.loading'
  | 'epub.chapterFallback'
  | 'epub.renderIncomplete'
  | 'umd.title'
  | 'umd.previousChapter'
  | 'umd.nextChapter'
  | 'umd.loading'
  | 'umd.emptyContent'
  | 'umd.chapterFallback'
  | 'umd.galleryFallback'
  | 'umd.warningBodyTooShort'
  | 'umd.error.unexpectedEnd'
  | 'umd.error.invalidFile'
  | 'typst.summaryRenderer'
  | 'typst.pageSummary.empty'
  | 'typst.pageSummary.ready'
  | 'typst.status.compiling'
  | 'typst.status.failed'
  | 'typst.status.rendered'
  | 'typst.loading.title'
  | 'typst.loading.hint'
  | 'typst.error.title'
  | 'typst.error.timeout'
  | 'typst.error.timeoutHint'
  | 'typst.error.assetHint'
  | 'typst.error.svgParseFailed'
  | 'typst.error.wasmLoadFailed'
  | 'xmind.toolbar.zoomOut'
  | 'xmind.toolbar.zoomIn'
  | 'xmind.toolbar.fit'
  | 'xmind.toolbar.fitTitle'
  | 'xmind.state.loading'
  | 'xmind.stats.nodes'
  | 'xmind.stats.depth'
  | 'xmind.stats.theme'
  | 'xmind.stats.template'
  | 'xmind.badge.paused'
  | 'xmind.badge.collapsed'
  | 'xmind.badge.floating'
  | 'xmind.badge.summary'
  | 'xmind.badge.callout'
  | 'xmind.imageResource'
  | 'xmind.error.unrecognized'
  | 'xmind.error.noCanvas'
  | 'cad.toolbar.fit'
  | 'cad.toolbar.zoomOut'
  | 'cad.toolbar.zoomIn'
  | 'cad.layers.title'
  | 'cad.layers.count'
  | 'cad.layers.merged'
  | 'cad.inspector.title'
  | 'cad.inspector.entities'
  | 'cad.inspector.blocks'
  | 'cad.inspector.pages'
  | 'cad.inspector.drawn'
  | 'cad.state.loadingViewer'
  | 'cad.state.parsing'
  | 'cad.error.parseFailed'
  | 'image.alt'
  | 'image.toolbar.rotation'
  | 'image.toolbar.rotateLeft'
  | 'image.toolbar.rotateRight'
  | 'image.lightbox.alt'
  | 'image.lightbox.close'
  | 'gitBundle.error.invalid'
  | 'gitBundle.error.missingPack'
  | 'gitBundle.notice.delta'
  | 'gitBundle.title.history'
  | 'gitBundle.title.fileTree'
  | 'gitBundle.file.choose'
  | 'gitBundle.file.noTree'
  | 'gitBundle.file.none'
  | 'gitBundle.history.empty'
  | 'gitBundle.toolbar.summary'
  | 'gitBundle.meta.bundle'
  | 'gitBundle.meta.refs'
  | 'gitBundle.meta.commits'
  | 'gitBundle.meta.objects'
  | 'gitBundle.meta.deltas'
  | 'gitBundle.meta.objectFormat'
  | 'gitBundle.meta.objectTypes'
  | 'geo.error.unrecognized'
  | 'geo.error.xmlParseFailed'
  | 'geo.error.unsupported'
  | 'geo.title'
  | 'geo.featureCount'
  | 'geo.bounds'
  | 'geo.geometryTypes'
  | 'geo.aria'
  | 'geo.loading'
  | 'geo.projection'
  | 'geo.engine'
  | 'geo.basemap'
  | 'geo.basemap.offline'
  | 'geo.basemap.custom'
  | 'geo.engine.maplibre'
  | 'geo.engine.svg'
  | 'geo.error.projection'
  | 'geo.action.fit'
  | 'model.toolbar.fit'
  | 'model.toolbar.rotate'
  | 'model.toolbar.wireframe'
  | 'model.toolbar.grid'
  | 'model.toolbar.axes'
  | 'model.state.loadingSummary'
  | 'model.state.loading'
  | 'model.state.loaded'
  | 'model.state.parseFailed'
  | 'model.summary.meshes'
  | 'model.summary.points'
  | 'model.error.daeEmpty'
  | 'model.error.unsupported'
  | 'model.error.parseFailed'
  | 'model.notice.signature'
  | 'loading.generic.label'
  | 'loading.generic.hint'
  | 'loading.word.label'
  | 'loading.word.hint'
  | 'loading.wordWorker.hint'
  | 'loading.sheet.label'
  | 'loading.sheet.hint'
  | 'loading.csv.label'
  | 'loading.csv.hint'
  | 'loading.presentation.label'
  | 'loading.presentation.hint'
  | 'loading.pdf.label'
  | 'loading.pdf.hint'
  | 'loading.ofd.label'
  | 'loading.ofd.hint'
  | 'loading.archive.label'
  | 'loading.archive.hint'
  | 'loading.email.label'
  | 'loading.email.hint'
  | 'loading.msg.hint'
  | 'loading.eda.label'
  | 'loading.eda.hint'
  | 'loading.cad.label'
  | 'loading.cad.hint'
  | 'loading.dwg.hint'
  | 'loading.dwf.hint'
  | 'loading.dwfx.hint'
  | 'loading.xps.hint'
  | 'loading.drawio.label'
  | 'loading.drawio.hint'
  | 'loading.excalidraw.label'
  | 'loading.excalidraw.hint'
  | 'loading.epub.label'
  | 'loading.epub.hint'
  | 'loading.umd.label'
  | 'loading.umd.hint'
  | 'loading.image.label'
  | 'loading.image.hint'
  | 'loading.video.label'
  | 'loading.video.hint'
  | 'loading.audio.label'
  | 'loading.audio.hint';

export type FileViewerMessageParams = Record<string, string | number | boolean | null | undefined>;

export type FileViewerMessageResolver = (
  key: FileViewerMessageKey,
  params: FileViewerMessageParams,
  locale: FileViewerLocale
) => string | undefined;

export type FileViewerMessages = Partial<Record<FileViewerMessageKey, string>> | FileViewerMessageResolver;

export interface FileViewerI18nOptions {
  locale?: FileViewerLocale;
  messages?: FileViewerMessages;
}

export type FileViewerFileRef = File | Blob | ArrayBuffer;

export type FileViewerToolbarPosition = 'auto' | 'top' | 'top-center' | 'bottom-right';

export type FileViewerFitMode =
  | 'auto'
  | 'contain'
  | 'cover'
  | 'width'
  | 'height'
  | 'actual'
  | 'scale-down';

export type FileViewerFitResize = 'until-interaction' | 'always' | 'initial';

export interface FileViewerFitOptions {
  mode?: FileViewerFitMode;
  resize?: FileViewerFitResize;
  padding?: number;
  minScale?: number;
  maxScale?: number;
}

export type FileViewerLifecyclePhase = 'load-start' | 'load-complete' | 'unload-start' | 'unload-complete';

export type FileViewerOperationType = 'download' | 'print' | 'export-html' | 'zoom-in' | 'zoom-out' | 'zoom-reset';

export type FileViewerToolbarItem = 'search' | 'zoom' | 'download' | 'print' | 'exportHtml' | 'export-html' | 'theme';

export type FileViewerResolvedToolbarItem = 'search' | 'zoom' | 'download' | 'print' | 'exportHtml' | 'theme';

export type FileViewerToolbarActionMap = Partial<Record<FileViewerOperationType, boolean>>;

export type FileViewerRenderStateKind = 'idle' | 'loading' | 'ready' | 'empty' | 'unsupported' | 'error';

export type FileViewerRendererCategory =
  | 'office'
  | 'document'
  | 'archive'
  | 'email'
  | 'eda'
  | 'cad'
  | 'model'
  | 'geo'
  | 'drawing'
  | 'mindmap'
  | 'ebook'
  | 'image'
  | 'markdown'
  | 'code'
  | 'media'
  | 'asset'
  | 'fallback';

export interface FileViewerWatermarkOptions {
  enabled?: boolean;
  text?: string;
  image?: string;
  opacity?: number;
  rotate?: number;
  gapX?: number;
  gapY?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface FileViewerToolbarOptions {
  download?: boolean;
  print?: boolean;
  exportHtml?: boolean;
  zoom?: boolean;
  search?: boolean;
  /** Shows a manual light/dark mode toggle without changing the host page theme. */
  theme?: boolean;
  /** Built-in toolbar group order. Missing entries keep their default relative order. */
  order?: FileViewerToolbarItem[];
  /** Controls which built-in toolbar actions are displayed without disabling controller APIs. */
  items?: FileViewerToolbarActionMap;
  /** Hard operation permission map. False values block both built-in toolbar and public API calls. */
  permissions?: FileViewerToolbarActionMap;
  position?: FileViewerToolbarPosition;
  beforeOperation?: FileViewerBeforeOperation;
  beforeDownload?: FileViewerBeforeOperation;
  beforePrint?: FileViewerBeforeOperation;
  beforeExportHtml?: FileViewerBeforeOperation;
}

export interface FileViewerArchiveEntryActionContext {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified?: number;
  depth: number;
  previewable: boolean;
}

export type FileViewerArchiveEntryActionPolicy =
  | boolean
  | ((entry: FileViewerArchiveEntryActionContext) => boolean);

export interface FileViewerArchiveEntryActionsOptions {
  /**
   * Controls the download button for files opened from inside an archive.
   * The viewer-level original-file download remains controlled by toolbar options.
   */
  download?: FileViewerArchiveEntryActionPolicy;
}

export interface FileViewerArchiveOptions {
  workerUrl?: string;
  wasmUrl?: string;
  workerTimeoutMs?: number;
  cache?: boolean;
  maxArchiveSize?: number;
  maxEntryPreviewSize?: number;
  entryActions?: FileViewerArchiveEntryActionsOptions;
  /**
   * Optional archive password. It is used for the first encrypted archive
   * attempt; if it is wrong, the built-in password dialog or requestPassword
   * callback can still ask the user for a replacement.
   */
  password?: string;
  /**
   * Custom password request hook for encrypted archives. Return a string to
   * continue, or null/undefined to cancel and surface a friendly error.
   */
  requestPassword?: (
    context: FileViewerArchivePasswordRequestContext
  ) => string | null | undefined | Promise<string | null | undefined>;
}

export type FileViewerArchivePasswordRequestReason =
  | 'encrypted'
  | 'invalid-password'
  | 'read-failed'
  | 'extract-failed';

export interface FileViewerArchivePasswordRequestContext {
  filename: string;
  entryName?: string;
  attempt: number;
  reason: FileViewerArchivePasswordRequestReason;
  error?: unknown;
}

export interface FileViewerPdfOptions {
  toolbar?: boolean;
  navigation?: boolean;
  defaultNavigationVisible?: boolean;
  thumbnails?: boolean;
  rotation?: number;
  /**
   * Highlights and focuses one or more PDF regions after the document loads.
   * Use `pixel` with `sourceWidth` / `sourceHeight` for OCR coordinates, or
   * `pdf-point` for native PDF coordinates. Page numbers are one-based.
   */
  bbox?: FileViewerPdfBoundingBox | readonly FileViewerPdfBoundingBox[];
  /**
   * Initial PDF view position. Prefer the top-level `initialViewState` when the
   * same state should be passed through framework-neutral viewer APIs.
   */
  initialViewState?: FileViewerViewState;
  streaming?: boolean | 'same-origin';
  rangeChunkSize?: number;
  withCredentials?: boolean;
  /**
   * Base URL for the self-hosted PDF worker, cMaps, WASM, standard fonts, and
   * CJK fallback fonts. Useful for SPA routes whose document URL is deeper
   * than the deployment public path, for example `/workspace/c/`.
   */
  assetBaseUrl?: string | URL;
  workerUrl?: string;
  cMapUrl?: string;
  wasmUrl?: string;
  standardFontDataUrl?: string;
  /**
   * Enables the self-hosted CJK fallback used when a PDF references a font
   * such as Microsoft YaHei without embedding the font data. Defaults to true.
   */
  cjkFontFallback?: boolean;
  /**
   * Repairs malformed Identity-H/V CJK fonts that omit ToUnicode when the PDF
   * also embeds a usable same-family TrueType cmap. Defaults to true. The
   * repair is applied only to the in-memory preview and never changes the
   * original file used by download operations.
   */
  identityFontRepair?: boolean;
  /**
   * Directory containing `noto-sans-sc.css`, its `files/` font shards, and
   * the bundled font license. The path is resolved against the document base.
   */
  cjkFontFallbackPath?: string;
}

export type FileViewerPdfBoundingBoxUnit = 'ratio' | 'percent' | 'pixel' | 'pdf-point';

export type FileViewerPdfBoundingBoxOrigin = 'top-left' | 'bottom-left';

export interface FileViewerPdfBoundingBox {
  id?: string;
  /** One-based PDF page number. Defaults to the current page, then page 1. */
  page?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Defaults to `pdf-point`. */
  unit?: FileViewerPdfBoundingBoxUnit;
  /** Defaults to `bottom-left` for PDF points and `top-left` otherwise. */
  origin?: FileViewerPdfBoundingBoxOrigin;
  /** Required when `unit` is `pixel`; this is the OCR/source image width. */
  sourceWidth?: number;
  /** Required when `unit` is `pixel`; this is the OCR/source image height. */
  sourceHeight?: number;
  /** CSS color used for the outline and translucent fill. */
  color?: string;
  /** Optional accessible description for the highlighted region. */
  label?: string;
}

export interface FileViewerDocxOptions {
  worker?: boolean;
  workerUrl?: string;
  workerJsZipUrl?: string;
  progressive?: boolean;
  /** 默认 false，使用连续流式阅读；设为 true 时才启用 DOCX 页式预览。 */
  visualPagination?: boolean;
  workerTimeout?: number;
  renderPageBatchSize?: number;
  renderYieldEveryMs?: number;
  strictWordCompatibility?: boolean;
  paginationTolerance?: number;
  maxDynamicPaginationPasses?: number;
  awaitLayout?: boolean;
  preserveComplexFieldResults?: boolean;
  updatePageReferences?: boolean;
  hideWebHiddenContent?: boolean;
  ignoreLastRenderedPageBreak?: boolean;
  /** Overrides automatic DOCX dark rendering derived from the viewer theme. */
  darkMode?: boolean;
}

export interface FileViewerSpreadsheetOptions {
  worker?: boolean | 'auto';
  workerUrl?: string;
  /** `worker: 'auto'` 时，大于该字节数的表格自动使用静态 Worker，默认 1MB。 */
  workerAutoThreshold?: number;
  /**
   * CSV / TSV 文本编码。默认 `auto`：优先 UTF-8 BOM 和严格 UTF-8，
   * 否则使用浏览器内置 GB18030 解码器（同时覆盖 GBK）。
   */
  textEncoding?: 'auto' | 'utf-8' | 'gbk' | 'gb18030';
  /** 允许用户在 Excel / CSV / ODS 预览中拖拽表头边界调整列宽，默认关闭以保持历史行为。 */
  resizableColumns?: boolean;
  /** 允许用户在 Excel / CSV / ODS 预览中拖拽行头边界调整行高，默认关闭以保持历史行为。 */
  resizableRows?: boolean;
}

export interface FileViewerPresentationOptions {
  /** PPTX/OpenXML Worker URL. This is independent from the binary-PPT Worker. */
  workerUrl?: string | URL;
  workerType?: WorkerType;
  /** Optional self-hosted native WASM URL used only by the PowerPoint 97–2003 renderer. */
  pptWasmUrl?: string | URL;
  /** Optional self-hosted CJK font-pack URL used only by the PowerPoint 97–2003 renderer. */
  pptFontUrl?: string | URL;
  /** Optional module Worker URL used only by the PowerPoint 97–2003 renderer. */
  pptWorkerUrl?: string | URL;
  /** Selects the binary-PPT Worker path. Defaults to `auto`. */
  pptWorker?: boolean | 'auto';
  /** Controls the binary-PPT bounded IndexedDB frame cache. */
  pptCache?: false | {
    enabled?: boolean;
    dbName?: string;
    maxBytes?: number;
    maxEntries?: number;
    maxEntryBytes?: number;
  };
  /** Render and retain only binary-PPT slides near the viewport. Defaults to true. */
  pptVirtualize?: boolean;
  /** IntersectionObserver overscan for binary-PPT virtualization. Defaults to `150% 0px`. */
  pptVirtualRootMargin?: string;
  /** Delay before an offscreen binary-PPT canvas is cached and released. Defaults to 1200ms. */
  pptReleaseDelayMs?: number;
  /**
   * Optional ESM entry override for `@file-viewer/ppt`.
   * Full packages and the CDN/IIFE distribution provide a packaged default.
   */
  pptModuleUrl?: string | URL;
}

export type FileRenderExportMode = 'export' | 'print';

export type FileViewerRenderPurpose = 'preview' | 'thumbnail';

export type FileViewerThumbnailFormat = 'webp' | 'jpeg' | 'png';

export type FileViewerThumbnailFit = 'contain' | 'cover';

export interface FileViewerThumbnailCaptureOptions {
  width: number;
  height: number;
  format: FileViewerThumbnailFormat;
  quality: number;
  fit: FileViewerThumbnailFit;
  background: string;
  signal?: AbortSignal;
}

export interface FileRenderThumbnailAdapter {
  /** Prepare lazy content immediately before capture. */
  beforeCapture?: (options: FileViewerThumbnailCaptureOptions) => void | Promise<void>;
  /** Identifies a capture result that comes from packaged metadata rather than rendered content. */
  captureSource?: 'embedded' | 'rendered';
  /** A renderer-native fast path. Returning null delegates to the DOM fallback. */
  capture?: (options: FileViewerThumbnailCaptureOptions) => Blob | null | Promise<Blob | null>;
  /** The first page/slide/sheet/cover element used by the DOM fallback. */
  getTarget?: (options: FileViewerThumbnailCaptureOptions) => Element | null | Promise<Element | null>;
}

export interface FileRenderExportOptions {
  mode: FileRenderExportMode;
  title: string;
}

export interface FileRenderExportAdapter {
  print?: boolean;
  exportHtml?: boolean;
  includeDocumentStyles?: boolean;
  beforeSnapshot?: () => Promise<void> | void;
  /** Live page surfaces used by the interactive print-mask designer. */
  getPrintMaskPages?: () => readonly HTMLElement[];
  printStyle?: string | ((options: FileRenderExportOptions) => Promise<string> | string);
  toHtml?: (options: FileRenderExportOptions) => Promise<string> | string;
}

export interface FileRenderContext {
  filename?: string;
  url?: string;
  streamUrl?: string;
  signal?: AbortSignal;
  options?: FileViewerOptions;
  surface?: RenderSurface;
  registerExportAdapter?: (adapter: FileRenderExportAdapter | null) => void;
  registerThumbnailAdapter?: (adapter: FileRenderThumbnailAdapter | null) => void;
  renderPurpose?: FileViewerRenderPurpose;
  onProgressiveRender?: () => void;
  renderNestedBuffer?: (
    buffer: ArrayBuffer,
    type: string,
    target: HTMLDivElement,
    context?: FileRenderContext
  ) => Promise<FileViewerRenderedInstance | undefined>;
}

export type FileRenderHandler<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> = (
  buffer: ArrayBuffer,
  target: Target,
  type?: string,
  context?: FileRenderContext
) => Promise<Rendered>;

export interface FileRenderHandlerComposite<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> {
  accepts: Array<string>;
  handler: FileRenderHandler<Rendered, Target>;
}

/**
 * Framework-neutral instance returned by a renderer after it mounts content.
 *
 * Vue, React legacy, Web Components or imperative renderers may expose different
 * teardown names, but wrappers can share this single contract when bridging old
 * renderer handlers into the core registry.
 */
export type FileViewerRenderedInstance =
  | {
      $el?: Node;
      unmount: () => void | Promise<void>;
    }
  | {
      $el?: Node;
      $destroy: () => void | Promise<void>;
    }
  | {
      $el?: Node;
      destroy: () => void | Promise<void>;
    };

export interface FileViewerTypstOptions {
  compilerWasmUrl?: string;
  rendererWasmUrl?: string;
  fontAssetsUrl?: string;
  renderTimeoutMs?: number;
}

export type FileViewerModelLinearUnit =
  | 'millimeter'
  | 'centimeter'
  | 'meter'
  | 'inch'
  | 'foot';

export interface FileViewerModelOptions {
  /** Self-hosted worker that keeps STEP/IGES/BREP tessellation off the UI thread. */
  workerUrl?: string;
  /** Self-hosted occt-import-js runtime loaded by the classic worker. */
  runtimeUrl?: string;
  /** Self-hosted OpenCascade WebAssembly module used by the model renderer. */
  wasmUrl?: string;
  /** Disable only when Worker is unavailable or a host deliberately accepts main-thread parsing. */
  useWorker?: boolean;
  /** Maximum time allowed for geometry-kernel initialization and tessellation. Defaults to 120 seconds. */
  workerTimeoutMs?: number;
  linearUnit?: FileViewerModelLinearUnit;
  linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value';
  linearDeflection?: number;
  angularDeflection?: number;
}

export interface FileViewerDataOptions {
  sqlWasmUrl?: string;
}

export type FileViewerGeoBasemapPreset =
  | 'none'
  | 'offline'
  | 'openfreemap'
  | 'openfreemap-liberty'
  | 'openfreemap-bright'
  | 'openfreemap-positron'
  | 'openfreemap-dark'
  | 'openfreemap-fiord'
  | 'osm-raster'
  | 'tianditu-vector'
  | 'tianditu-imagery'
  | 'tianditu-terrain';

export type FileViewerTiandituMapStyle = 'vector' | 'imagery' | 'terrain';

export interface FileViewerGeoBasemapOptions {
  /**
   * `raster` uses XYZ/TMS image tiles. `vector-style` uses a MapLibre style
   * object or URL, which is the best path for OpenFreeMap/OpenMapTiles stacks.
   * `tianditu` builds the official base and annotation raster layers from the
   * caller-provided Tianditu token.
   */
  type?: 'raster' | 'vector-style' | 'tianditu';
  /**
   * Raster XYZ/TMS tile template, for example `/tiles/{z}/{x}/{y}.png`.
   */
  tileUrl?: string | string[];
  /**
   * MapLibre style JSON URL. Can point to a public source, an intranet mirror,
   * or an offline static file distributed with the viewer.
   */
  styleUrl?: string;
  /**
   * Inline MapLibre style object for fully offline deployments.
   */
  style?: Record<string, unknown>;
  /**
   * Human-readable label shown in the geo preview details panel.
   */
  label?: string;
  attribution?: string;
  tileSize?: number;
  minZoom?: number;
  maxZoom?: number;
  scheme?: 'xyz' | 'tms';
  rasterOpacity?: number;
  /** Tianditu API token. Required when `type` is `tianditu`. */
  token?: string;
  /** Tianditu map family. Defaults to `vector`. */
  mapStyle?: FileViewerTiandituMapStyle;
  /** Include the matching Tianditu annotation layer. Defaults to true. */
  labels?: boolean;
}

export interface FileViewerGeoOptions {
  /**
   * Source coordinate reference system. GeoJSON normally uses WGS84, but many
   * business exports carry Web Mercator, GCJ-02, BD-09, or legacy CRS metadata.
   *
   * Accepts values such as `EPSG:4326`, `EPSG:3857`, `CRS:84`, `GCJ02`,
   * `BD09`, or a proj4 definition string.
   */
  projection?: string;
  /**
   * Convenience raster tile URL. The renderer stays offline by default; setting
   * this property opts into a raster basemap without requiring a full MapLibre
   * style. Use `basemap` when you need a named preset or vector style URL.
   */
  tileUrl?: string | string[];
  /**
   * Basemap configuration. Defaults to an offline empty MapLibre style.
   *
   * Built-in presets are opt-in: `openfreemap-liberty` uses the public
   * OpenFreeMap MapLibre style, and `osm-raster` uses the public OSM raster
   * tiles for light usage or demos. Production systems should prefer a
   * self-hosted or intranet style/tile URL.
   */
  basemap?: false | FileViewerGeoBasemapPreset | FileViewerGeoBasemapOptions;
  /**
   * Tianditu API token used by the `tianditu-*` presets. The viewer never
   * supplies or persists a token; obtain one for the deployment's own domain.
   */
  tiandituToken?: string;
  /**
   * Defaults to true. When no CRS is declared and coordinates exceed longitude
   * or latitude ranges, the geo renderer treats Web Mercator-sized values as
   * EPSG:3857 before rendering.
   */
  inferProjection?: boolean;
  /**
   * Defaults to true. Disable only for environments without reliable WebGL,
   * where the SVG fallback is preferred.
   */
  preferMapEngine?: boolean;
  /**
   * Padding in CSS pixels when fitting the dataset bounds in the map viewport.
   */
  fitPadding?: number;
}

export interface FileViewerDrawingOptions {
  /**
   * Self-hosted diagrams.net viewer script.
   *
   * The default points to the viewer asset copied under
   * `vendor/drawio/viewer-static.min.js`, so Draw.io uses the official viewer
   * offline without reaching public diagrams.net hosts.
   */
  viewerScriptUrl?: string;
  /**
   * Defaults to true. Set to false only when a deployment prefers the small
   * built-in SVG fallback over the official diagrams.net viewer runtime.
   */
  preferOfficial?: boolean;
  /**
   * PlantUML SVG endpoint. When omitted, the renderer stays fully offline and
   * shows an SVG source preview. When provided, the renderer appends the
   * encoded PlantUML payload to this base URL. Self-host this endpoint for
   * intranet preview.
   *
   * Example: `/plantuml/svg/`.
   */
  plantumlServerUrl?: string;
  /**
   * Request timeout for server-rendered PlantUML SVG.
   */
  plantumlTimeoutMs?: number;
}

export type FileViewerCadRenderer = 'auto' | 'webgl' | 'canvas2d';
export type FileViewerCadDwfLineWeightMode = 'adaptive' | 'physical' | 'hairline';
export type FileViewerCadFitMode = 'best' | 'native';

export interface FileViewerCadOptions {
  wasmPath?: string;
  workerUrl?: string | URL;
  dwfWasmUrl?: string;
  dxfEncoding?: string;
  useWorker?: boolean;
  workerTimeoutMs?: number;
  renderer?: FileViewerCadRenderer;
  preferDwgWasm?: boolean;
  includePaperSpace?: boolean;
  maxInsertDepth?: number;
  keepRaw?: boolean;
  preloadDwg?: boolean;
  /**
   * `best` fits the first view to visible drawing geometry and ignores common
   * CAD outliers such as paper-space frames or far-away markers. `native`
   * preserves the raw bounds reported by the underlying CAD renderer.
   */
  fitMode?: FileViewerCadFitMode;
  /**
   * Fraction of the CAD viewport used by fit-to-view. Defaults to 0.92.
   */
  fitPadding?: number;
  dwfPreferWebgl?: boolean;
  dwfPreferWasm?: boolean;
  dwfBackground?: string;
  dwfMaxDevicePixelRatio?: number;
  dwfMaxCanvasPixels?: number;
  dwfMaxGpuCacheBytes?: number;
  dwfMaxCachedScenes?: number;
  dwfLineWeightMode?: FileViewerCadDwfLineWeightMode;
  dwfMinStrokeCssPx?: number;
  dwfMaxOverviewStrokeCssPx?: number;
  dwfMinTextCssPx?: number;
  dwfMinFilledAreaCssPx?: number;
  canvasOptions?: Record<string, unknown>;
}

export type FileViewerRendererMode = 'extend' | 'replace';
export type FileViewerBuiltinRendererPreset = 'all' | 'lite' | 'none';
export type FileViewerRendererPresetName = 'all' | 'lite' | 'office' | 'engineering';

export interface FileViewerAutoRendererOptions {
  /**
   * Uses renderer presets registered by build tooling or preset side-effect imports.
   *
   * Defaults to true in `extend` mode and false in `replace` mode so applications
   * can keep a strict hand-picked renderer registry when needed.
   */
  enabled?: boolean;
}

export interface FileViewerSearchOptions {
  enabled?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxMatches?: number;
  debounce?: number;
  className?: string;
  activeClassName?: string;
}

export interface FileViewerAiOptions {
  enabled?: boolean;
  collectText?: boolean;
  maxTextLength?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface FileViewerTextOptions {
  /**
   * Shows the renderer-local source metadata toolbar (file type, indexing
   * status, and line count). Defaults to true. This does not control the
   * viewer-level operation toolbar.
   */
  toolbar?: boolean;
  /**
   * Shows a non-selectable, screen-reader-hidden line-number gutter for code and text.
   * Defaults to false for regular files. The virtual large-text view keeps its
   * historical visible gutter when this option is omitted; pass false to hide it.
   */
  lineNumbers?: boolean;
  /** Switches text and code to bounded virtual rendering above this byte size. Defaults to 512 KiB. */
  virtualizeAboveBytes?: number;
  /**
   * Opts Markdown into source-mode virtual rendering above this byte size.
   * Markdown stays in its rendered reading view by default; set this only when
   * an application prefers bounded source inspection for exceptionally large files.
   */
  markdownVirtualizeAboveBytes?: number;
  /** Maximum source bytes mounted for one very long logical line at a time. Defaults to 16 KiB. */
  maxRenderedLineBytes?: number;
  /** Extra logical lines mounted above and below the visible viewport. Defaults to 12. */
  virtualOverscanLines?: number;
}

export type FileViewerUiDensity = 'comfortable' | 'compact';

export interface FileViewerUiOptions {
  /**
   * Controls spacing density for viewer chrome such as toolbars, headers,
   * archive lists, badges, search inputs, and compact action clusters.
   */
  density?: FileViewerUiDensity;
  /**
   * Overrides the workspace behind rendered pages, slides, and other preview
   * content. Pass any valid CSS background value (for example `transparent`)
   * to let the host application provide an immersive surface. Omit this value,
   * or pass `auto`, to keep each renderer's light/dark default.
   *
   * This does not change document pages, slide canvases, spreadsheet cells, or
   * other file-authored backgrounds.
   */
  surfaceBackground?: string;
}

export interface FileViewerOptions {
  theme?: FileViewerThemeMode;
  /**
   * Controls how aggressively the viewer protects its DOM and CSS from the
   * host page. Standard component packages resolve `auto` to Shadow DOM so
   * host resets cannot break the toolbar or rendered content. Use `none`
   * explicitly only for legacy integrations that require deep class overrides.
   */
  styleIsolation?: FileViewerStyleIsolation;
  /**
   * Viewer UI language. `auto` follows the browser language, Chinese browsers
   * resolve to `zh-CN`, and all other languages currently resolve to `en-US`.
   */
  locale?: FileViewerLocale;
  /**
   * Optional custom copy for built-in viewer UI. Use `i18n.messages` when you
   * also want to keep locale and messages grouped together.
   */
  messages?: FileViewerMessages;
  i18n?: FileViewerI18nOptions;
  /**
   * Controls how explicit renderer packages or presets are merged into this
   * viewer instance.
   *
   * `extend` mode keeps the configured built-in baseline and appends explicit
   * renderers. `replace` mode starts from an empty registry, so `preset` or
   * `renderers` fully define the active capability set.
   */
  rendererMode?: FileViewerRendererMode;
  /**
   * Advanced baseline switch for built-in browser renderers.
   *
   * Most applications can ignore this option and use `preset` / `renderers`
   * with `rendererMode:'replace'`. Keep it for compatibility or very strict
   * registry control: `all` preserves the historical full baseline, `lite`
   * keeps only low-cost web-native previewers, and `none` starts from an empty
   * built-in baseline while still allowing explicit renderer assembly.
   */
  builtinRenderers?: FileViewerBuiltinRendererPreset;
  /**
   * Enables renderer presets that were auto-registered by `@file-viewer/vite-plugin`
   * or by explicitly importing a preset package. Set to false when a product wants
   * total manual control through `renderers`.
   */
  autoRenderers?: boolean | FileViewerAutoRendererOptions;
  /**
   * Product-shaped renderer preset or preset list installed into this viewer
   * instance.
   *
   * This is the bundler-neutral path for Webpack, Rspack, Rollup, Umi,
   * legacy script builds, and any environment that should not depend on the
   * Vite virtual module. Import one or more preset packages and pass them here:
   *
   * `const officePreset = await import(theInstalledOfficePresetPackage)`
   * `options: { preset: officePreset.default }`
   * `options: { preset: [officePreset.default, engineeringPreset.default] }`
   *
   * The string form (`'office'`, `'all'`, etc.) selects a preset that has
   * already been registered by a preset side-effect import or by
   * `@file-viewer/vite-plugin`.
   */
  preset?: FileViewerRendererPresetInput;
  /**
   * @deprecated Use `preset: [officePreset, engineeringPreset]` instead. This
   * alias is kept only for compatibility with early 2.x integration drafts.
   */
  presets?: FileViewerRendererPresetInput;
  renderers?: FileViewerRendererPluginInput;
  watermark?: boolean | FileViewerWatermarkOptions;
  ui?: FileViewerUiOptions;
  toolbar?: boolean | FileViewerToolbarOptions;
  search?: boolean | FileViewerSearchOptions;
  ai?: boolean | FileViewerAiOptions;
  text?: FileViewerTextOptions;
  /**
   * Explicit content fitting strategy. When omitted, each renderer keeps its
   * historical first-screen behavior for backward compatibility.
   */
  fit?: FileViewerFitMode | FileViewerFitOptions;
  /**
   * Initial renderer view position used after the document becomes ready.
   *
   * Renderers apply the fields they understand. All standard renderer paths
   * expose at least renderer / zoom / scroll snapshots through the generic
   * provider; high-interaction renderers such as PDF, XMind, Geo, 3D, and CAD
   * add page, navigation, canvas, map, camera, or native view details.
   */
  initialViewState?: FileViewerViewState;
  archive?: FileViewerArchiveOptions;
  pdf?: FileViewerPdfOptions;
  docx?: FileViewerDocxOptions;
  presentation?: FileViewerPresentationOptions;
  spreadsheet?: FileViewerSpreadsheetOptions;
  typst?: FileViewerTypstOptions;
  geo?: FileViewerGeoOptions;
  data?: FileViewerDataOptions;
  drawing?: FileViewerDrawingOptions;
  cad?: FileViewerCadOptions;
  model?: FileViewerModelOptions;
  hooks?: FileViewerLifecycleHooks;
  beforeOperation?: FileViewerBeforeOperation;
}

export interface FileViewerLifecycleContext {
  phase: FileViewerLifecyclePhase;
  type: string;
  filename: string;
  source: FileViewerSourceKind;
  url?: string;
  file?: File;
  size?: number;
  version: number;
  timestamp: number;
  duration?: number;
  reason?: 'replace' | 'reset' | 'component-unmount';
}

export interface FileViewerLifecycleHooks {
  onLoadStart?: (context: FileViewerLifecycleContext) => void | Promise<void>;
  onLoadComplete?: (context: FileViewerLifecycleContext) => void | Promise<void>;
  onUnloadStart?: (context: FileViewerLifecycleContext) => void | Promise<void>;
  onUnloadComplete?: (context: FileViewerLifecycleContext) => void | Promise<void>;
}

export interface FileViewerOperationContext extends Omit<FileViewerLifecycleContext, 'phase'> {
  operation: FileViewerOperationType;
  label: string;
}

export type FileViewerBeforeOperation = (
  context: FileViewerOperationContext
) => boolean | void | Promise<boolean | void>;

export interface FileViewerOperationAvailability {
  download: boolean;
  print: boolean;
  exportHtml: boolean;
  zoom: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  zoomReset: boolean;
}

export interface FileViewerStateTheme {
  accent: string;
  badge: string;
  hint: string;
  label: string;
  soft: string;
}

export interface FileViewerStateDescriptor {
  state: FileViewerRenderStateKind;
  extension: string;
  title: string;
  message: string;
  description?: string;
  theme: FileViewerStateTheme;
  recoverable: boolean;
}

export interface FileViewerZoomState {
  scale: number;
  label: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canReset: boolean;
  minScale?: number;
  maxScale?: number;
}

export interface FileViewerFitRequest extends Required<Pick<FileViewerFitOptions, 'mode' | 'resize' | 'padding'>> {
  minScale?: number;
  maxScale?: number;
  source: FileViewerViewStateChangeSource;
  reason: 'initial' | 'resize' | 'api' | 'retry';
  viewportWidth: number;
  viewportHeight: number;
  container?: HTMLElement | null;
}

export interface FileViewerFitResult {
  applied: boolean;
  mode: FileViewerFitMode;
  resize: FileViewerFitResize;
  scale?: number;
  source?: FileViewerViewStateChangeSource;
  reason?: string;
  provider?: 'view-state' | 'zoom' | 'none' | (string & {});
  state?: FileViewerViewState;
}

export interface FileViewerZoomProvider {
  zoomIn: () => FileViewerZoomState | Promise<FileViewerZoomState>;
  zoomOut: () => FileViewerZoomState | Promise<FileViewerZoomState>;
  resetZoom: () => FileViewerZoomState | Promise<FileViewerZoomState>;
  setZoom?: (scale: number) => FileViewerZoomState | Promise<FileViewerZoomState>;
  fit?: (request: FileViewerFitRequest) => FileViewerFitResult | Promise<FileViewerFitResult>;
  getState: () => FileViewerZoomState;
  subscribe?: (listener: () => void) => () => void;
}

export interface FileViewerViewScrollState {
  top: number;
  left: number;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  topRatio: number;
  leftRatio: number;
}

export interface FileViewerNavigationState {
  visible?: boolean;
  mode?: string;
}

export interface FileViewerViewState {
  renderer?: string;
  page?: number;
  pageCount?: number;
  scale?: number;
  zoom?: FileViewerZoomState;
  rotation?: number;
  scroll?: Partial<FileViewerViewScrollState>;
  navigation?: FileViewerNavigationState;
  extra?: Record<string, unknown>;
}

export type FileViewerViewStateChangeSource =
  | 'initial'
  | 'api'
  | 'user'
  | 'viewer'
  | (string & {});

export type FileViewerViewStateChangeAction =
  | 'init'
  | 'restore'
  | 'page-change'
  | 'page-click'
  | 'page-step'
  | 'outline-click'
  | 'zoom-change'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'fit'
  | 'rotation-change'
  | 'rotate-left'
  | 'rotate-right'
  | 'scroll'
  | 'navigation-toggle'
  | 'navigation-mode-change'
  | (string & {});

export interface FileViewerViewStateChange {
  state: FileViewerViewState;
  action: FileViewerViewStateChangeAction;
  source: FileViewerViewStateChangeSource;
  timestamp: number;
}

export interface FileViewerApplyViewStateOptions {
  notify?: boolean;
  action?: FileViewerViewStateChangeAction;
  source?: FileViewerViewStateChangeSource;
}

export interface FileViewerViewStateProvider {
  getState: () => FileViewerViewState;
  applyState?: (
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ) => FileViewerViewState | Promise<FileViewerViewState>;
  fit?: (request: FileViewerFitRequest) => FileViewerFitResult | Promise<FileViewerFitResult>;
  subscribe?: (listener: (change: FileViewerViewStateChange) => void) => () => void;
}

export interface FileViewerSearchMatch {
  id: string;
  index: number;
  text: string;
  anchor: FileViewerDocumentAnchor | null;
  line?: number;
  page?: number;
}

export interface FileViewerSearchState {
  query: string;
  total: number;
  currentIndex: number;
  current: FileViewerSearchMatch | null;
  matches: FileViewerSearchMatch[];
}

export interface FileViewerSearchProvider {
  search: (query: string, options?: FileViewerSearchOptions) => FileViewerSearchState | Promise<FileViewerSearchState>;
  next?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
  previous?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
  clear?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
  getState?: () => FileViewerSearchState;
}

export interface FileViewerDocumentAnchor {
  id: string;
  index: number;
  line: number;
  type: 'page' | 'line' | 'block';
  label: string;
  text: string;
  page?: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FileViewerDocumentChunk {
  id: string;
  text: string;
  anchor: FileViewerDocumentAnchor;
  startLine: number;
  endLine: number;
}

export interface FileViewerComponentProps {
  file?: FileViewerFileRef;
  url?: string;
  name?: string;
  filename?: string;
  type?: string;
  size?: number;
  options?: FileViewerOptions;
}

export interface FileViewerComponentEventMap {
  'load-start': FileViewerLifecycleContext;
  'load-complete': FileViewerLifecycleContext;
  'unload-start': FileViewerLifecycleContext;
  'unload-complete': FileViewerLifecycleContext;
  'operation-before': FileViewerOperationContext;
  'operation-cancel': FileViewerOperationContext;
  'operation-availability-change': FileViewerOperationAvailability;
  'search-change': FileViewerSearchState;
  'location-change': FileViewerDocumentAnchor | null;
  'zoom-change': FileViewerZoomState;
  'view-state-change': FileViewerViewStateChange;
  'fit-change': FileViewerFitResult;
  'theme-change': FileViewerResolvedThemeMode;
}

export type FileViewerEventType = keyof FileViewerComponentEventMap;

export type FileViewerEvent = {
  [EventType in FileViewerEventType]: {
    type: EventType;
    payload: FileViewerComponentEventMap[EventType];
  };
}[FileViewerEventType];

export type FileViewerEventHandler = (event: FileViewerEvent) => void;

export interface FileViewerComponentEmits {
  (event: 'load-start', context: FileViewerComponentEventMap['load-start']): void;
  (event: 'load-complete', context: FileViewerComponentEventMap['load-complete']): void;
  (event: 'unload-start', context: FileViewerComponentEventMap['unload-start']): void;
  (event: 'unload-complete', context: FileViewerComponentEventMap['unload-complete']): void;
  (event: 'operation-before', context: FileViewerComponentEventMap['operation-before']): void;
  (event: 'operation-cancel', context: FileViewerComponentEventMap['operation-cancel']): void;
  (event: 'operation-availability-change', availability: FileViewerComponentEventMap['operation-availability-change']): void;
  (event: 'search-change', state: FileViewerComponentEventMap['search-change']): void;
  (event: 'location-change', anchor: FileViewerComponentEventMap['location-change']): void;
  (event: 'zoom-change', state: FileViewerComponentEventMap['zoom-change']): void;
  (event: 'view-state-change', change: FileViewerComponentEventMap['view-state-change']): void;
  (event: 'fit-change', result: FileViewerComponentEventMap['fit-change']): void;
  (event: 'theme-change', theme: FileViewerComponentEventMap['theme-change']): void;
}

export interface FileViewerPublicApi {
  destroy(): void;
  downloadOriginalFile(): Promise<void>;
  printRenderedHtml(options?: FileViewerPrintOptions): Promise<void>;
  printWithMask(options?: FileViewerPrintOptions): Promise<void>;
  exportRenderedHtml(): Promise<void>;
  zoomIn(): Promise<FileViewerZoomState>;
  zoomOut(): Promise<FileViewerZoomState>;
  resetZoom(): Promise<FileViewerZoomState>;
  fitToView(fit?: FileViewerFitMode | FileViewerFitOptions): Promise<FileViewerFitResult>;
  getZoomState(): FileViewerZoomState;
  getViewState(): FileViewerViewState | null;
  applyViewState(
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ): Promise<FileViewerViewState | null>;
  getOperationAvailability(): FileViewerOperationAvailability;
  getScrollContainer(): HTMLElement | null;
  searchDocument(query: string): Promise<FileViewerSearchState>;
  clearDocumentSearch(): Promise<FileViewerSearchState>;
  nextSearchResult(): Promise<FileViewerSearchState>;
  previousSearchResult(): Promise<FileViewerSearchState>;
  getSearchState(): FileViewerSearchState;
  collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
  scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean>;
  scrollToLine(line: number): Promise<boolean>;
  getDocumentTextChunks(): FileViewerDocumentChunk[];
}

export interface FileViewerDownloadOptions {
  filename?: string;
}

export interface FileViewerExportHtmlOptions {
  download?: boolean;
  filename?: string;
  title?: string;
  watermarkInlineStyle?: string;
}

/** Normalized print-mask rectangle in percent of the rendered content box. */
export interface FileViewerPrintMaskRegion {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Zero-based rendered page index. Omitted regions retain legacy whole-document coordinates. */
  pageIndex?: number;
}

/** Page-aware image placed above rendered content for printing, such as a seal or signature. */
export interface FileViewerPrintStamp extends FileViewerPrintMaskRegion {
  /** Image URL. Uploaded stamps are converted to a local data URL by the designer. */
  src: string;
  /** Image opacity from 0 to 1. Defaults to 1. */
  opacity?: number;
  /** Clockwise rotation in degrees. Defaults to 0. */
  rotate?: number;
  alt?: string;
}

export interface FileViewerPrintMaskOptions {
  /** Solid black cover blocks, matching common OFD/business redaction UX. */
  regions?: FileViewerPrintMaskRegion[];
  /** Image overlays, including locally uploaded seals and signatures. */
  stamps?: FileViewerPrintStamp[];
  /** Fill color for print masks. Defaults to opaque black. */
  color?: string;
}

export interface FileViewerPrintOptions {
  autoPrint?: boolean;
  openWindow?: () => Window | null;
  printWindow?: Window | null;
  title?: string;
  watermarkInlineStyle?: string;
  /** Optional print-time cover masks applied above content and below watermark. */
  mask?: FileViewerPrintMaskOptions | null;
}

export interface FileViewerSource {
  url?: string;
  file?: File | Blob;
  buffer?: ArrayBuffer;
  filename?: string;
  type?: string;
  size?: number;
}

export interface NormalizedFileViewerSource {
  kind: FileViewerSourceKind;
  filename: string;
  extension: string;
  url?: string;
  file?: File | Blob;
  buffer?: ArrayBuffer;
  size?: number;
}

export interface RenderSurface {
  host?: HTMLElement;
  container: HTMLElement;
  shadowRoot?: ShadowRoot;
  styleIsolation?: Exclude<FileViewerStyleIsolation, 'auto'>;
}

export interface RendererCapability {
  download?: boolean;
  print?: boolean | 'adapter';
  exportHtml?: boolean | 'adapter';
  zoom?: boolean | 'provider';
  search?: boolean | 'provider';
}

export interface RendererDefinition {
  id: string;
  label: string;
  category: FileViewerRendererCategory;
  extensions: readonly string[];
  async?: boolean;
  capabilities?: RendererCapability;
  load?: RendererLoader;
}

export type RendererPlugin = RendererDefinition;

export type ViewerLifecycleContext = FileViewerLifecycleContext;

export type ViewerOperationContext = FileViewerOperationContext;

export type ViewerCapabilityState = FileViewerOperationAvailability;

export interface RendererLoadContext {
  source: NormalizedFileViewerSource;
  surface: RenderSurface;
  options: FileViewerOptions;
  signal?: AbortSignal;
  registerExportAdapter?: (adapter: FileRenderExportAdapter | null) => void;
  registerThumbnailAdapter?: (adapter: FileRenderThumbnailAdapter | null) => void;
  renderContext?: FileRenderContext;
}

export interface RendererSession {
  destroy?: () => void | Promise<void>;
  getAvailability?: () => Partial<FileViewerOperationAvailability>;
}

export type RendererLoader = (context: RendererLoadContext) => RendererSession | Promise<RendererSession>;

export interface RendererRegistry {
  register(definition: RendererDefinition): void;
  unregister(id: string): boolean;
  getById(id: string): RendererDefinition | undefined;
  getByExtension(extension: string): RendererDefinition | undefined;
  hasExtension(extension: string): boolean;
  list(): RendererDefinition[];
  listExtensions(): string[];
}

export type FileViewerRendererPluginAssetKind =
  | 'worker'
  | 'wasm'
  | 'script'
  | 'style'
  | 'font'
  | 'vendor'
  | 'data';

export interface FileViewerRendererPluginAssetEntry {
  id: string;
  kind: FileViewerRendererPluginAssetKind;
  source: string;
  optional?: boolean;
}

export interface FileViewerRendererPluginAssetManifest {
  packageName: string;
  rendererId: string;
  assets: readonly FileViewerRendererPluginAssetEntry[];
}

export interface FileViewerRendererHandlerRegistration<Handler = FileRenderHandler> {
  rendererId: string;
  handler: Handler;
}

export interface FileViewerRendererInstallContext<Handler = FileRenderHandler> {
  registry: RendererRegistry;
  registerHandler?: (registration: FileViewerRendererHandlerRegistration<Handler>) => void;
}

export interface FileViewerRendererPlugin<Handler = FileRenderHandler> {
  id: string;
  label?: string;
  definitions?: readonly RendererDefinition[];
  handlers?: readonly FileViewerRendererHandlerRegistration<Handler>[];
  assets?: readonly FileViewerRendererPluginAssetManifest[];
  install?: (context: FileViewerRendererInstallContext<Handler>) => void | Promise<void>;
}

export interface FileViewerRendererPreset<Handler = FileRenderHandler> {
  id: string;
  label?: string;
  renderers: readonly FileViewerRendererPlugin<Handler>[];
}

export type FileViewerRendererPluginInput<Handler = FileRenderHandler> =
  | FileViewerRendererPlugin<Handler>
  | FileViewerRendererPreset<Handler>
  | readonly FileViewerRendererPluginInput<Handler>[];

export type FileViewerRendererPresetInput<Handler = FileRenderHandler> =
  | FileViewerRendererPresetName
  | FileViewerRendererPluginInput<Handler>
  | readonly FileViewerRendererPresetInput<Handler>[];

export interface FileViewerLoadOptions {
  signal?: AbortSignal;
}

export interface FileViewerInstance {
  readonly container: HTMLElement;
  /** Installs configured renderer plugins without loading a document. */
  prepare?(): Promise<void>;
  load(source: FileViewerSource, options?: FileViewerLoadOptions): Promise<RendererSession | null>;
  unload?(reason?: FileViewerLifecycleContext['reason']): Promise<void>;
  destroy(reason?: FileViewerLifecycleContext['reason']): Promise<void>;
  updateOptions(options: Partial<FileViewerOptions>): void;
  getCapabilities(extension?: string): FileViewerOperationAvailability;
  getRenderer(extension?: string): RendererDefinition | undefined;
  getSource(): NormalizedFileViewerSource | null;
  registerExportAdapter(adapter: FileRenderExportAdapter | null): void;
  getExportAdapter(): FileRenderExportAdapter | null;
  registerThumbnailAdapter?(adapter: FileRenderThumbnailAdapter | null): void;
  getThumbnailAdapter?(): FileRenderThumbnailAdapter | null;
  download(options?: FileViewerDownloadOptions): Promise<void>;
  exportHtml(options?: FileViewerExportHtmlOptions): Promise<string>;
  print(options?: FileViewerPrintOptions): Promise<void>;
  /** Open the async print-mask designer, then print with the chosen covers. */
  printWithMask(options?: FileViewerPrintOptions): Promise<void>;
  zoomIn(): Promise<FileViewerZoomState>;
  zoomOut(): Promise<FileViewerZoomState>;
  resetZoom(): Promise<FileViewerZoomState>;
  fitToView(fit?: FileViewerFitMode | FileViewerFitOptions): Promise<FileViewerFitResult>;
  getZoomState(): FileViewerZoomState;
  getViewState(): FileViewerViewState | null;
  applyViewState(
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ): Promise<FileViewerViewState | null>;
  search(query: string): Promise<FileViewerSearchState>;
  nextSearchResult(): Promise<FileViewerSearchState>;
  previousSearchResult(): Promise<FileViewerSearchState>;
  clearSearch(): Promise<FileViewerSearchState>;
  getSearchState(): FileViewerSearchState;
  collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
  getCurrentDocumentAnchor(): FileViewerDocumentAnchor | null;
  scrollToDocumentAnchor(anchor: FileViewerDocumentAnchor | string | number | null | undefined): boolean;
  scrollToLine(line: number): Promise<boolean>;
  getDocumentTextChunks(options?: boolean | FileViewerAiOptions): FileViewerDocumentChunk[];
}
