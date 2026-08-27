# File Viewer issue #206 - non-secret CMS and timestamp fixtures

This package is intended for the first implementation phase requested in
`flyfish-dev/file-viewer#206`: CMS/PKCS#7/CAdES-adjacent container inspection
and RFC 3161 / RFC 5544 timestamp inspection. Every document and identity is
synthetic. The root CA is intentionally untrusted, and no private key is
included.

## Best first fixtures

| Fixture | Expected interpretation | Main behavior to test |
|---|---|---|
| `cms/invoice-encapsulated.pdf.p7m` | CMS SignedData, DER, one RSA signer, encapsulated PDF | Parse metadata, verify signature, extract and nested-preview the PDF |
| `cms/invoice-cades-bes.pdf.p7m` | CAdES-BES SignedData with `signingCertificateV2` | Detect CAdES attribute, verify, extract and preview the PDF |
| `cms/invoice-encapsulated.cmsc` | Same DER CMS bytes under `.cmsc` | Route by content and support the alias extension |
| `cms/invoice-detached.pdf.p7s` + `originals/invoice.pdf` | CMS detached signature | Ask for original; matching original verifies |
| same `.p7s` + `originals/invoice-tampered.pdf` | Negative detached-signature case | Digest/signature comparison must fail clearly |
| `cms/xml-encapsulated-but-named.p7s` | Encapsulated SignedData despite `.p7s` | Detect structure from content, not extension |
| `cms/hello-multi-signer.p7m` | Two signers: RSA/SHA-384 and ECDSA/SHA-384 | Display and verify every signer |
| `cms/invoice-double-signed.p7m` | Nested SignedData | Verify/extract outer P7M, then verify/extract inner PDF |
| `cms/certificate-chain.p7b` | Certificates-only PKCS#7 | Show certificates; do not label it a signed document |
| `cms/certificate-chain-with-crl.p7c` | Certificates-only PKCS#7 plus CRL | Show certificates and included CRL |
| `cms/certificate-only-misnamed.p7m` | Same certificates-only content with misleading extension | Content detection must override extension |
| `timestamps/invoice-sha256.tsq` | RFC 3161 request with nonce and `certReq` | Show imprint, algorithm, nonce, policy request fields |
| `timestamps/invoice-sha256.tsr` | Granted RFC 3161 response | Show status and contained token; match `invoice.pdf` |
| `timestamps/invoice-sha256.tst` | Standalone RFC 3161 token | Show TSA, generation time, policy, serial, imprint and certs |
| `timestamps/hello-sha384-no-nonce.*` | SHA-384 request/response/token without nonce | Correctly handle optional nonce absence |
| `timestamps/invoice-embedded.tsd` | RFC 5544 TimeStampedData with embedded PDF | Extract PDF, inspect temporal evidence, nested-preview PDF |
| `timestamps/invoice-external-content.tsd` | RFC 5544 TimeStampedData with `dataUri`, no content | Never fetch automatically; request supplied original |
| `timestamps/rejected-bad-alg.tsr` | RFC 3161 rejection, no token | Show status text and `badAlg` failure information |
| `negative/truncated-signed-data.p7m` | Truncated DER | Bounded, user-friendly parse error |
| `negative/plain-text-with-p7s-extension.p7s` | Not CMS at all | Reject by content detection |

## Public trust and legal-validity expectations

A successful cryptographic check means only that the bytes match the signature
or message imprint and that the test signature verifies under the supplied test
root. The viewer should separately report that this synthetic root is not in a
system trust store and should not imply legal validity.

## Verification commands

From the package root:

```bash
./scripts/verify_all.sh
```

Representative commands:

```bash
# Extract and verify encapsulated CMS
openssl cms -verify -binary -inform DER \
  -in cms/invoice-encapsulated.pdf.p7m \
  -CAfile certificates/test-root-ca.pem -purpose any \
  -out /tmp/extracted-invoice.pdf

# Verify CAdES-BES and its signing-certificate attribute
openssl cms -verify -cades -binary -inform DER \
  -in cms/invoice-cades-bes.pdf.p7m \
  -CAfile certificates/test-root-ca.pem -purpose any \
  -out /tmp/extracted-cades-invoice.pdf

# Verify detached CMS
openssl cms -verify -binary -inform DER \
  -in cms/invoice-detached.pdf.p7s \
  -content originals/invoice.pdf \
  -CAfile certificates/test-root-ca.pem -purpose any \
  -out /dev/null

# Inspect certificates-only PKCS#7
openssl pkcs7 -inform DER -in cms/certificate-chain-with-crl.p7c \
  -print_certs -text -noout

# Inspect and verify RFC 3161 response
openssl ts -reply -in timestamps/invoice-sha256.tsr -text
openssl ts -verify -data originals/invoice.pdf \
  -in timestamps/invoice-sha256.tsr \
  -CAfile certificates/test-root-ca.pem \
  -untrusted certificates/test-tsa.pem
```

## Generation profile

- Synthetic root CA: RSA 2048, SHA-256, CA=true.
- CMS Alice: RSA 2048; Bob: ECDSA P-256.
- TSA: RSA 2048; critical EKU contains only `timeStamping`.
- CMS fixtures use DER except the explicitly named PEM variant.
- Timestamp queries/responses/tokens are DER.
- RFC 5544 fixtures use `id-ct-timestampedData` (`1.2.840.113549.1.9.16.1.31`).
- TSD metadata has `hashProtected = FALSE`; therefore the first timestamp token
  covers the content octets, not the metadata.
