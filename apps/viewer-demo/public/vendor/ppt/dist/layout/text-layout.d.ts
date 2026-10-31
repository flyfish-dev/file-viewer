import type { Paragraph, TextFrame, TextStyle } from '../types.js';
import type { TextMeasurer } from './measure.js';
export interface TextFragment {
    text: string;
    style: TextStyle;
    x: number;
    width: number;
    ascent: number;
    descent: number;
    lineHeight?: number;
    baseline?: number;
    bullet?: boolean;
    hanging?: boolean;
}
export interface TextLine {
    fragments: TextFragment[];
    y: number;
    height: number;
    baseline: number;
    paragraphIndex: number;
    width: number;
    last: boolean;
}
export interface TextLayout {
    lines: TextLine[];
    width: number;
    height: number;
    requiredHeight: number;
    scale: number;
    overflowX: boolean;
    overflowY: boolean;
    lineMetricsApproximate: boolean;
}
export interface TextLayoutOptions {
    width: number;
    height: number;
    measurer: TextMeasurer;
    scale?: number;
    lineSpacingScale?: number;
    autofit?: 'none' | 'shrink' | 'resize';
    minScale?: number;
}
/** Unspecified format bits retain the ordinary word/kinsoku layout defaults. */
export declare function paragraphWrapFlags(style: Paragraph['style']): number;
/** A nonpositive saved step cannot define a repeating grid; use the fallback grid. */
export declare function paragraphDefaultTabSize(style: Paragraph['style']): number;
/** Horizontal layout: measured words/graphemes, explicit tab alignment, hanging bullets and bounded autofit. */
export declare function layoutText(frame: TextFrame, options: TextLayoutOptions): TextLayout;
