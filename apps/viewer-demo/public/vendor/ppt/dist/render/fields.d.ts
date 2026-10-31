import type { Diagnostic, PptSlide, RenderOptions, TextFrame } from '../types.js';
export interface FieldContext {
    slide: PptSlide;
    options: RenderOptions;
    date: Date;
    warnings: Diagnostic[];
    shapeId: number;
}
export declare function headerFooterVisible(type: number | undefined, slide: PptSlide): boolean;
/** Replaces one source UTF-16 marker in transient runs, never modifying source text or offsets. */
export declare function resolveTextFields(frame: TextFrame, ctx: FieldContext, placeholderType?: number): TextFrame;
