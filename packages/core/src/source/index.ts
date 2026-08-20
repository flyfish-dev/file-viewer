import type {
  FileViewerFileRef,
  FileViewerSource,
  FileViewerSourceKind,
  NormalizedFileViewerSource,
} from '../contracts/types';

export {
  createFileViewerTextDecoder,
  decodeFileViewerTextBuffer,
  isValidFileViewerUtf8,
  resolveFileViewerTextEncoding,
} from './textEncoding';
export type {
  DecodedFileViewerText,
  FileViewerTextEncoding,
  ResolvedFileViewerTextEncoding,
  ResolvedFileViewerTextSource,
} from './textEncoding';

export type FileViewerReadResult = string | ArrayBuffer | undefined | null;

export const DEFAULT_FILE_VIEWER_SOURCE_FILENAME = 'preview.bin';

export const normalizeFileExtension = (extension: string) => {
  return extension.trim().replace(/^\./, '').toLowerCase();
};

export const decodeFilename = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

export const getExtension = (name: string) => {
  const clean = name.split(/[?#]/)[0] || name;
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : normalizeFileExtension(clean.slice(dot + 1));
};

export const normalizeFilename = (value: string | undefined, fallback = DEFAULT_FILE_VIEWER_SOURCE_FILENAME) => {
  const next = (value || '').split(/[?#]/)[0].trim();
  if (!next) {
    return fallback;
  }
  const slash = Math.max(next.lastIndexOf('/'), next.lastIndexOf('\\'));
  return decodeFilename(slash === -1 ? next : next.slice(slash + 1));
};

const getSourceKind = (source: FileViewerSource): FileViewerSourceKind => {
  if (source.file) {
    return 'file';
  }
  if (source.buffer) {
    return 'buffer';
  }
  if (source.url) {
    return 'url';
  }
  return 'empty';
};

const getBlobName = (file: FileViewerFileRef | undefined) => {
  return file && 'name' in file && typeof file.name === 'string' ? file.name : undefined;
};

export const resolveFileViewerSourceFilename = ({
  filename,
  file,
  url,
  fallback = '',
}: {
  filename?: string;
  file?: FileViewerFileRef;
  url?: string;
  fallback?: string;
}) => {
  if (filename) {
    return normalizeFilename(filename, fallback);
  }

  const fileName = getBlobName(file);
  if (fileName) {
    return normalizeFilename(fileName, fallback);
  }

  if (url) {
    return normalizeFilename(url, fallback);
  }

  return fallback;
};

export const normalizeSource = (source: FileViewerSource): NormalizedFileViewerSource => {
  const kind = getSourceKind(source);
  const filename = normalizeFilename(
    source.filename || getBlobName(source.file) || source.url,
    source.type ? `preview.${normalizeFileExtension(source.type)}` : DEFAULT_FILE_VIEWER_SOURCE_FILENAME
  );
  const extension = normalizeFileExtension(source.type || getExtension(filename));
  const sourceSize =
    typeof source.size === 'number'
      ? source.size
      : source.file
        ? source.file.size
        : source.buffer
          ? source.buffer.byteLength
          : undefined;

  return {
    kind,
    filename,
    extension,
    url: source.url,
    file: source.file,
    buffer: source.buffer,
    size: sourceSize,
  };
};

export const wrapFileViewerFileRef = (
  data: FileViewerFileRef,
  filename = DEFAULT_FILE_VIEWER_SOURCE_FILENAME
): File => {
  if (typeof File !== 'undefined' && data instanceof File) {
    return data;
  }

  const safeFilename = normalizeFilename(filename || DEFAULT_FILE_VIEWER_SOURCE_FILENAME);

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new File([data], safeFilename, { type: data.type });
  }

  if (data instanceof ArrayBuffer) {
    return new File([data], safeFilename, {});
  }

  throw new Error('Unsupported file source input.');
};

export const readFileViewerBuffer = async (file: Blob): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file as ArrayBuffer.'));
    };
    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const toFileViewerBlob = (source: Blob | ArrayBuffer) => {
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    return source;
  }
  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not available in the current execution environment.');
  }
  return new Blob([source]);
};

export const readFileViewerDataUrl = async (source: Blob | ArrayBuffer): Promise<string> => {
  const blob = toFileViewerBlob(source);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file as data URL.'));
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
};

export const readFileViewerText = async (
  source: Blob | ArrayBuffer,
  encoding = 'utf-8'
): Promise<string> => {
  const blob = toFileViewerBlob(source);
  if (typeof blob.text === 'function' && encoding.toLowerCase() === 'utf-8') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file as text.'));
    };
    reader.onerror = error => reject(error);
    reader.readAsText(blob, encoding);
  });
};
