const graphemeSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
export function fontCss(style) {
    const family = (style.fontFamily ?? 'Arial').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${style.italic ? 'italic' : 'normal'} ${style.bold ? '700' : '400'} ${Math.max(.1, finite(style.fontSize, 24))}px "${family}",sans-serif`;
}
/** Real browser font metrics. No guessed widths are substituted when Canvas is unavailable. */
export function createCanvasTextMeasurer(owner = typeof document === 'undefined' ? undefined : document) {
    let canvas, context;
    try {
        canvas = owner ? owner.createElement('canvas') : new OffscreenCanvas(1, 1);
        context = canvas.getContext('2d');
    }
    catch {
        return undefined;
    }
    if (!context?.measureText)
        return undefined;
    const ctx = context, cache = new Map();
    return { measure(text, style) {
            const font = fontCss(style), spacing = finite(style.letterSpacing, 0), key = `${font}\0${spacing}\0${text}`;
            const existing = cache.get(key);
            if (existing)
                return existing;
            ctx.font = font;
            ctx.textBaseline = 'alphabetic';
            ctx.direction = 'ltr';
            const nativeSpacing = 'letterSpacing' in ctx;
            if (nativeSpacing)
                ctx.letterSpacing = `${spacing}px`;
            const m = ctx.measureText(text || 'Mg'), size = Math.max(.1, finite(style.fontSize, 24));
            // Native Canvas letter spacing already includes tracking. Even in older
            // browsers, zero tracking needs no second grapheme pass over long text.
            let count = 0;
            if (!nativeSpacing && spacing !== 0) {
                if (graphemeSegmenter) {
                    for (const _ of graphemeSegmenter.segment(text))
                        count++;
                }
                else {
                    for (const _ of text)
                        count++;
                }
            }
            // Canvas exposes ink/font bounds, not the font's complete typographic
            // baseline advance (including lineGap). Do not pass those bounds as a
            // lineHeight: layout uses its diagnosed nominal-em fallback instead.
            const result = { width: text ? Math.max(0, m.width + (nativeSpacing ? 0 : count * spacing)) : 0, ascent: finite(m.fontBoundingBoxAscent, finite(m.actualBoundingBoxAscent, size * .8)), descent: finite(m.fontBoundingBoxDescent, finite(m.actualBoundingBoxDescent, size * .2)) };
            if (cache.size >= 12000)
                cache.clear();
            cache.set(key, result);
            return result;
        }, clear() { cache.clear(); } };
}
