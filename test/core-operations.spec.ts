import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseHTML } from 'linkedom';
import {
  FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX,
  DEFAULT_FILE_VIEWER_TOOLBAR_ORDER,
  DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
  DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
  DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
  buildFileViewerLifecycleContext,
  buildFileViewerLifecycleContextFromNormalizedSource,
  buildFileViewerOperationContext,
  buildFileViewerOperationContextFromLifecycleState,
  cloneFileViewerOperationAvailability,
  createFileViewerLifecycleActions,
  createFileViewerLifecycleFacade,
  createFileViewerPublicApi,
  createFileViewerToolbarActions,
  createFileViewerToolbarControllerActionHandlers,
  createFileViewerToolbarZoomSyncSnapshot,
  createFileViewerOperationActionHandlers,
  createFileViewerLifecycleStateController,
  createFileViewerOriginalSourceState,
  createFileViewerOriginalSourceStateFromNormalizedSource,
  createFileViewerPublicOperationActionHandlers,
  dispatchFileViewerLifecycleEvent,
  dispatchFileViewerOperationContextEvent,
  dispatchFileViewerOperationAvailabilityChange,
  dispatchFileViewerZoomChange,
  emitFileViewerComponentLifecycleEvent,
  executeFileViewerDownloadOperation,
  executeFileViewerExportHtmlOperation,
  executeFileViewerPrintOperation,
  FILE_VIEWER_LIFECYCLE_HOOK_ERROR_MESSAGE_PREFIX,
  hasVisibleFileViewerToolbarActions,
  isFileViewerToolbarOperationPermitted,
  isFileViewerZoomButtonDisabled,
  normalizeFileViewerToolbar,
  reportFileViewerLifecycleHookError,
  reportFileViewerOperationError,
  resolveFileViewerBeforeOperationErrorMessage,
  resolveFileViewerLifecycleFallbackSource,
  resolveFileViewerLifecycleHookErrorMessage,
  resolveFileViewerOperationActionErrorMessage,
  resolveFileViewerOperationFilename,
  resolveFileViewerOriginalFilename,
  resolveFileViewerOperationAvailability,
  resolveFileViewerToolbarZoomButtons,
  resolveFileViewerToolbarOrder,
  resolveFileViewerToolbarState,
  resolveFileViewerToolbarPosition,
  resolveFileViewerDisplayFilename,
  resolveVisibleFileViewerToolbar,
  runFileViewerActiveUnloadComplete,
  runFileViewerActiveUnloadStart,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook,
  runFileViewerToolbarAvailabilitySync,
  runFileViewerToolbarZoomSync,
  serializeFileViewerContext,
  type FileViewerLifecycleComponentEmit,
  type FileViewerOperationType,
} from '../packages/core/src';

describe('@file-viewer/core operation helpers', () => {
  it('builds lifecycle and operation contexts without framework state', () => {
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      url: '/docs/%E6%8A%A5%E5%91%8A.pdf?token=1',
      version: 7,
      startedAt: 1000,
      timestamp: 1240,
      bufferSize: 4096,
    });

    expect(context).toMatchObject({
      phase: 'load-complete',
      type: 'pdf',
      filename: '报告.pdf',
      source: 'url',
      url: '/docs/%E6%8A%A5%E5%91%8A.pdf?token=1',
      size: 4096,
      version: 7,
      timestamp: 1240,
      duration: 240,
    });

    expect(buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      url: '/docs/zero.pdf',
      version: 7,
      startedAt: 0,
      timestamp: 240,
    }).duration).toBe(240);

    expect(buildFileViewerOperationContext('print', context, 1300)).toMatchObject({
      operation: 'print',
      label: '打印完整渲染内容',
      filename: '报告.pdf',
      timestamp: 1300,
    });

    expect(buildFileViewerLifecycleContextFromNormalizedSource({
      phase: 'load-complete',
      source: {
        kind: 'url',
        filename: '计划.pdf',
        extension: 'pdf',
        url: '/docs/%E8%AE%A1%E5%88%92.pdf',
        size: 2048,
      },
      version: 8,
      startedAt: 0,
      timestamp: 320,
    })).toMatchObject({
      phase: 'load-complete',
      type: 'pdf',
      filename: '计划.pdf',
      source: 'url',
      url: '/docs/%E8%AE%A1%E5%88%92.pdf',
      size: 2048,
      version: 8,
      timestamp: 320,
      duration: 320,
    });
  });

  it('tracks lifecycle state in the framework-neutral core controller', () => {
    const controller = createFileViewerLifecycleStateController();
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'demo.pdf',
      version: 3,
      timestamp: 120,
    });

    controller.markLoadStarted(3, 100);

    expect(controller.getLoadStartedAt(3)).toBe(100);
    expect(controller.getActiveDocumentContext()).toBeNull();

    controller.setActiveDocumentContext(context);
    expect(controller.getActiveDocumentContext()).toBe(context);
    expect(controller.buildActiveUnloadContext('unload-start', context, 'replace', 130)).toMatchObject({
      phase: 'unload-start',
      filename: 'demo.pdf',
      reason: 'replace',
      timestamp: 130,
    });
    expect(controller.buildActiveUnloadContext('unload-complete', context, 'replace', 140)).toMatchObject({
      phase: 'unload-complete',
      filename: 'demo.pdf',
      reason: 'replace',
      timestamp: 140,
    });

    controller.clearLoadStarted(3);
    controller.clearActiveDocumentContext();

    expect(controller.getLoadStartedAt(3)).toBeUndefined();
    expect(controller.getActiveDocumentContext()).toBeNull();
    expect(controller.buildActiveUnloadContext('unload-start', null)).toBeNull();
  });

  it('runs active unload lifecycle orchestration without framework code', () => {
    const controller = createFileViewerLifecycleStateController();
    const onLifecycle = vi.fn();
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      filename: 'active.docx',
      url: '/active.docx',
      version: 9,
      timestamp: 500,
    });

    expect(runFileViewerActiveUnloadStart({
      lifecycleState: controller,
      onLifecycle,
    })).toEqual({
      reason: 'replace',
      context: null,
      unloadContext: null,
    });
    expect(onLifecycle).not.toHaveBeenCalled();

    controller.setActiveDocumentContext(context);
    const started = runFileViewerActiveUnloadStart({
      lifecycleState: controller,
      reason: 'replace',
      onLifecycle,
    });

    expect(started.context).toBe(context);
    expect(started.unloadContext).toMatchObject({
      phase: 'unload-start',
      filename: 'active.docx',
      reason: 'replace',
      version: 9,
    });
    expect(onLifecycle).toHaveBeenCalledTimes(1);
    expect(onLifecycle).toHaveBeenLastCalledWith(started.unloadContext);

    const completed = runFileViewerActiveUnloadComplete({
      lifecycleState: controller,
      context: started.context,
      reason: 'component-unmount',
      onLifecycle,
    });

    expect(completed.context).toBe(context);
    expect(completed.unloadContext).toMatchObject({
      phase: 'unload-complete',
      filename: 'active.docx',
      reason: 'component-unmount',
      version: 9,
    });
    expect(onLifecycle).toHaveBeenCalledTimes(2);
    expect(onLifecycle).toHaveBeenLastCalledWith(completed.unloadContext);
  });

  it('dispatches component lifecycle emits and formats beforeOperation errors through core', () => {
    const emitted: string[] = [];
    const emit = ((event: string, context: { filename: string }) => {
      emitted.push(`${event}:${context.filename}`);
    }) as FileViewerLifecycleComponentEmit;
    const context = buildFileViewerLifecycleContext({
      phase: 'load-start',
      source: 'url',
      filename: 'contract.pdf',
      version: 11,
    });

    emitFileViewerComponentLifecycleEvent(emit, context);

    expect(emitted).toEqual(['load-start:contract.pdf']);
    expect(resolveFileViewerBeforeOperationErrorMessage({
      error: new Error('denied'),
      formatErrorMessage: (prefix, error) => `${prefix}:${error instanceof Error ? error.message : String(error)}`,
    })).toBe(`${FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX}:denied`);
    expect(resolveFileViewerBeforeOperationErrorMessage({
      error: 'offline',
      prefix: '权限校验失败',
      formatErrorMessage: (prefix, error) => `${prefix}:${String(error)}`,
    })).toBe('权限校验失败:offline');

    const hookError = new Error('hook failed');
    const lifecycleLogs: Array<[string, unknown, string]> = [];
    expect(FILE_VIEWER_LIFECYCLE_HOOK_ERROR_MESSAGE_PREFIX).toBe('FileViewer');
    expect(resolveFileViewerLifecycleHookErrorMessage({ context })).toBe('FileViewer load-start hook failed');
    expect(resolveFileViewerLifecycleHookErrorMessage({
      context,
      prefix: 'Viewer',
    })).toBe('Viewer load-start hook failed');
    expect(reportFileViewerLifecycleHookError({
      error: hookError,
      context,
      onLogError: (message, error, nextContext) => {
        lifecycleLogs.push([message, error, nextContext.phase]);
      },
    })).toBe('FileViewer load-start hook failed');
    expect(lifecycleLogs).toEqual([['FileViewer load-start hook failed', hookError, 'load-start']]);

    const operationContext = buildFileViewerOperationContext('download', context, 220);
    const operationLogs: Array<[unknown, string]> = [];
    expect(reportFileViewerOperationError({
      error: hookError,
      context: operationContext,
      onLogError: (error, nextContext) => {
        operationLogs.push([error, nextContext.operation]);
      },
    })).toBe(hookError);
    expect(operationLogs).toEqual([[hookError, 'download']]);
  });

  it('builds operation contexts from lifecycle state without wrapper fallback logic', () => {
    const controller = createFileViewerLifecycleStateController();
    const activeContext = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'active.pdf',
      version: 5,
      timestamp: 320,
    });

    controller.setActiveDocumentContext(activeContext);
    expect(buildFileViewerOperationContextFromLifecycleState({
      operation: 'download',
      lifecycleState: controller,
      version: 5,
      fallbackUrl: '/ignored.docx',
      timestamp: 360,
    })).toMatchObject({
      operation: 'download',
      source: 'file',
      filename: 'active.pdf',
      version: 5,
      timestamp: 360,
    });

    controller.clearActiveDocumentContext();
    controller.markLoadStarted(8, 100);

    expect(buildFileViewerOperationContextFromLifecycleState({
      operation: 'print',
      lifecycleState: controller,
      version: 8,
      filename: 'fallback.docx',
      bufferSize: 512,
      fallbackUrl: '/docs/fallback.docx',
      lifecycleTimestamp: 150,
      timestamp: 170,
    })).toMatchObject({
      operation: 'print',
      label: '打印完整渲染内容',
      type: 'docx',
      filename: 'fallback.docx',
      source: 'url',
      url: '/docs/fallback.docx',
      size: 512,
      version: 8,
      timestamp: 170,
      duration: 50,
    });
  });

  it('resolves lifecycle fallback sources without wrapper-specific branching', () => {
    expect(resolveFileViewerLifecycleFallbackSource({
      file: new File(['demo'], 'demo.txt'),
      url: '/ignored.txt',
    })).toEqual({ source: 'file' });
    expect(resolveFileViewerLifecycleFallbackSource({
      url: '/example/demo.pdf',
    })).toEqual({ source: 'url', sourceUrl: '/example/demo.pdf' });
    expect(resolveFileViewerLifecycleFallbackSource()).toEqual({ source: 'empty' });
  });

  it('serializes contexts without leaking File objects', () => {
    const file = new File(['demo'], 'demo.docx');
    const context = buildFileViewerLifecycleContext({
      phase: 'load-start',
      source: 'file',
      file,
      version: 1,
      timestamp: 10,
    });

    expect(serializeFileViewerContext(context)).toEqual({
      phase: 'load-start',
      type: 'docx',
      filename: 'demo.docx',
      source: 'file',
      url: undefined,
      size: 4,
      version: 1,
      timestamp: 10,
      duration: undefined,
      reason: undefined,
      hasFile: true,
    });
  });

  it('dispatches lifecycle and operation context events in wrapper event order', () => {
    const events: string[] = [];
    const lifecycleContext = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      filename: 'dispatch.pdf',
      url: '/docs/dispatch.pdf',
      version: 3,
      timestamp: 300,
    });
    const operationContext = buildFileViewerOperationContext('print', lifecycleContext, 320);

    expect(dispatchFileViewerLifecycleEvent({
      context: lifecycleContext,
      hooks: {
        onLoadComplete: context => {
          events.push(`hook:${context.phase}`);
        },
      },
      onChange: (event, context) => {
        events.push(`emit:${event}:${context.filename}`);
      },
    })).toBe(true);
    expect(dispatchFileViewerOperationContextEvent({
      event: 'operation-before',
      context: operationContext,
      onChange: context => {
        events.push(`emit:${context.operation}`);
      },
    })).toBe(true);

    expect(events).toEqual([
      'emit:load-complete:dispatch.pdf',
      'hook:load-complete',
      'emit:print',
    ]);
  });

  it('creates lifecycle actions that reuse dispatch, unload and operation guards', async () => {
    const events: string[] = [];
    const lifecycleState = createFileViewerLifecycleStateController();
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'actions.pdf',
      version: 8,
      timestamp: 400,
    });
    lifecycleState.setActiveDocumentContext(context);
    const actions = createFileViewerLifecycleActions({
      lifecycleState,
      getOptions: () => ({
        hooks: {
          onUnloadStart: nextContext => {
            events.push(`hook:${nextContext.phase}`);
          },
        },
        beforeOperation: nextContext => {
          events.push(`guard:${nextContext.operation}`);
          return false;
        },
      }),
      onLifecycleChange: (event, nextContext) => {
        events.push(`emit:${event}:${nextContext.filename}`);
      },
      onOperationBefore: nextContext => {
        events.push(`before:${nextContext.operation}`);
      },
      onOperationCancel: nextContext => {
        events.push(`cancel:${nextContext.operation}`);
      },
    });

    const unloadStartContext = actions.notifyActiveUnloadStart('replace');
    expect(unloadStartContext).toMatchObject({
      phase: 'load-complete',
      reason: undefined,
      filename: 'actions.pdf',
    });

    actions.notifyActiveUnloadComplete(unloadStartContext, 'replace');
    await expect(actions.runBeforeOperation(
      buildFileViewerOperationContext('download', context, 430)
    )).resolves.toBe(false);

    expect(events).toEqual([
      'emit:unload-start:actions.pdf',
      'hook:unload-start',
      'emit:unload-complete:actions.pdf',
      'before:download',
      'guard:download',
      'cancel:download',
    ]);
  });

  it('creates lifecycle facades from wrapper state getters', async () => {
    const events: string[] = [];
    const errors: string[] = [];
    const lifecycle = createFileViewerLifecycleFacade({
      getOptions: () => ({
        beforeOperation: context => {
          events.push(`guard:${context.operation}:${context.filename}`);
          return false;
        },
      }),
      getFilename: () => 'facade.pdf',
      getBufferSize: () => 2048,
      getCurrentFile: () => null,
      getCurrentVersion: () => 12,
      getFallbackFile: () => undefined,
      getFallbackUrl: () => '/fallback.pdf',
      emitLifecycle: (event, context) => {
        events.push(`emit:${event}:${context.filename}`);
      },
      emitOperationBefore: context => {
        events.push(`before:${context.operation}:${context.source}`);
      },
      emitOperationCancel: context => {
        events.push(`cancel:${context.operation}`);
      },
      formatErrorMessage: (prefix, error) => `${prefix}:${error instanceof Error ? error.message : String(error)}`,
      handleLifecycleError: error => {
        errors.push(String(error));
      },
      onOperationErrorMessage: message => {
        errors.push(message);
      },
    });

    lifecycle.markLoadStarted(12, 100);
    const loadStart = lifecycle.buildLoadStartState({
      version: 12,
      source: 'url',
      sourceUrl: '/facade.pdf',
    });
    expect(loadStart.lifecycleContext).toMatchObject({
      phase: 'load-start',
      source: 'url',
      filename: 'facade.pdf',
      size: 2048,
      url: '/facade.pdf',
    });
    lifecycle.notifyLifecycle(loadStart.lifecycleContext);

    const complete = lifecycle.buildRenderCompleteState({
      version: 12,
      source: 'url',
      sourceUrl: '/facade.pdf',
    });
    expect(complete.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      filename: 'facade.pdf',
    });
    lifecycle.setActiveDocumentContext(complete.lifecycleContext);

    expect(lifecycle.buildOperationContext('download')).toMatchObject({
      operation: 'download',
      label: '下载原始文件',
      filename: 'facade.pdf',
      source: 'url',
      size: 2048,
    });
    await expect(lifecycle.runBeforeOperation('download')).resolves.toBe(false);
    lifecycle.clearLoadStarted(12);
    lifecycle.clearActiveDocumentContext();
    expect(lifecycle.buildOperationContext('print')).toMatchObject({
      operation: 'print',
      source: 'url',
      url: '/fallback.pdf',
      filename: 'facade.pdf',
    });

    expect(events).toEqual([
      'emit:load-start:facade.pdf',
      'before:download:url',
      'guard:download:facade.pdf',
      'cancel:download',
    ]);
    expect(errors).toEqual([]);
  });

  it('dispatches toolbar change notifications in wrapper event order', () => {
    const events: string[] = [];
    const availability = {
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: false,
    };
    const zoomState = {
      scale: 1.5,
      label: '150%',
      canZoomIn: true,
      canZoomOut: true,
      canReset: true,
    };
    let emittedAvailability: typeof availability | null = null;
    let emittedZoomState: typeof zoomState | null = null;

    expect(dispatchFileViewerOperationAvailabilityChange({
      availability,
      onChange: payload => {
        events.push('emit:operation-availability-change');
        emittedAvailability = payload;
        payload.download = false;
      },
    })).toBe(true);
    expect(dispatchFileViewerZoomChange({
      state: zoomState,
      onChange: payload => {
        events.push('emit:zoom-change');
        emittedZoomState = payload;
      },
    })).toBe(true);

    expect(events).toEqual([
      'emit:operation-availability-change',
      'emit:zoom-change',
    ]);
    expect(emittedAvailability).toEqual({
      ...availability,
      download: false,
    });
    expect(emittedAvailability).not.toBe(availability);
    expect(availability.download).toBe(true);
    expect(emittedZoomState).toBe(zoomState);
  });

  it('creates toolbar actions that reuse notification dispatch and zoom guard rules', () => {
    const events: string[] = [];
    const availability = {
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: true,
    };
    let toolbarDisabled = false;
    const zoomState = {
      scale: 1,
      label: '100%',
      canZoomIn: true,
      canZoomOut: false,
      canReset: true,
    };
    const actions = createFileViewerToolbarActions({
      getOperationAvailability: () => availability,
      getToolbarDisabled: () => toolbarDisabled,
      getZoomState: () => zoomState,
      onOperationAvailabilityChange: payload => {
        events.push(`emit:availability:${payload.zoomOut}`);
      },
      onZoomChange: payload => {
        events.push(`emit:zoom:${payload.label}`);
      },
    });

    expect(actions.isZoomButtonDisabled('canZoomIn')).toBe(false);
    expect(actions.isZoomButtonDisabled('canZoomOut')).toBe(true);
    toolbarDisabled = true;
    expect(actions.isZoomButtonDisabled('canZoomIn')).toBe(true);

    expect(actions.notifyOperationAvailabilityChange()).toBe(true);
    expect(actions.notifyZoomChange()).toBe(true);

    expect(events).toEqual([
      'emit:availability:false',
      'emit:zoom:100%',
    ]);
  });

  it('runs toolbar sync notifications and keeps zoom sync snapshot fields stable', () => {
    const events: string[] = [];
    const availability = {
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: true,
      zoomReset: false,
    };
    const zoomState = {
      scale: 1.25,
      label: '125%',
      canZoomIn: true,
      canZoomOut: true,
      canReset: true,
      minScale: 0.25,
      maxScale: 4,
    };
    const toolbarActions = {
      notifyOperationAvailabilityChange(nextAvailability = availability) {
        events.push(`availability:${nextAvailability.zoomReset}`);
        return true;
      },
      notifyZoomChange(nextState = zoomState) {
        events.push(`zoom:${nextState.label}`);
        return true;
      },
    };

    expect(createFileViewerToolbarZoomSyncSnapshot(zoomState)).toEqual([
      1.25,
      '125%',
      true,
      true,
      true,
    ]);
    expect(runFileViewerToolbarAvailabilitySync({
      toolbarActions,
      availability,
    })).toBe(true);
    expect(runFileViewerToolbarZoomSync({
      toolbarActions,
      state: zoomState,
    })).toBe(true);
    expect(events).toEqual([
      'availability:false',
      'zoom:125%',
    ]);
  });

  it('creates reusable toolbar controller action handlers for framework wrappers', () => {
    const events: string[] = [];
    const zoomState = {
      scale: 1,
      label: '100%',
      canZoomIn: true,
      canZoomOut: false,
      canReset: true,
      minScale: 0.25,
      maxScale: 4,
    };
    let buffer: ArrayBuffer | null = new ArrayBuffer(8);
    let hasError = false;
    let loading = false;
    const controller = createFileViewerToolbarControllerActionHandlers({
      getAdapter: () => ({ exportHtml: true }),
      getBuffer: () => buffer,
      getExtension: () => 'pdf',
      getFile: () => null,
      getHasError: () => hasError,
      getLoading: () => loading,
      getOptions: () => undefined,
      getSourceUrl: () => null,
      getToolbar: () => ({
        download: true,
        print: true,
        exportHtml: true,
        zoom: true,
      }),
      getRenderedReady: () => true,
      getZoomState: () => zoomState,
      zoomSyncState: zoomState,
      onOperationAvailabilityChange: availability => {
        events.push(`emit:availability:${availability.download}:${availability.zoomOut}`);
      },
      onZoomChange: state => {
        events.push(`emit:zoom:${state.label}`);
      },
    });

    const state = controller.resolveToolbarState();

    expect(state.operationAvailability).toMatchObject({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: true,
    });
    expect(state.visibleToolbar).toEqual({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      search: true,
      theme: true,
    });
    expect(state.toolbarPosition).toBe('bottom-right');
    expect(state.toolbarDisabled).toBe(false);
    expect(controller.createZoomSyncSnapshot()).toEqual([
      1,
      '100%',
      true,
      false,
      true,
    ]);
    expect(controller.isZoomButtonDisabled('canZoomIn')).toBe(false);
    expect(controller.isZoomButtonDisabled('canZoomOut')).toBe(true);
    expect(controller.syncOperationAvailability()).toBe(true);
    expect(controller.syncZoomChange()).toBe(true);
    expect(events).toEqual([
      'emit:availability:true:false',
      'emit:zoom:100%',
    ]);

    buffer = null;
    hasError = true;
    loading = true;
    const disabledState = controller.resolveToolbarState();

    expect(disabledState.operationAvailability.download).toBe(false);
    expect(disabledState.operationAvailability.exportHtml).toBe(false);
    expect(disabledState.toolbarDisabled).toBe(true);
    expect(controller.isZoomButtonDisabled('canZoomIn')).toBe(true);
  });

  it('runs lifecycle hooks and operation guards in deterministic order', async () => {
    const events: string[] = [];
    const context = buildFileViewerLifecycleContext({
      phase: 'load-start',
      source: 'file',
      filename: 'guard.pdf',
      version: 1,
      timestamp: 10,
    });
    const operationContext = buildFileViewerOperationContext('download', context, 12);

    await runFileViewerLifecycleHook(context, {
      onLoadStart: nextContext => events.push(`lifecycle:${nextContext.phase}`),
    });

    const allowed = await runFileViewerBeforeOperation({
      context: operationContext,
      options: {
        beforeOperation: nextContext => {
          events.push(`global:${nextContext.operation}`);
        },
        toolbar: {
          beforeOperation: nextContext => {
            events.push(`toolbar:${nextContext.operation}`);
          },
          beforeDownload: () => {
            events.push('download:false');
            return false;
          },
        },
      },
      onBefore: nextContext => events.push(`before:${nextContext.operation}`),
      onCancel: nextContext => events.push(`cancel:${nextContext.operation}`),
    });

    expect(allowed).toBe(false);
    expect(events).toEqual([
      'lifecycle:load-start',
      'before:download',
      'global:download',
      'toolbar:download',
      'download:false',
      'cancel:download',
    ]);
  });

  it('blocks public operations through toolbar permission maps before custom hooks run', async () => {
    const events: string[] = [];
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      url: '/secure.pdf',
      version: 1,
      timestamp: 10,
    });
    const operationContext = buildFileViewerOperationContext('print', context, 12);

    const allowed = await runFileViewerBeforeOperation({
      context: operationContext,
      options: {
        beforeOperation: nextContext => {
          events.push(`global:${nextContext.operation}`);
        },
        toolbar: {
          permissions: {
            print: false,
          },
        },
      },
      onBefore: nextContext => events.push(`before:${nextContext.operation}`),
      onCancel: nextContext => events.push(`cancel:${nextContext.operation}`),
    });

    expect(allowed).toBe(false);
    expect(events).toEqual([
      'before:print',
      'cancel:print',
    ]);
  });

  it('normalizes toolbar visibility and operation availability in core', () => {
    expect(normalizeFileViewerToolbar(undefined)).toEqual({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true,
      search: true,
      theme: true,
      order: [...DEFAULT_FILE_VIEWER_TOOLBAR_ORDER],
    });
    expect(normalizeFileViewerToolbar({ toolbar: false })).toEqual({
      download: false,
      print: false,
      exportHtml: false,
      zoom: false,
      search: false,
      theme: false,
      order: [...DEFAULT_FILE_VIEWER_TOOLBAR_ORDER],
    });
    expect(normalizeFileViewerToolbar({
      toolbar: {
        download: true,
        print: true,
        exportHtml: true,
        zoom: true,
        order: ['zoom', 'search', 'download', 'print'],
        items: {
          print: false,
          'zoom-out': false,
        },
        permissions: {
          'export-html': false,
          'zoom-reset': false,
        },
        position: 'bottom-right',
      },
    })).toMatchObject({
      download: true,
      print: false,
      exportHtml: false,
      zoom: true,
      search: true,
      theme: true,
      order: ['zoom', 'search', 'download', 'print', 'exportHtml', 'theme'],
      items: {
        print: false,
        'zoom-out': false,
      },
      permissions: {
        'export-html': false,
        'zoom-reset': false,
      },
      position: 'bottom-right',
    });

    const availability = resolveFileViewerOperationAvailability({
      extension: 'pdf',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>pdf</main>' },
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    });

    expect(availability).toMatchObject({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: false,
    });
    expect(resolveVisibleFileViewerToolbar({ download: true, print: false, exportHtml: true, zoom: true }, availability)).toEqual({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      search: true,
      theme: true,
    });
    expect(hasVisibleFileViewerToolbarActions({
      download: false,
      print: false,
      exportHtml: false,
      zoom: false,
    })).toBe(false);
    expect(hasVisibleFileViewerToolbarActions({
      download: false,
      print: false,
      exportHtml: true,
      zoom: false,
    })).toBe(true);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomIn',
      availability,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    })).toBe(false);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomOut',
      availability,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    })).toBe(true);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomIn',
      availability,
      toolbarDisabled: true,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    })).toBe(true);
    expect(resolveFileViewerToolbarState({
      extension: 'pdf',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>pdf</main>' },
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
      toolbar: {
        download: true,
        print: false,
        exportHtml: true,
        zoom: true,
      },
      loading: true,
    })).toMatchObject({
      operationAvailability: {
        download: true,
        print: true,
        exportHtml: true,
        zoom: true,
      },
      visibleToolbar: {
        download: true,
        print: false,
        exportHtml: true,
        zoom: true,
        theme: true,
      },
      toolbarOrder: [...DEFAULT_FILE_VIEWER_TOOLBAR_ORDER],
      showToolbar: true,
      toolbarPosition: 'bottom-right',
      toolbarDisabled: true,
    });
    const permissionState = resolveFileViewerToolbarState({
      extension: 'pdf',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>pdf</main>' },
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: true,
        canReset: true,
      },
      toolbar: normalizeFileViewerToolbar({
        toolbar: {
          download: true,
          print: true,
          exportHtml: true,
          zoom: true,
          permissions: {
            download: false,
            'zoom-in': false,
          },
        },
      }),
      options: {
        toolbar: {
          permissions: {
            download: false,
            'zoom-in': false,
          },
        },
      },
    });
    expect(permissionState.operationAvailability).toMatchObject({
      download: false,
      print: true,
      exportHtml: true,
      zoom: true,
      zoomIn: false,
      zoomOut: true,
      zoomReset: true,
    });
    expect(permissionState.visibleToolbar).toMatchObject({
      download: false,
      print: true,
      exportHtml: true,
      zoom: true,
    });
    const onlyZoomIn = { permissions: { 'zoom-out': false, 'zoom-reset': false } };
    const limitState = resolveFileViewerToolbarState({
      extension: 'png', renderedReady: true,
      zoomState: { scale: 5, label: '500%', canZoomIn: false, canZoomOut: true, canReset: true },
      toolbar: normalizeFileViewerToolbar({ toolbar: onlyZoomIn }),
      options: { toolbar: onlyZoomIn },
    });
    expect(limitState.operationAvailability).toMatchObject({ zoom: false, zoomIn: false, zoomOut: false, zoomReset: false });
    expect(resolveFileViewerToolbarZoomButtons({
      toolbar: normalizeFileViewerToolbar({ toolbar: onlyZoomIn }), renderedReady: true,
      zoomState: { scale: 5, label: '500%', canZoomIn: false, canZoomOut: true, canReset: true },
    })).toEqual({ zoomIn: true, zoomOut: false, zoomReset: false });
    expect(limitState.visibleToolbar.zoom).toBe(true);
    expect(isFileViewerToolbarOperationPermitted({ permissions: { print: false } }, 'print')).toBe(false);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomIn',
      availability: permissionState.operationAvailability,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: true,
        canReset: true,
      },
    })).toBe(true);
    expect(resolveFileViewerOperationAvailability({
      extension: 'docx',
      source: {
        file: new File(['demo'], 'demo.docx'),
      },
      renderedReady: false,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: false,
        canZoomOut: false,
        canReset: false,
      },
    }).download).toBe(true);
    expect(resolveFileViewerOperationAvailability({
      extension: 'docx',
      source: {},
      renderedReady: false,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: false,
        canZoomOut: false,
        canReset: false,
      },
    }).download).toBe(false);
    expect(resolveFileViewerToolbarPosition(undefined, 'pdf')).toBe('bottom-right');
    expect(resolveFileViewerToolbarPosition({ toolbar: { position: 'top' } }, 'pdf')).toBe('top');
    expect(resolveFileViewerToolbarPosition({ toolbar: { position: 'top-center' } }, 'docx')).toBe('top-center');
  });

  it('resolves toolbar group order with defaults, aliases and duplicate filtering', () => {
    expect(resolveFileViewerToolbarOrder(undefined)).toEqual([
      'search',
      'zoom',
      'download',
      'print',
      'exportHtml',
      'theme',
    ]);
    expect(resolveFileViewerToolbarOrder({
      order: ['zoom', 'search', 'download', 'print'],
    })).toEqual([
      'zoom',
      'search',
      'download',
      'print',
      'exportHtml',
      'theme',
    ]);
    expect(resolveFileViewerToolbarOrder({
      order: ['zoom', 'export-html', 'zoom', 'exportHtml', 'download'],
    })).toEqual([
      'zoom',
      'exportHtml',
      'download',
      'search',
      'print',
      'theme',
    ]);
    expect(resolveFileViewerToolbarState({
      extension: 'docx',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>docx</main>' },
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: true,
        canReset: true,
      },
      toolbar: normalizeFileViewerToolbar({
        toolbar: {
          order: ['download', 'zoom'],
        },
      }),
    }).toolbarOrder).toEqual([
      'download',
      'zoom',
      'search',
      'print',
      'exportHtml',
      'theme',
    ]);
  });

  it('resolves operation filenames from display names, original source metadata, and core defaults', () => {
    expect(resolveFileViewerOperationFilename({
      filename: '显示文档.pdf',
      fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
    })).toBe('显示文档.pdf');
    expect(resolveFileViewerOperationFilename({
      source: {
        file: new File(['demo'], '原始文档.docx'),
      },
      fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
    })).toBe('原始文档.docx');
    expect(resolveFileViewerOperationFilename({
      fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
    })).toBe(DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME);
    expect(resolveFileViewerOperationFilename({
      fallback: DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
    })).toBe(DEFAULT_FILE_VIEWER_EXPORT_FILENAME);
    expect(resolveFileViewerOperationFilename({})).toBe(DEFAULT_FILE_VIEWER_PREVIEW_TITLE);
    expect(resolveFileViewerDisplayFilename({
      kind: 'url',
      filename: '线上报告.pdf',
      extension: 'pdf',
      url: '/docs/report.pdf',
    })).toBe('线上报告.pdf');
    expect(resolveFileViewerDisplayFilename(null)).toBe(DEFAULT_FILE_VIEWER_EXPORT_FILENAME);
    expect(createFileViewerOriginalSourceStateFromNormalizedSource({
      kind: 'url',
      filename: '线上报告.pdf',
      extension: 'pdf',
      url: '/docs/report.pdf',
      size: 1024,
    })).toMatchObject({
      buffer: null,
      file: null,
      url: '/docs/report.pdf',
      filename: '线上报告.pdf',
    });
  });

  it('clones operation availability snapshots without sharing mutable references', () => {
    const availability = resolveFileViewerOperationAvailability({
      extension: 'pdf',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>pdf</main>' },
      zoomState: {
        scale: 1.25,
        label: '125%',
        canZoomIn: false,
        canZoomOut: true,
        canReset: true,
      },
    });

    const snapshot = cloneFileViewerOperationAvailability(availability);

    expect(snapshot).toEqual(availability);
    expect(snapshot).not.toBe(availability);

    snapshot.download = false;
    snapshot.zoomReset = false;

    expect(availability.download).toBe(true);
    expect(availability.zoomReset).toBe(true);
  });

  it('creates public api facades with cloned operation availability snapshots', async () => {
    const availability = {
      download: true,
      print: true,
      exportHtml: false,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: true,
    };
    const calls: string[] = [];
    const api = createFileViewerPublicApi({
      getOperationAvailability: () => availability,
      destroy: () => { calls.push('destroy'); },
      downloadOriginalFile: async () => { calls.push('download'); },
      printRenderedHtml: async () => { calls.push('print'); },
      exportRenderedHtml: async () => { calls.push('export-html'); },
      zoomIn: async () => ({
        scale: 1.25,
        label: '125%',
        canZoomIn: true,
        canZoomOut: true,
        canReset: true,
      }),
      zoomOut: async () => ({
        scale: 0.75,
        label: '75%',
        canZoomIn: true,
        canZoomOut: true,
        canReset: true,
      }),
      resetZoom: async () => ({
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      }),
      getZoomState: () => ({
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      }),
      getViewState: () => null,
      applyViewState: async () => null,
      getScrollContainer: () => null,
      searchDocument: async query => ({
        query,
        total: 0,
        currentIndex: -1,
        current: null,
        matches: [],
      }),
      clearDocumentSearch: async () => ({
        query: '',
        total: 0,
        currentIndex: -1,
        current: null,
        matches: [],
      }),
      nextSearchResult: async () => ({
        query: '',
        total: 0,
        currentIndex: -1,
        current: null,
        matches: [],
      }),
      previousSearchResult: async () => ({
        query: '',
        total: 0,
        currentIndex: -1,
        current: null,
        matches: [],
      }),
      getSearchState: () => ({
        query: '',
        total: 0,
        currentIndex: -1,
        current: null,
        matches: [],
      }),
      collectDocumentAnchors: async () => [],
      scrollToAnchor: async () => true,
      scrollToLine: async () => true,
      getDocumentTextChunks: () => [],
    });

    const snapshot = api.getOperationAvailability();
    snapshot.download = false;
    expect(api.getOperationAvailability().download).toBe(true);

    await api.downloadOriginalFile();
    await api.printRenderedHtml();
    await api.exportRenderedHtml();
    api.destroy();

    expect(calls).toEqual(['download', 'print', 'export-html', 'destroy']);
  });

  it('reports operation guard errors and cancels the operation', async () => {
    const onError = vi.fn();
    const onCancel = vi.fn();
    const context = buildFileViewerOperationContext('print', buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'broken.pdf',
      version: 1,
      timestamp: 10,
    }));

    await expect(runFileViewerBeforeOperation({
      context,
      options: {
        beforeOperation: () => {
          throw new Error('denied');
        },
      },
      onError,
      onCancel,
    })).resolves.toBe(false);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(context);
  });

  it('executes download, export and print through framework-neutral core operations', async () => {
    const document = new JSDOM(
      '<!doctype html><html><head></head><body><main id="root"><article><h1>Preview</h1></article></main></body></html>',
    ).window.document;
    const root = document.getElementById('root') as HTMLElement;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);
    const beforeOperations: string[] = [];
    let downloadedName = '';
    let downloadedSize = -1;
    let printed = false;
    let printHtml: string;

    document.createElement = ((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: () => {
            downloadedName = (element as HTMLAnchorElement).download;
          },
        });
      }
      return element;
    }) as Document['createElement'];
    Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        requestAnimationFrame: (callback: () => void) => {
          callback();
          return 1;
        },
        setTimeout: (callback: () => void) => {
          callback();
          return 1;
        },
      },
    });
    URL.createObjectURL = blob => {
      downloadedSize = blob.size;
      return 'blob:viewer-operation-test';
    };
    URL.revokeObjectURL = () => undefined;

    const beforeOperation = (operation: FileViewerOperationType) => {
      beforeOperations.push(operation);
      return true;
    };

    const printWindow = new JSDOM(
      '<!doctype html><html><head></head><body></body></html>',
      { pretendToBeVisual: true },
    ).window as unknown as Window;
    vi.spyOn(printWindow.document, 'write').mockImplementation(() => {
      throw new Error('document.write is forbidden');
    });
    Object.defineProperty(printWindow.document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    Object.defineProperty(printWindow, 'focus', { configurable: true, value: () => undefined });
    Object.defineProperty(printWindow, 'print', {
      configurable: true,
      value: () => {
        printed = true;
      },
    });
    Object.defineProperty(printWindow, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });

    try {
      const html = await executeFileViewerExportHtmlOperation({
        source: root,
        adapter: {
          includeDocumentStyles: false,
          toHtml: options => `<section data-mode="${options.mode}">${options.title}</section>`,
        },
        title: 'demo.viewer',
        filename: 'demo.viewer',
        download: false,
        beforeOperation,
      });
      expect(html).toContain('data-mode="export"');
      expect(html).toContain('demo.viewer');

      await executeFileViewerPrintOperation({
        source: root,
        title: 'demo.viewer',
        printWindow,
        beforeOperation,
      });
      expect(printed).toBe(true);
      printHtml = printWindow.document.documentElement.outerHTML;
      expect(printHtml).toContain('<h1>Preview</h1>');
      expect(printWindow.document.compatMode).toBe('CSS1Compat');

      await executeFileViewerDownloadOperation({
        source: {
          buffer: new Uint8Array([1, 2, 3]).buffer,
          filename: 'demo.bin',
        },
        beforeOperation,
      });
      expect(downloadedName).toBe('demo.bin');
      expect(downloadedSize).toBe(3);

      const detachedPdfBuffer = new TextEncoder().encode('%PDF-detached').buffer;
      structuredClone(detachedPdfBuffer, { transfer: [detachedPdfBuffer] });
      const uploadedPdf = new File(['%PDF-complete'], 'uploaded.pdf', {
        type: 'application/pdf',
      });
      expect(detachedPdfBuffer.byteLength).toBe(0);

      await executeFileViewerDownloadOperation({
        source: {
          buffer: detachedPdfBuffer,
          file: uploadedPdf,
          filename: uploadedPdf.name,
          mimeType: uploadedPdf.type,
        },
        beforeOperation,
      });
      expect(downloadedName).toBe('uploaded.pdf');
      expect(downloadedSize).toBe(uploadedPdf.size);
      expect(beforeOperations).toEqual(['export-html', 'print', 'download', 'download']);

      await expect(executeFileViewerDownloadOperation({
        source: {},
        throwOnMissingSource: false,
      })).resolves.toBe(false);
    } finally {
      document.createElement = originalCreateElement as Document['createElement'];
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });

  it('creates framework-neutral file operation actions for wrappers', async () => {
    const document = new JSDOM(
      '<!doctype html><html><head></head><body><main id="root"><article><h1>Action facade</h1></article></main></body></html>',
    ).window.document;
    const root = document.getElementById('root') as HTMLElement;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);
    const beforeOperations: string[] = [];
    const errors: Array<{ operation: string; error: unknown }> = [];
    const errorMessages: string[] = [];
    let downloadedName = '';
    let printHtml: string;
    let printed = false;
    let printAvailable = false;

    document.createElement = ((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: () => {
            downloadedName = (element as HTMLAnchorElement).download;
          },
        });
      }
      return element;
    }) as Document['createElement'];

    const printWindow = new JSDOM(
      '<!doctype html><html><head></head><body></body></html>',
      { pretendToBeVisual: true },
    ).window as unknown as Window;
    vi.spyOn(printWindow.document, 'write').mockImplementation(() => {
      throw new Error('document.write is forbidden');
    });
    Object.defineProperty(printWindow.document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    Object.defineProperty(printWindow, 'focus', { configurable: true, value: () => undefined });
    Object.defineProperty(printWindow, 'print', {
      configurable: true,
      value: () => {
        printed = true;
      },
    });
    Object.defineProperty(printWindow, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });

    Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        open: () => printWindow,
        requestAnimationFrame: (callback: () => void) => {
          callback();
          return 1;
        },
        setTimeout: (callback: () => void) => {
          callback();
          return 1;
        },
      },
    });
    URL.createObjectURL = () => 'blob:viewer-action-test';
    URL.revokeObjectURL = () => undefined;

    const actions = createFileViewerOperationActionHandlers({
      getBuffer: () => new Uint8Array([4, 5, 6]).buffer,
      getFile: () => null,
      getUrl: () => null,
      getFilename: () => 'suite.viewer',
      getMimeType: () => 'application/octet-stream',
      getRenderedSource: () => root,
      getAdapter: () => ({
        includeDocumentStyles: false,
        toHtml: options => `<section data-mode="${options.mode}">${options.title}</section>`,
      }),
      getWatermarkInlineStyle: () => '--viewer-watermark: demo;',
      getPrintAvailable: () => printAvailable,
      beforeOperation: operation => {
        beforeOperations.push(operation);
        return true;
      },
      onError: context => {
        errors.push(context);
      },
      formatErrorMessage: (prefix, error) => `${prefix}:${error instanceof Error ? error.message : String(error)}`,
      onErrorMessage: message => {
        errorMessages.push(message);
      },
    });

    try {
      const html = await actions.exportRenderedHtml();
      expect(html).toContain('data-mode="export"');
      expect(downloadedName).toBe('suite.viewer.rendered.html');

      await expect(actions.downloadOriginalFile()).resolves.toBe(true);
      expect(downloadedName).toBe('suite.viewer');

      await expect(actions.printRenderedHtml()).resolves.toBeUndefined();
      expect(errors).toHaveLength(1);
      expect(errors[0].operation).toBe('print');
      expect(errorMessages[0]).toContain('打印失败:当前文件类型不支持完整打印');
      expect(printed).toBe(false);

      printAvailable = true;
      await expect(actions.printRenderedHtml({ openWindow: () => printWindow })).resolves.toBe(true);
      expect(printed).toBe(true);
      printHtml = printWindow.document.documentElement.outerHTML;
      expect(printHtml).toContain('data-mode="print"');
      expect(beforeOperations).toEqual(['export-html', 'download', 'print']);
    } finally {
      document.createElement = originalCreateElement as Document['createElement'];
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });

  it('opens an explicit preview window before asynchronous snapshot work', async () => {
    const sourceDocument = new JSDOM(
      '<!doctype html><html><head></head><body><main id="root"><article>CAD</article></main></body></html>',
      { pretendToBeVisual: true },
    ).window.document;
    const root = sourceDocument.getElementById('root') as HTMLElement;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const printWindow = new JSDOM(
      '<!doctype html><html><head></head><body></body></html>',
      { pretendToBeVisual: true },
    ).window as unknown as Window;
    const order: string[] = [];
    Object.defineProperty(printWindow, 'focus', { configurable: true, value: () => undefined });
    Object.defineProperty(printWindow, 'print', { configurable: true, value: () => undefined });
    Object.defineProperty(printWindow, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
    Object.defineProperty(printWindow.document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: sourceDocument });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        open: () => {
          order.push('open');
          return printWindow;
        },
        requestAnimationFrame: (callback: () => void) => {
          callback();
          return 1;
        },
        setTimeout: (callback: () => void) => {
          callback();
          return 1;
        },
      },
    });

    try {
      await expect(executeFileViewerPrintOperation({
        source: root,
        autoPrint: false,
        beforeOperation: async () => {
          await Promise.resolve();
          order.push('before');
          return true;
        },
      })).resolves.toBe(true);
      expect(order).toEqual(['open', 'before']);
      expect(printWindow.document.documentElement.outerHTML).toContain('CAD');
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });

  it('closes an owned print window when the asynchronous hook rejects', async () => {
    const sourceDocument = new JSDOM(
      '<!doctype html><html><head></head><body><main id="root"><article>CAD</article></main></body></html>',
      { pretendToBeVisual: true },
    ).window.document;
    const root = sourceDocument.getElementById('root') as HTMLElement;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const close = vi.fn();
    const printWindow = new JSDOM(
      '<!doctype html><html><head></head><body></body></html>',
      { pretendToBeVisual: true },
    ).window as unknown as Window;
    Object.defineProperty(printWindow, 'close', { configurable: true, value: close });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: sourceDocument });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { open: () => printWindow },
    });

    try {
      await expect(executeFileViewerPrintOperation({
        source: root,
        autoPrint: false,
        beforeOperation: async () => {
          throw new Error('print preparation failed');
        },
      })).rejects.toThrow('print preparation failed');
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });

  it('creates public operation action facades that preserve the void component contract', async () => {
    const { document } = parseHTML('<main id="root"><article>Document</article></main>');
    const root = document.querySelector('#root') as HTMLElement;
    const beforeOperations: FileViewerOperationType[] = [];
    const actions = createFileViewerPublicOperationActionHandlers({
      getBuffer: () => null,
      getFile: () => null,
      getUrl: () => '/example/report.pdf',
      getFilename: () => 'report.pdf',
      getRenderedSource: () => root,
      getPrintAvailable: () => true,
      beforeOperation: operation => {
        beforeOperations.push(operation);
        return false;
      },
    });

    await expect(actions.downloadOriginalFile()).resolves.toBeUndefined();
    await expect(actions.exportRenderedHtml()).resolves.toBeUndefined();
    await expect(actions.printRenderedHtml()).resolves.toBeUndefined();
    expect(beforeOperations).toEqual(['download', 'export-html', 'print']);
  });

  it('formats operation action errors through core defaults', () => {
    const message = resolveFileViewerOperationActionErrorMessage({
      context: {
        operation: 'export-html',
        error: new Error('missing DOM'),
      },
      formatErrorMessage: (prefix, error) => `${prefix}:${error instanceof Error ? error.message : String(error)}`,
    });
    const customMessage = resolveFileViewerOperationActionErrorMessage({
      context: {
        operation: 'download',
        error: 'offline',
      },
      prefixes: {
        download: '保存失败',
      },
      formatErrorMessage: (prefix, error) => `${prefix}:${String(error)}`,
    });

    expect(message).toBe('导出 HTML 失败:missing DOM');
    expect(customMessage).toBe('保存失败:offline');
  });

  it('normalizes original source state in core', () => {
    const file = new File(['demo'], 'demo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const source = createFileViewerOriginalSourceState({
      file,
      filename: 'display.docx',
    });

    expect(source).toEqual({
      buffer: null,
      file,
      url: null,
      filename: 'display.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(resolveFileViewerOriginalFilename(source)).toBe('display.docx');
    expect(createFileViewerOriginalSourceState({
      buffer: new ArrayBuffer(2),
      mimeType: 'application/octet-stream',
    }).mimeType).toBe('application/octet-stream');
  });
});
