/* @ts-self-types="./stet_wasm.d.ts" */

/**
 * A fully initialized PostScript interpreter context.
 *
 * Created once via `create_interpreter()`, reused across `render()` calls.
 */
export class Interpreter {
    static __wrap(ptr) {
        const obj = Object.create(Interpreter.prototype);
        obj.__wbg_ptr = ptr;
        InterpreterFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InterpreterFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_interpreter_free(ptr, 0);
    }
}
if (Symbol.dispose) Interpreter.prototype[Symbol.dispose] = Interpreter.prototype.free;

/**
 * A single rendered page with dimensions and RGBA pixel data.
 */
export class Page {
    static __wrap(ptr) {
        const obj = Object.create(Page.prototype);
        obj.__wbg_ptr = ptr;
        PageFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PageFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_page_free(ptr, 0);
    }
    /**
     * Page height in pixels.
     * @returns {number}
     */
    get height() {
        const ret = wasm.page_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * RGBA pixel data (4 bytes per pixel, row-major).
     * @returns {Uint8Array}
     */
    get rgba() {
        const ret = wasm.page_rgba(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Page width in pixels.
     * @returns {number}
     */
    get width() {
        const ret = wasm.page_width(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) Page.prototype[Symbol.dispose] = Page.prototype.free;

/**
 * Clear the page callback.
 */
export function clear_page_callback() {
    wasm.clear_page_callback();
}

/**
 * Apply browser safety limits before interpreting an untrusted program.
 *
 * The VM cap counts both local and global PostScript allocations. The owning
 * browser Worker remains the hard wall-clock boundary: `std::time::Instant`
 * is unavailable on `wasm32-unknown-unknown`, so the UI client terminates the
 * Worker when its budget expires.
 * @param {Interpreter} interp
 * @param {number} max_vm_bytes
 */
export function configure_limits(interp, max_vm_bytes) {
    _assertClass(interp, Interpreter);
    wasm.configure_limits(interp.__wbg_ptr, max_vm_bytes);
}

/**
 * @returns {Interpreter}
 */
export function create_interpreter() {
    const ret = wasm.create_interpreter();
    return Interpreter.__wrap(ret);
}

/**
 * Open a PDF file and parse its structure (xref, page tree, page sizes).
 *
 * Does **not** interpret page content streams — those are built on demand by
 * `render_pdf_page` (or implicitly by the first `render_viewport` /
 * `render_viewport_band` call for that page). This keeps the initial call
 * fast on large documents: a 500-page PDF returns its page count and
 * per-page dimensions in milliseconds instead of seconds.
 *
 * Returns the number of pages, or throws on parse error.
 * @param {Interpreter} interp
 * @param {Uint8Array} pdf_data
 * @param {number} dpi
 * @returns {any}
 */
export function open_pdf(interp, pdf_data, dpi) {
    _assertClass(interp, Interpreter);
    const ptr0 = passArray8ToWasm0(pdf_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.open_pdf(interp.__wbg_ptr, ptr0, len0, dpi);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Get the number of pages available for viewport rendering.
 * @param {Interpreter} interp
 * @returns {number}
 */
export function page_count(interp) {
    _assertClass(interp, Interpreter);
    const ret = wasm.page_count(interp.__wbg_ptr);
    return ret >>> 0;
}

/**
 * Get page dimensions and DPI for a specific page.
 * Returns [width, height, dpi] or null if page index is out of range.
 * @param {Interpreter} interp
 * @param {number} page_index
 * @returns {any}
 */
export function page_dimensions(interp, page_index) {
    _assertClass(interp, Interpreter);
    const ret = wasm.page_dimensions(interp.__wbg_ptr, page_index);
    return ret;
}

/**
 * True while a PS program has more pages to interpret. JS can stop its
 * step-loop as soon as this goes false.
 * @param {Interpreter} interp
 * @returns {boolean}
 */
export function ps_stream_active(interp) {
    _assertClass(interp, Interpreter);
    const ret = wasm.ps_stream_active(interp.__wbg_ptr);
    return ret !== 0;
}

/**
 * Get the initial reference DPI used during interpretation.
 * @param {Interpreter} interp
 * @returns {number}
 */
export function reference_dpi(interp) {
    _assertClass(interp, Interpreter);
    const ret = wasm.reference_dpi(interp.__wbg_ptr);
    return ret;
}

/**
 * Render PostScript or EPS data at the specified DPI.
 *
 * Interprets the PostScript, renders an overview of each page, and retains
 * display lists for viewport re-rendering via `render_viewport()`.
 * The interpreter state is reset after rendering so it can be reused.
 * @param {Interpreter} interp
 * @param {Uint8Array} ps_data
 * @param {number} dpi
 * @param {string} filename
 * @returns {any}
 */
export function render(interp, ps_data, dpi, filename) {
    _assertClass(interp, Interpreter);
    const ptr0 = passArray8ToWasm0(ps_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(filename, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.render(interp.__wbg_ptr, ptr0, len0, dpi, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Build the display list for a single PDF page.
 *
 * Idempotent: if the page is already rendered, returns immediately.
 * Called implicitly by `render_viewport`/`render_viewport_band` on first
 * access, but exposed to JS so callers can prefetch future pages during
 * idle time.
 * @param {Interpreter} interp
 * @param {number} page_index
 */
export function render_pdf_page(interp, page_index) {
    _assertClass(interp, Interpreter);
    const ret = wasm.render_pdf_page(interp.__wbg_ptr, page_index);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Render a rectangular viewport region of a stored display list.
 *
 * Arguments:
 * - `page_index`: Which page's display list to render
 * - `vp_x, vp_y, vp_w, vp_h`: Viewport rectangle in device-space pixels
 *   (at the reference DPI used during interpretation)
 * - `pixel_w, pixel_h`: Output pixel dimensions
 *
 * Returns a `Page` with the rendered RGBA data.
 * @param {Interpreter} interp
 * @param {number} page_index
 * @param {number} vp_x
 * @param {number} vp_y
 * @param {number} vp_w
 * @param {number} vp_h
 * @param {number} pixel_w
 * @param {number} pixel_h
 * @returns {Page}
 */
export function render_viewport(interp, page_index, vp_x, vp_y, vp_w, vp_h, pixel_w, pixel_h) {
    _assertClass(interp, Interpreter);
    const ret = wasm.render_viewport(interp.__wbg_ptr, page_index, vp_x, vp_y, vp_w, vp_h, pixel_w, pixel_h);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return Page.__wrap(ret[0]);
}

/**
 * Render a single horizontal band of a viewport region.
 *
 * This is the per-band counterpart to `render_viewport()`. The JS worker
 * loops over `band_idx` in `0..num_bands`, collecting RGBA strips.
 * @param {Interpreter} interp
 * @param {number} page_index
 * @param {number} vp_x
 * @param {number} vp_y
 * @param {number} vp_w
 * @param {number} vp_h
 * @param {number} pixel_w
 * @param {number} pixel_h
 * @param {number} band_idx
 * @param {number} band_h
 * @param {number} num_bands
 * @returns {Page}
 */
export function render_viewport_band(interp, page_index, vp_x, vp_y, vp_w, vp_h, pixel_w, pixel_h, band_idx, band_h, num_bands) {
    _assertClass(interp, Interpreter);
    const ret = wasm.render_viewport_band(interp.__wbg_ptr, page_index, vp_x, vp_y, vp_w, vp_h, pixel_w, pixel_h, band_idx, band_h, num_bands);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return Page.__wrap(ret[0]);
}

/**
 * Register a JS callback for streaming render events.
 *
 * The callback receives (event, arg1, arg2, arg3, data):
 *   event=0 (begin_page): arg1=index, arg2=width, arg3=height
 *   event=1 (rows): data=Uint8Array of RGBA band pixels
 *   event=2 (end_page): arg1=index
 *
 * This streams bands directly to JS so WASM never holds a full page
 * in memory — critical at high DPI where a page can exceed 2 GB.
 * @param {Function} callback
 */
export function set_page_callback(callback) {
    wasm.set_page_callback(callback);
}

/**
 * Resume PS interpretation up to the next `showpage`, appending any new
 * pages to the interpreter's page tables. Returns the total page count so
 * far. Returns the same count when the program has already completed — JS
 * can poll this to learn when streaming is finished (the returned count
 * stops increasing and `ps_stream_active` reads false).
 * @param {Interpreter} interp
 * @returns {any}
 */
export function step_ps_page(interp) {
    _assertClass(interp, Interpreter);
    const ret = wasm.step_ps_page(interp.__wbg_ptr);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Compute the number of bands and band height for viewport banding.
 *
 * Returns a JS array `[num_bands, band_height]`.
 * @param {number} pixel_w
 * @param {number} pixel_h
 * @returns {Array<any>}
 */
export function viewport_band_params(pixel_w, pixel_h) {
    const ret = wasm.viewport_band_params(pixel_w, pixel_h);
    return ret;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_bb96b2010945f0bc: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_apply_cb180996ed7fdae9: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.apply(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_log_e6372b4fbfc9f81e: function(arg0) {
            console.log(arg0);
        },
        __wbg_new_116be93542d39019: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_from_slice_3eea173078478cfe: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_push_adb0107829f02d75: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./stet_wasm_bg.js": import0,
    };
}

const InterpreterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_interpreter_free(ptr, 1));
const PageFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_page_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('stet_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
