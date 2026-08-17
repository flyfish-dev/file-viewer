import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const spreadsheetDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'spreadsheet-openxml'
) as RendererDefinition | undefined;
const dbfDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'spreadsheet-dbf'
) as RendererDefinition | undefined;

if (!spreadsheetDefinition || !dbfDefinition) {
  throw new Error('@file-viewer/renderer-spreadsheet could not locate the shared Spreadsheet format definition.');
}

export const spreadsheetRendererDefinition = spreadsheetDefinition;
export const dbfRendererDefinition = dbfDefinition;

export const renderFileViewerSpreadsheet: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./spreadsheet.js').then(({ default: renderSpreadsheet }) =>
  renderSpreadsheet(buffer, target, type, context)
);

export const spreadsheetRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-spreadsheet',
  label: 'Flyfish File Viewer Spreadsheet renderer',
  definitions: [spreadsheetRendererDefinition, dbfRendererDefinition],
  handlers: [spreadsheetRendererDefinition, dbfRendererDefinition].map(definition => ({
    rendererId: definition.id,
    handler: renderFileViewerSpreadsheet,
  })),
};

export default spreadsheetRenderer;
