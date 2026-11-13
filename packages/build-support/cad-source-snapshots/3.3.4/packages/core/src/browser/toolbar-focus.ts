type ToolbarControl = HTMLButtonElement | HTMLInputElement;

/** Preserve the active logical action across state-driven toolbar rebuilds. */
export function createToolbarFocusRestorer(toolbar: HTMLElement, content: HTMLElement) {
  let pendingKey: string | null = null;
  const controls = () => Array.from(toolbar.querySelectorAll<ToolbarControl>('[data-viewer-toolbar-key]'));
  return () => {
    const root = toolbar.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement as HTMLElement | null;
    const key = active === toolbar ? pendingKey : active && toolbar.contains(active)
      ? active.dataset.viewerToolbarKey : null;
    pendingKey = null;
    if (!key) return (_temporarilyUnavailable = false) => undefined;
    const oldIndex = controls().indexOf(active as ToolbarControl);
    const input = active?.tagName === 'INPUT' ? active as HTMLInputElement : null;
    const selection = input && input.selectionStart !== null
      ? [input.selectionStart, input.selectionEnd, input.selectionDirection] as const : null;
    return (temporarilyUnavailable = false) => {
      if (!toolbar.isConnected) return;
      if (toolbar.hidden) {
        content.tabIndex = -1;
        content.focus({ preventScroll: true });
        return;
      }
      const all = controls();
      const original = all.find(element => element.dataset.viewerToolbarKey === key);
      const available = (element: ToolbarControl) => !element.disabled && element.getClientRects().length > 0;
      const index = original ? all.indexOf(original) : Math.max(0, oldIndex);
      const target = original && available(original) ? original
        : temporarilyUnavailable ? undefined
        : all.slice(index).find(available) || all.slice(0, index).reverse().find(available);
      if (target) {
        target.focus({ preventScroll: true });
        if (target === original && target.tagName === 'INPUT' && selection)
          (target as HTMLInputElement).setSelectionRange(selection[0], selection[1], selection[2] || undefined);
      } else {
        // All actions may be temporarily disabled during a load. Restore only
        // while the user remains here; moving elsewhere clears this pending key.
        pendingKey = key;
        toolbar.tabIndex = -1;
        toolbar.focus({ preventScroll: true });
      }
    };
  };
}
