// Compile against the public package export and emitted declarations, never src.
import { createGeo3dRenderer, type Geo3dDatasetSource, type Geo3dExtensionContext, type Geo3dViewerInstance } from '@file-viewer/renderer-3d/geo3d'
import type * as InstanceModule from '@giro3d/giro3d/core/Instance.js'
import type * as PointCloudModule from '@giro3d/giro3d/entities/PointCloud.js'
import type * as MapModule from '@giro3d/giro3d/entities/Map.js'
import type * as Tiles3DModule from '@giro3d/giro3d/entities/Tiles3D.js'
import type * as LASSourceModule from '@giro3d/giro3d/sources/LASSource.js'
import type * as COPCSourceModule from '@giro3d/giro3d/sources/COPCSource.js'
import type * as GeoTIFFSourceModule from '@giro3d/giro3d/sources/GeoTIFFSource.js'
import type * as ColorLayerModule from '@giro3d/giro3d/core/layer/ColorLayer.js'
import type * as ElevationLayerModule from '@giro3d/giro3d/core/layer/ElevationLayer.js'
import type { Group } from 'three'
type Instance = InstanceModule.default
type PointCloud = PointCloudModule.default
type GiroMap = MapModule.default
type Tiles3D = Tiles3DModule.default

type IsAny<T> = 0 extends (1 & T) ? true : false
type ExpectFalse<T extends false> = T
type InstanceIsNotAny = ExpectFalse<IsAny<Geo3dExtensionContext['instance']>>
type EntityIsNotAny = ExpectFalse<IsAny<Geo3dExtensionContext['entity']>>
type NativeSourceIsNotAny = ExpectFalse<IsAny<Geo3dExtensionContext['nativeSource']>>
type ColorLayerIsNotAny = ExpectFalse<IsAny<Geo3dExtensionContext['colorLayer']>>
declare const mouse: MouseEvent
declare const planes: PointCloud['clippingPlanes']
declare const hostColor: ColorLayerModule.default
declare const hostElevation: ElevationLayerModule.default

createGeo3dRenderer({
  configureInstance(context) {
    const { instance, signal } = context
    const real: Instance = instance
    const progress: number = real.progress
    const loading: boolean = real.loading
    const cancellation: AbortSignal = signal
    real.notifyChange(real)
    void real.view.camera
    real.pickObjectsAt(mouse)
    real.getEntities()
    real.getMemoryUsage()
    void [progress, loading, cancellation]
    // @ts-expect-error The escape hatch is not any or an index signature.
    instance.nonexistentGeo3dMethod()
    // @ts-expect-error Raster sources are not constructed yet in the Instance hook.
    context.nativeSource
    return () => { /* Release only host-owned resources. */ }
  },
  configure(context) {
    const { instance } = context
    const descriptor: Geo3dDatasetSource = context.source
    descriptor.resolveRelativeUrl('textures/example.png')
    if (context.format === 'copc' || context.format === 'las' || context.format === 'laz') {
      const points: PointCloud = context.entity
      points.pointSize = 0
      points.subdivisionThreshold = 2
      points.pointBudget = 100000
      points.pointBudget = null
      points.decimation = 2
      points.opacity = 0.8
      points.clippingPlanes = planes
      points.setColoringMode('attribute')
      points.getSupportedAttributes()
      points.setActiveAttribute('Intensity')
      points.getActiveAttributes()
      const colorMap = points.getAttributeColorMap('Intensity')
      colorMap.min = 0
      colorMap.max = 65535
      points.setAttributeColorMap('Intensity', colorMap)
      const classifications = points.getAttributeClassifications('Classification')
      classifications[2].visible = true
      points.brightness = 0
      points.contrast = 1
      points.saturation = 1
      const source: COPCSourceModule.default | LASSourceModule.default = context.nativeSource
      source.filters = [{ dimension: 'Intensity', operator: 'greaterequal', value: 0 }]
      source.getMetadata()
      source.getHierarchy()
      void [source.progress, source.loading, points.progress, points.loading, points.source]
      const noLayer: null = context.colorLayer
      void noLayer
      // @ts-expect-error Public property types are not erased.
      points.opacity = 'opaque'
      // @ts-expect-error A point cloud is not a raster map.
      const map: GiroMap = context.entity
      // @ts-expect-error A point source has no raster channels.
      context.nativeSource.channels = [0]
      void map
    } else if (context.format === 'geotiff' || context.format === 'cog') {
      const map: GiroMap = context.entity
      const raster: GeoTIFFSourceModule.default = context.nativeSource
      const layer: ColorLayerModule.default = context.colorLayer
      map.opacity = 0.7
      map.clippingPlanes = planes
      map.getLayers().forEach(layer => { void layer.source })
      raster.channels = [2, 1, 0]
      raster.getExtent()
      raster.getCrs()
      layer.opacity = 0.5
      layer.brightness = 0.1
      layer.contrast = 1.2
      layer.saturation = 0.8
      map.addLayer(hostColor)
      map.removeLayer(hostColor, { disposeLayer: false })
      map.addLayer(hostElevation)
      void map.getElevation
      // Use the peer's named option interfaces in both resolution modes. Its
      // CommonJS package identity makes typeof default a namespace in NodeNext.
      const colorOptions: ColorLayerModule.ColorLayerOptions = {
        source: raster, noDataOptions: { replaceNoData: false },
      }
      const elevationOptions: ElevationLayerModule.ElevationLayerOptions = {
        source: raster, noDataOptions: { replaceNoData: false }, minmax: { min: 0, max: 1000 },
      }
      void [colorOptions, elevationOptions, map.progress, map.loading]
      // @ts-expect-error Raster maps are not point-cloud entities.
      const points: PointCloud = context.entity
      // @ts-expect-error Raster channels retain their real public type.
      raster.channels = 'rgb'
      // @ts-expect-error The owned reference may be configured, not replaced.
      context.nativeSource = raster
      void points
    } else if (context.format === '3d-tiles' || context.format === '3tz') {
      const tiles: Tiles3D = context.entity
      tiles.opacity = 0.9
      tiles.errorTarget = 8
      tiles.pointSize = 3
      tiles.clippingPlanes = planes
      tiles.pointCloudMode = tiles.pointCloudMode
      tiles.pointCloudColor = '#88aacc'
      tiles.pointCloudColorimetryOptions = { brightness: 0, contrast: 1, saturation: 1 }
      tiles.pointCloudClassifications[2].visible = true
      tiles.getLayers()
      void [tiles.colorMap, tiles.tiles, tiles.progress, tiles.loading]
      const noSource: null = context.nativeSource
      void noSource
    } else if (context.format === 'cityjson') {
      const group: Group = context.entity
      group.visible = true
      void group.children
    }
    if (context.format === 'copc') {
      const copc: COPCSourceModule.default = context.nativeSource
      const tag: 'COPCSource' = copc.type
      void tag
    }
    instance.notifyChange(context.entity)
    context.fitToDataset()
    return async () => { /* Asynchronous host-owned cleanup is supported. */ }
  },
  onExtensionError(error) {
    const original: unknown = error
    void original
  },
})

declare const viewer: Geo3dViewerInstance
if (viewer.format === 'cog' || viewer.format === 'geotiff') {
  const map: GiroMap = viewer.entity
  map.getLayers()
  viewer.nativeSource.channels = [0]
  viewer.colorLayer.opacity = 1
}
const unmount: Promise<void> = viewer.unmount()
void unmount

createGeo3dRenderer({ giro3d: { sources: { copc: {
  // @ts-expect-error Worker paths are adapter-owned, not source pass-through options.
  workerUrl: 'https://untrusted.invalid/worker.js',
} } } })
createGeo3dRenderer({ giro3d: { instance: {
  // @ts-expect-error The public hook does not widen the data-only constructor options.
  arbitraryConstructorOption: true,
} } })
