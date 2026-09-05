import {
  resolveFileViewerAdobeResourceWorkerUrl,
  type FileViewerDesignOptions,
} from '@file-viewer/core'
import { resolvePhotoshopParseLimits } from './limits.js'
import type {
  AdobeBrushResourceDocument,
  AdobeBrushResourceFormat,
  AdobeBrushResourceWorkerRequest,
  AdobeBrushResourceWorkerResponse,
} from './adobeBrushResourceProtocol.js'

const abortError = () => new DOMException('Adobe resource parsing was aborted.', 'AbortError')

export const parseAdobeBrushResourceInWorker = async (
  buffer: ArrayBuffer,
  format: AdobeBrushResourceFormat,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
): Promise<AdobeBrushResourceDocument> => {
  if (signal?.aborted) throw abortError()
  const limits = resolvePhotoshopParseLimits(options)
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`${format.toUpperCase()} source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  }
  if (options?.useWorker === false) {
    const { parseAdobeBrushResource } = await import('./adobeBrushResourceParser.js')
    if (signal?.aborted) throw abortError()
    return parseAdobeBrushResource(buffer, format, limits)
  }
  if (typeof Worker === 'undefined') {
    throw new Error('ABR/CSH preview requires a module Worker. Set options.design.useWorker=false only if the host accepts main-thread parsing.')
  }
  const workerUrl = resolveFileViewerAdobeResourceWorkerUrl(
    options,
    typeof document === 'undefined' ? undefined : document.baseURI
  )
  const worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-adobe-resource' })
  const timeoutMs = Math.max(1_000, options?.workerTimeoutMs ?? 60_000)
  const transferable = buffer.slice(0)
  const request: AdobeBrushResourceWorkerRequest = { id: 1, type: 'parse', format, buffer: transferable, limits }
  return new Promise<AdobeBrushResourceDocument>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      worker.terminate()
      callback()
    }
    const onAbort = () => finish(() => reject(abortError()))
    const timer = setTimeout(() => finish(() => reject(new Error(`Adobe resource Worker exceeded ${timeoutMs}ms and was terminated.`))), timeoutMs)
    worker.addEventListener('message', (event: MessageEvent<AdobeBrushResourceWorkerResponse>) => {
      const response = event.data
      if (!response || response.id !== 1) return
      if (response.ok) finish(() => resolve(response.result))
      else {
        const error = new Error(response.error.message)
        error.name = response.error.name
        finish(() => reject(error))
      }
    })
    worker.addEventListener('error', event => finish(() => reject(new Error(event.message || 'Adobe resource Worker failed to load.'))))
    worker.addEventListener('messageerror', () => finish(() => reject(new Error('Adobe resource Worker returned an undecodable response.'))))
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      worker.postMessage(request, [transferable])
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))))
    }
  })
}
