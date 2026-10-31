import { mapPathToBounds, presetGeometry } from './geometry.js';
import { color, escapeXml, finite, n } from './safe.js';
const unit = (v) => Math.max(0, Math.min(1, v));
function rgb(value) {
    const c = color(value, '#000000');
    if (/^#[\da-f]{3}$/i.test(c))
        return [1, 2, 3].map(i => parseInt(c[i] + c[i], 16));
    if (/^#[\da-f]{6,8}$/i.test(c))
        return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    return [0, 0, 0];
}
/** Resolve and order colors once; each contour then needs only a binary search. */
function gradientSampler(stops, resolve) {
    const ordered = stops.map(stop => ({ position: unit(finite(stop.position)), rgb: rgb(resolve(stop.color, stop.colorIndex)), opacity: unit(finite(stop.opacity, 1)) })).sort((a, b) => a.position - b.position);
    return position => {
        if (!ordered.length)
            return { color: '#ffffff', opacity: 1 };
        const at = unit(finite(position));
        let low = 0, high = ordered.length;
        // Upper bound selects the last duplicate at an exact hard-stop position.
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (ordered[middle].position <= at)
                low = middle + 1;
            else
                high = middle;
        }
        const lo = ordered[Math.max(0, low - 1)], hi = ordered[Math.min(low, ordered.length - 1)];
        const t = hi.position > lo.position ? unit((at - lo.position) / (hi.position - lo.position)) : 0;
        return { color: '#' + lo.rgb.map((v, i) => Math.round(v + (hi.rgb[i] - v) * t).toString(16).padStart(2, '0')).join(''), opacity: lo.opacity + (hi.opacity - lo.opacity) * t };
    };
}
/** Interpolate a saved stop list, preserving hard transitions at duplicate offsets. */
export function sampleGradient(stops, position, resolve) {
    return gradientSampler(stops, resolve)(position);
}
function outline(shape) {
    if (shape?.path)
        return `<path d="${escapeXml(mapPathToBounds(shape.path, shape.pathBounds ?? { x: 0, y: 0, width: shape.bounds.width, height: shape.bounds.height }, 1, 1))}"/>`;
    const geometry = presetGeometry(shape?.preset, 1, 1, shape?.source?.properties);
    return `<${geometry.tag} ${geometry.attrs}/>`;
}
/** SVG has no rectangular/concentric-path gradient; bounded nested contours implement it. */
export function renderGradient(paint, ctx, shape) {
    const id = ctx.id, opacity = unit(finite(paint.opacity, 1));
    const stops = paint.stops?.length ? paint.stops : [{ position: 0, color: paint.color ?? '#ffffff', colorIndex: paint.colorIndex }, { position: 1, color: '#000000' }];
    const gradientType = paint.gradientType ?? 'linear';
    const stopMarkup = gradientType === 'rectangular' || gradientType === 'shape' ? '' : stops.map(s => `<stop offset="${n(unit(finite(s.position)))}" stop-color="${ctx.resolveColor(s.color, s.colorIndex)}" stop-opacity="${n(unit(finite(s.opacity, 1)))}"/>`).join('');
    if (gradientType === 'rectangular' || gradientType === 'shape') {
        const r = paint.gradientRect ?? { left: 0, top: 0, right: 0, bottom: 0 };
        const cx = unit(finite(paint.gradientCenter?.x, (r.left + r.right) / 2)), cy = unit(finite(paint.gradientCenter?.y, (r.top + r.bottom) / 2));
        const parts = [], steps = 96, sample = gradientSampler(stops, ctx.resolveColor);
        const geometry = gradientType === 'shape' ? outline(shape) : '';
        for (let i = 0; i <= steps; i++) {
            const t = i / steps, s = sample(t);
            if (gradientType === 'rectangular') {
                const left = unit(finite(r.left)) * t, top = unit(finite(r.top)) * t, right = 1 + (unit(finite(r.right)) - 1) * t, bottom = 1 + (unit(finite(r.bottom)) - 1) * t;
                parts.push(`<rect x="${n(Math.min(left, right))}" y="${n(Math.min(top, bottom))}" width="${n(Math.abs(right - left))}" height="${n(Math.abs(bottom - top))}" fill="${s.color}" fill-opacity="${n(s.opacity)}"/>`);
            }
            else {
                const scale = Math.max(1e-6, 1 - t);
                parts.push(`<g transform="translate(${n(cx * t)} ${n(cy * t)}) scale(${n(scale)})" fill="${s.color}" fill-opacity="${n(s.opacity)}">${geometry}</g>`);
            }
        }
        // Alpha is applied once to the completed gradient; individual nested translucent
        // layers would otherwise accumulate opacity. An alpha mask samples the same contours.
        const opaqueParts = parts.map(p => p.replace(/ fill-opacity="[^"]*"/g, ''));
        if (stops.some(s => finite(s.opacity, 1) !== 1)) {
            const maskId = `${id}-alpha`;
            const mask = parts.map(p => { const alpha = Number(/fill-opacity="([^"]*)"/.exec(p)?.[1] ?? 1), level = Math.round(unit(alpha) * 255).toString(16).padStart(2, '0'); return p.replace(/fill="#[\da-f]+"/g, `fill="#${level}${level}${level}"`).replace(/ fill-opacity="[^"]*"/g, ''); });
            ctx.defs.push(`<mask id="${maskId}" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1" style="mask-type:luminance">${mask.join('')}</mask>`);
            ctx.defs.push(`<pattern id="${id}" width="1" height="1" viewBox="0 0 1 1" preserveAspectRatio="none"><g mask="url(#${maskId})">${opaqueParts.join('')}</g></pattern>`);
        }
        else
            ctx.defs.push(`<pattern id="${id}" width="1" height="1" viewBox="0 0 1 1" preserveAspectRatio="none">${opaqueParts.join('')}</pattern>`);
    }
    else if (gradientType === 'radial') {
        const cx = unit(finite(paint.gradientCenter?.x, .5)), cy = unit(finite(paint.gradientCenter?.y, .5));
        ctx.defs.push(`<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(Math.max(cx, 1 - cx, cy, 1 - cy))}">${stopMarkup}</radialGradient>`);
    }
    else {
        // The gradient coordinate system normally stays parallel to the slide axes.
        const angle = finite(paint.angle) - (paint.rotateWithShape === false ? finite(shape?.rotation) : 0), rad = angle * Math.PI / 180, h = paint.rotateWithShape === false && shape?.flipH ? -1 : 1, v = paint.rotateWithShape === false && shape?.flipV ? -1 : 1, dx = Math.cos(rad) * h, dy = Math.sin(rad) * v;
        const bounds = shape?.bounds ?? ctx.bounds;
        if (paint.gradientScaled === false && !shape?.wordArt && bounds && bounds.width > 0 && bounds.height > 0) {
            const w = bounds.width, height = bounds.height, extent = (Math.abs(w * dx) + Math.abs(height * dy)) / 2;
            ctx.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(w / 2 - dx * extent)}" y1="${n(height / 2 - dy * extent)}" x2="${n(w / 2 + dx * extent)}" y2="${n(height / 2 + dy * extent)}">${stopMarkup}</linearGradient>`);
        }
        else
            ctx.defs.push(`<linearGradient id="${id}" x1="${n(.5 - dx * .5)}" y1="${n(.5 - dy * .5)}" x2="${n(.5 + dx * .5)}" y2="${n(.5 + dy * .5)}">${stopMarkup}</linearGradient>`);
    }
    return `fill="url(#${id})" fill-opacity="${n(opacity)}"`;
}
/** Offset, double, and emboss shadows preserve absolute drawing-axis offsets in groups. */
export function renderShadow(shape, html, ctx, parent = [1, 0, 0, 1]) {
    const shadow = shape.shadow;
    if (!shadow)
        return html;
    if (shadow.type !== 0 && shadow.type !== 1 && shadow.type !== 5) {
        ctx.warnings?.push({ code: 'SHADOW_TRANSFORM_UNSUPPORTED', severity: 'warning', message: `Shadow type ${shadow.type} requires a rich/shape/drawing transformation not present in the supported shadow model`, shapeId: shape.id, slideId: ctx.slideId });
        return html;
    }
    const inverse = (x, y) => { const d = parent[0] * parent[3] - parent[1] * parent[2]; return Math.abs(d) > 1e-12 ? [(parent[3] * x - parent[2] * y) / d, (-parent[1] * x + parent[0] * y) / d] : [x, y]; };
    const [dx, dy] = inverse(finite(shadow.offsetX), finite(shadow.offsetY));
    const [sx, sy] = inverse(finite(shadow.secondOffsetX, shadow.type === 5 ? -shadow.offsetX : 0), finite(shadow.secondOffsetY, shadow.type === 5 ? -shadow.offsetY : 0));
    const blur = Math.max(0, finite(shadow.blur)), pad = Math.max(shape.bounds.width, shape.bounds.height, 1) + Math.max(Math.abs(dx) + Math.abs(dy), Math.abs(sx) + Math.abs(sy)) + 3 * blur;
    // Express ordinary shadows through the same SVG 1.1 primitives as the richer
    // layers. This is equivalent to feDropShadow and also works in older exporters.
    const parts = [], merges = [];
    const layer = (name, x, y, c) => {
        parts.push(`<feOffset in="SourceAlpha" dx="${n(x)}" dy="${n(y)}" result="${name}-offset"/>`);
        if (blur)
            parts.push(`<feGaussianBlur in="${name}-offset" stdDeviation="${n(blur)}" result="${name}-offset"/>`);
        parts.push(`<feFlood flood-color="${c}" flood-opacity="${n(unit(finite(shadow.opacity, 1)))}" result="${name}-color"/><feComposite in="${name}-color" in2="${name}-offset" operator="in" result="${name}"/>`);
        if (shadow.obscured)
            parts.push(`<feComposite in="${name}" in2="SourceAlpha" operator="out" result="${name}"/>`);
        merges.push(`<feMergeNode in="${name}"/>`);
    };
    if (shadow.type === 1 || shadow.type === 5)
        layer('highlight', sx, sy, ctx.resolveColor(shadow.highlightColor, shadow.highlightColorIndex, '#cbcbcb'));
    layer('shadow', dx, dy, ctx.resolveColor(shadow.color, shadow.colorIndex, '#808080'));
    const b = shape.bounds;
    ctx.defs.push(`<filter id="${ctx.id}" filterUnits="userSpaceOnUse" x="${n(b.x - pad)}" y="${n(b.y - pad)}" width="${n(b.width + pad * 2)}" height="${n(b.height + pad * 2)}" color-interpolation-filters="sRGB">${parts.join('')}<feMerge>${merges.join('')}<feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    return `<g filter="url(#${ctx.id})">${html}</g>`;
}
