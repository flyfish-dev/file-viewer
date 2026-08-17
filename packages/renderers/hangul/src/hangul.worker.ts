/// <reference lib="webworker" />
import { parseHangulDocument } from './parser.js';
import type { HangulParseLimits } from './model.js';

interface HangulWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  type?: string;
  limits?: Partial<HangulParseLimits>;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener('message', async (event: MessageEvent<HangulWorkerRequest>) => {
  const { id, buffer, type, limits } = event.data;
  try {
    const document = await parseHangulDocument(buffer, type, undefined, limits);
    workerScope.postMessage({ id, ok: true, document });
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
