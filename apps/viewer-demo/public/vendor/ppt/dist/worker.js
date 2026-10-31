import { parsePpt } from './ppt/parser.js';
const scope = globalThis;
scope.addEventListener('message', (event) => {
    const request = event.data;
    if (!request || request.type !== 'parse' || typeof request.id !== 'number')
        return;
    const start = performance.now();
    try {
        scope.postMessage({ id: request.id, progress: { phase: 'parse', elapsedMs: 0 } });
        const result = parsePpt(request.buffer, request.options);
        const buffers = new Set();
        // Transfer only each asset's bytes, not an unused containing CFB stream.
        for (const asset of result.assets) {
            if (!(asset.bytes.buffer instanceof ArrayBuffer) || asset.bytes.byteOffset !== 0 || asset.bytes.byteLength !== asset.bytes.buffer.byteLength)
                asset.bytes = new Uint8Array(asset.bytes);
            buffers.add(asset.bytes.buffer);
        }
        scope.postMessage({ id: request.id, progress: { phase: 'complete', elapsedMs: performance.now() - start, slideCount: result.slides.length } });
        scope.postMessage({ id: request.id, ok: true, result }, [...buffers]);
    }
    catch (error) {
        const e = error;
        scope.postMessage({ id: request.id, ok: false, error: { code: e.code ?? 'PARSE_FAILED', message: e.message ?? String(error), offset: e.offset } });
    }
});
