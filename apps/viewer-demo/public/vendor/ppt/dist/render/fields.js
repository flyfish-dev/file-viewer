const lcidLocales = { 0x0409: 'en-US', 0x0809: 'en-GB', 0x0C09: 'en-AU', 0x0411: 'ja-JP', 0x0404: 'zh-TW', 0x0804: 'zh-CN', 0x1004: 'zh-SG', 0x1404: 'zh-MO', 0x0C04: 'zh-HK', 0x0412: 'ko-KR', 0x0401: 'ar-SA', 0x040D: 'he-IL', 0x041D: 'sv-SE', 0x041E: 'th-TH', 0x042A: 'vi-VN', 0x0439: 'hi-IN', 0x045A: 'syr-SY' };
const american = [0, 1, 8, 2, 5, 9, 10, 11, 12, 15, 16, 13, 14];
const chineseClock = ['yyyy年M月d日h时m分', 'yyyy年M月d日星期Wh时m分s秒', 'HH:mm', 'HH:mm:ss', 'AMPMh时m分', 'AMPMh时m分s秒'];
/** [MS-PPT] 2.9.50 maps the presentation format ID into [MS-OSHARED] indices. */
const formatMaps = {
    'en-us': american, 'en-gb': [0, 1, 'd MMMM, yyy', 2, 5, 9, 10, 11, 12, 15, 16, 13, 14], 'en-au': [0, 1, 'd MMMM, yyy', 2, 5, 9, 10, 11, 12, 15, 16, 13, 14],
    'zh-cn': [0, 1, 2, 2, 4, 9, 5, ...chineseClock], 'zh-sg': [0, 1, 3, 2, 4, 9, 5, ...chineseClock], 'zh-hk': [0, 1, 3, 2, 4, 9, 5, ...chineseClock], 'zh-mo': [0, 1, 3, 2, 4, 9, 5, ...chineseClock],
    'zh-tw': [0, 1, 3, 7, 12, 9, 10, 4, 11, 'HH:mm', 'HH:mm:ss', 'H:mm AMPM', 'H:mm:ss AMPM'],
    'ja-jp': [4, 8, 7, 3, 0, 9, 5, 11, 12, 'HH:mm', 'HH:mm:ss', 15, 16],
    'ko-kr': [0, 1, 6, 3, 4, 10, 7, 12, 11, 'HH:mm', 'HH:mm:ss', 13, 14],
    'ar-sa': [0, 1, 2, 3, 4, 5, 8, 7, 8, 1, 10, 11, 5], 'he-il': [0, 1, 2, 6, 11, 5, 12, 7, 8, 9, 1, 11, 6],
    'sv-se': [0, 1, 3, 2, 7, 9, 10, 11, 12, 15, 16, 13, 14], 'th-th': [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14],
    'vi-vn': [0, 1, 2, 3, 5, 6, 10, 11, 12, 13, 14, 15, 16], 'hi-in': [1, 2, 3, 5, 7, 11, 13, 0, 1, 5, 10, 11, 14], 'syr-sy': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};
function warning(ctx, code, message) { if (!ctx.warnings.some(d => d.code === code && d.shapeId === ctx.shapeId))
    ctx.warnings.push({ code, severity: 'warning', message, slideId: ctx.slide.id, shapeId: ctx.shapeId }); }
function localeOf(style, ctx) {
    const language = style.language != null && style.language > 0x0400 ? style.language : style.alternateLanguage != null && style.alternateLanguage > 0x0400 ? style.alternateLanguage : undefined;
    const locale = ctx.options.fieldLocale ?? (language == null ? undefined : lcidLocales[language]);
    if (!locale) {
        warning(ctx, 'DATE_LOCALE_FALLBACK', 'A datetime field has no supported source language; en-US formatting is used. Set fieldLocale to override it.');
        return 'en-US';
    }
    try {
        return Intl.getCanonicalLocales(locale)[0] ?? 'en-US';
    }
    catch {
        warning(ctx, 'DATE_LOCALE_INVALID', 'The requested date locale is invalid; en-US formatting is used');
        return 'en-US';
    }
}
function formatter(date, locale, options) { return new Intl.DateTimeFormat(locale, options).format(date); }
/** The common Windows date-picture symbols. Unknown era/numeral forms stay explicit. */
function patternDate(pattern, date, locale) {
    if (pattern.length > 256)
        return undefined;
    const p = (value, width = 2) => String(value).padStart(width, '0'), year = date.getFullYear(), hour = date.getHours();
    const part = (options, name) => new Intl.DateTimeFormat(locale, options).formatToParts(date).find(p => p.type === name)?.value ?? '';
    const period = () => part({ hour: 'numeric', hour12: true }, 'dayPeriod');
    const values = { yyyy: () => p(year, 4), yyy: () => p(year, 3), yy: () => p(year % 100), y: () => String(year % 100), MMMM: () => formatter(date, locale, { month: 'long' }), MMM: () => formatter(date, locale, { month: 'short' }), MM: () => p(date.getMonth() + 1), M: () => String(date.getMonth() + 1), dddd: () => formatter(date, locale, { weekday: 'long' }), ddd: () => formatter(date, locale, { weekday: 'short' }), dd: () => p(date.getDate()), d: () => String(date.getDate()), HH: () => p(hour), H: () => String(hour), hh: () => p(hour % 12 || 12), h: () => String(hour % 12 || 12), mm: () => p(date.getMinutes()), m: () => String(date.getMinutes()), ss: () => p(date.getSeconds()), s: () => String(date.getSeconds()), AMPM: period, 'AM/PM': period, 'am/pm': period, tt: period, t: () => period().slice(0, 1), W: () => ['日', '一', '二', '三', '四', '五', '六'][date.getDay()], ggg: () => new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long' }).formatToParts(date).find(p => p.type === 'era')?.value ?? '', e: () => new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { year: 'numeric' }).formatToParts(date).find(p => p.type === 'year')?.value ?? '' };
    const tokens = /'(?:[^']|'')*'|"[^"]*"|AM\/PM|am\/pm|AMPM|yyyy|yyy|yy|y|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|tt|t|ggg|e|W|[^A-Za-z]/g;
    let result = '', at = 0;
    for (const match of pattern.matchAll(tokens)) {
        if (match.index !== at)
            return undefined;
        const token = match[0];
        at += token.length;
        result += token[0] === "'" || token[0] === '"' ? token.slice(1, -1).replace(/''/g, "'") : values[token]?.() ?? token;
    }
    return at === pattern.length ? result : undefined;
}
function indexedDate(index, date, locale, ctx) {
    const key = locale.toLowerCase(), short = () => formatter(date, locale, { year: 'numeric', month: 'numeric', day: 'numeric' }), long = () => formatter(date, locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    if (index === 0)
        return short();
    if (index === 1)
        return long();
    if (key.startsWith('zh') && key !== 'zh-tw') {
        const patterns = { 2: 'yyyy年M月d日星期W', 3: 'yyyy年M月d日', 4: 'yyyy/M/d', 5: 'yy.M.d', 6: 'yyyy年M月d日星期W', 7: 'yyyy年M月d日', 8: 'yyyy年M月d日星期W', 9: 'yyyy年M月', 10: 'yyyy年M月', 11: 'h时m分s秒', 12: 'h时m分', 13: 'H时m分', 14: 'h时m分', 15: 'AMPMh时m分', 16: 'AMPMh时m分' };
        return patterns[index] ? patternDate(patterns[index], date, locale) : undefined;
    }
    if (key === 'ja-jp') {
        const patterns = { 2: 'ggge年M月d日(ddd)', 3: 'yyyy年M月d日', 4: 'yyyy/M/d', 7: 'ggge年M月d日', 8: 'yyyy年M月d日(ddd)', 9: 'ggge年M月', 10: 'yyyy年M月', 11: 'yy/M/d H時m分', 12: 'yy/M/d H時m分s秒', 13: 'AMPMh時m分', 14: 'AMPMh時m分s秒', 15: 'H時m分', 16: 'H時m分s秒', 17: 'ggge年M月d日 dddd' };
        return patterns[index] ? patternDate(patterns[index], date, locale) : undefined;
    }
    // Chinese-era numerals and calendar-specific locale rules are not silently treated as Gregorian English.
    if (['zh-tw', 'ko-kr', 'th-th', 'hi-in'].includes(key)) {
        warning(ctx, 'DATE_FORMAT_APPROXIMATED', 'This datetime locale uses calendar-specific rules that are approximated with the browser locale formatter');
    }
    const pattern = (value) => patternDate(value, date, locale);
    if (index === 2)
        return formatter(date, locale, { year: 'numeric', month: 'long', day: 'numeric' });
    if (index === 3)
        return formatter(date, locale, { year: '2-digit', month: 'numeric', day: 'numeric' });
    if (index === 4)
        return pattern('yyyy-MM-dd');
    if (index === 5) {
        const first = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date).find(p => p.type === 'year' || p.type === 'month');
        return pattern(first?.type === 'year' ? 'yy-MMM-d' : 'd-MMM-yy');
    }
    if (index === 6) {
        const separator = short().includes('/') ? '.' : '/';
        return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date).filter(p => ['year', 'month', 'day'].includes(p.type)).map(p => p.value).join(separator);
    }
    if (index === 7)
        return formatter(date, locale, { year: '2-digit', month: 'short', day: 'numeric' });
    if (index === 8)
        return pattern(key === 'he-il' ? 'd MMMM, yyyy' : 'd MMMM yyyy');
    if (index === 9)
        return formatter(date, locale, { year: '2-digit', month: 'long' });
    if (index === 10)
        return pattern('MMM-yy');
    if (index === 11 || index === 12)
        return `${short()} ${formatter(date, locale, { hour: 'numeric', minute: '2-digit', ...(index === 12 ? { second: '2-digit' } : {}), hour12: true })}`;
    if (index === 13 || index === 14)
        return pattern(index === 13 ? 'h:mm AMPM' : 'h:mm:ss AMPM');
    if (index === 15 || index === 16)
        return pattern(index === 15 ? 'HH:mm' : 'HH:mm:ss');
    return undefined;
}
function dateValue(format, style, ctx) {
    if (!Number.isFinite(ctx.date.getTime())) {
        warning(ctx, 'FIELD_DATE_INVALID', 'fieldDate is not a valid date; the original field marker is retained');
        return undefined;
    }
    const locale = localeOf(style, ctx);
    let value;
    if (typeof format === 'string')
        value = patternDate(format, ctx.date, locale);
    else {
        const index = format === 13 ? 0 : format ?? 0, map = formatMaps[locale.toLowerCase()] ?? american;
        if (!formatMaps[locale.toLowerCase()])
            warning(ctx, 'DATE_FORMAT_APPROXIMATED', 'This date language has no exact format-ID table in this build; the default mapping is used with the selected locale');
        const mapped = map[index];
        if (typeof mapped === 'string')
            value = patternDate(mapped, ctx.date, locale);
        else if (mapped != null)
            value = indexedDate(mapped, ctx.date, locale, ctx);
    }
    if (value == null)
        warning(ctx, 'DATE_FORMAT_UNSUPPORTED', 'The datetime picture or calendar-specific format is not supported; the original field marker is retained');
    return value;
}
function fieldValue(field, style, ctx) {
    if (ctx.slide.suppressHeaderFooter && field.type !== 'dateTime')
        return '';
    const hf = ctx.slide.headersFooters;
    switch (field.type) {
        case 'slideNumber': return String(ctx.slide.displayNumber ?? ctx.slide.index + 1);
        case 'header': return hf?.header ?? '';
        case 'footer': return hf?.footer ?? '';
        case 'genericDate':
            if (hf?.useUserDate)
                return hf.userDate ?? '';
            if (hf?.useCurrentDate)
                return dateValue(hf.format, style, ctx);
            return '';
        case 'dateTime': return dateValue(field.format, style, ctx);
    }
}
export function headerFooterVisible(type, slide) {
    if (type == null || ![7, 8, 9, 10].includes(type))
        return true;
    if (slide.suppressHeaderFooter)
        return false;
    const hf = slide.headersFooters;
    return type === 7 ? !!hf?.showDate : type === 8 ? !!hf?.showSlideNumber : type === 9 ? !!hf?.showFooter : !!hf?.showHeader;
}
/** Replaces one source UTF-16 marker in transient runs, never modifying source text or offsets. */
export function resolveTextFields(frame, ctx, placeholderType) {
    if (!frame.fields?.length) {
        if (placeholderType != null && [7, 8, 9, 10].includes(placeholderType) && frame.paragraphs.length) {
            warning(ctx, 'HEADER_FOOTER_FIELD_MISSING', 'A header/footer placeholder has no metacharacter record; its text is recovered from the current slide settings');
            const first = frame.paragraphs[0], run = first.runs[0], type = placeholderType === 7 ? 'genericDate' : placeholderType === 8 ? 'slideNumber' : placeholderType === 9 ? 'footer' : 'header';
            const text = fieldValue({ position: 0, type }, run?.style ?? {}, ctx);
            if (text != null)
                return { ...frame, paragraphs: [{ ...first, runs: [{ ...(run ?? { style: {} }), text }] }] };
        }
        return frame;
    }
    const fields = [...frame.fields].sort((a, b) => a.position - b.position);
    let cursor = 0, nextOffset = 0;
    const paragraphs = frame.paragraphs.map(paragraph => { const runs = paragraph.runs.map(run => { const start = run.sourceStart ?? nextOffset, end = run.sourceEnd ?? start + run.text.length; nextOffset = end; while (cursor < fields.length && fields[cursor].position < start)
        cursor++; let from = 0, changed = false, result = ''; while (cursor < fields.length && fields[cursor].position < end) {
        const field = fields[cursor++], relative = field.position - start;
        if (relative < from || relative >= run.text.length)
            continue;
        const replacement = fieldValue(field, run.style, ctx);
        if (replacement != null) {
            result += run.text.slice(from, relative) + replacement;
            from = relative + 1;
            changed = true;
        }
    } return changed ? { ...run, text: result + run.text.slice(from) } : run; }); nextOffset++; return { ...paragraph, runs }; });
    return { ...frame, paragraphs };
}
