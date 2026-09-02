import { SaxesParser, type SaxesTagPlain } from 'saxes'
import type {
  InDesignExchangeBounds,
  InDesignExchangeColor,
  InDesignExchangeDocument,
  InDesignExchangeFormat,
  InDesignExchangeItem,
  InDesignExchangeLimits,
  InDesignExchangeParagraph,
  InDesignExchangePoint,
  InDesignExchangeStory,
  InDesignExchangeStyle,
  InDesignExchangeTextRun
} from './indesignExchangeProtocol.js'

const MIB = 1024 * 1024

export const DEFAULT_INDESIGN_EXCHANGE_LIMITS: Readonly<InDesignExchangeLimits> = Object.freeze({
  maxFileBytes: 64 * MIB,
  maxNodes: 100_000,
  maxDepth: 128,
  maxAttributesPerElement: 512,
  maxAttributeLength: 65_536,
  maxTextCharacters: 8 * MIB,
  maxStories: 2_048,
  maxParagraphs: 20_000,
  maxRuns: 40_000,
  maxItems: 10_000,
  maxPoints: 100_000,
  maxPointsPerItem: 4_096,
  maxStyles: 20_000,
  maxColors: 16_384,
  maxUnknownElementNames: 256,
  maxResultBytes: 24 * MIB,
  maxDomNodesPerPanel: 8_000
})

const HARD_LIMITS: Readonly<InDesignExchangeLimits> = Object.freeze({
  maxFileBytes: 256 * MIB,
  maxNodes: 250_000,
  maxDepth: 256,
  maxAttributesPerElement: 2_048,
  maxAttributeLength: 262_144,
  maxTextCharacters: 32 * MIB,
  maxStories: 8_192,
  maxParagraphs: 100_000,
  maxRuns: 100_000,
  maxItems: 50_000,
  maxPoints: 500_000,
  maxPointsPerItem: 16_384,
  maxStyles: 100_000,
  maxColors: 65_536,
  maxUnknownElementNames: 1_024,
  maxResultBytes: 64 * MIB,
  maxDomNodesPerPanel: 20_000
})

export class InDesignExchangeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'InDesignExchangeError'
    this.code = code
  }
}

const positiveInteger = (value: unknown, fallback: number, hardMaximum: number) => {
  const numeric = Number(value)
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return fallback
  return Math.min(numeric, hardMaximum)
}

export const resolveInDesignExchangeLimits = (
  overrides?: Partial<InDesignExchangeLimits>
): InDesignExchangeLimits =>
  Object.fromEntries(
    Object.entries(DEFAULT_INDESIGN_EXCHANGE_LIMITS).map(([key, fallback]) => [
      key,
      positiveInteger(
        overrides?.[key as keyof InDesignExchangeLimits],
        fallback,
        HARD_LIMITS[key as keyof InDesignExchangeLimits]
      )
    ])
  ) as unknown as InDesignExchangeLimits

const fail = (code: string, message: string): never => {
  throw new InDesignExchangeError(code, message)
}

const estimateStructuredResultBytes = (value: unknown, maximum: number) => {
  const stack: unknown[] = [value]
  const seen = new WeakSet<object>()
  let bytes = 0
  const add = (amount: number) => {
    bytes += amount
    if (!Number.isSafeInteger(bytes) || bytes > maximum) {
      fail(
        'INDESIGN_EXCHANGE_RESULT_LIMIT',
        `InDesign exchange retained result exceeds the ${maximum}-byte structured-result safety limit.`
      )
    }
  }

  while (stack.length) {
    const current = stack.pop()
    if (current === undefined || current === null) continue
    if (typeof current === 'string') {
      add(24 + current.length * 2)
      continue
    }
    if (typeof current === 'number' || typeof current === 'bigint') {
      add(8)
      continue
    }
    if (typeof current === 'boolean') {
      add(4)
      continue
    }
    if (typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)
    if (Array.isArray(current)) {
      add(32 + current.length * 8)
      for (const entry of current) stack.push(entry)
      continue
    }
    const entries = Object.entries(current as Record<string, unknown>)
    add(64 + entries.length * 8)
    for (const [key, entry] of entries) {
      add(16 + key.length * 2)
      stack.push(entry)
    }
  }
  return bytes
}

const finite = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const boundedNumber = (value: string | undefined, minimum = -1_000_000, maximum = 1_000_000) => {
  const numeric = finite(value)
  return numeric !== undefined && numeric >= minimum && numeric <= maximum ? numeric : undefined
}

const parseNumbers = (value: string | undefined) =>
  (value || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite)

const parseInxNumbers = (value: string | undefined) => {
  const values: number[] = []
  const matcher = /(?:^|_)D_(-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)/g
  let match: RegExpExecArray | null
  while ((match = matcher.exec(value || ''))) {
    const numeric = Number(match[1])
    if (Number.isFinite(numeric)) values.push(numeric)
  }
  return values
}

const decodeInxString = (value: string | undefined) => {
  if (!value || value === 'k_' || value === 'c_') return ''
  const withoutKind = value.replace(/^(?:r?k|c)_/, '')
  return withoutKind.replace(/~sep~/g, ' / ').replace(/~(.)/g, '$1')
}

const parseProcessingAttributes = (body: string) => {
  const attributes: Record<string, string> = {}
  const matcher = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match: RegExpExecArray | null
  while ((match = matcher.exec(body))) attributes[match[1]] = match[2] ?? match[3] ?? ''
  return attributes
}

const normalizeReference = (value: string | undefined) => value?.trim() || undefined

const rgbCss = (red: number, green: number, blue: number) => {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`
}

const colorCss = (space: string, values: number[], name: string) => {
  if (/none/i.test(name)) return 'transparent'
  if (/paper/i.test(name)) return '#ffffff'
  const normalized = space.toLowerCase()
  if (normalized.includes('rgb') && values.length >= 3) {
    const multiplier = values.every((value) => value >= 0 && value <= 1) ? 255 : 1
    return rgbCss(values[0] * multiplier, values[1] * multiplier, values[2] * multiplier)
  }
  if (normalized.includes('cmyk') && values.length >= 4) {
    const multiplier = values.some((value) => value > 1) ? 0.01 : 1
    const [cyan, magenta, yellow, black] = values.map((value) =>
      Math.max(0, Math.min(1, value * multiplier))
    )
    return rgbCss(
      255 * (1 - Math.min(1, cyan + black)),
      255 * (1 - Math.min(1, magenta + black)),
      255 * (1 - Math.min(1, yellow + black))
    )
  }
  if ((normalized.includes('gray') || normalized.includes('grey')) && values.length) {
    const gray = values[0] <= 1 ? values[0] * 255 : values[0] <= 100 ? values[0] * 2.55 : values[0]
    return rgbCss(gray, gray, gray)
  }
  return '#94a3b8'
}

const transformPoints = (points: InDesignExchangePoint[], transform: number[]) => {
  if (transform.length !== 6) return points
  const [a, b, c, d, translateX, translateY] = transform
  if (![a, b, c, d, translateX, translateY].every(Number.isFinite)) return points
  return points.map((point) => ({
    x: a * point.x + c * point.y + translateX,
    y: b * point.x + d * point.y + translateY
  }))
}

const pointsFromGeometricBounds = (value: string | undefined) => {
  const values = parseNumbers(value)
  if (values.length !== 4) return []
  const [top, left, bottom, right] = values
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ]
}

const boundsFromPoints = (points: InDesignExchangePoint[]): InDesignExchangeBounds | undefined => {
  if (!points.length) return undefined
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const point of points) {
    left = Math.min(left, point.x)
    top = Math.min(top, point.y)
    right = Math.max(right, point.x)
    bottom = Math.max(bottom, point.y)
  }
  if (![left, top, right, bottom].every(Number.isFinite)) return undefined
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

const INX_ITEM_NAMES: Record<string, string> = {
  crec: 'Rectangle',
  tfra: 'TextFrame',
  txfr: 'TextFrame',
  covl: 'Oval',
  cpol: 'Polygon',
  grln: 'GraphicLine',
  grup: 'Group',
  imag: 'Image'
}

const LONG_ITEM_NAMES = new Set([
  'Rectangle',
  'TextFrame',
  'Oval',
  'Polygon',
  'GraphicLine',
  'Group',
  'Image',
  'EPS',
  'PDF',
  'SplineItem'
])

const HANDLED_NAMES = new Set([
  'Document',
  'docu',
  'SnippetRoot',
  'Story',
  'cxst',
  'ParagraphStyleRange',
  'txsr',
  'CharacterStyleRange',
  'Content',
  'pcnt',
  'Br',
  'Properties',
  'PathGeometry',
  'GeometryPathType',
  'PathPointArray',
  'PathPointType',
  'Color',
  'colr',
  'Swatch',
  'ParagraphStyle',
  'CharacterStyle',
  'ObjectStyle',
  'psty',
  'tsty',
  'ObSt',
  'Layer',
  'layr',
  'Spread',
  'sprd',
  'Page',
  'page',
  'Link',
  'RootParagraphStyleGroup',
  'RootCharacterStyleGroup',
  'RootObjectStyleGroup',
  'RootColorGroup',
  ...LONG_ITEM_NAMES,
  ...Object.keys(INX_ITEM_NAMES)
])

interface ItemBuilder {
  sourceName: string
  item: InDesignExchangeItem
  transform: number[]
}

interface StyleBuilder extends InDesignExchangeStyle {
  openName: string
}

export const parseInDesignExchange = (
  buffer: ArrayBuffer,
  format: InDesignExchangeFormat,
  overrides?: Partial<InDesignExchangeLimits>
): InDesignExchangeDocument => {
  const limits = resolveInDesignExchangeLimits(overrides)
  if (!(buffer instanceof ArrayBuffer))
    fail('INDESIGN_EXCHANGE_BUFFER', 'InDesign exchange input must be an ArrayBuffer.')
  if (buffer.byteLength === 0) fail('INDESIGN_EXCHANGE_EMPTY', 'InDesign exchange input is empty.')
  if (buffer.byteLength > limits.maxFileBytes) {
    fail(
      'INDESIGN_EXCHANGE_FILE_LIMIT',
      `InDesign exchange source exceeds the ${limits.maxFileBytes}-byte safety limit.`
    )
  }
  let xml = ''
  try {
    xml = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buffer))
  } catch {
    fail('INDESIGN_EXCHANGE_ENCODING', 'InDesign exchange source is not valid UTF-8 XML.')
  }
  if (xml.charCodeAt(0) === 0xfeff) xml = xml.slice(1)
  if (xml.includes('\u0000'))
    fail('INDESIGN_EXCHANGE_ENCODING', 'InDesign exchange XML contains NUL bytes.')
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    fail(
      'INDESIGN_EXCHANGE_DTD',
      'DTD and entity declarations are not accepted in InDesign exchange XML.'
    )
  }
  if (!/^\s*<\?xml\b/i.test(xml)) {
    fail(
      'INDESIGN_EXCHANGE_SIGNATURE',
      'InDesign exchange source must start with an XML declaration.'
    )
  }

  const stories: InDesignExchangeStory[] = []
  const items: InDesignExchangeItem[] = []
  const colors: InDesignExchangeColor[] = []
  const styles: InDesignExchangeStyle[] = []
  const layers = new Set<string>()
  const unknownNames = new Set<string>()
  const seenColors = new Set<string>()
  const seenStyles = new Set<string>()
  const aidAttributes: Record<string, string> = {}
  const itemStack: ItemBuilder[] = []
  const styleStack: StyleBuilder[] = []
  const tagStack: string[] = []
  let rootElement = ''
  let rootAttributes: Record<string, string> = {}
  let nodes = 0
  let depth = 0
  let maximumDepth = 0
  let textCharacters = 0
  let paragraphCount = 0
  let runCount = 0
  let pointCount = 0
  let resultBytes = 1_024
  let contentDepth = 0
  let currentStory: InDesignExchangeStory | undefined
  let currentParagraph: InDesignExchangeParagraph | undefined
  const runStack: InDesignExchangeTextRun[] = []
  let parserError: Error | undefined

  const limit = (condition: boolean, code: string, message: string) => {
    if (condition) fail(code, message)
  }
  const estimatedStringBytes = (...values: Array<string | undefined>) =>
    values.reduce((total, value) => total + (value?.length || 0) * 2, 0)
  const estimatedStringCollectionBytes = (values: Iterable<string>) => {
    let total = 0
    for (const value of values) total += value.length * 2
    return total
  }
  const useResultBudget = (bytes: number, label: string) => {
    resultBytes += Math.max(0, bytes)
    limit(
      !Number.isSafeInteger(resultBytes) || resultBytes > limits.maxResultBytes,
      'INDESIGN_EXCHANGE_RESULT_LIMIT',
      `InDesign exchange ${label} exceeds the ${limits.maxResultBytes}-byte structured-result safety limit.`
    )
  }
  const attribute = (attributes: Record<string, string>, ...names: string[]) => {
    for (const name of names) {
      if (attributes[name] !== undefined) return attributes[name]
    }
    return undefined
  }
  const beginParagraph = (attributes: Record<string, string>) => {
    if (!currentStory) return
    if (currentParagraph) endParagraph()
    paragraphCount += 1
    limit(
      paragraphCount > limits.maxParagraphs,
      'INDESIGN_EXCHANGE_PARAGRAPH_LIMIT',
      'InDesign exchange XML exceeds the paragraph limit.'
    )
    useResultBudget(
      192 +
        estimatedStringBytes(
          attribute(attributes, 'AppliedParagraphStyle', 'prst'),
          attribute(attributes, 'Justification', 'jstf'),
          attribute(attributes, 'BulletsAndNumberingListType', 'bnlt')
        ),
      'paragraphs'
    )
    currentParagraph = {
      paragraphStyle: normalizeReference(attribute(attributes, 'AppliedParagraphStyle', 'prst')),
      alignment: normalizeReference(attribute(attributes, 'Justification', 'jstf')),
      leftIndent: boundedNumber(attribute(attributes, 'LeftIndent', 'lind')),
      firstLineIndent: boundedNumber(attribute(attributes, 'FirstLineIndent', 'flin')),
      spaceBefore: boundedNumber(attribute(attributes, 'SpaceBefore', 'spbe'), 0),
      spaceAfter: boundedNumber(attribute(attributes, 'SpaceAfter', 'spaf'), 0),
      listType: normalizeReference(attribute(attributes, 'BulletsAndNumberingListType', 'bnlt')),
      runs: []
    }
  }
  const beginRun = (attributes: Record<string, string>) => {
    if (!currentStory) return
    if (!currentParagraph) beginParagraph({})
    runCount += 1
    limit(
      runCount > limits.maxRuns,
      'INDESIGN_EXCHANGE_RUN_LIMIT',
      'InDesign exchange XML exceeds the text-run limit.'
    )
    useResultBudget(
      320 +
        estimatedStringBytes(
          attribute(attributes, 'AppliedCharacterStyle', 'crst'),
          attribute(attributes, 'AppliedFont', 'fFam'),
          attribute(attributes, 'FontStyle', 'fSty'),
          attribute(attributes, 'Position', 'post'),
          attribute(attributes, 'FillColor', 'flcl'),
          attribute(attributes, 'HyperlinkTextSource', 'href')
        ),
      'text runs'
    )
    runStack.push({
      text: '',
      characterStyle: normalizeReference(attribute(attributes, 'AppliedCharacterStyle', 'crst')),
      fontFamily: normalizeReference(attribute(attributes, 'AppliedFont', 'fFam')),
      fontStyle: normalizeReference(attribute(attributes, 'FontStyle', 'fSty')),
      pointSize: boundedNumber(attribute(attributes, 'PointSize', 'ptsz'), 0, 10_000),
      position: normalizeReference(attribute(attributes, 'Position', 'post')),
      underline: attribute(attributes, 'Underline', 'undl') === 'true',
      strikeThrough: attribute(attributes, 'StrikeThru', 'strk') === 'true',
      fillColor: normalizeReference(attribute(attributes, 'FillColor', 'flcl')),
      hyperlink: normalizeReference(attribute(attributes, 'HyperlinkTextSource', 'href'))
    })
  }
  const endRun = () => {
    const run = runStack.pop()
    if (!run || !currentParagraph) return
    if (run.text.length || run.characterStyle || run.fontFamily) currentParagraph.runs.push(run)
  }
  const endParagraph = () => {
    while (runStack.length) endRun()
    if (!currentParagraph || !currentStory) return
    if (currentParagraph.runs.length) currentStory.paragraphs.push(currentParagraph)
    currentParagraph = undefined
  }
  const beginStory = (attributes: Record<string, string>, legacy = false) => {
    if (currentStory) endStory()
    limit(
      stories.length >= limits.maxStories,
      'INDESIGN_EXCHANGE_STORY_LIMIT',
      'InDesign exchange XML exceeds the story limit.'
    )
    useResultBudget(
      256 +
        estimatedStringBytes(
          attribute(attributes, 'Self'),
          attribute(attributes, 'StoryTitle', 'Name', 'pnam', 'sTtl')
        ),
      'stories'
    )
    currentStory = {
      id: attribute(attributes, 'Self') || `story-${stories.length + 1}`,
      title: legacy
        ? decodeInxString(attribute(attributes, 'pnam', 'sTtl'))
        : attribute(attributes, 'StoryTitle', 'Name'),
      paragraphs: [],
      characterCount: 0
    }
  }
  const endStory = () => {
    endParagraph()
    if (!currentStory) return
    currentStory.characterCount = currentStory.paragraphs.reduce(
      (total, paragraph) => total + paragraph.runs.reduce((sum, run) => sum + run.text.length, 0),
      0
    )
    stories.push(currentStory)
    currentStory = undefined
  }
  const appendText = (value: string) => {
    if (!currentStory || contentDepth <= 0 || !value) return
    const text = format === 'inx' ? decodeInxString(value) : value
    if (!text) return
    textCharacters += text.length
    limit(
      textCharacters > limits.maxTextCharacters,
      'INDESIGN_EXCHANGE_TEXT_LIMIT',
      'InDesign exchange XML exceeds the text-character limit.'
    )
    useResultBudget(text.length * 2, 'story text')
    if (!currentParagraph) beginParagraph({})
    if (!runStack.length) beginRun({})
    const run = runStack[runStack.length - 1]
    run.text += text
  }
  const readItem = (name: string, attributes: Record<string, string>) => {
    const kind = INX_ITEM_NAMES[name] || name
    const id = attribute(attributes, 'Self') || `item-${items.length + itemStack.length + 1}`
    const transform = parseNumbers(attribute(attributes, 'ItemTransform'))
    let points = pointsFromGeometricBounds(attribute(attributes, 'GeometricBounds'))
    if (format === 'inx') {
      const geometry = parseInxNumbers(attribute(attributes, 'IGeo'))
      if (geometry.length >= 10) {
        const [top, left, bottom, right] = geometry.slice(-10, -6)
        points = [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom }
        ]
        transform.push(...geometry.slice(-6))
      }
    }
    limit(
      points.length > limits.maxPointsPerItem,
      'INDESIGN_EXCHANGE_ITEM_POINT_LIMIT',
      `An InDesign exchange page item exceeds the ${limits.maxPointsPerItem}-point safety limit.`
    )
    useResultBudget(
      512 +
        points.length * 24 +
        estimatedStringBytes(
          id,
          kind,
          attribute(attributes, 'Name', 'pnam', 'sTtl'),
          attribute(attributes, 'ItemLayer', 'pilr'),
          attribute(attributes, 'ParentStory', 'strp'),
          attribute(attributes, 'FillColor', 'flcl'),
          attribute(attributes, 'StrokeColor', 'lncl'),
          attribute(attributes, 'LinkResourceURI', 'LinkResourceURIEncoded', 'path')
        ),
      'page items'
    )
    const item: InDesignExchangeItem = {
      id,
      kind,
      name:
        format === 'inx'
          ? decodeInxString(attribute(attributes, 'pnam', 'sTtl'))
          : attribute(attributes, 'Name'),
      layer: normalizeReference(attribute(attributes, 'ItemLayer', 'pilr')),
      storyId: normalizeReference(attribute(attributes, 'ParentStory', 'strp')),
      fillColor: normalizeReference(attribute(attributes, 'FillColor', 'flcl')),
      strokeColor: normalizeReference(attribute(attributes, 'StrokeColor', 'lncl')),
      strokeWidth: boundedNumber(attribute(attributes, 'StrokeWeight', 'lnwt'), 0, 100_000),
      opacity: boundedNumber(attribute(attributes, 'Opacity', 'opac'), 0, 100),
      points,
      externalResource: normalizeReference(
        attribute(attributes, 'LinkResourceURI', 'LinkResourceURIEncoded', 'path')
      )
    }
    if (item.layer) layers.add(item.layer)
    itemStack.push({ sourceName: name, item, transform })
  }
  const finishItem = () => {
    const builder = itemStack.pop()
    if (!builder) return
    const points = transformPoints(builder.item.points, builder.transform)
    pointCount += points.length
    limit(
      pointCount > limits.maxPoints,
      'INDESIGN_EXCHANGE_POINT_LIMIT',
      'InDesign exchange XML exceeds the geometry-point limit.'
    )
    builder.item.points = points
    builder.item.bounds = boundsFromPoints(points)
    if (items.length >= limits.maxItems)
      fail('INDESIGN_EXCHANGE_ITEM_LIMIT', 'InDesign exchange XML exceeds the page-item limit.')
    items.push(builder.item)
  }
  const readColor = (attributes: Record<string, string>, legacy: boolean) => {
    const id = attribute(attributes, 'Self') || `color-${colors.length + 1}`
    if (seenColors.has(id)) return
    const name = legacy
      ? decodeInxString(attribute(attributes, 'pnam')) || id
      : attribute(attributes, 'Name') || id.replace(/^Color\//, '')
    const space = legacy
      ? attribute(attributes, 'clsp') || 'Unknown'
      : attribute(attributes, 'Space') || 'Unknown'
    const values = legacy
      ? parseInxNumbers(attribute(attributes, 'clvl'))
      : parseNumbers(attribute(attributes, 'ColorValue'))
    limit(
      colors.length >= limits.maxColors,
      'INDESIGN_EXCHANGE_COLOR_LIMIT',
      'InDesign exchange XML exceeds the color limit.'
    )
    useResultBudget(256 + values.length * 8 + estimatedStringBytes(id, name, space), 'colors')
    colors.push({ id, name, space, values, css: colorCss(space, values, name) })
    seenColors.add(id)
  }
  const readStyle = (
    name: string,
    attributes: Record<string, string>,
    kind: InDesignExchangeStyle['kind']
  ) => {
    const id = attribute(attributes, 'Self') || `${kind}-${styles.length + styleStack.length + 1}`
    if (seenStyles.has(id)) return
    limit(
      styles.length + styleStack.length >= limits.maxStyles,
      'INDESIGN_EXCHANGE_STYLE_LIMIT',
      'InDesign exchange XML exceeds the style limit.'
    )
    useResultBudget(
      256 +
        estimatedStringBytes(
          id,
          name,
          attribute(attributes, 'Name', 'pnam'),
          attribute(attributes, 'BasedOn', 'bsed'),
          attribute(attributes, 'AppliedFont', 'fFam'),
          attribute(attributes, 'FontStyle', 'fSty'),
          attribute(attributes, 'Justification', 'jstf')
        ),
      'styles'
    )
    styleStack.push({
      openName: name,
      id,
      name:
        format === 'inx'
          ? decodeInxString(attribute(attributes, 'pnam')) || id
          : attribute(attributes, 'Name') || id,
      kind,
      basedOn: normalizeReference(attribute(attributes, 'BasedOn', 'bsed')),
      fontFamily: normalizeReference(attribute(attributes, 'AppliedFont', 'fFam')),
      fontStyle: normalizeReference(attribute(attributes, 'FontStyle', 'fSty')),
      pointSize: boundedNumber(attribute(attributes, 'PointSize', 'ptsz'), 0, 10_000),
      alignment: normalizeReference(attribute(attributes, 'Justification', 'jstf'))
    })
  }
  const finishStyle = () => {
    const style = styleStack.pop()
    if (!style || seenStyles.has(style.id)) return
    const { openName: _openName, ...result } = style
    styles.push(result)
    seenStyles.add(result.id)
  }

  const parser = new SaxesParser({ xmlns: false, position: true, fileName: `${format} source` })
  parser.on('error', (error) => {
    parserError = error
  })
  parser.on('doctype', () =>
    fail('INDESIGN_EXCHANGE_DTD', 'DOCTYPE is not accepted in InDesign exchange XML.')
  )
  parser.on('processinginstruction', (instruction) => {
    if (instruction.target.toLowerCase() !== 'aid') return
    limit(
      instruction.body.length > limits.maxAttributeLength * 4,
      'INDESIGN_EXCHANGE_ATTRIBUTE_LIMIT',
      'The InDesign aid processing instruction exceeds its safety limit.'
    )
    const parsedAttributes = parseProcessingAttributes(instruction.body)
    const entries = Object.entries(parsedAttributes)
    limit(
      entries.length > limits.maxAttributesPerElement,
      'INDESIGN_EXCHANGE_ATTRIBUTE_LIMIT',
      'The InDesign aid processing instruction has too many attributes.'
    )
    for (const [name, value] of entries) {
      limit(
        name.length > 512 || value.length > limits.maxAttributeLength,
        'INDESIGN_EXCHANGE_ATTRIBUTE_LIMIT',
        'An InDesign aid processing-instruction attribute exceeds its length limit.'
      )
      useResultBudget(64 + estimatedStringBytes(name, value), 'processing metadata')
      aidAttributes[name] = value
    }
  })
  parser.on('opentag', (tag: SaxesTagPlain) => {
    nodes += 1
    depth += 1
    maximumDepth = Math.max(maximumDepth, depth)
    limit(
      nodes > limits.maxNodes,
      'INDESIGN_EXCHANGE_NODE_LIMIT',
      'InDesign exchange XML exceeds the node limit.'
    )
    limit(
      depth > limits.maxDepth,
      'INDESIGN_EXCHANGE_DEPTH_LIMIT',
      'InDesign exchange XML exceeds the nesting-depth limit.'
    )
    const attributes = tag.attributes
    const entries = Object.entries(attributes)
    limit(
      entries.length > limits.maxAttributesPerElement,
      'INDESIGN_EXCHANGE_ATTRIBUTE_LIMIT',
      'An InDesign exchange XML element has too many attributes.'
    )
    for (const [name, value] of entries) {
      limit(
        name.length > 512 || value.length > limits.maxAttributeLength,
        'INDESIGN_EXCHANGE_ATTRIBUTE_LIMIT',
        'An InDesign exchange XML attribute exceeds its length limit.'
      )
    }
    if (!rootElement) {
      rootElement = tag.name
      rootAttributes = { DOMVersion: attributes.DOMVersion || '' }
    }
    tagStack.push(tag.name)
    if (!HANDLED_NAMES.has(tag.name) && unknownNames.size < limits.maxUnknownElementNames)
      unknownNames.add(tag.name)

    if (tag.name === 'Story') beginStory(attributes)
    else if (tag.name === 'cxst') beginStory(attributes, true)
    else if (tag.name === 'ParagraphStyleRange' || tag.name === 'txsr') beginParagraph(attributes)
    else if (tag.name === 'CharacterStyleRange') beginRun(attributes)
    else if (tag.name === 'Content' || tag.name === 'pcnt') contentDepth += 1
    else if (tag.name === 'Br') appendText('\n')
    else if (tag.name === 'Color' || tag.name === 'Swatch') readColor(attributes, false)
    else if (tag.name === 'colr') readColor(attributes, true)
    else if (tag.name === 'ParagraphStyle' || tag.name === 'psty')
      readStyle(tag.name, attributes, 'paragraph')
    else if (tag.name === 'CharacterStyle' || tag.name === 'tsty')
      readStyle(tag.name, attributes, 'character')
    else if (tag.name === 'ObjectStyle' || tag.name === 'ObSt')
      readStyle(tag.name, attributes, 'object')
    else if (tag.name === 'Layer' || tag.name === 'layr') {
      const layer =
        format === 'inx'
          ? decodeInxString(attribute(attributes, 'pnam'))
          : attribute(attributes, 'Name')
      if (layer && !layers.has(layer)) {
        useResultBudget(64 + layer.length * 2, 'layers')
        layers.add(layer)
      }
    }
    if (LONG_ITEM_NAMES.has(tag.name) || INX_ITEM_NAMES[tag.name]) readItem(tag.name, attributes)
    if (tag.name === 'PathPointType' && itemStack.length) {
      const anchor = parseNumbers(attribute(attributes, 'Anchor'))
      if (anchor.length === 2) {
        const points = itemStack[itemStack.length - 1].item.points
        limit(
          points.length >= limits.maxPointsPerItem,
          'INDESIGN_EXCHANGE_ITEM_POINT_LIMIT',
          `An InDesign exchange page item exceeds the ${limits.maxPointsPerItem}-point safety limit.`
        )
        useResultBudget(24, 'page-item geometry')
        points.push({ x: anchor[0], y: anchor[1] })
      }
    }
    if ((tag.name === 'Link' || tag.name === 'Image') && itemStack.length) {
      const resource = normalizeReference(
        attribute(attributes, 'LinkResourceURI', 'LinkResourceURIEncoded', 'path')
      )
      if (resource) {
        const item = itemStack[itemStack.length - 1].item
        const previousLength = item.externalResource?.length || 0
        useResultBudget(Math.max(0, resource.length - previousLength) * 2, 'linked resources')
        item.externalResource = resource
      }
    }
  })
  parser.on('text', appendText)
  parser.on('cdata', appendText)
  parser.on('closetag', (tag) => {
    const name = tag.name
    if (name === 'Content' || name === 'pcnt') contentDepth = Math.max(0, contentDepth - 1)
    else if (name === 'CharacterStyleRange') endRun()
    else if (name === 'ParagraphStyleRange' || name === 'txsr') endParagraph()
    else if (name === 'Story' || name === 'cxst') endStory()
    if (
      (LONG_ITEM_NAMES.has(name) || INX_ITEM_NAMES[name]) &&
      itemStack.at(-1)?.sourceName === name
    )
      finishItem()
    if (styleStack.at(-1)?.openName === name) finishStyle()
    tagStack.pop()
    depth = Math.max(0, depth - 1)
  })
  try {
    parser.write(xml).close()
  } catch (error) {
    if (error instanceof InDesignExchangeError) throw error
    fail(
      'INDESIGN_EXCHANGE_XML',
      error instanceof Error ? error.message : 'InDesign exchange XML could not be parsed.'
    )
  }
  if (parserError) fail('INDESIGN_EXCHANGE_XML', parserError.message)
  while (itemStack.length) finishItem()
  while (styleStack.length) finishStyle()
  if (currentStory) endStory()

  const snippetType = aidAttributes.SnippetType
  if (format === 'icml') {
    if (rootElement !== 'Document' || snippetType !== 'InCopyInterchange') {
      fail(
        'INDESIGN_EXCHANGE_SIGNATURE',
        'ICML requires a Document root and the InCopyInterchange snippet marker.'
      )
    }
  } else if (format === 'idms') {
    if (rootElement !== 'Document' || snippetType !== 'PageItem') {
      fail(
        'INDESIGN_EXCHANGE_SIGNATURE',
        'IDMS requires a Document root and the PageItem snippet marker.'
      )
    }
  } else if (rootElement !== 'docu' && rootElement !== 'SnippetRoot') {
    fail('INDESIGN_EXCHANGE_SIGNATURE', 'Legacy INX requires a docu or SnippetRoot root element.')
  }

  const warnings =
    format === 'icml'
      ? ['ICML carries story content and styles but no complete document page geometry.']
      : format === 'idms'
        ? [
            'IDMS is a reusable layout fragment, not a complete InDesign document; linked resources are listed but never fetched.'
          ]
        : [
            'INX uses legacy abbreviated element and attribute names; common page items are visualized, while unmapped legacy records remain an explicit structure inventory.'
          ]
  if (unknownNames.size)
    warnings.push(
      `${unknownNames.size} distinct XML element names are inventoried but not mapped to visual objects.`
    )
  if (items.some((item) => item.externalResource))
    warnings.push(
      'External resource paths are displayed as metadata only and are never loaded by the renderer.'
    )
  useResultBudget(
    512 +
      estimatedStringBytes(
        rootElement,
        rootAttributes.DOMVersion,
        aidAttributes.DOMVersion,
        aidAttributes.product,
        snippetType
      ) +
      estimatedStringCollectionBytes(layers) +
      estimatedStringCollectionBytes(unknownNames) +
      estimatedStringCollectionBytes(warnings),
    'metadata'
  )

  const result: InDesignExchangeDocument = {
    format,
    fidelity:
      format === 'icml'
        ? 'styled-story'
        : format === 'idms'
          ? 'layout-fragment'
          : 'legacy-structure',
    rootElement,
    domVersion: rootAttributes.DOMVersion || aidAttributes.DOMVersion,
    product: aidAttributes.product,
    snippetType,
    stories,
    items,
    colors,
    styles,
    layers: [...layers],
    unknownElementNames: [...unknownNames],
    warnings,
    statistics: {
      bytes: buffer.byteLength,
      nodes,
      maxDepth: maximumDepth,
      textCharacters,
      storyCount: stories.length,
      paragraphCount,
      runCount,
      itemCount: items.length,
      pointCount,
      styleCount: styles.length,
      colorCount: colors.length,
      resultBytes
    }
  }
  result.statistics.resultBytes = Math.max(
    resultBytes,
    estimateStructuredResultBytes(result, limits.maxResultBytes)
  )
  return result
}
