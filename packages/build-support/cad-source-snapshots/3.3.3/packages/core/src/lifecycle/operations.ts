// Lifecycle and toolbar operation policy.
//
// This layer builds normalized contexts, runs user hooks, and resolves whether
// actions such as print/download/export/zoom should be available. Concrete file
// operation execution remains in `viewer/operations`.
import { resolvePrintAvailability } from '../registry/capabilities';
import { getExtension, normalizeFilename } from '../source';
import {
  translateFileViewerMessage,
  type FileViewerI18nInput,
} from '../i18n/messages';
import type { FileViewerErrorMessageFormatter } from '../viewer/state';
import {
  createFileViewerOriginalSourceState,
  hasFileViewerOriginalSource,
  type FileViewerOriginalSourceState,
} from '../viewer/operations';
import type {
  FileRenderExportAdapter,
  FileViewerBeforeOperation,
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerLifecycleHooks,
  FileViewerLifecyclePhase,
  FileViewerOperationAvailability,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerResolvedToolbarItem,
  FileViewerSourceKind,
  FileViewerToolbarActionMap,
  FileViewerToolbarItem,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  FileViewerPublicApi,
  FileViewerZoomState,
  NormalizedFileViewerSource,
} from '../contracts/types';

export const FILE_VIEWER_LIFECYCLE_HOOKS = {
  'load-start': 'onLoadStart',
  'load-complete': 'onLoadComplete',
  'unload-start': 'onUnloadStart',
  'unload-complete': 'onUnloadComplete',
} as const satisfies Record<FileViewerLifecyclePhase, keyof FileViewerLifecycleHooks>;

export const FILE_VIEWER_OPERATION_LABELS = {
  download: '下载原始文件',
  print: '打印完整渲染内容',
  'export-html': '导出渲染 HTML',
  'zoom-in': '放大预览',
  'zoom-out': '缩小预览',
  'zoom-reset': '还原预览比例',
} as const satisfies Record<FileViewerOperationType, string>;

export const FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX = '操作前置校验失败';

export const FILE_VIEWER_LIFECYCLE_HOOK_ERROR_MESSAGE_PREFIX = 'FileViewer';

const FILE_VIEWER_ZOOM_OPERATIONS = ['zoom-in', 'zoom-out', 'zoom-reset'] as const satisfies FileViewerOperationType[];

const FILE_VIEWER_ZOOM_BUTTON_OPERATIONS = {
  canZoomIn: 'zoom-in',
  canZoomOut: 'zoom-out',
  canReset: 'zoom-reset',
} as const satisfies Record<FileViewerZoomButtonAction, typeof FILE_VIEWER_ZOOM_OPERATIONS[number]>;

export const DEFAULT_FILE_VIEWER_TOOLBAR_ORDER = [
  'search',
  'zoom',
  'download',
  'print',
  'exportHtml',
  'theme',
] as const satisfies readonly FileViewerResolvedToolbarItem[];

export interface FileViewerLifecycleComponentEmit {
  (event: 'load-start', context: FileViewerLifecycleContext): void;
  (event: 'load-complete', context: FileViewerLifecycleContext): void;
  (event: 'unload-start', context: FileViewerLifecycleContext): void;
  (event: 'unload-complete', context: FileViewerLifecycleContext): void;
}

export interface BuildFileViewerLifecycleContextInput<
  Source extends string = FileViewerSourceKind,
> {
  phase: FileViewerLifecyclePhase;
  version: number;
  source: Source;
  filename?: string;
  file?: File | null;
  url?: string;
  size?: number;
  bufferSize?: number;
  startedAt?: number;
  duration?: number;
  timestamp?: number;
  reason?: FileViewerLifecycleContext['reason'];
}

export interface BuildFileViewerLifecycleContextFromNormalizedSourceInput {
  phase: FileViewerLifecyclePhase;
  source: NormalizedFileViewerSource;
  version: number;
  startedAt?: number;
  timestamp?: number;
  reason?: FileViewerLifecycleContext['reason'];
}

export interface ResolveFileViewerLifecycleFallbackSourceInput {
  file?: FileViewerFileRef | null;
  url?: string | null;
}

export interface ResolvedFileViewerLifecycleFallbackSource {
  source: FileViewerLifecycleContext['source'];
  sourceUrl?: string;
}

export type BuiltFileViewerLifecycleContext<
  Source extends string = FileViewerSourceKind,
> = Omit<FileViewerLifecycleContext, 'source'> & {
  source: Source;
};

export type BuiltFileViewerOperationContext<
  Source extends string = FileViewerSourceKind,
> = Omit<BuiltFileViewerLifecycleContext<Source>, 'phase'> & {
  operation: FileViewerOperationType;
  label: string;
};

export type SerializedFileViewerContext<
  Context extends FileViewerLifecycleContext | FileViewerOperationContext,
> = Omit<Context, 'file'> & {
  hasFile: boolean;
};

export interface ResolveFileViewerOperationAvailabilityInput {
  extension: string;
  hasOriginalSource?: boolean;
  source?: FileViewerOriginalSourceState | null;
  renderedReady: boolean;
  hasError?: boolean;
  adapter?: FileRenderExportAdapter | null;
  zoomState: FileViewerZoomState;
}

export interface ResolveFileViewerToolbarStateInput extends ResolveFileViewerOperationAvailabilityInput {
  toolbar: FileViewerToolbarOptions;
  options?: Pick<FileViewerOptions, 'toolbar' | 'search'>;
  searchAvailable?: boolean;
  loading?: boolean;
}

export interface FileViewerToolbarState {
  operationAvailability: FileViewerOperationAvailability;
  visibleToolbar: FileViewerToolbarOptions;
  toolbarOrder: FileViewerResolvedToolbarItem[];
  showToolbar: boolean;
  toolbarPosition: FileViewerToolbarPosition;
  toolbarDisabled: boolean;
}

export interface RunFileViewerBeforeOperationInput<
  Context extends FileViewerOperationContext = FileViewerOperationContext,
> {
  context: Context;
  options?: FileViewerOptions;
  onBefore?: (context: Context) => void;
  onCancel?: (context: Context) => void;
  onError?: (error: unknown, context: Context) => void;
}

export interface ResolveFileViewerBeforeOperationErrorMessageInput {
  error: unknown;
  formatErrorMessage: FileViewerErrorMessageFormatter;
  prefix?: string;
  i18n?: FileViewerI18nInput;
}

export interface ResolveFileViewerLifecycleHookErrorMessageInput {
  context: Pick<FileViewerLifecycleContext, 'phase'>;
  prefix?: string;
}

export type FileViewerLifecycleHookErrorLogger = (
  message: string,
  error: unknown,
  context: FileViewerLifecycleContext
) => void;

export interface ReportFileViewerLifecycleHookErrorInput extends ResolveFileViewerLifecycleHookErrorMessageInput {
  error: unknown;
  context: FileViewerLifecycleContext;
  onLogError?: FileViewerLifecycleHookErrorLogger | null;
}

export type FileViewerOperationErrorLogger = (
  error: unknown,
  context: FileViewerOperationContext
) => void;

export interface ReportFileViewerOperationErrorInput {
  error: unknown;
  context: FileViewerOperationContext;
  onLogError?: FileViewerOperationErrorLogger | null;
}

export interface CreateFileViewerLifecycleActionsInput<
  OperationContext extends FileViewerOperationContext = FileViewerOperationContext,
> {
  lifecycleState: FileViewerLifecycleStateController;
  getOptions?: () => FileViewerOptions | undefined;
  onLifecycleChange?: (event: FileViewerLifecyclePhase, context: FileViewerLifecycleContext) => void;
  onLifecycleError?: (error: unknown, context: FileViewerLifecycleContext) => void;
  onOperationBefore?: (context: OperationContext) => void;
  onOperationCancel?: (context: OperationContext) => void;
  onOperationError?: (error: unknown, context: OperationContext) => void;
}

export interface FileViewerLifecycleActions<
  OperationContext extends FileViewerOperationContext = FileViewerOperationContext,
> {
  notifyLifecycle(context: FileViewerLifecycleContext): boolean;
  notifyActiveUnloadStart(reason?: FileViewerLifecycleContext['reason']): FileViewerLifecycleContext | null;
  notifyActiveUnloadComplete(
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason']
  ): FileViewerActiveUnloadState;
  runBeforeOperation(context: OperationContext): Promise<boolean>;
}

export interface DispatchFileViewerLifecycleEventInput<
  Context extends FileViewerLifecycleContext = FileViewerLifecycleContext,
> {
  context: Context;
  hooks?: FileViewerLifecycleHooks;
  onChange?: (event: FileViewerLifecyclePhase, context: Context) => void;
  onError?: (error: unknown, context: Context) => void;
}

export interface DispatchFileViewerOperationContextEventInput<
  Context extends FileViewerOperationContext = FileViewerOperationContext,
> {
  event: 'operation-before' | 'operation-cancel';
  context: Context;
  onChange?: (context: Context) => void;
}

export interface DispatchFileViewerOperationAvailabilityChangeInput {
  availability: FileViewerOperationAvailability;
  onChange?: (availability: FileViewerOperationAvailability) => void;
}

export interface DispatchFileViewerZoomChangeInput {
  state: FileViewerZoomState;
  onChange?: (state: FileViewerZoomState) => void;
}

export type FileViewerZoomButtonAction = keyof Pick<FileViewerZoomState, 'canZoomIn' | 'canZoomOut' | 'canReset'>;

export interface CreateFileViewerToolbarActionsInput {
  getOperationAvailability: () => FileViewerOperationAvailability;
  getToolbarDisabled?: () => boolean;
  getZoomState: () => FileViewerZoomState;
  onOperationAvailabilityChange?: (availability: FileViewerOperationAvailability) => void;
  onZoomChange?: (state: FileViewerZoomState) => void;
}

export interface FileViewerToolbarActions {
  notifyOperationAvailabilityChange(availability?: FileViewerOperationAvailability): boolean;
  notifyZoomChange(state?: FileViewerZoomState): boolean;
  isZoomButtonDisabled(action: FileViewerZoomButtonAction): boolean;
}

export interface CreateFileViewerPublicApiInput extends Omit<FileViewerPublicApi, 'getOperationAvailability'> {
  getOperationAvailability: () => FileViewerOperationAvailability;
}

export type FileViewerToolbarZoomSyncSnapshot = readonly [
  scale: FileViewerZoomState['scale'],
  label: FileViewerZoomState['label'],
  canZoomIn: FileViewerZoomState['canZoomIn'],
  canZoomOut: FileViewerZoomState['canZoomOut'],
  canReset: FileViewerZoomState['canReset'],
];

export interface RunFileViewerToolbarAvailabilitySyncInput {
  toolbarActions: Pick<FileViewerToolbarActions, 'notifyOperationAvailabilityChange'>;
  availability?: FileViewerOperationAvailability;
}

export interface RunFileViewerToolbarZoomSyncInput {
  toolbarActions: Pick<FileViewerToolbarActions, 'notifyZoomChange'>;
  state?: FileViewerZoomState;
}

export interface FileViewerToolbarControllerActionHandlers {
  resolveToolbarState(): FileViewerToolbarState;
  createZoomSyncSnapshot(): FileViewerToolbarZoomSyncSnapshot;
  syncOperationAvailability(availability?: FileViewerOperationAvailability): boolean;
  syncZoomChange(state?: FileViewerZoomState): boolean;
  isZoomButtonDisabled(action: FileViewerZoomButtonAction): boolean;
}

export interface CreateFileViewerToolbarControllerActionHandlersInput {
  getAdapter?: () => FileRenderExportAdapter | null | undefined;
  getBuffer?: () => ArrayBuffer | null | undefined;
  getExtension: () => string;
  getFile?: () => File | null | undefined;
  getHasError?: () => boolean;
  getLoading?: () => boolean;
  getOptions?: () => FileViewerOptions | undefined;
  getSearchAvailable?: () => boolean;
  getSourceUrl?: () => string | null | undefined;
  getToolbar: () => FileViewerToolbarOptions;
  getRenderedReady: () => boolean;
  getZoomState: () => FileViewerZoomState;
  zoomSyncState?: FileViewerZoomState;
  onOperationAvailabilityChange?: (availability: FileViewerOperationAvailability) => void;
  onZoomChange?: (state: FileViewerZoomState) => void;
}

export interface FileViewerLifecycleStateController {
  markLoadStarted(version: number, timestamp?: number): void;
  clearLoadStarted(version: number): void;
  getLoadStartedAt(version: number): number | undefined;
  getActiveDocumentContext(): FileViewerLifecycleContext | null;
  setActiveDocumentContext(context: FileViewerLifecycleContext): void;
  clearActiveDocumentContext(): void;
  buildActiveUnloadContext(
    phase: Extract<FileViewerLifecyclePhase, 'unload-start' | 'unload-complete'>,
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason'],
    timestamp?: number
  ): FileViewerLifecycleContext | null;
}

export interface BuildFileViewerOperationContextFromLifecycleStateInput {
  operation: FileViewerOperationType;
  lifecycleState: Pick<FileViewerLifecycleStateController, 'getActiveDocumentContext' | 'getLoadStartedAt'>;
  version: number;
  filename?: string;
  bufferSize?: number;
  currentFile?: File | null;
  fallbackFile?: FileViewerFileRef | null;
  fallbackUrl?: string | null;
  timestamp?: number;
  lifecycleTimestamp?: number;
  i18n?: FileViewerI18nInput;
}

export interface RunFileViewerActiveUnloadStartInput {
  lifecycleState: Pick<FileViewerLifecycleStateController, 'getActiveDocumentContext' | 'buildActiveUnloadContext'>;
  reason?: FileViewerLifecycleContext['reason'];
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
}

export interface RunFileViewerActiveUnloadCompleteInput {
  lifecycleState: Pick<FileViewerLifecycleStateController, 'buildActiveUnloadContext'>;
  context?: FileViewerLifecycleContext | null;
  reason?: FileViewerLifecycleContext['reason'];
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
}

export interface FileViewerActiveUnloadState {
  reason: FileViewerLifecycleContext['reason'];
  context: FileViewerLifecycleContext | null;
  unloadContext: FileViewerLifecycleContext | null;
}

export const buildFileViewerLifecycleContext = <
  Source extends string = FileViewerSourceKind,
>({
  phase,
  version,
  source,
  filename,
  file,
  url,
  size,
  bufferSize,
  startedAt,
  duration,
  timestamp,
  reason,
}: BuildFileViewerLifecycleContextInput<Source>): BuiltFileViewerLifecycleContext<Source> => {
  const resolvedFilename = normalizeFilename(file?.name || filename || url || '');
  const now = timestamp ?? Date.now();

  return {
    phase,
    type: getExtension(resolvedFilename),
    filename: resolvedFilename,
    source,
    url,
    file: file || undefined,
    size: size ?? file?.size ?? bufferSize,
    version,
    timestamp: now,
    duration: duration ?? (phase === 'load-complete' && typeof startedAt === 'number' ? now - startedAt : undefined),
    reason,
  };
};

export const buildFileViewerLifecycleContextFromNormalizedSource = ({
  phase,
  source,
  version,
  startedAt,
  timestamp,
  reason,
}: BuildFileViewerLifecycleContextFromNormalizedSourceInput): FileViewerLifecycleContext => {
  const now = timestamp ?? Date.now();

  return buildFileViewerLifecycleContext({
    phase,
    filename: source.filename,
    source: source.kind,
    url: source.url,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined,
    size: source.size,
    version,
    timestamp: now,
    duration: phase.endsWith('complete') && typeof startedAt === 'number' ? now - startedAt : undefined,
    reason,
  });
};

export const resolveFileViewerLifecycleFallbackSource = ({
  file,
  url,
}: ResolveFileViewerLifecycleFallbackSourceInput = {}): ResolvedFileViewerLifecycleFallbackSource => {
  if (file) {
    return { source: 'file' };
  }

  if (url) {
    return { source: 'url', sourceUrl: url };
  }

  return { source: 'empty' };
};

export const createFileViewerLifecycleStateController = (): FileViewerLifecycleStateController => {
  let activeDocumentContext: FileViewerLifecycleContext | null = null;
  const loadStartedAt = new Map<number, number>();

  return {
    markLoadStarted(version, timestamp = Date.now()) {
      loadStartedAt.set(version, timestamp);
    },
    clearLoadStarted(version) {
      loadStartedAt.delete(version);
    },
    getLoadStartedAt(version) {
      return loadStartedAt.get(version);
    },
    getActiveDocumentContext() {
      return activeDocumentContext;
    },
    setActiveDocumentContext(context) {
      activeDocumentContext = context;
    },
    clearActiveDocumentContext() {
      activeDocumentContext = null;
    },
    buildActiveUnloadContext(phase, context, reason = 'replace', timestamp = Date.now()) {
      if (!context) {
        return null;
      }

      return {
        ...context,
        phase,
        timestamp,
        reason,
      };
    },
  };
};

export const buildFileViewerOperationContext = <
  Source extends string = FileViewerSourceKind,
>(
  operation: FileViewerOperationType,
  lifecycleContext: BuiltFileViewerLifecycleContext<Source>,
  timestamp = Date.now(),
  i18n?: FileViewerI18nInput
): BuiltFileViewerOperationContext<Source> => {
  const { phase: _phase, ...context } = lifecycleContext;
  const labelKey = {
    download: 'operation.download',
    print: 'operation.print',
    'export-html': 'operation.exportHtml',
    'zoom-in': 'operation.zoomIn',
    'zoom-out': 'operation.zoomOut',
    'zoom-reset': 'operation.zoomReset',
  } as const satisfies Record<FileViewerOperationType, Parameters<typeof translateFileViewerMessage>[1]>;

  return {
    ...context,
    operation,
    label: translateFileViewerMessage(i18n, labelKey[operation]),
    timestamp,
  };
};

export const buildFileViewerOperationContextFromLifecycleState = ({
  operation,
  lifecycleState,
  version,
  filename,
  bufferSize,
  currentFile,
  fallbackFile,
  fallbackUrl,
  timestamp,
  lifecycleTimestamp,
  i18n,
}: BuildFileViewerOperationContextFromLifecycleStateInput): FileViewerOperationContext => {
  const activeContext = lifecycleState.getActiveDocumentContext();
  const fallbackSource = resolveFileViewerLifecycleFallbackSource({
    file: fallbackFile,
    url: fallbackUrl,
  });
  const baseContext = activeContext || buildFileViewerLifecycleContext({
    phase: 'load-complete',
    version,
    source: fallbackSource.source,
    file: currentFile,
    filename,
    url: fallbackSource.sourceUrl,
    bufferSize,
    startedAt: lifecycleState.getLoadStartedAt(version),
    timestamp: lifecycleTimestamp,
  });

  return buildFileViewerOperationContext(operation, baseContext, timestamp, i18n);
};

export const emitFileViewerComponentLifecycleEvent = (
  emit: FileViewerLifecycleComponentEmit,
  context: FileViewerLifecycleContext
) => {
  if (context.phase === 'load-start') {
    emit('load-start', context);
    return;
  }
  if (context.phase === 'load-complete') {
    emit('load-complete', context);
    return;
  }
  if (context.phase === 'unload-start') {
    emit('unload-start', context);
    return;
  }
  emit('unload-complete', context);
};

export const resolveFileViewerBeforeOperationErrorMessage = ({
  error,
  formatErrorMessage,
  prefix,
  i18n,
}: ResolveFileViewerBeforeOperationErrorMessageInput) => {
  return formatErrorMessage(prefix || translateFileViewerMessage(i18n, 'error.beforeOperation'), error, i18n);
};

export const resolveFileViewerLifecycleHookErrorMessage = ({
  context,
  prefix = FILE_VIEWER_LIFECYCLE_HOOK_ERROR_MESSAGE_PREFIX,
}: ResolveFileViewerLifecycleHookErrorMessageInput) => {
  return `${prefix} ${context.phase} hook failed`;
};

export const DEFAULT_FILE_VIEWER_LIFECYCLE_HOOK_ERROR_LOGGER: FileViewerLifecycleHookErrorLogger = (
  message,
  error
) => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message, error);
  }
};

export const reportFileViewerLifecycleHookError = ({
  error,
  context,
  onLogError = DEFAULT_FILE_VIEWER_LIFECYCLE_HOOK_ERROR_LOGGER,
  prefix,
}: ReportFileViewerLifecycleHookErrorInput) => {
  const message = resolveFileViewerLifecycleHookErrorMessage({ context, prefix });
  onLogError?.(message, error, context);
  return message;
};

export const DEFAULT_FILE_VIEWER_OPERATION_ERROR_LOGGER: FileViewerOperationErrorLogger = error => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(error);
  }
};

export const reportFileViewerOperationError = ({
  error,
  context,
  onLogError = DEFAULT_FILE_VIEWER_OPERATION_ERROR_LOGGER,
}: ReportFileViewerOperationErrorInput) => {
  onLogError?.(error, context);
  return error;
};

export const runFileViewerActiveUnloadStart = ({
  lifecycleState,
  reason = 'replace',
  onLifecycle,
}: RunFileViewerActiveUnloadStartInput): FileViewerActiveUnloadState => {
  const context = lifecycleState.getActiveDocumentContext();
  const unloadContext = lifecycleState.buildActiveUnloadContext('unload-start', context, reason);
  if (unloadContext) {
    onLifecycle?.(unloadContext);
  }

  return {
    reason,
    context,
    unloadContext,
  };
};

export const runFileViewerActiveUnloadComplete = ({
  lifecycleState,
  context = null,
  reason = 'replace',
  onLifecycle,
}: RunFileViewerActiveUnloadCompleteInput): FileViewerActiveUnloadState => {
  const unloadContext = lifecycleState.buildActiveUnloadContext('unload-complete', context, reason);
  if (unloadContext) {
    onLifecycle?.(unloadContext);
  }

  return {
    reason,
    context,
    unloadContext,
  };
};

export const getFileViewerLifecycleHookName = (phase: FileViewerLifecyclePhase) => {
  return FILE_VIEWER_LIFECYCLE_HOOKS[phase];
};

export const runFileViewerLifecycleHook = async <
  Context extends FileViewerLifecycleContext,
>(
  context: Context,
  hooks?: FileViewerLifecycleHooks,
  onError?: (error: unknown, context: Context) => void
) => {
  const hook = hooks?.[getFileViewerLifecycleHookName(context.phase)];
  if (!hook) {
    return;
  }

  try {
    await hook(context);
  } catch (error) {
    onError?.(error, context);
  }
};

export const getFileViewerBeforeOperationHooks = (
  options: FileViewerOptions | undefined,
  operation: FileViewerOperationType
): Array<FileViewerBeforeOperation | undefined> => {
  const toolbar = options?.toolbar;
  if (!toolbar || typeof toolbar !== 'object') {
    return [options?.beforeOperation];
  }

  const specificHook = operation === 'download'
    ? toolbar.beforeDownload
    : operation === 'print'
      ? toolbar.beforePrint
      : operation === 'export-html'
        ? toolbar.beforeExportHtml
        : undefined;

  return [options?.beforeOperation, toolbar.beforeOperation, specificHook];
};

const isToolbarActionMapAllowed = (
  map: FileViewerToolbarActionMap | undefined,
  operation: FileViewerOperationType
) => map?.[operation] !== false;

export const isFileViewerToolbarOperationPermitted = (
  toolbar: FileViewerOptions['toolbar'] | undefined,
  operation: FileViewerOperationType
) => {
  if (!toolbar || typeof toolbar !== 'object') {
    return true;
  }
  return isToolbarActionMapAllowed(toolbar.permissions, operation);
};

const isFileViewerToolbarOperationVisible = (
  toolbar: FileViewerToolbarOptions,
  operation: FileViewerOperationType
) => isToolbarActionMapAllowed(toolbar.items, operation) &&
  isToolbarActionMapAllowed(toolbar.permissions, operation);

const normalizeFileViewerToolbarItem = (
  item: FileViewerToolbarItem | string | undefined
): FileViewerResolvedToolbarItem | undefined => {
  if (item === 'search' || item === 'zoom' || item === 'download' || item === 'print') {
    return item;
  }
  if (item === 'exportHtml' || item === 'export-html') {
    return 'exportHtml';
  }
  if (item === 'theme') {
    return 'theme';
  }
  return undefined;
};

export const resolveFileViewerToolbarOrder = (
  toolbar: Pick<FileViewerToolbarOptions, 'order'> | undefined
): FileViewerResolvedToolbarItem[] => {
  const order: FileViewerResolvedToolbarItem[] = [];
  const seen = new Set<FileViewerResolvedToolbarItem>();

  const addItem = (item: FileViewerToolbarItem | string | undefined) => {
    const normalized = normalizeFileViewerToolbarItem(item);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    order.push(normalized);
  };

  if (Array.isArray(toolbar?.order)) {
    toolbar.order.forEach(addItem);
  }
  DEFAULT_FILE_VIEWER_TOOLBAR_ORDER.forEach(addItem);

  return order;
};

const hasAnyToolbarZoomOperation = (
  toolbar: FileViewerToolbarOptions
) => FILE_VIEWER_ZOOM_OPERATIONS.some(operation => isFileViewerToolbarOperationVisible(toolbar, operation));

const applyToolbarPermissionsToAvailability = (
  availability: FileViewerOperationAvailability,
  toolbar: FileViewerOptions['toolbar'] | undefined
): FileViewerOperationAvailability => {
  if (!toolbar || typeof toolbar !== 'object' || !toolbar.permissions) {
    return availability;
  }

  const next = cloneFileViewerOperationAvailability(availability);
  if (!isFileViewerToolbarOperationPermitted(toolbar, 'download')) {
    next.download = false;
  }
  if (!isFileViewerToolbarOperationPermitted(toolbar, 'print')) {
    next.print = false;
  }
  if (!isFileViewerToolbarOperationPermitted(toolbar, 'export-html')) {
    next.exportHtml = false;
  }
  if (!isFileViewerToolbarOperationPermitted(toolbar, 'zoom-in')) {
    next.zoomIn = false;
  }
  if (!isFileViewerToolbarOperationPermitted(toolbar, 'zoom-out')) {
    next.zoomOut = false;
  }
  if (!isFileViewerToolbarOperationPermitted(toolbar, 'zoom-reset')) {
    next.zoomReset = false;
  }
  next.zoom = next.zoom && (next.zoomIn || next.zoomOut || next.zoomReset);
  return next;
};

export const runFileViewerBeforeOperation = async <
  Context extends FileViewerOperationContext,
>({
  context,
  options,
  onBefore,
  onCancel,
  onError,
}: RunFileViewerBeforeOperationInput<Context>) => {
  onBefore?.(context);

  try {
    if (!isFileViewerToolbarOperationPermitted(options?.toolbar, context.operation)) {
      onCancel?.(context);
      return false;
    }

    for (const hook of getFileViewerBeforeOperationHooks(options, context.operation)) {
      if (!hook) {
        continue;
      }
      const result = await hook(context);
      if (result === false) {
        onCancel?.(context);
        return false;
      }
    }
  } catch (error) {
    onError?.(error, context);
    onCancel?.(context);
    return false;
  }

  return true;
};

export const serializeFileViewerContext = <
  Context extends FileViewerLifecycleContext | FileViewerOperationContext,
>(
  context: Context
): SerializedFileViewerContext<Context> => {
  const { file: _file, ...serializable } = context;

  return {
    ...serializable,
    hasFile: !!context.file,
  } as SerializedFileViewerContext<Context>;
};

export const dispatchFileViewerLifecycleEvent = <
  Context extends FileViewerLifecycleContext,
>({
  context,
  hooks,
  onChange,
  onError,
}: DispatchFileViewerLifecycleEventInput<Context>) => {
  onChange?.(context.phase, context);
  void runFileViewerLifecycleHook(context, hooks, onError);
  return true;
};

export const dispatchFileViewerOperationContextEvent = <
  Context extends FileViewerOperationContext,
>({
  context,
  onChange,
}: DispatchFileViewerOperationContextEventInput<Context>) => {
  onChange?.(context);
  return true;
};

export const createFileViewerLifecycleActions = <
  OperationContext extends FileViewerOperationContext = FileViewerOperationContext,
>({
  lifecycleState,
  getOptions = () => undefined,
  onLifecycleChange,
  onLifecycleError,
  onOperationBefore,
  onOperationCancel,
  onOperationError,
}: CreateFileViewerLifecycleActionsInput<OperationContext>): FileViewerLifecycleActions<OperationContext> => {
  const notifyLifecycle = (context: FileViewerLifecycleContext) => {
    return dispatchFileViewerLifecycleEvent({
      context,
      hooks: getOptions()?.hooks,
      onChange: onLifecycleChange,
      onError: onLifecycleError,
    });
  };

  return {
    notifyLifecycle,
    notifyActiveUnloadStart(reason = 'replace') {
      return runFileViewerActiveUnloadStart({
        lifecycleState,
        reason,
        onLifecycle: notifyLifecycle,
      }).context;
    },
    notifyActiveUnloadComplete(context, reason = 'replace') {
      return runFileViewerActiveUnloadComplete({
        lifecycleState,
        context,
        reason,
        onLifecycle: notifyLifecycle,
      });
    },
    runBeforeOperation(context) {
      return runFileViewerBeforeOperation({
        context,
        options: getOptions(),
        onBefore: nextContext => {
          dispatchFileViewerOperationContextEvent({
            event: 'operation-before',
            context: nextContext,
            onChange: onOperationBefore,
          });
        },
        onCancel: nextContext => {
          dispatchFileViewerOperationContextEvent({
            event: 'operation-cancel',
            context: nextContext,
            onChange: onOperationCancel,
          });
        },
        onError: onOperationError,
      });
    },
  };
};

export const dispatchFileViewerOperationAvailabilityChange = ({
  availability,
  onChange,
}: DispatchFileViewerOperationAvailabilityChangeInput) => {
  const payload = cloneFileViewerOperationAvailability(availability);
  onChange?.(payload);
  return true;
};

export const dispatchFileViewerZoomChange = ({
  state,
  onChange,
}: DispatchFileViewerZoomChangeInput) => {
  onChange?.(state);
  return true;
};

export const createFileViewerToolbarActions = ({
  getOperationAvailability,
  getToolbarDisabled = () => false,
  getZoomState,
  onOperationAvailabilityChange,
  onZoomChange,
}: CreateFileViewerToolbarActionsInput): FileViewerToolbarActions => {
  return {
    notifyOperationAvailabilityChange(availability = getOperationAvailability()) {
      return dispatchFileViewerOperationAvailabilityChange({
        availability,
        onChange: onOperationAvailabilityChange,
      });
    },
    notifyZoomChange(state = getZoomState()) {
      return dispatchFileViewerZoomChange({
        state,
        onChange: onZoomChange,
      });
    },
    isZoomButtonDisabled(action) {
      return isFileViewerZoomButtonDisabled({
        action,
        availability: getOperationAvailability(),
        toolbarDisabled: getToolbarDisabled(),
        zoomState: getZoomState(),
      });
    },
  };
};

export const createFileViewerPublicApi = ({
  getOperationAvailability,
  ...api
}: CreateFileViewerPublicApiInput): FileViewerPublicApi => {
  return {
    ...api,
    getOperationAvailability: () => cloneFileViewerOperationAvailability(getOperationAvailability()),
  };
};

export const createFileViewerToolbarZoomSyncSnapshot = (
  state: FileViewerZoomState
): FileViewerToolbarZoomSyncSnapshot => [
  state.scale,
  state.label,
  state.canZoomIn,
  state.canZoomOut,
  state.canReset,
];

export const runFileViewerToolbarAvailabilitySync = ({
  toolbarActions,
  availability,
}: RunFileViewerToolbarAvailabilitySyncInput) => {
  return toolbarActions.notifyOperationAvailabilityChange(availability);
};

export const runFileViewerToolbarZoomSync = ({
  toolbarActions,
  state,
}: RunFileViewerToolbarZoomSyncInput) => {
  return toolbarActions.notifyZoomChange(state);
};

export const createFileViewerToolbarControllerActionHandlers = ({
  getAdapter = () => null,
  getBuffer = () => null,
  getExtension,
  getFile = () => null,
  getHasError = () => false,
  getLoading = () => false,
  getOptions,
  getSearchAvailable = () => true,
  getSourceUrl = () => null,
  getToolbar,
  getRenderedReady,
  getZoomState,
  zoomSyncState,
  onOperationAvailabilityChange,
  onZoomChange,
}: CreateFileViewerToolbarControllerActionHandlersInput): FileViewerToolbarControllerActionHandlers => {
  let currentToolbarState: FileViewerToolbarState | null = null;

  const resolveToolbarState = () => {
    currentToolbarState = resolveFileViewerToolbarState({
      extension: getExtension(),
      source: createFileViewerOriginalSourceState({
        buffer: getBuffer() ?? null,
        file: getFile() ?? null,
        url: getSourceUrl() ?? null,
      }),
      renderedReady: getRenderedReady(),
      hasError: getHasError(),
      adapter: getAdapter() ?? null,
      zoomState: getZoomState(),
      toolbar: getToolbar(),
      options: getOptions?.(),
      searchAvailable: getSearchAvailable(),
      loading: getLoading(),
    });
    return currentToolbarState;
  };

  const getResolvedToolbarState = () => currentToolbarState ?? resolveToolbarState();

  const toolbarActions = createFileViewerToolbarActions({
    getOperationAvailability: () => getResolvedToolbarState().operationAvailability,
    getToolbarDisabled: () => getResolvedToolbarState().toolbarDisabled,
    getZoomState,
    onOperationAvailabilityChange,
    onZoomChange,
  });

  return {
    resolveToolbarState,
    createZoomSyncSnapshot: () => createFileViewerToolbarZoomSyncSnapshot(zoomSyncState ?? getZoomState()),
    syncOperationAvailability: availability => runFileViewerToolbarAvailabilitySync({
      toolbarActions,
      availability,
    }),
    syncZoomChange: state => runFileViewerToolbarZoomSync({
      toolbarActions,
      state,
    }),
    isZoomButtonDisabled: toolbarActions.isZoomButtonDisabled,
  };
};

export const normalizeFileViewerToolbar = (
  options: Pick<FileViewerOptions, 'toolbar'> | undefined
): FileViewerToolbarOptions => {
  const toolbar = options?.toolbar;
  if (toolbar === false) {
    return {
      download: false,
      print: false,
      exportHtml: false,
      zoom: false,
      search: false,
      theme: false,
      order: resolveFileViewerToolbarOrder(undefined),
    };
  }
  if (toolbar && typeof toolbar === 'object') {
    return {
      download: toolbar.download !== false && isFileViewerToolbarOperationVisible(toolbar, 'download'),
      print: toolbar.print !== false && isFileViewerToolbarOperationVisible(toolbar, 'print'),
      exportHtml: toolbar.exportHtml !== false && isFileViewerToolbarOperationVisible(toolbar, 'export-html'),
      zoom: toolbar.zoom !== false && hasAnyToolbarZoomOperation(toolbar),
      search: toolbar.search !== false,
      theme: toolbar.theme !== false,
      order: resolveFileViewerToolbarOrder(toolbar),
      items: toolbar.items,
      permissions: toolbar.permissions,
      position: toolbar.position,
      beforeOperation: toolbar.beforeOperation,
      beforeDownload: toolbar.beforeDownload,
      beforePrint: toolbar.beforePrint,
      beforeExportHtml: toolbar.beforeExportHtml,
    };
  }
  return {
    download: true,
    print: true,
    exportHtml: true,
    zoom: true,
    search: true,
    theme: true,
    order: resolveFileViewerToolbarOrder(undefined),
  };
};

export const resolveFileViewerOperationAvailability = ({
  extension,
  hasOriginalSource,
  renderedReady,
  hasError = false,
  adapter,
  source,
  zoomState,
}: ResolveFileViewerOperationAvailabilityInput): FileViewerOperationAvailability => {
  const hasRenderableOutput = renderedReady && !hasError;
  const hasSource = hasOriginalSource ?? (source ? hasFileViewerOriginalSource(source) : false);
  const zoomEnabled = hasRenderableOutput && (zoomState.canZoomIn || zoomState.canZoomOut || zoomState.canReset);

  return {
    download: hasSource,
    print: hasRenderableOutput && resolvePrintAvailability(extension, adapter ?? null, renderedReady),
    exportHtml: hasRenderableOutput && adapter?.exportHtml !== false,
    zoom: zoomEnabled,
    zoomIn: zoomEnabled && zoomState.canZoomIn,
    zoomOut: zoomEnabled && zoomState.canZoomOut,
    zoomReset: zoomEnabled && zoomState.canReset,
  };
};

export const cloneFileViewerOperationAvailability = (
  availability: FileViewerOperationAvailability
): FileViewerOperationAvailability => ({
  download: availability.download,
  print: availability.print,
  exportHtml: availability.exportHtml,
  zoom: availability.zoom,
  zoomIn: availability.zoomIn,
  zoomOut: availability.zoomOut,
  zoomReset: availability.zoomReset,
});

export const resolveVisibleFileViewerToolbar = (
  toolbar: FileViewerToolbarOptions,
  availability: FileViewerOperationAvailability,
  searchEnabled = true
): FileViewerToolbarOptions => {
  return {
    download: toolbar.download && availability.download,
    print: toolbar.print && availability.print,
    exportHtml: toolbar.exportHtml && availability.exportHtml,
    zoom: toolbar.zoom && availability.zoom,
    search: toolbar.search !== false && searchEnabled,
    theme: toolbar.theme !== false,
  };
};

export const hasVisibleFileViewerToolbarActions = (toolbar: FileViewerToolbarOptions) => {
  return !!(
    toolbar.download ||
    toolbar.print ||
    toolbar.exportHtml ||
    toolbar.zoom ||
    toolbar.search ||
    toolbar.theme
  );
};

/** Button presence follows UI policy; current operation state only disables it. */
export const resolveFileViewerToolbarZoomButtons = ({
  toolbar,
  zoomState,
  renderedReady,
  hasError = false,
}: Pick<ResolveFileViewerToolbarStateInput, 'toolbar' | 'zoomState' | 'renderedReady' | 'hasError'>): Pick<FileViewerOperationAvailability, 'zoomIn' | 'zoomOut' | 'zoomReset'> => {
  const visible = !!toolbar.zoom && renderedReady && !hasError &&
    (zoomState.canZoomIn || zoomState.canZoomOut || zoomState.canReset);
  return {
    zoomIn: visible && isFileViewerToolbarOperationVisible(toolbar, 'zoom-in'),
    zoomOut: visible && isFileViewerToolbarOperationVisible(toolbar, 'zoom-out'),
    zoomReset: visible && isFileViewerToolbarOperationVisible(toolbar, 'zoom-reset'),
  };
};

export const isFileViewerZoomButtonDisabled = ({
  toolbarDisabled = false,
  availability,
  zoomState,
  action,
}: {
  toolbarDisabled?: boolean;
  availability: FileViewerOperationAvailability;
  zoomState: FileViewerZoomState;
  action: keyof Pick<FileViewerZoomState, 'canZoomIn' | 'canZoomOut' | 'canReset'>;
}) => {
  const operation = FILE_VIEWER_ZOOM_BUTTON_OPERATIONS[action];
  const operationAllowed = operation === 'zoom-in'
    ? availability.zoomIn
    : operation === 'zoom-out'
      ? availability.zoomOut
      : availability.zoomReset;
  return toolbarDisabled || !availability.zoom || !operationAllowed || !zoomState[action];
};

export const isFileViewerToolbarDisabled = ({
  loading = false,
  hasError = false,
}: {
  loading?: boolean;
  hasError?: boolean;
}) => {
  return !!(loading || hasError);
};

export const resolveFileViewerToolbarState = ({
  toolbar,
  options,
  searchAvailable = true,
  loading = false,
  ...availabilityInput
}: ResolveFileViewerToolbarStateInput): FileViewerToolbarState => {
  const operationAvailability = applyToolbarPermissionsToAvailability(
    resolveFileViewerOperationAvailability(availabilityInput),
    options?.toolbar
  );
  const visibleToolbar = resolveVisibleFileViewerToolbar(
    toolbar,
    operationAvailability,
    options?.search !== false && searchAvailable
  );
  const zoomButtons = resolveFileViewerToolbarZoomButtons({ toolbar, ...availabilityInput });
  visibleToolbar.zoom = zoomButtons.zoomIn || zoomButtons.zoomOut || zoomButtons.zoomReset;

  return {
    operationAvailability,
    visibleToolbar,
    toolbarOrder: resolveFileViewerToolbarOrder(toolbar),
    showToolbar: hasVisibleFileViewerToolbarActions(visibleToolbar),
    toolbarPosition: resolveFileViewerToolbarPosition(options, availabilityInput.extension),
    toolbarDisabled: isFileViewerToolbarDisabled({
      loading,
      hasError: availabilityInput.hasError,
    }),
  };
};

export const resolveFileViewerToolbarPosition = (
  options: Pick<FileViewerOptions, 'toolbar'> | undefined,
  extension: string
): FileViewerToolbarPosition => {
  const toolbar = options?.toolbar;
  const position = toolbar && typeof toolbar === 'object' ? toolbar.position : 'auto';
  if (position === 'top' || position === 'top-center' || position === 'bottom-right') {
    return position;
  }
  return extension === 'pdf' ? 'bottom-right' : 'top';
};
