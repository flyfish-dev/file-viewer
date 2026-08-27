I prepared and attached a synthetic, non-secret fixture pack for the first
CMS/timestamp phase.

It includes:

- CMS SignedData in DER and PEM form;
- encapsulated PDF and detached PDF signature with matching and altered originals;
- a CAdES-BES fixture containing `signingCertificateV2`;
- two-signer and nested/repeated-signature cases;
- certificates-only PKCS#7 containers, including one with a CRL and one with a
  deliberately misleading `.p7m` extension;
- RFC 3161 `.tsq`, `.tsr`, and `.tst` fixtures with SHA-256/SHA-384, nonce
  present/absent, granted and rejected responses;
- RFC 5544 `.tsd` fixtures with embedded content and external content via a
  non-resolvable `example.invalid` URI;
- truncated and wrong-content negative cases.

All documents and identities are synthetic. The root CA is test-only and
untrusted, no private keys are included, and the fixtures are marked CC0-1.0.
The included `scripts/verify_all.sh` passes with OpenSSL 3.5.5.
