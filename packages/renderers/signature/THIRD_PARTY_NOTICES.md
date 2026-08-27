# Third-party notices

The optional OpenPGP backend uses **rPGP / `pgp` 0.20.0** when the WASM artifact is built.
rPGP is licensed under **MIT OR Apache-2.0**. See <https://github.com/rpgp/rpgp>.

The exact transitive Rust dependency set is committed in `rust/Cargo.lock`; builds fail closed when that lockfile is missing.
