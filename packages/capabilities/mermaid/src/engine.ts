import mermaid from 'mermaid'
import type { FileViewerMermaidModule } from '@file-viewer/renderer-text'

// Keep public declarations independent of the build-only upstream package.
const engine: FileViewerMermaidModule['default'] = mermaid
export default engine
