use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseLimits {
    pub max_input_bytes: usize,
    pub max_output_bytes: usize,
    pub max_packet_count: usize,
    pub max_nesting_depth: usize,
    pub max_user_ids: usize,
    pub max_subkeys: usize,
    pub max_signatures: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeySummary {
    pub kind: String,
    pub version: Option<String>,
    pub fingerprint: Option<String>,
    pub key_id: Option<String>,
    pub algorithm: Option<String>,
    pub created_at: Option<String>,
    pub user_ids: Vec<String>,
    pub subkeys: Vec<SubkeySummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubkeySummary {
    pub fingerprint: Option<String>,
    pub key_id: Option<String>,
    pub algorithm: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureSummary {
    pub signature_type: Option<String>,
    pub hash_algorithm: Option<String>,
    pub public_key_algorithm: Option<String>,
    pub created_at: Option<String>,
    pub expires_at: Option<String>,
    pub issuer_key_ids: Vec<String>,
    pub issuer_fingerprints: Vec<String>,
    pub cryptographic_valid: Option<bool>,
    pub verification_key_fingerprint: Option<String>,
    pub verification_key_id: Option<String>,
    pub verification_error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiteralData {
    pub filename: Option<String>,
    pub format: Option<String>,
    pub media_type: Option<String>,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionResult {
    pub classification: String,
    pub armored: bool,
    pub armor_type: Option<String>,
    pub packet_types: Vec<String>,
    pub packet_count: usize,
    pub encrypted: bool,
    pub integrity_protected: Option<bool>,
    pub symmetric_algorithm: Option<String>,
    pub aead_mode: Option<String>,
    pub compressed: bool,
    pub keys: Vec<KeySummary>,
    pub signatures: Vec<SignatureSummary>,
    pub recipients: Vec<String>,
    pub literal_data: Option<LiteralData>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationResult {
    pub status: String,
    pub valid: Option<bool>,
    pub key_fingerprint: Option<String>,
    pub key_id: Option<String>,
    pub error: Option<String>,
}
