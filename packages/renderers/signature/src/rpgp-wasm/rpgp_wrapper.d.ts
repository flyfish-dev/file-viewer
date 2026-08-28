declare const initializeRpgp: (
  input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module
) => Promise<unknown>

export default initializeRpgp
export declare const classify_openpgp: (input: Uint8Array, limits: unknown) => unknown
export declare const inspect_openpgp: (
  input: Uint8Array,
  publicKeys: Uint8Array[],
  limits: unknown
) => unknown
export declare const verify_detached_signature: (
  content: Uint8Array,
  signature: Uint8Array,
  publicKeys: Uint8Array[],
  limits: unknown
) => unknown
