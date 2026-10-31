import { PptError } from '../core/errors.js';
import { base64, color, escapeXml, finite, imageUrl, linkUrl, n, transformNumber } from './safe.js';
import { mapPathToBounds, presetGeometry } from './geometry.js';
import { renderText } from './text.js';
import { headerFooterVisible, resolveTextFields } from './fields.js';
import { renderGradient, renderShadow } from './effects.js';
import { renderWordArt } from './wordart.js';
import { renderExtrusion } from './three-d.js';
let renderSequence = 0;
function nextId(ctx) { return `${ctx.prefix}-${++ctx.seq}`; }
function sceneColor(value, index, ctx, fallback = '#000000') { const rgb = index == null ? undefined : ctx.slide.colorScheme?.[index]; return rgb == null ? color(value, fallback) : `#${[rgb & 255, (rgb >>> 8) & 255, (rgb >>> 16) & 255].map(v => v.toString(16).padStart(2, '0')).join('')}`; }
function effectContext(ctx) { return { id: nextId(ctx), defs: ctx.defs, resolveColor: (value, index, fallback) => sceneColor(value, index, ctx, fallback), warnings: ctx.warnings, slideId: ctx.slide.id, textMeasurer: ctx.options.textMeasurer, bounds: ctx.slide.size }; }
function assetUrl(ctx, id) {
    if (ctx.urls.has(id))
        return ctx.urls.get(id);
    const asset = ctx.assets.get(id);
    let url;
    if (asset && !asset.unsupported) {
        if (ctx.options.assetUrl)
            url = imageUrl(ctx.options.assetUrl(asset));
        else if (/^image\/(png|jpeg|gif|bmp|webp|svg\+xml)$/.test(asset.mimeType))
            url = `data:${asset.mimeType};base64,${base64(asset.bytes)}`;
    }
    ctx.urls.set(id, url);
    return url;
}
function paint(p, ctx, shape) {
    const opacity = Math.max(0, Math.min(1, finite(p.opacity, 1)));
    if (p.kind === 'none')
        return 'fill="none"';
    if (p.kind === 'solid')
        return `fill="${sceneColor(p.color, p.colorIndex, ctx, '#ffffff')}" fill-opacity="${n(opacity)}"`;
    if (p.kind === 'gradient')
        return renderGradient(p, effectContext(ctx), shape);
    const url = p.assetId ? assetUrl(ctx, p.assetId) : undefined;
    if (url) {
        const id = nextId(ctx), asset = p.assetId ? ctx.assets.get(p.assetId) : undefined, tiled = p.imageStyle === 'pattern' || p.imageStyle === 'texture';
        const width = tiled ? Math.max(1, finite(p.tileWidth, asset?.width ?? 8)) : 1, height = tiled ? Math.max(1, finite(p.tileHeight, asset?.height ?? 8)) : 1;
        let filter = '';
        if (p.imageStyle === 'pattern') {
            // Pattern BLIPs are masks: black selects fillColor, white fillBackColor.
            // Keep their native pixel period instead of stretching an eight-pixel mask
            // across the entire page. Interpolate alpha separately for both paints.
            const foreground = sceneColor(p.color, p.colorIndex, ctx, '#ffffff'), background = sceneColor(p.backColor, p.backColorIndex, ctx, '#ffffff');
            const rgb = (value) => { const hex = value.replace(/^#/, ''); return [0, 1, 2].map(i => { const component = hex.length <= 4 ? hex[i]?.repeat(2) : hex.slice(i * 2, i * 2 + 2); return parseInt(component ?? '00', 16) / 255 || 0; }); }, front = rgb(foreground), back = rgb(background), fid = nextId(ctx), alpha = Math.max(0, Math.min(1, finite(p.backOpacity, 1)));
            const row = (from, to) => `${[.2126, .7152, .0722].map(c => n(c * (to - from))).join(' ')} 0 ${n(from)}`;
            ctx.defs.push(`<filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${[...front.map((c, i) => row(c, back[i])), row(opacity, alpha)].join(' ')}"/></filter>`);
            filter = ` filter="url(#${fid})"`;
        }
        ctx.defs.push(`<pattern id="${id}" patternUnits="${tiled ? 'userSpaceOnUse' : 'objectBoundingBox'}" width="${n(width)}" height="${n(height)}"${tiled ? '' : ` viewBox="0 0 1 1" preserveAspectRatio="none"`}><image xlink:href="${escapeXml(url)}" x="0" y="0" width="${n(width)}" height="${n(height)}" preserveAspectRatio="none"${filter}/></pattern>`);
        return `fill="url(#${id})" fill-opacity="${n(p.imageStyle === 'pattern' ? 1 : opacity)}"`;
    }
    return 'fill="none"';
}
function marker(ctx, kind, stroke, start) {
    if (kind === 'none' || kind === '0')
        return '';
    const id = nextId(ctx), c = sceneColor(stroke.color, stroke.colorIndex, ctx);
    let geometry = '<path d="M0 0L10 5L0 10Z"/>';
    if (kind === 'stealth' || kind === '2')
        geometry = '<path d="M0 0L10 5L0 10L3 5Z"/>';
    if (kind === 'diamond' || kind === '3')
        geometry = '<path d="M0 5L5 0L10 5L5 10Z"/>';
    if (kind === 'oval' || kind === '4')
        geometry = '<ellipse cx="5" cy="5" rx="5" ry="5"/>';
    if (kind === 'open' || kind === '5')
        geometry = `<path d="M0 0L10 5L0 10" fill="none" stroke="${c}" stroke-width="1.5"/>`;
    ctx.defs.push(`<marker id="${id}" markerWidth="5" markerHeight="5" refX="9" refY="5" viewBox="0 0 10 10" markerUnits="strokeWidth" orient="auto-start-reverse"><g fill="${c}">${geometry}</g></marker>`);
    return ` marker-${start ? 'start' : 'end'}="url(#${id})"`;
}
function stroke(line, ctx) {
    if (!line || line.width <= 0)
        return 'stroke="none"';
    let attrs = `stroke="${sceneColor(line.color, line.colorIndex, ctx)}" stroke-width="${n(Math.max(0, finite(line.width)))}" stroke-opacity="${n(Math.max(0, Math.min(1, finite(line.opacity, 1))))}" stroke-linejoin="round"`;
    if (line.cap)
        attrs += ` stroke-linecap="${line.cap}"`;
    if (line.dash?.length)
        attrs += ` stroke-dasharray="${line.dash.map(v => n(Math.max(0, v))).join(' ')}"`;
    if (line.startArrow)
        attrs += marker(ctx, line.startArrow, line, true);
    if (line.endArrow)
        attrs += marker(ctx, line.endArrow, line, false);
    return attrs;
}
function renderGeometry(shape, ctx, w, h) {
    const physical = { ...shape, bounds: { ...shape.bounds, width: w, height: h } }, fill = paint(shape.fill, ctx, physical), line = stroke(shape.line, ctx);
    if (shape.path) {
        const bounds = shape.pathBounds ?? { x: 0, y: 0, width: shape.bounds.width, height: shape.bounds.height };
        return (shape.pathParts ?? [{ path: shape.path, noFill: false, noLine: false }]).map(part => `<path d="${escapeXml(mapPathToBounds(part.path, bounds, w, h))}" ${part.noFill ? 'fill="none"' : fill} ${part.noLine ? 'stroke="none"' : line}/>`).join('');
    }
    const geometry = presetGeometry(shape.preset, w, h, shape.source?.properties);
    if (!geometry.supported)
        ctx.warnings.push({ code: 'PRESET_APPROXIMATED', severity: 'warning', message: `Shape preset ${shape.preset} has no exact geometry and is shown with a bounding rectangle`, shapeId: shape.id, slideId: ctx.slide.id });
    else if (shape.preset !== 2 && Object.keys(shape.source?.properties ?? {}).some(key => Number(key) >= 327 && Number(key) <= 336))
        ctx.warnings.push({ code: 'PRESET_ADJUSTMENT_UNSUPPORTED', severity: 'warning', message: `Shape preset ${shape.preset} uses default geometry; source adjustment handles are retained but not evaluated`, shapeId: shape.id, slideId: ctx.slide.id });
    return `<${geometry.tag} ${geometry.attrs} ${geometry.open ? 'fill="none"' : fill} ${line}/>`;
}
function shapeTransform(shape) { const b = shape.bounds, cx = b.width / 2, cy = b.height / 2; return `translate(${transformNumber(b.x)} ${transformNumber(b.y)})${shape.rotation ? ` rotate(${transformNumber(shape.rotation)} ${transformNumber(cx)} ${transformNumber(cy)})` : ''}${shape.flipH || shape.flipV ? ` translate(${transformNumber(cx)} ${transformNumber(cy)}) scale(${shape.flipH ? -1 : 1} ${shape.flipV ? -1 : 1}) translate(${transformNumber(-cx)} ${transformNumber(-cy)})` : ''}`; }
function renderImage(shape, ctx) {
    const b = shape.bounds, image = shape.image, url = image ? assetUrl(ctx, image.assetId) : undefined;
    if (!image || !url) {
        ctx.warnings.push({ code: 'IMAGE_NOT_RENDERABLE', severity: 'warning', message: 'Image resource is unavailable or not supported by this renderer', shapeId: shape.id, slideId: ctx.slide.id });
        return ctx.options.showUnsupported === false ? '' : `<rect width="${n(b.width)}" height="${n(b.height)}" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4 3"/><text x="6" y="18" font-family="sans-serif" font-size="12" fill="#64748b">Image unavailable</text>`;
    }
    const crop = image.crop ?? { left: 0, top: 0, right: 0, bottom: 0 }, vw = 1 - crop.left - crop.right, vh = 1 - crop.top - crop.bottom;
    if (vw <= 0 || vh <= 0)
        return '';
    const id = nextId(ctx);
    ctx.defs.push(`<clipPath id="${id}"><rect width="${n(b.width)}" height="${n(b.height)}"/></clipPath>`);
    let filter = '';
    if (image.brightness != null || image.contrast != null) {
        const fid = nextId(ctx), slope = finite(image.contrast, 1), intercept = finite(image.brightness) + (1 - slope) / 2;
        ctx.defs.push(`<filter id="${fid}" color-interpolation-filters="sRGB"><feComponentTransfer>${['R', 'G', 'B'].map(c => `<feFunc${c} type="linear" slope="${n(slope)}" intercept="${n(intercept)}"/>`).join('')}</feComponentTransfer></filter>`);
        filter = ` filter="url(#${fid})"`;
    }
    return `<g clip-path="url(#${id})"><image xlink:href="${escapeXml(url)}" x="${n(-crop.left * b.width / vw)}" y="${n(-crop.top * b.height / vh)}" width="${n(b.width / vw)}" height="${n(b.height / vh)}" preserveAspectRatio="none"${filter}/></g>`;
}
function renderMedia(shape, ctx) {
    const media = shape.media;
    if (!media)
        return '';
    const asset = media.assetId ? ctx.assets.get(media.assetId) : undefined;
    let url;
    if (ctx.options.mediaControls === false)
        return media.posterAssetId ? renderImage({ ...shape, image: { assetId: media.posterAssetId } }, ctx) : '';
    if (asset && !asset.unsupported && /^(?:audio|video)\/[a-z0-9.+-]+$/i.test(asset.mimeType)) {
        const supplied = ctx.options.assetUrl?.(asset);
        if (ctx.options.assetUrl) {
            if (supplied && /^(?:blob:|data:(?:audio|video)\/[a-z0-9.+-]+;base64,)/i.test(supplied))
                url = supplied;
        }
        else
            url = `data:${asset.mimeType};base64,${base64(asset.bytes)}`;
    }
    if (!url) {
        ctx.warnings.push({ code: 'MEDIA_SOURCE_UNAVAILABLE', severity: 'warning', message: 'Media has no supported embedded asset; external paths are not fetched', shapeId: shape.id, slideId: ctx.slide.id });
        return '';
    }
    const tag = media.kind === 'video' ? 'video' : 'audio', poster = media.posterAssetId ? assetUrl(ctx, media.posterAssetId) : undefined, b = shape.bounds;
    return `<foreignObject x="0" y="0" width="${n(b.width)}" height="${n(b.height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><${tag} data-ppt-media="${n(media.mediaId)}" controls="controls" preload="none" playsinline="playsinline"${media.loop ? ' loop="loop"' : ''}${poster && tag === 'video' ? ` poster="${escapeXml(poster)}"` : ''} src="${escapeXml(url)}" style="width:100%;max-height:100%;object-fit:contain">Embedded media</${tag}></div></foreignObject>`;
}
function multiply(a, b) { return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3]]; }
function shapeLinear(shape) {
    const angle = shape.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle), hx = shape.flipH ? -1 : 1, vy = shape.flipV ? -1 : 1;
    return [cos * hx, sin * hx, -sin * vy, cos * vy];
}
/** Child anchors use FSPGR coordinates; TextCFException font sizes remain points.
 * Lay out all absolute text lengths in the mapped physical frame, then undo only
 * its axis scales. Rotation, reflection and any inherited shear remain in the
 * original shape transform. No text style or source geometry is rewritten. */
function textAxisScale(shape, parent) {
    const axes = multiply(parent, shapeLinear(shape)), x = Math.hypot(axes[0], axes[1]), y = Math.hypot(axes[2], axes[3]);
    if (!Number.isFinite(x) || x <= 0 || !Number.isFinite(y) || y <= 0 || !Number.isFinite(1 / x) || !Number.isFinite(1 / y))
        return undefined;
    // Test normalized directions, not the tiny unscaled determinant: valid small
    // group coordinates must not underflow, and zero-axis ancestors may produce
    // two nonzero but collinear axes after a child rotation.
    const cross = (axes[0] / x) * (axes[3] / y) - (axes[1] / x) * (axes[2] / y);
    return Number.isFinite(cross) && cross !== 0 ? { x, y } : undefined;
}
function shadowWrap(shape, html, ctx, parent) { return shape.shadow ? renderShadow(shape, html, effectContext(ctx), parent) : html; }
function renderShape(shape, ctx, depth = 0, parent = [1, 0, 0, 1]) {
    if (shape.hidden || depth > 64 || !headerFooterVisible(shape.placeholder?.type, ctx.slide))
        return '';
    const b = shape.bounds, w = Math.max(0, finite(b.width));
    let h = Math.max(0, finite(b.height));
    const textContent = (resizeShape = true) => {
        if (!shape.text)
            return '';
        const scale = textAxisScale(shape, parent);
        if (!scale || !Number.isFinite(w * scale.x) || !Number.isFinite(h * scale.y)) {
            ctx.warnings.push({ code: 'TEXT_TRANSFORM_DEGENERATE', severity: 'warning', message: 'Text has a singular or non-finite ancestor transform and cannot be laid out in a physical frame', slideId: ctx.slide.id, shapeId: shape.id });
            return '';
        }
        const frame = resolveTextFields(shape.text, { slide: ctx.slide, options: ctx.options, date: ctx.date, warnings: ctx.warnings, shapeId: shape.id }, shape.placeholder?.type);
        const html = renderText(frame, w * scale.x, h * scale.y, ctx.slide.colorScheme, { ...ctx.options, warnings: ctx.warnings, slideId: ctx.slide.id, shapeId: shape.id, onLayout: layout => { if (resizeShape && frame.autofit === 'resize')
                h = layout.height / scale.y; } });
        if (resizeShape && h !== shape.bounds.height)
            shape = { ...shape, bounds: { ...shape.bounds, height: h } };
        return scale.x === 1 && scale.y === 1 ? html : `<g transform="scale(${transformNumber(1 / scale.x)} ${transformNumber(1 / scale.y)})">${html}</g>`;
    };
    let text = shape.text && !shape.wordArt ? textContent() : '';
    const animate = (html) => { const href = linkUrl(shape.hyperlink); if (href)
        html = `<a href="${escapeXml(href)}"${href.startsWith('#') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${html}</a>`; return ctx.animationTargets.has(shape.id) ? `<g data-ppt-animation="${n(shape.id)}" data-ppt-parent="${parent.map(transformNumber).join(' ')}">${html}</g>` : html; };
    const label = shape.name ? ` aria-label="${escapeXml(shape.name)}"` : '';
    if (shape.kind === 'group') {
        const gb = shape.groupBounds ?? { x: 0, y: 0, width: w, height: h }, sx = gb.width ? w / gb.width : 1, sy = gb.height ? h / gb.height : 1, linear = multiply(multiply(parent, shapeLinear(shape)), [sx, 0, 0, sy]);
        return animate(shadowWrap(shape, `<g data-ppt-shape="${n(shape.id)}" transform="${shapeTransform(shape)}"${label}><g transform="scale(${transformNumber(sx)} ${transformNumber(sy)}) translate(${transformNumber(-gb.x)} ${transformNumber(-gb.y)})">${(shape.children ?? []).map(s => renderShape(s, ctx, depth + 1, linear)).join('')}</g></g>`, ctx, parent));
    }
    let content = '', wordArtRendered = false;
    if (shape.kind === 'unsupported') {
        if (ctx.options.showUnsupported !== false)
            content = `<rect width="${n(w)}" height="${n(h)}" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="4 3"/><text x="6" y="18" font-family="sans-serif" font-size="12" fill="#64748b">Unsupported element</text>`;
    }
    else if (shape.kind === 'image' && shape.preset === 75) {
        // A picture frame displays its BLIP, including alpha. Drawing defaults such
        // as fillColor/fFilled describe ordinary geometry, not a second rectangle
        // behind the picture. Painting that rectangle hides earlier scene objects
        // through transparent pixels (including pre-rendered circular crops).
        content = renderImage(shape, ctx);
    }
    else {
        const wordArt = shape.wordArt ? renderWordArt(shape, paint(shape.fill, ctx, shape), stroke(shape.line, ctx), effectContext(ctx)) : undefined;
        if (wordArt != null) {
            content = wordArt;
            wordArtRendered = true;
        }
        else {
            // Child coordinates can be millions of local units while lineWidth remains
            // an absolute physical length. Map geometry into physical axis lengths and
            // undo those axis scales, as for text. This preserves source paint order,
            // rotations/reflections and SVG viewport zoom without shrinking strokes.
            const scale = (shape.line || shape.fill.imageStyle === 'pattern' || shape.fill.imageStyle === 'texture') && !shape.extrusion ? textAxisScale(shape, parent) : undefined;
            if (scale && (scale.x !== 1 || scale.y !== 1) && Number.isFinite(w * scale.x) && Number.isFinite(h * scale.y))
                content = `<g transform="scale(${transformNumber(1 / scale.x)} ${transformNumber(1 / scale.y)})">${renderGeometry(shape, ctx, w * scale.x, h * scale.y)}</g>`;
            else
                content = renderGeometry(shape, ctx, w, h);
        }
        if (shape.image)
            content += renderImage(shape, ctx);
    }
    // The fallback has historically retained the WordArt geometry bounds. It is
    // reached after geometry creation, so its text fit must not move that frame.
    if (shape.wordArt && !wordArtRendered && shape.text)
        text = textContent(false);
    content += text + renderMedia(shape, ctx);
    if (shape.extrusion)
        content = renderExtrusion(shape, content, effectContext(ctx));
    return animate(shadowWrap(shape, `<g data-ppt-shape="${n(shape.id)}" transform="${shapeTransform(shape)}"${label}>${content}</g>`, ctx, parent));
}
function composedShapes(doc, slide, options) {
    if (options.includeMaster === false || slide.showMasterShapes === false)
        return slide.shapes;
    const byId = new Map(doc.masters.map(s => [s.id, s]));
    const covered = new Set();
    const visit = (shapes) => { for (const s of shapes) {
        if (s.placeholder)
            covered.add(s.placeholder.type);
        if (s.children)
            visit(s.children);
    } };
    visit(slide.shapes);
    // Master title/body placeholders supply style/position. Their sample text is never slide content.
    const filterMaster = (shapes) => shapes.flatMap(s => s.placeholder && (covered.has(s.placeholder.type) || ![7, 8, 9, 10].includes(s.placeholder.type)) ? [] : [s.children ? { ...s, children: filterMaster(s.children) } : s]);
    const seen = new Set();
    const collect = (id) => { if (id == null || seen.has(id))
        return []; seen.add(id); const master = byId.get(id); if (!master)
        return []; const own = filterMaster(master.shapes); visit(master.shapes); return [...(master.showMasterShapes === false ? [] : collect(master.masterId)), ...own]; };
    const masterShapes = collect(slide.masterId);
    return [...masterShapes, ...slide.shapes];
}
export const defaultPptCss = '.pptjs-slide{display:block;max-width:100%;max-height:100%;user-select:text}.pptjs-slide *{box-sizing:border-box}.pptjs-slide a:focus{outline:2px solid #2563eb;outline-offset:2px}';
export function renderSlide(doc, index, options = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= doc.slides.length)
        throw new PptError('SLIDE_INDEX', `Slide index ${index} is outside the presentation`);
    const slide = doc.slides[index], w = slide.size.width, h = slide.size.height;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
        throw new PptError('SLIDE_SIZE', 'Slide size must be finite and positive');
    const ctx = { document: doc, slide, options, date: options.fieldDate ?? new Date(), defs: [], prefix: `ppt-${++renderSequence}-${index}`, seq: 0, assets: new Map(doc.assets.map(a => [a.id, a])), urls: new Map(), warnings: [], animationTargets: new Set(slide.timeline?.effects.map(e => e.targetShapeId) ?? []) };
    const transition = slide.transition;
    if (transition) {
        const direction = transition.direction ?? 0, supported = transition.type === 255 || [0, 6, 23].includes(transition.type) && direction === 0 || [4, 7, 10, 20].includes(transition.type) && Number.isInteger(direction) && direction >= 0 && direction <= 3;
        if (!supported)
            ctx.warnings.push({ code: 'TRANSITION_EFFECT_UNSUPPORTED', severity: 'warning', message: 'This transition variant has no playback implementation and changes slides without the source effect', slideId: slide.id, details: { type: transition.type, direction } });
        if (transition.soundEnabled)
            ctx.warnings.push({ code: 'TRANSITION_SOUND_MANUAL', severity: 'warning', message: 'Transition sound commands are retained but are not played automatically', slideId: slide.id });
    }
    const bg = `<rect width="${n(w)}" height="${n(h)}" ${paint(slide.background, ctx)}/>`;
    const shapes = composedShapes(doc, slide, options).map(s => renderShape(s, ctx)).join('');
    const html = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="pptjs-slide${options.className ? ' ' + escapeXml(options.className) : ''}" role="img" aria-label="${escapeXml(slide.name ?? `Slide ${index + 1}`)}" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}" preserveAspectRatio="xMidYMid meet"><defs>${ctx.defs.join('')}</defs>${bg}${shapes}</svg>`;
    const relatedIds = new Set([slide.id]);
    let id = slide.masterId;
    while (id != null && !relatedIds.has(id)) {
        relatedIds.add(id);
        id = doc.masters.find(m => m.id === id)?.masterId;
    }
    return { html, css: defaultPptCss, warnings: [...doc.diagnostics.filter(d => d.slideId == null || relatedIds.has(d.slideId)), ...ctx.warnings] };
}
export function renderSlideSvg(doc, index, options = {}) { return renderSlide(doc, index, options).html; }
