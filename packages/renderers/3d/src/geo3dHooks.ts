/** Application hooks are trusted code, but must not hold the viewer lifetime open. */
export type Geo3dHookCleanup = () => void | Promise<void>
export type Geo3dHookResult = void | Geo3dHookCleanup

/** Late failures have no pending render/unmount caller; keep them observable. */
export function reportGeo3dExtensionError(error: unknown, observer?: (error: unknown) => void): void {
  const report = (value: unknown) => {
    if (typeof globalThis.reportError === 'function') globalThis.reportError(value)
    else console.error('Geo3D extension failed after cancellation:', value)
  }
  if (!observer) { report(error); return }
  try { observer(error) } catch (observerError) {
    report(new AggregateError([error, observerError], 'Geo3D extension error observer failed'))
  }
}

/**
 * Register a release slot before invoking the hook. Disposal never awaits a
 * pending hook. A returned cleanup belongs either to that slot or to its late
 * continuation, never both. Keep both continuations attached after cancellation
 * so late rejections cannot become detached/unhandled Promise rejections.
 */
export function runGeo3dHook(
  hook: () => Geo3dHookResult | Promise<Geo3dHookResult>,
  signal: AbortSignal,
  retain: (cleanup: Geo3dHookCleanup) => void,
  onExtensionError?: (error: unknown) => void,
): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason)
  let cleanup: Geo3dHookCleanup | undefined
  let released = false
  const report = (error: unknown) => reportGeo3dExtensionError(error, onExtensionError)
  const runCleanup = () => {
    const current = cleanup
    cleanup = undefined
    if (!current) return
    try {
      return Promise.resolve(current()).catch(report)
    } catch (error) { report(error) }
  }
  retain(() => {
    if (released) return
    released = true
    return runCleanup()
  })
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const remove = () => signal.removeEventListener('abort', abort)
    const abort = () => {
      if (settled) return
      settled = true
      remove()
      reject(signal.reason)
    }
    const fail = (error: unknown) => {
      if (settled) {
        if (error !== signal.reason) report(error)
        return
      }
      settled = true
      remove()
      reject(error)
    }
    const accept = (value: Geo3dHookResult) => {
      if (value !== undefined && typeof value !== 'function') {
        fail(new TypeError('Geo3D extension hook must return a cleanup function or undefined'))
        return
      }
      cleanup = value || undefined
      if (released) void runCleanup()
      if (!settled) {
        settled = true
        remove()
        resolve()
      }
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    queueMicrotask(() => {
      if (signal.aborted) return
      try {
        // Observe the application's Promise directly. Returning it through a
        // preliminary .then() inserts adoption jobs and can reorder a cleanup
        // that resolves in the abort turn behind an older registered cleanup.
        // No timer, grace period or wait for an unresolved hook is needed.
        void Promise.resolve(hook()).then(accept, fail)
      } catch (error) { fail(error) }
    })
  })
}
