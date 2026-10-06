import type { FileRenderContext } from '@file-viewer/core'
// Namespace type imports preserve the peer's actual default-exported class in
// both NodeNext and Bundler consumers. Default type imports become synthetic
// namespaces under NodeNext for the pinned peer's CommonJS package identity.
import type * as InstanceModule from '@giro3d/giro3d/core/Instance.js'
import type * as PointCloudModule from '@giro3d/giro3d/entities/PointCloud.js'
import type * as MapModule from '@giro3d/giro3d/entities/Map.js'
import type * as Tiles3DModule from '@giro3d/giro3d/entities/Tiles3D.js'
import type * as CoordinateSystemModule from '@giro3d/giro3d/core/geographic/CoordinateSystem.js'
import type * as LASSourceModule from '@giro3d/giro3d/sources/LASSource.js'
import type * as COPCSourceModule from '@giro3d/giro3d/sources/COPCSource.js'
import type * as GeoTIFFSourceModule from '@giro3d/giro3d/sources/GeoTIFFSource.js'
import type * as ColorLayerModule from '@giro3d/giro3d/core/layer/ColorLayer.js'
import type { PointCloudBatchTableAttributeMapping } from '@giro3d/giro3d/entities/Tiles3D.js'
import {
  createGeo3dProbeRangeGetter,
  inspectGeo3dDataset,
  inspectGeoTiffRangeSource,
  isCopcRangeSource,
  type Geo3dDatasetFormat,
  type GeoTiffInspection
} from './geo3dInspect.js'
import {
  disposeCityJsonGroup,
  parseCityJson,
  renderCityJsonDocument,
  renderCityJsonWithTextures
} from './geo3dCityJson.js'
import {
  prepare3tzDataset,
  type Geo3d3tzLimits,
  type Geo3d3tzPreparedDataset
} from './geo3dArchive.js'
import { byteLimit, checkAbort, createRangeGetter, readBoundedResponse } from './geo3dRange.js'
import { resolveGeo3dCrs, type Geo3dCrsInput } from './geo3dCrs.js'
import { createGeo3dLasWorkers } from './geo3dLasWorkers.js'
import { createGeo3dRasterWorkers } from './geo3dRasterWorkers.js'
import { runGeo3dHook, type Geo3dHookResult } from './geo3dHooks.js'
import { repairGeo3dPointMaterial } from './geo3dPointMaterial.js'
import { resolveGeo3dDatasetUrl } from './geo3dUrl.js'
type Instance = InstanceModule.default
type PointCloud = PointCloudModule.default
type GiroMap = MapModule.default
type Tiles3D = Tiles3DModule.default
type CoordinateSystem = CoordinateSystemModule.default
type LASSource = LASSourceModule.default
type COPCSource = COPCSourceModule.default
type GeoTIFFSource = GeoTIFFSourceModule.default
type ColorLayer = ColorLayerModule.default
export type { Geo3dCrsInput } from './geo3dCrs.js'
export interface Geo3dCopcOptions {
  enableWorkers?: boolean
  decimate?: number
  compressColorsTo8Bit?: boolean
  /** Zero retains Giro3D automatic sizing. */ pointSize?: number
  subdivisionThreshold?: number
}
export interface Geo3dLasOptions extends Geo3dCopcOptions {}
export interface Geo3dTilesOptions {
  errorTarget?: number
  pointCloudAttributeMapping?: PointCloudBatchTableAttributeMapping
  pointSize?: number
  enableFetchPlugin?: boolean
}
export interface Geo3dGeoTiffOptions {
  channels?: [number] | [number, number, number] | [number, number, number, number]
  enableWorkers?: boolean
  flipY?: boolean
  httpTimeout?: number
  is8bit?: boolean
  transparent?: boolean
}
export interface Geo3dCityJsonOptions {
  materialColor?: number | string
  textureTheme?: string
}
export interface Geo3dGiroOptions {
  instance?: {
    crs?: Geo3dCrsInput
    backgroundColor?: string | number | null
    logarithmicDepthBuffer?: boolean
  }
  view?: { fitToDataset?: boolean; controls?: boolean }
  sources?: {
    copc?: Geo3dCopcOptions
    las?: Geo3dLasOptions
    geotiff?: Geo3dGeoTiffOptions
    cog?: Geo3dGeoTiffOptions
    cityjson?: Geo3dCityJsonOptions
    '3d-tiles'?: Geo3dTilesOptions
  }
}
/** Original input descriptor, distinct from the decoder source exposed after loading. */
export interface Geo3dDatasetSource {
  format: Geo3dDatasetFormat
  filename: string
  url?: string
  file?: File | Blob
  buffer?: ArrayBuffer
  resolveRelativeUrl(reference: string): string
}
interface Geo3dMetadataLike {
  crs?: CoordinateSystem | string
  triangleCount?: number
  objectCount?: number
  externalResources?: Array<{ source: string; url: string }>
}
// Type-only engine imports keep the optional entry lazy, as in the IFC entry.
// References remain adapter-owned. Mutation through their public APIs is allowed,
// but hooks must not dispose them or transfer them to a different viewer.
type Geo3dEntityBinding =
  | {
      format: 'copc'
      entity: PointCloud
      readonly nativeSource: COPCSource
      readonly colorLayer: null
    }
  | {
      format: 'las' | 'laz'
      entity: PointCloud
      readonly nativeSource: LASSource
      readonly colorLayer: null
    }
  | {
      format: 'geotiff' | 'cog'
      entity: GiroMap
      readonly nativeSource: GeoTIFFSource
      readonly colorLayer: ColorLayer
    }
  | {
      format: '3d-tiles' | '3tz'
      entity: Tiles3D
      readonly nativeSource: null
      readonly colorLayer: null
    }
  | {
      format: 'cityjson'
      entity: ReturnType<typeof renderCityJsonDocument>['group']
      readonly nativeSource: null
      readonly colorLayer: null
    }
type Geo3dEntityLike = Geo3dEntityBinding['entity']
interface Geo3dSourceLike {
  dispose?: () => void
}
interface Geo3dControlsLike {
  reset?: () => void
  dispose?: () => void
}
type Geo3dInstanceLike = Instance
/** Trusted application hook. Do not dispose adapter-owned objects; return host cleanup. */
export interface Geo3dRuntimeContext {
  instance: Instance
  source: Geo3dDatasetSource
  metadata: Geo3dMetadataLike | GeoTiffInspection | null
  format: Geo3dDatasetFormat
  signal: AbortSignal
}
/** Narrow format to use the full public entity/source/layer API without a consumer cast. */
export type Geo3dExtensionContext = Geo3dRuntimeContext &
  Geo3dEntityBinding & { fitToDataset(): void }
export interface Geo3dViewerOptions {
  assetBaseUrl?: string | URL
  maxLasBytes?: number
  maxCityJsonBytes?: number
  max3tzBytes?: number
  /** Local WKT/proj definitions; never downloaded from an EPSG registry. */
  crsDefinitions?: Record<string, string>
  archive?: Geo3d3tzLimits
  giro3d?: Geo3dGiroOptions
  configureInstance?: (context: Geo3dRuntimeContext) => Geo3dHookResult | Promise<Geo3dHookResult>
  configure?: (context: Geo3dExtensionContext) => Geo3dHookResult | Promise<Geo3dHookResult>
  /** Cleanup and late hook failures. Without an observer, reportError/console reports them. */
  onExtensionError?: (error: unknown) => void
}
export type Geo3dViewerInstance = {
  $el: HTMLElement
  instance: Instance
  fitToDataset(): void
  unmount(): Promise<void>
} & Geo3dEntityBinding
const DEFAULT_MAX_LAS_BYTES = 512 * 1024 * 1024,
  DEFAULT_MAX_CITYJSON_BYTES = 64 * 1024 * 1024,
  DEFAULT_MAX_3TZ_BYTES = 512 * 1024 * 1024
const resolveAssetBaseUrl = (value?: string | URL) => {
  const raw = value?.toString() || '/file-viewer/vendor/geo3d/'
  return raw.endsWith('/') ? raw : `${raw}/`
}
async function whole(
  source: Geo3dDatasetSource,
  max: number,
  signal: AbortSignal
): Promise<Uint8Array> {
  byteLimit(max)
  checkAbort(signal)
  if (source.buffer) {
    if (source.buffer.byteLength > max)
      throw new Error('Geo3D whole-file input exceeds its byte limit.')
    return new Uint8Array(source.buffer)
  }
  if (source.file) {
    if (source.file.size > max) throw new Error('Geo3D whole-file input exceeds its byte limit.')
    const bytes = new Uint8Array(await source.file.arrayBuffer())
    checkAbort(signal)
    return bytes
  }
  if (!source.url) throw new Error('Geo3D source has no readable input.')
  const response = await fetch(source.url, { signal })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`Geo3D source download failed: HTTP ${response.status}.`)
  }
  return readBoundedResponse(response, max, signal)
}
function normalizeType(type?: string): Geo3dDatasetFormat | undefined {
  if (type === '3dtiles' || type === '3d-tiles') return '3d-tiles'
  return ['copc', 'las', 'laz', 'geotiff', 'cog', 'cityjson', '3tz'].includes(type || '')
    ? (type as Geo3dDatasetFormat)
    : undefined
}
async function createInstance(
  target: HTMLDivElement,
  crs: CoordinateSystem,
  options: Geo3dViewerOptions
): Promise<Geo3dInstanceLike> {
  const { default: Instance } = await import('@giro3d/giro3d/core/Instance.js')
  return new Instance({
    target,
    crs,
    backgroundColor: options.giro3d?.instance?.backgroundColor ?? null,
    renderer:
      options.giro3d?.instance?.logarithmicDepthBuffer === undefined
        ? undefined
        : { logarithmicDepthBuffer: options.giro3d.instance.logarithmicDepthBuffer }
  })
}
async function createControls(
  instance: Geo3dInstanceLike,
  enabled: boolean
): Promise<Geo3dControlsLike | null> {
  if (!enabled) return null
  const { default: FirstPersonControls } =
    await import('@giro3d/giro3d/controls/FirstPersonControls.js')
  const controls = new FirstPersonControls(instance, {
    focusOnMouseOver: true
  }) as Geo3dControlsLike
  controls.reset?.()
  return controls
}
export async function renderGeo3d(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext,
  options: Geo3dViewerOptions = {}
): Promise<Geo3dViewerInstance> {
  const hint = normalizeType(type?.toLowerCase()),
    inspection = hint
      ? { format: hint }
      : inspectGeo3dDataset({
          filename: context?.filename,
          buffer: buffer.byteLength ? buffer : undefined
        })
  if (!inspection) throw new Error('Unsupported Geo3D dataset.')
  const controller = new AbortController(),
    signal = controller.signal
  let cleanupPromise: Promise<void> | undefined,
    loaded = false,
    destroyed = false
  let instance: Geo3dInstanceLike | null = null,
    entity: Geo3dEntityLike | null = null,
    controls: Geo3dControlsLike | null = null,
    sourceObject: Geo3dSourceLike | null = null
  let colorLayer: ColorLayer | null = null
  let stopPointRequests: (() => void) | undefined
  let cityObject: ReturnType<typeof renderCityJsonDocument>['group'] | null = null
  const owned: Array<() => void | Promise<void>> = [],
    hooks: Array<() => void | Promise<void>> = []
  let archiveDataset: Geo3d3tzPreparedDataset | undefined
  let metadata: Geo3dMetadataLike | GeoTiffInspection | null = null
  let format = inspection.format
  const originalUrl = resolveGeo3dDatasetUrl(
    context?.streamUrl || context?.url,
    target.ownerDocument.baseURI
  )
  let source: Geo3dDatasetSource = {
    format,
    filename: context?.filename || 'dataset',
    url: originalUrl,
    file: context?.sourceFile,
    buffer: buffer.byteLength ? buffer : undefined,
    resolveRelativeUrl(reference) {
      return originalUrl ? new URL(reference, originalUrl).href : reference
    }
  }
  const cleanup = (): Promise<void> => {
    if (cleanupPromise) return cleanupPromise
    destroyed = true
    cleanupPromise = Promise.resolve().then(async () => {
      // Stop consumers before releasing their sources. Every owner is released
      // even when a host callback or engine disposer throws.
      const tasks: Array<() => void | Promise<void>> = [
        ...hooks.reverse(),
        () => instance?.view.setControls(null),
        () => controls?.dispose?.(),
        () => {
          if (cityObject) disposeCityJsonGroup(cityObject)
        },
        () => instance?.dispose(),
        () => sourceObject?.dispose?.(),
        ...owned.reverse()
      ]
      for (const dispose of tasks) {
        try {
          await dispose()
        } catch {
          /* Continue to the remaining owned resources. */
        }
      }
      target.replaceChildren()
    })
    context?.signal?.removeEventListener('abort', abort)
    try {
      stopPointRequests?.()
    } catch {
      /* Source cancellation and final disposal must still run. */
    }
    controller.abort(new DOMException('Geo3D viewer disposed.', 'AbortError'))
    return cleanupPromise
  }
  const abort = () => {
    // Cancel entity-level requests synchronously, before the source-owned pool
    // rejects work and before an asynchronous configure hook can resume.
    try {
      stopPointRequests?.()
    } catch {
      /* Source cancellation and final disposal must still run. */
    }
    controller.abort(context?.signal?.reason)
    if (loaded) void cleanup()
  }
  context?.signal?.addEventListener('abort', abort, { once: true })
  if (context?.signal?.aborted) abort()
  const before = async (crs: CoordinateSystem) => {
    checkAbort(signal)
    instance = await createInstance(target, crs, options)
    checkAbort(signal)
    controls = await createControls(instance, options.giro3d?.view?.controls !== false)
    checkAbort(signal)
    const runtimeContext = { instance, source, metadata, format, signal }
    if (options.configureInstance)
      await runGeo3dHook(
        () => options.configureInstance!(runtimeContext),
        signal,
        (dispose) => hooks.push(dispose),
        options.onExtensionError
      )
    checkAbort(signal)
    return instance
  }
  try {
    checkAbort(signal)
    const maxLasBytes = byteLimit(options.maxLasBytes ?? DEFAULT_MAX_LAS_BYTES, 'maxLasBytes')
    const maxCityJsonBytes = byteLimit(
      options.maxCityJsonBytes ?? DEFAULT_MAX_CITYJSON_BYTES,
      'maxCityJsonBytes'
    )
    const max3tzBytes = byteLimit(options.max3tzBytes ?? DEFAULT_MAX_3TZ_BYTES, 'max3tzBytes')
    for (const [id, definition] of Object.entries(options.crsDefinitions || {}))
      await resolveGeo3dCrs({ id, definition })
    const instanceCrs = options.giro3d?.instance?.crs
    // Register an explicitly supplied definition before resolving the dataset CRS.
    if (typeof instanceCrs === 'object') await resolveGeo3dCrs(instanceCrs)
    if (format === 'las' || format === 'laz') {
      if (await isCopcRangeSource(createGeo3dProbeRangeGetter({ ...source, signal })))
        format = 'copc'
      source = { ...source, format }
    }
    if (format === '3tz') {
      const archive = await prepare3tzDataset(
        await whole(source, max3tzBytes, signal),
        options.archive,
        signal
      )
      archiveDataset = archive
      owned.push(archive.dispose)
      source = { ...source, url: archive.rootUrl }
    }
    if (format === 'copc' || format === 'las' || format === 'laz') {
      const pointOptions =
        format === 'copc' ? options.giro3d?.sources?.copc : options.giro3d?.sources?.las
      // A lazy owned pool creates no Worker in explicit synchronous mode. Both
      // modes retain the source's cancellation and disposal boundary.
      const workers = createGeo3dLasWorkers(resolveAssetBaseUrl(options.assetBaseUrl), signal)
      owned.push(() => workers.dispose())
      if (pointOptions?.enableWorkers === false) {
        const { setLazPerfPath } = await import('@giro3d/giro3d/sources/las/config.js')
        setLazPerfPath(`${resolveAssetBaseUrl(options.assetBaseUrl)}laz-perf/`)
      }
      const factories = await import('./geo3dPointFactories.js')
      checkAbort(signal)
      let pointSource
      if (format === 'copc') {
        // Content-Range, body length and representation identity are validated together.
        const input = {
          url: createRangeGetter({ ...source, signal }),
          enableWorkers: pointOptions?.enableWorkers,
          decimate: pointOptions?.decimate,
          compressColorsTo8Bit: pointOptions?.compressColorsTo8Bit
        }
        pointSource = factories.createCOPCSource(workers, input)
      } else {
        const input = {
          url: () => whole(source, maxLasBytes, signal),
          enableWorkers: pointOptions?.enableWorkers,
          decimate: pointOptions?.decimate,
          compressColorsTo8Bit: pointOptions?.compressColorsTo8Bit
        }
        pointSource = factories.createLASSource(workers, input)
      }
      sourceObject = pointSource
      await pointSource.initialize()
      checkAbort(signal)
      metadata = (await pointSource.getMetadata()) as unknown as Geo3dMetadataLike
      const native =
        typeof metadata?.crs === 'string' ? await resolveGeo3dCrs(metadata.crs) : metadata?.crs
      const scene = await resolveGeo3dCrs(instanceCrs, native)
      // Giro3D PointCloud keeps source coordinates; unlike Map it does not
      // reproject them into the Instance CRS. Reject before constructing a scene.
      if (native && !native.isUnknown() && !scene.equals(native))
        throw new Error(
          'Point-cloud instance CRS must match its dataset CRS; reproject the dataset before loading.'
        )
      const current = await before(scene)
      const point = factories.createOwnedPointCloud({ source: pointSource })
      const pointEntity = point.entity
      entity = pointEntity
      // Install before add()/preprocess can dispatch any node requests. The
      // fallback disposer also covers an entity whose add() never completes.
      stopPointRequests = point.stop
      owned.push(() => pointEntity.dispose())
      if (pointOptions?.pointSize !== undefined) {
        if (!Number.isFinite(pointOptions.pointSize) || pointOptions.pointSize < 0)
          throw new Error('Invalid Geo3D pointSize.')
        pointEntity.pointSize = pointOptions.pointSize
      }
      if (pointOptions?.subdivisionThreshold !== undefined) {
        if (
          !Number.isFinite(pointOptions.subdivisionThreshold) ||
          pointOptions.subdivisionThreshold <= 0
        )
          throw new Error('Invalid Geo3D subdivisionThreshold.')
        pointEntity.subdivisionThreshold = pointOptions.subdivisionThreshold
      }
      await current.add(pointEntity)
    } else if (format === 'geotiff' || format === 'cog') {
      const tiff = await inspectGeoTiffRangeSource(
        createGeo3dProbeRangeGetter({ ...source, signal })
      )
      if (!tiff?.bbox)
        throw new Error('GeoTIFF requires readable georeferencing and raster bounds.')
      if (!tiff.crs && !instanceCrs)
        throw new Error('GeoTIFF CRS is missing; supply an explicit offline CRS definition.')
      metadata = tiff
      const native = await resolveGeo3dCrs(tiff.crs || instanceCrs),
        scene = await resolveGeo3dCrs(instanceCrs, native)
      const current = await before(scene)
      let url = source.url
      if (!url) {
        const blob =
          source.file || (source.buffer ? new Blob([source.buffer], { type: 'image/tiff' }) : null)
        if (!blob) throw new Error('Missing GeoTIFF source.')
        url = URL.createObjectURL(blob)
        const ownedUrl = url
        owned.push(() => URL.revokeObjectURL(ownedUrl))
      }
      const { default: Extent } = await import('@giro3d/giro3d/core/geographic/Extent.js')
      const { createGeoTIFFSource } = await import('./geo3dRasterFactories.js')
      const { default: Map } = await import('@giro3d/giro3d/entities/Map.js')
      const { default: ColorLayer } = await import('@giro3d/giro3d/core/layer/ColorLayer.js')
      const [minX, minY, maxX, maxY] = tiff.bbox,
        extent = new Extent(native, minX, maxX, minY, maxY)
      const raster =
        format === 'cog'
          ? options.giro3d?.sources?.cog || options.giro3d?.sources?.geotiff
          : options.giro3d?.sources?.geotiff
      const workers = createGeo3dRasterWorkers(resolveAssetBaseUrl(options.assetBaseUrl), signal)
      owned.push(() => workers.dispose())
      const image = createGeoTIFFSource(workers, {
        url,
        crs: native,
        channels: raster?.channels,
        enableWorkers: raster?.enableWorkers,
        flipY: raster?.flipY,
        httpTimeout: raster?.httpTimeout,
        is8bit: raster?.is8bit,
        transparent: raster?.transparent
      })
      sourceObject = image
      const map = new Map({ extent: extent.as(scene).withRelativeMargin(0.02) })
      entity = map
      await current.add(map)
      checkAbort(signal)
      colorLayer = new ColorLayer({ name: 'file-viewer-geotiff', source: image, extent })
      await map.addLayer(colorLayer)
    } else if (format === 'cityjson') {
      const document = parseCityJson(
        new TextDecoder().decode(await whole(source, maxCityJsonBytes, signal))
      )
      const rendered = await renderCityJsonWithTextures(
        document,
        source.resolveRelativeUrl,
        options.giro3d?.sources?.cityjson,
        source.url,
        signal
      )
      cityObject = rendered.group
      entity = rendered.group
      metadata = {
        crs: rendered.crs,
        triangleCount: rendered.triangleCount,
        objectCount: rendered.objectCount,
        externalResources: rendered.externalResources
      }
      const native = await resolveGeo3dCrs(rendered.crs || instanceCrs),
        scene = await resolveGeo3dCrs(instanceCrs, native)
      if (rendered.crs && !scene.equals(native))
        throw new Error(
          'CityJSON instance CRS must match its dataset CRS; implicit coordinate relabelling is not supported.'
        )
      const current = await before(scene)
      checkAbort(signal)
      await current.add(rendered.group)
    } else {
      if (!source.url)
        throw new Error(
          '3D Tiles requires a URL or 3TZ so relative tile and texture references remain resolvable.'
        )
      const current = await before(await resolveGeo3dCrs(instanceCrs || 'EPSG:4978'))
      const { default: Tiles3D } = await import('@giro3d/giro3d/entities/Tiles3D.js')
      const tiles = options.giro3d?.sources?.['3d-tiles'],
        assetBase = resolveAssetBaseUrl(options.assetBaseUrl)
      const tilesEntity = new Tiles3D({
        url: source.url,
        errorTarget: tiles?.errorTarget,
        pointCloudAttributeMapping: tiles?.pointCloudAttributeMapping,
        pointSize: tiles?.pointSize,
        enableFetchPlugin: archiveDataset ? false : tiles?.enableFetchPlugin,
        dracoDecoderPath: `${assetBase}three/draco/`,
        ktx2DecoderPath: `${assetBase}three/basis/`
      })
      entity = tilesEntity
      type ModelEvent = {
        scene: { traverse(visitor: (object: { material?: unknown }) => void): void }
      }
      // Public Giro3D getter; callbacks are scoped to this entity's tile renderer.
      const native = tilesEntity.tiles as unknown as {
        registerPlugin(plugin: {
          name: string
          fetchData: (url: string, options?: { signal?: AbortSignal }) => Promise<Response> | null
        }): void
        addEventListener(type: 'load-model', listener: (event: ModelEvent) => void): void
        addEventListener(type: string, listener: () => void): void
        removeEventListener(type: 'load-model', listener: (event: ModelEvent) => void): void
        removeEventListener(type: string, listener: () => void): void
      }
      if (archiveDataset)
        native.registerPlugin({
          name: 'FILE_VIEWER_LOCAL_3TZ',
          fetchData: archiveDataset.fetchData
        })
      const preparePointMaterials = ({ scene }: ModelEvent) => {
        if (signal.aborted) return
        scene.traverse((object) => {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) repairGeo3dPointMaterial(material)
        })
      }
      native.addEventListener('load-model', preparePointMaterials)
      hooks.push(() => native.removeEventListener('load-model', preparePointMaterials))
      // External tileset arrival must wake the on-demand render loop too, not
      // only mesh arrival. Keep both event spellings for the pinned peer graph.
      const events = ['load-tileset', 'load-tile-set', 'load-model', 'needs-update']
      const notify = () => {
        if (!signal.aborted) current.notifyChange(tilesEntity)
      }
      for (const event of events) native.addEventListener(event, notify)
      hooks.push(() => {
        for (const event of events) native.removeEventListener(event, notify)
      })
      await current.add(tilesEntity)
    }
    checkAbort(signal)
    if (!instance || !entity) throw new Error('Geo3D runtime did not create an entity.')
    const ready = instance as Geo3dInstanceLike,
      readyEntity = entity as Geo3dEntityLike
    const fitToDataset = () => {
      if (destroyed) return
      const pov = ready.view.goTo(readyEntity)
      if (pov) {
        controls?.reset?.()
        ready.notifyChange(readyEntity)
      }
    }
    if (options.giro3d?.view?.fitToDataset !== false) fitToDataset()
    // Each branch constructs these correlated objects. Keep this assertion at
    // the adapter boundary; consumers never cast a source or search by layer name.
    const binding = {
      format,
      entity: readyEntity,
      nativeSource: sourceObject,
      colorLayer
    } as Geo3dEntityBinding
    const extensionContext = { instance: ready, ...binding, source, metadata, signal, fitToDataset }
    if (options.configure)
      await runGeo3dHook(
        () => options.configure!(extensionContext),
        signal,
        (dispose) => hooks.push(dispose),
        options.onExtensionError
      )
    checkAbort(signal)
    loaded = true
    context?.onProgressiveRender?.()
    return { $el: target, instance: ready, ...binding, fitToDataset, unmount: cleanup }
  } catch (error) {
    await cleanup()
    throw error
  }
}
