import type { Diagnostic, GradientStop, Paint, PptShape, TextMeasurer } from '../types.js';
/** The caller owns IDs and diagnostics, including those of inherited master shapes. */
export interface EffectContext {
    id: string;
    defs: string[];
    resolveColor: (value: string | undefined, index: number | undefined, fallback?: string) => string;
    warnings?: Diagnostic[];
    slideId?: number;
    textMeasurer?: TextMeasurer;
    bounds?: {
        width: number;
        height: number;
    };
}
/** Interpolate a saved stop list, preserving hard transitions at duplicate offsets. */
export declare function sampleGradient(stops: readonly GradientStop[], position: number, resolve: EffectContext['resolveColor']): {
    color: string;
    opacity: number;
};
/** SVG has no rectangular/concentric-path gradient; bounded nested contours implement it. */
export declare function renderGradient(paint: Paint, ctx: EffectContext, shape?: PptShape): string;
/** Offset, double, and emboss shadows preserve absolute drawing-axis offsets in groups. */
export declare function renderShadow(shape: PptShape, html: string, ctx: EffectContext, parent?: [number, number, number, number]): string;
