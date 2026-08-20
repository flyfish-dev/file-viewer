import {
  DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH,
  DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH,
  DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION,
  DEFAULT_FILE_VIEWER_CAD_WASM_PATH,
  DEFAULT_FILE_VIEWER_CAD_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH,
  DEFAULT_FILE_VIEWER_MODEL_RUNTIME_URL,
  DEFAULT_FILE_VIEWER_MODEL_WASM_URL,
  DEFAULT_FILE_VIEWER_MODEL_WORKER_URL,
  DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH,
  DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH,
  DEFAULT_FILE_VIEWER_PDF_CMAP_PATH,
  DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH,
  DEFAULT_FILE_VIEWER_PDF_WASM_PATH,
  DEFAULT_FILE_VIEWER_PDF_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PPT_FONT_PATH,
  DEFAULT_FILE_VIEWER_PPT_MODULE_PATH,
  DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION,
  DEFAULT_FILE_VIEWER_PPT_WASM_PATH,
  DEFAULT_FILE_VIEWER_PPT_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH,
  DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH,
  DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL,
  DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL,
  DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets';
import type { FileViewerOptions } from '@file-viewer/core';

const FULL_PACKAGE_DOCX_RUNTIME_VERSION = '0.3.27';

export const DEFAULT_FULL_ASSET_BASE_PATH = 'file-viewer/';
export const DEFAULT_FULL_ASSET_BASE_URL = '/file-viewer/';

const automaticAssetBaseUrl = Symbol('automatic-file-viewer-full-asset-base');
let configuredFullAssetBaseUrl: string | undefined | typeof automaticAssetBaseUrl =
  automaticAssetBaseUrl;

export function normalizeFullAssetBaseUrl(baseUrl?: string | URL | null) {
  if (!baseUrl) {
    return undefined;
  }
  const value = String(baseUrl).trim();
  if (!value) {
    return undefined;
  }
  return value.endsWith('/') ? value : `${value}/`;
}

/**
 * Resolves `file-viewer/` against the emitted application entry instead of the
 * current SPA route. This keeps Vite/Webpack root and sub-path deployments on
 * the same public asset contract.
 */
export function resolveDefaultFullAssetBaseUrl(documentRef?: Document | null) {
  const activeDocument = documentRef ?? (typeof document === 'undefined' ? null : document);
  if (!activeDocument) {
    return DEFAULT_FULL_ASSET_BASE_URL;
  }
  try {
    return new URL(
      DEFAULT_FULL_ASSET_BASE_PATH,
      resolveFileViewerRuntimeAssetBaseUrl(activeDocument)
    ).href;
  } catch {
    return DEFAULT_FULL_ASSET_BASE_URL;
  }
}

function joinFullAssetUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path.replace(/^\/+/, '')}`;
}

function versionPptRuntimeAssetUrl(url: string) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}file-viewer-ppt=${encodeURIComponent(DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION)}`;
}

function versionDocxRuntimeAssetUrl(url: string) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}file-viewer-docx=${encodeURIComponent(FULL_PACKAGE_DOCX_RUNTIME_VERSION)}`;
}

function versionCadRuntimeAssetUrl(url: string) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}file-viewer-cad=${encodeURIComponent(DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION)}`;
}

export function createFullAssetOptions(
  assetBaseUrl?: string | URL | null
): FileViewerOptions {
  const baseUrl = normalizeFullAssetBaseUrl(assetBaseUrl);
  if (!baseUrl) {
    return {};
  }
  const assetUrl = (path: string) => joinFullAssetUrl(baseUrl, path);
  const docxAssetUrl = (path: string) => versionDocxRuntimeAssetUrl(assetUrl(path));
  const pptAssetUrl = (path: string) => versionPptRuntimeAssetUrl(assetUrl(path));
  return {
    archive: {
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH),
      wasmUrl: assetUrl(DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH),
    },
    cad: {
      wasmPath: assetUrl(DEFAULT_FILE_VIEWER_CAD_WASM_PATH),
      workerUrl: versionCadRuntimeAssetUrl(assetUrl(DEFAULT_FILE_VIEWER_CAD_WORKER_PATH)),
      dwfWasmUrl: versionCadRuntimeAssetUrl(assetUrl(DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH)),
    },
    data: {
      sqlWasmUrl: assetUrl(DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL),
    },
    docx: {
      workerUrl: docxAssetUrl(DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH),
      workerJsZipUrl: docxAssetUrl(DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH),
    },
    drawing: {
      viewerScriptUrl: assetUrl(DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH),
    },
    model: {
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_MODEL_WORKER_URL),
      runtimeUrl: assetUrl(DEFAULT_FILE_VIEWER_MODEL_RUNTIME_URL),
      wasmUrl: assetUrl(DEFAULT_FILE_VIEWER_MODEL_WASM_URL),
    },
    pdf: {
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_WORKER_PATH),
      cMapUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_CMAP_PATH),
      wasmUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_WASM_PATH),
      standardFontDataUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH),
      cjkFontFallbackPath: assetUrl(DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH),
    },
    presentation: {
      pptModuleUrl: pptAssetUrl(DEFAULT_FILE_VIEWER_PPT_MODULE_PATH),
      pptWorkerUrl: pptAssetUrl(DEFAULT_FILE_VIEWER_PPT_WORKER_PATH),
      pptWasmUrl: pptAssetUrl(DEFAULT_FILE_VIEWER_PPT_WASM_PATH),
      pptFontUrl: pptAssetUrl(DEFAULT_FILE_VIEWER_PPT_FONT_PATH),
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH),
    },
    spreadsheet: {
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH),
    },
    typst: {
      compilerWasmUrl: assetUrl(DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL),
      rendererWasmUrl: assetUrl(DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL),
      fontAssetsUrl: assetUrl(DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL),
    },
  };
}

function mergeNestedOptions<Options extends object>(
  defaults: Options | undefined,
  overrides: Options | undefined
): Options {
  if (!defaults) {
    return overrides as Options;
  }
  if (!overrides) {
    return defaults;
  }
  const definedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as Partial<Options>;
  return {
    ...defaults,
    ...definedOverrides,
  } as Options;
}

export function getDefaultFullAssetBaseUrl() {
  return configuredFullAssetBaseUrl === automaticAssetBaseUrl
    ? resolveDefaultFullAssetBaseUrl()
    : configuredFullAssetBaseUrl;
}

export function setDefaultFullAssetBaseUrl(assetBaseUrl?: string | URL | null) {
  configuredFullAssetBaseUrl = normalizeFullAssetBaseUrl(assetBaseUrl);
}

export function resetDefaultFullAssetBaseUrl() {
  configuredFullAssetBaseUrl = automaticAssetBaseUrl;
}

export function mergeFullAssetOptions(
  options: FileViewerOptions = {},
  assetBaseUrl: string | URL | null | undefined = getDefaultFullAssetBaseUrl()
): FileViewerOptions {
  const assetOptions = createFullAssetOptions(assetBaseUrl);
  // `pdf.assetBaseUrl` is the PDF renderer's umbrella override. Do not fill
  // its individual URLs from the full-package default, otherwise those URLs
  // take precedence and make the explicit PDF base ineffective.
  const pdfDefaults = normalizeFullAssetBaseUrl(options.pdf?.assetBaseUrl)
    ? undefined
    : assetOptions.pdf;
  return {
    ...options,
    archive: mergeNestedOptions(assetOptions.archive, options.archive),
    cad: mergeNestedOptions(assetOptions.cad, options.cad),
    data: mergeNestedOptions(assetOptions.data, options.data),
    docx: mergeNestedOptions(assetOptions.docx, options.docx),
    drawing: mergeNestedOptions(assetOptions.drawing, options.drawing),
    model: mergeNestedOptions(assetOptions.model, options.model),
    pdf: mergeNestedOptions(pdfDefaults, options.pdf),
    presentation: mergeNestedOptions(assetOptions.presentation, options.presentation),
    spreadsheet: mergeNestedOptions(assetOptions.spreadsheet, options.spreadsheet),
    typst: mergeNestedOptions(assetOptions.typst, options.typst),
  };
}
