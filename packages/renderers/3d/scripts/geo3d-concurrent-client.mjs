/** Browser-test instrumentation only. Production renderer code never imports this. */
export function installConcurrentViewerHarness(render) {
  const records = new Map(), workers = new Map(), urls = new Map(), bitmaps = new Set(), deferredHooks = new Map()
  let moduleUrls = new Set(), nextWorker = 0, nextHook = 0
  const NativeWorker = window.Worker
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args)
      const entry = { id: nextWorker++, url: String(args[0]), live: true, sent: 0, received: 0, pending: new Set(), types: new Set() }
      this.evidence = entry
      workers.set(entry.id, entry)
      this.addEventListener('message', event => {
        entry.received++
        entry.pending.delete(event.data?.requestId)
      })
    }
    postMessage(data, ...args) {
      const entry = this.evidence
      entry.sent++
      if (Number.isSafeInteger(data?.id)) entry.pending.add(data.id)
      if (typeof data?.type === 'string') entry.types.add(data.type)
      return super.postMessage(data, ...args)
    }
    terminate() {
      this.evidence.live = false
      this.evidence.pending.clear()
      super.terminate()
    }
  }
  const createUrl = URL.createObjectURL.bind(URL), revokeUrl = URL.revokeObjectURL.bind(URL)
  URL.createObjectURL = blob => { const url = createUrl(blob); urls.set(url, { type: blob.type, bytes: blob.size }); return url }
  URL.revokeObjectURL = url => { urls.delete(url); revokeUrl(url) }
  const createBitmap = window.createImageBitmap.bind(window)
  window.createImageBitmap = async (...args) => {
    const bitmap = await createBitmap(...args), close = bitmap.close.bind(bitmap)
    bitmaps.add(bitmap)
    bitmap.close = () => { bitmaps.delete(bitmap); close() }
    return bitmap
  }
  const targets = new Map()
  for (const [index, id] of ['A', 'B', 'C'].entries()) {
    const target = document.createElement('div')
    target.id = `viewer-${id}`
    target.style.cssText = `position:absolute;left:${index % 2 * 490}px;top:${Math.floor(index / 2) * 350}px;width:480px;height:340px`
    document.body.append(target)
    targets.set(id, target)
  }
  const waitForAbort = signal => new Promise(resolve => {
    if (signal.aborted) resolve()
    else signal.addEventListener('abort', resolve, { once: true })
  })
  const nextTurn = () => new Promise(resolve => setTimeout(resolve, 0))
  function snapshot(record) {
    const renderer = record.instance?.renderer
    const info = renderer?.info
    return {
      status: record.status, closed: record.closed, error: record.error,
      before: record.before, after: record.after, cleanup: [...record.cleanup],
      extensionErrors: [...record.extensionErrors],
      sameUnmountPromise: record.sameUnmountPromise ?? null,
      hasInstance: Boolean(record.instance), stage: record.stage,
      render: info ? { frame: info.render.frame, triangles: info.render.triangles, points: info.render.points } : record.lastRender,
      memory: info ? { geometries: info.memory.geometries, textures: info.memory.textures } : record.lastMemory,
      loading: record.instance?.loading ?? false,
      canvas: targets.get(record.id).querySelectorAll('canvas').length,
    }
  }
  function releaseReferences(record) {
    const state = snapshot(record)
    record.lastRender = state.render
    record.lastMemory = state.memory
    record.instance = null
    record.entity = null
    record.viewer = null
    record.promise = Promise.resolve()
    record.closed = true
  }
  function checkReportedErrors(record) {
    const expected = record.throwCleanup && record.after ? ['Deliberate host disposer failure'] : []
    const actual = record.extensionErrors.map(error => error.message)
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Unexpected extension diagnostics: ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`)
  }
  window.concurrent = {
    freezeModuleState() {
      if ([...workers.values()].some(worker => worker.live)) throw new Error('Engine imports unexpectedly created a Worker')
      moduleUrls = new Set(urls.keys())
      return this.resources()
    },
    resources() {
      return {
        canvas: document.querySelectorAll('canvas').length,
        liveWorkers: [...workers.values()].filter(worker => worker.live).length,
        instanceObjectUrls: [...urls.keys()].filter(url => !moduleUrls.has(url)),
        moduleObjectUrls: [...urls.keys()].filter(url => moduleUrls.has(url)).sort(),
        decodedBitmaps: bitmaps.size,
      }
    },
    workers() {
      return [...workers.values()].map(worker => ({ ...worker, pending: worker.pending.size, types: [...worker.types] }))
    },
    state(id) { const record = records.get(id); return record ? snapshot(record) : null },
    start({ id, url, format, pauseHook, hookMode = 'cooperative', throwCleanup = false, controls = false }) {
      if (records.has(id) && !records.get(id).closed) throw new Error(`Viewer ${id} is already active`)
      const controller = new AbortController()
      const record = { id, controller, status: 'pending', closed: false, before: 0, after: 0, cleanup: [], extensionErrors: [], stage: 'start', hookMode, throwCleanup, hookKey: `hook-${nextHook++}` }
      records.set(id, record)
      const pause = (stage, signal) => {
        if (pauseHook !== stage) return Promise.resolve()
        if (hookMode !== 'deferred') return waitForAbort(signal)
        return new Promise((resolve, reject) => { deferredHooks.set(record.hookKey, { resolve, reject, record }) })
      }
      const options = {
        assetBaseUrl: '/nested/assets/geo3d/',
        giro3d: { view: { controls, fitToDataset: true }, sources: {
          copc: { enableWorkers: true, pointSize: 4 }, las: { enableWorkers: true, pointSize: 4 },
          geotiff: { enableWorkers: true }, cog: { enableWorkers: true },
        } },
        onExtensionError(error) { record.extensionErrors.push({ name: error?.name, message: error?.message ?? String(error) }) },
        async configureInstance(context) {
          record.instance = context.instance
          record.before++
          record.stage = 'instance'
          await pause('instance', context.signal)
          return () => { record.cleanup.push('instance') }
        },
        async configure(context) {
          if (context.instance !== record.instance) throw new Error('Hook instance identity changed')
          record.entity = context.entity
          record.after++
          record.stage = 'configure'
          await pause('configure', context.signal)
          return () => {
            record.cleanup.push('configure')
            if (throwCleanup) throw new Error('Deliberate host disposer failure')
          }
        },
      }
      record.promise = render(new ArrayBuffer(0), targets.get(id), format,
        { filename: new URL(url).pathname.split('/').pop(), streamUrl: url, signal: controller.signal, options: { locale: 'en-US' } }, options)
        .then(viewer => { record.viewer = viewer; record.status = 'fulfilled'; record.stage = 'loaded' },
          error => { record.status = 'rejected'; record.error = { name: error?.name, message: String(error) } })
      return record.hookKey
    },
    async stop(id) {
      const record = records.get(id)
      if (!record || record.closed) throw new Error(`Viewer ${id} is not active`)
      await record.promise
      if (!record.viewer) throw new Error(`Viewer ${id} did not load: ${JSON.stringify(record.error)}`)
      const first = record.viewer.unmount(), second = record.viewer.unmount()
      record.sameUnmountPromise = first === second
      await Promise.all([first, second])
      checkReportedErrors(record)
      releaseReferences(record)
      return snapshot(record)
    },
    async abort(id) {
      const record = records.get(id)
      record.controller.abort(new DOMException('Test owner cancelled.', 'AbortError'))
      await record.promise
      if (record.viewer) await record.viewer.unmount()
      // Flush only already-settled continuations. A deferred application hook
      // is deliberately not released or awaited by this cancellation method.
      await nextTurn()
      if (record.hookMode !== 'deferred') checkReportedErrors(record)
      releaseReferences(record)
      return snapshot(record)
    },
    async releaseHook(key, reject = false) {
      const gate = deferredHooks.get(key)
      if (!gate) throw new Error('Unknown deferred hook')
      deferredHooks.delete(key)
      if (reject) gate.reject(new Error('Deliberate late hook failure'))
      else gate.resolve()
      await nextTurn()
      return snapshot(gate.record)
    },
    notify(id) {
      const record = records.get(id)
      if (!record.viewer || record.closed) throw new Error('Cannot redraw a closed viewer')
      const frame = record.instance.renderer.info.render.frame
      record.instance.notifyChange(record.entity)
      return frame
    },
  }
}
