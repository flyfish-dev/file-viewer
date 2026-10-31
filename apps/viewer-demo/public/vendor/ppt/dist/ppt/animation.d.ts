import type { Diagnostic, PptAnimationEffect, PptShape, RecordNode } from '../types.js';
/** MS-PPT 2.8.2 legacy whole-object builds. Modern TimeNode trees take precedence. */
export declare function parseLegacyAnimations(records: readonly RecordNode[], bytes: Uint8Array, shapes: readonly PptShape[], diagnostics: Diagnostic[], slideId: number, hasModernTiming?: boolean): PptAnimationEffect[];
