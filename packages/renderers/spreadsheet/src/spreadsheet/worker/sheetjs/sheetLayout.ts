import { DOMParser, type Element as XmlElement } from '@xmldom/xmldom'
import type JSZip from 'jszip'
import type { WorkBook } from 'styled-exceljs'
import { EXCEL_SOURCE_EXTENT } from '../../sourceRegion.js'
import type { SheetFreezePane } from '../type.js'
import type { StoredRowSizing } from './rowSizing.js'

export interface StoredSheetLayout {
  columnWidth?: number
  rowHeightPt?: number
  rowSizing?: StoredRowSizing
  maximumDigitWidth?: number
  freeze?: SheetFreezePane
}

/** OOXML column units refer to the workbook's Normal style, which need not
 * use fonts[0]. Preserve the established fallback for unmeasured fonts. */
export const readWorkbookDigitWidth = (workbook?: WorkBook | null): number => {
  const styles = (workbook as (WorkBook & { Styles?: {
    CellStyles?: Array<{ builtinId?: number; name?: string; xfId?: number }>
    CellStyleXf?: Array<{ fontId?: number }>
    Fonts?: Array<{ name?: string; sz?: number }>
  } }) | null | undefined)?.Styles
  const normal = styles?.CellStyles?.find(style => style.builtinId === 0)
    ?? styles?.CellStyles?.find(style => style.name?.toLowerCase() === 'normal')
  const fontId = normal?.xfId === undefined ? 0 : styles?.CellStyleXf?.[normal.xfId]?.fontId ?? 0
  const font = styles?.Fonts?.[fontId]
  const size = Number(font?.sz)
  // SimSun/NSimSun digits advance half an em. Convert font points to CSS
  // pixels before rounding; scaling an already rounded 11pt grid widens
  // 10.5pt and 12pt templates. Other CJK families can have different metrics.
  if (/^(?:宋体|新宋体|simsun|nsimsun)$/i.test(font?.name?.trim() || '')
    && Number.isFinite(size) && size >= 1 && size <= 409) {
    return Math.max(1, Math.ceil(size * 96 / 72 / 2))
  }
  return 7
}

const sheetChildren = (element: XmlElement | undefined, name: string) =>
  Array.from(element?.childNodes ?? []).filter((node): node is XmlElement =>
    node.nodeType === 1 && (node as XmlElement).localName === name
    && (node as XmlElement).namespaceURI === element?.namespaceURI)

const readFrozenPane = (views: XmlElement): SheetFreezePane | undefined => {
  const sheetViews = sheetChildren(views, 'sheetView')
  const view = sheetViews.find(candidate => candidate.getAttribute('workbookViewId') === '0') ?? sheetViews[0]
  const [pane] = sheetChildren(view, 'pane')
  const state = pane?.getAttribute('state')
  if (state !== 'frozen' && state !== 'frozenSplit') return undefined

  const count = (attribute: 'xSplit' | 'ySplit', max: number) => {
    const raw = pane.getAttribute(attribute)?.trim() ?? ''
    if (!/^\+?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?$/.test(raw)) return 0
    const value = Number(raw)
    return Number.isSafeInteger(value) ? Math.min(value, max) : 0
  }
  const rows = count('ySplit', EXCEL_SOURCE_EXTENT.rows - 1)
  const columns = count('xSplit', EXCEL_SOURCE_EXTENT.cols - 1)
  return rows || columns ? { rows, columns } : undefined
}

/** Read only the worksheet header for size defaults and frozen panes. */
export const readStoredSheetLayout = async (zip: JSZip, part: string): Promise<StoredSheetLayout> => {
  const file = zip.file(part)
  if (!file) return {}
  const limit = 128 * 1024
  const header = await new Promise<string>((resolve, reject) => {
    let prefix = ''
    let done = false
    // JSZip exposes this streaming API at runtime but omits it from JSZipObject's declaration.
    const stream = (file as JSZip.JSZipObject & {
      internalStream(type: 'string'): JSZip.JSZipStreamHelper<string>
    }).internalStream('string')
    const finish = () => {
      if (done) return
      done = true
      stream.pause()
      resolve(prefix)
    }
    stream.on('data', chunk => {
      if (done) return
      prefix += chunk.slice(0, limit - prefix.length)
      if (/<(?:[\w.-]+:)?(?:sheetFormatPr\b[^>]*>|sheetData\b)/.test(prefix) || prefix.length >= limit) finish()
    })
    stream.on('end', finish)
    stream.on('error', error => { if (!done) { done = true; reject(error) } })
    stream.resume()
  })
  const tag = /<(?:[\w.-]+:)?sheetFormatPr\b[^>]*>/.exec(header)?.[0]
  const views = /<((?:[\w.-]+:)?sheetViews)\b[^>]*>[\s\S]*?<\/\1\s*>/.exec(header)?.[0]
  if (!tag && !views) return {}
  const root = /<(?:[\w.-]+:)?worksheet\b[^>]*>/.exec(header)?.[0] || ''
  const namespaces = root.match(/\sxmlns(?::[\w.-]+)?\s*=\s*(?:"[^"]*"|'[^']*')/g)?.join('') || ''
  const parser = new DOMParser()
  const layout = tag ? parser.parseFromString(
    `<layout${namespaces}>${tag.replace(/\/?>(?:\s*)$/, '/>')}</layout>`, 'application/xml'
  ).documentElement?.getElementsByTagName('*')[0] : undefined
  const bounded = (name: string, max: number) => {
    const raw = layout?.getAttribute(name)
    if (raw == null || raw.trim() === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 && value <= max ? value : undefined
  }
  const viewRoot = views ? parser.parseFromString(
    `<layout${namespaces}>${views}</layout>`, 'application/xml'
  ).documentElement?.getElementsByTagName('*')[0] : undefined
  const freeze = viewRoot ? readFrozenPane(viewRoot) : undefined
  return {
    columnWidth: bounded('defaultColWidth', 255),
    rowHeightPt: bounded('defaultRowHeight', 409.5),
    ...(freeze ? { freeze } : {})
  }
}
