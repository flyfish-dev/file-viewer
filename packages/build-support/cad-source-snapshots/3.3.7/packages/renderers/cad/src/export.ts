import type { FileRenderExportAdapter } from '@file-viewer/core';

export interface CadCanvasCaptureAdapter {
  captureCanvas?: () => Promise<HTMLCanvasElement>;
}

export async function captureFileViewerCadCanvas(getViewer: () => CadCanvasCaptureAdapter | null) {
  const viewer = getViewer();
  if (!viewer?.captureCanvas) throw new Error('The CAD engine does not support canvas snapshots.');
  const snapshot = await viewer.captureCanvas();
  if (getViewer() !== viewer) throw new Error('The CAD document changed during export.');
  return snapshot;
}

export function createFileViewerCadExportAdapter(
  getViewer: () => CadCanvasCaptureAdapter | null,
  filename = 'CAD drawing',
  getPage?: () => HTMLElement
): FileRenderExportAdapter {
  return {
    includeDocumentStyles: false,
    getPrintMaskPages: getPage ? () => [getPage()] : undefined,
    async toHtml() {
      const snapshot = await captureFileViewerCadCanvas(getViewer);
      const image = snapshot.ownerDocument.createElement('img');
      image.src = snapshot.toDataURL('image/png');
      image.alt = filename;
      image.width = snapshot.width;
      image.height = snapshot.height;
      image.style.cssText = 'display:block;max-width:100%;height:auto;margin:0 auto;';
      const page = snapshot.ownerDocument.createElement('div');
      page.dataset.viewerPrintPageIndex = '0';
      page.appendChild(image);
      return page.outerHTML;
    },
  };
}
