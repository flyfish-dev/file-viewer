use crate::errors::js_error;
use crate::types::ParseLimits;
use wasm_bindgen::JsValue;

pub fn validate_input(input: &[u8], limits: &ParseLimits) -> Result<(), JsValue> {
    if input.is_empty() {
        return Err(js_error("invalid-input", "OpenPGP input is empty."));
    }
    if input.len() > limits.max_input_bytes {
        return Err(js_error(
            "input-too-large",
            format!("OpenPGP input is {} bytes; limit is {} bytes.", input.len(), limits.max_input_bytes),
        ));
    }
    Ok(())
}
