import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

export {
  disableFileViewerDrawioOfficialViewer,
  enableFileViewerDrawioOfficialViewer,
  isFileViewerDrawioOfficialViewerEnabled,
} from './optionalCapabilities.js';

const drawingDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'drawing'
) as RendererDefinition | undefined;

if (!drawingDefinition) {
  throw new Error('@file-viewer/renderer-drawing could not locate the core drawing renderer definition.');
}

export const drawingRendererDefinition = drawingDefinition;

export const renderFileViewerDrawing: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./drawing.js').then(({ default: renderDrawing }) => renderDrawing(buffer, target, type, context));

export const drawingRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-drawing',
  label: 'Flyfish File Viewer drawing renderer',
  definitions: [drawingRendererDefinition],
  handlers: [{
    rendererId: drawingRendererDefinition.id,
    handler: renderFileViewerDrawing,
  }],
};

export default drawingRenderer;
