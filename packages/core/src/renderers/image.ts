import {
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
} from '../features/document/dom';
import {
  resolveFileViewerFitScale,
} from '../features/document/fit';
import { createFileViewerTranslator } from '../i18n/messages';
import { createFileViewerZoomChangeEmitter as createZoomChangeEmitter } from '../features/document/zoom';
import type {
  FileRenderContext,
  FileViewerFitRequest,
  FileViewerFitResult,
  FileViewerRenderedInstance,
  FileViewerZoomState,
} from '../contracts/types';

const imageMimeMap: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  ico: 'image/x-icon',
  jxl: 'image/jxl',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
};

const imageStyle = `
.image-viewer{position:relative;width:100%;height:100%;overflow:auto;background:var(--file-viewer-render-surface-background,#eef1f4);box-sizing:border-box}
.image-stage{min-width:100%;min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.image-stage img{display:block;width:auto;max-width:none;margin:0 auto;border:0;box-shadow:0 18px 48px rgba(15,23,42,.16);background:#fff;cursor:zoom-in}
.image-stage img:focus-visible{outline:3px solid #2563eb;outline-offset:4px}
.image-lightbox{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:40px;background:rgba(15,23,42,.9);box-sizing:border-box;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility 0s linear .18s}
.image-lightbox[data-open='true']{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}
.image-lightbox img{display:block;max-width:100%;max-height:100%;object-fit:contain;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.4);cursor:default;transform:scale(.985);transition:transform .18s ease}
.image-lightbox[data-open='true'] img{transform:scale(1)}
.image-lightbox button{position:absolute;top:16px;right:16px;display:grid;width:40px;height:40px;place-items:center;padding:0;border:1px solid rgba(255,255,255,.7);border-radius:999px;background:rgba(255,255,255,.96);color:#172033;font:400 27px/1 Arial,sans-serif;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.24);transition:background-color .14s ease,transform .14s ease}
.image-lightbox button:hover{background:#fff;transform:scale(1.04)}
.image-lightbox button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
[data-viewer-theme='dark'] .image-viewer{background:var(--file-viewer-render-surface-background,#101820)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .image-viewer{background:var(--file-viewer-render-surface-background,#101820)}}
@media (max-width:767px){.image-stage{padding:12px}.image-lightbox{padding:16px}.image-lightbox button{top:12px;right:12px}}
@media (prefers-reduced-motion:reduce){.image-lightbox,.image-lightbox img,.image-lightbox button{transition:none}}
`;

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = imageStyle;
  return style;
};

const getImageBlobType = (type?: string) => {
  const normalized = (type || '').trim().toLowerCase();
  return imageMimeMap[normalized] || 'image/*';
};

const readBlobDataUrl = async (blob: Blob): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Unable to read image data URL.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read image data URL.'));
    reader.readAsDataURL(blob);
  });
};

const resolveImageUrl = async (buffer: ArrayBuffer, type?: string) => {
  const normalizedType = (type || '').trim().toLowerCase();
  if (normalizedType === 'heic' || normalizedType === 'heif') {
    throw new Error(
      'HEIC/HEIF image conversion has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-image, or use @file-viewer/preset-all.'
    );
  }
  return readBlobDataUrl(new Blob([buffer], { type: getImageBlobType(normalizedType) }));
};

const roundImageScale = (value: number) => {
  return Number(value.toFixed(3));
};

const createLightbox = (
  documentRef: Document,
  src: string,
  t: ReturnType<typeof createFileViewerTranslator>
) => {
  const lightbox = documentRef.createElement('div');
  lightbox.className = 'image-lightbox';
  lightbox.dataset.open = 'false';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-hidden', 'true');

  const image = documentRef.createElement('img');
  image.alt = t('image.lightbox.alt');
  image.src = src;

  const closeButton = documentRef.createElement('button');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', t('image.lightbox.close'));
  closeButton.textContent = '×';

  let previousFocus: HTMLElement | null = null;
  const close = () => {
    if (lightbox.dataset.open !== 'true') return;
    lightbox.dataset.open = 'false';
    lightbox.setAttribute('aria-hidden', 'true');
    if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && lightbox.dataset.open === 'true') {
      event.preventDefault();
      close();
    }
  };

  closeButton.addEventListener('click', close);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      close();
    }
  });
  documentRef.addEventListener('keydown', onKeyDown);
  lightbox.append(image, closeButton);

  return {
    element: lightbox,
    open(invoker?: HTMLElement | null) {
      previousFocus =
        invoker ||
        (documentRef.activeElement instanceof HTMLElement ? documentRef.activeElement : null);
      lightbox.dataset.open = 'true';
      lightbox.setAttribute('aria-hidden', 'false');
      closeButton.focus({ preventScroll: true });
    },
    destroy() {
      closeButton.removeEventListener('click', close);
      documentRef.removeEventListener('keydown', onKeyDown);
      lightbox.remove();
    },
  };
};

export default async function renderImage(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options);
  const documentRef = target.ownerDocument || document;
  const targetWindow = documentRef.defaultView;
  const src = await resolveImageUrl(buffer, type);
  context?.registerThumbnailAdapter?.({
    capture: () => new Blob([buffer], { type: getImageBlobType(type) }),
  });
  let userZoom = 1;
  let fitScale = 1;
  let currentScale = 1;
  let viewportHeight = 0;
  let viewportResizeFrame: number | null = null;
  let destroyed = false;
  const zoomEmitter = createZoomChangeEmitter();

  const root = documentRef.createElement('div');
  root.className = 'image-viewer';
  root.dataset.viewerZoomProvider = 'image';

  const stage = documentRef.createElement('div');
  stage.className = 'image-stage';

  const image = documentRef.createElement('img');
  image.alt = t('image.alt');
  image.src = src;
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-haspopup', 'dialog');
  stage.append(image);
  root.append(stage);

  const lightbox = createLightbox(documentRef, src, t);
  const openLightbox = () => lightbox.open(image);
  const openLightboxFromKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      lightbox.open(image);
    }
  };
  image.addEventListener('click', openLightbox);
  image.addEventListener('keydown', openLightboxFromKeyboard);

  const getMinScale = () => Math.min(0.1, fitScale || 0.1);
  const clampScale = (value: number) => {
    const minScale = getMinScale();
    return Math.min(5, Math.max(minScale, roundImageScale(value)));
  };
  const computeFitScale = () => {
    const naturalWidth = image.naturalWidth || 0;
    const naturalHeight = image.naturalHeight || 0;
    if (!naturalWidth || !naturalHeight) {
      return 1;
    }

    const availableWidth = Math.max((root.clientWidth || 0) - 48, 1);
    const availableHeight = Math.max((root.clientHeight || viewportHeight || 0) - 48, 1);
    return Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
  };
  const applyImageZoom = () => {
    fitScale = computeFitScale();
    currentScale = clampScale(fitScale * userZoom);
    if (image.naturalWidth && image.naturalHeight) {
      image.style.width = `${Math.max(1, Math.round(image.naturalWidth * currentScale))}px`;
      image.style.height = `${Math.max(1, Math.round(image.naturalHeight * currentScale))}px`;
      return;
    }
    image.style.width = 'auto';
    image.style.height = viewportHeight > 0
      ? `${Math.max(1, Math.round(viewportHeight * userZoom))}px`
      : `${userZoom * 100}%`;
  };
  const updateViewportSize = () => {
    viewportHeight = root.clientHeight || 0;
    applyImageZoom();
    zoomEmitter.emit();
  };
  // Zoom subscribers may resize the parent toolbar. Keep geometry writes out
  // of ResizeObserver delivery so ancestor notifications remain deliverable.
  const scheduleViewportUpdate = () => {
    if (destroyed || viewportResizeFrame !== null) return;
    if (!targetWindow?.requestAnimationFrame) {
      updateViewportSize();
      return;
    }
    viewportResizeFrame = targetWindow.requestAnimationFrame(() => {
      viewportResizeFrame = null;
      if (!destroyed) updateViewportSize();
    });
  };
  const resizeObserver = new ResizeObserver(scheduleViewportUpdate);
  resizeObserver.observe(root);
  image.addEventListener('load', updateViewportSize);

  const getZoomState = (): FileViewerZoomState => ({
    scale: currentScale,
    label: `${Math.round(currentScale * 100)}%`,
    canZoomIn: currentScale < 5,
    canZoomOut: currentScale > getMinScale(),
    canReset: Math.abs(userZoom - 1) > 0.001,
    minScale: getMinScale(),
    maxScale: 5,
  });

  const setZoom = (scale: number) => {
    const nextScale = clampScale(scale);
    userZoom = nextScale / Math.max(fitScale, 0.001);
    applyImageZoom();
    zoomEmitter.emit();
    return getZoomState();
  };

  const fitImage = (request: FileViewerFitRequest): FileViewerFitResult => {
    const naturalWidth = image.naturalWidth || 0;
    const naturalHeight = image.naturalHeight || 0;
    if (!naturalWidth || !naturalHeight) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'image-not-ready',
        provider: 'zoom',
      };
    }

    const mode = request.mode === 'auto' ? 'scale-down' : request.mode;
    const scale = resolveFileViewerFitScale({
      mode,
      viewportWidth: Math.max(1, request.viewportWidth || root.clientWidth || 0),
      viewportHeight: Math.max(1, request.viewportHeight || root.clientHeight || viewportHeight || 0),
      contentWidth: naturalWidth,
      contentHeight: naturalHeight,
      currentScale,
      minScale: request.minScale ?? getMinScale(),
      maxScale: request.maxScale ?? 5,
    });

    if (!scale) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'unmeasurable',
        provider: 'zoom',
      };
    }

    const state = setZoom(scale);
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'zoom',
    };
  };

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(currentScale + 0.15),
    zoomOut: () => setZoom(currentScale - 0.15),
    resetZoom: () => {
      userZoom = 1;
      applyImageZoom();
      zoomEmitter.emit();
      return getZoomState();
    },
    setZoom,
    fit: fitImage,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  target.replaceChildren(createStyle(documentRef), root);
  (context?.surface?.shadowRoot || target).append(lightbox.element);
  updateViewportSize();

  return {
    $el: target,
    unmount() {
      destroyed = true;
      if (viewportResizeFrame !== null) {
        targetWindow?.cancelAnimationFrame(viewportResizeFrame);
        viewportResizeFrame = null;
      }
      context?.registerThumbnailAdapter?.(null);
      unregisterFileViewerZoomProvider(root);
      resizeObserver.disconnect();
      image.removeEventListener('load', updateViewportSize);
      image.removeEventListener('click', openLightbox);
      image.removeEventListener('keydown', openLightboxFromKeyboard);
      lightbox.destroy();
      target.replaceChildren();
    },
  };
}
