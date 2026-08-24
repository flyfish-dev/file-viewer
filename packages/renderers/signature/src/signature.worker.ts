/// <reference lib="webworker" />
import type { SignatureWorkerRequest, SignatureWorkerResponse } from './workerProtocol.js';

type RpgpWasmModule = {
  default(input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module): Promise<unknown>;
  classify_openpgp(input: Uint8Array, limits: unknown): unknown;
  inspect_openpgp(input: Uint8Array, limits: unknown): unknown;
  verify_detached_signature(content: Uint8Array, signature: Uint8Array, publicKeys: Uint8Array[], limits: unknown): unknown;
};

const scope = self as unknown as DedicatedWorkerGlobalScope;
let wasmPromise: Promise<RpgpWasmModule> | undefined;

const loadWasm = async () => {
  if (wasmPromise) return wasmPromise;
  wasmPromise = (async () => {
    try {
      const moduleUrl = new URL('./rpgp-wasm/rpgp_wrapper.js', import.meta.url).href;
      const wasmUrl = new URL('./rpgp-wasm/rpgp_wrapper_bg.wasm', import.meta.url);
      const module = await import(/* @vite-ignore */ moduleUrl) as RpgpWasmModule;
      await module.default(wasmUrl);
      return module;
    } catch (error) {
      wasmPromise = undefined;
      throw Object.assign(
        new Error(error instanceof Error ? error.message : String(error)),
        { code: 'wasm-initialization-failed' }
      );
    }
  })();
  return wasmPromise;
};

const errorResponse = (id: string, error: unknown): SignatureWorkerResponse => ({
  id,
  ok: false,
  error: {
    code: typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code) as never
      : 'internal-parser-error',
    message: error instanceof Error ? error.message : String(error),
  },
});

scope.addEventListener('message', async (event: MessageEvent<SignatureWorkerRequest>) => {
  const request = event.data;
  try {
    const wasm = await loadWasm();
    let response: SignatureWorkerResponse;
    switch (request.type) {
      case 'classify':
        response = {
          id: request.id,
          ok: true,
          type: 'classify',
          result: wasm.classify_openpgp(new Uint8Array(request.input), request.limits) as never,
        };
        break;
      case 'inspect':
        response = {
          id: request.id,
          ok: true,
          type: 'inspect',
          result: wasm.inspect_openpgp(new Uint8Array(request.input), request.limits) as never,
        };
        break;
      case 'verify-detached':
        response = {
          id: request.id,
          ok: true,
          type: 'verify-detached',
          result: wasm.verify_detached_signature(
            new Uint8Array(request.content),
            new Uint8Array(request.signature),
            request.publicKeys.map(value => new Uint8Array(value)),
            request.limits
          ) as never,
        };
        break;
      default:
        throw Object.assign(new Error('Unknown signature Worker request.'), { code: 'invalid-input' });
    }
    scope.postMessage(response);
  } catch (error) {
    scope.postMessage(errorResponse(request.id, error));
  }
});
