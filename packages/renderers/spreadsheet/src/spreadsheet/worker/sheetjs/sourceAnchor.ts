import { DOMParser } from '@xmldom/xmldom'
import type { DrawingImage } from 'styled-exceljs'
import type { SheetDrawingMarker, SheetSourceAnchor, SheetImageSourceSummary } from '../type.js'
const local = (node: any) => node?.localName || node?.nodeName?.split(':').pop() || ''
const child = (node: any, name: string) => {
  for (let current = node?.firstChild; current; current = current.nextSibling)
    if (current.nodeType === 1 && local(current) === name) return current
  return undefined
}
const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
const MAIN = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const isElement = (node: any, name: string, namespace: string) =>
  node?.nodeType === 1 && local(node) === name && node.namespaceURI === namespace
// Only certify the paths we use. Same-local-name foreign/duplicate children are
// ambiguous, not alternate supported spellings. Prefixes themselves are irrelevant.
const soleChild = (parent: any, node: any, name: string, namespace: string) => {
  let count = 0
  for (let current = parent?.firstChild; current; current = current.nextSibling)
    if (current.nodeType === 1 && local(current) === name) count++
  return count === 1 && node?.parentNode === parent && isElement(node, name, namespace)
}
const plainAttribute = (element: any, name: string) => {
  let count = 0, value: string | undefined
  for (let index = 0; index < (element?.attributes?.length || 0); index++) {
    const attribute = element.attributes.item(index)
    if (local(attribute) !== name) continue
    count++
    if (!attribute.namespaceURI) value = attribute.value
  }
  return { value, valid: count === 0 || (count === 1 && value !== undefined) }
}
const validMarkerSource = (anchor: any, name: string) => {
  const point = child(anchor, name)
  if (!point) return true // Endpoint presence is checked separately.
  if (!soleChild(anchor, point, name, XDR)) return false
  return ['row', 'col', 'rowOff', 'colOff'].every(key => {
    const field = child(point, key)
    if (!soleChild(point, field, key, XDR)) return false
    for (let current = field.firstChild; current; current = current.nextSibling)
      if (current.nodeType === 1) return false
    return true
  })
}
/** Certify the actual reference selected by the legacy reader without changing
 * that reader's display fallback or doing any new relationship/ZIP retrieval. */
export const validSourceReference = (anchor: any, reference: any, kind: 'image' | 'chart') => {
  const path: [string, string][] = kind === 'image'
    ? [['blip', MAIN], ['blipFill', XDR], ['pic', XDR]]
    : [['chart', CHART], ['graphicData', MAIN], ['graphic', MAIN], ['graphicFrame', XDR]]
  let current = reference
  for (const [name, namespace] of path) {
    if (!soleChild(current?.parentNode, current, name, namespace)) return false
    if (name === 'graphicData') {
      const uri = plainAttribute(current, 'uri')
      if (!uri.valid || uri.value !== CHART) return false
    }
    current = current.parentNode
  }
  if (current !== anchor) return false
  const name = kind === 'image' ? 'embed' : 'id'
  let matches = 0
  for (let index = 0; index < (reference?.attributes?.length || 0); index++) {
    const attribute = reference.attributes.item(index)
    if (local(attribute) !== name) continue
    if (attribute.namespaceURI !== REL || !attribute.value) return false
    matches++
  }
  return matches === 1
}
const marker = (node: any) => {
  if (!node) return undefined
  const raw = Object.fromEntries(['row', 'col', 'rowOff', 'colOff'].map(key => [key, child(node, key)?.textContent ?? null])) as NonNullable<SheetSourceAnchor['fromRaw']>
  // Missing/invalid coordinates remain invalid. Never replace them with A1/zero.
  const value = Object.fromEntries(Object.entries(raw).map(([key, text]) => [key, text === null || !text.trim() ? NaN : Number(text)])) as unknown as SheetDrawingMarker
  return { raw, value }
}
const validMarker = (point?: SheetDrawingMarker) => !!point && Number.isSafeInteger(point.row) && Number.isSafeInteger(point.col)
  && point.row >= 0 && point.row < 1048576 && point.col >= 0 && point.col < 16384
  && Number.isFinite(point.rowOff) && Number.isFinite(point.colOff)

export const readSourceAnchor = (element: any, reference?: any, kind?: 'image' | 'chart'): SheetSourceAnchor => {
  const type = local(element), edit = plainAttribute(element, 'editAs'), editAs = edit.value
  const from = marker(child(element, 'from')), to = marker(child(element, 'to'))
  const source: SheetSourceAnchor = { status: 'valid', type, editAs, fromPresent: !!from, toPresent: !!to,
    from: from?.value, to: to?.value, fromRaw: from?.raw, toRaw: to?.raw }
  const ordered = validMarker(from?.value) && validMarker(to?.value)
    && to!.value.row >= from!.value.row && to!.value.col >= from!.value.col
  const root = element?.parentNode
  if (!isElement(root, 'wsDr', XDR) || root !== element?.ownerDocument?.documentElement || element.namespaceURI !== XDR) source.reason = 'unknown-anchor-context'
  else if (!validMarkerSource(element, 'from') || !validMarkerSource(element, 'to')) source.reason = 'unknown-marker-source'
  else if (!edit.valid) source.reason = 'unknown-edit-as-attribute'
  else if (kind && !validSourceReference(element, reference, kind)) source.reason = 'unknown-reference-source'
  else if (!['oneCellAnchor', 'twoCellAnchor', 'absoluteAnchor'].includes(type)) source.reason = 'unknown-anchor-mode'
  else if (editAs !== undefined && !['absolute', 'oneCell', 'twoCell'].includes(editAs)) source.reason = 'unknown-edit-as'
  else if (type !== 'absoluteAnchor' && (!validMarker(from?.value) || (type === 'twoCellAnchor' && !ordered) || (to && !ordered))) source.reason = 'invalid-anchor-endpoints'
  // Worker provenance carries only bounded source fields, never full drawing XML.
  const truncated: string[] = []
  for (const key of ['type', 'editAs'] as const) if ((source[key]?.length || 0) > 128) {
    source[key] = source[key]!.slice(0, 128); truncated.push(key)
  }
  for (const side of ['fromRaw', 'toRaw'] as const) for (const key of ['row', 'col', 'rowOff', 'colOff'] as const) {
    const value = source[side]?.[key]
    if (value && value.length > 64) { source[side]![key] = value.slice(0, 64); truncated.push(side + '.' + key) }
  }
  if (truncated.length) { source.truncatedFields = truncated; source.reason = 'source-field-budget' }
  if (source.reason) source.status = 'unknown'
  return source
}
export const unknownSourceAnchor = (reason: string): SheetSourceAnchor => ({ status: 'unknown', reason })

/** Vendor retains r:embed and raw XML but drops editAs. Match all source candidates,
 * including invalid ones; successful rowAnchor-only mappings cannot prove absence. */
export const readImageSourceProvenance = (raw: unknown, images: DrawingImage[], drawingPresent = true) => {
  const result = new Map<DrawingImage, SheetSourceAnchor>()
  const summary: SheetImageSourceSummary = { scope: 'raw-drawing-image-references', status: 'complete',
    observedReferences: 0, representedReferences: 0, unrepresentedReferences: 0,
    countsComplete: true, reasons: [], reasonsTruncated: false }
  const incomplete = (reason: string, countsComplete = true) => {
    summary.status = 'partial'
    summary.countsComplete &&= countsComplete
    if (!summary.reasons.includes(reason)) {
      if (summary.reasons.length < 8) summary.reasons.push(reason)
      else summary.reasonsTruncated = true
    }
  }
  let matchingComplete = false
  const finish = () => {
    // A difference of lower bounds is not a lower bound of the difference.
    // An unread suffix may contain a match/duplicate: never certify prefix uniqueness.
    summary.unrepresentedReferences = matchingComplete
      ? summary.observedReferences - summary.representedReferences : 0
    if (summary.unrepresentedReferences) incomplete('unrepresented-raw-image-source')
    return { anchors: result, summary }
  }
  // Only the caller that knows the worksheet has no drawing metadata may certify absence.
  if (!drawingPresent && raw == null && images.length === 0) {
    summary.status = 'absent'; return finish()
  }
  const fail = (reason: string) => {
    incomplete(reason, false)
    for (let index = 0; index < Math.min(images.length, 4096); index++) result.set(images[index], unknownSourceAnchor(reason))
    return finish()
  }
  if (images.length > 4096) return fail('image-source-budget')
  if (typeof raw !== 'string') return fail('missing-raw-source')
  if (raw.length > 8 * 1024 * 1024) return fail('raw-source-budget')
  let sourceBytes = 0
  for (let index = 0; index < raw.length; index++) {
    const code = raw.charCodeAt(index)
    if (code < 0x80) sourceBytes++
    else if (code < 0x800) sourceBytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < raw.length && raw.charCodeAt(index + 1) >= 0xdc00 && raw.charCodeAt(index + 1) <= 0xdfff) { sourceBytes += 4; index++ }
    else sourceBytes += 3
    if (sourceBytes > 8 * 1024 * 1024) return fail('raw-source-byte-budget')
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) return fail('unsupported-xml-declaration')
  // Reject dense markup before DOM construction, not only during traversal.
  let markup = 0
  for (let offset = raw.indexOf('<'); offset !== -1; offset = raw.indexOf('<', offset + 1))
    if (++markup > 65536) return fail('raw-markup-budget')
  let document, malformed = false
  try { document = new DOMParser({ onError: () => { malformed = true } }).parseFromString(raw, 'application/xml') }
  catch { return fail('unreadable-raw-source') }
  if (malformed || !document?.documentElement) return fail('unreadable-raw-source')
  if (!isElement(document.documentElement, 'wsDr', XDR)) return fail('unknown-drawing-root')
  const markerKey = (point: any) => point ? ['row', 'col', 'rowOff', 'colOff'].map(key => typeof point[key] + ':' + String(point[key])).join(',') : 'absent'
  const keyFor = (id: unknown, type: unknown, from: any, to: any) => JSON.stringify([id, type, markerKey(from), markerKey(to)])
  const candidates = new Map<string, { source: SheetSourceAnchor; count: number }>()
  let anchors = 0, nodes = 0, entries = 0
  for (let anchor = document.documentElement.firstChild; anchor; anchor = anchor.nextSibling) {
    if (anchor.nodeType !== 1) continue
    if (++anchors > 8192) return fail('source-anchor-budget')
    const source = readSourceAnchor(anchor)
    if (source.status !== 'valid') incomplete('unknown-anchor-source', false)
    let current: any = anchor.firstChild
    while (current) {
      if (++nodes > 65536) return fail('source-node-budget')
      if (current.nodeType === 1 && ['pic', 'blipFill'].includes(local(current))) {
        if (!isElement(current, local(current), XDR) || (local(current) === 'blipFill' && !child(current, 'blip'))
          || (local(current) === 'pic' && !child(current, 'blipFill'))) incomplete('unclassified-image-container', false)
      }
      if (current.nodeType === 1 && local(current) === 'blip') {
        if (entries >= 8192) return fail('source-reference-budget')
        entries++; summary.observedReferences++
        const trusted = validSourceReference(anchor, current, 'image')
        if (!trusted) incomplete('unknown-image-reference', false)
        const id = current.getAttributeNS(REL, 'embed')
        if (!id) incomplete('missing-image-relationship', false)
        if (id) {
          if (id.length > 256) return fail('source-relationship-field-budget')
          const key = keyFor(id, source.type, source.from, source.to), prior = candidates.get(key)
          candidates.set(key, { source: trusted ? source : { ...source, status: 'unknown', reason: 'unknown-reference-source' }, count: (prior?.count || 0) + 1 })
        }
      }
      if (current.firstChild) current = current.firstChild
      else {
        while (current && current !== anchor && !current.nextSibling) current = current.parentNode
        current = !current || current === anchor ? null : current.nextSibling
      }
    }
  }
  const vendorCounts = new Map<string, number>()
  for (const image of images) {
    const key = keyFor(image.id, image.anchor?.type, image.anchor?.from, image.anchor?.to)
    vendorCounts.set(key, (vendorCounts.get(key) || 0) + 1)
  }
  for (let index = 0; index < images.length; index++) {
    const image = images[index], key = keyFor(image.id, image.anchor?.type, image.anchor?.from, image.anchor?.to), match = candidates.get(keyFor(image.id, image.anchor?.type, image.anchor?.from, image.anchor?.to))
    const relationship = (image as DrawingImage & { rel?: { TargetMode?: string } }).rel
    if (relationship?.TargetMode?.toLowerCase() === 'external') { incomplete('external-image-relationship'); result.set(image, unknownSourceAnchor('external-relationship')); continue }
    if (relationship && !(relationship as { Target?: string }).Target) incomplete('unresolved-image-relationship')
    if (match?.count === 1 && vendorCounts.get(key) === 1) summary.representedReferences++
    else incomplete(match ? 'ambiguous-image-source' : 'unmatched-vendor-image')
    result.set(image, match?.count === 1
      ? vendorCounts.get(key) === 1 ? match.source : unknownSourceAnchor('ambiguous-vendor-match')
      : unknownSourceAnchor(match ? 'ambiguous-source-match' : 'unmatched-source-anchor'))
  }
  for (const candidate of candidates.values()) if (candidate.count > 1) incomplete('ambiguous-image-source')
  matchingComplete = true
  return finish()
}

/** Compatibility wrapper: callers needing only per-vendor provenance keep their Map API. */
export const readImageSourceAnchors = (raw: unknown, images: DrawingImage[]) =>
  readImageSourceProvenance(raw, images).anchors
