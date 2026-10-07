import { Geo3dOwnedWorkerPool } from './geo3dOwnedWorkerPool.js'
import { checkAbort, readBoundedResponse } from './geo3dRange.js'

export interface Geo3dLasWorkers {
  get(): Promise<Geo3dOwnedWorkerPool>
  dispose(): void
}

/** A fresh decoder provider per source, including its own in-flight WASM request. */
export function createGeo3dLasWorkers(assetBaseUrl: string, signal: AbortSignal): Geo3dLasWorkers {
  const controller = new AbortController()
  let pool: Geo3dOwnedWorkerPool | undefined
  let pending: Promise<Geo3dOwnedWorkerPool> | undefined
  let disposed = false
  const onAbort = () => dispose()
  signal.addEventListener('abort', onAbort, { once: true })
  function dispose() {
    if (disposed) return
    disposed = true
    signal.removeEventListener('abort', onAbort)
    controller.abort(signal.reason ?? new DOMException('Geo3D point source disposed.', 'AbortError'))
    pool?.dispose(controller.signal.reason)
    pool = undefined
    pending = undefined
  }
  if (signal.aborted) dispose()
  return {
    get() {
      if (disposed) return Promise.reject(controller.signal.reason)
      pending ??= (async () => {
        const base = new URL(assetBaseUrl, document.baseURI)
        const response = await fetch(new URL('laz-perf/laz-perf.wasm', base), { signal: controller.signal })
        if (!response.ok) {
          await response.body?.cancel()
          throw new Error(`Geo3D LAS decoder download failed: HTTP ${response.status}.`)
        }
        const bytes = await readBoundedResponse(response, 16 * 1024 * 1024, controller.signal)
        checkAbort(controller.signal)
        const wasm = bytes.slice().buffer as ArrayBuffer
        if (!WebAssembly.validate(wasm)) throw new Error('Geo3D LAS decoder is not valid WebAssembly.')
        pool = new Geo3dOwnedWorkerPool({
          signal: controller.signal,
          concurrency: 2,
          createWorker() {
            const worker = new Worker(new URL('workers/las-worker.js', base), { type: 'module', name: 'file-viewer-las' })
            try {
              // Clone once per Worker: a transfer would detach the next Worker's binary.
              worker.postMessage({ type: 'SetWasmBinary', buffer: wasm })
              return { worker }
            } catch (error) {
              worker.terminate()
              throw error
            }
          }
        })
        return pool
      })()
      return pending
    },
    dispose
  }
}
