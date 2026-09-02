/* tslint:disable */
/* eslint-disable */

/**
 * A parsed CHM archive whose bytes remain private to the WASM instance.
 */
export class ChmArchive {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Release archive bytes and all decompression caches immediately.
     */
    dispose(): void;
    /**
     * Return the complete bounded directory listing.
     */
    entries(): any;
    /**
     * Return renderer-ready metadata, topics, contents and keyword index.
     */
    manifest(): any;
    /**
     * Validate and open an archive. `limits` is an optional JS object using
     * camelCase fields from [`Limits`].
     */
    constructor(bytes: Uint8Array, limits?: any | null);
    /**
     * Read one internal path. Compressed entries are decoded by reset block and
     * cached, so sequential topic/assets do not inflate the entire CHM.
     */
    read(path: string): Uint8Array;
    readonly disposed: boolean;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_chmarchive_free: (a: number, b: number) => void;
    readonly chmarchive_new: (a: number, b: number, c: number, d: number) => void;
    readonly chmarchive_manifest: (a: number, b: number) => void;
    readonly chmarchive_entries: (a: number, b: number) => void;
    readonly chmarchive_read: (a: number, b: number, c: number, d: number) => void;
    readonly chmarchive_dispose: (a: number) => void;
    readonly chmarchive_disposed: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
