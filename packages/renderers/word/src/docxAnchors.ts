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

const authoredVmlInsets = new WeakMap<SVGSVGElement, { left: string, top: string }>()
const absoluteLength = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:px|pt|pc|in|cm|mm)?$/i
const hasValue = (value: string) => value !== '' && value !== 'none' && value !== 'normal'

/** Return the nearest CSS containing block, without treating an inline wrapper as one. */
function containingBlock(element: Element, view: Window): Element | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = view.getComputedStyle(parent)
    if ((style.position && style.position !== 'static') || hasValue(style.transform) ||
      hasValue(style.perspective) || hasValue(style.filter) ||
      /(?:layout|paint|strict|content)/.test(style.contain) ||
      /(?:transform|perspective|filter)/.test(style.willChange)) return parent
  }
  return null
}

/**
 * VML's `text` reference is the text column on the horizontal axis and the
 * anchor paragraph on the vertical axis. An SVG with auto insets instead uses
 * CSS's hypothetical static position, which includes run position and paragraph
 * indentation. Consume the engine's existing anchor metadata at the measured
 * layout boundary, leaving the original margin offsets and shape paths intact.
 *
 * Only explicit, physical text-relative offsets are handled here. Character/
 * line anchors, percentage positions, table-cell policy, RTL/vertical layout and
 * nested drawing coordinate systems remain owned by the engine.
 */
export function correctDocxVmlTextAnchorOrigins(section: HTMLElement): number {
  const view = section.ownerDocument.defaultView
  if (!view) return 0
  const sectionStyle = view.getComputedStyle(section)
  const width = number(sectionStyle.width) + (sectionStyle.boxSizing === 'border-box' ? 0 :
    number(sectionStyle.paddingLeft) + number(sectionStyle.paddingRight) +
    number(sectionStyle.borderLeftWidth) + number(sectionStyle.borderRightWidth))
  const scale = width > 0 ? section.getBoundingClientRect().width / width : 0
  if (!Number.isFinite(scale) || scale <= 0) return 0

  let corrected = 0
  for (const anchor of section.querySelectorAll<SVGSVGElement>('svg[data-docx-float="true"]')) {
    if (anchor.namespaceURI !== 'http://www.w3.org/2000/svg' || anchor.ownerSVGElement ||
      view.getComputedStyle(anchor).position !== 'absolute') continue
    const horizontal = anchor.dataset.docxAnchorHorizontal === 'text' &&
      !!(anchor.style.left || anchor.style.marginLeft) && (!anchor.style.right || anchor.style.right === 'auto')
    const vertical = anchor.dataset.docxAnchorVertical === 'text' &&
      !!(anchor.style.top || anchor.style.marginTop) && (!anchor.style.bottom || anchor.style.bottom === 'auto')
    if (!horizontal && !vertical) continue
    const paragraph = anchor.closest<HTMLElement>('p')
    if (!paragraph || paragraph.closest('td, th, svg, .docx-shape-textbox')) continue
    const story = paragraph.closest<HTMLElement>('article, header, footer')
    const block = containingBlock(anchor, view)
    if (!story || !section.contains(story) || !block ||
      (block !== paragraph && block !== story && block !== section)) continue
    const blockStyle = view.getComputedStyle(block)
    const blockRect = block.getBoundingClientRect()
    const paragraphStyle = view.getComputedStyle(paragraph)
    if (paragraphStyle.direction === 'rtl' || (paragraphStyle.writingMode &&
      paragraphStyle.writingMode !== 'horizontal-tb')) continue
    const insets = authoredVmlInsets.get(anchor) ?? { left: anchor.style.left, top: anchor.style.top }
    const valid = (value: string) => !value || value === 'auto' || absoluteLength.test(value)
    // An unsupported authored value is not equivalent to zero.
    if ((horizontal && (!valid(insets.left) || !valid(anchor.style.marginLeft))) ||
      (vertical && (!valid(insets.top) || !valid(anchor.style.marginTop)))) continue

    let left = insets.left
    if (horizontal) {
      const style = view.getComputedStyle(story)
      let origin = story.getBoundingClientRect().left +
        (number(style.borderLeftWidth) + number(style.paddingLeft)) * scale
      const paragraphRect = paragraph.getBoundingClientRect()
      const count = number(style.columnCount), columnWidth = number(style.columnWidth)
      if (count > 1 || columnWidth > 0) {
        const gap = style.columnGap === 'normal' ? number(style.fontSize) : number(style.columnGap)
        const contentWidth = story.clientWidth - number(style.paddingLeft) - number(style.paddingRight)
        const columns = count > 0 ? count : Math.max(1, Math.floor((contentWidth + gap) / (columnWidth + gap)))
        const stride = (contentWidth + gap) / columns
        if (!(stride > 0)) continue
        const local = (paragraphRect.left - origin) / scale - number(paragraphStyle.marginLeft)
        origin += Math.round(local / stride) * stride * scale
      }
      const correction = (origin - blockRect.left) / scale - number(blockStyle.borderLeftWidth)
      if (!Number.isFinite(correction)) continue
      const authored = insets.left && insets.left !== 'auto' ? insets.left : '0px'
      left = Math.abs(correction) < 0.01 ? authored : `calc(${authored} + ${correction.toFixed(4)}px)`
    }
    authoredVmlInsets.set(anchor, insets)
    if (horizontal) anchor.style.left = left
    if (vertical) {
      const correction = (paragraph.getBoundingClientRect().top - blockRect.top) / scale +
        number(paragraphStyle.borderTopWidth) - number(blockStyle.borderTopWidth)
      const authored = insets.top && insets.top !== 'auto' ? insets.top : '0px'
      if (Number.isFinite(correction)) anchor.style.top = Math.abs(correction) < 0.01 ? authored :
        `calc(${authored} + ${correction.toFixed(4)}px)`
    }
    corrected++
  }
  return corrected
}
