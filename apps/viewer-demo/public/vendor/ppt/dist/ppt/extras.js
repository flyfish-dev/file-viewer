import { PptError } from '../core/errors.js';
import { trimTrailingNulls } from '../core/utils.js';
import { inflateZlib } from '../core/inflate.js';
import { readRecords } from './records.js';
/** Normative record IDs from [MS-PPT] 2.13.24. */
const R = { CString: 0x0FBA, Hyperlink: 0x0FD7, HyperlinkAtom: 0x0FD3, Sound: 0x07E6, SoundData: 0x07E7, MediaAtom: 0x1004, Video: 0x1005, Midi: 0x100D, Cd: 0x100E, WavEmbedded: 0x100F, WavLinked: 0x1010, WavEmbeddedAtom: 0x1013, OleAtom: 0x0FC3, OleEmbedded: 0x0FCC, OleLinked: 0x0FCE, OleControl: 0x0FEE, Comment: 0x2EE0, CommentAtom: 0x2EE1, ProgBinaryTag: 0x138A, BinaryTagData: 0x138B, AnimationInfo: 0x1014, AnimationInfoAtom: 0x0FF1 };
const utf16 = new TextDecoder('utf-16le');
function warning(ctx, code, message, node) { ctx.diagnostics.push({ code, severity: 'warning', message, offset: node.offset }); }
function string(ctx, node) {
    if (!node)
        return '';
    if (node.length % 2)
        warning(ctx, 'EXTRA_STRING_LENGTH', 'UTF-16 metadata string has an odd byte length', node);
    const length = Math.floor(node.length / 2);
    ctx.textLength += length;
    if (ctx.textLength > ctx.limits.maxTextLength)
        throw new PptError('LIMIT_TEXT', 'Metadata text exceeds the configured limit', node.offset);
    return trimTrailingNulls(utf16.decode(ctx.bytes.subarray(node.dataOffset, node.dataOffset + length * 2)));
}
function cstring(ctx, node, instance) { return string(ctx, node.children.find(r => r.type === R.CString && r.instance === instance)); }
function view(ctx, node) { return new DataView(ctx.bytes.buffer, ctx.bytes.byteOffset + node.dataOffset, node.length); }
function* extendedRecords(nodes, ctx, depth = 0) {
    if (depth > ctx.limits.maxDepth)
        throw new PptError('LIMIT_DEPTH', 'Metadata extension nesting exceeds the configured limit');
    for (const node of nodes) {
        yield node;
        if (node.type === R.ProgBinaryTag) {
            const name = cstring(ctx, node, 0), blob = node.children.find(r => r.type === R.BinaryTagData);
            if (blob && name === '___PPT10') {
                try {
                    const extra = readRecords(ctx.recordContext, blob.dataOffset, blob.end, depth + 1);
                    yield* extendedRecords(extra, ctx, depth + 1);
                }
                catch (error) {
                    if (error instanceof PptError && error.code.startsWith('LIMIT_'))
                        throw error;
                    warning(ctx, 'PROGRAM_TAG_INVALID', 'The ___PPT10 record sequence is malformed and could not be fully decoded', blob);
                }
            }
            else if (blob)
                warning(ctx, 'PROGRAM_TAG_UNSUPPORTED', `Programmable tag ${name || '(unnamed)'} is not decoded by this build`, blob);
        }
        if (node.children.length)
            yield* extendedRecords(node.children, ctx, depth + 1);
    }
}
/** A safe clickable target; relative/local file destinations stay metadata-only. */
export function safeHyperlinkTarget(target, location) {
    if (/[\u0000-\u001f\u007f]/.test(target))
        return undefined;
    const value = target.trim();
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            if (!url.hostname)
                return undefined;
            if (location)
                url.hash = location;
            return url.href;
        }
        catch {
            return undefined;
        }
    }
    if (/^(?:mailto:|tel:|#)/i.test(value) && !/[\s]/.test(value))
        return value;
    return undefined;
}
function hyperlink(node, ctx) {
    const atom = node.children.find(r => r.type === R.HyperlinkAtom);
    if (!atom || atom.length < 4) {
        warning(ctx, 'HYPERLINK_ATOM', 'Hyperlink identifier is missing', node);
        return;
    }
    const id = view(ctx, atom).getUint32(0, true), target = cstring(ctx, node, 1), location = cstring(ctx, node, 3), friendlyName = cstring(ctx, node, 0);
    const href = safeHyperlinkTarget(target, location);
    if (!href && (target || location))
        warning(ctx, target ? 'HYPERLINK_BLOCKED' : 'INTERNAL_LINK_UNRESOLVED', target ? 'A local, relative or unsafe hyperlink is preserved as metadata without an active link' : 'An internal slide destination is preserved but has no resolved navigation target', node);
    return { id, friendlyName: friendlyName || undefined, target, location: location || undefined, href, blocked: !href, sourceOffset: node.offset };
}
function soundMime(bytes, extension) { const ascii = (offset, count) => String.fromCharCode(...bytes.subarray(offset, offset + count)); if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE')
    return 'audio/wav'; if (ascii(0, 4) === 'FORM' && ['AIFF', 'AIFC'].includes(ascii(8, 4)))
    return 'audio/aiff'; if (['.wav', 'wave'].includes(extension.toLowerCase()))
    return 'audio/wav'; if (['.aif', 'aiff'].includes(extension.toLowerCase()))
    return 'audio/aiff'; return 'application/octet-stream'; }
function parseSound(node, ctx, assets, remaining) {
    const name = cstring(ctx, node, 0), extension = cstring(ctx, node, 1), idText = cstring(ctx, node, 2), builtin = cstring(ctx, node, 3), data = node.children.find(r => r.type === R.SoundData);
    const id = Number(idText);
    if (!/^\d+$/.test(idText) || !Number.isSafeInteger(id) || id <= 0) {
        warning(ctx, 'SOUND_ID', 'Embedded sound has an invalid identifier', node);
        return;
    }
    const result = { id, name, extension: extension || undefined, builtinId: /^\d+$/.test(builtin) ? Number(builtin) : undefined, byteLength: data?.length ?? 0, sourceOffset: node.offset };
    if (data) {
        if (data.length > remaining)
            throw new PptError('LIMIT_ASSETS', 'Embedded sound data exceeds the configured asset limit', data.offset);
        const bytes = new Uint8Array(ctx.bytes.subarray(data.dataOffset, data.end)), mimeType = soundMime(bytes, extension);
        result.assetId = `sound-${id}-${node.offset}`;
        assets.push({ id: result.assetId, mimeType, bytes, sourceOffset: data.offset, unsupported: mimeType === 'application/octet-stream' });
    }
    else
        warning(ctx, 'SOUND_DATA_MISSING', 'Embedded sound has no audio bytes', node);
    return result;
}
function parseMedia(node, ctx) {
    const atom = node.children.find(r => r.type === R.MediaAtom);
    if (!atom || atom.length < 8) {
        warning(ctx, 'MEDIA_ATOM', 'External media identifier or flags are missing', node);
        return;
    }
    const v = view(ctx, atom), flags = v.getUint16(4, true), wav = node.children.find(r => r.type === R.WavEmbeddedAtom), wv = wav && wav.length >= 8 ? view(ctx, wav) : undefined;
    const item = { id: v.getUint32(0, true), kind: node.type === R.Video ? 'video' : 'audio', sourceRecordType: node.type, path: cstring(ctx, node, 0) || undefined, soundId: wv?.getUint32(0, true), durationMs: wv ? Math.max(0, wv.getInt32(4, true)) : undefined, loop: !!(flags & 1), rewind: !!(flags & 2), narration: !!(flags & 4), sourceOffset: node.offset };
    if (!item.soundId)
        warning(ctx, 'MEDIA_EXTERNAL_SOURCE', 'External media is retained as metadata; its file path is not fetched by the preview', node);
    return item;
}
function parseOle(node, ctx) {
    const atom = node.children.find(r => r.type === R.OleAtom);
    if (!atom || atom.length < 24) {
        warning(ctx, 'OLE_ATOM', 'OLE object metadata is missing or truncated', node);
        return;
    }
    const v = view(ctx, atom);
    warning(ctx, 'OLE_METADATA_ONLY', 'OLE application metadata is retained; only a saved picture preview can be displayed, and no embedded application is executed', node);
    return { id: v.getUint32(8, true), type: v.getUint32(4, true), subType: v.getUint32(12, true), drawAspect: v.getUint32(0, true), storagePersistId: v.getUint32(16, true), menuName: cstring(ctx, node, 1) || undefined, progId: cstring(ctx, node, 2) || undefined, clipboardName: cstring(ctx, node, 3) || undefined, sourceOffset: node.offset };
}
function dateTime(v, offset) {
    const year = v.getUint16(offset, true), month = v.getUint16(offset + 2, true), day = v.getUint16(offset + 6, true), hour = v.getUint16(offset + 8, true), minute = v.getUint16(offset + 10, true), second = v.getUint16(offset + 12, true), ms = v.getUint16(offset + 14, true);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59 || ms > 999)
        return undefined;
    // SYSTEMTIME carries no zone. Preserve a local date-time instead of inventing UTC.
    const p = (n, length = 2) => String(n).padStart(length, '0');
    return `${p(year, 4)}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}:${p(second)}.${p(ms, 3)}`;
}
function parseComment(node, ctx) {
    const atom = node.children.find(r => r.type === R.CommentAtom);
    if (!atom || atom.length < 28) {
        warning(ctx, 'COMMENT_ATOM', 'Presentation comment position or date is missing', node);
        return;
    }
    const v = view(ctx, atom);
    return { index: v.getInt32(0, true), author: cstring(ctx, node, 0), text: cstring(ctx, node, 1), initials: cstring(ctx, node, 2), createdAt: dateTime(v, 4), position: { x: v.getInt32(20, true) / 6, y: v.getInt32(24, true) / 6 }, sourceOffset: node.offset };
}
/** Extracts data without external retrieval, macro execution, media playback or OLE activation. */
export function parseDocumentExtras(records, bytes, limits, diagnostics) {
    const ctx = { bytes, limits, diagnostics, textLength: 0, recordContext: { bytes, limits, diagnostics, count: 0 } };
    const result = { hyperlinks: [], hyperlinkTargets: new Map(), sounds: [], media: [], oleObjects: [], comments: [], assets: [], animationRecordTypes: [], additionalRecordCount: 0 };
    const ids = new Set(), soundIds = new Set(), animations = new Set();
    let assetBytes = 0;
    for (const record of extendedRecords(records, ctx)) {
        if (record.type === R.Hyperlink) {
            const item = hyperlink(record, ctx);
            if (item) {
                if (ids.has(item.id)) {
                    warning(ctx, 'EXTERNAL_ID_DUPLICATE', 'Duplicate external-object/hyperlink identifier was ignored', record);
                    continue;
                }
                ids.add(item.id);
                result.hyperlinks.push(item);
                if (item.href)
                    result.hyperlinkTargets.set(item.id, item.href);
            }
        }
        else if (record.type === R.Sound) {
            const item = parseSound(record, ctx, result.assets, limits.maxAssetBytes - assetBytes);
            if (item) {
                if (soundIds.has(item.id))
                    warning(ctx, 'SOUND_ID_DUPLICATE', 'Duplicate sound identifier retained with a unique asset identifier', record);
                soundIds.add(item.id);
                result.sounds.push(item);
                assetBytes += item.byteLength;
            }
        }
        else if ([R.Video, R.Midi, R.Cd, R.WavEmbedded, R.WavLinked].includes(record.type)) {
            const item = parseMedia(record, ctx);
            if (item)
                result.media.push(item);
        }
        else if ([R.OleEmbedded, R.OleLinked, R.OleControl].includes(record.type)) {
            const item = parseOle(record, ctx);
            if (item)
                result.oleObjects.push(item);
        }
        else if (record.type === R.Comment) {
            const item = parseComment(record, ctx);
            if (item)
                result.comments.push(item);
        }
        if (record.type === R.AnimationInfo || record.type === R.AnimationInfoAtom || record.type >= 0xF125 && record.type <= 0xF145 || record.type >= 0x2B02 && record.type <= 0x2B0D)
            animations.add(record.type);
    }
    result.animationRecordTypes = [...animations];
    result.additionalRecordCount = ctx.recordContext.count;
    if (animations.size)
        diagnostics.push({ code: 'ANIMATION_RECORDS_PRESENT', severity: 'info', message: 'Animation/build records were identified; supported effects are mapped separately to the playback timeline', details: { recordTypes: [...animations] } });
    return result;
}
/** Call on an individual slide to retain its comments and animation inventory. */
export function parseSlideExtras(records, bytes, limits, diagnostics, slideId) { const start = diagnostics.length, result = parseDocumentExtras(records, bytes, limits, diagnostics); for (const c of result.comments)
    c.slideId = slideId; for (let i = start; i < diagnostics.length; i++)
    diagnostics[i].slideId = slideId; return result; }
/** [MS-PPT] 2.10.34–36: caller resolves the OLE object's storagePersistId first. */
export function extractOleStorage(record, bytes, maxBytes, diagnostics) {
    if (record.type !== 0x1011 || record.version !== 0 || record.instance !== 0 && record.instance !== 1) {
        diagnostics.push({ code: 'OLE_STORAGE_TYPE', severity: 'warning', message: 'OLE storage reference has an unsupported record type', offset: record.offset });
        return;
    }
    let result = null;
    if (record.instance === 0) {
        if (record.length > maxBytes)
            throw new PptError('LIMIT_ASSETS', 'OLE storage exceeds the remaining asset limit', record.offset);
        result = new Uint8Array(bytes.subarray(record.dataOffset, record.end));
    }
    else if (record.length >= 4) {
        const size = new DataView(bytes.buffer, bytes.byteOffset + record.dataOffset, 4).getUint32(0, true);
        if (size > maxBytes)
            throw new PptError('LIMIT_ASSETS', 'Decompressed OLE storage exceeds the remaining asset limit', record.offset);
        result = inflateZlib(bytes.subarray(record.dataOffset + 4, record.end), size, maxBytes);
    }
    if (!result) {
        diagnostics.push({ code: 'OLE_STORAGE_INVALID', severity: 'warning', message: 'OLE storage is truncated or its zlib payload could not be decoded', offset: record.offset });
        return;
    }
    return { id: `ole-storage-${record.offset}`, mimeType: 'application/x-ole-storage', bytes: result, sourceOffset: record.offset, unsupported: true };
}
