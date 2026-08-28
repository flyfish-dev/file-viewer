#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ok() { printf '[OK] %s\n' "$1"; }

openssl cms -verify -binary -inform DER \
  -in "$ROOT/cms/invoice-encapsulated.pdf.p7m" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out "$TMP/invoice.pdf" >/dev/null 2>&1
cmp "$TMP/invoice.pdf" "$ROOT/originals/invoice.pdf"
ok 'encapsulated PDF CMS verifies and extracts byte-for-byte'

openssl cms -verify -cades -binary -inform DER \
  -in "$ROOT/cms/invoice-cades-bes.pdf.p7m" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out "$TMP/invoice-cades.pdf" >/dev/null 2>&1
cmp "$TMP/invoice-cades.pdf" "$ROOT/originals/invoice.pdf"
ok 'CAdES-BES fixture verifies and extracts byte-for-byte'

openssl cms -verify -binary -inform DER \
  -in "$ROOT/cms/invoice-detached.pdf.p7s" \
  -content "$ROOT/originals/invoice.pdf" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out /dev/null >/dev/null 2>&1
ok 'detached CMS verifies with the matching original'

if openssl cms -verify -binary -inform DER \
  -in "$ROOT/cms/invoice-detached.pdf.p7s" \
  -content "$ROOT/originals/invoice-tampered.pdf" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out /dev/null >/dev/null 2>&1; then
  echo '[FAIL] detached CMS unexpectedly verified against altered content' >&2
  exit 1
fi
ok 'detached CMS correctly rejects the altered original'

openssl cms -verify -binary -inform DER \
  -in "$ROOT/cms/hello-multi-signer.p7m" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out "$TMP/hello.txt" >/dev/null 2>&1
cmp "$TMP/hello.txt" "$ROOT/originals/hello.txt"
ok 'multi-signer CMS verifies and extracts content'

openssl cms -verify -binary -inform DER \
  -in "$ROOT/cms/invoice-double-signed.p7m" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out "$TMP/inner.p7m" >/dev/null 2>&1
openssl cms -verify -binary -inform DER \
  -in "$TMP/inner.p7m" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" -purpose any \
  -out "$TMP/nested-invoice.pdf" >/dev/null 2>&1
cmp "$TMP/nested-invoice.pdf" "$ROOT/originals/invoice.pdf"
ok 'nested CMS verifies through both layers'

openssl ts -verify -data "$ROOT/originals/invoice.pdf" \
  -in "$ROOT/timestamps/invoice-sha256.tsr" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" \
  -untrusted "$ROOT/certificates/test-tsa.pem" >/dev/null 2>&1
ok 'RFC 3161 response verifies against invoice.pdf'

openssl ts -verify -token_in -data "$ROOT/originals/invoice.pdf" \
  -in "$ROOT/timestamps/invoice-sha256.tst" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" \
  -untrusted "$ROOT/certificates/test-tsa.pem" >/dev/null 2>&1
ok 'standalone RFC 3161 token verifies against invoice.pdf'

if openssl ts -verify -data "$ROOT/originals/invoice-tampered.pdf" \
  -in "$ROOT/timestamps/invoice-sha256.tsr" \
  -CAfile "$ROOT/certificates/test-root-ca.pem" \
  -untrusted "$ROOT/certificates/test-tsa.pem" >/dev/null 2>&1; then
  echo '[FAIL] timestamp unexpectedly verified against altered content' >&2
  exit 1
fi
ok 'RFC 3161 response correctly rejects altered content'

openssl asn1parse -inform DER -in "$ROOT/timestamps/invoice-embedded.tsd" -noout >/dev/null
openssl asn1parse -inform DER -in "$ROOT/timestamps/invoice-external-content.tsd" -noout >/dev/null
ok 'RFC 5544 fixtures are structurally valid (content/imprint assertions run in verify:github-206)'

printf '\nAll expected positive and negative checks passed.\n'
