import { resolveIdmlSafetyLimits, type IdmlSafetyLimits } from './idmlLimits.js'
import type {
  IdmlOpenResult,
  IdmlRenderedPage,
  IdmlWorkerRequest,
  IdmlWorkerResponse
} from './idmlProtocol.js'

type IdmlWorkerRequestInput =
  | Omit<Extract<IdmlWorkerRequest, { type: 'open' }>, 'id'>
  | Omit<Extract<IdmlWorkerRequest, { type: 'renderPage' }>, 'id'>
  | Omit<Extract<IdmlWorkerRequest, { type: 'destroy' }>, 'id'>

export interface IdmlWorkerSessionOptions {
  workerUrl?: string | URL
  wasmUrl?: string | URL
  limits?: Partial<IdmlSafetyLimits>
  workerTimeoutMs?: number
}

export interface IdmlRenderSession {
  open(buffer: ArrayBuffer, signal?: AbortSignal): Promise<IdmlOpenResult>
  renderPage(pageIndex: number, dpi: number, signal?: AbortSignal): Promise<IdmlRenderedPage>
  abort(reason?: unknown): void
  destroy(): void
}

const abortError = (message: string, reason?: unknown) => {
  if (reason instanceof Error) return reason
  return new DOMException(message, 'AbortError')
}

export class WorkerIdmlRenderSession implements IdmlRenderSession {
  private readonly worker: Worker
  private readonly limits: IdmlSafetyLimits
  private readonly wasmUrl?: string
  private readonly pending = new Map<
    number,
    {
      resolve: (response: IdmlWorkerResponse) => void
      reject: (error: Error) => void
    }
  >()
  private requestId = 0
  private destroyed = false
  private pageCount = 0

  constructor(options: IdmlWorkerSessionOptions = {}) {
    const workerUrl = options.workerUrl ?? new URL('./idml.worker.js', import.meta.url)
    this.worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-idml' })
    this.limits = resolveIdmlSafetyLimits({
      ...options.limits,
      workerTimeoutMs: options.workerTimeoutMs ?? options.limits?.workerTimeoutMs
    })
    this.wasmUrl = options.wasmUrl?.toString()
    this.worker.addEventListener('message', (event: MessageEvent<IdmlWorkerResponse>) => {
      const pending = this.pending.get(event.data.id)
      if (!pending) return
      this.pending.delete(event.data.id)
      if (event.data.ok) pending.resolve(event.data)
      else {
        const error = new Error(event.data.error.message) as Error & { code?: string }
        error.name = event.data.error.name
        error.code = event.data.error.code
        pending.reject(error)
        if (event.data.error.fatal) this.terminate(error)
      }
    })
    this.worker.addEventListener('error', (event) => {
      this.terminate(new Error(event.message || 'IDML Worker failed to load.'))
    })
    this.worker.addEventListener('messageerror', () => {
      this.terminate(new Error('IDML Worker returned a message that could not be decoded.'))
    })
  }

  private rejectAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
  }

  private terminate(error: Error) {
    if (this.destroyed) return
    this.destroyed = true
    this.pageCount = 0
    this.worker.terminate()
    this.rejectAll(error)
  }

  private request(
    request: IdmlWorkerRequestInput,
    transfer: Transferable[] = [],
    signal?: AbortSignal
  ) {
    if (this.destroyed) return Promise.reject(new Error('IDML Worker session was destroyed.'))
    if (signal?.aborted)
      return Promise.reject(abortError('IDML Worker request was aborted.', signal.reason))
    const id = ++this.requestId
    return new Promise<IdmlWorkerResponse>((resolve, reject) => {
      let settled = false
      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        callback()
      }
      const onAbort = () => {
        const error = abortError('IDML Worker request was aborted.', signal?.reason)
        finish(() => reject(error))
        this.terminate(error)
      }
      const timer = setTimeout(() => {
        const error = new Error(
          `IDML Worker exceeded ${this.limits.workerTimeoutMs}ms and was terminated.`
        )
        finish(() => reject(error))
        this.terminate(error)
      }, this.limits.workerTimeoutMs)
      signal?.addEventListener('abort', onAbort, { once: true })
      this.pending.set(id, {
        resolve: (response) => finish(() => resolve(response)),
        reject: (error) => finish(() => reject(error))
      })
      if (signal?.aborted) {
        onAbort()
        return
      }
      try {
        this.worker.postMessage({ id, ...request } as IdmlWorkerRequest, transfer)
      } catch (error) {
        this.pending.delete(id)
        finish(() => reject(error instanceof Error ? error : new Error(String(error))))
      }
    })
  }

  async open(buffer: ArrayBuffer, signal?: AbortSignal) {
    if (buffer.byteLength > this.limits.maxFileBytes) {
      throw new Error(`IDML source exceeds the ${this.limits.maxFileBytes}-byte safety limit.`)
    }
    const transferable = buffer.slice(0)
    const response = await this.request(
      {
        type: 'open',
        buffer: transferable,
        limits: this.limits,
        wasmUrl: this.wasmUrl
      },
      [transferable],
      signal
    )
    if (!response.ok || response.type !== 'open') {
      const error = new Error('Invalid IDML Worker open response.')
      this.terminate(error)
      throw error
    }
    this.pageCount = response.result.tree.pageCount
    return response.result
  }

  async renderPage(pageIndex: number, dpi: number, signal?: AbortSignal) {
    if (this.pageCount === 0) throw new Error('IDML document is not open.')
    if (!Number.isSafeInteger(pageIndex) || pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new RangeError(`IDML page index ${pageIndex} is outside 0..${this.pageCount - 1}.`)
    }
    if (!Number.isFinite(dpi) || dpi < this.limits.minDpi || dpi > this.limits.maxDpi) {
      throw new RangeError(
        `IDML render DPI must be between ${this.limits.minDpi} and ${this.limits.maxDpi}.`
      )
    }
    const response = await this.request({ type: 'renderPage', pageIndex, dpi }, [], signal)
    if (!response.ok || response.type !== 'renderPage') {
      throw new Error('Invalid IDML Worker page response.')
    }
    return response.result
  }

  abort(reason?: unknown) {
    this.terminate(abortError('IDML Worker session was aborted.', reason))
  }

  destroy() {
    this.terminate(new Error('IDML Worker session was destroyed.'))
  }
}

export const createIdmlRenderSession = (options?: IdmlWorkerSessionOptions): IdmlRenderSession => {
  if (typeof Worker === 'undefined') {
    throw new Error('IDML preview requires a browser module Worker.')
  }
  return new WorkerIdmlRenderSession(options)
}
