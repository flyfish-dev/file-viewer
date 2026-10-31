/**
 * Small RFC1950/zlib + RFC1951/DEFLATE inflater.
 *
 * OfficeArt stores EMF/WMF BLIPs behind OfficeArtMetafileHeader.compression=0x00
 * using the zlib wrapper defined by RFC1950. Keeping this inflater dependency-free
 * preserves the browser-only build while still allowing the synchronous MS-DOC
 * parser to expose browser-displayable SVG assets.
 */
class InflateError extends Error {
    name = 'InflateError';
}
class BitReader {
    bytes;
    byteOffset = 0;
    bitBuffer = 0;
    bitCount = 0;
    constructor(bytes) {
        this.bytes = bytes;
    }
    readBits(count) {
        if (count < 0 || count > 24)
            throw new InflateError('Invalid bit count');
        while (this.bitCount < count) {
            if (this.byteOffset >= this.bytes.length)
                throw new InflateError('Unexpected end of deflate stream');
            this.bitBuffer |= (this.bytes[this.byteOffset++] ?? 0) << this.bitCount;
            this.bitCount += 8;
        }
        const mask = count === 0 ? 0 : (1 << count) - 1;
        const value = this.bitBuffer & mask;
        this.bitBuffer >>>= count;
        this.bitCount -= count;
        return value;
    }
    readBit() {
        return this.readBits(1);
    }
    alignToByte() {
        this.bitBuffer = 0;
        this.bitCount = 0;
    }
    readByte() {
        return this.readBits(8);
    }
}
class ByteSink {
    buffer;
    maxLength;
    length = 0;
    constructor(initialCapacity = 32768, maxLength = 128 * 1024 * 1024) {
        this.maxLength = maxLength;
        this.buffer = new Uint8Array(Math.min(Math.max(1, initialCapacity), maxLength));
    }
    reserve(extra) {
        const required = this.length + extra;
        if (required > this.maxLength)
            throw new InflateError('Inflated data exceeds declared size or configured limit');
        if (required <= this.buffer.length)
            return;
        let next = this.buffer.length;
        while (next < required)
            next *= 2;
        const grown = new Uint8Array(Math.min(next, this.maxLength));
        grown.set(this.buffer.subarray(0, this.length));
        this.buffer = grown;
    }
    push(value) {
        this.reserve(1);
        this.buffer[this.length++] = value & 0xff;
    }
    pushBytes(bytes) {
        this.reserve(bytes.length);
        this.buffer.set(bytes, this.length);
        this.length += bytes.length;
    }
    copyFromBack(distance, length) {
        if (distance <= 0 || distance > this.length)
            throw new InflateError('Invalid back-reference distance');
        this.reserve(length);
        for (let i = 0; i < length; i += 1) {
            this.buffer[this.length] = this.buffer[this.length - distance] ?? 0;
            this.length += 1;
        }
    }
    toUint8Array(expectedLength) {
        const out = this.buffer.slice(0, this.length);
        if (expectedLength != null && expectedLength >= 0 && out.length !== expectedLength) {
            // The OfficeArt header is advisory in some legacy files. Do not fail the
            // parse because a producer rounded the saved size differently.
            return out;
        }
        return out;
    }
}
function buildHuffmanTable(lengths) {
    const maxBits = Math.max(0, ...lengths);
    if (maxBits === 0)
        throw new InflateError('Empty Huffman table');
    const blCount = new Array(maxBits + 1).fill(0);
    for (const length of lengths) {
        if (length < 0 || length > maxBits)
            throw new InflateError('Invalid code length');
        if (length)
            blCount[length] = (blCount[length] ?? 0) + 1;
    }
    const nextCode = new Array(maxBits + 1).fill(0);
    let code = 0;
    for (let bits = 1; bits <= maxBits; bits += 1) {
        code = (code + (blCount[bits - 1] ?? 0)) << 1;
        nextCode[bits] = code;
    }
    const maps = Array.from({ length: maxBits + 1 }, () => new Map());
    for (let symbol = 0; symbol < lengths.length; symbol += 1) {
        const length = lengths[symbol] ?? 0;
        if (!length)
            continue;
        const canonical = nextCode[length] ?? 0;
        nextCode[length] = canonical + 1;
        maps[length].set(canonical, symbol);
    }
    return { maps, maxBits };
}
function decodeSymbol(reader, table) {
    let code = 0;
    for (let length = 1; length <= table.maxBits; length += 1) {
        code = (code << 1) | reader.readBit();
        const hit = table.maps[length]?.get(code);
        if (hit != null)
            return hit;
    }
    throw new InflateError('Invalid Huffman code');
}
const LENGTH_BASE = [
    3, 4, 5, 6, 7, 8, 9, 10,
    11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115,
    131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4, 4,
    5, 5, 5, 5, 0,
];
const DISTANCE_BASE = [
    1, 2, 3, 4, 5, 7, 9, 13,
    17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073,
    4097, 6145, 8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [
    0, 0, 0, 0, 1, 1, 2, 2,
    3, 3, 4, 4, 5, 5, 6, 6,
    7, 7, 8, 8, 9, 9, 10, 10,
    11, 11, 12, 12, 13, 13,
];
let fixedLiteralLengthTable = null;
let fixedDistanceTable = null;
function getFixedTables() {
    if (!fixedLiteralLengthTable) {
        const lengths = new Array(288).fill(0);
        for (let i = 0; i <= 143; i += 1)
            lengths[i] = 8;
        for (let i = 144; i <= 255; i += 1)
            lengths[i] = 9;
        for (let i = 256; i <= 279; i += 1)
            lengths[i] = 7;
        for (let i = 280; i <= 287; i += 1)
            lengths[i] = 8;
        fixedLiteralLengthTable = buildHuffmanTable(lengths);
        fixedDistanceTable = buildHuffmanTable(new Array(32).fill(5));
    }
    return { literalLength: fixedLiteralLengthTable, distance: fixedDistanceTable };
}
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
function readDynamicTables(reader) {
    const hlit = reader.readBits(5) + 257;
    const hdist = reader.readBits(5) + 1;
    const hclen = reader.readBits(4) + 4;
    const codeLengthLengths = new Array(19).fill(0);
    for (let i = 0; i < hclen; i += 1) {
        codeLengthLengths[CODE_LENGTH_ORDER[i]] = reader.readBits(3);
    }
    const codeLengthTable = buildHuffmanTable(codeLengthLengths);
    const lengths = [];
    while (lengths.length < hlit + hdist) {
        const symbol = decodeSymbol(reader, codeLengthTable);
        if (symbol <= 15) {
            lengths.push(symbol);
        }
        else if (symbol === 16) {
            if (!lengths.length)
                throw new InflateError('Repeat code length without previous value');
            const repeat = reader.readBits(2) + 3;
            const previous = lengths[lengths.length - 1] ?? 0;
            for (let i = 0; i < repeat; i += 1)
                lengths.push(previous);
        }
        else if (symbol === 17) {
            const repeat = reader.readBits(3) + 3;
            for (let i = 0; i < repeat; i += 1)
                lengths.push(0);
        }
        else if (symbol === 18) {
            const repeat = reader.readBits(7) + 11;
            for (let i = 0; i < repeat; i += 1)
                lengths.push(0);
        }
        else {
            throw new InflateError('Invalid code length symbol');
        }
    }
    const literalLengths = lengths.slice(0, hlit);
    const distanceLengths = lengths.slice(hlit, hlit + hdist);
    if (!literalLengths[256])
        throw new InflateError('Missing end-of-block code');
    if (!distanceLengths.some(Boolean))
        distanceLengths[0] = 1;
    return {
        literalLength: buildHuffmanTable(literalLengths),
        distance: buildHuffmanTable(distanceLengths),
    };
}
function inflateHuffmanBlock(reader, sink, literalLength, distance) {
    for (;;) {
        const symbol = decodeSymbol(reader, literalLength);
        if (symbol < 256) {
            sink.push(symbol);
            continue;
        }
        if (symbol === 256)
            return;
        if (symbol < 257 || symbol > 285)
            throw new InflateError('Invalid length symbol');
        const lengthIndex = symbol - 257;
        let length = LENGTH_BASE[lengthIndex] ?? 0;
        const lengthExtra = LENGTH_EXTRA[lengthIndex] ?? 0;
        if (lengthExtra)
            length += reader.readBits(lengthExtra);
        const distSymbol = decodeSymbol(reader, distance);
        if (distSymbol < 0 || distSymbol >= DISTANCE_BASE.length)
            throw new InflateError('Invalid distance symbol');
        let dist = DISTANCE_BASE[distSymbol] ?? 0;
        const distExtra = DISTANCE_EXTRA[distSymbol] ?? 0;
        if (distExtra)
            dist += reader.readBits(distExtra);
        sink.copyFromBack(dist, length);
    }
}
function inflateDeflate(deflateBytes, expectedLength, maxLength = 128 * 1024 * 1024) {
    const reader = new BitReader(deflateBytes);
    const sink = new ByteSink(Math.min(expectedLength && expectedLength > 0 ? expectedLength : 32768, 32768), expectedLength == null ? maxLength : Math.min(expectedLength, maxLength));
    let final = false;
    while (!final) {
        final = reader.readBit() === 1;
        const type = reader.readBits(2);
        if (type === 0) {
            reader.alignToByte();
            const len = reader.readByte() | (reader.readByte() << 8);
            const nlen = reader.readByte() | (reader.readByte() << 8);
            if (((len ^ 0xffff) & 0xffff) !== nlen)
                throw new InflateError('Invalid stored block length');
            const chunk = new Uint8Array(len);
            for (let i = 0; i < len; i += 1)
                chunk[i] = reader.readByte();
            sink.pushBytes(chunk);
        }
        else if (type === 1) {
            const fixed = getFixedTables();
            inflateHuffmanBlock(reader, sink, fixed.literalLength, fixed.distance);
        }
        else if (type === 2) {
            const dynamic = readDynamicTables(reader);
            inflateHuffmanBlock(reader, sink, dynamic.literalLength, dynamic.distance);
        }
        else {
            throw new InflateError('Reserved deflate block type');
        }
    }
    return sink.toUint8Array(expectedLength);
}
function adler32(bytes) {
    let a = 1;
    let b = 0;
    for (const byte of bytes) {
        a = (a + byte) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}
/** Raw RFC 1951 DEFLATE for ZIP entries; the caller verifies the container CRC. */
export function inflateRaw(bytes, expectedLength, maxLength = 128 * 1024 * 1024) {
    if (!Number.isSafeInteger(expectedLength) || expectedLength < 0 || !Number.isSafeInteger(maxLength) || maxLength < 0 || expectedLength > maxLength)
        return null;
    try {
        const inflated = inflateDeflate(bytes, expectedLength, maxLength);
        return inflated.length === expectedLength ? inflated : null;
    }
    catch {
        return null;
    }
}
export function inflateZlib(bytes, expectedLength, maxLength = 128 * 1024 * 1024) {
    if (bytes.length < 6)
        return null;
    const cmf = bytes[0] ?? 0;
    const flg = bytes[1] ?? 0;
    if ((cmf & 0x0f) !== 8)
        return null;
    if ((cmf >>> 4) > 7)
        return null;
    if (((cmf << 8) + flg) % 31 !== 0)
        return null;
    if (flg & 0x20)
        return null;
    try {
        const deflateBytes = bytes.subarray(2, Math.max(2, bytes.length - 4));
        if (!Number.isSafeInteger(maxLength) || maxLength <= 0 || (expectedLength != null && (!Number.isSafeInteger(expectedLength) || expectedLength < 0 || expectedLength > maxLength)))
            return null;
        const inflated = inflateDeflate(deflateBytes, expectedLength, maxLength);
        if (expectedLength != null && inflated.length !== expectedLength)
            return null;
        const expectedAdler = ((bytes[bytes.length - 4] ?? 0) << 24)
            | ((bytes[bytes.length - 3] ?? 0) << 16)
            | ((bytes[bytes.length - 2] ?? 0) << 8)
            | (bytes[bytes.length - 1] ?? 0);
        if (expectedAdler >>> 0) {
            const actual = adler32(inflated);
            if (actual !== (expectedAdler >>> 0))
                return null;
        }
        return inflated;
    }
    catch {
        return null;
    }
}
