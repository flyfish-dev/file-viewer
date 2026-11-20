import {
  collectFileViewerDocumentAnchors,
  findFileViewerAnchorForElement,
  findFileViewerSearchProvider,
} from './dom';
import {
  createEmptyFileViewerSearchState,
  normalizeFileViewerSearchOptions,
} from './model';
import type {
  FileViewerDocumentAnchor,
  FileViewerSearchMatch,
  FileViewerSearchOptions,
  FileViewerSearchProvider,
  FileViewerSearchState,
} from '../../contracts/types';

export interface CreateFileViewerDomSearchControllerOptions {
  root: () => HTMLElement | null | undefined;
  options?: () => boolean | FileViewerSearchOptions | undefined;
  waitForDomUpdate?: () => Promise<void> | void;
  preferredScrollContainer?: () => HTMLElement | null | undefined;
}

export interface FileViewerInternalSearchMatch extends FileViewerSearchMatch {
  element: HTMLElement;
}

export interface FileViewerDomSearchController {
  readonly anchors: FileViewerDocumentAnchor[];
  readonly state: FileViewerSearchState;
  getInternalMatches(): FileViewerInternalSearchMatch[];
  observe(): void;
  refreshAnchors(): Promise<FileViewerDocumentAnchor[]>;
  search(query: string): Promise<FileViewerSearchState>;
  next(): Promise<FileViewerSearchState>;
  previous(): Promise<FileViewerSearchState>;
  clear(): Promise<FileViewerSearchState>;
  destroy(): void;
}

export interface FileViewerDocumentAnchorsTarget {
  value: FileViewerDocumentAnchor[];
}

export interface FileViewerDomSearchControllerStateTarget {
  anchors: FileViewerDocumentAnchorsTarget;
  state: MutableFileViewerSearchState;
}

export interface FileViewerDomSearchControllerActionHandlers {
  observe(): FileViewerSearchState;
  refreshAnchors(): Promise<FileViewerDocumentAnchor[]>;
  search(query: string): Promise<FileViewerSearchState>;
  next(): Promise<FileViewerSearchState>;
  previous(): Promise<FileViewerSearchState>;
  clear(): Promise<FileViewerSearchState>;
  destroy(): FileViewerSearchState;
}

export const DEFAULT_FILE_VIEWER_SEARCH_MATCH_CLASS = 'flyfish-search-match';
export const DEFAULT_FILE_VIEWER_SEARCH_ACTIVE_CLASS = 'flyfish-search-match--active';
export const DEFAULT_FILE_VIEWER_SEARCH_MAX_MATCHES = 1000;

const SKIP_SELECTOR = [
  'script',
  'style',
  'textarea',
  'input',
  'select',
  'button',
  '.viewer-actions',
  '.viewer-watermark',
  '.state-panel',
  '.pdf-toolbar',
  '.pdf-nav-pane',
  '[aria-hidden="true"]',
  '.flyfish-search-match',
  '.textLayer',
  '.annotationLayer',
  '.xfaLayer',
  'svg',
  'canvas',
  'iframe',
  'video',
  'audio',
].join(',');

const cloneSearchMatch = (match: FileViewerSearchMatch): FileViewerSearchMatch => ({
  ...match,
  anchor: match.anchor ? { ...match.anchor } : null,
});

export const cloneFileViewerSearchState = (state: FileViewerSearchState): FileViewerSearchState => ({
  query: state.query,
  total: state.total,
  currentIndex: state.currentIndex,
  current: state.current ? cloneSearchMatch(state.current) : null,
  matches: state.matches.map(cloneSearchMatch),
});

export type MutableFileViewerSearchState = FileViewerSearchState;

export const applyFileViewerSearchState = <Target extends MutableFileViewerSearchState>(
  target: Target,
  source: FileViewerSearchState
) => {
  const nextState = cloneFileViewerSearchState(source);
  target.query = nextState.query;
  target.total = nextState.total;
  target.currentIndex = nextState.currentIndex;
  target.current = nextState.current;
  target.matches = nextState.matches;

  return target;
};

export const syncFileViewerDomSearchControllerState = <
  Target extends FileViewerDomSearchControllerStateTarget,
>(
  target: Target,
  controller: Pick<FileViewerDomSearchController, 'anchors' | 'state'>
) => {
  target.anchors.value = controller.anchors;
  applyFileViewerSearchState(target.state, controller.state);
  return target.state;
};

export const observeFileViewerDomSearchController = <
  Target extends FileViewerDomSearchControllerStateTarget,
>(
  target: Target,
  controller: Pick<FileViewerDomSearchController, 'observe' | 'anchors' | 'state'>
) => {
  controller.observe();
  return syncFileViewerDomSearchControllerState(target, controller);
};

export const runFileViewerDomSearchControllerAction = async <
  Target extends FileViewerDomSearchControllerStateTarget,
  Result,
>(
  target: Target,
  controller: Pick<FileViewerDomSearchController, 'anchors' | 'state'>,
  action: () => Result | Promise<Result>
) => {
  await action();
  return syncFileViewerDomSearchControllerState(target, controller);
};

export const destroyFileViewerDomSearchController = <
  Target extends FileViewerDomSearchControllerStateTarget,
>(
  target: Target,
  controller: Pick<FileViewerDomSearchController, 'destroy' | 'anchors' | 'state'>
) => {
  controller.destroy();
  return syncFileViewerDomSearchControllerState(target, controller);
};

export const createFileViewerDomSearchControllerActionHandlers = <
  Target extends FileViewerDomSearchControllerStateTarget,
>(
  target: Target,
  controller: FileViewerDomSearchController
): FileViewerDomSearchControllerActionHandlers => {
  return {
    observe() {
      return observeFileViewerDomSearchController(target, controller);
    },
    async refreshAnchors() {
      await runFileViewerDomSearchControllerAction(target, controller, () => controller.refreshAnchors());
      return target.anchors.value;
    },
    async search(query: string) {
      return runFileViewerDomSearchControllerAction(target, controller, () => controller.search(query));
    },
    async next() {
      return runFileViewerDomSearchControllerAction(target, controller, () => controller.next());
    },
    async previous() {
      return runFileViewerDomSearchControllerAction(target, controller, () => controller.previous());
    },
    async clear() {
      return runFileViewerDomSearchControllerAction(target, controller, () => controller.clear());
    },
    destroy() {
      return destroyFileViewerDomSearchController(target, controller);
    },
  };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeQuery = (value: string) => value.replace(/\s+/g, ' ').trim();

const createSearchRegExp = (query: string, options: FileViewerSearchOptions) => {
  const source = options.wholeWord ? `\\b${escapeRegExp(query)}\\b` : escapeRegExp(query);
  return new RegExp(source, options.caseSensitive ? 'g' : 'gi');
};

const getSerializableMatches = (matches: FileViewerInternalSearchMatch[]): FileViewerSearchMatch[] => {
  return matches.map(({ element: _element, ...match }) => match);
};

const unwrapMark = (mark: HTMLElement) => {
  const parent = mark.parentNode;
  if (!parent) {
    return;
  }
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
  parent.normalize();
};

const isSkippableTextNode = (node: Text, root: HTMLElement) => {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP_SELECTOR)) {
    return true;
  }
  return !root.contains(parent) || !node.data.trim();
};

const getNodeFilterConstant = (root: HTMLElement, key: 'SHOW_TEXT' | 'FILTER_REJECT' | 'FILTER_ACCEPT') => {
  const view = root.ownerDocument.defaultView;
  const localNodeFilter = view?.NodeFilter || (typeof NodeFilter !== 'undefined' ? NodeFilter : undefined);
  if (localNodeFilter) {
    return localNodeFilter[key];
  }
  return key === 'SHOW_TEXT' ? 4 : key === 'FILTER_REJECT' ? 2 : 1;
};

const walkTextNodes = (root: HTMLElement) => {
  const nodes: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, getNodeFilterConstant(root, 'SHOW_TEXT'), {
    acceptNode(node) {
      return isSkippableTextNode(node as Text, root)
        ? getNodeFilterConstant(root, 'FILTER_REJECT')
        : getNodeFilterConstant(root, 'FILTER_ACCEPT');
    },
  });

  let current = walker.nextNode();
  while (current) {
    if (!isSkippableTextNode(current as Text, root)) {
      nodes.push(current as Text);
    }
    current = walker.nextNode();
  }
  return nodes;
};

const getMutationObserverConstructor = (root: HTMLElement | null | undefined) => {
  return root?.ownerDocument?.defaultView?.MutationObserver ||
    (typeof MutationObserver !== 'undefined' ? MutationObserver : undefined);
};

const getWindowLike = (root: HTMLElement | null | undefined) => {
  return root?.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : undefined);
};

const isScrollableElement = (element: HTMLElement) => {
  const range = Math.max(0, element.scrollHeight - element.clientHeight);
  if (range <= 2) {
    return false;
  }

  const view = element.ownerDocument.defaultView || (typeof window !== 'undefined' ? window : undefined);
  if (!view?.getComputedStyle) {
    return true;
  }
  const style = view.getComputedStyle(element);
  const overflowY = style.overflowY || style.overflow;
  return ['auto', 'scroll', 'overlay', 'visible'].includes(overflowY);
};

export const createFileViewerDomSearchController = ({
  root,
  options,
  waitForDomUpdate,
  preferredScrollContainer,
}: CreateFileViewerDomSearchControllerOptions): FileViewerDomSearchController => {
  let anchors: FileViewerDocumentAnchor[] = [];
  let internalMatches: FileViewerInternalSearchMatch[] = [];
  const marks = new Set<HTMLElement>();
  const state = createEmptyFileViewerSearchState();

  let observer: MutationObserver | null = null;
  let shouldObserve = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let applying = false;

  const getOptions = () => normalizeFileViewerSearchOptions(options?.());

  const syncState = () => {
    const serializable = getSerializableMatches(internalMatches);
    state.total = serializable.length;
    state.currentIndex = serializable.length ? Math.max(0, Math.min(state.currentIndex, serializable.length - 1)) : -1;
    state.current = state.currentIndex >= 0 ? serializable[state.currentIndex] : null;
    state.matches = serializable;
  };

  const applyExternalState = (nextState: FileViewerSearchState) => {
    return applyFileViewerSearchState(state, nextState);
  };

  const clearMarks = () => {
    Array.from(marks).forEach(unwrapMark);
    marks.clear();
    internalMatches = [];
    state.total = 0;
    state.currentIndex = -1;
    state.current = null;
    state.matches = [];
  };

  const runProviderAction = async (
    action: (provider: FileViewerSearchProvider) => FileViewerSearchState | Promise<FileViewerSearchState> | undefined,
    fallbackQuery = state.query
  ) => {
    const provider = findFileViewerSearchProvider(root());
    if (!provider) {
      return null;
    }
    clearMarks();
    const nextState = await action(provider);
    return applyExternalState(nextState || provider.getState?.() || createEmptyFileViewerSearchState(fallbackQuery));
  };

  const disconnectObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const getMatchScrollContainer = (element: HTMLElement) => {
    const currentRoot = root() || null;
    const preferred = preferredScrollContainer?.() || null;
    if (preferred && (preferred === element || preferred.contains(element))) {
      return preferred;
    }

    let current: HTMLElement | null = element.parentElement;
    while (current) {
      if (isScrollableElement(current)) {
        return current;
      }
      if (current === currentRoot) {
        break;
      }
      current = current.parentElement;
    }
    return currentRoot;
  };

  const scrollMatchIntoView = (element: HTMLElement) => {
    const container = getMatchScrollContainer(element);
    if (!container) {
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
      return;
    }

    const lockedLeft = container.scrollLeft;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop = elementRect.top - containerRect.top + container.scrollTop
      - (container.clientHeight / 2)
      + (elementRect.height / 2);
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextTop = Math.max(0, Math.min(targetTop, maxTop));

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        top: nextTop,
        left: lockedLeft,
        behavior: 'auto',
      });
    } else {
      container.scrollTop = nextTop;
      container.scrollLeft = lockedLeft;
    }
    container.scrollLeft = lockedLeft;
  };

  const setActiveMatch = (index: number, scroll = true) => {
    const normalizedOptions = getOptions();
    if (!internalMatches.length) {
      syncState();
      return state;
    }
    const normalized = ((index % internalMatches.length) + internalMatches.length) % internalMatches.length;
    internalMatches.forEach(match => {
      match.element.classList.remove(normalizedOptions.activeClassName || DEFAULT_FILE_VIEWER_SEARCH_ACTIVE_CLASS);
    });
    const active = internalMatches[normalized];
    active.element.classList.add(normalizedOptions.activeClassName || DEFAULT_FILE_VIEWER_SEARCH_ACTIVE_CLASS);
    state.currentIndex = normalized;
    syncState();
    if (scroll) {
      scrollMatchIntoView(active.element);
    }
    return state;
  };

  const highlightTextNode = (
    node: Text,
    expression: RegExp,
    maxMatches: number,
    nextMatches: FileViewerInternalSearchMatch[]
  ) => {
    const currentRoot = root();
    if (!currentRoot) {
      return;
    }

    const normalizedOptions = getOptions();
    const text = node.data;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const fragment = node.ownerDocument.createDocumentFragment();
    let matched = false;

    expression.lastIndex = 0;
    while ((match = expression.exec(text)) && nextMatches.length < maxMatches) {
      if (!match[0]) {
        expression.lastIndex += 1;
        continue;
      }
      if (match.index > lastIndex) {
        fragment.appendChild(node.ownerDocument.createTextNode(text.slice(lastIndex, match.index)));
      }

      const mark = node.ownerDocument.createElement('mark');
      mark.className = normalizedOptions.className || DEFAULT_FILE_VIEWER_SEARCH_MATCH_CLASS;
      mark.textContent = match[0];
      mark.dataset.searchMatchId = `viewer-search-match-${nextMatches.length + 1}`;
      marks.add(mark);
      fragment.appendChild(mark);
      matched = true;

      const anchor = findFileViewerAnchorForElement(node.parentElement, anchors, currentRoot);
      nextMatches.push({
        id: mark.dataset.searchMatchId,
        index: nextMatches.length,
        text: match[0],
        anchor,
        line: anchor?.line,
        page: anchor?.page,
        element: mark,
      });

      lastIndex = match.index + match[0].length;
    }

    if (!matched) {
      return;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(node.ownerDocument.createTextNode(text.slice(lastIndex)));
    }
    node.parentNode?.replaceChild(fragment, node);
  };

  const startObserver = () => {
    disconnectObserver();
    const currentRoot = root();
    const MutationObserverCtor = getMutationObserverConstructor(currentRoot);
    if (
      !shouldObserve ||
      !currentRoot ||
      !MutationObserverCtor ||
      findFileViewerSearchProvider(currentRoot)
    ) {
      return;
    }
    observer = new MutationObserverCtor(rerunAfterDomChange);
    observer.observe(currentRoot, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  const resumeObserver = () => {
    if (!shouldObserve) {
      return;
    }
    const view = getWindowLike(root());
    if (view?.setTimeout) {
      view.setTimeout(startObserver, 0);
      return;
    }
    setTimeout(startObserver, 0);
  };

  const runSearch = async (query: string, preferredIndex = 0) => {
    const normalizedQuery = normalizeQuery(query);
    const normalizedOptions = getOptions();
    state.query = normalizedQuery;
    disconnectObserver();
    applying = true;

    try {
      clearMarks();

      const currentRoot = root();
      if (!normalizedQuery || normalizedOptions.enabled === false || !currentRoot) {
        const providerState = await runProviderAction(provider => provider.clear?.(), normalizedQuery);
        if (providerState) {
          return providerState;
        }
        return state;
      }

      const providerState = await runProviderAction(
        provider => provider.search(normalizedQuery, normalizedOptions),
        normalizedQuery
      );
      if (providerState) {
        return providerState;
      }

      await waitForDomUpdate?.();
      const nextRoot = root();
      if (!nextRoot) {
        return state;
      }
      anchors = collectFileViewerDocumentAnchors(nextRoot);
      const expression = createSearchRegExp(normalizedQuery, normalizedOptions);
      const maxMatches = Math.max(1, normalizedOptions.maxMatches || DEFAULT_FILE_VIEWER_SEARCH_MAX_MATCHES);
      const nextMatches: FileViewerInternalSearchMatch[] = [];
      const textNodes = walkTextNodes(nextRoot);

      for (const node of textNodes) {
        if (nextMatches.length >= maxMatches) {
          break;
        }
        highlightTextNode(node, expression, maxMatches, nextMatches);
      }
      internalMatches = nextMatches;
      syncState();
      if (nextMatches.length) {
        setActiveMatch(preferredIndex, true);
      }
    } finally {
      applying = false;
      resumeObserver();
    }

    return state;
  };

  const rerunAfterDomChange = () => {
    const normalizedOptions = getOptions();
    if (!state.query || applying || normalizedOptions.enabled === false) {
      return;
    }
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void runSearch(state.query, Math.max(0, state.currentIndex));
    }, normalizedOptions.debounce ?? 180);
  };

  return {
    get anchors() {
      return anchors;
    },
    state,
    getInternalMatches: () => internalMatches,
    observe() {
      shouldObserve = true;
      startObserver();
    },
    async refreshAnchors() {
      await waitForDomUpdate?.();
      anchors = collectFileViewerDocumentAnchors(root() || null);
      return anchors;
    },
    search: (query: string) => runSearch(query, 0),
    next: async () => {
      const providerState = await runProviderAction(provider => provider.next?.() || provider.getState?.());
      return providerState || setActiveMatch(state.currentIndex + 1);
    },
    previous: async () => {
      const providerState = await runProviderAction(provider => provider.previous?.() || provider.getState?.());
      return providerState || setActiveMatch(state.currentIndex - 1);
    },
    clear: async () => {
      state.query = '';
      disconnectObserver();
      applying = true;
      try {
        clearMarks();
        const providerState = await runProviderAction(provider => provider.clear?.(), '');
        if (providerState) {
          return providerState;
        }
        return state;
      } finally {
        applying = false;
        resumeObserver();
      }
    },
    destroy() {
      shouldObserve = false;
      disconnectObserver();
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      clearMarks();
    },
  };
};
