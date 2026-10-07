/** Navigate within the renderer's owned scroller, independent of offsetParent.
 * WebKit can skip a scrolling ancestor in a transformed/contained host.
 */
export function scrollPdfPageWithinContainer(container: HTMLElement, page: HTMLElement | null): boolean {
  if (!page || !container.contains(page) || container.clientHeight <= 0) return false
  const containerRect = container.getBoundingClientRect()
  const pageRect = page.getBoundingClientRect()
  const scale = container.offsetHeight > 0 ? containerRect.height / container.offsetHeight : 1
  if (!Number.isFinite(scale) || scale <= 0 || pageRect.height <= 0) return false
  const top = container.scrollTop + (pageRect.top - containerRect.top) / scale - container.clientTop
  container.scrollTop = Math.min(Math.max(0, top), Math.max(0, container.scrollHeight - container.clientHeight))
  return true
}
