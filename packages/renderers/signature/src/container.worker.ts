/// <reference lib="webworker" />
import { inspectAsicContainer } from './structured/asic.js'
import { normalizeSignatureContainerLimits } from './structured/limits.js'
import type { AsicWorkerRequest, AsicWorkerResponse } from './structured/containerProtocol.js'

const scope = self as unknown as DedicatedWorkerGlobalScope

const errorResponse = (id: string, error: unknown): AsicWorkerResponse => ({
  id,
  ok: false,
  error: {
    code:
      error instanceof Error &&
      /unsafe|limit|exceed|zip|path|entry|crc|compression/iu.test(error.message)
        ? 'unsafe-archive'
        : error instanceof Error
          ? 'invalid-input'
          : 'internal-parser-error',
    message: error instanceof Error ? error.message : String(error)
  }
})

scope.addEventListener('message', async (event: MessageEvent<AsicWorkerRequest>) => {
  const request = event.data
  if (
    !request ||
    typeof request.id !== 'string' ||
    request.type !== 'inspect-asic' ||
    !(request.input instanceof ArrayBuffer)
  ) {
    scope.postMessage(
      errorResponse(
        typeof request?.id === 'string' ? request.id : 'unknown',
        new Error('Invalid ASiC Worker request.')
      )
    )
    return
  }
  try {
    const result = await inspectAsicContainer(
      request.input,
      normalizeSignatureContainerLimits(request.limits)
    )
    const transfers: Transferable[] = []
    for (const member of [...result.documents, ...result.signatures]) {
      if (member.data) transfers.push(member.data.buffer as ArrayBuffer)
    }
    scope.postMessage({ id: request.id, ok: true, result } satisfies AsicWorkerResponse, transfers)
  } catch (error) {
    scope.postMessage(errorResponse(request.id, error))
  }
})
