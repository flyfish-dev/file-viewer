import type { Rect } from '../types.js';
/** Remap geometry coordinates, preserving CSS-pixel line widths under a custom path. */
export declare function mapPathToBounds(path: string, source: Rect, width: number, height: number): string;
export interface Geometry {
    tag: 'rect' | 'ellipse' | 'path';
    attrs: string;
    supported: boolean;
    open?: boolean;
}
/** OfficeArt MSOSPT values; shapes with an explicit geometry path bypass these defaults. */
export declare function presetGeometry(preset: number | undefined, width: number, height: number, properties?: Record<string, number>): Geometry;
