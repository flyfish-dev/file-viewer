import { codePoint as dingbatCodePoint } from 'dingbat-to-unicode';
import { BinaryReader } from './binary.js';
import { dataUrlFromBytes, escapeHtml } from './utils.js';

export interface ConvertedVectorImage {
  mime: 'image/svg+xml';
  bytes: Uint8Array;
  dataUrl: string;
  width: number;
  height: number;
  sourceMime: 'image/emf' | 'image/wmf';
  recordCount: number;
}

type VectorSourceMime = ConvertedVectorImage['sourceMime'];

interface Point {
  x: number;
  y: number;
}

interface TextAdvances {
  x: number[];
  y?: number[];
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Matrix {
  m11: number;
  m12: number;
  m21: number;
  m22: number;
  dx: number;
  dy: number;
}

interface PenState {
  color: string;
  width: number;
  dasharray?: string;
  none?: boolean;
}

interface BrushState {
  color: string;
  none?: boolean;
}

interface FontState {
  family: string;
  size: number;
  weight?: number;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  escapement?: number;
  charset?: number;
}

interface GraphicsState {
  windowOrg: Point;
  windowExt: Point;
  viewportOrg: Point;
  viewportExt: Point;
  /** Set once the metafile selects its own viewport; until then the window drives it. */
  viewportExplicit: boolean;
  worldTransform: Matrix;
  currentPosition: Point;
  pen: PenState;
  brush: BrushState;
  font: FontState;
  textColor: string;
  bkColor: string;
  bkMode: number;
  textAlign: number;
  polygonFillMode: number;
}

type GraphicsObject =
  | { kind: 'pen'; value: PenState }
  | { kind: 'brush'; value: BrushState }
  | { kind: 'font'; value: FontState };

interface ParseContext {
  width: number;
  height: number;
  viewBox: Rect;
  state: GraphicsState;
  objects: Array<GraphicsObject | null>;
  stateStack: GraphicsState[];
  nodes: string[];
  capturePath: boolean;
  pathData: string[];
  pathPoints: Point[];
  recordCount: number;
  contentBounds: Rect | null;
}

const DEFAULT_PEN: PenState = { color: '#000000', width: 1 };
const DEFAULT_BRUSH: BrushState = { color: '#ffffff', none: true };
const DEFAULT_FONT: FontState = { family: 'sans-serif', size: 12 };
const IDENTITY_MATRIX: Matrix = { m11: 1, m12: 0, m21: 0, m22: 1, dx: 0, dy: 0 };

const PLACEABLE_WMF_KEY = 0x9ac6cdd7;
const WMF_HEADER_SIZE = 18;

const WMF_RECORD = {
  META_EOF: 0x0000,
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
  META_SETTEXTALIGN: 0x012e,
  META_POLYGON: 0x0324,
  META_POLYLINE: 0x0325,
  META_TEXTOUT: 0x0521,
  META_EXTTEXTOUT: 0x0a32,
  META_POLYPOLYGON: 0x0538,
  META_ELLIPSE: 0x0418,
  META_RECTANGLE: 0x041b,
  META_ROUNDRECT: 0x061c,
  META_CREATEBRUSHINDIRECT: 0x02fc,
  META_CREATEPENINDIRECT: 0x02fa,
  META_CREATEFONTINDIRECT: 0x02fb,
  META_SELECTOBJECT: 0x012d,
  META_DELETEOBJECT: 0x01f0,
} as const;

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
} as const;

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
} as const;

const MODIFY_WORLD_TRANSFORM = {
  MWT_IDENTITY: 1,
  MWT_LEFTMULTIPLY: 2,
  MWT_RIGHTMULTIPLY: 3,
  MWT_SET: 4,
} as const;

function numberCss(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function rectWidth(rect: Rect): number {
  return Math.max(1, rect.right - rect.left || 0);
}

function rectHeight(rect: Rect): number {
  return Math.max(1, rect.bottom - rect.top || 0);
}

function normalizeRect(rect: Rect): Rect {
  return {
    left: Math.min(rect.left, rect.right),
    top: Math.min(rect.top, rect.bottom),
    right: Math.max(rect.left, rect.right),
    bottom: Math.max(rect.top, rect.bottom),
  };
}

function updateBounds(ctx: ParseContext, points: Point[]): void {
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
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

function colorRefToCss(colorRef: number): string {
  const red = colorRef & 0xff;
  const green = (colorRef >>> 8) & 0xff;
  const blue = (colorRef >>> 16) & 0xff;
  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function createBitmapFileHeader(pixelOffset: number, fileSize: number): Uint8Array {
  const header = new Uint8Array(14);
  const view = new DataView(header.buffer);
  header[0] = 0x42;
  header[1] = 0x4d;
  view.setUint32(2, fileSize >>> 0, true);
  view.setUint32(10, pixelOffset >>> 0, true);
  return header;
}

function bitmapInfoToBmp(bmi: Uint8Array, bits: Uint8Array): Uint8Array | null {
  if (bmi.length < 12 || !bits.length) return null;
  const pixelOffset = 14 + bmi.length;
  const fileSize = pixelOffset + bits.length;
  const out = new Uint8Array(fileSize);
  out.set(createBitmapFileHeader(pixelOffset, fileSize), 0);
  out.set(bmi, 14);
  out.set(bits, pixelOffset);
  return out;
}

function penStyleFromCode(style: number, width: number, color: string): PenState {
  const normalizedWidth = Math.max(1, Math.abs(width) || 1);
  const base: PenState = { color, width: normalizedWidth };
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

function brushStyleFromCode(style: number, color: string): BrushState {
  if (style === 1) return { color, none: true };
  return { color };
}

function cloneGraphicsState(state: GraphicsState): GraphicsState {
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
  };
}

function readXForm(reader: BinaryReader, offset: number): Matrix {
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

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  return {
    m11: left.m11 * right.m11 + left.m12 * right.m21,
    m12: left.m11 * right.m12 + left.m12 * right.m22,
    m21: left.m21 * right.m11 + left.m22 * right.m21,
    m22: left.m21 * right.m12 + left.m22 * right.m22,
    dx: left.dx * right.m11 + left.dy * right.m21 + right.dx,
    dy: left.dx * right.m12 + left.dy * right.m22 + right.dy,
  };
}

function transformPoint(matrix: Matrix, point: Point): Point {
  return {
    x: point.x * matrix.m11 + point.y * matrix.m21 + matrix.dx,
    y: point.x * matrix.m12 + point.y * matrix.m22 + matrix.dy,
  };
}

function transformVector(matrix: Matrix, vector: Point): Point {
  return {
    x: vector.x * matrix.m11 + vector.y * matrix.m21,
    y: vector.x * matrix.m12 + vector.y * matrix.m22,
  };
}

function defaultContext(width: number, height: number, viewBox: Rect): ParseContext {
  return {
    width,
    height,
    viewBox,
    recordCount: 0,
    contentBounds: null,
    nodes: [],
    stateStack: [],
    capturePath: false,
    pathData: [],
    pathPoints: [],
    objects: [],
    state: {
      windowOrg: { x: viewBox.left, y: viewBox.top },
      windowExt: { x: rectWidth(viewBox), y: rectHeight(viewBox) },
      viewportOrg: { x: viewBox.left, y: viewBox.top },
      viewportExt: { x: rectWidth(viewBox), y: rectHeight(viewBox) },
      viewportExplicit: false,
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
    },
  };
}

function mapPoint(ctx: ParseContext, point: Point): Point {
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

function mapVector(ctx: ParseContext, vector: Point): Point {
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

function mapRect(ctx: ParseContext, rect: Rect): Rect {
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

function pointAttr(point: Point): string {
  return `${numberCss(point.x)},${numberCss(point.y)}`;
}

function effectivePenWidth(ctx: ParseContext, pen: PenState): number {
  const width = Math.max(1, Math.abs(pen.width) || 1);
  const vx = mapVector(ctx, { x: width, y: 0 });
  const vy = mapVector(ctx, { x: 0, y: width });
  const sx = Math.hypot(vx.x, vx.y);
  const sy = Math.hypot(vy.x, vy.y);
  const scaled = (sx + sy) / 2;
  if (!Number.isFinite(scaled) || scaled <= 0) return width;
  return Math.max(0.5, scaled);
}

function scaledDashArray(ctx: ParseContext, pen: PenState): string | undefined {
  if (!pen.dasharray) return undefined;
  const baseWidth = Math.max(1, Math.abs(pen.width) || 1);
  const scale = effectivePenWidth(ctx, pen) / baseWidth;
  return pen.dasharray
    .split(/\s+/)
    .map((part) => Number(part))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => numberCss(value * scale))
    .join(' ') || undefined;
}

function strokeAttributes(ctx: ParseContext, pen: PenState): string {
  if (pen.none) return 'stroke="none"';
  const attrs = [`stroke="${escapeHtml(pen.color)}"`, `stroke-width="${numberCss(effectivePenWidth(ctx, pen))}"`, 'fill="none"'];
  const dasharray = scaledDashArray(ctx, pen);
  if (dasharray) attrs.push(`stroke-dasharray="${escapeHtml(dasharray)}"`);
  return attrs.join(' ');
}

function fillAttributes(ctx: ParseContext): string {
  const attrs = [ctx.state.pen.none ? 'stroke="none"' : `stroke="${escapeHtml(ctx.state.pen.color)}"`, ctx.state.pen.none ? '' : `stroke-width="${numberCss(effectivePenWidth(ctx, ctx.state.pen))}"`].filter(Boolean);
  const dasharray = scaledDashArray(ctx, ctx.state.pen);
  if (dasharray && !ctx.state.pen.none) attrs.push(`stroke-dasharray="${escapeHtml(dasharray)}"`);
  attrs.push(ctx.state.brush.none ? 'fill="none"' : `fill="${escapeHtml(ctx.state.brush.color)}"`);
  attrs.push(`fill-rule="${ctx.state.polygonFillMode === 2 ? 'nonzero' : 'evenodd'}"`);
  return attrs.join(' ');
}

function fillOnlyAttributes(ctx: ParseContext): string {
  const attrs = ['stroke="none"'];
  attrs.push(ctx.state.brush.none ? 'fill="none"' : `fill="${escapeHtml(ctx.state.brush.color)}"`);
  attrs.push(`fill-rule="${ctx.state.polygonFillMode === 2 ? 'nonzero' : 'evenodd'}"`);
  return attrs.join(' ');
}

function ensureObjectSlot(objects: Array<GraphicsObject | null>): number {
  const free = objects.findIndex((item) => item == null);
  if (free >= 0) return free;
  objects.push(null);
  return objects.length - 1;
}

function setObject(objects: Array<GraphicsObject | null>, index: number, value: GraphicsObject): void {
  while (objects.length <= index) objects.push(null);
  objects[index] = value;
}

function selectStockObject(ctx: ParseContext, index: number): boolean {
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

function selectObject(ctx: ParseContext, index: number): void {
  if (selectStockObject(ctx, index)) return;
  const object = ctx.objects[index] || null;
  if (!object) return;
  if (object.kind === 'pen') ctx.state.pen = { ...object.value };
  if (object.kind === 'brush') ctx.state.brush = { ...object.value };
  if (object.kind === 'font') ctx.state.font = { ...object.value };
}

function addNode(ctx: ParseContext, svg: string, points: Point[]): void {
  ctx.nodes.push(svg);
  updateBounds(ctx, points);
}

function addPathFragment(ctx: ParseContext, fragment: string, points: Point[]): void {
  if (!fragment) return;
  ctx.pathData.push(fragment);
  ctx.pathPoints.push(...points);
}

function flushPath(ctx: ParseContext, attrs: string): void {
  if (!ctx.pathData.length) return;
  addNode(ctx, `<path d="${ctx.pathData.join(' ')}" ${attrs} />`, ctx.pathPoints);
  ctx.pathData = [];
  ctx.pathPoints = [];
  ctx.capturePath = false;
}

function addLine(ctx: ParseContext, start: Point, end: Point): void {
  const a = mapPoint(ctx, start);
  const b = mapPoint(ctx, end);
  ctx.state.currentPosition = { ...end };
  if (ctx.capturePath) {
    addPathFragment(ctx, `${ctx.pathData.length ? '' : `M ${pointAttr(a)}`} L ${pointAttr(b)}`.trim(), [a, b]);
    return;
  }
  addNode(ctx, `<line x1="${numberCss(a.x)}" y1="${numberCss(a.y)}" x2="${numberCss(b.x)}" y2="${numberCss(b.y)}" ${strokeAttributes(ctx, ctx.state.pen)} />`, [a, b]);
}

function addPolyline(ctx: ParseContext, points: Point[], closed: boolean): void {
  if (!points.length) return;
  const mapped = points.map((point) => mapPoint(ctx, point));
  ctx.state.currentPosition = { ...points[points.length - 1]! };
  const attr = mapped.map(pointAttr).join(' ');
  if (ctx.capturePath) {
    const commands = [`M ${pointAttr(mapped[0]! )}`, ...mapped.slice(1).map((point) => `L ${pointAttr(point)}`)];
    if (closed) commands.push('Z');
    addPathFragment(ctx, commands.join(' '), mapped);
    return;
  }
  const tag = closed ? 'polygon' : 'polyline';
  const styleAttrs = closed ? fillAttributes(ctx) : strokeAttributes(ctx, ctx.state.pen);
  addNode(ctx, `<${tag} points="${attr}" ${styleAttrs} />`, mapped);
}

function addBezierPath(ctx: ParseContext, points: Point[], relativeToCurrent = false): void {
  const logical: Point[] = [];
  if (relativeToCurrent) logical.push({ ...ctx.state.currentPosition });
  logical.push(...points);
  if (logical.length < 4) return;
  const mapped = logical.map((point) => mapPoint(ctx, point));
  let path = `M ${pointAttr(mapped[0]!)}`;
  for (let i = 1; i + 2 < mapped.length; i += 3) {
    path += ` C ${pointAttr(mapped[i]!)} ${pointAttr(mapped[i + 1]!)} ${pointAttr(mapped[i + 2]! )}`;
  }
  ctx.state.currentPosition = { ...logical[logical.length - 1]! };
  if (ctx.capturePath) {
    addPathFragment(ctx, path, mapped);
    return;
  }
  addNode(ctx, `<path d="${path}" ${strokeAttributes(ctx, ctx.state.pen)} />`, mapped);
}

function addRect(ctx: ParseContext, rect: Rect, radius?: Point): void {
  const mapped = mapRect(ctx, rect);
  const attrs = [
    `x="${numberCss(mapped.left)}"`,
    `y="${numberCss(mapped.top)}"`,
    `width="${numberCss(rectWidth(mapped))}"`,
    `height="${numberCss(rectHeight(mapped))}"`,
  ];
  if (radius) {
    const r = mapPoint(ctx, { x: radius.x, y: radius.y });
    attrs.push(`rx="${numberCss(Math.abs(r.x - ctx.state.viewportOrg.x))}"`);
    attrs.push(`ry="${numberCss(Math.abs(r.y - ctx.state.viewportOrg.y))}"`);
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

function addEllipse(ctx: ParseContext, rect: Rect): void {
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

function addRasterImage(ctx: ParseContext, rect: Rect, bmpBytes: Uint8Array): void {
  if (!bmpBytes.length) return;
  const mapped = mapRect(ctx, rect);
  const width = rectWidth(mapped);
  const height = rectHeight(mapped);
  const href = dataUrlFromBytes(bmpBytes, 'image/bmp');
  addNode(ctx, `<image x="${numberCss(mapped.left)}" y="${numberCss(mapped.top)}" width="${numberCss(width)}" height="${numberCss(height)}" href="${href}" preserveAspectRatio="none" />`, [
    { x: mapped.left, y: mapped.top },
    { x: mapped.right, y: mapped.bottom },
  ]);
}

// LOGFONT.CharSet values that select a legacy code page instead of the Latin default.
const CHARSET_ENCODINGS: Record<number, string> = {
  128: 'shift_jis',
  129: 'euc-kr',
  130: 'euc-kr',
  134: 'gbk',
  136: 'big5',
  161: 'windows-1253',
  162: 'windows-1254',
  163: 'windows-1258',
  177: 'windows-1255',
  178: 'windows-1256',
  186: 'windows-1257',
  204: 'windows-1251',
  222: 'windows-874',
  238: 'windows-1250',
};

function charsetEncoding(charset?: number): string {
  return (charset === undefined ? undefined : CHARSET_ENCODINGS[charset]) ?? 'windows-1252';
}

function decodeAnsi(bytes: Uint8Array, charset?: number): string {
  return new TextDecoder(charsetEncoding(charset)).decode(bytes).replace(/\0+$/g, '');
}

/**
 * WMF spacing arrays carry one entry per byte, but charsets such as GB2312 are multi-byte.
 * Feeding the decoder a byte at a time reveals how many bytes each character consumed, so
 * their spacing can be folded onto the first code unit of that character.
 */
function decodeWmfRun(bytes: Uint8Array, charset: number | undefined, dx: number[]): { text: string; advances: number[] } {
  const encoding = charsetEncoding(charset);
  if (!dx.length || encoding === charsetEncoding(undefined)) return { text: decodeAnsi(bytes, charset), advances: dx };

  const decoder = new TextDecoder(encoding);
  let text = '';
  const advances: number[] = [];
  let pending = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    const decoded = decoder.decode(bytes.subarray(index, index + 1), { stream: true });
    pending += dx[index] ?? 0;
    if (!decoded) continue;
    text += decoded;
    advances.push(pending);
    for (let unit = 1; unit < decoded.length; unit += 1) advances.push(0);
    pending = 0;
  }
  const trimmed = text.replace(/\0+$/g, '');
  return { text: trimmed, advances: advances.slice(0, Math.max(trimmed.length, 0)) };
}

function decodeUtf16(bytes: Uint8Array): string {
  return new TextDecoder('utf-16le').decode(bytes).replace(/\0+$/g, '');
}

function textAnchor(textAlign: number): string {
  const horizontal = textAlign & 0x0006;
  if (horizontal === 0x0002) return 'end';
  if (horizontal === 0x0006) return 'middle';
  return 'start';
}

function dominantBaseline(textAlign: number): string {
  const vertical = textAlign & 0x0018;
  if (vertical === 0x0008) return 'text-after-edge';
  if (vertical === 0x0018) return 'alphabetic';
  return 'text-before-edge';
}

function effectiveFontSize(ctx: ParseContext, fontSize: number): number {
  const mapped = mapVector(ctx, { x: 0, y: Math.abs(fontSize) || 12 });
  const scaled = Math.hypot(mapped.x, mapped.y);
  if (!Number.isFinite(scaled) || scaled <= 0) {
    return Math.max(1, Math.abs(fontSize) || 12);
  }
  return Math.max(1, scaled);
}

function normalizeFontFamily(family: string): string {
  const trimmed = String(family || '').trim();
  if (!trimmed) return 'sans-serif';
  // Drop charset/script suffixes such as "Times New Roman Baltic".
  return trimmed.replace(/\s+(?:Baltic|CE|Cyr|Greek|Tur|Vietnamese|Hebrew|Arabic|Thai|Symbol)$/i, '') || 'sans-serif';
}

// Office metafiles encode Symbol / MT Extra / Euclid Math Two glyphs in the 0xF000
// private-use range (EMF) or as raw font bytes (WMF). Browsers do not ship those fonts,
// and the glyphs are not reachable even when they are installed — MT Extra omits 0x3A
// from its cmap entirely — so the characters are mapped to Unicode before emitting SVG.

// MathType companion font. Code points confirmed from equation context in courseware:
// 0x3A in "tan x ∼ x", 0x4C in "(k = 0, ±1, ±2, ⋯)", 0x55 in "(1,2) ∪ (2,+∞)";
// 0x4F and 0x72 additionally match the glyph outlines shipped in MT Extra.
const MT_EXTRA_MAP: Record<number, string> = {
  0x3a: '∼', 0x4c: '⋯', 0x4f: '⋱', 0x55: '∪', 0x72: '→',
};

// Euclid Math Two arrives either as raw bytes or as the matching CP1252 characters.
const EUCLID_MATH_TWO_MAP: Record<number, string> = {
  0x84: '≤', 0x85: '≥', 0x201e: '≤', 0x201f: '≥',
};

// WMF stores symbol-font runs as raw bytes, and decoding them as text remaps 0x80-0x9F to
// typographic characters. The original byte has to be recovered before the table lookup.
const CP1252_TO_BYTE = new Map<number, number>(
  Array.from(new TextDecoder('windows-1252').decode(Uint8Array.from({ length: 32 }, (_, index) => 0x80 + index)))
    .map((character, index) => [character.codePointAt(0) ?? 0, 0x80 + index]),
);

function mapMetafileText(text: string, family: string): string {
  if (!text) return text;
  const name = family.trim().toLowerCase();
  const table = name === 'mt extra'
    ? MT_EXTRA_MAP
    : name === 'euclid math two'
      ? EUCLID_MATH_TWO_MAP
      : null;
  const adobeSymbol = name === 'symbol';
  if (!table && !adobeSymbol) return text;

  let result = '';
  for (const character of text) {
    const raw = character.codePointAt(0) ?? 0;
    const inPrivateUse = raw >= 0xf000 && raw <= 0xf0ff;
    const code = inPrivateUse ? raw - 0xf000 : (CP1252_TO_BYTE.get(raw) ?? raw);
    const mapped = table ? (table[raw] ?? table[code]) : dingbatCodePoint('Symbol', code)?.string;
    if (mapped) {
      result += mapped;
      continue;
    }
    // Positions the font shares with ASCII (=, <, +, digits) have no table entry;
    // keeping the private-use character would leave a tofu box behind.
    result += inPrivateUse && code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : character;
  }
  return result;
}

function addText(ctx: ParseContext, point: Point, text: string, advances?: TextAdvances): void {
  const renderedText = mapMetafileText(text, ctx.state.font.family);
  if (!renderedText) return;
  const mapped = mapPoint(ctx, point);
  const fontSize = effectiveFontSize(ctx, ctx.state.font.size || 12);
  const attrs = [
    `x="${numberCss(mapped.x)}"`,
    `y="${numberCss(mapped.y)}"`,
    `fill="${escapeHtml(ctx.state.textColor)}"`,
    `font-size="${numberCss(fontSize)}"`,
    `font-family="${escapeHtml(normalizeFontFamily(ctx.state.font.family))}"`,
    `text-anchor="${textAnchor(ctx.state.textAlign)}"`,
    `dominant-baseline="${dominantBaseline(ctx.state.textAlign)}"`,
  ];
  if (ctx.state.font.weight && ctx.state.font.weight >= 600) attrs.push('font-weight="700"');
  if (ctx.state.font.italic) attrs.push('font-style="italic"');
  const decorations = [ctx.state.font.underline ? 'underline' : '', ctx.state.font.strike ? 'line-through' : ''].filter(Boolean);
  if (decorations.length) attrs.push(`text-decoration="${decorations.join(' ')}"`);
  if (ctx.state.font.escapement) {
    // GDI angles are counter-clockwise, while SVG positive rotation follows
    // the screen coordinate system and therefore turns clockwise.
    attrs.push(`transform="rotate(${numberCss(-ctx.state.font.escapement / 10)}, ${numberCss(mapped.x)}, ${numberCss(mapped.y)})"`);
  }
  const body = glyphRunBody(ctx, renderedText, mapped, advances);
  addNode(ctx, `<text ${attrs.join(' ')}>${body}</text>`, [mapped]);
}

function addExtText(ctx: ParseContext, reference: Point, text: string, advances: TextAdvances): void {
  // TA_UPDATECP uses the current logical position in place of the record reference.
  const updatePosition = (ctx.state.textAlign & 0x0001) !== 0;
  const point = updatePosition ? ctx.state.currentPosition : reference;
  addText(ctx, point, text, advances);
  if (updatePosition) {
    const dx = advances.x.length
      ? advances.x.reduce((sum, value) => sum + value, 0)
      : Math.abs(ctx.state.font.size || 12) * Array.from(text).length * 0.5;
    const dy = advances.y?.reduce((sum, value) => sum + value, 0) ?? 0;
    ctx.state.currentPosition = { x: point.x + dx, y: point.y + dy };
  }
}

/**
 * MathType packs glyphs that are scattered across an equation into a single ExtTextOut
 * and positions them through the per-character spacing array. Emitting the run as one
 * string would let browser font metrics decide the spacing and scramble the layout, so
 * every character gets an explicit coordinate whenever the array is present.
 */
function glyphRunBody(ctx: ParseContext, text: string, origin: Point, advances?: TextAdvances): string {
  const characters = Array.from(text);
  if (!advances || advances.x.length < characters.length) return escapeHtml(text);

  const spans: string[] = [];
  const offset = { x: 0, y: 0 };
  let index = 0;
  for (const character of characters) {
    const delta = mapVector(ctx, offset);
    spans.push(`<tspan x="${numberCss(origin.x + delta.x)}" y="${numberCss(origin.y + delta.y)}">${escapeHtml(character)}</tspan>`);
    // Surrogate pairs consume one spacing entry per UTF-16 unit.
    for (let unit = 0; unit < character.length; unit += 1, index += 1) {
      offset.x += advances.x[index] ?? 0;
      offset.y += advances.y?.[index] ?? 0;
    }
  }
  return spans.join('');
}

function finalizeSvg(ctx: ParseContext, sourceMime: VectorSourceMime): ConvertedVectorImage | null {
  if (!ctx.nodes.length) return null;
  const fallback = ctx.contentBounds ? normalizeRect(ctx.contentBounds) : normalizeRect(ctx.viewBox);
  const viewBox = normalizeRect({
    left: Number.isFinite(ctx.viewBox.left) ? ctx.viewBox.left : fallback.left,
    top: Number.isFinite(ctx.viewBox.top) ? ctx.viewBox.top : fallback.top,
    right: Number.isFinite(ctx.viewBox.right) ? ctx.viewBox.right : fallback.right,
    bottom: Number.isFinite(ctx.viewBox.bottom) ? ctx.viewBox.bottom : fallback.bottom,
  });
  const width = Math.max(1, Math.round(rectWidth(viewBox)));
  const height = Math.max(1, Math.round(rectHeight(viewBox)));
  // Metafiles are transparent unless their records explicitly paint a
  // background. An unconditional white canvas hides overlapping slide content.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${numberCss(viewBox.left)} ${numberCss(viewBox.top)} ${numberCss(rectWidth(viewBox))} ${numberCss(rectHeight(viewBox))}" preserveAspectRatio="xMinYMin meet">\n${ctx.nodes.join('\n')}\n</svg>`;
  const encoded = new TextEncoder().encode(svg);
  return {
    mime: 'image/svg+xml',
    bytes: encoded,
    dataUrl: dataUrlFromBytes(encoded, 'image/svg+xml'),
    width,
    height,
    sourceMime,
    recordCount: ctx.recordCount,
  };
}

function parseWmf(bytes: Uint8Array): ConvertedVectorImage | null {
  const reader = new BinaryReader(bytes);
  let offset = 0;
  let placeableBounds: Rect | null = null;
  if (reader.u32(0) === PLACEABLE_WMF_KEY && bytes.length >= 22) {
    placeableBounds = normalizeRect({
      left: reader.i16(6),
      top: reader.i16(8),
      right: reader.i16(10),
      bottom: reader.i16(12),
    });
    offset = 22;
  }
  if (offset + WMF_HEADER_SIZE > bytes.length) return null;
  const header = new BinaryReader(bytes.subarray(offset));
  const headerSizeWords = header.u16(2);
  const numberOfObjects = header.u16(10);
  const recordOffset = offset + headerSizeWords * 2;
  if (recordOffset > bytes.length) return null;

  const viewBox = placeableBounds || { left: 0, top: 0, right: 1000, bottom: 1000 };
  const ctx = defaultContext(rectWidth(viewBox), rectHeight(viewBox), viewBox);
  ctx.objects = new Array<GraphicsObject | null>(Math.max(0, numberOfObjects)).fill(null);
  if (placeableBounds) {
    ctx.state.windowOrg = { x: placeableBounds.left, y: placeableBounds.top };
    ctx.state.windowExt = { x: rectWidth(placeableBounds), y: rectHeight(placeableBounds) };
    ctx.state.viewportOrg = { x: placeableBounds.left, y: placeableBounds.top };
    ctx.state.viewportExt = { x: rectWidth(placeableBounds), y: rectHeight(placeableBounds) };
  }

  let cursor = recordOffset;
  while (cursor + 6 <= bytes.length) {
    const recordReader = new BinaryReader(bytes.subarray(cursor));
    const sizeWords = recordReader.u32(0);
    const recordSize = sizeWords * 2;
    if (recordSize < 6 || cursor + recordSize > bytes.length) break;
    const fn = recordReader.u16(4);
    ctx.recordCount += 1;

    switch (fn) {
      case WMF_RECORD.META_EOF:
        return finalizeSvg(ctx, 'image/wmf');
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
      case WMF_RECORD.META_SETTEXTALIGN:
        ctx.state.textAlign = recordReader.u16(6);
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
        const points: Point[] = [];
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
        const counts: number[] = [];
        let dataOffset = 8;
        for (let i = 0; i < polygons && dataOffset + 2 <= recordSize; i += 1) {
          counts.push(recordReader.u16(dataOffset));
          dataOffset += 2;
        }
        for (const count of counts) {
          const points: Point[] = [];
          for (let i = 0; i < count && dataOffset + 4 <= recordSize; i += 1) {
            points.push({ x: recordReader.i16(dataOffset), y: recordReader.i16(dataOffset + 2) });
            dataOffset += 4;
          }
          addPolyline(ctx, points, true);
        }
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
      case WMF_RECORD.META_TEXTOUT: {
        const length = recordReader.u16(6);
        const textOffset = 8;
        const paddedLength = length + (length % 2);
        const text = decodeAnsi(recordReader.slice(textOffset, Math.min(length, Math.max(0, recordSize - textOffset - 4))), ctx.state.font.charset);
        const yOffset = textOffset + paddedLength;
        const y = recordReader.i16(yOffset);
        const x = recordReader.i16(yOffset + 2);
        addText(ctx, { x, y }, text);
        break;
      }
      case WMF_RECORD.META_EXTTEXTOUT: {
        const textRecord = new BinaryReader(bytes.subarray(cursor, cursor + recordSize));
        const length = textRecord.i16(10);
        const options = textRecord.u16(12);
        // ETO_OPAQUE and ETO_CLIPPED both insert the optional rectangle before the string.
        const textOffset = options & 0x0006 ? 22 : 14;
        if (length <= 0 || !textRecord.ensure(textOffset, length)) break;
        const dxOffset = textOffset + length + (length % 2);
        const dx: number[] = [];
        if (textRecord.ensure(dxOffset, length * 2)) {
          for (let index = 0; index < length; index += 1) dx.push(textRecord.i16(dxOffset + index * 2));
        }
        const run = decodeWmfRun(textRecord.slice(textOffset, length), ctx.state.font.charset, dx);
        addExtText(ctx, { x: textRecord.i16(8), y: textRecord.i16(6) }, run.text, { x: run.advances });
        break;
      }
      case WMF_RECORD.META_CREATEPENINDIRECT: {
        const style = recordReader.u16(6);
        const width = recordReader.i16(8);
        const color = colorRefToCss(recordReader.u32(12));
        const index = ensureObjectSlot(ctx.objects);
        setObject(ctx.objects, index, { kind: 'pen', value: penStyleFromCode(style, width, color) });
        break;
      }
      case WMF_RECORD.META_CREATEBRUSHINDIRECT: {
        const style = recordReader.u16(6);
        const color = colorRefToCss(recordReader.u32(8));
        const index = ensureObjectSlot(ctx.objects);
        setObject(ctx.objects, index, { kind: 'brush', value: brushStyleFromCode(style, color) });
        break;
      }
      case WMF_RECORD.META_CREATEFONTINDIRECT: {
        const height = Math.abs(recordReader.i16(6));
        const escapement = recordReader.i16(10);
        const weight = recordReader.u16(14);
        const italic = Boolean(recordReader.u8(16));
        const underline = Boolean(recordReader.u8(17));
        const strike = Boolean(recordReader.u8(18));
        const charset = recordReader.u8(19);
        const faceName = decodeAnsi(recordReader.slice(24, Math.max(0, recordSize - 24)), charset).split('\0')[0] || 'sans-serif';
        const index = ensureObjectSlot(ctx.objects);
        setObject(ctx.objects, index, {
          kind: 'font',
          value: { family: faceName, size: height || 12, weight, italic, underline, strike, escapement, charset },
        });
        break;
      }
      case WMF_RECORD.META_SELECTOBJECT:
        selectObject(ctx, recordReader.u16(6));
        break;
      case WMF_RECORD.META_DELETEOBJECT: {
        const index = recordReader.u16(6);
        if (index >= 0 && index < ctx.objects.length) ctx.objects[index] = null;
        break;
      }
      default:
        break;
    }

    cursor += recordSize;
  }

  return finalizeSvg(ctx, 'image/wmf');
}

function readEmfPointArray(reader: BinaryReader, offset: number, count: number, pointSize: 4 | 8): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const pointOffset = offset + i * pointSize;
    if (pointSize === 8) {
      points.push({ x: reader.i32(pointOffset), y: reader.i32(pointOffset + 4) });
    } else {
      points.push({ x: reader.i16(pointOffset), y: reader.i16(pointOffset + 2) });
    }
  }
  return points;
}

function parseEmfText(reader: BinaryReader, unicode: boolean): { point: Point; text: string; advances: TextAdvances } | null {
  if (!reader.ensure(36, 20)) return null;
  const point = { x: reader.i32(36), y: reader.i32(40) };
  const chars = reader.u32(44);
  const offString = reader.u32(48);
  if (!chars || !offString || offString >= reader.length || chars > 0x10000) return null;
  const byteLength = unicode ? chars * 2 : chars;
  if (!reader.ensure(offString, byteLength)) return null;
  const bytes = reader.slice(offString, byteLength);
  const text = unicode ? decodeUtf16(bytes) : decodeAnsi(bytes);

  // EMRTEXT drops the bounding rectangle when ETO_NO_RECT is set, which moves offDx;
  // ETO_PDY widens each spacing entry to an (x, y) pair.
  const options = reader.u32(52);
  const offDxField = (options & 0x0100) === 0 ? 72 : 56;
  const paired = (options & 0x2000) !== 0;
  const stride = paired ? 8 : 4;
  const advances: TextAdvances = { x: [] };
  const offDx = reader.u32(offDxField);
  if (offDx && reader.ensure(offDx, chars * stride)) {
    if (paired) advances.y = [];
    for (let index = 0; index < chars; index += 1) {
      const offset = offDx + index * stride;
      advances.x.push(reader.i32(offset));
      advances.y?.push(reader.i32(offset + 4));
    }
  }
  return { point, text, advances };
}

function parseSmallEmfText(reader: BinaryReader): { point: Point; text: string } | null {
  if (!reader.ensure(8, 24)) return null;
  const point = { x: reader.i32(8), y: reader.i32(12) };
  const chars = reader.u32(16);
  const options = reader.u32(20);
  let textOffset = 36;
  if (options & 0x0002) textOffset += 16;
  if (!chars || !reader.ensure(textOffset, chars)) return null;
  const text = decodeAnsi(reader.slice(textOffset, chars));
  return { point, text };
}

function readEmfEmbeddedBmp(record: BinaryReader, offBmiOffset: number, cbBmiOffset: number, offBitsOffset: number, cbBitsOffset: number): Uint8Array | null {
  const offBmi = record.u32(offBmiOffset);
  const cbBmi = record.u32(cbBmiOffset);
  const offBits = record.u32(offBitsOffset);
  const cbBits = record.u32(cbBitsOffset);
  if (!offBmi || !cbBmi || !offBits || !cbBits) return null;
  if (!record.ensure(offBmi, cbBmi) || !record.ensure(offBits, cbBits)) return null;
  return bitmapInfoToBmp(record.slice(offBmi, cbBmi), record.slice(offBits, cbBits));
}

function addEmfStretchDibits(ctx: ParseContext, record: BinaryReader): void {
  if (!record.ensure(24, 56)) return;
  const bmp = readEmfEmbeddedBmp(record, 48, 52, 56, 60);
  if (!bmp) return;
  addRasterImage(ctx, {
    left: record.i32(24),
    top: record.i32(28),
    right: record.i32(24) + record.i32(72),
    bottom: record.i32(28) + record.i32(76),
  }, bmp);
}

function addEmfBltBitmap(ctx: ParseContext, record: BinaryReader): void {
  if (!record.ensure(24, 76)) return;
  const bmp = readEmfEmbeddedBmp(record, 84, 88, 92, 96);
  if (!bmp) return;
  addRasterImage(ctx, {
    left: record.i32(24),
    top: record.i32(28),
    right: record.i32(24) + record.i32(32),
    bottom: record.i32(28) + record.i32(36),
  }, bmp);
}

function closeCurrentPathFigure(ctx: ParseContext): void {
  if (!ctx.pathData.length) return;
  ctx.pathData.push('Z');
}

function parseEmf(bytes: Uint8Array): ConvertedVectorImage | null {
  const reader = new BinaryReader(bytes);
  if (!reader.ensure(0, 52) || reader.u32(0) !== EMF_RECORD.EMR_HEADER) return null;
  const bounds = normalizeRect({
    left: reader.i32(8),
    top: reader.i32(12),
    right: reader.i32(16),
    bottom: reader.i32(20),
  });
  const viewBox = rectWidth(bounds) > 0 && rectHeight(bounds) > 0 ? bounds : { left: 0, top: 0, right: 1000, bottom: 1000 };
  const ctx = defaultContext(rectWidth(viewBox), rectHeight(viewBox), viewBox);
  ctx.state.windowOrg = { x: viewBox.left, y: viewBox.top };
  ctx.state.windowExt = { x: rectWidth(viewBox), y: rectHeight(viewBox) };
  ctx.state.viewportOrg = { x: viewBox.left, y: viewBox.top };
  ctx.state.viewportExt = { x: rectWidth(viewBox), y: rectHeight(viewBox) };

  let cursor = 0;
  while (cursor + 8 <= bytes.length) {
    const record = new BinaryReader(bytes.subarray(cursor));
    const type = record.u32(0);
    const size = record.u32(4);
    if (size < 8 || cursor + size > bytes.length) break;
    ctx.recordCount += 1;

    switch (type) {
      case EMF_RECORD.EMR_EOF:
        return finalizeSvg(ctx, 'image/emf');
      // Word and MathType emit SetWindow* without ever selecting a viewport and rely on
      // the playback device default. Mirroring the window keeps that mapping at 1:1;
      // seeding the viewport from the record bounds instead would scale and offset the
      // whole picture, which collides with the viewport each embedded equation sets up.
      case EMF_RECORD.EMR_SETWINDOWORGEX:
        ctx.state.windowOrg = { x: record.i32(8), y: record.i32(12) };
        if (!ctx.state.viewportExplicit) ctx.state.viewportOrg = { ...ctx.state.windowOrg };
        break;
      case EMF_RECORD.EMR_SETWINDOWEXTEX:
        ctx.state.windowExt = { x: record.i32(8), y: record.i32(12) };
        if (!ctx.state.viewportExplicit) ctx.state.viewportExt = { ...ctx.state.windowExt };
        break;
      case EMF_RECORD.EMR_SETVIEWPORTORGEX:
        ctx.state.viewportOrg = { x: record.i32(8), y: record.i32(12) };
        ctx.state.viewportExplicit = true;
        break;
      case EMF_RECORD.EMR_SETVIEWPORTEXTEX:
        ctx.state.viewportExt = { x: record.i32(8), y: record.i32(12) };
        ctx.state.viewportExplicit = true;
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
      case EMF_RECORD.EMR_SAVEDC:
        ctx.stateStack.push(cloneGraphicsState(ctx.state));
        break;
      case EMF_RECORD.EMR_RESTOREDC: {
        const saved = record.i32(8);
        if (saved < 0) {
          const steps = Math.min(ctx.stateStack.length, Math.abs(saved));
          for (let i = 0; i < steps - 1; i += 1) ctx.stateStack.pop();
          const state = ctx.stateStack.pop();
          if (state) ctx.state = cloneGraphicsState(state);
        } else if (saved > 0 && saved <= ctx.stateStack.length) {
          const state = ctx.stateStack[saved - 1];
          ctx.stateStack.length = saved - 1;
          if (state) ctx.state = cloneGraphicsState(state);
        }
        break;
      }
      case EMF_RECORD.EMR_SETWORLDTRANSFORM:
        ctx.state.worldTransform = readXForm(record, 8);
        break;
      case EMF_RECORD.EMR_MODIFYWORLDTRANSFORM: {
        const xform = readXForm(record, 8);
        const mode = record.u32(32);
        if (mode === MODIFY_WORLD_TRANSFORM.MWT_IDENTITY) ctx.state.worldTransform = { ...IDENTITY_MATRIX };
        else if (mode === MODIFY_WORLD_TRANSFORM.MWT_SET) ctx.state.worldTransform = xform;
        else if (mode === MODIFY_WORLD_TRANSFORM.MWT_LEFTMULTIPLY) ctx.state.worldTransform = multiplyMatrix(xform, ctx.state.worldTransform);
        else if (mode === MODIFY_WORLD_TRANSFORM.MWT_RIGHTMULTIPLY) ctx.state.worldTransform = multiplyMatrix(ctx.state.worldTransform, xform);
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
        const points = readEmfPointArray(record, pointOffset, count, pointSize);
        addPolyline(ctx, points, type === EMF_RECORD.EMR_POLYGON || type === EMF_RECORD.EMR_POLYGON16);
        break;
      }
      case EMF_RECORD.EMR_POLYBEZIER:
      case EMF_RECORD.EMR_POLYBEZIER16: {
        const count = record.u32(24);
        const pointOffset = 28;
        const pointSize = type === EMF_RECORD.EMR_POLYBEZIER16 ? 4 : 8;
        const points = readEmfPointArray(record, pointOffset, count, pointSize);
        addBezierPath(ctx, points, false);
        break;
      }
      case EMF_RECORD.EMR_POLYBEZIERTO:
      case EMF_RECORD.EMR_POLYBEZIERTO16: {
        const count = record.u32(24);
        const pointOffset = 28;
        const pointSize = type === EMF_RECORD.EMR_POLYBEZIERTO16 ? 4 : 8;
        const points = readEmfPointArray(record, pointOffset, count, pointSize);
        addBezierPath(ctx, points, true);
        break;
      }
      case EMF_RECORD.EMR_POLYLINETO:
      case EMF_RECORD.EMR_POLYLINETO16: {
        const count = record.u32(24);
        const pointOffset = 28;
        const pointSize = type === EMF_RECORD.EMR_POLYLINETO16 ? 4 : 8;
        const points = readEmfPointArray(record, pointOffset, count, pointSize);
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
        const counts: number[] = [];
        for (let i = 0; i < polygonCount; i += 1) counts.push(record.u32(countsOffset + i * 4));
        const points = readEmfPointArray(record, pointsOffset, pointCount, pointSize);
        let index = 0;
        for (const count of counts) {
          addPolyline(ctx, points.slice(index, index + count), type === EMF_RECORD.EMR_POLYPOLYGON || type === EMF_RECORD.EMR_POLYPOLYGON16);
          index += count;
        }
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
      case EMF_RECORD.EMR_BEGINPATH:
        ctx.capturePath = true;
        ctx.pathData = [];
        ctx.pathPoints = [];
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
        ctx.capturePath = false;
        ctx.pathData = [];
        ctx.pathPoints = [];
        break;
      case EMF_RECORD.EMR_CREATEPEN: {
        const index = record.u32(8);
        const style = record.u32(12);
        const width = record.i32(16);
        const color = colorRefToCss(record.u32(24));
        setObject(ctx.objects, index, { kind: 'pen', value: penStyleFromCode(style, width, color) });
        break;
      }
      case EMF_RECORD.EMR_CREATEBRUSHINDIRECT: {
        const index = record.u32(8);
        const style = record.u32(12);
        const color = colorRefToCss(record.u32(16));
        setObject(ctx.objects, index, { kind: 'brush', value: brushStyleFromCode(style, color) });
        break;
      }
      case EMF_RECORD.EMR_EXTCREATEPEN: {
        const index = record.u32(8);
        const style = record.u32(28);
        const width = record.i32(32);
        const brushStyle = record.u32(36);
        const color = brushStyle === 1 ? 'none' : colorRefToCss(record.u32(40));
        setObject(ctx.objects, index, { kind: 'pen', value: brushStyle === 1 ? { color, width, none: true } : penStyleFromCode(style, width, color) });
        break;
      }
      case EMF_RECORD.EMR_EXTCREATEFONTINDIRECTW: {
        const index = record.u32(8);
        // LOGFONTW starts at offset 12: lfHeight(+0), ..., lfFaceName(+28).
        const height = Math.abs(record.i32(12));
        const escapement = record.i32(20);
        const weight = record.i32(28);
        const italic = Boolean(record.u8(32));
        const underline = Boolean(record.u8(33));
        const strike = Boolean(record.u8(34));
        const faceName = decodeUtf16(record.slice(40, 64)).split('\0')[0] || 'sans-serif';
        setObject(ctx.objects, index, {
          kind: 'font',
          value: { family: faceName, size: height || 12, weight, italic, underline, strike, escapement },
        });
        break;
      }
      case EMF_RECORD.EMR_SELECTOBJECT:
        selectObject(ctx, record.u32(8));
        break;
      case EMF_RECORD.EMR_DELETEOBJECT: {
        const index = record.u32(8);
        if (index >= 0 && index < ctx.objects.length) ctx.objects[index] = null;
        break;
      }
      case EMF_RECORD.EMR_EXTTEXTOUTA:
      case EMF_RECORD.EMR_EXTTEXTOUTW: {
        const textRecord = new BinaryReader(bytes.subarray(cursor, cursor + size));
        const parsed = parseEmfText(textRecord, type === EMF_RECORD.EMR_EXTTEXTOUTW);
        if (parsed) addExtText(ctx, parsed.point, parsed.text, parsed.advances);
        break;
      }
      case EMF_RECORD.EMR_SMALLTEXTOUT: {
        const parsed = parseSmallEmfText(record);
        if (parsed) {
          const point = (ctx.state.textAlign & 0x0001) !== 0 ? ctx.state.currentPosition : parsed.point;
          addText(ctx, point, parsed.text);
        }
        break;
      }
      case EMF_RECORD.EMR_STRETCHDIBITS:
        addEmfStretchDibits(ctx, record);
        break;
      case EMF_RECORD.EMR_BITBLT:
      case EMF_RECORD.EMR_STRETCHBLT:
      case EMF_RECORD.EMR_ALPHABLEND:
        addEmfBltBitmap(ctx, record);
        break;
      default:
        break;
    }

    cursor += size;
  }

  return finalizeSvg(ctx, 'image/emf');
}

export function convertMetafileToSvg(mime: string, bytes: Uint8Array): ConvertedVectorImage | null {
  if (!bytes.length) return null;
  if (/image\/emf/i.test(mime)) return parseEmf(bytes);
  if (/image\/wmf/i.test(mime)) return parseWmf(bytes);
  return null;
}
