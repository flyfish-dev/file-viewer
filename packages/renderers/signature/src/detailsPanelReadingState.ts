import {
  DEFAULT_FILE_VIEWER_ANCHOR_SELECTOR,
  DEFAULT_FILE_VIEWER_ANCHOR_EXCLUDE_SELECTOR
} from '@file-viewer/core'
import type { FileViewerViewStateProviderHost } from '@file-viewer/core'

/** A bounded, instance-owned layout adjustment. Never changes a renderer's fit/zoom provider. */
export const createSignaturePanelReadingState = (
  shell: HTMLElement,
  preview: HTMLElement | undefined
) => {
  const view = shell.ownerDocument.defaultView
  let generation = 0
  let frame: number | undefined
  let timer: number | undefined
  let deadline: number | undefined
  let unsubscribeFit: (() => void) | undefined
  let disposed = false
  let pendingCapture:
    | {
        scroller: HTMLElement
        top: number
        left: number
        oldHeight: number
        oldWidth: number
        oldClientHeight: number
        oldClientWidth: number
        anchorElement?: HTMLElement
        anchorFraction: number
        expiresAt: number
      }
    | undefined

  const stopScheduledWork = () => {
    if (frame !== undefined) view?.cancelAnimationFrame(frame)
    if (timer !== undefined) view?.clearTimeout(timer)
    if (deadline !== undefined) view?.clearTimeout(deadline)
    frame = timer = deadline = undefined
  }
  const cancel = () => {
    generation += 1
    pendingCapture = undefined
    stopScheduledWork()
    const unsubscribe = unsubscribeFit
    unsubscribeFit = undefined
    unsubscribe?.()
  }
  const intent = (event: Event) => {
    if (
      event.type === 'keydown' &&
      ![
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
        '+',
        '-'
      ].includes((event as KeyboardEvent).key)
    )
      return
    cancel()
  }
  const intentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  intentEvents.forEach((type) =>
    preview?.addEventListener(type, intent, { capture: true, passive: true })
  )

  // Bounded traversal, including open shadow trees. Never enumerate every line
  // of a large document merely to find its outer scrolling viewport.
  const visitElements = (root: HTMLElement, visit: (element: HTMLElement) => void) => {
    const roots: Array<HTMLElement | ShadowRoot> = [root]
    let budget = 512
    while (roots.length && budget > 0) {
      const next = roots.shift()!
      if ('style' in next) visit(next)
      const walker = shell.ownerDocument.createTreeWalker(next, 1)
      let current: Node | null
      while (budget-- > 0 && (current = walker.nextNode())) {
        const element = current as HTMLElement
        if ('style' in element) visit(element)
        if (element.shadowRoot) roots.push(element.shadowRoot)
      }
    }
  }
  const resolveScroller = () => {
    if (!preview || !view) return undefined
    let best = preview
    let bestRange = -1
    visitElements(preview, (element) => {
      const range = element.scrollHeight - element.clientHeight
      if (range <= bestRange || range <= 0) return
      const overflow = view.getComputedStyle(element).overflowY
      if (!['auto', 'scroll', 'overlay'].includes(overflow)) return
      best = element
      bestRange = range
    })
    return best
  }

  const ancestors = function* (element: HTMLElement) {
    let node: HTMLElement | null = element
    for (let budget = 512; node && budget-- > 0;) {
      yield node
      if (node === preview) return
      const root = node.getRootNode() as Document | ShadowRoot
      node = node.parentElement || ('host' in root ? root.host as HTMLElement : null)
    }
  }
  const containsPreviewElement = (element: HTMLElement) =>
    [...ancestors(element)].includes(preview!)
  const resolveViewStateProvider = (scroller: HTMLElement) => {
    // The public provider-host bridge gives a direct lookup. Searching the
    // whole preview again would defeat the bounded document traversal above.
    for (const node of ancestors(scroller)) {
      const provider = (node as FileViewerViewStateProviderHost).__flyfishViewerViewStateProvider
      if (provider?.subscribe) return { host: node as FileViewerViewStateProviderHost, provider }
    }
    return undefined
  }

  const beforeChange = (position: 'top' | 'left', behavior: 'overlay' | 'push') => {
    // Coalesce rapid toggles around the original reading anchor, not an
    // intermediate reflowed position whose restoration has not yet run.
    const capturedAt = view?.performance.now() ?? 0
    const remembered =
      pendingCapture && capturedAt < pendingCapture.expiresAt &&
      containsPreviewElement(pendingCapture.scroller) ? pendingCapture : undefined
    cancel()
    if (disposed || !preview || !view || (position === 'left' && behavior === 'overlay'))
      return () => {}
    const token = generation
    const previewRect = preview.getBoundingClientRect()
    const shellRect = shell.getBoundingClientRect()
    const previewVisible = previewRect.bottom > shellRect.top && previewRect.top < shellRect.bottom
    const shellTop = shell.scrollTop
    const scroller = remembered?.scroller || resolveScroller()
    const top = remembered?.top ?? scroller?.scrollTop ?? 0
    const left = remembered?.left ?? scroller?.scrollLeft ?? 0
    const oldHeight = remembered?.oldHeight ?? scroller?.scrollHeight ?? 0
    const oldWidth = remembered?.oldWidth ?? scroller?.scrollWidth ?? 0
    const oldClientHeight = remembered?.oldClientHeight ?? scroller?.clientHeight ?? 0
    const oldClientWidth = remembered?.oldClientWidth ?? scroller?.clientWidth ?? 0
    const oldPreviewWidth = preview.clientWidth
    const oldPreviewHeight = preview.clientHeight
    // A passive fit may outlive the RAF window, but never renew an old capture.
    const expiresAt = remembered?.expiresAt ?? capturedAt + 5000
    let anchorElement = remembered?.anchorElement
    let anchorFraction = remembered?.anchorFraction || 0
    if (!remembered && scroller && position === 'left') {
      const bounds = scroller.getBoundingClientRect()
      const point = bounds.top + oldClientHeight * 0.42
      // A few hit tests capture the actual visible semantic line/page without
      // querySelectorAll over the entire source. Descend only the hit shadow path.
      const hitRoot = scroller.getRootNode() as Document | ShadowRoot
      for (const fraction of [0.5, 0.25, 0.75, 0.1, 0.9]) {
        let owner: Document | ShadowRoot = hitRoot
        let hit: Element | null = null
        for (let depth = 0; depth < 8; depth++) {
          const next = owner.elementFromPoint?.(bounds.left + bounds.width * fraction, point)
          if (!next || next === hit) break
          hit = next
          if (!hit.shadowRoot) break
          owner = hit.shadowRoot
        }
        const candidate = hit?.closest<HTMLElement>(
          '[data-line],[data-page-number],[data-viewer-anchor-id]'
        )
        if (candidate && scroller.contains(candidate)) {
          anchorElement = candidate
          break
        }
      }
      if (!anchorElement) {
        let bestTop = -Infinity
        visitElements(scroller, (candidate) => {
          if (
            !candidate.matches(DEFAULT_FILE_VIEWER_ANCHOR_SELECTOR) ||
            candidate.closest(DEFAULT_FILE_VIEWER_ANCHOR_EXCLUDE_SELECTOR)
          )
            return
          const rect = candidate.getBoundingClientRect()
          if (rect.height > 0 && rect.top <= point && rect.bottom > point && rect.top >= bestTop) {
            anchorElement = candidate
            bestTop = rect.top
          }
        })
      }
      if (anchorElement) {
        const rect = anchorElement.getBoundingClientRect()
        if (rect.height > 0) anchorFraction = (point - rect.top) / rect.height
        else anchorElement = undefined
      }
    }

    if (scroller && position === 'left')
      pendingCapture = {
        scroller,
        top,
        left,
        oldHeight,
        oldWidth,
        oldClientHeight,
        oldClientWidth,
        anchorElement,
        anchorFraction,
        expiresAt
      }

    return () => {
      if (disposed || token !== generation) return
      if (position === 'top') {
        if (previewVisible)
          shell.scrollTop = Math.max(
            0,
            shellTop + preview.getBoundingClientRect().top - previewRect.top
          )
        return
      }
      if (!scroller) return
      let previousGeometry = ''
      let stableFrames = 0
      let restoredGeometry = ''
      let startedAt = view.performance.now()
      let fitCommitted = false
      let waitingForFit = false
      let expectedViewport = ''
      const binding = resolveViewStateProvider(scroller)
      const viewport = () => `${preview.clientWidth}:${preview.clientHeight}`
      const current = () => !disposed && token === generation &&
        view.performance.now() < expiresAt && scroller.isConnected &&
        preview.isConnected && containsPreviewElement(scroller) &&
        (!binding || binding.host.__flyfishViewerViewStateProvider === binding.provider)
      const applyAnchor = () => {
        if (!current()) { cancel(); return false }
        const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
        let nextTop = top
        if (scroller.scrollHeight !== oldHeight || scroller.clientWidth !== oldClientWidth) {
          if (anchorElement?.isConnected && scroller.contains(anchorElement)) {
            const rect = anchorElement.getBoundingClientRect()
            nextTop =
              rect.top -
              scroller.getBoundingClientRect().top +
              scroller.scrollTop +
              anchorFraction * rect.height -
              scroller.clientHeight * 0.42
          } else {
            nextTop =
              oldHeight > oldClientHeight ? (top / (oldHeight - oldClientHeight)) * maxTop : 0
          }
        }
        const nextLeft =
          scroller.scrollWidth === oldWidth
            ? left
            : oldWidth > oldClientWidth
              ? (left / (oldWidth - oldClientWidth)) * maxLeft
              : 0
        scroller.scrollTop = Math.min(maxTop, Math.max(0, nextTop))
        scroller.scrollLeft = Math.min(maxLeft, Math.max(0, nextLeft))
        return true
      }
      const finish = () => {
        if (token !== generation || disposed) return
        stopScheduledWork()
        if (!current()) return cancel()
        // Slow frames may never produce three stable observations. Flush once
        // before ending the same bounded work window instead of losing its anchor.
        if (!applyAnchor()) return
        const viewportChanged = preview.clientWidth !== oldPreviewWidth ||
          preview.clientHeight !== oldPreviewHeight
        if (binding && !fitCommitted && viewportChanged &&
            anchorElement?.isConnected && scroller.contains(anchorElement)) {
          expectedViewport = viewport()
          waitingForFit = true
        } else cancel()
      }
      const restore = () => {
        frame = timer = undefined
        if (token !== generation || disposed) return
        if (!current()) return cancel()
        if (view.performance.now() - startedAt >= 250) return finish()
        const geometry = [scroller.clientWidth, scroller.clientHeight,
          scroller.scrollWidth, scroller.scrollHeight].join(':')
        stableFrames = geometry === previousGeometry ? stableFrames + 1 : 0
        previousGeometry = geometry
        if (stableFrames >= 2 && geometry !== restoredGeometry) {
          restoredGeometry = geometry
          if (!applyAnchor()) return
        }
        schedule()
      }
      const schedule = () => {
        if (view.requestAnimationFrame) frame = view.requestAnimationFrame(restore)
        else timer = view.setTimeout(restore, 16)
      }
      if (binding) {
        const unsubscribe = binding.provider.subscribe!(change => {
          if (token !== generation || disposed) return
          if (!current() || change.source === 'user' || change.source === 'api') return cancel()
          const fit = change.source === 'viewer' && ['fit', 'zoom-reset'].includes(change.action)
          if (waitingForFit) {
            if (viewport() !== expectedViewport || !anchorElement?.isConnected ||
                !scroller.contains(anchorElement)) return cancel()
            if (!fit) {
              if (change.source === 'viewer' && change.action === 'zoom-change') {
                // PDF emits this intermediate event before its synchronous fit
                // commit, but manual zoom emits it too. Never restore on it.
                void Promise.resolve().then(() => {
                  if (token === generation && waitingForFit) cancel()
                })
                return
              }
              return cancel()
            }
          }
          if (!fit) return
          fitCommitted = true
          if (!applyAnchor()) return
          if (waitingForFit) {
            // No polling survives the first deadline. A single late, same-view
            // fit commit can resume bounded settling, never another fit/zoom call.
            waitingForFit = false
            startedAt = view.performance.now()
            previousGeometry = restoredGeometry = ''
            stableFrames = 0
            deadline = view.setTimeout(finish, 250)
            schedule()
          }
        })
        if (token !== generation || disposed) { unsubscribe(); return }
        unsubscribeFit = unsubscribe
      }
      deadline = view.setTimeout(finish, 250)
      schedule()
    }
  }

  return {
    beforeChange,
    cancel,
    dispose() {
      disposed = true
      cancel()
      intentEvents.forEach((type) => preview?.removeEventListener(type, intent, true))
    }
  }
}
