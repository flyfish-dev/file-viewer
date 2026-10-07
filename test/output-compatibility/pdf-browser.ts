import renderPdf from '../../packages/renderers/pdf/src/pdf.js'
import { buildFileViewerRenderedHtmlDocument } from '../../packages/core/src/exportDocument.js'
import { findFileViewerViewStateProvider } from '@file-viewer/core'
Object.assign(window, { outputReview: { renderPdf, buildFileViewerRenderedHtmlDocument, findFileViewerViewStateProvider } })
