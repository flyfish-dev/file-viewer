import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPlugin,
  RendererDefinition,
} from '@file-viewer/core';

export const signatureRendererDefinition: RendererDefinition = {
  id: 'signature',
  label: 'Digital signature and timestamp',
  category: 'document',
  extensions: ['p7m', 'p7s', 'p7b', 'p7c', 'pkcs7', 'cms', 'cmsc', 'tsq', 'tsr', 'tst', 'tsd', 'asc', 'sig', 'pgp', 'gpg'],
  async: true,
  supportLevel: 'experimental',
  status: 'experimental',
  packageName: '@file-viewer/renderer-signature',
  presets: [],
  knownLimits: [
    'Phase one supports CMS/PKCS#7, selected CAdES attributes, RFC 3161, and RFC 5544 TimeStampedData.',
    'Certificate trust, policy compliance, qualified status, and legal validity are not established.',
    'OpenPGP inspection and detached verification use an optional lazy rPGP WebAssembly Worker; private-key operations remain out of scope.',
    'ASiC, evidence records, PAdES, XAdES, and JAdES remain out of scope.',
  ],
  capabilities: { download: true },
};

export const renderFileViewerSignature: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => import('./signature.js').then(({ default: renderSignature }) => renderSignature(buffer, target, type, context));

export const signatureRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-signature',
  label: 'Flyfish File Viewer signature renderer',
  definitions: [signatureRendererDefinition],
  handlers: [{ rendererId: signatureRendererDefinition.id, handler: renderFileViewerSignature }],
};

export {
  inspectSignatureContainer,
  signatureOidLabels,
  type InspectSignatureOptions,
  type SignatureCertificateSummary,
  type SignatureContainerKind,
  type SignatureInspection,
  type SignatureSignerSummary,
  type TimestampInfoSummary,
  type TimestampResponseSummary,
} from './signatureAsn1.js';
export type { FileViewerSignatureOptions } from './signature.js';

export default signatureRenderer;

export { OpenPgpWorkerClient, DEFAULT_SIGNATURE_PARSE_LIMITS } from './openpgp/client.js';
export { isProbablyOpenPgp, detectOpenPgpArmorType } from './openpgp/formatDetection.js';
export type { SignatureParseLimits, OpenPgpInspectionResult, OpenPgpVerificationResult, OpenPgpKeySummary, OpenPgpSignatureSummary, ExtractedLiteralData } from './openpgp/types.js';
