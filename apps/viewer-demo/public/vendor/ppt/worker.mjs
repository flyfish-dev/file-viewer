/**
 * Bounded, best-effort cache for final watermarked PNG frames.
 *
 * This module is intentionally storage-only. It does not parse PPT data, inspect
 * font assets, or transform renderer output. Every storage failure degrades to a
 * cache miss so IndexedDB can never become a rendering dependency.
 */

const DB_VERSION = 1;
const FRAME_STORE = "frames";
const META_STORE = "meta";
const DOCUMENT_INDEX = "byDocument";
const ACCESS_INDEX = "byLastAccess";
const USAGE_KEY = "usage";

const MIB = 1024 * 1024;
const DEFAULT_DB_NAME = "flyfish-ppt-frame-cache-v1";
const DEFAULT_MAX_BYTES = 256 * MIB;
const DEFAULT_MAX_ENTRIES = 256;
const DEFAULT_MAX_ITEM_BYTES = 32 * MIB;
const MAX_DATABASE_NAME_LENGTH = 128;
const MAX_DOCUMENT_ID_LENGTH = 256;
const MAX_VARIANT_LENGTH = 256;
const MAX_PAGE_INDEX = 10_000_000;
const MAX_DIMENSION = 65_535;
const OPEN_TIMEOUT_MS = 1_000;

function clampInteger(value, fallback, minimum, maximum) {
  let numeric;
  try {
    numeric = Number(value);
  } catch {
    return fallback;
  }
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
}

function normalizeBoundedString(value, maximumLength, { trim = false } = {}) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = trim ? value.trim() : value;
  if (normalized.length === 0 || normalized.length > maximumLength) {
    return null;
  }
  return normalized;
}

/**
 * Pure limit normalization used by both production code and unit tests.
 */
function normalizeFrameCacheLimits(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const maxBytes = clampInteger(source.maxBytes, DEFAULT_MAX_BYTES, 0, 2 * 1024 * MIB);
  const maxEntries = clampInteger(source.maxEntries, DEFAULT_MAX_ENTRIES, 0, 4_096);
  const defaultItemBytes = Math.min(DEFAULT_MAX_ITEM_BYTES, maxBytes);
  const configuredItemBytes = source.maxItemBytes ?? source.maxEntryBytes;
  const maxItemBytes = maxBytes === 0
    ? 0
    : clampInteger(configuredItemBytes, defaultItemBytes, 0, maxBytes);
  return Object.freeze({ maxBytes, maxEntries, maxItemBytes });
}

/**
 * Pure cache-key normalization. Invalid or potentially collision-prone inputs
 * return null instead of being truncated.
 */
function normalizeFrameCacheKey(input, pageIndex, variant = "") {
  const source = input && typeof input === "object"
    ? input
    : { documentId: input, pageIndex, variant };

  const documentId = normalizeBoundedString(source.documentId, MAX_DOCUMENT_ID_LENGTH, { trim: true });
  let normalizedPageIndex;
  let normalizedVariant;
  try {
    normalizedPageIndex = Number(source.pageIndex);
    normalizedVariant = source.variant == null ? "" : String(source.variant);
  } catch {
    return null;
  }

  if (
    documentId == null
    || !Number.isSafeInteger(normalizedPageIndex)
    || normalizedPageIndex < 0
    || normalizedPageIndex > MAX_PAGE_INDEX
    || normalizedVariant.length > MAX_VARIANT_LENGTH
  ) {
    return null;
  }

  // Length-prefixing prevents separators inside opaque identifiers from
  // creating collisions.
  const key = `v1:${documentId.length}:${documentId}:${normalizedPageIndex}:${normalizedVariant.length}:${normalizedVariant}`;
  return Object.freeze({
    key,
    documentId,
    pageIndex: normalizedPageIndex,
    variant: normalizedVariant,
  });
}

function createFrameCacheKey(documentId, pageIndex, variant = "") {
  return normalizeFrameCacheKey(documentId, pageIndex, variant)?.key ?? null;
}

function normalizeDatabaseName(value) {
  return normalizeBoundedString(value, MAX_DATABASE_NAME_LENGTH, { trim: true }) ?? DEFAULT_DB_NAME;
}

function isPngBlob(blob) {
  return Boolean(
    blob
    && typeof blob === "object"
    && Number.isSafeInteger(blob.size)
    && blob.size > 0
    && typeof blob.arrayBuffer === "function"
    && typeof blob.type === "string"
    && blob.type.toLowerCase() === "image/png",
  );
}

function normalizeDimension(value) {
  let numeric;
  try {
    numeric = Number(value);
  } catch {
    return null;
  }
  return Number.isSafeInteger(numeric) && numeric > 0 && numeric <= MAX_DIMENSION
    ? numeric
    : null;
}

function normalizePutArguments(keyInput, frameInput, limits) {
  const frame = frameInput && typeof frameInput === "object" ? frameInput : keyInput;
  const key = normalizeFrameCacheKey(keyInput);
  const width = normalizeDimension(frame?.width);
  const height = normalizeDimension(frame?.height);
  const blob = frame?.blob;

  if (key == null || width == null || height == null || !isPngBlob(blob)) {
    return null;
  }
  if (blob.size > limits.maxItemBytes || blob.size > limits.maxBytes) {
    return null;
  }
  return { ...key, blob, width, height, byteSize: blob.size };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionError(transaction, fallbackMessage) {
  return transaction.error ?? new Error(fallbackMessage);
}

function openDatabase(factory, dbName) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    let timer = null;

    const settle = (callback, value) => {
      if (settled) {
        if (value && typeof value.close === "function") {
          value.close();
        }
        return;
      }
      settled = true;
      if (timer != null) {
        clearTimeout(timer);
      }
      callback(value);
    };

    try {
      request = factory.open(dbName, DB_VERSION);
    } catch (error) {
      settle(reject, error);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      let frameStore;
      if (!database.objectStoreNames.contains(FRAME_STORE)) {
        frameStore = database.createObjectStore(FRAME_STORE, { keyPath: "key" });
      } else {
        frameStore = request.transaction.objectStore(FRAME_STORE);
      }
      if (!frameStore.indexNames.contains(DOCUMENT_INDEX)) {
        frameStore.createIndex(DOCUMENT_INDEX, "documentId", { unique: false });
      }
      if (!frameStore.indexNames.contains(ACCESS_INDEX)) {
        frameStore.createIndex(ACCESS_INDEX, "lastAccess", { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => settle(resolve, request.result);
    request.onerror = () => settle(reject, request.error ?? new Error("Unable to open IndexedDB"));
    request.onblocked = () => settle(reject, new Error("IndexedDB open was blocked"));

    if (typeof setTimeout === "function") {
      timer = setTimeout(() => {
        settle(reject, new Error("IndexedDB open timed out"));
      }, OPEN_TIMEOUT_MS);
    }
  });
}

function isStoredFrameValid(record) {
  return Boolean(
    record
    && typeof record === "object"
    && typeof record.key === "string"
    && typeof record.documentId === "string"
    && Number.isSafeInteger(record.pageIndex)
    && normalizeDimension(record.width) != null
    && normalizeDimension(record.height) != null
    && Number.isSafeInteger(record.byteSize)
    && record.byteSize > 0
    && isPngBlob(record.blob)
    && record.blob.size === record.byteSize,
  );
}

function reconcileUsage(database, limits) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction([FRAME_STORE, META_STORE], "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    const frames = transaction.objectStore(FRAME_STORE);
    const meta = transaction.objectStore(META_STORE);
    let totalBytes = 0;
    let totalEntries = 0;

    const writeUsage = () => {
      meta.put({
        key: USAGE_KEY,
        totalBytes,
        totalEntries,
        updatedAt: Date.now(),
      });
    };

    const withinLimits = () => (
      totalBytes <= limits.maxBytes
      && totalEntries <= limits.maxEntries
    );

    const trimOldest = () => {
      if (withinLimits()) {
        writeUsage();
        return;
      }
      const trimRequest = frames.index(ACCESS_INDEX).openCursor();
      trimRequest.onsuccess = () => {
        const cursor = trimRequest.result;
        if (cursor == null) {
          totalBytes = 0;
          totalEntries = 0;
          writeUsage();
          return;
        }
        const record = cursor.value;
        cursor.delete();
        if (isStoredFrameValid(record)) {
          totalBytes = Math.max(0, totalBytes - record.byteSize);
          totalEntries = Math.max(0, totalEntries - 1);
        }
        if (withinLimits()) {
          writeUsage();
        } else {
          cursor.continue();
        }
      };
    };

    const cursorRequest = frames.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor == null) {
        trimOldest();
        return;
      }
      const record = cursor.value;
      if (isStoredFrameValid(record) && record.byteSize <= limits.maxItemBytes) {
        totalBytes += record.byteSize;
        totalEntries += 1;
      } else {
        cursor.delete();
      }
      cursor.continue();
    };

    transaction.oncomplete = () => resolve({ totalBytes, totalEntries });
    transaction.onerror = () => reject(transactionError(transaction, "IndexedDB reconciliation failed"));
    transaction.onabort = () => reject(transactionError(transaction, "IndexedDB reconciliation was aborted"));
  });
}

function readUsageRecord(value) {
  const totalBytes = Number.isSafeInteger(value?.totalBytes) && value.totalBytes >= 0
    ? value.totalBytes
    : 0;
  const totalEntries = Number.isSafeInteger(value?.totalEntries) && value.totalEntries >= 0
    ? value.totalEntries
    : 0;
  return { totalBytes, totalEntries };
}

function putFrame(database, record, limits) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction([FRAME_STORE, META_STORE], "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    const frames = transaction.objectStore(FRAME_STORE);
    const meta = transaction.objectStore(META_STORE);
    let existing;
    let usage;
    let existingReady = false;
    let usageReady = false;
    let started = false;

    const failRequest = () => {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have been aborted by the browser.
      }
    };

    const finalizeWrite = () => {
      const now = record.lastAccess;
      frames.put(record);
      meta.put({
        key: USAGE_KEY,
        totalBytes: usage.totalBytes,
        totalEntries: usage.totalEntries,
        updatedAt: now,
      });
    };

    const evictIfNeeded = () => {
      if (started || !existingReady || !usageReady) {
        return;
      }
      started = true;

      const oldBytes = isStoredFrameValid(existing) ? existing.byteSize : 0;
      const oldEntries = isStoredFrameValid(existing) ? 1 : 0;
      usage.totalBytes = Math.max(0, usage.totalBytes - oldBytes) + record.byteSize;
      usage.totalEntries = Math.max(0, usage.totalEntries - oldEntries) + 1;

      const withinLimits = () => (
        usage.totalBytes <= limits.maxBytes
        && usage.totalEntries <= limits.maxEntries
      );

      if (withinLimits()) {
        finalizeWrite();
        return;
      }

      const cursorRequest = frames.index(ACCESS_INDEX).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor == null) {
          if (withinLimits()) {
            finalizeWrite();
          } else {
            failRequest();
          }
          return;
        }

        const candidate = cursor.value;
        if (candidate?.key !== record.key && isStoredFrameValid(candidate)) {
          cursor.delete();
          usage.totalBytes = Math.max(0, usage.totalBytes - candidate.byteSize);
          usage.totalEntries = Math.max(0, usage.totalEntries - 1);
        } else if (candidate?.key !== record.key) {
          cursor.delete();
        }

        if (withinLimits()) {
          finalizeWrite();
        } else {
          cursor.continue();
        }
      };
      cursorRequest.onerror = failRequest;
    };

    const existingRequest = frames.get(record.key);
    existingRequest.onsuccess = () => {
      existing = existingRequest.result;
      existingReady = true;
      evictIfNeeded();
    };
    existingRequest.onerror = failRequest;

    const usageRequest = meta.get(USAGE_KEY);
    usageRequest.onsuccess = () => {
      usage = readUsageRecord(usageRequest.result);
      usageReady = true;
      evictIfNeeded();
    };
    usageRequest.onerror = failRequest;

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transactionError(transaction, "IndexedDB frame write failed"));
    transaction.onabort = () => reject(transactionError(transaction, "IndexedDB frame write was aborted"));
  });
}

function getFrame(database, key, nextAccess) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction(FRAME_STORE, "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(FRAME_STORE);
    let result = null;
    const request = store.get(key.key);
    request.onsuccess = () => {
      const record = request.result;
      if (!isStoredFrameValid(record)) {
        if (record != null) {
          store.delete(key.key);
        }
        return;
      }
      record.lastAccess = nextAccess();
      store.put(record);
      result = {
        blob: record.blob,
        width: record.width,
        height: record.height,
        byteSize: record.byteSize,
        lastAccess: record.lastAccess,
      };
    };

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transactionError(transaction, "IndexedDB frame read failed"));
    transaction.onabort = () => reject(transactionError(transaction, "IndexedDB frame read was aborted"));
  });
}

function deleteFrame(database, key) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction([FRAME_STORE, META_STORE], "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    const frames = transaction.objectStore(FRAME_STORE);
    const meta = transaction.objectStore(META_STORE);
    let deleted = false;
    const getRequest = frames.get(key.key);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing == null) {
        return;
      }
      deleted = true;
      const existingIsValid = isStoredFrameValid(existing);
      const usageRequest = meta.get(USAGE_KEY);
      usageRequest.onsuccess = () => {
        const usage = readUsageRecord(usageRequest.result);
        frames.delete(key.key);
        meta.put({
          key: USAGE_KEY,
          totalBytes: Math.max(0, usage.totalBytes - (existingIsValid ? existing.byteSize : 0)),
          totalEntries: Math.max(0, usage.totalEntries - (existingIsValid ? 1 : 0)),
          updatedAt: Date.now(),
        });
      };
    };

    transaction.oncomplete = () => resolve(deleted);
    transaction.onerror = () => reject(transactionError(transaction, "IndexedDB frame delete failed"));
    transaction.onabort = () => reject(transactionError(transaction, "IndexedDB frame delete was aborted"));
  });
}

function clearDocumentFrames(database, documentId) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = database.transaction([FRAME_STORE, META_STORE], "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    const frames = transaction.objectStore(FRAME_STORE);
    const meta = transaction.objectStore(META_STORE);
    let usage = null;
    let cursorFinished = false;
    let deletedEntries = 0;
    let deletedBytes = 0;
    let finalized = false;

    const maybeFinalize = () => {
      if (finalized || usage == null || !cursorFinished) {
        return;
      }
      finalized = true;
      meta.put({
        key: USAGE_KEY,
        totalBytes: Math.max(0, usage.totalBytes - deletedBytes),
        totalEntries: Math.max(0, usage.totalEntries - deletedEntries),
        updatedAt: Date.now(),
      });
    };

    const usageRequest = meta.get(USAGE_KEY);
    usageRequest.onsuccess = () => {
      usage = readUsageRecord(usageRequest.result);
      maybeFinalize();
    };

    const cursorRequest = frames.index(DOCUMENT_INDEX).openCursor(documentId);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor == null) {
        cursorFinished = true;
        maybeFinalize();
        return;
      }
      const record = cursor.value;
      if (isStoredFrameValid(record)) {
        deletedEntries += 1;
        deletedBytes += record.byteSize;
      }
      cursor.delete();
      cursor.continue();
    };

    transaction.oncomplete = () => resolve(deletedEntries);
    transaction.onerror = () => reject(transactionError(transaction, "IndexedDB document clear failed"));
    transaction.onabort = () => reject(transactionError(transaction, "IndexedDB document clear was aborted"));
  });
}

/**
 * Create a cache facade that is safe in Window and DedicatedWorkerGlobalScope.
 * The facade is synchronous; all storage methods are asynchronous and never
 * throw for storage availability, quota, cloning, or transaction failures.
 */
function createFrameCache(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const limits = normalizeFrameCacheLimits(source);
  const dbName = normalizeDatabaseName(source.dbName);
  const factory = source.indexedDB ?? globalThis.indexedDB;
  const enabled = source.enabled !== false;
  let closed = false;
  let disabledReason = !enabled
    ? "disabled"
    : factory && typeof factory.open === "function"
      ? null
      : "unavailable";
  let databasePromise = null;
  let lastAccess = 0;

  const nextAccess = () => {
    lastAccess = Math.max(Date.now(), lastAccess + 1);
    return lastAccess;
  };

  const disable = (error) => {
    if (disabledReason == null) {
      disabledReason = typeof error?.name === "string" && error.name
        ? error.name
        : "storage-error";
    }
    if (databasePromise != null) {
      databasePromise.then((database) => database?.close()).catch(() => {});
    }
  };

  const getDatabase = async () => {
    if (closed || disabledReason != null) {
      return null;
    }
    if (databasePromise == null) {
      databasePromise = openDatabase(factory, dbName)
        .then(async (database) => {
          database.onversionchange = () => {
            database.close();
            disable({ name: "version-change" });
          };
          await reconcileUsage(database, limits);
          return database;
        })
        .catch((error) => {
          disable(error);
          return null;
        });
    }
    return databasePromise;
  };

  const run = async (operation, fallback) => {
    if (closed || disabledReason != null) {
      return fallback;
    }
    const database = await getDatabase();
    if (database == null) {
      return fallback;
    }
    try {
      return await operation(database);
    } catch (error) {
      // QuotaExceededError, Safari's InvalidStateError / TransactionInactiveError,
      // private-mode failures, and structured-clone failures all become misses.
      disable(error);
      return fallback;
    }
  };

  return Object.freeze({
    async get(keyInput) {
      const key = normalizeFrameCacheKey(keyInput);
      if (key == null) {
        return null;
      }
      return run((database) => getFrame(database, key, nextAccess), null);
    },

    async put(keyInput, frameInput) {
      const input = normalizePutArguments(keyInput, frameInput, limits);
      if (input == null) {
        return false;
      }
      const record = {
        ...input,
        lastAccess: nextAccess(),
      };
      return run((database) => putFrame(database, record, limits), false);
    },

    async delete(keyInput) {
      const key = normalizeFrameCacheKey(keyInput);
      if (key == null) {
        return false;
      }
      return run((database) => deleteFrame(database, key), false);
    },

    async clearDocument(documentId) {
      const normalized = normalizeBoundedString(documentId, MAX_DOCUMENT_ID_LENGTH, { trim: true });
      if (normalized == null) {
        return 0;
      }
      return run((database) => clearDocumentFrames(database, normalized), 0);
    },

    async stats() {
      const unavailable = () => ({
        available: false,
        disabledReason: closed ? "closed" : disabledReason ?? "unavailable",
        entries: 0,
        totalBytes: 0,
        ...limits,
      });
      if (closed || disabledReason != null) {
        return unavailable();
      }
      const result = await run(async (database) => {
        let transaction;
        try {
          transaction = database.transaction(META_STORE, "readonly");
        } catch (error) {
          throw error;
        }
        const value = await requestResult(transaction.objectStore(META_STORE).get(USAGE_KEY));
        const usage = readUsageRecord(value);
        return {
          available: true,
          disabledReason: null,
          entries: usage.totalEntries,
          totalBytes: usage.totalBytes,
          ...limits,
        };
      }, null);
      return result ?? unavailable();
    },

    close() {
      if (closed) {
        return;
      }
      closed = true;
      if (databasePromise != null) {
        databasePromise.then((database) => database?.close()).catch(() => {});
      }
    },
  });
}

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

const CFB_SIGNATURE = Object.freeze([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const MAX_ASSET_BYTES = 64 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 256 * 1024 * 1024;
const CACHE_VARIANT_VERSION = 'flyfish-ppt-final-watermarked-png-v1';

let runtime = null;
let requestQueue = Promise.resolve();
let sessionEpoch = 0;
const activationIntents = new Map();
const pendingRequestIds = new Set();
const activeAbortControllers = new Set();

const counters = {
  cacheHits: 0,
  cacheMisses: 0,
  cacheWrites: 0,
  nativeRenders: 0,
  cancellations: 0
};

const workerScope = globalThis;
if (typeof workerScope.addEventListener === 'function' && typeof workerScope.postMessage === 'function') {
  workerScope.addEventListener('message', (event) => enqueueRequest(event.data));
}

function enqueueRequest(message) {
  const fallbackId = isRecord(message) && isRequestId(message.id) ? message.id : null;
  let request;
  try {
    request = prepareRequest(message);
  } catch (error) {
    postResponse(fallbackId, false, serializeError(error));
    return;
  }

  const requestKey = idKey(request.id);
  if (pendingRequestIds.has(requestKey)) {
    postResponse(request.id, false, serializeError(workerError(
      'duplicate-request-id',
      'Worker request ids must remain unique until their responses are delivered.'
    )));
    return;
  }
  pendingRequestIds.add(requestKey);

  requestQueue = requestQueue.then(async () => {
    try {
      const result = await dispatchRequest(request);
      postResponse(request.id, true, result);
    } catch (error) {
      if (error instanceof CancelledOperation) {
        counters.cancellations += 1;
        postResponse(request.id, true, Object.freeze({ cancelled: true }));
      } else {
        postResponse(request.id, false, serializeError(error));
      }
    } finally {
      pendingRequestIds.delete(requestKey);
    }
  });
}

function prepareRequest(message) {
  if (!isRecord(message)) throw workerError('request-invalid', 'Worker requests must be objects.');
  if (!isRequestId(message.id)) {
    throw workerError('request-id-invalid', 'Worker requests require a finite number or non-empty string id.');
  }
  if (typeof message.type !== 'string' || message.type.length === 0) {
    throw workerError('request-type-invalid', 'Worker requests require a non-empty type.');
  }
  if (!['init', 'open', 'attach', 'activate', 'deactivate', 'cacheStats', 'close'].includes(message.type)) {
    throw workerError('request-type-unsupported', `Unsupported worker request type: ${message.type}`);
  }

  if (message.type === 'init' || message.type === 'close') {
    sessionEpoch += 1;
    activationIntents.clear();
    abortActiveOperations();
  }

  let intentRevision = null;
  if (message.type === 'activate' || message.type === 'deactivate') {
    const slideIndex = requireSlideIndex(message.slideIndex, false);
    const previous = activationIntents.get(slideIndex) || { revision: 0, active: false };
    const next = {
      revision: previous.revision + 1,
      active: message.type === 'activate'
    };
    activationIntents.set(slideIndex, next);
    intentRevision = next.revision;
  }

  return Object.freeze({
    id: message.id,
    type: message.type,
    message,
    epoch: sessionEpoch,
    intentRevision
  });
}

async function dispatchRequest(request) {
  assertCurrent(request);
  switch (request.type) {
    case 'init':
      return initialize(request);
    case 'open':
      return openDocument(request);
    case 'attach':
      return attachCanvas(request);
    case 'activate':
      return activateCanvas(request);
    case 'deactivate':
      return deactivateCanvas(request);
    case 'cacheStats':
      return cacheStats(request);
    case 'close':
      return closeRuntime(request);
    default:
      throw workerError('request-type-unsupported', `Unsupported worker request type: ${request.type}`);
  }
}

async function initialize(request) {
  await releaseRuntime();
  assertCurrent(request);
  resetCounters();

  const manifest = normalizeManifest(request.message.manifest);
  const wasmUrl = normalizeAssetUrl(request.message.wasmUrl, 'wasmUrl');
  const fontUrl = normalizeAssetUrl(request.message.fontUrl, 'fontUrl');
  const cacheOptions = normalizeCacheOptions(request.message.cacheOptions);
  requireWebCrypto();

  const controller = new AbortController();
  activeAbortControllers.add(controller);
  let cache = null;
  try {
    const fontPromise = downloadVerifiedAsset(
      fontUrl,
      manifest.fontPack.bytes,
      manifest.fontPack.sha256,
      'PPT native font pack',
      controller.signal
    );
    void fontPromise.catch(() => {});
    const wasmBytes = await downloadVerifiedAsset(
      wasmUrl,
      manifest.wasmBytes,
      manifest.wasmSha256,
      'PPT native WASM',
      controller.signal
    );
    assertCurrent(request);

    // Security invariant: no unverified bytes are presented to the WebAssembly
    // compiler. Streaming compilation and compile-before-hash are deliberately
    // not used by this worker.
    const module = await WebAssembly.compile(wasmBytes);
    assertCurrent(request);
    validateModule(module);
    const instance = await WebAssembly.instantiate(module, {});
    assertCurrent(request);
    validateEngine(instance.exports);
    const fontBytes = await fontPromise;
    assertCurrent(request);
    installFontPack(instance.exports, fontBytes);

    cache = createFrameCache(cacheOptions);
    runtime = {
      manifest,
      instance,
      api: instance.exports,
      cache,
      document: null,
      attachments: new Map()
    };

    const cacheSnapshot = await safeCacheStats(cache);
    assertCurrent(request);
    return Object.freeze({
      initialized: true,
      wasmSha256: manifest.wasmSha256,
      wasmBytes: manifest.wasmBytes,
      fontPackSha256: manifest.fontPack.sha256,
      fontPackBytes: manifest.fontPack.bytes,
      fontPackInstalled: true,
      cache: cacheSnapshot
    });
  } catch (error) {
    controller.abort();
    if (cache) cache.close();
    runtime = null;
    if (!isCurrent(request) || error?.name === 'AbortError') throw new CancelledOperation();
    throw error;
  } finally {
    activeAbortControllers.delete(controller);
  }
}

async function openDocument(request) {
  const current = requireRuntime();
  if (current.document) {
    throw workerError('document-already-open', 'Close the current PPT document before opening another one.');
  }
  const input = request.message.input;
  if (!(input instanceof ArrayBuffer) || typeof SharedArrayBuffer !== 'undefined' && input instanceof SharedArrayBuffer) {
    throw workerError('document-input-invalid', 'open requires a transferable ArrayBuffer in the input field.');
  }
  const bytes = new Uint8Array(input);
  if (bytes.byteLength < CFB_SIGNATURE.length || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw workerError('document-size-invalid', 'The PPT input length is outside the supported range.');
  }
  if (!CFB_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw workerError('document-signature-invalid', 'Input is not a PowerPoint 97-2003 compound document.');
  }

  const documentHashPromise = sha256Hex(bytes);
  let handle = 0;
  try {
    handle = copyAndOpenDocument(current.api, bytes);
    if (!handle) throw engineError(current.api, 'The native PPT parser rejected the document.');
    const slideCount = Number(current.api.ppt_slide_count(handle));
    const width = Number(current.api.ppt_slide_width(handle, 1000));
    const height = Number(current.api.ppt_slide_height(handle, 1000));
    if (!Number.isInteger(slideCount) || slideCount < 1 || slideCount > 10_000
      || !Number.isInteger(width) || width < 1
      || !Number.isInteger(height) || height < 1) {
      throw engineError(current.api, 'The native PPT parser returned invalid document metadata.');
    }
    const sha256 = await documentHashPromise;
    assertCurrent(request);
    current.document = Object.freeze({ handle, sha256, slideCount, width, height });
    handle = 0;
    return Object.freeze({
      documentId: sha256,
      sha256,
      slideCount,
      width,
      height
    });
  } catch (error) {
    await documentHashPromise.catch(() => {});
    if (handle) current.api.ppt_document_close(handle);
    if (!isCurrent(request)) throw new CancelledOperation();
    throw error;
  }
}

function attachCanvas(request) {
  const current = requireOpenDocument();
  const slideIndex = requireSlideIndex(request.message.slideIndex, true, current.document.slideCount);
  const canvas = request.message.canvas;
  if (typeof OffscreenCanvas !== 'function' || !(canvas instanceof OffscreenCanvas)) {
    throw workerError('canvas-invalid', 'attach requires a transferred OffscreenCanvas in the canvas field.');
  }
  const renderOptions = normalizeRenderOptions(request.message.scale, request.message.pixelRatio);
  const context = canvas.getContext('2d', { alpha: false, desynchronized: false });
  if (!context || typeof context.putImageData !== 'function' || typeof context.drawImage !== 'function') {
    throw workerError('canvas-context-unavailable', 'A Worker-compatible Canvas 2D context is required.');
  }

  const existing = current.attachments.get(slideIndex);
  if (existing) releaseCanvasBacking(existing.canvas);
  releaseCanvasBacking(canvas);
  const attachment = {
    slideIndex,
    canvas,
    context,
    scale: renderOptions.scale,
    pixelRatio: renderOptions.pixelRatio,
    active: false,
    rendered: null
  };
  current.attachments.set(slideIndex, attachment);
  return Object.freeze({
    attached: true,
    slideIndex,
    scale: attachment.scale,
    pixelRatio: attachment.pixelRatio
  });
}

async function activateCanvas(request) {
  const current = requireOpenDocument();
  const slideIndex = requireSlideIndex(request.message.slideIndex, true, current.document.slideCount);
  const attachment = current.attachments.get(slideIndex);
  if (!attachment) throw workerError('canvas-not-attached', `Slide ${slideIndex} has no attached OffscreenCanvas.`);
  assertActivationCurrent(request, slideIndex, true);

  const renderOptions = normalizeRenderOptions(request.message.scale, request.message.pixelRatio);
  attachment.scale = renderOptions.scale;
  attachment.pixelRatio = renderOptions.pixelRatio;
  const dimensions = slideDimensions(current.api, current.document.handle, renderOptions.scaleMilli);
  const cacheKey = frameCacheKey(current, slideIndex, renderOptions.scaleMilli, dimensions);

  const cached = await current.cache.get(cacheKey);
  assertCurrent(request);
  assertActivationCurrent(request, slideIndex, true);
  if (validCachedFrame(cached, dimensions)) {
    const drawn = await drawCachedFrame(attachment, cached.blob, dimensions, request);
    if (drawn) {
      counters.cacheHits += 1;
      attachment.active = true;
      attachment.rendered = renderMetadata(
        slideIndex,
        renderOptions,
        dimensions,
        cacheKey,
        'indexeddb'
      );
      return Object.freeze({ ...attachment.rendered, cancelled: false });
    }
    await current.cache.delete(cacheKey);
  } else if (cached) {
    await current.cache.delete(cacheKey);
  }
  counters.cacheMisses += 1;

  assertCurrent(request);
  assertActivationCurrent(request, slideIndex, true);
  drawNativeFrame(current.api, current.document.handle, slideIndex, renderOptions.scaleMilli, dimensions, attachment);
  counters.nativeRenders += 1;
  attachment.active = true;
  attachment.rendered = renderMetadata(
    slideIndex,
    renderOptions,
    dimensions,
    cacheKey,
    'native'
  );
  return Object.freeze({ ...attachment.rendered, cancelled: false });
}

async function deactivateCanvas(request) {
  const current = requireOpenDocument();
  const slideIndex = requireSlideIndex(request.message.slideIndex, true, current.document.slideCount);
  const attachment = current.attachments.get(slideIndex);
  if (!attachment) throw workerError('canvas-not-attached', `Slide ${slideIndex} has no attached OffscreenCanvas.`);
  assertActivationCurrent(request, slideIndex, false);

  let stored = false;
  if (attachment.rendered
    && attachment.rendered.source !== 'indexeddb'
    && attachment.canvas.width > 1
    && attachment.canvas.height > 1) {
    if (typeof attachment.canvas.convertToBlob !== 'function') {
      throw workerError('canvas-blob-unavailable', 'OffscreenCanvas PNG encoding is unavailable in this Worker.');
    }
    const blob = await attachment.canvas.convertToBlob({ type: 'image/png' });
    assertCurrent(request);
    assertActivationCurrent(request, slideIndex, false);
    if (!(blob instanceof Blob) || blob.type !== 'image/png' || blob.size === 0) {
      throw workerError('canvas-png-invalid', 'OffscreenCanvas did not produce a valid final-frame PNG.');
    }
    stored = await current.cache.put(attachment.rendered.cacheKey, {
      blob,
      width: attachment.rendered.width,
      height: attachment.rendered.height
    });
    if (stored) counters.cacheWrites += 1;
    assertCurrent(request);
    assertActivationCurrent(request, slideIndex, false);
  }

  attachment.active = false;
  releaseCanvasBacking(attachment.canvas);
  return Object.freeze({
    deactivated: true,
    slideIndex,
    cached: stored,
    width: 1,
    height: 1
  });
}

async function cacheStats(request) {
  assertCurrent(request);
  const current = requireRuntime();
  const persisted = await safeCacheStats(current.cache);
  assertCurrent(request);
  return Object.freeze({
    enabled: persisted.disabledReason !== 'disabled',
    available: persisted.available === true,
    disabledReason: persisted.disabledReason ?? null,
    entries: Number(persisted.entries) || 0,
    bytes: Number(persisted.totalBytes) || 0,
    maxBytes: Number(persisted.maxBytes) || 0,
    maxEntries: Number(persisted.maxEntries) || 0,
    maxEntryBytes: Number(persisted.maxItemBytes) || 0,
    hits: counters.cacheHits,
    misses: counters.cacheMisses,
    writes: counters.cacheWrites,
    nativeRenders: counters.nativeRenders,
    cancellations: counters.cancellations,
    attachedCanvases: current.attachments.size,
    activeCanvases: Array.from(current.attachments.values()).filter((item) => item.active).length,
    wasmMemoryBytes: current.api.memory.buffer.byteLength
  });
}

async function closeRuntime(request) {
  releaseDocument(requireRuntime());
  assertCurrent(request);
  return Object.freeze({ closed: true });
}

async function releaseRuntime() {
  const current = runtime;
  runtime = null;
  if (!current) return;

  let closeError = null;
  try {
    releaseDocument(current);
  } catch (error) {
    closeError = error;
  }
  try {
    current.cache.close();
  } catch (error) {
    closeError ||= error;
  }
  if (closeError) throw closeError;
}

function releaseDocument(current) {
  let closeError = null;
  if (current.document) {
    try {
      if (Number(current.api.ppt_document_close(current.document.handle)) !== 1) {
        closeError = engineError(current.api, 'Unable to close the native PPT document.');
      }
    } catch (error) {
      closeError = error;
    }
  }
  current.document = null;
  for (const attachment of current.attachments.values()) releaseCanvasBacking(attachment.canvas);
  current.attachments.clear();
  activationIntents.clear();
  if (closeError) throw closeError;
}

async function downloadVerifiedAsset(url, expectedBytes, expectedSha256, label, signal) {
  const response = await fetch(url, { signal, cache: 'default', credentials: 'same-origin' });
  if (!response.ok) {
    throw workerError('asset-request-failed', `${label} request failed with HTTP ${response.status}.`);
  }

  const encoding = response.headers.get('content-encoding');
  const contentLength = response.headers.get('content-length');
  if (!encoding && contentLength && Number(contentLength) !== expectedBytes) {
    throw workerError('asset-length-invalid', `${label} Content-Length did not match its manifest.`);
  }

  const bytes = await readExactResponseBytes(response, expectedBytes, label, signal);
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== expectedSha256) {
    throw workerError('asset-integrity-invalid', `${label} failed its SHA-256 integrity check.`);
  }
  return bytes;
}

async function readExactResponseBytes(response, expectedBytes, label, signal) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== expectedBytes) {
      throw workerError('asset-length-invalid', `${label} byte length did not match its manifest.`);
    }
    return new Uint8Array(buffer);
  }

  const output = new Uint8Array(expectedBytes);
  const reader = response.body.getReader();
  let offset = 0;
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || offset + value.byteLength > expectedBytes) {
        await reader.cancel();
        throw workerError('asset-length-invalid', `${label} exceeded its manifest byte length.`);
      }
      output.set(value, offset);
      offset += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  if (offset !== expectedBytes) {
    throw workerError('asset-length-invalid', `${label} byte length did not match its manifest.`);
  }
  return output;
}

function validateModule(module) {
  const imports = WebAssembly.Module.imports(module);
  if (imports.length !== 0) {
    throw workerError('wasm-imports-rejected', 'The PPT rendering engine must not import browser or host functions.');
  }
  const actual = WebAssembly.Module.exports(module)
    .map(({ name, kind }) => `${kind}:${name}`)
    .sort();
  const expected = WASM_EXPORTS
    .map((name) => `${name === 'memory' ? 'memory' : 'function'}:${name}`)
    .sort();
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw workerError('wasm-abi-invalid', 'The PPT rendering engine has an unexpected public ABI.');
  }
}

function validateEngine(api) {
  const actual = Object.keys(api).sort();
  const expected = [...WASM_EXPORTS].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw workerError('wasm-abi-invalid', 'The PPT rendering engine instance has an unexpected public ABI.');
  }
  if (!(api.memory instanceof WebAssembly.Memory)) {
    throw workerError('wasm-memory-invalid', 'The PPT rendering engine did not export its bounded memory.');
  }
  for (const name of WASM_EXPORTS) {
    if (name !== 'memory' && typeof api[name] !== 'function') {
      throw workerError('wasm-abi-invalid', `The PPT rendering engine is missing ${name}.`);
    }
  }
}

function installFontPack(api, bytes) {
  if (Number(api.ppt_font_pack_is_installed()) !== 0) {
    throw workerError('font-pack-state-invalid', 'The native font pack was unexpectedly installed before initialization.');
  }
  const pointer = Number(api.ppt_input_alloc(bytes.byteLength));
  if (!pointer) throw engineError(api, 'Unable to allocate native font-pack memory.');
  let consumed = false;
  try {
    new Uint8Array(api.memory.buffer, pointer, bytes.byteLength).set(bytes);
    const installed = Number(api.ppt_font_pack_install(pointer, bytes.byteLength));
    if (installed !== 1) throw engineError(api, 'The native engine rejected the verified font pack.');
    // A successful install transfers allocation ownership to native code. It
    // must not be passed to ppt_input_free afterwards.
    consumed = true;
    if (Number(api.ppt_font_pack_is_installed()) !== 1) {
      throw workerError('font-pack-state-invalid', 'The native font pack did not enter the installed state.');
    }
  } finally {
    if (!consumed && Number(api.ppt_input_free(pointer, bytes.byteLength)) !== 1) {
      throw engineError(api, 'Unable to release rejected native font-pack memory.');
    }
  }
}

function copyAndOpenDocument(api, bytes) {
  const pointer = Number(api.ppt_input_alloc(bytes.byteLength));
  if (!pointer) throw engineError(api, 'Unable to allocate native PPT input memory.');
  let handle = 0;
  let openErrorCode = 0;
  let primaryError = null;
  try {
    new Uint8Array(api.memory.buffer, pointer, bytes.byteLength).set(bytes);
    handle = Number(api.ppt_document_open(pointer, bytes.byteLength));
    if (!handle) openErrorCode = Number(api.ppt_last_error_code()) || 0;
  } catch (error) {
    primaryError = error;
  }
  const released = Number(api.ppt_input_free(pointer, bytes.byteLength));
  if (primaryError) throw primaryError;
  if (released !== 1) {
    const releaseError = engineError(api, 'Unable to release native PPT input memory.');
    if (handle) api.ppt_document_close(handle);
    throw releaseError;
  }
  if (!handle) {
    throw workerError(
      `native-${openErrorCode || 'unknown'}`,
      `The native PPT parser rejected the document. (native error ${openErrorCode || 'unknown'})`
    );
  }
  return handle;
}

function slideDimensions(api, documentHandle, scaleMilli) {
  const width = Number(api.ppt_slide_width(documentHandle, scaleMilli));
  const height = Number(api.ppt_slide_height(documentHandle, scaleMilli));
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw engineError(api, 'The native engine returned invalid slide dimensions.');
  }
  return Object.freeze({ width, height });
}

function drawNativeFrame(api, documentHandle, slideIndex, scaleMilli, dimensions, attachment) {
  const frame = Number(api.ppt_render_slide_rgba(documentHandle, slideIndex, scaleMilli));
  if (!frame) throw engineError(api, `Unable to render slide ${slideIndex + 1}.`);
  let primaryError = null;
  try {
    const width = Number(api.ppt_frame_width(frame));
    const height = Number(api.ppt_frame_height(frame));
    const stride = Number(api.ppt_frame_stride(frame));
    const length = Number(api.ppt_frame_len(frame));
    const pointer = Number(api.ppt_frame_ptr(frame));
    const expectedLength = dimensions.width * dimensions.height * 4;
    if (width !== dimensions.width || height !== dimensions.height || stride !== width * 4
      || length !== expectedLength || !pointer || pointer + length > api.memory.buffer.byteLength) {
      throw workerError('wasm-frame-invalid', 'The native engine returned an invalid final RGBA frame.');
    }

    attachment.canvas.width = width;
    attachment.canvas.height = height;
    const pixels = new Uint8ClampedArray(api.memory.buffer, pointer, length);
    let imageData;
    if (typeof ImageData === 'function') {
      imageData = new ImageData(pixels, width, height);
    } else {
      imageData = attachment.context.createImageData(width, height);
      imageData.data.set(pixels);
    }
    attachment.context.putImageData(imageData, 0, 0);
  } catch (error) {
    primaryError = error;
  }
  const released = Number(api.ppt_frame_free(frame));
  if (primaryError) throw primaryError;
  if (released !== 1) throw engineError(api, 'Unable to release the native final RGBA frame.');
}

async function drawCachedFrame(attachment, blob, dimensions, request) {
  if (typeof createImageBitmap !== 'function') return false;
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
    assertCurrent(request);
    assertActivationCurrent(request, attachment.slideIndex, true);
    if (bitmap.width !== dimensions.width || bitmap.height !== dimensions.height) return false;
    attachment.canvas.width = dimensions.width;
    attachment.canvas.height = dimensions.height;
    attachment.context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    return true;
  } catch (error) {
    if (error instanceof CancelledOperation) throw error;
    return false;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}

function frameCacheKey(current, slideIndex, scaleMilli, dimensions) {
  return Object.freeze({
    documentId: current.document.sha256,
    pageIndex: slideIndex,
    variant: [
      CACHE_VARIANT_VERSION,
      current.manifest.wasmSha256,
      current.manifest.fontPack.sha256,
      `s${scaleMilli}`,
      `w${dimensions.width}`,
      `h${dimensions.height}`
    ].join(':')
  });
}

function validCachedFrame(entry, dimensions) {
  return isRecord(entry)
    && entry.blob instanceof Blob
    && entry.blob.type === 'image/png'
    && entry.blob.size > 0
    && entry.width === dimensions.width
    && entry.height === dimensions.height;
}

function renderMetadata(slideIndex, options, dimensions, cacheKey, source) {
  return Object.freeze({
    slideIndex,
    width: dimensions.width,
    height: dimensions.height,
    scale: options.scale,
    pixelRatio: options.pixelRatio,
    source,
    cacheKey
  });
}

function normalizeManifest(value) {
  if (!isRecord(value)) throw workerError('manifest-invalid', 'init requires a manifest object.');
  if (value.watermarkRequired !== true || value.watermarkEnforcement !== 'native-final-frame') {
    throw workerError('manifest-policy-invalid', 'The Worker only accepts mandatory native-final-frame watermark builds.');
  }
  if (value.edition !== 'public-watermarked'
    || value.renderer !== 'native-wasm-worker-offscreen-canvas') {
    throw workerError('manifest-policy-invalid', 'The Worker only accepts the public native OffscreenCanvas edition.');
  }

  const wasmBytes = requireAssetLength(value.wasmBytes, 'manifest.wasmBytes');
  const wasmSha256 = requireSha256(value.wasmSha256, 'manifest.wasmSha256');
  const fontPack = isRecord(value.fontPack) ? value.fontPack : {
    file: value.fontPackFile,
    bytes: value.fontPackBytes,
    sha256: value.fontPackSha256
  };
  const fontBytes = requireAssetLength(fontPack.bytes, 'manifest.fontPack.bytes');
  const fontSha256 = requireSha256(fontPack.sha256, 'manifest.fontPack.sha256');
  return Object.freeze({
    ...value,
    wasmBytes,
    wasmSha256,
    fontPack: Object.freeze({
      file: typeof fontPack.file === 'string' ? fontPack.file : '',
      bytes: fontBytes,
      sha256: fontSha256
    })
  });
}

function normalizeAssetUrl(value, label) {
  if (!(typeof value === 'string' && value.length > 0) && !(value instanceof URL)) {
    throw workerError('asset-url-invalid', `init requires a valid ${label}.`);
  }
  const url = new URL(value instanceof URL ? value.href : value, import.meta.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw workerError('asset-url-invalid', `${label} must use HTTP or HTTPS; blob/data assets are not accepted.`);
  }
  return url;
}

function normalizeCacheOptions(value) {
  if (value === undefined) return Object.freeze({});
  if (!isRecord(value)) throw workerError('cache-options-invalid', 'cacheOptions must be an object when provided.');
  const normalized = { ...value };
  if (value.maxEntryBytes !== undefined) normalized.maxItemBytes = value.maxEntryBytes;
  delete normalized.maxEntryBytes;
  // `enabled: false` is intentionally preserved. createFrameCache treats it as
  // a hard disable and never opens, reads, or writes IndexedDB.
  return Object.freeze(normalized);
}

function normalizeRenderOptions(scaleValue, pixelRatioValue) {
  const scale = finitePositive(scaleValue, 'scale');
  const pixelRatio = finitePositive(pixelRatioValue, 'pixelRatio');
  const nativeScale = scale * pixelRatio;
  if (nativeScale < 0.1 || nativeScale > 8) {
    throw workerError('render-scale-invalid', 'scale * pixelRatio must be between 0.1 and 8.');
  }
  return Object.freeze({ scale, pixelRatio, scaleMilli: Math.round(nativeScale * 1000) });
}

function finitePositive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw workerError('render-scale-invalid', `${label} must be a finite positive number.`);
  }
  return number;
}

function requireSlideIndex(value, validateRange, slideCount = 0) {
  if (!Number.isInteger(value) || value < 0 || value > 9_999) {
    throw workerError('slide-index-invalid', 'slideIndex must be an integer between 0 and 9999.');
  }
  if (validateRange && value >= slideCount) {
    throw workerError('slide-index-invalid', `slideIndex must be between 0 and ${slideCount - 1}.`);
  }
  return value;
}

function requireAssetLength(value, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_ASSET_BYTES) {
    throw workerError('manifest-length-invalid', `${label} must be an exact positive byte length no larger than ${MAX_ASSET_BYTES}.`);
  }
  return value;
}

function requireSha256(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) {
    throw workerError('manifest-sha256-invalid', `${label} must be a 64-character hexadecimal SHA-256 digest.`);
  }
  return value.toLowerCase();
}

function requireRuntime() {
  if (!runtime) throw workerError('worker-not-initialized', 'Initialize the PPT Worker before using it.');
  return runtime;
}

function requireOpenDocument() {
  const current = requireRuntime();
  if (!current.document) throw workerError('document-not-open', 'Open a PPT document before attaching or rendering slides.');
  return current;
}

function assertActivationCurrent(request, slideIndex, expectedActive) {
  assertCurrent(request);
  const intent = activationIntents.get(slideIndex);
  if (!intent || intent.revision !== request.intentRevision || intent.active !== expectedActive) {
    throw new CancelledOperation();
  }
}

function assertCurrent(request) {
  if (!isCurrent(request)) throw new CancelledOperation();
}

function isCurrent(request) {
  return request.epoch === sessionEpoch;
}

function abortActiveOperations() {
  for (const controller of activeAbortControllers) controller.abort();
}

function resetCounters() {
  counters.cacheHits = 0;
  counters.cacheMisses = 0;
  counters.cacheWrites = 0;
  counters.nativeRenders = 0;
  counters.cancellations = 0;
}

function releaseCanvasBacking(canvas) {
  try {
    canvas.width = 1;
    canvas.height = 1;
  } catch {
    // A detached or already-disposed OffscreenCanvas has no remaining backing
    // store to release.
  }
}

async function safeCacheStats(cache) {
  try {
    return Object.freeze({ ...(await cache.stats()) });
  } catch {
    return Object.freeze({ available: false, entries: 0, totalBytes: 0 });
  }
}

async function sha256Hex(bytes) {
  const subtle = requireWebCrypto();
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requireWebCrypto() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function') {
    throw workerError('web-crypto-unavailable', 'Web Crypto SHA-256 support is required in the PPT Worker.');
  }
  return subtle;
}

function engineError(api, fallback) {
  const nativeCode = Number(api.ppt_last_error_code()) || 0;
  return workerError(`native-${nativeCode || 'unknown'}`, `${fallback} (native error ${nativeCode || 'unknown'})`);
}

function workerError(code, message) {
  const error = new Error(message);
  error.name = 'FlyfishPptWorkerError';
  Object.defineProperty(error, 'code', { value: code, enumerable: true });
  return error;
}

function serializeError(error) {
  return Object.freeze({
    name: typeof error?.name === 'string' ? error.name : 'Error',
    code: typeof error?.code === 'string' ? error.code : 'worker-failure',
    message: error instanceof Error ? error.message : String(error)
  });
}

function postResponse(id, ok, payload) {
  try {
    workerScope.postMessage(ok
      ? { id, ok: true, result: payload }
      : { id, ok: false, error: payload });
  } catch {
    // There is no secondary channel on which a failed structured-clone response
    // can be reported. All normal results intentionally contain cloneable data.
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRequestId(value) {
  return typeof value === 'string' ? value.length > 0 : typeof value === 'number' && Number.isFinite(value);
}

function idKey(value) {
  return `${typeof value}:${String(value)}`;
}

class CancelledOperation extends Error {
  constructor() {
    super('The Worker operation was superseded by newer state.');
    this.name = 'CancelledOperation';
  }
}
