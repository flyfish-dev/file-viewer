const closes = /^[\]\)\}、。，．！？：；％‰〉》」』】〕〗〙〛’”!?;:,%]/u;
const opens = /[\[\(\{〈《「『【〔〖〘〚‘“]$/u;
const cjk = /[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef\u{20000}-\u{3134f}]/u;
const breakableSpace = /^[ \u1680\u2000-\u2006\u2008-\u200a\u205f\u3000]+$/u;
const breakAfter = /[ \t\u1680\u2000-\u2006\u2008-\u200a\u205f\u3000\-\u2010/]$/u;
const nonBreaking = /[\u00a0\u202f\u2060\ufeff]/u;
const hangingPunctuation = /^[、。，．！？：；〉》」』】〕〗〙〛’”]$/u;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined;
function* graphemes(text) { if (segmenter) {
    for (const value of segmenter.segment(text))
        yield value.segment;
}
else {
    yield* text;
} }
const numeric = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
/** Unspecified format bits retain the ordinary word/kinsoku layout defaults. */
export function paragraphWrapFlags(style) { const mask = (style.wrapFlagsMask ?? (style.wrapFlags === undefined ? 0 : 7)) & 7; return ((style.wrapFlags ?? 0) & mask) | (3 & ~mask); }
/** A nonpositive saved step cannot define a repeating grid; use the fallback grid. */
export function paragraphDefaultTabSize(style) { const value = numeric(style.defaultTabSize, 48); return value > 0 ? value : 48; }
function scaled(style, scale) { return { ...style, fontSize: Math.max(.1, numeric(style.fontSize, 24) * scale), letterSpacing: style.letterSpacing == null ? undefined : style.letterSpacing * scale }; }
function metric(measurer, text, style) { const value = measurer.measure(text, style); return { width: Math.max(0, numeric(value.width)), ascent: Math.max(0, numeric(value.ascent, numeric(style.fontSize, 24) * .8)), descent: Math.max(0, numeric(value.descent, numeric(style.fontSize, 24) * .2)), ...(Number.isFinite(value.lineHeight) && value.lineHeight > 0 ? { lineHeight: value.lineHeight } : {}) }; }
function tokens(paragraph, scale, measurer) {
    const out = [];
    let previous = '';
    const needsDecimal = paragraph.style.tabStops?.some(t => t.alignment === 'decimal') ?? false;
    const flags = paragraphWrapFlags(paragraph.style), characterBreaks = !(flags & 2), kinsoku = !!(flags & 1), splitCharacters = characterBreaks || paragraph.style.alignment === 'distributed';
    for (const run of paragraph.runs) {
        const style = scaled(run.style, scale), eastAsianStyle = style.eastAsianFontFamily ? { ...style, fontFamily: style.eastAsianFontFamily } : style;
        let buffer = '';
        const push = (text, kind) => {
            if (!text && kind === 'text')
                return;
            const selected = cjk.test(text) ? eastAsianStyle : style;
            const m = metric(measurer, kind === 'text' || kind === 'space' ? text : '', selected);
            const breakBefore = !!previous && (characterBreaks || breakAfter.test(previous) || cjk.test(previous) || cjk.test(text)) && (!kinsoku || !closes.test(text) && !opens.test(previous)) && !nonBreaking.test(previous.slice(-1)) && !nonBreaking.test(text.slice(0, 1));
            const comma = [0x0407, 0x040c, 0x0410, 0x0419, 0x0416, 0x0816, 0x040a, 0x0c0a].includes(selected.language ?? selected.alternateLanguage ?? 0), decimalAt = needsDecimal ? text.indexOf(comma ? ',' : '.') : -1;
            out.push({ text, style: selected, kind, ...m, breakBefore, hasDecimal: decimalAt >= 0, decimalPrefix: decimalAt >= 0 ? metric(measurer, text.slice(0, decimalAt), selected).width : m.width });
            previous = text;
        };
        const flush = () => { if (buffer) {
            push(buffer, 'text');
            buffer = '';
        } };
        for (const char of graphemes(run.text)) {
            if (char === '\t' || char === '\n' || char === '\r' || char === '\u000b') {
                flush();
                push(char, char === '\t' ? 'tab' : 'break');
            }
            else if (breakableSpace.test(char)) {
                flush();
                push(char, 'space');
            }
            else if (splitCharacters || cjk.test(char) || closes.test(char) || opens.test(char) || char === '-' || char === '\u2010' || char === '/') {
                flush();
                push(char, 'text');
            }
            else
                buffer += char;
        }
        flush();
    }
    return out;
}
function layoutOnce(frame, options, scale) {
    const innerWidth = Math.max(0, options.width - frame.margins.left - frame.margins.right), innerHeight = Math.max(0, options.height - frame.margins.top - frame.margins.bottom), lines = [];
    let y = 0, overflowX = false, lineMetricsApproximate = false;
    const spacingScale = Math.max(.01, numeric(options.lineSpacingScale, 1));
    frame.paragraphs.forEach((paragraph, paragraphIndex) => {
        const s = paragraph.style, firstStyle = scaled(paragraph.runs[0]?.style ?? {}, scale), firstMetrics = metric(options.measurer, 'Mg', firstStyle), wrapFlags = paragraphWrapFlags(s);
        const margin = numeric(s.marginLeft), indent = numeric(s.indent), bullet = !!s.bullet && s.bulletEnabled !== false;
        // Sort once per paragraph. Finding the next tab is logarithmic, including on long rows.
        const tabs = (s.tabStops ?? []).map(t => ({ alignment: t.alignment, position: t.position + (t.origin === 'paragraph' ? margin : 0) })).filter(t => Number.isFinite(t.position)).sort((a, b) => a.position - b.position);
        const defaultTab = paragraphDefaultTabSize(s);
        const nextTab = (x) => { let lo = 0, hi = tabs.length; while (lo < hi) {
            const mid = lo + Math.floor((hi - lo) / 2);
            if (tabs[mid].position <= x + .01)
                lo = mid + 1;
            else
                hi = mid;
        } return tabs[lo] ?? { position: (Math.floor(Math.max(0, x) / defaultTab) + 1) * defaultTab, alignment: 'left' }; };
        const tabOffset = (alignment, width, decimalWidth) => alignment === 'right' ? width : alignment === 'center' ? width / 2 : alignment === 'decimal' ? decimalWidth : 0;
        const parts = tokens(paragraph, scale, options.measurer);
        let current = [], first = true, lastHeight = firstMetrics.lineHeight ?? firstStyle.fontSize, lastBreak = -1, emptyMetrics = firstMetrics, emptyStyle = firstStyle;
        const startX = () => margin + (first && !bullet ? indent : 0);
        // A growing right/center/decimal field updates its right edge in constant time.
        let cursorX = startX(), field;
        const advanceCursor = (token) => { if (token.kind === 'tab') {
            field = { left: cursorX, tab: nextTab(cursorX), width: 0, decimalWidth: 0, decimalFound: false };
            cursorX = Math.max(cursorX, field.tab.position);
            return;
        } if (!field) {
            cursorX += token.width;
            return;
        } field.width += token.width; if (!field.decimalFound) {
            field.decimalWidth += token.decimalPrefix;
            field.decimalFound = token.hasDecimal;
        } cursorX = Math.max(field.left, field.tab.position - tabOffset(field.tab.alignment, field.width, field.decimalWidth)) + field.width; };
        const rebuildCursor = () => { cursorX = startX(); field = undefined; lastBreak = -1; for (let i = 0; i < current.length; i++) {
            current[i].hanging = false;
            if (i > 0 && current[i].breakBefore)
                lastBreak = i;
            advanceCursor(current[i]);
        } };
        const arrange = (items, firstLine) => {
            let x = margin + (firstLine && !bullet ? indent : 0);
            const result = [];
            if (firstLine && bullet && s.bullet) {
                const bs = scaled({ ...paragraph.runs[0]?.style, fontFamily: s.bullet.fontFamily ?? paragraph.runs[0]?.style.fontFamily, fontSize: s.bullet.size ?? numeric(paragraph.runs[0]?.style.fontSize, 24) * numeric(s.bullet.sizePercent, 1), color: s.bullet.color ?? paragraph.runs[0]?.style.color, colorIndex: s.bullet.color !== undefined ? s.bullet.colorIndex : s.bullet.colorIndex ?? paragraph.runs[0]?.style.colorIndex }, scale), m = metric(options.measurer, s.bullet.text, bs);
                result.push({ text: s.bullet.text, style: bs, x: margin + indent, ...m, bullet: true });
            }
            for (let i = 0; i < items.length; i++) {
                const token = items[i];
                if (token.kind === 'tab') {
                    let width = 0, decimalWidth = 0, foundDecimal = false;
                    for (let j = i + 1; j < items.length && items[j].kind !== 'tab'; j++) {
                        const next = items[j];
                        width += next.width;
                        if (!foundDecimal) {
                            decimalWidth += next.decimalPrefix;
                            foundDecimal = next.hasDecimal;
                        }
                    }
                    const tab = nextTab(x);
                    x = Math.max(x, tab.position - tabOffset(tab.alignment, width, decimalWidth));
                    continue;
                }
                result.push({ text: token.text, style: token.style, x, width: token.width, ascent: token.ascent, descent: token.descent, ...(token.lineHeight === undefined ? {} : { lineHeight: token.lineHeight }), ...(token.hanging ? { hanging: true } : {}) });
                x += token.width;
            }
            return result;
        };
        const emit = (items, last) => {
            let end = items.length;
            while (end > 0 && items[end - 1].kind === 'space')
                end--;
            items = items.slice(0, end);
            const fragments = arrange(items, first), left = margin + (first && !bullet ? indent : 0);
            let right = left, ascent = fragments.length ? 0 : emptyMetrics.ascent, descent = fragments.length ? 0 : emptyMetrics.descent, spaces = 0, normalAdvance = fragments.length ? 0 : emptyMetrics.lineHeight ?? emptyStyle.fontSize, missingAdvance = !fragments.length && emptyMetrics.lineHeight === undefined;
            for (const fragment of fragments) {
                const shift = (fragment.style.fontSize ?? 24) * numeric(fragment.style.baseline) / 100;
                ascent = Math.max(ascent, fragment.ascent + shift);
                descent = Math.max(descent, fragment.descent - shift);
                normalAdvance = Math.max(normalAdvance, fragment.lineHeight ?? fragment.style.fontSize ?? 24);
                missingAdvance ||= fragment.lineHeight === undefined;
                if (!fragment.bullet) {
                    right = Math.max(right, fragment.x + (fragment.hanging ? 0 : fragment.width));
                    if (breakableSpace.test(fragment.text))
                        spaces++;
                }
            }
            // MS-PPT ParaSpacing percentages apply to normal text-line advance, not
            // the global font glyph bounds. The latter can be much taller than an em.
            const height = (s.lineHeightPoints != null ? Math.max(.1, s.lineHeightPoints * scale) : normalAdvance * Math.max(.1, numeric(s.lineHeight, 1.15))) * spacingScale;
            if (s.lineHeightPoints == null && missingAdvance)
                lineMetricsApproximate = true;
            if (first)
                y += Math.max(0, s.spaceBefore != null ? s.spaceBefore * scale : numeric(s.spaceBeforePercent) * height);
            const available = innerWidth - left, extent = right - left;
            let offset = 0;
            if (s.alignment === 'right')
                offset = Math.max(0, available - extent);
            else if (s.alignment === 'center')
                offset = Math.max(0, (available - extent) / 2);
            if (s.alignment === 'distributed' && !items.some(t => t.kind === 'tab') && available > extent) {
                const body = fragments.filter(f => !f.bullet && !f.hanging);
                if (body.length > 1) {
                    const extra = (available - extent) / (body.length - 1);
                    let advance = 0, index = 0;
                    for (const fragment of fragments) {
                        if (fragment.bullet)
                            continue;
                        fragment.x += advance;
                        if (!fragment.hanging && ++index < body.length)
                            advance += extra;
                    }
                }
            }
            else if (s.alignment === 'justify' && !last && !items.some(t => t.kind === 'tab') && spaces && available > extent) {
                const extra = (available - extent) / spaces;
                let advance = 0;
                for (const fragment of fragments) {
                    if (fragment.bullet)
                        continue;
                    fragment.x += advance;
                    if (breakableSpace.test(fragment.text)) {
                        fragment.width += extra;
                        advance += extra;
                    }
                }
            }
            else if (offset)
                for (const fragment of fragments)
                    fragment.x += offset;
            if (right > innerWidth + .1)
                overflowX = true;
            const baseline = y + (height - ascent - descent) / 2 + ascent;
            for (const fragment of fragments) {
                const h = fragment.ascent + fragment.descent;
                fragment.baseline = s.fontAlignment === 1 ? y + fragment.ascent : s.fontAlignment === 2 ? y + (height - h) / 2 + fragment.ascent : s.fontAlignment === 3 ? y + height - fragment.descent : baseline;
            }
            lines.push({ fragments, y, height, baseline, paragraphIndex, width: Math.max(0, right - left), last });
            y += height;
            lastHeight = height;
            first = false;
        };
        for (const token of parts) {
            if (token.kind === 'break') {
                emptyMetrics = token;
                emptyStyle = token.style;
                emit(current, false);
                current = [];
                rebuildCursor();
                continue;
            }
            if (current.length && token.breakBefore)
                lastBreak = current.length;
            current.push(token);
            advanceCursor(token);
            if (frame.wrap && token.kind !== 'space' && token.kind !== 'tab')
                while (cursorX > innerWidth + .1) {
                    // Only one closing CJK grapheme may hang, and only when the preceding text
                    // fits. A long word cannot disappear behind this opt-in overflow policy.
                    if ((wrapFlags & 4) && hangingPunctuation.test(token.text) && current.length > 1 && cursorX - token.width <= innerWidth + .1) {
                        token.hanging = true;
                        break;
                    }
                    if (lastBreak <= 0)
                        break;
                    const rest = current.slice(lastBreak);
                    emit(current.slice(0, lastBreak), false);
                    current = rest;
                    rebuildCursor();
                }
        }
        emit(current, true);
        y += Math.max(0, s.spaceAfter != null ? s.spaceAfter * scale : numeric(s.spaceAfterPercent) * lastHeight);
    });
    const requiredHeight = y + frame.margins.top + frame.margins.bottom, overflowY = y > innerHeight + .1;
    const actualHeight = options.autofit === 'resize' ? Math.max(options.height, requiredHeight) : options.height;
    const free = Math.max(0, actualHeight - frame.margins.top - frame.margins.bottom - y), offset = frame.verticalAlignment === 'middle' ? free / 2 : frame.verticalAlignment === 'bottom' ? free : 0;
    for (const line of lines) {
        line.y += frame.margins.top + offset;
        line.baseline += frame.margins.top + offset;
        for (const fragment of line.fragments) {
            fragment.x += frame.margins.left;
            if (fragment.baseline !== undefined)
                fragment.baseline += frame.margins.top + offset;
        }
    }
    return { lines, width: options.width, height: actualHeight, requiredHeight, scale, overflowX, overflowY: options.autofit === 'resize' ? false : overflowY, lineMetricsApproximate };
}
/** Horizontal layout: measured words/graphemes, explicit tab alignment, hanging bullets and bounded autofit. */
export function layoutText(frame, options) {
    const initial = Math.min(1, Math.max(.05, numeric(options.scale, 1)));
    let result = layoutOnce(frame, options, initial);
    if (options.autofit !== 'shrink' || !result.overflowX && !result.overflowY)
        return result;
    let low = Math.min(initial, Math.max(.05, numeric(options.minScale, .2))), high = initial, best = layoutOnce(frame, options, low);
    if (best.overflowX || best.overflowY)
        return best;
    for (let i = 0; i < 10; i++) {
        const middle = (low + high) / 2, candidate = layoutOnce(frame, options, middle);
        if (candidate.overflowX || candidate.overflowY)
            high = middle;
        else {
            low = middle;
            best = candidate;
        }
    }
    return best;
}
