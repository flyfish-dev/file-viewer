import {
  resolveFileViewerAdobeResourceWorkerUrl,
  type FileViewerDesignOptions,
} from '@file-viewer/core'
import { resolvePhotoshopParseLimits } from './limits.js'
import type {
  AdobePresetDocument,
  AdobePresetFormat,
  AdobePresetWorkerRequest,
  AdobePresetWorkerResponse,
} from './adobePresetProtocol.js'

const abortError = () => new DOMException('Adobe preset parsing was aborted.', 'AbortError')

export const parseAdobePresetInWorker = async (
  buffer: ArrayBuffer,
  format: AdobePresetFormat,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
): Promise<AdobePresetDocument> => {
  if (signal?.aborted) throw abortError()
  const limits = resolvePhotoshopParseLimits(options)
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`${format.toUpperCase()} source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
  }
  if (options?.useWorker === false) {
    const { parseAdobePresetResource } = await import('./adobePresetParser.js')
    if (signal?.aborted) throw abortError()
    return parseAdobePresetResource(buffer, format, limits)
  }
  if (typeof Worker === 'undefined') {
    throw new Error('PAT/GRD/ASL preview requires a module Worker. Set options.design.useWorker=false only if the host accepts main-thread parsing.')
  }
  const workerUrl = resolveFileViewerAdobeResourceWorkerUrl(
    options,
    typeof document === 'undefined' ? undefined : document.baseURI
  )
  const worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-adobe-preset' })
  const configuredTimeout = options?.workerTimeoutMs
  const timeoutMs = Number.isFinite(configuredTimeout) && Number(configuredTimeout) > 0
    ? Math.max(1_000, Math.trunc(Number(configuredTimeout)))
    : 60_000
  const transferable = buffer.slice(0)
  const request: AdobePresetWorkerRequest = { id: 2, type: 'parse-preset', format, buffer: transferable, limits }
  return new Promise<AdobePresetDocument>((resolve, reject) => {
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
    const timer = setTimeout(() => finish(() => reject(new Error(`Adobe preset Worker exceeded ${timeoutMs}ms and was terminated.`))), timeoutMs)
    worker.addEventListener('message', (event: MessageEvent<AdobePresetWorkerResponse>) => {
      const response = event.data
      if (!response || response.id !== request.id) return
      if (response.ok) finish(() => resolve(response.result))
      else {
        const error = new Error(response.error.message)
        error.name = response.error.name
        finish(() => reject(error))
      }
    })
    worker.addEventListener('error', event => finish(() => reject(new Error(event.message || 'Adobe preset Worker failed to load.'))))
    worker.addEventListener('messageerror', () => finish(() => reject(new Error('Adobe preset Worker returned an undecodable response.'))))
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      onAbort()
      return
    }
    try {
      worker.postMessage(request, [transferable])
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))))
    }
  })
}
