import { observeFileViewerColorScheme, type FileViewerOptions } from '@file-viewer/core'
import type { EpubMediaRendition } from './epub-viewport-media.js'

const DARK_READING_STYLE = `
html,body{color-scheme:dark;background:#111827!important;color:#e5e7eb!important}
body :is(p,div,section,article,main,header,footer,aside,h1,h2,h3,h4,h5,h6,span,em,strong,b,i,u,small,blockquote,pre,code,ul,ol,li,dl,dt,dd,table,thead,tbody,tfoot,tr,td,th,figcaption){color:inherit!important;background-color:transparent!important}
a,a:visited{color:#93c5fd!important}
::selection{background:#1e40af;color:#fff}
`

/** Theme existing and future chapter documents without navigating or inverting images. */
export const bindEpubReadingTheme = (
  rendition: EpubMediaRendition,
  target: HTMLElement,
  root: HTMLElement,
  options?: FileViewerOptions
) => {
  let dark = false
  const updateContents = ({ document }: { document: Document }) => {
    if (!document.head || !document.body) return
    let style = document.querySelector<HTMLStyleElement>('style[data-file-viewer-reading-theme]')
    if (!dark) {
      style?.remove()
      return
    }
    if (!style) {
      style = document.createElement('style')
      style.dataset.fileViewerReadingTheme = 'dark'
      style.textContent = DARK_READING_STYLE
      document.head.append(style)
    }
  }
  rendition.hooks.content.register(updateContents)
  const stop = observeFileViewerColorScheme(target, options?.theme, (theme) => {
    dark = options?.epub?.darkMode ?? theme === 'dark'
    root.dataset.epubTheme = theme
    root.dataset.epubReadingTheme = dark ? 'dark' : 'light'
    rendition.getContents().forEach(updateContents)
  })
  return () => {
    stop()
    rendition.hooks.content.deregister(updateContents)
  }
}
