import { FILE_VIEWER_SUPPORTED_LOCALES, type FileViewerResolvedLocale } from '../locales'
import { FILE_VIEWER_RENDERER_MESSAGE_ROWS } from './renderer'
import { FILE_VIEWER_COMMON_MESSAGE_ROWS } from './common'
import { FILE_VIEWER_DESIGN_MESSAGE_ROWS } from './design'
import { FILE_VIEWER_PANEL_MESSAGE_ROWS } from './panels'
import { FILE_VIEWER_PRESENTATION_MESSAGE_ROWS } from './presentation'

export type FileViewerExtendedMessageKey =
  keyof typeof FILE_VIEWER_RENDERER_MESSAGE_ROWS
  | keyof typeof FILE_VIEWER_COMMON_MESSAGE_ROWS
  | keyof typeof FILE_VIEWER_DESIGN_MESSAGE_ROWS
  | keyof typeof FILE_VIEWER_PANEL_MESSAGE_ROWS
  | keyof typeof FILE_VIEWER_PRESENTATION_MESSAGE_ROWS

const rows: Record<FileViewerExtendedMessageKey, Record<FileViewerResolvedLocale, string>> = {
  ...FILE_VIEWER_RENDERER_MESSAGE_ROWS,
  ...FILE_VIEWER_COMMON_MESSAGE_ROWS,
  ...FILE_VIEWER_DESIGN_MESSAGE_ROWS,
  ...FILE_VIEWER_PANEL_MESSAGE_ROWS,
  ...FILE_VIEWER_PRESENTATION_MESSAGE_ROWS
}
export const FILE_VIEWER_DOMAIN_MESSAGES = Object.fromEntries(
  FILE_VIEWER_SUPPORTED_LOCALES.map((locale) => [
    locale,
    Object.fromEntries(
      Object.entries(rows).map(([key, translations]) => [key, translations[locale]])
    )
  ])
) as Record<FileViewerResolvedLocale, Record<FileViewerExtendedMessageKey, string>>
