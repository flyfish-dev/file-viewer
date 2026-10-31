/** Independent [MS-PPT] 2.4.15 and 2.5.16 header/footer settings parser. */
import type { PptHeaderFooter, RecordNode, TextContext } from '../types.js';
export type HeaderFooterContext = Pick<TextContext, 'bytes' | 'limits' | 'diagnostics'>;
export type HeaderFooterInstance = 0 | 3 | 4;
/**
 * Read immediate children only: instance 3 is document slide defaults, 4 notes
 * defaults, and 0 a per-slide/master override. Absent values remain absent.
 */
export declare function parseHeaderFooter(records: readonly RecordNode[], ctx: HeaderFooterContext, instance?: HeaderFooterInstance): PptHeaderFooter | undefined;
/** Resolve document → master → local settings without mutating source objects. */
export declare function resolveHeaderFooter(...levels: readonly (PptHeaderFooter | undefined)[]): PptHeaderFooter | undefined;
