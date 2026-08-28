import createDOMPurify from 'dompurify'
import type { DOMPurify, WindowLike } from 'dompurify'
import { sanitizeFileViewerSvgResources } from '@file-viewer/core'

const purifierByDocument = new WeakMap<Document, DOMPurify>()

const getPurifier = (documentRef: Document) => {
  const cached = purifierByDocument.get(documentRef)
  if (cached) return cached
  const windowRef = documentRef.defaultView
  if (!windowRef) return null
  const purifier = createDOMPurify(windowRef as unknown as WindowLike)
  if (!purifier.isSupported) return null
  purifierByDocument.set(documentRef, purifier)
  return purifier
}

export const sanitizeDrawingSvg = (
  documentRef: Document,
  svg: string,
  invalidMessage = 'Unable to parse SVG safely.'
) => {
  const purifier = getPurifier(documentRef)
  if (!purifier) throw new Error(invalidMessage)
  const fragment = purifier.sanitize(svg, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'foreignObject'],
    FORBID_ATTR: ['srcdoc'],
  })
  sanitizeFileViewerSvgResources(fragment)
  const root = fragment.querySelector('svg')
  if (!root) throw new Error(invalidMessage)
  return documentRef.importNode(root, true) as unknown as SVGSVGElement
}
