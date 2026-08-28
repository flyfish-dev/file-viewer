# @file-viewer/renderer-signature

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

## OpenPGP and size boundary

The OpenPGP backend uses permissively licensed rPGP `0.20.0` inside a dedicated, lazy Worker/WASM path. It does not use OpenPGP.js, GnuPG, or LGPL source. The narrow public boundary supports classification, bounded metadata inspection, and multi-signature verification for detached, cleartext, and unencrypted embedded/compressed messages; it does not expose rPGP internals or secret key material.

The optimized artifact has hard release gates of 1,600,000 B raw / 450,000 B Brotli for WASM and 1,800,000 B for the npm tarball. The verifier performs two byte-for-byte reproducibility builds. Default limits are 32 MiB input, 16 MiB extracted output, 4,096 packets, 16 nesting levels, 128 user IDs, 128 subkeys, and 256 signatures.

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

The release gate pins `wasm-bindgen-cli 0.2.127` and runs `wasm-opt -Oz --all-features`. Browser acceptance covers Chromium, Firefox, WebKit, strict CSP/Trusted Types, hostile DOM payloads, path traversal, compression bombs, zero external requests, and Worker cleanup after unmount.

See `THIRD_PARTY_LICENSES.json` for the exact runtime closure, selected license branches, and license texts. `THIRD_PARTY_NOTICES.md` provides the short summary.
