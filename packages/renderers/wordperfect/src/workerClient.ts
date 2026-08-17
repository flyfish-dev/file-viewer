import {
  resolveFileViewerWordPerfectWorkerUrl,
  resolveFileViewerWordPerfectWasmUrl,
  type FileViewerWordPerfectOptions,
} from '@file-viewer/core';
import { parseWordPerfectDocument, type WordPerfectDocument } from './parser.js';

let requestId = 0;

export const parseWordPerfectWithWorker = (
  buffer: ArrayBuffer,
  options?: FileViewerWordPerfectOptions,
  signal?: AbortSignal
): Promise<WordPerfectDocument> => {
  if (options?.useWorker === false || typeof Worker === 'undefined') {
    return Promise.resolve(parseWordPerfectDocument(buffer));
  }
  const workerUrl = resolveFileViewerWordPerfectWorkerUrl(
    options,
    typeof document === 'undefined' ? undefined : document.baseURI
  );
  const wasmUrl = resolveFileViewerWordPerfectWasmUrl(
    options,
    typeof document === 'undefined' ? undefined : document.baseURI
  );
  const worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-wordperfect' });
  const id = ++requestId;
  const timeoutMs = Math.max(1_000, options?.workerTimeoutMs ?? 60_000);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      callback();
    };
    const onAbort = () => finish(() => reject(new DOMException('WordPerfect parsing was aborted.', 'AbortError')));
    const timer = setTimeout(
      () => finish(() => reject(new Error(`WordPerfect parsing exceeded ${timeoutMs}ms.`))),
      timeoutMs
    );
    worker.addEventListener('message', (event: MessageEvent<{ id: number; ok: boolean; document?: WordPerfectDocument; error?: string }>) => {
      if (event.data.id !== id) return;
      finish(() => event.data.ok && event.data.document
        ? resolve(event.data.document)
        : reject(new Error(event.data.error || 'WordPerfect Worker failed.')));
    });
    worker.addEventListener('error', event => finish(() => reject(new Error(event.message || 'WordPerfect Worker failed to load.'))));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) return onAbort();
    const transferable = buffer.slice(0);
    worker.postMessage({ id, buffer: transferable, wasmUrl }, [transferable]);
  });
};
