const MANIFEST = Object.freeze({"kind":"flyfish-ppt-public-native-wasm-v2","product":"Flyfish PPT Viewer","format":"PowerPoint 97-2003 (.ppt)","packageName":"@file-viewer/ppt","packageVersion":"0.3.3","engine":"flyfish-classic-ppt-native-engine","engineBuild":"d2b522ef23b5c08a","id":"FV-PPT-PUBLIC-WATERMARKED-V2","feature":"ppt","edition":"public-watermarked","holder":"Individuals and Organizations","distribution":"proprietary-public-binary","commercialUse":true,"publicAnyOrigin":true,"watermarkRequired":true,"watermarkText":"Flyfish Viewer","usePolicy":"public-watermarked-general-use","licensePolicy":"flyfish-public-watermarked-binary-license-v2","sourceCodeRights":false,"sourceDeliveryRights":false,"apacheLicenseApplies":false,"redistributionAllowed":true,"redistributionPolicy":"unmodified-integrated-bundling-only","standaloneRedistributionAllowed":false,"watermarkRemovalRequiresCommercialAuthorization":true,"runtimeLicenseRequired":false,"renderer":"native-wasm-worker-offscreen-canvas","integrity":"native-wasm-font-sha256-v2","wasmFile":"ppt-native.wasm","wasmBytes":1557729,"workerFile":"worker.mjs","fontPack":{"kind":"flyfish-cjk-font-pack-v1","file":"ppt-font-cjk.otf","bytes":16437364,"sha256":"2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b"},"workerDefault":true,"virtualScrollDefault":true,"frameCache":"indexeddb-final-watermarked-png-lru","watermarkEnforcement":"native-final-frame","wasmSha256":"5e1313c50fee36c9573527bc3bf88920ea54b25016ee72d369bb7b27df1540ba"});
const DEFAULT_WASM_URL = new URL('./ppt-native.wasm', import.meta.url);
const DEFAULT_FONT_URL = new URL(`./${MANIFEST.fontPack.file}`, import.meta.url);
const DEFAULT_WORKER_URL = new URL(`./${MANIFEST.workerFile}`, import.meta.url);
const WASM_EXPORTS = Object.freeze([
  'memory',
  'ppt_input_alloc',
  'ppt_input_free',
  'ppt_font_pack_install',
  'ppt_font_pack_is_installed',
  'ppt_document_open',
  'ppt_document_close',
  'ppt_slide_count',
  'ppt_slide_width',
  'ppt_slide_height',
  'ppt_render_slide_rgba',
  'ppt_frame_ptr',
  'ppt_frame_len',
  'ppt_frame_width',
  'ppt_frame_height',
  'ppt_frame_stride',
  'ppt_frame_free',
  'ppt_last_error_code'
]);

const LICENSE = Object.freeze({
  id: 'FV-PPT-PUBLIC-WATERMARKED-V2',
  edition: 'public-watermarked',
  holder: 'Individuals and Organizations',
  policy: 'flyfish-public-watermarked-binary-license-v2',
  commercialUse: true,
  sourceCodeRights: false,
  sourceDeliveryRights: false,
  apacheLicenseApplies: false,
  redistributionAllowed: true,
  redistributionPolicy: 'unmodified-integrated-bundling-only',
  standaloneRedistributionAllowed: false,
  watermarkRemovalRequiresCommercialAuthorization: true
});

const WATERMARK = Object.freeze({ required: true, text: 'Flyfish Viewer' });
const directEnginePromises = new Map();

export function getPptPackageManifest() {
  return { ...MANIFEST, fontPack: { ...MANIFEST.fontPack } };
}

export async function loadPptViewer(options = {}) {
  const mode = selectRuntimeMode(options);
  if (mode === 'worker') {
    try {
      return await createWorkerRuntime(options);
    } catch (error) {
      if (options.worker === true) throw error;
    }
  }
  const engine = await loadDirectEngine(options.wasmUrl, options.fontUrl);
  return createDirectRuntime(engine);
}

export const createPptViewer = loadPptViewer;

function selectRuntimeMode(options) {
  const requested = options.worker ?? 'auto';
  if (requested !== true && requested !== false && requested !== 'auto') {
    throw new TypeError('worker must be true, false, or "auto".');
  }
  const workerCapable = typeof Worker === 'function'
    && typeof OffscreenCanvas === 'function'
    && (typeof HTMLCanvasElement === 'undefined'
      || typeof HTMLCanvasElement.prototype?.transferControlToOffscreen === 'function');
  const sourcesAreUrls = isUrlSource(options.wasmUrl) && isUrlSource(options.fontUrl) && isUrlSource(options.workerUrl);
  if (requested === true && !workerCapable) {
    throw packageError('worker-unavailable', 'Worker and OffscreenCanvas support are required for worker rendering.');
  }
  if (requested === true && !sourcesAreUrls) {
    throw packageError('worker-source-invalid', 'Worker rendering requires URL-based WASM, font, and worker assets.');
  }
  return requested !== false && workerCapable && sourcesAreUrls ? 'worker' : 'direct';
}

function isUrlSource(source) {
  return source === undefined || source instanceof URL || typeof source === 'string';
}

async function createWorkerRuntime(options) {
  const bridge = new WorkerBridge(resolveUrl(options.workerUrl, DEFAULT_WORKER_URL));
  const transferInputOwnership = options.transferInputOwnership === true;
  try {
    await bridge.request('init', {
      manifest: getPptPackageManifest(),
      wasmUrl: resolveUrl(options.wasmUrl, DEFAULT_WASM_URL).href,
      fontUrl: resolveUrl(options.fontUrl, DEFAULT_FONT_URL).href,
      cacheOptions: normalizeCacheOptions(options.cache)
    });
  } catch (error) {
    bridge.terminate();
    throw error;
  }

  let activeDocument = null;
  const runtime = {
    mode: 'worker',
    license: LICENSE,
    watermark: WATERMARK,
    async open(input) {
      if (activeDocument && !activeDocument.closed) {
        throw packageError('document-active', 'Close the current worker document before opening another presentation.');
      }
      const bytes = normalizeInput(input);
      if (bytes.byteLength < 8 || !hasCfbSignature(bytes)) {
        throw packageError('ppt-signature-invalid', 'Input is not a PowerPoint 97-2003 (.ppt) compound document.');
      }
      const transferred = transferableInputBuffer(input, bytes, transferInputOwnership);
      const metadata = await bridge.request('open', { input: transferred }, [transferred]);
      activeDocument = createWorkerDocument(bridge, metadata);
      return activeDocument;
    },
    async mount(target, input, mountOptions = {}) {
      return mountDocument(runtime, target, input, mountOptions);
    },
    async cacheStats() {
      return bridge.request('cacheStats');
    },
    async close() {
      try {
        if (activeDocument && !activeDocument.closed) await activeDocument.close();
      } finally {
        bridge.terminate();
      }
    }
  };
  return Object.freeze(runtime);
}

function createWorkerDocument(bridge, metadata) {
  const slideCount = positiveInteger(metadata.slideCount, 'slide count');
  const width = positiveNumber(metadata.width, 'slide width');
  const height = positiveNumber(metadata.height, 'slide height');
  const documentId = String(metadata.documentId || '');
  const attached = new Map();
  let closed = false;

  const document = {
    mode: 'worker',
    documentId,
    get slideCount() { return slideCount; },
    get width() { return width; },
    get height() { return height; },
    get closed() { return closed; },
    async renderSlide(slideIndex, canvas, options = {}) {
      ensureOpen(closed);
      validateSlideIndex(slideIndex, slideCount);
      const renderOptions = normalizeRenderOptions(options);
      let state = attached.get(slideIndex);
      if (!state) {
        const transferable = transferCanvas(canvas, width, height, renderOptions.scale);
        await bridge.request('attach', {
          slideIndex,
          canvas: transferable,
          scale: renderOptions.scale,
          pixelRatio: renderOptions.pixelRatio
        }, [transferable]);
        state = { canvas, scale: renderOptions.scale, pixelRatio: renderOptions.pixelRatio };
        attached.set(slideIndex, state);
      } else if (state.canvas !== canvas) {
        throw packageError('canvas-already-attached', `Slide ${slideIndex + 1} is already attached to another Canvas.`);
      }
      const result = await bridge.request('activate', {
        slideIndex,
        scale: renderOptions.scale,
        pixelRatio: renderOptions.pixelRatio
      });
      if (result?.cancelled) {
        return Object.freeze({
          cancelled: true,
          slideIndex,
          width: Math.round(width * renderOptions.nativeScale),
          height: Math.round(height * renderOptions.nativeScale),
          logicalWidth: width,
          logicalHeight: height,
          scale: renderOptions.scale,
          pixelRatio: renderOptions.pixelRatio
        });
      }
      return Object.freeze({ ...result, logicalWidth: width, logicalHeight: height });
    },
    async releaseSlide(slideIndex) {
      ensureOpen(closed);
      validateSlideIndex(slideIndex, slideCount);
      if (!attached.has(slideIndex)) return false;
      await bridge.request('deactivate', { slideIndex });
      return true;
    },
    async cacheStats() {
      ensureOpen(closed);
      return bridge.request('cacheStats');
    },
    async close() {
      if (closed) return;
      closed = true;
      try {
        await bridge.request('close');
      } finally {
        attached.clear();
      }
    }
  };
  return Object.freeze(document);
}

function transferCanvas(canvas, logicalWidth, logicalHeight, scale) {
  if (typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement) {
    if (typeof canvas.transferControlToOffscreen !== 'function') {
      throw packageError('offscreen-canvas-unavailable', 'This Canvas cannot be transferred to the rendering worker.');
    }
    prepareCanvasElement(canvas, logicalWidth, logicalHeight, scale);
    canvas.width = 1;
    canvas.height = 1;
    return canvas.transferControlToOffscreen();
  }
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) return canvas;
  throw new TypeError('renderSlide requires an HTMLCanvasElement or OffscreenCanvas.');
}

class WorkerBridge {
  constructor(url) {
    this.worker = new Worker(url, { type: 'module', name: 'flyfish-ppt-renderer' });
    this.nextId = 1;
    this.pending = new Map();
    this.terminated = false;
    this.worker.addEventListener('message', (event) => this.receive(event.data));
    this.worker.addEventListener('error', (event) => {
      this.failAll(packageError('worker-failed', event.message || 'The PPT rendering worker failed.'));
    });
    this.worker.addEventListener('messageerror', () => {
      this.failAll(packageError('worker-message-invalid', 'The PPT rendering worker returned an invalid message.'));
    });
  }

  request(type, payload = {}, transfer = []) {
    if (this.terminated) return Promise.reject(packageError('worker-closed', 'The PPT rendering worker is closed.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.worker.postMessage({ id, type, ...payload }, transfer);
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  receive(message) {
    if (!message || !Number.isInteger(message.id)) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.ok) pending.resolve(message.result);
    else pending.reject(workerError(message.error));
  }

  failAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  terminate() {
    if (this.terminated) return;
    this.terminated = true;
    this.worker.terminate();
    this.failAll(packageError('worker-closed', 'The PPT rendering worker was closed.'));
  }
}

function workerError(value) {
  const error = packageError(value?.code || 'worker-operation-failed', value?.message || 'The PPT rendering worker rejected the operation.');
  if (value?.name) error.name = value.name;
  return error;
}

async function loadDirectEngine(wasmSource, fontSource) {
  const key = directEngineKey(wasmSource, fontSource);
  if (!key) return instantiateEngine(wasmSource ?? DEFAULT_WASM_URL, fontSource ?? DEFAULT_FONT_URL);
  if (!directEnginePromises.has(key)) {
    directEnginePromises.set(key, instantiateEngine(wasmSource ?? DEFAULT_WASM_URL, fontSource ?? DEFAULT_FONT_URL).catch((error) => {
      directEnginePromises.delete(key);
      throw error;
    }));
  }
  return directEnginePromises.get(key);
}

function directEngineKey(wasmSource, fontSource) {
  if (!isUrlSource(wasmSource) || !isUrlSource(fontSource)) return '';
  return `${resolveUrl(wasmSource, DEFAULT_WASM_URL).href}\n${resolveUrl(fontSource, DEFAULT_FONT_URL).href}`;
}

async function instantiateEngine(wasmSource, fontSource) {
  const fontPromise = loadAssetBytes(fontSource, MANIFEST.fontPack.bytes, 'CJK font pack');
  void fontPromise.catch(() => {});
  const wasm = await loadAssetBytes(wasmSource, MANIFEST.wasmBytes, 'PPT rendering engine');
  await verifySha256(wasm, MANIFEST.wasmSha256, 'wasm-integrity-invalid', 'The PPT rendering engine failed its SHA-256 integrity check.');
  const module = await WebAssembly.compile(wasm);
  const imports = WebAssembly.Module.imports(module);
  if (imports.length !== 0) {
    throw packageError('wasm-imports-rejected', 'The PPT rendering engine must not import browser or host functions.');
  }
  const instance = await WebAssembly.instantiate(module, {});
  validateEngine(instance.exports);
  const font = await fontPromise;
  await verifySha256(font, MANIFEST.fontPack.sha256, 'font-integrity-invalid', 'The CJK font pack failed its SHA-256 integrity check.');
  installFontPack(instance.exports, font);
  return Object.freeze({ module, exports: instance.exports });
}

function installFontPack(api, font) {
  if (Number(api.ppt_font_pack_is_installed()) === 1) return;
  const pointer = Number(api.ppt_input_alloc(font.byteLength));
  if (!pointer) throw engineError(api, 'Unable to allocate native font-pack memory.');
  let installed = false;
  try {
    new Uint8Array(api.memory.buffer, pointer, font.byteLength).set(font);
    installed = Number(api.ppt_font_pack_install(pointer, font.byteLength)) === 1;
    if (!installed) throw engineError(api, 'The native engine rejected the CJK font pack.');
  } finally {
    if (!installed) api.ppt_input_free(pointer, font.byteLength);
  }
  if (Number(api.ppt_font_pack_is_installed()) !== 1) {
    throw packageError('font-install-invalid', 'The native engine did not retain the verified CJK font pack.');
  }
}

async function loadAssetBytes(source, expectedBytes, label) {
  if (!Number.isInteger(expectedBytes) || expectedBytes < 1) {
    throw packageError('asset-manifest-invalid', `The ${label} manifest length is invalid.`);
  }
  if (source instanceof Uint8Array) return exactAsset(Uint8Array.from(source), expectedBytes, label);
  if (source instanceof ArrayBuffer) return exactAsset(new Uint8Array(source.slice(0)), expectedBytes, label);
  if (typeof Response !== 'undefined' && source instanceof Response) {
    if (!source.ok) throw packageError('asset-request-failed', `${label} request failed with HTTP ${source.status}.`);
    return exactAsset(await readResponseBytes(source, expectedBytes), expectedBytes, label);
  }
  const response = await fetch(source instanceof URL || typeof source === 'string' ? source : DEFAULT_WASM_URL);
  if (!response.ok) throw packageError('asset-request-failed', `${label} request failed with HTTP ${response.status}.`);
  return exactAsset(await readResponseBytes(response, expectedBytes), expectedBytes, label);
}

async function readResponseBytes(response, maximumBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximumBytes) throw packageError('asset-too-large', 'A protected viewer asset exceeded its fixed byte limit.');
    return bytes;
  }
  const reader = response.body.getReader();
  const output = new Uint8Array(maximumBytes);
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel('asset byte limit exceeded');
        throw packageError('asset-too-large', 'A protected viewer asset exceeded its fixed byte limit.');
      }
      output.set(value, total - value.byteLength);
    }
  } finally {
    reader.releaseLock();
  }
  return total === maximumBytes ? output : output.subarray(0, total);
}

function exactAsset(bytes, expectedBytes, label) {
  if (bytes.byteLength !== expectedBytes) {
    throw packageError('asset-length-invalid', `${label} byte length is ${bytes.byteLength}; expected ${expectedBytes}.`);
  }
  return bytes;
}

async function verifySha256(bytes, expected, code, message) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function') {
    throw packageError('asset-integrity-unavailable', 'Web Crypto SHA-256 support is required to verify protected viewer assets.');
  }
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  const actual = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expected) throw packageError(code, message);
}

function validateEngine(api) {
  const actual = Object.keys(api).sort();
  const expected = [...WASM_EXPORTS].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw packageError('wasm-abi-invalid', 'The PPT rendering engine has an unexpected public ABI.');
  }
  if (!(api.memory instanceof WebAssembly.Memory)) {
    throw packageError('wasm-memory-invalid', 'The PPT rendering engine did not provide its bounded working memory.');
  }
  for (const name of WASM_EXPORTS) {
    if (name !== 'memory' && typeof api[name] !== 'function') {
      throw packageError('wasm-abi-invalid', `The PPT rendering engine is missing ${name}.`);
    }
  }
}

function createDirectRuntime(engine) {
  const runtime = {
    mode: 'direct',
    license: LICENSE,
    watermark: WATERMARK,
    async open(input) {
      return openDirectDocument(engine.exports, input);
    },
    async mount(target, input, options = {}) {
      return mountDocument(runtime, target, input, options);
    },
    async cacheStats() {
      return disabledCacheStats(engine.exports.memory.buffer.byteLength);
    },
    async close() {}
  };
  return Object.freeze(runtime);
}

function openDirectDocument(api, input) {
  const bytes = normalizeInput(input);
  if (bytes.byteLength < 8 || !hasCfbSignature(bytes)) {
    throw packageError('ppt-signature-invalid', 'Input is not a PowerPoint 97-2003 (.ppt) compound document.');
  }
  const pointer = Number(api.ppt_input_alloc(bytes.byteLength));
  if (!pointer) throw engineError(api, 'Unable to allocate native input memory.');
  let handle = 0;
  try {
    new Uint8Array(api.memory.buffer, pointer, bytes.byteLength).set(bytes);
    handle = Number(api.ppt_document_open(pointer, bytes.byteLength));
  } finally {
    api.ppt_input_free(pointer, bytes.byteLength);
  }
  if (!handle) throw engineError(api, 'The native PPT parser rejected the document.');

  const slideCount = Number(api.ppt_slide_count(handle));
  const width = Number(api.ppt_slide_width(handle, 1000));
  const height = Number(api.ppt_slide_height(handle, 1000));
  if (!Number.isInteger(slideCount) || slideCount < 1 || slideCount > 10000
    || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    api.ppt_document_close(handle);
    throw engineError(api, 'The native PPT parser returned invalid presentation dimensions.');
  }

  const renderedCanvases = new Map();
  let closed = false;
  const document = {
    mode: 'direct',
    documentId: '',
    get slideCount() { return slideCount; },
    get width() { return width; },
    get height() { return height; },
    get closed() { return closed; },
    async renderSlide(slideIndex, canvas, options = {}) {
      if (closed) throw packageError('document-closed', 'The PPT document is already closed.');
      const result = renderDirectSlide(api, handle, slideCount, width, height, slideIndex, canvas, options);
      renderedCanvases.set(slideIndex, canvas);
      return result;
    },
    async releaseSlide(slideIndex) {
      if (closed) return false;
      validateSlideIndex(slideIndex, slideCount);
      const canvas = renderedCanvases.get(slideIndex);
      if (!canvas) return false;
      canvas.width = 1;
      canvas.height = 1;
      renderedCanvases.delete(slideIndex);
      return true;
    },
    async cacheStats() {
      return disabledCacheStats(api.memory.buffer.byteLength);
    },
    async close() {
      if (!closed) {
        closed = true;
        renderedCanvases.clear();
        if (Number(api.ppt_document_close(handle)) !== 1) throw engineError(api, 'Unable to close the native PPT document.');
      }
    }
  };
  return Object.freeze(document);
}

function renderDirectSlide(api, documentHandle, slideCount, logicalWidth, logicalHeight, slideIndex, canvas, options) {
  validateSlideIndex(slideIndex, slideCount);
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new TypeError('renderSlide requires an HTMLCanvasElement or OffscreenCanvas.');
  }
  const { scale, pixelRatio, nativeScale } = normalizeRenderOptions(options);
  const scaleMilli = Math.round(nativeScale * 1000);
  const pixelWidth = Number(api.ppt_slide_width(documentHandle, scaleMilli));
  const pixelHeight = Number(api.ppt_slide_height(documentHandle, scaleMilli));
  const frame = Number(api.ppt_render_slide_rgba(documentHandle, slideIndex, scaleMilli));
  if (!frame) throw engineError(api, `Unable to render slide ${slideIndex + 1}.`);
  try {
    const width = Number(api.ppt_frame_width(frame));
    const height = Number(api.ppt_frame_height(frame));
    const stride = Number(api.ppt_frame_stride(frame));
    const length = Number(api.ppt_frame_len(frame));
    const pointer = Number(api.ppt_frame_ptr(frame));
    if (width !== pixelWidth || height !== pixelHeight || stride !== width * 4 || length !== stride * height || !pointer) {
      throw packageError('wasm-frame-invalid', 'The native PPT engine returned an invalid RGBA frame.');
    }
    canvas.width = width;
    canvas.height = height;
    if (typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement) {
      prepareCanvasElement(canvas, logicalWidth, logicalHeight, scale);
    }
    const context = canvas.getContext('2d', { alpha: false, desynchronized: false });
    if (!context || typeof context.putImageData !== 'function') {
      throw packageError('canvas-context-unavailable', 'A 2D Canvas context is required to display PPT slides.');
    }
    const pixels = new Uint8ClampedArray(api.memory.buffer, pointer, length);
    let imageData;
    try {
      imageData = new ImageData(pixels, width, height);
    } catch {
      imageData = context.createImageData(width, height);
      imageData.data.set(pixels);
    }
    context.putImageData(imageData, 0, 0);
    return Object.freeze({ slideIndex, width, height, logicalWidth, logicalHeight, scale, pixelRatio });
  } finally {
    api.ppt_frame_free(frame);
  }
}

async function mountDocument(runtime, target, input, options) {
  const container = resolveElement(target);
  const document = await runtime.open(input);
  const root = documentRoot(container, options);
  const canvases = [];
  const shells = [];
  const states = Array.from({ length: document.slideCount }, () => 'idle');
  const visible = Array.from({ length: document.slideCount }, () => false);
  const operations = new Map();
  const releaseOperations = new Map();
  const releaseTimers = new Map();
  let observer = null;
  let closed = false;

  try {
    for (let slideIndex = 0; slideIndex < document.slideCount; slideIndex += 1) {
      const { shell, canvas } = documentCanvas(root, slideIndex, document.width, document.height, finitePositive(options.scale, 1));
      shells.push(shell);
      canvases.push(canvas);
    }

    const activate = (slideIndex) => {
      if (closed || states[slideIndex] === 'rendered') return operations.get(slideIndex) || Promise.resolve();
      const pending = operations.get(slideIndex);
      if (pending) return pending;
      clearRelease(slideIndex);
      states[slideIndex] = 'rendering';
      canvases[slideIndex].dataset.renderState = 'rendering';
      const operation = document.renderSlide(slideIndex, canvases[slideIndex], options)
        .then((result) => {
          if (result?.cancelled) {
            states[slideIndex] = 'released';
            canvases[slideIndex].dataset.renderState = 'released';
            return result;
          }
          states[slideIndex] = 'rendered';
          canvases[slideIndex].dataset.renderState = 'rendered';
          return result;
        })
        .catch((error) => {
          states[slideIndex] = 'error';
          canvases[slideIndex].dataset.renderState = 'error';
          throw error;
        })
        .finally(() => operations.delete(slideIndex));
      operations.set(slideIndex, operation);
      return operation;
    };

    const release = async (slideIndex) => {
      if (closed || releaseOperations.has(slideIndex)) return releaseOperations.get(slideIndex);
      const operation = (async () => {
        const rendering = operations.get(slideIndex);
        if (rendering) await rendering.catch(() => {});
        if (closed || visible[slideIndex] || states[slideIndex] !== 'rendered') return;
        try {
          await document.releaseSlide(slideIndex);
          states[slideIndex] = 'released';
          canvases[slideIndex].dataset.renderState = 'released';
          if (visible[slideIndex] && !closed) await activate(slideIndex);
        } catch (error) {
          canvases[slideIndex].dataset.renderState = 'error';
          console.warn('Flyfish PPT slide release failed.', error);
        }
      })().finally(() => releaseOperations.delete(slideIndex));
      releaseOperations.set(slideIndex, operation);
      return operation;
    };

    const scheduleRelease = (slideIndex) => {
      clearRelease(slideIndex);
      const delay = boundedInteger(options.releaseDelayMs, 1200, 0, 30000);
      const timer = setTimeout(() => {
        releaseTimers.delete(slideIndex);
        void release(slideIndex);
      }, delay);
      releaseTimers.set(slideIndex, timer);
    };

    function clearRelease(slideIndex) {
      const timer = releaseTimers.get(slideIndex);
      if (timer !== undefined) clearTimeout(timer);
      releaseTimers.delete(slideIndex);
    }

    const virtualize = options.virtualize !== false && typeof IntersectionObserver === 'function';
    if (virtualize) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const slideIndex = Number(entry.target.dataset.slideIndex);
          if (entry.isIntersecting) {
            visible[slideIndex] = true;
            clearRelease(slideIndex);
            void activate(slideIndex).catch((error) => console.error(error));
          } else {
            visible[slideIndex] = false;
            scheduleRelease(slideIndex);
          }
        }
      }, {
        root: options.scrollRoot || null,
        rootMargin: typeof options.rootMargin === 'string' ? options.rootMargin : '150% 0px',
        threshold: 0
      });
      for (const shell of shells) observer.observe(shell);
      await activate(0);
    } else {
      for (let slideIndex = 0; slideIndex < document.slideCount; slideIndex += 1) {
        await activate(slideIndex);
        if (slideIndex + 1 < document.slideCount) await yieldToBrowser();
      }
    }

    return Object.freeze({
      document,
      root,
      canvases: Object.freeze(canvases),
      virtualized: virtualize,
      async renderSlide(slideIndex) {
        validateSlideIndex(slideIndex, document.slideCount);
        return activate(slideIndex);
      },
      async cacheStats() {
        return document.cacheStats();
      },
      async close() {
        if (closed) return;
        closed = true;
        observer?.disconnect();
        for (const timer of releaseTimers.values()) clearTimeout(timer);
        releaseTimers.clear();
        await Promise.allSettled(operations.values());
        await Promise.allSettled(releaseOperations.values());
        await document.close();
        root.remove();
      }
    });
  } catch (error) {
    closed = true;
    observer?.disconnect();
    for (const timer of releaseTimers.values()) clearTimeout(timer);
    await Promise.allSettled(releaseOperations.values());
    root.remove();
    await document.close().catch(() => {});
    throw error;
  }
}

function resolveElement(target) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element || typeof element.append !== 'function') {
    throw new TypeError('mount requires a DOM element or a selector that resolves to one.');
  }
  return element;
}

function documentRoot(container, options) {
  if (options.replace !== false) container.replaceChildren();
  const root = document.createElement('div');
  root.className = options.className || 'flyfish-ppt-viewer';
  root.dataset.flyfishPptEdition = 'public-watermarked';
  root.dataset.flyfishPptVirtualized = String(options.virtualize !== false);
  root.style.cssText = 'display:grid;width:100%;min-width:0;justify-content:center;gap:20px;padding:20px;box-sizing:border-box;background:#eef1f5;';
  container.append(root);
  return root;
}

function documentCanvas(root, slideIndex, logicalWidth, logicalHeight, scale) {
  const shell = document.createElement('section');
  shell.dataset.slideIndex = String(slideIndex);
  shell.style.cssText = `width:${Math.round(logicalWidth * scale)}px;max-width:100%;min-width:0;aspect-ratio:${logicalWidth}/${logicalHeight};overflow:hidden;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.14);`;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvas.dataset.renderState = 'idle';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Slide ${slideIndex + 1}`);
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  shell.append(canvas);
  root.append(shell);
  return { shell, canvas };
}

function prepareCanvasElement(canvas, logicalWidth, logicalHeight, scale) {
  canvas.style.width = `${Math.round(logicalWidth * scale)}px`;
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
  canvas.style.display = 'block';
}

function normalizeInput(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError('PPT input must be an ArrayBuffer or Uint8Array.');
}

function copyToArrayBuffer(bytes) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function transferableInputBuffer(input, bytes, transferOwnership) {
  if (transferOwnership
    && bytes.byteOffset === 0
    && bytes.buffer instanceof ArrayBuffer
    && bytes.byteLength === bytes.buffer.byteLength
    && (input instanceof ArrayBuffer || ArrayBuffer.isView(input))) {
    return bytes.buffer;
  }
  return copyToArrayBuffer(bytes);
}

function disabledCacheStats(wasmMemoryBytes = 0) {
  return Object.freeze({
    enabled: false,
    available: false,
    disabledReason: 'worker-disabled',
    entries: 0,
    bytes: 0,
    maxBytes: 0,
    maxEntries: 0,
    maxEntryBytes: 0,
    hits: 0,
    misses: 0,
    writes: 0,
    nativeRenders: 0,
    cancellations: 0,
    attachedCanvases: 0,
    activeCanvases: 0,
    wasmMemoryBytes
  });
}

function hasCfbSignature(bytes) {
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return signature.every((value, index) => bytes[index] === value);
}

function normalizeRenderOptions(options = {}) {
  const scale = finitePositive(options.scale, 1);
  const pixelRatio = finitePositive(options.pixelRatio, defaultPixelRatio());
  const nativeScale = scale * pixelRatio;
  if (nativeScale < 0.1 || nativeScale > 8) {
    throw new RangeError('scale * pixelRatio must be between 0.1 and 8.');
  }
  return { scale, pixelRatio, nativeScale };
}

function normalizeCacheOptions(value) {
  if (value === false) return { enabled: false };
  const options = value && typeof value === 'object' ? value : {};
  return {
    enabled: options.enabled !== false,
    dbName: typeof options.dbName === 'string' && options.dbName.trim() ? options.dbName.trim() : 'flyfish-ppt-frame-cache-v1',
    maxBytes: boundedInteger(options.maxBytes, 256 * 1024 * 1024, 16 * 1024 * 1024, 1024 * 1024 * 1024),
    maxEntries: boundedInteger(options.maxEntries, 200, 8, 2000),
    maxEntryBytes: boundedInteger(options.maxEntryBytes, 32 * 1024 * 1024, 1024 * 1024, 128 * 1024 * 1024)
  };
}

function resolveUrl(value, fallback) {
  if (value === undefined) return fallback;
  if (value instanceof URL) return value;
  if (typeof value === 'string') return new URL(value, globalThis.location?.href || import.meta.url);
  throw new TypeError('Worker rendering asset sources must be URLs or URL strings.');
}

function validateSlideIndex(slideIndex, slideCount) {
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= slideCount) {
    throw new RangeError(`slideIndex must be between 0 and ${slideCount - 1}.`);
  }
}

function ensureOpen(closed) {
  if (closed) throw packageError('document-closed', 'The PPT document is already closed.');
}

function finitePositive(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RangeError('Render scale and pixelRatio must be finite positive numbers.');
  return number;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw packageError('worker-metadata-invalid', `Worker ${label} is invalid.`);
  return number;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw packageError('worker-metadata-invalid', `Worker ${label} is invalid.`);
  return number;
}

function defaultPixelRatio() {
  return typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio) ? Math.max(1, devicePixelRatio) : 1;
}

function yieldToBrowser() {
  if (typeof requestAnimationFrame === 'function') return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  return Promise.resolve();
}

function engineError(api, fallback) {
  const code = Number(api.ppt_last_error_code()) || 0;
  return packageError(`native-${code || 'unknown'}`, `${fallback} (native error ${code || 'unknown'})`);
}

function packageError(code, message) {
  const error = new Error(message);
  error.name = 'FlyfishPptError';
  Object.defineProperty(error, 'code', { value: code, enumerable: true });
  return error;
}
