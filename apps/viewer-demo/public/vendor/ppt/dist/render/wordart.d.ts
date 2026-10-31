import type { PptShape } from '../types.js';
import type { EffectContext } from './effects.js';
export interface WarpPoint {
    x: number;
    y: number;
}
export declare const SUPPORTED_WORDART_PRESETS: Set<number>;
/** Continuous envelope maps. u/v describe the unwarped text rectangle, in [0,1].
 * Curves are sampled into affine triangles by renderWordArt; the browser supplies glyph outlines.
 * These analytic envelopes follow MSOSPT's shape families, not Office's unpublished font engine.
 */
export declare function warpPoint(preset: number, u: number, v: number, adjustments?: readonly number[]): WarpPoint;
/** Affine map from a triangle in the unit source square to a target triangle. */
export declare function triangleMatrix(source: readonly [WarpPoint, WarpPoint, WarpPoint], target: readonly [WarpPoint, WarpPoint, WarpPoint]): [number, number, number, number, number, number] | undefined;
/** Paints deformed browser glyphs, rather than laying undeformed letters on a textPath. */
export declare function renderWordArt(shape: PptShape, fillAttrs: string, strokeAttrs: string, ctx: EffectContext): string | undefined;
