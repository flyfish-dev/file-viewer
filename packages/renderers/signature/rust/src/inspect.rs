use std::io::{Cursor, Read};

use pgp::composed::{
    CleartextSignedMessage, Deserializable, DetachedSignature, Edata, Esk, Message,
    SignedPublicKey, SignedSecretKey,
};
use pgp::packet::{ProtectedDataConfig, Signature, SymEncryptedProtectedDataConfig};
use pgp::types::KeyDetails as _;

use crate::classify::{armor_type, likely_binary_openpgp};
use crate::errors::js_error;
use crate::types::{
    InspectionResult, KeySummary, LiteralData, ParseLimits, SignatureSummary, SubkeySummary,
};
use wasm_bindgen::JsValue;

fn enforce_count(
    value: usize,
    limit: usize,
    code: &'static str,
    label: &str,
) -> Result<(), JsValue> {
    if value > limit {
        return Err(js_error(
            code,
            format!("{label} count {value} exceeds the configured limit {limit}."),
        ));
    }
    Ok(())
}

fn key_signature_count(key: &SignedPublicKey) -> usize {
    key.details.revocation_signatures.len()
        + key.details.direct_signatures.len()
        + key
            .details
            .users
            .iter()
            .map(|user| user.signatures.len())
            .sum::<usize>()
        + key
            .details
            .user_attributes
            .iter()
            .map(|attribute| attribute.signatures.len())
            .sum::<usize>()
        + key
            .public_subkeys
            .iter()
            .map(|subkey| subkey.signatures.len())
            .sum::<usize>()
}

fn key_packet_count(key: &SignedPublicKey) -> usize {
    1 + key.details.users.len()
        + key.details.user_attributes.len()
        + key.public_subkeys.len()
        + key_signature_count(key)
}

fn validate_key_shape(key: &SignedPublicKey, limits: &ParseLimits) -> Result<(), JsValue> {
    enforce_count(
        key.details.users.len(),
        limits.max_user_ids,
        "packet-limit-exceeded",
        "OpenPGP user ID",
    )?;
    enforce_count(
        key.public_subkeys.len(),
        limits.max_subkeys,
        "packet-limit-exceeded",
        "OpenPGP subkey",
    )?;
    enforce_count(
        key_signature_count(key),
        limits.max_signatures,
        "packet-limit-exceeded",
        "OpenPGP key signature",
    )?;
    enforce_count(
        key_packet_count(key),
        limits.max_packet_count,
        "packet-limit-exceeded",
        "OpenPGP packet",
    )
}

fn key_summary(key: &SignedPublicKey, kind: &str, limits: &ParseLimits) -> KeySummary {
    let user_ids = key
        .details
        .users
        .iter()
        .take(limits.max_user_ids)
        .map(|user| String::from_utf8_lossy(user.id.id()).into_owned())
        .collect();
    let subkeys = key
        .public_subkeys
        .iter()
        .take(limits.max_subkeys)
        .map(|subkey| SubkeySummary {
            fingerprint: Some(subkey.fingerprint().to_string()),
            key_id: Some(subkey.legacy_key_id().to_string()),
            algorithm: Some(format!("{:?}", subkey.algorithm())),
            created_at: Some(subkey.created_at().as_secs().to_string()),
        })
        .collect();
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

fn parse_public_keys(input: &[u8], limits: &ParseLimits) -> Result<Vec<SignedPublicKey>, JsValue> {
    let Ok((iter, _headers)) = SignedPublicKey::from_reader_many(Cursor::new(input.to_vec()))
    else {
        return Ok(Vec::new());
    };
    let mut keys = Vec::new();
    for parsed in iter {
        let key = parsed.map_err(|error| js_error("malformed-packet", error.to_string()))?;
        enforce_count(
            keys.len() + 1,
            limits.max_subkeys,
            "packet-limit-exceeded",
            "OpenPGP public key",
        )?;
        validate_key_shape(&key, limits)?;
        keys.push(key);
    }
    Ok(keys)
}

pub fn verification_keys(
    inputs: &[Vec<u8>],
    limits: &ParseLimits,
) -> Result<Vec<SignedPublicKey>, JsValue> {
    let mut keys = Vec::new();
    for input in inputs {
        if keys.len() >= limits.max_subkeys {
            return Err(js_error(
                "packet-limit-exceeded",
                "OpenPGP verification key count exceeds the configured subkey limit.",
            ));
        }
        let mut parsed = parse_public_keys(input, limits)?;
        enforce_count(
            keys.len() + parsed.len(),
            limits.max_subkeys,
            "packet-limit-exceeded",
            "OpenPGP verification key",
        )?;
        keys.append(&mut parsed);
    }
    enforce_count(
        keys.iter().map(key_packet_count).sum(),
        limits.max_packet_count,
        "packet-limit-exceeded",
        "OpenPGP verification-key packet",
    )?;
    enforce_count(
        keys.iter().map(key_signature_count).sum(),
        limits.max_signatures,
        "packet-limit-exceeded",
        "OpenPGP verification-key signature",
    )?;
    enforce_count(
        keys.iter().map(|key| key.details.users.len()).sum(),
        limits.max_user_ids,
        "packet-limit-exceeded",
        "OpenPGP verification-key user ID",
    )?;
    enforce_count(
        keys.iter().map(|key| key.public_subkeys.len()).sum(),
        limits.max_subkeys,
        "packet-limit-exceeded",
        "OpenPGP verification-key subkey",
    )?;
    Ok(keys)
}

fn secret_keys(input: &[u8], limits: &ParseLimits) -> Result<(Vec<KeySummary>, usize), JsValue> {
    let Ok((iter, _headers)) = SignedSecretKey::from_reader_many(Cursor::new(input.to_vec()))
    else {
        return Ok((Vec::new(), 0));
    };
    let mut summaries = Vec::new();
    let mut packet_count = 0usize;
    let mut signature_count = 0usize;
    let mut user_id_count = 0usize;
    let mut subkey_count = 0usize;
    for parsed in iter {
        let key = parsed.map_err(|error| js_error("malformed-packet", error.to_string()))?;
        let public = key.to_public_key();
        validate_key_shape(&public, limits)?;
        enforce_count(
            summaries.len() + 1,
            limits.max_subkeys,
            "packet-limit-exceeded",
            "OpenPGP private key",
        )?;
        packet_count = packet_count.saturating_add(key_packet_count(&public));
        signature_count = signature_count.saturating_add(key_signature_count(&public));
        user_id_count = user_id_count.saturating_add(public.details.users.len());
        subkey_count = subkey_count.saturating_add(public.public_subkeys.len());
        enforce_count(
            packet_count,
            limits.max_packet_count,
            "packet-limit-exceeded",
            "OpenPGP private-key packet",
        )?;
        enforce_count(
            signature_count,
            limits.max_signatures,
            "packet-limit-exceeded",
            "OpenPGP private-key signature",
        )?;
        enforce_count(
            user_id_count,
            limits.max_user_ids,
            "packet-limit-exceeded",
            "OpenPGP private-key user ID",
        )?;
        enforce_count(
            subkey_count,
            limits.max_subkeys,
            "packet-limit-exceeded",
            "OpenPGP private-key subkey",
        )?;
        summaries.push(key_summary(&public, "private", limits));
    }
    Ok((summaries, packet_count))
}

struct VerificationState {
    valid: Option<bool>,
    fingerprint: Option<String>,
    key_id: Option<String>,
    error: Option<String>,
}

fn missing_verification_key() -> VerificationState {
    VerificationState {
        valid: None,
        fingerprint: None,
        key_id: None,
        error: Some("A public verification key is required.".into()),
    }
}

fn verify_signature(
    signature: &Signature,
    content: &[u8],
    keys: &[SignedPublicKey],
) -> VerificationState {
    if keys.is_empty() {
        return missing_verification_key();
    }
    let mut last_error = None;
    for key in keys {
        match signature.verify(key, content) {
            Ok(()) => {
                return VerificationState {
                    valid: Some(true),
                    fingerprint: Some(key.fingerprint().to_string()),
                    key_id: Some(key.legacy_key_id().to_string()),
                    error: None,
                };
            }
            Err(error) => last_error = Some(error.to_string()),
        }
        for subkey in &key.public_subkeys {
            match signature.verify(subkey, content) {
                Ok(()) => {
                    return VerificationState {
                        valid: Some(true),
                        fingerprint: Some(subkey.fingerprint().to_string()),
                        key_id: Some(subkey.legacy_key_id().to_string()),
                        error: None,
                    };
                }
                Err(error) => last_error = Some(error.to_string()),
            }
        }
    }
    VerificationState {
        valid: Some(false),
        fingerprint: None,
        key_id: None,
        error: last_error.or_else(|| Some("No supplied public key verified the signature.".into())),
    }
}

fn verify_message_signature(
    message: &Message<'_>,
    index: usize,
    keys: &[SignedPublicKey],
) -> VerificationState {
    if keys.is_empty() {
        return missing_verification_key();
    }
    let mut last_error = None;
    for key in keys {
        match message.verify_nested_explicit(index, key) {
            Ok(_) => {
                return VerificationState {
                    valid: Some(true),
                    fingerprint: Some(key.fingerprint().to_string()),
                    key_id: Some(key.legacy_key_id().to_string()),
                    error: None,
                };
            }
            Err(error) => last_error = Some(error.to_string()),
        }
        for subkey in &key.public_subkeys {
            match message.verify_nested_explicit(index, subkey) {
                Ok(_) => {
                    return VerificationState {
                        valid: Some(true),
                        fingerprint: Some(subkey.fingerprint().to_string()),
                        key_id: Some(subkey.legacy_key_id().to_string()),
                        error: None,
                    };
                }
                Err(error) => last_error = Some(error.to_string()),
            }
        }
    }
    VerificationState {
        valid: Some(false),
        fingerprint: None,
        key_id: None,
        error: last_error.or_else(|| Some("No supplied public key verified the signature.".into())),
    }
}

fn signature_summary(signature: &Signature, verification: VerificationState) -> SignatureSummary {
    let created = signature.created().map(|value| value.as_secs());
    let expires_at = created.and_then(|value| {
        signature
            .signature_expiration_time()
            .and_then(|duration| value.checked_add(duration.as_secs()))
            .map(|value| value.to_string())
    });
    SignatureSummary {
        signature_type: signature.typ().map(|value| format!("{value:?}")),
        hash_algorithm: signature.hash_alg().map(|value| format!("{value:?}")),
        public_key_algorithm: signature
            .config()
            .map(|configuration| format!("{:?}", configuration.pub_alg)),
        created_at: created.map(|value| value.to_string()),
        expires_at,
        issuer_key_ids: signature
            .issuer_key_id()
            .into_iter()
            .map(ToString::to_string)
            .collect(),
        issuer_fingerprints: signature
            .issuer_fingerprint()
            .into_iter()
            .map(ToString::to_string)
            .collect(),
        cryptographic_valid: verification.valid,
        verification_key_fingerprint: verification.fingerprint,
        verification_key_id: verification.key_id,
        verification_error: verification.error,
    }
}

fn message_signature_count(message: &Message<'_>) -> usize {
    match message {
        Message::Signed { reader, .. } => reader.num_signatures(),
        _ => 0,
    }
}

fn message_signature_packet_count(message: &Message<'_>) -> usize {
    match message {
        Message::Signed { reader, .. } => reader
            .num_signatures()
            .saturating_add(reader.num_one_pass_signatures()),
        _ => 0,
    }
}

fn message_signature_summaries(
    message: &Message<'_>,
    keys: &[SignedPublicKey],
    limits: &ParseLimits,
) -> Result<Vec<SignatureSummary>, JsValue> {
    let Message::Signed { reader, .. } = message else {
        return Ok(Vec::new());
    };
    enforce_count(
        reader.num_signatures(),
        limits.max_signatures,
        "packet-limit-exceeded",
        "OpenPGP message signature",
    )?;
    let mut summaries = Vec::new();
    for index in 0..reader.num_signatures() {
        let signature = reader.signature(index).ok_or_else(|| {
            js_error(
                "malformed-packet",
                "OpenPGP signed message ended before its signature packet was available.",
            )
        })?;
        summaries.push(signature_summary(
            signature,
            verify_message_signature(message, index, keys),
        ));
    }
    Ok(summaries)
}

fn inspect_cleartext(
    input: &[u8],
    keys: &[SignedPublicKey],
    limits: &ParseLimits,
    include_literal: bool,
) -> Result<InspectionResult, JsValue> {
    let (message, _headers) = CleartextSignedMessage::from_armor(Cursor::new(input.to_vec()))
        .map_err(|error| js_error("malformed-packet", error.to_string()))?;
    enforce_count(
        message.signatures().len(),
        limits.max_signatures,
        "packet-limit-exceeded",
        "OpenPGP cleartext signature",
    )?;
    enforce_count(
        1 + message.signatures().len(),
        limits.max_packet_count,
        "packet-limit-exceeded",
        "OpenPGP packet",
    )?;
    let signed_text = message.signed_text();
    if signed_text.len() > limits.max_output_bytes {
        return Err(js_error(
            "output-too-large",
            "Cleartext signed content exceeds the configured output limit.",
        ));
    }
    let signatures = message
        .signatures()
        .iter()
        .map(|signature| {
            signature_summary(
                signature,
                verify_signature(signature, signed_text.as_bytes(), keys),
            )
        })
        .collect();
    Ok(InspectionResult {
        classification: "cleartext-signed-message".into(),
        armored: true,
        armor_type: Some("cleartext-signed-message".into()),
        packet_types: vec!["cleartext-message".into(), "signature".into()],
        packet_count: 1 + message.signatures().len(),
        encrypted: false,
        integrity_protected: None,
        symmetric_algorithm: None,
        aead_mode: None,
        compressed: false,
        keys: vec![],
        signatures,
        recipients: vec![],
        literal_data: include_literal.then(|| LiteralData {
            filename: Some("cleartext.txt".into()),
            format: Some("text".into()),
            media_type: Some("text/plain".into()),
            data: signed_text.into_bytes(),
        }),
        warnings: vec![
            "Displayed cleartext is derived from the signed representation; verification uses rPGP's RFC 9580 canonical text form rather than the rendered DOM text.".into(),
        ],
    })
}

fn inspect_message(
    input: &[u8],
    armor: Option<&str>,
    keys: &[SignedPublicKey],
    limits: &ParseLimits,
    include_literal: bool,
) -> Result<Option<InspectionResult>, JsValue> {
    let Ok((mut message, _headers)) = Message::from_reader(Cursor::new(input.to_vec())) else {
        return Ok(None);
    };
    let encrypted = message.is_encrypted();
    let (recipients, integrity_protected, symmetric_algorithm, aead_mode, encrypted_packet_count) =
        match &message {
            Message::Encrypted { esk, edata, .. } => {
                let recipients = esk
                    .iter()
                    .map(|item| match item {
                        Esk::PublicKeyEncryptedSessionKey(packet) => packet
                            .id()
                            .map(ToString::to_string)
                            .or_else(|_| {
                                packet
                                    .fingerprint()
                                    .map(|value| value.map(ToString::to_string))
                                    .map(|value| {
                                        value.unwrap_or_else(|| "anonymous recipient".into())
                                    })
                            })
                            .unwrap_or_else(|_| "unknown public-key recipient".into()),
                        Esk::SymKeyEncryptedSessionKey(_) => {
                            "password-encrypted session key".into()
                        }
                    })
                    .collect::<Vec<_>>();
                let (integrity_protected, symmetric_algorithm, aead_mode) = match edata {
                    Edata::SymEncryptedData { .. } => (Some(false), None, None),
                    Edata::SymEncryptedProtectedData { reader } => match reader.config() {
                        ProtectedDataConfig::Seipd(SymEncryptedProtectedDataConfig::V1) => {
                            (Some(true), None, None)
                        }
                        ProtectedDataConfig::Seipd(SymEncryptedProtectedDataConfig::V2 {
                            sym_alg,
                            aead,
                            ..
                        }) => (
                            Some(true),
                            Some(format!("{sym_alg:?}")),
                            Some(format!("{aead:?}")),
                        ),
                        ProtectedDataConfig::GnupgAead(config) => (
                            Some(true),
                            Some(format!("{:?}", config.sym_alg)),
                            Some(format!("{:?}", config.aead)),
                        ),
                    },
                    Edata::GnupgAeadData { reader } => match reader.config() {
                        ProtectedDataConfig::GnupgAead(config) => (
                            Some(true),
                            Some(format!("{:?}", config.sym_alg)),
                            Some(format!("{:?}", config.aead)),
                        ),
                        ProtectedDataConfig::Seipd(_) => (Some(true), None, None),
                    },
                };
                (
                    recipients,
                    integrity_protected,
                    symmetric_algorithm,
                    aead_mode,
                    esk.len().saturating_add(1),
                )
            }
            _ => (Vec::new(), None, None, None, 0),
        };
    let mut compressed = message.is_compressed();
    let mut nesting_depth = 1usize;

    while !message.is_encrypted()
        && message.literal_data_header().is_none()
        && (message.is_compressed() || message.is_signed())
    {
        if nesting_depth >= limits.max_nesting_depth {
            return Err(js_error(
                "nesting-limit-exceeded",
                format!(
                    "OpenPGP message nesting exceeds the configured limit {}.",
                    limits.max_nesting_depth
                ),
            ));
        }
        compressed = true;
        message = message
            .decompress()
            .map_err(|error| js_error("malformed-packet", error.to_string()))?;
        nesting_depth += 1;
    }

    let signed = message.is_signed() || message.is_one_pass_signed();
    let signature_count = message_signature_count(&message);
    enforce_count(
        signature_count,
        limits.max_signatures,
        "packet-limit-exceeded",
        "OpenPGP message signature",
    )?;
    let literal_header = message.literal_data_header().cloned();
    // `nesting_depth` intentionally counts one conservative wrapper slot for the
    // top-level message. Add both one-pass and final signature packets so the
    // configured packet budget can never undercount a signed message.
    let packet_count = if encrypted {
        encrypted_packet_count
    } else {
        nesting_depth
            .saturating_add(message_signature_packet_count(&message))
            .saturating_add(usize::from(literal_header.is_some()))
    };
    enforce_count(
        packet_count,
        limits.max_packet_count,
        "packet-limit-exceeded",
        "OpenPGP packet",
    )?;

    let mut warnings = Vec::new();
    let mut literal_data = None;
    let signatures = if include_literal && literal_header.is_some() {
        let mut data = Vec::new();
        let read_limit = (limits.max_output_bytes as u64).saturating_add(1);
        (&mut message)
            .take(read_limit)
            .read_to_end(&mut data)
            .map_err(|error| js_error("internal-parser-error", error.to_string()))?;
        if data.len() > limits.max_output_bytes {
            return Err(js_error(
                "output-too-large",
                "Literal data exceeds the configured output limit.",
            ));
        }
        let header = literal_header.as_ref();
        literal_data = Some(LiteralData {
            filename: header
                .map(|value| String::from_utf8_lossy(value.file_name()).into_owned())
                .filter(|value| !value.is_empty()),
            format: None,
            media_type: None,
            data,
        });
        message_signature_summaries(&message, keys, limits)?
    } else {
        if encrypted {
            warnings.push(
                "Encrypted OpenPGP content is inspection-only; private-key and password decryption are not supported."
                    .into(),
            );
        } else if literal_header.is_none() {
            warnings.push(
                "No bounded, unencrypted literal-data packet was available for extraction.".into(),
            );
        }
        Vec::new()
    };

    let classification = if encrypted {
        "encrypted-message"
    } else if signed {
        "signed-message"
    } else if compressed {
        "compressed-data"
    } else if literal_header.is_some() {
        "literal-data"
    } else {
        "message"
    };
    let mut packet_types = Vec::new();
    if compressed {
        packet_types.push("compressed-data".into());
    }
    if signed {
        packet_types.push("signed-message".into());
    }
    if literal_header.is_some() {
        packet_types.push("literal-data".into());
    }
    if encrypted {
        packet_types.push("encrypted-message".into());
    }
    Ok(Some(InspectionResult {
        classification: classification.into(),
        armored: armor.is_some(),
        armor_type: armor.map(str::to_owned),
        packet_types,
        packet_count,
        encrypted,
        integrity_protected,
        symmetric_algorithm,
        aead_mode,
        compressed,
        keys: vec![],
        signatures,
        recipients,
        literal_data,
        warnings,
    }))
}

pub fn inspect(
    input: &[u8],
    public_keys: &[SignedPublicKey],
    limits: &ParseLimits,
    include_literal: bool,
) -> Result<InspectionResult, JsValue> {
    let armor = armor_type(input);
    let armored = armor.is_some();

    if armor == Some("cleartext-signed-message") {
        return inspect_cleartext(input, public_keys, limits, include_literal);
    }

    let public = parse_public_keys(input, limits)?;
    if !public.is_empty() {
        let packet_count = public.iter().map(key_packet_count).sum::<usize>();
        enforce_count(
            packet_count,
            limits.max_packet_count,
            "packet-limit-exceeded",
            "OpenPGP packet",
        )?;
        enforce_count(
            public.iter().map(key_signature_count).sum(),
            limits.max_signatures,
            "packet-limit-exceeded",
            "OpenPGP key signature",
        )?;
        enforce_count(
            public.iter().map(|key| key.details.users.len()).sum(),
            limits.max_user_ids,
            "packet-limit-exceeded",
            "OpenPGP user ID",
        )?;
        enforce_count(
            public.iter().map(|key| key.public_subkeys.len()).sum(),
            limits.max_subkeys,
            "packet-limit-exceeded",
            "OpenPGP subkey",
        )?;
        let summaries = public
            .iter()
            .map(|key| key_summary(key, "public", limits))
            .collect();
        return Ok(InspectionResult {
            classification: "public-key".into(),
            armored,
            armor_type: armor.map(str::to_owned),
            packet_types: vec!["public-key".into()],
            packet_count,
            encrypted: false,
            integrity_protected: None,
            symmetric_algorithm: None,
            aead_mode: None,
            compressed: false,
            keys: summaries,
            signatures: vec![],
            recipients: vec![],
            literal_data: None,
            warnings: vec![],
        });
    }

    let (private, private_packet_count) = secret_keys(input, limits)?;
    if !private.is_empty() {
        return Ok(InspectionResult {
            classification: "private-key".into(),
            armored,
            armor_type: armor.map(str::to_owned),
            packet_types: vec!["secret-key".into()],
            packet_count: private_packet_count,
            encrypted: false,
            integrity_protected: None,
            symmetric_algorithm: None,
            aead_mode: None,
            compressed: false,
            keys: private,
            signatures: vec![],
            recipients: vec![],
            literal_data: None,
            warnings: vec![
                "Private-key material was parsed only to derive public metadata; secret fields are never returned to JavaScript."
                    .into(),
            ],
        });
    }

    if let Ok((detached, _headers)) =
        DetachedSignature::from_reader_single(Cursor::new(input.to_vec()))
    {
        return Ok(InspectionResult {
            classification: "detached-signature".into(),
            armored,
            armor_type: armor.map(str::to_owned),
            packet_types: vec!["signature".into()],
            packet_count: 1,
            encrypted: false,
            integrity_protected: None,
            symmetric_algorithm: None,
            aead_mode: None,
            compressed: false,
            keys: vec![],
            signatures: vec![signature_summary(
                &detached.signature,
                VerificationState {
                    valid: None,
                    fingerprint: None,
                    key_id: None,
                    error: Some("Original content is required for detached verification.".into()),
                },
            )],
            recipients: vec![],
            literal_data: None,
            warnings: vec![
                "Supply original content and a public key to verify this detached signature."
                    .into(),
            ],
        });
    }

    if let Some(message) = inspect_message(input, armor, public_keys, limits, include_literal)? {
        return Ok(message);
    }

    let classification = if armored || likely_binary_openpgp(input) {
        "unknown-openpgp"
    } else {
        "invalid-openpgp"
    };
    Ok(InspectionResult {
        classification: classification.into(),
        armored,
        armor_type: armor.map(str::to_owned),
        packet_types: vec![],
        packet_count: 0,
        encrypted: false,
        integrity_protected: None,
        symmetric_algorithm: None,
        aead_mode: None,
        compressed: false,
        keys: vec![],
        signatures: vec![],
        recipients: vec![],
        literal_data: None,
        warnings: vec!["The input could not be mapped to a supported composed rPGP object.".into()],
    })
}
