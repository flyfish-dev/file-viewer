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
import { createFileViewerUnsupportedState } from './state';
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

const renderMissingRendererState = (
  container: HTMLElement,
  type: string,
  options?: FileViewerOptions
) => {
  const documentRef = container.ownerDocument;
  const state = createFileViewerUnsupportedState(type, undefined, options);
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
  title.textContent = state.message;
  title.style.cssText = 'display:block;margin-bottom:8px;color:#172033;font-size:16px;';
  const description = documentRef.createElement('p');
  description.textContent = state.description || state.title;
  description.style.cssText = 'max-width:520px;margin:0;';
  content.append(title, description);
  wrapper.append(content);
  container.replaceChildren(wrapper);
};

export const createViewer = (
  container: HTMLElement,
  createOptions: CreateViewerOptions = {}
): FileViewerInstance => {
  let options = createOptions.options || {};
  let registry = createBaseRendererRegistry(createOptions, options);
  let installedRendererInput: FileViewerOptions['renderers'] | undefined = undefined;
  let installedPresetInput: FileViewerOptions['preset'] | undefined = undefined;
  let installedPresetsInput: FileViewerOptions['presets'] | undefined = undefined;
  let installedRendererMode = options.rendererMode || 'extend';
  let installedBuiltinRenderers = options.builtinRenderers || 'all';
  let installedAutoRenderersEnabled = resolveAutoRenderersEnabled(options);
  let installedAutoRendererVersion = -1;
  let currentSource: NormalizedFileViewerSource | null = null;
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

  const renderNestedBuffer: NonNullable<FileRenderContext['renderNestedBuffer']> = async (
    buffer,
    type,
    target,
    context
  ): Promise<FileViewerRenderedInstance | undefined> => {
    const inheritedOptions = context?.options || options;
    const nestedViewer = createViewer(target, {
      registry,
      options: {
        ...inheritedOptions,
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
        await nestedViewer.destroy('replace');
        return undefined;
      }
      return {
        $el: target,
        destroy: () => nestedViewer.destroy('component-unmount'),
      };
    } catch (error) {
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
    const renderer = registry.getByExtension(targetExtension);
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

  const destroyCurrent = async (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    const session = renderSurfaceState.session;
    const target = currentRenderTarget;

    if (!currentSource && !session && !target) {
      return;
    }

    const source = currentSource;
    const startedAt = Date.now();
    const version = requestScope.getCurrentVersion();
    if (source) {
      await emitLifecycle(options, createOptions.onEvent, 'unload-start', source, version, startedAt, reason);
    }
    await session?.destroy?.();
    removeRenderTarget(target || undefined);
    currentSource = null;
    currentDocumentRoot = null;
    applyFileViewerRenderSurfaceState(renderSurfaceState, {
      session: null,
      exportAdapter: null,
      thumbnailAdapter: null,
    });
    removeWatermarkOverlay();
    await documentActions.clearDocumentState();
    zoomController.clearProvider();
    viewStateController.clearProvider();
    fitController.resetAutoFit();
    emitZoomAndOperationAvailabilityChange();
    if (source) {
      await emitLifecycle(options, createOptions.onEvent, 'unload-complete', source, version, startedAt, reason);
    }
  };

  const instance: FileViewerInstance = {
    container,
    async prepare() {
      await ensureRendererPluginsInstalled();
    },
    async load(source: FileViewerSource, loadOptions = {}) {
      const version = requestScope.requestController.createVersion();
      const requestAbortController = requestScope.requestController.createAbortController();
      const loadSignal = createFileViewerLoadSignal(requestAbortController, [
        createOptions.signal,
        loadOptions.signal,
      ]);
      await destroyCurrent('replace');
      await ensureRendererPluginsInstalled();

      if (!requestScope.isCurrentRequest(version)) {
        return null;
      }

      const normalized = normalizeSource(source);
      currentSource = normalized;

      const renderer = registry.getByExtension(normalized.extension);
      const startedAt = Date.now();
      await emitLifecycle(options, createOptions.onEvent, 'load-start', normalized, version, startedAt);

      const surface = createRenderTarget(
        renderer?.id !== 'office-presentation' && renderer?.id !== 'office-presentation-binary'
      );
      const target = surface.container;
      const targetHost = surface.host || target;
      currentDocumentRoot = target;

      if (!renderer?.load) {
        renderMissingRendererState(target, normalized.extension, options);
        applyFileViewerRenderSurfaceState(renderSurfaceState, { session: null });
        syncWatermarkOverlay();
        emitZoomAndOperationAvailabilityChange();
        await emitLifecycle(options, createOptions.onEvent, 'load-complete', normalized, version, startedAt);
        return null;
      }

      let session: RendererSession | undefined;
      try {
        session = await renderer.load({
          source: normalized,
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
            renderNestedBuffer,
          },
        });
      } catch (error) {
        if (!requestScope.isCurrentRequest(version)) {
          removeRenderTarget(targetHost);
          return null;
        }
        removeRenderTarget(targetHost);
        throw error;
      }

      if (!requestScope.isCurrentRequest(version)) {
        await disposeStaleSession(session, targetHost);
        return null;
      }

      applyFileViewerRenderSurfaceState(renderSurfaceState, { session });
      syncWatermarkOverlay();
      zoomController.refreshProvider();
      viewStateController.refreshProvider();
      await documentActions.refreshDocumentIndex({ notify: false });
      await fitController.applyInitialFit({
        skip: hasFileViewerExplicitInitialViewState(options.initialViewState),
      });
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
    async destroy(reason = 'component-unmount') {
      requestScope.requestController.createVersion();
      await destroyCurrent(reason);
      documentActions.destroyDocumentFeatures();
      zoomController.destroy();
      viewStateController.destroy();
      fitController.destroy();
      removeWatermarkOverlay();
    },
    updateOptions(nextOptions: Partial<FileViewerOptions>) {
      const previousFit = options.fit;
      options = {
        ...options,
        ...nextOptions,
      };
      syncFileViewerRenderSurfaceBackground(currentRenderTarget, options);
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
      return registry.getByExtension(extension || currentSource?.extension || '');
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
