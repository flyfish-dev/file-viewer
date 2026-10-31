/** Small browser/Node utilities adapted from msdoc-viewer a42f4a2. */
import type { BinaryInput } from '../types.js';
/** Strip trailing NUL padding in linear time, preserving embedded NULs. */
export declare function trimTrailingNulls(value: string): string;
export declare function textDecoder(label?: string): TextDecoder;
export declare function escapeHtml(value: unknown): string;
export declare function bytesToBase64(input: BinaryInput): string;
export declare function dataUrlFromBytes(bytes: BinaryInput, mime?: string): string;
export declare function escapeXmlText(text: unknown): string;
