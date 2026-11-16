import { registerFileViewerPdfIdentityFontRepair } from '@file-viewer/renderer-pdf';
import { repairMalformedIdentityCjkFonts } from '@file-viewer/renderer-pdf/identity-font-repair';
import { enableFileViewerPdfSignatureInspection } from '@file-viewer/renderer-pdf/signature-inspection';

export const enableFileViewerPdfIdentityFontRepair = () => {
  registerFileViewerPdfIdentityFontRepair(repairMalformedIdentityCjkFonts);
  // Full already owns the optional pdf-lib closure. Inspection stays inactive
  // until a signature plugin registers its metadata-only document inspector.
  enableFileViewerPdfSignatureInspection();
};

enableFileViewerPdfIdentityFontRepair();

export { repairMalformedIdentityCjkFonts };
