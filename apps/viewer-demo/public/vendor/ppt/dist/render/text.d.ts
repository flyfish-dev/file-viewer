import type { Diagnostic, RenderOptions, TextFrame } from '../types.js';
import { type TextLayout } from '../layout/text-layout.js';
export interface TextRenderOptions extends RenderOptions {
    onLayout?: (layout: TextLayout) => void;
    warnings?: Diagnostic[];
    slideId?: number;
    shapeId?: number;
}
export declare function renderText(frame: TextFrame, width: number, height: number, colors?: number[], options?: TextRenderOptions): string;
