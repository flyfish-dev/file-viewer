/// <reference lib="webworker" />
import { IdmlDocumentSession } from './idmlEngine.js'
import { IdmlPreflightError } from './idmlPreflight.js'
import type { IdmlWorkerRequest, IdmlWorkerResponse } from './idmlProtocol.js'

const scope = self as unknown as DedicatedWorkerGlobalScope
let documentSession: IdmlDocumentSession | undefined

const errorCode = (error: unknown) => {
  if (error instanceof IdmlPreflightError) return error.code
  if (
    error instanceof Error &&
    'code' in error &&
    typeof (error as Error & { code?: unknown }).code === 'string'
  ) {
    return (error as Error & { code: string }).code
  }
  return 'IDML_ENGINE_FAILURE'
}

const processRequest = async (request: IdmlWorkerRequest) => {
  try {
    if (request.type === 'open') {
      documentSession?.destroy()
      documentSession = undefined
      const session = await IdmlDocumentSession.open(request.buffer, request.limits, {
        wasmUrl: request.wasmUrl
      })
      documentSession = session
      const response: IdmlWorkerResponse = {
        id: request.id,
        ok: true,
        type: 'open',
        result: session.opened
      }
      scope.postMessage(response)
      return
    }
    if (request.type === 'destroy') {
      documentSession?.destroy()
      documentSession = undefined
      const response: IdmlWorkerResponse = { id: request.id, ok: true, type: 'destroy' }
      scope.postMessage(response)
      return
    }
    if (!documentSession) throw new Error('IDML Worker has no open document.')
    const result = await documentSession.renderPage(request.pageIndex, request.dpi)
    const response: IdmlWorkerResponse = {
      id: request.id,
      ok: true,
      type: 'renderPage',
      result
    }
    scope.postMessage(response, [result.rgba.buffer as ArrayBuffer])
  } catch (error) {
    const code = errorCode(error)
    const response: IdmlWorkerResponse = {
      id: request.id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        code,
        message: error instanceof Error ? error.message : String(error),
        fatal: request.type === 'open' || code === 'IDML_PNG_INVALID' || error instanceof RangeError
      }
    }
    scope.postMessage(response)
  }
}

let operationQueue = Promise.resolve()
scope.addEventListener('message', (event: MessageEvent<IdmlWorkerRequest>) => {
  operationQueue = operationQueue.catch(() => undefined).then(() => processRequest(event.data))
})
