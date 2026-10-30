import {
  findFileViewerViewStateProvider,
  findFileViewerZoomProvider,
} from './dom';
import type {
  FileViewerFitMode,
  FileViewerFitOptions,
  FileViewerFitRequest,
  FileViewerFitResize,
  FileViewerFitResult,
  FileViewerViewState,
  FileViewerViewStateChangeSource,
} from '../../contracts/types';

export const FILE_VIEWER_FIT_MODES = [
  'auto',
  'contain',
  'cover',
  'width',
  'height',
  'actual',
  'scale-down',
] as const satisfies readonly FileViewerFitMode[];

export const FILE_VIEWER_FIT_RESIZE_MODES = [
  'until-interaction',
  'always',
  'initial',
] as const satisfies readonly FileViewerFitResize[];

export interface NormalizedFileViewerFitOptions extends Required<Pick<
  FileViewerFitOptions,
  'mode' | 'resize' | 'padding'
>> {
  minScale?: number;
  maxScale?: number;
}

export interface ResolveFileViewerFitScaleInput {
  mode: FileViewerFitMode;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  currentScale?: number;
  minScale?: number;
  maxScale?: number;
}

export interface CreateFileViewerFitControllerOptions {
  root: () => HTMLElement | null | undefined;
  enabled?: () => boolean;
  getFit?: () => FileViewerFitMode | FileViewerFitOptions | null | undefined;
  onFit?: (result: FileViewerFitResult) => void;
}

export interface ApplyInitialFileViewerFitOptions {
  skip?: boolean;
}

export interface RunFileViewerFitOptions {
  source?: FileViewerViewStateChangeSource;
  reason?: FileViewerFitRequest['reason'];
}

export interface FileViewerFitController {
  normalize(fit?: FileViewerFitMode | FileViewerFitOptions | null): NormalizedFileViewerFitOptions | null;
  fit(
    fit?: FileViewerFitMode | FileViewerFitOptions | null,
    options?: RunFileViewerFitOptions
  ): Promise<FileViewerFitResult>;
  applyInitialFit(options?: ApplyInitialFileViewerFitOptions): Promise<FileViewerFitResult>;
  scheduleFit(reason?: FileViewerFitRequest['reason']): void;
  observe(): void;
  markUserInteraction(): void;
  resetAutoFit(): void;
  destroy(): void;
}

const DEFAULT_FILE_VIEWER_FIT_RESIZE: FileViewerFitResize = 'until-interaction';
const DEFAULT_FILE_VIEWER_FIT_PADDING = 0;
const MAX_FILE_VIEWER_FIT_RETRIES = 8;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const isFileViewerFitMode = (value: unknown): value is FileViewerFitMode => {
  return typeof value === 'string' && FILE_VIEWER_FIT_MODES.includes(value as FileViewerFitMode);
};

export const isFileViewerFitResize = (value: unknown): value is FileViewerFitResize => {
  return typeof value === 'string' &&
    FILE_VIEWER_FIT_RESIZE_MODES.includes(value as FileViewerFitResize);
};

const normalizePositiveNumber = (value: unknown) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : undefined;
};

const normalizePadding = (value: unknown) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : DEFAULT_FILE_VIEWER_FIT_PADDING;
};

export const normalizeFileViewerFitOptions = (
  fit?: FileViewerFitMode | FileViewerFitOptions | null
): NormalizedFileViewerFitOptions | null => {
  if (fit === undefined || fit === null || (fit as unknown) === false) {
    return null;
  }

  if (isFileViewerFitMode(fit)) {
    return {
      mode: fit,
      resize: DEFAULT_FILE_VIEWER_FIT_RESIZE,
      padding: DEFAULT_FILE_VIEWER_FIT_PADDING,
    };
  }

  if (!isRecord(fit)) {
    return null;
  }

  const minScale = normalizePositiveNumber(fit.minScale);
  const rawMaxScale = normalizePositiveNumber(fit.maxScale);
  const maxScale = minScale !== undefined && rawMaxScale !== undefined && rawMaxScale < minScale
    ? minScale
    : rawMaxScale;

  return {
    mode: isFileViewerFitMode(fit.mode) ? fit.mode : 'auto',
    resize: isFileViewerFitResize(fit.resize) ? fit.resize : DEFAULT_FILE_VIEWER_FIT_RESIZE,
    padding: normalizePadding(fit.padding),
    minScale,
    maxScale,
  };
};

const clampScale = (
  scale: number,
  minScale?: number,
  maxScale?: number
) => {
  let nextScale = scale;
  if (Number.isFinite(minScale)) {
    nextScale = Math.max(Number(minScale), nextScale);
  }
  if (Number.isFinite(maxScale)) {
    nextScale = Math.min(Number(maxScale), nextScale);
  }
  return nextScale;
};

export const resolveFileViewerFitScale = ({
  mode,
  viewportWidth,
  viewportHeight,
  contentWidth,
  contentHeight,
  minScale,
  maxScale,
}: ResolveFileViewerFitScaleInput) => {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return undefined;
  }

  const widthScale = viewportWidth / contentWidth;
  const heightScale = viewportHeight / contentHeight;
  const containScale = Math.min(widthScale, heightScale);
  const coverScale = Math.max(widthScale, heightScale);
  const nextScale = (() => {
    switch (mode) {
      case 'cover':
        return coverScale;
      case 'width':
        return widthScale;
      case 'height':
        return heightScale;
      case 'actual':
        return 1;
      case 'scale-down':
        return Math.min(1, containScale);
      case 'auto':
      case 'contain':
      default:
        return containScale;
    }
  })();

  if (!Number.isFinite(nextScale) || nextScale <= 0) {
    return undefined;
  }
  return clampScale(nextScale, minScale, maxScale);
};

export const hasFileViewerExplicitInitialViewState = (
  state?: FileViewerViewState | null
) => {
  if (!state) {
    return false;
  }

  const scale = Number(state.scale ?? state.zoom?.scale);
  if (Number.isFinite(scale) && scale > 0) {
    return true;
  }
  if (Number.isFinite(state.page) || Number.isFinite(state.rotation)) {
    return true;
  }
  if (state.navigation && Object.keys(state.navigation).length > 0) {
    return true;
  }
  if (state.extra && Object.keys(state.extra).length > 0) {
    return true;
  }

  const scroll = state.scroll || {};
  return ['top', 'left', 'topRatio', 'leftRatio'].some(key => {
    const value = scroll[key as keyof typeof scroll];
    return Number.isFinite(value);
  });
};

const createNoopFitResult = (
  fit: NormalizedFileViewerFitOptions,
  reason: string,
  source: FileViewerViewStateChangeSource = 'viewer',
  provider: FileViewerFitResult['provider'] = 'none'
): FileViewerFitResult => ({
  applied: false,
  mode: fit.mode,
  resize: fit.resize,
  source,
  reason,
  provider,
});

const withProviderResult = (
  result: FileViewerFitResult | undefined | null,
  request: FileViewerFitRequest,
  provider: FileViewerFitResult['provider']
): FileViewerFitResult => ({
  applied: !!result?.applied,
  mode: result?.mode || request.mode,
  resize: result?.resize || request.resize,
  scale: result?.scale,
  source: result?.source || request.source,
  reason: result?.reason,
  provider: result?.provider || provider,
  state: result?.state,
});

const isRetriableFitReason = (reason: string | undefined) => {
  return reason === 'pending' ||
    reason === 'retry' ||
    reason === 'image-not-ready' ||
    reason === 'unmeasurable';
};

const readViewportSize = (root: HTMLElement) => {
  const rect = root.getBoundingClientRect?.();
  return {
    width: Math.max(0, rect?.width || root.clientWidth || 0),
    height: Math.max(0, rect?.height || root.clientHeight || 0),
  };
};

export const createFileViewerFitController = ({
  root,
  enabled,
  getFit = () => undefined,
  onFit,
}: CreateFileViewerFitControllerOptions): FileViewerFitController => {
  let resizeObserver: ResizeObserver | null = null;
  let resizeFrame: number | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let userInteracted = false;
  let retryCount = 0;

  const getWindow = () => {
    const currentRoot = root();
    return currentRoot?.ownerDocument?.defaultView ||
      (typeof window !== 'undefined' ? window : undefined);
  };

  const cancelFrame = () => {
    if (resizeFrame === null) {
      return;
    }
    const view = getWindow();
    if (view?.cancelAnimationFrame) {
      view.cancelAnimationFrame(resizeFrame);
    }
    resizeFrame = null;
  };

  const cancelRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    retryTimer = null;
  };

  const resolveFit = (
    fit: FileViewerFitMode | FileViewerFitOptions | null | undefined,
    reason: FileViewerFitRequest['reason']
  ) => {
    const configured = fit === undefined ? getFit() : fit;
    if (configured !== undefined && configured !== null) {
      return normalizeFileViewerFitOptions(configured);
    }
    return reason === 'api' ? normalizeFileViewerFitOptions('auto') : null;
  };

  const scheduleRetry = (
    fit: FileViewerFitMode | FileViewerFitOptions | null | undefined,
    source: FileViewerViewStateChangeSource,
    reason: FileViewerFitRequest['reason']
  ) => {
    if (retryCount >= MAX_FILE_VIEWER_FIT_RETRIES) {
      return;
    }
    cancelRetry();
    retryCount += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void runFit(fit, { source, reason: reason === 'api' ? 'api' : 'retry' });
    }, 32 * retryCount);
  };

  const runFit = async (
    fit?: FileViewerFitMode | FileViewerFitOptions | null,
    runOptions: RunFileViewerFitOptions = {}
  ): Promise<FileViewerFitResult> => {
    const source = runOptions.source || 'api';
    const reason = runOptions.reason || 'api';
    const normalized = resolveFit(fit, reason);
    if (!normalized) {
      return {
        applied: false,
        mode: 'auto',
        resize: DEFAULT_FILE_VIEWER_FIT_RESIZE,
        source,
        reason: 'not-configured',
        provider: 'none',
      };
    }

    if (enabled?.() === false) {
      return createNoopFitResult(normalized, 'disabled', source);
    }

    const currentRoot = root();
    if (!currentRoot) {
      scheduleRetry(fit, source, reason);
      return createNoopFitResult(normalized, 'no-root', source);
    }

    const viewport = readViewportSize(currentRoot);
    if (viewport.width <= 0 || viewport.height <= 0) {
      scheduleRetry(fit, source, reason);
      return createNoopFitResult(normalized, 'zero-size', source);
    }

    const request: FileViewerFitRequest = {
      ...normalized,
      source,
      reason,
      viewportWidth: Math.max(0, viewport.width - normalized.padding * 2),
      viewportHeight: Math.max(0, viewport.height - normalized.padding * 2),
      container: currentRoot,
    };

    const viewStateProvider = findFileViewerViewStateProvider(currentRoot);
    let lastProviderResult: FileViewerFitResult | null = null;
    if (viewStateProvider?.fit) {
      const result = withProviderResult(
        await viewStateProvider.fit(request),
        request,
        'view-state'
      );
      if (result.applied) {
        retryCount = 0;
        onFit?.(result);
        return result;
      }
      lastProviderResult = result;
    }

    const zoomProvider = findFileViewerZoomProvider(currentRoot);
    if (zoomProvider?.fit) {
      const result = withProviderResult(
        await zoomProvider.fit(request),
        request,
        'zoom'
      );
      if (result.applied) {
        retryCount = 0;
        onFit?.(result);
        return result;
      }
      lastProviderResult = result;
    }

    const noop = createNoopFitResult(normalized, viewStateProvider || zoomProvider
      ? 'unsupported'
      : 'no-provider', source);
    if (noop.reason === 'no-provider' || isRetriableFitReason(lastProviderResult?.reason)) {
      scheduleRetry(fit, source, reason);
    }
    return noop;
  };

  const scheduleFit = (reason: FileViewerFitRequest['reason'] = 'resize') => {
    const normalized = normalizeFileViewerFitOptions(getFit());
    if (!normalized || normalized.resize === 'initial') {
      return;
    }
    if (normalized.resize === 'until-interaction' && userInteracted) {
      return;
    }

    cancelFrame();
    const view = getWindow();
    const run = () => {
      resizeFrame = null;
      void runFit(undefined, { source: 'viewer', reason });
    };
    if (view?.requestAnimationFrame) {
      resizeFrame = view.requestAnimationFrame(run);
      return;
    }
    resizeFrame = setTimeout(run, 16) as unknown as number;
  };

  const disconnectObserver = () => {
    cancelFrame();
    resizeObserver?.disconnect();
    resizeObserver = null;
  };

  const controller: FileViewerFitController = {
    normalize: normalizeFileViewerFitOptions,
    fit: async (fit, options) => {
      cancelRetry();
      userInteracted = false;
      return runFit(fit, {
        source: options?.source || 'api',
        reason: options?.reason || 'api',
      });
    },
    applyInitialFit: async (initialOptions = {}) => {
      cancelRetry();
      retryCount = 0;
      userInteracted = false;
      if (initialOptions.skip) {
        const normalized = normalizeFileViewerFitOptions(getFit()) ||
          normalizeFileViewerFitOptions('auto')!;
        return createNoopFitResult(normalized, 'initial-view-state', 'initial');
      }
      return runFit(undefined, { source: 'initial', reason: 'initial' });
    },
    scheduleFit,
    observe() {
      disconnectObserver();
      const currentRoot = root();
      const ResizeObserverCtor = currentRoot?.ownerDocument?.defaultView?.ResizeObserver ||
        (typeof ResizeObserver !== 'undefined' ? ResizeObserver : undefined);
      if (!currentRoot || !ResizeObserverCtor) {
        return;
      }
      resizeObserver = new ResizeObserverCtor(() => scheduleFit('resize'));
      resizeObserver.observe(currentRoot);
    },
    markUserInteraction() {
      userInteracted = true;
      cancelRetry();
    },
    resetAutoFit() {
      userInteracted = false;
      retryCount = 0;
    },
    destroy() {
      disconnectObserver();
      cancelRetry();
      retryCount = 0;
    },
  };

  return controller;
};
