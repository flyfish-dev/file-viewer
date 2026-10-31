import { PptError } from '../core/errors.js';
import { trimTrailingNulls } from '../core/utils.js';
import { RT } from './constants.js';
import { readRecords } from './records.js';
import { adjustedPresetGeometry, customGeometry, officeArray } from './geometry.js';
import { parseTextFrames } from './text.js';
import { parseInlinePicture } from './pictures.js';
const boolProps = new Set([127, 191, 255, 319, 383, 447, 511, 575, 639, 703, 767, 831, 895, 959, 1023]);
const dataView = (bytes, record) => new DataView(bytes.buffer, bytes.byteOffset + record.dataOffset, record.length);
const fixed = (value) => (value | 0) / 65536;
const colorIndex = (value) => value & 0x08000000 ? value & 255 : undefined;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const utf16 = new TextDecoder('utf-16le');
const assetBudgets = new WeakMap();
// Complex properties participate in the same default/master/shape cascade as
// scalar values. Keep their byte views in a parse-scoped ephemeron: the resulting
// document must not retain its complete source buffer merely to render a shape.
const defaultComplexProperties = new WeakMap();
const shapeComplexProperties = new WeakMap();
// These properties have an IMsoArray payload with a defined element width.
// Some binary producers store only the element-data length in op, excluding
// the six-byte array header. Do not apply that convention to strings or BLIPs.
const arrayElementSizes = new Map([[325, [4, 8, 0xFFF0]], [326, [2]], [337, [8, 0xFFF0]], [338, [4]], [341, [36]], [342, [8]], [343, [16]], [407, [8]]]);
function warn(ctx, code, message, record, shapeId) {
    ctx.diagnostics.push({ code, severity: 'warning', message, offset: record.offset, shapeId });
}
/** fUse bits occupy the upper half-word. Unspecified Boolean bits inherit. */
function mergeProperty(id, base, next) {
    if (base === undefined || !boolProps.has(id))
        return next;
    const used = next >>> 16;
    return (((base & 0xFFFF & ~used) | (next & used)) | (((base >>> 16) | used) << 16)) >>> 0;
}
export function readProperties(record, bytes, diagnostics) {
    const values = new Map(), complex = new Map();
    const count = record.instance;
    if (count * 6 > record.length) {
        diagnostics.push({ code: 'FOPT_LENGTH', severity: 'warning', message: 'Property entries exceed FOPT payload', offset: record.offset });
        return { values, complex };
    }
    const view = dataView(bytes, record);
    let extra = record.dataOffset + count * 6;
    let declared = 0;
    for (let i = 0; i < count; i++)
        if (view.getUint16(i * 6, true) & 0x8000)
            declared += view.getUint32(i * 6 + 2, true);
    // An omitted header can only consume otherwise unassigned bytes. Reserving
    // every subsequent declared payload prevents recovery from stealing it.
    let spare = record.end - extra - declared;
    const recovered = [];
    for (let i = 0; i < count; i++) {
        const op = view.getUint16(i * 6, true), id = op & 0x3FFF, value = view.getUint32(i * 6 + 2, true);
        values.set(id, mergeProperty(id, values.get(id), value));
        complex.delete(id);
        if (op & 0x8000) {
            let length = value;
            if (spare >= 6 && extra + 6 <= record.end && arrayElementSizes.has(id)) {
                const at = extra - record.dataOffset, n = view.getUint16(at, true), allocated = view.getUint16(at + 2, true), rawSize = view.getUint16(at + 4, true), size = rawSize === 0xFFF0 ? 4 : rawSize;
                if (n <= allocated && arrayElementSizes.get(id).includes(rawSize) && n * size === value) {
                    length += 6;
                    spare -= 6;
                    recovered.push(id);
                }
            }
            if (extra + length > record.end) {
                diagnostics.push({ code: 'FOPT_COMPLEX_LENGTH', severity: 'warning', message: `Complex property ${id} exceeds FOPT payload`, offset: record.offset });
                break;
            }
            complex.set(id, bytes.subarray(extra, extra + length));
            extra += length;
        }
    }
    if (recovered.length)
        diagnostics.push({ code: 'FOPT_ARRAY_LENGTH_COMPAT', severity: 'info', message: 'OfficeArt array lengths exclude their six-byte headers; bounded array headers were included when locating complex properties', offset: record.offset, details: { properties: recovered } });
    return { values, complex };
}
function nested(record, ctx) {
    if (record.children.length || !record.length)
        return record.children;
    const reader = { ...ctx, count: ctx.recordCount?.value ?? 0 };
    try {
        record.children = readRecords(reader, record.dataOffset, record.end);
        return record.children;
    }
    finally {
        if (ctx.recordCount)
            ctx.recordCount.value = reader.count;
    }
}
export function readDrawingDefaults(drawingGroup, bytes, diagnostics, limits, recordCount) {
    const defaults = {};
    if (!drawingGroup)
        return defaults;
    const complex = new Map();
    const roots = nested(drawingGroup, { bytes, diagnostics, limits, recordCount });
    const group = roots.find(r => r.type === RT.OfficeArtDggContainer);
    for (const r of group?.children ?? [])
        if (r.type === RT.OfficeArtFOPT || r.type === RT.OfficeArtTertiaryFOPT) {
            const properties = readProperties(r, bytes, diagnostics);
            for (const [id, value] of properties.values) {
                defaults[String(id)] = mergeProperty(id, defaults[String(id)], value);
                complex.delete(id);
            }
            for (const [id, blob] of properties.complex)
                complex.set(id, blob);
        }
    defaultComplexProperties.set(defaults, complex);
    return defaults;
}
function boolValue(values, id, bit, fallback) {
    const flags = values.get(id);
    return flags !== undefined && (flags & (1 << (bit + 16))) !== 0 ? (flags & (1 << bit)) !== 0 : fallback;
}
export function officeColor(value, colors, fallback = '#000000') {
    if (value & 0x08000000) {
        const scheme = colors[value & 255];
        if (scheme === undefined)
            return fallback;
        value = scheme;
    }
    else if (value & 0x10000000) {
        // System palette entries are machine-dependent. The two standard window colors are stable.
        if ((value & 255) === 5)
            return '#ffffff';
        if ((value & 255) === 8)
            return '#000000';
        return fallback;
    }
    return '#' + [value & 255, (value >>> 8) & 255, (value >>> 16) & 255].map(x => x.toString(16).padStart(2, '0')).join('');
}
function inlinePicture(blob, ctx, record, property) {
    const offset = blob.byteOffset - ctx.bytes.byteOffset, id = `inline-image-${offset}-${property}`;
    let budget = assetBudgets.get(ctx.assets);
    if (!budget) {
        budget = { count: 0, bytes: 0, ids: new Set() };
        assetBudgets.set(ctx.assets, budget);
    }
    // A shared asset array can also receive sounds/OLE previews. Account for every new item.
    while (budget.count < ctx.assets.length) {
        const asset = ctx.assets[budget.count++];
        budget.bytes += asset.bytes.byteLength;
        budget.ids.add(asset.id);
    }
    if (budget.ids.has(id))
        return id;
    try {
        const asset = parseInlinePicture(ctx.bytes, offset, blob.byteLength, id, ctx.diagnostics, ctx.limits.maxAssetBytes - budget.bytes);
        ctx.assets.push(asset);
        budget.count++;
        budget.bytes += asset.bytes.byteLength;
        budget.ids.add(id);
        return id;
    }
    catch (error) {
        if (error instanceof PptError && error.code === 'LIMIT_ASSETS')
            throw error;
        warn(ctx, 'INLINE_BLIP_INVALID', error instanceof Error ? error.message : String(error), record);
        return undefined;
    }
}
function fill(values, complex, ctx, record, preset) {
    const open = preset === 20 || preset >= 32 && preset <= 40;
    if (!boolValue(values, 447, 4, !open && preset !== 202 && preset !== 75))
        return { kind: 'none' };
    const rawColor = values.get(385) ?? 0xFFFFFF, rawBack = values.get(387) ?? 0xFFFFFF;
    const color = officeColor(rawColor, ctx.colors, '#ffffff'), opacity = clamp(fixed(values.get(386) ?? 65536));
    const type = values.get(384) ?? 0;
    if (type >= 1 && type <= 3) {
        const embedded = complex.get(390), assetId = embedded ? inlinePicture(embedded, ctx, record, 390) : ctx.pictureIds.get(values.get(390) ?? 0);
        if (assetId)
            return { kind: 'image', assetId, opacity, imageStyle: type === 1 ? 'pattern' : type === 2 ? 'texture' : 'picture', ...(type === 1 ? { color, colorIndex: colorIndex(rawColor), backColor: officeColor(rawBack, ctx.colors, '#ffffff'), backColorIndex: colorIndex(rawBack), backOpacity: clamp(fixed(values.get(388) ?? 65536)) } : {}) };
        warn(ctx, 'FILL_IMAGE_MISSING', 'Pattern or picture fill has no usable embedded image; using its saved foreground color', record);
    }
    if (type >= 4 && type <= 8) {
        const back = officeColor(rawBack, ctx.colors, '#ffffff'), backOpacity = clamp(fixed(values.get(388) ?? 65536));
        let stops = [{ position: 0, color, colorIndex: colorIndex(rawColor), opacity }, { position: 1, color: back, colorIndex: colorIndex(rawBack), opacity: backOpacity }];
        const shade = complex.get(407), arr = shade ? officeArray(shade) : undefined;
        if (arr && arr.size === 8) {
            stops = [];
            for (let i = 0; i < arr.count; i++) {
                const raw = arr.view.getUint32(6 + i * 8, true), position = clamp(fixed(arr.view.getUint32(6 + i * 8 + 4, true)));
                stops.push({ position, color: officeColor(raw, ctx.colors), colorIndex: colorIndex(raw), opacity: opacity + (backOpacity - opacity) * position });
            }
            stops.sort((a, b) => a.position - b.position);
            if (stops.length < 2)
                stops = [{ position: 0, color, colorIndex: colorIndex(rawColor), opacity }, { position: 1, color: back, colorIndex: colorIndex(rawBack), opacity: backOpacity }];
        }
        // MS-ODRAW 2.3.7.15 Figure 5: positive focus puts the last color inside,
        // negative focus puts the first color inside; +/-100 reverse the gradient.
        const focus = clamp((values.get(396) ?? 0) | 0, -100, 100);
        if (Math.abs(focus) === 100)
            stops = stops.map(s => ({ ...s, position: 1 - s.position })).reverse();
        else if (focus !== 0) {
            const center = focus > 0 ? 1 - focus / 100 : -focus / 100;
            const left = focus > 0 ? stops : [...stops].reverse().map(s => ({ ...s, position: 1 - s.position }));
            const right = [...left].reverse().map(s => ({ ...s, position: 1 - s.position }));
            stops = [...left.map(s => ({ ...s, position: s.position * center })), ...right.slice(1).map(s => ({ ...s, position: center + s.position * (1 - center) }))];
        }
        const gradientRect = { left: clamp(fixed(values.get(397) ?? 0)), top: clamp(fixed(values.get(398) ?? 0)), right: clamp(fixed(values.get(399) ?? 0)), bottom: clamp(fixed(values.get(400) ?? 0)) };
        const gradientType = type === 5 ? 'rectangular' : type === 6 ? 'shape' : 'linear';
        if (type === 8)
            warn(ctx, 'FILL_GRADIENT_TITLE_APPROXIMATED', 'Host-defined title gradient uses its saved linear angle and stops', record);
        if (type === 5 || type === 6)
            ctx.diagnostics.push({ code: 'FILL_GRADIENT_SAMPLED', severity: 'info', message: 'Concentric gradient is rendered with 96 bounded color intervals', offset: record.offset, details: { fillType: type, steps: 96 } });
        return { kind: 'gradient', gradientType, gradientScaled: type === 7, gradientRect, gradientCenter: { x: (gradientRect.left + gradientRect.right) / 2, y: (gradientRect.top + gradientRect.bottom) / 2 }, rotateWithShape: boolValue(values, 447, 5, false), angle: -90 - fixed(values.get(395) ?? 0), stops, opacity: 1 };
    }
    if (type === 9)
        return { kind: 'none' };
    return { kind: 'solid', color, colorIndex: colorIndex(rawColor), opacity };
}
function line(values, ctx, preset) {
    if (!boolValue(values, 511, 3, preset !== 202 && preset !== 75))
        return undefined;
    const width = Math.max(0, ((values.get(0x01CB) ?? 9525) | 0) / 9525);
    const rawColor = values.get(448) ?? 0;
    const result = { color: officeColor(rawColor, ctx.colors), colorIndex: colorIndex(rawColor), width, opacity: clamp(fixed(values.get(449) ?? 65536)) };
    const dashes = { 1: [3, 1], 2: [1, 1], 3: [3, 1, 1, 1], 4: [3, 1, 1, 1, 1, 1], 5: [1, 3], 6: [4, 3], 7: [8, 3], 8: [4, 3, 1, 3], 9: [8, 3, 1, 3], 10: [8, 3, 1, 3, 1, 3] };
    const dash = dashes[values.get(0x01CE) ?? 0];
    if (dash)
        result.dash = dash.map(x => x * (width || 1));
    const arrows = { 1: 'triangle', 2: 'stealth', 3: 'diamond', 4: 'oval', 5: 'open' };
    result.startArrow = arrows[values.get(0x01D0) ?? 0];
    result.endArrow = arrows[values.get(0x01D1) ?? 0];
    result.cap = values.get(0x01D7) === 0 ? 'round' : values.get(0x01D7) === 1 ? 'square' : 'butt';
    return result;
}
function shadow(values, ctx) {
    if (!boolValue(values, 575, 1, false))
        return undefined;
    const type = values.get(512) ?? 0;
    if (![0, 1, 5].includes(type))
        return undefined;
    const rawColor = values.get(513) ?? 0x00808080;
    // MS-ODRAW 2.3.13.22 recommends ignoring shadowSoftness; ordinary binary shadows are hard-edged.
    const offsetX = ((values.get(517) ?? 25400) | 0) / 9525, offsetY = ((values.get(518) ?? 25400) | 0) / 9525, highlight = values.get(514) ?? 0x00CBCBCB;
    if (type === 0 && !boolValue(values, 575, 0, false))
        return { type: 0, color: officeColor(rawColor, ctx.colors, '#808080'), colorIndex: colorIndex(rawColor), opacity: clamp(fixed(values.get(516) ?? 65536)), offsetX, offsetY, blur: 0 };
    return { type: type, color: officeColor(rawColor, ctx.colors, '#808080'), colorIndex: colorIndex(rawColor), opacity: clamp(fixed(values.get(516) ?? 65536)), offsetX, offsetY, blur: 0, secondOffsetX: type === 5 ? -offsetX : ((values.get(519) ?? 0) | 0) / 9525, secondOffsetY: type === 5 ? -offsetY : ((values.get(520) ?? 0) | 0) / 9525, highlightColor: officeColor(highlight, ctx.colors, '#cbcbcb'), highlightColorIndex: colorIndex(highlight), originX: fixed(values.get(528) ?? 0) / 9525, originY: fixed(values.get(529) ?? 0) / 9525, obscured: boolValue(values, 575, 0, false) };
}
function wordArt(values, complex, ctx, preset, record) {
    const bytes = complex.get(192);
    if (!bytes || !boolValue(values, 255, 14, true))
        return undefined;
    if (bytes.byteLength > ctx.limits.maxTextLength * 2)
        throw new PptError('LIMIT_TEXT', 'WordArt text exceeds the configured character limit', record.offset);
    const font = complex.get(197), align = values.get(194) ?? 1;
    return { text: trimTrailingNulls(utf16.decode(bytes)), fontFamily: font ? trimTrailingNulls(utf16.decode(font)) : 'Arial', fontSize: Math.max(1, fixed(values.get(195) ?? 36 * 65536) * 4 / 3), spacing: clamp(fixed(values.get(196) ?? 65536), 0, 5), bold: boolValue(values, 255, 5, false), italic: boolValue(values, 255, 4, false), vertical: boolValue(values, 255, 13, false), alignment: align === 2 ? 'left' : align === 3 ? 'right' : align === 0 || align === 4 || align === 5 ? 'justify' : 'center', warpPreset: preset, adjustments: Array.from({ length: 8 }, (_, i) => (values.get(327 + i) ?? (i === 0 ? 5400 : 0)) | 0) };
}
function extrusion(values, ctx, record, id) {
    if (!boolValue(values, 703, 3, false))
        return undefined;
    const constrain = boolValue(values, 767, 4, true), parallel = boolValue(values, 767, 2, true), useColor = boolValue(values, 703, 1, false), rawColor = useColor ? (values.get(647) ?? 0x100000F7) : (values.get(385) ?? 0xFFFFFF), base = officeColor(values.get(385) ?? 0xFFFFFF, ctx.colors, '#ffffff');
    const unsupported = [...values.keys()].filter(key => key >= 640 && key <= 767 && ![641, 644, 645, 647, 703, 704, 705, 715, 716, 717, 718, 719, 720, 721, 722, 767].includes(key));
    if (!constrain || unsupported.length)
        ctx.diagnostics.push({ code: 'EXTRUSION_PARAMETERS_UNSUPPORTED', severity: 'warning', message: 'Custom rotation axes, light vectors, bevel, or specular parameters are retained; supported extrusion uses constrained rotations and diffuse shading', offset: record.offset, shapeId: id, details: { properties: unsupported, constrainedRotation: constrain } });
    ctx.diagnostics.push({ code: 'EXTRUSION_SHADING_APPROXIMATED', severity: 'warning', message: '3D shape uses a tessellated side mesh with diffuse lighting; Office material and lighting parity is not claimed', offset: record.offset, shapeId: id });
    // The published viewpoint pages describe FixedPoint EMUs, but their default
    // constants and independently rendered binary files use signed EMU magnitudes.
    // Keep this compatibility interpretation visible until PowerPoint validation.
    if (!parallel)
        ctx.diagnostics.push({ code: 'EXTRUSION_CAMERA_UNITS_COMPAT', severity: 'warning', message: 'Perspective camera uses signed EMU magnitudes consistent with saved binary defaults; the published FixedPoint unit wording is ambiguous', offset: record.offset, shapeId: id });
    return { depth: clamp(((values.get(645) ?? 457200) | 0), 0, 0x07445A00) / 9525, forward: clamp(((values.get(644) ?? 0) | 0), 0, 0x007445A0) / 9525, rotationY: constrain ? clamp(fixed(values.get(704) ?? 0), -90, 90) : 0, rotationX: constrain ? clamp(fixed(values.get(705) ?? 0), -90, 90) : 0, skewAngle: fixed(values.get(720) ?? 0xFF790000), skewAmount: clamp((values.get(721) ?? 50) | 0, -100, 100), color: officeColor(rawColor, ctx.colors, base), colorIndex: colorIndex(rawColor), ambient: clamp(fixed(values.get(722) ?? 20000)), diffuse: clamp(fixed(values.get(641) ?? 65536)), metallic: boolValue(values, 703, 2, false), parallel, camera: parallel ? undefined : { x: ((values.get(715) ?? 1250000) | 0) / 9525, y: ((values.get(716) ?? -1250000) | 0) / 9525, z: ((values.get(717) ?? 9000000) | 0) / 9525 }, origin: parallel ? undefined : { x: fixed(values.get(718) ?? 32768), y: fixed(values.get(719) ?? -32768) } };
}
/** PPT client anchors differ from ODRAW child anchors: top comes before left. */
export function readAnchor(record, bytes) {
    const v = dataView(bytes, record);
    let left, top, right, bottom;
    if (record.type === RT.OfficeArtClientAnchor && record.length === 8) {
        top = v.getInt16(0, true);
        left = v.getInt16(2, true);
        right = v.getInt16(4, true);
        bottom = v.getInt16(6, true);
    }
    else if (record.length >= 16) {
        if (record.type === RT.OfficeArtClientAnchor) {
            top = v.getInt32(0, true);
            left = v.getInt32(4, true);
        }
        else {
            left = v.getInt32(0, true);
            top = v.getInt32(4, true);
        }
        right = v.getInt32(8, true);
        bottom = v.getInt32(12, true);
    }
    else
        return undefined;
    return { x: left / 6, y: top / 6, width: (right - left) / 6, height: (bottom - top) / 6 };
}
function cloneText(text) {
    return { ...text, margins: { ...text.margins }, paragraphs: text.paragraphs.map(p => ({ ...p, style: { ...p.style, bullet: p.style.bullet ? { ...p.style.bullet } : undefined }, runs: p.runs.map(r => ({ ...r, style: { ...r.style } })) })) };
}
function textForShape(records, values, complex, ctx, record) {
    let frame;
    for (const box of records.filter(r => r.type === RT.OfficeArtClientTextBox)) {
        const content = nested(box, ctx), outline = content.find(r => r.type === RT.OutlineTextRefAtom);
        if (outline && outline.length >= 4) {
            const index = dataView(ctx.bytes, outline).getUint32(0, true), found = ctx.slideTexts[index];
            if (found)
                frame = cloneText(found);
            else
                warn(ctx, 'OUTLINE_TEXT_MISSING', `Text outline index ${index} is not present in the slide text list`, outline);
        }
        const own = parseTextFrames(content, ctx);
        if (own.length)
            frame = own[0];
    }
    const wordart = complex.get(192);
    if (!frame && wordart) {
        if (wordart.byteLength > ctx.limits.maxTextLength * 2)
            throw new PptError('LIMIT_TEXT', 'WordArt text exceeds the configured character limit', record.offset);
        const text = trimTrailingNulls(utf16.decode(wordart));
        const font = complex.get(197), fontFamily = font ? trimTrailingNulls(utf16.decode(font)) : undefined;
        frame = { paragraphs: [{ level: 0, style: { alignment: 'center' }, runs: [{ text, style: { fontFamily, fontSize: fixed(values.get(195) ?? 36 * 65536) * 4 / 3, color: officeColor(values.get(385) ?? 0, ctx.colors), colorIndex: colorIndex(values.get(385) ?? 0) } }] }], margins: { left: 0, top: 0, right: 0, bottom: 0 }, verticalAlignment: 'middle', wrap: true, sourceText: text };
    }
    if (!frame)
        return undefined;
    for (const p of frame.paragraphs) {
        for (const r of p.runs)
            if (r.style.colorIndex !== undefined)
                r.style.color = officeColor(0x08000000 | r.style.colorIndex, ctx.colors, r.style.color);
        if (p.style.bullet?.colorIndex !== undefined)
            p.style.bullet.color = officeColor(0x08000000 | p.style.bullet.colorIndex, ctx.colors, p.style.bullet.color);
    }
    frame.margins = { left: ((values.get(129) ?? 91440) | 0) / 9525, top: ((values.get(130) ?? 45720) | 0) / 9525, right: ((values.get(131) ?? 91440) | 0) / 9525, bottom: ((values.get(132) ?? 45720) | 0) / 9525 };
    const anchor = values.get(135) ?? 0;
    frame.verticalAlignment = anchor === 1 || anchor === 4 ? 'middle' : anchor === 2 || anchor === 5 || anchor === 7 || anchor === 9 ? 'bottom' : 'top';
    frame.wrap = (values.get(133) ?? 0) !== 2;
    // MS-ODRAW 2.3.21.15: fFitShapeToText is low bit 1 / use bit 17.
    // The neighboring low bit 0 is reserved; it is not evidence for text shrinking.
    frame.autofit = boolValue(values, 191, 1, false) ? 'resize' : 'none';
    const flow = values.get(136) ?? 0;
    if (flow === 1 || flow === 3 || flow === 5)
        frame.direction = 'vertical';
    else if (flow === 2)
        frame.direction = 'vertical270';
    return frame;
}
function getPlaceholder(records, ctx) {
    for (const client of records.filter(r => r.type === RT.OfficeArtClientData))
        for (const r of nested(client, ctx))
            if (r.type === RT.OEPlaceholderAtom && r.length >= 8) {
                const v = dataView(ctx.bytes, r);
                return { position: v.getUint32(0, true), type: v.getUint8(4) };
            }
    return undefined;
}
function flatten(shapes) { const out = []; for (const s of shapes) {
    out.push(s);
    if (s.children)
        out.push(...flatten(s.children));
} return out; }
function shape(record, ctx, masters) {
    const records = record.children, fsp = records.find(r => r.type === RT.OfficeArtFSP);
    if (!fsp || fsp.length < 8) {
        warn(ctx, 'SHAPE_HEADER', 'Shape container is missing its OfficeArtFSP', record);
        return undefined;
    }
    if (++ctx.shapeCount.value > ctx.limits.maxShapes)
        throw new PptError('LIMIT_SHAPES', 'Shape count exceeds the configured limit', record.offset);
    const v = dataView(ctx.bytes, fsp), id = v.getUint32(0, true), flags = v.getUint32(4, true), preset = fsp.instance;
    if (flags & 8)
        return undefined;
    const values = new Map(), complex = new Map();
    const defaults = ctx.drawingDefaults;
    for (const [key, value] of Object.entries(defaults ?? {}))
        values.set(Number(key), value);
    for (const [key, blob] of defaults ? defaultComplexProperties.get(defaults) ?? [] : [])
        complex.set(key, blob);
    const own = { values: new Map(), complex: new Map() };
    for (const r of records)
        if (r.type === RT.OfficeArtFOPT || r.type === RT.OfficeArtSecondaryFOPT || r.type === RT.OfficeArtTertiaryFOPT) {
            const prop = readProperties(r, ctx.bytes, ctx.diagnostics);
            for (const [key, value] of prop.values) {
                own.values.set(key, mergeProperty(key, own.values.get(key), value));
                own.complex.delete(key);
            }
            for (const [key, value] of prop.complex)
                own.complex.set(key, value);
        }
    const placeholder = getPlaceholder(records, ctx);
    const masterId = own.values.get(769) || undefined;
    const master = masters.find(s => masterId !== undefined ? s.id === masterId : placeholder && s.placeholder && s.placeholder.type === placeholder.type && (s.placeholder.position === placeholder.position || placeholder.position === 0xFFFFFFFF));
    for (const [key, value] of Object.entries(master?.source?.properties ?? {}))
        if (/^\d+$/.test(key)) {
            values.set(Number(key), mergeProperty(Number(key), values.get(Number(key)), value));
            complex.delete(Number(key));
        }
    if (master)
        for (const [key, blob] of shapeComplexProperties.get(ctx.bytes)?.get(master) ?? [])
            complex.set(key, blob);
    for (const [key, value] of own.values) {
        values.set(key, mergeProperty(key, values.get(key), value));
        complex.delete(key);
    }
    for (const [key, value] of own.complex)
        complex.set(key, value);
    const anchor = records.find(r => r.type === RT.OfficeArtChildAnchor) || records.find(r => r.type === RT.OfficeArtClientAnchor);
    const bounds = (anchor ? readAnchor(anchor, ctx.bytes) : undefined) ?? (master ? { ...master.bounds } : undefined) ?? { x: 0, y: 0, width: 0, height: 0 };
    if (!anchor && !master && !(flags & 5) && !(flags & 0x400))
        warn(ctx, 'SHAPE_ANCHOR_MISSING', 'Shape has no usable anchor or matching master placeholder', record, id);
    let flipH = !!(flags & 64), flipV = !!(flags & 128);
    if (bounds.width < 0) {
        bounds.x += bounds.width;
        bounds.width = -bounds.width;
        flipH = !flipH;
    }
    if (bounds.height < 0) {
        bounds.y += bounds.height;
        bounds.height = -bounds.height;
        flipV = !flipV;
    }
    const nameBytes = complex.get(896), name = nameBytes ? trimTrailingNulls(utf16.decode(nameBytes)) : undefined;
    const result = { id, kind: flags & 1 ? 'group' : 'shape', name, bounds, rotation: fixed(values.get(4) ?? 0), flipH, flipV, preset, fill: fill(values, complex, ctx, record, preset), line: line(values, ctx, preset), shadow: shadow(values, ctx), placeholder, hidden: boolValue(values, 959, 1, false), source: { offset: record.offset, recordType: record.type, shapeType: preset, properties: { ...Object.fromEntries(values), fspFlags: flags, hasAnchor: anchor ? 1 : 0 } } };
    const group = records.find(r => r.type === RT.OfficeArtFSPGR);
    if (group)
        result.groupBounds = readAnchor(group, ctx.bytes);
    result.text = textForShape(records, values, complex, ctx, record);
    result.wordArt = wordArt(values, complex, ctx, preset, record);
    if (result.wordArt)
        warn(ctx, 'WORDART_ENVELOPE_APPROXIMATED', 'WordArt is rendered by deforming browser glyphs through a bounded envelope mesh; Office-specific font fitting and custom envelope formulas are not fully reproduced', record, id);
    result.extrusion = extrusion(values, ctx, record, id);
    const geometry = customGeometry(values, complex, ctx.diagnostics, id, record.offset, bounds);
    if (geometry.path) {
        result.path = geometry.path;
        result.pathParts = geometry.pathParts;
        result.pathBounds = geometry.pathBounds;
    }
    else if (!result.wordArt) {
        const adjusted = adjustedPresetGeometry(preset, values, bounds);
        if (adjusted) {
            result.path = adjusted.path;
            result.pathBounds = adjusted.pathBounds;
            if (adjusted.approximate)
                warn(ctx, 'PRESET_ADJUSTMENT_APPROXIMATED', `Preset ${preset} uses an analytic adjustable envelope; exact Office preset construction is not fully specified`, record, id);
        }
    }
    if (geometry.noFill)
        result.fill = { kind: 'none' };
    if (geometry.noLine)
        result.line = undefined;
    const imageIndex = values.get(260), embeddedImage = complex.get(260);
    if (imageIndex || embeddedImage) {
        const assetId = embeddedImage ? inlinePicture(embeddedImage, ctx, record, 260) : ctx.pictureIds.get(imageIndex);
        if (assetId) {
            result.kind = 'image';
            result.image = { assetId, crop: { top: fixed(values.get(256) ?? 0), bottom: fixed(values.get(257) ?? 0), left: fixed(values.get(258) ?? 0), right: fixed(values.get(259) ?? 0) }, brightness: clamp(((values.get(265) ?? 0) | 0) / 32768, -1, 1), contrast: Math.max(0, fixed(values.get(264) ?? 65536)) };
        }
        else {
            result.kind = 'unsupported';
            warn(ctx, 'SHAPE_IMAGE_MISSING', `Picture index ${imageIndex} has no available image bytes`, record, id);
        }
    }
    // Content that needs dedicated semantic renderers remains visible in diagnostics.
    const shadowActive = boolValue(values, 575, 1, false);
    const shadowUnsupported = shadowActive && (!result.shadow || ![0, 1, 5].includes(result.shadow.type) || boolValue(values, 575, 0, false) && result.fill.kind === 'none');
    const effectProperties = [...values.keys()].filter(key => shadowUnsupported && key >= 512 && key <= 575);
    if (effectProperties.length) {
        result.source.unsupportedProperties = effectProperties;
        warn(ctx, 'SHAPE_EFFECT_UNSUPPORTED', 'Rich/shape/drawing shadow transforms or obscured unfilled interiors are preserved but not fully rendered', record, id);
    }
    if (own.complex.has(937))
        ctx.diagnostics.push({ code: 'DRAWINGML_ALTERNATE_IGNORED', severity: 'info', message: 'Alternative DrawingML package is ignored as recommended by MS-ODRAW; its binary OfficeArt shape is used', offset: record.offset, shapeId: id, details: { property: 937, byteLength: own.complex.get(937).byteLength } });
    if (flags & 16)
        warn(ctx, 'OLE_PREVIEW_ONLY', 'OLE object uses its saved presentation preview; embedded application behavior is not executed', record, id);
    let cache = shapeComplexProperties.get(ctx.bytes);
    if (!cache) {
        cache = new WeakMap();
        shapeComplexProperties.set(ctx.bytes, cache);
    }
    cache.set(result, complex);
    return result;
}
/** Shape tree order is paint order; patriarch groups only establish the drawing root. */
export function parseDrawing(record, ctx) {
    const masters = flatten(ctx.masterShapes ?? []);
    const collect = (nodes, depth) => {
        if (depth > ctx.limits.maxDepth)
            throw new PptError('LIMIT_DEPTH', 'OfficeArt group nesting exceeds limit', record.offset);
        const out = [];
        for (const node of nodes) {
            if (node.type === RT.OfficeArtSpgrContainer) {
                const first = node.children.find(r => r.type === RT.OfficeArtSpContainer), header = first ? shape(first, ctx, masters) : undefined;
                const children = collect(node.children.filter(r => r !== first), depth + 1);
                if (header && !(header.source.properties.fspFlags & 4)) {
                    header.kind = 'group';
                    header.children = children;
                    header.fill = { kind: 'none' };
                    header.line = undefined;
                    if (header.bounds.width === 0 && header.bounds.height === 0 && header.groupBounds)
                        header.bounds = { ...header.groupBounds };
                    out.push(header);
                }
                else
                    out.push(...children);
            }
            else if (node.type === RT.OfficeArtSpContainer) {
                const s = shape(node, ctx, masters);
                if (s)
                    out.push(s);
            }
            else if (node.type === RT.OfficeArtDgContainer || node.type === RT.PPDrawing)
                out.push(...collect(nested(node, ctx), depth + 1));
        }
        return out;
    };
    return collect(record.type === RT.OfficeArtDgContainer ? [record] : nested(record, ctx), 0);
}
