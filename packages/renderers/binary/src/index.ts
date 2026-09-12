import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderContext,
  type FileRenderHandler,
  type FileViewerBinaryInspectorOptions,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const binaryDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'binary-inspector'
) as RendererDefinition | undefined;

if (!binaryDefinition) {
  throw new Error('@file-viewer/renderer-binary could not locate the binary inspector renderer definition.');
}

export const binaryRendererDefinition = binaryDefinition;

export const renderFileViewerBinary: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./binary.js').then(({ default: renderBinary }) => renderBinary(buffer, target, type, context));

export const createBinaryRenderer = (
  options: FileViewerBinaryInspectorOptions = {}
): FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> => ({
  id: 'file-viewer-renderer-binary',
  label: 'Flyfish File Viewer binary inspector',
  definitions: [binaryRendererDefinition],
  handlers: [{
    rendererId: binaryRendererDefinition.id,
    handler: (buffer, target, type, context) => import('./binary.js').then(({ default: renderBinary }) => (
      renderBinary(buffer, target, type, context as FileRenderContext | undefined, options)
    )),
  }],
});

export const binaryRenderer = createBinaryRenderer();

export type {
  BinaryInspectorAnalysis,
  BinaryInspectorLimits,
  BinaryInspectorNode,
  BinaryInspectorTemplate,
} from './types.js';
export { DEFAULT_BINARY_INSPECTOR_LIMITS, normalizeBinaryInspectorLimits } from './types.js';

export default binaryRenderer;
