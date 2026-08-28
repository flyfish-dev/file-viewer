import * as dicomParser from 'dicom-parser';
import { Inflate } from 'pako';
import type { FileViewerDicomLimits } from './index.js';

const MEBIBYTE = 1024 * 1024;

export const DEFAULT_DICOM_LIMITS: Readonly<Required<FileViewerDicomLimits>> = Object.freeze({
  maxSourceBytes: 64 * MEBIBYTE,
  maxFrames: 256,
  maxFramePixels: 16_000_000,
  maxTotalPixels: 48_000_000,
});

/** Transfer syntaxes accepted by this tested MVP (intentionally narrower than the loader). */
export const SUPPORTED_DICOM_TRANSFER_SYNTAXES = new Set([
  '1.2.840.10008.1.2',
  '1.2.840.10008.1.2.1',
  '1.2.840.10008.1.2.1.99',
  '1.2.840.10008.1.2.4.70',
  '1.2.840.10008.1.2.4.80',
  '1.2.840.10008.1.2.4.90',
]);

export interface InspectedDicomPart10 {
  bitsAllocated: number;
  columns: number;
  frameCount: number;
  modality: string;
  photometricInterpretation: string;
  rows: number;
  samplesPerPixel: number;
  transferSyntax: string;
  windowCenter: number;
  windowWidth: number;
  /** @internal Part 10 bytes normalized for the image loader when required. */
  loaderBuffer: ArrayBuffer;
}

const finitePositiveInteger = (value: unknown, label: string) => {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`DICOM ${label} must be a positive integer.`);
  }
  return number;
};

const finiteNumber = (value: unknown, fallback: number) => {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value || ''));
  return Number.isFinite(number) ? number : fallback;
};

const resolveLimits = (limits?: FileViewerDicomLimits): Required<FileViewerDicomLimits> => {
  const resolved = { ...DEFAULT_DICOM_LIMITS };
  for (const key of Object.keys(DEFAULT_DICOM_LIMITS) as Array<keyof FileViewerDicomLimits>) {
    if (limits?.[key] === undefined) continue;
    resolved[key] = finitePositiveInteger(limits[key], key);
  }
  return resolved;
};

const hasPart10Signature = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 132) return false;
  const bytes = new Uint8Array(buffer, 128, 4);
  return bytes[0] === 0x44 && bytes[1] === 0x49 && bytes[2] === 0x43 && bytes[3] === 0x4d;
};

class DicomInflatedSizeError extends Error {}

const inflateDeflatedDataSet = (byteArray: Uint8Array, position: number, maxInflatedBytes: number) => {
  const chunks: Uint8Array[] = [];
  let inflatedBytes = 0;
  const inflater = new Inflate({ raw: true, chunkSize: 64 * 1024 });
  inflater.onData = chunk => {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    inflatedBytes += bytes.byteLength;
    if (position + inflatedBytes > maxInflatedBytes) {
      throw new DicomInflatedSizeError(`DICOM inflated size exceeds the configured ${maxInflatedBytes}-byte limit.`);
    }
    chunks.push(bytes.slice());
  };
  inflater.push(byteArray.subarray(position), true);
  if (inflater.err) throw new Error(inflater.msg || 'Unable to inflate the DICOM data set.');

  const fullByteArray = new Uint8Array(position + inflatedBytes);
  fullByteArray.set(byteArray.subarray(0, position), 0);
  let outputOffset = position;
  for (const chunk of chunks) {
    fullByteArray.set(chunk, outputOffset);
    outputOffset += chunk.byteLength;
  }
  return fullByteArray;
};

const normalizeDeflatedTransferSyntax = (dataSet: dicomParser.DataSet) => {
  const transferSyntaxElement = dataSet.elements.x00020010;
  const groupLengthElement = dataSet.elements.x00020000;
  if (!transferSyntaxElement || !groupLengthElement) {
    throw new Error('The DICOM file meta information is incomplete.');
  }

  const explicitLittleEndianUid = new TextEncoder().encode('1.2.840.10008.1.2.1\0');
  const removedBytes = transferSyntaxElement.length - explicitLittleEndianUid.byteLength;
  if (removedBytes < 0) throw new Error('Unable to normalize the DICOM transfer syntax.');

  const source = dataSet.byteArray;
  const output = new Uint8Array(source.byteLength - removedBytes);
  const valueOffset = transferSyntaxElement.dataOffset;
  output.set(source.subarray(0, valueOffset), 0);
  new DataView(output.buffer).setUint16(valueOffset - 2, explicitLittleEndianUid.byteLength, true);
  output.set(explicitLittleEndianUid, valueOffset);
  output.set(source.subarray(valueOffset + transferSyntaxElement.length), valueOffset + explicitLittleEndianUid.byteLength);

  const groupLengthOffset = groupLengthElement.dataOffset;
  const sourceView = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const outputView = new DataView(output.buffer);
  outputView.setUint32(groupLengthOffset, sourceView.getUint32(groupLengthOffset, true) - removedBytes, true);
  return { buffer: output.buffer, removedBytes };
};

const normalizeLoaderBuffer = (
  dataSet: dicomParser.DataSet,
  transferSyntax: string,
  sourceBuffer: ArrayBuffer
) => {
  const specificCharacterSet = String(dataSet.string('x00080005') || '').trim().toUpperCase();
  const normalizesLegacyUtf8 = specificCharacterSet === 'ISO_IR 196';
  const normalizesTransferSyntax = transferSyntax === '1.2.840.10008.1.2.1.99';
  if (!normalizesLegacyUtf8 && !normalizesTransferSyntax) return sourceBuffer;

  const normalizedTransferSyntax = normalizesTransferSyntax
    ? normalizeDeflatedTransferSyntax(dataSet)
    : { buffer: sourceBuffer.slice(0), removedBytes: 0 };
  if (!normalizesLegacyUtf8) return normalizedTransferSyntax.buffer;

  const characterSetElement = dataSet.elements.x00080005;
  if (!characterSetElement) return normalizedTransferSyntax.buffer;
  const output = new Uint8Array(normalizedTransferSyntax.buffer);
  const replacement = new Uint8Array(characterSetElement.length).fill(0x20);
  replacement.set(new TextEncoder().encode('ISO_IR 192'));
  output.set(replacement, characterSetElement.dataOffset - normalizedTransferSyntax.removedBytes);
  return output.buffer;
};

export const inspectDicomPart10 = (
  buffer: ArrayBuffer,
  limitsInput?: FileViewerDicomLimits
): InspectedDicomPart10 => {
  const limits = resolveLimits(limitsInput);
  if (buffer.byteLength < 132 || buffer.byteLength > limits.maxSourceBytes) {
    throw new Error(`DICOM source size must be between 132 bytes and ${limits.maxSourceBytes} bytes.`);
  }
  if (!hasPart10Signature(buffer)) {
    throw new Error('The selected file is not a DICOM Part 10 file (missing DICM signature).');
  }

  let dataSet: dicomParser.DataSet;
  const maxInflatedBytes = limits.maxSourceBytes + limits.maxTotalPixels * 4;
  try {
    dataSet = dicomParser.parseDicom(new Uint8Array(buffer), {
      untilTag: 'x7fe00010',
      // dicom-parser's Node branch assumes Buffer.copy() for deflated data.
      // A deterministic Uint8Array inflater keeps direct inspection identical
      // in Node, browsers, Workers, and host bundlers that polyfill `process`.
      inflater: (byteArray, position) => inflateDeflatedDataSet(byteArray, position, maxInflatedBytes),
    });
  } catch (error) {
    if (error instanceof DicomInflatedSizeError) throw error;
    throw new Error('Unable to parse the DICOM Part 10 header.');
  }

  const transferSyntax = String(dataSet.string('x00020010') || '').trim();
  if (!SUPPORTED_DICOM_TRANSFER_SYNTAXES.has(transferSyntax)) {
    throw new Error(`DICOM transfer syntax ${transferSyntax || '(missing)'} is not supported by this preview renderer.`);
  }
  if (!dataSet.elements.x7fe00010) {
    throw new Error('The DICOM file has no pixel data element.');
  }

  const rows = finitePositiveInteger(dataSet.uint16('x00280010'), 'rows');
  const columns = finitePositiveInteger(dataSet.uint16('x00280011'), 'columns');
  const samplesPerPixel = finitePositiveInteger(dataSet.uint16('x00280002') || 1, 'samples per pixel');
  const frameCount = finitePositiveInteger(dataSet.intString('x00280008') || 1, 'frame count');
  if (frameCount > limits.maxFrames) {
    throw new Error(`DICOM frame count ${frameCount} exceeds the configured limit ${limits.maxFrames}.`);
  }
  if (rows > limits.maxFramePixels / columns / samplesPerPixel) {
    throw new Error(`DICOM frame dimensions exceed the configured ${limits.maxFramePixels}-pixel limit.`);
  }
  const framePixels = rows * columns * samplesPerPixel;
  if (framePixels > limits.maxTotalPixels / frameCount) {
    throw new Error(`DICOM decoded pixels exceed the configured ${limits.maxTotalPixels}-pixel total limit.`);
  }

  const bitsAllocated = finitePositiveInteger(dataSet.uint16('x00280100'), 'bits allocated');
  if (![1, 8, 16, 32].includes(bitsAllocated)) {
    throw new Error(`DICOM Bits Allocated value ${bitsAllocated} is not supported.`);
  }

  return {
    bitsAllocated,
    columns,
    frameCount,
    modality: String(dataSet.string('x00080060') || 'OT').trim().slice(0, 16),
    photometricInterpretation: String(dataSet.string('x00280004') || '').trim().slice(0, 32),
    rows,
    samplesPerPixel,
    transferSyntax,
    windowCenter: finiteNumber(dataSet.floatString('x00281050', 0), (2 ** bitsAllocated) / 2),
    windowWidth: Math.max(1, finiteNumber(dataSet.floatString('x00281051', 0), 2 ** bitsAllocated)),
    // ISO_IR 196 was the original UTF-8 defined term from DICOM CP-107;
    // normalize the loader-only copy to the current ISO_IR 192 spelling so
    // dcmjs does not reject otherwise valid pixel data and UTF-8 metadata.
    loaderBuffer: normalizeLoaderBuffer(dataSet, transferSyntax, buffer),
  };
};
