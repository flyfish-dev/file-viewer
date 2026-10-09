import { registerFileViewerMermaidLoader } from '@file-viewer/renderer-text';

export const enableFileViewerMermaid = () => {
  registerFileViewerMermaidLoader(() => import('./engine.js'));
};

enableFileViewerMermaid();
