import type { IdmlSafetyLimits } from './idmlLimits.js'
import type {
  IdmlFrameTreeNode,
  IdmlNodeAddress,
  IdmlPageTree,
  IdmlSpreadTreeNode
} from './idmlProtocol.js'

export class IdmlTreeError extends Error {
  readonly code = 'IDML_TREE_INVALID'

  constructor(message: string) {
    super(message)
    this.name = 'IdmlTreeError'
  }
}

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new IdmlTreeError(`${label} must be an object.`)
  }
  return value as Record<string, unknown>
}

const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new IdmlTreeError(`${label} must be an array.`)
  return value
}

const boundedString = (value: unknown, label: string, maxLength: number) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new IdmlTreeError(
      `${label} must be a non-empty string no longer than ${maxLength} characters.`
    )
  }
  return value
}

const nonNegativeInteger = (value: unknown, label: string) => {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new IdmlTreeError(`${label} must be a non-negative integer.`)
  }
  return Number(value)
}

const parseAddress = (value: unknown, label: string): IdmlNodeAddress => {
  const source = record(value, label)
  return {
    kind: boundedString(source.kind, `${label}.kind`, 128),
    id: boundedString(source.id, `${label}.id`, 2_048)
  }
}

const parseFrame = (value: unknown, label: string): IdmlFrameTreeNode => {
  const source = record(value, label)
  return {
    id: parseAddress(source.id, `${label}.id`),
    label: boundedString(source.label, `${label}.label`, 512)
  }
}

export const parseIdmlInspectorTree = (json: string, limits: IdmlSafetyLimits): IdmlPageTree => {
  if (typeof json !== 'string')
    throw new IdmlTreeError('Inspector tree output must be a JSON string.')
  if (json.length > limits.maxTreeJsonBytes) {
    throw new IdmlTreeError(
      `Inspector tree exceeds the ${limits.maxTreeJsonBytes}-byte safety limit.`
    )
  }
  const encodedLength = new TextEncoder().encode(json).byteLength
  if (encodedLength > limits.maxTreeJsonBytes) {
    throw new IdmlTreeError(
      `Inspector tree exceeds the ${limits.maxTreeJsonBytes}-byte safety limit.`
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new IdmlTreeError('Inspector tree is not valid JSON.')
  }
  const root = record(parsed, 'Inspector tree')
  const rawSpreads = array(root.spreads, 'Inspector tree spreads')
  if (rawSpreads.length > limits.maxPages) {
    throw new IdmlTreeError('Inspector tree contains more spreads than the configured page limit.')
  }

  let pageCount = 0
  let frameCount = 0
  const spreads: IdmlSpreadTreeNode[] = rawSpreads.map((spreadValue, spreadPosition) => {
    const spread = record(spreadValue, `Spread ${spreadPosition}`)
    const spreadIndex = nonNegativeInteger(spread.index, `Spread ${spreadPosition}.index`)
    const rawPages = array(spread.pages, `Spread ${spreadPosition}.pages`)
    const pages = rawPages.map((pageValue, pagePosition) => {
      if (pageCount >= limits.maxPages) {
        throw new IdmlTreeError(`Inspector tree exceeds the ${limits.maxPages}-page safety limit.`)
      }
      const page = record(pageValue, `Spread ${spreadPosition} page ${pagePosition}`)
      const frames = array(page.frames, `Spread ${spreadPosition} page ${pagePosition}.frames`).map(
        (frame, framePosition) => {
          frameCount += 1
          if (frameCount > limits.maxFrames) {
            throw new IdmlTreeError(
              `Inspector tree exceeds the ${limits.maxFrames}-frame safety limit.`
            )
          }
          return parseFrame(
            frame,
            `Spread ${spreadPosition} page ${pagePosition} frame ${framePosition}`
          )
        }
      )
      const result = {
        index: pageCount,
        indexInSpread: nonNegativeInteger(
          page.index,
          `Spread ${spreadPosition} page ${pagePosition}.index`
        ),
        spreadIndex,
        label: boundedString(
          page.label,
          `Spread ${spreadPosition} page ${pagePosition}.label`,
          512
        ),
        frames
      }
      pageCount += 1
      return result
    })
    return {
      index: spreadIndex,
      label: boundedString(spread.label, `Spread ${spreadPosition}.label`, 512),
      pages
    }
  })
  if (pageCount === 0) throw new IdmlTreeError('Inspector tree does not contain any pages.')
  return { spreads, pageCount, frameCount }
}
