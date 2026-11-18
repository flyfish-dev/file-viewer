const isSpace = (event: KeyboardEvent) =>
  event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';

/** Preserve Space activation when a state notification replaces a toolbar button. */
export function bindToolbarKeyboardActivation(toolbar: HTMLElement): () => void {
  const documentRef = toolbar.ownerDocument;
  let pending: { key: string } | null = null;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { pending = null; };
  const clearOnSpaceDown = (event: KeyboardEvent) => {
    if (isSpace(event) || event.key === 'Tab' || event.key === 'Escape') clear();
  };
  const clearAfterSpaceUp = (event: KeyboardEvent) => {
    if (!isSpace(event)) return;
    const released = pending;
    clearTimeout(releaseTimer);
    // Browsers may run microtasks between capture and bubble listeners.
    // Clear after the complete event so the toolbar can consume this release.
    releaseTimer = setTimeout(() => { if (pending === released) clear(); }, 0);
  };
  const buttonFor = (event: KeyboardEvent) => {
    const target = event.target as HTMLButtonElement | null;
    return target?.tagName === 'BUTTON' && toolbar.contains(target) ? target : null;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isSpace(event) || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const button = buttonFor(event);
    if (!button?.dataset.viewerToolbarKey || button.disabled) return;
    event.preventDefault();
    pending = { key: button.dataset.viewerToolbarKey };
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (!isSpace(event)) return;
    const activation = pending;
    clear();
    if (!activation || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const button = buttonFor(event);
    if (!button || button.disabled || button.dataset.viewerToolbarKey !== activation.key) return;
    event.preventDefault();
    button.click();
  };
  documentRef.addEventListener('keydown', clearOnSpaceDown, true);
  documentRef.addEventListener('keyup', clearAfterSpaceUp, true);
  documentRef.addEventListener('pointerdown', clear, true);
  documentRef.defaultView?.addEventListener('blur', clear);
  toolbar.addEventListener('keydown', onKeyDown);
  toolbar.addEventListener('keyup', onKeyUp);
  return () => {
    clear();
    clearTimeout(releaseTimer);
    documentRef.removeEventListener('keydown', clearOnSpaceDown, true);
    documentRef.removeEventListener('keyup', clearAfterSpaceUp, true);
    documentRef.removeEventListener('pointerdown', clear, true);
    documentRef.defaultView?.removeEventListener('blur', clear);
    toolbar.removeEventListener('keydown', onKeyDown);
    toolbar.removeEventListener('keyup', onKeyUp);
  };
}
