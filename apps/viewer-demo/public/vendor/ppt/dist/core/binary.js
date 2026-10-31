import { textDecoder } from './utils.js';
const utf16leDecoder = textDecoder('utf-16le');
const latin1Decoder = typeof TextDecoder !== 'undefined' ? textDecoder('windows-1252') : textDecoder('latin1');
/**
 * Lightweight little-endian binary reader used across the MS-DOC parser.
 * The implementation intentionally returns neutral defaults for out-of-range
 * reads so upper layers can stay resilient to slightly malformed documents.
 */
export class BinaryReader {
    bytes;
    view;
    length;
    constructor(input) {
        if (input instanceof Uint8Array) {
            this.bytes = input;
        }
        else if (input instanceof ArrayBuffer) {
            this.bytes = new Uint8Array(input);
        }
        else if (ArrayBuffer.isView(input)) {
            this.bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        }
        else {
            throw new TypeError('BinaryReader expects ArrayBuffer or Uint8Array');
        }
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        this.length = this.bytes.byteLength;
    }
    ensure(offset, size = 1) {
        return offset >= 0 && offset + size <= this.length;
    }
    u8(offset) { return this.ensure(offset, 1) ? this.view.getUint8(offset) : 0; }
    i8(offset) { return this.ensure(offset, 1) ? this.view.getInt8(offset) : 0; }
    u16(offset) { return this.ensure(offset, 2) ? this.view.getUint16(offset, true) : 0; }
    i16(offset) { return this.ensure(offset, 2) ? this.view.getInt16(offset, true) : 0; }
    u32(offset) { return this.ensure(offset, 4) ? this.view.getUint32(offset, true) : 0; }
    i32(offset) { return this.ensure(offset, 4) ? this.view.getInt32(offset, true) : 0; }
    u64(offset) {
        const lo = this.u32(offset);
        const hi = this.u32(offset + 4);
        return hi * 0x100000000 + lo;
    }
    slice(offset, length) {
        if (!this.ensure(offset, length)) {
            return new Uint8Array(0);
        }
        return this.bytes.subarray(offset, offset + length);
    }
    array(offset, count, readFn) {
        const out = [];
        const width = readFn.byteWidth ?? 1;
        for (let i = 0; i < count; i += 1) {
            out.push(readFn.call(this, offset + i * width));
        }
        return out;
    }
    utf16le(offset, byteLength) {
        if (!this.ensure(offset, byteLength))
            return '';
        return utf16leDecoder.decode(this.slice(offset, byteLength));
    }
    latin1(offset, byteLength) {
        if (!this.ensure(offset, byteLength))
            return '';
        return latin1Decoder.decode(this.slice(offset, byteLength));
    }
    ascii(offset, byteLength) {
        if (!this.ensure(offset, byteLength))
            return '';
        let out = '';
        const view = this.slice(offset, byteLength);
        for (let i = 0; i < view.length; i += 1)
            out += String.fromCharCode(view[i] ?? 0);
        return out;
    }
    utf16z(offset, byteLength) {
        const raw = this.slice(offset, byteLength);
        let end = raw.length;
        for (let i = 0; i + 1 < raw.length; i += 2) {
            if (raw[i] === 0 && raw[i + 1] === 0) {
                end = i;
                break;
            }
        }
        return utf16leDecoder.decode(raw.subarray(0, end));
    }
}
BinaryReader.prototype.u8.byteWidth = 1;
BinaryReader.prototype.i8.byteWidth = 1;
BinaryReader.prototype.u16.byteWidth = 2;
BinaryReader.prototype.i16.byteWidth = 2;
BinaryReader.prototype.u32.byteWidth = 4;
BinaryReader.prototype.i32.byteWidth = 4;
export function toUint8Array(input) {
    if (input instanceof Uint8Array)
        return input;
    if (input instanceof ArrayBuffer)
        return new Uint8Array(input);
    if (ArrayBuffer.isView(input))
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError('Unsupported binary input');
}
