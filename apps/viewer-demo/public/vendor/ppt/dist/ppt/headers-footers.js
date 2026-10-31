import { PptError } from '../core/errors.js';
import { trimTrailingNulls } from '../core/utils.js';
import { RT } from './constants.js';
function warning(ctx, code, message, record) {
    ctx.diagnostics.push({ code, severity: 'warning', message, offset: record.offset });
}
function bounded(record, ctx, minimum) {
    if (record.dataOffset < 0 || record.end > ctx.bytes.length || record.end - record.dataOffset < minimum) {
        warning(ctx, 'HEADER_FOOTER_TRUNCATED', 'A header/footer record is truncated or outside its stream', record);
        return false;
    }
    return true;
}
function stringValue(record, ctx) {
    if (!bounded(record, ctx, 0))
        return undefined;
    if (record.length / 2 > ctx.limits.maxTextLength)
        throw new PptError('LIMIT_TEXT', 'Header/footer text exceeds the configured character limit', record.offset);
    if (record.length % 2)
        warning(ctx, 'HEADER_FOOTER_UTF16', 'An odd trailing byte in header/footer text was ignored', record);
    if (record.instance === 0 && record.length > 510)
        warning(ctx, 'HEADER_FOOTER_DATE_LENGTH', 'Custom date text exceeds the specification length of 255 UTF-16 units', record);
    const view = new DataView(ctx.bytes.buffer, ctx.bytes.byteOffset, ctx.bytes.byteLength);
    const pieces = [];
    const count = Math.floor(record.length / 2);
    for (let from = 0; from < count; from += 8192) {
        const values = [];
        for (let i = from; i < Math.min(count, from + 8192); i++)
            values.push(view.getUint16(record.dataOffset + i * 2, true));
        pieces.push(String.fromCharCode(...values));
    }
    return trimTrailingNulls(pieces.join(''));
}
/**
 * Read immediate children only: instance 3 is document slide defaults, 4 notes
 * defaults, and 0 a per-slide/master override. Absent values remain absent.
 */
export function parseHeaderFooter(records, ctx, instance = 0) {
    const containers = records.filter(record => record.type === RT.HeadersFooters && record.instance === instance);
    const container = containers[0];
    if (!container)
        return undefined;
    if (containers.length > 1)
        warning(ctx, 'HEADER_FOOTER_DUPLICATE', 'Duplicate header/footer containers were ignored', containers[1]);
    const atom = container.children.find(record => record.type === RT.HeadersFootersAtom);
    if (!atom) {
        warning(ctx, 'HEADER_FOOTER_ATOM', 'Header/footer options atom is missing', container);
        return undefined;
    }
    if (!bounded(atom, ctx, 4))
        return undefined;
    const view = new DataView(ctx.bytes.buffer, ctx.bytes.byteOffset + atom.dataOffset, 4);
    const format = view.getInt16(0, true), flags = view.getUint16(2, true);
    const result = {
        showDate: !!(flags & 1), useCurrentDate: !!(flags & 2), useUserDate: !!(flags & 4),
        showSlideNumber: !!(flags & 8), showHeader: instance !== 3 && !!(flags & 16),
        showFooter: !!(flags & 32), format,
    };
    // The ten reserved bits have no payload and MUST be ignored by readers.
    if (atom.length !== 4)
        warning(ctx, 'HEADER_FOOTER_LENGTH', 'Extra bytes in header/footer options were ignored', atom);
    if (result.useCurrentDate && (format < 0 || format > 13))
        warning(ctx, 'HEADER_FOOTER_DATE_FORMAT', `Unsupported current-date format ${format}`, atom);
    if (result.useCurrentDate && result.useUserDate)
        warning(ctx, 'HEADER_FOOTER_DATE_MODE', 'Both current-date and custom-date flags are enabled', atom);
    const seen = new Set();
    for (const record of container.children) {
        if (record.type !== RT.CString || record.instance > 2)
            continue;
        if (seen.has(record.instance)) {
            warning(ctx, 'HEADER_FOOTER_STRING_DUPLICATE', 'Duplicate header/footer text record was ignored', record);
            continue;
        }
        seen.add(record.instance);
        const value = stringValue(record, ctx);
        if (value === undefined)
            continue;
        if (record.instance === 0)
            result.userDate = value;
        else if (record.instance === 1 && instance === 4)
            result.header = value;
        else if (record.instance === 2)
            result.footer = value;
    }
    return result;
}
/** Resolve document → master → local settings without mutating source objects. */
export function resolveHeaderFooter(...levels) {
    let result;
    for (const level of levels) {
        if (!level)
            continue;
        result = { ...result, ...level };
        // Explicit empty strings replace inherited text; absent strings inherit it.
    }
    return result;
}
