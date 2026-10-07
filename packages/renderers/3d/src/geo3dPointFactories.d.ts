import type LASSource from '@giro3d/giro3d/sources/LASSource.js'
import type COPCSource from '@giro3d/giro3d/sources/COPCSource.js'
import type * as PointCloudModule from '@giro3d/giro3d/entities/PointCloud.js'
import type { Geo3dLasWorkers } from './geo3dLasWorkers.js'
// Implementations are derived and bundled by build-geo3d-point-adapters.mjs.
export function createLASSource(workers: Geo3dLasWorkers, options: ConstructorParameters<typeof LASSource>[0]): LASSource
export function createCOPCSource(workers: Geo3dLasWorkers, options: ConstructorParameters<typeof COPCSource>[0]): COPCSource
export function createOwnedPointCloud(options: ConstructorParameters<typeof PointCloudModule.default>[0]): { entity: PointCloudModule.default; stop(): void }
