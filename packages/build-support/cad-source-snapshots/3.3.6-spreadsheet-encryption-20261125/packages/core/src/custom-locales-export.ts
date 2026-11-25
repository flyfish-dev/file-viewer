/**
 * Explicit HTML export and print-document entrypoint.
 *
 * This subpath owns the DOM sanitizer and is intentionally excluded from the
 * normal viewer/headless graph. Viewer operations load it only when the user
 * starts an HTML export or print operation.
 */
export {
  buildFileViewerRenderedDomDocument,
  buildFileViewerRenderedHtmlDocument,
  buildExportDomDocument,
  buildExportHtmlDocument,
  collectDocumentStyles,
  sanitizeFileViewerExportDocumentDom,
  sanitizeFileViewerExportDocumentHtml,
} from './exportDocument'
export type {
  BuildExportHtmlDocumentOptions,
  BuildFileViewerRenderedHtmlDocumentOptions,
} from './exportDocument'
export {
  inlineFileViewerBlobUrlsInHtml,
  prepareFileViewerRenderedContentForSnapshot,
  replaceFileViewerCanvasWithImages,
  resolveFileViewerPrintStyle,
  triggerFileViewerBlobDownload,
  triggerFileViewerUrlDownload,
  waitForFileViewerImages,
  waitForFileViewerNextPaint,
  waitForFileViewerPrintWindowReady,
} from './output/export'
