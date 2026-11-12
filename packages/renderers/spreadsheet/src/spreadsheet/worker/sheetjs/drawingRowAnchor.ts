import { DOMParser } from '@xmldom/xmldom'
import type { DrawingImage } from 'styled-exceljs'
import type { SheetDrawingMarker, SheetRowAnchor } from '../type.js'

export const createDrawingRowAnchor = (
  type: string,
  editAs: string | null,
  from?: SheetDrawingMarker,
  to?: SheetDrawingMarker,
): SheetRowAnchor | undefined => {
  if (type === 'absoluteAnchor')
    return { mode: 'absolute', fromRow: 0, fromOffset: 0 }
  if (type !== 'oneCellAnchor' && type !== 'twoCellAnchor') return undefined
  if (
    !from ||
    !Number.isSafeInteger(from.row) ||
    from.row < 0 ||
    !Number.isFinite(from.rowOff)
  )
    return undefined
  if (
    type === 'twoCellAnchor' &&
    editAs &&
    !['absolute', 'oneCell', 'twoCell'].includes(editAs)
  )
    return undefined
  const mode = type === 'oneCellAnchor' ? 'oneCell' : editAs || 'twoCell'
  if (
    mode === 'twoCell' &&
    (!to ||
      !Number.isSafeInteger(to.row) ||
      to.row < from.row ||
      !Number.isFinite(to.rowOff))
  )
    return undefined
  return {
    mode: mode as SheetRowAnchor['mode'],
    fromRow: from.row,
    fromOffset: from.rowOff,
    ...(to ? { toRow: to.row, toOffset: to.rowOff } : {}),
  }
}

/** Vendor preserves raw OOXML and r:embed IDs but drops editAs. Match the actual
 * source anchor and relationship, never infer its mode from a rendered row/col. */
export const readImageRowAnchors = (raw: unknown, images: DrawingImage[]) => {
  const result = new Map<DrawingImage, SheetRowAnchor>()
  if (typeof raw !== 'string' || raw.length > 8 * 1024 * 1024) return result
  let document
  try {
    document = new DOMParser({ onError: () => {} }).parseFromString(
      raw,
      'application/xml',
    )
  } catch {
    return result
  }
  const local = (node: { localName?: string | null; nodeName?: string }) =>
    node.localName || node.nodeName?.split(':').pop() || ''
  const children = (node: any): any[] =>
    Array.from(node?.childNodes || []).filter(
      (child: any) => child.nodeType === 1,
    )
  const descendants = (node: any): any[] =>
    Array.from(node?.getElementsByTagName('*') || [])
  const marker = (node: any): SheetDrawingMarker | undefined => {
    if (!node) return undefined
    const number = (name: string) =>
      Number(
        children(node).find((child) => local(child) === name)?.textContent || 0,
      )
    return {
      row: number('row'),
      col: number('col'),
      rowOff: number('rowOff'),
      colOff: number('colOff'),
    }
  }
  const candidates = children(document.documentElement).flatMap((anchor) => {
    const type = local(anchor),
      from = marker(children(anchor).find((child) => local(child) === 'from'))
    const to = marker(children(anchor).find((child) => local(child) === 'to'))
    const rowAnchor = createDrawingRowAnchor(
      type,
      anchor.getAttribute('editAs'),
      from,
      to,
    )
    if (!rowAnchor) return []
    return descendants(anchor)
      .filter((node) => local(node) === 'blip')
      .map((blip) => ({
        type,
        from,
        to,
        rowAnchor,
        id:
          blip.getAttributeNS(
            'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
            'embed',
          ) || blip.getAttribute('r:embed'),
      }))
  })
  const sameMarker = (a: any, b: any) =>
    (!a && !b) ||
    (!!a &&
      !!b &&
      ['row', 'col', 'rowOff', 'colOff'].every((key) => a[key] === b[key]))
  for (const image of images) {
    const matches = candidates.filter(
      (candidate) =>
        candidate.id === image.id &&
        candidate.type === image.anchor?.type &&
        sameMarker(candidate.from, image.anchor?.from) &&
        sameMarker(candidate.to, image.anchor?.to),
    )
    if (matches.length === 1) result.set(image, matches[0].rowAnchor)
  }
  return result
}
