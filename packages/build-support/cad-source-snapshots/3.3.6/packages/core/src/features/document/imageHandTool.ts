/** Optional mouse panning for image previews. Touch/pinch, keyboard activation,
 * controls and native scrollbars retain their normal browser behavior. */
export function installFileViewerImageHandTool(container: HTMLElement, signal?: AbortSignal): () => void {
  const view = container.ownerDocument.defaultView;
  if (!view || signal?.aborted) return () => {};
  const cursor = container.style.getPropertyValue('cursor');
  const cursorPriority = container.style.getPropertyPriority('cursor');
  const selection = container.style.getPropertyValue('user-select');
  const selectionPriority = container.style.getPropertyPriority('user-select');
  const previousMode = container.getAttribute('data-viewer-image-hand-tool');
  const previousPanning = container.getAttribute('data-viewer-image-panning');
  const style = container.ownerDocument.createElement('style');
  style.textContent = '[data-viewer-image-hand-tool="true"] img{cursor:grab!important}[data-viewer-image-panning="true"] img{cursor:grabbing!important}';
  container.append(style);
  const interactive = 'a,button,input,textarea,select,option,[contenteditable]:not([contenteditable="false"]),[role="button"]:not(img),[role="link"],[role="textbox"]';
  let drag: { id: number; x: number; y: number; left: number; top: number; ratioX: number; ratioY: number; moved: boolean } | null = null;
  let disposed = false;
  let suppressClick = false;
  let clickTimer = 0;
  const canPan = () => container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight;
  const syncCursor = () => {
    if (disposed || drag?.moved) return;
    const enabled = canPan();
    container.setAttribute('data-viewer-image-hand-tool', String(enabled));
    container.style.setProperty('cursor', enabled ? 'grab' : cursor, enabled ? '' : cursorPriority);
  };
  const finish = () => {
    const state = drag;
    if (!state) return;
    drag = null;
    container.style.setProperty('user-select', selection, selectionPriority);
    container.removeAttribute('data-viewer-image-panning');
    view.removeEventListener('pointermove', move, true);
    view.removeEventListener('pointerup', up, true);
    view.removeEventListener('pointercancel', up, true);
    view.removeEventListener('blur', finish);
    if (container.hasPointerCapture?.(state.id)) container.releasePointerCapture(state.id);
    suppressClick = state.moved;
    view.clearTimeout(clickTimer);
    clickTimer = view.setTimeout(() => { suppressClick = false; }, 250);
    syncCursor();
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!(event.buttons & 1)) { finish(); return; }
    const dx = (event.clientX - drag.x) / drag.ratioX;
    const dy = (event.clientY - drag.y) / drag.ratioY;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    if (!drag.moved) {
      drag.moved = true;
      container.setAttribute('data-viewer-image-panning', 'true');
      container.style.cursor = 'grabbing';
      container.style.setProperty('user-select', 'none');
      // Delay capture until a drag starts so an ordinary click still reaches
      // the image's lightbox handler instead of being retargeted to its parent.
      try { container.setPointerCapture?.(event.pointerId); } catch { /* window listeners remain active */ }
    }
    container.scrollLeft = drag.left - dx;
    container.scrollTop = drag.top - dy;
    event.preventDefault();
  };
  const up = (event: PointerEvent) => { if (event.pointerId === drag?.id) finish(); };
  const down = (event: PointerEvent) => {
    if (disposed || event.defaultPrevented || event.pointerType !== 'mouse' || event.button !== 0 || event.isPrimary === false || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (event.composedPath().some(node => node !== container && (node as Element).matches?.(interactive))) return;
    finish();
    suppressClick = false;
    syncCursor();
    if (!canPan()) return;
    const rect = container.getBoundingClientRect();
    const ratioX = container.offsetWidth ? rect.width / container.offsetWidth : 1;
    const ratioY = container.offsetHeight ? rect.height / container.offsetHeight : 1;
    if (![ratioX, ratioY].every(value => Number.isFinite(value) && value > 0)) return;
    const x = (event.clientX - rect.left) / ratioX - container.clientLeft;
    const y = (event.clientY - rect.top) / ratioY - container.clientTop;
    if (x < 0 || y < 0 || x >= container.clientWidth || y >= container.clientHeight) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: container.scrollLeft, top: container.scrollTop, ratioX, ratioY, moved: false };
    view.addEventListener('pointermove', move, { capture: true, passive: false });
    view.addEventListener('pointerup', up, true);
    view.addEventListener('pointercancel', up, true);
    view.addEventListener('blur', finish);
  };
  const click = (event: MouseEvent) => {
    if (suppressClick && event.detail > 0) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const nativeDrag = (event: DragEvent) => { if (drag) event.preventDefault(); };
  const restoreAttribute = (name: string, value: string | null) => value === null ? container.removeAttribute(name) : container.setAttribute(name, value);
  const dispose = () => {
    if (disposed) return;
    finish();
    disposed = true;
    view.clearTimeout(clickTimer);
    suppressClick = false;
    container.style.setProperty('cursor', cursor, cursorPriority);
    container.style.setProperty('user-select', selection, selectionPriority);
    restoreAttribute('data-viewer-image-hand-tool', previousMode);
    restoreAttribute('data-viewer-image-panning', previousPanning);
    container.removeEventListener('pointerdown', down);
    container.removeEventListener('pointermove', syncCursor);
    container.removeEventListener('pointerover', syncCursor);
    container.removeEventListener('lostpointercapture', up);
    container.removeEventListener('click', click, true);
    container.removeEventListener('dragstart', nativeDrag);
    signal?.removeEventListener('abort', dispose);
    style.remove();
  };
  container.addEventListener('pointerdown', down);
  container.addEventListener('pointermove', syncCursor);
  container.addEventListener('pointerover', syncCursor);
  container.addEventListener('lostpointercapture', up);
  container.addEventListener('click', click, true);
  container.addEventListener('dragstart', nativeDrag);
  signal?.addEventListener('abort', dispose, { once: true });
  syncCursor();
  return dispose;
}
