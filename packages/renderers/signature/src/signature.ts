import { createFileViewerTranslator } from '@file-viewer/core'
import {
  disposeFileViewerRendered,
  normalizeFileViewerUiDensity,
  type FileRenderContext,
  type FileViewerSignatureOptions,
  type FileViewerRenderedInstance
} from '@file-viewer/core'
import {
  inspectEvidenceRecord,
  inspectSignatureContainer,
  type EvidenceRecordInspection,
  type SignatureCertificateSummary,
  type SignatureInspection,
  type SignatureSignerSummary,
  type TimestampInfoSummary
} from './signatureAsn1.js'
import { isProbablyOpenPgp } from './openpgp/formatDetection.js'
import type { OpenPgpWorkerClient as OpenPgpWorkerClientType } from './openpgp/client.js'
import type { OpenPgpInspectionResult, OpenPgpVerificationResult } from './openpgp/types.js'
import { SignatureContainerWorkerClient } from './structured/containerClient.js'
import { normalizeSignatureContainerLimits } from './structured/limits.js'
import { inspectJws, isProbablyJws } from './structured/jws.js'
import type { AsicInspection, JwsInspection, JwsVerificationKey } from './structured/types.js'

const DEFAULT_MAX_CONTAINER_SIZE = 64 * 1024 * 1024
const DEFAULT_MAX_NESTED_PREVIEW_SIZE = 32 * 1024 * 1024

export type {
  FileViewerSignatureOptions,
  FileViewerSignatureDetailsPanelOptions
} from '@file-viewer/core'
import {
  createSignatureDetailsPanel,
  normalizeSignatureDetailsPanelOptions,
  signatureDetailsPanelStyle
} from './detailsPanel.js'

const signatureStyle = `
.signature-shell{box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;overflow:auto;background:#edf2f7;color:#172033;font-family:Aptos,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
.signature-shell *{box-sizing:border-box}
.signature-header{position:sticky;top:0;z-index:3;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid rgba(23,32,51,.09);background:rgba(255,255,255,.94);backdrop-filter:blur(12px)}
.signature-title{min-width:0}.signature-title small{display:block;color:#24765a;font-size:11px;font-weight:900;letter-spacing:.08em}.signature-title h2{margin:3px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:19px}.signature-title p{margin:5px 0 0;color:#64748b;font-size:12px}.signature-phase{flex:0 0 auto;padding:7px 10px;border-radius:999px;background:#e7f8ef;color:#166534;font-size:11px;font-weight:900}
.signature-content{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:14px;padding:14px}
.signature-sidebar,.signature-main{min-width:0;display:flex;flex-direction:column;gap:12px}
.signature-card{min-width:0;padding:14px;border:1px solid rgba(23,32,51,.08);border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(23,32,51,.05)}
.signature-card h3{margin:0 0 10px;font-size:14px}.signature-card h4{margin:13px 0 7px;font-size:12px}.signature-card p{margin:6px 0;color:#526174;font-size:12px;line-height:1.55}.signature-card code{font-family:'SFMono-Regular',Consolas,monospace;font-size:11px;overflow-wrap:anywhere}
.signature-grid{display:grid;grid-template-columns:minmax(110px,auto) minmax(0,1fr);gap:7px 10px;margin:0}.signature-grid dt{color:#708095;font-size:11px;font-weight:800}.signature-grid dd{min-width:0;margin:0;overflow-wrap:anywhere;font-size:12px}
.signature-warning{padding:10px 11px;border-radius:10px;background:#fff7e8;color:#854d0e;font-size:11px;line-height:1.5}.signature-warning+.signature-warning{margin-top:7px}
.signature-status-list{display:flex;flex-wrap:wrap;gap:6px}.signature-status{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:#eef2f7;color:#475569;font-size:10px;font-weight:900}.signature-status[data-state='valid']{background:#dcfce7;color:#166534}.signature-status[data-state='invalid']{background:#fee2e2;color:#991b1b}.signature-status[data-state='pending']{background:#fef3c7;color:#92400e}
.signature-item{padding:11px;border:1px solid rgba(23,32,51,.08);border-radius:11px;background:#f8fafc}.signature-item+.signature-item{margin-top:9px}.signature-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.signature-item-head strong{font-size:12px}.signature-item-head span{color:#64748b;font-size:10px}
.signature-original{display:flex;flex-direction:column;gap:9px}.signature-file{width:100%;font-size:12px}.signature-file::file-selector-button{margin-right:9px;padding:7px 10px;border:0;border-radius:8px;background:#1f7a58;color:#fff;font:inherit;font-weight:800;cursor:pointer}.signature-original-state{min-height:18px;color:#64748b;font-size:11px}
.signature-preview{min-height:360px;overflow:hidden;padding:0}.signature-preview-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-bottom:1px solid rgba(23,32,51,.08)}.signature-preview-head strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.signature-preview-target{min-height:340px;height:min(65vh,720px);overflow:auto;background:#f8fafc}.signature-preview-empty{height:100%;min-height:340px;display:flex;align-items:center;justify-content:center;padding:28px;color:#64748b;text-align:center;font-size:12px;line-height:1.6}
.signature-openpgp-note{padding:10px 11px;border-radius:10px;background:#eef6ff;color:#1e3a5f;font-size:11px;line-height:1.5}.signature-key-input{display:flex;flex-direction:column;gap:8px}
.signature-error{padding:14px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;color:#991b1b;font-size:12px;line-height:1.55}
.signature-loading{display:flex;align-items:center;gap:10px;padding:15px;color:#526174;font-size:12px}.signature-spinner{width:20px;height:20px;border:2px solid rgba(31,122,88,.18);border-top-color:#1f7a58;border-radius:999px;animation:signature-spin .8s linear infinite}
.signature-shell[data-viewer-density='compact'] .signature-header{padding:9px 11px}.signature-shell[data-viewer-density='compact'] .signature-content{gap:8px;padding:8px}.signature-shell[data-viewer-density='compact'] .signature-card{padding:10px;border-radius:10px}
[data-viewer-theme='dark'] .signature-shell{background:#111827;color:#e5edf7}[data-viewer-theme='dark'] .signature-header,[data-viewer-theme='dark'] .signature-card{background:#182233;border-color:rgba(255,255,255,.08)}[data-viewer-theme='dark'] .signature-item,[data-viewer-theme='dark'] .signature-preview-target{background:#101827;border-color:rgba(255,255,255,.08)}[data-viewer-theme='dark'] .signature-title p,[data-viewer-theme='dark'] .signature-card p,[data-viewer-theme='dark'] .signature-grid dt,[data-viewer-theme='dark'] .signature-item-head span,[data-viewer-theme='dark'] .signature-original-state,[data-viewer-theme='dark'] .signature-preview-empty{color:#9eabc0}
@media(max-width:860px){.signature-content{grid-template-columns:1fr}.signature-header{position:relative}.signature-preview-target{height:520px}}
@keyframes signature-spin{to{transform:rotate(360deg)}}
`



const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`
}

const valueOrDash = (value: unknown) =>
  value === undefined || value === null || value === '' ? '—' : String(value)

const getFilenameExtension = (filename: string) => {
  const basename = filename.split(/[\\/]/).pop() || filename
  const dot = basename.lastIndexOf('.')
  return dot > 0 && dot < basename.length - 1 ? basename.slice(dot + 1).toLowerCase() : ''
}

const stripContainerExtension = (filename: string) =>
  filename.replace(/\.(?:p7m|p7s|p7b|p7c|pkcs7|cms|cmsc|tst|tsq|tsr|tsd)$/i, '')

const sniffNestedExtension = (bytes: Uint8Array) => {
  const head = bytes.subarray(0, Math.min(bytes.byteLength, 512))
  const ascii = String.fromCharCode(...head)
  if (ascii.startsWith('%PDF-')) return 'pdf'
  if (head[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'png'
  if (head[0] === 0xff && head[1] === 0xd8) return 'jpg'
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'gif'
  if (ascii.startsWith('PK\u0003\u0004')) return 'zip'
  const text = new TextDecoder('utf-8', { fatal: false }).decode(head).trimStart()
  if (text.startsWith('<?xml') || text.startsWith('<')) return 'xml'
  if (text.startsWith('{') || text.startsWith('[')) return 'json'
  const printable =
    head.length === 0 ||
    Array.from(head).filter(
      (value) => value === 9 || value === 10 || value === 13 || (value >= 32 && value < 127)
    ).length /
      head.length >
      0.92
  return printable ? 'txt' : 'bin'
}

const resolveNestedIdentity = (
  inspection: SignatureInspection,
  sourceFilename: string,
  originalFilename?: string,
  preferOriginal = false
) => {
  if (preferOriginal && originalFilename) {
    return {
      filename: originalFilename,
      extension: getFilenameExtension(originalFilename) || 'bin'
    }
  }
  const stripped = stripContainerExtension(sourceFilename)
  const extension =
    getFilenameExtension(stripped) ||
    (inspection.embeddedContent ? sniffNestedExtension(inspection.embeddedContent) : 'bin')
  const filename = getFilenameExtension(stripped) ? stripped : `signed-content.${extension}`
  return { filename, extension }
}

const readBoundedBlob = async (blob: Blob, limit: number, label: string) => {
  if (blob.size > limit) throw new Error(`${label} exceeds the ${formatBytes(limit)} limit.`)
  const result = await blob.arrayBuffer()
  if (result.byteLength > limit)
    throw new Error(`${label} exceeds the ${formatBytes(limit)} limit.`)
  return result
}

const readConfiguredOriginal = async (
  options: FileViewerSignatureOptions | undefined,
  limit: number
) => {
  if (!options?.originalContent) {
    return undefined
  }
  if (options.originalContent instanceof ArrayBuffer) {
    if (options.originalContent.byteLength > limit)
      throw new Error(`Original content exceeds the ${formatBytes(limit)} limit.`)
    return options.originalContent
  }
  return readBoundedBlob(options.originalContent, limit, 'Original content')
}

const readConfiguredOpenPgpKeys = async (
  options: FileViewerSignatureOptions | undefined,
  limit: number
) => {
  const keys = options?.openPgpPublicKeys || []
  if (keys.length > 64) throw new Error('At most 64 OpenPGP verification keys may be supplied.')
  const result = await Promise.all(
    keys.map((key) => {
      if (key instanceof ArrayBuffer) {
        if (key.byteLength > limit)
          throw new Error(`OpenPGP verification key exceeds the ${formatBytes(limit)} limit.`)
        return key
      }
      return readBoundedBlob(key, limit, 'OpenPGP verification key')
    })
  )
  const aggregate = result.reduce((sum, value) => sum + value.byteLength, 0)
  if (aggregate > limit)
    throw new Error(`OpenPGP verification keys exceed the aggregate ${formatBytes(limit)} limit.`)
  return result
}

const createSignatureUi = (t: ReturnType<typeof createFileViewerTranslator>) => {
  const createElement = t.element

const appendDefinitionList = (
  documentRef: Document,
  parent: HTMLElement,
  rows: Array<[string | (() => string), unknown]>
) => {
  const list = createElement(documentRef, 'dl', 'signature-grid')
  rows.forEach(([label, value]) => {
    list.append(
      createElement(documentRef, 'dt', undefined, label),
      createElement(documentRef, 'dd', undefined, () => valueOrDash(typeof value === 'function' ? value() : value))
    )
  })
  parent.append(list)
}

const statusBadge = (
  documentRef: Document,
  label: string | (() => string),
  value: boolean | undefined,
  pendingLabel: string | (() => string)
) => {
  const state = value === true ? 'valid' : value === false ? 'invalid' : 'pending'
  const text = () => t(value === true ? 'signature.state.valid' : value === false ? 'signature.state.invalid' : 'signature.state.pending', {
    label: typeof label === 'function' ? label() : label,
    state: typeof pendingLabel === 'function' ? pendingLabel() : pendingLabel,
  })
  const element = createElement(documentRef, 'span', 'signature-status', text)
  element.dataset.state = state
  return element
}

const renderSigner = (documentRef: Document, signer: SignatureSignerSummary) => {
  const item = createElement(documentRef, 'article', 'signature-item')
  const head = createElement(documentRef, 'div', 'signature-item-head')
  head.append(
    createElement(documentRef, 'strong', undefined, () => t('signature.ui.signer.58e1dd', { p0: signer.index + 1 })),
    createElement(
      documentRef,
      'span',
      undefined,
      () => signer.certificateIndex === undefined ? t('signature.ui.certificate.not.matched.4e6a84') : t('signature.ui.certificate.6ca9e8', { p0: signer.certificateIndex + 1 })
    )
  )
  const statuses = createElement(documentRef, 'div', 'signature-status-list')
  statuses.append(
    statusBadge(documentRef, () => t('signature.ui.signature.2f32be'), signer.cryptographicSignatureValid, () => t('signature.ui.not.verified.c75397')),
    statusBadge(documentRef, () => t('signature.ui.content.digest.a3ab15'), signer.digestMatches, () => t('signature.ui.original.required.95cf87'))
  )
  item.append(head, statuses)
  appendDefinitionList(documentRef, item, [
    [() => t('signature.ui.signer.identifier.6aa443'), signer.sid],
    [() => t('signature.ui.digest.algorithm.5b4cb2'), signer.digestAlgorithm],
    [() => t('signature.ui.signature.algorithm.601824'), signer.signatureAlgorithm],
    [() => t('signature.ui.signing.time.f74d88'), signer.signingTime],
    [() => t('signature.ui.signed.content.type.c0f982'), signer.contentTypeOid],
    [() => t('signature.ui.signed.message.digest.84d8d2'), signer.messageDigest],
    [() => t('signature.ui.cades.signingcertificatev2.125f12'), () => signer.signingCertificateV2 ? t('signature.ui.present.4e9f7a') : t('signature.ui.not.detected.a5cb42')],
    [() => t('signature.ui.signature.timestamp.tokens.1b9092'), signer.signatureTimestampTokens],
    [() => t('signature.ui.verification.note.a5d1f9'), signer.verificationError]
  ])
  return item
}

const renderCertificate = (documentRef: Document, certificate: SignatureCertificateSummary) => {
  const item = createElement(documentRef, 'article', 'signature-item')
  const head = createElement(documentRef, 'div', 'signature-item-head')
  head.append(
    createElement(documentRef, 'strong', undefined, () => t('signature.ui.certificate.042c9a', { p0: certificate.index + 1 })),
    createElement(documentRef, 'span', undefined, `X.509 v${certificate.version || '?'}`)
  )
  item.append(head)
  appendDefinitionList(documentRef, item, [
    [() => t('signature.ui.subject.8d183d'), certificate.subject],
    [() => t('signature.ui.issuer.2587e4'), certificate.issuer],
    [() => t('signature.ui.serial.number.a5349d'), certificate.serialNumber],
    [() => t('signature.ui.valid.from.160fde'), certificate.notBefore],
    [() => t('signature.ui.valid.until.c8214d'), certificate.notAfter],
    [() => t('signature.ui.public.key.affb45'), certificate.publicKeyAlgorithm],
    [() => t('signature.ui.public.key.curve.d05166'), certificate.publicKeyCurveOid],
    [() => t('signature.ui.certificate.signature.974399'), certificate.signatureAlgorithm],
    [() => t('signature.ui.subject.key.identifier.71af2c'), certificate.subjectKeyIdentifier],
    [() => t('signature.ui.sha.256.fingerprint.b98c7c'), certificate.fingerprintSha256]
  ])
  return item
}

const renderTimestamp = (documentRef: Document, timestamp: TimestampInfoSummary) => {
  const card = createElement(documentRef, 'section', 'signature-card')
  card.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.rfc.3161.timestamp.58248c')))
  const statuses = createElement(documentRef, 'div', 'signature-status-list')
  statuses.append(
    statusBadge(
      documentRef,
      () => t('signature.ui.message.imprint.5addc3'),
      timestamp.messageImprintMatchesOriginal,
      () => t('signature.ui.original.required.95cf87')
    )
  )
  card.append(statuses)
  appendDefinitionList(documentRef, card, [
    [() => t('design.designResources.version'), timestamp.version],
    [() => t('signature.ui.policy.oid.3ad507'), timestamp.policyOid],
    [() => t('signature.ui.serial.number.a5349d'), timestamp.serialNumber],
    [() => t('signature.ui.generation.time.8a9b2b'), timestamp.generationTime],
    [() => t('signature.ui.message.imprint.algorithm.5c1dbc'), timestamp.messageImprintAlgorithm],
    [() => t('signature.ui.message.imprint.5addc3'), timestamp.messageImprint],
    [() => t('signature.ui.nonce.3aed2d'), timestamp.nonce],
    [
      () => t('signature.ui.tsa.certificate.requested.1ba199'),
      () => timestamp.certReq === undefined ? undefined : timestamp.certReq ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')
    ],
    [() => t('signature.ui.ordering.d3ed86'), timestamp.ordering],
    [
      () => t('signature.ui.accuracy.12a3a4'),
      timestamp.accuracy
        ? [
            timestamp.accuracy.seconds === undefined ? '' : `${timestamp.accuracy.seconds}s`,
            timestamp.accuracy.millis === undefined ? '' : `${timestamp.accuracy.millis}ms`,
            timestamp.accuracy.micros === undefined ? '' : `${timestamp.accuracy.micros}µs`
          ]
            .filter(Boolean)
            .join(' ')
        : undefined
    ],
    [() => t('signature.ui.timestamp.authority.bc3c7b'), timestamp.tsa]
  ])
  return card
}

const renderOpenPgpKey = (documentRef: Document, key: OpenPgpInspectionResult['keys'][number]) => {
  const item = createElement(documentRef, 'article', 'signature-item')
  const head = createElement(documentRef, 'div', 'signature-item-head')
  head.append(
    createElement(
      documentRef,
      'strong',
      undefined,
      `${key.kind === 'private' ? 'Private-key block' : 'Public key'}`
    ),
    createElement(documentRef, 'span', undefined, () => key.keyId || t('signature.ui.key.id.unavailable.386d2a'))
  )
  item.append(head)
  appendDefinitionList(documentRef, item, [
    [() => t('signature.ui.fingerprint.fed4c9'), key.fingerprint],
    [() => t('design.designResources.version'), key.version],
    [() => t('signature.ui.algorithm.02f024'), key.algorithm],
    [() => t('signature.ui.created.accf40'), key.createdAt],
    [() => t('signature.ui.user.ids.250639'), key.userIds.join('; ')],
    [() => t('signature.ui.subkeys.d35a7c'), key.subkeys.length]
  ])
  if (key.kind === 'private') {
    item.append(
      createElement(
        documentRef,
        'div',
        'signature-warning',
        () => t('signature.ui.only.public.metadata.is.exposed.secret.cc9299')
      )
    )
  }
  return item
}

const renderOpenPgpSignature = (
  documentRef: Document,
  signature: OpenPgpInspectionResult['signatures'][number],
  index: number
) => {
  const item = createElement(documentRef, 'article', 'signature-item')
  const head = createElement(documentRef, 'div', 'signature-item-head')
  head.append(
    createElement(documentRef, 'strong', undefined, () => t('signature.ui.signature.9556e5', { p0: index + 1 })),
    createElement(documentRef, 'span', undefined, () => signature.signatureType || t('signature.ui.openpgp.05835a'))
  )
  const statuses = createElement(documentRef, 'div', 'signature-status-list')
  statuses.append(
    statusBadge(
      documentRef,
      () => t('signature.ui.cryptographic.signature.c5cee8'),
      signature.cryptographicValid,
      () => t('signature.ui.public.key.or.original.required.204142')
    )
  )
  item.append(head, statuses)
  appendDefinitionList(documentRef, item, [
    [() => t('signature.ui.hash.algorithm.917ccc'), signature.hashAlgorithm],
    [() => t('signature.ui.public.key.algorithm.69be1d'), signature.publicKeyAlgorithm],
    [() => t('signature.ui.created.accf40'), signature.createdAt],
    [() => t('signature.ui.expires.a99be3'), signature.expiresAt],
    [() => t('signature.ui.issuer.key.ids.14896c'), signature.issuerKeyIds.join(', ')],
    [() => t('signature.ui.issuer.fingerprints.5cc1ef'), signature.issuerFingerprints.join(', ')],
    [() => t('signature.ui.verification.key.fingerprint.603ea8'), signature.verificationKeyFingerprint],
    [() => t('signature.ui.verification.key.id.5513a9'), signature.verificationKeyId],
    [() => t('signature.ui.verification.note.a5d1f9'), signature.verificationError]
  ])
  return item
}


return { appendDefinitionList, statusBadge, renderSigner, renderCertificate, renderTimestamp, renderOpenPgpKey, renderOpenPgpSignature }
}

export default async function renderSignature(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.i18n || context?.options)
  const createElement = t.element
  const formatBytes = t.formatBytes
  const { appendDefinitionList, statusBadge, renderSigner, renderCertificate, renderTimestamp, renderOpenPgpKey, renderOpenPgpSignature } = createSignatureUi(t)
  const documentRef = target.ownerDocument
  const options = context?.options?.signature
  const filename = context?.filename || `signature.${type || 'p7m'}`
  const requestedMaxContainer =
    typeof options?.maxContainerSize === 'number' &&
    Number.isSafeInteger(options.maxContainerSize) &&
    options.maxContainerSize > 0
      ? options.maxContainerSize
      : DEFAULT_MAX_CONTAINER_SIZE
  const containerLimits = normalizeSignatureContainerLimits({
    ...options?.containerLimits,
    maxContainerBytes: requestedMaxContainer
  })
  const maxContainerSize = containerLimits.maxContainerBytes
  const requestedNestedPreviewSize =
    typeof options?.maxNestedPreviewSize === 'number' &&
    Number.isSafeInteger(options.maxNestedPreviewSize) &&
    options.maxNestedPreviewSize > 0
      ? options.maxNestedPreviewSize
      : DEFAULT_MAX_NESTED_PREVIEW_SIZE
  const maxNestedPreviewSize = Math.min(requestedNestedPreviewSize, containerLimits.maxEntryBytes)
  if (buffer.byteLength > maxContainerSize) {
    throw new Error(
      `The cryptographic container (${formatBytes(buffer.byteLength)}) exceeds the ${formatBytes(maxContainerSize)} parsing limit.`
    )
  }

  const style = createElement(documentRef, 'style')
  style.textContent = signatureStyle + signatureDetailsPanelStyle
  const root = createElement(documentRef, 'section', 'signature-shell')
  root.dataset.viewerDensity = normalizeFileViewerUiDensity(context?.options?.ui?.density)
  target.replaceChildren(style, root)

  let originalContent = await readConfiguredOriginal(options, maxNestedPreviewSize)
  let originalFilename = options?.originalFilename
  let openPgpPublicKeys = await readConfiguredOpenPgpKeys(
    options,
    Math.min(maxNestedPreviewSize, 8 * 1024 * 1024)
  )
  let jwsVerificationKeys = [...(options?.jwsVerificationKeys || [])]
  let openPgpClient: OpenPgpWorkerClientType | undefined
  let containerClient: SignatureContainerWorkerClient | undefined
  let nestedRendered: FileViewerRenderedInstance | undefined
  let disposed = false
  let renderSequence = 0
  const panelState = normalizeSignatureDetailsPanelOptions(options?.detailsPanel)
  let detailsPanel: ReturnType<typeof createSignatureDetailsPanel> | undefined
  const replaceRoot = (...children: Node[]) => {
    detailsPanel?.dispose()
    detailsPanel = undefined
    t.release(root)
    root.replaceChildren(...children)
  }
  const attachDetailsPanel = (
    header: HTMLElement,
    sidebar: HTMLElement,
    main: HTMLElement,
    checks: readonly (boolean | undefined)[]
  ) => {
    detailsPanel?.dispose()
    detailsPanel = createSignatureDetailsPanel({
      shell: root,
      header,
      sidebar,
      main,
      state: panelState,
      options: context?.options,
      i18n: context?.i18n,
      checks,
      onExpandedChange: (expanded) => {
        panelState.expanded = expanded
      }
    })
  }

  const reportNestedCleanupFailure = () => {
    try {
      context?.options?.onDiagnostic?.({
        code: 'signature-stale-nested-dispose-failed',
        level: 'warning',
        message: 'A nested preview could not be disposed.'
      })
    } catch {
      /* A host diagnostic callback cannot revive a disposed signature. */
    }
  }
  const clearNested = async () => {
    // Release ownership before awaiting: another selection must not dispose the
    // same child or clear a newer child when this asynchronous disposal finishes.
    const rendered = nestedRendered
    nestedRendered = undefined
    try {
      await disposeFileViewerRendered(rendered)
    } catch (error) {
      reportNestedCleanupFailure()
      throw error
    }
  }

  // Only the latest live selection owns a late nested result.
  const acceptNested = async (
    rendered: FileViewerRenderedInstance | undefined,
    sequence: number
  ) => {
    if (!disposed && sequence === renderSequence) {
      nestedRendered = rendered
      return
    }
    try {
      await disposeFileViewerRendered(rendered)
    } catch {
      reportNestedCleanupFailure()
    }
  }

  const renderInspection = async () => {
    const sequence = ++renderSequence
    detailsPanel?.dispose()
    detailsPanel = undefined
    try {
      await clearNested()
      if (disposed || sequence !== renderSequence) return
      replaceRoot(createElement(documentRef, 'div', 'signature-loading'))
      const loading = root.firstElementChild as HTMLElement
      loading.append(
        createElement(documentRef, 'span', 'signature-spinner'),
        createElement(
          documentRef,
          'span',
          undefined,
          () => t('signature.ui.inspecting.signature.and.timestamp.structures.locally.7ce0cc')
        )
      )

      const sourceBytes = new Uint8Array(buffer)
      const extension = getFilenameExtension(filename) || (type || '').toLowerCase()
      if (['asics', 'scs', 'asice', 'sce'].includes(extension)) {
        containerClient ||= new SignatureContainerWorkerClient(
          options?.workerFactory ? () => options.workerFactory!('container') : undefined
        )
        const inspection = await containerClient.inspectAsic(buffer, containerLimits)
        if (disposed || sequence !== renderSequence) return

        const panelChecks: Array<boolean | undefined> = []
        const signatureResults: Array<{
          name: string
          result: () => string
          document?: string
        }> = []
        for (const member of inspection.signatures) {
          let result = () => t('signature.ui.parsed.metadata.only.f0ba09')
          let document: string | undefined
          try {
            if (member.kind === 'cades' && member.data) {
              const candidates = member.referencedDocuments.length
                ? inspection.documents.filter((candidate) =>
                    member.referencedDocuments.includes(candidate.name)
                  )
                : inspection.documents.length === 1
                  ? inspection.documents
                  : []
              let cms = await inspectSignatureContainer(member.data, {
                sourceFilename: member.name
              })
              if (cms.detached && candidates.length) {
                for (const candidate of candidates.slice(0, 16)) {
                  if (!candidate.data) continue
                  const checked = await inspectSignatureContainer(member.data, {
                    sourceFilename: member.name,
                    originalContent: candidate.data
                  })
                  if (
                    checked.signers.some(
                      (signer) =>
                        signer.digestMatches === true && signer.cryptographicSignatureValid === true
                    )
                  ) {
                    cms = checked
                    document = candidate.name
                    break
                  }
                  cms = checked
                }
              }
              panelChecks.push(
                ...cms.signers.flatMap((signer) => [
                  signer.cryptographicSignatureValid,
                  signer.digestMatches
                ])
              )
              const checked = cms.signers.filter(
                (signer) => signer.cryptographicSignatureValid !== undefined
              )
              result = () => checked.length ? checked.every((signer) => signer.cryptographicSignatureValid === true) ? t('signature.ui.cryptographic.signature.valid.93aead') : t('signature.ui.cryptographic.signature.invalid.b99f60') : cms.detached ? t('signature.ui.original.document.mapping.required.5578a3') : t('signature.ui.signature.not.checked.98ef0a')
            } else if (member.kind === 'timestamp' && member.data) {
              const timestamp = await inspectSignatureContainer(member.data, {
                sourceFilename: member.name
              })
              panelChecks.push(
                ...timestamp.signers.map((signer) => signer.cryptographicSignatureValid)
              )
              result = () => timestamp.timestamp ? t('signature.ui.timestamp.structure.parsed.b32961') : timestamp.detectedFormat
            } else if (member.kind === 'evidence-record' && member.data) {
              const evidence = await inspectEvidenceRecord(member.data)
              panelChecks.push(
                evidence.originalEvidenceMatches,
                ...evidence.archiveTimestamps.flatMap((item) => [
                  item.timestampSignaturesValid,
                  item.evidenceDigestMatchesOriginal
                ])
              )
              result = () => t('signature.ui.archive.timestamp.s.parsed.f400f9', { p0: evidence.archiveTimestamps.length })
            } else if (member.kind === 'jws' && member.data) {
              const jws = await inspectJws(member.data, {
                verificationKeys: jwsVerificationKeys,
                limits: containerLimits
              })
              panelChecks.push(...jws.signatures.map((item) => item.cryptographicValid))
              result = () => jws.signatures.some((item) => item.cryptographicValid === false)
                ? t('signature.ui.jws.signature.invalid.d3137a')
                : jws.signatures.length &&
                    jws.signatures.every((item) => item.cryptographicValid === true)
                  ? t('signature.ui.jws.signatures.valid.45d54e')
                  : t('signature.ui.jws.parsed.verification.key.or.payload.fd738a')
            } else if (member.kind === 'xades-or-xml') {
              panelChecks.push(undefined)
              result = () => member.referencedDocuments.length
                ? t('signature.ui.xml.signature.metadata.references.document.s.50933a', { p0: member.referencedDocuments.length })
                : t('signature.ui.xml.signature.metadata.parsed.canonicalization.not.b71f6e')
            }
          } catch (error) {
            panelChecks.push(false)
            result = () => t('signature.ui.inspection.failed.1fb1d0', { p0: error instanceof Error ? error.message : String(error) })
          }
          signatureResults.push({ name: member.name, result, document })
        }

        replaceRoot()
        const header = createElement(documentRef, 'header', 'signature-header')
        const title = createElement(documentRef, 'div', 'signature-title')
        title.append(
          createElement(documentRef, 'small', undefined, () => t('signature.ui.associated.signature.container.0599c5')),
          createElement(documentRef, 'h2', undefined, filename),
          createElement(documentRef, 'p', undefined, `${inspection.kind} · ${inspection.mediaType}`)
        )
        header.append(
          title,
          createElement(documentRef, 'span', 'signature-phase', () => t('signature.ui.opt.in.bounded.zip.worker.6a02c6'))
        )
        const content = createElement(documentRef, 'div', 'signature-content')
        const sidebar = createElement(documentRef, 'aside', 'signature-sidebar')
        const main = createElement(documentRef, 'main', 'signature-main')
        const summary = createElement(documentRef, 'section', 'signature-card')
        summary.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.asic.package.edd529')))
        appendDefinitionList(documentRef, summary, [
          [() => t('signature.ui.type.3deb74'), inspection.kind],
          [() => t('signature.ui.source.size.b608b7'), formatBytes(inspection.sourceSize)],
          [() => t('eda.ui.header.entries'), inspection.entryCount],
          [() => t('signature.ui.inflated.total.e12e1a'), formatBytes(inspection.totalUncompressedBytes)],
          [() => t('signature.ui.documents.687c82'), inspection.documents.length],
          [() => t('signature.ui.signature.evidence.members.cb5f36'), inspection.signatures.length]
        ])
        sidebar.append(summary)
        const boundaries = createElement(documentRef, 'section', 'signature-card')
        boundaries.append(
          createElement(documentRef, 'h3', undefined, () => t('signature.ui.security.and.validation.boundaries.de6c50'))
        )
        inspection.warnings.forEach((warning) =>
          boundaries.append(createElement(documentRef, 'div', 'signature-warning', warning))
        )
        sidebar.append(boundaries)

        if (signatureResults.length) {
          const signatureCard = createElement(documentRef, 'section', 'signature-card')
          signatureCard.append(
            createElement(documentRef, 'h3', undefined, () => t('signature.ui.signatures.and.evidence.10d85e'))
          )
          signatureResults.forEach((item) => {
            const row = createElement(documentRef, 'article', 'signature-item')
            row.append(createElement(documentRef, 'strong', undefined, item.name))
            appendDefinitionList(documentRef, row, [
              [() => t('signature.ui.result.5faa59'), item.result],
              [() => t('signature.ui.matched.document.0f3134'), item.document]
            ])
            signatureCard.append(row)
          })
          main.append(signatureCard)
        }

        const previewCard = createElement(
          documentRef,
          'section',
          'signature-card signature-preview'
        )
        const previewHead = createElement(documentRef, 'div', 'signature-preview-head')
        const previewTitle = createElement(
          documentRef,
          'strong',
          undefined,
          () => t('signature.ui.contained.document.preview.610ff8')
        )
        const previewStatus = createElement(documentRef, 'span', 'signature-status')
        const previewTarget = createElement(
          documentRef,
          'div',
          'signature-preview-target'
        ) as HTMLDivElement
        previewHead.append(previewTitle, previewStatus)
        previewCard.append(previewHead, previewTarget)
        const chooser = createElement(documentRef, 'section', 'signature-card')
        chooser.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.contained.documents.1a4aed')))
        const chooserList = createElement(documentRef, 'div', 'signature-status-list')
        chooser.append(chooserList)
        sidebar.append(chooser)
        main.append(previewCard)
        content.append(sidebar, main)
        root.append(header, content)
        attachDetailsPanel(header, sidebar, main, panelChecks)

        const openDocument = async (member: AsicInspection['documents'][number]) => {
          const selection = ++renderSequence
          detailsPanel?.cancelReading()
          await clearNested()
          if (disposed || selection !== renderSequence) return
          t.release(previewTarget)
          previewTarget.replaceChildren()
          t.bind(previewTitle, node => { node.textContent = t('signature.ui.contained.document.d10a62', { p0: member.name }); }, 'textContent')
          t.bind(previewStatus, node => { node.textContent = formatBytes(member.uncompressedSize) })
          if (!member.data || member.data.byteLength > maxNestedPreviewSize) {
            previewTarget.append(
              createElement(
                documentRef,
                'div',
                'signature-preview-empty',
                () => t('signature.ui.this.contained.document.exceeds.the.configured.c1719c')
              )
            )
            return
          }
          const nestedExtension =
            getFilenameExtension(member.name) || sniffNestedExtension(member.data)
          if (!context?.renderNestedBuffer || nestedExtension === 'bin') {
            previewTarget.append(
              createElement(
                documentRef,
                'div',
                'signature-preview-empty',
                () => t('signature.ui.no.compatible.nested.renderer.is.installed.2c9897')
              )
            )
            return
          }
          await acceptNested(
            await context.renderNestedBuffer(
              member.data.buffer.slice(
                member.data.byteOffset,
                member.data.byteOffset + member.data.byteLength
              ) as ArrayBuffer,
              nestedExtension,
              previewTarget,
              {
                ...context,
                filename: member.name,
                url: undefined,
                streamUrl: undefined
              }
            ),
            selection
          )
        }
        const selectDocument = (member: AsicInspection['documents'][number]) => {
          const pending = openDocument(member)
          const selection = renderSequence
          void pending.catch((error) => {
            if (disposed || selection !== renderSequence) return
            t.release(previewTarget)
            previewTarget.replaceChildren(
              createElement(
                documentRef,
                'div',
                'signature-error',
                error instanceof Error ? error.message : String(error)
              )
            )
          })
        }
        inspection.documents.forEach((member, index) => {
          const button = createElement(
            documentRef,
            'button',
            'signature-status',
            member.name
          ) as HTMLButtonElement
          button.type = 'button'
          button.addEventListener('click', () => {
            selectDocument(member)
          })
          chooserList.append(button)
          if (index === 0) selectDocument(member)
        })
        if (!inspection.documents.length) {
          previewTarget.append(
            createElement(
              documentRef,
              'div',
              'signature-preview-empty',
              () => t('signature.ui.no.contained.document.was.found.56328c')
            )
          )
        }
        return
      }

      if (extension === 'ers') {
        const inspection: EvidenceRecordInspection = await inspectEvidenceRecord(buffer, {
          originalContent
        })
        if (disposed || sequence !== renderSequence) return
        replaceRoot()
        const header = createElement(documentRef, 'header', 'signature-header')
        const title = createElement(documentRef, 'div', 'signature-title')
        title.append(
          createElement(documentRef, 'small', undefined, () => t('signature.ui.archival.evidence.17b2e6')),
          createElement(documentRef, 'h2', undefined, filename),
          createElement(documentRef, 'p', undefined, inspection.detectedFormat)
        )
        header.append(
          title,
          createElement(documentRef, 'span', 'signature-phase', () => t('signature.ui.rfc.4998.structural.bounded.41444f'))
        )
        const content = createElement(documentRef, 'div', 'signature-content')
        const sidebar = createElement(documentRef, 'aside', 'signature-sidebar')
        const main = createElement(documentRef, 'main', 'signature-main')
        const summary = createElement(documentRef, 'section', 'signature-card')
        summary.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.evidence.record.ad9cdf')))
        appendDefinitionList(documentRef, summary, [
          [() => t('design.designResources.version'), inspection.version],
          [() => t('signature.ui.digest.algorithms.c099a5'), inspection.digestAlgorithms.join(', ')],
          [() => t('signature.ui.archive.timestamp.chains.0bb476'), inspection.archiveTimestampChains],
          [() => t('signature.ui.archive.timestamps.548a13'), inspection.archiveTimestamps.length],
          [() => t('signature.ui.original.supplied.581ca6'), () => inspection.originalContentSupplied ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
          [
            () => t('signature.ui.first.evidence.digest.97980c'),
            () => inspection.originalEvidenceMatches === undefined ? t('signature.ui.not.checked.22705e') : inspection.originalEvidenceMatches ? t('signature.ui.matches.ee2dbd') : t('signature.ui.does.not.match.3c0ba3')
          ],
          [() => t('signature.ui.full.archival.validation.b7f535'), () => t('signature.ui.not.performed.0c6a89')]
        ])
        sidebar.append(summary)
        const boundaries = createElement(documentRef, 'section', 'signature-card')
        boundaries.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.validation.boundaries.f9e13b')))
        inspection.warnings.forEach((warning) =>
          boundaries.append(createElement(documentRef, 'div', 'signature-warning', warning))
        )
        sidebar.append(boundaries)
        const originalCard = createElement(documentRef, 'section', 'signature-card')
        originalCard.append(
          createElement(documentRef, 'h3', undefined, () => t('signature.ui.protected.original.content.3ababd'))
        )
        const input = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement
        input.type = 'file'
        t.bind(input, node => node.setAttribute('aria-label', t('signature.ui.choose.evidencerecord.protected.content.ed2331')), 'aria-label')
        input.addEventListener('change', () => {
          const file = input.files?.[0]
          if (!file) return
          void readBoundedBlob(file, maxNestedPreviewSize, 'EvidenceRecord protected content').then(
            (next) => {
              originalContent = next
              originalFilename = file.name
              return renderInspection()
            }
          )
        })
        originalCard.append(input)
        sidebar.append(originalCard)
        const timestamps = createElement(documentRef, 'section', 'signature-card')
        timestamps.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.archive.timestamps.548a13')))
        inspection.archiveTimestamps.forEach((timestamp) => {
          const item = createElement(documentRef, 'article', 'signature-item')
          item.append(
            createElement(
              documentRef,
              'strong',
              undefined,
              () => t('signature.ui.chain.timestamp.838ded', { p0: timestamp.chainIndex + 1, p1: timestamp.index + 1 })
            )
          )
          appendDefinitionList(documentRef, item, [
            [() => t('signature.ui.digest.algorithm.5b4cb2'), timestamp.digestAlgorithm],
            [() => t('signature.ui.reduced.hash.tree.nodes.a0f158'), timestamp.reducedHashTreeNodes],
            [() => t('signature.ui.generation.time.8a9b2b'), timestamp.timestamp?.generationTime],
            [() => t('signature.ui.timestamp.signatures.b20626'), timestamp.timestampSignerCount],
            [
              () => t('signature.ui.timestamp.signature.check.0ddbeb'),
              () => timestamp.timestampSignaturesValid === undefined ? t('signature.ui.not.checked.22705e') : timestamp.timestampSignaturesValid ? t('signature.ui.valid.a4aefa') : t('signature.ui.invalid.54e07a')
            ],
            [
              () => t('signature.ui.evidence.digest.vs.original.357896'),
              () => timestamp.evidenceDigestMatchesOriginal === undefined ? t('signature.ui.not.checked.22705e') : timestamp.evidenceDigestMatchesOriginal ? t('signature.ui.matches.ee2dbd') : t('signature.ui.does.not.match.3c0ba3')
            ]
          ])
          timestamps.append(item)
        })
        main.append(timestamps)
        content.append(sidebar, main)
        root.append(header, content)
        attachDetailsPanel(header, sidebar, main, [
          inspection.originalEvidenceMatches,
          ...inspection.archiveTimestamps.flatMap((item) => [
            item.timestampSignaturesValid,
            item.evidenceDigestMatchesOriginal
          ])
        ])
        return
      }

      if (isProbablyJws(sourceBytes, filename)) {
        const inspection: JwsInspection = await inspectJws(buffer, {
          detachedPayload: originalContent,
          verificationKeys: jwsVerificationKeys,
          limits: containerLimits
        })
        if (disposed || sequence !== renderSequence) return
        replaceRoot()
        const header = createElement(documentRef, 'header', 'signature-header')
        const title = createElement(documentRef, 'div', 'signature-title')
        title.append(
          createElement(documentRef, 'small', undefined, () => t('signature.ui.json.web.signature.8d3b8d')),
          createElement(documentRef, 'h2', undefined, filename),
          createElement(
            documentRef,
            'p',
            undefined,
            () => t('signature.ui.signature.s.5167b7', { p0: inspection.serialization, p1: inspection.signatures.length })
          )
        )
        header.append(
          title,
          createElement(documentRef, 'span', 'signature-phase', () => t('signature.ui.rfc.7515.public.key.verify.b4d206'))
        )
        const content = createElement(documentRef, 'div', 'signature-content')
        const sidebar = createElement(documentRef, 'aside', 'signature-sidebar')
        const main = createElement(documentRef, 'main', 'signature-main')
        const summary = createElement(documentRef, 'section', 'signature-card')
        summary.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.jws.summary.5cd34c')))
        appendDefinitionList(documentRef, summary, [
          [() => t('signature.ui.serialization.892823'), inspection.serialization],
          [() => t('signature.ui.detached.payload.d2448e'), () => inspection.detached ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
          [() => t('signature.ui.base64url.payload.5a6cdf'), () => inspection.payloadEncoded ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
          [
            () => t('signature.ui.payload.size.6e03ab'),
            () => inspection.payload ? formatBytes(inspection.payload.byteLength) : t('signature.ui.not.supplied.25fa1c')
          ],
          [() => t('signature.ui.signatures.e4cf03'), inspection.signatures.length],
          [() => t('signature.ui.verification.keys.e72433'), jwsVerificationKeys.length]
        ])
        sidebar.append(summary)
        const boundaries = createElement(documentRef, 'section', 'signature-card')
        boundaries.append(
          createElement(documentRef, 'h3', undefined, () => t('signature.ui.security.and.trust.boundary.0fc870'))
        )
        inspection.warnings.forEach((warning) =>
          boundaries.append(createElement(documentRef, 'div', 'signature-warning', warning))
        )
        sidebar.append(boundaries)
        if (inspection.detached) {
          const originalCard = createElement(documentRef, 'section', 'signature-card')
          originalCard.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.detached.payload.d2448e')))
          const input = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement
          input.type = 'file'
          input.addEventListener('change', () => {
            const file = input.files?.[0]
            if (!file) return
            void readBoundedBlob(file, maxNestedPreviewSize, 'JWS detached payload').then(
              (next) => {
                originalContent = next
                originalFilename = file.name
                return renderInspection()
              }
            )
          })
          originalCard.append(input)
          sidebar.append(originalCard)
        }
        const keyCard = createElement(documentRef, 'section', 'signature-card')
        keyCard.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.public.jwk.verification.keys.40f129')))
        const keyInput = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement
        keyInput.type = 'file'
        keyInput.multiple = true
        keyInput.accept = '.jwk,.json,application/json'
        keyInput.addEventListener('change', () => {
          const files = Array.from(keyInput.files || []).slice(0, 64)
          void Promise.all(
            files.map((file) => readBoundedBlob(file, 1024 * 1024, 'JWK file'))
          ).then((values) => {
            const keys: JwsVerificationKey[] = []
            for (const value of values) {
              const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(value)) as
                JsonWebKey | { keys?: JsonWebKey[] }
              const candidates =
                'keys' in parsed && Array.isArray(parsed.keys)
                  ? parsed.keys
                  : [parsed as JsonWebKey]
              for (const key of candidates) {
                if (!key || typeof key !== 'object' || 'd' in key || 'k' in key)
                  throw new Error('Only public asymmetric JWKs are accepted.')
                keys.push({
                  key,
                  kid: (key as JsonWebKey & { kid?: string }).kid
                })
              }
            }
            jwsVerificationKeys = keys.slice(0, 64)
            return renderInspection()
          })
        })
        keyCard.append(keyInput)
        sidebar.append(keyCard)
        const signatures = createElement(documentRef, 'section', 'signature-card')
        signatures.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.signatures.e4cf03')))
        inspection.signatures.forEach((signature) => {
          const item = createElement(documentRef, 'article', 'signature-item')
          item.append(
            createElement(documentRef, 'strong', undefined, () => t('signature.ui.signature.9556e5', { p0: signature.index + 1 }))
          )
          const status = createElement(documentRef, 'div', 'signature-status-list')
          status.append(
            statusBadge(
              documentRef,
              () => t('signature.ui.cryptographic.signature.c5cee8'),
              signature.cryptographicValid,
              () => inspection.detached && !inspection.payload ? t('signature.ui.payload.required.a32535') : t('signature.ui.public.key.required.4cdfc5')
            )
          )
          item.append(status)
          appendDefinitionList(documentRef, item, [
            [() => t('signature.ui.algorithm.02f024'), signature.algorithm],
            [() => t('signature.ui.key.id.4ade01'), signature.keyId],
            [() => t('signature.ui.signature.bytes.8d4134'), signature.signatureBytes],
            [() => t('signature.ui.jades.related.properties.24cc16'), signature.jadesProperties.join(', ')],
            [() => t('signature.ui.verification.note.a5d1f9'), signature.verificationError],
            [() => t('signature.ui.protected.header.bab312'), JSON.stringify(signature.protectedHeader)],
            [() => t('signature.ui.unprotected.header.43bbaf'), JSON.stringify(signature.unprotectedHeader)]
          ])
          signatures.append(item)
        })
        main.append(signatures)
        const previewCard = createElement(
          documentRef,
          'section',
          'signature-card signature-preview'
        )
        const previewTarget = createElement(
          documentRef,
          'div',
          'signature-preview-target'
        ) as HTMLDivElement
        const sniffedPayloadExtension = inspection.payload
          ? sniffNestedExtension(inspection.payload)
          : 'bin'
        const payloadExtension = originalFilename
          ? getFilenameExtension(originalFilename) || sniffedPayloadExtension
          : sniffedPayloadExtension
        const payloadName = originalFilename || `jws-payload.${payloadExtension}`
        const previewHead = createElement(documentRef, 'div', 'signature-preview-head')
        previewHead.append(
          createElement(documentRef, 'strong', undefined, () => t('signature.ui.payload.preview.21beba', { p0: payloadName })),
          createElement(
            documentRef,
            'span',
            'signature-status',
            () => inspection.payload ? formatBytes(inspection.payload.byteLength) : t('signature.ui.payload.unavailable.ffcf3b')
          )
        )
        previewCard.append(previewHead, previewTarget)
        main.append(previewCard)
        content.append(sidebar, main)
        root.append(header, content)
        attachDetailsPanel(
          header,
          sidebar,
          main,
          inspection.signatures.map((item) => item.cryptographicValid)
        )
        if (
          inspection.payload &&
          inspection.payload.byteLength <= maxNestedPreviewSize &&
          context?.renderNestedBuffer &&
          payloadExtension !== 'bin'
        ) {
          await acceptNested(
            await context.renderNestedBuffer(
              inspection.payload.buffer.slice(
                inspection.payload.byteOffset,
                inspection.payload.byteOffset + inspection.payload.byteLength
              ) as ArrayBuffer,
              payloadExtension,
              previewTarget,
              {
                ...context,
                filename: payloadName,
                url: undefined,
                streamUrl: undefined
              }
            ),
            sequence
          )
        } else {
          previewTarget.append(
            createElement(
              documentRef,
              'div',
              'signature-preview-empty',
              () => inspection.payload ? t('signature.ui.no.compatible.nested.renderer.is.installed.3d7e85') : t('signature.ui.supply.the.detached.payload.to.preview.b0d906')
            )
          )
        }
        return
      }

      if (isProbablyOpenPgp(sourceBytes, filename, type)) {
        const { OpenPgpWorkerClient } = await import('./openpgp/client.js')
        openPgpClient ||= new OpenPgpWorkerClient(
          options?.workerFactory ? () => options.workerFactory!('openpgp') : undefined
        )
        const inspection = await openPgpClient.inspect(
          buffer,
          options?.openPgpLimits,
          openPgpPublicKeys
        )
        let verification: OpenPgpVerificationResult | undefined
        if (
          inspection.classification === 'detached-signature' &&
          originalContent &&
          openPgpPublicKeys.length
        ) {
          verification = await openPgpClient.verifyDetached(
            originalContent,
            buffer,
            openPgpPublicKeys,
            options?.openPgpLimits
          )
        }
        if (disposed || sequence !== renderSequence) return

        replaceRoot()
        const header = createElement(documentRef, 'header', 'signature-header')
        const title = createElement(documentRef, 'div', 'signature-title')
        title.append(
          createElement(documentRef, 'small', undefined, () => t('signature.ui.openpgp.rpgp.wasm.6cb1b1')),
          createElement(documentRef, 'h2', undefined, filename),
          createElement(documentRef, 'p', undefined, inspection.classification)
        )
        header.append(
          title,
          createElement(documentRef, 'span', 'signature-phase', () => t('signature.ui.optional.lazy.worker.wasm.986d54'))
        )

        const content = createElement(documentRef, 'div', 'signature-content')
        const sidebar = createElement(documentRef, 'aside', 'signature-sidebar')
        const main = createElement(documentRef, 'main', 'signature-main')

        const summary = createElement(documentRef, 'section', 'signature-card')
        summary.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.openpgp.summary.f9e7d1')))
        appendDefinitionList(documentRef, summary, [
          [() => t('signature.ui.classification.94c2a3'), inspection.classification],
          [() => t('signature.ui.ascii.armored.8275d0'), () => inspection.armored ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
          [() => t('signature.ui.armor.type.d90919'), inspection.armorType],
          [() => t('signature.ui.encrypted.bde2fb'), () => inspection.encrypted ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
          [
            () => t('signature.ui.integrity.protected.781297'),
            () => inspection.integrityProtected === undefined ? undefined : inspection.integrityProtected ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')
          ],
          [() => t('signature.ui.symmetric.algorithm.b57fe8'), inspection.symmetricAlgorithm],
          [() => t('signature.ui.aead.mode.0cdcf9'), inspection.aeadMode],
          [() => t('signature.ui.recipients.78cbf8'), inspection.recipients.join(', ')],
          [() => t('signature.ui.compressed.1238ea'), () => inspection.compressed ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
          [() => t('signature.ui.packet.count.308f5c'), inspection.packetCount],
          [() => t('signature.ui.packet.types.2a59ca'), inspection.packetTypes.join(', ')],
          [() => t('signature.ui.keys.e5651c'), inspection.keys.length],
          [() => t('signature.ui.signatures.e4cf03'), inspection.signatures.length]
        ])
        summary.append(
          createElement(
            documentRef,
            'div',
            'signature-openpgp-note',
            () => t('signature.ui.openpgp.parsing.runs.browser.local.inside.1623a8')
          )
        )
        sidebar.append(summary)

        const warnings = createElement(documentRef, 'section', 'signature-card')
        warnings.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.security.boundaries.19ff5f')))
        ;[
          ...inspection.warnings,
          'Parsing does not imply signature verification, key trust, identity trust, or legal validity.',
          'Private-key decryption, signing, key generation and message decryption are intentionally excluded from this inspection boundary.'
        ].forEach((warning) =>
          warnings.append(createElement(documentRef, 'div', 'signature-warning', warning))
        )
        sidebar.append(warnings)

        if (inspection.classification === 'detached-signature') {
          const verifyCard = createElement(documentRef, 'section', 'signature-card')
          verifyCard.append(
            createElement(documentRef, 'h3', undefined, () => t('signature.ui.detached.signature.verification.188470'))
          )
          const statusList = createElement(documentRef, 'div', 'signature-status-list')
          statusList.append(
            statusBadge(
              documentRef,
              () => t('signature.ui.cryptographic.signature.c5cee8'),
              verification?.valid,
              () => originalContent ? openPgpPublicKeys.length ? t('signature.ui.not.verified.c75397') : t('signature.ui.public.key.required.4cdfc5') : t('signature.ui.original.required.95cf87')
            )
          )
          verifyCard.append(statusList)
          appendDefinitionList(documentRef, verifyCard, [
            [() => t('signature.ui.result.5faa59'), verification?.status],
            [() => t('signature.ui.key.fingerprint.aaf1a9'), verification?.keyFingerprint],
            [() => t('signature.ui.key.id.4ade01'), verification?.keyId],
            [() => t('signature.ui.verification.note.a5d1f9'), verification?.error]
          ])

          const originalBox = createElement(documentRef, 'div', 'signature-original')
          const originalInput = createElement(
            documentRef,
            'input',
            'signature-file'
          ) as HTMLInputElement
          originalInput.type = 'file'
          t.bind(originalInput, node => node.setAttribute('aria-label', t('signature.ui.choose.original.openpgp.signed.content.25903f')), 'aria-label')
          const originalInputState = createElement(
            documentRef,
            'div',
            'signature-original-state',
            () => originalContent ? `${originalFilename || 'Host-provided original'} · ${formatBytes(originalContent.byteLength)}` : t('signature.ui.original.content.is.required.4e89df')
          )
          originalInput.addEventListener('change', () => {
            const file = originalInput.files?.[0]
            if (!file) return
            void readBoundedBlob(file, maxNestedPreviewSize, 'OpenPGP original content')
              .then((next) => {
                originalContent = next
                originalFilename = file.name
                return renderInspection()
              })
              .catch((error) => {
                originalInputState.textContent =
                  error instanceof Error ? error.message : String(error)
              })
          })
          originalBox.append(originalInput, originalInputState)

          const keyBox = createElement(documentRef, 'div', 'signature-key-input')
          const keyInput = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement
          keyInput.type = 'file'
          keyInput.multiple = true
          t.bind(keyInput, node => node.setAttribute('aria-label', t('signature.ui.choose.openpgp.public.verification.keys.1b4faf')), 'aria-label')
          const keyInputState = createElement(
            documentRef,
            'div',
            'signature-original-state',
            () => openPgpPublicKeys.length ? t('signature.ui.verification.key.file.s.supplied.a5f723', { p0: openPgpPublicKeys.length }) : t('signature.ui.supply.one.or.more.public.keys.cfb238')
          )
          keyInput.addEventListener('change', () => {
            const files = Array.from(keyInput.files || []).slice(0, 64)
            void Promise.all(
              files.map((file) => readBoundedBlob(file, 8 * 1024 * 1024, 'OpenPGP public key'))
            )
              .then((keys) => {
                const aggregate = keys.reduce((sum, value) => sum + value.byteLength, 0)
                if (aggregate > 32 * 1024 * 1024)
                  throw new Error('OpenPGP public keys exceed the 32 MiB aggregate boundary.')
                openPgpPublicKeys = keys
                return renderInspection()
              })
              .catch((error) => {
                keyInputState.textContent = error instanceof Error ? error.message : String(error)
              })
          })
          keyBox.append(keyInput, keyInputState)
          verifyCard.append(originalBox, keyBox)
          sidebar.append(verifyCard)
        }

        if (inspection.keys.length) {
          const keysCard = createElement(documentRef, 'section', 'signature-card')
          keysCard.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.key.metadata.13db5d')))
          inspection.keys.forEach((key) => keysCard.append(renderOpenPgpKey(documentRef, key)))
          main.append(keysCard)
        }

        if (inspection.signatures.length) {
          const signaturesCard = createElement(documentRef, 'section', 'signature-card')
          signaturesCard.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.signature.metadata.a35935')))
          inspection.signatures.forEach((signature, index) =>
            signaturesCard.append(renderOpenPgpSignature(documentRef, signature, index))
          )
          main.append(signaturesCard)
        }

        const previewCard = createElement(
          documentRef,
          'section',
          'signature-card signature-preview'
        )
        const previewHead = createElement(documentRef, 'div', 'signature-preview-head')
        const previewTarget = createElement(
          documentRef,
          'div',
          'signature-preview-target'
        ) as HTMLDivElement
        const literal = inspection.literalData
        const literalBytes = literal?.data
        const literalFilename = literal?.filename || 'openpgp-literal-data.bin'
        const literalExtension =
          getFilenameExtension(literalFilename) ||
          (literalBytes ? sniffNestedExtension(literalBytes) : 'bin')
        previewHead.append(
          createElement(
            documentRef,
            'strong',
            undefined,
            () => t('signature.ui.literal.data.preview.646f29', { p0: literalFilename })
          ),
          createElement(
            documentRef,
            'span',
            'signature-status',
            () => literalBytes ? formatBytes(literalBytes.byteLength) : t('signature.ui.not.extracted.cd7e24')
          )
        )
        previewCard.append(previewHead, previewTarget)
        main.append(previewCard)
        content.append(sidebar, main)
        root.append(header, content)
        attachDetailsPanel(header, sidebar, main, [
          ...inspection.signatures.map((item) => item.cryptographicValid),
          ...(inspection.classification === 'detached-signature' ? [verification?.valid] : [])
        ])
        if (!literalBytes) {
          previewTarget.append(
            createElement(
              documentRef,
              'div',
              'signature-preview-empty',
              () => inspection.encrypted ? t('signature.ui.encrypted.openpgp.data.is.inspection.only.e40345') : inspection.compressed ? t('signature.ui.compressed.openpgp.data.did.not.expose.c7ecf7') : t('signature.ui.no.safely.extractable.literal.data.is.891a41')
            )
          )
        } else if (literalBytes.byteLength > maxNestedPreviewSize) {
          previewTarget.append(
            createElement(
              documentRef,
              'div',
              'signature-preview-empty',
              () => t('signature.ui.extracted.literal.data.exceeds.the.nested.38a726')
            )
          )
        } else if (!context?.renderNestedBuffer || literalExtension === 'bin') {
          previewTarget.append(
            createElement(
              documentRef,
              'div',
              'signature-preview-empty',
              () => t('signature.ui.literal.data.was.extracted.but.no.386863')
            )
          )
        } else {
          await acceptNested(
            await context.renderNestedBuffer(
              literalBytes.buffer.slice(
                literalBytes.byteOffset,
                literalBytes.byteOffset + literalBytes.byteLength
              ) as ArrayBuffer,
              literalExtension,
              previewTarget,
              {
                ...context,
                filename: literalFilename,
                url: undefined,
                streamUrl: undefined
              }
            ),
            sequence
          )
        }

        return
      }

      const inspection = await inspectSignatureContainer(buffer, {
        sourceFilename: filename,
        extensionHint: type,
        originalContent
      })
      if (disposed || sequence !== renderSequence) {
        return
      }
      replaceRoot()
      const header = createElement(documentRef, 'header', 'signature-header')
      const title = createElement(documentRef, 'div', 'signature-title')
      title.append(
        createElement(documentRef, 'small', undefined, () => t('signature.ui.cryptographic.container.5168db')),
        createElement(documentRef, 'h2', undefined, filename),
        createElement(documentRef, 'p', undefined, inspection.detectedFormat)
      )
      header.append(
        title,
        createElement(documentRef, 'span', 'signature-phase', () => t('signature.ui.cms.rfc.3161.rfc.5544.bounded.184403'))
      )

      const content = createElement(documentRef, 'div', 'signature-content')
      const sidebar = createElement(documentRef, 'aside', 'signature-sidebar')
      const main = createElement(documentRef, 'main', 'signature-main')

      const summary = createElement(documentRef, 'section', 'signature-card')
      summary.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.container.summary.bdd0e6')))
      appendDefinitionList(documentRef, summary, [
        [() => t('signature.ui.detected.format.0c8a72'), inspection.detectedFormat],
        [() => t('data.label.size'), formatBytes(inspection.sourceSize)],
        [() => t('signature.ui.cms.content.type.496884'), inspection.contentType],
        [() => t('signature.ui.signed.content.type.c0f982'), inspection.signedContentType],
        [() => t('signature.ui.digest.algorithms.c099a5'), inspection.digestAlgorithms.join(', ')],
        [
          () => t('signature.ui.encapsulated.content.a1dd6f'),
          () => inspection.embeddedContent ? formatBytes(inspection.embeddedContent.byteLength) : t('signature.ui.no.816c52')
        ],
        [() => t('signature.ui.detached.bbbf4e'), () => inspection.detached ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')],
        [() => t('signature.ui.signers.e01e92'), inspection.signers.length],
        [() => t('signature.ui.certificates.b3e4eb'), inspection.certificates.length],
        [() => t('signature.ui.crls.094cb8'), inspection.crlCount]
      ])
      sidebar.append(summary)

      const boundaries = createElement(documentRef, 'section', 'signature-card')
      boundaries.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.validation.boundaries.f9e13b')))
      inspection.warnings.forEach((warning) =>
        boundaries.append(createElement(documentRef, 'div', 'signature-warning', warning))
      )
      sidebar.append(boundaries)

      if (inspection.timestampResponse) {
        const response = createElement(documentRef, 'section', 'signature-card')
        response.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.timestamp.response.da81cf')))
        appendDefinitionList(documentRef, response, [
          [() => t('signature.ui.status.bae7d5'), inspection.timestampResponse.statusLabel],
          [() => t('signature.ui.status.code.fcbb29'), inspection.timestampResponse.status],
          [() => t('signature.ui.status.text.b68390'), inspection.timestampResponse.statusText.join('; ')],
          [() => t('signature.ui.failure.info.6c3ba0'), inspection.timestampResponse.failureInfo]
        ])
        sidebar.append(response)
      }

      if (inspection.timestampedData) {
        const tsd = createElement(documentRef, 'section', 'signature-card')
        tsd.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.rfc.5544.timestampeddata.f1750c')))
        appendDefinitionList(documentRef, tsd, [
          [() => t('signature.ui.data.uri.a46f09'), inspection.timestampedData.dataUri],
          [() => t('signature.ui.filename.a3cbb9'), inspection.timestampedData.filename],
          [() => t('signature.ui.media.type.77e4c3'), inspection.timestampedData.mediaType],
          [
            () => t('signature.ui.metadata.hash.protected.942921'),
            () => inspection.timestampedData?.hashProtected === undefined ? undefined : inspection.timestampedData.hashProtected ? t('signature.ui.yes.5397e0') : t('signature.ui.no.816c52')
          ],
          [() => t('signature.ui.temporal.evidence.entries.46c366'), inspection.timestampedData.temporalEvidenceEntries]
        ])
        sidebar.append(tsd)
      }

      if (
        inspection.requiresOriginalContent ||
        inspection.timestamp?.messageImprint ||
        inspection.kind === 'timestamped-data'
      ) {
        const originalCard = createElement(documentRef, 'section', 'signature-card')
        originalCard.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.original.content.b9d592')))
        const originalBox = createElement(documentRef, 'div', 'signature-original')
        const input = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement
        input.type = 'file'
        t.bind(input, node => node.setAttribute('aria-label', t('signature.ui.choose.original.content.9fefe9')), 'aria-label')
        const originalState = createElement(
          documentRef,
          'div',
          'signature-original-state',
          () => originalContent ? `${originalFilename || 'Host-provided content'} · ${formatBytes(originalContent.byteLength)}` : t('signature.ui.choose.the.original.file.to.compare.050ce0')
        )
        input.addEventListener('change', () => {
          const file = input.files?.[0]
          if (!file) return
          void readBoundedBlob(file, maxNestedPreviewSize, 'Original content')
            .then((nextBuffer) => {
              originalContent = nextBuffer
              originalFilename = file.name
              return renderInspection()
            })
            .catch((error) => {
              originalState.textContent = error instanceof Error ? error.message : String(error)
            })
        })
        originalBox.append(input, originalState)
        originalCard.append(originalBox)
        sidebar.append(originalCard)
      }

      if (inspection.signers.length) {
        const signers = createElement(documentRef, 'section', 'signature-card')
        signers.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.signers.e01e92')))
        inspection.signers.forEach((signer) => signers.append(renderSigner(documentRef, signer)))
        main.append(signers)
      }

      if (inspection.timestamp) {
        main.append(renderTimestamp(documentRef, inspection.timestamp))
      }

      if (inspection.certificates.length) {
        const certificates = createElement(documentRef, 'section', 'signature-card')
        certificates.append(createElement(documentRef, 'h3', undefined, () => t('signature.ui.included.certificates.5aa167')))
        inspection.certificates.forEach((certificate) =>
          certificates.append(renderCertificate(documentRef, certificate))
        )
        main.append(certificates)
      }

      const previewCard = createElement(documentRef, 'section', 'signature-card signature-preview')
      const previewHead = createElement(documentRef, 'div', 'signature-preview-head')
      const previewTarget = createElement(
        documentRef,
        'div',
        'signature-preview-target'
      ) as HTMLDivElement
      const timestampContainer =
        inspection.kind === 'timestamp-request' ||
        inspection.kind === 'timestamp-response' ||
        inspection.kind === 'timestamp-token' ||
        inspection.kind === 'timestamped-data'
      const previewUsesOriginal = Boolean(
        originalContent && (inspection.detached || timestampContainer)
      )
      const previewSource = previewUsesOriginal ? originalContent : inspection.embeddedContent
      const previewBytes = previewSource
        ? previewSource instanceof Uint8Array
          ? previewSource
          : new Uint8Array(previewSource)
        : undefined
      const identity =
        inspection.kind === 'timestamped-data' &&
        inspection.timestampedData?.filename &&
        !previewUsesOriginal
          ? {
              filename: inspection.timestampedData.filename,
              extension:
                getFilenameExtension(inspection.timestampedData.filename) ||
                sniffNestedExtension(previewBytes || new Uint8Array())
            }
          : resolveNestedIdentity(inspection, filename, originalFilename, previewUsesOriginal)
      previewHead.append(
        createElement(documentRef, 'strong', undefined, () => t('signature.ui.document.preview.2ee0ab', { p0: identity.filename })),
        createElement(
          documentRef,
          'span',
          'signature-status',
          () => previewBytes ? formatBytes(previewBytes.byteLength) : t('signature.ui.content.unavailable.6886f1')
        )
      )
      previewCard.append(previewHead, previewTarget)
      main.append(previewCard)

      content.append(sidebar, main)
      root.append(header, content)
      attachDetailsPanel(header, sidebar, main, [
        ...inspection.signers.flatMap((signer) => [
          signer.cryptographicSignatureValid,
          signer.digestMatches
        ]),
        ...(inspection.timestamp ? [inspection.timestamp.messageImprintMatchesOriginal] : [])
      ])

      if (!previewBytes) {
        previewTarget.append(
          createElement(
            documentRef,
            'div',
            'signature-preview-empty',
            () => inspection.requiresOriginalContent ? t('signature.ui.supply.the.original.content.to.compare.167006') : t('signature.ui.the.container.does.not.include.previewable.d0b3f9')
          )
        )
      } else if (previewBytes.byteLength > maxNestedPreviewSize) {
        previewTarget.append(
          createElement(
            documentRef,
            'div',
            'signature-preview-empty',
            () => t('signature.ui.nested.preview.is.disabled.because.exceeds.9108b1', { p0: formatBytes(previewBytes.byteLength), p1: formatBytes(maxNestedPreviewSize) })
          )
        )
      } else if (!context?.renderNestedBuffer || identity.extension === 'bin') {
        previewTarget.append(
          createElement(
            documentRef,
            'div',
            'signature-preview-empty',
            () => t('signature.ui.the.content.was.extracted.but.no.baea5a')
          )
        )
      } else {
        await acceptNested(
          await context.renderNestedBuffer(
            previewBytes.buffer.slice(
              previewBytes.byteOffset,
              previewBytes.byteOffset + previewBytes.byteLength
            ) as ArrayBuffer,
            identity.extension,
            previewTarget,
            {
              ...context,
              filename: identity.filename,
              url: undefined,
              streamUrl: undefined
            }
          ),
          sequence
        )
      }
    } catch (error) {
      if (disposed || sequence !== renderSequence) {
        return
      }
      replaceRoot(
        createElement(
          documentRef,
          'div',
          'signature-error',
          error instanceof Error ? error.message : String(error)
        )
      )
    }
  }

  await renderInspection()

  return {
    $el: root,
    async unmount() {
      disposed = true
      renderSequence += 1
      detailsPanel?.dispose()
      detailsPanel = undefined
      t.release(root)
      openPgpClient?.dispose()
      openPgpClient = undefined
      containerClient?.dispose()
      containerClient = undefined
      try {
        await clearNested()
      } finally {
        // A replacement viewer may already own this target while disposal waits.
        if (root.parentNode === target) root.remove()
        if (style.parentNode === target) style.remove()
      }
    }
  }
}
