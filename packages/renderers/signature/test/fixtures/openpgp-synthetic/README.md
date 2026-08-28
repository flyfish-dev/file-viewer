# Synthetic OpenPGP fixtures for issue #206

This directory contains synthetic Ed25519 signing keys with a cv25519
encryption subkey, public exports, detached signatures, cleartext-signed
messages, a compressed binary message with two embedded signatures, and an
encrypted-message fixture. The original single-signing-key fingerprint is
recorded in `FINGERPRINT`; `multi-public-keys.asc` contains the two public keys
used by both multi-signature fixtures.

Only public keys are committed. The ephemeral private keys used to generate
these fixtures were destroyed and are not part of this repository or any
package. Runtime tests use the public keys to verify detached, cleartext, and
compressed embedded signatures over the contributed CRLF `hello.txt` bytes,
and prove rejection of tampered content and configured parser budgets.

These fixtures exercise the permissively licensed rPGP WebAssembly backend.
The File Viewer runtime never invokes a desktop keyring or command-line crypto
tool and never performs automatic key discovery or network access.
