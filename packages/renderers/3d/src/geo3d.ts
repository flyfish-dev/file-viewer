import type { FileRenderContext, FileRenderHandler, FileViewerRendererPlugin, RendererDefinition } from '@file-viewer/core'
import type { Geo3dViewerInstance, Geo3dViewerOptions } from './geo3dRuntime.js'

export type { Geo3dDatasetFormat, Geo3dDatasetInspection, Geo3dRangeGetter, GeoTiffInspection } from './geo3dInspect.js'
export {
  createGeo3dProbeRangeGetter,
  inspectGeo3dDataset,
  inspectGeoTiffBuffer,
  inspectGeoTiffRangeSource,
  is3dTilesJsonBuffer,
  isCityJsonBuffer,
  isCopcLasBuffer,
  isCopcRangeSource,
  resolveGeo3dSourceType,
} from './geo3dInspect.js'
import { resolveGeo3dSourceType } from './geo3dInspect.js'
export type { Geo3dCityJsonOptions, Geo3dCopcOptions, Geo3dCrsInput, Geo3dDatasetSource, Geo3dExtensionContext, Geo3dGeoTiffOptions, Geo3dGiroOptions, Geo3dLasOptions, Geo3dRuntimeContext, Geo3dTilesOptions, Geo3dViewerInstance, Geo3dViewerOptions } from './geo3dRuntime.js'

export const geo3dRendererDefinition: RendererDefinition = {
  id: 'geo3d',
  label: 'Streaming Geo3D',
  category: 'geo',
  extensions: [
    'copc',
    'las',
    'laz',
    'geotiff',
    'cog',
    'cityjson',
    '3dtiles',
    '3tz',
  ],
  filenamePatterns: [
    '*.copc.laz',
    'tileset.json',
    '*.city.json',
    '*.3dtiles.zip',
  ],
  sourceAccess: 'stream-preferred',
  resolveSourceType: resolveGeo3dSourceType,
  async: true,
  packageName: '@file-viewer/renderer-3d',
  supportLevel: 'experimental',
  status: 'experimental',
  presets: [],
  knownLimits: [
    'COPC and COG use progressive/range-aware access; raw LAS/LAZ, CityJSON and 3TZ are bounded whole-file inputs.',
    'TIFF is claimed only after GeoTIFF tag inspection; ordinary TIFF remains owned by the image renderer.',
    '3TZ extraction enforces path, duplicate, entry-count, expanded-size and compression-ratio limits before exposing tileset.json.'
  ],
  capabilities: { download: true, print: false, exportHtml: false, zoom: false, search: false },
}

const createHandler = (
  options: Geo3dViewerOptions
): FileRenderHandler<Geo3dViewerInstance, HTMLDivElement> =>
  (buffer, target, type, context) =>
    renderFileViewerGeo3d(buffer, target, type, context, options)

export function createGeo3dRenderer(
  options: Geo3dViewerOptions = {}
): FileViewerRendererPlugin<FileRenderHandler<Geo3dViewerInstance, HTMLDivElement>> {
  return {
    id: 'file-viewer-renderer-geo3d',
    label: 'Flyfish optional streaming Geo3D viewer',
    definitions: [geo3dRendererDefinition],
    handlers: [{ rendererId: 'geo3d', handler: createHandler(options) }],
  }
}

export async function renderFileViewerGeo3d(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext,
  options: Geo3dViewerOptions = {}
): Promise<Geo3dViewerInstance> {
  const { renderGeo3d } = await import('./geo3dRuntime.js')
  return renderGeo3d(buffer, target, type, context, options)
}

export const geo3dRenderer = createGeo3dRenderer()
export default geo3dRenderer
