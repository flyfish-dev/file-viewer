import type { Diagnostic, DrawingContext, ParseLimits, PptShape, RecordNode, Rect } from '../types.js';
interface Properties {
    values: Map<number, number>;
    complex: Map<number, Uint8Array>;
}
export declare function readProperties(record: RecordNode, bytes: Uint8Array, diagnostics: Diagnostic[]): Properties;
export declare function readDrawingDefaults(drawingGroup: RecordNode | undefined, bytes: Uint8Array, diagnostics: Diagnostic[], limits: ParseLimits, recordCount?: {
    value: number;
}): Record<string, number>;
export declare function officeColor(value: number, colors: readonly number[], fallback?: string): string;
/** PPT client anchors differ from ODRAW child anchors: top comes before left. */
export declare function readAnchor(record: RecordNode, bytes: Uint8Array): Rect | undefined;
/** Shape tree order is paint order; patriarch groups only establish the drawing root. */
export declare function parseDrawing(record: RecordNode, ctx: DrawingContext): PptShape[];
export {};
