import type { FileViewerOptions, FileViewerZoomProvider } from '../../contracts/types';
import type { FileViewerZoomOperation } from './zoom';

interface ZoomGestureOptions {
  provider: () => FileViewerZoomProvider | null;
  enabled: () => boolean;
  settings: () => FileViewerOptions['zoomGestures'];
  beforeZoom: (operation: FileViewerZoomOperation) => boolean | Promise<boolean>;
  onZoom: () => void;
}

export function installFileViewerZoomGestures(container: HTMLElement, options: ZoomGestureOptions) {
  const view = container.ownerDocument.defaultView;
  if (!view) return () => {};

  let disposed = false;
  let frame = 0;
  let busy = false;
  let pending: number | null = null;
  let pendingProvider: FileViewerZoomProvider | null = null;
  let pinch: { distance: number; scale: number; provider: FileViewerZoomProvider } | null = null;

  const allowed = (kind: 'wheel' | 'pinch') => {
    const settings = options.settings();
    return settings !== false &&
      (typeof settings !== 'object' || settings[kind] !== false) && options.enabled();
  };
  const interactive = (event: Event) => event.composedPath().some(target =>
    target instanceof view.Element && target.matches(
      'button,a[href],input,textarea,select,[contenteditable]:not([contenteditable="false"])'
    ));
  const clamp = (scale: number, provider: FileViewerZoomProvider) => {
    const state = provider.getState();
    return Math.min(state.maxScale ?? 4, Math.max(state.minScale ?? 0.1, scale));
  };
  const schedule = () => {
    if (!disposed && !busy && !frame && pending !== null) {
      frame = view.requestAnimationFrame(() => { frame = 0; void flush(); });
    }
  };
  const flush = async () => {
    const scale = pending;
    const provider = pendingProvider;
    pending = null;
    pendingProvider = null;
    if (disposed || !options.enabled() || scale === null || !provider?.setZoom ||
      provider !== options.provider()) return;
    const operation = scale >= provider.getState().scale ? 'zoom-in' : 'zoom-out';
    busy = true;
    try {
      if (!await options.beforeZoom(operation) || disposed || !options.enabled() ||
        provider !== options.provider()) return;
      await provider.setZoom(clamp(scale, provider));
      if (!disposed && provider === options.provider()) options.onZoom();
    } catch {
      // Operation hooks report their errors. Native events have no caller to
      // receive a rejected promise, so do not leak an unhandled rejection.
    } finally {
      busy = false;
      schedule();
    }
  };
  const queue = (scale: number, provider: FileViewerZoomProvider) => {
    pending = clamp(scale, provider);
    pendingProvider = provider;
    schedule();
  };
  const wheel = (event: WheelEvent) => {
    if (event.defaultPrevented || !allowed('wheel') || !(event.ctrlKey || event.metaKey) ||
      interactive(event) || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
    const provider = options.provider();
    if (!provider?.setZoom) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, container.clientHeight) : 1;
    const start = pendingProvider === provider && pending !== null ? pending : provider.getState().scale;
    queue(start * Math.exp(-Math.max(-1000, Math.min(1000, event.deltaY * unit)) * 0.002), provider);
    event.preventDefault();
  };
  const distance = (touches: TouchList) => Math.hypot(
    touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY
  );
  const start = (event: TouchEvent) => {
    if (event.defaultPrevented || event.touches.length !== 2 || !allowed('pinch') || interactive(event)) return;
    const provider = options.provider();
    const d = distance(event.touches);
    if (!provider?.setZoom || !Number.isFinite(d) || d <= 0) return;
    pinch = { distance: d, scale: provider.getState().scale, provider };
    event.preventDefault();
  };
  const move = (event: TouchEvent) => {
    if (!pinch || event.touches.length !== 2 || !allowed('pinch') || pinch.provider !== options.provider()) {
      pinch = null;
      return;
    }
    const d = distance(event.touches);
    if (!Number.isFinite(d) || d <= 0) return;
    queue(pinch.scale * d / pinch.distance, pinch.provider);
    event.preventDefault();
  };
  const end = (event: TouchEvent) => { if (event.touches.length !== 2) pinch = null; };
  container.addEventListener('wheel', wheel, { passive: false });
  container.addEventListener('touchstart', start, { passive: false });
  container.addEventListener('touchmove', move, { passive: false });
  container.addEventListener('touchend', end);
  container.addEventListener('touchcancel', end);
  return () => {
    disposed = true;
    pending = null;
    pendingProvider = null;
    pinch = null;
    if (frame) view.cancelAnimationFrame(frame);
    container.removeEventListener('wheel', wheel);
    container.removeEventListener('touchstart', start);
    container.removeEventListener('touchmove', move);
    container.removeEventListener('touchend', end);
    container.removeEventListener('touchcancel', end);
  };
}
