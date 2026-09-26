const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
const INHERITED_TEXT_PROPERTIES = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant',
  'font-kerning', 'line-height', 'letter-spacing', 'word-spacing', 'white-space',
  'text-align', 'text-indent', 'color', 'direction', 'writing-mode',
] as const

/**
 * DOM construction permits block divs inside a paragraph, but HTML parsing
 * closes that paragraph at the div start tag. Use a phrasing tag with the same
 * display/typography in the export clone so reparsing cannot split the story.
 * Never flatten a chart to a screenshot or modify the live renderer DOM.
 */
export function preserveDocxParagraphStructureForExport(source: HTMLElement, clone: HTMLElement): void {
  if (source === clone) return
  const view = source.ownerDocument.defaultView
  if (!view) return
  const originals = Array.from(source.querySelectorAll<HTMLElement>('p div'))
  const copies = Array.from(clone.querySelectorAll<HTMLElement>('p div'))
  if (originals.length !== copies.length) return

  for (let index = 0; index < originals.length; index++) {
    const original = originals[index]
    const copy = copies[index]
    const paragraph = original.closest('p')
    if (!paragraph || original.namespaceURI !== HTML_NAMESPACE || copy.namespaceURI !== HTML_NAMESPACE) continue
    // An SVG foreignObject establishes another parsing context; leave it alone.
    let ancestor = original.parentElement
    while (ancestor && ancestor !== paragraph && ancestor.namespaceURI === HTML_NAMESPACE) ancestor = ancestor.parentElement
    if (ancestor !== paragraph) continue

    const replacement = clone.ownerDocument.createElement('span')
    for (const attribute of Array.from(copy.attributes)) replacement.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value)
    const computed = view.getComputedStyle(original)
    replacement.style.setProperty('display', computed.display || 'block', copy.style.getPropertyPriority('display'))
    // Word styles target spans too. Preserve the div's resolved text styles so
    // changing only its tag name cannot introduce a new font or line-box size.
    for (const property of INHERITED_TEXT_PROPERTIES) {
      const value = computed.getPropertyValue(property)
      if (value) replacement.style.setProperty(property, value, copy.style.getPropertyPriority(property))
    }
    replacement.append(...Array.from(copy.childNodes))
    copy.replaceWith(replacement)
  }
}

/** The flow's minimum paper height is independent of its current content height. */
export function readDocxFlowPaperHeight(page: HTMLElement | null, fallback: number): number {
  if (!page) return fallback
  const value = page.ownerDocument.defaultView?.getComputedStyle(page).minHeight || ''
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim())
  const height = match ? Number(match[1]) : 0
  return Number.isFinite(height) && height > 0 ? height : fallback
}
