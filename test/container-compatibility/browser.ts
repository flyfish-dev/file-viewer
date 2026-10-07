import { renderFileViewerWordDoc, resolveFileViewerWordContainer } from '../../packages/renderers/word/src/index.js'
import processPptx from '../../packages/renderers/pptx/src/engine/process.js'
import { pptxViewerCss } from '../../packages/renderers/pptx/src/styles.js'
Object.assign(globalThis, { containerReview: { renderFileViewerWordDoc, resolveFileViewerWordContainer, processPptx, pptxViewerCss } })
