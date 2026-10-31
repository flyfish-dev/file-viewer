export interface TiffImage {
    width: number;
    height: number;
    rgba: Uint8Array;
    pageCount: number;
    warnings: string[];
}
export interface TiffOptions {
    maxDecodedBytes?: number;
    maxOutputBytes?: number;
    page?: number;
}
/** TIFF's MSB-first LZW with the early code-width change, unlike GIF. */
export declare function decodeTiffLzw(bytes: Uint8Array, expected: number): Uint8Array;
/** Decode a chosen IFD; all pixel/strip/tile allocations are preflighted. */
export declare function decodeTiff(bytes: Uint8Array, options?: TiffOptions): TiffImage;
export declare function tiffToPng(bytes: Uint8Array, options?: TiffOptions): Omit<TiffImage, 'rgba'> & {
    bytes: Uint8Array;
    mimeType: 'image/png';
};
