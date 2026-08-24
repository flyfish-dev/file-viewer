# Third-party notices

The optional OpenPGP backend uses **rPGP / `pgp` 0.20.0** when the WASM artifact is built.
rPGP is licensed under **MIT OR Apache-2.0**. See <https://github.com/rpgp/rpgp>.

No OpenPGP.js source or LGPL-licensed OpenPGP implementation is bundled by this renderer.
The exact transitive Rust dependency set is locked by `rust/Cargo.lock` when generated in a Rust-enabled build environment.
