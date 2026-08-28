import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPlugin,
  RendererDefinition,
} from '@file-viewer/core';

export interface FileViewerDicomLimits {
  /** Maximum encoded Part 10 file size. Defaults to 64 MiB. */
  maxSourceBytes?: number;
  /** Maximum number of frames exposed by one file. Defaults to 256. */
  maxFrames?: number;
  /** Maximum decoded samples in one frame. Defaults to 16 million. */
  maxFramePixels?: number;
  /** Maximum decoded samples addressable by one file. Defaults to 48 million. */
  maxTotalPixels?: number;
}

export interface FileViewerDicomRendererOptions {
  limits?: FileViewerDicomLimits;
  /** Number of codec workers initialized after a DICOM file is selected. Defaults to at most 2. */
  maxWebWorkers?: number;
}

export const dicomRendererDefinition: RendererDefinition = {
  id: 'dicom',
  label: 'DICOM medical image',
  category: 'image',
  extensions: ['dcm', 'dicom'],
  async: true,
  supportLevel: 'basic',
  status: 'experimental',
  packageName: '@file-viewer/renderer-dicom',
  presets: [],
  knownLimits: [
    'This MVP is tested with Implicit/Explicit VR Little Endian, JPEG Lossless Process 14 SV1, JPEG-LS Lossless, and JPEG 2000 Lossless Part 10 files; other transfer syntaxes and DICOMweb are not included.',
    'The MVP renders one single-frame or multi-frame local file as a stack; series assembly, PACS/DICOMweb, MPR, and diagnostic use are not included.',
  ],
  capabilities: {
    download: true,
    print: false,
    exportHtml: false,
    zoom: true,
  },
};

const createHandler = (
  options?: FileViewerDicomRendererOptions
): FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> => (
  buffer,
  target,
  type,
  context
) => import('./dicom.js').then(({ default: renderDicom }) => (
  renderDicom(buffer, target, type, context, options)
));

export const renderFileViewerDicom = createHandler();

export const createDicomRenderer = (
  options?: FileViewerDicomRendererOptions
): FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> => ({
  id: 'file-viewer-renderer-dicom',
  label: 'Flyfish File Viewer opt-in DICOM renderer',
  definitions: [dicomRendererDefinition],
  handlers: [{
    rendererId: dicomRendererDefinition.id,
    handler: options ? createHandler(options) : renderFileViewerDicom,
  }],
});

export const dicomRenderer = createDicomRenderer();

export default dicomRenderer;
