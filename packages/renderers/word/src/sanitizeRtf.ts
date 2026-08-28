import { sanitizeFileViewerDocumentMarkup, sanitizeMsDocLinkHref } from '@file-viewer/doc'

// eslint-disable-next-line no-control-regex -- remove URL controls before scheme validation
const compactUrl = (value: string) => value.trim().replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
const schemeOf = (value: string) =>
  compactUrl(value)
    .match(/^([a-z][a-z0-9+.-]*):/i)?.[1]
    ?.toLowerCase()

export type FileViewerRtfExternalPolicy = 'allow' | 'block'

export interface FileViewerRtfSanitizeOptions {
  externalLinkPolicy?: FileViewerRtfExternalPolicy
  externalResourcePolicy?: FileViewerRtfExternalPolicy
}

const normalizeRtfBookmarkHref = (value: string) => {
  const match = String(value ?? '')
    .trim()
    .match(/^\\l\s+(?:"([^"]+)"|([^\s"]+))\s*$/i)
  if (!match) return null
  const bookmark = (match[1] || match[2] || '').trim()
  return /^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(bookmark) ? `#${bookmark}` : null
}

/**
 * Canonicalizes an RTF field hyperlink through the same policy used by DOC.
 * Word's `HYPERLINK \\l "bookmark"` field syntax is converted to a fragment
 * before external navigation is considered, so bookmarks remain available
 * even when the default external-link policy is `block`.
 */
export const sanitizeFileViewerRtfHyperlink = (
  value: string,
  policy: FileViewerRtfExternalPolicy = 'block'
) => {
  const bookmarkHref = normalizeRtfBookmarkHref(value)
  return sanitizeMsDocLinkHref(bookmarkHref || value, policy)
}

export const isSafeFileViewerRtfHyperlink = (
  value: string,
  policy: FileViewerRtfExternalPolicy = 'allow'
) => sanitizeFileViewerRtfHyperlink(value, policy) !== null

const sanitizeResourceUrl = (value: string, policy: FileViewerRtfExternalPolicy = 'block') => {
  const compact = compactUrl(value)
  if (compact.startsWith('#')) return compact
  if (/^data:image\/(?:png|gif|jpe?g|webp);base64,/i.test(compact)) return compact
  const scheme = schemeOf(compact)
  if (scheme === 'blob') return compact
  if (policy !== 'allow') return null
  if (scheme === 'http' || scheme === 'https') return compact
  if (!scheme && !compact.startsWith('//') && !compact.includes('\\')) return compact
  return null
}

const decodeCssEscapes = (value: string) =>
  value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_match, digits: string) => {
      const codePoint = Number.parseInt(digits, 16)
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/\\([^\r\n\f])/g, '$1')

const safeStyle = (value: string) =>
  !/(?:expression\s*\(|(?:url|src|image|image-set|cross-fade)\s*\(|@import|behavior\s*:|-moz-binding)/i.test(
    decodeCssEscapes(value)
  )

const isResourceHrefElement = (node: Element) =>
  ['image', 'use'].includes(node.localName.toLowerCase())

export const createFileViewerRtfHyperlinkContainer = (
  documentRef: Document,
  create: () => HTMLElement,
  hyperlink: { url: () => string },
  policy: FileViewerRtfExternalPolicy = 'block'
) => {
  const href = sanitizeFileViewerRtfHyperlink(hyperlink.url(), policy)
  if (!href) {
    const span = documentRef.createElement('span')
    span.dataset.fileViewerBlockedLink = 'true'
    span.setAttribute('aria-disabled', 'true')
    return { element: span, content: span }
  }
  const anchor = create()
  anchor.setAttribute('href', href)
  if ((anchor.getAttribute('target') || '').toLowerCase() === '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
  return { element: anchor, content: anchor }
}

const fallbackFragment = (documentRef: Document, text: string) => {
  const fragment = documentRef.createDocumentFragment()
  fragment.append(documentRef.createTextNode(text))
  return fragment
}

const sanitizeFileViewerRtfMarkup = (
  documentRef: Document,
  markup: string,
  fallbackText: string,
  options: FileViewerRtfSanitizeOptions = {}
): DocumentFragment => {
  const fallback = () => {
    return fallbackFragment(documentRef, fallbackText)
  }
  const windowRef = documentRef.defaultView
  if (!windowRef) return fallback()
  const fragment = sanitizeFileViewerDocumentMarkup(markup, windowRef, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: ['target'],
    FORBID_TAGS: [
      'base',
      'embed',
      'foreignObject',
      'form',
      'iframe',
      'object',
      'script',
      'style',
      'template'
    ],
    FORBID_ATTR: ['action', 'formaction', 'srcdoc']
  }) as DocumentFragment | null
  if (fragment?.nodeType !== 11) return fallback()
  fragment.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name)
      else if (attribute.name.toLowerCase() === 'style' && !safeStyle(attribute.value))
        node.removeAttribute(attribute.name)
      else if (/^(?:href|xlink:href)$/i.test(attribute.name)) {
        const href = isResourceHrefElement(node)
          ? sanitizeResourceUrl(attribute.value, options.externalResourcePolicy ?? 'block')
          : sanitizeFileViewerRtfHyperlink(attribute.value, options.externalLinkPolicy ?? 'block')
        if (href) node.setAttribute(attribute.name, href)
        else node.removeAttribute(attribute.name)
      } else if (/^src$/i.test(attribute.name)) {
        const source = sanitizeResourceUrl(
          attribute.value,
          options.externalResourcePolicy ?? 'block'
        )
        if (source) node.setAttribute(attribute.name, source)
        else node.removeAttribute(attribute.name)
      } else if (/^(?:background|poster|srcset)$/i.test(attribute.name)) {
        node.removeAttribute(attribute.name)
      } else if (/^ping$/i.test(attribute.name)) {
        node.removeAttribute(attribute.name)
      }
    }
    if (node instanceof windowRef.HTMLAnchorElement) {
      if ((node.getAttribute('href') || '').startsWith('#')) node.removeAttribute('target')
      else if ((node.getAttribute('target') || '').toLowerCase() === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })
  return fragment
}

export const sanitizeFileViewerRtfElement = (
  documentRef: Document,
  element: HTMLElement,
  options: FileViewerRtfSanitizeOptions = {}
) => sanitizeFileViewerRtfMarkup(documentRef, element.outerHTML, element.textContent || '', options)

/**
 * Safe serialization boundary for integrations that consume renderer markup
 * directly instead of mounting through the standard File Viewer handler.
 */
export const sanitizeFileViewerRtfHtml = (
  documentRef: Document,
  markup: string,
  options: FileViewerRtfSanitizeOptions = {}
) => {
  const container = documentRef.createElement('div')
  container.append(sanitizeFileViewerRtfMarkup(documentRef, markup, markup, options))
  return container.innerHTML
}
