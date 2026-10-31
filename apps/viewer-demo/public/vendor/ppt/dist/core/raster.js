import { PptError } from './errors.js';
/** BI_RGB 32-bit scan lines used by EMR_ALPHABLEND. GDI stores B,G,R,A;
 * AC_SRC_ALPHA channels are premultiplied, whereas PNG stores straight RGBA. */
export function decodeBgraBitmap(width, signedHeight, bits, perPixelAlpha, maxBytes = 128 * 1024 * 1024) {
    const height = Math.abs(signedHeight), length = width * height * 4;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(signedHeight) || width <= 0 || height <= 0 || !Number.isSafeInteger(length) || length > maxBytes)
        throw new PptError('LIMIT_ASSETS', 'BGRA bitmap exceeds the decoded byte budget');
    if (bits.length < length)
        throw new PptError('METAFILE_BITMAP', 'Truncated BGRA scan lines');
    const rgba = new Uint8Array(length);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const p = ((signedHeight > 0 ? height - 1 - y : y) * width + x) * 4, q = (y * width + x) * 4, a = perPixelAlpha ? bits[p + 3] : 255;
            for (let c = 0; c < 3; c++) {
                const value = bits[p + 2 - c];
                rgba[q + c] = perPixelAlpha ? (a ? Math.min(255, Math.round(value * 255 / a)) : 0) : value;
            }
            rgba[q + 3] = a;
        }
    return rgba;
}
/** Bounded PackBits, also used by QuickDraw's 16-bit pixel packets. */
export function unpackBits(input, expected, unit = 1) {
    if (!Number.isSafeInteger(expected) || expected < 0 || expected > 256 * 1024 * 1024 || unit !== 1 && unit !== 2)
        throw new PptError('RASTER_SIZE', 'Invalid PackBits output size');
    const out = new Uint8Array(expected);
    let p = 0, q = 0;
    while (p < input.length) {
        const control = input[p++];
        if (control === 128)
            continue;
        const count = (control < 128 ? control + 1 : 257 - control) * unit;
        if (q + count > expected)
            throw new PptError('PACKBITS_LENGTH', 'PackBits expands beyond the declared row/strip');
        if (control < 128) {
            if (p + count > input.length)
                throw new PptError('PACKBITS_TRUNCATED', 'Truncated PackBits literal');
            out.set(input.subarray(p, p + count), q);
            p += count;
        }
        else {
            if (p + unit > input.length)
                throw new PptError('PACKBITS_TRUNCATED', 'Truncated PackBits repeat');
            for (let i = 0; i < count; i++)
                out[q + i] = input[p + i % unit];
            p += unit;
        }
        q += count;
    }
    if (q !== expected)
        throw new PptError('PACKBITS_LENGTH', 'PackBits does not fill the declared row/strip');
    return out;
}
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let c = i; for (let b = 0; b < 8; b++)
    c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; return c >>> 0; });
function crc(bytes) { let c = 0xffffffff; for (const b of bytes)
    c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
/** PNG (RGBA8, filter zero, zlib stored blocks), specified by ISO/IEC 15948. */
export function encodeRgbaPng(width, height, rgba, maxBytes = 128 * 1024 * 1024) {
    const row = width * 4, rawLength = (row + 1) * height;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || rgba.length !== row * height || rawLength > maxBytes)
        throw new PptError('LIMIT_ASSETS', 'Raster dimensions exceed the configured byte budget');
    const blocks = Math.ceil(rawLength / 65535), zlen = 2 + rawLength + blocks * 5 + 4, total = 57 + zlen;
    if (total > maxBytes)
        throw new PptError('LIMIT_ASSETS', 'PNG output exceeds the configured byte budget');
    const raw = new Uint8Array(rawLength);
    for (let y = 0; y < height; y++)
        raw.set(rgba.subarray(y * row, (y + 1) * row), y * (row + 1) + 1);
    const out = new Uint8Array(total), view = new DataView(out.buffer);
    out.set([137, 80, 78, 71, 13, 10, 26, 10]);
    let at = 8;
    const chunk = (type, data) => { view.setUint32(at, data.length); for (let i = 0; i < 4; i++)
        out[at + 4 + i] = type.charCodeAt(i); out.set(data, at + 8); view.setUint32(at + 8 + data.length, crc(out.subarray(at + 4, at + 8 + data.length))); at += data.length + 12; };
    const header = new Uint8Array(13), hv = new DataView(header.buffer);
    hv.setUint32(0, width);
    hv.setUint32(4, height);
    header[8] = 8;
    header[9] = 6;
    chunk('IHDR', header);
    const z = new Uint8Array(zlen), zv = new DataView(z.buffer);
    z[0] = 0x78;
    z[1] = 1;
    let p = 2, a = 1, b = 0;
    for (let from = 0; from < raw.length; from += 65535) {
        const size = Math.min(65535, raw.length - from);
        z[p++] = from + size === raw.length ? 1 : 0;
        zv.setUint16(p, size, true);
        zv.setUint16(p + 2, (~size) & 0xffff, true);
        p += 4;
        z.set(raw.subarray(from, from + size), p);
        p += size;
    }
    for (let i = 0; i < raw.length; i++) {
        a = (a + raw[i]) % 65521;
        b = (b + a) % 65521;
    }
    zv.setUint32(p, ((b << 16) | a) >>> 0);
    chunk('IDAT', z);
    chunk('IEND', new Uint8Array());
    return out;
}
