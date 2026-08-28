import { normalizeSignatureContainerLimits, type SignatureContainerLimits } from './limits.js'
import type { AsicWorkerRequest, AsicWorkerResponse } from './containerProtocol.js'
import type { AsicInspection } from './types.js'

let nextContainerRequestId = 0

export class SignatureContainerWorkerClient {
  private worker?: Worker
  private readonly pending = new Map<
    string,
    {
      resolve(value: AsicInspection): void
      reject(reason?: unknown): void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  constructor(private readonly workerFactory?: () => Worker) {}

  private ensureWorker() {
    if (this.worker) return this.worker
    if (typeof Worker === 'undefined')
      throw new Error('ASiC inspection requires Web Worker support.')
    const worker = this.workerFactory
      ? this.workerFactory()
      : new Worker(new URL('../container.worker.js', import.meta.url), {
          type: 'module',
          name: 'file-viewer-signature-container'
        })
    worker.addEventListener('message', (event: MessageEvent<AsicWorkerResponse>) => {
      const pending = this.pending.get(event.data.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pending.delete(event.data.id)
      if (event.data.ok) pending.resolve(event.data.result)
      else
        pending.reject(
          Object.assign(new Error(event.data.error.message), { code: event.data.error.code })
        )
    })
    worker.addEventListener('error', (event) =>
      this.failWorker(new Error(event.message || 'ASiC Worker failed.'))
    )
    worker.addEventListener('messageerror', () =>
      this.failWorker(new Error('ASiC Worker returned an unreadable response.'))
    )
    this.worker = worker
    return worker
  }

  private failWorker(error: Error) {
    this.worker?.terminate()
    this.worker = undefined
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }

  inspectAsic(input: ArrayBuffer, requestedLimits?: Partial<SignatureContainerLimits>) {
    if (this.pending.size >= 2)
      return Promise.reject(new Error('ASiC Worker request limit exceeded.'))
    const limits = normalizeSignatureContainerLimits(requestedLimits)
    if (input.byteLength === 0 || input.byteLength > limits.maxContainerBytes) {
      return Promise.reject(
        new Error(`ASiC input exceeds the ${limits.maxContainerBytes}-byte boundary.`)
      )
    }
    const worker = this.ensureWorker()
    const id = `signature-container-${++nextContainerRequestId}`
    const transferable = input.slice(0)
    return new Promise<AsicInspection>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failWorker(new DOMException('ASiC inspection timed out.', 'TimeoutError'))
      }, limits.maxWorkerMs)
      this.pending.set(id, { resolve, reject, timer })
      worker.postMessage(
        {
          id,
          type: 'inspect-asic',
          input: transferable,
          limits
        } satisfies AsicWorkerRequest,
        [transferable]
      )
    })
  }

  dispose() {
    this.failWorker(new DOMException('ASiC Worker was terminated.', 'AbortError'))
  }
}
