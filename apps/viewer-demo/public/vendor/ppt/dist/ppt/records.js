import { PptError } from '../core/errors.js';
export function readRecord(ctx, offset, end = ctx.bytes.length, depth = 0) {
    if (depth > ctx.limits.maxDepth)
        throw new PptError('LIMIT_DEPTH', 'Record nesting exceeds the configured limit', offset);
    if (++ctx.count > ctx.limits.maxRecords)
        throw new PptError('LIMIT_RECORDS', 'Record count exceeds the configured limit', offset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 8 > end || end > ctx.bytes.length)
        throw new PptError('RECORD_HEADER', 'Truncated or invalid record header', offset);
    const v = new DataView(ctx.bytes.buffer, ctx.bytes.byteOffset + offset, 8);
    const vi = v.getUint16(0, true);
    const length = v.getUint32(4, true);
    const recordEnd = offset + 8 + length;
    if (recordEnd > end)
        throw new PptError('RECORD_LENGTH', `Record payload exceeds its containing stream (${length} bytes)`, offset);
    const node = { type: v.getUint16(2, true), version: vi & 15, instance: vi >>> 4, offset, dataOffset: offset + 8, length, end: recordEnd, children: [] };
    // RoundTripCustomTableStyles12Atom contains an opaque OOXML ZIP. Its recVer
    // SHOULD be zero, but actual Office writers also use 0xF. Type grammar wins.
    // [MS-PPT] 2.11.13; Theme and text-style round-trip atoms are also opaque.
    if ([0x040e, 0x0423, 0x0427, 0x0428].includes(node.type) && node.version !== 0) {
        ctx.diagnostics.push({ code: 'ROUNDTRIP_VERSION', severity: 'info', message: 'Treated a round-trip Office XML package as an opaque record despite its producer-specific record version.', offset });
    }
    else if (node.version === 15)
        node.children = readRecords(ctx, node.dataOffset, recordEnd, depth + 1);
    return node;
}
export function readRecords(ctx, start, end, depth = 0) {
    const result = [];
    let offset = start;
    while (offset + 8 <= end) {
        const node = readRecord(ctx, offset, end, depth);
        result.push(node);
        offset = node.end;
    }
    if (offset !== end) {
        const message = `${end - offset} trailing bytes in record container`;
        if (ctx.strict)
            throw new PptError('RECORD_TAIL', message, offset);
        ctx.diagnostics.push({ code: 'RECORD_TAIL', severity: 'warning', message, offset });
    }
    return result;
}
export function* walkRecords(records) { for (const r of records) {
    yield r;
    yield* walkRecords(r.children);
} }
export function findRecord(records, type) { for (const r of walkRecords(records))
    if (r.type === type)
        return r; return undefined; }
export function childrenOf(record, type) { return record.children.filter(r => r.type === type); }
