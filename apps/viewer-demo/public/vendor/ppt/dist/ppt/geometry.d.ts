import type { Diagnostic, PptPathPart, Rect } from '../types.js';
export interface OfficeArray {
    view: DataView;
    count: number;
    size: number;
}
/** An OfficeArt complex array includes its six-byte IMsoArray header. */
export declare function officeArray(bytes: Uint8Array): OfficeArray | undefined;
/** Evaluate the 17 SG operations; references are limited to preceding guides. */
export declare function evaluateGuides(bytes: Uint8Array, values: Map<number, number>, geometry: Rect, bounds?: Rect): number[] | undefined;
/** Stored vertices, SG guides, common path opcodes and elliptical arc escapes. */
export declare function customGeometry(values: Map<number, number>, complex: Map<number, Uint8Array>, diagnostics: Diagnostic[], shapeId: number, offset: number, bounds?: Rect): {
    path?: string;
    pathParts?: PptPathPart[];
    pathBounds?: Rect;
    noFill?: boolean;
    noLine?: boolean;
};
export interface AdjustedPresetGeometry {
    path: string;
    pathBounds: Rect;
    approximate: boolean;
}
/** Saved adjustment handles use the 21,600-unit OfficeArt geometry space.
 * Right-arrow construction is independently described by Microsoft's VML handles example.
 * Other analytic envelopes remain explicitly labelled where their complete Office recipe
 * is not published in MS-ODRAW. A stored pVertices/pGuides path always takes precedence.
 */
export declare function adjustedPresetGeometry(preset: number, values: Map<number, number>, bounds: Rect): AdjustedPresetGeometry | undefined;
