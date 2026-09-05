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
export function normalizeFrameCacheLimits(options = {}) {
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
export function normalizeFrameCacheKey(input, pageIndex, variant = "") {
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

export function createFrameCacheKey(documentId, pageIndex, variant = "") {
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
export function createFrameCache(options = {}) {
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
