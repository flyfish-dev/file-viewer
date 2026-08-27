from pathlib import Path
import sys

source = Path(sys.argv[1] if len(sys.argv) > 1 else "source")

# TypeScript 6 tightened BufferSource typing around ArrayBuffer vs ArrayBufferLike.
# Copy inputs into fresh ArrayBuffers at the WebCrypto boundary.
ts_path = source / "packages/renderers/signature/src/signatureAsn1.ts"
ts = ts_path.read_text()
needle = "const subtleCrypto = () => globalThis.crypto?.subtle;\n"
replacement = needle + "\nconst webCryptoBuffer = (bytes: Uint8Array): ArrayBuffer => {\n  const copy = new Uint8Array(bytes.byteLength);\n  copy.set(bytes);\n  return copy.buffer;\n};\n"
if needle not in ts:
    raise SystemExit("signatureAsn1.ts: subtleCrypto anchor not found")
ts = ts.replace(needle, replacement, 1)
ts = ts.replace("subtle.digest(algorithm, bytes)", "subtle.digest(algorithm, webCryptoBuffer(bytes))")
ts = ts.replace("subtle.importKey('spki', certificate.spki, algorithm", "subtle.importKey('spki', webCryptoBuffer(certificate.spki), algorithm")
ts = ts.replace("'spki',\n        certificate.spki,", "'spki',\n        webCryptoBuffer(certificate.spki),")
ts = ts.replace("subtle.importKey('spki', certificate.spki, { name: 'Ed25519' }", "subtle.importKey('spki', webCryptoBuffer(certificate.spki), { name: 'Ed25519' }")
ts = ts.replace("        signer.signature,\n        signedInput", "        webCryptoBuffer(signer.signature),\n        webCryptoBuffer(signedInput)")
ts = ts.replace("        ecdsaDerToRaw(signer.signature, coordinateLength),\n        signedInput", "        webCryptoBuffer(ecdsaDerToRaw(signer.signature, coordinateLength)),\n        webCryptoBuffer(signedInput)")
ts = ts.replace("subtle.verify('Ed25519', key, signer.signature, signedInput)", "subtle.verify('Ed25519', key, webCryptoBuffer(signer.signature), webCryptoBuffer(signedInput))")
ts = ts.replace("subtle.digest('SHA-256', fullBytes(bytes, certificate.node))", "subtle.digest('SHA-256', webCryptoBuffer(fullBytes(bytes, certificate.node)))")
ts_path.write_text(ts)

# rPGP 0.20.0 Timestamp is intentionally not Display; use seconds since epoch.
# Literal-data filenames are Bytes and may be non-UTF8, so expose a lossy display string only.
rust_path = source / "packages/renderers/signature/rust/src/inspect.rs"
rust = rust_path.read_text()
rust = rust.replace("subkey.created_at().to_string()", "subkey.created_at().as_secs().to_string()")
rust = rust.replace("key.created_at().to_string()", "key.created_at().as_secs().to_string()")
rust = rust.replace(
    ".map(|value| value.file_name().to_owned())\n                    .filter(|value| !value.is_empty()),",
    ".map(|value| String::from_utf8_lossy(value.file_name().as_ref()).into_owned())\n                    .filter(|value| !value.is_empty()),",
)
rust_path.write_text(rust)

# The committed CMS fixture embeds CRLF line endings. Make the expected original
# byte-identical so the verification script's byte-for-byte assertion is meaningful.
hello_path = source / "packages/renderers/signature/test/fixtures/github-206-contributed/originals/hello.txt"
hello_path.write_bytes(
    b"File Viewer issue 206 synthetic fixture\r\n"
    b"This content is signed by two test signers.\r\n"
)

print("Applied isolated rendition-dss candidate fixes")
