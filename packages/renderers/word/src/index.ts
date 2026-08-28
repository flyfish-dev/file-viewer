import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

export {
  getFileViewerRtfLoader,
  registerFileViewerRtfLoader,
} from './optionalCapabilities.js';
export type {
  FileViewerRtfLoader,
  FileViewerRtfModule,
} from './optionalCapabilities.js';
export {
  createFileViewerRtfHyperlinkContainer,
  isSafeFileViewerRtfHyperlink,
  sanitizeFileViewerRtfElement,
  sanitizeFileViewerRtfHtml,
  sanitizeFileViewerRtfHyperlink,
} from './sanitizeRtf.js';
export type {
  FileViewerRtfExternalPolicy,
  FileViewerRtfSanitizeOptions,
} from './sanitizeRtf.js';

const wordRendererIds = [
  'office-word-openxml',
  'office-word-binary',
  'open-document',
] as const;

const wordDefinitions = DEFAULT_RENDERER_DEFINITIONS.filter(definition =>
  wordRendererIds.includes(definition.id as typeof wordRendererIds[number])
) as RendererDefinition[];

if (wordDefinitions.length !== wordRendererIds.length) {
  throw new Error('@file-viewer/renderer-word could not locate the shared Word renderer definitions.');
}

export const wordRendererDefinitions = wordDefinitions;

export const renderFileViewerWordDocx: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  _type,
  context
) => import('./wordDocx.js').then(({ default: renderWordDocx }) => renderWordDocx(buffer, target, context));

/**
 * A surprising number of legacy systems keep the `.doc` suffix after saving
 * an OOXML document. Route those ZIP-based files through the DOCX engine while
 * leaving genuine OLE/CFB `.doc` files on the binary parser.
 */
export const resolveFileViewerWordContainer = (buffer: ArrayBuffer): 'openxml' | 'binary' => {
  if (buffer.byteLength < 2) {
    return 'binary';
  }
  const bytes = new Uint8Array(buffer, 0, 2);
  return bytes[0] === 0x50 && bytes[1] === 0x4b ? 'openxml' : 'binary';
};

export const renderFileViewerWordDoc: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  _type,
  context
) => resolveFileViewerWordContainer(buffer) === 'openxml'
  ? import('./wordDocx.js').then(({ default: renderWordDocx }) => renderWordDocx(buffer, target, context))
  : import('./wordDoc.js').then(({ default: renderWordDoc }) => renderWordDoc(buffer, target, context));

export const renderFileViewerOpenDocument: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./openDocument.js').then(({ default: renderOpenDocument }) => renderOpenDocument(buffer, target, type, context));

export const wordRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-word',
  label: 'Flyfish File Viewer Word renderer',
  definitions: wordRendererDefinitions,
  handlers: [
    {
      rendererId: 'office-word-openxml',
      handler: renderFileViewerWordDocx,
    },
    {
      rendererId: 'office-word-binary',
      handler: renderFileViewerWordDoc,
    },
    {
      rendererId: 'open-document',
      handler: renderFileViewerOpenDocument,
    },
  ],
};

export default wordRenderer;
