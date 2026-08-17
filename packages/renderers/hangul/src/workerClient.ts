import {
  resolveFileViewerHangulWorkerUrl,
  type FileViewerHangulOptions,
} from '@file-viewer/core';
import {
  type HangulDocument,
  type HangulParseLimits,
} from './model.js';

interface HangulWorkerResponse {
  id: number;
  ok: boolean;
  document?: HangulDocument;
  error?: string;
}

let requestId = 0;

const parseLimits = (options?: FileViewerHangulOptions): Partial<HangulParseLimits> => ({
  maxUncompressedBytes: options?.maxUncompressedBytes,
  maxCompressionRatio: options?.maxCompressionRatio,
  maxEntries: options?.maxEntries,
  maxRecords: options?.maxRecords,
});

export const parseHangulWithWorker = async (
  buffer: ArrayBuffer,
  type: string | undefined,
  options?: FileViewerHangulOptions,
  signal?: AbortSignal
) => {
  const limits = Object.fromEntries(Object.entries(parseLimits(options)).filter(([, value]) => value != null));
  if (options?.useWorker === false || typeof Worker === 'undefined') {
    const { parseHangulDocument } = await import('./hangul.parser.js');
    return parseHangulDocument(buffer, type, undefined, limits);
  }
  const workerUrl = resolveFileViewerHangulWorkerUrl(
    options,
    typeof document === 'undefined' ? undefined : document.baseURI
  );
  const worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-hangul' });
  const id = ++requestId;
  const timeoutMs = Math.max(1_000, options?.workerTimeoutMs ?? 60_000);
  return new Promise<HangulDocument>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      callback();
    };
    const onAbort = () => finish(() => reject(new DOMException('Hangul parsing was aborted.', 'AbortError')));
    const timer = setTimeout(
      () => finish(() => reject(new Error(`Hangul parsing exceeded ${timeoutMs}ms.`))),
      timeoutMs
    );
    worker.addEventListener('message', (event: MessageEvent<HangulWorkerResponse>) => {
      if (event.data.id !== id) return;
      finish(() => event.data.ok && event.data.document
        ? resolve(event.data.document)
        : reject(new Error(event.data.error || 'Hangul Worker failed.')));
    });
    worker.addEventListener('error', event => finish(() => reject(new Error(event.message || 'Hangul Worker failed to load.'))));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) { onAbort(); return; }
    const transferable = buffer.slice(0);
    worker.postMessage({ id, buffer: transferable, type, limits }, [transferable]);
  });
};
