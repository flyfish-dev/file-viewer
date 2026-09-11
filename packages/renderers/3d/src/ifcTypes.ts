export const DEFAULT_FILE_VIEWER_IFC_API_PATH = 'wasm/model/web-ifc-api.js';
export const DEFAULT_FILE_VIEWER_IFC_WASM_PATH = 'wasm/model/web-ifc.wasm';
export const DEFAULT_FILE_VIEWER_IFC_MT_WASM_PATH = 'wasm/model/web-ifc-mt.wasm';
export const DEFAULT_FILE_VIEWER_IFC_FRAGMENTS_WORKER_PATH = 'wasm/model/fragments-worker.mjs';
export const DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES = 16 * 1024 * 1024;

export type FileViewerIfcBackend = 'auto' | 'web-ifc' | 'thatopen';

export interface FileViewerIfcProperty {
  name: string;
  value: string;
}

export interface FileViewerIfcPropertySet {
  name: string;
  properties: FileViewerIfcProperty[];
}

export interface FileViewerIfcElementInfo {
  expressID: number;
  entityType: string;
  name?: string;
  globalId?: string;
  propertySets: FileViewerIfcPropertySet[];
}

/**
 * Deliberately untyped pass-through object.
 *
 * Flyfish does not rename, validate or version individual keys. The object is
 * handed to the corresponding That Open API so applications can use new
 * library options without waiting for a File Viewer release.
 */
export interface FileViewerIfcOpaqueConfig {
  [key: string]: unknown;
}

/** Raw That Open runtime objects exposed without wrapping their APIs. */
export interface FileViewerIfcThatOpenRuntimeContext {
  readonly modules: {
    readonly components: unknown;
    readonly fragments: unknown;
  };
  readonly components: unknown;
  readonly world: unknown;
  readonly fragments: unknown;
  readonly loader: unknown;
  readonly importer?: unknown;
  readonly model?: unknown;
}

export interface FileViewerIfcThatOpenOptions {
  /** Self-hosted @thatopen/fragments worker. No public-CDN fallback is used by Flyfish. */
  workerUrl?: string | URL;
  /**
   * Opaque 1:1 pass-through to `@thatopen/components` `IfcLoader.setup(...)`.
   * Flyfish applies offline-safe defaults first, then forwards this exact object.
   */
  components?: FileViewerIfcOpaqueConfig;
  /**
   * Opaque 1:1 pass-through applied to `FragmentsManager.core.settings`.
   * Unknown/future keys are copied without Flyfish maintaining a mirror schema.
   */
  fragments?: FileViewerIfcOpaqueConfig;
  /** Opaque 1:1 pass-through to the Fragments IFC importer `process(...)` options. */
  importer?: FileViewerIfcOpaqueConfig;
  /** Imperative escape hatch executed synchronously before the IFC importer starts processing. */
  configureImporter?: (context: FileViewerIfcThatOpenRuntimeContext & { readonly importer: unknown }) => void;
  /** Raw runtime hook executed once the That Open model is ready. */
  configure?: (context: FileViewerIfcThatOpenRuntimeContext) => void | Promise<void>;
}

export interface FileViewerIfcPerformanceOptions {
  /**
   * Files at or above this size are considered large. Defaults to 16 MiB.
   * In `backend: 'auto'`, large files prefer the That Open Fragments backend.
   */
  largeModelThresholdBytes?: number;
  /** Optional hard source-file ceiling. Files above it fail before allocating parser state. */
  maxSourceBytes?: number;
  /** Disable automatic Fragments routing for large files while retaining `backend: 'auto'`. */
  preferFragmentsForLargeModels?: boolean;
}

/**
 * Stable extension surface for advanced IFC integrations.
 *
 * Raw engine objects intentionally remain `unknown` so File Viewer does not
 * freeze third-party library types into the public core contract.
 */
export interface FileViewerIfcConfigureContext {
  readonly backend: Exclude<FileViewerIfcBackend, 'auto'>;
  readonly fileSizeBytes: number;
  readonly largeModel: boolean;
  readonly api: unknown;
  readonly modelID: number;
  readonly model: unknown;
  readonly schema?: string;
  readonly thatOpen?: FileViewerIfcThatOpenRuntimeContext;
  getElementInfo: (expressID: number) => Promise<FileViewerIfcElementInfo>;
  selectElement: (expressID: number | null) => Promise<FileViewerIfcElementInfo | null>;
  clearSelection: () => void;
  fitToModel: () => void;
}

export interface FileViewerIfcOptions {
  /** Engine selection. `auto` keeps small IFCs on web-ifc and routes large/configured models through That Open Fragments. */
  backend?: FileViewerIfcBackend;
  /** Large-file routing and optional hard safety limits. */
  performance?: FileViewerIfcPerformanceOptions;
  /** Opaque That Open Components / Fragments bridge plus raw runtime hooks. */
  thatOpen?: FileViewerIfcThatOpenOptions;
  /** Self-hosted browser ESM build of web-ifc (`web-ifc-api.js`). */
  apiUrl?: string | URL;
  /** Self-hosted single-thread web-ifc WebAssembly binary. */
  wasmUrl?: string | URL;
  /** Self-hosted multi-thread web-ifc WebAssembly binary used in cross-origin-isolated pages. */
  wasmMtUrl?: string | URL;
  /** Force web-ifc to use its single-thread runtime even when cross-origin isolation is available. */
  forceSingleThread?: boolean;
  /** Fit the camera after opening the model. Defaults to true. */
  fitToModel?: boolean;
  /** Enable click/tap BIM element selection. Defaults to true. */
  enableSelection?: boolean;
  /** Show the built-in IFC entity/property inspector. Defaults to true. */
  showProperties?: boolean;
  /** Circle tessellation passed to web-ifc. Defaults to web-ifc's normal value. */
  circleSegments?: number;
  /** Optional web-ifc memory ceiling in bytes. */
  memoryLimitBytes?: number;
  /** Maximum property rows rendered by the built-in inspector. Defaults to 250. */
  maxProperties?: number;
  /** Advanced hook invoked once the selected IFC backend has mounted and is ready. */
  configure?: (context: FileViewerIfcConfigureContext) => void | Promise<void>;
}
