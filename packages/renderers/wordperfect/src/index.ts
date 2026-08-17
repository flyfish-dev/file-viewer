import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const definition = DEFAULT_RENDERER_DEFINITIONS.find(item => item.id === 'office-wordperfect') as RendererDefinition | undefined;
if (!definition) throw new Error('@file-viewer/renderer-wordperfect could not locate the shared WordPerfect definition.');

export const wordPerfectRendererDefinition = definition;
export const renderFileViewerWordPerfect: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./wordperfect.js').then(({ default: renderWordPerfect }) => renderWordPerfect(buffer, target, type, context));

export const wordPerfectRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-wordperfect',
  label: 'Flyfish File Viewer WordPerfect renderer',
  definitions: [wordPerfectRendererDefinition],
  handlers: [{ rendererId: wordPerfectRendererDefinition.id, handler: renderFileViewerWordPerfect }],
};
/** Lowercase compound alias kept in sync with the renderer package id and contract generator. */
export const wordperfectRenderer = wordPerfectRenderer;

export {
  isWordPerfectDocument,
  parseWordPerfectDocument,
  type WordPerfectDocument,
  type WordPerfectParagraph,
  type WordPerfectRun,
  type WordPerfectTable,
} from './parser.js';
export default wordPerfectRenderer;
