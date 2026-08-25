import {
  createFileViewerTranslator,
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  resolveFileViewerFitScale,
  registerFileViewerViewStateProvider,
  registerFileViewerZoomProvider,
  unregisterFileViewerViewStateProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerApplyViewStateOptions,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerViewState,
  type FileViewerViewStateChangeAction,
  type FileViewerViewStateChangeSource,
  type FileViewerZoomState,
} from '@file-viewer/core';

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
.image-toolbar{position:sticky;top:12px;z-index:5;display:flex;align-items:center;gap:6px;width:max-content;height:42px;margin:12px 12px -54px auto;padding:5px 7px;border:1px solid rgba(148,163,184,.34);border-radius:10px;background:rgba(255,255,255,.92);box-shadow:0 10px 28px rgba(15,23,42,.14);backdrop-filter:blur(12px);box-sizing:border-box}
.image-toolbar button{display:grid;width:30px;height:30px;place-items:center;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:#334155;font:600 19px/1 system-ui,sans-serif;cursor:pointer;box-sizing:border-box}
.image-toolbar button:hover{border-color:#bfd2ea;background:#edf5ff;color:#1769d8}
.image-toolbar button:focus-visible{outline:3px solid #60a5fa;outline-offset:1px}
.image-rotation-meter{min-width:38px;color:#64748b;font:700 12px/1 system-ui,sans-serif;text-align:center}
.image-stage{min-width:100%;min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.image-frame{position:relative;flex:0 0 auto}
.image-stage img{position:absolute;top:50%;left:50%;display:block;width:auto;max-width:none;margin:0;border:0;box-shadow:0 18px 48px rgba(15,23,42,.16);background:#fff;cursor:zoom-in;transform:translate(-50%,-50%) rotate(var(--image-rotation,0deg));transform-origin:center center;transition:transform .18s ease}
.image-stage img:focus-visible{outline:3px solid #2563eb;outline-offset:4px}
.image-lightbox{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:40px;background:rgba(15,23,42,.9);box-sizing:border-box;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility 0s linear .18s}
.image-lightbox[data-open='true']{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}
.image-lightbox img{display:block;max-width:100%;max-height:100%;object-fit:contain;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.4);cursor:default;transform:rotate(var(--image-rotation,0deg)) scale(.985);transition:transform .18s ease}
.image-lightbox[data-open='true'] img{transform:rotate(var(--image-rotation,0deg)) scale(1)}
.image-lightbox button{position:absolute;top:16px;right:16px;display:grid;width:40px;height:40px;place-items:center;padding:0;border:1px solid rgba(255,255,255,.7);border-radius:999px;background:rgba(255,255,255,.96);color:#172033;font:400 27px/1 Arial,sans-serif;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.24);transition:background-color .14s ease,transform .14s ease}
.image-lightbox button:hover{background:#fff;transform:scale(1.04)}
.image-lightbox button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
[data-viewer-theme='dark'] .image-viewer{background:var(--file-viewer-render-surface-background,#101820)}
[data-viewer-theme='dark'] .image-toolbar{border-color:rgba(148,163,184,.28);background:rgba(17,24,39,.88)}
[data-viewer-theme='dark'] .image-toolbar button{color:#dbe5f2}
[data-viewer-theme='dark'] .image-rotation-meter{color:#b7c5d7}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .image-viewer{background:var(--file-viewer-render-surface-background,#101820)}}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .image-toolbar{border-color:rgba(148,163,184,.28);background:rgba(17,24,39,.88)}[data-viewer-theme='system'] .image-toolbar button{color:#dbe5f2}[data-viewer-theme='system'] .image-rotation-meter{color:#b7c5d7}}
@media (max-width:767px){.image-toolbar{top:8px;margin:8px 8px -50px auto}.image-stage{padding:12px}.image-lightbox{padding:16px}.image-lightbox button{top:12px;right:12px}}
@media (prefers-reduced-motion:reduce){.image-stage img,.image-lightbox,.image-lightbox img,.image-lightbox button{transition:none}}
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

const renderHeic = async (buffer: ArrayBuffer, type?: string) => {
  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({
    blob: new Blob([buffer], { type: getImageBlobType(type) }),
    toType: 'image/png',
  });
  const blob = Array.isArray(result) ? result[0] : result;
  return readBlobDataUrl(blob);
};

const resolveImageUrl = async (buffer: ArrayBuffer, type?: string) => {
  const normalizedType = (type || '').trim().toLowerCase();
  if (normalizedType === 'heic' || normalizedType === 'heif') {
    return renderHeic(buffer, normalizedType);
  }
  return readBlobDataUrl(new Blob([buffer], { type: getImageBlobType(normalizedType) }));
};

export const hasTiffSignature = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  );
};

const waitForImageReady = async (image: HTMLImageElement) => {
  if (image.complete) {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) return;
    throw new Error('The browser could not decode this image format.');
  }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('The browser could not decode this image format.'));
    };
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
  });
};

const roundImageScale = (value: number) => {
  return Number(value.toFixed(3));
};

export const normalizeImageRotation = (rotation: number) => {
  return ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
};

export const resolveRotatedImageSize = (
  naturalWidth: number,
  naturalHeight: number,
  scale: number,
  rotation: number
) => {
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const swapsAxes = normalizeImageRotation(rotation) % 180 !== 0;
  return {
    imageWidth: width,
    imageHeight: height,
    frameWidth: swapsAxes ? height : width,
    frameHeight: swapsAxes ? width : height,
  };
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
  const ownerWindow = documentRef.defaultView;
  let rotation = 0;

  const syncImageSize = () => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const style = ownerWindow?.getComputedStyle(lightbox);
    const horizontalPadding = Number.parseFloat(style?.paddingLeft || '0') +
      Number.parseFloat(style?.paddingRight || '0');
    const verticalPadding = Number.parseFloat(style?.paddingTop || '0') +
      Number.parseFloat(style?.paddingBottom || '0');
    const availableWidth = Math.max(1, lightbox.clientWidth - horizontalPadding);
    const availableHeight = Math.max(1, lightbox.clientHeight - verticalPadding);
    const swapsAxes = rotation % 180 !== 0;
    const visualWidth = swapsAxes ? image.naturalHeight : image.naturalWidth;
    const visualHeight = swapsAxes ? image.naturalWidth : image.naturalHeight;
    const scale = Math.min(1, availableWidth / visualWidth, availableHeight / visualHeight);
    image.style.width = `${Math.max(1, Math.round(image.naturalWidth * scale))}px`;
    image.style.height = `${Math.max(1, Math.round(image.naturalHeight * scale))}px`;
  };
  image.addEventListener('load', syncImageSize);
  ownerWindow?.addEventListener('resize', syncImageSize);

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
    setRotation(nextRotation: number) {
      rotation = normalizeImageRotation(nextRotation);
      lightbox.style.setProperty('--image-rotation', `${rotation}deg`);
      syncImageSize();
    },
    open(invoker?: HTMLElement | null) {
      previousFocus =
        invoker ||
        (documentRef.activeElement instanceof HTMLElement ? documentRef.activeElement : null);
      lightbox.dataset.open = 'true';
      lightbox.setAttribute('aria-hidden', 'false');
      syncImageSize();
      closeButton.focus({ preventScroll: true });
    },
    destroy() {
      closeButton.removeEventListener('click', close);
      documentRef.removeEventListener('keydown', onKeyDown);
      image.removeEventListener('load', syncImageSize);
      ownerWindow?.removeEventListener('resize', syncImageSize);
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
  const normalizedType = (type || '').trim().toLowerCase();
  if ((normalizedType === 'tif' || normalizedType === 'tiff') && hasTiffSignature(buffer)) {
    const { renderTiff } = await import('./tiff.js');
    return renderTiff(buffer, target, context);
  }
  const t = createFileViewerTranslator(context?.options);
  const documentRef = target.ownerDocument || document;
  const src = await resolveImageUrl(buffer, type);
  let userZoom = 1;
  let fitScale = 1;
  let currentScale = 1;
  let currentRotation = 0;
  let viewportHeight = 0;
  let scrollStateFrame = 0;
  let destroyed = false;
  const zoomEmitter = createZoomChangeEmitter();
  const viewStateEmitter = createFileViewerViewStateChangeEmitter();

  const root = documentRef.createElement('div');
  root.className = 'image-viewer';
  root.dataset.viewerZoomProvider = 'image';

  const toolbar = documentRef.createElement('div');
  toolbar.className = 'image-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', t('image.toolbar.rotation'));
  const createRotateButton = (label: string, icon: string) => {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = icon;
    return button;
  };
  const rotateLeftButton = createRotateButton(t('image.toolbar.rotateLeft'), '↺');
  const rotationMeter = documentRef.createElement('span');
  rotationMeter.className = 'image-rotation-meter';
  rotationMeter.setAttribute('aria-live', 'polite');
  rotationMeter.textContent = '0°';
  const rotateRightButton = createRotateButton(t('image.toolbar.rotateRight'), '↻');
  toolbar.append(rotateLeftButton, rotationMeter, rotateRightButton);

  const stage = documentRef.createElement('div');
  stage.className = 'image-stage';

  const frame = documentRef.createElement('div');
  frame.className = 'image-frame';

  const image = documentRef.createElement('img');
  image.alt = t('image.alt');
  image.src = src;
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-haspopup', 'dialog');
  context?.registerThumbnailAdapter?.({
    capture: () => normalizedType === 'heic' || normalizedType === 'heif'
      ? null
      : new Blob([buffer], { type: getImageBlobType(normalizedType) }),
    getTarget: () => image,
  });
  frame.append(image);
  stage.append(frame);
  root.append(toolbar, stage);

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
    const swapsAxes = currentRotation % 180 !== 0;
    const visualWidth = swapsAxes ? naturalHeight : naturalWidth;
    const visualHeight = swapsAxes ? naturalWidth : naturalHeight;
    return Math.min(1, availableWidth / visualWidth, availableHeight / visualHeight);
  };
  const applyImageZoom = () => {
    fitScale = computeFitScale();
    currentScale = clampScale(fitScale * userZoom);
    if (image.naturalWidth && image.naturalHeight) {
      const size = resolveRotatedImageSize(
        image.naturalWidth,
        image.naturalHeight,
        currentScale,
        currentRotation
      );
      image.style.width = `${size.imageWidth}px`;
      image.style.height = `${size.imageHeight}px`;
      frame.style.width = `${size.frameWidth}px`;
      frame.style.height = `${size.frameHeight}px`;
      image.style.setProperty('--image-rotation', `${currentRotation}deg`);
      return;
    }
    image.style.width = 'auto';
    image.style.height = viewportHeight > 0
      ? `${Math.max(1, Math.round(viewportHeight * userZoom))}px`
      : `${userZoom * 100}%`;
    frame.style.width = image.style.width;
    frame.style.height = image.style.height;
    image.style.setProperty('--image-rotation', `${currentRotation}deg`);
  };
  const updateViewportSize = () => {
    viewportHeight = root.clientHeight || 0;
    applyImageZoom();
    zoomEmitter.emit();
  };
  const resizeObserver = new ResizeObserver(updateViewportSize);
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

  const readScrollState = () => {
    const maxTop = Math.max(0, root.scrollHeight - root.clientHeight);
    const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth);
    return {
      top: root.scrollTop || 0,
      left: root.scrollLeft || 0,
      width: root.scrollWidth || 0,
      height: root.scrollHeight || 0,
      clientWidth: root.clientWidth || 0,
      clientHeight: root.clientHeight || 0,
      topRatio: maxTop > 0 ? (root.scrollTop || 0) / maxTop : 0,
      leftRatio: maxLeft > 0 ? (root.scrollLeft || 0) / maxLeft : 0,
    };
  };

  const getImageViewState = (): FileViewerViewState => ({
    renderer: 'image',
    scale: currentScale,
    zoom: getZoomState(),
    rotation: currentRotation,
    scroll: readScrollState(),
  });

  const emitViewStateChange = (
    action: FileViewerViewStateChangeAction,
    source: FileViewerViewStateChangeSource = 'viewer'
  ) => {
    const state = getImageViewState();
    if (!destroyed) {
      viewStateEmitter.emit(createFileViewerViewStateChange(state, { action, source }));
    }
    return state;
  };

  const setZoom = (
    scale: number,
    action: FileViewerViewStateChangeAction = 'zoom-change',
    source: FileViewerViewStateChangeSource = 'api',
    notifyViewState = true
  ) => {
    const nextScale = clampScale(scale);
    userZoom = nextScale / Math.max(fitScale, 0.001);
    applyImageZoom();
    zoomEmitter.emit();
    if (notifyViewState) {
      emitViewStateChange(action, source);
    }
    return getZoomState();
  };

  const applyImageRotation = (
    rotation: number,
    action: FileViewerViewStateChangeAction = 'rotation-change',
    source: FileViewerViewStateChangeSource = 'viewer',
    notifyViewState = true
  ) => {
    const normalized = normalizeImageRotation(rotation);
    if (normalized === currentRotation) {
      return getImageViewState();
    }
    currentRotation = normalized;
    rotationMeter.textContent = `${currentRotation}°`;
    lightbox.setRotation(currentRotation);
    applyImageZoom();
    zoomEmitter.emit();
    return notifyViewState
      ? emitViewStateChange(action, source)
      : getImageViewState();
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
    const swapsAxes = currentRotation % 180 !== 0;
    const scale = resolveFileViewerFitScale({
      mode,
      viewportWidth: Math.max(1, request.viewportWidth || root.clientWidth || 0),
      viewportHeight: Math.max(1, request.viewportHeight || root.clientHeight || viewportHeight || 0),
      contentWidth: swapsAxes ? naturalHeight : naturalWidth,
      contentHeight: swapsAxes ? naturalWidth : naturalHeight,
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

    const state = setZoom(scale, 'fit', request.source);
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'zoom',
    };
  };

  const restoreScrollState = (scroll: FileViewerViewState['scroll']) => {
    if (!scroll) return;
    const maxTop = Math.max(0, root.scrollHeight - root.clientHeight);
    const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth);
    const top = Number.isFinite(scroll.top)
      ? Number(scroll.top)
      : Number.isFinite(scroll.topRatio)
        ? Number(scroll.topRatio) * maxTop
        : undefined;
    const left = Number.isFinite(scroll.left)
      ? Number(scroll.left)
      : Number.isFinite(scroll.leftRatio)
        ? Number(scroll.leftRatio) * maxLeft
        : undefined;
    if (top !== undefined) root.scrollTop = Math.min(Math.max(0, top), maxTop);
    if (left !== undefined) root.scrollLeft = Math.min(Math.max(0, left), maxLeft);
  };

  const applyImageViewState = async (
    state: FileViewerViewState,
    options: FileViewerApplyViewStateOptions = {}
  ) => {
    const source = options.source || 'api';
    const action = options.action || 'restore';
    const nextRotation = Number(state.rotation);
    const nextScale = Number(state.scale ?? state.zoom?.scale);
    if (Number.isFinite(nextRotation)) {
      applyImageRotation(nextRotation, 'rotation-change', source, false);
    }
    if (Number.isFinite(nextScale)) {
      setZoom(nextScale, 'zoom-change', source, false);
    }
    restoreScrollState(state.scroll);
    return options.notify === false
      ? getImageViewState()
      : emitViewStateChange(action, source);
  };

  const targetWindow = documentRef.defaultView;
  const scheduleScrollViewStateChange = () => {
    if (destroyed || scrollStateFrame) return;
    if (!targetWindow?.requestAnimationFrame) {
      emitViewStateChange('scroll', 'viewer');
      return;
    }
    scrollStateFrame = targetWindow.requestAnimationFrame(() => {
      scrollStateFrame = 0;
      emitViewStateChange('scroll', 'viewer');
    });
  };

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(currentScale + 0.15, 'zoom-in', 'api'),
    zoomOut: () => setZoom(currentScale - 0.15, 'zoom-out', 'api'),
    resetZoom: () => {
      userZoom = 1;
      applyImageZoom();
      zoomEmitter.emit();
      emitViewStateChange('zoom-reset', 'api');
      return getZoomState();
    },
    setZoom,
    fit: fitImage,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  });
  registerFileViewerViewStateProvider(root, {
    getState: getImageViewState,
    applyState: applyImageViewState,
    fit: fitImage,
    subscribe: viewStateEmitter.subscribe,
  });

  const rotateLeft = () => {
    applyImageRotation(currentRotation - 90, 'rotate-left', 'user');
  };
  const rotateRight = () => {
    applyImageRotation(currentRotation + 90, 'rotate-right', 'user');
  };
  rotateLeftButton.addEventListener('click', rotateLeft);
  rotateRightButton.addEventListener('click', rotateRight);
  root.addEventListener('scroll', scheduleScrollViewStateChange, { passive: true });

  target.replaceChildren(createStyle(documentRef), root);
  (context?.surface?.shadowRoot || target).append(lightbox.element);
  updateViewportSize();

  const cleanup = () => {
    destroyed = true;
    context?.registerThumbnailAdapter?.(null);
    unregisterFileViewerViewStateProvider(root);
    unregisterFileViewerZoomProvider(root);
    if (scrollStateFrame && targetWindow?.cancelAnimationFrame) {
      targetWindow.cancelAnimationFrame(scrollStateFrame);
      scrollStateFrame = 0;
    }
    resizeObserver.disconnect();
    root.removeEventListener('scroll', scheduleScrollViewStateChange);
    rotateLeftButton.removeEventListener('click', rotateLeft);
    rotateRightButton.removeEventListener('click', rotateRight);
    image.removeEventListener('load', updateViewportSize);
    image.removeEventListener('click', openLightbox);
    image.removeEventListener('keydown', openLightboxFromKeyboard);
    lightbox.destroy();
    target.replaceChildren();
  };

  try {
    await waitForImageReady(image);
    updateViewportSize();
    targetWindow?.requestAnimationFrame(() => emitViewStateChange('init', 'viewer'));
  } catch (error) {
    cleanup();
    throw error;
  }

  return {
    $el: target,
    unmount() {
      cleanup();
    },
  };
}
