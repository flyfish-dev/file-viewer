import type { PptDocument as ParsedPptDocument, ParseOptions, PptViewer, ViewerOptions } from './types.js';
export interface PptRenderOptions {
    scale?: number;
    pixelRatio?: number;
}
export interface PptMountOptions extends PptRenderOptions {
    replace?: boolean;
    className?: string;
    virtualize?: boolean;
    scrollRoot?: Element | Document | null;
    rootMargin?: string;
    releaseDelayMs?: number;
}
export type PptAssetSource = string | URL | Response | ArrayBuffer | Uint8Array;
export interface PptFrameCacheOptions {
    enabled?: boolean;
    dbName?: string;
    maxBytes?: number;
    maxEntries?: number;
    maxEntryBytes?: number;
}
export interface LoadPptViewerOptions {
    worker?: 'auto' | boolean;
    workerUrl?: string | URL;
    transferInputOwnership?: boolean;
    parseOptions?: ParseOptions;
    /** Accepted for migration. The TypeScript runtime does not load native WASM or bundled fonts. */
    wasmUrl?: PptAssetSource;
    fontUrl?: PptAssetSource;
    /** Accepted for migration. Persistent raster caching is not used by the SVG runtime. */
    cache?: false | PptFrameCacheOptions;
}
export interface PptFrameCacheStats {
    readonly enabled: boolean;
    readonly available: boolean;
    readonly disabledReason: string | null;
    readonly entries: number;
    readonly bytes: number;
    readonly maxBytes: number;
    readonly maxEntries: number;
    readonly maxEntryBytes: number;
    readonly hits: number;
    readonly misses: number;
    readonly writes: number;
    readonly nativeRenders: number;
    readonly svgRenders: number;
    readonly cancellations: number;
    readonly attachedCanvases: number;
    readonly activeCanvases: number;
    readonly wasmMemoryBytes: number;
}
export interface PptRenderResult {
    readonly cancelled?: boolean;
    readonly slideIndex: number;
    readonly width: number;
    readonly height: number;
    readonly logicalWidth: number;
    readonly logicalHeight: number;
    readonly scale: number;
    readonly pixelRatio: number;
    readonly source: 'svg';
}
export interface PptDocument {
    readonly mode: 'worker' | 'direct';
    readonly documentId: string;
    readonly slideCount: number;
    readonly width: number;
    readonly height: number;
    readonly closed: boolean;
    readonly model: ParsedPptDocument;
    renderSlide(index: number, canvas: HTMLCanvasElement | OffscreenCanvas, options?: PptRenderOptions): Promise<PptRenderResult>;
    releaseSlide(index: number): Promise<boolean>;
    cacheStats(): Promise<PptFrameCacheStats>;
    close(): Promise<void>;
}
export interface MountedPptViewer {
    readonly document: PptDocument;
    readonly root: HTMLElement;
    readonly canvases: readonly HTMLCanvasElement[];
    readonly virtualized: boolean;
    renderSlide(index: number): Promise<PptRenderResult | void>;
    cacheStats(): Promise<PptFrameCacheStats>;
    close(): Promise<void>;
}
export interface PptViewerRuntime {
    readonly mode: 'worker' | 'direct';
    readonly license: Readonly<PptRuntimeLicenseSummary>;
    readonly watermark: Readonly<PptWatermarkSummary>;
    open(input: ArrayBuffer | Uint8Array): Promise<PptDocument>;
    mount(target: string | HTMLElement, input: ArrayBuffer | Uint8Array, options?: PptMountOptions): Promise<MountedPptViewer>;
    cacheStats(): Promise<PptFrameCacheStats>;
    close(): Promise<void>;
}
export interface PptRuntimeLicenseSummary {
    readonly id: 'FV-PPT-TYPESCRIPT-APACHE-2.0';
    readonly edition: 'public';
    readonly holder: 'Individuals and Organizations';
    readonly policy: 'Apache-2.0';
    readonly commercialUse: true;
    readonly apacheLicenseApplies: true;
    readonly redistributionAllowed: true;
    readonly standaloneRedistributionAllowed: true;
}
export interface PptWatermarkSummary {
    readonly required: false;
    readonly text: '';
}
export interface PptPackageManifest {
    readonly kind: 'flyfish-ppt-typescript-v1';
    readonly product: 'Flyfish PPT Viewer';
    readonly format: 'PowerPoint 97-2003 (.ppt)';
    readonly packageName: '@file-viewer/ppt';
    readonly packageVersion: string;
    readonly renderer: 'typescript-svg-canvas';
    readonly license: 'Apache-2.0';
    readonly watermarkRequired: false;
    readonly wasmRequired: false;
    readonly workerFile: 'worker.mjs';
    readonly sourceRepositoryPrivate: true;
}
export declare function getPptPackageManifest(): PptPackageManifest;
export declare function loadPptViewer(options?: LoadPptViewerOptions): Promise<PptViewerRuntime>;
/** The container overload is the single-slide SVG viewer; options alone retains the existing Canvas API. */
export declare function createPptViewer(container: HTMLElement, options?: ViewerOptions): PptViewer;
export declare function createPptViewer(options?: LoadPptViewerOptions): Promise<PptViewerRuntime>;
