import {
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerZoomChangeEmitter,
  registerFileViewerViewStateProvider,
  registerFileViewerZoomProvider,
  unregisterFileViewerViewStateProvider,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerApplyViewStateOptions,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerViewState,
  type FileViewerViewStateChangeAction,
  type FileViewerViewStateChangeSource,
  type FileViewerZoomState,
} from '@file-viewer/core';
import {
  cache,
  Enums,
  getWebWorkerManager,
  registerImageLoader,
  init as initCornerstone,
  isCornerstoneInitialized,
  TiledRenderingEngine,
  type StackViewport,
} from '@cornerstonejs/core';
import { wadouri } from '@cornerstonejs/dicom-image-loader';
import {
  Enums as MetadataEnums,
  metaData as cornerstoneMetadata,
  registerDefaultProviders,
} from '@cornerstonejs/metadata';
import type {
  FileViewerDicomRendererOptions,
} from './index.js';
import { inspectDicomPart10 } from './inspect.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const MAX_CODEC_WORKERS = 4;
const CODEC_WORKER_NAME = 'dicomImageLoader';
type DicomWindowSource = 'auto' | 'dicom' | 'user';
let dicomLoaderInitialized = false;
let renderingEngineSerial = 0;

const dicomStyle = `
.dicom-viewer{position:relative;display:flex;width:100%;height:100%;min-height:360px;flex-direction:column;overflow:hidden;background:#05080d;color:#e2e8f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}
.dicom-viewer *{box-sizing:border-box}
.dicom-toolbar{position:relative;z-index:3;display:flex;min-height:48px;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.96);box-shadow:0 8px 24px rgba(0,0,0,.22)}
.dicom-tool-group{display:flex;align-items:center;gap:5px}
.dicom-toolbar button{display:grid;min-width:32px;height:32px;place-items:center;border:1px solid rgba(148,163,184,.26);border-radius:7px;padding:0 8px;background:#172033;color:#e5edf7;font:700 13px/1 system-ui,sans-serif;cursor:pointer}
.dicom-toolbar button:hover:not(:disabled){border-color:#60a5fa;background:#1e3a5f;color:#fff}
.dicom-toolbar button:focus-visible,.dicom-toolbar input:focus-visible,.dicom-stage:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.dicom-toolbar button:disabled{cursor:not-allowed;opacity:.42}
.dicom-frame-meter,.dicom-zoom-meter{min-width:58px;color:#cbd5e1;font:700 12px/1 system-ui,sans-serif;text-align:center;white-space:nowrap}
.dicom-window-controls{display:flex;align-items:center;gap:7px;margin-left:auto}
.dicom-window-controls label{display:flex;align-items:center;gap:4px;color:#94a3b8;font:700 11px/1 system-ui,sans-serif}
.dicom-window-controls input{width:76px;height:30px;border:1px solid rgba(148,163,184,.3);border-radius:6px;padding:0 7px;background:#0b1220;color:#f8fafc;font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.dicom-body{position:relative;min-height:0;flex:1;overflow:hidden;background:#05080d}
.dicom-stage{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;outline:none;user-select:none;-webkit-user-select:none}
.dicom-stage.is-panning{cursor:grabbing}
.dicom-stage canvas{display:block}
.dicom-meta{position:absolute;z-index:2;left:10px;bottom:10px;max-width:calc(100% - 20px);border:1px solid rgba(148,163,184,.22);border-radius:7px;padding:6px 8px;background:rgba(2,6,23,.72);color:#cbd5e1;font:600 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none;backdrop-filter:blur(8px)}
.dicom-state{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,8,13,.92);color:#cbd5e1;font-size:13px;font-weight:700;text-align:center}
.dicom-state[hidden]{display:none}
.dicom-state.error{color:#fca5a5}
@media(max-width:720px){.dicom-toolbar{align-items:flex-start;flex-wrap:wrap}.dicom-window-controls{width:100%;margin-left:0}.dicom-window-controls label{flex:1}.dicom-window-controls input{width:100%;min-width:0}.dicom-body{min-height:300px}}
`;

const copyByLocale = {
  'de-DE': {
    fit: 'Ansicht einpassen', loading: 'DICOM wird geladen ...', next: 'Nächstes Bild', previous: 'Vorheriges Bild',
    rotateLeft: 'Nach links drehen', rotateRight: 'Nach rechts drehen', windowCenter: 'Fenstermitte',
    windowWidth: 'Fensterbreite', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern',
  },
  'en-US': {
    fit: 'Fit to view', loading: 'Loading DICOM ...', next: 'Next frame', previous: 'Previous frame',
    rotateLeft: 'Rotate left', rotateRight: 'Rotate right', windowCenter: 'Window center',
    windowWidth: 'Window width', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  },
  'ja-JP': {
    fit: '画面に合わせる', loading: 'DICOM を読み込み中 ...', next: '次のフレーム', previous: '前のフレーム',
    rotateLeft: '左に回転', rotateRight: '右に回転', windowCenter: 'ウィンドウ中心',
    windowWidth: 'ウィンドウ幅', zoomIn: '拡大', zoomOut: '縮小',
  },
  'zh-CN': {
    fit: '适合视图', loading: '正在加载 DICOM ...', next: '下一帧', previous: '上一帧',
    rotateLeft: '向左旋转', rotateRight: '向右旋转', windowCenter: '窗位',
    windowWidth: '窗宽', zoomIn: '放大', zoomOut: '缩小',
  },
} as const;

const resolveCopy = (context?: FileRenderContext) => {
  const requested = context?.options?.locale;
  if (requested && requested !== 'auto' && requested in copyByLocale) {
    return copyByLocale[requested as keyof typeof copyByLocale];
  }
  const language = context?.surface?.container?.ownerDocument.defaultView?.navigator.language ||
    (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  if (language.toLowerCase().startsWith('zh')) return copyByLocale['zh-CN'];
  if (language.toLowerCase().startsWith('ja')) return copyByLocale['ja-JP'];
  if (language.toLowerCase().startsWith('de')) return copyByLocale['de-DE'];
  return copyByLocale['en-US'];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finitePositiveInteger = (value: unknown, label: string) => {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`DICOM ${label} must be a positive integer.`);
  }
  return number;
};

const finiteNumber = (value: unknown, fallback: number) => {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value || ''));
  return Number.isFinite(number) ? number : fallback;
};

const resolveCodecWorkerCount = (requested?: number) => {
  const hardware = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  const defaultCount = Math.min(2, Math.max(1, Math.floor(hardware / 2)));
  if (requested === undefined) return defaultCount;
  return clamp(finitePositiveInteger(requested, 'codec worker count'), 1, MAX_CODEC_WORKERS);
};

const ensureDicomRuntime = (maxWebWorkers?: number) => {
  if (!isCornerstoneInitialized()) initCornerstone();
  if (!dicomLoaderInitialized) {
    const workerManager = getWebWorkerManager();
    if (!workerManager.workerRegistry[CODEC_WORKER_NAME]) {
      // Cornerstone's public init() purges the host's global image/metadata
      // caches. Register only the local-file loader and worker non-destructively.
      registerDefaultProviders();
      registerImageLoader('dicomfile', wadouri.loadImageFromNaturalizedMetadata);
      workerManager.registerWorker(
        CODEC_WORKER_NAME,
        () => new Worker(new URL('./decode-worker.js', import.meta.url), { type: 'module' }),
        { maxWorkerInstances: resolveCodecWorkerCount(maxWebWorkers) }
      );
    }
    dicomLoaderInitialized = true;
  }
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const createButton = (documentRef: Document, label: string, text: string) => {
  const button = createElement(documentRef, 'button', undefined, text);
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  return button;
};

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = dicomStyle;
  return style;
};

const parseFileManagerIndex = (baseImageId: string) => {
  const match = /^dicomfile:(\d+)$/.exec(baseImageId);
  return match ? Number.parseInt(match[1], 10) : -1;
};

const cleanupDicomResources = (
  baseImageId: string,
  imageIds: readonly string[],
  renderingEngine: TiledRenderingEngine | null,
  viewportId: string
) => {
  if (renderingEngine && !renderingEngine.hasBeenDestroyed) {
    try {
      renderingEngine.disableElement(viewportId);
    } catch {
      // The viewport may already be disabled by a host teardown.
    }
    renderingEngine.destroy();
  }
  for (const imageId of imageIds) {
    try {
      if (cache.getImageLoadObject(imageId) || cache.getImage(imageId)) {
        cache.removeImageLoadObject(imageId, { force: true });
      }
    } catch {
      // A pending load may have removed the entry between the check and decache.
    }
    cornerstoneMetadata.clearQuery(MetadataEnums.MetadataModules.NATURALIZED, imageId);
  }
  cornerstoneMetadata.clearQuery(MetadataEnums.MetadataModules.NATURALIZED, baseImageId);
  const fileIndex = parseFileManagerIndex(baseImageId);
  if (fileIndex >= 0) wadouri.fileManager.remove(fileIndex);
};

const makeImageIds = (baseImageId: string, frameCount: number) => {
  return Array.from({ length: frameCount }, (_, index) => `${baseImageId}?frame=${index + 1}`);
};

const normalizeZoom = (value: number) => clamp(Number(value.toFixed(3)), MIN_ZOOM, MAX_ZOOM);

const safeErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to render this DICOM file.';
};

export default async function renderDicom(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext,
  options?: FileViewerDicomRendererOptions
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) {
    throw context.signal.reason || new DOMException('DICOM render aborted.', 'AbortError');
  }
  const inspected = inspectDicomPart10(buffer, options?.limits);
  const documentRef = target.ownerDocument;
  const copy = resolveCopy(context);
  const root = createElement(documentRef, 'div', 'dicom-viewer');
  const hasDicomWindow = inspected.windowWidth !== null && inspected.windowCenter !== null;
  Object.assign(root.dataset, {
    status: 'loading', renderer: 'dicom', rows: String(inspected.rows), columns: String(inspected.columns),
    frameCount: String(inspected.frameCount), currentFrame: '1', windowSource: hasDicomWindow ? 'dicom' : 'auto',
    panX: '0', panY: '0', rotation: '0',
  });
  if (hasDicomWindow) {
    root.dataset.windowWidth = String(inspected.windowWidth);
    root.dataset.windowCenter = String(inspected.windowCenter);
  }

  const toolbar = createElement(documentRef, 'div', 'dicom-toolbar');
  const navigation = createElement(documentRef, 'div', 'dicom-tool-group');
  const previousButton = createButton(documentRef, copy.previous, '‹');
  const frameMeter = createElement(documentRef, 'span', 'dicom-frame-meter', `1 / ${inspected.frameCount}`);
  frameMeter.setAttribute('aria-live', 'polite');
  const nextButton = createButton(documentRef, copy.next, '›');
  navigation.append(previousButton, frameMeter, nextButton);
  const zoomTools = createElement(documentRef, 'div', 'dicom-tool-group');
  const zoomOutButton = createButton(documentRef, copy.zoomOut, '−');
  const zoomMeter = createElement(documentRef, 'span', 'dicom-zoom-meter', '100%');
  const zoomInButton = createButton(documentRef, copy.zoomIn, '+');
  const fitButton = createButton(documentRef, copy.fit, 'Fit');
  const rotateLeftButton = createButton(documentRef, copy.rotateLeft, '↶');
  const rotateRightButton = createButton(documentRef, copy.rotateRight, '↷');
  zoomTools.append(zoomOutButton, zoomMeter, zoomInButton, fitButton, rotateLeftButton, rotateRightButton);
  const windowControls = createElement(documentRef, 'div', 'dicom-window-controls');
  const widthLabel = createElement(documentRef, 'label', undefined, 'WW');
  widthLabel.title = copy.windowWidth;
  const widthInput = createElement(documentRef, 'input');
  widthInput.type = 'number'; widthInput.min = '1'; widthInput.step = '1';
  widthInput.value = inspected.windowWidth === null ? '' : String(Math.round(inspected.windowWidth));
  widthInput.setAttribute('aria-label', copy.windowWidth);
  widthLabel.append(widthInput);
  const centerLabel = createElement(documentRef, 'label', undefined, 'WC');
  centerLabel.title = copy.windowCenter;
  const centerInput = createElement(documentRef, 'input');
  centerInput.type = 'number'; centerInput.step = '1';
  centerInput.value = inspected.windowCenter === null ? '' : String(Math.round(inspected.windowCenter));
  centerInput.setAttribute('aria-label', copy.windowCenter);
  centerLabel.append(centerInput);
  windowControls.append(widthLabel, centerLabel);
  toolbar.append(navigation, zoomTools, windowControls);

  const body = createElement(documentRef, 'div', 'dicom-body');
  const stage = createElement(documentRef, 'div', 'dicom-stage');
  stage.tabIndex = 0;
  stage.setAttribute('role', 'application');
  stage.setAttribute('aria-label', 'DICOM image viewport');
  const metadata = createElement(documentRef, 'div', 'dicom-meta', `${inspected.columns}×${inspected.rows} · ${inspected.frameCount} frame${inspected.frameCount === 1 ? '' : 's'} · ${inspected.modality || 'OT'} · ${inspected.photometricInterpretation || 'unknown'}`);
  const state = createElement(documentRef, 'div', 'dicom-state', copy.loading);
  state.setAttribute('role', 'status');
  body.append(stage, metadata, state);
  root.append(toolbar, body);
  target.replaceChildren(createStyle(documentRef), root);

  let baseImageId = '';
  let imageIds: string[] = [];
  let renderingEngine: TiledRenderingEngine | null = null;
  let viewport: StackViewport | null = null;
  let destroyed = false;
  let currentFrame = 0;
  let frameQueue: Promise<void> = Promise.resolve();
  let currentWindowWidth: number | null = inspected.windowWidth;
  let currentWindowCenter: number | null = inspected.windowCenter;
  let currentWindowSource: DicomWindowSource = hasDicomWindow ? 'dicom' : 'auto';
  let currentRotation = 0;
  let resizeObserver: ResizeObserver | null = null;
  let pointerId: number | null = null;
  let pointerStart: [number, number] = [0, 0];
  let panStart: [number, number] = [0, 0];
  const listeners: Array<() => void> = [];
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  const viewStateEmitter = createFileViewerViewStateChangeEmitter();

  const listen = <K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void, listenerOptions?: AddEventListenerOptions) => {
    element.addEventListener(type, listener as EventListener, listenerOptions);
    listeners.push(() => element.removeEventListener(type, listener as EventListener, listenerOptions));
  };

  const getZoomState = (): FileViewerZoomState => {
    const scale = normalizeZoom(viewport?.getZoom() || 1);
    return { scale, label: `${Math.round(scale * 100)}%`, canZoomIn: scale < MAX_ZOOM, canZoomOut: scale > MIN_ZOOM, canReset: Math.abs(scale - 1) > 0.001, minScale: MIN_ZOOM, maxScale: MAX_ZOOM };
  };
  const syncZoomUi = () => {
    const zoom = getZoomState();
    root.dataset.zoom = String(zoom.scale);
    zoomMeter.textContent = zoom.label;
    zoomInButton.disabled = !zoom.canZoomIn;
    zoomOutButton.disabled = !zoom.canZoomOut;
    zoomEmitter.emit();
  };
  const getViewState = (): FileViewerViewState => {
    const zoom = getZoomState();
    const pan = viewport?.getPan() || [0, 0];
    return { renderer: 'dicom', page: currentFrame + 1, pageCount: inspected.frameCount, scale: zoom.scale, zoom, rotation: currentRotation, extra: { pan: [Number(pan[0].toFixed(3)), Number(pan[1].toFixed(3))], windowCenter: currentWindowCenter, windowWidth: currentWindowWidth } };
  };
  const emitViewState = (action: FileViewerViewStateChangeAction, source: FileViewerViewStateChangeSource) => {
    const next = getViewState();
    viewStateEmitter.emit(createFileViewerViewStateChange(next, { action, source }));
    return next;
  };
  const setZoom = (value: number, action: FileViewerViewStateChangeAction = 'zoom-change', source: FileViewerViewStateChangeSource = 'api') => {
    const next = normalizeZoom(value);
    viewport?.setZoom(next);
    viewport?.render();
    syncZoomUi();
    emitViewState(action, source);
    return getZoomState();
  };
  const setRotation = (
    value: number,
    action: FileViewerViewStateChangeAction = 'rotation-change',
    source: FileViewerViewStateChangeSource = 'api'
  ) => {
    const next = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
    currentRotation = next;
    (viewport as (StackViewport & { setRotation(rotation: number): void }) | null)?.setRotation(next);
    viewport?.render();
    root.dataset.rotation = String(next);
    return emitViewState(action, source);
  };
  const fitToView = (request?: Partial<FileViewerFitRequest>, source: FileViewerViewStateChangeSource = 'api'): FileViewerFitResult => {
    if (!viewport) return { applied: false, mode: request?.mode || 'contain', resize: request?.resize || 'initial', reason: 'not-ready', provider: 'zoom' };
    viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true });
    (viewport as StackViewport & { setRotation(rotation: number): void }).setRotation(currentRotation);
    viewport.render();
    const pan = viewport.getPan();
    root.dataset.panX = String(Number(pan[0].toFixed(3)));
    root.dataset.panY = String(Number(pan[1].toFixed(3)));
    syncZoomUi();
    emitViewState('fit', source);
    return { applied: true, mode: request?.mode || 'contain', resize: request?.resize || 'initial', scale: getZoomState().scale, source, provider: 'zoom', state: getViewState() };
  };
  const syncFrameUi = () => {
    root.dataset.currentFrame = String(currentFrame + 1);
    frameMeter.textContent = `${currentFrame + 1} / ${inspected.frameCount}`;
    previousButton.disabled = currentFrame <= 0;
    nextButton.disabled = currentFrame >= inspected.frameCount - 1;
  };
  const syncWindowUi = (width: number, center: number, source: DicomWindowSource) => {
    currentWindowWidth = width;
    currentWindowCenter = center;
    currentWindowSource = source;
    widthInput.value = String(Math.round(width * 1000) / 1000);
    centerInput.value = String(Math.round(center * 1000) / 1000);
    root.dataset.windowWidth = String(width);
    root.dataset.windowCenter = String(center);
    root.dataset.windowSource = source;
  };
  const syncWindowFromViewport = () => {
    if (!viewport) return false;
    let lower = finiteNumber(viewport.getProperties().voiRange?.lower, Number.NaN);
    let upper = finiteNumber(viewport.getProperties().voiRange?.upper, Number.NaN);
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) {
      const image = viewport.getCornerstoneImage() as unknown as {
        intercept?: unknown;
        maxPixelValue?: unknown;
        minPixelValue?: unknown;
        slope?: unknown;
      };
      const slope = finiteNumber(image.slope, 1);
      const intercept = finiteNumber(image.intercept, 0);
      const first = finiteNumber(image.minPixelValue, Number.NaN) * slope + intercept;
      const second = finiteNumber(image.maxPixelValue, Number.NaN) * slope + intercept;
      lower = Math.min(first, second);
      upper = Math.max(first, second);
    }
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) return false;
    syncWindowUi(upper - lower, (upper + lower) / 2, 'auto');
    return true;
  };
  const setFrame = (frame: number, source: FileViewerViewStateChangeSource = 'user') => {
    const requested = clamp(Math.round(frame), 0, inspected.frameCount - 1);
    frameQueue = frameQueue.then(async () => {
      if (destroyed || !viewport || requested === currentFrame) return;
      await viewport.setImageIdIndex(requested);
      if (destroyed) return;
      currentFrame = requested;
      if (currentWindowSource === 'auto') syncWindowFromViewport();
      syncFrameUi();
      viewport.render();
      emitViewState('page-change', source);
    });
    return frameQueue;
  };
  const applyWindow = () => {
    if (!viewport) return;
    const width = Math.max(1, finiteNumber(widthInput.value, currentWindowWidth ?? Number.NaN));
    const center = finiteNumber(centerInput.value, currentWindowCenter ?? Number.NaN);
    if (!Number.isFinite(width) || !Number.isFinite(center)) return;
    syncWindowUi(width, center, 'user');
    viewport.setProperties({ voiRange: { lower: center - width / 2, upper: center + width / 2 } });
    viewport.render();
    emitViewState('window-change', 'user');
  };
  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    context?.registerThumbnailAdapter?.(null);
    unregisterFileViewerViewStateProvider(root);
    unregisterFileViewerZoomProvider(root);
    resizeObserver?.disconnect(); resizeObserver = null;
    listeners.splice(0).forEach(remove => remove());
    cleanupDicomResources(baseImageId, imageIds, renderingEngine, viewport ? viewport.id : '');
    viewport = null; renderingEngine = null;
    // Cornerstone owns the global codec worker pool. Do not terminate it here:
    // the host application may have independent Cornerstone viewports.
    target.replaceChildren();
  };
  const abort = () => cleanup();
  if (context?.signal) {
    context.signal.addEventListener('abort', abort, { once: true });
    listeners.push(() => context.signal?.removeEventListener('abort', abort));
  }

  try {
    ensureDicomRuntime(options?.maxWebWorkers);
    const fileName = context?.filename?.trim() || 'preview.dcm';
    baseImageId = wadouri.fileManager.add(new File([inspected.loaderBuffer], fileName, { type: 'application/dicom' }));
    imageIds = makeImageIds(baseImageId, inspected.frameCount);
    root.dataset.dicomImageId = baseImageId;
    const renderingEngineId = `file-viewer-dicom-engine-${Date.now()}-${++renderingEngineSerial}`;
    root.dataset.renderingEngineId = renderingEngineId;
    const viewportId = `${renderingEngineId}-stack`;
    // A renderer instance owns one stack viewport, so a one-context tiled engine
    // avoids allocating Cornerstone's multi-context pool for every File Viewer.
    renderingEngine = new TiledRenderingEngine(renderingEngineId);
    renderingEngine.enableElement({ element: stage, viewportId, type: Enums.ViewportType.STACK, defaultOptions: { background: [0.015, 0.025, 0.045] } });
    viewport = renderingEngine.getViewport<StackViewport>(viewportId);
    await viewport.setStack(imageIds, 0);
    if (destroyed || context?.signal?.aborted) throw context?.signal?.reason || new DOMException('DICOM render aborted.', 'AbortError');
    if (hasDicomWindow) {
      const width = inspected.windowWidth as number;
      const center = inspected.windowCenter as number;
      syncWindowUi(width, center, 'dicom');
      viewport.setProperties({ voiRange: { lower: center - width / 2, upper: center + width / 2 } });
    } else if (!syncWindowFromViewport()) {
      throw new Error('Unable to determine a visible DICOM window from the decoded pixels.');
    }
    viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true });
    viewport.render();

    registerFileViewerZoomProvider(root, {
      zoomIn: () => setZoom(getZoomState().scale * 1.2, 'zoom-in', 'api'),
      zoomOut: () => setZoom(getZoomState().scale / 1.2, 'zoom-out', 'api'),
      resetZoom: () => { fitToView(undefined, 'api'); return getZoomState(); },
      setZoom: value => setZoom(value, 'zoom-change', 'api'),
      fit: request => fitToView(request, request.source), getState: getZoomState, subscribe: zoomEmitter.subscribe,
    });
    registerFileViewerViewStateProvider(root, {
      getState: getViewState,
      async applyState(nextState: FileViewerViewState, applyOptions: FileViewerApplyViewStateOptions = {}) {
        const source = applyOptions.source || 'api';
        if (Number.isFinite(nextState.page)) await setFrame(Number(nextState.page) - 1, source);
        const nextScale = Number(nextState.scale ?? nextState.zoom?.scale);
        if (Number.isFinite(nextScale)) setZoom(nextScale, 'zoom-change', source);
        if (Number.isFinite(nextState.rotation)) setRotation(Number(nextState.rotation), 'rotation-change', source);
        const extra = nextState.extra || {};
        const nextWidth = finiteNumber(extra.windowWidth, Number.NaN);
        const nextCenter = finiteNumber(extra.windowCenter, Number.NaN);
        if (Number.isFinite(nextWidth) && Number.isFinite(nextCenter)) {
          widthInput.value = String(nextWidth); centerInput.value = String(nextCenter); applyWindow();
        }
        const nextPan = Array.isArray(extra.pan) ? extra.pan : [];
        if (nextPan.length >= 2 && Number.isFinite(nextPan[0]) && Number.isFinite(nextPan[1])) {
          viewport?.setPan([Number(nextPan[0]), Number(nextPan[1])]); viewport?.render();
          root.dataset.panX = String(Number(nextPan[0])); root.dataset.panY = String(Number(nextPan[1]));
        }
        const action = applyOptions.action || 'restore';
        return applyOptions.notify === false ? getViewState() : emitViewState(action, source);
      },
      fit: request => fitToView(request, request.source), subscribe: viewStateEmitter.subscribe,
    });

    listen(previousButton, 'click', () => void setFrame(currentFrame - 1));
    listen(nextButton, 'click', () => void setFrame(currentFrame + 1));
    listen(zoomOutButton, 'click', () => setZoom(getZoomState().scale / 1.2, 'zoom-out', 'user'));
    listen(zoomInButton, 'click', () => setZoom(getZoomState().scale * 1.2, 'zoom-in', 'user'));
    listen(fitButton, 'click', () => fitToView(undefined, 'user'));
    listen(rotateLeftButton, 'click', () => setRotation(currentRotation - 90, 'rotate-left', 'user'));
    listen(rotateRightButton, 'click', () => setRotation(currentRotation + 90, 'rotate-right', 'user'));
    listen(widthInput, 'change', applyWindow); listen(centerInput, 'change', applyWindow);
    listen(stage, 'wheel', event => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey || inspected.frameCount === 1) {
        setZoom(getZoomState().scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), 'zoom-change', 'user');
      } else void setFrame(currentFrame + (event.deltaY > 0 ? 1 : -1));
    }, { passive: false });
    listen(stage, 'keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); void setFrame(currentFrame - 1); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); void setFrame(currentFrame + 1); }
      else if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(getZoomState().scale * 1.2, 'zoom-in', 'user'); }
      else if (event.key === '-') { event.preventDefault(); setZoom(getZoomState().scale / 1.2, 'zoom-out', 'user'); }
      else if (event.key === '0' || event.key === 'Home') { event.preventDefault(); fitToView(undefined, 'user'); }
      else if (event.key === '[' || (event.key.toLowerCase() === 'r' && event.shiftKey)) { event.preventDefault(); setRotation(currentRotation - 90, 'rotate-left', 'user'); }
      else if (event.key === ']' || event.key.toLowerCase() === 'r') { event.preventDefault(); setRotation(currentRotation + 90, 'rotate-right', 'user'); }
    });
    listen(stage, 'pointerdown', event => {
      if (event.button !== 0 || !viewport) return;
      pointerId = event.pointerId; pointerStart = [event.clientX, event.clientY];
      const pan = viewport.getPan(); panStart = [pan[0], pan[1]];
      stage.setPointerCapture(event.pointerId); stage.classList.add('is-panning'); stage.focus({ preventScroll: true });
    });
    listen(stage, 'pointermove', event => {
      if (pointerId !== event.pointerId || !viewport) return;
      const nextPan: [number, number] = [panStart[0] + event.clientX - pointerStart[0], panStart[1] + event.clientY - pointerStart[1]];
      viewport.setPan(nextPan); viewport.render();
      root.dataset.panX = String(Number(nextPan[0].toFixed(3))); root.dataset.panY = String(Number(nextPan[1].toFixed(3)));
    });
    const endPointer = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      pointerId = null; stage.classList.remove('is-panning'); emitViewState('pan-change', 'user');
    };
    listen(stage, 'pointerup', endPointer); listen(stage, 'pointercancel', endPointer);
    const ResizeObserverConstructor = documentRef.defaultView?.ResizeObserver;
    if (ResizeObserverConstructor) {
      resizeObserver = new ResizeObserverConstructor(() => {
        if (!destroyed && renderingEngine && !renderingEngine.hasBeenDestroyed) renderingEngine.resize(true, true);
      });
      resizeObserver.observe(body);
    }
    previousButton.disabled = true; nextButton.disabled = inspected.frameCount <= 1;
    root.dataset.status = 'ready'; state.hidden = true; syncFrameUi(); syncZoomUi(); emitViewState('init', 'viewer');
  } catch (error) {
    if (!destroyed) {
      root.dataset.status = 'error'; state.hidden = false; state.classList.add('error'); state.textContent = safeErrorMessage(error);
    }
    cleanup();
    // An abort can destroy the viewport while its initial worker request is
    // settling. Purge the owner-scoped cache a second time after setStack has
    // rejected/resolved so late metadata cannot survive the failed session.
    cleanupDicomResources(baseImageId, imageIds, null, '');
    throw error;
  }
  return { $el: root, destroy: cleanup };
}
