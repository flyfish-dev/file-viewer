import { inspectEmbeddedRaster, type EmbeddedRasterInfo } from './xdImage.js'
import {
  DEFAULT_XD_ZIP_LIMITS,
  extractXdZipEntry,
  inspectXdZipCentralDirectory,
  resolveXdZipLimits,
  type XdZipDirectory,
  type XdZipEntry,
  type XdZipLimits,
} from './xdZip.js'

export interface XdContainerLimits extends XdZipLimits {
  maxManifestBytes: number
  maxStructureFileBytes: number
  maxStructureTotalBytes: number
  maxStructureFiles: number
  maxJsonNodes: number
  maxJsonDepth: number
  maxJsonStringBytes: number
  maxPreviewCandidates: number
  maxPreviewBytes: number
  maxPreviewTotalBytes: number
  maxPreviewDimension: number
  maxPreviewPixels: number
  maxReportedResources: number
  maxReportedArtboards: number
}

export const DEFAULT_XD_CONTAINER_LIMITS: Readonly<XdContainerLimits> = Object.freeze({
  ...DEFAULT_XD_ZIP_LIMITS,
  maxManifestBytes: 2 * 1024 * 1024,
  maxStructureFileBytes: 8 * 1024 * 1024,
  maxStructureTotalBytes: 32 * 1024 * 1024,
  maxStructureFiles: 128,
  maxJsonNodes: 100_000,
  maxJsonDepth: 96,
  maxJsonStringBytes: 8 * 1024 * 1024,
  maxPreviewCandidates: 32,
  maxPreviewBytes: 24 * 1024 * 1024,
  maxPreviewTotalBytes: 64 * 1024 * 1024,
  maxPreviewDimension: 16_384,
  maxPreviewPixels: 64_000_000,
  maxReportedResources: 512,
  maxReportedArtboards: 512,
})

export interface XdEmbeddedPreview extends EmbeddedRasterInfo {
  path: string
  relation: 'preview' | 'rendition' | 'thumbnail' | 'known-path'
  bytes: Uint8Array
}

export interface XdArtboardSummary {
  id: string
  name: string
  width?: number
  height?: number
  path?: string
  nodeCount?: number
  topLevelLayers?: readonly string[]
}

export interface XdResourceSummary {
  path: string
  byteLength: number
  kind: string
}

export interface XdStructureFileSummary {
  path: string
  byteLength: number
  nodeCount: number
  topLevelLayers: readonly string[]
  typeCounts: Readonly<Record<string, number>>
}

export interface XdDocumentPreview {
  format: 'xd'
  mimeType: string
  name: string
  manifestVersion: string
  entryCount: number
  expandedBytes: number
  preview?: XdEmbeddedPreview
  artboards: readonly XdArtboardSummary[]
  resources: readonly XdResourceSummary[]
  structureFiles: readonly XdStructureFileSummary[]
  warnings: readonly string[]
}

type JsonRecord = Record<string, unknown>

interface ManifestComponentReference {
  path: string
  rel: string
  type: string
  width?: number
  height?: number
}

interface PreviewCandidate extends ManifestComponentReference {
  relation: XdEmbeddedPreview['relation']
}

const positiveInteger = (value: number | undefined, fallback: number) => {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

export const resolveXdContainerLimits = (overrides?: Partial<XdContainerLimits>): XdContainerLimits => ({
  ...resolveXdZipLimits(overrides),
  maxManifestBytes: positiveInteger(overrides?.maxManifestBytes, DEFAULT_XD_CONTAINER_LIMITS.maxManifestBytes),
  maxStructureFileBytes: positiveInteger(
    overrides?.maxStructureFileBytes,
    DEFAULT_XD_CONTAINER_LIMITS.maxStructureFileBytes
  ),
  maxStructureTotalBytes: positiveInteger(
    overrides?.maxStructureTotalBytes,
    DEFAULT_XD_CONTAINER_LIMITS.maxStructureTotalBytes
  ),
  maxStructureFiles: positiveInteger(overrides?.maxStructureFiles, DEFAULT_XD_CONTAINER_LIMITS.maxStructureFiles),
  maxJsonNodes: positiveInteger(overrides?.maxJsonNodes, DEFAULT_XD_CONTAINER_LIMITS.maxJsonNodes),
  maxJsonDepth: positiveInteger(overrides?.maxJsonDepth, DEFAULT_XD_CONTAINER_LIMITS.maxJsonDepth),
  maxJsonStringBytes: positiveInteger(
    overrides?.maxJsonStringBytes,
    DEFAULT_XD_CONTAINER_LIMITS.maxJsonStringBytes
  ),
  maxPreviewCandidates: positiveInteger(
    overrides?.maxPreviewCandidates,
    DEFAULT_XD_CONTAINER_LIMITS.maxPreviewCandidates
  ),
  maxPreviewBytes: positiveInteger(overrides?.maxPreviewBytes, DEFAULT_XD_CONTAINER_LIMITS.maxPreviewBytes),
  maxPreviewTotalBytes: positiveInteger(
    overrides?.maxPreviewTotalBytes,
    DEFAULT_XD_CONTAINER_LIMITS.maxPreviewTotalBytes
  ),
  maxPreviewDimension: positiveInteger(
    overrides?.maxPreviewDimension,
    DEFAULT_XD_CONTAINER_LIMITS.maxPreviewDimension
  ),
  maxPreviewPixels: positiveInteger(overrides?.maxPreviewPixels, DEFAULT_XD_CONTAINER_LIMITS.maxPreviewPixels),
  maxReportedResources: positiveInteger(
    overrides?.maxReportedResources,
    DEFAULT_XD_CONTAINER_LIMITS.maxReportedResources
  ),
  maxReportedArtboards: positiveInteger(
    overrides?.maxReportedArtboards,
    DEFAULT_XD_CONTAINER_LIMITS.maxReportedArtboards
  ),
})

const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const asFiniteNumber = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number.NaN
  return Number.isFinite(number) ? number : undefined
}

const validateJsonBudget = (root: unknown, limits: XdContainerLimits, label: string) => {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }]
  let nodes = 0
  let stringBytes = 0
  while (stack.length > 0) {
    const current = stack.pop()!
    nodes += 1
    if (nodes > limits.maxJsonNodes) throw new Error(`${label} exceeds the ${limits.maxJsonNodes}-node JSON limit.`)
    if (current.depth > limits.maxJsonDepth) throw new Error(`${label} exceeds the ${limits.maxJsonDepth}-level JSON limit.`)
    if (typeof current.value === 'string') {
      stringBytes += new TextEncoder().encode(current.value).byteLength
      if (stringBytes > limits.maxJsonStringBytes) {
        throw new Error(`${label} exceeds the ${limits.maxJsonStringBytes}-byte JSON string limit.`)
      }
    } else if (Array.isArray(current.value)) {
      for (const value of current.value) stack.push({ value, depth: current.depth + 1 })
    } else if (isRecord(current.value)) {
      for (const [key, value] of Object.entries(current.value)) {
        stringBytes += new TextEncoder().encode(key).byteLength
        stack.push({ value, depth: current.depth + 1 })
      }
    }
  }
}

const parseJsonBytes = (bytes: Uint8Array, limits: XdContainerLimits, label: string) => {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error(`${label} is not valid UTF-8.`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`${label} is not valid JSON.`)
  }
  validateJsonBudget(parsed, limits, label)
  return parsed
}

const normalizeRelativePath = (path: string) => {
  if (!path || path.includes('\0') || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) return
  const segments = path.split('/').filter((segment, index, all) => index !== all.length - 1 || segment !== '')
  if (segments.length === 0 || segments.some(segment => !segment || segment === '.' || segment === '..')) return
  return segments.join('/')
}

const joinManifestPath = (base: string, path: string) => {
  const normalized = normalizeRelativePath(path)
  if (!normalized) return
  return base ? `${base}/${normalized}` : normalized
}

const collectManifestReferences = (manifest: JsonRecord, warnings: string[]) => {
  const references: ManifestComponentReference[] = []
  const walk = (node: JsonRecord, base: string, depth: number) => {
    if (depth > 96) return
    let currentBase = base
    if (typeof node.path === 'string') {
      const resolved = joinManifestPath(base, node.path)
      if (!resolved) warnings.push(`Ignored unsafe XD manifest node path ${JSON.stringify(node.path)}.`)
      else currentBase = resolved
    }
    if (Array.isArray(node.components)) {
      for (const value of node.components) {
        if (!isRecord(value) || typeof value.path !== 'string') continue
        const resolved = joinManifestPath(currentBase, value.path)
        if (!resolved) {
          warnings.push(`Ignored unsafe XD manifest component path ${JSON.stringify(value.path)}.`)
          continue
        }
        references.push({
          path: resolved,
          rel: typeof value.rel === 'string' ? value.rel.toLowerCase() : '',
          type: typeof value.type === 'string' ? value.type.toLowerCase() : '',
          width: asFiniteNumber(value.width),
          height: asFiniteNumber(value.height),
        })
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) if (isRecord(child)) walk(child, currentBase, depth + 1)
    }
  }
  walk(manifest, '', 0)
  return references
}

const previewRelation = (rel: string): XdEmbeddedPreview['relation'] | undefined => {
  if (rel === 'preview' || rel === 'rendition' || rel === 'thumbnail') return rel
}

const inferImageMime = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase()
  return extension === 'png' ? 'image/png' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : ''
}

const collectPreviewCandidates = (
  directory: XdZipDirectory,
  references: readonly ManifestComponentReference[],
  limits: XdContainerLimits
) => {
  const byPath = new Map<string, PreviewCandidate>()
  for (const reference of references) {
    const relation = previewRelation(reference.rel)
    if (!relation || (reference.type !== 'image/png' && reference.type !== 'image/jpeg')) continue
    const entry = directory.entryByName.get(reference.path)
    if (!entry || entry.directory || entry.uncompressedSize > limits.maxPreviewBytes) continue
    byPath.set(reference.path, { ...reference, relation })
  }
  for (const entry of directory.entries) {
    if (entry.directory || entry.uncompressedSize > limits.maxPreviewBytes || byPath.has(entry.name)) continue
    if (
      entry.name !== 'preview.png' &&
      entry.name !== 'thumbnail.png' &&
      !/^renditions\/[A-Za-z0-9._/-]+\.(?:png|jpe?g)$/i.test(entry.name)
    ) continue
    const type = inferImageMime(entry.name)
    if (type) byPath.set(entry.name, { path: entry.name, rel: '', type, relation: 'known-path' })
  }
  const relationRank: Readonly<Record<XdEmbeddedPreview['relation'], number>> = {
    preview: 4,
    rendition: 3,
    thumbnail: 2,
    'known-path': 1,
  }
  return [...byPath.values()]
    .sort((left, right) => {
      const leftArea = (left.width || 0) * (left.height || 0)
      const rightArea = (right.width || 0) * (right.height || 0)
      return rightArea - leftArea || relationRank[right.relation] - relationRank[left.relation] || left.path.localeCompare(right.path)
    })
    .slice(0, limits.maxPreviewCandidates)
}

const extractBestPreview = async (
  buffer: ArrayBuffer,
  directory: XdZipDirectory,
  candidates: readonly PreviewCandidate[],
  limits: XdContainerLimits,
  warnings: string[]
) => {
  let selected: XdEmbeddedPreview | undefined
  let extractedBytes = 0
  for (const candidate of candidates) {
    const entry = directory.entryByName.get(candidate.path)
    if (!entry) continue
    if (extractedBytes + entry.uncompressedSize > limits.maxPreviewTotalBytes) {
      warnings.push('Stopped reading XD preview candidates at the aggregate preview byte limit.')
      break
    }
    extractedBytes += entry.uncompressedSize
    try {
      const bytes = await extractXdZipEntry(buffer, directory, candidate.path, limits.maxPreviewBytes)
      const info = inspectEmbeddedRaster(bytes, candidate.type, {
        maxBytes: limits.maxPreviewBytes,
        maxDimension: limits.maxPreviewDimension,
        maxPixels: limits.maxPreviewPixels,
      })
      const preview: XdEmbeddedPreview = { ...info, path: candidate.path, relation: candidate.relation, bytes }
      const selectedArea = selected ? selected.width * selected.height : -1
      if (info.width * info.height > selectedArea) selected = preview
    } catch (error) {
      warnings.push(
        `Skipped XD preview ${JSON.stringify(candidate.path)}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return selected
}

const STRUCTURE_PATH = /^artwork\/(?:pasteboard|artboard-[A-Za-z0-9_-]{1,128})\/graphics\/graphicContent\.agc$/

const summarizeAgc = (path: string, entry: XdZipEntry, value: unknown): XdStructureFileSummary => {
  const record = isRecord(value) ? value : {}
  const roots = Array.isArray(record.children) ? record.children : []
  const stack = [...roots]
  const topLevelLayers = roots
    .filter(isRecord)
    .map(node => (typeof node.name === 'string' && node.name.trim()) || (typeof node.type === 'string' && node.type) || 'Unnamed')
    .slice(0, 64)
  const typeCounts: Record<string, number> = {}
  let nodeCount = 0
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    nodeCount += 1
    const type = typeof node.type === 'string' && node.type ? node.type : 'unknown'
    typeCounts[type] = (typeCounts[type] || 0) + 1
    if (Array.isArray(node.children)) stack.push(...node.children)
  }
  return { path, byteLength: entry.uncompressedSize, nodeCount, topLevelLayers, typeCounts }
}

const resourceKind = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return 'image'
  if (['agc', 'json'].includes(extension)) return 'structured-data'
  if (['ttf', 'otf', 'woff', 'woff2'].includes(extension)) return 'font'
  return extension || 'binary'
}

const extractArtboardMetadata = (value: unknown, limits: XdContainerLimits) => {
  if (!isRecord(value) || !isRecord(value.artboards)) return [] as XdArtboardSummary[]
  const output: XdArtboardSummary[] = []
  for (const [id, metadata] of Object.entries(value.artboards)) {
    if (id === 'href' || !isRecord(metadata) || output.length >= limits.maxReportedArtboards) continue
    output.push({
      id,
      name: typeof metadata.name === 'string' && metadata.name.trim() ? metadata.name : id,
      width: asFiniteNumber(metadata.width),
      height: asFiniteNumber(metadata.height),
    })
  }
  return output
}

export const inspectXdContainerDirectory = (
  buffer: ArrayBuffer,
  overrides?: Partial<XdContainerLimits>
) => inspectXdZipCentralDirectory(buffer, resolveXdContainerLimits(overrides))

export const readXdContainer = async (
  buffer: ArrayBuffer,
  overrides?: Partial<XdContainerLimits>
): Promise<XdDocumentPreview> => {
  const limits = resolveXdContainerLimits(overrides)
  const directory = inspectXdZipCentralDirectory(buffer, limits)
  const mimetypeEntry = directory.entryByName.get('mimetype')
  const manifestEntry = directory.entryByName.get('manifest')
  if (!mimetypeEntry || mimetypeEntry.directory || mimetypeEntry.uncompressedSize > 128) {
    throw new Error('XD UCF container has no bounded root mimetype entry.')
  }
  if (!manifestEntry || manifestEntry.directory || manifestEntry.uncompressedSize > limits.maxManifestBytes) {
    throw new Error('XD UCF container has no bounded root manifest entry.')
  }
  const mimetypeBytes = await extractXdZipEntry(buffer, directory, 'mimetype', 128)
  const mimeType = new TextDecoder('utf-8', { fatal: true }).decode(mimetypeBytes).trim()
  if (mimeType !== 'application/vnd.adobe.sparkler.project+dcxucf') {
    throw new Error(`XD UCF container declares unexpected mimetype ${JSON.stringify(mimeType)}.`)
  }
  const manifestBytes = await extractXdZipEntry(buffer, directory, 'manifest', limits.maxManifestBytes)
  const manifestValue = parseJsonBytes(manifestBytes, limits, 'XD manifest')
  if (!isRecord(manifestValue)) throw new Error('XD manifest root must be a JSON object.')
  const warnings: string[] = []
  const references = collectManifestReferences(manifestValue, warnings)
  const preview = await extractBestPreview(
    buffer,
    directory,
    collectPreviewCandidates(directory, references, limits),
    limits,
    warnings
  )

  const structureEntries = directory.entries.filter(entry =>
    !entry.directory && (entry.name === 'resources/graphics/graphicContent.agc' || STRUCTURE_PATH.test(entry.name))
  )
  if (structureEntries.length > limits.maxStructureFiles) {
    warnings.push(`XD contains ${structureEntries.length} structure files; only the first ${limits.maxStructureFiles} are read.`)
  }
  const selectedStructureEntries = structureEntries.slice(0, limits.maxStructureFiles)
  const structureFiles: XdStructureFileSummary[] = []
  const artboardMap = new Map<string, XdArtboardSummary>()
  let structureBytes = 0
  for (const entry of selectedStructureEntries) {
    if (entry.uncompressedSize > limits.maxStructureFileBytes) {
      warnings.push(`Skipped oversized XD structure file ${JSON.stringify(entry.name)}.`)
      continue
    }
    if (structureBytes + entry.uncompressedSize > limits.maxStructureTotalBytes) {
      warnings.push('Stopped reading XD structure files at the aggregate structure byte limit.')
      break
    }
    structureBytes += entry.uncompressedSize
    try {
      const bytes = await extractXdZipEntry(buffer, directory, entry.name, limits.maxStructureFileBytes)
      const parsed = parseJsonBytes(bytes, limits, `XD structure ${entry.name}`)
      const summary = summarizeAgc(entry.name, entry, parsed)
      structureFiles.push(summary)
      if (entry.name === 'resources/graphics/graphicContent.agc') {
        for (const artboard of extractArtboardMetadata(parsed, limits)) {
          const current = artboardMap.get(artboard.id)
          artboardMap.set(artboard.id, { ...current, ...artboard })
        }
      } else {
        const matchedId = /artwork\/artboard-([^/]+)\//.exec(entry.name)?.[1]
        if (matchedId) {
          const current = artboardMap.get(matchedId)
          artboardMap.set(matchedId, {
            id: matchedId,
            name: current?.name || summary.topLevelLayers[0] || matchedId,
            width: current?.width,
            height: current?.height,
            path: entry.name,
            nodeCount: summary.nodeCount,
            topLevelLayers: summary.topLevelLayers,
          })
        }
      }
    } catch (error) {
      warnings.push(
        `Skipped XD structure ${JSON.stringify(entry.name)}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const resources = directory.entries
    .filter(entry => !entry.directory && entry.name.startsWith('resources/') && entry.name !== 'resources/graphics/graphicContent.agc')
    .slice(0, limits.maxReportedResources)
    .map(entry => ({ path: entry.name, byteLength: entry.uncompressedSize, kind: resourceKind(entry.name) }))
  const resourceCount = directory.entries.filter(entry => !entry.directory && entry.name.startsWith('resources/')).length
  if (resourceCount > limits.maxReportedResources) {
    warnings.push(`XD contains ${resourceCount} resource entries; ${limits.maxReportedResources} are listed.`)
  }
  if (!preview) warnings.push('No valid embedded PNG/JPEG preview was found at a manifest or rendition path.')

  return {
    format: 'xd',
    mimeType,
    name: typeof manifestValue.name === 'string' && manifestValue.name.trim() ? manifestValue.name : 'Adobe XD document',
    manifestVersion: String(manifestValue['manifest-format-version'] ?? manifestValue['uxdesign#version'] ?? 'unknown'),
    entryCount: directory.entries.length,
    expandedBytes: directory.totalUncompressedBytes,
    preview,
    artboards: [...artboardMap.values()].slice(0, limits.maxReportedArtboards),
    resources,
    structureFiles,
    warnings,
  }
}
