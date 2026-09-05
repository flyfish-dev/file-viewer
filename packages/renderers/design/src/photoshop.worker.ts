/// <reference lib="webworker" />
import { PhotoshopDocumentSession } from './photoshopParser.js'
import type { PhotoshopWorkerRequest, PhotoshopWorkerResponse } from './photoshopProtocol.js'

const scope = self as unknown as DedicatedWorkerGlobalScope
let documentSession: PhotoshopDocumentSession | undefined

const processRequest = async (request: PhotoshopWorkerRequest) => {
  try {
    if (request.type === 'open') {
      documentSession?.destroy()
      documentSession = undefined
      const opened = await PhotoshopDocumentSession.open(request.buffer, request.limits)
      documentSession = opened.session
      const response: PhotoshopWorkerResponse = {
        id: request.id,
        ok: true,
        type: 'open',
        result: opened.result,
      }
      scope.postMessage(response, [opened.result.composite.buffer as ArrayBuffer])
      return
    }
    if (!documentSession) throw new Error('Photoshop Worker has no open document.')
    const result = await documentSession.renderLayer(request.layerId)
    const response: PhotoshopWorkerResponse = {
      id: request.id,
      ok: true,
      type: 'layer',
      layerId: request.layerId,
      ...result,
    }
    scope.postMessage(response, [result.rgba.buffer as ArrayBuffer])
  } catch (error) {
    const response: PhotoshopWorkerResponse = {
      id: request.id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        fatal: request.type === 'open' || error instanceof RangeError,
      },
    }
    scope.postMessage(response)
  }
}

let operationQueue = Promise.resolve()
scope.addEventListener('message', (event: MessageEvent<PhotoshopWorkerRequest>) => {
  const request = event.data
  operationQueue = operationQueue
    .catch(() => undefined)
    .then(() => processRequest(request))
})
