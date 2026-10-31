/** Strip trailing NUL padding in linear time, preserving embedded NULs. */
export function trimTrailingNulls(value) {
    let end = value.length;
    while (end > 0 && value.charCodeAt(end - 1) === 0)
        end--;
    return end === value.length ? value : value.slice(0, end);
}
export function textDecoder(label = 'utf-8') { return new TextDecoder(label, { fatal: false }); }
export function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
export function bytesToBase64(input) { const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength); let text = ''; for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(text); }
export function dataUrlFromBytes(bytes, mime = 'application/octet-stream') { return `data:${mime};base64,${bytesToBase64(bytes)}`; }
export function escapeXmlText(text) { return escapeHtml(String(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')); }
