/**
 * Apply explicit, non-leader tab positions emitted by the DOCX engine.
 * The viewer owns the measured display box: offsets are computed in unscaled CSS
 * pixels after pagination/fitting, from metadata rather than text heuristics.
 * Leader/TOC layout remains engine-owned.
 */
const cssNumber = (value: string): number => Number.parseFloat(value) || 0

function pixels(value: string | undefined): number | null {
  const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(pt|px|in|cm|mm|pc)?$/i.exec(value?.trim() || '')
  if (!match) return null
  const factors: Record<string, number> = { pt: 4 / 3, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pc: 16 }
  const result = Number(match[1]) * (factors[match[2]?.toLowerCase() || 'px'] ?? 1)
  return Number.isFinite(result) ? result : null
}

function borderBoxWidth(style: CSSStyleDeclaration): number {
  return cssNumber(style.width) + (style.boxSizing === 'border-box' ? 0 :
    cssNumber(style.paddingLeft) + cssNumber(style.paddingRight) +
    cssNumber(style.borderLeftWidth) + cssNumber(style.borderRightWidth))
}

function nextBoundary(tab: HTMLElement, paragraph: HTMLElement): Element | null {
  // A tab aligns only the following segment, not another tab, explicit line
  // break, paragraph or an independently positioned drawing/text box.
  const walker = paragraph.ownerDocument.createTreeWalker(paragraph, 1)
  walker.currentNode = tab
  for (let node = walker.nextNode() as Element | null; node; node = walker.nextNode() as Element | null) {
    if (node.closest('p') !== paragraph || node.matches('br, [data-docx-tab], [data-docx-float], .docx-paragraph-frame')) return node
  }
  return null
}

export function layoutDocxExplicitTabs(root: HTMLElement): number {
  const view = root.ownerDocument.defaultView
  if (!view) return 0
  const groups = new Map<HTMLElement, HTMLElement[]>()
  for (const tab of root.querySelectorAll<HTMLElement>('[data-docx-tab="true"][data-docx-tab-pos]')) {
    const paragraph = tab.closest('p')
    if (!paragraph || !root.contains(paragraph) || tab.closest('.docx-tab-leader-line, .docx-toc-paragraph') ||
      (tab.dataset.docxTabLeader && tab.dataset.docxTabLeader !== 'none') ||
      !['left', 'right', 'center'].includes(tab.dataset.docxTabAlign || 'left') ||
      pixels(tab.dataset.docxTabPos) === null) continue
    const list = groups.get(paragraph) || []
    list.push(tab)
    groups.set(paragraph, list)
  }
  let applied = 0
  for (const [paragraph, tabs] of groups) {
    const style = view.getComputedStyle(paragraph)
    // Vertical/RTL text requires different inline progression and is not
    // approximated with a left-to-right physical-coordinate calculation.
    if (style.direction === 'rtl' || style.writingMode && style.writingMode !== 'horizontal-tb' ||
      style.textAlign === 'center' || style.textAlign === 'right' || style.textAlign === 'end') continue
    const box = paragraph.getBoundingClientRect()
    const width = borderBoxWidth(style)
    const scale = width > 0 ? box.width / width : 0
    if (!Number.isFinite(scale) || scale <= 0 || box.width <= 0) continue
    const origin = box.left + (cssNumber(style.borderLeftWidth) + cssNumber(style.paddingLeft)) * scale
    // Start at zero, not the previous measured width. Otherwise right tabs
    // oscillate or compound after resize, font readiness and zoom.
    for (const tab of tabs) {
      tab.style.width = '0px'
      tab.style.minWidth = '0px'
    }
    for (const tab of tabs) {
      const stop = pixels(tab.dataset.docxTabPos)!
      const tabRect = tab.getBoundingClientRect()
      const range = paragraph.ownerDocument.createRange()
      range.setStartAfter(tab)
      const boundary = nextBoundary(tab, paragraph)
      if (boundary) range.setEndBefore(boundary)
      else range.setEnd(paragraph, paragraph.childNodes.length)
      // Only first-line content participates in this tab segment. Empty or
      // trailing tabs are valid and have a following width of zero.
      const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 &&
        r.bottom > tabRect.top + 0.1 && r.top < tabRect.bottom - 0.1)
      let start = Number.POSITIVE_INFINITY
      let end = Number.NEGATIVE_INFINITY
      for (const rect of rects) {
        start = Math.min(start, rect.left)
        end = Math.max(end, rect.right)
      }
      const trailingWidth = rects.length ? Math.max(0, end - start) / scale : 0
      const factor = tab.dataset.docxTabAlign === 'right' ? 1 : tab.dataset.docxTabAlign === 'center' ? 0.5 : 0
      const gap = Math.max(0, stop - (tabRect.left - origin) / scale - trailingWidth * factor)
      if (!Number.isFinite(gap)) continue
      tab.style.width = `${gap.toFixed(4)}px`
      applied++
    }
  }
  return applied
}
