// Source loading orchestrates file/url/buffer acquisition before rendering.
//
// It may coordinate lifecycle state and request cancellation, but it must not
// know which renderer will consume the buffer. That boundary keeps streaming,
// retry, abort, and remote-download behavior reusable across every framework.
import type {
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerPdfOptions,
} from '../contracts/types';
import {
  buildFileViewerLifecycleContext,
  type FileViewerLifecycleStateController,
} from '../lifecycle/operations';
import {
  resolveFileViewerPreviewMessages,
  type FileViewerErrorMessageFormatter,
} from '../viewer/state';
import { translateFileViewerMessage } from '../i18n/messages';
import type { FileViewerI18nInput } from '../i18n/messages';
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  getExtension,
  normalizeFilename,
  readFileViewerBuffer,
  resolveFileViewerSourceFilename,
  wrapFileViewerFileRef,
} from './index';

export const DEFAULT_PDF_RANGE_CHUNK_SIZE = 64 * 1024;
export const DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME = 'preview.pdf';
export const FILE_VIEWER_REMOTE_MISSING_DATA_ERROR_MESSAGE = '文件下载失败';
export const FILE_VIEWER_PREVIEW_LOAD_ERROR_PREFIXES = {
  local: '读取文件异常',
  load: '加载文件异常',
  stream: '加载 PDF 流式预览异常',
} as const satisfies Record<FileViewerPreviewLoadErrorKind, string>;

export type FileViewerPreviewLoadErrorKind = 'local' | FileViewerRemoteFilePreviewErrorKind;

export type FileViewerPreviewLoadErrorPrefixes = Partial<Record<FileViewerPreviewLoadErrorKind, string>>;

export interface ResolveFileViewerPreviewLoadErrorMessageInput {
  kind: FileViewerPreviewLoadErrorKind;
  error: unknown;
  formatErrorMessage: FileViewerErrorMessageFormatter;
  prefixes?: FileViewerPreviewLoadErrorPrefixes;
  i18n?: FileViewerI18nInput;
}

export interface ResolveFileViewerMissingRemoteDataErrorMessageInput {
  message?: string;
  i18n?: FileViewerI18nInput;
}

export type FileViewerPreviewLoadErrorLogger = (error: unknown) => void;

export interface ReportFileViewerPreviewLoadErrorInput extends ResolveFileViewerPreviewLoadErrorMessageInput {
  onLogError?: FileViewerPreviewLoadErrorLogger | null;
  onErrorMessage?: (message: string) => void;
}

export interface ReportFileViewerMissingRemoteDataInput extends ResolveFileViewerMissingRemoteDataErrorMessageInput {
  onErrorMessage?: (message: string) => void;
}

export interface FileViewerRequestController {
  readonly version: number;
  createVersion(): number;
  isCurrent(version: number): boolean;
  createAbortController(): AbortController | null;
  clearAbortController(controller: AbortController | null): void;
  abort(): void;
}

export interface FileViewerRequestScope {
  requestController: FileViewerRequestController;
  getCurrentVersion(): number;
  isCurrentRequest(version: number): boolean;
}

export interface ResolveFileViewerPreviewRequestReasonInput {
  file?: FileViewerFileRef | null;
  url?: string | null;
}

export interface CommitFileViewerPreviewRequestStartStateInput {
  reason?: FileViewerLifecycleContext['reason'];
  requestController: Pick<FileViewerRequestController, 'createVersion'>;
  previewTarget: MutableFileViewerPreviewRequestState;
  onClearRenderedContent?: (reason?: FileViewerLifecycleContext['reason']) => void;
  onClearError?: () => void;
}

export interface FileViewerEmptyPreviewState {
  filename: '';
  file: null;
  buffer: null;
  sourceUrl: null;
  renderedReady: false;
  progressiveReady: false;
}

export type FileViewerPreviewRequestResetState = Pick<
  FileViewerEmptyPreviewState,
  'file' | 'buffer' | 'sourceUrl' | 'progressiveReady'
>;

export interface MutableFileViewerPreviewRequestState {
  file: File | null;
  buffer: ArrayBuffer | null;
  sourceUrl: string | null;
  progressiveReady: boolean;
}

export interface MutableFileViewerPreviewState extends MutableFileViewerPreviewRequestState {
  filename: string;
  renderedReady: boolean;
}

export interface FileViewerMutableAccessor<Value> {
  get(): Value;
  set(value: Value): void;
}

export interface CreateFileViewerPreviewStateTargetInput {
  filename: FileViewerMutableAccessor<string>;
  file: FileViewerMutableAccessor<File | null>;
  buffer: FileViewerMutableAccessor<ArrayBuffer | null>;
  sourceUrl: FileViewerMutableAccessor<string | null>;
  renderedReady: FileViewerMutableAccessor<boolean>;
  progressiveReady: FileViewerMutableAccessor<boolean>;
}

export interface CommitFileViewerEmptyPreviewResetStateInput {
  previewTarget: MutableFileViewerPreviewState;
  state?: FileViewerEmptyPreviewState;
  reason?: FileViewerLifecycleContext['reason'];
  onClearRenderedContent?: (reason?: FileViewerLifecycleContext['reason']) => void;
  onResetLoading?: () => void;
}

export interface FileViewerReadPreviewState {
  filename: string;
  file: File;
  buffer: ArrayBuffer;
  sourceUrl: string | null;
}

export interface FileViewerFileRefSourcePlan {
  file: File;
  filename: string;
}

export interface ResolveFileViewerFileRefSourcePlanInput {
  source: FileViewerFileRef;
  currentFilename?: string;
  fallbackFilename?: string;
}

export interface CreateFileViewerReadPreviewStateInput {
  file: File;
  buffer: ArrayBuffer;
  sourceUrl?: string | null;
  fallbackFilename?: string;
}

export type MutableFileViewerReadPreviewState = Pick<
  MutableFileViewerPreviewState,
  'filename' | 'file' | 'buffer' | 'sourceUrl'
>;

export type MutableFileViewerPreviewSourceUrlState = Pick<MutableFileViewerPreviewState, 'sourceUrl'>;

export type MutableFileViewerPreviewFilenameState = Pick<MutableFileViewerPreviewState, 'filename'>;

export type FileViewerRenderReadinessState = Pick<
  MutableFileViewerPreviewState,
  'renderedReady' | 'progressiveReady'
>;

export type MutableFileViewerRenderReadinessState = FileViewerRenderReadinessState;

export interface FileViewerLoadStartState {
  loadingMessage: string;
  lifecycleContext: FileViewerLifecycleContext;
}

export interface CreateFileViewerLoadStartStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  filename?: string;
  file?: File | null;
  sourceUrl?: string | null;
  bufferSize?: number;
  loadingMessage?: string;
  signal?: AbortSignal;
  typeOverride?: string;
  i18n?: FileViewerI18nInput;
  timestamp?: number;
}

export interface CommitFileViewerLoadStartStateInput {
  version: number;
  filename?: string;
  fallbackFilename?: string;
  filenameTarget?: MutableFileViewerPreviewFilenameState;
  buildState: () => FileViewerLoadStartState;
  onMarkLoadStarted?: (version: number) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onStartLoading?: (message: string) => void;
}

export interface FileViewerRenderCompleteState {
  readiness: FileViewerRenderReadinessState;
  lifecycleContext: FileViewerLifecycleContext;
}

export interface CreateFileViewerRenderCompleteStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  filename?: string;
  file?: File | null;
  sourceUrl?: string | null;
  bufferSize?: number;
  startedAt?: number;
  timestamp?: number;
  lifecycleState?: Pick<FileViewerLifecycleStateController, 'getLoadStartedAt'>;
}

export interface CommitFileViewerRenderCompleteStateInput<Session = unknown> {
  version: number;
  session?: Session | null;
  buildState: () => FileViewerRenderCompleteState;
  readinessTarget: MutableFileViewerRenderReadinessState;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onClearLoadStarted?: (version: number) => void;
}

export interface RunFileViewerReadAndRenderFileInput<Session = unknown> {
  file: File;
  version: number;
  signal?: AbortSignal;
  source?: FileViewerLifecycleContext['source'];
  sourceUrl?: string;
  fallbackFilename?: string;
  previewTarget: MutableFileViewerReadPreviewState & MutableFileViewerRenderReadinessState;
  isCurrent: (version: number) => boolean;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string,
    signal?: AbortSignal,
    typeOverride?: string
  ) => Promise<Session | undefined>;
  destroyRenderSession?: (session?: Session | null) => void;
  buildRenderCompleteState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerRenderCompleteState;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onClearLoadStarted?: (version: number) => void;
}

export type FileViewerReadAndRenderFileState<Session = unknown> =
  | {
    readonly stale: true;
    readonly buffer: ArrayBuffer | null;
    readonly session: Session | null | undefined;
    readonly complete: null;
  }
  | {
    readonly stale: false;
    readonly buffer: ArrayBuffer;
    readonly session: Session | undefined;
    readonly complete: FileViewerRenderCompleteState;
  };

export type FileViewerStreamSourceDecision = boolean | string;

export interface RunFileViewerStreamingPdfPreviewInput<Session = unknown> {
  url: string;
  version: number;
  filename?: string;
  previewTarget: MutableFileViewerPreviewSourceUrlState & MutableFileViewerRenderReadinessState;
  isCurrent: (version: number) => boolean;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string,
    signal?: AbortSignal,
    typeOverride?: string
  ) => Promise<Session | undefined>;
  destroyRenderSession?: (session?: Session | null) => void;
  buildRenderCompleteState: (input: {
    version: number;
    source: 'url';
    sourceUrl?: string | null;
  }) => FileViewerRenderCompleteState;
  loadingMessage?: string;
  signal?: AbortSignal;
  typeOverride?: string;
  i18n?: FileViewerI18nInput;
  onStartLoading?: (message: string) => void;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onClearLoadStarted?: (version: number) => void;
  onStopLoading?: () => void;
  onError?: (error: unknown) => void;
}

export type FileViewerStreamingPdfPreviewState<Session = unknown> =
  | {
    readonly status: 'ready';
    readonly placeholderFile: File;
    readonly session: Session | undefined;
    readonly complete: FileViewerRenderCompleteState;
    readonly error: null;
  }
  | {
    readonly status: 'stale';
    readonly placeholderFile: File | null;
    readonly session: Session | null | undefined;
    readonly complete: null;
    readonly error: null;
  }
  | {
    readonly status: 'error';
    readonly placeholderFile: File | null;
    readonly session: null;
    readonly complete: null;
    readonly error: unknown;
  };

export interface RunFileViewerLocalFilePreviewInput<Session = unknown> {
  source: FileViewerFileRef;
  version: number;
  currentFilename?: string;
  fallbackFilename?: string;
  shouldStreamLocalFile?: (input: {
    file: File;
    filename: string;
    extension: string;
    signal?: AbortSignal;
  }) => FileViewerStreamSourceDecision | Promise<FileViewerStreamSourceDecision>;
  requestController?: Pick<FileViewerRequestController, 'createAbortController' | 'clearAbortController'>;
  previewTarget: MutableFileViewerPreviewState;
  isCurrent: (version: number) => boolean;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string,
    signal?: AbortSignal,
    typeOverride?: string
  ) => Promise<Session | undefined>;
  destroyRenderSession?: (session?: Session | null) => void;
  buildLoadStartState: (input: {
    version: number;
    source: 'file';
    file: File;
  }) => FileViewerLoadStartState;
  buildRenderCompleteState: (input: {
    version: number;
    source: 'file';
    file: File;
  }) => FileViewerRenderCompleteState;
  onMarkLoadStarted?: (version: number) => void;
  onStartLoading?: (message: string) => void;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onClearLoadStarted?: (version: number) => void;
  onStopLoading?: () => void;
  onError?: (error: unknown) => void;
}

export type FileViewerLocalFilePreviewState<Session = unknown> =
  | {
    readonly status: 'ready';
    readonly source: FileViewerFileRefSourcePlan;
    readonly read: Extract<FileViewerReadAndRenderFileState<Session>, { stale: false }>;
    readonly error: null;
  }
  | {
    readonly status: 'stale';
    readonly source: FileViewerFileRefSourcePlan | null;
    readonly read: FileViewerReadAndRenderFileState<Session> | null;
    readonly error: null;
  }
  | {
    readonly status: 'error';
    readonly source: FileViewerFileRefSourcePlan;
    readonly read: null;
    readonly error: unknown;
  };

export interface FileViewerRemoteFileDownloadInput {
  url: string;
  signal?: AbortSignal;
}

export type FileViewerRemoteFilePreviewErrorKind = 'stream' | 'load';

export const resolveFileViewerPreviewLoadErrorMessage = ({
  kind,
  error,
  formatErrorMessage,
  prefixes,
  i18n,
}: ResolveFileViewerPreviewLoadErrorMessageInput) => {
  const fallbackPrefix = kind === 'local'
    ? translateFileViewerMessage(i18n, 'error.localRead')
    : kind === 'stream'
      ? translateFileViewerMessage(i18n, 'error.stream')
      : translateFileViewerMessage(i18n, 'error.load');
  return formatErrorMessage(prefixes?.[kind] ?? fallbackPrefix, error, i18n);
};

export const resolveFileViewerMissingRemoteDataErrorMessage = ({
  message,
  i18n,
}: ResolveFileViewerMissingRemoteDataErrorMessageInput = {}) =>
  message || translateFileViewerMessage(i18n, 'error.remoteDownload');

export const DEFAULT_FILE_VIEWER_PREVIEW_LOAD_ERROR_LOGGER: FileViewerPreviewLoadErrorLogger = error => {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(error);
  }
};

export const reportFileViewerPreviewLoadError = ({
  onLogError = DEFAULT_FILE_VIEWER_PREVIEW_LOAD_ERROR_LOGGER,
  onErrorMessage,
  ...messageInput
}: ReportFileViewerPreviewLoadErrorInput) => {
  onLogError?.(messageInput.error);
  const message = resolveFileViewerPreviewLoadErrorMessage(messageInput);
  onErrorMessage?.(message);
  return message;
};

export const reportFileViewerMissingRemoteData = ({
  onErrorMessage,
  ...messageInput
}: ReportFileViewerMissingRemoteDataInput = {}) => {
  const message = resolveFileViewerMissingRemoteDataErrorMessage(messageInput);
  onErrorMessage?.(message);
  return message;
};

export interface RunFileViewerRemoteFilePreviewInput<Session = unknown> {
  url: string;
  version: number;
  pageHref?: string;
  streaming?: FileViewerPdfOptions['streaming'];
  shouldStreamRemoteUrl?: (input: {
    url: string;
    filename: string;
    extension: string;
    pageHref?: string;
    signal?: AbortSignal;
  }) => FileViewerStreamSourceDecision | Promise<FileViewerStreamSourceDecision>;
  previewTarget: MutableFileViewerPreviewState;
  requestController: Pick<FileViewerRequestController, 'createAbortController' | 'clearAbortController'>;
  isCurrent: (version: number) => boolean;
  downloadFile: (input: FileViewerRemoteFileDownloadInput) => Promise<FileViewerFileRef | null | undefined>;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string,
    signal?: AbortSignal,
    typeOverride?: string
  ) => Promise<Session | undefined>;
  destroyRenderSession?: (session?: Session | null) => void;
  buildLoadStartState: (input: {
    version: number;
    source: 'url';
    sourceUrl: string;
  }) => FileViewerLoadStartState;
  buildRenderCompleteState: (input: {
    version: number;
    source: 'url';
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerRenderCompleteState;
  i18n?: FileViewerI18nInput;
  onMarkLoadStarted?: (version: number) => void;
  onStartLoading?: (message: string) => void;
  onSetLoadingMessage?: (message: string) => void;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onClearLoadStarted?: (version: number) => void;
  onStopLoading?: () => void;
  onMissingData?: () => void;
  onError?: (error: unknown, kind: FileViewerRemoteFilePreviewErrorKind) => void;
}

export type FileViewerRemoteFilePreviewState<Session = unknown> =
  | {
    readonly status: 'ready';
    readonly remoteSource: FileViewerRemoteSourcePlan;
    readonly download: Extract<FileViewerRemoteDownloadState, { stale: false; missing: false }>;
    readonly read: Extract<FileViewerReadAndRenderFileState<Session>, { stale: false }>;
    readonly stream: null;
    readonly error: null;
  }
  | {
    readonly status: 'stream';
    readonly remoteSource: FileViewerRemoteSourcePlan;
    readonly download: null;
    readonly read: null;
    readonly stream: Extract<FileViewerStreamingPdfPreviewState<Session>, { status: 'ready' }>;
    readonly error: null;
  }
  | {
    readonly status: 'missing';
    readonly remoteSource: FileViewerRemoteSourcePlan;
    readonly download: Extract<FileViewerRemoteDownloadState, { stale: false; missing: true }>;
    readonly read: null;
    readonly stream: null;
    readonly error: null;
  }
  | {
    readonly status: 'stale';
    readonly remoteSource: FileViewerRemoteSourcePlan;
    readonly download: FileViewerRemoteDownloadState | null;
    readonly read: FileViewerReadAndRenderFileState<Session> | null;
    readonly stream: Extract<FileViewerStreamingPdfPreviewState<Session>, { status: 'stale' }> | null;
    readonly error: null;
  }
  | {
    readonly status: 'error';
    readonly remoteSource: FileViewerRemoteSourcePlan;
    readonly download: null;
    readonly read: null;
    readonly stream: Extract<FileViewerStreamingPdfPreviewState<Session>, { status: 'error' }> | null;
    readonly error: unknown;
  };

export interface RunFileViewerPreviewRequestInput<LocalResult = unknown, RemoteResult = unknown> {
  file?: FileViewerFileRef | null;
  url?: string | null;
  reason?: FileViewerLifecycleContext['reason'];
  requestController: Pick<FileViewerRequestController, 'createVersion'>;
  previewTarget: MutableFileViewerPreviewState;
  onPreviewLocalFile: (source: FileViewerFileRef, version: number) => Promise<LocalResult>;
  onPreviewRemoteFile: (url: string, version: number) => Promise<RemoteResult>;
  onClearRenderedContent?: (reason?: FileViewerLifecycleContext['reason']) => void;
  onClearError?: () => void;
  onResetLoading?: () => void;
}

export type FileViewerPreviewRequestRunState<LocalResult = unknown, RemoteResult = unknown> =
  | {
    readonly status: 'file';
    readonly version: number;
    readonly reason: FileViewerLifecycleContext['reason'];
    readonly file: FileViewerFileRef;
    readonly url: null;
    readonly result: LocalResult;
  }
  | {
    readonly status: 'url';
    readonly version: number;
    readonly reason: FileViewerLifecycleContext['reason'];
    readonly file: null;
    readonly url: string;
    readonly result: RemoteResult;
  }
  | {
    readonly status: 'reset';
    readonly version: number;
    readonly reason: FileViewerLifecycleContext['reason'];
    readonly file: null;
    readonly url: null;
    readonly result: MutableFileViewerPreviewState;
  };

export interface CancelFileViewerPreviewRequestInput {
  reason?: FileViewerLifecycleContext['reason'];
  requestController: Pick<FileViewerRequestController, 'createVersion'>;
  previewTarget: MutableFileViewerPreviewRequestState;
  onClearRenderedContent?: (reason?: FileViewerLifecycleContext['reason']) => void;
  onClearError?: () => void;
}

export interface RunFileViewerPreviewSourceChangeInput {
  onRefreshPreview?: () => Promise<unknown> | unknown;
}

export interface RunFileViewerPreviewComponentUnmountInput {
  reason?: FileViewerLifecycleContext['reason'];
  onCancelPreview?: (reason: FileViewerLifecycleContext['reason']) => void;
  onClearRenderedContent?: (reason: FileViewerLifecycleContext['reason']) => void;
  onResetLoading?: () => void;
  onStopZoomObserver?: () => void;
  onStopFitObserver?: () => void;
  onStopViewStateObserver?: () => void;
}

export interface FileViewerPreviewComponentUnmountState {
  reason: FileViewerLifecycleContext['reason'];
}

export interface FileViewerSourceLoadingActionHandlers<Session = unknown> {
  isCurrentRequest: (version: number) => boolean;
  previewLocalFile: (
    source: FileViewerFileRef,
    version: number
  ) => Promise<FileViewerLocalFilePreviewState<Session>>;
  previewRemoteFile: (
    url: string,
    version: number
  ) => Promise<FileViewerRemoteFilePreviewState<Session>>;
  resetViewer: (
    reason?: FileViewerLifecycleContext['reason']
  ) => MutableFileViewerPreviewState;
  refreshPreview: () => Promise<FileViewerPreviewRequestRunState<
    FileViewerLocalFilePreviewState<Session>,
    FileViewerRemoteFilePreviewState<Session>
  >>;
  cancelPreview: (reason?: FileViewerLifecycleContext['reason']) => number;
}

export interface CreateFileViewerSourceLoadingActionHandlersInput<Session = unknown> {
  getFile: () => FileViewerFileRef | null | undefined;
  getUrl: () => string | null | undefined;
  getCurrentFilename?: () => string | undefined;
  shouldStreamLocalFile?: (input: {
    file: File;
    filename: string;
    extension: string;
    signal?: AbortSignal;
  }) => FileViewerStreamSourceDecision | Promise<FileViewerStreamSourceDecision>;
  getPdfStreaming?: () => FileViewerPdfOptions['streaming'] | undefined;
  shouldStreamRemoteUrl?: (input: {
    url: string;
    filename: string;
    extension: string;
    pageHref?: string;
    signal?: AbortSignal;
  }) => FileViewerStreamSourceDecision | Promise<FileViewerStreamSourceDecision>;
  getI18n?: () => FileViewerI18nInput;
  getPageHref?: () => string | undefined;
  previewTarget: MutableFileViewerPreviewState;
  requestController: FileViewerRequestController;
  downloadFile: (input: FileViewerRemoteFileDownloadInput) => Promise<FileViewerFileRef | null | undefined>;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string,
    signal?: AbortSignal,
    typeOverride?: string
  ) => Promise<Session | undefined>;
  destroyRenderSession?: (session?: Session | null) => void;
  buildLoadStartState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerLoadStartState;
  buildRenderCompleteState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerRenderCompleteState;
  formatErrorMessage: FileViewerErrorMessageFormatter;
  onMarkLoadStarted?: (version: number) => void;
  onClearLoadStarted?: (version: number) => void;
  onStartLoading?: (message: string) => void;
  onSetLoadingMessage?: (message: string) => void;
  onStopLoading?: () => void;
  onShowError?: (message: string) => void;
  onClearError?: () => void;
  onResetLoading?: () => void;
  onClearRenderedContent?: (reason?: FileViewerLifecycleContext['reason']) => void;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
}

export interface FinalizeFileViewerPreviewLoadStateInput {
  version: number;
  isCurrent: (version: number) => boolean;
  onClearLoadStarted?: (version: number) => void;
  onStopLoading?: () => void;
}

export const createFileViewerRequestController = (): FileViewerRequestController => {
  let version = 0;
  let activeAbortController: AbortController | null = null;

  return {
    get version() {
      return version;
    },
    createVersion() {
      version += 1;
      activeAbortController?.abort();
      activeAbortController = null;
      return version;
    },
    isCurrent(nextVersion: number) {
      return nextVersion === version;
    },
    createAbortController() {
      activeAbortController = typeof AbortController === 'function'
        ? new AbortController()
        : null;
      return activeAbortController;
    },
    clearAbortController(controller: AbortController | null) {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    },
    abort() {
      activeAbortController?.abort();
      activeAbortController = null;
    },
  };
};

export const createFileViewerRequestScope = (
  requestController = createFileViewerRequestController()
): FileViewerRequestScope => {
  return {
    requestController,
    getCurrentVersion: () => requestController.version,
    isCurrentRequest: version => requestController.isCurrent(version),
  };
};

export const isFileViewerAbortError = (error: unknown) => {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    __CANCEL__?: unknown;
    code?: unknown;
    name?: unknown;
  };

  return candidate.__CANCEL__ === true ||
    candidate.code === 'ERR_CANCELED' ||
    candidate.name === 'AbortError' ||
    candidate.name === 'CanceledError';
};

export const hasFileViewerPreviewSource = ({
  file,
  url,
}: ResolveFileViewerPreviewRequestReasonInput = {}) => {
  return !!file || !!url;
};

export const resolveFileViewerPreviewRequestReason = (
  input: ResolveFileViewerPreviewRequestReasonInput = {}
): FileViewerLifecycleContext['reason'] => {
  return hasFileViewerPreviewSource(input) ? 'replace' : 'reset';
};

const FILE_VIEWER_HIERARCHICAL_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const FILE_VIEWER_SCHEME_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

const findFileViewerUrlSuffixIndex = (value: string) => {
  const queryIndex = value.indexOf('?');
  const hashIndex = value.indexOf('#');
  if (queryIndex === -1) {
    return hashIndex;
  }
  if (hashIndex === -1) {
    return queryIndex;
  }
  return Math.min(queryIndex, hashIndex);
};

const encodeFileViewerUrlPathSegment = (segment: string) => {
  if (!segment) {
    return segment;
  }

  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Invalid percent escapes are treated as literal filename characters.
  }

  return encodeURIComponent(decoded)
    .replace(/%3A/gi, ':')
    .replace(/%40/gi, '@')
    .replace(/%24/g, '$')
    .replace(/%26/g, '&')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
};

const normalizeFileViewerUrlPathname = (pathname: string) => {
  return pathname
    .split('/')
    .map(encodeFileViewerUrlPathSegment)
    .join('/');
};

const splitFileViewerUrlPathPrefix = (pathPart: string) => {
  if (pathPart.startsWith('//')) {
    const pathStart = pathPart.indexOf('/', 2);
    return pathStart === -1
      ? { prefix: pathPart, pathname: '' }
      : { prefix: pathPart.slice(0, pathStart), pathname: pathPart.slice(pathStart) };
  }

  const hierarchical = pathPart.match(FILE_VIEWER_HIERARCHICAL_URL_PATTERN);
  if (hierarchical) {
    const pathStart = pathPart.indexOf('/', hierarchical[0].length);
    return pathStart === -1
      ? { prefix: pathPart, pathname: '' }
      : { prefix: pathPart.slice(0, pathStart), pathname: pathPart.slice(pathStart) };
  }

  if (FILE_VIEWER_SCHEME_URL_PATTERN.test(pathPart)) {
    return { prefix: pathPart, pathname: '' };
  }

  return { prefix: '', pathname: pathPart };
};

export const normalizeFileViewerSourceUrl = (sourceUrl?: string | null) => {
  const trimmed = sourceUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const suffixIndex = findFileViewerUrlSuffixIndex(trimmed);
  const pathPart = suffixIndex === -1 ? trimmed : trimmed.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : trimmed.slice(suffixIndex);
  const { prefix, pathname } = splitFileViewerUrlPathPrefix(pathPart);
  if (!pathname) {
    return `${prefix}${suffix}`;
  }

  return `${prefix}${normalizeFileViewerUrlPathname(pathname)}${suffix}`;
};

export const createFileViewerEmptyPreviewState = (): FileViewerEmptyPreviewState => {
  return {
    filename: '',
    file: null,
    buffer: null,
    sourceUrl: null,
    renderedReady: false,
    progressiveReady: false,
  };
};

export const createFileViewerPreviewRequestResetState = (): FileViewerPreviewRequestResetState => {
  return {
    file: null,
    buffer: null,
    sourceUrl: null,
    progressiveReady: false,
  };
};

export const createFileViewerPreviewStateTarget = ({
  filename,
  file,
  buffer,
  sourceUrl,
  renderedReady,
  progressiveReady,
}: CreateFileViewerPreviewStateTargetInput): MutableFileViewerPreviewState => {
  return {
    get filename() {
      return filename.get();
    },
    set filename(value) {
      filename.set(value);
    },
    get file() {
      return file.get();
    },
    set file(value) {
      file.set(value);
    },
    get buffer() {
      return buffer.get();
    },
    set buffer(value) {
      buffer.set(value);
    },
    get sourceUrl() {
      return sourceUrl.get();
    },
    set sourceUrl(value) {
      sourceUrl.set(value);
    },
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

export const applyFileViewerPreviewRequestResetState = <Target extends MutableFileViewerPreviewRequestState>(
  target: Target,
  state: FileViewerPreviewRequestResetState = createFileViewerPreviewRequestResetState()
) => {
  target.file = state.file;
  target.buffer = state.buffer;
  target.sourceUrl = state.sourceUrl;
  target.progressiveReady = state.progressiveReady;
  return target;
};

export const commitFileViewerPreviewRequestStartState = ({
  reason = 'replace',
  requestController,
  previewTarget,
  onClearRenderedContent,
  onClearError,
}: CommitFileViewerPreviewRequestStartStateInput) => {
  const version = requestController.createVersion();
  onClearRenderedContent?.(reason);
  applyFileViewerPreviewRequestResetState(previewTarget);
  onClearError?.();
  return version;
};

export const cancelFileViewerPreviewRequest = ({
  reason = 'component-unmount',
  requestController,
  previewTarget,
  onClearRenderedContent,
  onClearError,
}: CancelFileViewerPreviewRequestInput) => {
  return commitFileViewerPreviewRequestStartState({
    reason,
    requestController,
    previewTarget,
    onClearRenderedContent,
    onClearError,
  });
};

export const runFileViewerPreviewSourceChange = ({
  onRefreshPreview,
}: RunFileViewerPreviewSourceChangeInput = {}) => {
  return onRefreshPreview?.();
};

export const runFileViewerPreviewComponentUnmount = ({
  reason = 'component-unmount',
  onCancelPreview,
  onClearRenderedContent,
  onResetLoading,
  onStopZoomObserver,
  onStopFitObserver,
  onStopViewStateObserver,
}: RunFileViewerPreviewComponentUnmountInput = {}): FileViewerPreviewComponentUnmountState => {
  onCancelPreview?.(reason);
  if (!onCancelPreview) {
    onClearRenderedContent?.(reason);
  }
  onResetLoading?.();
  onStopZoomObserver?.();
  onStopFitObserver?.();
  onStopViewStateObserver?.();

  return {
    reason,
  };
};

export const applyFileViewerEmptyPreviewState = <Target extends MutableFileViewerPreviewState>(
  target: Target,
  state: FileViewerEmptyPreviewState = createFileViewerEmptyPreviewState()
) => {
  target.filename = state.filename;
  target.renderedReady = state.renderedReady;
  applyFileViewerPreviewRequestResetState(target, state);
  return target;
};

export const commitFileViewerEmptyPreviewResetState = ({
  previewTarget,
  state,
  reason,
  onClearRenderedContent,
  onResetLoading,
}: CommitFileViewerEmptyPreviewResetStateInput) => {
  applyFileViewerEmptyPreviewState(previewTarget, state);
  onClearRenderedContent?.(reason);
  onResetLoading?.();
  return previewTarget;
};

export const runFileViewerPreviewRequest = async <LocalResult = unknown, RemoteResult = unknown>({
  file,
  url,
  reason = resolveFileViewerPreviewRequestReason({ file, url }),
  requestController,
  previewTarget,
  onPreviewLocalFile,
  onPreviewRemoteFile,
  onClearRenderedContent,
  onClearError,
  onResetLoading,
}: RunFileViewerPreviewRequestInput<LocalResult, RemoteResult>): Promise<FileViewerPreviewRequestRunState<LocalResult, RemoteResult>> => {
  const version = commitFileViewerPreviewRequestStartState({
    reason,
    requestController,
    previewTarget,
    onClearRenderedContent,
    onClearError,
  });

  if (file) {
    const result = await onPreviewLocalFile(file, version);
    return {
      status: 'file',
      version,
      reason,
      file,
      url: null,
      result,
    };
  }

  if (url) {
    const result = await onPreviewRemoteFile(url, version);
    return {
      status: 'url',
      version,
      reason,
      file: null,
      url,
      result,
    };
  }

  const result = commitFileViewerEmptyPreviewResetState({
    previewTarget,
    onClearRenderedContent,
    onResetLoading,
  });

  return {
    status: 'reset',
    version,
    reason,
    file: null,
    url: null,
    result,
  };
};

export const createFileViewerReadPreviewState = ({
  file,
  buffer,
  sourceUrl,
  fallbackFilename = '',
}: CreateFileViewerReadPreviewStateInput): FileViewerReadPreviewState => ({
  filename: resolveFileViewerSourceFilename({ file, fallback: fallbackFilename }),
  file,
  buffer,
  sourceUrl: normalizeFileViewerSourceUrl(sourceUrl),
});

export const applyFileViewerReadPreviewState = <Target extends MutableFileViewerReadPreviewState>(
  target: Target,
  state: FileViewerReadPreviewState
) => {
  target.filename = state.filename;
  target.file = state.file;
  target.buffer = state.buffer;
  target.sourceUrl = state.sourceUrl;
  return target;
};

export const applyFileViewerPreviewSourceUrlState = <Target extends MutableFileViewerPreviewSourceUrlState>(
  target: Target,
  sourceUrl?: string | null
) => {
  target.sourceUrl = normalizeFileViewerSourceUrl(sourceUrl);
  return target;
};

export const applyFileViewerPreviewFilenameState = <Target extends MutableFileViewerPreviewFilenameState>(
  target: Target,
  filename?: string,
  fallbackFilename = ''
) => {
  target.filename = resolveFileViewerSourceFilename({ filename, fallback: fallbackFilename });
  return target;
};

export const applyFileViewerRenderReadinessState = <Target extends MutableFileViewerRenderReadinessState>(
  target: Target,
  state: Partial<FileViewerRenderReadinessState>
) => {
  if (typeof state.renderedReady === 'boolean') {
    target.renderedReady = state.renderedReady;
  }
  if (typeof state.progressiveReady === 'boolean') {
    target.progressiveReady = state.progressiveReady;
  }
  return target;
};

export const commitFileViewerRenderCompleteState = <Session = unknown>({
  version,
  session,
  buildState,
  readinessTarget,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
  onClearLoadStarted,
}: CommitFileViewerRenderCompleteStateInput<Session>) => {
  onSession?.(session ?? null);
  const completeState = buildState();
  applyFileViewerRenderReadinessState(readinessTarget, completeState.readiness);
  onActiveDocumentContext?.(completeState.lifecycleContext);
  onLifecycle?.(completeState.lifecycleContext);
  onClearLoadStarted?.(version);
  return completeState;
};

export const runFileViewerReadAndRenderFile = async <Session = unknown>({
  file,
  version,
  signal,
  sourceUrl,
  source = sourceUrl ? 'url' : 'file',
  fallbackFilename = '',
  previewTarget,
  isCurrent,
  mountRenderedContent,
  destroyRenderSession,
  buildRenderCompleteState,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
  onClearLoadStarted,
}: RunFileViewerReadAndRenderFileInput<Session>): Promise<FileViewerReadAndRenderFileState<Session>> => {
  const buffer = await readFileViewerBuffer(file);
  if (!isCurrent(version) || signal?.aborted) {
    return {
      stale: true,
      buffer,
      session: null,
      complete: null,
    };
  }

  applyFileViewerReadPreviewState(previewTarget, createFileViewerReadPreviewState({
    file,
    buffer,
    sourceUrl,
    fallbackFilename,
  }));

  const session = await mountRenderedContent(buffer, file, version, sourceUrl);
  if (!isCurrent(version) || signal?.aborted) {
    destroyRenderSession?.(session);
    return {
      stale: true,
      buffer,
      session,
      complete: null,
    };
  }

  const complete = commitFileViewerRenderCompleteState({
    version,
    session,
    readinessTarget: previewTarget,
    buildState: () => buildRenderCompleteState({
      version,
      source,
      file,
      sourceUrl,
    }),
    onSession,
    onActiveDocumentContext,
    onLifecycle,
    onClearLoadStarted,
  });

  return {
    stale: false,
    buffer,
    session,
    complete,
  };
};

export const runFileViewerStreamingPdfPreview = async <Session = unknown>({
  url,
  version,
  filename,
  previewTarget,
  isCurrent,
  mountRenderedContent,
  destroyRenderSession,
  buildRenderCompleteState,
  loadingMessage,
  signal,
  typeOverride,
  i18n,
  onStartLoading,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
  onClearLoadStarted,
  onStopLoading,
  onError,
}: RunFileViewerStreamingPdfPreviewInput<Session>): Promise<FileViewerStreamingPdfPreviewState<Session>> => {
  let placeholderFile: File | null = null;

  onStartLoading?.(loadingMessage || resolveFileViewerPreviewMessages(i18n).streamingPdf);

  try {
    placeholderFile = createFileViewerStreamingPdfPlaceholderFile(filename);
    applyFileViewerPreviewSourceUrlState(previewTarget, url);

    const session = await mountRenderedContent(
      new ArrayBuffer(0),
      placeholderFile,
      version,
      url,
      url,
      signal,
      typeOverride
    );
    if (!isCurrent(version) || signal?.aborted) {
      await destroyRenderSession?.(session);
      return {
        status: 'stale',
        placeholderFile,
        session,
        complete: null,
        error: null,
      };
    }

    const complete = commitFileViewerRenderCompleteState({
      version,
      session,
      readinessTarget: previewTarget,
      buildState: () => buildRenderCompleteState({
        version,
        source: 'url',
        sourceUrl: url,
      }),
      onSession,
      onActiveDocumentContext,
      onLifecycle,
      onClearLoadStarted,
    });

    return {
      status: 'ready',
      placeholderFile,
      session,
      complete,
      error: null,
    };
  } catch (error) {
    if (!isCurrent(version) || signal?.aborted || isFileViewerAbortError(error)) {
      return {
        status: 'stale',
        placeholderFile,
        session: null,
        complete: null,
        error: null,
      };
    }

    onError?.(error);
    return {
      status: 'error',
      placeholderFile,
      session: null,
      complete: null,
      error,
    };
  } finally {
    finalizeFileViewerPreviewLoadState({
      version,
      isCurrent,
      onClearLoadStarted,
      onStopLoading,
    });
  }
};

export const runFileViewerLocalFilePreview = async <Session = unknown>({
  source,
  version,
  currentFilename,
  fallbackFilename,
  shouldStreamLocalFile,
  requestController,
  previewTarget,
  isCurrent,
  mountRenderedContent,
  destroyRenderSession,
  buildLoadStartState,
  buildRenderCompleteState,
  onMarkLoadStarted,
  onStartLoading,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
  onClearLoadStarted,
  onStopLoading,
  onError,
}: RunFileViewerLocalFilePreviewInput<Session>): Promise<FileViewerLocalFilePreviewState<Session>> => {
  const localSource = resolveFileViewerFileRefSourcePlan({
    source,
    currentFilename,
    fallbackFilename,
  });
  const { file } = localSource;

  commitFileViewerLoadStartState({
    version,
    filename: localSource.filename,
    filenameTarget: previewTarget,
    buildState: () => buildLoadStartState({
      version,
      source: 'file',
      file,
    }),
    onMarkLoadStarted,
    onLifecycle,
    onStartLoading,
  });

  const controller = requestController?.createAbortController() || null;

  try {
    const streamDecision = await shouldStreamLocalFile?.({
      file,
      filename: localSource.filename,
      extension: getExtension(localSource.filename),
      signal: controller?.signal,
    });
    if (!isCurrent(version) || controller?.signal.aborted) {
      return { status: 'stale', source: localSource, read: null, error: null };
    }
    if (streamDecision) {
      const buffer = new ArrayBuffer(0);
      const typeOverride =
        typeof streamDecision === 'string' ? streamDecision : undefined;
      applyFileViewerReadPreviewState(previewTarget, createFileViewerReadPreviewState({
        file,
        buffer,
        fallbackFilename: localSource.filename,
      }));
      const session = await mountRenderedContent(
        buffer,
        file,
        version,
        undefined,
        undefined,
        controller?.signal,
        typeOverride
      );
      if (!isCurrent(version) || controller?.signal.aborted) {
        destroyRenderSession?.(session);
        return { status: 'stale', source: localSource, read: null, error: null };
      }
      const complete = commitFileViewerRenderCompleteState({
        version,
        session,
        readinessTarget: previewTarget,
        buildState: () => buildRenderCompleteState({ version, source: 'file', file }),
        onSession,
        onActiveDocumentContext,
        onLifecycle,
        onClearLoadStarted,
      });
      return {
        status: 'ready',
        source: localSource,
        read: { stale: false, buffer, session, complete },
        error: null,
      };
    }

    const read = await runFileViewerReadAndRenderFile({
      file,
      version,
      signal: controller?.signal,
      source: 'file',
      previewTarget,
      isCurrent,
      mountRenderedContent: (buffer, file, version, sourceUrl) =>
        mountRenderedContent(buffer, file, version, sourceUrl, undefined, controller?.signal),
      destroyRenderSession,
      buildRenderCompleteState: input => buildRenderCompleteState({
        version: input.version,
        source: 'file',
        file,
      }),
      onSession,
      onActiveDocumentContext,
      onLifecycle,
      onClearLoadStarted,
    });

    if (read.stale) {
      return {
        status: 'stale',
        source: localSource,
        read,
        error: null,
      };
    }

    return {
      status: 'ready',
      source: localSource,
      read,
      error: null,
    };
  } catch (error) {
    if (!isCurrent(version) || controller?.signal.aborted) {
      return {
        status: 'stale',
        source: localSource,
        read: null,
        error: null,
      };
    }

    onError?.(error);
    return {
      status: 'error',
      source: localSource,
      read: null,
      error,
    };
  } finally {
    requestController?.clearAbortController(controller);
    finalizeFileViewerPreviewLoadState({
      version,
      isCurrent,
      onClearLoadStarted,
      onStopLoading,
    });
  }
};

export const runFileViewerRemoteFilePreview = async <Session = unknown>({
  url,
  version,
  pageHref,
  streaming,
  shouldStreamRemoteUrl,
  previewTarget,
  requestController,
  isCurrent,
  downloadFile,
  mountRenderedContent,
  destroyRenderSession,
  buildLoadStartState,
  buildRenderCompleteState,
  i18n,
  onMarkLoadStarted,
  onStartLoading,
  onSetLoadingMessage,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
  onClearLoadStarted,
  onStopLoading,
  onMissingData,
  onError,
}: RunFileViewerRemoteFilePreviewInput<Session>): Promise<
  FileViewerRemoteFilePreviewState<Session>
> => {
  let remoteSource = resolveFileViewerRemoteSourcePlan({
    pageHref,
    streaming,
    url,
  });
  const sourceUrl = remoteSource.url;
  const controller = requestController.createAbortController();
  // The streaming helper finalizes its own load state; probe/download paths
  // are finalized here, including cancellation before a renderer is mounted.
  let streamFinalized = false;

  try {
    if (!remoteSource.streamPdf && shouldStreamRemoteUrl) {
      const streamDecision = await shouldStreamRemoteUrl({
        url: sourceUrl,
        filename: remoteSource.filename,
        extension: remoteSource.extension,
        pageHref,
        signal: controller?.signal,
      });
      if (streamDecision) {
        remoteSource = {
          ...remoteSource,
          streamRenderer: true,
          streamType: typeof streamDecision === 'string' ? streamDecision : remoteSource.extension,
        };
      }
    }

    if (!isCurrent(version) || controller?.signal.aborted) {
      return {
        status: 'stale',
        remoteSource,
        download: null,
        read: null,
        stream: null,
        error: null,
      };
    }

    commitFileViewerLoadStartState({
      version,
      filename: remoteSource.filename,
      filenameTarget: previewTarget,
      buildState: () =>
        buildLoadStartState({
          version,
          source: 'url',
          sourceUrl,
        }),
      onMarkLoadStarted,
      onLifecycle,
      onStartLoading,
    });

    if (remoteSource.streamPdf || remoteSource.streamRenderer) {
      const stream = await runFileViewerStreamingPdfPreview({
        url: sourceUrl,
        version,
        filename: remoteSource.filename,
        previewTarget,
        isCurrent,
        mountRenderedContent,
        destroyRenderSession,
        buildRenderCompleteState: (input) =>
          buildRenderCompleteState({
            version: input.version,
            source: 'url',
            sourceUrl,
          }),
        i18n,
        loadingMessage: remoteSource.streamPdf
          ? undefined
          : resolveFileViewerPreviewMessages(i18n).downloading,
        signal: controller?.signal,
        typeOverride: remoteSource.streamType,
        onStartLoading,
        onSession,
        onActiveDocumentContext,
        onLifecycle,
        onClearLoadStarted,
        onStopLoading,
        onError: (error) => onError?.(error, 'stream'),
      });

      streamFinalized = true;

      if (stream.status === 'ready') {
        return {
          status: 'stream',
          remoteSource,
          download: null,
          read: null,
          stream,
          error: null,
        };
      }

      if (stream.status === 'error') {
        return {
          status: 'error',
          remoteSource,
          download: null,
          read: null,
          stream,
          error: stream.error,
        };
      }

      return {
        status: 'stale',
        remoteSource,
        download: null,
        read: null,
        stream,
        error: null,
      };
    }

    const data = await downloadFile({
      url: sourceUrl,
      signal: controller?.signal,
    });
    const download = commitFileViewerRemoteDownloadState({
      version,
      data,
      currentFilename: remoteSource.filename,
      isCurrent,
      i18n,
      onMissingData,
      onSetLoadingMessage,
    });

    if (download.stale) {
      return {
        status: 'stale',
        remoteSource,
        download,
        read: null,
        stream: null,
        error: null,
      };
    }

    if (download.missing) {
      return {
        status: 'missing',
        remoteSource,
        download,
        read: null,
        stream: null,
        error: null,
      };
    }

    const read = await runFileViewerReadAndRenderFile({
      file: download.source.file,
      version,
      source: 'url',
      sourceUrl,
      previewTarget,
      isCurrent,
      mountRenderedContent,
      destroyRenderSession,
      buildRenderCompleteState: (input) =>
        buildRenderCompleteState({
          version: input.version,
          source: 'url',
          file: input.file,
          sourceUrl,
        }),
      onSession,
      onActiveDocumentContext,
      onLifecycle,
      onClearLoadStarted,
    });

    if (read.stale) {
      return {
        status: 'stale',
        remoteSource,
        download,
        read,
        stream: null,
        error: null,
      };
    }

    return {
      status: 'ready',
      remoteSource,
      download,
      read,
      stream: null,
      error: null,
    };
  } catch (error) {
    if (!isCurrent(version) || isFileViewerAbortError(error)) {
      return {
        status: 'stale',
        remoteSource,
        download: null,
        read: null,
        stream: null,
        error: null,
      };
    }

    onError?.(error, 'load');
    return {
      status: 'error',
      remoteSource,
      download: null,
      read: null,
      stream: null,
      error,
    };
  } finally {
    requestController.clearAbortController(controller);
    if (!streamFinalized) {
      finalizeFileViewerPreviewLoadState({
        version,
        isCurrent,
        onClearLoadStarted,
        onStopLoading,
      });
    }
  }
};

export const createFileViewerSourceLoadingActionHandlers = <Session = unknown>({
  getFile,
  getUrl,
  getCurrentFilename,
  shouldStreamLocalFile,
  getPdfStreaming,
  shouldStreamRemoteUrl,
  getI18n,
  getPageHref,
  previewTarget,
  requestController,
  downloadFile,
  mountRenderedContent,
  destroyRenderSession,
  buildLoadStartState,
  buildRenderCompleteState,
  formatErrorMessage,
  onMarkLoadStarted,
  onClearLoadStarted,
  onStartLoading,
  onSetLoadingMessage,
  onStopLoading,
  onShowError,
  onClearError,
  onResetLoading,
  onClearRenderedContent,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
}: CreateFileViewerSourceLoadingActionHandlersInput<Session>): FileViewerSourceLoadingActionHandlers<Session> => {
  const isCurrentRequest = (version: number) => requestController.isCurrent(version);

  const previewLocalFile = async (
    source: FileViewerFileRef,
    version: number
  ) => {
    return await runFileViewerLocalFilePreview<Session>({
      source,
      version,
      currentFilename: getCurrentFilename?.() ?? previewTarget.filename,
      shouldStreamLocalFile,
      requestController,
      previewTarget,
      isCurrent: isCurrentRequest,
      mountRenderedContent,
      destroyRenderSession,
      buildLoadStartState: input => buildLoadStartState({
        version: input.version,
        source: 'file',
        file: input.file,
      }),
      buildRenderCompleteState: input => buildRenderCompleteState({
        version: input.version,
        source: 'file',
        file: input.file,
      }),
      onMarkLoadStarted,
      onStartLoading,
      onSession,
      onActiveDocumentContext,
      onLifecycle,
      onClearLoadStarted,
      onStopLoading,
      onError: error => {
        reportFileViewerPreviewLoadError({
          kind: 'local',
          error,
          formatErrorMessage,
          i18n: getI18n?.(),
          onErrorMessage: onShowError,
        });
      },
    });
  };

  const previewRemoteFile = async (
    url: string,
    version: number
  ) => {
    return await runFileViewerRemoteFilePreview<Session>({
      url,
      version,
      pageHref: getPageHref?.(),
      streaming: getPdfStreaming?.(),
      shouldStreamRemoteUrl,
      i18n: getI18n?.(),
      previewTarget,
      requestController,
      isCurrent: isCurrentRequest,
      downloadFile,
      mountRenderedContent,
      destroyRenderSession,
      buildLoadStartState: input => buildLoadStartState({
        version: input.version,
        source: 'url',
        sourceUrl: input.sourceUrl,
      }),
      buildRenderCompleteState: input => buildRenderCompleteState({
        version: input.version,
        source: 'url',
        file: input.file,
        sourceUrl: input.sourceUrl,
      }),
      onMarkLoadStarted,
      onStartLoading,
      onSetLoadingMessage,
      onSession,
      onActiveDocumentContext,
      onLifecycle,
      onClearLoadStarted,
      onStopLoading,
      onMissingData: () => {
        reportFileViewerMissingRemoteData({
          i18n: getI18n?.(),
          onErrorMessage: onShowError,
        });
      },
      onError: (error, kind) => {
        reportFileViewerPreviewLoadError({
          kind,
          error,
          formatErrorMessage,
          i18n: getI18n?.(),
          onErrorMessage: onShowError,
        });
      },
    });
  };

  const resetViewer = (reason?: FileViewerLifecycleContext['reason']) => {
    return commitFileViewerEmptyPreviewResetState({
      previewTarget,
      reason,
      onClearRenderedContent,
      onResetLoading,
    });
  };

  const refreshPreview = async () => {
    return await runFileViewerPreviewRequest({
      file: getFile(),
      url: getUrl(),
      requestController,
      previewTarget,
      onPreviewLocalFile: previewLocalFile,
      onPreviewRemoteFile: previewRemoteFile,
      onClearRenderedContent,
      onClearError,
      onResetLoading,
    });
  };

  const cancelPreview = (reason: FileViewerLifecycleContext['reason'] = 'component-unmount') => {
    return cancelFileViewerPreviewRequest({
      reason,
      requestController,
      previewTarget,
      onClearRenderedContent,
      onClearError,
    });
  };

  return {
    isCurrentRequest,
    previewLocalFile,
    previewRemoteFile,
    resetViewer,
    refreshPreview,
    cancelPreview,
  };
};

export const finalizeFileViewerPreviewLoadState = ({
  version,
  isCurrent,
  onClearLoadStarted,
  onStopLoading,
}: FinalizeFileViewerPreviewLoadStateInput) => {
  onClearLoadStarted?.(version);
  if (isCurrent(version)) {
    onStopLoading?.();
  }
};

export const resolveFileViewerLoadStartMessage = (
  source: FileViewerLifecycleContext['source'],
  i18n?: FileViewerI18nInput
) => {
  const messages = resolveFileViewerPreviewMessages(i18n);
  return source === 'url'
    ? messages.downloading
    : messages.reading;
};

export const commitFileViewerLoadStartState = ({
  version,
  filename,
  fallbackFilename,
  filenameTarget,
  buildState,
  onMarkLoadStarted,
  onLifecycle,
  onStartLoading,
}: CommitFileViewerLoadStartStateInput) => {
  if (filenameTarget) {
    applyFileViewerPreviewFilenameState(filenameTarget, filename, fallbackFilename);
  }
  onMarkLoadStarted?.(version);
  const loadStartState = buildState();
  onLifecycle?.(loadStartState.lifecycleContext);
  onStartLoading?.(loadStartState.loadingMessage);
  return loadStartState;
};

export const createFileViewerLoadStartState = ({
  version,
  source,
  filename,
  file,
  sourceUrl,
  bufferSize,
  loadingMessage,
  i18n,
  timestamp,
}: CreateFileViewerLoadStartStateInput): FileViewerLoadStartState => {
  return {
    loadingMessage: loadingMessage || resolveFileViewerLoadStartMessage(source, i18n),
    lifecycleContext: buildFileViewerLifecycleContext({
      phase: 'load-start',
      version,
      source,
      file,
      filename,
      url: normalizeFileViewerSourceUrl(sourceUrl) || undefined,
      bufferSize,
      timestamp,
    }),
  };
};

export const createFileViewerRenderCompleteState = ({
  version,
  source,
  filename,
  file,
  sourceUrl,
  bufferSize,
  startedAt,
  timestamp,
  lifecycleState,
}: CreateFileViewerRenderCompleteStateInput): FileViewerRenderCompleteState => {
  return {
    readiness: {
      renderedReady: true,
      progressiveReady: false,
    },
    lifecycleContext: buildFileViewerLifecycleContext({
      phase: 'load-complete',
      version,
      source,
      file,
      filename,
      url: normalizeFileViewerSourceUrl(sourceUrl) || undefined,
      bufferSize,
      startedAt: startedAt ?? lifecycleState?.getLoadStartedAt(version),
      timestamp,
    }),
  };
};

export const resolveFileViewerFileRefSourcePlan = ({
  source,
  currentFilename,
  fallbackFilename = DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
}: ResolveFileViewerFileRefSourcePlanInput): FileViewerFileRefSourcePlan => {
  const file = wrapFileViewerFileRef(source, currentFilename || fallbackFilename);
  return {
    file,
    filename: resolveFileViewerSourceFilename({ file, fallback: fallbackFilename }),
  };
};

export const normalizePdfStreamingMode = (
  mode: FileViewerPdfOptions['streaming']
): true | false | 'same-origin' => {
  if (mode === true || mode === false || mode === 'same-origin') {
    return mode;
  }
  return 'same-origin';
};

export const isSameOriginUrl = (url: string, pageHref: string) => {
  try {
    const target = new URL(url, pageHref);
    const page = new URL(pageHref);
    return target.origin === page.origin;
  } catch {
    return false;
  }
};

export const shouldStreamPdfUrl = ({
  extension,
  pageHref,
  streaming,
  url,
}: {
  extension: string;
  pageHref: string;
  streaming?: FileViewerPdfOptions['streaming'];
  url: string;
}) => {
  if (extension.toLowerCase() !== 'pdf') {
    return false;
  }

  const mode = normalizePdfStreamingMode(streaming);
  if (mode === false) {
    return false;
  }
  if (mode === true) {
    return true;
  }

  return isSameOriginUrl(url, pageHref);
};

export interface FileViewerRemoteSourcePlan {
  readonly url: string;
  readonly filename: string;
  readonly extension: string;
  readonly streamPdf: boolean;
  readonly streamRenderer: boolean;
  readonly streamType?: string;
}

export interface CommitFileViewerRemoteDownloadStateInput {
  version: number;
  data?: FileViewerFileRef | null;
  currentFilename?: string;
  fallbackFilename?: string;
  isCurrent: (version: number) => boolean;
  i18n?: FileViewerI18nInput;
  onMissingData?: () => void;
  onSetLoadingMessage?: (message: string) => void;
}

export type FileViewerRemoteDownloadState =
  | {
    readonly stale: true;
    readonly missing: false;
    readonly source: null;
  }
  | {
    readonly stale: false;
    readonly missing: true;
    readonly source: null;
  }
  | {
    readonly stale: false;
    readonly missing: false;
    readonly source: FileViewerFileRefSourcePlan;
  };

export interface FileViewerLocationLike {
  href?: string | null;
}

export const resolveFileViewerPageHref = (
  locationLike?: FileViewerLocationLike
) => {
  return locationLike?.href || undefined;
};

export const resolveFileViewerRemoteSourcePlan = ({
  filename,
  fallbackFilename = DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  pageHref,
  streaming,
  shouldStreamRemoteUrl,
  url,
}: {
  filename?: string;
  fallbackFilename?: string;
  pageHref?: string;
  streaming?: FileViewerPdfOptions['streaming'];
  shouldStreamRemoteUrl?: (input: {
    url: string;
    filename: string;
    extension: string;
    pageHref?: string;
  }) => FileViewerStreamSourceDecision;
  url: string;
}): FileViewerRemoteSourcePlan => {
  const sourceUrl = normalizeFileViewerSourceUrl(url) || url;
  const nextFilename = normalizeFilename(filename || url, fallbackFilename);
  const extension = getExtension(nextFilename);

  const streamPdf = pageHref
    ? shouldStreamPdfUrl({
      extension,
      pageHref,
      streaming,
      url: sourceUrl,
    })
    : false;

  const streamDecision = !streamPdf
    ? shouldStreamRemoteUrl?.({
      url: sourceUrl,
      filename: nextFilename,
      extension,
      pageHref,
    })
    : false;

  return {
    url: sourceUrl,
    filename: nextFilename,
    extension,
    streamPdf,
    streamRenderer: streamDecision === true || typeof streamDecision === 'string',
    streamType:
      typeof streamDecision === 'string' ? streamDecision : undefined,
  };
};

export const commitFileViewerRemoteDownloadState = ({
  version,
  data,
  currentFilename,
  fallbackFilename,
  isCurrent,
  i18n,
  onMissingData,
  onSetLoadingMessage,
}: CommitFileViewerRemoteDownloadStateInput): FileViewerRemoteDownloadState => {
  if (!isCurrent(version)) {
    return {
      stale: true,
      missing: false,
      source: null,
    };
  }

  if (!data) {
    onMissingData?.();
    return {
      stale: false,
      missing: true,
      source: null,
    };
  }

  onSetLoadingMessage?.(resolveFileViewerPreviewMessages(i18n).reading);

  return {
    stale: false,
    missing: false,
    source: resolveFileViewerFileRefSourcePlan({
      source: data,
      currentFilename,
      fallbackFilename,
    }),
  };
};

export const createFileViewerStreamingPdfPlaceholderFile = (filename?: string) => {
  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not available in the current execution environment.');
  }

  return wrapFileViewerFileRef(
    new Blob([], { type: 'application/pdf' }),
    normalizeFilename(filename, DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME)
  );
};
