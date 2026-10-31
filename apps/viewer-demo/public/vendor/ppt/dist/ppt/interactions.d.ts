import type { Diagnostic, PptDocumentExtras, PptHyperlink, PptShape, RecordNode } from '../types.js';
/** MS-PPT 2.6.10, 2.13.13–15; no executable actions are promoted to links. */
export declare function interactionHref(record: RecordNode, bytes: Uint8Array, targets?: ReadonlyMap<number, string>): string | undefined;
/** PowerPoint stores its slide locator in LocationAtom as ID,number,title.
 * The stable ID wins over the stale displayed number after a slide reorder.
 * Unknown locator strings stay metadata; never reinterpret another-file targets.
 */
export declare function resolveSlideLinks(links: PptHyperlink[], slides: readonly {
    id: number;
}[], targets: Map<number, string>, diagnostics: Diagnostic[]): void;
/** Bind shape actions and embedded sounds to their document-owned asset IDs. */
export declare function bindShapeInteractions(records: readonly RecordNode[], bytes: Uint8Array, shapes: readonly PptShape[], extras: PptDocumentExtras, targets: Map<number, string>, diagnostics: Diagnostic[], slideId: number): void;
