import type { BinaryInput, ParseOptions, PptDocument } from '../types.js';
import { type RecordContext } from './records.js';
export declare const VERSION = "1.0.2";
export interface PersistDirectory {
    objects: Map<number, number>;
    documentId: number;
    editCount: number;
}
/** Resolve newest-to-oldest save transactions; old versions never override newer IDs. [MS-PPT] 2.1.2. */
export declare function readPersistDirectory(bytes: Uint8Array, currentUser: Uint8Array, ctx: RecordContext): PersistDirectory;
/** Parse a real legacy .ppt file into a serializable model. No DOM, external URLs, native code or WASM. */
export declare function parsePpt(input: BinaryInput, options?: ParseOptions): PptDocument;
