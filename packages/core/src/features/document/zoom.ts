import { createFileViewerZoomState } from './model';
import { findFileViewerZoomProvider } from './dom';
import type {
  FileViewerOperationType,
  FileViewerZoomProvider,
  FileViewerZoomState,
} from '../../contracts/types';

export type FileViewerZoomOperation = Extract<
  FileViewerOperationType,
  'zoom-in' | 'zoom-out' | 'zoom-reset'
>;

export interface CreateFileViewerZoomControllerOptions {
  root: () => HTMLElement | null | undefined;
  enabled?: () => boolean;
  beforeZoom?: (operation: FileViewerZoomOperation) => Promise<boolean> | boolean;
  onChange?: (state: FileViewerZoomState) => void;
}

export type MutableFileViewerZoomState = FileViewerZoomState;

export interface FileViewerZoomController {
  readonly provider: FileViewerZoomProvider | null;
  readonly state: FileViewerZoomState;
  hasProvider(): boolean;
  refreshProvider(): FileViewerZoomProvider | null;
  observe(): void;
  clearProvider(): void;
  getState(): FileViewerZoomState;
  zoomIn(): Promise<FileViewerZoomState>;
  zoomOut(): Promise<FileViewerZoomState>;
  resetZoom(): Promise<FileViewerZoomState>;
  destroy(): void;
}

export interface FileViewerZoomControllerActionHandlers {
  hasZoomProvider(): boolean;
  refreshZoomProvider(): FileViewerZoomProvider | null;
  startZoomObserver(): FileViewerZoomState;
  stopZoomObserver(): FileViewerZoomState;
  clearZoomProvider(): FileViewerZoomState;
  getZoomState(): FileViewerZoomState;
  zoomIn(): Promise<FileViewerZoomState>;
  zoomOut(): Promise<FileViewerZoomState>;
  resetZoom(): Promise<FileViewerZoomState>;
}

export const cloneFileViewerZoomState = (state: FileViewerZoomState): FileViewerZoomState => ({
  scale: state.scale,
  label: state.label,
  canZoomIn: state.canZoomIn,
  canZoomOut: state.canZoomOut,
  canReset: state.canReset,
  minScale: state.minScale,
  maxScale: state.maxScale,
});

export const applyFileViewerZoomState = <Target extends MutableFileViewerZoomState>(
  target: Target,
  source?: Partial<FileViewerZoomState> | null
) => {
  const normalized = createFileViewerZoomState(source || {});
  target.scale = normalized.scale;
  target.label = normalized.label;
  target.canZoomIn = normalized.canZoomIn;
  target.canZoomOut = normalized.canZoomOut;
  target.canReset = normalized.canReset;
  target.minScale = normalized.minScale;
  target.maxScale = normalized.maxScale;

  return target;
};

export const createFileViewerZoomChangeState = (
  state: FileViewerZoomState
): FileViewerZoomState => {
  return cloneFileViewerZoomState(state);
};

export const syncFileViewerZoomControllerState = <Target extends MutableFileViewerZoomState>(
  target: Target,
  controller: Pick<FileViewerZoomController, 'state'>
) => {
  return applyFileViewerZoomState(target, controller.state);
};

export const refreshFileViewerZoomControllerProvider = <Target extends MutableFileViewerZoomState>(
  target: Target,
  controller: Pick<FileViewerZoomController, 'refreshProvider' | 'state'>
) => {
  const provider = controller.refreshProvider();
  syncFileViewerZoomControllerState(target, controller);
  return provider;
};

export const observeFileViewerZoomController = <Target extends MutableFileViewerZoomState>(
  target: Target,
  controller: Pick<FileViewerZoomController, 'observe' | 'state'>
) => {
  controller.observe();
  return syncFileViewerZoomControllerState(target, controller);
};

export const clearFileViewerZoomControllerProvider = <Target extends MutableFileViewerZoomState>(
  target: Target,
  controller: Pick<FileViewerZoomController, 'clearProvider' | 'state'>
) => {
  controller.clearProvider();
  return syncFileViewerZoomControllerState(target, controller);
};

export const destroyFileViewerZoomController = <Target extends MutableFileViewerZoomState>(
  target: Target,
  controller: Pick<FileViewerZoomController, 'destroy' | 'state'>
) => {
  controller.destroy();
  return syncFileViewerZoomControllerState(target, controller);
};

export const runFileViewerZoomControllerAction = async <Target extends MutableFileViewerZoomState>(
  target: Target,
  action: () => Promise<FileViewerZoomState>
) => {
  const nextState = await action();
  applyFileViewerZoomState(target, nextState);
  return createFileViewerZoomChangeState(target);
};

export const createFileViewerZoomControllerActionHandlers = <Target extends MutableFileViewerZoomState>(
  target: Target,
  controller: FileViewerZoomController
): FileViewerZoomControllerActionHandlers => {
  return {
    hasZoomProvider() {
      const nextProvider = refreshFileViewerZoomControllerProvider(target, controller);
      return !!nextProvider;
    },
    refreshZoomProvider() {
      return refreshFileViewerZoomControllerProvider(target, controller);
    },
    startZoomObserver() {
      return observeFileViewerZoomController(target, controller);
    },
    stopZoomObserver() {
      return destroyFileViewerZoomController(target, controller);
    },
    clearZoomProvider() {
      return clearFileViewerZoomControllerProvider(target, controller);
    },
    getZoomState() {
      return createFileViewerZoomChangeState(target);
    },
    zoomIn() {
      return runFileViewerZoomControllerAction(target, () => controller.zoomIn());
    },
    zoomOut() {
      return runFileViewerZoomControllerAction(target, () => controller.zoomOut());
    },
    resetZoom() {
      return runFileViewerZoomControllerAction(target, () => controller.resetZoom());
    },
  };
};

export const createFileViewerZoomChangeEmitter = () => {
  const listeners = new Set<() => void>();
  return {
    emit() {
      listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      listeners.clear();
    },
  };
};

const getMutationObserverConstructor = (root: HTMLElement | null | undefined) => {
  return root?.ownerDocument?.defaultView?.MutationObserver ||
    (typeof MutationObserver !== 'undefined' ? MutationObserver : undefined);
};

export const createFileViewerZoomController = ({
  root,
  enabled,
  beforeZoom,
  onChange,
}: CreateFileViewerZoomControllerOptions): FileViewerZoomController => {
  let provider: FileViewerZoomProvider | null = null;
  let unsubscribe: (() => void) | null = null;
  let observer: MutationObserver | null = null;
  let runningAction = false;
  const state = createFileViewerZoomState();

  const notifyChange = () => {
    onChange?.(cloneFileViewerZoomState(state));
  };

  const clearProvider = () => {
    unsubscribe?.();
    unsubscribe = null;
    provider = null;
    applyFileViewerZoomState(state, null);
  };

  const syncProvider = () => {
    if (enabled?.() === false) {
      clearProvider();
      return null;
    }

    const nextProvider = findFileViewerZoomProvider(root());
    if (nextProvider !== provider) {
      unsubscribe?.();
      provider = nextProvider;
      unsubscribe = nextProvider?.subscribe?.(() => {
        applyFileViewerZoomState(state, nextProvider.getState());
        if (!runningAction) {
          notifyChange();
        }
      }) || null;
    }
    applyFileViewerZoomState(state, nextProvider?.getState?.() || null);
    return nextProvider;
  };

  const disconnectObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const runZoomAction = async (
    operation: FileViewerZoomOperation,
    action: (nextProvider: FileViewerZoomProvider) => FileViewerZoomState | Promise<FileViewerZoomState>
  ) => {
    const nextProvider = syncProvider();
    if (!nextProvider) {
      return cloneFileViewerZoomState(state);
    }

    if (beforeZoom && await beforeZoom(operation) === false) {
      return cloneFileViewerZoomState(state);
    }

    runningAction = true;
    try {
      const nextState = await action(nextProvider);
      applyFileViewerZoomState(state, nextState || nextProvider.getState());
      return cloneFileViewerZoomState(state);
    } finally {
      runningAction = false;
    }
  };

  return {
    get provider() {
      return provider;
    },
    state,
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
      return cloneFileViewerZoomState(state);
    },
    zoomIn: () => runZoomAction('zoom-in', nextProvider => nextProvider.zoomIn()),
    zoomOut: () => runZoomAction('zoom-out', nextProvider => nextProvider.zoomOut()),
    resetZoom: () => runZoomAction('zoom-reset', nextProvider => nextProvider.resetZoom()),
    destroy() {
      disconnectObserver();
      clearProvider();
    },
  };
};
