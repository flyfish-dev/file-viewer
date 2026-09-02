import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const definition = DEFAULT_RENDERER_DEFINITIONS.find(item => item.id === 'chm') as RendererDefinition | undefined;
if (!definition) throw new Error('@file-viewer/renderer-chm could not locate the shared CHM definition.');

export const chmRendererDefinition = definition;
export const renderFileViewerChm: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./chm.js').then(({ default: renderChm }) => renderChm(buffer, target, type, context));

export const chmRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-chm',
  label: 'Flyfish File Viewer CHM renderer',
  definitions: [chmRendererDefinition],
  handlers: [{ rendererId: chmRendererDefinition.id, handler: renderFileViewerChm }],
};

export {
  CHM_INTERNAL_RESOURCE_SCHEME,
  decodeChmText,
  normalizeChmPath,
  resolveChmReference,
  sanitizeChmHtmlDocument,
  type ChmResolvedReference,
  type SanitizedChmHtmlDocument,
} from './security.js';
export {
  DEFAULT_CHM_OPTIONS,
  normalizeChmEntries,
  normalizeChmManifest,
  resolveChmOptions,
  type ChmEntry,
  type ChmManifest,
  type ChmNavigationNode,
  type ChmSearchHit,
  type ChmTopic,
  type FileViewerChmOptions,
} from './model.js';
export {
  ChmWorkerClient,
  DEFAULT_CHM_WASM_MODULE_PATH,
  DEFAULT_CHM_WASM_PATH,
  DEFAULT_CHM_WORKER_PATH,
  type ChmWorkerProgress,
} from './workerClient.js';

export default chmRenderer;
