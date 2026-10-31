import type { PptDocument, RenderOptions, RenderResult } from '../types.js';
export declare const defaultPptCss = ".pptjs-slide{display:block;max-width:100%;max-height:100%;user-select:text}.pptjs-slide *{box-sizing:border-box}.pptjs-slide a:focus{outline:2px solid #2563eb;outline-offset:2px}";
export declare function renderSlide(doc: PptDocument, index: number, options?: RenderOptions): RenderResult;
export declare function renderSlideSvg(doc: PptDocument, index: number, options?: RenderOptions): string;
