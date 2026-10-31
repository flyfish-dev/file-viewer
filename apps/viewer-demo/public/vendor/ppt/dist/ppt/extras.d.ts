import type { Diagnostic, ParseLimits, PptAsset, PptDocumentExtras, RecordNode } from '../types.js';
export interface ParsedExtras extends PptDocumentExtras {
    assets: PptAsset[];
    hyperlinkTargets: Map<number, string>;
    additionalRecordCount: number;
}
/** A safe clickable target; relative/local file destinations stay metadata-only. */
export declare function safeHyperlinkTarget(target: string, location?: string): string | undefined;
/** Extracts data without external retrieval, macro execution, media playback or OLE activation. */
export declare function parseDocumentExtras(records: readonly RecordNode[], bytes: Uint8Array, limits: ParseLimits, diagnostics: Diagnostic[]): ParsedExtras;
/** Call on an individual slide to retain its comments and animation inventory. */
export declare function parseSlideExtras(records: readonly RecordNode[], bytes: Uint8Array, limits: ParseLimits, diagnostics: Diagnostic[], slideId: number): ParsedExtras;
/** [MS-PPT] 2.10.34–36: caller resolves the OLE object's storagePersistId first. */
export declare function extractOleStorage(record: RecordNode, bytes: Uint8Array, maxBytes: number, diagnostics: Diagnostic[]): PptAsset | undefined;
