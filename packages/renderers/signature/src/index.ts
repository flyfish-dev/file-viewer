import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPlugin,
  RendererDefinition
} from '@file-viewer/core'

export const signatureRendererDefinition: RendererDefinition = {
  id: 'signature',
  label: 'Digital signature, timestamp and evidence container',
  category: 'document',
  extensions: [
    'p7m',
    'p7s',
    'p7b',
    'p7c',
    'pkcs7',
    'cms',
    'cmsc',
    'tsq',
    'tsr',
    'tst',
    'tsd',
    'asics',
    'scs',
    'asice',
    'sce',
    'ers',
    'asc',
    'sig',
    'pgp',
    'gpg',
    'jws'
  ],
  async: true,
  supportLevel: 'experimental',
  status: 'experimental',
  packageName: '@file-viewer/renderer-signature',
  presets: [],
  knownLimits: [
    'Supports bounded CMS/PKCS#7, selected CAdES attributes, RFC 3161, RFC 5544, ASiC, RFC 4998, JWS and OpenPGP inspection.',
    'Certificate trust, policy compliance, qualified status, and legal validity are not established.',
    'ASiC XML signature references and RFC 4998 renewal chains are structurally inspected; full XAdES and archival-policy validation are not claimed.',
    'OpenPGP inspection plus detached, cleartext and embedded signature verification use a lazy rPGP WebAssembly Worker; private-key operations and automatic decryption are intentionally excluded.',
    'JAdES properties are reported as metadata only. PAdES, full XMLDSig/XAdES/JAdES validation, S/MIME and PGP/MIME remain outside this renderer because they require host integration with their existing document and message renderers.'
  ],
  capabilities: { download: true }
}

export const renderFileViewerSignature: FileRenderHandler<
  FileViewerRenderedInstance,
  HTMLDivElement
> = (buffer, target, type, context) =>
  import('./signature.js').then(({ default: renderSignature }) =>
    renderSignature(buffer, target, type, context)
  )

export const signatureRenderer: FileViewerRendererPlugin<
  FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>
> = {
  id: 'file-viewer-renderer-signature',
  label: 'Flyfish File Viewer signature renderer',
  definitions: [signatureRendererDefinition],
  handlers: [{ rendererId: signatureRendererDefinition.id, handler: renderFileViewerSignature }]
}

export {
  inspectSignatureContainer,
  inspectEvidenceRecord,
  DEFAULT_SIGNATURE_ASN1_LIMITS,
  signatureOidLabels,
  type InspectSignatureOptions,
  type SignatureAsn1Limits,
  type SignatureCertificateSummary,
  type SignatureContainerKind,
  type SignatureInspection,
  type SignatureSignerSummary,
  type TimestampInfoSummary,
  type TimestampResponseSummary
} from './signatureAsn1.js'
export {
  inspectAsicContainer,
  inspectJws,
  isProbablyJws,
  DEFAULT_SIGNATURE_CONTAINER_LIMITS,
  normalizeSignatureContainerLimits
} from './inspect.js'
export type { FileViewerSignatureOptions } from './signature.js'

export default signatureRenderer

export {
  OpenPgpWorkerClient,
  DEFAULT_SIGNATURE_PARSE_LIMITS,
  normalizeSignatureParseLimits
} from './openpgp/client.js'
export { isProbablyOpenPgp, detectOpenPgpArmorType } from './openpgp/formatDetection.js'
export type {
  SignatureParseLimits,
  OpenPgpInspectionResult,
  OpenPgpVerificationResult,
  OpenPgpKeySummary,
  OpenPgpSignatureSummary,
  ExtractedLiteralData
} from './openpgp/types.js'
