import { registerFileViewerPdfSignatureReader } from '@file-viewer/core';
import { registerFileViewerPdfIdentityFontRepair, type FileViewerPdfIdentityFontRepair } from '@file-viewer/renderer-pdf';

export const repairMalformedIdentityCjkFonts: FileViewerPdfIdentityFontRepair = async (
  sourceBytes,
  candidateFamilies = []
) => {
  const implementation = await import('@file-viewer/renderer-pdf/identity-font-repair');
  return implementation.repairMalformedIdentityCjkFonts(sourceBytes, candidateFamilies);
};

export const enableFileViewerPdfIdentityFontRepair = () => {
  registerFileViewerPdfIdentityFontRepair(repairMalformedIdentityCjkFonts);
  // Registration is immediate; the optional parser loads only when requested.
  registerFileViewerPdfSignatureReader(async (bytes, signal) => {
    const implementation = await import('@file-viewer/renderer-pdf/signature-inspection');
    return implementation.readPdfSignatureDictionaries(bytes, signal);
  });
};

enableFileViewerPdfIdentityFontRepair();
