import {
  createFileViewerTranslator,
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerZoomChangeEmitter,
  readFileViewerText,
  registerFileViewerViewStateProvider,
  registerFileViewerZoomProvider,
  unregisterFileViewerViewStateProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerApplyViewStateOptions,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerGeoBasemapOptions,
  type FileViewerGeoOptions,
  type FileViewerRenderedInstance,
  type FileViewerViewState,
  type FileViewerViewStateChangeAction,
  type FileViewerViewStateChangeSource,
} from '@file-viewer/core';
import type { Map as MapLibreMap, ErrorEvent as MapLibreErrorEvent } from 'maplibre-gl';
import { configureMapLibreWorker } from './maplibre-worker.js';

type Position = [number, number, ...number[]];
type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'MultiPoint'; coordinates: Position[] }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] }
  | { type: 'GeometryCollection'; geometries: Geometry[] };

interface Feature {
  type: 'Feature';
  geometry: Geometry | null;
  properties?: Record<string, unknown>;
  id?: string | number;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ParseGeoResult {
  collection: FeatureCollection;
  bounds: Bounds | null;
  sourceProjection: string;
  displayProjection: string;
}

type FileViewerTranslator = ReturnType<typeof createFileViewerTranslator>;
type ProjectionTransformer = (position: Position) => Position;
type MapLibreModule = typeof import('maplibre-gl');
type MapLibreStyleLike = string | Record<string, unknown>;
type GeoBasemapKind = 'offline' | 'raster' | 'vector-style';
interface ResolvedGeoBasemapConfig {
  kind: GeoBasemapKind;
  label: string;
  style: MapLibreStyleLike;
  attributionControl: boolean;
}
type Proj4Module = {
  default?: Proj4Function;
} & Proj4Function;
type Proj4Function = {
  (fromProjection: string, toProjection: string, coordinate: [number, number]): [number, number];
  defs: (name: string, definition?: string) => string | undefined;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const GEO_WIDTH = 960;
const GEO_HEIGHT = 620;
const GEO_PADDING = 36;
const WEB_MERCATOR_LIMIT = 20037508.342789244;
const DEFAULT_FIT_PADDING = 44;
const MIN_MAP_ZOOM = 0;
const MAX_MAP_ZOOM = 22;
const OPENFREEMAP_TILE_ORIGIN = 'https://tiles.openfreemap.org';
const OSM_RASTER_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';
const TIANDITU_ATTRIBUTION = '天地图';
const TIANDITU_SUBDOMAINS = Array.from({ length: 8 }, (_, index) => `t${index}`);

const TIANDITU_STYLE_PRESETS = {
  'tianditu-vector': { mapStyle: 'vector', label: 'Tianditu Vector' },
  'tianditu-imagery': { mapStyle: 'imagery', label: 'Tianditu Imagery' },
  'tianditu-terrain': { mapStyle: 'terrain', label: 'Tianditu Terrain' },
} as const;

const OPENFREEMAP_STYLE_PRESETS: Record<string, { style: string; label: string }> = {
  openfreemap: { style: 'liberty', label: 'OpenFreeMap Liberty' },
  'openfreemap-liberty': { style: 'liberty', label: 'OpenFreeMap Liberty' },
  'openfreemap-bright': { style: 'bright', label: 'OpenFreeMap Bright' },
  'openfreemap-positron': { style: 'positron', label: 'OpenFreeMap Positron' },
  'openfreemap-dark': { style: 'dark', label: 'OpenFreeMap Dark' },
  'openfreemap-fiord': { style: 'fiord', label: 'OpenFreeMap Fiord' },
};

const geoStyle = `
.geo-viewer{min-height:540px;height:100%;display:grid;grid-template-columns:minmax(250px,330px) minmax(0,1fr);background:#eef2f5;color:#132235}
.geo-viewer *{box-sizing:border-box}
.geo-panel{padding:22px;border-right:1px solid rgba(15,23,42,.08);background:#fff;overflow:auto}
.geo-panel>span{display:inline-flex;align-items:center;min-height:22px;border-radius:6px;padding:0 8px;background:rgba(15,118,110,.1);color:#0f766e;font-size:12px;font-weight:800}
.geo-panel h2{margin:10px 0 20px;font-size:22px;line-height:1.2;letter-spacing:0}
.geo-panel dl{display:grid;gap:12px;margin:0}.geo-panel dt,.geo-counts strong{color:#64748b;font-size:12px;font-weight:700}.geo-panel dd{margin:4px 0 0;word-break:break-word;font-size:14px;line-height:1.45}
.geo-counts{margin-top:24px}.geo-counts p{margin:8px 0 0;font-size:14px}
.geo-stage{display:flex;min-width:0;min-height:0;flex-direction:column}
.geo-toolbar{min-height:46px;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.86)}
.geo-toolbar button{min-width:86px;min-height:30px;border:0;border-radius:8px;padding:0 10px;background:#0f766e;color:#fff;cursor:pointer;font-size:12px;font-weight:800;letter-spacing:0}
.geo-toolbar button:hover{background:#0d625c}
.geo-map-frame{position:relative;flex:1;min-height:460px;overflow:hidden;background:#f8fafc}
.geo-map-engine,.geo-map-svg{position:absolute;inset:0}
.geo-map-svg{padding:28px;overflow:auto}.geo-map-svg svg{display:block;width:min(100%,1200px);min-width:640px;height:auto;margin:0 auto;overflow:visible}
.geo-map-svg rect{fill:#f8fafc;stroke:rgba(15,23,42,.08)}
.geo-map-svg path{fill:none;stroke:#0f766e;stroke-width:2.2;vector-effect:non-scaling-stroke}.geo-map-svg .geo-polygon{fill:rgba(45,212,191,.18)}
.geo-map-svg circle{fill:#2563eb;stroke:#fff;stroke-width:1.5;vector-effect:non-scaling-stroke}
.geo-state{display:flex;align-items:center;justify-content:center;min-height:280px;border-radius:8px;background:rgba(255,255,255,.82);color:#64748b}
.geo-state.error{color:#b42318}
.geo-viewer .maplibregl-map{position:relative;width:100%;height:100%;overflow:hidden;font:inherit}
.geo-viewer .maplibregl-canvas{position:absolute;left:0;top:0;outline:none}
.geo-viewer .maplibregl-control-container{position:absolute;inset:0;pointer-events:none}
.geo-viewer .maplibregl-ctrl-top-right{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:8px;pointer-events:auto}
.geo-viewer .maplibregl-ctrl{display:flex;overflow:hidden;border:1px solid rgba(15,23,42,.12);border-radius:8px;background:#fff;box-shadow:0 10px 24px rgba(15,23,42,.12)}
.geo-viewer .maplibregl-ctrl button{display:block;width:30px;height:30px;border:0;border-bottom:1px solid rgba(15,23,42,.08);background:#fff;color:#132235;cursor:pointer;font-size:0}
.geo-viewer .maplibregl-ctrl button:last-child{border-bottom:0}.geo-viewer .maplibregl-ctrl button:hover{background:#f1f5f9}
.geo-viewer .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon::before{content:'+';font-size:18px;font-weight:800}.geo-viewer .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon::before{content:'-';font-size:20px;font-weight:800}
.geo-viewer .maplibregl-ctrl-compass{display:none!important}
.geo-viewer .maplibregl-ctrl-bottom-right{position:absolute;right:8px;bottom:8px;pointer-events:auto}
.geo-viewer .maplibregl-ctrl-attrib{display:block;max-width:min(460px,calc(100vw - 40px));border-radius:6px;padding:3px 7px;background:rgba(255,255,255,.9);box-shadow:0 8px 20px rgba(15,23,42,.12);color:#334155;font-size:11px;line-height:1.45}
.geo-viewer .maplibregl-ctrl-attrib a{color:#0f766e;text-decoration:none}.geo-viewer .maplibregl-ctrl-attrib-button{display:none}
[data-viewer-theme='dark'] .geo-viewer{background:#101820;color:#e5edf6}[data-viewer-theme='dark'] .geo-panel{background:#111827;border-color:rgba(148,163,184,.18)}[data-viewer-theme='dark'] .geo-panel dt,[data-viewer-theme='dark'] .geo-counts strong{color:#94a3b8}[data-viewer-theme='dark'] .geo-toolbar{background:rgba(17,24,39,.9);border-color:rgba(148,163,184,.18)}[data-viewer-theme='dark'] .geo-map-frame,[data-viewer-theme='dark'] .geo-map-svg rect{background:#111827;fill:#111827;stroke:rgba(148,163,184,.18)}
[data-viewer-theme='dark'] .geo-viewer .maplibregl-ctrl-attrib{background:rgba(15,23,42,.9);color:#cbd5e1}[data-viewer-theme='dark'] .geo-viewer .maplibregl-ctrl-attrib a{color:#5eead4}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .geo-viewer{background:#101820;color:#e5edf6}[data-viewer-theme='system'] .geo-panel{background:#111827;border-color:rgba(148,163,184,.18)}[data-viewer-theme='system'] .geo-panel dt,[data-viewer-theme='system'] .geo-counts strong{color:#94a3b8}[data-viewer-theme='system'] .geo-toolbar{background:rgba(17,24,39,.9);border-color:rgba(148,163,184,.18)}[data-viewer-theme='system'] .geo-map-frame,[data-viewer-theme='system'] .geo-map-svg rect{background:#111827;fill:#111827;stroke:rgba(148,163,184,.18)}}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .geo-viewer .maplibregl-ctrl-attrib{background:rgba(15,23,42,.9);color:#cbd5e1}[data-viewer-theme='system'] .geo-viewer .maplibregl-ctrl-attrib a{color:#5eead4}}
@media (max-width:860px){.geo-viewer{grid-template-columns:1fr}.geo-panel{max-height:230px;border-right:0;border-bottom:1px solid rgba(15,23,42,.08)}.geo-map-frame{min-height:430px}}
`;

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = geoStyle;
  return style;
};

const createSvgElement = <K extends keyof SVGElementTagNameMap>(tag: K) => {
  return document.createElementNS(SVG_NS, tag);
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

const normalizeGeoType = (type?: string) => {
  const normalized = (type || 'geojson').trim().toLowerCase();
  if (normalized === 'json') {
    return 'geojson';
  }
  if (normalized === 'shapefile' || normalized === 'shape') {
    return 'shp';
  }
  return normalized;
};

const geometryTypes = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  'GeometryCollection',
]);

const normalizeGeoJson = (value: unknown, t: FileViewerTranslator): FeatureCollection => {
  const candidate = value as {
    type?: string;
    coordinates?: unknown;
    features?: unknown;
    geometry?: unknown;
    geometries?: unknown;
  };
  if (candidate?.type === 'FeatureCollection' && Array.isArray(candidate.features)) {
    return {
      type: 'FeatureCollection',
      features: candidate.features as Feature[],
    };
  }
  if (candidate?.type === 'Feature') {
    return { type: 'FeatureCollection', features: [candidate as Feature] };
  }
  if (candidate?.type && geometryTypes.has(candidate.type)) {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: candidate as Geometry, properties: {} }],
    };
  }
  throw new Error(t('geo.error.unrecognized'));
};

const normalizeShapefileOutput = (value: unknown, t: FileViewerTranslator): FeatureCollection => {
  if (Array.isArray(value)) {
    return {
      type: 'FeatureCollection',
      features: value.flatMap(item => normalizeShapefileOutput(item, t).features),
    };
  }
  if (isRecord(value) && value.type !== 'FeatureCollection' && !value.geometry && !value.coordinates) {
    const nestedCollections = Object.values(value)
      .filter(item => isRecord(item) || Array.isArray(item))
      .flatMap(item => {
        try {
          return normalizeShapefileOutput(item, t).features;
        } catch {
          return [];
        }
      });
    if (nestedCollections.length) {
      return { type: 'FeatureCollection', features: nestedCollections };
    }
  }
  return normalizeGeoJson(value, t);
};

const parseXml = (text: string, t: FileViewerTranslator) => {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    throw new Error(error.textContent || t('geo.error.xmlParseFailed'));
  }
  return doc;
};

const extractCrsName = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined;
  }
  const crs = value.crs;
  if (!isRecord(crs)) {
    return undefined;
  }
  const properties = crs.properties;
  const name = isRecord(properties) ? properties.name : undefined;
  return typeof name === 'string' ? name : undefined;
};

const parseGeo = async (
  buffer: ArrayBuffer,
  type: string,
  t: FileViewerTranslator
): Promise<{ collection: FeatureCollection; declaredProjection?: string }> => {
  if (type === 'geojson') {
    const raw = JSON.parse(await readFileViewerText(buffer));
    return {
      collection: normalizeGeoJson(raw, t),
      declaredProjection: extractCrsName(raw),
    };
  }
  if (type === 'kml' || type === 'gpx') {
    const toGeoJSON = await import('@tmcw/togeojson');
    const doc = parseXml(await readFileViewerText(buffer), t);
    return {
      collection: normalizeGeoJson(type === 'kml' ? toGeoJSON.kml(doc) : toGeoJSON.gpx(doc), t),
      declaredProjection: 'EPSG:4326',
    };
  }
  if (type === 'shp') {
    const { default: shp } = await import('shpjs');
    return {
      collection: normalizeShapefileOutput(await shp(buffer), t),
      declaredProjection: 'EPSG:4326',
    };
  }
  throw new Error(t('geo.error.unsupported', { type }));
};

const walkPositions = (geometry: Geometry | null, visit: (position: Position) => void) => {
  if (!geometry) {
    return;
  }
  switch (geometry.type) {
    case 'Point':
      visit(geometry.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      geometry.coordinates.forEach(visit);
      break;
    case 'MultiLineString':
    case 'Polygon':
      geometry.coordinates.forEach(line => line.forEach(visit));
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach(polygon => polygon.forEach(line => line.forEach(visit)));
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach(item => walkPositions(item, visit));
      break;
  }
};

const collectBounds = (features: Feature[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  features.forEach(feature => {
    walkPositions(feature.geometry, position => {
      const [x, y] = position;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
};

const isWgs84Projection = (projection: string) => {
  return ['EPSG:4326', 'CRS:84', 'WGS84', 'WGS 84'].includes(projection.toUpperCase());
};

const normalizeProjectionAlias = (value?: string) => {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }
  const upper = raw.toUpperCase();
  const epsgMatch = upper.match(/EPSG(?::|::|\/)(\d+)/);
  if (epsgMatch) {
    return `EPSG:${epsgMatch[1]}`;
  }
  if (upper.includes('CRS84') || upper === 'CRS:84' || upper.includes('WGS84') || upper.includes('WGS 84')) {
    return 'EPSG:4326';
  }
  if (upper.includes('WEBMERCATOR') || upper.includes('WEB_MERCATOR') || upper.includes('900913') || upper.includes('102100')) {
    return 'EPSG:3857';
  }
  if (upper.includes('CGCS2000') || upper === 'CGCS' || upper === 'EPSG:4490') {
    return 'EPSG:4490';
  }
  if (upper.includes('GCJ')) {
    return 'GCJ02';
  }
  if (upper.includes('BD09') || upper.includes('BD-09') || upper.includes('BAIDU')) {
    return 'BD09';
  }
  return raw;
};

const inferProjectionFromBounds = (bounds: Bounds | null, options?: FileViewerGeoOptions) => {
  if (!bounds || options?.inferProjection === false) {
    return undefined;
  }
  const maxAbsX = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX));
  const maxAbsY = Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY));
  if (
    (maxAbsX > 180 || maxAbsY > 90) &&
    maxAbsX <= WEB_MERCATOR_LIMIT * 1.05 &&
    maxAbsY <= WEB_MERCATOR_LIMIT * 1.05
  ) {
    return 'EPSG:3857';
  }
  return undefined;
};

const registerCommonProj4Defs = (proj4: Proj4Function) => {
  proj4.defs('EPSG:4490', '+proj=longlat +ellps=GRS80 +no_defs +type=crs');
  proj4.defs('CGCS2000', '+proj=longlat +ellps=GRS80 +no_defs +type=crs');
};

const transformLat = (lng: number, lat: number) => {
  let ret = -100 + 2 * lng + 3 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += ((20 * Math.sin(6 * lng * Math.PI) + 20 * Math.sin(2 * lng * Math.PI)) * 2) / 3;
  ret += ((20 * Math.sin(lat * Math.PI) + 40 * Math.sin((lat / 3) * Math.PI)) * 2) / 3;
  ret += ((160 * Math.sin((lat / 12) * Math.PI) + 320 * Math.sin((lat * Math.PI) / 30)) * 2) / 3;
  return ret;
};

const transformLng = (lng: number, lat: number) => {
  let ret = 300 + lng + 2 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += ((20 * Math.sin(6 * lng * Math.PI) + 20 * Math.sin(2 * lng * Math.PI)) * 2) / 3;
  ret += ((20 * Math.sin(lng * Math.PI) + 40 * Math.sin((lng / 3) * Math.PI)) * 2) / 3;
  ret += ((150 * Math.sin((lng / 12) * Math.PI) + 300 * Math.sin((lng / 30) * Math.PI)) * 2) / 3;
  return ret;
};

const outOfChina = (lng: number, lat: number) => {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
};

const wgs84ToGcj02 = (lng: number, lat: number) => {
  if (outOfChina(lng, lat)) {
    return [lng, lat] as const;
  }
  const a = 6378245;
  const ee = 0.006693421622965943;
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lng + dLng, lat + dLat] as const;
};

const gcj02ToWgs84 = (lng: number, lat: number) => {
  if (outOfChina(lng, lat)) {
    return [lng, lat] as const;
  }
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  return [lng * 2 - gcjLng, lat * 2 - gcjLat] as const;
};

const bd09ToGcj02 = (lng: number, lat: number) => {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000 / 180);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000 / 180);
  return [z * Math.cos(theta), z * Math.sin(theta)] as const;
};

const createProjectionTransformer = async (
  projection: string,
  t: FileViewerTranslator
): Promise<ProjectionTransformer> => {
  const normalized = normalizeProjectionAlias(projection) || 'EPSG:4326';
  if (isWgs84Projection(normalized)) {
    return position => position;
  }
  if (normalized === 'GCJ02') {
    return position => {
      const [lng, lat] = gcj02ToWgs84(position[0], position[1]);
      return [lng, lat, ...position.slice(2)] as Position;
    };
  }
  if (normalized === 'BD09') {
    return position => {
      const [gcjLng, gcjLat] = bd09ToGcj02(position[0], position[1]);
      const [lng, lat] = gcj02ToWgs84(gcjLng, gcjLat);
      return [lng, lat, ...position.slice(2)] as Position;
    };
  }

  try {
    const module = await import('proj4') as unknown as Proj4Module;
    const proj4 = module.default || module;
    registerCommonProj4Defs(proj4);
    return position => {
      const [lng, lat] = proj4(normalized, 'EPSG:4326', [position[0], position[1]]);
      return [lng, lat, ...position.slice(2)] as Position;
    };
  } catch (error) {
    throw new Error(t('geo.error.projection', { reason: normalizeError(error) }));
  }
};

const transformGeometry = (geometry: Geometry | null, transform: ProjectionTransformer): Geometry | null => {
  if (!geometry) {
    return null;
  }
  switch (geometry.type) {
    case 'Point':
      return { type: 'Point', coordinates: transform(geometry.coordinates) };
    case 'MultiPoint':
      return { type: 'MultiPoint', coordinates: geometry.coordinates.map(transform) };
    case 'LineString':
      return { type: 'LineString', coordinates: geometry.coordinates.map(transform) };
    case 'MultiLineString':
      return { type: 'MultiLineString', coordinates: geometry.coordinates.map(line => line.map(transform)) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: geometry.coordinates.map(line => line.map(transform)) };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map(polygon => polygon.map(line => line.map(transform))),
      };
    case 'GeometryCollection':
      return { type: 'GeometryCollection', geometries: geometry.geometries.map(item => transformGeometry(item, transform) as Geometry) };
  }
};

const validatePositionBounds = (bounds: Bounds | null, t: FileViewerTranslator) => {
  if (!bounds) {
    return;
  }
  if (
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !Number.isFinite(bounds.maxX) ||
    !Number.isFinite(bounds.maxY) ||
    bounds.minY < -90.000001 ||
    bounds.maxY > 90.000001
  ) {
    throw new Error(t('geo.error.projection', { reason: 'coordinates are outside WGS84 longitude/latitude bounds' }));
  }
};

const resolveSourceProjection = (
  collection: FeatureCollection,
  declaredProjection: string | undefined,
  options?: FileViewerGeoOptions
) => {
  const rawBounds = collectBounds(collection.features);
  const projection = normalizeProjectionAlias(options?.projection) ||
    normalizeProjectionAlias(declaredProjection) ||
    inferProjectionFromBounds(rawBounds, options) ||
    'EPSG:4326';
  return projection;
};

export const parseFileViewerGeoData = async (
  buffer: ArrayBuffer,
  type: string | undefined,
  options: FileViewerGeoOptions | undefined,
  t: FileViewerTranslator
): Promise<ParseGeoResult> => {
  const normalizedType = normalizeGeoType(type);
  const { collection, declaredProjection } = await parseGeo(buffer, normalizedType, t);
  const sourceProjection = resolveSourceProjection(collection, declaredProjection, options);
  const transform = await createProjectionTransformer(sourceProjection, t);
  const transformed: FeatureCollection = {
    type: 'FeatureCollection',
    features: collection.features.map(feature => ({
      type: 'Feature',
      id: feature.id,
      properties: feature.properties || {},
      geometry: transformGeometry(feature.geometry, transform),
    })),
  };
  const bounds = collectBounds(transformed.features);
  validatePositionBounds(bounds, t);
  return {
    collection: transformed,
    bounds,
    sourceProjection,
    displayProjection: 'EPSG:4326',
  };
};

const projectPosition = (position: Position, bounds: Bounds | null) => {
  if (!bounds) {
    return [GEO_WIDTH / 2, GEO_HEIGHT / 2] as const;
  }
  const xRange = Math.max(1e-9, bounds.maxX - bounds.minX);
  const yRange = Math.max(1e-9, bounds.maxY - bounds.minY);
  const scale = Math.min((GEO_WIDTH - GEO_PADDING * 2) / xRange, (GEO_HEIGHT - GEO_PADDING * 2) / yRange);
  const xOffset = (GEO_WIDTH - xRange * scale) / 2;
  const yOffset = (GEO_HEIGHT - yRange * scale) / 2;
  const x = xOffset + (position[0] - bounds.minX) * scale;
  const y = GEO_HEIGHT - (yOffset + (position[1] - bounds.minY) * scale);
  return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
};

const pathLine = (positions: Position[], bounds: Bounds | null, close = false) => {
  const points = positions
    .filter(position => Number.isFinite(position[0]) && Number.isFinite(position[1]))
    .map(position => projectPosition(position, bounds));
  if (!points.length) {
    return '';
  }
  const [first, ...rest] = points;
  const body = [`M${first[0]} ${first[1]}`, ...rest.map(point => `L${point[0]} ${point[1]}`)];
  if (close) {
    body.push('Z');
  }
  return body.join(' ');
};

const appendGeometry = (parent: SVGGElement, geometry: Geometry | null, bounds: Bounds | null) => {
  if (!geometry) {
    return;
  }
  switch (geometry.type) {
    case 'Point': {
      const [x, y] = projectPosition(geometry.coordinates, bounds);
      const circle = createSvgElement('circle');
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(y));
      circle.setAttribute('r', '4');
      parent.appendChild(circle);
      break;
    }
    case 'MultiPoint':
      geometry.coordinates.forEach(position => appendGeometry(parent, { type: 'Point', coordinates: position }, bounds));
      break;
    case 'LineString': {
      const path = createSvgElement('path');
      path.setAttribute('d', pathLine(geometry.coordinates, bounds));
      parent.appendChild(path);
      break;
    }
    case 'MultiLineString':
      geometry.coordinates.forEach(line => appendGeometry(parent, { type: 'LineString', coordinates: line }, bounds));
      break;
    case 'Polygon':
      geometry.coordinates.forEach(line => {
        const path = createSvgElement('path');
        path.classList.add('geo-polygon');
        path.setAttribute('d', pathLine(line, bounds, true));
        parent.appendChild(path);
      });
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach(polygon => {
        appendGeometry(parent, { type: 'Polygon', coordinates: polygon }, bounds);
      });
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach(item => appendGeometry(parent, item, bounds));
      break;
  }
};

const buildGeometryCounts = (features: Feature[]) => {
  const counts = new Map<string, number>();
  const visit = (geometry: Geometry | null) => {
    if (!geometry) {
      counts.set('Null', (counts.get('Null') || 0) + 1);
      return;
    }
    counts.set(geometry.type, (counts.get(geometry.type) || 0) + 1);
    if (geometry.type === 'GeometryCollection') {
      geometry.geometries.forEach(visit);
    }
  };
  features.forEach(feature => visit(feature.geometry));
  return [...counts.entries()];
};

const formatBounds = (bounds: Bounds | null) => {
  if (!bounds) {
    return '-';
  }
  return `${bounds.minX.toFixed(5)}, ${bounds.minY.toFixed(5)} -> ${bounds.maxX.toFixed(5)}, ${bounds.maxY.toFixed(5)}`;
};

const appendDescriptionItem = (list: HTMLDListElement, label: string, value: string | number, field?: string) => {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = String(value);
  if (field) {
    detail.dataset.geoPanelField = field;
  }
  row.append(term, detail);
  list.appendChild(row);
};

const updatePanelValue = (root: HTMLElement, field: string, value: string) => {
  const detail = root.querySelector<HTMLElement>(`[data-geo-panel-field="${field}"]`);
  if (detail) {
    detail.textContent = value;
  }
};

const getFitPadding = (options?: FileViewerGeoOptions) => {
  const value = options?.fitPadding;
  return Number.isFinite(value) ? Math.max(8, Math.min(160, Number(value))) : DEFAULT_FIT_PADDING;
};

const buildPanel = (
  parsed: ParseGeoResult,
  type: string,
  engineLabel: string,
  basemapLabel: string,
  t: FileViewerTranslator
) => {
  const panel = document.createElement('aside');
  panel.className = 'geo-panel';
  const badge = document.createElement('span');
  badge.textContent = type.toUpperCase();
  const heading = document.createElement('h2');
  heading.textContent = t('geo.title');
  const description = document.createElement('dl');
  appendDescriptionItem(description, t('geo.featureCount'), parsed.collection.features.length);
  appendDescriptionItem(description, t('geo.bounds'), formatBounds(parsed.bounds));
  appendDescriptionItem(description, t('geo.projection'), `${parsed.sourceProjection} -> ${parsed.displayProjection}`);
  appendDescriptionItem(description, t('geo.engine'), engineLabel);
  appendDescriptionItem(description, t('geo.basemap'), basemapLabel, 'basemap');
  const counts = document.createElement('div');
  counts.className = 'geo-counts';
  const countsHeading = document.createElement('strong');
  countsHeading.textContent = t('geo.geometryTypes');
  counts.appendChild(countsHeading);
  buildGeometryCounts(parsed.collection.features).forEach(([name, count]) => {
    const row = document.createElement('p');
    row.textContent = `${name}: ${count}`;
    counts.appendChild(row);
  });
  panel.append(badge, heading, description, counts);
  return panel;
};

const buildSvgPreview = (parsed: ParseGeoResult, t: FileViewerTranslator) => {
  const wrapper = createElement('div', 'geo-map-svg');
  const svg = createSvgElement('svg');
  svg.setAttribute('viewBox', `0 0 ${GEO_WIDTH} ${GEO_HEIGHT}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('geo.aria'));
  const rect = createSvgElement('rect');
  rect.setAttribute('width', String(GEO_WIDTH));
  rect.setAttribute('height', String(GEO_HEIGHT));
  rect.setAttribute('rx', '8');
  const group = createSvgElement('g');
  parsed.collection.features.forEach(feature => appendGeometry(group, feature.geometry, parsed.bounds));
  svg.append(rect, group);
  wrapper.appendChild(svg);
  return wrapper;
};

const niceStep = (span: number) => {
  const rough = Math.max(span / 5, 0.0001);
  const exponent = Math.floor(Math.log10(rough));
  const base = rough / Math.pow(10, exponent);
  const factor = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return factor * Math.pow(10, exponent);
};

const createGraticule = (bounds: Bounds | null): FeatureCollection => {
  if (!bounds) {
    return { type: 'FeatureCollection', features: [] };
  }
  const lngStep = niceStep(Math.max(bounds.maxX - bounds.minX, 0.001));
  const latStep = niceStep(Math.max(bounds.maxY - bounds.minY, 0.001));
  const minLng = Math.max(-180, Math.floor(bounds.minX / lngStep) * lngStep - lngStep);
  const maxLng = Math.min(180, Math.ceil(bounds.maxX / lngStep) * lngStep + lngStep);
  const minLat = Math.max(-85, Math.floor(bounds.minY / latStep) * latStep - latStep);
  const maxLat = Math.min(85, Math.ceil(bounds.maxY / latStep) * latStep + latStep);
  const features: Feature[] = [];
  for (let lng = minLng; lng <= maxLng + lngStep / 2; lng += lngStep) {
    features.push({
      type: 'Feature',
      properties: { kind: 'lng' },
      geometry: { type: 'LineString', coordinates: [[lng, minLat], [lng, maxLat]] },
    });
  }
  for (let lat = minLat; lat <= maxLat + latStep / 2; lat += latStep) {
    features.push({
      type: 'Feature',
      properties: { kind: 'lat' },
      geometry: { type: 'LineString', coordinates: [[minLng, lat], [maxLng, lat]] },
    });
  }
  return { type: 'FeatureCollection', features };
};

const createOfflineStyle = () => ({
  version: 8,
  sources: {},
  layers: [{
    id: 'geo-background',
    type: 'background',
    paint: {
      'background-color': '#f8fafc',
    },
  }],
});

const normalizeTileUrls = (tileUrl?: string | string[]) => {
  const values = Array.isArray(tileUrl) ? tileUrl : tileUrl ? [tileUrl] : [];
  return values.map(value => value.trim()).filter(Boolean);
};

const finiteNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
};

const createRasterBasemapStyle = (
  tileUrls: string[],
  basemap: FileViewerGeoBasemapOptions | undefined
) => {
  const tileSize = Math.round(finiteNumber(basemap?.tileSize, 256, 64, 1024));
  const opacity = finiteNumber(basemap?.rasterOpacity, 1, 0, 1);
  const source: Record<string, unknown> = {
    type: 'raster',
    tiles: tileUrls,
    tileSize,
  };
  if (basemap?.attribution) {
    source.attribution = basemap.attribution;
  }
  if (Number.isFinite(basemap?.minZoom)) {
    source.minzoom = finiteNumber(basemap?.minZoom, 0, 0, MAX_MAP_ZOOM);
  }
  if (Number.isFinite(basemap?.maxZoom)) {
    source.maxzoom = finiteNumber(basemap?.maxZoom, MAX_MAP_ZOOM, 0, MAX_MAP_ZOOM);
  }
  if (basemap?.scheme === 'tms') {
    source.scheme = 'tms';
  }
  return {
    version: 8,
    sources: {
      'geo-basemap-raster': source,
    },
    layers: [
      {
        id: 'geo-background',
        type: 'background',
        paint: {
          'background-color': '#eef2f5',
        },
      },
      {
        id: 'geo-basemap-raster',
        type: 'raster',
        source: 'geo-basemap-raster',
        paint: {
          'raster-opacity': opacity,
          'raster-resampling': 'linear',
        },
      },
    ],
  };
};

const createTiandituTileUrls = (layer: string, token: string) => (
  TIANDITU_SUBDOMAINS.map(subdomain => (
    `https://${subdomain}.tianditu.gov.cn/DataServer?T=${layer}&x={x}&y={y}&l={z}&tk=${encodeURIComponent(token)}`
  ))
);

const createTiandituBasemapStyle = (
  token: string,
  mapStyle: NonNullable<FileViewerGeoBasemapOptions['mapStyle']>,
  labels: boolean
) => {
  const layerCodes = {
    vector: ['vec_w', 'cva_w'],
    imagery: ['img_w', 'cia_w'],
    terrain: ['ter_w', 'cta_w'],
  } as const;
  const [baseLayer, labelLayer] = layerCodes[mapStyle];
  const sources: Record<string, unknown> = {
    'geo-tianditu-base': {
      type: 'raster',
      tiles: createTiandituTileUrls(baseLayer, token),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 18,
      attribution: TIANDITU_ATTRIBUTION,
    },
  };
  const layers: Record<string, unknown>[] = [
    {
      id: 'geo-background',
      type: 'background',
      paint: { 'background-color': '#eef2f5' },
    },
    {
      id: 'geo-tianditu-base',
      type: 'raster',
      source: 'geo-tianditu-base',
    },
  ];
  if (labels) {
    sources['geo-tianditu-labels'] = {
      type: 'raster',
      tiles: createTiandituTileUrls(labelLayer, token),
      tileSize: 256,
      minzoom: 0,
      maxzoom: 18,
      attribution: TIANDITU_ATTRIBUTION,
    };
    layers.push({
      id: 'geo-tianditu-labels',
      type: 'raster',
      source: 'geo-tianditu-labels',
    });
  }
  return { version: 8, sources, layers };
};

const createTiandituBasemapConfig = (
  token: string | undefined,
  mapStyle: NonNullable<FileViewerGeoBasemapOptions['mapStyle']>,
  labels: boolean,
  label: string,
  t: FileViewerTranslator
): ResolvedGeoBasemapConfig => {
  const normalizedToken = token?.trim();
  if (!normalizedToken) {
    console.warn('[file-viewer] Tianditu basemap requires options.geo.tiandituToken or basemap.token; using the offline basemap.');
    return createOfflineBasemapConfig(t);
  }
  return {
    kind: 'raster',
    label,
    style: createTiandituBasemapStyle(normalizedToken, mapStyle, labels),
    attributionControl: true,
  };
};

const createOfflineBasemapConfig = (t: FileViewerTranslator): ResolvedGeoBasemapConfig => ({
  kind: 'offline',
  label: t('geo.basemap.offline'),
  style: createOfflineStyle(),
  attributionControl: false,
});

const createRasterBasemapConfig = (
  tileUrls: string[],
  basemap: FileViewerGeoBasemapOptions | undefined,
  label: string
): ResolvedGeoBasemapConfig => ({
  kind: 'raster',
  label,
  style: createRasterBasemapStyle(tileUrls, basemap),
  attributionControl: true,
});

export const resolveFileViewerGeoBasemapConfig = (
  options: FileViewerGeoOptions | undefined,
  t: FileViewerTranslator
): ResolvedGeoBasemapConfig => {
  const basemap = options?.basemap;
  if (basemap === false || basemap === 'none' || basemap === 'offline') {
    return createOfflineBasemapConfig(t);
  }
  if (typeof basemap === 'string') {
    const openFreeMapPreset = OPENFREEMAP_STYLE_PRESETS[basemap];
    if (openFreeMapPreset) {
      return {
        kind: 'vector-style',
        label: openFreeMapPreset.label,
        style: `${OPENFREEMAP_TILE_ORIGIN}/styles/${openFreeMapPreset.style}`,
        attributionControl: true,
      };
    }
    if (basemap === 'osm-raster') {
      return createRasterBasemapConfig(
        [OSM_RASTER_TILE_URL],
        { attribution: OSM_ATTRIBUTION },
        'OpenStreetMap Raster'
      );
    }
    const tiandituPreset = TIANDITU_STYLE_PRESETS[basemap as keyof typeof TIANDITU_STYLE_PRESETS];
    if (tiandituPreset) {
      return createTiandituBasemapConfig(
        options?.tiandituToken,
        tiandituPreset.mapStyle,
        true,
        tiandituPreset.label,
        t
      );
    }
  }
  if (isRecord(basemap)) {
    const config = basemap as FileViewerGeoBasemapOptions;
    const label = config.label?.trim() || t('geo.basemap.custom');
    if (config.type === 'tianditu') {
      const mapStyle = config.mapStyle || 'vector';
      return createTiandituBasemapConfig(
        config.token || options?.tiandituToken,
        mapStyle,
        config.labels !== false,
        config.label?.trim() || `Tianditu ${mapStyle[0].toUpperCase()}${mapStyle.slice(1)}`,
        t
      );
    }
    if ((config.type === 'vector-style' || config.styleUrl || config.style) && (config.styleUrl || config.style)) {
      return {
        kind: 'vector-style',
        label,
        style: config.styleUrl || config.style || createOfflineStyle(),
        attributionControl: true,
      };
    }
    const tileUrls = normalizeTileUrls(config.tileUrl);
    if ((config.type === 'raster' || tileUrls.length > 0) && tileUrls.length > 0) {
      return createRasterBasemapConfig(tileUrls, config, label);
    }
  }
  const tileUrls = normalizeTileUrls(options?.tileUrl);
  if (tileUrls.length > 0) {
    return createRasterBasemapConfig(tileUrls, undefined, t('geo.basemap.custom'));
  }
  return createOfflineBasemapConfig(t);
};

const fitMapToBounds = (map: MapLibreMap, bounds: Bounds | null, padding: number) => {
  if (!bounds) {
    map.jumpTo({ center: [0, 0], zoom: 1 });
    return;
  }
  const samePoint = Math.abs(bounds.maxX - bounds.minX) < 1e-9 && Math.abs(bounds.maxY - bounds.minY) < 1e-9;
  if (samePoint) {
    map.jumpTo({ center: [bounds.minX, bounds.minY], zoom: 13 });
    return;
  }
  map.fitBounds(
    [[bounds.minX, bounds.minY], [bounds.maxX, bounds.maxY]],
    { padding, duration: 0, maxZoom: 16 }
  );
};

const createZoomState = (map: MapLibreMap, bounds: Bounds | null) => {
  const zoom = map.getZoom();
  return {
    scale: zoom,
    label: `z${zoom.toFixed(1)}`,
    canZoomIn: zoom < MAX_MAP_ZOOM,
    canZoomOut: zoom > MIN_MAP_ZOOM,
    canReset: !!bounds,
    minScale: MIN_MAP_ZOOM,
    maxScale: MAX_MAP_ZOOM,
  };
};

const waitForMapLoad = (map: MapLibreMap) => {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      map.off('load', onLoad);
      map.off('error', onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = (event: MapLibreErrorEvent) => {
      cleanup();
      reject(event.error || new Error('MapLibre failed to load'));
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('MapLibre load timeout'));
    }, 8000);
    map.once('load', onLoad);
    map.once('error', onError);
  });
};

const createMapLibreMap = (
  maplibre: MapLibreModule,
  host: HTMLDivElement,
  basemap: ResolvedGeoBasemapConfig
) => {
  return new maplibre.Map({
    container: host,
    style: basemap.style as never,
    attributionControl: basemap.attributionControl ? { compact: true } : false,
    dragRotate: false,
    pitchWithRotate: false,
    minZoom: MIN_MAP_ZOOM,
    maxZoom: MAX_MAP_ZOOM,
  });
};

const mountMapLibre = async (
  host: HTMLDivElement,
  root: HTMLDivElement,
  parsed: ParseGeoResult,
  options: FileViewerGeoOptions | undefined,
  basemap: ResolvedGeoBasemapConfig,
  t: FileViewerTranslator
) => {
  const maplibre = await import('maplibre-gl');
  configureMapLibreWorker(maplibre);
  let activeBasemap = basemap;
  let map = createMapLibreMap(maplibre, host, activeBasemap);
  map.addControl(new maplibre.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');

  try {
    await waitForMapLoad(map);
  } catch (error) {
    if (activeBasemap.kind === 'offline') {
      throw error;
    }
    console.warn('[file-viewer] Geo basemap failed; retrying with the offline empty basemap.', error);
    map.remove();
    host.replaceChildren();
    activeBasemap = createOfflineBasemapConfig(t);
    updatePanelValue(root, 'basemap', activeBasemap.label);
    map = createMapLibreMap(maplibre, host, activeBasemap);
    map.addControl(new maplibre.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
    await waitForMapLoad(map);
  }

  const graticule = createGraticule(parsed.bounds);
  map.addSource('geo-graticule', {
    type: 'geojson',
    data: graticule as never,
  });
  map.addLayer({
    id: 'geo-graticule-line',
    type: 'line',
    source: 'geo-graticule',
    paint: {
      'line-color': '#cbd5e1',
      'line-width': 1,
      'line-opacity': 0.72,
    },
  });
  map.addSource('geo-data', {
    type: 'geojson',
    data: parsed.collection as never,
  });
  map.addLayer({
    id: 'geo-fill',
    type: 'fill',
    source: 'geo-data',
    filter: ['==', '$type', 'Polygon'] as never,
    paint: {
      'fill-color': '#14b8a6',
      'fill-opacity': 0.24,
    },
  });
  map.addLayer({
    id: 'geo-polygon-outline',
    type: 'line',
    source: 'geo-data',
    filter: ['==', '$type', 'Polygon'] as never,
    paint: {
      'line-color': '#0f766e',
      'line-width': 2,
      'line-opacity': 0.95,
    },
  });
  map.addLayer({
    id: 'geo-line',
    type: 'line',
    source: 'geo-data',
    filter: ['==', '$type', 'LineString'] as never,
    paint: {
      'line-color': '#2563eb',
      'line-width': 3,
      'line-opacity': 0.9,
    },
  });
  map.addLayer({
    id: 'geo-point',
    type: 'circle',
    source: 'geo-data',
    filter: ['==', '$type', 'Point'] as never,
    paint: {
      'circle-color': '#f97316',
      'circle-radius': 6,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });

  const padding = getFitPadding(options);
  const fit = () => {
    fitMapToBounds(map, parsed.bounds, padding);
  };
  fit();

  const zoomEmitter = createFileViewerZoomChangeEmitter();
  const viewStateEmitter = createFileViewerViewStateChangeEmitter();
  let applyingViewState = false;
  const getGeoViewState = (): FileViewerViewState => {
    const center = map.getCenter();
    return {
      renderer: 'geo',
      scale: map.getZoom(),
      zoom: createZoomState(map, parsed.bounds),
      extra: {
        center: [center.lng, center.lat],
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        basemap: activeBasemap.label,
      },
    };
  };
  const emitViewStateChange = (
    action: FileViewerViewStateChangeAction,
    source: FileViewerViewStateChangeSource = 'viewer'
  ) => {
    const state = getGeoViewState();
    if (!applyingViewState) {
      viewStateEmitter.emit(createFileViewerViewStateChange(state, { action, source }));
    }
    return state;
  };
  const onMapZoomEnd = () => {
    zoomEmitter.emit();
    emitViewStateChange('zoom-change', 'user');
  };
  const onMapMoveEnd = () => {
    emitViewStateChange('map-move', 'user');
  };
  const applyGeoFit = (request: FileViewerFitRequest): FileViewerFitResult => {
    fit();
    zoomEmitter.emit();
    const state = emitViewStateChange('fit', request.source);
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'view-state',
      state,
    };
  };
  map.on('zoomend', onMapZoomEnd);
  map.on('moveend', onMapMoveEnd);
  registerFileViewerZoomProvider(root, {
    zoomIn: () => {
      map.zoomTo(Math.min(MAX_MAP_ZOOM, map.getZoom() + 1), { duration: 160 });
      zoomEmitter.emit();
      emitViewStateChange('zoom-in', 'user');
      return createZoomState(map, parsed.bounds);
    },
    zoomOut: () => {
      map.zoomTo(Math.max(MIN_MAP_ZOOM, map.getZoom() - 1), { duration: 160 });
      zoomEmitter.emit();
      emitViewStateChange('zoom-out', 'user');
      return createZoomState(map, parsed.bounds);
    },
    resetZoom: () => {
      fit();
      zoomEmitter.emit();
      emitViewStateChange('zoom-reset', 'user');
      return createZoomState(map, parsed.bounds);
    },
    setZoom: (scale: number) => {
      map.zoomTo(Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, scale)), { duration: 160 });
      zoomEmitter.emit();
      return createZoomState(map, parsed.bounds);
    },
    fit: applyGeoFit,
    getState: () => createZoomState(map, parsed.bounds),
    subscribe: zoomEmitter.subscribe,
  });
  registerFileViewerViewStateProvider(root, {
    getState: getGeoViewState,
    async applyState(
      state: FileViewerViewState,
      applyOptions: FileViewerApplyViewStateOptions = {}
    ) {
      const source = applyOptions.source || 'api';
      const action = applyOptions.action || 'restore';
      const notify = applyOptions.notify !== false;
      const center = Array.isArray(state.extra?.center)
        ? state.extra.center.map(Number)
        : null;
      const zoom = Number(state.scale ?? state.zoom?.scale);
      const bearing = Number(state.extra?.bearing);
      const pitch = Number(state.extra?.pitch);

      applyingViewState = true;
      try {
        map.jumpTo({
          center: center && Number.isFinite(center[0]) && Number.isFinite(center[1])
            ? [center[0], center[1]]
            : map.getCenter(),
          zoom: Number.isFinite(zoom)
            ? Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, zoom))
            : map.getZoom(),
          bearing: Number.isFinite(bearing) ? bearing : map.getBearing(),
          pitch: Number.isFinite(pitch) ? pitch : map.getPitch(),
        });
        zoomEmitter.emit();
      } finally {
        applyingViewState = false;
      }

      if (notify) {
        return emitViewStateChange(action, source);
      }
      return getGeoViewState();
    },
    fit: applyGeoFit,
    subscribe: viewStateEmitter.subscribe,
  });

  const ResizeObserverCtor = host.ownerDocument.defaultView?.ResizeObserver;
  const resizeObserver = ResizeObserverCtor
    ? new ResizeObserverCtor(() => {
      map.resize();
    })
    : null;
  resizeObserver?.observe(host);

  const fitButton = root.querySelector<HTMLButtonElement>('[data-geo-action="fit"]');
  fitButton?.addEventListener('click', fit);
  fitButton?.setAttribute('title', t('geo.action.fit'));

  return {
    map,
    cleanup() {
      fitButton?.removeEventListener('click', fit);
      resizeObserver?.disconnect();
      map.off('zoomend', onMapZoomEnd);
      map.off('moveend', onMapMoveEnd);
      unregisterFileViewerViewStateProvider(root);
      unregisterFileViewerZoomProvider(root);
      map.remove();
    },
  };
};

const buildMapShell = (
  parsed: ParseGeoResult,
  type: string,
  engineLabel: string,
  basemapLabel: string,
  t: FileViewerTranslator
) => {
  const root = createElement('div', 'geo-viewer');
  const stage = createElement('main', 'geo-stage');
  const toolbar = createElement('div', 'geo-toolbar');
  const fitButton = createElement('button', undefined, t('geo.action.fit'));
  fitButton.dataset.geoAction = 'fit';
  const frame = createElement('div', 'geo-map-frame');
  const mapHost = createElement('div', 'geo-map-engine');
  frame.appendChild(mapHost);
  toolbar.appendChild(fitButton);
  stage.append(toolbar, frame);
  root.append(buildPanel(parsed, type, engineLabel, basemapLabel, t), stage);
  return { root, mapHost, frame };
};

const renderMapLibreView = async (
  parsed: ParseGeoResult,
  type: string,
  options: FileViewerGeoOptions | undefined,
  t: FileViewerTranslator
) => {
  const basemap = resolveFileViewerGeoBasemapConfig(options, t);
  const shell = buildMapShell(parsed, type, t('geo.engine.maplibre'), basemap.label, t);
  const mounted = await mountMapLibre(shell.mapHost, shell.root, parsed, options, basemap, t);
  return {
    element: shell.root,
    cleanup: mounted.cleanup,
  };
};

const renderSvgView = (
  parsed: ParseGeoResult,
  type: string,
  t: FileViewerTranslator
) => {
  const shell = buildMapShell(parsed, type, t('geo.engine.svg'), t('geo.basemap.offline'), t);
  shell.frame.replaceChildren(buildSvgPreview(parsed, t));
  return shell.root;
};

export default async function renderGeo(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const normalizedType = normalizeGeoType(type);
  const t = createFileViewerTranslator(context?.options);
  const options = context?.options?.geo;
  const style = createStyle();
  const state = document.createElement('div');
  state.className = 'geo-state';
  state.textContent = t('geo.loading');
  let cleanup: (() => void) | undefined;
  target.replaceChildren(style, state);

  try {
    const parsed = await parseFileViewerGeoData(buffer, normalizedType, options, t);
    if (options?.preferMapEngine !== false) {
      try {
        const mapView = await renderMapLibreView(parsed, normalizedType, options, t);
        cleanup = mapView.cleanup;
        target.replaceChildren(style, mapView.element);
      } catch (mapError) {
        console.warn('[file-viewer] MapLibre geospatial preview failed; using SVG fallback.', mapError);
        target.replaceChildren(style, renderSvgView(parsed, normalizedType, t));
      }
    } else {
      target.replaceChildren(style, renderSvgView(parsed, normalizedType, t));
    }
  } catch (error) {
    console.error(error);
    state.classList.add('error');
    state.textContent = error instanceof Error ? error.message : String(error);
  }

  return {
    $el: target,
    unmount() {
      cleanup?.();
      target.replaceChildren();
    },
  };
}
