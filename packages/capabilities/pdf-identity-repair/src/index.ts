import { registerFileViewerPdfIdentityFontRepair } from '@file-viewer/renderer-pdf';
import { repairMalformedIdentityCjkFonts } from '@file-viewer/renderer-pdf/identity-font-repair';

export const enableFileViewerPdfIdentityFontRepair = () => {
  registerFileViewerPdfIdentityFontRepair(repairMalformedIdentityCjkFonts);
};

enableFileViewerPdfIdentityFontRepair();

export { repairMalformedIdentityCjkFonts };
