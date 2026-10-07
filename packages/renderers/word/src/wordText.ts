import { decodeFileViewerTextBuffer, type FileRenderContext } from '@file-viewer/core'
import { defaultMsDocCss } from '@file-viewer/doc'
import { mountWordDocument } from './wordDoc.js'
import { sanitizeFileViewerRtfHtml } from './sanitizeRtf.js'

let scopeNumber = 0

/**
 * Word's HTML exports often keep their .doc suffix. Use the document sanitizer
 * and the existing page lifecycle, never inject the original active HTML.
 * Constructable stylesheets parse locally: @import is not fetched by replaceSync.
 * Only flat author rules are retained; resources/active CSS pass the same policy
 * as inline markup. Other at-rules (including remote fonts) are not executed.
 */
export function renderWordText(
  buffer: ArrayBuffer, target: HTMLDivElement, kind: 'html' | 'text', context?: FileRenderContext
) {
  const text = decodeFileViewerTextBuffer(buffer).text
  const document = target.ownerDocument
  const scope = `word-text-${++scopeNumber}`
  const body = document.createElement('div')
  body.dataset.wordText = scope
  let rules = ''
  if (kind === 'text') {
    const pre = document.createElement('pre')
    pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:inherit'
    pre.textContent = text
    body.append(pre)
  } else {
    const view = document.defaultView
    if (!view) throw new Error('The Word HTML target must belong to a browser document')
    const options = {
      externalLinkPolicy: context?.options?.docx?.externalLinkPolicy ?? 'block',
      externalResourcePolicy: context?.options?.docx?.externalResourcePolicy ?? 'block'
    } as const
    // DOMPurify runs before anything is mounted; preserve safe inline content.
    body.innerHTML = sanitizeFileViewerRtfHtml(document, text, options)
    const parsed = new view.DOMParser().parseFromString(text, 'text/html')
    const Sheet = view.CSSStyleSheet
    if (Sheet && typeof Sheet.prototype.replaceSync === 'function') {
      const sheet = new Sheet()
      const holder = document.createElement('span')
      for (const style of Array.from(parsed.querySelectorAll('style'))) {
        try {
          sheet.replaceSync(style.textContent || '')
          for (const rule of Array.from(sheet.cssRules)) {
            if (rule.type !== 1) continue
            const authorRule = rule as CSSStyleRule
            const selectors = authorRule.selectorText.split(',').map(selector => selector.trim())
            // Keep ordinary Word-export selectors. Reject pseudo/global escape
            // constructs rather than approximating the cascade outside this preview.
            if (!selectors.every(selector => /^[\w\s.#>+~*-]+$/.test(selector))) continue
            holder.style.cssText = authorRule.style.cssText
            const safe = document.createElement('template')
            safe.innerHTML = sanitizeFileViewerRtfHtml(document, holder.outerHTML, options)
            const declaration = (safe.content.firstElementChild as HTMLElement | null)?.style.cssText
            if (declaration) rules += selectors.map(selector => `[data-word-text="${scope}"] ${selector}`).join(',') + `{${declaration}}\n`
          }
        } catch { /* Unsupported stylesheet syntax does not hide the document. */ }
      }
    }
  }
  return mountWordDocument({ html: body.outerHTML, css: `${defaultMsDocCss()}\n${rules}` }, target, context)
}
