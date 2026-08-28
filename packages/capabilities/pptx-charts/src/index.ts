import { registerPptxChartLibraryLoader } from '@file-viewer/pptx';

export const enableFileViewerPptxCharts = () => {
  registerPptxChartLibraryLoader(async () => ({
    billboard: await import('billboard.js'),
    d3Format: await import('d3-format'),
  }));
};

enableFileViewerPptxCharts();
