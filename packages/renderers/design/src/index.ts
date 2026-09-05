import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition
} from '@file-viewer/core'
import { dataRendererDefinition, renderFileViewerData } from '@file-viewer/renderer-data'

const definitionIds = [
  'photoshop-design',
  'illustrator-pdf-design',
  'postscript-design',
  'adobe-palette-design',
  'photoshop-resource-design',
  'indesign-idml-design',
  'indesign-exchange-design',
  'adobe-animate-xfl-design',
  'adobe-xd-design',
  'indesign-native-design'
] as const
const definitions = definitionIds.map(
  (id) =>
    DEFAULT_RENDERER_DEFINITIONS.find((definition) => definition.id === id) as
      | RendererDefinition
      | undefined
)

if (definitions.some((definition) => !definition)) {
  throw new Error(
    '@file-viewer/renderer-design could not locate all shared Adobe design definitions.'
  )
}

export const designRendererDefinitions = definitions as RendererDefinition[]

const enhancedDataFormats = new Set<string>(
  designRendererDefinitions.flatMap((definition) =>
    definition.enhancesRendererId === dataRendererDefinition.id
      ? [...(definition.enhancesExtensions || [])]
      : []
  )
)

export const renderFileViewerDesign: FileRenderHandler<
  FileViewerRenderedInstance,
  HTMLDivElement
> = (buffer, target, type, context) =>
  import('./design.js').then(({ default: renderDesign }) =>
    renderDesign(buffer, target, type, context)
  )

/**
 * Backwards-compatible dispatcher for callers that previously installed one
 * combined data/design handler. The plugin itself now registers specialist
 * owners so registry capabilities stay aligned with the selected handler.
 */
export const renderFileViewerDesignOrData: FileRenderHandler<
  FileViewerRenderedInstance,
  HTMLDivElement
> = (buffer, target, type, context) =>
  enhancedDataFormats.has(String(type || '').toLowerCase())
    ? renderFileViewerDesign(buffer, target, type, context)
    : renderFileViewerData(buffer, target, type, context)

export const designRenderer: FileViewerRendererPlugin<
  FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>
> = {
  id: 'file-viewer-renderer-design',
  label: 'Flyfish File Viewer Adobe design renderer',
  // Keeping the data definition and handler makes the standalone Design plugin
  // self-contained. Core transfers only the catalog-declared PSD/AI/EPS claims.
  definitions: [dataRendererDefinition, ...designRendererDefinitions],
  handlers: [
    {
      rendererId: dataRendererDefinition.id,
      handler: renderFileViewerData
    },
    ...designRendererDefinitions.map((definition) => ({
      rendererId: definition.id,
      handler: renderFileViewerDesign
    }))
  ]
}

export { DEFAULT_PHOTOSHOP_PARSE_LIMITS, resolvePhotoshopParseLimits } from './limits.js'
export { inspectPhotoshopHeader } from './photoshopHeader.js'
export { inspectPhotoshopContainer } from './photoshopPreflight.js'
export {
  parseAdobePalette,
  parseAdobeSwatchExchange,
  parseAdobeColorSwatch
} from './designResourceParser.js'
export { parseAdobeBrushResource } from './adobeBrushResourceParser.js'
export { parseAdobePresetResource } from './adobePresetParser.js'
export { inspectAdobeBrushLibrary, inspectAdobeCustomShapeLibrary } from './adobeBrushPreflight.js'
export { inspectIdmlZip } from './idmlPreflight.js'
export {
  DEFAULT_INDESIGN_EXCHANGE_LIMITS,
  parseInDesignExchange,
  resolveInDesignExchangeLimits
} from './indesignExchangeParser.js'
export {
  DEFAULT_FLA_CONTAINER_LIMITS,
  readFlaContainer,
  resolveFlaContainerLimits
} from './flaContainer.js'
export { readXdContainer, resolveXdContainerLimits } from './xdContainer.js'
export {
  readInDesignContainer,
  inspectInDesignContainer,
  resolveInDesignContainerLimits
} from './indesignContainer.js'
export {
  DEFAULT_POSTSCRIPT_SAFETY_LIMITS,
  resolvePostscriptSafetyLimits
} from './postscriptLimits.js'
export type { AdobePaletteColor, AdobePaletteDocument } from './designResourceParser.js'
export type {
  AdobeBrushResourceDocument,
  AdobeBrushResourceFormat,
  AdobeBrushLibraryDocument,
  AdobeCustomShapeLibraryDocument
} from './adobeBrushResourceProtocol.js'
export type {
  AdobePresetDocument,
  AdobePresetFormat,
  AdobePatternLibraryDocument,
  AdobeGradientLibraryDocument,
  AdobeLayerStyleLibraryDocument
} from './adobePresetProtocol.js'
export type { XdDocumentPreview, XdContainerLimits } from './xdContainer.js'
export type { InDesignDocumentPreview, InDesignContainerLimits } from './indesignContainer.js'
export type {
  InDesignExchangeDocument,
  InDesignExchangeFormat,
  InDesignExchangeLimits
} from './indesignExchangeProtocol.js'
export type {
  FlaContainerLimits,
  FlaDocumentPreview,
  FlaElementCounts,
  FlaLayerSummary,
  FlaResourceSummary,
  FlaStageSummary,
  FlaSymbolSummary,
  FlaTimelineSummary
} from './flaContainer.js'
export type { PhotoshopHeader, PhotoshopLayerInfo } from './photoshopProtocol.js'
export type { PostscriptSafetyLimits } from './postscriptLimits.js'
export type {
  PostscriptOpenResult,
  PostscriptPageInfo,
  PostscriptRenderedPage
} from './postscriptProtocol.js'
export default designRenderer
