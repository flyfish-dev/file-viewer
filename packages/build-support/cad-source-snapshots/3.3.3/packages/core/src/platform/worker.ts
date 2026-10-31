export type WorkerProvider = () => Worker;

export type FileViewerWorkerFactory = () => Worker | undefined;

export type FileViewerWorkerEventHandler = (payload: any) => void;

export type FileViewerWorkerMessageHook = (event: MessageEvent) => void;

export type FileViewerWorkerErrorHook = (event: ErrorEvent) => void;

export interface FileViewerWorkerContext {
  emit(type: string, payload: any): void;
}

export interface CreateFileViewerWorkerControllerOptions {
  logErrors?: boolean;
}

export interface FileViewerWorkerController {
  readonly instance: Worker | undefined;
  readonly worker: FileViewerWorkerContext;
  emit(type: string, payload: any): void;
  onWorkerMessage(hook: FileViewerWorkerMessageHook): () => void;
  onWorkerError(hook: FileViewerWorkerErrorHook): () => void;
  onWorkerEvent(type: string, hook: FileViewerWorkerEventHandler): () => void;
  mapEvents(mappings: Array<string> | Record<string, string>): Record<string, (payload: any) => void>;
  destroy(): void;
}

export interface WorkerRef {
  name: string;
  worker: Worker | null;
  defaults(provider: WorkerProvider): Worker;
}

export class WorkerRefImpl implements WorkerRef {
  public readonly name: string;
  public worker: Worker | null;

  constructor(nameOrWorker: string | Worker | null, worker: Worker | null = null) {
    if (typeof nameOrWorker === 'string') {
      this.name = nameOrWorker;
      this.worker = worker;
      return;
    }

    this.name = '';
    this.worker = nameOrWorker;
  }

  defaults(provider: WorkerProvider): Worker {
    if (!this.worker) {
      this.worker = provider();
    }
    return this.worker;
  }
}

export const refWorker = (name: string, _module = false): WorkerRef => {
  return new WorkerRefImpl(name, null);
};

export const createFileViewerWorkerController = (
  factory: FileViewerWorkerFactory,
  options: CreateFileViewerWorkerControllerOptions = {}
): FileViewerWorkerController => {
  const instance = factory();
  const eventHandlers = new Map<string, Set<FileViewerWorkerEventHandler>>();
  const messageHooks = new Set<FileViewerWorkerMessageHook>();
  const errorHooks = new Set<FileViewerWorkerErrorHook>();

  const emit = (type: string, payload: any) => {
    instance?.postMessage({
      type,
      payload,
    });
  };

  const handleMessage = (event: MessageEvent) => {
    const { type, payload } = event.data || {};
    const handlers = eventHandlers.get(type);
    handlers?.forEach(handler => handler(payload));
    messageHooks.forEach(hook => hook(event));
  };

  const handleError = (event: ErrorEvent) => {
    if (options.logErrors !== false) {
      console.error(event);
    }
    errorHooks.forEach(hook => hook(event));
  };

  instance?.addEventListener('message', handleMessage);
  instance?.addEventListener('error', handleError);

  const worker: FileViewerWorkerContext = {
    emit,
  };

  return {
    instance,
    worker,
    emit,
    onWorkerMessage(hook: FileViewerWorkerMessageHook) {
      messageHooks.add(hook);
      return () => {
        messageHooks.delete(hook);
      };
    },
    onWorkerError(hook: FileViewerWorkerErrorHook) {
      errorHooks.add(hook);
      return () => {
        errorHooks.delete(hook);
      };
    },
    onWorkerEvent(type: string, hook: FileViewerWorkerEventHandler) {
      let handlers = eventHandlers.get(type);
      if (!handlers) {
        handlers = new Set<FileViewerWorkerEventHandler>();
        eventHandlers.set(type, handlers);
      }
      handlers.add(hook);
      return () => {
        handlers?.delete(hook);
        if (handlers?.size === 0) {
          eventHandlers.delete(type);
        }
      };
    },
    mapEvents(mappings: Array<string> | Record<string, string>) {
      if (Array.isArray(mappings)) {
        return mappings.reduce<Record<string, (payload: any) => void>>((result, key) => {
          result[key] = (payload: any) => emit(key, payload);
          return result;
        }, {});
      }
      return Object.keys(mappings).reduce<Record<string, (payload: any) => void>>((result, key) => {
        const name = mappings[key];
        result[name] = (payload: any) => emit(key, payload);
        return result;
      }, {});
    },
    destroy() {
      instance?.removeEventListener('message', handleMessage);
      instance?.removeEventListener('error', handleError);
      instance?.terminate();
      eventHandlers.clear();
      messageHooks.clear();
      errorHooks.clear();
    },
  };
};
