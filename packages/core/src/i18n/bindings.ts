import type { FileViewerI18nContext } from '../contracts/types';

/** Bind only viewer-owned UI labels, never file-authored content or a control's parent. */
export const createFileViewerI18nBindings = (context?: FileViewerI18nContext) => {
  const bindings = new Map<Node, Map<string, () => void>>();
  let destroyed = false;
  const bind = (node: Node, slot: string, apply: (active: () => boolean) => void) => {
    if (destroyed) return () => {};
    const slots = bindings.get(node) || new Map<string, () => void>();
    const previous = slots.get(slot);
    let retired = false;
    let unsubscribe: (() => void) | undefined;
    const active = () => !destroyed && !retired && slots.get(slot) === release;
    const release = () => {
      if (retired) return;
      retired = true;
      if (slots.get(slot) === release) {
        slots.delete(slot);
        if (!slots.size) bindings.delete(node);
      }
      const cleanup = unsubscribe;
      unsubscribe = undefined;
      cleanup?.();
    };
    // Reserve ownership before calling user code, including the old cleanup.
    slots.set(slot, release);
    bindings.set(node, slots);
    const update = () => { if (active()) apply(active); };
    try {
      previous?.();
      update();
      if (active()) {
        const cleanup = context?.subscribe(update);
        if (active()) unsubscribe = cleanup;
        else cleanup?.();
      }
    } catch (error) {
      // Preserve the triggering error even if disposal also throws.
      try { release(); } catch { /* The first error wins. */ }
      throw error;
    }
    return release;
  };
  const releaseAll = (releases: Array<() => void>) => {
    let failed = false;
    let firstError: unknown;
    for (const release of releases) {
      try { release(); } catch (error) {
        if (!failed) { failed = true; firstError = error; }
      }
    }
    if (failed) throw firstError;
  };
  return {
    /** Shared ownership for the translator's explicit composed UI bindings. */
    bind(node: Node, slot: string, apply: (active: () => boolean) => void) {
      return bind(node, slot, apply);
    },
    text(node: Text | HTMLElement, value: () => string) {
      if (destroyed) return () => {};
      // Refuse to erase icons/controls. A single existing text node is reused.
      if (node.nodeType !== 3 && Array.from(node.childNodes).some(child => child.nodeType !== 3)) {
        throw new TypeError('Live i18n text binding requires a dedicated text-only UI label.');
      }
      const text = node.nodeType === 3 ? node as Text :
        node.childNodes.length === 1 ? node.firstChild as Text : node.ownerDocument.createTextNode('');
      if (text !== node && text.parentNode !== node) {
        while (node.firstChild) node.removeChild(node.firstChild);
        node.appendChild(text);
      }
      return bind(node, 'text', active => {
        const next = value();
        if (active() && text.data !== next) text.data = next;
      });
    },
    attr(node: Element, name: string, value: () => string) {
      if (!/^(aria-[\w-]+|title|placeholder|lang|dir)$/.test(name)) {
        throw new TypeError('Live i18n binding only supports UI text attributes.');
      }
      return bind(node, name, active => {
        const next = value();
        if (active() && node.getAttribute(name) !== next) node.setAttribute(name, next);
      });
    },
    release(root: Node) {
      const releases: Array<() => void> = [];
      for (const [node, slots] of [...bindings]) {
        if (node === root || root.contains(node)) releases.push(...slots.values());
      }
      releaseAll(releases);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      releaseAll([...bindings.values()].flatMap(slots => [...slots.values()]));
    },
  };
};
