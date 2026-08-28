import {
  DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH,
  DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH,
  DEFAULT_FILE_VIEWER_PDF_CMAP_PATH,
  DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH,
  DEFAULT_FILE_VIEWER_PDF_WASM_PATH,
  DEFAULT_FILE_VIEWER_PDF_WORKER_PATH,
  DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH,
  DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets';
import type { FileViewerOptions } from '@file-viewer/core';

const STANDARD_PACKAGE_DOCX_RUNTIME_VERSION = '0.3.28';
export const DEFAULT_FULL_ASSET_BASE_PATH = 'file-viewer/';
export const DEFAULT_FULL_ASSET_BASE_URL = '/file-viewer/';
const automaticAssetBaseUrl = Symbol('automatic-file-viewer-standard-asset-base');
let configuredFullAssetBaseUrl: string | undefined | typeof automaticAssetBaseUrl = automaticAssetBaseUrl;

export function normalizeFullAssetBaseUrl(baseUrl?: string | URL | null) {
  if (!baseUrl) return undefined;
  const value = String(baseUrl).trim();
  return value ? (value.endsWith('/') ? value : `${value}/`) : undefined;
}

export function resolveDefaultFullAssetBaseUrl(documentRef?: Document | null) {
  const activeDocument = documentRef ?? (typeof document === 'undefined' ? null : document);
  if (!activeDocument) return DEFAULT_FULL_ASSET_BASE_URL;
  try {
    return new URL(DEFAULT_FULL_ASSET_BASE_PATH, resolveFileViewerRuntimeAssetBaseUrl(activeDocument)).href;
  } catch {
    return DEFAULT_FULL_ASSET_BASE_URL;
  }
}

const joinAssetUrl = (baseUrl: string, path: string) => `${baseUrl}${path.replace(/^\/+/, '')}`;
const versionDocxUrl = (url: string) =>
  `${url}${url.includes('?') ? '&' : '?'}file-viewer-docx=${encodeURIComponent(STANDARD_PACKAGE_DOCX_RUNTIME_VERSION)}`;

export function createFullAssetOptions(assetBaseUrl?: string | URL | null): FileViewerOptions {
  const baseUrl = normalizeFullAssetBaseUrl(assetBaseUrl);
  if (!baseUrl) return {};
  const assetUrl = (path: string) => joinAssetUrl(baseUrl, path);
  return {
    archive: {
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH),
      wasmUrl: assetUrl(DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH),
    },
    docx: {
      workerUrl: versionDocxUrl(assetUrl(DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH)),
      workerJsZipUrl: versionDocxUrl(assetUrl(DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH)),
    },
    pdf: {
      workerUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_WORKER_PATH),
      cMapUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_CMAP_PATH),
      wasmUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_WASM_PATH),
      standardFontDataUrl: assetUrl(DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH),
      cjkFontFallbackPath: assetUrl(DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH),
    },
    presentation: { workerUrl: assetUrl(DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH) },
    spreadsheet: { workerUrl: assetUrl(DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH) },
  };
}

function mergeNested<Options extends object>(defaults: Options | undefined, overrides: Options | undefined): Options {
  if (!defaults) return overrides as Options;
  if (!overrides) return defaults;
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)),
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
  const assets = createFullAssetOptions(assetBaseUrl);
  const pdfDefaults = normalizeFullAssetBaseUrl(options.pdf?.assetBaseUrl) ? undefined : assets.pdf;
  return {
    ...options,
    archive: mergeNested(assets.archive, options.archive),
    docx: mergeNested(assets.docx, options.docx),
    pdf: mergeNested(pdfDefaults, options.pdf),
    presentation: mergeNested(assets.presentation, options.presentation),
    spreadsheet: mergeNested(assets.spreadsheet, options.spreadsheet),
  };
}
