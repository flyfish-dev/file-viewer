# @file-viewer/renderer-signature

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/signature/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/signature/README.zh-CN.md)

Optional, browser-local renderer for digital signatures, timestamps, evidence containers, and OpenPGP. It covers CMS/PKCS#7, selected CAdES attributes, RFC 3161, RFC 5544, ASiC, RFC 4998, JWS/JAdES metadata, and OpenPGP, then delegates safely extracted documents back to File Viewer's nested-renderer pipeline.

## Supported formats

- CMS / PKCS#7: `.p7m`, `.p7s`, `.p7b`, `.p7c`, `.pkcs7`, `.cms`, `.cmsc`
- Timestamps: RFC 3161 `.tsq`, `.tsr`, `.tst`; RFC 5544 `.tsd`
- Associated containers: ASiC-S / ASiC-E `.asics`, `.scs`, `.asice`, `.sce`
- Archival evidence: RFC 4998 `.ers`
- JSON Web Signature: compact, flattened JSON, and general JSON `.jws`
- OpenPGP: `.asc`, `.sig`, `.pgp`, `.gpg`

After the signature renderer is explicitly selected, it uses both the extension and the file contents. It does not take over the existing PDF, XML, JSON, EML, or MSG routes. ASiC documents, encapsulated CMS content, JWS payloads, and safely extracted OpenPGP literal data can continue through `renderNestedBuffer`. External `dataUri`, `jku`, `x5u`, OCSP, CRL, AIA, TSA, keyserver, and WKD URLs are never fetched automatically.

## Opt-in registration

```ts
import { signatureRenderer } from '@file-viewer/renderer-signature'

const options = {
  rendererMode: 'replace',
  renderers: [signatureRenderer]
}
```

Register the relevant PDF, XML, image, or Office renderer as well when extracted documents should be previewed. This package is not added to the frozen legacy `preset-all` or historical `*-full` dependency matrix, so existing upgrades do not unexpectedly download cryptographic WASM. A new project created with the File Viewer CLI's `full` selection installs every renderer from the catalog, including `signature`; users can also select it alone.

## Signed metadata beside PDF, XML and JSON previews

Register the optional `signatureRenderer` together with the normal PDF/text renderers. It adds the existing show/hide details panel when locally available document bytes contain PDF signature dictionaries, namespace-correct XMLDSig/XAdES, or compact/flattened/general JWS. The original PDF canvas or XML/JSON source preview remains mounted; unsigned documents keep their usual preview. This document path only parses metadata: it never verifies a signature or reference digest, imports a key, executes XML transforms, or fetches certificates, detached content or trust services. Certificate SHA-256 fingerprints are local digests. Missing material, unsupported extensions and unchecked claims do not mean invalid signatures.

Vanilla integration with original File or buffer input:

```ts
import { createViewer } from '@file-viewer/core/browser'
import { signatureRenderer } from '@file-viewer/renderer-signature'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { textRenderer } from '@file-viewer/renderer-text'
import { enableFileViewerPdfSignatureInspection } from '@file-viewer/renderer-pdf/signature-inspection'

// The explicit PDF entry needs the existing optional pdf-lib@1.17.1 peer.
// Full's existing PDF repair capability already registers this reader.
enableFileViewerPdfSignatureInspection()
const viewer = createViewer(document.querySelector('#viewer')!, {
  options: {
    renderers: [signatureRenderer, pdfRenderer, textRenderer],
    signature: { documentInspection: true, detailsPanel: { position: 'left' } }
  }
})
await viewer.load({ file: originalFile, filename: originalFile.name })
// Alternatively: viewer.load({ buffer: originalBytes, filename: 'signed.pdf' })
```

The optional signature capability enables this path by default; `signature.documentInspection: false` opts out. Full/presets do not install the signature plugin: explicitly add the same-version `signatureRenderer` to enable these panels. Full already supplies the PDF reader, while standard/lightweight PDF needs the optional peer and explicit reader entry above; its normal entry never imports the dictionary parser.

PDF inspection copies the original bytes before preview repair or Worker transfer. An already supplied original File/Blob can provide those bytes. A streaming URL with no original bytes retains its normal streaming preview and emits `document-inspection-unavailable`; it is not classified as unsigned. Use an original File/buffer, or `pdf.streaming: false` for a URL. Inspection never starts an extra URL fetch or inspects font-repaired preview bytes.

PDF dictionaries include original incremental definitions and multiple signers, with structural ByteRange/revision metadata; this does not establish active-field ownership, coverage or integrity. Direct CMS literal/hex strings and bounded unfiltered/Flate object streams are supported; encrypted PDFs, unsupported structural filters and malformed/oversized structures report unavailable. XML rejects DTD/entity declarations and external stylesheet instructions before parsing, scopes claims to the matching signature and never follows references or executes canonicalization/transforms. JWS displays unknown critical extensions as unsupported, including multiple signatures and missing detached payloads, without attempting verification. Existing standalone CMS/JWS verification defaults remain unchanged.

Inspection has hard ceilings (64 MiB original input, 4 MiB XML, 8 MiB JWS, 64 document signatures, bounded PDF structural decompression/nodes/depth and processing time). Host `signature.containerLimits` can lower the relevant limits. Unsupported or cancelled inspection preserves the preview and releases its panel/source references on teardown. These views do not establish trust, revocation, qualified status, legal validity or full PAdES/XAdES/JAdES compliance.

## Host inputs

`options.signature` accepts:

- `originalContent` / `originalFilename` for detached CMS, timestamps, ERS, or JWS;
- `openPgpPublicKeys` for detached, cleartext, and unencrypted embedded OpenPGP signature verification;
- `jwsVerificationKeys` for asymmetric public JWKs;
- `openPgpLimits` / `containerLimits`, bounded by non-disableable absolute ceilings;
- `workerFactory` for strict Trusted Types/CSP applications.

Strict Trusted Types example:

```ts
const policy = trustedTypes.createPolicy('file-viewer-workers', {
  createScriptURL: (value) => value
})

const signature = {
  workerFactory(kind: 'openpgp' | 'container') {
    const url =
      kind === 'openpgp'
        ? new URL('/file-viewer-assets/signature.worker.js', window.location.origin)
        : new URL('/file-viewer-assets/container.worker.js', window.location.origin)
    return new Worker(policy.createScriptURL(url.href), { type: 'module' })
  }
}
```

The policy must accept only application-resolved, fixed package URLs. Never pass document-derived strings to `createScriptURL`.

## Signature details panel

The initial layout is configured through the optional core `FileViewerOptions.signature` contract. Register the signature renderer and the desired nested document renderers as usual.

```ts
import { createViewer } from '@file-viewer/core'
import { signatureRenderer, FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT } from '@file-viewer/renderer-signature'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { textRenderer } from '@file-viewer/renderer-text'

const viewer = createViewer(container, {
  options: {
    renderers: [signatureRenderer, pdfRenderer, textRenderer],
    signature: {
      detailsPanel: {
        initialState: 'collapsed',
        position: 'left',
        openingBehavior: 'overlay'
      }
    }
  }
})
container.addEventListener(FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT, event => {
  // Persist event.detail.expanded, position and openingBehavior in your application.
  // Nested signature containers emit their own events; use composedPath()[0]
  // to identify the originating signature shell when that distinction matters.
})
```

Defaults remain `initialState: 'expanded'` and `position: 'top'`. `openingBehavior` defaults to `'overlay'` and applies only to left placement. The panel contains signature details only; metadata, validation boundaries, original/key inputs and attachment selection remain available. In the left layout, the permanent metadata column remains separate from the details rail and preview. Narrow hosts stack the existing metadata column according to their own width.

The initial settings are read once per rendered signature document. Changing `viewer.updateOptions()` does not change an already mounted panel or reload it. Users can always show/hide details; their choice survives verification-input changes within that instance. A new document starts from its configured initial state. The renderer does not store preferences globally or in localStorage.

Show/hide retains the live nested preview and does not repeat signature verification. Overlay retains the preview dimensions, zoom and reading position. Push changes the available width: manual zoom is retained, while the document's existing automatic-fit policy may recalculate scale. A bounded reading-position adjustment preserves the current page/block where possible; arbitrary renderers without stable anchors fall back to scroll position. Closing restores the available width without reloading.

The bubbling, composed `file-viewer-signature-panel-change` DOM event fires once per actual user state change, with serializable `{ expanded, position, openingBehavior }` detail, not on initialization. It is separate from the nested document's view-state events. No callback is added to Worker options. The exported `FileViewerSignaturePanelChangeDetail` type describes the payload.

Failures and incomplete checks remain discoverable when details are collapsed. The summary never claims overall validity or trust. Existing security boundaries and verification results are unchanged. New panel controls use the core Chinese, English, Japanese and German catalogs and custom-message overrides; existing engine diagnostic wording is unchanged.

## OpenPGP and size boundary

The OpenPGP backend uses permissively licensed rPGP `0.20.0` inside a dedicated, lazy Worker/WASM path. It does not use OpenPGP.js, GnuPG, or LGPL source. The narrow public boundary supports classification, bounded metadata inspection, and multi-signature verification for detached, cleartext, and unencrypted embedded/compressed messages; it does not expose rPGP internals or secret key material.

The optimized artifact has hard release gates of 1,900,000 B raw / 450,000 B Brotli for WASM and 1,800,000 B for the npm tarball. The raw budget reflects a WasmGC-free build so engines without GC (Node 18, older browsers) can parse the module. The verifier performs two byte-for-byte reproducibility builds. Default limits are 32 MiB input, 16 MiB extracted output, 4,096 packets, 16 nesting levels, 128 user IDs, 128 subkeys, and 256 signatures.

Direct ASN.1 calls to `inspectSignatureContainer` and `inspectEvidenceRecord` also bound input, original content, node and nesting counts, algorithms, certificates, CRLs, signers, attributes, extracted bytes, timestamp chains, and hash-tree nodes. Per-call `options.limits` can only lower these absolute ceilings.

Encrypted messages report only recipient identifiers, integrity protection, and algorithms visible in the container. Automatic decryption, signing, key generation, private-key unlocking, system-keyring import, and online key discovery are intentionally unavailable.

## Validation boundary

Successful parsing is not signature verification. A valid cryptographic signature does not establish certificate or key trust, identity, policy compliance, qualified-signature status, or legal validity. The UI separates structural parsing, content-digest checks, cryptographic verification, and checks that were not performed.

ASiC input is checked before inflation for central/local-header consistency, data-range overlap, unsafe paths, duplicates, symlinks, encryption, ZIP64, unsupported compression, CRC, compression ratio, entry size, and aggregate output. RFC 4998 verifies only relationships that can be established from the supplied data and does not claim complete archival-policy validation. XAdES/XMLDSig inside ASiC is bounded structural/reference inspection, and JAdES is metadata only. PAdES, S/MIME, PGP/MIME, and full XML canonicalization or XMLDSig/XAdES/JAdES profile validation remain outside this renderer because they require host integration with their existing PDF, XML, and message renderers.

## Build and verification

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.127 --locked
pnpm --filter @file-viewer/renderer-signature build
pnpm --filter @file-viewer/renderer-signature verify
pnpm verify:issue-206-signature
```

The release gate pins `wasm-bindgen-cli 0.2.127` and Binaryen `wasm-opt 132`, running `-Oz` with only the post-MVP features emitted by Rust. It never enables `--all-features`, which can introduce WasmGC encodings. Browser acceptance covers Chromium, Firefox, WebKit, strict CSP/Trusted Types, hostile DOM payloads, path traversal, compression bombs, zero external requests, and Worker cleanup after unmount.

See `THIRD_PARTY_LICENSES.json` for the exact runtime closure, selected license branches, and license texts. `THIRD_PARTY_NOTICES.md` provides the short summary.
