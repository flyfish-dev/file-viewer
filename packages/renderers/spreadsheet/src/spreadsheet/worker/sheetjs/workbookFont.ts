import type { CellStyle, WorkBook } from 'styled-exceljs'

type Font = NonNullable<CellStyle['font']>
type Format = { fontId?: number; xfId?: number; applyFont?: boolean }
type WorkbookStyles = {
  Fonts?: Font[]
  CellXf?: Format[]
  CellStyleXf?: Format[]
  CellStyles?: Array<{ builtinId?: number; name?: string; xfId?: number }>
}

/** Match the reader's parent-XF then cell-XF font lookup for format zero.
 * applyFont controls later style changes in Excel; false does not erase fontId. */
export const readWorkbookDefaultFont = (workbook?: WorkBook | null): Font | undefined => {
  const styles = (workbook as (WorkBook & { Styles?: WorkbookStyles }) | null | undefined)?.Styles
  if (!styles) return undefined
  const format = styles.CellXf?.[0]
  const normal = styles.CellStyles?.find(style => style.builtinId === 0)
    ?? styles.CellStyles?.find(style => style.name?.toLowerCase() === 'normal')
  const parentId = format?.xfId ?? normal?.xfId ?? 0
  const parent = styles.CellStyleXf?.[parentId]
  const fontId = format?.fontId ?? parent?.fontId ?? 0
  if (!Number.isSafeInteger(fontId) || fontId < 0) return undefined
  const font = styles.Fonts?.[fontId]
  return font ? { ...font } : undefined
}
