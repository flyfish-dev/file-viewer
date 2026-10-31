import { parsePpt, VERSION } from './ppt/parser.js';
import { PptWorkerClient } from './worker-client.js';
import { createPptViewer as createSlideViewer } from './viewer.js';
import { renderSlide } from './render/svg.js';
import { createCanvasTextMeasurer } from './layout/measure.js';
import { PptError } from './core/errors.js';
const license = Object.freeze({ id: 'FV-PPT-TYPESCRIPT-APACHE-2.0', edition: 'public', holder: 'Individuals and Organizations', policy: 'Apache-2.0', commercialUse: true, apacheLicenseApplies: true, redistributionAllowed: true, standaloneRedistributionAllowed: true });
const watermark = Object.freeze({ required: false, text: '' });
export function getPptPackageManifest() {
    return Object.freeze({ kind: 'flyfish-ppt-typescript-v1', product: 'Flyfish PPT Viewer', format: 'PowerPoint 97-2003 (.ppt)', packageName: '@file-viewer/ppt', packageVersion: VERSION, renderer: 'typescript-svg-canvas', license: 'Apache-2.0', watermarkRequired: false, wasmRequired: false, workerFile: 'worker.mjs', sourceRepositoryPrivate: true });
}
const closedError = () => new PptError('DOCUMENT_CLOSED', 'The presentation has been closed');
let documentSequence = 0;
function positive(value, fallback) {
    const n = value ?? fallback;
    if (!Number.isFinite(n) || n <= 0)
        throw new PptError('RENDER_SCALE', 'Render scale and pixel ratio must be finite and positive');
    return n;
}
function dimensions(model, index, options, ratio) {
    const slide = model.slides[index];
    if (!Number.isInteger(index) || !slide)
        throw new PptError('SLIDE_INDEX', `Slide index ${index} is outside the presentation`);
    const scale = positive(options.scale, 1), pixelRatio = positive(options.pixelRatio, ratio);
    const width = Math.max(1, Math.ceil(slide.size.width * scale * pixelRatio)), height = Math.max(1, Math.ceil(slide.size.height * scale * pixelRatio));
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width > 32768 || height > 32768 || width * height > 64 * 1024 * 1024)
        throw new PptError('RENDER_LIMIT', 'Requested slide bitmap exceeds the 64-megapixel render limit');
    return { slideIndex: index, width, height, logicalWidth: slide.size.width, logicalHeight: slide.size.height, scale, pixelRatio, source: 'svg' };
}
function makeDocument(model, mode, removed) {
    const attached = new Map();
    let closed = false, sequence = 0, svgRenders = 0, cancellations = 0;
    const stats = () => ({ enabled: false, available: false, disabledReason: 'The TypeScript renderer does not use persistent raster caching', entries: 0, bytes: 0, maxBytes: 0, maxEntries: 0, maxEntryBytes: 0, hits: 0, misses: 0, writes: 0, nativeRenders: 0, svgRenders, cancellations, attachedCanvases: attached.size, activeCanvases: [...attached.keys()].filter(c => c.width > 1 && c.height > 1).length, wasmMemoryBytes: 0 });
    const doc = { mode, documentId: `ppt-ts-${++documentSequence}`, slideCount: model.slides.length, width: model.size.width, height: model.size.height, model,
        get closed() { return closed; },
        async renderSlide(index, canvas, options = {}) {
            if (closed)
                throw closedError();
            const owner = canvas.ownerDocument ?? (typeof document === 'undefined' ? undefined : document);
            const result = dimensions(model, index, options, owner?.defaultView?.devicePixelRatio ?? 1), current = ++sequence;
            attached.set(canvas, { index, sequence: current });
            const stale = () => closed || attached.get(canvas)?.sequence !== current;
            const cancelled = () => { cancellations++; return { ...result, cancelled: true }; };
            try {
                await owner?.fonts?.ready;
                if (stale())
                    return cancelled();
                const output = renderSlide(model, index, { textLayout: 'measured', textOutput: 'svg', textMeasurer: createCanvasTextMeasurer(owner), mediaControls: false });
                const blob = new Blob([output.html], { type: 'image/svg+xml' });
                let image, url;
                try {
                    if (owner) {
                        image = owner.createElement('img');
                        url = URL.createObjectURL(blob);
                        const loaded = new Promise((resolve, reject) => { const img = image; img.onload = () => resolve(); img.onerror = () => reject(new PptError('SVG_DECODE', 'The browser could not decode the rendered slide')); });
                        image.src = url;
                        await loaded;
                    }
                    else if (typeof createImageBitmap === 'function')
                        image = await createImageBitmap(blob);
                    else
                        throw new PptError('CANVAS_UNAVAILABLE', 'Canvas snapshots require a browser image decoder');
                    if (stale())
                        return cancelled();
                    canvas.width = result.width;
                    canvas.height = result.height;
                    const context = canvas.getContext('2d');
                    if (!context)
                        throw new PptError('CANVAS_UNAVAILABLE', 'A two-dimensional Canvas context is unavailable');
                    context.clearRect(0, 0, result.width, result.height);
                    context.drawImage(image, 0, 0, result.width, result.height);
                    svgRenders++;
                    if ('style' in canvas) {
                        canvas.style.width = `${result.logicalWidth * result.scale}px`;
                        canvas.style.height = `${result.logicalHeight * result.scale}px`;
                        canvas.dataset.renderState = 'rendered';
                    }
                    return result;
                }
                finally {
                    if (url)
                        URL.revokeObjectURL(url);
                    if (image && 'close' in image)
                        image.close();
                }
            }
            catch (error) {
                if (stale())
                    return cancelled();
                if ('dataset' in canvas)
                    canvas.dataset.renderState = 'error';
                throw error;
            }
        },
        async releaseSlide(index) { let released = false; for (const [canvas, state] of attached)
            if (state.index === index) {
                attached.delete(canvas);
                canvas.width = 1;
                canvas.height = 1;
                if ('dataset' in canvas)
                    canvas.dataset.renderState = 'released';
                released = true;
            } return released; },
        async cacheStats() { return stats(); },
        async close() { if (closed)
            return; closed = true; for (const canvas of attached.keys()) {
            canvas.width = 1;
            canvas.height = 1;
            if ('dataset' in canvas)
                canvas.dataset.renderState = 'closed';
        } attached.clear(); model.assets = []; model.slides = []; model.masters = []; model.fonts = []; model.extras = undefined; removed(); }, };
    return doc;
}
export async function loadPptViewer(options = {}) {
    const mode = options.worker !== false && typeof Worker !== 'undefined' ? 'worker' : 'direct';
    const documents = new Set(), workers = new Set(), mounts = new Set();
    let closed = false;
    const runtime = { mode, license, watermark,
        async open(input) {
            if (closed)
                throw closedError();
            let model;
            if (mode === 'worker') {
                const worker = PptWorkerClient.create(options.workerUrl);
                workers.add(worker);
                try {
                    const buffer = input instanceof ArrayBuffer ? input : input.buffer instanceof ArrayBuffer && input.byteOffset === 0 && input.byteLength === input.buffer.byteLength ? input.buffer : undefined;
                    model = options.transferInputOwnership && buffer ? await worker.parseOwned(buffer, options.parseOptions) : await worker.parse(input, options.parseOptions);
                }
                finally {
                    workers.delete(worker);
                    worker.destroy();
                }
            }
            else {
                await Promise.resolve();
                if (closed)
                    throw closedError();
                model = parsePpt(input, options.parseOptions);
            }
            if (closed)
                throw closedError();
            const document = makeDocument(model, mode, () => documents.delete(document));
            documents.add(document);
            return document;
        },
        async mount(target, input, mountOptions = {}) {
            const element = typeof target === 'string' ? globalThis.document?.querySelector(target) : target;
            if (!element)
                throw new PptError('MOUNT_TARGET', 'The presentation mount target does not exist');
            const scale = positive(mountOptions.scale, 1);
            positive(mountOptions.pixelRatio, 1);
            const doc = await runtime.open(input), owner = element.ownerDocument, root = owner.createElement('div'), canvases = [], timers = new Map();
            const IO = owner.defaultView?.IntersectionObserver, virtualized = mountOptions.virtualize !== false && !!IO;
            let observer, mountClosed = false;
            root.className = mountOptions.className ?? 'pptjs-pages';
            Object.assign(root.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px', background: '#e5e7eb' });
            for (let index = 0; index < doc.slideCount; index++) {
                const size = doc.model.slides[index].size, page = owner.createElement('div'), canvas = owner.createElement('canvas');
                Object.assign(page.style, { position: 'relative', width: `${size.width * scale}px`, height: `${size.height * scale}px`, flex: 'none', background: 'white' });
                canvas.width = 1;
                canvas.height = 1;
                canvas.dataset.renderState = 'pending';
                canvas.dataset.slideIndex = String(index);
                canvas.setAttribute('role', 'img');
                canvas.setAttribute('aria-label', `Slide ${index + 1}`);
                Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
                page.append(canvas);
                root.append(page);
                canvases.push(canvas);
            }
            const clearTimer = (index) => { const timer = timers.get(index); if (timer !== undefined)
                clearTimeout(timer); timers.delete(index); };
            const mounted = { document: doc, root, canvases, virtualized,
                async renderSlide(index) { if (mountClosed)
                    throw closedError(); const canvas = canvases[index]; if (!canvas)
                    throw new PptError('SLIDE_INDEX', 'Slide is outside the presentation'); clearTimer(index); canvas.dataset.renderState = 'rendering'; return doc.renderSlide(index, canvas, mountOptions); },
                cacheStats: () => doc.cacheStats(),
                async close() { if (mountClosed)
                    return; mountClosed = true; observer?.disconnect(); for (const timer of timers.values())
                    clearTimeout(timer); timers.clear(); await doc.close(); root.remove(); mounts.delete(mounted); },
            };
            mounts.add(mounted);
            try {
                if (mountOptions.replace !== false)
                    element.replaceChildren(root);
                else
                    element.append(root);
                if (virtualized) {
                    observer = new IO(entries => { for (const entry of entries) {
                        const index = Number(entry.target.dataset.slideIndex);
                        if (entry.isIntersecting) {
                            clearTimer(index);
                            if (canvases[index]?.dataset.renderState !== 'rendered' && canvases[index]?.dataset.renderState !== 'rendering')
                                void mounted.renderSlide(index).catch(() => { });
                        }
                        else {
                            clearTimer(index);
                            timers.set(index, setTimeout(() => { timers.delete(index); if (!mountClosed)
                                void doc.releaseSlide(index); }, Math.max(0, mountOptions.releaseDelayMs ?? 1200)));
                        }
                    } }, { root: mountOptions.scrollRoot ?? null, rootMargin: mountOptions.rootMargin ?? '150% 0px' });
                    for (const canvas of canvases)
                        observer.observe(canvas);
                    if (canvases.length)
                        await mounted.renderSlide(0);
                }
                else
                    for (let index = 0; index < canvases.length; index++)
                        await mounted.renderSlide(index);
                return mounted;
            }
            catch (error) {
                await mounted.close();
                throw error;
            }
        },
        async cacheStats() { const all = await Promise.all([...documents].map(d => d.cacheStats())); const empty = { enabled: false, available: false, disabledReason: 'The TypeScript renderer does not use persistent raster caching', entries: 0, bytes: 0, maxBytes: 0, maxEntries: 0, maxEntryBytes: 0, hits: 0, misses: 0, writes: 0, nativeRenders: 0, svgRenders: 0, cancellations: 0, attachedCanvases: 0, activeCanvases: 0, wasmMemoryBytes: 0 }; return all.reduce((sum, s) => ({ ...sum, svgRenders: sum.svgRenders + s.svgRenders, cancellations: sum.cancellations + s.cancellations, attachedCanvases: sum.attachedCanvases + s.attachedCanvases, activeCanvases: sum.activeCanvases + s.activeCanvases }), empty); },
        async close() { if (closed)
            return; closed = true; for (const worker of workers)
            worker.destroy(); workers.clear(); await Promise.all([...mounts].map(m => m.close())); await Promise.all([...documents].map(d => d.close())); }, };
    return runtime;
}
export function createPptViewer(containerOrOptions, options) {
    return containerOrOptions && 'ownerDocument' in containerOrOptions && 'replaceChildren' in containerOrOptions ? createSlideViewer(containerOrOptions, options) : loadPptViewer(containerOrOptions);
}
