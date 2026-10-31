/** BI_RGB 32-bit scan lines used by EMR_ALPHABLEND. GDI stores B,G,R,A;
 * AC_SRC_ALPHA channels are premultiplied, whereas PNG stores straight RGBA. */
export declare function decodeBgraBitmap(width: number, signedHeight: number, bits: Uint8Array, perPixelAlpha: boolean, maxBytes?: number): Uint8Array;
/** Bounded PackBits, also used by QuickDraw's 16-bit pixel packets. */
export declare function unpackBits(input: Uint8Array, expected: number, unit?: number): Uint8Array;
/** PNG (RGBA8, filter zero, zlib stored blocks), specified by ISO/IEC 15948. */
export declare function encodeRgbaPng(width: number, height: number, rgba: Uint8Array, maxBytes?: number): Uint8Array;
