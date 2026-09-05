/// <reference lib="webworker" />
import { decodeChmText, extractChmSearchText, normalizeChmPath } from './security.js';
import { normalizeChmEntries, normalizeChmManifest, type ChmManifest, type ChmParseLimits } from './model.js';
import type { ChmSearchHit } from './model.js';
import type { ChmWorkerRequest, ChmWorkerResponse } from './workerProtocol.js';

interface ChmArchiveHandle {
  manifest(): unknown;
  entries(): unknown;
  read(path: string): Uint8Array;
  dispose?(): void;
  free?(): void;
}

interface ChmWasmModule {
  default?: (input?: unknown) => Promise<unknown>;
  ChmArchive: new (bytes: Uint8Array, limits?: ChmParseLimits) => ChmArchiveHandle;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let archive: ChmArchiveHandle | undefined;
let manifest: ChmManifest | undefined;
let activeLimits: ChmParseLimits | undefined;
let totalReadBytes = 0;
const countedReadPaths = new Set<string>();

const post = (response: ChmWorkerResponse, transfer: Transferable[] = []) => {
  workerScope.postMessage(response, transfer);
};

const progress = (phase: Extract<ChmWorkerResponse, { type: 'progress' }>['phase'], current: number, total?: number) => {
  post({ id: 0, ok: true, type: 'progress', phase, current, total });
};

const disposeArchive = () => {
  if (!archive) return;
  try {
    archive.dispose?.();
  } finally {
    try {
      archive.free?.();
    } catch {
      // wasm-bindgen free may already have run from dispose().
    }
    archive = undefined;
    manifest = undefined;
    activeLimits = undefined;
    totalReadBytes = 0;
    countedReadPaths.clear();
  }
};

const parseErrorCode = (message: string) => {
  const match = message.match(/^([A-Z][A-Z0-9_]+):/);
  return match?.[1];
};

const serializeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return {
    name: error instanceof Error ? error.name : 'Error',
    message,
    code: parseErrorCode(message),
  };
};

const loadWasm = async (moduleUrl: string, wasmUrl: string) => {
  progress('wasm', 0, 1);
  const loaded = await import(/* @vite-ignore */ moduleUrl) as ChmWasmModule;
  if (typeof loaded.default === 'function') {
    await loaded.default({ module_or_path: wasmUrl });
  }
  if (typeof loaded.ChmArchive !== 'function') {
    throw new Error('CHM_WASM_API_MISMATCH: ChmArchive is not exported by the WASM module.');
  }
  progress('wasm', 1, 1);
  return loaded;
};

const openArchive = async (request: Extract<ChmWorkerRequest, { type: 'open' }>) => {
  disposeArchive();
  if (request.buffer.byteLength > request.limits.maxArchiveBytes) {
    throw new Error(
      `CHM_LIMIT_EXCEEDED: source is ${request.buffer.byteLength} bytes; limit is ${request.limits.maxArchiveBytes}.`
    );
  }
  const loaded = await loadWasm(request.moduleUrl, request.wasmUrl);
  progress('directory', 0, 1);
  archive = new loaded.ChmArchive(new Uint8Array(request.buffer), request.limits);
  activeLimits = request.limits;
  const entries = normalizeChmEntries(archive.entries());
  if (entries.length > request.limits.maxEntries) {
    throw new Error(`CHM_LIMIT_EXCEEDED: ${entries.length} entries exceed limit ${request.limits.maxEntries}.`);
  }
  progress('directory', 1, 1);
  progress('manifest', 0, 1);
  manifest = normalizeChmManifest(archive.manifest());
  progress('manifest', 1, 1);
  return { manifest, entries };
};

const assertArchive = () => {
  if (!archive || !manifest || !activeLimits) throw new Error('CHM_NOT_OPEN: no CHM archive is active in this Worker.');
  return { archive, manifest, limits: activeLimits };
};

const readBounded = (path: string) => {
  const current = assertArchive();
  const bytes = current.archive.read(path);
  if (bytes.byteLength > current.limits.maxEntryBytes) {
    throw new Error(`CHM_LIMIT_EXCEEDED: entry ${path} exceeds ${current.limits.maxEntryBytes} bytes.`);
  }
  const key = path.toLocaleLowerCase();
  if (!countedReadPaths.has(key)) {
    const nextTotal = totalReadBytes + bytes.byteLength;
    if (nextTotal > current.limits.maxTotalDecompressedBytes) {
      throw new Error(
        `CHM_LIMIT_EXCEEDED: unique decoded content exceeds ${current.limits.maxTotalDecompressedBytes} bytes.`
      );
    }
    countedReadPaths.add(key);
    totalReadBytes = nextTotal;
  }
  return bytes;
};

const copyRead = (path: string) => {
  const normalized = normalizeChmPath(path);
  if (!normalized) throw new Error('CHM_BAD_PATH: the requested entry path is invalid.');
  const view = readBounded(normalized);
  return view.byteOffset === 0 && view.byteLength === view.buffer.byteLength
    ? view
    : view.slice();
};

const createSnippet = (text: string, query: string) => {
  const folded = text.toLocaleLowerCase();
  const index = folded.indexOf(query);
  if (index < 0) return '';
  const start = Math.max(0, index - 72);
  const end = Math.min(text.length, index + query.length + 128);
  return `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
};

const searchArchive = (queryInput: string, limit: number, maxTopics: number) => {
  const current = assertArchive();
  const query = queryInput.trim().toLocaleLowerCase();
  if (!query) return { hits: [] as ChmSearchHit[], inspected: 0, truncated: false };
  const hits: ChmSearchHit[] = [];
  const seen = new Set<string>();
  const topics = current.manifest.topics.slice(0, Math.max(1, maxTopics));
  let inspected = 0;
  progress('search', 0, topics.length);
  for (const topic of topics) {
    if (hits.length >= limit) break;
    const normalizedPath = normalizeChmPath(topic.path);
    if (!normalizedPath || seen.has(normalizedPath.toLocaleLowerCase())) continue;
    seen.add(normalizedPath.toLocaleLowerCase());
    inspected += 1;
    const titleMatch = topic.title.toLocaleLowerCase().includes(query);
    let snippet = '';
    try {
      const bytes = readBounded(normalizedPath);
      const text = extractChmSearchText(decodeChmText(bytes, current.manifest.encoding));
      snippet = createSnippet(text, query);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('CHM_LIMIT_EXCEEDED:')) throw error;
      // One malformed topic must not abort search across the rest of the help file.
    }
    if (titleMatch || snippet) hits.push({ title: topic.title || normalizedPath, path: normalizedPath, snippet, titleMatch });
    if (inspected % 64 === 0) progress('search', inspected, topics.length);
  }
  progress('search', inspected, topics.length);
  return { hits, inspected, truncated: topics.length < current.manifest.topics.length || hits.length >= limit };
};

workerScope.addEventListener('message', async (event: MessageEvent<ChmWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'open') {
      const result = await openArchive(request);
      post({ id: request.id, ok: true, type: 'open', ...result });
      return;
    }
    if (request.type === 'read') {
      const data = copyRead(request.path);
      post({ id: request.id, ok: true, type: 'read', data }, [data.buffer]);
      return;
    }
    if (request.type === 'search') {
      const result = searchArchive(request.query, Math.max(1, request.limit), Math.max(1, request.maxTopics));
      post({ id: request.id, ok: true, type: 'search', ...result });
      return;
    }
    disposeArchive();
    post({ id: request.id, ok: true, type: 'close' });
  } catch (error) {
    if (request.type === 'open') disposeArchive();
    post({ id: request.id, ok: false, type: request.type, error: serializeError(error) });
  }
});
