import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

export {
  getFileViewerPdfIdentityFontRepair,
  registerFileViewerPdfIdentityFontRepair,
} from './optionalCapabilities.js';
export type { FileViewerPdfIdentityFontRepair } from './optionalCapabilities.js';
export type { PdfIdentityFontRepairResult } from './pdfIdentityFontRepair.js';

const pdfDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'pdf'
) as RendererDefinition | undefined;

if (!pdfDefinition) {
  throw new Error('@file-viewer/renderer-pdf could not locate the core PDF renderer definition.');
}

export const pdfRendererDefinition = pdfDefinition;

export const renderFileViewerPdf: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  _type,
  context
) => import('./pdf.js').then(({ default: renderPdf }) => renderPdf(buffer, target, context));

export const pdfRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-pdf',
  label: 'Flyfish File Viewer PDF renderer',
  definitions: [pdfRendererDefinition],
  handlers: [{
    rendererId: pdfRendererDefinition.id,
    handler: renderFileViewerPdf,
  }],
};

export default pdfRenderer;
