import {
  DEFAULT_RENDERER_DEFINITIONS,
  coreBrowserRendererHandlers,
  registerFileViewerAutoRendererPreset,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type FileViewerRendererPreset,
} from '@file-viewer/core';
import { archiveRenderer } from '@file-viewer/renderer-archive';
import { cadRenderer } from '@file-viewer/renderer-cad';
import { dataRenderer } from '@file-viewer/renderer-data';
import { drawingRenderer } from '@file-viewer/renderer-drawing';
import { ebookRenderer } from '@file-viewer/renderer-epub';
import { edaRenderer } from '@file-viewer/renderer-eda';
import { emailRenderer } from '@file-viewer/renderer-email';
import { geoRenderer } from '@file-viewer/renderer-geo';
import { hangulRenderer } from '@file-viewer/renderer-hangul';
import { iworkRenderer } from '@file-viewer/renderer-iwork';
import { imageRenderer } from '@file-viewer/renderer-image';
import { mediaRenderer } from '@file-viewer/renderer-media';
import { mindmapRenderer } from '@file-viewer/renderer-mindmap';
import { modelRenderer } from '@file-viewer/renderer-3d';
import { ofdRenderer } from '@file-viewer/renderer-ofd';
import { pdfRenderer } from '@file-viewer/renderer-pdf';
import { presentationRenderer } from '@file-viewer/renderer-presentation';
import { signatureRenderer } from '@file-viewer/renderer-signature';
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet';
import { textRenderer } from '@file-viewer/renderer-text';
import { typstRenderer } from '@file-viewer/renderer-typst';
import { wordRenderer } from '@file-viewer/renderer-word';
import { wordPerfectRenderer } from '@file-viewer/renderer-wordperfect';

export {
  DEFAULT_FULL_ASSET_BASE_PATH,
  DEFAULT_FULL_ASSET_BASE_URL,
  createFullAssetOptions,
  getDefaultFullAssetBaseUrl,
  mergeFullAssetOptions,
  normalizeFullAssetBaseUrl,
  resetDefaultFullAssetBaseUrl,
  resolveDefaultFullAssetBaseUrl,
  setDefaultFullAssetBaseUrl,
} from './fullAssets.js';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

const allRendererHandlers = coreBrowserRendererHandlers as readonly {
  rendererId: string;
  handler: BrowserRendererHandler;
}[];

const extractedRendererIds = ['apple-keynote', 'apple-numbers', 'apple-pages', 'archive', 'audio', 'cad', 'code', 'data-asset', 'drawing', 'ebook-fb2', 'eda', 'email', 'epub', 'geo', 'image', 'markdown', 'mindmap', 'model', 'ofd', 'office-hangul', 'office-presentation', 'office-presentation-binary', 'office-word-binary', 'office-word-openxml', 'office-wordperfect', 'open-document', 'pdf', 'spreadsheet-dbf', 'spreadsheet-openxml', 'typst', 'umd', 'video'] as const;

export const fileViewerAllRendererPlugin: FileViewerRendererPlugin<BrowserRendererHandler> = {
  id: 'file-viewer-all-renderers',
  label: 'Flyfish File Viewer all renderers',
  definitions: DEFAULT_RENDERER_DEFINITIONS.filter(definition => !extractedRendererIds.includes(definition.id as typeof extractedRendererIds[number])),
  handlers: allRendererHandlers.filter(handler => !extractedRendererIds.includes(handler.rendererId as typeof extractedRendererIds[number])),
};

export const allRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-all',
  label: 'Flyfish File Viewer full renderer preset',
  renderers: [wordRenderer, wordPerfectRenderer, hangulRenderer, iworkRenderer, pdfRenderer, ofdRenderer, presentationRenderer, spreadsheetRenderer, signatureRenderer, cadRenderer, typstRenderer, drawingRenderer, modelRenderer, archiveRenderer, emailRenderer, ebookRenderer, textRenderer, imageRenderer, mediaRenderer, mindmapRenderer, geoRenderer, dataRenderer, edaRenderer, fileViewerAllRendererPlugin],
};

export const fileViewerPresetAll = allRenderers;

registerFileViewerAutoRendererPreset(allRenderers, {
  id: 'all',
  packageName: '@file-viewer/preset-all',
});

export default allRenderers;
