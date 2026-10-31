import { PptError } from '../core/errors.js';
import { inflateZlib } from '../core/inflate.js';
import { convertMetafileToSvg } from '../core/vector.js';
import { pictToSvg } from '../core/pict.js';
import { tiffToPng } from '../core/tiff.js';
import { readRecords, walkRecords } from './records.js';
import { RT } from './constants.js';
function header(bytes, offset, end = bytes.length) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 8 > end)
        throw new PptError('BLIP_HEADER', 'Truncated BLIP header', offset);
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const vi = view.getUint16(0, true), length = view.getUint32(4, true);
    if (offset + 8 + length > end)
        throw new PptError('BLIP_LENGTH', 'BLIP exceeds its containing stream', offset);
    return { offset, dataOffset: offset + 8, end: offset + 8 + length, length, type: view.getUint16(2, true), version: vi & 15, instance: vi >>> 4, children: [] };
}
/** DIBs omit BITMAPFILEHEADER. The pixel offset includes palette and bit masks. */
export function dibToBmp(bytes) {
    if (bytes.length < 12)
        throw new PptError('DIB_HEADER', 'Truncated DIB');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = view.getUint32(0, true);
    if (size !== 12 && size < 40 || size > bytes.length)
        throw new PptError('DIB_HEADER', 'Invalid DIB header size');
    const bits = view.getUint16(size === 12 ? 10 : 14, true);
    const compression = size >= 40 ? view.getUint32(16, true) : 0;
    const used = size >= 40 ? view.getUint32(32, true) : 0;
    const palette = (used || (bits <= 8 ? 2 ** bits : 0)) * (size === 12 ? 3 : 4);
    const masks = size === 40 && (compression === 3 || compression === 6) ? (compression === 6 ? 16 : 12) : 0;
    const pixelOffset = 14 + size + palette + masks;
    if (pixelOffset > bytes.length + 14)
        throw new PptError('DIB_PALETTE', 'DIB palette exceeds the image');
    const out = new Uint8Array(bytes.length + 14), dest = new DataView(out.buffer);
    dest.setUint16(0, 0x4D42, true);
    dest.setUint32(2, out.length, true);
    dest.setUint32(10, pixelOffset, true);
    out.set(bytes, 14);
    return out;
}
function pngDimensions(bytes) {
    if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71)
        return {};
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
}
function decodeBlip(bytes, record, id, diagnostics, limit) {
    const base = record.dataOffset;
    // All supported raster and metafile record instances use the low bit for a second UID.
    const uidBytes = (record.instance & 1) ? 32 : 16;
    if (record.length < uidBytes)
        throw new PptError('BLIP_UID', 'Truncated BLIP identifier', record.offset);
    let data, mimeType, unsupported = false, width, height;
    if (record.type >= 0xF01A && record.type <= 0xF01C) {
        if (record.length < uidBytes + 34)
            throw new PptError('METAFILE_HEADER', 'Truncated OfficeArt metafile header', record.offset);
        const view = new DataView(bytes.buffer, bytes.byteOffset + base + uidBytes, 34);
        const expected = view.getUint32(0, true), stored = view.getUint32(28, true), compression = view.getUint8(32);
        if (expected > limit || stored > limit)
            throw new PptError('LIMIT_ASSETS', 'Metafile exceeds the asset byte budget', record.offset);
        if (base + uidBytes + 34 + stored > record.end)
            throw new PptError('METAFILE_LENGTH', 'Metafile payload exceeds the BLIP', record.offset);
        const raw = bytes.subarray(base + uidBytes + 34, base + uidBytes + 34 + stored);
        if (compression === 0) {
            const inflated = inflateZlib(raw, expected);
            if (!inflated || inflated.length !== expected)
                throw new PptError('METAFILE_DEFLATE', 'Cannot decompress OfficeArt metafile', record.offset);
            data = inflated;
        }
        else if (compression === 0xFE) {
            if (raw.byteLength !== expected)
                throw new PptError('METAFILE_LENGTH', 'Uncompressed metafile length differs from its declared size', record.offset);
            data = raw;
        }
        else
            throw new PptError('METAFILE_COMPRESSION', `Unsupported metafile compression ${compression}`, record.offset);
        width = Math.abs(view.getInt32(20, true)) / 9525;
        height = Math.abs(view.getInt32(24, true)) / 9525;
        mimeType = record.type === 0xF01A ? 'image/emf' : record.type === 0xF01B ? 'image/wmf' : 'image/x-pict';
        if (record.type === 0xF01C) {
            try {
                const pict = pictToSvg(data, { maxOutputBytes: limit, maxDecodedBytes: limit });
                data = pict.bytes;
                mimeType = pict.mimeType;
                width = pict.width;
                height = pict.height;
                if (pict.unsupportedOpcodes.length || pict.warnings.length)
                    diagnostics.push({ code: 'PICT_PARTIAL', severity: 'warning', message: 'PICT preview contains operations that require a documented approximation or are preserved without display', offset: record.offset, details: { assetId: id, opcodes: pict.unsupportedOpcodes, warnings: pict.warnings } });
            }
            catch (error) {
                if (error instanceof PptError && error.code.startsWith('LIMIT_'))
                    throw error;
                unsupported = true;
                diagnostics.push({ code: error instanceof PptError ? error.code : 'PICT_INVALID', severity: 'warning', message: error instanceof Error ? error.message : String(error), offset: record.offset, details: { assetId: id } });
            }
        }
        const converted = record.type === 0xF01C ? null : convertMetafileToSvg(mimeType, data, { maxOutputBytes: limit });
        if (converted) {
            data = converted.bytes;
            mimeType = 'image/svg+xml';
            width = converted.width;
            height = converted.height;
            if (converted.unresolvedGlyphRuns)
                diagnostics.push({ code: 'METAFILE_GLYPHS', severity: 'warning', message: 'Metafile contains glyph-index text whose source font cannot be resolved', offset: record.offset, details: { assetId: id, runs: converted.unresolvedGlyphRuns } });
            if (converted.unsupportedRecordTypes.length)
                diagnostics.push({ code: 'METAFILE_PARTIAL', severity: 'warning', message: 'Metafile preview includes the supported drawing subset; some records require an unsupported or approximated operation', offset: record.offset, details: { assetId: id, sourceMime: converted.sourceMime, recordTypes: converted.unsupportedRecordTypes } });
        }
        else if (record.type !== 0xF01C)
            unsupported = true;
    }
    else {
        if (record.length < uidBytes + 1)
            throw new PptError('BLIP_DATA', 'Truncated raster BLIP', record.offset);
        data = bytes.subarray(base + uidBytes + 1, record.end);
        if (data.byteLength + (record.type === 0xF01F ? 14 : 0) > limit)
            throw new PptError('LIMIT_ASSETS', 'Raster image exceeds the asset byte budget', record.offset);
        switch (record.type) {
            case 0xF01D:
            case 0xF02A:
                mimeType = 'image/jpeg';
                break;
            case 0xF01E:
                mimeType = 'image/png';
                ({ width, height } = pngDimensions(data));
                break;
            case 0xF01F:
                data = dibToBmp(data);
                mimeType = 'image/bmp';
                break;
            case 0xF029:
                mimeType = 'image/tiff';
                try {
                    const tiff = tiffToPng(data, { maxOutputBytes: limit, maxDecodedBytes: limit });
                    data = tiff.bytes;
                    mimeType = tiff.mimeType;
                    width = tiff.width;
                    height = tiff.height;
                    for (const code of tiff.warnings)
                        diagnostics.push({ code, severity: 'warning', message: code === 'TIFF_MULTIPAGE' ? 'The first TIFF image directory is displayed; remaining pages stay in the source package' : 'TIFF CMYK colors are converted without an ICC color-management engine', offset: record.offset, details: { assetId: id, pages: tiff.pageCount } });
                }
                catch (error) {
                    if (error instanceof PptError && error.code.startsWith('LIMIT_'))
                        throw error;
                    unsupported = true;
                    diagnostics.push({ code: error instanceof PptError ? error.code : 'TIFF_INVALID', severity: 'warning', message: error instanceof Error ? error.message : String(error), offset: record.offset, details: { assetId: id } });
                }
                break;
            default:
                mimeType = 'application/octet-stream';
                unsupported = true;
        }
    }
    if (data.byteLength > limit)
        throw new PptError('LIMIT_ASSETS', 'Decoded image exceeds the asset byte budget', record.offset);
    if (unsupported)
        diagnostics.push({ code: 'IMAGE_FORMAT_UNSUPPORTED', severity: 'warning', message: `Image ${mimeType} is preserved but not browser-renderable`, offset: record.offset, details: { assetId: id } });
    return { id, mimeType, bytes: data, width, height, sourceOffset: record.offset, unsupported };
}
/** Complex pib/fillBlip values contain a complete OfficeArtBlip, not a BStore index. */
export function parseInlinePicture(bytes, offset, length, id, diagnostics, remainingBytes) {
    return decodeBlip(bytes, header(bytes, offset, offset + length), id, diagnostics, remainingBytes);
}
/** BStore order is authoritative. Empty entries retain their one-based slot. */
export function parsePictures(drawingGroup, documentBytes, picturesBytes, diagnostics, limits) {
    const assets = [], pictureIds = new Map();
    if (!drawingGroup)
        return { assets, pictureIds };
    const ctx = { bytes: documentBytes, diagnostics, limits, count: 0 };
    const roots = drawingGroup.children.length ? drawingGroup.children : readRecords(ctx, drawingGroup.dataOffset, drawingGroup.end);
    const store = [...walkRecords(roots)].find(r => r.type === RT.OfficeArtBStoreContainer);
    if (!store)
        return { assets, pictureIds };
    const seen = new Map();
    let budget = limits.maxAssetBytes;
    for (let i = 0; i < store.children.length; i++) {
        const entry = store.children[i];
        let record = entry, bytes = documentBytes, key = `document:${entry.offset}`;
        try {
            if (entry.type === RT.OfficeArtFBSE) {
                if (entry.length < 36)
                    throw new PptError('FBSE_HEADER', 'Truncated File BLIP Store Entry', entry.offset);
                const view = new DataView(documentBytes.buffer, documentBytes.byteOffset + entry.dataOffset, entry.length);
                if (!view.getUint32(24, true))
                    continue;
                const embedded = entry.dataOffset + 36 + view.getUint8(33), delayed = view.getUint32(28, true);
                if (embedded + 8 <= entry.end)
                    record = header(documentBytes, embedded, entry.end);
                else if (delayed !== 0xFFFFFFFF) {
                    bytes = picturesBytes;
                    record = header(bytes, delayed);
                    key = `pictures:${delayed}`;
                }
                else {
                    diagnostics.push({ code: 'BLIP_MISSING', severity: 'warning', message: 'Referenced image has no embedded or delayed BLIP', offset: entry.offset });
                    continue;
                }
            }
            const duplicate = seen.get(key);
            if (duplicate) {
                pictureIds.set(i + 1, duplicate);
                continue;
            }
            const id = `image-${i + 1}`, asset = decodeBlip(bytes, record, id, diagnostics, budget);
            budget -= asset.bytes.length;
            assets.push(asset);
            pictureIds.set(i + 1, id);
            seen.set(key, id);
        }
        catch (error) {
            if (error instanceof PptError && error.code === 'LIMIT_ASSETS')
                throw error;
            diagnostics.push({ code: error instanceof PptError ? error.code : 'BLIP_INVALID', severity: 'warning', message: error instanceof Error ? error.message : String(error), offset: entry.offset, details: { pictureIndex: i + 1 } });
        }
    }
    return { assets, pictureIds };
}
