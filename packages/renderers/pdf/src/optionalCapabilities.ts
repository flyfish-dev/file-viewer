import type { PdfIdentityFontRepairResult } from './pdfIdentityFontRepair.js';

export type FileViewerPdfIdentityFontRepair = (
  sourceBytes: Uint8Array,
  candidateFamilies?: readonly string[]
) => Promise<PdfIdentityFontRepairResult>;

let identityFontRepair: FileViewerPdfIdentityFontRepair | null = null;

export const registerFileViewerPdfIdentityFontRepair = (
  repair: FileViewerPdfIdentityFontRepair | null
) => {
  identityFontRepair = repair;
};

export const getFileViewerPdfIdentityFontRepair = () => identityFontRepair;
