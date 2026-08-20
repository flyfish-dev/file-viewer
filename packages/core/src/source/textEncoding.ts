export type FileViewerTextEncoding =
  | 'auto'
  | 'utf-8'
  | 'utf-16le'
  | 'utf-16be'
  | 'gbk'
  | 'gb18030';

export type ResolvedFileViewerTextEncoding = Exclude<FileViewerTextEncoding, 'auto' | 'gbk'>;

export interface DecodedFileViewerText {
  text: string;
  encoding: ResolvedFileViewerTextEncoding;
}

export interface ResolvedFileViewerTextSource {
  encoding: ResolvedFileViewerTextEncoding;
  bomLength: number;
}

const normalizeEncoding = (
  encoding: FileViewerTextEncoding | string | undefined
): FileViewerTextEncoding => {
  const normalized = String(encoding || 'auto').trim().toLowerCase().replace('_', '-');
  if (normalized === 'utf8' || normalized === 'utf-8') {
    return 'utf-8';
  }
  if (normalized === 'utf16' || normalized === 'utf-16' || normalized === 'utf16le' || normalized === 'utf-16le') {
    return 'utf-16le';
  }
  if (normalized === 'utf16be' || normalized === 'utf-16be') {
    return 'utf-16be';
  }
  if (normalized === 'gbk' || normalized === 'cp936' || normalized === 'gb2312') {
    return 'gbk';
  }
  if (normalized === 'gb18030') {
    return 'gb18030';
  }
  return 'auto';
};

const isContinuationByte = (value: number | undefined) => {
  return value !== undefined && value >= 0x80 && value <= 0xbf;
};

// Validate bytes directly because older WebViews can accept the fatal option
// while still replacing malformed input. That would hide the GB18030 fallback.
export const isValidFileViewerUtf8 = (bytes: Uint8Array) => {
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    if (first === undefined) {
      return false;
    }
    if (first <= 0x7f) {
      index += 1;
      continue;
    }

    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const fourth = bytes[index + 3];
    if (first >= 0xc2 && first <= 0xdf && isContinuationByte(second)) {
      index += 2;
      continue;
    }
    if (
      first === 0xe0 &&
      second !== undefined && second >= 0xa0 && second <= 0xbf &&
      isContinuationByte(third)
    ) {
      index += 3;
      continue;
    }
    if (
      ((first >= 0xe1 && first <= 0xec) || (first >= 0xee && first <= 0xef)) &&
      isContinuationByte(second) &&
      isContinuationByte(third)
    ) {
      index += 3;
      continue;
    }
    if (
      first === 0xed &&
      second !== undefined && second >= 0x80 && second <= 0x9f &&
      isContinuationByte(third)
    ) {
      index += 3;
      continue;
    }
    if (
      first === 0xf0 &&
      second !== undefined && second >= 0x90 && second <= 0xbf &&
      isContinuationByte(third) &&
      isContinuationByte(fourth)
    ) {
      index += 4;
      continue;
    }
    if (
      first >= 0xf1 && first <= 0xf3 &&
      isContinuationByte(second) &&
      isContinuationByte(third) &&
      isContinuationByte(fourth)
    ) {
      index += 4;
      continue;
    }
    if (
      first === 0xf4 &&
      second !== undefined && second >= 0x80 && second <= 0x8f &&
      isContinuationByte(third) &&
      isContinuationByte(fourth)
    ) {
      index += 4;
      continue;
    }
    return false;
  }
  return true;
};

const inferBomlessUtf16 = (bytes: Uint8Array): ResolvedFileViewerTextEncoding | null => {
  const sampleLength = Math.min(bytes.length - (bytes.length % 2), 4096);
  if (sampleLength < 4) {
    return null;
  }
  let evenNulls = 0;
  let oddNulls = 0;
  for (let index = 0; index < sampleLength; index += 2) {
    evenNulls += bytes[index] === 0 ? 1 : 0;
    oddNulls += bytes[index + 1] === 0 ? 1 : 0;
  }
  const pairs = sampleLength / 2;
  if (oddNulls / pairs >= 0.3 && evenNulls / pairs <= 0.05) {
    return 'utf-16le';
  }
  if (evenNulls / pairs >= 0.3 && oddNulls / pairs <= 0.05) {
    return 'utf-16be';
  }
  return null;
};

export const resolveFileViewerTextEncoding = (
  bytes: Uint8Array,
  encoding: FileViewerTextEncoding | string = 'auto'
): ResolvedFileViewerTextSource => {
  const normalized = normalizeEncoding(encoding);
  if (normalized !== 'auto') {
    return {
      encoding: normalized === 'gbk' ? 'gb18030' : normalized,
      bomLength: normalized === 'utf-8' && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        ? 3
        : (normalized === 'utf-16le' && bytes[0] === 0xff && bytes[1] === 0xfe) ||
            (normalized === 'utf-16be' && bytes[0] === 0xfe && bytes[1] === 0xff)
          ? 2
          : 0
    };
  }

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: 'utf-8', bomLength: 3 };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { encoding: 'utf-16le', bomLength: 2 };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { encoding: 'utf-16be', bomLength: 2 };
  }
  const utf16 = inferBomlessUtf16(bytes);
  if (utf16) {
    return { encoding: utf16, bomLength: 0 };
  }
  return isValidFileViewerUtf8(bytes)
    ? { encoding: 'utf-8', bomLength: 0 }
    : { encoding: 'gb18030', bomLength: 0 };
};

export const createFileViewerTextDecoder = (encoding: ResolvedFileViewerTextEncoding) => {
  if (typeof TextDecoder === 'undefined') {
    throw new Error('Text decoding requires the browser TextDecoder API.');
  }
  try {
    return new TextDecoder(encoding);
  } catch (error) {
    if (encoding === 'gb18030' && error instanceof RangeError) {
      throw new Error('This browser does not provide GB18030 text decoding. Use a current browser or select UTF-8 explicitly.');
    }
    throw error;
  }
};

export const decodeFileViewerTextBuffer = (
  data: ArrayBuffer,
  encoding: FileViewerTextEncoding | string = 'auto'
): DecodedFileViewerText => {
  const bytes = new Uint8Array(data);
  const resolved = resolveFileViewerTextEncoding(bytes, encoding);
  return {
    text: createFileViewerTextDecoder(resolved.encoding).decode(bytes.subarray(resolved.bomLength)),
    encoding: resolved.encoding
  };
};
