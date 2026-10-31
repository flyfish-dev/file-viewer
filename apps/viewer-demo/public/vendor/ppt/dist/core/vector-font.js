export function readEmfFont(record) {
    if (!record.ensure(12, 92))
        return null;
    const family = new TextDecoder('utf-16le').decode(record.slice(40, 64)).split('\0')[0] || 'sans-serif';
    return {
        family,
        size: Math.abs(record.i32(12)) || 12,
        escapement: record.i32(20),
        weight: record.i32(28),
        italic: Boolean(record.u8(32)),
        underline: Boolean(record.u8(33)),
        strike: Boolean(record.u8(34)),
    };
}
export function readWmfFont(record) {
    if (!record.ensure(6, 18))
        return null;
    const family = new TextDecoder('windows-1252').decode(record.slice(24, Math.min(32, record.length - 24)))
        .split('\0')[0] || 'sans-serif';
    return {
        family,
        size: Math.abs(record.i16(6)) || 12,
        escapement: record.i16(10),
        weight: record.i16(14),
        italic: Boolean(record.u8(16)),
        underline: Boolean(record.u8(17)),
        strike: Boolean(record.u8(18)),
    };
}
