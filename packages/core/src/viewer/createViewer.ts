// Imperative viewer composition root.
//
// `createViewer` wires source normalization, lifecycle hooks, renderer
// sessions, document features, watermarking, and public operations into a
// framework-neutral controller. Framework packages should wrap this API instead
// of reimplementing the orchestration.
import {
  createEmptyFileViewerSearchState,
} from '../features/document/model';
import {
  createFileViewerDocumentFeatureControllerActionHandlers,
} from '../features/document/events';
import { createFileViewerZoomController } from '../features/document/zoom';
import { createFileViewerViewStateController } from '../features/document/viewState';
import {
  createFileViewerFitController,
  hasFileViewerExplicitInitialViewState,
} from '../features/document/fit';
import {
  DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
  DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
  DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
  createFileViewerOriginalSourceStateFromNormalizedSource,
  executeFileViewerDownloadOperation,
  executeFileViewerExportHtmlOperation,
  executeFileViewerPrintOperation,
  resolveFileViewerDisplayFilename,
  resolveFileViewerOperationFilename,
} from './operations';
import { openFileViewerPrintMaskDesignerAsync } from '../features/printMaskLoader';
import {
  applyFileViewerZoomAvailability,
  createUnsupportedAvailability,
  getRendererAvailability,
} from '../registry/capabilities';
import {
  buildFileViewerLifecycleContextFromNormalizedSource,
  buildFileViewerOperationContext,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook,
} from '../lifecycle/operations';
import {
  collectFileViewerRendererPlugins,
  createRendererRegistry,
  getFileViewerAutoRendererPresetVersion,
  hasFileViewerRendererPresetName,
  installFileViewerRendererPlugins,
  listFileViewerAutoRendererPresets,
  resolveFileViewerRendererPresetInputs,
  resolveFileViewerRendererDefinition,
} from '../registry/registry';
import {
  createFileRenderHandlerLoader,
  applyFileViewerRenderSurfaceState,
  createFileViewerRenderSurfaceState,
  createFileViewerRenderSurface,
  removeFileViewerRenderTarget,
  syncFileViewerRenderSurfaceBackground,
} from '../rendering/handler';
import { createFileViewerCoreRendererRegistry } from '../renderers/index';
import { createFileViewerRequestScope } from '../source/loading';
import { normalizeSource } from '../source';
import { buildFileViewerWatermarkInlineStyle } from '../features/watermark';
import { createFileViewerSnapshotDownload } from '../output/snapshotDownload';
import { createFileViewerErrorState, createFileViewerUnsupportedState } from './state';
import { createFileViewerI18nBindings } from '../i18n/bindings';
import { createFileViewerTranslator } from '../i18n/messages';
import { createFileViewerI18n, createFileViewerNestedI18n, type FileViewerI18nController } from '../i18n/context';
import type {
  FileRenderContext,
  FileRenderExportAdapter,
  FileRenderThumbnailAdapter,
  FileRenderHandler,
  FileViewerAiOptions,
  FileViewerApplyViewStateOptions,
  FileViewerDocumentAnchor,
  FileViewerDownloadOptions,
  FileViewerEventHandler,
  FileViewerExportHtmlOptions,
  FileViewerFitMode,
  FileViewerFitOptions,
  FileViewerFitResult,
  FileViewerInstance,
  FileViewerI18nContext,
  FileViewerLifecycleContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerPrintOptions,
  FileViewerRenderPurpose,
  FileViewerRenderedInstance,
  FileViewerRendererPluginInput,
  FileViewerSource,
  FileViewerViewState,
  NormalizedFileViewerSource,
  RendererRegistry,
  RendererSession,
} from '../contracts/types';

export interface CreateViewerOptions {
  registry?: RendererRegistry;
  options?: FileViewerOptions;
  signal?: AbortSignal;
  onEvent?: FileViewerEventHandler;
  /** Explicit parent language scope for nested viewers. */
  i18n?: FileViewerI18nContext;
  renderPurpose?: FileViewerRenderPurpose;
}

const emitLifecycle = async (
  options: FileViewerOptions,
  onEvent: FileViewerEventHandler | undefined,
  phase: FileViewerLifecycleContext['phase'],
  source: NormalizedFileViewerSource,
  version: number,
  startedAt: number,
  reason?: FileViewerLifecycleContext['reason']
) => {
  const now = Date.now();
  const context = buildFileViewerLifecycleContextFromNormalizedSource({
    phase,
    source,
    version,
    timestamp: now,
    startedAt,
    reason,
  });

  await runFileViewerLifecycleHook(context, options.hooks, error => {
    throw error;
  });
  onEvent?.({ type: phase, payload: context });
};

const createBaseRendererRegistry = (
  createOptions: CreateViewerOptions,
  options: FileViewerOptions
) => {
  if (options.rendererMode === 'replace') {
    return createRendererRegistry([]);
  }
  if (createOptions.registry) {
    return createOptions.registry;
  }
  return createFileViewerCoreRendererRegistry({
    builtinRenderers: options.builtinRenderers,
  }).registry;
};

const resolveAutoRenderersEnabled = (options: FileViewerOptions) => {
  const setting = options.autoRenderers;
  if (typeof setting === 'boolean') {
    return setting;
  }
  if (setting?.enabled !== undefined) {
    return setting.enabled;
  }
  return (options.rendererMode || 'extend') !== 'replace';
};

const createFileViewerLoadSignal = (
  controller: AbortController | null,
  signals: Array<AbortSignal | undefined>
) => {
  if (!controller) {
    return signals.find(signal => signal);
  }
  const removeListeners: Array<() => void> = [];
  const cleanup = () => removeListeners.splice(0).forEach(remove => remove());
  controller.signal.addEventListener('abort', cleanup, { once: true });
  for (const signal of signals) {
    if (!signal) {
      continue;
    }
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    removeListeners.push(() => signal.removeEventListener('abort', onAbort));
  }
  return controller.signal;
};

const isAbortError = (error: unknown) => {
  return Boolean(error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError');
};

const renderMissingRendererState = (
  container: HTMLElement,
  type: string,
  options?: FileViewerOptions,
  i18n?: FileViewerI18nContext
) => {
  const documentRef = container.ownerDocument;
  const bindings = createFileViewerI18nBindings(i18n);
  const state = () => createFileViewerUnsupportedState(type, undefined, i18n?.options || options);
  const wrapper = documentRef.createElement('div');
  wrapper.className = 'file-viewer-missing-renderer';
  wrapper.style.cssText = [
    'display:flex',
    'min-height:260px',
    'height:100%',
    'align-items:center',
    'justify-content:center',
    'padding:32px',
    'box-sizing:border-box',
    'text-align:center',
    'color:#64748b',
    'font:14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';');

  const content = documentRef.createElement('div');
  const title = documentRef.createElement('strong');
  bindings.text(title, () => state().message);
  title.style.cssText = 'display:block;margin-bottom:8px;color:#172033;font-size:16px;';
  const description = documentRef.createElement('p');
  bindings.text(description, () => state().description || state().title);
  description.style.cssText = 'max-width:520px;margin:0;';
  content.append(title, description);
  wrapper.append(content);
  container.replaceChildren(wrapper);
  return () => bindings.destroy();
};

const renderFileViewerErrorState = (
  container: HTMLElement,
  type: string,
  error: unknown,
  options?: FileViewerOptions,
  i18n?: FileViewerI18nContext
) => {
  const documentRef = container.ownerDocument;
  const bindings = createFileViewerI18nBindings(i18n);
  const initial = createFileViewerErrorState(type, error, undefined, i18n?.options || options);
  // Capture detail only once. Live labels must never inspect the original failure again.
  const t = createFileViewerTranslator(i18n || options);
  const wrapper = documentRef.createElement('div');
  wrapper.className = 'file-viewer-render-error';
  wrapper.setAttribute('role', 'alert');
  wrapper.setAttribute('aria-live', 'assertive');
  wrapper.style.cssText = [
    'display:flex',
    'min-height:260px',
    'height:100%',
    'align-items:center',
    'justify-content:center',
    'padding:32px',
    'box-sizing:border-box',
    'color:var(--file-viewer-text,#172033)',
    'font:14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';');

  const content = documentRef.createElement('div');
  content.style.cssText = [
    'width:min(680px,100%)',
    'padding:24px',
    'border:1px solid var(--file-viewer-border,rgba(20,35,53,.12))',
    'border-radius:14px',
    'background:var(--file-viewer-render-surface-background,#fff)',
    'box-shadow:0 16px 42px rgba(25,42,54,.08)',
  ].join(';');
  const title = documentRef.createElement('strong');
  bindings.text(title, () => t('state.error.title'));
  title.style.cssText = 'display:block;margin-bottom:10px;font-size:18px;';
  const message = documentRef.createElement('p');
  bindings.text(message, () => error == null ? t('error.unknown') : initial.message);
  message.style.cssText = 'margin:0;white-space:pre-wrap;overflow-wrap:anywhere;';
  content.append(title, message);
  wrapper.append(content);
  container.replaceChildren(wrapper);
  return () => bindings.destroy();
};

export const createViewer = (
  container: HTMLElement,
  createOptions: CreateViewerOptions = {}
): FileViewerInstance => {
  let options = createOptions.options || {};
  const reportI18nError = (error: unknown) => {
    if (options.onDiagnostic) {
      options.onDiagnostic({ code: 'i18n-update-failed', level: 'error', message: error instanceof Error ? error.message : String(error) });
    } else console.error(error);
  };
  const viewerI18n = createFileViewerI18n(createOptions.i18n ? undefined : options, {
    parent: createOptions.i18n,
    signal: createOptions.signal,
    ownerDocument: container.ownerDocument,
    onError: reportI18nError,
  });
  let currentRenderI18n: FileViewerI18nController | null = null;
  let retireStateLabels: (() => void) | undefined;
  let registry = createBaseRendererRegistry(createOptions, options);
  let installedRendererInput: FileViewerOptions['renderers'] | undefined = undefined;
  let installedPresetInput: FileViewerOptions['preset'] | undefined = undefined;
  let installedPresetsInput: FileViewerOptions['presets'] | undefined = undefined;
  let installedRendererMode = options.rendererMode || 'extend';
  let installedBuiltinRenderers = options.builtinRenderers || 'all';
  let installedAutoRenderersEnabled = resolveAutoRenderersEnabled(options);
  let installedAutoRendererVersion = -1;
  let currentSource: NormalizedFileViewerSource | null = null;
  let currentRendererId: string | null = null;
  let currentRenderTarget: HTMLElement | null = null;
  let currentDocumentRoot: HTMLElement | null = null;
  const renderSurfaceState = createFileViewerRenderSurfaceState<RendererSession>();
  const requestScope = createFileViewerRequestScope();
  const documentTarget = {
    anchors: { value: [] as FileViewerDocumentAnchor[] },
    state: createEmptyFileViewerSearchState(),
  };
  let watermarkEl: HTMLDivElement | null = null;
  let forcedWatermarkContainerPosition = false;
  let watermarkResizeObserver: ResizeObserver | null = null;
  let watermarkMutationObserver: MutationObserver | null = null;
  let watermarkFrame: number | null = null;

  const getContainerWindow = () =>
    container.ownerDocument.defaultView || (typeof window !== 'undefined' ? window : undefined);

  const cancelWatermarkFrame = () => {
    if (watermarkFrame === null) {
      return;
    }
    const view = getContainerWindow();
    if (view?.cancelAnimationFrame) {
      view.cancelAnimationFrame(watermarkFrame);
    }
    watermarkFrame = null;
  };

  const updateWatermarkOverlaySize = () => {
    watermarkFrame = null;
    if (!watermarkEl || watermarkEl.parentElement !== container) {
      return;
    }

    const previousDisplay = watermarkEl.style.display;
    watermarkEl.style.display = 'none';
    const width = Math.max(container.scrollWidth, container.clientWidth);
    const height = Math.max(container.scrollHeight, container.clientHeight);
    watermarkEl.style.display = previousDisplay;
    watermarkEl.style.width = `${width}px`;
    watermarkEl.style.height = `${height}px`;
  };

  const scheduleWatermarkSizeUpdate = () => {
    if (!watermarkEl) {
      return;
    }
    cancelWatermarkFrame();
    const view = getContainerWindow();
    if (view?.requestAnimationFrame) {
      watermarkFrame = view.requestAnimationFrame(updateWatermarkOverlaySize);
      return;
    }
    updateWatermarkOverlaySize();
  };

  const stopWatermarkObservers = () => {
    cancelWatermarkFrame();
    watermarkResizeObserver?.disconnect();
    watermarkResizeObserver = null;
    watermarkMutationObserver?.disconnect();
    watermarkMutationObserver = null;
  };

  const startWatermarkObservers = () => {
    stopWatermarkObservers();
    const view = getContainerWindow();
    if (view?.ResizeObserver) {
      watermarkResizeObserver = new view.ResizeObserver(() => scheduleWatermarkSizeUpdate());
      watermarkResizeObserver.observe(container);
    }
    if (view?.MutationObserver) {
      watermarkMutationObserver = new view.MutationObserver(mutations => {
        const onlyWatermarkChanged = mutations.every(mutation =>
          watermarkEl && (
            mutation.target === watermarkEl ||
            watermarkEl.contains(mutation.target as Node)
          )
        );
        if (!onlyWatermarkChanged) {
          scheduleWatermarkSizeUpdate();
        }
      });
      watermarkMutationObserver.observe(container, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }
    scheduleWatermarkSizeUpdate();
  };

  const removeWatermarkOverlay = () => {
    stopWatermarkObservers();
    watermarkEl?.remove();
    watermarkEl = null;
    if (forcedWatermarkContainerPosition) {
      container.style.position = '';
      forcedWatermarkContainerPosition = false;
    }
  };

  const removeRenderTarget = (target = currentRenderTarget) => {
    if (!target) {
      return;
    }
    removeFileViewerRenderTarget(container, target);
    if (currentRenderTarget === target) {
      currentRenderTarget = null;
    }
  };

  const createRenderTarget = (fillHeight = true) => {
    const surface = createFileViewerRenderSurface(container, {
      styleIsolation: options.styleIsolation,
    });
    const target = surface.host || surface.container;
    if (fillHeight) {
      target.style.height = '100%';
      surface.container.style.height = '100%';
    }
    syncFileViewerRenderSurfaceBackground(target, options);
    target.setAttribute('data-viewer-theme', options.theme || 'system');
    currentRenderTarget = target;
    return surface;
  };

  const disposeStaleSession = async (
    session: RendererSession | null | undefined,
    target: HTMLElement
  ) => {
    try {
      await session?.destroy?.();
    } finally {
      removeRenderTarget(target);
    }
  };

  const syncWatermarkOverlay = () => {
    const inlineStyle = buildFileViewerWatermarkInlineStyle(options.watermark);
    if (!inlineStyle) {
      removeWatermarkOverlay();
      return;
    }

    if (!watermarkEl || watermarkEl.ownerDocument !== container.ownerDocument) {
      watermarkEl = container.ownerDocument.createElement('div');
      watermarkEl.className = 'viewer-watermark';
      watermarkEl.setAttribute('aria-hidden', 'true');
    }
    watermarkEl.style.cssText = inlineStyle;

    const view = getContainerWindow();
    if (view?.getComputedStyle && view.getComputedStyle(container).position === 'static' && !container.style.position) {
      container.style.position = 'relative';
      forcedWatermarkContainerPosition = true;
    }

    if (watermarkEl.parentElement !== container) {
      container.appendChild(watermarkEl);
    }
    startWatermarkObservers();
  };

  const ensureRendererPluginsInstalled = async () => {
    const nextMode = options.rendererMode || 'extend';
    const nextRendererInput = options.renderers;
    const nextPresetInput = options.preset;
    const nextPresetsInput = options.presets;
    const nextBuiltinRenderers = options.builtinRenderers || 'all';
    const nextAutoRenderersEnabled = resolveAutoRenderersEnabled(options);
    const needsAutoPresetBucket = nextAutoRenderersEnabled ||
      hasFileViewerRendererPresetName(nextPresetInput) ||
      hasFileViewerRendererPresetName(nextPresetsInput);
    const nextAutoRendererVersion = needsAutoPresetBucket
      ? getFileViewerAutoRendererPresetVersion()
      : 0;
    if (
      nextMode === installedRendererMode &&
      nextRendererInput === installedRendererInput &&
      nextPresetInput === installedPresetInput &&
      nextPresetsInput === installedPresetsInput &&
      nextBuiltinRenderers === installedBuiltinRenderers &&
      nextAutoRenderersEnabled === installedAutoRenderersEnabled &&
      nextAutoRendererVersion === installedAutoRendererVersion
    ) {
      return;
    }

    registry = createBaseRendererRegistry(createOptions, options);
    installedRendererMode = nextMode;
    installedRendererInput = nextRendererInput;
    installedPresetInput = nextPresetInput;
    installedPresetsInput = nextPresetsInput;
    installedBuiltinRenderers = nextBuiltinRenderers;
    installedAutoRenderersEnabled = nextAutoRenderersEnabled;
    installedAutoRendererVersion = nextAutoRendererVersion;

    const rendererInputs: FileViewerRendererPluginInput<FileRenderHandler>[] = [];
    if (nextAutoRenderersEnabled) {
      rendererInputs.push(...listFileViewerAutoRendererPresets<FileRenderHandler>());
    }
    rendererInputs.push(
      ...resolveFileViewerRendererPresetInputs<FileRenderHandler>(nextPresetInput),
      ...resolveFileViewerRendererPresetInputs<FileRenderHandler>(nextPresetsInput)
    );
    if (nextRendererInput) {
      rendererInputs.push(nextRendererInput as FileViewerRendererPluginInput<FileRenderHandler>);
    }
    const plugins = collectFileViewerRendererPlugins<FileRenderHandler>(rendererInputs);
    if (!plugins.length) {
      return;
    }

    const registerHandler = (registration: {
      rendererId: string;
      handler: FileRenderHandler;
    }) => {
      const definition = registry.getById(registration.rendererId);
      if (!definition) {
        return;
      }

      registry.register({
        ...definition,
        load: createFileRenderHandlerLoader({
          handler: registration.handler,
          rendererId: definition.id,
          allowUrlSource: definition.sourceAccess === 'stream-preferred',
          getTarget: context => context.surface.container as HTMLDivElement,
        }),
      });
    };

    await installFileViewerRendererPlugins({
      registry,
      plugins,
      registerHandler,
    });
  };

  const resolveDetectedSourceType = async (
    source: NormalizedFileViewerSource,
    signal?: AbortSignal
  ) => {
    for (const definition of registry.list()) {
      if (!definition.resolveSourceType) continue
      const detected = await definition.resolveSourceType({
        filename: source.filename,
        extension: source.extension,
        url: source.url,
        file: source.file,
        buffer: source.buffer,
        mimeType: source.file?.type,
        signal,
      })
      if (typeof detected === 'string' && detected.trim()) {
        return detected.trim()
      }
    }
    return source.extension
  };

  const renderNestedBuffer = async (
    buffer: ArrayBuffer,
    type: string,
    target: HTMLDivElement,
    context: FileRenderContext | undefined,
    parentI18n: FileViewerI18nContext
  ): Promise<FileViewerRenderedInstance | undefined> => {
    const inheritedOptions = context?.options || options;
    const languageScope = createFileViewerNestedI18n(context, parentI18n, target.ownerDocument, reportI18nError);
    const nestedViewer = createViewer(target, {
      registry,
      i18n: languageScope,
      options: {
        ...inheritedOptions,
        ...languageScope.options,
        i18n: undefined,
        // The parent already resolved its renderer assembly into `registry`.
        // Reuse that exact registry without reinstalling presets or mutating a
        // shared registry while an attachment is open.
        autoRenderers: false,
        rendererMode: 'extend',
        renderers: undefined,
        preset: undefined,
        presets: undefined,
      },
      signal: context?.signal,
      renderPurpose: context?.renderPurpose || createOptions.renderPurpose || 'preview',
    });

    try {
      await nestedViewer.load({
        buffer,
        filename: context?.filename || `attachment.${type || 'bin'}`,
        type,
      }, {
        signal: context?.signal,
      });
      if (context?.signal?.aborted) {
        languageScope.destroy();
        await nestedViewer.destroy('replace');
        return undefined;
      }
      return {
        $el: target,
        destroy: () => {
          languageScope.destroy();
          return nestedViewer.destroy('component-unmount');
        },
      };
    } catch (error) {
      languageScope.destroy();
      await nestedViewer.destroy('replace');
      throw error;
    }
  };

  const buildCurrentLifecycleContext = () => {
    const source = currentSource || normalizeSource({});
    return buildFileViewerLifecycleContextFromNormalizedSource({
      phase: 'load-complete',
      source,
      version: requestScope.getCurrentVersion(),
      timestamp: Date.now(),
    });
  };

  const runBeforeViewerOperation = async (operation: FileViewerOperationType) => {
    const context = buildFileViewerOperationContext(operation, buildCurrentLifecycleContext());
    return runFileViewerBeforeOperation({
      context,
      options,
      onBefore: nextContext => {
        createOptions.onEvent?.({ type: 'operation-before', payload: nextContext });
      },
      onCancel: nextContext => {
        createOptions.onEvent?.({ type: 'operation-cancel', payload: nextContext });
      },
      onError(error) {
        throw error;
      },
    });
  };

  const getWatermarkInlineStyle = (override?: string) => {
    if (typeof override === 'string') {
      return override;
    }
    return buildFileViewerWatermarkInlineStyle(options.watermark);
  };

  const getCapabilitiesForExtension = (extension?: string) => {
    const targetExtension = extension || currentSource?.extension || '';
    const renderer = extension
      ? resolveFileViewerRendererDefinition(registry, {
          extension,
        })
      : currentRendererId
        ? registry.getById(currentRendererId)
        : resolveFileViewerRendererDefinition(registry, {
            filename: currentSource?.filename,
            extension: targetExtension,
          });
    const zoomState = zoomController.getState();
    if (!renderer) {
      return applyFileViewerZoomAvailability(createUnsupportedAvailability(targetExtension), zoomState);
    }
    return applyFileViewerZoomAvailability(
      getRendererAvailability(renderer, renderSurfaceState.session),
      zoomState
    );
  };

  const emitOperationAvailabilityChange = () => {
    createOptions.onEvent?.({
      type: 'operation-availability-change',
      payload: getCapabilitiesForExtension(),
    });
  };

  const emitZoomChange = (state = zoomController.getState()) => {
    createOptions.onEvent?.({
      type: 'zoom-change',
      payload: state,
    });
  };

  const emitZoomAndOperationAvailabilityChange = (state = zoomController.getState()) => {
    emitZoomChange(state);
    emitOperationAvailabilityChange();
  };

  const emitFitChange = (result: FileViewerFitResult) => {
    createOptions.onEvent?.({
      type: 'fit-change',
      payload: result,
    });
  };

  const zoomController = createFileViewerZoomController({
    root: () => currentDocumentRoot || container,
    gestures: () => options.zoomGestures,
    beforeZoom: runBeforeViewerOperation,
    onChange: state => emitZoomAndOperationAvailabilityChange(state),
  });
  const fitController = createFileViewerFitController({
    root: () => currentDocumentRoot || container,
    getFit: () => options.fit,
    onFit: result => {
      zoomController.refreshProvider();
      viewStateController.refreshProvider();
      emitZoomAndOperationAvailabilityChange();
      emitFitChange(result);
    },
  });
  const viewStateController = createFileViewerViewStateController({
    root: () => currentDocumentRoot || container,
    onChange: change => {
      if (
        (change.source === 'user' || change.source === 'api') &&
        change.action !== 'fit'
      ) {
        fitController.markUserInteraction();
      }
      createOptions.onEvent?.({ type: 'view-state-change', payload: change });
    },
  });
  const documentActions = createFileViewerDocumentFeatureControllerActionHandlers({
    root: () => currentDocumentRoot || container,
    searchTarget: documentTarget,
    searchOptions: () => options.search,
    getAiOptions: () => options.ai,
    onSearchChange: state => {
      createOptions.onEvent?.({ type: 'search-change', payload: state });
    },
    onLocationChange: anchor => {
      createOptions.onEvent?.({ type: 'location-change', payload: anchor });
    },
  });
  zoomController.observe();
  viewStateController.observe();
  fitController.observe();

  let teardown: Promise<void> | undefined;
  let destroyed = false;
  let destruction: Promise<void> | undefined;
  const destroyCurrent = (reason: FileViewerLifecycleContext['reason'] = 'replace'): Promise<void> => {
    // One teardown owns the old session through every awaited hook/destructor.
    // Replacements wait for it instead of racing a second partial cleanup.
    if (teardown) return teardown;
    const session = renderSurfaceState.session;
    const target = currentRenderTarget;
    const source = currentSource;
    const languageScope = currentRenderI18n;
    if (!source && !session && !target) return Promise.resolve();
    languageScope?.destroy();
    retireStateLabels?.();
    retireStateLabels = undefined;
    if (currentRenderI18n === languageScope) currentRenderI18n = null;
    const ownsState = () => currentSource === source && renderSurfaceState.session === session && currentRenderTarget === target;
    const startedAt = Date.now();
    const version = requestScope.getCurrentVersion();
    const pending = Promise.resolve().then(async () => {
      let failure: unknown;
      let failed = false;
      try {
        if (source) await emitLifecycle(options, createOptions.onEvent, 'unload-start', source, version, startedAt, reason);
      } catch (error) { failure = error; failed = true; }
      try { await session?.destroy?.(); }
      catch (error) { if (!failed) failure = error; failed = true; }
      // Even a rejected destructor must retire its own state. Never erase a new owner.
      if (ownsState()) {
        await documentActions.clearDocumentState();
        if (ownsState()) {
          removeRenderTarget(target || undefined);
          currentSource = null;
          currentRendererId = null;
          currentDocumentRoot = null;
          applyFileViewerRenderSurfaceState(renderSurfaceState, { session: null, exportAdapter: null, thumbnailAdapter: null });
          removeWatermarkOverlay();
          zoomController.clearProvider();
          viewStateController.clearProvider();
          fitController.resetAutoFit();
          emitZoomAndOperationAvailabilityChange();
        }
      } else removeRenderTarget(target || undefined);
      if (source) await emitLifecycle(options, createOptions.onEvent, 'unload-complete', source, version, startedAt, reason);
      if (failed) throw failure;
    });
    teardown = pending.finally(() => { teardown = undefined; });
    return teardown;
  };

  const instance: FileViewerInstance = {
    container,
    async prepare() {
      await ensureRendererPluginsInstalled();
    },
    async load(source: FileViewerSource, loadOptions = {}) {
      if (destroyed) return null;
      const version = requestScope.requestController.createVersion();
      const requestAbortController = requestScope.requestController.createAbortController();
      const loadSignal = createFileViewerLoadSignal(requestAbortController, [
        createOptions.signal,
        loadOptions.signal,
      ]);
      await destroyCurrent('replace');
      if (destroyed || !requestScope.isCurrentRequest(version)) return null;
      await ensureRendererPluginsInstalled();

      if (!requestScope.isCurrentRequest(version)) {
        return null;
      }

      const normalized = normalizeSource(source);
      let resolvedExtension: string;
      try {
        resolvedExtension = await resolveDetectedSourceType(normalized, loadSignal);
      } catch (error) {
        requestScope.requestController.clearAbortController(requestAbortController);
        if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted || isAbortError(error)) {
          return null;
        }
        throw error;
      }
      if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted) {
        requestScope.requestController.clearAbortController(requestAbortController);
        return null;
      }

      const renderer = resolveFileViewerRendererDefinition(registry, {
        filename: normalized.filename,
        extension: resolvedExtension,
      });
      const routedSource = resolvedExtension === normalized.extension
        ? normalized
        : { ...normalized, extension: resolvedExtension };
      currentSource = normalized;
      currentRendererId = renderer?.id || null;
      const startedAt = Date.now();
      await emitLifecycle(options, createOptions.onEvent, 'load-start', normalized, version, startedAt);
      if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted || destroyed) return null;

      const surface = createRenderTarget(
        renderer?.id !== 'office-presentation' && renderer?.id !== 'office-presentation-binary'
      );
      const target = surface.container;
      const targetHost = surface.host || target;
      currentDocumentRoot = target;

      if (!renderer?.load) {
        retireStateLabels = renderMissingRendererState(target, resolvedExtension, options, viewerI18n);
        applyFileViewerRenderSurfaceState(renderSurfaceState, { session: null });
        syncWatermarkOverlay();
        emitZoomAndOperationAvailabilityChange();
        await emitLifecycle(options, createOptions.onEvent, 'load-complete', normalized, version, startedAt);
        return null;
      }

      const languageScope = createFileViewerI18n(undefined, {
        parent: viewerI18n, signal: loadSignal, ownerDocument: target.ownerDocument, onError: reportI18nError,
      });
      currentRenderI18n = languageScope;
      let session: RendererSession | undefined;
      try {
        const rendererSession = await renderer.load({
          source: routedSource,
          surface,
          options,
          signal: loadSignal,
          registerExportAdapter: adapter => {
            if (requestScope.isCurrentRequest(version)) {
              applyFileViewerRenderSurfaceState(renderSurfaceState, { exportAdapter: adapter });
            }
          },
          registerThumbnailAdapter: adapter => {
            if (requestScope.isCurrentRequest(version)) {
              applyFileViewerRenderSurfaceState(renderSurfaceState, { thumbnailAdapter: adapter });
            }
          },
          renderContext: {
            renderPurpose: createOptions.renderPurpose || 'preview',
            i18n: languageScope,
            renderNestedBuffer: (buffer, type, target, context) => renderNestedBuffer(buffer, type, target, context, languageScope),
            requestSnapshotDownload: createFileViewerSnapshotDownload({
              getOptions: () => options,
              isCurrent: () => requestScope.isCurrentRequest(version),
              beforeDownload: () => runBeforeViewerOperation('download'),
            }),
          },
        });
        let sessionDestruction: Promise<void> | undefined;
        session = {
          ...rendererSession,
          getAvailability: rendererSession.getAvailability?.bind(rendererSession),
          destroy: () => {
            if (!sessionDestruction) {
              languageScope.destroy();
              sessionDestruction = Promise.resolve().then(() => rendererSession.destroy?.());
            }
            return sessionDestruction;
          },
        };
      } catch (error) {
        languageScope.destroy();
        if (currentRenderI18n === languageScope) currentRenderI18n = null;
        if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted || isAbortError(error)) {
          removeRenderTarget(targetHost);
          return null;
        }
        applyFileViewerRenderSurfaceState(renderSurfaceState, {
          session: null,
          exportAdapter: null,
          thumbnailAdapter: null,
        });
        removeWatermarkOverlay();
        retireStateLabels = renderFileViewerErrorState(target, resolvedExtension, error, options, viewerI18n);
        emitZoomAndOperationAvailabilityChange();
        throw error;
      }

      if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted) {
        languageScope.destroy();
        if (currentRenderI18n === languageScope) currentRenderI18n = null;
        await disposeStaleSession(session, targetHost);
        requestScope.requestController.clearAbortController(requestAbortController);
        return null;
      }

      applyFileViewerRenderSurfaceState(renderSurfaceState, { session });
      syncWatermarkOverlay();
      zoomController.refreshProvider();
      viewStateController.refreshProvider();
      const finishStaleLoad = async () => {
        // unload/replace may already have disposed this session. Clear only
        // the session still owned by this load, preserving a replacement.
        if (renderSurfaceState.session === session && currentRenderTarget === targetHost) {
          await destroyCurrent('replace');
        } else {
          removeRenderTarget(targetHost);
        }
        requestScope.requestController.clearAbortController(requestAbortController);
      };
      await documentActions.refreshDocumentIndex({ notify: false });
      if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted) {
        await finishStaleLoad();
        return null;
      }
      await fitController.applyInitialFit({
        skip: hasFileViewerExplicitInitialViewState(options.initialViewState),
      });
      if (!requestScope.isCurrentRequest(version) || loadSignal?.aborted) {
        await finishStaleLoad();
        return null;
      }
      zoomController.refreshProvider();
      viewStateController.refreshProvider();
      emitZoomAndOperationAvailabilityChange();
      await emitLifecycle(options, createOptions.onEvent, 'load-complete', normalized, version, startedAt);
      return session;
    },
    async unload(reason = 'replace') {
      requestScope.requestController.createVersion();
      await destroyCurrent(reason);
    },
    destroy(reason = 'component-unmount') {
      if (destruction) return destruction;
      destroyed = true;
      viewerI18n.destroy();
      requestScope.requestController.createVersion();
      destruction = destroyCurrent(reason).finally(() => {
        documentActions.destroyDocumentFeatures();
        zoomController.destroy();
        viewStateController.destroy();
        fitController.destroy();
        removeWatermarkOverlay();
      });
      return destruction;
    },
    updateOptions(nextOptions: Partial<FileViewerOptions>) {
      const previousFit = options.fit;
      options = {
        ...options,
        ...nextOptions,
      };
      if ('locale' in nextOptions || 'messages' in nextOptions || 'i18n' in nextOptions) viewerI18n.update(createOptions.i18n ? undefined : options);
      syncFileViewerRenderSurfaceBackground(currentRenderTarget, options);
      currentRenderTarget?.setAttribute('data-viewer-theme', options.theme || 'system');
      syncWatermarkOverlay();
      if ('fit' in nextOptions && nextOptions.fit !== previousFit) {
        fitController.resetAutoFit();
        fitController.scheduleFit('resize');
      }
    },
    getCapabilities(extension?: string) {
      return getCapabilitiesForExtension(extension);
    },
    getRenderer(extension?: string) {
      if (!extension && currentRendererId) {
        return registry.getById(currentRendererId);
      }
      return resolveFileViewerRendererDefinition(registry, {
        filename: extension ? undefined : currentSource?.filename,
        extension: extension || currentSource?.extension || '',
      });
    },
    getSource() {
      return currentSource;
    },
    registerExportAdapter(adapter: FileRenderExportAdapter | null) {
      applyFileViewerRenderSurfaceState(renderSurfaceState, { exportAdapter: adapter });
    },
    getExportAdapter() {
      return renderSurfaceState.exportAdapter;
    },
    registerThumbnailAdapter(adapter: FileRenderThumbnailAdapter | null) {
      applyFileViewerRenderSurfaceState(renderSurfaceState, { thumbnailAdapter: adapter });
    },
    getThumbnailAdapter() {
      return renderSurfaceState.thumbnailAdapter;
    },
    async download(downloadOptions: FileViewerDownloadOptions = {}) {
      const source = createFileViewerOriginalSourceStateFromNormalizedSource(currentSource);
      await executeFileViewerDownloadOperation({
        source,
        filename: downloadOptions.filename || resolveFileViewerOperationFilename({
          source,
          fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
        }),
        beforeOperation: runBeforeViewerOperation,
      });
    },
    async exportHtml(exportOptions: FileViewerExportHtmlOptions = {}) {
      return executeFileViewerExportHtmlOperation({
        source: container,
        adapter: renderSurfaceState.exportAdapter,
        download: exportOptions.download,
        filename: exportOptions.filename || resolveFileViewerOperationFilename({
          filename: resolveFileViewerDisplayFilename(currentSource),
          fallback: DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
        }),
        title: exportOptions.title || resolveFileViewerOperationFilename({
          filename: resolveFileViewerDisplayFilename(currentSource),
          fallback: DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
        }),
        watermarkInlineStyle: getWatermarkInlineStyle(exportOptions.watermarkInlineStyle),
        beforeOperation: runBeforeViewerOperation,
      });
    },
    async print(printOptions: FileViewerPrintOptions = {}) {
      await executeFileViewerPrintOperation({
        source: container,
        adapter: renderSurfaceState.exportAdapter,
        autoPrint: printOptions.autoPrint,
        openWindow: printOptions.openWindow,
        printWindow: printOptions.printWindow,
        title: printOptions.title || resolveFileViewerOperationFilename({
          filename: resolveFileViewerDisplayFilename(currentSource),
          fallback: DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
        }),
        watermarkInlineStyle: getWatermarkInlineStyle(printOptions.watermarkInlineStyle),
        mask: printOptions.mask,
        printAvailable: getCapabilitiesForExtension().print,
        beforeOperation: runBeforeViewerOperation,
      });
    },
    async printWithMask(printOptions: FileViewerPrintOptions = {}) {
      const result = await openFileViewerPrintMaskDesignerAsync({
        root: container,
        pages: renderSurfaceState.exportAdapter?.getPrintMaskPages?.(),
        i18n: options,
        color: printOptions.mask?.color,
        initialRegions: printOptions.mask?.regions,
        initialStamps: printOptions.mask?.stamps,
      });
      if (!result?.mask) {
        return;
      }
      await instance.print({
        ...printOptions,
        mask: result.mask,
      });
    },
    async zoomIn() {
      fitController.markUserInteraction();
      const state = await zoomController.zoomIn();
      emitZoomAndOperationAvailabilityChange(state);
      return state;
    },
    async zoomOut() {
      fitController.markUserInteraction();
      const state = await zoomController.zoomOut();
      emitZoomAndOperationAvailabilityChange(state);
      return state;
    },
    async resetZoom() {
      fitController.markUserInteraction();
      const state = await zoomController.resetZoom();
      emitZoomAndOperationAvailabilityChange(state);
      return state;
    },
    async fitToView(fit?: FileViewerFitMode | FileViewerFitOptions) {
      const result = await fitController.fit(fit, { source: 'api', reason: 'api' });
      zoomController.refreshProvider();
      viewStateController.refreshProvider();
      emitZoomAndOperationAvailabilityChange();
      return result;
    },
    getZoomState() {
      return zoomController.getState();
    },
    getViewState() {
      return viewStateController.getState();
    },
    applyViewState(state: FileViewerViewState, applyOptions?: FileViewerApplyViewStateOptions) {
      fitController.markUserInteraction();
      return viewStateController.applyState(state, applyOptions);
    },
    search(query: string) {
      return documentActions.searchDocument(query);
    },
    nextSearchResult() {
      return documentActions.nextSearchResult();
    },
    previousSearchResult() {
      return documentActions.previousSearchResult();
    },
    clearSearch() {
      return documentActions.clearDocumentSearch();
    },
    getSearchState() {
      return documentActions.getSearchState();
    },
    collectDocumentAnchors() {
      return documentActions.collectDocumentAnchors({ notify: false });
    },
    getCurrentDocumentAnchor() {
      return documentActions.getCurrentDocumentAnchor();
    },
    scrollToDocumentAnchor(anchor: FileViewerDocumentAnchor | string | number | null | undefined) {
      return documentActions.scrollToLoadedAnchor(anchor);
    },
    scrollToLine(line: number) {
      return documentActions.scrollToLine(line);
    },
    getDocumentTextChunks(textOptions?: boolean | FileViewerAiOptions) {
      return documentActions.getDocumentTextChunks(textOptions);
    },
  };

  return instance;
};
