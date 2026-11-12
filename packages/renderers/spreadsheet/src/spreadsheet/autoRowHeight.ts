import { displayCellKey, getDataKey, type VirtualSheetState } from './state.js'
import { createAutoHeightProbe, getDisplayColumns } from './view.js'

const MAX_BATCH_CELLS = 32
const MAX_CACHE_ENTRIES = 2048
const MAX_CACHE_CHARACTERS = 1024 * 1024

export const canAutoSizeRow = (state: VirtualSheetState, row: number) =>
  !state.autoHeightDisabled &&
  !state.fixedHeightRows.has(row) &&
  !state.rowHeightOverrides.has(row) &&
  (state.sourceRowHeights.get(row) ?? state.defaults.rowHeight) > 0.1

interface Job {
  row: number
  columns: number[]
  index: number
  height: number
}
interface Options {
  host: HTMLElement
  getState(): VirtualSheetState
  getZoom(): number
  getFirstVisibleRow(): number
  commit(changes: Map<number, number>): void
}

/** Bounded, document-local layout work shared by main-thread and Worker models. */
export const createAutoRowHeight = (options: Options) => {
  const document = options.host.ownerDocument,
    view = document.defaultView
  const host = document.createElement('div')
  host.dataset.spreadsheetAutoHeight = 'true'
  host.setAttribute('aria-hidden', 'true')
  host.inert = true
  Object.assign(host.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '0',
    height: '0',
    overflow: 'hidden',
    visibility: 'hidden',
    pointerEvents: 'none',
    contain: 'layout style',
  })
  options.host.append(host)
  const cache = new Map<string, number>()
  let cacheCharacters = 0,
    frame = 0,
    disposed = false,
    generation = 0
  let state = options.getState(),
    zoom = options.getZoom(),
    jobs: Job[] = []
  const queued = new Set<number>()
  const cacheSet = (key: string, value: number) => {
    if (key.length > MAX_CACHE_CHARACTERS / 16 || value <= 0) return
    if (cache.has(key)) cacheCharacters -= key.length
    cache.delete(key)
    cache.set(key, value)
    cacheCharacters += key.length
    while (
      cache.size > MAX_CACHE_ENTRIES ||
      cacheCharacters > MAX_CACHE_CHARACTERS
    ) {
      const first = cache.keys().next().value
      if (first === undefined) break
      cache.delete(first)
      cacheCharacters -= first.length
    }
  }
  const scheduleFrame = () => {
    if (!disposed && !frame && jobs.length && view)
      frame = view.requestAnimationFrame(flush)
  }
  function flush() {
    frame = 0
    if (disposed || state !== options.getState() || zoom !== options.getZoom())
      return
    const token = generation,
      changes = new Map<number, number>()
    const columns = new Map(
      getDisplayColumns(state.columns, zoom).map((column) => [
        `${column.key}`,
        column,
      ]),
    )
    const measurements: Array<{ job: Job; key: string; probe: HTMLElement }> =
      []
    let processed = 0
    const started = view?.performance.now() || 0
    while (
      jobs.length &&
      processed < MAX_BATCH_CELLS &&
      (!processed || (view?.performance.now() || 0) - started < 8)
    ) {
      const job = jobs[0]
      if (!canAutoSizeRow(state, job.row)) {
        jobs.shift()
        queued.delete(job.row)
        processed++
        continue
      }
      if (job.index >= job.columns.length) {
        jobs.shift()
        queued.delete(job.row)
        changes.set(job.row, job.height)
        processed++
        continue
      }
      const col = job.columns[job.index++]
      processed++
      const column = columns.get(getDataKey(col)),
        width = Number(column?.width)
      const key = displayCellKey(job.row, col + 1)
      const style = state.cellCache.get(key),
        value = state.rows[job.row]?.[getDataKey(col)]
      if (
        !style?.wrapText ||
        !column ||
        column.hide ||
        !(width > 0) ||
        value === undefined ||
        value === null ||
        value === '' ||
        state.mergeStartMap.has(key) ||
        state.mergeCoveredMap.has(key)
      )
        continue
      const cacheKey = JSON.stringify([zoom, width, value, style])
      const cached = cache.get(cacheKey)
      if (cached !== undefined) {
        cache.delete(cacheKey)
        cache.set(cacheKey, cached)
        job.height = Math.max(job.height, cached / zoom)
        continue
      }
      const probe = createAutoHeightProbe(document, value, style, width, zoom)
      host.append(probe)
      measurements.push({ job, key: cacheKey, probe })
    }
    // All writes above, then all layout reads. A single cell is never truncated.
    for (const item of measurements) {
      const height = Math.ceil(
        Math.max(
          item.probe.getBoundingClientRect().height,
          item.probe.scrollHeight,
        ),
      )
      if (height > 0) {
        cacheSet(item.key, height)
        item.job.height = Math.max(item.job.height, height / zoom)
      }
    }
    host.replaceChildren()
    // A completed row may have been removed above before its probes were measured.
    for (const item of measurements)
      if (!queued.has(item.job.row)) changes.set(item.job.row, item.job.height)
    if (jobs[0] && jobs[0].index >= jobs[0].columns.length) {
      const job = jobs.shift()!
      queued.delete(job.row)
      changes.set(job.row, job.height)
    }
    if (
      disposed ||
      token !== generation ||
      state !== options.getState() ||
      zoom !== options.getZoom()
    )
      return
    for (const [row] of changes)
      if (!canAutoSizeRow(state, row)) changes.delete(row)
    if (changes.size) options.commit(changes)
    scheduleFrame()
  }
  const enqueue = (rows: Iterable<number>) => {
    if (disposed) return
    if (state !== options.getState() || zoom !== options.getZoom()) reset(false)
    const first = options.getFirstVisibleRow()
    const sorted = [...rows].sort(
      (a, b) => Math.abs(a - first) - Math.abs(b - first),
    )
    for (const row of sorted) {
      if (queued.has(row) || !canAutoSizeRow(state, row)) continue
      const columns = [...(state.autoHeightCells.get(row) || [])]
      if (!columns.length && !state.autoRowHeights.has(row)) continue
      queued.add(row)
      jobs.push({
        row,
        columns,
        index: 0,
        height: state.sourceRowHeights.get(row) ?? state.defaults.rowHeight,
      })
    }
    scheduleFrame()
  }
  function reset(clearCache = false) {
    generation++
    if (frame && view) view.cancelAnimationFrame(frame)
    frame = 0
    jobs = []
    queued.clear()
    host.replaceChildren()
    state = options.getState()
    zoom = options.getZoom()
    if (clearCache) {
      cache.clear()
      cacheCharacters = 0
    }
  }
  const invalidate = (clearCache = false) => {
    reset(clearCache)
    enqueue(
      new Set([
        ...state.autoHeightCells.keys(),
        ...state.autoRowHeights.keys(),
      ]),
    )
  }
  const fontReady = () => invalidate(true)
  document.fonts?.addEventListener?.('loadingdone', fontReady)
  void document.fonts?.ready
    .then(() => {
      if (!disposed) fontReady()
    })
    .catch(() => {})
  return {
    enqueue,
    invalidate,
    cancel: () => reset(false),
    destroy() {
      if (disposed) return
      disposed = true
      reset(true)
      host.remove()
      document.fonts?.removeEventListener?.('loadingdone', fontReady)
    },
  }
}
