import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import type { DOMPurify, WindowLike } from 'dompurify';
import {
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  assertFileViewerMermaidSourceHasNoExternalResources,
  decodeFileViewerTextBuffer,
  registerFileViewerZoomProvider,
  resolveFileViewerFitScale,
  unregisterFileViewerZoomProvider,
  sanitizeFileViewerSvgResources,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerThemeMode,
  type FileViewerZoomState,
} from '@file-viewer/core';
import { getFileViewerMermaidLoader } from './optionalCapabilities.js';
import { sanitizeFileViewerRichHtml } from './sanitizeHtml.js';

const sanitizeMarkdownHtml = sanitizeFileViewerRichHtml;

const purifierByDocument = new WeakMap<Document, DOMPurify>();

const getMarkdownPurifier = (documentRef: Document) => {
  const cached = purifierByDocument.get(documentRef);
  if (cached) return cached;
  const windowRef = documentRef.defaultView;
  if (!windowRef) return null;
  const purifier = createDOMPurify(windowRef as unknown as WindowLike);
  if (!purifier.isSupported) return null;
  purifierByDocument.set(documentRef, purifier);
  return purifier;
};

const hardenMarkdownLinks = (root: ParentNode) => {
  root.querySelectorAll<HTMLAnchorElement>('a[target]').forEach(anchor => {
    if ((anchor.getAttribute('target') || '').trim().toLowerCase() === '_blank') {
      anchor.rel = 'noopener noreferrer';
    }
  });
};

const markdownStyle = `
.markdown-viewer{min-height:100%;padding:28px 16px 48px;background:var(--file-viewer-render-surface-background,#eef1f4);overflow:auto;box-sizing:border-box}
.markdown-body{color-scheme:light;--bgColor-default:#fff;--bgColor-muted:#f6f8fa;--bgColor-neutral-muted:#818b981f;--borderColor-default:#d1d9e0;--borderColor-muted:#d1d9e0b3;--borderColor-neutral-muted:#d1d9e0b3;--fgColor-default:#1f2328;--fgColor-muted:#59636e;--fgColor-accent:#0969da;background:var(--bgColor-default);border:1px solid rgba(20,35,53,.1);border-radius:12px;margin:0 auto;box-sizing:border-box;min-width:200px;max-width:var(--markdown-max-width,980px);padding:var(--markdown-padding,45px);color:var(--fgColor-default);font-size:var(--markdown-font-size,16px);box-shadow:0 18px 42px rgba(15,23,42,.1)}
.markdown-body h1,.markdown-body h2,.markdown-body h3{margin-top:24px;margin-bottom:16px;font-weight:700;line-height:1.25}
.markdown-body h1{padding-bottom:.3em;border-bottom:1px solid var(--borderColor-muted);font-size:2em}
.markdown-body h2{padding-bottom:.3em;border-bottom:1px solid var(--borderColor-muted);font-size:1.5em}
.markdown-body p,.markdown-body ul,.markdown-body ol,.markdown-body blockquote,.markdown-body table,.markdown-body pre{margin-top:0;margin-bottom:16px}
.markdown-body a{color:var(--fgColor-accent);text-decoration:none}
.markdown-body a:hover{text-decoration:underline}
.markdown-body code{padding:.2em .4em;border-radius:6px;background:var(--bgColor-neutral-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:85%}
.markdown-body pre{padding:16px;overflow:auto;border-radius:8px;background:var(--bgColor-muted)}
.markdown-body pre code{padding:0;background:transparent;font-size:100%}
.markdown-body table{display:block;width:max-content;max-width:100%;overflow:auto;border-spacing:0;border-collapse:collapse}
.markdown-body th,.markdown-body td{padding:6px 13px;border:1px solid var(--borderColor-default)}
.markdown-body tr{background:var(--bgColor-default);border-top:1px solid var(--borderColor-muted)}
.markdown-body tr:nth-child(2n){background:var(--bgColor-muted)}
.markdown-body blockquote{padding:0 1em;color:var(--fgColor-muted);border-left:.25em solid var(--borderColor-default)}
.markdown-mermaid{display:flex;justify-content:center;width:100%;margin:0 0 16px;overflow:auto;border:1px solid var(--borderColor-muted);border-radius:10px;padding:16px;box-sizing:border-box;background:var(--bgColor-default)}
.markdown-mermaid svg{display:block;max-width:100%;height:auto;margin:auto}
.markdown-mermaid-error{margin:-8px 0 16px;color:#cf222e;font-size:.875em}
[data-viewer-theme='dark'] .markdown-mermaid-error{color:#ff7b72}
[data-viewer-theme='dark'] .markdown-viewer{background:var(--file-viewer-render-surface-background,#101820)}
[data-viewer-theme='dark'] .markdown-body{color-scheme:dark;--bgColor-default:#0d1117;--bgColor-muted:#151b23;--bgColor-neutral-muted:#656c7633;--borderColor-default:#3d444d;--borderColor-muted:#3d444db3;--borderColor-neutral-muted:#3d444db3;--fgColor-default:#f0f6fc;--fgColor-muted:#9198a1;--fgColor-accent:#4493f8;background:var(--bgColor-default);border-color:rgba(139,148,158,.26);color:var(--fgColor-default);box-shadow:0 24px 56px rgba(0,0,0,.38)}
@media (max-width:767px){.markdown-viewer{padding:14px 10px 28px}.markdown-body{padding:22px 18px;border-radius:10px}}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .markdown-viewer{background:var(--file-viewer-render-surface-background,#101820)}[data-viewer-theme='system'] .markdown-body{color-scheme:dark;--bgColor-default:#0d1117;--bgColor-muted:#151b23;--bgColor-neutral-muted:#656c7633;--borderColor-default:#3d444d;--borderColor-muted:#3d444db3;--borderColor-neutral-muted:#3d444db3;--fgColor-default:#f0f6fc;--fgColor-muted:#9198a1;--fgColor-accent:#4493f8;background:var(--bgColor-default);border-color:rgba(139,148,158,.26);color:var(--fgColor-default);box-shadow:0 24px 56px rgba(0,0,0,.38)}}
`;

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = markdownStyle;
  return style;
};

const MARKDOWN_BASE_MAX_WIDTH = 980;
const MARKDOWN_BASE_PADDING = 45;
const MARKDOWN_BASE_FONT_SIZE = 16;
const MARKDOWN_MIN_SCALE = 0.6;
const MARKDOWN_MAX_SCALE = 2.4;

const clampZoom = (value: number) => {
  return Math.min(MARKDOWN_MAX_SCALE, Math.max(MARKDOWN_MIN_SCALE, Number(value.toFixed(2))));
};

const applyMarkdownZoom = (host: HTMLElement, zoom: number) => {
  host.style.setProperty('--markdown-max-width', `${MARKDOWN_BASE_MAX_WIDTH * zoom}px`);
  host.style.setProperty('--markdown-padding', `${MARKDOWN_BASE_PADDING * zoom}px`);
  host.style.setProperty('--markdown-font-size', `${MARKDOWN_BASE_FONT_SIZE * zoom}px`);
};

const readCssPixels = (value: string | undefined) => {
  const pixels = Number.parseFloat(value || '');
  return Number.isFinite(pixels) ? pixels : 0;
};

const readMarkdownViewport = (
  root: HTMLElement,
  request: FileViewerFitRequest
) => {
  const viewportWidth = Math.max(1, request.viewportWidth || root.clientWidth || 0);
  const viewportHeight = Math.max(1, request.viewportHeight || root.clientHeight || 0);
  const view = root.ownerDocument.defaultView;
  const computed = view?.getComputedStyle?.(root);
  const mobile = viewportWidth <= 767;
  const horizontalPadding = computed
    ? readCssPixels(computed.paddingLeft) + readCssPixels(computed.paddingRight)
    : mobile ? 20 : 32;
  const verticalPadding = computed
    ? readCssPixels(computed.paddingTop) + readCssPixels(computed.paddingBottom)
    : mobile ? 42 : 76;

  return {
    width: Math.max(1, viewportWidth - horizontalPadding),
    height: Math.max(1, viewportHeight - verticalPadding),
  };
};

let mermaidRenderSequence = 0;
let mermaidRenderQueue: Promise<void> = Promise.resolve();

const isDarkTheme = (documentRef: Document, theme?: FileViewerThemeMode) => {
  if (theme === 'dark') {
    return true;
  }
  if (theme === 'light') {
    return false;
  }
  return Boolean(documentRef.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches);
};

export const sanitizeMermaidSvg = (documentRef: Document, svg: string) => {
  const purifier = getMarkdownPurifier(documentRef);
  if (!purifier) {
    throw new Error('Unable to initialize the Mermaid SVG sanitizer.');
  }
  const fragment = purifier.sanitize(svg, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['srcdoc'],
  });
  const root = fragment.querySelector('svg');
  if (!root) {
    throw new Error('Unable to parse the Mermaid SVG.');
  }
  sanitizeFileViewerSvgResources(fragment);
  return documentRef.importNode(root, true) as unknown as SVGSVGElement;
};

const renderMermaidSvg = async (
  documentRef: Document,
  source: string,
  theme?: FileViewerThemeMode
) => {
  const render = async () => {
    assertFileViewerMermaidSourceHasNoExternalResources(source);
    const loadMermaid = getFileViewerMermaidLoader();
    if (!loadMermaid) {
      throw new Error('Mermaid support is opt-in. Run `npx file-viewer-cli add mermaid-markdown --write`, then `npx file-viewer-cli install --yes`.');
    }
    const mermaidModule = await loadMermaid();
    const mermaid = mermaidModule.default;
    const id = `file-viewer-markdown-mermaid-${Date.now()}-${mermaidRenderSequence += 1}`;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      theme: isDarkTheme(documentRef, theme) ? 'dark' : 'default',
    });
    const rendered = await mermaid.render(id, source);
    return sanitizeMermaidSvg(documentRef, rendered.svg);
  };

  const result = mermaidRenderQueue.then(render, render);
  mermaidRenderQueue = result.then(() => undefined, () => undefined);
  return result;
};

const renderEmbeddedMermaid = async (
  article: HTMLElement,
  theme?: FileViewerThemeMode
) => {
  const documentRef = article.ownerDocument;
  const mermaidBlocks = Array.from(article.querySelectorAll('pre > code')).filter(code =>
    /(?:^|\s)(?:language|lang)-mermaid(?:\s|$)/i.test(code.className)
  );

  for (const code of mermaidBlocks) {
    const pre = code.parentElement;
    if (!pre) {
      continue;
    }
    const source = code.textContent || '';
    try {
      const svg = await renderMermaidSvg(documentRef, source, theme);
      svg.classList.add('markdown-mermaid-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Mermaid diagram preview');
      const shell = documentRef.createElement('div');
      shell.className = 'markdown-mermaid';
      shell.dataset.markdownMermaid = 'rendered';
      shell.appendChild(svg);
      pre.replaceWith(shell);
    } catch (error) {
      pre.classList.add('markdown-mermaid-source-error');
      const message = documentRef.createElement('p');
      message.className = 'markdown-mermaid-error';
      message.setAttribute('role', 'alert');
      message.textContent = error instanceof Error && error.message.includes('npx file-viewer-cli')
        ? error.message
        : 'Mermaid diagram could not be rendered. The source is shown above.';
      pre.after(message);
      console.warn('[file-viewer] Unable to render embedded Mermaid diagram.', error);
    }
  }
};

export const stripMarkdownFrontmatter = (text: string) => {
  const input = text.replace(/^\uFEFF/, '');
  if (!input.startsWith('---')) {
    return input;
  }

  const firstLineEnd = input.indexOf('\n');
  const firstLine = firstLineEnd >= 0 ? input.slice(0, firstLineEnd).trim() : input.trim();
  if (firstLine !== '---') {
    return input;
  }

  const closePattern = /\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/g;
  closePattern.lastIndex = firstLineEnd >= 0 ? firstLineEnd : 3;
  const match = closePattern.exec(input);
  if (!match) {
    return input;
  }

  return input.slice(match.index + match[0].length).replace(/^\r?\n/, '');
};

export default async function renderMarkdown(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const text = decodeFileViewerTextBuffer(buffer, context?.options?.text?.encoding).text;
  let zoom = 1;
  const zoomEmitter = createZoomChangeEmitter();
  const root = document.createElement('div');
  root.className = 'markdown-viewer';
  root.dataset.viewerZoomProvider = 'markdown';

  const article = document.createElement('article');
  article.className = 'markdown-body';
  const renderedHtml = await marked(stripMarkdownFrontmatter(text));
  article.append(sanitizeMarkdownHtml(article.ownerDocument, renderedHtml));
  hardenMarkdownLinks(article);

  applyMarkdownZoom(root, zoom);
  root.append(article);
  target.replaceChildren(createStyle(), root);
  await renderEmbeddedMermaid(article, context?.options?.theme);
  const baseContentHeight = Math.max(
    article.scrollHeight || 0,
    article.offsetHeight || 0,
    0
  );

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < MARKDOWN_MAX_SCALE,
    canZoomOut: zoom > MARKDOWN_MIN_SCALE,
    canReset: zoom !== 1,
    minScale: MARKDOWN_MIN_SCALE,
    maxScale: MARKDOWN_MAX_SCALE,
  });

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale);
    applyMarkdownZoom(root, zoom);
    zoomEmitter.emit();
    return getZoomState();
  };

  const fitMarkdown = (request: FileViewerFitRequest): FileViewerFitResult => {
    const viewport = readMarkdownViewport(root, request);
    const minScale = request.minScale ?? MARKDOWN_MIN_SCALE;
    const requestedMaxScale = request.maxScale ?? MARKDOWN_MAX_SCALE;
    // A flowing document must not be fitted against its full scroll height.
    // Auto therefore follows the readable content width. It stays at 1:1 by
    // default, but an explicit maxScale can opt into the wider DOCX-like fit
    // requested by the caller.
    const maxScale = request.mode === 'auto' && request.maxScale == null
      ? Math.max(minScale, Math.min(1, requestedMaxScale))
      : requestedMaxScale;
    const scale = resolveFileViewerFitScale({
      mode: request.mode === 'auto' ? 'width' : request.mode,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      contentWidth: MARKDOWN_BASE_MAX_WIDTH,
      contentHeight: baseContentHeight || viewport.height,
      currentScale: zoom,
      minScale,
      maxScale,
    });

    if (!scale) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'unmeasurable',
        provider: 'zoom',
      };
    }

    const state = setZoom(scale);
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'zoom',
    };
  };

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    fit: fitMarkdown,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  return {
    $el: target,
    unmount() {
      unregisterFileViewerZoomProvider(root);
      target.replaceChildren();
    },
  };
}
