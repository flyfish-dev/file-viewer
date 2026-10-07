/** Stable, Unicode-preserving heading anchors without touching authored IDs. */
export function installMarkdownAnchors(root: HTMLElement, article: HTMLElement): () => void {
  const used = new Set(Array.from(article.querySelectorAll('[id]'), (element) => element.id))
  for (const heading of Array.from(article.querySelectorAll('h1,h2,h3,h4,h5,h6'))) {
    if (heading.id) continue
    const slug =
      (heading.textContent || '')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}_\-\s]/gu, '')
        .replace(/\s/g, '-') || 'section'
    let id = slug
    for (let suffix = 1; used.has(id); suffix++) id = `${slug}-${suffix}`
    heading.id = id
    used.add(id)
  }
  const focusTargets = new Set<HTMLElement>()
  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    const source = event.target as Element | null
    const anchor = source?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!anchor || !article.contains(anchor) || anchor.hasAttribute('download')) return
    const target = anchor.getAttribute('target')
    if (target && target.toLowerCase() !== '_self') return
    const href = (anchor.getAttribute('href') || '').trim()
    if (!href.startsWith('#') || href === '#') return
    let id: string
    try {
      id = decodeURIComponent(href.slice(1))
    } catch {
      return
    }
    // Neither CSS selectors nor document.getElementById work reliably here:
    // IDs may contain punctuation and another viewer may have the same heading.
    const destination = Array.from(article.querySelectorAll<HTMLElement>('[id]')).find(
      (element) => element.id === id
    )
    if (!destination) return
    event.preventDefault()
    const rootRect = root.getBoundingClientRect()
    const ratio = root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1
    const top = (destination.getBoundingClientRect().top - rootRect.top) / (ratio || 1)
    root.scrollTop += top - root.clientTop
    if (!destination.hasAttribute('tabindex')) {
      destination.setAttribute('tabindex', '-1')
      focusTargets.add(destination)
    }
    destination.focus({ preventScroll: true })
  }
  article.addEventListener('click', onClick)
  return () => {
    article.removeEventListener('click', onClick)
    for (const element of focusTargets) {
      if (element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex')
    }
  }
}
