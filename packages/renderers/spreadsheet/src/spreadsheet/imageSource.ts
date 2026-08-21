import type { SheetImage } from './worker/type.js';

const MAX_TIFF_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_TIFF_DIMENSION = 16_384;
const MAX_TIFF_PIXELS = 24_000_000;

type UtifModule = {
  decode(buffer: ArrayBuffer): Array<Record<string, unknown>>;
  decodeImage(buffer: ArrayBuffer, ifd: Record<string, unknown>): void;
  toRGBA8(ifd: Record<string, unknown>): Uint8Array;
};

export interface SpreadsheetImageSourceResolver {
  resolve(image: Pick<SheetImage, 'src' | 'contentType'>): Promise<string>;
  dispose(): void;
}

const getBase64Payload = (source: string) => {
  const match = /^data:([^;,]*);base64,([\s\S]*)$/i.exec(source);
  if (!match) {
    return undefined;
  }
  return { mime: match[1].toLowerCase(), payload: match[2] };
};

const decodeBase64Head = (payload: string, atob: (value: string) => string) => {
  try {
    return atob(payload.slice(0, 12));
  } catch {
    return '';
  }
};

const hasTiffHeader = (binary: string) =>
  binary.length >= 4 && (
    (binary.charCodeAt(0) === 0x49 &&
      binary.charCodeAt(1) === 0x49 &&
      binary.charCodeAt(2) === 0x2a &&
      binary.charCodeAt(3) === 0x00) ||
    (binary.charCodeAt(0) === 0x4d &&
      binary.charCodeAt(1) === 0x4d &&
      binary.charCodeAt(2) === 0x00 &&
      binary.charCodeAt(3) === 0x2a)
  );

const decodeBase64 = (payload: string, atob: (value: string) => string) => {
  const estimatedBytes = Math.floor(payload.length * 3 / 4);
  if (estimatedBytes > MAX_TIFF_SOURCE_BYTES) {
    throw new Error('TIFF source exceeds the embedded-image safety limit.');
  }
  const binary = atob(payload);
  if (binary.length > MAX_TIFF_SOURCE_BYTES) {
    throw new Error('TIFF source exceeds the embedded-image safety limit.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getTiffDimension = (ifd: Record<string, unknown>, tag: string, fallback: string) => {
  const tagged = ifd[tag];
  const value = Array.isArray(tagged) ? tagged[0] : tagged;
  const resolved = Number(value ?? ifd[fallback]);
  return Number.isFinite(resolved) ? resolved : 0;
};

const assertSafeTiffDimensions = (width: number, height: number) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_TIFF_DIMENSION ||
    height > MAX_TIFF_DIMENSION ||
    width * height > MAX_TIFF_PIXELS
  ) {
    throw new Error('TIFF dimensions exceed the embedded-image safety limit.');
  }
};

const loadUtif = async (): Promise<UtifModule> => {
  const imported = await import('utif') as unknown as UtifModule & { default?: UtifModule };
  return imported.default || imported;
};

export const createSpreadsheetImageSourceResolver = (
  documentRef: Document
): SpreadsheetImageSourceResolver => {
  const view = documentRef.defaultView;
  const decodeAtob = view?.atob.bind(view) || globalThis.atob.bind(globalThis);
  const urlApi = view?.URL || URL;
  const cache = new Map<string, Promise<string>>();
  const objectUrls = new Set<string>();
  let disposed = false;

  const decodeTiff = async (source: string, payload: string) => {
    const bytes = decodeBase64(payload, decodeAtob);
    const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const utif = await loadUtif();
    const ifd = utif.decode(input)[0];
    if (!ifd) {
      throw new Error('TIFF image does not contain a decodable page.');
    }

    const encodedWidth = getTiffDimension(ifd, 't256', 'width');
    const encodedHeight = getTiffDimension(ifd, 't257', 'height');
    assertSafeTiffDimensions(encodedWidth, encodedHeight);
    utif.decodeImage(input, ifd);

    const width = getTiffDimension(ifd, 't256', 'width');
    const height = getTiffDimension(ifd, 't257', 'height');
    assertSafeTiffDimensions(width, height);
    const rgba = utif.toRGBA8(ifd);
    if (rgba.byteLength !== width * height * 4) {
      throw new Error('TIFF decoder returned an unexpected pixel buffer.');
    }

    const canvas = documentRef.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D is unavailable for TIFF conversion.');
    }
    const imageData = context.createImageData(width, height);
    imageData.data.set(rgba);
    context.putImageData(imageData, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Unable to encode the TIFF preview as PNG.');
    }
    const objectUrl = urlApi.createObjectURL(blob);
    if (disposed) {
      urlApi.revokeObjectURL(objectUrl);
      return source;
    }
    objectUrls.add(objectUrl);
    return objectUrl;
  };

  return {
    resolve(image) {
      const parsed = getBase64Payload(image.src);
      if (!parsed) {
        return Promise.resolve(image.src);
      }
      const declaredTiff = /image\/(?:tif|tiff)/i.test(image.contentType || parsed.mime);
      const sniffedTiff = hasTiffHeader(decodeBase64Head(parsed.payload, decodeAtob));
      if (!declaredTiff && !sniffedTiff) {
        return Promise.resolve(image.src);
      }
      let pending = cache.get(image.src);
      if (!pending) {
        pending = decodeTiff(image.src, parsed.payload).catch(() => image.src);
        cache.set(image.src, pending);
      }
      return pending;
    },
    dispose() {
      disposed = true;
      objectUrls.forEach(url => urlApi.revokeObjectURL(url));
      objectUrls.clear();
      cache.clear();
    },
  };
};
