/// <reference lib="webworker" />
import { parseIworkDocument } from './parser.js';
import type { IworkParseLimits } from './model.js';

interface IworkWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  type?: string;
  limits?: Partial<IworkParseLimits>;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener('message', async (event: MessageEvent<IworkWorkerRequest>) => {
  const { id, buffer, type, limits } = event.data;
  try {
    const document = await parseIworkDocument(buffer, type, limits);
    workerScope.postMessage({ id, ok: true, document });
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        actualRendererId: error && typeof error === 'object' && 'actualRendererId' in error
          ? String(error.actualRendererId)
          : undefined,
      },
    });
  }
});
