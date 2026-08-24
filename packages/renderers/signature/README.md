# @file-viewer/renderer-signature

Optional, browser-local renderer for cryptographic signatures and timestamp containers. It keeps CMS/CAdES/RFC 3161/RFC 5544 support in TypeScript/Web Crypto and adds OpenPGP inspection through an optional rPGP WebAssembly backend.

## Supported formats

- CMS / PKCS#7 / CAdES-adjacent containers: `.p7m`, `.p7s`, `.p7b`, `.p7c`, `.pkcs7`, `.cms`, `.cmsc`
- RFC 3161 timestamp requests, responses and tokens: `.tsq`, `.tsr`, `.tst`
- RFC 5544 `TimeStampedData`: `.tsd`
- OpenPGP routing and inspection: `.asc`, `.sig`, `.pgp`, `.gpg`

The renderer uses content detection as well as extensions. An `.asc` file can therefore be classified as a message, detached signature, cleartext-signed message, public key or private key instead of being treated as a single fixed format.

ASiC, ERS, PAdES, XMLDSig/XAdES and JWS/JAdES remain outside the current implementation.

## Optional registration

```ts
import { signatureRenderer } from '@file-viewer/renderer-signature';

const options = {
  rendererMode: 'replace',
  renderers: [signatureRenderer],
};
```

To preview extracted PDF or literal data, compose the signature renderer with the relevant optional renderer:

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf';
import { signatureRenderer } from '@file-viewer/renderer-signature';

const options = {
  rendererMode: 'replace',
  renderers: [signatureRenderer, pdfRenderer],
};
```

`@file-viewer/preset-all` includes this renderer explicitly, but `@file-viewer/core` does not import it.

## OpenPGP backend

OpenPGP is implemented with rPGP (`pgp` crate `0.20.0`) compiled to WebAssembly. OpenPGP.js is not used and the renderer has no npm dependency named `openpgp`. No LGPL OpenPGP implementation, GnuPG executable, keyserver integration or server-side conversion is required.

The loading path is deliberately lazy:

```text
File Viewer starts
→ no rPGP Worker or WASM is loaded
→ an OpenPGP file is routed to renderer-signature
→ ./openpgp/client.js is dynamically imported
→ signature.worker.js is created
→ the Worker dynamically imports rpgp_wrapper.js
→ rpgp_wrapper_bg.wasm is initialized inside the Worker
```

The Rust wrapper intentionally exposes only three operations:

```text
classify_openpgp
inspect_openpgp
verify_detached_signature
```

It does not expose the low-level rPGP object model to JavaScript.

### OpenPGP scope

The current backend supports classification and bounded inspection of armored or binary OpenPGP messages, detached signatures, public keys, private-key blocks and unencrypted literal-data messages. Detached signatures can be verified with host/user-supplied public keys. Safely bounded unencrypted literal data can be passed to File Viewer's nested renderer mechanism.

Encrypted messages are inspection-only. Compressed messages are not recursively expanded unless a future implementation can enforce strict decompressed-output limits. Private-key blocks expose only public metadata derived from the key; secret MPIs, private scalars, passphrases and session keys are never returned to TypeScript.

Signing, key generation, private-key unlocking and message decryption are intentionally not exposed in this phase.

Host applications may supply public keys with `options.signature.openPgpPublicKeys`. Detached original content continues to use `options.signature.originalContent`.

## Default OpenPGP resource limits

The browser client applies conservative defaults before sending work to WASM:

| Limit | Default |
| --- | ---: |
| input | 32 MiB |
| extracted output | 16 MiB |
| packet count | 4096 |
| nesting depth | 16 |
| user IDs | 128 |
| subkeys | 128 |
| signatures | 256 |

They can be overridden with `options.signature.openPgpLimits`. The Rust boundary revalidates input size and bounds returned literal data. No untrusted input is intentionally processed on the main UI thread beyond lightweight routing hints.

## CMS and timestamp behavior

The existing browser-local CMS/timestamp implementation can inspect CMS `SignedData`, certificate-only containers and CRLs, parse DER and CMS PEM, recognize CAdES `signingCertificateV2`, verify supported RSA/ECDSA signatures using Web Crypto, compare detached `messageDigest` values, inspect RFC 3161 requests/responses/tokens, and inspect RFC 5544 `TimeStampedData` with embedded or external content.

External RFC 5544 `dataUri` values are displayed as untrusted metadata and are never fetched automatically.

## Security and validation boundary

Successful parsing is not signature verification. Successful cryptographic verification is not certificate/key trust, policy compliance, identity assurance, qualified-signature status or legal validity. The issue #206 CMS/timestamp fixture CA is synthetic and deliberately untrusted.

The OpenPGP Worker never persists keys or file contents, never performs automatic network lookup and can be terminated through the renderer client cleanup path. The first rPGP phase avoids private-key cryptographic operations; this also avoids depending on private-key RSA operations for which upstream RustCrypto/rPGP documentation requires additional side-channel consideration.

## Building the rPGP WASM backend

A Rust toolchain is required only when building the optional OpenPGP backend:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
pnpm --filter @file-viewer/renderer-signature build:wasm
```

`wasm-opt` is optional; when installed, the build script applies `-Oz`. The script generates `rust/Cargo.lock` if it does not exist, then performs a locked release build and reports raw and Brotli WASM size.

The regular TypeScript type-check does not require Rust:

```bash
pnpm --filter @file-viewer/renderer-signature type-check
```

## Verification

The repository contains the contributed non-secret CMS/timestamp fixture corpus under `test/fixtures/github-206-contributed`.

```bash
pnpm --filter @file-viewer/renderer-signature verify:github-206
pnpm --filter @file-viewer/renderer-signature verify:fixtures
pnpm --filter @file-viewer/renderer-signature verify:openpgp
```

`verify:openpgp` checks the lazy Worker/WASM boundary, pinned rPGP configuration, absence of OpenPGP.js imports/dependencies, absence of GnuPG invocation, restricted wrapper API and TypeScript content-detection behavior. Runtime rPGP fixture tests require the WASM backend to be built first.

## Third-party licensing

The Rust backend uses the permissively licensed rPGP `pgp` crate. See `THIRD_PARTY_NOTICES.md`. This renderer must not add or bundle LGPL OpenPGP code.
