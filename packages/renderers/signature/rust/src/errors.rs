use serde::Serialize;
use wasm_bindgen::JsValue;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct JsWrapperError<'a> {
    code: &'a str,
    message: String,
}

pub fn js_error(code: &'static str, message: impl Into<String>) -> JsValue {
    serde_wasm_bindgen::to_value(&JsWrapperError {
        code,
        message: message.into(),
    })
    .unwrap_or_else(|_| JsValue::from_str(code))
}
