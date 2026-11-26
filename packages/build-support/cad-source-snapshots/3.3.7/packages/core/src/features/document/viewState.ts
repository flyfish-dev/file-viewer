import {
  findFileViewerViewStateProvider,
  findFileViewerZoomProvider,
  registerFileViewerViewStateProvider,
  resolveFileViewerScrollContainer,
  unregisterFileViewerViewStateProvider,
} from './dom';
import { resolveFileViewerFitScale } from './fit';
import type {
  FileViewerApplyViewStateOptions,
  FileViewerFitRequest,
  FileViewerFitResult,
  FileViewerViewScrollState,
  FileViewerViewState,
  FileViewerViewStateChange,
  FileViewerViewStateProvider,
} from '../../contracts/types';

export interface RegisterFileViewerGenericViewStateProviderOptions {
  host: HTMLElement;
  renderer?: string;
  scrollTarget?: HTMLElement | (() => HTMLElement | null | undefined) | null;
}

export interface FileViewerGenericViewStateProviderRegistration {
  provider: FileViewerViewStateProvider;
  destroy: () => void;
}

export interface CreateFileViewerViewStateControllerOptions {
  root: () => HTMLElement | null | undefined;
  enabled?: () => boolean;
  onChange?: (change: FileViewerViewStateChange) => void;
}

export interface FileViewerViewStateController {
  readonly provider: FileViewerViewStateProvider | null;
  readonly state: FileViewerViewState | null;
  hasProvider(): boolean;
  refreshProvider(): FileViewerViewStateProvider | null;
  observe(): void;
  clearProvider(): FileViewerViewState | null;
  getState(): FileViewerViewState | null;
  applyState(
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ): Promise<FileViewerViewState | null>;
  destroy(): void;
}

export interface FileViewerViewStateControllerActionHandlers {
  hasViewStateProvider(): boolean;
  refreshViewStateProvider(): FileViewerViewStateProvider | null;
  startViewStateObserver(): FileViewerViewState | null;
  stopViewStateObserver(): FileViewerViewState | null;
  clearViewStateProvider(): FileViewerViewState | null;
  getViewState(): FileViewerViewState | null;
  applyViewState(
    state: FileViewerViewState,
    options?: FileViewerApplyViewStateOptions
  ): Promise<FileViewerViewState | null>;
}

export const cloneFileViewerViewState = (
  state?: FileViewerViewState | null
): FileViewerViewState | null => {
  if (!state) {
    return null;
  }

  return {
    ...state,
    spreadsheet: state.spreadsheet ? {
      ...state.spreadsheet,
      range: state.spreadsheet.range ? { ...state.spreadsheet.range } : undefined,
    } : undefined,
    zoom: state.zoom ? { ...state.zoom } : undefined,
    scroll: state.scroll ? { ...state.scroll } : undefined,
    navigation: state.navigation ? { ...state.navigation } : undefined,
    extra: state.extra ? { ...state.extra } : undefined,
  };
};

export const createFileViewerViewStateChange = (
  state: FileViewerViewState,
  patch: Partial<Omit<FileViewerViewStateChange, 'state'>> = {}
): FileViewerViewStateChange => ({
  state: cloneFileViewerViewState(state) || {},
  action: patch.action || 'init',
  source: patch.source || 'viewer',
  timestamp: patch.timestamp || Date.now(),
});

export const createFileViewerViewStateChangeEmitter = () => {
  const listeners = new Set<(change: FileViewerViewStateChange) => void>();
  return {
    emit(change: FileViewerViewStateChange) {
      listeners.forEach(listener => listener(change));
    },
    subscribe(listener: (change: FileViewerViewStateChange) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const getViewStateWindow = (host: HTMLElement) => {
  return host.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : undefined);
};

const waitForViewStateFrame = (host: HTMLElement) => {
  const ownerWindow = getViewStateWindow(host);
  return new Promise<void>(resolve => {
    if (ownerWindow?.requestAnimationFrame) {
      ownerWindow.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 16);
  });
};

const readFileViewerScrollState = (element: HTMLElement): FileViewerViewScrollState => {
  const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
  const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
  return {
    top: element.scrollTop || 0,
    left: element.scrollLeft || 0,
    width: element.scrollWidth || 0,
    height: element.scrollHeight || 0,
    clientWidth: element.clientWidth || 0,
    clientHeight: element.clientHeight || 0,
    topRatio: maxTop > 0 ? (element.scrollTop || 0) / maxTop : 0,
    leftRatio: maxLeft > 0 ? (element.scrollLeft || 0) / maxLeft : 0,
  };
};

const resolveScrollValue = (
  value: unknown,
  ratio: unknown,
  maxValue: number
) => {
  if (Number.isFinite(value)) {
    return Number(value);
  }
  if (Number.isFinite(ratio)) {
    return Number(ratio) * maxValue;
  }
  return undefined;
};

export const registerFileViewerGenericViewStateProvider = ({
  host,
  renderer,
  scrollTarget,
}: RegisterFileViewerGenericViewStateProviderOptions): FileViewerGenericViewStateProviderRegistration => {
  const emitter = createFileViewerViewStateChangeEmitter();
  const ownerWindow = getViewStateWindow(host);
  let destroyed = false;
  let scrollFrame = 0;
  let suppressScrollEventUntil = 0;
  let unsubscribeZoom: (() => void) | null = null;

  const resolveScrollTarget = () => {
    if (typeof scrollTarget === 'function') {
      return scrollTarget() || host;
    }
    return scrollTarget || resolveFileViewerScrollContainer(host) || host;
  };

  const getZoomProvider = () => findFileViewerZoomProvider(host);

  const getState = (): FileViewerViewState => {
    const zoom = getZoomProvider()?.getState?.();
    const scrollElement = resolveScrollTarget();
    return {
      renderer,
      scale: zoom?.scale,
      zoom,
      scroll: scrollElement ? readFileViewerScrollState(scrollElement) : undefined,
    };
  };

  const emit = (
    action: FileViewerViewStateChange['action'],
    source: FileViewerViewStateChange['source'] = 'viewer'
  ) => {
    if (destroyed) {
      return getState();
    }
    const state = getState();
    emitter.emit(createFileViewerViewStateChange(state, { action, source }));
    return state;
  };

  const suppressProgrammaticScrollEvents = () => {
    suppressScrollEventUntil = Math.max(suppressScrollEventUntil, Date.now() + 180);
  };

  const applyScrollState = (scroll: FileViewerViewState['scroll'] | undefined) => {
    if (!scroll) {
      return;
    }
    const scrollElement = resolveScrollTarget();
    const maxTop = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
    const maxLeft = Math.max(0, scrollElement.scrollWidth - scrollElement.clientWidth);
    const top = resolveScrollValue(scroll.top, scroll.topRatio, maxTop);
    const left = resolveScrollValue(scroll.left, scroll.leftRatio, maxLeft);

    suppressProgrammaticScrollEvents();
    if (top !== undefined) {
      scrollElement.scrollTop = Math.min(Math.max(0, top), maxTop);
    }
    if (left !== undefined) {
      scrollElement.scrollLeft = Math.min(Math.max(0, left), maxLeft);
    }
  };

  const fit = async (request: FileViewerFitRequest): Promise<FileViewerFitResult> => {
    const zoomProvider = getZoomProvider();
    if (zoomProvider?.fit) {
      return zoomProvider.fit(request);
    }
    if (!zoomProvider?.setZoom) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'zoom-provider-unavailable',
        provider: 'view-state',
      };
    }

    const zoomState = zoomProvider.getState();
    const currentScale = Number(zoomState.scale) > 0 ? Number(zoomState.scale) : 1;
    const scrollElement = resolveScrollTarget();
    const viewportWidth = request.viewportWidth || scrollElement.clientWidth || host.clientWidth;
    const viewportHeight = request.viewportHeight || scrollElement.clientHeight || host.clientHeight;
    const contentWidth = Math.max(
      scrollElement.scrollWidth || 0,
      host.scrollWidth || 0,
      scrollElement.getBoundingClientRect?.().width || 0
    );
    const contentHeight = Math.max(
      scrollElement.scrollHeight || 0,
      host.scrollHeight || 0,
      scrollElement.getBoundingClientRect?.().height || 0
    );
    const scale = resolveFileViewerFitScale({
      mode: request.mode,
      viewportWidth,
      viewportHeight,
      contentWidth: contentWidth / currentScale,
      contentHeight: contentHeight / currentScale,
      currentScale,
      minScale: request.minScale ?? zoomState.minScale,
      maxScale: request.maxScale ?? zoomState.maxScale,
    });

    if (!scale) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'unmeasurable',
        provider: 'view-state',
      };
    }

    suppressProgrammaticScrollEvents();
    await zoomProvider.setZoom(scale);
    await waitForViewStateFrame(host);
    const state = emit('fit', request.source);
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale,
      source: request.source,
      provider: 'view-state',
      state,
    };
  };

  const scheduleScrollChange = () => {
    if (destroyed || Date.now() < suppressScrollEventUntil || scrollFrame) {
      return;
    }
    const requestFrame = ownerWindow?.requestAnimationFrame || ((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(Date.now()), 16) as unknown as number;
    });
    scrollFrame = requestFrame(() => {
      scrollFrame = 0;
      emit('scroll', 'user');
    });
  };

  const provider: FileViewerViewStateProvider = {
    getState,
    async applyState(state, options = {}) {
      const source = options.source || 'api';
      const action = options.action || 'restore';
      const notify = options.notify !== false;
      const zoomProvider = getZoomProvider();
      const nextScale = Number(state.scale ?? state.zoom?.scale);

      suppressProgrammaticScrollEvents();
      if (Number.isFinite(nextScale) && zoomProvider?.setZoom) {
        await zoomProvider.setZoom(nextScale);
      }
      await waitForViewStateFrame(host);
      applyScrollState(state.scroll);
      await waitForViewStateFrame(host);
      applyScrollState(state.scroll);

      if (notify) {
        return emit(action, source);
      }
      return getState();
    },
    fit,
    subscribe: emitter.subscribe,
  };

  host.dataset.viewerViewStateProvider = 'generic';
  registerFileViewerViewStateProvider(host, provider);
  host.addEventListener?.('scroll', scheduleScrollChange, {
    capture: true,
    passive: true,
  });

  const zoomProvider = getZoomProvider();
  unsubscribeZoom = zoomProvider?.subscribe?.(() => {
    emit('zoom-change', 'viewer');
  }) || null;

  return {
    provider,
    destroy() {
      destroyed = true;
      unsubscribeZoom?.();
      unsubscribeZoom = null;
      if (scrollFrame && ownerWindow?.cancelAnimationFrame) {
        ownerWindow.cancelAnimationFrame(scrollFrame);
      }
      scrollFrame = 0;
      host.removeEventListener?.('scroll', scheduleScrollChange, true);
      unregisterFileViewerViewStateProvider(host);
    },
  };
};

const getMutationObserverConstructor = (root: HTMLElement | null | undefined) => {
  return root?.ownerDocument?.defaultView?.MutationObserver ||
    (typeof MutationObserver !== 'undefined' ? MutationObserver : undefined);
};

export const createFileViewerViewStateController = ({
  root,
  enabled,
  onChange,
}: CreateFileViewerViewStateControllerOptions): FileViewerViewStateController => {
  let provider: FileViewerViewStateProvider | null = null;
  let unsubscribe: (() => void) | null = null;
  let observer: MutationObserver | null = null;
  let state: FileViewerViewState | null = null;
  let applySequence = 0;
  let destroyed = false;

  const readProviderState = () => cloneFileViewerViewState(provider?.getState?.() || null);

  const commitState = (
    nextState: FileViewerViewState | null,
    change?: FileViewerViewStateChange
  ) => {
    state = cloneFileViewerViewState(nextState);
    if (change && state) {
      onChange?.({
        ...change,
        state: cloneFileViewerViewState(change.state) || state,
      });
    }
    return cloneFileViewerViewState(state);
  };

  const clearProvider = () => {
    applySequence += 1;
    unsubscribe?.();
    unsubscribe = null;
    provider = null;
    return commitState(null);
  };

  const syncProvider = () => {
    if (destroyed || enabled?.() === false) {
      clearProvider();
      return null;
    }

    const nextProvider = findFileViewerViewStateProvider(root());
    if (nextProvider !== provider) {
      applySequence += 1;
      unsubscribe?.();
      provider = nextProvider;
      unsubscribe = nextProvider?.subscribe?.(change => {
        if (destroyed || provider !== nextProvider) return;
        commitState(change.state, change);
      }) || null;
    }
    commitState(readProviderState());
    return nextProvider;
  };

  const disconnectObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  return {
    get provider() {
      return provider;
    },
    get state() {
      return cloneFileViewerViewState(state);
    },
    hasProvider() {
      return !!syncProvider();
    },
    refreshProvider: syncProvider,
    observe() {
      disconnectObserver();
      const currentRoot = root();
      const MutationObserverCtor = getMutationObserverConstructor(currentRoot);
      if (!currentRoot || !MutationObserverCtor) {
        syncProvider();
        return;
      }
      observer = new MutationObserverCtor(() => {
        syncProvider();
      });
      observer.observe(currentRoot, {
        childList: true,
        subtree: true,
      });
      syncProvider();
    },
    clearProvider,
    getState() {
      syncProvider();
      return cloneFileViewerViewState(state);
    },
    async applyState(nextState, options) {
      const nextProvider = syncProvider();
      if (!nextProvider?.applyState) {
        return cloneFileViewerViewState(state);
      }
      const sequence = ++applySequence;
      const appliedState = await nextProvider.applyState(cloneFileViewerViewState(nextState) || {}, options);
      if (destroyed || nextProvider !== syncProvider()) {
        return cloneFileViewerViewState(state);
      }
      if (sequence !== applySequence) {
        return cloneFileViewerViewState(appliedState || nextProvider.getState());
      }
      commitState(appliedState || nextProvider.getState());
      return cloneFileViewerViewState(state);
    },
    destroy() {
      destroyed = true;
      disconnectObserver();
      clearProvider();
    },
  };
};

export const createFileViewerViewStateControllerActionHandlers = (
  controller: FileViewerViewStateController
): FileViewerViewStateControllerActionHandlers => {
  return {
    hasViewStateProvider() {
      return controller.hasProvider();
    },
    refreshViewStateProvider() {
      return controller.refreshProvider();
    },
    startViewStateObserver() {
      controller.observe();
      return controller.getState();
    },
    stopViewStateObserver() {
      controller.destroy();
      return null;
    },
    clearViewStateProvider() {
      return controller.clearProvider();
    },
    getViewState() {
      return controller.getState();
    },
    applyViewState(state, options) {
      return controller.applyState(state, options);
    },
  };
};
