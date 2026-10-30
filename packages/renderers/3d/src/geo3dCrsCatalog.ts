import catalog from 'epsg-index/all.json' with { type: 'json' }
import { crsAliases } from './geo3dCrsAliases.generated.js'

type Entry = (typeof catalog)[string]
const normalize = (name: string) => name.normalize('NFKC').toLowerCase().replace(/\s+/g, '').trim()
const names = new Map<string, Set<string>>()
const add = (name: string, code: string) => {
  const key = normalize(name)
  if (!names.has(key)) names.set(key, new Set())
  names.get(key)!.add(code)
}
for (const entry of Object.values(catalog)) add(entry.name, entry.code)
for (const [kind, code, name] of crsAliases) {
  const entry = catalog[code]
  if (entry && (kind !== 'projected_crs' || entry.kind === 'CRS-PROJCRS')) add(name, code)
}

export function offlineEpsgDefinition(id: string): string | undefined {
  const entry = /^EPSG:(\d+)$/.exec(id)
  const definition = entry ? catalog[entry[1]!]?.proj4 || catalog[entry[1]!]?.wkt : undefined
  if (definition && /\+nadgrids=(?!@?null(?:\s|$))/.test(definition))
    throw new Error(`Geo3D CRS ${id} requires its offline datum grids; register the complete verified definition before loading.`)
  return definition
}

/** Exact authority names/aliases only; never substring guesses or registry I/O. */
export function resolveCitedCrs(citation: string, model?: number, units?: number): string | undefined {
  const expectedKind = model === 1 ? 'CRS-PROJCRS' : model === 2 ? 'CRS-GEOGCRS' : model === 3 ? 'CRS-GCENCRS' : undefined
  if (model !== undefined && !expectedKind) return undefined
  const candidates = new Map<string, Entry>()
  for (const name of [citation, ...citation.split(/[,|\0]/)]) {
    const authority = /^(?:EPSG\s*:\s*|urn:ogc:def:crs:EPSG::|https?:\/\/www\.opengis\.net\/def\/crs\/EPSG\/0\/)(\d+)$/i.exec(name.trim())
    for (const code of authority ? [authority[1]!] : names.get(normalize(name)) || []) {
      if (!catalog[code]) continue
      const entry = catalog[code]!
      if (!expectedKind || entry.kind === expectedKind) candidates.set(code, entry)
    }
  }
  if (candidates.size > 1) throw new Error('Conflicting or ambiguous LAS CRS citation names.')
  const entry = [...candidates.values()][0]
  if (!entry) return undefined
  if (entry.kind === 'CRS-PROJCRS' && units !== undefined) {
    const unit = ({9001: 'metre', 9002: 'foot', 9003: 'US survey foot'} as Record<number, string>)[units]
    if (!unit || entry.unit !== unit) throw new Error('LAS CRS citation conflicts with its declared linear units.')
  }
  return `EPSG:${entry.code}`
}
