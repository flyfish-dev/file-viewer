/// <reference lib="webworker" />
import { parseAdobePalette } from './designResourceParser.js'
import { readFlaContainer } from './flaContainer.js'
import { readInDesignContainer } from './indesignContainer.js'
import { parseInDesignExchange } from './indesignExchangeParser.js'
import { readXdContainer } from './xdContainer.js'
import type {
  AdobeContainerWorkerRequest,
  AdobeContainerWorkerResponse,
  AdobeContainerWorkerResult,
} from './adobeContainerProtocol.js'

const scope = self as unknown as DedicatedWorkerGlobalScope

const resultTransferables = (result: AdobeContainerWorkerResult): Transferable[] => {
  if ((result.format === 'xd' || result.format === 'indd' || result.format === 'indt') && result.preview) {
    const buffer = result.preview.bytes.buffer
    return buffer instanceof ArrayBuffer ? [buffer] : []
  }
  return []
}

scope.addEventListener('message', async (event: MessageEvent<AdobeContainerWorkerRequest>) => {
  const request = event.data
  try {
    if (!request || request.type !== 'parse' || !(request.buffer instanceof ArrayBuffer)) {
      throw new Error('Invalid Adobe container Worker request.')
    }
    let result: AdobeContainerWorkerResult
    switch (request.format) {
      case 'xd':
        result = await readXdContainer(request.buffer, request.limits)
        break
      case 'indd':
      case 'indt':
        result = readInDesignContainer(request.buffer, request.format, request.limits)
        break
      case 'ase':
      case 'aco':
        result = parseAdobePalette(request.buffer, request.format, request.limits)
        break
      case 'fla':
      case 'xfl':
        result = await readFlaContainer(request.buffer, request.format, request.limits)
        break
      case 'icml':
      case 'idms':
      case 'inx':
        result = parseInDesignExchange(request.buffer, request.format, request.limits)
        break
      default:
        throw new Error('Unsupported Adobe container Worker format.')
    }
    const response: AdobeContainerWorkerResponse = { id: request.id, ok: true, result }
    scope.postMessage(response, resultTransferables(result))
  } catch (error) {
    const response: AdobeContainerWorkerResponse = {
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
