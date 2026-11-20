import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPlugin,
  RendererDefinition
} from '@file-viewer/core'
import { registerFileViewerDocumentInspector } from '@file-viewer/core'

/** Presence of this optional capability enables metadata panels, never verification. */
export const enableFileViewerSignatureDocumentInspection = () => registerFileViewerDocumentInspector(
  'signature-metadata', request => import('./documentInspection.js').then(module => module.attachDocumentSignatureInspection(request))
)

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
    'Optional document inspection reuses the signature panel beside PDF/XML/JSON previews without verification. PDF dictionary inspection additionally requires the explicit PDF signature-inspection entry and its existing optional pdf-lib peer. Full XMLDSig/XAdES/JAdES verification, trust, S/MIME and PGP/MIME remain outside this integration.'
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
> = (() => {
  // Keep initialization attached to the consumed plugin value even with sideEffects:false.
  enableFileViewerSignatureDocumentInspection()
  return {
  id: 'file-viewer-renderer-signature',
  label: 'Flyfish File Viewer signature renderer',
  definitions: [signatureRendererDefinition],
  handlers: [
    {
      rendererId: signatureRendererDefinition.id,
      handler: renderFileViewerSignature
    }
  ]
  }
})()

export {
  inspectSignatureContainer,
  inspectSignatureCertificate,
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
export type {
  FileViewerSignatureOptions,
  FileViewerSignatureDetailsPanelOptions
} from './signature.js'
export { FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT } from './detailsPanel.js'
export type { FileViewerSignaturePanelChangeDetail } from './detailsPanel.js'

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
