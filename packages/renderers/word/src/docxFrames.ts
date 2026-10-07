/**
 * The DOCX engine may exhaust its awaitLayout yield budget before its async
 * pagination task finishes. Until that task is idle it owns direct page
 * children: reparenting them makes continuation pages appear inside frames and
 * prevents the engine from finding/removing empty pages.
 */
export function observeDocxFrames(
  target: HTMLElement,
  pagedLayout: boolean,
  onFrames: (frames: HTMLElement[]) => void
): () => void {
  const wrapper = target.querySelector<HTMLElement>('.docx-wrapper')
  if (!wrapper) return () => {}
  const view = target.ownerDocument.defaultView
  const Observer = view?.MutationObserver
  let disposed = false
  let frames: HTMLElement[] = []

  const sync = () => {
    if (
      disposed ||
      wrapper.dataset.docxPaginating === 'true' ||
      wrapper.dataset.docxPaginationScheduled === 'true'
    )
      return

    const next: HTMLElement[] = []
    for (const child of Array.from(wrapper.children)) {
      if (child.matches('section.docx')) {
        const frame = target.ownerDocument.createElement('div')
        frame.className = pagedLayout ? 'docx-page-frame' : 'docx-flow-frame'
        frame.dataset.docxResponsiveFrame = 'true'
        child.before(frame)
        frame.appendChild(child)
        next.push(frame)
      } else if (child.getAttribute('data-docx-responsive-frame') === 'true') {
        next.push(child as HTMLElement)
      }
    }
    if (next.length !== frames.length || next.some((frame, i) => frame !== frames[i])) {
      frames = next
      onFrames([...frames])
    }
  }

  const observer = Observer ? new Observer(sync) : null
  observer?.observe(wrapper, {
    childList: true,
    attributes: true,
    attributeFilter: [
      'data-docx-paginating',
      'data-docx-pagination-scheduled',
      'data-docx-paginated'
    ]
  })
  sync()
  return () => {
    disposed = true
    observer?.disconnect()
    frames = []
  }
}
