/**
 * Independent implementation of [MS-PPT] 2.9.14–2.9.45 and 2.9.76–2.9.80.
 * Binary offsets/counts use UTF-16 code units, including the implicit final CR.
 * Formatting is parsed without DOM dependencies and resolves to CSS pixels.
 */
import type { ParagraphStyle, PptFont, RecordNode, TextContext, TextFrame, TextStyle } from '../types.js';
type MasterLevel = {
    paragraph: ParagraphStyle;
    character: TextStyle;
};
/** Parse immediate sibling text bodies; callers keep slide boundaries separate. */
export declare function parseTextFrames(records: readonly RecordNode[], ctx: TextContext): TextFrame[];
export declare const parseTextBodies: typeof parseTextFrames;
/** Read the document's default text language before resolving body/master runs. */
export declare function parseDefaultTextStyle(records: readonly RecordNode[], ctx: TextContext): TextStyle;
/** Master style entries remain unflattened so slide palette/paragraph overrides work. */
export declare function parseMasterTextStyles(records: readonly RecordNode[], ctx: TextContext): Map<number, MasterLevel[]>;
export declare function parseFonts(records: readonly RecordNode[], bytes: Uint8Array): PptFont[];
export {};
