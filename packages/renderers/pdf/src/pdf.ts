import {
  getDocument,
  GlobalWorkerOptions,
  PDFWorker as PdfJsWorker,
  PixelsPerInch,
  version as pdfJsVersion,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  EventBus,
  GenericL10n,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
} from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import {
  registerFileViewerSearchProvider,
  registerFileViewerZoomProvider,
  unregisterFileViewerSearchProvider,
  unregisterFileViewerZoomProvider,
  registerFileViewerViewStateProvider,
  unregisterFileViewerViewStateProvider,
  createFileViewerZoomChangeEmitter,
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerTranslator,
  buildPrintPageStyle,
  formatCssPixels,
  DEFAULT_PDF_RANGE_CHUNK_SIZE,
  resolveFileViewerLocale,
  resolveFileViewerFitScale,
  type FileRenderContext,
  type FileRenderExportOptions,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerPdfOptions,
  type FileViewerRenderedInstance,
  type FileViewerSearchOptions,
  type FileViewerSearchState,
  type FileViewerApplyViewStateOptions,
  type FileViewerViewState,
  type FileViewerViewStateChangeAction,
  type FileViewerViewStateChangeSource,
  type FileViewerZoomState,
  type FileViewerThumbnailCaptureOptions,
} from '@file-viewer/core';
import {
  DEFAULT_FILE_VIEWER_PDF_WORKER_PATH,
  resolveFileViewerPdfAssetUrls,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets';
import { pdfViewerStyle } from './pdfStyles.js';
import {
  collectMalformedIdentityFontNames,
  createPdfCjkFontFallbackManager,
  detectMalformedIdentityCjkFontFamilies,
  type PdfCjkFontFallbackManager,
  type PdfTextContent,
  type PdfTextContentPage,
} from './pdfFontFallback.js';
import {
  PDF_FIT_HORIZONTAL_PADDING,
  PDF_PAGE_BORDER_WIDTH,
  resolvePdfFitViewportSize,
} from './pdfFit.js';
import {
  createPdfBoundingBoxController,
} from './pdfBboxController.js';
import {
  clampPdfScale,
  normalizePdfRotation,
  resolvePdfViewStateUpdate,
} from './pdfViewState.js';
import {
  capturePdfJsWorkerGlobal,
  scopePdfJsWorkerMessageHandler,
  type PdfJsWorkerGlobal,
} from './pdfWorkerGlobal.js';
import { readPdfJsWorkerVersion } from './pdfWorkerVersion.js';
import { getFileViewerPdfIdentityFontRepair } from './optionalCapabilities.js';
import { isExpectedPdfJsDestroyConsoleError } from './pdfConsoleLifecycle.js';

export const DEFAULT_FILE_VIEWER_PDF_WORKER_URL =
  DEFAULT_FILE_VIEWER_PDF_WORKER_PATH;

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const SCALE_STEP = 0.1;
const PDF_EXPORT_MAX_PAGE_PIXELS = 8_000_000;
const PDF_WORKER_PROBE_TIMEOUT_MS = 1200;
const PDF_WORKER_VERSION_PROBE_BYTES = 4096;
const PDF_JS_DESTROY_CONSOLE_SUPPRESSION_MS = 1500;

type PdfWorkerHandlerModule = {
  WorkerMessageHandler: unknown;
};

type PdfWorkerProbeResult = {
  status: 'compatible' | 'incompatible' | 'unknown' | 'unavailable';
  workerVersion: string | null;
};

let bundledPdfWorkerModulePromise: Promise<PdfWorkerHandlerModule> | null = null;

const scopePdfJsRootVariables = (style: string) => style.replace(
  /:root(\s*\{)/g,
  ':root,\n.pdf-shell$1'
);

// PDF.js viewer CSS references image assets that are not shipped with the
// on-demand renderer chunk, so keep the preview self-contained and 404-free.
// Its root custom properties also need a local scope: a :root selector inside
// Shadow DOM does not match the document root or the custom-element host.
const normalizedPdfViewerStyle = `${scopePdfJsRootVariables(pdfViewerStyle)}
.pdf-shell{background:var(--file-viewer-render-surface-background,#edf2f7)}
.pdf-wrapper{background:var(--file-viewer-render-surface-background,#e8edf4)}
`
  .replace(/--page-border-image:\s*url\(images\/shadow\.png\)\s*9 9 repeat;/g, '--page-border-image:none;')
  .replace(/background:\s*url\("\.\/images\/loading-icon\.gif"\)\s*center no-repeat;/g, 'background:none;');

type PdfNavMode = 'pages' | 'outline';
type PdfLoadingTask = ReturnType<typeof getDocument>;
type PdfDocumentProxy = Awaited<PdfLoadingTask['promise']>;
type PdfWorkerInstance = InstanceType<typeof PdfJsWorker>;
type PdfResource = {
  loadingTask: PdfLoadingTask;
  worker: PdfWorkerInstance | null;
};
type PdfLoadingSource =
  | { data: ArrayBuffer | Uint8Array }
  | {
      url: string;
      rangeChunkSize: number;
      withCredentials: boolean;
    };
type PdfFontInspectionPage = PdfTextContentPage & {
  getOperatorList: () => Promise<unknown>;
  commonObjs: {
    get: (fontName: string) => { name?: string } | undefined;
  };
};
type ConsoleLike = {
  error: (...data: unknown[]) => void;
  warn: (...data: unknown[]) => void;
};
type PdfJsConsoleErrorSuppression = {
  originalError: ConsoleLike['error'];
  patchedError: ConsoleLike['error'];
  depth: number;
  restoreTimer: number | undefined;
};
type PdfJsConsoleWarningSuppression = {
  originalWarn: ConsoleLike['warn'];
  patchedWarn: ConsoleLike['warn'];
  depth: number;
  restoreTimer: number | undefined;
};
type PdfNavigationResult = void | PromiseLike<void>;
type PdfFindMatchesCount = { current: number; total: number };

interface PdfPageScrollAnchor {
  page: number;
  inPageRatio: number;
}

interface PdfOutlineItemView {
  id: string;
  title: string;
  dest: string | unknown[] | null;
  items: PdfOutlineItemView[];
  expanded: boolean;
}

interface PdfFlattenedOutlineItem {
  item: PdfOutlineItemView;
  depth: number;
}

const pdfJsConsoleErrorSuppressions = new WeakMap<ConsoleLike, PdfJsConsoleErrorSuppression>();
const pdfJsConsoleWarningSuppressions = new WeakMap<ConsoleLike, PdfJsConsoleWarningSuppression>();

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = `${normalizedPdfViewerStyle}
.pdf-toolbar,.pdf-toolbar-group,.pdf-icon-button,.pdf-scale-button{box-sizing:border-box}
.pdf-state[hidden],.pdf-nav-pane[hidden]{display:none!important}
.pdf-page-button--with-thumbnail{grid-template-columns:52px minmax(0,1fr);min-height:74px}
.pdf-page-thumb--thumbnail{width:46px;height:60px;overflow:hidden;background:#fff}
.pdf-page-thumb--thumbnail img{display:block;width:100%;height:100%;object-fit:contain}
.pdf-page-thumb--thumbnail span{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%}
.pdf-bbox-layer{position:absolute;inset:0;z-index:20;pointer-events:none;overflow:hidden}
.pdf-bbox-highlight{position:absolute;box-sizing:border-box;border:2px solid var(--pdf-bbox-color,#f97316);border-radius:3px;background:rgba(249,115,22,.16);background:color-mix(in srgb,var(--pdf-bbox-color,#f97316) 18%,transparent);box-shadow:0 0 0 1px rgba(255,255,255,.8),0 2px 8px rgba(15,23,42,.16)}
[data-viewer-theme='dark'] .pdf-shell{background:#101820;color:#e5eef8}
[data-viewer-theme='dark'] .pdf-toolbar,[data-viewer-theme='dark'] .pdf-nav-pane,[data-viewer-theme='dark'] .pdf-nav-head,[data-viewer-theme='dark'] .pdf-nav-tabs{border-color:rgba(148,163,184,.18);background:#111827;box-shadow:none}
[data-viewer-theme='dark'] .pdf-toolbar-group,[data-viewer-theme='dark'] .pdf-page-button,[data-viewer-theme='dark'] .pdf-outline-empty,[data-viewer-theme='dark'] .pdf-state{border-color:rgba(148,163,184,.18);background:#151f2b;color:#cbd5e1}
[data-viewer-theme='dark'] .pdf-icon-button,[data-viewer-theme='dark'] .pdf-scale-button,[data-viewer-theme='dark'] .pdf-page-meter,[data-viewer-theme='dark'] .pdf-rotation-meter,[data-viewer-theme='dark'] .pdf-outline-button{color:#cbd5e1}
[data-viewer-theme='dark'] .pdf-page-meter strong,[data-viewer-theme='dark'] .pdf-nav-head strong{color:#f8fafc}
[data-viewer-theme='dark'] .pdf-icon-button:hover:not(:disabled),[data-viewer-theme='dark'] .pdf-scale-button:hover,[data-viewer-theme='dark'] .pdf-icon-button--active,[data-viewer-theme='dark'] .pdf-nav-tabs button:hover,[data-viewer-theme='dark'] .pdf-nav-tabs button.active,[data-viewer-theme='dark'] .pdf-page-button:hover,[data-viewer-theme='dark'] .pdf-page-button--active,[data-viewer-theme='dark'] .pdf-outline-button:hover{border-color:rgba(94,234,212,.35);background:rgba(45,212,191,.12);color:#5eead4}
[data-viewer-theme='dark'] .pdf-wrapper{background:#101820}
[data-viewer-theme='dark'] .pdfViewer .page{color-scheme:only light;forced-color-adjust:none}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .pdf-shell{background:#101820;color:#e5eef8}[data-viewer-theme='system'] .pdf-toolbar,[data-viewer-theme='system'] .pdf-nav-pane,[data-viewer-theme='system'] .pdf-nav-head,[data-viewer-theme='system'] .pdf-nav-tabs{border-color:rgba(148,163,184,.18);background:#111827;box-shadow:none}[data-viewer-theme='system'] .pdf-toolbar-group,[data-viewer-theme='system'] .pdf-page-button,[data-viewer-theme='system'] .pdf-outline-empty,[data-viewer-theme='system'] .pdf-state{border-color:rgba(148,163,184,.18);background:#151f2b;color:#cbd5e1}[data-viewer-theme='system'] .pdf-icon-button,[data-viewer-theme='system'] .pdf-scale-button,[data-viewer-theme='system'] .pdf-page-meter,[data-viewer-theme='system'] .pdf-rotation-meter,[data-viewer-theme='system'] .pdf-outline-button{color:#cbd5e1}[data-viewer-theme='system'] .pdf-page-meter strong,[data-viewer-theme='system'] .pdf-nav-head strong{color:#f8fafc}[data-viewer-theme='system'] .pdf-icon-button:hover:not(:disabled),[data-viewer-theme='system'] .pdf-scale-button:hover,[data-viewer-theme='system'] .pdf-icon-button--active,[data-viewer-theme='system'] .pdf-nav-tabs button:hover,[data-viewer-theme='system'] .pdf-nav-tabs button.active,[data-viewer-theme='system'] .pdf-page-button:hover,[data-viewer-theme='system'] .pdf-page-button--active,[data-viewer-theme='system'] .pdf-outline-button:hover{border-color:rgba(94,234,212,.35);background:rgba(45,212,191,.12);color:#5eead4}[data-viewer-theme='system'] .pdf-wrapper{background:#101820}[data-viewer-theme='system'] .pdfViewer .page{color-scheme:only light;forced-color-adjust:none}}
@media (max-width:720px){
  .pdf-toolbar{flex-wrap:nowrap;gap:6px;min-height:44px;padding:5px 6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
  .pdf-toolbar::-webkit-scrollbar{display:none}
  .pdf-toolbar-group{flex:0 0 auto;height:32px;gap:4px;padding:0 4px;border-radius:7px}
  .pdf-toolbar-group--zoom{margin-left:0}
  .pdf-icon-button,.pdf-scale-button{height:26px;border-radius:5px}
  .pdf-icon-button{width:26px;font-size:16px}
  .pdf-scale-button{width:54px;font-size:12px}
  .pdf-page-meter{min-width:52px;font-size:12px}
  .pdf-page-meter strong{font-size:13px}
  .pdf-rotation-meter{min-width:30px;font-size:12px}
  .pdf-nav-pane{width:min(82vw,280px);max-width:calc(100% - 52px)}
  .pdfViewer{padding:12px 8px 22px}
}
`;
  return style;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const createButton = (
  documentRef: Document,
  className: string,
  title: string,
  label?: string
) => {
  const button = createElement(documentRef, 'button', className) as HTMLButtonElement;
  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', title);
  if (label !== undefined) {
    const labelNode = createElement(documentRef, 'span', undefined, label);
    labelNode.setAttribute('aria-hidden', 'true');
    button.append(labelNode);
  }
  return button;
};

const normalizeRotation = normalizePdfRotation;
const clampScale = (scale: number) => clampPdfScale(scale, MIN_SCALE, MAX_SCALE);

const createPdfSearchState = (query = ''): FileViewerSearchState => ({
  query,
  total: 0,
  currentIndex: -1,
  current: null,
  matches: [],
});

const escapeAttribute = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const waitForPaint = (view?: Window | null) => new Promise<void>(resolve => {
  if (view?.requestAnimationFrame) {
    view.requestAnimationFrame(() => resolve());
    return;
  }
  globalThis.setTimeout(resolve, 0);
});

const suppressPdfJsDestroyLifecycleErrors = (view: Window) => {
  const consoleRef = (
    (view as Window & { console?: ConsoleLike }).console ||
    globalThis.console
  ) as ConsoleLike | undefined;
  if (!consoleRef || typeof consoleRef.error !== 'function') {
    return () => {};
  }

  let suppression = pdfJsConsoleErrorSuppressions.get(consoleRef);
  if (!suppression) {
    const originalError = consoleRef.error;
    suppression = {
      originalError,
      patchedError: (...args: unknown[]) => {
        if (isExpectedPdfJsDestroyConsoleError(args)) {
          return;
        }
        return originalError.apply(consoleRef, args);
      },
      depth: 0,
      restoreTimer: undefined,
    };
    pdfJsConsoleErrorSuppressions.set(consoleRef, suppression);
    consoleRef.error = suppression.patchedError;
  } else if (suppression.restoreTimer !== undefined) {
    view.clearTimeout(suppression.restoreTimer);
    suppression.restoreTimer = undefined;
  }

  suppression.depth += 1;
  let restored = false;
  return () => {
    if (restored || !suppression) {
      return;
    }
    restored = true;
    suppression.depth = Math.max(0, suppression.depth - 1);
    if (suppression.depth > 0) {
      return;
    }

    suppression.restoreTimer = view.setTimeout(() => {
      if (!suppression || suppression.depth > 0) {
        return;
      }
      if (consoleRef.error === suppression.patchedError) {
        consoleRef.error = suppression.originalError;
      }
      pdfJsConsoleErrorSuppressions.delete(consoleRef);
      suppression.restoreTimer = undefined;
    }, PDF_JS_DESTROY_CONSOLE_SUPPRESSION_MS);
  };
};

const isPdfJsMissingSystemFontWarning = (args: unknown[]) => {
  const [message] = args;
  return typeof message === 'string' &&
    /^(?:Warning:\s*)?Cannot load system font: .+installing it could help to improve PDF rendering\.$/.test(message);
};

const suppressPdfJsMissingSystemFontWarnings = (view: Window) => {
  const consoleRef = (
    (view as Window & { console?: ConsoleLike }).console ||
    globalThis.console
  ) as ConsoleLike | undefined;
  if (!consoleRef || typeof consoleRef.warn !== 'function') {
    return () => {};
  }

  let suppression = pdfJsConsoleWarningSuppressions.get(consoleRef);
  if (!suppression) {
    const originalWarn = consoleRef.warn;
    suppression = {
      originalWarn,
      patchedWarn: (...args: unknown[]) => {
        if (isPdfJsMissingSystemFontWarning(args)) {
          return;
        }
        return originalWarn.apply(consoleRef, args);
      },
      depth: 0,
      restoreTimer: undefined,
    };
    pdfJsConsoleWarningSuppressions.set(consoleRef, suppression);
    consoleRef.warn = suppression.patchedWarn;
  } else if (suppression.restoreTimer !== undefined) {
    view.clearTimeout(suppression.restoreTimer);
    suppression.restoreTimer = undefined;
  }

  suppression.depth += 1;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    const current = pdfJsConsoleWarningSuppressions.get(consoleRef);
    if (!current) {
      return;
    }
    current.depth = Math.max(0, current.depth - 1);
    if (current.depth || current.restoreTimer !== undefined) {
      return;
    }
    current.restoreTimer = view.setTimeout(() => {
      current.restoreTimer = undefined;
      if (current.depth || consoleRef.warn !== current.patchedWarn) {
        return;
      }
      consoleRef.warn = current.originalWarn;
      pdfJsConsoleWarningSuppressions.delete(consoleRef);
    }, PDF_JS_DESTROY_CONSOLE_SUPPRESSION_MS);
  };
};

const isConfiguredUrl = (value: string | URL | undefined) => {
  return value !== undefined && value !== null && String(value).trim().length > 0;
};

const isJavaScriptLikeResponse = (response: Response) => {
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  return !contentType ||
    contentType.includes('javascript') ||
    contentType.includes('ecmascript') ||
    contentType.includes('application/octet-stream') ||
    contentType.includes('text/plain');
};

const readResponsePrefix = async (
  response: Response,
  maximumBytes = PDF_WORKER_VERSION_PROBE_BYTES
) => {
  // Consume the response even when a server ignores Range. Cancelling after the
  // prefix creates a browser-level ERR_ABORTED event that strict hosts treat as
  // a failed asset request, despite the compatibility probe succeeding.
  return (await response.text()).slice(0, maximumBytes);
};

const loadBundledPdfWorkerModule = async () => {
  bundledPdfWorkerModulePromise ??= import('pdfjs-dist/legacy/build/pdf.worker.mjs') as Promise<PdfWorkerHandlerModule>;
  return bundledPdfWorkerModulePromise;
};

const createBundledPdfFakeWorker = async () => {
  const workerGlobal = globalThis as PdfJsWorkerGlobal;
  // pdf.worker.mjs assigns globalThis.pdfjsWorker as a module side effect, so
  // capture the host namespace before importing it and restore that snapshot.
  const hostWorkerGlobal = capturePdfJsWorkerGlobal(workerGlobal);
  const workerModule = await loadBundledPdfWorkerModule();
  const workerHandlerScope = scopePdfJsWorkerMessageHandler(
    workerGlobal,
    workerModule.WorkerMessageHandler,
    hostWorkerGlobal
  );
  try {
    const worker = new PdfJsWorker({
      name: 'file-viewer-pdf-worker',
    } as ConstructorParameters<typeof PdfJsWorker>[0] & { name: string }) as PdfWorkerInstance;
    await worker.promise;
    return worker;
  } finally {
    workerHandlerScope.restore();
  }
};

const resolvePdfWorkerUrl = (
  options: FileViewerPdfOptions | undefined,
  documentBaseUrl?: string
) => {
  return resolveFileViewerPdfAssetUrls(options, documentBaseUrl).workerUrl;
};

const buildOutlineItems = (
  items: Array<{ title?: string; dest?: string | unknown[] | null; items?: unknown[] }>,
  prefix = 'outline',
  getFallbackTitle: (index: number) => string = index => `Outline ${index + 1}`
) => items.map((item, index): PdfOutlineItemView => {
  const id = `${prefix}-${index}`;
  const children = Array.isArray(item.items)
    ? buildOutlineItems(item.items as Array<{ title?: string; dest?: string | unknown[] | null; items?: unknown[] }>, id, getFallbackTitle)
    : [];
  return {
    id,
    title: item.title || getFallbackTitle(index),
    dest: item.dest || null,
    items: children,
    expanded: index < 4,
  };
});

export default async function renderPdf(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument || document;
  const targetWindow = documentRef.defaultView || (typeof window !== 'undefined' ? window : null);
  const t = createFileViewerTranslator(context?.options);
  const resolvedLocale = resolveFileViewerLocale(context?.options);
  if (!targetWindow) {
    throw new Error(t('pdf.error.browserWindow'));
  }
  const options = context?.options?.pdf;
  const pdfRuntimeAssetBaseUrl = resolveFileViewerRuntimeAssetBaseUrl(documentRef);
  const cjkFontFallbackEnabled = options?.cjkFontFallback !== false;
  const identityFontRepairEnabled = options?.identityFontRepair !== false;
  const fontInspectionEnabled = cjkFontFallbackEnabled || identityFontRepairEnabled;
  const initialViewState = options?.initialViewState || context?.options?.initialViewState || null;
  const navigationEnabled = options?.navigation !== false;
  const toolbarVisible = options?.toolbar !== false;
  const thumbnailsEnabled = options?.thumbnails === true;
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  const viewStateEmitter = createFileViewerViewStateChangeEmitter();
  const isCompactViewport = () => {
    const width = target.clientWidth || targetWindow.innerWidth || 0;
    return width > 0 && width <= 720;
  };

  let navVisible = options?.navigation === false
    ? false
    : typeof options?.defaultNavigationVisible === 'boolean'
      ? options.defaultNavigationVisible
      : !isCompactViewport();
  let navMode: PdfNavMode = 'pages';
  let loadStatus: 'loading' | 'ready' | 'error' = 'loading';
  let errorMessage = '';
  let currentPage = 1;
  let pageCount = 0;
  let currentScale = 1;
  let autoFitWidth = true;
  let currentRotation = normalizeRotation(options?.rotation ?? 0);
  let outlineItems: PdfOutlineItemView[] = [];
  let resizeObserver: ResizeObserver | null = null;
  let thumbnailObserver: IntersectionObserver | null = null;
  let fitFrame = 0;
  let pageDimensionFrame = 0;
  let destroyed = false;
  let loadVersion = 0;
  let viewStateApplyVersion = 0;
  let activeViewStateApplyVersion = 0;
  let pendingInitialViewState: FileViewerViewState | null = initialViewState;
  let pendingFitRequest: FileViewerFitRequest | null = null;
  let activeFitRequest: FileViewerFitRequest | null = null;
  let suppressScrollEventUntil = 0;
  let userScrollIntentUntil = 0;
  let scrollStateFrame = 0;
  let rotationOperationVersion = 0;
  let pendingUserRotationAnchor: PdfPageScrollAnchor | null = null;
  let zoomOperationVersion = 0;
  let pendingUserZoomAnchor: PdfPageScrollAnchor | null = null;
  let pdfSearchState = createPdfSearchState();
  let pdfMatchesCount: PdfFindMatchesCount = { current: 0, total: 0 };
  let pdfSearchOptions: FileViewerSearchOptions | undefined;
  let pdfSearchWaiters: Array<{
    resolve: (state: FileViewerSearchState) => void;
    timer: number;
  }> = [];
  const pdfThumbnails = new Map<number, string>();
  const pendingPdfThumbnails = new Set<number>();
  const pdfCjkFontFallbackPageLoads = new Map<number, Promise<boolean>>();
  const pdfCjkFontFallbackRenderHandledPages = new Set<number>();
  let pdfCjkFontFallbackManager: PdfCjkFontFallbackManager | null = null;
  let restorePdfJsMissingSystemFontWarnings = () => {};

  const pdfContext = {
    viewer: null as PDFViewer | null,
    linkService: null as PDFLinkService | null,
    eventBus: null as EventBus | null,
    findController: null as PDFFindController | null,
    resource: null as PdfResource | null,
    document: null as PdfDocumentProxy | null,
    search: '',
  };

  const ensurePdfPageCjkFontFallback = (
    pageNumber: number,
    page: PdfTextContentPage
  ) => {
    if (!pdfCjkFontFallbackManager) {
      return Promise.resolve(false);
    }
    let pending = pdfCjkFontFallbackPageLoads.get(pageNumber);
    if (!pending) {
      pending = pdfCjkFontFallbackManager.ensurePage(page);
      pdfCjkFontFallbackPageLoads.set(pageNumber, pending);
    }
    return pending;
  };

  const root = createElement(documentRef, 'div', 'pdf-shell');
  root.dataset.viewerSearchProvider = 'pdf';
  root.dataset.viewerZoomProvider = 'pdf';

  const toolbar = createElement(documentRef, 'div', 'pdf-toolbar');
  const navToggleButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.toggleNavigation'));
  navToggleButton.setAttribute('aria-pressed', String(navVisible));
  navToggleButton.append(createElement(documentRef, 'span', 'pdf-panel-icon'));

  const pageGroup = createElement(documentRef, 'div', 'pdf-toolbar-group');
  const previousPageButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.previousPage'), '‹');
  const pageMeter = createElement(documentRef, 'span', 'pdf-page-meter');
  const pageMeterCurrent = createElement(documentRef, 'strong', undefined, '1');
  const pageMeterTotal = createElement(documentRef, 'span', undefined, '/ -');
  pageMeter.append(pageMeterCurrent, pageMeterTotal);
  const nextPageButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.nextPage'), '›');
  pageGroup.append(previousPageButton, pageMeter, nextPageButton);

  const zoomGroup = createElement(documentRef, 'div', 'pdf-toolbar-group pdf-toolbar-group--zoom');
  const zoomOutButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.zoomOut'), '−');
  const scaleButton = createElement(documentRef, 'button', 'pdf-scale-button', '100%') as HTMLButtonElement;
  scaleButton.type = 'button';
  scaleButton.title = t('pdf.toolbar.fitWidth');
  scaleButton.setAttribute('aria-label', t('pdf.toolbar.fitWidth'));
  const zoomInButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.zoomIn'), '+');
  zoomGroup.append(zoomOutButton, scaleButton, zoomInButton);

  const rotateGroup = createElement(documentRef, 'div', 'pdf-toolbar-group pdf-toolbar-group--rotate');
  const rotateLeftButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.rotateLeft'), '↺');
  const rotationMeter = createElement(documentRef, 'span', 'pdf-rotation-meter', `${currentRotation}°`);
  const rotateRightButton = createButton(documentRef, 'pdf-icon-button', t('pdf.toolbar.rotateRight'), '↻');
  rotateGroup.append(rotateLeftButton, rotationMeter, rotateRightButton);

  if (navigationEnabled) {
    toolbar.append(navToggleButton);
  }
  toolbar.append(pageGroup, zoomGroup, rotateGroup);

  const content = createElement(documentRef, 'div', 'pdf-content');
  const navPane = createElement(documentRef, 'aside', 'pdf-nav-pane');
  const navHead = createElement(documentRef, 'div', 'pdf-nav-head');
  const navTitle = createElement(documentRef, 'span', undefined, t('pdf.nav.pagesTitle'));
  const navCount = createElement(documentRef, 'strong', undefined, t('pdf.nav.pageCount', { count: 0 }));
  navHead.append(navTitle, navCount);

  const navTabs = createElement(documentRef, 'div', 'pdf-nav-tabs');
  navTabs.setAttribute('role', 'tablist');
  navTabs.setAttribute('aria-label', t('pdf.nav.typeLabel'));
  const pagesTab = createButton(documentRef, '', t('pdf.nav.pagesTab')) as HTMLButtonElement;
  const outlineTab = createButton(documentRef, '', t('pdf.nav.outlineTab')) as HTMLButtonElement;
  pagesTab.textContent = t('pdf.nav.pagesTab');
  outlineTab.textContent = t('pdf.nav.outlineTab');
  pagesTab.setAttribute('role', 'tab');
  outlineTab.setAttribute('role', 'tab');
  navTabs.append(pagesTab, outlineTab);

  const navList = createElement(documentRef, 'div');
  navPane.append(navHead, navTabs, navList);

  const viewport = createElement(documentRef, 'div', 'pdf-viewport');
  const container = createElement(documentRef, 'div', 'pdf-wrapper');
  container.dataset.viewerScrollContainer = 'true';
  const pdfViewerRoot = createElement(documentRef, 'div', 'pdfViewer');
  const stateNode = createElement(documentRef, 'div', 'pdf-state', t('pdf.state.loading'));
  container.append(pdfViewerRoot, stateNode);
  viewport.append(container);
  content.append(navPane, viewport);
  root.append(content);
  if (toolbarVisible) {
    root.insertBefore(toolbar, content);
  }
  target.replaceChildren(createStyle(documentRef), root);

  const scaleText = () => `${Math.round(currentScale * 100)}%`;
  const rotationText = () => `${currentRotation}°`;
  const canGoPrevious = () => currentPage > 1;
  const canGoNext = () => currentPage < pageCount;
  const canZoomOut = () => currentScale > MIN_SCALE;
  const canZoomIn = () => currentScale < MAX_SCALE;
  const outlineCount = () => {
    const countItems = (items: PdfOutlineItemView[]): number => (
      items.reduce((total, item) => total + 1 + countItems(item.items), 0)
    );
    return countItems(outlineItems);
  };
  const flattenedOutlineItems = () => {
    const result: PdfFlattenedOutlineItem[] = [];
    const visit = (items: PdfOutlineItemView[], depth: number) => {
      items.forEach(item => {
        result.push({ item, depth });
        if (item.expanded && item.items.length) {
          visit(item.items, depth + 1);
        }
      });
    };
    visit(outlineItems, 0);
    return result;
  };

  const navScrollTopByMode: Record<PdfNavMode, number> = {
    pages: 0,
    outline: 0,
  };

  const renderNavList = () => {
    if (navList.classList.contains('pdf-page-list')) {
      navScrollTopByMode.pages = navList.scrollTop;
    } else if (navList.classList.contains('pdf-outline-list')) {
      navScrollTopByMode.outline = navList.scrollTop;
    }
    navList.replaceChildren();
    navList.className = navMode === 'pages' ? 'pdf-page-list' : 'pdf-outline-list';

    const restoreNavScrollTop = () => {
      navList.scrollTop = navScrollTopByMode[navMode];
    };

    if (navMode === 'pages') {
      thumbnailObserver?.disconnect();
      for (let page = 1; page <= pageCount; page += 1) {
        const button = createElement(documentRef, 'button', 'pdf-page-button') as HTMLButtonElement;
        button.type = 'button';
        button.classList.toggle('pdf-page-button--active', page === currentPage);
        button.classList.toggle('pdf-page-button--with-thumbnail', thumbnailsEnabled);
        const thumb = createElement(documentRef, 'span', 'pdf-page-thumb');
        if (thumbnailsEnabled) {
          thumb.classList.add('pdf-page-thumb--thumbnail');
          queuePdfThumbnail(page, thumb);
        } else {
          thumb.textContent = String(page);
        }
        button.append(
          thumb,
          createElement(documentRef, 'span', 'pdf-page-label', t('pdf.nav.pageLabel', { page }))
        );
        button.addEventListener('click', () => goToPage(page, 'page-click', 'user'));
        navList.append(button);
      }
      restoreNavScrollTop();
      return;
    }

    const entries = flattenedOutlineItems();
    entries.forEach(entry => {
      const button = createElement(documentRef, 'button', 'pdf-outline-button') as HTMLButtonElement;
      button.type = 'button';
      button.style.setProperty('--outline-depth', String(entry.depth));
      const toggle = createElement(documentRef, 'span', 'pdf-outline-toggle');
      toggle.classList.toggle('pdf-outline-toggle--open', entry.item.expanded);
      toggle.classList.toggle('pdf-outline-toggle--empty', !entry.item.items.length);
      toggle.setAttribute('aria-hidden', 'true');
      toggle.addEventListener('click', event => {
        event.stopPropagation();
        toggleOutlineItem(entry.item);
      });
      button.append(toggle, createElement(documentRef, 'span', 'pdf-outline-title', entry.item.title));
      button.addEventListener('click', () => goToOutlineItem(entry.item));
      navList.append(button);
    });

    if (!entries.length) {
      navList.append(createElement(documentRef, 'div', 'pdf-outline-empty', t('pdf.nav.outlineEmpty')));
    }
    restoreNavScrollTop();
  };

  const paintPdfThumbnail = (pageNumber: number, thumb: HTMLElement) => {
    const imageUrl = pdfThumbnails.get(pageNumber);
    thumb.dataset.pdfThumbnailPage = String(pageNumber);
    if (!imageUrl) {
      thumb.replaceChildren(createElement(documentRef, 'span', undefined, String(pageNumber)));
      return false;
    }

    const image = documentRef.createElement('img');
    image.src = imageUrl;
    image.alt = t('pdf.thumbnail.alt', { page: pageNumber });
    image.loading = 'lazy';
    thumb.replaceChildren(image);
    return true;
  };

  const renderPdfThumbnail = async (pageNumber: number) => {
    const pdfDocument = pdfContext.document;
    if (!pdfDocument || pdfThumbnails.has(pageNumber) || pendingPdfThumbnails.has(pageNumber)) {
      return;
    }

    pendingPdfThumbnails.add(pageNumber);
    try {
      const page = await pdfDocument.getPage(pageNumber);
      if (destroyed || pdfContext.document !== pdfDocument) {
        return;
      }
      await ensurePdfPageCjkFontFallback(
        pageNumber,
        page as unknown as PdfTextContentPage
      );

      const baseViewport = page.getViewport({
        scale: PixelsPerInch.PDF_TO_CSS_UNITS,
        rotation: currentRotation,
      });
      const deviceScale = Math.min(2, Math.max(1, targetWindow.devicePixelRatio || 1));
      const thumbnailWidth = 46;
      const ratio = Math.min(1, thumbnailWidth / Math.max(baseViewport.width, 1));
      const renderViewport = page.getViewport({
        scale: PixelsPerInch.PDF_TO_CSS_UNITS * ratio * deviceScale,
        rotation: currentRotation,
      });
      const canvas = documentRef.createElement('canvas');
      const canvasContext = canvas.getContext('2d');
      if (!canvasContext) {
        return;
      }

      canvas.width = Math.max(1, Math.ceil(renderViewport.width));
      canvas.height = Math.max(1, Math.ceil(renderViewport.height));
      await page.render({ canvas, canvasContext, viewport: renderViewport }).promise;
      if (destroyed || pdfContext.document !== pdfDocument) {
        return;
      }

      pdfThumbnails.set(pageNumber, canvas.toDataURL('image/png'));
      canvas.width = 0;
      canvas.height = 0;
      (page as { cleanup?: () => void }).cleanup?.();
      navList
        .querySelectorAll<HTMLElement>(`.pdf-page-thumb--thumbnail[data-pdf-thumbnail-page="${pageNumber}"]`)
        .forEach(thumb => paintPdfThumbnail(pageNumber, thumb));
    } catch (error) {
      console.warn('[file-viewer] PDF 缩略图渲染失败。', error);
    } finally {
      pendingPdfThumbnails.delete(pageNumber);
    }
  };

  const renderFirstPageThumbnail = async (
    captureOptions: FileViewerThumbnailCaptureOptions
  ) => {
    const pdfDocument = pdfContext.document;
    if (!pdfDocument) {
      return null;
    }
    if (captureOptions.signal?.aborted) {
      throw captureOptions.signal.reason;
    }
    const page = await pdfDocument.getPage(1);
    await ensurePdfPageCjkFontFallback(1, page as unknown as PdfTextContentPage);
    const baseViewport = page.getViewport({ scale: 1, rotation: currentRotation });
    const scale = Math.max(0.1, Math.min(
      captureOptions.width / Math.max(baseViewport.width, 1),
      captureOptions.height / Math.max(baseViewport.height, 1)
    ));
    const viewport = page.getViewport({ scale, rotation: currentRotation });
    const canvas = documentRef.createElement('canvas');
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      return null;
    }
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const renderTask = page.render({ canvas, canvasContext, viewport });
    const cancelRender = () => renderTask.cancel();
    captureOptions.signal?.addEventListener('abort', cancelRender, { once: true });
    try {
      await renderTask.promise;
      if (captureOptions.signal?.aborted) {
        throw captureOptions.signal.reason;
      }
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    } catch (error) {
      if (captureOptions.signal?.aborted) {
        throw captureOptions.signal.reason;
      }
      throw error;
    } finally {
      captureOptions.signal?.removeEventListener('abort', cancelRender);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup?.();
    }
  };
  context?.registerThumbnailAdapter?.({
    beforeCapture: async ({ signal }) => {
      while (loadStatus === 'loading' && !destroyed) {
        if (signal?.aborted) {
          throw signal.reason;
        }
        await new Promise(resolve => targetWindow.setTimeout(resolve, 16));
      }
      if (loadStatus === 'error') {
        throw new Error(errorMessage || t('pdf.error.loadFailed'));
      }
    },
    capture: renderFirstPageThumbnail,
  });

  const ensureThumbnailObserver = () => {
    if (!thumbnailsEnabled || thumbnailObserver || typeof targetWindow.IntersectionObserver !== 'function') {
      return;
    }

    thumbnailObserver = new targetWindow.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          return;
        }
        const targetElement = entry.target as HTMLElement;
        const pageNumber = Number(targetElement.dataset.pdfThumbnailPage || '0');
        thumbnailObserver?.unobserve(targetElement);
        if (pageNumber > 0) {
          void renderPdfThumbnail(pageNumber);
        }
      });
    }, {
      root: navList,
      rootMargin: '96px 0px',
    });
  };

  const queuePdfThumbnail = (pageNumber: number, thumb: HTMLElement) => {
    if (paintPdfThumbnail(pageNumber, thumb)) {
      return;
    }

    ensureThumbnailObserver();
    if (thumbnailObserver) {
      thumbnailObserver.observe(thumb);
      return;
    }
    void renderPdfThumbnail(pageNumber);
  };

  const syncUi = () => {
    root.classList.toggle('pdf-shell--compact', isCompactViewport());
    root.classList.toggle('pdf-shell--nav-hidden', !navigationEnabled || !navVisible);
    root.classList.toggle('pdf-shell--toolbar-hidden', !toolbarVisible);
    navToggleButton.classList.toggle('pdf-icon-button--active', navVisible);
    navToggleButton.setAttribute('aria-pressed', String(navVisible));
    navPane.hidden = !navigationEnabled || !navVisible;
    pagesTab.classList.toggle('active', navMode === 'pages');
    outlineTab.classList.toggle('active', navMode === 'outline');
    pagesTab.setAttribute('aria-selected', navMode === 'pages' ? 'true' : 'false');
    outlineTab.setAttribute('aria-selected', navMode === 'outline' ? 'true' : 'false');
    navTitle.textContent = navMode === 'pages' ? t('pdf.nav.pagesTitle') : t('pdf.nav.outlineTitle');
    navCount.textContent = navMode === 'pages'
      ? t('pdf.nav.pageCount', { count: pageCount })
      : t('pdf.nav.itemCount', { count: outlineCount() });
    pageMeterCurrent.textContent = String(currentPage);
    pageMeterTotal.textContent = `/ ${pageCount || '-'}`;
    scaleButton.textContent = scaleText();
    rotationMeter.textContent = rotationText();
    previousPageButton.disabled = !canGoPrevious();
    nextPageButton.disabled = !canGoNext();
    zoomOutButton.disabled = !canZoomOut();
    zoomInButton.disabled = !canZoomIn();
    stateNode.hidden = loadStatus === 'ready';
    stateNode.classList.toggle('pdf-state--error', loadStatus === 'error');
    stateNode.textContent = loadStatus === 'error' ? errorMessage : t('pdf.state.loading');
    renderNavList();
  };

  const writeLegacyCompatiblePageDimensions = () => {
    const pdfViewer = pdfContext.viewer;
    if (!pdfViewer) {
      return;
    }

    const totalPages = pageCount || (pdfViewer as { pagesCount?: number }).pagesCount || 0;
    for (let index = 0; index < totalPages; index += 1) {
      const pageView = pdfViewer.getPageView(index) as {
        div?: HTMLElement;
        viewport?: { width?: number; height?: number };
      } | null;
      const pageElement = pageView?.div ||
        pdfViewerRoot.querySelector<HTMLElement>(`.page[data-page-number="${index + 1}"]`);
      const width = pageView?.viewport?.width;
      const height = pageView?.viewport?.height;
      if (!pageElement || !Number.isFinite(width) || !Number.isFinite(height)) {
        continue;
      }

      pageElement.style.setProperty('width', `${Math.max(1, Math.round(width || 0))}px`, 'important');
      pageElement.style.setProperty('height', `${Math.max(1, Math.round(height || 0))}px`, 'important');
    }
  };

  const scheduleLegacyPageDimensionPatch = () => {
    targetWindow.cancelAnimationFrame(pageDimensionFrame);
    pageDimensionFrame = targetWindow.requestAnimationFrame(() => {
      writeLegacyCompatiblePageDimensions();
      targetWindow.requestAnimationFrame(writeLegacyCompatiblePageDimensions);
    });
  };

  const probeResolvedPdfWorkerUrl = async (
    workerUrl: string
  ): Promise<PdfWorkerProbeResult> => {
    const fetcher = targetWindow.fetch?.bind(targetWindow) || globalThis.fetch?.bind(globalThis);
    const AbortControllerCtor = targetWindow.AbortController || globalThis.AbortController;
    if (!fetcher || !AbortControllerCtor) {
      return { status: 'unavailable', workerVersion: null };
    }

    try {
      const parsed = new URL(workerUrl, documentRef.baseURI || targetWindow.location.href);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { status: 'unavailable', workerVersion: null };
      }
    } catch {
      return { status: 'unavailable', workerVersion: null };
    }

    const controller = new AbortControllerCtor();
    const timer = targetWindow.setTimeout(() => controller.abort(), PDF_WORKER_PROBE_TIMEOUT_MS);
    try {
      const response = await fetcher(workerUrl, {
        method: 'GET',
        // A successful range probe must never seed the HTTP cache for the
        // subsequent module Worker request. Some static servers correctly
        // return 206 here, and Chromium can otherwise reuse that partial body
        // as the Worker module, which fails with "Invalid or unexpected token".
        cache: 'no-store',
        headers: {
          Range: `bytes=0-${PDF_WORKER_VERSION_PROBE_BYTES - 1}`,
        },
        signal: controller.signal,
      });
      if ((!response.ok && response.status !== 206) || !isJavaScriptLikeResponse(response)) {
        return { status: 'unavailable', workerVersion: null };
      }
      const workerVersion = readPdfJsWorkerVersion(await readResponsePrefix(response));
      if (!workerVersion) {
        return { status: 'unknown', workerVersion: null };
      }
      return {
        status: workerVersion === pdfJsVersion ? 'compatible' : 'incompatible',
        workerVersion,
      };
    } catch {
      return { status: 'unavailable', workerVersion: null };
    } finally {
      targetWindow.clearTimeout(timer);
    }
  };

  const createPdfWorker = async () => {
    const workerUrl = resolvePdfWorkerUrl(options, pdfRuntimeAssetBaseUrl);
    const workerGlobal = globalThis as PdfJsWorkerGlobal;
    if (workerGlobal.pdfjsWorker?.WorkerMessageHandler) {
      try {
        // PDF.js prefers a preinstalled main-thread handler over workerSrc.
        // Scope our bundled handler only until this PDFWorker captures it, so
        // a vue-office/PDF.js 3.x global cannot hijack this renderer and the
        // host can still use its original handler afterwards.
        return await createBundledPdfFakeWorker();
      } catch (error) {
        console.warn('[file-viewer] PDF.js 全局 Worker handler 隔离失败，继续探测静态 Worker。', error);
      }
    }

    const hasExplicitWorkerUrl = isConfiguredUrl(options?.workerUrl);
    const workerProbe = targetWindow?.Worker
      ? await probeResolvedPdfWorkerUrl(workerUrl)
      : { status: 'unavailable' as const, workerVersion: null };
    if (workerProbe.status === 'incompatible') {
      console.warn(
        `[file-viewer] PDF Worker ${workerProbe.workerVersion} 与 PDF.js API ${pdfJsVersion} 不匹配，` +
        '改用包内同版本 PDF.js handler。'
      );
    }
    const shouldUseRealWorker = !!targetWindow?.Worker && (
      workerProbe.status === 'compatible' ||
      (hasExplicitWorkerUrl && workerProbe.status !== 'incompatible')
    );

    if (shouldUseRealWorker) {
      GlobalWorkerOptions.workerSrc = workerUrl;
      try {
        const worker = new PdfJsWorker({
          name: 'file-viewer-pdf-worker',
        } as ConstructorParameters<typeof PdfJsWorker>[0] & { name: string }) as PdfWorkerInstance;
        await worker.promise;
        return worker;
      } catch (error) {
        console.warn('[file-viewer] PDF Worker 初始化失败，改用包内 PDF.js 兜底。', error);
      }
    }

    try {
      return await createBundledPdfFakeWorker();
    } catch (error) {
      console.warn('[file-viewer] PDF.js 包内 worker 兜底加载失败，继续使用 PDF.js 默认策略。', error);
      GlobalWorkerOptions.workerSrc = workerUrl;
    }
    return null;
  };

  const resolvePdfSearchWaiters = (state: FileViewerSearchState) => {
    const waiters = pdfSearchWaiters;
    pdfSearchWaiters = [];
    waiters.forEach(waiter => {
      targetWindow.clearTimeout(waiter.timer);
      waiter.resolve(state);
    });
  };

  const readPdfMatchesCount = (): PdfFindMatchesCount => {
    const findController = pdfContext.findController;
    if (!findController) {
      return { current: 0, total: 0 };
    }

    const pageMatches = findController.pageMatches || [];
    const selected = findController.selected;
    const total = pageMatches.reduce((sum: number, matches: number[] | undefined) => sum + (matches?.length || 0), 0);
    let current = 0;
    if (selected && selected.pageIdx >= 0 && selected.matchIdx >= 0 && total > 0) {
      for (let index = 0; index < selected.pageIdx; index += 1) {
        current += pageMatches[index]?.length || 0;
      }
      current += selected.matchIdx + 1;
    }
    return { current, total };
  };

  const commitPdfSearchState = (
    matchesCount: PdfFindMatchesCount = readPdfMatchesCount(),
    query = pdfContext.search,
    shouldResolve = false
  ) => {
    pdfMatchesCount = matchesCount;
    const current = Math.max(0, matchesCount.current || 0);
    const total = Math.max(0, matchesCount.total || 0);
    const selected = pdfContext.findController?.selected;
    const page = selected && selected.pageIdx >= 0 ? selected.pageIdx + 1 : undefined;
    pdfSearchState = {
      query,
      total,
      currentIndex: current > 0 ? current - 1 : -1,
      current: current > 0
        ? {
            id: `pdf-search-match-${current}`,
            index: current - 1,
            text: query,
            anchor: null,
            page,
          }
        : null,
      matches: [],
    };

    if (shouldResolve) {
      resolvePdfSearchWaiters(pdfSearchState);
    }
    return pdfSearchState;
  };

  const waitForPdfSearchState = (query: string) => new Promise<FileViewerSearchState>(resolve => {
    const timer = targetWindow.setTimeout(() => {
      const waiterIndex = pdfSearchWaiters.findIndex(waiter => waiter.resolve === resolve);
      if (waiterIndex >= 0) {
        pdfSearchWaiters.splice(waiterIndex, 1);
      }
      resolve(commitPdfSearchState(readPdfMatchesCount(), query));
    }, 1200);
    pdfSearchWaiters.push({ resolve, timer });
  });

  const handlePdfFindMatchesCount = (event: { matchesCount?: PdfFindMatchesCount }) => {
    if (event.matchesCount) {
      commitPdfSearchState(event.matchesCount, pdfContext.search);
    }
  };

  const handlePdfFindControlState = (event: {
    state?: number;
    matchesCount?: PdfFindMatchesCount;
    rawQuery?: string | null;
  }) => {
    const query = typeof event.rawQuery === 'string' ? event.rawQuery : pdfContext.search;
    pdfContext.search = query;
    const matchesCount = event.matchesCount?.total ? event.matchesCount : readPdfMatchesCount();
    const shouldResolve = event.state !== 3 && (matchesCount.total > 0 || event.state === 1);
    commitPdfSearchState(matchesCount, query, shouldResolve);
  };

  const clampHorizontalScroll = (scrollLeft: number) => {
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    return Math.min(Math.max(0, scrollLeft), maxScrollLeft);
  };

  const restoreHorizontalScroll = (scrollLeft: number) => {
    container.scrollLeft = clampHorizontalScroll(scrollLeft);
  };

  const stabilizeHorizontalScroll = (scrollLeft: number) => {
    restoreHorizontalScroll(scrollLeft);
    void waitForPaint(targetWindow).then(() => restoreHorizontalScroll(scrollLeft));
    targetWindow.requestAnimationFrame(() => {
      restoreHorizontalScroll(scrollLeft);
      targetWindow.requestAnimationFrame(() => restoreHorizontalScroll(scrollLeft));
    });
    targetWindow.setTimeout(() => restoreHorizontalScroll(scrollLeft), 120);
  };

  const runPdfFind = async (
    query: string,
    searchOptionsInput: FileViewerSearchOptions | undefined,
    type: '' | 'again',
    findPrevious = false
  ) => {
    if (!pdfContext.eventBus) {
      return commitPdfSearchState({ current: 0, total: 0 }, query);
    }

    pdfContext.search = query;
    pdfSearchOptions = searchOptionsInput || pdfSearchOptions;
    const searchOptions = searchOptionsInput || pdfSearchOptions;
    const previousScrollLeft = clampHorizontalScroll(container.scrollLeft || 0);
    pdfContext.eventBus.dispatch('find', {
      source: root,
      type,
      query,
      phraseSearch: true,
      caseSensitive: !!searchOptions?.caseSensitive,
      entireWord: !!searchOptions?.wholeWord,
      highlightAll: true,
      findPrevious,
      matchDiacritics: false,
    });

    try {
      return await waitForPdfSearchState(query);
    } finally {
      stabilizeHorizontalScroll(previousScrollLeft);
    }
  };

  const clearPdfFind = () => {
    pdfContext.search = '';
    pdfSearchOptions = undefined;
    pdfMatchesCount = { current: 0, total: 0 };
    pdfContext.eventBus?.dispatch('findbarclose', {
      source: root,
    });
    return commitPdfSearchState(pdfMatchesCount, '', true);
  };

  const getPdfZoomState = (): FileViewerZoomState => ({
    scale: currentScale,
    label: scaleText(),
    canZoomIn: loadStatus === 'ready' && !!pdfContext.viewer && canZoomIn(),
    canZoomOut: loadStatus === 'ready' && !!pdfContext.viewer && canZoomOut(),
    canReset: loadStatus === 'ready' && !!pdfContext.viewer && Math.abs(currentScale - 1) > 0.001,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });

  const readScrollState = () => {
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    return {
      top: container.scrollTop || 0,
      left: container.scrollLeft || 0,
      width: container.scrollWidth || 0,
      height: container.scrollHeight || 0,
      clientWidth: container.clientWidth || 0,
      clientHeight: container.clientHeight || 0,
      topRatio: maxTop > 0 ? (container.scrollTop || 0) / maxTop : 0,
      leftRatio: maxLeft > 0 ? (container.scrollLeft || 0) / maxLeft : 0,
    };
  };

  const getPdfViewState = (): FileViewerViewState => {
    const zoom = getPdfZoomState();
    const bbox = pdfBoundingBoxController.getStateValue();
    return {
      renderer: 'pdf',
      page: currentPage,
      pageCount,
      scale: zoom.scale,
      zoom,
      rotation: currentRotation,
      scroll: readScrollState(),
      navigation: {
        visible: navigationEnabled ? navVisible : false,
        mode: navMode,
      },
      extra: bbox ? { bbox } : undefined,
    };
  };

  const emitViewStateChange = (
    action: FileViewerViewStateChangeAction,
    source: FileViewerViewStateChangeSource = 'viewer'
  ) => {
    const state = getPdfViewState();
    if (!destroyed) {
      viewStateEmitter.emit(createFileViewerViewStateChange(state, {
        action,
        source,
      }));
    }
    return state;
  };

  const resolveScrollValue = (
    value: unknown,
    ratio: unknown,
    maxValue: number
  ) => {
    if (Number.isFinite(value)) {
      return Number(value);
    }
    if (Number.isFinite(ratio)) {
      return Number(ratio) * maxValue;
    }
    return undefined;
  };

  const suppressProgrammaticScrollEvents = () => {
    suppressScrollEventUntil = Math.max(suppressScrollEventUntil, Date.now() + 180);
  };

  const pdfBoundingBoxController = createPdfBoundingBoxController({
    documentRef,
    targetWindow,
    viewerRoot: pdfViewerRoot,
    scrollContainer: container,
    initial: options?.bbox,
    getDocument: () => pdfContext.document,
    getPageCount: () => pageCount,
    getCurrentPage: () => currentPage,
    getRotation: () => currentRotation,
    goToPage: (page, source) => goToPage(page, 'bbox-focus', source, false),
    suppressProgrammaticScrollEvents,
    waitForPaint,
  });

  const markFitInteraction = (source: FileViewerViewStateChangeSource) => {
    if (source !== 'user' && source !== 'api') {
      return;
    }
    if (activeFitRequest?.resize === 'always') {
      return;
    }
    autoFitWidth = false;
    activeFitRequest = null;
  };

  const getPdfPageElement = (pageNumber: number) => {
    const pageView = pdfContext.viewer?.getPageView(pageNumber - 1) as { div?: HTMLElement } | null;
    return pageView?.div ||
      pdfViewerRoot.querySelector<HTMLElement>(`.page[data-page-number="${pageNumber}"]`);
  };

  const captureCurrentPdfPageAnchor = (): PdfPageScrollAnchor | null => {
    const pageElement = getPdfPageElement(currentPage);
    if (!pageElement) {
      return null;
    }
    const containerRect = container.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    const pageHeight = pageElement.offsetHeight || pageRect.height;
    if (pageHeight <= 0) {
      return null;
    }
    const pageTop = pageRect.top - containerRect.top + container.scrollTop;
    const inPageRatio = (container.scrollTop - pageTop) / pageHeight;
    return {
      page: currentPage,
      inPageRatio: Math.max(0, Math.min(1, inPageRatio)),
    };
  };

  const cancelPendingUserRotationRestore = () => {
    if (!pendingUserRotationAnchor) {
      return;
    }
    pendingUserRotationAnchor = null;
    rotationOperationVersion += 1;
  };

  const cancelPendingUserZoomRestore = () => {
    if (!pendingUserZoomAnchor) {
      return;
    }
    pendingUserZoomAnchor = null;
    zoomOperationVersion += 1;
  };

  const restorePdfPageAnchor = (
    anchor: PdfPageScrollAnchor,
    isActive: () => boolean,
    release: () => void
  ) => {
    const apply = () => {
      if (destroyed || !isActive()) {
        return false;
      }
      const pageElement = getPdfPageElement(anchor.page);
      if (!pageElement) {
        return false;
      }
      const containerRect = container.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();
      const pageHeight = pageElement.offsetHeight || pageRect.height;
      if (pageHeight <= 0) {
        return false;
      }
      const pageTop = pageRect.top - containerRect.top + container.scrollTop;
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
      suppressProgrammaticScrollEvents();
      container.scrollTop = Math.max(
        0,
        Math.min(maxTop, pageTop + anchor.inPageRatio * pageHeight)
      );
      currentPage = anchor.page;
      syncUi();
      return true;
    };

    apply();
    void waitForPaint(targetWindow)
      .then(() => {
        apply();
        return waitForPaint(targetWindow);
      })
      .then(apply);
    targetWindow.requestAnimationFrame(() => {
      apply();
      targetWindow.requestAnimationFrame(apply);
    });
    targetWindow.setTimeout(() => {
      apply();
      if (isActive()) release();
    }, 180);
  };

  const restoreUserRotationAnchor = (
    anchor: PdfPageScrollAnchor,
    operationVersion: number
  ) => restorePdfPageAnchor(
    anchor,
    () => operationVersion === rotationOperationVersion && pendingUserRotationAnchor === anchor,
    () => {
      pendingUserRotationAnchor = null;
    }
  );

  const restoreUserZoomAnchor = (
    anchor: PdfPageScrollAnchor,
    operationVersion: number
  ) => restorePdfPageAnchor(
    anchor,
    () => operationVersion === zoomOperationVersion && pendingUserZoomAnchor === anchor,
    () => {
      pendingUserZoomAnchor = null;
    }
  );

  const recordUserScrollIntent = () => {
    cancelPendingUserRotationRestore();
    cancelPendingUserZoomRestore();
    userScrollIntentUntil = Date.now() + 750;
    suppressScrollEventUntil = 0;
    markFitInteraction('user');
  };

  const restoreScrollState = (
    scroll: FileViewerViewState['scroll'] | undefined,
    notify = true
  ) => {
    if (!scroll) {
      return;
    }
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const top = resolveScrollValue(scroll.top, scroll.topRatio, maxTop);
    const left = resolveScrollValue(scroll.left, scroll.leftRatio, maxLeft);

    if (!notify) {
      suppressProgrammaticScrollEvents();
    }
    if (top !== undefined) {
      container.scrollTop = Math.min(Math.max(0, top), maxTop);
    }
    if (left !== undefined) {
      container.scrollLeft = Math.min(Math.max(0, left), maxLeft);
    }
  };

  const applyPdfViewState = async (
    state: FileViewerViewState,
    applyOptions: FileViewerApplyViewStateOptions = {}
  ): Promise<FileViewerViewState> => {
    if (!pdfContext.viewer || loadStatus !== 'ready') {
      pendingInitialViewState = state;
      return getPdfViewState();
    }

    const source = applyOptions.source || 'api';
    const action = applyOptions.action || 'restore';
    const notify = applyOptions.notify !== false;
    markFitInteraction(source);
    const applyVersion = ++viewStateApplyVersion;
    activeViewStateApplyVersion = applyVersion;
    suppressProgrammaticScrollEvents();
    const update = resolvePdfViewStateUpdate(state, {
      rotation: currentRotation,
      scale: currentScale,
      page: currentPage,
      pageCount,
    }, {
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
    });
    const hasBboxUpdate = !!state.extra && Object.prototype.hasOwnProperty.call(state.extra, 'bbox');
    const bboxUpdate = hasBboxUpdate ? state.extra?.bbox : undefined;

    try {
      if (state.navigation) {
        let navigationChanged = false;
        if (navigationEnabled && typeof state.navigation.visible === 'boolean') {
          navigationChanged = navVisible !== state.navigation.visible;
          navVisible = state.navigation.visible;
        }
        if (state.navigation.mode === 'pages' || state.navigation.mode === 'outline') {
          navigationChanged = navigationChanged || navMode !== state.navigation.mode;
          navMode = state.navigation.mode;
        }
        if (navigationChanged) {
          syncUi();
        }
      }

      if (update.rotation !== undefined) {
        applyRotation(update.rotation, 'rotation-change', source, false);
      }
      if (update.scale !== undefined) {
        autoFitWidth = false;
        setScale(update.scale, 'zoom-change', source, false);
      }
      if (update.page !== undefined) {
        goToPage(update.page, 'page-change', source, false);
      }

      // A remote presenter can send scroll snapshots faster than one animation
      // frame. Apply the latest offset before yielding so superseded promises
      // cannot starve the projected screen until the presenter stops scrolling.
      restoreScrollState(state.scroll, false);
      await waitForPaint(targetWindow);
      if (applyVersion !== viewStateApplyVersion) {
        return getPdfViewState();
      }
      restoreScrollState(state.scroll, false);
      await waitForPaint(targetWindow);
      if (applyVersion !== viewStateApplyVersion) {
        return getPdfViewState();
      }
      restoreScrollState(state.scroll, false);
      if (hasBboxUpdate) {
        await pdfBoundingBoxController.set(bboxUpdate, { focus: true, source });
      }
      syncUi();

      if (notify && applyVersion === viewStateApplyVersion) {
        emitViewStateChange(action, source);
      }
      return getPdfViewState();
    } finally {
      suppressProgrammaticScrollEvents();
      if (activeViewStateApplyVersion === applyVersion) {
        activeViewStateApplyVersion = 0;
      }
    }
  };

  const scheduleScrollViewStateChange = () => {
    if (activeViewStateApplyVersion || Date.now() < suppressScrollEventUntil || destroyed) {
      return;
    }
    if (scrollStateFrame) {
      return;
    }
    scrollStateFrame = targetWindow.requestAnimationFrame(() => {
      scrollStateFrame = 0;
      const source: FileViewerViewStateChangeSource = Date.now() <= userScrollIntentUntil
        ? 'user'
        : 'viewer';
      markFitInteraction(source);
      emitViewStateChange('scroll', source);
    });
  };

  const setScale = (
    scale: number,
    action: FileViewerViewStateChangeAction = 'zoom-change',
    source: FileViewerViewStateChangeSource = 'viewer',
    notifyViewState = true
  ) => {
    if (!pdfContext.viewer) {
      return;
    }
    const normalizedScale = clampScale(scale);
    pdfContext.viewer.currentScale = normalizedScale;
    currentScale = normalizedScale;
    scheduleLegacyPageDimensionPatch();
    zoomEmitter.emit();
    syncUi();
    if (notifyViewState) {
      emitViewStateChange(action, source);
    }
  };

  const getPageSizeAtScaleOne = (pdfViewer: PDFViewer) => {
    const pageIndex = Math.max(0, Math.min(pageCount - 1, currentPage - 1));
    const pageView = pdfViewer.getPageView(pageIndex) || pdfViewer.getPageView(0);
    const pdfPage = pageView?.pdfPage;
    if (pdfPage) {
      const viewportAtScaleOne = pdfPage.getViewport({
        scale: PixelsPerInch.PDF_TO_CSS_UNITS,
        rotation: currentRotation,
      });
      return {
        width: viewportAtScaleOne.width,
        height: viewportAtScaleOne.height,
      };
    }

    const viewportWidth = pageView?.viewport?.width;
    const viewportHeight = pageView?.viewport?.height;
    if (viewportWidth && viewportHeight && currentScale) {
      return {
        width: viewportWidth / currentScale,
        height: viewportHeight / currentScale,
      };
    }
    return { width: 0, height: 0 };
  };

  const getPageWidthAtScaleOne = (pdfViewer: PDFViewer) => {
    return getPageSizeAtScaleOne(pdfViewer).width;
  };

  const getFitWidthScale = (pdfViewer: PDFViewer) => {
    const pageWidth = getPageWidthAtScaleOne(pdfViewer);
    const containerWidth = container.clientWidth || targetWindow.innerWidth;
    const availableWidth = Math.max(
      containerWidth - PDF_FIT_HORIZONTAL_PADDING - PDF_PAGE_BORDER_WIDTH,
      96
    );
    return pageWidth ? clampScale(availableWidth / pageWidth) : 1;
  };

  const fitToWidth = (
    source: FileViewerViewStateChangeSource = 'user',
    notifyViewState = true
  ) => {
    if (!pdfContext.viewer) {
      return;
    }
    cancelPendingUserZoomRestore();
    userScrollIntentUntil = 0;
    suppressProgrammaticScrollEvents();
    autoFitWidth = true;
    setScale(getFitWidthScale(pdfContext.viewer), 'zoom-reset', source, notifyViewState);
    void waitForPaint(targetWindow).then(() => {
      pdfContext.viewer?.update();
    });
  };

  const applyPdfFit = async (request: FileViewerFitRequest): Promise<FileViewerFitResult> => {
    cancelPendingUserZoomRestore();
    userScrollIntentUntil = 0;
    activeFitRequest = { ...request };
    if (!pdfContext.viewer || loadStatus !== 'ready') {
      pendingFitRequest = request;
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'pending',
        provider: 'view-state',
      };
    }

    const pageSize = getPageSizeAtScaleOne(pdfContext.viewer);
    const mode = request.mode === 'auto' ? 'width' : request.mode;
    const fitViewport = resolvePdfFitViewportSize({
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      fallbackWidth: targetWindow.innerWidth,
      fallbackHeight: targetWindow.innerHeight,
      request,
    });
    const scale = resolveFileViewerFitScale({
      mode,
      // The core request measures the whole viewer root. PDF's scroll
      // container is the actual visible document area after the navigation
      // pane, so prefer it whenever it has been laid out.
      viewportWidth: fitViewport.width,
      viewportHeight: fitViewport.height,
      contentWidth: pageSize.width,
      contentHeight: pageSize.height,
      currentScale,
      minScale: request.minScale ?? MIN_SCALE,
      maxScale: request.maxScale ?? MAX_SCALE,
    });

    if (!scale) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'unmeasurable',
        provider: 'view-state',
      };
    }

    suppressProgrammaticScrollEvents();
    autoFitWidth = request.mode === 'auto' || request.mode === 'width';
    if (Math.abs(scale - currentScale) > 0.001) {
      setScale(scale, 'fit', request.source);
    } else {
      pdfContext.viewer.update();
      syncUi();
    }
    await waitForPaint(targetWindow);
    suppressProgrammaticScrollEvents();
    pdfContext.viewer?.update();
    const state = getPdfViewState();
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'view-state',
      state,
    };
  };

  const scheduleFitAfterResize = () => {
    if (!pdfContext.viewer) {
      return;
    }
    if (activeFitRequest?.resize === 'initial') {
      return;
    }
    if (!activeFitRequest && !autoFitWidth) {
      return;
    }
    targetWindow.cancelAnimationFrame(fitFrame);
    fitFrame = targetWindow.requestAnimationFrame(() => {
      if (activeFitRequest) {
        void applyPdfFit({ ...activeFitRequest, source: 'viewer' });
        return;
      }
      fitToWidth('viewer');
    });
  };

  const setAnchoredScale = (
    scale: number,
    action: FileViewerViewStateChangeAction,
    source: FileViewerViewStateChangeSource
  ) => {
    if (!pdfContext.viewer) {
      return;
    }
    cancelPendingUserRotationRestore();
    pendingUserZoomAnchor ||= captureCurrentPdfPageAnchor();
    const pageAnchor = pendingUserZoomAnchor;
    const operationVersion = ++zoomOperationVersion;
    if (pageAnchor) {
      suppressProgrammaticScrollEvents();
      currentPage = pageAnchor.page;
    }
    setScale(scale, action, source);
    if (pageAnchor) {
      restoreUserZoomAnchor(pageAnchor, operationVersion);
    }
  };

  const zoomIn = (source: FileViewerViewStateChangeSource = 'user') => {
    markFitInteraction(source);
    setAnchoredScale(currentScale + SCALE_STEP, 'zoom-in', source);
  };

  const zoomOut = (source: FileViewerViewStateChangeSource = 'user') => {
    markFitInteraction(source);
    setAnchoredScale(currentScale - SCALE_STEP, 'zoom-out', source);
  };

  const reapplyFitAfterLayout = (
    source: FileViewerViewStateChangeSource,
    notifyViewState = true
  ) => {
    if (activeFitRequest) {
      if (activeFitRequest.resize === 'initial') {
        return false;
      }
      void applyPdfFit({ ...activeFitRequest, source });
      return true;
    }
    if (autoFitWidth) {
      fitToWidth(source, notifyViewState);
      return true;
    }
    return false;
  };

  const applyRotation = (
    rotation: number,
    action: FileViewerViewStateChangeAction = 'rotation-change',
    source: FileViewerViewStateChangeSource = 'viewer',
    notifyViewState = true
  ) => {
    markFitInteraction(source);
    const normalized = normalizeRotation(rotation);
    if (source === 'user' && pdfContext.viewer) {
      cancelPendingUserZoomRestore();
      pendingUserRotationAnchor ||= captureCurrentPdfPageAnchor();
    } else {
      cancelPendingUserRotationRestore();
    }
    const pageAnchor = source === 'user' ? pendingUserRotationAnchor : null;
    const operationVersion = ++rotationOperationVersion;
    if (pageAnchor) {
      suppressProgrammaticScrollEvents();
      currentPage = pageAnchor.page;
    }
    currentRotation = normalized;
    pdfThumbnails.clear();
    pendingPdfThumbnails.clear();
    if (!pdfContext.viewer) {
      syncUi();
      return;
    }
    pdfContext.viewer.pagesRotation = normalized;
    void waitForPaint(targetWindow).then(() => {
      if (operationVersion !== rotationOperationVersion) {
        return;
      }
      const refocusBoundingBoxes = () => {
        if (pdfBoundingBoxController.hasBoxes()) {
          void waitForPaint(targetWindow)
            .then(() => waitForPaint(targetWindow))
            .then(() => pdfBoundingBoxController.render({ focus: true, source }));
        }
      };
      if (reapplyFitAfterLayout(source, notifyViewState)) {
        if (pageAnchor) {
          restoreUserRotationAnchor(pageAnchor, operationVersion);
        }
        if (notifyViewState) {
          emitViewStateChange(action, source);
        }
        refocusBoundingBoxes();
        return;
      }
      pdfContext.viewer?.update();
      scheduleLegacyPageDimensionPatch();
      syncUi();
      if (pageAnchor) {
        restoreUserRotationAnchor(pageAnchor, operationVersion);
      }
      if (notifyViewState) {
        emitViewStateChange(action, source);
      }
      refocusBoundingBoxes();
    });
  };

  const runWithStableHorizontalScroll = (action: () => PdfNavigationResult) => {
    const previousScrollLeft = clampHorizontalScroll(container.scrollLeft || 0);
    const result = action();
    stabilizeHorizontalScroll(previousScrollLeft);
    if (result && typeof result.then === 'function') {
      void Promise.resolve(result).finally(() => stabilizeHorizontalScroll(previousScrollLeft));
    }
  };

  function goToPage(
    pageNumber: number,
    action: FileViewerViewStateChangeAction = 'page-change',
    source: FileViewerViewStateChangeSource = 'viewer',
    notifyViewState = true
  ) {
    if (!pdfContext.viewer || !pageCount) {
      return;
    }
    if (source === 'user') {
      cancelPendingUserRotationRestore();
      cancelPendingUserZoomRestore();
    }
    markFitInteraction(source);
    const nextPage = Math.min(pageCount, Math.max(1, pageNumber));
    runWithStableHorizontalScroll(() => {
      pdfContext.viewer!.currentPageNumber = nextPage;
      currentPage = nextPage;
      syncUi();
      if (notifyViewState) {
        emitViewStateChange(action, source);
      }
    });
  }

  const toggleNav = (
    source: FileViewerViewStateChangeSource = 'user',
    notifyViewState = true
  ) => {
    if (!navigationEnabled) {
      return;
    }
    markFitInteraction(source);
    navVisible = !navVisible;
    syncUi();
    void waitForPaint(targetWindow).then(() => {
      if (reapplyFitAfterLayout(source, notifyViewState)) {
        return;
      }
      pdfContext.viewer?.update();
    });
    if (notifyViewState) {
      emitViewStateChange('navigation-toggle', source);
    }
  };

  const setNavMode = (
    mode: PdfNavMode,
    source: FileViewerViewStateChangeSource = 'user',
    notifyViewState = true
  ) => {
    markFitInteraction(source);
    navMode = mode;
    syncUi();
    if (notifyViewState) {
      emitViewStateChange('navigation-mode-change', source);
    }
  };

  const toggleOutlineItem = (item: PdfOutlineItemView) => {
    if (!item.items.length) {
      return;
    }
    item.expanded = !item.expanded;
    syncUi();
  };

  const goToOutlineItem = (item: PdfOutlineItemView) => {
    if (!item.dest || !pdfContext.linkService) {
      return;
    }
    runWithStableHorizontalScroll(() => pdfContext.linkService!.goToDestination(item.dest!));
    void waitForPaint(targetWindow).then(() => emitViewStateChange('outline-click', 'user'));
  };

  const destroyPdfResource = async (resource: PdfResource | null) => {
    if (!resource) {
      return;
    }
    const restorePdfJsConsoleErrors = suppressPdfJsDestroyLifecycleErrors(targetWindow);
    try {
      await resource.loadingTask.destroy();
    } catch (error) {
      console.warn('PDF 加载任务销毁失败', error);
    } finally {
      try {
        resource.worker?.destroy();
      } finally {
        restorePdfJsConsoleErrors();
      }
    }
  };

  const loadOutline = async (pdfDocument: PdfDocumentProxy) => {
    try {
      const outline = await pdfDocument.getOutline();
      if (destroyed || pdfContext.document !== pdfDocument) {
        return;
      }
      outlineItems = Array.isArray(outline)
        ? buildOutlineItems(
            outline as Array<{ title?: string; dest?: string | unknown[] | null; items?: unknown[] }>,
            'outline',
            index => t('pdf.nav.outlineFallbackTitle', { index: index + 1 })
          )
        : [];
      syncUi();
    } catch (error) {
      console.warn('PDF 大纲读取失败', error);
      outlineItems = [];
      syncUi();
    }
  };

  const getPdfExportRatio = (width: number, height: number, mode: FileRenderExportOptions['mode']) => {
    const preferredRatio = mode === 'print' ? 1.75 : 1.5;
    const maxRatio = Math.sqrt(PDF_EXPORT_MAX_PAGE_PIXELS / Math.max(width * height, 1));
    return Math.max(0.75, Math.min(preferredRatio, maxRatio));
  };

  const getPdfPrintPageSize = async (pageNumber = 1) => {
    const pdfDocument = pdfContext.document;
    if (!pdfDocument) {
      throw new Error(t('pdf.error.notLoaded'));
    }
    const page = await pdfDocument.getPage(Math.min(Math.max(pageNumber, 1), pdfDocument.numPages));
    const viewport = page.getViewport({
      scale: PixelsPerInch.PDF_TO_CSS_UNITS,
      rotation: currentRotation,
    });
    (page as { cleanup?: () => void }).cleanup?.();
    return {
      width: Math.ceil(viewport.width),
      height: Math.ceil(viewport.height),
    };
  };

  const buildPdfPrintStyle = async () => {
    const size = await getPdfPrintPageSize();
    return buildPrintPageStyle({
      selector: '.viewer-export-content .pdf-export-page',
      width: size.width,
      height: size.height,
    });
  };

  const renderPdfPagesForExport = async (exportOptions: FileRenderExportOptions) => {
    const pdfDocument = pdfContext.document;
    if (!pdfDocument) {
      throw new Error(t('pdf.error.notLoaded'));
    }

    const pagesHtml: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      if (destroyed) {
        throw new Error(t('pdf.error.unloaded'));
      }

      const page = await pdfDocument.getPage(pageNumber);
      await ensurePdfPageCjkFontFallback(
        pageNumber,
        page as unknown as PdfTextContentPage
      );
      const baseViewport = page.getViewport({
        scale: PixelsPerInch.PDF_TO_CSS_UNITS,
        rotation: currentRotation,
      });
      const pageWidth = Math.ceil(baseViewport.width);
      const pageHeight = Math.ceil(baseViewport.height);
      const exportRatio = getPdfExportRatio(baseViewport.width, baseViewport.height, exportOptions.mode);
      const renderViewport = page.getViewport({
        scale: PixelsPerInch.PDF_TO_CSS_UNITS * exportRatio,
        rotation: currentRotation,
      });
      const canvas = documentRef.createElement('canvas');
      const canvasContext = canvas.getContext('2d');
      if (!canvasContext) {
        throw new Error(t('pdf.error.canvasUnavailable'));
      }

      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      await page.render({ canvas, canvasContext, viewport: renderViewport }).promise;

      const pageTitle = t('pdf.export.pageTitle', { title: exportOptions.title, page: pageNumber });
      const pageStyle = [
        `--viewer-print-page-width:${formatCssPixels(pageWidth)}`,
        `--viewer-print-page-height:${formatCssPixels(pageHeight)}`,
        `width:${formatCssPixels(pageWidth)}`,
        `height:${formatCssPixels(pageHeight)}`,
      ].join(';');
      pagesHtml.push(`<section class="pdf-export-page viewer-print-page" data-viewer-print-page-index="${pageNumber - 1}" style="${pageStyle}" aria-label="${escapeAttribute(pageTitle)}"><img src="${canvas.toDataURL('image/png')}" alt="${escapeAttribute(pageTitle)}" /></section>`);

      canvas.width = 0;
      canvas.height = 0;
      (page as { cleanup?: () => void }).cleanup?.();
    }

    return `<div class="pdf-export-document">${pagesHtml.join('')}</div>`;
  };

  const loadFile = async () => {
    const requestVersion = ++loadVersion;
    restorePdfJsMissingSystemFontWarnings();
    restorePdfJsMissingSystemFontWarnings = () => {};
    pdfCjkFontFallbackManager = null;
    pdfCjkFontFallbackPageLoads.clear();
    pdfCjkFontFallbackRenderHandledPages.clear();
    loadStatus = 'loading';
    errorMessage = '';
    pdfContext.document = null;
    outlineItems = [];
    pdfThumbnails.clear();
    pendingPdfThumbnails.clear();
    thumbnailObserver?.disconnect();
    context?.registerExportAdapter?.(null);
    syncUi();
    let resource: PdfResource | null = null;

    try {
      if (destroyed || requestVersion !== loadVersion) {
        return;
      }

      const eventBus = new EventBus();
      const pdfLinkService = new PDFLinkService({ eventBus });
      const pdfFindController = new PDFFindController({
        eventBus,
        linkService: pdfLinkService,
        updateMatchesCountOnProgress: true,
      });

      const pdfViewer = new PDFViewer({
        container,
        eventBus,
        linkService: pdfLinkService,
        findController: pdfFindController,
        l10n: new GenericL10n(resolvedLocale),
        enableAutoLinking: false,
      });
      pdfContext.viewer = pdfViewer;
      pdfContext.linkService = pdfLinkService;
      pdfContext.eventBus = eventBus;
      pdfContext.findController = pdfFindController;
      pdfLinkService.setViewer(pdfViewer);

      eventBus.on('updatefindmatchescount', handlePdfFindMatchesCount);
      eventBus.on('updatefindcontrolstate', handlePdfFindControlState);
      eventBus.on('pagesinit', () => {
        applyRotation(currentRotation, 'rotation-change', 'viewer', false);
        loadStatus = 'ready';
        scheduleLegacyPageDimensionPatch();
        syncUi();
        context?.onProgressiveRender?.();
        const viewStateToRestore = pendingInitialViewState;
        pendingInitialViewState = null;
        if (viewStateToRestore) {
          void applyPdfViewState(viewStateToRestore, {
            action: 'restore',
            source: 'initial',
          });
        } else {
          const fitRequest = pendingFitRequest;
          pendingFitRequest = null;
          if (fitRequest) {
            void applyPdfFit(fitRequest);
          } else {
            fitToWidth('viewer', false);
            emitViewStateChange('init', 'viewer');
          }
        }
        if (pdfContext.search) {
          eventBus.dispatch('find', { type: '', query: pdfContext.search });
        }
        if (pdfBoundingBoxController.hasBoxes()) {
          void waitForPaint(targetWindow).then(() => pdfBoundingBoxController.render({
            focus: true,
            source: 'initial',
          }));
        }
      });
      eventBus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) => {
        const pendingPageAnchor = pendingUserRotationAnchor || pendingUserZoomAnchor;
        if (pendingPageAnchor && pageNumber !== pendingPageAnchor.page) {
          currentPage = pendingPageAnchor.page;
          syncUi();
          return;
        }
        const previousPage = currentPage;
        currentPage = pageNumber;
        syncUi();
        if (previousPage !== currentPage && !activeViewStateApplyVersion) {
          emitViewStateChange('page-change', 'viewer');
        }
      });
      eventBus.on('scalechanging', ({ scale }: { scale: number }) => {
        const previousScale = currentScale;
        currentScale = clampScale(scale);
        scheduleLegacyPageDimensionPatch();
        zoomEmitter.emit();
        syncUi();
        if (previousScale !== currentScale && !activeViewStateApplyVersion) {
          emitViewStateChange('zoom-change', 'viewer');
        }
      });
      eventBus.on('pagerendered', ({ pageNumber }: { pageNumber: number }) => {
        scheduleLegacyPageDimensionPatch();
        if (pdfBoundingBoxController.hasBoxes()) {
          void pdfBoundingBoxController.render({ pageNumber, source: 'viewer' });
        }
        if (
          !pdfCjkFontFallbackManager ||
          pdfCjkFontFallbackRenderHandledPages.has(pageNumber)
        ) {
          return;
        }
        pdfCjkFontFallbackRenderHandledPages.add(pageNumber);
        const pdfDocument = pdfContext.document;
        const alreadyPrepared = pdfCjkFontFallbackPageLoads.has(pageNumber);
        if (!pdfDocument || alreadyPrepared) {
          return;
        }
        void pdfDocument.getPage(pageNumber)
          .then(page => ensurePdfPageCjkFontFallback(
            pageNumber,
            page as unknown as PdfTextContentPage
          ))
          .then(fontLoaded => {
            if (
              fontLoaded &&
              !destroyed &&
              pdfContext.document === pdfDocument
            ) {
              pdfContext.viewer?.refresh();
            }
          })
          .catch(error => {
            console.warn('[file-viewer] Unable to inspect a PDF page for CJK font fallback.', error);
          });
      });

      if (!context?.streamUrl && !buffer.byteLength) {
        throw new Error(t('pdf.error.missingSource'));
      }

      const pdfAssets = resolveFileViewerPdfAssetUrls(
        options,
        pdfRuntimeAssetBaseUrl
      );
      if (cjkFontFallbackEnabled) {
        pdfCjkFontFallbackManager = createPdfCjkFontFallbackManager({
          documentRef,
          fontAssetPath: pdfAssets.cjkFontFallbackPath,
          onWarning: (message, error) => {
            console.warn(`[file-viewer] ${message}`, error || '');
          },
        });
        restorePdfJsMissingSystemFontWarnings = suppressPdfJsMissingSystemFontWarnings(targetWindow);
      }
      const source: PdfLoadingSource = context?.streamUrl
        ? {
            url: context.streamUrl,
            rangeChunkSize: options?.rangeChunkSize || DEFAULT_PDF_RANGE_CHUNK_SIZE,
            withCredentials: options?.withCredentials === true,
          }
        : {
            data: buffer,
          };

      const createLoadingResource = async (
        loadingSource: PdfLoadingSource
      ): Promise<PdfResource> => {
        const worker = await createPdfWorker();
        const loadingTask = getDocument({
          ...loadingSource,
          worker: worker || undefined,
          cMapUrl: pdfAssets.cMapUrl,
          wasmUrl: pdfAssets.wasmUrl,
          standardFontDataUrl: pdfAssets.standardFontDataUrl,
          useWorkerFetch: true,
          cMapPacked: true,
          enableXfa: true,
          fontExtraProperties: fontInspectionEnabled,
        });
        return { loadingTask, worker };
      };

      resource = await createLoadingResource(source);
      pdfContext.resource = resource;

      let pdfDocument = await resource.loadingTask.promise;
      if (destroyed || requestVersion !== loadVersion || pdfContext.resource !== resource) {
        if (pdfContext.resource === resource) {
          pdfContext.resource = null;
          await destroyPdfResource(resource);
        }
        return;
      }

      let firstPageTextContent: PdfTextContent | null = null;
      let firstPageForInspection: PdfFontInspectionPage | null = null;
      if (fontInspectionEnabled && pdfDocument.numPages > 0) {
        const firstPage = await pdfDocument.getPage(1);
        firstPageForInspection = firstPage as unknown as PdfFontInspectionPage;
        firstPageTextContent = await firstPageForInspection.getTextContent();
      }

      if (identityFontRepairEnabled && firstPageTextContent) {
        const malformedFontNames = collectMalformedIdentityFontNames(firstPageTextContent);
        if (malformedFontNames.length && firstPageForInspection) {
          await firstPageForInspection.getOperatorList();
        }
        const malformedFontFamilies = new Map<string, string>();
        for (const fontName of malformedFontNames) {
          try {
            const family = firstPageForInspection?.commonObjs.get(fontName)?.name;
            if (family) {
              malformedFontFamilies.set(fontName, family);
            }
          } catch {
            // A font object that is still unresolved cannot be repaired safely.
          }
        }
        const candidateFamilies = detectMalformedIdentityCjkFontFamilies(
          firstPageTextContent,
          fontName => malformedFontFamilies.get(fontName) || ''
        );
        const identityFontRepair = getFileViewerPdfIdentityFontRepair();
        if (candidateFamilies.length && !identityFontRepair) {
          console.warn(
            '[file-viewer] This PDF needs the optional Identity-font repair capability. Run `npx file-viewer-cli add pdf-identity-font-repair --write`, then `npx file-viewer-cli install --yes`.'
          );
        }
        if (candidateFamilies.length && identityFontRepair) {
          let replacementResource: PdfResource | null = null;
          try {
            const sourceBytes = await pdfDocument.getData();
            const repaired = await identityFontRepair(sourceBytes, candidateFamilies);
            if (repaired.repairedFonts > 0) {
              const previousResource = resource;
              replacementResource = await createLoadingResource({ data: repaired.bytes });
              const replacementDocument = await replacementResource.loadingTask.promise;
              const repairedFirstPage = await replacementDocument.getPage(1);
              const replacementTextContent = await (
                repairedFirstPage as unknown as PdfTextContentPage
              ).getTextContent();
              if (
                destroyed ||
                requestVersion !== loadVersion ||
                pdfContext.resource !== previousResource
              ) {
                await destroyPdfResource(replacementResource);
                return;
              }

              resource = replacementResource;
              replacementResource = null;
              pdfContext.resource = resource;
              pdfDocument = replacementDocument;
              firstPageTextContent = replacementTextContent;
              await destroyPdfResource(previousResource);
              console.info(
                `[file-viewer] Repaired ${repaired.repairedFonts} malformed PDF Identity CJK font mapping(s).`
              );
            }
          } catch (error) {
            if (replacementResource) {
              await destroyPdfResource(replacementResource);
            }
            console.warn(
              '[file-viewer] Unable to repair a malformed PDF Identity CJK font; continuing with the original preview.',
              error
            );
          }
        }
      }

      if (destroyed || requestVersion !== loadVersion || pdfContext.resource !== resource) {
        return;
      }

      pageCount = pdfDocument.numPages;
      currentPage = 1;
      pdfContext.document = pdfDocument;
      if (pdfCjkFontFallbackManager && pageCount > 0) {
        if (firstPageTextContent) {
          pdfCjkFontFallbackPageLoads.set(
            1,
            pdfCjkFontFallbackManager.ensureTextContent(firstPageTextContent)
          );
          await pdfCjkFontFallbackPageLoads.get(1);
        } else {
          const firstPage = await pdfDocument.getPage(1);
          await ensurePdfPageCjkFontFallback(
            1,
            firstPage as unknown as PdfTextContentPage
          );
        }
        if (destroyed || requestVersion !== loadVersion || pdfContext.document !== pdfDocument) {
          return;
        }
      }
      context?.registerExportAdapter?.({
        includeDocumentStyles: false,
        getPrintMaskPages: () => Array.from(
          root.querySelectorAll<HTMLElement>('.pdfViewer .page')
        ),
        printStyle: buildPdfPrintStyle,
        toHtml: renderPdfPagesForExport,
      });
      void loadOutline(pdfDocument);
      pdfViewer.setDocument(pdfDocument);
      pdfLinkService.setDocument(pdfDocument, null);
      syncUi();
    } catch (error) {
      if (pdfContext.resource === resource) {
        pdfContext.resource = null;
        void destroyPdfResource(resource);
      }
      if (destroyed || requestVersion !== loadVersion) {
        return;
      }
      loadStatus = 'error';
      errorMessage = error instanceof Error ? error.message : t('pdf.error.loadFailed');
      syncUi();
    }
  };

  registerFileViewerSearchProvider(root, {
    search: (query, searchOptions) => runPdfFind(query, searchOptions, '', false),
    next: () => pdfContext.search
      ? runPdfFind(pdfContext.search, undefined, 'again', false)
      : pdfSearchState,
    previous: () => pdfContext.search
      ? runPdfFind(pdfContext.search, undefined, 'again', true)
      : pdfSearchState,
    clear: clearPdfFind,
    getState: () => pdfSearchState,
  });

  registerFileViewerZoomProvider(root, {
    zoomIn: () => {
      zoomIn('api');
      return getPdfZoomState();
    },
    zoomOut: () => {
      zoomOut('api');
      return getPdfZoomState();
    },
    resetZoom: () => {
      markFitInteraction('api');
      setAnchoredScale(1, 'zoom-reset', 'api');
      return getPdfZoomState();
    },
    setZoom: scale => {
      markFitInteraction('api');
      setAnchoredScale(scale, 'zoom-change', 'api');
      return getPdfZoomState();
    },
    fit: applyPdfFit,
    getState: getPdfZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  registerFileViewerViewStateProvider(root, {
    getState: getPdfViewState,
    applyState: applyPdfViewState,
    fit: applyPdfFit,
    subscribe: viewStateEmitter.subscribe,
  });

  navToggleButton.addEventListener('click', () => toggleNav('user'));
  previousPageButton.addEventListener('click', () => goToPage(currentPage - 1, 'page-step', 'user'));
  nextPageButton.addEventListener('click', () => goToPage(currentPage + 1, 'page-step', 'user'));
  zoomOutButton.addEventListener('click', () => zoomOut('user'));
  zoomInButton.addEventListener('click', () => zoomIn('user'));
  scaleButton.addEventListener('click', () => {
    activeFitRequest = null;
    fitToWidth('user');
  });
  rotateLeftButton.addEventListener('click', () => applyRotation(currentRotation - 90, 'rotate-left', 'user'));
  rotateRightButton.addEventListener('click', () => applyRotation(currentRotation + 90, 'rotate-right', 'user'));
  pagesTab.addEventListener('click', () => setNavMode('pages', 'user'));
  outlineTab.addEventListener('click', () => setNavMode('outline', 'user'));
  container.addEventListener('wheel', recordUserScrollIntent, { passive: true });
  container.addEventListener('touchstart', recordUserScrollIntent, { passive: true });
  container.addEventListener('pointerdown', recordUserScrollIntent, { passive: true });
  container.addEventListener('keydown', recordUserScrollIntent);
  container.addEventListener('scroll', scheduleScrollViewStateChange, { passive: true });

  if (targetWindow.ResizeObserver) {
    resizeObserver = new targetWindow.ResizeObserver(() => {
      root.style.setProperty('--viewer-container-height', `${container.clientHeight}px`);
      scheduleFitAfterResize();
    });
    resizeObserver.observe(container);
  }

  // PDFViewer writes this value to documentElement, which cannot safely model
  // multiple differently-sized viewers. Keep a live shell-local value as well
  // so Shadow DOM and multi-instance layouts both resolve the dummy-page height.
  root.style.setProperty('--viewer-container-height', `${container.clientHeight}px`);
  syncUi();
  void loadFile();

  return {
    $el: root,
    unmount() {
      destroyed = true;
      loadVersion += 1;
      restorePdfJsMissingSystemFontWarnings();
      restorePdfJsMissingSystemFontWarnings = () => {};
      pdfCjkFontFallbackManager = null;
      pdfCjkFontFallbackPageLoads.clear();
      pdfCjkFontFallbackRenderHandledPages.clear();
      targetWindow.cancelAnimationFrame(fitFrame);
      targetWindow.cancelAnimationFrame(pageDimensionFrame);
      targetWindow.cancelAnimationFrame(scrollStateFrame);
      thumbnailObserver?.disconnect();
      thumbnailObserver = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      container.removeEventListener('scroll', scheduleScrollViewStateChange);
      unregisterFileViewerSearchProvider(root);
      unregisterFileViewerZoomProvider(root);
      unregisterFileViewerViewStateProvider(root);
      pdfBoundingBoxController.destroy();
      outlineItems = [];
      context?.registerExportAdapter?.(null);
      context?.registerThumbnailAdapter?.(null);
      const resource = pdfContext.resource;
      (pdfContext.viewer as unknown as { setDocument: (document: null) => void } | null)
        ?.setDocument(null);
      (pdfContext.linkService as unknown as {
        setDocument: (document: null, baseUrl?: null) => void;
      } | null)?.setDocument(null, null);
      pdfContext.viewer = null;
      pdfContext.linkService = null;
      pdfContext.eventBus = null;
      pdfContext.findController = null;
      pdfContext.document = null;
      pdfContext.resource = null;
      pdfSearchWaiters.forEach(waiter => targetWindow.clearTimeout(waiter.timer));
      pdfSearchWaiters = [];
      void destroyPdfResource(resource);
      target.replaceChildren();
    },
  };
}
