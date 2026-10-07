import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderContext,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';
import { getXmlProfilesLoader } from './xmlRegistration.js';

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

export const renderFileViewerCode: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = async (
  buffer,
  target,
  type,
  context?: FileRenderContext
) => {
  if (type?.trim().toLowerCase() === 'lrc') {
    const { default: renderLrc } = await import('./lrc.js');
    return renderLrc(buffer, target, type, context);
  }
  if (/^(?:html|htm)$/i.test(type || '')) {
    const { default: renderHtml } = await import('./html.js');
    return renderHtml(buffer, target, type, context);
  }
  if (type?.trim().toLowerCase() === 'xml' && context?.options?.xml) {
    const loader = getXmlProfilesLoader();
    if (loader) {
      const { default: renderXml } = await loader();
      return renderXml(buffer, target, context);
    }
    const message = 'Enable @file-viewer/renderer-text/xml-profiles and deploy its self-hosted runtime assets.';
    try {
      context.options.xml.onDiagnostic?.({ code: 'capability-unavailable', message });
    } catch { /* Host diagnostics must not prevent source preview. */ }
    try {
      context.options.onDiagnostic?.({ code: 'xml-profile-capability-unavailable', level: 'warning', message });
    } catch { /* Host diagnostics must not prevent source preview. */ }
  }
  const { default: renderCode } = await import('./code.js');
  return renderCode(buffer, target, type, context);
};

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
