export const DEFAULT_FILE_VIEWER_IFC_WASM_PATH = 'wasm/model/';
export const DEFAULT_FILE_VIEWER_IFC_FRAGMENTS_WORKER_PATH = 'wasm/model/fragments-worker.mjs';
export const DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES = 16 * 1024 * 1024;

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
 * Flyfish does not rename, validate or version individual keys.
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
  /** The web-ifc IfcAPI instance owned by That Open's IfcLoader. */
  readonly webIfc: unknown;
  readonly importer?: unknown;
  readonly model?: unknown;
}

export interface FileViewerIfcThatOpenOptions {
  /** Self-hosted @thatopen/fragments worker. No public-CDN fallback is used by Flyfish. */
  workerUrl?: string | URL;
  /** Opaque 1:1 pass-through to @thatopen/components IfcLoader.setup(...). */
  components?: FileViewerIfcOpaqueConfig;
  /** Opaque 1:1 pass-through applied to FragmentsManager.core.settings. */
  fragments?: FileViewerIfcOpaqueConfig;
  /** Opaque 1:1 pass-through to the Fragments IFC importer process options. */
  importer?: FileViewerIfcOpaqueConfig;
  /** Imperative escape hatch executed synchronously before IFC importer processing. */
  configureImporter?: (context: FileViewerIfcThatOpenRuntimeContext & { readonly importer: unknown }) => void;
  /** Raw runtime hook executed once the That Open model is ready. */
  configure?: (context: FileViewerIfcThatOpenRuntimeContext) => void | Promise<void>;
}

export interface FileViewerIfcPerformanceOptions {
  /**
   * Files at or above this size are classified as large. Defaults to 16 MiB.
   * Classification only changes expensive UI/statistics behavior; all IFC files use That Open + Fragments.
   */
  largeModelThresholdBytes?: number;
  /** Optional hard source-file ceiling. Files above it fail before allocating parser/runtime state. */
  maxSourceBytes?: number;
}

/** Stable Flyfish extension surface. Raw That Open objects remain available under `thatOpen`. */
export interface FileViewerIfcConfigureContext {
  readonly fileSizeBytes: number;
  readonly largeModel: boolean;
  readonly model: unknown;
  readonly schema?: string;
  readonly thatOpen: FileViewerIfcThatOpenRuntimeContext;
  getElementInfo: (expressID: number) => Promise<FileViewerIfcElementInfo>;
  selectElement: (expressID: number | null) => Promise<FileViewerIfcElementInfo | null>;
  clearSelection: () => void;
  fitToModel: () => void;
}

export interface FileViewerIfcOptions {
  /** Large-file classification and optional hard safety limits. Rendering always uses That Open + Fragments. */
  performance?: FileViewerIfcPerformanceOptions;
  /** Opaque That Open Components / Fragments bridge plus raw runtime hooks. */
  thatOpen?: FileViewerIfcThatOpenOptions;
  /** Fit the camera after opening the model. Defaults to true. */
  fitToModel?: boolean;
  /** Enable click/tap BIM element selection. Defaults to true. */
  enableSelection?: boolean;
  /** Show the built-in IFC entity/property inspector. Defaults to true. */
  showProperties?: boolean;
  /** Maximum property rows rendered by the built-in inspector. Defaults to 250. */
  maxProperties?: number;
  /** Advanced stable Flyfish hook invoked once the That Open model has mounted and is ready. */
  configure?: (context: FileViewerIfcConfigureContext) => void | Promise<void>;
}
