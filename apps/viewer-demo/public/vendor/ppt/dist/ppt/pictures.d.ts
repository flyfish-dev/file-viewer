import type { Diagnostic, ParseLimits, PptAsset, RecordNode } from '../types.js';
/** DIBs omit BITMAPFILEHEADER. The pixel offset includes palette and bit masks. */
export declare function dibToBmp(bytes: Uint8Array): Uint8Array;
/** Complex pib/fillBlip values contain a complete OfficeArtBlip, not a BStore index. */
export declare function parseInlinePicture(bytes: Uint8Array, offset: number, length: number, id: string, diagnostics: Diagnostic[], remainingBytes: number): PptAsset;
/** BStore order is authoritative. Empty entries retain their one-based slot. */
export declare function parsePictures(drawingGroup: RecordNode | undefined, documentBytes: Uint8Array, picturesBytes: Uint8Array, diagnostics: Diagnostic[], limits: ParseLimits): {
    assets: PptAsset[];
    pictureIds: Map<number, string>;
};
