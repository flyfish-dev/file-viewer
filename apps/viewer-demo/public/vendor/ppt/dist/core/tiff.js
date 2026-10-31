/** TIFF 6.0, sections 2–9, 13–19. Original implementation from the format specification. */
import { PptError } from './errors.js';
import { inflateZlib } from './inflate.js';
import { encodeRgbaPng, unpackBits } from './raster.js';
/** TIFF's MSB-first LZW with the early code-width change, unlike GIF. */
export function decodeTiffLzw(bytes, expected) {
    if (!Number.isSafeInteger(expected) || expected < 0 || expected > 256 * 1024 * 1024)
        throw new PptError('LIMIT_ASSETS', 'LZW output exceeds the raster limit');
    const out = new Uint8Array(expected), prefix = new Int16Array(4096), suffix = new Uint8Array(4096), stack = new Uint8Array(4097);
    let bit = 0, bits = 9, next = 258, previous = -1, q = 0, ended = false;
    const code = () => { if (bit + bits > bytes.length * 8)
        throw new PptError('TIFF_LZW', 'Truncated LZW code'); let value = 0; for (let i = 0; i < bits; i++, bit++)
        value = (value << 1) | ((bytes[bit >>> 3] >> (7 - (bit & 7))) & 1); return value; };
    const expand = (value) => { let length = 0; while (value >= 256) {
        if (value >= next || length >= 4096)
            throw new PptError('TIFF_LZW', 'Invalid LZW dictionary reference');
        stack[length++] = suffix[value];
        value = prefix[value];
    } stack[length++] = value; return length; };
    if (code() !== 256)
        throw new PptError('TIFF_LZW', 'LZW strip must start with a clear code');
    while (bit + bits <= bytes.length * 8) {
        const value = code();
        if (value === 257) {
            ended = true;
            break;
        }
        if (value === 256) {
            bits = 9;
            next = 258;
            previous = -1;
            continue;
        }
        if (value > next || value === next && previous < 0)
            throw new PptError('TIFF_LZW', 'Invalid LZW code');
        const special = value === next, length = expand(special ? previous : value), first = stack[length - 1];
        if (q + length + (special ? 1 : 0) > expected)
            throw new PptError('TIFF_LZW', 'LZW expands beyond the declared strip');
        for (let i = length - 1; i >= 0; i--)
            out[q++] = stack[i];
        if (special)
            out[q++] = first;
        if (previous >= 0 && next < 4096) {
            prefix[next] = previous;
            suffix[next] = first;
            next++;
            if (next === (1 << bits) - 1 && bits < 12)
                bits++;
        }
        previous = value;
    }
    if (!ended || q !== expected)
        throw new PptError('TIFF_LZW', 'LZW end marker or decoded size is invalid');
    return out;
}
/** Decode a chosen IFD; all pixel/strip/tile allocations are preflighted. */
export function decodeTiff(bytes, options = {}) {
    const limit = options.maxDecodedBytes ?? 128 * 1024 * 1024;
    if (!Number.isSafeInteger(limit) || limit < 1)
        throw new PptError('INVALID_LIMIT', 'Invalid TIFF byte budget');
    if (bytes.length < 8)
        throw new PptError('TIFF_HEADER', 'Truncated TIFF header');
    const little = bytes[0] === 73 && bytes[1] === 73;
    if (!little && !(bytes[0] === 77 && bytes[1] === 77))
        throw new PptError('TIFF_HEADER', 'TIFF must start with II or MM');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    const need = (at, size) => { if (!Number.isSafeInteger(at) || !Number.isSafeInteger(size) || at < 0 || size < 0 || at + size > bytes.length)
        throw new PptError('TIFF_BOUNDS', 'TIFF field points outside the image', at); };
    const u16 = (at) => { need(at, 2); return view.getUint16(at, little); }, u32 = (at) => { need(at, 4); return view.getUint32(at, little); };
    if (u16(2) !== 42)
        throw new PptError('TIFF_VERSION', 'BigTIFF and unknown TIFF versions are not supported');
    const offsets = [], seen = new Set();
    let at = u32(4);
    while (at) {
        if (seen.has(at))
            throw new PptError('TIFF_IFD_CYCLE', 'Cycle in TIFF image directories', at);
        if (offsets.length >= 4096)
            throw new PptError('LIMIT_ASSETS', 'Too many TIFF image directories');
        seen.add(at);
        offsets.push(at);
        const count = u16(at);
        need(at + 2, count * 12 + 4);
        at = u32(at + 2 + count * 12);
    }
    const page = options.page ?? 0;
    if (!Number.isInteger(page) || page < 0 || page >= offsets.length)
        throw new PptError('TIFF_PAGE', 'TIFF page is out of range');
    at = offsets[page];
    const tags = new Map(), fieldSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    for (let i = 0, count = u16(at); i < count; i++) {
        const p = at + 2 + i * 12, tag = u16(p), type = u16(p + 2), count = u32(p + 4), unit = fieldSizes[type];
        if (!unit)
            continue;
        const size = count * unit, base = size <= 4 ? p + 8 : u32(p + 8);
        need(base, size);
        // Only numeric fields used below are materialized; unknown large metadata stays opaque.
        if (![256, 257, 258, 259, 262, 266, 273, 274, 277, 278, 279, 284, 317, 320, 322, 323, 324, 325, 338, 339].includes(tag))
            continue;
        if (count > Math.min(1_000_000, limit / 8))
            throw new PptError('LIMIT_ASSETS', 'TIFF numeric field exceeds the metadata budget');
        if (![1, 3, 4].includes(type))
            throw new PptError('TIFF_FIELD', 'Unsupported type for a required numeric TIFF field', p);
        if (tags.has(tag))
            throw new PptError('TIFF_FIELD', 'Duplicate required TIFF field', p);
        tags.set(tag, Array.from({ length: count }, (_, j) => type === 1 ? bytes[base + j] : type === 3 ? u16(base + j * 2) : u32(base + j * 4)));
    }
    const get = (id, fallback = 0) => tags.get(id)?.[0] ?? fallback;
    const width = get(256), height = get(257), samples = get(277, 1), bits = tags.get(258) ?? [1], photo = get(262), compression = get(259, 1), planar = get(284, 1), predictor = get(317, 1), orientation = get(274, 1), fillOrder = get(266, 1), warnings = [];
    if (!width || !height || width > 1000000 || height > 1000000 || samples < 1 || samples > 8 || width * height * (4 + samples * 2) > limit)
        throw new PptError('LIMIT_ASSETS', 'TIFF raster exceeds the configured allocation budget');
    if (bits.length !== 1 && bits.length !== samples || bits.some(b => ![1, 2, 4, 8, 16].includes(b)) || bits.some(b => b !== bits[0]))
        throw new PptError('TIFF_BITS', 'Unsupported mixed or non-integer TIFF component depth');
    if (![0, 1, 2, 3, 5].includes(photo))
        throw new PptError('TIFF_COLORSPACE', `TIFF photometric interpretation ${photo} is not supported`);
    if (photo === 2 && samples < 3 || photo === 5 && samples < 4 || photo === 3 && bits[0] > 8)
        throw new PptError('TIFF_SAMPLES', 'Invalid TIFF component count or palette depth');
    if (![1, 2].includes(planar) || ![1, 2].includes(predictor) || ![1, 2].includes(fillOrder) || orientation < 1 || orientation > 8 || (tags.get(339) ?? [1]).some(x => x !== 1))
        throw new PptError('TIFF_LAYOUT', 'Unsupported TIFF planar, predictor, orientation, or sample layout');
    if (![1, 5, 8, 32946, 32773].includes(compression))
        throw new PptError('TIFF_COMPRESSION', `TIFF compression ${compression} is not implemented`);
    const depth = bits[0], components = new Uint16Array(width * height * samples), tiled = tags.has(324), bw = tiled ? get(322) : width, bh = tiled ? get(323) : Math.min(height, get(278, height)), positions = tags.get(tiled ? 324 : 273), counts = tags.get(tiled ? 325 : 279);
    if (!bw || !bh || !positions || !counts || positions.length !== counts.length)
        throw new PptError('TIFF_STRIPS', 'Missing or inconsistent TIFF strips/tiles');
    const nx = Math.ceil(width / bw), ny = Math.ceil(height / bh), perPlane = nx * ny, planes = planar === 2 ? samples : 1;
    if (perPlane * planes !== positions.length)
        throw new PptError('TIFF_STRIPS', 'TIFF strip/tile count does not match dimensions');
    const channels = planar === 2 ? 1 : samples, rowBytes = Math.ceil(bw * channels * depth / 8);
    for (let block = 0; block < positions.length; block++) {
        const plane = Math.floor(block / perPlane), index = block % perPlane, x0 = index % nx * bw, y0 = Math.floor(index / nx) * bh, rows = tiled ? bh : Math.min(bh, height - y0), expected = rowBytes * rows;
        if (expected > limit)
            throw new PptError('LIMIT_ASSETS', 'TIFF tile/strip exceeds the raster budget');
        need(positions[block], counts[block]);
        let raw = bytes.subarray(positions[block], positions[block] + counts[block]);
        if (compression === 1) {
            if (raw.length !== expected)
                throw new PptError('TIFF_STRIPS', 'Uncompressed TIFF strip has an inconsistent byte count');
            raw = new Uint8Array(raw);
        }
        else if (compression === 32773)
            raw = unpackBits(raw, expected);
        else if (compression === 5)
            raw = decodeTiffLzw(raw, expected);
        else {
            const decoded = inflateZlib(raw, expected, expected);
            if (!decoded || decoded.length !== expected)
                throw new PptError('TIFF_DEFLATE', 'Invalid Deflate TIFF strip');
            raw = decoded;
        }
        if (fillOrder === 2) {
            for (let k = 0; k < raw.length; k++) {
                let b = raw[k];
                b = ((b & 0x55) << 1) | ((b >>> 1) & 0x55);
                b = ((b & 0x33) << 2) | ((b >>> 2) & 0x33);
                raw[k] = ((b & 15) << 4) | (b >>> 4);
            }
        }
        const rv = new DataView(raw.buffer, raw.byteOffset, raw.length), mask = 2 ** depth - 1, previous = new Uint16Array(channels);
        for (let y = 0; y < rows; y++) {
            previous.fill(0);
            for (let x = 0; x < bw; x++)
                for (let c = 0; c < channels; c++) {
                    const bpos = (x * channels + c) * depth, byte = y * rowBytes + (bpos >>> 3);
                    let value = depth === 16 ? rv.getUint16(byte, little) : depth === 8 ? raw[byte] : (raw[byte] >>> (8 - depth - (bpos & 7))) & mask;
                    if (predictor === 2) {
                        value = (value + previous[c]) & mask;
                        previous[c] = value;
                    }
                    if (x + x0 < width && y + y0 < height)
                        components[((y + y0) * width + x + x0) * samples + (planar === 2 ? plane : c)] = value;
                }
        }
    }
    const rotated = orientation >= 5, outWidth = rotated ? height : width, outHeight = rotated ? width : height, rgba = new Uint8Array(width * height * 4), max = 2 ** depth - 1, palette = tags.get(320), baseSamples = photo === 2 ? 3 : photo === 5 ? 4 : 1, extra = tags.get(338) ?? [], alphaIndex = extra.findIndex(v => v === 1 || v === 2), hasAlpha = alphaIndex >= 0 && baseSamples + alphaIndex < samples;
    if (photo === 3 && (!palette || palette.length !== 3 * 2 ** depth))
        throw new PptError('TIFF_PALETTE', 'TIFF color table is missing or incomplete');
    if (photo === 5)
        warnings.push('TIFF_CMYK_APPROXIMATION');
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            let ox = x, oy = y;
            switch (orientation) {
                case 2:
                    ox = width - 1 - x;
                    break;
                case 3:
                    ox = width - 1 - x;
                    oy = height - 1 - y;
                    break;
                case 4:
                    oy = height - 1 - y;
                    break;
                case 5:
                    ox = y;
                    oy = x;
                    break;
                case 6:
                    ox = height - 1 - y;
                    oy = x;
                    break;
                case 7:
                    ox = height - 1 - y;
                    oy = width - 1 - x;
                    break;
                case 8:
                    ox = y;
                    oy = width - 1 - x;
                    break;
            }
            // Keep source precision through alpha unassociation, especially for low-alpha 16-bit pixels.
            const p = (y * width + x) * samples, q = (oy * outWidth + ox) * 4, val = (c) => components[p + c] / max * 255;
            let r = 0, g = 0, b = 0;
            if (photo === 2) {
                r = val(0);
                g = val(1);
                b = val(2);
            }
            else if (photo === 5) {
                const k = val(3) / 255;
                r = (255 - val(0)) * (1 - k);
                g = (255 - val(1)) * (1 - k);
                b = (255 - val(2)) * (1 - k);
            }
            else if (photo === 3) {
                const index = components[p], size = 2 ** depth;
                r = palette[index] >>> 8;
                g = palette[index + size] >>> 8;
                b = palette[index + size * 2] >>> 8;
            }
            else
                r = g = b = photo === 0 ? 255 - val(0) : val(0);
            const a = hasAlpha ? val(baseSamples + alphaIndex) : 255;
            if (hasAlpha && extra[alphaIndex] === 1) {
                const alpha = components[p + baseSamples + alphaIndex];
                if (photo === 2) {
                    r = alpha ? components[p] / alpha * 255 : 0;
                    g = alpha ? components[p + 1] / alpha * 255 : 0;
                    b = alpha ? components[p + 2] / alpha * 255 : 0;
                }
                else {
                    r = a ? r * 255 / a : 0;
                    g = a ? g * 255 / a : 0;
                    b = a ? b * 255 / a : 0;
                }
            }
            rgba.set([Math.round(Math.min(255, r)), Math.round(Math.min(255, g)), Math.round(Math.min(255, b)), Math.round(a)], q);
        }
    if (offsets.length > 1)
        warnings.push('TIFF_MULTIPAGE');
    return { width: outWidth, height: outHeight, rgba, pageCount: offsets.length, warnings };
}
export function tiffToPng(bytes, options = {}) {
    const { rgba, ...image } = decodeTiff(bytes, options);
    return { ...image, bytes: encodeRgbaPng(image.width, image.height, rgba, options.maxOutputBytes), mimeType: 'image/png' };
}
