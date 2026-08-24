import {
  disposeFileViewerRendered,
  normalizeFileViewerUiDensity,
  type FileRenderContext,
  type FileViewerOptions,
  type FileViewerRenderedInstance,
} from '@file-viewer/core';
import {
  inspectSignatureContainer,
  type SignatureCertificateSummary,
  type SignatureInspection,
  type SignatureSignerSummary,
  type TimestampInfoSummary,
} from './signatureAsn1.js';
import { isProbablyOpenPgp } from './openpgp/formatDetection.js';
import type { OpenPgpWorkerClient as OpenPgpWorkerClientType } from './openpgp/client.js';
import type {
  OpenPgpInspectionResult,
  OpenPgpVerificationResult,
  SignatureParseLimits,
} from './openpgp/types.js';

const DEFAULT_MAX_CONTAINER_SIZE = 64 * 1024 * 1024;
const DEFAULT_MAX_NESTED_PREVIEW_SIZE = 32 * 1024 * 1024;

export interface FileViewerSignatureOptions {
  /** Original content used for detached CMS signatures and RFC 3161 imprint comparison. */
  originalContent?: ArrayBuffer | Blob;
  originalFilename?: string;
  /** Maximum cryptographic container size parsed in memory. Defaults to 64 MiB. */
  maxContainerSize?: number;
  /** Maximum extracted or supplied original size sent to a nested renderer. Defaults to 32 MiB. */
  maxNestedPreviewSize?: number;
  /** Public OpenPGP keys used only for detached-signature verification. Secret keys are not accepted for verification. */
  openPgpPublicKeys?: Array<ArrayBuffer | Blob>;
  /** Conservative parser/resource limits forwarded to the rPGP WebAssembly wrapper. */
  openPgpLimits?: Partial<SignatureParseLimits>;
}

type SignatureFileViewerOptions = FileViewerOptions & {
  signature?: FileViewerSignatureOptions;
};

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
`;

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
};

const valueOrDash = (value: unknown) => value === undefined || value === null || value === ''
  ? '—'
  : String(value);

const appendDefinitionList = (
  documentRef: Document,
  parent: HTMLElement,
  rows: Array<[string, unknown]>
) => {
  const list = createElement(documentRef, 'dl', 'signature-grid');
  rows.forEach(([label, value]) => {
    list.append(
      createElement(documentRef, 'dt', undefined, label),
      createElement(documentRef, 'dd', undefined, valueOrDash(value))
    );
  });
  parent.append(list);
};

const statusBadge = (
  documentRef: Document,
  label: string,
  value: boolean | undefined,
  pendingLabel: string
) => {
  const state = value === true ? 'valid' : value === false ? 'invalid' : 'pending';
  const text = value === true ? `${label}: valid` : value === false ? `${label}: invalid` : `${label}: ${pendingLabel}`;
  const element = createElement(documentRef, 'span', 'signature-status', text);
  element.dataset.state = state;
  return element;
};

const renderSigner = (
  documentRef: Document,
  signer: SignatureSignerSummary
) => {
  const item = createElement(documentRef, 'article', 'signature-item');
  const head = createElement(documentRef, 'div', 'signature-item-head');
  head.append(
    createElement(documentRef, 'strong', undefined, `Signer ${signer.index + 1}`),
    createElement(documentRef, 'span', undefined, signer.certificateIndex === undefined
      ? 'certificate not matched'
      : `certificate ${signer.certificateIndex + 1}`)
  );
  const statuses = createElement(documentRef, 'div', 'signature-status-list');
  statuses.append(
    statusBadge(documentRef, 'Signature', signer.cryptographicSignatureValid, 'not verified'),
    statusBadge(documentRef, 'Content digest', signer.digestMatches, 'original required')
  );
  item.append(head, statuses);
  appendDefinitionList(documentRef, item, [
    ['Signer identifier', signer.sid],
    ['Digest algorithm', signer.digestAlgorithm],
    ['Signature algorithm', signer.signatureAlgorithm],
    ['Signing time', signer.signingTime],
    ['Signed content type', signer.contentTypeOid],
    ['Signed message digest', signer.messageDigest],
    ['CAdES signingCertificateV2', signer.signingCertificateV2 ? 'Present' : 'Not detected'],
    ['Signature timestamp tokens', signer.signatureTimestampTokens],
    ['Verification note', signer.verificationError],
  ]);
  return item;
};

const renderCertificate = (
  documentRef: Document,
  certificate: SignatureCertificateSummary
) => {
  const item = createElement(documentRef, 'article', 'signature-item');
  const head = createElement(documentRef, 'div', 'signature-item-head');
  head.append(
    createElement(documentRef, 'strong', undefined, `Certificate ${certificate.index + 1}`),
    createElement(documentRef, 'span', undefined, `X.509 v${certificate.version || '?'}`)
  );
  item.append(head);
  appendDefinitionList(documentRef, item, [
    ['Subject', certificate.subject],
    ['Issuer', certificate.issuer],
    ['Serial number', certificate.serialNumber],
    ['Valid from', certificate.notBefore],
    ['Valid until', certificate.notAfter],
    ['Public key', certificate.publicKeyAlgorithm],
    ['Public key curve', certificate.publicKeyCurveOid],
    ['Certificate signature', certificate.signatureAlgorithm],
    ['Subject key identifier', certificate.subjectKeyIdentifier],
    ['SHA-256 fingerprint', certificate.fingerprintSha256],
  ]);
  return item;
};

const renderTimestamp = (
  documentRef: Document,
  timestamp: TimestampInfoSummary
) => {
  const card = createElement(documentRef, 'section', 'signature-card');
  card.append(createElement(documentRef, 'h3', undefined, 'RFC 3161 timestamp'));
  const statuses = createElement(documentRef, 'div', 'signature-status-list');
  statuses.append(statusBadge(
    documentRef,
    'Message imprint',
    timestamp.messageImprintMatchesOriginal,
    'original required'
  ));
  card.append(statuses);
  appendDefinitionList(documentRef, card, [
    ['Version', timestamp.version],
    ['Policy OID', timestamp.policyOid],
    ['Serial number', timestamp.serialNumber],
    ['Generation time', timestamp.generationTime],
    ['Message imprint algorithm', timestamp.messageImprintAlgorithm],
    ['Message imprint', timestamp.messageImprint],
    ['Nonce', timestamp.nonce],
    ['TSA certificate requested', timestamp.certReq === undefined ? undefined : timestamp.certReq ? 'Yes' : 'No'],
    ['Ordering', timestamp.ordering],
    ['Accuracy', timestamp.accuracy
      ? [
          timestamp.accuracy.seconds === undefined ? '' : `${timestamp.accuracy.seconds}s`,
          timestamp.accuracy.millis === undefined ? '' : `${timestamp.accuracy.millis}ms`,
          timestamp.accuracy.micros === undefined ? '' : `${timestamp.accuracy.micros}µs`,
        ].filter(Boolean).join(' ')
      : undefined],
    ['Timestamp authority', timestamp.tsa],
  ]);
  return card;
};

const getFilenameExtension = (filename: string) => {
  const basename = filename.split(/[\\/]/).pop() || filename;
  const dot = basename.lastIndexOf('.');
  return dot > 0 && dot < basename.length - 1 ? basename.slice(dot + 1).toLowerCase() : '';
};

const stripContainerExtension = (filename: string) => filename.replace(
  /\.(?:p7m|p7s|p7b|p7c|pkcs7|cms|cmsc|tst|tsq|tsr|tsd)$/i,
  ''
);

const sniffNestedExtension = (bytes: Uint8Array) => {
  const head = bytes.subarray(0, Math.min(bytes.byteLength, 512));
  const ascii = String.fromCharCode(...head);
  if (ascii.startsWith('%PDF-')) return 'pdf';
  if (head[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'png';
  if (head[0] === 0xff && head[1] === 0xd8) return 'jpg';
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'gif';
  if (ascii.startsWith('PK\u0003\u0004')) return 'zip';
  const text = new TextDecoder('utf-8', { fatal: false }).decode(head).trimStart();
  if (text.startsWith('<?xml') || text.startsWith('<')) return 'xml';
  if (text.startsWith('{') || text.startsWith('[')) return 'json';
  const printable = head.length === 0 || Array.from(head).filter(value => (
    value === 9 || value === 10 || value === 13 || (value >= 32 && value < 127)
  )).length / head.length > 0.92;
  return printable ? 'txt' : 'bin';
};

const resolveNestedIdentity = (
  inspection: SignatureInspection,
  sourceFilename: string,
  originalFilename?: string,
  preferOriginal = false
) => {
  if (preferOriginal && originalFilename) {
    return {
      filename: originalFilename,
      extension: getFilenameExtension(originalFilename) || 'bin',
    };
  }
  const stripped = stripContainerExtension(sourceFilename);
  const extension = getFilenameExtension(stripped) || (
    inspection.embeddedContent ? sniffNestedExtension(inspection.embeddedContent) : 'bin'
  );
  const filename = getFilenameExtension(stripped)
    ? stripped
    : `signed-content.${extension}`;
  return { filename, extension };
};

const readConfiguredOriginal = async (options?: FileViewerSignatureOptions) => {
  if (!options?.originalContent) {
    return undefined;
  }
  if (options.originalContent instanceof ArrayBuffer) {
    return options.originalContent;
  }
  return options.originalContent.arrayBuffer();
};

const readConfiguredOpenPgpKeys = async (options?: FileViewerSignatureOptions) => Promise.all(
  (options?.openPgpPublicKeys || []).map(key => key instanceof ArrayBuffer ? key : key.arrayBuffer())
);

const renderOpenPgpKey = (documentRef: Document, key: OpenPgpInspectionResult['keys'][number]) => {
  const item = createElement(documentRef, 'article', 'signature-item');
  const head = createElement(documentRef, 'div', 'signature-item-head');
  head.append(
    createElement(documentRef, 'strong', undefined, `${key.kind === 'private' ? 'Private-key block' : 'Public key'}`),
    createElement(documentRef, 'span', undefined, key.keyId || 'key id unavailable')
  );
  item.append(head);
  appendDefinitionList(documentRef, item, [
    ['Fingerprint', key.fingerprint],
    ['Version', key.version],
    ['Algorithm', key.algorithm],
    ['Created', key.createdAt],
    ['User IDs', key.userIds.join('; ')],
    ['Subkeys', key.subkeys.length],
  ]);
  if (key.kind === 'private') {
    item.append(createElement(
      documentRef,
      'div',
      'signature-warning',
      'Only public metadata is exposed. Secret MPIs, private scalars and passphrases never cross the WASM boundary.'
    ));
  }
  return item;
};

export default async function renderSignature(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument;
  const options = (context?.options as SignatureFileViewerOptions | undefined)?.signature;
  const filename = context?.filename || `signature.${type || 'p7m'}`;
  const maxContainerSize = options?.maxContainerSize || DEFAULT_MAX_CONTAINER_SIZE;
  const maxNestedPreviewSize = options?.maxNestedPreviewSize || DEFAULT_MAX_NESTED_PREVIEW_SIZE;
  if (buffer.byteLength > maxContainerSize) {
    throw new Error(`The cryptographic container (${formatBytes(buffer.byteLength)}) exceeds the ${formatBytes(maxContainerSize)} parsing limit.`);
  }

  const style = createElement(documentRef, 'style');
  style.textContent = signatureStyle;
  const root = createElement(documentRef, 'section', 'signature-shell');
  root.dataset.viewerDensity = normalizeFileViewerUiDensity(context?.options?.ui?.density);
  target.replaceChildren(style, root);

  let originalContent = await readConfiguredOriginal(options);
  let originalFilename = options?.originalFilename;
  let openPgpPublicKeys = await readConfiguredOpenPgpKeys(options);
  let openPgpClient: OpenPgpWorkerClientType | undefined;
  let nestedRendered: FileViewerRenderedInstance | undefined;
  let disposed = false;
  let renderSequence = 0;

  const clearNested = async () => {
    await disposeFileViewerRendered(nestedRendered);
    nestedRendered = undefined;
  };

  const renderInspection = async () => {
    const sequence = ++renderSequence;
    await clearNested();
    root.replaceChildren(createElement(documentRef, 'div', 'signature-loading'));
    const loading = root.firstElementChild as HTMLElement;
    loading.append(
      createElement(documentRef, 'span', 'signature-spinner'),
      createElement(documentRef, 'span', undefined, 'Inspecting signature and timestamp structures locally…')
    );

    try {
      const sourceBytes = new Uint8Array(buffer);
      if (isProbablyOpenPgp(sourceBytes, filename, type)) {
        const { OpenPgpWorkerClient } = await import('./openpgp/client.js');
        openPgpClient ||= new OpenPgpWorkerClient();
        const inspection = await openPgpClient.inspect(buffer, options?.openPgpLimits);
        let verification: OpenPgpVerificationResult | undefined;
        if (inspection.classification === 'detached-signature' && originalContent && openPgpPublicKeys.length) {
          verification = await openPgpClient.verifyDetached(
            originalContent,
            buffer,
            openPgpPublicKeys,
            options?.openPgpLimits
          );
        }
        if (disposed || sequence !== renderSequence) return;

        root.replaceChildren();
        const header = createElement(documentRef, 'header', 'signature-header');
        const title = createElement(documentRef, 'div', 'signature-title');
        title.append(
          createElement(documentRef, 'small', undefined, 'OPENPGP · rPGP / WASM'),
          createElement(documentRef, 'h2', undefined, filename),
          createElement(documentRef, 'p', undefined, inspection.classification)
        );
        header.append(title, createElement(documentRef, 'span', 'signature-phase', 'OPTIONAL · LAZY WORKER / WASM'));

        const content = createElement(documentRef, 'div', 'signature-content');
        const sidebar = createElement(documentRef, 'aside', 'signature-sidebar');
        const main = createElement(documentRef, 'main', 'signature-main');

        const summary = createElement(documentRef, 'section', 'signature-card');
        summary.append(createElement(documentRef, 'h3', undefined, 'OpenPGP summary'));
        appendDefinitionList(documentRef, summary, [
          ['Classification', inspection.classification],
          ['ASCII armored', inspection.armored ? 'Yes' : 'No'],
          ['Armor type', inspection.armorType],
          ['Encrypted', inspection.encrypted ? 'Yes' : 'No'],
          ['Compressed', inspection.compressed ? 'Yes' : 'No'],
          ['Packet count', inspection.packetCount],
          ['Packet types', inspection.packetTypes.join(', ')],
          ['Keys', inspection.keys.length],
          ['Signatures', inspection.signatures.length],
        ]);
        summary.append(createElement(
          documentRef,
          'div',
          'signature-openpgp-note',
          'OpenPGP parsing runs browser-local inside a dedicated Worker backed by rPGP WebAssembly. OpenPGP.js and GnuPG are not used.'
        ));
        sidebar.append(summary);

        const warnings = createElement(documentRef, 'section', 'signature-card');
        warnings.append(createElement(documentRef, 'h3', undefined, 'Security boundaries'));
        [
          ...inspection.warnings,
          'Parsing does not imply signature verification, key trust, identity trust, or legal validity.',
          'Private-key decryption, signing, key generation and message decryption are intentionally disabled in this phase.',
        ].forEach(warning => warnings.append(createElement(documentRef, 'div', 'signature-warning', warning)));
        sidebar.append(warnings);

        if (inspection.classification === 'detached-signature') {
          const verifyCard = createElement(documentRef, 'section', 'signature-card');
          verifyCard.append(createElement(documentRef, 'h3', undefined, 'Detached signature verification'));
          const statusList = createElement(documentRef, 'div', 'signature-status-list');
          statusList.append(statusBadge(
            documentRef,
            'Cryptographic signature',
            verification?.valid,
            originalContent ? (openPgpPublicKeys.length ? 'not verified' : 'public key required') : 'original required'
          ));
          verifyCard.append(statusList);
          appendDefinitionList(documentRef, verifyCard, [
            ['Result', verification?.status],
            ['Key fingerprint', verification?.keyFingerprint],
            ['Key ID', verification?.keyId],
            ['Verification note', verification?.error],
          ]);

          const originalBox = createElement(documentRef, 'div', 'signature-original');
          const originalInput = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement;
          originalInput.type = 'file';
          originalInput.setAttribute('aria-label', 'Choose original OpenPGP signed content');
          originalInput.addEventListener('change', () => {
            const file = originalInput.files?.[0];
            if (!file) return;
            void file.arrayBuffer().then(next => {
              originalContent = next;
              originalFilename = file.name;
              return renderInspection();
            });
          });
          originalBox.append(originalInput, createElement(
            documentRef,
            'div',
            'signature-original-state',
            originalContent ? `${originalFilename || 'Host-provided original'} · ${formatBytes(originalContent.byteLength)}` : 'Original content is required.'
          ));

          const keyBox = createElement(documentRef, 'div', 'signature-key-input');
          const keyInput = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement;
          keyInput.type = 'file';
          keyInput.multiple = true;
          keyInput.setAttribute('aria-label', 'Choose OpenPGP public verification keys');
          keyInput.addEventListener('change', () => {
            const files = Array.from(keyInput.files || []);
            void Promise.all(files.map(file => file.arrayBuffer())).then(keys => {
              openPgpPublicKeys = keys;
              return renderInspection();
            });
          });
          keyBox.append(keyInput, createElement(
            documentRef,
            'div',
            'signature-original-state',
            openPgpPublicKeys.length ? `${openPgpPublicKeys.length} verification key file(s) supplied.` : 'Supply one or more public keys; no keyring lookup is performed.'
          ));
          verifyCard.append(originalBox, keyBox);
          sidebar.append(verifyCard);
        }

        if (inspection.keys.length) {
          const keysCard = createElement(documentRef, 'section', 'signature-card');
          keysCard.append(createElement(documentRef, 'h3', undefined, 'Key metadata'));
          inspection.keys.forEach(key => keysCard.append(renderOpenPgpKey(documentRef, key)));
          main.append(keysCard);
        }

        const previewCard = createElement(documentRef, 'section', 'signature-card signature-preview');
        const previewHead = createElement(documentRef, 'div', 'signature-preview-head');
        const previewTarget = createElement(documentRef, 'div', 'signature-preview-target') as HTMLDivElement;
        const literal = inspection.literalData;
        const literalBytes = literal?.data;
        const literalFilename = literal?.filename || 'openpgp-literal-data.bin';
        const literalExtension = getFilenameExtension(literalFilename) || (literalBytes ? sniffNestedExtension(literalBytes) : 'bin');
        previewHead.append(
          createElement(documentRef, 'strong', undefined, `Literal-data preview · ${literalFilename}`),
          createElement(documentRef, 'span', 'signature-status', literalBytes ? formatBytes(literalBytes.byteLength) : 'not extracted')
        );
        previewCard.append(previewHead, previewTarget);
        main.append(previewCard);
        if (!literalBytes) {
          previewTarget.append(createElement(
            documentRef,
            'div',
            'signature-preview-empty',
            inspection.encrypted
              ? 'Encrypted OpenPGP data is inspection-only in this phase.'
              : inspection.compressed
                ? 'Compressed OpenPGP data is not recursively decompressed unless a bounded path is implemented.'
                : 'No safely extractable literal data is available.'
          ));
        } else if (literalBytes.byteLength > maxNestedPreviewSize) {
          previewTarget.append(createElement(documentRef, 'div', 'signature-preview-empty', 'Extracted literal data exceeds the nested-preview limit.'));
        } else if (!context?.renderNestedBuffer || literalExtension === 'bin') {
          previewTarget.append(createElement(documentRef, 'div', 'signature-preview-empty', 'Literal data was extracted, but no compatible nested renderer is available.'));
        } else {
          nestedRendered = await context.renderNestedBuffer(
            literalBytes.buffer.slice(literalBytes.byteOffset, literalBytes.byteOffset + literalBytes.byteLength) as ArrayBuffer,
            literalExtension,
            previewTarget,
            { ...context, filename: literalFilename, url: undefined, streamUrl: undefined }
          );
        }

        content.append(sidebar, main);
        root.append(header, content);
        return;
      }

      const inspection = await inspectSignatureContainer(buffer, {
        sourceFilename: filename,
        extensionHint: type,
        originalContent,
      });
      if (disposed || sequence !== renderSequence) {
        return;
      }
      root.replaceChildren();
      const header = createElement(documentRef, 'header', 'signature-header');
      const title = createElement(documentRef, 'div', 'signature-title');
      title.append(
        createElement(documentRef, 'small', undefined, 'CRYPTOGRAPHIC CONTAINER'),
        createElement(documentRef, 'h2', undefined, filename),
        createElement(documentRef, 'p', undefined, inspection.detectedFormat)
      );
      header.append(title, createElement(documentRef, 'span', 'signature-phase', 'PHASE 1 · CMS / RFC 3161 / RFC 5544'));

      const content = createElement(documentRef, 'div', 'signature-content');
      const sidebar = createElement(documentRef, 'aside', 'signature-sidebar');
      const main = createElement(documentRef, 'main', 'signature-main');

      const summary = createElement(documentRef, 'section', 'signature-card');
      summary.append(createElement(documentRef, 'h3', undefined, 'Container summary'));
      appendDefinitionList(documentRef, summary, [
        ['Detected format', inspection.detectedFormat],
        ['Size', formatBytes(inspection.sourceSize)],
        ['CMS content type', inspection.contentType],
        ['Signed content type', inspection.signedContentType],
        ['Digest algorithms', inspection.digestAlgorithms.join(', ')],
        ['Encapsulated content', inspection.embeddedContent ? formatBytes(inspection.embeddedContent.byteLength) : 'No'],
        ['Detached', inspection.detached ? 'Yes' : 'No'],
        ['Signers', inspection.signers.length],
        ['Certificates', inspection.certificates.length],
        ['CRLs', inspection.crlCount],
      ]);
      sidebar.append(summary);

      const boundaries = createElement(documentRef, 'section', 'signature-card');
      boundaries.append(createElement(documentRef, 'h3', undefined, 'Validation boundaries'));
      inspection.warnings.forEach(warning => boundaries.append(
        createElement(documentRef, 'div', 'signature-warning', warning)
      ));
      sidebar.append(boundaries);

      if (inspection.timestampResponse) {
        const response = createElement(documentRef, 'section', 'signature-card');
        response.append(createElement(documentRef, 'h3', undefined, 'Timestamp response'));
        appendDefinitionList(documentRef, response, [
          ['Status', inspection.timestampResponse.statusLabel],
          ['Status code', inspection.timestampResponse.status],
          ['Status text', inspection.timestampResponse.statusText.join('; ')],
          ['Failure info', inspection.timestampResponse.failureInfo],
        ]);
        sidebar.append(response);
      }

      if (inspection.timestampedData) {
        const tsd = createElement(documentRef, 'section', 'signature-card');
        tsd.append(createElement(documentRef, 'h3', undefined, 'RFC 5544 TimeStampedData'));
        appendDefinitionList(documentRef, tsd, [
          ['Data URI', inspection.timestampedData.dataUri],
          ['Filename', inspection.timestampedData.filename],
          ['Media type', inspection.timestampedData.mediaType],
          ['Metadata hash protected', inspection.timestampedData.hashProtected === undefined ? undefined : inspection.timestampedData.hashProtected ? 'Yes' : 'No'],
          ['Temporal evidence entries', inspection.timestampedData.temporalEvidenceEntries],
        ]);
        sidebar.append(tsd);
      }

      if (inspection.requiresOriginalContent || inspection.timestamp?.messageImprint || inspection.kind === 'timestamped-data') {
        const originalCard = createElement(documentRef, 'section', 'signature-card');
        originalCard.append(createElement(documentRef, 'h3', undefined, 'Original content'));
        const originalBox = createElement(documentRef, 'div', 'signature-original');
        const input = createElement(documentRef, 'input', 'signature-file') as HTMLInputElement;
        input.type = 'file';
        input.setAttribute('aria-label', 'Choose original content');
        const originalState = createElement(
          documentRef,
          'div',
          'signature-original-state',
          originalContent
            ? `${originalFilename || 'Host-provided content'} · ${formatBytes(originalContent.byteLength)}`
            : 'Choose the original file to compare its digest locally.'
        );
        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) return;
          void file.arrayBuffer().then(nextBuffer => {
            originalContent = nextBuffer;
            originalFilename = file.name;
            return renderInspection();
          }).catch(error => {
            originalState.textContent = error instanceof Error ? error.message : String(error);
          });
        });
        originalBox.append(input, originalState);
        originalCard.append(originalBox);
        sidebar.append(originalCard);
      }

      if (inspection.signers.length) {
        const signers = createElement(documentRef, 'section', 'signature-card');
        signers.append(createElement(documentRef, 'h3', undefined, 'Signers'));
        inspection.signers.forEach(signer => signers.append(renderSigner(documentRef, signer)));
        main.append(signers);
      }

      if (inspection.timestamp) {
        main.append(renderTimestamp(documentRef, inspection.timestamp));
      }

      if (inspection.certificates.length) {
        const certificates = createElement(documentRef, 'section', 'signature-card');
        certificates.append(createElement(documentRef, 'h3', undefined, 'Included certificates'));
        inspection.certificates.forEach(certificate => certificates.append(renderCertificate(documentRef, certificate)));
        main.append(certificates);
      }

      const previewCard = createElement(documentRef, 'section', 'signature-card signature-preview');
      const previewHead = createElement(documentRef, 'div', 'signature-preview-head');
      const previewTarget = createElement(documentRef, 'div', 'signature-preview-target') as HTMLDivElement;
      const timestampContainer = inspection.kind === 'timestamp-request' ||
        inspection.kind === 'timestamp-response' ||
        inspection.kind === 'timestamp-token' ||
        inspection.kind === 'timestamped-data';
      const previewUsesOriginal = Boolean(originalContent && (inspection.detached || timestampContainer));
      const previewSource = previewUsesOriginal ? originalContent : inspection.embeddedContent;
      const previewBytes = previewSource
        ? previewSource instanceof Uint8Array
          ? previewSource
          : new Uint8Array(previewSource)
        : undefined;
      const identity = inspection.kind === 'timestamped-data' && inspection.timestampedData?.filename && !previewUsesOriginal
        ? {
            filename: inspection.timestampedData.filename,
            extension: getFilenameExtension(inspection.timestampedData.filename) || sniffNestedExtension(previewBytes || new Uint8Array()),
          }
        : resolveNestedIdentity(inspection, filename, originalFilename, previewUsesOriginal);
      previewHead.append(
        createElement(documentRef, 'strong', undefined, `Document preview · ${identity.filename}`),
        createElement(documentRef, 'span', 'signature-status', previewBytes ? formatBytes(previewBytes.byteLength) : 'content unavailable')
      );
      previewCard.append(previewHead, previewTarget);
      main.append(previewCard);

      content.append(sidebar, main);
      root.append(header, content);

      if (!previewBytes) {
        previewTarget.append(createElement(
          documentRef,
          'div',
          'signature-preview-empty',
          inspection.requiresOriginalContent
            ? 'Supply the original content to compare its digest or timestamp message imprint and open it through the nested renderer.'
            : 'The container does not include previewable document content.'
        ));
      } else if (previewBytes.byteLength > maxNestedPreviewSize) {
        previewTarget.append(createElement(
          documentRef,
          'div',
          'signature-preview-empty',
          `Nested preview is disabled because ${formatBytes(previewBytes.byteLength)} exceeds the ${formatBytes(maxNestedPreviewSize)} limit.`
        ));
      } else if (!context?.renderNestedBuffer || identity.extension === 'bin') {
        previewTarget.append(createElement(
          documentRef,
          'div',
          'signature-preview-empty',
          'The content was extracted and verified, but no compatible nested renderer is available for this file type.'
        ));
      } else {
        nestedRendered = await context.renderNestedBuffer(
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
            streamUrl: undefined,
          }
        );
      }
    } catch (error) {
      if (disposed || sequence !== renderSequence) {
        return;
      }
      root.replaceChildren(createElement(
        documentRef,
        'div',
        'signature-error',
        error instanceof Error ? error.message : String(error)
      ));
    }
  };

  await renderInspection();

  return {
    $el: root,
    async unmount() {
      disposed = true;
      renderSequence += 1;
      openPgpClient?.dispose();
      openPgpClient = undefined;
      await clearNested();
      target.replaceChildren();
    },
  };
}
