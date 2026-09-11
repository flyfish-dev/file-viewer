import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPreset,
} from '@file-viewer/core';
import { registerFileViewerAutoRendererPreset } from '@file-viewer/core';
import { archiveRenderer } from '@file-viewer/renderer-archive';
import { cadRenderer } from '@file-viewer/renderer-cad';
import { dataRenderer } from '@file-viewer/renderer-data';
import { drawingRenderer } from '@file-viewer/renderer-drawing';
import { edaRenderer } from '@file-viewer/renderer-eda';
import { geoRenderer } from '@file-viewer/renderer-geo';
import { mindmapRenderer } from '@file-viewer/renderer-mindmap';
import { modelRenderer } from '@file-viewer/renderer-3d';
import { typstRenderer } from '@file-viewer/renderer-typst';

export type {
  FileViewerIfcConfigureContext,
  FileViewerIfcElementInfo,
  FileViewerIfcOptions,
  FileViewerIfcProperty,
  FileViewerIfcPropertySet,
} from '@file-viewer/renderer-3d';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

export const engineeringRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-engineering',
  label: 'Flyfish File Viewer engineering renderer preset',
  renderers: [
    cadRenderer,
    modelRenderer,
    drawingRenderer,
    mindmapRenderer,
    geoRenderer,
    typstRenderer,
    archiveRenderer,
    dataRenderer,
    edaRenderer,
  ],
};

export const fileViewerPresetEngineering = engineeringRenderers;

registerFileViewerAutoRendererPreset(engineeringRenderers, {
  id: 'engineering',
  packageName: '@file-viewer/preset-engineering',
});

export default engineeringRenderers;
