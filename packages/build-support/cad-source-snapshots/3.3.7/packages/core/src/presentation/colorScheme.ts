import { resolveFileViewerColorScheme } from '../config/options'
import type { FileViewerResolvedThemeMode, FileViewerThemeMode } from '../contracts/types'

/** Observe the owning viewer, including hosts across a shadow boundary. */
export const observeFileViewerColorScheme = (
  target: HTMLElement,
  fallback: FileViewerThemeMode | undefined,
  apply: (theme: FileViewerResolvedThemeMode) => void
) => {
  const view = target.ownerDocument.defaultView
  const media = view?.matchMedia?.('(prefers-color-scheme: dark)')
  const ancestors: HTMLElement[] = []
  let element: HTMLElement | null = target
  while (element) {
    ancestors.push(element)
    const root = element.getRootNode() as ShadowRoot
    element = element.parentElement || (root.host as HTMLElement | undefined) || null
  }
  let current: FileViewerResolvedThemeMode | undefined
  const update = () => {
    const inherited = ancestors
      .map((node) => node.getAttribute('data-viewer-theme'))
      .find(
        (value): value is FileViewerThemeMode =>
          value === 'light' || value === 'dark' || value === 'system'
      )
    const next = resolveFileViewerColorScheme(inherited || fallback, media?.matches ?? false)
    if (next !== current) {
      current = next
      apply(next)
    }
  }
  const observer = view?.MutationObserver ? new view.MutationObserver(update) : undefined
  ancestors.forEach((node) =>
    observer?.observe(node, { attributes: true, attributeFilter: ['data-viewer-theme'] })
  )
  if (media?.addEventListener) media.addEventListener('change', update)
  else media?.addListener(update)
  update()
  return () => {
    observer?.disconnect()
    if (media?.removeEventListener) media.removeEventListener('change', update)
    else media?.removeListener(update)
  }
}
