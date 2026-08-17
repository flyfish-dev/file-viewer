/// <reference lib="webworker" />
import { parseWordPerfectDocument } from './parser.js';
import { parseWordPerfectWithLibWpd } from './libwpd.js';

interface WordPerfectWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  wasmUrl?: string;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener('message', async (event: MessageEvent<WordPerfectWorkerRequest>) => {
  const { id, buffer } = event.data;
  try {
    const moduleUrl = new URL('libwpd.mjs', workerScope.location.href).href;
    const wasmUrl = event.data.wasmUrl || new URL('libwpd.wasm', workerScope.location.href).href;
    let document;
    try {
      document = await parseWordPerfectWithLibWpd(buffer, moduleUrl, wasmUrl);
    } catch (error) {
      document = parseWordPerfectDocument(buffer);
      document.warnings.unshift(`Structured libwpd WebAssembly parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    workerScope.postMessage({ id, ok: true, document });
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
