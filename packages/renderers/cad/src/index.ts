import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

export {
  applyCadViewerColorMode,
  normalizeFileViewerCadColorMode,
  resolveFileViewerCadMonochromeColor,
  supportsCadViewerColorMode,
} from './colorMode';
export type { CadViewerColorModeAdapter } from './colorMode';

const cadDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'cad'
) as RendererDefinition | undefined;

if (!cadDefinition) {
  throw new Error('@file-viewer/renderer-cad could not locate the shared CAD format definition.');
}

export const cadRendererDefinition = cadDefinition;

export const renderFileViewerCad: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./cad.js').then(({ default: renderCad }) => renderCad(buffer, target, type, context));

export const cadRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-cad',
  label: 'Flyfish File Viewer CAD renderer',
  definitions: [cadRendererDefinition],
  handlers: [{
    rendererId: cadRendererDefinition.id,
    handler: renderFileViewerCad,
  }],
};

export default cadRenderer;
