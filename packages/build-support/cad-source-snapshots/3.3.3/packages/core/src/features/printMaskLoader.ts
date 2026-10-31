import type {
  FileViewerPrintMaskDesignerResult,
  OpenFileViewerPrintMaskDesignerOptions,
} from './printMaskDesigner';

/**
 * Lazily opens the print-mask designer.
 * Kept as a dynamic import so the designer stays out of the main core graph,
 * while remaining reachable through the primary `@file-viewer/core` entry
 * (no consumer alias / subpath setup required).
 */
export const openFileViewerPrintMaskDesignerAsync = async (
  options: OpenFileViewerPrintMaskDesignerOptions
): Promise<FileViewerPrintMaskDesignerResult | null> => {
  const { openFileViewerPrintMaskDesigner } = await import('../print-mask');
  return openFileViewerPrintMaskDesigner(options);
};
