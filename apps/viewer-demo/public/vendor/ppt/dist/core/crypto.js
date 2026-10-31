/** Cryptographic primitives for Office file interoperability only.
 * Original TypeScript implementation of FIPS 180-4 SHA-1 and RC4.
 * No native runtime, WASM, dynamic code, password guessing or network access.
 */
import { PptError } from './errors.js';
export function concatBytes(...items) { const out = new Uint8Array(items.reduce((n, x) => n + x.length, 0)); let at = 0; for (const x of items) {
    out.set(x, at);
    at += x.length;
} return out; }
export function little32(value) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, true); return b; }
export function passwordBytes(password) { if (password.length > 255)
    throw new PptError('PASSWORD_LENGTH', 'Office passwords may contain at most 255 UTF-16 code units'); const b = new Uint8Array(password.length * 2), v = new DataView(b.buffer); for (let i = 0; i < password.length; i++)
    v.setUint16(i * 2, password.charCodeAt(i), true); return b; }
export function equalBytes(a, b) { let difference = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++)
    difference |= (a[i] ?? 0) ^ (b[i] ?? 0); return difference === 0; }
function padded(data, block, lengthBytes) { const out = new Uint8Array(Math.ceil((data.length + 1 + lengthBytes) / block) * block); out.set(data); out[data.length] = 128; const v = new DataView(out.buffer); v.setUint32(out.length - 8, Math.floor(data.length / 0x20000000)); v.setUint32(out.length - 4, (data.length * 8) >>> 0); return out; }
const rol = (x, n) => (x << n) | (x >>> (32 - n));
export function sha1(data) {
    const bytes = padded(data, 64, 8), v = new DataView(bytes.buffer), w = new Uint32Array(80), h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
    for (let at = 0; at < bytes.length; at += 64) {
        for (let i = 0; i < 16; i++)
            w[i] = v.getUint32(at + i * 4);
        for (let i = 16; i < 80; i++)
            w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        let [a, b, c, d, e] = h;
        for (let i = 0; i < 80; i++) {
            const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d, k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6, t = (rol(a, 5) + f + e + k + w[i]) >>> 0;
            e = d;
            d = c;
            c = rol(b, 30);
            b = a;
            a = t;
        }
        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
    }
    const out = new Uint8Array(20), ov = new DataView(out.buffer);
    for (let i = 0; i < 5; i++)
        ov.setUint32(i * 4, h[i]);
    return out;
}
export class Rc4 {
    state = Uint8Array.from({ length: 256 }, (_, i) => i);
    i = 0;
    j = 0;
    constructor(key) { if (key.length < 1 || key.length > 256)
        throw new PptError('CRYPTO_KEY', 'Invalid RC4 key length'); let j = 0; for (let i = 0; i < 256; i++) {
        j = (j + this.state[i] + key[i % key.length]) & 255;
        const t = this.state[i];
        this.state[i] = this.state[j];
        this.state[j] = t;
    } }
    crypt(bytes) { const out = new Uint8Array(bytes.length); for (let at = 0; at < bytes.length; at++) {
        this.i = (this.i + 1) & 255;
        this.j = (this.j + this.state[this.i]) & 255;
        const t = this.state[this.i];
        this.state[this.i] = this.state[this.j];
        this.state[this.j] = t;
        out[at] = bytes[at] ^ this.state[(this.state[this.i] + this.state[this.j]) & 255];
    } return out; }
}
