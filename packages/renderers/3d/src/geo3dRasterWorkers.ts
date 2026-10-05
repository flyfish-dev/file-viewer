import { Geo3dOwnedWorkerPool } from './geo3dOwnedWorkerPool.js'

/** The pinned geotiff Pool contract binds decoding parameters before accepting a block. */
export interface Geo3dRasterDecoder {
  bindParameters(compression: number, decoderParameters: unknown): {
    decode(buffer: ArrayBuffer): Promise<ArrayBuffer>
  }
}
export interface Geo3dRasterWorkers {
  readonly signal: AbortSignal
  readonly decoder: Geo3dRasterDecoder
  readonly texture: Geo3dOwnedWorkerPool
  combineSignal(signal?: AbortSignal): AbortSignal
  dispose(): void
}

/** Own both asynchronous stages of a raster; never touch engine-global pools. */
export function createGeo3dRasterWorkers(assetBaseUrl: string, signal: AbortSignal): Geo3dRasterWorkers {
  const controller = new AbortController()
  const base = new URL(assetBaseUrl, document.baseURI)
  const makePool = (name: string) => new Geo3dOwnedWorkerPool({
    signal: controller.signal,
    concurrency: 2,
    maxQueued: 128,
    createWorker: () => ({
      worker: new Worker(new URL(`workers/${name}-worker.js`, base), {
        type: 'module', name: `file-viewer-${name}`,
      }),
    }),
  })
  const decoder = makePool('geotiff')
  const texture = makePool('texture')
  let disposed = false
  const onAbort = () => dispose()
  function dispose() {
    if (disposed) return
    disposed = true
    signal.removeEventListener('abort', onAbort)
    controller.abort(signal.reason ?? new DOMException('Geo3D raster source disposed.', 'AbortError'))
    decoder.dispose(controller.signal.reason)
    texture.dispose(controller.signal.reason)
  }
  signal.addEventListener('abort', onAbort, { once: true })
  if (signal.aborted) dispose()
  return {
    signal: controller.signal,
    decoder: {
      bindParameters(compression, decoderParameters) {
        return {
          decode(buffer) {
            return decoder.queue<ArrayBuffer>('DecodeRaster', { compression, decoderParameters, buffer }, [buffer])
          },
        }
      },
    },
    texture,
    combineSignal(requestSignal) {
      return requestSignal ? AbortSignal.any([controller.signal, requestSignal]) : controller.signal
    },
    dispose,
  }
}
