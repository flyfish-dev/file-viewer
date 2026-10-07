import renderDocx from '../../packages/renderers/word/src/wordDocx.js'
import { buildFileViewerRenderedHtmlDocument } from '../../packages/core/src/exportDocument.js'
import * as output from '../../packages/core/src/output/export.js'
import * as layout from '../../packages/core/src/output/printLayout.js'
Object.assign(window, { outputReview: { renderDocx, buildFileViewerRenderedHtmlDocument, ...output, ...layout } })
