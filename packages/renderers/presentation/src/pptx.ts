import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@file-viewer/pptx';
import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter,
  getFileViewerShadowRootForNode,
  normalizeFileViewerErrorMessage,
  registerFileViewerZoomProvider,
  resolveFileViewerLocale,
  resolveFileViewerPresentationWorkerUrl,
  resolveFileViewerRuntimeAssetBaseUrl,
  waitForFileViewerNextPaint,
  unregisterFileViewerZoomProvider,
} from '@file-viewer/core';
import type {
  FileRenderContext,
  FileRenderExportAdapter,
  FileViewerRenderedInstance,
  FileViewerZoomState,
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

type PptxDiagnosticCopy = {
  zh: string;
  en: string;
  ja: string;
  de: string;
};

type PptxDiagnosticErrorLike = Partial<PptxDiagnosticError> & {
  name?: string;
  code?: string;
  stage?: string;
  message?: string;
  detail?: string;
  hint?: string;
};

const pptxDiagnosticMessages: Record<string, PptxDiagnosticCopy> = {
  PPTX_FILE_EMPTY: {
    zh: '文件为空或过小，无法读取。',
    en: 'The file is empty or too small to read.',
    ja: 'ファイルが空であるか小さすぎるため、読み込めません。',
    de: 'Die Datei ist leer oder zu klein zum Lesen.',
  },
  PPTX_FILE_TOO_LARGE: {
    zh: '文件超过浏览器安全预览体积限制。',
    en: 'The file is larger than the browser-safe preview limit.',
    ja: 'ファイルがブラウザーで安全にプレビューできるサイズ上限を超えています。',
    de: 'Die Datei überschreitet die sichere Vorschaugröße des Browsers.',
  },
  PPTX_INVALID_ZIP: {
    zh: '文件不是有效的 PowerPoint OpenXML 压缩包。',
    en: 'The file is not a valid PowerPoint OpenXML package.',
    ja: '有効な PowerPoint OpenXML パッケージではありません。',
    de: 'Die Datei ist kein gültiges PowerPoint-OpenXML-Paket.',
  },
  PPTX_MISSING_CONTENT_TYPES: {
    zh: '文件缺少 [Content_Types].xml，无法识别内部结构。',
    en: 'The package is missing [Content_Types].xml, so its structure cannot be identified.',
    ja: '[Content_Types].xml がないため、内部構造を識別できません。',
    de: '[Content_Types].xml fehlt; die Paketstruktur kann nicht erkannt werden.',
  },
  PPTX_MISSING_PRESENTATION: {
    zh: '文件缺少 ppt/presentation.xml，无法读取幻灯片列表。',
    en: 'The package is missing ppt/presentation.xml, so the slide list cannot be read.',
    ja: 'ppt/presentation.xml がないため、スライド一覧を読み込めません。',
    de: 'ppt/presentation.xml fehlt; die Folienliste kann nicht gelesen werden.',
  },
  PPTX_NO_SLIDES: {
    zh: '文件中没有找到可预览的幻灯片。',
    en: 'No previewable slides were found in the file.',
    ja: 'プレビュー可能なスライドが見つかりませんでした。',
    de: 'Es wurden keine Folien für die Vorschau gefunden.',
  },
  PPTX_MISSING_SLIDE: {
    zh: '文件缺少某一页幻灯片内容。',
    en: 'The package is missing one of the slide parts.',
    ja: 'スライド部品の一部がありません。',
    de: 'Ein Folienbestandteil fehlt im Paket.',
  },
  PPTX_SLIDE_RENDER_FAILED: {
    zh: '某一页幻灯片解析失败。',
    en: 'One slide failed to parse.',
    ja: 'スライドの解析に失敗しました。',
    de: 'Eine Folie konnte nicht verarbeitet werden.',
  },
  PPTX_WORKER_FAILED: {
    zh: 'PPTX Worker 启动或运行失败。',
    en: 'The PPTX Worker failed to start or run.',
    ja: 'PPTX Worker の起動または実行に失敗しました。',
    de: 'Der PPTX-Worker konnte nicht gestartet oder ausgeführt werden.',
  },
  PPTX_PARSE_FAILED: {
    zh: 'PPTX 文件解析失败。',
    en: 'The PPTX file could not be parsed.',
    ja: 'PPTX ファイルを解析できませんでした。ファイルを再保存するか、入力元を確認してください。',
    de: 'Die PPTX-Datei konnte nicht verarbeitet werden.',
  },
};

const pptxDiagnosticFallbackHints: Record<string, PptxDiagnosticCopy> = {
  PPTX_INVALID_ZIP: {
    zh: '请确认接口返回的是原始 .pptx 二进制文件，而不是登录页、HTML/JSON 错误响应或被截断的内容。',
    en: 'Confirm that the response is the original .pptx binary, not a login page, HTML/JSON error response, or truncated download.',
    ja: 'レスポンスがログインページや HTML/JSON エラー、途中で切れたデータではなく、元の .pptx バイナリであることを確認してください。',
    de: 'Prüfen Sie, ob die Antwort die ursprüngliche .pptx-Datei und keine Anmeldeseite, HTML/JSON-Fehlerantwort oder unvollständige Datei enthält.',
  },
  PPTX_WORKER_FAILED: {
    zh: '请检查 presentation.workerUrl、Worker 文件路径、MIME 类型、CSP 和跨域策略。',
    en: 'Check presentation.workerUrl, the Worker file path, MIME type, CSP, and cross-origin policy.',
    ja: 'presentation.workerUrl、Worker のパス、MIME type、CSP、cross-origin policy を確認してください。',
    de: 'Prüfen Sie presentation.workerUrl, den Worker-Pfad, den MIME-Typ, CSP und die Cross-Origin-Richtlinie.',
  },
  PPTX_NO_SLIDES: {
    zh: '请重新保存演示文稿，或检查包内是否存在 ppt/slides/slide*.xml。',
    en: 'Re-save the presentation, or check whether ppt/slides/slide*.xml exists inside the package.',
    ja: 'プレゼンテーションを再保存するか、パッケージに ppt/slides/slide*.xml があるか確認してください。',
    de: 'Speichern Sie die Präsentation erneut oder prüfen Sie, ob ppt/slides/slide*.xml im Paket vorhanden ist.',
  },
};

const localizePptxDiagnosticCopy = (
  copy: PptxDiagnosticCopy | undefined,
  locale: string
) => {
  if (!copy) {
    return '';
  }
  return locale === 'zh-CN' ? copy.zh : locale === 'ja-JP' ? copy.ja : locale === 'de-DE' ? copy.de : copy.en;
};

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
  const localizedReason = localizePptxDiagnosticCopy(pptxDiagnosticMessages[code], locale);
  const rawReason = sanitizePptxDiagnosticText(error.message);
  const reason = (
    locale === 'zh-CN'
      ? rawReason || localizedReason
      : localizedReason || rawReason
  ) || fallback;
  const detail = sanitizePptxDiagnosticText(error.detail);
  const hint = sanitizePptxDiagnosticText(error.hint) ||
    localizePptxDiagnosticCopy(pptxDiagnosticFallbackHints[code], locale);
  const stage = sanitizePptxDiagnosticText(error.stage);
  const usesWesternPunctuation = locale === 'en-US' || locale === 'de-DE';
  const separator = usesWesternPunctuation ? ': ' : '：';
  const parts = [`${fallback}${separator}${reason}`];

  if (stage) {
    parts.push(locale === 'zh-CN' ? `阶段：${stage}` : locale === 'ja-JP' ? `段階：${stage}` : locale === 'de-DE' ? `Phase: ${stage}` : `Stage: ${stage}`);
  }
  if (detail && detail !== reason) {
    parts.push(locale === 'zh-CN' ? `详情：${detail}` : locale === 'ja-JP' ? `詳細：${detail}` : locale === 'de-DE' ? `Details: ${detail}` : `Detail: ${detail}`);
  }
  if (hint) {
    parts.push(locale === 'zh-CN' ? `建议：${hint}` : locale === 'ja-JP' ? `対処：${hint}` : locale === 'de-DE' ? `Hinweis: ${hint}` : `Hint: ${hint}`);
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
  const t = createFileViewerTranslator(context?.options);
  const documentRef = target.ownerDocument || document;
  const targetWindow = documentRef.defaultView || (typeof window !== 'undefined' ? window : null);
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  let viewer: PptxViewer | null = null;
  let state: PptxRenderState = 'loading';
  let errorMessage = '';
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
    createElement(documentRef, 'span', undefined, t('presentation.state.loading'))
  );

  const error = createElement(documentRef, 'div', 'pptx-error');
  const errorTitle = createElement(documentRef, 'strong', undefined, t('presentation.error.title'));
  const errorText = createElement(documentRef, 'p');
  error.append(errorTitle, errorText);

  const slideshowButton = createElement(documentRef, 'button', 'pptx-slideshow-button');
  slideshowButton.type = 'button';
  slideshowButton.hidden = true;
  const slideshowGlyph = createElement(documentRef, 'span', 'pptx-slideshow-button-glyph', '▶');
  const slideshowText = createElement(documentRef, 'span', undefined, t('presentation.slideshow.start'));
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
    errorText.textContent = errorMessage;
    surface.classList.toggle('is-loading', state === 'loading');
    const presenting = Boolean(viewer?.presenting);
    slideshowButton.hidden = state !== 'ready' || (viewer?.slideCount ?? 0) === 0;
    slideshowText.textContent = presenting
      ? t('presentation.slideshow.exit')
      : t('presentation.slideshow.start');
    slideshowButton.setAttribute('aria-pressed', presenting ? 'true' : 'false');
  };

  const registerExportAdapter = () => {
    context?.registerExportAdapter?.(buildExportAdapter(surface, targetWindow, () => viewer));
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
      const nextViewer = await PptxViewer.open(buffer, surface, {
        styleRoot: resolvePptxStyleRoot(surface, context),
        fitMode: 'contain',
        zoomPercent,
        // Keep the PPTX package's own worker fallback when the host did not
        // configure a self-hosted worker. Resolving the generic default here
        // would point Vite development at /vendor/pptx/pptx.worker.js, where
        // the SPA fallback is HTML rather than worker JavaScript.
        workerUrl: presentationOptions?.workerUrl
          ? resolveFileViewerPresentationWorkerUrl(
              presentationOptions,
              resolveFileViewerRuntimeAssetBaseUrl(documentRef)
            )
          : undefined,
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
          state = 'error';
          errorMessage = formatErrorMessage(error, t('presentation.error.parseFailed'), context);
          context?.registerExportAdapter?.(null);
          syncUi();
          rejectCompletion(error);
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
      state = 'error';
      errorMessage = formatErrorMessage(error, t('presentation.error.parseFailed'), context);
      context?.registerExportAdapter?.(null);
      syncUi();
      throw error;
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
