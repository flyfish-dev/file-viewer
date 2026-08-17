import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';
import type {
  HangulDocument,
  HangulMedia,
  HangulPageGeometry,
  HangulParseLimits,
  HangulSection,
  HangulTable,
  HangulTableCell,
} from './model.js';

const hangulDefinition = DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === 'office-hangul') as RendererDefinition | undefined;
if (!hangulDefinition) throw new Error('@file-viewer/renderer-hangul could not locate the shared HWP/HWPX definition.');

export const hangulRendererDefinition = hangulDefinition;
export const renderFileViewerHangul: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./hangul.js').then(({ default: renderHangul }) => renderHangul(buffer, target, type, context));

export const hangulRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-hangul',
  label: 'Flyfish File Viewer HWP/HWPX renderer',
  definitions: [hangulRendererDefinition],
  handlers: [{ rendererId: hangulRendererDefinition.id, handler: renderFileViewerHangul }],
};

export type {
  HangulDocument,
  HangulMedia,
  HangulPageGeometry,
  HangulParseLimits,
  HangulSection,
  HangulTable,
  HangulTableCell,
};
export { DEFAULT_HANGUL_PARSE_LIMITS } from './limits.js';
export const parseHangulDocument = async (
  ...args: Parameters<typeof import('./parser.js')['parseHangulDocument']>
) => {
  const parser = await import('./hangul.parser.js');
  return parser.parseHangulDocument(...args);
};
export default hangulRenderer;
