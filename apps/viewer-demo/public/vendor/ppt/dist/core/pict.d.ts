export interface PictOptions {
    maxOutputBytes?: number;
    maxRecords?: number;
    maxDecodedBytes?: number;
}
export interface PictImage {
    bytes: Uint8Array;
    mimeType: 'image/svg+xml';
    width: number;
    height: number;
    unsupportedOpcodes: number[];
    warnings: string[];
}
export declare function pictToSvg(bytes: Uint8Array, options?: PictOptions): PictImage;
