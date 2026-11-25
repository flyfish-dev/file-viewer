import { CFB } from 'styled-exceljs';
import { DOMParser, type Element } from '@xmldom/xmldom';

type Bytes = Uint8Array<ArrayBuffer>;
type CompoundContent = ArrayLike<number>;
type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export type SpreadsheetEncryptionErrorCode = 'encrypted' | 'invalid-password' | 'unsupported-encryption';

export class SpreadsheetEncryptionError extends Error {
  constructor(readonly code: SpreadsheetEncryptionErrorCode) {
    super(code);
  }
}

const encryptionNamespace = 'http://schemas.microsoft.com/office/2006/encryption';
const passwordNamespace = 'http://schemas.microsoft.com/office/2006/keyEncryptor/password';
const officeHeader = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const openXmlTypes = new Set(['xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm']);
const hashBits: Record<string, number> = { 'SHA-1': 160, 'SHA-256': 256, 'SHA-384': 384, 'SHA-512': 512 };
const blocks = {
  verifier: Uint8Array.of(0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79),
  verifierHash: Uint8Array.of(0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e),
  key: Uint8Array.of(0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6),
  integrityKey: Uint8Array.of(0x5f, 0xb2, 0xad, 0x01, 0x0c, 0xb9, 0xe1, 0xf6),
  integrityValue: Uint8Array.of(0xa0, 0x67, 0x7f, 0x02, 0xb2, 0x2c, 0x84, 0x33),
};
const aesBlockSize = 16;
const segmentSize = 4096;
// Decryption needs both ciphertext and plaintext in memory, in addition to
// the spreadsheet parser. Reject oversized encrypted payloads before copying.
const encryptedByteBudget = 256 * 1024 * 1024;
const padSize = (size: number) => Math.ceil(size / aesBlockSize) * aesBlockSize;
const requireBytes = (condition: boolean) => {
  if (!condition) throw new Error('Malformed encrypted spreadsheet.');
};
const unsupported = (): never => { throw new SpreadsheetEncryptionError('unsupported-encryption'); };

function concat(left: Bytes, right: Bytes): Bytes {
  const bytes = new Uint8Array(left.byteLength + right.byteLength);
  bytes.set(left);
  bytes.set(right, left.byteLength);
  return bytes;
}

function compoundBytes(content: CompoundContent): Bytes {
  if (content instanceof Uint8Array && content.buffer instanceof ArrayBuffer) {
    return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
  }
  return Uint8Array.from(content);
}

function uint32(value: number): Bytes {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function utf16le(value: string): Bytes {
  const bytes = new Uint8Array(value.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < value.length; index++) {
    view.setUint16(index * 2, value.charCodeAt(index), true);
  }
  return bytes;
}

function sameBytes(left: Bytes, right: Bytes): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function hash(subtle: SubtleCrypto, algorithm: HashAlgorithm, bytes: Bytes): Promise<Bytes> {
  return new Uint8Array(await subtle.digest(algorithm, bytes));
}

async function passwordHash(
  subtle: SubtleCrypto, algorithm: HashAlgorithm, salt: Bytes, password: string, spins: number, signal?: AbortSignal
): Promise<Bytes> {
  const input = concat(salt, utf16le(password));
  let result = await hash(subtle, algorithm, input);
  input.fill(0);
  const iterated = new Uint8Array(4 + result.byteLength);
  const counter = new DataView(iterated.buffer);
  for (let index = 0; index < spins; index++) {
    signal?.throwIfAborted();
    counter.setUint32(0, index, true);
    iterated.set(result, 4);
    result = await hash(subtle, algorithm, iterated);
  }
  iterated.fill(0);
  return result;
}

function sized(bytes: Bytes, size: number): Bytes {
  if (bytes.byteLength >= size) return bytes.slice(0, size);
  const expanded = new Uint8Array(size).fill(0x36);
  expanded.set(bytes);
  return expanded;
}

const aesKey = (subtle: SubtleCrypto, raw: Bytes) =>
  subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);

async function decryptBlocks(subtle: SubtleCrypto, key: CryptoKey, iv: Bytes, cipher: Bytes): Promise<Bytes> {
  requireBytes(cipher.byteLength > 0 && cipher.byteLength % aesBlockSize === 0);
  // Office stores complete AES blocks with its own padding. Append a valid
  // PKCS#7 block for Web Crypto so it returns all of Office's original bytes.
  const padding = await subtle.encrypt(
    { name: 'AES-CBC', iv: cipher.subarray(-aesBlockSize) }, key, new Uint8Array(0)
  );
  return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv }, key, concat(cipher, new Uint8Array(padding))));
}

async function decryptEcb(subtle: SubtleCrypto, key: CryptoKey, cipher: Bytes): Promise<Bytes> {
  const decoded = await decryptBlocks(subtle, key, new Uint8Array(aesBlockSize), cipher);
  // For each CBC block after the first, remove the XOR of the previous
  // ciphertext block to recover the AES-ECB block required by Standard.
  for (let index = aesBlockSize; index < decoded.byteLength; index++) {
    decoded[index] ^= cipher[index - aesBlockSize];
  }
  return decoded;
}

function streamSize(encrypted: Bytes): number {
  requireBytes(encrypted.byteLength >= 8 + aesBlockSize);
  const header = new DataView(encrypted.buffer, encrypted.byteOffset, 8);
  const length = header.getUint32(4, true) * 0x100000000 + header.getUint32(0, true);
  requireBytes(Number.isSafeInteger(length) && length > 0 && length <= encrypted.byteLength - 8);
  requireBytes(padSize(length) === encrypted.byteLength - 8);
  return length;
}

function base64Attribute(element: Element, name: string): Bytes {
  const value = element.getAttribute(name);
  requireBytes(typeof value === 'string' && value.length > 0 && value.length <= 512);
  return Uint8Array.from(atob(value!), char => char.charCodeAt(0));
}

function readAgileParameters(element: Element) {
  const algorithm = element.getAttribute('hashAlgorithm')?.toUpperCase().replace(/^SHA(?=\d)/, 'SHA-') as HashAlgorithm;
  const keyBytes = Number(element.getAttribute('keyBits')) / 8;
  if (
    element.getAttribute('cipherAlgorithm') !== 'AES' ||
    element.getAttribute('cipherChaining') !== 'ChainingModeCBC' ||
    element.getAttribute('blockSize') !== '16' ||
    ![16, 24, 32].includes(keyBytes) || !Object.prototype.hasOwnProperty.call(hashBits, algorithm)
  ) unsupported();
  const hashBytes = hashBits[algorithm] / 8;
  requireBytes(Number(element.getAttribute('hashSize')) === hashBytes);
  const salt = base64Attribute(element, 'saltValue');
  requireBytes(salt.byteLength > 0 && salt.byteLength === Number(element.getAttribute('saltSize')));
  return { algorithm, keyBytes, hashBytes, salt };
}

function agileReader(info: Bytes) {
  requireBytes(info.byteLength > 8 && info.byteLength <= 65_536);
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(info.subarray(8));
  requireBytes(!/<!DOCTYPE|<!ENTITY/i.test(xml));
  const document = new DOMParser({ onError: () => { throw new Error('Malformed encrypted spreadsheet.'); } })
    .parseFromString(xml, 'application/xml');
  const root = document.documentElement;
  requireBytes(root?.namespaceURI === encryptionNamespace && root.localName === 'encryption');
  const keys = document.getElementsByTagNameNS(passwordNamespace, 'encryptedKey');
  if (keys.length !== 1) unsupported();
  const payloadKeys = document.getElementsByTagNameNS(encryptionNamespace, 'keyData');
  const integrityFields = document.getElementsByTagNameNS(encryptionNamespace, 'dataIntegrity');
  requireBytes(payloadKeys.length === 1 && integrityFields.length === 1);
  const keyData = payloadKeys.item(0)!;
  const integrity = integrityFields.item(0)!;
  const encryptor = keys.item(0)!;
  const passwordParameters = readAgileParameters(encryptor);
  const payloadParameters = readAgileParameters(keyData);
  const spinsText = encryptor.getAttribute('spinCount') ?? '';
  const spins = Number(spinsText);
  if (!/^\d+$/.test(spinsText) || !Number.isSafeInteger(spins) || spins > 1_000_000) unsupported();
  const verifier = base64Attribute(encryptor, 'encryptedVerifierHashInput');
  const verifierHash = base64Attribute(encryptor, 'encryptedVerifierHashValue');
  const encryptedKey = base64Attribute(encryptor, 'encryptedKeyValue');
  const integrityKey = base64Attribute(integrity, 'encryptedHmacKey');
  const integrityValue = base64Attribute(integrity, 'encryptedHmacValue');

  return async (subtle: SubtleCrypto, encrypted: Bytes, password: string, signal?: AbortSignal) => {
    const size = streamSize(encrypted);
    signal?.throwIfAborted();
    const { algorithm, keyBytes, hashBytes, salt } = passwordParameters;
    const iterated = await passwordHash(subtle, algorithm, salt, password, spins, signal);
    const iv = sized(salt, aesBlockSize);
    const decryptField = async (field: Bytes, block: Bytes) => {
      const raw = sized(await hash(subtle, algorithm, concat(iterated, block)), keyBytes);
      const key = await aesKey(subtle, raw);
      raw.fill(0);
      return decryptBlocks(subtle, key, iv, field);
    };
    const [input, verification] = await Promise.all([
      decryptField(verifier, blocks.verifier),
      decryptField(verifierHash, blocks.verifierHash),
    ]);
    const actual = await hash(subtle, algorithm, input.subarray(0, salt.byteLength));
    if (!sameBytes(actual, verification.subarray(0, hashBytes))) {
      iterated.fill(0);
      throw new SpreadsheetEncryptionError('invalid-password');
    }
    const raw = await decryptField(encryptedKey, blocks.key);
    iterated.fill(0);
    const key = await aesKey(subtle, raw.subarray(0, payloadParameters.keyBytes));
    raw.fill(0);
    const payloadIv = async (part: Bytes) => sized(
      await hash(subtle, payloadParameters.algorithm, concat(payloadParameters.salt, part)), aesBlockSize
    );
    signal?.throwIfAborted();
    const [keyIv, valueIv] = await Promise.all([payloadIv(blocks.integrityKey), payloadIv(blocks.integrityValue)]);
    const [hmacKey, value] = await Promise.all([
      decryptBlocks(subtle, key, keyIv, integrityKey),
      decryptBlocks(subtle, key, valueIv, integrityValue),
    ]);
    const hmac = await subtle.importKey('raw', hmacKey, { name: 'HMAC', hash: payloadParameters.algorithm }, false, ['verify']);
    hmacKey.fill(0);
    if (!await subtle.verify('HMAC', hmac, value.subarray(0, payloadParameters.hashBytes), encrypted)) {
      throw new Error('Encrypted spreadsheet integrity check failed.');
    }
    const decoded = new Uint8Array(size);
    for (let offset = 0, segment = 0; offset < size; offset += segmentSize, segment++) {
      signal?.throwIfAborted();
      const length = Math.min(segmentSize, size - offset);
      const cipher = encrypted.subarray(8 + offset, 8 + offset + padSize(length));
      const plain = await decryptBlocks(subtle, key, await payloadIv(uint32(segment)), cipher);
      decoded.set(plain.subarray(0, length), offset);
    }
    return decoded;
  };
}

function standardReader(info: Bytes) {
  requireBytes(info.byteLength >= 12 + 32);
  const view = new DataView(info.buffer, info.byteOffset, info.byteLength);
  const flags = view.getUint32(4, true);
  if ((flags & 0x3c) !== 0x24 || flags !== view.getUint32(12, true) || view.getUint32(16, true) !== 0) unsupported();
  const algorithm = view.getUint32(20, true);
  const keyBytes = view.getUint32(28, true) / 8;
  const keySizes = new Map([[0x660e, 16], [0x660f, 24], [0x6610, 32]]);
  if (keySizes.get(algorithm) !== keyBytes || view.getUint32(24, true) !== 0x8004) unsupported();
  const verifierOffset = 12 + view.getUint32(8, true);
  requireBytes(verifierOffset >= 44 && verifierOffset + 72 <= info.byteLength);
  requireBytes(view.getUint32(verifierOffset, true) === 16 && view.getUint32(verifierOffset + 36, true) === 20);
  const salt = info.subarray(verifierOffset + 4, verifierOffset + 20);
  const verifier = info.subarray(verifierOffset + 20, verifierOffset + 36);
  const verifierHash = info.subarray(verifierOffset + 40, verifierOffset + 72);
  return async (subtle: SubtleCrypto, encrypted: Bytes, password: string, signal?: AbortSignal) => {
    const size = streamSize(encrypted);
    signal?.throwIfAborted();
    const iterations = await passwordHash(subtle, 'SHA-1', salt, password, 50_000, signal);
    const final = await hash(subtle, 'SHA-1', concat(iterations, uint32(0)));
    iterations.fill(0);
    const fold = async (byte: number) => {
      const padding = new Uint8Array(64).fill(byte);
      for (let index = 0; index < final.byteLength; index++) padding[index] ^= final[index];
      return hash(subtle, 'SHA-1', padding);
    };
    const [first, second] = await Promise.all([fold(0x36), fold(0x5c)]);
    final.fill(0);
    const key = await aesKey(subtle, concat(first, second).subarray(0, keyBytes));
    const [input, verification] = await Promise.all([
      decryptEcb(subtle, key, verifier),
      decryptEcb(subtle, key, verifierHash),
    ]);
    const actual = await hash(subtle, 'SHA-1', input);
    if (!sameBytes(actual, verification.subarray(0, 20))) {
      throw new SpreadsheetEncryptionError('invalid-password');
    }
    const plain = new Uint8Array(size);
    // ECB blocks are independent. Work in chunks to avoid another whole-file
    // ciphertext allocation and let the main-thread fallback be cancelled.
    const chunkSize = 64 * 1024;
    for (let offset = 0; offset < size; offset += chunkSize) {
      signal?.throwIfAborted();
      const length = Math.min(chunkSize, size - offset);
      const chunk = await decryptEcb(subtle, key, encrypted.subarray(8 + offset, 8 + offset + padSize(length)));
      plain.set(chunk.subarray(0, length), offset);
    }
    return plain;
  };
}

function biffFilePass(workbook: Bytes) {
  const view = new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength);
  for (let offset = 0; offset + 4 <= view.byteLength;) {
    const type = view.getUint16(offset, true);
    const size = view.getUint16(offset + 2, true);
    if (type === 0x002f) {
      requireBytes(offset + 4 + size <= workbook.byteLength);
      return workbook.subarray(offset + 4, offset + 4 + size);
    }
    if (type === 0x000a) break;
    offset += 4 + size;
  }
  return null;
}

const clearBiffRecords = new Set([0x0809, 0x0194, 0x0195, 0x00e1, 0x0196, 0x0138]);

function restoreBiffHeaders(workbook: Bytes, plain: Bytes) {
  const view = new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength);
  for (let offset = 0; offset + 4 <= view.byteLength;) {
    const type = view.getUint16(offset, true);
    const size = view.getUint16(offset + 2, true);
    const start = offset + 4;
    const end = start + size;
    requireBytes(end <= workbook.byteLength);
    plain.set(workbook.subarray(offset, start), offset);
    if (type === 0x002f) {
      // Replace FilePass with an empty record of the same size. BoundSheet
      // offsets still address the original positions in the stream.
      plain.fill(0, offset, offset + 2);
      plain.fill(0, start, end);
    } else if (clearBiffRecords.has(type)) {
      plain.set(workbook.subarray(start, end), start);
    } else if (type === 0x0085) {
      plain.set(workbook.subarray(start, Math.min(start + 4, end)), start);
    }
    offset = end;
  }
  return plain;
}

function decryptBiffXor(workbook: Bytes, filePass: DataView, password: string) {
  if (password.length < 1 || password.length > 15 || !/^[\x01-\x7f]+$/.test(password)) {
    throw new SpreadsheetEncryptionError('invalid-password');
  }
  const chars = Uint8Array.from(password, character => character.charCodeAt(0));
  const verifierData = concat(Uint8Array.of(chars.byteLength), chars);
  let verifier = 0;
  for (let index = verifierData.byteLength - 1; index >= 0; index--) {
    verifier = (((verifier << 1) | (verifier >>> 14)) & 0x7fff) ^ verifierData[index];
  }
  // The MS-OFFCRYPTO Method 1 key table is the CRC-16/CCITT progression
  // for the password bytes; checking both fields avoids a verifier-only match.
  let xorKey = 0xffff;
  for (const character of chars) {
    xorKey ^= character << 8;
    for (let bit = 0; bit < 8; bit++) {
      xorKey = ((xorKey << 1) ^ (xorKey & 0x8000 ? 0x1021 : 0)) & 0xffff;
    }
  }
  if ((verifier ^ 0xce4b) !== filePass.getUint16(4, true) || xorKey !== filePass.getUint16(2, true)) {
    throw new SpreadsheetEncryptionError('invalid-password');
  }
  // MS-OFFCRYPTO Method 1 pads the password to form the XOR byte array.
  const padding = Uint8Array.of(0xbb, 0xff, 0xff, 0xba, 0xff, 0xff, 0xb9, 0x80, 0x00, 0xbe, 0x0f, 0x00, 0xbf, 0x0f, 0x00);
  const xorBytes = concat(chars, padding.subarray(0, 16 - chars.byteLength));
  for (let index = 0; index < xorBytes.byteLength; index++) {
    const byte = xorBytes[index] ^ ((xorKey >>> ((index % 2) * 8)) & 255);
    xorBytes[index] = (byte >>> 1) | (byte << 7);
  }
  const plain = workbook.slice();
  const source = new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength);
  for (let offset = 0; offset + 4 <= source.byteLength;) {
    const type = source.getUint16(offset, true);
    const length = source.getUint16(offset + 2, true);
    const end = offset + 4 + length;
    requireBytes(end <= source.byteLength);
    if (type !== 0x002f && !clearBiffRecords.has(type)) {
      const prefix = type === 0x0085 ? 4 : 0;
      for (let index = offset + 4 + prefix, key = end + prefix; index < end; index++, key++) {
        const byte = workbook[index] ^ xorBytes[key % 16];
        plain[index] = (byte >>> 5) | (byte << 3);
      }
    }
    offset = end;
  }
  xorBytes.fill(0);
  return restoreBiffHeaders(workbook, plain);
}

function rc4(bytes: Bytes, key: Bytes): Bytes {
  const state = Uint8Array.from({ length: 256 }, (_, index) => index);
  let right = 0;
  for (let left = 0; left < 256; left++) {
    right = (right + state[left] + key[left % key.byteLength]) & 255;
    [state[left], state[right]] = [state[right], state[left]];
  }
  right = 0;
  return bytes.map((byte, index) => {
    const left = (index + 1) & 255;
    right = (right + state[left]) & 255;
    [state[left], state[right]] = [state[right], state[left]];
    return byte ^ state[(state[left] + state[right]) & 255];
  });
}

async function decryptBiffCryptoApi(
  subtle: SubtleCrypto, workbook: Bytes, filePass: Bytes, keyBits: number, password: string, signal?: AbortSignal
) {
  const view = new DataView(filePass.buffer, filePass.byteOffset, filePass.byteLength);
  const verifierOffset = 14 + view.getUint32(10, true);
  requireBytes(verifierOffset >= 46 && verifierOffset + 60 <= filePass.byteLength);
  requireBytes(view.getUint32(verifierOffset, true) === 16 && view.getUint32(verifierOffset + 36, true) === 20);
  const salt = filePass.subarray(verifierOffset + 4, verifierOffset + 20);
  const initial = await hash(subtle, 'SHA-1', concat(salt, utf16le(password)));
  const forBlock = async (block: number) => {
    const digest = await hash(subtle, 'SHA-1', concat(initial, uint32(block)));
    if (keyBits !== 40) return digest.subarray(0, keyBits / 8);
    const key = new Uint8Array(16);
    key.set(digest.subarray(0, 5));
    return key;
  };
  const verifier = filePass.subarray(verifierOffset + 20, verifierOffset + 36);
  const verifierHash = filePass.subarray(verifierOffset + 40, verifierOffset + 60);
  const decoded = rc4(concat(verifier, verifierHash), await forBlock(0));
  if (!sameBytes(await hash(subtle, 'SHA-1', decoded.subarray(0, 16)), decoded.subarray(16))) {
    throw new SpreadsheetEncryptionError('invalid-password');
  }
  const result = new Uint8Array(workbook.byteLength);
  // MS-XLS indexes the cipher across the whole Workbook stream and
  // resets it with a new RC4 key at every 1,024-byte boundary.
  const biffBlockSize = 1024;
  for (let offset = 0, block = 0; offset < workbook.byteLength; offset += biffBlockSize, block++) {
    signal?.throwIfAborted();
    result.set(rc4(workbook.subarray(offset, offset + biffBlockSize), await forBlock(block)), offset);
  }
  initial.fill(0);
  return restoreBiffHeaders(workbook, result);
}

async function decryptLegacyBiff(workbook: Bytes, filePass: Bytes, password?: string, signal?: AbortSignal) {
  const bof = new DataView(workbook.buffer, workbook.byteOffset, 6);
  const view = new DataView(filePass.buffer, filePass.byteOffset, filePass.byteLength);
  if (bof.getUint16(0, true) !== 0x0809 || bof.getUint16(4, true) !== 0x0600 || filePass.byteLength < 6) {
    return unsupported();
  }
  const type = view.getUint16(0, true);
  if (type === 0 && filePass.byteLength === 6) {
    if (password === undefined) throw new SpreadsheetEncryptionError('encrypted');
    return decryptBiffXor(workbook, view, password);
  }
  const isCryptoApi = type === 1 && filePass.byteLength >= 46
    && [2, 3, 4].includes(view.getUint16(2, true)) && view.getUint16(4, true) === 2;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !isCryptoApi) return unsupported();
  const keyBits = view.getUint32(30, true) || 40;
  if (view.getUint32(22, true) !== 0x6801 || view.getUint32(26, true) !== 0x8004 || keyBits < 40 || keyBits > 128 || keyBits % 8) {
    return unsupported();
  }
  if (password === undefined) throw new SpreadsheetEncryptionError('encrypted');
  return decryptBiffCryptoApi(subtle, workbook, filePass, keyBits, password, signal);
}

/** Standard and Agile are specified by MS-OFFCRYPTO §§2.3.4.5–2.3.4.15. */
export async function decryptSpreadsheetPackage(
  data: ArrayBuffer, fileType: string | undefined, password?: string, signal?: AbortSignal
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data);
  if (!officeHeader.every((byte, index) => bytes[index] === byte)) return data;
  const cfb = CFB.read(bytes, { type: 'array' });
  const infoContent = CFB.find(cfb, '/EncryptionInfo')?.content as CompoundContent | undefined;
  const packageContent = CFB.find(cfb, '/EncryptedPackage')?.content as CompoundContent | undefined;
  if (!infoContent && !packageContent) {
    const entry = CFB.find(cfb, '/Workbook') || CFB.find(cfb, '/Book');
    const workbook = entry?.content?.length ? compoundBytes(entry.content as CompoundContent) : undefined;
    const filePass = workbook && biffFilePass(workbook);
    if (workbook && filePass) {
      if (workbook.byteLength > encryptedByteBudget) unsupported();
      signal?.throwIfAborted();
      entry.content = await decryptLegacyBiff(workbook, filePass, password, signal);
      return Uint8Array.from(CFB.write(cfb, { type: 'array' }) as Uint8Array).buffer;
    }
    return data;
  }
  if (!infoContent || !packageContent || infoContent.length < 8 || infoContent.length > 65_536) {
    throw new Error('Malformed encrypted spreadsheet.');
  }
  if (packageContent.length > encryptedByteBudget) unsupported();
  if (fileType && !openXmlTypes.has(fileType.toLowerCase())) unsupported();
  const info = compoundBytes(infoContent);
  const version = new DataView(info.buffer, info.byteOffset, info.byteLength);
  const major = version.getUint16(0, true);
  const minor = version.getUint16(2, true);
  const reader = major === 4 && minor === 4 && version.getUint32(4, true) === 0x40 ? agileReader(info)
    : minor === 2 && [2, 3, 4].includes(major) ? standardReader(info)
      : unsupported();
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) unsupported();
  if (password === undefined) throw new SpreadsheetEncryptionError('encrypted');
  const plain = await reader(subtle, compoundBytes(packageContent), password, signal);
  requireBytes(plain[0] === 0x50 && plain[1] === 0x4b);
  return plain.buffer;
}
