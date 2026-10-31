/** Apple Inside Macintosh: Imaging With QuickDraw, Appendix A (picture opcodes).
 * This interpreter emits browser-safe SVG/PNG and never executes embedded QuickTime code.
 */
import { PptError } from './errors.js';
import { encodeRgbaPng, unpackBits } from './raster.js';
import { bytesToBase64, escapeXmlText } from './utils.js';
const f = (v) => String(Math.round(v * 10000) / 10000);
const legacyColors = { 30: '#ffffff', 33: '#000000', 69: '#ffff00', 137: '#ff00ff', 205: '#ff0000', 273: '#00ffff', 341: '#00ff00', 409: '#0000ff' };
export function pictToSvg(bytes, options = {}) {
    const maxOutput = options.maxOutputBytes ?? 128 * 1024 * 1024, maxDecoded = options.maxDecodedBytes ?? 128 * 1024 * 1024, maxRecords = options.maxRecords ?? 200000;
    if (![maxOutput, maxDecoded, maxRecords].every(x => Number.isSafeInteger(x) && x > 0))
        throw new PptError('INVALID_LIMIT', 'Invalid PICT resource limit');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    let p = 0, records = 0, outputSize = 0;
    const need = (n) => { if (!Number.isSafeInteger(n) || n < 0 || p + n > bytes.length)
        throw new PptError('PICT_TRUNCATED', 'PICT operation exceeds its input', p); };
    const skip = (n) => { need(n); p += n; }, u8 = () => { need(1); return bytes[p++]; }, i8 = () => { const v = u8(); return v & 128 ? v - 256 : v; }, u16 = () => { need(2); const v = view.getUint16(p); p += 2; return v; }, i16 = () => { const v = u16(); return v & 32768 ? v - 65536 : v; }, u32 = () => { need(4); const v = view.getUint32(p); p += 4; return v; };
    const point = () => { const y = i16(), x = i16(); return { x, y }; }, rect = () => { const top = i16(), left = i16(), bottom = i16(), right = i16(); return { x: left, y: top, width: right - left, height: bottom - top }; };
    const versionAt = (at) => at + 12 <= bytes.length && (bytes[at + 10] === 0 && bytes[at + 11] === 0x11 && bytes[at + 12] === 2 && bytes[at + 13] === 255 || bytes[at + 10] === 0x11 && bytes[at + 11] === 1);
    if (!versionAt(0)) {
        if (versionAt(512))
            p = 512;
        else
            throw new PptError('PICT_HEADER', 'PICT version header is missing');
    }
    const start = p;
    skip(2);
    const frame = rect();
    if (frame.width <= 0 || frame.height <= 0 || frame.width > 1e6 || frame.height > 1e6)
        throw new PptError('PICT_SIZE', 'Invalid PICT frame');
    const v2 = bytes[p] === 0;
    if (v2)
        skip(4);
    else
        skip(2);
    let fg = '#000000', bg = '#ffffff', pen = { x: 1, y: 1 }, oval = { x: 16, y: 16 }, loc = { x: 0, y: 0 }, textLoc = { x: 0, y: 0 }, origin = { x: 0, y: 0 }, font = 'Arial', fontSize = 12, face = 0, mode = 8, clip = '', ended = false;
    const defs = [], body = [], unsupported = new Set(), warnings = new Set(), lastRect = new Map();
    let lastPoly = [], lastRegion = '';
    const append = (value, target = body) => { outputSize += value.length; if (outputSize > maxOutput)
        throw new PptError('LIMIT_ASSETS', 'PICT SVG exceeds the configured output budget'); target.push(value); };
    const rgb = () => `#${[u16(), u16(), u16()].map(v => Math.round(v / 257).toString(16).padStart(2, '0')).join('')}`;
    const oldColor = () => legacyColors[u32()] ?? '#000000';
    const pattern = (data) => { if (data.every(x => x === 255))
        return fg; if (data.every(x => x === 0))
        return bg; const id = 'pict-pattern-' + defs.length; let pixels = ''; for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++)
            if (data[y] & (128 >> x))
                pixels += `<rect x="${x}" y="${y}" width="1" height="1"/>`; append(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="${bg}"/><g fill="${fg}">${pixels}</g></pattern>`, defs); return `url(#${id})`; };
    let penPattern, fillPattern, bgPattern;
    const attrs = (verb) => { const fill = verb === 0 ? 'none' : verb === 2 ? (bgPattern ? pattern(bgPattern) : bg) : verb === 4 ? (fillPattern ? pattern(fillPattern) : fg) : fg; if (verb === 3)
        warnings.add('PICT_INVERT_APPROXIMATION'); if (mode !== 8 && mode !== 0)
        warnings.add('PICT_TRANSFER_MODE_APPROXIMATION'); return `fill="${fill}" stroke="${verb === 0 ? (penPattern ? pattern(penPattern) : fg) : 'none'}" stroke-width="${f(Math.max(pen.x, pen.y))}"`; };
    const draw = (content) => append(`<g${clip ? ` clip-path="url(#${clip})"` : ''} transform="translate(${origin.x} ${origin.y})">${content}</g>`);
    function region() {
        const begin = p, size = u16();
        if (size < 10 || size % 2)
            throw new PptError('PICT_REGION', 'Invalid QuickDraw region size', begin);
        need(size - 2);
        const end = begin + size, b = rect();
        if (size === 10)
            return `<rect x="${b.x}" y="${b.y}" width="${Math.max(0, b.width)}" height="${Math.max(0, b.height)}"/>`;
        const active = new Set();
        let previousY = b.y, out = '', done = false;
        while (p < end) {
            const y = i16();
            if (y === 32767) {
                done = true;
                break;
            }
            if (y < previousY)
                throw new PptError('PICT_REGION', 'QuickDraw region rows are unordered', p);
            const edges = [...active].sort((a, b) => a - b);
            if (edges.length % 2)
                throw new PptError('PICT_REGION', 'QuickDraw region has unpaired scanline edges', p);
            for (let i = 0; i < edges.length; i += 2)
                if (y > previousY)
                    out += `<rect x="${edges[i]}" y="${previousY}" width="${edges[i + 1] - edges[i]}" height="${y - previousY}"/>`;
            if (out.length > maxOutput)
                throw new PptError('LIMIT_ASSETS', 'PICT region exceeds the output budget');
            let terminated = false;
            while (p < end) {
                const x = i16();
                if (x === 32767) {
                    terminated = true;
                    break;
                }
                if (active.has(x))
                    active.delete(x);
                else
                    active.add(x);
            }
            if (!terminated)
                throw new PptError('PICT_REGION', 'QuickDraw region row is unterminated', p);
            previousY = y;
        }
        if (!done || p !== end)
            throw new PptError('PICT_REGION', 'QuickDraw region terminator is invalid', p);
        return out;
    }
    function pixmap(direct) {
        if (direct)
            skip(4);
        const rowWord = u16(), rowBytes = rowWord & 0x3fff, bounds = rect(), indexed = !!(rowWord & 0x8000);
        let depth = 1, pack = 0, components = 1, palette = [bg, fg];
        if (indexed || direct) {
            skip(2);
            pack = u16();
            skip(12);
            const pixelType = u16();
            depth = u16();
            components = u16();
            const componentBits = u16();
            skip(12);
            if (![0, 16].includes(pixelType) || ![1, 2, 4, 8, 16, 32].includes(depth) || depth >= 16 && !([3, 4].includes(components) && [5, 8].includes(componentBits)))
                throw new PptError('PICT_PIXMAP', 'Unsupported QuickDraw pixel layout');
        }
        if (indexed && !direct) {
            skip(4);
            const flags = u16(), count = u16() + 1;
            if (count > 256)
                throw new PptError('PICT_PALETTE', 'QuickDraw palette is too large');
            palette = [];
            for (let i = 0; i < count; i++) {
                const key = u16(), value = rgb();
                palette[flags & 0x8000 ? i : key] = value;
            }
        }
        if (!rowBytes || bounds.width <= 0 || bounds.height <= 0 || rowBytes < Math.ceil(bounds.width * depth / 8) || bounds.width * bounds.height * 4 > maxDecoded || rowBytes * bounds.height > maxDecoded)
            throw new PptError('LIMIT_ASSETS', 'QuickDraw bitmap dimensions exceed the allocation budget');
        return { rowBytes, bounds, depth, pack, components, palette };
    }
    function pixels(info, packed) {
        const { rowBytes, bounds, depth, components, palette } = info;
        let pack = info.pack;
        if (!pack)
            pack = depth === 16 ? 3 : depth === 32 ? 4 : packed ? 4 : 1;
        if (rowBytes < 8)
            pack = 1;
        if (depth < 16)
            pack = packed && rowBytes >= 8 ? 4 : 1;
        if (![1, 2, 3, 4].includes(pack) || pack === 2 && depth !== 32 || pack === 3 && depth !== 16)
            throw new PptError('PICT_PACKING', 'Unsupported QuickDraw pixel packing');
        const rgba = new Uint8Array(bounds.width * bounds.height * 4);
        for (let y = 0; y < bounds.height; y++) {
            const expected = pack === 2 ? rowBytes / 4 * 3 : pack === 4 && depth === 32 ? rowBytes / 4 * components : rowBytes;
            if (!Number.isInteger(expected))
                throw new PptError('PICT_PIXMAP', 'Invalid row byte count');
            let row;
            if (pack === 1 || pack === 2) {
                need(expected);
                row = bytes.subarray(p, p + expected);
                p += expected;
            }
            else {
                const count = rowBytes > 250 ? u16() : u8();
                need(count);
                row = unpackBits(bytes.subarray(p, p + count), expected, pack === 3 ? 2 : 1);
                p += count;
            }
            for (let x = 0; x < bounds.width; x++) {
                const q = (y * bounds.width + x) * 4;
                let r = 0, g = 0, b = 0, a = 255;
                if (depth === 32) {
                    if (pack === 4) {
                        const span = rowBytes / 4, offset = components === 4 ? span : 0;
                        r = row[offset + x];
                        g = row[offset + span + x];
                        b = row[offset + span * 2 + x];
                    }
                    else {
                        const pos = x * (pack === 2 ? 3 : 4) + (pack === 2 ? 0 : 1);
                        r = row[pos];
                        g = row[pos + 1];
                        b = row[pos + 2];
                    }
                }
                else if (depth === 16) {
                    const v = (row[x * 2] << 8) | row[x * 2 + 1];
                    r = Math.round((v >>> 10 & 31) * 255 / 31);
                    g = Math.round((v >>> 5 & 31) * 255 / 31);
                    b = Math.round((v & 31) * 255 / 31);
                }
                else {
                    const bit = x * depth, value = (row[bit >>> 3] >>> (8 - depth - (bit & 7))) & ((1 << depth) - 1), c = palette[value];
                    if (!c)
                        throw new PptError('PICT_PALETTE', 'Bitmap references a missing palette entry');
                    r = parseInt(c.slice(1, 3), 16);
                    g = parseInt(c.slice(3, 5), 16);
                    b = parseInt(c.slice(5, 7), 16);
                }
                rgba.set([r, g, b, a], q);
            }
        }
        return rgba;
    }
    function bitmap(op) {
        const info = pixmap(op === 0x9a || op === 0x9b), src = rect(), dst = rect(), transfer = u16();
        let mask = '';
        if (op & 1)
            mask = region();
        const rgba = pixels(info, op >= 0x98);
        if (src.width <= 0 || src.height <= 0 || dst.width <= 0 || dst.height <= 0)
            return;
        if (transfer !== 0 && transfer !== 64) {
            unsupported.add(op);
            warnings.add('PICT_TRANSFER_MODE_APPROXIMATION');
        }
        const png = encodeRgbaPng(info.bounds.width, info.bounds.height, rgba, maxOutput - outputSize), url = 'data:image/png;base64,' + bytesToBase64(png);
        if (mask) {
            const id = 'pict-mask-' + defs.length;
            append(`<clipPath id="${id}">${mask}</clipPath>`, defs);
            draw(`<g clip-path="url(#${id})"><svg x="${dst.x}" y="${dst.y}" width="${dst.width}" height="${dst.height}" viewBox="${src.x} ${src.y} ${src.width} ${src.height}" preserveAspectRatio="none"><image x="${info.bounds.x}" y="${info.bounds.y}" width="${info.bounds.width}" height="${info.bounds.height}" xlink:href="${url}"/></svg></g>`);
        }
        else
            draw(`<svg x="${dst.x}" y="${dst.y}" width="${dst.width}" height="${dst.height}" viewBox="${src.x} ${src.y} ${src.width} ${src.height}" preserveAspectRatio="none"><image x="${info.bounds.x}" y="${info.bounds.y}" width="${info.bounds.width}" height="${info.bounds.height}" xlink:href="${url}"/></svg>`);
    }
    const textDecoder = new TextDecoder('macintosh');
    while (p < bytes.length) {
        if (++records > maxRecords)
            throw new PptError('LIMIT_RECORDS', 'PICT operation count exceeds its configured budget');
        if (v2 && (p - start) % 2)
            skip(1);
        const opcode = v2 ? u16() : u8();
        if (opcode === 255) {
            ended = true;
            break;
        }
        switch (opcode) {
            case 0:
            case 0x1c:
            case 0x1e: break;
            case 1: {
                const r = region();
                clip = 'pict-clip-' + defs.length;
                append(`<clipPath id="${clip}">${r}</clipPath>`, defs);
                break;
            }
            case 2:
            case 9:
            case 10: {
                need(8);
                const data = new Uint8Array(bytes.subarray(p, p + 8));
                p += 8;
                if (opcode === 2)
                    bgPattern = data;
                else if (opcode === 9)
                    penPattern = data;
                else
                    fillPattern = data;
                break;
            }
            case 3: {
                const id = u16();
                font = { 0: 'Chicago', 1: 'Geneva', 2: 'New York', 3: 'Geneva', 4: 'Monaco', 20: 'Times', 21: 'Helvetica', 22: 'Courier' }[id] ?? 'Arial';
                break;
            }
            case 4:
                face = u8();
                break;
            case 5:
            case 0x15:
            case 0x16:
                skip(2);
                unsupported.add(opcode);
                break;
            case 6:
                skip(4);
                unsupported.add(opcode);
                break;
            case 7:
                pen = point();
                break;
            case 8:
                mode = u16();
                break;
            case 11:
                oval = point();
                break;
            case 12: {
                origin.x += i16();
                origin.y += i16();
                warnings.add('PICT_ORIGIN_APPROXIMATION');
                break;
            }
            case 13:
                fontSize = u16();
                break;
            case 14:
                fg = oldColor();
                break;
            case 15:
                bg = oldColor();
                break;
            case 0x10:
                skip(8);
                unsupported.add(opcode);
                break;
            case 0x12:
            case 0x13:
            case 0x14: {
                const type = u16();
                skip(8);
                if (type === 2) {
                    const value = rgb();
                    if (opcode === 0x12)
                        bg = value;
                    else
                        fg = value;
                }
                else if (type === 1) {
                    const info = pixmap(false);
                    pixels(info, true);
                    unsupported.add(opcode);
                }
                else
                    throw new PptError('PICT_PATTERN', 'Unsupported QuickDraw pixel pattern');
                break;
            }
            case 0x1a:
                fg = rgb();
                break;
            case 0x1b:
                bg = rgb();
                break;
            case 0x1d:
            case 0x1f:
                skip(6);
                unsupported.add(opcode);
                break;
            case 0x20:
            case 0x21:
            case 0x22:
            case 0x23: {
                if (opcode === 0x20 || opcode === 0x22)
                    loc = point();
                const old = { ...loc };
                if (opcode <= 0x21)
                    loc = point();
                else {
                    loc.x += i8();
                    loc.y += i8();
                }
                draw(`<path d="M${old.x} ${old.y} L${loc.x} ${loc.y}" ${attrs(0)}/>`);
                break;
            }
            case 0x28:
            case 0x29:
            case 0x2a:
            case 0x2b: {
                if (opcode === 0x28)
                    textLoc = point();
                if (opcode === 0x29 || opcode === 0x2b)
                    textLoc.x += u8();
                if (opcode === 0x2a || opcode === 0x2b)
                    textLoc.y += u8();
                const len = u8();
                need(len);
                const text = textDecoder.decode(bytes.subarray(p, p + len));
                p += len;
                draw(`<text x="${textLoc.x}" y="${textLoc.y}" fill="${fg}" font-family="${escapeXmlText(font)}" font-size="${fontSize}"${face & 1 ? ' font-weight="bold"' : ''}${face & 2 ? ' font-style="italic"' : ''}${face & 4 ? ' text-decoration="underline"' : ''}>${escapeXmlText(text)}</text>`);
                textLoc.x += text.length * fontSize * .6;
                warnings.add('PICT_FONT_METRICS_APPROXIMATION');
                break;
            }
            case 0x2c: {
                const size = u16(), end = p + size;
                need(size);
                skip(2);
                const n = u8();
                need(n);
                if (p + n > end)
                    throw new PptError('PICT_FONT', 'PICT font name exceeds its record');
                font = textDecoder.decode(bytes.subarray(p, p + n));
                p = end;
                break;
            }
            case 0x90:
            case 0x91:
            case 0x98:
            case 0x99:
            case 0x9a:
            case 0x9b:
                bitmap(opcode);
                break;
            case 0xa0:
                skip(2);
                break;
            case 0xa1:
                skip(2);
                skip(u16());
                break;
            default: {
                if (opcode >= 0x30 && opcode < 0x70) {
                    const group = opcode & 0xf0, verb = opcode & 7, same = !!(opcode & 8);
                    let box = same ? lastRect.get(group) : rect();
                    if (box && !same)
                        lastRect.set(group, box);
                    let startAngle = 0, arc = 0;
                    if (group === 0x60) {
                        startAngle = i16();
                        arc = i16();
                    }
                    if (!box || verb > 4)
                        break;
                    const b = box, a = attrs(verb);
                    if (group === 0x50)
                        draw(`<ellipse cx="${f(b.x + b.width / 2)}" cy="${f(b.y + b.height / 2)}" rx="${f(Math.max(0, b.width / 2))}" ry="${f(Math.max(0, b.height / 2))}" ${a}/>`);
                    else if (group === 0x60) {
                        if (arc === 0 || b.width <= 0 || b.height <= 0)
                            break;
                        const cx = b.x + b.width / 2, cy = b.y + b.height / 2, rx = b.width / 2, ry = b.height / 2;
                        // QuickDraw's sweep is not reduced modulo 360. A full turn paints an oval;
                        // one SVG A segment with identical endpoints would instead paint nothing.
                        if (Math.abs(arc) >= 360)
                            draw(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" ${a}/>`);
                        else {
                            const r1 = (startAngle - 90) * Math.PI / 180, r2 = (startAngle + arc - 90) * Math.PI / 180, x1 = cx + rx * Math.cos(r1), y1 = cy + ry * Math.sin(r1), x2 = cx + rx * Math.cos(r2), y2 = cy + ry * Math.sin(r2);
                            draw(`<path d="${verb === 0 ? '' : `M${f(cx)} ${f(cy)} L`}${verb === 0 ? 'M' : ''}${f(x1)} ${f(y1)} A${f(rx)} ${f(ry)} 0 ${Math.abs(arc) > 180 ? 1 : 0} ${arc >= 0 ? 1 : 0} ${f(x2)} ${f(y2)}${verb === 0 ? '' : ' Z'}" ${a}/>`);
                        }
                    }
                    else
                        draw(`<rect x="${b.x}" y="${b.y}" width="${Math.max(0, b.width)}" height="${Math.max(0, b.height)}"${group === 0x40 ? ` rx="${f(oval.x / 2)}" ry="${f(oval.y / 2)}"` : ''} ${a}/>`);
                }
                else if (opcode >= 0x70 && opcode < 0x80) {
                    const verb = opcode & 7;
                    if (!(opcode & 8)) {
                        const begin = p, size = u16();
                        if (size < 10 || (size - 10) % 4)
                            throw new PptError('PICT_POLYGON', 'Invalid QuickDraw polygon');
                        need(size - 2);
                        rect();
                        lastPoly = [];
                        while (p < begin + size)
                            lastPoly.push(point());
                    }
                    if (verb <= 4 && lastPoly.length)
                        draw(`<polygon points="${lastPoly.map(q => q.x + ',' + q.y).join(' ')}" ${attrs(verb)}/>`);
                }
                else if (opcode >= 0x80 && opcode < 0x90) {
                    if (!(opcode & 8))
                        lastRegion = region();
                    const verb = opcode & 7;
                    if (verb <= 4)
                        draw(`<g ${attrs(verb)}>${lastRegion}</g>`);
                }
                else if (opcode === 0xc00)
                    skip(24);
                else if (opcode >= 0x100 && opcode <= 0x7fff)
                    skip((opcode >>> 8) * 2);
                else if (opcode >= 0x8000 && opcode <= 0x80ff || opcode >= 0xb0 && opcode <= 0xcf) { }
                else if (opcode >= 0x8100 || opcode >= 0xd0 && opcode <= 0xfe) {
                    skip(u32());
                    if (opcode === 0x8200 || opcode === 0x8201)
                        unsupported.add(opcode);
                }
                else if (opcode >= 0x24 && opcode <= 0x27 || opcode >= 0x2d && opcode <= 0x2f || opcode >= 0x92 && opcode <= 0x97 || opcode >= 0x9c && opcode <= 0x9f || opcode >= 0xa2 && opcode <= 0xaf) {
                    skip(u16());
                    if (opcode === 0x2d || opcode === 0x2e)
                        unsupported.add(opcode);
                }
                else
                    throw new PptError('PICT_OPCODE', `PICT opcode 0x${opcode.toString(16)} has no safely known length`, p);
            }
        }
    }
    if (!ended)
        throw new PptError('PICT_END', 'PICT end-of-picture opcode is missing');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${frame.width}" height="${frame.height}" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}"><defs>${defs.join('')}</defs>${body.join('')}</svg>`, out = new TextEncoder().encode(svg);
    if (out.length > maxOutput)
        throw new PptError('LIMIT_ASSETS', 'PICT SVG exceeds the configured byte budget');
    return { bytes: out, mimeType: 'image/svg+xml', width: frame.width, height: frame.height, unsupportedOpcodes: [...unsupported], warnings: [...warnings] };
}
