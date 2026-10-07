import { renderFileViewerWordDoc } from '../../packages/renderers/word/src/index.js'
import { resolveFileViewerDocxWorkerUrl } from '../../packages/core/src/platform/assets.js'
Object.assign(globalThis, { docxCompatibility: { renderFileViewerWordDoc, resolveFileViewerDocxWorkerUrl } })
