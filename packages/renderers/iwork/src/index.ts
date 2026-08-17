import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const definitions = ['apple-pages', 'apple-numbers', 'apple-keynote'].map(id =>
  DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === id) as RendererDefinition | undefined
);
if (definitions.some(definition => !definition)) throw new Error('@file-viewer/renderer-iwork could not locate all shared iWork definitions.');

export const [pagesRendererDefinition, numbersRendererDefinition, keynoteRendererDefinition] = definitions as RendererDefinition[];
export const renderFileViewerIwork: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./iwork.js').then(({ default: renderIwork }) => renderIwork(buffer, target, type, context));

export const iworkRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-iwork',
  label: 'Flyfish File Viewer Apple iWork renderer',
  definitions: definitions as RendererDefinition[],
  handlers: (definitions as RendererDefinition[]).map(definition => ({ rendererId: definition.id, handler: renderFileViewerIwork })),
};

export { IworkContainerMismatchError } from './errors.js';
export { DEFAULT_IWORK_PARSE_LIMITS } from './limits.js';
export const inspectIworkContainer = async (
  ...args: Parameters<typeof import('./parser.js')['inspectIworkContainer']>
) => {
  const parser = await import('./iwork.parser.js');
  return parser.inspectIworkContainer(...args);
};
export const parseIworkDocument = async (
  ...args: Parameters<typeof import('./parser.js')['parseIworkDocument']>
) => {
  const parser = await import('./iwork.parser.js');
  return parser.parseIworkDocument(...args);
};
export { decompressIwaFile } from './snappy.js';
export type {
  IworkDocument,
  IworkEmbeddedPreview,
  IworkGeneration,
  IworkKind,
  IworkParseLimits,
  IworkScene,
  IworkTable,
  IworkTextBlock,
  IworkVisualObject,
} from './model.js';
export default iworkRenderer;
