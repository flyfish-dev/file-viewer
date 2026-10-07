import {
  getArchiveEntryExtension,
  isArchiveSystemMetadataPath,
  isPreviewableArchiveEntry,
  type ArchiveEntryView,
} from './archiveShared.js';

const ZIP_LIKE_EXTENSIONS = new Set(['zip', 'zipx', 'jar', 'war', 'ear', 'apk', 'cbz']);
const TAR_LIKE_EXTENSIONS = new Set(['tar', 'tgz', 'gz', 'gzip']);
const TAR_BLOCK_SIZE = 512;
const ZIP_CENTRAL_FILE_HEADER = 0x02014b50;
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_GENERAL_PURPOSE_ENCRYPTED_FLAG = 0x0001;
const ZIP_GENERAL_PURPOSE_UTF8_FLAG = 0x0800;

const UTF8_DECODER = new TextDecoder('utf-8');
const UTF8_FATAL_DECODER = new TextDecoder('utf-8', { fatal: true });
// A GBK filename may contain only circled numbers, CJK punctuation or fullwidth
// forms. Han-only detection corrupts those valid names and skips the ZIP fallback.
// Keep a bounded script/symbol heuristic: arbitrary legacy bytes remain ambiguous.
const GBK_FILENAME_TEXT_PATTERN = /[\u2460-\u24ff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff01-\uff60]/;

type DecompressionFormat = ConstructorParameters<typeof DecompressionStream>[0];

type FallbackEntrySource = {
  path: string;
  size: number;
  lastModified?: number;
  load: () => Promise<ArrayBuffer>;
};

type JSZipLike = {
  loadAsync(data: ArrayBuffer, options?: {
    decodeFileName?: (bytes: Uint8Array | number[]) => string;
  }): Promise<{
    forEach(callback: (relativePath: string, file: {
      dir?: boolean;
      date?: Date;
      async(type: 'arraybuffer'): Promise<ArrayBuffer>;
    }) => void): void;
  }>;
};

const isJSZipLike = (value: unknown): value is JSZipLike => {
  return !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { loadAsync?: unknown }).loadAsync === 'function';
};

const createTextDecoder = (label: string) => {
  try {
    return new TextDecoder(label, { fatal: true });
  } catch {
    return null;
  }
};

const GBK_DECODER = createTextDecoder('gbk') || createTextDecoder('gb18030');

const decodeUtf8Strict = (bytes: Uint8Array) => {
  try {
    return UTF8_FATAL_DECODER.decode(bytes);
  } catch {
    return null;
  }
};

const decodeGbk = (bytes: Uint8Array) => {
  try {
    return GBK_DECODER?.decode(bytes) || null;
  } catch {
    return null;
  }
};

export const decodeZipFilename = (bytes: Uint8Array | number[]) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const utf8 = decodeUtf8Strict(data);
  if (utf8 !== null) {
    return utf8;
  }

  const gbk = decodeGbk(data);
  if (gbk && GBK_FILENAME_TEXT_PATTERN.test(gbk)) {
    return gbk;
  }

  return UTF8_DECODER.decode(data);
};

// Vite can expose the CJS constructor as a function-shaped default export.
export const resolveJSZip = (module: unknown): JSZipLike => {
  const record = module as Record<string, unknown> | undefined;
  const defaultRecord = record?.default as Record<string, unknown> | undefined;
  const candidates = [
    record?.default,
    defaultRecord?.default,
    record?.JSZip,
    module,
  ];
  const JSZip = candidates.find(isJSZipLike);

  if (!JSZip) {
    throw new Error('JSZip module does not expose loadAsync.');
  }
  return JSZip;
};

const toArrayBuffer = (bytes: Uint8Array) => {
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  return output.buffer;
};

const decompressBytes = async (bytes: Uint8Array, format: DecompressionFormat) => {
  if (typeof DecompressionStream === 'undefined') {
    return null;
  }

  const stream = new Blob([toArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const normalizeArchivePath = (path: string) => {
  return path.replace(/^\/+/, '').replace(/\\/g, '/');
};

const getPathName = (path: string) => {
  const parts = normalizeArchivePath(path).split('/');
  return parts[parts.length - 1] || path;
};

const getPathDepth = (path: string) => {
  return Math.max(0, normalizeArchivePath(path).split('/').length - 1);
};

const createEntryView = (source: FallbackEntrySource): ArchiveEntryView => {
  const path = normalizeArchivePath(source.path);
  const name = getPathName(path);

  return {
    id: path,
    path,
    name,
    extension: getArchiveEntryExtension(name),
    size: source.size,
    lastModified: source.lastModified,
    depth: getPathDepth(path),
    previewable: isPreviewableArchiveEntry(name),
    compressedFile: {
      name,
      size: source.size,
      lastModified: source.lastModified,
      async extract() {
        const buffer = await source.load();
        return new File([buffer], name, {
          type: 'application/octet-stream',
          lastModified: source.lastModified || Date.now(),
        });
      },
    },
  };
};

const parseOctal = (bytes: Uint8Array, start: number, length: number) => {
  const text = new TextDecoder('ascii')
    .decode(bytes.slice(start, start + length))
    .replace(/\0.*$/, '')
    .trim();

  return text ? Number.parseInt(text, 8) || 0 : 0;
};

const readTarName = (bytes: Uint8Array, offset: number) => {
  const decoder = new TextDecoder('utf-8');
  const name = decoder.decode(bytes.slice(offset, offset + 100)).replace(/\0.*$/, '');
  const prefix = decoder.decode(bytes.slice(offset + 345, offset + 500)).replace(/\0.*$/, '');
  return normalizeArchivePath(prefix ? `${prefix}/${name}` : name);
};

const parseTarEntries = (bytes: Uint8Array) => {
  const entries: ArchiveEntryView[] = [];
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= bytes.length) {
    const header = bytes.slice(offset, offset + TAR_BLOCK_SIZE);
    if (header.every(value => value === 0)) {
      break;
    }

    const path = readTarName(bytes, offset);
    const size = parseOctal(bytes, offset + 124, 12);
    const typeFlag = String.fromCharCode(bytes[offset + 156] || 0);
    const dataOffset = offset + TAR_BLOCK_SIZE;
    const nextOffset = dataOffset + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;

    if (path && typeFlag !== '5' && !isArchiveSystemMetadataPath(path)) {
      const fileBytes = bytes.slice(dataOffset, dataOffset + size);
      entries.push(createEntryView({
        path,
        size,
        load: async () => toArrayBuffer(fileBytes),
      }));
    }

    offset = nextOffset;
  }

  return entries;
};

const getArchiveExtension = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return 'tgz';
  }
  return getArchiveEntryExtension(filename);
};

const readUint16 = (view: DataView, offset: number) => {
  return offset + 2 <= view.byteLength ? view.getUint16(offset, true) : 0;
};

const readUint32 = (view: DataView, offset: number) => {
  return offset + 4 <= view.byteLength ? view.getUint32(offset, true) : 0;
};

const hasEncryptedZipEntries = (data: ArrayBuffer) => {
  const view = new DataView(data);

  for (let offset = 0; offset + 12 <= view.byteLength; offset += 1) {
    const signature = readUint32(view, offset);
    if (signature !== ZIP_CENTRAL_FILE_HEADER && signature !== ZIP_LOCAL_FILE_HEADER) {
      continue;
    }

    const flagOffset = signature === ZIP_CENTRAL_FILE_HEADER
      ? offset + 8
      : offset + 6;
    if ((readUint16(view, flagOffset) & ZIP_GENERAL_PURPOSE_ENCRYPTED_FLAG) !== 0) {
      return true;
    }
  }

  return false;
};

export const hasLikelyGbkZipFilenames = (data: ArrayBuffer, filename: string) => {
  const extension = getArchiveExtension(filename);
  if (!ZIP_LIKE_EXTENSIONS.has(extension)) {
    return false;
  }

  const view = new DataView(data);
  for (let offset = 0; offset + 46 <= view.byteLength; offset += 1) {
    if (readUint32(view, offset) !== ZIP_CENTRAL_FILE_HEADER) {
      continue;
    }

    const flag = readUint16(view, offset + 8);
    const nameLength = readUint16(view, offset + 28);
    const extraLength = readUint16(view, offset + 30);
    const commentLength = readUint16(view, offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > view.byteLength) {
      return false;
    }

    if ((flag & ZIP_GENERAL_PURPOSE_UTF8_FLAG) === 0) {
      const rawName = new Uint8Array(data, nameStart, nameLength);
      // Valid UTF-8 needs no legacy decoding, even when the producer omitted bit 11.
      const decoded = decodeUtf8Strict(rawName) === null ? decodeGbk(rawName) : null;
      if (decoded && GBK_FILENAME_TEXT_PATTERN.test(decoded)) {
        return true;
      }
    }

    offset = nameEnd + extraLength + commentLength - 1;
  }

  return false;
};

export const isLikelyEncryptedArchive = (data: ArrayBuffer, filename: string) => {
  const extension = getArchiveExtension(filename);
  if (ZIP_LIKE_EXTENSIONS.has(extension)) {
    return hasEncryptedZipEntries(data);
  }
  return false;
};

const getGzipEntryName = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.gzip')) {
    return filename.slice(0, -5) || 'archive';
  }
  if (lower.endsWith('.gz')) {
    return filename.slice(0, -3) || 'archive';
  }
  return `${filename || 'archive'}.bin`;
};

const loadZipEntries = async (data: ArrayBuffer) => {
  const JSZip = resolveJSZip(await import('jszip'));
  const zip = await JSZip.loadAsync(data, {
    decodeFileName: decodeZipFilename,
  });
  const entries: ArchiveEntryView[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir) {
      return;
    }

    const metadata = file as typeof file & {
      _data?: {
        uncompressedSize?: number;
      };
    };
    const normalizedPath = normalizeArchivePath(relativePath);
    if (isArchiveSystemMetadataPath(normalizedPath)) {
      return;
    }
    entries.push(createEntryView({
      path: normalizedPath,
      size: metadata._data?.uncompressedSize || 0,
      lastModified: file.date?.getTime(),
      load: async () => file.async('arraybuffer'),
    }));
  });

  return entries;
};

const loadTarEntries = async (data: ArrayBuffer, filename: string, extension: string) => {
  const source = new Uint8Array(data);
  const bytes = extension === 'tar'
    ? source
    : await decompressBytes(source, 'gzip');

  if (!bytes) {
    return null;
  }

  if (extension === 'gz' || extension === 'gzip') {
    const lower = filename.toLowerCase();
    const isTarGz = lower.endsWith('.tar.gz') || lower.endsWith('.tgz');
    if (!isTarGz) {
      const name = getGzipEntryName(filename);
      return [createEntryView({
        path: name,
        size: bytes.byteLength,
        load: async () => toArrayBuffer(bytes),
      })];
    }
  }

  return parseTarEntries(bytes);
};

/**
 * Worker fallback for constrained browsers, temporary local servers, and
 * mobile WebViews. The main libarchive path still covers broader formats;
 * this covers common ZIP/TAR/GZIP archives without an extra static Worker.
 */
export const loadArchiveEntriesWithoutWorker = async (data: ArrayBuffer, filename: string) => {
  const extension = getArchiveExtension(filename);

  if (ZIP_LIKE_EXTENSIONS.has(extension)) {
    if (isLikelyEncryptedArchive(data, filename)) {
      return null;
    }
    return loadZipEntries(data);
  }

  if (TAR_LIKE_EXTENSIONS.has(extension)) {
    return loadTarEntries(data, filename, extension);
  }

  return null;
};
