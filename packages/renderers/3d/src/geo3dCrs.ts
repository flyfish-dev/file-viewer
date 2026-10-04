import type * as CoordinateSystemModule from '@giro3d/giro3d/core/geographic/CoordinateSystem.js'
type CoordinateSystem = CoordinateSystemModule.default
export type Geo3dCrsInput = `EPSG:${number}` | { id: string; definition: string }
/** Offline definitions only. No request to epsg.io or any other registry. */
export async function resolveGeo3dCrs(input?: Geo3dCrsInput | string, fallback?: CoordinateSystem): Promise<CoordinateSystem> {
  const { default: CRS } = await import('@giro3d/giro3d/core/geographic/CoordinateSystem.js')
  if (!input) return fallback || CRS.unknown
  if (typeof input === 'object') return CRS.register(input.id, input.definition, { throwIfFailedToRegisterWithProj: true })
  try { const known = CRS.get(input); if (known) return known } catch { /* Register a known WGS84 UTM CRS below. */ }
  const match = /^EPSG:(326|327)(\d{2})$/.exec(input)
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 60) {
    return CRS.register(input, `+proj=utm +zone=${Number(match[2])}${match[1] === '327' ? ' +south' : ''} +datum=WGS84 +units=m +no_defs`, { throwIfFailedToRegisterWithProj: true })
  }
  throw new Error(`Unknown Geo3D CRS ${input}. Register its offline definition with crsDefinitions; coordinates are not silently relabelled.`)
}
