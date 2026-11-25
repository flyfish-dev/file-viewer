import {
  buildFileViewerOperationContextFromLifecycleState,
  createFileViewerLifecycleActions,
  createFileViewerLifecycleStateController,
  emitFileViewerComponentLifecycleEvent,
  resolveFileViewerBeforeOperationErrorMessage,
  type FileViewerActiveUnloadState,
  type FileViewerLifecycleActions,
  type FileViewerLifecycleComponentEmit,
} from './operations';
import {
  createFileViewerLoadStartState,
  createFileViewerRenderCompleteState,
  type FileViewerLoadStartState,
  type FileViewerRenderCompleteState,
} from '../source/loading';
import type { FileViewerErrorMessageFormatter } from '../viewer/state';
import type {
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
} from '../contracts/types';

export interface BuildFileViewerLifecycleFacadeLoadStartStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  file?: File | null;
  sourceUrl?: string | null;
}

export interface BuildFileViewerLifecycleFacadeRenderCompleteStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  file?: File | null;
  sourceUrl?: string | null;
}

export interface CreateFileViewerLifecycleFacadeInput {
  getOptions: () => FileViewerOptions | undefined;
  getFilename: () => string;
  getBufferSize: () => number | undefined;
  getCurrentFile: () => File | null;
  getCurrentVersion: () => number;
  getFallbackFile: () => FileViewerFileRef | null | undefined;
  getFallbackUrl: () => string | null | undefined;
  emitLifecycle: FileViewerLifecycleComponentEmit;
  emitOperationBefore: (context: FileViewerOperationContext) => void;
  emitOperationCancel: (context: FileViewerOperationContext) => void;
  formatErrorMessage: FileViewerErrorMessageFormatter;
  handleLifecycleError: (error: unknown, context: FileViewerLifecycleContext) => void;
  handleOperationError?: (error: unknown, context: FileViewerOperationContext) => void;
  onOperationErrorMessage?: (message: string, context: FileViewerOperationContext) => void;
}

export interface FileViewerLifecycleFacade {
  markLoadStarted(version: number, timestamp?: number): void;
  clearLoadStarted(version: number): void;
  notifyLifecycle: FileViewerLifecycleActions['notifyLifecycle'];
  notifyActiveUnloadStart(reason?: FileViewerLifecycleContext['reason']): FileViewerLifecycleContext | null;
  notifyActiveUnloadComplete(
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason']
  ): FileViewerActiveUnloadState;
  setActiveDocumentContext(context: FileViewerLifecycleContext): void;
  clearActiveDocumentContext(): void;
  buildOperationContext(operation: FileViewerOperationType): FileViewerOperationContext;
  buildLoadStartState(input: BuildFileViewerLifecycleFacadeLoadStartStateInput): FileViewerLoadStartState;
  buildRenderCompleteState(input: BuildFileViewerLifecycleFacadeRenderCompleteStateInput): FileViewerRenderCompleteState;
  runBeforeOperation(operation: FileViewerOperationType): Promise<boolean>;
}

export const createFileViewerLifecycleFacade = ({
  getOptions,
  getFilename,
  getBufferSize,
  getCurrentFile,
  getCurrentVersion,
  getFallbackFile,
  getFallbackUrl,
  emitLifecycle,
  emitOperationBefore,
  emitOperationCancel,
  formatErrorMessage,
  handleLifecycleError,
  handleOperationError,
  onOperationErrorMessage,
}: CreateFileViewerLifecycleFacadeInput): FileViewerLifecycleFacade => {
  const lifecycleState = createFileViewerLifecycleStateController();
  const lifecycleActions = createFileViewerLifecycleActions({
    lifecycleState,
    getOptions,
    onLifecycleChange: (_event, context) => {
      emitFileViewerComponentLifecycleEvent(emitLifecycle, context);
    },
    onLifecycleError: handleLifecycleError,
    onOperationBefore: emitOperationBefore,
    onOperationCancel: emitOperationCancel,
    onOperationError: (error, context) => {
      handleOperationError?.(error, context);
      onOperationErrorMessage?.(
        resolveFileViewerBeforeOperationErrorMessage({
          error,
          formatErrorMessage,
          i18n: getOptions(),
        }),
        context
      );
    },
  });

  const buildOperationContext = (operation: FileViewerOperationType): FileViewerOperationContext => {
    return buildFileViewerOperationContextFromLifecycleState({
      operation,
      lifecycleState,
      version: getCurrentVersion(),
      filename: getFilename(),
      bufferSize: getBufferSize(),
      currentFile: getCurrentFile(),
      fallbackFile: getFallbackFile(),
      fallbackUrl: getFallbackUrl(),
      i18n: getOptions(),
    });
  };

  return {
    markLoadStarted: lifecycleState.markLoadStarted,
    clearLoadStarted: lifecycleState.clearLoadStarted,
    notifyLifecycle: lifecycleActions.notifyLifecycle,
    notifyActiveUnloadStart: lifecycleActions.notifyActiveUnloadStart,
    notifyActiveUnloadComplete: lifecycleActions.notifyActiveUnloadComplete,
    setActiveDocumentContext: lifecycleState.setActiveDocumentContext,
    clearActiveDocumentContext: lifecycleState.clearActiveDocumentContext,
    buildOperationContext,
    buildLoadStartState({
      version,
      source,
      file,
      sourceUrl,
    }: BuildFileViewerLifecycleFacadeLoadStartStateInput) {
      return createFileViewerLoadStartState({
        version,
        source,
        file,
        sourceUrl,
        filename: getFilename(),
        bufferSize: getBufferSize(),
        i18n: getOptions(),
      });
    },
    buildRenderCompleteState({
      version,
      source,
      file,
      sourceUrl,
    }: BuildFileViewerLifecycleFacadeRenderCompleteStateInput) {
      return createFileViewerRenderCompleteState({
        version,
        source,
        file,
        sourceUrl,
        filename: getFilename(),
        bufferSize: getBufferSize(),
        lifecycleState,
      });
    },
    runBeforeOperation(operation: FileViewerOperationType) {
      return lifecycleActions.runBeforeOperation(buildOperationContext(operation));
    },
  };
};
