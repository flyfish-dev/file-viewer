# Third-party notices

`@file-viewer/renderer-signature` contains two optional third-party runtime closures:

- rPGP / Rust crate `pgp` 0.20.0 and its locked Cargo dependencies, compiled to WebAssembly. rPGP is MIT OR Apache-2.0; this distribution selects permissive license branches only.
- JSZip 3.10.1 and its npm runtime dependencies for bounded ASiC extraction after the package's own central-directory preflight. JSZip declares MIT OR GPL-3.0-or-later; this distribution uses it under the MIT option.

`THIRD_PARTY_LICENSES.json` records every exact Cargo and npm dependency version, declared expression, selected permissive branch, source/repository metadata, and deduplicated license text. The verification gate rejects a closure that has no permissive choice.

No LGPL, AGPL, or GPL-only runtime source is used. OpenPGP.js and GnuPG are not bundled or invoked.
