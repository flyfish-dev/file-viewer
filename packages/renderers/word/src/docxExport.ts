/** The flow's minimum paper height is independent of its current content height. */
export function readDocxFlowPaperHeight(page: HTMLElement | null, fallback: number): number {
  if (!page) return fallback
  const value = page.ownerDocument.defaultView?.getComputedStyle(page).minHeight || ''
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim())
  const height = match ? Number(match[1]) : 0
  return Number.isFinite(height) && height > 0 ? height : fallback
}
