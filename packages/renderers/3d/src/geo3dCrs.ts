import type * as CoordinateSystemModule from '@giro3d/giro3d/core/geographic/CoordinateSystem.js'
type CoordinateSystem = CoordinateSystemModule.default
export type Geo3dCrsInput = `EPSG:${number}` | { id: string; definition: string }
class UnknownGeo3dCrsError extends Error {}
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
  const { offlineEpsgDefinition } = await import('./geo3dCrsCatalog.js')
  const definition = offlineEpsgDefinition(input)
  if (definition) return CRS.register(input, definition, { throwIfFailedToRegisterWithProj: true })
  throw new UnknownGeo3dCrsError(`Unknown Geo3D CRS ${input}. Register its offline definition with crsDefinitions; coordinates are not silently relabelled.`)
}

/** Explicit source CRS is a fallback for unresolved LAS, never a metadata override. */
export async function resolveLasSourceCrs(
  native: CoordinateSystem | undefined,
  inspected: { crs?: string; hasCrsMetadata: boolean },
  input?: Geo3dCrsInput
): Promise<CoordinateSystem | undefined> {
  const known = native && !native.isUnknown() ? native : undefined
  if (input !== undefined) {
    const id = typeof input === 'string' ? input : input?.id
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid explicit LAS source CRS.')
    if ((known && known.id !== id) || (inspected.crs && inspected.crs !== id))
      throw new Error('Explicit LAS source CRS conflicts with dataset CRS metadata; it is a fallback, not an override.')
    // An already resolved file definition remains authoritative. In particular,
    // do not re-register a different supplied definition under its existing ID.
    if (known) return known
    // Resolve the authority first, including built-in UTM definitions that have
    // not been registered yet. A matching ID alone does not validate user text.
    try {
      return await resolveGeo3dCrs(inspected.crs ?? id)
    } catch (error) {
      if (!(error instanceof UnknownGeo3dCrsError)) throw error
    }
    const explicit = await resolveGeo3dCrs(input)
    if (explicit.isUnknown()) throw new Error('Explicit LAS source CRS must have a resolvable definition.')
    return explicit
  }
  if (known) return known
  if (inspected.crs) return resolveGeo3dCrs(inspected.crs)
  if (inspected.hasCrsMetadata)
    throw new Error('LAS CRS metadata cannot be resolved. Add an authoritative EPSG GeoKey or WKT definition before loading, or explicitly configure giro3d.sources.las.sourceCrs from a verified source; coordinates are not silently relabelled.')
  return native
}
