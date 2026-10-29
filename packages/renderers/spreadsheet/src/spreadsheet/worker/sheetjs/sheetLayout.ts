import { DOMParser } from '@xmldom/xmldom'
import type JSZip from 'jszip'
import type { WorkBook } from 'styled-exceljs'

export interface StoredSheetLayout {
  columnWidth?: number
  rowHeightPt?: number
  maximumDigitWidth?: number
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

/** Read only the worksheet header; never materialize a large sheet's cells a
 * second time merely to recover sheetFormatPr. */
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
  if (!tag) return {}
  const root = /<(?:[\w.-]+:)?worksheet\b[^>]*>/.exec(header)?.[0] || ''
  const namespaces = root.match(/\sxmlns(?::[\w.-]+)?\s*=\s*(?:"[^"]*"|'[^']*')/g)?.join('') || ''
  const element = new DOMParser().parseFromString(
    `<layout${namespaces}>${tag.replace(/\/?>(?:\s*)$/, '/>')}</layout>`, 'application/xml'
  ).documentElement?.getElementsByTagName('*')[0]
  const bounded = (name: string, max: number) => {
    const raw = element?.getAttribute(name)
    if (raw == null || raw.trim() === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 && value <= max ? value : undefined
  }
  return { columnWidth: bounded('defaultColWidth', 255), rowHeightPt: bounded('defaultRowHeight', 409.5) }
}
