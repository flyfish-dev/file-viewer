import { cssFont, escapeXml, finite, n } from './safe.js';
import { createCanvasTextMeasurer } from '../layout/measure.js';
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export const SUPPORTED_WORDART_PRESETS = new Set([24, 25, 26, 27, 28, 29, 30, 31, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175]);
/** Continuous envelope maps. u/v describe the unwarped text rectangle, in [0,1].
 * Curves are sampled into affine triangles by renderWordArt; the browser supplies glyph outlines.
 * These analytic envelopes follow MSOSPT's shape families, not Office's unpublished font engine.
 */
export function warpPoint(preset, u, v, adjustments = []) {
    const amount = clamp(Math.abs(finite(adjustments[0], 5400)) / 21600, 0, .48), bell = 4 * u * (1 - u), triangle = 1 - Math.abs(2 * u - 1);
    let top = 0, bottom = 1, x = u;
    switch (preset) {
        case 24:
        case 136: break;
        case 25:
        case 137:
            top = amount * Math.abs(2 * u - 1);
            bottom = 1 - top;
            break;
        case 26:
            top = amount * Math.max(0, Math.abs(2 * u - 1) - .5) * 2;
            bottom = 1 - top;
            break;
        case 138:
            top = 1 - triangle;
            break;
        case 139:
            bottom = triangle;
            break;
        case 140:
            top = amount * triangle;
            bottom = 1 - amount + amount * triangle;
            break;
        case 141:
            top = amount * (1 - triangle);
            bottom = 1 - amount * triangle;
            break;
        case 27:
        case 30:
        case 152:
            top = amount * (1 - bell);
            bottom = 1 - amount * bell;
            break;
        case 153:
            top = amount * bell;
            bottom = 1 - amount + amount * bell;
            break;
        case 154:
        case 172:
            top = amount * (1 - u);
            bottom = 1 - amount * u;
            break;
        case 155:
        case 173:
            top = amount * u;
            bottom = 1 - amount * (1 - u);
            break;
        case 28:
        case 156:
        case 157:
        case 158:
        case 159: {
            const cycles = preset === 158 || preset === 159 ? 2 : 1, phase = finite(adjustments[1]) / 21600 * Math.PI * 2;
            const wave = Math.sin(u * Math.PI * 2 * cycles + phase) * (preset === 157 || preset === 159 ? -1 : 1);
            top = amount * (1 + wave) / 2;
            bottom = 1 - amount + top;
            break;
        }
        case 160:
            top = amount * (1 - bell);
            bottom = 1 - top;
            break;
        case 161:
            top = amount * bell;
            bottom = 1 - top;
            break;
        case 162:
            bottom = 1 - amount + amount * bell;
            break;
        case 163:
            bottom = 1 - amount * bell;
            break;
        case 164:
            top = amount * (1 - bell);
            break;
        case 165:
            top = amount * bell;
            break;
        case 166: {
            const q = Math.sin(2 * Math.PI * u);
            top = amount * (1 + q) / 2;
            bottom = 1 - top;
            break;
        }
        case 167: {
            const q = Math.cos(4 * Math.PI * u);
            top = amount * (1 + q) / 2;
            bottom = 1 - top;
            break;
        }
        case 168:
            top = amount * u;
            bottom = 1 - top;
            break;
        case 169:
            top = amount * (1 - u);
            bottom = 1 - top;
            break;
        case 170:
            x = amount * (1 - v) + u * (1 - 2 * amount * (1 - v));
            break;
        case 171:
            x = amount * v + u * (1 - 2 * amount * v);
            break;
        case 174:
            top = amount * (1 - bell);
            bottom = 1 - amount * bell;
            break;
        case 175:
            top = amount * bell;
            bottom = 1 - amount + amount * bell;
            break;
        case 29:
        case 31:
        case 142:
        case 143:
        case 144:
        case 145:
        case 146:
        case 147:
        case 148:
        case 149:
        case 150:
        case 151: {
            const full = [29, 31, 142, 143, 146, 147, 150, 151].includes(preset), down = preset === 145 || preset === 149;
            const sweep = full ? 2 * Math.PI : Math.PI;
            const theta = (down ? 0 : Math.PI) + u * sweep, radius = .5 - (.16 + .5 * amount) * (preset === 142 ? 1 - v : v);
            const y = .5 + Math.sin(theta) * radius;
            return { x: .5 + Math.cos(theta) * radius, y: full ? y : down ? (y - .5) * 2 : y * 2 };
        }
        default: break;
    }
    return { x, y: top + (bottom - top) * v };
}
/** Affine map from a triangle in the unit source square to a target triangle. */
export function triangleMatrix(source, target) {
    const [a, b, c] = source, [p, q, r] = target, ux = b.x - a.x, uy = b.y - a.y, vx = c.x - a.x, vy = c.y - a.y, d = ux * vy - uy * vx;
    if (Math.abs(d) < 1e-12)
        return undefined;
    const aa = ((q.x - p.x) * vy - (r.x - p.x) * uy) / d, cc = ((r.x - p.x) * ux - (q.x - p.x) * vx) / d;
    const bb = ((q.y - p.y) * vy - (r.y - p.y) * uy) / d, dd = ((r.y - p.y) * ux - (q.y - p.y) * vx) / d;
    return [aa, bb, cc, dd, p.x - aa * a.x - cc * a.y, p.y - bb * a.x - dd * a.y];
}
/** Paints deformed browser glyphs, rather than laying undeformed letters on a textPath. */
export function renderWordArt(shape, fillAttrs, strokeAttrs, ctx) {
    const art = shape.wordArt;
    if (!art)
        return undefined;
    const w = Math.max(0, finite(shape.bounds.width)), h = Math.max(0, finite(shape.bounds.height));
    if (!w || !h || !art.text)
        return '';
    const supported = SUPPORTED_WORDART_PRESETS.has(art.warpPreset), preset = supported ? art.warpPreset : 136;
    if (!supported)
        ctx.warnings?.push({ code: 'WORDART_WARP_UNSUPPORTED', severity: 'warning', message: `WordArt envelope ${art.warpPreset} is shown without warping`, shapeId: shape.id, slideId: ctx.slideId });
    const textId = `${ctx.id}-glyphs`, lines = art.text.replace(/\r\n/g, '\n').split(/[\r\n]/, 1025);
    if (lines.length > 1024) {
        lines.length = 1024;
        ctx.warnings?.push({ code: 'WORDART_RENDER_LIMIT', severity: 'warning', message: 'WordArt rendering is limited to 1,024 rows; the full source text remains available in the model', shapeId: shape.id, slideId: ctx.slideId });
    }
    const rows = Math.max(1, lines.length), fontSize = 1000, letterSpacing = (Math.max(0, finite(art.spacing, 1)) - 1) * fontSize * .5, measurer = ctx.textMeasurer ?? createCanvasTextMeasurer();
    const style = { fontFamily: art.fontFamily, fontSize, bold: art.bold, italic: art.italic, letterSpacing };
    let approximate = false;
    const metrics = lines.map(text => {
        const measured = measurer?.measure(text, style);
        if (measured && Number.isFinite(measured.width) && measured.width > 0 && measured.ascent + measured.descent > 0)
            return measured;
        approximate = true;
        let width = 0, count = 0;
        for (const c of text) {
            count++;
            width += (c.codePointAt(0) >= 0x2E80 ? 1 : /[MW@]/.test(c) ? 1 : /[mw]/.test(c) ? .9 : /[ilI.,'!|]/.test(c) ? .28 : /[frjt]/.test(c) ? .42 : /\s/.test(c) ? .33 : /[A-Z]/.test(c) ? .72 : .62) * fontSize;
        }
        return { width: Math.max(1, width * 1.2 + Math.max(0, count - 1) * letterSpacing), ascent: fontSize * .8, descent: fontSize * .2 };
    });
    if (approximate)
        ctx.warnings?.push({ code: 'WORDART_METRICS_APPROXIMATED', severity: 'warning', message: 'Font measurement is unavailable; WordArt source fitting uses conservative character widths', shapeId: shape.id, slideId: ctx.slideId });
    const maxWidth = metrics.reduce((max, m) => Math.max(max, m.width), 1), body = lines.map((text, index) => {
        const metric = metrics[index], length = art.alignment === 'justify' ? 1000 : 1000 * metric.width / maxWidth, tx = art.alignment === 'right' ? 1000 - length : art.alignment === 'center' ? (1000 - length) / 2 : 0, sx = length / Math.max(1, metric.width), sy = 1000 / rows / (metric.ascent + metric.descent), anchor = art.alignment === 'right' ? 'end' : art.alignment === 'center' ? 'middle' : 'start', x = anchor === 'end' ? metric.width : anchor === 'middle' ? metric.width / 2 : 0;
        return `<g transform="translate(${n(tx)} ${n(index * 1000 / rows)}) scale(${n(sx)} ${n(sy)})"><text x="${n(x)}" y="${n(metric.ascent)}" text-anchor="${anchor}" font-size="${fontSize}" vector-effect="non-scaling-stroke" letter-spacing="${n(letterSpacing)}">${escapeXml(text)}</text></g>`;
    }).join('');
    // Scale to a unit square before clipping; all strips reference this one glyph object.
    ctx.defs.push(`<g id="${textId}" transform="scale(.001)" text-rendering="geometricPrecision" font-family="${escapeXml(cssFont(art.fontFamily))}"${art.bold ? ' font-weight="700"' : ''}${art.italic ? ' font-style="italic"' : ''} ${fillAttrs} ${strokeAttrs}>${body}</g>`);
    const columns = preset === 136 || preset === 24 ? 1 : 48, parts = [];
    if (columns > 1)
        ctx.warnings?.push({ code: 'WORDART_MESH_RASTERIZATION_APPROXIMATED', severity: 'warning', message: 'WordArt is deformed through clipped affine glyph slices; some SVG rasterizers can show fine seams at slice boundaries', shapeId: shape.id, slideId: ctx.slideId });
    for (let i = 0; i < columns; i++) {
        const x0 = i / columns, x1 = (i + 1) / columns;
        const a = { x: x0, y: 0 }, b = { x: x1, y: 0 }, c = { x: x1, y: 1 }, d = { x: x0, y: 1 };
        for (const [j, source] of [[a, b, c], [a, c, d]].entries()) {
            const target = source.map(p => { const q = warpPoint(preset, p.x, p.y, art.adjustments); return art.vertical ? { x: (1 - q.y) * w, y: q.x * h } : { x: q.x * w, y: q.y * h }; });
            const m = triangleMatrix(source, target);
            if (!m || !m.every(Number.isFinite))
                continue;
            const clipId = `${ctx.id}-clip-${i}-${j}`;
            // Overlap reduces clip-edge antialiasing gaps. Independent glyph hinting in
            // some SVG rasterizers can still expose seams; report that rendering limit.
            const center = { x: source.reduce((s, p) => s + p.x, 0) / 3, y: source.reduce((s, p) => s + p.y, 0) / 3 }, epsilon = .0025;
            const clip = source.map(p => ({ x: p.x + Math.sign(p.x - center.x) * epsilon, y: p.y + Math.sign(p.y - center.y) * epsilon }));
            ctx.defs.push(`<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><path d="M${clip.map(p => `${n(p.x)} ${n(p.y)}`).join('L')}Z"/></clipPath>`);
            parts.push(`<g transform="matrix(${m.map(n).join(' ')})"><g clip-path="url(#${clipId})"><use href="#${textId}" xlink:href="#${textId}"/></g></g>`);
        }
    }
    return `<g data-ppt-wordart="${art.warpPreset}" aria-label="${escapeXml(art.text)}"><g aria-hidden="true">${parts.join('')}</g></g>`;
}
