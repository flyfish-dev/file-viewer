const authoredLeft = new WeakMap<HTMLElement, string>()
const number = (value: string) => Number.parseFloat(value) || 0

/**
 * A paragraph-relative vertical anchor makes that paragraph an absolute-position
 * containing block. Its horizontal axis can still be relative to the column or
 * page margins: paragraph indentation must not be added to that authored offset.
 * Keep the engine's original CSS length and correct only the containing-block
 * origin. Recompute after fitting/resizing; never accumulate pixel corrections.
 */
export function correctDocxMixedAnchorOrigins(section: HTMLElement): void {
  const view = section.ownerDocument.defaultView
  if (!view) return
  const pageRect = section.getBoundingClientRect()
  const pageStyle = view.getComputedStyle(section)
  const pageWidth = number(pageStyle.width) + (pageStyle.boxSizing === 'border-box' ? 0 :
    number(pageStyle.paddingLeft) + number(pageStyle.paddingRight) + number(pageStyle.borderLeftWidth) + number(pageStyle.borderRightWidth))
  const scale = pageWidth ? pageRect.width / pageWidth : 0
  if (!Number.isFinite(scale) || scale <= 0) return

  for (const anchor of section.querySelectorAll<HTMLElement>('[data-docx-anchor-horizontal="column"], [data-docx-anchor-horizontal="margin"]')) {
    const paragraph = anchor.closest<HTMLElement>('[data-docx-anchor-context="paragraph"]')
    if (!paragraph || anchor.offsetParent !== paragraph || view.getComputedStyle(anchor).position !== 'absolute' || !anchor.style.left) continue
    // Cell-relative drawings are left to the engine's layoutInCell policy.
    if (paragraph.closest('td, th')) continue
    const root = anchor.dataset.docxAnchorHorizontal === 'margin'
      ? section : paragraph.closest<HTMLElement>('article, header, footer')
    if (!root || !section.contains(root) && root !== section) continue
    const rootStyle = view.getComputedStyle(root)
    const rootRect = root.getBoundingClientRect()
    let origin = rootRect.left + (number(rootStyle.borderLeftWidth) + number(rootStyle.paddingLeft)) * scale
    const paragraphStyle = view.getComputedStyle(paragraph)
    const paragraphRect = paragraph.getBoundingClientRect()
    if (root !== section) {
      const count = number(rootStyle.columnCount)
      const width = number(rootStyle.columnWidth)
      if (count > 1 || width > 0) {
        const gap = rootStyle.columnGap === 'normal' ? number(rootStyle.fontSize) : number(rootStyle.columnGap)
        const contentWidth = root.clientWidth - number(rootStyle.paddingLeft) - number(rootStyle.paddingRight)
        const columns = count > 0 ? count : Math.max(1, Math.floor((contentWidth + gap) / (width + gap)))
        const stride = (contentWidth + gap) / columns
        if (stride > 0) {
          const unindentedLeft = (paragraphRect.left - origin) / scale - number(paragraphStyle.marginLeft)
          origin += Math.round(unindentedLeft / stride) * stride * scale
        }
      }
    }
    const containingOrigin = paragraphRect.left + number(paragraphStyle.borderLeftWidth) * scale
    const correction = (origin - containingOrigin) / scale
    if (!Number.isFinite(correction)) continue
    const left = authoredLeft.get(anchor) ?? anchor.style.left
    authoredLeft.set(anchor, left)
    anchor.style.left = Math.abs(correction) < 0.01 ? left : `calc(${left} + ${correction.toFixed(4)}px)`
  }
}
