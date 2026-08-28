import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderContext,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

export {
  getFileViewerMermaidLoader,
  getFileViewerDiffToHtml,
  getFileViewerPakoLoader,
  registerFileViewerDiffToHtml,
  registerFileViewerMermaidLoader,
  registerFileViewerPakoLoader,
} from './optionalCapabilities.js';
export type {
  FileViewerMermaidLoader,
  FileViewerMermaidModule,
  FileViewerDiffToHtml,
  FileViewerPakoModule,
} from './optionalCapabilities.js';
export { sanitizeFileViewerRichHtml } from './sanitizeHtml.js';

const textRendererIds = ['code', 'markdown'] as const;

const textDefinitions = DEFAULT_RENDERER_DEFINITIONS.filter(definition =>
  textRendererIds.includes(definition.id as typeof textRendererIds[number])
) as RendererDefinition[];

if (textDefinitions.length !== textRendererIds.length) {
  throw new Error('@file-viewer/renderer-text could not locate the shared code/markdown format definitions.');
}

export const textRendererDefinitions = textDefinitions;

export const renderFileViewerCode: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context?: FileRenderContext
) => import('./code.js').then(({ default: renderCode }) => renderCode(buffer, target, type, context));

export const renderFileViewerMarkdown: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./largeText.js').then(async ({ default: renderLargeText, shouldVirtualizeMarkdownBuffer }) => {
  if (shouldVirtualizeMarkdownBuffer(buffer, context)) {
    return renderLargeText(buffer, target, type || 'md', context);
  }
  const { default: renderMarkdown } = await import('./markdown.js');
  return renderMarkdown(buffer, target, context);
});

export const textRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-text',
  label: 'Flyfish File Viewer text renderer',
  definitions: textRendererDefinitions,
  handlers: [
    {
      rendererId: 'code',
      handler: renderFileViewerCode,
    },
    {
      rendererId: 'markdown',
      handler: renderFileViewerMarkdown,
    },
  ],
};

export default textRenderer;
