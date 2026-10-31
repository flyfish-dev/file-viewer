import { PptError } from '../core/errors.js';
import { concatBytes, equalBytes, little32, passwordBytes, Rc4, sha1 } from '../core/crypto.js';
const CURRENT_USER = 4086, USER_EDIT = 4085, PERSIST_DIRECTORY = 6002, PERSIST_FULL = 6001, CRYPT_SESSION = 12052;
const TOKEN_PLAIN = 0xe391c05f, TOKEN_ENCRYPTED = 0xf3d1c4df;
const view = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
function fail(code, message, offset) { throw new PptError(code, message, offset); }
function header(bytes, offset, limit = bytes.length) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 8 > limit || limit > bytes.length)
        fail('ENCRYPTION_RECORD', 'Encrypted PPT record header is outside its stream', offset);
    const v = view(bytes), packed = v.getUint16(offset, true), length = v.getUint32(offset + 4, true), end = offset + 8 + length;
    if (end > limit)
        fail('ENCRYPTION_RECORD', 'Encrypted PPT record length exceeds its available range', offset);
    return { offset, version: packed & 15, instance: packed >>> 4, type: v.getUint16(offset + 2, true), length, end };
}
function noOverlaps(spans) { spans.sort((a, b) => a.start - b.start || a.end - b.end); for (let i = 1; i < spans.length; i++)
    if (spans[i].start < spans[i - 1].end)
        fail('ENCRYPTION_OVERLAP', `${spans[i].label} overlaps ${spans[i - 1].label}`, spans[i].start); }
function blockKey(passwordHash, block, keyBits) { const hash = sha1(concatBytes(passwordHash, little32(block))); if (keyBits === 40) {
    const key = new Uint8Array(16);
    key.set(hash.subarray(0, 5));
    hash.fill(0);
    return key;
} const key = hash.slice(0, keyBits / 8); hash.fill(0); return key; }
function cipher(passwordHash, block, keyBits) { const key = blockKey(passwordHash, block, keyBits); try {
    return new Rc4(key);
}
finally {
    key.fill(0);
} }
function readMetadata(document, record, password) {
    const start = record.offset + 8, end = record.end, v = view(document);
    if (record.version !== 15 || record.instance !== 0 || record.type !== CRYPT_SESSION || start + 12 > end)
        fail('ENCRYPTION_HEADER', 'Invalid CryptSession10Container', record.offset);
    const major = v.getUint16(start, true), minor = v.getUint16(start + 2, true), outerFlags = v.getUint32(start + 4, true), size = v.getUint32(start + 8, true), at = start + 12;
    if (![2, 3, 4].includes(major) || minor !== 2)
        fail('ENCRYPTION_UNSUPPORTED', 'Only Office Binary RC4 CryptoAPI encryption is supported', start);
    if (size < 32 || (size & 1) || at + size + 60 > end)
        fail('ENCRYPTION_HEADER', 'Truncated or invalid CryptoAPI header/verifier', at);
    const flags = v.getUint32(at, true), sizeExtra = v.getUint32(at + 4, true), algorithm = v.getUint32(at + 8, true), hashAlgorithm = v.getUint32(at + 12, true), keyBits = v.getUint32(at + 16, true) || 40, provider = v.getUint32(at + 20, true);
    if (flags !== outerFlags)
        fail('ENCRYPTION_HEADER', 'The two CryptoAPI flag fields disagree', at);
    if (!(flags & 4) || (flags & 0x30) || ![0, 0x6801].includes(algorithm) || ![0, 0x8004].includes(hashAlgorithm) || provider !== 1)
        fail('ENCRYPTION_UNSUPPORTED', 'The PPT cryptographic header does not specify supported RC4/SHA-1 parameters', at);
    if (sizeExtra !== 0 || keyBits < 40 || keyBits > 128 || keyBits % 8)
        fail('ENCRYPTION_HEADER', 'Invalid CryptoAPI key size or reserved length', at);
    if (size > 32) {
        let terminated = false;
        for (let p = at + 32; p + 1 < at + size; p += 2)
            if (v.getUint16(p, true) === 0) {
                terminated = true;
                break;
            }
        if (!terminated)
            fail('ENCRYPTION_HEADER', 'CryptoAPI provider name is not null terminated', at + 32);
    }
    const verifier = at + size;
    if (v.getUint32(verifier, true) !== 16 || v.getUint32(verifier + 36, true) !== 20)
        fail('ENCRYPTION_VERIFIER', 'RC4 CryptoAPI requires a 16-byte salt and 20-byte SHA-1 verifier hash', verifier);
    const passwordData = passwordBytes(password), salt = document.subarray(verifier + 4, verifier + 20), passwordHash = sha1(concatBytes(salt, passwordData));
    passwordData.fill(0);
    const rc4 = cipher(passwordHash, 0, keyBits), plainVerifier = rc4.crypt(document.subarray(verifier + 20, verifier + 36)), plainHash = rc4.crypt(document.subarray(verifier + 40, verifier + 60)), computed = sha1(plainVerifier), valid = equalBytes(plainHash, computed);
    plainVerifier.fill(0);
    plainHash.fill(0);
    computed.fill(0);
    if (!valid) {
        passwordHash.fill(0);
        fail('PASSWORD_INVALID', 'The supplied password does not match this presentation');
    }
    return { passwordHash, keyBits, flags };
}
/** Each top-level picture record field starts a fresh block-zero RC4 stream. */
function decryptPictures(input, metadata, limits, diagnostics) {
    if (input.length > limits.maxStreamBytes)
        fail('LIMIT_STREAM', 'Encrypted Pictures stream exceeds the stream byte limit');
    const output = input.slice();
    let at = 0, count = 0;
    const field = (offset, length, end) => { if (!Number.isSafeInteger(length) || length < 0 || offset < 0 || offset + length > end)
        fail('ENCRYPTION_PICTURE', 'Encrypted picture field exceeds its record', offset); if (length)
        output.set(cipher(metadata.passwordHash, 0, metadata.keyBits).crypt(input.subarray(offset, offset + length)), offset); };
    const rasterInstances = { 0xf01d: [0x46a, 0x46b, 0x6e2, 0x6e3], 0xf02a: [0x46a, 0x46b, 0x6e2, 0x6e3], 0xf01e: [0x6e0, 0x6e1], 0xf01f: [0x7a8, 0x7a9], 0xf029: [0x6e4, 0x6e5] };
    const metafileInstances = { 0xf01a: [0x3d4, 0x3d5], 0xf01b: [0x216, 0x217], 0xf01c: [0x542, 0x543] };
    while (at < input.length) {
        if (++count > limits.maxRecords)
            fail('LIMIT_RECORDS', 'Encrypted picture count exceeds the record budget');
        field(at, 8, input.length);
        const rh = header(output, at), end = rh.end;
        let p = at + 8;
        const known = rasterInstances[rh.type] ?? metafileInstances[rh.type];
        if (known && (!known.includes(rh.instance) || rh.version !== 0))
            fail('ENCRYPTION_PICTURE_UNSUPPORTED', 'An encrypted BLIP uses an unsupported instance or version', at);
        if (known) {
            field(p, 16, end);
            p += 16;
            if (rh.instance & 1) {
                field(p, 16, end);
                p += 16;
            }
            if (metafileInstances[rh.type]) {
                field(p, 34, end);
                const size = view(output).getUint32(p + 28, true);
                p += 34;
                if (size !== end - p)
                    fail('ENCRYPTION_PICTURE', 'Metafile stored size disagrees with its encrypted BLIP length', p - 6);
            }
            else {
                field(p, 1, end);
                p++;
            }
            field(p, end - p, end);
        }
        else if (rh.type === 0xf007 && rh.version === 2) {
            // FBSE has eleven fixed fields after rh, followed by nameData and one optional embeddedBlip field.
            for (const length of [1, 1, 16, 2, 4, 4, 4, 1, 1, 1, 1]) {
                field(p, length, end);
                p += length;
            }
            const nameLength = output[at + 41];
            if (nameLength & 1)
                fail('ENCRYPTION_PICTURE', 'FBSE name byte count is not even', at + 41);
            field(p, nameLength, end);
            p += nameLength;
            if (p < end) {
                field(p, end - p, end);
                const embedded = header(output, p, end);
                if (embedded.end !== end || embedded.type < 0xf018 || embedded.type > 0xf117)
                    fail('ENCRYPTION_PICTURE', 'Invalid embedded BLIP inside encrypted FBSE', p);
            }
        }
        else {
            // Record extent remains known, so other pictures can still be recovered safely.
            diagnostics.push({ code: 'ENCRYPTED_PICTURE_UNSUPPORTED', severity: 'warning', message: 'An encrypted picture uses an unknown field layout; its ciphertext payload is retained and is not treated as a decoded image', offset: at, details: { recordType: rh.type, instance: rh.instance } });
        }
        at = end;
    }
    return output;
}
/** Return owned plaintext streams, or undefined for an unencrypted presentation. */
export function decryptPptStreams(cfb, password, limits, diagnostics) {
    const document = cfb.getStream('PowerPoint Document'), currentUser = cfb.getStream('Current User');
    if (!document || !currentUser)
        return undefined;
    if (currentUser.length < 20)
        return undefined;
    const cv = view(currentUser);
    if (cv.getUint16(2, true) !== CURRENT_USER)
        return undefined;
    const token = cv.getUint32(12, true), encryptedToken = token === TOKEN_ENCRYPTED;
    if (encryptedToken && password === undefined)
        fail('ENCRYPTED_PPT', 'This presentation is encrypted; supply its password');
    const editOffset = cv.getUint32(16, true);
    if (editOffset + 40 > document.length) {
        if (encryptedToken)
            fail('ENCRYPTION_RECORD', 'Encrypted UserEditAtom is truncated', editOffset);
        return undefined;
    }
    const dv = view(document), editLength = dv.getUint32(editOffset + 4, true), editType = dv.getUint16(editOffset + 2, true);
    if (editType !== USER_EDIT || editLength < 32) {
        if (encryptedToken)
            fail('ENCRYPTION_HEADER', 'Encrypted presentation has no encryption-session persist reference', editOffset);
        return undefined;
    }
    const cryptoId = dv.getUint32(editOffset + 36, true);
    if (!cryptoId) {
        if (encryptedToken)
            fail('ENCRYPTION_HEADER', 'Encrypted presentation has a zero encryption-session persist reference', editOffset);
        return undefined;
    }
    if (password === undefined)
        fail('ENCRYPTED_PPT', 'This presentation is encrypted; supply its password');
    if (document.length > limits.maxStreamBytes || currentUser.length > limits.maxStreamBytes)
        fail('LIMIT_STREAM', 'Encrypted PPT stream exceeds the configured limit');
    const current = header(currentUser, 0);
    if (current.type !== CURRENT_USER || current.length < 20 || ![TOKEN_ENCRYPTED, TOKEN_PLAIN].includes(token))
        fail('ENCRYPTION_HEADER', 'Invalid encrypted CurrentUserAtom');
    const edit = header(document, editOffset);
    if (edit.version !== 0 || edit.instance !== 0 || edit.length !== 32)
        fail('ENCRYPTION_HEADER', 'Invalid encrypted UserEditAtom', editOffset);
    if (dv.getUint32(editOffset + 16, true) !== 0)
        fail('ENCRYPTION_EDIT_CHAIN', 'An encrypted PPT must have exactly one UserEditAtom', editOffset);
    const dirOffset = dv.getUint32(editOffset + 20, true), directory = header(document, dirOffset);
    if (![PERSIST_DIRECTORY, PERSIST_FULL].includes(directory.type) || directory.version !== 0)
        fail('ENCRYPTION_DIRECTORY', 'Invalid unencrypted persist directory', dirOffset);
    const objects = new Map();
    let at = dirOffset + 8;
    while (at < directory.end) {
        if (at + 4 > directory.end)
            fail('ENCRYPTION_DIRECTORY', 'Truncated encrypted-document persist entry', at);
        const packed = dv.getUint32(at, true), start = packed & 0xfffff, count = packed >>> 20;
        at += 4;
        if (!start || !count || start + count > 0x100000 || at + count * 4 > directory.end)
            fail('ENCRYPTION_DIRECTORY', 'Invalid encrypted-document persist range', at - 4);
        if (objects.size + count > limits.maxRecords)
            fail('LIMIT_RECORDS', 'Encrypted persist directory exceeds the record budget');
        for (let i = 0; i < count; i++) {
            const id = start + i, offset = dv.getUint32(at + i * 4, true);
            if (objects.has(id) || offset + 8 > document.length)
                fail('ENCRYPTION_DIRECTORY', 'Duplicate persist ID or invalid encrypted-object offset', at + i * 4);
            objects.set(id, offset);
        }
        at += count * 4;
    }
    const cryptOffset = objects.get(cryptoId);
    if (cryptOffset === undefined)
        fail('ENCRYPTION_HEADER', 'Encryption-session persist object is missing');
    const crypt = header(document, cryptOffset), protectedSpans = [{ start: editOffset, end: edit.end, label: 'UserEditAtom' }, { start: dirOffset, end: directory.end, label: 'PersistDirectoryAtom' }, { start: cryptOffset, end: crypt.end, label: 'CryptSession10Container' }];
    noOverlaps([...protectedSpans]);
    const offsets = [...objects].map(([id, offset]) => ({ id, offset })).sort((a, b) => a.offset - b.offset);
    for (let i = 1; i < offsets.length; i++)
        if (offsets[i].offset === offsets[i - 1].offset)
            fail('ENCRYPTION_OVERLAP', 'Different persist IDs alias the same encrypted bytes', offsets[i].offset);
    const metadata = readMetadata(document, crypt, password);
    try {
        const spans = [...protectedSpans], decrypted = [];
        // Authenticate the password first, then decrypt only eight bytes per object to establish all ranges.
        for (const entry of offsets) {
            if (entry.id === cryptoId)
                continue;
            const first = cipher(metadata.passwordHash, entry.id, metadata.keyBits).crypt(document.subarray(entry.offset, entry.offset + 8)), length = view(first).getUint32(4, true), end = entry.offset + 8 + length;
            if (end > document.length)
                fail('ENCRYPTION_RECORD', 'Decrypted persist length exceeds its stream', entry.offset);
            spans.push({ start: entry.offset, end, label: `Persist object ${entry.id}` });
            decrypted.push({ id: entry.id, offset: entry.offset, length });
        }
        noOverlaps(spans);
        const output = document.slice();
        for (const object of decrypted)
            output.set(cipher(metadata.passwordHash, object.id, metadata.keyBits).crypt(document.subarray(object.offset, object.offset + 8 + object.length)), object.offset);
        // These two in-memory flags let the ordinary parser consume the authenticated plaintext.
        view(output).setUint32(editOffset + 36, 0, true);
        const user = currentUser.slice();
        view(user).setUint32(12, TOKEN_PLAIN, true);
        const pictures = decryptPictures(cfb.getStream('Pictures') ?? new Uint8Array(), metadata, limits, diagnostics);
        if (!(metadata.flags & 8))
            diagnostics.push({ code: 'ENCRYPTED_METADATA_UNSUPPORTED', severity: 'info', message: 'Encrypted summary properties are retained in the input file and are not exposed as document metadata' });
        diagnostics.push({ code: 'PPT_DECRYPTED', severity: 'info', message: 'The presentation was decrypted with the supplied password using RC4 CryptoAPI', details: { keyBits: metadata.keyBits } });
        return { document: output, currentUser: user, pictures };
    }
    finally {
        metadata.passwordHash.fill(0);
    }
}
