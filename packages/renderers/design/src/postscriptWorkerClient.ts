import { resolvePostscriptSafetyLimits, type PostscriptSafetyLimits } from './postscriptLimits.js'
import type {
  PostscriptOpenResult,
  PostscriptRenderedPage,
  PostscriptWorkerRequest,
  PostscriptWorkerResponse,
} from './postscriptProtocol.js'

type PostscriptWorkerRequestInput =
  | Omit<Extract<PostscriptWorkerRequest, { type: 'open' }>, 'id'>
  | Omit<Extract<PostscriptWorkerRequest, { type: 'renderPage' }>, 'id'>
  | Omit<Extract<PostscriptWorkerRequest, { type: 'destroy' }>, 'id'>

export interface PostscriptWorkerSessionOptions {
  workerUrl?: string | URL
  wasmUrl: string | URL
  limits?: Partial<PostscriptSafetyLimits>
}

export interface PostscriptRenderSession {
  open(buffer: ArrayBuffer, filename: string, signal?: AbortSignal): Promise<PostscriptOpenResult>
  renderPage(pageIndex: number, dpi: number, signal?: AbortSignal): Promise<PostscriptRenderedPage>
  abort(reason?: unknown): void
  destroy(): void
}

const abortError = (message: string, reason?: unknown) => {
  if (reason instanceof Error) return reason
  return new DOMException(message, 'AbortError')
}

export class WorkerPostscriptRenderSession implements PostscriptRenderSession {
  private readonly worker: Worker
  private readonly limits: PostscriptSafetyLimits
  private readonly wasmUrl: string
  private readonly pending = new Map<
    number,
    {
      resolve: (response: PostscriptWorkerResponse) => void
      reject: (error: Error) => void
    }
  >()
  private requestId = 0
  private destroyed = false
  private pageCount = 0

  constructor(options: PostscriptWorkerSessionOptions) {
    const workerUrl = options.workerUrl ?? new URL('./postscript.worker.js', import.meta.url)
    this.worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-postscript' })
    this.limits = resolvePostscriptSafetyLimits(options.limits)
    this.wasmUrl = options.wasmUrl.toString()
    this.worker.addEventListener('message', (event: MessageEvent<PostscriptWorkerResponse>) => {
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
    this.worker.addEventListener('error', event => {
      this.terminate(new Error(event.message || 'PostScript Worker failed to load.'))
    })
    this.worker.addEventListener('messageerror', () => {
      this.terminate(new Error('PostScript Worker returned an undecodable response.'))
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
    request: PostscriptWorkerRequestInput,
    transfer: Transferable[] = [],
    signal?: AbortSignal
  ) {
    if (this.destroyed) return Promise.reject(new Error('PostScript Worker session was destroyed.'))
    if (signal?.aborted) {
      return Promise.reject(abortError('PostScript Worker request was aborted.', signal.reason))
    }
    const id = ++this.requestId
    return new Promise<PostscriptWorkerResponse>((resolve, reject) => {
      let settled = false
      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        callback()
      }
      const terminate = (error: Error) => {
        this.pending.delete(id)
        finish(() => reject(error))
        this.terminate(error)
      }
      const onAbort = () => terminate(abortError('PostScript Worker request was aborted.', signal?.reason))
      const timer = setTimeout(() => {
        terminate(
          new Error(
            `PostScript Worker exceeded ${this.limits.workerTimeoutMs}ms and was terminated. The source may contain an unbounded program.`
          )
        )
      }, this.limits.workerTimeoutMs)
      signal?.addEventListener('abort', onAbort, { once: true })
      this.pending.set(id, {
        resolve: response => finish(() => resolve(response)),
        reject: error => finish(() => reject(error)),
      })
      if (signal?.aborted) {
        onAbort()
        return
      }
      try {
        this.worker.postMessage({ id, ...request } as PostscriptWorkerRequest, transfer)
      } catch (error) {
        this.pending.delete(id)
        finish(() => reject(error instanceof Error ? error : new Error(String(error))))
      }
    })
  }

  async open(buffer: ArrayBuffer, filename: string, signal?: AbortSignal) {
    if (buffer.byteLength > this.limits.maxFileBytes) {
      throw new Error(`PostScript source exceeds the ${this.limits.maxFileBytes}-byte safety limit.`)
    }
    const transferable = buffer.slice(0)
    const response = await this.request(
      {
        type: 'open',
        buffer: transferable,
        filename,
        wasmUrl: this.wasmUrl,
        limits: this.limits,
      },
      [transferable],
      signal
    )
    if (!response.ok || response.type !== 'open') {
      const error = new Error('Invalid PostScript Worker open response.')
      this.terminate(error)
      throw error
    }
    this.pageCount = response.result.pages.length
    return response.result
  }

  async renderPage(pageIndex: number, dpi: number, signal?: AbortSignal) {
    if (this.pageCount === 0) throw new Error('PostScript document is not open.')
    if (!Number.isSafeInteger(pageIndex) || pageIndex < 0 || pageIndex >= this.pageCount) {
      throw new RangeError(`PostScript page index ${pageIndex} is outside 0..${this.pageCount - 1}.`)
    }
    if (!Number.isFinite(dpi) || dpi < this.limits.minDpi || dpi > this.limits.maxDpi) {
      throw new RangeError(
        `PostScript render DPI must be between ${this.limits.minDpi} and ${this.limits.maxDpi}.`
      )
    }
    const response = await this.request({ type: 'renderPage', pageIndex, dpi }, [], signal)
    if (!response.ok || response.type !== 'renderPage') {
      throw new Error('Invalid PostScript Worker page response.')
    }
    return response.result
  }

  abort(reason?: unknown) {
    this.terminate(abortError('PostScript Worker session was aborted.', reason))
  }

  destroy() {
    this.terminate(new Error('PostScript Worker session was destroyed.'))
  }
}

export const createPostscriptRenderSession = (
  options: PostscriptWorkerSessionOptions
): PostscriptRenderSession => {
  if (typeof Worker === 'undefined') {
    throw new Error('PostScript preview requires a browser module Worker.')
  }
  return new WorkerPostscriptRenderSession(options)
}
