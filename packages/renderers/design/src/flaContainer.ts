import { DOMParser as XmlDomParser } from '@xmldom/xmldom'
import { SaxesParser, type SaxesAttributePlain } from 'saxes'
import { inspectEmbeddedRaster } from './xdImage.js'
import {
  DEFAULT_FLA_ZIP_LIMITS,
  extractFlaZipEntry,
  inspectFlaZipCentralDirectory,
  resolveFlaZipLimits,
  type FlaZipDirectory,
  type FlaZipEntry,
  type FlaZipLimits,
} from './flaZip.js'

const XFL_NAMESPACE = 'http://ns.adobe.com/xfl/2008/'
const XFL_MIME = 'application/vnd.adobe.xfl'
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const
const MAX_REPORTED_WARNINGS = 128

export interface FlaContainerLimits extends FlaZipLimits {
  maxXmlFileBytes: number
  maxXmlTotalBytes: number
  maxXmlFiles: number
  maxXmlNodes: number
  maxXmlDepth: number
  maxXmlAttributes: number
  maxXmlTextBytes: number
  maxAttributeBytes: number
  maxXmlTotalNodes: number
  maxXmlTotalAttributes: number
  maxXmlTotalTextBytes: number
  maxXmlTotalAttributeBytes: number
  maxTimelines: number
  maxLayers: number
  maxFrames: number
  maxSymbols: number
  maxReportedResources: number
  maxPreviewElements: number
  maxPreviewPathCommands: number
  maxPreviewSvgBytes: number
  maxPreviewAssetBytes: number
  maxPreviewAssetTotalBytes: number
  maxPreviewDimension: number
  maxPreviewPixels: number
  maxSymbolDepth: number
}

export const DEFAULT_FLA_CONTAINER_LIMITS: Readonly<FlaContainerLimits> = Object.freeze({
  ...DEFAULT_FLA_ZIP_LIMITS,
  maxXmlFileBytes: 12 * 1024 * 1024,
  maxXmlTotalBytes: 48 * 1024 * 1024,
  maxXmlFiles: 512,
  maxXmlNodes: 250_000,
  maxXmlDepth: 128,
  maxXmlAttributes: 750_000,
  maxXmlTextBytes: 24 * 1024 * 1024,
  maxAttributeBytes: 2 * 1024 * 1024,
  maxXmlTotalNodes: 300_000,
  maxXmlTotalAttributes: 1_000_000,
  maxXmlTotalTextBytes: 32 * 1024 * 1024,
  maxXmlTotalAttributeBytes: 4 * 1024 * 1024,
  maxTimelines: 256,
  maxLayers: 20_000,
  maxFrames: 250_000,
  maxSymbols: 8_192,
  maxReportedResources: 2_048,
  maxPreviewElements: 10_000,
  maxPreviewPathCommands: 250_000,
  maxPreviewSvgBytes: 16 * 1024 * 1024,
  maxPreviewAssetBytes: 8 * 1024 * 1024,
  maxPreviewAssetTotalBytes: 32 * 1024 * 1024,
  maxPreviewDimension: 16_384,
  maxPreviewPixels: 64_000_000,
  maxSymbolDepth: 24,
})

type FlaXmlLimits = Pick<
  FlaContainerLimits,
  | 'maxXmlFileBytes'
  | 'maxXmlTotalBytes'
  | 'maxXmlFiles'
  | 'maxXmlNodes'
  | 'maxXmlDepth'
  | 'maxXmlAttributes'
  | 'maxXmlTextBytes'
  | 'maxAttributeBytes'
  | 'maxXmlTotalNodes'
  | 'maxXmlTotalAttributes'
  | 'maxXmlTotalTextBytes'
  | 'maxXmlTotalAttributeBytes'
>

/**
 * Trusted hosts may raise the normal XML budgets, but they cannot disable the
 * pre-DOM safety boundary with an arbitrarily large option value.
 */
export const HARD_FLA_XML_LIMITS: Readonly<FlaXmlLimits> = Object.freeze({
  maxXmlFileBytes: 24 * 1024 * 1024,
  maxXmlTotalBytes: 96 * 1024 * 1024,
  maxXmlFiles: 1_024,
  maxXmlNodes: 500_000,
  maxXmlDepth: 256,
  maxXmlAttributes: 1_000_000,
  maxXmlTextBytes: 24 * 1024 * 1024,
  maxAttributeBytes: 8 * 1024 * 1024,
  maxXmlTotalNodes: 500_000,
  maxXmlTotalAttributes: 1_500_000,
  maxXmlTotalTextBytes: 64 * 1024 * 1024,
  maxXmlTotalAttributeBytes: 8 * 1024 * 1024,
})

export interface FlaStageSummary {
  width: number
  height: number
  frameRate: number
  backgroundColor: string
  currentTimeline: number
}

export interface FlaElementCounts {
  shapes: number
  symbols: number
  bitmaps: number
  text: number
  groups: number
  other: number
}

export interface FlaLayerSummary {
  index: number
  name: string
  layerType: string
  visible: boolean
  locked: boolean
  parentLayerIndex?: number
  frameCount: number
  keyframeCount: number
  elements: FlaElementCounts
}

export interface FlaTimelineSummary {
  index: number
  name: string
  frameCount: number
  layers: readonly FlaLayerSummary[]
}

export interface FlaSymbolSummary {
  name: string
  href: string
  symbolType: string
  timelineName: string
  layerCount: number
  frameCount: number
}

export interface FlaResourceSummary {
  path: string
  byteLength: number
  kind: 'xml' | 'image' | 'audio' | 'video' | 'script' | 'metadata' | 'binary'
}

export interface FlaDocumentPreview {
  format: 'fla' | 'xfl'
  container: 'compressed-xfl' | 'single-xml-xfl'
  mimeType: typeof XFL_MIME
  name: string
  xflVersion: string
  creatorInfo: string
  entryCount: number
  expandedBytes: number
  stage: FlaStageSummary
  timelines: readonly FlaTimelineSummary[]
  symbols: readonly FlaSymbolSummary[]
  resources: readonly FlaResourceSummary[]
  previewSvg: string
  previewElementCount: number
  unsupportedPreviewElements: number
  warnings: readonly string[]
}

interface ParsedXml {
  path: string
  document: Document
  byteLength: number
  preflight: XmlPreflightCounts
}

interface XmlPreflightCounts {
  nodes: number
  maximumDepth: number
  attributes: number
  textBytes: number
  attributeBytes: number
}

interface XmlBudget {
  files: number
  bytes: number
  nodes: number
  attributes: number
  textBytes: number
  attributeBytes: number
}

interface Matrix {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}

interface BitmapPreview {
  name: string
  dataUrl: string
  width: number
  height: number
}

interface PreviewBudget {
  elements: number
  pathCommands: number
  unsupported: number
}

const positiveInteger = (value: number | undefined, fallback: number, hardMaximum = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && Number(value) > 0 ? Math.min(Number(value), hardMaximum) : fallback

export const resolveFlaContainerLimits = (overrides?: Partial<FlaContainerLimits>): FlaContainerLimits => ({
  ...resolveFlaZipLimits(overrides),
  maxXmlFileBytes: positiveInteger(
    overrides?.maxXmlFileBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlFileBytes,
    HARD_FLA_XML_LIMITS.maxXmlFileBytes
  ),
  maxXmlTotalBytes: positiveInteger(
    overrides?.maxXmlTotalBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlTotalBytes,
    HARD_FLA_XML_LIMITS.maxXmlTotalBytes
  ),
  maxXmlFiles: positiveInteger(
    overrides?.maxXmlFiles,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlFiles,
    HARD_FLA_XML_LIMITS.maxXmlFiles
  ),
  maxXmlNodes: positiveInteger(
    overrides?.maxXmlNodes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlNodes,
    HARD_FLA_XML_LIMITS.maxXmlNodes
  ),
  maxXmlDepth: positiveInteger(
    overrides?.maxXmlDepth,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlDepth,
    HARD_FLA_XML_LIMITS.maxXmlDepth
  ),
  maxXmlAttributes: positiveInteger(
    overrides?.maxXmlAttributes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlAttributes,
    HARD_FLA_XML_LIMITS.maxXmlAttributes
  ),
  maxXmlTextBytes: positiveInteger(
    overrides?.maxXmlTextBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlTextBytes,
    HARD_FLA_XML_LIMITS.maxXmlTextBytes
  ),
  maxAttributeBytes: positiveInteger(
    overrides?.maxAttributeBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxAttributeBytes,
    HARD_FLA_XML_LIMITS.maxAttributeBytes
  ),
  maxXmlTotalNodes: positiveInteger(
    overrides?.maxXmlTotalNodes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlTotalNodes,
    HARD_FLA_XML_LIMITS.maxXmlTotalNodes
  ),
  maxXmlTotalAttributes: positiveInteger(
    overrides?.maxXmlTotalAttributes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlTotalAttributes,
    HARD_FLA_XML_LIMITS.maxXmlTotalAttributes
  ),
  maxXmlTotalTextBytes: positiveInteger(
    overrides?.maxXmlTotalTextBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlTotalTextBytes,
    HARD_FLA_XML_LIMITS.maxXmlTotalTextBytes
  ),
  maxXmlTotalAttributeBytes: positiveInteger(
    overrides?.maxXmlTotalAttributeBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxXmlTotalAttributeBytes,
    HARD_FLA_XML_LIMITS.maxXmlTotalAttributeBytes
  ),
  maxTimelines: positiveInteger(overrides?.maxTimelines, DEFAULT_FLA_CONTAINER_LIMITS.maxTimelines),
  maxLayers: positiveInteger(overrides?.maxLayers, DEFAULT_FLA_CONTAINER_LIMITS.maxLayers),
  maxFrames: positiveInteger(overrides?.maxFrames, DEFAULT_FLA_CONTAINER_LIMITS.maxFrames),
  maxSymbols: positiveInteger(overrides?.maxSymbols, DEFAULT_FLA_CONTAINER_LIMITS.maxSymbols),
  maxReportedResources: positiveInteger(
    overrides?.maxReportedResources,
    DEFAULT_FLA_CONTAINER_LIMITS.maxReportedResources
  ),
  maxPreviewElements: positiveInteger(
    overrides?.maxPreviewElements,
    DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewElements
  ),
  maxPreviewPathCommands: positiveInteger(
    overrides?.maxPreviewPathCommands,
    DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewPathCommands
  ),
  maxPreviewSvgBytes: positiveInteger(
    overrides?.maxPreviewSvgBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewSvgBytes
  ),
  maxPreviewAssetBytes: positiveInteger(
    overrides?.maxPreviewAssetBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewAssetBytes
  ),
  maxPreviewAssetTotalBytes: positiveInteger(
    overrides?.maxPreviewAssetTotalBytes,
    DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewAssetTotalBytes
  ),
  maxPreviewDimension: positiveInteger(
    overrides?.maxPreviewDimension,
    DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewDimension
  ),
  maxPreviewPixels: positiveInteger(overrides?.maxPreviewPixels, DEFAULT_FLA_CONTAINER_LIMITS.maxPreviewPixels),
  maxSymbolDepth: positiveInteger(overrides?.maxSymbolDepth, DEFAULT_FLA_CONTAINER_LIMITS.maxSymbolDepth),
})

const localName = (node: Node) =>
  ((node as Node & { localName?: string }).localName || node.nodeName).split(':').pop()!.toLowerCase()

const elementChildren = (node: Node, name?: string) => Array.from(node.childNodes)
  .filter((child): child is Element => child.nodeType === 1)
  .filter(child => !name || localName(child) === name)

const descendants = (node: Node, name: string) => {
  const result: Element[] = []
  const stack = [...elementChildren(node)].reverse()
  while (stack.length > 0) {
    const current = stack.pop()!
    if (localName(current) === name) result.push(current)
    const children = elementChildren(current)
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index])
  }
  return result
}

const directContainerChildren = (node: Node, containerName: string, childName: string) => {
  const container = elementChildren(node, containerName)[0]
  return container ? elementChildren(container, childName) : []
}

const containerElements = (node: Node, containerName: string) => {
  const container = elementChildren(node, containerName)[0]
  return container ? elementChildren(container) : []
}

const boundedString = (value: string | null | undefined, fallback: string, max = 4_096) => {
  const normalized = (value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return normalized ? normalized.slice(0, max) : fallback
}

const finiteNumber = (value: string | null | undefined, fallback: number) => {
  if (value === null || value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const nonNegativeInteger = (value: string | null | undefined) => {
  if (value === null || value === undefined || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined
}

const booleanAttribute = (value: string | null, fallback: boolean) => {
  if (value === null || value === '') return fallback
  return value.toLowerCase() !== 'false' && value !== '0'
}

const safeColor = (value: string | null | undefined, fallback: string) => {
  const normalized = (value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback
}

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const appendWarning = (warnings: string[], message: string) => {
  if (warnings.includes(message)) return
  if (warnings.length < MAX_REPORTED_WARNINGS) {
    warnings.push(message)
  } else if (warnings.length === MAX_REPORTED_WARNINGS) {
    warnings.push(`Additional FLA/XFL warnings were omitted after ${MAX_REPORTED_WARNINGS} distinct messages.`)
  }
}

const isZip = (bytes: Uint8Array) =>
  bytes.byteLength >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04

const isLegacyBinaryFla = (bytes: Uint8Array) =>
  bytes.byteLength >= CFB_MAGIC.length && CFB_MAGIC.every((byte, index) => bytes[index] === byte)

const decodeUtf8 = (bytes: Uint8Array, label: string) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error(`${label} is not valid UTF-8.`)
  }
}

class FlaXmlPreflightError extends Error {
  readonly phase = 'pre-dom'

  constructor(message: string) {
    super(message)
    this.name = 'FlaXmlPreflightError'
  }
}

const failXmlPreflight = (message: string): never => {
  throw new FlaXmlPreflightError(message)
}

const createXmlBudget = (): XmlBudget => ({
  files: 0,
  bytes: 0,
  nodes: 0,
  attributes: 0,
  textBytes: 0,
  attributeBytes: 0,
})

const utf8ByteLength = (value: string) => {
  let bytes = 0
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x7f) bytes += 1
    else if (code <= 0x7ff) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4
        index += 1
      } else {
        bytes += 3
      }
    } else {
      bytes += 3
    }
  }
  return bytes
}

const preflightXmlBeforeDom = (
  source: string,
  limits: FlaContainerLimits,
  label: string
): XmlPreflightCounts => {
  let nodes = 1 // The Document node that DOMParser would allocate.
  let depth = 0
  let maximumDepth = 0
  let attributes = 0
  let textBytes = 0
  let attributeBytes = 0

  const countNode = () => {
    nodes += 1
    if (nodes > limits.maxXmlNodes) failXmlPreflight(`${label} exceeds the ${limits.maxXmlNodes}-node XML limit.`)
  }
  const countText = (text: string) => {
    countNode()
    textBytes += utf8ByteLength(text)
    if (textBytes > limits.maxXmlTextBytes) {
      failXmlPreflight(`${label} exceeds the ${limits.maxXmlTextBytes}-byte XML text limit.`)
    }
  }

  const parser = new SaxesParser({ xmlns: false, position: false, fileName: label })
  parser.on('error', error => { throw error })
  parser.on('doctype', () => failXmlPreflight(`${label} contains a forbidden DTD or ENTITY declaration.`))
  parser.on('processinginstruction', instruction => {
    if (instruction.target.toLowerCase() === 'xml-stylesheet') {
      failXmlPreflight(`${label} contains an external-capable XML stylesheet instruction.`)
    }
    countNode()
  })
  parser.on('opentagstart', () => {
    countNode()
    depth += 1
    maximumDepth = Math.max(maximumDepth, depth)
    if (depth > limits.maxXmlDepth) {
      failXmlPreflight(`${label} exceeds the ${limits.maxXmlDepth}-level XML limit.`)
    }
  })
  parser.on('attribute', (attribute: SaxesAttributePlain) => {
    attributes += 1
    if (attributes > limits.maxXmlAttributes) {
      failXmlPreflight(`${label} exceeds the ${limits.maxXmlAttributes}-attribute XML limit.`)
    }
    attributeBytes += utf8ByteLength(attribute.name) + utf8ByteLength(attribute.value)
    if (attributeBytes > limits.maxAttributeBytes) {
      failXmlPreflight(`${label} exceeds the ${limits.maxAttributeBytes}-byte XML attribute limit.`)
    }
  })
  parser.on('closetag', () => { depth = Math.max(0, depth - 1) })
  parser.on('text', countText)
  parser.on('cdata', countText)
  parser.on('comment', () => countNode())

  try {
    parser.write(source).close()
  } catch (error) {
    if (error instanceof FlaXmlPreflightError) throw error
    throw new Error(`${label} is not well-formed XML: ${error instanceof Error ? error.message : String(error)}`)
  }
  return { nodes, maximumDepth, attributes, textBytes, attributeBytes }
}

const requireXmlEnvelopeCapacity = (
  budget: XmlBudget,
  additionalBytes: number,
  limits: FlaContainerLimits,
  label: string
) => {
  if (budget.files + 1 > limits.maxXmlFiles) {
    failXmlPreflight(`${label} would exceed the aggregate ${limits.maxXmlFiles}-file XML limit.`)
  }
  if (budget.bytes + additionalBytes > limits.maxXmlTotalBytes) {
    failXmlPreflight(`${label} would exceed the aggregate ${limits.maxXmlTotalBytes}-byte XML source limit.`)
  }
}

const commitXmlBudget = (
  budget: XmlBudget,
  byteLength: number,
  preflight: XmlPreflightCounts,
  limits: FlaContainerLimits,
  label: string
) => {
  requireXmlEnvelopeCapacity(budget, byteLength, limits, label)
  const nextNodes = budget.nodes + preflight.nodes
  const nextAttributes = budget.attributes + preflight.attributes
  const nextTextBytes = budget.textBytes + preflight.textBytes
  const nextAttributeBytes = budget.attributeBytes + preflight.attributeBytes
  if (nextNodes > limits.maxXmlTotalNodes) {
    failXmlPreflight(`${label} would exceed the aggregate ${limits.maxXmlTotalNodes}-node XML limit.`)
  }
  if (nextAttributes > limits.maxXmlTotalAttributes) {
    failXmlPreflight(`${label} would exceed the aggregate ${limits.maxXmlTotalAttributes}-attribute XML limit.`)
  }
  if (nextTextBytes > limits.maxXmlTotalTextBytes) {
    failXmlPreflight(`${label} would exceed the aggregate ${limits.maxXmlTotalTextBytes}-byte XML text limit.`)
  }
  if (nextAttributeBytes > limits.maxXmlTotalAttributeBytes) {
    failXmlPreflight(
      `${label} would exceed the aggregate ${limits.maxXmlTotalAttributeBytes}-byte XML attribute limit.`
    )
  }
  budget.files += 1
  budget.bytes += byteLength
  budget.nodes = nextNodes
  budget.attributes = nextAttributes
  budget.textBytes = nextTextBytes
  budget.attributeBytes = nextAttributeBytes
}

const parseXmlBytes = (
  bytes: Uint8Array,
  path: string,
  limits: FlaContainerLimits,
  xmlBudget: XmlBudget
): ParsedXml => {
  if (bytes.byteLength === 0 || bytes.byteLength > limits.maxXmlFileBytes) {
    throw new Error(`${path} is outside the 1-${limits.maxXmlFileBytes} byte XML limit.`)
  }
  const source = decodeUtf8(bytes, path)
  const preflight = preflightXmlBeforeDom(source, limits, path)
  commitXmlBudget(xmlBudget, bytes.byteLength, preflight, limits, path)
  let document: Document
  try {
    document = new XmlDomParser({
      locator: false,
      onError: (level, message) => {
        throw new Error(`${level}: ${message}`)
      },
    }).parseFromString(source, 'application/xml') as unknown as Document
  } catch (error) {
    throw new Error(`${path} is not well-formed XML: ${error instanceof Error ? error.message : String(error)}`)
  }
  return { path, document, byteLength: bytes.byteLength, preflight }
}

const normalizedLibraryPath = (href: string) => {
  if (!href || href.includes('\0') || href.includes('\\') || href.startsWith('/') || /^[A-Za-z]:/.test(href)) return
  const segments = href.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) return
  return `LIBRARY/${segments.join('/')}`
}

const findEntry = (directory: FlaZipDirectory, name: string) => directory.entryByName.get(name)

const extractTextEntry = async (
  buffer: ArrayBuffer,
  directory: FlaZipDirectory,
  entry: FlaZipEntry,
  limits: FlaContainerLimits,
  xmlBudget: XmlBudget
) => {
  requireXmlEnvelopeCapacity(xmlBudget, entry.uncompressedSize, limits, entry.name)
  return parseXmlBytes(
    await extractFlaZipEntry(buffer, directory, entry.name, limits.maxXmlFileBytes),
    entry.name,
    limits,
    xmlBudget
  )
}

const classifyResource = (path: string): FlaResourceSummary['kind'] => {
  const normalized = path.toLowerCase()
  if (normalized.endsWith('.xml') || normalized.endsWith('.xfl')) return 'xml'
  if (/\.(?:png|jpe?g|gif|webp|bmp)$/.test(normalized)) return 'image'
  if (/\.(?:mp3|wav|aac|m4a|flac)$/.test(normalized)) return 'audio'
  if (/\.(?:mp4|m4v|mov|flv|webm)$/.test(normalized)) return 'video'
  if (/\.(?:as|js|html?|css)$/.test(normalized)) return 'script'
  if (normalized === 'mimetype' || normalized.startsWith('meta-inf/')) return 'metadata'
  return 'binary'
}

const emptyElementCounts = (): FlaElementCounts => ({
  shapes: 0,
  symbols: 0,
  bitmaps: 0,
  text: 0,
  groups: 0,
  other: 0,
})

const addElementCount = (counts: FlaElementCounts, name: string) => {
  if (name === 'domshape' || name === 'domrectangleobject' || name === 'domovalobject') counts.shapes += 1
  else if (name === 'domsymbolinstance') counts.symbols += 1
  else if (name === 'dombitmapinstance') counts.bitmaps += 1
  else if (name.includes('text')) counts.text += 1
  else if (name === 'domgroup') counts.groups += 1
  else counts.other += 1
}

const timelineElements = (root: Element) => {
  if (localName(root) === 'domdocument') return directContainerChildren(root, 'timelines', 'domtimeline')
  const timelineContainer = elementChildren(root, 'timeline')[0]
  return timelineContainer ? elementChildren(timelineContainer, 'domtimeline') : []
}

const summarizeTimelines = (
  root: Element,
  limits: FlaContainerLimits,
  counters: { timelines: number; layers: number; frames: number }
): FlaTimelineSummary[] => {
  const timelines = timelineElements(root)
  const summaries: FlaTimelineSummary[] = []
  for (const timeline of timelines) {
    counters.timelines += 1
    if (counters.timelines > limits.maxTimelines) {
      throw new Error(`FLA/XFL contains more than ${limits.maxTimelines} timelines.`)
    }
    const layers = directContainerChildren(timeline, 'layers', 'domlayer')
    const layerSummaries: FlaLayerSummary[] = []
    let timelineFrameCount = 1
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
      const layer = layers[layerIndex]
      counters.layers += 1
      if (counters.layers > limits.maxLayers) throw new Error(`FLA/XFL contains more than ${limits.maxLayers} layers.`)
      const frames = directContainerChildren(layer, 'frames', 'domframe')
      counters.frames += frames.length
      if (counters.frames > limits.maxFrames) throw new Error(`FLA/XFL contains more than ${limits.maxFrames} keyframes.`)
      const counts = emptyElementCounts()
      let layerFrameCount = 1
      for (const frame of frames) {
        const index = nonNegativeInteger(frame.getAttribute('index')) ?? 0
        const duration = Math.max(1, nonNegativeInteger(frame.getAttribute('duration')) ?? 1)
        layerFrameCount = Math.max(layerFrameCount, index + duration)
        for (const element of containerElements(frame, 'elements')) {
          addElementCount(counts, localName(element))
        }
      }
      timelineFrameCount = Math.max(timelineFrameCount, layerFrameCount)
      const parentLayerIndex = nonNegativeInteger(layer.getAttribute('parentLayerIndex'))
      layerSummaries.push({
        index: layerIndex,
        name: boundedString(layer.getAttribute('name'), `Layer ${layerIndex + 1}`, 512),
        layerType: boundedString(layer.getAttribute('layerType'), 'normal', 64).toLowerCase(),
        visible: booleanAttribute(layer.getAttribute('visible'), true),
        locked: booleanAttribute(layer.getAttribute('locked'), false),
        ...(parentLayerIndex === undefined ? {} : { parentLayerIndex }),
        frameCount: layerFrameCount,
        keyframeCount: frames.length,
        elements: counts,
      })
    }
    summaries.push({
      index: summaries.length,
      name: boundedString(timeline.getAttribute('name'), `Timeline ${summaries.length + 1}`, 512),
      frameCount: timelineFrameCount,
      layers: layerSummaries,
    })
  }
  return summaries
}

const parseMatrix = (element: Element): Matrix => {
  const container = elementChildren(element, 'matrix')[0]
  const matrix = container ? elementChildren(container, 'matrix')[0] : undefined
  return {
    a: finiteNumber(matrix?.getAttribute('a'), 1),
    b: finiteNumber(matrix?.getAttribute('b'), 0),
    c: finiteNumber(matrix?.getAttribute('c'), 0),
    d: finiteNumber(matrix?.getAttribute('d'), 1),
    tx: finiteNumber(matrix?.getAttribute('tx'), 0),
    ty: finiteNumber(matrix?.getAttribute('ty'), 0),
  }
}

const matrixAttribute = (matrix: Matrix) =>
  `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.tx} ${matrix.ty})`

const decodeEdgeCoordinate = (token: string) => {
  if (!token.startsWith('#')) {
    const parsed = Number(token)
    return Number.isFinite(parsed) ? parsed / 20 : undefined
  }
  const raw = token.slice(1)
  const [integerHex = '0', fractionHex = ''] = raw.split('.', 2)
  if (!/^[0-9a-f]+$/i.test(integerHex) || fractionHex && !/^[0-9a-f]+$/i.test(fractionHex)) return
  let integer = Number.parseInt(integerHex, 16)
  if (!Number.isSafeInteger(integer)) return
  if (integerHex.length >= 6) {
    const bits = integerHex.length * 4
    const signThreshold = 2 ** (bits - 1)
    if (integer >= signThreshold) integer -= 2 ** bits
  }
  const fraction = fractionHex ? Number.parseInt(fractionHex, 16) / 16 ** fractionHex.length : 0
  return (integer < 0 ? integer - fraction : integer + fraction) / 20
}

const edgeTokens = (source: string) =>
  source.match(/[!|\[\/]|#[0-9a-f]+(?:\.[0-9a-f]+)?|[-+]?(?:\d+(?:\.\d*)?|\.\d+)/gi) || []

const edgePath = (source: string, budget: PreviewBudget, limits: FlaContainerLimits) => {
  const tokens = edgeTokens(source)
  const parts: string[] = []
  let index = 0
  const coordinate = () => {
    const value = tokens[index++]
    return value === undefined ? undefined : decodeEdgeCoordinate(value)
  }
  while (index < tokens.length) {
    const command = tokens[index++]
    if (command === '/' ) {
      parts.push('Z')
      budget.pathCommands += 1
    } else if (command === '!' || command === '|') {
      const x = coordinate()
      const y = coordinate()
      if (x === undefined || y === undefined) return
      parts.push(`${command === '!' ? 'M' : 'L'}${x} ${y}`)
      budget.pathCommands += 1
    } else if (command === '[') {
      const cx = coordinate()
      const cy = coordinate()
      const x = coordinate()
      const y = coordinate()
      if (cx === undefined || cy === undefined || x === undefined || y === undefined) return
      parts.push(`Q${cx} ${cy} ${x} ${y}`)
      budget.pathCommands += 1
    }
    if (budget.pathCommands > limits.maxPreviewPathCommands) {
      throw new Error(`FLA first-frame preview exceeds ${limits.maxPreviewPathCommands} path commands.`)
    }
  }
  return parts.length > 0 ? parts.join(' ') : undefined
}

const shapeSvg = (element: Element, budget: PreviewBudget, limits: FlaContainerLimits, warnings: string[]) => {
  const fills = new Map<number, { color: string; opacity: number }>()
  for (const fill of directContainerChildren(element, 'fills', 'fillstyle')) {
    const index = nonNegativeInteger(fill.getAttribute('index'))
    const solid = descendants(fill, 'solidcolor')[0]
    if (index === undefined || !solid) continue
    fills.set(index, {
      color: safeColor(solid.getAttribute('color'), '#000000'),
      opacity: Math.min(1, Math.max(0, finiteNumber(solid.getAttribute('alpha'), 1))),
    })
  }
  const paths: string[] = []
  for (const edge of directContainerChildren(element, 'edges', 'edge')) {
    const data = edgePath(edge.getAttribute('edges') || '', budget, limits)
    if (!data) {
      budget.unsupported += 1
      continue
    }
    const fillIndex = nonNegativeInteger(edge.getAttribute('fillStyle1')) ?? nonNegativeInteger(edge.getAttribute('fillStyle0'))
    const fill = fillIndex === undefined ? undefined : fills.get(fillIndex)
    paths.push(
      `<path d="${escapeXml(data)}" fill="${fill?.color || 'none'}" fill-opacity="${fill?.opacity ?? 1}" fill-rule="evenodd"/>`
    )
    budget.elements += 1
    if (budget.elements > limits.maxPreviewElements) {
      throw new Error(`FLA first-frame preview exceeds ${limits.maxPreviewElements} elements.`)
    }
  }
  if (paths.length === 0 && fills.size > 0) appendWarning(warnings, 'A first-frame shape had no supported bounded edge path.')
  return paths.length > 0
    ? `<g transform="${matrixAttribute(parseMatrix(element))}">${paths.join('')}</g>`
    : ''
}

const textSvg = (element: Element, budget: PreviewBudget) => {
  const characters = descendants(element, 'characters').map(node => node.textContent || '').join('')
  if (!characters.trim()) return ''
  const attrs = descendants(element, 'domtextattrs')[0]
  const size = Math.min(512, Math.max(1, finiteNumber(attrs?.getAttribute('size'), 16)))
  const color = safeColor(attrs?.getAttribute('fillColor'), '#111827')
  const matrix = parseMatrix(element)
  const left = finiteNumber(element.getAttribute('left'), 0)
  const top = finiteNumber(element.getAttribute('top'), 0)
  const font = boundedString(attrs?.getAttribute('face'), 'sans-serif', 128).replace(/["'<>;]/g, '')
  budget.elements += 1
  return `<text x="${left}" y="${top + size}" transform="${matrixAttribute(matrix)}" fill="${color}" font-size="${size}" font-family="${escapeXml(font)}">${escapeXml(characters.slice(0, 16_384))}</text>`
}

const bytesToBase64 = (bytes: Uint8Array) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0
    output += alphabet[first >>> 2]
    output += alphabet[((first & 0x03) << 4) | (second >>> 4)]
    output += index + 1 < bytes.length ? alphabet[((second & 0x0f) << 2) | (third >>> 6)] : '='
    output += index + 2 < bytes.length ? alphabet[third & 0x3f] : '='
  }
  return output
}

const bitmapSvg = (element: Element, bitmaps: ReadonlyMap<string, BitmapPreview>, budget: PreviewBudget) => {
  const name = element.getAttribute('libraryItemName') || ''
  const bitmap = bitmaps.get(name)
  if (!bitmap) {
    budget.unsupported += 1
    return ''
  }
  const matrix = parseMatrix(element)
  budget.elements += 1
  return `<image width="${bitmap.width}" height="${bitmap.height}" transform="${matrixAttribute(matrix)}" href="${bitmap.dataUrl}"/>`
}

const renderElement = (
  element: Element,
  symbolRoots: ReadonlyMap<string, Element>,
  bitmaps: ReadonlyMap<string, BitmapPreview>,
  budget: PreviewBudget,
  limits: FlaContainerLimits,
  warnings: string[],
  symbolStack: readonly string[]
): string => {
  if (budget.elements >= limits.maxPreviewElements) {
    throw new Error(`FLA first-frame preview exceeds ${limits.maxPreviewElements} elements.`)
  }
  const name = localName(element)
  if (name === 'domshape') return shapeSvg(element, budget, limits, warnings)
  if (name.includes('text')) return textSvg(element, budget)
  if (name === 'dombitmapinstance') return bitmapSvg(element, bitmaps, budget)
  if (name === 'domsymbolinstance') {
    const symbolName = element.getAttribute('libraryItemName') || ''
    const symbolRoot = symbolRoots.get(symbolName)
    if (!symbolRoot || symbolStack.includes(symbolName) || symbolStack.length >= limits.maxSymbolDepth) {
      budget.unsupported += 1
      return ''
    }
    const timeline = timelineElements(symbolRoot)[0]
    if (!timeline) {
      budget.unsupported += 1
      return ''
    }
    const nested = renderTimelineFrame(
      timeline,
      symbolRoots,
      bitmaps,
      budget,
      limits,
      warnings,
      [...symbolStack, symbolName]
    )
    return nested ? `<g transform="${matrixAttribute(parseMatrix(element))}">${nested}</g>` : ''
  }
  if (name === 'domgroup') {
    const members = containerElements(element, 'members')
    const nested = members.map(member => renderElement(
      member,
      symbolRoots,
      bitmaps,
      budget,
      limits,
      warnings,
      symbolStack
    )).join('')
    return nested ? `<g transform="${matrixAttribute(parseMatrix(element))}">${nested}</g>` : ''
  }
  budget.unsupported += 1
  return ''
}

const renderTimelineFrame = (
  timeline: Element,
  symbolRoots: ReadonlyMap<string, Element>,
  bitmaps: ReadonlyMap<string, BitmapPreview>,
  budget: PreviewBudget,
  limits: FlaContainerLimits,
  warnings: string[],
  symbolStack: readonly string[] = []
) => {
  const layers = directContainerChildren(timeline, 'layers', 'domlayer')
  const output: string[] = []
  for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const layer = layers[layerIndex]
    const layerType = (layer.getAttribute('layerType') || 'normal').toLowerCase()
    if (!booleanAttribute(layer.getAttribute('visible'), true) || ['guide', 'folder'].includes(layerType)) continue
    if (layerType === 'mask' || layerType === 'masked') {
      appendWarning(warnings, 'Mask-layer compositing is not reconstructed in the bounded first-frame preview.')
      budget.unsupported += 1
      continue
    }
    const frames = directContainerChildren(layer, 'frames', 'domframe')
    const frame = frames.find(candidate => {
      const index = nonNegativeInteger(candidate.getAttribute('index')) ?? 0
      const duration = Math.max(1, nonNegativeInteger(candidate.getAttribute('duration')) ?? 1)
      return index <= 0 && index + duration > 0
    })
    if (!frame) continue
    const container = elementChildren(frame, 'elements')[0]
    if (!container) continue
    for (const element of elementChildren(container)) {
      output.push(renderElement(element, symbolRoots, bitmaps, budget, limits, warnings, symbolStack))
    }
  }
  return output.join('')
}

const rootNamespace = (root: Element) => root.namespaceURI || root.getAttribute('xmlns') || ''

const requireXflRoot = (parsed: ParsedXml, expectedRoot: 'domdocument' | 'domsymbolitem') => {
  const root = parsed.document.documentElement
  if (!root || localName(root) !== expectedRoot) {
    throw new Error(`${parsed.path} does not contain an XFL ${expectedRoot === 'domdocument' ? 'DOMDocument' : 'DOMSymbolItem'} root.`)
  }
  const namespace = rootNamespace(root)
  if (namespace !== XFL_NAMESPACE) {
    throw new Error(`${parsed.path} does not declare the supported Adobe XFL 2008 namespace.`)
  }
  return root
}

const parseSymbols = async (
  buffer: ArrayBuffer | undefined,
  directory: FlaZipDirectory | undefined,
  mainRoot: Element,
  limits: FlaContainerLimits,
  xmlBudget: XmlBudget,
  counters: { timelines: number; layers: number; frames: number },
  warnings: string[]
) => {
  const summaries: FlaSymbolSummary[] = []
  const roots = new Map<string, Element>()
  if (!buffer || !directory) return { summaries, roots }
  const includes = directContainerChildren(mainRoot, 'symbols', 'include')
  if (includes.length > limits.maxSymbols) throw new Error(`FLA/XFL contains more than ${limits.maxSymbols} symbol references.`)
  for (const include of includes) {
    const href = include.getAttribute('href') || ''
    const path = normalizedLibraryPath(href)
    if (!path) {
      appendWarning(warnings, `Ignored unsafe XFL symbol path ${JSON.stringify(href)}.`)
      continue
    }
    const entry = findEntry(directory, path)
    if (!entry || entry.directory) {
      appendWarning(warnings, `Referenced XFL symbol ${JSON.stringify(path)} is missing.`)
      continue
    }
    const parsed = await extractTextEntry(buffer, directory, entry, limits, xmlBudget)
    const root = requireXflRoot(parsed, 'domsymbolitem')
    const name = boundedString(root.getAttribute('name'), href.replace(/\.xml$/i, ''), 1_024)
    if (roots.has(name)) throw new Error(`FLA/XFL contains duplicate symbol name ${JSON.stringify(name)}.`)
    roots.set(name, root)
    const timelineSummary = summarizeTimelines(root, limits, counters)[0]
    summaries.push({
      name,
      href,
      symbolType: boundedString(root.getAttribute('symbolType'), 'graphic', 64),
      timelineName: timelineSummary?.name || name,
      layerCount: timelineSummary?.layers.length || 0,
      frameCount: timelineSummary?.frameCount || 1,
    })
  }
  return { summaries, roots }
}

const loadBitmapPreviews = async (
  buffer: ArrayBuffer | undefined,
  directory: FlaZipDirectory | undefined,
  mainRoot: Element,
  limits: FlaContainerLimits,
  warnings: string[]
) => {
  const previews = new Map<string, BitmapPreview>()
  if (!buffer || !directory) return previews
  const bitmapSources = new Map<string, string>()
  let totalBytes = 0
  for (const item of descendants(mainRoot, 'dombitmapitem')) {
    const name = item.getAttribute('name') || ''
    const href = item.getAttribute('href') || ''
    const path = normalizedLibraryPath(href)
    if (!name || !path || !/\.(?:png|jpe?g)$/i.test(path)) continue
    const previousPath = bitmapSources.get(name)
    if (previousPath) {
      if (previousPath !== path) {
        throw new Error(`FLA/XFL contains duplicate bitmap library name ${JSON.stringify(name)}.`)
      }
      continue
    }
    bitmapSources.set(name, path)
    const entry = findEntry(directory, path)
    if (!entry || entry.directory) continue
    if (entry.uncompressedSize > limits.maxPreviewAssetBytes) {
      appendWarning(warnings, `Skipped oversized bitmap resource ${JSON.stringify(path)}.`)
      continue
    }
    totalBytes += entry.uncompressedSize
    if (totalBytes > limits.maxPreviewAssetTotalBytes) {
      appendWarning(warnings, 'Stopped loading bitmap previews at the aggregate first-frame asset limit.')
      break
    }
    try {
      const bytes = await extractFlaZipEntry(buffer, directory, entry.name, limits.maxPreviewAssetBytes)
      const info = inspectEmbeddedRaster(bytes, undefined, {
        maxBytes: limits.maxPreviewAssetBytes,
        maxDimension: limits.maxPreviewDimension,
        maxPixels: limits.maxPreviewPixels,
      })
      previews.set(name, {
        name,
        dataUrl: `data:${info.mimeType};base64,${bytesToBase64(bytes)}`,
        width: info.width,
        height: info.height,
      })
    } catch (error) {
      appendWarning(
        warnings,
        `Skipped invalid bitmap ${JSON.stringify(path)}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return previews
}

const buildDocumentPreview = async (
  format: 'fla' | 'xfl',
  container: FlaDocumentPreview['container'],
  main: ParsedXml,
  limits: FlaContainerLimits,
  xmlBudget: XmlBudget,
  warnings: string[],
  buffer?: ArrayBuffer,
  directory?: FlaZipDirectory
): Promise<FlaDocumentPreview> => {
  const root = requireXflRoot(main, 'domdocument')
  const width = finiteNumber(root.getAttribute('width'), 550)
  const height = finiteNumber(root.getAttribute('height'), 400)
  if (
    width <= 0 ||
    height <= 0 ||
    width > limits.maxPreviewDimension ||
    height > limits.maxPreviewDimension ||
    width > Math.floor(limits.maxPreviewPixels / height)
  ) {
    throw new Error(`XFL stage dimensions ${width} x ${height} exceed the preview safety limit.`)
  }
  const stage: FlaStageSummary = {
    width,
    height,
    frameRate: Math.min(240, Math.max(0.1, finiteNumber(root.getAttribute('frameRate'), 24))),
    backgroundColor: safeColor(root.getAttribute('backgroundColor'), '#FFFFFF'),
    currentTimeline: nonNegativeInteger(root.getAttribute('currentTimeline')) ?? 0,
  }
  const counters = { timelines: 0, layers: 0, frames: 0 }
  const timelines = summarizeTimelines(root, limits, counters)
  if (timelines.length === 0) throw new Error('XFL DOMDocument does not contain a timeline.')
  const symbols = await parseSymbols(buffer, directory, root, limits, xmlBudget, counters, warnings)
  const bitmaps = await loadBitmapPreviews(buffer, directory, root, limits, warnings)
  const timelineElementsList = timelineElements(root)
  const selectedTimeline = timelineElementsList[Math.min(stage.currentTimeline, timelineElementsList.length - 1)] || timelineElementsList[0]
  const previewBudget: PreviewBudget = { elements: 0, pathCommands: 0, unsupported: 0 }
  const artwork = renderTimelineFrame(
    selectedTimeline,
    symbols.roots,
    bitmaps,
    previewBudget,
    limits,
    warnings
  )
  const previewSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${stage.backgroundColor}"/>${artwork}</svg>`
  if (new TextEncoder().encode(previewSvg).byteLength > limits.maxPreviewSvgBytes) {
    throw new Error(`FLA first-frame SVG exceeds ${limits.maxPreviewSvgBytes} bytes.`)
  }
  const resources = directory
    ? directory.entries
        .filter(entry => !entry.directory)
        .slice(0, limits.maxReportedResources)
        .map(entry => ({ path: entry.name, byteLength: entry.uncompressedSize, kind: classifyResource(entry.name) }))
    : []
  if (directory && directory.entries.filter(entry => !entry.directory).length > limits.maxReportedResources) {
    appendWarning(warnings, `Resource inventory was truncated to ${limits.maxReportedResources} entries.`)
  }
  if (previewBudget.unsupported > 0) {
    appendWarning(
      warnings,
      `${previewBudget.unsupported} first-frame element or effect was not reconstructed; timeline structure remains available.`
    )
  }
  return {
    format,
    container,
    mimeType: XFL_MIME,
    name: boundedString(root.getAttribute('name'), format === 'fla' ? 'Animate document' : 'XFL document', 512),
    xflVersion: boundedString(root.getAttribute('xflVersion'), 'unknown', 64),
    creatorInfo: boundedString(root.getAttribute('creatorInfo'), 'not declared', 512),
    entryCount: directory?.entries.length || 1,
    expandedBytes: directory?.totalUncompressedBytes || main.byteLength,
    stage,
    timelines,
    symbols: symbols.summaries,
    resources,
    previewSvg,
    previewElementCount: previewBudget.elements,
    unsupportedPreviewElements: previewBudget.unsupported,
    warnings,
  }
}

export const readFlaContainer = async (
  buffer: ArrayBuffer,
  format: 'fla' | 'xfl' = 'fla',
  overrides?: Partial<FlaContainerLimits>
): Promise<FlaDocumentPreview> => {
  const limits = resolveFlaContainerLimits(overrides)
  if (buffer.byteLength === 0 || buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`FLA/XFL source is outside the 1-${limits.maxFileBytes} byte file limit.`)
  }
  const bytes = new Uint8Array(buffer)
  if (isLegacyBinaryFla(bytes)) {
    throw new Error(
      'Legacy binary FLA (Flash CS4 and earlier) is intentionally not accepted. This renderer supports only modern compressed XFL-based FLA files.'
    )
  }
  if (!isZip(bytes)) {
    const source = decodeUtf8(bytes, 'XFL source')
    if (/^PROXY-/i.test(source.trim())) {
      throw new Error(
        'This .xfl is only the marker of an uncompressed XFL folder. Select or package DOMDocument.xml together with its LIBRARY and asset folders; a single browser File object cannot read sibling files.'
      )
    }
    const xmlBudget = createXmlBudget()
    const main = parseXmlBytes(bytes, 'XFL source', limits, xmlBudget)
    return buildDocumentPreview('xfl', 'single-xml-xfl', main, limits, xmlBudget, [
      'Single-file XML XFL has no sibling LIBRARY or media directory; external symbol and bitmap references cannot be resolved.',
    ])
  }
  const directory = inspectFlaZipCentralDirectory(buffer, limits)
  const mainEntry = findEntry(directory, 'DOMDocument.xml')
  if (!mainEntry || mainEntry.directory) {
    throw new Error('Modern compressed FLA must contain a root DOMDocument.xml entry.')
  }
  const warnings: string[] = []
  const mimeEntry = findEntry(directory, 'mimetype')
  if (mimeEntry && !mimeEntry.directory) {
    if (mimeEntry.localHeaderOffset !== 0 || mimeEntry.compressionMethod !== 0) {
      throw new Error('FLA mimetype must be the first local ZIP entry and must be stored without compression.')
    }
    const mimeBytes = await extractFlaZipEntry(buffer, directory, mimeEntry.name, 256)
    const mime = decodeUtf8(mimeBytes, 'FLA mimetype').trim()
    if (mime !== XFL_MIME) throw new Error(`FLA mimetype ${JSON.stringify(mime)} is not ${XFL_MIME}.`)
  } else {
    appendWarning(
      warnings,
      'The compressed XFL package has no mimetype entry; DOMDocument.xml and its namespace supplied the format signature.'
    )
  }
  const xmlBudget = createXmlBudget()
  const main = await extractTextEntry(buffer, directory, mainEntry, limits, xmlBudget)
  return buildDocumentPreview(format, 'compressed-xfl', main, limits, xmlBudget, warnings, buffer, directory)
}
