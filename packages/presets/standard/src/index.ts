import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPreset,
} from '@file-viewer/core';
import { registerFileViewerAutoRendererPreset } from '@file-viewer/core';
import { archiveRenderer } from '@file-viewer/renderer-archive';
import { emailRenderer } from '@file-viewer/renderer-email';
import { imageRenderer } from '@file-viewer/renderer-image';
import { mediaRenderer } from '@file-viewer/renderer-media';
import { ofdRenderer } from '@file-viewer/renderer-ofd';
import { pdfRenderer } from '@file-viewer/renderer-pdf';
import { pptxRenderer } from '@file-viewer/renderer-pptx';
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet';
import { textRenderer } from '@file-viewer/renderer-text';
import { wordRenderer } from '@file-viewer/renderer-word';
import './enhancements.js';

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

/**
 * The v3 common-format baseline. Keep this package list aligned with
 * file-viewer.profile.json and the profile size/forbidden-dependency gate.
 */
export const standardRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-standard',
  label: 'Flyfish File Viewer standard renderer preset',
  renderers: [
    wordRenderer,
    pdfRenderer,
    ofdRenderer,
    pptxRenderer,
    spreadsheetRenderer,
    archiveRenderer,
    emailRenderer,
    textRenderer,
    imageRenderer,
    mediaRenderer,
  ],
};

export const fileViewerPresetStandard = standardRenderers;

registerFileViewerAutoRendererPreset(standardRenderers, {
  id: 'standard',
  packageName: '@file-viewer/preset-standard',
});

export default standardRenderers;
