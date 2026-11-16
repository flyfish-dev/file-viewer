import {
  createFileViewerTranslator,
  createFileViewerI18nBindings,
  createFileViewerZoomChangeEmitter,
  normalizeFileViewerErrorMessage,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
} from '@file-viewer/core';
import type {
  FileRenderContext,
  FileViewerRenderedInstance,
  FileViewerZoomState,
} from '@file-viewer/core';

type OfdModule = typeof import('../vendor/dltech/ofd/ofd.js');
type OfdRenderState = 'loading' | 'ready' | 'error';

const OFD_MIN_SCALE = 0.35;
const OFD_MAX_SCALE = 3;
const OFD_ZOOM_STEP = 0.1;

const ofdStyle = `
.ofd-viewer{position:relative;display:flex;box-sizing:border-box;min-height:100%;min-width:0;flex-direction:column;background:var(--file-viewer-render-surface-background,#e9edf2);color:#172033;font-family:Aptos,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
.ofd-viewer *{box-sizing:border-box}
.ofd-toolbar{position:sticky;top:0;z-index:4;display:flex;min-height:44px;align-items:center;justify-content:center;border-bottom:1px solid rgba(148,163,184,.32);background:rgba(255,255,255,.92);box-shadow:0 4px 14px rgba(15,23,42,.06);backdrop-filter:blur(10px)}
.ofd-toolbar-group{display:inline-flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid #d7dee8;border-radius:9px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.06)}
.ofd-page-button{display:inline-flex;width:30px;height:30px;align-items:center;justify-content:center;border:1px solid transparent;border-radius:7px;color:#334155;background:transparent;font:700 22px/1 Aptos,'Segoe UI',sans-serif;cursor:pointer}
.ofd-page-button:hover:not(:disabled){border-color:#b9d4f6;color:#1769d8;background:#edf5ff}
.ofd-page-button:focus-visible{outline:2px solid #408fff;outline-offset:1px}
.ofd-page-button:disabled{color:#a7b0bd;cursor:not-allowed}
.ofd-page-meter{display:inline-flex;min-width:92px;align-items:baseline;justify-content:center;gap:5px;color:#64748b;font-size:12px;white-space:nowrap}
.ofd-page-meter strong{color:#172033;font-size:13px}
.ofd-stage{position:relative;flex:1;min-width:0;min-height:0;padding:18px 0 28px;overflow:auto;scrollbar-gutter:stable}
.ofd-state{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;background:rgba(246,248,250,.92);color:#64748b;font-size:14px}
.ofd-state[hidden]{display:none!important}
.ofd-state.error{color:#b42318}
.ofd-page-frame{position:relative;display:block;margin:0 auto 20px;overflow:visible}
.ofd-page{display:block;margin-left:auto!important;margin-right:auto!important;background:#fff!important;color:#111827!important;color-scheme:only light;forced-color-adjust:none;isolation:isolate;box-shadow:0 10px 26px rgba(15,23,42,.12);transition:none}
.ofd-page.ofd-page--zoom-ready{transition:transform .16s ease}
.ofd-page,.ofd-page *{color-scheme:only light;forced-color-adjust:none}
.ofd-page svg,.ofd-page canvas,.ofd-page img{filter:none!important;mix-blend-mode:normal!important}
[data-viewer-theme='dark'] .ofd-viewer{background:var(--file-viewer-render-surface-background,#172033);color:#e5eef8}
[data-viewer-theme='dark'] .ofd-state{background:rgba(15,23,42,.9);color:#cbd5e1}
[data-viewer-theme='dark'] .ofd-toolbar{border-color:rgba(100,116,139,.5);background:rgba(15,23,42,.9)}
[data-viewer-theme='dark'] .ofd-toolbar-group{border-color:#475569;background:#1e293b}
[data-viewer-theme='dark'] .ofd-page-button{color:#e2e8f0}
[data-viewer-theme='dark'] .ofd-page-button:hover:not(:disabled){border-color:#4d79ad;color:#93c5fd;background:#263b55}
[data-viewer-theme='dark'] .ofd-page-button:disabled{color:#64748b}
[data-viewer-theme='dark'] .ofd-page-meter{color:#94a3b8}
[data-viewer-theme='dark'] .ofd-page-meter strong{color:#f1f5f9}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .ofd-viewer{background:var(--file-viewer-render-surface-background,#172033);color:#e5eef8}[data-viewer-theme='system'] .ofd-state{background:rgba(15,23,42,.9);color:#cbd5e1}[data-viewer-theme='system'] .ofd-toolbar{border-color:rgba(100,116,139,.5);background:rgba(15,23,42,.9)}[data-viewer-theme='system'] .ofd-toolbar-group{border-color:#475569;background:#1e293b}[data-viewer-theme='system'] .ofd-page-button{color:#e2e8f0}[data-viewer-theme='system'] .ofd-page-button:hover:not(:disabled){border-color:#4d79ad;color:#93c5fd;background:#263b55}[data-viewer-theme='system'] .ofd-page-button:disabled{color:#64748b}[data-viewer-theme='system'] .ofd-page-meter{color:#94a3b8}[data-viewer-theme='system'] .ofd-page-meter strong{color:#f1f5f9}}
@media (prefers-reduced-motion:reduce){.ofd-page.ofd-page--zoom-ready{transition:none}}
@media print{.ofd-viewer{display:block;background:#fff!important}.ofd-toolbar{display:none!important}.ofd-stage{padding:0!important;overflow:visible!important}.ofd-page-frame{break-after:page;page-break-after:always;margin:0 auto!important}.ofd-page-frame:last-child{break-after:auto;page-break-after:auto}.ofd-page{box-shadow:none!important;transition:none!important}}
`;

const loadOfdModule = (() => {
  let modulePromise: Promise<OfdModule> | null = null;
  return () => {
    modulePromise ||= import('../vendor/dltech/ofd/ofd.js');
    return modulePromise;
  };
})();

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = ofdStyle;
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

const normalizeError = (
  reason: unknown,
  fallback: string,
  context?: FileRenderContext
) => {
  if (reason instanceof Error || typeof reason === 'string') {
    return normalizeFileViewerErrorMessage(reason, context?.i18n || context?.options);
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason || fallback);
  }
};

const clampZoom = (value: number) => Math.min(
  OFD_MAX_SCALE,
  Math.max(OFD_MIN_SCALE, Number(value.toFixed(2)))
);

const waitForPaint = (view?: Window | null) => new Promise<void>(resolve => {
  if (view?.requestAnimationFrame) {
    view.requestAnimationFrame(() => resolve());
    return;
  }
  globalThis.setTimeout(resolve, 0);
});

const parseWithOfdJs = (ofd: OfdModule, buffer: ArrayBuffer) => {
  return new Promise<unknown[]>((resolve, reject) => {
    // 使用 DLTech21/ofd.js 的纯 JS 解析入口，签章验签链路不阻断正文预览。
    ofd.parseOfdDocument({
      ofd: buffer,
      success: documents => resolve(documents),
      fail: reason => reject(reason),
    });
  });
};

const appendPages = (
  documentRef: Document,
  target: HTMLDivElement,
  pages: HTMLElement[]
) => {
  const fragment = documentRef.createDocumentFragment();

  pages.forEach(page => {
    const frame = documentRef.createElement('div');
    frame.className = 'ofd-page-frame';
    page.classList.add('ofd-page');
    page.dataset.viewerThemeBoundary = 'light';
    page.style.backgroundColor = '#fff';
    page.style.color = '#111827';
    page.style.colorScheme = 'only light';
    frame.appendChild(page);
    fragment.appendChild(frame);
  });

  target.appendChild(fragment);
};

const replacePages = (
  documentRef: Document,
  target: HTMLDivElement,
  pages: HTMLElement[]
) => {
  const existingFrames = Array.from(target.children).filter(
    (element): element is HTMLElement => (
      element instanceof (target.ownerDocument.defaultView?.HTMLElement || HTMLElement) &&
      element.classList.contains('ofd-page-frame')
    )
  );
  const designerActive = existingFrames.some(frame => (
    frame.querySelector('.fv-print-mask-canvas')
  ));
  if (!designerActive) {
    target.replaceChildren();
    appendPages(documentRef, target, pages);
    return true;
  }
  if (existingFrames.length !== pages.length) {
    return false;
  }

  // The print-mask designer owns canvases attached to these stable frame
  // nodes. Replace only the rendered OFD page so a resize cannot detach the
  // active drawing surface or lose its pointer handlers.
  pages.forEach((page, index) => {
    const frame = existingFrames[index];
    const previousPage = Array.from(frame.children).find(child => (
      child.classList.contains('ofd-page')
    )) as HTMLElement | undefined;
    if (!frame || !previousPage) {
      return;
    }
    page.classList.add('ofd-page');
    page.dataset.viewerThemeBoundary = 'light';
    page.style.backgroundColor = '#fff';
    page.style.color = '#111827';
    page.style.colorScheme = 'only light';
    previousPage.replaceWith(page);
  });
  return true;
};

export default async function renderOfd(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.i18n || context?.options);
  const bindings = createFileViewerI18nBindings(context?.i18n);
  const documentRef = target.ownerDocument || document;
  const targetWindow = documentRef.defaultView || (typeof window !== 'undefined' ? window : null);
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  let disposed = false;
  let renderVersion = 0;
  let resizeObserver: ResizeObserver | null = null;
  let resizeTimer = 0;
  let lastRenderedWidth = 0;
  let state: OfdRenderState = 'loading';
  let errorMessage = '';
  let errorKey: 'ofd.error.empty' | 'ofd.error.parseFailed' | undefined;
  let emptyDocumentError: Error | undefined;
  const stateLabel = () => state === 'error'
    ? (errorKey ? t(errorKey) : errorMessage)
    : t('ofd.state.loading');
  let zoom = 1;
  let currentPage = 1;
  let pageCount = 0;
  let scrollFrame = 0;
  const trackedEvents: Array<[EventTarget, string]> = [];
  let ofdDocumentPromise: Promise<unknown> | null = null;

  const style = createStyle(documentRef);
  const viewer = createElement(documentRef, 'div', 'ofd-viewer');
  viewer.dataset.viewerZoomProvider = 'ofd';
  const stateNode = createElement(documentRef, 'div', 'ofd-state');
  const stateText = documentRef.createTextNode('');
  stateNode.append(stateText);
  bindings.text(stateText, stateLabel);
  stateNode.setAttribute('aria-live', 'polite');
  const toolbar = createElement(documentRef, 'div', 'ofd-toolbar');
  toolbar.setAttribute('role', 'toolbar');
  bindings.attr(toolbar, 'aria-label', () => t('ofd.toolbar.pageNavigation'));
  const pageGroup = createElement(documentRef, 'div', 'ofd-toolbar-group');
  const previousPageButton = createElement(documentRef, 'button', 'ofd-page-button', '‹') as HTMLButtonElement;
  previousPageButton.type = 'button';
  bindings.attr(previousPageButton, 'title', () => t('ofd.toolbar.previousPage'));
  bindings.attr(previousPageButton, 'aria-label', () => t('ofd.toolbar.previousPage'));
  const pageMeter = createElement(documentRef, 'span', 'ofd-page-meter');
  pageMeter.setAttribute('aria-live', 'polite');
  const pageMeterCurrent = createElement(documentRef, 'strong', undefined, '1');
  const pageMeterTotal = createElement(documentRef, 'span', undefined, '/ -');
  pageMeter.append(pageMeterCurrent, pageMeterTotal);
  const nextPageButton = createElement(documentRef, 'button', 'ofd-page-button', '›') as HTMLButtonElement;
  nextPageButton.type = 'button';
  bindings.attr(nextPageButton, 'title', () => t('ofd.toolbar.nextPage'));
  bindings.attr(nextPageButton, 'aria-label', () => t('ofd.toolbar.nextPage'));
  pageGroup.append(previousPageButton, pageMeter, nextPageButton);
  toolbar.append(pageGroup);
  const stage = createElement(documentRef, 'div', 'ofd-stage');
  stage.tabIndex = 0;
  bindings.attr(stage, 'aria-label', () => t('ofd.toolbar.documentPages'));
  bindings.attr(pageMeter, 'aria-label', () => pageCount
    ? t('ofd.toolbar.pageStatus', { current: currentPage, total: pageCount })
    : t('ofd.toolbar.noPages'));
  viewer.append(toolbar, stateNode, stage);
  target.replaceChildren(style, viewer);

  const clearStage = () => {
    stage.replaceChildren();
  };

  const syncState = () => {
    stateNode.hidden = state === 'ready';
    stateNode.classList.toggle('error', state === 'error');
    stateText.data = stateLabel();
  };

  const getPageFrames = () => Array.from(
    stage.querySelectorAll<HTMLElement>('.ofd-page-frame')
  );

  const syncPageNavigation = () => {
    pageCount = getPageFrames().length;
    currentPage = pageCount ? Math.min(pageCount, Math.max(1, currentPage)) : 0;
    pageMeterCurrent.textContent = pageCount ? String(currentPage) : '-';
    pageMeterTotal.textContent = `/ ${pageCount || '-'}`;
    bindings.attr(pageMeter, 'aria-label', () => pageCount
      ? t('ofd.toolbar.pageStatus', { current: currentPage, total: pageCount })
      : t('ofd.toolbar.noPages'));
    previousPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage <= 0 || currentPage >= pageCount;
  };

  const scrollToPage = (
    requestedPage: number,
    behavior: ScrollBehavior = 'smooth'
  ) => {
    const frames = getPageFrames();
    if (!frames.length) {
      currentPage = 0;
      syncPageNavigation();
      return false;
    }
    const nextPage = Math.min(frames.length, Math.max(1, Math.round(requestedPage)));
    currentPage = nextPage;
    syncPageNavigation();
    const frame = frames[nextPage - 1];
    if (typeof frame?.scrollIntoView === 'function') {
      frame.scrollIntoView({ block: 'start', inline: 'nearest', behavior });
    }
    return true;
  };

  const composedParent = (element: Element): Element | null => (
    element.assignedSlot || element.parentElement || (element.getRootNode() as ShadowRoot).host || null
  );

  const clipsVertically = (element: Element) => {
    // The root's overflow, and the body's when the root is visible, belong to
    // the window viewport. Their boxes move during window scroll and must not
    // be intersected with the viewport a second time.
    if (element === documentRef.documentElement) return false;
    const computedStyle = targetWindow?.getComputedStyle?.(element);
    const style = (element as HTMLElement).style;
    if (element === documentRef.body) {
      const root = documentRef.documentElement;
      const rootStyle = targetWindow?.getComputedStyle?.(root);
      const rootOverflowX = rootStyle?.overflowX || root.style.overflowX || root.style.overflow || '';
      const rootOverflowY = rootStyle?.overflowY || root.style.overflowY || root.style.overflow || '';
      const rootContain = rootStyle?.contain || root.style.contain || 'none';
      const bodyContain = computedStyle?.contain || style?.contain || 'none';
      if ((!rootOverflowX || rootOverflowX === 'visible') &&
          (!rootOverflowY || rootOverflowY === 'visible') &&
          rootContain === 'none' && bodyContain === 'none') return false;
    }
    const overflow = computedStyle?.overflowY ||
      style?.overflowY || style?.overflow || '';
    return /^(auto|scroll|hidden|clip)$/.test(overflow);
  };

  const visibleViewport = () => {
    let top = 0;
    let bottom = targetWindow?.innerHeight || documentRef.documentElement.clientHeight || Infinity;
    let hasStageBounds = false;
    for (let element: Element | null = stage; element; element = composedParent(element)) {
      if (element !== stage && !clipsVertically(element)) continue;
      const box = element.getBoundingClientRect();
      const html = element as HTMLElement;
      if (html.clientHeight <= 0) continue;
      const innerTop = box.top + html.clientTop;
      top = Math.max(top, innerTop);
      bottom = Math.min(bottom, innerTop + html.clientHeight);
      if (element === stage) hasStageBounds = true;
    }
    return hasStageBounds && bottom > top ? { top, bottom } : null;
  };

  const detectCurrentPage = () => {
    const frames = getPageFrames();
    if (!frames.length) {
      currentPage = 0;
      syncPageNavigation();
      return;
    }
    const viewport = visibleViewport();
    if (!viewport) return;
    const viewportCenter = (viewport.top + viewport.bottom) / 2;
    let closestIndex = 0;
    let greatestOverlap = -1;
    let closestDistance = Number.POSITIVE_INFINITY;
    frames.forEach((frame, index) => {
      const rect = frame.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const overlap = Math.max(0, Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top));
      const distance = Math.abs(center - viewportCenter);
      if (overlap > greatestOverlap || (overlap === greatestOverlap && distance < closestDistance)) {
        greatestOverlap = overlap;
        closestDistance = distance;
        closestIndex = index;
      }
    });
    const detectedPage = closestIndex + 1;
    if (detectedPage !== currentPage) {
      currentPage = detectedPage;
      syncPageNavigation();
    }
  };

  const scheduleCurrentPageDetection = () => {
    if (scrollFrame) return;
    const requestFrame = targetWindow?.requestAnimationFrame?.bind(targetWindow);
    if (requestFrame) {
      scrollFrame = requestFrame(() => {
        scrollFrame = 0;
        detectCurrentPage();
      });
      return;
    }
    scrollFrame = targetWindow?.setTimeout(() => {
      scrollFrame = 0;
      detectCurrentPage();
    }, 0) || 0;
  };

  const startScrollTracking = () => {
    const listen = (source: EventTarget, type: string) => {
      source.addEventListener(type, scheduleCurrentPageDetection, { passive: true });
      trackedEvents.push([source, type]);
    };
    for (let element: Element | null = stage; element; element = composedParent(element)) {
      listen(element, 'scroll');
    }
    if (targetWindow) {
      listen(targetWindow, 'scroll');
      listen(targetWindow, 'resize');
    }
  };

  const getOfdDocument = async (ofd: OfdModule) => {
    // OFD 解压和 XML 解析成本较高，尺寸变化只重排页面，不重复解析压缩包。
    ofdDocumentPromise ||= parseWithOfdJs(ofd, buffer).then(documents => {
      const ofdDocument = documents[0];
      if (!ofdDocument) {
        emptyDocumentError = new Error(t('ofd.error.empty'));
        throw emptyDocumentError;
      }
      return ofdDocument;
    });
    return ofdDocumentPromise;
  };

  const getRenderWidth = () => {
    const baseWidth = viewer.getBoundingClientRect().width || stage.getBoundingClientRect().width || 0;
    return Math.max(Math.floor(baseWidth - 48), 240);
  };

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < OFD_MAX_SCALE,
    canZoomOut: zoom > OFD_MIN_SCALE,
    canReset: zoom !== 1,
    minScale: OFD_MIN_SCALE,
    maxScale: OFD_MAX_SCALE,
  });

  const syncPageZoom = (animate = false) => {
    const HTMLElementCtor = targetWindow?.HTMLElement || globalThis.HTMLElement;
    stage.querySelectorAll<HTMLElement>('.ofd-page-frame').forEach(frame => {
      const page = frame.firstElementChild;
      if (!HTMLElementCtor || !(page instanceof HTMLElementCtor)) {
        return;
      }

      page.classList.toggle('ofd-page--zoom-ready', animate);
      page.style.position = 'absolute';
      page.style.top = '0';
      page.style.left = '50%';
      page.style.transform = `translateX(-50%) scale(${zoom})`;
      page.style.transformOrigin = 'top center';
      page.style.marginLeft = '0';
      page.style.marginRight = '0';

      const pageWidth = page.offsetWidth;
      const pageHeight = page.offsetHeight;
      if (!pageWidth || !pageHeight) {
        return;
      }

      frame.style.width = `${Math.ceil(pageWidth * zoom)}px`;
      frame.style.height = `${Math.ceil(pageHeight * zoom)}px`;
    });
  };

  const enablePageZoomTransitions = () => {
    stage.querySelectorAll<HTMLElement>('.ofd-page').forEach(page => {
      // Commit the initial centering transform without a transition. Otherwise
      // a newly inserted page animates from `none` to `translateX(-50%)` and
      // looks like the document was opened a second time.
      page.getBoundingClientRect();
      page.classList.add('ofd-page--zoom-ready');
    });
  };

  const setZoom = (nextZoom: number) => {
    zoom = clampZoom(nextZoom);
    syncPageZoom(true);
    scheduleCurrentPageDetection();
    zoomEmitter.emit();
    return getZoomState();
  };

  registerFileViewerZoomProvider(viewer, {
    zoomIn: () => setZoom(zoom + OFD_ZOOM_STEP),
    zoomOut: () => setZoom(zoom - OFD_ZOOM_STEP),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  const renderWithOfdJs = async (width: number) => {
    const ofd = await loadOfdModule();
    const ofdDocument = await getOfdDocument(ofd);
    if (disposed) {
      return [];
    }
    return Promise.resolve(ofd.renderOfd(width, ofdDocument));
  };

  const render = async (options: {
    force?: boolean;
    showLoading?: boolean;
    rejectOnError?: boolean;
  } = {}) => {
    if (disposed) {
      return;
    }
    if (context?.signal?.aborted) {
      throw context.signal.reason || new DOMException('OFD rendering aborted.', 'AbortError');
    }

    const width = getRenderWidth();
    if (!options.force && state === 'ready' && Math.abs(width - lastRenderedWidth) < 8) {
      return;
    }

    const version = ++renderVersion;
    if (options.showLoading || state !== 'ready') {
      state = 'loading';
      clearStage();
      syncState();
    }
    errorMessage = '';
    errorKey = undefined;

    try {
      await waitForPaint(targetWindow);
      const pages = await renderWithOfdJs(width);
      if (disposed || version !== renderVersion) {
        return;
      }
      if (context?.signal?.aborted) {
        throw context.signal.reason || new DOMException('OFD rendering aborted.', 'AbortError');
      }

      if (!replacePages(documentRef, stage, pages)) {
        return;
      }
      lastRenderedWidth = width;
      await waitForPaint(targetWindow);
      if (disposed || version !== renderVersion) return;
      if (context?.signal?.aborted) {
        throw context.signal.reason || new DOMException('OFD rendering aborted.', 'AbortError');
      }
      syncPageZoom();
      enablePageZoomTransitions();
      syncPageNavigation();
      if (currentPage > 1) scrollToPage(currentPage, 'auto');
      scheduleCurrentPageDetection();
      state = 'ready';
      syncState();
      zoomEmitter.emit();
      context?.onProgressiveRender?.();
    } catch (reason) {
      if (disposed || version !== renderVersion) {
        return;
      }
      if (context?.signal?.aborted) {
        if (options.rejectOnError) throw reason;
        return;
      }
      if (options.rejectOnError) {
        // The outer viewer owns the failure detail. Do not read a user getter twice.
        state = 'error';
        errorKey = 'ofd.error.parseFailed';
        errorMessage = '';
        syncState();
        throw reason;
      }
      // Capture user/vendor details once. Only our own empty/fallback labels remain live.
      const ownedEmpty = reason === emptyDocumentError && emptyDocumentError !== undefined;
      const detail = ownedEmpty ? '' : normalizeError(reason, t('ofd.error.parseFailed'), context);
      if (disposed || version !== renderVersion) return;
      errorKey = ownedEmpty ? 'ofd.error.empty' : !detail ? 'ofd.error.parseFailed' : undefined;
      errorMessage = detail || '';
      state = 'error';
      syncState();
    }
  };

  const startResizeObserver = () => {
    if (!targetWindow?.ResizeObserver || resizeObserver) {
      return;
    }

    resizeObserver = new targetWindow.ResizeObserver(() => {
      targetWindow.clearTimeout(resizeTimer);
      resizeTimer = targetWindow.setTimeout(() => {
        void render({ showLoading: false });
      }, 180);
    });
    resizeObserver.observe(viewer);
  };

  previousPageButton.addEventListener('click', () => {
    scrollToPage(currentPage - 1);
  });
  nextPageButton.addEventListener('click', () => {
    scrollToPage(currentPage + 1);
  });
  stage.addEventListener('keydown', event => {
    if (event.key === 'PageUp') {
      event.preventDefault();
      scrollToPage(currentPage - 1);
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      scrollToPage(currentPage + 1);
    } else if (event.key === 'Home' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      scrollToPage(1);
    } else if (event.key === 'End' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      scrollToPage(pageCount);
    }
  });

  try {
    // Do not report the renderer as loaded until page surfaces exist. This
    // keeps immediate print/mask operations page-aware and propagates initial
    // parse failures through the normal renderer error lifecycle.
    await render({ force: true, showLoading: true, rejectOnError: true });
    if (!disposed) {
      startScrollTracking();
      startResizeObserver();
    }
  } catch (error) {
    bindings.destroy();
    unregisterFileViewerZoomProvider(viewer);
    throw error;
  }
  context?.registerThumbnailAdapter?.({
    beforeCapture: async ({ signal }) => {
      while (state === 'loading' && !disposed) {
        if (signal?.aborted) {
          throw signal.reason;
        }
        await new Promise(resolve => {
          if (targetWindow) targetWindow.setTimeout(resolve, 16);
          else setTimeout(resolve, 16);
        });
      }
      if (state === 'error') {
        throw new Error(errorKey ? t(errorKey) : errorMessage || t('ofd.error.parseFailed'));
      }
    },
    getTarget: () => stage.querySelector('.ofd-page-frame, .ofd-page') || stage,
  });
  context?.registerExportAdapter?.({
    print: true,
    exportHtml: true,
    includeDocumentStyles: true,
    getPrintMaskPages: () => Array.from(
      stage.querySelectorAll<HTMLElement>('.ofd-page-frame')
    ),
    toHtml: () => {
      const clone = stage.cloneNode(true) as HTMLElement;
      clone.querySelectorAll<HTMLElement>('.ofd-page-frame').forEach((page, index) => {
        page.dataset.viewerPrintPageIndex = String(index);
      });
      return clone.outerHTML;
    },
  });

  return {
    $el: viewer,
    unmount() {
      disposed = true;
      bindings.destroy();
      renderVersion += 1;
      targetWindow?.clearTimeout(resizeTimer);
      if (scrollFrame) {
        if (targetWindow?.cancelAnimationFrame) targetWindow.cancelAnimationFrame(scrollFrame);
        else targetWindow?.clearTimeout(scrollFrame);
      }
      scrollFrame = 0;
      trackedEvents.forEach(([source, type]) => source.removeEventListener(type, scheduleCurrentPageDetection));
      trackedEvents.length = 0;
      resizeObserver?.disconnect();
      resizeObserver = null;
      unregisterFileViewerZoomProvider(viewer);
      clearStage();
      context?.registerExportAdapter?.(null);
      context?.registerThumbnailAdapter?.(null);
    },
  };
}
