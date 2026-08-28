use crate::errors::js_error;
use crate::types::ParseLimits;
use wasm_bindgen::JsValue;

const ABSOLUTE_MAX_INPUT_BYTES: usize = 64 * 1024 * 1024;
const ABSOLUTE_MAX_OUTPUT_BYTES: usize = 32 * 1024 * 1024;
const ABSOLUTE_MAX_PACKET_COUNT: usize = 8192;
const ABSOLUTE_MAX_NESTING_DEPTH: usize = 32;
const ABSOLUTE_MAX_USER_IDS: usize = 256;
const ABSOLUTE_MAX_SUBKEYS: usize = 256;
const ABSOLUTE_MAX_SIGNATURES: usize = 512;

pub fn validate_limits(limits: &ParseLimits) -> Result<(), JsValue> {
    let values = [
        (
            limits.max_input_bytes,
            ABSOLUTE_MAX_INPUT_BYTES,
            "maxInputBytes",
        ),
        (
            limits.max_output_bytes,
            ABSOLUTE_MAX_OUTPUT_BYTES,
            "maxOutputBytes",
        ),
        (
            limits.max_packet_count,
            ABSOLUTE_MAX_PACKET_COUNT,
            "maxPacketCount",
        ),
        (
            limits.max_nesting_depth,
            ABSOLUTE_MAX_NESTING_DEPTH,
            "maxNestingDepth",
        ),
        (limits.max_user_ids, ABSOLUTE_MAX_USER_IDS, "maxUserIds"),
        (limits.max_subkeys, ABSOLUTE_MAX_SUBKEYS, "maxSubkeys"),
        (
            limits.max_signatures,
            ABSOLUTE_MAX_SIGNATURES,
            "maxSignatures",
        ),
    ];
    for (value, ceiling, name) in values {
        if value == 0 || value > ceiling {
            return Err(js_error(
                "invalid-input",
                format!("{name} must be between 1 and {ceiling}."),
            ));
        }
    }
    if limits.max_output_bytes > limits.max_input_bytes {
        return Err(js_error(
            "invalid-input",
            "maxOutputBytes cannot exceed maxInputBytes.",
        ));
    }
    Ok(())
}

pub fn validate_input(input: &[u8], limits: &ParseLimits) -> Result<(), JsValue> {
    validate_limits(limits)?;
    if input.is_empty() {
        return Err(js_error("invalid-input", "OpenPGP input is empty."));
    }
    if input.len() > limits.max_input_bytes {
        return Err(js_error(
            "input-too-large",
            format!(
                "OpenPGP input is {} bytes; limit is {} bytes.",
                input.len(),
                limits.max_input_bytes
            ),
        ));
    }
    Ok(())
}
