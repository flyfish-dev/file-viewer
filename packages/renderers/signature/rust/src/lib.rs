mod classify;
mod errors;
mod inspect;
mod limits;
mod types;

use std::io::Cursor;

use pgp::composed::{Deserializable, DetachedSignature, SignedPublicKey};
use pgp::types::KeyDetails as _;
use wasm_bindgen::prelude::*;

use crate::errors::js_error;
use crate::limits::validate_input;
use crate::types::{ParseLimits, VerificationResult};

fn parse_limits(value: JsValue) -> Result<ParseLimits, JsValue> {
    serde_wasm_bindgen::from_value(value)
        .map_err(|error| js_error("invalid-input", format!("Invalid parse limits: {error}")))
}

fn to_js<T: serde::Serialize>(value: &T) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(value)
        .map_err(|error| js_error("internal-parser-error", format!("Serialization failed: {error}")))
}

#[wasm_bindgen]
pub fn classify_openpgp(input: &[u8], limits: JsValue) -> Result<JsValue, JsValue> {
    let limits = parse_limits(limits)?;
    validate_input(input, &limits)?;
    to_js(&inspect::inspect(input, &limits, false)?)
}

#[wasm_bindgen]
pub fn inspect_openpgp(input: &[u8], limits: JsValue) -> Result<JsValue, JsValue> {
    let limits = parse_limits(limits)?;
    validate_input(input, &limits)?;
    to_js(&inspect::inspect(input, &limits, true)?)
}

#[wasm_bindgen]
pub fn verify_detached_signature(
    content: &[u8],
    signature: &[u8],
    public_keys: JsValue,
    limits: JsValue,
) -> Result<JsValue, JsValue> {
    let limits = parse_limits(limits)?;
    validate_input(signature, &limits)?;
    if content.len() > limits.max_input_bytes {
        return Err(js_error("input-too-large", "Original content exceeds the configured input limit."));
    }
    let keys: Vec<Vec<u8>> = serde_wasm_bindgen::from_value(public_keys)
        .map_err(|error| js_error("invalid-input", format!("Invalid public key list: {error}")))?;
    if keys.is_empty() {
        return to_js(&VerificationResult {
            status: "public-key-required".into(), valid: None,
            key_fingerprint: None, key_id: None, error: None,
        });
    }

    let (detached, _) = DetachedSignature::from_reader_single(Cursor::new(signature.to_vec()))
        .map_err(|error| js_error("malformed-packet", format!("Detached signature parsing failed: {error}")))?;

    let mut last_error = None;
    for key_bytes in keys.into_iter().take(limits.max_subkeys.max(1)) {
        let Ok((iter, _headers)) = SignedPublicKey::from_reader_many(Cursor::new(key_bytes)) else {
            continue;
        };
        for key in iter.filter_map(Result::ok).take(limits.max_subkeys.max(1)) {
            match detached.verify(&key, content) {
                Ok(()) => {
                    return to_js(&VerificationResult {
                        status: "signature-valid".into(), valid: Some(true),
                        key_fingerprint: Some(key.fingerprint().to_string()),
                        key_id: Some(key.legacy_key_id().to_string()), error: None,
                    });
                }
                Err(error) => last_error = Some(error.to_string()),
            }
        }
    }

    to_js(&VerificationResult {
        status: "signature-invalid".into(), valid: Some(false),
        key_fingerprint: None, key_id: None, error: last_error,
    })
}
