use std::io::Cursor;

use pgp::composed::{Deserializable, DetachedSignature, Message, SignedPublicKey, SignedSecretKey};
use pgp::types::KeyDetails as _;

use crate::classify::{armor_type, likely_binary_openpgp};
use crate::errors::js_error;
use crate::types::{InspectionResult, KeySummary, LiteralData, ParseLimits, SubkeySummary};
use wasm_bindgen::JsValue;

fn key_summary(key: &SignedPublicKey, kind: &str, limits: &ParseLimits) -> KeySummary {
    let user_ids = key.details.users.iter()
        .take(limits.max_user_ids)
        .map(|user| String::from_utf8_lossy(user.id.id()).into_owned())
        .collect();
    let subkeys = key.public_subkeys.iter().take(limits.max_subkeys).map(|subkey| SubkeySummary {
        fingerprint: Some(subkey.fingerprint().to_string()),
        key_id: Some(subkey.legacy_key_id().to_string()),
        algorithm: Some(format!("{:?}", subkey.algorithm())),
        created_at: Some(subkey.created_at().as_secs().to_string()),
    }).collect();
    KeySummary {
        kind: kind.to_owned(),
        version: Some(format!("{:?}", key.version())),
        fingerprint: Some(key.fingerprint().to_string()),
        key_id: Some(key.legacy_key_id().to_string()),
        algorithm: Some(format!("{:?}", key.algorithm())),
        created_at: Some(key.created_at().as_secs().to_string()),
        user_ids,
        subkeys,
    }
}

fn public_keys(input: &[u8], limits: &ParseLimits) -> Vec<KeySummary> {
    let Ok((iter, _headers)) = SignedPublicKey::from_reader_many(Cursor::new(input.to_vec())) else {
        return Vec::new();
    };
    iter.filter_map(Result::ok)
        .take(limits.max_subkeys.max(1))
        .map(|key| key_summary(&key, "public", limits))
        .collect()
}

fn secret_keys(input: &[u8], limits: &ParseLimits) -> Vec<KeySummary> {
    let Ok((iter, _headers)) = SignedSecretKey::from_reader_many(Cursor::new(input.to_vec())) else {
        return Vec::new();
    };
    iter.filter_map(Result::ok)
        .take(limits.max_subkeys.max(1))
        .map(|key| key_summary(&key.to_public_key(), "private", limits))
        .collect()
}

fn detached_signature(input: &[u8]) -> bool {
    DetachedSignature::from_reader_single(Cursor::new(input.to_vec())).is_ok()
}

pub fn inspect(input: &[u8], limits: &ParseLimits, include_literal: bool) -> Result<InspectionResult, JsValue> {
    let armor = armor_type(input);
    let armored = armor.is_some();

    let public = public_keys(input, limits);
    if !public.is_empty() {
        return Ok(InspectionResult {
            classification: "public-key".into(), armored, armor_type: armor.map(str::to_owned),
            packet_types: vec!["public-key".into()], packet_count: public.len(), encrypted: false,
            integrity_protected: None, compressed: false, keys: public, signatures: vec![], recipients: vec![],
            literal_data: None, warnings: vec![],
        });
    }

    let private = secret_keys(input, limits);
    if !private.is_empty() {
        return Ok(InspectionResult {
            classification: "private-key".into(), armored, armor_type: armor.map(str::to_owned),
            packet_types: vec!["secret-key".into()], packet_count: private.len(), encrypted: false,
            integrity_protected: None, compressed: false, keys: private, signatures: vec![], recipients: vec![],
            literal_data: None,
            warnings: vec!["Private-key material was parsed only to derive public metadata; secret fields are never returned to JavaScript.".into()],
        });
    }

    if detached_signature(input) {
        return Ok(InspectionResult {
            classification: "detached-signature".into(), armored, armor_type: armor.map(str::to_owned),
            packet_types: vec!["signature".into()], packet_count: 1, encrypted: false,
            integrity_protected: None, compressed: false, keys: vec![], signatures: vec![], recipients: vec![],
            literal_data: None, warnings: vec!["Supply original content and a public key to verify this detached signature.".into()],
        });
    }

    if let Ok((mut message, _headers)) = Message::from_reader(Cursor::new(input.to_vec())) {
        let encrypted = message.is_encrypted();
        let compressed = message.is_compressed();
        let signed = message.is_signed() || message.is_one_pass_signed();
        let literal = message.is_literal();
        let classification = if encrypted { "encrypted-message" }
            else if compressed { "compressed-data" }
            else if literal { "literal-data" }
            else if signed { "message" }
            else { "message" };
        let mut warnings = Vec::new();
        let literal_data = if include_literal && literal {
            let header = message.literal_data_header().cloned();
            let mut data = Vec::new();
            use std::io::Read as _;
            let read_limit = (limits.max_output_bytes as u64).saturating_add(1);
            message.take(read_limit).read_to_end(&mut data)
                .map_err(|error| js_error("internal-parser-error", error.to_string()))?;
            if data.len() > limits.max_output_bytes {
                return Err(js_error("output-too-large", "Literal data exceeds the configured output limit."));
            }
            Some(LiteralData {
                filename: header
                    .as_ref()
                    .map(|value| String::from_utf8_lossy(value.file_name().as_ref()).into_owned())
                    .filter(|value| !value.is_empty()),
                format: None,
                media_type: None,
                data,
            })
        } else {
            if compressed { warnings.push("Compressed OpenPGP content is not automatically decompressed in the first phase.".into()); }
            if encrypted { warnings.push("Encrypted OpenPGP content is inspection-only; private-key decryption is not supported.".into()); }
            None
        };
        return Ok(InspectionResult {
            classification: classification.into(), armored, armor_type: armor.map(str::to_owned),
            packet_types: vec![classification.into()], packet_count: 1, encrypted,
            integrity_protected: None, compressed, keys: vec![], signatures: vec![], recipients: vec![],
            literal_data, warnings,
        });
    }

    if armor == Some("cleartext-signed-message") {
        return Ok(InspectionResult {
            classification: "cleartext-signed-message".into(), armored: true,
            armor_type: armor.map(str::to_owned), packet_types: vec!["cleartext-signature".into()], packet_count: 1,
            encrypted: false, integrity_protected: None, compressed: false, keys: vec![], signatures: vec![],
            recipients: vec![], literal_data: None,
            warnings: vec!["Cleartext signed messages are classified in this phase; detached public-key verification is the first verification path.".into()],
        });
    }

    let classification = if armored || likely_binary_openpgp(input) { "unknown-openpgp" } else { "invalid-openpgp" };
    Ok(InspectionResult {
        classification: classification.into(), armored, armor_type: armor.map(str::to_owned),
        packet_types: vec![], packet_count: 0, encrypted: false, integrity_protected: None,
        compressed: false, keys: vec![], signatures: vec![], recipients: vec![], literal_data: None,
        warnings: vec!["The input could not be mapped to a supported composed rPGP object.".into()],
    })
}
