import {
  DEFAULT_FILE_VIEWER_CHM_WASM_MODULE_PATH,
  DEFAULT_FILE_VIEWER_CHM_WASM_PATH,
  DEFAULT_FILE_VIEWER_CHM_WORKER_PATH,
  resolveFileViewerChmWasmModuleUrl,
  resolveFileViewerChmWasmUrl,
  resolveFileViewerChmWorkerUrl,
} from '@file-viewer/core';
import type { FileViewerChmOptions } from './model.js';
import { resolveChmOptions } from './model.js';
import type {
  ChmOpenResult,
  ChmSearchResult,
  ChmWorkerRequest,
  ChmWorkerResponse,
} from './workerProtocol.js';

export const DEFAULT_CHM_WORKER_PATH = DEFAULT_FILE_VIEWER_CHM_WORKER_PATH;
export const DEFAULT_CHM_WASM_MODULE_PATH = DEFAULT_FILE_VIEWER_CHM_WASM_MODULE_PATH;
export const DEFAULT_CHM_WASM_PATH = DEFAULT_FILE_VIEWER_CHM_WASM_PATH;

export interface ChmWorkerProgress {
  phase: 'wasm' | 'directory' | 'manifest' | 'search';
  current: number;
  total?: number;
}

type SuccessfulResponse = Exclude<ChmWorkerResponse, { ok: false } | { type: 'progress' }>;
type ChmWorkerRequestPayload = ChmWorkerRequest extends infer Request
  ? Request extends { id: number } ? Omit<Request, 'id'> : never
  : never;

interface PendingRequest {
  expectedType: SuccessfulResponse['type'];
  resolve(value: SuccessfulResponse): void;
  reject(error: unknown): void;
  timer: ReturnType<typeof setTimeout>;
}

const makeWorkerError = (response: Extract<ChmWorkerResponse, { ok: false }>) => {
  const error = new Error(response.error.message || 'CHM Worker failed.');
  error.name = response.error.name || 'Error';
  if (response.error.code) Object.defineProperty(error, 'code', { value: response.error.code });
  return error;
};

export class ChmWorkerClient {
  readonly options: ReturnType<typeof resolveChmOptions>;
  private readonly worker: Worker;
  private readonly moduleUrl: string;
  private readonly wasmUrl: string;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly onProgress?: (progress: ChmWorkerProgress) => void;
  private requestId = 0;
  private destroyed = false;

  constructor(options?: FileViewerChmOptions, onProgress?: (progress: ChmWorkerProgress) => void) {
    if (typeof Worker === 'undefined') {
      throw new Error('CHM_WORKER_UNAVAILABLE: this browser does not support Web Workers.');
    }
    this.options = resolveChmOptions(options);
    const documentBaseUrl = typeof document === 'undefined' ? undefined : document.baseURI;
    this.moduleUrl = resolveFileViewerChmWasmModuleUrl(options, documentBaseUrl);
    this.wasmUrl = resolveFileViewerChmWasmUrl(options, documentBaseUrl);
    this.onProgress = onProgress;
    const workerUrl = resolveFileViewerChmWorkerUrl(options, documentBaseUrl);
    this.worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-chm' });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);
    this.worker.addEventListener('messageerror', this.handleMessageError);
  }

  private handleMessage = (event: MessageEvent<ChmWorkerResponse>) => {
    const response = event.data;
    if (response.type === 'progress') {
      this.onProgress?.({ phase: response.phase, current: response.current, total: response.total });
      return;
    }
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    clearTimeout(pending.timer);
    if (!response.ok) {
      pending.reject(makeWorkerError(response));
      return;
    }
    if (response.type !== pending.expectedType) {
      pending.reject(new Error(`CHM_WORKER_PROTOCOL: expected ${pending.expectedType}, received ${response.type}.`));
      return;
    }
    pending.resolve(response);
  };

  private handleError = (event: ErrorEvent) => {
    this.fail(new Error(event.message || 'CHM Worker failed to load.'));
  };

  private handleMessageError = () => {
    this.fail(new Error('CHM_WORKER_PROTOCOL: the browser could not deserialize a Worker response.'));
  };

  private rejectAll(error: unknown) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private fail(error: unknown) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.rejectAll(error);
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    this.worker.removeEventListener('messageerror', this.handleMessageError);
    this.worker.terminate();
  }

  private request<T extends SuccessfulResponse>(
    request: ChmWorkerRequestPayload,
    expectedType: T['type'],
    transfer: Transferable[] = [],
    signal?: AbortSignal
  ): Promise<T> {
    if (this.destroyed) return Promise.reject(new Error('CHM_WORKER_CLOSED: the CHM session has been destroyed.'));
    if (signal?.aborted) return Promise.reject(new DOMException('CHM operation was aborted.', 'AbortError'));
    const id = ++this.requestId;
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        clearTimeout(pending.timer);
        reject(new DOMException('CHM operation was aborted.', 'AbortError'));
      };
      const timer = setTimeout(() => {
        this.pending.delete(id);
        signal?.removeEventListener('abort', onAbort);
        const error = new Error(`CHM_WORKER_TIMEOUT: ${expectedType} exceeded ${this.options.workerTimeoutMs}ms.`);
        reject(error);
        this.fail(error);
      }, this.options.workerTimeoutMs);
      this.pending.set(id, {
        expectedType,
        timer,
        resolve: response => {
          signal?.removeEventListener('abort', onAbort);
          resolve(response as T);
        },
        reject: error => {
          signal?.removeEventListener('abort', onAbort);
          reject(error);
        },
      });
      signal?.addEventListener('abort', onAbort, { once: true });
      this.worker.postMessage({ ...request, id } as ChmWorkerRequest, transfer);
    });
  }

  async open(buffer: ArrayBuffer, signal?: AbortSignal): Promise<ChmOpenResult> {
    if (buffer.byteLength > this.options.maxArchiveBytes) {
      const error = new Error(
        `CHM_LIMIT_EXCEEDED: source is ${buffer.byteLength} bytes; limit is ${this.options.maxArchiveBytes}.`
      );
      Object.defineProperty(error, 'code', { value: 'CHM_LIMIT_EXCEEDED' });
      throw error;
    }
    const copy = buffer.slice(0);
    const response = await this.request<Extract<SuccessfulResponse, { type: 'open' }>>({
      type: 'open',
      buffer: copy,
      moduleUrl: this.moduleUrl,
      wasmUrl: this.wasmUrl,
      limits: {
        maxArchiveBytes: this.options.maxArchiveBytes,
        maxFileBytes: this.options.maxArchiveBytes,
        maxEntries: this.options.maxEntries,
        maxEntryBytes: this.options.maxEntryBytes,
        maxTotalDecompressedBytes: this.options.maxTotalDecompressedBytes,
        maxTotalDeclaredBytes: this.options.maxTotalDecompressedBytes,
        maxMetadataBytes: this.options.maxHtmlBytes,
        maxSitemapNodes: this.options.maxEntries,
        maxSitemapDepth: 256,
      },
    }, 'open', [copy], signal);
    return { manifest: response.manifest, entries: response.entries };
  }

  async read(path: string, signal?: AbortSignal): Promise<Uint8Array> {
    const response = await this.request<Extract<SuccessfulResponse, { type: 'read' }>>(
      { type: 'read', path },
      'read',
      [],
      signal
    );
    return response.data;
  }

  async search(query: string, signal?: AbortSignal): Promise<ChmSearchResult> {
    const response = await this.request<Extract<SuccessfulResponse, { type: 'search' }>>({
      type: 'search',
      query,
      limit: this.options.maxSearchResults,
      maxTopics: this.options.maxSearchTopics,
    }, 'search', [], signal);
    return { hits: response.hits, inspected: response.inspected, truncated: response.truncated };
  }

  destroy() {
    this.fail(new DOMException('CHM session was destroyed.', 'AbortError'));
  }
}
