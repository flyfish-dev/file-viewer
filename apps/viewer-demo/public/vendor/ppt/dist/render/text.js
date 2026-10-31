import { color, cssFont, escapeXml, finite, linkUrl, n } from './safe.js';
import { createCanvasTextMeasurer } from '../layout/measure.js';
import { layoutText, paragraphDefaultTabSize, paragraphWrapFlags } from '../layout/text-layout.js';
function schemeColor(value, index, colors) { const rgb = index == null ? undefined : colors[index]; return rgb == null ? value : `#${[rgb & 255, (rgb >>> 8) & 255, (rgb >>> 16) & 255].map(v => v.toString(16).padStart(2, '0')).join('')}`; }
/** CFStyle stores effect presence, not a complete blur/light geometry. */
function textEffects(style) {
    const size = Math.max(.1, finite(style.fontSize, 24)), effects = [];
    if (style.shadow) {
        const offset = Math.max(.5, size / 16);
        effects.push({ dx: offset, dy: offset, color: '#000000', opacity: .45 });
    }
    if (style.emboss) {
        const offset = Math.max(.5, size / 32);
        effects.push({ dx: -offset, dy: -offset, color: '#ffffff', opacity: .8 }, { dx: offset, dy: offset, color: '#000000', opacity: .5 });
    }
    return effects;
}
function runHtml(run, colors, fontAlignment) {
    const s = run.style, styles = [];
    if (s.fontFamily)
        styles.push(`font-family:${cssFont(s.fontFamily)}`);
    if (s.fontSize != null)
        styles.push(`font-size:${n(Math.max(.1, finite(s.fontSize, 24)))}px`);
    const resolvedColor = schemeColor(s.color, s.colorIndex, colors);
    if (resolvedColor)
        styles.push(`color:${color(resolvedColor)}`);
    if (s.bold != null)
        styles.push(`font-weight:${s.bold ? '700' : '400'}`);
    if (s.italic != null)
        styles.push(`font-style:${s.italic ? 'italic' : 'normal'}`);
    const decoration = [s.underline ? 'underline' : '', s.strike ? 'line-through' : ''].filter(Boolean).join(' ');
    if (decoration)
        styles.push(`text-decoration:${decoration}`);
    if (s.baseline)
        styles.push(`vertical-align:${n(s.baseline)}%`);
    else if (fontAlignment != null && fontAlignment >= 1 && fontAlignment <= 3)
        styles.push(`vertical-align:${['baseline', 'top', 'middle', 'bottom'][fontAlignment]}`);
    if (s.letterSpacing != null)
        styles.push(`letter-spacing:${n(s.letterSpacing)}px`);
    const effects = textEffects(s);
    if (effects.length)
        styles.push(`text-shadow:${effects.map(effect => `${n(effect.dx)}px ${n(effect.dy)}px 0 ${effect.color}${Math.round(effect.opacity * 255).toString(16).padStart(2, '0')}`).join(',')}`);
    const escaped = (text) => escapeXml(text).replace(/\r\n|\r|\n|\u000b/g, '<br/>');
    const content = s.eastAsianFontFamily ? run.text.split(/([\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef\u{20000}-\u{3134f}]+)/u).map((part, i) => i % 2 ? `<span style="${escapeXml(`font-family:${cssFont(s.eastAsianFontFamily)}`)}">${escaped(part)}</span>` : escaped(part)).join('') : escaped(run.text);
    const html = `<span style="${escapeXml(styles.join(';'))}">${content}</span>`;
    const url = linkUrl(s.hyperlink);
    return url ? `<a href="${escapeXml(url)}"${url.startsWith('#') ? '' : ' target="_blank" rel="noopener noreferrer"'} style="color:inherit;text-decoration:inherit">${html}</a>` : html;
}
function paragraphHtml(paragraph, colors) {
    const s = paragraph.style;
    const styles = ['margin:0', 'padding:0', 'min-height:1em', 'position:relative', 'box-sizing:border-box'];
    if (s.alignment === 'distributed')
        styles.push('text-align:justify', 'text-align-last:justify', 'text-justify:inter-character');
    else if (s.alignment)
        styles.push(`text-align:${['left', 'right', 'center', 'justify'].includes(s.alignment) ? s.alignment : 'left'}`);
    const wrapFlags = paragraphWrapFlags(s);
    if (!(wrapFlags & 2))
        styles.push('word-break:break-all');
    if (!(wrapFlags & 1))
        styles.push('line-break:loose');
    if (wrapFlags & 4)
        styles.push('hanging-punctuation:allow-end');
    if (s.direction)
        styles.push(`direction:${s.direction === 'rtl' ? 'rtl' : 'ltr'}`);
    if (s.marginLeft != null)
        styles.push(`margin-left:${n(s.marginLeft)}px`);
    if (s.indent != null)
        styles.push(`text-indent:${n(s.indent)}px`);
    const firstSize = paragraph.runs.find(r => r.style.fontSize)?.style.fontSize ?? 24;
    styles.push(`font-size:${n(Math.max(.1, firstSize))}px`);
    const firstFont = paragraph.runs.find(r => r.style.fontFamily)?.style.fontFamily;
    if (firstFont)
        styles.push(`font-family:${cssFont(firstFont)}`);
    const lineHeight = s.lineHeightPoints ?? firstSize * (s.lineHeight ?? 1.15);
    if (s.spaceBefore != null || s.spaceBeforePercent != null)
        styles.push(`padding-top:${n(Math.max(0, s.spaceBefore ?? finite(s.spaceBeforePercent) * lineHeight))}px`);
    if (s.spaceAfter != null || s.spaceAfterPercent != null)
        styles.push(`padding-bottom:${n(Math.max(0, s.spaceAfter ?? finite(s.spaceAfterPercent) * lineHeight))}px`);
    if (s.defaultTabSize != null)
        styles.push(`tab-size:${n(paragraphDefaultTabSize(s))}px`);
    if (s.lineHeightPoints != null)
        styles.push(`line-height:${n(Math.max(.1, s.lineHeightPoints))}px`);
    else if (s.lineHeight != null)
        styles.push(`line-height:${n(Math.max(.1, s.lineHeight))}`);
    let bullet = '';
    if (s.bullet && s.bulletEnabled !== false) {
        const bs = [`display:inline-block`, `text-indent:0`, `min-width:${n(Math.max(firstSize * .5, -finite(s.indent)))}px`];
        if (s.bullet.fontFamily)
            bs.push(`font-family:${cssFont(s.bullet.fontFamily)}`);
        const firstStyle = paragraph.runs[0]?.style;
        const bc = schemeColor(s.bullet.color, s.bullet.colorIndex, colors) ?? schemeColor(firstStyle?.color, firstStyle?.colorIndex, colors);
        if (bc)
            bs.push(`color:${color(bc)}`);
        if (s.bullet.size != null || s.bullet.sizePercent != null)
            bs.push(`font-size:${n(s.bullet.size ?? finite(s.bullet.sizePercent, 1) * firstSize)}px`);
        bullet = `<span aria-hidden="true" style="${escapeXml(bs.join(';'))}">${escapeXml(s.bullet.text)}</span>`;
    }
    const runs = paragraph.runs.map(r => runHtml(r, colors, s.fontAlignment)).join('');
    return `<div style="${escapeXml(styles.join(';'))}">${bullet}${runs || '<br/>'}</div>`;
}
let textClipSequence = 0;
function textViewportWidth(layout) {
    let width = layout.width;
    // A closing punctuation mark may occupy the right margin or extend beyond it.
    // Extend only the horizontal viewport; overflow:visible would also expose
    // unrelated text below the frame and break vertical clipping.
    for (const line of layout.lines)
        for (const fragment of line.fragments)
            if (fragment.hanging)
                width = Math.max(width, fragment.x + fragment.width);
    return width;
}
function svgText(layout, colors, frame) {
    const vertical = frame?.direction === 'vertical' || frame?.direction === 'vertical270';
    const viewportWidth = vertical ? layout.height : textViewportWidth(layout), viewportHeight = vertical ? layout.width : layout.height, clipId = `ppt-text-clip-${++textClipSequence}`;
    const lines = layout.lines.map(line => `<g data-ppt-line="${line.paragraphIndex}">${line.fragments.map(fragment => {
        const s = fragment.style, baseline = (fragment.baseline ?? line.baseline) - (s.fontSize ?? 24) * finite(s.baseline) / 100;
        const decoration = [s.underline ? 'underline' : '', s.strike ? 'line-through' : ''].filter(Boolean).join(' ');
        const paragraph = frame?.paragraphs[line.paragraphIndex], rtl = paragraph?.style.direction === 'rtl' || paragraph?.style.direction == null && /^[\s\d\p{P}]*[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(paragraph?.runs.map(r => r.text).join('') ?? '');
        const x = vertical ? layout.height - baseline : rtl ? layout.width - fragment.x : fragment.x, y = vertical ? fragment.x : baseline;
        const attrs = `font-family="${escapeXml(cssFont(s.fontFamily ?? 'Arial'))}" font-size="${n(Math.max(.1, finite(s.fontSize, 24)))}" font-weight="${s.bold ? '700' : '400'}" font-style="${s.italic ? 'italic' : 'normal'}"${vertical ? ' writing-mode="vertical-rl" text-orientation="mixed"' : ''}${rtl ? ' direction="rtl" unicode-bidi="plaintext" text-anchor="start"' : ''}${decoration ? ` text-decoration="${decoration}"` : ''}${s.letterSpacing != null ? ` letter-spacing="${n(s.letterSpacing)}"` : ''} xml:space="preserve"`;
        const label = escapeXml(fragment.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '\ufffd').replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '\ufffd'));
        const effects = textEffects(s).map(effect => `<text x="${n(x + effect.dx)}" y="${n(y + effect.dy)}" fill="${effect.color}" fill-opacity="${n(effect.opacity)}" ${attrs} aria-hidden="true">${label}</text>`).join('');
        const glyphs = `${effects}<text x="${n(x)}" y="${n(y)}" fill="${color(schemeColor(s.color, s.colorIndex, colors))}" ${attrs}${fragment.bullet ? ' aria-hidden="true"' : ''}>${label}</text>`;
        const url = linkUrl(s.hyperlink);
        return url ? `<a href="${escapeXml(url)}" xlink:href="${escapeXml(url)}"${url.startsWith('#') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${glyphs}</a>` : glyphs;
    }).join('')}</g>`).join('');
    // SVG 1.1 makes viewport overflow:hidden equivalent to this rectangle.
    // Emit the rectangle explicitly as well: some SVG exporters ignore nested
    // viewport clipping. The horizontal allowance for punctuation stays bounded.
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" width="${n(viewportWidth)}" height="${n(viewportHeight)}" overflow="hidden" data-ppt-layout="measured" data-ppt-text-output="svg" data-ppt-font-scale="${n(layout.scale)}"><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="${n(viewportWidth)}" height="${n(viewportHeight)}"/></clipPath></defs><g clip-path="url(#${clipId})"${frame?.direction === 'vertical270' ? ` transform="translate(${n(viewportWidth)} ${n(viewportHeight)}) rotate(180)"` : ''}>${lines}</g></svg>`;
}
export function renderText(frame, width, height, colors = [], options = {}) {
    const warn = (code, message) => options.warnings?.push({ code, severity: 'warning', message, slideId: options.slideId, shapeId: options.shapeId });
    if (frame.paragraphs.some(p => p.runs.some(r => r.style.shadow)))
        warn('TEXT_SHADOW_APPROXIMATED', 'Character shadow uses a proportional offset and fixed opacity; exact Office shadow geometry is not reproduced');
    if (frame.paragraphs.some(p => p.runs.some(r => r.style.emboss)))
        warn('TEXT_EMBOSS_APPROXIMATED', 'Character emboss uses opposing highlight/shadow offsets; exact Office lighting is not reproduced');
    if (frame.paragraphs.some(p => p.style.defaultTabSize != null && !(p.style.defaultTabSize > 0) && p.runs.some(r => r.text.includes('\t'))))
        warn('TEXT_TAB_DEFAULT_APPROXIMATED', 'A nonpositive saved default tab step uses a 48px compatibility grid; PowerPoint tab behavior for this value is not fully specified');
    if (options.textLayout === 'measured' || options.textOutput === 'svg') {
        const supported = (!frame.direction || frame.direction === 'horizontal') && !frame.paragraphs.some(p => p.style.direction === 'rtl' || p.runs.some(r => /[\p{Script=Arabic}\p{Script=Hebrew}\u202a-\u202e\u2066-\u2069]/u.test(r.text)));
        const measurer = options.textMeasurer ?? createCanvasTextMeasurer();
        if ((supported || options.textOutput === 'svg') && measurer) {
            const vertical = frame.direction === 'vertical' || frame.direction === 'vertical270';
            const layoutFrame = vertical ? { ...frame, margins: { left: frame.margins.top, right: frame.margins.bottom, top: frame.margins.right, bottom: frame.margins.left } } : frame;
            const layout = layoutText(layoutFrame, { width: vertical ? height : width, height: vertical ? width : height, measurer, scale: frame.fontScale, lineSpacingScale: frame.lineSpacingScale, autofit: vertical ? 'none' : frame.autofit });
            if (!vertical)
                options.onLayout?.(layout);
            if (!supported)
                warn(vertical ? 'TEXT_VERTICAL_SVG_APPROXIMATED' : 'TEXT_BIDI_SVG_APPROXIMATED', vertical ? 'Native SVG vertical glyphs use measured column advances; Office-specific vertical fitting remains approximate' : 'Native SVG direction and shaping retain bidirectional text; mixed-script line layout remains approximate');
            if (layout.lineMetricsApproximate)
                warn('TEXT_LINE_METRICS_APPROXIMATED', 'Normal baseline advance is unavailable from the text measurer; relative line spacing uses nominal font size rather than font bounding-box height');
            if (layout.overflowX || layout.overflowY)
                warn('TEXT_LAYOUT_OVERFLOW', 'Measured text exceeds its frame after the requested fit policy');
            if (options.textOutput === 'svg')
                return svgText(layout, colors, frame);
            const lines = layout.lines.map(line => `<div data-ppt-line="${line.paragraphIndex}" style="position:absolute;inset:0;pointer-events:none">${line.fragments.map(fragment => { const baseline = (fragment.baseline ?? line.baseline) - (fragment.style.fontSize ?? 24) * finite(fragment.style.baseline) / 100; const css = `position:absolute;display:block;left:${n(fragment.x)}px;top:${n(baseline - fragment.ascent)}px;font-size:${n(fragment.style.fontSize ?? 24)}px;font-family:${cssFont(fragment.style.fontFamily ?? 'Arial')};line-height:${n(fragment.ascent + fragment.descent)}px;height:${n(fragment.ascent + fragment.descent)}px;white-space:pre;pointer-events:auto`; return `<span${fragment.bullet ? ' aria-hidden="true"' : ''} style="${escapeXml(css)}">${runHtml({ text: fragment.text, style: { ...fragment.style, baseline: 0 } }, colors)}</span>`; }).join('')}</div>`).join('');
            const viewportWidth = textViewportWidth(layout);
            return `<foreignObject x="0" y="0" width="${n(viewportWidth)}" height="${n(layout.height)}" data-ppt-layout="measured" data-ppt-font-scale="${n(layout.scale)}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${n(viewportWidth)}px;height:${n(layout.height)}px;overflow:hidden;font-family:Arial,sans-serif;color:#000;white-space:pre">${lines}</div></foreignObject>`;
        }
        warn(supported ? (options.textOutput === 'svg' ? 'TEXT_SVG_MEASUREMENT_UNAVAILABLE' : 'TEXT_MEASUREMENT_UNAVAILABLE') : 'TEXT_DIRECTION_NATIVE_LAYOUT', supported ? 'Canvas or a supplied text measurer is unavailable; browser foreign-object text layout is used' : 'Vertical or bidirectional text uses the native browser foreign-object layout path');
    }
    if (frame.paragraphs.some(p => p.style.tabStops?.length))
        warn('TEXT_TABS_NATIVE', 'Explicit tab alignment requires measured layout; native layout uses uniform default tab stops');
    if (frame.paragraphs.some(p => p.style.alignment === 'distributed'))
        warn('TEXT_DISTRIBUTED_NATIVE', 'Distributed alignment uses browser inter-character justification; measured layout supplies explicit character positions');
    if (frame.autofit && frame.autofit !== 'none')
        warn('TEXT_AUTOFIT_NATIVE', 'Dynamic text autofit requires measured horizontal layout; the native path retains the source frame bounds');
    if (frame.fontScale != null && frame.fontScale !== 1) {
        const scale = Math.min(1, Math.max(.05, frame.fontScale));
        frame = { ...frame, paragraphs: frame.paragraphs.map(p => ({ ...p, runs: p.runs.map(r => ({ ...r, style: { ...r.style, fontSize: (r.style.fontSize ?? 24) * scale } })) })) };
    }
    const m = frame.margins, align = frame.verticalAlignment === 'middle' ? 'center' : frame.verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start';
    const style = ['box-sizing:border-box', `width:${n(width)}px`, `height:${n(height)}px`, `padding:${n(m.top)}px ${n(m.right)}px ${n(m.bottom)}px ${n(m.left)}px`, 'display:flex', 'flex-direction:column', `justify-content:${align}`, 'font-family:Arial,sans-serif', 'font-size:24px', 'font-weight:400', 'font-style:normal', 'line-height:1.15', 'color:#000', 'overflow:hidden', `white-space:${frame.wrap ? 'pre-wrap' : 'pre'}`, frame.wrap ? 'overflow-wrap:normal' : '', 'word-break:normal', 'text-rendering:geometricPrecision'];
    if (frame.direction === 'vertical')
        style.push('writing-mode:vertical-rl');
    if (frame.direction === 'vertical270')
        style.push('writing-mode:vertical-rl', 'transform:rotate(180deg)');
    return `<foreignObject x="0" y="0" width="${n(width)}" height="${n(height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="${escapeXml(style.filter(Boolean).join(';'))}"><div style="flex:none;min-width:0;width:100%">${frame.paragraphs.map(p => paragraphHtml(p, colors)).join('')}</div></div></foreignObject>`;
}
