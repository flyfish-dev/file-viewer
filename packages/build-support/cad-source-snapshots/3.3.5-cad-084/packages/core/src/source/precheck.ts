import type {
  FileViewerFileRef,
  FileViewerSource,
} from '../contracts/types';
import { DEFAULT_RENDERER_DEFINITIONS, DEFAULT_SUPPORTED_EXTENSIONS } from '../registry/formats';
import {
  getExtension,
  normalizeFileExtension,
  normalizeFilename,
  normalizeSource,
} from './index';

export type FileViewerPrecheckStatus = 'ready' | 'invalid' | 'unsupported';

export type FileViewerPrecheckReason =
  | 'content-valid'
  | 'content-not-inspected'
  | 'content-inconclusive'
  | 'empty-structured-file'
  | 'signature-mismatch'
  | 'invalid-package'
  | 'missing-package-part'
  | 'unsupported-extension';

export interface FileViewerPrecheckOptions {
  /** Filename used when a Blob or ArrayBuffer has no name. */
  filename?: string;
  /** Explicit extension, with or without a leading dot. */
  type?: string;
  /** Restricts the result to the renderers installed by the host application. */
  supportedExtensions?: Iterable<string>;
  /** Maximum ZIP central-directory bytes read from a Blob. Defaults to 8 MiB. */
  maxPackageMetadataBytes?: number;
}

export interface FileViewerPrecheckResult {
  filename: string;
  extension: string;
  rendererId: string | null;
  supported: boolean;
  inspected: boolean;
  /** `null` means the extension is supported but no structural validator exists. */
  valid: boolean | null;
  previewable: boolean;
  status: FileViewerPrecheckStatus;
  reason: FileViewerPrecheckReason;
  missingParts: string[];
}

type FileViewerPrecheckInput = FileViewerSource | FileViewerFileRef;

interface ZipInspection {
  signatureValid: boolean;
  complete: boolean;
  entries: Set<string>;
}

interface ContentInspection {
  inspected: boolean;
  valid: boolean | null;
  reason: FileViewerPrecheckReason;
  missingParts?: string[];
}

const DEFAULT_MAX_PACKAGE_METADATA_BYTES = 8 * 1024 * 1024;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP64_SENTINEL = 0xffffffff;
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

const OPEN_XML_REQUIRED_PARTS: Record<string, readonly string[]> = {
  docx: ['[content_types].xml', 'word/document.xml'],
  docm: ['[content_types].xml', 'word/document.xml'],
  dotx: ['[content_types].xml', 'word/document.xml'],
  dotm: ['[content_types].xml', 'word/document.xml'],
  xlsx: ['[content_types].xml', 'xl/workbook.xml'],
  xltx: ['[content_types].xml', 'xl/workbook.xml'],
  xlsm: ['[content_types].xml', 'xl/workbook.xml'],
  xltm: ['[content_types].xml', 'xl/workbook.xml'],
  xlsb: ['[content_types].xml', 'xl/workbook.bin'],
  pptx: ['[content_types].xml', 'ppt/presentation.xml'],
  pptm: ['[content_types].xml', 'ppt/presentation.xml'],
  potx: ['[content_types].xml', 'ppt/presentation.xml'],
  potm: ['[content_types].xml', 'ppt/presentation.xml'],
  ppsx: ['[content_types].xml', 'ppt/presentation.xml'],
  ppsm: ['[content_types].xml', 'ppt/presentation.xml'],
  odt: ['content.xml'],
  ods: ['content.xml'],
  odp: ['content.xml'],
  ofd: ['ofd.xml'],
  numbers: ['index/document.iwa'],
  epub: ['meta-inf/container.xml'],
  xps: ['[content_types].xml'],
  dwfx: ['[content_types].xml'],
};

const ZIP_EXTENSIONS = new Set([
  ...Object.keys(OPEN_XML_REQUIRED_PARTS),
  'zip', 'zipx', 'jar', 'war', 'ear', 'apk', 'cbz',
]);

const OLE_EXTENSIONS = new Set(['doc', 'dot', 'xls', 'xlt', 'ppt', 'msg']);
const TEXT_DECODER = new TextDecoder('utf-8');

const isArrayBuffer = (value: unknown): value is ArrayBuffer => value instanceof ArrayBuffer;

const isBlob = (value: unknown): value is Blob => (
  typeof Blob !== 'undefined' && value instanceof Blob
);

const toSource = (
  input: FileViewerPrecheckInput,
  options: FileViewerPrecheckOptions
): FileViewerSource => {
  if (isArrayBuffer(input)) {
    return { buffer: input, filename: options.filename, type: options.type };
  }
  if (isBlob(input)) {
    return { file: input, filename: options.filename, type: options.type };
  }
  return {
    ...input,
    filename: options.filename || input.filename,
    type: options.type || input.type,
  };
};

const startsWithBytes = (bytes: Uint8Array, expected: readonly number[]) => (
  expected.every((value, index) => bytes[index] === value)
);

const findEndOfCentralDirectory = (bytes: Uint8Array) => {
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  return -1;
};

const collectCentralDirectoryEntries = (bytes: Uint8Array) => {
  const entries = new Set<string>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 46 <= bytes.byteLength) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_SIGNATURE) {
      break;
    }
    const filenameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const end = offset + 46 + filenameLength;
    if (end > bytes.byteLength) {
      return { entries, complete: false };
    }
    entries.add(TEXT_DECODER.decode(bytes.subarray(offset + 46, end)).replace(/^\/+/, '').toLowerCase());
    offset = end + extraLength + commentLength;
  }
  return { entries, complete: offset === bytes.byteLength };
};

const inspectZipBuffer = (buffer: ArrayBuffer): ZipInspection => {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 22) {
    return { signatureValid: false, complete: true, entries: new Set() };
  }
  const view = new DataView(buffer);
  const firstSignature = view.getUint32(0, true);
  if (firstSignature !== ZIP_LOCAL_SIGNATURE && firstSignature !== ZIP_END_SIGNATURE) {
    return { signatureValid: false, complete: true, entries: new Set() };
  }
  const endOffset = findEndOfCentralDirectory(bytes);
  if (endOffset < 0) {
    return { signatureValid: true, complete: false, entries: new Set() };
  }
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  if (centralSize === ZIP64_SENTINEL || centralOffset === ZIP64_SENTINEL) {
    return { signatureValid: true, complete: false, entries: new Set() };
  }
  if (centralOffset + centralSize > bytes.byteLength) {
    return { signatureValid: true, complete: false, entries: new Set() };
  }
  const result = collectCentralDirectoryEntries(bytes.subarray(centralOffset, centralOffset + centralSize));
  return { signatureValid: true, complete: result.complete, entries: result.entries };
};

const inspectZipBlob = async (
  blob: Blob,
  maxPackageMetadataBytes: number
): Promise<ZipInspection> => {
  if (blob.size < 22) {
    return { signatureValid: false, complete: true, entries: new Set() };
  }
  const prefix = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const prefixView = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength);
  const firstSignature = prefixView.getUint32(0, true);
  if (firstSignature !== ZIP_LOCAL_SIGNATURE && firstSignature !== ZIP_END_SIGNATURE) {
    return { signatureValid: false, complete: true, entries: new Set() };
  }

  const tailStart = Math.max(0, blob.size - 65_557);
  const tail = new Uint8Array(await blob.slice(tailStart).arrayBuffer());
  const endOffset = findEndOfCentralDirectory(tail);
  if (endOffset < 0) {
    return { signatureValid: true, complete: false, entries: new Set() };
  }
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  const centralSize = tailView.getUint32(endOffset + 12, true);
  const centralOffset = tailView.getUint32(endOffset + 16, true);
  if (
    centralSize === ZIP64_SENTINEL ||
    centralOffset === ZIP64_SENTINEL ||
    centralSize > maxPackageMetadataBytes ||
    centralOffset + centralSize > blob.size
  ) {
    return { signatureValid: true, complete: false, entries: new Set() };
  }
  const central = new Uint8Array(await blob.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const result = collectCentralDirectoryEntries(central);
  return { signatureValid: true, complete: result.complete, entries: result.entries };
};

const inspectZip = async (
  source: FileViewerSource,
  maxPackageMetadataBytes: number
): Promise<ZipInspection | null> => {
  if (source.buffer) {
    return inspectZipBuffer(source.buffer);
  }
  if (source.file) {
    return inspectZipBlob(source.file, maxPackageMetadataBytes);
  }
  return null;
};

const readPrefix = async (source: FileViewerSource, byteLength = 1024) => {
  if (source.buffer) {
    return new Uint8Array(source.buffer, 0, Math.min(source.buffer.byteLength, byteLength));
  }
  if (source.file) {
    return new Uint8Array(await source.file.slice(0, byteLength).arrayBuffer());
  }
  return null;
};

const inspectStructuredContent = async (
  source: FileViewerSource,
  extension: string,
  maxPackageMetadataBytes: number
): Promise<ContentInspection> => {
  const size = source.buffer?.byteLength ?? source.file?.size;
  if (size === 0 && (ZIP_EXTENSIONS.has(extension) || OLE_EXTENSIONS.has(extension) || extension === 'pdf')) {
    return { inspected: true, valid: false, reason: 'empty-structured-file' };
  }

  if (ZIP_EXTENSIONS.has(extension)) {
    const zip = await inspectZip(source, maxPackageMetadataBytes);
    if (!zip) {
      return { inspected: false, valid: null, reason: 'content-not-inspected' };
    }
    if (!zip.signatureValid) {
      return { inspected: true, valid: false, reason: 'signature-mismatch' };
    }
    const required = OPEN_XML_REQUIRED_PARTS[extension] || [];
    if (!zip.complete) {
      return { inspected: true, valid: null, reason: 'content-inconclusive' };
    }
    const missingParts = required.filter(part => !zip.entries.has(part));
    if (missingParts.length) {
      return { inspected: true, valid: false, reason: 'missing-package-part', missingParts };
    }
    return { inspected: true, valid: true, reason: 'content-valid' };
  }

  const prefix = await readPrefix(source);
  if (!prefix) {
    return { inspected: false, valid: null, reason: 'content-not-inspected' };
  }
  if (OLE_EXTENSIONS.has(extension)) {
    return startsWithBytes(prefix, OLE_SIGNATURE)
      ? { inspected: true, valid: true, reason: 'content-valid' }
      : { inspected: true, valid: false, reason: 'signature-mismatch' };
  }
  if (extension === 'pdf') {
    const header = TEXT_DECODER.decode(prefix);
    return /%PDF-\d\.\d/.test(header)
      ? { inspected: true, valid: true, reason: 'content-valid' }
      : { inspected: true, valid: false, reason: 'signature-mismatch' };
  }
  if (extension === 'rtf') {
    const header = TEXT_DECODER.decode(prefix);
    return /^\s*\{\\rtf\d/.test(header)
      ? { inspected: true, valid: true, reason: 'content-valid' }
      : { inspected: true, valid: false, reason: 'signature-mismatch' };
  }
  return { inspected: false, valid: null, reason: 'content-not-inspected' };
};

/**
 * Performs a cheap, renderer-free capability and structure check.
 *
 * This intentionally does not promise rendering fidelity. A `ready` result
 * means the extension is available and any known container/signature checks
 * passed; the real renderer remains the final authority for malformed content.
 */
export const precheckFileViewerSource = async (
  input: FileViewerPrecheckInput,
  options: FileViewerPrecheckOptions = {}
): Promise<FileViewerPrecheckResult> => {
  const source = toSource(input, options);
  const normalized = normalizeSource(source);
  const extension = normalizeFileExtension(
    options.type || normalized.extension || getExtension(options.filename || normalized.filename)
  );
  const filename = normalizeFilename(options.filename || normalized.filename);
  const supportedExtensions = new Set(
    Array.from(options.supportedExtensions || DEFAULT_SUPPORTED_EXTENSIONS, normalizeFileExtension)
  );
  const supported = supportedExtensions.has(extension);
  const rendererId = DEFAULT_RENDERER_DEFINITIONS.find(
    definition => definition.extensions.some(candidate => normalizeFileExtension(candidate) === extension)
  )?.id || null;

  if (!supported) {
    return {
      filename,
      extension,
      rendererId,
      supported: false,
      inspected: false,
      valid: null,
      previewable: false,
      status: 'unsupported',
      reason: 'unsupported-extension',
      missingParts: [],
    };
  }

  const inspection = await inspectStructuredContent(
    source,
    extension,
    Math.max(64 * 1024, options.maxPackageMetadataBytes || DEFAULT_MAX_PACKAGE_METADATA_BYTES)
  );
  const valid = inspection.valid;
  return {
    filename,
    extension,
    rendererId,
    supported: true,
    inspected: inspection.inspected,
    valid,
    previewable: valid !== false,
    status: valid === false ? 'invalid' : 'ready',
    reason: inspection.reason,
    missingParts: inspection.missingParts || [],
  };
};
