import type {
  FileViewerArchiveOptions,
  FileViewerCadOptions,
  FileViewerDataOptions,
  FileViewerDesignOptions,
  FileViewerDocxOptions,
  FileViewerDrawingOptions,
  FileViewerIworkOptions,
  FileViewerHangulOptions,
  FileViewerModelOptions,
  FileViewerOptions,
  FileViewerPdfOptions,
  FileViewerPresentationOptions,
  FileViewerSpreadsheetOptions,
  FileViewerTypstOptions,
  FileViewerWordPerfectOptions,
} from '../contracts/types';

export const DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH = 'vendor/libarchive/worker-bundle.js';
export const DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH = 'vendor/libarchive/libarchive.wasm';
export const DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH = 'vendor/docx/docx.worker.js';
export const DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH = 'vendor/docx/jszip.min.js';
export const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '0.3.26';
export const DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH = 'vendor/pptx/pptx.worker.js';
export const DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH = 'vendor/ppt';
export const DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION = '0.3.3';
export const DEFAULT_FILE_VIEWER_PPT_MODULE_PATH = `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/index.mjs`;
export const DEFAULT_FILE_VIEWER_PPT_WORKER_PATH = `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/worker.mjs`;
export const DEFAULT_FILE_VIEWER_PPT_FRAME_CACHE_PATH = `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/frame-cache.mjs`;
export const DEFAULT_FILE_VIEWER_PPT_WASM_PATH = `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/ppt-native.wasm`;
export const DEFAULT_FILE_VIEWER_PPT_FONT_PATH = `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/ppt-font-cjk.otf`;
export const DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH = 'vendor/xlsx/sheet.worker.js';
export const DEFAULT_FILE_VIEWER_IWORK_WORKER_PATH = 'vendor/iwork/iwork.worker.js';
export const DEFAULT_FILE_VIEWER_IWORK_WORKER_PACKAGE_PATH = '@file-viewer/renderer-iwork/worker/iwork.worker.js';
export const DEFAULT_FILE_VIEWER_HANGUL_WORKER_PATH = 'vendor/hangul/hangul.worker.js';
export const DEFAULT_FILE_VIEWER_HANGUL_WORKER_PACKAGE_PATH = '@file-viewer/renderer-hangul/worker/hangul.worker.js';
export const DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PATH = 'vendor/wordperfect/wordperfect.worker.js';
export const DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PACKAGE_PATH = '@file-viewer/renderer-wordperfect/worker/wordperfect.worker.js';
export const DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PATH = 'vendor/wordperfect/libwpd.wasm';
export const DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PACKAGE_PATH = '@file-viewer/renderer-wordperfect/worker/libwpd.wasm';
export const DEFAULT_FILE_VIEWER_WORDPERFECT_MODULE_PATH = 'vendor/wordperfect/libwpd.mjs';
export const DEFAULT_FILE_VIEWER_WORDPERFECT_MODULE_PACKAGE_PATH = '@file-viewer/renderer-wordperfect/worker/libwpd.mjs';
export const DEFAULT_FILE_VIEWER_PDF_WORKER_PATH = 'vendor/pdf/pdf.worker.mjs';
export const DEFAULT_FILE_VIEWER_PDF_CMAP_PATH = 'vendor/pdf/cmaps/';
export const DEFAULT_FILE_VIEWER_PDF_WASM_PATH = 'vendor/pdf/wasm/';
export const DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH = 'vendor/pdf/standard_fonts/';
export const DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH = 'vendor/pdf/fonts/';
export const DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH = 'vendor/drawio/viewer-static.min.js';
export const DEFAULT_FILE_VIEWER_DRAWIO_ASSET_PATH = 'vendor/drawio/';
export const DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION = '0.8.0';
export const DEFAULT_FILE_VIEWER_CAD_WASM_PATH =
  `wasm/cad/${DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION}/`;
export const DEFAULT_FILE_VIEWER_CAD_WORKER_PATH =
  `${DEFAULT_FILE_VIEWER_CAD_WASM_PATH}dwg-worker.js`;
export const DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH =
  `${DEFAULT_FILE_VIEWER_CAD_WASM_PATH}dwfv-render.wasm`;
export const DEFAULT_FILE_VIEWER_CAD_LIBREDWG_SCRIPT_PATH =
  `${DEFAULT_FILE_VIEWER_CAD_WASM_PATH}libredwg-web.js`;
export const DEFAULT_FILE_VIEWER_CAD_LIBREDWG_WASM_PATH =
  `${DEFAULT_FILE_VIEWER_CAD_WASM_PATH}libredwg-web.wasm`;
export const DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL =
  'wasm/typst/typst_ts_web_compiler_bg.wasm';
export const DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL =
  'wasm/typst/typst_ts_renderer_bg.wasm';
export const DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL = 'wasm/typst/fonts/';
// Compatibility aliases kept for older imports. They intentionally resolve to
// local viewer assets; the preview runtime must not fall back to a public CDN.
export const FALLBACK_FILE_VIEWER_TYPST_COMPILER_WASM_URL =
  DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL;
export const FALLBACK_FILE_VIEWER_TYPST_RENDERER_WASM_URL =
  DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL;
export const DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_PACKAGE_PATH =
  '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm';
export const DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_PACKAGE_PATH =
  '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm';
export const DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL = 'wasm/data/sql-wasm.wasm';
export const DEFAULT_FILE_VIEWER_DATA_SQL_WASM_PACKAGE_PATH = 'sql.js/dist/sql-wasm.wasm';
export const DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PATH = 'vendor/design/illustrator-pgf.worker.js';
export const DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PACKAGE_PATH = '@file-viewer/renderer-design/worker/illustrator-pgf.worker.js';
export const DEFAULT_FILE_VIEWER_ILLUSTRATOR_LICENSE_PATH = 'vendor/design/LICENSE.illustrator-pgf-MIT.txt';
export const DEFAULT_FILE_VIEWER_ILLUSTRATOR_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/illustrator-pgf-MIT.txt';
export const DEFAULT_FILE_VIEWER_ILLUSTRATOR_ZSTD_LICENSE_PATH = 'vendor/design/LICENSE.fzstd-MIT.txt';
export const DEFAULT_FILE_VIEWER_ILLUSTRATOR_ZSTD_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/fzstd-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_WORKER_PATH = 'vendor/design/photoshop.worker.js';
export const DEFAULT_FILE_VIEWER_DESIGN_WORKER_PACKAGE_PATH = '@file-viewer/renderer-design/worker/photoshop.worker.js';
export const DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH = 'vendor/design/adobe-container.worker.js';
export const DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH = '@file-viewer/renderer-design/worker/adobe-container.worker.js';
export const DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PATH = 'vendor/design/adobe-resource.worker.js';
export const DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PACKAGE_PATH = '@file-viewer/renderer-design/worker/adobe-resource.worker.js';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PATH = 'vendor/design/postscript.worker.js';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PACKAGE_PATH = '@file-viewer/renderer-design/worker/postscript.worker.js';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PATH = 'vendor/design/stet_wasm_bg.wasm';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PACKAGE_PATH = '@file-viewer/renderer-design/wasm/postscript.wasm';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_APACHE_LICENSE_PATH = 'vendor/design/LICENSE.stet-Apache-2.0.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_APACHE_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/Stet-Apache-2.0.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_MIT_LICENSE_PATH = 'vendor/design/LICENSE.stet-MIT.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_MIT_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/Stet-MIT.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_CARLITO_LICENSE_PATH = 'vendor/design/LICENSE.Carlito-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_CARLITO_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/Carlito-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_TINOS_LICENSE_PATH = 'vendor/design/LICENSE.Tinos-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_TINOS_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/Tinos-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_COUSINE_LICENSE_PATH = 'vendor/design/LICENSE.Cousine-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_COUSINE_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/Cousine-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_NOTO_SYMBOLS_LICENSE_PATH = 'vendor/design/LICENSE.NotoSansSymbols2-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_POSTSCRIPT_NOTO_SYMBOLS_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/NotoSansSymbols2-OFL-1.1.txt';
export const DEFAULT_FILE_VIEWER_IDML_WORKER_PATH = 'vendor/design/idml.worker.js';
export const DEFAULT_FILE_VIEWER_IDML_WORKER_PACKAGE_PATH = '@file-viewer/renderer-design/worker/idml.worker.js';
export const DEFAULT_FILE_VIEWER_IDML_WASM_PATH = 'vendor/design/paged_introspect_wasm_bg.wasm';
export const DEFAULT_FILE_VIEWER_IDML_WASM_PACKAGE_PATH = '@paged-media/introspect-wasm/paged_introspect_wasm_bg.wasm';
export const DEFAULT_FILE_VIEWER_IDML_LICENSE_PATH = 'vendor/design/LICENSE.introspect-wasm-MPL-2.0.txt';
export const DEFAULT_FILE_VIEWER_IDML_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/MPL-2.0.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_THIRD_PARTY_NOTICES_PATH = 'vendor/design/THIRD_PARTY_NOTICES.md';
export const DEFAULT_FILE_VIEWER_DESIGN_THIRD_PARTY_NOTICES_PACKAGE_PATH = '@file-viewer/renderer-design/third-party-notices';
export const DEFAULT_FILE_VIEWER_DESIGN_XMLDOM_LICENSE_PATH = 'vendor/design/LICENSE.xmldom-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_XMLDOM_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/xmldom-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_SAXES_LICENSE_PATH = 'vendor/design/LICENSE.saxes-ISC.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_SAXES_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/saxes-ISC.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_AG_PSD_LICENSE_PATH = 'vendor/design/LICENSE.ag-psd-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_AG_PSD_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/ag-psd-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_WEBTOON_PSD_LICENSE_PATH = 'vendor/design/LICENSE.webtoon-psd-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_WEBTOON_PSD_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/webtoon-psd-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_BASE64_JS_LICENSE_PATH = 'vendor/design/LICENSE.base64-js-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_BASE64_JS_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/base64-js-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_PAKO_LICENSE_PATH = 'vendor/design/LICENSE.pako-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_PAKO_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/pako-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_XMLCHARS_LICENSE_PATH = 'vendor/design/LICENSE.xmlchars-MIT.txt';
export const DEFAULT_FILE_VIEWER_DESIGN_XMLCHARS_LICENSE_PACKAGE_PATH = '@file-viewer/renderer-design/licenses/xmlchars-MIT.txt';
export const DEFAULT_FILE_VIEWER_MODEL_WORKER_URL = 'wasm/model/occt-worker.js';
export const DEFAULT_FILE_VIEWER_MODEL_RUNTIME_URL = 'wasm/model/occt-import-js.js';
export const DEFAULT_FILE_VIEWER_MODEL_WASM_URL = 'wasm/model/occt-import-js.wasm';
export const DEFAULT_FILE_VIEWER_MODEL_OCCT_LICENSE_URL = 'wasm/model/LICENSE.occt.txt';
export const DEFAULT_FILE_VIEWER_MODEL_IMPORT_LICENSE_URL = 'wasm/model/LICENSE.occt-import-js.txt';
export const DEFAULT_FILE_VIEWER_MODEL_RUNTIME_PACKAGE_PATH =
  'occt-import-js/dist/occt-import-js.js';
export const DEFAULT_FILE_VIEWER_MODEL_WASM_PACKAGE_PATH =
  'occt-import-js/dist/occt-import-js.wasm';
export const DEFAULT_FILE_VIEWER_MODEL_OCCT_LICENSE_PACKAGE_PATH =
  'occt-import-js/dist/license.occt.txt';
export const DEFAULT_FILE_VIEWER_MODEL_IMPORT_LICENSE_PACKAGE_PATH =
  'occt-import-js/dist/license.occt-import-js.txt';

export interface ResolveFileViewerAssetUrlOptions {
  baseUrl?: string;
  documentBaseUrl?: string;
  trimTrailingSlash?: boolean;
}

type FileViewerRuntimeAssetBaseCandidate = {
  url: string;
  score: number;
};

const automaticFileViewerAssetBaseUrl = Symbol('automatic-file-viewer-asset-base');
let configuredFileViewerAssetBaseUrl: string | undefined | typeof automaticFileViewerAssetBaseUrl =
  automaticFileViewerAssetBaseUrl;

export const normalizeFileViewerAssetBaseUrl = (baseUrl?: string | URL | null) => {
  if (!baseUrl) {
    return undefined;
  }
  const value = String(baseUrl).trim();
  if (!value) {
    return undefined;
  }
  return value.endsWith('/') ? value : `${value}/`;
};

export const setDefaultFileViewerAssetBaseUrl = (baseUrl?: string | URL | null) => {
  configuredFileViewerAssetBaseUrl = normalizeFileViewerAssetBaseUrl(baseUrl);
};

export const resetDefaultFileViewerAssetBaseUrl = () => {
  configuredFileViewerAssetBaseUrl = automaticFileViewerAssetBaseUrl;
};

const pathDepth = (pathname: string) => pathname.split('/').filter(Boolean).length;

const longestCommonDirectoryPath = (left: string, right: string) => {
  const leftSegments = left.split('/').filter(Boolean);
  const rightSegments = right.split('/').filter(Boolean);
  const common: string[] = [];
  const length = Math.min(leftSegments.length, Math.max(0, rightSegments.length - 1));
  for (let index = 0; index < length && leftSegments[index] === rightSegments[index]; index += 1) {
    common.push(leftSegments[index]);
  }
  return common.length ? `/${common.join('/')}/` : '/';
};

const resolveFileViewerScriptAssetBaseCandidate = (
  script: HTMLScriptElement,
  documentBaseUrl: string,
  index: number
): FileViewerRuntimeAssetBaseCandidate[] => {
  try {
    const rawScriptUrl = script.src || script.getAttribute('src') || '';
    if (!rawScriptUrl) {
      return [];
    }

    const scriptUrl = new URL(rawScriptUrl, documentBaseUrl);
    const viteClient = scriptUrl.pathname.match(/^(.*\/)@vite\/client$/i);
    const isSourceModule = /\/(?:src|node_modules|@fs|@id|@vite)(?:\/|$)/i.test(
      scriptUrl.pathname
    );
    const documentUrl = new URL(documentBaseUrl);
    const documentPathname = documentUrl.pathname.endsWith('/')
      ? documentUrl.pathname
      : `${documentUrl.pathname}/`;
    const scriptName = scriptUrl.pathname.slice(scriptUrl.pathname.lastIndexOf('/') + 1);
    const isEntryScript = /^(?:app|index|main|runtime|umi)(?:[.-]|$)/i.test(scriptName);
    const candidates = new Map<string, FileViewerRuntimeAssetBaseCandidate>();
    const addCandidate = (basePath: string, quality: number) => {
      const url = new URL(basePath, scriptUrl).href;
      const candidateUrl = new URL(url);
      let score = quality + index / 10_000;

      if (candidateUrl.origin === documentUrl.origin) {
        score += 8;
      }
      if (documentPathname.startsWith(candidateUrl.pathname)) {
        // Prefer the deepest candidate that is still an ancestor of the SPA
        // route. This avoids stripping an earlier deployment segment named
        // `assets` when the emitted suffix is actually `static/js`.
        score += 16 + pathDepth(candidateUrl.pathname) / 4;
      }
      if (script.type === 'module') {
        score += 2;
      }
      if (isEntryScript) {
        score += 2;
      }
      const previous = candidates.get(url);
      if (!previous || previous.score < score) {
        candidates.set(url, { url, score });
      }
    };

    if (viteClient) {
      addCandidate(viteClient[1], 12);
    }
    if (isSourceModule) {
      return [...candidates.values()];
    }

    const pathSegments = scriptUrl.pathname.split('/').filter(Boolean);
    const directories = pathSegments.slice(0, -1);
    const emittedDirectoryWeights: Array<{ segments: readonly string[]; weight: number }> = [
      { segments: ['static', 'js'], weight: 9 },
      { segments: ['assets', 'js'], weight: 9 },
      { segments: ['assets', 'chunks'], weight: 8 },
      { segments: ['assets'], weight: 6 },
      { segments: ['static'], weight: 6 },
      { segments: ['js'], weight: 4 },
    ];
    emittedDirectoryWeights.forEach(({ segments, weight }) => {
      for (let segmentIndex = 0; segmentIndex <= directories.length - segments.length; segmentIndex += 1) {
        const matches = segments.every(
          (segment, offset) => directories[segmentIndex + offset]?.toLowerCase() === segment
        );
        if (!matches) {
          continue;
        }
        const basePath = directories.slice(0, segmentIndex).length
          ? `/${directories.slice(0, segmentIndex).join('/')}/`
          : '/';
        addCandidate(basePath, weight + segments.length);
      }
    });

    if (isEntryScript) {
      const scriptDirectory = scriptUrl.pathname.slice(0, scriptUrl.pathname.lastIndexOf('/') + 1);
      addCandidate(scriptDirectory, 3);
    }
    if (scriptUrl.origin === documentUrl.origin) {
      addCandidate(
        longestCommonDirectoryPath(documentUrl.pathname, scriptUrl.pathname),
        8
      );
    }

    return [...candidates.values()];
  } catch {
    return [];
  }
};

/**
 * Resolves the stable public base for runtime assets without reading
 * bundler-specific environment metadata or webpack public-path variables.
 * Explicit HTML `<base>` configuration stays authoritative; for SPA fallback
 * routes, emitted Vite/Webpack/UMI entry scripts reveal the deployment root
 * more reliably than the route-derived page URL.
 */
export const resolveFileViewerRuntimeAssetBaseUrl = (documentRef: Document) => {
  const documentBaseUrl = documentRef.baseURI || documentRef.URL || 'file:///';

  if (configuredFileViewerAssetBaseUrl !== automaticFileViewerAssetBaseUrl) {
    if (!configuredFileViewerAssetBaseUrl) {
      return documentBaseUrl;
    }
    try {
      return new URL(configuredFileViewerAssetBaseUrl, documentBaseUrl).href;
    } catch {
      return configuredFileViewerAssetBaseUrl;
    }
  }

  if (documentRef.querySelector('base[href]')) {
    return documentBaseUrl;
  }

  const candidates = Array.from(documentRef.querySelectorAll<HTMLScriptElement>('script[src]'))
    .flatMap((script, index) => resolveFileViewerScriptAssetBaseCandidate(script, documentBaseUrl, index))
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.url || documentBaseUrl;
};

export const getDefaultFileViewerAssetBaseUrl = (documentRef?: Document | null) => {
  if (configuredFileViewerAssetBaseUrl !== automaticFileViewerAssetBaseUrl) {
    return configuredFileViewerAssetBaseUrl;
  }
  // Core remains environment-neutral: callers that want automatic browser
  // inference pass their owning Document explicitly.
  return documentRef ? resolveFileViewerRuntimeAssetBaseUrl(documentRef) : undefined;
};

export interface ResolvedFileViewerCadAssetUrls {
  wasmPath: string;
  workerUrl: string;
  dwfWasmUrl: string;
}

export interface ResolvedFileViewerPdfAssetUrls {
  workerUrl: string;
  cMapUrl: string;
  wasmUrl: string;
  standardFontDataUrl: string;
  cjkFontFallbackPath: string;
}

export interface ResolvedFileViewerModelAssetUrls {
  workerUrl: string;
  runtimeUrl: string;
  wasmUrl: string;
}

export type FileViewerRendererAssetKind =
  | 'directory'
  | 'worker'
  | 'wasm'
  | 'wasm-directory'
  | 'script'
  | 'font'
  | 'metadata'
  | 'bundled-wasm'
  | 'license';

export type FileViewerRendererAssetTarget = 'public' | 'bundled' | 'external';

export type FileViewerRendererAssetOptionPath =
  | 'archive.workerUrl'
  | 'archive.wasmUrl'
  | 'cad.wasmPath'
  | 'cad.workerUrl'
  | 'cad.dwfWasmUrl'
  | 'data.sqlWasmUrl'
  | 'design.illustratorWorkerUrl'
  | 'design.workerUrl'
  | 'design.containerWorkerUrl'
  | 'design.adobeResourceWorkerUrl'
  | 'design.postscriptWorkerUrl'
  | 'design.postscriptWasmUrl'
  | 'design.idmlWorkerUrl'
  | 'design.idmlWasmUrl'
  | 'docx.workerJsZipUrl'
  | 'docx.workerUrl'
  | 'drawing.viewerScriptUrl'
  | 'iwork.workerUrl'
  | 'hangul.workerUrl'
  | 'wordPerfect.workerUrl'
  | 'wordPerfect.wasmUrl'
  | 'model.workerUrl'
  | 'model.runtimeUrl'
  | 'model.wasmUrl'
  | 'pdf.workerUrl'
  | 'pdf.cMapUrl'
  | 'pdf.wasmUrl'
  | 'pdf.standardFontDataUrl'
  | 'pdf.cjkFontFallbackPath'
  | 'presentation.pptModuleUrl'
  | 'presentation.pptWorkerUrl'
  | 'presentation.pptWasmUrl'
  | 'presentation.pptFontUrl'
  | 'presentation.workerUrl'
  | 'spreadsheet.workerUrl'
  | 'typst.compilerWasmUrl'
  | 'typst.fontAssetsUrl'
  | 'typst.rendererWasmUrl';

export interface FileViewerRendererAssetDefinition {
  id: string;
  rendererId: string;
  kind: FileViewerRendererAssetKind;
  target: FileViewerRendererAssetTarget;
  required: boolean;
  defaultPath?: string;
  defaultUrl?: string;
  packagePath?: string;
  optionPath?: FileViewerRendererAssetOptionPath;
  description: string;
}

export interface FileViewerRendererAssetManifest {
  rendererId: string;
  assets: readonly FileViewerRendererAssetDefinition[];
}

export interface ResolvedFileViewerRendererAsset extends FileViewerRendererAssetDefinition {
  configured: boolean;
  url?: string;
  packagePath?: string;
}

export interface ResolveFileViewerRendererAssetsOptions extends ResolveFileViewerAssetUrlOptions {
  options?: FileViewerOptions | null;
}

const createDesignThirdPartyAssets = (
  rendererId: string,
  includeContainerXmlLicenses = false
): FileViewerRendererAssetDefinition[] => {
  const assets: FileViewerRendererAssetDefinition[] = [
    {
      id: `${rendererId}-third-party-notices`,
      rendererId,
      kind: 'license',
      target: 'public',
      required: true,
      defaultPath: DEFAULT_FILE_VIEWER_DESIGN_THIRD_PARTY_NOTICES_PATH,
      packagePath: DEFAULT_FILE_VIEWER_DESIGN_THIRD_PARTY_NOTICES_PACKAGE_PATH,
      description: 'Third-party notices for the bundled Adobe design Worker and WebAssembly dependency closure.',
    },
  ];
  if (includeContainerXmlLicenses) {
    assets.push(
      {
        id: `${rendererId}-xmldom-license`,
        rendererId,
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_XMLDOM_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_XMLDOM_LICENSE_PACKAGE_PATH,
        description: '@xmldom/xmldom MIT license text for the bundled Adobe container Worker.',
      },
      {
        id: `${rendererId}-saxes-license`,
        rendererId,
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_SAXES_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_SAXES_LICENSE_PACKAGE_PATH,
        description: 'saxes ISC and inherited notice text for the bundled Adobe container Worker.',
      },
      {
        id: `${rendererId}-xmlchars-license`,
        rendererId,
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_XMLCHARS_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_XMLCHARS_LICENSE_PACKAGE_PATH,
        description: 'xmlchars MIT license text for the dependency bundled through saxes.',
      }
    );
  }
  return assets;
};

const createPhotoshopWorkerLicenseAssets = (
  rendererId: string,
  includeWebtoonPsd = false
): FileViewerRendererAssetDefinition[] => {
  const assets: FileViewerRendererAssetDefinition[] = [
    {
      id: `${rendererId}-ag-psd-license`,
      rendererId,
      kind: 'license',
      target: 'public',
      required: true,
      defaultPath: DEFAULT_FILE_VIEWER_DESIGN_AG_PSD_LICENSE_PATH,
      packagePath: DEFAULT_FILE_VIEWER_DESIGN_AG_PSD_LICENSE_PACKAGE_PATH,
      description: 'ag-psd MIT license and upstream image/brush ownership notice.',
    },
    {
      id: `${rendererId}-base64-js-license`,
      rendererId,
      kind: 'license',
      target: 'public',
      required: true,
      defaultPath: DEFAULT_FILE_VIEWER_DESIGN_BASE64_JS_LICENSE_PATH,
      packagePath: DEFAULT_FILE_VIEWER_DESIGN_BASE64_JS_LICENSE_PACKAGE_PATH,
      description: 'base64-js MIT license text for the dependency bundled through ag-psd.',
    },
    {
      id: `${rendererId}-pako-license`,
      rendererId,
      kind: 'license',
      target: 'public',
      required: true,
      defaultPath: DEFAULT_FILE_VIEWER_DESIGN_PAKO_LICENSE_PATH,
      packagePath: DEFAULT_FILE_VIEWER_DESIGN_PAKO_LICENSE_PACKAGE_PATH,
      description: 'pako MIT license text for the dependency bundled through ag-psd.',
    },
  ];
  if (includeWebtoonPsd) {
    assets.push({
      id: `${rendererId}-webtoon-psd-license`,
      rendererId,
      kind: 'license',
      target: 'public',
      required: true,
      defaultPath: DEFAULT_FILE_VIEWER_DESIGN_WEBTOON_PSD_LICENSE_PATH,
      packagePath: DEFAULT_FILE_VIEWER_DESIGN_WEBTOON_PSD_LICENSE_PACKAGE_PATH,
      description: '@webtoon/psd MIT license text for the bundled PSB parser.',
    });
  }
  return assets;
};

export const DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS: readonly FileViewerRendererAssetManifest[] = [
  {
    rendererId: 'model',
    assets: [
      {
        id: 'model-occt-worker',
        rendererId: 'model',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_MODEL_WORKER_URL,
        optionPath: 'model.workerUrl',
        description: 'File Viewer worker that runs STEP, IGES, and BREP tessellation off the UI thread.',
      },
      {
        id: 'model-occt-runtime',
        rendererId: 'model',
        kind: 'script',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_MODEL_RUNTIME_URL,
        packagePath: DEFAULT_FILE_VIEWER_MODEL_RUNTIME_PACKAGE_PATH,
        optionPath: 'model.runtimeUrl',
        description: 'Self-hosted occt-import-js runtime for browser-native STEP, IGES, and BREP preview.',
      },
      {
        id: 'model-occt-wasm',
        rendererId: 'model',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_MODEL_WASM_URL,
        packagePath: DEFAULT_FILE_VIEWER_MODEL_WASM_PACKAGE_PATH,
        optionPath: 'model.wasmUrl',
        description: 'OpenCascade WebAssembly geometry kernel used by the model renderer.',
      },
      {
        id: 'model-occt-license',
        rendererId: 'model',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_MODEL_OCCT_LICENSE_URL,
        packagePath: DEFAULT_FILE_VIEWER_MODEL_OCCT_LICENSE_PACKAGE_PATH,
        description: 'OpenCascade license notice distributed with the browser geometry kernel.',
      },
      {
        id: 'model-occt-import-license',
        rendererId: 'model',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_MODEL_IMPORT_LICENSE_URL,
        packagePath: DEFAULT_FILE_VIEWER_MODEL_IMPORT_LICENSE_PACKAGE_PATH,
        description: 'occt-import-js license notice distributed with the browser geometry kernel.',
      },
    ],
  },
  {
    rendererId: 'drawing',
    assets: [
      {
        id: 'drawio-viewer-script',
        rendererId: 'drawing',
        kind: 'script',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH,
        optionPath: 'drawing.viewerScriptUrl',
        description: 'Official diagrams.net viewer-static.min.js self-hosted for offline Draw.io rendering.',
      },
      {
        id: 'drawio-offline-assets',
        rendererId: 'drawing',
        kind: 'directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DRAWIO_ASSET_PATH,
        description: 'Official diagrams.net styles, shapes, stencils, images, mxGraph and math assets for offline rendering.',
      },
    ],
  },
  {
    rendererId: 'pdf',
    assets: [
      {
        id: 'pdf-worker',
        rendererId: 'pdf',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PDF_WORKER_PATH,
        optionPath: 'pdf.workerUrl',
        description: 'PDF.js module worker copied into viewer assets for offline PDF rendering.',
      },
      {
        id: 'pdf-cmaps',
        rendererId: 'pdf',
        kind: 'directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PDF_CMAP_PATH,
        optionPath: 'pdf.cMapUrl',
        description: 'PDF.js packed CMaps used for CJK and embedded text decoding.',
      },
      {
        id: 'pdf-wasm',
        rendererId: 'pdf',
        kind: 'wasm-directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PDF_WASM_PATH,
        optionPath: 'pdf.wasmUrl',
        description: 'PDF.js WebAssembly helpers for image decoding and fully self-hosted PDF rendering.',
      },
      {
        id: 'pdf-standard-fonts',
        rendererId: 'pdf',
        kind: 'directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH,
        optionPath: 'pdf.standardFontDataUrl',
        description: 'PDF.js standard font data used when PDF files reference base fonts.',
      },
      {
        id: 'pdf-cjk-font-fallback',
        rendererId: 'pdf',
        kind: 'directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH,
        optionPath: 'pdf.cjkFontFallbackPath',
        description: 'Self-hosted Noto Sans SC variable font shards used for missing unembedded CJK fonts.',
      },
    ],
  },
  {
    rendererId: 'archive',
    assets: [
      {
        id: 'libarchive-worker',
        rendererId: 'archive',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH,
        optionPath: 'archive.workerUrl',
        description: 'libarchive.js module worker used for broad archive format parsing.',
      },
      {
        id: 'libarchive-wasm',
        rendererId: 'archive',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_ARCHIVE_WASM_PATH,
        optionPath: 'archive.wasmUrl',
        description: 'libarchive.js WebAssembly module expected next to the public worker.',
      },
    ],
  },
  {
    rendererId: 'cad',
    assets: [
      {
        id: 'cad-wasm-directory',
        rendererId: 'cad',
        kind: 'wasm-directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_CAD_WASM_PATH,
        optionPath: 'cad.wasmPath',
        description: '@flyfish-dev/cad-viewer WebAssembly directory for DWG/DXF helpers.',
      },
      {
        id: 'cad-dwg-worker',
        rendererId: 'cad',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_CAD_WORKER_PATH,
        optionPath: 'cad.workerUrl',
        description: 'DWG worker entry used by @flyfish-dev/cad-viewer.',
      },
      {
        id: 'cad-dwf-wasm',
        rendererId: 'cad',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH,
        optionPath: 'cad.dwfWasmUrl',
        description: 'DWF/DWFx/XPS raster WebAssembly module used by @flyfish-dev/cad-viewer.',
      },
      {
        id: 'cad-libredwg-script',
        rendererId: 'cad',
        kind: 'script',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_CAD_LIBREDWG_SCRIPT_PATH,
        description: 'LibreDWG JavaScript runtime loaded by the CAD DWG worker for offline parsing.',
      },
      {
        id: 'cad-libredwg-wasm',
        rendererId: 'cad',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_CAD_LIBREDWG_WASM_PATH,
        description: 'LibreDWG WebAssembly runtime loaded by the CAD DWG worker for offline parsing.',
      },
      {
        id: 'cad-legacy-dwg-worker',
        rendererId: 'cad',
        kind: 'worker',
        target: 'public',
        required: false,
        defaultPath: 'wasm/cad/dwg-worker.js',
        description: 'Unversioned compatibility alias for deployments that explicitly configured the former DWG worker path.',
      },
      {
        id: 'cad-legacy-dwf-wasm',
        rendererId: 'cad',
        kind: 'wasm',
        target: 'public',
        required: false,
        defaultPath: 'wasm/cad/dwfv-render.wasm',
        description: 'Unversioned compatibility alias for deployments that explicitly configured the former DWF runtime path.',
      },
      {
        id: 'cad-legacy-libredwg-script',
        rendererId: 'cad',
        kind: 'script',
        target: 'public',
        required: false,
        defaultPath: 'wasm/cad/libredwg-web.js',
        description: 'Unversioned compatibility alias for the former LibreDWG JavaScript runtime path.',
      },
      {
        id: 'cad-legacy-libredwg-wasm',
        rendererId: 'cad',
        kind: 'wasm',
        target: 'public',
        required: false,
        defaultPath: 'wasm/cad/libredwg-web.wasm',
        description: 'Unversioned compatibility alias for the former LibreDWG WebAssembly runtime path.',
      },
    ],
  },
  {
    rendererId: 'office-word-openxml',
    assets: [
      {
        id: 'docx-worker',
        rendererId: 'office-word-openxml',
        kind: 'worker',
        target: 'public',
        required: false,
        defaultPath: DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH,
        optionPath: 'docx.workerUrl',
        description: 'Optional @file-viewer/docx worker for off-main-thread DOCX ZIP/XML parsing.',
      },
      {
        id: 'docx-worker-jszip',
        rendererId: 'office-word-openxml',
        kind: 'script',
        target: 'public',
        required: false,
        defaultPath: DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH,
        optionPath: 'docx.workerJsZipUrl',
        description: 'JSZip runtime loaded by the @file-viewer/docx worker for fully offline DOCX parsing.',
      },
    ],
  },
  {
    rendererId: 'office-presentation-binary',
    assets: [
      {
        id: 'ppt-module',
        rendererId: 'office-presentation-binary',
        kind: 'script',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PPT_MODULE_PATH,
        optionPath: 'presentation.pptModuleUrl',
        description: 'Official @file-viewer/ppt 0.3 browser entry for PowerPoint 97–2003 preview.',
      },
      {
        id: 'ppt-worker',
        rendererId: 'office-presentation-binary',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PPT_WORKER_PATH,
        optionPath: 'presentation.pptWorkerUrl',
        description: 'Official @file-viewer/ppt 0.3 module Worker.',
      },
      {
        id: 'ppt-frame-cache',
        rendererId: 'office-presentation-binary',
        kind: 'script',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PPT_FRAME_CACHE_PATH,
        description: 'Bounded IndexedDB frame cache imported by the binary-PPT Worker.',
      },
      {
        id: 'ppt-wasm',
        rendererId: 'office-presentation-binary',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PPT_WASM_PATH,
        optionPath: 'presentation.pptWasmUrl',
        description: 'Official @file-viewer/ppt 0.3 native WebAssembly parser and renderer.',
      },
      {
        id: 'ppt-cjk-font',
        rendererId: 'office-presentation-binary',
        kind: 'font',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_PPT_FONT_PATH,
        optionPath: 'presentation.pptFontUrl',
        description: 'CJK font pack verified and loaded by the binary-PPT runtime.',
      },
      {
        id: 'ppt-runtime-manifest',
        rendererId: 'office-presentation-binary',
        kind: 'metadata',
        target: 'public',
        required: true,
        defaultPath: `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/manifest.json`,
        description: 'Integrity and edition metadata for the official binary-PPT runtime.',
      },
      {
        id: 'ppt-runtime-package',
        rendererId: 'office-presentation-binary',
        kind: 'metadata',
        target: 'public',
        required: true,
        defaultPath: `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/package.json`,
        description: 'Package identity metadata for the official binary-PPT runtime.',
      },
      {
        id: 'ppt-runtime-license',
        rendererId: 'office-presentation-binary',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/LICENSE`,
        description: 'License shipped by the independently versioned @file-viewer/ppt package.',
      },
      {
        id: 'ppt-runtime-notice',
        rendererId: 'office-presentation-binary',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: `${DEFAULT_FILE_VIEWER_PPT_RUNTIME_PATH}/NOTICE`,
        description: 'Notices shipped by the independently versioned @file-viewer/ppt package.',
      },
    ],
  },
  {
    rendererId: 'office-presentation',
    assets: [
      {
        id: 'pptx-worker',
        rendererId: 'office-presentation',
        kind: 'worker',
        target: 'public',
        required: false,
        defaultPath: DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH,
        optionPath: 'presentation.workerUrl',
        description: 'Optional @file-viewer/pptx worker for stable PPTX parsing in IIFE, CDN, and offline deployments.',
      },
    ],
  },
  {
    rendererId: 'spreadsheet-openxml',
    assets: [
      {
        id: 'spreadsheet-worker',
        rendererId: 'spreadsheet-openxml',
        kind: 'worker',
        target: 'public',
        required: false,
        defaultPath: DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH,
        optionPath: 'spreadsheet.workerUrl',
        description: 'Optional Spreadsheet worker for off-main-thread styled-exceljs workbook parsing.',
      },
    ],
  },
  ...(['apple-pages', 'apple-numbers', 'apple-keynote'] as const).map(rendererId => ({
    rendererId,
    assets: [
      {
        id: `${rendererId}-iwork-worker`,
        rendererId,
        kind: 'worker' as const,
        target: 'public' as const,
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_IWORK_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_IWORK_WORKER_PACKAGE_PATH,
        optionPath: 'iwork.workerUrl' as const,
        description: 'Module Worker for bounded ZIP, Snappy, IWA/Protobuf and iWork 09 XML/APXL parsing.',
      },
    ],
  })),
  {
    rendererId: 'office-hangul',
    assets: [
      {
        id: 'hangul-worker',
        rendererId: 'office-hangul',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_HANGUL_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_HANGUL_WORKER_PACKAGE_PATH,
        optionPath: 'hangul.workerUrl',
        description: 'Module Worker for bounded HWP v5 CFB and HWPX ZIP/XML parsing.',
      },
    ],
  },
  {
    rendererId: 'office-wordperfect',
    assets: [
      {
        id: 'wordperfect-worker',
        rendererId: 'office-wordperfect',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PACKAGE_PATH,
        optionPath: 'wordPerfect.workerUrl',
        description: 'Module Worker for bounded WordPerfect signature detection and parsing.',
      },
      {
        id: 'wordperfect-libwpd-wasm',
        rendererId: 'office-wordperfect',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PATH,
        packagePath: DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PACKAGE_PATH,
        optionPath: 'wordPerfect.wasmUrl',
        description: 'MPL-2.0 libwpd/librevenge WebAssembly parser lazy-loaded by the WordPerfect Worker.',
      },
      {
        id: 'wordperfect-libwpd-module',
        rendererId: 'office-wordperfect',
        kind: 'script',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_WORDPERFECT_MODULE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_WORDPERFECT_MODULE_PACKAGE_PATH,
        description: 'Emscripten ES module loader for the MPL-2.0 libwpd/librevenge WebAssembly runtime.',
      },
    ],
  },
  {
    rendererId: 'typst',
    assets: [
      {
        id: 'typst-compiler-wasm',
        rendererId: 'typst',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL,
        packagePath: DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_PACKAGE_PATH,
        optionPath: 'typst.compilerWasmUrl',
        description: 'Typst compiler WebAssembly module copied to the public assets directory.',
      },
      {
        id: 'typst-renderer-wasm',
        rendererId: 'typst',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL,
        packagePath: DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_PACKAGE_PATH,
        optionPath: 'typst.rendererWasmUrl',
        description: 'Typst SVG renderer WebAssembly module copied to the public assets directory.',
      },
      {
        id: 'typst-font-assets',
        rendererId: 'typst',
        kind: 'directory',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL,
        optionPath: 'typst.fontAssetsUrl',
        description: 'Self-hosted default Typst text fonts used by typst.ts without public CDN requests.',
      },
    ],
  },
  {
    rendererId: 'illustrator-pdf-design',
    assets: [
      ...createDesignThirdPartyAssets('illustrator-pdf-design'),
      {
        id: 'illustrator-pgf-license',
        rendererId: 'illustrator-pdf-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_ILLUSTRATOR_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_ILLUSTRATOR_LICENSE_PACKAGE_PATH,
        description: 'illustrator-pgf MIT license text for the bundled native Illustrator Worker.',
      },
      {
        id: 'illustrator-pgf-worker',
        rendererId: 'illustrator-pdf-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PACKAGE_PATH,
        optionPath: 'design.illustratorWorkerUrl',
        description: 'Terminable module Worker for bounded native Illustrator PGF/private-source parsing and Canvas rendering.',
      },
      {
        id: 'illustrator-zstd-license',
        rendererId: 'illustrator-pdf-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_ILLUSTRATOR_ZSTD_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_ILLUSTRATOR_ZSTD_LICENSE_PACKAGE_PATH,
        description: 'fzstd MIT license text for the bounded streaming zstd decoder bundled into the Illustrator Worker.',
      },
    ],
  },
  {
    rendererId: 'photoshop-design',
    assets: [
      ...createDesignThirdPartyAssets('photoshop-design'),
      ...createPhotoshopWorkerLicenseAssets('photoshop-design', true),
      {
        id: 'photoshop-design-worker',
        rendererId: 'photoshop-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_WORKER_PACKAGE_PATH,
        optionPath: 'design.workerUrl',
        description: 'Module Worker for bounded PSD/PSB parsing and composite/layer pixel synthesis.',
      },
    ],
  },
  {
    rendererId: 'photoshop-resource-design',
    assets: [
      ...createDesignThirdPartyAssets('photoshop-resource-design'),
      ...createPhotoshopWorkerLicenseAssets('photoshop-resource-design'),
      {
        id: 'photoshop-resource-worker',
        rendererId: 'photoshop-resource-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PACKAGE_PATH,
        optionPath: 'design.adobeResourceWorkerUrl',
        description: 'Module Worker for bounded Photoshop ABR, CSH, PAT, GRD, and ASL resource parsing.',
      },
    ],
  },
  {
    rendererId: 'adobe-palette-design',
    assets: [
      ...createDesignThirdPartyAssets('adobe-palette-design', true),
      {
        id: 'adobe-palette-container-worker',
        rendererId: 'adobe-palette-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH,
        optionPath: 'design.containerWorkerUrl',
        description: 'Terminable module Worker for bounded ASE and ACO palette parsing.',
      },
    ],
  },
  {
    rendererId: 'indesign-exchange-design',
    assets: [
      ...createDesignThirdPartyAssets('indesign-exchange-design', true),
      {
        id: 'indesign-exchange-container-worker',
        rendererId: 'indesign-exchange-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH,
        optionPath: 'design.containerWorkerUrl',
        description: 'Terminable module Worker for bounded ICML, IDMS, and legacy INX parsing and layout-fragment reconstruction.',
      },
    ],
  },
  {
    rendererId: 'adobe-animate-xfl-design',
    assets: [
      ...createDesignThirdPartyAssets('adobe-animate-xfl-design', true),
      {
        id: 'adobe-animate-xfl-container-worker',
        rendererId: 'adobe-animate-xfl-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH,
        optionPath: 'design.containerWorkerUrl',
        description: 'Terminable module Worker for bounded modern ZIP/XFL-based Animate FLA parsing and first-frame reconstruction.',
      },
    ],
  },
  {
    rendererId: 'adobe-xd-design',
    assets: [
      ...createDesignThirdPartyAssets('adobe-xd-design', true),
      {
        id: 'adobe-xd-container-worker',
        rendererId: 'adobe-xd-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH,
        optionPath: 'design.containerWorkerUrl',
        description: 'Terminable module Worker for bounded XD package parsing and saved-preview extraction.',
      },
    ],
  },
  {
    rendererId: 'indesign-native-design',
    assets: [
      ...createDesignThirdPartyAssets('indesign-native-design', true),
      {
        id: 'indesign-native-container-worker',
        rendererId: 'indesign-native-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PACKAGE_PATH,
        optionPath: 'design.containerWorkerUrl',
        description: 'Terminable module Worker for bounded native INDD and INDT parsing.',
      },
    ],
  },
  {
    rendererId: 'postscript-design',
    assets: [
      ...createDesignThirdPartyAssets('postscript-design'),
      {
        id: 'postscript-design-worker',
        rendererId: 'postscript-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PACKAGE_PATH,
        optionPath: 'design.postscriptWorkerUrl',
        description: 'Terminable module Worker for bounded EPS/PostScript execution and page rasterization.',
      },
      {
        id: 'postscript-design-wasm',
        rendererId: 'postscript-design',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PACKAGE_PATH,
        optionPath: 'design.postscriptWasmUrl',
        description: 'License-safe Stet WebAssembly interpreter with OFL substitutes and no bundled CMYK ICC profile.',
      },
      {
        id: 'postscript-design-license-stet-apache',
        rendererId: 'postscript-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_APACHE_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_APACHE_LICENSE_PACKAGE_PATH,
        description: 'Stet Apache-2.0 license text.',
      },
      {
        id: 'postscript-design-license-stet-mit',
        rendererId: 'postscript-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_MIT_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_STET_MIT_LICENSE_PACKAGE_PATH,
        description: 'Stet MIT license text.',
      },
      {
        id: 'postscript-design-license-carlito-ofl',
        rendererId: 'postscript-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_CARLITO_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_CARLITO_LICENSE_PACKAGE_PATH,
        description: 'Carlito SIL Open Font License 1.1 text.',
      },
      {
        id: 'postscript-design-license-tinos-ofl',
        rendererId: 'postscript-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_TINOS_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_TINOS_LICENSE_PACKAGE_PATH,
        description: 'Tinos SIL Open Font License 1.1 text.',
      },
      {
        id: 'postscript-design-license-cousine-ofl',
        rendererId: 'postscript-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_COUSINE_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_COUSINE_LICENSE_PACKAGE_PATH,
        description: 'Cousine SIL Open Font License 1.1 text.',
      },
      {
        id: 'postscript-design-license-noto-symbols-ofl',
        rendererId: 'postscript-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_POSTSCRIPT_NOTO_SYMBOLS_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_POSTSCRIPT_NOTO_SYMBOLS_LICENSE_PACKAGE_PATH,
        description: 'Noto Sans Symbols 2 SIL Open Font License 1.1 text.',
      },
    ],
  },
  {
    rendererId: 'indesign-idml-design',
    assets: [
      ...createDesignThirdPartyAssets('indesign-idml-design'),
      {
        id: 'indesign-idml-worker',
        rendererId: 'indesign-idml-design',
        kind: 'worker',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_IDML_WORKER_PATH,
        packagePath: DEFAULT_FILE_VIEWER_IDML_WORKER_PACKAGE_PATH,
        optionPath: 'design.idmlWorkerUrl',
        description: 'Module Worker that validates IDML packages and renders pages outside the UI thread.',
      },
      {
        id: 'indesign-idml-wasm',
        rendererId: 'indesign-idml-design',
        kind: 'wasm',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_IDML_WASM_PATH,
        packagePath: DEFAULT_FILE_VIEWER_IDML_WASM_PACKAGE_PATH,
        optionPath: 'design.idmlWasmUrl',
        description: 'Self-hosted @paged-media/introspect-wasm CPU renderer used by the IDML Worker.',
      },
      {
        id: 'indesign-idml-license',
        rendererId: 'indesign-idml-design',
        kind: 'license',
        target: 'public',
        required: true,
        defaultPath: DEFAULT_FILE_VIEWER_IDML_LICENSE_PATH,
        packagePath: DEFAULT_FILE_VIEWER_IDML_LICENSE_PACKAGE_PATH,
        description: 'MPL-2.0 license text distributed with the IDML WebAssembly engine.',
      },
    ],
  },
  {
    rendererId: 'data-asset',
    assets: [
      {
        id: 'data-sql-wasm',
        rendererId: 'data-asset',
        kind: 'wasm',
        target: 'public',
        required: false,
        defaultPath: DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL,
        packagePath: DEFAULT_FILE_VIEWER_DATA_SQL_WASM_PACKAGE_PATH,
        optionPath: 'data.sqlWasmUrl',
        description: 'sql.js WebAssembly module copied to the public assets directory for SQLite previews.',
      },
    ],
  },
];

const DEFAULT_FILE_VIEWER_DOCUMENT_BASE_URL = 'file:///';

export const resolveFileViewerAssetUrl = (
  value: string | URL | undefined,
  fallback: string,
  options: ResolveFileViewerAssetUrlOptions = {}
) => {
  const raw = value ? String(value) : fallback;
  const documentBaseUrl = options.documentBaseUrl || DEFAULT_FILE_VIEWER_DOCUMENT_BASE_URL;
  const configuredBaseUrl = !value && configuredFileViewerAssetBaseUrl !== automaticFileViewerAssetBaseUrl
    ? configuredFileViewerAssetBaseUrl
    : undefined;
  const preferredBaseUrl = options.baseUrl || configuredBaseUrl;
  const baseUrl = preferredBaseUrl
    ? preferredBaseUrl.endsWith('/') ? preferredBaseUrl : `${preferredBaseUrl}/`
    : documentBaseUrl;
  const resolvedBase = preferredBaseUrl
    ? new URL(baseUrl, documentBaseUrl).href
    : baseUrl;
  const resolved = new URL(raw, resolvedBase).href;

  return options.trimTrailingSlash ? resolved.replace(/\/+$/, '') : resolved;
};

export const resolveFileViewerArchiveWorkerUrl = (
  options?: Pick<FileViewerArchiveOptions, 'workerUrl'> | null,
  baseUrl?: string
) => {
  return resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH, { baseUrl });
};

export const resolveFileViewerArchiveWasmUrl = (
  options?: Pick<FileViewerArchiveOptions, 'wasmUrl'> | null,
  fallback = '',
  documentBaseUrl?: string
) => {
  if (!options?.wasmUrl) {
    return fallback;
  }
  return resolveFileViewerAssetUrl(options.wasmUrl, fallback || options.wasmUrl, {
    documentBaseUrl,
  });
};

export const resolveFileViewerCadAssetUrls = (
  options?: Pick<FileViewerCadOptions, 'wasmPath' | 'workerUrl' | 'dwfWasmUrl'> | null,
  documentBaseUrl?: string
): ResolvedFileViewerCadAssetUrls => {
  const workerUrl = resolveFileViewerAssetUrl(
    options?.workerUrl,
    DEFAULT_FILE_VIEWER_CAD_WORKER_PATH,
    { documentBaseUrl }
  );
  const dwfWasmUrl = resolveFileViewerAssetUrl(
    options?.dwfWasmUrl,
    DEFAULT_FILE_VIEWER_CAD_DWF_WASM_PATH,
    { documentBaseUrl }
  );
  const versionDefaultRuntimeAsset = (url: string, overridden: boolean) => {
    if (overridden) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}file-viewer-cad=${encodeURIComponent(DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION)}`;
  };
  return {
    wasmPath: resolveFileViewerAssetUrl(options?.wasmPath, DEFAULT_FILE_VIEWER_CAD_WASM_PATH, {
      documentBaseUrl,
      trimTrailingSlash: true,
    }),
    workerUrl: versionDefaultRuntimeAsset(workerUrl, Boolean(options?.workerUrl)),
    dwfWasmUrl: versionDefaultRuntimeAsset(dwfWasmUrl, Boolean(options?.dwfWasmUrl)),
  };
};

export const resolveFileViewerPdfAssetUrls = (
  options?: Pick<FileViewerPdfOptions, 'assetBaseUrl' | 'workerUrl' | 'cMapUrl' | 'wasmUrl' | 'standardFontDataUrl' | 'cjkFontFallbackPath'> | null,
  documentBaseUrl?: string
): ResolvedFileViewerPdfAssetUrls => {
  const rawAssetBaseUrl = options?.assetBaseUrl ? String(options.assetBaseUrl) : '';
  const assetBaseUrl = rawAssetBaseUrl
    ? new URL(
        rawAssetBaseUrl.endsWith('/') ? rawAssetBaseUrl : `${rawAssetBaseUrl}/`,
        documentBaseUrl || DEFAULT_FILE_VIEWER_DOCUMENT_BASE_URL
      ).href
    : documentBaseUrl;
  return {
    workerUrl: resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_PDF_WORKER_PATH, {
      documentBaseUrl: assetBaseUrl,
    }),
    cMapUrl: resolveFileViewerAssetUrl(options?.cMapUrl, DEFAULT_FILE_VIEWER_PDF_CMAP_PATH, {
      documentBaseUrl: assetBaseUrl,
    }),
    wasmUrl: resolveFileViewerAssetUrl(options?.wasmUrl, DEFAULT_FILE_VIEWER_PDF_WASM_PATH, {
      documentBaseUrl: assetBaseUrl,
    }),
    standardFontDataUrl: resolveFileViewerAssetUrl(
      options?.standardFontDataUrl,
      DEFAULT_FILE_VIEWER_PDF_STANDARD_FONT_PATH,
      { documentBaseUrl: assetBaseUrl }
    ),
    cjkFontFallbackPath: resolveFileViewerAssetUrl(
      options?.cjkFontFallbackPath,
      DEFAULT_FILE_VIEWER_PDF_CJK_FONT_FALLBACK_PATH,
      { documentBaseUrl: assetBaseUrl }
    ),
  };
};

export const resolveFileViewerDrawioViewerScriptUrl = (
  options?: Pick<FileViewerDrawingOptions, 'viewerScriptUrl'> | null,
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(
    options?.viewerScriptUrl,
    DEFAULT_FILE_VIEWER_DRAWIO_VIEWER_SCRIPT_PATH,
    { documentBaseUrl }
  );
};

export const resolveFileViewerDocxWorkerUrl = (
  options?: Pick<FileViewerDocxOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => {
  const resolved = resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH, {
    documentBaseUrl,
  });
  if (options?.workerUrl) {
    return resolved;
  }
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}file-viewer-docx=${encodeURIComponent(DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION)}`;
};

export const resolveFileViewerDocxWorkerJsZipUrl = (
  options?: Pick<FileViewerDocxOptions, 'workerJsZipUrl'> | null,
  documentBaseUrl?: string
) => {
  const resolved = resolveFileViewerAssetUrl(
    options?.workerJsZipUrl,
    DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH,
    { documentBaseUrl }
  );
  if (options?.workerJsZipUrl) {
    return resolved;
  }
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}file-viewer-docx=${encodeURIComponent(DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION)}`;
};

export const resolveFileViewerSpreadsheetWorkerUrl = (
  options?: Pick<FileViewerSpreadsheetOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH, {
    documentBaseUrl,
  });
};

export const resolveFileViewerIworkWorkerUrl = (
  options?: Pick<FileViewerIworkOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_IWORK_WORKER_PATH, { documentBaseUrl });

export const resolveFileViewerHangulWorkerUrl = (
  options?: Pick<FileViewerHangulOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_HANGUL_WORKER_PATH, { documentBaseUrl });

export const resolveFileViewerWordPerfectWorkerUrl = (
  options?: Pick<FileViewerWordPerfectOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_WORDPERFECT_WORKER_PATH, { documentBaseUrl });

export const resolveFileViewerWordPerfectWasmUrl = (
  options?: Pick<FileViewerWordPerfectOptions, 'wasmUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.wasmUrl, DEFAULT_FILE_VIEWER_WORDPERFECT_WASM_PATH, { documentBaseUrl });

export const resolveFileViewerPresentationWorkerUrl = (
  options?: Pick<FileViewerPresentationOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_PRESENTATION_WORKER_PATH, {
    documentBaseUrl,
  });
};

export const resolveFileViewerTypstCompilerWasmUrl = (
  options?: Pick<FileViewerTypstOptions, 'compilerWasmUrl'> | null,
  overrides: Array<string | undefined> = [],
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(
    options?.compilerWasmUrl || overrides.find(Boolean),
    DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL,
    { documentBaseUrl }
  );
};

export const resolveFileViewerTypstRendererWasmUrl = (
  options?: Pick<FileViewerTypstOptions, 'rendererWasmUrl'> | null,
  overrides: Array<string | undefined> = [],
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(
    options?.rendererWasmUrl || overrides.find(Boolean),
    DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL,
    { documentBaseUrl }
  );
};

export const resolveFileViewerTypstFontAssetsUrl = (
  options?: Pick<FileViewerTypstOptions, 'fontAssetsUrl'> | null,
  overrides: Array<string | undefined> = [],
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(
    options?.fontAssetsUrl || overrides.find(Boolean),
    DEFAULT_FILE_VIEWER_TYPST_FONT_ASSETS_URL,
    { documentBaseUrl, trimTrailingSlash: true }
  );
};

export const resolveFileViewerDataSqlWasmUrl = (
  options?: Pick<FileViewerDataOptions, 'sqlWasmUrl'> | null,
  overrides: Array<string | undefined> = [],
  documentBaseUrl?: string
) => {
  return resolveFileViewerAssetUrl(
    options?.sqlWasmUrl || overrides.find(Boolean),
    DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL,
    { documentBaseUrl }
  );
};

export const resolveFileViewerDesignWorkerUrl = (
  options?: Pick<FileViewerDesignOptions, 'workerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.workerUrl, DEFAULT_FILE_VIEWER_DESIGN_WORKER_PATH, { documentBaseUrl });

export const resolveFileViewerIllustratorWorkerUrl = (
  options?: Pick<FileViewerDesignOptions, 'illustratorWorkerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(
  options?.illustratorWorkerUrl,
  DEFAULT_FILE_VIEWER_ILLUSTRATOR_WORKER_PATH,
  { documentBaseUrl }
);

export const resolveFileViewerDesignContainerWorkerUrl = (
  options?: Pick<FileViewerDesignOptions, 'containerWorkerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(
  options?.containerWorkerUrl,
  DEFAULT_FILE_VIEWER_DESIGN_CONTAINER_WORKER_PATH,
  { documentBaseUrl }
);

export const resolveFileViewerAdobeResourceWorkerUrl = (
  options?: Pick<FileViewerDesignOptions, 'adobeResourceWorkerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(
  options?.adobeResourceWorkerUrl,
  DEFAULT_FILE_VIEWER_ADOBE_RESOURCE_WORKER_PATH,
  { documentBaseUrl }
);

export const resolveFileViewerPostscriptWorkerUrl = (
  options?: Pick<FileViewerDesignOptions, 'postscriptWorkerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(
  options?.postscriptWorkerUrl,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_WORKER_PATH,
  { documentBaseUrl }
);

export const resolveFileViewerPostscriptWasmUrl = (
  options?: Pick<FileViewerDesignOptions, 'postscriptWasmUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(
  options?.postscriptWasmUrl,
  DEFAULT_FILE_VIEWER_POSTSCRIPT_WASM_PATH,
  { documentBaseUrl }
);

export const resolveFileViewerIdmlWorkerUrl = (
  options?: Pick<FileViewerDesignOptions, 'idmlWorkerUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.idmlWorkerUrl, DEFAULT_FILE_VIEWER_IDML_WORKER_PATH, { documentBaseUrl });

export const resolveFileViewerIdmlWasmUrl = (
  options?: Pick<FileViewerDesignOptions, 'idmlWasmUrl'> | null,
  documentBaseUrl?: string
) => resolveFileViewerAssetUrl(options?.idmlWasmUrl, DEFAULT_FILE_VIEWER_IDML_WASM_PATH, { documentBaseUrl });

export const resolveFileViewerModelAssetUrls = (
  options?: Pick<FileViewerModelOptions, 'workerUrl' | 'runtimeUrl' | 'wasmUrl'> | null,
  documentBaseUrl?: string
): ResolvedFileViewerModelAssetUrls => ({
  workerUrl: resolveFileViewerAssetUrl(
    options?.workerUrl,
    DEFAULT_FILE_VIEWER_MODEL_WORKER_URL,
    { documentBaseUrl }
  ),
  runtimeUrl: resolveFileViewerAssetUrl(
    options?.runtimeUrl,
    DEFAULT_FILE_VIEWER_MODEL_RUNTIME_URL,
    { documentBaseUrl }
  ),
  wasmUrl: resolveFileViewerAssetUrl(
    options?.wasmUrl,
    DEFAULT_FILE_VIEWER_MODEL_WASM_URL,
    { documentBaseUrl }
  ),
});

export const listFileViewerRendererAssetManifests = () => {
  return [...DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS];
};

export const getFileViewerRendererAssetManifest = (rendererId: string) => {
  return DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS.find(manifest => manifest.rendererId === rendererId) || null;
};

const getRendererAssetOptionValue = (
  options: FileViewerOptions | null | undefined,
  optionPath: FileViewerRendererAssetOptionPath | undefined
) => {
  switch (optionPath) {
    case 'archive.workerUrl':
      return options?.archive?.workerUrl;
    case 'archive.wasmUrl':
      return options?.archive?.wasmUrl;
    case 'cad.wasmPath':
      return options?.cad?.wasmPath;
    case 'cad.workerUrl':
      return options?.cad?.workerUrl;
    case 'cad.dwfWasmUrl':
      return options?.cad?.dwfWasmUrl;
    case 'data.sqlWasmUrl':
      return options?.data?.sqlWasmUrl;
    case 'design.illustratorWorkerUrl':
      return options?.design?.illustratorWorkerUrl;
    case 'design.workerUrl':
      return options?.design?.workerUrl;
    case 'design.containerWorkerUrl':
      return options?.design?.containerWorkerUrl;
    case 'design.adobeResourceWorkerUrl':
      return options?.design?.adobeResourceWorkerUrl;
    case 'design.postscriptWorkerUrl':
      return options?.design?.postscriptWorkerUrl;
    case 'design.postscriptWasmUrl':
      return options?.design?.postscriptWasmUrl;
    case 'design.idmlWorkerUrl':
      return options?.design?.idmlWorkerUrl;
    case 'design.idmlWasmUrl':
      return options?.design?.idmlWasmUrl;
    case 'docx.workerJsZipUrl':
      return options?.docx?.workerJsZipUrl;
    case 'docx.workerUrl':
      return options?.docx?.workerUrl;
    case 'drawing.viewerScriptUrl':
      return options?.drawing?.viewerScriptUrl;
    case 'iwork.workerUrl':
      return options?.iwork?.workerUrl;
    case 'hangul.workerUrl':
      return options?.hangul?.workerUrl;
    case 'wordPerfect.workerUrl':
      return options?.wordPerfect?.workerUrl;
    case 'wordPerfect.wasmUrl':
      return options?.wordPerfect?.wasmUrl;
    case 'model.workerUrl':
      return options?.model?.workerUrl;
    case 'model.runtimeUrl':
      return options?.model?.runtimeUrl;
    case 'model.wasmUrl':
      return options?.model?.wasmUrl;
    case 'pdf.workerUrl':
      return options?.pdf?.workerUrl;
    case 'pdf.cMapUrl':
      return options?.pdf?.cMapUrl;
    case 'pdf.wasmUrl':
      return options?.pdf?.wasmUrl;
    case 'pdf.standardFontDataUrl':
      return options?.pdf?.standardFontDataUrl;
    case 'pdf.cjkFontFallbackPath':
      return options?.pdf?.cjkFontFallbackPath;
    case 'presentation.pptModuleUrl':
      return options?.presentation?.pptModuleUrl;
    case 'presentation.pptWorkerUrl':
      return options?.presentation?.pptWorkerUrl;
    case 'presentation.pptWasmUrl':
      return options?.presentation?.pptWasmUrl;
    case 'presentation.pptFontUrl':
      return options?.presentation?.pptFontUrl;
    case 'presentation.workerUrl':
      return options?.presentation?.workerUrl;
    case 'spreadsheet.workerUrl':
      return options?.spreadsheet?.workerUrl;
    case 'typst.compilerWasmUrl':
      return options?.typst?.compilerWasmUrl;
    case 'typst.fontAssetsUrl':
      return options?.typst?.fontAssetsUrl;
    case 'typst.rendererWasmUrl':
      return options?.typst?.rendererWasmUrl;
    default:
      return undefined;
  }
};

export const resolveFileViewerRendererAssets = (
  rendererId: string,
  resolveOptions: ResolveFileViewerRendererAssetsOptions = {}
): ResolvedFileViewerRendererAsset[] => {
  const manifest = getFileViewerRendererAssetManifest(rendererId);
  if (!manifest) {
    return [];
  }

  return manifest.assets.map(asset => {
    const optionValue = getRendererAssetOptionValue(resolveOptions.options, asset.optionPath);
    const configuredValue = optionValue ? String(optionValue) : undefined;
    const fallbackValue = asset.defaultUrl || asset.defaultPath;
    const resolved: ResolvedFileViewerRendererAsset = {
      ...asset,
      configured: Boolean(optionValue),
    };

    if (configuredValue || fallbackValue) {
      resolved.url = resolveFileViewerAssetUrl(
        configuredValue,
        fallbackValue || configuredValue || '',
        {
          baseUrl: resolveOptions.baseUrl,
          documentBaseUrl: resolveOptions.documentBaseUrl,
          trimTrailingSlash:
            asset.kind === 'directory' ||
            asset.kind === 'wasm-directory' ||
            resolveOptions.trimTrailingSlash,
        }
      );
    }

    return resolved;
  });
};
