/// <reference lib="webworker" />
import { parseAdobeBrushResource } from './adobeBrushResourceParser.js'
import { parseAdobePresetResource } from './adobePresetParser.js'
import type {
  AdobeBrushResourceDocument,
  AdobeBrushResourceWorkerRequest,
  AdobeBrushResourceWorkerResponse,
} from './adobeBrushResourceProtocol.js'
import type {
  AdobePresetDocument,
  AdobePresetWorkerRequest,
  AdobePresetWorkerResponse,
} from './adobePresetProtocol.js'

const scope = self as unknown as DedicatedWorkerGlobalScope

const transferables = (result: AdobeBrushResourceDocument | AdobePresetDocument): Transferable[] => {
  if (result.format === 'abr') {
    return [
      ...result.samples.map(sample => sample.alpha.buffer),
      ...result.patterns.map(pattern => pattern.rgba.buffer),
    ].filter((value): value is ArrayBuffer => value instanceof ArrayBuffer)
  }
  if (result.format === 'pat') return result.patterns.map(pattern => pattern.rgba.buffer).filter((value): value is ArrayBuffer => value instanceof ArrayBuffer)
  if (result.format === 'grd') return result.gradients.map(gradient => gradient.previewRgba.buffer).filter((value): value is ArrayBuffer => value instanceof ArrayBuffer)
  if (result.format === 'asl') return result.patterns.map(pattern => pattern.rgba.buffer).filter((value): value is ArrayBuffer => value instanceof ArrayBuffer)
  return []
}

scope.addEventListener('message', (event: MessageEvent<AdobeBrushResourceWorkerRequest | AdobePresetWorkerRequest>) => {
  const request = event.data
  try {
    if (!request || (request.type !== 'parse' && request.type !== 'parse-preset')) throw new Error('Invalid Adobe resource Worker request.')
    if (request.type === 'parse-preset') {
      const result = parseAdobePresetResource(request.buffer, request.format, request.limits)
      const response: AdobePresetWorkerResponse = { id: request.id, ok: true, result }
      scope.postMessage(response, transferables(result))
    } else {
      const result = parseAdobeBrushResource(request.buffer, request.format, request.limits)
      const response: AdobeBrushResourceWorkerResponse = { id: request.id, ok: true, result }
      scope.postMessage(response, transferables(result))
    }
  } catch (error) {
    const response: AdobeBrushResourceWorkerResponse | AdobePresetWorkerResponse = {
      id: request?.id ?? 0,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
      },
    }
    scope.postMessage(response)
  }
})
