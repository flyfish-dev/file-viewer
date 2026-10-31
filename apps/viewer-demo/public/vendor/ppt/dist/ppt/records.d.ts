import type { Diagnostic, ParseLimits, RecordNode } from '../types.js';
export interface RecordContext {
    bytes: Uint8Array;
    limits: ParseLimits;
    diagnostics: Diagnostic[];
    count: number;
    strict?: boolean;
}
export declare function readRecord(ctx: RecordContext, offset: number, end?: number, depth?: number): RecordNode;
export declare function readRecords(ctx: RecordContext, start: number, end: number, depth?: number): RecordNode[];
export declare function walkRecords(records: readonly RecordNode[]): Generator<RecordNode>;
export declare function findRecord(records: readonly RecordNode[], type: number): RecordNode | undefined;
export declare function childrenOf(record: RecordNode, type: number): RecordNode[];
