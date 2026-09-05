import { resolvePhotoshopParseLimits, type PhotoshopParseLimits } from './limits.js'
import type { PhotoshopHeader } from './photoshopProtocol.js'

const PSD_SIGNATURE = '8BPS'

export const multiplyPhotoshopDimensions = (left: number, right: number, label: string) => {
  const result = left * right
  if (!Number.isSafeInteger(result)) throw new Error(`${label} exceeds the safe integer range.`)
  return result
}

export const inspectPhotoshopHeader = (
  buffer: ArrayBuffer,
  inputLimits?: Partial<PhotoshopParseLimits>
): PhotoshopHeader => {
  const limits = resolvePhotoshopParseLimits(inputLimits)
  if (buffer.byteLength < 26) throw new Error('Photoshop file is shorter than the 26-byte header.')
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`Photoshop file exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  }
  const bytes = new Uint8Array(buffer, 0, 26)
  const signature = String.fromCharCode(...bytes.subarray(0, 4))
  if (signature !== PSD_SIGNATURE) throw new Error('Photoshop signature 8BPS was not found.')
  const view = new DataView(buffer, 0, 26)
  const version = view.getUint16(4, false)
  if (version !== 1 && version !== 2) throw new Error(`Unsupported Photoshop version ${version}.`)
  for (let index = 6; index < 12; index += 1) {
    if (bytes[index] !== 0) throw new Error('Photoshop reserved header bytes must be zero.')
  }
  const channels = view.getUint16(12, false)
  const height = view.getUint32(14, false)
  const width = view.getUint32(18, false)
  const depth = view.getUint16(22, false)
  const colorMode = view.getUint16(24, false)
  if (channels < 1 || channels > 56) throw new Error(`Invalid Photoshop channel count ${channels}.`)
  const specMaxDimension = version === 1 ? 30_000 : 300_000
  if (width < 1 || height < 1 || width > specMaxDimension || height > specMaxDimension) {
    throw new Error(`Invalid Photoshop canvas ${width} x ${height}.`)
  }
  if (width > limits.maxCanvasDimension || height > limits.maxCanvasDimension) {
    throw new Error(
      `Photoshop canvas ${width} x ${height} exceeds the ${limits.maxCanvasDimension}-pixel browser dimension limit.`
    )
  }
  const pixels = multiplyPhotoshopDimensions(width, height, 'Photoshop canvas area')
  if (pixels > limits.maxCanvasPixels) {
    throw new Error(`Photoshop canvas exceeds the ${limits.maxCanvasPixels}-pixel safety limit.`)
  }
  if (depth !== 8 || ![1, 3].includes(colorMode)) {
    throw new Error(
      `Photoshop ${depth}-bit color mode ${colorMode} is structure-readable but cannot be rendered safely by the current pixel engines; ` +
      'only 8-bit grayscale and RGB are enabled.'
    )
  }
  return { version, channels, width, height, depth, colorMode }
}
