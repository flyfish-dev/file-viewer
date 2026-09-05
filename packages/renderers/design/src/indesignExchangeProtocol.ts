export type InDesignExchangeFormat = 'icml' | 'idms' | 'inx'

export interface InDesignExchangeLimits {
  maxFileBytes: number
  maxNodes: number
  maxDepth: number
  maxAttributesPerElement: number
  maxAttributeLength: number
  maxTextCharacters: number
  maxStories: number
  maxParagraphs: number
  maxRuns: number
  maxItems: number
  maxPoints: number
  maxPointsPerItem: number
  maxStyles: number
  maxColors: number
  maxUnknownElementNames: number
  maxResultBytes: number
  maxDomNodesPerPanel: number
}

export interface InDesignExchangeTextRun {
  text: string
  characterStyle?: string
  fontFamily?: string
  fontStyle?: string
  pointSize?: number
  position?: string
  underline?: boolean
  strikeThrough?: boolean
  fillColor?: string
  hyperlink?: string
}

export interface InDesignExchangeParagraph {
  paragraphStyle?: string
  alignment?: string
  leftIndent?: number
  firstLineIndent?: number
  spaceBefore?: number
  spaceAfter?: number
  listType?: string
  runs: InDesignExchangeTextRun[]
}

export interface InDesignExchangeStory {
  id: string
  title?: string
  paragraphs: InDesignExchangeParagraph[]
  characterCount: number
}

export interface InDesignExchangePoint {
  x: number
  y: number
}

export interface InDesignExchangeBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface InDesignExchangeItem {
  id: string
  kind: string
  name?: string
  layer?: string
  storyId?: string
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  bounds?: InDesignExchangeBounds
  points: InDesignExchangePoint[]
  externalResource?: string
}

export interface InDesignExchangeColor {
  id: string
  name: string
  space: string
  values: number[]
  css: string
}

export interface InDesignExchangeStyle {
  id: string
  name: string
  kind: 'paragraph' | 'character' | 'object'
  basedOn?: string
  fontFamily?: string
  fontStyle?: string
  pointSize?: number
  alignment?: string
}

export interface InDesignExchangeStatistics {
  bytes: number
  nodes: number
  maxDepth: number
  textCharacters: number
  storyCount: number
  paragraphCount: number
  runCount: number
  itemCount: number
  pointCount: number
  styleCount: number
  colorCount: number
  resultBytes: number
}

export interface InDesignExchangeDocument {
  format: InDesignExchangeFormat
  fidelity: 'styled-story' | 'layout-fragment' | 'legacy-structure'
  rootElement: string
  domVersion?: string
  product?: string
  snippetType?: string
  stories: InDesignExchangeStory[]
  items: InDesignExchangeItem[]
  colors: InDesignExchangeColor[]
  styles: InDesignExchangeStyle[]
  layers: string[]
  unknownElementNames: string[]
  warnings: string[]
  statistics: InDesignExchangeStatistics
}

export type InDesignExchangeWorkerRequest = {
  id: number
  type: 'parse'
  format: InDesignExchangeFormat
  buffer: ArrayBuffer
  limits?: Partial<InDesignExchangeLimits>
}

export type InDesignExchangeWorkerResponse =
  | { id: number; ok: true; result: InDesignExchangeDocument }
  | { id: number; ok: false; error: { name: string; message: string } }
