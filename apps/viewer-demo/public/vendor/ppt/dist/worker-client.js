import { PptError } from './core/errors.js';
import { DEFAULT_LIMITS } from './ppt/constants.js';
function inputLimit(byteLength, options) { const maximum = options.limits?.maxFileBytes ?? DEFAULT_LIMITS.maxFileBytes; if (!Number.isSafeInteger(maximum) || maximum <= 0)
    throw new PptError('INVALID_LIMIT', 'Invalid parse limit maxFileBytes'); if (byteLength > maximum)
    throw new PptError('LIMIT_FILE', 'Presentation exceeds the configured file size limit'); }
export class PptWorkerClient {
    worker;
    seq = 0;
    pending = new Map();
    destroyed = false;
    constructor(worker) { this.worker = worker; worker.addEventListener('message', this.onMessage); worker.addEventListener('error', this.onError); worker.addEventListener('messageerror', this.onMessageError); }
    static create(url) { return new PptWorkerClient(new Worker(url ?? new URL('./pptjs.worker.js', import.meta.url), { type: 'module' })); }
    onMessage = (event) => { const data = event.data; if (!data || typeof data.id !== 'number')
        return; const pending = this.pending.get(data.id); if (!pending)
        return; if (data.progress) {
        try {
            pending.progress?.(data.progress);
        }
        catch { /* Observer errors must not orphan the parse request. */ }
        return;
    } this.pending.delete(data.id); if (data.ok && data.result)
        pending.resolve(data.result);
    else
        pending.reject(new PptError(data.error?.code ?? 'WORKER_RESPONSE', data.error?.message ?? 'Worker returned no presentation', data.error?.offset)); };
    onError = (event) => { const e = event; this.fail(new PptError('WORKER_ERROR', e.message || 'The parsing worker failed')); };
    onMessageError = () => { this.fail(new PptError('WORKER_MESSAGE', 'The worker response could not be decoded')); };
    fail(error) { for (const p of this.pending.values())
        p.reject(error); this.pending.clear(); this.dispose(); }
    dispose() { if (this.destroyed)
        return; this.destroyed = true; this.worker.removeEventListener('message', this.onMessage); this.worker.removeEventListener('error', this.onError); this.worker.removeEventListener('messageerror', this.onMessageError); this.worker.terminate(); }
    /** Safe default: never detaches a caller-owned ArrayBuffer or a typed-array sibling. */
    parse(input, options = {}, onProgress) { if (this.destroyed)
        return Promise.reject(new PptError('WORKER_DESTROYED', 'The worker client has been destroyed')); let source; try {
        if (!(input instanceof ArrayBuffer) && !ArrayBuffer.isView(input))
            throw new PptError('INVALID_INPUT', 'Expected an ArrayBuffer or binary view');
        inputLimit(input.byteLength, options);
        source = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    catch (error) {
        return Promise.reject(error);
    } return this.parseOwned(source.slice().buffer, options, onProgress); }
    /** Ownership-transfer variant: caller explicitly hands over this full buffer. */
    parseOwned(buffer, options = {}, onProgress) { if (this.destroyed)
        return Promise.reject(new PptError('WORKER_DESTROYED', 'The worker client has been destroyed')); try {
        if (!(buffer instanceof ArrayBuffer))
            throw new PptError('INVALID_INPUT', 'parseOwned expects an ArrayBuffer');
        inputLimit(buffer.byteLength, options);
    }
    catch (error) {
        return Promise.reject(error);
    } const id = ++this.seq; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject, progress: onProgress }); try {
        this.worker.postMessage({ id, type: 'parse', buffer, options }, [buffer]);
    }
    catch (error) {
        this.pending.delete(id);
        reject(error);
    } }); }
    destroy() { if (this.destroyed)
        return; for (const p of this.pending.values())
        p.reject(new DOMException('Parsing was cancelled', 'AbortError')); this.pending.clear(); this.dispose(); }
}
