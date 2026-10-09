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

const sanitizeSvg = (
  documentRef: Document,
  svg: string,
  invalidMessage: string,
  mathLabels: boolean
) => {
  const purifier = getPurifier(documentRef)
  if (!purifier) throw new Error(invalidMessage)
  const fragment = purifier.sanitize(svg, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: mathLabels, svg: true, svgFilters: true, mathMl: mathLabels },
    ADD_TAGS: mathLabels ? ['foreignObject'] : [],
    HTML_INTEGRATION_POINTS: mathLabels ? { foreignobject: true } : {},
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', ...(mathLabels ? [] : ['foreignObject'])],
    FORBID_ATTR: ['srcdoc'],
  })
  sanitizeFileViewerSvgResources(fragment)
  const root = fragment.querySelector('svg')
  if (!root) throw new Error(invalidMessage)
  return documentRef.importNode(root, true) as unknown as SVGSVGElement
}

export const sanitizeDrawingSvg = (
  documentRef: Document,
  svg: string,
  invalidMessage = 'Unable to parse SVG safely.'
) => sanitizeSvg(documentRef, svg, invalidMessage, false)

/** Only generated Mermaid math labels need HTML and MathML inside the SVG. */
export const sanitizeGeneratedMermaidSvg = (
  documentRef: Document,
  svg: string,
  invalidMessage: string,
  mathLabels: boolean
) => sanitizeSvg(documentRef, svg, invalidMessage, mathLabels)
