import JSZip from 'jszip'

const WORDPROCESSINGML_NAMESPACE =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const DOCUMENT_XML_PATH = 'word/document.xml'

// File Viewer uses an A4 sheet (794 × 1123 CSS pixels at 96 DPI) when a DOCX
// does not provide page geometry. These are the exact OOXML twip values for
// the same 210 × 297 mm sheet.
export const DOCX_DEFAULT_PAGE_LAYOUT = {
  width: '11906',
  height: '16838',
  marginTop: '1440',
  marginRight: '1440',
  marginBottom: '1440',
  marginLeft: '1440',
  header: '720',
  footer: '720',
  gutter: '0'
} as const

export interface DocxXmlRuntime {
  parse(xml: string): XMLDocument
  serialize(document: XMLDocument): string
}

const SECTION_CHILD_ORDER = [
  'headerReference',
  'footerReference',
  'footnotePr',
  'endnotePr',
  'type',
  'pgSz',
  'pgMar',
  'paperSrc',
  'pgBorders',
  'lnNumType',
  'pgNumType',
  'cols',
  'formProt',
  'vAlign',
  'noEndnote',
  'titlePg',
  'textDirection',
  'bidi',
  'rtlGutter',
  'docGrid',
  'printerSettings'
]

const getWordChildren = (element: Element) =>
  Array.from(element.childNodes).filter(
    (child): child is Element =>
      child.nodeType === 1 &&
      (child as Element).namespaceURI === WORDPROCESSINGML_NAMESPACE
  )

const getWordChild = (element: Element, localName: string) =>
  getWordChildren(element).find((child) => child.localName === localName) ??
  null

const getWordAttribute = (element: Element, localName: string) =>
  element.getAttributeNS(WORDPROCESSINGML_NAMESPACE, localName) ??
  Array.from(element.attributes).find(
    (attribute) =>
      attribute.namespaceURI === WORDPROCESSINGML_NAMESPACE &&
      attribute.localName === localName
  )?.value ??
  null

const setWordAttribute = (
  element: Element,
  prefix: string,
  localName: string,
  value: string
) => {
  element.setAttributeNS(
    WORDPROCESSINGML_NAMESPACE,
    `${prefix}:${localName}`,
    value
  )
}

const createWordElement = (
  document: XMLDocument,
  prefix: string,
  localName: string
) =>
  document.createElementNS(WORDPROCESSINGML_NAMESPACE, `${prefix}:${localName}`)

const insertSectionChild = (section: Element, child: Element) => {
  const childOrder = SECTION_CHILD_ORDER.indexOf(child.localName)
  const before = getWordChildren(section).find((candidate) => {
    const candidateOrder = SECTION_CHILD_ORDER.indexOf(candidate.localName)
    return candidateOrder !== -1 && candidateOrder > childOrder
  })

  section.insertBefore(child, before ?? null)
}

const ensureSectionChild = (
  section: Element,
  document: XMLDocument,
  prefix: string,
  localName: string
) => {
  const existing = getWordChild(section, localName)
  if (existing) {
    return { element: existing, changed: false }
  }

  const element = createWordElement(document, prefix, localName)
  insertSectionChild(section, element)
  return { element, changed: true }
}

const ensureWordAttribute = (
  element: Element,
  prefix: string,
  localName: string,
  value: string
) => {
  if (getWordAttribute(element, localName) !== null) {
    return false
  }

  setWordAttribute(element, prefix, localName, value)
  return true
}

const normalizeSectionPageLayout = (
  section: Element,
  document: XMLDocument,
  prefix: string
) => {
  let changed = false
  const pageSize = ensureSectionChild(section, document, prefix, 'pgSz')
  const orientation = getWordAttribute(pageSize.element, 'orient')
  const defaultWidth =
    orientation === 'landscape'
      ? DOCX_DEFAULT_PAGE_LAYOUT.height
      : DOCX_DEFAULT_PAGE_LAYOUT.width
  const defaultHeight =
    orientation === 'landscape'
      ? DOCX_DEFAULT_PAGE_LAYOUT.width
      : DOCX_DEFAULT_PAGE_LAYOUT.height

  changed = pageSize.changed || changed
  changed =
    ensureWordAttribute(pageSize.element, prefix, 'w', defaultWidth) || changed
  changed =
    ensureWordAttribute(pageSize.element, prefix, 'h', defaultHeight) || changed

  const pageMargins = ensureSectionChild(section, document, prefix, 'pgMar')
  changed = pageMargins.changed || changed
  const marginDefaults = [
    ['top', DOCX_DEFAULT_PAGE_LAYOUT.marginTop],
    ['right', DOCX_DEFAULT_PAGE_LAYOUT.marginRight],
    ['bottom', DOCX_DEFAULT_PAGE_LAYOUT.marginBottom],
    ['left', DOCX_DEFAULT_PAGE_LAYOUT.marginLeft],
    ['header', DOCX_DEFAULT_PAGE_LAYOUT.header],
    ['footer', DOCX_DEFAULT_PAGE_LAYOUT.footer],
    ['gutter', DOCX_DEFAULT_PAGE_LAYOUT.gutter]
  ] as const

  for (const [name, value] of marginDefaults) {
    changed =
      ensureWordAttribute(pageMargins.element, prefix, name, value) || changed
  }

  return changed
}

const resolveWordPrefix = (document: XMLDocument, body: Element) =>
  body.prefix ??
  document.documentElement.lookupPrefix(WORDPROCESSINGML_NAMESPACE) ??
  'w'

/**
 * Supplies Word-compatible application defaults for malformed or generated
 * DOCX files whose section properties omit page size or margins. Explicit
 * values, including zero margins and custom page sizes, are never replaced.
 */
export const normalizeDocxPageLayout = async (
  buffer: ArrayBuffer,
  runtime: DocxXmlRuntime
) => {
  const zip = await JSZip.loadAsync(buffer)
  const documentPart = zip.file(DOCUMENT_XML_PATH)
  if (!documentPart) {
    return buffer
  }

  const source = await documentPart.async('string')
  const document = runtime.parse(source)
  if (document.getElementsByTagName('parsererror').length) {
    return buffer
  }

  const body = document.getElementsByTagNameNS(
    WORDPROCESSINGML_NAMESPACE,
    'body'
  )[0]
  if (!body) {
    return buffer
  }

  const prefix = resolveWordPrefix(document, body)
  let sections = Array.from(
    document.getElementsByTagNameNS(WORDPROCESSINGML_NAMESPACE, 'sectPr')
  )
  let changed = false

  if (!sections.length) {
    const section = createWordElement(document, prefix, 'sectPr')
    body.appendChild(section)
    sections = [section]
    changed = true
  }

  for (const section of sections) {
    changed = normalizeSectionPageLayout(section, document, prefix) || changed
  }

  if (!changed) {
    return buffer
  }

  zip.file(DOCUMENT_XML_PATH, runtime.serialize(document))
  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
}

export const createBrowserDocxXmlRuntime = (
  document: Document
): DocxXmlRuntime | null => {
  const DOMParserConstructor = document.defaultView?.DOMParser
  const XMLSerializerConstructor = document.defaultView?.XMLSerializer
  if (!DOMParserConstructor || !XMLSerializerConstructor) {
    return null
  }

  return {
    parse: (xml) =>
      new DOMParserConstructor().parseFromString(xml, 'application/xml'),
    serialize: (xmlDocument) =>
      new XMLSerializerConstructor().serializeToString(xmlDocument)
  }
}
