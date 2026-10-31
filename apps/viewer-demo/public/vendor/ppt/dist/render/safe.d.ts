/** Output escapes stay independent of a DOM, so rendering also works in Node/Workers. */
export declare function escapeXml(value: unknown): string;
export declare function finite(value: unknown, fallback?: number): number;
export declare function n(value: unknown): string;
/** Transform coefficients must preserve small scales used by large group coordinate spaces. */
export declare function transformNumber(value: number): string;
export declare function color(value: unknown, fallback?: string): string;
export declare function cssFont(value: unknown): string;
export declare function imageUrl(value: unknown): string | undefined;
export declare function linkUrl(value: unknown): string | undefined;
/** RFC 4648 section 4: standard alphabet, zero pad bits and required '=' padding. */
export declare function base64(bytes: Uint8Array): string;
