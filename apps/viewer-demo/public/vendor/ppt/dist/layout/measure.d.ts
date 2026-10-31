import type { TextStyle } from '../types.js';
export interface TextMeasure {
    width: number;
    ascent: number;
    descent: number;
    /** Normal baseline advance in CSS pixels, including the font's intended leading. */
    lineHeight?: number;
}
export interface TextMeasurer {
    measure(text: string, style: TextStyle): TextMeasure;
    clear?(): void;
}
export declare function fontCss(style: TextStyle): string;
/** Real browser font metrics. No guessed widths are substituted when Canvas is unavailable. */
export declare function createCanvasTextMeasurer(owner?: Document | undefined): TextMeasurer | undefined;
