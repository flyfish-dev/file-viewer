//! Browser-native CHM parser and random-access LZX reader.
//!
//! The container/LZX implementation is adapted from the MIT clean-room RustChm and
//! FastChm projects. The public wrapper adds bounded allocations, HTML Help metadata,
//! sitemap parsing, binary TOC/index discovery, and a `wasm-bindgen` API.

mod chm;
mod core;
mod error;
mod lzx;
mod metadata;
mod sitemap;

pub use core::{ArchiveCore, ArchiveEntry, Limits, Manifest};
pub use error::{CoreError, CoreResult};

#[cfg(target_arch = "wasm32")]
mod wasm {
    use serde::Serialize;
    use wasm_bindgen::prelude::*;

    use crate::{ArchiveCore, CoreError, Limits};

    fn js_error(error: CoreError) -> JsValue {
        js_sys_error(&format!("{}: {}", error.code(), error))
    }

    fn js_sys_error(message: &str) -> JsValue {
        js_sys::Error::new(message).into()
    }

    fn serialize<T: Serialize + ?Sized>(value: &T) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(value)
            .map_err(|error| js_sys_error(&format!("CHM_SERIALIZE: {error}")))
    }

    /// A parsed CHM archive whose bytes remain private to the WASM instance.
    #[wasm_bindgen]
    pub struct ChmArchive {
        inner: Option<ArchiveCore>,
    }

    #[wasm_bindgen]
    impl ChmArchive {
        /// Validate and open an archive. `limits` is an optional JS object using
        /// camelCase fields from [`Limits`].
        #[wasm_bindgen(constructor)]
        pub fn new(bytes: Vec<u8>, limits: Option<JsValue>) -> Result<ChmArchive, JsValue> {
            let limits = match limits {
                Some(value) if !value.is_null() && !value.is_undefined() => {
                    serde_wasm_bindgen::from_value(value)
                        .map_err(|error| js_sys_error(&format!("CHM_BAD_LIMITS: {error}")))?
                }
                _ => Limits::default(),
            };
            let inner = ArchiveCore::open(bytes, limits).map_err(js_error)?;
            Ok(Self { inner: Some(inner) })
        }

        /// Return renderer-ready metadata, topics, contents and keyword index.
        pub fn manifest(&mut self) -> Result<JsValue, JsValue> {
            let inner = self
                .inner
                .as_mut()
                .ok_or_else(|| js_sys_error("CHM_DISPOSED: archive is disposed"))?;
            serialize(inner.manifest().map_err(js_error)?)
        }

        /// Return the complete bounded directory listing.
        pub fn entries(&self) -> Result<JsValue, JsValue> {
            let inner = self
                .inner
                .as_ref()
                .ok_or_else(|| js_sys_error("CHM_DISPOSED: archive is disposed"))?;
            serialize(inner.entries())
        }

        /// Read one internal path. Compressed entries are decoded by reset block and
        /// cached, so sequential topic/assets do not inflate the entire CHM.
        pub fn read(&mut self, path: &str) -> Result<Box<[u8]>, JsValue> {
            let inner = self
                .inner
                .as_mut()
                .ok_or_else(|| js_sys_error("CHM_DISPOSED: archive is disposed"))?;
            inner
                .read(path)
                .map(Vec::into_boxed_slice)
                .map_err(js_error)
        }

        /// Release archive bytes and all decompression caches immediately.
        pub fn dispose(&mut self) {
            self.inner = None;
        }

        #[wasm_bindgen(getter, js_name = disposed)]
        pub fn is_disposed(&self) -> bool {
            self.inner.is_none()
        }
    }
}

#[cfg(target_arch = "wasm32")]
pub use wasm::ChmArchive;
