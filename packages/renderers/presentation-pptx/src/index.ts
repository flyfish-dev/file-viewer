import { translateFileViewerMessage, type FileViewerI18nInput, type FileViewerMessageKey } from '@file-viewer/core';
import { PptxViewer, RECOMMENDED_ZIP_LIMITS, resolvePptxPackageWorkerUrl } from '@file-viewer/pptx';
import {
  DEFAULT_RENDERER_DEFINITIONS,
  attachFileViewerErrorMessage,
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter,
  getFileViewerShadowRootForNode,
  getDefaultFileViewerAssetBaseUrl,
  normalizeFileViewerErrorMessage,
  registerFileViewerZoomProvider,
  resolveFileViewerLocale,
  resolveFileViewerPresentationWorkerUrl,
  resolveFileViewerCopiedAssetUrl,
  resolveFileViewerRuntimeAssetBaseUrl,
  waitForFileViewerNextPaint,
  unregisterFileViewerZoomProvider,
} from '@file-viewer/core';
import type {
  FileRenderContext,
  FileRenderHandler,
  FileRenderExportAdapter,
  FileViewerRenderedInstance,
  FileViewerRendererPlugin,
  FileViewerZoomState,
  RendererDefinition,
} from '@file-viewer/core';
import type { PptxDiagnosticError } from '@file-viewer/pptx';

type PptxRenderState = 'loading' | 'ready' | 'error';

const pptxStyle = `
.pptx-viewer-shell{position:relative;box-sizing:border-box;min-height:100%;padding:24px 20px;background:var(--file-viewer-render-surface-background,#eef3f8);color:#1f2d3b;font-family:Aptos,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
.pptx-render-surface{min-height:240px}
.pptx-render-surface.is-loading{opacity:.72}
.pptx-loading{position:sticky;top:12px;z-index:3;box-sizing:border-box;display:inline-flex;align-items:center;gap:10px;margin:0 0 16px 50%;padding:10px 14px;border:1px solid rgba(42,94,144,.14);border-radius:999px;background:rgba(255,255,255,.92);color:#41556b;box-shadow:0 12px 32px rgba(24,44,64,.12);transform:translateX(-50%)}
.pptx-loading[hidden],.pptx-error[hidden]{display:none!important}
.pptx-loading-dot{width:9px;height:9px;border-radius:999px;background:#1f9d67;box-shadow:0 0 0 6px rgba(31,157,103,.13)}
.pptx-error{box-sizing:border-box;width:min(680px,calc(100% - 32px));margin:48px auto;padding:24px;border:1px solid rgba(28,43,58,.12);border-radius:14px;background:#fff;color:#1f2d3b;box-shadow:0 16px 42px rgba(25,42,54,.08)}
.pptx-slideshow-button{position:sticky;top:12px;z-index:4;float:right;display:inline-flex;align-items:center;gap:8px;margin:0 0 12px;padding:8px 14px;border:1px solid rgba(42,94,144,.16);border-radius:999px;background:rgba(255,255,255,.94);color:#2a5e90;font:13px/1.2 inherit;cursor:pointer;box-shadow:0 10px 26px rgba(24,44,64,.12)}
.pptx-slideshow-button:hover{border-color:rgba(42,94,144,.34);color:#1d4a75}
.pptx-slideshow-button:focus-visible{outline:2px solid #2a5e90;outline-offset:2px}
.pptx-slideshow-button[hidden]{display:none!important}
.pptx-slideshow-button-glyph{font-size:11px;line-height:1}
.pptx-slideshow-button-key{padding:1px 6px;border-radius:6px;background:rgba(42,94,144,.1);font-size:11px;letter-spacing:.04em}
[data-viewer-theme='dark'] .pptx-slideshow-button{border-color:rgba(148,163,184,.2);background:rgba(15,23,42,.92);color:#cbd5e1}
[data-viewer-theme='dark'] .pptx-slideshow-button-key{background:rgba(148,163,184,.16)}
.pptx-error strong{display:block;margin-bottom:10px;font-size:18px}
.pptx-error p{margin:0;color:#607282;line-height:1.7}
[data-viewer-theme='dark'] .pptx-viewer-shell{background:var(--file-viewer-render-surface-background,#101820);color:#e5eef8}
[data-viewer-theme='dark'] .pptx-loading{border-color:rgba(148,163,184,.18);background:rgba(15,23,42,.9);color:#cbd5e1;box-shadow:0 18px 44px rgba(0,0,0,.26)}
[data-viewer-theme='dark'] .pptx-error{border-color:rgba(148,163,184,.18);background:#151f2b;color:#f8fafc;box-shadow:0 22px 56px rgba(0,0,0,.32)}
[data-viewer-theme='dark'] .pptx-error p{color:#94a3b8}
[data-viewer-theme='dark'] .pptx-render-surface .slide,[data-viewer-theme='dark'] .pptx-render-surface [data-slide-index]{color-scheme:only light;forced-color-adjust:none}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .pptx-viewer-shell{background:var(--file-viewer-render-surface-background,#101820);color:#e5eef8}[data-viewer-theme='system'] .pptx-loading{border-color:rgba(148,163,184,.18);background:rgba(15,23,42,.9);color:#cbd5e1;box-shadow:0 18px 44px rgba(0,0,0,.26)}[data-viewer-theme='system'] .pptx-error{border-color:rgba(148,163,184,.18);background:#151f2b;color:#f8fafc;box-shadow:0 22px 56px rgba(0,0,0,.32)}[data-viewer-theme='system'] .pptx-error p{color:#94a3b8}[data-viewer-theme='system'] .pptx-render-surface .slide,[data-viewer-theme='system'] .pptx-render-surface [data-slide-index]{color-scheme:only light;forced-color-adjust:none}}
`;

const pptxPrintStyle = `
  .pptx-viewer-shell {
    background: #fff !important;
    padding: 0 !important;
  }
  .pptx-render-surface {
    display: block !important;
    overflow: visible !important;
  }
  .pptx-render-surface [data-slide-index] {
    break-after: page;
    page-break-after: always;
    margin: 0 auto !important;
  }
  .pptx-render-surface [data-slide-index]:last-child {
    break-after: auto;
    page-break-after: auto;
  }
`;

const SLIDESHOW_HOTKEY_LABEL = 'F5 / P';

// With several viewers on one page each renderer installs a document-level
// F5/P listener. Keep one explicitly activated shell per document so shortcuts
// never leak across viewers, host controls, or iframe documents.
const activePptxShells = new WeakMap<Document, HTMLElement>();

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = pptxStyle;
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

const resolvePptxStyleRoot = (
  surface: HTMLElement,
  context?: FileRenderContext
) => {
  return context?.surface?.shadowRoot ||
    getFileViewerShadowRootForNode(context?.surface?.container) ||
    getFileViewerShadowRootForNode(surface) ||
    undefined;
};

const clampZoomPercent = (value: number) => {
  return Math.min(300, Math.max(25, Math.round(value)));
};


type PptxDiagnosticErrorLike = Partial<PptxDiagnosticError> & {
  name?: string;
  code?: string;
  stage?: string;
  message?: string;
  detail?: string;
  hint?: string;
};

const pptxDiagnosticMessages: Record<string, FileViewerMessageKey> = {
  "PPTX_FILE_EMPTY": "presentation.diagnostic.reason.PPTX_FILE_EMPTY",
  "PPTX_FILE_TOO_LARGE": "presentation.diagnostic.reason.PPTX_FILE_TOO_LARGE",
  "PPTX_INVALID_ZIP": "presentation.diagnostic.reason.PPTX_INVALID_ZIP",
  "PPTX_MISSING_CONTENT_TYPES": "presentation.diagnostic.reason.PPTX_MISSING_CONTENT_TYPES",
  "PPTX_MISSING_PRESENTATION": "presentation.diagnostic.reason.PPTX_MISSING_PRESENTATION",
  "PPTX_NO_SLIDES": "presentation.diagnostic.reason.PPTX_NO_SLIDES",
  "PPTX_MISSING_SLIDE": "presentation.diagnostic.reason.PPTX_MISSING_SLIDE",
  "PPTX_SLIDE_RENDER_FAILED": "presentation.diagnostic.reason.PPTX_SLIDE_RENDER_FAILED",
  "PPTX_WORKER_FAILED": "presentation.diagnostic.reason.PPTX_WORKER_FAILED",
  "PPTX_PARSE_FAILED": "presentation.diagnostic.reason.PPTX_PARSE_FAILED"
};

const pptxDiagnosticFallbackHints: Record<string, FileViewerMessageKey> = {
  "PPTX_INVALID_ZIP": "presentation.diagnostic.hint.PPTX_INVALID_ZIP",
  "PPTX_WORKER_FAILED": "presentation.diagnostic.hint.PPTX_WORKER_FAILED",
  "PPTX_NO_SLIDES": "presentation.diagnostic.hint.PPTX_NO_SLIDES"
};

const localizePptxDiagnosticCopy = (key: FileViewerMessageKey | undefined, input?: FileViewerI18nInput) => key ? translateFileViewerMessage(input, key) : '';

const sanitizePptxDiagnosticText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/^Error:\s*/i, '').trim();
};

const isPptxDiagnosticErrorLike = (error: unknown): error is PptxDiagnosticErrorLike => {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (
      (error as PptxDiagnosticErrorLike).name === 'PptxDiagnosticError' ||
      (error as PptxDiagnosticErrorLike).code ||
      (error as PptxDiagnosticErrorLike).stage
    )
  );
};

const classifyPptxErrorString = (message: string): PptxDiagnosticErrorLike | null => {
  const lower = message.toLowerCase();
  if (
    lower.includes('end of central directory') ||
    lower.includes('corrupt zip') ||
    lower.includes('invalid zip') ||
    lower.includes('not a zip') ||
    lower.includes('jszip')
  ) {
    return {
      name: 'PptxDiagnosticError',
      code: 'PPTX_INVALID_ZIP',
      stage: 'read-zip',
      detail: message,
    };
  }
  if (
    lower.includes('worker') ||
    lower.includes('script error') ||
    lower.includes('failed to construct') ||
    lower.includes('failed to load')
  ) {
    return {
      name: 'PptxDiagnosticError',
      code: 'PPTX_WORKER_FAILED',
      stage: 'worker-runtime',
      detail: message,
    };
  }
  if (lower.includes('[content_types].xml')) {
    return {
      name: 'PptxDiagnosticError',
      code: 'PPTX_MISSING_CONTENT_TYPES',
      stage: 'read-content-types',
      detail: message,
    };
  }
  if (lower.includes('ppt/presentation.xml')) {
    return {
      name: 'PptxDiagnosticError',
      code: 'PPTX_MISSING_PRESENTATION',
      stage: 'read-presentation',
      detail: message,
    };
  }
  if (lower.includes('slide') || lower.includes('ppt/slides/')) {
    return {
      name: 'PptxDiagnosticError',
      code: 'PPTX_SLIDE_RENDER_FAILED',
      stage: 'render-slide',
      detail: message,
    };
  }
  return null;
};

const formatPptxDiagnosticError = (
  error: PptxDiagnosticErrorLike,
  fallback: string,
  context?: FileRenderContext
) => {
  const locale = resolveFileViewerLocale(context?.options);
  const code = String(error.code || 'PPTX_PARSE_FAILED');
  const localizedReason = localizePptxDiagnosticCopy(pptxDiagnosticMessages[code], context?.options);
  const rawReason = sanitizePptxDiagnosticText(error.message);
  const reason = localizedReason || rawReason || fallback;
  const detail = sanitizePptxDiagnosticText(error.detail);
  // Engine diagnostics may carry source-language hints. A known code has a
  // wrapper-owned translation, so prefer it over the engine's raw copy.
  const hint = localizePptxDiagnosticCopy(pptxDiagnosticFallbackHints[code], context?.options) ||
    sanitizePptxDiagnosticText(error.hint);
  const stage = sanitizePptxDiagnosticText(error.stage);
  const usesWesternPunctuation = !locale.startsWith('zh') && locale !== 'ja-JP';
  const separator = usesWesternPunctuation ? ': ' : '：';
  const parts = [`${fallback}${separator}${reason}`];

  if (stage) {
    parts.push(translateFileViewerMessage(context?.options, 'presentation.diagnostic.stage', { value: stage }));
  }
  if (detail && detail !== reason) {
    parts.push(translateFileViewerMessage(context?.options, 'presentation.diagnostic.detail', { value: detail }));
  }
  if (hint) {
    parts.push(translateFileViewerMessage(context?.options, 'presentation.diagnostic.hint', { value: hint }));
  }
  return parts.join(usesWesternPunctuation ? '; ' : '；');
};

const formatErrorMessage = (
  error: unknown,
  fallback: string,
  context?: FileRenderContext
) => {
  if (isPptxDiagnosticErrorLike(error)) {
    return formatPptxDiagnosticError(error, fallback, context);
  }
  if (error instanceof Error || typeof error === 'string') {
    const normalized = normalizeFileViewerErrorMessage(error, context?.options);
    const classified = classifyPptxErrorString(normalized);
    if (classified) {
      return formatPptxDiagnosticError(classified, fallback, context);
    }
    return normalized || fallback;
  }
  if (error === undefined || error === null) {
    return fallback;
  }
  try {
    const serialized = JSON.stringify(error) || '';
    if (serialized) {
      const classified = classifyPptxErrorString(serialized);
      if (classified) {
        return formatPptxDiagnosticError(classified, fallback, context);
      }
    }
    return serialized || fallback;
  } catch {
    return String(error || fallback);
  }
};

export const resolvePptxPreviewErrorMessage = formatErrorMessage;

const collectPptxPrintMaskPages = (surface: HTMLElement) => {
  const slots = Array.from(surface.querySelectorAll<HTMLElement>('.flyfish-pptx-slide-slot'));
  return slots.length
    ? slots
    : Array.from(surface.querySelectorAll<HTMLElement>('[data-slide-index], .slide'));
};

const buildExportAdapter = (
  surface: HTMLElement,
  targetWindow: Window | null | undefined,
  getViewer: () => PptxViewer | null
): FileRenderExportAdapter => ({
  print: true,
  exportHtml: true,
  includeDocumentStyles: true,
  beforeSnapshot: () => waitForFileViewerNextPaint(targetWindow || undefined),
  getPrintMaskPages: () => collectPptxPrintMaskPages(surface),
  printStyle: pptxPrintStyle,
  toHtml: async () => {
    const clone = await getViewer()?.cloneForExport() || surface.cloneNode(true) as HTMLElement;
    collectPptxPrintMaskPages(clone).forEach((page, index) => {
      page.dataset.viewerPrintPageIndex = String(index);
    });
    return clone.outerHTML;
  },
});

export default async function renderPptx(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.i18n || context?.options);
  const documentRef = target.ownerDocument || document;
  const targetWindow = documentRef.defaultView || (typeof window !== 'undefined' ? window : null);
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  let viewer: PptxViewer | null = null;
  let state: PptxRenderState = 'loading';
  let errorMessage = '';
  let errorCopy: ((i18n?: FileViewerI18nInput) => string) | undefined;
  let zoomPercent = 100;
  let progressiveReady = false;
  let disposed = false;

  const style = createStyle(documentRef);
  const shell = createElement(documentRef, 'div', 'pptx-viewer-shell');
  shell.dataset.viewerZoomProvider = 'pptx';

  const loading = createElement(documentRef, 'div', 'pptx-loading');
  loading.setAttribute('aria-live', 'polite');
  loading.append(
    createElement(documentRef, 'span', 'pptx-loading-dot'),
    t.text(createElement(documentRef, 'span', undefined), 'presentation.state.loading')
  );

  const error = createElement(documentRef, 'div', 'pptx-error');
  const errorTitle = t.text(createElement(documentRef, 'strong', undefined), 'presentation.error.title');
  const errorText = createElement(documentRef, 'p');
  error.append(errorTitle, errorText);

  const slideshowButton = createElement(documentRef, 'button', 'pptx-slideshow-button');
  slideshowButton.type = 'button';
  slideshowButton.hidden = true;
  const slideshowGlyph = createElement(documentRef, 'span', 'pptx-slideshow-button-glyph', '▶');
  const slideshowText = t.text(createElement(documentRef, 'span', undefined), 'presentation.slideshow.start');
  const slideshowKey = createElement(documentRef, 'span', 'pptx-slideshow-button-key', SLIDESHOW_HOTKEY_LABEL);
  slideshowButton.append(slideshowGlyph, slideshowText, slideshowKey);
  slideshowButton.addEventListener('click', () => {
    void viewer?.togglePresentation();
  });

  const surface = createElement(documentRef, 'div', 'pptx-render-surface');
  shell.append(loading, error, slideshowButton, surface);
  target.replaceChildren(style, shell);

  // A viewer owns the shortcut only after the user interacts with it. Moving
  // focus or the pointer back to the host page releases that ownership.
  const activateShell = () => {
    activePptxShells.set(documentRef, shell);
  };
  const deactivateShell = (event: Event) => {
    if (viewer?.presenting || activePptxShells.get(documentRef) !== shell) {
      return;
    }
    if (event.composedPath().includes(shell)) {
      return;
    }
    const targetElement = event.target as HTMLElement | null;
    if (
      event.type === 'focusin' &&
      !targetElement?.matches('button, a, input, textarea, select, [contenteditable], [tabindex]')
    ) {
      return;
    }
    activePptxShells.delete(documentRef);
  };
  shell.addEventListener('pointerdown', activateShell);
  shell.addEventListener('focusin', activateShell);
  documentRef.addEventListener('pointerdown', deactivateShell);
  documentRef.addEventListener('focusin', deactivateShell);

  // F5 mirrors PowerPoint; P is the keyboard-only toggle for browsers where F5 is spoken for.
  // Typing in a field must never start a slideshow, so editable targets are skipped.
  const isEditableTarget = (node: EventTarget | null) => {
    const element = node as HTMLElement | null;
    if (!element || typeof element.closest !== 'function') {
      return false;
    }
    return Boolean(element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  };

  const handleShortcut = (event: KeyboardEvent) => {
    if (disposed || !viewer || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key !== 'F5' && event.key !== 'p' && event.key !== 'P') {
      return;
    }
    if (!shell.isConnected || isEditableTarget(event.target)) {
      return;
    }
    // Only the focused/last-activated shell answers, and a key pressed inside
    // another shell belongs to that shell.
    if (activePptxShells.get(documentRef) !== shell) {
      return;
    }
    const targetElement = event.target as HTMLElement | null;
    if (targetElement && typeof targetElement.closest === 'function') {
      const targetShell = targetElement.closest('.pptx-viewer-shell');
      if (targetShell && targetShell !== shell) {
        return;
      }
    }
    event.preventDefault();
    void viewer.togglePresentation();
  };
  documentRef.addEventListener('keydown', handleShortcut);
  context?.registerThumbnailAdapter?.({
    captureSource: 'embedded',
    beforeCapture: async ({ signal }) => {
      const hasFirstVisual = () => Boolean(
        viewer?.thumbnailDataUrl || surface.querySelector('.slide, .flyfish-pptx-thumbnail')
      );
      while ((state === 'loading' || (state === 'ready' && !hasFirstVisual())) && !disposed) {
        if (signal?.aborted) {
          throw signal.reason;
        }
        await new Promise(resolve => {
          if (targetWindow) targetWindow.setTimeout(resolve, 16);
          else setTimeout(resolve, 16);
        });
      }
      if (state === 'error') {
        throw new Error(errorMessage || t('presentation.error.parseFailed'));
      }
    },
    capture: () => viewer?.thumbnailDataUrl
      ? fetch(viewer.thumbnailDataUrl).then(response => response.blob())
      : null,
    // Keep the renderer ancestry in the snapshot: slide CSS is scoped below
    // .pptx-render-surface and loses layout when the slide node is cloned alone.
    getTarget: () => surface,
  });

  const getCurrentZoomPercent = () => clampZoomPercent(viewer?.zoomPercent ?? zoomPercent);

  const getZoomState = (): FileViewerZoomState => {
    const percent = getCurrentZoomPercent();
    return {
      scale: percent / 100,
      label: `${percent}%`,
      canZoomIn: percent < 300,
      canZoomOut: percent > 25,
      canReset: percent !== 100,
      minScale: 0.25,
      maxScale: 3,
    };
  };

  const setZoom = async (percent: number) => {
    const nextPercent = clampZoomPercent(percent);
    zoomPercent = nextPercent;
    if (viewer) {
      await viewer.setZoom(nextPercent);
      zoomPercent = getCurrentZoomPercent();
    }
    zoomEmitter.emit();
    return getZoomState();
  };

  const notifyProgressiveReady = () => {
    if (progressiveReady || disposed || context?.signal?.aborted) {
      return;
    }
    progressiveReady = true;
    context?.onProgressiveRender?.();
  };

  const syncUi = () => {
    loading.hidden = !(state === 'loading' && !errorMessage);
    error.hidden = state !== 'error';
    t.bind(errorText, node => { node.textContent = errorCopy?.(context?.options) || errorMessage; });
    surface.classList.toggle('is-loading', state === 'loading');
    const presenting = Boolean(viewer?.presenting);
    slideshowButton.hidden = state !== 'ready' || (viewer?.slideCount ?? 0) === 0;
    t.bind(slideshowText, localizedNode => { localizedNode.textContent = presenting
      ? t('presentation.slideshow.exit')
      : t('presentation.slideshow.start'); }, 'textContent');
    slideshowButton.setAttribute('aria-pressed', presenting ? 'true' : 'false');
  };

  const registerExportAdapter = () => {
    context?.registerExportAdapter?.(buildExportAdapter(surface, targetWindow, () => viewer));
  };

  const reportPptxFailure = (failure: unknown) => {
    state = 'error';
    const retainedDiagnostic = isPptxDiagnosticErrorLike(failure)
      ? { ...failure }
      : classifyPptxErrorString(normalizeFileViewerErrorMessage(failure, context?.options));
    errorCopy = retainedDiagnostic ? i18n => formatPptxDiagnosticError(
      retainedDiagnostic,
      translateFileViewerMessage(i18n, 'presentation.error.parseFailed'),
      { ...context, options: { ...context?.options, ...i18n } }
    ) : undefined;
    errorMessage = formatErrorMessage(failure, t('presentation.error.parseFailed'), context);
    context?.registerExportAdapter?.(null);
    syncUi();
    return attachFileViewerErrorMessage(failure, errorCopy || errorMessage);
  };

  registerFileViewerZoomProvider(shell, {
    zoomIn: () => setZoom(getCurrentZoomPercent() + 15),
    zoomOut: () => setZoom(getCurrentZoomPercent() - 15),
    resetZoom: () => setZoom(100),
    setZoom: scale => setZoom(scale * 100),
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  const openPresentation = async () => {
    state = 'loading';
    errorMessage = '';
    errorCopy = undefined;
    progressiveReady = false;
    syncUi();
    const presentationOptions = context?.options?.presentation;
    let resolveCompletion!: () => void;
    let rejectCompletion!: (reason: unknown) => void;
    const completion = new Promise<void>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    // Abort/error may arrive while PptxViewer.open() is still resolving. Mark
    // the completion promise handled immediately, then await the same promise
    // below so cancellation cannot surface as a transient unhandled rejection.
    void completion.catch(() => {});
    const abort = () => {
      const reason = context?.signal?.reason || new DOMException('PPTX rendering aborted.', 'AbortError');
      viewer?.destroy();
      viewer = null;
      rejectCompletion(reason);
    };
    context?.signal?.addEventListener('abort', abort, { once: true });

    try {
      if (context?.signal?.aborted) {
        throw context.signal.reason || new DOMException('PPTX rendering aborted.', 'AbortError');
      }
      // Use a package-emitted Worker without probing unrelated manifest URLs.
      // Angular production still needs the CLI's verified copy when its builder
      // leaves dependency-relative Worker references untouched.
      const workerUrl = presentationOptions?.workerUrl || getDefaultFileViewerAssetBaseUrl()
        ? resolveFileViewerPresentationWorkerUrl(presentationOptions, resolveFileViewerRuntimeAssetBaseUrl(documentRef))
        : resolvePptxPackageWorkerUrl() ||
          await resolveFileViewerCopiedAssetUrl(documentRef, 'office-presentation', 'pptx-worker', context?.signal);
      if (context?.signal?.aborted) {
        throw context.signal.reason || new DOMException('PPTX rendering aborted.', 'AbortError');
      }
      if (!workerUrl) {
        throw new Error(
          'PPTX Worker URL is unavailable. Run file-viewer-copy-assets or provide presentation.workerUrl.'
        );
      }
      const nextViewer = await PptxViewer.open(buffer, surface, {
        styleRoot: resolvePptxStyleRoot(surface, context),
        fitMode: 'contain',
        zoomPercent,
        workerUrl,
        workerType: presentationOptions?.workerType,
        zipLimits: RECOMMENDED_ZIP_LIMITS,
        lazySlides: true,
        lazyMedia: true,
        listOptions: {
          windowed: true,
          initialSlides: 3,
          batchSize: 4,
          overscanViewport: 1.5,
        },
        presentationLabels: {
          exit: t('presentation.slideshow.exit'),
          hint: t('presentation.slideshow.hint'),
        },
        onPresentationChange: state => {
          if (!disposed) {
            if (state.active) {
              activePptxShells.set(documentRef, shell);
            }
            syncUi();
          }
        },
        onSlideRendered: () => notifyProgressiveReady(),
        onRenderComplete: () => {
          if (disposed || context?.signal?.aborted) {
            return;
          }
          state = 'ready';
          notifyProgressiveReady();
          zoomPercent = getCurrentZoomPercent();
          syncUi();
          zoomEmitter.emit();
          resolveCompletion();
        },
        onSlideError: (_index, error) => {
          console.warn('PPTX slide render warning:', error);
        },
        onError: error => {
          if (disposed || context?.signal?.aborted) {
            return;
          }
          rejectCompletion(reportPptxFailure(error));
        },
      });

      if (disposed || context?.signal?.aborted) {
        nextViewer.destroy();
        throw context?.signal?.reason || new DOMException('PPTX rendering aborted.', 'AbortError');
      }

      viewer = nextViewer;
      await completion;
      if (disposed || context?.signal?.aborted) {
        throw context?.signal?.reason || new DOMException('PPTX rendering aborted.', 'AbortError');
      }
      zoomPercent = getCurrentZoomPercent();
      registerExportAdapter();
      syncUi();
      zoomEmitter.emit();
    } catch (error) {
      if (disposed || context?.signal?.aborted) {
        throw error;
      }
      viewer?.destroy();
      viewer = null;
      throw reportPptxFailure(error);
    } finally {
      context?.signal?.removeEventListener('abort', abort);
    }
  };

  const cleanup = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    documentRef.removeEventListener('keydown', handleShortcut);
    documentRef.removeEventListener('pointerdown', deactivateShell);
    documentRef.removeEventListener('focusin', deactivateShell);
    shell.removeEventListener('pointerdown', activateShell);
    shell.removeEventListener('focusin', activateShell);
    if (activePptxShells.get(documentRef) === shell) {
      activePptxShells.delete(documentRef);
    }
    context?.registerExportAdapter?.(null);
    context?.registerThumbnailAdapter?.(null);
    unregisterFileViewerZoomProvider(shell);
    viewer?.destroy();
    viewer = null;
    target.replaceChildren();
  };

  try {
    await openPresentation();
  } catch (error) {
    cleanup();
    throw error;
  }

  return {
    $el: shell,
    unmount: cleanup,
  };
}

const presentationDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'office-presentation'
) as RendererDefinition | undefined;

if (!presentationDefinition) {
  throw new Error('@file-viewer/renderer-pptx could not locate the core PPTX renderer definition.');
}

export const presentationRendererDefinition = presentationDefinition;
export const renderFileViewerPresentation = renderPptx as FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

export const pptxRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-presentation-pptx',
  label: 'Flyfish File Viewer PPTX renderer',
  definitions: [presentationRendererDefinition],
  handlers: [
    {
      rendererId: presentationRendererDefinition.id,
      handler: renderFileViewerPresentation,
    },
  ],
};
