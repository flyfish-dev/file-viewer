/** Mouse-only panning. Native touch scrolling/pinch and interactive PDF controls
 * retain their browser/PDF.js behavior. All state belongs to this viewport. */
export function installPdfHandTool(container: HTMLElement): () => void {
  const view = container.ownerDocument.defaultView
  if (!view) return () => {}
  const previousCursor = container.style.getPropertyValue('cursor')
  const cursorPriority = container.style.getPropertyPriority('cursor')
  const interactive =
    'a,button,input,textarea,select,option,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="textbox"]'
  let drag: {
    id: number
    x: number
    y: number
    left: number
    top: number
    ratio: number
    moved: boolean
    selection: string
    priority: string
  } | null = null
  let suppressClick = false
  let clickTimer = 0
  container.style.cursor = 'grab'

  const finish = () => {
    if (!drag) return
    const state = drag
    drag = null
    container.style.setProperty('user-select', state.selection, state.priority)
    container.style.cursor = 'grab'
    view.removeEventListener('pointermove', move, true)
    view.removeEventListener('pointerup', up, true)
    view.removeEventListener('pointercancel', up, true)
    view.removeEventListener('blur', finish)
    if (container.hasPointerCapture?.(state.id)) container.releasePointerCapture(state.id)
    suppressClick = state.moved
    view.clearTimeout(clickTimer)
    clickTimer = view.setTimeout(() => {
      suppressClick = false
    }, 0)
  }
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    if (!(event.buttons & 1)) {
      finish()
      return
    }
    const dx = (event.clientX - drag.x) / drag.ratio
    const dy = (event.clientY - drag.y) / drag.ratio
    drag.moved ||= Math.hypot(dx, dy) >= 3
    container.scrollLeft = drag.left - dx
    container.scrollTop = drag.top - dy
    event.preventDefault()
  }
  const up = (event: PointerEvent) => {
    if (event.pointerId === drag?.id) finish()
  }
  const down = (event: PointerEvent) => {
    if (
      event.defaultPrevented ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      event.isPrimary === false ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    )
      return
    if (
      event
        .composedPath()
        .some((node) => node !== container && (node as Element).matches?.(interactive))
    )
      return
    if (
      container.scrollWidth <= container.clientWidth &&
      container.scrollHeight <= container.clientHeight
    )
      return
    const rect = container.getBoundingClientRect()
    const ratio = container.offsetWidth > 0 ? rect.width / container.offsetWidth : 1
    if (!Number.isFinite(ratio) || ratio <= 0) return
    // Leave the native scrollbar hit areas alone.
    const x = (event.clientX - rect.left) / ratio - container.clientLeft
    const y = (event.clientY - rect.top) / ratio - container.clientTop
    if (x < 0 || y < 0 || x >= container.clientWidth || y >= container.clientHeight) return
    finish()
    suppressClick = false
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: container.scrollLeft,
      top: container.scrollTop,
      ratio,
      moved: false,
      selection: container.style.getPropertyValue('user-select'),
      priority: container.style.getPropertyPriority('user-select')
    }
    container.style.cursor = 'grabbing'
    container.style.setProperty('user-select', 'none')
    try {
      container.setPointerCapture?.(event.pointerId)
    } catch {
      /* Window listeners also cover older embedded webviews. */
    }
    view.addEventListener('pointermove', move, { capture: true, passive: false })
    view.addEventListener('pointerup', up, true)
    view.addEventListener('pointercancel', up, true)
    view.addEventListener('blur', finish)
    event.preventDefault()
  }
  const click = (event: MouseEvent) => {
    if (suppressClick && event.detail > 0) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }
  const nativeDrag = (event: DragEvent) => {
    if (drag) event.preventDefault()
  }
  container.addEventListener('pointerdown', down)
  container.addEventListener('lostpointercapture', up)
  container.addEventListener('click', click, true)
  container.addEventListener('dragstart', nativeDrag)
  return () => {
    finish()
    view.clearTimeout(clickTimer)
    suppressClick = false
    container.style.setProperty('cursor', previousCursor, cursorPriority)
    container.removeEventListener('pointerdown', down)
    container.removeEventListener('lostpointercapture', up)
    container.removeEventListener('click', click, true)
    container.removeEventListener('dragstart', nativeDrag)
  }
}
