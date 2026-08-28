import { $typst, MemoryAccessModel } from '@myriaddreamin/typst.ts';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import {
  resolveFileViewerTypstCompilerWasmUrl,
  resolveFileViewerTypstFontAssetsUrl,
  resolveFileViewerTypstRendererWasmUrl,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets';
import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter,
  formatCssPixels,
  registerFileViewerZoomProvider,
  readFileViewerText,
  type FileRenderContext,
  type FileRenderExportAdapter,
  type FileViewerRenderedInstance,
  type FileViewerZoomState,
  type PrintPageSize,
  unregisterFileViewerZoomProvider,
} from '@file-viewer/core';
import { sanitizeTypstSvgDocument } from './sanitize.js';

declare global {
  interface Window {
    __FLYFISH_TYPST_COMPILER_WASM_URL__?: string;
    __FLYFISH_TYPST_FONT_ASSETS_URL__?: string;
    __FLYFISH_TYPST_RENDERER_WASM_URL__?: string;
  }
}

type TypstRenderState = 'loading' | 'ready' | 'error';

interface TypstEngineAssetCandidate {
  compilerWasmUrl: string;
  fontAssetsUrl: string;
  rendererWasmUrl: string;
  source: 'configured' | 'local';
  preflight: boolean;
}

export interface TypstRenderedPage extends PrintPageSize {
  index: number;
  svg: string;
  svgNode: Element;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
const TYPST_TRUSTED_TYPES_POLICY_NAME = 'file-viewer-typst-svg';

interface TypstTrustedHtmlPolicy {
  createHTML(value: string): unknown;
}

interface TypstTrustedTypesFactory {
  createPolicy(name: string, rules: { createHTML(value: string): string }): TypstTrustedHtmlPolicy;
}

const typstTrustedTypesPolicies = new WeakMap<object, TypstTrustedHtmlPolicy>();

const assertTypstSvgIsSafeForInertParsing = (value: string) => {
  if (
    /<!\s*(?:doctype|entity)\b|<\?|<\s*\/?\s*(?:script|iframe|object|embed|form|base|link|meta)\b|\s(?:on[a-z0-9_-]+|srcdoc)\s*=/i.test(
      value,
    )
  ) {
    throw new TypeError('Typst SVG contains executable markup and was rejected before parsing.');
  }
  return value;
};

const createTypstSvgParserInput = (value: string, documentRef?: Document) => {
  const windowRef = documentRef?.defaultView || (typeof window !== 'undefined' ? window : null);
  const trustedTypes = (windowRef as unknown as { trustedTypes?: TypstTrustedTypesFactory } | null)
    ?.trustedTypes;
  if (!trustedTypes) {
    return value;
  }
  let policy = typstTrustedTypesPolicies.get(trustedTypes as object);
  if (!policy) {
    try {
      policy = trustedTypes.createPolicy(TYPST_TRUSTED_TYPES_POLICY_NAME, {
        createHTML: assertTypstSvgIsSafeForInertParsing,
      });
      typstTrustedTypesPolicies.set(trustedTypes as object, policy);
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      const policyError = new Error(
        `Trusted Types must allow the ${TYPST_TRUSTED_TYPES_POLICY_NAME} policy for Typst SVG parsing.${detail}`,
      );
      (policyError as Error & { cause?: unknown }).cause = error;
      throw policyError;
    }
  }
  return policy.createHTML(value);
};

const typstStyle = `
.typst-viewer{min-height:100%;overflow:auto;background:var(--file-viewer-render-surface-background,#eef1f4);color:#172033}
.typst-toolbar{position:sticky;top:0;z-index:2;display:flex;min-height:52px;align-items:center;justify-content:space-between;gap:16px;padding:10px 18px;border-bottom:1px solid rgba(120,134,155,.18);background:rgba(248,250,252,.92);backdrop-filter:blur(16px)}
.typst-toolbar div{min-width:0}
.typst-toolbar strong,.typst-toolbar span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.typst-toolbar strong{color:#172033;font-size:14px;font-weight:800}
.typst-toolbar span,.typst-toolbar em{color:#6a778b;font-size:12px;font-style:normal;font-weight:700}
.typst-pages{display:flex;min-height:calc(100% - 52px);flex-direction:column;align-items:center;gap:22px;box-sizing:border-box;padding:28px 16px 44px}
.typst-page-shell{max-width:100%;overflow:hidden;border:1px solid rgba(20,35,53,.1);background:#fff;box-shadow:0 18px 44px rgba(15,23,42,.14)}
.typst-page-content svg{display:block;width:100%;height:auto}
.typst-loading,.typst-error{width:min(520px,calc(100% - 32px));box-sizing:border-box;margin:80px auto;padding:26px;border:1px solid rgba(120,134,155,.18);border-radius:14px;background:#fff;box-shadow:0 18px 44px rgba(15,23,42,.12)}
.typst-loading{display:grid;justify-items:center;gap:10px;text-align:center}
.typst-loading span{width:34px;height:34px;border:3px solid rgba(46,130,94,.18);border-top-color:#239661;border-radius:999px;animation:typst-spin .8s linear infinite}
.typst-loading strong,.typst-error strong{color:#172033;font-size:16px}
.typst-loading p{margin:0;color:#6a778b;font-size:13px}
.typst-error{color:#9f1d1d}
.typst-error pre{max-height:360px;margin:14px 0 0;overflow:auto;border-radius:10px;background:#fff1f2;color:#9f1d1d;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:12px;line-height:1.7;padding:14px;white-space:pre-wrap}
[data-viewer-theme='dark'] .typst-viewer{background:var(--file-viewer-render-surface-background,#101820);color:#e6edf3}
[data-viewer-theme='dark'] .typst-toolbar{border-bottom-color:rgba(139,148,158,.22);background:rgba(15,23,42,.9)}
[data-viewer-theme='dark'] .typst-toolbar strong{color:#f8fafc}
[data-viewer-theme='dark'] .typst-toolbar span,[data-viewer-theme='dark'] .typst-toolbar em{color:#9aa7b8}
[data-viewer-theme='dark'] .typst-page-shell{border-color:rgba(139,148,158,.26);box-shadow:0 24px 56px rgba(0,0,0,.38)}
[data-viewer-theme='dark'] .typst-loading,[data-viewer-theme='dark'] .typst-error{border-color:rgba(139,148,158,.22);background:#151b23;box-shadow:0 24px 56px rgba(0,0,0,.32)}
[data-viewer-theme='dark'] .typst-loading strong,[data-viewer-theme='dark'] .typst-error strong{color:#f8fafc}
@keyframes typst-spin{to{transform:rotate(360deg)}}
@media (max-width:767px){.typst-toolbar{align-items:flex-start;flex-direction:column;gap:4px}.typst-pages{gap:16px;padding:16px 10px 28px}}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .typst-viewer{background:var(--file-viewer-render-surface-background,#101820);color:#e6edf3}[data-viewer-theme='system'] .typst-toolbar{border-bottom-color:rgba(139,148,158,.22);background:rgba(15,23,42,.9)}[data-viewer-theme='system'] .typst-toolbar strong{color:#f8fafc}[data-viewer-theme='system'] .typst-toolbar span,[data-viewer-theme='system'] .typst-toolbar em{color:#9aa7b8}[data-viewer-theme='system'] .typst-page-shell{border-color:rgba(139,148,158,.26);box-shadow:0 24px 56px rgba(0,0,0,.38)}[data-viewer-theme='system'] .typst-loading,[data-viewer-theme='system'] .typst-error{border-color:rgba(139,148,158,.22);background:#151b23;box-shadow:0 24px 56px rgba(0,0,0,.32)}[data-viewer-theme='system'] .typst-loading strong,[data-viewer-theme='system'] .typst-error strong{color:#f8fafc}}
`;

let typstEngineConfigKey = '';
const DEFAULT_TYPST_RENDER_TIMEOUT_MS = 180000;

class TypstRenderTimeoutError extends Error {
  constructor(timeoutMs: number, message?: string) {
    super(message || `Typst WASM / font loading or compilation exceeded ${Math.round(timeoutMs / 1000)} seconds`);
    this.name = 'TypstRenderTimeoutError';
  }
}

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = typstStyle;
  return style;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const getWindowOverride = (
  key:
    | '__FLYFISH_TYPST_COMPILER_WASM_URL__'
    | '__FLYFISH_TYPST_FONT_ASSETS_URL__'
    | '__FLYFISH_TYPST_RENDERER_WASM_URL__'
) => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window[key];
};

const configureTypstEngine = (
  compilerWasmUrl: string,
  rendererWasmUrl: string,
  fontAssetsUrl: string
) => {
  const normalizedFontAssetsUrl = fontAssetsUrl.endsWith('/') ? fontAssetsUrl : `${fontAssetsUrl}/`;
  const configKey = `${compilerWasmUrl}\n${rendererWasmUrl}\n${normalizedFontAssetsUrl}`;

  if (typstEngineConfigKey === configKey) {
    return;
  }

  // typst.ts otherwise installs public registry/font fetchers. File Viewer keeps
  // Typst deterministic for enterprise/offline deployments by pinning both.
  $typst.use(
    TypstSnippet.withAccessModel(new MemoryAccessModel()),
    TypstSnippet.preloadFontAssets({
      assets: ['text'],
      assetUrlPrefix: {
        text: normalizedFontAssetsUrl,
        _: normalizedFontAssetsUrl,
      },
    })
  );
  $typst.setCompilerInitOptions({
    getModule: () => compilerWasmUrl,
  });
  $typst.setRendererInitOptions({
    getModule: () => rendererWasmUrl,
  });
  typstEngineConfigKey = configKey;
};

const pushUniqueTypstCandidate = (
  candidates: TypstEngineAssetCandidate[],
  candidate: TypstEngineAssetCandidate
) => {
  if (candidates.some(item =>
    item.compilerWasmUrl === candidate.compilerWasmUrl &&
    item.fontAssetsUrl === candidate.fontAssetsUrl &&
    item.rendererWasmUrl === candidate.rendererWasmUrl
  )) {
    return;
  }
  candidates.push(candidate);
};

const resolveTypstEngineCandidates = (
  context?: FileRenderContext,
  documentBaseUrl?: string
): TypstEngineAssetCandidate[] => {
  const typstOptions = context?.options?.typst;
  const compilerOverride = getWindowOverride('__FLYFISH_TYPST_COMPILER_WASM_URL__');
  const fontAssetsOverride = getWindowOverride('__FLYFISH_TYPST_FONT_ASSETS_URL__');
  const rendererOverride = getWindowOverride('__FLYFISH_TYPST_RENDERER_WASM_URL__');
  const compilerWasmUrl = resolveFileViewerTypstCompilerWasmUrl(typstOptions, [
    compilerOverride,
  ], documentBaseUrl);
  const fontAssetsUrl = resolveFileViewerTypstFontAssetsUrl(typstOptions, [
    fontAssetsOverride,
  ], documentBaseUrl);
  const rendererWasmUrl = resolveFileViewerTypstRendererWasmUrl(typstOptions, [
    rendererOverride,
  ], documentBaseUrl);
  const hasConfiguredAsset = Boolean(
    typstOptions?.compilerWasmUrl ||
    typstOptions?.fontAssetsUrl ||
    typstOptions?.rendererWasmUrl ||
    compilerOverride ||
    fontAssetsOverride ||
    rendererOverride
  );
  const candidates: TypstEngineAssetCandidate[] = [];

  pushUniqueTypstCandidate(candidates, {
    compilerWasmUrl,
    fontAssetsUrl,
    rendererWasmUrl,
    source: hasConfiguredAsset ? 'configured' : 'local',
    preflight: !hasConfiguredAsset,
  });

  return candidates;
};

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const isKnownMissingWasmUrl = async (url: string) => {
  if (typeof fetch !== 'function' || !isHttpUrl(url)) {
    return false;
  }

  try {
    const response = await fetch(url, {
      cache: 'force-cache',
      method: 'HEAD',
    });
    return response.status === 404 || response.status === 410;
  } catch {
    return false;
  }
};

const resolveKnownMissingTypstAsset = async (candidate: TypstEngineAssetCandidate) => {
  if (await isKnownMissingWasmUrl(candidate.compilerWasmUrl)) {
    return `Typst compiler WASM missing: ${candidate.compilerWasmUrl}`;
  }
  if (await isKnownMissingWasmUrl(candidate.rendererWasmUrl)) {
    return `Typst renderer WASM missing: ${candidate.rendererWasmUrl}`;
  }
  return '';
};

const isTypstAssetLoadError = (error: unknown) => {
  if (Array.isArray(error)) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /wasm|webassembly|fetch|module|instantiate|compile|network|404|410/i.test(message);
};

const escapeAttribute = (value: string) => {
  return value.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] || char;
  });
};

const readNumberAttribute = (element: Element, name: string) => {
  const value = Number.parseFloat(element.getAttribute(name) || '');
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const serializeNode = (node: Node) => {
  return new XMLSerializer().serializeToString(node);
};

export const parseTypstSvgPages = (
  svgText: string,
  svgParseFailedMessage: string,
  documentRef?: Document,
): TypstRenderedPage[] => {
  const Parser = documentRef?.defaultView?.DOMParser || DOMParser;
  const parser = new Parser();
  const documentSvg = parser.parseFromString(
    createTypstSvgParserInput(svgText, documentRef) as string,
    'image/svg+xml',
  );
  const parseError = documentSvg.querySelector('parsererror');
  if (parseError) {
    throw new Error(parseError.textContent || svgParseFailedMessage);
  }

  sanitizeTypstSvgDocument(documentSvg);
  const root = documentSvg.documentElement;
  if (root.namespaceURI !== SVG_NAMESPACE || root.localName.toLowerCase() !== 'svg') {
    throw new Error(svgParseFailedMessage);
  }
  const sharedNodes = Array.from(root.children)
    .filter(child => ['style', 'defs'].includes(child.tagName.toLowerCase()))
    .map(child => child.cloneNode(true));
  const pageGroups = Array.from(root.querySelectorAll('g.typst-page'));
  const fallbackWidth = readNumberAttribute(root, 'data-width') ||
    readNumberAttribute(root, 'width') ||
    596;
  const fallbackHeight = readNumberAttribute(root, 'data-height') ||
    readNumberAttribute(root, 'height') ||
    842;

  if (!pageGroups.length) {
    return [{
      index: 1,
      width: fallbackWidth,
      height: fallbackHeight,
      svg: serializeNode(root),
      svgNode: root,
    }];
  }

  return pageGroups.map((group, index) => {
    const pageWidth = readNumberAttribute(group, 'data-page-width') || fallbackWidth;
    const pageHeight = readNumberAttribute(group, 'data-page-height') || fallbackHeight;
    const pageClone = group.cloneNode(true) as Element;
    pageClone.setAttribute('transform', 'translate(0, 0)');
    const pageSvg = documentSvg.createElementNS(SVG_NAMESPACE, 'svg');
    pageSvg.setAttribute('style', 'overflow:visible;');
    pageSvg.setAttribute('class', 'typst-doc');
    pageSvg.setAttribute('viewBox', `0 0 ${pageWidth} ${pageHeight}`);
    pageSvg.setAttribute('width', String(pageWidth));
    pageSvg.setAttribute('height', String(pageHeight));
    pageSvg.setAttribute('data-width', String(pageWidth));
    pageSvg.setAttribute('data-height', String(pageHeight));
    pageSvg.setAttributeNS(XMLNS_NAMESPACE, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
    pageSvg.setAttributeNS(XMLNS_NAMESPACE, 'xmlns:h5', 'http://www.w3.org/1999/xhtml');
    pageSvg.append(...sharedNodes.map(node => node.cloneNode(true)), pageClone);
    sanitizeTypstSvgDocument(pageSvg);

    return {
      index: index + 1,
      width: pageWidth,
      height: pageHeight,
      svg: serializeNode(pageSvg),
      svgNode: pageSvg,
    };
  });
};

export const importTypstSvgPageNode = (
  documentRef: Document,
  page: Pick<TypstRenderedPage, 'svgNode'>,
) => {
  return documentRef.importNode(page.svgNode, true);
};

const formatTypstError = (error: unknown) => {
  if (Array.isArray(error)) {
    return error.map(item => {
      if (item && typeof item === 'object' && 'message' in item) {
        const severity = 'severity' in item ? String(item.severity) : 'Error';
        return `${severity}: ${String(item.message)}`;
      }
      return String(item);
    }).join('\n');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const formatTypstRuntimeError = (
  error: unknown,
  t: ReturnType<typeof createFileViewerTranslator>
) => {
  const message = formatTypstError(error);

  if (error instanceof TypstRenderTimeoutError) {
    return [
      message,
      t('typst.error.timeoutHint')
    ].join('\n\n');
  }

  if (isTypstAssetLoadError(error)) {
    return [
      message,
      t('typst.error.assetHint')
    ].join('\n\n');
  }

  return message;
};

const clampZoom = (value: number) => {
  return Math.min(3, Math.max(0.3, Number(value.toFixed(2))));
};

const normalizeRenderTimeoutMs = (timeoutMs?: number) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs === undefined) {
    return DEFAULT_TYPST_RENDER_TIMEOUT_MS;
  }
  return Math.max(0, timeoutMs);
};

const withRenderTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage?: string) => {
  if (timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TypstRenderTimeoutError(timeoutMs, timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const buildExportStyles = () => `
  <style>
    .typst-export-document {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      margin: 0;
      padding: 24px;
      background: #eef1f4;
    }
    .typst-export-page {
      box-sizing: border-box;
      flex: 0 0 auto;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
    }
    .typst-export-page svg {
      display: block;
      width: 100%;
      height: auto;
    }
  </style>
`;

const buildExportHtml = (pages: TypstRenderedPage[], filename?: string) => {
  return `${buildExportStyles()}<main class="typst-export-document" aria-label="${escapeAttribute(filename || 'Typst document')}">${pages.map(page => {
    const width = formatCssPixels(page.width);
    const height = formatCssPixels(page.height);
    return `<section class="typst-export-page viewer-print-page" style="--viewer-print-page-width:${width};--viewer-print-page-height:${height};width:${width};height:${height};" aria-label="Page ${page.index}">${page.svg}</section>`;
  }).join('')}</main>`;
};

const buildPrintStyle = (pages: TypstRenderedPage[]) => {
  const firstPage = pages[0];
  const width = firstPage ? formatCssPixels(firstPage.width) : '596px';
  const height = firstPage ? formatCssPixels(firstPage.height) : '842px';

  return `
    @page { size: ${width} ${height}; margin: 0; }
    @media print {
      html,
      body {
        width: ${width};
        min-width: ${width};
        margin: 0 !important;
        background: #ffffff !important;
      }
      .typst-export-document {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .typst-export-page {
        display: block !important;
        margin: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
        break-after: page;
        page-break-after: always;
      }
      .typst-export-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      .typst-export-page svg {
        width: 100% !important;
        height: auto !important;
      }
    }
  `;
};

const buildExportAdapter = (
  pages: TypstRenderedPage[],
  filename?: string
): FileRenderExportAdapter | null => {
  if (!pages.length) {
    return null;
  }

  return {
    includeDocumentStyles: false,
    print: true,
    exportHtml: true,
    printStyle: () => buildPrintStyle(pages),
    toHtml: () => buildExportHtml(pages, filename),
  };
};

const getPageSummary = (
  pages: TypstRenderedPage[],
  t: ReturnType<typeof createFileViewerTranslator>
) => {
  if (!pages.length) {
    return t('typst.pageSummary.empty');
  }
  const firstPage = pages[0];
  return t('typst.pageSummary.ready', {
    count: pages.length,
    width: Math.round(firstPage.width),
    height: Math.round(firstPage.height),
  });
};

export default async function renderTypst(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options);
  const source = await readFileViewerText(buffer);
  const documentRef = target.ownerDocument || document;
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  let state: TypstRenderState = 'loading';
  let pages: TypstRenderedPage[] = [];
  let errorMessage = '';
  let zoom = 1;
  let renderToken = 0;
  let disposed = false;
  const pageShells = new Map<number, HTMLElement>();

  const root = createElement(documentRef, 'div', 'typst-viewer');
  root.dataset.viewerZoomProvider = 'typst';
  const toolbar = createElement(documentRef, 'header', 'typst-toolbar');
  const titleGroup = createElement(documentRef, 'div');
  const title = createElement(documentRef, 'strong', undefined, context?.filename || 'Typst document');
  const summary = createElement(documentRef, 'span', undefined, t('typst.summaryRenderer'));
  const status = createElement(documentRef, 'em', undefined, t('typst.status.compiling'));
  const body = createElement(documentRef, 'div');

  titleGroup.append(title, summary);
  toolbar.append(titleGroup, status);
  root.append(toolbar, body);
  target.replaceChildren(createStyle(documentRef), root);

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 3,
    canZoomOut: zoom > 0.3,
    canReset: zoom !== 1,
    minScale: 0.3,
    maxScale: 3,
  });

  const applyPageZoom = () => {
    pages.forEach(page => {
      const shell = pageShells.get(page.index);
      if (!shell) {
        return;
      }
      shell.style.width = `${page.width * zoom}px`;
      shell.style.maxWidth = '100%';
      shell.style.height = 'auto';
    });
  };

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale);
    applyPageZoom();
    zoomEmitter.emit();
    return getZoomState();
  };

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  const registerExportAdapter = () => {
    context?.registerExportAdapter?.(buildExportAdapter(pages, context.filename));
  };

  const renderLoading = () => {
    const loading = createElement(documentRef, 'div', 'typst-loading');
    loading.setAttribute('role', 'status');
    loading.append(
      createElement(documentRef, 'span'),
      createElement(documentRef, 'strong', undefined, t('typst.loading.title')),
      createElement(documentRef, 'p', undefined, t('typst.loading.hint'))
    );
    body.replaceChildren(loading);
  };

  const renderError = () => {
    const error = createElement(documentRef, 'div', 'typst-error');
    error.append(
      createElement(documentRef, 'strong', undefined, t('typst.error.title')),
      createElement(documentRef, 'pre', undefined, errorMessage)
    );
    body.replaceChildren(error);
  };

  const renderPages = () => {
    pageShells.clear();
    const pagesRoot = createElement(documentRef, 'main', 'typst-pages');
    pagesRoot.setAttribute('aria-label', 'Typst preview pages');

    pages.forEach(page => {
      const shell = createElement(documentRef, 'section', 'typst-page-shell');
      shell.setAttribute('aria-label', `Page ${page.index}`);
      const content = createElement(documentRef, 'div', 'typst-page-content');
      content.replaceChildren(importTypstSvgPageNode(documentRef, page));
      shell.append(content);
      pageShells.set(page.index, shell);
      pagesRoot.append(shell);
    });

    body.replaceChildren(pagesRoot);
    applyPageZoom();
  };

  const syncUi = () => {
    summary.textContent = state === 'ready'
      ? getPageSummary(pages, t)
      : t('typst.summaryRenderer');
    status.textContent = state === 'loading'
      ? t('typst.status.compiling')
      : state === 'error'
        ? t('typst.status.failed')
        : t('typst.status.rendered');

    if (state === 'loading') {
      renderLoading();
    } else if (state === 'error') {
      renderError();
    } else {
      renderPages();
    }
  };

  const renderTypstSvg = async () => {
    const candidates = resolveTypstEngineCandidates(
      context,
      resolveFileViewerRuntimeAssetBaseUrl(documentRef)
    );
    const timeoutMs = normalizeRenderTimeoutMs(context?.options?.typst?.renderTimeoutMs);
    let lastError: unknown;

    for (const candidate of candidates) {
      const missingAsset = candidate.preflight
        ? await resolveKnownMissingTypstAsset(candidate)
        : '';
      if (missingAsset) {
        lastError = new Error(missingAsset);
        continue;
      }

      try {
        configureTypstEngine(candidate.compilerWasmUrl, candidate.rendererWasmUrl, candidate.fontAssetsUrl);
        return await withRenderTimeout($typst.svg({
          mainContent: source,
          data_selection: {
            body: true,
            defs: true,
            css: true,
            js: false,
          },
        }), timeoutMs, t('typst.error.timeout', { seconds: Math.round(timeoutMs / 1000) }));
      } catch (error) {
        lastError = error;
        if (error instanceof TypstRenderTimeoutError || !isTypstAssetLoadError(error)) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(t('typst.error.wasmLoadFailed'));
  };

  const render = async () => {
    const token = ++renderToken;
    state = 'loading';
    errorMessage = '';
    pages = [];
    context?.registerExportAdapter?.(null);
    syncUi();

    try {
      const svg = await renderTypstSvg();

      if (disposed || token !== renderToken) {
        return;
      }

      pages = parseTypstSvgPages(svg, t('typst.error.svgParseFailed'), documentRef);
      state = 'ready';
      syncUi();
      registerExportAdapter();
      context?.onProgressiveRender?.();
    } catch (error) {
      if (disposed || token !== renderToken) {
        return;
      }
      errorMessage = formatTypstRuntimeError(error, t);
      state = 'error';
      syncUi();
    }
  };

  void render();
  context?.registerThumbnailAdapter?.({
    beforeCapture: async ({ signal }) => {
      while (state === 'loading' && !disposed) {
        if (signal?.aborted) {
          throw signal.reason;
        }
        await new Promise(resolve => {
          const view = documentRef.defaultView;
          if (view) view.setTimeout(resolve, 16);
          else setTimeout(resolve, 16);
        });
      }
      if (state === 'error') {
        throw new Error(errorMessage || t('typst.error.title'));
      }
    },
    capture: async ({ width, height, background, signal }) => {
      const firstPage = pages[0];
      if (!firstPage) {
        return null;
      }
      const canvasHost = documentRef.createElement('div');
      const pixelPerPt = Math.max(0.5, Math.min(
        width / Math.max(firstPage.width, 1),
        height / Math.max(firstPage.height, 1)
      ));
      await $typst.canvas(canvasHost, {
        mainContent: source,
        pixelPerPt,
        backgroundColor: background,
      });
      if (signal?.aborted) {
        throw signal.reason;
      }
      const canvas = canvasHost.querySelector('canvas');
      if (!canvas) {
        return null;
      }
      return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    },
    getTarget: () => pageShells.get(1) || body.querySelector('.typst-page-shell') || body,
  });

  return {
    $el: target,
    unmount() {
      disposed = true;
      renderToken += 1;
      unregisterFileViewerZoomProvider(root);
      context?.registerExportAdapter?.(null);
      context?.registerThumbnailAdapter?.(null);
      target.replaceChildren();
    },
  };
}
