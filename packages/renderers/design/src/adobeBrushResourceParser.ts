import {
  readAbr,
  readCsh,
  type BezierPath,
  type BrushShape,
} from 'ag-psd'
import { inspectAdobeBrushLibrary, inspectAdobeCustomShapeLibrary } from './adobeBrushPreflight.js'
import type { PhotoshopParseLimits } from './limits.js'
import type {
  AdobeBrushLibraryDocument,
  AdobeBrushPresetSummary,
  AdobeBrushResourceDocument,
  AdobeBrushResourceFormat,
  AdobeBrushShapeSummary,
  AdobeCustomShapeLibraryDocument,
  AdobeCustomShapePathPreview,
} from './adobeBrushResourceProtocol.js'

const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label} is not finite.`)
  return value
}

const boundedName = (value: string, limits: PhotoshopParseLimits, label: string) => {
  if (value.length > limits.maxResourceNameCodeUnits) {
    throw new Error(`${label} exceeds the ${limits.maxResourceNameCodeUnits}-code-unit name limit.`)
  }
  return value
}

const summarizeShape = (shape: BrushShape, limits: PhotoshopParseLimits, label: string): AdobeBrushShapeSummary => {
  const size = finite(shape.size, `${label} size`)
  const angle = finite(shape.angle, `${label} angle`)
  if (size < 0 || size > limits.maxCanvasDimension) {
    throw new Error(`${label} size exceeds the ${limits.maxCanvasDimension}-pixel side limit.`)
  }
  const summary: AdobeBrushShapeSummary = { type: shape.type, size, angle }
  if ('roundness' in shape) summary.roundness = finite(shape.roundness, `${label} roundness`)
  if ('hardness' in shape) summary.hardness = finite(shape.hardness, `${label} hardness`)
  if ('spacing' in shape) summary.spacing = finite(shape.spacing, `${label} spacing`)
  if (shape.type === 'sampled') {
    summary.sampledDataId = boundedName(shape.sampledData, limits, `${label} sampled-data id`)
  }
  return summary
}

const summarizeBrush = (brush: ReturnType<typeof readAbr>['brushes'][number], limits: PhotoshopParseLimits): AdobeBrushPresetSummary => ({
  name: boundedName(brush.name, limits, 'ABR brush name'),
  shape: summarizeShape(brush.shape, limits, `ABR brush ${JSON.stringify(brush.name)}`),
  hasDynamics: Boolean(brush.shapeDynamics || brush.scatter || brush.colorDynamics || brush.transfer || brush.brushPose),
  hasTexture: Boolean(brush.texture),
  hasDualBrush: Boolean(brush.dualBrush),
  ...(brush.toolOptions?.type ? { toolType: brush.toolOptions.type } : {}),
})

const parseAbr = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobeBrushLibraryDocument => {
  const preflight = inspectAdobeBrushLibrary(buffer, limits)
  const parsed = readAbr(new Uint8Array(buffer), { logMissingFeatures: false })
  const totalItems = parsed.brushes.length + parsed.samples.length + parsed.patterns.length
  if (totalItems > limits.maxResourceItems) {
    throw new Error(`ABR decoded resources exceed the ${limits.maxResourceItems}-item safety limit.`)
  }
  let decodedBytes = 0
  let previewPixels = 0
  const samples = parsed.samples.map((sample, index) => {
    const { w: width, h: height, x, y } = sample.bounds
    const pixels = width * height
    if (!Number.isSafeInteger(pixels) || pixels <= 0 || sample.alpha.byteLength !== pixels) {
      throw new Error(`ABR sample ${index} returned inconsistent decoded pixels.`)
    }
    previewPixels += pixels
    decodedBytes += sample.alpha.byteLength
    return {
      id: boundedName(sample.id, limits, `ABR sample ${index} id`),
      x: finite(x, `ABR sample ${index} x`),
      y: finite(y, `ABR sample ${index} y`),
      width,
      height,
      alpha: sample.alpha,
    }
  })
  const patterns = parsed.patterns.map((pattern, index) => {
    const { w: width, h: height, x, y } = pattern.bounds
    const pixels = width * height
    if (!Number.isSafeInteger(pixels) || pixels <= 0 || pattern.data.byteLength !== pixels * 4) {
      throw new Error(`ABR pattern ${index} returned inconsistent decoded pixels.`)
    }
    previewPixels += pixels
    decodedBytes += pattern.data.byteLength
    return {
      id: boundedName(pattern.id, limits, `ABR pattern ${index} id`),
      name: boundedName(pattern.name, limits, `ABR pattern ${index} name`),
      x: finite(x, `ABR pattern ${index} x`),
      y: finite(y, `ABR pattern ${index} y`),
      width,
      height,
      rgba: pattern.data,
    }
  })
  if (previewPixels !== preflight.previewPixels || previewPixels > limits.maxResourcePreviewPixels) {
    throw new Error('ABR decoded preview pixels do not match the bounded preflight result.')
  }
  if (decodedBytes !== preflight.decodedBytes || decodedBytes > limits.maxDecodedBytes) {
    throw new Error('ABR decoded byte count does not match the bounded preflight result.')
  }
  return {
    format: 'abr',
    version: `${preflight.majorVersion}.${preflight.minorVersion}`,
    engine: 'ag-psd',
    fidelity: 'decoded-tip-and-metadata-preview',
    brushes: parsed.brushes.map(brush => summarizeBrush(brush, limits)),
    samples,
    patterns,
    limitations: [
      'The preview shows decoded tip alpha, embedded pattern pixels, and preset metadata; it does not simulate a painted stroke.',
      'Legacy ABR versions 1 and 2 and 16-bit RLE brush samples are rejected because the decoding engine does not implement them.',
    ],
  }
}

const number = (value: number) => {
  const normalized = Math.abs(value) < 1e-9 ? 0 : value
  return Number(normalized.toFixed(4)).toString()
}

const pathToSvg = (path: BezierPath, label: string): AdobeCustomShapePathPreview => {
  if (!path.knots.length) return { d: '', fillRule: path.fillRule, ...(path.operation ? { operation: path.operation } : {}) }
  const points = path.knots.map((knot, index) => {
    if (knot.points.length !== 6 || knot.points.some(value => !Number.isFinite(value))) {
      throw new Error(`${label} knot ${index} has invalid Bezier coordinates.`)
    }
    return knot.points
  })
  const first = points[0]
  let d = `M ${number(first[2])} ${number(first[3])}`
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    d += ` C ${number(previous[4])} ${number(previous[5])} ${number(current[0])} ${number(current[1])} ${number(current[2])} ${number(current[3])}`
  }
  if (!path.open) {
    const last = points.at(-1)!
    d += ` C ${number(last[4])} ${number(last[5])} ${number(first[0])} ${number(first[1])} ${number(first[2])} ${number(first[3])} Z`
  }
  return { d, fillRule: path.fillRule, ...(path.operation ? { operation: path.operation } : {}) }
}

const parseCsh = (buffer: ArrayBuffer, limits: PhotoshopParseLimits): AdobeCustomShapeLibraryDocument => {
  const preflight = inspectAdobeCustomShapeLibrary(buffer, limits)
  const parsed = readCsh(new Uint8Array(buffer))
  if (parsed.shapes.length !== preflight.shapes) throw new Error('CSH decoded shape count does not match its bounded preflight result.')
  let pathCount = 0
  let knotCount = 0
  const maximumRecords = Math.min(1_000_000, limits.maxResourceItems * 64)
  const shapes = parsed.shapes.map((shape, shapeIndex) => {
    if (!Number.isSafeInteger(shape.width) || !Number.isSafeInteger(shape.height) || shape.width <= 0 || shape.height <= 0) {
      throw new Error(`CSH shape ${shapeIndex} has invalid dimensions.`)
    }
    pathCount += shape.paths.length
    const paths = shape.paths.map((path, pathIndex) => {
      knotCount += path.knots.length
      return pathToSvg(path, `CSH shape ${shapeIndex} path ${pathIndex}`)
    })
    if (pathCount + knotCount > maximumRecords) throw new Error(`CSH decoded path complexity exceeds the ${maximumRecords}-record safety limit.`)
    return {
      id: boundedName(shape.id, limits, `CSH shape ${shapeIndex} id`),
      name: boundedName(shape.name, limits, `CSH shape ${shapeIndex} name`),
      width: shape.width,
      height: shape.height,
      paths,
      hasUnsupportedBooleanComposition: shape.paths.some(path => path.operation && path.operation !== 'combine'),
    }
  })
  return {
    format: 'csh',
    version: '2',
    engine: 'ag-psd',
    fidelity: 'vector-path-preview',
    shapes,
    limitations: [
      'Bezier geometry is preserved, but Photoshop exclude/subtract/intersect path operations are exposed as metadata rather than rasterized with Photoshop composition semantics.',
      'The preview does not include Photoshop tool presets, fills, strokes, or effects because CSH stores custom-shape paths rather than a styled document.',
    ],
  }
}

export const parseAdobeBrushResource = (
  buffer: ArrayBuffer,
  format: AdobeBrushResourceFormat,
  limits: PhotoshopParseLimits
): AdobeBrushResourceDocument => format === 'abr' ? parseAbr(buffer, limits) : parseCsh(buffer, limits)
