export interface VectorConversionLimits {
    maxOutputBytes?: number;
    maxRecords?: number;
    maxPoints?: number;
    maxObjects?: number;
    maxStateDepth?: number;
}
export interface ConvertedVectorImage {
    mime: 'image/svg+xml';
    bytes: Uint8Array;
    dataUrl: string;
    width: number;
    height: number;
    sourceMime: 'image/emf' | 'image/wmf';
    recordCount: number;
    unresolvedGlyphRuns: number;
    unsupportedRecordTypes: number[];
}
export declare function convertMetafileToSvg(mime: string, bytes: Uint8Array, options?: VectorConversionLimits): ConvertedVectorImage | null;
