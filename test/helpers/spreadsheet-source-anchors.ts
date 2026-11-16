import { createRequire } from 'node:module'
const { DOMParser } = createRequire(new URL('../../packages/renderers/spreadsheet/package.json', import.meta.url))('@xmldom/xmldom')
import { readSourceAnchor } from '../../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sourceAnchor'
const escape = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const marker = (name: string, point: any) => point ? `<xdr:${name}>${['row', 'col', 'rowOff', 'colOff'].map(key => `<xdr:${key}>${escape(point[key] ?? 0)}</xdr:${key}>`).join('')}</xdr:${name}>` : ''
const xml = (anchor: any, id = 'image') => `<xdr:${anchor?.type || 'missingMode'}${anchor?.editAs !== undefined ? ` editAs="${escape(anchor.editAs)}"` : ''}>${marker('from', anchor?.from)}${marker('to', anchor?.to)}<xdr:pic><xdr:blipFill><a:blip r:embed="${escape(id)}"/></xdr:blipFill></xdr:pic></xdr:${anchor?.type || 'missingMode'}>`
const root = (body: string) => `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${body}</xdr:wsDr>`
/** Supply actual source evidence to pure model tests; never pretend a vendor anchor proves editAs absence. */
export const imageSources = (images: any[]) => {
  const normalized = images.map((image, index) => ({ ...image, id: image.id || `image-${index}`, anchor: image.anchor ? { ...image.anchor,
    ...(image.anchor.from ? { from: { rowOff: 0, colOff: 0, ...image.anchor.from } } : {}),
    ...(image.anchor.to ? { to: { rowOff: 0, colOff: 0, ...image.anchor.to } } : {}),
  } : undefined }))
  return { images: normalized, raw: root(normalized.map(image => xml(image.anchor, image.id)).join('')) }
}
export const sourceAnchor = (anchor: any) => readSourceAnchor(new DOMParser().parseFromString(root(xml(anchor)), 'application/xml').documentElement.firstChild)
