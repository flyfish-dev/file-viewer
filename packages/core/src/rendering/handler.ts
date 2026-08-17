// Rendering orchestration layer.
//
// This module adapts registry entries into disposable renderer sessions. It is
// the only place that should bridge raw buffers, DOM targets, render contexts,
// export adapters, and readiness state.
import { DEFAULT_RENDERER_DEFINITIONS } from '../registry/formats';
import { waitForFileViewerNextPaint } from '../output/export';
import { createFileViewerRendererDispatcher } from './dispatcher';
import { resolveFileViewerRendererRedirectId } from './dispatcher';
import type { FileViewerRendererDispatcher } from './dispatcher';
import { createRendererRegistry } from '../registry/registry';
import { getExtension, normalizeFileExtension } from '../source';
import {
  applyFileViewerRenderReadinessState,
  type FileViewerMutableAccessor,
  type MutableFileViewerRenderReadinessState,
} from '../source/loading';
import { findFileViewerViewStateProvider } from '../features/document/dom';
import { registerFileViewerGenericViewStateProvider } from '../features/document/viewState';
import type {
  FileRenderExportAdapter,
  FileRenderThumbnailAdapter,
  FileRenderContext,
  FileRenderHandler,
  FileViewerLifecycleContext,
  FileViewerOptions,
  FileViewerStyleIsolation,
  RenderSurface,
  RendererDefinition,
  RendererLoadContext,
  RendererLoader,
  RendererRegistry,
  RendererSession,
} from '../contracts/types';

export const FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_MESSAGE = '预览内容卸载失败';

export interface ResolveFileViewerRenderSessionDisposeErrorMessageInput {
  message?: string;
}

export type FileViewerRenderSessionDisposeErrorLogger = (message: string, error: unknown) => void;

export interface ReportFileViewerRenderSessionDisposeErrorInput
  extends ResolveFileViewerRenderSessionDisposeErrorMessageInput {
  error: unknown;
  onLogError?: FileViewerRenderSessionDisposeErrorLogger | null;
}

export interface RenderFileViewerHandlerInput<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> {
  dispatcher: Pick<FileViewerRendererDispatcher<FileRenderHandler<Rendered, Target>>, 'resolve' | 'handlersByRendererId'>;
  buffer: ArrayBuffer;
  target: Target;
  type?: string;
  context?: FileRenderContext;
  throwOnMissingHandler?: boolean;
}

export interface CreateFileRenderHandlerLoaderOptions<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> {
  handler: FileRenderHandler<Rendered, Target>;
  rendererId?: string;
  getTarget?: (context: RendererLoadContext) => Target;
  createContext?: (context: RendererLoadContext) => FileRenderContext;
  destroy?: (rendered: Rendered, context: RendererLoadContext) => void | Promise<void>;
}

export interface FileRenderHandlerRendererSession<Rendered = unknown> extends RendererSession {
  rendered: Rendered;
}

export interface DisposeFileViewerRendererSessionOptions {
  onError?: (error: unknown) => void;
}

export interface FileViewerRenderSurfaceState<
  Session extends RendererSession = RendererSession,
> {
  session: Session | null;
  exportAdapter: FileRenderExportAdapter | null;
  thumbnailAdapter: FileRenderThumbnailAdapter | null;
}

export type MutableFileViewerRenderSurfaceState<
  Session extends RendererSession = RendererSession,
> = FileViewerRenderSurfaceState<Session>;

export interface CreateFileViewerRenderReadinessTargetInput {
  renderedReady: FileViewerMutableAccessor<boolean>;
  progressiveReady: FileViewerMutableAccessor<boolean>;
}

export interface CreateFileViewerRenderSurfaceStateTargetInput<
  Session extends RendererSession = RendererSession,
> {
  session: FileViewerMutableAccessor<Session | null>;
  exportAdapter: FileViewerMutableAccessor<FileRenderExportAdapter | null>;
  thumbnailAdapter?: FileViewerMutableAccessor<FileRenderThumbnailAdapter | null>;
}

export interface CreateFileViewerRenderTargetOptions {
  className?: string;
}

export type ResolvedFileViewerStyleIsolation = Exclude<FileViewerStyleIsolation, 'auto'>;

export interface CreateFileViewerRenderSurfaceOptions extends CreateFileViewerRenderTargetOptions {
  styleIsolation?: FileViewerStyleIsolation;
}

export interface FileViewerStyleHandle {
  node?: HTMLStyleElement;
  sheet?: CSSStyleSheet;
  remove(): void;
}

export interface AppendFileViewerStyleOptions {
  /**
   * Constructable stylesheets are useful for long-lived ShadowRoots. Keep this
   * opt-in so renderer styles still clean up naturally with their target node.
   */
  adoptedStyleSheet?: boolean;
}

export interface ResetFileViewerRenderSurfaceInput<
  Session extends RendererSession = RendererSession,
> {
  surfaceState: MutableFileViewerRenderSurfaceState<Session>;
  readinessState: MutableFileViewerRenderReadinessState;
  container?: HTMLElement | null;
  disposeOptions?: DisposeFileViewerRendererSessionOptions;
}

export interface FileViewerRenderSurfaceMountContext<
  Session extends RendererSession = RendererSession,
> {
  buffer: ArrayBuffer;
  file: File;
  version: number;
  type: string;
  target: HTMLElement;
  filename: string;
  sourceUrl?: string;
  streamUrl?: string;
  onProgressiveRender: () => void;
  registerExportAdapter: (adapter: FileRenderExportAdapter | null) => void;
  surfaceState: MutableFileViewerRenderSurfaceState<Session>;
  readinessState: MutableFileViewerRenderReadinessState;
}

export interface RunFileViewerRenderSurfaceMountInput<
  Session extends RendererSession = RendererSession,
> {
  buffer: ArrayBuffer;
  file: File;
  version: number;
  sourceUrl?: string;
  streamUrl?: string;
  getContainer: () => HTMLElement | null | undefined;
  surfaceState: MutableFileViewerRenderSurfaceState<Session>;
  readinessState: MutableFileViewerRenderReadinessState;
  isCurrent: (version: number) => boolean;
  clearRenderedContent: (reason?: FileViewerLifecycleContext['reason']) => void;
  render: (context: FileViewerRenderSurfaceMountContext<Session>) => Promise<Session | undefined>;
  waitForContainer?: () => Promise<unknown> | unknown;
  waitForPaint?: () => Promise<unknown> | unknown;
  disposeSession?: (session?: Session | null) => void;
  onStartZoomObserver?: () => void;
  onStartFitObserver?: () => void;
  onStartViewStateObserver?: () => void;
  onApplyInitialFit?: () => Promise<unknown> | unknown;
  onRefreshDocumentIndex?: () => Promise<unknown> | unknown;
  onRefreshZoomProvider?: () => void;
  onRefreshViewStateProvider?: () => void;
}

export interface RunFileViewerRenderSurfaceClearInput<
  Session extends RendererSession = RendererSession,
  UnloadContext = FileViewerLifecycleContext | null,
> {
  reason?: FileViewerLifecycleContext['reason'];
  surfaceState: MutableFileViewerRenderSurfaceState<Session>;
  readinessState: MutableFileViewerRenderReadinessState;
  container?: HTMLElement | null;
  disposeOptions?: DisposeFileViewerRendererSessionOptions;
  onUnloadStart?: (reason: FileViewerLifecycleContext['reason']) => UnloadContext;
  onUnloadComplete?: (
    context: UnloadContext | undefined,
    reason: FileViewerLifecycleContext['reason']
  ) => void;
  onClearActiveDocumentContext?: () => void;
  onClearDocumentState?: () => void;
  onStopZoomObserver?: () => void;
  onClearZoomProvider?: () => void;
  onStopFitObserver?: () => void;
  onStopViewStateObserver?: () => void;
  onClearViewStateProvider?: () => void;
}

export interface FileViewerRenderSurfaceClearState<
  Session extends RendererSession = RendererSession,
  UnloadContext = FileViewerLifecycleContext | null,
> {
  reason: FileViewerLifecycleContext['reason'];
  unloadContext: UnloadContext | undefined;
  session: Session | null | undefined;
}

export interface FileViewerRenderSurfaceActionHandlers<
  Session extends RendererSession = RendererSession,
  UnloadContext = FileViewerLifecycleContext | null,
> {
  destroyRenderSession: (session?: Session | null) => void;
  setActiveRenderSession: (
    session: Session | null
  ) => MutableFileViewerRenderSurfaceState<Session>;
  clearRenderedContent: (
    reason?: FileViewerLifecycleContext['reason']
  ) => FileViewerRenderSurfaceClearState<Session, UnloadContext>;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string
  ) => Promise<Session | undefined>;
}

export interface CreateFileViewerRenderSurfaceActionHandlersInput<
  Session extends RendererSession = RendererSession,
  UnloadContext = FileViewerLifecycleContext | null,
> {
  getContainer: () => HTMLElement | null | undefined;
  surfaceState: MutableFileViewerRenderSurfaceState<Session>;
  readinessState: MutableFileViewerRenderReadinessState;
  isCurrent: (version: number) => boolean;
  render: (context: FileViewerRenderSurfaceMountContext<Session>) => Promise<Session | undefined>;
  waitForContainer?: () => Promise<unknown> | unknown;
  waitForPaint?: () => Promise<unknown> | unknown;
  disposeOptions?: DisposeFileViewerRendererSessionOptions;
  onUnloadStart?: (reason: FileViewerLifecycleContext['reason']) => UnloadContext;
  onUnloadComplete?: (
    context: UnloadContext | undefined,
    reason: FileViewerLifecycleContext['reason']
  ) => void;
  onClearActiveDocumentContext?: () => void;
  onClearDocumentState?: () => void;
  onStartZoomObserver?: () => void;
  onStopZoomObserver?: () => void;
  onClearZoomProvider?: () => void;
  onStartFitObserver?: () => void;
  onStopFitObserver?: () => void;
  onStartViewStateObserver?: () => void;
  onStopViewStateObserver?: () => void;
  onClearViewStateProvider?: () => void;
  onApplyInitialFit?: () => Promise<unknown> | unknown;
  onRefreshDocumentIndex?: () => Promise<unknown> | unknown;
  onRefreshZoomProvider?: () => void;
  onRefreshViewStateProvider?: () => void;
}

export const DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS = 'file-render';
export const FILE_VIEWER_RENDER_SURFACE_BACKGROUND_PROPERTY = '--file-viewer-render-surface-background';

const FILE_VIEWER_RENDER_HOST_CLASS = 'file-render-host';
const FILE_VIEWER_SHADOW_RENDER_TARGET_CLASS = 'file-render-shadow-target';

export const normalizeFileViewerRenderSurfaceBackground = (
  value: unknown
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized && normalized.toLowerCase() !== 'auto' ? normalized : null;
};

/**
 * Keeps the public UI option and the renderer-facing CSS custom property in
 * sync. Custom properties inherit through Shadow DOM, so setting this on the
 * render host covers both scoped and shadow-isolated renderer targets.
 */
export const syncFileViewerRenderSurfaceBackground = (
  target: HTMLElement | null | undefined,
  options?: Pick<FileViewerOptions, 'ui'> | null
) => {
  if (!target) {
    return null;
  }
  const background = normalizeFileViewerRenderSurfaceBackground(
    options?.ui?.surfaceBackground
  );
  if (background) {
    target.style.setProperty(FILE_VIEWER_RENDER_SURFACE_BACKGROUND_PROPERTY, background);
  } else {
    target.style.removeProperty(FILE_VIEWER_RENDER_SURFACE_BACKGROUND_PROPERTY);
  }
  return background;
};

export const isFileViewerShadowRoot = (value: unknown): value is ShadowRoot => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (typeof ShadowRoot !== 'undefined' && value instanceof ShadowRoot) {
    return true;
  }
  return (value as { nodeType?: number; host?: unknown }).nodeType === 11 &&
    !!(value as { host?: unknown }).host;
};

const getElementRootNode = (element: HTMLElement | null | undefined) => {
  return element?.getRootNode?.() || null;
};

export const getFileViewerShadowRootForNode = (
  node: Node | null | undefined
): ShadowRoot | null => {
  if (!node) {
    return null;
  }
  if (isFileViewerShadowRoot(node)) {
    return node;
  }
  const root = node.getRootNode?.();
  return isFileViewerShadowRoot(root) ? root : null;
};

export const normalizeFileViewerStyleIsolation = (
  isolation?: FileViewerStyleIsolation
): FileViewerStyleIsolation => {
  return isolation === 'shadow' || isolation === 'scoped' || isolation === 'none'
    ? isolation
    : 'auto';
};

export const resolveFileViewerStyleIsolation = (
  options: Pick<FileViewerOptions, 'styleIsolation'> | undefined,
  container?: HTMLElement | null
): ResolvedFileViewerStyleIsolation => {
  const isolation = normalizeFileViewerStyleIsolation(options?.styleIsolation);
  if (isolation === 'auto') {
    return isFileViewerShadowRoot(getElementRootNode(container)) ? 'scoped' : 'none';
  }
  if (isolation === 'shadow' && isFileViewerShadowRoot(getElementRootNode(container))) {
    return 'scoped';
  }
  return isolation;
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  return !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function';
};

export const clearFileViewerRenderSurface = (container?: HTMLElement | null) => {
  if (!container) {
    return;
  }

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

export const createFileViewerRenderTarget = (
  container: HTMLElement,
  options: CreateFileViewerRenderTargetOptions = {}
) => {
  const target = container.ownerDocument.createElement('div');
  target.className = options.className || DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS;
  target.style.width = '100%';
  target.style.minWidth = '0';
  target.style.minHeight = '0';
  container.appendChild(target);
  return target;
};

export const createFileViewerRenderSurface = (
  container: HTMLElement,
  options: CreateFileViewerRenderSurfaceOptions = {}
): RenderSurface => {
  const styleIsolation = resolveFileViewerStyleIsolation({
    styleIsolation: options.styleIsolation,
  }, container);
  const className = options.className || DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS;

  if (styleIsolation === 'shadow' && typeof container.attachShadow === 'function') {
    const host = container.ownerDocument.createElement('div');
    host.className = `${FILE_VIEWER_RENDER_HOST_CLASS} ${className}`;
    host.dataset.fileViewerStyleIsolation = 'shadow';
    host.style.width = '100%';
    host.style.minWidth = '0';
    host.style.minHeight = '0';
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const target = container.ownerDocument.createElement('div');
    target.className = `${FILE_VIEWER_SHADOW_RENDER_TARGET_CLASS} ${className}`;
    target.dataset.fileViewerStyleIsolation = 'shadow';
    target.style.width = '100%';
    target.style.minWidth = '0';
    target.style.minHeight = '0';
    shadowRoot.appendChild(target);
    container.appendChild(host);
    return {
      host,
      container: target,
      shadowRoot,
      styleIsolation,
    };
  }

  const target = createFileViewerRenderTarget(container, { className });
  target.dataset.fileViewerStyleIsolation = styleIsolation;
  return {
    host: target,
    container: target,
    styleIsolation,
  };
};

const appendStyleElement = (
  target: HTMLElement | ShadowRoot,
  css: string
): HTMLStyleElement => {
  const documentRef = target.ownerDocument;
  const style = documentRef.createElement('style');
  style.textContent = css;
  target.appendChild(style);
  return style;
};

const getConstructableStyleSheet = (
  root: ShadowRoot
): typeof CSSStyleSheet | null => {
  const constructor = root.ownerDocument.defaultView?.CSSStyleSheet ??
    (typeof CSSStyleSheet !== 'undefined' ? CSSStyleSheet : undefined);
  return 'adoptedStyleSheets' in root &&
    constructor &&
    typeof constructor.prototype.replaceSync === 'function'
    ? constructor
    : null;
};

export const appendFileViewerStyle = (
  target: HTMLElement | ShadowRoot,
  css: string,
  options: AppendFileViewerStyleOptions = {}
): FileViewerStyleHandle => {
  const shadowRoot = getFileViewerShadowRootForNode(target);
  const StyleSheet = shadowRoot ? getConstructableStyleSheet(shadowRoot) : null;
  if (options.adoptedStyleSheet && shadowRoot && StyleSheet) {
    // Use the target document's constructor. A stylesheet constructed in the
    // parent window cannot be adopted by a ShadowRoot owned by an iframe.
    const sheet = new StyleSheet();
    sheet.replaceSync(css);
    shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet];
    return {
      sheet,
      remove() {
        shadowRoot.adoptedStyleSheets = shadowRoot.adoptedStyleSheets.filter(item => item !== sheet);
      },
    };
  }

  const styleTarget = isFileViewerShadowRoot(target) ? target : target;
  const node = appendStyleElement(styleTarget, css);
  return {
    node,
    remove() {
      node.remove();
    },
  };
};

export const removeFileViewerRenderTarget = (
  container: HTMLElement,
  target: HTMLElement
) => {
  if (target.parentNode !== container) {
    return false;
  }

  container.removeChild(target);
  return true;
};

export const createFileViewerRenderSurfaceState = <
  Session extends RendererSession = RendererSession,
>(): FileViewerRenderSurfaceState<Session> => ({
  session: null,
  exportAdapter: null,
  thumbnailAdapter: null,
});

export const createFileViewerRenderReadinessTarget = ({
  renderedReady,
  progressiveReady,
}: CreateFileViewerRenderReadinessTargetInput): MutableFileViewerRenderReadinessState => {
  return {
    get renderedReady() {
      return renderedReady.get();
    },
    set renderedReady(value) {
      renderedReady.set(value);
    },
    get progressiveReady() {
      return progressiveReady.get();
    },
    set progressiveReady(value) {
      progressiveReady.set(value);
    },
  };
};

export const createFileViewerRenderSurfaceStateTarget = <
  Session extends RendererSession = RendererSession,
>({
  session,
  exportAdapter,
  thumbnailAdapter,
}: CreateFileViewerRenderSurfaceStateTargetInput<Session>): MutableFileViewerRenderSurfaceState<Session> => {
  let localThumbnailAdapter: FileRenderThumbnailAdapter | null = null;
  return {
    get session() {
      return session.get();
    },
    set session(value) {
      session.set(value);
    },
    get exportAdapter() {
      return exportAdapter.get();
    },
    set exportAdapter(value) {
      exportAdapter.set(value);
    },
    get thumbnailAdapter() {
      return thumbnailAdapter?.get() ?? localThumbnailAdapter;
    },
    set thumbnailAdapter(value) {
      localThumbnailAdapter = value;
      thumbnailAdapter?.set(value);
    },
  };
};

export const applyFileViewerRenderSurfaceState = <
  Session extends RendererSession,
  Target extends MutableFileViewerRenderSurfaceState<Session>,
>(
  target: Target,
  state: Partial<FileViewerRenderSurfaceState<Session>>
) => {
  if ('session' in state) {
    target.session = state.session ?? null;
  }
  if ('exportAdapter' in state) {
    target.exportAdapter = state.exportAdapter ?? null;
  }
  if ('thumbnailAdapter' in state) {
    target.thumbnailAdapter = state.thumbnailAdapter ?? null;
  }

  return target;
};

export const createFileRenderHandlerRendererSession = <Rendered = unknown>(
  rendered: Rendered,
  destroy?: () => void | Promise<void>
): FileRenderHandlerRendererSession<Rendered> => ({
  rendered,
  destroy: () => {
    if (destroy) {
      return destroy();
    }
    return disposeFileViewerRendered(rendered);
  },
});

export interface CreateFileRenderHandlerRegistryOptions<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> extends Omit<CreateFileRenderHandlerLoaderOptions<Rendered, Target>, 'handler'> {
  definitions?: readonly RendererDefinition[];
  handlers: Iterable<{
    rendererId: string;
    handler: FileRenderHandler<Rendered, Target>;
  }>;
}

export interface FileRenderHandlerRegistryResult<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> {
  registry: RendererRegistry;
  dispatcher: FileViewerRendererDispatcher<FileRenderHandler<Rendered, Target>>;
  missingRendererIds: string[];
}

export const disposeFileViewerRendered = (rendered?: unknown) => {
  if (!rendered || typeof rendered !== 'object') {
    return;
  }

  const disposable = rendered as {
    unmount?: () => void | Promise<void>;
    $destroy?: () => void | Promise<void>;
    destroy?: () => void | Promise<void>;
  };

  if (typeof disposable.unmount === 'function') {
    return disposable.unmount();
  }
  if (typeof disposable.$destroy === 'function') {
    return disposable.$destroy();
  }
  if (typeof disposable.destroy === 'function') {
    return disposable.destroy();
  }
};

export const resolveFileViewerRenderSessionDisposeErrorMessage = ({
  message = FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_MESSAGE,
}: ResolveFileViewerRenderSessionDisposeErrorMessageInput = {}) => message;

export const DEFAULT_FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_LOGGER: FileViewerRenderSessionDisposeErrorLogger = (
  message,
  error
) => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message, error);
  }
};

export const reportFileViewerRenderSessionDisposeError = ({
  error,
  onLogError = DEFAULT_FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_LOGGER,
  ...messageInput
}: ReportFileViewerRenderSessionDisposeErrorInput) => {
  const message = resolveFileViewerRenderSessionDisposeErrorMessage(messageInput);
  onLogError?.(message, error);
  return message;
};

export const disposeFileViewerRendererSession = (
  session?: RendererSession | null,
  options: DisposeFileViewerRendererSessionOptions = {}
) => {
  if (!session?.destroy) {
    return;
  }

  const handleError = (error: unknown) => {
    options.onError?.(error);
  };

  try {
    const result = session.destroy();
    if (isPromiseLike(result)) {
      void Promise.resolve(result).catch(handleError);
    }
  } catch (error) {
    handleError(error);
  }
};

export const disposeActiveFileViewerRendererSession = <
  Session extends RendererSession,
  Target extends MutableFileViewerRenderSurfaceState<Session>,
>(
  target: Target,
  options: DisposeFileViewerRendererSessionOptions = {}
) => {
  const session = target.session;

  try {
    disposeFileViewerRendererSession(session, options);
  } finally {
    target.session = null;
  }

  return session;
};

export const resetFileViewerRenderSurface = <
  Session extends RendererSession,
>({
  surfaceState,
  readinessState,
  container,
  disposeOptions,
}: ResetFileViewerRenderSurfaceInput<Session>) => {
  const session = disposeActiveFileViewerRendererSession(surfaceState, disposeOptions) as Session | null;
  applyFileViewerRenderSurfaceState(surfaceState, { exportAdapter: null, thumbnailAdapter: null });
  applyFileViewerRenderReadinessState(readinessState, {
    renderedReady: false,
    progressiveReady: false,
  });
  clearFileViewerRenderSurface(container);
  return session;
};

export const runFileViewerRenderSurfaceClear = <
  Session extends RendererSession,
  UnloadContext = FileViewerLifecycleContext | null,
>({
  reason = 'replace',
  surfaceState,
  readinessState,
  container,
  disposeOptions,
  onUnloadStart,
  onUnloadComplete,
  onClearActiveDocumentContext,
  onClearDocumentState,
  onStopZoomObserver,
  onClearZoomProvider,
  onStopFitObserver,
  onStopViewStateObserver,
  onClearViewStateProvider,
}: RunFileViewerRenderSurfaceClearInput<Session, UnloadContext>): FileViewerRenderSurfaceClearState<Session, UnloadContext> => {
  const unloadContext = onUnloadStart?.(reason);
  let session: Session | null | undefined;

  try {
    session = resetFileViewerRenderSurface<Session>({
      surfaceState,
      readinessState,
      container,
      disposeOptions,
    });
  } finally {
    onClearActiveDocumentContext?.();
    onClearDocumentState?.();
    onStopZoomObserver?.();
    onClearZoomProvider?.();
    onStopFitObserver?.();
    onStopViewStateObserver?.();
    onClearViewStateProvider?.();
  }

  onUnloadComplete?.(unloadContext, reason);

  return {
    reason,
    unloadContext,
    session,
  };
};

export const runFileViewerRenderSurfaceMount = async <
  Session extends RendererSession,
>({
  buffer,
  file,
  version,
  sourceUrl,
  streamUrl,
  getContainer,
  surfaceState,
  readinessState,
  isCurrent,
  clearRenderedContent,
  render,
  waitForContainer,
  waitForPaint = waitForFileViewerNextPaint,
  disposeSession = disposeFileViewerRendererSession,
  onStartZoomObserver,
  onStartFitObserver,
  onStartViewStateObserver,
  onApplyInitialFit,
  onRefreshDocumentIndex,
  onRefreshZoomProvider,
  onRefreshViewStateProvider,
}: RunFileViewerRenderSurfaceMountInput<Session>): Promise<Session | undefined> => {
  if (!getContainer()) {
    await waitForContainer?.();
  }

  const container = getContainer();
  if (!container || !isCurrent(version)) {
    return undefined;
  }

  clearRenderedContent('replace');

  const target = createFileViewerRenderTarget(container);
  onStartZoomObserver?.();
  onStartFitObserver?.();
  onStartViewStateObserver?.();
  await waitForContainer?.();
  await waitForPaint();

  if (!isCurrent(version)) {
    removeFileViewerRenderTarget(container, target);
    return undefined;
  }

  const registerExportAdapter = (adapter: FileRenderExportAdapter | null) => {
    applyFileViewerRenderSurfaceState(surfaceState, { exportAdapter: adapter });
  };

  const onProgressiveRender = () => {
    if (isCurrent(version)) {
      applyFileViewerRenderReadinessState(readinessState, { progressiveReady: true });
    }
  };

  try {
    const session = await render({
      buffer,
      file,
      version,
      type: getExtension(file.name),
      target,
      filename: file.name,
      sourceUrl,
      streamUrl,
      onProgressiveRender,
      registerExportAdapter,
      surfaceState,
      readinessState,
    });

    if (!isCurrent(version)) {
      disposeSession(session);
      removeFileViewerRenderTarget(container, target);
      return undefined;
    }

    void onRefreshDocumentIndex?.();
    onRefreshZoomProvider?.();
    onRefreshViewStateProvider?.();
    if (onApplyInitialFit) {
      await onApplyInitialFit();
      onRefreshZoomProvider?.();
      onRefreshViewStateProvider?.();
    }
    return session;
  } catch (error) {
    removeFileViewerRenderTarget(container, target);
    throw error;
  }
};

export const createFileViewerRenderSurfaceActionHandlers = <
  Session extends RendererSession,
  UnloadContext = FileViewerLifecycleContext | null,
>({
  getContainer,
  surfaceState,
  readinessState,
  isCurrent,
  render,
  waitForContainer,
  waitForPaint,
  disposeOptions,
  onUnloadStart,
  onUnloadComplete,
  onClearActiveDocumentContext,
  onClearDocumentState,
  onStartZoomObserver,
  onStopZoomObserver,
  onClearZoomProvider,
  onStartFitObserver,
  onStopFitObserver,
  onStartViewStateObserver,
  onStopViewStateObserver,
  onClearViewStateProvider,
  onApplyInitialFit,
  onRefreshDocumentIndex,
  onRefreshZoomProvider,
  onRefreshViewStateProvider,
}: CreateFileViewerRenderSurfaceActionHandlersInput<Session, UnloadContext>): FileViewerRenderSurfaceActionHandlers<Session, UnloadContext> => {
  const handleDisposeError = (error: unknown) => {
    if (disposeOptions?.onError) {
      disposeOptions.onError(error);
      return;
    }
    reportFileViewerRenderSessionDisposeError({ error });
  };

  const mergedDisposeOptions: DisposeFileViewerRendererSessionOptions = {
    ...disposeOptions,
    onError: handleDisposeError,
  };

  const destroyRenderSession = (session?: Session | null) => {
    disposeFileViewerRendererSession(session, mergedDisposeOptions);
  };

  const setActiveRenderSession = (session: Session | null) => {
    return applyFileViewerRenderSurfaceState(surfaceState, { session });
  };

  const clearRenderedContent = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    return runFileViewerRenderSurfaceClear<Session, UnloadContext>({
      reason,
      surfaceState,
      readinessState,
      container: getContainer(),
      disposeOptions: mergedDisposeOptions,
      onUnloadStart,
      onUnloadComplete,
      onClearActiveDocumentContext,
      onClearDocumentState,
      onStopZoomObserver,
      onClearZoomProvider,
      onStopFitObserver,
      onStopViewStateObserver,
      onClearViewStateProvider,
    });
  };

  const mountRenderedContent = async (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string
  ) => {
    return await runFileViewerRenderSurfaceMount<Session>({
      buffer,
      file,
      version,
      sourceUrl,
      streamUrl,
      getContainer,
      surfaceState,
      readinessState,
      isCurrent,
      clearRenderedContent,
      render,
      waitForContainer,
      waitForPaint,
      disposeSession: destroyRenderSession,
      onStartZoomObserver,
      onStartFitObserver,
      onStartViewStateObserver,
      onApplyInitialFit,
      onRefreshDocumentIndex,
      onRefreshZoomProvider,
      onRefreshViewStateProvider,
    });
  };

  return {
    destroyRenderSession,
    setActiveRenderSession,
    clearRenderedContent,
    mountRenderedContent,
  };
};

export const buildFileRenderContextFromLoadContext = ({
  source,
  surface,
  options,
  signal,
  registerExportAdapter,
  registerThumbnailAdapter,
  renderContext,
}: RendererLoadContext): FileRenderContext => ({
  filename: source.filename,
  url: source.url,
  streamUrl: source.url,
  signal,
  options,
  surface,
  registerExportAdapter,
  registerThumbnailAdapter,
  ...renderContext,
});

export const renderFileViewerHandler = async <
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
>({
  dispatcher,
  buffer,
  target,
  type = '',
  context,
  throwOnMissingHandler = false,
}: RenderFileViewerHandlerInput<Rendered, Target>) => {
  const normalizedType = normalizeFileExtension(type);
  const handler = dispatcher.resolve(normalizedType);

  if (!handler) {
    if (throwOnMissingHandler) {
      throw new Error(`No file viewer renderer is registered for "${normalizedType}".`);
    }
    return undefined;
  }

  try {
    return await handler(buffer, target, normalizedType, context);
  } catch (error) {
    const redirectedRendererId = resolveFileViewerRendererRedirectId(error);
    const redirectedHandler = redirectedRendererId
      ? dispatcher.handlersByRendererId.get(redirectedRendererId)
      : undefined;
    if (!redirectedHandler || redirectedHandler === handler) {
      throw error;
    }
    const redirectedType = DEFAULT_RENDERER_DEFINITIONS
      .find(definition => definition.id === redirectedRendererId)
      ?.extensions[0] || normalizedType;
    context?.options?.onDiagnostic?.({
      code: 'renderer-content-signature-redirect',
      level: 'warning',
      message: `File extension .${normalizedType} contains the ${redirectedRendererId} container and was routed as .${redirectedType}.`,
      detail: {
        declaredExtension: normalizedType,
        detectedRendererId: redirectedRendererId,
        routedExtension: redirectedType,
      },
    });
    return await redirectedHandler(buffer, target, redirectedType, context);
  }
};

export const createFileRenderHandlerLoader = <
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
>({
  handler,
  rendererId,
  getTarget = context => context.surface.container as Target,
  createContext = buildFileRenderContextFromLoadContext,
  destroy,
}: CreateFileRenderHandlerLoaderOptions<Rendered, Target>): RendererLoader => {
  return async context => {
    const { source } = context;
    if (!source.buffer) {
      throw new Error('FileRenderHandler renderer requires an ArrayBuffer source.');
    }

    const target = getTarget(context);
    const renderContext = createContext(context);
    const rendered = await handler(
      source.buffer,
      target,
      source.extension,
      renderContext
    );
    const existingProvider = findFileViewerViewStateProvider(target);
    const genericViewStateProvider = existingProvider
      ? null
      : registerFileViewerGenericViewStateProvider({
        host: target,
        renderer: rendererId || source.extension,
      });
    const viewStateProvider = existingProvider || genericViewStateProvider?.provider || null;
    if (context.options.initialViewState && viewStateProvider?.applyState) {
      await viewStateProvider.applyState(context.options.initialViewState, {
        action: 'restore',
        source: 'initial',
      });
    }

    return createFileRenderHandlerRendererSession(rendered, () => {
      const destroyRendered = () => {
        if (destroy) {
          return destroy(rendered, context);
        }
        return disposeFileViewerRendered(rendered);
      };
      try {
        genericViewStateProvider?.destroy();
      } finally {
        return destroyRendered();
      }
    });
  };
};

export const createFileRenderHandlerRegistry = <
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
>({
  definitions = DEFAULT_RENDERER_DEFINITIONS,
  handlers,
  getTarget,
  createContext,
  destroy,
}: CreateFileRenderHandlerRegistryOptions<Rendered, Target>): FileRenderHandlerRegistryResult<Rendered, Target> => {
  const baseRegistry = createRendererRegistry(definitions);
  const dispatcher = createFileViewerRendererDispatcher<FileRenderHandler<Rendered, Target>>({
    registry: baseRegistry,
    handlers,
  });
  const definitionsWithLoaders = baseRegistry.list().map(definition => {
    const handler = dispatcher.handlersByRendererId.get(definition.id);
    if (!handler) {
      return definition;
    }

    return {
      ...definition,
      load: createFileRenderHandlerLoader({
        handler: (buffer, target, type, context) => renderFileViewerHandler({
          dispatcher,
          buffer,
          target,
          type,
          context,
          throwOnMissingHandler: true,
        }) as Promise<Rendered>,
        rendererId: definition.id,
        getTarget,
        createContext,
        destroy,
      }),
    } satisfies RendererDefinition;
  });

  return {
    registry: createRendererRegistry(definitionsWithLoaders),
    dispatcher,
    missingRendererIds: dispatcher.missingRendererIds,
  };
};
