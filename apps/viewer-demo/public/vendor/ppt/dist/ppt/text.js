import { PptError } from '../core/errors.js';
import { interactionHref } from './interactions.js';
import { RT } from './constants.js';
import { walkRecords } from './records.js';
/** Record-local reader: a malformed optional field can never consume another record. */
class Cursor {
    view;
    at;
    end;
    constructor(bytes, record) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.at = record.dataOffset;
        this.end = record.end;
        if (this.at < 0 || this.end > bytes.length || this.at > this.end)
            throw new PptError('TEXT_BOUNDS', 'Text record lies outside its stream', record.offset);
    }
    need(size) {
        if (!Number.isSafeInteger(size) || size < 0 || this.at + size > this.end)
            throw new PptError('TEXT_TRUNCATED', 'Truncated text formatting field', this.at);
    }
    u16() { this.need(2); const n = this.view.getUint16(this.at, true); this.at += 2; return n; }
    i16() { this.need(2); const n = this.view.getInt16(this.at, true); this.at += 2; return n; }
    u32() { this.need(4); const n = this.view.getUint32(this.at, true); this.at += 4; return n; }
}
function warn(ctx, code, message, offset) {
    ctx.diagnostics.push({ code, severity: 'warning', message, offset });
}
function failure(ctx, error, record) {
    if (error instanceof PptError && error.code.startsWith('LIMIT_'))
        throw error;
    warn(ctx, error instanceof PptError ? error.code : 'TEXT_FORMAT', error instanceof Error ? error.message : String(error), error instanceof PptError ? error.offset : record.offset);
}
function rgb(value) {
    return '#' + [value & 255, (value >>> 8) & 255, (value >>> 16) & 255].map(n => n.toString(16).padStart(2, '0')).join('');
}
/** Text ColorIndexStruct differs from OfficeArtCOLORREF: high byte 0xfe means RGB. */
function textColor(value, ctx) {
    const index = value >>> 24;
    if (index <= 7)
        return { colorIndex: index, color: rgb(ctx.colors[index] ?? (index === 0 ? 0xffffff : 0)) };
    if (index === 0xfe)
        return { color: rgb(value) };
    if (index !== 0xff)
        warn(ctx, 'TEXT_COLOR_INDEX', `Invalid text color scheme index ${index}; using stored RGB components`);
    return index === 0xff ? {} : { color: rgb(value) };
}
function fontName(id, ctx) {
    return ctx.fonts.find(f => f.id === id)?.name;
}
function mergeCharacter(base, own) {
    const merged = { ...base, ...Object.fromEntries(Object.entries(own).filter(([, value]) => value !== undefined)) };
    if (own.color !== undefined && own.colorIndex === undefined)
        delete merged.colorIndex;
    return merged;
}
function mergeParagraph(base, own) {
    const merged = { ...base, ...own };
    // PFWrapFlags is a bitfield with three independent PFMasks selectors.
    // Unselected bits in its stored word are not overrides of master properties.
    if (own.wrapFlags !== undefined) {
        const mask = (own.wrapFlagsMask ?? 7) & 7;
        merged.wrapFlags = ((base.wrapFlags ?? 0) & ~mask) | (own.wrapFlags & mask);
        merged.wrapFlagsMask = ((base.wrapFlagsMask ?? (base.wrapFlags === undefined ? 0 : 7)) | mask) & 7;
    }
    if (base.bullet || own.bullet) {
        merged.bullet = { ...base.bullet, ...own.bullet, text: own.bullet?.text || base.bullet?.text || '•' };
        if (own.bullet?.color !== undefined && own.bullet.colorIndex === undefined)
            delete merged.bullet.colorIndex;
        if (own.bullet?.size !== undefined)
            delete merged.bullet.sizePercent;
        if (own.bullet?.sizePercent !== undefined)
            delete merged.bullet.size;
    }
    if (own.lineHeight !== undefined)
        delete merged.lineHeightPoints;
    if (own.lineHeightPoints !== undefined)
        delete merged.lineHeight;
    if (own.spaceBefore !== undefined)
        delete merged.spaceBeforePercent;
    if (own.spaceBeforePercent !== undefined)
        delete merged.spaceBefore;
    if (own.spaceAfter !== undefined)
        delete merged.spaceAfterPercent;
    if (own.spaceAfterPercent !== undefined)
        delete merged.spaceAfter;
    return merged;
}
/** Font-style flags only override attributes selected by their mask. */
function readCF(c, ctx) {
    const maskOffset = c.at;
    const mask = c.u32();
    // The extension bits describe different record structures, not extra base fields.
    if (mask & 0x07100000)
        throw new PptError('TEXT_CF_EXTENSION', `Unsupported extension bits in base character formatting: 0x${mask.toString(16)}`, maskOffset);
    // Unused/reserved mask bits have no payload. MS-PPT requires ignoring them;
    // Windows writers commonly set the unused low bits in a full default mask.
    const out = {};
    if (mask & 0x3eb7) {
        const flags = c.u16();
        if (mask & 1)
            out.bold = !!(flags & 1);
        if (mask & 2)
            out.italic = !!(flags & 2);
        if (mask & 4)
            out.underline = !!(flags & 4);
        if (mask & 0x10)
            out.shadow = !!(flags & 0x10);
        if (mask & 0x200)
            out.emboss = !!(flags & 0x200);
    }
    if (mask & 0x10000) {
        out.fontId = c.u16();
        out.fontFamily = fontName(out.fontId, ctx);
    }
    if (mask & 0x200000) {
        out.eastAsianFontId = c.u16();
        out.eastAsianFontFamily = fontName(out.eastAsianFontId, ctx);
    }
    if (mask & 0x400000) {
        out.ansiFontId = c.u16();
        out.ansiFontFamily = fontName(out.ansiFontId, ctx);
    }
    if (mask & 0x800000) {
        out.symbolFontId = c.u16();
        out.symbolFontFamily = fontName(out.symbolFontId, ctx);
    }
    if (mask & 0x20000) {
        const size = c.i16();
        if (size < 1 || size > 4000)
            warn(ctx, 'TEXT_FONT_SIZE', `Invalid font size ${size} points`, c.at - 2);
        else
            out.fontSize = size * 4 / 3;
    }
    if (mask & 0x40000)
        Object.assign(out, textColor(c.u32(), ctx));
    if (mask & 0x80000)
        out.baseline = c.i16();
    return out;
}
function readTabs(c, ctx) {
    const count = c.u16();
    c.need(count * 4);
    const tabs = [];
    for (let i = 0; i < count; i++) {
        const position = c.i16() / 6;
        const kind = c.u16();
        if (kind > 3)
            warn(ctx, 'TEXT_TAB_ALIGNMENT', `Unknown tab alignment ${kind}`, c.at - 2);
        tabs.push({ position, alignment: ['left', 'center', 'right', 'decimal'][kind] ?? 'left' });
    }
    return tabs;
}
function spacing(out, property, value) {
    if (property === 'lineHeight') {
        if (value < 0)
            out.lineHeightPoints = -value / 6;
        else
            out.lineHeight = value / 100;
    }
    else if (property === 'spaceBefore') {
        if (value < 0)
            out.spaceBefore = -value / 6;
        else
            out.spaceBeforePercent = value / 100;
    }
    else {
        if (value < 0)
            out.spaceAfter = -value / 6;
        else
            out.spaceAfterPercent = value / 100;
    }
}
function readPF(c, ctx) {
    const maskOffset = c.at;
    const mask = c.u32();
    if (mask & 0x03800000)
        throw new PptError('TEXT_PF_EXTENSION', `Unsupported extension bits in base paragraph formatting: 0x${mask.toString(16)}`, maskOffset);
    // Ignore unused/reserved mask bits; only defined fields consume bytes.
    const out = {};
    const bullet = { text: '' };
    if (mask & 15) {
        const flags = c.u16();
        if (mask & 1)
            out.bulletEnabled = !!(flags & 1);
        if (mask & 2)
            bullet.useFont = !!(flags & 2);
        if (mask & 4)
            bullet.useColor = !!(flags & 4);
        if (mask & 8)
            bullet.useSize = !!(flags & 8);
    }
    if (mask & 0x80)
        bullet.text = String.fromCharCode(c.u16());
    if (mask & 0x10) {
        bullet.fontId = c.u16();
        bullet.fontFamily = fontName(bullet.fontId, ctx);
    }
    if (mask & 0x40) {
        const size = c.i16();
        if (size < 0)
            bullet.size = -size * 4 / 3;
        else
            bullet.sizePercent = size / 100;
    }
    if (mask & 0x20)
        Object.assign(bullet, textColor(c.u32(), ctx));
    if (mask & 0xff)
        out.bullet = bullet;
    if (mask & 0x800) {
        const align = c.u16();
        out.alignment = ['left', 'center', 'right', 'justify', 'distributed', 'justify', 'justify'][align] ?? 'left';
        if (align === 5 || align === 6)
            warn(ctx, 'TEXT_DISTRIBUTED_ALIGNMENT', `Text alignment ${align} is approximated as justified`, c.at - 2);
        else if (align > 6)
            warn(ctx, 'TEXT_ALIGNMENT', `Unknown text alignment ${align}; using left alignment`, c.at - 2);
    }
    if (mask & 0x1000)
        spacing(out, 'lineHeight', c.i16());
    if (mask & 0x2000)
        spacing(out, 'spaceBefore', c.i16());
    if (mask & 0x4000)
        spacing(out, 'spaceAfter', c.i16());
    if (mask & 0x100)
        out.marginLeft = c.i16() / 6;
    if (mask & 0x400)
        out.firstLinePosition = c.i16() / 6;
    if (mask & 0x8000)
        out.defaultTabSize = c.i16() / 6;
    if (mask & 0x100000) {
        out.tabStops = readTabs(c, ctx);
        // [MS-PPT] TabStop: a TextPFException containing leftMargin makes its
        // positions relative to that paragraph margin; TextRuler uses text origin.
        if (mask & 0x100)
            for (const stop of out.tabStops)
                stop.origin = 'paragraph';
    }
    if (mask & 0x10000) {
        out.fontAlignment = c.u16();
        if (out.fontAlignment > 3)
            warn(ctx, 'TEXT_FONT_ALIGNMENT', `Unknown font alignment ${out.fontAlignment}; using the font baseline`, c.at - 2);
    }
    if (mask & 0xe0000) {
        out.wrapFlags = c.u16() & 7;
        out.wrapFlagsMask = (mask >>> 17) & 7;
    }
    if (mask & 0x200000)
        out.direction = c.u16() === 1 ? 'rtl' : 'ltr';
    return out;
}
function readRuler(record, ctx) {
    const c = new Cursor(ctx.bytes, record);
    const flags = c.u32();
    const result = { common: {}, levels: Array.from({ length: 5 }, () => ({})) };
    if (flags & ~0x1fff)
        warn(ctx, 'TEXT_RULER_RESERVED', 'Reserved text-ruler bits are set', record.offset);
    if (flags & 2) {
        const levels = c.i16();
        if (levels < 0 || levels > 5)
            warn(ctx, 'TEXT_RULER_LEVELS', `Invalid text-ruler level count ${levels}`, c.at - 2);
    }
    if (flags & 1)
        result.common.defaultTabSize = c.i16() / 6;
    if (flags & 4)
        result.common.tabStops = readTabs(c, ctx);
    for (let level = 0; level < 5; level++) {
        if (flags & (1 << (3 + level)))
            result.levels[level].marginLeft = c.i16() / 6;
        if (flags & (1 << (8 + level)))
            result.levels[level].firstLinePosition = c.i16() / 6;
    }
    return result;
}
function decodeChars(record, ctx) {
    if (record.length / 2 > ctx.limits.maxTextLength)
        throw new PptError('LIMIT_TEXT', 'Text body exceeds the configured character limit', record.offset);
    if (record.length % 2 !== 0)
        warn(ctx, 'TEXT_ODD_UTF16', 'An odd trailing byte in UTF-16 text was ignored', record.end - 1);
    const count = Math.floor(record.length / 2);
    const v = new DataView(ctx.bytes.buffer, ctx.bytes.byteOffset, ctx.bytes.byteLength);
    const parts = [];
    for (let i = 0; i < count; i += 8192) {
        const chars = [];
        for (let j = i; j < Math.min(count, i + 8192); j++)
            chars.push(v.getUint16(record.dataOffset + j * 2, true));
        parts.push(String.fromCharCode(...chars));
    }
    return parts.join('');
}
function decodeBytes(record, ctx) {
    if (record.length > ctx.limits.maxTextLength)
        throw new PptError('LIMIT_TEXT', 'Text body exceeds the configured character limit', record.offset);
    // Do not use TextDecoder("latin1"): browsers map that alias to Windows-1252.
    const data = ctx.bytes.subarray(record.dataOffset, record.end);
    const parts = [];
    for (let i = 0; i < data.length; i += 8192)
        parts.push(String.fromCharCode(...data.subarray(i, i + 8192)));
    return parts.join('');
}
function checkCount(count, covered, length, offset) {
    if (count === 0 || count > length - covered)
        throw new PptError('TEXT_RUN_COVERAGE', `Invalid text run length ${count}; ${length - covered} UTF-16 code units remain`, offset);
}
function parseRuns(record, length, ctx) {
    const c = new Cursor(ctx.bytes, record);
    const paragraphs = [], characters = [];
    try {
        let count = 0;
        while (count < length) {
            if (paragraphs.length >= ctx.limits.maxRecords)
                throw new PptError('LIMIT_TEXT_RUNS', 'Too many paragraph formatting runs', c.at);
            const start = count, size = c.u32();
            checkCount(size, count, length, c.at - 4);
            const rawLevel = c.u16();
            if (rawLevel > 4)
                warn(ctx, 'TEXT_INDENT_LEVEL', `Paragraph indent level ${rawLevel} exceeds 4`, c.at - 2);
            const style = readPF(c, ctx);
            count += size;
            paragraphs.push({ start, end: count, level: Math.min(4, rawLevel), style });
        }
        count = 0;
        while (count < length) {
            if (characters.length >= ctx.limits.maxRecords)
                throw new PptError('LIMIT_TEXT_RUNS', 'Too many character formatting runs', c.at);
            const start = count, size = c.u32();
            checkCount(size, count, length, c.at - 4);
            const style = readCF(c, ctx);
            count += size;
            characters.push({ start, end: count, style });
        }
        if (c.at !== c.end)
            warn(ctx, 'TEXT_STYLE_TAIL', `${c.end - c.at} unused bytes in text formatting`, c.at);
    }
    catch (error) {
        failure(ctx, error, record);
    }
    return { paragraphs, characters };
}
/** [MS-PPT] TextSIException: unused mask bits do not add payload fields. */
function readSI(c, ctx) {
    const mask = c.u32(), style = {};
    if (mask & 1)
        c.u16(); // Spelling status does not change displayed characters.
    if (mask & 2)
        style.language = c.u16();
    if (mask & 4)
        style.alternateLanguage = c.u16();
    if (mask & 0x40)
        c.u16(); // Contains bidi characters, not a paragraph direction.
    if (mask & 0x20)
        c.u32(); // PP10 run identifier and grammar status.
    if (mask & 0x200) {
        const count = c.u32();
        if (count > ctx.limits.maxRecords)
            throw new PptError('LIMIT_TEXT_RUNS', 'Too many smart-tag indices', c.at - 4);
        c.need(count * 4);
        c.at += count * 4;
    }
    for (const language of [style.language, style.alternateLanguage]) {
        if (language !== undefined && language !== 0 && language !== 0x13 && language < 0x400)
            warn(ctx, 'TEXT_LANGUAGE', `Invalid text language identifier 0x${language.toString(16)}`, c.at);
    }
    return style;
}
function parseSpecialInfo(record, length, ctx) {
    const c = new Cursor(ctx.bytes, record), ranges = [];
    let covered = 0;
    try {
        while (covered < length) {
            if (ranges.length >= ctx.limits.maxRecords)
                throw new PptError('LIMIT_TEXT_RUNS', 'Too many text language runs', c.at);
            const start = covered, count = c.u32();
            checkCount(count, covered, length, c.at - 4);
            const style = readSI(c, ctx);
            covered += count;
            ranges.push({ start, end: covered, style });
        }
        if (c.at !== c.end)
            warn(ctx, 'TEXT_SI_TAIL', `${c.end - c.at} unused bytes in text language properties`, c.at);
    }
    catch (error) {
        failure(ctx, error, record);
    }
    return ranges;
}
/** Microsoft PPT 97–2007 specification, TxMasterStyleAtom: these are deltas. */
function baseTextType(textType) {
    return textType === 6 ? 0 : textType === 5 || textType === 7 || textType === 8 ? 1 : undefined;
}
function masterLevel(ctx, textType, level) {
    const defaultLevels = ctx.masterStyles?.get(4);
    const defaults = defaultLevels?.[level] ?? defaultLevels?.[0];
    const baseType = baseTextType(textType);
    const baseLevels = baseType === undefined ? undefined : ctx.masterStyles?.get(baseType);
    const base = baseLevels?.[level] ?? baseLevels?.[0];
    const levels = ctx.masterStyles?.get(textType);
    const selected = levels?.[level] ?? levels?.[0];
    return {
        paragraph: mergeParagraph(mergeParagraph(mergeParagraph({ bulletEnabled: false }, defaults?.paragraph ?? {}), base?.paragraph ?? {}), selected?.paragraph ?? {}),
        character: mergeCharacter(mergeCharacter({ fontFamily: ctx.fonts[0]?.name ?? 'Arial', fontSize: 24, color: '#000000' }, ctx.defaultStyle ?? {}), mergeCharacter(mergeCharacter(defaults?.character ?? {}, base?.character ?? {}), selected?.character ?? {})),
    };
}
function resolveCharacter(style, ctx) {
    const s = { ...style };
    if (s.fontId !== undefined)
        s.fontFamily = fontName(s.fontId, ctx) ?? s.fontFamily;
    if (s.eastAsianFontId !== undefined)
        s.eastAsianFontFamily = fontName(s.eastAsianFontId, ctx) ?? s.eastAsianFontFamily;
    if (s.ansiFontId !== undefined)
        s.ansiFontFamily = fontName(s.ansiFontId, ctx) ?? s.ansiFontFamily;
    if (s.symbolFontId !== undefined)
        s.symbolFontFamily = fontName(s.symbolFontId, ctx) ?? s.symbolFontFamily;
    if (s.colorIndex !== undefined)
        s.color = rgb(ctx.colors[s.colorIndex] ?? 0);
    return s;
}
function resolveParagraph(style, firstStyle, ctx) {
    const s = mergeParagraph({}, style);
    if (s.firstLinePosition !== undefined)
        s.indent = s.firstLinePosition - (s.marginLeft ?? 0);
    if (s.bulletEnabled === false || (s.bulletEnabled === undefined && !s.bullet?.text))
        delete s.bullet;
    else if (s.bullet) {
        const bullet = s.bullet;
        bullet.text ||= '•';
        if (bullet.useFont === false) {
            delete bullet.fontId;
            delete bullet.fontFamily;
        }
        else if (bullet.fontId !== undefined)
            bullet.fontFamily = fontName(bullet.fontId, ctx) ?? bullet.fontFamily;
        if (bullet.useColor === false) {
            delete bullet.color;
            delete bullet.colorIndex;
        }
        else if (bullet.colorIndex !== undefined)
            bullet.color = rgb(ctx.colors[bullet.colorIndex] ?? 0);
        if (bullet.useSize === false) {
            delete bullet.size;
            delete bullet.sizePercent;
        }
        else if (bullet.sizePercent !== undefined)
            bullet.size = (firstStyle.fontSize ?? 24) * bullet.sizePercent;
    }
    return s;
}
const EAST_ASIAN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f\uff01-\uffef]/u;
/** Honor distinct ANSI and East Asian typefaces without changing UTF-16 source indices. */
function splitScriptRun(text, style, start, maxRuns) {
    if (maxRuns < 1)
        throw new PptError('LIMIT_TEXT_RUNS', 'Too many rendered text runs');
    if (!style.eastAsianFontFamily && !style.ansiFontFamily && !style.symbolFontFamily)
        return [{ text: text.replace(/\u000b/g, '\n'), style, sourceStart: start, sourceEnd: start + text.length }];
    const result = [];
    let previousFamily;
    let from = 0;
    for (let i = 0; i <= text.length;) {
        const code = text.codePointAt(i) ?? 0;
        const char = i === text.length ? undefined : String.fromCodePoint(code);
        const family = char === undefined ? undefined : code >= 0xf000 && code <= 0xf0ff && style.symbolFontFamily ? style.symbolFontFamily : EAST_ASIAN.test(char) ? style.eastAsianFontFamily ?? style.fontFamily : style.ansiFontFamily ?? style.fontFamily;
        if (i === 0)
            previousFamily = family;
        if (i === text.length || family !== previousFamily) {
            if (result.length >= maxRuns)
                throw new PptError('LIMIT_TEXT_RUNS', 'Too many rendered text runs');
            result.push({ text: text.slice(from, i).replace(/\u000b/g, '\n'), style: { ...style, fontFamily: previousFamily }, sourceStart: start + from, sourceEnd: start + i });
            from = i;
            previousFamily = family;
        }
        if (i === text.length)
            break;
        i += code > 0xffff ? 2 : 1;
    }
    return result;
}
/** Link range endpoints are UTF-16 offsets; TextRange.end is an exclusive cutoff. */
function parseHyperlinkRanges(records, length, ctx) {
    const ranges = [];
    let pending;
    for (const record of records) {
        // Instance 0 is a click; instance 1 is mouse-over and must not become a click.
        if (record.type === 0x0ff2 && record.instance === 0) {
            pending = undefined;
            const atom = record.children.find(child => child.type === 0x0ff3);
            if (!atom)
                continue;
            try {
                const c = new Cursor(ctx.bytes, atom);
                c.need(16);
                pending = interactionHref(atom, ctx.bytes, ctx.hyperlinkTargets);
            }
            catch (error) {
                failure(ctx, error, atom);
            }
        }
        else if (record.type === 0x0fdf && record.instance === 0) {
            const href = pending;
            pending = undefined;
            if (!href)
                continue;
            try {
                const c = new Cursor(ctx.bytes, record);
                const start = c.u32(), end = c.u32();
                if (start >= end || end > length)
                    throw new PptError('TEXT_HYPERLINK_RANGE', `Invalid hyperlink range ${start}..${end} for ${length} UTF-16 code units`, record.offset);
                if (ranges.length >= ctx.limits.maxRecords)
                    throw new PptError('LIMIT_TEXT_RUNS', 'Too many text hyperlink ranges', record.offset);
                ranges.push({ start, end, href, offset: record.offset });
            }
            catch (error) {
                failure(ctx, error, record);
            }
        }
    }
    ranges.sort((a, b) => a.start - b.start || a.offset - b.offset);
    const result = [];
    for (const range of ranges) {
        const previous = result[result.length - 1];
        if (previous && range.start < previous.end) {
            warn(ctx, 'TEXT_HYPERLINK_OVERLAP', 'Overlapping text hyperlink range was ignored', range.offset);
            continue;
        }
        result.push(range);
    }
    return result;
}
/** Keep metacharacters symbolic so a master can be reused for multiple slides. */
function parseFields(records, text, ctx) {
    const fields = [];
    const positions = new Set();
    for (const record of records) {
        const type = record.type === 4056 ? 'slideNumber' : record.type === 4087 || record.type === 4117 ? 'dateTime' : record.type === 4088 ? 'genericDate' : record.type === 4089 ? 'header' : record.type === 4090 ? 'footer' : undefined;
        if (!type)
            continue;
        try {
            const c = new Cursor(ctx.bytes, record);
            const position = c.u32();
            if (position > text.length)
                throw new PptError('TEXT_FIELD_POSITION', `Metacharacter position ${position} exceeds its text body`, record.offset);
            if (positions.has(position))
                throw new PptError('TEXT_FIELD_DUPLICATE', `More than one metacharacter occupies UTF-16 position ${position}`, record.offset);
            const field = { position, type };
            if (record.type === 4087) {
                c.need(4);
                field.format = c.view.getUint8(c.at);
                c.at += 4; // Three bytes after the format index are unused.
                if (field.format > 12)
                    warn(ctx, 'TEXT_DATE_FORMAT', `Unsupported date metacharacter format ${field.format}`, record.offset);
            }
            else if (record.type === 4117) {
                c.need(128);
                let format = '';
                for (let i = 0; i < 64; i++) {
                    const unit = c.view.getUint16(c.at + i * 2, true);
                    if (!unit)
                        break;
                    format += String.fromCharCode(unit);
                }
                field.format = format;
                c.at += 128;
            }
            if (c.at !== c.end)
                warn(ctx, 'TEXT_FIELD_LENGTH', 'Extra bytes in a text metacharacter record were ignored', c.at);
            if (position === text.length)
                warn(ctx, 'TEXT_FIELD_TERMINAL', 'Metacharacter refers to the implicit terminal paragraph mark', record.offset);
            if (fields.length >= ctx.limits.maxRecords)
                throw new PptError('LIMIT_TEXT_FIELDS', 'Too many text metacharacters', record.offset);
            positions.add(position);
            fields.push(field);
        }
        catch (error) {
            failure(ctx, error, record);
        }
    }
    return fields.sort((a, b) => a.position - b.position);
}
function parseMasterIndent(record, length, ctx) {
    const c = new Cursor(ctx.bytes, record), result = [];
    let covered = 0;
    try {
        while (covered < length) {
            if (result.length >= ctx.limits.maxRecords)
                throw new PptError('LIMIT_TEXT_RUNS', 'Too many master indent runs', c.at);
            const start = covered, count = c.u32();
            checkCount(count, covered, length, c.at - 4);
            const level = c.u16();
            covered += count;
            result.push({ start, end: covered, level: Math.min(level, 4), style: {} });
        }
    }
    catch (error) {
        failure(ctx, error, record);
    }
    return result;
}
function frameFromRecords(records, ctx) {
    const header = records.find(r => r.type === RT.TextHeaderAtom);
    const textRecord = records.find(r => r.type === RT.TextCharsAtom || r.type === RT.TextBytesAtom);
    if (!header && !textRecord)
        return undefined;
    let textType = 4;
    if (header) {
        try {
            textType = new Cursor(ctx.bytes, header).u32();
        }
        catch (error) {
            failure(ctx, error, header);
        }
    }
    const text = textRecord ? (textRecord.type === RT.TextCharsAtom ? decodeChars(textRecord, ctx) : decodeBytes(textRecord, ctx)) : '';
    const length = text.length + 1;
    if (length - 1 > ctx.limits.maxTextLength)
        throw new PptError('LIMIT_TEXT', 'Text body exceeds configured limit', textRecord?.offset);
    const styleRecord = records.find(r => r.type === RT.StyleTextPropAtom);
    const ranges = styleRecord ? parseRuns(styleRecord, length, ctx) : { paragraphs: [], characters: [] };
    const specialInfoRecord = records.find(r => r.type === RT.TextSpecInfoAtom);
    const specialInfo = specialInfoRecord ? parseSpecialInfo(specialInfoRecord, length, ctx) : [];
    const hyperlinks = parseHyperlinkRanges(records, length, ctx);
    const fields = parseFields(records, text, ctx);
    const indentRecord = records.find(r => r.type === 4002);
    if (!ranges.paragraphs.length && indentRecord)
        ranges.paragraphs = parseMasterIndent(indentRecord, length, ctx);
    let ruler;
    const rulerRecord = records.find(r => r.type === RT.TextRulerAtom);
    if (rulerRecord) {
        try {
            ruler = readRuler(rulerRecord, ctx);
        }
        catch (error) {
            failure(ctx, error, rulerRecord);
        }
    }
    const paragraphs = [];
    let pfIndex = 0, cfIndex = 0, siIndex = 0, linkIndex = 0, outputRunCount = 0, from = 0;
    // The implicit terminal CR ends the final paragraph but is not displayed.
    for (let to = 0; to <= text.length; to++) {
        if (to !== text.length && text.charCodeAt(to) !== 13)
            continue;
        if (paragraphs.length >= ctx.limits.maxRecords)
            throw new PptError('LIMIT_TEXT_PARAGRAPHS', 'Too many text paragraphs', textRecord?.offset);
        while (pfIndex + 1 < ranges.paragraphs.length && ranges.paragraphs[pfIndex].end <= from)
            pfIndex++;
        const pf = ranges.paragraphs[pfIndex];
        const level = pf && pf.start <= from && pf.end > from ? pf.level : 0;
        const inherited = masterLevel(ctx, textType, level);
        let paragraphStyle = mergeParagraph(inherited.paragraph, pf && pf.start <= from && pf.end > from ? pf.style : {});
        if (ruler)
            paragraphStyle = mergeParagraph(paragraphStyle, mergeParagraph(ruler.common, ruler.levels[level] ?? {}));
        const runs = [];
        let at = from;
        while (at < to) {
            while (cfIndex < ranges.characters.length && ranges.characters[cfIndex].end <= at)
                cfIndex++;
            const cf = ranges.characters[cfIndex];
            const active = cf && cf.start <= at && cf.end > at ? cf : undefined;
            while (siIndex < specialInfo.length && specialInfo[siIndex].end <= at)
                siIndex++;
            const si = specialInfo[siIndex];
            const activeSI = si && si.start <= at && si.end > at ? si : undefined;
            while (linkIndex < hyperlinks.length && hyperlinks[linkIndex].end <= at)
                linkIndex++;
            const link = hyperlinks[linkIndex];
            const activeLink = link && link.start <= at && link.end > at ? link : undefined;
            const end = Math.min(to, active?.end ?? (cf && cf.start > at ? cf.start : to), activeSI?.end ?? (si && si.start > at ? si.start : to), activeLink?.end ?? (link && link.start > at ? link.start : to));
            const style = resolveCharacter(mergeCharacter(mergeCharacter(inherited.character, active?.style ?? {}), activeSI?.style ?? {}), ctx);
            if (activeLink)
                style.hyperlink = activeLink.href;
            const scriptRuns = splitScriptRun(text.slice(at, end), style, at, ctx.limits.maxRecords - outputRunCount);
            outputRunCount += scriptRuns.length;
            for (const run of scriptRuns)
                runs.push(run);
            at = end;
        }
        // Empty paragraphs still need their font metrics and paragraph formatting.
        if (!runs.length) {
            if (++outputRunCount > ctx.limits.maxRecords)
                throw new PptError('LIMIT_TEXT_RUNS', 'Too many rendered text runs', textRecord?.offset);
            while (cfIndex < ranges.characters.length && ranges.characters[cfIndex].end <= from)
                cfIndex++;
            const cf = ranges.characters[cfIndex];
            while (siIndex < specialInfo.length && specialInfo[siIndex].end <= from)
                siIndex++;
            const si = specialInfo[siIndex];
            const style = mergeCharacter(mergeCharacter(inherited.character, cf && cf.start <= from ? cf.style : {}), si && si.start <= from ? si.style : {});
            runs.push({ text: '', style: resolveCharacter(style, ctx), sourceStart: from, sourceEnd: from });
        }
        paragraphs.push({ level, runs, style: resolveParagraph(paragraphStyle, runs[0].style, ctx) });
        from = to + 1;
    }
    for (const r of records) {
        if ([0x0fac, 0x0fb1, 0x0fb6].includes(r.type))
            warn(ctx, 'TEXT_EXTENDED_STYLE', `Extended text formatting record 0x${r.type.toString(16)} is preserved only as a diagnostic`, r.offset);
    }
    return { paragraphs, margins: { left: 9.6, right: 9.6, top: 4.8, bottom: 4.8 }, verticalAlignment: 'top', wrap: true, textType, sourceText: text, ...(fields.length ? { fields } : {}) };
}
/** Parse immediate sibling text bodies; callers keep slide boundaries separate. */
export function parseTextFrames(records, ctx) {
    const result = [];
    let body = [];
    const flush = () => {
        if (!body.length)
            return;
        const frame = frameFromRecords(body, ctx);
        if (frame)
            result.push(frame);
        body = [];
    };
    for (const record of records) {
        if (record.type === RT.TextHeaderAtom || record.type === RT.SlidePersistAtom)
            flush();
        if (record.type !== RT.SlidePersistAtom)
            body.push(record);
    }
    flush();
    return result;
}
export const parseTextBodies = parseTextFrames;
/** Read the document's default text language before resolving body/master runs. */
export function parseDefaultTextStyle(records, ctx) {
    for (const record of walkRecords(records)) {
        if (record.type !== 0x0fa9)
            continue;
        try {
            return readSI(new Cursor(ctx.bytes, record), ctx);
        }
        catch (error) {
            failure(ctx, error, record);
            return {};
        }
    }
    return {};
}
/** Master style entries remain unflattened so slide palette/paragraph overrides work. */
export function parseMasterTextStyles(records, ctx) {
    const result = new Map();
    for (const [type, levels] of ctx.masterStyles ?? [])
        result.set(type, levels.map(level => ({ paragraph: mergeParagraph({}, level.paragraph), character: { ...level.character } })));
    // Preserve only this type's explicit properties across the master chain.
    // Defaults/base styles are resolved by masterLevel when text is consumed.
    // Flattening them here would turn an ancestor's fallback into an apparent
    // derived override and hide a descendant's changed title/body base style.
    for (const record of walkRecords(records)) {
        if (record.type !== RT.TextMasterStyleAtom)
            continue;
        const levels = result.get(record.instance)?.slice() ?? [];
        try {
            const c = new Cursor(ctx.bytes, record);
            const count = c.u16();
            if (count > 5)
                throw new PptError('TEXT_MASTER_LEVELS', `Master style has ${count} levels; at most five are valid`, record.offset);
            for (let i = 0; i < count; i++) {
                const level = record.instance >= 5 ? c.u16() : i;
                if (level >= count)
                    throw new PptError('TEXT_MASTER_LEVEL', `Invalid master style level ${level}`, c.at - 2);
                const paragraph = readPF(c, ctx), character = readCF(c, ctx);
                const inherited = levels[level];
                levels[level] = { paragraph: mergeParagraph(inherited?.paragraph ?? {}, paragraph), character: mergeCharacter(inherited?.character ?? {}, character) };
            }
            if (c.at !== c.end)
                warn(ctx, 'TEXT_MASTER_TAIL', `${c.end - c.at} unused bytes in master text style`, c.at);
        }
        catch (error) {
            failure(ctx, error, record);
        }
        result.set(record.instance, levels);
    }
    return result;
}
export function parseFonts(records, bytes) {
    const fonts = [];
    let fontIndex = 0;
    for (const record of walkRecords(records)) {
        if (record.type !== RT.FontEntityAtom)
            continue;
        const id = fontIndex++;
        if (record.length < 68 || record.dataOffset < 0 || record.end > bytes.length)
            continue;
        const view = new DataView(bytes.buffer, bytes.byteOffset + record.dataOffset, record.length);
        let name = '';
        for (let i = 0; i < 32; i++) {
            const unit = view.getUint16(i * 2, true);
            if (!unit)
                break;
            name += String.fromCharCode(unit);
        }
        // FontIndexRef indexes FontCollection entries, not the record header instance.
        fonts.push({ id, name: name || 'Arial', charset: view.getUint8(64) });
    }
    return fonts;
}
