import {
  appendFileViewerStyle,
  applyFileViewerZoomAvailability,
  createViewer,
  isFileViewerShadowRoot,
  normalizeFileViewerUiDensity,
  normalizeFileViewerTheme,
  normalizeFileViewerStyleIsolation,
  syncFileViewerRenderSurfaceBackground,
  type FileViewerStyleHandle,
} from '../index';
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  createFileViewerTranslator,
  getExtension,
  normalizeFileViewerSourceUrl,
  hasVisibleFileViewerToolbarActions,
  isFileViewerZoomButtonDisabled,
  normalizeFileViewerToolbar,
  normalizeFilename,
  readFileViewerBuffer,
  resolveFileViewerSourceFilename,
  resolveFileViewerColorScheme,
  resolveFileViewerToolbarOrder,
  resolveFileViewerToolbarPosition,
  resolveVisibleFileViewerToolbar,
  toggleFileViewerColorScheme,
  wrapFileViewerFileRef,
  type FileViewerAiOptions,
  type FileViewerApplyViewStateOptions,
  type FileViewerArchiveOptions,
  type FileViewerCadOptions,
  type FileViewerDocxOptions,
  type FileViewerDocumentAnchor,
  type FileViewerDocumentChunk,
  type FileViewerEvent,
  type FileViewerEventHandler,
  type FileViewerEventType,
  type FileViewerFileRef,
  type FileViewerFitMode,
  type FileViewerFitOptions,
  type FileViewerFitResult,
  type FileViewerInstance,
  type FileViewerLifecycleContext,
  type FileViewerOperationAvailability,
  type FileViewerOptions,
  type FileViewerPdfOptions,
  type FileViewerPresentationOptions,
  type FileViewerSpreadsheetOptions,
  type FileViewerPublicApi,
  type FileViewerSource,
  type FileViewerSearchOptions,
  type FileViewerSearchState,
  type FileViewerThemeMode,
  type FileViewerToolbarOptions,
  type FileViewerToolbarPosition,
  type FileViewerTypstOptions,
  type FileViewerUiDensity,
  type FileViewerUiOptions,
  type FileViewerViewState,
  type FileViewerWatermarkOptions,
  type FileViewerPrintOptions,
  type FileViewerZoomState,
  type RendererRegistry,
  type RendererSession,
} from '../index';

export type FileRef = FileViewerFileRef;

export type ViewerWatermarkOptions = FileViewerWatermarkOptions;
export type ViewerToolbarPosition = FileViewerToolbarPosition;
export type ViewerToolbarOptions = FileViewerToolbarOptions;
export type ViewerArchiveOptions = FileViewerArchiveOptions;
export type ViewerPdfOptions = FileViewerPdfOptions;
export type ViewerPresentationOptions = FileViewerPresentationOptions;
export type ViewerSpreadsheetOptions = FileViewerSpreadsheetOptions;
export type ViewerDocxOptions = FileViewerDocxOptions;
export type ViewerTypstOptions = FileViewerTypstOptions;
export type ViewerCadOptions = FileViewerCadOptions;
export type ViewerSearchOptions = FileViewerSearchOptions;
export type ViewerAiOptions = FileViewerAiOptions;
export type ViewerFitMode = FileViewerFitMode;
export type ViewerFitOptions = FileViewerFitOptions;
export type ViewerFitResult = FileViewerFitResult;
export type ViewerViewState = FileViewerViewState;
export type ViewerApplyViewStateOptions = FileViewerApplyViewStateOptions;
export type ViewerThemeMode = FileViewerThemeMode;
export type ViewerUiDensity = FileViewerUiDensity;
export type ViewerUiOptions = FileViewerUiOptions;
export type ViewerOptions = FileViewerOptions;
export type ViewerEventType = FileViewerEventType;
export type ViewerEvent = FileViewerEvent;
export type ViewerEventHandler = FileViewerEventHandler;

export interface ViewerState {
  loading: boolean;
  ready: boolean;
  error: unknown | null;
  lastEvent: ViewerEvent | null;
  lifecycle: FileViewerLifecycleContext | null;
  availability: FileViewerOperationAvailability | null;
  search: FileViewerSearchState | null;
  zoom: FileViewerZoomState | null;
  location: FileViewerDocumentAnchor | null;
  /** Added in 2.2; optional so existing state fixtures remain source-compatible. */
  viewState?: FileViewerViewState | null;
}

export type ViewerStateListener = (
  state: ViewerState,
  event?: ViewerEvent
) => void;

export interface ViewerMountOptions {
  url?: string;
  file?: FileRef;
  buffer?: ArrayBuffer;
  name?: string;
  filename?: string;
  type?: string;
  size?: number;
  options?: ViewerOptions;
  onEvent?: ViewerEventHandler;
  onStateChange?: ViewerStateListener;
}

export interface ViewerSourceInput {
  url?: string;
  file?: FileRef;
  buffer?: ArrayBuffer;
  filename?: string;
  name?: string;
  type?: string;
  size?: number;
}

export interface ViewerFetchInput {
  url: string;
  signal?: AbortSignal;
  source: ViewerSourceInput;
}

export type ViewerFetchFile = (
  input: ViewerFetchInput
) => Promise<FileRef | null | undefined>;

export interface ViewerCoreOptions {
  registry?: RendererRegistry;
  fetchFile?: ViewerFetchFile;
  onError?: (error: unknown, source: ViewerSourceInput) => void;
}

export interface ViewerController {
  readonly container: HTMLElement;
  load(options: ViewerMountOptions): Promise<void>;
  update(options?: ViewerMountOptions): Promise<void>;
  reload(): Promise<void>;
  destroy(): void;
  getApi(): FileViewerPublicApi | FileViewerInstance | null;
  downloadOriginalFile(): Promise<void>;
  printRenderedHtml(options?: FileViewerPrintOptions): Promise<void>;
  printWithMask(options?: FileViewerPrintOptions): Promise<void>;
  exportRenderedHtml(): Promise<void>;
  zoomIn(): Promise<FileViewerZoomState | null>;
  zoomOut(): Promise<FileViewerZoomState | null>;
  resetZoom(): Promise<FileViewerZoomState | null>;
  fitToView(fit?: FileViewerFitMode | FileViewerFitOptions): Promise<FileViewerFitResult | null>;
  getViewState(): FileViewerViewState | null;
  applyViewState(
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ): Promise<FileViewerViewState | null>;
  searchDocument(query: string): Promise<FileViewerSearchState | null>;
  clearDocumentSearch(): Promise<FileViewerSearchState | null>;
  nextSearchResult(): Promise<FileViewerSearchState | null>;
  previousSearchResult(): Promise<FileViewerSearchState | null>;
  collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
  scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean>;
  scrollToLine(line: number): Promise<boolean>;
  getDocumentTextChunks(): FileViewerDocumentChunk[];
  getOperationAvailability(): FileViewerOperationAvailability | null;
  getZoomState(): FileViewerZoomState | null;
  getSearchState(): FileViewerSearchState | null;
  getState(): ViewerState;
  subscribe(listener: ViewerStateListener): () => void;
}

export type ViewerControllerAccessor = () => ViewerController | null;

export interface ViewerControllerHandle {
  load(options: ViewerMountOptions): Promise<void>;
  update(options?: ViewerMountOptions): Promise<void>;
  reload(): Promise<void>;
  destroy(): void;
  getController(): ViewerController | null;
  getApi(): FileViewerPublicApi | FileViewerInstance | null;
  downloadOriginalFile(): Promise<void>;
  printRenderedHtml(options?: FileViewerPrintOptions): Promise<void>;
  printWithMask(options?: FileViewerPrintOptions): Promise<void>;
  exportRenderedHtml(): Promise<void>;
  zoomIn(): Promise<FileViewerZoomState | null>;
  zoomOut(): Promise<FileViewerZoomState | null>;
  resetZoom(): Promise<FileViewerZoomState | null>;
  fitToView(fit?: FileViewerFitMode | FileViewerFitOptions): Promise<FileViewerFitResult | null>;
  getViewState(): FileViewerViewState | null;
  applyViewState(
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ): Promise<FileViewerViewState | null>;
  searchDocument(query: string): Promise<FileViewerSearchState | null>;
  clearDocumentSearch(): Promise<FileViewerSearchState | null>;
  nextSearchResult(): Promise<FileViewerSearchState | null>;
  previousSearchResult(): Promise<FileViewerSearchState | null>;
  collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
  scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean>;
  scrollToLine(line: number): Promise<boolean>;
  getDocumentTextChunks(): FileViewerDocumentChunk[];
  getOperationAvailability(): FileViewerOperationAvailability | null;
  getZoomState(): FileViewerZoomState | null;
  getSearchState(): FileViewerSearchState | null;
  getState(): ViewerState | null;
  subscribe(listener: ViewerStateListener): () => void;
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const hasSource = (options: ViewerMountOptions = {}) => {
  return !!(options.url || options.file || options.buffer);
};

const toViewerSourceInput = (options: ViewerMountOptions = {}): ViewerSourceInput => ({
  url: options.url,
  file: options.file,
  buffer: options.buffer,
  filename: options.filename || options.name,
  name: options.name,
  type: options.type,
  size: options.size,
});

// These options feed renderer selection or rendering itself. Viewer chrome,
// fitting, watermark, and operation callbacks update in place instead.
const RENDER_AFFECTING_VIEWER_OPTION_KEYS: readonly (keyof ViewerOptions)[] = [
  'theme',
  'rendererMode',
  'builtinRenderers',
  'autoRenderers',
  'preset',
  'presets',
  'renderers',
  'text',
  'archive',
  'chm',
  'pdf',
  'docx',
  'presentation',
  'spreadsheet',
  'iwork',
  'wordPerfect',
  'hangul',
  'typst',
  'geo',
  'data',
  'binary',
  'design',
  'drawing',
  'cad',
  'model',
];

const isPlainViewerOptionRecord = (value: object) => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const areSameViewerOptionValues = (
  current: unknown,
  next: unknown,
  pairs = new WeakMap<object, object>()
): boolean => {
  if (Object.is(current, next)) {
    return true;
  }
  if (
    current === null ||
    next === null ||
    typeof current !== 'object' ||
    typeof next !== 'object'
  ) {
    return false;
  }

  const existingPair = pairs.get(current);
  if (existingPair) {
    return existingPair === next;
  }
  pairs.set(current, next);

  if (Array.isArray(current) || Array.isArray(next)) {
    return Array.isArray(current) &&
      Array.isArray(next) &&
      current.length === next.length &&
      current.every((value, index) => areSameViewerOptionValues(value, next[index], pairs));
  }
  if (!isPlainViewerOptionRecord(current) || !isPlainViewerOptionRecord(next)) {
    return false;
  }

  const currentKeys = Object.keys(current).sort();
  const nextKeys = Object.keys(next).sort();
  return currentKeys.length === nextKeys.length &&
    currentKeys.every((key, index) => {
      return key === nextKeys[index] &&
        areSameViewerOptionValues(
          (current as Record<string, unknown>)[key],
          (next as Record<string, unknown>)[key],
          pairs
        );
    });
};

const hasViewerRenderingOptionsChanged = (
  current: ViewerOptions | undefined,
  next: ViewerOptions | undefined
) => {
  return RENDER_AFFECTING_VIEWER_OPTION_KEYS.some(key => {
    return !areSameViewerOptionValues(current?.[key], next?.[key]);
  });
};

const isSameViewerSource = (
  current: ViewerSourceInput | null,
  next: ViewerSourceInput | null
) => {
  if (!current || !next) {
    return current === next;
  }
  return current.url === next.url &&
    current.file === next.file &&
    current.buffer === next.buffer &&
    current.filename === next.filename &&
    current.name === next.name &&
    current.type === next.type &&
    Object.is(current.size, next.size);
};

const canUseFetch = () => typeof fetch === 'function';

const defaultFetchFile: ViewerFetchFile = async ({ url, signal }) => {
  if (!canUseFetch()) {
    throw new Error('fetch is not available in the current environment.');
  }

  const requestUrl = normalizeFileViewerSourceUrl(url) || url;
  const response = await fetch(requestUrl, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  return response.blob();
};

const resolveViewerSourceFilename = (source: ViewerSourceInput) => {
  return normalizeFilename(
    source.filename || source.name || resolveFileViewerSourceFilename({
      file: source.file,
      url: source.url,
      fallback: DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
    }),
    source.type ? `preview.${source.type}` : DEFAULT_FILE_VIEWER_SOURCE_FILENAME
  );
};

const resolveViewerLoadSource = async (
  source: ViewerSourceInput,
  options: {
    fetchFile?: ViewerFetchFile;
    signal?: AbortSignal;
  } = {}
): Promise<FileViewerSource> => {
  const filename = resolveViewerSourceFilename(source);
  const type = source.type || getExtension(filename);

  if (source.buffer) {
    return {
      buffer: source.buffer,
      filename,
      type,
      size: source.size ?? source.buffer.byteLength,
      url: source.url,
    };
  }

  if (source.file) {
    const file = wrapFileViewerFileRef(source.file, filename);
    return {
      file,
      buffer: await readFileViewerBuffer(file),
      filename: file.name || filename,
      type: type || getExtension(file.name),
      size: source.size ?? file.size,
      url: source.url,
    };
  }

  if (source.url) {
    const fileRef = await (options.fetchFile || defaultFetchFile)({
      url: source.url,
      signal: options.signal,
      source,
    });
    if (!fileRef) {
      throw new Error('Downloaded file is empty.');
    }

    const file = wrapFileViewerFileRef(fileRef, filename);
    return {
      file,
      buffer: await readFileViewerBuffer(file),
      filename: file.name || filename,
      type: type || getExtension(file.name),
      size: source.size ?? file.size,
      url: source.url,
    };
  }

  return {
    filename,
    type,
  };
};

export const createViewerControllerHandle = (
  getController: ViewerControllerAccessor,
  dispose: () => void
): ViewerControllerHandle => ({
  load(options) {
    return getController()?.load(options) ?? Promise.resolve();
  },
  update(options) {
    return getController()?.update(options) ?? Promise.resolve();
  },
  reload() {
    return getController()?.reload() ?? Promise.resolve();
  },
  destroy() {
    dispose();
  },
  getController,
  getApi() {
    return getController()?.getApi() ?? null;
  },
  downloadOriginalFile() {
    return getController()?.downloadOriginalFile() ?? Promise.resolve();
  },
  printRenderedHtml(options?: FileViewerPrintOptions) {
    return getController()?.printRenderedHtml(options) ?? Promise.resolve();
  },
  printWithMask(options?: FileViewerPrintOptions) {
    return getController()?.printWithMask(options) ?? Promise.resolve();
  },
  exportRenderedHtml() {
    return getController()?.exportRenderedHtml() ?? Promise.resolve();
  },
  zoomIn() {
    return getController()?.zoomIn() ?? Promise.resolve(null);
  },
  zoomOut() {
    return getController()?.zoomOut() ?? Promise.resolve(null);
  },
  resetZoom() {
    return getController()?.resetZoom() ?? Promise.resolve(null);
  },
  fitToView(fit) {
    return getController()?.fitToView(fit) ?? Promise.resolve(null);
  },
  getViewState() {
    return getController()?.getViewState() ?? null;
  },
  applyViewState(state, options) {
    return getController()?.applyViewState(state, options) ?? Promise.resolve(null);
  },
  searchDocument(query) {
    return getController()?.searchDocument(query) ?? Promise.resolve(null);
  },
  clearDocumentSearch() {
    return getController()?.clearDocumentSearch() ?? Promise.resolve(null);
  },
  nextSearchResult() {
    return getController()?.nextSearchResult() ?? Promise.resolve(null);
  },
  previousSearchResult() {
    return getController()?.previousSearchResult() ?? Promise.resolve(null);
  },
  collectDocumentAnchors() {
    return getController()?.collectDocumentAnchors() ?? Promise.resolve([]);
  },
  scrollToAnchor(anchor) {
    return getController()?.scrollToAnchor(anchor) ?? Promise.resolve(false);
  },
  scrollToLine(line) {
    return getController()?.scrollToLine(line) ?? Promise.resolve(false);
  },
  getDocumentTextChunks() {
    return getController()?.getDocumentTextChunks() ?? [];
  },
  getOperationAvailability() {
    return getController()?.getOperationAvailability() ?? null;
  },
  getZoomState() {
    return getController()?.getZoomState() ?? null;
  },
  getSearchState() {
    return getController()?.getSearchState() ?? null;
  },
  getState() {
    return getController()?.getState() ?? null;
  },
  subscribe(listener) {
    return getController()?.subscribe(listener) ?? (() => {});
  },
});

const callApi = async <Result>(
  api: FileViewerInstance | null,
  action: (api: FileViewerInstance) => Promise<Result> | Result,
  fallback: Result
) => {
  if (!api) {
    return fallback;
  }
  return action(api);
};

const isAbortError = (error: unknown) => {
  return Boolean(error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError');
};

const DEFAULT_TOOLBAR_AVAILABILITY: FileViewerOperationAvailability = {
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  zoomIn: false,
  zoomOut: false,
  zoomReset: false,
};

const DEFAULT_TOOLBAR_ZOOM_STATE: FileViewerZoomState = {
  scale: 1,
  label: '100%',
  canZoomIn: false,
  canZoomOut: false,
  canReset: false,
};

// A ShadowRoot cannot be detached. Track the exact roots created on viewer
// hosts so a later light-DOM remount can expose its children through a slot,
// without mistaking and clearing a ShadowRoot owned by the host application.
const ownedViewerShadowRoots = new WeakMap<HTMLElement, ShadowRoot>();

const WEB_VIEWER_STYLE = `
:host,.file-viewer-web-shell{display:block;width:100%;height:100%;min-width:0;min-height:0;contain:content;--file-viewer-bg:transparent;--file-viewer-content-bg:transparent;--file-viewer-text:#172033;--file-viewer-muted:#607282;--file-viewer-font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--file-viewer-border:rgba(20,35,53,.08);--file-viewer-toolbar-bg:rgba(255,255,255,.92);--file-viewer-toolbar-border:rgba(20,35,53,.06);--file-viewer-toolbar-shadow:0 18px 44px rgba(15,23,42,.16);--file-viewer-toolbar-radius:999px;--file-viewer-toolbar-gap:6px;--file-viewer-toolbar-min-height:45px;--file-viewer-toolbar-padding:6px 10px;--file-viewer-toolbar-floating-min-height:42px;--file-viewer-toolbar-floating-padding:6px;--file-viewer-toolbar-floating-offset:16px;--file-viewer-group-bg:rgba(20,35,53,.035);--file-viewer-group-border:rgba(20,35,53,.08);--file-viewer-group-gap:2px;--file-viewer-group-padding:2px;--file-viewer-button-color:#40546a;--file-viewer-button-hover-bg:rgba(33,163,102,.1);--file-viewer-button-hover-color:#16774c;--file-viewer-button-disabled-color:#aab5c0;--file-viewer-button-radius:8px;--file-viewer-button-min-width:42px;--file-viewer-button-height:30px;--file-viewer-button-padding:0 10px;--file-viewer-icon-button-size:30px;--file-viewer-zoom-meter-min-width:48px;--file-viewer-zoom-meter-padding:0 8px;--file-viewer-floating-button-min-width:48px;--file-viewer-floating-button-height:32px;--file-viewer-floating-icon-button-size:32px;--file-viewer-floating-zoom-meter-min-width:54px;--file-viewer-search-input-height:30px;--file-viewer-search-input-padding:0 10px;--file-viewer-search-button-min-width:32px;--file-viewer-search-button-padding:0 8px;--file-viewer-search-count-min-width:42px;--file-viewer-floating-search-input-height:32px;--file-viewer-focus-ring:rgba(31,157,103,.22);--file-viewer-z-toolbar:20;--file-viewer-z-floating-toolbar:30}
:host([theme='dark']),.file-viewer-web-shell[data-viewer-theme='dark']{--file-viewer-bg:#0f1720;--file-viewer-content-bg:#111b24;--file-viewer-text:#e5eef8;--file-viewer-muted:#cbd5e1;--file-viewer-border:rgba(148,163,184,.18);--file-viewer-toolbar-bg:rgba(15,23,42,.9);--file-viewer-toolbar-border:rgba(148,163,184,.18);--file-viewer-group-bg:rgba(148,163,184,.1);--file-viewer-group-border:rgba(148,163,184,.16);--file-viewer-button-color:#d7dee8;--file-viewer-button-hover-bg:rgba(45,212,191,.14);--file-viewer-button-hover-color:#5eead4;--file-viewer-button-disabled-color:#64748b;--file-viewer-input-bg:rgba(15,23,42,.78);--file-viewer-input-color:#f8fafc}
.file-viewer-web-shell,.file-viewer-web-shell *,.file-viewer-web-shell *::before,.file-viewer-web-shell *::after{box-sizing:border-box}
.file-viewer-web-shell{position:relative;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--file-viewer-render-surface-background,var(--file-viewer-bg));color:var(--file-viewer-text);font:var(--file-viewer-font);letter-spacing:0;box-sizing:border-box;contain:content}
.file-viewer-web-shell[data-viewer-density="compact"]{--file-viewer-toolbar-gap:3px;--file-viewer-toolbar-min-height:34px;--file-viewer-toolbar-padding:3px 5px;--file-viewer-toolbar-floating-min-height:32px;--file-viewer-toolbar-floating-padding:3px;--file-viewer-toolbar-floating-offset:10px;--file-viewer-group-gap:2px;--file-viewer-group-padding:2px;--file-viewer-button-radius:6px;--file-viewer-button-min-width:34px;--file-viewer-button-height:26px;--file-viewer-button-padding:0 6px;--file-viewer-icon-button-size:26px;--file-viewer-zoom-meter-min-width:42px;--file-viewer-zoom-meter-padding:0 5px;--file-viewer-floating-button-min-width:38px;--file-viewer-floating-button-height:28px;--file-viewer-floating-icon-button-size:28px;--file-viewer-floating-zoom-meter-min-width:46px;--file-viewer-search-input-height:26px;--file-viewer-search-input-padding:0 8px;--file-viewer-search-button-min-width:28px;--file-viewer-search-button-padding:0 6px;--file-viewer-search-count-min-width:36px;--file-viewer-floating-search-input-height:28px}
.file-viewer-web-content{position:relative;flex:1 1 auto;min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;background:var(--file-viewer-render-surface-background,var(--file-viewer-content-bg))}
.file-viewer-web-toolbar{flex:0 0 auto;min-height:var(--file-viewer-toolbar-min-height);display:inline-flex;align-items:center;justify-content:flex-end;gap:var(--file-viewer-toolbar-gap);padding:var(--file-viewer-toolbar-padding);border-bottom:1px solid var(--file-viewer-toolbar-border);background:var(--file-viewer-toolbar-bg);box-sizing:border-box;z-index:var(--file-viewer-z-toolbar)}
.file-viewer-web-toolbar[hidden]{display:none!important}
.file-viewer-web-toolbar[data-toolbar-position="top-center"]{justify-content:center}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"]{position:absolute;right:calc(var(--file-viewer-toolbar-floating-offset) + env(safe-area-inset-right,0px));bottom:calc(var(--file-viewer-toolbar-floating-offset) + env(safe-area-inset-bottom,0px));min-height:var(--file-viewer-toolbar-floating-min-height);padding:var(--file-viewer-toolbar-floating-padding);border:1px solid var(--file-viewer-border);border-radius:var(--file-viewer-toolbar-radius);background:var(--file-viewer-toolbar-bg);box-shadow:var(--file-viewer-toolbar-shadow);backdrop-filter:blur(16px);z-index:var(--file-viewer-z-floating-toolbar)}
.file-viewer-web-toolbar-group{display:inline-flex;align-items:center;gap:var(--file-viewer-group-gap);padding:var(--file-viewer-group-padding);border:1px solid var(--file-viewer-group-border);border-radius:var(--file-viewer-toolbar-radius);background:var(--file-viewer-group-bg)}
.file-viewer-web-toolbar button{min-width:var(--file-viewer-button-min-width);height:var(--file-viewer-button-height);padding:var(--file-viewer-button-padding);border:0;border-radius:var(--file-viewer-button-radius);background:transparent;color:var(--file-viewer-button-color);font:inherit;font-size:12px;font-weight:800;line-height:1;letter-spacing:0;white-space:nowrap;cursor:pointer}
.file-viewer-web-toolbar button:hover:not(:disabled){background:var(--file-viewer-button-hover-bg);color:var(--file-viewer-button-hover-color)}
.file-viewer-web-toolbar button:disabled{color:var(--file-viewer-button-disabled-color);cursor:not-allowed}
.file-viewer-web-toolbar .file-viewer-web-icon-button{width:var(--file-viewer-icon-button-size);min-width:var(--file-viewer-icon-button-size);padding:0;display:inline-flex;align-items:center;justify-content:center}
.file-viewer-web-theme-button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.file-viewer-web-toolbar .file-viewer-web-zoom-meter{min-width:var(--file-viewer-zoom-meter-min-width);height:var(--file-viewer-button-height);padding:var(--file-viewer-zoom-meter-padding);display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;color:var(--file-viewer-button-color)}
.file-viewer-web-toolbar .file-viewer-web-zoom-meter--readonly{font-size:12px;font-weight:800;line-height:1;white-space:nowrap}
.file-viewer-web-print-menu{position:relative;display:inline-flex}
.file-viewer-web-print-menu > button{min-width:var(--file-viewer-button-min-width);height:var(--file-viewer-button-height);padding:var(--file-viewer-button-padding);border:0;border-radius:var(--file-viewer-button-radius);background:transparent;color:var(--file-viewer-button-color);font:inherit;font-size:12px;font-weight:800;line-height:1;letter-spacing:0;white-space:nowrap;cursor:pointer}
.file-viewer-web-print-menu > button:hover:not(:disabled){background:var(--file-viewer-button-hover-bg);color:var(--file-viewer-button-hover-color)}
.file-viewer-web-print-menu > button:disabled{color:var(--file-viewer-button-disabled-color);cursor:not-allowed}
.file-viewer-web-print-menu-panel{position:absolute;top:calc(100% + 4px);right:0;z-index:40;min-width:118px;padding:4px;border:1px solid var(--file-viewer-group-border);border-radius:10px;background:var(--file-viewer-toolbar-bg);box-shadow:var(--file-viewer-toolbar-shadow);display:none;flex-direction:column;gap:2px}
.file-viewer-web-print-menu[data-open="true"] .file-viewer-web-print-menu-panel{display:flex}
.file-viewer-web-print-menu-panel button{width:100%;min-width:0;justify-content:flex-start;text-align:left;border-radius:8px}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] .file-viewer-web-print-menu-panel{top:auto;bottom:calc(100% + 6px);z-index:50}
.file-viewer-web-search{gap:4px}
.file-viewer-web-search input{width:clamp(128px,18vw,220px);height:var(--file-viewer-search-input-height);box-sizing:border-box;border:0;border-radius:var(--file-viewer-toolbar-radius);padding:var(--file-viewer-search-input-padding);background:var(--file-viewer-input-bg);color:var(--file-viewer-input-color);font:inherit;font-size:12px;line-height:var(--file-viewer-search-input-height);letter-spacing:0;outline:0}
.file-viewer-web-search input:focus{box-shadow:0 0 0 2px var(--file-viewer-focus-ring)}
.file-viewer-web-search button{min-width:var(--file-viewer-search-button-min-width);height:var(--file-viewer-search-input-height);padding:var(--file-viewer-search-button-padding);border-radius:999px}
.file-viewer-web-search-count{min-width:var(--file-viewer-search-count-min-width);text-align:center;color:var(--file-viewer-muted);font-size:12px;font-weight:800;line-height:var(--file-viewer-search-input-height);white-space:nowrap}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] button{min-width:var(--file-viewer-floating-button-min-width);height:var(--file-viewer-floating-button-height);border-radius:999px}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] .file-viewer-web-icon-button{width:var(--file-viewer-floating-icon-button-size);min-width:var(--file-viewer-floating-icon-button-size)}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] .file-viewer-web-zoom-meter{min-width:var(--file-viewer-floating-zoom-meter-min-width);height:var(--file-viewer-floating-button-height)}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] .file-viewer-web-search button{min-width:var(--file-viewer-search-button-min-width);height:var(--file-viewer-floating-search-input-height)}
.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] .file-viewer-web-search input{height:var(--file-viewer-floating-search-input-height);line-height:var(--file-viewer-floating-search-input-height);width:clamp(120px,18vw,190px)}
.file-viewer-web-shell[data-viewer-theme='dark']{color-scheme:dark;--file-viewer-bg:#0f1720;--file-viewer-content-bg:#111b24;--file-viewer-text:#e5eef8;--file-viewer-muted:#cbd5e1;--file-viewer-border:rgba(148,163,184,.18);--file-viewer-toolbar-bg:rgba(15,23,42,.9);--file-viewer-toolbar-border:rgba(148,163,184,.18);--file-viewer-group-bg:rgba(148,163,184,.1);--file-viewer-group-border:rgba(148,163,184,.16);--file-viewer-button-color:#d7dee8;--file-viewer-button-hover-bg:rgba(45,212,191,.14);--file-viewer-button-hover-color:#5eead4;--file-viewer-button-disabled-color:#64748b;--file-viewer-input-bg:rgba(15,23,42,.78);--file-viewer-input-color:#f8fafc}
@media (prefers-color-scheme:dark){.file-viewer-web-shell[data-viewer-theme='system']{color-scheme:dark;--file-viewer-bg:#0f1720;--file-viewer-content-bg:#111b24;--file-viewer-text:#e5eef8;--file-viewer-muted:#cbd5e1;--file-viewer-border:rgba(148,163,184,.18);--file-viewer-toolbar-bg:rgba(15,23,42,.9);--file-viewer-toolbar-border:rgba(148,163,184,.18);--file-viewer-group-bg:rgba(148,163,184,.1);--file-viewer-group-border:rgba(148,163,184,.16);--file-viewer-button-color:#d7dee8;--file-viewer-button-hover-bg:rgba(45,212,191,.14);--file-viewer-button-hover-color:#5eead4;--file-viewer-button-disabled-color:#64748b;--file-viewer-input-bg:rgba(15,23,42,.78);--file-viewer-input-color:#f8fafc}}
@media (max-width:640px){.file-viewer-web-toolbar{max-width:100%;overflow-x:auto;overflow-y:visible}.file-viewer-web-toolbar[data-toolbar-position="bottom-right"]{max-width:calc(100% - 32px);overflow:visible}.file-viewer-web-toolbar[data-toolbar-position="bottom-right"] .file-viewer-web-print-menu-panel{left:50%;right:auto;transform:translateX(-50%);min-width:min(148px,calc(100vw - 32px))}.file-viewer-web-search input{width:120px}}
`;

const addPart = (element: HTMLElement, ...parts: string[]) => {
  const partList = element.part as DOMTokenList | undefined;
  if (partList?.add) {
    partList.add(...parts);
    return;
  }
  const nextParts = new Set([
    ...(element.getAttribute('part') || '').split(/\s+/).filter(Boolean),
    ...parts,
  ]);
  element.setAttribute('part', [...nextParts].join(' '));
};

const createButton = (
  documentRef: Document,
  label: string,
  className: string,
  onClick: () => void | Promise<unknown>
) => {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = className;
  addPart(button, 'button');
  button.textContent = label;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', () => {
    void onClick();
  });
  return button;
};

const createReadonlyMeter = (
  documentRef: Document,
  label: string,
  className: string
) => {
  const meter = documentRef.createElement('span');
  meter.className = `${className} file-viewer-web-zoom-meter--readonly`;
  addPart(meter, 'button');
  meter.textContent = label;
  meter.title = label;
  meter.setAttribute('aria-label', label);
  return meter;
};

const setThemeButtonIcon = (
  button: HTMLButtonElement,
  currentTheme: 'light' | 'dark'
) => {
  button.innerHTML = currentTheme === 'dark'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
};

export const mountViewer = (
  container: HTMLElement,
  initialOptions: ViewerMountOptions = {},
  coreOptions: ViewerCoreOptions = {}
): ViewerController => {
  if (!isBrowser()) {
    throw new Error('Flyfish File Viewer can only be mounted in a browser DOM environment.');
  }

  const documentRef = container.ownerDocument;
  const initialStyleIsolation = normalizeFileViewerStyleIsolation(initialOptions.options?.styleIsolation);
  const shouldUseShadowRoot = initialStyleIsolation === 'auto' || initialStyleIsolation === 'shadow';
  const existingHostShadowRoot = container.shadowRoot;
  const ownedHostShadowRoot = ownedViewerShadowRoots.get(container);
  const hasOwnedHostShadowRoot = Boolean(
    existingHostShadowRoot && ownedHostShadowRoot === existingHostShadowRoot
  );
  const canAttachShadowRoot = typeof container.attachShadow === 'function' && !container.shadowRoot;
  let mountBoundary: HTMLElement | null = null;
  let renderRoot: HTMLElement | ShadowRoot = container;

  if (shouldUseShadowRoot && hasOwnedHostShadowRoot && existingHostShadowRoot) {
    renderRoot = existingHostShadowRoot;
  } else if (shouldUseShadowRoot && canAttachShadowRoot) {
    try {
      // The viewer owns this root even when its host already lives inside a
      // customer's ShadowRoot. Reusing the ancestor would let that component's
      // resets override the toolbar and would make our :host rules mutate the
      // customer's outer custom element.
      // Delegated focus makes Safari taps on renderer controls focus the first
      // toolbar input instead, triggering keyboard zoom and viewport scrolling.
      renderRoot = container.attachShadow({ mode: 'open' });
      ownedViewerShadowRoots.set(container, renderRoot);
    } catch {
      // Some HTMLElement subclasses cannot host Shadow DOM, and a closed root
      // is intentionally invisible through `shadowRoot`. Keep the legacy
      // scoped path usable instead of surfacing a raw NotSupportedError.
      renderRoot = container;
    }
  } else if (existingHostShadowRoot && !hasOwnedHostShadowRoot) {
    // The application owns this root. Preserve every existing child and mount
    // the viewer in a dedicated boundary. Shadow mode gets a nested root so
    // customer resets in the outer component cannot reach the viewer.
    mountBoundary = documentRef.createElement('div');
    mountBoundary.dataset.fileViewerMountBoundary = 'true';
    existingHostShadowRoot.appendChild(mountBoundary);
    if (shouldUseShadowRoot && typeof mountBoundary.attachShadow === 'function') {
      try {
        renderRoot = mountBoundary.attachShadow({ mode: 'open' });
      } catch {
        renderRoot = mountBoundary;
      }
    } else {
      renderRoot = mountBoundary;
    }
  } else if (!shouldUseShadowRoot && hasOwnedHostShadowRoot && existingHostShadowRoot) {
    // Light-DOM children of a shadow host are not painted unless the root has
    // a slot. Keep the immutable owned root, but project the real light-DOM
    // viewer so host selectors and legacy deep overrides work as documented.
    const slot = documentRef.createElement('slot');
    slot.dataset.fileViewerLightDomSlot = 'true';
    existingHostShadowRoot.replaceChildren(slot);
    renderRoot = container;
  }
  renderRoot.replaceChildren();
  const styleHandle: FileViewerStyleHandle = appendFileViewerStyle(renderRoot, WEB_VIEWER_STYLE, {
    // Adopt only into a root owned by the viewer. Adopting into an ancestor
    // ShadowRoot would leak toolbar selectors and apply :host rules to the
    // customer's custom element.
    adoptedStyleSheet: isFileViewerShadowRoot(renderRoot),
  });
  const shell = documentRef.createElement('div');
  shell.className = 'file-viewer-web-shell';
  addPart(shell, 'shell');
  const toolbarEl = documentRef.createElement('div');
  toolbarEl.className = 'file-viewer-web-toolbar';
  addPart(toolbarEl, 'toolbar');
  const contentEl = documentRef.createElement('div');
  contentEl.className = 'file-viewer-web-content';
  addPart(contentEl, 'content');
  contentEl.dataset.viewerScrollContainer = 'true';
  shell.append(toolbarEl, contentEl);
  renderRoot.appendChild(shell);

  let disposed = false;
  let currentOptions: ViewerMountOptions = initialOptions;
  const viewerColorSchemeQuery = documentRef.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  const resolveCurrentViewerTheme = (theme: ViewerOptions['theme']) => {
    return viewerColorSchemeQuery
      ? resolveFileViewerColorScheme(theme, viewerColorSchemeQuery.matches)
      : resolveFileViewerColorScheme(theme);
  };
  let currentSource: ViewerSourceInput | null = hasSource(currentOptions)
    ? toViewerSourceInput(currentOptions)
    : null;
  let abortController: AbortController | null = null;
  const listeners = new Set<ViewerStateListener>();
  const state: ViewerState = {
    loading: false,
    ready: false,
    error: null,
    lastEvent: null,
    lifecycle: null,
    availability: null,
    search: null,
    zoom: null,
    location: null,
    viewState: null,
  };
  const getCurrentExtension = () => {
    if (state.lifecycle?.type) {
      return state.lifecycle.type;
    }
    return currentSource ? getExtension(resolveViewerSourceFilename(currentSource)) : '';
  };
  const getToolbarZoomState = () => state.zoom || instance.getZoomState() || DEFAULT_TOOLBAR_ZOOM_STATE;
  const getToolbarAvailability = () => applyFileViewerZoomAvailability(
    state.availability || instance.getCapabilities() || DEFAULT_TOOLBAR_AVAILABILITY,
    getToolbarZoomState()
  );
  const snapshotState = (): ViewerState => ({
    ...state,
    availability: getToolbarAvailability(),
    search: state.search
      ? { ...state.search, matches: [...state.search.matches] }
      : null,
    zoom: state.zoom ? { ...state.zoom } : null,
    location: state.location ? { ...state.location } : null,
    viewState: state.viewState
      ? {
          ...state.viewState,
          zoom: state.viewState.zoom ? { ...state.viewState.zoom } : undefined,
          scroll: state.viewState.scroll ? { ...state.viewState.scroll } : undefined,
          navigation: state.viewState.navigation ? { ...state.viewState.navigation } : undefined,
          extra: state.viewState.extra ? { ...state.viewState.extra } : undefined,
        }
      : null,
  });
  const syncShellTheme = () => {
    shell.dataset.viewerTheme = normalizeFileViewerTheme(currentOptions.options?.theme);
    shell.dataset.viewerDensity = normalizeFileViewerUiDensity(currentOptions.options?.ui?.density);
    syncFileViewerRenderSurfaceBackground(shell, currentOptions.options);
  };
  let controller: ViewerController | null = null;
  let searchDraft = '';
  const isSearchToolbarVisible = (
    toolbar: ViewerToolbarOptions,
    options: ViewerOptions
  ) => {
    if (toolbar.search === false || options.search === false || !state.ready || state.loading || state.error) {
      return false;
    }
    if (contentEl.querySelector('.file-viewer-missing-renderer')) {
      return false;
    }
    const renderer = instance.getRenderer(getCurrentExtension());
    return !!renderer?.capabilities?.search;
  };
  const renderToolbar = () => {
    if (disposed) {
      return;
    }

    syncShellTheme();
    const options = currentOptions.options || {};
    const toolbar = normalizeFileViewerToolbar(options);
    const availability = getToolbarAvailability();
    const showSearchToolbar = isSearchToolbarVisible(toolbar, options);
    const visibleToolbar = resolveVisibleFileViewerToolbar(toolbar, availability, showSearchToolbar);
    const showToolbar = hasVisibleFileViewerToolbarActions(visibleToolbar);
    const toolbarPosition = resolveFileViewerToolbarPosition(options, getCurrentExtension());
    const toolbarDisabled = state.loading || !!state.error;
    const zoomState = getToolbarZoomState();
    const t = createFileViewerTranslator(options);
    toolbarEl.hidden = !showToolbar;
    toolbarEl.dataset.toolbarPosition = toolbarPosition;
    toolbarEl.replaceChildren();

    if (!showToolbar) {
      return;
    }

    const appendSearchToolbar = () => {
      if (!showSearchToolbar) {
        return;
      }

      const searchState = state.search;
      const searchTotal = searchState?.total ?? 0;
      const currentIndex = searchTotal > 0 ? (searchState?.currentIndex ?? -1) + 1 : 0;
      const group = documentRef.createElement('form');
      group.className = 'file-viewer-web-toolbar-group file-viewer-web-search';
      addPart(group, 'toolbar-group');
      group.setAttribute('role', 'search');
      group.setAttribute('aria-label', t('toolbar.search'));

      const input = documentRef.createElement('input');
      input.type = 'search';
      addPart(input, 'input');
      input.value = searchDraft;
      input.placeholder = t('toolbar.searchPlaceholder');
      input.title = t('toolbar.searchPlaceholder');
      input.setAttribute('aria-label', t('toolbar.searchPlaceholder'));
      input.disabled = toolbarDisabled;
      input.addEventListener('input', () => {
        searchDraft = input.value;
      });

      const searchButton = documentRef.createElement('button');
      searchButton.type = 'submit';
      addPart(searchButton, 'button');
      searchButton.textContent = t('toolbar.search');
      searchButton.title = t('toolbar.search');
      searchButton.setAttribute('aria-label', t('toolbar.search'));
      searchButton.disabled = toolbarDisabled;

      const previousButton = createButton(documentRef, '<', 'file-viewer-web-icon-button', () => controller?.previousSearchResult());
      previousButton.title = t('toolbar.searchPrevious');
      previousButton.setAttribute('aria-label', t('toolbar.searchPrevious'));
      previousButton.disabled = toolbarDisabled || searchTotal < 1;

      const nextButton = createButton(documentRef, '>', 'file-viewer-web-icon-button', () => controller?.nextSearchResult());
      nextButton.title = t('toolbar.searchNext');
      nextButton.setAttribute('aria-label', t('toolbar.searchNext'));
      nextButton.disabled = toolbarDisabled || searchTotal < 1;

      const clearButton = createButton(documentRef, 'x', 'file-viewer-web-icon-button', async () => {
        searchDraft = '';
        await controller?.clearDocumentSearch();
      });
      clearButton.title = t('toolbar.searchClear');
      clearButton.setAttribute('aria-label', t('toolbar.searchClear'));
      clearButton.disabled = toolbarDisabled || (!searchDraft && !searchState?.query);

      const count = documentRef.createElement('span');
      count.className = 'file-viewer-web-search-count';
      addPart(count, 'toolbar-status');
      count.textContent = `${currentIndex}/${searchTotal}`;
      count.setAttribute('aria-live', 'polite');

      group.addEventListener('submit', event => {
        event.preventDefault();
        searchDraft = input.value;
        const query = searchDraft.trim();
        void (query ? controller?.searchDocument(query) : controller?.clearDocumentSearch());
      });

      group.append(input, searchButton, previousButton, nextButton, clearButton, count);
      toolbarEl.appendChild(group);
    };

    const appendZoomToolbar = () => {
      if (!visibleToolbar.zoom) {
        return;
      }

      const group = documentRef.createElement('div');
      group.className = 'file-viewer-web-toolbar-group';
      addPart(group, 'toolbar-group');
      group.setAttribute('aria-label', t('toolbar.zoomGroup'));

      if (availability.zoomOut) {
        const button = createButton(documentRef, '-', 'file-viewer-web-icon-button', () => controller?.zoomOut());
        button.title = t('toolbar.zoomOut');
        button.setAttribute('aria-label', t('toolbar.zoomOut'));
        button.disabled = isFileViewerZoomButtonDisabled({
          action: 'canZoomOut',
          availability,
          toolbarDisabled,
          zoomState,
        });
        group.appendChild(button);
      }

      if (availability.zoomReset) {
        const meter = createButton(documentRef, zoomState.label, 'file-viewer-web-zoom-meter', () => controller?.resetZoom());
        meter.title = t('toolbar.zoomReset');
        meter.disabled = isFileViewerZoomButtonDisabled({
          action: 'canReset',
          availability,
          toolbarDisabled,
          zoomState,
        });
        group.appendChild(meter);
      } else {
        group.appendChild(createReadonlyMeter(
          documentRef,
          zoomState.label,
          'file-viewer-web-zoom-meter'
        ));
      }

      if (availability.zoomReset) {
        // Placed before the zoom-in button (not after) so that toggling this
        // button's visibility never shifts the zoom-in button's position: the
        // toolbar group is right-aligned, and both icon buttons share the same
        // width, so inserting "1:1" after "+" would make it land exactly on
        // top of the previous "+" position, turning a repeated zoom-in click
        // into an accidental reset (see GitHub issue #88).
        const button = createButton(documentRef, '1:1', 'file-viewer-web-icon-button', () => controller?.resetZoom());
        button.title = t('toolbar.zoomReset');
        button.setAttribute('aria-label', t('toolbar.zoomReset'));
        button.disabled = isFileViewerZoomButtonDisabled({
          action: 'canReset',
          availability,
          toolbarDisabled,
          zoomState,
        });
        group.appendChild(button);
      }

      if (availability.zoomIn) {
        const button = createButton(documentRef, '+', 'file-viewer-web-icon-button', () => controller?.zoomIn());
        button.title = t('toolbar.zoomIn');
        button.setAttribute('aria-label', t('toolbar.zoomIn'));
        button.disabled = isFileViewerZoomButtonDisabled({
          action: 'canZoomIn',
          availability,
          toolbarDisabled,
          zoomState,
        });
        group.appendChild(button);
      }

      if (group.childElementCount) {
        toolbarEl.appendChild(group);
      }
    };

    const appendToolbarButton = (
      visible: boolean | undefined,
      label: string,
      title: string,
      onClick: () => void | Promise<unknown>
    ) => {
      if (!visible) {
        return;
      }
      const button = createButton(documentRef, label, '', onClick);
      button.title = title;
      button.disabled = toolbarDisabled;
      toolbarEl.appendChild(button);
    };

    const appendThemeToolbar = () => {
      if (!visibleToolbar.theme) {
        return;
      }
      const currentTheme = resolveCurrentViewerTheme(options.theme);
      const title = currentTheme === 'dark'
        ? t('toolbar.themeToLight')
        : t('toolbar.themeToDark');
      const button = createButton(documentRef, '', 'file-viewer-web-icon-button file-viewer-web-theme-button', async () => {
        const previousViewState = instance.getViewState();
        const nextTheme = toggleFileViewerColorScheme(
          currentOptions.options?.theme,
          viewerColorSchemeQuery?.matches
        );
        currentOptions = {
          ...currentOptions,
          options: {
            ...(currentOptions.options || {}),
            theme: nextTheme,
          },
        };
        instance.updateOptions({ theme: nextTheme });
        applyViewerEvent({ type: 'theme-change', payload: nextTheme });
        if (currentSource) {
          const session = await loadSource(currentSource).catch(() => null);
          if (session && previousViewState) {
            await instance.applyViewState(previousViewState, {
              action: 'restore',
              source: 'api',
            });
          }
        }
      });
      addPart(button, 'theme-toggle');
      setThemeButtonIcon(button, currentTheme);
      button.title = title;
      button.setAttribute('aria-label', title);
      button.setAttribute('aria-pressed', String(currentTheme === 'dark'));
      button.disabled = toolbarDisabled;
      toolbarEl.appendChild(button);
    };

    resolveFileViewerToolbarOrder(toolbar).forEach(item => {
      if (item === 'search') {
        appendSearchToolbar();
      } else if (item === 'zoom') {
        appendZoomToolbar();
      } else if (item === 'download') {
        appendToolbarButton(
          visibleToolbar.download,
          t('toolbar.download'),
          t('toolbar.downloadTitle'),
          () => controller?.downloadOriginalFile()
        );
      } else if (item === 'print') {
        if (!visibleToolbar.print) {
          return;
        }
        const menu = documentRef.createElement('div');
        menu.className = 'file-viewer-web-print-menu';
        addPart(menu, 'toolbar-group');

        const trigger = createButton(documentRef, t('toolbar.print'), '', () => {
          menu.dataset.open = menu.dataset.open === 'true' ? 'false' : 'true';
        });
        trigger.title = t('toolbar.printTitle');
        trigger.setAttribute('aria-label', t('toolbar.printTitle'));
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.disabled = toolbarDisabled;

        const panel = documentRef.createElement('div');
        panel.className = 'file-viewer-web-print-menu-panel';
        panel.setAttribute('role', 'menu');

        const closeMenu = () => {
          menu.dataset.open = 'false';
        };

        const directButton = createButton(documentRef, t('toolbar.printDirect'), '', async () => {
          closeMenu();
          await controller?.printRenderedHtml();
        });
        directButton.title = t('toolbar.printTitle');
        directButton.setAttribute('role', 'menuitem');
        directButton.disabled = toolbarDisabled;

        const maskButton = createButton(documentRef, t('toolbar.printMask'), '', async () => {
          closeMenu();
          await controller?.printWithMask();
        });
        maskButton.title = t('toolbar.printMaskTitle');
        maskButton.setAttribute('role', 'menuitem');
        maskButton.disabled = toolbarDisabled;

        panel.append(directButton, maskButton);
        menu.append(trigger, panel);
        menu.addEventListener('focusout', event => {
          const next = event.relatedTarget as Node | null;
          if (!next || !menu.contains(next)) {
            closeMenu();
          }
        });
        toolbarEl.appendChild(menu);
      } else if (item === 'exportHtml') {
        appendToolbarButton(
          visibleToolbar.exportHtml,
          t('toolbar.exportHtml'),
          t('toolbar.exportHtmlTitle'),
          () => controller?.exportRenderedHtml()
        );
      } else if (item === 'theme') {
        appendThemeToolbar();
      }
    });
  };
  let refreshSystemThemeDocument: (() => Promise<void>) | null = null;
  const handleViewerColorSchemeChange = () => {
    if (normalizeFileViewerTheme(currentOptions.options?.theme) === 'system') {
      renderToolbar();
      void refreshSystemThemeDocument?.();
    }
  };
  const notifyState = (event?: ViewerEvent) => {
    const snapshot = snapshotState();
    renderToolbar();
    currentOptions.onStateChange?.(snapshot, event);
    listeners.forEach(listener => listener(snapshot, event));
  };
  const applyViewerEvent = (event: ViewerEvent) => {
    state.lastEvent = event;
    if (event.type === 'load-start') {
      state.loading = true;
      state.ready = false;
      state.error = null;
      state.lifecycle = event.payload;
      state.search = null;
      searchDraft = '';
    } else if (event.type === 'load-complete') {
      state.loading = false;
      state.ready = true;
      state.lifecycle = event.payload;
    } else if (event.type === 'unload-start') {
      state.loading = true;
      state.ready = false;
      state.lifecycle = event.payload;
    } else if (event.type === 'unload-complete') {
      state.loading = false;
      state.ready = false;
      state.lifecycle = event.payload;
    } else if (event.type === 'operation-availability-change') {
      state.availability = event.payload;
    } else if (event.type === 'search-change') {
      state.search = event.payload;
      searchDraft = event.payload.query;
    } else if (event.type === 'location-change') {
      state.location = event.payload;
    } else if (event.type === 'zoom-change') {
      state.zoom = event.payload;
    } else if (event.type === 'view-state-change') {
      state.viewState = event.payload.state;
    }
    currentOptions.onEvent?.(event);
    notifyState(event);
  };
  const instance: FileViewerInstance = createViewer(contentEl, {
    registry: coreOptions.registry,
    options: currentOptions.options,
    onEvent: applyViewerEvent,
  });
  viewerColorSchemeQuery?.addEventListener?.('change', handleViewerColorSchemeChange);
  renderToolbar();

  const cancel = () => {
    abortController?.abort();
    abortController = null;
  };

  const loadSource = async (nextSource: ViewerSourceInput): Promise<RendererSession | null> => {
    cancel();
    currentSource = nextSource;
    abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const controller = abortController;
    try {
      state.loading = true;
      state.error = null;
      notifyState();
      const resolvedSource = await resolveViewerLoadSource(nextSource, {
        fetchFile: coreOptions.fetchFile,
        signal: controller?.signal,
      });
      if (disposed || controller?.signal.aborted || abortController !== controller) {
        return null;
      }
      return await instance.load(resolvedSource);
    } catch (error) {
      if (isAbortError(error) && controller?.signal.aborted) {
        return null;
      }
      state.loading = false;
      state.ready = false;
      state.error = error;
      notifyState();
      coreOptions.onError?.(error, nextSource);
      throw error;
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
    }
  };

  refreshSystemThemeDocument = async () => {
    if (!currentSource) {
      return;
    }
    const previousViewState = instance.getViewState();
    const session = await loadSource(currentSource).catch(() => null);
    if (session && previousViewState) {
      await instance.applyViewState(previousViewState, {
        action: 'restore',
        source: 'api',
      });
    }
  };

  if (currentSource) {
    // The initial declarative source has no caller awaiting it. State changes
    // and the visible error surface remain authoritative without a global
    // unhandled-rejection event for an expected rendering failure.
    void loadSource(currentSource).catch(() => undefined);
  }

  controller = {
    container,
    async load(nextOptions) {
      if (disposed) return;
      currentOptions = nextOptions;
      instance.updateOptions(currentOptions.options || {});
      renderToolbar();
      if (hasSource(currentOptions)) {
        await loadSource(toViewerSourceInput(currentOptions));
      }
    },
    async update(nextOptions = {}) {
      if (disposed) return;
      const nextViewerOptions = nextOptions.options ?? currentOptions.options;
      const renderingOptionsChanged = hasViewerRenderingOptionsChanged(
        currentOptions.options,
        nextViewerOptions
      );
      currentOptions = {
        ...currentOptions,
        ...nextOptions,
        options: nextViewerOptions,
      };
      const nextSource = hasSource(currentOptions)
        ? toViewerSourceInput(currentOptions)
        : null;
      const sameSource = isSameViewerSource(currentSource, nextSource);
      const previousViewState = sameSource && renderingOptionsChanged
        ? instance.getViewState()
        : null;
      instance.updateOptions(currentOptions.options || {});
      renderToolbar();
      if (sameSource && !renderingOptionsChanged) {
        return;
      }
      if (nextSource) {
        const session = await loadSource(nextSource);
        if (session && previousViewState) {
          await instance.applyViewState(previousViewState, {
            action: 'restore',
            source: 'api',
          });
        }
      } else {
        currentSource = null;
        await instance.load({ filename: DEFAULT_FILE_VIEWER_SOURCE_FILENAME });
      }
    },
    async reload() {
      if (disposed) return;
      if (currentSource) {
        await loadSource(currentSource);
      }
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      cancel();
      viewerColorSchemeQuery?.removeEventListener?.('change', handleViewerColorSchemeChange);
      void instance.destroy('component-unmount');
      styleHandle.remove();
      renderRoot.replaceChildren();
      mountBoundary?.remove();
    },
    getApi() {
      return instance;
    },
    downloadOriginalFile() {
      return callApi(instance, api => api.download(), undefined);
    },
    printRenderedHtml(options?: FileViewerPrintOptions) {
      return callApi(instance, api => api.print(options), undefined);
    },
    printWithMask(options?: FileViewerPrintOptions) {
      return callApi(instance, api => api.printWithMask(options), undefined);
    },
    exportRenderedHtml() {
      return callApi(
        instance,
        api => api.exportHtml({ download: true }).then(() => undefined),
        undefined
      );
    },
    zoomIn() {
      return callApi(instance, api => api.zoomIn(), null);
    },
    zoomOut() {
      return callApi(instance, api => api.zoomOut(), null);
    },
    resetZoom() {
      return callApi(instance, api => api.resetZoom(), null);
    },
    fitToView(fit) {
      return callApi(instance, api => api.fitToView(fit), null);
    },
    getViewState() {
      return instance.getViewState();
    },
    applyViewState(state, options) {
      return callApi(instance, api => api.applyViewState(state, options), null);
    },
    searchDocument(query) {
      return callApi(instance, api => api.search(query), null);
    },
    clearDocumentSearch() {
      return callApi(instance, api => api.clearSearch(), null);
    },
    nextSearchResult() {
      return callApi(instance, api => api.nextSearchResult(), null);
    },
    previousSearchResult() {
      return callApi(instance, api => api.previousSearchResult(), null);
    },
    collectDocumentAnchors() {
      return callApi(instance, api => api.collectDocumentAnchors(), []);
    },
    scrollToAnchor(anchor) {
      return callApi(instance, api => api.scrollToDocumentAnchor(anchor), false);
    },
    scrollToLine(line) {
      return callApi(instance, api => api.scrollToLine(line), false);
    },
    getDocumentTextChunks() {
      return instance.getDocumentTextChunks();
    },
    getOperationAvailability() {
      return getToolbarAvailability();
    },
    getZoomState() {
      return instance.getZoomState();
    },
    getSearchState() {
      return instance.getSearchState();
    },
    getState() {
      return snapshotState();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshotState());
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return controller;
};
