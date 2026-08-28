mod classify;
mod errors;
mod inspect;
mod limits;
mod types;

use std::io::Cursor;

use pgp::composed::{Deserializable, DetachedSignature};
use pgp::types::KeyDetails as _;
use wasm_bindgen::prelude::*;

use crate::errors::js_error;
use crate::limits::{validate_input, validate_limits};
use crate::types::{ParseLimits, VerificationResult};

fn parse_limits(value: JsValue) -> Result<ParseLimits, JsValue> {
    let limits: ParseLimits = serde_wasm_bindgen::from_value(value)
        .map_err(|error| js_error("invalid-input", format!("Invalid parse limits: {error}")))?;
    validate_limits(&limits)?;
    Ok(limits)
}

fn to_js<T: serde::Serialize>(value: &T) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(value).map_err(|error| {
        js_error(
            "internal-parser-error",
            format!("Serialization failed: {error}"),
        )
    })
}

fn parse_public_key_inputs(value: JsValue, limits: &ParseLimits) -> Result<Vec<Vec<u8>>, JsValue> {
    let keys: Vec<Vec<u8>> = serde_wasm_bindgen::from_value(value)
        .map_err(|error| js_error("invalid-input", format!("Invalid public key list: {error}")))?;
    if keys.len() > 64 {
        return Err(js_error(
            "input-too-large",
            "At most 64 public-key files are accepted.",
        ));
    }
    let mut aggregate_key_bytes = 0usize;
    for key in &keys {
        aggregate_key_bytes = aggregate_key_bytes
            .checked_add(key.len())
            .ok_or_else(|| js_error("input-too-large", "Public-key aggregate size overflowed."))?;
        if key.len() > limits.max_input_bytes || aggregate_key_bytes > limits.max_input_bytes {
            return Err(js_error(
                "input-too-large",
                "Public-key material exceeds the configured aggregate limit.",
            ));
        }
    }
    Ok(keys)
}

#[wasm_bindgen]
pub fn classify_openpgp(input: &[u8], limits: JsValue) -> Result<JsValue, JsValue> {
    let limits = parse_limits(limits)?;
    validate_input(input, &limits)?;
    to_js(&inspect::inspect(input, &[], &limits, false)?)
}

#[wasm_bindgen]
pub fn inspect_openpgp(
    input: &[u8],
    public_keys: JsValue,
    limits: JsValue,
) -> Result<JsValue, JsValue> {
    let limits = parse_limits(limits)?;
    validate_input(input, &limits)?;
    let key_inputs = parse_public_key_inputs(public_keys, &limits)?;
    let keys = inspect::verification_keys(&key_inputs, &limits)?;
    to_js(&inspect::inspect(input, &keys, &limits, true)?)
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
        return Err(js_error(
            "input-too-large",
            "Original content exceeds the configured input limit.",
        ));
    }
    let key_inputs = parse_public_key_inputs(public_keys, &limits)?;
    if key_inputs.is_empty() {
        return to_js(&VerificationResult {
            status: "public-key-required".into(),
            valid: None,
            key_fingerprint: None,
            key_id: None,
            error: None,
        });
    }

    let (detached, _) = DetachedSignature::from_reader_single(Cursor::new(signature.to_vec()))
        .map_err(|error| {
            js_error(
                "malformed-packet",
                format!("Detached signature parsing failed: {error}"),
            )
        })?;

    let keys = inspect::verification_keys(&key_inputs, &limits)?;
    if keys.is_empty() {
        return to_js(&VerificationResult {
            status: "public-key-required".into(),
            valid: None,
            key_fingerprint: None,
            key_id: None,
            error: Some("No valid public verification key was supplied.".into()),
        });
    }
    let mut last_error = None;
    for key in keys {
        match detached.verify(&key, content) {
            Ok(()) => {
                return to_js(&VerificationResult {
                    status: "signature-valid".into(),
                    valid: Some(true),
                    key_fingerprint: Some(key.fingerprint().to_string()),
                    key_id: Some(key.legacy_key_id().to_string()),
                    error: None,
                });
            }
            Err(error) => last_error = Some(error.to_string()),
        }
        for subkey in &key.public_subkeys {
            match detached.verify(subkey, content) {
                Ok(()) => {
                    return to_js(&VerificationResult {
                        status: "signature-valid".into(),
                        valid: Some(true),
                        key_fingerprint: Some(subkey.fingerprint().to_string()),
                        key_id: Some(subkey.legacy_key_id().to_string()),
                        error: None,
                    });
                }
                Err(error) => last_error = Some(error.to_string()),
            }
        }
    }

    to_js(&VerificationResult {
        status: "signature-invalid".into(),
        valid: Some(false),
        key_fingerprint: None,
        key_id: None,
        error: last_error,
    })
}
