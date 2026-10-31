import type { PptExtrusion, PptShape } from '../types.js';
import type { EffectContext } from './effects.js';
export interface MeshPoint {
    x: number;
    y: number;
    z: number;
}
export interface PathContour {
    points: {
        x: number;
        y: number;
    }[];
    closed: boolean;
}
export interface ExtrusionFace {
    points: MeshPoint[];
    depth: number;
    intensity: number;
    visible: boolean;
}
export interface ExtrusionMesh {
    faces: ExtrusionFace[];
    frontMatrix: [number, number, number, number, number, number];
    contours: PathContour[];
}
/** Bounded SVG path flattening, including endpoint-parameterized elliptical arcs. */
export declare function flattenPath(path: string, maxPoints?: number): PathContour[];
/** Constrained Y-then-X rotation followed by the selected projection. */
export declare function projectExtrusionPoint(point: MeshPoint, e: PptExtrusion, width: number, height: number): MeshPoint;
/** Closed contours produce true side quads; the original vector painting is the front face. */
export declare function buildExtrusionMesh(shape: PptShape): ExtrusionMesh | undefined;
export declare function renderExtrusion(shape: PptShape, frontMarkup: string, ctx: EffectContext): string;
