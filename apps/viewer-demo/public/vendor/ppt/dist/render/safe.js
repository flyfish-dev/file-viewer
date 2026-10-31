/** Output escapes stay independent of a DOM, so rendering also works in Node/Workers. */
export function escapeXml(value) { return String(value ?? '').replace(/\u000b/g, '\n').replace(/[\u0000-\u0008\u000c\u000e-\u001f\ufffe\uffff]/g, '\ufffd').replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '\ufffd').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
export function finite(value, fallback = 0) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
export function n(value) { return String(Math.round(finite(value) * 10000) / 10000); }
/** Transform coefficients must preserve small scales used by large group coordinate spaces. */
export function transformNumber(value) { return String(finite(value)); }
export function color(value, fallback = '#000000') { const s = String(value ?? ''); return /^(#[\da-f]{3,8}|transparent|none)$/i.test(s) ? s : fallback; }
export function cssFont(value) { return `'${String(value ?? 'Arial').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', sans-serif`; }
export function imageUrl(value) { if (typeof value !== 'string')
    return undefined; return /^(blob:|data:image\/(?:png|jpeg|gif|bmp|webp|tiff|svg\+xml);(?:base64,|charset=utf-8,))/i.test(value) ? value : undefined; }
export function linkUrl(value) { if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value))
    return undefined; return /^(?:https?:\/\/|mailto:|tel:|#)/i.test(value) ? value : undefined; }
const base64Alphabet = Uint8Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', char => char.charCodeAt(0));
const base64Decoder = new TextDecoder();
/** RFC 4648 section 4: standard alphabet, zero pad bits and required '=' padding. */
export function base64(bytes) {
    if (bytes.length === 0)
        return '';
    // Each complete block consumes a multiple of three bytes, so only the final
    // block needs padding. Decode ASCII output directly, without a binary string
    // for the entire asset or a spread call whose arguments scale with its size.
    const inputBlockSize = 49152;
    const output = new Uint8Array(Math.min(65536, Math.ceil(bytes.length / 3) * 4));
    const parts = [];
    for (let start = 0; start < bytes.length; start += inputBlockSize) {
        const end = Math.min(start + inputBlockSize, bytes.length);
        const completeEnd = end - (end - start) % 3;
        let input = start, written = 0;
        while (input < completeEnd) {
            const bits = (bytes[input++] << 16) | (bytes[input++] << 8) | bytes[input++];
            output[written++] = base64Alphabet[bits >>> 18];
            output[written++] = base64Alphabet[(bits >>> 12) & 63];
            output[written++] = base64Alphabet[(bits >>> 6) & 63];
            output[written++] = base64Alphabet[bits & 63];
        }
        if (input < end) {
            const first = bytes[input++];
            const hasSecond = input < end;
            const second = hasSecond ? bytes[input] : 0;
            output[written++] = base64Alphabet[first >>> 2];
            output[written++] = base64Alphabet[((first & 3) << 4) | (second >>> 4)];
            output[written++] = hasSecond ? base64Alphabet[(second & 15) << 2] : 61;
            output[written++] = 61;
        }
        parts.push(base64Decoder.decode(output.subarray(0, written)));
    }
    return parts.join('');
}
