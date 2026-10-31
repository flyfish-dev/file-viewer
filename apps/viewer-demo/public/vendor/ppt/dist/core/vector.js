import { BinaryReader } from './binary.js';
import { dataUrlFromBytes, escapeHtml, trimTrailingNulls } from './utils.js';
import { escapeXmlText } from './xml-text.js';
import { readEmfFont, readWmfFont } from './vector-font.js';
import { PptError } from './errors.js';
import { decodeBgraBitmap, encodeRgbaPng } from './raster.js';
const DEFAULT_VECTOR_LIMITS = { maxOutputBytes: 32 * 1024 * 1024, maxRecords: 100000, maxPoints: 500000, maxObjects: 65536, maxStateDepth: 1024 };
const DEFAULT_PEN = { color: '#000000', width: 1 };
const DEFAULT_BRUSH = { color: '#ffffff', none: true };
const DEFAULT_FONT = { family: 'sans-serif', size: 12 };
const IDENTITY_MATRIX = { m11: 1, m12: 0, m21: 0, m22: 1, dx: 0, dy: 0 };
const PLACEABLE_WMF_KEY = 0x9ac6cdd7;
const WMF_HEADER_SIZE = 18;
const WMF_RECORD = {
    META_EOF: 0x0000,
    META_SAVEDC: 0x001e,
    META_RESTOREDC: 0x0127,
    META_SETTEXTALIGN: 0x012e,
    META_SETBKMODE: 0x0102,
    META_SETPOLYFILLMODE: 0x0106,
    META_SETBKCOLOR: 0x0201,
    META_SETTEXTCOLOR: 0x0209,
    META_SETWINDOWORG: 0x020b,
    META_SETWINDOWEXT: 0x020c,
    META_SETVIEWPORTORG: 0x020d,
    META_SETVIEWPORTEXT: 0x020e,
    META_OFFSETWINDOWORG: 0x020f,
    META_OFFSETVIEWPORTORG: 0x0211,
    META_LINETO: 0x0213,
    META_MOVETO: 0x0214,
    META_POLYGON: 0x0324,
    META_POLYLINE: 0x0325,
    META_TEXTOUT: 0x0521,
    META_POLYPOLYGON: 0x0538,
    META_ELLIPSE: 0x0418,
    META_RECTANGLE: 0x041b,
    META_ROUNDRECT: 0x061c,
    META_ARC: 0x0817,
    META_PIE: 0x081a,
    META_CHORD: 0x0830,
    META_INTERSECTCLIPRECT: 0x0416,
    META_EXCLUDECLIPRECT: 0x0415,
    META_EXTTEXTOUT: 0x0a32,
    META_CREATEBRUSHINDIRECT: 0x02fc,
    META_CREATEPENINDIRECT: 0x02fa,
    META_CREATEFONTINDIRECT: 0x02fb,
    META_SELECTOBJECT: 0x012d,
    META_DELETEOBJECT: 0x01f0,
};
const EMF_RECORD = {
    EMR_HEADER: 0x00000001,
    EMR_POLYBEZIER: 0x00000002,
    EMR_POLYGON: 0x00000003,
    EMR_POLYLINE: 0x00000004,
    EMR_POLYBEZIERTO: 0x00000005,
    EMR_POLYLINETO: 0x00000006,
    EMR_POLYPOLYLINE: 0x00000007,
    EMR_POLYPOLYGON: 0x00000008,
    EMR_SETWINDOWEXTEX: 0x00000009,
    EMR_SETWINDOWORGEX: 0x0000000a,
    EMR_SETVIEWPORTEXTEX: 0x0000000b,
    EMR_SETVIEWPORTORGEX: 0x0000000c,
    EMR_EOF: 0x0000000e,
    EMR_SETBKMODE: 0x00000012,
    EMR_SETPOLYFILLMODE: 0x00000013,
    EMR_SETTEXTALIGN: 0x00000016,
    EMR_SETTEXTCOLOR: 0x00000018,
    EMR_SETBKCOLOR: 0x00000019,
    EMR_MOVETOEX: 0x0000001b,
    EMR_SAVEDC: 0x00000021,
    EMR_RESTOREDC: 0x00000022,
    EMR_SETWORLDTRANSFORM: 0x00000023,
    EMR_MODIFYWORLDTRANSFORM: 0x00000024,
    EMR_SELECTOBJECT: 0x00000025,
    EMR_CREATEPEN: 0x00000026,
    EMR_CREATEBRUSHINDIRECT: 0x00000027,
    EMR_DELETEOBJECT: 0x00000028,
    EMR_ELLIPSE: 0x0000002a,
    EMR_RECTANGLE: 0x0000002b,
    EMR_ROUNDRECT: 0x0000002c,
    EMR_ARC: 0x0000002d,
    EMR_CHORD: 0x0000002e,
    EMR_PIE: 0x0000002f,
    EMR_ARCTO: 0x00000037,
    EMR_SETARCDIRECTION: 0x00000039,
    EMR_INTERSECTCLIPRECT: 0x0000001e,
    EMR_EXCLUDECLIPRECT: 0x0000001d,
    EMR_BEGINPATH: 0x0000003b,
    EMR_ENDPATH: 0x0000003c,
    EMR_CLOSEFIGURE: 0x0000003d,
    EMR_FILLPATH: 0x0000003e,
    EMR_STROKEANDFILLPATH: 0x0000003f,
    EMR_STROKEPATH: 0x00000040,
    EMR_SELECTCLIPPATH: 0x00000043,
    EMR_LINETO: 0x00000036,
    EMR_BITBLT: 0x0000004c,
    EMR_STRETCHBLT: 0x0000004d,
    EMR_STRETCHDIBITS: 0x00000051,
    EMR_EXTCREATEFONTINDIRECTW: 0x00000052,
    EMR_EXTTEXTOUTA: 0x00000053,
    EMR_EXTTEXTOUTW: 0x00000054,
    EMR_POLYBEZIER16: 0x00000055,
    EMR_POLYGON16: 0x00000056,
    EMR_POLYLINE16: 0x00000057,
    EMR_POLYBEZIERTO16: 0x00000058,
    EMR_POLYLINETO16: 0x00000059,
    EMR_POLYPOLYLINE16: 0x0000005a,
    EMR_POLYPOLYGON16: 0x0000005b,
    EMR_EXTCREATEPEN: 0x0000005f,
    EMR_SMALLTEXTOUT: 0x0000006c,
    EMR_ALPHABLEND: 0x00000072,
};
// Fixed prefixes accessed by the renderer; variable arrays receive their own size checks.
const WMF_MIN_BYTES = { 0: 6, 0x0102: 8, 0x0106: 8, 0x0201: 10, 0x0209: 10, 0x020b: 10, 0x020c: 10, 0x020d: 10, 0x020e: 10, 0x020f: 10, 0x0211: 10, 0x0213: 10, 0x0214: 10, 0x0324: 8, 0x0325: 8, 0x0521: 12, 0x0538: 8, 0x0418: 14, 0x041b: 14, 0x061c: 18, 0x02fc: 14, 0x02fa: 16, 0x02fb: 24, 0x012d: 8, 0x01f0: 8 };
const EMF_MIN_BYTES = { 1: 88, 2: 28, 3: 28, 4: 28, 5: 28, 6: 28, 7: 32, 8: 32, 9: 16, 10: 16, 11: 16, 12: 16, 14: 20, 18: 12, 19: 12, 22: 12, 24: 12, 25: 12, 27: 16, 33: 8, 34: 12, 35: 32, 36: 36, 37: 12, 38: 28, 39: 24, 40: 12, 42: 24, 43: 24, 44: 32, 54: 16, 59: 8, 60: 8, 61: 8, 62: 24, 63: 24, 64: 24, 67: 12, 76: 100, 77: 108, 81: 80, 82: 104, 83: 76, 84: 76, 85: 28, 86: 28, 87: 28, 88: 28, 89: 28, 90: 32, 91: 32, 95: 52, 108: 36, 114: 108 };
Object.assign(WMF_MIN_BYTES, { 0x001e: 6, 0x0127: 8, 0x012e: 8, 0x0817: 22, 0x081a: 22, 0x0830: 22, 0x0415: 14, 0x0416: 14, 0x0a32: 14 });
Object.assign(EMF_MIN_BYTES, { 29: 24, 30: 24, 45: 40, 46: 40, 47: 40, 55: 40, 57: 12, 83: 60, 84: 60 });
const STOCK_OBJECT_BASE = 0x80000000;
const STOCK_OBJECT = {
    WHITE_BRUSH: STOCK_OBJECT_BASE,
    LTGRAY_BRUSH: STOCK_OBJECT_BASE + 1,
    GRAY_BRUSH: STOCK_OBJECT_BASE + 2,
    DKGRAY_BRUSH: STOCK_OBJECT_BASE + 3,
    BLACK_BRUSH: STOCK_OBJECT_BASE + 4,
    NULL_BRUSH: STOCK_OBJECT_BASE + 5,
    WHITE_PEN: STOCK_OBJECT_BASE + 6,
    BLACK_PEN: STOCK_OBJECT_BASE + 7,
    NULL_PEN: STOCK_OBJECT_BASE + 8,
};
const MODIFY_WORLD_TRANSFORM = {
    MWT_IDENTITY: 1,
    MWT_LEFTMULTIPLY: 2,
    MWT_RIGHTMULTIPLY: 3,
    MWT_SET: 4,
};
function numberCss(value) {
    if (!Number.isFinite(value))
        throw new PptError('METAFILE_COORDINATE', 'Metafile contains a non-finite transformed coordinate');
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
function rectWidth(rect) {
    return Math.max(1, rect.right - rect.left || 0);
}
function rectHeight(rect) {
    return Math.max(1, rect.bottom - rect.top || 0);
}
function normalizeRect(rect) {
    return {
        left: Math.min(rect.left, rect.right),
        top: Math.min(rect.top, rect.bottom),
        right: Math.max(rect.left, rect.right),
        bottom: Math.max(rect.top, rect.bottom),
    };
}
function updateBounds(ctx, points) {
    for (const point of points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
            continue;
        if (!ctx.contentBounds) {
            ctx.contentBounds = { left: point.x, top: point.y, right: point.x, bottom: point.y };
            continue;
        }
        ctx.contentBounds.left = Math.min(ctx.contentBounds.left, point.x);
        ctx.contentBounds.top = Math.min(ctx.contentBounds.top, point.y);
        ctx.contentBounds.right = Math.max(ctx.contentBounds.right, point.x);
        ctx.contentBounds.bottom = Math.max(ctx.contentBounds.bottom, point.y);
    }
}
function colorRefToCss(colorRef) {
    const red = colorRef & 0xff;
    const green = (colorRef >>> 8) & 0xff;
    const blue = (colorRef >>> 16) & 0xff;
    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}
function createBitmapFileHeader(pixelOffset, fileSize) {
    const header = new Uint8Array(14);
    const view = new DataView(header.buffer);
    header[0] = 0x42;
    header[1] = 0x4d;
    view.setUint32(2, fileSize >>> 0, true);
    view.setUint32(10, pixelOffset >>> 0, true);
    return header;
}
function bitmapInfoToBmp(bmi, bits) {
    if (bmi.length < 12 || !bits.length)
        return null;
    const pixelOffset = 14 + bmi.length;
    const fileSize = pixelOffset + bits.length;
    const out = new Uint8Array(fileSize);
    out.set(createBitmapFileHeader(pixelOffset, fileSize), 0);
    out.set(bmi, 14);
    out.set(bits, pixelOffset);
    return out;
}
function penStyleFromCode(style, width, color) {
    const normalizedWidth = Math.max(1, Math.abs(width) || 1);
    const base = { color, width: normalizedWidth };
    switch (style & 0x000f) {
        case 1:
            return { ...base, dasharray: `${normalizedWidth * 4} ${normalizedWidth * 2}` };
        case 2:
            return { ...base, dasharray: `${normalizedWidth} ${normalizedWidth * 2}` };
        case 3:
            return { ...base, dasharray: `${normalizedWidth * 4} ${normalizedWidth * 2} ${normalizedWidth} ${normalizedWidth * 2}` };
        case 4:
            return { ...base, dasharray: `${normalizedWidth * 4} ${normalizedWidth * 2} ${normalizedWidth} ${normalizedWidth * 2} ${normalizedWidth} ${normalizedWidth * 2}` };
        case 5:
            return { ...base, none: true };
        default:
            return base;
    }
}
function brushStyleFromCode(style, color, hatch = 0) {
    if (style === 1)
        return { color, none: true };
    if (style === 2 && hatch <= 5)
        return { color, hatch };
    return { color };
}
function cloneGraphicsState(state) {
    return {
        ...state,
        windowOrg: { ...state.windowOrg },
        windowExt: { ...state.windowExt },
        viewportOrg: { ...state.viewportOrg },
        viewportExt: { ...state.viewportExt },
        worldTransform: { ...state.worldTransform },
        currentPosition: { ...state.currentPosition },
        pen: { ...state.pen },
        brush: { ...state.brush },
        font: { ...state.font },
        clips: state.clips.map(c => ({ ...c })),
    };
}
function readXForm(reader, offset) {
    const view = reader.view;
    return {
        m11: reader.ensure(offset, 4) ? view.getFloat32(offset, true) : 1,
        m12: reader.ensure(offset + 4, 4) ? view.getFloat32(offset + 4, true) : 0,
        m21: reader.ensure(offset + 8, 4) ? view.getFloat32(offset + 8, true) : 0,
        m22: reader.ensure(offset + 12, 4) ? view.getFloat32(offset + 12, true) : 1,
        dx: reader.ensure(offset + 16, 4) ? view.getFloat32(offset + 16, true) : 0,
        dy: reader.ensure(offset + 20, 4) ? view.getFloat32(offset + 20, true) : 0,
    };
}
function multiplyMatrix(left, right) {
    return {
        m11: left.m11 * right.m11 + left.m12 * right.m21,
        m12: left.m11 * right.m12 + left.m12 * right.m22,
        m21: left.m21 * right.m11 + left.m22 * right.m21,
        m22: left.m21 * right.m12 + left.m22 * right.m22,
        dx: left.dx * right.m11 + left.dy * right.m21 + right.dx,
        dy: left.dx * right.m12 + left.dy * right.m22 + right.dy,
    };
}
function transformPoint(matrix, point) {
    return {
        x: point.x * matrix.m11 + point.y * matrix.m21 + matrix.dx,
        y: point.x * matrix.m12 + point.y * matrix.m22 + matrix.dy,
    };
}
function transformVector(matrix, vector) {
    return {
        x: vector.x * matrix.m11 + vector.y * matrix.m21,
        y: vector.x * matrix.m12 + vector.y * matrix.m22,
    };
}
function defaultContext(width, height, viewBox, limits, objectCount) {
    if (objectCount > limits.maxObjects)
        throw new PptError('METAFILE_OBJECT_LIMIT', 'Metafile object table exceeds the configured handle limit');
    return {
        width,
        height,
        viewBox,
        recordCount: 0,
        unresolvedGlyphRuns: 0,
        contentBounds: null,
        nodes: [], defs: [], defSequence: 0, patternIds: new Map(),
        stateStack: [],
        capturePath: false,
        pathData: [],
        pathPoints: [],
        objects: new Array(objectCount).fill(null),
        limits, outputBytes: 0, pathBytes: 0, pointCount: 0,
        freeObjectSlots: Array.from({ length: objectCount }, (_, index) => index),
        unsupportedRecordTypes: new Set(), activeRecordType: 0,
        state: {
            windowOrg: { x: viewBox.left, y: viewBox.top },
            windowExt: { x: rectWidth(viewBox), y: rectHeight(viewBox) },
            viewportOrg: { x: viewBox.left, y: viewBox.top },
            viewportExt: { x: rectWidth(viewBox), y: rectHeight(viewBox) },
            worldTransform: { ...IDENTITY_MATRIX },
            currentPosition: { x: 0, y: 0 },
            pen: { ...DEFAULT_PEN },
            brush: { ...DEFAULT_BRUSH },
            font: { ...DEFAULT_FONT },
            textColor: '#000000',
            bkColor: '#ffffff',
            bkMode: 1,
            textAlign: 0,
            polygonFillMode: 1,
            arcDirection: 1, clips: [],
        },
    };
}
function mapPoint(ctx, point) {
    const transformed = transformPoint(ctx.state.worldTransform, point);
    const windowExtX = ctx.state.windowExt.x || rectWidth(ctx.viewBox) || 1;
    const windowExtY = ctx.state.windowExt.y || rectHeight(ctx.viewBox) || 1;
    const viewportExtX = ctx.state.viewportExt.x || rectWidth(ctx.viewBox) || 1;
    const viewportExtY = ctx.state.viewportExt.y || rectHeight(ctx.viewBox) || 1;
    return {
        x: ctx.state.viewportOrg.x + ((transformed.x - ctx.state.windowOrg.x) * viewportExtX) / windowExtX,
        y: ctx.state.viewportOrg.y + ((transformed.y - ctx.state.windowOrg.y) * viewportExtY) / windowExtY,
    };
}
function mapVector(ctx, vector) {
    const transformed = transformVector(ctx.state.worldTransform, vector);
    const windowExtX = ctx.state.windowExt.x || rectWidth(ctx.viewBox) || 1;
    const windowExtY = ctx.state.windowExt.y || rectHeight(ctx.viewBox) || 1;
    const viewportExtX = ctx.state.viewportExt.x || rectWidth(ctx.viewBox) || 1;
    const viewportExtY = ctx.state.viewportExt.y || rectHeight(ctx.viewBox) || 1;
    return {
        x: (transformed.x * viewportExtX) / windowExtX,
        y: (transformed.y * viewportExtY) / windowExtY,
    };
}
function mapRect(ctx, rect) {
    const points = [
        mapPoint(ctx, { x: rect.left, y: rect.top }),
        mapPoint(ctx, { x: rect.right, y: rect.top }),
        mapPoint(ctx, { x: rect.right, y: rect.bottom }),
        mapPoint(ctx, { x: rect.left, y: rect.bottom }),
    ];
    return normalizeRect({
        left: Math.min(...points.map((point) => point.x)),
        top: Math.min(...points.map((point) => point.y)),
        right: Math.max(...points.map((point) => point.x)),
        bottom: Math.max(...points.map((point) => point.y)),
    });
}
function pointAttr(point) {
    return `${numberCss(point.x)},${numberCss(point.y)}`;
}
function effectivePenWidth(ctx, pen) {
    const width = Math.max(1, Math.abs(pen.width) || 1);
    const vx = mapVector(ctx, { x: width, y: 0 });
    const vy = mapVector(ctx, { x: 0, y: width });
    const sx = Math.hypot(vx.x, vx.y);
    const sy = Math.hypot(vy.x, vy.y);
    const scaled = (sx + sy) / 2;
    if (!Number.isFinite(scaled) || scaled <= 0)
        return width;
    return Math.max(0.5, scaled);
}
function scaledDashArray(ctx, pen) {
    if (!pen.dasharray)
        return undefined;
    const baseWidth = Math.max(1, Math.abs(pen.width) || 1);
    const scale = effectivePenWidth(ctx, pen) / baseWidth;
    return pen.dasharray
        .split(/\s+/)
        .map((part) => Number(part))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => numberCss(value * scale))
        .join(' ') || undefined;
}
function strokeAttributes(ctx, pen) {
    if (pen.none)
        return 'stroke="none"';
    const attrs = [`stroke="${escapeHtml(pen.color)}"`, `stroke-width="${numberCss(effectivePenWidth(ctx, pen))}"`, 'fill="none"'];
    const dasharray = scaledDashArray(ctx, pen);
    if (dasharray)
        attrs.push(`stroke-dasharray="${escapeHtml(dasharray)}"`);
    return attrs.join(' ');
}
function fillAttributes(ctx) {
    const attrs = [ctx.state.pen.none ? 'stroke="none"' : `stroke="${escapeHtml(ctx.state.pen.color)}"`, ctx.state.pen.none ? '' : `stroke-width="${numberCss(effectivePenWidth(ctx, ctx.state.pen))}"`].filter(Boolean);
    const dasharray = scaledDashArray(ctx, ctx.state.pen);
    if (dasharray && !ctx.state.pen.none)
        attrs.push(`stroke-dasharray="${escapeHtml(dasharray)}"`);
    attrs.push(brushFill(ctx));
    attrs.push(`fill-rule="${ctx.state.polygonFillMode === 2 ? 'nonzero' : 'evenodd'}"`);
    return attrs.join(' ');
}
function fillOnlyAttributes(ctx) {
    const attrs = ['stroke="none"'];
    attrs.push(brushFill(ctx));
    attrs.push(`fill-rule="${ctx.state.polygonFillMode === 2 ? 'nonzero' : 'evenodd'}"`);
    return attrs.join(' ');
}
function addDefinition(ctx, markup) {
    const bytes = utf8Length(markup) + 1;
    if (bytes > ctx.limits.maxOutputBytes - ctx.outputBytes)
        throw new PptError('LIMIT_ASSETS', 'Metafile definitions exceed the SVG output budget');
    ctx.outputBytes += bytes;
    ctx.defs.push(markup);
}
function brushFill(ctx) {
    const brush = ctx.state.brush;
    if (brush.none)
        return 'fill="none"';
    if (brush.hatch === undefined)
        return `fill="${escapeHtml(brush.color)}"`;
    const key = `${brush.hatch}:${brush.color}:${ctx.state.bkMode}:${ctx.state.bkColor}`;
    let id = ctx.patternIds.get(key);
    if (!id) {
        id = `mf-pattern-${++ctx.defSequence}`;
        const paths = ['M0 4H8', 'M4 0V8', 'M-2 2L2 -2M0 8L8 0M6 10L10 6', 'M-2 6L2 10M0 0L8 8M6 -2L10 2', 'M0 4H8M4 0V8', 'M-2 2L2 -2M0 8L8 0M6 10L10 6M-2 6L2 10M0 0L8 8M6 -2L10 2'];
        const background = ctx.state.bkMode === 2 ? `<rect width="8" height="8" fill="${ctx.state.bkColor}"/>` : '';
        addDefinition(ctx, `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8">${background}<path d="${paths[brush.hatch]}" fill="none" stroke="${brush.color}" stroke-width="1"/></pattern>`);
        ctx.patternIds.set(key, id);
    }
    return `fill="url(#${id})"`;
}
function clipPath(ctx, path, mode) {
    if (![1, 4, 5].includes(mode))
        return false;
    if (mode === 5)
        ctx.state.clips = [];
    if (ctx.state.clips.length >= Math.min(256, ctx.limits.maxStateDepth))
        throw new PptError('METAFILE_CLIP_LIMIT', 'Metafile clipping stack exceeds its limit');
    const id = `mf-clip-${++ctx.defSequence}`, mask = mode === 4;
    if (mask) {
        const r = ctx.viewBox;
        addDefinition(ctx, `<mask id="${id}" maskUnits="userSpaceOnUse" x="${numberCss(r.left)}" y="${numberCss(r.top)}" width="${numberCss(rectWidth(r))}" height="${numberCss(rectHeight(r))}" style="mask-type:luminance"><rect x="${numberCss(r.left)}" y="${numberCss(r.top)}" width="${numberCss(rectWidth(r))}" height="${numberCss(rectHeight(r))}" fill="white"/><path d="${path}" fill="black" fill-rule="${ctx.state.polygonFillMode === 2 ? 'nonzero' : 'evenodd'}"/></mask>`);
    }
    else
        addDefinition(ctx, `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${path}" clip-rule="${ctx.state.polygonFillMode === 2 ? 'nonzero' : 'evenodd'}"/></clipPath>`);
    ctx.state.clips.push({ id, mask });
    return true;
}
function rectanglePath(ctx, rect) {
    const points = [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }].map(p => mapPoint(ctx, p));
    return { path: `M${points.map(pointAttr).join('L')}Z`, points };
}
function saveState(ctx) { if (ctx.stateStack.length >= ctx.limits.maxStateDepth)
    throw new PptError('METAFILE_STATE_LIMIT', 'Metafile graphics-state stack exceeds its depth limit'); ctx.stateStack.push(cloneGraphicsState(ctx.state)); }
function restoreState(ctx, saved) { const index = saved < 0 ? ctx.stateStack.length + saved : saved - 1; if (index < 0 || index >= ctx.stateStack.length)
    return; const state = ctx.stateStack[index]; ctx.stateStack.length = index; ctx.state = cloneGraphicsState(state); }
function ensureObjectSlot(ctx) {
    const heap = ctx.freeObjectSlots, first = heap[0];
    if (first === undefined)
        throw new PptError('METAFILE_OBJECT_LIMIT', 'Metafile creates more objects than its header declares');
    const last = heap.pop();
    if (heap.length) {
        heap[0] = last;
        let at = 0;
        while (at * 2 + 1 < heap.length) {
            let child = at * 2 + 1;
            if (child + 1 < heap.length && heap[child + 1] < heap[child])
                child++;
            if (heap[at] <= heap[child])
                break;
            [heap[at], heap[child]] = [heap[child], heap[at]];
            at = child;
        }
    }
    return first;
}
function setObject(ctx, index, value) {
    if (!Number.isInteger(index) || index < 0 || index >= ctx.objects.length)
        throw new PptError('METAFILE_OBJECT_HANDLE', 'Metafile object handle exceeds its declared table');
    ctx.objects[index] = value;
}
function deleteObject(ctx, index) {
    if (index < 0 || index >= ctx.objects.length || !ctx.objects[index])
        return;
    ctx.objects[index] = null;
    const heap = ctx.freeObjectSlots;
    let at = heap.length;
    heap.push(index);
    while (at > 0) {
        const parent = (at - 1) >>> 1;
        if (heap[parent] <= index)
            break;
        heap[at] = heap[parent];
        at = parent;
        heap[at] = index;
    }
}
function utf8Length(value) {
    let bytes = 0;
    for (let i = 0; i < value.length; i++) {
        const c = value.charCodeAt(i);
        if (c < 128)
            bytes++;
        else if (c < 2048)
            bytes += 2;
        else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xDC00 && value.charCodeAt(i + 1) <= 0xDFFF) {
            bytes += 4;
            i++;
        }
        else
            bytes += 3;
    }
    return bytes;
}
function claimPoints(ctx, count) {
    if (!Number.isSafeInteger(count) || count < 0 || count > ctx.limits.maxPoints - ctx.pointCount)
        throw new PptError('METAFILE_POINT_LIMIT', 'Metafile exceeds its point budget');
    ctx.pointCount += count;
}
function countRecord(ctx) {
    if (++ctx.recordCount > ctx.limits.maxRecords)
        throw new PptError('METAFILE_RECORD_LIMIT', 'Metafile exceeds its record budget');
}
function selectStockObject(ctx, index) {
    switch (index >>> 0) {
        case STOCK_OBJECT.WHITE_BRUSH:
            ctx.state.brush = { color: '#ffffff' };
            return true;
        case STOCK_OBJECT.LTGRAY_BRUSH:
            ctx.state.brush = { color: '#c0c0c0' };
            return true;
        case STOCK_OBJECT.GRAY_BRUSH:
            ctx.state.brush = { color: '#808080' };
            return true;
        case STOCK_OBJECT.DKGRAY_BRUSH:
            ctx.state.brush = { color: '#404040' };
            return true;
        case STOCK_OBJECT.BLACK_BRUSH:
            ctx.state.brush = { color: '#000000' };
            return true;
        case STOCK_OBJECT.NULL_BRUSH:
            ctx.state.brush = { color: 'none', none: true };
            return true;
        case STOCK_OBJECT.WHITE_PEN:
            ctx.state.pen = { color: '#ffffff', width: 1 };
            return true;
        case STOCK_OBJECT.BLACK_PEN:
            ctx.state.pen = { color: '#000000', width: 1 };
            return true;
        case STOCK_OBJECT.NULL_PEN:
            ctx.state.pen = { color: 'none', width: 1, none: true };
            return true;
        default:
            return false;
    }
}
function selectObject(ctx, index) {
    if (selectStockObject(ctx, index))
        return;
    const object = ctx.objects[index] || null;
    if (!object)
        return;
    if (object.kind === 'pen')
        ctx.state.pen = { ...object.value };
    if (object.kind === 'brush')
        ctx.state.brush = { ...object.value };
    if (object.kind === 'font')
        ctx.state.font = { ...object.value };
}
function addNode(ctx, svg, points) {
    if (ctx.state.clips.length)
        svg = ctx.state.clips.map(c => `<g ${c.mask ? 'mask' : 'clip-path'}="url(#${c.id})">`).join('') + svg + '</g>'.repeat(ctx.state.clips.length);
    const bytes = utf8Length(svg) + 1;
    if (bytes > ctx.limits.maxOutputBytes - ctx.outputBytes)
        throw new PptError('LIMIT_ASSETS', 'Converted metafile exceeds the remaining asset byte budget');
    ctx.outputBytes += bytes;
    ctx.nodes.push(svg);
    updateBounds(ctx, points);
}
function addPathFragment(ctx, fragment, points) {
    if (!fragment)
        return;
    const bytes = utf8Length(fragment) + 1;
    if (bytes > ctx.limits.maxOutputBytes - ctx.outputBytes - ctx.pathBytes)
        throw new PptError('LIMIT_ASSETS', 'Metafile path exceeds the remaining asset byte budget');
    ctx.pathBytes += bytes;
    ctx.pathData.push(fragment);
    for (const point of points)
        ctx.pathPoints.push(point);
}
function flushPath(ctx, attrs) {
    if (!ctx.pathData.length)
        return;
    addNode(ctx, `<path d="${ctx.pathData.join(' ')}" ${attrs} />`, ctx.pathPoints);
    ctx.pathData = [];
    ctx.pathPoints = [];
    ctx.pathBytes = 0;
    ctx.capturePath = false;
}
function addLine(ctx, start, end) {
    const a = mapPoint(ctx, start);
    const b = mapPoint(ctx, end);
    ctx.state.currentPosition = { ...end };
    if (ctx.capturePath) {
        addPathFragment(ctx, `${ctx.pathData.length ? '' : `M ${pointAttr(a)}`} L ${pointAttr(b)}`.trim(), [a, b]);
        return;
    }
    addNode(ctx, `<line x1="${numberCss(a.x)}" y1="${numberCss(a.y)}" x2="${numberCss(b.x)}" y2="${numberCss(b.y)}" ${strokeAttributes(ctx, ctx.state.pen)} />`, [a, b]);
}
function addPolyline(ctx, points, closed) {
    if (!points.length)
        return;
    const mapped = points.map((point) => mapPoint(ctx, point));
    ctx.state.currentPosition = { ...points[points.length - 1] };
    const attr = mapped.map(pointAttr).join(' ');
    if (ctx.capturePath) {
        const commands = [`M ${pointAttr(mapped[0])}`, ...mapped.slice(1).map((point) => `L ${pointAttr(point)}`)];
        if (closed)
            commands.push('Z');
        addPathFragment(ctx, commands.join(' '), mapped);
        return;
    }
    const tag = closed ? 'polygon' : 'polyline';
    const styleAttrs = closed ? fillAttributes(ctx) : strokeAttributes(ctx, ctx.state.pen);
    addNode(ctx, `<${tag} points="${attr}" ${styleAttrs} />`, mapped);
}
function addCompoundPolygons(ctx, polygons) {
    const points = [], parts = [];
    for (const polygon of polygons) {
        if (!polygon.length)
            continue;
        const mapped = polygon.map(p => mapPoint(ctx, p));
        parts.push(`M${mapped.map(pointAttr).join('L')}Z`);
        for (const point of mapped)
            points.push(point);
    }
    if (!parts.length)
        return;
    if (ctx.capturePath)
        addPathFragment(ctx, parts.join(' '), points);
    else
        addNode(ctx, `<path d="${parts.join(' ')}" ${fillAttributes(ctx)}/>`, points);
}
function addBezierPath(ctx, points, relativeToCurrent = false) {
    const logical = relativeToCurrent ? [{ ...ctx.state.currentPosition }, ...points] : points;
    if (logical.length < 4)
        return;
    const mapped = logical.map((point) => mapPoint(ctx, point));
    let path = `M ${pointAttr(mapped[0])}`;
    for (let i = 1; i + 2 < mapped.length; i += 3) {
        path += ` C ${pointAttr(mapped[i])} ${pointAttr(mapped[i + 1])} ${pointAttr(mapped[i + 2])}`;
    }
    ctx.state.currentPosition = { ...logical[logical.length - 1] };
    if (ctx.capturePath) {
        addPathFragment(ctx, path, mapped);
        return;
    }
    addNode(ctx, `<path d="${path}" ${strokeAttributes(ctx, ctx.state.pen)} />`, mapped);
}
function addRect(ctx, rect, radius) {
    if (ctx.capturePath || ctx.state.worldTransform.m12 !== 0 || ctx.state.worldTransform.m21 !== 0) {
        const r = normalizeRect(rect), rx = Math.min((r.right - r.left) / 2, Math.abs(radius?.x ?? 0) / 2), ry = Math.min((r.bottom - r.top) / 2, Math.abs(radius?.y ?? 0) / 2), points = [], map = (x, y) => { const p = mapPoint(ctx, { x, y }); points.push(p); return pointAttr(p); };
        let path;
        if (rx && ry) {
            const k = .5522847498307936;
            path = `M${map(r.left + rx, r.top)} L${map(r.right - rx, r.top)} C${map(r.right - rx + k * rx, r.top)} ${map(r.right, r.top + ry - k * ry)} ${map(r.right, r.top + ry)} L${map(r.right, r.bottom - ry)} C${map(r.right, r.bottom - ry + k * ry)} ${map(r.right - rx + k * rx, r.bottom)} ${map(r.right - rx, r.bottom)} L${map(r.left + rx, r.bottom)} C${map(r.left + rx - k * rx, r.bottom)} ${map(r.left, r.bottom - ry + k * ry)} ${map(r.left, r.bottom - ry)} L${map(r.left, r.top + ry)} C${map(r.left, r.top + ry - k * ry)} ${map(r.left + rx - k * rx, r.top)} ${map(r.left + rx, r.top)} Z`;
        }
        else {
            const outline = rectanglePath(ctx, r);
            path = outline.path;
            points.push(...outline.points);
        }
        claimPoints(ctx, points.length);
        if (ctx.capturePath)
            addPathFragment(ctx, path, points);
        else
            addNode(ctx, `<path d="${path}" ${fillAttributes(ctx)}/>`, points);
        return;
    }
    const mapped = mapRect(ctx, rect);
    const attrs = [
        `x="${numberCss(mapped.left)}"`,
        `y="${numberCss(mapped.top)}"`,
        `width="${numberCss(rectWidth(mapped))}"`,
        `height="${numberCss(rectHeight(mapped))}"`,
    ];
    if (radius) {
        const rx = mapVector(ctx, { x: radius.x / 2, y: 0 }), ry = mapVector(ctx, { x: 0, y: radius.y / 2 });
        attrs.push(`rx="${numberCss(Math.hypot(rx.x, rx.y))}"`);
        attrs.push(`ry="${numberCss(Math.hypot(ry.x, ry.y))}"`);
    }
    if (ctx.capturePath) {
        addPathFragment(ctx, `M ${numberCss(mapped.left)},${numberCss(mapped.top)} L ${numberCss(mapped.right)},${numberCss(mapped.top)} L ${numberCss(mapped.right)},${numberCss(mapped.bottom)} L ${numberCss(mapped.left)},${numberCss(mapped.bottom)} Z`, [
            { x: mapped.left, y: mapped.top },
            { x: mapped.right, y: mapped.bottom },
        ]);
        return;
    }
    addNode(ctx, `<rect ${attrs.join(' ')} ${fillAttributes(ctx)} />`, [
        { x: mapped.left, y: mapped.top },
        { x: mapped.right, y: mapped.bottom },
    ]);
}
function addEllipse(ctx, rect) {
    if (ctx.capturePath || ctx.state.worldTransform.m12 !== 0 || ctx.state.worldTransform.m21 !== 0) {
        addArc(ctx, rect, { x: rect.right, y: (rect.top + rect.bottom) / 2 }, { x: rect.right, y: (rect.top + rect.bottom) / 2 }, 'chord');
        return;
    }
    const mapped = mapRect(ctx, rect);
    const cx = (mapped.left + mapped.right) / 2;
    const cy = (mapped.top + mapped.bottom) / 2;
    const rx = rectWidth(mapped) / 2;
    const ry = rectHeight(mapped) / 2;
    if (ctx.capturePath) {
        addPathFragment(ctx, `M ${numberCss(cx - rx)},${numberCss(cy)} A ${numberCss(rx)},${numberCss(ry)} 0 1 0 ${numberCss(cx + rx)},${numberCss(cy)} A ${numberCss(rx)},${numberCss(ry)} 0 1 0 ${numberCss(cx - rx)},${numberCss(cy)} Z`, [
            { x: mapped.left, y: mapped.top },
            { x: mapped.right, y: mapped.bottom },
        ]);
        return;
    }
    addNode(ctx, `<ellipse cx="${numberCss(cx)}" cy="${numberCss(cy)}" rx="${numberCss(rx)}" ry="${numberCss(ry)}" ${fillAttributes(ctx)} />`, [
        { x: mapped.left, y: mapped.top },
        { x: mapped.right, y: mapped.bottom },
    ]);
}
/** Cubic quarter-arcs commute with affine world transforms, unlike mapped bounding boxes. */
function addArc(ctx, rect, start, end, kind) {
    const box = normalizeRect(rect), rx = (box.right - box.left) / 2, ry = (box.bottom - box.top) / 2, cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
    if (!rx || !ry)
        return;
    const theta = Math.atan2((start.y - cy) / ry, (start.x - cx) / rx), finish = Math.atan2((end.y - cy) / ry, (end.x - cx) / rx), clockwise = ctx.state.arcDirection === 2, tau = Math.PI * 2;
    let delta = ((clockwise ? finish - theta : theta - finish) % tau + tau) % tau;
    if (delta < 1e-10)
        delta = tau;
    if (!clockwise)
        delta = -delta;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2))), points = [], logical = (a) => ({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }), map = (p) => { const transformed = mapPoint(ctx, p); points.push(transformed); return pointAttr(transformed); }, first = logical(theta);
    let path = kind === 'pie' ? `M${map({ x: cx, y: cy })} L${map(first)}` : kind === 'arcTo' ? `M${map(ctx.state.currentPosition)} L${map(first)}` : `M${map(first)}`;
    for (let i = 0; i < steps; i++) {
        const a = theta + delta * i / steps, b = theta + delta * (i + 1) / steps, k = 4 / 3 * Math.tan((b - a) / 4), p0 = logical(a), p3 = logical(b), p1 = { x: p0.x - k * rx * Math.sin(a), y: p0.y + k * ry * Math.cos(a) }, p2 = { x: p3.x + k * rx * Math.sin(b), y: p3.y - k * ry * Math.cos(b) };
        path += ` C${map(p1)} ${map(p2)} ${map(p3)}`;
    }
    if (kind === 'chord' || kind === 'pie')
        path += ' Z';
    claimPoints(ctx, points.length);
    if (ctx.capturePath)
        addPathFragment(ctx, path, points);
    else
        addNode(ctx, `<path d="${path}" ${kind === 'arc' || kind === 'arcTo' ? strokeAttributes(ctx, ctx.state.pen) : fillAttributes(ctx)}/>`, points);
    if (kind === 'arcTo')
        ctx.state.currentPosition = logical(theta + delta);
}
/** Clip in the destination's unit square before its affine mapping. Mapping a
 * bitmap's bounding box would discard rotation, shear and mirror directions. */
function addRasterImage(ctx, dest, image, source, sourceTransform = IDENTITY_MATRIX, opacity = 1) {
    const sw = source.right - source.left, sh = source.bottom - source.top, dw = dest.right - dest.left, dh = dest.bottom - dest.top;
    if (!sw || !sh || !dw || !dh || opacity === 0)
        return;
    const { m11: a, m12: b, m21: c, m22: d, dx: tx, dy: ty } = sourceTransform, det = a * d - b * c;
    if (![a, b, c, d, tx, ty, det].every(Number.isFinite) || !det)
        throw new PptError('METAFILE_BITMAP_TRANSFORM', 'Invalid or singular source bitmap transform');
    const inverse = { m11: d / det, m12: -b / det, m21: -c / det, m22: a / det, dx: (c * ty - d * tx) / det, dy: (b * tx - a * ty) / det };
    const sampling = [inverse.m11 / sw, inverse.m12 / sh, inverse.m21 / sw, inverse.m22 / sh, (inverse.dx - source.left) / sw, (inverse.dy - source.top) / sh];
    const p = mapPoint(ctx, { x: dest.left, y: dest.top }), vx = mapVector(ctx, { x: dw, y: 0 }), vy = mapVector(ctx, { x: 0, y: dh });
    if (Math.ceil(image.bytes.length / 3) * 4 + 700 > ctx.limits.maxOutputBytes - ctx.outputBytes)
        throw new PptError('LIMIT_ASSETS', 'Metafile bitmap exceeds the remaining SVG output budget');
    const href = dataUrlFromBytes(image.bytes, image.mime), transform = [vx.x, vx.y, vy.x, vy.y, p.x, p.y].map(numberCss).join(' ');
    const svg = `<g transform="matrix(${transform})"${opacity < 1 ? ` opacity="${opacity}"` : ''}><svg x="0" y="0" width="1" height="1" viewBox="0 0 1 1" preserveAspectRatio="none" overflow="hidden"><image x="0" y="0" width="${image.width}" height="${image.height}" transform="matrix(${sampling.map(value => String(Number(value.toPrecision(12)))).join(' ')})" xlink:href="${href}" preserveAspectRatio="none" /></svg></g>`;
    addNode(ctx, svg, [p, { x: p.x + vx.x, y: p.y + vx.y }, { x: p.x + vy.x, y: p.y + vy.y }, { x: p.x + vx.x + vy.x, y: p.y + vx.y + vy.y }]);
}
function decodeAnsi(bytes, charset = 0) {
    const labels = { 0: 'windows-1252', 128: 'shift_jis', 129: 'euc-kr', 134: 'gbk', 136: 'big5', 161: 'windows-1253', 162: 'windows-1254', 163: 'windows-1258', 177: 'windows-1255', 178: 'windows-1256', 186: 'windows-1257', 204: 'windows-1251', 222: 'windows-874', 238: 'windows-1250' };
    return trimTrailingNulls(new TextDecoder(labels[charset] ?? 'windows-1252').decode(bytes));
}
function decodeUtf16(bytes) {
    return trimTrailingNulls(new TextDecoder('utf-16le').decode(bytes));
}
function textAnchor(textAlign) {
    const horizontal = textAlign & 0x0006;
    if (horizontal === 0x0002)
        return 'end';
    if (horizontal === 0x0006)
        return 'middle';
    return 'start';
}
function dominantBaseline(textAlign) {
    const vertical = textAlign & 0x0018;
    if (vertical === 0x0008)
        return 'text-after-edge';
    if (vertical === 0x0018)
        return 'alphabetic';
    return 'text-before-edge';
}
function addText(ctx, point, text, glyphIndices, textOptions = {}) {
    if (!text && !glyphIndices?.length && !(textOptions.rectangle && ((textOptions.options ?? 0) & 2)))
        return;
    if (text.length * (textOptions.advances ? 96 : 6) + (glyphIndices?.length ?? 0) * 8 > ctx.limits.maxOutputBytes - ctx.outputBytes)
        throw new PptError('LIMIT_ASSETS', 'Metafile text exceeds the remaining SVG output budget');
    const logical = ctx.state.textAlign & 1 ? ctx.state.currentPosition : point, mapped = mapPoint(ctx, logical), angle = -(ctx.state.font.escapement ?? 0) * Math.PI / 1800, cos = Math.cos(angle), sin = Math.sin(angle), vx = mapVector(ctx, { x: cos, y: sin }), vy = mapVector(ctx, { x: -sin, y: cos });
    const fontSize = Math.max(1, Math.abs(ctx.state.font.size) || 12), options = textOptions.options ?? 0;
    const previousClips = [...ctx.state.clips];
    if (textOptions.rectangle && (options & 2)) {
        const r = rectanglePath(ctx, textOptions.rectangle);
        addNode(ctx, `<path d="${r.path}" fill="${ctx.state.bkColor}" stroke="none"/>`, r.points);
    }
    if (textOptions.rectangle && (options & 4))
        clipPath(ctx, rectanglePath(ctx, textOptions.rectangle).path, 1);
    const attrs = [
        'x="0"', 'y="0"',
        `transform="matrix(${[vx.x, vx.y, vy.x, vy.y, mapped.x, mapped.y].map(numberCss).join(' ')})"`,
        `fill="${escapeHtml(ctx.state.textColor)}"`,
        `font-size="${numberCss(fontSize)}"`,
        `font-family="${escapeXmlText(ctx.state.font.family)}"`,
        `text-anchor="${textOptions.advances ? 'start' : textAnchor(ctx.state.textAlign)}"`,
        `dominant-baseline="${dominantBaseline(ctx.state.textAlign)}"`,
    ];
    if (options & 0x80)
        attrs.push('direction="rtl" unicode-bidi="bidi-override"');
    if (ctx.state.font.weight && ctx.state.font.weight >= 600)
        attrs.push('font-weight="700"');
    if (ctx.state.font.italic)
        attrs.push('font-style="italic"');
    const decorations = [ctx.state.font.underline ? 'underline' : '', ctx.state.font.strike ? 'line-through' : ''].filter(Boolean);
    if (decorations.length)
        attrs.push(`text-decoration="${decorations.join(' ')}"`);
    if (glyphIndices?.length) {
        // Font-specific glyph IDs are not Unicode; retain them without painting false text.
        attrs.push(`data-msdoc-glyph-indices="${glyphIndices.join(' ')}"`);
        ctx.unresolvedGlyphRuns += 1;
    }
    let body = glyphIndices ? '' : escapeXmlText(text), extent = { x: 0, y: 0 };
    if (textOptions.advances) {
        extent = textOptions.advances.reduce((p, d) => ({ x: p.x + d.x, y: p.y + d.y }), { x: 0, y: 0 });
        const alignment = textAnchor(ctx.state.textAlign), factor = alignment === 'middle' ? .5 : alignment === 'end' ? 1 : 0;
        let x = -extent.x * factor, y = -extent.y * factor, index = 0;
        const spans = [];
        for (const character of Array.from(text)) {
            spans.push(`<tspan x="${numberCss(x)}" y="${numberCss(y)}">${escapeXmlText(character)}</tspan>`);
            for (let k = 0; k < character.length; k++) {
                const d = textOptions.advances[index++];
                if (d) {
                    x += d.x;
                    y += d.y;
                }
            }
        }
        if (!glyphIndices)
            body = spans.join('');
    }
    else if (ctx.state.textAlign & 1) {
        extent.x = Array.from(text).length * fontSize * .55;
        ctx.unsupportedRecordTypes.add(ctx.activeRecordType);
    }
    if (ctx.state.font.charset === 2 || ctx.state.font.charset === 255 || ctx.state.font.charset === 130)
        ctx.unsupportedRecordTypes.add(ctx.activeRecordType);
    addNode(ctx, `<text ${attrs.join(' ')}>${body}</text>`, [mapped]);
    ctx.state.clips = previousClips;
    if (ctx.state.textAlign & 1)
        ctx.state.currentPosition = { x: logical.x + extent.x * cos - extent.y * sin, y: logical.y + extent.x * sin + extent.y * cos };
}
function finalizeSvg(ctx, sourceMime) {
    if (!ctx.nodes.length)
        return null;
    const fallback = ctx.contentBounds ? normalizeRect(ctx.contentBounds) : normalizeRect(ctx.viewBox);
    const viewBox = normalizeRect({
        left: Number.isFinite(ctx.viewBox.left) ? ctx.viewBox.left : fallback.left,
        top: Number.isFinite(ctx.viewBox.top) ? ctx.viewBox.top : fallback.top,
        right: Number.isFinite(ctx.viewBox.right) ? ctx.viewBox.right : fallback.right,
        bottom: Number.isFinite(ctx.viewBox.bottom) ? ctx.viewBox.bottom : fallback.bottom,
    });
    const width = Math.max(1, Math.round(rectWidth(viewBox)));
    const height = Math.max(1, Math.round(rectHeight(viewBox)));
    const start = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="${numberCss(viewBox.left)} ${numberCss(viewBox.top)} ${numberCss(rectWidth(viewBox))} ${numberCss(rectHeight(viewBox))}" preserveAspectRatio="xMinYMin meet">\n`;
    if (utf8Length(start) + ctx.outputBytes + 6 + (ctx.defs.length ? 14 : 0) > ctx.limits.maxOutputBytes)
        throw new PptError('LIMIT_ASSETS', 'Converted SVG exceeds the remaining asset byte budget');
    const svg = `${start}${ctx.defs.length ? `<defs>${ctx.defs.join('\n')}</defs>\n` : ''}${ctx.nodes.join('\n')}\n</svg>`;
    const encoded = new TextEncoder().encode(svg);
    return {
        mime: 'image/svg+xml',
        bytes: encoded,
        dataUrl: dataUrlFromBytes(encoded, 'image/svg+xml'),
        width,
        height,
        sourceMime,
        recordCount: ctx.recordCount,
        unresolvedGlyphRuns: ctx.unresolvedGlyphRuns,
        unsupportedRecordTypes: [...ctx.unsupportedRecordTypes].sort((a, b) => a - b),
    };
}
function parseWmf(bytes, limits) {
    const reader = new BinaryReader(bytes);
    let offset = 0;
    let placeableBounds = null;
    if (reader.u32(0) === PLACEABLE_WMF_KEY && bytes.length >= 22) {
        placeableBounds = normalizeRect({
            left: reader.i16(6),
            top: reader.i16(8),
            right: reader.i16(10),
            bottom: reader.i16(12),
        });
        offset = 22;
    }
    if (offset + WMF_HEADER_SIZE > bytes.length)
        return null;
    const header = new BinaryReader(bytes.subarray(offset));
    const headerSizeWords = header.u16(2);
    const numberOfObjects = header.u16(10);
    const recordOffset = offset + headerSizeWords * 2;
    if (headerSizeWords < 9 || recordOffset > bytes.length)
        throw new PptError('METAFILE_HEADER', 'Invalid WMF header length');
    const viewBox = placeableBounds || { left: 0, top: 0, right: 1000, bottom: 1000 };
    const ctx = defaultContext(rectWidth(viewBox), rectHeight(viewBox), viewBox, limits, numberOfObjects);
    if (placeableBounds) {
        ctx.state.windowOrg = { x: placeableBounds.left, y: placeableBounds.top };
        ctx.state.windowExt = { x: rectWidth(placeableBounds), y: rectHeight(placeableBounds) };
        ctx.state.viewportOrg = { x: placeableBounds.left, y: placeableBounds.top };
        ctx.state.viewportExt = { x: rectWidth(placeableBounds), y: rectHeight(placeableBounds) };
    }
    let cursor = recordOffset;
    while (cursor + 6 <= bytes.length) {
        const sizeWords = reader.u32(cursor);
        const recordSize = sizeWords * 2;
        if (recordSize < 6 || cursor + recordSize > bytes.length)
            throw new PptError('METAFILE_RECORD_LENGTH', 'WMF record exceeds its payload', cursor);
        const recordReader = new BinaryReader(bytes.subarray(cursor, cursor + recordSize));
        const fn = recordReader.u16(4);
        if (recordSize < (WMF_MIN_BYTES[fn] ?? 6))
            throw new PptError('METAFILE_RECORD_LENGTH', `WMF record 0x${fn.toString(16)} has a truncated fixed prefix`, cursor);
        countRecord(ctx);
        ctx.activeRecordType = fn;
        switch (fn) {
            case WMF_RECORD.META_EOF:
                cursor += recordSize;
                return finalizeSvg(ctx, 'image/wmf');
            case WMF_RECORD.META_SAVEDC:
                saveState(ctx);
                break;
            case WMF_RECORD.META_RESTOREDC:
                restoreState(ctx, recordReader.i16(6));
                break;
            case WMF_RECORD.META_SETTEXTALIGN:
                ctx.state.textAlign = recordReader.u16(6);
                break;
            case WMF_RECORD.META_INTERSECTCLIPRECT:
            case WMF_RECORD.META_EXCLUDECLIPRECT: {
                const r = { left: recordReader.i16(12), top: recordReader.i16(10), right: recordReader.i16(8), bottom: recordReader.i16(6) };
                clipPath(ctx, rectanglePath(ctx, r).path, fn === WMF_RECORD.META_INTERSECTCLIPRECT ? 1 : 4);
                break;
            }
            case WMF_RECORD.META_SETWINDOWORG:
                ctx.state.windowOrg = { x: recordReader.i16(8), y: recordReader.i16(6) };
                break;
            case WMF_RECORD.META_SETWINDOWEXT:
                ctx.state.windowExt = { x: recordReader.i16(8), y: recordReader.i16(6) };
                break;
            case WMF_RECORD.META_SETVIEWPORTORG:
                ctx.state.viewportOrg = { x: recordReader.i16(8), y: recordReader.i16(6) };
                break;
            case WMF_RECORD.META_SETVIEWPORTEXT:
                ctx.state.viewportExt = { x: recordReader.i16(8), y: recordReader.i16(6) };
                break;
            case WMF_RECORD.META_OFFSETWINDOWORG:
                ctx.state.windowOrg = { x: ctx.state.windowOrg.x + recordReader.i16(8), y: ctx.state.windowOrg.y + recordReader.i16(6) };
                break;
            case WMF_RECORD.META_OFFSETVIEWPORTORG:
                ctx.state.viewportOrg = { x: ctx.state.viewportOrg.x + recordReader.i16(8), y: ctx.state.viewportOrg.y + recordReader.i16(6) };
                break;
            case WMF_RECORD.META_SETBKMODE:
                ctx.state.bkMode = recordReader.u16(6);
                break;
            case WMF_RECORD.META_SETPOLYFILLMODE:
                ctx.state.polygonFillMode = recordReader.u16(6);
                break;
            case WMF_RECORD.META_SETBKCOLOR:
                ctx.state.bkColor = colorRefToCss(recordReader.u32(6));
                break;
            case WMF_RECORD.META_SETTEXTCOLOR:
                ctx.state.textColor = colorRefToCss(recordReader.u32(6));
                break;
            case WMF_RECORD.META_MOVETO:
                ctx.state.currentPosition = { x: recordReader.i16(8), y: recordReader.i16(6) };
                break;
            case WMF_RECORD.META_LINETO: {
                const end = { x: recordReader.i16(8), y: recordReader.i16(6) };
                addLine(ctx, ctx.state.currentPosition, end);
                break;
            }
            case WMF_RECORD.META_POLYLINE:
            case WMF_RECORD.META_POLYGON: {
                const count = recordReader.u16(6);
                if (!recordReader.ensure(8, count * 4))
                    throw new PptError('METAFILE_POINTS', 'WMF point array exceeds its own record', cursor);
                claimPoints(ctx, count);
                const points = [];
                let pointOffset = 8;
                for (let i = 0; i < count && pointOffset + 4 <= recordSize; i += 1) {
                    points.push({ x: recordReader.i16(pointOffset), y: recordReader.i16(pointOffset + 2) });
                    pointOffset += 4;
                }
                addPolyline(ctx, points, fn === WMF_RECORD.META_POLYGON);
                break;
            }
            case WMF_RECORD.META_POLYPOLYGON: {
                const polygons = recordReader.u16(6);
                if (!recordReader.ensure(8, polygons * 2))
                    throw new PptError('METAFILE_POINTS', 'WMF polygon counts exceed their own record', cursor);
                const counts = [];
                let dataOffset = 8;
                for (let i = 0; i < polygons && dataOffset + 2 <= recordSize; i += 1) {
                    counts.push(recordReader.u16(dataOffset));
                    dataOffset += 2;
                }
                const total = counts.reduce((sum, count) => sum + count, 0);
                if (!recordReader.ensure(dataOffset, total * 4))
                    throw new PptError('METAFILE_POINTS', 'WMF polygon points exceed their own record', cursor);
                claimPoints(ctx, total);
                const polygonPoints = [];
                for (const count of counts) {
                    const points = [];
                    for (let i = 0; i < count && dataOffset + 4 <= recordSize; i += 1) {
                        points.push({ x: recordReader.i16(dataOffset), y: recordReader.i16(dataOffset + 2) });
                        dataOffset += 4;
                    }
                    polygonPoints.push(points);
                }
                addCompoundPolygons(ctx, polygonPoints);
                break;
            }
            case WMF_RECORD.META_RECTANGLE: {
                addRect(ctx, {
                    left: recordReader.i16(12),
                    top: recordReader.i16(10),
                    right: recordReader.i16(8),
                    bottom: recordReader.i16(6),
                });
                break;
            }
            case WMF_RECORD.META_ELLIPSE: {
                addEllipse(ctx, {
                    left: recordReader.i16(12),
                    top: recordReader.i16(10),
                    right: recordReader.i16(8),
                    bottom: recordReader.i16(6),
                });
                break;
            }
            case WMF_RECORD.META_ROUNDRECT: {
                addRect(ctx, {
                    left: recordReader.i16(16),
                    top: recordReader.i16(14),
                    right: recordReader.i16(12),
                    bottom: recordReader.i16(10),
                }, {
                    x: recordReader.i16(8),
                    y: recordReader.i16(6),
                });
                break;
            }
            case WMF_RECORD.META_ARC:
            case WMF_RECORD.META_CHORD:
            case WMF_RECORD.META_PIE: {
                const end = { x: recordReader.i16(8), y: recordReader.i16(6) }, start = { x: recordReader.i16(12), y: recordReader.i16(10) }, box = { left: recordReader.i16(20), top: recordReader.i16(18), right: recordReader.i16(16), bottom: recordReader.i16(14) };
                addArc(ctx, box, start, end, fn === WMF_RECORD.META_CHORD ? 'chord' : fn === WMF_RECORD.META_PIE ? 'pie' : 'arc');
                break;
            }
            case WMF_RECORD.META_TEXTOUT: {
                const length = recordReader.u16(6);
                const textOffset = 8;
                const paddedLength = length + (length % 2);
                if (!recordReader.ensure(textOffset, paddedLength + 4))
                    throw new PptError('METAFILE_TEXT', 'WMF text exceeds its own record', cursor);
                const text = decodeAnsi(recordReader.slice(textOffset, Math.min(length, Math.max(0, recordSize - textOffset - 4))), ctx.state.font.charset);
                const yOffset = textOffset + paddedLength;
                const y = recordReader.i16(yOffset);
                const x = recordReader.i16(yOffset + 2);
                addText(ctx, { x, y }, text);
                break;
            }
            case WMF_RECORD.META_EXTTEXTOUT: {
                const point = { x: recordReader.i16(8), y: recordReader.i16(6) }, length = recordReader.i16(10), options = recordReader.u16(12), hasRect = (options & 6) !== 0, textOffset = hasRect ? 22 : 14;
                if (length < 0 || !recordReader.ensure(textOffset, length + (length % 2)))
                    throw new PptError('METAFILE_TEXT', 'WMF extended text exceeds its own record', cursor);
                const rectangle = hasRect ? { left: recordReader.i16(14), top: recordReader.i16(16), right: recordReader.i16(18), bottom: recordReader.i16(20) } : undefined;
                const dxOffset = textOffset + length + (length % 2);
                let advances;
                if (dxOffset < recordSize) {
                    if (!recordReader.ensure(dxOffset, length * 2))
                        throw new PptError('METAFILE_TEXT', 'WMF character spacing exceeds its own record', cursor);
                    claimPoints(ctx, length);
                    advances = Array.from({ length }, (_, i) => ({ x: recordReader.i16(dxOffset + i * 2), y: 0 }));
                }
                const text = decodeAnsi(recordReader.slice(textOffset, length), ctx.state.font.charset);
                addText(ctx, point, text, undefined, { advances, rectangle, options });
                break;
            }
            case WMF_RECORD.META_CREATEPENINDIRECT: {
                const style = recordReader.u16(6);
                const width = recordReader.i16(8);
                const color = colorRefToCss(recordReader.u32(12));
                const index = ensureObjectSlot(ctx);
                setObject(ctx, index, { kind: 'pen', value: penStyleFromCode(style, width, color) });
                break;
            }
            case WMF_RECORD.META_CREATEBRUSHINDIRECT: {
                const style = recordReader.u16(6);
                if (style > 2 || style === 2 && recordReader.u16(12) > 5)
                    ctx.unsupportedRecordTypes.add(fn);
                const color = colorRefToCss(recordReader.u32(8));
                const index = ensureObjectSlot(ctx);
                setObject(ctx, index, { kind: 'brush', value: brushStyleFromCode(style, color, recordReader.u16(12)) });
                break;
            }
            case WMF_RECORD.META_CREATEFONTINDIRECT: {
                const font = readWmfFont(new BinaryReader(recordReader.slice(0, recordSize)));
                if (font)
                    setObject(ctx, ensureObjectSlot(ctx), { kind: 'font', value: { ...font, charset: recordReader.u8(19) } });
                break;
            }
            case WMF_RECORD.META_SELECTOBJECT:
                selectObject(ctx, recordReader.u16(6));
                break;
            case WMF_RECORD.META_DELETEOBJECT: {
                const index = recordReader.u16(6);
                deleteObject(ctx, index);
                break;
            }
            default:
                ctx.unsupportedRecordTypes.add(fn);
                break;
        }
        cursor += recordSize;
    }
    return finalizeSvg(ctx, 'image/wmf');
}
function readEmfPointArray(ctx, reader, offset, count, pointSize) {
    if (!reader.ensure(offset, count * pointSize))
        throw new PptError('METAFILE_POINTS', 'EMF point array exceeds its own record');
    claimPoints(ctx, count);
    const points = [];
    for (let i = 0; i < count; i += 1) {
        const pointOffset = offset + i * pointSize;
        if (pointSize === 8) {
            points.push({ x: reader.i32(pointOffset), y: reader.i32(pointOffset + 4) });
        }
        else {
            points.push({ x: reader.i16(pointOffset), y: reader.i16(pointOffset + 2) });
        }
    }
    return points;
}
function parseEmfText(ctx, reader, unicode) {
    if (!reader.ensure(36, 24))
        throw new PptError('METAFILE_TEXT', 'EMF text object exceeds its record');
    const point = { x: reader.i32(36), y: reader.i32(40) };
    const chars = reader.u32(44);
    const offString = reader.u32(48);
    const options = reader.u32(52), hasRect = (options & 0x100) === 0, offDxField = hasRect ? 72 : 56;
    if (!reader.ensure(offDxField, 4))
        throw new PptError('METAFILE_TEXT', 'EMF text rectangle or spacing offset exceeds its record');
    const rectangle = hasRect ? { left: reader.i32(56), top: reader.i32(60), right: reader.i32(64), bottom: reader.i32(68) } : undefined;
    const byteLength = unicode ? chars * 2 : chars, offDx = reader.u32(offDxField), stride = options & 0x2000 ? 8 : 4;
    if (chars && (!offString || !reader.ensure(offString, byteLength)))
        throw new PptError('METAFILE_TEXT', 'EMF text bytes exceed their own record');
    let advances;
    if (offDx && chars) {
        if (!reader.ensure(offDx, chars * stride))
            throw new PptError('METAFILE_TEXT', 'EMF character spacing exceeds its own record');
        claimPoints(ctx, chars);
        advances = Array.from({ length: chars }, (_, i) => ({ x: reader.i32(offDx + i * stride), y: stride === 8 ? reader.i32(offDx + i * stride + 4) : 0 }));
    }
    if (options & 0xC00)
        ctx.unsupportedRecordTypes.add(ctx.activeRecordType);
    const bytes = reader.slice(offString, byteLength);
    if (options & 0x0010) {
        claimPoints(ctx, chars);
        const glyphIndices = unicode
            ? Array.from({ length: chars }, (_, index) => reader.u16(offString + index * 2)) : Array.from(bytes);
        return { point, text: '', glyphIndices, advances, options, rectangle };
    }
    const text = unicode ? decodeUtf16(bytes) : decodeAnsi(bytes, ctx.state.font.charset);
    return { point, text, advances, options, rectangle };
}
function parseSmallEmfText(ctx, reader) {
    if (!reader.ensure(8, 28))
        throw new PptError('METAFILE_TEXT', 'Small EMF text has a truncated prefix');
    const point = { x: reader.i32(8), y: reader.i32(12) };
    const chars = reader.u32(16);
    const options = reader.u32(20);
    const hasRect = (options & 0x100) === 0, textOffset = hasRect ? 52 : 36, small = (options & 0x200) !== 0;
    if (!reader.ensure(textOffset, chars * (small ? 1 : 2)))
        throw new PptError('METAFILE_TEXT', 'Small EMF text exceeds its own record');
    const rectangle = hasRect ? { left: reader.i32(36), top: reader.i32(40), right: reader.i32(44), bottom: reader.i32(48) } : undefined;
    if (options & 0x10) {
        claimPoints(ctx, chars);
        return { point, text: '', options, rectangle, glyphIndices: Array.from({ length: chars }, (_, i) => small ? reader.u8(textOffset + i) : reader.u16(textOffset + i * 2)) };
    }
    const text = small ? Array.from(reader.slice(textOffset, chars), value => String.fromCharCode(value)).join('') : decodeUtf16(reader.slice(textOffset, chars * 2));
    return { point, text, options, rectangle };
}
function readEmfEmbeddedBmp(record, offBmiOffset, cbBmiOffset, offBitsOffset, cbBitsOffset, remainingBytes, perPixelAlpha) {
    const offBmi = record.u32(offBmiOffset);
    const cbBmi = record.u32(cbBmiOffset);
    const offBits = record.u32(offBitsOffset);
    const cbBits = record.u32(cbBitsOffset);
    if (!offBmi && !cbBmi && !offBits && !cbBits)
        return null;
    if (!offBmi || !cbBmi || !offBits || !cbBits || !record.ensure(offBmi, cbBmi) || !record.ensure(offBits, cbBits))
        throw new PptError('METAFILE_BITMAP', 'Embedded bitmap exceeds its own record');
    if (Math.ceil((cbBmi + cbBits + 14) / 3) * 4 + 256 > remainingBytes)
        throw new PptError('LIMIT_ASSETS', 'Embedded metafile bitmap exceeds the SVG output budget');
    const bmi = record.slice(offBmi, cbBmi), bits = record.slice(offBits, cbBits), header = new BinaryReader(bmi), size = header.u32(0);
    if (size !== 12 && size < 40 || !header.ensure(0, size))
        throw new PptError('METAFILE_BITMAP', 'Invalid embedded bitmap header');
    const width = size === 12 ? header.u16(4) : header.i32(4), signedHeight = size === 12 ? header.u16(6) : header.i32(8), height = Math.abs(signedHeight), depth = header.u16(size === 12 ? 10 : 14), compression = size === 12 ? 0 : header.u32(16);
    if (width <= 0 || height <= 0 || width * height * 4 > remainingBytes)
        throw new PptError('LIMIT_ASSETS', 'Embedded bitmap dimensions exceed the decoded byte budget');
    let data, mime = 'image/bmp';
    if (perPixelAlpha !== undefined && depth === 32 && compression === 0) {
        data = encodeRgbaPng(width, height, decodeBgraBitmap(width, signedHeight, bits, perPixelAlpha, remainingBytes), remainingBytes);
        mime = 'image/png';
    }
    else if (perPixelAlpha || perPixelAlpha === false && (depth === 32 || compression === 5)) {
        return null;
    }
    else if (compression === 4 || compression === 5) {
        data = bits;
        mime = compression === 4 ? 'image/jpeg' : 'image/png';
    }
    else {
        const bmp = bitmapInfoToBmp(bmi, bits);
        if (!bmp)
            return null;
        data = bmp;
    }
    return { bytes: data, mime, width, height, bottomUp: signedHeight > 0 };
}
function addEmfStretchDibits(ctx, record) {
    if (!record.ensure(24, 56))
        return;
    const bmp = readEmfEmbeddedBmp(record, 48, 52, 56, 60, ctx.limits.maxOutputBytes - ctx.outputBytes);
    if (!bmp)
        return;
    const y = record.i32(36), cy = record.i32(44), sourceY = bmp.bottomUp ? bmp.height - y - cy : y;
    addRasterImage(ctx, {
        left: record.i32(24),
        top: record.i32(28),
        right: record.i32(24) + record.i32(72),
        bottom: record.i32(28) + record.i32(76),
    }, bmp, { left: record.i32(32), top: sourceY, right: record.i32(32) + record.i32(40), bottom: sourceY + cy });
}
function addEmfBltBitmap(ctx, record) {
    if (!record.ensure(24, 76))
        return;
    const alpha = ctx.activeRecordType === EMF_RECORD.EMR_ALPHABLEND;
    if (alpha && (record.u8(40) !== 0 || record.u8(43) > 1)) {
        ctx.unsupportedRecordTypes.add(ctx.activeRecordType);
        return;
    }
    const bmp = readEmfEmbeddedBmp(record, 84, 88, 92, 96, ctx.limits.maxOutputBytes - ctx.outputBytes, alpha ? record.u8(43) === 1 : undefined);
    if (!bmp) {
        ctx.unsupportedRecordTypes.add(ctx.activeRecordType);
        return;
    }
    const sw = ctx.activeRecordType === EMF_RECORD.EMR_BITBLT ? record.i32(32) : record.i32(100), sh = ctx.activeRecordType === EMF_RECORD.EMR_BITBLT ? record.i32(36) : record.i32(104);
    if (alpha && (sw <= 0 || sh <= 0 || record.i32(32) <= 0 || record.i32(36) <= 0))
        throw new PptError('METAFILE_BITMAP', 'AlphaBlend source and destination extents must be positive');
    addRasterImage(ctx, {
        left: record.i32(24),
        top: record.i32(28),
        right: record.i32(24) + record.i32(32),
        bottom: record.i32(28) + record.i32(36),
    }, bmp, { left: record.i32(44), top: record.i32(48), right: record.i32(44) + sw, bottom: record.i32(48) + sh }, readXForm(record, 52), alpha ? record.u8(42) / 255 : 1);
}
function closeCurrentPathFigure(ctx) {
    if (!ctx.pathData.length)
        return;
    addPathFragment(ctx, 'Z', []);
}
function parseEmf(bytes, limits) {
    const reader = new BinaryReader(bytes);
    if (!reader.ensure(0, 88) || reader.u32(0) !== EMF_RECORD.EMR_HEADER)
        return null;
    const bounds = normalizeRect({
        left: reader.i32(8),
        top: reader.i32(12),
        right: reader.i32(16),
        bottom: reader.i32(20),
    });
    const viewBox = rectWidth(bounds) > 0 && rectHeight(bounds) > 0 ? bounds : { left: 0, top: 0, right: 1000, bottom: 1000 };
    const ctx = defaultContext(rectWidth(viewBox), rectHeight(viewBox), viewBox, limits, reader.u16(56));
    ctx.state.windowOrg = { x: viewBox.left, y: viewBox.top };
    ctx.state.windowExt = { x: rectWidth(viewBox), y: rectHeight(viewBox) };
    ctx.state.viewportOrg = { x: viewBox.left, y: viewBox.top };
    ctx.state.viewportExt = { x: rectWidth(viewBox), y: rectHeight(viewBox) };
    let cursor = 0;
    while (cursor + 8 <= bytes.length) {
        const type = reader.u32(cursor);
        const size = reader.u32(cursor + 4);
        if (size < 8 || size % 4 !== 0 || cursor + size > bytes.length || size < (EMF_MIN_BYTES[type] ?? 8))
            throw new PptError('METAFILE_RECORD_LENGTH', `EMF record ${type} exceeds its payload or has a truncated fixed prefix`, cursor);
        const record = new BinaryReader(bytes.subarray(cursor, cursor + size));
        countRecord(ctx);
        ctx.activeRecordType = type;
        switch (type) {
            case EMF_RECORD.EMR_HEADER:
                break;
            case EMF_RECORD.EMR_EOF:
                cursor += size;
                return finalizeSvg(ctx, 'image/emf');
            case EMF_RECORD.EMR_SETWINDOWORGEX:
                ctx.state.windowOrg = { x: record.i32(8), y: record.i32(12) };
                break;
            case EMF_RECORD.EMR_SETWINDOWEXTEX:
                ctx.state.windowExt = { x: record.i32(8), y: record.i32(12) };
                break;
            case EMF_RECORD.EMR_SETVIEWPORTORGEX:
                ctx.state.viewportOrg = { x: record.i32(8), y: record.i32(12) };
                break;
            case EMF_RECORD.EMR_SETVIEWPORTEXTEX:
                ctx.state.viewportExt = { x: record.i32(8), y: record.i32(12) };
                break;
            case EMF_RECORD.EMR_SETBKMODE:
                ctx.state.bkMode = record.u32(8);
                break;
            case EMF_RECORD.EMR_SETPOLYFILLMODE:
                ctx.state.polygonFillMode = record.u32(8);
                break;
            case EMF_RECORD.EMR_SETTEXTALIGN:
                ctx.state.textAlign = record.u32(8);
                break;
            case EMF_RECORD.EMR_SETTEXTCOLOR:
                ctx.state.textColor = colorRefToCss(record.u32(8));
                break;
            case EMF_RECORD.EMR_SETBKCOLOR:
                ctx.state.bkColor = colorRefToCss(record.u32(8));
                break;
            case EMF_RECORD.EMR_SETARCDIRECTION:
                ctx.state.arcDirection = record.u32(8) === 2 ? 2 : 1;
                break;
            case EMF_RECORD.EMR_INTERSECTCLIPRECT:
            case EMF_RECORD.EMR_EXCLUDECLIPRECT: {
                const r = { left: record.i32(8), top: record.i32(12), right: record.i32(16), bottom: record.i32(20) };
                clipPath(ctx, rectanglePath(ctx, r).path, type === EMF_RECORD.EMR_INTERSECTCLIPRECT ? 1 : 4);
                break;
            }
            case EMF_RECORD.EMR_SAVEDC:
                saveState(ctx);
                break;
            case EMF_RECORD.EMR_RESTOREDC: {
                restoreState(ctx, record.i32(8));
                break;
            }
            case EMF_RECORD.EMR_SETWORLDTRANSFORM:
                ctx.state.worldTransform = readXForm(record, 8);
                break;
            case EMF_RECORD.EMR_MODIFYWORLDTRANSFORM: {
                const xform = readXForm(record, 8);
                const mode = record.u32(32);
                if (mode === MODIFY_WORLD_TRANSFORM.MWT_IDENTITY)
                    ctx.state.worldTransform = { ...IDENTITY_MATRIX };
                else if (mode === MODIFY_WORLD_TRANSFORM.MWT_SET)
                    ctx.state.worldTransform = xform;
                else if (mode === MODIFY_WORLD_TRANSFORM.MWT_LEFTMULTIPLY)
                    ctx.state.worldTransform = multiplyMatrix(xform, ctx.state.worldTransform);
                else if (mode === MODIFY_WORLD_TRANSFORM.MWT_RIGHTMULTIPLY)
                    ctx.state.worldTransform = multiplyMatrix(ctx.state.worldTransform, xform);
                break;
            }
            case EMF_RECORD.EMR_MOVETOEX:
                ctx.state.currentPosition = { x: record.i32(8), y: record.i32(12) };
                break;
            case EMF_RECORD.EMR_LINETO: {
                const end = { x: record.i32(8), y: record.i32(12) };
                addLine(ctx, ctx.state.currentPosition, end);
                break;
            }
            case EMF_RECORD.EMR_POLYLINE:
            case EMF_RECORD.EMR_POLYGON:
            case EMF_RECORD.EMR_POLYLINE16:
            case EMF_RECORD.EMR_POLYGON16: {
                const count = record.u32(24);
                const pointOffset = 28;
                const pointSize = (type === EMF_RECORD.EMR_POLYLINE16 || type === EMF_RECORD.EMR_POLYGON16) ? 4 : 8;
                const points = readEmfPointArray(ctx, record, pointOffset, count, pointSize);
                addPolyline(ctx, points, type === EMF_RECORD.EMR_POLYGON || type === EMF_RECORD.EMR_POLYGON16);
                break;
            }
            case EMF_RECORD.EMR_POLYBEZIER:
            case EMF_RECORD.EMR_POLYBEZIER16: {
                const count = record.u32(24);
                const pointOffset = 28;
                const pointSize = type === EMF_RECORD.EMR_POLYBEZIER16 ? 4 : 8;
                const points = readEmfPointArray(ctx, record, pointOffset, count, pointSize);
                addBezierPath(ctx, points, false);
                break;
            }
            case EMF_RECORD.EMR_POLYBEZIERTO:
            case EMF_RECORD.EMR_POLYBEZIERTO16: {
                const count = record.u32(24);
                const pointOffset = 28;
                const pointSize = type === EMF_RECORD.EMR_POLYBEZIERTO16 ? 4 : 8;
                const points = readEmfPointArray(ctx, record, pointOffset, count, pointSize);
                addBezierPath(ctx, points, true);
                break;
            }
            case EMF_RECORD.EMR_POLYLINETO:
            case EMF_RECORD.EMR_POLYLINETO16: {
                const count = record.u32(24);
                const pointOffset = 28;
                const pointSize = type === EMF_RECORD.EMR_POLYLINETO16 ? 4 : 8;
                const points = readEmfPointArray(ctx, record, pointOffset, count, pointSize);
                addPolyline(ctx, [{ ...ctx.state.currentPosition }, ...points], false);
                break;
            }
            case EMF_RECORD.EMR_POLYPOLYLINE:
            case EMF_RECORD.EMR_POLYPOLYGON:
            case EMF_RECORD.EMR_POLYPOLYLINE16:
            case EMF_RECORD.EMR_POLYPOLYGON16: {
                const polygonCount = record.u32(24);
                const pointCount = record.u32(28);
                const countsOffset = 32;
                const pointSize = (type === EMF_RECORD.EMR_POLYPOLYLINE16 || type === EMF_RECORD.EMR_POLYPOLYGON16) ? 4 : 8;
                const pointsOffset = countsOffset + polygonCount * 4;
                if (!record.ensure(countsOffset, polygonCount * 4) || !record.ensure(pointsOffset, pointCount * pointSize))
                    throw new PptError('METAFILE_POINTS', 'EMF polygon counts or points exceed their own record', cursor);
                if (polygonCount > limits.maxPoints)
                    throw new PptError('METAFILE_POINT_LIMIT', 'EMF polygon count exceeds the configured limit', cursor);
                const counts = [];
                for (let i = 0; i < polygonCount; i += 1)
                    counts.push(record.u32(countsOffset + i * 4));
                if (counts.reduce((sum, count) => sum + count, 0) !== pointCount)
                    throw new PptError('METAFILE_POINTS', 'EMF polygon counts disagree with the declared point count', cursor);
                const points = readEmfPointArray(ctx, record, pointsOffset, pointCount, pointSize);
                let index = 0;
                const polygons = [], closed = type === EMF_RECORD.EMR_POLYPOLYGON || type === EMF_RECORD.EMR_POLYPOLYGON16;
                for (const count of counts) {
                    if (closed)
                        polygons.push(points.slice(index, index + count));
                    else
                        addPolyline(ctx, points.slice(index, index + count), false);
                    index += count;
                }
                if (closed)
                    addCompoundPolygons(ctx, polygons);
                break;
            }
            case EMF_RECORD.EMR_RECTANGLE:
                addRect(ctx, { left: record.i32(8), top: record.i32(12), right: record.i32(16), bottom: record.i32(20) });
                break;
            case EMF_RECORD.EMR_ELLIPSE:
                addEllipse(ctx, { left: record.i32(8), top: record.i32(12), right: record.i32(16), bottom: record.i32(20) });
                break;
            case EMF_RECORD.EMR_ROUNDRECT:
                addRect(ctx, { left: record.i32(8), top: record.i32(12), right: record.i32(16), bottom: record.i32(20) }, { x: record.i32(24), y: record.i32(28) });
                break;
            case EMF_RECORD.EMR_ARC:
            case EMF_RECORD.EMR_ARCTO:
            case EMF_RECORD.EMR_CHORD:
            case EMF_RECORD.EMR_PIE:
                addArc(ctx, { left: record.i32(8), top: record.i32(12), right: record.i32(16), bottom: record.i32(20) }, { x: record.i32(24), y: record.i32(28) }, { x: record.i32(32), y: record.i32(36) }, type === EMF_RECORD.EMR_ARCTO ? 'arcTo' : type === EMF_RECORD.EMR_CHORD ? 'chord' : type === EMF_RECORD.EMR_PIE ? 'pie' : 'arc');
                break;
            case EMF_RECORD.EMR_BEGINPATH:
                ctx.capturePath = true;
                ctx.pathData = [];
                ctx.pathPoints = [];
                ctx.pathBytes = 0;
                break;
            case EMF_RECORD.EMR_ENDPATH:
                ctx.capturePath = false;
                break;
            case EMF_RECORD.EMR_CLOSEFIGURE:
                closeCurrentPathFigure(ctx);
                break;
            case EMF_RECORD.EMR_FILLPATH:
                flushPath(ctx, fillOnlyAttributes(ctx));
                break;
            case EMF_RECORD.EMR_STROKEANDFILLPATH:
                flushPath(ctx, fillAttributes(ctx));
                break;
            case EMF_RECORD.EMR_STROKEPATH:
                flushPath(ctx, strokeAttributes(ctx, ctx.state.pen));
                break;
            case EMF_RECORD.EMR_SELECTCLIPPATH:
                if (!ctx.pathData.length || !clipPath(ctx, ctx.pathData.join(' '), record.u32(8)))
                    ctx.unsupportedRecordTypes.add(type);
                ctx.capturePath = false;
                ctx.pathData = [];
                ctx.pathPoints = [];
                ctx.pathBytes = 0;
                break;
            case EMF_RECORD.EMR_CREATEPEN: {
                const index = record.u32(8);
                const style = record.u32(12);
                const width = record.i32(16);
                const color = colorRefToCss(record.u32(24));
                setObject(ctx, index, { kind: 'pen', value: penStyleFromCode(style, width, color) });
                break;
            }
            case EMF_RECORD.EMR_CREATEBRUSHINDIRECT: {
                const index = record.u32(8);
                const style = record.u32(12);
                if (style > 2 || style === 2 && record.u32(20) > 5)
                    ctx.unsupportedRecordTypes.add(type);
                const color = colorRefToCss(record.u32(16));
                setObject(ctx, index, { kind: 'brush', value: brushStyleFromCode(style, color, record.u32(20)) });
                break;
            }
            case EMF_RECORD.EMR_EXTCREATEPEN: {
                const index = record.u32(8);
                const style = record.u32(28);
                const width = record.i32(32);
                const brushStyle = record.u32(36);
                if (brushStyle > 1 || (style & 15) > 5)
                    ctx.unsupportedRecordTypes.add(type);
                const color = brushStyle === 1 ? 'none' : colorRefToCss(record.u32(40));
                setObject(ctx, index, { kind: 'pen', value: brushStyle === 1 ? { color, width, none: true } : penStyleFromCode(style, width, color) });
                break;
            }
            case EMF_RECORD.EMR_EXTCREATEFONTINDIRECTW: {
                const index = record.u32(8);
                const font = readEmfFont(new BinaryReader(record.slice(0, size)));
                if (font)
                    setObject(ctx, index, { kind: 'font', value: { ...font, charset: record.u8(35) } });
                break;
            }
            case EMF_RECORD.EMR_SELECTOBJECT:
                selectObject(ctx, record.u32(8));
                break;
            case EMF_RECORD.EMR_DELETEOBJECT: {
                const index = record.u32(8);
                deleteObject(ctx, index);
                break;
            }
            case EMF_RECORD.EMR_EXTTEXTOUTA: {
                const parsed = parseEmfText(ctx, record, false);
                if (parsed)
                    addText(ctx, parsed.point, parsed.text, parsed.glyphIndices, parsed);
                break;
            }
            case EMF_RECORD.EMR_EXTTEXTOUTW: {
                const parsed = parseEmfText(ctx, record, true);
                if (parsed)
                    addText(ctx, parsed.point, parsed.text, parsed.glyphIndices, parsed);
                break;
            }
            case EMF_RECORD.EMR_SMALLTEXTOUT: {
                const parsed = parseSmallEmfText(ctx, record);
                if (parsed)
                    addText(ctx, parsed.point, parsed.text, parsed.glyphIndices, parsed);
                break;
            }
            case EMF_RECORD.EMR_STRETCHDIBITS:
                if (record.u32(68) !== 0x00CC0020 || record.u32(64) !== 0)
                    ctx.unsupportedRecordTypes.add(type);
                addEmfStretchDibits(ctx, record);
                break;
            case EMF_RECORD.EMR_BITBLT:
            case EMF_RECORD.EMR_STRETCHBLT:
            case EMF_RECORD.EMR_ALPHABLEND:
                if (type !== EMF_RECORD.EMR_ALPHABLEND && record.u32(40) !== 0x00CC0020 || record.u32(80) !== 0)
                    ctx.unsupportedRecordTypes.add(type);
                addEmfBltBitmap(ctx, record);
                break;
            default:
                ctx.unsupportedRecordTypes.add(type);
                break;
        }
        cursor += size;
    }
    return finalizeSvg(ctx, 'image/emf');
}
export function convertMetafileToSvg(mime, bytes, options = {}) {
    if (!bytes.length)
        return null;
    const limits = { ...DEFAULT_VECTOR_LIMITS, ...options };
    for (const value of Object.values(limits))
        if (!Number.isSafeInteger(value) || value < 0)
            throw new RangeError('Vector conversion limits must be nonnegative safe integers');
    limits.maxObjects = Math.min(limits.maxObjects, 65536);
    if (/image\/emf/i.test(mime))
        return parseEmf(bytes, limits);
    if (/image\/wmf/i.test(mime))
        return parseWmf(bytes, limits);
    return null;
}
