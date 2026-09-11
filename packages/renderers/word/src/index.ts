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
 * leaving genuine OLE/CFB `.doc` files on the binary parser. Word 2003 XML
 * has its own single-file container and is adapted lazily to the OOXML renderer.
 */
export const resolveFileViewerWordContainer = (buffer: ArrayBuffer): 'openxml' | 'wordml' | 'binary' => {
  if (buffer.byteLength < 2) {
    return 'binary';
  }
  const bytes = new Uint8Array(buffer, 0, 2);
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'openxml';
  const prefix = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192));
  const utf16le = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0x3c && bytes[1] === 0);
  const utf16be = (bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0 && bytes[1] === 0x3c);
  const text = new TextDecoder(utf16le ? 'utf-16le' : utf16be ? 'utf-16be' : 'utf-8').decode(prefix);
  return /<(?:[\w.-]+:)?wordDocument(?:\s|>)/.test(text) &&
    text.includes('http://schemas.microsoft.com/office/word/2003/wordml') ? 'wordml' : 'binary';
};

export const renderFileViewerWordDoc: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  _type,
  context
) => {
  const container = resolveFileViewerWordContainer(buffer);
  if (container === 'wordml') {
    return Promise.all([import('./wordMl.js'), import('./wordDocx.js')])
      .then(async ([{ convertWordMlToDocx }, { default: renderWordDocx }]) =>
        renderWordDocx(await convertWordMlToDocx(buffer, target), target, context));
  }
  return container === 'openxml'
    ? import('./wordDocx.js').then(({ default: renderWordDocx }) => renderWordDocx(buffer, target, context))
    : import('./wordDoc.js').then(({ default: renderWordDoc }) => renderWordDoc(buffer, target, context));
};

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
