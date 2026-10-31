/** Password-based legacy PPT decryption, independently implemented from:
 * [MS-PPT] 2.3.7 CryptSession10Container;
 * [MS-OFFCRYPTO] 2.3.5 RC4 CryptoAPI, 2.3.2 header, 2.3.3 verifier;
 * [MS-ODRAW] 2.2.22–2.2.32 picture field layouts.
 * Only the supplied password is tested. Source CFB streams are never modified. */
import type { Diagnostic, ParseLimits } from '../types.js';
import type { CompoundFile } from '../core/cfb.js';
export interface DecryptedPptStreams {
    document: Uint8Array;
    currentUser: Uint8Array;
    pictures: Uint8Array;
}
/** Return owned plaintext streams, or undefined for an unencrypted presentation. */
export declare function decryptPptStreams(cfb: CompoundFile, password: string | undefined, limits: ParseLimits, diagnostics: Diagnostic[]): DecryptedPptStreams | undefined;
