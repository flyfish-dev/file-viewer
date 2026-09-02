import {
  resolveFileViewerDesignContainerWorkerUrl,
  type FileViewerDesignOptions,
} from '@file-viewer/core'
import type { AdobePaletteDocument, AdobePaletteFormat, AdobePaletteParseLimits } from './designResourceParser.js'
import type { FlaContainerLimits, FlaDocumentPreview } from './flaContainer.js'
import type { InDesignContainerLimits, InDesignDocumentPreview } from './indesignContainer.js'
import type {
  InDesignExchangeDocument,
  InDesignExchangeFormat,
  InDesignExchangeLimits,
} from './indesignExchangeProtocol.js'
import type { XdContainerLimits, XdDocumentPreview } from './xdContainer.js'
import type {
  AdobeContainerWorkerPayload,
  AdobeContainerWorkerRequest,
  AdobeContainerWorkerResponse,
  AdobeContainerWorkerResult,
} from './adobeContainerProtocol.js'

interface PendingRequest<TResult extends AdobeContainerWorkerResult = AdobeContainerWorkerResult> {
  resolve: (result: TResult) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
  signal?: AbortSignal
  onAbort?: () => void
}

const abortError = () => new DOMException('Adobe container parsing was aborted.', 'AbortError')

const asError = (value: unknown, fallback: string) => value instanceof Error
  ? value
  : new Error(typeof value === 'string' ? value : fallback)

class AdobeContainerWorkerClient {
  private readonly worker: Worker
  private readonly pending = new Map<number, PendingRequest>()
  private nextRequestId = 1
  private closed = false

  constructor(options?: FileViewerDesignOptions) {
    if (typeof Worker === 'undefined') {
      throw new Error('FLA/XFL, XD, INDD/INDT, ICML/IDMS/INX, ASE, and ACO preview requires a module Worker.')
    }
    const workerUrl = resolveFileViewerDesignContainerWorkerUrl(
      options,
      typeof document === 'undefined' ? undefined : document.baseURI
    )
    this.worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-adobe-container' })
    this.worker.addEventListener('message', this.onMessage)
    this.worker.addEventListener('error', this.onError)
    this.worker.addEventListener('messageerror', this.onMessageError)
  }

  request<TResult extends AdobeContainerWorkerResult>(
    payload: AdobeContainerWorkerPayload,
    buffer: ArrayBuffer,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<TResult> {
    if (this.closed) return Promise.reject(new Error('Adobe container Worker is already terminated.'))
    if (signal?.aborted) return Promise.reject(abortError())
    const id = this.nextRequestId++
    const transferable = buffer.slice(0)
    const request = { ...payload, id, buffer: transferable } as AdobeContainerWorkerRequest
    return new Promise<TResult>((resolve, reject) => {
      const onAbort = () => this.terminate(abortError())
      const timer = setTimeout(
        () => this.terminate(new Error(`Adobe container Worker exceeded ${timeoutMs}ms and was terminated.`)),
        timeoutMs
      )
      this.pending.set(id, { resolve, reject, timer, signal, onAbort } as PendingRequest)
      signal?.addEventListener('abort', onAbort, { once: true })
      if (signal?.aborted) {
        onAbort()
        return
      }
      try {
        this.worker.postMessage(request, [transferable])
      } catch (error) {
        this.terminate(asError(error, 'Adobe container Worker request could not be cloned.'))
      }
    })
  }

  terminate(reason = new Error('Adobe container Worker was terminated.')) {
    if (this.closed) return
    this.closed = true
    this.worker.removeEventListener('message', this.onMessage)
    this.worker.removeEventListener('error', this.onError)
    this.worker.removeEventListener('messageerror', this.onMessageError)
    this.worker.terminate()
    for (const pending of this.pending.values()) {
      this.cleanup(pending)
      pending.reject(reason)
    }
    this.pending.clear()
  }

  private readonly onMessage = (event: MessageEvent<AdobeContainerWorkerResponse>) => {
    const response = event.data
    if (!response || !Number.isSafeInteger(response.id)) {
      this.terminate(new Error('Adobe container Worker returned an invalid response.'))
      return
    }
    const pending = this.pending.get(response.id)
    if (!pending) return
    this.pending.delete(response.id)
    this.cleanup(pending)
    if (response.ok) pending.resolve(response.result)
    else {
      const error = new Error(response.error.message)
      error.name = response.error.name
      pending.reject(error)
    }
  }

  private readonly onError = (event: ErrorEvent) => {
    this.terminate(new Error(event.message || 'Adobe container Worker failed to load.'))
  }

  private readonly onMessageError = () => {
    this.terminate(new Error('Adobe container Worker returned an undecodable response.'))
  }

  private cleanup(pending: PendingRequest) {
    clearTimeout(pending.timer)
    if (pending.onAbort) pending.signal?.removeEventListener('abort', pending.onAbort)
  }
}

const parseOnce = async <TResult extends AdobeContainerWorkerResult>(
  payload: AdobeContainerWorkerPayload,
  buffer: ArrayBuffer,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
): Promise<TResult> => {
  const client = new AdobeContainerWorkerClient(options)
  try {
    return await client.request<TResult>(
      payload,
      buffer,
      Math.max(1_000, options?.workerTimeoutMs ?? 60_000),
      signal
    )
  } finally {
    client.terminate()
  }
}

export const readXdContainerInWorker = (
  buffer: ArrayBuffer,
  limits: Partial<XdContainerLimits> | undefined,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
) => parseOnce<XdDocumentPreview>({ type: 'parse', format: 'xd', limits }, buffer, options, signal)

export const readInDesignContainerInWorker = (
  buffer: ArrayBuffer,
  format: 'indd' | 'indt',
  limits: Partial<InDesignContainerLimits> | undefined,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
) => parseOnce<InDesignDocumentPreview>({ type: 'parse', format, limits }, buffer, options, signal)

export const parseAdobePaletteInWorker = (
  buffer: ArrayBuffer,
  format: AdobePaletteFormat,
  limits: AdobePaletteParseLimits,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
) => parseOnce<AdobePaletteDocument>({ type: 'parse', format, limits }, buffer, options, signal)

export const readFlaContainerInWorker = (
  buffer: ArrayBuffer,
  format: 'fla' | 'xfl',
  limits: Partial<FlaContainerLimits> | undefined,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
) => parseOnce<FlaDocumentPreview>({ type: 'parse', format, limits }, buffer, options, signal)

export const parseInDesignExchangeInWorker = (
  buffer: ArrayBuffer,
  format: InDesignExchangeFormat,
  limits: Partial<InDesignExchangeLimits> | undefined,
  options?: FileViewerDesignOptions,
  signal?: AbortSignal
) => parseOnce<InDesignExchangeDocument>({ type: 'parse', format, limits }, buffer, options, signal)
