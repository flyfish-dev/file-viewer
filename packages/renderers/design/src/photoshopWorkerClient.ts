import {
  resolveFileViewerDesignWorkerUrl,
  type FileViewerDesignOptions,
} from '@file-viewer/core'
import { resolvePhotoshopParseLimits } from './limits.js'
import type {
  PhotoshopOpenResult,
  PhotoshopWorkerRequest,
  PhotoshopWorkerResponse,
} from './photoshopProtocol.js'

type PhotoshopWorkerRequestInput =
  | Omit<Extract<PhotoshopWorkerRequest, { type: 'open' }>, 'id'>
  | Omit<Extract<PhotoshopWorkerRequest, { type: 'layer' }>, 'id'>

interface LocalDocumentSession {
  renderLayer(layerId: string): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }>
  destroy(): void
}

export interface PhotoshopRenderSession {
  open(buffer: ArrayBuffer): Promise<PhotoshopOpenResult>
  renderLayer(layerId: string): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }>
  destroy(): void
}

class LocalPhotoshopRenderSession implements PhotoshopRenderSession {
  private session?: LocalDocumentSession
  constructor(private readonly options?: FileViewerDesignOptions) {}

  async open(buffer: ArrayBuffer) {
    this.session?.destroy()
    const { PhotoshopDocumentSession } = await import('./photoshopParser.js')
    const opened = await PhotoshopDocumentSession.open(buffer, resolvePhotoshopParseLimits(this.options))
    this.session = opened.session
    return opened.result
  }

  renderLayer(layerId: string) {
    if (!this.session) throw new Error('Photoshop document is not open.')
    return this.session.renderLayer(layerId)
  }

  destroy() {
    this.session?.destroy()
    this.session = undefined
  }
}

class WorkerPhotoshopRenderSession implements PhotoshopRenderSession {
  private readonly worker: Worker
  private readonly pending = new Map<number, {
    resolve: (response: PhotoshopWorkerResponse) => void
    reject: (error: Error) => void
  }>()
  private requestId = 0
  private destroyed = false
  private readonly timeoutMs: number

  constructor(private readonly options?: FileViewerDesignOptions, documentBaseUrl?: string) {
    const workerUrl = resolveFileViewerDesignWorkerUrl(options, documentBaseUrl)
    this.worker = new Worker(workerUrl, { type: 'module', name: 'file-viewer-photoshop' })
    this.timeoutMs = Math.max(1_000, options?.workerTimeoutMs ?? 60_000)
    this.worker.addEventListener('message', (event: MessageEvent<PhotoshopWorkerResponse>) => {
      const pending = this.pending.get(event.data.id)
      if (!pending) return
      this.pending.delete(event.data.id)
      if (event.data.ok) pending.resolve(event.data)
      else {
        const error = new Error(event.data.error.message)
        error.name = event.data.error.name
        pending.reject(error)
        if (event.data.error.fatal) this.terminate(error)
      }
    })
    this.worker.addEventListener('error', event => {
      this.terminate(new Error(event.message || 'Photoshop Worker failed to load.'))
    })
    this.worker.addEventListener('messageerror', () => {
      this.terminate(new Error('Photoshop Worker returned a message that could not be decoded.'))
    })
  }

  private rejectAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
  }

  private terminate(error: Error) {
    if (this.destroyed) return
    this.destroyed = true
    this.worker.terminate()
    this.rejectAll(error)
  }

  private request(request: PhotoshopWorkerRequestInput, transfer: Transferable[] = []) {
    if (this.destroyed) return Promise.reject(new Error('Photoshop Worker session was destroyed.'))
    const id = ++this.requestId
    return new Promise<PhotoshopWorkerResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(`Photoshop Worker exceeded ${this.timeoutMs}ms and was terminated.`)
        reject(error)
        this.terminate(error)
      }, this.timeoutMs)
      this.pending.set(id, {
        resolve: response => { clearTimeout(timer); resolve(response) },
        reject: error => { clearTimeout(timer); reject(error) },
      })
      try {
        this.worker.postMessage({ id, ...request } as PhotoshopWorkerRequest, transfer)
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async open(buffer: ArrayBuffer) {
    const limits = resolvePhotoshopParseLimits(this.options)
    if (buffer.byteLength > limits.maxFileBytes) {
      throw new Error(`Photoshop source exceeds the ${limits.maxFileBytes}-byte safety limit.`)
    }
    const transferable = buffer.slice(0)
    const response = await this.request({
      type: 'open',
      buffer: transferable,
      limits,
    }, [transferable])
    if (!response.ok || response.type !== 'open') {
      const error = new Error('Invalid Photoshop Worker open response.')
      this.terminate(error)
      throw error
    }
    return response.result
  }

  async renderLayer(layerId: string) {
    const response = await this.request({ type: 'layer', layerId })
    if (!response.ok || response.type !== 'layer') throw new Error('Invalid Photoshop Worker layer response.')
    return { width: response.width, height: response.height, rgba: response.rgba }
  }

  destroy() {
    this.terminate(new Error('Photoshop Worker session was destroyed.'))
  }
}

export const createPhotoshopRenderSession = (
  options?: FileViewerDesignOptions,
  documentBaseUrl?: string
): PhotoshopRenderSession => {
  if (options?.useWorker === false) {
    return new LocalPhotoshopRenderSession(options)
  }
  if (typeof Worker !== 'undefined') {
    return new WorkerPhotoshopRenderSession(options, documentBaseUrl)
  }
  throw new Error(
    'Photoshop preview requires a module Worker. Set options.design.useWorker=false only if the host explicitly accepts main-thread parsing.'
  )
}
