import {
  getCompositeImageData,
  getLayerImageData,
  initializeCanvas,
  readPsd,
  type Layer as AgLayer,
  type PixelData,
  type Psd as AgPsd,
} from 'ag-psd'
import WebtoonPsd, {
  type Layer as WebtoonLayer,
  type Node as WebtoonNode,
  type NodeChild as WebtoonNodeChild,
} from '@webtoon/psd'
import { resolvePhotoshopParseLimits, type PhotoshopParseLimits } from './limits.js'
import { inspectPhotoshopHeader, multiplyPhotoshopDimensions } from './photoshopHeader.js'
import {
  inspectPhotoshopContainer,
  type PhotoshopContainerPreflight,
} from './photoshopPreflight.js'
import type {
  PhotoshopHeader,
  PhotoshopLayerInfo,
  PhotoshopOpenResult,
} from './photoshopProtocol.js'

type LayerPixels = { width: number; height: number; rgba: Uint8ClampedArray }
type LayerDecoder = () => Promise<LayerPixels>

const rgbaBytes = (width: number, height: number) => {
  return multiplyPhotoshopDimensions(width, height, 'Photoshop pixel area') * 4
}

const assertPixelData = (
  pixels: PixelData | { width: number; height: number; data: Uint8ClampedArray } | undefined,
  width: number,
  height: number,
  limits: PhotoshopParseLimits,
  label: string
) => {
  if (!pixels) throw new Error(`${label} does not contain decodable pixel data.`)
  const expected = rgbaBytes(width, height)
  if (pixels.width !== width || pixels.height !== height || pixels.data.byteLength !== expected) {
    throw new Error(`${label} returned invalid ${pixels.width} x ${pixels.height} pixel data.`)
  }
  if (pixels.data.byteLength > limits.maxDecodedBytes) {
    throw new Error(`${label} exceeds the ${limits.maxDecodedBytes}-byte decoded safety limit.`)
  }
  return pixels.data instanceof Uint8ClampedArray
    ? pixels.data
    : new Uint8ClampedArray(pixels.data.buffer, pixels.data.byteOffset, pixels.data.byteLength)
}

const unique = (values: string[]) => [...new Set(values)]

const agSafeLayerKeys = new Set([
  'top', 'left', 'bottom', 'right', 'blendMode', 'opacity', 'clipping',
  'transparencyProtected', 'hidden', 'name', 'linkGroup', 'linkGroupEnabled',
  'rawData', 'id', 'nameSource', 'protected', 'labelColor', 'version',
])

const agLayerInteractionLimits = (layer: AgLayer, group: boolean) => {
  const reasons: string[] = []
  if (group) reasons.push('Layer groups require Photoshop group isolation semantics.')
  if ((layer.blendMode || 'normal') !== 'normal') reasons.push(`Blend mode ${layer.blendMode} is not basic-interactive.`)
  if (layer.opacity != null && Math.abs(layer.opacity - 1) > 0.0001) reasons.push('Layer opacity is not 100%.')
  if (layer.clipping) reasons.push('Clipping layers require Photoshop clipping-stack semantics.')
  if (layer.rawData?.channels.some(channel => channel.id === -2 || channel.id === -3)) {
    reasons.push('Layer masks require Photoshop mask composition semantics.')
  }
  const semanticKeys = Object.keys(layer).filter(key => !agSafeLayerKeys.has(key) && key !== 'children')
  if (semanticKeys.length) reasons.push(`Layer semantics are present: ${semanticKeys.sort().join(', ')}.`)
  return reasons
}

const initializeAgPixelFactory = () => {
  initializeCanvas(
    () => { throw new Error('Canvas allocation is disabled inside the Photoshop parser.') },
    ((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(rgbaBytes(width, height)),
      colorSpace: 'srgb',
    })) as unknown as (width: number, height: number) => ImageData
  )
}

const openAgPsd = async (
  buffer: ArrayBuffer,
  header: PhotoshopHeader,
  limits: PhotoshopParseLimits
): Promise<{
  psd: AgPsd
  layers: PhotoshopLayerInfo[]
  decoders: Map<string, LayerDecoder>
  composite: Uint8ClampedArray
  limits: string[]
}> => {
  initializeAgPixelFactory()
  const psd = readPsd(buffer, {
    useRawData: true,
    useRawThumbnail: true,
    useImageData: true,
    skipLinkedFilesData: true,
    totalMemoryLimit: limits.maxDecodedBytes,
  })
  const layers: PhotoshopLayerInfo[] = []
  const decoders = new Map<string, LayerDecoder>()
  const interactionLimits: string[] = []
  let stackIndex = 0
  const visit = (
    source: readonly AgLayer[],
    depth: number,
    parentId?: string,
    parentHidden = false
  ) => {
    if (depth > limits.maxNestingDepth) {
      throw new Error(`Photoshop layer nesting exceeds the ${limits.maxNestingDepth}-level safety limit.`)
    }
    source.slice().reverse().forEach((layer, panelIndex) => {
      const id = parentId ? `${parentId}.${panelIndex}` : String(panelIndex)
      const children = layer.children || []
      const group = children.length > 0
      const left = Number(layer.left || 0)
      const top = Number(layer.top || 0)
      const width = Math.max(0, Number(layer.right || 0) - left)
      const height = Math.max(0, Number(layer.bottom || 0) - top)
      const hidden = parentHidden || Boolean(layer.hidden)
      let drawable = !group && width > 0 && height > 0 && Boolean(layer.rawData)
      interactionLimits.push(...agLayerInteractionLimits(layer, group))
      if (drawable) {
        const layerArea = multiplyPhotoshopDimensions(width, height, 'Photoshop layer area')
        const layerBytes = rgbaBytes(width, height)
        if (
          width > limits.maxCanvasDimension ||
          height > limits.maxCanvasDimension ||
          layerArea > limits.maxLayerPixels ||
          layerBytes > limits.maxDecodedBytes
        ) {
          interactionLimits.push(
            `Layer ${String(layer.name || id)} exceeds the interactive pixel budget and remains structure-only.`
          )
          drawable = false
        }
      }
      layers.push({
        id,
        parentId,
        kind: group ? 'group' : 'layer',
        name: String(layer.name || (group ? 'Group' : 'Layer')),
        depth,
        left,
        top,
        width,
        height,
        opacity: Math.round(Math.max(0, Math.min(1, layer.opacity ?? 1)) * 255),
        hidden,
        blendMode: String(layer.blendMode || 'normal'),
        clipping: layer.clipping ? 1 : 0,
        text: typeof layer.text?.text === 'string' ? layer.text.text : undefined,
        drawable,
        stackIndex: stackIndex++,
      })
      if (layers.length > limits.maxLayers) {
        throw new Error(`Photoshop document exceeds the ${limits.maxLayers}-layer safety limit.`)
      }
      if (drawable) {
        decoders.set(id, async () => {
          const area = multiplyPhotoshopDimensions(width, height, 'Photoshop layer area')
          if (area > limits.maxLayerPixels) {
            throw new Error(`Photoshop layer exceeds the ${limits.maxLayerPixels}-pixel safety limit.`)
          }
          const pixels = getLayerImageData(layer)
          return { width, height, rgba: assertPixelData(pixels, width, height, limits, `Photoshop layer ${id}`) }
        })
      }
      if (children.length) visit(children, depth + 1, id, hidden)
    })
  }
  visit(psd.children || [], 0)
  if (rgbaBytes(header.width, header.height) > limits.maxDecodedBytes) {
    throw new Error('Photoshop stored composite exceeds the decoded pixel safety limit.')
  }
  const compositePixels = getCompositeImageData(psd)
  return {
    psd,
    layers,
    decoders,
    composite: assertPixelData(compositePixels, header.width, header.height, limits, 'Photoshop stored composite'),
    limits: unique(interactionLimits),
  }
}

type WebtoonInternalProperties = {
  blendMode?: string
  clippingMask?: number
  additionalLayerProperties?: Record<string, unknown>
}

const webtoonInternal = (node: WebtoonNode) => {
  const internal = node as unknown as {
    layerFrame?: {
      channels?: Map<number, { compression?: number }>
      layerProperties?: WebtoonInternalProperties
    }
  }
  return internal.layerFrame || {}
}

const isWebtoonLayer = (node: WebtoonNodeChild): node is WebtoonLayer => node.type === 'Layer'

const webtoonLayerInteractionLimits = (node: WebtoonNodeChild) => {
  const reasons: string[] = []
  if (node.type === 'Group') reasons.push('Layer groups require Photoshop group isolation semantics.')
  if (!isWebtoonLayer(node)) return reasons
  const internal = webtoonInternal(node)
  const properties = internal.layerProperties || {}
  if ((properties.blendMode || 'norm') !== 'norm') reasons.push(`Blend mode ${properties.blendMode} is not basic-interactive.`)
  if (node.opacity !== 255) reasons.push('Layer opacity is not 100%.')
  if (properties.clippingMask) reasons.push('Clipping layers require Photoshop clipping-stack semantics.')
  if (internal.channels?.has(-2) || internal.channels?.has(-3)) {
    reasons.push('Layer masks require Photoshop mask composition semantics.')
  }
  if ([...(internal.channels?.values() || [])].some(channel => Number(channel.compression) > 1)) {
    reasons.push('ZIP-compressed layer channels are not supported by the interactive pixel decoder.')
  }
  const semanticKeys = Object.keys(properties.additionalLayerProperties || {})
    .filter(key => !['luni', 'lyid'].includes(key))
  if (semanticKeys.length) reasons.push(`Layer semantics are present: ${semanticKeys.sort().join(', ')}.`)
  return reasons
}

const openWebtoonPsb = async (
  buffer: ArrayBuffer,
  header: PhotoshopHeader,
  limits: PhotoshopParseLimits,
  preflight: PhotoshopContainerPreflight
): Promise<{
  psd: WebtoonPsd
  layers: PhotoshopLayerInfo[]
  decoders: Map<string, LayerDecoder>
  composite: Uint8ClampedArray
  limits: string[]
}> => {
  const baseChannelCount = header.colorMode === 3 ? 3 : 1
  if (header.channels !== baseChannelCount) {
    throw new Error(
      `PSB ${header.colorMode === 3 ? 'RGB' : 'grayscale'} composite has ${header.channels} channels; ` +
      `only ${baseChannelCount} color channel${baseChannelCount === 1 ? '' : 's'} without auxiliary alpha/spot channels ` +
      'are enabled until merged-transparency semantics have Photoshop-reference coverage.'
    )
  }
  const psd = WebtoonPsd.parse(buffer)
  const layers: PhotoshopLayerInfo[] = []
  const decoders = new Map<string, LayerDecoder>()
  const interactionLimits: string[] = []
  interactionLimits.push(
    'PSB layer composition remains read-only until Photoshop-authored PSB semantics have reference-verified interactive coverage.'
  )
  let stackIndex = 0
  const visit = (
    source: readonly WebtoonNodeChild[],
    depth: number,
    parentId?: string,
    parentHidden = false
  ) => {
    if (depth > limits.maxNestingDepth) {
      throw new Error(`Photoshop layer nesting exceeds the ${limits.maxNestingDepth}-level safety limit.`)
    }
    source.forEach((node, index) => {
      const id = parentId ? `${parentId}.${index}` : String(index)
      const internal = webtoonInternal(node)
      const properties = internal.layerProperties || {}
      const layer = isWebtoonLayer(node) ? node : undefined
      const hidden = parentHidden || Boolean(layer?.isHidden)
      const width = layer?.width || 0
      const height = layer?.height || 0
      let drawable = Boolean(layer && width > 0 && height > 0)
      interactionLimits.push(...webtoonLayerInteractionLimits(node))
      if (drawable) {
        const layerArea = multiplyPhotoshopDimensions(width, height, 'Photoshop layer area')
        const layerBytes = rgbaBytes(width, height)
        if (
          width > limits.maxCanvasDimension ||
          height > limits.maxCanvasDimension ||
          layerArea > limits.maxLayerPixels ||
          layerBytes > limits.maxDecodedBytes
        ) {
          interactionLimits.push(
            `Layer ${String(node.name || id)} exceeds the interactive pixel budget and remains structure-only.`
          )
          drawable = false
        }
      }
      layers.push({
        id,
        parentId,
        kind: layer ? 'layer' : 'group',
        name: String(node.name || (layer ? 'Layer' : 'Group')),
        depth,
        left: layer?.left || 0,
        top: layer?.top || 0,
        width,
        height,
        opacity: node.opacity,
        hidden,
        blendMode: properties.blendMode || 'norm',
        clipping: properties.clippingMask || 0,
        text: layer?.text,
        drawable,
        stackIndex: stackIndex++,
      })
      if (layers.length > limits.maxLayers) {
        throw new Error(`Photoshop document exceeds the ${limits.maxLayers}-layer safety limit.`)
      }
      if (layer && drawable) {
        decoders.set(id, async () => {
          const area = multiplyPhotoshopDimensions(width, height, 'Photoshop layer area')
          if (area > limits.maxLayerPixels) {
            throw new Error(`Photoshop layer exceeds the ${limits.maxLayerPixels}-pixel safety limit.`)
          }
          const rgba = await layer.composite(true, true)
          if (rgba.byteLength !== rgbaBytes(width, height) || rgba.byteLength > limits.maxDecodedBytes) {
            throw new Error(`Photoshop layer ${id} returned an invalid pixel buffer.`)
          }
          return { width, height, rgba }
        })
      }
      if (node.type === 'Group') visit(node.children, depth + 1, id, hidden)
    })
  }
  visit(psd.children, 0)
  if (rgbaBytes(header.width, header.height) > limits.maxDecodedBytes) {
    throw new Error('Photoshop stored composite exceeds the decoded pixel safety limit.')
  }
  let composite: Uint8ClampedArray
  if (preflight.compositeCompression === 0) {
    const planeBytes = multiplyPhotoshopDimensions(header.width, header.height, 'PSB raw composite plane')
    const encodedBytes = multiplyPhotoshopDimensions(planeBytes, header.channels, 'PSB raw composite data')
    const encodedEnd = preflight.compositeDataOffset + encodedBytes
    if (!Number.isSafeInteger(encodedEnd) || encodedEnd !== buffer.byteLength) {
      throw new Error(
        `PSB raw composite length is invalid: expected ${encodedBytes} bytes through end-of-file, ` +
        `found ${Math.max(0, buffer.byteLength - preflight.compositeDataOffset)}.`
      )
    }
    const planes = new Uint8Array(buffer, preflight.compositeDataOffset, encodedBytes)
    composite = new Uint8ClampedArray(rgbaBytes(header.width, header.height))
    for (let pixel = 0; pixel < planeBytes; pixel += 1) {
      const target = pixel * 4
      if (header.colorMode === 3) {
        composite[target] = planes[pixel]
        composite[target + 1] = planes[planeBytes + pixel]
        composite[target + 2] = planes[planeBytes * 2 + pixel]
      } else {
        composite[target] = planes[pixel]
        composite[target + 1] = planes[pixel]
        composite[target + 2] = planes[pixel]
      }
      composite[target + 3] = 255
    }
  } else {
    composite = await psd.composite()
  }
  if (composite.byteLength !== rgbaBytes(header.width, header.height) || composite.byteLength > limits.maxDecodedBytes) {
    throw new Error('Photoshop stored composite returned an invalid pixel buffer.')
  }
  return { psd, layers, decoders, composite, limits: unique(interactionLimits) }
}

export class PhotoshopDocumentSession {
  readonly header: PhotoshopHeader
  readonly limits: PhotoshopParseLimits
  readonly layers: PhotoshopLayerInfo[]
  private readonly decoders: Map<string, LayerDecoder>
  private engineDocument: AgPsd | WebtoonPsd | undefined

  private constructor(
    header: PhotoshopHeader,
    limits: PhotoshopParseLimits,
    layers: PhotoshopLayerInfo[],
    decoders: Map<string, LayerDecoder>,
    engineDocument: AgPsd | WebtoonPsd
  ) {
    this.header = header
    this.limits = limits
    this.layers = layers
    this.decoders = decoders
    this.engineDocument = engineDocument
  }

  static async open(
    buffer: ArrayBuffer,
    inputLimits?: Partial<PhotoshopParseLimits>
  ): Promise<{ session: PhotoshopDocumentSession; result: PhotoshopOpenResult }> {
    const limits = resolvePhotoshopParseLimits(inputLimits)
    const header = inspectPhotoshopHeader(buffer, limits)
    const preflight = inspectPhotoshopContainer(buffer, header)
    if (header.version === 1) {
      const baseChannelCount = header.colorMode === 3 ? 3 : 1
      const hasVerifiedMergedAlpha =
        header.channels === baseChannelCount + 1 && preflight.mergedTransparencyPresent
      if (header.channels !== baseChannelCount && !hasVerifiedMergedAlpha) {
        throw new Error(
          `PSD ${header.colorMode === 3 ? 'RGB' : 'grayscale'} composite has ${header.channels} channels, but the layer section ` +
          `${preflight.mergedTransparencyPresent ? 'does' : 'does not'} declare merged transparency. ` +
          `Only ${baseChannelCount} color channel${baseChannelCount === 1 ? '' : 's'}, or one declared merged-transparency channel, ` +
          'can be rendered without confusing saved selection/spot channels with display alpha.'
        )
      }
    }
    if (preflight.compositeCompression > 1) {
      throw new Error(
        `Photoshop composite uses ZIP compression method ${preflight.compositeCompression}; ` +
        'the current pixel engines support only raw and PackBits RLE composites.'
      )
    }
    const opened = header.version === 1
      ? await openAgPsd(buffer, header, limits)
      : await openWebtoonPsb(buffer, header, limits, preflight)
    const session = new PhotoshopDocumentSession(header, limits, opened.layers, opened.decoders, opened.psd)
    return {
      session,
      result: {
        header,
        layers: opened.layers,
        composite: opened.composite,
        engine: header.version === 1 ? 'ag-psd' : 'webtoon-psd',
        fidelity: 'stored-composite',
        compositeCompression: preflight.compositeCompression === 0 ? 'raw' : 'rle',
        colorProfile: preflight.iccProfilePresent ? 'embedded-unconverted' : 'none-or-srgb-assumed',
        layerInteraction: opened.limits.length ? 'structure-only' : 'basic',
        layerInteractionLimits: opened.limits,
      },
    }
  }

  async renderLayer(layerId: string) {
    const decoder = this.decoders.get(layerId)
    if (!decoder) throw new Error(`Photoshop layer ${layerId} is not drawable.`)
    return decoder()
  }

  destroy() {
    this.decoders.clear()
    this.engineDocument = undefined
  }
}
