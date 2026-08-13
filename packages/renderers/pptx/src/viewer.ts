import { renderPptxPostProcessing } from './chart';
import type { PptxPostProcessingHandle } from './chart';
import { resolvePptxEngineOptions, RECOMMENDED_ZIP_LIMITS } from './options';
import { sanitizePptxCss, sanitizePptxMarkup } from './sanitize';
import { ensurePptxViewerStyles } from './styles';
import type { PptxDiagnosticError, PptxSlideSize, PptxViewerOptions, PptxWorkerMessage } from './types';
import { createPptxWorker } from './worker';

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const toPercent = (value: number | undefined) => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 100;
  return clamp(numeric, 25, 300);
};

const stringifyErrorDetail = (error: unknown) => {
  if (error === undefined || error === null) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : String(error);
  } catch {
    return String(error);
  }
};

const createPptxDiagnosticError = (
  code: PptxDiagnosticError['code'],
  stage: string,
  message: string,
  detailOrError?: unknown,
  hint?: string
): PptxDiagnosticError => ({
  name: 'PptxDiagnosticError',
  code,
  stage,
  message,
  detail: stringifyErrorDetail(detailOrError),
  hint,
});

const ensureZipWithinLimits = (buffer: ArrayBuffer, options: PptxViewerOptions) => {
  const limits = {
    ...RECOMMENDED_ZIP_LIMITS,
    ...options.zipLimits,
  };

  if (limits.maxFileBytes && buffer.byteLength > limits.maxFileBytes) {
    throw createPptxDiagnosticError(
      'PPTX_FILE_TOO_LARGE',
      'preflight',
      'PPTX 文件超过浏览器安全预览体积限制。',
      `${buffer.byteLength} bytes > ${limits.maxFileBytes} bytes`,
      '请压缩图片、拆分演示文稿，或在业务侧提高 zipLimits.maxFileBytes 后再预览。'
    );
  }
};

const appendHtml = (container: HTMLElement, html: string) => {
  const fragment = sanitizePptxMarkup(container.ownerDocument, html);
  const nodes = Array.from(fragment.children);
  container.append(fragment);
  return nodes[0] || null;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildSlideErrorHtml = (slideNumber: number, error: unknown) => {
  const diagnostic = error && typeof error === 'object'
    ? error as Partial<PptxDiagnosticError>
    : null;
  const message = diagnostic?.message || stringifyErrorDetail(error) || 'This slide could not be rendered.';
  return `<section class="slide flyfish-pptx-slide-error" data-slide-index="${slideNumber}"><div class="flyfish-pptx-slide-error-card" role="status"><strong>Slide ${slideNumber}</strong><span>${escapeHtml(message)}</span></div></section>`;
};

const DEFAULT_INITIAL_SLIDES = 3;
const DEFAULT_BATCH_SIZE = 4;
const DEFAULT_OVERSCAN_VIEWPORTS = 1.5;
const DEFAULT_SLIDE_HEIGHT = 540;
const DEFAULT_SLIDE_GAP = 50;

type SlideWindowOptions = {
  initialSlides: number;
  batchSize: number;
  overscanViewport: number;
};

type SlideViewport = {
  top: number;
  bottom: number;
  height: number;
};

type WindowedSlideRecord = {
  slideNumber: number;
  html: string;
  slot: HTMLDivElement;
  element: Element | null;
  estimatedHeight: number;
  rendered: boolean;
  notified: boolean;
  postProcessed: boolean;
  postProcessPromise: Promise<void> | null;
  postProcessVersion: number;
  chartHandle: PptxPostProcessingHandle | null;
};

type PptxMediaRecord = {
  buffer: ArrayBuffer;
  mimeType: string;
  objectUrl: string | null;
  revokeObjectUrl: (() => void) | null;
};

const toPositiveInteger = (
  value: number | undefined,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
) => {
  const numeric = typeof value === 'number' && Number.isFinite(value)
    ? Math.floor(value)
    : fallback;
  return clamp(numeric, min, max);
};

const toPositiveNumber = (
  value: number | undefined,
  fallback: number,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
) => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return clamp(numeric, min, max);
};

export class PptxViewer {
  static async open(
    buffer: ArrayBuffer,
    target: HTMLElement,
    options: PptxViewerOptions = {}
  ) {
    const viewer = new PptxViewer(buffer, target, options);
    await viewer.open();
    return viewer;
  }

  readonly target: HTMLElement;
  readonly content: HTMLDivElement;
  readonly scaleBox: HTMLDivElement;
  private readonly buffer: ArrayBuffer;
  private readonly options: PptxViewerOptions;
  private worker: Worker | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame = 0;
  private fitScale = 1;
  private userZoomPercent = 100;
  private currentZoomPercent = 100;
  private thumbnailElement: HTMLImageElement | null = null;
  private previewThumbnailDataUrl: string | null = null;
  private slideSize: PptxSlideSize | null = null;
  private slideRecords: WindowedSlideRecord[] = [];
  private slideWindowTarget: HTMLElement | Window | null = null;
  private slideWindowListeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  private slideWindowFrame = 0;
  private charts: unknown = null;
  private readonly chartHandles = new Set<PptxPostProcessingHandle>();
  private readonly mediaRecords = new Map<string, PptxMediaRecord>();
  private disposed = false;
  private completed = false;
  private readonly handleSlideWindowChange = () => this.scheduleSlideWindowUpdate();

  private constructor(buffer: ArrayBuffer, target: HTMLElement, options: PptxViewerOptions) {
    this.buffer = buffer;
    this.target = target;
    this.options = options;
    this.userZoomPercent = toPercent(options.zoomPercent);
    this.currentZoomPercent = this.userZoomPercent;

    const documentRef = target.ownerDocument || document;
    this.scaleBox = documentRef.createElement('div');
    this.scaleBox.className = 'flyfish-pptx-scale-box';
    this.content = documentRef.createElement('div');
    this.content.className = 'flyfish-pptx-content';
    this.content.dataset.renderState = 'loading';
    this.scaleBox.append(this.content);
  }

  get zoomPercent() {
    return Math.round(this.currentZoomPercent);
  }

  get thumbnailDataUrl() {
    return this.previewThumbnailDataUrl;
  }

  async open() {
    ensureZipWithinLimits(this.buffer, this.options);
    ensurePptxViewerStyles(this.target.ownerDocument || document, this.options.styleRoot);
    this.target.replaceChildren(this.scaleBox);
    this.attachResizeObserver();
    this.attachSlideWindowListeners();
    this.startWorker();
  }

  async setZoom(percent: number) {
    const desiredEffectivePercent = toPercent(percent);
    this.userZoomPercent = clamp(desiredEffectivePercent / Math.max(this.fitScale, 0.01), 25, 600);
    this.scheduleResize();
  }

  destroy() {
    this.disposed = true;
    this.previewThumbnailDataUrl = null;
    this.releaseCharts();
    this.releaseMedia();
    this.worker?.terminate();
    this.worker = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeFrame) {
      this.target.ownerDocument.defaultView?.cancelAnimationFrame(this.resizeFrame);
    }
    if (this.slideWindowFrame) {
      this.target.ownerDocument.defaultView?.cancelAnimationFrame(this.slideWindowFrame);
    }
    this.detachSlideWindowListeners();
    this.target.replaceChildren();
  }

  private startWorker() {
    this.worker?.terminate();
    this.releaseCharts();
    this.releaseMedia();
    this.completed = false;
    this.charts = null;
    this.previewThumbnailDataUrl = null;
    this.slideSize = null;
    this.slideRecords = [];
    this.content.replaceChildren();
    this.content.dataset.renderState = 'loading';
    try {
      this.worker = createPptxWorker(this.options);
    } catch (error) {
      throw createPptxDiagnosticError(
        'PPTX_WORKER_FAILED',
        'start-worker',
        'PPTX Worker 启动失败。',
        error,
        '请检查 presentation.workerUrl、Worker 文件是否 200 返回、MIME/CSP/跨域策略是否允许加载。'
      );
    }
    this.worker.addEventListener('message', event => this.processMessage(event.data));
    this.worker.addEventListener('error', event => this.fail(createPptxDiagnosticError(
      'PPTX_WORKER_FAILED',
      'worker-runtime',
      'PPTX Worker 运行失败。',
      event.error || event.message,
      '请检查 Worker 脚本是否完整、浏览器控制台是否有 CSP/MIME/跨域或语法错误。'
    )));
    try {
      this.worker.postMessage({
        type: 'processPPTX',
        data: this.buffer,
        IE11: false,
        options: resolvePptxEngineOptions(this.options.engineOptions),
      });
    } catch (error) {
      throw createPptxDiagnosticError(
        'PPTX_WORKER_FAILED',
        'post-worker-message',
        'PPTX 数据发送到 Worker 失败。',
        error,
        '请确认浏览器支持 Worker 消息传递，并避免传入已被释放或不可克隆的数据。'
      );
    }
  }

  private processMessage(message: PptxWorkerMessage) {
    if (this.disposed || this.completed) {
      return;
    }

    switch (message.type) {
      case 'slide': {
        this.clearThumbnail();
        if (this.shouldWindowSlides()) {
          this.appendWindowedSlide(String(message.data || ''), Number(message.slide_num || 0));
        } else {
          const element = appendHtml(this.content, String(message.data || ''));
          this.hydrateMedia(element);
          this.scheduleResize();
          this.options.onSlideRendered?.(Number(message.slide_num || 0), element);
        }
        break;
      }
      case 'media':
        this.storeMedia(message.data);
        break;
      case 'slide-error': {
        const slideNumber = Number(message.slide_num || 0);
        const error = message.data;
        const html = buildSlideErrorHtml(slideNumber, error);
        this.clearThumbnail();
        if (this.shouldWindowSlides()) {
          this.appendWindowedSlide(html, slideNumber);
        } else {
          const element = appendHtml(this.content, html);
          this.scheduleResize();
          this.options.onSlideRendered?.(slideNumber, element);
        }
        this.options.onSlideError?.(slideNumber, error);
        this.options.onWarning?.(error);
        break;
      }
      case 'pptx-thumb':
        this.showThumbnail(String(message.data || ''));
        this.options.onThumbnail?.(String(message.data || ''));
        break;
      case 'slideSize':
        this.slideSize = (message.data || {}) as PptxSlideSize;
        this.syncWindowedPlaceholderHeights();
        this.options.onSlideSize?.((message.data || {}) as any);
        break;
      case 'globalCSS':
        this.appendGlobalCss(String(message.data || ''));
        break;
      case 'progress-update':
        this.options.onProgress?.(Number(message.data || 0), message);
        break;
      case 'ExecutionTime':
      case 'Done':
        void this.complete(message.charts).catch(error => this.fail(createPptxDiagnosticError(
          'PPTX_PARSE_FAILED',
          'post-process',
          'PPTX 渲染后处理失败。',
          error
        )));
        break;
      case 'WARN':
        this.options.onWarning?.(message.data);
        break;
      case 'ERROR':
        this.fail(message.data);
        break;
      default:
        break;
    }
  }

  private appendGlobalCss(css: string) {
    const sanitized = sanitizePptxCss(this.target.ownerDocument, css);
    if (!sanitized) {
      return;
    }

    const style = this.target.ownerDocument.createElement('style');
    style.textContent = sanitized;
    this.content.append(style);
  }

  private showThumbnail(base64Jpeg: string) {
    if (!base64Jpeg) {
      return;
    }
    this.previewThumbnailDataUrl = `data:image/jpeg;base64,${base64Jpeg}`;
    if (this.content.children.length > 0) {
      return;
    }

    const image = this.target.ownerDocument.createElement('img');
    image.className = 'flyfish-pptx-thumbnail';
    image.alt = 'PPTX preview thumbnail';
    image.src = this.previewThumbnailDataUrl;
    this.thumbnailElement = image;
    this.scaleBox.insertBefore(image, this.content);
  }

  private clearThumbnail() {
    this.thumbnailElement?.remove();
    this.thumbnailElement = null;
  }

  private shouldWindowSlides() {
    return Boolean(this.options.lazySlides || this.options.listOptions?.windowed);
  }

  private getSlideWindowOptions(): SlideWindowOptions {
    const listOptions = this.options.listOptions || {};
    return {
      initialSlides: toPositiveInteger(listOptions.initialSlides, DEFAULT_INITIAL_SLIDES, 1, 20),
      batchSize: toPositiveInteger(listOptions.batchSize, DEFAULT_BATCH_SIZE, 1, 20),
      overscanViewport: toPositiveNumber(
        listOptions.overscanViewport,
        DEFAULT_OVERSCAN_VIEWPORTS,
        0.25,
        6,
      ),
    };
  }

  private getEstimatedSlideHeight() {
    const sizeHeight = Number(this.slideSize?.height);
    const measuredHeight = this.slideRecords.find(record => record.estimatedHeight > 0)?.estimatedHeight;
    return Math.ceil(
      (Number.isFinite(sizeHeight) && sizeHeight > 0
        ? sizeHeight + DEFAULT_SLIDE_GAP
        : measuredHeight || DEFAULT_SLIDE_HEIGHT + DEFAULT_SLIDE_GAP)
    );
  }

  private appendWindowedSlide(html: string, slideNumber: number) {
    const record = this.createWindowedSlideRecord(html, slideNumber || this.slideRecords.length + 1);
    this.slideRecords.push(record);
    this.content.append(record.slot);

    if (this.slideRecords.length <= this.getSlideWindowOptions().initialSlides) {
      this.renderSlideRecord(record);
    }

    this.scheduleResize();
    this.scheduleSlideWindowUpdate();
  }

  private createWindowedSlideRecord(html: string, slideNumber: number): WindowedSlideRecord {
    const slot = this.target.ownerDocument.createElement('div');
    const estimatedHeight = this.getEstimatedSlideHeight();
    slot.className = 'flyfish-pptx-slide-slot';
    slot.dataset.slideNumber = String(slideNumber);
    slot.style.minHeight = `${estimatedHeight}px`;

    return {
      slideNumber,
      html,
      slot,
      element: null,
      estimatedHeight,
      rendered: false,
      notified: false,
      postProcessed: false,
      postProcessPromise: null,
      postProcessVersion: 0,
      chartHandle: null,
    };
  }

  private getDesignerCanvases(record: WindowedSlideRecord) {
    return Array.from(record.slot.children).filter(element => (
      element.classList.contains('fv-print-mask-canvas')
    ));
  }

  private renderSlideRecord(record: WindowedSlideRecord) {
    if (record.rendered || this.disposed) {
      return;
    }

    const designerCanvases = this.getDesignerCanvases(record);
    record.slot.replaceChildren();
    record.element = appendHtml(record.slot, record.html);
    this.hydrateMedia(record.element);
    record.slot.append(...designerCanvases);
    record.rendered = true;
    record.postProcessed = false;
    record.postProcessVersion += 1;
    this.updateMeasuredSlideHeight(record);

    if (!record.notified) {
      record.notified = true;
      this.options.onSlideRendered?.(record.slideNumber, record.element);
    }

    if (this.completed) {
      void this.postProcessSlideRecord(record).finally(() => this.scheduleResize());
    }

    this.scheduleResize();
  }

  private unmountSlideRecord(record: WindowedSlideRecord) {
    if (!record.rendered || this.getDesignerCanvases(record).length > 0) {
      return;
    }

    this.updateMeasuredSlideHeight(record);
    this.releaseChartHandle(record.chartHandle);
    record.chartHandle = null;
    record.postProcessVersion += 1;
    record.slot.replaceChildren();
    record.element = null;
    record.rendered = false;
    record.postProcessed = false;
    record.postProcessPromise = null;
  }

  private updateMeasuredSlideHeight(record: WindowedSlideRecord) {
    const HTMLElementCtor = this.target.ownerDocument.defaultView?.HTMLElement || HTMLElement;
    if (!(record.element instanceof HTMLElementCtor)) {
      return;
    }

    const view = this.target.ownerDocument.defaultView || window;
    const computed = view.getComputedStyle(record.element);
    const marginTop = parseFloat(computed.marginTop) || 0;
    const marginBottom = parseFloat(computed.marginBottom) || 0;
    const measuredHeight = Math.ceil(record.element.offsetHeight + marginTop + marginBottom);
    const nextHeight = Math.max(measuredHeight, record.estimatedHeight, 1);
    record.estimatedHeight = nextHeight;
    record.slot.style.minHeight = `${nextHeight}px`;
  }

  private syncWindowedPlaceholderHeights() {
    if (!this.shouldWindowSlides() || !this.slideRecords.length) {
      return;
    }

    const estimatedHeight = this.getEstimatedSlideHeight();
    for (const record of this.slideRecords) {
      if (!record.rendered && record.estimatedHeight < estimatedHeight) {
        record.estimatedHeight = estimatedHeight;
        record.slot.style.minHeight = `${estimatedHeight}px`;
      }
    }
    this.scheduleResize();
  }

  private scheduleSlideWindowUpdate() {
    if (!this.shouldWindowSlides() || this.disposed) {
      return;
    }

    const view = this.target.ownerDocument.defaultView || window;
    if (this.slideWindowFrame) {
      view.cancelAnimationFrame(this.slideWindowFrame);
    }
    this.slideWindowFrame = view.requestAnimationFrame(() => this.updateSlideWindow());
  }

  private updateSlideWindow() {
    this.slideWindowFrame = 0;
    if (!this.shouldWindowSlides() || !this.slideRecords.length || this.disposed) {
      return;
    }

    const windowOptions = this.getSlideWindowOptions();
    const indexesToRender = this.getWindowedSlideIndexes(windowOptions);
    let changed = false;

    this.slideRecords.forEach((record, index) => {
      if (indexesToRender.has(index)) {
        const wasRendered = record.rendered;
        this.renderSlideRecord(record);
        changed ||= !wasRendered;
      } else if (record.rendered) {
        this.unmountSlideRecord(record);
        changed = true;
      }
    });

    if (changed) {
      this.scheduleResize();
    }
  }

  private getWindowedSlideIndexes(windowOptions: SlideWindowOptions) {
    const viewport = this.getSlideViewport();
    const maxMountedSlides = Math.max(
      windowOptions.initialSlides,
      windowOptions.initialSlides + windowOptions.batchSize * 4,
      12,
    );
    const selected = new Set<number>();

    for (let index = 0; index < Math.min(windowOptions.initialSlides, this.slideRecords.length); index += 1) {
      selected.add(index);
    }

    const candidates = this.slideRecords
      .map((record, index) => ({
        index,
        distance: this.getDistanceFromViewport(record, viewport, windowOptions.overscanViewport),
      }))
      .filter(candidate => candidate.distance !== Number.POSITIVE_INFINITY)
      .sort((a, b) => a.distance - b.distance || a.index - b.index);

    const closestFallback = candidates[0];
    for (const candidate of candidates) {
      if (candidate.distance > 0 && selected.size >= windowOptions.initialSlides) {
        continue;
      }
      selected.add(candidate.index);
    }

    if (closestFallback) {
      selected.add(closestFallback.index);
    }

    if (selected.size <= maxMountedSlides) {
      return selected;
    }

    const capped = new Set<number>();
    for (let index = 0; index < Math.min(windowOptions.initialSlides, this.slideRecords.length); index += 1) {
      capped.add(index);
    }
    for (const candidate of candidates) {
      if (capped.size >= maxMountedSlides) {
        break;
      }
      capped.add(candidate.index);
    }
    return capped;
  }

  private getDistanceFromViewport(
    record: WindowedSlideRecord,
    viewport: SlideViewport,
    overscanViewport: number,
  ) {
    const rect = record.slot.getBoundingClientRect();
    const overscan = viewport.height * overscanViewport;
    const top = viewport.top - overscan;
    const bottom = viewport.bottom + overscan;

    if (rect.bottom >= top && rect.top <= bottom) {
      return 0;
    }

    if (rect.bottom < top) {
      return top - rect.bottom;
    }

    if (rect.top > bottom) {
      return rect.top - bottom;
    }

    return Number.POSITIVE_INFINITY;
  }

  private getSlideViewport(): SlideViewport {
    const view = this.target.ownerDocument.defaultView || window;
    const HTMLElementCtor = view.HTMLElement;

    if (this.slideWindowTarget instanceof HTMLElementCtor) {
      const rect = this.slideWindowTarget.getBoundingClientRect();
      const height = Math.max(1, rect.height || this.slideWindowTarget.clientHeight || view.innerHeight || 1);
      return {
        top: rect.top,
        bottom: rect.top + height,
        height,
      };
    }

    const height = Math.max(
      1,
      view.innerHeight || this.target.ownerDocument.documentElement.clientHeight || DEFAULT_SLIDE_HEIGHT,
    );
    return {
      top: 0,
      bottom: height,
      height,
    };
  }

  private attachSlideWindowListeners() {
    if (!this.shouldWindowSlides()) {
      return;
    }

    this.detachSlideWindowListeners();
    const view = this.target.ownerDocument.defaultView || window;
    this.slideWindowTarget = this.findSlideWindowTarget();
    this.addSlideWindowListener(view, 'scroll');
    this.addSlideWindowListener(view, 'resize');

    if (this.slideWindowTarget && this.slideWindowTarget !== view) {
      this.addSlideWindowListener(this.slideWindowTarget, 'scroll');
    }
  }

  private addSlideWindowListener(target: EventTarget, type: string) {
    target.addEventListener(type, this.handleSlideWindowChange, { passive: true });
    this.slideWindowListeners.push({ target, type, listener: this.handleSlideWindowChange });
  }

  private detachSlideWindowListeners() {
    for (const { target, type, listener } of this.slideWindowListeners) {
      target.removeEventListener(type, listener);
    }
    this.slideWindowListeners = [];
    this.slideWindowTarget = null;
  }

  private findSlideWindowTarget(): HTMLElement | Window {
    const view = this.target.ownerDocument.defaultView || window;
    let element = this.target.parentElement;

    while (element && element !== this.target.ownerDocument.body && element !== this.target.ownerDocument.documentElement) {
      const style = view.getComputedStyle(element);
      if (/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`)) {
        return element;
      }
      element = element.parentElement;
    }

    return view;
  }

  private async postProcessRenderedContent(charts: unknown) {
    if (!this.shouldWindowSlides()) {
      const handle = await renderPptxPostProcessing(charts, this.content);
      this.trackChartHandle(handle);
      return;
    }

    await Promise.all(
      this.slideRecords
        .filter(record => record.rendered)
        .map(record => this.postProcessSlideRecord(record)),
    );
  }

  private async postProcessSlideRecord(record: WindowedSlideRecord) {
    if (!record.rendered || record.postProcessed || this.disposed) {
      return;
    }
    if (!record.postProcessPromise) {
      const version = record.postProcessVersion;
      const postProcessPromise = (async () => {
        const handle = await renderPptxPostProcessing(this.charts, record.slot);
        if (this.disposed || !record.rendered || record.postProcessVersion !== version) {
          handle?.destroy();
          return;
        }
        this.releaseChartHandle(record.chartHandle);
        record.chartHandle = handle;
        this.trackChartHandle(handle);
        record.postProcessed = true;
        this.updateMeasuredSlideHeight(record);
      })().finally(() => {
        if (record.postProcessPromise === postProcessPromise) {
          record.postProcessPromise = null;
        }
      });
      record.postProcessPromise = postProcessPromise;
    }
    await record.postProcessPromise;
  }

  /** Materializes every lazy slide only for the duration of an export snapshot. */
  async cloneForExport() {
    if (!this.shouldWindowSlides()) {
      return this.target.cloneNode(true) as HTMLElement;
    }

    const previouslyRendered = new Set(
      this.slideRecords.filter(record => record.rendered)
    );
    try {
      this.slideRecords.forEach(record => this.renderSlideRecord(record));
      await Promise.all(this.slideRecords.map(record => this.postProcessSlideRecord(record)));
      return this.target.cloneNode(true) as HTMLElement;
    } finally {
      this.slideRecords.forEach(record => {
        if (!previouslyRendered.has(record)) {
          this.unmountSlideRecord(record);
        }
      });
      this.scheduleSlideWindowUpdate();
      this.scheduleResize();
    }
  }

  private async complete(charts: unknown) {
    if (this.disposed || this.completed) {
      return;
    }

    this.completed = true;
    this.charts = charts;
    this.content.dataset.renderState = 'ready';
    this.worker?.terminate();
    this.worker = null;
    this.scheduleSlideWindowUpdate();
    this.scheduleResize();
    await this.postProcessRenderedContent(charts);
    if (this.disposed) {
      return;
    }
    this.scheduleResize();
    this.options.onRenderComplete?.();
  }

  private fail(error: unknown) {
    if (this.disposed) {
      return;
    }

    this.completed = true;
    this.worker?.terminate();
    this.worker = null;
    this.releaseCharts();
    this.releaseMedia();
    this.content.dataset.renderState = 'error';
    this.options.onError?.(error);
  }

  private trackChartHandle(handle: PptxPostProcessingHandle | null | undefined) {
    if (!handle) {
      return;
    }
    if (this.disposed) {
      handle.destroy();
      return;
    }
    this.chartHandles.add(handle);
  }

  private releaseChartHandle(handle: PptxPostProcessingHandle | null | undefined) {
    if (!handle) {
      return;
    }
    this.chartHandles.delete(handle);
    handle.destroy();
  }

  private releaseCharts() {
    for (const handle of this.chartHandles) {
      handle.destroy();
    }
    this.chartHandles.clear();
    for (const record of this.slideRecords) {
      record.chartHandle = null;
    }
  }

  private storeMedia(data: unknown) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const media = data as {
      id?: unknown;
      mimeType?: unknown;
      buffer?: unknown;
    };
    if (
      typeof media.id !== 'string' ||
      !media.id ||
      typeof media.mimeType !== 'string' ||
      !(media.buffer instanceof ArrayBuffer)
    ) {
      return;
    }

    this.releaseMedia(media.id);
    this.mediaRecords.set(media.id, {
      buffer: media.buffer,
      mimeType: media.mimeType,
      objectUrl: null,
      revokeObjectUrl: null,
    });
    this.hydrateMedia(this.content);
  }

  private hydrateMedia(root: Element | null) {
    if (!root) {
      return;
    }

    const elements = Array.from(
      root.querySelectorAll<HTMLMediaElement>('[data-pptx-media-id]')
    );
    if (root.matches('[data-pptx-media-id]')) {
      elements.unshift(root as HTMLMediaElement);
    }

    for (const element of elements) {
      const mediaId = element.dataset.pptxMediaId;
      const record = mediaId ? this.mediaRecords.get(mediaId) : undefined;
      if (!record) {
        continue;
      }

      if (!record.objectUrl) {
        const view = this.target.ownerDocument.defaultView;
        const BlobCtor = view?.Blob || globalThis.Blob;
        const UrlApi = view?.URL || globalThis.URL;
        if (
          typeof BlobCtor !== 'function' ||
          typeof UrlApi?.createObjectURL !== 'function'
        ) {
          continue;
        }
        const objectUrl = UrlApi.createObjectURL(new BlobCtor(
          [record.buffer],
          { type: record.mimeType }
        ));
        record.objectUrl = objectUrl;
        record.revokeObjectUrl = () => UrlApi.revokeObjectURL(objectUrl);
      }

      if (element.src !== record.objectUrl) {
        element.src = record.objectUrl;
        element.load?.();
      }
    }
  }

  private releaseMedia(mediaId?: string) {
    if (mediaId) {
      const record = this.mediaRecords.get(mediaId);
      record?.revokeObjectUrl?.();
      this.mediaRecords.delete(mediaId);
      return;
    }

    for (const record of this.mediaRecords.values()) {
      record.revokeObjectUrl?.();
    }
    this.mediaRecords.clear();
  }

  private attachResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleResize();
      this.scheduleSlideWindowUpdate();
    });
    this.resizeObserver.observe(this.target);
    if (this.target.parentElement) {
      this.resizeObserver.observe(this.target.parentElement);
    }
  }

  private scheduleResize() {
    const view = this.target.ownerDocument.defaultView || window;
    if (this.resizeFrame) {
      view.cancelAnimationFrame(this.resizeFrame);
    }
    this.resizeFrame = view.requestAnimationFrame(() => this.resize());
  }

  private resize() {
    const slides = this.getMountedSlideElements();

    const sizeWidth = Number(this.slideSize?.width);
    const fallbackWidth = Number.isFinite(sizeWidth) && sizeWidth > 0 ? sizeWidth : 0;
    const slideWidth = Math.max(...slides.map(slide => slide.offsetWidth), fallbackWidth);
    if (!slideWidth) {
      return;
    }

    const viewportWidth = this.target.clientWidth || this.target.parentElement?.clientWidth || slideWidth;
    this.fitScale = this.options.fitMode === 'none'
      ? 1
      : Math.min(1, viewportWidth / slideWidth);
    const effectiveScale = clamp(this.fitScale * (this.userZoomPercent / 100), 0.25, 3);
    this.currentZoomPercent = effectiveScale * 100;

    this.content.style.width = `${slideWidth}px`;
    this.content.style.transform = `scale(${effectiveScale})`;
    this.scaleBox.style.width = `${Math.ceil(slideWidth * effectiveScale)}px`;
    this.scaleBox.style.height = `${Math.ceil(this.content.scrollHeight * effectiveScale)}px`;
    this.scaleBox.style.minHeight = '';
  }

  private getMountedSlideElements() {
    const HTMLElementCtor = this.target.ownerDocument.defaultView?.HTMLElement || HTMLElement;
    const slides: HTMLElement[] = [];

    for (const child of Array.from(this.content.children)) {
      if (!(child instanceof HTMLElementCtor)) {
        continue;
      }

      if (this.isSlideElement(child)) {
        slides.push(child);
        continue;
      }

      if (!child.classList.contains('flyfish-pptx-slide-slot')) {
        continue;
      }

      const firstChild = child.firstElementChild;
      if (firstChild instanceof HTMLElementCtor && this.isSlideElement(firstChild)) {
        slides.push(firstChild);
      }
    }

    return slides;
  }

  private isSlideElement(element: HTMLElement) {
    return element.classList.contains('slide') || element.tagName === 'SECTION';
  }
}
