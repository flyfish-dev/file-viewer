/** Source-owned decoder scheduling. Never patches Worker, URL, or engine singletons. */
export interface Geo3dWorkerHandle {
  worker: Worker
  /** Only URLs allocated by this factory may be released here. */
  release?: () => void
}
export interface Geo3dWorkerPoolOptions {
  createWorker: () => Geo3dWorkerHandle
  concurrency?: number
  maxQueued?: number
  timeoutMs?: number
  signal?: AbortSignal
}
interface Job {
  id: number
  type: string
  payload: unknown
  transfer: Transferable[]
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  signal?: AbortSignal
  abort?: () => void
  timer?: ReturnType<typeof setTimeout>
}
interface Slot {
  handle: Geo3dWorkerHandle
  job?: Job
  message: (event: MessageEvent) => void
  error: (event: ErrorEvent) => void
  messageerror: () => void
}
const aborted = (signal?: AbortSignal) =>
  signal?.reason ?? new DOMException('Geo3D decoder disposed.', 'AbortError')

export class Geo3dOwnedWorkerPool {
  private readonly slots = new Set<Slot>()
  private readonly waiting: Job[] = []
  private readonly concurrency: number
  private readonly maxQueued: number
  private readonly timeoutMs: number
  private nextId = 0
  private disposed = false
  private pumping = false
  private readonly abortOwner: () => void

  constructor(private readonly options: Geo3dWorkerPoolOptions) {
    this.concurrency = options.concurrency ?? 2
    this.maxQueued = options.maxQueued ?? 128
    this.timeoutMs = options.timeoutMs ?? 60000
    if (!Number.isSafeInteger(this.concurrency) || this.concurrency < 1 || this.concurrency > 16 ||
        !Number.isSafeInteger(this.maxQueued) || this.maxQueued < 0 || this.maxQueued > 4096 ||
        !Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 300000) {
      throw new RangeError('Invalid Geo3D worker pool limits.')
    }
    this.abortOwner = () => this.dispose(aborted(options.signal))
    options.signal?.addEventListener('abort', this.abortOwner, { once: true })
    if (options.signal?.aborted) this.abortOwner()
  }

  /** Jobs retain their transfer buffers until actually dispatched. */
  queue<T = unknown>(type: string, payload: unknown, transfer: Transferable[] = [], signal?: AbortSignal): Promise<T> {
    if (this.disposed || signal?.aborted) return Promise.reject(aborted(signal ?? this.options.signal))
    if (this.waiting.length >= this.maxQueued &&
        this.slots.size >= this.concurrency && [...this.slots].every(slot => slot.job)) {
      return Promise.reject(new Error('Geo3D decoder queue limit exceeded.'))
    }
    if (!Number.isSafeInteger(this.nextId)) return Promise.reject(new Error('Geo3D decoder message ID limit exceeded.'))
    return new Promise<T>((resolve, reject) => {
      const job: Job = { id: this.nextId++, type, payload, transfer, resolve: value => resolve(value as T), reject, signal }
      job.abort = () => {
        const index = this.waiting.indexOf(job)
        if (index >= 0) {
          this.waiting.splice(index, 1)
          this.finish(job, false, aborted(signal))
        } else {
          const slot = [...this.slots].find(item => item.job === job)
          if (slot) this.failSlot(slot, aborted(signal))
        }
      }
      signal?.addEventListener('abort', job.abort, { once: true })
      this.waiting.push(job)
      this.pump()
    })
  }

  private finish(job: Job, ok: boolean, value: unknown): void {
    if (job.timer !== undefined) clearTimeout(job.timer)
    if (job.abort) job.signal?.removeEventListener('abort', job.abort)
    // Do not retain transferred payloads, buffers or abort listeners after settlement.
    job.payload = undefined
    job.transfer = []
    if (ok) job.resolve(value)
    else job.reject(value)
  }

  private removeSlot(slot: Slot): void {
    if (!this.slots.delete(slot)) return
    const worker = slot.handle.worker
    try { worker.removeEventListener('message', slot.message) } catch { /* Still release the owner. */ }
    try { worker.removeEventListener('error', slot.error) } catch { /* Still release the owner. */ }
    try { worker.removeEventListener('messageerror', slot.messageerror) } catch { /* Still release the owner. */ }
    try { worker.terminate() } finally { slot.handle.release?.() }
  }

  private failSlot(slot: Slot, reason: unknown): void {
    const job = slot.job
    slot.job = undefined
    try { this.removeSlot(slot) } catch { /* Settlement must survive a faulty disposer. */ }
    if (job) this.finish(job, false, reason)
    this.pump()
  }

  private makeSlot(): Slot {
    const handle = this.options.createWorker()
    const slot: Slot = {
      handle,
      message: event => {
        const job = slot.job
        if (!job) return
        const result = event.data
        if (!result || typeof result !== 'object' || result.requestId !== job.id ||
            (!('error' in result) && !('payload' in result))) {
          this.failSlot(slot, new Error('Invalid Geo3D decoder response.'))
          return
        }
        slot.job = undefined
        this.finish(job, !('error' in result), 'error' in result ? new Error(String(result.error)) : result.payload)
        this.pump()
      },
      error: event => {
        event.preventDefault()
        this.failSlot(slot, new Error(event.message || 'Geo3D decoder Worker failed.'))
      },
      messageerror: () => this.failSlot(slot, new Error('Geo3D decoder response could not be deserialized.'))
    }
    this.slots.add(slot)
    try {
      handle.worker.addEventListener('message', slot.message)
      handle.worker.addEventListener('error', slot.error)
      handle.worker.addEventListener('messageerror', slot.messageerror)
    } catch (error) {
      try { this.removeSlot(slot) } catch { /* Keep original initialization error. */ }
      throw error
    }
    return slot
  }

  private pump(): void {
    if (this.pumping || this.disposed) return
    this.pumping = true
    try {
      while (!this.disposed && this.waiting.length) {
        let slot = [...this.slots].find(item => !item.job)
        if (!slot && this.slots.size >= this.concurrency) return
        const job = this.waiting.shift()!
        if (job.signal?.aborted) { this.finish(job, false, aborted(job.signal)); continue }
        if (!slot) {
          try { slot = this.makeSlot() } catch (error) { this.finish(job, false, error); continue }
        }
        if (this.disposed) {
          try { this.removeSlot(slot) } catch { /* Keep cancellation reason. */ }
          this.finish(job, false, aborted(this.options.signal))
          continue
        }
        if (job.signal?.aborted) { this.finish(job, false, aborted(job.signal)); continue }
        slot.job = job
        const current = slot
        job.timer = setTimeout(() => this.failSlot(current, new Error('Geo3D decoder job timed out.')), this.timeoutMs)
        try { slot.handle.worker.postMessage({ id: job.id, type: job.type, payload: job.payload }, job.transfer) }
        catch (error) { this.failSlot(slot, error) }
      }
    } finally { this.pumping = false }
  }

  /** Immediately settles every pending promise and releases only this pool's workers. */
  dispose(reason: unknown = aborted()): void {
    if (this.disposed) return
    this.disposed = true
    this.options.signal?.removeEventListener('abort', this.abortOwner)
    for (const job of this.waiting.splice(0)) this.finish(job, false, reason)
    for (const slot of [...this.slots]) {
      const job = slot.job
      slot.job = undefined
      try { this.removeSlot(slot) } catch { /* A failed disposer must not block other owners. */ }
      if (job) this.finish(job, false, reason)
    }
  }
}
