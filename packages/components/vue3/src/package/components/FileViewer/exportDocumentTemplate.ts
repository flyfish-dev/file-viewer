import type { BuildExportHtmlDocumentOptions } from '@file-viewer/core/export'

/**
 * @deprecated Import from `@file-viewer/core/export` in new integrations.
 * This compatibility wrapper returns a Promise so its sanitizer stays lazy.
 */
export const buildExportHtmlDocument = async (options: BuildExportHtmlDocumentOptions) => {
  const exportApi = await import('@file-viewer/core/export')
  return exportApi.buildExportHtmlDocument(options)
}

/**
 * @deprecated Import from `@file-viewer/core/export` in new integrations.
 * This compatibility wrapper returns a Promise so its sanitizer stays lazy.
 */
export const collectDocumentStyles = async (documentRef?: Document) => {
  const exportApi = await import('@file-viewer/core/export')
  return exportApi.collectDocumentStyles(documentRef)
}

export type { BuildExportHtmlDocumentOptions } from '@file-viewer/core/export'
